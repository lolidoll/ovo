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

    // 获取当前角色信息
    function getCurrentCharacter() {
        const characterName = localStorage.getItem('currentCharacterName') || '角色';
        const characterCard = localStorage.getItem('currentCharacterCard');
        const userName = localStorage.getItem('userName') || '用户';
        const userPersona = localStorage.getItem('userPersona') || '';
        
        return {
            name: characterName,
            card: characterCard ? JSON.parse(characterCard) : null,
            userName: userName,
            userPersona: userPersona
        };
    }

    // 获取最近对话
    function getRecentMessages() {
        const messages = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        return messages.slice(-50);
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
            
            const prompt = `你是${currentCharacter.name}，这是你的手机相册。请根据以下信息生成15张照片的描述：

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${JSON.stringify(currentCharacter.card)}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}

最近对话：
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

要求：
1. 生成15张照片的描述
2. 每张照片描述50-80字
3. 一部分与用户相关（约5-7张）
4. 一部分是角色日常生活（约5-7张）
5. 一部分结合角色世界观和现实（约3-4张）
6. 要有真实感和活人感，像真实拍摄的照片
7. 描述要具体，包含场景、人物、情感、细节

请以JSON数组格式返回，格式：[{"description": "照片描述1"}, {"description": "照片描述2"}, ...]`;

            const response = await callMainAPI(prompt);
            const photosData = parsePhotosResponse(response);
            
            currentPhotos = photosData.map((photo, index) => ({
                id: Date.now() + index,
                description: photo.description
            }));
            
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

    // 调用主API
    async function callMainAPI(prompt) {
        const apiConfig = JSON.parse(localStorage.getItem('apiConfig') || '{}');
        const apiUrl = apiConfig.url || '';
        const apiKey = apiConfig.key || '';
        const model = apiConfig.model || 'gpt-3.5-turbo';
        
        if (!apiUrl || !apiKey) {
            throw new Error('请先配置API设置');
        }
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }

    // 解析照片响应
    function parsePhotosResponse(response) {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            const lines = response.split('\n').filter(line => line.trim());
            return lines.slice(0, 15).map(line => ({
                description: line.replace(/^\d+[\.\、]\s*/, '').replace(/^[-*]\s*/, '').trim()
            }));
        } catch (error) {
            console.error('解析响应失败:', error);
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