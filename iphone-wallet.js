/**
 * iPhone 钱包应用
 * 调用主API生成角色相关的钱包消费记录
 */

(function() {
    'use strict';

    let currentWalletData = null;
    let currentCharacter = null;

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
                    <div class="wallet-title">钱包</div>
                    <button class="wallet-generate-btn" id="wallet-generate-btn">生成</button>
                </div>
                
                <div class="wallet-content" id="wallet-content">
                    <div class="wallet-empty">
                        <div class="wallet-empty-icon">💳</div>
                        <div class="wallet-empty-text">暂无钱包数据</div>
                        <div class="wallet-empty-hint">点击右上角"生成"按钮创建钱包记录</div>
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
        // 返回按钮
        const backBtn = document.getElementById('wallet-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', hideWallet);
        }

        // 生成按钮
        const generateBtn = document.getElementById('wallet-generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', generateWalletData);
        }
    }

    // 显示钱包页面
    function showWallet() {
        const walletPage = document.getElementById('iphone-wallet-page');
        if (!walletPage) {
            createWalletPage();
        }
        
        const page = document.getElementById('iphone-wallet-page');
        if (page) {
            page.classList.add('show');
            
            // 尝试加载已保存的钱包数据
            if (!currentWalletData) {
                if (loadWalletFromStorage()) {
                    renderWalletData(currentWalletData);
                }
            }
        }
        
        // 隐藏主屏幕
        const homeScreen = document.querySelector('.home-screen');
        if (homeScreen) {
            homeScreen.style.display = 'none';
        }
    }

    // 隐藏钱包页面
    function hideWallet() {
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
        const generateBtn = document.getElementById('wallet-generate-btn');
        const content = document.getElementById('wallet-content');
        
        if (!content || !generateBtn) return;
        
        generateBtn.disabled = true;
        
        // 显示加载状态
        content.innerHTML = `
            <div class="wallet-loading">
                <div class="wallet-loading-spinner"></div>
                <div class="wallet-loading-text">正在生成钱包数据...</div>
            </div>
        `;
        
        try {
            currentCharacter = getCurrentCharacter();
            const recentMessages = getRecentMessages();
            
            console.log('===== 调试提示词构建 =====');
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
                        const role = m.role === 'user' ? currentCharacter.userName : currentCharacter.name;
                        return `${role}: ${m.content}`;
                    }).join('\n');
            }
            
            // 构建提示词 - 要求返回纯JSON，不要任何其他内容
            const prompt = `你是${currentCharacter.name}，请生成真实的钱包数据，包括卡片信息和今日交易记录。

角色信息：
- 角色名：${currentCharacter.name}
- 用户名：${currentCharacter.userName}
${currentCharacter.card ? `- 角色设定：${currentCharacter.card}` : ''}
${currentCharacter.userPersona ? `- 用户设定：${currentCharacter.userPersona}` : ''}
${summariesText}
${messagesText}

要求：
1. 生成3-5张卡片（银行卡、支付宝、微信、公交卡等）
2. 生成8-12条今日交易记录
3. 每条记录包含：商户名称、消费明细、金额、时间、类型、图标、支付方式
4. 金额要合理，时间要符合逻辑（按时间倒序）
5. 要有生活气息，符合角色性格
6. 必须返回完整的JSON格式

直接返回JSON，不要任何说明文字或markdown标记：
{
  "cards": [
    {"type": "bank-card", "name": "卡片名称", "balance": "余额", "number": "卡号", "logo": "图标"}
  ],
  "transactions": [
    {"title": "商户", "detail": "明细", "amount": "-金额", "time": "时间", "type": "expense/income", "icon": "图标", "paymentMethod": "支付方式"}
  ],
  "stats": {"todayExpense": "今日支出", "todayIncome": "今日收入", "monthExpense": "本月支出"}
}`;
            
            console.log('完整提示词:', prompt);
            console.log('========================');

            // 调用主API
            const response = await callMainAPI(prompt);
            
            // 解析响应
            const walletData = parseWalletResponse(response);
            
            // 保存到localStorage
            saveWalletToStorage(walletData);
            
            // 渲染钱包数据
            renderWalletData(walletData);
            
        } catch (error) {
            console.error('生成钱包数据失败:', error);
            content.innerHTML = `
                <div class="wallet-empty">
                    <div class="wallet-empty-icon">⚠️</div>
                    <div class="wallet-empty-text">生成失败</div>
                    <div class="wallet-empty-hint">${error.message || '请稍后重试'}</div>
                </div>
            `;
        } finally {
            generateBtn.disabled = false;
        }
    }
    
    // 保存钱包到localStorage
    function saveWalletToStorage(walletData) {
        try {
            localStorage.setItem('iphoneWalletData', JSON.stringify({
                data: walletData,
                character: currentCharacter,
                savedAt: Date.now()
            }));
        } catch (e) {
            console.error('保存钱包数据失败:', e);
        }
    }
    
    // 从localStorage加载钱包
    function loadWalletFromStorage() {
        try {
            const saved = localStorage.getItem('iphoneWalletData');
            if (saved) {
                const data = JSON.parse(saved);
                // 检查是否是同一角色
                if (data.character && data.character.name === getCurrentCharacter().name) {
                    currentWalletData = data.data;
                    currentCharacter = data.character;
                    return true;
                }
            }
        } catch (e) {
            console.error('加载钱包数据失败:', e);
        }
        return false;
    }

    // 获取当前角色信息（从当前聊天页面获取）
    function getCurrentCharacter() {
        console.log('=== 获取当前聊天角色信息 ===');
        
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

    // 获取最近对话
    function getRecentMessages() {
        const messages = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        return messages.slice(-50); // 最近50条
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

    // 解析钱包响应
    function parseWalletResponse(response) {
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
            
            // 尝试直接解析JSON
            let jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const jsonStr = jsonMatch[0];
                    console.log('找到JSON对象，长度:', jsonStr.length);
                    
                    // 修复可能的JSON格式问题
                    const fixedJson = jsonStr
                        .replace(/,\s*\]/g, ']')  // 移除尾随逗号
                        .replace(/,\s*}/g, '}');   // 移除尾随逗号
                    
                    const parsed = JSON.parse(fixedJson);
                    console.log('解析的JSON成功');
                    
                    return parsed;
                } catch (jsonError) {
                    console.log('JSON解析失败，尝试其他方法:', jsonError);
                }
            }
            
            // 如果JSON解析失败，返回默认钱包数据
            console.log('使用默认钱包数据');
            return getDefaultWalletData();
            
        } catch (error) {
            console.error('解析响应失败:', error);
            // 返回默认钱包数据
            return getDefaultWalletData();
        }
    }

    // 获取默认钱包数据
    function getDefaultWalletData() {
        return {
            cards: [
                {
                    type: 'bank-card',
                    name: '银行卡',
                    balance: '10,000.00',
                    number: '**** **** **** 1234',
                    logo: '🏦'
                },
                {
                    type: 'alipay',
                    name: '支付宝',
                    balance: '5,000.00',
                    number: '账户余额',
                    logo: '💙'
                },
                {
                    type: 'wechat',
                    name: '微信支付',
                    balance: '2,000.00',
                    number: '零钱余额',
                    logo: '💚'
                }
            ],
            transactions: [
                {
                    title: '早餐',
                    detail: '豆浆油条',
                    amount: '-15.00',
                    time: '08:30',
                    type: 'expense',
                    icon: '🍜',
                    paymentMethod: '微信支付'
                },
                {
                    title: '午餐',
                    detail: '快餐',
                    amount: '-35.00',
                    time: '12:00',
                    type: 'expense',
                    icon: '🍱',
                    paymentMethod: '支付宝'
                },
                {
                    title: '咖啡',
                    detail: '拿铁',
                    amount: '-38.00',
                    time: '15:30',
                    type: 'expense',
                    icon: '☕',
                    paymentMethod: '支付宝'
                }
            ],
            stats: {
                todayExpense: '88.00',
                todayIncome: '0.00',
                monthExpense: '2,580.00'
            }
        };
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

    // 初始化
    function init() {
        // 等待iPhone模拟器加载完成
        const checkInterval = setInterval(() => {
            const screen = document.querySelector('.iphone-screen');
            if (screen) {
                clearInterval(checkInterval);
                createWalletPage();
                
                console.log('✅ iPhone钱包模块已加载');
            }
        }, 100);
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 导出函数
    window.iPhoneWallet = {
        show: showWallet,
        hide: hideWallet
    };

})();