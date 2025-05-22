var captcha_selector, input_selector;
var captcha, inputField;

function updateAutoCaptchaData(selectedCaptcha, selectedInput) {
    captcha_selector = getElementSelector(selectedCaptcha);
    input_selector = getElementSelector(selectedInput);

    chrome.storage.local.set({
        [window.location.href]: {
            captchaSelector: captcha_selector,
            inputSelector: input_selector
        }
    });
}

function getBase64Image(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    return canvas.toDataURL('image/png').split(',')[1];
}

async function handleRecording() {
    let selectedCaptcha = null;
    let selectedInput = null;

    const recordingHandler = (event) => {
        if (!selectedCaptcha) {
            selectedCaptcha = event.target;
            console.log(selectedCaptcha);

            if (!(selectedCaptcha instanceof HTMLImageElement)) {
                alert("Please select a valid CAPTCHA image.");
                selectedCaptcha = null;
            }else{
                alert("Got the CAPTCHA image successfully. Now please click the input field for the CAPTCHA code.");
            }
            
        } else {
            selectedInput = event.target;
            console.log(selectedInput);

            updateAutoCaptchaData(selectedCaptcha, selectedInput);
            document.removeEventListener("click", recordingHandler, true);
            alert("Got the input field successfully. The Captcha code will be filled in automatically.");
            main();
        }
    };

    document.addEventListener("click", recordingHandler, true);
}

function getElementSelector(element) {
    if (!(element instanceof Element))
        return null;

    let current = element;
    const pathParts = [];

    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let tagName = current.tagName.toLowerCase();
        let position = 1;
        let sibling = current.previousElementSibling;

        while (sibling) {
            if (sibling.tagName === current.tagName) position++;
            sibling = sibling.previousElementSibling;
        }

        if (position > 1) {
            pathParts.unshift(`${tagName}:nth-of-type(${position})`);
        } else {
            pathParts.unshift(tagName);
        }

        current = current.parentNode;
    }
    return pathParts.join(' > ');
}

function deleteRecord() {
    captcha.removeEventListener('load', recognizeAndFill);
    captcha.removeAttribute('has-recognizeAndFill-listener');

    inputField.value = "";

    captcha_selector = input_selector = null;
    captcha = inputField = null;
}

async function recognizeAndFill() {
    let base64Image = getBase64Image(captcha)
    const response = await chrome.runtime.sendMessage({
        action: "recognizeCaptcha",
        image: base64Image
    });

    if (response.isSuccess) {
        inputField.value = response.verificationCode;
    } else {
        console.error("Backend Error: ", response.error)
        inputField.value = "";
    }
}

function process() {
    if (captcha.complete) recognizeAndFill();

    if (!captcha.hasAttribute('has-recognizeAndFill-listener')) {
        captcha.addEventListener('load', recognizeAndFill);
        captcha.setAttribute('has-recognizeAndFill-listener', 'true');
    }
}

function element_exist_in_DOM() {
    captcha = document.querySelector(captcha_selector);
    inputField = document.querySelector(input_selector);

    if (captcha && inputField) return true;
    else return false;
}

function wait_for_element(obs) {
    if (element_exist_in_DOM()) {
        obs.disconnect();
        process();
    }
}

async function main() {
    if (!captcha_selector || !input_selector) return;

    if (element_exist_in_DOM()) {
        process();
    } else{
        const observer = new MutationObserver((mutations, obs) => {
            wait_for_element(obs)
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateApiKeys") {
        main();
    }
    if (request.action === "startRecording") {
        handleRecording();
    }
    if (request.action === "deleteRecord") {
        deleteRecord()
    }
});

chrome.storage.local.get(window.location.href, (result) => {
    let autoCaptchaData = result[window.location.href];
    if (!autoCaptchaData)  return;
    
    captcha_selector = autoCaptchaData.captchaSelector;
    input_selector = autoCaptchaData.inputSelector;
    main();
});