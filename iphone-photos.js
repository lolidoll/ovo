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
                                <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                                    <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                                </svg>
                                相册
                            </button>
                            <div class="photos-title">相册</div>
                            <button class="photos-generate-btn" id="photos-generate-btn">生成</button>
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
                <div class="photo-detail-header">
                    <button class="photo-detail-close-btn" id="photo-detail-close-btn">完成</button>
                </div>
                <div class="photo-detail-content" id="photo-detail-content"></div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', photosHTML);
            initializePhotosEvents();
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
                <div class="photos-loading-text">正在生成照片...</div>
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
            const prompt = `你是${currentCharacter.name}，这是你的手机相册。请生成15张照片的描述。

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${currentCharacter.card}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}
${summariesText}
${messagesText}

要求：
1. 与${currentCharacter.userName}相关的照片（约5-7张）
2. 角色日常生活相关（约5-7张）
3. 结合世界观和现实（约3-4张）
4. 每张照片描述50-80字
5. 要有真实感和活人感，像真实拍摄的照片
6. 描述要具体，包含场景、人物、情感、细节
7. 必须生成15张，不能少

直接返回JSON数组，不要任何说明文字或markdown标记：
[{"description":"照片描述1"},{"description":"照片描述2"},...]`;
            
            console.log('完整提示词:', prompt);
            console.log('========================');

            const response = await callMainAPI(prompt);
            const photosData = parsePhotosResponse(response);
            
            // 生成模拟的时间分布（最近3天内）
            const now = Date.now();
            const timeOffsets = [
                // 2-3张刚拍摄（0-30分钟前）
                ...Array.from({length: 2}, () => Math.floor(Math.random() * 30 * 60 * 1000)),
                ...Array.from({length: 1}, () => Math.floor(Math.random() * 30 * 60 * 1000)),
                // 3-4张今天拍摄（1-12小时前）
                ...Array.from({length: 4}, () => 60 * 60 * 1000 + Math.floor(Math.random() * 11 * 60 * 60 * 1000)),
                // 4-5张昨天拍摄（24-36小时前）
                ...Array.from({length: 5}, () => 24 * 60 * 60 * 1000 + Math.floor(Math.random() * 12 * 60 * 60 * 1000)),
                // 3-4张前天拍摄（48-60小时前）
                ...Array.from({length: 3}, () => 48 * 60 * 60 * 1000 + Math.floor(Math.random() * 12 * 60 * 60 * 1000))
            ];
            
            // 打乱时间偏移顺序
            timeOffsets.sort(() => Math.random() - 0.5);
            
            currentPhotos = photosData.map((photo, index) => {
                const photoTime = new Date(now - timeOffsets[index]);
                return {
                    id: Date.now() + index,
                    description: photo.description,
                    time: formatTime(photoTime),
                    timestamp: photoTime.getTime()
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
                // 检查是否是同一角色
                if (data.character && data.character.name === getCurrentCharacter().name) {
                    currentPhotos = data.photos || [];
                    currentCharacter = data.character;
                    return true;
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

    // 渲染照片网格
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
        
        const photosHTML = currentPhotos.map(photo => `
            <div class="photo-item" data-photo-id="${photo.id}">
                <div class="photo-item-text">${photo.description}</div>
                ${photo.time ? `<div class="photo-item-time">${photo.time}</div>` : ''}
            </div>
        `).join('');
        
        content.innerHTML = `<div class="photos-grid">${photosHTML}</div>`;
        
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
        
        detailContent.innerHTML = `
            <div class="photo-detail-card">
                <div class="photo-detail-text">${photo.description}</div>
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