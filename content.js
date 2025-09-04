var captchaSelector, inputSelector, captchaType;
var captchaImage, inputField;


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

    const recordingHandler = async (event) => {
        if (!selectedCaptcha) {
            let target = event.target;

            if (target.shadowRoot) {
                const imgInShadow = target.shadowRoot.querySelector('img');
                selectedCaptcha = imgInShadow;
            } else {
                selectedCaptcha = target
            }

            console.log("[Auto CAPTCHA with LLM] Selected CAPTCHA Image: ", selectedCaptcha);

            if (!(selectedCaptcha instanceof HTMLImageElement)) {
                alert("Please select a valid CAPTCHA image.");
                selectedCaptcha = null;
            } else {
                alert("Got the CAPTCHA image successfully. Now please click the input field for the CAPTCHA code.");
            }

        } else {
            selectedInput = event.target;
            console.log("[Auto CAPTCHA with LLM] Selected Input Field: ", selectedInput);

            alert("Got the input field successfully. The Captcha code will be filled in automatically.");
            document.removeEventListener("click", recordingHandler, true);

            await saveRecord(selectedCaptcha, selectedInput);
            main();
        }
    };

    document.addEventListener("click", recordingHandler, true);
}

function buildPathParts(current, stopCondition) {
    const pathParts = [];

    while (current && stopCondition(current)) {
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

    return pathParts;
}

function getElementSelector(element) {
    if (!(element instanceof Element))
        return null;

    if (element.getRootNode() instanceof ShadowRoot) {
        const shadowHost = element.getRootNode().host;
        const hostSelector = getElementSelector(shadowHost);

        if (element.id) {
            return `${hostSelector}::shadow-root::#${element.id}`;
        }

        const shadowPathParts = buildPathParts(element, (current) =>
            current && current.getRootNode() instanceof ShadowRoot &&
            current !== element.getRootNode()
        );

        const shadowPath = shadowPathParts.join(' > ');
        return `${hostSelector}::shadow-root::${shadowPath}`;
    } else {
        if (element.id) {
            return `#${element.id}`;
        }

        const pathParts = buildPathParts(element, (current) =>
            current && current.nodeType === Node.ELEMENT_NODE
        );

        return pathParts.join(' > ');
    }
}

async function saveRecord(selectedCaptcha, selectedInput) {
    captchaSelector = getElementSelector(selectedCaptcha)
    inputSelector = getElementSelector(selectedInput)

    let record = {
        pathname: window.location.pathname,
        captchaSelector: captchaSelector,
        inputSelector: inputSelector,
        captchaType: 'auto'
    }

    const hostname = window.location.hostname;
    const result = await chrome.storage.local.get(hostname);
    let records = result[hostname] || [];

    const recordIndex = records.findIndex(r => r.pathname === record.pathname);

    if (recordIndex > -1) {
        records[recordIndex] = record;
    } else {
        records.push(record);
    }

    await chrome.storage.local.set({ [hostname]: records });
}

function findBestMatch(records, currentPath) {
    if (!records || records.length === 0) return null;

    let bestMatch = null;
    let maxLen = 0;

    for (const record of records) {
        if (currentPath === record.pathname) {
            bestMatch = record;
            break;
        }

        let i = 0;
        while (i < currentPath.length && i < record.pathname.length && currentPath[i] === record.pathname[i]) {
            i++;
        }

        if (i > maxLen) {
            maxLen = i;
            bestMatch = record;
        }
    }
    return bestMatch;
}

function deleteRecord() {
    captchaImage.removeEventListener('load', recognizeAndFill);
    captchaImage.removeAttribute('has-recognizeAndFill-listener');

    inputField.value = "";

    captchaSelector = inputSelector = null;
    captchaImage = inputField = null;
    captchaType = null;

    main();
}

async function recognizeAndFill() {
    let base64Image = getBase64Image(captchaImage)
    const response = await chrome.runtime.sendMessage({
        action: "recognizeCaptcha",
        image: base64Image,
        captchaType: captchaType
    });

    if (response.isSuccess) {
        console.log("[Auto CAPTCHA with LLM] CAPTCHA recognized successfully:", response.verificationCode);
        inputField.value = response.verificationCode;
    } else {
        console.error("Backend Error: ", response.error)
        inputField.value = "";
    }
}

function process() {
    if (captchaImage.complete) recognizeAndFill();

    if (!captchaImage.hasAttribute('has-recognizeAndFill-listener')) {
        captchaImage.addEventListener('load', recognizeAndFill);
        captchaImage.setAttribute('has-recognizeAndFill-listener', 'true');
    }
}

function getElementBySelector(selector) {
    if (selector.includes('::shadow-root::')) {
        const [hostSelector, shadowPath] = selector.split('::shadow-root::');
        const host = document.querySelector(hostSelector);

        if (host && host.shadowRoot) {
            return host.shadowRoot.querySelector(shadowPath);
        }
        return null;
    }
    return document.querySelector(selector);
}

function captchaElementExist() {
    captchaImage = getElementBySelector(captchaSelector);
    inputField = getElementBySelector(inputSelector);

    if (captchaImage && inputField) return true;

    return false;
}

async function main() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    const { [hostname]: records } = await chrome.storage.local.get(hostname);
    if (!records) return;

    const bestMatch = findBestMatch(records, pathname);
    console.log("[Auto CAPTCHA with LLM] Found Record: ", bestMatch);

    captchaSelector = bestMatch.captchaSelector;
    inputSelector = bestMatch.inputSelector;
    captchaType = bestMatch.captchaType;

    if (captchaElementExist()) {
        process();
    } else {
        const observer = new MutationObserver((mutations, obs) => {
            if (captchaElementExist()) {
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
    if (request.action === "fillInCaptcha") {
        main();
    }
    if (request.action === "startRecording") {
        handleRecording();
    }
    if (request.action === "deleteRecord") {
        deleteRecord();
    }
});

main();