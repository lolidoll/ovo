/**
 * iPhone 浏览器应用 - iOS Safari 风格
 * 调用主API生成角色相关的浏览器搜索历史和收藏
 */

(function() {
    'use strict';

    let currentBrowserData = null;
    let currentCharacter = null;
    let isGenerating = false;
    
    // 数据持久化存储key前缀
    const STORAGE_KEY_PREFIX = 'browser_data_';

    // 创建浏览器页面HTML
    function createBrowserPage() {
        const browserHTML = `
            <div class="iphone-browser-page" id="iphone-browser-page">
                <div class="browser-header">
                    <button class="browser-back-btn" id="browser-back-btn">
                        <i class="fa fa-arrow-left"></i>
                    </button>
                    <div class="browser-title">Safari</div>
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

    // 显示浏览器页面（添加数据加载）
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
        
        // 尝试加载已保存的数据
        const characterInfo = getCurrentCharacterInfo();
        if (characterInfo && characterInfo.convId) {
            const savedData = loadBrowserData(characterInfo.convId);
            if (savedData) {
                console.log('✅ 加载已保存的浏览器数据');
                currentBrowserData = savedData;
                currentCharacter = characterInfo;
                renderBrowserData(savedData);
            }
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
                
                // 保存数据到localStorage
                saveBrowserData(characterInfo.convId, browserData);
                console.log('✅ 浏览器数据已保存');
                
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

    // 获取当前角色信息（参考备忘录实现）
    function getCurrentCharacterInfo() {
        // 从全局AppState获取当前聊天角色
        if (!window.AppState || !window.AppState.currentChat) {
            console.log('❌ 未找到AppState或currentChat');
            return null;
        }

        const currentChat = window.AppState.currentChat;
        const convId = currentChat.id;
        
        console.log('📱 正在获取角色信息，对话ID:', convId);
        
        // 获取conversation对象
        const conversation = window.AppState.conversations.find(c => c.id === convId);
        if (!conversation) {
            console.log('❌ 未找到对话对象');
            return null;
        }
        
        // 获取角色名称
        const characterName = conversation.name || '角色';
        
        // 获取角色设定
        const characterSetting = conversation.characterSetting || conversation.characterCard || '';
        
        // 获取用户名称（重要！使用userNameForChar）
        const userName = conversation.userNameForChar || window.AppState.user?.name || '用户';
        
        // 获取用户设定（重要！使用userPersonality）
        const userSetting = conversation.userPersonality || '';
        
        // 获取历史总结（重要！）
        const summaries = conversation.summaries || [];
        const latestSummary = summaries.length > 0 ? summaries[summaries.length - 1] : '';
        
        // 获取最近50条对话
        const messages = window.AppState.messages[convId] || [];
        const recentMessages = messages.slice(-50);
        
        console.log('✅ 角色信息获取成功:', {
            convId,
            characterName,
            userName,
            hasSummary: !!latestSummary,
            messageCount: recentMessages.length
        });
        
        return {
            convId,
            characterName,
            characterSetting,
            userName,
            userSetting,
            summaries,
            latestSummary,
            recentMessages
        };
    }

    // 调用主API生成浏览器数据（参考备忘录实现）
    async function callMainAPIForBrowser(characterInfo) {
        console.log('🚀 开始调用API生成浏览器数据');
        
        // 检查API配置
        if (!window.AppState.apiSettings) {
            throw new Error('API未配置');
        }

        const api = window.AppState.apiSettings;
        if (!api.endpoint || !api.selectedModel) {
            throw new Error('请先配置API端点和模型');
        }

        console.log('✅ API配置检查通过');

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
        
        console.log('✅ 对话摘要构建完成，消息数:', characterInfo.recentMessages?.length || 0);

        // 构建提示词（包含历史总结）
        const prompt = `你是一个创意十足的AI助手，现在需要为角色"${characterInfo.characterName}"生成最近的浏览器搜索历史和收藏记录。

【角色信息】
角色名称: ${characterInfo.characterName}
角色设定: ${characterInfo.characterSetting || '无'}

【用户信息】
用户名称: ${characterInfo.userName}
用户设定: ${characterInfo.userSetting || '无'}

【历史总结】
${characterInfo.latestSummary || '暂无历史总结'}

【最近对话】
${conversationSummary || '暂无对话记录'}

【任务要求】
请根据以上信息，生成一个真实、详细、有活人感的浏览器记录。想象这是角色真实的手机Safari浏览器，他/她会搜索什么？访问什么网站？收藏什么内容？注意部分内容要与用户有关。

要求：
1. 生成4-6个收藏夹网站（快速访问）
2. 生成5-8条搜索历史记录
3. 每个网站/搜索包含：标题、URL、网站图标emoji、访问时间、分类（收藏/历史）
4. 为所有收藏网站和搜索历史都生成详细内容（webpages数组要包含所有favorites和history的详细页面）
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
- 成人向/擦边内容：根据角色性格可以适度包含一些成人向内容，比如：
  * 情趣用品购物网站
  * 成人漫画/小说平台
  * 约会交友软件
  * 深夜档影视内容
  * 擦边写真/ASMR等
  注意：这些内容要自然融入，不要过于突兀，要符合角色性格和生活情境
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
      "category": "购物",
      "hasDetail": true
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
      "content": "红烧肉是中华传统名菜，色泽金黄，肥而不腻。制作方法：1. 五花肉切块，焯水去腥...\\n\\n材料：五花肉500g、生抽、老抽、料酒、冰糖等。",
      "thought": "看着这道菜的做法，不禁想起了上次尝试做红烧肉的场景。虽然有点麻烦，但如果能做出这样色香味俱全的红烧肉，应该会很有成就感吧。下次周末可以试试看..."
    }
  ]
}

