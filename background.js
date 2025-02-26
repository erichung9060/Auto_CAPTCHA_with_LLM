const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
const CLOUD_VISION_API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

var geminiApiKey = ''
var cloudVisionApiKey = ''

chrome.storage.local.get(['geminiApiKey', 'cloudVisionApiKey'], (result) => {
    geminiApiKey = result.geminiApiKey || '';
    cloudVisionApiKey = result.cloudVisionApiKey || '';
});

async function recognize_captcha_by_Cloud_Vision_API(base64Image) {
    const response = await fetch(`${CLOUD_VISION_API_ENDPOINT}?key=${cloudVisionApiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
        })
    })
    try {
        const data = await response.json();
        console.log(data)

        if (data.error) return {isSuccess: false, error: data.error.message}
        
        let verificationCode = data.responses[0].fullTextAnnotation.text;
        console.log(verificationCode)
        verificationCode = verificationCode.match(/[a-zA-Z0-9]+/g).join('');
        
        return {isSuccess: true, verificationCode: verificationCode};

    } catch (error) {
        console.log(error)
        return {isSuccess: false, error: error.toString()}
    }
}

async function recognize_captcha_by_Gemini(base64Image) {
    const prompt = 'Please analyze this CAPTCHA image. The image contains digits or numbers or words with some noise/distortion. Return only the CAPTCHA numbers or digits or words without any additional text or explanation.'
    const apiUrl = `${GEMINI_API_ENDPOINT}?key=${geminiApiKey}`;

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
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });

    try {
        const data = await response.json();
        console.log(data)
        if (data.error) return {isSuccess: false, error: data.error.message}

        const verificationCode = data.candidates[0].content.parts[0].text.trim()
        return {isSuccess: true, verificationCode: verificationCode}
    } catch (error) {
        return {isSuccess: false, error: error}
    }
}

async function recognize_captcha_by_Holey(base64Image) {
    let url  = 'https://ocr.holey.cc/ncku';
    let data = {base64_str: base64Image};
    const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
    });

    try {
        const data = await response.json();
        console.log(data)

        const verificationCode = data.data;
        return {isSuccess: true, verificationCode: verificationCode};
    } catch (error) {
        return {isSuccess: false, error: error.toString()}
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'recognizeCaptcha') {
        (async () => {
            if (cloudVisionApiKey === '' && geminiApiKey === '') {
                return sendResponse({
                    isSuccess: false, 
                    error: "Please click the extension icon and set your API key."
                });
            }

            const response = cloudVisionApiKey !== '' ?
                await recognize_captcha_by_Cloud_Vision_API(request.image) :
                await recognize_captcha_by_Gemini(request.image);
            
            // const response = await recognize_captcha_by_Holey(request.image)
            // console.log(response)
            
            if(response.isSuccess) sendResponse({isSuccess: true, verificationCode: response.verificationCode});
            else sendResponse({isSuccess: false, error: response.error});
        })();
        return true;
    }
    if (request.action === 'apiKeyUpdated') {
        geminiApiKey = request.geminiKey;
        cloudVisionApiKey = request.cloudVisionKey;

        chrome.storage.local.set({
            geminiApiKey: geminiApiKey,
            cloudVisionApiKey: cloudVisionApiKey
        });
        
        console.log("updated api key");
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "apiKeyUpdated"})
                    .catch(error => {
                        console.log(error);
                    });
            }
        });
    }
});
