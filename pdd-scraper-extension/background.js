chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'downloadImage') {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename,
      saveAs: false
    }, function(downloadId) {
      if (chrome.runtime.lastError) {
        console.error('下载图片失败:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        console.log('图片下载开始，ID:', downloadId);
        sendResponse({ success: true, downloadId: downloadId });
      }
    });
    return true;
  }
  
  if (message.action === 'downloadCSV') {
    const blob = new Blob([message.csvContent], { type: 'text/csv;charset=utf-8;' });
    const reader = new FileReader();
    reader.onload = function() {
      const url = reader.result;
      chrome.downloads.download({
        url: url,
        filename: message.filename,
        saveAs: false
      }, function(downloadId) {
        if (chrome.runtime.lastError) {
          console.error('下载CSV失败:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError });
        } else {
          console.log('CSV下载开始，ID:', downloadId);
          sendResponse({ success: true, downloadId: downloadId });
        }
      });
    };
    reader.readAsDataURL(blob);
    return true;
  }
});
