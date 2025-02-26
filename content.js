function getBase64Image(image) {
    const canvas = document.createElement('canvas');
    const width = 800; // Resize width
    const aspectRatio = image.height / image.width;
    const height = width * aspectRatio;
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
    
    return canvas.toDataURL('image/png').split(',')[1];
}

async function recognizeAndFill(image, inputField) {
    let base64Image = getBase64Image(image)
    const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
            { action: "recognizeCaptcha", image: base64Image },
            (response) => {
                resolve(response);
            }
        );
    });

    if (response.Success) {
        console.log("fill in:", response.Verification_Code)
        inputField.value = response.Verification_Code;
    } else {
        console.error(response.error);
        inputField.value = "";
    }
}

function main(){
    chrome.storage.sync.get(window.location.hostname, (result) => {
        const data = result[window.location.hostname];
        console.log(data)
        if (data) {
            const image = document.querySelector(data.captchaSelector);
            const inputField = document.querySelector(data.inputSelector);
            
            if (image.complete) {
                recognizeAndFill(image, inputField);
            }

            if (!image.hasAttribute('has-load-listener')) {
                image.addEventListener('load', () => {
                    recognizeAndFill(image, inputField);
                });
                image.setAttribute('has-load-listener', 'true');
            }
        }
    });
}
main();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "apiKeyUpdated") {
        console.log("apiKeyUpdated")
        main();
    }
    if (request.action === "record") {
        handleRecording();
    }
});

async function handleRecording(){
    let selectedCaptcha = null;
    let selectedInput = null;

    const recordingHandler = (event) => {
        if (!selectedCaptcha) {
            selectedCaptcha = event.target;
            alert("Please click the CAPTCHA INPUT FIELD");
        } else {
            selectedInput = event.target;
            saveSelectors(selectedCaptcha, selectedInput);
            document.removeEventListener("click", recordingHandler, true);
            alert("Successful!");
        }
    };

    document.addEventListener("click", recordingHandler, true);
}

function saveSelectors(selectedCaptcha, selectedInput){
    chrome.storage.sync.set({
        [window.location.hostname]: {
            captchaSelector: getElementSelector(selectedCaptcha),
            inputSelector: getElementSelector(selectedInput)
        }
    }, () => {
        main();
    });
}

function getElementSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.name) return `[name='${el.name}']`;
    return el.tagName.toLowerCase() + (el.className ? `.${el.className.split(" ").join(".")}` : "");
}