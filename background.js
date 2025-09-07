const CLOUD_VISION_API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
const DEFAULT_GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

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
        console.log("CloudVision API respone:", data);

        if (data.error) return { isSuccess: false, error: data.error.message }

        if (!data.responses[0] || !data.responses[0].fullTextAnnotation) {
            return { isSuccess: false, error: "No text detected in image." }
        }

        let verificationCode = data.responses[0].fullTextAnnotation.text;
        verificationCode = verificationCode.match(/[a-zA-Z0-9]+/g).join('');

        return { isSuccess: true, verificationCode: verificationCode }
    } catch (error) {
        return { isSuccess: false, error: error.toString() }
    }
}

async function recognize_by_Gemini(base64Image, captchaType, GeminiApiKey, customModel) {
    const model = customModel || DEFAULT_GEMINI_MODEL;
    let apiUrl = `${DEFAULT_GEMINI_API_ENDPOINT}/models/${model}:generateContent?key=${GeminiApiKey}`;
    
    let prompt = 'Please analyze this CAPTCHA image. The image contains digits or numbers or words with some noise/distortion. Return only the CAPTCHA numbers or digits or words without any additional text or explanation.';
    if (captchaType === 'numbersOnly') {
        prompt = 'Please analyze this CAPTCHA image. The image only contains numbers/digits with some noise/distortion. Return only the CAPTCHA numbers without any additional text or explanation.';
    } else if (captchaType === 'lettersOnly') {
        prompt = 'Please analyze this CAPTCHA image. The image only contains letters/alphabetic characters with some noise/distortion. Return only the CAPTCHA letters without any additional text or explanation.';
    }

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
        console.log("Gemini API respone:", data);

        if (data.error) return { isSuccess: false, error: data.error.message }

        let verificationCode = data.candidates[0].content.parts[0].text.trim();

        const alpnum_matches = verificationCode.match(/[a-zA-Z0-9]+/g);
        if (alpnum_matches) {
            verificationCode = alpnum_matches.join('');
        }

        return { isSuccess: true, verificationCode: verificationCode }
    } catch (error) {
        return { isSuccess: false, error: error.toString() }
    }
}

async function recognizeCaptcha(image, captchaType, sendResponse) {
    const result = await chrome.storage.local.get(['geminiApiKey', 'cloudVisionApiKey', 'customModel']);
    const GeminiApiKey = result.geminiApiKey;
    const CloudVisionApiKey = result.cloudVisionApiKey;
    const customModel = result.customModel;

    if (CloudVisionApiKey) {
        sendResponse(await recognize_by_CloudVision(image, CloudVisionApiKey));
    } else if (GeminiApiKey) {
        sendResponse(await recognize_by_Gemini(image, captchaType, GeminiApiKey, customModel));
    } else {
        sendResponse({ isSuccess: false, error: "No API key found" });
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'recognizeCaptcha':
            recognizeCaptcha(request.image, request.captchaType, sendResponse);
            return true;
    }
});