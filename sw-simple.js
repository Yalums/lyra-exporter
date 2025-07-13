// 简化的 Service Worker 用于开发环境
const CACHE_NAME = 'lyra-exporter-dev';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js'
];

// 安装事件 - 简化版
self.addEventListener('install', event => {
  console.log('[SW] 安装中...');
  self.skipWaiting();
});

// 激活事件 - 简化版
self.addEventListener('activate', event => {
  console.log('[SW] 激活中...');
  event.waitUntil(self.clients.claim());
});

// 请求拦截 - 简化版，只在生产环境缓存
self.addEventListener('fetch', event => {
  // 在开发环境中，直接通过网络获取资源
  if (event.request.url.includes('localhost') || event.request.url.includes('127.0.0.1')) {
    return; // 不拦截，让浏览器正常处理
  }
  
  // 生产环境的缓存策略
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果在缓存中找到，返回缓存的版本
        if (response) {
          return response;
        }
        
        // 否则从网络获取
        return fetch(event.request);
      })
  );
});

// 消息处理
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
