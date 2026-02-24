/**
 * 聊天消息渲染优化模块
 * 优化消息列表的渲染性能，减少重排重绘，提高帧率
 * 
 * @module ChatRenderOptimizer
 * @version 1.0.0
 */

const ChatRenderOptimizer = (function() {
    'use strict';

    // ========== 配置 ==========
    const CONFIG = {
        // 渲染配置
        renderBatchSize: 20,           // 每批渲染的消息数量
        chunkDelay: 4,                 // 批次之间的延迟（毫秒）
        debounceDelay: 100,            // 防抖延迟（毫秒）
        
        // 虚拟滚动配置
        virtualScrollEnabled: true,    // 是否启用虚拟滚动
        scrollThreshold: 150,          // 触发加载的滚动阈值（像素）
        bufferSize: 15,                // 上下缓冲区大小
        
        // 性能监控
        enablePerformanceLogging: false // 是否启用性能日志（生产环境关闭）
    };

    // ========== 状态管理 ==========
    const state = {
        // 事件监听器是否已初始化
        eventListenersInitialized: false,
        
        // 当前渲染的消息ID集合（用于快速判断是否需要重新渲染）
        renderedMessageIds: new Set(),
        
        // 虚拟滚动状态
        virtualScroll: {
            currentStartIndex: 0,
            isLoadingMore: false,
            hasMoreAbove: false
        },
        
        // 防抖定时器
        debounceTimer: null,
        
        // 当前活动的渲染任务
        activeRenderTask: null
    };

    // ========== 工具函数 ==========
    
    /**
     * 安全的日志输出（根据配置决定是否输出）
     */
    function log(...args) {
        if (CONFIG.enablePerformanceLogging) {
            console.log('[ChatRenderOptimizer]', ...args);
        }
    }

    /**
     * 判断两个消息数组是否实质上相同（用于避免不必要的渲染）
     */
    function areMessagesEssentiallySame(oldMessages, newMessages) {
        if (oldMessages.length !== newMessages.length) {
            return false;
        }
        
        // 检查最后一条消息是否相同（最常见的场景）
        if (oldMessages.length > 0) {
            const oldLast = oldMessages[oldMessages.length - 1];
            const newLast = newMessages[newMessages.length - 1];
            if (oldLast.id !== newLast.id) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 使用 DocumentFragment 批量创建消息元素
     */
    function createMessageFragment(messages, startIndex, endIndex, renderFn) {
        const fragment = document.createDocumentFragment();
        
        for (let i = startIndex; i < endIndex; i++) {
            const messageElement = renderFn(messages[i], i);
            if (messageElement) {
                fragment.appendChild(messageElement);
            }
        }
        
        return fragment;
    }

    /**
     * 优化的防抖渲染函数
     */
    function scheduleRender(renderFn, callback) {
        if (state.debounceTimer) {
            clearTimeout(state.debounceTimer);
        }
        
        // 取消之前的渲染任务
        if (state.activeRenderTask) {
            state.activeRenderTask.cancel();
        }
        
        state.debounceTimer = setTimeout(() => {
            state.debounceTimer = null;
            callback();
        }, CONFIG.debounceDelay);
    }

    /**
     * 分片渲染大量消息
     */
    function renderMessagesInChunks(messages, renderFn, container, onComplete) {
        if (state.activeRenderTask) {
            state.activeRenderTask.cancel();
        }
        
        const totalMessages = messages.length;
        let currentIndex = 0;
        
        function processChunk() {
            const startTime = performance.now();
            const endIndex = Math.min(currentIndex + CONFIG.renderBatchSize, totalMessages);
            
            // 创建并插入当前批次
            const fragment = createMessageFragment(messages, currentIndex, endIndex, renderFn);
            container.appendChild(fragment);
            
            currentIndex = endIndex;
            
            // 检查是否完成
            if (currentIndex < totalMessages) {
                // 检查是否已经用了太多时间，如果是则让出控制权
                const elapsed = performance.now() - startTime;
                if (elapsed < 8) { // 小于半帧时间，继续处理
                    processChunk();
                } else {
                    // 使用 requestIdleCallback 或 setTimeout 让出控制权
                    if (window.requestIdleCallback) {
                        requestIdleCallback(processChunk, { timeout: 16 });
                    } else {
                        setTimeout(processChunk, CONFIG.chunkDelay);
                    }
                }
            } else {
                log('✅ 分片渲染完成，总数:', totalMessages);
                if (onComplete) onComplete();
            }
        }
        
        state.activeRenderTask = {
            cancel: () => {
                state.activeRenderTask = null;
            }
        };
        
        processChunk();
    }

    /**
     * 优化的虚拟滚动渲染
     */
    function renderWithVirtualScroll(messages, container, renderFn, options = {}) {
        const {
            forceScrollToBottom = false,
            onLoadMore = null
        } = options;
        
        const totalMessages = messages.length;
        const batchSize = CONFIG.renderBatchSize;
        
        // 判断是否需要使用虚拟滚动
        const useVirtualScroll = CONFIG.virtualScrollEnabled && totalMessages > batchSize;
        
        if (!useVirtualScroll) {
            // 消息数量少，直接渲染
            log('📝 传统渲染模式 - 消息数:', totalMessages);
            container.innerHTML = '';
            const fragment = createMessageFragment(messages, 0, totalMessages, renderFn);
            container.appendChild(fragment);
            
            if (forceScrollToBottom) {
                requestAnimationFrame(() => {
                    container.scrollTop = container.scrollHeight;
                });
            }
            return;
        }
        
        // 使用虚拟滚动
        log('📝 虚拟滚动模式 - 总数:', totalMessages);
        
        const startIndex = Math.max(0, totalMessages - batchSize);
        state.virtualScroll.currentStartIndex = startIndex;
        state.virtualScroll.hasMoreAbove = startIndex > 0;
        
        // 渲染最新批次
        container.innerHTML = '';
        const fragment = createMessageFragment(messages, startIndex, totalMessages, renderFn);
        container.appendChild(fragment);
        
        // 添加"加载更多"提示
        if (state.virtualScroll.hasMoreAbove) {
            const loadMoreHint = createLoadMoreHint(startIndex, onLoadMore);
            container.insertBefore(loadMoreHint, container.firstChild);
        }
        
        // 设置滚动监听
        setupVirtualScrollListener(container, messages, renderFn, onLoadMore);
        
        if (forceScrollToBottom) {
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }

    /**
     * 创建"加载更多"提示元素
     */
    function createLoadMoreHint(remainingCount, onClick) {
        const hint = document.createElement('div');
        hint.className = 'load-more-hint';
        hint.textContent = `向上滑动加载更早的消息 (还有${remainingCount}条)`;
        
        if (onClick) {
            hint.addEventListener('click', onClick);
        }
        
        return hint;
    }

    /**
     * 设置虚拟滚动监听器（使用节流）
     */
    function setupVirtualScrollListener(container, messages, renderFn, onLoadMore) {
        // 移除旧的监听器
        if (container._virtualScrollHandler) {
            container.removeEventListener('scroll', container._virtualScrollHandler);
        }
        
        // 创建节流处理函数
        const scrollHandler = PerformanceUtils.throttle(() => {
            if (state.virtualScroll.isLoadingMore) return;
            
            const scrollTop = container.scrollTop;
            
            // 当滚动到顶部附近时，触发加载
            if (scrollTop < CONFIG.scrollThreshold && state.virtualScroll.hasMoreAbove) {
                if (onLoadMore) {
                    onLoadMore();
                }
            }
        }, 100);
        
        container._virtualScrollHandler = scrollHandler;
        container.addEventListener('scroll', scrollHandler, { passive: true });
    }

    /**
     * 加载更多历史消息（虚拟滚动）
     */
    function loadMoreMessages(messages, container, renderFn, onLoadComplete) {
        if (state.virtualScroll.isLoadingMore) return;
        
        const currentStart = state.virtualScroll.currentStartIndex;
        if (currentStart <= 0) {
            state.virtualScroll.hasMoreAbove = false;
            return;
        }
        
        state.virtualScroll.isLoadingMore = true;
        
        // 保存当前滚动位置
        const oldScrollHeight = container.scrollHeight;
        const oldScrollTop = container.scrollTop;
        
        // 计算新的起始索引
        const batchSize = CONFIG.renderBatchSize;
        const newStart = Math.max(0, currentStart - batchSize);
        
        // 移除旧的"加载更多"提示
        const oldHint = container.querySelector('.load-more-hint');
        if (oldHint) {
            oldHint.remove();
        }
        
        // 插入新消息
        const fragment = createMessageFragment(messages, newStart, currentStart, renderFn);
        container.insertBefore(fragment, container.firstChild);
        
        // 更新状态
        state.virtualScroll.currentStartIndex = newStart;
        state.virtualScroll.hasMoreAbove = newStart > 0;
        
        // 如果还有更多消息，添加新的"加载更多"提示
        if (state.virtualScroll.hasMoreAbove) {
            const newHint = createLoadMoreHint(newStart, onLoadComplete);
            container.insertBefore(newHint, container.firstChild);
        }
        
        // 恢复滚动位置
        requestAnimationFrame(() => {
            const newScrollHeight = container.scrollHeight;
            const scrollDiff = newScrollHeight - oldScrollHeight;
            container.scrollTop = oldScrollTop + scrollDiff;
            state.virtualScroll.isLoadingMore = false;
        });
    }

    /**
     * 优化的滚动到指定消息
     */
    function scrollToMessage(container, messageId) {
        const targetElement = container.querySelector(`[data-message-id="${messageId}"]`);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            
            // 添加高亮效果
            targetElement.classList.add('highlight-message');
            setTimeout(() => {
                targetElement.classList.remove('highlight-message');
            }, 2000);
        }
    }

    // ========== 事件监听器管理 ==========
    
    /**
     * 初始化事件监听器（只执行一次）
     */
    function initializeEventListeners(container, handlers) {
        if (state.eventListenersInitialized) {
            log('⚠️ 事件监听器已初始化，跳过');
            return;
        }
        
        log('🔧 初始化事件监听器');
        
        // 使用事件委托，所有事件在容器级别处理
        if (handlers.onClick) {
            container.addEventListener('click', handlers.onClick);
        }
        
        if (handlers.onContextMenu) {
            container.addEventListener('contextmenu', handlers.onContextMenu);
        }
        
        if (handlers.onTouchStart) {
            container.addEventListener('touchstart', handlers.onTouchStart, { passive: true });
        }
        
        if (handlers.onTouchMove) {
            container.addEventListener('touchmove', handlers.onTouchMove, { passive: true });
        }
        
        if (handlers.onTouchEnd) {
            container.addEventListener('touchend', handlers.onTouchEnd, { passive: false });
        }
        
        if (handlers.onDoubleClick) {
            container.addEventListener('dblclick', handlers.onDoubleClick);
        }
        
        if (handlers.onScroll) {
            container.addEventListener('scroll', handlers.onScroll, { passive: true });
        }
        
        state.eventListenersInitialized = true;
    }

    /**
     * 清理事件监听器
     */
    function cleanupEventListeners(container, handlers) {
        if (!state.eventListenersInitialized) return;
        
        log('🔧 清理事件监听器');
        
        if (handlers.onClick) {
            container.removeEventListener('click', handlers.onClick);
        }
        
        if (handlers.onContextMenu) {
            container.removeEventListener('contextmenu', handlers.onContextMenu);
        }
        
        if (handlers.onTouchStart) {
            container.removeEventListener('touchstart', handlers.onTouchStart);
        }
        
        if (handlers.onTouchMove) {
            container.removeEventListener('touchmove', handlers.onTouchMove);
        }
        
        if (handlers.onTouchEnd) {
            container.removeEventListener('touchend', handlers.onTouchEnd);
        }
        
        if (handlers.onDoubleClick) {
            container.removeEventListener('dblclick', handlers.onDoubleClick);
        }
        
        if (handlers.onScroll) {
            container.removeEventListener('scroll', handlers.onScroll);
        }
        
        state.eventListenersInitialized = false;
    }

    // ========== 性能监控 ==========
    
    /**
     * 测量渲染性能
     */
    function measureRenderPerformance(fn, label = 'Render') {
        const startTime = performance.now();
        fn();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (duration > 16) {
            console.warn(`⚠️ [${label}] 渲染耗时: ${duration.toFixed(2)}ms (超过一帧)`);
        } else {
            log(`✓ [${label}] 渲染耗时: ${duration.toFixed(2)}ms`);
        }
        
        return duration;
    }

    // ========== 导出公共 API ==========
    return {
        // 配置
        CONFIG,
        state,
        
        // 核心渲染方法
        renderWithVirtualScroll,
        renderMessagesInChunks,
        loadMoreMessages,
        scrollToMessage,
        
        // 调度方法
        scheduleRender,
        
        // 事件管理
        initializeEventListeners,
        cleanupEventListeners,
        
        // 工具方法
        areMessagesEssentiallySame,
        measureRenderPerformance,
        
        // 配置更新
        updateConfig(newConfig) {
            Object.assign(CONFIG, newConfig);
        },
        
        // 重置状态
        reset() {
            state.eventListenersInitialized = false;
            state.renderedMessageIds.clear();
            state.virtualScroll = {
                currentStartIndex: 0,
                isLoadingMore: false,
                hasMoreAbove: false
            };
            if (state.debounceTimer) {
                clearTimeout(state.debounceTimer);
                state.debounceTimer = null;
            }
            if (state.activeRenderTask) {
                state.activeRenderTask.cancel();
                state.activeRenderTask = null;
            }
        }
    };
})();

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.ChatRenderOptimizer = ChatRenderOptimizer;
}

// 兼容 CommonJS 环境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatRenderOptimizer;
}