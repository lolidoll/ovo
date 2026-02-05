/**
 * iPhone 浏览器应用 - iOS Safari 风格
 * 调用主API生成角色相关的浏览器搜索历史和收藏
 */

(function() {
    'use strict';

    let currentBrowserData = null;
    let currentCharacter = null;
    let isGenerating = false;

    // 创建浏览器页面HTML
    function createBrowserPage() {
        const browserHTML = `
            <div class="iphone-browser-page" id="iphone-browser-page">
                <div class="browser-header">
                    <button class="browser-back-btn" id="browser-back-btn">
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        Safari
                    </button>
                    <h1 class="browser-title">Safari</h1>
                    <button class="browser-generate-btn" id="browser-generate-btn">生成</button>
                </div>
                
                <div class="browser-content" id="browser-content">
                    <div class="browser-empty">
                        <div class="browser-empty-icon">🧭</div>
                        <div class="browser-empty-text">暂无浏览记录</div>
                        <div class="browser-empty-hint">点击右上角"生成"按钮<br>创建角色的浏览器记录</div>
                    </div>
                </div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', browserHTML);
            initializeBrowserEvents();
        }
    }

    // 初始化事件监听
    function initializeBrowserEvents() {
        const backBtn = document.getElementById('browser-back-btn');
        const generateBtn = document.getElementById('browser-generate-btn');
        
        if (backBtn) {
            backBtn.addEventListener('click', hideBrowserPage);
        }
        
        if (generateBtn) {
            generateBtn.addEventListener('click', generateBrowserData);
        }
    }

    // 显示浏览器页面
    function showBrowserPage() {
        const browserPage = document.getElementById('iphone-browser-page');
        if (!browserPage) {
            createBrowserPage();
        }
        
        const page = document.getElementById('iphone-browser-page');
        if (page) {
            page.classList.add('show');
        }
        
        // 隐藏主屏幕
        const homeScreen = document.querySelector('.home-screen');
        if (homeScreen) {
            homeScreen.style.display = 'none';
        }
    }

    // 隐藏浏览器页面
    function hideBrowserPage() {
        const browserPage = document.getElementById('iphone-browser-page');
        if (browserPage) {
            browserPage.classList.remove('show');
        }
        
        // 显示主屏幕
        const homeScreen = document.querySelector('.home-screen');
        if (homeScreen) {
            homeScreen.style.display = 'block';
        }

        // 同时隐藏详情页
        const detailPage = document.getElementById('iphone-browser-detail-page');
        if (detailPage) {
            detailPage.classList.remove('show');
        }
    }

    // 生成浏览器数据
    async function generateBrowserData() {
        if (isGenerating) {
            return;
        }

        // 获取当前角色信息
        const characterInfo = getCurrentCharacterInfo();
        if (!characterInfo) {
            showToast('请先在聊天页面打开一个角色对话');
            return;
        }

        isGenerating = true;
        const generateBtn = document.getElementById('browser-generate-btn');
        if (generateBtn) {
            generateBtn.classList.add('generating');
            generateBtn.textContent = '生成中...';
        }

        // 显示加载状态
        showLoadingState();

        try {
            // 调用主API生成浏览器数据
            const browserData = await callMainAPIForBrowser(characterInfo);
            
            if (browserData) {
                currentBrowserData = browserData;
                currentCharacter = characterInfo;
                renderBrowserData(browserData);
            }
        } catch (error) {
            console.error('生成浏览器数据失败:', error);
            showErrorState(error.message || '生成失败，请重试');
        } finally {
            isGenerating = false;
            if (generateBtn) {
                generateBtn.classList.remove('generating');
                generateBtn.textContent = '生成';
            }
        }
    }

    // 获取当前角色信息
    function getCurrentCharacterInfo() {
        // 从全局AppState获取当前聊天角色
        if (!window.AppState || !window.AppState.currentChat) {
            return null;
        }

        const currentChat = window.AppState.currentChat;
        const convId = currentChat.id;
        
        // 获取角色设定
        const characterName = currentChat.name || '角色';
        const characterAvatar = currentChat.avatar || '';
        
        // 获取角色设定（从conversation对象中）
        let characterSetting = '';
        const conversation = window.AppState.conversations.find(c => c.id === convId);
        if (conversation && conversation.characterSetting) {
            characterSetting = conversation.characterSetting;
        }
        
        // 获取用户设定
        let userSetting = '';
        if (conversation && conversation.userSetting) {
            userSetting = conversation.userSetting;
        }
        
        // 获取用户名称
        const userName = window.AppState.user?.name || '用户';
        
        // 获取最近50条对话
        const messages = window.AppState.messages[convId] || [];
        const recentMessages = messages.slice(-50);
        
        return {
            convId,
            characterName,
            characterAvatar,
            characterSetting,
            userName,
            userSetting,
            recentMessages
        };
    }

    // 调用主API生成浏览器数据
    async function callMainAPIForBrowser(characterInfo) {
        // 检查API配置
        if (!window.MainAPIManager || !window.AppState.apiSettings) {
            throw new Error('API未配置');
        }

        const api = window.AppState.apiSettings;
        if (!api.endpoint || !api.selectedModel) {
            throw new Error('请先配置API端点和模型');
        }

        // 构建对话历史摘要
        let conversationSummary = '';
        if (characterInfo.recentMessages && characterInfo.recentMessages.length > 0) {
            conversationSummary = characterInfo.recentMessages
                .map(msg => {
                    const sender = msg.sender === 'user' ? characterInfo.userName : characterInfo.characterName;
                    return `${sender}: ${msg.content}`;
                })
                .join('\n');
        }

        // 构建提示词
        const prompt = `你是一个创意十足的AI助手，现在需要为角色"${characterInfo.characterName}"生成最近的浏览器搜索历史和收藏记录。

【角色信息】
角色名称: ${characterInfo.characterName}
角色设定: ${characterInfo.characterSetting || '无'}

【用户信息】
用户名称: ${characterInfo.userName}
用户设定: ${characterInfo.userSetting || '无'}

【最近对话】
${conversationSummary || '暂无对话记录'}

【任务要求】
请根据以上信息，生成一个真实、详细、有活人感的浏览器记录。想象这是角色真实的手机Safari浏览器，他/她会搜索什么？访问什么网站？收藏什么内容？

要求：
1. 生成8-12个收藏夹网站（快速访问）
2. 生成10-15条搜索历史记录
3. 每个网站/搜索包含：标题、URL、网站图标emoji、访问时间、分类（收藏/历史）
4. 可以选择几个重要的网站/搜索提供详细内容预览
5. 浏览内容要符合角色的性格、身份、生活场景、职业背景、兴趣爱好
6. 要有生活气息和真实感，比如：
   - 工作：行业资讯、专业技能学习、工作相关工具
   - 生活：美食推荐、购物网站、旅游攻略、娱乐资讯
   - 社交：微博、B站、小红书、抖音等
   - 工具：天气、地图、翻译、计算器等
   - 其他：根据角色设定生成的个性化内容
7. 时间要合理（最近几天内），按时间倒序排列
8. 发挥你的创意与想象，让浏览记录仿佛真的是角色手机一样，有活人感

【网站分类参考】
- 社交媒体：微博、微信、小红书、抖音、B站等
- 购物：淘宝、京东、拼多多等
- 娱乐：优酷、爱奇艺、腾讯视频等
- 新闻：新浪、网易、搜狐等
- 工作：钉钉、飞书、专业网站等
- 工具：百度、谷歌、翻译、天气等
- 其他：根据角色性格定制

【输出格式】
请严格按照以下JSON格式输出，不要有任何其他文字：

{
  "favorites": [
    {
      "id": "fav_1",
      "title": "淘宝",
      "url": "https://www.taobao.com",
      "icon": "🛒",
      "category": "购物"
    }
  ],
  "history": [
    {
      "id": "hist_1",
      "title": "如何做红烧肉",
      "url": "https://www.xiaohongshu.com/explore/123456",
      "icon": "📕",
      "time": "今天 14:30",
      "domain": "xiaohongshu.com",
      "hasDetail": true
    }
  ],
  "webpages": [
    {
      "id": "wp_1",
      "historyId": "hist_1",
      "title": "红烧肉的做法 - 小红书",
      "domain": "xiaohongshu.com",
      "icon": "📕",
      "date": "今天 14:30",
      "content": "红烧肉是中华传统名菜，色泽金黄，肥而不腻。制作方法：1. 五花肉切块，焯水去腥...\\n\\n材料：五花肉500g、生抽、老抽、料酒、冰糖等。"
    }
  ]
}

注意：
- favorites: 快速访问的收藏夹（网格展示）
- history: 搜索和浏览历史记录（列表展示）
- webpages: 可点击查看详细内容的页面内容预览
- icon使用emoji表示网站图标
- 可以使用中文网站名让内容更真实
- 根据角色设定生成符合他/她兴趣的浏览内容`;

        // 调用API
        const baseEndpoint = window.APIUtils.normalizeEndpoint(api.endpoint);
        const apiKey = api.apiKey || '';

        const requestBody = {
            model: api.selectedModel,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.95,
            max_tokens: 4000
        };

        const response = await fetch(baseEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        // 解析JSON
        try {
            // 尝试提取JSON（可能包含在代码块中）
            let jsonStr = content;
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }
            
            const browserData = JSON.parse(jsonStr);
            return browserData;
        } catch (e) {
            console.error('解析API返回的JSON失败:', e);
            console.log('原始内容:', content);
            throw new Error('生成的数据格式错误');
        }
    }

    // 显示加载状态
    function showLoadingState() {
        const content = document.getElementById('browser-content');
        if (content) {
            content.innerHTML = `
                <div class="browser-loading">
                    <div class="browser-loading-spinner"></div>
                    <div class="browser-loading-text">正在生成浏览记录...</div>
                </div>
            `;
        }
    }

    // 显示错误状态
    function showErrorState(message) {
        const content = document.getElementById('browser-content');
        if (content) {
            content.innerHTML = `
                <div class="browser-empty">
                    <div class="browser-empty-icon">⚠️</div>
                    <div class="browser-empty-text">生成失败</div>
                    <div class="browser-empty-hint">${message}</div>
                </div>
            `;
        }
    }

    // 渲染浏览器数据
    function renderBrowserData(data) {
        const content = document.getElementById('browser-content');
        if (!content) return;

        let html = '';

        // 渲染收藏夹
        if (data.favorites && data.favorites.length > 0) {
            html += '<div class="browser-favorites-grid">';
            data.favorites.forEach(fav => {
                html += `
                    <div class="browser-favorite-item" data-fav-id="${fav.id}">
                        <div class="browser-favorite-icon">${fav.icon || '🌐'}</div>
                        <div class="browser-favorite-name">${escapeHtml(fav.title)}</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // 渲染搜索历史
        if (data.history && data.history.length > 0) {
            html += '<div class="browser-history-section">';
            html += '<div class="browser-section-title">最近访问</div>';
            html += '<div class="browser-history-list">';
            
            data.history.forEach(hist => {
                html += `
                    <div class="browser-history-item" data-hist-id="${hist.id}" data-has-detail="${hist.hasDetail || false}">
                        <div class="browser-history-favicon">${hist.icon || '🌐'}</div>
                        <div class="browser-history-content">
                            <div class="browser-history-title">${escapeHtml(hist.title)}</div>
                            <div class="browser-history-url">${escapeHtml(hist.domain || hist.url)}</div>
                        </div>
                        <div class="browser-history-time">${escapeHtml(hist.time)}</div>
                    </div>
                `;
            });
            
            html += '</div></div>';
        }

        content.innerHTML = html;

        // 添加点击事件 - 收藏夹
        const favoriteItems = content.querySelectorAll('.browser-favorite-item');
        favoriteItems.forEach(item => {
            item.addEventListener('click', function() {
                const favId = this.getAttribute('data-fav-id');
                const favorite = data.favorites.find(f => f.id === favId);
                if (favorite) {
                    showWebpageDetail(favorite, '收藏');
                }
            });
        });

        // 添加点击事件 - 历史记录
        const historyItems = content.querySelectorAll('.browser-history-item');
        historyItems.forEach(item => {
            item.addEventListener('click', function() {
                const histId = this.getAttribute('data-hist-id');
                const history = data.history.find(h => h.id === histId);
                if (history) {
                    if (history.hasDetail) {
                        // 查找对应的网页详情
                        const webpage = data.webpages?.find(w => w.historyId === histId);
                        if (webpage) {
                            showWebpageDetail(webpage, '历史');
                        }
                    } else {
                        // 没有详情，显示基本信息
                        showWebpageDetail(history, '历史');
                    }
                }
            });
        });
    }

    // 显示网页详情
    function showWebpageDetail(pageData, sourceType) {
        // 创建详情页面
        let detailPage = document.getElementById('iphone-browser-detail-page');
        if (!detailPage) {
            detailPage = document.createElement('div');
            detailPage.id = 'iphone-browser-detail-page';
            detailPage.className = 'browser-detail-page';
            document.querySelector('.iphone-screen').appendChild(detailPage);
        }

        // 构建网页内容
        let contentHtml = '';
        if (pageData.content) {
            // 格式化内容为段落
            const paragraphs = pageData.content.split('\n\n').filter(p => p.trim());
            contentHtml = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
        } else {
            contentHtml = '<p>点击访问此网页...</p>';
        }

        detailPage.innerHTML = `
            <div class="browser-detail-header">
                <div class="browser-detail-top">
                    <button class="browser-detail-back-btn" id="browser-detail-back-btn">
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        完成
                    </button>
                    <div class="browser-detail-url-bar">
                        <svg class="browser-detail-lock" viewBox="0 0 16 16">
                            <path d="M8 1a3 3 0 0 0-3 3v1H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2V4a3 3 0 0 0-3-3zm0 2a1 1 0 0 1 1 1v1H7V4a1 1 0 0 1 1-1z"/>
                        </svg>
                        <div class="browser-detail-url">${escapeHtml(pageData.url || pageData.domain)}</div>
                    </div>
                </div>
                <div class="browser-toolbar">
                    <button class="browser-toolbar-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                    </button>
                    <button class="browser-toolbar-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-6l-2-2H6c-1.1 0-2 .9-2 2z"/>
                        </svg>
                    </button>
                    <button class="browser-toolbar-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 8v8M8 12h8"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="browser-detail-content" id="browser-detail-content">
                <h1 class="browser-webpage-title">${escapeHtml(pageData.title)}</h1>
                <div class="browser-webpage-meta">
                    <div class="browser-webpage-favicon">${pageData.icon || '🌐'}</div>
                    <div class="browser-webpage-domain">${escapeHtml(pageData.domain || pageData.url)}</div>
                    ${pageData.date ? `<div class="browser-webpage-date">${escapeHtml(pageData.date)}</div>` : ''}
                </div>
                <div class="browser-webpage-body">
                    ${contentHtml}
                </div>
            </div>
        `;

        detailPage.classList.add('show');

        // 添加返回按钮事件
        const backBtn = detailPage.querySelector('#browser-detail-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                detailPage.classList.remove('show');
            });
        }
    }

    // HTML转义
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Toast提示
    function showToast(message) {
        if (window.showToast) {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    // 导出到全局
    window.iPhoneBrowser = {
        show: showBrowserPage,
        hide: hideBrowserPage,
        generate: generateBrowserData
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ iPhone浏览器模块已加载');
        });
    } else {
        console.log('✅ iPhone浏览器模块已加载');
    }

})();