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
    window.close();
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
    await chrome.tabs.sendMessage(tab.id, { action: "record" });
});
