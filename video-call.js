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
        isUserPhotoInMain: false, // true=用户照片在主屏，false=角色照片在主屏
        
        // 聊天界面自动隐藏
        chatAutoHideTimer: null // 聊天界面5秒自动隐藏计时器
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
        console.log('[VideoCall] === 开始视频通话流程 ===');
        console.log('[VideoCall] 当前状态检查:', JSON.stringify({
            isInCall: videoCallState.isInCall,
            callStartTime: videoCallState.callStartTime,
            callType: videoCallState.callType,
            callerId: videoCallState.callerId
        }));
        
        if (videoCallState.isInCall) {
            console.warn('[VideoCall] 检测到异常：isInCall为true，但没有正在进行的通话');
            showToast('检测到异常状态，正在重置...');
            resetVideoCallState();
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
        
        // 模拟接通（1.5-3秒随机延迟）
        const waitTime = 1500 + Math.random() * 1500;
        setTimeout(() => {
            videoCallConnected();
        }, waitTime);
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
        
        // 移除等待状态
        const videoInterface = document.getElementById('video-call-interface');
        if (videoInterface) {
            videoInterface.classList.remove('waiting');
        }
        
        showToast('视频通话已接通');
        
        // 启动计时器
        startDurationTimer();
        
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
        
        // 添加等待状态
        videoInterface.classList.add('waiting');
        
        // 更新视频显示
        updateVideoDisplay();
        
        // 重置计时器显示
        const durationEl = document.getElementById('video-call-duration');
        if (durationEl) {
            durationEl.textContent = '00:00';
        }
        
        // 清空当前聊天记录显示（但不清除历史，只显示当前通话消息）
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
     * 初始化聊天界面交互监听器
     * 监听用户与聊天界面的所有交互，并在交互时重置自动隐藏计时器
     */
   function initChatScrollListener() {
       const chatContainer = document.getElementById('video-chat-container');
       const chatMessages = document.getElementById('video-chat-messages');
       const chatInput = document.getElementById('video-chat-input');
       if (!chatContainer || !chatMessages) return;
       
       // 监听滚动事件
       chatMessages.addEventListener('scroll', () => {
           // 检测是否在底部附近（50px以内）
           const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 50;
           
           // 标记用户是否正在查看历史
           chatMessages.setAttribute('data-user-scrolling', !isNearBottom ? 'true' : 'false');
           
           // 重置自动隐藏计时器
           resetChatAutoHideTimer();
       });
       
       // 监听触摸事件
       chatMessages.addEventListener('touchstart', () => {
           chatMessages.setAttribute('data-user-scrolling', 'true');
           resetChatAutoHideTimer();
       });
       
       chatMessages.addEventListener('touchend', () => {
           const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 50;
           chatMessages.setAttribute('data-user-scrolling', !isNearBottom ? 'true' : 'false');
           resetChatAutoHideTimer();
       });
       
       chatMessages.addEventListener('touchmove', () => {
           resetChatAutoHideTimer();
       });
       
       // 监听鼠标事件
       chatMessages.addEventListener('mousedown', () => {
           resetChatAutoHideTimer();
       });
       
       chatMessages.addEventListener('mousemove', () => {
           resetChatAutoHideTimer();
       });
       
       chatMessages.addEventListener('mouseup', () => {
           resetChatAutoHideTimer();
       });
       
       // 监听输入框事件
       if (chatInput) {
           chatInput.addEventListener('focus', () => {
               resetChatAutoHideTimer();
           });
           
           chatInput.addEventListener('input', () => {
               resetChatAutoHideTimer();
           });
           
           chatInput.addEventListener('keydown', () => {
               resetChatAutoHideTimer();
           });
       }
       
       // 监听整个聊天容器的事件
       chatContainer.addEventListener('mouseenter', () => {
           resetChatAutoHideTimer();
       });
       
       chatContainer.addEventListener('mouseleave', () => {
           // 鼠标离开后，5秒自动隐藏
           showChatContainer();
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
        
        // 挂断按钮
        const endBtn = document.getElementById('video-end-btn');
        if (endBtn) {
            endBtn.addEventListener('click', endVideoCall);
        }
        
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
     * 重置视频通话状态
     * 用于初始化和异常状态清理
     */
   function resetVideoCallState() {
       console.log('[VideoCall] 重置视频通话状态');
       
       // 停止计时器
       if (videoCallState.timerInterval) {
           clearInterval(videoCallState.timerInterval);
           videoCallState.timerInterval = null;
       }
       
       // 清除聊天自动隐藏计时器
       if (videoCallState.chatAutoHideTimer) {
           clearTimeout(videoCallState.chatAutoHideTimer);
           videoCallState.chatAutoHideTimer = null;
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
       videoCallState.chatAutoHideTimer = null;
        
        // 清空对话记录和消息队列
        currentVideoCallConversation = [];
        videoMessageQueue = [];
        isVideoAIResponding = false;
        isProcessingVideoQueue = false;
        
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
        
        // 更新聊天页面状态
        updateChatPageStatus();
        
        console.log('[VideoCall] ✅ 状态已重置');
    }
    
    /**
     * 结束视频通话
     */
    function endVideoCall() {
        console.log('[VideoCall] ========== 结束视频通话 ==========');
        console.log('[VideoCall] callStartTime:', videoCallState.callStartTime);
        console.log('[VideoCall] 当前时间:', Date.now());
        console.log('[VideoCall] isInCall:', videoCallState.isInCall);
        
        // 计算通话时长（秒）
        const duration = videoCallState.callStartTime
            ? Math.floor((Date.now() - videoCallState.callStartTime) / 1000)
            : 0;
        
        console.log('[VideoCall] 计算的通话时长:', duration, '秒');
        
        if (duration === 0) {
            console.warn('[VideoCall] ⚠️ 通话时长为0！callStartTime可能未设置或已被清除');
        }
        
        // 更新聊天记录为"已挂断"
        updateLastVideoCallRecord('ended', duration);
        
        // 如果有通话内容，进行总结
        if (currentVideoCallConversation.length > 0) {
            summarizeVideoCallConversation();
        }
        
        // 重置所有状态
        resetVideoCallState();
        
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
        
        // 移除等待状态（来电直接接通，不需要等待）
        const videoInterface = document.getElementById('video-call-interface');
        if (videoInterface) {
            setTimeout(() => {
                videoInterface.classList.remove('waiting');
            }, 100);
        }
        
        // 开始计时
        startDurationTimer();
        
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
            
            // 更新视频通话界面时长显示
            const videoDurationEl = document.getElementById('video-call-duration');
            if (videoDurationEl) {
                videoDurationEl.textContent = timeStr;
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
        let hasMoved = false; // 跟踪是否发生了拖动
        let startX = 0, startY = 0; // 记录起始位置
        
        element.onmousedown = dragMouseDown;
        element.ontouchstart = dragTouchStart;
        
        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            startX = e.clientX;
            startY = e.clientY;
            hasMoved = false;
            element.classList.add('dragging');
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function dragTouchStart(e) {
            e.preventDefault();
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            hasMoved = false;
            element.classList.add('dragging');
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDragTouch;
        }
        
        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            // 检查是否移动了超过5像素（避免误触）
            const moveDistance = Math.sqrt(
                Math.pow(e.clientX - startX, 2) +
                Math.pow(e.clientY - startY, 2)
            );
            if (moveDistance > 5) {
                hasMoved = true;
            }
            
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
            
            // 检查是否移动了超过5像素（避免误触）
            const moveDistance = Math.sqrt(
                Math.pow(e.touches[0].clientX - startX, 2) +
                Math.pow(e.touches[0].clientY - startY, 2)
            );
            if (moveDistance > 5) {
                hasMoved = true;
            }
            
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.right = 'auto';
        }
        
        function closeDragElement() {
            element.classList.remove('dragging');
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
            
            // 如果没有拖动（只是点击），则最大化视频通话
            if (!hasMoved) {
                console.log('[VideoCall] 悬浮窗被点击，最大化视频通话');
                maximizeVideoCall();
            }
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
                
                console.log('[VideoCall] 更新通话记录:', {
                    status: newStatus,
                    duration: newDuration,
                    formatted: formatVideoDuration(newDuration)
                });
                
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
            
            // 判断通话发起方
            const isUserInitiated = videoCallState.callType === 'outgoing';
            const initiatorInfo = isUserInitiated
                ? `【重要】这是${userName}主动打给你的视频电话，${userName}想和你视频聊天。`
                : `【重要】这是你主动打给${userName}的视频电话。`;

            let systemPrompt = `你正在与用户进行视频通话。

${initiatorInfo}

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
5. 可以偶尔提到看到对方的表情或动作（营造视频通话氛围）
6. 记住对方的名称是"${userName}"`;

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
            
            // 获取完整的conversation对象（包含summaries等信息）
            const convId = currentChat.id;
            const conversation = window.AppState?.conversations?.find(c => c.id === convId);
            
            // 添加角色的历史总结（summaries）作为上下文
            if (conversation && conversation.summaries && conversation.summaries.length > 0) {
                console.log('[VideoCall] 添加历史总结上下文，共', conversation.summaries.length, '条');
                
                const summariesContent = conversation.summaries.map((s, idx) => {
                    const type = s.isAutomatic ? '自动总结' : '手动总结';
                    const time = new Date(s.timestamp).toLocaleString('zh-CN');
                    return `【${type} #${idx + 1}】(${time}, 基于${s.messageCount}条消息)\n${s.content}`;
                }).join('\n\n');
                
                messages.push({
                    role: 'system',
                    content: `【历史对话总结】以下是你们之前的对话总结，请参考这些历史信息来理解你们的关系和背景：\n\n${summariesContent}\n\n请记住这些历史信息，让回复更加连贯和符合角色设定。`
                });
            }
            
            // 添加聊天页面最新的50条消息作为上下文
            const recentChatMessages = window.AppState?.messages?.[convId] || [];
            if (recentChatMessages.length > 0) {
                const recentCount = 50; // 读取最近50条聊天记录
                const recentMessages = recentChatMessages.slice(-recentCount);
                console.log('[VideoCall] 添加聊天页面最近消息上下文，共', recentMessages.length, '条');
                
                const chatContext = recentMessages.map(msg => {
                    const senderName = msg.sender === 'user' ? userName : charName;
                    let content = msg.content || '';
                    
                    // 处理特殊消息类型的显示
                    if (msg.type === 'voice') {
                        content = '[语音消息]';
                    } else if (msg.type === 'image') {
                        content = '[图片消息]';
                    } else if (msg.type === 'voicecall') {
                        content = '[语音通话]';
                    } else if (msg.type === 'videocall') {
                        content = '[视频通话]';
                    } else if (msg.type === 'location') {
                        content = '[位置消息]';
                    }
                    
                    return `${senderName}: ${content}`;
                }).join('\n');
                
                messages.push({
                    role: 'system',
                    content: `【最近的聊天记录】以下是你们在聊天界面中最近的对话（最新50条）：\n\n${chatContext}\n\n这些是你们最近的聊天内容，请参考这些信息来保持对话的连贯性。`
                });
            }
            
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
                max_tokens: 10000, // 增加到10000，避免回复被截断
                stream: false
            };
            
            const fetchOptions = window.APIUtils.createFetchOptions(api.apiKey || '', body);
            
            const response = await fetch(endpoint, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`API调用失败: ${response.status}`);
            }
            
            const data = await response.json();
            const aiText = window.APIUtils.extractTextFromResponse(data);
            
            if (aiText && aiText.trim()) {
                // 添加AI回复到视频通话界面
                addVideoMessage('ai', aiText);
            } else {
                console.error('[VideoCall] AI回复为空');
            }
            
        } catch (error) {
            console.error('[VideoCall] AI回复失败:', error);
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
     * 移除"正在说话"指示器
     */
    function removeVideoTypingIndicator() {
        const messagesContainer = document.getElementById('video-chat-messages');
        if (!messagesContainer) return;
        
        const lastMessage = messagesContainer.lastElementChild;
        if (lastMessage && lastMessage.textContent.includes('正在说话')) {
            lastMessage.remove();
            
            // 同时从对话记录中移除"正在说话"消息
            if (currentVideoCallConversation.length > 0) {
                const lastConvMsg = currentVideoCallConversation[currentVideoCallConversation.length - 1];
                if (lastConvMsg.text && lastConvMsg.text.includes('正在说话')) {
                    currentVideoCallConversation.pop();
                    console.log('[VideoCall] 已从对话记录中移除"正在说话"消息');
                }
            }
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
     * 设置视频聊天输入框事件监听
     */
    function setupVideoChatInput() {
        const input = document.getElementById('video-chat-input');
        if (!input) {
            console.log('[VideoCall] 聊天输入框不存在');
            return;
        }
        
        console.log('[VideoCall] 绑定聊天输入框事件');
        
        // 跟踪输入法状态
        let isComposing = false;
        
        // 输入法开始
        input.addEventListener('compositionstart', function() {
            isComposing = true;
            console.log('[VideoCall] 输入法开始');
        });
        
        // 输入法结束
        input.addEventListener('compositionend', function() {
            isComposing = false;
            console.log('[VideoCall] 输入法结束');
            // 延迟一点时间，确保输入完成
            setTimeout(() => {
                // 检查是否需要自动发送（某些输入法会在compositionend后触发keydown）
                const message = input.value.trim();
                if (message) {
                    console.log('[VideoCall] 输入法完成，等待用户确认发送');
                }
            }, 100);
        });
        
        // 监听键盘事件（支持PC端Enter键和移动端输入法发送键）
        input.addEventListener('keydown', function(e) {
            // Enter键发送（keyCode 13 或 key 'Enter'）
            if (e.key === 'Enter' || e.keyCode === 13) {
                // 如果正在使用输入法，不发送
                if (isComposing) {
                    console.log('[VideoCall] 输入法中，忽略Enter键');
                    return;
                }
                e.preventDefault();
                console.log('[VideoCall] Enter键发送消息');
                sendVideoMessage();
            }
        });
        
        // 监听输入法的确认事件（移动端输入法发送键）
        input.addEventListener('keypress', function(e) {
            // 某些移动端输入法使用 keypress 发送
            if ((e.key === 'Enter' || e.keyCode === 13) && !isComposing) {
                e.preventDefault();
                console.log('[VideoCall] Keypress事件发送消息');
                sendVideoMessage();
            }
        });
    }
    
    /**
     * 发送消息的公共方法（供HTML调用）
     */
    function sendMessage() {
        sendVideoMessage();
    }
    
   /**
     * 显示聊天容器并启动自动隐藏计时器
     */
   function showChatContainer() {
       const chatContainer = document.getElementById('video-chat-container');
       if (!chatContainer) return;
       
       // 显示聊天容器
       chatContainer.classList.add('show-messages');
       
       // 清除之前的计时器
       if (videoCallState.chatAutoHideTimer) {
           clearTimeout(videoCallState.chatAutoHideTimer);
       }
       
       // 启动新的5秒自动隐藏计时器
       videoCallState.chatAutoHideTimer = setTimeout(() => {
           chatContainer.classList.remove('show-messages');
           console.log('[VideoCall] 聊天界面5秒无操作，自动隐藏');
       }, 5000);
   }
   
   /**
     * 重置聊天界面自动隐藏计时器
     */
   function resetChatAutoHideTimer() {
       const chatContainer = document.getElementById('video-chat-container');
       if (!chatContainer) return;
       
       // 显示聊天容器
       chatContainer.classList.add('show-messages');
       
       // 清除之前的计时器
       if (videoCallState.chatAutoHideTimer) {
           clearTimeout(videoCallState.chatAutoHideTimer);
       }
       
       // 启动新的5秒自动隐藏计时器
       videoCallState.chatAutoHideTimer = setTimeout(() => {
           chatContainer.classList.remove('show-messages');
           console.log('[VideoCall] 聊天界面5秒无操作，自动隐藏');
       }, 5000);
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
       
       // 检查用户是否正在滚动查看历史
       const isUserScrolling = messagesContainer.getAttribute('data-user-scrolling') === 'true';
       if (!isUserScrolling) {
           // 自动滚动到底部
           messagesContainer.scrollTop = messagesContainer.scrollHeight;
       }
       
       // 显示聊天容器并启动自动隐藏计时器
       showChatContainer();
       
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
        
        // 确保状态被重置（防止页面刷新或异常后的残留状态）
        resetVideoCallState();
        
        // 绑定最小化按钮
        const minimizeBtn = document.getElementById('video-call-minimize-btn');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', minimizeVideoCall);
        }
        
        // 绑定主屏幕和小屏幕的长按事件
        setupScreenInteractions();
        
        // 绑定视频聊天输入框的键盘事件
        setupVideoChatInput();
        
        // 暴露全局方法
        window.VideoCallSystem = {
            start: startVideoCall,
            receiveCall: receiveIncomingVideoCall,
            end: endVideoCall,
            reset: resetVideoCallState,
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