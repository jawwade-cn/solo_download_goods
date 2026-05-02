console.log('[拼多多采集助手] Background service worker 已启动');

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('[拼多多采集助手] 收到消息:', message.action);
  
  if (message.action === 'downloadImage') {
    console.log('[拼多多采集助手] 下载图片:', message.filename, 'URL:', message.url);
    
    const downloadOptions = {
      url: message.url,
      filename: message.filename,
      saveAs: false
    };
    
    chrome.downloads.download(downloadOptions, function(downloadId) {
      if (chrome.runtime.lastError) {
        console.error('[拼多多采集助手] 下载图片失败:', chrome.runtime.lastError);
        sendResponse({ 
          success: false, 
          error: chrome.runtime.lastError.message || '下载失败'
        });
      } else {
        console.log('[拼多多采集助手] 图片下载已开始，ID:', downloadId);
        sendResponse({ success: true, downloadId: downloadId });
      }
    });
    return true;
  }
  
  if (message.action === 'downloadCSV') {
    console.log('[拼多多采集助手] 下载CSV:', message.filename);
    
    try {
      const blob = new Blob([message.csvContent], { type: 'text/csv;charset=utf-8;' });
      const reader = new FileReader();
      
      reader.onload = function() {
        const dataUrl = reader.result;
        
        chrome.downloads.download({
          url: dataUrl,
          filename: message.filename,
          saveAs: false
        }, function(downloadId) {
          if (chrome.runtime.lastError) {
            console.error('[拼多多采集助手] 下载CSV失败:', chrome.runtime.lastError);
            sendResponse({ 
              success: false, 
              error: chrome.runtime.lastError.message || '下载失败'
            });
          } else {
            console.log('[拼多多采集助手] CSV下载已开始，ID:', downloadId);
            sendResponse({ success: true, downloadId: downloadId });
          }
        });
      };
      
      reader.onerror = function() {
        console.error('[拼多多采集助手] 读取Blob失败');
        sendResponse({ success: false, error: '读取数据失败' });
      };
      
      reader.readAsDataURL(blob);
      return true;
      
    } catch (e) {
      console.error('[拼多多采集助手] 创建CSV失败:', e);
      sendResponse({ success: false, error: e.message });
      return true;
    }
  }
  
  if (message.action === 'ping') {
    sendResponse({ success: true, message: 'pong' });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(function(details) {
  console.log('[拼多多采集助手] 扩展已安装/更新:', details.reason);
});

chrome.runtime.onStartup.addListener(function() {
  console.log('[拼多多采集助手] 浏览器启动，Background service worker 已激活');
});
