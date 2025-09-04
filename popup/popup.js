var record_on_this_site;

function showMessage(message, color) {
    const message_div = document.createElement('div');
    message_div.innerText = message;
    message_div.style.color = color;
    message_div.style.fontWeight = "bold";
    message_div.style.marginTop = "10px";
    message_div.style.textAlign = "center";
    document.getElementById('body').appendChild(message_div);
    setTimeout(() => {
        message_div.remove();
    }, 10 * 1000);
}

document.getElementById('saveKeys').addEventListener('click', async event => {
    event.preventDefault();

    const geminiApiKey = document.getElementById('geminiKey').value;
    const cloudVisionApiKey = document.getElementById('cloudVisionKey').value;

    const response = await chrome.runtime.sendMessage({
        action: 'updateApiKeys',
        geminiApiKey,
        cloudVisionApiKey
    });

    if (response.isSuccess) {
        showMessage("Successfully updated the API keys!", "green");

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, { action: "fillInCaptcha" });
        } catch (error) {
            showMessage(error.toString(), "red");
            showMessage("You can try reopen the website that requires CAPTCHA.", "red");
        }
    } else {
        showMessage(response.error, "red");
    }
});

document.getElementById('startRecording').addEventListener('click', async () => {
    const startRecordingButton = document.getElementById('startRecording');
    startRecordingButton.innerText = "Recording";
    startRecordingButton.disabled = true;
    showMessage("Please click the CAPTCHA IMAGE", "red");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { action: "startRecording" });
});

document.getElementById('deleteRecord').addEventListener('click', async () => {
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
    confirmDialog.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-lg">
            <p class="mb-4">Are you sure you want to delete the record?</p>
            <div class="flex justify-end space-x-2">
                <button id="confirmYes" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Yes</button>
                <button id="confirmNo" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">No</button>
            </div>
        </div>
    `;

    document.body.appendChild(confirmDialog);

    document.getElementById('confirmYes').addEventListener('click', async () => {
        confirmDialog.remove();

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            let response = await chrome.runtime.sendMessage({ action: 'deleteRecord', tab });
            if (response.isSuccess) showMessage(response.message, "green");
            else showMessage(response.error, "red");
        } else {
            showMessage("No available tab found, please open the site you want to delete.", "red");
        }

        const captchaTypeSection = document.getElementById('captchaTypeSection');
        captchaTypeSection.classList.add('hidden');
    });

    document.getElementById('confirmNo').addEventListener('click', () => {
        confirmDialog.remove();
    });
});

chrome.storage.local.get(['geminiApiKey', 'cloudVisionApiKey'], (result) => {
    document.getElementById('geminiKey').value = result.geminiApiKey || '';
    document.getElementById('cloudVisionKey').value = result.cloudVisionApiKey || '';
});

async function loadCaptchaTypeSettings() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const hostname = new URL(tab.url).hostname;
    const pathname = new URL(tab.url).pathname;
    
    const { [hostname]: records } = await chrome.storage.local.get(hostname);
    if (!records) return;

    record_on_this_site = findBestMatch(records, pathname);

    const radio = document.querySelector(`input[name="captchaType"][value="${record_on_this_site.captchaType}"]`);
    radio.checked = true;

    const captchaTypeSection = document.getElementById('captchaTypeSection');
    captchaTypeSection.classList.remove('hidden');
}

function findBestMatch(records, currentPath) {
    if (!records || records.length === 0) return null;

    let bestMatch = null;
    let maxLen = 0;

    for (const record of records) {
        if (currentPath === record.path) {
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
    return bestMatch;
}

async function saveCaptchaTypeSettings() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const hostname = new URL(tab.url).hostname;
    
    let { [hostname]: records } = await chrome.storage.local.get(hostname);

    const selectedType = document.querySelector('input[name="captchaType"]:checked').value;
    const recordIndex = records.findIndex(r => r.path === record_on_this_site.path);
    records[recordIndex].captchaType = selectedType;

    await chrome.storage.local.set({ [hostname]: records });
    
    const typeDisplayMap = {
        'numbersOnly': 'Numbers Only',
        'lettersOnly': 'Letters Only',
        'auto': 'Auto Detect'
    };
    
    showMessage(`CAPTCHA type setting saved: ${typeDisplayMap[selectedType]}`, "green");

    await chrome.tabs.sendMessage(tab.id, { action: "fillInCaptcha" });
}

document.querySelectorAll('input[name="captchaType"]').forEach(radio => {
    radio.addEventListener('change', saveCaptchaTypeSettings);
});

loadCaptchaTypeSettings();