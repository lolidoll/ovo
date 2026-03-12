/**
 * 同人文功能模块
 * 处理同人文页面的显示、分类切换、书籍展示等功能
 */

(function() {
    'use strict';
    
    // 同人文页面状态
    let fictionState = {
        isOpen: false,
        currentPage: 'category', // category, bookstore, bookshelf, mine
        currentCategory: 0,
        categories: [
            '现代言情', '豪门总裁', '甜宠暖文', '先婚后爱', '追妻火葬场',
            '娱乐圈', '校园青春', '穿书', '重生', '女配逆袭',
            '古代言情', '宫斗宅斗', '种田经商', '女尊女强', '仙侠玄幻',
            '修真修仙', '奇幻魔法', '悬疑灵异', '科幻星际', '末世囤货'
        ]
    };
    
    /**
     * 初始化同人文功能
     */
    function initFiction() {
        console.log('📚 初始化同人文功能');
        
        // 加载修复脚本
        loadFixScript();
        
        // 创建同人文页面DOM
        createFictionDOM();
        
        // 绑定事件
        bindFictionEvents();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            // 防抖处理
            if (window.resizeTimeout) {
                clearTimeout(window.resizeTimeout);
            }
            window.resizeTimeout = setTimeout(() => {
                checkFictionLayout();
            }, 100);
        });
        
        // 监听设备方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                checkFictionLayout();
            }, 200);
        });
        
        console.log('✅ 同人文功能已初始化');
    }
    
    /**
     * 加载修复脚本
     */
    function loadFixScript() {
        // 检查是否已加载修复脚本
        if (document.querySelector('script[src="fiction-fix.js"]')) {
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'fiction-fix.js';
        script.onload = function() {
            console.log('🛠️ 修复脚本已加载');
        };
        document.head.appendChild(script);
    }
    
    /**
     * 创建同人文页面DOM
     */
    function createFictionDOM() {
        // 检查是否已存在
        if (document.getElementById('fiction-page')) {
            return;
        }
        
        const fictionHTML = `
            <div id="fiction-page" class="fiction-page">
                <!-- 顶部导航 -->
                <div class="fiction-header">
                    <div class="fiction-logo">同人文</div>
                    <div class="fiction-search">搜索</div>
                    <div class="fiction-close">关闭</div>
                </div>
                
                <!-- 页面容器 -->
                <div class="fiction-container">
                    <!-- 分类页面 -->
                    <div id="fiction-category" class="fiction-content active">
                        <div class="fiction-category">
                            <div class="fiction-cat-left" id="fictionCatLeft">
                                ${fictionState.categories.map((cat, index) => 
                                    `<div class="fiction-cat-left-item ${index === 0 ? 'active' : ''}" data-index="${index}">${cat}</div>`
                                ).join('')}
                            </div>
                            <div class="fiction-cat-right">
                                ${fictionState.categories.map((cat, index) => 
                                    `<div class="fiction-cat-content ${index === 0 ? 'active' : ''}" data-index="${index}">
                                        <div class="fiction-tag-group">
                                            ${getCategoryTags(cat).map(tag => `<span class="fiction-tag">${tag}</span>`).join('')}
                                        </div>
                                        <div class="fiction-grid">
                                            ${generateBookCards().join('')}
                                        </div>
                                    </div>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- 书库页面 -->
                    <div id="fiction-bookstore" class="fiction-content">
                        <div class="fiction-bookstore">
                            <div class="fiction-section">
                                <div class="fiction-section-title">精选推荐</div>
                                <div class="fiction-grid">
                                    ${generateBookCards().join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 书架页面 -->
                    <div id="fiction-bookshelf" class="fiction-content">
                        <div class="fiction-empty">
                            <div>暂无书架</div>
                            <div style="font-size:12px">去分类看看吧</div>
                        </div>
                    </div>
                    
                    <!-- 我的页面 -->
                    <div id="fiction-mine" class="fiction-content">
                        <div class="fiction-empty">
                            <div>个人中心</div>
                        </div>
                    </div>
                </div>
                
                <!-- 底部导航 -->
                <div class="fiction-tabbar">
                    <div class="fiction-tab active" data-page="category">分类</div>
                    <div class="fiction-tab" data-page="bookstore">书库</div>
                    <div class="fiction-tab" data-page="bookshelf">书架</div>
                    <div class="fiction-tab" data-page="mine">我的</div>
                </div>
            </div>
        `;
        
        // 创建临时容器插入HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = fictionHTML;
        const fictionPage = tempDiv.firstElementChild;
        
        // 添加到body
        document.body.appendChild(fictionPage);
        
        // 添加样式链接
        const existingLink = document.querySelector('link[href="fiction-styles.css"]');
        if (!existingLink) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'fiction-styles.css';
            document.head.appendChild(link);
        }
    }
    
    /**
     * 获取分类标签
     */
    function getCategoryTags(category) {
        const tagMap = {
            '现代言情': ['都市', '婚恋', '情感', '爽文'],
            '豪门总裁': ['霸总', '豪门', '契约', '宠妻'],
            '甜宠暖文': ['甜宠', '治愈', '暗恋', '双向奔赴'],
            '先婚后爱': ['契约婚姻', '替嫁', '闪婚', '真香'],
            '追妻火葬场': ['破镜重圆', '追妻', '虐渣', '强宠'],
            '娱乐圈': ['顶流', '影帝', '综艺', '马甲'],
            '校园青春': ['校园', '学霸', '青春', '初恋'],
            '穿书': ['穿书', '穿成炮灰', '反派', '改剧情'],
            '重生': ['重生', '复仇', '逆袭', '虐渣'],
            '女配逆袭': ['女配', '洗白', '不做炮灰', '搞事业'],
            '古代言情': ['古言', '宫廷', '权谋', '虐恋'],
            '宫斗宅斗': ['宫斗', '宅斗', '后妃', '主母'],
            '种田经商': ['种田', '发家', '美食', '基建'],
            '女尊女强': ['女尊', '女强', '女帝', '大女主'],
            '仙侠玄幻': ['仙侠', '虐恋', '师徒', '渡劫'],
            '修真修仙': ['修真', '炼丹', '炼器', '团宠'],
            '奇幻魔法': ['魔法', '西幻', '精灵', '兽人'],
            '悬疑灵异': ['悬疑', '灵异', '风水', '破案'],
            '科幻星际': ['星际', '机甲', '虫族', '穿越星际'],
            '末世囤货': ['末世', '囤货', '空间', '丧尸']
        };
        return tagMap[category] || ['热门', '推荐'];
    }
    
    /**
     * 生成书籍卡片
     */
    function generateBookCards() {
        const cards = [];
        for (let i = 0; i < 9; i++) {
            cards.push(`
                <div class="fiction-card">
                    <div class="fiction-cover"></div>
                    <div class="fiction-title">小说占位</div>
                </div>
            `);
        }
        return cards;
    }
    
    /**
     * 绑定事件
     */
    function bindFictionEvents() {
        // 关闭按钮
        const closeBtn = document.querySelector('.fiction-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeFiction);
        }
        
        // 底部导航切换
        const tabs = document.querySelectorAll('.fiction-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                switchFictionPage(this.dataset.page);
                // 切换后检查布局
                setTimeout(() => {
                    checkFictionLayout();
                }, 50);
            });
        });
        
        // 左侧分类切换
        const categoryItems = document.querySelectorAll('.fiction-cat-left-item');
        const categoryContents = document.querySelectorAll('.fiction-cat-content');
        
        categoryItems.forEach(item => {
            item.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                
                // 更新左侧选中状态
                categoryItems.forEach(cat => cat.classList.remove('active'));
                this.classList.add('active');
                
                // 更新右侧内容显示
                categoryContents.forEach(content => content.classList.remove('active'));
                categoryContents[index].classList.add('active');
                
                fictionState.currentCategory = index;
            });
        });
        
        // 搜索点击
        const searchBtn = document.querySelector('.fiction-search');
        if (searchBtn) {
            searchBtn.addEventListener('click', function() {
                showToast('搜索功能开发中');
            });
        }
    }
    
    /**
     * 打开同人文页面
     */
    function openFiction() {
        const fictionPage = document.getElementById('fiction-page');
        if (!fictionPage) {
            console.warn('⚠️ 同人文页面DOM未创建');
            return;
        }
        
        fictionPage.classList.add('active');
        fictionState.isOpen = true;
        
        // 移动端布局优化
        optimizeMobileLayout();
        
        // 检查布局问题
        setTimeout(() => {
            checkFictionLayout();
        }, 100);
        
        // 关闭聊天页面相关组件
        closeChatComponents();
        
        console.log('📚 同人文页面已打开');
    }
    
    /**
     * 检查同人文页面布局
     */
    function checkFictionLayout() {
        const container = document.querySelector('.fiction-container');
        const tabbar = document.querySelector('.fiction-tabbar');
        const content = document.querySelector('.fiction-content.active');
        
        if (container) {
            const containerHeight = container.offsetHeight;
            const containerBottom = container.getBoundingClientRect().bottom;
            const tabbarTop = tabbar ? tabbar.getBoundingClientRect().top : window.innerHeight;
            
            console.log('🔍 布局检查:');
            console.log(`容器高度: ${containerHeight}px`);
            console.log(`容器底部位置: ${containerBottom}px`);
            console.log(`底部导航顶部位置: ${tabbarTop}px`);
            console.log(`内容是否存在: ${!!content}`);
            
            // 检查是否有空白间隙
            const hasGap = containerBottom < tabbarTop - 5;
            if (hasGap) {
                console.log('⚠️ 发现底部空白间隙');
                // 修复容器高度
                if (window.innerWidth < 768) {
                    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
                    const isAndroid = /android/.test(navigator.userAgent.toLowerCase());
                    const safeAreaBottom = isIOS ? 20 : 16; // 估算的安全区域
                    
                    // 直接使用固定的底部高度，避免复杂的计算
                    const bottomHeight = tabbar ? tabbar.offsetHeight : 60;
                    container.style.bottom = `${bottomHeight}px`;
                    console.log(`🔧 已修复容器高度，设置底部为: ${container.style.bottom}`);
                }
            }
            
            // 检查内容是否被遮挡
            if (content && tabbar) {
                const contentRect = content.getBoundingClientRect();
                const tabbarRect = tabbar.getBoundingClientRect();
                
                if (contentRect.bottom > tabbarRect.top) {
                    console.log('⚠️ 内容被底部导航栏遮挡');
                    // 添加底部padding
                    content.style.paddingBottom = `${tabbar.offsetHeight}px`;
                }
            }
        }
    }
    
    /**
     * 关闭同人文页面
     */
    function closeFiction() {
        const fictionPage = document.getElementById('fiction-page');
        if (!fictionPage) return;
        
        fictionPage.classList.remove('active');
        fictionState.isOpen = false;
        
        // 恢复聊天页面状态
        restoreChatComponents();
        
        console.log('📚 同人文页面已关闭');
    }
    
    /**
     * 切换同人文页面
     */
    function switchFictionPage(pageName) {
        // 更新内容显示
        const contents = document.querySelectorAll('.fiction-content');
        contents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `fiction-${pageName}`) {
                content.classList.add('active');
            }
        });
        
        // 更新底部导航
        const tabs = document.querySelectorAll('.fiction-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.page === pageName) {
                tab.classList.add('active');
            }
        });
        
        fictionState.currentPage = pageName;
        
        // 移动端布局优化
        optimizeMobileLayout();
    }
    
    /**
     * 移动端布局优化
     */
    function optimizeMobileLayout() {
        if (window.innerWidth < 768) {
            const container = document.querySelector('.fiction-container');
            const tabbar = document.querySelector('.fiction-tabbar');
            const contents = document.querySelectorAll('.fiction-content.active');
            
            if (container && tabbar) {
                // 确保容器底部正确计算
                const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
                const safeAreaBottom = isIOS ? 20 : 16;
                
                container.style.bottom = `calc(${tabbar.offsetHeight + safeAreaBottom}px + env(safe-area-inset-bottom))`;
                
                // 确保内容不被遮挡
                contents.forEach(content => {
                    content.style.paddingBottom = `${tabbar.offsetHeight}px`;
                });
                
                console.log('🔧 移动端布局已优化');
            }
        }
    }
    
    /**
     * 关闭聊天相关组件
     */
    function closeChatComponents() {
        // 隐藏聊天输入框
        const chatInput = document.querySelector('.chat-input-container');
        if (chatInput) {
            chatInput.style.display = 'none';
        }
        
        // 隐藏表情面板
        const emojiPanel = document.querySelector('.emoji-panel');
        if (emojiPanel) {
            emojiPanel.style.display = 'none';
        }
        
        // 隐藏更多面板
        const morePanel = document.getElementById('toolbar-more-panel');
        if (morePanel) {
            morePanel.style.display = 'none';
        }
    }
    
    /**
     * 恢复聊天相关组件
     */
    function restoreChatComponents() {
        // 恢复聊天输入框
        const chatInput = document.querySelector('.chat-input-container');
        if (chatInput) {
            chatInput.style.display = 'flex';
        }
        
        // 恢复表情面板
        const emojiPanel = document.querySelector('.emoji-panel');
        if (emojiPanel) {
            emojiPanel.style.display = 'block';
        }
    }
    
    /**
     * 显示提示信息
     */
    function showLocalToast(message) {
        const oldToast = document.getElementById('fiction-module-toast');
        if (oldToast) oldToast.remove();

        const toast = document.createElement('div');
        toast.id = 'fiction-module-toast';
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
    
    // 暴露到全局
    window.FictionModule = {
        init: initFiction,
        open: openFiction,
        close: closeFiction,
        switchPage: switchFictionPage
    };
    
    // 页面加载完成后自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFiction);
    } else {
        initFiction();
    }
})();
