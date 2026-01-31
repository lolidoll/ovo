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

    // 找到最后一条 AI 消息（received 类型）
    let lastAiIndex = -1;
    let lastAiRound = null;
    for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].type === 'received') {
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
        // 删除所有属于同一个API调用回合的received类型消息
        for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].type === 'received' && msgs[i].apiCallRound === lastAiRound) {
                msgs.splice(i, 1);
                deletedCount++;
            }
        }
    } else {
        // 如果没有apiCallRound标记（旧数据），只删除最后一条
        msgs.splice(lastAiIndex, 1);
        deletedCount = 1;
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