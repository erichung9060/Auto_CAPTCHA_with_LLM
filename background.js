const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';
const CLOUD_VISION_API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

var GeminiApiKey = ''
var CloudVisionApiKey = ''

chrome.storage.local.get(['geminiApiKey', 'cloudVisionApiKey'], (result) => {
    GeminiApiKey = result.geminiApiKey || '';
    CloudVisionApiKey = result.cloudVisionApiKey || '';
});

async function recognize_by_CloudVision(base64Image) {
    const apiUrl = `${CLOUD_VISION_API_ENDPOINT}?key=${CloudVisionApiKey}`;
    const body = {
        requests: [
            {
                image: {
                    content: base64Image
                },
                features: [
                    {
                        type: 'TEXT_DETECTION',
                        maxResults: 1
                    }
                ],
                imageContext: {
                    languageHints: ['en']
                }
            }
        ]
    };
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    try {
        const data = await response.json();
        console.log("CloudVision API respone:", data)

        if (data.error) return { isSuccess: false, error: data.error.message }

        let verificationCode = data.responses[0].fullTextAnnotation.text;
        verificationCode = verificationCode.match(/[a-zA-Z0-9]+/g).join('');

        return { isSuccess: true, verificationCode: verificationCode };
    } catch (error) {
        return { isSuccess: false, error: error.toString() }
    }
}

async function recognize_by_Gemini(base64Image) {
    const apiUrl = `${GEMINI_API_ENDPOINT}?key=${GeminiApiKey}`;
    const prompt = 'Please analyze this CAPTCHA image. The image contains digits or numbers or words with some noise/distortion. Return only the CAPTCHA numbers or digits or words without any additional text or explanation.';
    const body = {
        contents: [
            {
                parts: [
                    { text: prompt },
                    {
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": base64Image
                        }
                    }
                ]
            }
        ],
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    try {
        const data = await response.json();
        console.log("Gemini API respone:", data)
        if (data.error) return { isSuccess: false, error: data.error.message }

        let verificationCode = data.candidates[0].content.parts[0].text.trim()
        verificationCode = verificationCode.match(/[a-zA-Z0-9]+/g).join('');

        return { isSuccess: true, verificationCode: verificationCode }
    } catch (error) {
        return { isSuccess: false, error: error.toString() }
    }
}


async function recognizeCaptcha(image, sendResponse) {
    if (CloudVisionApiKey !== '') {
        sendResponse(await recognize_by_CloudVision(image));
    } else if (GeminiApiKey !== '') {
        sendResponse(await recognize_by_Gemini(image));
    } else {
        sendResponse({ isSuccess: false, error: "No API key found" });
    }
}

async function updateApiKeys(geminiApiKey, cloudVisionApiKey, sendResponse) {
    try {
        GeminiApiKey = geminiApiKey
        CloudVisionApiKey = cloudVisionApiKey

        await chrome.storage.local.set({
            geminiApiKey: geminiApiKey,
            cloudVisionApiKey: cloudVisionApiKey
        });

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        await chrome.tabs.sendMessage(tab.id, { action: "updateApiKeys" }).catch(error => {
            console.warn("Failed to send updateApiKeys message:", error);
        });

        sendResponse({ isSuccess: true })
    } catch (error) {
        sendResponse({ isSuccess: false, error: error.toString() })
    }
}

async function deleteRecord(tab, sendResponse) {
    try {
        const key = tab.url;

        const result = await chrome.storage.local.get(key);
        const data = result[key];

        if (!data) {
            sendResponse({ isSuccess: false, error: `No record found for ${key}` });
        } else {
            chrome.tabs.sendMessage(tab.id, {
                action: "deleteRecord"
            });

            await chrome.storage.local.remove(key);
            sendResponse({ isSuccess: true, message: `Successfully deleted record for ${key}` });
        }
    } catch (error) {
        sendResponse({ isSuccess: false, error: error.toString() });
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'recognizeCaptcha':
            recognizeCaptcha(request.image, sendResponse);
            return true;

        case 'updateApiKeys':
            updateApiKeys(request.geminiApiKey, request.cloudVisionApiKey, sendResponse);
            return true;

        case 'deleteRecord':
            deleteRecord(request.tab, sendResponse);
            return true;
    }
});