/**
 * 语音条功能模块
 * 处理语音消息的发送、接收和显示
 */

const VoiceMessageModule = (function() {
    // 私有变量
    let voiceModalOpen = false;
    let voiceMessages = new Map(); // 存储语音消息内容 { messageId: { text, type: 'voice' } }

    // 初始化语音条功能
    function init() {
        initVoiceButton();
        initVoiceModal();
    }

    // 初始化语音按钮事件
    function initVoiceButton() {
        const voiceBtn = document.getElementById('btn-voice-msg');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', openVoiceModal);
        }
    }

    // 打开语音条输入弹窗
    function openVoiceModal() {
        // 创建或获取弹窗容器
        let modal = document.getElementById('voice-modal');
        if (!modal) {
            modal = createVoiceModal();
            document.body.appendChild(modal);
        }

        modal.style.display = 'flex';
        voiceModalOpen = true;
        document.getElementById('voice-input').value = '';
        document.getElementById('voice-input').focus();

        // 添加遮罩和关闭事件
        const backdrop = modal.querySelector('.voice-modal-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', closeVoiceModal);
        }

        // 关闭按钮
        const closeBtn = modal.querySelector('.voice-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeVoiceModal);
        }

        // 发送按钮
        const sendBtn = modal.querySelector('.voice-send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', sendVoiceMessage);
        }

        // 回车快速发送
        const input = modal.querySelector('.voice-input');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    sendVoiceMessage();
                }
            });
        }
    }

    // 关闭语音条输入弹窗
    function closeVoiceModal() {
        const modal = document.getElementById('voice-modal');
        if (modal) {
            modal.style.display = 'none';
            voiceModalOpen = false;
        }
    }

    // 创建语音条输入弹窗
    function createVoiceModal() {
        const modal = document.createElement('div');
        modal.id = 'voice-modal';
        modal.className = 'voice-modal';
        modal.innerHTML = `
            <div class="voice-modal-backdrop"></div>
            <div class="voice-modal-content">
                <div class="voice-modal-header">
                    <h3 class="voice-modal-title">发送语音条</h3>
                    <button class="voice-modal-close" title="关闭">×</button>
                </div>
                <div class="voice-modal-body">
                    <textarea class="voice-input" id="voice-input" placeholder="输入语音内容..." rows="6"></textarea>
                    <div class="voice-duration-control">
                        <label for="voice-duration-input">时长（秒）：</label>
                        <input type="number" id="voice-duration-input" min="1" max="300" value="1" class="voice-duration-input">
                    </div>
                    <div class="voice-tips">
                        <div class="voice-tip-item">按 Ctrl+Enter 快速发送</div>
                    </div>
                </div>
                <div class="voice-modal-footer">
                    <button class="voice-cancel-btn">取消</button>
                    <button class="voice-send-btn">发送</button>
                </div>
            </div>
        `;

        // 绑定取消按钮
        const cancelBtn = modal.querySelector('.voice-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeVoiceModal);
        }

        return modal;
    }

    // 发送语音消息
    function sendVoiceMessage() {
        const input = document.getElementById('voice-input');
        const durationInput = document.getElementById('voice-duration-input');
        const text = input.value.trim();
        const duration = durationInput ? parseInt(durationInput.value) || 1 : 1;

        if (!text) {
            alert('请输入语音内容');
            return;
        }

        // 获取当前对话
        if (!AppState.currentChat) {
            alert('请先打开一个对话');
            return;
        }

        const convId = AppState.currentChat.id;

        // 创建语音消息对象
        const voiceMsg = {
            id: generateMessageId(),
            conversationId: convId,
            type: 'voice',
            content: text,
            sender: 'sent',
            duration: duration,
            timestamp: new Date().toISOString()
        };

        // 保存语音消息
        voiceMessages.set(voiceMsg.id, {
            text: text,
            duration: duration,
            type: 'voice'
        });

        // 将消息添加到对话
        if (!AppState.messages[convId]) {
            AppState.messages[convId] = [];
        }
        AppState.messages[convId].push(voiceMsg);

        // 保存到本地存储
        if (typeof saveToStorage === 'function') {
            saveToStorage();
        }

        // 重新渲染对话消息
        if (typeof renderChatMessages === 'function') {
            renderChatMessages();
        }

        // 关闭弹窗
        closeVoiceModal();

        // 触发AI回复
        if (typeof callApiWithConversation === 'function') {
            callApiWithConversation();
        }
    }

    // 显示语音转文字内容
    function showVoiceTranscript(text, voiceBubbleEl) {
        // voiceBubbleEl 就是 .voice-bubble 元素
        if (!voiceBubbleEl) {
            return;
        }

        // 检查是否已经显示过转录
        let existingTranscript = voiceBubbleEl.querySelector('.voice-transcript');
        if (existingTranscript) {
            // 第二次点击，隐藏转录
            existingTranscript.remove();
            return;
        }

        // 创建转录显示元素 - 插入到voice-bubble内部的下方
        const transcriptDiv = document.createElement('div');
        transcriptDiv.className = 'voice-transcript';
        transcriptDiv.textContent = text;

        // 直接添加到voice-bubble的末尾
        voiceBubbleEl.appendChild(transcriptDiv);
    }

    // AI回复语音消息
    function sendAIVoiceMessage(conversationId, text, duration = 1) {
        const voiceMsg = {
            id: generateMessageId(),
            conversationId: conversationId,
            type: 'voice',
            content: text,
            sender: 'received',
            duration: duration,
            timestamp: new Date().toISOString()
        };

        // 保存语音消息
        voiceMessages.set(voiceMsg.id, {
            text: text,
            duration: duration,
            type: 'voice'
        });

        // 将消息添加到对话
        if (!AppState.messages[conversationId]) {
            AppState.messages[conversationId] = [];
        }
        AppState.messages[conversationId].push(voiceMsg);

        // 保存到本地存储
        if (typeof saveToStorage === 'function') {
            saveToStorage();
        }

        // 重新渲染对话消息
        if (typeof renderChatMessages === 'function') {
            renderChatMessages();
        }
    }

    // 生成消息ID
    function generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 转义HTML字符
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // 显示通知
    function showNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = 'voice-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);
    }

    // 获取消息中的语音内容
    function getVoiceContent(messageId) {
        const voiceData = voiceMessages.get(messageId);
        return voiceData ? voiceData.text : null;
    }

    // 检查消息是否是语音类型
    function isVoiceMessage(message) {
        return message && message.type === 'voice';
    }

    // 获取对话的语音消息列表
    function getVoiceMessagesForConversation(convId) {
        if (!AppState.messages[convId]) return [];
        return AppState.messages[convId].filter(msg => isVoiceMessage(msg));
    }

    // 导出语音条的完整记录
    function exportVoiceTranscripts(convId) {
        const messages = getVoiceMessagesForConversation(convId);
        const transcripts = messages.map(msg => ({
            id: msg.id,
            sender: msg.sender,
            timestamp: msg.timestamp,
            voiceText: msg.content
        }));
        return transcripts;
    }

    // 清空所有语音消息数据
    function clearVoiceMessages() {
        voiceMessages.clear();
    }

    // 对外公开的接口
    return {
        init: init,
        openVoiceModal: openVoiceModal,
        closeVoiceModal: closeVoiceModal,
        sendVoiceMessage: sendVoiceMessage,
        sendAIVoiceMessage: sendAIVoiceMessage,
        showVoiceTranscript: showVoiceTranscript,
        getVoiceContent: getVoiceContent,
        isVoiceMessage: isVoiceMessage,
        getVoiceMessagesForConversation: getVoiceMessagesForConversation,
        exportVoiceTranscripts: exportVoiceTranscripts,
        clearVoiceMessages: clearVoiceMessages
    };
})();

// 在DOMContentLoaded时初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof VoiceMessageModule !== 'undefined') {
            VoiceMessageModule.init();
        }
    });
} else {
    if (typeof VoiceMessageModule !== 'undefined') {
        VoiceMessageModule.init();
    }
}
