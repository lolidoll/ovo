/**
 * 后台保活系统
 * 解决手机端浏览器最小化后API调用停止的问题
 */

(function() {
    'use strict';
    
    const BackgroundKeepAlive = {
        // 保活状态
        wakeLock: null,
        isPageVisible: true,
        pendingApiCalls: new Map(), // 存储进行中的API调用
        heartbeatInterval: null,
        
        /**
         * 初始化后台保活系统
         */
        init: function() {
            console.log('🔋 后台保活系统初始化中...');
            
            // 检测设备和浏览器
            this.detectEnvironment();
            
            // 监听页面可见性变化
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            
            // 监听页面焦点变化
            window.addEventListener('focus', this.handlePageFocus.bind(this));
            window.addEventListener('blur', this.handlePageBlur.bind(this));
            
            // 尝试获取屏幕唤醒锁（仅在HTTPS环境下可用）
            this.requestWakeLock();
            
            // 启动心跳检测
            this.startHeartbeat();
            
            // 注册Service Worker（如果支持）
            this.registerServiceWorker();
            
            // 使用Audio API保持后台活跃（备用方案）
            this.setupAudioKeepAlive();
            
            console.log('✅ 后台保活系统初始化完成');
        },
        
        /**
         * 检测运行环境
         */
        detectEnvironment: function() {
            const ua = navigator.userAgent;
            this.isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
            this.isAndroid = /Android/.test(ua);
            
            // 浏览器检测
            this.isEdge = /Edg/.test(ua);
            this.isOpera = /OPR|Opera/.test(ua);
            this.isYandex = /YaBrowser/.test(ua);
            this.isChrome = /Chrome/.test(ua) && !this.isEdge && !this.isOpera && !this.isYandex;
            this.isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !this.isEdge;
            this.isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
            
            // 确定浏览器名称
            this.browserName = 'Unknown';
            if (this.isChrome) this.browserName = 'Chrome';
            else if (this.isEdge) this.browserName = 'Edge';
            else if (this.isOpera) this.browserName = 'Opera';
            else if (this.isYandex) this.browserName = 'Yandex';
            else if (this.isSafari) this.browserName = 'Safari';
            
            console.log('📱 设备信息:', {
                iOS: this.isIOS,
                Android: this.isAndroid,
                Browser: this.browserName,
                Chrome: this.isChrome,
                Edge: this.isEdge,
                Opera: this.isOpera,
                Yandex: this.isYandex,
                Safari: this.isSafari,
                Standalone: this.isStandalone
            });
        },
        
        /**
         * 注册Service Worker
         */
        registerServiceWorker: async function() {
            if (!('serviceWorker' in navigator)) {
                console.warn('⚠️ 浏览器不支持Service Worker');
                return;
            }
            
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js', {
                    scope: '/'
                });
                console.log('✅ Service Worker注册成功:', registration.scope);
                
                // 监听Service Worker状态变化
                registration.addEventListener('updatefound', () => {
                    console.log('🔄 Service Worker更新中...');
                });
            } catch (error) {
                console.warn('⚠️ Service Worker注册失败:', error.message);
            }
        },
        
        /**
         * 使用Audio API保持后台活跃（备用方案）
         */
        setupAudioKeepAlive: function() {
            try {
                // 创建静音音频上下文
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) {
                    console.warn('⚠️ 浏览器不支持Audio API');
                    return;
                }
                
                this.audioContext = new AudioContext();
                
                // 创建一个静音的振荡器
                this.oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                // 设置音量为0（静音）
                gainNode.gain.value = 0;
                
                // 连接节点
                this.oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // 启动振荡器
                this.oscillator.start();
                
                console.log('✅ 音频保活已启动');
            } catch (error) {
                console.warn('⚠️ 音频保活启动失败:', error.message);
            }
        },
        
        /**
         * 处理页面可见性变化
         */
        handleVisibilityChange: function() {
            this.isPageVisible = !document.hidden;
            
            if (document.hidden) {
                console.log('📱 页面进入后台，启动保活机制');
                this.onPageHidden();
            } else {
                console.log('📱 页面回到前台，恢复正常运行');
                this.onPageVisible();
            }
        },
        
        /**
         * 页面获得焦点
         */
        handlePageFocus: function() {
            console.log('👁️ 页面获得焦点');
            this.requestWakeLock();
        },
        
        /**
         * 页面失去焦点
         */
        handlePageBlur: function() {
            console.log('👁️ 页面失去焦点');
        },
        
        /**
         * 页面隐藏时的处理
         */
        onPageHidden: function() {
            // 保存当前状态
            this.saveCurrentState();
            
            // 继续维持API调用
            this.maintainApiCalls();
            
            // 增加心跳频率
            this.increaseHeartbeatFrequency();
        },
        
        /**
         * 页面可见时的处理
         */
        onPageVisible: function() {
            // 恢复心跳频率
            this.normalizeHeartbeatFrequency();
            
            // 重新请求唤醒锁
            this.requestWakeLock();
            
            // 检查并恢复API调用
            this.checkAndRestoreApiCalls();
        },
        
        /**
         * 请求屏幕唤醒锁
         */
        requestWakeLock: async function() {
            // 检查浏览器是否支持Wake Lock API
            if (!('wakeLock' in navigator)) {
                console.warn('⚠️ 当前浏览器不支持Wake Lock API');
                return;
            }
            
            // 仅在HTTPS环境下尝试
            if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
                console.warn('⚠️ Wake Lock API仅在HTTPS环境下可用');
                return;
            }
            
            try {
                // 释放旧的唤醒锁
                if (this.wakeLock !== null) {
                    await this.wakeLock.release();
                }
                
                // 请求新的唤醒锁
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('✅ 屏幕唤醒锁已获取');
                
                // 监听唤醒锁释放事件
                this.wakeLock.addEventListener('release', () => {
                    console.log('🔓 屏幕唤醒锁已释放');
                });
                
            } catch (err) {
                console.warn('⚠️ 无法获取屏幕唤醒锁:', err.message);
            }
        },
        
        /**
         * 启动心跳检测
         */
        startHeartbeat: function() {
            // 每30秒发送一次心跳
            this.heartbeatInterval = setInterval(() => {
                this.sendHeartbeat();
            }, 30000);
        },
        
        /**
         * 发送心跳信号
         */
        sendHeartbeat: function() {
            const timestamp = Date.now();
            console.log(`💓 心跳 [${new Date(timestamp).toLocaleTimeString()}]`);
            
            // 使用localStorage记录最后心跳时间
            try {
                localStorage.setItem('lastHeartbeat', timestamp.toString());
            } catch (e) {
                console.warn('⚠️ 无法保存心跳时间:', e);
            }
        },
        
        /**
         * 增加心跳频率（页面在后台时）
         */
        increaseHeartbeatFrequency: function() {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            // 后台时每10秒发送一次心跳
            this.heartbeatInterval = setInterval(() => {
                this.sendHeartbeat();
            }, 10000);
        },
        
        /**
         * 恢复正常心跳频率
         */
        normalizeHeartbeatFrequency: function() {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            // 前台时每30秒发送一次心跳
            this.heartbeatInterval = setInterval(() => {
                this.sendHeartbeat();
            }, 30000);
        },
        
        /**
         * 注册API调用
         */
        registerApiCall: function(callId, callInfo) {
            this.pendingApiCalls.set(callId, {
                ...callInfo,
                startTime: Date.now(),
                status: 'pending'
            });
            console.log(`📝 注册API调用: ${callId}`);
        },
        
        /**
         * 完成API调用
         */
        completeApiCall: function(callId, success = true) {
            const callInfo = this.pendingApiCalls.get(callId);
            if (callInfo) {
                callInfo.status = success ? 'completed' : 'failed';
                callInfo.endTime = Date.now();
                callInfo.duration = callInfo.endTime - callInfo.startTime;
                console.log(`✅ API调用完成: ${callId}, 耗时: ${callInfo.duration}ms`);
                
                // 延迟删除，以便恢复时检查
                setTimeout(() => {
                    this.pendingApiCalls.delete(callId);
                }, 5000);
            }
        },
        
        /**
         * 维持API调用（页面在后台时）
         */
        maintainApiCalls: function() {
            const activeCalls = Array.from(this.pendingApiCalls.values())
                .filter(call => call.status === 'pending');
                
            if (activeCalls.length > 0) {
                console.log(`🔄 后台维持 ${activeCalls.length} 个API调用`);
                
                // 使用Beacon API发送保活信号（如果支持）
                if (navigator.sendBeacon) {
                    activeCalls.forEach(call => {
                        // 这里可以向服务器发送保活信号
                        // navigator.sendBeacon('/api/keepalive', JSON.stringify({callId: call.id}));
                    });
                }
            }
        },
        
        /**
         * 检查并恢复API调用
         */
        checkAndRestoreApiCalls: function() {
            const activeCalls = Array.from(this.pendingApiCalls.values())
                .filter(call => call.status === 'pending');
                
            if (activeCalls.length > 0) {
                console.log(`🔍 检查到 ${activeCalls.length} 个未完成的API调用`);
                
                // 检查是否有超时的调用
                const now = Date.now();
                activeCalls.forEach(call => {
                    const elapsed = now - call.startTime;
                    if (elapsed > 300000) { // 5分钟超时
                        console.warn(`⚠️ API调用超时: ${call.id}, 已耗时: ${elapsed}ms`);
                        this.completeApiCall(call.id, false);
                    }
                });
            }
        },
        
        /**
         * 保存当前状态
         */
        saveCurrentState: function() {
            try {
                const state = {
                    timestamp: Date.now(),
                    activeCalls: Array.from(this.pendingApiCalls.entries()),
                    isPageVisible: this.isPageVisible
                };
                localStorage.setItem('backgroundState', JSON.stringify(state));
            } catch (e) {
                console.warn('⚠️ 无法保存后台状态:', e);
            }
        },
        
        /**
         * 恢复状态
         */
        restoreState: function() {
            try {
                const stateStr = localStorage.getItem('backgroundState');
                if (stateStr) {
                    const state = JSON.parse(stateStr);
                    const elapsed = Date.now() - state.timestamp;
                    
                    if (elapsed < 3600000) { // 1小时内的状态有效
                        console.log(`🔄 恢复后台状态，距离上次保存: ${Math.round(elapsed/1000)}秒`);
                        
                        // 恢复API调用状态
                        state.activeCalls.forEach(([id, info]) => {
                            this.pendingApiCalls.set(id, info);
                        });
                    }
                }
            } catch (e) {
                console.warn('⚠️ 无法恢复后台状态:', e);
            }
        },
        
        /**
         * 销毁
         */
        destroy: function() {
            // 清理心跳
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            
            // 释放唤醒锁
            if (this.wakeLock !== null) {
                this.wakeLock.release();
            }
            
            console.log('🔚 后台保活系统已销毁');
        }
    };
    
    // 暴露到全局
    window.BackgroundKeepAlive = BackgroundKeepAlive;
    
    // 页面加载完成后自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            BackgroundKeepAlive.init();
            BackgroundKeepAlive.restoreState();
        });
    } else {
        BackgroundKeepAlive.init();
        BackgroundKeepAlive.restoreState();
    }
    
})();