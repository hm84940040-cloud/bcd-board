document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('serverUrl');
  const keyInput = document.getElementById('syncKey');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');

  // Load saved settings
  chrome.storage.local.get(['serverUrl', 'syncKey'], (result) => {
    if (result.serverUrl) urlInput.value = result.serverUrl;
    if (result.syncKey) keyInput.value = result.syncKey;
  });

  // Save settings
  saveBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      serverUrl: urlInput.value,
      syncKey: keyInput.value
    }, () => {
      statusEl.style.display = 'block';
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 2000);
    });
  });
});
