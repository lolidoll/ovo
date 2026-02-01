/**
 * 视频通话系统
 * 基于语音通话系统，增加视频相关功能
 */

(function() {
    'use strict';
    
    console.log('[VideoCall] 视频通话系统加载中...');
    
    // ========== 状态管理 ==========
    
    const videoCallState = {
        isInCall: false,
        callType: null, // 'outgoing' | 'incoming'
        callerId: null, // 通话角色ID
        callerName: null,
        callerAvatar: null,
        callStartTime: null,
        isMinimized: false,
        timerInterval: null, // 计时器
        
        // 视频相关
        currentCharacterPhoto: null, // 当前显示的角色照片
        currentUserPhoto: null, // 当前显示的用户照片
        isUserPhotoInMain: false // true=用户照片在主屏，false=角色照片在主屏
    };
    
    // 对话记录
    let currentVideoCallConversation = [];
    
    // 消息队列系统
    let isVideoAIResponding = false;
    let videoMessageQueue = [];
    let isProcessingVideoQueue = false;
    
    // 照片库存储 (存储在localStorage)
    // characterPhotos: { characterId: [photo1, photo2, ...] }
    // userPhotos: { characterId: [photo1, photo2, ...] } // 每个角色可以有独立的用户照片库
    
    /**
     * 获取角色照片库
     */
    function getCharacterPhotos(characterId) {
        const stored = localStorage.getItem('videoCall_characterPhotos');
        const allPhotos = stored ? JSON.parse(stored) : {};
        return allPhotos[characterId] || [];
    }
    
    /**
     * 保存角色照片库
     */
    function saveCharacterPhotos(characterId, photos) {
        const stored = localStorage.getItem('videoCall_characterPhotos');
        const allPhotos = stored ? JSON.parse(stored) : {};
        allPhotos[characterId] = photos;
        localStorage.setItem('videoCall_characterPhotos', JSON.stringify(allPhotos));
    }
    
    /**
     * 获取用户照片库（针对特定角色）
     */
    function getUserPhotos(characterId) {
        const stored = localStorage.getItem('videoCall_userPhotos');
        const allPhotos = stored ? JSON.parse(stored) : {};
        return allPhotos[characterId] || [];
    }
    
    /**
     * 保存用户照片库（针对特定角色）
     */
    function saveUserPhotos(characterId, photos) {
        const stored = localStorage.getItem('videoCall_userPhotos');
        const allPhotos = stored ? JSON.parse(stored) : {};
        allPhotos[characterId] = photos;
        localStorage.setItem('videoCall_userPhotos', JSON.stringify(allPhotos));
    }
    
    /**
     * 从照片库随机选择一张照片
     */
    function getRandomPhoto(photos) {
        if (!photos || photos.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * photos.length);
        return photos[randomIndex];
    }
    
    /**
     * 初始化视频通话照片
     */
    function initVideoCallPhotos(characterId) {
        // 获取角色照片库
        const characterPhotos = getCharacterPhotos(characterId);
        videoCallState.currentCharacterPhoto = getRandomPhoto(characterPhotos);
        
        // 如果没有角色照片，使用角色头像作为默认
        if (!videoCallState.currentCharacterPhoto) {
            const currentChat = window.AppState?.currentChat;
            videoCallState.currentCharacterPhoto = currentChat?.avatar || '';
        }
        
        // 获取用户照片库
        const userPhotos = getUserPhotos(characterId);
        videoCallState.currentUserPhoto = getRandomPhoto(userPhotos);
        
        // 如果没有用户照片，使用用户头像作为默认
        if (!videoCallState.currentUserPhoto) {
            videoCallState.currentUserPhoto = window.AppState?.user?.avatar || '';
        }
        
        // 默认角色照片在主屏
        videoCallState.isUserPhotoInMain = false;
        
        console.log('[VideoCall] 照片初始化完成:', {
            characterPhoto: videoCallState.currentCharacterPhoto ? '已设置' : '未设置',
            userPhoto: videoCallState.currentUserPhoto ? '已设置' : '未设置'
        });
    }
    
    /**
     * 切换大小屏
     */
    function switchMainAndSmallScreen() {
        videoCallState.isUserPhotoInMain = !videoCallState.isUserPhotoInMain;
        updateVideoDisplay();
        console.log('[VideoCall] 已切换大小屏');
    }
    
    /**
     * 显示照片快速选择器（点击主屏）
     */
    function showMainScreenPhotoSelector() {
        const photoType = videoCallState.isUserPhotoInMain ? 'user' : 'character';
        showPhotoQuickSelector(photoType, true);
    }
    
    /**
     * 显示照片快速选择器（点击小屏）
     */
    function showSmallScreenPhotoSelector() {
        const photoType = videoCallState.isUserPhotoInMain ? 'character' : 'user';
        showPhotoQuickSelector(photoType, false);
    }
    
    /**
     * 显示照片快速选择器
     * @param {string} photoType - 'character' 或 'user'
     * @param {boolean} isMainScreen - 是否为主屏
     */
    function showPhotoQuickSelector(photoType, isMainScreen) {
        const characterId = videoCallState.callerId;
        if (!characterId) return;
        
        // 获取照片列表
        const photos = photoType === 'character'
            ? getCharacterPhotos(characterId)
            : getUserPhotos(characterId);
        
        if (!photos || photos.length === 0) {
            showToast(`暂无${photoType === 'character' ? '角色' : '用户'}照片`);
            return;
        }
        
        // 移除已存在的选择器
        const existingSelector = document.querySelector('.video-photo-quick-selector');
        if (existingSelector) {
            existingSelector.remove();
        }
        
        // 创建选择器容器
        const selector = document.createElement('div');
        selector.className = 'video-photo-quick-selector';
        selector.innerHTML = `
            <div class="video-photo-quick-header">
                <h4>${photoType === 'character' ? '选择角色照片' : '选择用户照片'}</h4>
                <button class="video-photo-quick-close">×</button>
            </div>
            <div class="video-photo-quick-grid"></div>
            <div class="video-photo-quick-actions">
                <button class="video-photo-quick-random">随机一张</button>
            </div>
        `;
        
        document.body.appendChild(selector);
        
        // 渲染照片网格
        const grid = selector.querySelector('.video-photo-quick-grid');
        grid.innerHTML = photos.map((photo, index) => `
            <div class="video-photo-quick-item" data-index="${index}">
                <img src="${photo}" alt="${photoType === 'character' ? '角色' : '用户'}照片${index + 1}">
            </div>
        `).join('');
        
        // 绑定照片点击事件
        grid.querySelectorAll('.video-photo-quick-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                applyPhotoToScreen(photos[index], photoType);
                selector.remove();
            });
        });
        
        // 绑定随机按钮
        selector.querySelector('.video-photo-quick-random').addEventListener('click', () => {
            const randomPhoto = getRandomPhoto(photos);
            applyPhotoToScreen(randomPhoto, photoType);
            selector.remove();
        });
        
        // 绑定关闭按钮
        selector.querySelector('.video-photo-quick-close').addEventListener('click', () => {
            selector.remove();
        });
        
        // 点击背景关闭
        selector.addEventListener('click', (e) => {
            if (e.target === selector) {
                selector.remove();
            }
        });
        
        // 显示动画
        setTimeout(() => selector.classList.add('show'), 10);
    }
    
    /**
     * 应用照片到屏幕
     * @param {string} photoUrl - 照片URL
     * @param {string} photoType - 'character' 或 'user'
     */
    function applyPhotoToScreen(photoUrl, photoType) {
        if (photoType === 'character') {
            videoCallState.currentCharacterPhoto = photoUrl;
        } else {
            videoCallState.currentUserPhoto = photoUrl;
        }
        
        updateVideoDisplay();
        showToast('照片已更换');
        console.log(`[VideoCall] 已更换${photoType === 'character' ? '角色' : '用户'}照片`);
    }
    
    /**
     * 更新视频显示
     */
    function updateVideoDisplay() {
        const mainScreen = document.getElementById('video-main-screen');
        const smallScreen = document.getElementById('video-small-screen');
        
        if (!mainScreen || !smallScreen) return;
        
        if (videoCallState.isUserPhotoInMain) {
            // 用户照片在主屏
            mainScreen.style.backgroundImage = `url(${videoCallState.currentUserPhoto})`;
            smallScreen.style.backgroundImage = `url(${videoCallState.currentCharacterPhoto})`;
        } else {
            // 角色照片在主屏
            mainScreen.style.backgroundImage = `url(${videoCallState.currentCharacterPhoto})`;
            smallScreen.style.backgroundImage = `url(${videoCallState.currentUserPhoto})`;
        }
    }
    
    /**
     * 发起视频通话
     */
    function startVideoCall() {
        if (videoCallState.isInCall) {
            showToast('当前正在视频通话中');
            return;
        }
        
        console.log('[VideoCall] 准备发起视频通话');
        
        // 从AppState获取当前角色信息
        const currentChat = window.AppState?.currentChat;
        if (!currentChat) {
            showToast('请先打开一个聊天会话');
            return;
        }
        
        const characterId = currentChat.id;
        let characterName = '角色';
        if (currentChat.remark && currentChat.remark.trim()) {
            characterName = currentChat.remark.trim();
        } else if (currentChat.name && currentChat.name.trim()) {
            characterName = currentChat.name.trim();
        }
        
        let characterAvatar = '';
        if (currentChat.avatar && currentChat.avatar.trim()) {
            characterAvatar = currentChat.avatar.trim();
        }
        
        console.log('[VideoCall] 角色信息:', { id: characterId, name: characterName });
        
        // 显示确认弹窗
        showVideoCallConfirmModal(characterId, characterName, characterAvatar);
    }
    
    /**
     * 显示视频通话确认弹窗
     */
    function showVideoCallConfirmModal(characterId, characterName, characterAvatar) {
        // 移除旧弹窗
        const existingModal = document.querySelector('.video-call-confirm-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 创建确认弹窗（不显示头像）
        const modal = document.createElement('div');
        modal.id = 'video-call-confirm-modal';
        modal.className = 'video-call-confirm-modal';
        modal.innerHTML = `
            <div class="video-call-confirm-content">
                <h3 class="video-call-confirm-title">发起视频通话</h3>
                <p class="video-call-confirm-text">确定要与 <strong>${characterName}</strong> 进行视频通话吗？</p>
                <div class="video-call-confirm-buttons">
                    <button class="video-call-confirm-btn cancel" id="video-call-confirm-cancel">取消</button>
                    <button class="video-call-confirm-btn ok" id="video-call-confirm-ok">拨打</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 延迟显示以触发动画
        setTimeout(() => modal.classList.add('show'), 10);
        
        // 绑定取消按钮
        document.getElementById('video-call-confirm-cancel').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
        
        // 绑定确认按钮（使用cloneNode避免闭包问题）
        const okBtn = document.getElementById('video-call-confirm-ok');
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        
        newOkBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
            confirmAndStartVideoCall(characterId, characterName, characterAvatar);
        });
    }
    
    /**
     * 确认并开始视频通话
     */
    function confirmAndStartVideoCall(characterId, characterName, characterAvatar) {
        console.log('[VideoCall] 开始视频通话');
        
        videoCallState.callType = 'outgoing';
        videoCallState.callerId = characterId;
        videoCallState.callerName = characterName;
        videoCallState.callerAvatar = characterAvatar;
        
        console.log('[VideoCall] 设置callType为outgoing, callerId:', characterId);
        
        // 初始化照片
        initVideoCallPhotos(characterId);
        
        // 清空对话记录
        currentVideoCallConversation = [];
        
        // 添加"正在视频通话中"状态到聊天
        addVideoCallRecordToChat('calling', 0);
        
        // 显示视频通话界面
        showVideoCallInterface();
        
        // 模拟接通（1秒后）
        setTimeout(() => {
            videoCallConnected();
        }, 1000);
    }
    
    /**
     * 添加视频通话记录到聊天
     */
    function addVideoCallRecordToChat(status, duration) {
        const currentConv = window.AppState?.currentChat;
        if (!currentConv) return;
        
        const convId = currentConv.id;
        const callMessage = {
            id: generateVideoCallMessageId(),
            conversationId: convId,
            type: 'videocall',
            callStatus: status,
            callDuration: duration,
            sender: videoCallState.callType === 'outgoing' ? 'sent' : 'received',
            timestamp: new Date().toISOString(),
            content: `${status} ${duration > 0 ? formatVideoDuration(duration) : ''}`
        };
        
        if (!window.AppState.messages[convId]) {
            window.AppState.messages[convId] = [];
        }
        window.AppState.messages[convId].push(callMessage);
        
        if (typeof window.saveToStorage === 'function') {
            window.saveToStorage();
        }
        
        if (typeof window.renderChatMessages === 'function') {
            window.renderChatMessages();
        }
    }
    
    /**
     * 生成视频通话消息ID
     */
    function generateVideoCallMessageId() {
        return `videocall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 格式化视频通话时长
     */
    function formatVideoDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    
    /**
     * 更新最后一条视频通话记录
     */
    function updateLastVideoCallRecord(newStatus, newDuration) {
        const currentConv = window.AppState?.currentChat;
        if (!currentConv) return;
        
        const convId = currentConv.id;
        const messages = window.AppState.messages[convId];
        
        if (!messages || messages.length === 0) return;
        
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].type === 'videocall') {
                messages[i].callStatus = newStatus;
                messages[i].callDuration = newDuration;
                messages[i].content = `${newStatus} ${newDuration > 0 ? formatVideoDuration(newDuration) : ''}`;
                
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
     * 取消视频通话拨通
     */
    function cancelVideoCalling() {
        console.log('[VideoCall] 取消视频通话拨通');
        
        if (videoCallState.callingTimeout) {
            clearTimeout(videoCallState.callingTimeout);
            videoCallState.callingTimeout = null;
        }
        
        updateLastVideoCallRecord('cancelled', 0);
        
        videoCallState.callType = null;
        videoCallState.currentCharacterName = null;
        videoCallState.currentCharacterPhoto = null;
        
        showToast('已取消视频通话');
    }
    
    /**
     * 总结视频通话内容
     */
    function summarizeVideoCallConversation() {
        console.log('[VideoCall] 开始总结视频通话内容');
        
        const currentConv = window.AppState?.currentChat;
        if (!currentConv) {
            console.warn('[VideoCall] 无法总结：未找到当前对话');
            return;
        }
        
        const hasSecondaryApi = window.AppState?.apiSettings?.secondaryEndpoint &&
                               window.AppState?.apiSettings?.secondaryApiKey &&
                               window.AppState?.apiSettings?.secondarySelectedModel;
        
        if (!hasSecondaryApi) {
            console.log('[VideoCall] 副API未配置，跳过视频通话总结');
            return;
        }
        
        if (currentVideoConversation.length === 0) {
            console.log('[VideoCall] 没有视频通话内容需要总结');
            return;
        }
        
        const userName = currentConv.userNameForChar || window.AppState?.user?.name || '用户';
        const charName = currentConv.name || '角色';
        const callDuration = videoCallState.callStartTime ?
            Math.floor((Date.now() - videoCallState.callStartTime) / 1000) : 0;
        
        let callText = `【视频通话记录】\n时间：${new Date().toLocaleString('zh-CN')}\n通话时长：${formatVideoDuration(callDuration)}\n\n`;
        currentVideoConversation.forEach(msg => {
            const speaker = msg.role === 'user' ? userName : charName;
            callText += `${speaker}: ${msg.content}\n`;
        });
        
        console.log('[VideoCall] 视频通话文本长度:', callText.length);
        
        if (window.summarizeTextViaSecondaryAPI) {
            window.summarizeTextViaSecondaryAPI(
                callText,
                (summary) => {
                    console.log('[VideoCall] 视频通话总结成功');
                    
                    if (!currentConv.summaries) {
                        currentConv.summaries = [];
                    }
                    
                    currentConv.summaries.push({
                        content: `📹 视频通话总结\n\n${summary}`,
                        isAutomatic: true,
                        isVideoCall: true,
                        timestamp: new Date().toISOString(),
                        messageCount: currentVideoCallConversation.length,
                        callDuration: callDuration
                    });
                    
                    if (typeof window.saveToStorage === 'function') {
                        window.saveToStorage();
                    }
                    
                    console.log('[VideoCall] 视频通话总结已保存到角色记忆');
                    showToast('✅ 视频通话内容已自动总结');
                },
                (error) => {
                    console.error('[VideoCall] 视频通话总结失败:', error);
                }
            );
        } else {
            console.error('[VideoCall] summarizeTextViaSecondaryAPI 函数不存在');
        }
    }
    
    /**
     * 视频通话接通
     */
    function videoCallConnected() {
        console.log('[VideoCall] 视频通话已接通');
        
        videoCallState.isInCall = true;
        videoCallState.callStartTime = Date.now();
        
        showToast('视频通话已接通');
        
        // AI主动打招呼
        setTimeout(() => {
            triggerVideoAIGreeting();
        }, 800);
    }
    
    /**
     * 显示视频通话界面
     */
    function showVideoCallInterface() {
        const videoInterface = document.getElementById('video-call-interface');
        if (!videoInterface) {
            console.error('[VideoCall] 找不到视频通话界面元素');
            return;
        }
        
        // 更新视频显示
        updateVideoDisplay();
        
        // 清空聊天记录
        const chatMessages = document.getElementById('video-chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        // 显示界面
        videoInterface.classList.add('show');
        
        // 绑定滑动显示消息功能
        initChatScrollListener();
        
        // 绑定底部按钮事件
        initVideoControlButtons();
        
        console.log('[VideoCall] 视频通话界面已显示');
    }
    
    /**
     * 初始化聊天滚动监听（滑动显示消息）
     */
    function initChatScrollListener() {
        const chatContainer = document.getElementById('video-chat-container');
        const chatMessages = document.getElementById('video-chat-messages');
        if (!chatContainer || !chatMessages) return;
        
        let scrollTimeout;
        
        chatMessages.addEventListener('scroll', () => {
            // 滚动时显示消息容器
            chatContainer.classList.add('show-messages');
            
            // 清除之前的定时器
            clearTimeout(scrollTimeout);
            
            // 停止滚动3秒后隐藏（如果没有新消息）
            scrollTimeout = setTimeout(() => {
                if (chatMessages.children.length === 0) {
                    chatContainer.classList.remove('show-messages');
                }
            }, 3000);
        });
    }
    
    /**
     * 初始化视频控制按钮
     */
    function initVideoControlButtons() {
        // 麦克风按钮
        const muteBtn = document.getElementById('video-mute-btn');
        if (muteBtn) {
            muteBtn.addEventListener('click', toggleVideoMute);
        }
        
        // 外放按钮
        const speakerBtn = document.getElementById('video-speaker-btn');
        if (speakerBtn) {
            speakerBtn.addEventListener('click', toggleVideoSpeaker);
        }
        
        // 挂断按钮已在HTML中绑定
        
        // 最小化按钮
        const minimizeBtn = document.getElementById('video-call-minimize-btn');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', minimizeVideoCall);
        }
    }
    
    /**
     * 切换麦克风状态
     */
    function toggleVideoMute() {
        const muteBtn = document.getElementById('video-mute-btn');
        if (!muteBtn) return;
        
        const isMuted = muteBtn.classList.toggle('muted');
        showToast(isMuted ? '麦克风已静音' : '麦克风已开启');
    }
    
    /**
     * 切换外放状态
     */
    function toggleVideoSpeaker() {
        const speakerBtn = document.getElementById('video-speaker-btn');
        if (!speakerBtn) return;
        
        const isSpeakerOff = speakerBtn.classList.toggle('speaker-off');
        showToast(isSpeakerOff ? '外放已关闭' : '外放已开启');
    }
    
    /**
     * 结束视频通话
     */
    function endVideoCall() {
        console.log('[VideoCall] 结束视频通话');
        
        if (!videoCallState.isInCall) return;
        
        // 计算通话时长（秒）
        const duration = Math.floor((Date.now() - videoCallState.callStartTime) / 1000);
        
        // 隐藏界面
        const videoInterface = document.getElementById('video-call-interface');
        if (videoInterface) {
            videoInterface.classList.remove('show');
        }
        
        // 隐藏悬浮窗
        const floatingWindow = document.getElementById('video-call-floating-window');
        if (floatingWindow) {
            floatingWindow.classList.remove('show');
        }
        
        // 停止计时器
        if (videoCallState.timerInterval) {
            clearInterval(videoCallState.timerInterval);
            videoCallState.timerInterval = null;
        }
        
        // 更新聊天记录为"已挂断"
        updateLastVideoCallRecord('ended', duration);
        
        // 如果有通话内容，进行总结
        if (currentVideoCallConversation.length > 0) {
            summarizeVideoCallConversation();
        }
        
        // 重置所有状态
        videoCallState.isInCall = false;
        videoCallState.callType = null;
        videoCallState.callerId = null;
        videoCallState.callerName = null;
        videoCallState.callerAvatar = null;
        videoCallState.callStartTime = null;
        videoCallState.isMinimized = false;
        videoCallState.currentCharacterPhoto = null;
        videoCallState.currentUserPhoto = null;
        videoCallState.isUserPhotoInMain = false;
        
        // 清空对话记录和消息队列
        currentVideoCallConversation = [];
        videoMessageQueue = [];
        isVideoAIResponding = false;
        isProcessingVideoQueue = false;
        
        console.log('[VideoCall] ✅ 所有状态已重置');
        
        // 更新聊天页面状态
        updateChatPageStatus();
        
        showToast('视频通话已结束');
    }
    
    /**
     * 接收来电（AI主动呼叫）
     */
    function receiveIncomingVideoCall(characterName, characterAvatar) {
        if (videoCallState.isInCall) {
            console.log('⚠️ 当前正在视频通话中，拒绝新来电');
            return;
        }
        
        console.log('[VideoCall] 收到视频来电:', characterName);
        
        // 设置来电状态
        videoCallState.callType = 'incoming';
        const currentConv = window.AppState?.currentChat;
        if (currentConv) {
            videoCallState.callerId = currentConv.id;
            videoCallState.callerName = characterName;
            videoCallState.callerAvatar = characterAvatar;
        }
        
        // 直接开始视频通话（自动接听）
        console.log('[VideoCall] 自动接听视频来电');
        
        // 初始化照片
        initVideoCallPhotos(videoCallState.callerId);
        
        // 添加calling状态记录
        addVideoCallRecordToChat('calling', 0);
        
        // 设置通话状态
        videoCallState.isInCall = true;
        videoCallState.callStartTime = Date.now();
        
        // 显示视频通话界面
        showVideoCallInterface();
        
        // 开始计时
        startVideoCallTimer();
        
        // 更新聊天页面状态
        updateChatPageStatus();
        
        showToast('视频通话已接通');
        
        // AI主动打招呼
        setTimeout(() => {
            triggerVideoAIGreeting();
        }, 800);
    }
    
    /**
     * 最小化视频通话
     */
    function minimizeVideoCall() {
        console.log('[VideoCall] 最小化视频通话');
        
        if (!videoCallState.isInCall) return;
        
        // 隐藏主界面
        const videoInterface = document.getElementById('video-call-interface');
        if (videoInterface) {
            videoInterface.classList.remove('show');
        }
        
        // 显示悬浮窗
        showFloatingWindow();
        
        videoCallState.isMinimized = true;
    }
    
    /**
     * 最大化视频通话（从悬浮窗恢复）
     */
    function maximizeVideoCall() {
        console.log('[VideoCall] 最大化视频通话');
        
        if (!videoCallState.isInCall) return;
        
        // 隐藏悬浮窗
        const floatingWindow = document.getElementById('video-call-floating-window');
        if (floatingWindow) {
            floatingWindow.classList.remove('show');
        }
        
        // 显示主界面
        const videoInterface = document.getElementById('video-call-interface');
        if (videoInterface) {
            videoInterface.classList.add('show');
        }
        
        videoCallState.isMinimized = false;
    }
    
    /**
     * 显示悬浮窗
     */
    function showFloatingWindow() {
        const floatingWindow = document.getElementById('video-call-floating-window');
        if (!floatingWindow) return;
        
        // 设置悬浮窗背景为角色照片
        const floatingBg = document.getElementById('video-floating-bg');
        if (floatingBg && videoCallState.currentCharacterPhoto) {
            floatingBg.style.backgroundImage = `url("${videoCallState.currentCharacterPhoto}")`;
        }
        
        // 显示悬浮窗
        floatingWindow.classList.add('show');
        
        // 启动计时器更新
        startDurationTimer();
        
        // 绑定悬浮窗点击事件（恢复主界面）
        floatingWindow.onclick = function() {
            maximizeVideoCall();
        };
        
        // 实现悬浮窗拖拽功能
        makeFloatingWindowDraggable(floatingWindow);
    }
    
    /**
     * 启动通话时长计时器
     */
    function startDurationTimer() {
        // 清除旧计时器
        if (videoCallState.timerInterval) {
            clearInterval(videoCallState.timerInterval);
        }
        
        // 启动新计时器
        videoCallState.timerInterval = setInterval(() => {
            if (!videoCallState.isInCall || !videoCallState.callStartTime) {
                clearInterval(videoCallState.timerInterval);
                return;
            }
            
            const duration = Math.floor((Date.now() - videoCallState.callStartTime) / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            // 更新悬浮窗时长显示
            const durationEl = document.getElementById('video-floating-duration');
            if (durationEl) {
                durationEl.textContent = timeStr;
            }
            
            // 更新聊天页面状态
            updateChatPageStatus();
        }, 1000);
    }
    
    /**
     * 使悬浮窗可拖拽
     */
    function makeFloatingWindowDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        element.onmousedown = dragMouseDown;
        element.ontouchstart = dragTouchStart;
        
        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function dragTouchStart(e) {
            e.preventDefault();
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDragTouch;
        }
        
        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.right = 'auto';
        }
        
        function elementDragTouch(e) {
            e.preventDefault();
            pos1 = pos3 - e.touches[0].clientX;
            pos2 = pos4 - e.touches[0].clientY;
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.right = 'auto';
        }
        
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    }
    
    /**
     * 更新聊天页面状态显示
     */
    function updateChatPageStatus() {
        const statusBar = document.querySelector('.chat-status-bar');
        if (!statusBar) return;
        
        if (videoCallState.isInCall) {
            const duration = Math.floor((Date.now() - videoCallState.callStartTime) / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            statusBar.innerHTML = `
                <span class="video-status-icon"></span>
                <span class="video-status-text">视频通话中 ${timeStr}</span>
            `;
            statusBar.classList.add('video-call-status');
            statusBar.style.display = 'flex';
        } else {
            statusBar.classList.remove('video-call-status');
            statusBar.style.display = 'none';
        }
    }
    
    /**
     * AI主动打招呼
     */
    function triggerVideoAIGreeting() {
        addToVideoMessageQueue('', true);
    }
    
    /**
     * 添加消息到队列
     */
    function addToVideoMessageQueue(userMessage, isAIInitiated = false) {
        videoMessageQueue.push({ userMessage, isAIInitiated, timestamp: Date.now() });
        console.log(`[VideoCall] 消息已加入队列 (队列长度: ${videoMessageQueue.length})`);
        
        if (!isProcessingVideoQueue) {
            processVideoMessageQueue();
        }
    }
    
    /**
     * 处理消息队列
     */
    async function processVideoMessageQueue() {
        if (isProcessingVideoQueue || videoMessageQueue.length === 0) return;
        
        isProcessingVideoQueue = true;
        
        while (videoMessageQueue.length > 0) {
            const { userMessage, isAIInitiated } = videoMessageQueue.shift();
            
            try {
                await callVideoAI(userMessage, isAIInitiated);
            } catch (error) {
                console.error('[VideoCall] 队列处理出错:', error);
            }
            
            if (videoMessageQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        isProcessingVideoQueue = false;
    }
    
    /**
     * 添加视频通话记录到聊天
     */
    function addVideoCallRecordToChat(status, duration) {
        const currentConv = window.AppState?.currentChat;
        if (!currentConv) return;
        
        const convId = currentConv.id;
        const senderValue = videoCallState.callType === 'outgoing' ? 'sent' : 'received';
        
        console.log(`[VideoCall] 添加通话记录 - callType: ${videoCallState.callType}, sender: ${senderValue}`);
        
        const callMessage = {
            id: generateVideoCallMessageId(),
            conversationId: convId,
            type: 'videocall',
            callStatus: status, // 'calling' | 'cancelled' | 'ended'
            callDuration: duration,
            sender: senderValue,
            timestamp: new Date().toISOString(),
            content: `${status} ${duration > 0 ? formatVideoDuration(duration) : ''}`
        };
        
        console.log('[VideoCall] 视频通话消息对象:', callMessage);
        
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
    }
    
    /**
     * 生成视频通话消息ID
     */
    function generateVideoCallMessageId() {
        return `videocall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 格式化视频通话时长
     */
    function formatVideoDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    
    /**
     * 更新最后一条视频通话记录
     */
    function updateLastVideoCallRecord(newStatus, newDuration) {
        const currentConv = window.AppState?.currentChat;
        if (!currentConv) return;
        
        const convId = currentConv.id;
        const messages = window.AppState.messages[convId];
        
        if (!messages || messages.length === 0) return;
        
        // 找到最后一条视频通话消息
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].type === 'videocall') {
                messages[i].callStatus = newStatus;
                messages[i].callDuration = newDuration;
                messages[i].content = `${newStatus} ${newDuration > 0 ? formatVideoDuration(newDuration) : ''}`;
                
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
     * 调用AI（视频通话）
     */
    async function callVideoAI(userMessage, isAIInitiated) {
        // 检查是否已有AI正在回复
        if (isVideoAIResponding) {
            console.log('[VideoCall] AI正在回复中，跳过本次调用');
            return;
        }
        
        // 设置锁
        isVideoAIResponding = true;
        
        try {
            // 检查API设置
            const api = window.AppState?.apiSettings || {};
            if (!api.endpoint || !api.selectedModel) {
                isVideoAIResponding = false;
                console.error('[VideoCall] API未配置');
                return;
            }
            
            // 获取当前角色信息
            const currentChat = window.AppState?.currentChat;
            if (!currentChat) {
                isVideoAIResponding = false;
                console.error('[VideoCall] 未找到当前对话');
                return;
            }
            
            // 显示AI正在输入
            addVideoMessage('ai', '正在输入...');
            
            // 构建API消息数组
            const messages = [];
            
            // 系统提示词：包含角色设定
            const charName = currentChat.name || 'AI';
            const charDescription = currentChat.description || '';
            const userName = currentChat.userNameForChar || window.AppState?.user?.name || '用户';
            const userPersonality = window.AppState?.user?.personality || '';
            
            const currentDuration = videoCallState.callStartTime ?
                Math.floor((Date.now() - videoCallState.callStartTime) / 1000) : 0;
            const durationText = currentDuration > 0 ?
                `已通话 ${formatVideoDuration(currentDuration)}` : '';
            
            let systemPrompt = `你正在与用户进行视频通话。

角色名称：${charName}
角色设定：${charDescription}

用户名称：${userName}
用户设定：${userPersonality}

当前状态：视频通话中 ${durationText}

回复要求：
1. 用简短、自然的方式回复，就像在视频通话一样
2. 每次回复1-2句话即可，不要太长
3. 语气要自然，符合角色性格
4. 你知道你们正在进行视频通话，可以看到对方
5. 可以偶尔提到看到对方的表情或动作（营造视频通话氛围）`;

            if (isAIInitiated) {
                systemPrompt += `

5. 现在请你主动说一句话，可以是：
   - 视频通话刚接通时的打招呼
   - 延续刚才的话题
   - 询问对方的近况
   - 分享一个轻松的话题
   - 关心对方
请用简短、自然的方式说话，只需一句话。`;
            }
            
            messages.push({
                role: 'system',
                content: systemPrompt
            });
            
            // 添加聊天页面的最近对话记录作为上下文
            const convId = currentChat.id;
            const recentChatMessages = window.AppState?.messages?.[convId] || [];
            const recentCount = 20; // 读取最近20条聊天记录
            const recentMessages = recentChatMessages.slice(-recentCount);
            
            recentMessages.forEach(msg => {
                if (msg.type === 'text') {
                    if (msg.sender === 'user') {
                        messages.push({ role: 'user', content: msg.content });
                    } else if (msg.sender === 'ai') {
                        messages.push({ role: 'assistant', content: msg.content });
                    }
                }
            });
            
            // 添加视频通话聊天记录作为上下文
            currentVideoCallConversation.forEach(msg => {
                if (msg.sender === 'user') {
                    messages.push({ role: 'user', content: msg.text });
                } else if (msg.sender === 'ai') {
                    messages.push({ role: 'assistant', content: msg.text });
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
                max_tokens: 500,
                stream: false
            };
            
            const fetchOptions = window.APIUtils.createFetchOptions(api.apiKey || '', body);
            
            const response = await fetch(endpoint, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`API调用失败: ${response.status}`);
            }
            
            const data = await response.json();
            const aiText = window.APIUtils.extractTextFromResponse(data);
            
            // 移除"正在输入"
            removeVideoTypingIndicator();
            
            if (aiText && aiText.trim()) {
                // 添加AI回复到视频通话界面
                addVideoMessage('ai', aiText);
            } else {
                console.error('[VideoCall] AI回复为空');
            }
            
        } catch (error) {
            console.error('[VideoCall] AI回复失败:', error);
            removeVideoTypingIndicator();
        } finally {
            isVideoAIResponding = false;
        }
    }
    
    /**
     * 取消视频通话拨通
     */
    function cancelVideoCalling() {
        console.log('[VideoCall] 取消视频通话拨通');
        
        if (videoCallState.callingTimeout) {
            clearTimeout(videoCallState.callingTimeout);
            videoCallState.callingTimeout = null;
        }
        
        updateLastVideoCallRecord('cancelled', 0);
        
        videoCallState.callType = null;
        videoCallState.currentCharacterName = null;
        videoCallState.currentCharacterPhoto = null;
        
        showToast('已取消视频通话');
    }
    
    /**
     * 总结视频通话内容
     */
    function summarizeVideoCallConversation() {
        console.log('[VideoCall] 开始总结视频通话内容');
        
        const currentConv = window.AppState?.currentChat;
        if (!currentConv) {
            console.warn('[VideoCall] 无法总结：未找到当前对话');
            return;
        }
        
        const hasSecondaryApi = window.AppState?.apiSettings?.secondaryEndpoint &&
                               window.AppState?.apiSettings?.secondaryApiKey &&
                               window.AppState?.apiSettings?.secondarySelectedModel;
        
        if (!hasSecondaryApi) {
            console.log('[VideoCall] 副API未配置，跳过视频通话总结');
            return;
        }
        
        if (currentVideoConversation.length === 0) {
            console.log('[VideoCall] 没有视频通话内容需要总结');
            return;
        }
        
        const userName = currentConv.userNameForChar || window.AppState?.user?.name || '用户';
        const charName = currentConv.name || '角色';
        const callDuration = videoCallState.callStartTime ?
            Math.floor((Date.now() - videoCallState.callStartTime) / 1000) : 0;
        
        let callText = `【视频通话记录】\n时间：${new Date().toLocaleString('zh-CN')}\n通话时长：${formatVideoDuration(callDuration)}\n\n`;
        currentVideoConversation.forEach(msg => {
            const speaker = msg.sender === 'user' ? userName : charName;
            callText += `${speaker}: ${msg.text}\n`;
        });
        
        console.log('[VideoCall] 视频通话文本长度:', callText.length);
        
        if (window.summarizeTextViaSecondaryAPI) {
            window.summarizeTextViaSecondaryAPI(
                callText,
                (summary) => {
                    console.log('[VideoCall] 视频通话总结成功');
                    
                    if (!currentConv.summaries) {
                        currentConv.summaries = [];
                    }
                    
                    currentConv.summaries.push({
                        content: `📹 视频通话总结\n\n${summary}`,
                        isAutomatic: true,
                        isVideoCall: true,
                        timestamp: new Date().toISOString(),
                        messageCount: currentVideoCallConversation.length,
                        callDuration: callDuration
                    });
                    
                    if (typeof window.saveToStorage === 'function') {
                        window.saveToStorage();
                    }
                    
                    console.log('[VideoCall] 视频通话总结已保存到角色记忆');
                    showToast('✅ 视频通话内容已自动总结');
                },
                (error) => {
                    console.error('[VideoCall] 视频通话总结失败:', error);
                }
            );
        } else {
            console.error('[VideoCall] summarizeTextViaSecondaryAPI 函数不存在');
        }
    }
    
    /**
     * 移除"正在输入"指示器
     */
    function removeVideoTypingIndicator() {
        const messagesContainer = document.getElementById('video-chat-messages');
        if (!messagesContainer) return;
        
        const lastMessage = messagesContainer.lastElementChild;
        if (lastMessage && lastMessage.textContent.includes('正在输入')) {
            lastMessage.remove();
        }
    }
    
    /**
     * 发送视频聊天消息
     */
    function sendVideoMessage() {
        const input = document.getElementById('video-chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        addVideoMessage('user', message);
        input.value = '';
        
        // 加入队列
        addToVideoMessageQueue(message, false);
    }
    
    /**
     * 发送消息的公共方法（供HTML调用）
     */
    function sendMessage() {
        sendVideoMessage();
    }
    
    /**
     * 添加视频聊天消息（带自动隐藏功能）
     */
    function addVideoMessage(sender, text) {
        const messagesContainer = document.getElementById('video-chat-messages');
        const chatContainer = document.getElementById('video-chat-container');
        if (!messagesContainer || !chatContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `video-chat-message ${sender}`;
        messageDiv.textContent = text;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // 显示聊天容器
        chatContainer.classList.add('show-messages');
        
        // 5秒后隐藏消息
        setTimeout(() => {
            messageDiv.classList.add('hiding');
            setTimeout(() => {
                messageDiv.remove();
                // 如果没有消息了，隐藏聊天容器
                if (messagesContainer.children.length === 0) {
                    chatContainer.classList.remove('show-messages');
                }
            }, 300);
        }, 5000);
        
        // 保存到对话记录
        currentVideoCallConversation.push({
            sender: sender,
            text: text,
            timestamp: Date.now()
        });
        
        // 如果是 AI 消息，使用 MiniMax TTS 播放语音
        if (sender === 'ai' && window.MinimaxTTS && MinimaxTTS.isConfigured()) {
            MinimaxTTS.speak(text).catch(err => {
                console.error('[VideoCall] MiniMax TTS 播放失败:', err);
            });
        }
    }
    
    /**
     * Toast提示
     */
    function showToast(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        } else {
            console.log('[VideoCall Toast]', message);
        }
    }
    
    // ========== 照片管理器UI ==========
    
    /**
     * 打开照片管理器
     */
    function openPhotoManager() {
        const currentChat = window.AppState?.currentChat;
        if (!currentChat) {
            showToast('请先打开一个聊天会话');
            return;
        }
        
        const characterId = currentChat.id;
        showPhotoManagerModal(characterId);
    }
    
    /**
     * 显示照片管理器弹窗
     */
    function showPhotoManagerModal(characterId) {
        // 创建弹窗
        const modal = document.createElement('div');
        modal.id = 'video-photo-manager-modal';
        modal.className = 'video-photo-manager-modal';
        modal.innerHTML = `
            <div class="video-photo-manager-content">
                <div class="video-photo-manager-header">
                    <h3>照片管理</h3>
                    <button class="video-photo-manager-close">×</button>
                </div>
                <div class="video-photo-manager-body">
                    <div class="video-photo-section">
                        <h4>角色照片</h4>
                        <div class="video-photos-grid" id="character-photos-grid"></div>
                        <button class="video-add-photo-btn" data-type="character">
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            添加角色照片
                        </button>
                    </div>
                    <div class="video-photo-section">
                        <h4>用户照片</h4>
                        <div class="video-photos-grid" id="user-photos-grid"></div>
                        <button class="video-add-photo-btn" data-type="user">
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            添加用户照片
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 关闭按钮
        modal.querySelector('.video-photo-manager-close').addEventListener('click', () => {
            modal.remove();
        });
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // 添加照片按钮
        modal.querySelectorAll('.video-add-photo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                addPhotoToLibrary(characterId, type, modal);
            });
        });
        
        // 渲染现有照片
        renderPhotoLibrary(characterId, modal);
    }
    
    /**
     * 渲染照片库
     */
    function renderPhotoLibrary(characterId, modal) {
        const characterPhotos = getCharacterPhotos(characterId);
        const userPhotos = getUserPhotos(characterId);
        
        // 渲染角色照片
        const characterGrid = modal.querySelector('#character-photos-grid');
        characterGrid.innerHTML = characterPhotos.map((photo, index) => `
            <div class="video-photo-item">
                <img src="${photo}" alt="角色照片${index + 1}">
                <button class="video-photo-item-delete" data-type="character" data-index="${index}">×</button>
            </div>
        `).join('');
        
        // 渲染用户照片
        const userGrid = modal.querySelector('#user-photos-grid');
        userGrid.innerHTML = userPhotos.map((photo, index) => `
            <div class="video-photo-item">
                <img src="${photo}" alt="用户照片${index + 1}">
                <button class="video-photo-item-delete" data-type="user" data-index="${index}">×</button>
            </div>
        `).join('');
        
        // 绑定删除按钮
        modal.querySelectorAll('.video-photo-item-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const index = parseInt(btn.dataset.index);
                deletePhotoFromLibrary(characterId, type, index, modal);
            });
        });
    }
    
    /**
     * 添加照片到图库
     */
    function addPhotoToLibrary(characterId, type, modal) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            
            for (const file of files) {
                if (!file.type.startsWith('image/')) {
                    continue;
                }
                
                try {
                    const base64 = await fileToBase64(file);
                    
                    if (type === 'character') {
                        const photos = getCharacterPhotos(characterId);
                        photos.push(base64);
                        saveCharacterPhotos(characterId, photos);
                    } else {
                        const photos = getUserPhotos(characterId);
                        photos.push(base64);
                        saveUserPhotos(characterId, photos);
                    }
                } catch (error) {
                    console.error('[VideoCall] 读取图片失败:', error);
                    showToast('读取图片失败');
                }
            }
            
            renderPhotoLibrary(characterId, modal);
            showToast('照片已添加');
        };
        
        input.click();
    }
    
    /**
     * 从图库删除照片
     */
    function deletePhotoFromLibrary(characterId, type, index, modal) {
        if (!confirm('确定要删除这张照片吗？')) {
            return;
        }
        
        if (type === 'character') {
            const photos = getCharacterPhotos(characterId);
            photos.splice(index, 1);
            saveCharacterPhotos(characterId, photos);
        } else {
            const photos = getUserPhotos(characterId);
            photos.splice(index, 1);
            saveUserPhotos(characterId, photos);
        }
        
        renderPhotoLibrary(characterId, modal);
        showToast('照片已删除');
    }
    
    /**
     * 将文件转换为Base64
     */
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * 初始化视频通话系统
     */
    function initVideoCallSystem() {
        console.log('[VideoCall] 初始化视频通话系统');
        
        // 绑定最小化按钮
        const minimizeBtn = document.getElementById('video-call-minimize-btn');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', minimizeVideoCall);
        }
        
        // 绑定主屏幕和小屏幕的长按事件
        setupScreenInteractions();
        
        // 暴露全局方法
        window.VideoCallSystem = {
            start: startVideoCall,
            receiveCall: receiveIncomingVideoCall,
            end: endVideoCall,
            minimize: minimizeVideoCall,
            maximize: maximizeVideoCall,
            switchScreen: switchMainAndSmallScreen,
            sendMessage: sendMessage,
            openPhotoManager: openPhotoManager,
            showMainScreenPhotoSelector: showMainScreenPhotoSelector,
            showSmallScreenPhotoSelector: showSmallScreenPhotoSelector,
            getCharacterPhotos: getCharacterPhotos,
            saveCharacterPhotos: saveCharacterPhotos,
            getUserPhotos: getUserPhotos,
            saveUserPhotos: saveUserPhotos,
            isInCall: () => videoCallState.isInCall,
            getCurrentCallerId: () => videoCallState.callerId,
            getCurrentCallConversation: () => {
                return currentVideoCallConversation.map(msg => ({
                    sender: msg.sender,
                    text: msg.text,
                    timestamp: msg.timestamp
                }));
            },
            getCallStartTime: () => videoCallState.callStartTime,
            getCallDuration: () => {
                if (videoCallState.callStartTime) {
                    return Math.floor((Date.now() - videoCallState.callStartTime) / 1000);
                }
                return 0;
            }
        };
        
        console.log('[VideoCall] 视频通话系统初始化完成');
    }
    
    /**
     * 设置屏幕交互（点击切换，长按选照片）
     */
    function setupScreenInteractions() {
        const mainScreen = document.getElementById('video-main-screen');
        const smallScreen = document.getElementById('video-small-screen');
        
        if (mainScreen) {
            let mainPressTimer = null;
            let mainIsMoved = false;
            
            // 触摸开始
            mainScreen.addEventListener('touchstart', (e) => {
                mainIsMoved = false;
                mainPressTimer = setTimeout(() => {
                    showMainScreenPhotoSelector();
                }, 500); // 500ms长按
            });
            
            // 触摸移动
            mainScreen.addEventListener('touchmove', (e) => {
                mainIsMoved = true;
                if (mainPressTimer) {
                    clearTimeout(mainPressTimer);
                    mainPressTimer = null;
                }
            });
            
            // 触摸结束
            mainScreen.addEventListener('touchend', (e) => {
                if (mainPressTimer) {
                    clearTimeout(mainPressTimer);
                    mainPressTimer = null;
                }
                // 如果没有移动且没有长按，则切换大小屏
                if (!mainIsMoved) {
                    // 短按延迟，避免与长按冲突
                    setTimeout(() => {
                        if (!document.querySelector('.video-photo-quick-selector')) {
                            switchMainAndSmallScreen();
                        }
                    }, 100);
                }
            });
            
            // 鼠标事件（PC端）
            mainScreen.addEventListener('mousedown', (e) => {
                mainPressTimer = setTimeout(() => {
                    showMainScreenPhotoSelector();
                }, 500);
            });
            
            mainScreen.addEventListener('mouseup', (e) => {
                if (mainPressTimer) {
                    clearTimeout(mainPressTimer);
                    mainPressTimer = null;
                }
            });
            
            mainScreen.addEventListener('mouseleave', (e) => {
                if (mainPressTimer) {
                    clearTimeout(mainPressTimer);
                    mainPressTimer = null;
                }
            });
            
            // 点击事件（PC端短按）
            mainScreen.addEventListener('click', (e) => {
                if (!document.querySelector('.video-photo-quick-selector')) {
                    // 点击切换已在mouseup中处理，这里不需要
                }
            });
        }
        
        if (smallScreen) {
            let smallPressTimer = null;
            let smallIsMoved = false;
            
            // 触摸开始
            smallScreen.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                smallIsMoved = false;
                smallPressTimer = setTimeout(() => {
                    showSmallScreenPhotoSelector();
                }, 500);
            });
            
            // 触摸移动
            smallScreen.addEventListener('touchmove', (e) => {
                smallIsMoved = true;
                if (smallPressTimer) {
                    clearTimeout(smallPressTimer);
                    smallPressTimer = null;
                }
            });
            
            // 触摸结束
            smallScreen.addEventListener('touchend', (e) => {
                e.stopPropagation();
                if (smallPressTimer) {
                    clearTimeout(smallPressTimer);
                    smallPressTimer = null;
                }
                // 短按切换大小屏
                if (!smallIsMoved) {
                    setTimeout(() => {
                        if (!document.querySelector('.video-photo-quick-selector')) {
                            switchMainAndSmallScreen();
                        }
                    }, 100);
                }
            });
            
            // 鼠标事件（PC端）
            smallScreen.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                smallPressTimer = setTimeout(() => {
                    showSmallScreenPhotoSelector();
                }, 500);
            });
            
            smallScreen.addEventListener('mouseup', (e) => {
                e.stopPropagation();
                if (smallPressTimer) {
                    clearTimeout(smallPressTimer);
                    smallPressTimer = null;
                }
            });
            
            smallScreen.addEventListener('mouseleave', (e) => {
                if (smallPressTimer) {
                    clearTimeout(smallPressTimer);
                    smallPressTimer = null;
                }
            });
            
            // 点击事件（PC端）
            smallScreen.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!document.querySelector('.video-photo-quick-selector')) {
                    // 点击切换已在mouseup中处理
                }
            });
        }
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVideoCallSystem);
    } else {
        initVideoCallSystem();
    }
    
})();