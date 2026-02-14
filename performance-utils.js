/**
 * 性能优化工具模块
 * 提供防抖、节流、分片渲染等性能优化功能
 * 
 * @module PerformanceUtils
 * @version 1.0.0
 */

const PerformanceUtils = (function() {
    'use strict';

    // ========== 防抖函数 ==========
    /**
     * 防抖函数 - 在指定延迟内只执行一次
     * @param {Function} func - 要防抖的函数
     * @param {number} delay - 延迟时间（毫秒）
     * @param {boolean} immediate - 是否立即执行
     * @returns {Function} 防抖后的函数
     */
    function debounce(func, delay = 150, immediate = false) {
        let timer = null;
        
        return function debounced(...args) {
            const context = this;
            
            if (timer) {
                clearTimeout(timer);
            }
            
            if (immediate) {
                const callNow = !timer;
                timer = setTimeout(() => {
                    timer = null;
                }, delay);
                
                if (callNow) {
                    func.apply(context, args);
                }
            } else {
                timer = setTimeout(() => {
                    func.apply(context, args);
                }, delay);
            }
        };
    }

    // ========== 节流函数 ==========
    /**
     * 节流函数 - 在指定时间间隔内最多执行一次
     * @param {Function} func - 要节流的函数
     * @param {number} interval - 时间间隔（毫秒）
     * @param {Object} options - 配置选项
     * @param {boolean} options.leading - 是否在开始时执行
     * @param {boolean} options.trailing - 是否在结束时执行
     * @returns {Function} 节流后的函数
     */
    function throttle(func, interval = 100, options = {}) {
        const { leading = true, trailing = true } = options;
        let timer = null;
        let lastTime = 0;
        
        return function throttled(...args) {
            const context = this;
            const now = Date.now();
            
            if (!lastTime && !leading) {
                lastTime = now;
            }
            
            const remaining = interval - (now - lastTime);
            
            if (remaining <= 0) {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                
                lastTime = now;
                func.apply(context, args);
            } else if (!timer && trailing) {
                timer = setTimeout(() => {
                    lastTime = leading ? Date.now() : 0;
                    timer = null;
                    func.apply(context, args);
                }, remaining);
            }
        };
    }

    // ========== 分片渲染函数 ==========
    /**
     * 分片渲染 - 将大量渲染任务分散到多个空闲时间片
     * @param {Array} items - 要渲染的项目数组
     * @param {Function} renderFn - 渲染函数，接收 (item, index) 参数
     * @param {Function} onComplete - 完成回调
     * @param {number} batchSize - 每批次处理的项目数量
     * @param {number} delay - 批次之间的延迟（毫秒）
     * @returns {Object} 包含 cancel 方法的控制器
     */
    function chunkedRender(items, renderFn, onComplete = null, batchSize = 10, delay = 5) {
        let currentIndex = 0;
        let cancelled = false;
        let timeoutId = null;
        
        function processChunk() {
            if (cancelled) {
                if (onComplete) onComplete(false);
                return;
            }
            
            const endIndex = Math.min(currentIndex + batchSize, items.length);
            const startTime = performance.now();
            
            // 使用 DocumentFragment 批量插入
            const fragment = document.createDocumentFragment();
            
            for (let i = currentIndex; i < endIndex; i++) {
                const result = renderFn(items[i], i);
                if (result instanceof Node) {
                    fragment.appendChild(result);
                }
            }
            
            currentIndex = endIndex;
            
            // 检查是否还有更多项目
            if (currentIndex < items.length) {
                // 使用 requestIdleCallback 或 setTimeout 进行下一批
                if (window.requestIdleCallback) {
                    timeoutId = requestIdleCallback(
                        () => timeoutId = setTimeout(processChunk, delay),
                        { timeout: 50 }
                    );
                } else {
                    timeoutId = setTimeout(processChunk, delay);
                }
            } else {
                if (onComplete) onComplete(true);
            }
        }
        
        // 开始处理
        if (window.requestIdleCallback) {
            requestIdleCallback(() => processChunk(), { timeout: 50 });
        } else {
            timeoutId = setTimeout(processChunk, 0);
        }
        
        return {
            cancel: () => {
                cancelled = true;
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                if (window.cancelIdleCallback) {
                    cancelIdleCallback(timeoutId);
                }
            }
        };
    }

    // ========== RAF 节流函数 ==========
    /**
     * 基于 requestAnimationFrame 的节流函数
     * 适用于需要与浏览器渲染同步的场景
     * @param {Function} func - 要节流的函数
     * @returns {Function} 节流后的函数
     */
    function rafThrottle(func) {
        let rafId = null;
        let lastArgs = null;
        
        return function rafThrottled(...args) {
            lastArgs = args;
            
            if (rafId === null) {
                rafId = requestAnimationFrame(() => {
                    func.apply(this, lastArgs);
                    rafId = null;
                    lastArgs = null;
                });
            }
        };
    }

    // ========== 批量 DOM 操作 ==========
    /**
     * 批量 DOM 操作 - 收集多个 DOM 操作后一次性执行
     * @param {Function} operations - 包含 DOM 操作的函数
     */
    function batchDOMUpdates(operations) {
        // 使用 requestAnimationFrame 确保在浏览器重绘前执行
        requestAnimationFrame(() => {
            // 强制重排以批量处理
            const forceReflow = document.body.offsetHeight;
            operations();
        });
    }

    // ========== 性能监控 ==========
    /**
     * 性能监控工具 - 测量函数执行时间
     * @param {Function} func - 要测量的函数
     * @param {string} label - 标签名称
     * @returns {Function} 包装后的函数
     */
    function measurePerformance(func, label = 'Performance') {
        return function measured(...args) {
            const startTime = performance.now();
            const result = func.apply(this, args);
            const endTime = performance.now();
            
            if (endTime - startTime > 16) { // 超过一帧的时间
                console.warn(`[${label}] 执行时间: ${(endTime - startTime).toFixed(2)}ms`);
            }
            
            return result;
        };
    }

    // ========== 长任务检测 ==========
    /**
     * 检测并报告长任务
     * @param {Function} func - 要检测的函数
     * @param {number} threshold - 阈值（毫秒），默认 50ms
     * @returns {Function} 包装后的函数
     */
    function detectLongTask(func, threshold = 50) {
        return function detected(...args) {
            const startTime = performance.now();
            const result = func.apply(this, args);
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            if (duration > threshold) {
                console.warn(`⚠️ 长任务检测: ${func.name || '匿名函数'} 耗时 ${duration.toFixed(2)}ms`);
            }
            
            return result;
        };
    }

    // ========== 懒加载 ==========
    /**
     * 懒加载工具 - 使用 IntersectionObserver
     * @param {string|Array<Element>} selector - 选择器或元素数组
     * @param {Function} callback - 元素进入视口时的回调
     * @param {Object} options - IntersectionObserver 选项
     * @returns {IntersectionObserver} 观察器实例
     */
    function lazyLoad(selector, callback, options = {}) {
        const defaultOptions = {
            rootMargin: '50px',
            threshold: 0.01
        };
        
        const observerOptions = { ...defaultOptions, ...options };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    callback(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        if (typeof selector === 'string') {
            document.querySelectorAll(selector).forEach(el => observer.observe(el));
        } else if (Array.isArray(selector)) {
            selector.forEach(el => observer.observe(el));
        }
        
        return observer;
    }

    // ========== 内存优化 ==========
    /**
     * 清理对象中的循环引用，便于垃圾回收
     * @param {Object} obj - 要清理的对象
     * @returns {Object} 清理后的对象
     */
    function cleanupObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        
        const seen = new WeakSet();
        
        function clean(item) {
            if (typeof item !== 'object' || item === null) {
                return item;
            }
            
            if (seen.has(item)) {
                return null;
            }
            
            seen.add(item);
            
            if (Array.isArray(item)) {
                return item.map(clean);
            }
            
            const cleaned = {};
            for (const key in item) {
                if (item.hasOwnProperty(key)) {
                    cleaned[key] = clean(item[key]);
                }
            }
            
            return cleaned;
        }
        
        return clean(obj);
    }

    // ========== 导出公共 API ==========
    return {
        debounce,
        throttle,
        rafThrottle,
        chunkedRender,
        batchDOMUpdates,
        measurePerformance,
        detectLongTask,
        lazyLoad,
        cleanupObject
    };
})();

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.PerformanceUtils = PerformanceUtils;
}

// 兼容 CommonJS 环境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceUtils;
}