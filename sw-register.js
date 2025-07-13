// 简化的 Service Worker 注册脚本
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // 检查是否在安全上下文中
    if (!window.isSecureContext) {
      console.log('Service Worker 需要安全上下文 (HTTPS 或 localhost)');
      return;
    }
    
    // 等待页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', registerServiceWorker);
      return;
    }
    
    // 简单的注册逻辑
    navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    .then(registration => {
      console.log('Service Worker 注册成功:', registration.scope);
      
      // 监听更新
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('发现新版本 Service Worker');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('新版本已准备就绪');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            } else {
              console.log('应用已缓存，可离线使用');
            }
          }
        });
      });
    })
    .catch(error => {
      console.log('Service Worker 注册失败:', error);
      // 在开发环境中，这是正常的
      if (location.hostname === 'localhost' || location.hostname.startsWith('127.') || location.hostname.startsWith('192.168.')) {
        console.log('开发环境中 Service Worker 注册失败是正常的');
      }
    });
  } else {
    console.log('浏览器不支持 Service Worker');
  }
}

// 立即执行
registerServiceWorker();
