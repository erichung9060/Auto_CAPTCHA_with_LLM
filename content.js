let handleCaptchaLoad = null;

function getBase64Image(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    return canvas.toDataURL('image/png').split(',')[1];
}

async function recognizeAndFill(image, inputField) {
    let base64Image = getBase64Image(image)
    const response = await chrome.runtime.sendMessage({ 
        action: "recognizeCaptcha", 
        image: base64Image
    });

    console.log(response)

    if (response.isSuccess) {
        inputField.value = response.verificationCode;
    } else {
        console.error(response.error);
        inputField.value = "";
    }
}

async function main() {
    const result = await chrome.storage.local.get(window.location.hostname);
    const data = result[window.location.hostname];
    if(!data) return;

    let capSel = data.captchaSelector;
    let inpSel = data.inputSelector;

    let suc = checkAndProcess(capSel, inpSel);
    if(!suc){
        const observer = new MutationObserver((mutations, obs) => {
            checkAndProcess(capSel, inpSel, obs);
        });
    
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
}
main();

function checkAndProcess(capSel, inpSel, observer = null) {
    console.log("checking")
    const captcha = document.querySelector(capSel);
    const inputField = document.querySelector(inpSel);
    
    if (captcha && inputField) {
        if (observer) observer.disconnect();
        
        if (captcha.complete) {
            recognizeAndFill(captcha, inputField);
        }

        handleCaptchaLoad = function() {
            recognizeAndFill(captcha, inputField);
        }

        if (!captcha.hasAttribute('has-load-listener')) {
            captcha.addEventListener('load', handleCaptchaLoad);
            captcha.setAttribute('has-load-listener', 'true');
        }

        return true;
    }
    return false;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateApiKeys") {
        main();
    }
    if (request.action === "startRecording") {
        handleRecording();
    }
    if (request.action === "deleteRecord") {
        const captcha = document.querySelector(request.data.captchaSelector);
        const inputField = document.querySelector(request.data.inputSelector);
        
        captcha.removeEventListener('load', handleCaptchaLoad);
        captcha.removeAttribute('has-load-listener');
        handleCaptchaLoad = null;

        inputField.value = "";
    }
});

async function handleRecording() {
    let selectedCaptcha = null;
    let selectedInput = null;

    const recordingHandler = (event) => {
        if (!selectedCaptcha) {
            selectedCaptcha = event.target;
            alert("Got the CAPTCHA image successfully. Now please click the input field for the CAPTCHA code.");
        } else {
            selectedInput = event.target;
            saveSelectors(selectedCaptcha, selectedInput);
            document.removeEventListener("click", recordingHandler, true);
            alert("Got the input field successfully. The Captcha code will be filled in automatically.");
        }
    };

    document.addEventListener("click", recordingHandler, true);
}

function saveSelectors(selectedCaptcha, selectedInput) {
    chrome.storage.local.set({
        [window.location.hostname]: {
            captchaSelector: getElementSelector(selectedCaptcha),
            inputSelector: getElementSelector(selectedInput)
        }
    }, () => {
        main();
    });
}

function getElementSelector(element) {
    if (!(element instanceof Element))
        return null;

    if (element.id) {
        return `#${element.id}`;
    }

    let current = element;
    const pathParts = [];

    while (current && current.nodeType === Node.ELEMENT_NODE) {
        if (current.id) {
            pathParts.unshift(`#${current.id}`);
            break;
        } else {
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
        }

        current = current.parentNode;
    }

    return pathParts.join(' > ');
}