chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SYNC_DATA") {
    
    // Get the server URL from storage
    chrome.storage.local.get(['serverUrl', 'syncKey'], function(result) {
      const targetUrl = result.serverUrl || "http://localhost:3000/api/update_data.php";
      const syncKey = result.syncKey || "3735d8ead16b3bb107e4c967ebe676";
      
      let payload = request.payload;
      payload.sync_key = syncKey;

      fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => console.log("BCD+ Server push ok", data))
      .catch(err => console.error("BCD+ Server push failed", err));
    });
  }
});
