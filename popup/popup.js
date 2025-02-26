chrome.storage.local.get(['geminiApiKey', 'cloudVisionApiKey'], (result) => {
    document.getElementById('geminiKey').value = result.geminiApiKey || '';
    document.getElementById('cloudVisionKey').value = result.cloudVisionApiKey || '';
});


document.getElementById('saveKeys').addEventListener('click', async () => {
    const geminiKey = document.getElementById('geminiKey').value;
    const cloudVisionKey = document.getElementById('cloudVisionKey').value;

    await chrome.runtime.sendMessage({ 
        action: 'apiKeyUpdated', 
        geminiKey, 
        cloudVisionKey 
    });
    // window.close();
});

document.getElementById('startRecording').addEventListener('click',async () => {
    document.getElementById('startRecording').innerText = "Recording";

    const message = document.createElement('div');
    message.innerText = "Please click the CAPTCHA IMAGE";
    message.style.color = "red";
    message.style.fontWeight = "bold";
    message.style.marginTop = "10px";
    message.style.textAlign = "center";
    document.getElementById('body').appendChild(message);

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
        
        const message_div = document.createElement('div');
        message_div.innerText = respone.message;
        message_div.style.color = "red";
        message_div.style.fontWeight = "bold";
        message_div.style.marginTop = "10px";
        message_div.style.textAlign = "center";
        document.getElementById('body').appendChild(message_div);
        setTimeout(() => {
            message_div.remove();
        }, 8000);
        
        
    });

    document.getElementById('confirmNo').addEventListener('click', () => {
        confirmDialog.remove();
    });
});
