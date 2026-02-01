
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
        callerAvatar: null,
        callingTimeout: null // 拨通等待的定时器
    };
    
    // 通话历史记录
    const callHistory = [];
    
    // 当前通话的对话记录
    let currentCallConversation = [];
    
    // 铃声管理
    let ringtoneAudio = null;
    const RINGTONE_STORAGE_KEY = 'voiceCallRingtones';
    
    // AI消息队列系统
    let isAIResponding = false;
    let aiRandomReplyTimer = null;
    let messageQueue = [];
    let isProcessingQueue = false;
    
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
            getCallHistory: () => callHistory,
            // 新增：获取当前通话状态和上下文
            isInCall: () => callState.isInCall,
            getCurrentCallerId: () => callState.callerId,
            getCurrentCallConversation: () => currentCallConversation
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
                    <button class="call-ringtone-btn" id="call-ringtone-btn" title="设置铃声">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                        </svg>
                    </button>
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
                            <input type="text" class="call-chat-input" id="call-chat-input" placeholder="">
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
            
        `;
        
        document.body.appendChild(callInterface);
        
        // 创建独立的悬浮窗（不在通话界面内部，避免被父容器隐藏）
        const floatingWindow = document.createElement('div');
        floatingWindow.id = 'call-floating-window';
        floatingWindow.className = 'call-floating-window';
        floatingWindow.innerHTML = `
            <div class="floating-avatar-wrapper">
                <img class="floating-avatar" id="floating-avatar" src="" alt="avatar">
                <div class="floating-pulse"></div>
            </div>
            <div class="floating-duration" id="floating-duration">00:00</div>
        `;
        document.body.appendChild(floatingWindow);
        
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
        
        // 铃声设置按钮
        document.getElementById('call-ringtone-btn').addEventListener('click', openRingtoneSettings);
        
        // 悬浮窗拖拽和点击
        const floatingWindow = document.getElementById('call-floating-window');
        initFloatingWindowDrag(floatingWindow);
        
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
     * 初始化悬浮窗拖拽功能（支持触摸和鼠标）
     */
    function initFloatingWindowDrag(floatingWindow) {
        let isDragging = false;
        let startX, startY;
        let initialX, initialY;
        let hasMoved = false;
        
        // 鼠标事件
        floatingWindow.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        
        // 触摸事件（移动端）
        floatingWindow.addEventListener('touchstart', dragStart, { passive: false });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', dragEnd);
        
        function dragStart(e) {
            isDragging = true;
            hasMoved = false;
            
            // 获取初始位置
            const rect = floatingWindow.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            // 获取鼠标/触摸起始位置
            if (e.type === 'touchstart') {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
                e.preventDefault();
            }
            
            floatingWindow.style.transition = 'none';
        }
        
        function drag(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            hasMoved = true;
            
            let currentX, currentY;
            if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX;
                currentY = e.touches[0].clientY;
            } else {
                currentX = e.clientX;
                currentY = e.clientY;
            }
            
            // 计算移动距离
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            
            // 计算新位置
            let newX = initialX + deltaX;
            let newY = initialY + deltaY;
            
            // 边界限制
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const elementWidth = floatingWindow.offsetWidth;
            const elementHeight = floatingWindow.offsetHeight;
            
            newX = Math.max(0, Math.min(newX, windowWidth - elementWidth));
            newY = Math.max(0, Math.min(newY, windowHeight - elementHeight));
            
            // 应用新位置
            floatingWindow.style.left = newX + 'px';
            floatingWindow.style.top = newY + 'px';
            floatingWindow.style.right = 'auto';
        }
        
        function dragEnd(e) {
            if (!isDragging) return;
            
            isDragging = false;
            floatingWindow.style.transition = 'all 0.3s ease';
            
            // 如果没有移动，则视为点击，恢复通话界面
            if (!hasMoved) {
                restoreCall();
            }
        }
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
        
        // 正确获取角色信息
        const characterId = currentChat.id;
        
        // 优先使用备注名，其次使用角色名，最后用ID
        let characterName = 'AI助手';
        if (currentChat.remark && currentChat.remark.trim()) {
            characterName = currentChat.remark.trim();
        } else if (currentChat.name && currentChat.name.trim()) {
            characterName = currentChat.name.trim();
        }
        
        // 获取头像，确保有效
        let characterAvatar = '';
        if (currentChat.avatar && currentChat.avatar.trim()) {
            characterAvatar = currentChat.avatar.trim();
        } else {
            characterAvatar = getCharacterAvatar();
        }
        
        console.log('[VoiceCall] ===== 拨打语音通话 =====');
        console.log('[VoiceCall] 当前聊天对象:', {
            id: characterId,
            name: characterName,
            remark: currentChat.remark,
            originalName: currentChat.name,
            avatar: characterAvatar ? characterAvatar.substring(0, 50) + '...' : 'none'
        });
        console.log('[VoiceCall] AppState.currentChat完整对象:', currentChat);
        
        // 显示拨通确认弹窗
        showCallConfirmModal(characterId, characterName, characterAvatar);
    }
    
    /**
     * 确认拨通后开始呼叫
     */
    function confirmAndStartCall(characterId, characterName, characterAvatar) {
        console.log('[VoiceCall] ===== 确认并开始拨通 =====');
        console.log('[VoiceCall] 参数:', {
            id: characterId,
            name: characterName,
            avatar: characterAvatar ? characterAvatar.substring(0, 50) + '...' : 'none'
        });
        
        callState.callType = 'outgoing';
        callState.callerId = characterId;
        callState.callerName = characterName;
        callState.callerAvatar = characterAvatar;
        
        console.log('[VoiceCall] callState已更新:', {
            callerId: callState.callerId,
            callerName: callState.callerName,
            callerAvatar: callState.callerAvatar ? callState.callerAvatar.substring(0, 50) + '...' : 'none'
        });
        
        // 显示拨通中界面
        showCallingInterface(characterName, characterAvatar);
        
        // 模拟拨通等待过程（1.5-3秒随机）
        const waitTime = 1500 + Math.random() * 1500;
        callState.callingTimeout = setTimeout(() => {
            // 拨通成功
            callConnected(characterName, characterAvatar);
        }, waitTime);
    }
    
    /**
     * 通话接通
     */
    function callConnected(characterName, characterAvatar) {
        console.log('[VoiceCall] 通话已接通');
        
        // 隐藏拨通中界面
        const callingInterface = document.getElementById('calling-interface');
        if (callingInterface) {
            callingInterface.classList.remove('show');
        }
        
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
        console.log('[VoiceCall] ===== 显示通话界面 =====');
        console.log('[VoiceCall] 显示参数:', {
            name: name,
            avatar: avatar ? avatar.substring(0, 50) + '...' : 'none'
        });
        
        const callInterface = document.getElementById('voice-call-interface');
        const callAvatar = document.getElementById('call-avatar');
        const callUsername = document.getElementById('call-username');
        const floatingAvatar = document.getElementById('floating-avatar');
        
        if (callAvatar) {
            callAvatar.src = avatar;
            console.log('[VoiceCall] 已设置 call-avatar.src:', avatar ? avatar.substring(0, 50) + '...' : 'none');
        }
        
        if (callUsername) {
            callUsername.textContent = name;
            console.log('[VoiceCall] 已设置 call-username.textContent:', name);
        }
        
        if (floatingAvatar) {
            floatingAvatar.src = avatar;
            console.log('[VoiceCall] 已设置 floating-avatar.src:', avatar ? avatar.substring(0, 50) + '...' : 'none');
        }
        
        // 清空聊天记录
        document.getElementById('call-chat-messages').innerHTML = '';
        
        callInterface.classList.add('show');
        
        console.log('[VoiceCall] 通话界面已显示');
    }
    
    /**
     * 最小化通话
     */
    function minimizeCall() {
        console.log('[VoiceCall] 最小化通话');
        
        const callInterface = document.getElementById('voice-call-interface');
        const floatingWindow = document.getElementById('call-floating-window');
        
        if (!floatingWindow) {
            console.error('[VoiceCall] 错误：找不到悬浮窗元素！');
            return;
        }
        
        console.log('[VoiceCall] 悬浮窗元素存在:', floatingWindow);
        console.log('[VoiceCall] 悬浮窗当前类名:', floatingWindow.className);
        
        // 隐藏通话界面
        if (callInterface) {
            callInterface.classList.remove('show');
        }
        
        // 显示悬浮窗
        floatingWindow.classList.add('show');
        
        // 强制刷新样式
        floatingWindow.style.display = 'flex';
        floatingWindow.style.visibility = 'visible';
        floatingWindow.style.opacity = '1';
        
        console.log('[VoiceCall] 添加show后的类名:', floatingWindow.className);
        
        // 延迟检查样式
        setTimeout(() => {
            const styles = window.getComputedStyle(floatingWindow);
            console.log('[VoiceCall] 最终样式:');
            console.log('  - display:', styles.display);
            console.log('  - visibility:', styles.visibility);
            console.log('  - opacity:', styles.opacity);
            console.log('  - z-index:', styles.zIndex);
            console.log('  - position:', styles.position);
            console.log('  - top:', styles.top);
            console.log('  - right:', styles.right);
            console.log('  - width:', styles.width);
            console.log('  - height:', styles.height);
            
            // 检查是否可见
            const rect = floatingWindow.getBoundingClientRect();
            console.log('[VoiceCall] 元素位置:', {
                top: rect.top,
                right: window.innerWidth - rect.right,
                width: rect.width,
                height: rect.height,
                inViewport: rect.top >= 0 && rect.right <= window.innerWidth
            });
        }, 100);
        
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
        
        // 更新聊天记录为"已挂断"
        updateLastCallRecord('ended', duration);
        
        // 如果有通话内容，进行总结
        if (currentCallConversation.length > 0) {
            summarizeCallConversation();
        }
        
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
        
        // 重置AI随机回复定时器（用户发言后延迟AI主动发言）
        stopAIRandomReply();
        startAIRandomReply();
        
        // 将消息加入队列
        addToMessageQueue(message, false);
    }
    
    /**
     * 将消息添加到队列
     */
    function addToMessageQueue(userMessage, isAIInitiated = false) {
        messageQueue.push({ userMessage, isAIInitiated, timestamp: Date.now() });
        console.log(`📝 消息已加入队列 (队列长度: ${messageQueue.length})`);
        
        // 如果没有正在处理，立即开始处理队列
        if (!isProcessingQueue) {
            processMessageQueue();
        }
    }
    
    /**
     * 处理消息队列
     */
    async function processMessageQueue() {
        if (isProcessingQueue || messageQueue.length === 0) {
            return;
        }
        
        isProcessingQueue = true;
        
        while (messageQueue.length > 0) {
            const { userMessage, isAIInitiated } = messageQueue.shift();
            console.log(`⚙️ 处理队列消息 (剩余: ${messageQueue.length})`);
            
            try {
                await callAIInCall(userMessage, isAIInitiated);
            } catch (error) {
                console.error('队列处理出错:', error);
            }
            
            // 每条消息之间留一点间隔，避免过快
            if (messageQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        isProcessingQueue = false;
        console.log('✅ 队列处理完成');
    }
    
    /**
     * 在通话中调用AI
     * @param {string} userMessage - 用户消息
     * @param {boolean} isAIInitiated - 是否为AI主动发言
     */
    async function callAIInCall(userMessage, isAIInitiated = false) {
        // 检查是否已有AI正在回复
        if (isAIResponding) {
            console.log('⚠️ AI正在回复中，跳过本次调用');
            return;
        }
        
        // 设置锁
        isAIResponding = true;
        
        try {
            // 检查API设置
            const api = window.AppState?.apiSettings || {};
            if (!api.endpoint || !api.selectedModel) {
                isAIResponding = false;
                console.error('❌ API未配置');
                return;
            }
            
            // 获取当前角色信息
            const currentChat = window.AppState?.currentChat;
            if (!currentChat) {
                isAIResponding = false;
                console.error('❌ 未找到当前对话');
                return;
            }
            
            // 显示AI正在说话
            addCallMessage('ai', '正在说话...');
            
            // 构建API消息数组
            const messages = [];
            
            // 系统提示词：包含角色设定
            const charName = currentChat.name || 'AI';
            const charDescription = currentChat.description || '';
            const userName = currentChat.userNameForChar || window.AppState?.user?.name || '用户';
            const userPersonality = window.AppState?.user?.personality || '';
            
            let systemPrompt = `你正在与用户进行语音通话。

