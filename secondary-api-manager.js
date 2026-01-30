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
     * @param {number} timeout - 超时时间(毫秒)，默认4分钟
     */
    function callSecondaryAPI(messages, systemPrompt, onSuccess, onError, timeout = 240000) {
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const normalized = api.secondaryEndpoint.replace(/\/$/, '');
        const baseEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
        const endpoint = baseEndpoint + '/chat/completions';
        
        console.log('📤 副API请求信息:', {
            endpoint: endpoint,
            model: api.secondarySelectedModel,
            messageCount: messages.length,
            hasApiKey: !!api.secondaryApiKey
        });

        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (api.secondaryApiKey) {
            headers['Authorization'] = `Bearer ${api.secondaryApiKey}`;
        }

        fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: api.secondarySelectedModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 10000
            }),
            signal: controller.signal
        })
        .then(res => {
            clearTimeout(timeoutId);
            console.log('📥 副API响应状态:', res.status, res.statusText);
            if (!res.ok) {
                return res.text().then(text => {
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.error('❌ 副API 请求失败');
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.error('📍 请求端点:', endpoint);
                    console.error('🔢 HTTP状态码:', res.status);
                    console.error('📝 状态文本:', res.statusText);
                    console.error('🎯 使用模型:', api.secondarySelectedModel);
                    console.error('📊 消息数量:', messages.length + 1); // +1 包括system消息
                    console.error('🔑 API密钥:', api.secondaryApiKey ? '已设置 (' + api.secondaryApiKey.substring(0, 8) + '...)' : '未设置');
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.error('📄 完整错误响应体:');
                    console.error(text);
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    // 尝试解析JSON格式的错误信息
                    try {
                        const errorJson = JSON.parse(text);
                        console.error('🔍 解析后的错误信息:');
                        console.error(JSON.stringify(errorJson, null, 2));
                        
                        // 提取常见的错误字段
                        if (errorJson.error) {
                            if (typeof errorJson.error === 'string') {
                                console.error('💬 错误消息:', errorJson.error);
                            } else if (errorJson.error.message) {
                                console.error('💬 错误消息:', errorJson.error.message);
                                if (errorJson.error.type) {
                                    console.error('🏷️ 错误类型:', errorJson.error.type);
                                }
                                if (errorJson.error.code) {
                                    console.error('🔖 错误代码:', errorJson.error.code);
                                }
                            }
                        }
                    } catch (jsonErr) {
                        console.error('⚠️ 错误响应不是JSON格式');
                    }
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
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
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const result = data.choices[0].message.content;
                console.log('✨ 副API成功返回内容，长度:', result.length);
                if (onSuccess) onSuccess(result);
            } else {
                console.error('❌ 响应数据结构异常:', data);
                throw new Error('响应格式错误：无法找到choices或message内容');
            }
        })
        .catch(err => {
            clearTimeout(timeoutId);
            console.error('❌ 副API调用失败:', err.name, err.message);
            if (err.name === 'AbortError') {
                const errorMsg = '副API请求超时（' + (timeout/1000) + '秒）';
                showToast(errorMsg);
                if (onError) onError(errorMsg);
            } else if (err instanceof TypeError && e.message.includes('Failed to fetch')) {
                const errorMsg = '副API错误: CORS或网络问题，请检查端点配置';
                showToast(errorMsg);
                if (onError) onError(errorMsg);
            } else {
                showToast(`副API错误: ${err.message}`);
                if (onError) onError(err.message);
            }
            console.error('副API调用完整错误:', err);
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

        const controller = new AbortController();
        // 超时时间改为4分钟（240秒）
        const timeoutId = setTimeout(() => controller.abort(), 240000);

        const normalized = api.secondaryEndpoint.replace(/\/$/, '');
        const baseEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
        const endpoint = baseEndpoint + '/chat/completions';
        
        console.log('📤 副API请求信息:', {
            endpoint: endpoint,
            model: api.secondarySelectedModel,
            promptType: promptType,
            hasApiKey: !!api.secondaryApiKey
        });

        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (api.secondaryApiKey) {
            headers['Authorization'] = `Bearer ${api.secondaryApiKey}`;
        }

        fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: api.secondarySelectedModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: content }
                ],
                temperature: 0.7,
                max_tokens: 10000
            }),
            signal: controller.signal
        })
        .then(res => {
            clearTimeout(timeoutId);
            console.log('📥 副API响应状态:', res.status, res.statusText);
            if (!res.ok) {
                return res.text().then(text => {
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.error('❌ 副API 请求失败 [' + promptType + ']');
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.error('📍 请求端点:', endpoint);
                    console.error('🔢 HTTP状态码:', res.status);
                    console.error('📝 状态文本:', res.statusText);
                    console.error('🎯 使用模型:', api.secondarySelectedModel);
                    console.error('🏷️ 提示词类型:', promptType);
                    console.error('🔑 API密钥:', api.secondaryApiKey ? '已设置 (' + api.secondaryApiKey.substring(0, 8) + '...)' : '未设置');
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.error('📄 完整错误响应体:');
                    console.error(text);
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    // 尝试解析JSON格式的错误信息
                    try {
                        const errorJson = JSON.parse(text);
                        console.error('🔍 解析后的错误信息:');
                        console.error(JSON.stringify(errorJson, null, 2));
                        
                        // 提取常见的错误字段
                        if (errorJson.error) {
                            if (typeof errorJson.error === 'string') {
                                console.error('💬 错误消息:', errorJson.error);
                            } else if (errorJson.error.message) {
                                console.error('💬 错误消息:', errorJson.error.message);
                                if (errorJson.error.type) {
                                    console.error('🏷️ 错误类型:', errorJson.error.type);
                                }
                                if (errorJson.error.code) {
                                    console.error('🔖 错误代码:', errorJson.error.code);
                                }
                            }
                        }
                    } catch (jsonErr) {
                        console.error('⚠️ 错误响应不是JSON格式');
                    }
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                });
            }
            return res.json();
        })
        .then(data => {
            console.log('✅ 副API返回数据 [' + promptType + ']');
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const result = data.choices[0].message.content;
                console.log('✨ 副API成功返回内容，长度:', result.length);
                if (onSuccess) onSuccess(result);
            } else {
                console.error('❌ 响应数据结构异常:', data);
                throw new Error('响应格式错误：无法找到choices或message内容');
            }
        })
        .catch(err => {
            clearTimeout(timeoutId);
            
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('❌ 副API 请求异常 [' + promptType + ']');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('📍 请求端点:', endpoint);
            console.error('🎯 使用模型:', api.secondarySelectedModel);
            console.error('🏷️ 提示词类型:', promptType);
            console.error('⚠️ 异常类型:', err.name);
            console.error('💬 异常信息:', err.message);
            
            if (err.name === 'AbortError') {
                const errorMsg = '副API请求超时（240秒/4分钟）';
                console.error('⏱️ 超时详情: 请求在4分钟后仍未完成');
                console.error('💡 建议: 1) 检查模型是否响应缓慢 2) 检查网络连接 3) 考虑使用更快的模型');
                showToast(errorMsg);
                if (onError) onError(errorMsg);
            } else if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                const errorMsg = '副API错误: CORS或网络问题，请检查端点配置';
                console.error('🌐 网络错误详情:', err.message);
                console.error('💡 可能原因:');
                console.error('   1. API端点不支持CORS跨域请求');
                console.error('   2. 网络连接中断');
                console.error('   3. API服务器无法访问');
                console.error('   4. 防火墙/代理阻止了请求');
                showToast(errorMsg);
                if (onError) onError(errorMsg);
            } else {
                console.error('📋 完整错误对象:', err);
                if (err.stack) {
                    console.error('🔍 错误堆栈:', err.stack);
                }
                showToast(`副API错误: ${err.message}`);
                if (onError) onError(err.message);
            }
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        });
    }

    // ========== 拉取副API模型列表 ==========
    async function fetchModels() {
        const endpoint = AppState.apiSettings.secondaryEndpoint || '';
        const apiKey = AppState.apiSettings.secondaryApiKey || '';

        if (!endpoint) {
            showToast('请先填写副 API 端点');
            return;
        }
        
        console.log('🔄 开始拉取副API模型列表...');
        console.log('📍 副API端点:', endpoint);
        console.log('🔑 是否有密钥:', !!apiKey);
        
        // 显示加载提示框
        showLoadingOverlay('正在拉取副API模型...');

        // 规范化端点：移除末尾斜杠，并确保包含 /v1
        const normalized = endpoint.replace(/\/$/, '');
        const normalizedEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
        
        const tryUrls = [
            normalizedEndpoint + '/models',
            normalized + '/models',  // 尝试不带/v1的端点
            endpoint + '/models'     // 尝试原始端点
        ];

        console.log('🔍 将尝试以下端点:', tryUrls);

        let models = [];
        let lastError = null;

        for (const url of tryUrls) {
            try {
                console.log('🌐 正在尝试:', url);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                
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
                
                console.log('📡 响应状态:', res.status, res.statusText);
                
                if (!res.ok) {
                    lastError = `HTTP ${res.status}: ${res.statusText}`;
                    console.warn('❌ 请求失败:', url, lastError);
                    continue;
                }
                
                const data = await res.json();
                console.log('📦 收到数据结构:', {
                    hasData: !!data.data,
                    hasModels: !!data.models,
                    isArray: Array.isArray(data),
                    keys: Object.keys(data)
                });
                
                if (Array.isArray(data.data)) {
                    models = data.data.map(m => ({
                        id: typeof m === 'string' ? m : (m.id || m.name || m.model || String(m))
                    }));
                    console.log('✅ 从data字段解析到', models.length, '个模型');
                } else if (Array.isArray(data.models)) {
                    models = data.models.map(m => ({
                        id: typeof m === 'string' ? m : (m.id || m.name || m.model || String(m))
                    }));
                    console.log('✅ 从models字段解析到', models.length, '个模型');
                } else if (Array.isArray(data)) {
                    models = data.map(m => ({
                        id: typeof m === 'string' ? m : (m.id || m.name || m.model || String(m))
                    }));
                    console.log('✅ 从数组直接解析到', models.length, '个模型');
                }
                
                if (models.length > 0) {
                    console.log('🎉 成功拉取模型列表:', models.map(m => m.id).join(', '));
                    break;
                }
            } catch (e) {
                if (e.name === 'AbortError') {
                    lastError = '请求超时（30秒）';
                    console.error('⏱️ 超时:', url);
                } else if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
                    lastError = 'CORS 错误或网络问题。请检查副API端点是否支持跨域访问';
                    console.error('🚫 CORS/网络错误:', url, e);
                } else {
                    lastError = e.message;
                    console.error('❌ 其他错误:', url, e);
                }
            }
        }
        
        if (models.length === 0) {
            // 隐藏加载提示框
            hideLoadingOverlay();
            const msg = lastError ? `未能拉取到模型：${lastError}` : '未能拉取到模型，请检查副API端点与密钥（或查看控制台）';
            showToast(msg);
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
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
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
            secondaryApiKeyToggle.addEventListener('click', function(e) {
                e.preventDefault();
                const keyInput = document.getElementById('secondary-api-key');
                if (keyInput) {
                    if (keyInput.type === 'password') {
                        keyInput.type = 'text';
                        secondaryApiKeyToggle.textContent = '隐藏';
                    } else {
                        keyInput.type = 'password';
                        secondaryApiKeyToggle.textContent = '显示';
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