注意：
- favorites: 快速访问的收藏夹（网格展示），4-6个即可，每个都要有hasDetail: true
- history: 搜索和浏览历史记录（列表展示），5-8条即可，每个都要有hasDetail: true
- webpages: 必须为每一个favorites和history都生成详细内容（数量应等于favorites + history的总数）
- 每个webpage通过id对应到相应的favorite或history记录（使用favoriteId或historyId）
- icon使用emoji表示网站图标
- 可以使用中文网站名让内容更真实
- 根据角色设定生成符合他/她兴趣的浏览内容
- 可以适度包含成人向/擦边内容，让浏览记录更真实自然（真实的人手机里都会有这类浏览记录）
- 成人向内容要处理得自然、不突兀，符合角色性格和生活情境
- 【重要】webpages中的content必须是完整详细的文章内容，不是预览或摘要！
  * 就像真实的网页文章一样完整
  * 可以包含段落、小标题、列表等
- 【重要】每个webpage必须包含独立的"thought"字段，描述角色看到这个网页内容时的内心想法、感受、联想、打算等，让内容更有沉浸感和真实感。这部分要符合角色性格，有活人感，可以包括：
  * 看到内容时的第一反应
  * 联想到的相关经历或记忆
  * 对内容的评价或看法
  * 接下来的打算或行动
  * 内心的情绪变化
  发挥你的创意，让这部分读起来就像角色真的在用手机浏览一样
- content字段只包含网页正文内容，不要包含角色想法
- thought字段单独存放角色的内心想法`;

        console.log('✅ 提示词构建完成');

        // 规范化API端点（参考备忘录）
        const baseEndpoint = api.endpoint.replace(/\/+$/, '');
        const endpoint = baseEndpoint + '/v1/chat/completions';
        const apiKey = api.apiKey || '';

        console.log('🌐 API端点:', endpoint);

        const requestBody = {
            model: api.selectedModel,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.95,
            max_tokens: 10000
        };

        // 添加超时控制（5分钟）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            console.log('⏰ API请求超时');
        }, 300000); // 5分钟超时

        try {
            console.log('📡 发送API请求...');
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API请求失败:', response.status, errorText);
                throw new Error(`API请求失败: ${response.status}`);
            }

            console.log('✅ API请求成功');

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';
            
            console.log('📄 API返回内容长度:', content.length);
            
            // 解析JSON
            let jsonStr = ''; // 在外部定义，方便错误处理时访问
            try {
                jsonStr = content.trim();
                
                // 尝试多种方式提取JSON
                // 1. 尝试匹配 ```json ... ```
                let jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    jsonStr = jsonMatch[1].trim();
                    console.log('✅ 从```json代码块中提取JSON');
                } else {
                    // 2. 尝试匹配 ``` ... ```
                    jsonMatch = jsonStr.match(/```\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        jsonStr = jsonMatch[1].trim();
                        console.log('✅ 从```代码块中提取JSON');
                    } else {
                        // 3. 尝试直接查找JSON对象 { ... }
                        jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            jsonStr = jsonMatch[0];
                            console.log('✅ 直接提取JSON对象');
                        }
                    }
                }
                
                console.log('🔍 准备解析的JSON字符串（前200字符）:', jsonStr.substring(0, 200));
                console.log('🔍 JSON字符串总长度:', jsonStr.length);
                
                const browserData = JSON.parse(jsonStr);
                console.log('✅ JSON解析成功，包含', Object.keys(browserData).length, '个键');
                return browserData;
            } catch (e) {
                console.error('❌ 解析API返回的JSON失败:', e);
                console.error('错误位置:', e.message);
                console.log('📄 原始内容前500字符:', content.substring(0, 500));
                console.log('📄 尝试解析的字符串前500字符:', jsonStr.substring(0, 500));
                console.log('📄 尝试解析的字符串后500字符:', jsonStr.substring(jsonStr.length - 500));
                throw new Error('生成的数据格式错误，请重试');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请重试');
            }
            throw error;
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
                    if (favorite.hasDetail) {
                        // 查找对应的网页详情
                        const webpage = data.webpages?.find(w => w.favoriteId === favId);
                        if (webpage) {
                            showWebpageDetail(webpage, '收藏');
                        } else {
                            // 没有找到详情，显示基本信息
                            showWebpageDetail(favorite, '收藏');
                        }
                    } else {
                        // 没有详情，显示基本信息
                        showWebpageDetail(favorite, '收藏');
                    }
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
                ${pageData.thought ? `
                <div class="browser-thought-section">
                    <div class="browser-thought-header">
                        <span class="browser-thought-icon">💭</span>
                        <span class="browser-thought-title">TA此刻的想法</span>
                    </div>
                    <div class="browser-thought-content">
                        ${escapeHtml(pageData.thought)}
                    </div>
                </div>
                ` : ''}
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

    // 保存浏览器数据到localStorage
    function saveBrowserData(convId, data) {
        try {
            const storageKey = STORAGE_KEY_PREFIX + convId;
            const storageData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(storageKey, JSON.stringify(storageData));
            console.log('💾 浏览器数据已保存到localStorage');
        } catch (error) {
            console.error('❌ 保存浏览器数据失败:', error);
        }
    }

    // 从localStorage加载浏览器数据
    function loadBrowserData(convId) {
        try {
            const storageKey = STORAGE_KEY_PREFIX + convId;
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                console.log('📂 从localStorage加载浏览器数据');
                return parsed.data;
            }
        } catch (error) {
            console.error('❌ 加载浏览器数据失败:', error);
        }
        return null;
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