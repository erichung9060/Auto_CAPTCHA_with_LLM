var records_unber_hostname, record_on_this_site;
var hostname, pathname;

var tab_id;
var notificationTimer;

function showNotification(message, notificationType = 'success') {
    const notificationBar = document.getElementById('notification-bar');
    const notificationText = document.getElementById('notification-text');
    const body = document.getElementById('body');
    
    if (notificationTimer) {
        clearTimeout(notificationTimer);
        notificationTimer = null;
    }
    
    notificationText.textContent = message;

    notificationBar.classList.remove('success', 'error');
    notificationBar.classList.add(notificationType);
    notificationBar.classList.remove('hidden', 'hiding');

    body.classList.add('has-notification');
    
    notificationTimer = setTimeout(() => {
        hideNotification();
    }, 5000);
}

function hideNotification() {
    const notificationBar = document.getElementById('notification-bar');
    const body = document.getElementById('body');
    
    if (notificationTimer) {
        clearTimeout(notificationTimer);
        notificationTimer = null;
    }
    
    notificationBar.classList.add('hiding');
    
    setTimeout(() => {
        notificationBar.classList.add('hidden');
        notificationBar.classList.remove('hiding');
        body.classList.remove('has-notification');
    }, 300);
}

document.getElementById('notification-close').addEventListener('click', hideNotification);

async function saveApiKeys(event) {
    event.preventDefault();
    try {
        const geminiApiKey = document.getElementById('geminiKey').value;
        const cloudVisionApiKey = document.getElementById('cloudVisionKey').value;

        await chrome.storage.local.set({
            geminiApiKey: geminiApiKey,
            cloudVisionApiKey: cloudVisionApiKey
        });

        showNotification("Successfully updated the API keys!");
        if(tab_id) await chrome.tabs.sendMessage(tab_id, { action: "fillInCaptcha" });
    } catch (error) {
        showNotification(error.toString(), "error");
    }
}

async function saveAdvancedSettings(event) {
    event.preventDefault();
    try {
        const customModel = document.getElementById('customModel').value;

        await chrome.storage.local.set({
            customModel: customModel
        });

        showNotification("Successfully updated advanced settings!");
        toggleAdvancedSettings();
        if(tab_id) await chrome.tabs.sendMessage(tab_id, { action: "fillInCaptcha" });
    } catch (error) {
        showNotification(error.toString(), "error");
    }
}

function toggleAdvancedSettings() {
    const advancedSection = document.getElementById('advancedSettingsSection');
    const toggleText = document.getElementById('advancedToggleText');
    
    if (advancedSection.classList.contains('hidden')) {
        advancedSection.classList.remove('hidden');
        toggleText.textContent = 'Hide Advanced Settings ▲';
    } else {
        advancedSection.classList.add('hidden');
        toggleText.textContent = 'Show Advanced Settings ▼';
    }
}

async function startRecording() {
    const startRecordingButton = document.getElementById('startRecording');
    startRecordingButton.innerText = "Recording";
    startRecordingButton.disabled = true;

    showNotification("Please click the CAPTCHA IMAGE", "warning");
    if(tab_id) await chrome.tabs.sendMessage(tab_id, { action: "startRecording" });
}

async function deleteRecord() {
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
        try {
            const remainingRecords = records_unber_hostname.filter(r => r.pathname !== record_on_this_site.pathname);

            if (remainingRecords.length) {
                await chrome.storage.local.set({ [hostname]: remainingRecords });
            } else {
                await chrome.storage.local.remove(hostname);
            }

            showNotification(`Successfully deleted record for ${hostname}${record_on_this_site.pathname}`);
            if(tab_id) chrome.tabs.sendMessage(tab_id, { action: "deleteRecord" });
            loadSettings();
        } catch (error) {
            showNotification(error.toString(), "error");
        }
    });

    document.getElementById('confirmNo').addEventListener('click', () => {
        confirmDialog.remove();
    });
}

async function saveCaptchaTypeSettings() {
    try {
        const selectedType = document.querySelector('input[name="captchaType"]:checked').value;

        var new_records = records_unber_hostname;
        const recordIndex = new_records.findIndex(r => r.pathname === record_on_this_site.pathname);
        new_records[recordIndex].captchaType = selectedType;
        await chrome.storage.local.set({ [hostname]: new_records });

        const typeDisplayMap = {
            'numbersOnly': 'Numbers Only',
            'lettersOnly': 'Letters Only',
            'auto': 'Auto Detect'
        };

        showNotification(`CAPTCHA type setting saved: ${typeDisplayMap[selectedType]}`);
        if(tab_id) await chrome.tabs.sendMessage(tab_id, { action: "fillInCaptcha" });
        loadSettings();
    } catch (error) {
        showNotification(error.toString(), "error");
    }
}

document.getElementById('saveKeys').addEventListener('click', saveApiKeys);
document.getElementById('startRecording').addEventListener('click', startRecording);
document.getElementById('deleteRecord').addEventListener('click', deleteRecord);
document.getElementById('toggleAdvancedSettings').addEventListener('click', toggleAdvancedSettings);
document.getElementById('advancedSettingsForm').addEventListener('submit', saveAdvancedSettings);
document.querySelectorAll('input[name="captchaType"]').forEach(radio => {
    radio.addEventListener('change', saveCaptchaTypeSettings);
});

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

async function loadSettings() {
    chrome.storage.local.get(['geminiApiKey', 'cloudVisionApiKey', 'customModel'], (result) => {
        document.getElementById('geminiKey').value = result.geminiApiKey || '';
        document.getElementById('cloudVisionKey').value = result.cloudVisionApiKey || '';
        document.getElementById('customModel').value = result.customModel || '';
    });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
        await chrome.tabs.sendMessage(tab.id, { action: "health" });
    } catch (e) {
        console.log(e)
        showNotification("No available page found. Please open or reload the site you want to record.", "error");
        document.getElementById('startRecording').classList.add('hidden');
        return;
    }

    tab_id = tab.id;
    hostname = new URL(tab.url).hostname;
    pathname = new URL(tab.url).pathname;

    const { [hostname]: records } = await chrome.storage.local.get(hostname);
    records_unber_hostname = records;

    if (records) {
        record_on_this_site = findBestMatch(records, pathname);

        const radio = document.querySelector(`input[name="captchaType"][value="${record_on_this_site.captchaType}"]`);
        radio.checked = true;

        document.getElementById('captchaTypeSection').classList.remove('hidden');
        document.getElementById('deleteRecord').classList.remove('hidden');
    } else {
        record_on_this_site = null;
        document.getElementById('captchaTypeSection').classList.add('hidden');
        document.getElementById('deleteRecord').classList.add('hidden');
    }
}

loadSettings();