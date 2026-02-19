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
        // 辅助函数：从嵌套对象中提取第一个非空字符串（智能搜索）
        function extractFirstString(obj, maxDepth = 5, priorityFields = ['content', 'text', 'message', 'reply', 'output', 'result']) {
            if (typeof obj === 'string' && obj.trim()) return obj;
            if (maxDepth <= 0 || !obj || typeof obj !== 'object') return '';
            
            // 需要跳过的字段（这些字段不是实际的消息内容）
            const skipFields = ['id', 'object', 'created', 'model', 'usage', 'system_fingerprint', 'role', 'index', 'finish_reason', 'stop_reason'];
            
            // 首先优先查找可能包含有效内容的字段
            for (let fieldName of priorityFields) {
                if (fieldName in obj) {
                    const val = obj[fieldName];
                    if (typeof val === 'string' && val.trim()) {
                        return val;
                    }
                    if (typeof val === 'object' && val !== null) {
                        const nested = extractFirstString(val, maxDepth - 1, priorityFields);
                        if (nested) return nested;
                    }
                }
            }
            
            // 然后遍历其他字段
            for (let key in obj) {
                // 跳过已知的非内容字段和已检查的字段
                if (skipFields.includes(key) || priorityFields.includes(key)) {
                    continue;
                }
                
                if (typeof obj[key] === 'string' && obj[key].trim()) {
                    return obj[key];
                }
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    const nested = extractFirstString(obj[key], maxDepth - 1, priorityFields);
                    if (nested) return nested;
                }
            }
            return '';
        }
            
        let assistantText = '';
        
        // 尝试多种可能的响应格式（按优先级排序）
        if (data.choices && Array.isArray(data.choices)) {
            // 尝试从choices数组的每一项提取（通常是第一项，但如果失败则尝试其他项）
            for (let i = 0; i < data.choices.length; i++) {
                const choice = data.choices[i];
                if (!choice) continue;
                
                // OpenAI格式：message.content
                if (choice.message?.content && typeof choice.message.content === 'string' && choice.message.content.trim()) {
                    assistantText = choice.message.content;
                    break;
                }
                // Anthropic格式 (text字段)
                else if (choice.text && typeof choice.text === 'string' && choice.text.trim()) {
                    assistantText = choice.text;
                    break;
                }
                // 其他消息格式（可能是字符串或对象）
                else if (choice.message) {
                    if (typeof choice.message === 'string' && choice.message.trim()) {
                        assistantText = choice.message;
                        break;
                    } else if (typeof choice.message === 'object' && choice.message.content && typeof choice.message.content === 'string' && choice.message.content.trim()) {
                        assistantText = choice.message.content;
                        break;
                    }
                }
            }
            
            // 如果从choices数组中没有找到，尝试深度搜索
            if (!assistantText) {
                for (let i = 0; i < data.choices.length; i++) {
                    const choice = data.choices[i];
                    if (choice) {
                        assistantText = extractFirstString(choice);
                        if (assistantText) break;
                    }
                }
            }
        }
        
        // Google Gemini格式
        if (!assistantText && data.candidates && Array.isArray(data.candidates)) {
            for (let i = 0; i < data.candidates.length; i++) {
                const candidate = data.candidates[i];
                if (!candidate) continue;
                
                if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
                    for (let j = 0; j < candidate.content.parts.length; j++) {
                        const part = candidate.content.parts[j];
                        if (part && part.text && typeof part.text === 'string' && part.text.trim()) {
                            assistantText = part.text;
                            break;
                        }
                    }
                }
                
                if (!assistantText && candidate.content && typeof candidate.content === 'string' && candidate.content.trim()) {
                    assistantText = candidate.content;
                }
                
                if (assistantText) break;
            }
        }
        
        // 尝试其他可能的一级字段（按优先级）
        if (!assistantText) {
            const fieldsToTry = [
                'output', 'result', 'reply', 'content', 'text', 'message', 'response', 'data',
                'answer', 'completion', 'generated_text', 'result_text', 'answer_text'
            ];
            
            for (let field of fieldsToTry) {
                if (data[field]) {
                    if (typeof data[field] === 'string' && data[field].trim()) {
                        assistantText = data[field];
                        break;
                    } else if (typeof data[field] === 'object') {
                        assistantText = extractFirstString(data[field]);
                        if (assistantText) break;
                    }
                }
            }
        }
        
        // 最后的兜底方案：深度搜索第一个有效的字符串
        if (!assistantText) {
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
    },

    /**
     * 从响应中按照指定路径提取值 (支持深层路径)
     * 例如：getValueByPath(data, 'choices.0.message.content')
     * @param {Object} obj - 源对象
     * @param {string} path - 点分路径 (如 'a.b.0.c')
     * @returns {string|null} 提取的值或null
     */
    getValueByPath(obj, path) {
        if (!path || typeof path !== 'string') return null;
        
        const keys = path.split('.');
        let current = obj;
        
        for (let key of keys) {
            if (current === null || current === undefined) return null;
            
            // 处理数组索引（如 choices.0.message）
            if (/^\d+$/.test(key)) {
                current = current[parseInt(key)];
            } else {
                current = current[key];
            }
        }
        
        return (typeof current === 'string' && current.trim()) ? current : null;
    },

    /**
     * 使用自定义字段映射提取文本 - 用于特殊的API格式
     * @param {Object} data - API响应数据
     * @param {Array<string>} customPaths - 自定义路径数组，例如 ['data.result', 'response.text']
     * @returns {string} 提取的文本或空字符串
     */
    extractTextWithCustomMapping(data, customPaths = []) {
        // 如果提供了自定义路径，优先尝试
        if (Array.isArray(customPaths) && customPaths.length > 0) {
            for (let path of customPaths) {
                const value = this.getValueByPath(data, path);
                if (value) {
                    console.log('✅ 使用自定义字段映射成功提取:', path);
                    return value;
                }
            }
        }
        
        // 回退到标准提取方式
        return this.extractTextFromResponse(data);
    }

};

// 导出模块（支持多种模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIUtils;
}
if (typeof window !== 'undefined') {
    // 标准导出
    window.APIUtils = APIUtils;

    // 兼容性别名：一些旧代码或拼写错误可能使用小写或错误拼写的引用
    // 将常见变体映射到同一对象，避免运行时 "is not a function" 错误
    try {
        window.apiutils = window.apiutils || APIUtils;

        // 常见大小写变体（全部小写）
        window.apiutils.extractTextFromResponse = APIUtils.extractTextFromResponse;
        window.apiutils.extractTextWithCustomMapping = APIUtils.extractTextWithCustomMapping;

        // 常见拼写错误别名（例如 extratextwithcostommapping）
        window.apiutils.extratextwithcostommapping = APIUtils.extractTextWithCustomMapping;
        window.apiutils.extracttextwithcustommapping = APIUtils.extractTextWithCustomMapping;
        window.apiutils.getValueByPath = APIUtils.getValueByPath;
    } catch (e) {
        // 忽略在非浏览器环境下的赋值错误
        console.warn('APIUtils 兼容性别名设置失败:', e);
    }
}