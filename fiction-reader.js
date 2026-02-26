/**
 * 全屏阅读器 - 专业级实现
 * 支持全屏阅读、分页、目录导航、阅读设置等功能
 */

const fictionReaderManager = {
    state: {
        currentBook: null,
        currentChapterIndex: 0,
        currentPageIndex: 0,
        pages: [], // 分页内容
        isDarkMode: false,
        isTransitioning: false, // 翻页动画进行中
        settings: {
            fontSize: 16,
            lineHeight: 1.8,
            letterSpacing: 0,
            paragraphSpacing: 30,
            backgroundColor: '#ffffff',
            textColor: '#333333',
            brightness: 100
        },
        readingProgress: {} // 存储各书籍的阅读进度：{bookId: {chapterIndex, pageIndex}}
    },

    /**
     * 优化的字体大小计算 - 根据设备尺寸自适应
     */
    getOptimalFontSize(baseFontSize) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isMobile = width < 768;
        const isSmallMobile = width < 480;
        
        // 移动设备字体应稍小，确保每页显示足够内容
        if (isSmallMobile) {
            return Math.max(12, Math.min(baseFontSize - 2, 18));
        } else if (isMobile) {
            return Math.max(13, Math.min(baseFontSize - 1, 19));
        }
        
        return baseFontSize;
    },
    
    /**
     * 获取有效可用高度（跨设备、跨浏览器）
     */
    getEffectiveHeight() {
        const mainArea = document.getElementById('fictionReaderMain');
        if (!mainArea) {
            // 如果没有找到元素，返回基于bottom和top的差值
            const toolbar = document.getElementById('fictionReaderToolbar');
            const footer = document.getElementById('fictionReaderFooter');
            const toolbarHeight = toolbar ? toolbar.offsetHeight : 50;
            const footerHeight = footer ? footer.offsetHeight : 60;
            return window.innerHeight - toolbarHeight - footerHeight;
        }
        
        const rect = mainArea.getBoundingClientRect();
        return rect.height;
    },
    
    /**
     * 初始化时检测和修正设置
     */
    validateAndFixSettings() {
        // 检测设备类型
        const isMobile = window.innerWidth < 768;
        const userAgent = navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);
        const isAndroid = /android/.test(userAgent);
        
        // iOS和Android字体渲染差异处理
        if (isIOS) {
            // iOS需要稍大的字体和更宽松的行距
            this.state.settings.fontSize = Math.max(this.state.settings.fontSize, 14);
            this.state.settings.lineHeight = Math.max(this.state.settings.lineHeight, 1.8);
        }
        
        if (isAndroid && isMobile) {
            // Android手机需要更精确的尺寸
            this.state.settings.fontSize = this.getOptimalFontSize(this.state.settings.fontSize);
        }
        
        // 移动设备上自动降低段距以增加显示内容
        if (isMobile && this.state.settings.paragraphSpacing > 25) {
            this.state.settings.paragraphSpacing = Math.min(25, this.state.settings.paragraphSpacing);
        }
        
        console.log('📱 设备检测:', { isMobile, isIOS, isAndroid });
        console.log('⚙️ 最终设置:', this.state.settings);
    },

    /**
     * 初始化阅读器
     * @param {Object} book - 书籍对象
     * @param {number} chapterIndex - 要打开的章节索引，如果传入则直接打开该章节，忽略阅读历史
     */
    init(book, chapterIndex = 0) {
        this.state.currentBook = book;
        
        console.log('📖 初始化阅读器:', {
            title: book?.title,
            author: book?.author,
            chaptersCount: book?.chapters?.length,
            requestedChapter: chapterIndex,
            deviceWidth: window.innerWidth,
            deviceHeight: window.innerHeight
        });
        
        // 加载保存的设置
        this.loadSettings();
        
        // 验证和修正设置
        this.validateAndFixSettings();
        
        this.loadReadingProgress();
        
        // 直接使用传入的章节索引（用户选择的章节优先）
        this.state.currentChapterIndex = chapterIndex;
        this.state.currentPageIndex = 0;
        console.log(`打开第${chapterIndex + 1}章`);
        
        // 创建阅读器HTML
        this.createReaderHTML();
        
        // 强制浏览器完成DOM渲染
        setTimeout(() => {
            // 绑定事件
            this.bindEvents();
            
            // 分页当前章节
            console.log('开始分页，章节索引:', this.state.currentChapterIndex);
            this.paginateChapter(this.state.currentChapterIndex);
            
            // 显示保存的页面（如果有的话）
            console.log('显示页面，页数索引:', this.state.currentPageIndex, '总页数:', this.state.pages.length);
            this.showPage(this.state.currentPageIndex);
            
            console.log('✅ 阅读器初始化完成');
        }, 50);
    },

    /**
     * 创建阅读器HTML结构
     */
    createReaderHTML() {
        const readerHTML = `
            <div class="fiction-reader-container" id="fictionReaderContainer">
                <!-- 顶部工具栏 -->
                <div class="fiction-reader-toolbar" id="fictionReaderToolbar">
                    <button class="fiction-reader-toolbar-btn" id="readerTocBtn" title="打开目录">目录</button>
                    <button class="fiction-reader-toolbar-btn" id="readerSettingsBtn" title="打开设置">设置</button>
                    <button class="fiction-reader-toolbar-btn" id="readerRegenerateBtn" title="重新生成章节">重新生成</button>
                    <div class="fiction-reader-title" id="readerTitle"></div>
                    <button class="fiction-reader-toolbar-btn" id="readerCloseBtn" title="关闭阅读器">关闭</button>
                </div>

                <!-- 主阅读区 -->
                <div class="fiction-reader-main" id="fictionReaderMain">
                    <div class="fiction-reader-pages" id="fictionReaderPages"></div>
                </div>

                <!-- 底部导航栏 -->
                <div class="fiction-reader-footer" id="fictionReaderFooter">
                    <button class="fiction-reader-nav-btn" id="readerPrevBtn">上一页</button>
                    <div class="fiction-reader-progress">
                        <div class="fiction-reader-progress-bar">
                            <div class="fiction-reader-progress-fill" id="readerProgressFill"></div>
                        </div>
                        <div class="fiction-reader-progress-text" id="readerProgressText"></div>
                    </div>
                    <button class="fiction-reader-nav-btn" id="readerNextBtn">下一页</button>
                </div>

                <!-- 设置面板 -->
                <div class="fiction-reader-settings" id="fictionReaderSettings">
                    <div class="fiction-reader-settings-header">
                        阅读设置
                        <button class="fiction-reader-settings-close" id="settingsCloseBtn">×</button>
                    </div>
                    <div class="fiction-reader-settings-content">
                        <!-- 主题模式 -->
                        <div class="fiction-reader-settings-group">
                            <div class="fiction-reader-settings-label">主题模式</div>
                            <div class="fiction-reader-settings-options">
                                <button class="fiction-reader-settings-option active" data-theme="light">日间</button>
                                <button class="fiction-reader-settings-option" data-theme="dark">夜间</button>
                                <button class="fiction-reader-settings-option" data-theme="eye">护眼</button>
                            </div>
                        </div>

                        <!-- 亮度调节 -->
                        <div class="fiction-reader-settings-group">
                            <div class="fiction-reader-settings-label">亮度</div>
                            <div class="fiction-reader-settings-slider">
                                <input type="range" id="brightnessSlider" min="30" max="150" value="100">
                                <span class="fiction-reader-settings-value" id="brightnessValue">100%</span>
                            </div>
                        </div>

                        <!-- 文字大小 -->
                        <div class="fiction-reader-settings-group">
                            <div class="fiction-reader-settings-label">文字大小</div>
                            <div class="fiction-reader-settings-slider">
                                <input type="range" id="fontSizeSlider" min="12" max="24" value="16">
                                <span class="fiction-reader-settings-value" id="fontSizeValue">16px</span>
                            </div>
                        </div>

                        <!-- 行距 -->
                        <div class="fiction-reader-settings-group">
                            <div class="fiction-reader-settings-label">行距</div>
                            <div class="fiction-reader-settings-slider">
                                <input type="range" id="lineHeightSlider" min="1.4" max="2.2" step="0.1" value="1.8">
                                <span class="fiction-reader-settings-value" id="lineHeightValue">1.8</span>
                            </div>
                        </div>

                        <!-- 段距 -->
                        <div class="fiction-reader-settings-group">
                            <div class="fiction-reader-settings-label">段距</div>
                            <div class="fiction-reader-settings-slider">
                                <input type="range" id="paragraphSpacingSlider" min="10" max="50" value="30">
                                <span class="fiction-reader-settings-value" id="paragraphSpacingValue">30px</span>
                            </div>
                        </div>

                        <!-- 背景色 -->
                        <div class="fiction-reader-settings-group">
                            <div class="fiction-reader-settings-label">背景色</div>
                            <div class="fiction-reader-settings-options">
                                <button class="fiction-reader-settings-option active" data-bg="#ffffff" style="background: #ffffff; border: 2px solid #FF4A7E;"></button>
                                <button class="fiction-reader-settings-option" data-bg="#f5f5dc" style="background: #f5f5dc;"></button>
                                <button class="fiction-reader-settings-option" data-bg="#e8f4f8" style="background: #e8f4f8;"></button>
                                <button class="fiction-reader-settings-option" data-bg="#f0f8f0" style="background: #f0f8f0;"></button>
                                <button class="fiction-reader-settings-option" data-bg="#1e1e1e" style="background: #1e1e1e; border: 2px solid #666;"></button>
                            </div>
                        </div>

                        <!-- 字体颜色 -->
                        <div class="fiction-reader-settings-group">
                            <div class="fiction-reader-settings-label">字体颜色</div>
                            <div class="fiction-reader-settings-options">
                                <button class="fiction-reader-settings-option active" data-color="#333333" style="color: #333333; background: #f0f0f0; border: 2px solid #FF4A7E;"></button>
                                <button class="fiction-reader-settings-option" data-color="#000000" style="color: #000000; background: #f0f0f0;"></button>
                                <button class="fiction-reader-settings-option" data-color="#666666" style="color: #666666; background: #f0f0f0;"></button>
                                <button class="fiction-reader-settings-option" data-color="#d0d0d0" style="color: #d0d0d0; background: #333; border: 2px solid #666;"></button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 目录侧边栏 -->
                <div class="fiction-reader-toc" id="fictionReaderToc">
                    <div class="fiction-reader-toc-header">
                        目录 (${this.state.currentBook.chapters.length}章)
                    </div>
                    <ul class="fiction-reader-toc-list" id="fictionReaderTocList"></ul>
                </div>

                <!-- 重新生成对话框 -->
                <div class="fiction-reader-regenerate-modal" id="fictionReaderRegenerateModal">
                    <div class="fiction-reader-regenerate-content">
                        <div class="fiction-reader-regenerate-header">
                            重新生成章节
                            <button class="fiction-reader-regenerate-close" id="regenerateCloseBtn">×</button>
                        </div>
                        <div class="fiction-reader-regenerate-body">
                            <div class="fiction-reader-regenerate-info">
                                <p>当前章节：<span id="regenerateChapterTitle"></span></p>
                                <p class="fiction-reader-regenerate-tip">你可以输入建议或要求来影响章节的重新生成方向</p>
                            </div>
                            <textarea 
                                id="regenerateInterventionInput" 
                                class="fiction-reader-regenerate-input" 
                                placeholder="例如：我希望这章更加温暖感人...&#10;或者：这章应该有更多的冲突和戏剧性...&#10;或者：加入更多的细节描写...&#10;&#10;（可选，留空则直接重新生成）"
                                rows="6"></textarea>
                        </div>
                        <div class="fiction-reader-regenerate-footer">
                            <button class="fiction-reader-regenerate-btn fiction-reader-regenerate-cancel" id="regenerateCancelBtn">取消</button>
                            <button class="fiction-reader-regenerate-btn fiction-reader-regenerate-confirm" id="regenerateConfirmBtn">重新生成</button>
                        </div>
                    </div>
                </div>

                <!-- 遮罩层 -->
                <div class="fiction-reader-overlay" id="fictionReaderOverlay"></div>

                <!-- 提示信息 -->
                <div class="fiction-reader-hint" id="fictionReaderHint"></div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', readerHTML);

        // 更新标题（只显示小说名）
        document.getElementById('readerTitle').textContent = this.state.currentBook.title;

        // 构建目录
        this.buildTableOfContents();
    },

    /**
     * 构建目录
     */
    buildTableOfContents() {
        const tocList = document.getElementById('fictionReaderTocList');
        tocList.innerHTML = '';

        this.state.currentBook.chapters.forEach((chapter, index) => {
            const li = document.createElement('li');
            li.className = 'fiction-reader-toc-item';
            if (index === this.state.currentChapterIndex) {
                li.classList.add('active');
            }
            li.textContent = `第${index + 1}章 ${chapter.title}`;
            li.addEventListener('click', () => this.jumpToChapter(index));
            tocList.appendChild(li);
        });
    },

    /**
     * 分页章节（关键算法：基于行数计算）
     */
    paginateChapter(chapterIndex) {
        const chapter = this.state.currentBook.chapters[chapterIndex];
        if (!chapter) return;

        const container = document.getElementById('fictionReaderPages');
        if (!container) {
            console.error('❌ 页面容器未找到');
            return;
        }
        
        container.innerHTML = '';
        this.state.pages = [];

        // 获取阅读区域的实际尺寸
        const mainArea = document.getElementById('fictionReaderMain');
        if (!mainArea) return;

        // 等待DOM渲染完成后再计算
        const computedStyle = window.getComputedStyle(mainArea);
        const viewportHeight = mainArea.clientHeight;
        const viewportWidth = mainArea.clientWidth;
        
        // 获取当前设置
        const fontSize = this.state.settings.fontSize || 16;
        const lineHeight = parseFloat(this.state.settings.lineHeight) || 1.8;
        const paragraphSpacing = this.state.settings.paragraphSpacing || 16;
        
        // 计算页面padding（根据屏幕宽度）
        let paddingY, paddingX;
        if (viewportWidth <= 480) {
            paddingY = 16;
            paddingX = 12;
        } else if (viewportWidth <= 768) {
            paddingY = 20;
            paddingX = 14;
        } else {
            paddingY = 28;
            paddingX = 20;
        }
        
        // 计算每行高度和每页可容纳的行数
        const lineHeightPx = fontSize * lineHeight;
        const availableHeight = viewportHeight - (paddingY * 2);
        const availableWidth = viewportWidth - (paddingX * 2);
        
        // 标题占用的行数（大约3-4行高度）
        const titleLines = 4;
        const titleHeight = titleLines * lineHeightPx;
        
        // 每页可以放多少行文字
        const linesPerPage = Math.floor(availableHeight / lineHeightPx);
        const linesPerPageWithTitle = Math.floor((availableHeight - titleHeight) / lineHeightPx);
        
        console.log('📐 分页参数:', {
            viewportHeight,
            availableHeight,
            fontSize,
            lineHeightPx,
            linesPerPage,
            linesPerPageWithTitle
        });

        // 解析章节内容
        const rawContent = chapter.content.trim();
        let paragraphs = rawContent
            .split(/\n+/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        if (paragraphs.length === 0) {
            paragraphs = [chapter.content || '暂无内容'];
        }

        // 计算每个段落占用的行数
        const charsPerLine = Math.floor(availableWidth / fontSize);
        
        function estimateParagraphLines(text) {
            // 估算段落行数：字符数/每行字符数，向上取整，再加段落间距
            const lines = Math.ceil(text.length / charsPerLine);
            return Math.max(lines, 1);
        }

        // 创建分页
        const pages = [];
        let currentPageParagraphs = [];
        let currentLines = 0;
        let isFirstPage = true;
        
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i];
            const paraLines = estimateParagraphLines(paragraph);
            // 段落间距算作额外行数
            const paraLinesWithSpacing = paraLines + Math.ceil(paragraphSpacing / lineHeightPx);
            
            // 当前页可用行数
            const maxLines = isFirstPage && pages.length === 0 ? linesPerPageWithTitle : linesPerPage;
            
            // 判断是否需要换页
            if (currentLines + paraLinesWithSpacing > maxLines && currentPageParagraphs.length > 0) {
                // 保存当前页
                pages.push({
                    paragraphs: [...currentPageParagraphs],
                    showTitle: isFirstPage && pages.length === 0
                });
                
                // 开始新页
                currentPageParagraphs = [paragraph];
                currentLines = paraLinesWithSpacing;
                isFirstPage = false;
            } else {
                // 添加到当前页
                currentPageParagraphs.push(paragraph);
                currentLines += paraLinesWithSpacing;
            }
        }

        // 保存最后一页
        if (currentPageParagraphs.length > 0) {
            pages.push({
                paragraphs: currentPageParagraphs,
                showTitle: isFirstPage && pages.length === 0
            });
        }

        // 确保至少有一页
        if (pages.length === 0) {
            pages.push({
                paragraphs: [''],
                showTitle: true
            });
        }

        console.log(`✅ 分页完成，共${pages.length}页`);

        // 创建页面DOM
        const titleFontSize = Math.min(fontSize * 1.2, 20);
        
        pages.forEach((pageData, pageIndex) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'fiction-reader-page';
            pageDiv.dataset.pageIndex = pageIndex;
            
            let pageHTML = '';
            
            // 显示标题（仅第一页）
            if (pageData.showTitle) {
                pageHTML += `<div class="fiction-reader-chapter-title" style="font-size:${titleFontSize}px;margin-bottom:${paragraphSpacing}px;">${chapter.title}</div>`;
            }
            
            // 添加所有段落
            pageData.paragraphs.forEach(para => {
                if (para.trim()) {
                    pageHTML += `<p style="margin:0 0 ${paragraphSpacing}px 0;line-height:${lineHeight};word-break:break-word;text-align:justify;">${para}</p>`;
                }
            });
            
            pageDiv.innerHTML = pageHTML;
            container.appendChild(pageDiv);
            
            this.state.pages.push(pageData);
        });

        this.state.currentPageIndex = 0;
    },

    /**
     * 内部渲染页面（跳过翻页动画）
     */
    _renderPage() {
        if (!this.state.pages || this.state.pages.length === 0) return;

        const pagesContainer = document.getElementById('fictionReaderPages');
        const offset = -this.state.currentPageIndex * 100;
        
        // 不使用transition，直接跳转（跨章节时）
        pagesContainer.style.transition = 'none';
        pagesContainer.style.transform = `translateX(${offset}%)`;

        // 更新UI信息
        const totalPages = this.state.pages.length;
        const progressPercent = ((this.state.currentPageIndex + 1) / totalPages) * 100;
        document.getElementById('readerProgressFill').style.width = progressPercent + '%';

        const chapterIndex = this.state.currentChapterIndex;
        const chapterTotal = this.state.currentBook.chapters.length;
        document.getElementById('readerProgressText').textContent = 
            `第${chapterIndex + 1}章 - 第${this.state.currentPageIndex + 1}/${totalPages}页 (全书第${chapterIndex + 1}/${chapterTotal}章)`;

        // 更新按钮状态
        const isFirstPage = this.state.currentPageIndex === 0;
        const isLastPage = this.state.currentPageIndex === totalPages - 1;
        const isFirstChapter = chapterIndex === 0;
        const isLastChapter = chapterIndex === chapterTotal - 1;
        
        document.getElementById('readerPrevBtn').disabled = isFirstPage && isFirstChapter;
        document.getElementById('readerNextBtn').disabled = isLastPage && isLastChapter;

        // 保存阅读进度
        this.saveReadingProgress();

        // 600ms后允许下一次翻页
        setTimeout(() => {
            this.state.isTransitioning = false;
            // 恢复transition用于下一次翻页
            pagesContainer.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        }, 600);
    },

    /**
     * 显示指定页面
     */
    showPage(pageIndex) {
        // 处理无效的页数
        if (!this.state.pages || this.state.pages.length === 0) {
            console.warn('⚠️ 没有可显示的页面');
            return;
        }

        // 限制页数在有效范围内
        pageIndex = Math.max(0, Math.min(pageIndex, this.state.pages.length - 1));

        // 防止翻页时重复点击
        if (this.state.isTransitioning) {
            return;
        }

        this.state.isTransitioning = true;

        const pagesContainer = document.getElementById('fictionReaderPages');
        const oldPageIndex = this.state.currentPageIndex;
        const isForward = pageIndex > oldPageIndex; // 向前翻（下一页）

        // 计算平滑的transform过渡
        this.state.currentPageIndex = pageIndex;
        const offset = -pageIndex * 100;
        
        // 使用平滑过渡
        pagesContainer.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        pagesContainer.style.transform = `translateX(${offset}%)`;

        // 600ms后移除过渡标志
        setTimeout(() => {
            this.state.isTransitioning = false;
        }, 600);

        // 更新进度条
        const totalPages = this.state.pages.length;
        const progressPercent = ((pageIndex + 1) / totalPages) * 100;
        document.getElementById('readerProgressFill').style.width = progressPercent + '%';

        // 更新进度文字
        const chapterIndex = this.state.currentChapterIndex;
        const chapterTotal = this.state.currentBook.chapters.length;
        document.getElementById('readerProgressText').textContent = 
            `第${chapterIndex + 1}章 - 第${pageIndex + 1}/${totalPages}页 (全书第${chapterIndex + 1}/${chapterTotal}章)`;

        // 更新按钮状态 - 判断是否在最后一页且是最后一章
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;
        const isFirstChapter = chapterIndex === 0;
        const isLastChapter = chapterIndex === chapterTotal - 1;
        
        document.getElementById('readerPrevBtn').disabled = isFirstPage && isFirstChapter;
        document.getElementById('readerNextBtn').disabled = isLastPage && isLastChapter;

        // 保存阅读进度
        this.saveReadingProgress();
    },

    /**
     * 跳转到指定章节
     */
    jumpToChapter(chapterIndex) {
        if (chapterIndex < 0 || chapterIndex >= this.state.currentBook.chapters.length) {
            return;
        }

        this.state.currentChapterIndex = chapterIndex;
        this.paginateChapter(chapterIndex);
        this.showPage(0);

        // 更新标题（只显示小说名）
        document.getElementById('readerTitle').textContent = this.state.currentBook.title;

        // 更新目录高亮
        document.querySelectorAll('.fiction-reader-toc-item').forEach((item, index) => {
            if (index === chapterIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // 隐藏目录
        this.toggleToc(false);

        // 显示提示
        this.showHint(`已跳转到第${chapterIndex + 1}章`);
    },

    /**
     * 切换主题模式
     */
    setTheme(theme) {
        const container = document.getElementById('fictionReaderContainer');
        const isDark = theme === 'dark' || theme === 'eye';

        if (isDark) {
            container.classList.add('dark');
        } else {
            container.classList.remove('dark');
        }

        // 设置背景和文字颜色
        if (theme === 'light') {
            this.state.settings.backgroundColor = '#ffffff';
            this.state.settings.textColor = '#333333';
            this.state.settings.brightness = 100;
        } else if (theme === 'dark') {
            this.state.settings.backgroundColor = '#1e1e1e';
            this.state.settings.textColor = '#d0d0d0';
            this.state.settings.brightness = 100;
        } else if (theme === 'eye') {
            this.state.settings.backgroundColor = '#f0f8f0';
            this.state.settings.textColor = '#333333';
            this.state.settings.brightness = 95;
        }

        this.applySettings();
        this.saveSettings();
    },

    /**
     * 应用阅读设置
     */
    applySettings() {
        const pages = document.querySelectorAll('.fiction-reader-page');
        
        pages.forEach(page => {
            page.style.backgroundColor = this.state.settings.backgroundColor;
            page.style.fontSize = this.state.settings.fontSize + 'px';
            page.style.lineHeight = this.state.settings.lineHeight;

            const content = page.querySelector('.fiction-reader-content');
            if (content) {
                content.style.color = this.state.settings.textColor;
                content.style.fontSize = this.state.settings.fontSize + 'px';
                content.style.lineHeight = this.state.settings.lineHeight;
            }
        });

        // 应用亮度
        const main = document.getElementById('fictionReaderMain');
        main.style.filter = `brightness(${this.state.settings.brightness}%)`;

        // 应用背景色到主容器
        document.getElementById('fictionReaderMain').style.backgroundColor = this.state.settings.backgroundColor;
    },

    /**
     * 保存设置到localStorage
     */
    saveSettings() {
        localStorage.setItem('fictionReaderSettings', JSON.stringify(this.state.settings));
    },

    /**
     * 从localStorage加载设置
     */
    loadSettings() {
        const saved = localStorage.getItem('fictionReaderSettings');
        if (saved) {
            try {
                this.state.settings = Object.assign(this.state.settings, JSON.parse(saved));
            } catch (e) {
                console.warn('加载阅读设置失败');
            }
        }
    },

    /**
     * 保存阅读进度
     */
    saveReadingProgress() {
        if (!this.state.currentBook) return;
        
        const bookId = `${this.state.currentBook.title}_${this.state.currentBook.author}`;
        this.state.readingProgress[bookId] = {
            chapterIndex: this.state.currentChapterIndex,
            pageIndex: this.state.currentPageIndex,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('fictionReaderProgress', JSON.stringify(this.state.readingProgress));
            console.log(`保存阅读进度: ${bookId} - 第${this.state.currentChapterIndex + 1}章第${this.state.currentPageIndex + 1}页`);
        } catch (e) {
            console.warn('保存阅读进度失败:', e.message);
        }
    },

    /**
     * 加载阅读进度
     */
    loadReadingProgress() {
        try {
            const saved = localStorage.getItem('fictionReaderProgress');
            if (saved) {
                this.state.readingProgress = JSON.parse(saved);
                console.log('已加载阅读进度:', this.state.readingProgress);
            } else {
                this.state.readingProgress = {};
                console.log('没有保存的阅读进度');
            }
        } catch (e) {
            console.warn('加载阅读进度失败:', e);
            this.state.readingProgress = {};
        }
    },

    /**
     * 切换目录
     */
    toggleToc(show) {
        const toc = document.getElementById('fictionReaderToc');
        const overlay = document.getElementById('fictionReaderOverlay');

        if (show === undefined) {
            show = !toc.classList.contains('show');
        }

        if (show) {
            toc.classList.add('show');
            overlay.classList.add('show');
        } else {
            toc.classList.remove('show');
            overlay.classList.remove('show');
        }
    },

    /**
     * 切换设置面板
     */
    toggleSettings(show) {
        const settings = document.getElementById('fictionReaderSettings');
        const overlay = document.getElementById('fictionReaderOverlay');

        if (show === undefined) {
            show = !settings.classList.contains('show');
        }

        if (show) {
            settings.classList.add('show');
            overlay.classList.add('show');
        } else {
            settings.classList.remove('show');
            overlay.classList.remove('show');
        }
    },

    /**
     * 显示提示信息
     */
    showHint(text) {
        const hint = document.getElementById('fictionReaderHint');
        hint.textContent = text;
        hint.classList.add('show');
        setTimeout(() => hint.classList.remove('show'), 2000);
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        const self = this;

        // 上一页
        document.getElementById('readerPrevBtn').addEventListener('click', () => {
            if (self.state.isTransitioning) return;
            
            if (self.state.currentPageIndex > 0) {
                // 当前章节有前一页
                self.showPage(self.state.currentPageIndex - 1);
            } else if (self.state.currentChapterIndex > 0) {
                // 跳转到前一章的最后一页
                self.state.isTransitioning = true; // 提前设置，防止重复点击
                self.state.currentChapterIndex--;
                
                // 分页完成后立即显示，不延迟
                self.paginateChapter(self.state.currentChapterIndex);
                
                // 更新目录高亮
                document.querySelectorAll('.fiction-reader-toc-item').forEach((item, index) => {
                    if (index === self.state.currentChapterIndex) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }
                });
                
                // 立即显示前一章的最后一页
                self.state.currentPageIndex = Math.max(0, self.state.pages.length - 1);
                self._renderPage();
            }
        });

        // 下一页
        document.getElementById('readerNextBtn').addEventListener('click', () => {
            if (self.state.isTransitioning) return;
            
            if (self.state.currentPageIndex < self.state.pages.length - 1) {
                // 当前章节有下一页
                self.showPage(self.state.currentPageIndex + 1);
            } else if (self.state.currentChapterIndex < self.state.currentBook.chapters.length - 1) {
                // 跳转到下一章的第一页
                self.state.isTransitioning = true; // 提前设置，防止重复点击
                self.state.currentChapterIndex++;
                
                // 分页完成后立即显示，不延迟
                self.paginateChapter(self.state.currentChapterIndex);
                
                // 更新目录高亮
                document.querySelectorAll('.fiction-reader-toc-item').forEach((item, index) => {
                    if (index === self.state.currentChapterIndex) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }
                });
                
                // 立即显示下一章的第一页
                self.state.currentPageIndex = 0;
                self._renderPage();
            }
        });

        // 目录按钮
        document.getElementById('readerTocBtn').addEventListener('click', () => {
            self.toggleToc();
        });

        // 设置按钮
        document.getElementById('readerSettingsBtn').addEventListener('click', () => {
            self.toggleSettings();
        });

        // 重新生成按钮
        document.getElementById('readerRegenerateBtn').addEventListener('click', () => {
            self.showRegenerateModal();
        });

        // 重新生成对话框关闭按钮
        document.getElementById('regenerateCloseBtn').addEventListener('click', () => {
            self.closeRegenerateModal();
        });

        // 重新生成对话框取消按钮
        document.getElementById('regenerateCancelBtn').addEventListener('click', () => {
            self.closeRegenerateModal();
        });

        // 重新生成对话框确认按钮
        document.getElementById('regenerateConfirmBtn').addEventListener('click', () => {
            self.confirmRegenerate();
        });

        // 关闭按钮
        document.getElementById('readerCloseBtn').addEventListener('click', () => {
            self.closeReader();
        });

        // 设置关闭按钮
        document.getElementById('settingsCloseBtn').addEventListener('click', () => {
            self.toggleSettings(false);
        });

        // 遮罩层点击关闭
        document.getElementById('fictionReaderOverlay').addEventListener('click', () => {
            self.toggleToc(false);
            self.toggleSettings(false);
        });

        // 主题选择
        document.querySelectorAll('[data-theme]').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('[data-theme]').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                self.setTheme(this.dataset.theme);
            });
        });

        // 背景色选择
        document.querySelectorAll('[data-bg]').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('[data-bg]').forEach(b => b.style.borderColor = 'transparent');
                this.style.borderColor = '#FF4A7E';
                self.state.settings.backgroundColor = this.dataset.bg;
                self.applySettings();
                self.saveSettings();
            });
        });

        // 字体颜色选择
        document.querySelectorAll('[data-color]').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('[data-color]').forEach(b => b.style.borderColor = '#f0f0f0');
                this.style.borderColor = '#FF4A7E';
                self.state.settings.textColor = this.dataset.color;
                self.applySettings();
                self.saveSettings();
            });
        });

        // 亮度滑块
        document.getElementById('brightnessSlider').addEventListener('input', function() {
            self.state.settings.brightness = this.value;
            document.getElementById('brightnessValue').textContent = this.value + '%';
            self.applySettings();
            self.saveSettings();
        });

        // 文字大小滑块
        document.getElementById('fontSizeSlider').addEventListener('input', function() {
            self.state.settings.fontSize = parseInt(this.value);
            document.getElementById('fontSizeValue').textContent = this.value + 'px';
            self.paginateChapter(self.state.currentChapterIndex);
            self.showPage(0);
            self.applySettings();
            self.saveSettings();
        });

        // 行距滑块
        document.getElementById('lineHeightSlider').addEventListener('input', function() {
            self.state.settings.lineHeight = parseFloat(this.value);
            document.getElementById('lineHeightValue').textContent = this.value;
            self.paginateChapter(self.state.currentChapterIndex);
            self.showPage(0);
            self.applySettings();
            self.saveSettings();
        });

        // 段距滑块
        document.getElementById('paragraphSpacingSlider').addEventListener('input', function() {
            self.state.settings.paragraphSpacing = parseInt(this.value);
            document.getElementById('paragraphSpacingValue').textContent = this.value + 'px';
            self.paginateChapter(self.state.currentChapterIndex);
            self.showPage(0);
            self.applySettings();
            self.saveSettings();
        });

        // 进度条点击
        document.querySelector('.fiction-reader-progress-bar').addEventListener('click', (e) => {
            const bar = e.currentTarget;
            const percent = (e.clientX - bar.getBoundingClientRect().left) / bar.clientWidth;
            const pageIndex = Math.floor(percent * self.state.pages.length);
            self.showPage(Math.min(pageIndex, self.state.pages.length - 1));
        });

        // 键盘导航
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('fictionReaderContainer')) return;

            switch(e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    document.getElementById('readerPrevBtn').click();
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    document.getElementById('readerNextBtn').click();
                    break;
                case 'Escape':
                    self.closeReader();
                    break;
            }
        });

        // 应用初始设置
        this.applySettings();
    },

    /**
     * 关闭阅读器
     */
    closeReader() {
        // 关闭前保存进度
        this.saveReadingProgress();
        
        const container = document.getElementById('fictionReaderContainer');
        if (container) {
            container.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                container.remove();
                // 恢复之前的滚动位置
                document.body.style.overflow = 'auto';
            }, 300);
        }
    },

    /**
     * 显示重新生成对话框
     */
    showRegenerateModal() {
        const modal = document.getElementById('fictionReaderRegenerateModal');
        const overlay = document.getElementById('fictionReaderOverlay');
        const chapterTitle = document.getElementById('regenerateChapterTitle');
        const input = document.getElementById('regenerateInterventionInput');
        
        // 设置当前章节标题
        const currentChapter = this.state.currentBook.chapters[this.state.currentChapterIndex];
        chapterTitle.textContent = `第${this.state.currentChapterIndex + 1}章 《${currentChapter.title}》`;
        
        // 清空输入框
        input.value = '';
        input.focus();
        
        // 显示对话框
        modal.classList.add('show');
        overlay.classList.add('show');
    },

    /**
     * 关闭重新生成对话框
     */
    closeRegenerateModal() {
        const modal = document.getElementById('fictionReaderRegenerateModal');
        const overlay = document.getElementById('fictionReaderOverlay');
        
        modal.classList.remove('show');
        overlay.classList.remove('show');
    },

    /**
     * 确认重新生成
     */
    async confirmRegenerate() {
        const input = document.getElementById('regenerateInterventionInput');
        const userIntervention = input.value.trim();
        
        this.closeRegenerateModal();
        
        // 调用主模块的重新生成函数
        if (window.FictionModule && window.FictionModule.regenerateChapter) {
            // 需要获取categoryIndex和bookId
            const book = this.state.currentBook;
            const chapterIdx = this.state.currentChapterIndex;
            
            // 从全局状态中获取categoryIndex和bookId
            if (window.fictionState && window.fictionState.books) {
                for (let catIdx in window.fictionState.books) {
                    const books = window.fictionState.books[catIdx];
                    for (let bookId in books) {
                        if (books[bookId] === book) {
                            await window.FictionModule.regenerateChapter(
                                parseInt(catIdx),
                                bookId,
                                chapterIdx,
                                userIntervention
                            );
                            return;
                        }
                    }
                }
            }
        }
    },

    /**
     * 刷新当前章节显示
     */
    refreshCurrentChapter() {
        // 重新分页当前章节
        this.paginateChapter(this.state.currentChapterIndex);
        // 显示第一页
        this.state.currentPageIndex = 0;
        this._renderPage();
        
        console.log('✅ 章节已刷新');
    },
};

// 暴露到全局作用域
window.fictionReaderManager = fictionReaderManager;
console.log('全屏阅读器已加载');
