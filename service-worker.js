/**
 * Service Worker - 支持后台运行和推送通知
 */

const CACHE_NAME = 'shupianji-v1';
const BACKGROUND_SYNC_TAG = 'api-call-sync';

// 安装事件
self.addEventListener('install', (event) => {
    console.log('[Service Worker] 安装中...');
    self.skipWaiting(); // 立即激活新的Service Worker
});

// 激活事件
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] 激活中...');
    event.waitUntil(
        clients.claim() // 立即控制所有页面
    );
});

// 后台同步
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] 后台同步:', event.tag);
    
    if (event.tag === BACKGROUND_SYNC_TAG) {
        event.waitUntil(
            handleBackgroundSync()
        );
    }
});

// 处理后台同步
async function handleBackgroundSync() {
    try {
        console.log('[Service Worker] 执行后台API调用同步');
        
        // 通知所有客户端
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC_COMPLETE',
                timestamp: Date.now()
            });
        });
        
        return Promise.resolve();
    } catch (error) {
        console.error('[Service Worker] 后台同步失败:', error);
        return Promise.reject(error);
    }
}

// 推送通知
self.addEventListener('push', (event) => {
    console.log('[Service Worker] 收到推送通知');
    
    const options = {
        body: event.data ? event.data.text() : '您有新的消息',
        icon: 'https://image.uglycat.cc/qs8mf5.png',
        badge: 'https://image.uglycat.cc/qs8mf5.png',
        vibrate: [200, 100, 200],
        tag: 'message-notification',
        requireInteraction: false
    };
    
    event.waitUntil(
        self.registration.showNotification('薯片机', options)
    );
});

// 通知点击
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] 通知被点击');
    
    event.notification.close();
    
    // 打开或聚焦到应用页面
    event.waitUntil(
        clients.openWindow('/')
    );
});

// 消息处理
self.addEventListener('message', (event) => {
    console.log('[Service Worker] 收到消息:', event.data);
    
    if (event.data && event.data.type === 'KEEP_ALIVE') {
        // 保持Service Worker活跃
        event.ports[0].postMessage({ status: 'alive' });
    }
});

// Fetch拦截（可选，用于离线支持）
self.addEventListener('fetch', (event) => {
    // 这里可以添加缓存策略，但为了避免干扰API调用，暂时不做处理
    // event.respondWith(fetch(event.request));
});