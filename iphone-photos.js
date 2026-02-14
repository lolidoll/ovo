/**
 * iPhone 相册应用
 * 调用主API生成角色相关的照片描述
 */

(function() {
    'use strict';

    let currentPhotos = [];
    let currentCharacter = null;

    // 创建相册页面HTML
    function createPhotosPage() {
        const photosHTML = `
            <div class="iphone-photos-page" id="iphone-photos-page">
                <div class="photos-header">
                    <button class="photos-back-btn" id="photos-back-btn">
                        <i class="fa fa-arrow-left"></i>
                    </button>
                    <div class="photos-title">相册</div>
                    <div class="photos-header-actions">
                        <button class="photos-settings-btn" id="photos-settings-btn">
                            <i class="fa fa-cog"></i>
                        </button>
                        <button class="photos-generate-btn" id="photos-generate-btn">生成</button>
                    </div>
                </div>
                
                <div class="photos-content" id="photos-content">
                    <div class="photos-empty">
                        <div class="photos-empty-icon">📷</div>
                        <div class="photos-empty-text">暂无照片</div>
                        <div class="photos-empty-hint">点击右上角"生成"按钮创建照片</div>
                    </div>
                </div>
            </div>
            
            <div class="photo-detail-page" id="photo-detail-page">
                <button class="photo-detail-close-btn" id="photo-detail-close-btn">完成</button>
                <div class="photo-detail-content" id="photo-detail-content"></div>
            </div>
            
            <div class="photos-settings-modal" id="photos-settings-modal">
                <div class="photos-settings-overlay"></div>
                <div class="photos-settings-content">
                    <div class="photos-settings-header">
                        <h3>相册设置</h3>
                        <button class="photos-settings-close" id="photos-settings-close">
                            <i class="fa fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="photos-settings-body">
                        <!-- 生图开关 -->
                        <div class="photos-setting-item">
                            <div class="photos-setting-label">
                                <span>启用图片生成</span>
                                <small>关闭后仅显示文字描述</small>
                            </div>
                            <label class="photos-toggle-switch">
                                <input type="checkbox" id="photos-enable-generation" checked>
                                <span class="photos-toggle-slider"></span>
                            </label>
                        </div>
                        
                        <!-- 提示词输入区 -->
                        <div class="photos-setting-section" id="photos-prompt-section">
                            <div class="photos-setting-section-title">生图提示词补充</div>
                            <div class="photos-setting-section-desc">添加画风、画质、细节等描述</div>
                            
                            <div class="photos-prompt-input-group">
                                <textarea
                                    id="photos-prompt-input"
                                    class="photos-prompt-textarea"
                                    placeholder="例如：水彩画风格，高清画质，细节丰富"
                                    rows="3"
                                ></textarea>
                                <button class="photos-prompt-save-btn" id="photos-prompt-save-btn">
                                    <i class="fa fa-save"></i> 保存为预设
                                </button>
                            </div>
                            
                            <!-- 预设列表 -->
                            <div class="photos-presets-section">
                                <div class="photos-presets-title">我的预设</div>
                                <div class="photos-presets-list" id="photos-presets-list">
                                    <!-- 预设项将动态插入 -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', photosHTML);
            initializePhotosEvents();
            loadPhotosSettings();
        }
    }

    // 初始化事件
    function initializePhotosEvents() {
        const backBtn = document.getElementById('photos-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', hidePhotos);
        }

        const generateBtn = document.getElementById('photos-generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', generatePhotos);
        }

        const closeBtn = document.getElementById('photo-detail-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', hidePhotoDetail);
        }
        
        // 设置按钮
        const settingsBtn = document.getElementById('photos-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', showSettingsModal);
        }
        
        // 设置弹窗关闭
        const settingsClose = document.getElementById('photos-settings-close');
        if (settingsClose) {
            settingsClose.addEventListener('click', hideSettingsModal);
        }
        
        const settingsModal = document.getElementById('photos-settings-modal');
        if (settingsModal) {
            const overlay = settingsModal.querySelector('.photos-settings-overlay');
            if (overlay) {
                overlay.addEventListener('click', hideSettingsModal);
            }
        }
        
        // 生图开关
        const enableGeneration = document.getElementById('photos-enable-generation');
        if (enableGeneration) {
            enableGeneration.addEventListener('change', handleGenerationToggle);
        }
        
        // 保存预设按钮
        const promptSaveBtn = document.getElementById('photos-prompt-save-btn');
        if (promptSaveBtn) {
            promptSaveBtn.addEventListener('click', savePromptPreset);
        }
    }
    
    // ========== 设置相关功能 ==========
    
    // 默认设置
    const defaultSettings = {
        enableGeneration: true,
        currentPrompt: '',
        presets: []
    };
    
    // 加载设置
    function loadPhotosSettings() {
        try {
            const saved = localStorage.getItem('iphonePhotosSettings');
            const settings = saved ? JSON.parse(saved) : defaultSettings;
            
            // 应用设置到UI
            const enableCheckbox = document.getElementById('photos-enable-generation');
            if (enableCheckbox) {
                enableCheckbox.checked = settings.enableGeneration;
            }
            
            const promptInput = document.getElementById('photos-prompt-input');
            if (promptInput) {
                promptInput.value = settings.currentPrompt || '';
            }
            
            // 更新提示词区域显示状态
            updatePromptSectionVisibility(settings.enableGeneration);
            
            // 渲染预设列表
            renderPresetsList(settings.presets);
            
            return settings;
        } catch (error) {
            console.error('加载相册设置失败:', error);
            return defaultSettings;
        }
    }
    
    // 保存设置
    function savePhotosSettings(settings) {
        try {
            localStorage.setItem('iphonePhotosSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('保存相册设置失败:', error);
        }
    }
    
    // 获取当前设置
    function getPhotosSettings() {
        try {
            const saved = localStorage.getItem('iphonePhotosSettings');
            return saved ? JSON.parse(saved) : defaultSettings;
        } catch (error) {
            console.error('获取相册设置失败:', error);
            return defaultSettings;
        }
    }
    
    // 显示设置弹窗
    function showSettingsModal() {
        const modal = document.getElementById('photos-settings-modal');
        if (modal) {
            modal.classList.add('show');
            loadPhotosSettings(); // 重新加载设置
        }
    }
    
    // 隐藏设置弹窗
    function hideSettingsModal() {
        const modal = document.getElementById('photos-settings-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    // 处理生图开关
    function handleGenerationToggle(e) {
        const enabled = e.target.checked;
        const settings = getPhotosSettings();
        settings.enableGeneration = enabled;
        savePhotosSettings(settings);
        
        // 更新提示词区域显示
        updatePromptSectionVisibility(enabled);
        
        console.log('生图功能', enabled ? '已启用' : '已禁用');
    }
    
    // 更新提示词区域显示状态
    function updatePromptSectionVisibility(enabled) {
        const promptSection = document.getElementById('photos-prompt-section');
        if (promptSection) {
            promptSection.style.display = enabled ? 'block' : 'none';
        }
    }
    
    // 保存提示词预设
    function savePromptPreset() {
        const promptInput = document.getElementById('photos-prompt-input');
        const promptText = promptInput ? promptInput.value.trim() : '';
        
        if (!promptText) {
            alert('请输入提示词内容');
            return;
        }
        
        const settings = getPhotosSettings();
        
        // 检查是否已存在相同预设
        const exists = settings.presets.some(p => p.text === promptText);
        if (exists) {
            alert('该预设已存在');
            return;
        }
        
        // 添加新预设
        const preset = {
            id: Date.now(),
            text: promptText,
            createdAt: new Date().toISOString()
        };
        
        settings.presets.push(preset);
        savePhotosSettings(settings);
        
        // 重新渲染预设列表
        renderPresetsList(settings.presets);
        
        // 清空输入框
        if (promptInput) {
            promptInput.value = '';
        }
        
        console.log('预设已保存:', preset);
    }
    
    // 渲染预设列表
    function renderPresetsList(presets) {
        const listContainer = document.getElementById('photos-presets-list');
        if (!listContainer) return;
        
        if (!presets || presets.length === 0) {
            listContainer.innerHTML = '<div class="photos-presets-empty">暂无预设</div>';
            return;
        }
        
        listContainer.innerHTML = presets.map(preset => `
            <div class="photos-preset-item" data-id="${preset.id}">
                <div class="photos-preset-text">${escapeHtml(preset.text)}</div>
                <div class="photos-preset-actions">
                    <button class="photos-preset-apply-btn" onclick="window.applyPhotoPreset(${preset.id})">
                        <i class="fa fa-check"></i> 应用
                    </button>
                    <button class="photos-preset-delete-btn" onclick="window.deletePhotoPreset(${preset.id})">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // 应用预设
    window.applyPhotoPreset = function(presetId) {
        const settings = getPhotosSettings();
        const preset = settings.presets.find(p => p.id === presetId);
        
        if (!preset) {
            console.error('预设不存在');
            return;
        }
        
        // 更新当前提示词
        settings.currentPrompt = preset.text;
        savePhotosSettings(settings);
        
        // 更新输入框
        const promptInput = document.getElementById('photos-prompt-input');
        if (promptInput) {
            promptInput.value = preset.text;
        }
        
        // 视觉反馈
        const presetItems = document.querySelectorAll('.photos-preset-item');
        presetItems.forEach(item => {
            if (item.dataset.id === presetId.toString()) {
                item.classList.add('active');
                setTimeout(() => item.classList.remove('active'), 1000);
            }
        });
        
        console.log('已应用预设:', preset.text);
    };
    
    // 删除预设
    window.deletePhotoPreset = function(presetId) {
        if (!confirm('确定要删除这个预设吗？')) {
            return;
        }
        
        const settings = getPhotosSettings();
        settings.presets = settings.presets.filter(p => p.id !== presetId);
        savePhotosSettings(settings);
        
        // 重新渲染
        renderPresetsList(settings.presets);
        
        console.log('预设已删除');
    };
    
    // HTML转义工具函数
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 获取当前角色信息（从当前聊天页面获取）
    function getCurrentCharacter() {
        console.log('=== 相册获取当前聊天角色信息 ===');
        
        // 获取当前聊天的ID
        const currentChatId = window.AppState?.currentChat?.id;
        console.log('当前聊天ID:', currentChatId);
        
        if (!currentChatId) {
            console.warn('⚠️ 未找到当前聊天ID，使用默认值');
            return {
                name: '角色',
                card: null,
                userName: '用户',
                userPersona: '',
                summaries: []
            };
        }
        
        // 从conversations中找到对应的conversation
        const conversation = window.AppState?.conversations?.find(c => c.id === currentChatId);
        console.log('找到的conversation:', conversation);
        
        if (!conversation) {
            console.warn('⚠️ 未找到对应的conversation，使用默认值');
            return {
                name: '角色',
                card: null,
                userName: '用户',
                userPersona: '',
                summaries: []
            };
        }
        
        // 从角色设置中获取用户名和人设
        let userName = conversation.userNameForChar || window.AppState?.user?.name || '用户';
        let userPersona = conversation.userPersonality || window.AppState?.user?.personality || '';
        
        console.log('----- 角色设置信息 -----');
        console.log('1. conversation.userNameForChar:', conversation.userNameForChar);
        console.log('2. conversation.userPersonality:', conversation.userPersonality);
        console.log('3. window.AppState?.user?.name:', window.AppState?.user?.name);
        console.log('4. window.AppState?.user?.personality:', window.AppState?.user?.personality);
        console.log('最终使用的用户名:', userName);
        console.log('最终使用的人设:', userPersona ? userPersona.substring(0, 50) + '...' : '无');
        console.log('=======================');
        
        // 提取角色信息
        const characterInfo = {
            name: conversation.name || '角色',
            card: conversation.characterSetting || null,
            userName: userName,
            userPersona: userPersona,
            summaries: conversation.summaries || [],
            id: currentChatId
        };
        
        console.log('✅ 获取到的角色信息:', {
            name: characterInfo.name,
            userName: characterInfo.userName,
            userPersona: characterInfo.userPersona ? '有' : '无',
            hasCard: !!characterInfo.card,
            summariesCount: characterInfo.summaries.length
        });
        console.log('========================');
        
        return characterInfo;
    }

    // 获取最近对话（从AppState获取当前聊天的最新50条）
    function getRecentMessages() {
        const currentChatId = window.AppState?.currentChat?.id;
        if (!currentChatId) {
            console.warn('未找到当前聊天ID');
            return [];
        }
        
        const messages = window.AppState?.messages?.[currentChatId] || [];
        console.log('获取到最近消息数:', messages.length);
        return messages.slice(-50); // 最近50条
    }

    // 生成照片
    async function generatePhotos() {
        const generateBtn = document.getElementById('photos-generate-btn');
        const content = document.getElementById('photos-content');
        
        if (!content || !generateBtn) return;
        
        generateBtn.disabled = true;
        
        content.innerHTML = `
            <div class="photos-loading">
                <div class="photos-loading-spinner"></div>
                <div class="photos-loading-text">正在生成照片描述...</div>
            </div>
        `;
        
        try {
            currentCharacter = getCurrentCharacter();
            const recentMessages = getRecentMessages();
            
            console.log('===== 相册调试提示词构建 =====');
            console.log('角色名:', currentCharacter.name);
            console.log('用户名:', currentCharacter.userName);
            console.log('是否有角色设定:', !!currentCharacter.card);
            console.log('历史总结数:', currentCharacter.summaries?.length || 0);
            console.log('最近消息数:', recentMessages.length);
            
            // 构建历史总结文本
            let summariesText = '';
            if (currentCharacter.summaries && currentCharacter.summaries.length > 0) {
                summariesText = '\n历史总结：\n' + currentCharacter.summaries.join('\n');
            }
            
            // 构建最近对话文本
            let messagesText = '';
            if (recentMessages.length > 0) {
                messagesText = '\n最近对话（最近50条）：\n' +
                    recentMessages.slice(-20).map(m => {
                        const role = m.type === 'sent' ? currentCharacter.userName : currentCharacter.name;
                        return `${role}: ${m.content}`;
                    }).join('\n');
            }
            
            // 构建提示词 - 要求返回纯JSON，不要任何其他内容
            const prompt = `你是${currentCharacter.name}，这是你的手机相册。请生成10张照片的描述。

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${currentCharacter.card}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}
${summariesText}
${messagesText}

要求：
1. 与${currentCharacter.userName}相关的照片或者与角色日常生活相关（结合世界观和现实）
2. 每张照片描述60-120字
3. 要有真实感和活人感，像真实拍摄的照片
4. 描述要具体，包含场景、人物、情感、细节
5. 必须生成10张，不能少

直接返回JSON数组，不要任何说明文字或markdown标记：
[{"description":"照片描述1"},{"description":"照片描述2"},...]`;
            
            console.log('完整提示词:', prompt);
            console.log('========================');

            const response = await callMainAPI(prompt);
            const photosData = parsePhotosResponse(response);
            
            // 更新加载提示
            content.innerHTML = `
                <div class="photos-loading">
                    <div class="photos-loading-spinner"></div>
                    <div class="photos-loading-text">正在生成图片...</div>
                </div>
            `;
            
            // 生成模拟的时间分布（最近3天内）
            const now = Date.now();
            const timeOffsets = [
                // 2张刚拍摄（0-30分钟前）
                ...Array.from({length: 2}, () => Math.floor(Math.random() * 30 * 60 * 1000)),
                // 3张今天拍摄（1-12小时前）
                ...Array.from({length: 3}, () => 60 * 60 * 1000 + Math.floor(Math.random() * 11 * 60 * 60 * 1000)),
                // 3张昨天拍摄（24-36小时前）
                ...Array.from({length: 3}, () => 24 * 60 * 60 * 1000 + Math.floor(Math.random() * 12 * 60 * 60 * 1000)),
                // 2张前天拍摄（48-60小时前）
                ...Array.from({length: 2}, () => 48 * 60 * 60 * 1000 + Math.floor(Math.random() * 12 * 60 * 60 * 1000))
            ];
            
            // 打乱时间偏移顺序
            timeOffsets.sort(() => Math.random() - 0.5);
            
            // 获取相册设置
            const settings = getPhotosSettings();
            
            currentPhotos = photosData.map((photo, index) => {
                const photoTime = new Date(now - timeOffsets[index]);
                
                // 生成图片URL - 根据设置决定是否生成
                const seed = Date.now() + index;
                let imageUrl = null;
                let fallbackUrls = [];
                
                if (settings.enableGeneration) {
                    // 构建提示词：基础描述 + 用户补充
                    let finalPrompt = photo.description;
                    
                    // 如果有用户补充的提示词，添加到描述后面
                    if (settings.currentPrompt && settings.currentPrompt.trim()) {
                        finalPrompt = `${photo.description}，${settings.currentPrompt}`;
                    }
                    
                    // 构建Pollinations URL - 完整格式（带所有参数）
                    const pollinationsUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(finalPrompt)}?model=zimage&width=1080&height=2160&nologo=true&key=sk_InRGAIaBbde6kBPCSzO4FsOHTvYKQocd`;
                    
                    // 备选方案
                    const imageSources = [
                        pollinationsUrl,
                        // 备选：Picsum（随机照片）
                        `https://picsum.photos/seed/${seed}/1080/2160`
                    ];
                    
                    imageUrl = imageSources[0];
                    fallbackUrls = imageSources.slice(1);
                    
                    console.log(`生成图片 [${index}]:`, {
                        description: photo.description.substring(0, 40) + '...',
                        customPrompt: settings.currentPrompt || '(无)',
                        finalPrompt: finalPrompt.substring(0, 60) + '...',
                        urlPreview: imageUrl.substring(0, 100) + '...'
                    });
                    
                    // 测试URL是否可访问（仅第一张图片）
                    if (index === 0) {
                        console.log('🔍 测试Pollinations API...');
                        console.log('📋 基础描述:', photo.description);
                        console.log('🎨 用户补充:', settings.currentPrompt || '(无)');
                        console.log('🎯 最终提示词:', finalPrompt);
                        console.log('⚙️ 参数: model=zimage, 1080x2160, nologo=true');
                        fetch(imageUrl, { method: 'HEAD' })
                            .then(r => {
                                if (r.ok) {
                                    console.log('✅ Pollinations API 可用！');
                                } else {
                                    console.warn('⚠️ API响应异常，状态:', r.status);
                                }
                            })
                            .catch(e => console.error('❌ API错误:', e.message));
                    }
                } else {
                    console.log(`仅文字描述 [${index}]:`, photo.description.substring(0, 50) + '...');
                }
                
                return {
                    id: Date.now() + index,
                    description: photo.description,
                    imageUrl: imageUrl, // null表示不生成图片
                    fallbackUrls: fallbackUrls,
                    time: formatTime(photoTime),
                    timestamp: photoTime.getTime(),
                    textOnly: !settings.enableGeneration // 标记是否仅文字
                };
            });
            
            // 按时间排序（最新的在前）
            currentPhotos.sort((a, b) => b.timestamp - a.timestamp);
            
            // 保存到localStorage
            savePhotosToStorage();
            
            renderPhotosGrid();
            
        } catch (error) {
            console.error('生成照片失败:', error);
            content.innerHTML = `
                <div class="photos-empty">
                    <div class="photos-empty-icon">⚠️</div>
                    <div class="photos-empty-text">生成失败</div>
                    <div class="photos-empty-hint">${error.message || '请稍后重试'}</div>
                </div>
            `;
        } finally {
            generateBtn.disabled = false;
        }
    }

    // 保存照片到localStorage
    function savePhotosToStorage() {
        try {
            localStorage.setItem('iphonePhotosData', JSON.stringify({
                photos: currentPhotos,
                character: currentCharacter,
                savedAt: Date.now()
            }));
        } catch (e) {
            console.error('保存照片失败:', e);
        }
    }
    
    // 从localStorage加载照片
    function loadPhotosFromStorage() {
        try {
            const saved = localStorage.getItem('iphonePhotosData');
            if (saved) {
                const data = JSON.parse(saved);
                // 检查是否是同一角色，并且数据包含imageUrl
                if (data.character && data.character.name === getCurrentCharacter().name) {
                    const photos = data.photos || [];
                    // 检查照片是否有imageUrl字段，如果没有则不加载（旧数据）
                    if (photos.length > 0 && photos[0].imageUrl) {
                        currentPhotos = photos;
                        currentCharacter = data.character;
                        console.log('✅ 从localStorage加载了包含图片URL的照片数据');
                        return true;
                    } else {
                        console.log('⚠️ localStorage中的数据不包含图片URL，将重新生成');
                    }
                }
            }
        } catch (e) {
            console.error('加载照片失败:', e);
        }
        return false;
    }

    // 调用主API
    async function callMainAPI(prompt) {
        // 获取API配置
        const api = window.AppState?.apiSettings;
        if (!api || !api.endpoint || !api.selectedModel) {
            throw new Error('请先在设置中配置API信息');
        }
        
        const apiKey = api.apiKey || '';
        if (!apiKey) {
            throw new Error('请先在设置中配置API密钥');
        }
        
        // 规范化endpoint（与其他文件保持一致）
        const baseEndpoint = api.endpoint.replace(/\/+$/, '');
        const endpoint = baseEndpoint + '/v1/chat/completions';
        
        const body = {
            model: api.selectedModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 10000
        };
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('API响应格式错误');
            }
            
            return data.choices[0].message.content;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('API请求超时（5分钟）');
            }
            throw error;
        }
    }

    // 格式化时间
    function formatTime(date) {
        const now = new Date();
        const d = new Date(date);
        
        if (d.toDateString() === now.toDateString()) {
            return d.getHours().toString().padStart(2, '0') + ':' +
                   d.getMinutes().toString().padStart(2, '0');
        }
        
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) {
            return '昨天';
        }
        
        // 修复日期格式：使用padStart确保是02/07而不是2/7
        return (d.getMonth() + 1).toString().padStart(2, '0') + '/' +
               d.getDate().toString().padStart(2, '0');
    }
    
    // 获取日期分组标签
    function getDateGroupLabel(date) {
        const now = new Date();
        const d = new Date(date);
        
        // 重置时间到当天0点，方便比较
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const compareDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        
        const diffTime = today - compareDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        if (diffDays === 2) return '前天';
        
        // 其他日期显示完整日期
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        
        // 如果是今年，不显示年份
        if (year === now.getFullYear()) {
            return `${month}月${day}日`;
        }
        
        return `${year}年${month}月${day}日`;
    }

    // 解析照片响应
    function parsePhotosResponse(response) {
        console.log('原始API响应:', response);
        console.log('响应长度:', response.length);
        
        try {
            // 清理响应内容，移除markdown代码块标记
            let cleanedResponse = response
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/gi, '')
                .trim();
            
            console.log('清理后的响应:', cleanedResponse);
            console.log('清理后长度:', cleanedResponse.length);
            
            // 尝试直接解析JSON（处理完整或部分JSON）
            let jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try {
                    const jsonStr = jsonMatch[0];
                    console.log('找到JSON数组，长度:', jsonStr.length);
                    
                    // 修复可能的JSON格式问题
                    const fixedJson = jsonStr
                        .replace(/,\s*\]/g, ']')  // 移除尾随逗号
                        .replace(/,\s*}/g, '}');   // 移除尾随逗号
                    
                    const parsed = JSON.parse(fixedJson);
                    console.log('解析的JSON数组，项目数:', parsed.length);
                    
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        // 验证每个项目都有description字段
                        const validPhotos = parsed.filter(item => item.description && typeof item.description === 'string');
                        console.log('有效的照片数:', validPhotos.length);
                        
                        if (validPhotos.length > 0) {
                            return validPhotos;
                        }
                    }
                } catch (jsonError) {
                    console.log('JSON解析失败，尝试其他方法:', jsonError);
                }
            }
            
            // 如果JSON解析失败，尝试提取所有"description"字段
            const descMatches = cleanedResponse.match(/"description"\s*:\s*"([^"]+)"/g);
            console.log('找到description匹配数:', descMatches ? descMatches.length : 0);
            
            if (descMatches && descMatches.length > 0) {
                const descriptions = descMatches.map(match => {
                    const descMatch = match.match(/"description"\s*:\s*"([^"]+)"/);
                    return descMatch ? descMatch[1] : '';
                }).filter(desc => desc.trim());
                
                console.log('提取的描述数:', descriptions.length);
                
                if (descriptions.length > 0) {
                    return descriptions.slice(0, 15).map(description => ({ description }));
                }
            }
            
            // 如果还是没有，尝试按行解析（每行一个描述）
            const lines = cleanedResponse
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 10 && line.length < 200) // 过滤空行和过短/过长的行
                .filter(line => !line.match(/^[\d\.\-\*]+$/)) // 过滤只有数字/符号的空行
                .slice(0, 15);
            
            console.log('按行解析的行数:', lines.length);
                
            if (lines.length > 0) {
                const parsed = lines.map(line => ({
                    description: line
                        .replace(/^\d+[\.\、]\s*/, '')
                        .replace(/^[-*]\s*/, '')
                        .replace(/^["'`]|["'`]$/g, '')
                        .trim()
                }));
                console.log('按行解析的结果:', parsed);
                return parsed;
            }
            
            // 如果都没有，返回默认照片
            console.log('使用默认照片');
            return Array.from({length: 15}, (_, i) => ({
                description: `照片 ${i + 1}：这是一张记录生活瞬间的照片，充满了温馨和美好的回忆。`
            }));
            
        } catch (error) {
            console.error('解析响应失败:', error);
            // 返回默认照片
            return Array.from({length: 15}, (_, i) => ({
                description: `照片 ${i + 1}：这是一张记录生活瞬间的照片，充满了温馨和美好的回忆。`
            }));
        }
    }

    // 渲染照片网格（按时间分组）
    function renderPhotosGrid() {
        const content = document.getElementById('photos-content');
        if (!content) return;
        
        if (currentPhotos.length === 0) {
            content.innerHTML = `
                <div class="photos-empty">
                    <div class="photos-empty-icon">📷</div>
                    <div class="photos-empty-text">暂无照片</div>
                    <div class="photos-empty-hint">点击右上角"生成"按钮创建照片</div>
                </div>
            `;
            return;
        }
        
        // 按日期分组
        const photosByDate = {};
        currentPhotos.forEach(photo => {
            const dateLabel = getDateGroupLabel(photo.timestamp);
            if (!photosByDate[dateLabel]) {
                photosByDate[dateLabel] = [];
            }
            photosByDate[dateLabel].push(photo);
        });
        
        // 按日期顺序排序分组（今天、昨天、前天...）
        const dateOrder = ['今天', '昨天', '前天'];
        const sortedDates = Object.keys(photosByDate).sort((a, b) => {
            const aIndex = dateOrder.indexOf(a);
            const bIndex = dateOrder.indexOf(b);
            
            if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex;
            }
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            
            // 其他日期按时间倒序
            return b.localeCompare(a);
        });
        
        // 生成HTML
        let sectionsHTML = '';
        sortedDates.forEach(dateLabel => {
            const photos = photosByDate[dateLabel];
            const photosHTML = photos.map(photo => {
                // 判断是否为仅文字模式
                if (photo.textOnly || !photo.imageUrl) {
                    // 仅文字模式：显示描述卡片
                    return `
                        <div class="photo-item photo-text-only" data-photo-id="${photo.id}">
                            <div class="photo-text-card">
                                <div class="photo-text-icon">📝</div>
                                <div class="photo-text-desc">${escapeHtml(photo.description)}</div>
                                <div class="photo-text-time">${photo.time}</div>
                            </div>
                        </div>
                    `;
                }
                
                // 图片模式：显示图片
                const imageUrl = photo.imageUrl;
                const fallbackUrlsAttr = photo.fallbackUrls ? JSON.stringify(photo.fallbackUrls).replace(/"/g, '&quot;') : '[]';
                
                return `
                    <div class="photo-item" data-photo-id="${photo.id}">
                        <img src="${imageUrl}"
                             alt="${photo.description}"
                             class="photo-item-image"
                             loading="lazy"
                             data-fallback-urls="${fallbackUrlsAttr}"
                             data-fallback-index="0"
                             onerror="handleImageError(this)">
                        <div class="photo-item-overlay">
                            <div class="photo-item-time">${photo.time}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            sectionsHTML += `
                <div class="photos-section">
                    <div class="photos-section-header">${dateLabel}</div>
                    <div class="photos-grid">${photosHTML}</div>
                </div>
            `;
        });
        
        console.log('渲染照片网格，总数:', currentPhotos.length);
        console.log('第一张照片数据:', currentPhotos[0]);
        
        content.innerHTML = sectionsHTML;
        
        // 绑定点击事件
        content.querySelectorAll('.photo-item').forEach(item => {
            item.addEventListener('click', () => {
                const photoId = parseInt(item.dataset.photoId);
                openPhotoDetail(photoId);
            });
        });
    }

    // 打开照片详情
    function openPhotoDetail(photoId) {
        const photo = currentPhotos.find(p => p.id === photoId);
        if (!photo) return;
        
        const detailPage = document.getElementById('photo-detail-page');
        const detailContent = document.getElementById('photo-detail-content');
        
        if (!detailPage || !detailContent) return;
        
        // 构建备选URL的data属性
        const fallbackUrlsAttr = photo.fallbackUrls ? JSON.stringify(photo.fallbackUrls).replace(/"/g, '&quot;') : '[]';
        
        detailContent.innerHTML = `
            <div class="photo-detail-image-container">
                <img src="${photo.imageUrl}"
                     alt="${photo.description}"
                     class="photo-detail-image"
                     data-fallback-urls="${fallbackUrlsAttr}"
                     data-fallback-index="0"
                     onerror="handleImageError(this)">
            </div>
            <div class="photo-detail-description">
                <div class="photo-detail-description-label">描述</div>
                <div class="photo-detail-description-text">${photo.description}</div>
                <div class="photo-detail-time">${photo.time}</div>
            </div>
        `;
        
        detailPage.classList.add('show');
    }

    // 显示相册页面
    function showPhotos() {
        const photosPage = document.getElementById('iphone-photos-page');
        if (photosPage) {
            photosPage.classList.add('show');
            
            // 尝试从localStorage加载已保存的照片
            if (currentPhotos.length === 0) {
                const loaded = loadPhotosFromStorage();
                if (loaded && currentPhotos.length > 0) {
                    console.log('✅ 从localStorage加载了已保存的照片');
                    renderPhotosGrid();
                }
            } else {
                // 如果已有数据，直接渲染
                renderPhotosGrid();
            }
        }
    }

    // 隐藏相册页面
    function hidePhotos() {
        const photosPage = document.getElementById('iphone-photos-page');
        if (photosPage) {
            photosPage.classList.remove('show');
        }
    }

    // 隐藏详情页
    function hidePhotoDetail() {
        const detailPage = document.getElementById('photo-detail-page');
        if (detailPage) {
            detailPage.classList.remove('show');
        }
    }

    // 图片加载错误处理（全局函数，供onerror调用）
    window.handleImageError = function(img) {
        console.warn('图片加载失败，尝试备选URL:', img.src);
        
        try {
            const fallbackUrls = JSON.parse(img.getAttribute('data-fallback-urls') || '[]');
            const currentIndex = parseInt(img.getAttribute('data-fallback-index') || '0');
            
            if (currentIndex < fallbackUrls.length) {
                // 尝试下一个备选URL
                const nextUrl = fallbackUrls[currentIndex];
                console.log(`尝试备选URL [${currentIndex + 1}/${fallbackUrls.length}]:`, nextUrl);
                
                img.setAttribute('data-fallback-index', (currentIndex + 1).toString());
                img.src = nextUrl;
            } else {
                // 所有备选都失败，显示占位图
                console.error('所有图片源都失败，显示占位图');
                img.style.backgroundColor = '#f0f0f0';
                img.style.display = 'flex';
                img.style.alignItems = 'center';
                img.style.justifyContent = 'center';
                img.alt = '图片加载失败';
                
                // 使用SVG占位图
                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="800"%3E%3Crect fill="%23f0f0f0" width="800" height="800"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="24"%3E图片加载失败%3C/text%3E%3C/svg%3E';
                img.onerror = null; // 防止无限循环
            }
        } catch (error) {
            console.error('处理图片错误时出错:', error);
            img.style.backgroundColor = '#f0f0f0';
            img.onerror = null;
        }
    };

    // 初始化
    function init() {
        const checkInterval = setInterval(() => {
            const screen = document.querySelector('.iphone-screen');
            if (screen) {
                clearInterval(checkInterval);
                createPhotosPage();
                
                setTimeout(() => {
                    const appIcons = document.querySelectorAll('.app-icon');
                    if (appIcons[1]) { // 第二个是相机
                        appIcons[1].addEventListener('click', (e) => {
                            e.stopPropagation();
                            showPhotos();
                        });
                    }
                }, 500);
            }
        }, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.iPhonePhotos = {
        show: showPhotos,
        hide: hidePhotos
    };

})();