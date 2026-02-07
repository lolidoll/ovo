/**
 * 副API管理器
 * 负责副API的所有功能：配置、调用、模型拉取等
 */

const SecondaryAPIManager = (function() {
    'use strict';

    // ========== 私有变量 ==========
    let AppState = null;
    let showToast = null;
    let saveToStorage = null;
    let showLoadingOverlay = null;
    let hideLoadingOverlay = null;

    // ========== 初始化 ==========
    function init(appState, toastFunc, saveFunc, loadingShowFunc, loadingHideFunc) {
        AppState = appState;
        showToast = toastFunc;
        saveToStorage = saveFunc;
        showLoadingOverlay = loadingShowFunc;
        hideLoadingOverlay = loadingHideFunc;
        
        console.log('✅ 副API管理器初始化成功');
    }

    // ========== 副API配置验证 ==========
    function isConfigured() {
        const api = AppState?.apiSettings || {};
        return !!(api.secondaryEndpoint && api.secondaryApiKey && api.secondarySelectedModel);
    }

    // ========== 副API调用函数 ==========
    /**
     * 统一的副API调用方法
     * @param {Array} messages - 消息列表
     * @param {string} systemPrompt - 系统提示词
     * @param {function} onSuccess - 成功回调
     * @param {function} onError - 失败回调
     * @param {number} timeout - 超时时间(毫秒)
     */
    function callSecondaryAPI(messages, systemPrompt, onSuccess, onError, timeout = 300000) {
        console.log('🔗 副API调用开始:', {
            messageCount: messages.length,
            hasSystemPrompt: !!systemPrompt,
            timeout: timeout
        });
        
        const api = AppState.apiSettings || {};
        
        if (!isConfigured()) {
            const errorMsg = '副API未配置';
            console.error('❌ ' + errorMsg);
            showToast('请先在API设置中配置副API端点、密钥和模型');
            if (onError) onError(errorMsg);
            return;
        }

        // 使用 APIUtils 规范化端点
        const baseEndpoint = window.APIUtils.normalizeEndpoint(api.secondaryEndpoint);
        const endpoint = baseEndpoint + '/chat/completions';
        
        // 使用 APIUtils 创建超时控制器
        const { controller, timeoutId } = window.APIUtils.createTimeoutController(timeout);
        
        console.log('📤 副API请求信息:', {
            endpoint: endpoint,
            model: api.secondarySelectedModel,
            messageCount: messages.length,
            hasApiKey: !!api.secondaryApiKey
        });

        const body = {
            model: api.secondarySelectedModel,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            temperature: 0.7,
            max_tokens: 10000
        };

        // 使用 APIUtils 创建 fetch 选项
        const fetchOptions = window.APIUtils.createFetchOptions(api.secondaryApiKey, body, controller.signal);

        fetch(endpoint, fetchOptions)
        .then(res => {
            window.APIUtils.clearTimeoutController(timeoutId);
            console.log('📥 副API响应状态:', res.status, res.statusText);
            if (!res.ok) {
                return res.text().then(text => {
                    console.error('❌ 副API错误响应内容:', text);
                    const errorMsg = `HTTP ${res.status}: ${res.statusText}\n详情: ${text.substring(0, 200)}`;
                    throw new Error(errorMsg);
                });
            }
            return res.json();
        })
        .then(data => {
            console.log('✅ 副API返回JSON:', {
                hasChoices: !!data.choices,
                choicesCount: data.choices ? data.choices.length : 0,
                firstChoicePreview: data.choices && data.choices[0] ? String(data.choices[0]).substring(0, 100) : null
            });
            
            // 使用 APIUtils 提取文本
            const result = window.APIUtils.extractTextFromResponse(data);
            
            if (result && result.trim()) {
                console.log('✨ 副API成功返回内容，长度:', result.length);
                if (onSuccess) onSuccess(result);
            } else {
                console.error('❌ 响应数据结构异常:', data);
                throw new Error('响应格式错误：无法找到有效内容');
            }
        })
        .catch(err => {
            window.APIUtils.clearTimeoutController(timeoutId);
            
            // 使用 APIUtils 处理错误
            const userMessage = window.APIUtils.handleApiError(err, timeout);
            
            // 使用 APIUtils 记录错误日志
            window.APIUtils.logApiError('副API', api.secondaryEndpoint, api.secondarySelectedModel, messages.length, userMessage);
            
            showToast(`❌ ${userMessage}`);
            if (onError) onError(userMessage);
        });
    }

    // ========== 动态提示词副API调用 ==========
    /**
     * 通用副API调用辅助函数 - 支持动态提示词和功能选择
     * @param {string} content - 要处理的内容
     * @param {string} promptType - 提示词类型：'translate', 'summarize', 'translateChinese', 'translateEnglish' 等
     * @param {function} onSuccess - 成功回调
     * @param {function} onError - 失败回调
     */
    function callWithDynamicPrompt(content, promptType = 'translate', onSuccess, onError) {
        console.log('🔗 副API动态提示词调用开始:', {
            promptType: promptType,
            contentLength: content.length
        });
        
        const api = AppState.apiSettings || {};
        
        if (!isConfigured()) {
            const errorMsg = '副API未配置';
            console.error('❌ ' + errorMsg);
            showToast('副API未配置，请在设置中填写');
            if (onError) onError(errorMsg);
            return;
        }

        // 获取提示词（优先从动态设置中获取，再从预设中获取）
        let systemPrompt = '';
        
        if (AppState.apiSettings.secondaryPrompts && AppState.apiSettings.secondaryPrompts[promptType]) {
            systemPrompt = AppState.apiSettings.secondaryPrompts[promptType];
            console.log('✅ 使用自定义动态提示词:', promptType);
        } else {
            // 预设提示词映射
            const defaultPrompts = {
                'translate': '你是一个翻译助手。将用户提供的文本翻译成合适的语言。只返回翻译结果，不要有其他内容。',
                'translateEnglish': '你是一个翻译助手。将用户提供的中文文本翻译成英文。只返回翻译结果，不要有其他内容。',
                'translateChinese': '你是一个翻译助手。将用户提供的非中文文本翻译成简体中文。只返回翻译结果，不要有其他内容。',
                'summarize': '你是一个专业的对话总结员。请为下面的内容生成一份简洁准确的总结。总结应该：1. 抓住核心内容和主题；2. 保留重要信息；3. 简洁明了，长度适中（200-300字）；4. 用简体中文撰写。'
            };
            systemPrompt = defaultPrompts[promptType] || defaultPrompts['translate'];
            console.log('⚙️ 使用预设提示词:', promptType);
        }

        // 使用 APIUtils 创建超时控制器
        const { controller, timeoutId } = window.APIUtils.createTimeoutController(300000);

        // 使用 APIUtils 规范化端点
        const baseEndpoint = window.APIUtils.normalizeEndpoint(api.secondaryEndpoint);
        const endpoint = baseEndpoint + '/chat/completions';
        
        console.log('📤 副API请求信息:', {
            endpoint: endpoint,
            model: api.secondarySelectedModel,
            promptType: promptType,
            hasApiKey: !!api.secondaryApiKey
        });

        const body = {
            model: api.secondarySelectedModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: content }
            ],
            temperature: 0.7,
            max_tokens: 10000
        };

        // 使用 APIUtils 创建 fetch 选项
        const fetchOptions = window.APIUtils.createFetchOptions(api.secondaryApiKey, body, controller.signal);

        fetch(endpoint, fetchOptions)
        .then(res => {
            window.APIUtils.clearTimeoutController(timeoutId);
            console.log('📥 副API响应状态:', res.status, res.statusText);
            if (!res.ok) {
                return res.text().then(text => {
                    console.error('❌ 副API错误响应内容:', text);
                    const errorMsg = `HTTP ${res.status}: ${res.statusText}\n详情: ${text.substring(0, 200)}`;
                    throw new Error(errorMsg);
                });
            }
            return res.json();
        })
        .then(data => {
            console.log('✅ 副API返回数据 [' + promptType + ']');
            
            // 使用 APIUtils 提取文本
            const result = window.APIUtils.extractTextFromResponse(data);
            
            if (result && result.trim()) {
                console.log('✨ 副API成功返回内容，长度:', result.length);
                if (onSuccess) onSuccess(result);
            } else {
                console.error('❌ 响应数据结构异常:', data);
                throw new Error('响应格式错误：无法找到有效内容');
            }
        })
        .catch(err => {
            window.APIUtils.clearTimeoutController(timeoutId);
            
            // 使用 APIUtils 处理错误
            const userMessage = window.APIUtils.handleApiError(err, 300000);
            
            // 输出详细的错误诊断信息
            console.error('═══════════════════════════════════════');
            console.error('❌ 副API调用失败 [' + promptType + '] - 完整诊断信息');
            console.error('═══════════════════════════════════════');
            console.error('📍 错误类型:', err.name);
            console.error('💬 错误信息:', err.message);
            console.error('🎯 提示词类型:', promptType);
            console.error('🔍 完整错误对象:', err);
            console.error('═══════════════════════════════════════');
            
            showToast(`❌ ${userMessage}`);
            if (onError) onError(userMessage);
        });
    }

    // ========== 拉取副API模型列表 ==========
    async function fetchModels() {
        // 先从UI读取最新的值（用户可能刚输入但还未保存）
        const endpointInput = document.getElementById('secondary-api-endpoint');
        const keyInput = document.getElementById('secondary-api-key');
        
        const endpoint = endpointInput ? endpointInput.value.trim() : (AppState.apiSettings.secondaryEndpoint || '');
        const apiKey = keyInput ? keyInput.value.trim() : (AppState.apiSettings.secondaryApiKey || '');

        if (!endpoint) {
            showToast('请先填写副 API 端点');
            return;
        }
        
        // 更新到AppState（确保后续使用的是最新值）
        AppState.apiSettings = AppState.apiSettings || {};
        AppState.apiSettings.secondaryEndpoint = endpoint;
        AppState.apiSettings.secondaryApiKey = apiKey;
        
        console.log('🔄 开始拉取副API模型列表...');
        console.log('📍 副API端点:', endpoint);
        console.log('🔑 是否有密钥:', !!apiKey);
        
        // 显示加载提示框
        showLoadingOverlay('正在拉取副API模型...');

        let models = [];
        
        try {
            // 使用 APIUtils 拉取模型
            models = await window.APIUtils.fetchModels(endpoint, apiKey, 300000);
            console.log('🎉 成功拉取模型列表:', models.map(m => m.id).join(', '));
        } catch (error) {
            // 隐藏加载提示框
            hideLoadingOverlay();
            showToast(`未能拉取到模型：${error.message}`);
            console.error('❌ 获取副API模型列表失败。请检查：');
            console.error('- 副API 端点是否正确（当前: ' + endpoint + '）');
            console.error('- 副API 密钥是否正确');
            console.error('- 副API 服务器是否已启动并可访问');
            console.error('- 是否存在CORS跨域问题');
            console.error('- 浏览器控制台中的详细网络错误信息');
            return;
        }

        AppState.apiSettings = AppState.apiSettings || {};
        AppState.apiSettings.secondaryModels = models;
        AppState.apiSettings.secondarySelectedModel = models[0].id;
        saveToStorage();

        const sel = document.getElementById('secondary-models-select');
        const display = document.getElementById('secondary-selected-model-display');
        if (sel) {
            sel.innerHTML = '';
            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.id;
                sel.appendChild(opt);
            });
            sel.value = AppState.apiSettings.secondarySelectedModel;
        }
        if (display) display.textContent = AppState.apiSettings.secondarySelectedModel || '未选择';
        
        // 隐藏加载提示框
        hideLoadingOverlay();
        showToast('✅ 已拉取副API的 ' + models.length + ' 个模型');
        console.log('✅ 副API模型拉取完成');
    }

    // ========== 为预设拉取副API模型 ==========
    async function fetchModelsForPreset(preset) {
        if (!preset.secondaryEndpoint || !preset.secondaryApiKey) return;
        
        // 规范化端点：移除末尾斜杠，并确保包含 /v1
        const normalized = preset.secondaryEndpoint.replace(/\/$/, '');
        const normalizedEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
        
        const tryUrl = normalizedEndpoint + '/models';
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时
            
            const res = await fetch(tryUrl, {
                headers: Object.assign(
                    { 'Content-Type': 'application/json' },
                    preset.secondaryApiKey ? { 'Authorization': 'Bearer ' + preset.secondaryApiKey } : {}
                ),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!res.ok) {
                console.warn('fetch secondary models failed:', tryUrl, res.status);
                return;
            }
            
            const data = await res.json();
            let models = [];
            
            if (Array.isArray(data.data)) {
                models = data.data.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name) }));
            } else if (Array.isArray(data.models)) {
                models = data.models.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name) }));
            } else if (Array.isArray(data)) {
                models = data.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name || m) }));
            }
            
            if (models.length > 0) {
                AppState.apiSettings.secondaryModels = models;
                
                // 如果预设有指定副模型，使用该模型；否则使用第一个
                if (preset.secondarySelectedModel && models.some(m => m.id === preset.secondarySelectedModel)) {
                    AppState.apiSettings.secondarySelectedModel = preset.secondarySelectedModel;
                } else {
                    AppState.apiSettings.secondarySelectedModel = models[0].id;
                    // 更新预设中的secondarySelectedModel
                    const presets = AppState.apiSettings.presets || [];
                    const presetIndex = presets.findIndex(p => p.id === preset.id);
                    if (presetIndex !== -1) {
                        presets[presetIndex].secondarySelectedModel = models[0].id;
                    }
                }
            }
        } catch (e) {
            console.warn('fetch secondary models for preset failed:', e);
        }
    }

    // ========== 加载副API设置到UI ==========
    function loadSettingsToUI() {
        try {
            const s = AppState.apiSettings || {};
            
            // 加载副API设置到UI
            const secondaryEndpointEl = document.getElementById('secondary-api-endpoint');
            const secondaryKeyEl = document.getElementById('secondary-api-key');
            const secondarySelEl = document.getElementById('secondary-models-select');
            const secondaryDisplayEl = document.getElementById('secondary-selected-model-display');
            const secondaryKeyToggle = document.getElementById('secondary-api-key-toggle');

            if (secondaryEndpointEl) secondaryEndpointEl.value = s.secondaryEndpoint || '';
            
            if (secondaryKeyEl) {
                secondaryKeyEl.value = s.secondaryApiKey || '';
                secondaryKeyEl.type = 'password';  // 默认隐藏
            }
            
            if (secondaryKeyToggle) {
                secondaryKeyToggle.textContent = '显示';  // 默认状态为隐藏
            }

            if (secondarySelEl) {
                secondarySelEl.innerHTML = '';
                if (s.secondaryModels && s.secondaryModels.length) {
                    s.secondaryModels.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m.id || m;
                        opt.textContent = m.id || m;
                        secondarySelEl.appendChild(opt);
                    });
                    secondarySelEl.value = s.secondarySelectedModel || (s.secondaryModels[0] && (s.secondaryModels[0].id || s.secondaryModels[0]));
                }
            }

            if (secondaryDisplayEl) secondaryDisplayEl.textContent = s.secondarySelectedModel || '未选择';
        } catch (e) { console.error('副API设置加载到UI失败:', e); }
    }

    // ========== 从UI保存副API设置 ==========
    function saveSettingsFromUI() {
        // 副API设置
        const secondaryEndpoint = (document.getElementById('secondary-api-endpoint') || {}).value || '';
        const secondaryApiKey = (document.getElementById('secondary-api-key') || {}).value || '';
        const secondarySelected = (document.getElementById('secondary-models-select') || {}).value || '';

        AppState.apiSettings = AppState.apiSettings || {};
        
        // 保存副API设置
        AppState.apiSettings.secondaryEndpoint = secondaryEndpoint.trim();
        AppState.apiSettings.secondaryApiKey = secondaryApiKey.trim();
        AppState.apiSettings.secondarySelectedModel = secondarySelected;

        // persist
        saveToStorage();
    }

    // ========== 初始化副API事件监听器 ==========
    function initEventListeners() {
        // 副API模型选择器 change 事件监听
        const secondaryModelsSelect = document.getElementById('secondary-models-select');
        if (secondaryModelsSelect) {
            secondaryModelsSelect.addEventListener('change', function() {
                AppState.apiSettings.secondarySelectedModel = this.value;
                const display = document.getElementById('secondary-selected-model-display');
                if (display) display.textContent = this.value;
                saveToStorage();
            });
        }

        // 副API密钥显示/隐藏切换
        const secondaryApiKeyToggle = document.getElementById('secondary-api-key-toggle');
        if (secondaryApiKeyToggle) {
            // 初始状态：输入框为text类型，按钮显示"隐藏"
            secondaryApiKeyToggle.textContent = '隐藏';
            secondaryApiKeyToggle.addEventListener('click', function(e) {
                e.preventDefault();
                const keyInput = document.getElementById('secondary-api-key');
                if (keyInput) {
                    if (keyInput.type === 'text') {
                        keyInput.type = 'password';
                        secondaryApiKeyToggle.textContent = '显示';
                    } else {
                        keyInput.type = 'text';
                        secondaryApiKeyToggle.textContent = '隐藏';
                    }
                }
            });
        }
    }

    // ========== 公共API ==========
    return {
        init: init,
        isConfigured: isConfigured,
        callSecondaryAPI: callSecondaryAPI,
        callWithDynamicPrompt: callWithDynamicPrompt,
        fetchModels: fetchModels,
        fetchModelsForPreset: fetchModelsForPreset,
        loadSettingsToUI: loadSettingsToUI,
        saveSettingsFromUI: saveSettingsFromUI,
        initEventListeners: initEventListeners
    };
})();

// 全局暴露
window.SecondaryAPIManager = SecondaryAPIManager;