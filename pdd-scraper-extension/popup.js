document.addEventListener('DOMContentLoaded', function() {
  const statusDiv = document.getElementById('status');
  
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const tab = tabs[0];
    const url = tab.url;
    
    if (url.includes('pinduoduo.com') && url.includes('goods.html')) {
      statusDiv.className = 'status success';
      statusDiv.textContent = '✓ 检测到拼多多商品页面，可以使用采集功能';
    } else {
      statusDiv.className = 'status info';
      statusDiv.textContent = '请在拼多多商品页面使用，右上角会出现采集按钮';
    }
  });
});
