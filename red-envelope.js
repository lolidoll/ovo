/**
 * 红包功能模块
 * 处理红包的发送、接收、领取和退还
 */

const RedEnvelopeModule = (function() {
    'use strict';

    // 私有变量
    let redEnvelopes = new Map(); // 存储红包数据 { envelopeId: { amount, message, sender, status, ... } }
    let modalOpen = false;

    // 红包状态常量
    const STATUS = {
        PENDING: 'pending',      // 待领取
        RECEIVED: 'received',    // 已领取
        RETURNED: 'returned'     // 已退还
    };

    /**
     * 初始化红包模块
     */
    function init() {
        console.log('🧧 初始化红包模块');
        // 不需要在这里初始化按钮，因为按钮事件已在 chat-qq-toolbar.js 中处理
    }

    /**
     * 打开发送红包弹窗
     */
    function openSendModal() {
        console.log('🧧 打开发送红包弹窗');
        
        // 检查是否有当前对话
        if (!AppState.currentChat) {
            showToast('请先打开一个对话');
            return;
        }

        // 创建或获取弹窗
        let modal = document.getElementById('red-envelope-modal');
        if (!modal) {
            modal = createSendModal();
            document.body.appendChild(modal);
        }

        // 显示弹窗
        modal.classList.add('show');
        modalOpen = true;

        // 更新余额显示
        updateBalanceDisplay();

        // 清空输入
        const amountInput = document.getElementById('red-envelope-amount-input');
        const messageInput = document.getElementById('red-envelope-message-input');
        if (amountInput) amountInput.value = '';
        if (messageInput) messageInput.value = '';

        // 聚焦到金额输入框
        setTimeout(() => {
            if (amountInput) amountInput.focus();
        }, 100);
    }

    /**
     * 关闭发送红包弹窗
     */
    function closeSendModal() {
        const modal = document.getElementById('red-envelope-modal');
        if (modal) {
            modal.classList.remove('show');
            modalOpen = false;
        }
    }

    /**
     * 创建发送红包弹窗
     */
    function createSendModal() {
        const modal = document.createElement('div');
        modal.id = 'red-envelope-modal';
        modal.className = 'red-envelope-modal';
        modal.innerHTML = `
            <div class="red-envelope-backdrop"></div>
            <div class="red-envelope-content">
                <div class="red-envelope-header">
                    <div class="red-envelope-icon">🧧</div>
                    <h3 class="red-envelope-title">发红包</h3>
                    <p class="red-envelope-subtitle">给 ${escapeHtml(AppState.currentChat?.name || 'TA')} 发个红包吧</p>
                </div>
                <div class="red-envelope-body">
                    <div class="red-envelope-input-group">
                        <label class="red-envelope-label">红包金额</label>
                        <div class="red-envelope-amount-wrapper">
                            <span class="red-envelope-currency">¥</span>
                            <input type="number" 
                                   id="red-envelope-amount-input" 
                                   class="red-envelope-input" 
                                   placeholder="0.00" 
                                   min="0.01" 
                                   max="200" 
                                   step="0.01">
                        </div>
                        <div class="red-envelope-balance">
                            <span>余额：<span class="red-envelope-balance-amount" id="red-envelope-balance-display">0</span> 薯片币</span>
                            <span style="color: #999;">单个红包限额200元</span>
                        </div>
                    </div>
                    <div class="red-envelope-input-group">
                        <label class="red-envelope-label">红包留言（选填）</label>
                        <textarea id="red-envelope-message-input" 
                                  class="red-envelope-message-input" 
                                  placeholder="恭喜发财，大吉大利" 
                                  maxlength="50" 
                                  rows="2"></textarea>
                    </div>
                </div>
                <div class="red-envelope-footer">
                    <button class="red-envelope-btn red-envelope-btn-cancel" id="red-envelope-cancel-btn">取消</button>
                    <button class="red-envelope-btn red-envelope-btn-send" id="red-envelope-send-btn">塞钱进红包</button>
                </div>
            </div>
        `;

        // 绑定事件
        const backdrop = modal.querySelector('.red-envelope-backdrop');
        const cancelBtn = modal.querySelector('#red-envelope-cancel-btn');
        const sendBtn = modal.querySelector('#red-envelope-send-btn');

        backdrop.addEventListener('click', closeSendModal);
        cancelBtn.addEventListener('click', closeSendModal);
        sendBtn.addEventListener('click', handleSendRedEnvelope);

        // 回车快速发送
        const amountInput = modal.querySelector('#red-envelope-amount-input');
        if (amountInput) {
            amountInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleSendRedEnvelope();
                }
            });
        }

        return modal;
    }

    /**
     * 更新余额显示
     */
    function updateBalanceDisplay() {
        const balanceDisplay = document.getElementById('red-envelope-balance-display');
        if (balanceDisplay) {
            balanceDisplay.textContent = AppState.user.coins || 0;
        }
    }

    /**
     * 处理发送红包
     */
    function handleSendRedEnvelope() {
        const amountInput = document.getElementById('red-envelope-amount-input');
        const messageInput = document.getElementById('red-envelope-message-input');
        
        const amount = parseFloat(amountInput.value);
        const message = messageInput.value.trim() || '恭喜发财，大吉大利';

        // 验证金额
        if (!amount || amount <= 0) {
            showToast('请输入红包金额');
            return;
        }

        if (amount > 200) {
            showToast('单个红包金额不能超过200元');
            return;
        }

        // 检查余额
        const currentBalance = AppState.user.coins || 0;
        if (currentBalance < amount) {
            showToast('余额不足，请先充值');
            return;
        }

        // 扣除余额
        AppState.user.coins = currentBalance - amount;

        // 记录交易
        if (!AppState.walletHistory) {
            AppState.walletHistory = [];
        }
        AppState.walletHistory.push({
            amount: -amount,
            type: '发红包',
            time: new Date().toISOString(),
            recipient: AppState.currentChat.name
        });

        // 创建红包消息
        const envelope = {
            id: generateEnvelopeId(),
            conversationId: AppState.currentChat.id,
            type: 'redenvelope',
            content: `[红包] ${amount}元`,
            amount: amount,
            message: message,
            sender: 'sent',
            status: STATUS.PENDING,
            timestamp: new Date().toISOString()
        };

        // 保存红包数据
        redEnvelopes.set(envelope.id, envelope);

        // 添加到消息列表
        if (!AppState.messages[AppState.currentChat.id]) {
            AppState.messages[AppState.currentChat.id] = [];
        }
        AppState.messages[AppState.currentChat.id].push(envelope);

        // 保存到本地存储
        saveToStorage();

        // 重新渲染消息
        if (typeof renderChatMessages === 'function') {
            renderChatMessages();
        }

        // 关闭弹窗
        closeSendModal();

        // 显示提示
        showToast(`已发送${amount}元红包`);

        console.log('🧧 用户发送红包:', envelope);

        // 通知AI有红包待处理（通过系统消息，但不自动触发AI回复）
        notifyAIAboutRedEnvelope(envelope, false);
    }

    /**
     * 通知AI有红包待处理
     */
    function notifyAIAboutRedEnvelope(envelope, autoTrigger = false) {
        // 构建系统消息，告知AI用户发送了红包
        const systemMessage = `[系统消息] 用户给你发送了一个红包，金额为${envelope.amount}元人民币（薯片币），留言："${envelope.message}"。你可以选择领取或退还这个红包。请用自然的方式回复用户，表达你的态度（领取或退还），不要提及系统消息。`;

        // 将系统消息添加到对话历史中（但不显示在界面上）
        const convId = envelope.conversationId;
        if (!AppState.messages[convId]) {
            AppState.messages[convId] = [];
        }

        // 添加隐藏的系统消息
        const hiddenMsg = {
            id: generateMessageId(),
            conversationId: convId,
            type: 'system',
            content: systemMessage,
            sender: 'system',
            timestamp: new Date().toISOString(),
            hidden: true  // 标记为隐藏，不在界面显示
        };

        AppState.messages[convId].push(hiddenMsg);
        saveToStorage();

        // 只有在明确要求时才自动触发AI回复
        if (autoTrigger) {
            setTimeout(() => {
                if (window.MainAPIManager && typeof window.MainAPIManager.callApiWithConversation === 'function') {
                    window.MainAPIManager.callApiWithConversation();
                }
            }, 500);
        }
    }

    /**
     * AI发送红包给用户
     */
    function sendAIRedEnvelope(conversationId, amount, message = '收下吧~') {
        console.log('🧧 AI发送红包:', { conversationId, amount, message });

        // 创建红包消息
        const envelope = {
            id: generateEnvelopeId(),
            conversationId: conversationId,
            type: 'redenvelope',
            content: `[红包] ${amount}元`,
            amount: amount,
            message: message,
            sender: 'received',
            status: STATUS.PENDING,
            timestamp: new Date().toISOString()
        };

        // 保存红包数据
        redEnvelopes.set(envelope.id, envelope);

        // 添加到消息列表
        if (!AppState.messages[conversationId]) {
            AppState.messages[conversationId] = [];
        }
        AppState.messages[conversationId].push(envelope);

        // 保存到本地存储
        saveToStorage();

        // 重新渲染消息
        if (typeof renderChatMessages === 'function') {
            renderChatMessages();
        }

        return envelope;
    }

    /**
     * 打开红包详情弹窗
     */
    function openDetailModal(envelopeId) {
        const envelope = redEnvelopes.get(envelopeId);
        if (!envelope) {
            console.error('红包不存在:', envelopeId);
            return;
        }

        console.log('🧧 打开红包详情:', envelope);

        // 创建详情弹窗
        let modal = document.getElementById('red-envelope-detail-modal');
        if (modal) {
            modal.remove();
        }

        modal = createDetailModal(envelope);
        document.body.appendChild(modal);
        modal.classList.add('show');
    }

    /**
     * 创建红包详情弹窗
     */
    function createDetailModal(envelope) {
        const modal = document.createElement('div');
        modal.id = 'red-envelope-detail-modal';
        modal.className = 'red-envelope-detail-modal';

        const isSent = envelope.sender === 'sent';
        const senderName = isSent ? AppState.user.name : AppState.currentChat.name;
        const isPending = envelope.status === STATUS.PENDING;
        const isReceived = envelope.status === STATUS.RECEIVED;
        const isReturned = envelope.status === STATUS.RETURNED;

        let bodyContent = '';

        if (isPending) {
            // 待领取状态
            if (isSent) {
                // 用户发送的红包，等待AI处理
                bodyContent = `
                    <div class="red-envelope-detail-amount">
                        <div class="red-envelope-detail-amount-value">
                            <span class="red-envelope-detail-amount-unit">¥</span>${envelope.amount.toFixed(2)}
                        </div>
                        <div class="red-envelope-detail-amount-label">等待对方领取</div>
                    </div>
                    <div class="red-envelope-detail-info">
                        红包已发送，等待对方领取或退还
                    </div>
                `;
            } else {
                // AI发送的红包，用户可以领取或退还
                bodyContent = `
                    <div class="red-envelope-detail-amount">
                        <div class="red-envelope-detail-amount-value">
                            <span class="red-envelope-detail-amount-unit">¥</span>${envelope.amount.toFixed(2)}
                        </div>
                        <div class="red-envelope-detail-amount-label">薯片币</div>
                    </div>
                    <div class="red-envelope-detail-actions">
                        <button class="red-envelope-detail-btn red-envelope-detail-btn-return" onclick="RedEnvelopeModule.handleUserReturn('${envelope.id}')">退还</button>
                        <button class="red-envelope-detail-btn red-envelope-detail-btn-receive" onclick="RedEnvelopeModule.handleUserReceive('${envelope.id}')">领取</button>
                    </div>
                    <div class="red-envelope-detail-info">
                        领取后将自动存入你的钱包
                    </div>
                `;
            }
        } else if (isReceived) {
            // 已领取状态
            const receiverName = isSent ? AppState.currentChat.name : AppState.user.name;
            bodyContent = `
                <div class="red-envelope-detail-status">
                    <div class="red-envelope-detail-status-icon">✅</div>
                    <div class="red-envelope-detail-status-text">已领取</div>
                    <div class="red-envelope-detail-status-time">${receiverName} 已领取</div>
                </div>
                <div class="red-envelope-detail-amount">
                    <div class="red-envelope-detail-amount-value">
                        <span class="red-envelope-detail-amount-unit">¥</span>${envelope.amount.toFixed(2)}
                    </div>
                </div>
            `;
        } else if (isReturned) {
            // 已退还状态
            const returnerName = isSent ? AppState.currentChat.name : AppState.user.name;
            bodyContent = `
                <div class="red-envelope-detail-status">
                    <div class="red-envelope-detail-status-icon">↩️</div>
                    <div class="red-envelope-detail-status-text">已退还</div>
                    <div class="red-envelope-detail-status-time">${returnerName} 已退还红包</div>
                </div>
                <div class="red-envelope-detail-amount">
                    <div class="red-envelope-detail-amount-value">
                        <span class="red-envelope-detail-amount-unit">¥</span>${envelope.amount.toFixed(2)}
                    </div>
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="red-envelope-backdrop"></div>
            <div class="red-envelope-detail-content">
                <div class="red-envelope-detail-header">
                    <button class="red-envelope-detail-close">×</button>
                    <div class="red-envelope-detail-icon">🧧</div>
                    <div class="red-envelope-detail-sender">${escapeHtml(senderName)}的红包</div>
                    <div class="red-envelope-detail-message">${escapeHtml(envelope.message)}</div>
                </div>
                <div class="red-envelope-detail-body">
                    ${bodyContent}
                </div>
            </div>
        `;

        // 绑定关闭事件
        const backdrop = modal.querySelector('.red-envelope-backdrop');
        const closeBtn = modal.querySelector('.red-envelope-detail-close');

        const closeModal = () => modal.remove();
        backdrop.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);

        return modal;
    }

    /**
     * 用户领取红包
     */
    function handleUserReceive(envelopeId) {
        const envelope = redEnvelopes.get(envelopeId);
        if (!envelope || envelope.status !== STATUS.PENDING) {
            showToast('红包状态异常');
            return;
        }

        console.log('🧧 用户领取红包:', envelope);

        // 更新红包状态
        envelope.status = STATUS.RECEIVED;
        envelope.receivedAt = new Date().toISOString();

        // 增加用户余额
        AppState.user.coins = (AppState.user.coins || 0) + envelope.amount;

        // 记录交易
        if (!AppState.walletHistory) {
            AppState.walletHistory = [];
        }
        AppState.walletHistory.push({
            amount: envelope.amount,
            type: '领取红包',
            time: new Date().toISOString(),
            sender: AppState.currentChat.name
        });

        // 更新消息列表中的红包状态
        const convId = envelope.conversationId;
        if (AppState.messages[convId]) {
            const msgIndex = AppState.messages[convId].findIndex(m => m.id === envelopeId);
            if (msgIndex !== -1) {
                AppState.messages[convId][msgIndex] = envelope;
            }
        }

        // 保存
        saveToStorage();

        // 重新渲染
        if (typeof renderChatMessages === 'function') {
            renderChatMessages();
        }

        // 关闭详情弹窗
        const modal = document.getElementById('red-envelope-detail-modal');
        if (modal) modal.remove();

        // 显示提示
        showToast(`已领取${envelope.amount}元红包`);

        // 通知AI红包已被领取
        notifyAIAboutReceive(envelope);
    }

    /**
     * 用户退还红包
     */
    function handleUserReturn(envelopeId) {
        const envelope = redEnvelopes.get(envelopeId);
        if (!envelope || envelope.status !== STATUS.PENDING) {
            showToast('红包状态异常');
            return;
        }

        console.log('🧧 用户退还红包:', envelope);

        // 更新红包状态
        envelope.status = STATUS.RETURNED;
        envelope.returnedAt = new Date().toISOString();

        // 更新消息列表中的红包状态
        const convId = envelope.conversationId;
        if (AppState.messages[convId]) {
            const msgIndex = AppState.messages[convId].findIndex(m => m.id === envelopeId);
            if (msgIndex !== -1) {
                AppState.messages[convId][msgIndex] = envelope;
            }
        }

        // 保存
        saveToStorage();

        // 重新渲染
        if (typeof renderChatMessages === 'function') {
            renderChatMessages();
        }

        // 关闭详情弹窗
        const modal = document.getElementById('red-envelope-detail-modal');
        if (modal) modal.remove();

        // 显示提示
        showToast('已退还红包');

        // 通知AI红包已被退还
        notifyAIAboutReturn(envelope);
    }

    /**
     * AI领取红包
     */
    function handleAIReceive(envelopeId) {
        const envelope = redEnvelopes.get(envelopeId);
        if (!envelope || envelope.status !== STATUS.PENDING) {
            return;
        }

        console.log('🧧 AI领取红包:', envelope);

        // 更新红包状态
        envelope.status = STATUS.RECEIVED;
        envelope.receivedAt = new Date().toISOString();

        // 更新红包Map
        redEnvelopes.set(envelopeId, envelope);
        console.log('🧧 已更新红包Map:', envelopeId, envelope.status);
        
        // 更新消息列表中的红包状态
        const convId = envelope.conversationId;
        if (AppState.messages[convId]) {
            const msgIndex = AppState.messages[convId].findIndex(m => m.id === envelopeId);
            if (msgIndex !== -1) {
                AppState.messages[convId][msgIndex] = { ...envelope };
                console.log('🧧 已更新消息数组:', msgIndex, AppState.messages[convId][msgIndex].status);
            }
        }

        // 保存
        saveToStorage();

        // 直接更新DOM中的红包卡片
        updateRedEnvelopeCardInDOM(envelopeId, envelope);
        
        // 同时也重新渲染以确保完整更新
        setTimeout(() => {
            if (typeof renderChatMessages === 'function') {
                console.log('🧧 强制重新渲染聊天消息');
                renderChatMessages(true);
            }
        }, 100);

        return envelope;
    }

    /**
     * AI退还红包
     */
    function handleAIReturn(envelopeId) {
        const envelope = redEnvelopes.get(envelopeId);
        if (!envelope || envelope.status !== STATUS.PENDING) {
            return;
        }

        console.log('🧧 AI退还红包:', envelope);

        // 更新红包状态
        envelope.status = STATUS.RETURNED;
        envelope.returnedAt = new Date().toISOString();

        // 退还金额给用户
        AppState.user.coins = (AppState.user.coins || 0) + envelope.amount;

        // 记录交易
        if (!AppState.walletHistory) {
            AppState.walletHistory = [];
        }
        AppState.walletHistory.push({
            amount: envelope.amount,
            type: '红包退还',
            time: new Date().toISOString(),
            note: '对方退还了红包'
        });

        // 更新红包Map
        redEnvelopes.set(envelopeId, envelope);
        console.log('🧧 已更新红包Map:', envelopeId, envelope.status);
        
        // 更新消息列表中的红包状态
        const convId = envelope.conversationId;
        if (AppState.messages[convId]) {
            const msgIndex = AppState.messages[convId].findIndex(m => m.id === envelopeId);
            if (msgIndex !== -1) {
                AppState.messages[convId][msgIndex] = { ...envelope };
                console.log('🧧 已更新消息数组:', msgIndex, AppState.messages[convId][msgIndex].status);
            }
        }

        // 保存
        saveToStorage();

        // 直接更新DOM中的红包卡片
        updateRedEnvelopeCardInDOM(envelopeId, envelope);
        
        // 同时也重新渲染以确保完整更新
        setTimeout(() => {
            if (typeof renderChatMessages === 'function') {
                console.log('🧧 强制重新渲染聊天消息');
                renderChatMessages(true);
            }
        }, 100);

        return envelope;
    }

    /**
     * 通知AI红包已被领取
     */
    function notifyAIAboutReceive(envelope) {
        const systemMessage = `[系统消息] 用户已领取你发送的${envelope.amount}元红包。`;
        addHiddenSystemMessage(envelope.conversationId, systemMessage);
    }

    /**
     * 通知AI红包已被退还
     */
    function notifyAIAboutReturn(envelope) {
        const systemMessage = `[系统消息] 用户退还了你发送的${envelope.amount}元红包。`;
        addHiddenSystemMessage(envelope.conversationId, systemMessage);
    }

    /**
     * 添加隐藏的系统消息
     */
    function addHiddenSystemMessage(convId, content) {
        if (!AppState.messages[convId]) {
            AppState.messages[convId] = [];
        }

        const hiddenMsg = {
            id: generateMessageId(),
            conversationId: convId,
            type: 'system',
            content: content,
            sender: 'system',
            timestamp: new Date().toISOString(),
            hidden: true
        };

        AppState.messages[convId].push(hiddenMsg);
        saveToStorage();
    }

    /**
     * 生成红包ID
     */
    function generateEnvelopeId() {
        return `envelope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 生成消息ID
     */
    function generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 转义HTML
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * 显示提示
     */
    function showToast(message) {
        if (window.showToast) {
            window.showToast(message);
        } else {
            console.log('Toast:', message);
        }
    }

    /**
     * 获取红包数据
     */
    function getRedEnvelope(envelopeId) {
        return redEnvelopes.get(envelopeId);
    }

    /**
     * 直接更新DOM中的红包卡片
     */
    function updateRedEnvelopeCardInDOM(envelopeId, envelope) {
        console.log('🧧 直接更新DOM中的红包卡片:', envelopeId, envelope.status);
        
        // 查找对应的红包卡片元素
        const card = document.querySelector(`.red-envelope-card[onclick*="${envelopeId}"]`);
        if (!card) {
            console.warn('🧧 未找到红包卡片DOM元素:', envelopeId);
            return;
        }
        
        // 移除旧的状态类
        card.classList.remove('pending', 'received', 'returned');
        
        // 添加新的状态类
        card.classList.add(envelope.status);
        
        // 更新状态文本
        const statusElement = card.querySelector('.red-envelope-card-status');
        if (statusElement) {
            const statusText = {
                'pending': '待领取',
                'received': '已领取',
                'returned': '已退还'
            };
            statusElement.textContent = statusText[envelope.status] || envelope.status;
        }
        
        console.log('🧧 DOM更新完成，新状态:', envelope.status);
    }

    /**
     * 检查消息是否是红包类型
     */
    function isRedEnvelopeMessage(message) {
        return message && message.type === 'redenvelope';
    }

    // 导出公共接口
    return {
        init,
        openSendModal,
        closeSendModal,
        openDetailModal,
        handleUserReceive,
        handleUserReturn,
        handleAIReceive,
        handleAIReturn,
        sendAIRedEnvelope,
        getRedEnvelope,
        isRedEnvelopeMessage,
        STATUS
    };
})();

// 在DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', RedEnvelopeModule.init);
} else {
    RedEnvelopeModule.init();
}

// 导出到全局
window.RedEnvelopeModule = RedEnvelopeModule;