
/**
 * QQ风格语音通话系统
 * 完整实现语音通话功能，包括通话界面、悬浮窗、AI主动呼叫等
 */

(function() {
    'use strict';
    
    // 通话状态管理
    const callState = {
        isInCall: false,
        isMinimized: false,
        callStartTime: null,
        callDuration: 0,
        timerInterval: null,
        isMuted: false,
        isSpeakerOn: true,
        callType: 'outgoing', // 'outgoing' | 'incoming'
        callerId: null,
        callerName: null,
        callerAvatar: null
    };
    
    // 通话历史记录
    const callHistory = [];
    
    /**
     * 初始化语音通话系统
     */
    function initVoiceCallSystem() {
        console.log('[VoiceCall] 初始化语音通话系统');
        
        // 创建通话界面
        createCallInterface();
        
        // 创建来电弹窗
        createIncomingCallModal();
        
        // 暴露全局方法
        window.VoiceCallSystem = {
            startCall: startOutgoingCall,
            receiveCall: receiveIncomingCall,
            endCall: endCall,
            getCallHistory: () => callHistory
        };
        
        console.log('[VoiceCall] 语音通话系统初始化完成');
    }
    
    /**
     * 创建通话界面HTML
     */
    function createCallInterface() {
        const existingInterface = document.getElementById('voice-call-interface');
        if (existingInterface) {
            existingInterface.remove();
        }
        
        const callInterface = document.createElement('div');
        callInterface.id = 'voice-call-interface';
        callInterface.className = 'voice-call-interface';
        callInterface.innerHTML = `
            <!-- 通话主界面 -->
            <div class="call-main-view">
                <!-- 顶部栏 -->
                <div class="call-header">
                    <button class="call-minimize-btn" id="call-minimize-btn">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path d="M19 13H5v-2h14v2z" fill="currentColor"/>
                        </svg>
                    </button>
                    <span class="call-status-text">语音通话中</span>
                    <div style="width: 32px;"></div>
                </div>
                
                <!-- 中间内容区 -->
                <div class="call-content">
                    <!-- 角色信息 -->
                    <div class="call-user-info">
                        <div class="call-avatar-wrapper">
                            <img class="call-avatar" id="call-avatar" src="" alt="avatar">
                            <div class="call-avatar-ring"></div>
                        </div>
                        <div class="call-username" id="call-username">AI助手</div>
                    </div>
                    
                    <!-- 通话内聊天框 -->
                    <div class="call-chat-container">
                        <div class="call-chat-messages" id="call-chat-messages"></div>
                        <div class="call-chat-input-area">
                            <input type="text" class="call-chat-input" id="call-chat-input" placeholder="在通话中发送消息...">
                            <button class="call-chat-send-btn" id="call-chat-send-btn">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- 底部控制栏 -->
                <div class="call-controls">
                    <!-- 通话时长 -->
                    <div class="call-duration" id="call-duration">00:00</div>
                    
                    <!-- 控制按钮 -->
                    <div class="call-buttons">
                        <button class="call-control-btn" id="call-mute-btn" title="麦克风">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="currentColor"/>
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="currentColor"/>
                            </svg>
                            <span class="call-btn-label">麦克风</span>
                        </button>
                        
                        <button class="call-control-btn" id="call-speaker-btn" title="外放">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="currentColor"/>
                            </svg>
                            <span class="call-btn-label">外放</span>
                        </button>
                        
                        <button class="call-control-btn call-end-btn" id="call-end-btn" title="挂断">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" fill="currentColor"/>
                            </svg>
                            <span class="call-btn-label">挂断</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 最小化悬浮窗 -->
            <div class="call-floating-window" id="call-floating-window">
                <div class="floating-avatar-wrapper">
                    <img class="floating-avatar" id="floating-avatar" src="" alt="avatar">
                    <div class="floating-pulse"></div>
                </div>
                <div class="floating-duration" id="floating-duration">00:00</div>
            </div>
        `;
        
        document.body.appendChild(callInterface);
        
        // 绑定事件
        bindCallInterfaceEvents();
    }
    
    /**
     * 创建来电弹窗
     */
    function createIncomingCallModal() {
        const existingModal = document.getElementById('incoming-call-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'incoming-call-modal';
        modal.className = 'incoming-call-modal';
        modal.innerHTML = `
            <div class="incoming-call-content">
                <div class="incoming-call-avatar-wrapper">
                    <img class="incoming-call-avatar" id="incoming-avatar" src="" alt="avatar">
                    <div class="incoming-call-ring"></div>
                </div>
                <div class="incoming-call-name" id="incoming-name">AI助手</div>
                <div class="incoming-call-label">邀请你进行语音通话</div>
                
                <div class="incoming-call-buttons">
                    <button class="incoming-btn incoming-reject-btn" id="incoming-reject-btn">
                        <svg viewBox="0 0 24 24" width="28" height="28">
                            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" fill="currentColor"/>
                        </svg>
                        <span>拒绝</span>
                    </button>
                    <button class="incoming-btn incoming-accept-btn" id="incoming-accept-btn">
                        <svg viewBox="0 0 24 24" width="28" height="28">
                            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" fill="currentColor"/>
                        </svg>
                        <span>接听</span>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定事件
        document.getElementById('incoming-accept-btn').addEventListener('click', acceptIncomingCall);
        document.getElementById('incoming-reject-btn').addEventListener('click', rejectIncomingCall);
    }
    
    /**
     * 绑定通话界面事件
     */
    function bindCallInterfaceEvents() {
        // 最小化按钮
        document.getElementById('call-minimize-btn').addEventListener('click', minimizeCall);
        
        // 悬浮窗点击（恢复）
        document.getElementById('call-floating-window').addEventListener('click', restoreCall);
        
        // 麦克风按钮
        document.getElementById('call-mute-btn').addEventListener('click', toggleMute);
        
        // 外放按钮
        document.getElementById('call-speaker-btn').addEventListener('click', toggleSpeaker);
        
        // 挂断按钮
        document.getElementById('call-end-btn').addEventListener('click', endCall);
        
        // 聊天输入
        const chatInput = document.getElementById('call-chat-input');
        const sendBtn = document.getElementById('call-chat-send-btn');
        
        sendBtn.addEventListener('click', sendCallMessage);
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendCallMessage();
            }
        });
    }
    
    /**
     * 发起呼叫 - 显示确认弹窗
     */
    function startOutgoingCall() {
        if (callState.isInCall) {
            showToast('当前正在通话中');
            return;
        }
        
        console.log('[VoiceCall] 准备发起语音通话');
        
        // 从AppState获取当前角色信息
        const currentChat = window.AppState?.currentChat;
        if (!currentChat) {
            showToast('请先打开一个聊天会话');
            return;
        }
        
        const characterName = currentChat.remark || currentChat.name || 'AI助手';
        const characterAvatar = currentChat.avatar || getCharacterAvatar();
        
        console.log('[VoiceCall] 角色信息:', characterName, characterAvatar);
        
        // 显示拨通确认弹窗
        showCallConfirmModal(characterName, characterAvatar);
    }
    
    /**
     * 确认拨通后开始呼叫
     */
    function confirmAndStartCall(characterName, characterAvatar) {
        console.log('[VoiceCall] 开始拨通:', characterName);
        
        callState.callType = 'outgoing';
        callState.callerName = characterName;
        callState.callerAvatar = characterAvatar;
        
        // 显示拨通中界面
        showCallingInterface(characterName, characterAvatar);
        
        // 模拟拨通等待过程（1.5-3秒随机）
        const waitTime = 1500 + Math.random() * 1500;
        setTimeout(() => {
            // 拨通成功
            callConnected(characterName, characterAvatar);
        }, waitTime);
    }
    
    /**
     * 通话接通
     */
    function callConnected(characterName, characterAvatar) {
        console.log('[VoiceCall] 通话已接通');
        
        callState.isInCall = true;
        callState.callStartTime = Date.now();
        
        // 切换到通话界面
        showCallInterface(characterName, characterAvatar);
        
        // 更新聊天页面状态
        updateChatPageCallStatus(true, characterName);
        
        // 开始计时
        startCallTimer();
        
        // 添加系统消息
        addCallSystemMessage('通话已接通');
        
        showToast('语音通话已接通');
        
        // AI主动打招呼
        setTimeout(() => {
            triggerAIGreeting();
        }, 800);
        
        // 开始AI随机回复机制
        startAIRandomReply();
    }
    
    /**
     * 接收来电（AI主动呼叫）
     */
    function receiveIncomingCall(characterName, characterAvatar) {
        if (callState.isInCall) {
            console.log('⚠️ 当前正在通话中，拒绝新来电');
            return;
        }
        
        console.log('[VoiceCall] 收到来电:', characterName);
        
        callState.callType = 'incoming';
        callState.callerName = characterName;
        callState.callerAvatar = characterAvatar;
        
        // 显示来电弹窗
        const modal = document.getElementById('incoming-call-modal');
        const avatar = document.getElementById('incoming-avatar');
        const name = document.getElementById('incoming-name');
        
        avatar.src = characterAvatar;
        name.textContent = characterName;
        
        modal.classList.add('show');
        
        // 播放铃声（可选）
        playRingtone();
    }
    
    /**
     * 接听来电
     */
    function acceptIncomingCall() {
        console.log('[VoiceCall] 接听来电');
        
        // 隐藏来电弹窗
        const modal = document.getElementById('incoming-call-modal');
        modal.classList.remove('show');
        
        // 停止铃声
        stopRingtone();
        
        callState.isInCall = true;
        callState.callStartTime = Date.now();
        
        // 显示通话界面
        showCallInterface(callState.callerName, callState.callerAvatar);
        
        // 更新聊天页面状态
        updateChatPageCallStatus(true, callState.callerName);
        
        // 开始计时
        startCallTimer();
        
        // 添加系统消息
        addCallSystemMessage('通话已接通');
        
        showToast('语音通话已接通');
        
        // AI主动打招呼
        setTimeout(() => {
            triggerAIGreeting();
        }, 800);
        
        // 开始AI随机回复机制
        startAIRandomReply();
    }
    
    /**
     * 拒绝来电
     */
    function rejectIncomingCall() {
        console.log('❌ 拒绝来电');
        
        // 隐藏来电弹窗
        const modal = document.getElementById('incoming-call-modal');
        modal.classList.remove('show');
        
        // 停止铃声
        stopRingtone();
        
        // 记录到聊天
        addCallRecordToChat('已拒绝', 0);
        
        showToast('已拒绝来电');
    }
    
    /**
     * 显示通话界面
     */
    function showCallInterface(name, avatar) {
        const callInterface = document.getElementById('voice-call-interface');
        const callAvatar = document.getElementById('call-avatar');
        const callUsername = document.getElementById('call-username');
        const floatingAvatar = document.getElementById('floating-avatar');
        
        callAvatar.src = avatar;
        callUsername.textContent = name;
        floatingAvatar.src = avatar;
        
        // 清空聊天记录
        document.getElementById('call-chat-messages').innerHTML = '';
        
        callInterface.classList.add('show');
    }
    
    /**
     * 最小化通话
     */
    function minimizeCall() {
        console.log('[VoiceCall] 最小化通话');
        
        const callInterface = document.getElementById('voice-call-interface');
        const floatingWindow = document.getElementById('call-floating-window');
        
        console.log('[VoiceCall] 悬浮窗元素:', floatingWindow);
        console.log('[VoiceCall] 悬浮窗当前类名:', floatingWindow?.className);
        
        callInterface.classList.remove('show');
        floatingWindow.classList.add('show');
        
        console.log('[VoiceCall] 添加show后的类名:', floatingWindow?.className);
        console.log('[VoiceCall] 悬浮窗样式 display:', window.getComputedStyle(floatingWindow).display);
        console.log('[VoiceCall] 悬浮窗样式 opacity:', window.getComputedStyle(floatingWindow).opacity);
        console.log('[VoiceCall] 悬浮窗样式 z-index:', window.getComputedStyle(floatingWindow).zIndex);
        
        callState.isMinimized = true;
    }
    
    /**
     * 恢复通话界面
     */
    function restoreCall() {
        console.log('📂 恢复通话界面');
        
        const callInterface = document.getElementById('voice-call-interface');
        const floatingWindow = document.getElementById('call-floating-window');
        
        floatingWindow.classList.remove('show');
        callInterface.classList.add('show');
        
        callState.isMinimized = false;
    }
    
    /**
     * 切换静音
     */
    function toggleMute() {
        callState.isMuted = !callState.isMuted;
        const btn = document.getElementById('call-mute-btn');
        
        if (callState.isMuted) {
            btn.classList.add('muted');
            showToast('麦克风已关闭');
        } else {
            btn.classList.remove('muted');
            showToast('麦克风已开启');
        }
    }
    
    /**
     * 切换外放
     */
    function toggleSpeaker() {
        callState.isSpeakerOn = !callState.isSpeakerOn;
        const btn = document.getElementById('call-speaker-btn');
        
        if (callState.isSpeakerOn) {
            btn.classList.add('active');
            showToast('外放已开启');
        } else {
            btn.classList.remove('active');
            showToast('外放已关闭');
        }
    }
    
    /**
     * 结束通话
     */
    function endCall() {
        if (!callState.isInCall) return;
        
        console.log('[VoiceCall] 结束通话');
        
        // 停止计时
        stopCallTimer();
        
        // 计算通话时长
        const duration = Math.floor((Date.now() - callState.callStartTime) / 1000);
        
        // 隐藏界面
        const callInterface = document.getElementById('voice-call-interface');
        const floatingWindow = document.getElementById('call-floating-window');
        
        callInterface.classList.remove('show');
        floatingWindow.classList.remove('show');
        
        // 记录通话历史
        addCallRecordToChat(callState.callType === 'incoming' ? '通话时长' : '通话时长', duration);
        
        // 重置状态
        resetCallState();
        
        showToast('通话已结束');
    }
    
    /**
     * 开始计时
     */
    function startCallTimer() {
        callState.callDuration = 0;
        callState.timerInterval = setInterval(() => {
            callState.callDuration++;
            updateCallDuration();
        }, 1000);
    }
    
    /**
     * 停止计时
     */
    function stopCallTimer() {
        if (callState.timerInterval) {
            clearInterval(callState.timerInterval);
            callState.timerInterval = null;
        }
    }
    
    /**
     * 更新通话时长显示
     */
    function updateCallDuration() {
        const duration = formatDuration(callState.callDuration);
        document.getElementById('call-duration').textContent = duration;
        document.getElementById('floating-duration').textContent = duration;
    }
    
    /**
     * 格式化时长
     */
    function formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    
    /**
     * 发送通话内消息
     */
    function sendCallMessage() {
        const input = document.getElementById('call-chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        console.log('💬 发送通话内消息:', message);
        
        // 添加用户消息到通话聊天
        addCallMessage('user', message);
        
        // 清空输入框
        input.value = '';
        
        // 调用AI回复（包含通话上下文）
        callAIInCall(message);
    }
    
    /**
     * 在通话中调用AI
     */
    async function callAIInCall(userMessage) {
        try {
            // 获取最近30条对话作为上下文
            const context = getRecentChatContext(30);
            
            // 获取角色设定
            const characterSettings = window.currentCharacterSettings || {};
            const userSettings = getUserSettings();
            
            // 构建提示词
            const systemPrompt = `你正在与用户进行语音通话。
角色设定: ${characterSettings.personality || '友好的AI助手'}
用户设定: ${userSettings.name || '用户'}
当前状态: 语音通话中

最近的聊天记录:
${context}

请用简短、口语化的方式回复，就像在打电话一样。`;
            
            // 调用主API管理器
            if (window.MainAPIManager && typeof window.MainAPIManager.callApiWithConversation === 'function') {
                addCallMessage('ai', '正在输入...');
                
                const response = await window.MainAPIManager.callApiWithConversation(
                    userMessage,
                    systemPrompt
                );
                
                // 移除"正在输入"
                removeTypingIndicator();
                
                // 添加AI回复
                addCallMessage('ai', response);
            } else {
                addCallMessage('ai', '抱歉，通话功能暂时不可用。');
            }
        } catch (error) {
            console.error('❌ AI回复失败:', error);
            removeTypingIndicator();
            addCallMessage('ai', '抱歉，我遇到了一些问题。');
        }
    }
    
    /**
     * 添加消息到通话聊天
     */
    function addCallMessage(type, content) {
        const messagesContainer = document.getElementById('call-chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `call-chat-message call-chat-message-${type}`;
        
        if (type === 'system') {
            messageDiv.innerHTML = `<span class="call-chat-system-text">${content}</span>`;
        } else {
            messageDiv.innerHTML = `
                <div class="call-chat-bubble">
                    <div class="call-chat-text">${escapeHtml(content)}</div>
                </div>
            `;
        }
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * 添加系统消息
     */
    function addCallSystemMessage(content) {
        addCallMessage('system', content);
    }
    
    /**
     * 移除"正在输入"指示器
     */
    function removeTypingIndicator() {
        const messagesContainer = document.getElementById('call-chat-messages');
        const lastMessage = messagesContainer.lastElementChild;
        if (lastMessage && lastMessage.textContent.includes('正在输入')) {
            lastMessage.remove();
        }
    }
    
    /**
     * 获取最近的聊天上下文
     */
    function getRecentChatContext(count = 30) {
        const chatMessages = document.querySelectorAll('.chat-bubble');
        const recentMessages = Array.from(chatMessages).slice(-count);
        
        return recentMessages.map(bubble => {
            const isUser = bubble.classList.contains('user-bubble');
            const text = bubble.querySelector('.chat-text')?.textContent || '';
            return `${isUser ? '用户' : 'AI'}: ${text}`;
        }).join('\n');
    }
    
    /**
     * 获取用户设定
     */
    function getUserSettings() {
        const currentChat = window.AppState?.currentChat;
        const userName = currentChat?.userNameForChar || window.AppState?.user?.name || '用户';
        const userPersonality = window.AppState?.user?.personality || '';
        
        return {
            name: userName,
            personality: userPersonality
        };
    }
    
    /**
     * 获取角色头像
     */
    function getCharacterAvatar() {
        // 优先从AppState获取
        const currentConv = window.AppState?.currentChat;
        if (currentConv?.avatar) {
            return currentConv.avatar;
        }
        
        // 尝试从DOM获取
        const avatarImg = document.querySelector('.chat-avatar img');
        if (avatarImg && avatarImg.src) {
            return avatarImg.src;
        }
        
        // 返回默认头像
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23ff9a9e"/></svg>';
    }
    
    /**
     * 添加通话记录到聊天
     */
    function addCallRecordToChat(status, duration) {
        // 调用主应用的添加消息方法
        if (window.addMessageToChatUI) {
            const durationText = duration > 0 ? formatDuration(duration) : '';
            const recordHTML = `
                <div class="call-record-message">
                    <div class="call-record-icon">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div class="call-record-content">
                        <div class="call-record-title">语音通话</div>
                        <div class="call-record-detail">${status} ${durationText}</div>
                    </div>
                </div>
            `;
            
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble system-bubble';
            bubble.innerHTML = recordHTML;
            
            const chatArea = document.getElementById('chat-messages-area');
            if (chatArea) {
                chatArea.appendChild(bubble);
                chatArea.scrollTop = chatArea.scrollHeight;
            }
        }
        
        // 添加到历史记录
        callHistory.push({
            type: callState.callType,
            name: callState.callerName,
            status: status,
            duration: duration,
            timestamp: Date.now()
        });
    }
    
    /**
     * 重置通话状态
     */
    function resetCallState() {
        callState.isInCall = false;
        callState.isMinimized = false;
        callState.callStartTime = null;
        callState.callDuration = 0;
        callState.isMuted = false;
        callState.isSpeakerOn = true;
        callState.callType = 'outgoing';
        callState.callerName = null;
        callState.callerAvatar = null;
        
        // 重置按钮状态
        document.getElementById('call-mute-btn')?.classList.remove('muted');
        document.getElementById('call-speaker-btn')?.classList.remove('active');
    }
    
    /**
     * 播放铃声
     */
    function playRingtone() {
        // 可以在这里添加实际的铃声播放逻辑
        console.log('🔔 播放铃声');
    }
    
    /**
     * 停止铃声
     */
    function stopRingtone() {
        console.log('🔕 停止铃声');
    }
    
    /**
     * HTML转义
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
    
    // ========================================
    // 新增功能：拨通确认、等待动画、AI主动回复
    // ========================================
    
    /**
     * 显示拨通确认弹窗
     */
    function showCallConfirmModal(characterName, characterAvatar) {
        // 创建或获取确认弹窗
        let modal = document.getElementById('call-confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'call-confirm-modal';
            modal.className = 'call-confirm-modal';
            modal.innerHTML = `
                <div class="call-confirm-content">
                    <div class="call-confirm-avatar-wrapper">
                        <img class="call-confirm-avatar" id="confirm-avatar" src="" alt="avatar">
                    </div>
                    <div class="call-confirm-name" id="confirm-name"></div>
                    <div class="call-confirm-text">确定要拨打语音通话吗？</div>
                    <div class="call-confirm-buttons">
                        <button class="call-confirm-btn call-confirm-cancel" id="confirm-cancel-btn">取消</button>
                        <button class="call-confirm-btn call-confirm-ok" id="confirm-ok-btn">拨打</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // 绑定事件
            document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
                modal.classList.remove('show');
            });
            
            document.getElementById('confirm-ok-btn').addEventListener('click', () => {
                modal.classList.remove('show');
                confirmAndStartCall(characterName, characterAvatar);
            });
        }
        
        // 更新内容
        document.getElementById('confirm-avatar').src = characterAvatar;
        document.getElementById('confirm-name').textContent = characterName;
        
        // 显示
        modal.classList.add('show');
    }
    
    /**
     * 显示拨通中界面
     */
    function showCallingInterface(characterName, characterAvatar) {
        // 创建或获取拨通中界面
        let callingInterface = document.getElementById('calling-interface');
        if (!callingInterface) {
            callingInterface = document.createElement('div');
            callingInterface.id = 'calling-interface';
            callingInterface.className = 'calling-interface';
            callingInterface.innerHTML = `
                <div class="calling-content">
                    <div class="calling-avatar-wrapper">
                        <img class="calling-avatar" id="calling-avatar" src="" alt="avatar">
                        <div class="calling-ring"></div>
                        <div class="calling-ring-2"></div>
                    </div>
                    <div class="calling-name" id="calling-name"></div>
                    <div class="calling-status">正在呼叫中...</div>
                    <button class="calling-cancel-btn" id="calling-cancel-btn">
                        <svg viewBox="0 0 24 24" width="28" height="28">
                            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" fill="currentColor"/>
                        </svg>
                        <span>取消</span>
                    </button>
                </div>
            `;
            document.body.appendChild(callingInterface);
            
            // 绑定取消按钮
            document.getElementById('calling-cancel-btn').addEventListener('click', () => {
                callingInterface.classList.remove('show');
                showToast('已取消通话');
            });
        }
        
        // 更新内容
        document.getElementById('calling-avatar').src = characterAvatar;
        document.getElementById('calling-name').textContent = characterName;
        
        // 显示
        callingInterface.classList.add('show');
    }
    
    /**
     * 更新聊天页面通话状态
     */
    function updateChatPageCallStatus(isInCall, characterName) {
        const chatHeader = document.querySelector('.chat-header');
        if (!chatHeader) return;
        
        // 移除旧的通话状态
        const oldStatus = chatHeader.querySelector('.chat-call-status');
        if (oldStatus) {
            oldStatus.remove();
        }
        
        if (isInCall) {
            // 添加通话中状态
            const statusDiv = document.createElement('div');
            statusDiv.className = 'chat-call-status';
            statusDiv.innerHTML = `
                <div class="call-status-indicator">
                    <span class="call-status-dot"></span>
                    <span class="call-status-text">通话中</span>
                </div>
            `;
            
            const chatName = chatHeader.querySelector('.chat-name');
            if (chatName) {
                chatName.parentNode.insertBefore(statusDiv, chatName.nextSibling);
            }
        }
    }
    
    /**
     * AI打招呼（通话接通时）
     */
    function triggerAIGreeting() {
        const greetings = [
            '喂？听得到吗？',
            '嗨~',
            '接通啦！',
            '你好呀~',
            '诶，在吗？'
        ];
        const greeting = greetings[Math.floor(Math.random() * greetings.length)];
        callAIInCall(greeting, true);
    }
    
    // AI随机回复计时器
    let aiRandomReplyTimer = null;
    
    /**
     * 开始AI随机主动回复
     */
    function startAIRandomReply() {
        // 清除旧的计时器
        stopAIRandomReply();
        
        // 设置随机回复
        function scheduleNextReply() {
            // 15-45秒随机间隔
            const delay = 15000 + Math.random() * 30000;
            
            aiRandomReplyTimer = setTimeout(() => {
                if (callState.isInCall) {
                    // 随机主动话题
                    const topics = [
                        '对了，你那边怎么样？',
                        '嗯...我在想...',
                        '话说...',
                        '诶，刚刚想到一件事',
                        '你有空吗？',
                        '最近怎么样呀？'
                    ];
                    const topic = topics[Math.floor(Math.random() * topics.length)];
                    callAIInCall(topic, true);
                    
                    // 安排下一次
                    scheduleNextReply();
                }
            }, delay);
        }
        
        // 开始第一次调度
        scheduleNextReply();
    }
    
    /**
     * 停止AI随机回复
     */
    function stopAIRandomReply() {
        if (aiRandomReplyTimer) {
            clearTimeout(aiRandomReplyTimer);
            aiRandomReplyTimer = null;
        }
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVoiceCallSystem);
    } else {
        initVoiceCallSystem();
    }
    
})();