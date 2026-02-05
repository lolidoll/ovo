/**
 * iPhone 钱包应用
 * 调用主API生成角色相关的钱包消费记录
 */

(function() {
    'use strict';

    let currentWalletData = null;
    let currentCharacter = null;
    let isGenerating = false;

    // 创建钱包页面HTML
    function createWalletPage() {
        const walletHTML = `
            <div class="iphone-wallet-page" id="iphone-wallet-page">
                <div class="wallet-header">
                    <button class="wallet-back-btn" id="wallet-back-btn">
                        <svg width="13" height="21" viewBox="0 0 13 21" fill="currentColor">
                            <path d="M11.67 1.77L10.26 0.36L0.5 10.13L10.26 19.89L11.67 18.48L3.31 10.13L11.67 1.77Z"/>
                        </svg>
                        钱包
                    </button>
                    <h1 class="wallet-title">钱包</h1>
                    <button class="wallet-generate-btn" id="wallet-generate-btn">生成</button>
                </div>
                
                <div class="wallet-content" id="wallet-content">
                    <div class="wallet-empty">
                        <div class="wallet-empty-icon">💳</div>
                        <div class="wallet-empty-text">暂无钱包数据</div>
                        <div class="wallet-empty-hint">点击右上角"生成"按钮<br>创建角色的钱包记录</div>
                    </div>
                </div>
            </div>
        `;
        
        const screen = document.querySelector('.iphone-screen');
        if (screen) {
            screen.insertAdjacentHTML('beforeend', walletHTML);
            initializeWalletEvents();
        }
    }

    // 初始化事件监听
    function initializeWalletEvents() {
        const backBtn = document.getElementById('wallet-back-btn');
        const generateBtn = document.getElementById('wallet-generate-btn');
        
        if (backBtn) {
            backBtn.addEventListener('click', hideWalletPage);
        }
        
        if (generateBtn) {
            generateBtn.addEventListener('click', generateWalletData);
        }
    }

    // 显示钱包页面
    function showWalletPage() {
        const walletPage = document.getElementById('iphone-wallet-page');
        if (!walletPage) {
            createWalletPage();
        }
        
        const page = document.getElementById('iphone-wallet-page');
        if (page) {
            page.classList.add('show');
        }
        
        // 隐藏主屏幕
        const homeScreen = document.querySelector('.home-screen');
        if (homeScreen) {
            homeScreen.style.display = 'none';
        }
    }

    // 隐藏钱包页面
    function hideWalletPage() {
        const walletPage = document.getElementById('iphone-wallet-page');
        if (walletPage) {
            walletPage.classList.remove('show');
        }
        
        // 显示主屏幕
        const homeScreen = document.querySelector('.home-screen');
        if (homeScreen) {
            homeScreen.style.display = 'block';
        }
    }

    // 生成钱包数据
    async function generateWalletData() {
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
        const generateBtn = document.getElementById('wallet-generate-btn');
        if (generateBtn) {
            generateBtn.classList.add('generating');
            generateBtn.textContent = '生成中...';
        }

        // 显示加载状态
        showLoadingState();

        try {
            // 调用主API生成钱包数据
            const walletData = await callMainAPIForWallet(characterInfo);
            
            if (walletData) {
                currentWalletData = walletData;
                currentCharacter = characterInfo;
                renderWalletData(walletData);
            }
        } catch (error) {
            console.error('生成钱包数据失败:', error);
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

    // 调用主API生成钱包数据
    async function callMainAPIForWallet(characterInfo) {
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
        const prompt = `你是一个创意十足的AI助手，现在需要为角色"${characterInfo.characterName}"生成今日的钱包消费记录。

【角色信息】
角色名称: ${characterInfo.characterName}
角色设定: ${characterInfo.characterSetting || '无'}

【用户信息】
用户名称: ${characterInfo.userName}
用户设定: ${characterInfo.userSetting || '无'}

【最近对话】
${conversationSummary || '暂无对话记录'}

【任务要求】
请根据以上信息，生成一个真实、详细、有活人感的钱包消费记录。想象这是角色真实的手机钱包app，今天会有什么消费？

要求：
1. 生成5-10条今日消费记录
2. 每条记录包含：商户名称、消费金额、消费时间、支付方式（银行卡/支付宝/微信/公交卡/地铁卡等）
3. 消费内容要符合角色的性格、身份、生活习惯
4. 金额要合理，时间要符合逻辑（按时间倒序）
5. 要有生活气息，比如早餐、午餐、咖啡、打车、购物等
6. 可以包含一些有趣的细节，体现角色个性

【输出格式】
请严格按照以下JSON格式输出，不要有任何其他文字：

{
  "cards": [
    {
      "type": "bank-card",
      "name": "中国银行储蓄卡",
      "balance": "12,580.50",
      "number": "**** **** **** 8888",
      "logo": "🏦"
    },
    {
      "type": "alipay",
      "name": "支付宝",
      "balance": "3,256.80",
      "number": "账户余额",
      "logo": "💙"
    },
    {
      "type": "wechat",
      "name": "微信支付",
      "balance": "1,580.00",
      "number": "零钱余额",
      "logo": "💚"
    }
  ],
  "transactions": [
    {
      "title": "星巴克(万达店)",
      "detail": "拿铁咖啡 x1",
      "amount": "-38.00",
      "time": "18:30",
      "type": "expense",
      "icon": "☕",
      "paymentMethod": "支付宝"
    }
  ],
  "stats": {
    "todayExpense": "256.80",
    "todayIncome": "0.00",
    "monthExpense": "3,580.50"
  }
}`;

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
            temperature: 0.9,
            max_tokens: 2000
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
            
            const walletData = JSON.parse(jsonStr);
            return walletData;
        } catch (e) {
            console.error('解析API返回的JSON失败:', e);
            console.log('原始内容:', content);
            throw new Error('生成的数据格式错误');
        }
    }

    // 显示加载状态
    function showLoadingState() {
        const content = document.getElementById('wallet-content');
        if (content) {
            content.innerHTML = `
                <div class="wallet-loading">
                    <div class="wallet-loading-spinner"></div>
                    <div class="wallet-loading-text">正在生成钱包数据...</div>
                </div>
            `;
        }
    }

    // 显示错误状态
    function showErrorState(message) {
        const content = document.getElementById('wallet-content');
        if (content) {
            content.innerHTML = `
                <div class="wallet-empty">
                    <div class="wallet-empty-icon">⚠️</div>
                    <div class="wallet-empty-text">生成失败</div>
                    <div class="wallet-empty-hint">${message}</div>
                </div>
            `;
        }
    }

    // 渲染钱包数据
    function renderWalletData(data) {
        const content = document.getElementById('wallet-content');
        if (!content) return;

        let html = '';

        // 渲染统计卡片
        if (data.stats) {
            html += `
                <div class="wallet-stats">
                    <div class="wallet-stats-row">
                        <div class="wallet-stat-item">
                            <div class="wallet-stat-value">¥${data.stats.todayExpense || '0.00'}</div>
                            <div class="wallet-stat-label">今日支出</div>
                        </div>
                        <div class="wallet-stat-item">
                            <div class="wallet-stat-value">¥${data.stats.todayIncome || '0.00'}</div>
                            <div class="wallet-stat-label">今日收入</div>
                        </div>
                        <div class="wallet-stat-item">
                            <div class="wallet-stat-value">¥${data.stats.monthExpense || '0.00'}</div>
                            <div class="wallet-stat-label">本月支出</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // 渲染卡片
        if (data.cards && data.cards.length > 0) {
            html += '<div class="wallet-cards-container">';
            data.cards.forEach(card => {
                const cardClass = card.type || 'bank-card';
                html += `
                    <div class="wallet-card ${cardClass}">
                        <div class="wallet-card-header">
                            <div class="wallet-card-type">${card.name || '卡片'}</div>
                            <div class="wallet-card-logo">${card.logo || '💳'}</div>
                        </div>
                        <div class="wallet-card-balance">
                            <div class="wallet-card-balance-label">余额</div>
                            <div class="wallet-card-balance-amount">¥${card.balance || '0.00'}</div>
                        </div>
                        <div class="wallet-card-footer">
                            <div class="wallet-card-number">${card.number || ''}</div>
                            ${cardClass === 'bank-card' ? '<div class="wallet-card-chip"></div>' : ''}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // 渲染交易记录
        if (data.transactions && data.transactions.length > 0) {
            html += `
                <div class="wallet-transactions">
                    <h2 class="wallet-section-title">今日交易</h2>
                    <div class="wallet-transaction-list">
            `;
            
            data.transactions.forEach(transaction => {
                const isExpense = transaction.type === 'expense' || transaction.amount.startsWith('-');
                const amountClass = isExpense ? 'expense' : 'income';
                const iconClass = isExpense ? 'expense' : 'income';
                
                html += `
                    <div class="wallet-transaction-item">
                        <div class="wallet-transaction-icon ${iconClass}">
                            ${transaction.icon || (isExpense ? '💸' : '💰')}
                        </div>
                        <div class="wallet-transaction-info">
                            <div class="wallet-transaction-title">${transaction.title || '交易'}</div>
                            <div class="wallet-transaction-detail">${transaction.detail || ''} · ${transaction.paymentMethod || '支付'}</div>
                        </div>
                        <div class="wallet-transaction-amount ${amountClass}">¥${transaction.amount}</div>
                        <div class="wallet-transaction-time">${transaction.time || ''}</div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }

        content.innerHTML = html;
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
    window.iPhoneWallet = {
        show: showWalletPage,
        hide: hideWalletPage,
        generate: generateWalletData
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ iPhone钱包模块已加载');
        });
    } else {
        console.log('✅ iPhone钱包模块已加载');
    }

})();