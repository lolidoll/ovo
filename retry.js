/**
 * 重回功能模块
 * 处理删除AI最后一轮回复并重新生成的功能
 */

// 初始化重回按钮事件监听
function initRetryButton() {
    const btnRetry = document.getElementById('btn-retry');
    if (btnRetry) {
        btnRetry.addEventListener('click', function() { 
            retryDeleteLastAiReply(); 
        });
    }
}

// 删除最后一轮AI回复并重新生成
function retryDeleteLastAiReply() {
    if (!AppState.currentChat) {
        showToast('请先打开一个聊天会话');
        return;
    }

    const msgs = AppState.messages[AppState.currentChat.id] || [];
    const conv = AppState.conversations.find(c => c.id === AppState.currentChat.id);
    
    if (msgs.length === 0) return;

    // 检查最后一条消息的类型
    const lastMsg = msgs[msgs.length - 1];
    const isLastMsgFromUser = lastMsg.type === 'sent' || lastMsg.sender === 'sent';
    
    // 找到最后一条 AI 消息
    // AI消息的判断条件：
    // 1. type === 'received' (普通文本消息)
    // 2. sender === 'received' (语音、通话等特殊类型消息)
    let lastAiIndex = -1;
    let lastAiRound = null;
    for (let i = msgs.length - 1; i >= 0; i--) {
        const isAiMessage = msgs[i].type === 'received' || msgs[i].sender === 'received';
        if (isAiMessage) {
            lastAiIndex = i;
            lastAiRound = msgs[i].apiCallRound;
            break;
        }
    }

    if (lastAiIndex === -1) {
        showToast('没有找到 AI 回复消息');
        return;
    }

    // 删除整个API调用回合的所有消息
    let deletedCount = 0;
    if (lastAiRound) {
        // 删除所有属于同一个API调用回合的AI消息（包括文本、语音、通话等所有类型）
        for (let i = msgs.length - 1; i >= 0; i--) {
            const isAiMessage = msgs[i].type === 'received' || msgs[i].sender === 'received';
            if (isAiMessage && msgs[i].apiCallRound === lastAiRound) {
                msgs.splice(i, 1);
                deletedCount++;
            }
        }
    } else {
        // 如果没有apiCallRound标记（旧数据），只删除最后一条
        msgs.splice(lastAiIndex, 1);
        deletedCount = 1;
    }
    
    // 如果最后一条消息是用户发送的，也要删除AI回复之后的所有用户消息
    if (isLastMsgFromUser) {
        let userDeletedCount = 0;
        // 从后往前删除所有在AI回复之后的用户消息
        for (let i = msgs.length - 1; i >= 0; i--) {
            const isUserMessage = msgs[i].type === 'sent' || msgs[i].sender === 'sent';
            if (isUserMessage) {
                msgs.splice(i, 1);
                userDeletedCount++;
            } else {
                // 遇到非用户消息就停止（说明已经到达AI回复或更早的消息）
                break;
            }
        }
        deletedCount += userDeletedCount;
    }
    
    // 同时清除该角色的心声数据（因为心声是在删除的消息中生成的）
    const convId = AppState.currentChat.id;
    if (window.MindStateManager) {
        MindStateManager.removeMindStateForConversation(convId);
    }

    // 更新会话
    if (conv) {
        const lastMsg = msgs[msgs.length - 1];
        conv.lastMsg = lastMsg ? lastMsg.content : '';
        conv.time = formatTime(new Date());
    }

    saveToStorage();
    renderChatMessages();
    renderConversations();
    
    // 立即触发AI重新回复
    showToast(`已删除上一轮回复（${deletedCount}条消息），正在重新生成...`);
    setTimeout(() => {
        MainAPIManager.callApiWithConversation();
    }, 500);
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRetryButton);
} else {
    initRetryButton();
}