const CACHE_NAME = 'lyra-exporter-v5';

// 安装 Service Worker - 不预缓存任何文件
self.addEventListener('install', event => {
  console.log('[SW] 安装新版本:', CACHE_NAME);
  // 立即激活，不等待
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('[SW] 激活新版本:', CACHE_NAME);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 立即控制所有客户端
      return self.clients.claim();
    })
  );
});

// 获取请求 - 网络优先策略，适配 GitHub Pages
self.addEventListener('fetch', event => {
  // 对于开发环境，总是从网络获取
  if (event.request.url.includes('localhost') || event.request.url.includes('127.0.0.1')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }
  
  // GitHub Pages 生产环境 - 网络优先，缓存备用
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 如果网络请求成功，缓存响应（只缓存 GET 请求）
        if (event.request.method === 'GET' && response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败时，尝试从缓存返回
        return caches.match(event.request);
      })
  );
});

// 监听消息，支持手动更新
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});