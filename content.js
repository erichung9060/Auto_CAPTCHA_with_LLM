var captcha_selector, input_selector;
var captcha, inputField;


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

            alert("Got the input field successfully. The Captcha code will be filled in automatically.");
            document.removeEventListener("click", recordingHandler, true);

            saveRecord(selectedCaptcha, selectedInput);
            fillInCaptcha();
        }
    };

    document.addEventListener("click", recordingHandler, true);
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

function deleteRecord() {
    captcha.removeEventListener('load', recognizeAndFill);
    captcha.removeAttribute('has-recognizeAndFill-listener');

    inputField.value = "";

    captcha_selector = input_selector = null;
    captcha = inputField = null;
}

function saveRecord(selectedCaptcha, selectedInput){
    captcha_selector = getElementSelector(selectedCaptcha);
    input_selector = getElementSelector(selectedInput);

    chrome.runtime.sendMessage({ 
        action: 'saveRecord', 
        hostname: window.location.hostname,
        record: {
            path: window.location.pathname,
            captchaSelector: captcha_selector,
            inputSelector: input_selector
        }
    });
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

function captcha_element_exist() {
    captcha = document.querySelector(captcha_selector);
    inputField = document.querySelector(input_selector);

    if (captcha && inputField) return true;
    
    return false;
}

async function fillInCaptcha() {
    if (captcha_element_exist()) {
        process();
    } else{
        const observer = new MutationObserver((mutations, obs) => {
            if (captcha_element_exist()) {
                obs.disconnect();
                process();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateApiKeys") {
        fillInCaptcha();
    }
    if (request.action === "startRecording") {
        handleRecording();
    }
    if (request.action === "deleteRecord") {
        deleteRecord()
    }
});

chrome.storage.local.get(window.location.hostname, (result) => {
    const records = result[window.location.hostname];
    const bestMatch = findBestMatch(records, window.location.pathname);

    if (bestMatch) {
        captcha_selector = bestMatch.captchaSelector;
        input_selector = bestMatch.inputSelector;
        if (captcha_selector && input_selector) fillInCaptcha();
    }
});