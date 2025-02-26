let Gemini_API_KEY = '';
let Cloud_Vision_API_KEY = '';

async function recognize_captcha_by_Cloud_Vision_API(base64Image) {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${Cloud_Vision_API_KEY}`, {
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

        if (data.error) return {Success: false, error: data.error.message}
        
        let Verification_Code = '';
        const recognizedText = data.responses[0].textAnnotations[0]?.description;
        
        const lines = recognizedText.split('\n');
        for (const line of lines) {
            Verification_Code = line.match(/\d+/g).join('');
            if (Verification_Code.length == 4) break;
        }

        if (Verification_Code.length != 4) {
            Verification_Code = recognizedText.match(/\d+/g).join('');
        }

        return {Success: true, Verification_Code: Verification_Code}
    } catch (error) {
        return {Success: false, error: error}
    }
}

async function recognize_captcha_by_Gemini(base64Image) {
    const prompt = 'Please analyze this CAPTCHA image and extract the 4-digit numeric code. The image contains colorful digits on a white background with some noise/distortion. Return only the numeric digits without any additional text or explanation.'
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${Gemini_API_KEY}`;

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
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    try {
        const data = await response.json();
        console.log(data)
        if (data.error) return {Success: false, error: data.error.message}

        const Verification_Code = data.candidates[0].content.parts[0].text.trim()
        return {Success: true, Verification_Code: Verification_Code}
    } catch (error) {
        return {Success: false, error: error}
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'api_key_updated') {
        Gemini_API_KEY = request.geminiKey;
        Cloud_Vision_API_KEY = request.cloudVisionKey;

        chrome.storage.local.set({
            Gemini_API_KEY: Gemini_API_KEY,
            Cloud_Vision_API_KEY: Cloud_Vision_API_KEY
        });
        console.log("update api key");
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "apiKeyUpdated"})
                    .catch(error => {
                        console.log(error);
                    });
            }
        });
    }
    if (request.action === 'recognizeCaptcha') {
        (async () => {
            if (Cloud_Vision_API_KEY === '' && Gemini_API_KEY === '') {
                await new Promise((resolve) => {
                    chrome.storage.local.get(['Gemini_API_KEY', 'Cloud_Vision_API_KEY'], (result) => {
                        Gemini_API_KEY = result.Gemini_API_KEY || '';
                        Cloud_Vision_API_KEY = result.Cloud_Vision_API_KEY || '';
                        console.log("init api key");
                        resolve();
                    });
                });

                if (Cloud_Vision_API_KEY === '' && Gemini_API_KEY === '') {
                    sendResponse({Success: false, error: "Please click the extension icon and set your API key."});
                    return;
                }
            }

            const response = Cloud_Vision_API_KEY !== '' ?
                await recognize_captcha_by_Cloud_Vision_API(request.image) :
                await recognize_captcha_by_Gemini(request.image);
            
            if(response.Success) sendResponse({Success: true, Verification_Code: response.Verification_Code});
            else sendResponse({Success: false, error: response.error});
        })();
        return true;
    }
});
