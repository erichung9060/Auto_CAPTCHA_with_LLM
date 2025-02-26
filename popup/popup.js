chrome.storage.local.get(['geminiApiKey', 'cloudVisionApiKey'], (result) => {
    document.getElementById('geminiKey').value = result.geminiApiKey || '';
    document.getElementById('cloudVisionKey').value = result.cloudVisionApiKey || '';
});


document.getElementById('saveKeys').addEventListener('click', event => {
    event.preventDefault(); // 阻止表單的默認提交行為

    const geminiKey = document.getElementById('geminiKey').value;
    const cloudVisionKey = document.getElementById('cloudVisionKey').value;

    chrome.runtime.sendMessage({ 
        action: 'apiKeyUpdated', 
        geminiKey, 
        cloudVisionKey 
    });

    showMessage("Successfully updated the API keys!", "green");
});

document.getElementById('startRecording').addEventListener('click',async () => {
    document.getElementById('startRecording').innerText = "Recording";
    showMessage("Please click the CAPTCHA IMAGE", "red");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { action: "startRecording" });
});

document.getElementById('deleteRecord').addEventListener('click', async () => {
    // 創建確認對話框
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
        let respone = await chrome.runtime.sendMessage({ action: 'deleteRecord' });
        showMessage(respone.message, "red");
    });

    document.getElementById('confirmNo').addEventListener('click', () => {
        confirmDialog.remove();
    });
});

function showMessage(message, color){
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