/**
 * 同人文功能模块 v2
 * 处理同人文页面的显示、分类切换、AI生成小说等功能
 */

(function() {
    'use strict';
    
    // 同人文页面状态
    let fictionState = {
        isOpen: false,
        currentPage: 'category',
        currentCategory: 0,
        categories: [
            '现代言情', '豪门总裁', '甜宠暖文', '先婚后爱', '追妻火葬场',
            '娱乐圈', '校园青春', '穿书', '重生', '女配逆袭',
            '古代言情', '宫斗宅斗', '种田经商', '女尊女强', '仙侠玄幻',
            '修真修仙', '奇幻魔法', '悬疑灵异', '科幻星际', '末世囤货'
        ],
        books: {}, // 存储生成的书籍信息 { categoryIndex: [{title, author, intro, cover, chapters}, ...] }
        bookshelf: [], // 书架：存储收藏的书籍 [{categoryIndex, bookId, title, author, cover}, ...]
        currentBook: null, // 当前打开的书籍详情
        currentCharInfo: null // 当前角色和用户信息
    };
    
    /**
     * 初始化同人文功能
     */
    function initFiction() {
        console.log('📚 初始化同人文功能');
        // 从localStorage加载历史生成的小说数据
        loadFictionDataFromStorage();
        // 从localStorage加载书架数据
        loadBookshelfFromStorage();
        createFictionDOM();
        bindFictionEvents();
        console.log('✅ 同人文功能已初始化');
    }
    
    /**
     * 从localStorage加载已生成的小说数据
     */
    function loadFictionDataFromStorage() {
        try {
            const storageKey = 'fiction_books_data';
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                fictionState.books = data;
                console.log('📚 已从本地加载', Object.keys(data).length, '个分类的小说数据');
            }
        } catch (e) {
            console.warn('⚠️ 加载本地数据失败:', e.message);
        }
    }
    
    /**
     * 保存小说数据到localStorage
     */
    function saveFictionDataToStorage() {
        try {
            const storageKey = 'fiction_books_data';
            localStorage.setItem(storageKey, JSON.stringify(fictionState.books));
            console.log('💾 已保存小说数据到本地');
        } catch (e) {
            console.error('❌ 保存本地数据失败:', e.message);
        }
    }
    
    /**
     * 清空所有本地小说数据
     */
    function clearFictionDataFromStorage() {
        try {
            const storageKey = 'fiction_books_data';
            localStorage.removeItem(storageKey);
            fictionState.books = {};
            console.log('🗑️ 已清空本地小说数据');
        } catch (e) {
            console.error('❌ 清空本地数据失败:', e.message);
        }
    }
    
    /**
     * 创建同人文页面DOM
     */
    function createFictionDOM() {
        if (document.getElementById('fiction-page')) {
            return;
        }
        
        const fictionHTML = `
            <div id="fiction-page" class="fiction-page">
                <!-- 顶部导航 -->
                <div class="fiction-header">
                    <div class="fiction-logo" id="fiction-logo-btn" style="cursor: pointer;">同人文</div>
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
                            <div class="fiction-cat-right" id="fictionCatRight">
                                ${fictionState.categories.map((cat, index) => 
                                    `<div class="fiction-cat-content ${index === 0 ? 'active' : ''}" data-index="${index}">
                                        <div class="fiction-tag-group">
                                            ${getCategoryTags(cat).map(tag => `<span class="fiction-tag">${tag}</span>`).join('')}
                                            <div class="fiction-generate-btn-container">
                                                <button class="fiction-generate-btn" data-category-index="${index}">生成</button>
                                            </div>
                                        </div>
                                        <div class="fiction-grid" id="fiction-grid-${index}">
                                            ${generateBookCards(index).join('')}
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
                                <div class="fiction-section-title">
                                    精选推荐
                                    <button class="fiction-generate-recommend-btn" style="margin-left: auto; padding: 4px 12px; font-size: 12px; background: #FF4A7E; color: white; border: none; border-radius: 4px; cursor: pointer;">生成推荐</button>
                                </div>
                                <div class="fiction-grid" id="fiction-recommend-grid">
                                    ${generateBookCards(-1).join('')}
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
                        <div class="fiction-mine-container">
                            <!-- 用户信息卡片 -->
                            <div class="fiction-user-card">
                                <div class="fiction-user-avatar" id="fiction-user-avatar">
                                    <span class="fiction-avatar-text">M</span>
                                </div>
                                <div class="fiction-user-info">
                                    <div class="fiction-user-name" id="fiction-user-name">用户昵称</div>
                                    <div class="fiction-user-level" id="fiction-user-level">Lv. 1 · 普通用户</div>
                                </div>
                                <button class="fiction-user-edit-btn" id="fiction-user-edit-btn">编辑</button>
                            </div>

                            <!-- 用户装扮编辑模态框 -->
                            <div class="fiction-edit-modal" id="fiction-edit-modal">
                                <div class="fiction-edit-modal-content">
                                    <div class="fiction-edit-modal-header">
                                        <div class="fiction-edit-modal-title">编辑个人资料</div>
                                        <button class="fiction-edit-modal-close" id="fiction-edit-modal-close">×</button>
                                    </div>
                                    <div class="fiction-edit-modal-body">
                                        <!-- 头像编辑 -->
                                        <div class="fiction-edit-item">
                                            <div class="fiction-edit-label">头像</div>
                                            <div class="fiction-edit-avatar-group">
                                                <div class="fiction-avatar-preview" id="fiction-avatar-preview">M</div>
                                                <input type="file" id="fiction-avatar-upload" class="fiction-avatar-upload" accept="image/*" style="display:none;">
                                                <button class="fiction-edit-upload-btn" id="fiction-edit-avatar-btn">上传头像</button>
                                            </div>
                                        </div>

                                        <!-- 昵称编辑 -->
                                        <div class="fiction-edit-item">
                                            <div class="fiction-edit-label">昵称</div>
                                            <input type="text" id="fiction-edit-nickname" class="fiction-edit-input" placeholder="输入昵称（2-20字符）" maxlength="20">
                                        </div>

                                        <!-- 个性签名 -->
                                        <div class="fiction-edit-item">
                                            <div class="fiction-edit-label">个性签名</div>
                                            <textarea id="fiction-edit-signature" class="fiction-edit-textarea" placeholder="输入个性签名（最多100字）" maxlength="100"></textarea>
                                        </div>

                                        <!-- 性别选择 -->
                                        <div class="fiction-edit-item">
                                            <div class="fiction-edit-label">性别</div>
                                            <div class="fiction-edit-radio-group">
                                                <label class="fiction-edit-radio">
                                                    <input type="radio" name="gender" value="0" checked> 保密
                                                </label>
                                                <label class="fiction-edit-radio">
                                                    <input type="radio" name="gender" value="1"> 男
                                                </label>
                                                <label class="fiction-edit-radio">
                                                    <input type="radio" name="gender" value="2"> 女
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="fiction-edit-modal-footer">
                                        <button class="fiction-edit-cancel-btn" id="fiction-edit-cancel-btn">取消</button>
                                        <button class="fiction-edit-save-btn" id="fiction-edit-save-btn">保存</button>
                                    </div>
                                </div>
                            </div>

                            <!-- 统计数据 -->
                            <div class="fiction-stats-grid">
                                <div class="fiction-stat-item">
                                    <div class="fiction-stat-number" id="fiction-stat-books">0</div>
                                    <div class="fiction-stat-label">已读</div>
                                </div>
                                <div class="fiction-stat-item">
                                    <div class="fiction-stat-number" id="fiction-stat-collection">0</div>
                                    <div class="fiction-stat-label">收藏</div>
                                </div>
                                <div class="fiction-stat-item">
                                    <div class="fiction-stat-number" id="fiction-stat-comments">0</div>
                                    <div class="fiction-stat-label">评论</div>
                                </div>
                                <div class="fiction-stat-item">
                                    <div class="fiction-stat-number" id="fiction-stat-days">0</div>
                                    <div class="fiction-stat-label">连签天数</div>
                                </div>
                            </div>

                            <!-- 菜单列表 -->
                            <div class="fiction-menu-section">
                                <div class="fiction-menu-title">我的内容</div>
                                <div class="fiction-menu-list">
                                    <div class="fiction-menu-item" id="fiction-menu-reading">
                                        <div class="fiction-menu-text">
                                            <div class="fiction-menu-main">正在阅读</div>
                                            <div class="fiction-menu-sub">查看阅读历史</div>
                                        </div>
                                        <div class="fiction-menu-arrow">›</div>
                                    </div>
                                    <div class="fiction-menu-item" id="fiction-menu-bookmarks">
                                        <div class="fiction-menu-text">
                                            <div class="fiction-menu-main">书签与笔记</div>
                                            <div class="fiction-menu-sub">保存的标记和批注</div>
                                        </div>
                                        <div class="fiction-menu-arrow">›</div>
                                    </div>
                                    <div class="fiction-menu-item" id="fiction-menu-comments">
                                        <div class="fiction-menu-text">
                                            <div class="fiction-menu-main">我的评论</div>
                                            <div class="fiction-menu-sub">查看发布的评论</div>
                                        </div>
                                        <div class="fiction-menu-arrow">›</div>
                                    </div>
                                </div>
                            </div>

                            <!-- 设置菜单 -->
                            <div class="fiction-menu-section">
                                <div class="fiction-menu-title">设置与帮助</div>
                                <div class="fiction-menu-list">
                                    <div class="fiction-menu-item" id="fiction-menu-settings">
                                        <div class="fiction-menu-text">
                                            <div class="fiction-menu-main">阅读设置</div>
                                            <div class="fiction-menu-sub">字体、背景、亮度等</div>
                                        </div>
                                        <div class="fiction-menu-arrow">›</div>
                                    </div>
                                    <div class="fiction-menu-item" id="fiction-menu-download">
                                        <div class="fiction-menu-text">
                                            <div class="fiction-menu-main">离线下载</div>
                                            <div class="fiction-menu-sub">管理已下载的小说</div>
                                        </div>
                                        <div class="fiction-menu-arrow">›</div>
                                    </div>
                                    <div class="fiction-menu-item" id="fiction-menu-about">
                                        <div class="fiction-menu-text">
                                            <div class="fiction-menu-main">关于我们</div>
                                            <div class="fiction-menu-sub">版本信息与反馈</div>
                                        </div>
                                        <div class="fiction-menu-arrow">›</div>
                                    </div>
                                </div>
                            </div>

                            <!-- 底部按钮 -->
                            <div class="fiction-mine-footer">
                                <button class="fiction-mine-btn fiction-mine-logout-btn">退出登录</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 书籍详情页 -->
                    <div id="fiction-detail" class="fiction-content">
                        <div id="fiction-detail-content"></div>
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
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = fictionHTML;
        const fictionPage = tempDiv.firstElementChild;
        document.body.appendChild(fictionPage);
        
        // 验证按钮是否存在
        const buttons = document.querySelectorAll('.fiction-generate-btn');
        console.log(`✅ 已创建同人文页面，找到 ${buttons.length} 个生成按钮`);
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
    function generateBookCards(categoryIndex) {
        const cards = [];
        
        // 从状态中读取该分类的书籍
        let books = [];
        if (fictionState.books[categoryIndex]) {
            books = fictionState.books[categoryIndex];
        }
        
        // 如果还没有生成书籍，显示占位符
        for (let i = 0; i < 9; i++) {
            const book = books[i];
            if (book) {
                cards.push(`
                    <div class="fiction-card" data-category-index="${categoryIndex}" data-book-id="${i}">
                        <div class="fiction-cover" style="background-image: url('${book.cover}'); background-size: cover; background-position: center;"></div>
                        <div class="fiction-title">${book.title}</div>
                    </div>
                `);
            } else {
                cards.push(`
                    <div class="fiction-card" data-category-index="${categoryIndex}" data-book-id="${i}">
                        <div class="fiction-cover"></div>
                        <div class="fiction-title">小说占位</div>
                    </div>
                `);
            }
        }
        return cards;
    }
    
    /**
     * 绑定事件
     */
    function bindFictionEvents() {
        // Logo 点击关闭同人文
        const logoBtn = document.getElementById('fiction-logo-btn');
        if (logoBtn) {
            logoBtn.addEventListener('click', closeFiction);
        }
        
        // 生成按钮事件 - 先绑定
        bindGenerateButtons();
        
        // 书库"生成推荐"按钮事件
        const fictionPage = document.getElementById('fiction-page');
        if (fictionPage) {
            fictionPage.addEventListener('click', function(e) {
                const recommendBtn = e.target.closest('.fiction-generate-recommend-btn');
                if (recommendBtn && !recommendBtn.disabled) {
                    recommendBtn.disabled = true;
                    recommendBtn.textContent = '生成中...';
                    generateRecommendedBooks()
                        .finally(() => {
                            recommendBtn.disabled = false;
                            recommendBtn.textContent = '生成推荐';
                        });
                }
            });
        }
        
        // 底部导航切换
        const tabs = document.querySelectorAll('.fiction-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const pageName = this.dataset.page;
                // 书架页面需要实时更新
                if (pageName === 'bookshelf') {
                    updateBookshelfDisplay();
                }
                switchFictionPage(pageName);
            });
        });
        
        // 左侧分类切换
        const categoryItems = document.querySelectorAll('.fiction-cat-left-item');
        const categoryContents = document.querySelectorAll('.fiction-cat-content');
        
        categoryItems.forEach(item => {
            item.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                
                categoryItems.forEach(cat => cat.classList.remove('active'));
                this.classList.add('active');
                
                categoryContents.forEach(content => content.classList.remove('active'));
                categoryContents[index].classList.add('active');
                
                fictionState.currentCategory = index;
            });
        });
        
        // 初始化"我的"页面
        initMinePage();
        
        // 书籍卡片点击打开详情
        setupBookCardListeners();
    }
    
    /**
     * 初始化"我的"页面
     */
    function initMinePage() {
        try {
            // 从localStorage加载用户数据
            loadUserData();
            
            // 更新UI显示
            updateMinePageUI();
            
            // 绑定菜单项点击事件
            bindMineMenuEvents();
            
            // 绑定编辑功能事件
            bindUserEditEvents();
            
            console.log('✅ 我的页面已初始化');
        } catch (error) {
            console.error('❌ 初始化我的页面失败:', error);
        }
    }
    
    /**
     * 用户数据管理 - localStorage
     */
    const userDataKey = 'fiction_user_data';
    
    function loadUserData() {
        try {
            const saved = localStorage.getItem(userDataKey);
            if (saved) {
                fictionState.userData = JSON.parse(saved);
                console.log('📦 已从本地加载用户数据');
            } else {
                fictionState.userData = {
                    nickname: window.AppState?.userInfo?.nickname || '用户昵称',
                    signature: '',
                    avatar: 'M',
                    gender: 0,
                    myComments: [],
                    settings: { fontSize: 16, backgroundColor: 'white', brightness: 100 }
                };
            }
        } catch (error) {
            console.warn('⚠️ 加载用户数据失败:', error);
            fictionState.userData = { nickname: '用户昵称', signature: '', avatar: 'M', gender: 0, myComments: [], settings: {} };
        }
    }
    
    function saveUserData() {
        try {
            localStorage.setItem(userDataKey, JSON.stringify(fictionState.userData));
            console.log('💾 用户数据已保存');
        } catch (error) {
            console.error('❌ 保存用户数据失败:', error);
        }
    }
    
    /**
     * 绑定用户编辑功能
     */
    function bindUserEditEvents() {
        const editBtn = document.getElementById('fiction-user-edit-btn');
        const editModal = document.getElementById('fiction-edit-modal');
        if (!editBtn || !editModal) return;
        
        editBtn.addEventListener('click', () => {
            const userData = fictionState.userData;
            document.getElementById('fiction-edit-nickname').value = userData.nickname || '';
            document.getElementById('fiction-edit-signature').value = userData.signature || '';
            const genderRadios = document.querySelectorAll('input[name="gender"]');
            genderRadios.forEach(radio => {
                radio.checked = parseInt(radio.value) === (userData.gender || 0);
            });
            editModal.classList.add('active');
        });
        
        const closeModal = () => editModal.classList.remove('active');
        document.getElementById('fiction-edit-modal-close')?.addEventListener('click', closeModal);
        document.getElementById('fiction-edit-cancel-btn')?.addEventListener('click', closeModal);
        editModal.addEventListener('click', (e) => { if (e.target === editModal) closeModal(); });
        
        document.getElementById('fiction-edit-avatar-btn')?.addEventListener('click', () => {
            document.getElementById('fiction-avatar-upload')?.click();
        });
        
        document.getElementById('fiction-avatar-upload')?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result;
                if (dataUrl) {
                    fictionState.userData.avatarData = dataUrl;
                    const preview = document.getElementById('fiction-avatar-preview');
                    preview.style.backgroundImage = `url(${dataUrl})`;
                    preview.style.backgroundSize = 'cover';
                    preview.textContent = '';
                    showToast('头像已上传');
                }
            };
            reader.readAsDataURL(file);
        });
        
        document.getElementById('fiction-edit-save-btn')?.addEventListener('click', () => {
            const nickname = document.getElementById('fiction-edit-nickname').value.trim();
            if (!nickname || nickname.length < 2) {
                showToast('昵称需要2-20个字符');
                return;
            }
            fictionState.userData.nickname = nickname;
            fictionState.userData.signature = document.getElementById('fiction-edit-signature').value.trim();
            fictionState.userData.gender = parseInt(document.querySelector('input[name="gender"]:checked')?.value || 0);
            fictionState.userData.avatar = nickname.charAt(0).toUpperCase();
            saveUserData();
            updateMinePageUI();
            closeModal();
            showToast('个人资料已保存');
        });
    }
    
    /**
     * 更新"我的"页面UI
     */
    function updateMinePageUI() {
        try {
            const userData = fictionState.userData || {};
            const userName = userData.nickname || '用户昵称';
            const userAvatar = userData.avatar || 'M';
            
            document.getElementById('fiction-user-name').textContent = userName;
            document.getElementById('fiction-user-avatar').querySelector('.fiction-avatar-text').textContent = userAvatar;
            
            const avatarPreview = document.getElementById('fiction-avatar-preview');
            if (avatarPreview && userData.avatarData) {
                avatarPreview.style.backgroundImage = `url(${userData.avatarData})`;
                avatarPreview.textContent = '';
            } else if (avatarPreview) {
                avatarPreview.textContent = userAvatar;
            }
            
            updateMinePageStats();
        } catch (error) {
            console.warn('⚠️ 更新UI失败:', error);
        }
    }
    
    /**
     * 更新"我的"页面的统计数据
     */
    function updateMinePageStats() {
        try {
            const userData = fictionState.userData || {};
            const booksCount = Object.values(fictionState.books)
                .reduce((sum, books) => sum + (Array.isArray(books) ? books.length : 0), 0);
            const collectionCount = fictionState.bookshelf.length;
            const commentsCount = userData.myComments ? userData.myComments.length : 0;
            
            const statBooks = document.getElementById('fiction-stat-books');
            const statCollection = document.getElementById('fiction-stat-collection');
            const statComments = document.getElementById('fiction-stat-comments');
            const statDays = document.getElementById('fiction-stat-days');
            
            if (statBooks) statBooks.textContent = booksCount;
            if (statCollection) statCollection.textContent = collectionCount;
            if (statComments) statComments.textContent = commentsCount;
            if (statDays) statDays.textContent = Math.floor(Math.random() * 365) + 1;
        } catch (error) {
            console.warn('⚠️ 更新统计数据失败:', error);
        }
    }
    
    /**
     * 绑定"我的"页面菜单事件
     */
    function bindMineMenuEvents() {
        document.getElementById('fiction-menu-reading')?.addEventListener('click', showReadingHistory);
        document.getElementById('fiction-menu-bookmarks')?.addEventListener('click', showBookmarks);
        document.getElementById('fiction-menu-comments')?.addEventListener('click', showMyComments);
        document.getElementById('fiction-menu-settings')?.addEventListener('click', showReadingSettings);
        document.getElementById('fiction-menu-download')?.addEventListener('click', showDownloadManager);
        document.getElementById('fiction-menu-about')?.addEventListener('click', showAboutUs);
        document.querySelector('.fiction-mine-logout-btn')?.addEventListener('click', () => {
            if (confirm('确定要退出登录吗？')) {
                closeFiction();
                showToast('已退出登录');
            }
        });
    }
    
    function showReadingHistory() {
        const content = '<div style="text-align:center;padding:20px;color:#999;">阅读历史功能开发中</div>';
        const modal = createModal('正在阅读', content);
        showModal(modal);
    }
    
    function showBookmarks() {
        const content = '<div style="text-align:center;padding:20px;color:#999;">书签功能开发中</div>';
        const modal = createModal('书签与笔记', content);
        showModal(modal);
    }
    
    function showMyComments() {
        const userData = fictionState.userData || {};
        const comments = userData.myComments || [];
        
        if (comments.length === 0) {
            const modal = createModal('我的评论', '<div style="text-align:center;padding:20px;color:#999;">暂无评论，去小说页面评论吧</div>');
            showModal(modal);
            return;
        }
        
        let content = '<div style="padding:16px;">';
        comments.forEach(comment => {
            content += `<div style="padding:12px;border-bottom:1px solid #f0f0f0;"><div style="font-size:12px;color:#999;margin-bottom:4px;">${comment.time}</div><div style="color:#333;">${comment.content}</div></div>`;
        });
        content += '</div>';
        
        const modal = createModal('我的评论', content, `共 ${comments.length} 条评论`);
        showModal(modal);
    }
    
    function showReadingSettings() {
        const settings = fictionState.userData?.settings || {};
        let content = `<div style="padding:16px;"><div style="margin-bottom:16px;"><div style="font-size:13px;color:#666;margin-bottom:8px;">字体大小: ${settings.fontSize || 16}px</div><input type="range" min="12" max="24" value="${settings.fontSize || 16}" id="fontSize" style="width:100%;"></div><div style="margin-bottom:16px;"><div style="font-size:13px;color:#666;margin-bottom:8px;">亮度: ${settings.brightness || 100}%</div><input type="range" min="50" max="150" value="${settings.brightness || 100}" id="brightness" style="width:100%;"></div><div><div style="font-size:13px;color:#666;margin-bottom:8px;">背景</div><select id="backgroundColor" style="width:100%;padding:8px;border:1px solid #e0e0e0;border-radius:6px;"><option value="white" ${settings.backgroundColor === 'white' ? 'selected' : ''}>白色</option><option value="cream" ${settings.backgroundColor === 'cream' ? 'selected' : ''}>米色</option><option value="dark" ${settings.backgroundColor === 'dark' ? 'selected' : ''}>深色</option></select></div></div>`;
        
        const modal = createModal('阅读设置', content);
        showModal(modal, () => {
            const fontSize = parseInt(document.getElementById('fontSize')?.value || 16);
            const brightness = parseInt(document.getElementById('brightness')?.value || 100);
            const backgroundColor = document.getElementById('backgroundColor')?.value || 'white';
            
            fictionState.userData.settings = { fontSize, brightness, backgroundColor };
            saveUserData();
            showToast('设置已保存');
        });
    }
    
    function showDownloadManager() {
        const bookshelf = fictionState.bookshelf || [];
        
        if (bookshelf.length === 0) {
            const modal = createModal('离线下载', '<div style="text-align:center;padding:20px;color:#999;">暂无下载，收藏小说后即可下载</div>');
            showModal(modal);
            return;
        }
        
        let content = '<div style="padding:16px;">';
        bookshelf.forEach(book => {
            content += `<div style="padding:12px;border:1px solid #f0f0f0;border-radius:6px;margin-bottom:12px;"><div style="font-weight:500;margin-bottom:4px;">${book.title}</div><div style="font-size:12px;color:#999;margin-bottom:8px;">${book.author}</div><button style="background:#FF4A7E;color:white;border:none;padding:6px 12px;border-radius:4px;font-size:12px;cursor:pointer;">已保存</button></div>`;
        });
        content += '</div>';
        
        const modal = createModal('离线下载', content, `共 ${bookshelf.length} 部小说`);
        showModal(modal);
    }
    
    function showAboutUs() {
        const content = `<div style="padding:20px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#FF4A7E;margin-bottom:8px;">同人文</div><div style="font-size:13px;color:#999;margin-bottom:20px;">一个创意无限的小说创意平台</div><div style="text-align:left;background:#f9f9f9;padding:12px;border-radius:6px;margin-bottom:16px;font-size:13px;line-height:1.6;"><p><strong>版本</strong>: 1.0.0</p><p><strong>更新时间</strong>: 2026年2月24日</p><p><strong>功能</strong>: AI同人文生成、书库推荐、评论系统</p></div><div style="font-size:12px;color:#999;"><p style="margin:8px 0;"><a href="#" style="color:#FF4A7E;text-decoration:none;">用户协议</a></p><p style="margin:8px 0;"><a href="#" style="color:#FF4A7E;text-decoration:none;">隐私政策</a></p><p style="margin:8px 0;"><a href="#" style="color:#FF4A7E;text-decoration:none;">联系我们</a></p></div></div>`;
        const modal = createModal('关于我们', content);
        showModal(modal);
    }
    
    function createModal(title, content, subtitle = '') {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:2001;display:flex;align-items:center;justify-content:center;';
        
        const box = document.createElement('div');
        box.style.cssText = 'background:white;border-radius:12px;width:90%;max-width:500px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.2);';
        
        const header = document.createElement('div');
        header.style.cssText = 'padding:16px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;';
        
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:16px;font-weight:600;color:#333;';
        titleEl.textContent = title;
        header.appendChild(titleEl);
        
        if (subtitle) {
            const subtitleEl = document.createElement('div');
            subtitleEl.style.cssText = 'font-size:12px;color:#999;';
            subtitleEl.textContent = subtitle;
            header.appendChild(subtitleEl);
        }
        
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background:none;border:none;font-size:24px;color:#999;cursor:pointer;padding:0;width:32px;height:32px;';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => modal.remove());
        header.appendChild(closeBtn);
        
        const body = document.createElement('div');
        body.style.cssText = 'flex:1;overflow-y:auto;';
        body.innerHTML = content;
        
        box.appendChild(header);
        box.appendChild(body);
        modal.appendChild(box);
        
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        
        return modal;
    }
    
    function showModal(modal, onSave = null) {
        document.body.appendChild(modal);
        
        if (onSave) {
            const saveBtn = document.createElement('button');
            saveBtn.style.cssText = 'width:100%;padding:12px;background:#FF4A7E;color:white;border:none;font-size:14px;cursor:pointer;border-radius:0 0 12px 12px;';
            saveBtn.textContent = '保存';
            saveBtn.addEventListener('click', () => {
                onSave();
                modal.remove();
            });
            modal.querySelector('div[style*="flex-direction"]')?.appendChild(saveBtn);
        }
    }
    
    /**
     * 为书籍卡片设置事件监听（使用事件委托）
     */
    function setupBookCardListeners() {
        const fictionPage = document.getElementById('fiction-page');
        if (!fictionPage) return;
        
        // 使用事件委托处理卡片点击
        fictionPage.addEventListener('click', function(e) {
            const card = e.target.closest('.fiction-card');
            if (!card) return;
            
            // 获取卡片的分类和书籍ID（注意属性名的一致性）
            const categoryIndex = parseInt(card.dataset.categoryIndex);
            const bookId = parseInt(card.dataset.bookId);
            
            console.log('🔍 卡片点击事件:', { categoryIndex, bookId, dataAttrs: card.dataset });
            
            // 检查是否有数据
            if (isNaN(categoryIndex) || isNaN(bookId)) {
                console.warn('⚠️ 卡片属性无效:', { categoryIndex, bookId });
                return;
            }
            
            if (fictionState.books[categoryIndex] && fictionState.books[categoryIndex][bookId]) {
                console.log('📖 点击卡片进入详情页:', { 
                    categoryIndex, 
                    bookId, 
                    title: fictionState.books[categoryIndex][bookId].title 
                });
                showBookDetail(categoryIndex, bookId);
            } else {
                console.warn('⚠️ 卡片无数据或为占位符', { 
                    booksExists: !!fictionState.books[categoryIndex],
                    bookExists: !!(fictionState.books[categoryIndex] && fictionState.books[categoryIndex][bookId])
                });
            }
        }, false);
    }
    
    /**
     * 为生成按钮绑定事件
     */
    function bindGenerateButtons() {
        // 移除旧的监听器，防止重复绑定
        const fictionPage = document.getElementById('fiction-page');
        if (!fictionPage) return;
        
        // 使用事件委托，在容器上绑定
        fictionPage.addEventListener('click', function(e) {
            const btn = e.target.closest('.fiction-generate-btn');
            if (btn && !btn.disabled) {
                const categoryIndex = parseInt(btn.dataset.categoryIndex);
                console.log('🔘 点击生成按钮，分类索引:', categoryIndex);
                generateBooksForCategory(categoryIndex);
                // 禁用按钮
                btn.disabled = true;
                btn.textContent = '生成中...';
            }
        }, true); // 使用捕获阶段确保能捕获到
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
        
        // 获取当前角色和用户信息
        loadCharacterInfo();
        
        fictionPage.classList.add('active');
        fictionState.isOpen = true;
        closeChatComponents();
        
        console.log('📚 同人文页面已打开');
    }
    
    /**
     * 关闭同人文页面
     */
    function closeFiction() {
        const fictionPage = document.getElementById('fiction-page');
        if (!fictionPage) return;
        
        fictionPage.classList.remove('active');
        fictionState.isOpen = false;
        restoreChatComponents();
        
        console.log('📚 同人文页面已关闭');
    }
    
    /**
     * 切换同人文页面
     */
    function switchFictionPage(pageName) {
        // 详情页是全屏固定的，需要特殊处理
        const detailPage = document.getElementById('fiction-detail');
        const categoryPage = document.getElementById('fiction-category');
        const fictionHeader = document.querySelector('.fiction-header');
        
        if (pageName === 'detail') {
            // 显示详情页（全屏固定）
            if (detailPage) detailPage.classList.add('active');
            if (categoryPage) categoryPage.classList.remove('active');
            // 隐藏主header，用详情页的header替代
            if (fictionHeader) fictionHeader.style.display = 'none';
        } else if (pageName === 'category') {
            // 返回分类页
            if (detailPage) detailPage.classList.remove('active');
            if (categoryPage) categoryPage.classList.add('active');
            // 显示主header
            if (fictionHeader) fictionHeader.style.display = 'flex';
        } else {
            // 其他页面使用原来的切换逻辑
            const contents = document.querySelectorAll('.fiction-content');
            contents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `fiction-${pageName}`) {
                    content.classList.add('active');
                }
            });
            // 其他页面显示主header
            if (fictionHeader) fictionHeader.style.display = 'flex';
        }
        
        const tabs = document.querySelectorAll('.fiction-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.page === pageName) {
                tab.classList.add('active');
            }
        });
        
        fictionState.currentPage = pageName;
    }
    
    /**
     * 加载角色和用户信息
     */
    function loadCharacterInfo() {
        try {
            // 获取当前活跃的对话
            const conversations = window.AppState?.conversations || [];
            const currentChat = conversations[0]; // 获取第一个（当前）对话
            
            if (!currentChat) {
                console.warn('未找到当前对话');
                fictionState.currentCharInfo = {
                    charName: '女主',
                    charDescription: '',
                    userName: '你',
                    userDescription: ''
                };
                return;
            }
            
            // 获取角色名称和描述
            const charName = currentChat.name || '女主';
            const charDescription = currentChat.description || currentChat.notes || '';
            
            // 获取用户名称和描述
            let userName = '你';
            let userDescription = '';
            
            // 尝试获取用户人设
            if (window.UserPersonaManager) {
                try {
                    const persona = window.UserPersonaManager.getPersonaForConversation(currentChat.id);
                    if (persona) {
                        userName = persona.userName || userName;
                        userDescription = persona.personality || '';
                    }
                } catch (e) {
                    console.error('获取用户人设失败:', e);
                }
            }
            
            // 若没有获取到用户描述，从AppState获取
            if (!userDescription && window.AppState?.user) {
                userDescription = window.AppState.user.personality || '';
                if (!userName || userName === '你') {
                    userName = window.AppState.user.name || '你';
                }
            }
            
            fictionState.currentCharInfo = {
                charName,
                charDescription,
                userName,
                userDescription
            };
            
            console.log('✅ 已加载角色信息:', fictionState.currentCharInfo);
        } catch (e) {
            console.error('加载角色信息失败:', e);
            fictionState.currentCharInfo = {
                charName: '女主',
                charDescription: '',
                userName: '你',
                userDescription: ''
            };
        }
    }
    
    /**
     * 生成书库推荐的9本小说 - 参考全网最火小说
     */
    async function generateRecommendedBooks() {
        console.log('🌐 开始搜索全网最火小说并生成推荐...');
        showToast('正在搜索最新热门小说...');
        
        try {
            if (!fictionState.currentCharInfo) {
                loadCharacterInfo();
            }
            
            const { charName, charDescription, userName, userDescription } = fictionState.currentCharInfo;
            
            // 第一步：搜索最火的小说作为参考题材
            const trendPrompt = `请列举当前全网最火、最受欢迎的网络小说的题材和特点。包括但不限于：
1. 豆瓣高评、长期占据各大平台热搜的小说题材
2. 各文学网站日热推荐排行榜的热门题材
3. 最近一个月内刷屏的小说题材
4. 口碑爆款小说的共同特征

请简要列举5-8个最火的题材/特点，格式为：题材名称 - 特点描述`;

            const trends = await callAIAPI(trendPrompt);
            console.log('📊 获取到热门题材参考:', trends);
            
            // 第二步：根据热门题材生成9本小说（不限制题材，多元化混合）
            const generatePrompt = `你是一位畅销小说作家，已经出版过50本畅销小说，深受读者喜爱。

【参考全网最火题材】
${trends}

【角色设定（仅供背景参考，禁止直接照搬设定原文）】
男主角色名：${charName}
男主背景参考：${charDescription || '暂无详细设定'}
女主角色名：${userName}
女主背景参考：${userDescription || '暂无详细设定'}

【重要规则】
- 男主名字必须是"${charName}"，女主名字必须是"${userName}"，全文必须使用这两个名字
- 角色设定仅作为人物背景灵感参考，禁止在小说正文或简介中直接复制粘贴设定原文
- 要有同人文的感觉：基于角色进行二次创作，赋予角色新的故事和命运，发挥创意和脑洞
- 剧情节奏要像真实网络小说一样，不要太快，注重铺垫和细节描写

【任务】
根据全网最火的热门小说题材和特点，不限制题材类型，为书库生成9部网络小说。可以是言情、悬疑、科幻、奇幻、穿越等任何题材的混合。

每部包含：
- title：小说名称（8-25个汉字）
- author：作者名（2-20个汉字）
- intro：简介（200-500个汉字，必须是爆款级别的吸睛简介）

【要求】
- 必须生成恰好9部小说
- 男主必须叫${charName}，女主必须叫${userName}，不可使用其他名字
- 题材多元化（不全是同一类型），模仿当前全网最火的小说特点
- 全部原创内容，体现同人文二次创作的创意和脑洞
- 简介要高度吸引人，体现爆款小说的特征：
  1. 开头要有冲击力，能激发好奇心
  2. 核心冲突清晰，让人想继续读下去
  3. 有反转、虐点、爽点等情感钩子
  4. 不要平铺直叙，要有节奏感和悬念
  5. 参考当前最受欢迎的简介风格

【重要】只返回JSON数组，不要任何其他内容！

【输出示例】
[
{"title":"小说名1","author":"作者1","intro":"简介..."},
{"title":"小说名2","author":"作者2","intro":"简介..."},
...共9本
]

现在开始生成：`;

            console.log('🚀 正在根据热门题材生成9本小说...');
            showToast('正在生成9本热门风格的小说...');
            
            const booksData = await callAIAPI(generatePrompt);
            
            console.log('📦 收到booksData:', {
                type: typeof booksData,
                isArray: Array.isArray(booksData),
                length: Array.isArray(booksData) ? booksData.length : 'N/A'
            });
            
            if (!Array.isArray(booksData) || booksData.length === 0) {
                throw new Error('生成小说列表失败');
            }
            
            // 验证数据结构
            const validBooks = booksData.filter(book => 
                book && book.title && book.author && book.intro
            );
            
            if (validBooks.length === 0) {
                throw new Error('生成的书籍数据无效');
            }
            
            console.log(`✅ 成功生成${validBooks.length}部小说`);
            
            // 为每个书籍生成封面
            const booksWithCovers = validBooks.map((book, index) => {
                const stylePrompt = `高清渲染,高级CG渲染,设计感,人物BJD质感,伪厚涂写实风格,8K超清画质,油画质感,极致的细节,色彩低饱和度`;
                const imagePrompt = encodeURIComponent(`网络小说封面：《${book.title}》 ${book.intro.substring(0, 100)} 风格:${stylePrompt}`);
                const seed = Math.floor(Math.random() * 1000000);
                const imageUrl = `https://gen.pollinations.ai/image/${imagePrompt}?model=zimage&width=600&height=800&nologo=true&enhance=true&seed=${seed}&key=sk_InRGAIaBbde6kBPCSzO4FsOHTvYKQocd`;
                
                return {
                    ...book,
                    cover: imageUrl,
                    chapters: []
                };
            });
            
            // 保存到特殊的推荐分类（使用-1作为key）
            fictionState.books[-1] = booksWithCovers;
            saveFictionDataToStorage();
            
            // 更新页面显示
            const recommendGrid = document.getElementById('fiction-recommend-grid');
            if (recommendGrid) {
                recommendGrid.innerHTML = generateBookCards(-1).join('');
                setupBookCardListeners(); // 重新绑定卡片事件
            }
            
            console.log('✅ 已生成9部推荐小说');
            showToast('已成功生成9部热门推荐小说！');
            
        } catch (error) {
            console.error('❌ 生成推荐小说失败:', error);
            showToast('生成推荐小说失败，请检查API配置');
        }
    }
    
    /**
     * 为分类生成书籍
     */
    async function generateBooksForCategory(categoryIndex) {
        const category = fictionState.categories[categoryIndex];
        
        console.log(`🚀 开始为分类"${category}"生成书籍...`);
        showToast(`正在生成《${category}》分类的小说...`);
        
        try {
            if (!fictionState.currentCharInfo) {
                loadCharacterInfo();
            }
            
            const { charName, charDescription, userName, userDescription } = fictionState.currentCharInfo;
            
            // 构建提示词
            const prompt = `你是一位畅销小说作家，已经出版过30本畅销小说，内容涵盖职场、校园、仙侠、穿越等多类题材，深受读者喜爱。Skills:
1. 创意写作技巧
(1) 情节构建：能够设计引人入胜的情节，保持读者的兴趣。
(2) 人物塑造：创造复杂、有深度的人物，尤其是男女主角的性格和成长过程。
(3) 对话技巧：写出自然、真实的对话，增强人物的真实性和情感的表达。
2. 情感表达能力
(1) 细腻情感描写：能够通过文字细腻地描写人物的情感变化，打动读者的心。
(2) 共情能力：具备强烈的共情能力，理解并表达出读者可能经历的情感和体验。
3. 市场洞察力
(1) 目标读者分析：了解和分析目标读者的喜好和需求，写出符合市场趋势的内容。
(2) 潮流把握：紧跟言情小说的流行趋势，适时调整写作风格和主题。根据以下信息，为"${category}"分类生成9部网络小说。

【角色设定（仅供背景参考，禁止直接照搬设定原文）】
男主角色名：${charName}
男主设定参考：${charDescription || '暂无详细设定'}
女主角色名：${userName}
女主设定参考：${userDescription || '暂无详细设定'}

【重要规则】
- 男主名字必须是"${charName}"，女主名字必须是"${userName}"
- 角色设定仅作为人物背景灵感参考，禁止在小说正文或简介中直接使用一模一样的设定原文
- 要有同人文的感觉：基于角色进行二次创作，赋予角色新的故事和命运，发挥创意和脑洞
- 剧情节奏要像真实网络小说一样，不要太快，注重铺垫和细节描写

【分类】${category}（标签：${getCategoryTags(category).join('、')}）

【任务】
必须生成恰好9部小说，每部包含：
- title：小说名称（8-25个汉字）
- author：作者名（2-20个汉字）
- intro：简介（200-500个汉字）

【要求】
- 男主必须叫${charName}，女主必须叫${userName}，不可使用其他名字
- 风格符合${category}的特点，同时体现同人文二次创作的创意和脑洞
- 全部原创内容，不使用预设文字
- 简介要吸引人，体现故事核心冲突，确保小说有一个完整的三幕式结构，故事要刺激、反复拉扯、最后有决定。简介不是把开头掐头去尾一放，那是自嗨，读者会直接划走。
简介本质是：给你的故事打广告。
 
两种写法对比
 
1. 广告式简介（正确）
把全文最炸裂、最反转、最上头的精华提炼出来，像预告片一样，让人一眼就想点正文。
2. 开头搬运式（错误）
直接复制正文前几句，节奏慢、信息少，读者没耐心看。
 
 
 
核心口诀
 
别放「开头片段」，要卖「全文精华」。
 
 
 
三要素公式（万能）
 
1. 勾住人：第一句就让人“卧槽？”
2. 说清事：谁、遇到啥事、想干嘛（不剧透结局）
3. 留钩子：结尾留悬念，让人心痒痒
 
 
 
错误 vs 正确示例
 
❌ 错误（只放开头）
她重生回了高中时代，看着熟悉的教室，决定这辈子要好好努力。
（读者：哦，然后呢？）
 
✅ 正确（抓核心爽点）
她重生回高中，做的第一件事，就是给未来会成为首富的同桌买了瓶汽水。
同桌红了脸，她却暗笑：好好读书？我这把直接攻略首富！
（读者：这操作我要看！）
 
 
 
爆款参考模板
 
虐恋言情：
 
结婚三年，老公为初恋逼我离婚。我爽快签字，转头就嫁给了他权势滔天的小叔叔。
新婚夜，前夫红着眼砸门：“叫我小婶婶？你休想！”
 
逆袭爽文：
 
我是个废物赘婿，全家都瞧不起我。
直到那天，全球首富带着万亿资产跪在我面前：
“少爷，考验结束，该回家继承家业了。”
 
悬疑灵异：
 
我低价买了套凶宅，中介说死过一家人。
住进去第一晚，耳边就有人轻声说：
“你旁边那张床，是我的。”
 
 
 
一句话总结
 
不啰嗦背景，只甩劲爆冲突；
不说人话不行，不吊胃口不行。
 

【重要】只返回JSON数组，不要任何其他内容！

【输出示例】
[
{"title":"小说1","author":"作者1","intro":"简介文本..."},
{"title":"小说2","author":"作者2","intro":"简介文本..."},
{"title":"小说3","author":"作者3","intro":"简介文本..."},
{"title":"小说4","author":"作者4","intro":"简介文本..."},
{"title":"小说5","author":"作者5","intro":"简介文本..."},
{"title":"小说6","author":"作者6","intro":"简介文本..."},
{"title":"小说7","author":"作者7","intro":"简介文本..."},
{"title":"小说8","author":"作者8","intro":"简介文本..."},
{"title":"小说9","author":"作者9","intro":"简介文本..."}
]

现在开始生成：`;

            // 调用API生成书籍列表
            const booksData = await callAIAPI(prompt);
            
            console.log('📦 收到booksData:', {
                type: typeof booksData,
                isArray: Array.isArray(booksData),
                length: Array.isArray(booksData) ? booksData.length : 'N/A',
                preview: Array.isArray(booksData) ? booksData.slice(0, 1) : booksData
            });
            
            // callAIAPI 已保证返回数组（最差情况返回空数组）
            if (!Array.isArray(booksData)) {
                throw new Error('AI返回数据不是数组: ' + typeof booksData);
            }
            
            if (booksData.length === 0) {
                console.warn('⚠️ AI返回空数组，可能API调用失败或响应无法解析');
                throw new Error('AI生成书籍列表失败或为空');
            }
            
            // 验证数据结构
            const validBooks = booksData.filter(book => 
                book && book.title && book.author && book.intro
            );
            
            if (validBooks.length === 0) {
                throw new Error('AI返回的数据中没有有效的书籍信息');
            }
            
            console.log(`✅ 成功获取${validBooks.length}部有效小说`);
            
            // 为每个书籍生成封面
            const booksWithCovers = validBooks.map((book, index) => {
                // 构建详细的生图提示词：包含小说名、简介、以及高级渲染和风格要求
                const stylePrompt = `高清渲染,高级CG渲染,设计感,人物BJD质感,伪厚涂写实风格,8K超清画质,油画质感,极致的细节,色彩低饱和度`;
                const imagePrompt = encodeURIComponent(`网络小说封面：《${book.title}》 ${book.intro} 风格:${stylePrompt}`);
                // 生图尺寸 600x800 超高清（保持75:100纵横比）确保显示时清晰锐利
                // 添加随机种子避免缓存，确保每次都获取高质量图片
                const seed = Math.floor(Math.random() * 1000000);
                const imageUrl = `https://gen.pollinations.ai/image/${imagePrompt}?model=zimage&width=600&height=800&nologo=true&enhance=true&seed=${seed}&key=sk_InRGAIaBbde6kBPCSzO4FsOHTvYKQocd`;
                
                return {
                    ...book,
                    cover: imageUrl,
                    chapters: [] // 初始化章节数组
                };
            });
            
            // 保存到状态
            fictionState.books[categoryIndex] = booksWithCovers;
            
            // 持久化保存到localStorage
            saveFictionDataToStorage();
            
            // 更新页面显示
            updateCategoryDisplay(categoryIndex);
            
            // 恢复按钮状态
            const btn = document.querySelector(`.fiction-generate-btn[data-category-index="${categoryIndex}"]`);
            if (btn) {
                btn.disabled = false;
                btn.textContent = '重新生成';
            }
            
            console.log(`✅ 已为分类"${category}"生成9部小说`);
            showToast(`已成功生成《${category}》分类的小说`);
        } catch (error) {
            console.error('生成书籍失败:', error);
            showToast('生成小说失败，请重试');
        }
    }
    
    /**
     * 更新分类页面显示
     */
    function updateCategoryDisplay(categoryIndex) {
        const gridId = `fiction-grid-${categoryIndex}`;
        const grid = document.getElementById(gridId);
        
        if (!grid) return;
        
        const books = fictionState.books[categoryIndex] || [];
        
        // 清空现有内容
        grid.innerHTML = '';
        
        // 创建卡片 - 使用与占位卡片完全相同的HTML结构
        books.forEach((book, index) => {
            const card = document.createElement('div');
            card.className = 'fiction-card';
            card.dataset.categoryIndex = categoryIndex;  // 用于事件委托
            card.dataset.bookId = index;  // 用于事件委托
            
            // 创建cover div（使用background-image，与占位卡片完全相同）
            const coverDiv = document.createElement('div');
            coverDiv.className = 'fiction-cover';
            coverDiv.style.backgroundImage = `url('${book.cover}')`;
            coverDiv.style.backgroundSize = 'cover';
            coverDiv.style.backgroundPosition = 'center';
            
            // 创建title div
            const titleDiv = document.createElement('div');
            titleDiv.className = 'fiction-title';
            titleDiv.textContent = book.title;
            
            card.appendChild(coverDiv);
            card.appendChild(titleDiv);
            
            // 不再在这里绑定事件，由setupBookCardListeners使用事件委托统一处理
            grid.appendChild(card);
        });
        
        console.log(`✅ 已更新分类${categoryIndex}的显示，共${books.length}部小说`);
    }
    
    /**
     * 显示书籍详情页
     */
    function showBookDetail(categoryIndex, bookId) {
        // 记录来源页面（如果当前不在详情页，则记录当前页面作为返回目标）
        if (fictionState.currentPage !== 'detail') {
            fictionState.previousPage = fictionState.currentPage || 'category';
        }
        
        // 尝试从 fictionState.books 获取数据
        let book = fictionState.books[categoryIndex] && fictionState.books[categoryIndex][bookId];
        
        // 如果没有找到，尝试从书架数据获取
        if (!book && fictionState.bookshelf) {
            const shelfBook = fictionState.bookshelf.find(b => 
                b.categoryIndex === categoryIndex && b.bookId === bookId
            );
            if (shelfBook) {
                // 从书架数据重建完整的书籍对象
                book = shelfBook;
                console.log('📖 从书架加载数据:', book.title);
            }
        }
        
        if (!book) {
            console.warn('❌ 书籍不存在:', categoryIndex, bookId);
            return;
        }
        
        console.log('📖 打开书籍详情:', book.title);
        
        fictionState.currentBook = { categoryIndex, bookId, ...book };
        
        // 获取详情页容器（#fiction-detail）
        const detailPage = document.getElementById('fiction-detail');
        
        if (!detailPage) {
            console.error('❌ 详情页容器不存在');
            return;
        }
        
        // 清空详情页本身的所有子元素（移除旧的内容）
        detailPage.innerHTML = '';
        
        // 创建返回按钮和标题（header）
        const headerDiv = document.createElement('div');
        headerDiv.className = 'fiction-detail-header';
        

        const backBtn = document.createElement('button');
        backBtn.className = 'fiction-back-btn';
        backBtn.id = 'fiction-back-btn';
        backBtn.textContent = '<';
        backBtn.addEventListener('click', function() {
            // 返回到之前的页面
            const returnPage = fictionState.previousPage || 'category';
            switchFictionPage(returnPage);
        });
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'fiction-detail-title';
        titleDiv.textContent = book.title;
        
        headerDiv.appendChild(backBtn);
        headerDiv.appendChild(titleDiv);
        
        // 创建 body 内容
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'fiction-detail-body';
        
        const coverSection = document.createElement('div');
        coverSection.className = 'fiction-detail-cover-section';
        const coverImg = document.createElement('img');
        coverImg.src = book.cover;
        coverImg.alt = book.title;
        coverImg.style.cssText = 'width: 100%; aspect-ratio: 75/100; object-fit: cover; border-radius: 12px;';
        coverSection.appendChild(coverImg);
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'fiction-detail-info';
        infoDiv.innerHTML = `
            <div class="fiction-info-row">
                <span class="fiction-label">书名：</span>
                <span class="fiction-value">${book.title}</span>
            </div>
            <div class="fiction-info-row">
                <span class="fiction-label">作者：</span>
                <span class="fiction-value">${book.author}</span>
            </div>
            <div class="fiction-info-row fiction-intro-row">
                <span class="fiction-label">简介：</span>
                <span class="fiction-intro">${book.intro}</span>
            </div>
        `;
        
        const chaptersContainer = document.createElement('div');
        chaptersContainer.id = 'fiction-chapters-container';
        
        if (book.chapters && book.chapters.length > 0) {
            const chaptersList = document.createElement('div');
            chaptersList.className = 'fiction-chapters-list';
            
            const chapterTitle = document.createElement('div');
            chapterTitle.className = 'fiction-section-title';
            chapterTitle.textContent = '已生成章节';
            chaptersList.appendChild(chapterTitle);
            
            book.chapters.forEach((ch, idx) => {
                const chapterDiv = document.createElement('div');
                chapterDiv.className = 'fiction-chapter';
                // 清理章节标题：移除可能存在的"第X章"前缀
                let cleanTitle = ch.title || '';
                cleanTitle = cleanTitle.replace(/^第[0-9零一二三四五六七八九十百千万]+章\s*/, '').trim();
                cleanTitle = cleanTitle.replace(/^第[0-9]+章\s*/, '').trim();
                cleanTitle = cleanTitle.replace(/^[\s\u3000]*/, '').trim();
                
                chapterDiv.innerHTML = `
                    <div class="fiction-chapter-title">第${idx + 1}章 ${cleanTitle}</div>
                    <div class="fiction-chapter-preview">${ch.content.substring(0, 100)}...</div>
                `;
                chapterDiv.addEventListener('click', function() {
                    showChapterDetail(categoryIndex, bookId, idx);
                });
                chaptersList.appendChild(chapterDiv);
            });
            
            chaptersContainer.appendChild(chaptersList);
        } else {
            const noChapters = document.createElement('div');
            noChapters.className = 'fiction-no-chapters';
            noChapters.textContent = '暂无章节';
            chaptersContainer.appendChild(noChapters);
        }
        
        const writeBtn = document.createElement('button');
        writeBtn.id = 'fiction-write-btn';
        writeBtn.className = 'fiction-write-btn';
        writeBtn.textContent = '催更';
        writeBtn.style.flex = '1';
        writeBtn.addEventListener('click', function() {
            continueWriteBook(categoryIndex, bookId);
        });
        
        // 评论按钮
        const commentBtn = document.createElement('button');
        commentBtn.className = 'fiction-action-btn';
        commentBtn.textContent = '评论';
        commentBtn.style.flex = '1';
        commentBtn.addEventListener('click', function() {
            // 调用评论区管理器
            if (!window.fictionCommentsManager) {
                showToast('评论功能加载中...');
                let retryCount = 0;
                const checkComments = setInterval(() => {
                    retryCount++;
                    if (window.fictionCommentsManager) {
                        clearInterval(checkComments);
                        window.fictionCommentsManager.init(book);
                    } else if (retryCount > 20) {
                        clearInterval(checkComments);
                        showToast('评论功能加载失败');
                    }
                }, 100);
            } else {
                window.fictionCommentsManager.init(book);
            }
        });
        
        // 开始阅读按钮
        const readBtn = document.createElement('button');
        readBtn.className = 'fiction-action-btn fiction-action-btn-primary';
        readBtn.textContent = '开始阅读';
        readBtn.style.flex = '1';
        readBtn.addEventListener('click', function() {
            if (book.chapters && book.chapters.length > 0) {
                showChapterDetail(categoryIndex, bookId, 0);
            } else {
                showToast('暂无章节');
            }
        });
        
        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 20px; margin-bottom: 80px;';
        
        // 收藏按钮
        const collectBtn = document.createElement('button');
        collectBtn.id = 'fiction-collect-btn';
        collectBtn.className = 'fiction-collect-btn';
        collectBtn.style.flex = '1';
        
        // 检查是否已收藏
        const isCollected = fictionState.bookshelf && fictionState.bookshelf.some(b => 
            b.categoryIndex === categoryIndex && b.bookId === bookId
        );
        collectBtn.textContent = isCollected ? '已收藏' : '收藏';
        collectBtn.dataset.collected = isCollected ? 'true' : 'false';
        
        collectBtn.addEventListener('click', function() {
            toggleCollectBook(categoryIndex, bookId, collectBtn);
        });
        
        buttonContainer.appendChild(collectBtn);
        buttonContainer.appendChild(writeBtn);
        buttonContainer.appendChild(commentBtn);
        buttonContainer.appendChild(readBtn);
        
        bodyDiv.appendChild(coverSection);
        bodyDiv.appendChild(infoDiv);
        bodyDiv.appendChild(chaptersContainer);
        bodyDiv.appendChild(buttonContainer);
        
        // 将 header 和 body 添加到 #fiction-detail
        detailPage.appendChild(headerDiv);
        detailPage.appendChild(bodyDiv);
        
        // 切换到详情页
        switchFictionPage('detail');
    }
    
    /**
     * 切换收藏状态
     */
    function toggleCollectBook(categoryIndex, bookId, btn) {
        const book = fictionState.books[categoryIndex][bookId];
        if (!book) return;
        
        const isCollected = btn.dataset.collected === 'true';
        
        if (isCollected) {
            // 取消收藏
            fictionState.bookshelf = fictionState.bookshelf.filter(b => 
                !(b.categoryIndex === categoryIndex && b.bookId === bookId)
            );
            btn.textContent = '收藏';
            btn.dataset.collected = 'false';
            showToast('已移除收藏');
        } else {
            // 添加收藏
            fictionState.bookshelf.push({
                categoryIndex,
                bookId,
                title: book.title,
                author: book.author,
                cover: book.cover,
                intro: book.intro,
                collectTime: new Date().getTime()
            });
            btn.textContent = '已收藏';
            btn.dataset.collected = 'true';
            showToast('已加入书架');
        }
        
        // 保存书架数据到 localStorage
        saveBookshelfToStorage();
    }
    
    /**
     * 保存书架到 localStorage
     */
    function saveBookshelfToStorage() {
        try {
            const storageKey = 'fiction_bookshelf_data';
            localStorage.setItem(storageKey, JSON.stringify(fictionState.bookshelf));
            console.log('💾 已保存书架数据到本地');
        } catch (e) {
            console.error('❌ 保存书架数据失败:', e.message);
        }
    }
    
    /**
     * 从 localStorage 加载书架
     */
    function loadBookshelfFromStorage() {
        try {
            const storageKey = 'fiction_bookshelf_data';
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                fictionState.bookshelf = JSON.parse(saved);
                console.log('📚 已加载书架，共', fictionState.bookshelf.length, '本');
            }
        } catch (e) {
            console.warn('⚠️ 加载书架失败:', e.message);
        }
    }
    
    /**
     * 更新书架页面显示
     */
    function updateBookshelfDisplay() {
        const bookshelfPage = document.getElementById('fiction-bookshelf');
        if (!bookshelfPage) return;
        
        // 更新"我的"页面的统计数据
        updateMinePageStats();
        
        // 清空内容
        bookshelfPage.innerHTML = '';
        
        if (!fictionState.bookshelf || fictionState.bookshelf.length === 0) {
            bookshelfPage.innerHTML = `
                <div class="fiction-empty">
                    <div>暂无收藏</div>
                    <div style="font-size:12px">去分类收藏喜欢的小说吧</div>
                </div>
            `;
            return;
        }
        
        // 创建书架容器
        const shelfContainer = document.createElement('div');
        shelfContainer.className = 'fiction-bookshelf-container';
        
        const shelfTitle = document.createElement('div');
        shelfTitle.className = 'fiction-bookshelf-title';
        shelfTitle.textContent = `我的书架 (${fictionState.bookshelf.length})`;
        shelfContainer.appendChild(shelfTitle);
        
        // 创建书架网格
        const shelfGrid = document.createElement('div');
        shelfGrid.className = 'fiction-bookshelf-grid';
        
        fictionState.bookshelf.forEach((book, idx) => {
            const card = document.createElement('div');
            card.className = 'fiction-bookshelf-card';
            
            const cover = document.createElement('div');
            cover.className = 'fiction-bookshelf-cover';
            cover.style.backgroundImage = `url('${book.cover}')`;
            
            const title = document.createElement('div');
            title.className = 'fiction-bookshelf-card-title';
            title.textContent = book.title;
            
            card.appendChild(cover);
            card.appendChild(title);
            
            // 点击进入详情页
            card.addEventListener('click', function() {
                showBookDetail(book.categoryIndex, book.bookId);
            });
            
            // 长按删除（选项菜单）
            card.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                showBookshelfOptions(book, idx);
            });
            
            shelfGrid.appendChild(card);
        });
        
        shelfContainer.appendChild(shelfGrid);
        bookshelfPage.appendChild(shelfContainer);
    }
    
    /**
     * 显示书架书籍的选项菜单
     */
    function showBookshelfOptions(book, idx) {
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            padding: 16px;
            z-index: 2000;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            min-width: 200px;
        `;
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '从书架移除';
        removeBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            background: #fff;
            border: 1px solid #eee;
            border-radius: 8px;
            color: #FF4A7E;
            font-weight: 600;
            cursor: pointer;
        `;
        removeBtn.addEventListener('click', function() {
            fictionState.bookshelf.splice(idx, 1);
            saveBookshelfToStorage();
            updateBookshelfDisplay();
            menu.remove();
            showToast('已移除收藏');
        });
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            background: #fff;
            border: 1px solid #eee;
            border-radius: 8px;
            color: #666;
            font-weight: 600;
            cursor: pointer;
            margin-top: 8px;
        `;
        cancelBtn.addEventListener('click', function() {
            menu.remove();
        });
        
        menu.appendChild(removeBtn);
        menu.appendChild(cancelBtn);
        document.body.appendChild(menu);
        
        // 点击背景关闭
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1999;
        `;
        backdrop.addEventListener('click', function() {
            menu.remove();
            backdrop.remove();
        });
        document.body.appendChild(backdrop);
    }
    
    /**
     * 显示章节详情（全文）
     */
    function showChapterDetail(categoryIndex, bookId, chapterIdx) {
        const book = fictionState.books[categoryIndex][bookId];
        if (!book || !book.chapters || !book.chapters[chapterIdx]) {
            console.warn('❌ 章节不存在');
            return;
        }
        
        console.log('📖 打开阅读器:', book.title);
        
        // 确保阅读器脚本和样式已加载，如果未加载则重试
        if (!window.fictionReaderManager) {
            console.warn('⚠️ 阅读器未加载，等待加载...');
            let retryCount = 0;
            const checkReader = setInterval(() => {
                retryCount++;
                if (window.fictionReaderManager) {
                    clearInterval(checkReader);
                    console.log('✓ 阅读器已就绪');
                    initReader();
                } else if (retryCount > 20) {
                    clearInterval(checkReader);
                    console.error('❌ 阅读器加载超时');
                    showToast('阅读器加载失败');
                }
            }, 100);
            return;
        }
        
        initReader();
        
        function initReader() {
            // 隐藏主UI
            document.body.style.overflow = 'hidden';
            
            // 初始化全屏阅读器
            window.fictionReaderManager.init(book, chapterIdx);
        }
    }
    
    /**
     * 生成章节内容总结（防止token爆炸）
     */
    async function summarizeChapters(chapters, startIdx = 0, endIdx = null) {
        try {
            if (!endIdx) endIdx = chapters.length;
            if (endIdx - startIdx <= 0) return null;
            
            const chaptersToSummarize = chapters.slice(startIdx, endIdx);
            const chaptersText = chaptersToSummarize
                .map((ch, idx) => `第${startIdx + idx + 1}章 《${ch.title}》\n${ch.content}`)
                .join('\n\n---\n\n');
            
            const summaryPrompt = `请将以下小说章节内容精炼总结成一段摘要（600字以内），总结主要情节、人物关系变化、重要事件等，方便后续故事接续：

${chaptersText}

只返回总结文本，不要任何其他内容。`;
            
            const summaryData = await callAIAPI(summaryPrompt);
            if (summaryData && typeof summaryData === 'string') {
                return summaryData;
            }
            
            return null;
        } catch (e) {
            console.warn('⚠️ 章节总结失败:', e.message);
            return null;
        }
    }
    
    /**
     * 生成摘要的摘要（超级压缩）
     */
    async function summarizeSummaries(summaries) {
        try {
            if (!summaries || summaries.length === 0) return null;
            
            const summariesText = summaries
                .map((s, idx) => `阶段${idx + 1}摘要：\n${s}`)
                .join('\n\n---\n\n');
            
            const metaSummaryPrompt = `请将以下多个摘要内容进一步压缩总结成一段超级摘要（400字以内），保留最核心的情节进展、关键事件和人物关系变化：

${summariesText}

只返回总结文本，不要任何其他内容。`;
            
            const metaSummaryData = await callAIAPI(metaSummaryPrompt);
            if (metaSummaryData && typeof metaSummaryData === 'string') {
                return metaSummaryData;
            }
            
            return null;
        } catch (e) {
            console.warn('⚠️ 摘要压缩失败:', e.message);
            return null;
        }
    }
    
    /**
     * 继续让AI写作
     */
    async function continueWriteBook(categoryIndex, bookId) {
        const book = fictionState.books[categoryIndex][bookId];
        if (!book) return;
        
        showToast('正在生成新章节...');
        
        try {
            if (!fictionState.currentCharInfo) {
                loadCharacterInfo();
            }
            
            const { charName, charDescription, userName, userDescription } = fictionState.currentCharInfo;
            
            // 获取已有章节内容作为上下文
            const existingChapters = book.chapters || [];
            const hasChapters = existingChapters.length > 0;
            const totalChapters = existingChapters.length;
            
            // 构建前文内容（用于 AI 理解剧情进展）
            let storyContext = '';
            
            if (!hasChapters) {
                // 首次写作：直接从头开始，不限制发挥
                storyContext = `【故事简介】
${book.intro}

你是一位畅销小说作家，已经出版过30本畅销小说，内容涵盖职场、校园、仙侠、穿越等多类题材，深受读者喜爱。请根据以上简介，充分发挥创意，从头开始写这部小说。

【同人文创作核心规则】
- 男主名字必须是"${charName}"，女主名字必须是"${userName}"，全文必须使用这两个名字
- 角色设定仅作为人物背景灵感参考，禁止在正文中直接复制粘贴设定原文，要用自己的笔触重新演绎
- 这是同人文二次创作，要发挥创意和脑洞，赋予角色全新的故事和命运
- 剧情节奏要像真实网络小说一样，不要太快，注重铺垫、伏笔和细节描写
- 每个场景要有充分的环境描写、心理描写、动作细节，不要流水账式推进
- 对话要自然真实，符合人物性格，不要生硬说教

1. 创意写作技巧
(1) 情节构建：能够设计引人入胜的情节，保持读者的兴趣。节奏要慢热，像真正的网络小说一样层层递进。
(2) 人物塑造：创造复杂、有深度的人物，尤其是男女主角的性格和成长过程。深挖人物过去的经历，原生家庭，以便形成立体的人物形象，解释人物在小说中的行为与性格。
(3) 对话技巧：写出自然、真实的对话，增强人物的真实性和情感的表达。
(4) 细节描写：注重场景氛围、五感描写（视觉、听觉、嗅觉、触觉、味觉）、微表情、小动作等细节，让读者有身临其境的感觉。
(5) 节奏把控：不要一章内塞太多剧情，每章聚焦1-2个核心事件，给足铺垫和情感发酵的空间。
2. 情感表达能力
(1) 细腻情感描写：能够通过文字细腻地描写人物的情感变化，打动读者的心。
(2) 共情能力：具备强烈的共情能力，理解并表达出读者可能经历的情感和体验。
3. 市场洞察力
(1) 目标读者分析：了解和分析目标读者的喜好和需求，写出符合市场趋势的内容。
(2) 潮流把握：紧跟言情小说的流行趋势，适时调整写作风格和主题。
`;
            } else if (totalChapters <= 15) {
                // 1-15章：读取所有章节作为上下文
                console.log(`📚 章节数${totalChapters}，读取全部内容...`);
                const allChaptersText = existingChapters
                    .map((ch, idx) => `第${idx + 1}章 《${ch.title}》\n${ch.content}`)
                    .join('\n\n---\n\n');
                
                storyContext = `【已有内容】
${allChaptersText}

请根据上述内容自然衔接，继续往下写。`;
            } else {
                // 超过15章：进行多级摘要压缩
                const cycle = Math.floor((totalChapters - 1) / 15); // 当前是第几个15章周期（0=1-15, 1=16-30, 2=31-45...）
                const chaptersInCycle = totalChapters % 15 || 15; // 当前周期内的章节数
                
                console.log(`📚 章节数${totalChapters}，第${cycle + 1}周期第${chaptersInCycle}章，生成多级摘要...`);
                showToast('正在生成多级摘要...');
                
                let contextLines = [];
                
                // 如果当前周期已完成15章，需要对前面的周期做"摘要的摘要"
                if (chaptersInCycle === 1 && cycle > 0) {
                    // 刚开始新周期，压缩前一个周期
                    console.log(`🔄 跨越周期，开始压缩摘要的摘要...`);
                    
                    // 收集前面所有完整周期的摘要
                    const previousSummaries = [];
                    for (let c = 0; c < cycle; c++) {
                        const cycleStart = c * 15;
                        const cycleEnd = (c + 1) * 15;
                        console.log(`📝 生成第${c + 1}周期摘要（第${cycleStart + 1}-${cycleEnd}章）...`);
                        const cycleSummary = await summarizeChapters(existingChapters, cycleStart, cycleEnd);
                        if (cycleSummary) {
                            previousSummaries.push(cycleSummary);
                        }
                    }
                    
                    // 如果有多个摘要，继续压缩摘要
                    if (previousSummaries.length > 1) {
                        console.log(`🔗 压缩${previousSummaries.length}个摘要为超级摘要...`);
                        const metaSummary = await summarizeSummaries(previousSummaries);
                        if (metaSummary) {
                            contextLines.push(`【前${cycle * 15}章超级摘要】\n${metaSummary}`);
                        }
                    } else if (previousSummaries.length === 1) {
                        contextLines.push(`【前${cycle * 15}章摘要】\n${previousSummaries[0]}`);
                    }
                    
                    // 获取第16章（新周期第1章）的内容
                    const newCycleFirstChapter = existingChapters[cycle * 15];
                    contextLines.push(`【新周期起点 第${cycle * 15 + 1}章】\n《${newCycleFirstChapter.title}》\n${newCycleFirstChapter.content}`);
                } else {
                    // 在某个周期内：生成该周期的摘要 + 当前最新章节
                    const cycleStart = cycle * 15;
                    const cycleEnd = cycleStart + chaptersInCycle;
                    console.log(`📝 生成第${cycle + 1}周期摘要（第${cycleStart + 1}-${cycleEnd}章）...`);
                    
                    const cycleSummary = await summarizeChapters(existingChapters, cycleStart, cycleEnd);
                    if (cycleSummary) {
                        contextLines.push(`【第${cycle + 1}周期摘要（第${cycleStart + 1}-${cycleEnd}章）】\n${cycleSummary}`);
                    }
                    
                    // 如果前面有完整的周期，也加入它们的摘要
                    if (cycle > 0) {
                        const previousSummaries = [];
                        for (let c = 0; c < cycle; c++) {
                            const prevCycleStart = c * 15;
                            const prevCycleEnd = (c + 1) * 15;
                            console.log(`📝 生成第${c + 1}周期摘要（第${prevCycleStart + 1}-${prevCycleEnd}章）...`);
                            const prevSummary = await summarizeChapters(existingChapters, prevCycleStart, prevCycleEnd);
                            if (prevSummary) {
                                previousSummaries.push(prevSummary);
                            }
                        }
                        
                        // 压缩前面所有周期的摘要
                        if (previousSummaries.length > 1) {
                            console.log(`🔗 压缩${previousSummaries.length}个摘要为超级摘要...`);
                            const metaSummary = await summarizeSummaries(previousSummaries);
                            if (metaSummary) {
                                contextLines.unshift(`【前${cycle * 15}章超级摘要】\n${metaSummary}`);
                            }
                        } else if (previousSummaries.length === 1) {
                            contextLines.unshift(`【前${cycle * 15}章摘要】\n${previousSummaries[0]}`);
                        }
                    }
                }
                
                storyContext = `${contextLines.join('\n\n')}

请根据上述摘要和最新内容，自然衔接，继续往下写。`;
            }
            
            const prompt = `你是一位畅销小说作家，已经出版过30本畅销小说，内容涵盖职场、校园、仙侠、穿越等多类题材，深受读者喜爱。根据以下信息，为小说《${book.title}》继续创作2-3个新章节。

【小说信息】
书名：${book.title}
作者：${book.author}
当前章节数：${totalChapters}

【角色设定（仅供背景参考，禁止直接照搬设定原文）】
女主角色名：${charName}
女主背景参考：${charDescription || '暂无详细设定'}
男主角色名：${userName}
男主背景参考：${userDescription || '暂无详细设定'}

${storyContext}

【同人文创作核心规则】
- 男主名字必须是"${userName}"，女主名字必须是"${charName}"，全文必须使用这两个名字
- 角色设定仅作为人物背景灵感参考，禁止在正文中直接复制粘贴设定原文，要用自己的笔触重新演绎
- 这是同人文二次创作，要发挥创意和脑洞，赋予角色全新的故事和命运

【要求】
1. 每章1800-2300字
2. 章节标题原创，富有吸引力
3. 内容要连贯自然，符合故事发展逻辑
4. 创意写作技巧：
(1) 情节构建：能够设计引人入胜的情节，保持读者的兴趣。
(2) 人物塑造：创造复杂、有深度的人物，尤其是男女主角的性格和成长过程。深挖人物过去的经历，原生家庭，以便形成立体的人物形象，解释人物在小说中的行为与性格。
(3) 对话技巧：写出自然、真实的对话，增强人物的真实性和情感的表达。
(4) 细节描写：注重场景氛围、五感描写（视觉、听觉、嗅觉、触觉、味觉）、微表情、小动作等细节，让读者有身临其境的感觉。
(5) 节奏把控：剧情节奏不要太快，像真实网络小说一样慢热推进，每章聚焦1-2个核心事件，给足铺垫和情感发酵的空间，不要流水账式推进。
5. 放飞创意，不要限制想象力
6. 内容要原创生成，不使用任何预设文字或框架
7. 情感表达能力：
(1) 细腻情感描写：能够通过文字细腻地描写人物的情感变化，打动读者的心。
(2) 共情能力：具备强烈的共情能力，理解并表达出读者可能经历的情感和体验。
8. 市场洞察力
(1) 目标读者分析：了解和分析目标读者的喜好和需求，写出符合市场趋势的内容。
(2) 潮流把握：紧跟言情小说的流行趋势，适时调整写作风格和主题。

【输出格式】
直接输出JSON格式，严禁添加任何其他文本：
[
  {"title":"章节标题1","content":"章节内容，1800-2300字"},
  {"title":"章节标题2","content":"章节内容，1800-2300字"},
  ...
]`;

            const chaptersData = await callAIAPI(prompt);
            
            if (!chaptersData || !Array.isArray(chaptersData)) {
                throw new Error('AI返回数据格式错误');
            }
            
            // 清理章节标题：移除可能存在的"第X章"前缀
            const cleanedChapters = chaptersData.map(ch => ({
                ...ch,
                title: (ch.title || '').replace(/^第[0-9零一二三四五六七八九十百千万]+章\s*/, '').replace(/^第[0-9]+章\s*/, '').trim()
            }));
            
            // 添加新章节
            if (!book.chapters) {
                book.chapters = [];
            }
            book.chapters.push(...cleanedChapters);
            
            // 持久化保存到localStorage
            saveFictionDataToStorage();
            
            // 刷新详情页显示
            showBookDetail(categoryIndex, bookId);
            
            console.log(`✅ 已为《${book.title}》生成${cleanedChapters.length}个新章节，总共${book.chapters.length}章`);
            showToast(`已生成${cleanedChapters.length}个新章节`);
        } catch (error) {
            console.error('写作失败:', error);
            showToast('生成章节失败，请重试');
        }
    }
    
    /**
     * 重新生成指定章节
     * @param {number} categoryIndex - 分类索引
     * @param {number} bookId - 书籍ID
     * @param {number} chapterIdx - 章节索引
     * @param {string} userIntervention - 用户干预文本（可选）
     */
    async function regenerateChapter(categoryIndex, bookId, chapterIdx, userIntervention = '') {
        const book = fictionState.books[categoryIndex][bookId];
        if (!book || !book.chapters || !book.chapters[chapterIdx]) {
            showToast('章节不存在');
            return;
        }
        
        showToast('正在重新生成章节...');
        
        try {
            if (!fictionState.currentCharInfo) {
                loadCharacterInfo();
            }
            
            const { charName, charDescription, userName, userDescription } = fictionState.currentCharInfo;
            const chapter = book.chapters[chapterIdx];
            const totalChapters = book.chapters.length;
            
            // 构建上下文：前一章和后一章（如果存在）
            let contextLines = [];
            
            // 添加前一章内容
            if (chapterIdx > 0) {
                const prevChapter = book.chapters[chapterIdx - 1];
                contextLines.push(`【前一章内容】\n第${chapterIdx}章 《${prevChapter.title}》\n${prevChapter.content}`);
            }
            
            // 添加后一章内容（如果存在）
            if (chapterIdx < totalChapters - 1) {
                const nextChapter = book.chapters[chapterIdx + 1];
                contextLines.push(`【后一章内容】\n第${chapterIdx + 2}章 《${nextChapter.title}》\n${nextChapter.content}`);
            }
            
            const contextText = contextLines.join('\n\n');
            
            // 构建用户干预提示
            let interventionText = '';
            if (userIntervention && userIntervention.trim()) {
                interventionText = `\n\n【用户建议】\n${userIntervention}\n\n请根据用户的建议重新创作这一章，融入用户的想法和建议。`;
            }
            
            const prompt = `你是一位畅销小说作家，已经出版过30本畅销小说，内容涵盖职场、校园、仙侠、穿越等多类题材，深受读者喜爱。根据以下信息，重新创作小说《${book.title}》的第${chapterIdx + 1}章。

【小说信息】
书名：${book.title}
作者：${book.author}
当前章节数：${totalChapters}

【角色设定（仅供背景参考，禁止直接照搬设定原文）】
女主角色名：${charName}
女主背景参考：${charDescription || '暂无详细设定'}
男主角色名：${userName}
男主背景参考：${userDescription || '暂无详细设定'}

${contextText}

【当前章节】
第${chapterIdx + 1}章 《${chapter.title}》
${chapter.content}

【同人文创作核心规则】
- 男主名字必须是"${userName}"，女主名字必须是"${charName}"，全文必须使用这两个名字
- 角色设定仅作为人物背景灵感参考，禁止在正文中直接复制粘贴设定原文，要用自己的笔触重新演绎
- 这是同人文二次创作，要发挥创意和脑洞，赋予角色全新的故事和命运

【要求】
1. 重新创作这一章，保持与前后章节的连贯性
2. 字数1800-2300字
3. 章节标题可以保持原有或创意修改
4. 创意写作技巧：
(1) 情节构建：能够设计引人入胜的情节，保持读者的兴趣。
(2) 人物塑造：创造复杂、有深度的人物，尤其是男女主角的性格和成长过程。
(3) 对话技巧：写出自然、真实的对话，增强人物的真实性和情感的表达。
(4) 细节描写：注重场景氛围、五感描写、微表情、小动作等细节，让读者有身临其境的感觉。
(5) 节奏把控：剧情节奏不要太快，像真实网络小说一样慢热推进，注重铺垫和细节描写。
5. 放飞创意，不要限制想象力
6. 内容要原创生成，不使用任何预设文字或框架
7. 情感表达能力：细腻地描写人物的情感变化，打动读者的心${interventionText}

【输出格式】
直接输出JSON格式，严禁添加任何其他文本：
{"title":"新的章节标题","content":"新的章节内容，1800-2300字"}`;
            
            const chapterData = await callAIAPI(prompt);
            
            if (!chapterData || !chapterData.title || !chapterData.content) {
                throw new Error('AI返回数据格式错误');
            }
            
            // 清理章节标题
            if (chapterData && chapterData.title) {
                chapterData.title = chapterData.title.replace(/^第[0-9零一二三四五六七八九十百千万]+章\s*/, '').replace(/^第[0-9]+章\s*/, '').trim();
            }
            
            // 替换章节
            book.chapters[chapterIdx] = chapterData;
            
            // 持久化保存到localStorage
            saveFictionDataToStorage();
            
            // 刷新阅读器显示
            if (window.fictionReaderManager) {
                window.fictionReaderManager.refreshCurrentChapter();
            }
            
            console.log(`已重新生成《${book.title}》第${chapterIdx + 1}章`);
            showToast('章节已重新生成');
        } catch (error) {
            console.error('重新生成章节失败:', error);
            showToast('重新生成失败，请重试');
        }
    }
    
    /**
     * 调用AI API生成文本
     */
    async function callAIAPI(prompt) {
        try {
            // 检查API配置
            if (!window.AppState || !window.AppState.apiSettings) {
                throw new Error('API配置未初始化');
            }
            
            const apiSettings = window.AppState.apiSettings;
            let endpoint = apiSettings.endpoint;
            const apiKey = apiSettings.apiKey;
            const model = apiSettings.selectedModel;
            
            if (!endpoint || !apiKey || !model) {
                throw new Error('API配置不完整');
            }
            
            // 规范化endpoint
            endpoint = endpoint.replace(/\/+$/, '');
            if (!endpoint.endsWith('/v1')) {
                endpoint = endpoint + '/v1';
            }
            const apiUrl = endpoint + '/chat/completions';
            
            // 构建请求
            const messages = [
                {
                    role: 'system',
                    content: '你是一个JSON生成专家。你的任务是严格按照要求生成JSON数据。\n【核心要求】\n1. 必须ONLY返回有效的JSON数据，不返回任何其他内容\n2. 绝对不要使用markdown代码块标记（```）\n3. 不要添加任何解释、说明或其他文本\n4. 如果无法完成任务，直接返回空数组[]\n5. 输出必须完全是有效的JSON格式'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ];
            
            const requestBody = {
                model: model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 50000,
                top_p: 0.9
            };
            
            console.log('📡 正在调用API:', apiUrl);
            
            // 使用智能代理客户端（支持多种后备方案）
            let response;
            if (typeof fetchWithSmartProxy === 'function') {
                response = await fetchWithSmartProxy(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(requestBody)
                });
            } else {
                // 降级到基本的fetch
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(requestBody)
                });
            }
            
            if (!response.ok) {
                throw new Error(`API返回错误: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            
            if (!content) {
                throw new Error('API返回内容为空');
            }
            
            console.log('✅ API调用成功');
            
            // 解析JSON响应
            return parseJSONResponse(content);
            
        } catch (error) {
            console.error('API调用失败:', error);
            console.warn('⚠️ API调用异常，返回空数组');
            return [];
        }
    }
    
    /**
     * 解析API返回的JSON响应
     */
    function parseJSONResponse(content) {
        if (typeof content !== 'string') {
            return content;
        }
        
        try {
            // 移除markdown代码块标记
            let jsonStr = content.trim();
            jsonStr = jsonStr.replace(/^```json\s*/g, '').replace(/^```\s*/g, '');
            jsonStr = jsonStr.replace(/\s*```$/g, '').trim();
            
            console.log('📋 响应长度:', jsonStr.length, '前200字:', jsonStr.substring(0, 200));
            
            // 尝试直接解析
            try {
                const parsed = JSON.parse(jsonStr);
                console.log('✅ JSON解析成功');
                return parsed;
            } catch (e) {
                console.warn('⚠️ 直接解析失败，尝试修复...');
            }
            
            // 提取JSON数组
            const firstBracket = jsonStr.indexOf('[');
            const lastBracket = jsonStr.lastIndexOf(']');
            
            if (firstBracket !== -1 && lastBracket > firstBracket) {
                let extracted = jsonStr.substring(firstBracket, lastBracket + 1);
                
                try {
                    const parsed = JSON.parse(extracted);
                    console.log('✅ 提取的JSON解析成功');
                    return parsed;
                } catch (e) {
                    console.warn('⚠️ 提取的JSON仍然失败');
                }
            }
            
            console.warn('⚠️ 无法解析JSON，返回空数组');
            return [];
        } catch (error) {
            console.error('JSON解析异常:', error);
            return [];
        }
    }
    
    /**
     * 关闭聊天相关组件
     */
    function closeChatComponents() {
        const chatInput = document.querySelector('.chat-input-container');
        if (chatInput) chatInput.style.display = 'none';
        
        const emojiPanel = document.querySelector('.emoji-panel');
        if (emojiPanel) emojiPanel.style.display = 'none';
        
        const morePanel = document.getElementById('toolbar-more-panel');
        if (morePanel) morePanel.style.display = 'none';
    }
    
    /**
     * 恢复聊天相关组件
     */
    function restoreChatComponents() {
        const chatInput = document.querySelector('.chat-input-container');
        if (chatInput) chatInput.style.display = 'flex';
        
        const emojiPanel = document.querySelector('.emoji-panel');
        if (emojiPanel) emojiPanel.style.display = 'block';
    }
    
    /**
     * 显示提示信息
     */
    function showToast(message) {
        if (window.showToast) {
            window.showToast(message);
        } else {
            console.log('Toast:', message);
        }
    }
    
    // 暴露到全局
    window.FictionModule = {
        init: initFiction,
        open: openFiction,
        close: closeFiction,
        switchPage: switchFictionPage,
        regenerateChapter: regenerateChapter
    };
    
    // 页面加载完成后自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFiction);
    } else {
        initFiction();
    }
})();
