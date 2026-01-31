/**
 * API 工具模块 - 提供共享的 API 调用功能
 * 用于消除 main-api-manager.js 和 secondary-api-manager.js 之间的重复代码
 */

const APIUtils = {
    /**
     * 规范化 API 端点
     * @param {string} endpoint - 原始端点 URL
     * @returns {string} 规范化后的端点（确保包含 /v1）
     */
    normalizeEndpoint(endpoint) {
        if (!endpoint) return '';
        const normalized = endpoint.replace(/\/$/, '');
        return normalized.endsWith('/v1') ? normalized : normalized + '/v1';
    },

    /**
     * 创建 fetch 请求选项
     * @param {string} apiKey - API 密钥
     * @param {Object} body - 请求体
     * @param {AbortSignal} signal - 中止信号
     * @returns {Object} fetch 选项对象
     */
    createFetchOptions(apiKey, body, signal) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        return {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
            signal: signal
        };
    },

    /**
     * 从 API 响应中提取文本内容（支持多种格式）
     * @param {Object} data - API 响应数据
     * @returns {string} 提取的文本内容
     */
    extractTextFromResponse(data) {
        // 辅助函数：从嵌套对象中提取第一个非空字符串
        function extractFirstString(obj, maxDepth = 5) {
            if (typeof obj === 'string' && obj.trim()) return obj;
            if (maxDepth <= 0 || !obj || typeof obj !== 'object') return '';
            
            for (let key in obj) {
                if (typeof obj[key] === 'string' && obj[key].trim()) {
                    return obj[key];
                }
                if (typeof obj[key] === 'object') {
                    const nested = extractFirstString(obj[key], maxDepth - 1);
                    if (nested) return nested;
                }
            }
            return '';
        }
            
        let assistantText = '';
        
        // 尝试多种可能的响应格式（按优先级排序）
        if (data.choices && Array.isArray(data.choices) && data.choices[0]) {
            const choice = data.choices[0];
            // OpenAI格式：message.content
            if (choice.message?.content) {
                assistantText = choice.message.content;
            }
            // Anthropic格式 (text字段)
            else if (choice.text) {
                assistantText = choice.text;
            }
            // 其他消息格式（可能是字符串或对象）
            else if (choice.message) {
                assistantText = typeof choice.message === 'string'
                    ? choice.message
                    : (choice.message.content || extractFirstString(choice.message));
            }
            // 尝试从整个choice对象中提取文本
            else {
                assistantText = extractFirstString(choice);
            }
        }
        // Google Gemini格式
        else if (data.candidates && Array.isArray(data.candidates) && data.candidates[0]) {
            const candidate = data.candidates[0];
            if (candidate.content?.parts?.[0]?.text) {
                assistantText = candidate.content.parts[0].text;
            } else {
                assistantText = extractFirstString(candidate);
            }
        }
        // 其他常见的一级字段
        else if (data.output && typeof data.output === 'string') {
            assistantText = data.output;
        }
        else if (data.result && typeof data.result === 'string') {
            assistantText = data.result;
        }
        else if (data.reply && typeof data.reply === 'string') {
            assistantText = data.reply;
        }
        else if (data.content && typeof data.content === 'string') {
            assistantText = data.content;
        }
        else if (data.text && typeof data.text === 'string') {
            assistantText = data.text;
        }
        else if (data.message && typeof data.message === 'string') {
            assistantText = data.message;
        }
        else if (data.response && typeof data.response === 'string') {
            assistantText = data.response;
        }
        // 最后的兜底方案：深度搜索第一个有效的字符串
        else {
            assistantText = extractFirstString(data);
        }

        return assistantText;
    },

    /**
     * 从 API 响应中解析模型列表
     * @param {Object} data - API 响应数据
     * @returns {Array} 模型列表 [{id: string}]
     */
    parseModelsFromResponse(data) {
        let models = [];
        
        if (Array.isArray(data.data)) {
            models = data.data.map(m => ({
                id: typeof m === 'string' ? m : (m.id || m.name || m.model || String(m))
            }));
        } else if (Array.isArray(data.models)) {
            models = data.models.map(m => ({
                id: typeof m === 'string' ? m : (m.id || m.name || m.model || String(m))
            }));
        } else if (Array.isArray(data)) {
            models = data.map(m => ({
                id: typeof m === 'string' ? m : (m.id || m.name || m.model || String(m))
            }));
        }
        
        return models;
    },

    /**
     * 拉取 API 模型列表
     * @param {string} endpoint - API 端点
     * @param {string} apiKey - API 密钥
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise<Array>} 模型列表
     */
    async fetchModels(endpoint, apiKey, timeout = 300000) {
        const normalized = this.normalizeEndpoint(endpoint);
        
        const tryUrls = [
            normalized + '/models',
            endpoint.replace(/\/$/, '') + '/models',
            endpoint + '/models'
        ];

        let models = [];
        let lastError = null;

        for (const url of tryUrls) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                const headers = {
                    'Content-Type': 'application/json'
                };
                
                if (apiKey) {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                }
                
                const res = await fetch(url, {
                    method: 'GET',
                    headers: headers,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (!res.ok) {
                    lastError = `HTTP ${res.status}: ${res.statusText}`;
                    continue;
                }
                
                const data = await res.json();
                models = this.parseModelsFromResponse(data);
                
                if (models.length > 0) {
                    break;
                }
            } catch (e) {
                if (e.name === 'AbortError') {
                    lastError = `请求超时（${timeout/1000}秒）`;
                } else if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
                    lastError = 'CORS 错误或网络问题';
                } else {
                    lastError = e.message;
                }
            }
        }
        
        if (models.length === 0) {
            throw new Error(lastError || '未能拉取到模型');
        }
        
        return models;
    },

    /**
     * 记录 API 错误日志（统一格式）
     * @param {string} apiType - API 类型（'主API' 或 '副API'）
     * @param {string} endpoint - API 端点
     * @param {string} model - 使用的模型
     * @param {number} messageCount - 消息数量
     * @param {string} errorMessage - 错误信息
     */
    logApiError(apiType, endpoint, model, messageCount, errorMessage) {
        console.error('═══════════════════════════════════════');
        console.error(`❌ ${apiType}调用失败 - 完整诊断信息`);
        console.error('═══════════════════════════════════════');
        console.error('📍 API端点:', endpoint);
        console.error('🤖 使用模型:', model);
        console.error('💬 消息数量:', messageCount);
        console.error('❗ 错误信息:', errorMessage);
        console.error('🔍 请检查:');
        console.error('  1. API端点是否正确且可访问');
        console.error('  2. API密钥是否有效');
        console.error('  3. 所选模型是否支持');
        console.error('  4. 网络连接是否正常');
        console.error('  5. 是否存在CORS跨域问题');
        console.error('═══════════════════════════════════════');
    },

    /**
     * 处理 API 调用错误
     * @param {Error} error - 错误对象
     * @param {number} timeout - 超时时间
     * @returns {string} 用户友好的错误消息
     */
    handleApiError(error, timeout = 300000) {
        if (error.name === 'AbortError') {
            return `API 请求超时（${timeout/60000}分钟）- 模型响应时间过长`;
        } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            return 'CORS 错误或网络连接问题。请检查 API 端点是否正确，或尝试使用支持 CORS 的代理';
        } else {
            return error.message || '未知错误';
        }
    },

    /**
     * 创建超时控制器
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Object} {controller, timeoutId}
     */
    createTimeoutController(timeout = 300000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        return { controller, timeoutId };
    },

    /**
     * 清除超时控制器
     * @param {number} timeoutId - 超时ID
     */
    clearTimeoutController(timeoutId) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
};

// 导出模块（支持多种模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIUtils;
}
if (typeof window !== 'undefined') {
    window.APIUtils = APIUtils;
}