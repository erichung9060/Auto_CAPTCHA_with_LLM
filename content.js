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
    const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
            { action: "recognizeCaptcha", image: base64Image },
            (response) => {
                resolve(response);
            }
        );
    });

    console.log(response)

    if (response.isSuccess) {
        console.log("fill in:", response.verificationCode)
        inputField.value = response.verificationCode;
    } else {
        console.error(response.error);
        inputField.value = "";
    }
}

async function main() {
    const result = await chrome.storage.sync.get(window.location.hostname);
    const data = result[window.location.hostname];
    if(!data){
        console.log("[Auto Captcha] No record yet.")
        return;
    }

    console.log(data)
    let capSel = data.captchaSelector;
    let inpSel = data.inputSelector;

    let suc = checkAndProcess(capSel, inpSel);
    if(!suc){
        console.log("Can not find Captcha Image now, waiting...");
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
    const image = document.querySelector(capSel);
    const inputField = document.querySelector(inpSel);
    
    if (image && inputField) {
        console.log("Find Captcha Image now, processing...")
        if (observer) observer.disconnect();
        
        if (image.complete) {
            console.log("image load completed")
            recognizeAndFill(image, inputField);
        }else{
            console.log("image not yet loaded, waiting...")
        }

        if (!image.hasAttribute('has-load-listener')) {
            image.addEventListener('load', () => {
                recognizeAndFill(image, inputField);
            });
            image.setAttribute('has-load-listener', 'true');
        }
        return true;
    }
    return false;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "apiKeyUpdated") {
        console.log("api Key Updated")
        main();
    }
    if (request.action === "record") {
        handleRecording();
    }
});

async function handleRecording() {
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

function saveSelectors(selectedCaptcha, selectedInput) {
    chrome.storage.sync.set({
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

    // 尋找元素的最近的有ID的祖先
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