角色名称：${charName}
角色设定：${charDescription}

用户名称：${userName}
用户设定：${userPersonality}

当前状态：语音通话中

回复要求：
1. 用简短、口语化的方式回复，就像在打电话一样
2. 每次回复1-2句话即可，不要太长
3. 语气要自然，符合角色性格`;

            if (isAIInitiated) {
                systemPrompt += `

4. 现在请你主动说一句话，可以是：
   - 延续刚才的话题
   - 通话刚接通时的打招呼
   - 询问对方的近况
   - 分享一个轻松的话题
   - 关心对方
请用简短、自然的方式说话，只需一句话。`;
            }
            
            messages.push({
                role: 'system',
                content: systemPrompt
            });
            
            // 添加通话聊天记录作为上下文
            const callMessages = document.querySelectorAll('.call-chat-message');
            callMessages.forEach(msg => {
                if (msg.classList.contains('call-chat-message-user')) {
                    const text = msg.querySelector('.call-chat-text')?.textContent || '';
                    if (text && text !== '正在说话...') {
                        messages.push({ role: 'user', content: text });
                    }
                } else if (msg.classList.contains('call-chat-message-ai')) {
                    const text = msg.querySelector('.call-chat-text')?.textContent || '';
                    if (text && text !== '正在说话...') {
                        messages.push({ role: 'assistant', content: text });
                    }
                }
            });
            
            // 添加当前用户消息
            if (!isAIInitiated && userMessage) {
                messages.push({ role: 'user', content: userMessage });
            } else if (isAIInitiated) {
                messages.push({ role: 'user', content: '请说一句话' });
            }
            
            // 调用API
            const baseEndpoint = window.APIUtils.normalizeEndpoint(api.endpoint);
            const endpoint = baseEndpoint + '/chat/completions';
            
            const body = {
                model: api.selectedModel,
                messages: messages,
                temperature: 0.8,
                max_tokens: 500, // 语音通话回复要简短
                stream: false
            };
            
            const fetchOptions = window.APIUtils.createFetchOptions(api.apiKey || '', body);
            
            const response = await fetch(endpoint, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`API调用失败: ${response.status}`);
            }
            
            const data = await response.json();
            const aiText = window.APIUtils.extractTextFromResponse(data);
            
            // 移除"正在说话"
            removeTypingIndicator();
            
            if (aiText && aiText.trim()) {
                // 添加AI回复到通话界面
                addCallMessage('ai', aiText);
            } else {
                console.error('❌ AI回复为空');
            }
            
        } catch (error) {
            console.error('❌ AI回复失败:', error);
            removeTypingIndicator();
            // 静默处理错误，不在聊天界面显示错误消息
        } finally {
            // 无论成功或失败，都必须重置AI回复状态
            isAIResponding = false;
            console.log('✅ AI回复状态已重置');
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
            
            // 记录非系统消息到通话对话历史
            if (type === 'user') {
                currentCallConversation.push({
                    role: 'user',
                    content: content,
                    timestamp: Date.now()
                });
            } else if (type === 'ai') {
                currentCallConversation.push({
                    role: 'assistant',
                    content: content,
                    timestamp: Date.now()
                });
                
                // 使用 MiniMax TTS 播放 AI 语音
                if (window.MinimaxTTS && MinimaxTTS.isConfigured()) {
                    MinimaxTTS.speak(content).catch(err => {
                        console.error('[VoiceCall] MiniMax TTS 播放失败:', err);
                    });
                } else {
                    console.log('[VoiceCall] MiniMax TTS 未配置，跳过语音播放');
                }
            }
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
     * 移除"正在说话"指示器
     */
    function removeTypingIndicator() {
        const messagesContainer = document.getElementById('call-chat-messages');
        const lastMessage = messagesContainer.lastElementChild;
        if (lastMessage && lastMessage.textContent.includes('正在说话')) {
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
        const currentConv = window.AppState?.currentChat;
        if (!currentConv) {
            console.warn('[VoiceCall] 无法添加通话记录：未找到当前对话');
            return;
        }
        
        const convId = currentConv.id;
        
        // 创建通话消息对象
        const callMessage = {
            id: generateCallMessageId(),
            conversationId: convId,
            type: 'voicecall',
            callStatus: status, // 'calling' | 'cancelled' | 'ended'
            callDuration: duration,
            sender: callState.callType === 'outgoing' ? 'sent' : 'received',
            timestamp: new Date().toISOString(),
            content: `${status} ${duration > 0 ? formatDuration(duration) : ''}`
        };
        
        // 添加到AppState消息列表
        if (!window.AppState.messages[convId]) {
            window.AppState.messages[convId] = [];
        }
        window.AppState.messages[convId].push(callMessage);
        
        // 保存到本地存储
        if (typeof window.saveToStorage === 'function') {
            window.saveToStorage();
        }
        
        // 重新渲染聊天消息
        if (typeof window.renderChatMessages === 'function') {
            window.renderChatMessages();
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
     * 生成通话消息ID
     */
    function generateCallMessageId() {
        return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 更新最后一条通话记录
     */
    function updateLastCallRecord(newStatus, newDuration) {
        const currentConv = window.AppState?.currentChat;
        if (!currentConv) return;
        
        const convId = currentConv.id;
        const messages = window.AppState.messages[convId];
        
        if (!messages || messages.length === 0) return;
        
        // 找到最后一条通话消息
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].type === 'voicecall') {
                messages[i].callStatus = newStatus;
                messages[i].callDuration = newDuration;
                messages[i].content = `${newStatus} ${newDuration > 0 ? formatDuration(newDuration) : ''}`;
                
                // 保存并重新渲染
                if (typeof window.saveToStorage === 'function') {
                    window.saveToStorage();
                }
                if (typeof window.renderChatMessages === 'function') {
                    window.renderChatMessages();
                }
                break;
            }
        }
    }
    
    /**
     * 确认并开始通话（从确认弹窗点击拨打后）
     */
    function confirmAndStartCall(characterId, characterName, characterAvatar) {
        console.log('[VoiceCall] ===== 确认并开始拨通 =====');
        console.log('[VoiceCall] 接收到的参数:', {
            id: characterId,
            name: characterName,
            avatar: characterAvatar ? characterAvatar.substring(0, 50) + '...' : 'none'
        });
        
        callState.callType = 'outgoing';
        callState.callerId = characterId;
        callState.callerName = characterName;
        callState.callerAvatar = characterAvatar;
        
        console.log('[VoiceCall] callState已更新:', {
            callerId: callState.callerId,
            callerName: callState.callerName,
            callerAvatar: callState.callerAvatar ? callState.callerAvatar.substring(0, 50) + '...' : 'none'
        });
        
        // 清空之前的通话记录
        currentCallConversation = [];
        
        // 添加"正在通话中"状态到聊天
        addCallRecordToChat('calling', 0);
        
        // 显示拨通中界面
        showCallingInterface(characterName, characterAvatar);
        
        // 设置自动接通定时器（3秒后）
        callState.callingTimeout = setTimeout(() => {
            acceptCallingAndConnect();
        }, 3000);
    }
    
    /**
     * 接通通话（拨通中自动接通）
     */
    function acceptCallingAndConnect() {
        console.log('[VoiceCall] 通话已接通');
        
        // 清除定时器
        if (callState.callingTimeout) {
            clearTimeout(callState.callingTimeout);
            callState.callingTimeout = null;
        }
        
        // 隐藏拨通中界面
        const callingInterface = document.getElementById('calling-interface');
        if (callingInterface) {
            callingInterface.classList.remove('show');
        }
        
        // 设置通话状态
        callState.isInCall = true;
        callState.callStartTime = Date.now();
        
        // 显示通话界面
        showCallInterface(callState.callerName, callState.callerAvatar);
        
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
        callState.callingTimeout = null;
        
        // 重置按钮状态
        document.getElementById('call-mute-btn')?.classList.remove('muted');
        document.getElementById('call-speaker-btn')?.classList.remove('active');
    }
    
    /**
     * 播放铃声
     */
    function playRingtone() {
        console.log('🔔 播放铃声');
        
        // 停止之前的铃声
        if (ringtoneAudio) {
            ringtoneAudio.pause();
            ringtoneAudio.currentTime = 0;
        }
        
        // 获取当前角色的自定义铃声
        const characterId = callState.callerId || window.currentCharacterId;
        const customRingtone = getCustomRingtone(characterId);
        
        if (customRingtone) {
            ringtoneAudio = new Audio(customRingtone);
            ringtoneAudio.loop = true;
            ringtoneAudio.volume = 0.5;
            ringtoneAudio.play().catch(err => {
                console.error('播放自定义铃声失败:', err);
            });
        } else {
            // 使用默认铃声（可选）
            console.log('使用默认铃声');
        }
    }
    
    /**
     * 停止铃声
     */
    function stopRingtone() {
        console.log('🔕 停止铃声');
        
        if (ringtoneAudio) {
            ringtoneAudio.pause();
            ringtoneAudio.currentTime = 0;
            ringtoneAudio = null;
        }
    }
    
    /**
     * 打开铃声设置弹窗
     */
    function openRingtoneSettings() {
        const characterId = callState.callerId || window.currentCharacterId;
        const characterName = callState.callerName || window.currentCharacterName || '当前角色';
        
        // 创建铃声设置弹窗
        const modal = document.createElement('div');
        modal.className = 'ringtone-settings-modal';
        modal.innerHTML = `
            <div class="ringtone-settings-content">
                <div class="ringtone-settings-header">
                    <h3>设置铃声</h3>
                    <button class="ringtone-close-btn" onclick="this.closest('.ringtone-settings-modal').remove()">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                <div class="ringtone-settings-body">
                    <p class="ringtone-character-name">为 <strong>${characterName}</strong> 设置专属铃声</p>
                    
                    <div class="ringtone-current">
                        <p class="ringtone-label">当前铃声：</p>
                        <p class="ringtone-status" id="ringtone-status">
                            ${getCustomRingtone(characterId) ? '已设置自定义铃声' : '使用默认铃声'}
                        </p>
                    </div>
                    
                    <div class="ringtone-actions">
                        <button class="ringtone-upload-btn" id="ringtone-upload-btn">
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" fill="currentColor"/>
                            </svg>
                            导入本地铃声
                        </button>
                        
                        ${getCustomRingtone(characterId) ? `
                            <button class="ringtone-test-btn" id="ringtone-test-btn">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path d="M8 5v14l11-7z" fill="currentColor"/>
                                </svg>
                                试听铃声
                            </button>
                            
                            <button class="ringtone-delete-btn" id="ringtone-delete-btn">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                                </svg>
                                删除铃声
                            </button>
                        ` : ''}
                    </div>
                    
                    <p class="ringtone-hint">💡 支持 MP3、WAV、OGG 等音频格式</p>
                </div>
                
                <input type="file" id="ringtone-file-input" accept="audio/*" style="display: none;">
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定事件
        const uploadBtn = modal.querySelector('#ringtone-upload-btn');
        const fileInput = modal.querySelector('#ringtone-file-input');
        const testBtn = modal.querySelector('#ringtone-test-btn');
        const deleteBtn = modal.querySelector('#ringtone-delete-btn');
        
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            handleRingtoneUpload(e, characterId, modal);
        });
        
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                testRingtone(characterId);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                deleteRingtone(characterId, modal);
            });
        }
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * 处理铃声上传
     */
    function handleRingtoneUpload(event, characterId, modal) {
        const file = event.target.files[0];
        if (!file) return;
        
        // 检查文件类型
        if (!file.type.startsWith('audio/')) {
            alert('请选择音频文件！');
            return;
        }
        
        // 检查文件大小（限制10MB）
        if (file.size > 10 * 1024 * 1024) {
            alert('文件过大！请选择小于10MB的音频文件。');
            return;
        }
        
        // 读取文件为Base64
        const reader = new FileReader();
        reader.onload = function(e) {
            const audioData = e.target.result;
            
            // 保存铃声
            saveCustomRingtone(characterId, audioData);
            
            // 更新界面
            const statusEl = modal.querySelector('#ringtone-status');
            if (statusEl) {
                statusEl.textContent = '已设置自定义铃声';
            }
            
            // 重新打开弹窗以显示新按钮
            modal.remove();
            openRingtoneSettings();
            
            // 提示成功
            showToast('铃声设置成功！');
        };
        
        reader.onerror = function() {
            alert('文件读取失败，请重试！');
        };
        
        reader.readAsDataURL(file);
    }
    
    /**
     * 保存自定义铃声
     */
    function saveCustomRingtone(characterId, audioData) {
        let ringtones = {};
        try {
            const stored = localStorage.getItem(RINGTONE_STORAGE_KEY);
            if (stored) {
                ringtones = JSON.parse(stored);
            }
        } catch (e) {
            console.error('读取铃声数据失败:', e);
        }
        
        ringtones[characterId] = audioData;
        
        try {
            localStorage.setItem(RINGTONE_STORAGE_KEY, JSON.stringify(ringtones));
            console.log(`已为角色 ${characterId} 保存自定义铃声`);
        } catch (e) {
            console.error('保存铃声失败:', e);
            alert('保存失败！可能是存储空间不足。');
        }
    }
    
    /**
     * 获取自定义铃声
     */
    function getCustomRingtone(characterId) {
        try {
            const stored = localStorage.getItem(RINGTONE_STORAGE_KEY);
            if (stored) {
                const ringtones = JSON.parse(stored);
                return ringtones[characterId] || null;
            }
        } catch (e) {
            console.error('读取铃声数据失败:', e);
        }
        return null;
    }
    
    /**
     * 删除自定义铃声
     */
    function deleteRingtone(characterId, modal) {
        if (!confirm('确定要删除这个铃声吗？')) {
            return;
        }
        
        try {
            const stored = localStorage.getItem(RINGTONE_STORAGE_KEY);
            if (stored) {
                const ringtones = JSON.parse(stored);
                delete ringtones[characterId];
                localStorage.setItem(RINGTONE_STORAGE_KEY, JSON.stringify(ringtones));
                
                // 更新界面
                modal.remove();
                openRingtoneSettings();
                
                showToast('铃声已删除');
            }
        } catch (e) {
            console.error('删除铃声失败:', e);
            alert('删除失败！');
        }
    }
    
    /**
     * 试听铃声
     */
    function testRingtone(characterId) {
        const ringtone = getCustomRingtone(characterId);
        if (!ringtone) {
            alert('没有设置铃声！');
            return;
        }
        
        // 停止之前的试听
        if (ringtoneAudio) {
            ringtoneAudio.pause();
            ringtoneAudio = null;
        }
        
        // 播放试听
        ringtoneAudio = new Audio(ringtone);
        ringtoneAudio.volume = 0.5;
        ringtoneAudio.play().catch(err => {
            console.error('播放失败:', err);
            alert('播放失败！');
        });
        
        // 3秒后自动停止
        setTimeout(() => {
            if (ringtoneAudio) {
                ringtoneAudio.pause();
                ringtoneAudio = null;
            }
        }, 3000);
    }
    
    /**
     * 显示提示消息
     */
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'ringtone-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 2000);
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
    function showCallConfirmModal(characterId, characterName, characterAvatar) {
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
            
            // 绑定取消事件
            document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
                modal.classList.remove('show');
            });
        }
        
        // 更新内容
        document.getElementById('confirm-avatar').src = characterAvatar;
        document.getElementById('confirm-name').textContent = characterName;
        
        // 每次都重新绑定确认按钮事件，确保使用最新的角色信息
        const okBtn = document.getElementById('confirm-ok-btn');
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        
        newOkBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            confirmAndStartCall(characterId, characterName, characterAvatar);
        });
        
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
                cancelCalling();
            });
        }
        
        // 更新内容
        document.getElementById('calling-avatar').src = characterAvatar;
        document.getElementById('calling-name').textContent = characterName;
        
        // 显示
        callingInterface.classList.add('show');
    }
    
    /**
     * 取消拨通
     */
    function cancelCalling() {
        console.log('[VoiceCall] 取消拨通');
        
        // 清除拨通定时器
        if (callState.callingTimeout) {
            clearTimeout(callState.callingTimeout);
            callState.callingTimeout = null;
        }
        
        // 隐藏拨通中界面
        const callingInterface = document.getElementById('calling-interface');
        if (callingInterface) {
            callingInterface.classList.remove('show');
        }
        
        // 更新聊天记录为"已取消"
        updateLastCallRecord('cancelled', 0);
        
        // 重置状态
        callState.callType = 'outgoing';
        callState.callerName = null;
        callState.callerAvatar = null;
        
        showToast('已取消通话');
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
        // 调用AI生成打招呼内容
        callAIInCall('', true);
    }
    
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
                    // 加入队列，由队列系统自动处理
                    addToMessageQueue('', true);
                    
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
    
    /**
     * 总结通话内容（使用副API）
     */
    function summarizeCallConversation() {
        console.log('[VoiceCall] 开始总结通话内容');
        
        const currentConv = window.AppState?.currentChat;
        if (!currentConv) {
            console.warn('[VoiceCall] 无法总结：未找到当前对话');
            return;
        }
        
        // 检查副API是否配置
        const hasSecondaryApi = window.AppState?.apiSettings?.secondaryEndpoint &&
                               window.AppState?.apiSettings?.secondaryApiKey &&
                               window.AppState?.apiSettings?.secondarySelectedModel;
        
        if (!hasSecondaryApi) {
            console.log('[VoiceCall] 副API未配置，跳过通话总结');
            return;
        }
        
        // 检查是否有对话内容
        if (currentCallConversation.length === 0) {
            console.log('[VoiceCall] 没有通话内容需要总结');
            return;
        }
        
        // 构建通话文本
        const userName = currentConv.userNameForChar || window.AppState?.user?.name || '用户';
        const charName = currentConv.name || '角色';
        
        let callText = `【语音通话记录】\n时间：${new Date().toLocaleString('zh-CN')}\n\n`;
        currentCallConversation.forEach(msg => {
            const speaker = msg.role === 'user' ? userName : charName;
            callText += `${speaker}: ${msg.content}\n`;
        });
        
        console.log('[VoiceCall] 通话文本长度:', callText.length);
        
        // 调用副API进行总结
        if (window.summarizeTextViaSecondaryAPI) {
            window.summarizeTextViaSecondaryAPI(
                callText,
                (summary) => {
                    console.log('[VoiceCall] 通话总结成功');
                    
                    // 保存总结到角色的summaries中
                    if (!currentConv.summaries) {
                        currentConv.summaries = [];
                    }
                    
                    currentConv.summaries.push({
                        content: `📞 语音通话总结\n\n${summary}`,
                        isAutomatic: true,
                        isVoiceCall: true,
                        timestamp: new Date().toISOString(),
                        messageCount: currentCallConversation.length,
                        callDuration: callState.callDuration
                    });
                    
                    // 保存到本地存储
                    if (typeof window.saveToStorage === 'function') {
                        window.saveToStorage();
                    }
                    
                    console.log('[VoiceCall] 通话总结已保存到角色记忆');
                    showToast('✅ 通话内容已自动总结');
                },
                (error) => {
                    console.error('[VoiceCall] 通话总结失败:', error);
                }
            );
        } else {
            console.error('[VoiceCall] summarizeTextViaSecondaryAPI 函数不存在');
        }
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVoiceCallSystem);
    } else {
        initVoiceCallSystem();
    }
    
})();