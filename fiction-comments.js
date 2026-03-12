/**
 * 小说评论区模块
 * 支持生成AI评论、作者有话说、评论回复等功能
 */

const fictionCommentsManager = {
    state: {
        currentBook: null,
        comments: [],
        isLoading: false,
        STORAGE_KEY: 'fiction_comments_data'
    },

    /**
     * 获取存储的评论数据
     */
    getStoredComments(bookId) {
        try {
            const stored = localStorage.getItem(this.state.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                // 检查是否是同一本书的评论
                if (data.bookId === bookId) {
                    console.log('✅ 从缓存加载评论数据');
                    return data.comments;
                }
            }
        } catch (error) {
            console.error('读取缓存评论失败:', error);
        }
        return null;
    },

    /**
     * 保存评论数据
     */
    saveComments(comments, bookId) {
        try {
            const data = {
                bookId: bookId,
                comments: comments,
                timestamp: Date.now()
            };
            localStorage.setItem(this.state.STORAGE_KEY, JSON.stringify(data));
            console.log('✅ 评论数据已保存到缓存');
        } catch (error) {
            console.error('保存评论失败:', error);
        }
    },

    /**
     * 清除缓存的评论
     */
    clearStoredComments() {
        localStorage.removeItem(this.state.STORAGE_KEY);
        console.log('🗑️ 已清除缓存评论');
    },

    /**
     * 初始化评论区
     */
    async init(book) {
        this.state.currentBook = book;
        this.state.isLoading = true;

        // 创建评论区DOM
        this.createCommentsPanel();

        // 检查是否有缓存的评论
        const bookId = book.title + '_' + (book.author || '');
        const cachedComments = this.getStoredComments(bookId);

        if (cachedComments) {
            // 使用缓存的评论
            this.state.comments = cachedComments;
            this.renderComments();
            console.log('✅ 使用缓存的评论数据');
        } else {
            // 生成新的评论内容
            await this.generateAllComments();
        }

        this.state.isLoading = false;
    },

    /**
     * 创建评论区面板
     */
    createCommentsPanel() {
        const commentCount = Math.floor(Math.random() * 1000) + 500;
        const commentsHTML = `
            <div class="fiction-comments-container" id="fictionCommentsContainer">
                <div class="fiction-comments-panel" id="fictionCommentsPanel">
                    <div class="fiction-comments-header">
                        <div class="fiction-comments-title">
                            评论区 (${commentCount})
                        </div>
                        <button class="fiction-comments-close" id="fictionCommentsClose">×</button>
                    </div>
                    <ul class="fiction-comments-list" id="fictionCommentsList">
                        <div class="fiction-comments-loading" id="fictionCommentsLoading">正在生成评论...</div>
                    </ul>
                    <div class="fiction-comments-footer">
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', commentsHTML);

        // 关闭按钮事件
        document.getElementById('fictionCommentsClose').addEventListener('click', () => {
            this.closeComments();
        });

        // 点击遮罩层关闭
        document.getElementById('fictionCommentsContainer').addEventListener('click', (e) => {
            if (e.target.id === 'fictionCommentsContainer') {
                this.closeComments();
            }
        });

        // 评论列表滚动监听
        const commentsList = document.getElementById('fictionCommentsList');
        if (commentsList) {
            commentsList.addEventListener('scroll', () => {
                this.checkScrollPosition();
            });
        }
    },

    /**
     * 检查滚动位置（已弃用 - 更多按钮现在总是显示）
     */
    checkScrollPosition() {
        // 此方法已弃用，更多按钮现在作为列表项始终显示
        return;
    },

    /**
     * 一次性生成所有评论内容
     */
    async generateAllComments() {
        const prompt = `为小说《${this.state.currentBook.title}》生成一个真实的评论区场景。

要求：
1. 首先生成1条"作者有话说"（作者：${this.state.currentBook.author}），200字以内，要有个人特色和与读者互动的语气
2. 然后生成25条高质量的读者评论

对于每条评论要包含：
- nickname: 用户昵称（真实感的名字，如"书虫小王"、"午夜读者"等）
- level: 用户等级（v0-v3之间随机）
- content: 评论内容（100-200字，要有具体的情节、人物或写作感受的评价，要有真实感，像真人写的）
- likes: 点赞数（50-999之间）
- replies: 随机1-3条回复，每个回复包含 author（回复者昵称）、to（被回复者昵称）、content（回复内容50-100字）

返回JSON格式：
{
  "author_message": {
    "content": "作者有话说内容",
    "likes": 点赞数,
    "replies": [{"author": "昵称", "to": "被回复者", "content": "回复内容"}]
  },
  "comments": [
    {
      "nickname": "昵称",
      "level": "v1",
      "content": "评论内容",
      "likes": 数字,
      "replies": [{"author": "昵称", "to": "被回复者", "content": "回复内容"}]
    }
  ]
}

要求内容要与小说简介相关：${this.state.currentBook.intro}

只返回JSON数据，不要任何其他文本。`;

        try {
            const response = await this.callAIAPI(prompt);
            console.log('评论API响应已收到，正在处理...');
            
            let parsedData = response;

            if (parsedData && parsedData.author_message && Array.isArray(parsedData.comments)) {
                console.log('✅ 成功解析评论数据: 1个作者消息 + ' + parsedData.comments.length + '条评论');
                
                this.state.comments = [
                    { 
                        type: 'author', 
                        data: parsedData.author_message,
                        avatar: this.getRandomAvatar(),
                        id: 'author'
                    },
                    ...parsedData.comments.map((comment, index) => ({
                        ...comment,
                        avatar: this.getRandomAvatar(),
                        time: this.getRandomTime(),
                        id: index
                    }))
                ];

                // 保存到缓存
                const bookId = this.state.currentBook.title + '_' + (this.state.currentBook.author || '');
                this.saveComments(this.state.comments, bookId);
            } else {
                throw new Error('API返回数据格式不正确，缺少author_message或comments字段');
            }

            this.renderComments();
        } catch (error) {
            console.error('❌ 生成评论失败:', error.message);
            const loadingEl = document.getElementById('fictionCommentsLoading');
            if (loadingEl) {
                loadingEl.textContent = '评论加载失败: ' + error.message;
            }
        }
    },

    /**
     * 调用主API - 使用全局API配置（与fiction-module-v2.js相同）
     */
    async callAIAPI(prompt) {
        try {
            // 检查API配置
            if (!window.AppState || !window.AppState.apiSettings) {
                throw new Error('API配置未初始化，请先设置API密钥');
            }
            
            const apiSettings = window.AppState.apiSettings;
            let endpoint = apiSettings.endpoint;
            const apiKey = apiSettings.apiKey;
            const model = apiSettings.selectedModel;
            
            if (!endpoint || !apiKey || !model) {
                throw new Error('API配置不完整，请先设置API密钥和模型');
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
            
            console.log('📡 正在调用API生成评论:', apiUrl);
            
            // 创建AbortController用于超时控制
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 600000);
            
            let response;
            
            // 尝试直接调用
            try {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });
            } catch (directError) {
                // 如果直接调用失败（可能是CORS），尝试使用公共CORS代理
                console.warn('⚠️ 直接调用失败，尝试使用CORS代理:', directError.message);
                
                if (typeof fetchWithProxy === 'function') {
                    console.log('📡 使用CORS代理调用API');
                    response = await fetchWithProxy(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify(requestBody)
                    });
                } else {
                    throw directError;
                }
            }
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`API返回错误: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            
            if (!content) {
                throw new Error('API返回内容为空');
            }
            
            console.log('✅ API调用成功，正在解析评论数据...');
            
            // 尝试解析JSON - 使用相同的多层次提取策略
            return this.parseJSONResponse(content);
            
        } catch (error) {
            console.error('❌ 生成评论失败:', error);
            throw error;
        }
    },

    /**
     * 解析API返回的JSON - 支持多种格式和错误恢复
     */
    parseJSONResponse(content) {
        if (typeof content === 'object') {
            return content;
        }

        if (typeof content !== 'string') {
            throw new Error('无效的响应格式');
        }

        console.log('📋 原始响应长度:', content.length);
        console.log('📋 原始响应开头:', content.substring(0, 300));
        
        let jsonStr = content.trim();
        
        // 移除markdown代码块标记
        jsonStr = jsonStr.replace(/^```json\s*/g, '').replace(/^```\s*/g, '');
        jsonStr = jsonStr.replace(/\s*```$/g, '');
        jsonStr = jsonStr.trim();
        
        console.log('📝 清理后长度:', jsonStr.length, '开头:', jsonStr.substring(0, 100));
        
        // 尝试直接解析
        try {
            const parsed = JSON.parse(jsonStr);
            console.log('✅ 直接JSON解析成功');
            return parsed;
        } catch (e) {
            console.warn('⚠️ 直接解析失败:', e.message);
        }
        
        // 尝试使用正则表达式提取JSON对象
        const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            try {
                const parsed = JSON.parse(objectMatch[0]);
                console.log('✅ 正则提取JSON对象成功');
                return parsed;
            } catch (e) {
                console.warn('⚠️ 对象解析失败');
            }
        }
        
        // 尝试使用括号匹配提取JSON
        const firstBrace = jsonStr.indexOf('{');
        let lastBrace = jsonStr.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            let extractedJson = jsonStr.substring(firstBrace, lastBrace + 1);
            
            try {
                const parsed = JSON.parse(extractedJson);
                console.log('✅ 括号匹配提取成功');
                return parsed;
            } catch (e) {
                console.warn('⚠️ 括号匹配提取失败');
            }
        }
        
        throw new Error('无法解析API响应的JSON格式: ' + jsonStr.substring(0, 200));
    },

    /**
     * 获取随机QQ头像
     */
    getRandomAvatar() {
        const qq = Math.floor(Math.random() * 900000000) + 100000000;
        return `https://q1.qlogo.cn/g?b=qq&nk=${qq}&s=640`;
    },

    /**
     * 获取随机时间
     */
    getRandomTime() {
        const times = [
            '2小时前',
            '3小时前',
            '5小时前',
            '8小时前',
            '1天前',
            '2天前',
            '3天前',
            '4天前',
            '1周前',
            '2周前'
        ];
        return times[Math.floor(Math.random() * times.length)];
    },

    /**
     * 渲染评论列表
     */
    renderComments() {
        const commentsList = document.getElementById('fictionCommentsList');
        if (!commentsList) return;

        // 清空加载状态
        commentsList.innerHTML = '';

        // 渲染所有评论
        this.state.comments.forEach(item => {
            if (item.type === 'author') {
                commentsList.appendChild(this.createAuthorMessageElement(item.data, item.avatar, item.id));
            } else {
                commentsList.appendChild(this.createCommentElement(item));
            }
        });

        // 在列表底部添加用户评论输入框
        const inputContainer = document.createElement('li');
        inputContainer.className = 'fiction-comments-input-list-item';
        inputContainer.id = 'fictionCommentsInputListItem';
        inputContainer.innerHTML = `
            <div class="fiction-comments-input-area">
                <textarea class="fiction-comments-input" id="fictionCommentsInput" placeholder=""></textarea>
                <div class="fiction-comments-input-actions">
                    <button class="fiction-comments-submit-btn" id="fictionCommentsSubmitBtn">发送评论</button>
                </div>
            </div>
        `;
        commentsList.appendChild(inputContainer);

        // 在列表底部添加"更多"按钮
        const moreButtonItem = document.createElement('li');
        moreButtonItem.className = 'fiction-comments-more-btn-item';
        moreButtonItem.id = 'fictionCommentsMoreBtnItem';
        moreButtonItem.innerHTML = `
            <button class="fiction-comments-more-btn" id="fictionCommentsMoreBtn" title="加载更多评论">
                更多
            </button>
        `;
        commentsList.appendChild(moreButtonItem);

        // 绑定输入框事件（如果之前的事件监听器被移除了）
        const submitBtn = document.getElementById('fictionCommentsSubmitBtn');
        const inputEl = document.getElementById('fictionCommentsInput');
        
        if (submitBtn && !submitBtn.hasListener) {
            submitBtn.addEventListener('click', () => this.submitUserComment());
            submitBtn.hasListener = true;
        }
        
        if (inputEl && !inputEl.hasListener) {
            inputEl.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    this.submitUserComment();
                }
            });
            inputEl.hasListener = true;
        }

        // 绑定"更多"按钮事件
        const moreBtn = document.getElementById('fictionCommentsMoreBtn');
        if (moreBtn && !moreBtn.hasListener) {
            moreBtn.addEventListener('click', () => {
                this.loadMoreComments();
            });
            moreBtn.hasListener = true;
        }

        // 渲染完成后检查滚动位置
        setTimeout(() => {
            this.checkScrollPosition();
        }, 100);
    },

    /**
     * 创建作者有话说元素
     */
    createAuthorMessageElement(authorData, avatar, id) {
        const li = document.createElement('li');
        li.className = 'fiction-author-message';
        li.dataset.commentId = id;

        let repliesHTML = '';
        if (authorData.replies && authorData.replies.length > 0) {
            repliesHTML = `
                <div class="fiction-comment-replies">
                    ${authorData.replies.map(reply => `
                        <div class="fiction-comment-reply">
                            <div class="fiction-reply-header">
                                <span class="fiction-reply-author">${reply.author}</span>
                                <span class="fiction-reply-to">回复</span>
                                <span class="fiction-reply-author">${reply.to || this.state.currentBook.author}</span>
                            </div>
                            <div class="fiction-reply-content">${reply.content}</div>
                            <div class="fiction-reply-time">${reply.time || this.getRandomTime()}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        li.innerHTML = `
            <div class="fiction-author-header">
                <div class="fiction-author-avatar" style="background-image: url('${avatar}'); background-size: cover; background-position: center;"></div>
                <div class="fiction-author-info">
                    <div>
                        <span class="fiction-author-name">${this.state.currentBook.author}</span>
                        <span class="fiction-author-tag">作者</span>
                    </div>
                    <div class="fiction-author-time">${this.getRandomTime()}</div>
                </div>
            </div>
            <div class="fiction-author-content">${authorData.content}</div>
            ${repliesHTML}
            <div class="fiction-comment-actions">
                <button class="fiction-comment-action-btn fiction-author-like-btn">
                    <span>赞</span>
                    <span>${authorData.likes || 0}</span>
                </button>
                <button class="fiction-comment-action-btn fiction-author-reply-btn" data-reply-to="author">
                    <span>回复</span>
                </button>
            </div>
        `;

        // 添加事件监听
        const replyBtn = li.querySelector('.fiction-author-reply-btn');
        if (replyBtn) {
            replyBtn.addEventListener('click', () => {
                this.showReplyInput(id, this.state.currentBook.author, 'author');
            });
        }

        return li;
    },

    /**
     * 创建评论元素
     */
    createCommentElement(comment) {
        const li = document.createElement('li');
        li.className = 'fiction-comment-item';
        li.dataset.commentId = comment.id;

        let repliesHTML = '';
        if (comment.replies && comment.replies.length > 0) {
            repliesHTML = `
                <div class="fiction-comment-replies">
                    ${comment.replies.map(reply => `
                        <div class="fiction-comment-reply">
                            <div class="fiction-reply-header">
                                <span class="fiction-reply-author">${reply.author}</span>
                                <span class="fiction-reply-to">回复</span>
                                <span class="fiction-reply-author">${reply.to}</span>
                            </div>
                            <div class="fiction-reply-content">${reply.content}</div>
                            <div class="fiction-reply-time">${reply.time || this.getRandomTime()}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        li.innerHTML = `
            <div class="fiction-comment-avatar" style="background-image: url('${comment.avatar}'); background-size: cover; background-position: center;"></div>
            <div class="fiction-comment-body">
                <div class="fiction-comment-header">
                    <span class="fiction-comment-name">${comment.nickname}</span>
                    <span class="fiction-comment-level">${comment.level}</span>
                    <span class="fiction-comment-time">${comment.time}</span>
                </div>
                <div class="fiction-comment-content">${comment.content}</div>
                ${repliesHTML}
                <div class="fiction-comment-actions">
                    <button class="fiction-comment-action-btn fiction-comment-like-btn">
                        <span>赞</span>
                        <span>${comment.likes || 0}</span>
                    </button>
                    <button class="fiction-comment-action-btn fiction-comment-reply-btn" data-reply-to="${comment.nickname}">
                        <span>回复</span>
                    </button>
                </div>
            </div>
        `;

        // 添加事件监听
        const replyBtn = li.querySelector('.fiction-comment-reply-btn');
        if (replyBtn) {
            replyBtn.addEventListener('click', () => {
                this.showReplyInput(comment.id, comment.nickname, 'user');
            });
        }

        return li;
    },

    /**
     * 显示回复输入框
     */
    showReplyInput(commentId, replyToName, replyType) {
        // 检查是否已有回复框
        const existingInput = document.querySelector(`[data-reply-input-id="${commentId}"]`);
        if (existingInput) {
            existingInput.remove();
            return;
        }

        const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (!commentEl) return;

        // 创建回复输入框
        const replyContainer = document.createElement('div');
        replyContainer.className = 'fiction-reply-input-container';
        replyContainer.dataset.replyInputId = commentId;
        replyContainer.innerHTML = `
            <div class="fiction-reply-input-box">
                <div class="fiction-reply-input-header">
                    <span class="fiction-reply-input-label">回复 <strong>${replyToName}</strong></span>
                </div>
                <textarea class="fiction-reply-textarea" placeholder="" rows="3"></textarea>
                <div class="fiction-reply-input-actions">
                    <button class="fiction-reply-submit-btn">发送</button>
                    <button class="fiction-reply-cancel-btn">取消</button>
                </div>
            </div>
        `;

        // 获取插入位置
        const actions = commentEl.querySelector('.fiction-comment-actions');
        if (actions) {
            actions.parentElement.insertBefore(replyContainer, actions.nextSibling);
        }

        // 绑定事件
        const submitBtn = replyContainer.querySelector('.fiction-reply-submit-btn');
        const cancelBtn = replyContainer.querySelector('.fiction-reply-cancel-btn');
        const textarea = replyContainer.querySelector('.fiction-reply-textarea');

        submitBtn.addEventListener('click', () => {
            const replyContent = textarea.value.trim();
            if (!replyContent) {
                this.showToast('请输入回复内容');
                return;
            }
            this.submitReply(commentId, replyToName, replyContent, replyType);
        });

        cancelBtn.addEventListener('click', () => {
            replyContainer.remove();
        });

        // 回车发送
        textarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                submitBtn.click();
            }
        });

        textarea.focus();
    },

    /**
     * 用户提交评论 - 立即显示，后台生成回复
     */
    async submitUserComment() {
        const inputEl = document.getElementById('fictionCommentsInput');
        const submitBtn = document.getElementById('fictionCommentsSubmitBtn');
        
        if (!inputEl) return;
        
        const userCommentContent = inputEl.value.trim();
        if (!userCommentContent) {
            this.showToast('请输入评论内容');
            return;
        }

        // 获取用户昵称
        const userName = window.AppState?.userInfo?.nickname || '匿名用户';
        
        // 立即创建用户评论元素，添加到评论列表
        const newComment = {
            id: 'user_' + Date.now(),
            nickname: userName,
            level: 'v0',
            content: userCommentContent,
            likes: 0,
            replies: [],
            avatar: this.getRandomAvatar(),
            time: '刚刚',
            type: 'user_new'  // 标记为新用户评论
        };

        // 将新评论添加到列表
        this.state.comments.unshift(newComment);
        
        // 重新渲染整个列表（这样会包含新评论和新的输入框）
        this.renderComments();

        // 清空输入框（因为renderComments会重新创建，所以重新获取）
        setTimeout(() => {
            const newInputEl = document.getElementById('fictionCommentsInput');
            if (newInputEl) {
                newInputEl.value = '';
                newInputEl.focus();
            }
        }, 0);
        
        // 禁用提交按钮并显示生成中的状态
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '生成回复中...';

        this.showToast('评论已发送！');

        // 后台异步生成多条回复和其他评论
        this.generateAutoReplies(newComment.id, userName, userCommentContent)
            .then(() => {
                // 重新获取按钮，因为DOM已经重新渲染
                const currentBtn = document.getElementById('fictionCommentsSubmitBtn');
                if (currentBtn) {
                    currentBtn.disabled = false;
                    currentBtn.textContent = originalText;
                }
                this.showToast('新的评论回复已生成！');
            })
            .catch(error => {
                console.error('生成回复失败:', error);
                // 重新获取按钮
                const currentBtn = document.getElementById('fictionCommentsSubmitBtn');
                if (currentBtn) {
                    currentBtn.disabled = false;
                    currentBtn.textContent = originalText;
                }
                this.showToast('生成回复时出错，请检查API配置');
            });
    },

    /**
     * 后台生成多条回复和其他用户评论（关键改进！）
     */
    async generateAutoReplies(commentId, userName, userCommentContent) {
        const prompt = `用户"${userName}"在小说《${this.state.currentBook.title}》的评论区发表了评论：
"${userCommentContent}"

现在需要生成多条回复和其他用户的评论。

要求：
1. 首先生成2-4条针对这条用户评论的回复（其他网友或作者）
2. 然后生成3-5条新的用户评论（模拟其他用户也在参与讨论）
3. 这些新评论要与用户的评论内容相关，形成讨论氛围
4. 每条回复/评论都要有真实感，字数50-150字

返回JSON格式（只返回JSON，不要其他文本）：
{
  "replies": [
    {
      "author": "回复者昵称",
      "to": "被回复者",
      "content": "回复内容"
    }
  ],
  "new_comments": [
    {
      "nickname": "用户昵称",
      "level": "v0-v3",
      "content": "评论内容",
      "likes": 点赞数
    }
  ]
}

小说简介：${this.state.currentBook.intro}`;

        try {
            const response = await this.callAIAPI(prompt);
            
            if (response.replies && Array.isArray(response.replies) && response.replies.length > 0) {
                // 添加回复到用户评论
                const userComment = this.state.comments.find(c => c.id === commentId);
                if (userComment) {
                    userComment.replies = response.replies.map(reply => ({
                        ...reply,
                        time: '刚刚'
                    }));
                    
                    // 重新渲染该评论
                    this.rerenderComment(commentId);
                }
            }

            // 添加新的用户评论到列表
            if (response.new_comments && Array.isArray(response.new_comments) && response.new_comments.length > 0) {
                const newComments = response.new_comments.map((comment, index) => ({
                    ...comment,
                    id: 'auto_' + Date.now() + '_' + index,
                    avatar: this.getRandomAvatar(),
                    time: '刚刚',
                    replies: [],
                    likes: comment.likes || Math.floor(Math.random() * 500) + 50
                }));

                // 将新评论添加到列表
                this.state.comments.splice(1, 0, ...newComments);

                // 重新渲染整个列表
                this.renderComments();
            }

            // 保存到缓存
            const bookId = this.state.currentBook.title + '_' + (this.state.currentBook.author || '');
            this.saveComments(this.state.comments, bookId);

        } catch (error) {
            console.error('❌ 生成回复和评论失败:', error);
            throw error;
        }
    },

    /**
     * 提交回复并调用API生成AI回复
     */
    async submitReply(commentId, replyToName, userReplyContent, replyType) {
        const replyContainer = document.querySelector(`[data-reply-input-id="${commentId}"]`);
        if (!replyContainer) return;

        // 显示加载状态
        const submitBtn = replyContainer.querySelector('.fiction-reply-submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '生成回复中...';
        submitBtn.disabled = true;

        try {
            // 获取用户昵称（从当前应用状态或生成）
            const userName = window.AppState?.userInfo?.nickname || '匿名用户';

            // 添加用户回复到评论
            const comment = this.state.comments.find(c => c.id === commentId);
            const targetData = comment.type === 'author' ? comment.data : comment;

            if (!targetData.replies) {
                targetData.replies = [];
            }

            // 添加用户回复
            targetData.replies.push({
                author: userName,
                to: replyToName,
                content: userReplyContent,
                isUserReply: true,
                avatar: this.getRandomAvatar(),
                time: '刚刚'
            });

            // 调用真实API生成AI回复
            const aiReplyContent = await this.generateReplyContent(userReplyContent, replyToName, replyType);
            
            targetData.replies.push({
                author: aiReplyContent.author,
                to: userName,
                content: aiReplyContent.content,
                isAIReply: true,
                avatar: this.getRandomAvatar(),
                time: '刚刚'
            });

            // 保存到缓存
            const bookId = this.state.currentBook.title + '_' + (this.state.currentBook.author || '');
            this.saveComments(this.state.comments, bookId);

            // 重新渲染
            this.rerenderComment(commentId);

            // 移除输入框
            replyContainer.remove();

            // 显示成功提示
            this.showToast('回复已发送！');
        } catch (error) {
            console.error('❌ 生成回复失败:', error);
            submitBtn.textContent = '发送失败，重试';
            submitBtn.disabled = false;
            this.showToast('生成回复失败，请检查API配置或网络连接');
        }
    },

    /**
     * 调用API生成回复内容
     */
    async generateReplyContent(userReplyContent, replyToName, replyType) {
        const prompt = `用户在${replyType === 'author' ? '作者' : replyToName}的评论下回复：\"${userReplyContent}\"\n\n现在小说《${this.state.currentBook.title}》的${replyType === 'author' ? '作者或其他网友' : '其他网友或作者'}需要回复这条评论。\n\n要求：\n1. 回复要与用户的评论内容相关\n2. 回复要真实自然，有互动感\n3. 回复长度50-150字\n4. 可以是作者、或其他网友的回复\n5. 每次生成不同的回复者和内容\n\n返回JSON格式（只返回JSON，不要其他文本）：\n{\n  "author": "回复者昵称",\n  "content": "回复内容"\n}\n\n小说简介：${this.state.currentBook.intro}`;

        try {
            // 调用真实API
            const response = await this.callAIAPI(prompt);
            if (typeof response === 'string') {
                return this.parseJSONResponse(response);
            }
            return response;
        } catch (error) {
            console.error('❌ API调用失败:', error);
            // 不使用默认回复，而是抛出错误让调用者处理
            throw error;
        }
    },

    /**
     * 重新渲染单个评论
     */
    rerenderComment(commentId) {
        const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (!commentEl) return;

        const comment = this.state.comments.find(c => c.id === commentId);
        if (!comment) return;

        let newEl;
        if (comment.type === 'author') {
            newEl = this.createAuthorMessageElement(comment.data, comment.avatar, comment.id);
        } else {
            newEl = this.createCommentElement(comment);
        }

        commentEl.replaceWith(newEl);

        // 重新渲染后检查滚动位置
        setTimeout(() => {
            this.checkScrollPosition();
        }, 100);
    },

    /**
     * 显示提示信息
     */
    showToast(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
            return;
        }

        const oldToast = document.querySelector('.fiction-comments-toast');
        if (oldToast) oldToast.remove();

        const toast = document.createElement('div');
        toast.className = 'fiction-comments-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    },

    /**
     * 加载更多评论（生成新评论覆盖旧评论）
     */
    async loadMoreComments() {
        const commentsList = document.getElementById('fictionCommentsList');
        
        // 显示加载状态
        if (commentsList) {
            commentsList.innerHTML = '<div class="fiction-comments-loading" id="fictionCommentsLoading">正在生成新评论...</div>';
        }

        // 清除旧缓存
        this.clearStoredComments();
        
        // 重新生成评论
        try {
            await this.generateAllComments();
            
            // 加载完成后滚动到顶部
            if (commentsList) {
                commentsList.scrollTop = 0;
            }
            
            this.showToast('新评论已加载');
        } catch (error) {
            console.error('加载更多评论失败:', error);
            this.showToast('加载失败，请重试');
        }
    },

    /**
     * 显示提示消息
     */
    showToast(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
            return;
        }

        // 移除旧的toast
        const oldToast = document.querySelector('.fiction-comments-toast');
        if (oldToast) {
            oldToast.remove();
        }

        // 创建新toast
        const toast = document.createElement('div');
        toast.className = 'fiction-comments-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // 3秒后移除
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    },

    /**
     * 关闭评论区
     */
    closeComments() {
        const container = document.getElementById('fictionCommentsContainer');
        if (container) {
            container.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                container.remove();
            }, 300);
        }
    }
};

// 暴露到全局作用域
window.fictionCommentsManager = fictionCommentsManager;
console.log('小说评论区已加载');
