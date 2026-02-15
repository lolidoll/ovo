/**
 * 转账功能模块
 * 参考红包实现，提供专业的转账体验
 * 最高转账金额：2000元
 */

const TransferModule = (function() {
    'use strict';

    // 私有变量
    let transfers = new Map(); // 存储转账数据
    let modalOpen = false;

    // 转账状态常量
    const STATUS = {
        PENDING: 'pending',      // 待确认
        RECEIVED: 'received',    // 已收款
        RETURNED: 'returned'     // 已退还
    };

    // 转账金额限制
    const MAX_AMOUNT = 2000;
    const MIN_AMOUNT = 0.01;

    /**
     * 初始化转账模块
     */
    function init() {
        console.log('💰 初始化转账模块');
    }

    /**
     * 打开发送转账弹窗
     */
    function openSendModal() {
        console.log('💰 打开发送转账弹窗');
        
        if (!AppState.currentChat) {
            showToast('请先打开一个对话');
            return;
        }

        let modal = document.getElementById('transfer-modal');
        if (!modal) {
            modal = createSendModal();
            document.body.appendChild(modal);
        }

        modal.classList.add('show');
        modalOpen = true;

        // 聚焦到金额输入框
        setTimeout(() => {
            const amountInput = modal.querySelector('.transfer-amount-input');
            if (amountInput) amountInput.focus();
        }, 100);
    }

    /**
     * 创建发送转账弹窗
     */
    function createSendModal() {
        const modal = document.createElement('div');
        modal.id = 'transfer-modal';
        modal.className = 'transfer-modal';

        modal.innerHTML = `
            <div class="transfer-backdrop"></div>
            <div class="transfer-content">
                <div class="transfer-header">
                    <div class="transfer-title">转账给 ${escapeHtml(AppState.currentChat.name)}</div>
                    <div class="transfer-subtitle">最高可转 ${MAX_AMOUNT} 元</div>
                </div>
                <div class="transfer-body">
                    <div class="transfer-input-group">
                        <label class="transfer-label">转账金额</label>
                        <div class="transfer-amount-wrapper">
                            <span class="transfer-amount-symbol">¥</span>
                            <input type="number" 
                                   class="transfer-amount-input" 
                                   placeholder="0.00" 
                                   step="0.01" 
                                   min="${MIN_AMOUNT}" 
                                   max="${MAX_AMOUNT}">
                        </div>
                        <div class="transfer-amount-hint">单笔转账限额 ${MAX_AMOUNT} 元</div>
                    </div>
                    <div class="transfer-input-group">
                        <label class="transfer-label">转账说明（选填）</label>
                        <input type="text" 
                               class="transfer-note-input" 
                               placeholder="添加转账说明" 
                               maxlength="20">
                    </div>
                </div>
                <div class="transfer-footer">
                    <button class="transfer-btn transfer-btn-send">确认转账</button>
                </div>
            </div>
        `;

        // 绑定事件
        const backdrop = modal.querySelector('.transfer-backdrop');
        const sendBtn = modal.querySelector('.transfer-btn-send');
        const amountInput = modal.querySelector('.transfer-amount-input');

        backdrop.addEventListener('click', closeSendModal);
        sendBtn.addEventListener('click', handleSendTransfer);
        
        // 回车发送
        amountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSendTransfer();
            }
        });

        return modal;
    }

    /**
     * 关闭发送转账弹窗
     */
    function closeSendModal() {
        const modal = document.getElementById('transfer-modal');
        if (modal) {
            modal.classList.remove('show');
            modalOpen = false;
            
            // 清空输入
            setTimeout(() => {
                const amountInput = modal.querySelector('.transfer-amount-input');
                const noteInput = modal.querySelector('.transfer-note-input');
                if (amountInput) amountInput.value = '';
                if (noteInput) noteInput.value = '';
            }, 300);
        }
    }

    /**
     * 处理用户发送转账
     */
    function handleSendTransfer() {
        const modal = document.getElementById('transfer-modal');
        const amountInput = modal.querySelector('.transfer-amount-input');
        const noteInput = modal.querySelector('.transfer-note-input');

        const amount = parseFloat(amountInput.value);
        const note = noteInput.value.trim() || '转账';

        // 验证金额
        if (!amount || isNaN(amount)) {
            showToast('请输入转账金额');
            return;
        }

        if (amount < MIN_AMOUNT) {
            showToast(`转账金额不能少于${MIN_AMOUNT}元`);
            return;
        }

        if (amount > MAX_AMOUNT) {
            showToast(`单笔转账不能超过${MAX_AMOUNT}元`);
            return;
        }

        // 检查余额
        const userBalance = AppState.user.coins || 0;
        if (amount > userBalance) {
            showToast('余额不足');
            return;
        }

        console.log('💰 用户发送转账:', { amount, note });

        // 扣除用户余额
        AppState.user.coins = userBalance - amount;

        // 记录交易
        if (!AppState.walletHistory) {
            AppState.walletHistory = [];
        }
        AppState.walletHistory.push({
            amount: -amount,
            type: '转账',
            time: new Date().toISOString(),
            recipient: AppState.currentChat.name,
            note: note
        });

        // 创建转账消息
        const transfer = {
            id: generateTransferId(),
            conversationId: AppState.currentChat.id,
            type: 'transfer',
            content: `[转账] ${amount}元`,
            amount: amount,
            note: note,
            sender: 'sent',
            status: STATUS.PENDING,
            timestamp: new Date().toISOString()
        };

        // 保存转账数据
        transfers.set(transfer.id, transfer);

        // 添加到消息列表
        if (!AppState.messages[AppState.currentChat.id]) {
            AppState.messages[AppState.currentChat.id] = [];
        }
        AppState.messages[AppState.currentChat.id].push(transfer);

        // 保存到本地存储
        saveToStorage();

        // 重新渲染消息
        if (typeof renderChatMessages === 'function') {
            renderChatMessages();
        }

        // 关闭弹窗
        closeSendModal();

        // 显示提示
        showToast(`已向${AppState.currentChat.name}转账${amount}元`);
    }

    /**
     * AI发送转账给用户
     */
    function sendAITransfer(conversationId, amount, note = '转账') {
        console.log('💰 AI发送转账:', { conversationId, amount, note });

        // 创建转账消息
        const transfer = {
            id: generateTransferId(),
            conversationId: conversationId,
            type: 'transfer',
            content: `[转账] ${amount}元`,
            amount: amount,
            note: note,
            sender: 'received',
            status: STATUS.PENDING,
            timestamp: new Date().toISOString()
        };

        // 保存转账数据
        transfers.set(transfer.id, transfer);

        // 添加到消息列表
        if (!AppState.messages[conversationId]) {
            AppState.messages[conversationId] = [];
        }
        AppState.messages[conversationId].push(transfer);

        // 保存到本地存储
        saveToStorage();

        // 重新渲染消息
        if (typeof renderChatMessages === 'function') {
            renderChatMessages();
        }

        return transfer;
    }

    /**
     * 打开转账详情弹窗
     */
    function openDetailModal(transferId) {
        const transfer = transfers.get(transferId);
        if (!transfer) {
            console.warn('转账数据未找到:', transferId);
            return;
        }

        // 创建详情弹窗
        let modal = document.getElementById('transfer-detail-modal');
        if (modal) {
            modal.remove();
        }

        modal = createDetailModal(transfer);
        document.body.appendChild(modal);
        modal.classList.add('show');
    }

    /**
     * 创建转账详情弹窗
     */
    function createDetailModal(transfer) {
        const modal = document.createElement('div');
        modal.id = 'transfer-detail-modal';
        modal.className = 'transfer-detail-modal';

        const isSent = transfer.sender === 'sent';
        const senderName = isSent ? AppState.user.name : AppState.currentChat.name;
        const isPending = transfer.status === STATUS.PENDING;
        const isReceived = transfer.status === STATUS.RECEIVED;
        const isReturned = transfer.status === STATUS.RETURNED;

        let bodyContent = '';

        if (isPending) {
            if (isSent) {
                // 用户发送的转账，等待AI处理
                bodyContent = `
                    <div class="transfer-detail-amount">
                        <div class="transfer-detail-amount-value">
                            <span class="transfer-detail-amount-unit">¥</span>${transfer.amount.toFixed(2)}
                        </div>
                        <div class="transfer-detail-amount-label">等待对方确认收款</div>
                    </div>
                    <div class="transfer-detail-info">
                        <div class="transfer-detail-info-item">
                            <span class="transfer-detail-info-label">转账说明</span>
                            <span class="transfer-detail-info-value">${escapeHtml(transfer.note)}</span>
                        </div>
                        <div class="transfer-detail-info-item">
                            <span class="transfer-detail-info-label">转账时间</span>
                            <span class="transfer-detail-info-value">${formatTime(new Date(transfer.timestamp))}</span>
                        </div>
                    </div>
                `;
            } else {
                // AI发送的转账，用户可以确认或退还
                bodyContent = `
                    <div class="transfer-detail-amount">
                        <div class="transfer-detail-amount-value">
                            <span class="transfer-detail-amount-unit">¥</span>${transfer.amount.toFixed(2)}
                        </div>
                        <div class="transfer-detail-amount-label">喵币</div>
                    </div>
                    <div class="transfer-detail-info">
                        <div class="transfer-detail-info-item">
                            <span class="transfer-detail-info-label">转账说明</span>
                            <span class="transfer-detail-info-value">${escapeHtml(transfer.note)}</span>
                        </div>
                        <div class="transfer-detail-info-item">
                            <span class="transfer-detail-info-label">转账时间</span>
                            <span class="transfer-detail-info-value">${formatTime(new Date(transfer.timestamp))}</span>
                        </div>
                    </div>
                    <div class="transfer-detail-actions">
                        <button class="transfer-detail-btn transfer-detail-btn-return" 
                                onclick="TransferModule.handleUserReturn('${transfer.id}')">
                            退还
                        </button>
                        <button class="transfer-detail-btn transfer-detail-btn-receive" 
                                onclick="TransferModule.handleUserReceive('${transfer.id}')">
                            确认收款
                        </button>
                    </div>
                `;
            }
        } else if (isReceived) {
            bodyContent = `
                <div class="transfer-detail-amount">
                    <div class="transfer-detail-amount-value">
                        <span class="transfer-detail-amount-unit">¥</span>${transfer.amount.toFixed(2)}
                    </div>
                    <div class="transfer-detail-amount-label">已收款</div>
                </div>
                <div class="transfer-detail-info">
                    <div class="transfer-detail-info-item">
                        <span class="transfer-detail-info-label">转账说明</span>
                        <span class="transfer-detail-info-value">${escapeHtml(transfer.note)}</span>
                    </div>
                    <div class="transfer-detail-info-item">
                        <span class="transfer-detail-info-label">收款时间</span>
                        <span class="transfer-detail-info-value">${formatTime(new Date(transfer.receivedAt || transfer.timestamp))}</span>
                    </div>
                </div>
            `;
        } else if (isReturned) {
            bodyContent = `
                <div class="transfer-detail-amount">
                    <div class="transfer-detail-amount-value">
                        <span class="transfer-detail-amount-unit">¥</span>${transfer.amount.toFixed(2)}
                    </div>
                    <div class="transfer-detail-amount-label">已退还</div>
                </div>
                <div class="transfer-detail-info">
                    <div class="transfer-detail-info-item">
                        <span class="transfer-detail-info-label">转账说明</span>
                        <span class="transfer-detail-info-value">${escapeHtml(transfer.note)}</span>
                    </div>
                    <div class="transfer-detail-info-item">
                        <span class="transfer-detail-info-label">退还时间</span>
                        <span class="transfer-detail-info-value">${formatTime(new Date(transfer.returnedAt || transfer.timestamp))}</span>
                    </div>
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="transfer-backdrop"></div>
            <div class="transfer-detail-content">
                <div class="transfer-detail-header">
                    <div class="transfer-detail-title">${senderName}的转账</div>
                    <button class="transfer-detail-close">×</button>
                </div>
                <div class="transfer-detail-body">
                    ${bodyContent}
                </div>
            </div>
        `;

        // 绑定关闭事件
        const backdrop = modal.querySelector('.transfer-backdrop');
        const closeBtn = modal.querySelector('.transfer-detail-close');

        const closeModal = () => modal.remove();
        backdrop.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);

        return modal;
    }

    /**
     * 用户确认收款
     */
    function handleUserReceive(transferId) {
        const transfer = transfers.get(transferId);
        if (!transfer || transfer.status !== STATUS.PENDING) {
            showToast('转账状态异常');
            return;
        }

        console.log('💰 用户确认收款:', transfer);

        // 更新转账状态
        transfer.status = STATUS.RECEIVED;
        transfer.receivedAt = new Date().toISOString();

        // 增加用户余额
        AppState.user.coins = (AppState.user.coins || 0) + transfer.amount;

        // 记录交易
        if (!AppState.walletHistory) {
            AppState.walletHistory = [];
        }
        AppState.walletHistory.push({
            amount: transfer.amount,
            type: '收款',
            time: new Date().toISOString(),
            sender: AppState.currentChat.name,
            note: transfer.note
        });

        // 更新转账Map
        transfers.set(transferId, transfer);

        // 更新消息列表中的转账状态
        const convId = transfer.conversationId;
        if (AppState.messages[convId]) {
            const msgIndex = AppState.messages[convId].findIndex(m => m.id === transferId);
            if (msgIndex !== -1) {
                AppState.messages[convId][msgIndex] = { ...transfer };
            }
        }

        // 保存
        saveToStorage();

        // 直接更新DOM
        updateTransferCardInDOM(transferId, transfer);

        // 延迟重新渲染
        setTimeout(() => {
            if (typeof renderChatMessages === 'function') {
                renderChatMessages(true);
            }
        }, 100);

        // 关闭详情弹窗
        const modal = document.getElementById('transfer-detail-modal');
        if (modal) modal.remove();

        // 显示提示
        showToast(`已收款${transfer.amount}元`);

        // 通知AI转账已被确认
        notifyAIAboutReceive(transfer);
    }

    /**
     * 用户退还转账
     */
    function handleUserReturn(transferId) {
        const transfer = transfers.get(transferId);
        if (!transfer || transfer.status !== STATUS.PENDING) {
            showToast('转账状态异常');
            return;
        }

        console.log('💰 用户退还转账:', transfer);

        // 更新转账状态
        transfer.status = STATUS.RETURNED;
        transfer.returnedAt = new Date().toISOString();

        // 更新转账Map
        transfers.set(transferId, transfer);

        // 更新消息列表中的转账状态
        const convId = transfer.conversationId;
        if (AppState.messages[convId]) {
            const msgIndex = AppState.messages[convId].findIndex(m => m.id === transferId);
            if (msgIndex !== -1) {
                AppState.messages[convId][msgIndex] = { ...transfer };
            }
        }

        // 保存
        saveToStorage();

        // 直接更新DOM
        updateTransferCardInDOM(transferId, transfer);

        // 延迟重新渲染
        setTimeout(() => {
            if (typeof renderChatMessages === 'function') {
                renderChatMessages(true);
            }
        }, 100);

        // 关闭详情弹窗
        const modal = document.getElementById('transfer-detail-modal');
        if (modal) modal.remove();

        // 显示提示
        showToast('已退还转账');

        // 通知AI转账已被退还
        notifyAIAboutReturn(transfer);
    }

    /**
     * AI确认收款
     */
    function handleAIReceive(transferId) {
        const transfer = transfers.get(transferId);
        if (!transfer || transfer.status !== STATUS.PENDING) {
            return;
        }

        console.log('💰 AI确认收款:', transfer);

        // 更新转账状态
        transfer.status = STATUS.RECEIVED;
        transfer.receivedAt = new Date().toISOString();

        // 更新转账Map
        transfers.set(transferId, transfer);
        console.log('💰 已更新转账Map:', transferId, transfer.status);

        // 更新消息列表中的转账状态
        const convId = transfer.conversationId;
        if (AppState.messages[convId]) {
            const msgIndex = AppState.messages[convId].findIndex(m => m.id === transferId);
            if (msgIndex !== -1) {
                AppState.messages[convId][msgIndex] = { ...transfer };
                console.log('💰 已更新消息数组:', msgIndex, AppState.messages[convId][msgIndex].status);
            }
        }

        // 保存
        saveToStorage();

        // 直接更新DOM
        updateTransferCardInDOM(transferId, transfer);

        // 延迟重新渲染
        setTimeout(() => {
            if (typeof renderChatMessages === 'function') {
                console.log('💰 强制重新渲染聊天消息');
                renderChatMessages(true);
            }
        }, 100);

        return transfer;
    }

    /**
     * AI退还转账
     */
    function handleAIReturn(transferId) {
        const transfer = transfers.get(transferId);
        if (!transfer || transfer.status !== STATUS.PENDING) {
            return;
        }

        console.log('💰 AI退还转账:', transfer);

        // 更新转账状态
        transfer.status = STATUS.RETURNED;
        transfer.returnedAt = new Date().toISOString();

        // 退还金额给用户
        AppState.user.coins = (AppState.user.coins || 0) + transfer.amount;

        // 记录交易
        if (!AppState.walletHistory) {
            AppState.walletHistory = [];
        }
        AppState.walletHistory.push({
            amount: transfer.amount,
            type: '转账退还',
            time: new Date().toISOString(),
            note: '对方退还了转账'
        });

        // 更新转账Map
        transfers.set(transferId, transfer);
        console.log('💰 已更新转账Map:', transferId, transfer.status);

        // 更新消息列表中的转账状态
        const convId = transfer.conversationId;
        if (AppState.messages[convId]) {
            const msgIndex = AppState.messages[convId].findIndex(m => m.id === transferId);
            if (msgIndex !== -1) {
                AppState.messages[convId][msgIndex] = { ...transfer };
                console.log('💰 已更新消息数组:', msgIndex, AppState.messages[convId][msgIndex].status);
            }
        }

        // 保存
        saveToStorage();

        // 直接更新DOM
        updateTransferCardInDOM(transferId, transfer);

        // 延迟重新渲染
        setTimeout(() => {
            if (typeof renderChatMessages === 'function') {
                console.log('💰 强制重新渲染聊天消息');
                renderChatMessages(true);
            }
        }, 100);

        return transfer;
    }

    /**
     * 直接更新DOM中的转账卡片
     */
    function updateTransferCardInDOM(transferId, transfer) {
        console.log('💰 直接更新DOM中的转账卡片:', transferId, transfer.status);

        const card = document.querySelector(`.transfer-card[onclick*="${transferId}"]`);
        if (!card) {
            console.warn('💰 未找到转账卡片DOM元素:', transferId);
            return;
        }

        // 移除旧的状态类
        card.classList.remove('pending', 'received', 'returned');

        // 添加新的状态类
        card.classList.add(transfer.status);

        // 更新状态文本
        const statusElement = card.querySelector('.transfer-card-status');
        if (statusElement) {
            const statusText = {
                'pending': '待确认',
                'received': '已收款',
                'returned': '已退还'
            };
            statusElement.textContent = statusText[transfer.status] || transfer.status;
        }

        console.log('💰 DOM更新完成，新状态:', transfer.status);
    }

    /**
     * 通知AI转账已被确认
     */
    function notifyAIAboutReceive(transfer) {
        const systemMessage = `[系统消息] 用户已确认收款${transfer.amount}元。`;
        addHiddenSystemMessage(transfer.conversationId, systemMessage);
    }

    /**
     * 通知AI转账已被退还
     */
    function notifyAIAboutReturn(transfer) {
        const systemMessage = `[系统消息] 用户退还了你的转账${transfer.amount}元。`;
        addHiddenSystemMessage(transfer.conversationId, systemMessage);
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
     * 生成转账ID
     */
    function generateTransferId() {
        return `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
     * 格式化时间
     */
    function formatTime(date) {
        if (typeof window.formatTime === 'function') {
            return window.formatTime(date);
        }
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /**
     * 保存到本地存储
     */
    function saveToStorage() {
        if (typeof window.saveToStorage === 'function') {
            window.saveToStorage();
        }
    }

    /**
     * 获取转账数据
     */
    function getTransfer(transferId) {
        return transfers.get(transferId);
    }

    /**
     * 检查消息是否是转账类型
     */
    function isTransferMessage(message) {
        return message && message.type === 'transfer';
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
        sendAITransfer,
        getTransfer,
        isTransferMessage,
        STATUS,
        MAX_AMOUNT,
        MIN_AMOUNT
    };
})();

// 在DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', TransferModule.init);
} else {
    TransferModule.init();
}

// 导出到全局
window.TransferModule = TransferModule;