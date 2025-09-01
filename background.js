const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const CLOUD_VISION_API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

async function recognize_by_CloudVision(base64Image, CloudVisionApiKey) {
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
        
        if (!data.responses[0] || !data.responses[0].fullTextAnnotation) {
            return { isSuccess: false, error: "No text detected in image." };
        }

        let verificationCode = data.responses[0].fullTextAnnotation.text;
        verificationCode = verificationCode.match(/[a-zA-Z0-9]+/g).join('');

        return { isSuccess: true, verificationCode: verificationCode };
    } catch (error) {
        return { isSuccess: false, error: error.toString() }
    }
}

async function recognize_by_Gemini(base64Image, GeminiApiKey) {
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
    const result = await chrome.storage.local.get(['geminiApiKey', 'cloudVisionApiKey']);
    const GeminiApiKey = result.geminiApiKey || '';
    const CloudVisionApiKey = result.cloudVisionApiKey || '';

    if (CloudVisionApiKey !== '') {
        sendResponse(await recognize_by_CloudVision(image, CloudVisionApiKey));
    } else if (GeminiApiKey !== '') {
        sendResponse(await recognize_by_Gemini(image, GeminiApiKey));
    } else {
        sendResponse({ isSuccess: false, error: "No API key found" });
    }
}

async function updateApiKeys(geminiApiKey, cloudVisionApiKey, sendResponse) {
    try {
        await chrome.storage.local.set({
            geminiApiKey: geminiApiKey,
            cloudVisionApiKey: cloudVisionApiKey
        });

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { action: "fillInCaptcha" });

        sendResponse({ isSuccess: true })
    } catch (error) {
        sendResponse({ isSuccess: false, error: error.toString() })
    }
}

function findBestMatch(records, currentPath) {
    if (!records || records.length === 0) return null;

    let bestMatch = null;
    let maxLen = 0;

    for (const record of records) {
        if(currentPath === record.path) {
            bestMatch = record;
            break;
        }

        let i = 0;
        while (i < currentPath.length && i < record.path.length && currentPath[i] === record.path[i]) {
            i++;
        }

        if (i > maxLen) {
            maxLen = i;
            bestMatch = record;
        }
    }
    console.log(bestMatch)
    return bestMatch;
}

async function deleteRecord(tab, sendResponse) {
    try {
        const hostname = new URL(tab.url).hostname;

        const result = await chrome.storage.local.get(hostname);
        const records = result[hostname];

        if (records) {
            const bestMatch = findBestMatch(records, new URL(tab.url).pathname);
            const remainingRecords = records.filter(r => r.path !== bestMatch.path);

            if (remainingRecords.length) {
                await chrome.storage.local.set({ [hostname]: remainingRecords });
            } else {
                await chrome.storage.local.remove(hostname);
            }

            chrome.tabs.sendMessage(tab.id, {
                action: "deleteRecord"
            });

            sendResponse({ isSuccess: true, message: `Successfully deleted record for ${hostname}` });
        } else {
            sendResponse({ isSuccess: false, error: `No record found for ${hostname}` });
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