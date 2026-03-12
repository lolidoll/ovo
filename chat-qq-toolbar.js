/**
 * QQ风格聊天工具栏管理器
 * 处理工具栏按钮、更多面板的滑动切换等功能
 */

(function() {
    'use strict';
    
    // 更多面板状态
    let morePanelState = {
        isOpen: false,
        currentPage: 0,
        totalPages: 2,
        swiper: null,
        startX: 0,
        currentX: 0,
        isDragging: false
    };
    
    /**
     * 初始化QQ风格工具栏
     */
    function initQQToolbar() {
        console.log('🎨 初始化QQ风格工具栏');
        
        // 初始化"更多"按钮
        initMoreButton();
        
        // 初始化更多面板
        initMorePanel();
        setupMorePanelObserver();
        
        // 初始化按钮映射
        initButtonMappings();
        
        // 初始化"回复"按钮
        initReplyButton();

        // 初始化"线下"按钮
        initOfflineButton();
    }
    
    /**
     * 初始化"更多"按钮
     */
    function initMoreButton() {
        const btnMore = document.getElementById('btn-more');
        const morePanel = document.getElementById('toolbar-more-panel');
        
        if (!btnMore || !morePanel) {
            console.warn('⚠️ 未找到更多按钮或面板');
            return;
        }
        
        // 点击更多按钮
        btnMore.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Toolbar] 更多按钮被点击');
            toggleMorePanel();
        });
        
        // 点击关闭按钮
        const closeBtn = morePanel.querySelector('.more-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                closeMorePanel();
            });
        }
        
        // 点击面板外部关闭
        document.addEventListener('click', function(e) {
            if (morePanelState.isOpen &&
                !morePanel.contains(e.target) &&
                e.target !== btnMore &&
                !btnMore.contains(e.target)) {
                closeMorePanel();
            }
        });
    }
    
    /**
     * 切换更多面板显示/隐藏
     */
    function toggleMorePanel() {
        if (morePanelState.isOpen) {
            closeMorePanel();
        } else {
            openMorePanel();
        }
    }
    
    /**
     * 打开更多面板
     */
    function openMorePanel() {
        const morePanel = document.getElementById('toolbar-more-panel');
        if (!morePanel) return;
        
        // 关闭表情包库
        const emojiLib = document.getElementById('emoji-library');
        if (emojiLib && emojiLib.classList.contains('show')) {
            emojiLib.classList.remove('show');
        }
        
        morePanel.classList.add('show');
        morePanelState.isOpen = true;

        // 参考表情包库行为：更多栏弹出时同步上移输入框和工具栏
        setTimeout(() => {
            updateBottomAreaPositionForMorePanel();
        }, 0);
        
        console.log('📱 打开更多面板');
    }
    
    /**
     * 关闭更多面板
     */
    function closeMorePanel() {
        const morePanel = document.getElementById('toolbar-more-panel');
        if (!morePanel) return;
        
        morePanel.classList.remove('show');
        morePanelState.isOpen = false;
        resetBottomAreaPosition();
        
        console.log('📱 关闭更多面板');
    }

    /**
     * 重置输入框和工具栏位置
     */
    function resetBottomAreaPosition() {
        const inputArea = document.querySelector('.chat-input-area');
        const toolbar = document.getElementById('chat-toolbar');
        if (inputArea) inputArea.style.transform = 'translateY(0)';
        if (toolbar) toolbar.style.transform = 'translateY(0)';
    }

    /**
     * 更多栏弹出时，输入框和工具栏同步上移
     */
    function updateBottomAreaPositionForMorePanel() {
        const morePanel = document.getElementById('toolbar-more-panel');
        const inputArea = document.querySelector('.chat-input-area');
        const toolbar = document.getElementById('chat-toolbar');
        if (!morePanel || !inputArea || !toolbar) return;

        if (!morePanel.classList.contains('show')) {
            resetBottomAreaPosition();
            return;
        }

        // 优先使用实际渲染高度，避免 fixed/absolute 布局下偏移不准
        let panelHeight = morePanel.offsetHeight;

        // 兜底：如果高度还没渲染完成，则读取 max-height 推算
        if (!panelHeight) {
            const maxHeight = window.getComputedStyle(morePanel).maxHeight || '';
            if (maxHeight.includes('vh')) {
                panelHeight = (window.innerHeight * parseFloat(maxHeight)) / 100;
            } else if (maxHeight.endsWith('px')) {
                panelHeight = parseFloat(maxHeight);
            }
        }

        if (panelHeight > 0) {
            const offset = Math.round(panelHeight);
            inputArea.style.transform = `translateY(-${offset}px)`;
            toolbar.style.transform = `translateY(-${offset}px)`;
        }
    }

    /**
     * 监听更多栏尺寸变化，保持输入框和工具栏位置同步
     */
    function setupMorePanelObserver() {
        const morePanel = document.getElementById('toolbar-more-panel');
        if (!morePanel) return;

        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(() => {
                if (morePanelState.isOpen) {
                    updateBottomAreaPositionForMorePanel();
                }
            });
            resizeObserver.observe(morePanel);
        }

        window.addEventListener('resize', () => {
            if (morePanelState.isOpen) {
                updateBottomAreaPositionForMorePanel();
            }
        });
    }
    
    /**
     * 初始化更多面板的滑动功能
     */
    function initMorePanel() {
        const swiper = document.getElementById('more-panel-swiper');
        if (!swiper) return;
        
        morePanelState.swiper = swiper;
        
        // 触摸事件 - 移动端
        swiper.addEventListener('touchstart', handleTouchStart, { passive: true });
        swiper.addEventListener('touchmove', handleTouchMove, { passive: false });
        swiper.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        // 鼠标事件 - 电脑端
        swiper.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        swiper.addEventListener('mouseleave', handleMouseLeave);
        
        // 滚动事件 - 更新分页指示器
        swiper.addEventListener('scroll', updatePagination, { passive: true });
        
        console.log('✅ 更多面板滑动功能已初始化（支持触摸和鼠标）');
    }
    
    /**
     * 处理触摸开始
     */
    function handleTouchStart(e) {
        morePanelState.startX = e.touches[0].clientX;
        morePanelState.isDragging = true;
    }
    
    /**
     * 处理触摸移动
     */
    function handleTouchMove(e) {
        if (!morePanelState.isDragging) return;
        
        morePanelState.currentX = e.touches[0].clientX;
    }
    
    /**
     * 处理触摸结束
     */
    function handleTouchEnd(e) {
        handleSwipeEnd();
    }
    
    /**
     * 处理鼠标按下 - 电脑端
     */
    function handleMouseDown(e) {
        morePanelState.startX = e.clientX;
        morePanelState.currentX = e.clientX;
        morePanelState.isDragging = true;
    }
    
    /**
     * 处理鼠标移动 - 电脑端
     */
    function handleMouseMove(e) {
        if (!morePanelState.isDragging) return;
        morePanelState.currentX = e.clientX;
    }
    
    /**
     * 处理鼠标松开 - 电脑端
     */
    function handleMouseUp(e) {
        if (morePanelState.isDragging) {
            handleSwipeEnd();
        }
    }
    
    /**
     * 处理鼠标离开滑动区域
     */
    function handleMouseLeave(e) {
        if (morePanelState.isDragging) {
            morePanelState.isDragging = false;
        }
    }
    
    /**
     * 处理滑动结束（触摸和鼠标共用）
     */
    function handleSwipeEnd() {
        if (!morePanelState.isDragging) return;
        
        const deltaX = morePanelState.currentX - morePanelState.startX;
        const threshold = 50; // 滑动阈值
        
        if (Math.abs(deltaX) > threshold) {
            if (deltaX > 0 && morePanelState.currentPage > 0) {
                // 向右滑动 - 上一页
                morePanelState.currentPage--;
                scrollToPage(morePanelState.currentPage);
            } else if (deltaX < 0 && morePanelState.currentPage < morePanelState.totalPages - 1) {
                // 向左滑动 - 下一页
                morePanelState.currentPage++;
                scrollToPage(morePanelState.currentPage);
            }
        }
        
        morePanelState.isDragging = false;
    }
    
    /**
     * 滚动到指定页面
     */
    function scrollToPage(pageIndex) {
        const swiper = morePanelState.swiper;
        if (!swiper) return;
        
        const pageWidth = swiper.offsetWidth;
        swiper.scrollTo({
            left: pageIndex * pageWidth,
            behavior: 'smooth'
        });
        
        updatePagination();
    }
    
    /**
     * 更新分页指示器
     */
    function updatePagination() {
        const swiper = morePanelState.swiper;
        if (!swiper) return;
        
        const pageWidth = swiper.offsetWidth;
        const scrollLeft = swiper.scrollLeft;
        const currentPage = Math.round(scrollLeft / pageWidth);
        
        morePanelState.currentPage = currentPage;
        
        // 更新指示器样式
        const dots = document.querySelectorAll('.more-panel-dot');
        dots.forEach((dot, index) => {
            if (index === currentPage) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    /**
     * 初始化按钮映射 - 将原有按钮功能映射到更多面板中的按钮
     */
    function initButtonMappings() {
        // 映射关系: 更多面板按钮ID -> 原始功能
        const buttonMappings = {
            'more-camera': handleCamera,
            'more-photo': handlePhoto,
            'more-location': handleLocation,
            'more-videocall': handleVideoCall,
            'more-redenvelope': handleRedEnvelope,
            'more-transfer': handleTransfer,
            'more-takeout': handleTakeout,
            'more-listen': handleListen,
            'more-fiction': handleFiction,
            'more-diary': handleDiary,
            'more-memo': handleMemo,
            'more-frog': handleFrog,
            'more-anonymous': handleAnonymous
        };
        
        // 绑定所有按钮事件
        Object.keys(buttonMappings).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', function() {
                    buttonMappings[btnId]();
                    closeMorePanel(); // 点击后关闭面板
                });
            }
        });
        
        // 注意：查手机按钮由iphone-simulator.js处理
        
        console.log('✅ 按钮映射已初始化');
    }
    
    /**
     * 初始化"回复"按钮
     */
    function initReplyButton() {
        const btnReply = document.getElementById('btn-reply');
        if (!btnReply) return;
        
        btnReply.addEventListener('click', function() {
            handleReply();
        });
        
        console.log('✅ 回复按钮已初始化');
    }

    /**
     * 初始化"线下"按钮
     */
    function initOfflineButton() {
        const btnOffline = document.getElementById('btn-offline');
        if (!btnOffline) return;

        btnOffline.addEventListener('click', function() {
            handleOffline();
        });

        console.log('✅ 线下按钮已初始化');
    }
    
    // ==================== 按钮功能处理函数 ====================
    
    function handleCamera() {
        // 触发相机功能 - 直接显示文字描述对话框
        if (window.showPhotoDescriptionDialog && typeof window.showPhotoDescriptionDialog === 'function') {
            window.showPhotoDescriptionDialog(null);
        } else {
            showToast('拍照功能尚未加载');
        }
    }
    
    function handlePhoto() {
        // 触发照片选择 - 无描述对话框，直接发送
        const toolbarFile = document.getElementById('toolbar-file-input');
        if (toolbarFile) {
            toolbarFile.dataset.mode = 'no-description';
            toolbarFile.click();
        } else {
            showToast('照片功能尚未实现');
        }
    }
    
    function handleLocation() {
        // 触发位置功能 - 直接调用LocationMessageModule
        if (window.LocationMessageModule && typeof window.LocationMessageModule.openLocationModal === 'function') {
            window.LocationMessageModule.openLocationModal();
        } else {
            showToast('位置功能尚未实现');
        }
    }
    
    function handleVideoCall() {
        console.log('[Toolbar] 触发视频通话');
        
        // 关闭更多面板
        closeMorePanel();
        
        // 调用视频通话系统
        if (window.VideoCallSystem && typeof window.VideoCallSystem.start === 'function') {
            window.VideoCallSystem.start();
        } else {
            console.warn('⚠️ 视频通话系统未初始化');
            showToast('视频通话功能加载中，请稍后再试');
        }
    }
    
    function handleRedEnvelope() {
        console.log('[Toolbar] 触发红包功能');
        
        // 关闭更多面板
        closeMorePanel();
        
        // 调用红包模块
        if (window.RedEnvelopeModule && typeof window.RedEnvelopeModule.openSendModal === 'function') {
            window.RedEnvelopeModule.openSendModal();
        } else {
            console.warn('⚠️ 红包模块未初始化');
            showToast('红包功能加载中，请稍后再试');
        }
    }
    
    function handleTransfer() {
        console.log('[Toolbar] 触发转账功能');
        
        // 关闭更多面板
        closeMorePanel();
        
        // 调用转账模块
        if (window.TransferModule && typeof window.TransferModule.openSendModal === 'function') {
            window.TransferModule.openSendModal();
        } else {
            console.warn('⚠️ 转账模块未初始化');
            showToast('转账功能加载中，请稍后再试');
        }
    }
    
    function handleTakeout() {
        console.log('[Toolbar] 触发购物功能');
        
        // 关闭更多面板
        closeMorePanel();
        
        // 打开购物页面 - 使用 open 类而不是 active 类
        const shoppingPage = document.getElementById('shopping-page');
        if (shoppingPage) {
            shoppingPage.classList.add('open');
            console.log('✅ 购物页面已打开');
        } else {
            console.warn('⚠️ 购物页面未找到');
            showToast('购物功能加载中，请稍后再试');
        }
    }
    
    function handleOffline() {
        console.log('[Toolbar] 触发线下功能');
        
        // 关闭更多面板
        closeMorePanel();
        
        // 打开线下聊天页面
        if (window.OfflineChat && typeof window.OfflineChat.open === 'function') {
            window.OfflineChat.open();
        } else {
            showToast('线下功能模块加载中，请稍后再试');
        }
    }
    
    function handleListen() {
        closeMorePanel();
        if (window.ListenTogether) {
            window.ListenTogether.open();
        } else {
            showToast('一起听功能加载中');
        }
    }
    
    function handleFiction() {
        openFiction();
    }
    
    function openFiction() {
        // 检查是否已加载同人文模块
        if (window.FictionModule && typeof window.FictionModule.open === 'function') {
            window.FictionModule.open();
        } else {
            console.warn('⚠️ 同人文模块未初始化');
            showToast('同人文功能加载中，请稍后再试');
        }
    }
    
    // handlePhone 已移除，由iphone-simulator.js处理
    
    function handleDiary() {
        showToast('日记功能尚未实现');
    }
    
    function handleMemo() {
        showToast('备忘录功能尚未实现');
    }
    
    function handleFrog() {
        showToast('旅行青蛙功能尚未实现');
    }
    
    function handleAnonymous() {
        showToast('匿名提问功能尚未实现');
    }
    
    function handleReply() {
        // 回复功能 - 直接触发AI回复
        console.log('🎯 点击回复按钮触发AI调用');
        
        // 检查是否有MainAPIManager
        if (window.MainAPIManager && typeof window.MainAPIManager.callApiWithConversation === 'function') {
            window.MainAPIManager.callApiWithConversation();
        } else {
            showToast('AI回复功能尚未加载');
        }
    }
    
    // 工具函数
    function showLocalToast(message) {
        const oldToast = document.getElementById('chat-qq-toolbar-toast');
        if (oldToast) oldToast.remove();

        const toast = document.createElement('div');
        toast.id = 'chat-qq-toolbar-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 72px;
            left: 50%;
            transform: translateX(-50%) translateY(24px) scale(0.92);
            opacity: 0;
            background: linear-gradient(145deg, rgba(255, 251, 254, 0.98) 0%, rgba(255, 234, 245, 0.96) 100%);
            color: #8f4b67;
            padding: 12px 22px;
            border-radius: 999px;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.2px;
            border: 1px solid rgba(255, 194, 220, 0.9);
            box-shadow: 0 10px 28px rgba(255, 154, 196, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            z-index: 2147483000;
            max-width: min(82vw, 360px);
            text-align: center;
            line-height: 1.45;
            word-break: break-word;
            pointer-events: none;
            transition: opacity 0.28s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(24px) scale(0.92)';
            setTimeout(() => toast.remove(), 280);
        }, 2000);
    }

    function showToast(message) {
        if (window.showToast) {
            window.showToast(message);
        } else {
            showLocalToast(message);
        }
    }
    
    // 在DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initQQToolbar);
    } else {
        initQQToolbar();
    }
    
    // 导出供外部使用
    window.QQToolbar = {
        openMorePanel,
        closeMorePanel,
        toggleMorePanel
    };
    
})();
