
        // 应用状态
        const AppState = {
            currentTab: 'msg-page',
            currentChat: null,
            friends: [],
            groups: [],
            friendGroups: [
                { id: 'group_default', name: '默认分组', memberIds: [] }
            ], // 好友分组
            messages: {},
            conversations: [],
            emojis: [], // 表情包库
            emojiGroups: [
                { id: 'group_default', name: '默认', createdAt: new Date().toISOString() }
            ], // 表情包分组
            worldbooks: [], // 世界书库
            searchQuery: '', // 消息页面搜索词
            selectedMessages: [], // 多选消息ID列表
            isSelectMode: false, // 是否处于多选模式
            apiSettings: {
                endpoint: '',
                apiKey: '',
                models: [],
                selectedModel: '',
                aiTimeAware: false,
                contextLines: 200, // 上下文条数，默认200条
                prompts: [],
                selectedPromptId: '',
                defaultPrompt: 'null',
                summaryEnabled: false, // 是否启用自动总结
                summaryInterval: 50, // 每多少条消息后自动总结
                summaryKeepLatest: 10, // 总结后保留最新的消息数
                // 副API设置
                secondaryEndpoint: '', // 副API端点
                secondaryApiKey: '', // 副API密钥
                secondaryModels: [], // 副API的可用模型列表
                secondarySelectedModel: '', // 副API选定的模型
                // 副API功能提示词
                secondaryPrompts: {
                    translateChinese: '你是一个翻译助手。将用户提供的非中文文本翻译成简体中文。只返回翻译结果，不要有其他内容。',
                    translateEnglish: '你是一个翻译助手。将用户提供的中文文本翻译成英文。只返回翻译结果，不要有其他内容。',
                    summarize: '你是一个专业的对话总结员。请为下面的对话内容生成一份简洁准确的总结。总结应该：1. 抓住对话的核心内容和主题；2. 保留重要信息和决策；3. 简洁明了，长度适中（200-300字）；4. 用简体中文或原语言撰写。'
                }
            },
            user: {
                name: '薯片机用户',
                avatar: '', // 侧边栏头像
                signature: '这个人很懒，什么都没写~',
                bgImage: '',
                coins: 0, // 虚拟币余额
                theme: 'light' // 主题: light(黑白灰简约), pink(白粉色系), dark(夜间模式)
            },
            // 备注：对话级别的用户头像存储在conversation对象的userAvatar字段中
            dynamicFuncs: {
    moments: true,        // 朋友圈
    forum: true,          // 论坛
    reading: true,        // 阅读
    calendar: true,       // 日历
    weather: true,        // 天气
    shopping: true,       // 购物
    game: true,           // 游戏中心
    tacit: true,          // 默契大调整
    spiritGalaxy: true,   // 心灵星系
    ideaLibrary: true,    // 灵感库
    thirdParty: true      // 第三方
},
            collections: [], // 收藏的消息 [{ id, convId, messageId, messageContent, senderName, senderAvatar, collectedAt, originalMessageTime }]
            walletHistory: [], // 钱包充值记录
            importedCards: [],
            conversationStates: {},  // 运行时状态：{ convId: { isApiCalling, isTyping } }
            notification: {
                current: null,  // 当前通知数据 { convId, name, avatar, message, time }
                autoHideTimer: null,
                hideDelay: 5000  // 5秒后自动隐藏
            }
        };

        
        // 获取conversation的运行时状态
        function getConversationState(convId) {
            if (!AppState.conversationStates[convId]) {
                AppState.conversationStates[convId] = {
                    isApiCalling: false,
                    isTyping: false
                };
            }
            return AppState.conversationStates[convId];
        }

        // 初始化
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                await loadFromStorage();
                applyInitialTheme(); // 应用保存的主题
                initEventListeners();
                initNotificationSystem();
                initApiSettingsUI();
                initPromptUI();
                initWorldbookUI();
                renderUI();
                updateDynamicFuncList();
                setupEmojiLibraryObserver();
                
                // 启动数据实时同步监听
                setupDataSyncListener();
                
                console.log('应用初始化成功');
            } catch (error) {
                console.error('应用初始化错误:', error);
                alert('应用初始化失败: ' + error.message);
            }
        });
        
        // 页面卸载前保存所有数据
        window.addEventListener('beforeunload', function() {
            console.log('页面即将卸载，保存所有数据...');
            saveToStorage();
        });
        
        // 页面隐藏时也保存一次（处理标签页被切换的情况）
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                console.log('页面隐藏，保存所有数据...');
                saveToStorage();
            }
        });
        
        // 全局错误处理
        window.addEventListener('error', function(e) {
            console.error('全局错误:', e.error);
        });

        // IndexDB 数据库初始化
        let db = null;
        const DB_NAME = 'shupianji_db';
        const DB_VERSION = 1;
        const STORE_NAME = 'app_state';

        function initIndexDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onerror = () => {
                    console.error('IndexDB打开失败，降级到localStorage');
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    db = request.result;
                    resolve(db);
                };
                
                request.onupgradeneeded = (event) => {
                    const database = event.target.result;
                    if (!database.objectStoreNames.contains(STORE_NAME)) {
                        database.createObjectStore(STORE_NAME);
                    }
                };
            });
        }

        // 从IndexDB或localStorage加载数据
        async function loadFromStorage() {
            try {
                let parsed = null;
                
                // 尝试从IndexDB加载
                try {
                    if (!db) await initIndexDB();
                    const transaction = db.transaction(STORE_NAME, 'readonly');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.get('shupianjAppState');
                    
                    await new Promise((resolve, reject) => {
                        request.onsuccess = () => {
                            if (request.result) {
                                parsed = request.result.data;
                                console.log('从IndexDB加载数据成功');
                            }
                            resolve();
                        };
                        request.onerror = () => reject(request.error);
                    });
                } catch (e) {
                    console.warn('IndexDB加载失败，尝试localStorage:', e);
                }
                
                // 如果IndexDB加载失败，尝试localStorage并迁移
                if (!parsed) {
                    const savedState = localStorage.getItem('shupianjAppState');
                    if (savedState) {
                        parsed = JSON.parse(savedState);
                        console.log('从localStorage加载数据');
                        // 异步迁移到IndexDB
                        setTimeout(() => {
                            saveToIndexDB(parsed).catch(e => console.warn('迁移到IndexDB失败:', e));
                        }, 1000);
                    }
                }
                
                if (parsed) {
                    delete parsed.conversationStates;
                    
                    // 深度合并用户对象
                    if (parsed.user) {
                        AppState.user = {
                            name: parsed.user.hasOwnProperty('name') ? parsed.user.name : AppState.user.name,
                            avatar: parsed.user.hasOwnProperty('avatar') ? parsed.user.avatar : AppState.user.avatar,
                            signature: parsed.user.hasOwnProperty('signature') ? parsed.user.signature : AppState.user.signature,
                            bgImage: parsed.user.hasOwnProperty('bgImage') ? parsed.user.bgImage : AppState.user.bgImage,
                            coins: parsed.user.hasOwnProperty('coins') ? parsed.user.coins : AppState.user.coins,
                            theme: parsed.user.hasOwnProperty('theme') ? parsed.user.theme : AppState.user.theme,
                            personality: parsed.user.hasOwnProperty('personality') ? parsed.user.personality : ''
                        };
                        console.log('已恢复用户信息 - 头像:', AppState.user.avatar, '背景图:', AppState.user.bgImage);
                    }
                    
                    // 合并其他属性
                    for (let key in parsed) {
                        if (key !== 'user' && key !== 'conversationStates') {
                            AppState[key] = parsed[key];
                        }
                    }
                    
                    // 【新增】为所有对话初始化 mindStates 数组（如果不存在）
                    if (AppState.conversations && Array.isArray(AppState.conversations)) {
                        AppState.conversations.forEach(conv => {
                            if (!conv.mindStates) {
                                conv.mindStates = [];
                            }
                        });
                    }
                    
                    AppState.conversationStates = {};
                    console.log('加载数据成功，用户背景图:', AppState.user.bgImage);
                } else {
                    console.log('没有保存的数据');
                }
                
                // ===== 初始化示例数据 =====
                // 如果friends为空，添加示例好友
                if (!AppState.friends || AppState.friends.length === 0) {
                    AppState.friends = [
                        { id: 'friend_1', name: '小红', avatar: 'https://picsum.photos/id/10/80/80', friendGroupId: 'group_default' },
                        { id: 'friend_2', name: '张三', avatar: 'https://picsum.photos/id/11/80/80', friendGroupId: 'group_default' },
                        { id: 'friend_3', name: '李四', avatar: 'https://picsum.photos/id/12/80/80', friendGroupId: 'group_default' },
                        { id: 'friend_4', name: '王五', avatar: 'https://picsum.photos/id/13/80/80', friendGroupId: 'group_default' },
                        { id: 'friend_5', name: '赵六', avatar: 'https://picsum.photos/id/14/80/80', friendGroupId: 'group_default' }
                    ];
                    console.log('已初始化示例好友数据');
                }
                
                // 如果friendGroups只有默认分组，添加更多分组
                if (!AppState.friendGroups || AppState.friendGroups.length <= 1) {
                    AppState.friendGroups = [
                        { id: 'group_default', name: '默认分组', memberIds: [] },
                        { id: 'group_close', name: '亲密好友', memberIds: ['friend_1', 'friend_2'] },
                        { id: 'group_work', name: '工作同事', memberIds: ['friend_3', 'friend_4'] },
                        { id: 'group_family', name: '家人', memberIds: ['friend_5'] }
                    ];
                    console.log('已初始化示例好友分组');
                }
            } catch (e) {
                console.error('加载数据失败:', e);
            }
        }

        function saveToIndexDB(state) {
            return new Promise(async (resolve, reject) => {
                try {
                    if (!db) await initIndexDB();
                    
                    const stateToDump = Object.assign({}, state || AppState);
                    delete stateToDump.conversationStates;
                    
                    const transaction = db.transaction(STORE_NAME, 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.put({ data: stateToDump }, 'shupianjAppState');
                    
                    request.onsuccess = () => {
                        console.log('数据已保存到IndexDB');
                        resolve();
                    };
                    request.onerror = () => {
                        console.error('IndexDB保存失败:', request.error);
                        reject(request.error);
                    };
                } catch (e) {
                    reject(e);
                }
            });
        }

        // 保存到本地存储（使用IndexDB为主，localStorage为备份）
        async function saveToStorage() {
            try {
                const stateToDump = Object.assign({}, AppState);
                delete stateToDump.conversationStates;
                
                if (!stateToDump.user) {
                    stateToDump.user = AppState.user;
                }
                
                // 优先保存到IndexDB
                try {
                    await saveToIndexDB(stateToDump);
                } catch (e) {
                    console.warn('IndexDB保存失败，使用localStorage备份:', e);
                    const jsonString = JSON.stringify(stateToDump);
                    localStorage.setItem('shupianjAppState', jsonString);
                }
                
                // 同时保存到cachedAppState供朋友圈模块使用
                try {
                    const cachedState = {
                        user: AppState.user ? {
                            name: AppState.user.name,
                            avatar: AppState.user.avatar,
                            signature: AppState.user.signature,
                            bgImage: AppState.user.bgImage,
                            visitorCount: AppState.user.visitorCount
                        } : {}
                    };
                    localStorage.setItem('cachedAppState', JSON.stringify(cachedState));
                } catch (e) {
                    console.warn('保存cachedAppState失败:', e);
                }
                
                console.log('数据保存成功');
            } catch (e) {
                console.error('保存数据失败:', e);
                alert('保存失败: ' + e.message);
            }
        }

        // 初始化事件监听
        function initEventListeners() {
            // 用户信息点击 - 打开侧边栏
            document.getElementById('user-info').addEventListener('click', function() {
                document.getElementById('side-menu').classList.add('open');
                document.getElementById('mask').classList.add('show');
            });

            // 遮罩层点击
            document.getElementById('mask').addEventListener('click', function() {
                closeSideMenu();
                closeAddPopup();
            });

            // 添加按钮
            document.getElementById('add-btn').addEventListener('click', function(e) {
                e.stopPropagation();
                toggleAddPopup();
            });

            // 点击其他地方关闭弹窗
            document.addEventListener('click', function(e) {
                if (!e.target.closest('#add-popup') && !e.target.closest('#add-btn')) {
                    closeAddPopup();
                }
            });

            // 消息页面搜索
            const searchInput = document.getElementById('search-input-msg');
            if (searchInput) {
                searchInput.addEventListener('input', function(e) {
                    AppState.searchQuery = e.target.value.trim();
                    renderConversations();
                });
            }

            // 好友页面搜索
            const friendSearchInput = document.getElementById('search-input-friend');
            if (friendSearchInput) {
                friendSearchInput.addEventListener('input', function(e) {
                    const query = e.target.value.trim().toLowerCase();
                    const friendItems = document.querySelectorAll('.friend-item');
                    friendItems.forEach(item => {
                        const name = item.querySelector('.friend-name')?.textContent || '';
                        if (query === '' || name.toLowerCase().includes(query)) {
                            item.style.display = '';
                        } else {
                            item.style.display = 'none';
                        }
                    });
                });
            }

            // 底部标签栏
            document.querySelectorAll('.tab-item').forEach(function(tab) {
                tab.addEventListener('click', function() {
                    switchTab(this.dataset.tab);
                });
            });

            // 好友分组折叠
            document.querySelectorAll('.group-header').forEach(function(header) {
                header.addEventListener('click', function() {
                    const group = this.dataset.group;
                    const list = document.querySelector(`.friend-list[data-group="${group}"]`);
                    this.classList.toggle('collapsed');
                    list.classList.toggle('show');
                });
            });

            // 动态页面功能项
            document.querySelectorAll('.func-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    const pageId = this.dataset.page;
                    if (pageId) {
                        openSubPage(pageId);
                    }
                });
            });

            // 子页面返回按钮
            document.querySelectorAll('.back-btn[data-back]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    const pageId = this.dataset.back;
                    closeSubPage(pageId);
                });
            });

            // 侧边栏菜单项
            document.querySelectorAll('.menu-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    const func = this.dataset.func;
                    handleMenuClick(func);
                });
            });

            // 个性名片点击 - 直接跳转编辑页面
            document.getElementById('card-info').addEventListener('click', function() {
                closeSideMenu();
                setTimeout(function() {
                    openCardEditPage();
                }, 300);
            });

            // 添加好友相关
            document.getElementById('add-friend-btn').addEventListener('click', function() {
                closeAddPopup();
                openAddFriendPage();
            });

            document.getElementById('add-friend-back-btn').addEventListener('click', function() {
                closeAddFriendPage();
            });

            document.getElementById('add-friend-cancel').addEventListener('click', function() {
                closeAddFriendPage();
            });

            document.getElementById('add-friend-submit').addEventListener('click', function() {
                submitAddFriend();
            });

            // 创建群聊相关
            document.getElementById('create-group-btn').addEventListener('click', function() {
                closeAddPopup();
                openCreateGroupPage();
            });

            document.getElementById('create-group-back-btn').addEventListener('click', function() {
                closeCreateGroupPage();
            });

            document.getElementById('create-group-cancel').addEventListener('click', function() {
                closeCreateGroupPage();
            });

            document.getElementById('create-group-submit').addEventListener('click', function() {
                submitCreateGroup();
            });

            // 导入角色卡相关
            document.getElementById('import-card-btn').addEventListener('click', function() {
                closeAddPopup();
                openImportCardPage();
            });

            document.getElementById('import-card-back-btn').addEventListener('click', function() {
                closeImportCardPage();
            });

            document.getElementById('import-file-btn').addEventListener('click', function() {
                document.getElementById('import-file-input').click();
            });

            document.getElementById('import-file-input').addEventListener('change', function(e) {
                handleFileImport(e.target.files);
            });

            document.getElementById('import-image-btn').addEventListener('click', function() {
                document.getElementById('import-image-input').click();
            });

            document.getElementById('import-image-input').addEventListener('change', function(e) {
                handleImageImport(e.target.files);
            });

            document.getElementById('import-all-btn').addEventListener('click', function() {
                importAllCards();
            });

            // 聊天页面
            document.getElementById('chat-back-btn').addEventListener('click', function() {
                closeChatPage();
            });

            // 聊天页面 - 角色设置按钮
            document.addEventListener('click', function(e) {
                // 检查是否点击了chat-more-dots
                const chatMoreDots = e.target.closest('.chat-more-dots') || e.target.closest('.chat-more');
                if (chatMoreDots && AppState.currentChat) {
                    openChatMoreMenu(AppState.currentChat);
                }
            }, true);

            document.getElementById('chat-send-btn').addEventListener('click', function() {
                sendMessage();
            });

            // 引用消息取消按钮
            const quoteCancelBtn = document.getElementById('quote-cancel-btn');
            if (quoteCancelBtn) {
                quoteCancelBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const quoteContainer = document.getElementById('quote-message-bar-container');
                    const chatInput = document.getElementById('chat-input');
                    if (quoteContainer) quoteContainer.style.display = 'none';
                    if (chatInput) delete chatInput.dataset.replyToId;
                });
            }

            const chatInputElement = document.getElementById('chat-input');
            
            chatInputElement.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    // 检测vivo浏览器 - 如果是vivo则使用异步调用以优化响应速度
                    const isVivoBrowser = /vivo|VIVO|V1989A|V2040|V2007/i.test(navigator.userAgent);
                    if (isVivoBrowser) {
                        setTimeout(sendMessage, 0);
                    } else {
                        sendMessage();
                    }
                }
            });

            // 自动调整输入框高度
            // 检测是否为vivo浏览器
            const isVivoBrowser = /vivo|VIVO|V1989A|V2040|V2007/i.test(navigator.userAgent);
            
            chatInputElement.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 100) + 'px';
            });
            
            // vivo浏览器优化：减少输入延迟
            if (isVivoBrowser) {
                // 添加vivo特定优化
                chatInputElement.style.transform = 'translateZ(0)'; // 启用GPU加速
                chatInputElement.style.willChange = 'height';
                chatInputElement.style.backfaceVisibility = 'hidden';
                chatInputElement.style.transition = 'none';
                
                // 优化input事件处理
                let inputTimeout;
                chatInputElement.addEventListener('compositionstart', (e) => {
                    // 中文输入法开始，暂停高度调整
                    clearTimeout(inputTimeout);
                });
                
                chatInputElement.addEventListener('compositionend', (e) => {
                    // 中文输入法结束后进行高度调整
                    inputTimeout = setTimeout(() => {
                        const event = new Event('input', { bubbles: true });
                        chatInputElement.dispatchEvent(event);
                    }, 0);
                });
            }

            // 个性名片编辑页面
            document.getElementById('card-edit-back-btn').addEventListener('click', function() {
                closeCardEditPage();
            });

            document.getElementById('edit-avatar-btn').addEventListener('click', function() {
                openImagePicker('avatar');
            });

            document.getElementById('edit-bg-btn').addEventListener('click', function() {
                openImagePicker('bg');
            });

            document.getElementById('edit-name-btn').addEventListener('click', function() {
                editUserName();
            });

            document.getElementById('edit-signature-btn').addEventListener('click', function() {
                editUserSignature();
            });

            // 图片选择弹窗
            document.getElementById('picker-cancel').addEventListener('click', function() {
                closeImagePicker();
            });

            document.getElementById('picker-local').addEventListener('click', function() {
                document.getElementById('picker-file-input').click();
            });

            document.getElementById('picker-file-input').addEventListener('change', function(e) {
                handlePickerFileSelect(e.target.files[0]);
            });

            document.getElementById('picker-url-toggle').addEventListener('click', function() {
                document.getElementById('picker-url-input').classList.toggle('hidden');
                document.getElementById('picker-url-confirm').classList.toggle('hidden');
            });

            document.getElementById('picker-url-confirm').addEventListener('click', function() {
                handlePickerUrlConfirm();
            });

            document.getElementById('image-picker-modal').addEventListener('click', function(e) {
                if (e.target === this) {
                    closeImagePicker();
                }
            });

            // 更多功能设置
            document.getElementById('more-func-btn').addEventListener('click', function() {
                openMoreSettings();
            });

            document.getElementById('more-settings-confirm').addEventListener('click', function() {
                closeMoreSettings();
            });

            document.getElementById('more-settings-modal').addEventListener('click', function(e) {
                if (e.target === this) {
                    closeMoreSettings();
                }
            });

            // 开关切换
            document.querySelectorAll('.toggle-switch').forEach(function(toggle) {
                toggle.addEventListener('click', function() {
                    const funcId = this.dataset.funcId;
                    this.classList.toggle('active');
                    AppState.dynamicFuncs[funcId] = this.classList.contains('active');
                    saveToStorage();
                });
            });

            // API 设置页面按钮
            const pullBtn = document.getElementById('pull-models-btn');
            if (pullBtn) {
                pullBtn.addEventListener('click', function() { fetchModels(); });
            }

            const saveBtn = document.getElementById('save-settings-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', function() { saveApiSettingsFromUI(); });
            }

            const modelsSelect = document.getElementById('models-select');
            if (modelsSelect) {
                modelsSelect.addEventListener('change', function() {
                    AppState.apiSettings.selectedModel = this.value;
                    // 自动保存模型选择
                    saveToStorage();
                });
            }
            const aiToggle = document.getElementById('ai-time-aware');
            if (aiToggle) {
                aiToggle.addEventListener('change', function() {
                    AppState.apiSettings.aiTimeAware = this.checked;
                });
            }

            // 双击用户头像触发 API 调用 - 添加防抖机制防止多次调用
            let apiCallInProgress = false;
            const topAvatar = document.getElementById('user-avatar-display');
            if (topAvatar) {
                // 桌面端 dblclick 事件
                topAvatar.addEventListener('dblclick', function(e) {
                    e.preventDefault();
                    if (!apiCallInProgress) {
                        apiCallInProgress = true;
                        const result = handleDoubleClickAvatar();
                        // 等待操作完成后重置防抖标志
                        if (result && typeof result.finally === 'function') {
                            result.finally(() => { apiCallInProgress = false; });
                        } else {
                            // 如果不是Promise，延迟重置
                            setTimeout(() => { apiCallInProgress = false; }, 500);
                        }
                    }
                });
                
                // 手机端双击检测 - 使用 tap 计数器
                let tapCount = 0;
                let tapTimer = null;
                topAvatar.addEventListener('touchend', function(e) {
                    tapCount++;
                    if (tapCount === 1) {
                        tapTimer = setTimeout(() => {
                            tapCount = 0;
                        }, 300);
                    } else if (tapCount === 2) {
                        clearTimeout(tapTimer);
                        e.preventDefault();
                        if (!apiCallInProgress) {
                            apiCallInProgress = true;
                            const result = handleDoubleClickAvatar();
                            if (result && typeof result.finally === 'function') {
                                result.finally(() => { apiCallInProgress = false; });
                            } else {
                                setTimeout(() => { apiCallInProgress = false; }, 500);
                            }
                        }
                        tapCount = 0;
                    }
                }, { passive: false });
            }

            // 聊天区头像双击（事件委托） - 独立防抖
            let chatApiCallInProgress = false;
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                // 桌面端 dblclick 事件
                chatMessages.addEventListener('dblclick', function(e) {
                    const av = e.target.closest('.chat-avatar');
                    if (av) {
                        e.preventDefault();
                        if (!chatApiCallInProgress) {
                            chatApiCallInProgress = true;
                            const result = handleDoubleClickAvatar();
                            if (result && typeof result.finally === 'function') {
                                result.finally(() => { chatApiCallInProgress = false; });
                            } else {
                                setTimeout(() => { chatApiCallInProgress = false; }, 500);
                            }
                        }
                    }
                });
                
                // 手机端双击检测 - 使用事件冒泡到 chatMessages
                let avatarTapData = new Map();
                chatMessages.addEventListener('touchend', function(e) {
                    const av = e.target.closest('.chat-avatar');
                    if (av) {
                        const id = av.dataset.id || Math.random().toString(36);
                        let data = avatarTapData.get(id);
                        
                        if (!data) {
                            data = { count: 0, timer: null };
                            avatarTapData.set(id, data);
                        }
                        
                        data.count++;
                        if (data.count === 1) {
                            data.timer = setTimeout(() => {
                                data.count = 0;
                            }, 300);
                        } else if (data.count === 2) {
                            clearTimeout(data.timer);
                            e.preventDefault();
                            if (!chatApiCallInProgress) {
                                chatApiCallInProgress = true;
                                const result = handleDoubleClickAvatar();
                                if (result && typeof result.finally === 'function') {
                                    result.finally(() => { chatApiCallInProgress = false; });
                                } else {
                                    setTimeout(() => { chatApiCallInProgress = false; }, 500);
                                }
                            }
                            data.count = 0;
                        }
                    }
                }, { passive: false });
            }

            // 双击头像处理函数 - 触发AI回复，心声会自动从主API响应中提取
            window.handleDoubleClickAvatar = async function() {
                if (!AppState.currentChat) {
                    showToast('请先打开或创建一个聊天会话');
                    return;
                }

                // 触发主API调用（AI会在回复末尾返回心声数据）
                console.log('========== 🎯 【新架构】双击头像：触发主API调用，心声将在响应中自动提取 ==========');
                const apiResult = callApiWithConversation();
                
                // 注意：在新架构中，心声数据已经在主API响应中由 appendSingleAssistantMessage 自动提取
                // 副API现在用于其他功能（翻译、总结等），不再用于心声生成
                if (apiResult && typeof apiResult.then === 'function') {
                    apiResult.then(() => {
                        console.log('========== ✅ 主API调用完成，心声数据已自动提取 ==========');
                    }).catch(err => {
                        console.error('❌ 主API错误:', err);
                    });
                }
                
                return apiResult;
            };

            // 聊天工具栏按钮
            const btnRetry = document.getElementById('btn-retry');
            if (btnRetry) btnRetry.addEventListener('click', function() { retryDeleteLastAiReply(); });

            const btnEmoji = document.getElementById('btn-emoji');
            if (btnEmoji) btnEmoji.addEventListener('click', function() {
                toggleEmojiLibrary();
            });

            // 注意：btn-voice-msg 和 btn-location 的事件处理器由各自的模块负责
            // 不需要在这里重复绑定事件

            const btnCamera = document.getElementById('btn-camera');
            const btnPhoto = document.getElementById('btn-photo');
            const toolbarFile = document.getElementById('toolbar-file-input');
            // 相机按钮 - 有描述对话框
            if (btnCamera && toolbarFile) {
                btnCamera.addEventListener('click', function() {
                    toolbarFile.dataset.mode = 'with-description';
                    toolbarFile.click();
                });
            }
            // 照片按钮 - 无描述对话框，直接发送
            if (btnPhoto && toolbarFile) {
                btnPhoto.addEventListener('click', function() {
                    toolbarFile.dataset.mode = 'no-description';
                    toolbarFile.click();
                });
            }
            if (toolbarFile) {
                toolbarFile.addEventListener('change', function(e) {
                    handleToolbarFileSelect(e.target.files, this.dataset.mode || 'with-description');
                });
            }

            const btnVoice = document.getElementById('btn-voicecall');
            if (btnVoice) btnVoice.addEventListener('click', function() { showToast('语音通话功能尚未实现'); });

            const btnVideo = document.getElementById('btn-videocall');
            if (btnVideo) btnVideo.addEventListener('click', function() { showToast('视频通话功能尚未实现'); });

            // 线下功能按钮
            const btnOffline = document.getElementById('btn-offline');
            if (btnOffline) btnOffline.addEventListener('click', function() { showToast('线下功能尚未实现'); });

            const btnTakeout = document.getElementById('btn-takeout');
            if (btnTakeout) btnTakeout.addEventListener('click', function() { showToast('交易功能尚未实现'); });

            const btnListen = document.getElementById('btn-listen');
            if (btnListen) btnListen.addEventListener('click', function() { showToast('一起听功能尚未实现'); });

            const btnPhone = document.getElementById('btn-phone');
            if (btnPhone) btnPhone.addEventListener('click', function() { showToast('查手机功能尚未实现'); });

            // 更多按钮
            const btnMore = document.getElementById('btn-more');
            const morePanel = document.getElementById('toolbar-more-panel');
            if (btnMore && morePanel) {
                btnMore.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const isShown = morePanel.classList.contains('show');
                    if (isShown) {
                        morePanel.classList.remove('show');
                    } else {
                        morePanel.classList.add('show');
                    }
                });
            }

            // 更多面板中的功能按钮
            const moreDiary = document.getElementById('more-diary');
            if (moreDiary) moreDiary.addEventListener('click', function() { 
                showToast('日记功能尚未实现'); 
                if (morePanel) morePanel.classList.remove('show');
            });

            const moreMemo = document.getElementById('more-memo');
            if (moreMemo) moreMemo.addEventListener('click', function() { 
                showToast('备忘录功能尚未实现'); 
                if (morePanel) morePanel.classList.remove('show');
            });

            const btnFrog = document.getElementById('more-frog');
            if (btnFrog) btnFrog.addEventListener('click', function() { 
                showToast('旅行青蛙功能尚未实现'); 
                if (morePanel) morePanel.classList.remove('show');
            });

            const btnAnonymous = document.getElementById('more-anonymous');
            if (btnAnonymous) btnAnonymous.addEventListener('click', function() { 
                showToast('匿名提问功能尚未实现'); 
                if (morePanel) morePanel.classList.remove('show');
            });

            // 心声按钮
            const mindBtn = document.getElementById('chat-mind-btn');
            if (mindBtn) {
                mindBtn.addEventListener('click', function() {
                    if (AppState.currentChat) {
                        openCharacterMindState(AppState.currentChat);
                    }
                });
            }

            // 表情库按钮
            const btnEmojiAdd = document.getElementById('emoji-add-btn');
            if (btnEmojiAdd) btnEmojiAdd.addEventListener('click', function() {
                document.getElementById('emoji-upload-input').click();
            });

            const btnEmojiAddUrl = document.getElementById('emoji-add-url-btn');
            if (btnEmojiAddUrl) btnEmojiAddUrl.addEventListener('click', function() {
                showUrlImportDialog('chat');
            });

            const btnEmojiDel = document.getElementById('emoji-del-btn');
            const btnEmojiTrash = document.getElementById('emoji-trash-btn');
            
            if (btnEmojiDel) {
                btnEmojiDel.addEventListener('click', function() {
                    const grid = document.getElementById('emoji-grid');
                    const mode = this.dataset.mode || 'normal'; // normal <-> selecting
                    
                    if (mode === 'normal') {
                        // 进入多选模式
                        this.dataset.mode = 'selecting';
                        this.style.background = '#f0f0f0';
                        grid.querySelectorAll('.emoji-item').forEach(item => {
                            item.classList.add('selecting');
                        });
                        // 显示垃圾桶按钮
                        if (btnEmojiTrash) btnEmojiTrash.style.display = 'flex';
                    } else if (mode === 'selecting') {
                        // 退出多选模式
                        this.dataset.mode = 'normal';
                        this.style.background = '';
                        grid.querySelectorAll('.emoji-item').forEach(item => {
                            item.classList.remove('selecting');
                            item.classList.remove('selected');
                        });
                        // 隐藏垃圾桶按钮
                        if (btnEmojiTrash) btnEmojiTrash.style.display = 'none';
                    }
                });
            }
            
            // 垃圾桶按钮 - 删除选中
            if (btnEmojiTrash) {
                btnEmojiTrash.addEventListener('click', function() {
                    const grid = document.getElementById('emoji-grid');
                    const selectedItems = grid.querySelectorAll('.emoji-item.selected');
                    
                    if (selectedItems.length === 0) {
                        showToast('请先选择要删除的表情包');
                        return;
                    }
                    
                    if (!confirm(`确定要删除选中的 ${selectedItems.length} 个表情包吗？`)) return;
                    
                    selectedItems.forEach(item => {
                        const emojiId = item.dataset.id;
                        AppState.emojis = AppState.emojis.filter(e => e.id !== emojiId);
                    });
                    
                    saveToStorage();
                    renderEmojiLibrary();
                    renderEmojiGroups('chat');
                });
            }

            // 分组管理按钮
            const btnEmojiGroup = document.getElementById('emoji-group-btn');
            if (btnEmojiGroup) {
                btnEmojiGroup.addEventListener('click', function() {
                    openEmojiGroupManager();
                });
            }

            const emojiUploadInput = document.getElementById('emoji-upload-input');
            if (emojiUploadInput) emojiUploadInput.addEventListener('change', function(e) {
                handleEmojiImport(e.target.files, 'chat');
                this.value = '';
            });

            // 点击emoji库外部关闭
            document.addEventListener('click', function(e) {
                const emojiLib = document.getElementById('emoji-library');
                const btnEmoji = document.getElementById('btn-emoji');
                const inputArea = document.querySelector('.chat-input-area');
                const toolbar = document.getElementById('chat-toolbar');
                const morePanel = document.getElementById('toolbar-more-panel');
                const btnMore = document.getElementById('btn-more');
                
                if (emojiLib && emojiLib.classList.contains('show')) {
                    if (!e.target.closest('#emoji-library') && !e.target.closest('#btn-emoji')) {
                        // 隐藏表情库
                        emojiLib.classList.remove('show');
                        // 恢复输入框和工具栏到初始位置
                        if (inputArea) inputArea.style.transform = 'translateY(0)';
                        if (toolbar) toolbar.style.transform = 'translateY(0)';
                    }
                }
                
                // 点击更多面板外部关闭
                if (morePanel && morePanel.classList.contains('show')) {
                    if (!e.target.closest('#toolbar-more-panel') && !e.target.closest('#btn-more')) {
                        morePanel.classList.remove('show');
                    }
                }
            });

            // API 密钥显示/隐藏切换
            const apiKeyToggle = document.getElementById('api-key-toggle');
            const apiKeyInput = document.getElementById('api-key');
            if (apiKeyToggle && apiKeyInput) {
                apiKeyToggle.addEventListener('click', function() {
                    if (apiKeyInput.type === 'password') {
                        apiKeyInput.type = 'text';
                        apiKeyToggle.textContent = '隐藏';
                    } else {
                        apiKeyInput.type = 'password';
                        apiKeyToggle.textContent = '显示';
                    }
                });
            }

            // 副API模型选择器 change 事件监听
            const secondaryModelsSelect = document.getElementById('secondary-models-select');
            if (secondaryModelsSelect) {
                secondaryModelsSelect.addEventListener('change', function() {
                    AppState.apiSettings.secondarySelectedModel = this.value;
                    const displayEl = document.getElementById('secondary-selected-model-display');
                    if (displayEl) displayEl.textContent = this.value;
                    // 自动保存模型选择
                    saveToStorage();
                });
            }
        }

        // 更新用户显示信息
        function updateUserDisplay() {
            const user = AppState.user;
            
            // 顶部导航
            document.querySelector('.user-name').textContent = user.name;
            const avatarDisplay = document.getElementById('user-avatar-display');
            if (user.avatar) {
                avatarDisplay.innerHTML = `<img src="${user.avatar}" alt="">`;
            } else {
                avatarDisplay.textContent = user.name.charAt(0);
            }

            // 侧边栏名片
            document.getElementById('display-name').textContent = user.name;
            document.getElementById('card-signature').textContent = user.signature || '这个人很懒，什么都没写~';
            
            const cardAvatar = document.getElementById('card-avatar');
            if (user.avatar) {
                cardAvatar.innerHTML = `<img src="${user.avatar}" alt="">`;
            } else {
                cardAvatar.textContent = user.name.charAt(0);
            }

            const cardBg = document.getElementById('card-bg');
            if (user.bgImage) {
                cardBg.style.backgroundImage = `url(${user.bgImage})`;
            }

            // 编辑页面
            document.getElementById('card-edit-preview-name').textContent = user.name;
            document.getElementById('card-edit-preview-sig').textContent = user.signature || '这个人很懒，什么都没写~';
            
            const previewAvatar = document.getElementById('card-edit-preview-avatar');
            if (user.avatar) {
                previewAvatar.innerHTML = `<img src="${user.avatar}" alt="">`;
            } else {
                previewAvatar.textContent = user.name.charAt(0);
            }

            const editPreview = document.getElementById('card-edit-preview');
            if (user.bgImage) {
                editPreview.style.backgroundImage = `url(${user.bgImage})`;
            }

            const editAvatarSmall = document.getElementById('edit-avatar-small');
            if (user.avatar) {
                editAvatarSmall.innerHTML = `<img src="${user.avatar}" alt="">`;
            } else {
                editAvatarSmall.style.backgroundColor = '#e8e8e8';
            }

            document.getElementById('edit-name-value').textContent = user.name;
            document.getElementById('edit-signature-value').textContent = user.signature || '这个人很懒，什么都没写~';
            document.getElementById('edit-bg-value').textContent = user.bgImage ? '已设置' : '默认';
        }

        // 渲染UI
        function renderUI() {
            updateUserDisplay();
            renderConversations();
            renderFriends();
            renderGroups();
        }
        
        // ===== 数据实时同步机制 =====
        // 监听好友和分组数据变化，自动更新两个页面
        function setupDataSyncListener() {
            // 创建代理对象监听AppState的friends和friendGroups变化
            let lastFriendsCount = AppState.friends.length;
            let lastGroupsCount = AppState.friendGroups.length;
            
            // 每500ms检查一次数据是否有变化
            setInterval(function() {
                try {
                    // 检查好友数是否改变
                    if (AppState.friends.length !== lastFriendsCount) {
                        console.log('检测到好友数量变化，更新UI');
                        lastFriendsCount = AppState.friends.length;
                        renderFriends();  // 更新好友页面
                        renderConversations();  // 同步更新消息页面
                    }
                    
                    // 检查分组数是否改变
                    if (AppState.friendGroups.length !== lastGroupsCount) {
                        console.log('检测到分组数量变化，更新UI');
                        lastGroupsCount = AppState.friendGroups.length;
                        renderFriends();  // 更新好友页面
                        renderConversations();  // 同步更新消息页面
                    }
                } catch (e) {
                    console.log('数据同步检查出错:', e.message);
                }
            }, 500);
        }


        // 渲染会话列表
        function renderConversations() {
            const msgList = document.getElementById('msg-list');
            const emptyState = document.getElementById('msg-empty');
            
            // 根据搜索词过滤对话
            let filteredConversations = AppState.conversations;
            if (AppState.searchQuery) {
                filteredConversations = AppState.conversations.filter(conv => 
                    conv.name.toLowerCase().includes(AppState.searchQuery.toLowerCase())
                );
            }
            
            if (filteredConversations.length === 0) {
                emptyState.style.display = 'flex';
                // 清除旧的会话项
                const oldItems = msgList.querySelectorAll('.msg-item');
                oldItems.forEach(item => item.remove());
                return;
            }
            
            emptyState.style.display = 'none';
            
            // 清除旧的会话项
            const oldItems = msgList.querySelectorAll('.msg-item');
            oldItems.forEach(item => item.remove());
            
            // 按最后消息时间排序（最新的在前）
            filteredConversations.sort(function(a, b) {
                const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
                const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
                return bTime - aTime;
            });
            
            filteredConversations.forEach(function(conv) {
                const item = document.createElement('div');
                item.className = 'msg-item';
                item.dataset.id = conv.id;
                item.dataset.type = conv.type;
                item.style.position = 'relative';
                item.style.overflow = 'hidden';
                item.style.cursor = 'pointer';
                
                const avatarContent = conv.avatar 
                    ? `<img src="${conv.avatar}" alt="">` 
                    : conv.name.charAt(0);
                
                item.innerHTML = `
                    <div class="msg-item-content" style="display:flex;align-items:center;gap:12px;padding:12px 15px;background:#fff;position:relative;z-index:2;cursor:pointer;">
                        <div class="msg-avatar">
                            ${avatarContent}
                            ${conv.unread > 0 ? `<div class="msg-badge">${conv.unread > 99 ? '99+' : conv.unread}</div>` : ''}
                        </div>
                        <div class="msg-content" style="flex:1;">
                            <div class="msg-header">
                                <div class="msg-title" style="flex:1;">${conv.name}</div>
                                <div class="msg-time" style="white-space:nowrap;">${conv.time || ''}</div>
                            </div>
                            <div class="msg-desc">${conv.lastMsg || ''}</div>
                        </div>
                    </div>
                `;
                
                item.addEventListener('click', function(e) {
                    openChat(conv);
                });
                
                msgList.insertBefore(item, emptyState);
            });
        }

        // 渲染好友列表
        function renderFriends() {
            const friendList = document.querySelector('.friend-list[data-group="common"]');
            const count = document.querySelector('.group-header[data-group="common"] .group-count');
            
            // 将好友分配到分组中
            let groupedFriends = {};
            AppState.friendGroups.forEach(fg => {
                groupedFriends[fg.id] = [];
            });
            
            AppState.friends.forEach(friend => {
                if (friend.friendGroupId && groupedFriends[friend.friendGroupId]) {
                    groupedFriends[friend.friendGroupId].push(friend);
                } else {
                    // 如果没有分配分组或分组不存在，分配到默认分组
                    if (!groupedFriends['group_default']) groupedFriends['group_default'] = [];
                    groupedFriends['group_default'].push(friend);
                    friend.friendGroupId = 'group_default';
                }
            });
            
            count.textContent = `(${AppState.friends.length}/${AppState.friends.length})`;
            
            if (AppState.friends.length === 0) {
                friendList.innerHTML = `
                    <div class="empty-state" style="padding: 30px 20px;">
                        <div class="empty-text">暂无好友</div>
                    </div>
                `;
                return;
            }
            
            friendList.innerHTML = '';
            
            // 初始化折叠状态存储
            if (!AppState.groupCollapsedStates) {
                AppState.groupCollapsedStates = {};
            }
            
            // 按分组显示好友
            AppState.friendGroups.forEach(group => {
                const groupFriends = groupedFriends[group.id] || [];
                if (groupFriends.length === 0) return;
                
                const isCollapsed = AppState.groupCollapsedStates[group.id] || false;
                
                // 添加分组头
                const groupHeader = document.createElement('div');
                groupHeader.style.cssText = 'padding:12px 15px;font-size:12px;color:#999;font-weight:600;background:#f9f9f9;cursor:pointer;display:flex;justify-content:space-between;align-items:center;user-select:none;min-height:44px;';
                groupHeader.dataset.groupId = group.id;
                groupHeader.dataset.collapsed = isCollapsed;
                
                groupHeader.innerHTML = `
                    <div style="flex:1;display:flex;align-items:center;gap:4px;">
                        <span>${group.name}</span>
                        <span style="margin-left:0;">(${groupFriends.length})</span>
                    </div>
                    <div style="display:flex;gap:4px;align-items:center;justify-content:center;min-height:24px;line-height:1;">
                        <button onclick="event.stopPropagation();editFriendGroup('${group.id}')" style="background:none;border:none;color:#666;cursor:pointer;padding:5px 10px;font-size:12px;">编辑</button>
                        ${group.id !== 'group_default' ? `<button onclick="event.stopPropagation();deleteFriendGroup('${group.id}')" style="background:none;border:none;color:#f44;cursor:pointer;padding:5px 10px;font-size:12px;">删除</button>` : ''}
                    </div>
                `;
                
                // 添加折叠展开事件
                groupHeader.addEventListener('click', function() {
                    AppState.groupCollapsedStates[group.id] = !AppState.groupCollapsedStates[group.id];
                    saveToStorage();
                    renderFriends();
                });
                
                friendList.appendChild(groupHeader);
                
                // 添加分组好友容器
                const friendsContainer = document.createElement('div');
                friendsContainer.className = 'group-friends-container';
                friendsContainer.dataset.groupId = group.id;
                friendsContainer.style.cssText = `display:${isCollapsed ? 'none' : 'block'};`;
                
                // 添加分组中的好友
                groupFriends.forEach(friend => {
                    const item = document.createElement('div');
                    item.className = 'friend-item';
                    item.dataset.id = friend.id;
                    item.style.position = 'relative';
                    item.style.overflow = 'hidden';
                    item.style.cursor = 'pointer';
                    
                    const avatarContent = friend.avatar 
                        ? `<img src="${friend.avatar}" alt="">` 
                        : friend.name.charAt(0);
                    
                    item.innerHTML = `
                        <div class="friend-item-content" style="display:flex;align-items:center;gap:12px;padding:10px 15px;background:#fff;position:relative;z-index:2;">
                            <div class="friend-avatar">${avatarContent}</div>
                            <div class="friend-info" style="flex:1;">
                                <div class="friend-name">${friend.name}</div>
                                <div class="friend-status">${friend.status || ''}</div>
                            </div>
                        </div>
                    `;
                    
                    item.addEventListener('click', function(e) {
                        openChatWithFriend(friend);
                    });
                    
                    friendsContainer.appendChild(item);
                });
                
                friendList.appendChild(friendsContainer);
            });
            
            // 添加新增分组按钮
            const addGroupBtn = document.createElement('div');
            addGroupBtn.style.cssText = 'padding:12px 15px;text-align:center;cursor:pointer;color:#0066cc;font-size:13px;border-top:1px solid #f0f0f0;';
            addGroupBtn.innerHTML = '+ 新增分组';
            addGroupBtn.addEventListener('click', addFriendGroup);
            friendList.appendChild(addGroupBtn);
        }

        function addFriendGroup() {
            const groupName = prompt('请输入分组名称：', '');
            if (!groupName || !groupName.trim()) return;
            
            AppState.friendGroups.push({
                id: generateId(),
                name: groupName.trim(),
                memberIds: []
            });
            
            saveToStorage();
            renderFriends();
            showToast('分组已添加');
        }

        function editFriendGroup(groupId) {
            const group = AppState.friendGroups.find(g => g.id === groupId);
            if (!group) return;
            
            const newName = prompt('编辑分组名称：', group.name);
            if (!newName || !newName.trim()) return;
            
            group.name = newName.trim();
            saveToStorage();
            renderFriends();
            showToast('分组已更新');
        }

        function deleteFriendGroup(groupId) {
            const group = AppState.friendGroups.find(g => g.id === groupId);
            if (!group || group.id === 'group_default') return;
            
            if (!confirm(`确定要删除分组 "${group.name}" 吗？该分组中的好友将移到默认分组`)) return;
            
            // 将该分组中的好友移到默认分组
            AppState.friends.forEach(friend => {
                if (friend.friendGroupId === groupId) {
                    friend.friendGroupId = 'group_default';
                }
            });
            
            AppState.friendGroups = AppState.friendGroups.filter(g => g.id !== groupId);
            saveToStorage();
            renderFriends();
            showToast('分组已删除');
        }

        // 渲染群聊列表
        function renderGroups() {
            const groupList = document.querySelector('.friend-list[data-group="groups"]');
            const count = document.querySelector('.group-header[data-group="groups"] .group-count');
            
            count.textContent = `(${AppState.groups.length}/${AppState.groups.length})`;
            
            if (AppState.groups.length === 0) {
                groupList.innerHTML = `
                    <div class="empty-state" style="padding: 30px 20px;">
                        <div class="empty-text">暂无群聊</div>
                    </div>
                `;
                return;
            }
            
            groupList.innerHTML = '';
            
            AppState.groups.forEach(function(group) {
                const item = document.createElement('div');
                item.className = 'friend-item';
                item.dataset.id = group.id;
                
                const avatarContent = group.avatar 
                    ? `<img src="${group.avatar}" alt="">` 
                    : group.name.charAt(0);
                
                item.innerHTML = `
                    <div class="friend-avatar">${avatarContent}</div>
                    <div class="friend-info">
                        <div class="friend-name">${group.name}</div>
                        <div class="friend-status">${group.memberCount || 0}人</div>
                    </div>
                `;
                
                item.addEventListener('click', function() {
                    openChatWithGroup(group);
                });
                
                groupList.appendChild(item);
            });
        }

        // 更新动态功能列表
        function updateDynamicFuncList() {
            document.querySelectorAll('.func-item').forEach(function(item) {
                const funcId = item.dataset.funcId;
                if (funcId && AppState.dynamicFuncs[funcId] === false) {
                    item.style.display = 'none';
                } else {
                    item.style.display = 'flex';
                }
            });

            // 更新设置弹窗中的开关状态
            document.querySelectorAll('.toggle-switch').forEach(function(toggle) {
                const funcId = toggle.dataset.funcId;
                if (funcId) {
                    if (AppState.dynamicFuncs[funcId] === false) {
                        toggle.classList.remove('active');
                    } else {
                        toggle.classList.add('active');
                    }
                }
            });
        }

        // 切换标签页
        function switchTab(tabId) {
            // 更新标签栏
            document.querySelectorAll('.tab-item').forEach(function(tab) {
                tab.classList.remove('active');
            });
            document.querySelector(`.tab-item[data-tab="${tabId}"]`).classList.add('active');
            
            // 更新内容区域
            document.querySelectorAll('.main-content').forEach(function(page) {
                page.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
            
            // 更新顶部导航栏显示
            const topNav = document.getElementById('top-nav');
            if (tabId === 'dynamic-page') {
                topNav.style.display = 'none';
            } else {
                topNav.style.display = 'flex';
            }
            
            AppState.currentTab = tabId;
        }

        // 关闭侧边栏
        function closeSideMenu() {
            document.getElementById('side-menu').classList.remove('open');
            document.getElementById('mask').classList.remove('show');
        }

        // 切换添加弹窗
        function toggleAddPopup() {
            document.getElementById('add-popup').classList.toggle('show');
        }

        // 关闭添加弹窗
        function closeAddPopup() {
            document.getElementById('add-popup').classList.remove('show');
        }

        // 打开子页面
        function openSubPage(pageId) {
            document.getElementById(pageId).classList.add('open');
            // 打开API设置页面时重新初始化UI
            if (pageId === 'api-settings-page') {
                setTimeout(function() {
                    initApiSettingsUI();
                }, 100);
            }
            // 打开朋友圈页面时，立即刷新好友和分组数据
            if (pageId === 'moments-page') {
                setTimeout(function() {
                    try {
                        // 确保selectbox中的好友和分组数据最新
                        if (typeof initCharacterSelect === 'function') {
                            initCharacterSelect();
                        }
                        if (typeof initGroupSelect === 'function') {
                            initGroupSelect();
                        }
                    } catch (e) {
                        console.log('moments page initialization error:', e.message);
                    }
                }, 50);
            }
        }

        // 关闭子页面
        function closeSubPage(pageId) {
            document.getElementById(pageId).classList.remove('open');
        }

        // 打开情侣空间
        function openCouplespaceArea() {
            openSubPage('couples-space-page');
            
            // 异步加载内容
            setTimeout(function() {
                renderCouplespaceContent();
            }, 100);
        }

        function renderCouplespaceContent() {
            const contentDiv = document.getElementById('couples-space-content');
            
            // 显示所有对话的统计和情感进度
            let html = '<div style="display:flex;flex-direction:column;gap:16px;">';
            
            if (AppState.conversations.length === 0) {
                html = '<div style="text-align:center;color:#999;padding:40px 20px;">还没有开始任何对话哦~</div>';
            } else {
                // 添加标题
                html += `
                    <div style="border-bottom:2px solid #ff69b4;padding-bottom:12px;margin-bottom:8px;">
                        <div style="font-size:18px;font-weight:bold;color:#333;">💝 我的情侣空间</div>
                        <div style="font-size:12px;color:#999;margin-top:4px;">记录与TA的每一刻美好</div>
                    </div>
                `;
                
                // 列出所有对话
                AppState.conversations.forEach(conv => {
                    const messages = AppState.messages[conv.id] || [];
                    const messageCount = messages.length;
                    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                    const lastMessageTime = lastMessage ? new Date(lastMessage.timestamp).toLocaleString() : '暂无对话';
                    
                    html += `
                        <div style="padding:12px;background:#fff;border-radius:8px;border-left:4px solid #ff69b4;">
                            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                                <div style="width:50px;height:50px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
                                    ${conv.avatar ? `<img src="${conv.avatar}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:20px;">${conv.name.charAt(0)}</span>`}
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:bold;font-size:14px;color:#333;">${conv.name}</div>
                                    <div style="font-size:12px;color:#999;margin-top:2px;">消息数：${messageCount} | 最后在 ${lastMessageTime}</div>
                                </div>
                            </div>
                            <button onclick="viewCouplespaceDetail('${conv.id}')" style="width:100%;padding:8px;border:1px solid #ff69b4;background:#fff;color:#ff69b4;border-radius:4px;cursor:pointer;font-size:12px;">查看详情</button>
                        </div>
                    `;
                });
            }
            
            html += '</div>';
            contentDiv.innerHTML = html;
        }

        function viewCouplespaceDetail(convId) {
            const conv = AppState.conversations.find(c => c.id === convId);
            if (!conv) return;
            
            const messages = AppState.messages[convId] || [];
            
            let modal = document.getElementById('couples-detail-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'couples-detail-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            // 统计数据
            const totalMessages = messages.length;
            const userMessages = messages.filter(m => m.type === 'sent').length;
            const charMessages = messages.filter(m => m.type === 'received').length;
            const firstMessageTime = messages.length > 0 ? new Date(messages[0].timestamp).toLocaleDateString() : '无';
            const lastMessageTime = messages.length > 0 ? new Date(messages[messages.length - 1].timestamp).toLocaleDateString() : '无';
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:500px;">
                    <div style="padding:16px;border-bottom:1px solid #e8e8e8;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="margin:0;font-size:16px;color:#ff69b4;font-weight:600;">💞 ${conv.name} 的故事</h3>
                        <button onclick="document.getElementById('couples-detail-modal').remove();" style="border:none;background:none;cursor:pointer;font-size:20px;color:#666;">×</button>
                    </div>
                    
                    <div style="padding:16px;max-height:60vh;overflow-y:auto;">
                        <!-- 统计卡片 -->
                        <div style="background:#ffe4f0;border-radius:8px;padding:16px;margin-bottom:16px;">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                <div style="text-align:center;padding:12px;background:#fff;border-radius:6px;">
                                    <div style="font-size:24px;font-weight:bold;color:#ff69b4;">${totalMessages}</div>
                                    <div style="font-size:12px;color:#666;margin-top:4px;">总对话数</div>
                                </div>
                                <div style="text-align:center;padding:12px;background:#fff;border-radius:6px;">
                                    <div style="font-size:24px;font-weight:bold;color:#ff69b4;">${userMessages}</div>
                                    <div style="font-size:12px;color:#666;margin-top:4px;">我的消息</div>
                                </div>
                                <div style="text-align:center;padding:12px;background:#fff;border-radius:6px;">
                                    <div style="font-size:24px;font-weight:bold;color:#ff69b4;">${charMessages}</div>
                                    <div style="font-size:12px;color:#666;margin-top:4px;">TA的消息</div>
                                </div>
                                <div style="text-align:center;padding:12px;background:#fff;border-radius:6px;">
                                    <div style="font-size:16px;font-weight:bold;color:#ff69b4;">${Math.ceil(charMessages > 0 ? (userMessages / charMessages) : 0).toFixed(1)}</div>
                                    <div style="font-size:12px;color:#666;margin-top:4px;">话题比例</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 时间轴 -->
                        <div style="padding:12px;background:#f9f9f9;border-radius:8px;margin-bottom:16px;">
                            <div style="font-weight:bold;margin-bottom:8px;color:#333;">📅 对话时间</div>
                            <div style="font-size:12px;color:#666;">开始于: ${firstMessageTime}</div>
                            <div style="font-size:12px;color:#666;margin-top:4px;">最后在: ${lastMessageTime}</div>
                        </div>
                        
                        <!-- 最近对话 -->
                        <div style="padding:12px;background:#f9f9f9;border-radius:8px;">
                            <div style="font-weight:bold;margin-bottom:8px;color:#333;">💬 最近的对话</div>
                            <div style="display:flex;flex-direction:column;gap:8px;">
                                ${messages.slice(-5).reverse().map((msg, idx) => `
                                    <div style="padding:8px;background:#fff;border-radius:4px;border-left:3px solid #ff69b4;">
                                        <div style="font-size:11px;color:#999;">${msg.type === 'sent' ? '你' : conv.name} • ${new Date(msg.timestamp).toLocaleTimeString()}</div>
                                        <div style="font-size:12px;color:#333;margin-top:4px;word-break:break-all;max-height:40px;overflow:hidden;">${msg.content.substring(0, 100)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }

        // 处理侧边栏菜单点击
        function handleMenuClick(func) {
            closeSideMenu();
            
            setTimeout(function() {
                switch(func) {
                    case 'wallet':
                        openWalletPage();
                        break;
                    case 'collection':
                        openCollectionPage();
                        break;
                    case 'api-settings':
                        openSubPage('api-settings-page');
                        break;
                    case 'moments':
                        openSubPage('moments-page');
                        // 刷新朋友圈的个人信息、分组、好友列表和内容
                        setTimeout(function() {
                            if (typeof momentsManager !== 'undefined') {
                                momentsManager.initProfileData();
                                momentsManager.renderMoments();
                                // 重新初始化好友分组和选择列表（多次尝试确保成功）
                                for (let i = 0; i < 3; i++) {
                                    setTimeout(function() {
                                        if (typeof initGroupSelect !== 'undefined') {
                                            initGroupSelect();
                                        }
                                        if (typeof initCharacterSelect !== 'undefined') {
                                            initCharacterSelect();
                                        }
                                    }, 50 * i);
                                }
                            }
                        }, 50);
                        break;
                    case 'couples-space':
                        openCouplespaceArea();
                        break;
                    case 'worldbook':
                        openSubPage('worldbook-page');
                        break;
                    case 'preset':
                        openPresetPage();
                        break;
                    case 'emoji':
                        openEmojiManager();
                        break;
                    case 'decoration':
                        openDecorationPage();
                        break;
                    case 'settings':
                        openSettingsPage();
                        break;
                    default:
                        showToast('功能开发中: ' + func);
                }
            }, 300);
        }
        
        // 打开配置页面
        function openPresetPage() {
            let page = document.getElementById('preset-page');
            if (!page) {
                page = document.createElement('div');
                page.id = 'preset-page';
                page.className = 'sub-page';
                document.getElementById('app-container').appendChild(page);
            }
            
            page.innerHTML = `
                <div class="sub-nav">
                    <div class="back-btn" id="preset-back-btn">
                        <div class="back-arrow"></div>
                        <span>返回</span>
                    </div>
                    <div class="sub-title">配置</div>
                </div>
                <div class="sub-content" style="padding:16px;background-color:#f5f5f5;">
                    <!-- 配置内容区域，等待后续填充 -->
                </div>
            `;
            
            page.classList.add('open');
            
            // 移除旧的事件监听器
            page.removeEventListener('click', handlePresetPageClick);
            
            // 使用事件委托处理返回按钮
            page.addEventListener('click', function(e) {
                if (e.target.closest('#preset-back-btn')) {
                    page.classList.remove('open');
                }
            });
        }

        
        // 打开设置页面
        function openSettingsPage() {
            let modal = document.getElementById('settings-page-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'settings-page-modal';
            modal.className = 'emoji-mgmt-modal show';
            modal.style.cssText = 'background:rgba(0,0,0,0.5);';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:350px;background:#fff;border-radius:12px;overflow:hidden;max-height:80vh;overflow-y:auto;">
                    <div style="padding:16px;border-bottom:1px solid #e8e8e8;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="margin:0;font-size:16px;color:#333;font-weight:600;">设置</h3>
                        <button onclick="document.getElementById('settings-page-modal').remove();" style="border:none;background:none;cursor:pointer;font-size:20px;color:#666;">×</button>
                    </div>
                    
                    <div style="padding:16px;">
                        <!-- 数据备份与恢复 -->
                        <div style="margin-bottom:20px;border:1px solid #e8e8e8;border-radius:8px;padding:16px;">
                            <h4 style="margin:0 0 12px 0;font-size:14px;color:#333;font-weight:600;">数据备份与恢复</h4>
                            
                            <button onclick="exportAllData();" style="width:100%;padding:10px;border:none;border-radius:4px;background:#000;color:#fff;cursor:pointer;font-size:13px;margin-bottom:8px;font-weight:500;">导出数据</button>
                            
                            <button onclick="document.getElementById('import-backup-input').click();" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:4px;background:#fff;color:#333;cursor:pointer;font-size:13px;font-weight:500;">导入数据</button>
                            
                            <input type="file" id="import-backup-input" accept=".json" style="display:none;">
                            
                            <div style="font-size:11px;color:#999;margin-top:8px;line-height:1.4;">
                                包含：API预设、聊天记录、用户配置、表情包、角色管理、个性签名、好友、对话框等所有数据
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 绑定导入事件
            document.getElementById('import-backup-input').addEventListener('change', function(e) {
                importAllData(e.target.files[0]);
                this.value = '';
            });
        }
        
        // 导出所有数据
        function exportAllData() {
            try {
                // 只导出本应用相关的数据
                const allData = {
                    'shupianjAppState': JSON.stringify(AppState),
                    // 只包含本应用的key
                    'shupianjFriends': localStorage.getItem('shupianjFriends') || '[]',
                    'shupianjConversations': localStorage.getItem('shupianjConversations') || '[]',
                    'shupianjMessages': localStorage.getItem('shupianjMessages') || '{}',
                    'shupianjEmojis': localStorage.getItem('shupianjEmojis') || '[]',
                    'shupianjEmojiGroups': localStorage.getItem('shupianjEmojiGroups') || '[]',
                    'shupianjWorldbooks': localStorage.getItem('shupianjWorldbooks') || '[]'
                };
                
                // 如果AppState中有其他重要数据，直接从AppState中提取
                const exportData = {
                    version: '1.0',
                    exportTime: new Date().toISOString(),
                    appState: {
                        friends: AppState.friends || [],
                        groups: AppState.groups || [],
                        conversations: AppState.conversations || [],
                        messages: AppState.messages || {},
                        emojis: AppState.emojis || [],
                        emojiGroups: AppState.emojiGroups || [],
                        worldbooks: AppState.worldbooks || [],
                        user: AppState.user || {},
                        apiSettings: AppState.apiSettings || {},
                        collections: AppState.collections || [],
                        dynamicFuncs: AppState.dynamicFuncs || {}
                    }
                };
                
                // 创建JSON文件
                const jsonStr = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                // 创建下载链接
                const link = document.createElement('a');
                link.href = url;
                link.download = `shupianji_backup_${new Date().getTime()}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                showToast('数据已导出');
                document.getElementById('settings-page-modal').remove();
            } catch (err) {
                showToast('导出失败：' + err.message);
                console.error('导出数据失败:', err);
            }
        }
        
        // 导入所有数据
        function importAllData(file) {
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // 验证数据格式
                    if (typeof data !== 'object' || data === null) {
                        showToast('格式错误，请重新选择');
                        return;
                    }
                    
                    // 确认导入
                    if (!confirm('将导入备份数据，现有数据将被覆盖。确定继续？')) {
                        return;
                    }
                    
                    // 新格式数据导入（v1.0）
                    if (data.version && data.appState) {
                        const appState = data.appState;
                        
                        // 数据验证和修复
                        AppState.friends = Array.isArray(appState.friends) ? appState.friends : [];
                        AppState.groups = Array.isArray(appState.groups) ? appState.groups : [];
                        AppState.conversations = Array.isArray(appState.conversations) ? appState.conversations : [];
                        AppState.messages = typeof appState.messages === 'object' ? appState.messages : {};
                        AppState.emojis = Array.isArray(appState.emojis) ? appState.emojis : [];
                        AppState.emojiGroups = Array.isArray(appState.emojiGroups) ? appState.emojiGroups : [];
                        AppState.worldbooks = Array.isArray(appState.worldbooks) ? appState.worldbooks : [];
                        
                        if (appState.user && typeof appState.user === 'object') {
                            AppState.user = Object.assign(AppState.user, appState.user);
                        }
                        
                        if (appState.apiSettings && typeof appState.apiSettings === 'object') {
                            AppState.apiSettings = Object.assign(AppState.apiSettings, appState.apiSettings);
                        }
                        
                        AppState.collections = Array.isArray(appState.collections) ? appState.collections : [];
                        AppState.dynamicFuncs = typeof appState.dynamicFuncs === 'object' ? appState.dynamicFuncs : AppState.dynamicFuncs;
                        
                    } else if (data.shupianjAppState) {
                        // 旧格式数据导入
                        try {
                            const oldState = JSON.parse(data.shupianjAppState);
                            if (oldState && typeof oldState === 'object') {
                                Object.assign(AppState, oldState);
                            }
                        } catch (parseErr) {
                            console.error('无法解析旧格式数据:', parseErr);
                            showToast('导入的数据格式不兼容');
                            return;
                        }
                    } else {
                        showToast('无法识别数据格式');
                        return;
                    }
                    
                    // 保存到本地存储
                    saveToStorage();
                    
                    // 显示提示并重新加载
                    showToast('数据导入成功，正在重新加载...');
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                    
                } catch (err) {
                    console.error('导入数据失败:', err);
                    showToast('导入失败：' + err.message);
                }
            };
            reader.readAsText(file);
        }

        // 添加好友页面
        function openAddFriendPage() {
            document.getElementById('add-friend-page').classList.add('open');
        }

        function closeAddFriendPage() {
            document.getElementById('add-friend-page').classList.remove('open');
            // 清空输入
            document.getElementById('friend-name-input').value = '';
            document.getElementById('friend-avatar-input').value = '';
            document.getElementById('friend-desc-input').value = '';
            document.getElementById('friend-greeting-input').value = '';
        }

        function submitAddFriend() {
            const name = document.getElementById('friend-name-input').value.trim();
            const avatar = document.getElementById('friend-avatar-input').value.trim();
            const desc = document.getElementById('friend-desc-input').value.trim();
            const greeting = document.getElementById('friend-greeting-input').value.trim();
            
            if (!name) {
                showToast('请输入AI好友名称');
                return;
            }
            
            const friend = {
                id: 'friend_' + Date.now(),
                name: name,
                avatar: avatar,
                description: desc,
                greeting: greeting,
                status: desc ? desc.substring(0, 20) + (desc.length > 20 ? '...' : '') : '',
                createdAt: new Date().toISOString()
            };
            
            AppState.friends.push(friend);
            
            // 同时添加到会话列表（同步名称和人设）
            const conv = {
                id: friend.id,
                type: 'friend',
                name: friend.name,
                avatar: friend.avatar,
                description: friend.description,
                userAvatar: '',  // 该对话的用户头像
                lastMsg: friend.greeting || '',
                time: formatTime(new Date()),
                lastMessageTime: new Date().toISOString(),  // 保存完整时间戳用于排序
                unread: 0
            };
            AppState.conversations.unshift(conv);
            
            // 初始化消息并添加开场白
            if (!AppState.messages[friend.id]) {
                AppState.messages[friend.id] = [];
                // 如果有开场白，添加为首条消息（由角色主动发出）
                if (greeting) {
                    AppState.messages[friend.id].push({
                        id: 'msg_' + Date.now(),
                        type: 'received',
                        content: greeting,
                        time: new Date().toISOString()
                    });
                }
            }
            
            saveToStorage();
            renderFriends();
            renderConversations();
            closeAddFriendPage();
            
            // 自动打开聊天
            openChatWithFriend(friend);
            showToast('好友添加成功');
        }

        // 创建群聊页面
        function openCreateGroupPage() {
            document.getElementById('create-group-page').classList.add('open');
        }

        function closeCreateGroupPage() {
            document.getElementById('create-group-page').classList.remove('open');
            document.getElementById('group-name-input').value = '';
            document.getElementById('group-avatar-input').value = '';
            document.getElementById('group-desc-input').value = '';
        }

        function submitCreateGroup() {
            const name = document.getElementById('group-name-input').value.trim();
            const avatar = document.getElementById('group-avatar-input').value.trim();
            const desc = document.getElementById('group-desc-input').value.trim();
            
            if (!name) {
                showToast('请输入群聊名称');
                return;
            }
            
            const group = {
                id: 'group_' + Date.now(),
                name:  name,
                avatar: avatar,
                description: desc,
                memberCount: 1,
                members: [],
                createdAt: new Date().toISOString()
            };
            
            AppState.groups.push(group);
            saveToStorage();
            renderGroups();
            closeCreateGroupPage();
            
            // 自动打开聊天
            openChatWithGroup(group);
        }

        // 导入角色卡页面
        function openImportCardPage() {
            document.getElementById('import-card-page').classList.add('open');
        }

        function closeImportCardPage() {
            document.getElementById('import-card-page').classList.remove('open');
            document.getElementById('import-file-input').value = '';
            document.getElementById('import-image-input').value = '';
            document.getElementById('import-preview').innerHTML = '';
            document.getElementById('import-all-btn').classList.remove('show');
            AppState.importedCards = [];
        }

        function handleImageImport(files) {
            if (!files || files.length === 0) return;
            
            Array.from(files).forEach(function(file) {
                if (!file.type.startsWith('image/')) {
                    showToast('请选择图片文件');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    // 显示图片配置对话框
                    showImageCardConfigDialog(e.target.result, file.name);
                };
                reader.readAsDataURL(file);
            });
        }

        function showImageCardConfigDialog(imageData, fileName) {
            let modal = document.getElementById('image-card-config-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'image-card-config-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            // 使用全局变量存储图片数据
            window.pendingImageCardImport = { imageData: imageData, fileName: fileName };
            
            const defaultName = fileName.replace(/\.[^.]+$/, '');
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:400px;">
                    <div class="emoji-mgmt-header">
                        <h3 style="margin:0;font-size:14px;color:#000;">从图片导入角色卡</h3>
                        <button class="emoji-mgmt-close" onclick="document.getElementById('image-card-config-modal').remove();">
                            <svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div style="padding:16px;flex:1;overflow-y:auto;background:#ffffff;">
                        <div style="text-align:center;margin-bottom:16px;">
                            <img src="${imageData}" alt="" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid #ddd;">
                        </div>
                        
                        <div style="margin-bottom:12px;">
                            <label style="display:block;font-size:12px;color:#666;margin-bottom:6px;font-weight:600;">角色名称</label>
                            <input id="img-card-name" type="text" value="${defaultName}" class="group-input" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                        </div>
                        
                        <div style="margin-bottom:12px;">
                            <label style="display:block;font-size:12px;color:#666;margin-bottom:6px;font-weight:600;">角色描述</label>
                            <textarea id="img-card-desc" class="group-input" style="width:100%;height:80px;padding:8px;border:1px solid #ddd;border-radius:4px;resize:vertical;"></textarea>
                        </div>
                        
                        <div style="margin-bottom:12px;">
                            <label style="display:block;font-size:12px;color:#666;margin-bottom:6px;font-weight:600;">开场白</label>
                            <input id="img-card-greeting" type="text" class="group-input" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                        </div>
                        
                        <div style="display:flex;gap:8px;justify-content:center;">
                            <button onclick="document.getElementById('image-card-config-modal').remove();" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:13px;">取消</button>
                            <button onclick="importImageAsCard();" style="flex:1;padding:8px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:500;">导入</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        function importImageAsCard() {
            if (!window.pendingImageCardImport) {
                showToast('没有待导入的图片');
                return;
            }
            
            const imageData = window.pendingImageCardImport.imageData;
            const name = document.getElementById('img-card-name').value.trim();
            const desc = document.getElementById('img-card-desc').value.trim();
            const greeting = document.getElementById('img-card-greeting').value.trim();
            
            if (!name) {
                showToast('请输入角色名称');
                return;
            }
            
            const card = {
                id: 'friend_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: name,
                avatar: imageData,
                description: desc,
                greeting: greeting,
                status: desc ? desc.substring(0, 20) + '...' : '图片角色卡',
                createdAt: new Date().toISOString()
            };
            
            // 添加到导入列表
            AppState.importedCards.push(card);
            
            // 更新预览
            const preview = document.getElementById('import-preview');
            if (!preview) return;
            
            const item = document.createElement('div');
            item.className = 'import-preview-item';
            item.innerHTML = `
                <div class="import-preview-avatar">
                    <img src="${imageData}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">
                </div>
                <div class="import-preview-info">
                    <div class="import-preview-name">${name}</div>
                    <div class="import-preview-desc">${desc || '无描述'}</div>
                </div>
            `;
            preview.appendChild(item);
            
            // 显示导入按钮
            if (AppState.importedCards.length > 0) {
                document.getElementById('import-all-btn').classList.add('show');
            }
            
            showToast('已添加到导入列表');
            document.getElementById('image-card-config-modal').remove();
            document.getElementById('import-image-input').value = '';
            window.pendingImageCardImport = null;
        }

        function handleFileImport(files) {
            if (!files || files.length === 0) return;
            
            const preview = document.getElementById('import-preview');
            preview.innerHTML = '';
            AppState.importedCards = [];
            
            Array.from(files).forEach(function(file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const data = JSON.parse(e.target.result);
                        const card = parseCharacterCard(data);
                        
                        if (card) {
                            AppState.importedCards.push(card);
                            
                            const item = document.createElement('div');
                            item.className = 'import-preview-item';
                            
                            const avatarContent = card.avatar 
                                ? `<img src="${card.avatar}" alt="">` 
                                : card.name.charAt(0);
                            
                            item.innerHTML = `
                                <div class="import-preview-avatar">${avatarContent}</div>
                                <div class="import-preview-info">
                                    <div class="import-preview-name">${card.name}</div>
                                    <div class="import-preview-desc">${card.description ? card.description.substring(0, 50) + '...' : '无描述'}</div>
                                </div>
                            `;
                            
                            preview.appendChild(item);
                            
                            if (AppState.importedCards.length > 0) {
                                document.getElementById('import-all-btn').classList.add('show');
                            }
                        }
                    } catch (err) {
                        console.error('解析文件失败:', file.name, err);
                        showToast('文件 ' + file.name + ' 解析失败');
                    }
                };
                reader.readAsText(file);
            });
        }

        function parseCharacterCard(data) {
            let card = null;
            let worldbook = null;
            
            // SillyTavern V2 格式
            if (data.spec === 'chara_card_v2' && data.data) {
                card = {
                    name: data.data.name,
                    description: data.data.description || data.data.personality,
                    greeting: data.data.first_mes,
                    avatar: data.data.avatar,
                    scenario: data.data.scenario,
                    mesExample: data.data.mes_example
                };
                
                // 提取世界书信息 (SillyTavern中的world_scenario或extensions字段)
                if (data.data.world_scenario) {
                    worldbook = {
                        name: data.data.name + '的世界书',
                        content: data.data.world_scenario,
                        isGlobal: false
                    };
                } else if (data.data.extensions && data.data.extensions.world) {
                    worldbook = {
                        name: data.data.name + '的世界书',
                        content: data.data.extensions.world,
                        isGlobal: false
                    };
                }
            }
            // SillyTavern V1 格式
            else if (data.name) {
                card = {
                    name: data.name,
                    description: data.description || data.personality,
                    greeting: data.first_mes,
                    avatar: data.avatar,
                    scenario: data.scenario,
                    mesExample: data.mes_example
                };
                
                // V1中检查scenario字段作为世界书
                if (data.scenario) {
                    worldbook = {
                        name: data.name + '的世界书',
                        content: data.scenario,
                        isGlobal: false
                    };
                }
            }
            
            if (card && card.name) {
                card.id = 'friend_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                card.status = card.description ? card.description.substring(0, 20) + '...' : '';
                card.createdAt = new Date().toISOString();
                
                // 保存世界书信息到card对象中，以便导入时使用
                if (worldbook) {
                    card.worldbook = worldbook;
                }
                
                return card;
            }
            
            return null;
        }

        function importAllCards() {
            if (AppState.importedCards.length === 0) {
                showToast('没有可导入的角色卡');
                return;
            }
            
            AppState.importedCards.forEach(function(card) {
                // 导入角色
                AppState.friends.push(card);
                
                // 导入相关的世界书并自动绑定
                if (card.worldbook && card.worldbook.content && card.worldbook.content.trim()) {
                    // 检查是否已存在同名世界书
                    let existingWb = AppState.worldbooks.find(w => w.name === card.worldbook.name);
                    
                    if (!existingWb) {
                        // 创建新的世界书
                        const newWb = {
                            id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            name: card.worldbook.name,
                            content: card.worldbook.content,
                            isGlobal: card.worldbook.isGlobal || false,
                            createdAt: new Date().toISOString()
                        };
                        AppState.worldbooks.push(newWb);
                        existingWb = newWb;
                    }
                    
                    // 创建对应的会话并绑定世界书
                    let conv = AppState.conversations.find(c => c.id === card.id);
                    if (!conv) {
                        conv = {
                            id: card.id,
                            type: 'friend',
                            name: card.name,
                            avatar: card.avatar || '',
                            description: card.description || '',
                            userAvatar: '',
                            lastMsg: card.greeting || '',
                            time: formatTime(new Date()),
                            lastMessageTime: new Date().toISOString(),
                            unread: 0,
                            boundWorldbooks: [existingWb.id],  // 绑定世界书
                            mindStates: []  // 【新增】初始化心声数据数组
                        };
                        AppState.conversations.unshift(conv);
                    }
                }
            });
            
            saveToStorage();
            renderFriends();
            renderWorldbooks();  // 刷新世界书列表
            
            showToast('成功导入 ' + AppState.importedCards.length + ' 个角色及其世界书');
            closeImportCardPage();
        }

        // 聊天功能
        function openChat(conv) {
            AppState.currentChat = conv;
            
            // 立即添加open类和更新标题（快速显示UI）
            const chatPage = document.getElementById('chat-page');
            if (chatPage) {
                chatPage.classList.add('open');
            }
            
            document.getElementById('chat-title').textContent = conv.name;
            
            // 清除未读
            conv.unread = 0;
            
            // 获取该对话的状态并正确显示打字状态
            const convState = getConversationState(conv.id);
            const chatTypingStatus = document.getElementById('chat-typing-status');
            const chatTitle = document.getElementById('chat-title');
            
            // 根据该对话是否在进行API调用来显示相应的UI
            if (convState.isTyping) {
                if (chatTypingStatus) chatTypingStatus.style.display = 'inline-block';
                if (chatTitle) chatTitle.style.display = 'none';
            } else {
                if (chatTypingStatus) chatTypingStatus.style.display = 'none';
                if (chatTitle) chatTitle.style.display = 'inline';
            }
            
            // 应用聊天背景图片（从conversation中读取）
            if (chatPage) {
                if (conv && conv.chatBgImage) {
                    chatPage.style.backgroundImage = `url('${conv.chatBgImage}')`;
                    chatPage.style.backgroundSize = 'cover';
                    chatPage.style.backgroundPosition = 'center';
                    chatPage.style.backgroundAttachment = 'fixed';
                } else {
                    chatPage.style.backgroundImage = 'none';
                }
            }
            
            // 隐藏多选工具栏
            const toolbar = document.getElementById('msg-multi-select-toolbar');
            if (toolbar) toolbar.remove();
            
            // 重置工具栏和输入框的位置（隐藏emoji库导致的偏移）
            const chatToolbar = document.getElementById('chat-toolbar');
            const inputArea = document.querySelector('.chat-input-area');
            const emojiLib = document.getElementById('emoji-library');
            
            // 确保工具栏隐藏
            if (chatToolbar) {
                chatToolbar.classList.remove('show');
                chatToolbar.style.transform = 'translateY(0)';
            }
            if (inputArea) {
                inputArea.style.transform = 'translateY(0)';
            }
            if (emojiLib) {
                emojiLib.classList.remove('show');
            }
            
            // 异步渲染消息和保存数据（避免阻塞UI）
            requestAnimationFrame(() => {
                renderChatMessages();
                saveToStorage();
                renderConversations();
            });
        }

        function openChatWithFriend(friend) {
            // 查找或创建会话
            let conv = AppState.conversations.find(c => c.id === friend.id);
            
            if (!conv) {
                conv = {
                    id: friend.id,
                    type: 'friend',
                    name: friend.name,
                    avatar: friend.avatar,
                    description: friend.description || '',
                    userAvatar: '',  // 该对话的用户头像
                    lastMsg: friend.greeting || '',
                    time: formatTime(new Date()),
                    lastMessageTime: new Date().toISOString(),  // 保存完整时间戳用于排序
                    unread: 0,
                    mindStates: []  // 【新增】初始化心声数据数组
                };
                AppState.conversations.unshift(conv);
                
                // 初始化消息并添加开场白
                if (!AppState.messages[friend.id]) {
                    AppState.messages[friend.id] = [];
                    // 如果有开场白，添加为首条消息（由角色主动发出）
                    if (friend.greeting) {
                        AppState.messages[friend.id].push({
                            id: 'msg_' + Date.now(),
                            type: 'received',
                            content: friend.greeting,
                            time: new Date().toISOString()
                        });
                    }
                }
                
                saveToStorage();
                renderConversations();
            }
            
            openChat(conv);
        }

        function openChatWithGroup(group) {
            let conv = AppState.conversations.find(c => c.id === group.id);
            
            if (!conv) {
                conv = {
                    id: group.id,
                    type: 'group',
                    name: group.name,
                    avatar: group.avatar,
                    userAvatar: '',  // 该对话的用户头像
                    lastMsg: '',
                    time: formatTime(new Date()),
                    lastMessageTime: new Date().toISOString(),  // 保存完整时间戳用于排序
                    unread: 0,
                    mindStates: []  // 【新增】初始化心声数据数组
                };
                AppState.conversations.unshift(conv);
                
                if (!AppState.messages[group.id]) {
                    AppState.messages[group.id] = [];
                }
                
                saveToStorage();
                renderConversations();
            }
            
            openChat(conv);
        }

        function closeChatPage() {
            // 关闭多选模式
            AppState.isSelectMode = false;
            AppState.selectedMessages = [];
            
            // 移除多选工具栏
            const toolbar = document.getElementById('msg-multi-select-toolbar');
            if (toolbar) toolbar.remove();
            
            document.getElementById('chat-page').classList.remove('open');
            
            // 不清除AppState.currentChat，让打字状态保持为该对话的状态
            // 这样当用户返回时，打字状态会被正确恢复
        }

        // 消息长按菜单状态（保留以防兼容）
        let messageContextState = {
            selectedMessages: [],
            isMultiSelectMode: false
        };

        function renderChatMessages() {
            const container = document.getElementById('chat-messages');
            container.innerHTML = '';
            
            if (!AppState.currentChat) return;
            
            const messages = AppState.messages[AppState.currentChat.id] || [];
            
            messages.forEach(function(msg, index) {
                // 系统消息不显示给用户
                if (msg.type === 'system') {
                    return;
                }
                
                const bubble = document.createElement('div');
                const isSelected = AppState.selectedMessages.includes(msg.id);
                // 对于语音和地理位置消息，使用sender属性来设置样式（sent/received）；其他消息使用type
                let bubbleClass = (msg.type === 'voice' || msg.type === 'location') ? msg.sender : msg.type;
                let className = 'chat-bubble ' + bubbleClass;
                if (isSelected) {
                    className += ' selected';
                }
                
                // 判断是否应该隐藏头像（连续同侧消息只显示第一个头像）
                let shouldHideAvatar = false;
                if (index > 0) {
                    const prevMsg = messages[index - 1];
                    if (prevMsg && prevMsg.type !== 'system') {
                        const currentSide = (msg.type === 'voice' || msg.type === 'location') ? msg.sender : msg.type;
                        const prevSide = (prevMsg.type === 'voice' || prevMsg.type === 'location') ? prevMsg.sender : prevMsg.type;
                        shouldHideAvatar = (currentSide === prevSide);
                    }
                }
                
                // 如果需要隐藏头像，添加hide-avatar class到bubble
                if (shouldHideAvatar) {
                    className += ' hide-avatar';
                }
                
                bubble.className = className;
                bubble.dataset.msgId = msg.id;
                bubble.dataset.msgIndex = index;
                
                let avatarContent;
                if (msg.type === 'sent') {
                    // 使用对话级别的用户头像，如果没有设置则使用侧边栏头像
                    const userAvatar = AppState.currentChat.userAvatar || AppState.user.avatar;
                    avatarContent = userAvatar 
                        ? `<img src="${userAvatar}" alt="">` 
                        : AppState.user.name.charAt(0);
                } else {
                    avatarContent = AppState.currentChat.avatar 
                        ? `<img src="${AppState.currentChat.avatar}" alt="">` 
                        : AppState.currentChat.name.charAt(0);
                }
                
                let textContent = `<div class="chat-text" style="flex:1;">`;
                
                // 如果有引用消息，显示引用区域
                if (msg.replyTo) {
                    const replyMsg = messages.find(m => m.id === msg.replyTo);
                    if (replyMsg) {
                        const replyContent = replyMsg.emojiUrl ? '[表情包]' : replyMsg.content.substring(0, 40);
                        const replyAuthor = replyMsg.type === 'sent' ? AppState.user.name : AppState.currentChat.name;
                        const replyId = msg.replyTo;
                        textContent += `<div style="padding:6px 8px;margin-bottom:8px;border-left:3px solid #ddd;background:#f5f5f5;border-radius:4px;font-size:11px;color:#999;max-width:280px;cursor:pointer;word-break:break-word;" data-scroll-to="${replyId}">
                            <div style="margin-bottom:3px;font-weight:500;color:#666;font-size:11px;max-width:270px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${replyAuthor}</div>
                            <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:270px;font-size:11px;">${escapeHtml(replyContent)}</div>
                        </div>`;
                    }
                }
                
                // 处理不同类型消息的内容
                // ⭐ 转发朋友圈消息优先检查，确保不会被其他条件拦截
                if (msg.isForward && msg.forwardedMoment) {
                    // 转发朋友圈消息：直接跳过 textContent 处理
                    textContent = `</div>`; // 只添加关闭标签，不添加任何内容
                } else if (msg.forwardedMoment && !msg.isForwarded) {
                    // ⭐ 防御性检查：如果有 forwardedMoment 但其他标记不对，也认为是转发朋友圈
                    textContent = `</div>`; // 只添加关闭标签，不添加任何内容
                } else if (msg.isRetracted) {
                    // 撤回消息：显示撤回提示文字，灰色风格
                    textContent += `<div style="color:#999;font-size:12px;font-style:italic;">${escapeHtml(msg.content)}</div>`;
                } else if (msg.type === 'voice') {
                    // 语音条消息：显示语音气泡
                    textContent = ``; // 清空，由下面的bubble.innerHTML处理
                } else if (msg.type === 'location') {
                    // 地理位置消息：显示地理位置气泡
                    textContent = ``; // 清空，由下面的bubble.innerHTML处理
                } else if (msg.isImage && msg.imageData) {
                    // 图片消息：清空textContent，将由下面的bubble.innerHTML处理
                    textContent = ``;
                } else if (msg.emojiUrl) {
                    // 表情包处理：只显示表情包图片，不显示文字描述
                    textContent = ``; // 纯表情包消息，不显示任何文字
                } else if (msg.isForwarded && !msg.isForward) {
                    // 转发消息：使用类似QQ的转发格式（但不是朋友圈转发）
                    console.log('🔄 检测到普通转发消息:', msg);
                    // ⭐ 防御性检查：如果消息实际上包含 forwardedMoment，不应该到这里
                    if (msg.forwardedMoment) {
                        console.log('⚠️ 警告：消息有 forwardedMoment，应该使用转发朋友圈处理，但被当作普通转发消息！');
                        // 不处理，让它继续到后面的处理
                    } else {
                        const forwardedLines = msg.content.split('\n').map(line => line.trim()).filter(line => line);
                        textContent += `
                            <div style="background:#f8f8f8;border-radius:6px;padding:8px 10px;margin:4px 0;border-left:3px solid #0066cc;">
                                <div style="font-size:11px;color:#666;margin-bottom:6px;font-weight:500;">转发自: ${msg.forwardHeaderText}</div>
                                <div style="font-size:13px;color:#333;line-height:1.6;">
                                    ${forwardedLines.map(line => `<div style="margin:4px 0;">${escapeHtml(line)}</div>`).join('')}
                                </div>
                            </div>
                        `;
                    }
                } else {
                    // 普通文本消息
                    textContent += escapeHtml(msg.content);
                }
                
                // 显示翻译结果（但转发朋友圈消息除外）
                if (msg.translation && !(msg.isForward && msg.forwardedMoment)) {
                    const transText = msg.translation.result;
                    textContent += `
                        <div style="padding:10px;margin-top:8px;background:#f9f9f9;border-radius:4px;font-size:12px;color:#666;border-left:2px solid #ddd;max-height:150px;overflow-y:auto;word-break:break-word;">
                            <div style="font-weight:500;margin-bottom:4px;color:#999;font-size:11px;">${msg.translation.targetLanguage}</div>
                            <div style="max-width:350px;">${escapeHtml(transText)}</div>
                            <button class="close-trans-btn" data-msg-id="${msg.id}" style="margin-top:6px;background:none;border:none;color:#999;cursor:pointer;font-size:12px;padding:0;">关闭</button>
                        </div>
                    `;
                }
                
                // 转发朋友圈消息已经设置了 textContent，这里直接使用
                if (!(msg.isForward && msg.forwardedMoment)) {
                    textContent += `</div>`;
                }
                
                // 一次性设置bubble.innerHTML (必须在添加事件监听器之前！)
                if (msg.type === 'voice') {
                    // 语音条消息渲染
                    const duration = msg.duration || 1;
                    const avatarClass = shouldHideAvatar ? 'chat-avatar hidden' : 'chat-avatar';
                    bubble.innerHTML = `
                        <div class="${avatarClass}">${avatarContent}</div>
                        <div class="voice-bubble">
                            <div class="voice-waveform">
                                <span class="wave"></span>
                                <span class="wave"></span>
                                <span class="wave"></span>
                            </div>
                            <div class="voice-duration">${duration}秒</div>
                        </div>
                    `;
                    bubble.classList.add('voice-message');
                } else if (msg.type === 'location') {
                    // 地理位置消息渲染 - 复杂精细设计
                    const locationName = escapeHtml(msg.locationName || '位置');
                    const locationAddress = msg.locationAddress ? escapeHtml(msg.locationAddress) : '';
                    const locationDistance = msg.locationDistance || 5;
                    const senderName = msg.type === 'sent' ? AppState.user.name : AppState.currentChat.name;
                    const avatarClass = shouldHideAvatar ? 'chat-avatar hidden' : 'chat-avatar';
                    bubble.innerHTML = `
                        <div class="${avatarClass}">${avatarContent}</div>
                        <div class="location-bubble" style="cursor:pointer;">
                            <div class="location-map-preview"></div>
                            <div class="location-info">
                                <div class="location-sender-info">
                                    <span class="location-sender-name">${escapeHtml(senderName)}</span>
                                    <span>发送了位置</span>
                                </div>
                                <div class="location-header">
                                    <div class="location-icon"></div>
                                    <div class="location-details-info">
                                        <div class="location-name">${locationName}</div>
                                        ${locationAddress ? `<div class="location-address">${locationAddress}</div>` : '<div class="location-address">位置信息</div>'}
                                        <div class="location-distance">约${locationDistance}米范围</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    bubble.classList.add('location-message');
                    
                    // 添加地理位置气泡的点击事件
                    const locationBubble = bubble.querySelector('.location-bubble');
                    if (locationBubble) {
                        locationBubble.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (typeof LocationMessageModule !== 'undefined') {
                                LocationMessageModule.showLocationDetails(msg.locationName, msg.locationAddress, locationBubble);
                            }
                        });
                    }
                } else if (msg.isForward && msg.forwardedMoment) {
                    // 转发朋友圈消息 - 简洁优雅的卡片（黑白灰风格）
                    console.log('🎯 检测到转发朋友圈消息:', msg);
                    const forwarded = msg.forwardedMoment;
                    const momentAuthor = escapeHtml(forwarded.author || '用户');
                    const momentContent = escapeHtml(forwarded.content || '').trim().split('\n').map(line => line.trim()).join('\n');
                    const momentDate = forwarded.timestamp ? new Date(forwarded.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
                    const avatarClass = shouldHideAvatar ? 'chat-avatar hidden' : 'chat-avatar';
                    
                    bubble.innerHTML = `
                        <div class="${avatarClass}">${avatarContent}</div>
                        <div style="
                            width: 240px;
                        ">
                            <div style="
                                background: #fff;
                                border: 1px solid #e0e0e0;
                                border-radius: 12px;
                                overflow: hidden;
                            ">
                                <!-- 头部 - 灰色背景 -->
                                <div style="
                                    background: #f9f9f9;
                                    padding: 8px 12px;
                                    border-bottom: 1px solid #e0e0e0;
                                    font-size: 11px;
                                    color: #888;
                                    font-weight: 500;
                                ">
                                    朋友圈
                                </div>
                                
                                <!-- 内容 -->
                                <div style="
                                    padding: 10px 12px;
                                ">
                                    <!-- 作者和日期 -->
                                    <div style="
                                        display: flex;
                                        justify-content: space-between;
                                        align-items: center;
                                        margin-bottom: 6px;
                                    ">
                                        <div style="
                                            font-size: 12px;
                                            font-weight: 500;
                                            color: #222;
                                        ">
                                            ${momentAuthor}
                                        </div>
                                        <div style="
                                            font-size: 10px;
                                            color: #aaa;
                                        ">
                                            ${momentDate}
                                        </div>
                                    </div>
                                    
                                    <!-- 内容文本 - 清理所有缩进，严格左对齐 -->
                                    <div style="
                                        font-size: 12px;
                                        color: #333;
                                        line-height: 1.5;
                                        word-break: break-word;
                                        margin-bottom: 8px;
                                        white-space: normal;
                                        text-align: left;
                                    ">
                                        ${momentContent.length > 150 ? momentContent.substring(0, 150) + '...' : momentContent}
                                    </div>
                                    
                                    <!-- 分隔线 -->
                                    <div style="
                                        height: 1px;
                                        background: #e0e0e0;
                                        margin: 8px 0;
                                    "></div>
                                    
                                    <!-- 底部提示 -->
                                    <div style="
                                        font-size: 10px;
                                        color: #bbb;
                                        text-align: center;
                                    ">
                                        来自朋友圈
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    bubble.classList.add('forward-moment-message');
                } else if (msg.isImage && msg.imageData) {
                    // 图片消息：限制大小为100px（与表情包相同），保持纵横比，对齐头像
                    const avatarClass = shouldHideAvatar ? 'chat-avatar hidden' : 'chat-avatar';
                    bubble.innerHTML = `
                        <div class="${avatarClass}">${avatarContent}</div>
                        <img src="${msg.imageData}" alt="图片" style="max-width:100px;max-height:100px;width:auto;height:auto;border-radius:8px;display:block;">
                    `;
                    // 为图片消息添加特殊class
                    bubble.classList.add('image-message');
                } else if (msg.emojiUrl || msg.isEmoji) {
                    // 表情包消息：显示头像 + 100px表情包（统一处理AI和用户发送的表情包）
                    // emojiUrl是新格式，isEmoji标记的旧格式也需要支持
                    const emojiImageUrl = msg.emojiUrl || (msg.isEmoji && AppState.emojis.find(e => e.text === msg.content)?.url);
                    const avatarClass = shouldHideAvatar ? 'chat-avatar hidden' : 'chat-avatar';
                    if (emojiImageUrl) {
                        bubble.innerHTML = `
                            <div class="${avatarClass}">${avatarContent}</div>
                            <img src="${emojiImageUrl}" alt="表情" style="max-width:100px;max-height:100px;width:auto;height:auto;border-radius:8px;display:block;">
                        `;
                    } else {
                        // 如果找不到表情包图片，显示文字
                        bubble.innerHTML = `
                            <div class="${avatarClass}">${avatarContent}</div>
                            ${textContent}
                        `;
                    }
                    // 为表情包消息添加特殊class
                    bubble.classList.add('emoji-message');
                } else {
                    // 其他消息（普通文本、表情+文字、有描述的图片等）
                    const avatarClass = shouldHideAvatar ? 'chat-avatar hidden' : 'chat-avatar';
                    bubble.innerHTML = `
                        <div class="${avatarClass}">${avatarContent}</div>
                        ${textContent}
                    `;
                }
                
                // 翻译关闭按钮事件
                const closeTransBtn = bubble.querySelector('.close-trans-btn');
                if (closeTransBtn) {
                    closeTransBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        msg.translation = null;
                        saveToStorage();
                        renderChatMessages();
                    });
                }
                
                // 多选模式下的checkbox点击事件
                // 处理多选/非多选模式的事件
                if (AppState.isSelectMode) {
                    // 多选模式：点击整个气泡即可选择
                    bubble.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // 不要触发其他点击事件
                        toggleMessageSelection(msg.id);
                    });
                } else {
                    // 语音条消息的点击事件 - 显示语音转文字
                    if (msg.type === 'voice') {
                        // 为voice-bubble绑定点击事件，而不是整个bubble
                        const voiceBubbleEl = bubble.querySelector('.voice-bubble');
                        if (voiceBubbleEl) {
                            voiceBubbleEl.addEventListener('click', (e) => {
                                e.stopPropagation();
                                if (typeof VoiceMessageModule !== 'undefined' && VoiceMessageModule.showVoiceTranscript) {
                                    VoiceMessageModule.showVoiceTranscript(msg.content, voiceBubbleEl);
                                }
                            });
                            voiceBubbleEl.style.cursor = 'pointer';
                        }
                    }
                    
                    // 非多选模式：长按事件
                    bubble.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        showMessageContextMenu(msg, e, bubble);
                    });
                    
                    // 处理引用区域点击
                    const replyArea = bubble.querySelector('[data-scroll-to]');
                    if (replyArea) {
                        replyArea.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const targetId = replyArea.dataset.scrollTo;
                            scrollToMessage(targetId);
                        });
                    }
                    
                    // 长按支持（移动端）- 防止触发浏览器默认行为
                    let longPressTimer;
                    let touchStarted = false;
                    let touchStartX = 0;
                    let touchStartY = 0;
                    
                    bubble.addEventListener('touchstart', (e) => {
                        touchStarted = true;
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                        longPressTimer = setTimeout(() => {
                            if (touchStarted) {
                                // 防止系统自动选择文本
                                if (window.getSelection) {
                                    window.getSelection().removeAllRanges();
                                }
                                showMessageContextMenu(msg, null, bubble);
                            }
                        }, 300);
                    }, { passive: true });
                    
                    bubble.addEventListener('touchmove', (e) => {
                        // 计算移动距离
                        const moveX = Math.abs(e.touches[0].clientX - touchStartX);
                        const moveY = Math.abs(e.touches[0].clientY - touchStartY);
                        
                        // 如果移动超过10px，认为是滚动，不是长按
                        if (moveX > 10 || moveY > 10) {
                            clearTimeout(longPressTimer);
                            touchStarted = false;
                        }
                    }, { passive: true });
                    
                    bubble.addEventListener('touchend', (e) => {
                        touchStarted = false;
                        clearTimeout(longPressTimer);
                        // 清除选择
                        if (window.getSelection) {
                            window.getSelection().removeAllRanges();
                        }
                    }, { passive: true });
                    
                    bubble.addEventListener('touchcancel', () => {
                        touchStarted = false;
                        clearTimeout(longPressTimer);
                    });
                    
                    // 鼠标长按支持
                    let mouseDownTimer;
                    bubble.addEventListener('mousedown', () => {
                        mouseDownTimer = setTimeout(() => {
                            // 防止系统自动选择文本
                            if (window.getSelection) {
                                window.getSelection().removeAllRanges();
                            }
                            const rect = bubble.getBoundingClientRect();
                            const event = new MouseEvent('contextmenu', {
                                bubbles: true,
                                cancelable: true,
                                clientX: rect.left + rect.width / 2,
                                clientY: rect.top + rect.height / 2
                            });
                            bubble.dispatchEvent(event);
                        }, 500);
                    });
                    
                    bubble.addEventListener('mouseup', () => {
                        clearTimeout(mouseDownTimer);
                    });
                    
                    bubble.addEventListener('mouseleave', () => {
                        clearTimeout(mouseDownTimer);
                    });
                }
                
                // 头像双击事件（触发AI回复）- 支持桌面端和手机端
                // 桌面端 dblclick
                bubble.addEventListener('dblclick', (e) => {
                    const av = e.target.closest('.chat-avatar');
                    if (av) {
                        e.preventDefault();
                        callApiWithConversation();
                    }
                });
                
                // 手机端双击检测（双 tap 计数器）
                let avatarTapCount = 0;
                let avatarTapTimer = null;
                bubble.addEventListener('touchend', (e) => {
                    const av = e.target.closest('.chat-avatar');
                    if (av) {
                        avatarTapCount++;
                        if (avatarTapCount === 1) {
                            avatarTapTimer = setTimeout(() => {
                                avatarTapCount = 0;
                            }, 300);
                        } else if (avatarTapCount === 2) {
                            clearTimeout(avatarTapTimer);
                            e.preventDefault();
                            callApiWithConversation();
                            avatarTapCount = 0;
                        }
                    }
                }, { passive: false });
                
                container.appendChild(bubble);
            });
            
            // 滚动到底部（多选模式下不滚动）
            if (!AppState.isSelectMode) {
                container.scrollTop = container.scrollHeight;
            }
        }

        function showMessageContextMenu(msg, mouseEvent, bubbleElement) {
            // 如果已有菜单，关闭它
            const existingMenu = document.getElementById('message-context-menu');
            if (existingMenu) existingMenu.remove();
            
            // 添加高亮背景
            if (bubbleElement) {
                bubbleElement.style.backgroundColor = 'rgba(0,0,0,0.05)';
            }
            
            const menu = document.createElement('div');
            menu.id = 'message-context-menu';
            menu.className = 'message-context-menu';
            
            // 确定菜单位置 - 在消息下方，避免超出屏幕
            let x, y;
            if (mouseEvent) {
                x = mouseEvent.clientX;
                y = mouseEvent.clientY;
            } else if (bubbleElement) {
                const rect = bubbleElement.getBoundingClientRect();
                x = rect.left + rect.width / 2;
                y = rect.bottom + 10;
            } else {
                x = window.innerWidth / 2;
                y = window.innerHeight / 2;
            }
            
            // 菜单宽度约140px，需要调整位置
            let menuLeft = Math.max(10, x - 70);
            let menuTop = y;
            
            // 检查是否超出屏幕底部
            const menuHeight = 180; // 估算菜单高度
            if (menuTop + menuHeight > window.innerHeight) {
                menuTop = window.innerHeight - menuHeight - 20;
            }
            
            menu.style.cssText = `
                position: fixed;
                left: ${menuLeft}px;
                top: ${menuTop}px;
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.12);
                z-index: 10000;
                max-width: 90vw;
                overflow: visible;
                animation: messageMenuSlideIn 0.2s ease-out;
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                padding: 6px;
            `;
            
            // 菜单项HTML - 支持复制、引用、删除、翻译、多选、撤回
            const isTextMessage = msg.type === 'received' || msg.type === 'sent';
            
            // 如果消息已撤回，只显示删除选项
            let menuItems = '';
            if (msg.isRetracted) {
                menuItems = `
                    <div class="msg-menu-item" onclick="deleteMessage('${msg.id}')">
                        <svg class="msg-menu-icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        <span>删除</span>
                    </div>
                `;
            } else {
                menuItems = `
                    <div class="msg-menu-item" onclick="addMessageToCollection('${msg.id}')">
                        <svg class="msg-menu-icon" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        <span>收藏</span>
                    </div>
                    <div class="msg-menu-item" onclick="editMessage('${msg.id}')">
                        <svg class="msg-menu-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        <span>修改</span>
                    </div>
                    <div class="msg-menu-item" onclick="copyMessage('${msg.id}')">
                        <svg class="msg-menu-icon" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <span>复制</span>
                    </div>
                    <div class="msg-menu-item" onclick="replyMessage('${msg.id}')">
                        <svg class="msg-menu-icon" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M11 7h6M11 11h3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"></path></svg>
                        <span>引用</span>
                    </div>
                    <div class="msg-menu-item" onclick="enterMessageMultiSelect('${msg.id}')">
                        <svg class="msg-menu-icon" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></g></svg>
                        <span>多选</span>
                    </div>
                    <div class="msg-menu-item" onclick="retractMessage('${msg.id}')">
                        <svg class="msg-menu-icon" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v6h-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                        <span>撤回</span>
                    </div>
                    <div class="msg-menu-item" onclick="deleteMessage('${msg.id}')">
                        <svg class="msg-menu-icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        <span>删除</span>
                    </div>
                    <div class="msg-menu-item" onclick="translateMessage('${msg.id}')">
                        <svg class="msg-menu-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8M9 9h6M9 15h6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"></path></svg>
                        <span>翻译</span>
                    </div>
                `;
            }
            
            menu.innerHTML = menuItems;
            document.body.appendChild(menu);
            
            // 添加样式
            if (!document.querySelector('style[data-message-menu]')) {
                const style = document.createElement('style');
                style.setAttribute('data-message-menu', 'true');
                style.textContent = `
                    @keyframes messageMenuSlideIn {
                        from {
                            opacity: 0;
                            transform: translateY(-10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    .message-context-menu {
                        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
                    }
                    
                    .msg-menu-item {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 4px;
                        padding: 8px 10px;
                        color: #333;
                        cursor: pointer;
                        transition: all 0.15s;
                        font-size: 11px;
                        border: 1px solid #e0e0e0;
                        border-radius: 6px;
                        background: white;
                        white-space: nowrap;
                        flex-shrink: 0;
                        min-width: fit-content;
                    }
                    
                    .msg-menu-item:hover {
                        background: #f5f5f5;
                        border-color: #bbb;
                    }
                    
                    .msg-menu-item:active {
                        background: #efefef;
                    }
                    
                    .msg-menu-icon {
                        width: 16px;
                        height: 16px;
                        stroke: #333;
                        stroke-width: 1.8;
                        fill: none;
                        stroke-linecap: round;
                        stroke-linejoin: round;
                        flex-shrink: 0;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // 点击外部关闭菜单
            const closeMenuHandler = (e) => {
                if (!e.target.closest('#message-context-menu')) {
                    menu.remove();
                    // 移除高亮背景
                    if (bubbleElement) {
                        bubbleElement.style.backgroundColor = '';
                    }
                    document.removeEventListener('click', closeMenuHandler);
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', closeMenuHandler);
            }, 100);
        }
        
        function copyMessage(msgId) {
            const allMessages = Object.values(AppState.messages).flat();
            const msg = allMessages.find(m => m.id === msgId);
            
            if (!msg) return;
            
            // 只支持文字消息复制
            if (msg.emojiUrl) {
                showToast('暂不支持复制该类型消息');
                return;
            }
            
            // 复制到剪贴板
            navigator.clipboard.writeText(msg.content).then(() => {
                showToast('复制成功');
                const menu = document.getElementById('message-context-menu');
                if (menu) menu.remove();
            }).catch(() => {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = msg.content;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showToast('复制成功');
                const menu = document.getElementById('message-context-menu');
                if (menu) menu.remove();
            });
        }

        // 滚动到指定消息
        function scrollToMessage(msgId) {
            const bubbleElement = document.querySelector(`[data-msg-id="${msgId}"]`);
            if (!bubbleElement) return;
            
            bubbleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 添加高亮效果
            bubbleElement.style.backgroundColor = 'rgba(0,0,0,0.08)';
            setTimeout(() => {
                bubbleElement.style.backgroundColor = '';
            }, 1500);
        }
        
        function replyMessage(msgId) {
            const allMessages = Object.values(AppState.messages).flat();
            const msg = allMessages.find(m => m.id === msgId);
            if (!msg || !AppState.currentChat) return;
            
            const chatInput = document.getElementById('chat-input');
            const quoteContainer = document.getElementById('quote-message-bar-container');
            if (!chatInput || !quoteContainer) return;
            
            // 关闭菜单
            const menu = document.getElementById('message-context-menu');
            if (menu) menu.remove();
            
            // 记录引用的消息ID到输入框的数据属性
            chatInput.dataset.replyToId = msgId;
            
            // 获取消息内容摘要和作者
            let summary = '';
            if (msg.emojiUrl) {
                summary = '[表情包]';
            } else if (msg.isImage && msg.imageData) {
                summary = '[图片]';
            } else {
                summary = msg.content.substring(0, 30);
                if (msg.content.length > 30) summary += '...';
            }
            const author = msg.type === 'sent' ? AppState.user.name : AppState.currentChat.name;
            
            // 更新引用消息显示区域
            const quoteContent = document.getElementById('quote-content');
            if (quoteContent) {
                quoteContent.innerHTML = `<strong style="color:#333;">${author}:</strong> ${escapeHtml(summary)}`;
                quoteContent.title = `${author}: ${msg.content}`; // 长按时显示完整内容
            }
            
            // 显示引用消息栏容器
            if (quoteContainer) quoteContainer.style.display = 'block';
            
            // 聚焦输入框
            chatInput.focus();
        }

        function deleteMessage(msgId) {
            // 显示确认对话框
            showConfirmDialog('是否删除该条消息？删除后不可撤回', function() {
                if (!AppState.currentChat) return;
                const messages = AppState.messages[AppState.currentChat.id] || [];
                const index = messages.findIndex(m => m.id === msgId);
                
                if (index > -1) {
                    messages.splice(index, 1);
                    saveToStorage();
                    renderChatMessages();
                    showToast('消息已删除');
                }
                
                // 关闭菜单
                const menu = document.getElementById('message-context-menu');
                if (menu) menu.remove();
            });
        }

        function retractMessage(msgId) {
            // 显示确认对话框
            showConfirmDialog('撤回该条消息？撤回后将用占位符替代', function() {
                if (!AppState.currentChat) return;
                const messages = AppState.messages[AppState.currentChat.id] || [];
                const msgIndex = messages.findIndex(m => m.id === msgId);
                
                if (msgIndex > -1) {
                    const originalMsg = messages[msgIndex];
                    const isOwnMessage = originalMsg.type === 'sent';
                    const characterName = (AppState.currentChat && AppState.currentChat.name) || 'AI';
                    const retractText = isOwnMessage ? '你撤回了一条消息' : `${characterName}撤回了一条消息`;
                    
                    // 创建撤回占位符消息
                    const retractMsg = {
                        id: msgId,
                        type: originalMsg.type,
                        content: retractText,
                        timestamp: originalMsg.timestamp,
                        isRetracted: true,
                        retractedContent: originalMsg.content  // 保存被撤回的内容（供AI知道内容但用户看不到）
                    };
                    
                    // 替换原消息
                    messages[msgIndex] = retractMsg;
                    
                    // 如果是用户发送的消息被撤回，需要告知AI这个消息被撤回了
                    if (isOwnMessage) {
                        // 在会话中添加系统消息告知AI
                        const systemNotification = {
                            id: 'sys_retract_' + msgId,
                            type: 'system',
                            content: `[系统通知] 用户撤回了一条消息，该消息内容为：${originalMsg.content}`,
                            timestamp: Date.now()
                        };
                        messages.push(systemNotification);
                    }
                    
                    saveToStorage();
                    renderChatMessages();
                    showToast('消息已撤回');
                }
                
                // 关闭菜单
                const menu = document.getElementById('message-context-menu');
                if (menu) menu.remove();
            });
        }

        function editMessage(msgId) {
            if (!AppState.currentChat) return;
            const messages = AppState.messages[AppState.currentChat.id] || [];
            const msg = messages.find(m => m.id === msgId);
            
            if (!msg) return;
            
            // 关闭菜单
            const menu = document.getElementById('message-context-menu');
            if (menu) menu.remove();
            
            // 创建编辑对话框
            const modal = document.createElement('div');
            modal.id = 'edit-message-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
            `;
            
            modal.innerHTML = `
                <div style="background: white; border-radius: 12px; padding: 20px; min-width: 300px; max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                    <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #333;">修改消息</h3>
                    <textarea id="edit-msg-input" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical; min-height: 100px; box-sizing: border-box;">${escapeHtml(msg.content)}</textarea>
                    <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
                        <button onclick="document.getElementById('edit-message-modal').remove();" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px;">取消</button>
                        <button onclick="saveEditedMessage('${msgId}', document.getElementById('edit-msg-input').value);" style="padding: 8px 16px; border: none; border-radius: 6px; background: #000; color: #fff; cursor: pointer; font-size: 14px;">保存</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            document.getElementById('edit-msg-input').focus();
            
            // 点击外部关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        function saveEditedMessage(msgId, newContent) {
            if (!AppState.currentChat) return;
            const messages = AppState.messages[AppState.currentChat.id] || [];
            const msg = messages.find(m => m.id === msgId);
            
            if (!msg || !newContent.trim()) return;
            
            msg.content = newContent;
            msg.isEdited = true;
            
            saveToStorage();
            renderChatMessages();
            showToast('消息已修改');
            
            // 关闭编辑对话框
            const modal = document.getElementById('edit-message-modal');
            if (modal) modal.remove();
        }

        function enterMessageMultiSelect(msgId) {
            AppState.isSelectMode = true;
            AppState.selectedMessages = [msgId];
            
            renderChatMessages();
            showMultiSelectToolbar();
            
            // 关闭菜单
            const menu = document.getElementById('message-context-menu');
            if (menu) menu.remove();
        }

        function toggleMessageSelection(msgId) {
            const index = AppState.selectedMessages.indexOf(msgId);
            if (index > -1) {
                AppState.selectedMessages.splice(index, 1);
            } else {
                AppState.selectedMessages.push(msgId);
            }
            
            // 如果没有选中任何消息，退出多选模式
            if (AppState.selectedMessages.length === 0) {
                AppState.isSelectMode = false;
                const toolbar = document.getElementById('msg-multi-select-toolbar');
                if (toolbar) toolbar.remove();
            }
            
            renderChatMessages();
            updateMultiSelectToolbar();
        }

        function updateMultiSelectToolbar() {
            const toolbar = document.getElementById('msg-multi-select-toolbar');
            if (toolbar) {
                const deleteBtn = toolbar.querySelector('#msg-delete-selected-btn');
                const forwardBtn = toolbar.querySelector('#msg-forward-selected-btn');
                const countSpan = toolbar.querySelector('#msg-select-count');
                
                const count = AppState.selectedMessages.length;
                if (deleteBtn) deleteBtn.textContent = `删除 (${count})`;
                if (forwardBtn) forwardBtn.textContent = `转发 (${count})`;
                if (countSpan) countSpan.textContent = count;
            }
        }

        function deleteSelectedMessages() {
            if (AppState.selectedMessages.length === 0) return;
            
            showConfirmDialog(`删除${AppState.selectedMessages.length}条消息？删除后不可撤回`, function() {
                if (!AppState.currentChat) return;
                
                const messages = AppState.messages[AppState.currentChat.id] || [];
                AppState.selectedMessages.forEach(msgId => {
                    const index = messages.findIndex(m => m.id === msgId);
                    if (index > -1) {
                        messages.splice(index, 1);
                    }
                });
                
                AppState.selectedMessages = [];
                AppState.isSelectMode = false;
                
                saveToStorage();
                renderChatMessages();
                
                const toolbar = document.getElementById('msg-multi-select-toolbar');
                if (toolbar) toolbar.remove();
                
                showToast('消息已删除');
            });
        }

        function forwardSelectedMessages() {
            if (AppState.selectedMessages.length === 0) return;
            if (!AppState.currentChat) return;
            
            const messages = AppState.messages[AppState.currentChat.id] || [];
            const selectedMsgs = messages.filter(m => AppState.selectedMessages.includes(m.id));
            
            // 创建转发选择弹窗
            const modal = document.createElement('div');
            modal.id = 'forward-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: flex-end;
                z-index: 10001;
            `;
            
            let conversationOptions = '';
            AppState.conversations.forEach(conv => {
                conversationOptions += `
                    <div class="forward-option" onclick="executeForward('${conv.id}')">
                        <div class="forward-option-avatar" style="width:40px;height:40px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                            ${conv.avatar ? `<img src="${conv.avatar}" style="width:100%;height:100%;object-fit:cover;">` : (conv.name ? conv.name.charAt(0) : '用')}
                        </div>
                        <div class="forward-option-info">
                            <div style="font-weight:bold;font-size:14px;">${conv.name || '未命名'}</div>
                            <div style="font-size:12px;color:#999;">${conv.type === 'group' ? '群聊' : '对话'}</div>
                        </div>
                    </div>
                `;
            });
            
            modal.innerHTML = `
                <div style="width:100%;background:#fff;border-radius:12px 12px 0 0;max-height:70vh;display:flex;flex-direction:column;animation:slideUp 0.3s ease-out;">
                    <div style="padding:16px;border-bottom:1px solid #f0f0f0;font-weight:bold;font-size:16px;">
                        转发到
                        <button onclick="document.getElementById('forward-modal').remove()" style="position:absolute;right:16px;top:16px;background:none;border:none;font-size:20px;cursor:pointer;">×</button>
                    </div>
                    <div style="flex:1;overflow-y:auto;padding:8px 0;">
                        ${conversationOptions || '<div style="text-align:center;padding:20px;color:#999;">没有可转发的对话</div>'}
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 添加样式
            if (!document.querySelector('style[data-forward-modal]')) {
                const style = document.createElement('style');
                style.setAttribute('data-forward-modal', 'true');
                style.textContent = `
                    .forward-option {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 16px;
                        cursor: pointer;
                        transition: background 0.15s;
                    }
                    
                    .forward-option:hover {
                        background: #f5f5f5;
                    }
                    
                    .forward-option:active {
                        background: #efefef;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // 点击外部关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        function executeForward(targetConvId) {
            if (!AppState.currentChat) return;
            
            const sourceConv = AppState.conversations.find(c => c.id === AppState.currentChat.id);
            const targetConv = AppState.conversations.find(c => c.id === targetConvId);
            if (!sourceConv || !targetConv) return;
            
            const messages = AppState.messages[AppState.currentChat.id] || [];
            const selectedMsgs = messages.filter(m => AppState.selectedMessages.includes(m.id));
            
            if (selectedMsgs.length === 0) return;
            
            // 创建转发消息内容（参考QQ转发格式）
            const forwardContent = selectedMsgs.map(msg => {
                const prefix = msg.type === 'sent' ? '你' : sourceConv.name;
                return `${prefix}: ${msg.content}`;
            }).join('\n');
            
            // 改进的转发消息格式
            const forwardMessage = {
                id: generateId(),
                type: 'sent',
                content: forwardContent,
                timestamp: new Date().toISOString(),
                isForwarded: true,
                sourceConvId: AppState.currentChat.id,
                sourceConvName: sourceConv.name,
                forwardedMessageCount: selectedMsgs.length,
                forwardHeaderText: `【来自与${sourceConv.name}的聊天记录】`
            };
            
            // 将转发消息添加到目标对话
            if (!AppState.messages[targetConvId]) {
                AppState.messages[targetConvId] = [];
            }
            AppState.messages[targetConvId].push(forwardMessage);
            
            // 退出多选模式
            AppState.selectedMessages = [];
            AppState.isSelectMode = false;
            const toolbar = document.getElementById('msg-multi-select-toolbar');
            if (toolbar) toolbar.remove();
            
            const modal = document.getElementById('forward-modal');
            if (modal) modal.remove();
            
            saveToStorage();
            showToast(`已转发 ${selectedMsgs.length} 条消息到 ${targetConv.name}`);
        }

        function exitMultiSelectMode() {
            AppState.isSelectMode = false;
            AppState.selectedMessages = [];
            
            const toolbar = document.getElementById('msg-multi-select-toolbar');
            if (toolbar) toolbar.remove();
            
            renderChatMessages();
        }

        function selectAllMessages() {
            if (!AppState.currentChat) return;
            
            const messages = AppState.messages[AppState.currentChat.id] || [];
            AppState.selectedMessages = messages.map(m => m.id);
            
            renderChatMessages();
            updateMultiSelectToolbar();
        }

        function showMultiSelectToolbar() {
            let toolbar = document.getElementById('msg-multi-select-toolbar');
            if (toolbar) toolbar.remove();
            
            toolbar = document.createElement('div');
            toolbar.id = 'msg-multi-select-toolbar';
            toolbar.style.cssText = `
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #fff;
                border-top: 1px solid #ddd;
                padding: 12px;
                display: flex;
                gap: 8px;
                justify-content: space-between;
                align-items: center;
                z-index: 9999;
                animation: slideUp 0.2s ease-out;
            `;
            
            toolbar.innerHTML = `
                <button onclick="selectAllMessages()" style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;background:#f5f5f5;cursor:pointer;font-size:14px;">全选</button>
                <div style="flex:1;text-align:center;font-size:14px;color:#666;">已选择 <span id="msg-select-count">1</span> 条</div>
                <button id="msg-forward-selected-btn" onclick="forwardSelectedMessages()" style="padding:8px 12px;border:1px solid #0066cc;border-radius:6px;background:#0066cc;color:#fff;cursor:pointer;font-size:14px;">转发 (1)</button>
                <button onclick="exitMultiSelectMode()" style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;background:#f5f5f5;cursor:pointer;font-size:14px;">取消</button>
                <button id="msg-delete-selected-btn" onclick="deleteSelectedMessages()" style="padding:8px 12px;border:1px solid #f44;border-radius:6px;background:#f44;color:#fff;cursor:pointer;font-size:14px;">删除 (1)</button>
            `;
            
            document.body.appendChild(toolbar);
        }

        function cancelMessageMultiSelect() {
            AppState.isSelectMode = false;
            AppState.selectedMessages = [];
            
            const toolbar = document.getElementById('msg-multi-select-toolbar');
            if (toolbar) toolbar.remove();
            
            renderChatMessages();
        }

        function translateMessage(msgId) {
            const allMessages = Object.values(AppState.messages).flat();
            const msg = allMessages.find(m => m.id === msgId);
            
            if (!msg) return;
            
            // 只支持文字消息翻译
            if (msg.emojiUrl) {
                showToast('暂不支持翻译该类型消息');
                const menu = document.getElementById('message-context-menu');
                if (menu) menu.remove();
                return;
            }
            
            const content = msg.content;
            
            // 检测是否为中文
            const chineseRegex = /[\u4E00-\u9FFF]/g;
            const isChinese = chineseRegex.test(content);
            
            if (isChinese) {
                // 如果是中文，显示选择菜单（英文、火星文）
                showChineseTranslationOptions(msg);
            } else {
                // 翻译为中文
                showToast('翻译中...');
                translateToChineseViaAPI(content, msg);
            }
            
            // 关闭菜单
            const menu = document.getElementById('message-context-menu');
            if (menu) menu.remove();
        }

        // 显示中文翻译选项菜单 - 位置在消息气泡正下方，按钮横向排列
        function showChineseTranslationOptions(msg) {
            const menu = document.getElementById('message-context-menu');
            if (menu) menu.remove();
            
            // 查找对应的消息气泡元素
            const bubbleElement = document.querySelector(`[data-msg-id="${msg.id}"]`);
            let positionTop = window.innerHeight / 2;
            let positionLeft = window.innerWidth / 2;
            
            if (bubbleElement) {
                const rect = bubbleElement.getBoundingClientRect();
                positionTop = rect.bottom + 8;  // 气泡正下方
                positionLeft = rect.left + rect.width / 2;  // 水平居中
            }
            
            const optionsMenu = document.createElement('div');
            optionsMenu.id = 'translation-options-menu';
            optionsMenu.style.cssText = `
                position: fixed;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 8px 4px;
                z-index: 10001;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                display: flex;
                gap: 4px;
                flex-wrap: wrap;
                max-width: 200px;
                justify-content: center;
                top: ${positionTop}px;
                left: ${positionLeft}px;
                transform: translateX(-50%);
            `;
            
            const options = [
                { label: '英文', action: () => { showToast('翻译中...'); translateToEnglishViaAPI(msg.content, msg); } },
                { label: '火星文', action: () => convertToMartianText(msg) }
            ];
            
            options.forEach(opt => {
                const item = document.createElement('button');
                item.style.cssText = `
                    padding: 6px 12px;
                    cursor: pointer;
                    user-select: none;
                    transition: all 0.2s;
                    font-size: 13px;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    background: white;
                    color: #333;
                    white-space: nowrap;
                    flex-shrink: 0;
                `;
                item.textContent = opt.label;
                item.onmouseover = () => {
                    item.style.background = '#f5f5f5';
                    item.style.borderColor = '#bbb';
                };
                item.onmouseout = () => {
                    item.style.background = 'white';
                    item.style.borderColor = '#e0e0e0';
                };
                item.onclick = (e) => {
                    e.stopPropagation();
                    opt.action();
                    optionsMenu.remove();
                    // 移除全局点击监听
                    document.removeEventListener('click', closeTranslationMenuHandler);
                };
                optionsMenu.appendChild(item);
            });
            
            document.body.appendChild(optionsMenu);
            
            // 点击屏幕其他位置关闭弹窗
            const closeTranslationMenuHandler = (e) => {
                if (!optionsMenu.contains(e.target)) {
                    optionsMenu.remove();
                    document.removeEventListener('click', closeTranslationMenuHandler);
                }
            };
            
            // 延迟添加监听器，防止当前点击立即触发
            setTimeout(() => {
                document.addEventListener('click', closeTranslationMenuHandler);
            }, 100);
        }

        // 转换为火星文
        function convertToMartianText(msg) {
            const content = msg.content;
            
            // 火星文转换映射表
            const martianMap = {
                '爱': '愛♡',
                '你': '妳',
                '我': '莪',
                '是': '昰',
                '的': '哋',
                '吗': '嘛',
                '吧': '罷',
                '了': '喇',
                '都': '兜',
                '很': '很~',
                '好': '吙',
                '大': '夶',
                '小': '尛',
                '真': '眞',
                '非': '非~',
                '不': '卟',
                '没': '莫',
                '有': '洧',
                '和': '啝',
                '与': '澸',
                '在': '佒',
                '到': '刀',
                '过': '過',
                '给': '給',
                '向': '姠',
                '从': '徣',
                '让': '讓',
                '把': '菶',
                '被': '被~',
                '为': '為',
                '因': '茵',
                '所': '蘇',
                '其': '洒',
                '他': '彵',
                '她': '彤',
                '他们': '彵們',
                '她们': '彤們',
                '我们': '莪們',
                '你们': '妳們',
                '这': '這',
                '那': '那~',
                '样': '樣',
                '些': '谢',
                '两': '両',
                '五': '⑤',
                '八': '⑧',
                '十': '⑩'
            };
            
            let result = content;
            
            // 先替换多字词
            Object.entries(martianMap)
                .sort((a, b) => b[0].length - a[0].length)
                .forEach(([key, value]) => {
                    result = result.replace(new RegExp(key, 'g'), value);
                });
            
            // 添加火星文特效符号
            result = result.split('').map(char => {
                // 随机添加一些符号装饰（概率30%）
                if (Math.random() < 0.15 && /[\u4E00-\u9FFF]/.test(char)) {
                    const symbols = ['~', '♡', '✨', '*', '¨'];
                    return char + symbols[Math.floor(Math.random() * symbols.length)];
                }
                return char;
            }).join('');
            
            msg.translation = {
                sourceLanguage: '简体中文',
                targetLanguage: '火星文',
                result: result
            };
            
            saveToStorage();
            renderChatMessages();
            showToast('转换完成');
        }

        // ===== 副API调用函数 =====
        // 统一的副API调用方法
        function callSecondaryAPI(messages, systemPrompt, onSuccess, onError, timeout = 30000) {
            console.log('🔗 副API调用开始:', {
                messageCount: messages.length,
                hasSystemPrompt: !!systemPrompt,
                timeout: timeout
            });
            
            const api = AppState.apiSettings || {};
            
            if (!api.secondaryEndpoint || !api.secondaryApiKey || !api.secondarySelectedModel) {
                const errorMsg = '副API未配置';
                console.error('❌ ' + errorMsg);
                showToast('请先在API设置中配置副API端点、密钥和模型');
                if (onError) onError(errorMsg);
                return;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const normalized = api.secondaryEndpoint.replace(/\/$/, '');
            const baseEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
            const endpoint = baseEndpoint + '/chat/completions';
            
            console.log('📤 副API请求信息:', {
                endpoint: endpoint,
                model: api.secondarySelectedModel,
                messageCount: messages.length
            });

            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.secondaryApiKey}`
                },
                body: JSON.stringify({
                    model: api.secondarySelectedModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages
                    ],
                    temperature: 0.7,
                    max_tokens: 10000
                }),
                signal: controller.signal
            })
            .then(res => {
                clearTimeout(timeoutId);
                console.log('📥 副API响应状态:', res.status, res.statusText);
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.json();
            })
            .then(data => {
                console.log('✅ 副API返回JSON:', {
                    hasChoices: !!data.choices,
                    choicesCount: data.choices ? data.choices.length : 0,
                    firstChoicePreview: data.choices && data.choices[0] ? String(data.choices[0]).substring(0, 100) : null
                });
                
                if (data.choices && data.choices[0]) {
                    const result = data.choices[0].message.content;
                    console.log('✨ 副API成功返回内容，长度:', result.length);
                    if (onSuccess) onSuccess(result);
                } else {
                    throw new Error('响应格式错误：无法找到choices');
                }
            })
            .catch(err => {
                clearTimeout(timeoutId);
                console.error('❌ 副API调用失败:', err.name, err.message);
                if (err.name === 'AbortError') {
                    const errorMsg = '副API请求超时';
                    showToast(errorMsg);
                    if (onError) onError(errorMsg);
                } else if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                    const errorMsg = '副API错误: CORS或网络问题';
                    showToast(errorMsg);
                    if (onError) onError(errorMsg);
                } else {
                    showToast(`副API错误: ${err.message}`);
                    if (onError) onError(err.message);
                }
                console.error('副API调用错误:', err);
            });
        }

        // ========== 【新副API架构】：动态提示词辅助函数 ==========
        
        /**
         * 通用副API调用辅助函数 - 支持动态提示词和功能选择
         * @param {string} content - 要处理的内容
         * @param {string} promptType - 提示词类型：'translate', 'summarize', 'translateChinese', 'translateEnglish' 等
         * @param {function} onSuccess - 成功回调
         * @param {function} onError - 失败回调
         */
        function callSecondaryAPIWithDynamicPrompt(content, promptType = 'translate', onSuccess, onError) {
            console.log('🔗 副API动态提示词调用开始:', {
                promptType: promptType,
                contentLength: content.length
            });
            
            const api = AppState.apiSettings || {};
            
            if (!api.secondaryEndpoint || !api.secondaryApiKey || !api.secondarySelectedModel) {
                const errorMsg = '副API未配置';
                console.error('❌ ' + errorMsg);
                showToast('副API未配置，请在设置中填写');
                if (onError) onError(errorMsg);
                return;
            }

            // 获取提示词（优先从动态设置中获取，再从预设中获取）
            let systemPrompt = '';
            
            if (AppState.apiSettings.secondaryPrompts && AppState.apiSettings.secondaryPrompts[promptType]) {
                systemPrompt = AppState.apiSettings.secondaryPrompts[promptType];
                console.log('✅ 使用自定义动态提示词:', promptType);
            } else {
                // 预设提示词映射
                const defaultPrompts = {
                    'translate': '你是一个翻译助手。将用户提供的文本翻译成合适的语言。只返回翻译结果，不要有其他内容。',
                    'translateEnglish': '你是一个翻译助手。将用户提供的中文文本翻译成英文。只返回翻译结果，不要有其他内容。',
                    'translateChinese': '你是一个翻译助手。将用户提供的非中文文本翻译成简体中文。只返回翻译结果，不要有其他内容。',
                    'summarize': '你是一个专业的对话总结员。请为下面的内容生成一份简洁准确的总结。总结应该：1. 抓住核心内容和主题；2. 保留重要信息；3. 简洁明了，长度适中（200-300字）；4. 用简体中文撰写。'
                };
                systemPrompt = defaultPrompts[promptType] || defaultPrompts['translate'];
                console.log('⚙️ 使用预设提示词:', promptType);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const normalized = api.secondaryEndpoint.replace(/\/$/, '');
            const baseEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
            const endpoint = baseEndpoint + '/chat/completions';
            
            console.log('📤 副API请求信息:', {
                endpoint: endpoint,
                model: api.secondarySelectedModel,
                promptType: promptType
            });

            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.secondaryApiKey}`
                },
                body: JSON.stringify({
                    model: api.secondarySelectedModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: content }
                    ],
                    temperature: 0.7,
                    max_tokens: 10000
                }),
                signal: controller.signal
            })
            .then(res => {
                clearTimeout(timeoutId);
                console.log('📥 副API响应状态:', res.status, res.statusText);
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.json();
            })
            .then(data => {
                console.log('✅ 副API返回数据 [' + promptType + ']');
                
                if (data.choices && data.choices[0]) {
                    const result = data.choices[0].message.content;
                    console.log('✨ 副API成功返回内容，长度:', result.length);
                    if (onSuccess) onSuccess(result);
                } else {
                    throw new Error('响应格式错误：无法找到choices');
                }
            })
            .catch(err => {
                clearTimeout(timeoutId);
                console.error('❌ 副API调用失败 [' + promptType + ']:', err.name, err.message);
                if (err.name === 'AbortError') {
                    const errorMsg = '副API请求超时';
                    if (onError) onError(errorMsg);
                } else if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                    const errorMsg = '副API错误: CORS或网络问题';
                    if (onError) onError(errorMsg);
                } else {
                    if (onError) onError(err.message);
                }
                console.error('副API错误详情:', err);
            });
        }

        // ========== 副API功能函数：翻译 ==========
        function translateTextViaSecondaryAPI(text, targetLanguage = 'English', onSuccess, onError) {
            console.log('🌍 调用副API翻译:', {
                textLength: text.length,
                targetLanguage: targetLanguage
            });
            
            let promptType = 'translate';
            if (targetLanguage === 'English' || targetLanguage === 'english' || targetLanguage === '英文') {
                promptType = 'translateEnglish';
            } else if (targetLanguage === 'Chinese' || targetLanguage === 'chinese' || targetLanguage === '中文') {
                promptType = 'translateChinese';
            }
            
            callSecondaryAPIWithDynamicPrompt(text, promptType, onSuccess, onError);
        }

        // ========== 副API功能函数：自动总结 ==========
        function summarizeTextViaSecondaryAPI(text, onSuccess, onError) {
            console.log('📝 调用副API总结:', {
                textLength: text.length
            });
            
            callSecondaryAPIWithDynamicPrompt(text, 'summarize', onSuccess, onError);
        }

        // ========== 副API功能函数：总结对话 ==========
        function summarizeConversationViaSecondaryAPI(convId, onSuccess, onError) {
            const msgs = AppState.messages[convId] || [];
            
            if (msgs.length === 0) {
                showToast('没有消息可以总结');
                if (onError) onError('No messages to summarize');
                return;
            }
            
            // 收集对话内容
            let conversationText = '';
            msgs.forEach(m => {
                if (m.type === 'sent') {
                    conversationText += `用户: ${m.content}\n`;
                } else if (m.type === 'received') {
                    conversationText += `角色: ${m.content}\n`;
                }
            });
            
            console.log('📝 准备总结对话，内容长度:', conversationText.length);
            
            summarizeTextViaSecondaryAPI(conversationText, onSuccess, onError);
        }

        // ========== 【新架构】心声提取已移至主API响应处理 ==========
        // collectConversationForSecondaryAPI 和 generateCharacterMindStateViaSecondaryAPI 已删除
        // 原因：心声现在直接从主API响应中提取（见 extractMindStateFromText 函数）

        // ========== 【新架构】翻译消息 - 使用副API动态提示词 ==========
        function translateMessageViaSecondaryAPI(msgId, targetLanguage = '英文') {
            const allMessages = Object.values(AppState.messages).flat();
            const msg = allMessages.find(m => m.id === msgId);
            
            if (!msg) return;

            if (msg.emojiUrl) {
                showToast('暂不支持翻译该类型消息');
                return;
            }

            const content = msg.content;
            const targetLang = targetLanguage === '英文' ? 'English' : 'Chinese';
            
            showToast('翻译中...');

            translateTextViaSecondaryAPI(
                content,
                targetLang,
                (result) => {
                    msg.translation = {
                        sourceLanguage: targetLanguage === '英文' ? '简体中文' : '其他语言',
                        targetLanguage: targetLanguage,
                        result: result
                    };
                    saveToStorage();
                    renderChatMessages();
                    showToast('翻译完成');
                },
                (error) => {
                    console.error('翻译出错:', error);
                    showToast('翻译失败: ' + error);
                }
            );
        }

        // ========== 【新架构】手动总结对话 - 使用副API动态提示词 ==========
        function summarizeConversationViaSecondaryAPINew(convId, isAutomatic = false) {
            const conv = AppState.conversations.find(c => c.id === convId);
            if (!conv) {
                showToast('对话未找到');
                return;
            }

            const msgs = AppState.messages[convId] || [];
            if (msgs.length === 0) {
                showToast('对话消息为空，无法生成总结');
                return;
            }

            // 收集对话内容
            let conversationText = '';
            msgs.forEach(m => {
                if (m.type === 'sent' && !m.isRetracted) {
                    conversationText += `用户: ${m.content}\n`;
                } else if (m.type === 'received' && !m.isRetracted) {
                    conversationText += `角色: ${m.content}\n`;
                }
            });

            showToast(isAutomatic ? '正在自动总结...' : '正在生成总结...');

            summarizeTextViaSecondaryAPI(
                conversationText,
                (result) => {
                    if (!conv.summaries) {
                        conv.summaries = [];
                    }
                    
                    conv.summaries.push({
                        content: result,
                        isAutomatic: isAutomatic,
                        timestamp: new Date().toISOString(),
                        messageCount: msgs.length
                    });
                    
                    saveToStorage();
                    showToast('总结已生成');
                    
                    // 触发重新渲染UI
                    if (AppState.currentChat && AppState.currentChat.id === convId) {
                        renderChatMessages();
                    }
                    renderConversations();
                },
                (error) => {
                    console.error('总结出错:', error);
                    showToast('总结失败: ' + error);
                }
            );
        }

        // ========== 【新架构】翻译消息 - 使用副API动态提示词 ==========
        function translateMessageViaSecondaryAPI(msgId, targetLanguage = '英文') {
            const allMessages = Object.values(AppState.messages).flat();
            const msg = allMessages.find(m => m.id === msgId);
            
            if (!msg) return;

            if (msg.emojiUrl) {
                showToast('暂不支持翻译该类型消息');
                return;
            }

            const content = msg.content;
            const targetLang = targetLanguage === '英文' ? 'English' : 'Chinese';
            
            showToast('翻译中...');

            translateTextViaSecondaryAPI(
                content,
                targetLang,
                (result) => {
                    msg.translation = {
                        sourceLanguage: targetLanguage === '英文' ? '简体中文' : '其他语言',
                        targetLanguage: targetLanguage,
                        result: result
                    };
                    saveToStorage();
                    renderChatMessages();
                    showToast('翻译完成');
                },
                (error) => {
                    console.error('翻译出错:', error);
                    showToast('翻译失败: ' + error);
                }
            );
        }

        function translateToEnglishViaAPI(text, msg) {
            // ========== 【新架构】使用副API动态提示词翻译 ==========
            showToast('翻译中...');
            
            translateTextViaSecondaryAPI(
                text,
                'Chinese',
                (result) => {
                    msg.translation = {
                        sourceLanguage: '非中文',
                        targetLanguage: 'Chinese',
                        result: result
                    };
                    saveToStorage();
                    renderChatMessages();
                    showToast('翻译完成');
                },
                (error) => {
                    console.error('翻译出错:', error);
                    showToast('翻译失败: ' + error);
                }
            );
        }

        function sendMessage() {
            const input = document.getElementById('chat-input');
            const content = input.value.trim();
            
            if (!content || !AppState.currentChat) return;
            
            // 从数据属性中获取引用的消息ID（来自reply-bar）
            const replyToId = input.dataset.replyToId;
            
            // 添加用户消息
            const userMsg = {
                id: 'msg_' + Date.now(),
                type: 'sent',
                content: content,
                time: new Date().toISOString(),
                replyTo: replyToId || undefined
            };
            
            if (!AppState.messages[AppState.currentChat.id]) {
                AppState.messages[AppState.currentChat.id] = [];
            }
            
            AppState.messages[AppState.currentChat.id].push(userMsg);
            
            // 更新会话
            const conv = AppState.conversations.find(c => c.id === AppState.currentChat.id);
            if (conv) {
                conv.lastMsg = content;
                conv.time = formatTime(new Date());
                conv.lastMessageTime = userMsg.time;  // 保存完整时间戳用于排序
            }
            
            saveToStorage();
            renderChatMessages();
            renderConversations();
            
            // 清空输入
            input.value = '';
            input.style.height = 'auto';
            input.placeholder = '输入消息...双击任意头像触发角色回复';
            
            // 移除引用显示栏（旧版本）和隐藏新版引用栏
            const replyBar = document.getElementById('reply-bar');
            if (replyBar) replyBar.remove();
            const quoteBar = document.getElementById('quote-message-bar');
            if (quoteBar) quoteBar.style.display = 'none';
            delete input.dataset.replyToId;
        }

        
        function handleToolbarFileSelect(files, mode = 'with-description') {
            if (!files || files.length === 0) return;
            if (!AppState.currentChat) {
                showToast('请先打开会话再发送图片');
                return;
            }
            
            // 读取第一个文件
            const file = files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                const imageData = e.target.result;
                
                if (mode === 'no-description') {
                    // 直接发送，不显示描述对话框
                    sendPhotoWithDescription(imageData, '');
                } else {
                    // 显示拍照描述弹窗
                    showPhotoDescriptionDialog(imageData);
                }
            };
            reader.readAsDataURL(file);
        }
        
        function showPhotoDescriptionDialog(imageData) {
            let modal = document.getElementById('photo-description-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'photo-description-modal';
            modal.className = 'emoji-mgmt-modal show';
            modal.style.cssText = 'background:rgba(0,0,0,0.7);';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            // 保存imageData到全局变量以便在发送时使用
            window.currentPhotoData = imageData;
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:300px;background:#fff;border-radius:12px;overflow:hidden;">
                    <div style="padding:16px;text-align:center;border-bottom:1px solid #e8e8e8;">
                        <h3 style="margin:0;font-size:16px;color:#333;font-weight:600;">描述图片内容</h3>
                    </div>
                    <div style="padding:16px;">
                        <textarea id="photo-desc-input" placeholder="请描述这张图片的内容..." style="width:100%;height:100px;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px;resize:vertical;"></textarea>
                    </div>
                    <div style="padding:12px;border-top:1px solid #e8e8e8;display:flex;gap:8px;justify-content:flex-end;">
                        <button onclick="document.getElementById('photo-description-modal').remove();" style="padding:8px 16px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:13px;">取消</button>
                        <button onclick="sendPhotoWithDescription(window.currentPhotoData);" style="padding:8px 16px;border:none;border-radius:4px;background:#000;color:#fff;cursor:pointer;font-size:13px;">发送</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            document.getElementById('photo-desc-input').focus();
        }
        
        function sendPhotoWithDescription(imageData, descFromParam) {
            let desc = '';
            
            // 如果参数中有描述，使用参数中的描述（直接发送模式）
            if (typeof descFromParam !== 'undefined') {
                desc = descFromParam;
            } else {
                // 否则从输入框获取描述（有对话框模式）
                const descInput = document.getElementById('photo-desc-input');
                desc = descInput ? descInput.value.trim() : '';
            }
            
            if (!AppState.currentChat) {
                showToast('会话已关闭');
                return;
            }
            
            if (!AppState.messages[AppState.currentChat.id]) {
                AppState.messages[AppState.currentChat.id] = [];
            }
            
            // 发送消息：包含图片和描述
            // 如果有描述，使用描述；如果没有，显示[图片]
            const messageContent = desc || '[图片]';
            
            const msg = {
                id: 'msg_' + Date.now(),
                type: 'sent',
                content: messageContent,
                imageData: imageData,  // 保存图片数据
                isImage: true,
                photoDescription: desc,  // 保存图片描述（AI后台读取）
                time: new Date().toISOString()
            };
            
            AppState.messages[AppState.currentChat.id].push(msg);
            
            const conv = AppState.conversations.find(c => c.id === AppState.currentChat.id);
            if (conv) {
                conv.lastMsg = '[图片]';
                conv.time = formatTime(new Date());
                conv.lastMessageTime = msg.time;  // 保存完整时间戳用于排序
            }
            
            saveToStorage();
            renderChatMessages();
            renderConversations();
            
            // 关闭弹窗
            const modal = document.getElementById('photo-description-modal');
            if (modal) modal.remove();
        }

        // 个性名片编辑
        function openCardEditPage() {
            document.getElementById('card-edit-page').classList.add('open');
        }

        function closeCardEditPage() {
            document.getElementById('card-edit-page').classList.remove('open');
        }

        let currentPickerType = '';
        let currentPickerCharId = '';  // 用于追踪角色头像编辑
        let isFromCharacterSettings = false;  // 标记是否从角色设置页面调用

        function openImagePicker(type, fromCharSettings = false) {
            isFromCharacterSettings = fromCharSettings;
            currentPickerType = type;
            document.getElementById('picker-title').textContent = type === 'avatar' ? '选择头像' : '选择背景图';
            document.getElementById('picker-url-input').classList.add('hidden');
            document.getElementById('picker-url-confirm').classList.add('hidden');
            document.getElementById('picker-url-input').value = '';
            document.getElementById('image-picker-modal').classList.add('show');
        }

        function closeImagePicker() {
            document.getElementById('image-picker-modal').classList.remove('show');
            // 重置文件input，使得同一个文件可以再次被选择
            const fileInput = document.getElementById('picker-file-input');
            if (fileInput) {
                fileInput.value = '';
            }
            currentPickerType = '';
            currentPickerCharId = '';
            isFromCharacterSettings = false;
            // 关闭图片选择器后再次保存，确保所有更改都被持久化
            saveToStorage();
        }

        function handlePickerFileSelect(file) {
            if (!file) {
                showToast('未选择文件');
                return;
            }
            
            // 检查文件类型
            if (!file.type.startsWith('image/')) {
                showToast('请选择图片文件');
                return;
            }
            
            const reader = new FileReader();
            reader.onerror = function() {
                showToast('文件读取失败');
            };
            reader.onload = function(e) {
                applyImage(e.target.result);
            };
            reader.readAsDataURL(file);
        }

        function handlePickerUrlConfirm() {
            const url = document.getElementById('picker-url-input').value.trim();
            if (url) {
                applyImage(url);
            }
        }

        function applyImage(imageUrl) {
            if (currentPickerType === 'avatar') {
                // 侧边栏头像编辑 - 仅修改侧边栏头像，不影响对话页面
                console.log('正在应用新头像:', imageUrl);
                AppState.user.avatar = imageUrl;
                saveToStorage();
                updateUserDisplay();
                console.log('头像已应用并保存');
                
                // 同步到朋友圈
                if (typeof momentsManager !== 'undefined') {
                    momentsManager.syncAvatarToSidebar(imageUrl);
                    // 重新渲染朋友圈以更新评论框头像
                    momentsManager.renderMoments();
                }
                
                // 实时更新角色卡编辑页面的预览
                if (document.getElementById('card-edit-page').classList.contains('open')) {
                    const previewAvatar = document.getElementById('card-edit-preview-avatar');
                    if (previewAvatar) {
                        previewAvatar.innerHTML = `<img src="${imageUrl}" alt="">`;
                    }
                    const editAvatarSmall = document.getElementById('edit-avatar-small');
                    if (editAvatarSmall) {
                        editAvatarSmall.innerHTML = `<img src="${imageUrl}" alt="">`;
                    }
                }
                
                // 注意：不重新渲染聊天消息，保持对话页面头像独立
            } else if (currentPickerType === 'user-avatar' || currentPickerType === 'chat-page-user-avatar') {
                // 对话页面的用户头像编辑 - 只影响当前对话，不影响侧边栏
                if (!AppState.currentChat) {
                    console.warn('未选择对话，无法应用用户头像');
                    closeImagePicker();
                    return;
                }
                
                console.log('正在应用聊天页面用户头像:', imageUrl);
                // 保存到当前对话的userAvatar字段
                AppState.currentChat.userAvatar = imageUrl;
                saveToStorage();
                console.log('聊天页面用户头像已应用并保存');
                
                // 实时更新角色设置页面的预览
                const userAvatarDisplay = document.getElementById('settings-user-avatar-display');
                if (userAvatarDisplay) {
                    userAvatarDisplay.innerHTML = `<img src="${imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
                }
                
                // 重新渲染聊天消息以更新用户头像
                renderChatMessages();
            } else if (currentPickerType === 'bg') {
                console.log('正在应用新背景图:', imageUrl);
                AppState.user.bgImage = imageUrl;
                console.log('背景图已设置:', imageUrl);
                saveToStorage();
                console.log('背景图已保存到localStorage');
                updateUserDisplay();
                console.log('UI已更新');
                
                // 实时更新角色卡编辑页面的背景预览
                if (document.getElementById('card-edit-page').classList.contains('open')) {
                    const editPreview = document.getElementById('card-edit-preview');
                    if (editPreview) {
                        editPreview.style.backgroundImage = `url(${imageUrl})`;
                    }
                }
            } else if (currentPickerType === 'character-avatar') {
                // 角色头像同步逻辑
                const charId = currentPickerCharId;
                if (!charId) {
                    console.warn('未指定角色ID，无法应用角色头像');
                    closeImagePicker();
                    return;
                }
                
                console.log('正在应用角色头像:', charId, imageUrl);
                // 更新conversation中的avatar
                const conv = AppState.conversations.find(c => c.id === charId);
                if (conv) {
                    conv.avatar = imageUrl;
                    console.log('已更新conversation头像');
                }
                
                // 同时更新friend中的avatar
                const friend = AppState.friends.find(f => f.id === charId);
                if (friend) {
                    friend.avatar = imageUrl;
                    console.log('已更新friend头像');
                }
                
                // 同时更新group中的avatar
                const group = AppState.groups.find(g => g.id === charId);
                if (group) {
                    group.avatar = imageUrl;
                    console.log('已更新group头像');
                }
                
                saveToStorage();
                console.log('角色头像已保存');
                
                // 重新渲染所有受影响的组件
                if (AppState.currentTab === 'msg-page') {
                    renderConversations();
                }
                renderFriends();
                renderGroups();
                
                // 实时更新角色设置页面的预览
                const charAvatarDisplay = document.getElementById('settings-char-avatar-display');
                if (charAvatarDisplay) {
                    charAvatarDisplay.innerHTML = `<img src="${imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
                }
                
                // 如果当前在聊天页面，重新渲染消息和消息列表
                if (AppState.currentChat && (AppState.currentChat.id === charId || AppState.currentChat.convId === charId)) {
                    AppState.currentChat.avatar = imageUrl;
                    const convId = AppState.currentChat.id || AppState.currentChat.convId;
                    renderChatMessages(convId);
                    // 更新聊天标题和信息显示
                    const chatTitleEl = document.getElementById('chat-title');
                    if (chatTitleEl) {
                        const avatarContainer = chatTitleEl.querySelector('.chat-avatar-container');
                        if (avatarContainer) {
                            if (imageUrl) {
                                avatarContainer.innerHTML = `<img src="${imageUrl}" alt="">`;
                            } else {
                                avatarContainer.textContent = (AppState.currentChat.name || '').charAt(0);
                            }
                        }
                    }
                }
            }
            
            closeImagePicker();
        }

        function editUserName() {
            const newName = prompt('请输入新昵称', AppState.user.name);
            if (newName && newName.trim()) {
                AppState.user.name = newName.trim();
                saveToStorage();
                updateUserDisplay();
                // 同步到朋友圈
                if (typeof momentsManager !== 'undefined') {
                    momentsManager.syncNameToSidebar(newName.trim());
                    // 重新渲染朋友圈页面以更新所有显示的名字
                    momentsManager.renderMoments();
                }
            }
        }

        function editUserSignature() {
            const newSig = prompt('请输入个性签名', AppState.user.signature);
            if (newSig !== null) {
                AppState.user.signature = newSig.trim();
                saveToStorage();
                updateUserDisplay();
            }
        }

        // 角色头像编辑
        function openImagePickerForCharacter(type, charId) {
            const char = AppState.conversations.find(c => c.id === charId);
            if (!char) return;
            
            currentPickerType = 'character-avatar';
            currentPickerCharId = charId;
            document.getElementById('picker-title').textContent = '选择角色头像';
            document.getElementById('picker-url-input').classList.add('hidden');
            document.getElementById('picker-url-confirm').classList.add('hidden');
            document.getElementById('picker-url-input').value = '';
            document.getElementById('image-picker-modal').classList.add('show');
        }

        // 更多功能设置
        function openMoreSettings() {
            updateDynamicFuncList();
            document.getElementById('more-settings-modal').classList.add('show');
        }

        function closeMoreSettings() {
            document.getElementById('more-settings-modal').classList.remove('show');
            updateDynamicFuncList();
        }

        // 工具函数
        // ---------- API 设置相关 ----------
        function initApiSettingsUI() {
            // 将存储的设置填入界面
            loadApiSettingsToUI();
            initPromptUI();
            
            // 初始化预设选择器
            initApiPresetUI();
            
            // 如果已有API设置和模型列表，则不需要重新拉取（提高稳定性）
            // 只在用户点击"拉取模型"时才手动拉取
            
            // 添加按钮事件
            const addPromptBtn = document.getElementById('add-prompt-btn');
            if (addPromptBtn) {
                addPromptBtn.addEventListener('click', function() {
                    openAddPromptDialog();
                });
            }
            
            const promptListBtn = document.getElementById('prompt-list-btn');
            if (promptListBtn) {
                promptListBtn.addEventListener('click', function() {
                    openPromptListManager();
                });
            }
            
            const promptsSelect = document.getElementById('prompts-select');
            if (promptsSelect) {
                promptsSelect.addEventListener('change', function() {
                    AppState.apiSettings.selectedPromptId = this.value;
                    displayCurrentPrompt();
                    saveToStorage();
                });
            }
            
            // API预设管理按钮 - 使用事件委托确保手机端可用
            const apiPresetBtn = document.getElementById('api-preset-btn');
            if (apiPresetBtn) {
                apiPresetBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    openApiPresetManager();
                }, false);
            }

            // 副API拉取模型按钮
            const pullSecondaryModelsBtn = document.getElementById('pull-secondary-models-btn');
            if (pullSecondaryModelsBtn) {
                pullSecondaryModelsBtn.addEventListener('click', function() { 
                    fetchSecondaryModels(); 
                }, false);
            }

            // 副API密钥显示/隐藏切换
            const secondaryApiKeyToggle = document.getElementById('secondary-api-key-toggle');
            if (secondaryApiKeyToggle) {
                secondaryApiKeyToggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const keyInput = document.getElementById('secondary-api-key');
                    if (keyInput) {
                        if (keyInput.type === 'password') {
                            keyInput.type = 'text';
                            secondaryApiKeyToggle.textContent = '隐藏';
                        } else {
                            keyInput.type = 'password';
                            secondaryApiKeyToggle.textContent = '显示';
                        }
                    }
                }, false);
            }
            
            // 添加全局按钮处理 - 确保在手机端也能工作
            setupGlobalButtonHandlers();
        }
        
        // 全局按钮处理器 - 用于处理动态生成的按钮
        function setupGlobalButtonHandlers() {
            document.removeEventListener('click', globalButtonHandler);
            document.addEventListener('click', globalButtonHandler, true);
        }
        
        function globalButtonHandler(e) {
            const target = e.target.closest('button');
            if (!target) return;
            
            const id = target.id;
            const onclick = target.getAttribute('onclick');
            
            // 处理预设管理按钮
            if (id === 'api-preset-btn' || target.textContent.includes('预设管理')) {
                e.preventDefault();
                e.stopPropagation();
                openApiPresetManager();
                return;
            }
        }
        
        // 初始化API预设选择器
        function initApiPresetUI() {
            // 初始化预设列表
            AppState.apiSettings = AppState.apiSettings || {};
            if (!AppState.apiSettings.presets) {
                AppState.apiSettings.presets = [];
            }
            if (!AppState.apiSettings.currentPresetId) {
                AppState.apiSettings.currentPresetId = null;
            }
        }
        
        // 打开API预设管理器
        function openApiPresetManager() {
            let modal = document.getElementById('api-preset-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'api-preset-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            const presets = AppState.apiSettings.presets || [];
            
            let presetList = '<div style="padding:12px;">';
            
            presets.forEach((preset, index) => {
                presetList += `
                    <div style="padding:12px;background:#f9f9f9;border-radius:4px;margin-bottom:8px;border-left:3px solid #333;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <div style="font-weight:bold;color:#333;margin-bottom:4px;">${preset.name}</div>
                            <div style="display:flex;gap:4px;">
                                <button class="emoji-mgmt-btn" style="padding:4px 8px;font-size:12px;height:auto;" onclick="selectApiPreset('${preset.id}');">使用</button>
                                <button class="emoji-mgmt-btn" style="padding:4px 8px;font-size:12px;height:auto;" onclick="editApiPreset('${preset.id}');">编辑</button>
                                <button class="emoji-mgmt-btn" style="padding:4px 8px;font-size:12px;height:auto;" onclick="deleteApiPreset('${preset.id}');">删除</button>
                            </div>
                        </div>
                        <div style="font-size:12px;color:#666;"><strong>主API</strong></div>
                        <div style="font-size:12px;color:#666;margin-left:8px;">端点：${preset.endpoint}</div>
                        <div style="font-size:12px;color:#666;margin-left:8px;">密钥：${preset.apiKey.substring(0, 10)}***</div>
                        <div style="font-size:12px;color:#666;margin-left:8px;margin-bottom:8px;">模型：${preset.selectedModel || '未选择'}</div>
                        ${preset.secondaryEndpoint ? `
                        <div style="font-size:12px;color:#666;"><strong>副API</strong></div>
                        <div style="font-size:12px;color:#666;margin-left:8px;">端点：${preset.secondaryEndpoint}</div>
                        <div style="font-size:12px;color:#666;margin-left:8px;">密钥：${preset.secondaryApiKey ? preset.secondaryApiKey.substring(0, 10) + '***' : '未配置'}</div>
                        <div style="font-size:12px;color:#666;margin-left:8px;">模型：${preset.secondarySelectedModel || '未选择'}</div>
                        ` : ''}
                    </div>
                `;
            });
            
            if (presets.length === 0) {
                presetList += '<div style="text-align:center;color:#999;padding:20px;font-size:13px;">暂无预设，点击"新增预设"创建</div>';
            }
            
            presetList += '</div>';
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:400px;max-height:80vh;overflow-y:auto;">
                    <div class="emoji-mgmt-header">
                        <h3 style="margin:0;">API 预设管理</h3>
                        <button class="emoji-mgmt-close" onclick="document.getElementById('api-preset-modal').remove();">
                            <svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div style="padding:12px;border-bottom:1px solid #e8e8e8;">
                        <button class="emoji-mgmt-btn" style="width:100%;padding:10px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;" onclick="createNewApiPreset();">新增预设</button>
                    </div>
                    <div style="flex:1;overflow-y:auto;">
                        ${presetList}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // 创建新API预设
        function createNewApiPreset() {
            const name = prompt('请输入预设名称：');
            if (!name) return;
            
            const endpoint = document.getElementById('api-endpoint').value.trim();
            const apiKey = document.getElementById('api-key').value.trim();
            const selectedModel = document.getElementById('models-select').value;
            const secondaryEndpoint = document.getElementById('secondary-api-endpoint').value.trim();
            const secondaryApiKey = document.getElementById('secondary-api-key').value.trim();
            const secondarySelectedModel = document.getElementById('secondary-models-select').value;
            
            if (!endpoint || !apiKey) {
                showToast('请先填写主API端点和密钥');
                return;
            }
            
            const preset = {
                id: 'preset_' + Date.now(),
                name: name,
                endpoint: endpoint,
                apiKey: apiKey,
                selectedModel: selectedModel,
                secondaryEndpoint: secondaryEndpoint,
                secondaryApiKey: secondaryApiKey,
                secondarySelectedModel: secondarySelectedModel,
                createdAt: new Date().toISOString()
            };
            
            AppState.apiSettings.presets = AppState.apiSettings.presets || [];
            AppState.apiSettings.presets.push(preset);
            
            saveToStorage();
            openApiPresetManager();
            showToast('预设已创建');
        }
        
        // 使用API预设
        function selectApiPreset(presetId) {
            const preset = (AppState.apiSettings.presets || []).find(p => p.id === presetId);
            if (!preset) return;
            
            // 加载主API预设数据到表单
            document.getElementById('api-endpoint').value = preset.endpoint;
            document.getElementById('api-key').value = preset.apiKey;
            
            // 加载副API预设数据到表单
            if (preset.secondaryEndpoint) {
                document.getElementById('secondary-api-endpoint').value = preset.secondaryEndpoint;
            }
            if (preset.secondaryApiKey) {
                document.getElementById('secondary-api-key').value = preset.secondaryApiKey;
            }
            
            AppState.apiSettings.currentPresetId = presetId;
            AppState.apiSettings.endpoint = preset.endpoint;
            AppState.apiSettings.apiKey = preset.apiKey;
            AppState.apiSettings.secondaryEndpoint = preset.secondaryEndpoint || '';
            AppState.apiSettings.secondaryApiKey = preset.secondaryApiKey || '';
            
            // 自动拉取模型列表
            fetchModelsForPreset(preset);
            
            saveToStorage();
            loadApiSettingsToUI();
            document.getElementById('api-preset-modal').remove();
            showToast(`已加载预设：${preset.name}，正在拉取模型...`);
        }
        
        // 为预设自动拉取模型
        async function fetchModelsForPreset(preset) {
            if (!preset.endpoint) return;
            
            // 规范化端点：移除末尾斜杠，并确保包含 /v1
            const normalized = preset.endpoint.replace(/\/$/, '');
            const normalizedEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
            
            const tryUrl = normalizedEndpoint + '/models';
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                
                const res = await fetch(tryUrl, {
                    headers: Object.assign(
                        { 'Content-Type': 'application/json' },
                        preset.apiKey ? { 'Authorization': 'Bearer ' + preset.apiKey } : {}
                    ),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (!res.ok) {
                    console.warn('fetch models failed:', tryUrl, res.status);
                    showToast(`拉取模型失败: HTTP ${res.status}`);
                    return;
                }
                
                const data = await res.json();
                let models = [];
                
                if (Array.isArray(data.data)) {
                    models = data.data.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name) }));
                } else if (Array.isArray(data.models)) {
                    models = data.models.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name) }));
                } else if (Array.isArray(data)) {
                    models = data.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name || m) }));
                }
                
                if (models.length > 0) {
                    AppState.apiSettings.models = models;
                    
                    // 如果预设有指定模型，使用该模型；否则使用第一个
                    if (preset.selectedModel && models.some(m => m.id === preset.selectedModel)) {
                        AppState.apiSettings.selectedModel = preset.selectedModel;
                    } else {
                        AppState.apiSettings.selectedModel = models[0].id;
                        // 更新预设中的selectedModel
                        const presets = AppState.apiSettings.presets || [];
                        const presetIndex = presets.findIndex(p => p.id === preset.id);
                        if (presetIndex !== -1) {
                            presets[presetIndex].selectedModel = models[0].id;
                        }
                    }
                    
                    // 同时拉取副API的模型（如果副API有配置）
                    if (preset.secondaryEndpoint && preset.secondaryApiKey) {
                        await fetchSecondaryModelsForPreset(preset);
                    }
                    
                    saveToStorage();
                    loadApiSettingsToUI();
                    showToast(`已拉取到 ${models.length} 个模型，并自动保存`);
                } else {
                    showToast('未能拉取到模型，请检查端点与密钥');
                }
            } catch (e) {
                if (e.name === 'AbortError') {
                    showToast('拉取模型超时（30秒）');
                    console.error('fetch models timeout:', e);
                } else if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
                    showToast('拉取模型失败: CORS 或网络问题');
                    console.error('fetch models CORS/network error:', e);
                } else {
                    console.error('fetch models for preset failed:', e);
                    showToast(`拉取模型失败: ${e.message}`);
                }
            }
        }

        // 为预设拉取副API模型
        async function fetchSecondaryModelsForPreset(preset) {
            if (!preset.secondaryEndpoint || !preset.secondaryApiKey) return;
            
            // 规范化端点：移除末尾斜杠，并确保包含 /v1
            const normalized = preset.secondaryEndpoint.replace(/\/$/, '');
            const normalizedEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
            
            const tryUrl = normalizedEndpoint + '/models';
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                
                const res = await fetch(tryUrl, {
                    headers: Object.assign(
                        { 'Content-Type': 'application/json' },
                        preset.secondaryApiKey ? { 'Authorization': 'Bearer ' + preset.secondaryApiKey } : {}
                    ),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (!res.ok) {
                    console.warn('fetch secondary models failed:', tryUrl, res.status);
                    return;
                }
                
                const data = await res.json();
                let models = [];
                
                if (Array.isArray(data.data)) {
                    models = data.data.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name) }));
                } else if (Array.isArray(data.models)) {
                    models = data.models.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name) }));
                } else if (Array.isArray(data)) {
                    models = data.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name || m) }));
                }
                
                if (models.length > 0) {
                    AppState.apiSettings.secondaryModels = models;
                    
                    // 如果预设有指定副模型，使用该模型；否则使用第一个
                    if (preset.secondarySelectedModel && models.some(m => m.id === preset.secondarySelectedModel)) {
                        AppState.apiSettings.secondarySelectedModel = preset.secondarySelectedModel;
                    } else {
                        AppState.apiSettings.secondarySelectedModel = models[0].id;
                        // 更新预设中的secondarySelectedModel
                        const presets = AppState.apiSettings.presets || [];
                        const presetIndex = presets.findIndex(p => p.id === preset.id);
                        if (presetIndex !== -1) {
                            presets[presetIndex].secondarySelectedModel = models[0].id;
                        }
                    }
                }
            } catch (e) {
                console.warn('fetch secondary models for preset failed:', e);
            }
        }
        
        // 删除API预设
        function deleteApiPreset(presetId) {
            if (!confirm('确定要删除该预设吗？')) return;
            
            AppState.apiSettings.presets = (AppState.apiSettings.presets || []).filter(p => p.id !== presetId);
            
            if (AppState.apiSettings.currentPresetId === presetId) {
                AppState.apiSettings.currentPresetId = null;
            }
            
            saveToStorage();
            openApiPresetManager();
            showToast('预设已删除');
        }

        function editApiPreset(presetId) {
            const preset = (AppState.apiSettings.presets || []).find(p => p.id === presetId);
            if (!preset) {
                showToast('预设不存在');
                return;
            }

            const modalHTML = `
                <div id="api-preset-edit-modal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:50001;padding:20px;">
                    <div style="background:white;border-radius:8px;padding:20px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;">
                        <h3 style="margin-top:0;margin-bottom:20px;color:#333;">编辑预设</h3>
                        
                        <div style="margin-bottom:15px;">
                            <label style="display:block;margin-bottom:5px;color:#666;font-weight:bold;">预设名称</label>
                            <input type="text" id="edit-preset-name" value="${preset.name}" placeholder="预设名称" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;font-size:14px;">
                        </div>

                        <div style="margin-bottom:20px;border-bottom:1px solid #e0e0e0;padding-bottom:15px;">
                            <h4 style="margin:0 0 10px 0;color:#333;font-size:14px;">主API设置</h4>
                            <div style="margin-bottom:10px;">
                                <label style="display:block;margin-bottom:5px;color:#666;font-weight:bold;font-size:12px;">端点</label>
                                <input type="text" id="edit-api-endpoint" value="${preset.endpoint}" placeholder="https://api.example.com/v1" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;font-size:14px;">
                            </div>
                            <div style="margin-bottom:10px;">
                                <label style="display:block;margin-bottom:5px;color:#666;font-weight:bold;font-size:12px;">密钥</label>
                                <input type="password" id="edit-api-key" value="${preset.apiKey}" placeholder="sk-..." style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;font-size:14px;">
                                <button style="margin-top:5px;padding:4px 8px;background:#f0f0f0;border:1px solid #ccc;border-radius:4px;font-size:12px;cursor:pointer;" onclick="toggleEditApiKeyVisibility('edit-api-key')">显示</button>
                            </div>
                        </div>

                        <div style="margin-bottom:20px;">
                            <h4 style="margin:0 0 10px 0;color:#333;font-size:14px;">副API设置（可选）</h4>
                            <div style="margin-bottom:10px;">
                                <label style="display:block;margin-bottom:5px;color:#666;font-weight:bold;font-size:12px;">端点</label>
                                <input type="text" id="edit-secondary-api-endpoint" value="${preset.secondaryEndpoint || ''}" placeholder="https://api.example.com（可选）" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;font-size:14px;">
                            </div>
                            <div style="margin-bottom:10px;">
                                <label style="display:block;margin-bottom:5px;color:#666;font-weight:bold;font-size:12px;">密钥</label>
                                <input type="password" id="edit-secondary-api-key" value="${preset.secondaryApiKey || ''}" placeholder="副API密钥（可选）" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;font-size:14px;">
                                <button style="margin-top:5px;padding:4px 8px;background:#f0f0f0;border:1px solid #ccc;border-radius:4px;font-size:12px;cursor:pointer;" onclick="toggleEditApiKeyVisibility('edit-secondary-api-key')">显示</button>
                            </div>
                        </div>

                        <div style="display:flex;gap:10px;justify-content:flex-end;">
                            <button style="padding:8px 16px;background:#f0f0f0;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:14px;" onclick="document.getElementById('api-preset-edit-modal').remove();">取消</button>
                            <button style="padding:8px 16px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;" onclick="saveApiPresetEdit('${presetId}');">保存</button>
                        </div>
                    </div>
                </div>
            `;

            const modal = document.createElement('div');
            modal.innerHTML = modalHTML;
            document.body.appendChild(modal.firstElementChild);

            // 防止模态框关闭时冒泡
            document.getElementById('api-preset-edit-modal').addEventListener('click', function(e) {
                if (e.target === this) {
                    this.remove();
                }
            });
        }

        function toggleEditApiKeyVisibility(inputId) {
            const keyInput = document.getElementById(inputId);
            const btn = event.target;
            if (keyInput.type === 'password') {
                keyInput.type = 'text';
                btn.textContent = '隐藏';
            } else {
                keyInput.type = 'password';
                btn.textContent = '显示';
            }
        }

        function saveApiPresetEdit(presetId) {
            const name = document.getElementById('edit-preset-name').value.trim();
            const endpoint = document.getElementById('edit-api-endpoint').value.trim();
            const apiKey = document.getElementById('edit-api-key').value.trim();
            const secondaryEndpoint = document.getElementById('edit-secondary-api-endpoint').value.trim();
            const secondaryApiKey = document.getElementById('edit-secondary-api-key').value.trim();

            if (!name || !endpoint || !apiKey) {
                showToast('请填写所有必填项（主API端点和密钥）');
                return;
            }

            const presets = AppState.apiSettings.presets || [];
            const presetIndex = presets.findIndex(p => p.id === presetId);
            
            if (presetIndex !== -1) {
                presets[presetIndex].name = name;
                presets[presetIndex].endpoint = endpoint;
                presets[presetIndex].apiKey = apiKey;
                presets[presetIndex].secondaryEndpoint = secondaryEndpoint;
                presets[presetIndex].secondaryApiKey = secondaryApiKey;
                AppState.apiSettings.presets = presets;
                
                saveToStorage();
                document.getElementById('api-preset-edit-modal').remove();
                openApiPresetManager();
                showToast('预设已保存');
            }
        }

        function loadApiSettingsToUI() {
            try {
                const s = AppState.apiSettings || {};
                const endpointEl = document.getElementById('api-endpoint');
                const keyEl = document.getElementById('api-key');
                const selEl = document.getElementById('models-select');
                const displayEl = document.getElementById('selected-model-display');
                const aiToggle = document.getElementById('ai-time-aware');
                const contextLinesEl = document.getElementById('context-lines-input');
                const apiKeyToggle = document.getElementById('api-key-toggle');

                if (endpointEl) endpointEl.value = s.endpoint || '';
                
                // API密钥默认隐藏
                if (keyEl) {
                    keyEl.value = s.apiKey || '';
                    keyEl.type = 'password';  // 默认隐藏
                }
                
                if (apiKeyToggle) {
                    apiKeyToggle.textContent = '显示';  // 默认状态为隐藏
                }
                
                if (aiToggle) aiToggle.checked = !!s.aiTimeAware;
                
                // 上下文条数
                if (contextLinesEl) {
                    contextLinesEl.value = s.contextLines || 200;
                }

                if (selEl) {
                    selEl.innerHTML = '';
                    if (s.models && s.models.length) {
                        s.models.forEach(m => {
                            const opt = document.createElement('option');
                            opt.value = m.id || m;
                            opt.textContent = m.id || m;
                            selEl.appendChild(opt);
                        });
                        selEl.value = s.selectedModel || (s.models[0] && (s.models[0].id || s.models[0]));
                    }
                }

                if (displayEl) displayEl.textContent = s.selectedModel || '未选择';

                // 加载副API设置到UI
                const secondaryEndpointEl = document.getElementById('secondary-api-endpoint');
                const secondaryKeyEl = document.getElementById('secondary-api-key');
                const secondarySelEl = document.getElementById('secondary-models-select');
                const secondaryDisplayEl = document.getElementById('secondary-selected-model-display');
                const secondaryKeyToggle = document.getElementById('secondary-api-key-toggle');

                if (secondaryEndpointEl) secondaryEndpointEl.value = s.secondaryEndpoint || '';
                
                if (secondaryKeyEl) {
                    secondaryKeyEl.value = s.secondaryApiKey || '';
                    secondaryKeyEl.type = 'password';  // 默认隐藏
                }
                
                if (secondaryKeyToggle) {
                    secondaryKeyToggle.textContent = '显示';  // 默认状态为隐藏
                }

                if (secondarySelEl) {
                    secondarySelEl.innerHTML = '';
                    if (s.secondaryModels && s.secondaryModels.length) {
                        s.secondaryModels.forEach(m => {
                            const opt = document.createElement('option');
                            opt.value = m.id || m;
                            opt.textContent = m.id || m;
                            secondarySelEl.appendChild(opt);
                        });
                        secondarySelEl.value = s.secondarySelectedModel || (s.secondaryModels[0] && (s.secondaryModels[0].id || s.secondaryModels[0]));
                    }
                }

                if (secondaryDisplayEl) secondaryDisplayEl.textContent = s.secondarySelectedModel || '未选择';
            } catch (e) { console.error(e); }
        }

        function initPromptUI() {
            try {
                const s = AppState.apiSettings || {};
                const promptsSelect = document.getElementById('prompts-select');
                
                if (promptsSelect) {
                    promptsSelect.innerHTML = '';
                    
                  
                    
                    // 添加自定义提示词选项
                    if (s.prompts && s.prompts.length) {
                        s.prompts.forEach(p => {
                            const opt = document.createElement('option');
                            opt.value = p.id;
                            opt.textContent = p.name || '未命名提示词';
                            promptsSelect.appendChild(opt);
                        });
                    }
                    
                    // 设置当前选中的提示词
                    promptsSelect.value = s.selectedPromptId || '__default__';
                }
                
                displayCurrentPrompt();
            } catch (e) { console.error(e); }
        }

        function displayCurrentPrompt() {
            try {
                const s = AppState.apiSettings || {};
                const displayEl = document.getElementById('current-prompt-display');
                
                if (!displayEl) return;
                
                let promptContent = '';
                if (s.selectedPromptId === '__default__' || !s.selectedPromptId) {
                    promptContent = s.defaultPrompt || '暂无提示词';
                } else {
                    const prompt = (s.prompts || []).find(p => p.id === s.selectedPromptId);
                    promptContent = prompt ? prompt.content : '提示词不存在';
                }
                
                displayEl.textContent = promptContent;
            } catch (e) { console.error(e); }
        }

        function openAddPromptDialog() {
            let modal = document.getElementById('add-prompt-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'add-prompt-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:500px;max-height:90vh;overflow-y:auto;">
                    <div class="emoji-mgmt-header">
                        <h3 style="margin:0;">新增提示词</h3>
                        <button class="emoji-mgmt-close" onclick="document.getElementById('add-prompt-modal').remove();">
                            <svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div style="padding:16px;flex:1;overflow-y:auto;">
                        <div style="margin-bottom:12px;">
                            <label style="display:block;color:#333;font-size:13px;margin-bottom:4px;">提示词名称</label>
                            <input type="text" id="prompt-name-input" placeholder="例如：角色卡模式" class="group-input" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="display:block;color:#333;font-size:13px;margin-bottom:4px;">提示词内容</label>
                            <textarea id="prompt-content-input" placeholder="输入提示词内容..." style="width:100%;min-height:200px;padding:8px;border:1px solid #ddd;border-radius:4px;font-family:monospace;font-size:12px;resize:vertical;"></textarea>
                        </div>
                        <div style="display:flex;gap:8px;justify-content:flex-end;">
                            <button class="emoji-mgmt-btn" onclick="document.getElementById('add-prompt-modal').remove();">取消</button>
                            <button class="emoji-mgmt-btn" style="background:#000;color:#fff;" onclick="saveNewPrompt();">保存</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        function saveNewPrompt() {
            const nameInput = document.getElementById('prompt-name-input');
            const contentInput = document.getElementById('prompt-content-input');
            
            const name = (nameInput ? nameInput.value.trim() : '').trim();
            const content = (contentInput ? contentInput.value.trim() : '').trim();
            
            if (!name || !content) {
                showToast('请填写提示词名称和内容');
                return;
            }
            
            AppState.apiSettings = AppState.apiSettings || {};
            AppState.apiSettings.prompts = AppState.apiSettings.prompts || [];
            
            const newPrompt = {
                id: 'prompt_' + Date.now(),
                name: name,
                content: content,
                category: '自定义',
                createdAt: new Date().toISOString()
            };
            
            AppState.apiSettings.prompts.push(newPrompt);
            AppState.apiSettings.selectedPromptId = newPrompt.id;
            
            saveToStorage();
            initPromptUI();
            document.getElementById('add-prompt-modal').remove();
            showToast('提示词已保存');
        }

        function openPromptListManager() {
            let modal = document.getElementById('prompt-list-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'prompt-list-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            const prompts = AppState.apiSettings && AppState.apiSettings.prompts ? AppState.apiSettings.prompts : [];
            
            let promptList = '<div style="padding:12px;">';
            
           
            
            // 自定义提示词
            prompts.forEach(p => {
                promptList += `
                    <div style="padding:12px;background:#f9f9f9;border-radius:4px;margin-bottom:8px;border-left:3px solid #000;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                            <div style="font-weight:bold;color:#333;">${p.name}</div>
                            <button class="emoji-mgmt-btn" style="padding:4px 8px;font-size:12px;height:auto;" onclick="deletePrompt('${p.id}');">删除</button>
                        </div>
                        <div style="font-size:12px;color:#999;margin-bottom:8px;">${p.category || '自定义'}</div>
                        <div style="font-size:12px;color:#666;white-space:pre-wrap;max-height:100px;overflow-y:auto;">${p.content}</div>
                    </div>
                `;
            });
            
            promptList += '</div>';
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:600px;max-height:90vh;overflow-y:auto;">
                    <div class="emoji-mgmt-header">
                        <h3 style="margin:0;">提示词列表</h3>
                        <button class="emoji-mgmt-close" onclick="document.getElementById('prompt-list-modal').remove();">
                            <svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div style="flex:1;overflow-y:auto;">
                        ${promptList}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        function deletePrompt(promptId) {
            if (!confirm('确定要删除该提示词吗？')) return;
            
            AppState.apiSettings = AppState.apiSettings || {};
            AppState.apiSettings.prompts = (AppState.apiSettings.prompts || []).filter(p => p.id !== promptId);
            
       
            // 更新列表
            const listModal = document.getElementById('prompt-list-modal');
            if (listModal) {
                openPromptListManager();
            }
        }

        // ===== 世界书UI初始化 =====
        function initWorldbookUI() {
            try {
                const addBtn = document.getElementById('worldbook-add-btn');
                if (addBtn) {
                    addBtn.addEventListener('click', openAddWorldbookDialog);
                }
                
                const importBtn = document.getElementById('worldbook-import-btn');
                if (importBtn) {
                    importBtn.addEventListener('click', function() {
                        document.getElementById('worldbook-import-input').click();
                    });
                }
                
                const importInput = document.getElementById('worldbook-import-input');
                if (importInput) {
                    importInput.addEventListener('change', function(e) {
                        handleWorldbookImport(e.target.files);
                        this.value = '';  // 重置文件输入
                    });
                }
                
                // 初始化渲染世界书列表
                renderWorldbooks();
            } catch (e) {
                console.error('初始化世界书UI失败:', e);
            }
        }

        function saveApiSettingsFromUI() {
            const endpoint = (document.getElementById('api-endpoint') || {}).value || '';
            const apiKey = (document.getElementById('api-key') || {}).value || '';
            const selected = (document.getElementById('models-select') || {}).value || '';
            const aiTime = !!((document.getElementById('ai-time-aware') || {}).checked);
            const contextLines = parseInt((document.getElementById('context-lines-input') || {}).value || 200);

            // 副API设置
            const secondaryEndpoint = (document.getElementById('secondary-api-endpoint') || {}).value || '';
            const secondaryApiKey = (document.getElementById('secondary-api-key') || {}).value || '';
            const secondarySelected = (document.getElementById('secondary-models-select') || {}).value || '';

            AppState.apiSettings = AppState.apiSettings || {};
            AppState.apiSettings.endpoint = endpoint.trim();
            AppState.apiSettings.apiKey = apiKey.trim();
            AppState.apiSettings.selectedModel = selected;
            AppState.apiSettings.aiTimeAware = aiTime;
            AppState.apiSettings.contextLines = isNaN(contextLines) || contextLines < 1 ? 200 : contextLines;

            // 保存副API设置
            AppState.apiSettings.secondaryEndpoint = secondaryEndpoint.trim();
            AppState.apiSettings.secondaryApiKey = secondaryApiKey.trim();
            AppState.apiSettings.secondarySelectedModel = secondarySelected;

            // persist
            saveToStorage();
            loadApiSettingsToUI();
            showToast('设置已保存');
        }

        async function fetchModels() {
            const endpoint = (document.getElementById('api-endpoint') || {}).value || AppState.apiSettings.endpoint || '';
            const apiKey = (document.getElementById('api-key') || {}).value || AppState.apiSettings.apiKey || '';

            if (!endpoint) { showToast('请先填写 API 端点'); return; }

            // 规范化端点：移除末尾斜杠，并确保包含 /v1
            const normalized = endpoint.replace(/\/$/, '');
            const normalizedEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
            
            const tryUrls = [
                normalizedEndpoint + '/models'
            ];

            let models = [];
            let lastError = null;

            for (const url of tryUrls) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000);
                    
                    const res = await fetch(url, {
                        headers: Object.assign(
                            { 'Content-Type': 'application/json' },
                            apiKey ? { 'Authorization': 'Bearer ' + apiKey } : {}
                        ),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    
                    if (!res.ok) {
                        lastError = `HTTP ${res.status}: ${res.statusText}`;
                        console.warn('fetch models failed:', url, lastError);
                        continue;
                    }
                    
                    const data = await res.json();
                    if (Array.isArray(data.data)) {
                        models = data.data.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name) }));
                    } else if (Array.isArray(data.models)) {
                        models = data.models.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name) }));
                    } else if (Array.isArray(data)) {
                        models = data.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name || m) }));
                    }
                    if (models.length > 0) break;
                } catch (e) {
                    if (e.name === 'AbortError') {
                        lastError = '请求超时（30秒）';
                        console.error('fetch models timeout:', url);
                    } else if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
                        lastError = 'CORS 错误或网络问题。请检查 API 端点是否正确';
                        console.error('fetch models CORS/network error:', url, e);
                    } else {
                        lastError = e.message;
                        console.warn('fetch models failed:', url, e);
                    }
                }
            }
            if (models.length === 0) {
                const msg = lastError ? `未能拉取到模型：${lastError}` : '未能拉取到模型，请检查端点与密钥（或查看控制台）';
                showToast(msg);
                console.error('获取模型列表失败。请查看以下信息：');
                console.error('- API 端点是否正确');
                console.error('- API 密钥是否正确');
                console.error('- API 服务器是否已启动');
                console.error('- 浏览器控制台中的网络错误信息');
                return;
            }

            AppState.apiSettings = AppState.apiSettings || {};
            AppState.apiSettings.models = models;
            AppState.apiSettings.selectedModel = models[0].id;
            saveToStorage();

            const sel = document.getElementById('models-select');
            const display = document.getElementById('selected-model-display');
            if (sel) {
                sel.innerHTML = '';
                models.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.id;
                    opt.textContent = m.id;
                    sel.appendChild(opt);
                });
                sel.value = AppState.apiSettings.selectedModel;
            }
            if (display) display.textContent = AppState.apiSettings.selectedModel || '未选择';
            showToast('已拉取到 ' + models.length + ' 个模型');
        }

        // 拉取副API的模型列表
        async function fetchSecondaryModels() {
            const endpoint = (document.getElementById('secondary-api-endpoint') || {}).value || AppState.apiSettings.secondaryEndpoint || '';
            const apiKey = (document.getElementById('secondary-api-key') || {}).value || AppState.apiSettings.secondaryApiKey || '';

            if (!endpoint) { showToast('请先填写副 API 端点'); return; }

            // 规范化端点：移除末尾斜杠，并确保包含 /v1
            const normalized = endpoint.replace(/\/$/, '');
            const normalizedEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
            
            const tryUrls = [
                normalizedEndpoint + '/models'
            ];

            let models = [];
            let lastError = null;

            for (const url of tryUrls) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000);
                    
                    const res = await fetch(url, {
                        headers: Object.assign(
                            { 'Content-Type': 'application/json' },
                            apiKey ? { 'Authorization': 'Bearer ' + apiKey } : {}
                        ),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    
                    if (!res.ok) {
                        lastError = `HTTP ${res.status}: ${res.statusText}`;
                        console.warn('fetch secondary models failed:', url, lastError);
                        continue;
                    }
                    
                    const data = await res.json();
                    if (Array.isArray(data.data)) {
                        models = data.data.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name) }));
                    } else if (Array.isArray(data.models)) {
                        models = data.models.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name) }));
                    } else if (Array.isArray(data)) {
                        models = data.map(m => ({ id: typeof m === 'string' ? m : (m.id || m.name || m) }));
                    }
                    if (models.length > 0) break;
                } catch (e) {
                    if (e.name === 'AbortError') {
                        lastError = '请求超时（30秒）';
                        console.error('fetch secondary models timeout:', url);
                    } else if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
                        lastError = 'CORS 错误或网络问题。请检查副API端点是否正确';
                        console.error('fetch secondary models CORS/network error:', url, e);
                    } else {
                        lastError = e.message;
                        console.warn('fetch secondary models failed:', url, e);
                    }
                }
            }
            if (models.length === 0) {
                const msg = lastError ? `未能拉取到模型：${lastError}` : '未能拉取到模型，请检查副API端点与密钥（或查看控制台）';
                showToast(msg);
                console.error('获取副API模型列表失败。请查看以下信息：');
                console.error('- 副API 端点是否正确');
                console.error('- 副API 密钥是否正确');
                console.error('- 副API 服务器是否已启动');
                console.error('- 浏览器控制台中的网络错误信息');
                return;
            }

            AppState.apiSettings = AppState.apiSettings || {};
            AppState.apiSettings.secondaryModels = models;
            AppState.apiSettings.secondarySelectedModel = models[0].id;
            saveToStorage();

            const sel = document.getElementById('secondary-models-select');
            const display = document.getElementById('secondary-selected-model-display');
            if (sel) {
                sel.innerHTML = '';
                models.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.id;
                    opt.textContent = m.id;
                    sel.appendChild(opt);
                });
                sel.value = AppState.apiSettings.secondarySelectedModel;
            }
            if (display) display.textContent = AppState.apiSettings.secondarySelectedModel || '未选择';
            showToast('已拉取副API的 ' + models.length + ' 个模型');
        }

        async function callApiWithConversation() {
            if (!AppState.currentChat) {
                showToast('请先打开或创建一个聊天会话，然后双击头像触发。');
                return;
            }

            const convId = AppState.currentChat.id;
            const convState = getConversationState(convId);
            
            // 检查该对话是否已在进行API调用
            if (convState.isApiCalling) {
                showToast('正在等待上一次回复完成...');
                return;
            }

            const api = AppState.apiSettings || {};
            if (!api.endpoint || !api.selectedModel) { showToast('请先在 API 设置中填写端点并选择模型'); return; }

            // 生成新的API调用回合ID
            currentApiCallRound = 'round_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

            // 标记该对话正在进行API调用
            convState.isApiCalling = true;
            convState.isTyping = true;
            
            setLoadingStatus(true);
            
            // 只在当前对话仍打开时显示正在打字中
            const updateTypingStatus = () => {
                if (AppState.currentChat && AppState.currentChat.id === convId) {
                    const chatTitle = document.getElementById('chat-title');
                    const chatTypingStatus = document.getElementById('chat-typing-status');
                    if (chatTypingStatus) chatTypingStatus.style.display = 'inline-block';
                    if (chatTitle) chatTitle.style.display = 'none';
                }
            };
            updateTypingStatus();

            // 规范化端点：移除末尾斜杠，并确保包含 /v1
            const normalized = api.endpoint.replace(/\/$/, '');
            const baseEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
            
            const apiKey = api.apiKey || '';
            const messages = collectConversationForApi(convId);
            
            // 验证消息列表的有效性
            const validation = validateApiMessageList(messages);
            if (validation.hasWarnings) {
                console.warn('API 消息列表存在警告，但仍然继续调用:', validation.errors);
            }
            // 注意：即使有验证错误，我们也不会阻止 API 调用
            // 因为我们允许 AI 在任何时候回复，包括最后一条已经是 assistant 的情况
            
            const body = {
                model: api.selectedModel,
                messages: messages,
                temperature: 0.8,      // 提高到0.8，增加随机性
                max_tokens: 10000,       // 限制最大回复长度
                frequency_penalty: 0.2, // 降低重复
                presence_penalty: 0.1   // 鼓励新话题
            };

            // 固定使用 /v1 路径
            const endpoint = baseEndpoint + '/chat/completions';

            let lastError = null;
            let success = false;
            let timeoutId = null;

            try {
                const fetchOptions = {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, apiKey ? { 'Authorization': 'Bearer ' + apiKey } : {}),
                    body: JSON.stringify(body),
                    timeout: 60000
                };

                console.log('📤 发送API请求:', {
                    endpoint: endpoint,
                    model: api.selectedModel,
                    messageCount: messages.length,
                    bodyPreview: JSON.stringify(body).substring(0, 200)
                });
                
                // 详细的消息角色日志
                console.log('📋 API 消息列表详情：', messages.map((m, i) => ({
                    index: i,
                    role: m.role,
                    contentPreview: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '')
                })));

                const controller = new AbortController();
                timeoutId = setTimeout(() => controller.abort(), 60000);
                fetchOptions.signal = controller.signal;

                const res = await fetch(endpoint, fetchOptions);
                clearTimeout(timeoutId);

                console.log('📥 API响应状态:', res.status, res.statusText);

                // 检查在等待期间用户是否离开该对话
                if (AppState.currentChat && AppState.currentChat.id === convId) {
                    if (!res.ok) {
                        lastError = `${res.status}: ${res.statusText}`;
                        console.error(`❌ API 请求失败 [${res.status}]:`, endpoint);
                        
                        // 尝试解析错误响应体
                        try {
                            const errorData = await res.text();
                            if (errorData) {
                                console.error('错误详情:', errorData);
                            }
                        } catch (e) {}
                    } else {
                        let data;
                        try {
                            data = await res.json();
                            console.log('✅ JSON解析成功，响应结构:', {
                                hasChoices: !!data.choices,
                                hasCandidates: !!data.candidates,
                                keys: Object.keys(data).slice(0, 10)
                            });
                        } catch (parseErr) {
                            lastError = '响应内容不是有效的JSON';
                            console.error('❌ JSON 解析错误:', parseErr);
                            console.error('响应文本:', await res.text());
                        }

                        if (data) {
                            let assistantText = '';
                            
                            // 辅助函数：从嵌套对象中提取第一个非空字符串
                            function extractFirstString(obj, maxDepth = 5) {
                                if (typeof obj === 'string' && obj.trim()) return obj;
                                if (maxDepth <= 0 || !obj || typeof obj !== 'object') return '';
                                
                                for (let key in obj) {
                                    if (typeof obj[key] === 'string' && obj[key].trim()) {
                                        return obj[key];
                                    }
                                    if (typeof obj[key] === 'object') {
                                        const nested = extractFirstString(obj[key], maxDepth - 1);
                                        if (nested) return nested;
                                    }
                                }
                                return '';
                            }
                            
                            // 尝试多种可能的响应格式（按优先级排序）
                            if (data.choices && Array.isArray(data.choices) && data.choices[0]) {
                                const choice = data.choices[0];
                                // OpenAI格式：message.content
                                if (choice.message?.content) {
                                    assistantText = choice.message.content;
                                } 
                                // Anthropic格式 (text字段)
                                else if (choice.text) {
                                    assistantText = choice.text;
                                }
                                // 其他消息格式（可能是字符串或对象）
                                else if (choice.message) {
                                    assistantText = typeof choice.message === 'string' 
                                        ? choice.message 
                                        : (choice.message.content || extractFirstString(choice.message));
                                }
                                // 尝试从整个choice对象中提取文本
                                else {
                                    assistantText = extractFirstString(choice);
                                }
                            } 
                            // Google Gemini格式
                            else if (data.candidates && Array.isArray(data.candidates) && data.candidates[0]) {
                                const candidate = data.candidates[0];
                                if (candidate.content?.parts?.[0]?.text) {
                                    assistantText = candidate.content.parts[0].text;
                                } else {
                                    assistantText = extractFirstString(candidate);
                                }
                            }
                            // 其他常见的一级字段
                            else if (data.output && typeof data.output === 'string') {
                                assistantText = data.output;
                            }
                            else if (data.result && typeof data.result === 'string') {
                                assistantText = data.result;
                            }
                            else if (data.reply && typeof data.reply === 'string') {
                                assistantText = data.reply;
                            }
                            else if (data.content && typeof data.content === 'string') {
                                assistantText = data.content;
                            }
                            else if (data.text && typeof data.text === 'string') {
                                assistantText = data.text;
                            }
                            else if (data.message && typeof data.message === 'string') {
                                assistantText = data.message;
                            }
                            else if (data.response && typeof data.response === 'string') {
                                assistantText = data.response;
                            }
                            // 最后的兜底方案：深度搜索第一个有效的字符串
                            else {
                                assistantText = extractFirstString(data);
                            }

                            if (assistantText && assistantText.trim()) {
                                console.log('✨ 成功提取文本回复:', assistantText.substring(0, 100) + (assistantText.length > 100 ? '...' : ''));
                                appendAssistantMessage(convId, assistantText);
                                success = true;
                            } else {
                                lastError = '未在返回中找到文本回复';
                                console.error('❌ 无法从API响应中提取文本。完整响应数据:');
                                console.error(JSON.stringify(data, null, 2));
                                console.error('响应keys:', Object.keys(data));
                            }
                        }
                    }
                }
            } catch (err) {
                if (timeoutId) clearTimeout(timeoutId);
                
                if (err.name === 'AbortError') {
                    lastError = 'API 请求超时（60秒）';
                    console.error('请求超时:', endpoint);
                } else if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                    lastError = 'CORS 错误或网络连接问题。请检查 API 端点是否正确，或尝试使用支持 CORS 的代理';
                    console.error('网络错误:', err.message);
                } else {
                    lastError = err.message || '未知错误';
                    console.error(`API 调用出错:`, err);
                }
            }

            if (!success && AppState.currentChat && AppState.currentChat.id === convId) {
                const errorMsg = lastError || '未知错误';
                showToast(`API 请求失败: ${errorMsg}`);
                
                console.error('API 调用失败，请检查以下信息：');
                console.error('- API 端点:', api.endpoint);
                console.error('- 模型:', api.selectedModel);
                console.error('- 错误信息:', errorMsg);
                console.error('- 更多信息请查看上面的控制台错误');
            }

            // 清除对话的API调用状态
            convState.isApiCalling = false;
            convState.isTyping = false;
            
            // 只在当前对话仍打开时恢复UI
            if (AppState.currentChat && AppState.currentChat.id === convId) {
                const chatTitle = document.getElementById('chat-title');
                const chatTypingStatus = document.getElementById('chat-typing-status');
                if (chatTypingStatus) chatTypingStatus.style.display = 'none';
                if (chatTitle) chatTitle.style.display = 'inline';
            }
            
            setLoadingStatus(false);
        }

        function retryDeleteLastAiReply() {
            if (!AppState.currentChat) {
                showToast('请先打开一个聊天会话');
                return;
            }

            const msgs = AppState.messages[AppState.currentChat.id] || [];
            const conv = AppState.conversations.find(c => c.id === AppState.currentChat.id);
            
            if (msgs.length === 0) return;

            // 找到最后一条 AI 消息（received 类型）
            let lastAiIndex = -1;
            let lastAiRound = null;
            for (let i = msgs.length - 1; i >= 0; i--) {
                if (msgs[i].type === 'received') {
                    lastAiIndex = i;
                    lastAiRound = msgs[i].apiCallRound;
                    break;
                }
            }

            if (lastAiIndex === -1) {
                showToast('没有找到 AI 回复消息');
                return;
            }

            // 删除整个API调用回合的所有消息
            let deletedCount = 0;
            if (lastAiRound) {
                // 删除所有属于同一个API调用回合的received类型消息
                for (let i = msgs.length - 1; i >= 0; i--) {
                    if (msgs[i].type === 'received' && msgs[i].apiCallRound === lastAiRound) {
                        msgs.splice(i, 1);
                        deletedCount++;
                    }
                }
            } else {
                // 如果没有apiCallRound标记（旧数据），只删除最后一条
                msgs.splice(lastAiIndex, 1);
                deletedCount = 1;
            }
            
            // 同时清除该角色的心声数据（因为心声是在删除的消息中生成的）
            if (conv && conv.mindStates && Array.isArray(conv.mindStates)) {
                conv.mindStates.pop();  // 删除最后一条心声记录
            }

            // 更新会话
            if (conv) {
                const lastMsg = msgs[msgs.length - 1];
                conv.lastMsg = lastMsg ? lastMsg.content : '';
                conv.time = formatTime(new Date());
            }

            saveToStorage();
            renderChatMessages();
            renderConversations();
            
            // 立即触发AI重新回复
            showToast(`已删除上一轮回复（${deletedCount}条消息），正在重新生成...`);
            setTimeout(() => {
                callApiWithConversation();
            }, 500);
        }

        // 获取表情包使用说明
        function getEmojiInstructions(conv) {
            if (!conv.boundEmojiGroup) {
                return null;  // 如果没有绑定表情包，不添加指令
            }
            
            const emojiGroup = AppState.emojiGroups.find(g => g.id === conv.boundEmojiGroup);
            if (!emojiGroup) return null;
            
            const emojisInGroup = AppState.emojis.filter(e => e.groupId === conv.boundEmojiGroup);
            if (emojisInGroup.length === 0) return null;
            
            // 构建表情包列表
            const emojiList = emojisInGroup.map(e => `"${e.text}"`).join('、');
            
            return `【表情包系统】你可以在回复中发送表情包，但不是每次都要发。根据上下文内容判断是否合适发送表情包，发送的概率应该是有选择性的。
你有权访问以下表情包分组【${emojiGroup.name}】中的表情：${emojiList}

发送表情包的方法：在你的回复中任何位置，使用以下格式包含表情包：
【表情包】${emojisInGroup.length > 0 ? emojisInGroup[0].text : '表情'}【/表情包】

格式说明：
- 【表情包】和【/表情包】必须成对出现
- 中间填写你选择的表情描述（必须是上面列出的表情之一）
- 不强制每回都发，而是根据对话内容和角色性格判断是否合适
- 同一条回复中最多可以包含1个表情包
- 表情包应该与你的文字回复语境相符，表达相同或相近的情绪/意图

示例：
"这太棒了！【表情包】开心【/表情包】"
"我不太同意...【表情包】困惑【/表情包】"`;
        }

        // 替换文本中的占位符 {{user}} 和 {{char}}
        function replaceNamePlaceholders(text, userName, charName) {
            if (!text || typeof text !== 'string') return text;
            
            let result = text;
            
            // 替换 {{user}} 为用户名称
            if (userName) {
                result = result.replace(/\{\{user\}\}/g, userName);
            }
            
            // 替换 {{char}} 为角色名称
            if (charName) {
                result = result.replace(/\{\{char\}\}/g, charName);
            }
            
            return result;
        }

        // 验证消息列表的角色标记是否正确
        // 这个函数检查 API 消息列表的完整性和有效性
        function validateApiMessageList(messages) {
            if (!messages || messages.length === 0) return { isValid: true, errors: [] };
            
            const errors = [];
            let lastRole = null;
            let consecutiveCount = 0;
            
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                
                // 检查消息是否具有必需的属性
                if (!msg.role || !msg.content) {
                    errors.push(`消息 ${i}: 缺少 role 或 content 属性`);
                    continue;
                }
                
                // 检查角色值是否有效
                if (!['system', 'user', 'assistant'].includes(msg.role)) {
                    errors.push(`消息 ${i}: 无效的角色值 "${msg.role}"，应为 system/user/assistant`);
                }
                
                // 检查相邻非 system 消息不应该角色相同
                if (msg.role !== 'system') {
                    if (lastRole === msg.role) {
                        consecutiveCount++;
                        if (consecutiveCount > 0) {
                            // 仅记录连续超过1条的问题
                            errors.push(`消息 ${i}: 与前${consecutiveCount}条消息角色相同（都是 ${msg.role}），这可能导致 API 混淆`);
                        }
                    } else {
                        consecutiveCount = 0;
                        lastRole = msg.role;
                    }
                }
            }
            
            // 注意：不再限制最后一条消息必须是 user 角色
            // 用户可以在任何时候触发 AI 回复，包括最后一条已经是 assistant 的情况
            // 这样 AI 可以继续生成新的 assistant 消息
            
            if (errors.length > 0) {
                console.warn('[API 消息验证警告]', errors);
                // 仅记录警告，不阻止 API 调用
                return { isValid: true, errors: errors, hasWarnings: true };
            }
            
            return { isValid: true, errors: [], hasWarnings: false };
        }

        function collectConversationForApi(convId) {
            const msgs = AppState.messages[convId] || [];
            const out = [];
            const conv = AppState.conversations.find(c => c.id === convId) || {};

            // 获取用户名称和角色名称用于替换
            const userNameToUse = conv.userNameForChar || (AppState.user && AppState.user.name);
            const charName = conv.name || 'AI';

            // 首先添加强制性的系统提示词
            const systemPrompts = [];
            
            // 强制AI读取角色名称和性别
            if (conv.name) {
                systemPrompts.push(`你将角色扮演一个名字叫做"${conv.name}"的人类，绝对禁止out of character。`);
            }
            
            // 从角色描述中提取性别信息
            const charGender = extractGenderInfo(conv.description) || '未指定';
            systemPrompts.push(`角色性别：${charGender}`);
            
            // 强制AI读取角色人设
            if (conv.description) {
                // 替换角色人设中的占位符
                const replacedDescription = replaceNamePlaceholders(conv.description, userNameToUse, charName);
                systemPrompts.push(`你扮演的人设描述如下：${replacedDescription}`);
            }
            
            // 强制AI读取用户名称
            if (userNameToUse) {
                systemPrompts.push(`你对面的用户的名字是"${userNameToUse}"。`);
            }
            
            // 从用户人物设定中提取性别信息
            const userGender = extractGenderInfo(AppState.user && AppState.user.personality) || '未指定';
            systemPrompts.push(`用户性别：${userGender}`);
            
            // 添加用户人物设定
            if (AppState.user && AppState.user.personality) {
                // 替换用户人物设定中的占位符
                const replacedPersonality = replaceNamePlaceholders(AppState.user.personality, userNameToUse, charName);
                systemPrompts.push(`用户人物设定：${replacedPersonality}`);
            }
            
            // 添加心声相关的提示
            // 注意：这个提示告诉AI生成心声数据，但这些数据会在客户端被完全清理，用户无法看到
            systemPrompts.push(`【重要】必须每次在回复最后添加以下格式的心声信息，不能省略、不能变更格式、不能使用多消息格式：

【心声】穿搭：{描述角色的服装、配饰、整体风格与细节。要求：符合角色设定，场景合理，细节具体。举例参考：'上身穿着一件淡蓝色的棉麻衬衫，袖口微微卷起；下装是深灰色的休闲九分裤，脚踩一双白色帆布鞋。左手腕系着一条编织红绳，胸前挂着一枚小小的银杏叶胸针。整体风格干净简约，带着几分慵懒随性。'} 心情：{描述角色当前的情绪状态。要求：细腻真实，可包含矛盾情绪，用比喻或意象增强画面感。举例参考：'平静中带着一丝雀跃，像是阴天里透过云层洒下的微弱阳光。上午的事情顺利完成，下午还有期待已久的独处时间。内心有些小满足，但表面上依然维持着淡漠从容的样子。'} 动作：{描述角色正在进行或习惯性的小动作。要求：自然流畅，体现角色性格，符合当前场景。举例参考：'靠在窗边的懒人沙发上，手指无意识地轻轻敲击着扶手。偶尔抬头望向窗外，似乎在思考什么，又像只是单纯地发呆。翻开一半的书放在手边，茶杯里的水已经凉透了。'} 心声：{角色内心未说出口的想法。要求：真实、细腻，可包含矛盾、犹豫、期待等复杂情绪举例参考：'今天的阳光真好，要是能一直这样就好了。那件事要不要找个机会说出口呢？其实……有点在意他今天说的那句话。'} 坏心思：{角色偷偷打的算盘、恶作剧念头、或不愿让他人知道的小计划。要求：符合人设，带点狡黠或俏皮。举例参考：'计划偷偷把冰箱里的蛋糕吃掉，然后嫁祸给那只经常来窗台的流浪猫。打算在朋友面前装作若无其事，其实早就猜到了他要说的惊喜是什么。如果明天有人问起，就说自己一整天都在看书，什么都没做。'} 好感度：{0-100的整数} 好感度变化：{变化数值，增减的数值都不可超过3，如+3或-2或0} 好感度原因：{简短说明，10字以内,举例参考：'对当前话题感到无趣且烦躁'}

IMPORTANT REQUIREMENTS FOR 心声 (Mind State):
1. 心声MUST be placed at the very end of your response on a separate line
2. Do NOT split this into multiple [MSG] blocks - 心声 must be in the SAME response as your main dialogue
3. Format must be EXACTLY: 【心声】[all fields on one line separated by spaces]
4. All fields MUST have content, NO empty fields
5. Use Chinese colons 【：】not English colons【:】
6. Example format: 【心声】穿搭：details here... 心情：details here... 动作：details here... 心声：details here... 坏心思：details here... 好感度：75 好感度变化：+5 好感度原因：互相理解
7. CRITICAL: DO NOT use [MSG1][/MSG1] or [WAIT] format for the 心声 section
8. Your main dialogue CAN be split into multiple messages, but 心声 must always be at the very end as ONE complete line

严格按照这个格式输出，系统会自动提取和清理这一行，用户看不到这个内容。`);
            
            // 添加用户消息类型识别说明
            systemPrompts.push(`【用户内容识别规则】用户可能发送以下类型的内容，你需要正确识别并做出相应回应：

1. 【表情包消息】格式为：[用户发送了表情包: 表情描述文字]
   - 用户发送的是预设的表情包，你需要识别并了解其情绪含义
   - 例如："[用户发送了表情包: 开心]" 表示用户当前心情很开心
   - 对于表情包消息，分析其代表的情绪并在回复中予以回应
   - 不需要询问"你发送的表情是什么意思"，直接按照表情含义理解

2. 【图片消息】格式为：[用户发送了一张图片，图片内容：data:image/...]
   - 用户发送的是真实图片（如照片、截图、绘画）
   - 图片内容以Base64编码格式传输，你需要进行图片分析
   - 请描述图片中看到的内容、分析其背景和上下文
   - 必要时可基于图片内容给出建议或进行评论
   - 如果用户在"用户对图片的描述"中补充了说明，请结合该描述分析

3. 【普通文字消息】这是用户的正常对话文字
   - 直接理解和回应用户的文字内容

记住：表情包是情绪表达工具，图片是视觉内容；处理时方式完全不同。`);



            // 添加新的多消息回复格式说明（解决单气泡问题）
            systemPrompts.push(`【多消息回复格式】
你可以一次发送多条消息，使用以下格式：

[MSG1]第一条消息内容[/MSG1]
[WAIT:1]  <!-- 等待1秒 -->
[MSG2]第二条消息内容[/MSG2]
[WAIT:0.5] <!-- 等待0.5秒 -->
[MSG3]第三条消息内容[/MSG3]

规则：
1. 每条消息用[MSG1][/MSG1]等标签包裹
2. 标签间的数字表示第几条消息
3. [WAIT:秒数]控制下条消息的延迟
4. 每条消息应该简短（最多10-30字）
5. 适合用在：思考过程、情绪变化、分段表达时`);

            // 添加对话风格指令（解决标点问题）
            systemPrompts.push(`【对话风格要求】
1. 回复要简短自然，像真实聊天一样
2. 避免使用太多标点符号，不要每句话都用句号结尾
3. 可以适当使用省略号...、感叹号！、问号？
4. 回复长度控制在50-150字之间
5. 用口语化的表达，不要像写文章
6. 可以分多条消息回复（重要）`);
            
            // 添加表情包使用说明
            const emojiInstructions = getEmojiInstructions(conv);
            if (emojiInstructions) {
                systemPrompts.push(emojiInstructions);
            }
            
            // 合并所有系统提示
            if (systemPrompts.length > 0) {
                out.push({ role: 'system', content: systemPrompts.join('\n') });
            }

            // 添加全局提示词（强制遵守）
            const prompts = AppState.apiSettings && AppState.apiSettings.prompts ? AppState.apiSettings.prompts : [];
            let systemPrompt = '';
            
            // 如果有选中的提示词，使用选中的；否则使用默认提示词
            if (AppState.apiSettings && AppState.apiSettings.selectedPromptId) {
                const selectedPrompt = prompts.find(p => p.id === AppState.apiSettings.selectedPromptId);
                systemPrompt = selectedPrompt ? selectedPrompt.content : (AppState.apiSettings.defaultPrompt || '');
            } else {
                systemPrompt = AppState.apiSettings && AppState.apiSettings.defaultPrompt ? AppState.apiSettings.defaultPrompt : '';
            }
            
            if (systemPrompt) {
                // 替换全局提示词中的占位符
                systemPrompt = replaceNamePlaceholders(systemPrompt, userNameToUse, charName);
                out.push({ role: 'system', content: systemPrompt });
            }

            // 包含其他会话相关的内容
            const worldbookParts = [];
            
            // 添加全局世界书内容
            const globalWorldbooks = AppState.worldbooks.filter(w => w.isGlobal);
            if (globalWorldbooks.length > 0) {
                const worldbookContent = globalWorldbooks.map(w => {
                    // 替换世界书中的占位符
                    const replacedContent = replaceNamePlaceholders(w.content, userNameToUse, charName);
                    return `【${w.name}】\n${replacedContent}`;
                }).join('\n\n');
                worldbookParts.push('世界观背景:\n' + worldbookContent);
            }
            
            // 添加角色绑定的局部世界书
            if (conv.boundWorldbooks && Array.isArray(conv.boundWorldbooks) && conv.boundWorldbooks.length > 0) {
                const boundWbs = AppState.worldbooks.filter(w => conv.boundWorldbooks.includes(w.id) && !w.isGlobal);
                if (boundWbs.length > 0) {
                    const boundWorldbookContent = boundWbs.map(w => {
                        // 替换世界书中的占位符
                        const replacedContent = replaceNamePlaceholders(w.content, userNameToUse, charName);
                        return `【${w.name}】\n${replacedContent}`;
                    }).join('\n\n');
                    worldbookParts.push('角色专属世界观:\n' + boundWorldbookContent);
                }
            }

            if (worldbookParts.length) {
                out.push({ role: 'system', content: worldbookParts.join('\n') });
            }
            
            // 添加绑定的表情包分组信息
            if (conv.boundEmojiGroup) {
                const emojiGroup = AppState.emojiGroups && AppState.emojiGroups.find(g => g.id === conv.boundEmojiGroup);
                if (emojiGroup && emojiGroup.description) {
                    out.push({ role: 'system', content: `表情包分组【${emojiGroup.name}】描述：${emojiGroup.description}` });
                }
            }
            
            // 单独处理时间信息：不在worldbookParts中，而是在单独的system消息中
            // 这样可以确保AI知道当前时间，但用户不会在对话中看到这个时间戳
            if (AppState.apiSettings && AppState.apiSettings.aiTimeAware) {
                out.push({ role: 'system', content: '当前时间：' + new Date().toLocaleString('zh-CN') });
            }

            // 获取上下文条数限制（默认200条）
            const contextLimit = AppState.apiSettings && AppState.apiSettings.contextLines ? AppState.apiSettings.contextLines : 200;
            const messagesToSend = msgs.slice(-contextLimit);

            messagesToSend.forEach((m, index) => {
                let messageContent = m.content;
                
                // 如果消息是系统消息，直接作为系统提示发送
                if (m.type === 'system') {
                    out.push({ role: 'system', content: messageContent });
                    return;
                }
                
                // 如果消息已撤回，通知AI
                if (m.isRetracted) {
                    messageContent = `[${messageContent}]`;
                    if (m.type === 'sent') {
                        out.push({ role: 'user', content: messageContent });
                    } else {
                        // AI的撤回消息也需要通知，但用不同的角色
                        out.push({ role: 'system', content: messageContent });
                    }
                    return;
                }
                
                // 如果消息包含表情包，添加表情包描述，并告知AI这是表情包
                if (m.isEmoji && m.content) {
                    messageContent = '[用户发送了表情包: ' + m.content + ']';
                }
                
                // 如果消息是图片，提供图片识别信息
                if (m.isImage) {
                    if (m.imageData && m.imageData.startsWith('data:image')) {
                        // 包含图片数据的完整base64
                        messageContent = `[用户发送了一张图片，图片内容：${m.imageData}]`;
                        if (m.photoDescription) {
                            messageContent += `\n用户对图片的描述：${m.photoDescription}`;
                        }
                    } else if (m.photoDescription) {
                        messageContent = `[用户发送了一张图片，描述为：${m.photoDescription}]`;
                    } else {
                        messageContent = '[用户发送了一张图片]';
                    }
                }
                
                // 如果消息是转发的朋友圈，提供朋友圈信息
                if (m.isForward && m.forwardedMoment) {
                    const forwarded = m.forwardedMoment;
                    messageContent = `[用户转发了朋友圈]\n朋友圈发送者：${forwarded.author || '用户'}\n朋友圈内容：${forwarded.content || ''}`;
                }
                
                // 如果消息是引用消息，添加引用前缀
                if (m.replyTo) {
                    const replyToMsg = msgs.find(msg => msg.id === m.replyTo);
                    if (replyToMsg) {
                        const replyContent = replyToMsg.content || '[表情包]';
                        messageContent = `[回复: "${replyContent.substring(0, 30)}${replyContent.length > 30 ? '...' : ''}"]\n${messageContent}`;
                    }
                }
                
                // 确定消息角色：根据 type 字段准确分配 role
                // sent 类型 → user 角色
                // received 类型 → assistant 角色
                // system 类型 → system 角色
                // 其他类型 → 基于内容推断
                let roleToUse = 'assistant'; // 默认为 assistant
                
                if (m.type === 'sent') {
                    roleToUse = 'user';
                } else if (m.type === 'received') {
                    roleToUse = 'assistant';
                } else if (m.type === 'system') {
                    roleToUse = 'system';
                } else if (m.type === 'assistant') {
                    roleToUse = 'assistant';
                } else {
                    // 对于未知类型，仍然默认为 assistant
                    // 但记录一条警告
                    console.warn(`[消息角色推断] 第 ${index} 条消息类型未知: ${m.type}，默认使用 assistant 角色`);
                    roleToUse = 'assistant';
                }
                
                // 检查连续的相同角色（仅针对非 system 消息）
                if (out.length > 0) {
                    const lastMsgInOut = out[out.length - 1];
                    if (lastMsgInOut.role === roleToUse && lastMsgInOut.role !== 'system') {
                        console.warn(`[API消息警告] 第 ${index + 1} 条消息与前一条消息角色相同（都是 ${roleToUse}）`, {
                            prevMsg: { content: lastMsgInOut.content.substring(0, 40) },
                            currMsg: { type: m.type, content: messageContent.substring(0, 40) }
                        });
                        // 仍然添加消息，不阻止 - 这样可以支持 AI 连续回复的场景
                    }
                }
                
                out.push({ role: roleToUse, content: messageContent });
            });

            return out;
        }
        
        // 从文本中提取性别信息
        function extractGenderInfo(text) {
            if (!text) return null;
            const femaleKeywords = ['女', '女生', '女孩', '妹妹', '母', '她'];
            const maleKeywords = ['男', '男生', '男孩', '哥哥', '父', '他'];
            
            const textLower = text.toLowerCase();
            const femaleCount = femaleKeywords.filter(k => text.includes(k)).length;
            const maleCount = maleKeywords.filter(k => text.includes(k)).length;
            
            if (femaleCount > maleCount) return '女';
            if (maleCount > femaleCount) return '男';
            return null;
        }

        // 解析思考过程格式的消息
        // 支持格式：[THINK]思考内容[/THINK] [REPLY1]回复1[/REPLY1] [WAIT:0.5] [REPLY2]回复2[/REPLY2]
        // 同时支持新格式：[MSG1]第一条消息[/MSG1] [WAIT:1] [MSG2]第二条消息[/MSG2]
        function parseThinkingProcess(text) {
            if (!text || typeof text !== 'string') return null;
            
            // 检查是否包含思考过程标记或多消息标记
            if (!text.includes('[THINK]') && !text.includes('[REPLY') && !text.includes('[MSG')) {
                return null;  // 没有思考过程或多消息标记，返回null表示普通消息
            }
            
            const messages = [];
            let thinkingContent = '';
            
            // 提取思考部分
            const thinkingRegex = /\[THINK\]([\s\S]*?)\[\/THINK\]/;
            const thinkingMatch = text.match(thinkingRegex);
            if (thinkingMatch) {
                thinkingContent = thinkingMatch[1].trim();
            }
            
            // 首先尝试提取[REPLY]格式的回复部分
            const replyRegex = /\[REPLY\d+\]([\s\S]*?)\[\/REPLY\d+\]/g;
            let match;
            let lastIndex = 0;
            let hasReplyFormat = false;
            
            while ((match = replyRegex.exec(text)) !== null) {
                hasReplyFormat = true;
                const replyContent = match[1].trim();
                if (replyContent) {
                    messages.push({
                        type: 'reply',
                        content: replyContent,
                        delay: 0  // 默认无延迟
                    });
                }
                lastIndex = match.index + match[0].length;
                
                // 检查这个reply后面是否有WAIT标记
                const waitRegex = /\[WAIT:?([\d.]+)?\]/;
                const nextText = text.substring(lastIndex, lastIndex + 50);
                const waitMatch = nextText.match(waitRegex);
                if (waitMatch && messages.length > 0) {
                    const delay = waitMatch[1] ? parseFloat(waitMatch[1]) * 1000 : 500;
                    messages[messages.length - 1].delay = delay;
                }
            }
            
            // 如果没有找到[REPLY]格式，尝试提取[MSG]格式的消息部分
            if (!hasReplyFormat) {
                const msgRegex = /\[MSG\d+\]([\s\S]*?)\[\/MSG\d+\]/g;
                lastIndex = 0;
                
                while ((match = msgRegex.exec(text)) !== null) {
                    const msgContent = match[1].trim();
                    if (msgContent) {
                        messages.push({
                            type: 'message',
                            content: msgContent,
                            delay: 0  // 默认无延迟
                        });
                    }
                    lastIndex = match.index + match[0].length;
                    
                    // 检查这个MSG后面是否有WAIT标记
                    const waitRegex = /\[WAIT:?([\d.]+)?\]/;
                    const nextText = text.substring(lastIndex, lastIndex + 50);
                    const waitMatch = nextText.match(waitRegex);
                    if (waitMatch && messages.length > 0) {
                        const delay = waitMatch[1] ? parseFloat(waitMatch[1]) * 1000 : 500;
                        messages[messages.length - 1].delay = delay;
                    }
                }
            }
            
            // 注意：如果有思考内容但没有回复，不创建默认消息
            // 这样可以避免在消息气泡中显示"（思考中...）"
            // 思考过程应该是完全隐藏的内部过程
            
            // 如果找到了消息，返回结构化数据；否则返回null表示普通消息
            return messages.length > 0 ? {
                thinking: thinkingContent,
                messages: messages
            } : null;
        }

        // ========== 心声提取函数（新架构：从主API响应中提取） ==========
        function extractMindStateFromText(text) {
            console.log(`\n🔍 extractMindStateFromText 被调用`);
            console.log(`   输入文本长度: ${text?.length || 0}`);
            
            if (!text || typeof text !== 'string') {
                console.warn(`⚠️ 输入文本无效`);
                return null;
            }
            
            // 查找【心声】标记
            const mindMarkerIndex = text.indexOf('【心声】');
            
            console.log(`   查找【心声】标记: ${mindMarkerIndex >= 0 ? '✅ 找到' : '❌ 未找到'}`);
            console.log(`   标记位置: ${mindMarkerIndex}`);
            
            if (mindMarkerIndex === -1) {
                console.error('❌ 未在主API响应中找到【心声】标记');
                console.error('API响应长度:', text.length);
                console.error('响应包含【:', text.includes('【'));
                console.error('响应包含心声:', text.includes('心声'));
                // 尝试查找类似的模式
                if (text.includes('心声') && !text.includes('【心声】')) {
                    console.error('⚠️ 提示：找到【心声】字样，但格式错误（缺少【】）');
                    console.error('   查找到的位置:', text.indexOf('心声'));
                    console.error('   该位置前后100字:', text.substring(Math.max(0, text.indexOf('心声')-50), Math.min(text.length, text.indexOf('心声')+150)));
                }
                return null;
            }
            
            // 提取【心声】之后的所有内容
            const mindContent = text.substring(mindMarkerIndex + 5).trim();
            
            if (!mindContent) {
                console.error('❌ 【心声】标记后没有内容');
                return null;
            }
            
            console.log('✅ 成功找到【心声】标记，长度:', mindContent.length);
            console.log('📋 心声原始内容（前200字）:', mindContent.substring(0, 200));
            
            let mindState = {};
            
            // 字段定义 - 按照AI可能输出的顺序
            const fieldDefinitions = [
                { key: 'outfit', labels: ['穿搭', 'Outfit'] },
                { key: 'mood', labels: ['心情', 'Mood'] },
                { key: 'action', labels: ['动作', 'Action'] },
                { key: 'thought', labels: ['心声', 'Thought'] },
                { key: 'badThought', labels: ['坏心思', 'Bad Thought'] },
                { key: 'affinity', labels: ['好感度', 'Affinity'] },
                { key: 'affinityChange', labels: ['好感度变化', 'Affinity Change'] },
                { key: 'affinityReason', labels: ['好感度原因', 'Reason'] }
            ];
            
            // 处理所有字段 - 使用更灵活的提取方法
            for (const fieldDef of fieldDefinitions) {
                let value = null;
                
                // 尝试所有可能的标签
                for (const label of fieldDef.labels) {
                    // 创建更灵活的匹配模式 - 修复了正则表达式的双反斜杠问题
                    const patterns = [
                        // 模式1：标签：内容（到下一个已知标签或结尾）- 不跨行
                        new RegExp(`${label}[：:]+\\s*([^\\n【]*?)\\s*(?=\\n|(?:穿搭|心情|动作|心声|坏心思|好感度|好感度变化|好感度原因)[：:]|$)`, 'i'),
                        // 模式2：标签：内容（单行，包括空格）
                        new RegExp(`${label}[：:]+\\s*([^\\n]+?)\\s*$`, 'gmi'),
                        // 模式3：标签：内容（更宽松，匹配到任何非【】字符）
                        new RegExp(`${label}[：:]\\s*([^【]*?)(?=\\s*(?:穿搭|心情|动作|心声|坏心思|好感度|好感度变化|好感度原因)[：:]|\\s*$)`, 'i')
                    ];
                    
                    for (const pattern of patterns) {
                        const match = mindContent.match(pattern);
                        if (match && match[1]) {
                            value = match[1].trim();
                            // 移除多余的标点和标记
                            value = value.replace(/^[：:]/, '').trim();
                            // 如果找到了有效值，就停止寻找
                            if (value && value.length > 0) {
                                break;
                            }
                        }
                    }
                    
                    // 如果找到了值，就停止尝试其他标签
                    if (value && value.length > 0) {
                        break;
                    }
                }
                
                if (value && value.length > 0) {
                    // 清理值：移除可能的多余标记和换行，但保留有意义的内容
                    value = value.replace(/【.*?】/g, '').replace(/\s+/g, ' ').trim();
                    
                    // 防止字段值过长被其他字段内容污染
                    if (value.length > 500) {
                        value = value.substring(0, 500);
                    }
                    
                    // 特殊处理数值字段
                    if (fieldDef.key === 'affinity' || fieldDef.key === 'affinityChange') {
                        // 尝试提取数字
                        const numberMatch = value.match(/(-?\d+)/);
                        if (numberMatch) {
                            mindState[fieldDef.key] = parseInt(numberMatch[1]);
                        } else {
                            mindState[fieldDef.key] = null;
                        }
                    } else {
                        // 确保文本字段不为空
                        if (value.length > 0) {
                            mindState[fieldDef.key] = value;
                        }
                    }
                    
                    console.log(`  ✓ ${fieldDef.key}: "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
                }
            }
            
            // 检查是否有有效的心声数据
            if (Object.keys(mindState).length === 0 || Object.values(mindState).every(v => !v)) {
                console.error('⚠️ 心声数据解析失败，内容可能格式不正确');
                console.error('解析的内容:', mindContent);
                return null;
            }
            
            console.log('✅ 成功从API响应中提取心声数据:', mindState);
            return mindState;
        }

        function cleanAIResponse(text) {
            // 这是一个专门的清理函数，确保AI回复中的所有内部思维链和系统信息都被移除
            // 多层防护确保用户永远看不到AI的思考过程
            
            if (!text || typeof text !== 'string') return text;
            
            // 第零层：移除API角色标记（如assistant, user等）
            text = text.replace(/^(assistant|system|user)[:：\s]*/gi, '');
            text = text.replace(/[\s\n](assistant|system|user)[:：\s]*/gi, '\n');
            
            // 第零点五层：移除JSON/对象序列化的内容（可能包含role字段）
            text = text.replace(/\{"role":\s*"[^"]*"[\s\S]*?\}/g, '');
            text = text.replace(/"role":\s*"[^"]*"[,]?/g, '');
            
            // 第一层：移除思考过程标记（如果有残留）
            // 这可能在已提取的消息内容中出现
            text = text.replace(/\[THINK\][\s\S]*?\[\/THINK\]/g, '');
            text = text.replace(/\[REPLY\d+\]|\[\/REPLY\d+\]/g, '');
            text = text.replace(/\[MSG\d+\]|\[\/MSG\d+\]/g, '');  // 清理新格式的MSG标签
            text = text.replace(/\[WAIT(?::[\d.]+)?\]/g, '');
            
            // 第二层：移除所有带【】标记的系统信息
            // 包括心声、思维链、思考、系统、指令等
            text = text.replace(/【[^】]{0,20}】[\s\S]*?(?=【|$|\n(?!【))/g, function(match) {
                const content = match.match(/【([^】]*)】/);
                if (!content) return '';
                
                const tags = ['心声', '思维链', '思考', '系统', '指令', '提示', '缓冲', '内部', '调试', '日志'];
                if (tags.some(tag => content[1].includes(tag))) {
                    return '';
                }
                return match;
            });
            
            // 第三层：移除所有包含"thinking"、"thought"的标记（防止AI用英文绕过）
            text = text.replace(/\n?\[.*?(thinking|thought|mindstate|internal|debug|system|instruction|assistant|role).*?\][\s\S]*?(?=\n|$)/gi, '');
            text = text.replace(/\n?\{.*?(thinking|thought|mindstate|internal|debug|system|instruction|assistant|role).*?\}[\s\S]*?(?=\n|$)/gi, '');
            
            // 第四层：移除类似"穿搭："、"心情："等结构化数据
            text = text.replace(/\n?(穿搭|心情|动作|心声|坏心思|好感度|好感度变化|好感度原因|mood|outfit|action|thought|affinity)[:：][\s\S]*?(?=\n(?:穿搭|心情|动作|心声|坏心思|好感度|好感度变化|好感度原因|mood|outfit|action|thought|affinity)|$)/gi, '');
            
            // 第五层：移除任何看起来像JSON或YAML的结构化数据块
            text = text.replace(/\n?\{[\s\S]*?"(穿搭|心情|动作|心声|坏心思|好感度)"[\s\S]*?\}(?=\n|$)/g, '');
            text = text.replace(/\n?---[\s\S]*?---(?=\n|$)/g, '');
            
            // 第六层：移除时间戳和日期信息
            text = text.replace(/\(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\)/g, '');
            text = text.replace(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g, '');
            text = text.replace(/当前时间[:：][^\n]*/g, '');
            text = text.replace(/系统时间[:：][^\n]*/g, '');
            
            // 第七层：移除多余的空行
            text = text.replace(/\n{3,}/g, '\n\n');
            text = text.trim();
            
            return text;
        }

        // 当前API调用回合ID（全局，在每次API调用时更新）
        let currentApiCallRound = null;

        function appendAssistantMessage(convId, text) {
            // ========== 【第0步】提取心声信息 - 必须在所有处理之前！==========
            // 【关键】心声可能在最后的消息块之后，所以必须从完整的API响应中提取
            console.log(`📝 appendAssistantMessage 被调用，text长度: ${text.length}`);
            
            const mindStateData = extractMindStateFromText(text);
            
            console.log(`📋 extractMindStateFromText 返回:`, mindStateData);
            console.log(`📋 mindStateData类型:`, typeof mindStateData);
            console.log(`📋 mindStateData是否为null:`, mindStateData === null);
            console.log(`📋 mindStateData是否为undefined:`, mindStateData === undefined);
            
            if (mindStateData) {
                console.log('✅ 心声从完整API响应中提取成功', mindStateData);
            } else {
                console.warn('⚠️ 完整API响应中未找到心声标记或心声为空');
            }
            
            // 首先检查是否包含思考过程格式
            const thinkingData = parseThinkingProcess(text);
            
            console.log(`🔍 parseThinkingProcess 返回:`, thinkingData ? `有多条消息 (${thinkingData.messages?.length || 0}条)` : '单条消息');
            
            if (thinkingData) {
                // 存在思考过程，分批添加消息
                console.log(`📤 调用 appendMultipleAssistantMessages，传入mindStateData:`, mindStateData);
                appendMultipleAssistantMessages(convId, thinkingData, mindStateData);
            } else {
                // 普通消息，按原有逻辑处理
                console.log(`📤 调用 appendSingleAssistantMessage，传入mindStateData:`, mindStateData);
                appendSingleAssistantMessage(convId, text, mindStateData);
            }
        }

        function appendSingleAssistantMessage(convId, text, preExtractedMindData = null) {
            // ========== 第一步：使用预提取的心声数据或重新提取 ==========
            // 如果已经从 appendAssistantMessage 中提取过，则使用预提取的数据
            let mindStateData = preExtractedMindData;
            
            if (!mindStateData) {
                // 如果没有预提取的数据，则尝试重新提取（兼容直接调用的情况）
                mindStateData = extractMindStateFromText(text);
            }
            
            if (mindStateData) {
                console.log('✅ 心声提取成功（已有数据或重新提取）');
            } else {
                console.warn('⚠️ 心声未找到 - AI响应中可能没有【心声】标记');
            }
            
            // ========== 第二步：清理AI回复（移除心声标记及其他内部标记） ==========
            // 首先应用强大的清理函数
            text = cleanAIResponse(text);
            
            // ========== 第三步：处理表情包信息 ==========
            let emojiUrl = null;
            let emojiText = null;
            
            // 匹配表情包标记：【表情包】...【/表情包】
            const emojiRegex = /【表情包】([^【]+?)【\/表情包】/;
            const emojiMatch = text.match(emojiRegex);
            
            if (emojiMatch && emojiMatch[1]) {
                const emojiName = emojiMatch[1].trim();
                // 在表情包库中查找对应的表情
                const emoji = AppState.emojis.find(e => e.text === emojiName);
                if (emoji) {
                    emojiUrl = emoji.url;
                    emojiText = emoji.text;
                }
                // 从文本中移除表情包标记
                text = text.replace(emojiRegex, '').trim();
            }
            
            // ========== 第四步：处理地理位置信息 ==========
            // 匹配地理位置标记：【地理位置】位置名称|地址|距离【/地理位置】或【地理位置】位置名称|地址【/地理位置】
            const locationRegex = /【地理位置】([^|【]+)\|?([^|【]*)\|?([^【]*)【\/地理位置】/;
            const locationMatch = text.match(locationRegex);
            let locationName = null;
            let locationAddress = null;
            let locationDistance = 5;
            let isLocation = false;
            
            if (locationMatch && locationMatch[1]) {
                isLocation = true;
                locationName = locationMatch[1].trim();
                locationAddress = locationMatch[2] ? locationMatch[2].trim() : '';
                if (locationMatch[3]) {
                    const distanceStr = locationMatch[3].trim();
                    const parsedDistance = parseInt(distanceStr);
                    if (!isNaN(parsedDistance) && parsedDistance > 0) {
                        locationDistance = parsedDistance;
                    }
                }
                // 从文本中移除地理位置标记
                text = text.replace(locationRegex, '').trim();
            }
            
            // 第二次清理：确保没有遗漏
            text = cleanAIResponse(text);
            
            // ========== 第五步：创建并添加AI消息 ==========
            // 如果检测到地理位置消息，创建地理位置消息；否则创建普通消息
            if (isLocation && locationName) {
                // 创建地理位置消息
                const aiLocationMsg = {
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    type: 'location',
                    content: `${locationName}${locationAddress ? ' - ' + locationAddress : ''} (${locationDistance}米范围)`,
                    locationName: locationName,
                    locationAddress: locationAddress || '',
                    locationDistance: locationDistance,
                    sender: 'received',
                    time: new Date().toISOString(),
                    apiCallRound: currentApiCallRound  // 添加API调用回合标记
                };
                
                if (!AppState.messages[convId]) {
                    AppState.messages[convId] = [];
                }
                AppState.messages[convId].push(aiLocationMsg);
                
                // 如果AI还发送了其他文本内容，添加到消息
                if (text && text.trim()) {
                    const aiTextMsg = {
                        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        type: 'received',
                        content: text,
                        time: new Date().toISOString(),
                        apiCallRound: currentApiCallRound  // 添加API调用回合标记
                    };
                    AppState.messages[convId].push(aiTextMsg);
                }
            } else {
                // 创建普通消息或表情包消息
                const aiMsg = {
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    type: 'received',
                    content: text,
                    emojiUrl: emojiUrl,
                    isEmoji: emojiUrl ? true : false,
                    time: new Date().toISOString(),
                    apiCallRound: currentApiCallRound  // 添加API调用回合标记
                };
                
                if (!AppState.messages[convId]) {
                    AppState.messages[convId] = [];
                }
                AppState.messages[convId].push(aiMsg);
            }
            
            // ========== 第六步：保存心声数据（如果有） ==========
            const conv = AppState.conversations.find(c => c.id === convId);
            const aiMsg = AppState.messages[convId][AppState.messages[convId].length - 1];
            
            console.log(`\n📊 心声保存检查 - convId: ${convId}`);
            console.log(`   找到对话: ${conv ? '✅ 是' : '❌ 否'}`);
            console.log(`   心声数据: ${mindStateData ? '✅ 有' : '❌ 无'}`);
            
            // 检查心声数据是否有效 - 至少需要有一个字段有值
            const hasValidMindData = mindStateData && Object.values(mindStateData).some(v => v !== null && v !== undefined && v !== '');
            console.log(`   有效心声: ${hasValidMindData ? '✅ 是' : '❌ 否'}`);
            
            if (conv && hasValidMindData) {
                if (!conv.mindStates) {
                    conv.mindStates = [];
                }
                // 添加时间戳和消息ID
                mindStateData.timestamp = new Date().toISOString();
                mindStateData.messageId = aiMsg.id;
                mindStateData.failed = false;
                conv.mindStates.push(mindStateData);
                console.log(`✅ 心声数据已成功保存！`);
                console.log(`   保存位置: AppState.conversations[${convId}].mindStates`);
                console.log(`   当前mindStates长度: ${conv.mindStates.length}`);
                console.log(`   数据内容:`, mindStateData);
            } else if (!mindStateData || !hasValidMindData) {
                // 心声提取失败或为空 - 创建一个失败记录
                if (conv) {
                    if (!conv.mindStates) {
                        conv.mindStates = [];
                    }
                    // 添加一个标记，说明这一条消息的心声需要生成
                    conv.mindStates.push({
                        timestamp: new Date().toISOString(),
                        messageId: aiMsg ? aiMsg.id : '',
                        failed: true,  // 标记为失败
                        reason: !mindStateData ? '【心声】标记未找到，请检查API回复' : '心声数据为空，请确保AI返回了完整的心声信息',
                        failedReason: !mindStateData ? 'NO_MINDSTATE_MARKER' : 'EMPTY_MINDSTATE_DATA'
                    });
                    console.log(`⚠️ 已记录心声提取失败:`, !mindStateData ? '【心声】标记未找到' : '心声数据为空');
                } else {
                    console.warn('❌ 无法保存心声 - 会话未找到');
                }
            }
            
            // ========== 第六步：更新会话信息 ==========
            if (conv) {
                conv.lastMsg = text || '[表情包]';
                conv.time = formatTime(new Date());
                conv.lastMessageTime = aiMsg.time;  // 保存完整时间戳用于排序
            }

            saveToStorage();
            if (AppState.currentChat && AppState.currentChat.id === convId) renderChatMessages();
            renderConversations();

            // 检查是否需要自动总结
            checkAndAutoSummarize(convId);

            // 触发通知 - 如果用户不在当前聊天中
            triggerNotificationIfLeftChat(convId);
        }

        function appendMultipleAssistantMessages(convId, thinkingData, mindStateData = null) {
            // 处理多条消息的情况，按延迟依次添加
            let currentDelay = 0;
            const messages = thinkingData.messages || [];
            
            messages.forEach((msgData, index) => {
                setTimeout(() => {
                    // 每条消息都进行独立的清理和处理
                    let content = msgData.content.trim();
                    
                    if (!content) return;
                    
                    // 清理内容
                    content = cleanAIResponse(content);
                    
                    // 处理表情包
                    let emojiUrl = null;
                    const emojiRegex = /【表情包】([^【]+?)【\/表情包】/;
                    const emojiMatch = content.match(emojiRegex);
                    
                    if (emojiMatch && emojiMatch[1]) {
                        const emojiName = emojiMatch[1].trim();
                        const emoji = AppState.emojis.find(e => e.text === emojiName);
                        if (emoji) {
                            emojiUrl = emoji.url;
                        }
                        content = content.replace(emojiRegex, '').trim();
                    }
                    
                    content = cleanAIResponse(content);
                    
                    if (!content) return;
                    
                    // 创建消息
                    const aiMsg = {
                        id: 'msg_' + Date.now() + '_' + Math.random(),
                        type: 'received',
                        content: content,
                        emojiUrl: emojiUrl,
                        isEmoji: emojiUrl ? true : false,
                        time: new Date().toISOString(),
                        apiCallRound: currentApiCallRound  // 添加API调用回合标记，确保删除时能识别
                    };
                    
                    if (!AppState.messages[convId]) {
                        AppState.messages[convId] = [];
                    }
                    AppState.messages[convId].push(aiMsg);
                    
                    // 更新会话信息
                    const conv = AppState.conversations.find(c => c.id === convId);
                    if (conv) {
                        conv.lastMsg = content || '[表情包]';
                        conv.time = formatTime(new Date());
                        conv.lastMessageTime = aiMsg.time;
                    }
                    
                    saveToStorage();
                    if (AppState.currentChat && AppState.currentChat.id === convId) renderChatMessages();
                    renderConversations();
                    
                    // 【关键】只在最后一条消息后才保存心声数据和触发通知
                    if (index === messages.length - 1) {
                        console.log(`\n✅ 处理多消息的最后一条，开始保存心声数据...`);
                        console.log(`   conv 存在: ${conv ? '✅ 是' : '❌ 否'}`);
                        console.log(`   mindStateData 存在: ${mindStateData ? '✅ 是' : '❌ 否'}`);
                        console.log(`   mindStateData 内容:`, mindStateData);
                        
                        // 保存心声数据（如果有）
                        if (mindStateData && conv) {
                            if (!conv.mindStates) {
                                conv.mindStates = [];
                            }
                            // 检查是否有有效的心声数据
                            const hasValidMindData = Object.values(mindStateData).some(v => v !== null && v !== undefined && v !== '');
                            
                            console.log(`   hasValidMindData: ${hasValidMindData}`);
                            console.log(`   Object.values(mindStateData):`, Object.values(mindStateData));
                            
                            if (hasValidMindData) {
                                mindStateData.timestamp = new Date().toISOString();
                                mindStateData.messageId = aiMsg.id;
                                mindStateData.failed = false;
                                conv.mindStates.push(mindStateData);
                                console.log(`✅ 心声数据已保存到多消息会话: ${convId}`);
                                console.log(`   保存的数据:`, mindStateData);
                                console.log(`   当前mindStates长度:`, conv.mindStates.length);
                            } else {
                                console.warn(`⚠️ mindStateData 为空，不保存`);
                            }
                            saveToStorage();
                        } else {
                            console.warn(`⚠️ 无法保存心声 - mindStateData:${mindStateData}, conv:${conv}`);
                        }
                        
                        triggerNotificationIfLeftChat(convId);
                    }
                }, currentDelay);
                
                // 累加延迟时间
                currentDelay += msgData.delay || 0;
            });
        }
        function formatTime(date) {
            const now = new Date();
            const d = new Date(date);
            
            if (d.toDateString() === now.toDateString()) {
                return d.getHours().toString().padStart(2, '0') + ':' + 
                       d.getMinutes().toString().padStart(2, '0');
            }
            
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            if (d.toDateString() === yesterday.toDateString()) {
                return '昨天';
            }
            
            return (d.getMonth() + 1) + '/' + d.getDate();
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // 生成唯一ID
        function generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
        // ========== 表情包管理相关 ==========
        function toggleEmojiLibrary() {
            const lib = document.getElementById('emoji-library');
            const inputArea = document.querySelector('.chat-input-area');
            const toolbar = document.getElementById('chat-toolbar');
            
            const isShowing = lib.classList.contains('show');
            
            if (isShowing) {
                // 隐藏表情库
                lib.classList.remove('show');
                // 隐藏工具栏
                toolbar.classList.remove('show');
                // 恢复输入框和工具栏到初始位置
                inputArea.style.transform = 'translateY(0)';
                toolbar.style.transform = 'translateY(0)';
            } else {
                // 显示表情库
                lib.classList.add('show');
                // 显示工具栏
                toolbar.classList.add('show');
                renderEmojiLibrary();
                renderEmojiGroups('chat');
                
                // 立即计算位置（不需要 requestAnimationFrame）
                setTimeout(() => {
                    updateInputAreaPosition();
                }, 0);
            }
        }
        
        function updateInputAreaPosition() {
            const lib = document.getElementById('emoji-library');
            const inputArea = document.querySelector('.chat-input-area');
            const toolbar = document.getElementById('chat-toolbar');
            
            if (!lib || !inputArea || !toolbar) return;
            
            if (lib.classList.contains('show')) {
                // 表情库显示时，计算其高度
                let libHeight = lib.offsetHeight;
                
                // 如果高度为0（可能还没有渲染），使用计算后的样式
                if (libHeight === 0) {
                    libHeight = window.getComputedStyle(lib).maxHeight;
                    if (libHeight.includes('vh')) {
                        libHeight = (window.innerHeight * parseInt(libHeight) / 100);
                    } else {
                        libHeight = parseInt(libHeight);
                    }
                }
                
                // 设置transform使输入框和工具栏紧挨着表情库
                inputArea.style.transform = `translateY(-${libHeight}px)`;
                toolbar.style.transform = `translateY(-${libHeight}px)`;
            }
        }
        
        // 监听表情库的展开和收缩
        function setupEmojiLibraryObserver() {
            const lib = document.getElementById('emoji-library');
            if (!lib) return;
            
            // 创建 ResizeObserver 监听高度变化
            if (typeof ResizeObserver !== 'undefined') {
                const resizeObserver = new ResizeObserver(() => {
                    if (lib.classList.contains('show')) {
                        updateInputAreaPosition();
                    }
                });
                resizeObserver.observe(lib);
            }
            
            // 同时使用 MutationObserver 监听内容变化
            const mutationObserver = new MutationObserver(() => {
                if (lib.classList.contains('show')) {
                    updateInputAreaPosition();
                }
            });
            
            mutationObserver.observe(lib, { 
                childList: true, 
                subtree: true
            });
            
            // 监听窗口大小变化
            window.addEventListener('resize', () => {
                if (lib.classList.contains('show')) {
                    updateInputAreaPosition();
                }
            });
        }

        function renderEmojiGroups(context) {
            const barId = context === 'mgmt' ? 'emoji-mgmt-groups-bar' : 'emoji-groups-bar';
            const bar = document.getElementById(barId);
            if (!bar) return;
            
            bar.innerHTML = '';
            bar.style.display = AppState.emojiGroups.length > 0 ? 'flex' : 'none';
            
            let firstTagSet = false;
            AppState.emojiGroups.forEach((group, index) => {
                const tag = document.createElement('button');
                tag.className = 'emoji-group-tag';
                tag.dataset.groupId = group.id;
                tag.dataset.index = index;
                tag.textContent = group.name;
                
                // 默认第一个分组处于active状态
                if (!firstTagSet) {
                    tag.classList.add('active');
                    firstTagSet = true;
                    if (context === 'chat') {
                        filterEmojiByGroup(group.id, 'chat');
                    }
                }
                
                tag.addEventListener('click', function() {
                    document.querySelectorAll(`#${barId} .emoji-group-tag`).forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    filterEmojiByGroup(group.id, context);
                });
                
                bar.appendChild(tag);
            });
        }

        function filterEmojiByGroup(groupId, context) {
            const emojisInGroup = AppState.emojis.filter(e => e.groupId === groupId);
            const gridId = context === 'mgmt' ? 'mgmt-emoji-grid' : 'emoji-grid';
            const grid = document.getElementById(gridId);
            grid.innerHTML = '';
            
            if (emojisInGroup.length === 0) {
                grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#999;padding:20px;">该分组下暂无表情包</div>';
                return;
            }
            
            emojisInGroup.forEach(emoji => {
                const item = document.createElement('div');
                item.className = context === 'mgmt' ? 'emoji-item selecting' : 'emoji-item';
                item.dataset.id = emoji.id;
                
                const img = document.createElement('img');
                img.className = 'emoji-img';
                img.src = emoji.url;
                img.alt = emoji.text || '';
                img.style.borderRadius = '4px';
                
                const text = document.createElement('div');
                text.className = 'emoji-text';
                text.textContent = emoji.text || '无描述';
                
                const checkbox = document.createElement('div');
                checkbox.className = 'emoji-checkbox';
                
                item.appendChild(img);
                item.appendChild(text);
                item.appendChild(checkbox);
                
                if (context === 'chat') {
                    item.addEventListener('click', function(e) {
                        if (document.getElementById('emoji-del-btn').dataset.active === 'true') {
                            this.classList.toggle('selected');
                            checkbox.classList.toggle('checked');
                        } else {
                            sendEmojiWithText(emoji);
                        }
                    });
                } else if (context === 'mgmt') {
                    // 在管理界面中，支持长按编辑或右键编辑
                    item.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        editEmojiDescription(emoji);
                    });
                    item.addEventListener('dblclick', function() {
                        editEmojiDescription(emoji);
                    });
                    item.addEventListener('click', function() {
                        this.classList.toggle('selected');
                        checkbox.classList.toggle('checked');
                    });
                }
                
                grid.appendChild(item);
            });
        }

        function renderEmojiLibrary() {
            if (AppState.emojis.length === 0) {
                const grid = document.getElementById('emoji-grid');
                grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#999;padding:20px;">暂无表情包</div>';
                return;
            }
            
            const firstGroup = AppState.emojiGroups[0];
            if (firstGroup) {
                filterEmojiByGroup(firstGroup.id, 'chat');
            }
        }

        function sendEmojiWithText(emoji) {
            if (!AppState.currentChat) {
                alert('请先打开会话');
                return;
            }
            
            const msg = {
                id: 'msg_' + Date.now(),
                type: 'sent',
                content: emoji.text || '表情包',
                emojiUrl: emoji.url,
                isEmoji: true,
                time: new Date().toISOString()
            };
            
            if (!AppState.messages[AppState.currentChat.id]) {
                AppState.messages[AppState.currentChat.id] = [];
            }
            
            AppState.messages[AppState.currentChat.id].push(msg);
            const conv = AppState.conversations.find(c => c.id === AppState.currentChat.id);
            if (conv) {
                conv.lastMsg = msg.content;
                conv.time = formatTime(new Date());
                conv.lastMessageTime = msg.time;  // 保存完整时间戳用于排序
            }
            
            saveToStorage();
            renderChatMessages();
            renderConversations();
            toggleEmojiLibrary();
        }

        function openEmojiManager() {
            // 使用openEmojiGroupManager替代
            openEmojiGroupManager();
        }

        function renderEmojiGrid(context) {
            // 此函数已被 filterEmojiByGroup 替代，保留此处以避免破坏其他调用
            const firstGroup = AppState.emojiGroups[0];
            if (firstGroup) {
                filterEmojiByGroup(firstGroup.id, context);
            }
        }

        function handleEmojiImport(files, context) {
            if (!files || files.length === 0) return;
            
            // 区分多个文件和单个文件的处理逻辑
            if (files.length > 1) {
                // 多个文件：直接导入，使用默认文件名
                importMultipleEmojis(files, context);
            } else {
                // 单个文件：检查是否为JSON或图片
                const file = files[0];
                if (file.type === 'application/json' || file.name.endsWith('.json')) {
                    handleJsonImport(file, context);
                } else if (file.type.startsWith('image/')) {
                    // 单个图片文件：弹窗让用户输入描述
                    showSingleImageDescriptionDialog(file, context);
                } else {
                    alert('不支持的文件类型');
                }
            }
        }
        
        function importMultipleEmojis(files, context) {
            // 先将FileList转换为数组，以便后续使用
            const filesArray = Array.from(files);
            
            // 选择分组
            let modal = document.getElementById('group-select-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'group-select-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            // 添加点击外部关闭功能
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:300px;">
                    <div class="emoji-mgmt-header">
                        <h3 style="margin:0;">选择分组</h3>
                        <button class="emoji-mgmt-close" onclick="document.getElementById('group-select-modal').remove();">
                            <svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div id="group-select-list" style="flex:1;overflow-y:auto;padding:12px;"></div>
                </div>
            `;
            document.body.appendChild(modal);
            
            const list = document.getElementById('group-select-list');
            AppState.emojiGroups.forEach(group => {
                const item = document.createElement('button');
                item.className = 'emoji-mgmt-btn';
                item.textContent = group.name;
                item.style.cssText = 'width:100%;height:40px;margin-bottom:8px;';
                
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    let processed = 0;
                    // 使用filesArray而不是files，确保能正确访问所有文件
                    filesArray.forEach(file => {
                        const reader = new FileReader();
                        reader.onload = function(readEvent) {
                            // 使用文件名（去掉扩展名）作为描述
                            const fileName = file.name.replace(/\.[^.]+$/, '');
                            
                            AppState.emojis.push({
                                id: 'emoji_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                                url: readEvent.target.result,
                                text: fileName,
                                groupId: group.id,
                                createdAt: new Date().toISOString()
                            });
                            
                            processed++;
                            if (processed === filesArray.length) {
                                saveToStorage();
                                document.getElementById('group-select-modal').remove();
                                if (context === 'mgmt') {
                                    // 重新渲染管理器的分组和内容
                                    renderEmojiMgmtGroups();
                                    const firstGroup = AppState.emojiGroups[0];
                                    if (firstGroup) renderEmojiMgmtGrid(firstGroup.id);
                                } else {
                                    // 重新渲染聊天表情库
                                    renderEmojiLibrary();
                                    renderEmojiGroups('chat');
                                }
                                alert('已导入 ' + filesArray.length + ' 个表情包');
                            }
                        };
                        reader.readAsDataURL(file);
                    });
                });
                
                list.appendChild(item);
            });
        }
        
        function showSingleImageDescriptionDialog(file, context) {
            let modal = document.getElementById('image-desc-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'image-desc-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            // 添加点击外部关闭功能
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:300px;">
                    <div class="emoji-mgmt-header">
                        <h3 style="margin:0;">导入表情包</h3>
                        <button class="emoji-mgmt-close" onclick="document.getElementById('image-desc-modal').remove();">
                            <svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div style="padding:16px;flex:1;overflow-y:auto;">
                        <input type="text" id="emoji-desc-input" placeholder="输入表情描述" class="group-input" style="width:100%;margin-bottom:12px;">
                        <div style="text-align:center;color:#666;font-size:13px;margin-bottom:12px;margin-top:8px;">请选择该表情的分组：</div>
                        <div id="group-select-list2" style="max-height:200px;overflow-y:auto;"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            const input = document.getElementById('emoji-desc-input');
            input.value = file.name.replace(/\.[^.]+$/, '');
            
            const list = document.getElementById('group-select-list2');
            AppState.emojiGroups.forEach(group => {
                const item = document.createElement('button');
                item.className = 'emoji-mgmt-btn';
                item.textContent = group.name;
                item.style.cssText = 'width:100%;height:40px;margin-bottom:8px;';
                item.addEventListener('click', function() {
                    const desc = input.value.trim();
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        AppState.emojis.push({
                            id: 'emoji_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            url: e.target.result,
                            text: desc || file.name,
                            groupId: group.id,
                            createdAt: new Date().toISOString()
                        });
                        
                        saveToStorage();
                        if (context === 'mgmt') {
                            renderEmojiGroups('mgmt');
                            const firstGroup = AppState.emojiGroups[0];
                            if (firstGroup) filterEmojiByGroup(firstGroup.id, 'mgmt');
                        } else {
                            renderEmojiLibrary();
                            renderEmojiGroups('chat');
                        }
                        document.getElementById('image-desc-modal').remove();
                        alert('已导入表情包');
                    };
                    reader.readAsDataURL(file);
                });
                list.appendChild(item);
            });
        }
        
        function handleJsonImport(file, context) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    let count = 0;
                    
                    if (Array.isArray(data)) {
                        // 数组格式：[{name/text, url/image}, ...]
                        data.forEach(item => {
                            const text = item.name || item.text || item.description || '无描述';
                            const url = item.url || item.image || item.link;
                            
                            if (url) {
                                AppState.emojis.push({
                                    id: 'emoji_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                                    url: url,
                                    text: text,
                                    groupId: AppState.emojiGroups[0].id,
                                    createdAt: new Date().toISOString()
                                });
                                count++;
                            }
                        });
                    } else if (typeof data === 'object') {
                        // 对象格式：{name1: url1, name2: url2, ...}
                        Object.entries(data).forEach(([key, value]) => {
                            let text = key;
                            let url = '';
                            
                            if (typeof value === 'string') {
                                url = value;
                            } else if (typeof value === 'object') {
                                text = value.name || value.text || key;
                                url = value.url || value.image || value.link;
                            }
                            
                            if (url) {
                                AppState.emojis.push({
                                    id: 'emoji_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                                    url: url,
                                    text: text,
                                    groupId: AppState.emojiGroups[0].id,
                                    createdAt: new Date().toISOString()
                                });
                                count++;
                            }
                        });
                    }
                    
                    if (count === 0) {
                        alert('JSON文件中未找到有效的表情数据');
                        return;
                    }
                    
                    saveToStorage();
                    if (context === 'mgmt') {
                        renderEmojiGroups('mgmt');
                        const firstGroup = AppState.emojiGroups[0];
                        if (firstGroup) filterEmojiByGroup(firstGroup.id, 'mgmt');
                    } else {
                        renderEmojiLibrary();
                        renderEmojiGroups('chat');
                    }
                    alert('已导入 ' + count + ' 个表情包');
                } catch (err) {
                    alert('JSON文件解析失败：' + err.message);
                }
            };
            reader.readAsText(file);
        }
        
        function parseUrlEmojis(urlText) {
            // 解析URL文本中的表情包
            // 格式：名称：url（多个用换行分隔）
            const lines = urlText.split('\n').map(l => l.trim()).filter(l => l);
            const emojis = [];
            
            let currentName = '';
            lines.forEach(line => {
                // 检查是否是URL
                if (line.startsWith('http://') || line.startsWith('https://')) {
                    if (currentName) {
                        emojis.push({ text: currentName, url: line });
                        currentName = '';
                    }
                } else {
                    // 如果前一行有名字，这一行是URL
                    if (currentName && (line.startsWith('http://') || line.startsWith('https://'))) {
                        emojis.push({ text: currentName, url: line });
                        currentName = '';
                    } else {
                        currentName = line;
                    }
                }
            });
            
            return emojis;
        }

        function deleteSelectedEmojis(context) {
            const gridId = context === 'mgmt' ? 'mgmt-emoji-grid' : 'emoji-grid';
            const grid = document.getElementById(gridId);
            const selected = grid.querySelectorAll('.emoji-item.selected');
            
            if (selected.length === 0) {
                alert('请先选择要删除的表情包');
                return;
            }
            
            if (!confirm('确认删除选中的 ' + selected.length + ' 个表情包吗？')) return;
            
            const idsToDelete = Array.from(selected).map(el => el.dataset.id);
            AppState.emojis = AppState.emojis.filter(e => !idsToDelete.includes(e.id));
            
            saveToStorage();
            
            // 刷新当前分组显示
            const activeTag = document.querySelector('.emoji-group-tag.active');
            if (activeTag) {
                filterEmojiByGroup(activeTag.dataset.groupId, context);
            } else {
                const firstGroup = AppState.emojiGroups[0];
                if (firstGroup) {
                    filterEmojiByGroup(firstGroup.id, context);
                }
            }
        }

        // 加载状态函数 - 显示状态栏
        function setLoadingStatus(loading) {
            const statusEl = document.getElementById('chat-typing-status');
            if (loading) {
                statusEl.style.display = 'block';
            } else {
                statusEl.style.display = 'none';
            }
        }

        function openEmojiGroupManager() {
            let modal = document.getElementById('emoji-group-mgmt-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'emoji-group-mgmt-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            // 点击外部关闭
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content emoji-pack-manager" style="max-width:95vw;max-height:90vh;">
                    <!-- 顶部 -->
                    <div style="padding:16px;border-bottom:1px solid #e8e8e8;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="margin:0;font-size:16px;color:#333;font-weight:600;">表情包管理</h3>
                        <button class="emoji-close-btn" onclick="document.getElementById('emoji-group-mgmt-modal').remove();" style="width:32px;height:32px;border-radius:50%;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;color:#666;transition:background 0.2s;">×</button>
                    </div>
                    <div style="text-align:center;font-size:12px;color:#999;padding:8px 0;border-bottom:1px solid #e8e8e8;">双击表情包修改其文字描述</div>
                    
                    <!-- 功能按钮区 -->
                    <div style="padding:12px;border-bottom:1px solid #e8e8e8;display:flex;gap:12px;justify-content:center;align-items:center;flex-wrap:nowrap;overflow-x:auto;">
                        <button class="emoji-mgmt-action-btn" onclick="document.getElementById('emoji-mgmt-file-input').click();" style="white-space:nowrap;">导入文件</button>
                        <button class="emoji-mgmt-action-btn" onclick="showUrlImportDialog('mgmt');" style="white-space:nowrap;">导入URL</button>
                        <button class="emoji-mgmt-action-btn" id="emoji-mgmt-delete-btn" onclick="toggleEmojiMgmtDeleteMode();" style="white-space:nowrap;">删除选中</button>
                    </div>
                    
                    <!-- 分组标签栏 -->
                    <div id="emoji-mgmt-groups-bar" style="padding:12px;border-bottom:1px solid #e8e8e8;display:flex;gap:8px;overflow-x:auto;white-space:nowrap;"></div>
                    
                    <!-- 内容区 -->
                    <div id="emoji-mgmt-content-area" style="flex:1;overflow-y:auto;padding:16px;min-height:300px;">
                        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#999;">
                            <div style="font-size:48px;margin-bottom:8px;">🙂</div>
                            <div>该分组下暂无表情包</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // hover效果
            const closeBtn = modal.querySelector('.emoji-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('mouseenter', function() {
                    this.style.background = '#f5f5f5';
                });
                closeBtn.addEventListener('mouseleave', function() {
                    this.style.background = 'transparent';
                });
            }
            
            // 初始化分组和内容
            renderEmojiMgmtGroups();
            
            // 文件输入
            const fileInput = document.createElement('input');
            fileInput.id = 'emoji-mgmt-file-input';
            fileInput.type = 'file';
            fileInput.accept = 'image/*,.json';
            fileInput.multiple = true;
            fileInput.style.display = 'none';
            fileInput.addEventListener('change', function(e) {
                handleEmojiImport(e.target.files, 'mgmt');
                this.value = '';
            });
            document.body.appendChild(fileInput);
        }

        function renderEmojiMgmtGroups() {
            const bar = document.getElementById('emoji-mgmt-groups-bar');
            if (!bar) return;
            
            bar.innerHTML = '';
            bar.style.cssText = 'display:grid;grid-auto-flow:column;gap:16px;padding:12px;border-bottom:1px solid #e8e8e8;align-items:start;overflow-x:auto;-webkit-overflow-scrolling:touch;white-space:nowrap;';
            
            const firstGroup = AppState.emojiGroups[0];
            if (!firstGroup) return;
            
            AppState.emojiGroups.forEach((group, index) => {
                const container = document.createElement('div');
                container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;min-width:fit-content;';
                
                const btn = document.createElement('button');
                btn.className = 'emoji-mgmt-group-tag';
                btn.style.cssText = 'width:48px;height:48px;border-radius:8px;border:2px solid #e8e8e8;background:#f5f5f5;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;transition:all 0.2s;color:#333;font-weight:600;';
                // 使用分组名称的首字符作为图标
                btn.textContent = group.name.charAt(0).toUpperCase();
                btn.dataset.groupId = group.id;
                btn.dataset.index = index;
                btn.dataset.isDefault = index === 0 ? 'true' : 'false';
                btn.title = index === 0 ? group.name + ' （默认）' : group.name;
                
                // 默认选中第一个分组
                if (group.id === firstGroup.id) {
                    btn.classList.add('active');
                    btn.style.cssText += 'border-color:#000;background:#fff;';
                    renderEmojiMgmtGrid(group.id);
                }
                
                btn.addEventListener('click', function() {
                    bar.querySelectorAll('.emoji-mgmt-group-tag').forEach(t => {
                        t.classList.remove('active');
                        t.style.borderColor = '#e8e8e8';
                        t.style.background = '#f5f5f5';
                    });
                    btn.classList.add('active');
                    btn.style.borderColor = '#000';
                    btn.style.background = '#fff';
                    renderEmojiMgmtGrid(group.id);
                });
                
                btn.addEventListener('mouseenter', function() {
                    if (!btn.classList.contains('active')) {
                        this.style.borderColor = '#999';
                    }
                });
                btn.addEventListener('mouseleave', function() {
                    if (!btn.classList.contains('active')) {
                        this.style.borderColor = '#e8e8e8';
                    }
                });
                
                container.appendChild(btn);
                
                // 添加操作按钮容器（编辑 + 删除）
                const actionContainer = document.createElement('div');
                actionContainer.style.cssText = 'display:flex;gap:4px;justify-content:center;width:100%;';
                
                // 编辑按钮
                const editBtn = document.createElement('button');
                editBtn.textContent = '编辑';
                editBtn.style.cssText = 'font-size:11px;padding:4px 8px;border:1px solid #ddd;border-radius:3px;background:#fff;cursor:pointer;transition:all 0.2s;white-space:nowrap;';
                editBtn.title = '修改分组名称';
                editBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    editEmojiGroupName(group.id);
                });
                editBtn.addEventListener('mouseenter', function() {
                    this.style.background = '#f0f0f0';
                });
                editBtn.addEventListener('mouseleave', function() {
                    this.style.background = '#fff';
                });
                actionContainer.appendChild(editBtn);
                
                // 删除按钮（默认分组不能删除）
                if (index > 0) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '删除';
                    deleteBtn.style.cssText = 'font-size:11px;padding:4px 8px;border:1px solid #f44;border-radius:3px;background:#fff;color:#f44;cursor:pointer;transition:all 0.2s;white-space:nowrap;';
                    deleteBtn.title = '删除分组';
                    deleteBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        if (confirm(`确定要删除分组"${group.name}"吗？该分组下的所有表情包也会被删除。`)) {
                            deleteEmojiGroup(group.id);
                        }
                    });
                    deleteBtn.addEventListener('mouseenter', function() {
                        this.style.background = '#ffe8e8';
                    });
                    deleteBtn.addEventListener('mouseleave', function() {
                        this.style.background = '#fff';
                    });
                    actionContainer.appendChild(deleteBtn);
                }
                
                container.appendChild(actionContainer);
                bar.appendChild(container);
            });
            
            // 添加"新增分组"按钮
            const addBtn = document.createElement('button');
            const addContainer = document.createElement('div');
            addContainer.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;min-width:fit-content;';
            
            addBtn.style.cssText = 'width:48px;height:48px;border:2px dashed #ddd;border-radius:8px;background:#f9f9f9;cursor:pointer;font-size:24px;padding:0;display:flex;align-items:center;justify-content:center;transition:all 0.2s;color:#999;font-weight:600;';
            addBtn.textContent = '+';
            addBtn.title = '新增分组';
            addBtn.addEventListener('mouseenter', function() {
                this.style.background = '#f0f0f0';
                this.style.borderColor = '#999';
                this.style.color = '#333';
            });
            addBtn.addEventListener('mouseleave', function() {
                this.style.background = '#f9f9f9';
                this.style.borderColor = '#ddd';
                this.style.color = '#999';
            });
            addBtn.addEventListener('click', function() {
                createNewEmojiGroup();
            });
            addContainer.appendChild(addBtn);
            bar.appendChild(addContainer);
        }

        function renderEmojiMgmtGrid(groupId) {
            const emojisInGroup = AppState.emojis.filter(e => e.groupId === groupId);
            const contentArea = document.getElementById('emoji-mgmt-content-area');
            
            if (!contentArea) return;
            
            if (emojisInGroup.length === 0) {
                contentArea.innerHTML = `
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#999;">
                        <div style="font-size:48px;margin-bottom:8px;">🙂</div>
                        <div>该分组下暂无表情包</div>
                    </div>
                `;
                return;
            }
            
            contentArea.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
                    ${emojisInGroup.map(emoji => `
                        <div class="emoji-mgmt-item" data-id="${emoji.id}" style="cursor:pointer;text-align:center;padding:8px;border:1px solid #e8e8e8;border-radius:6px;background:#f9f9f9;transition:all 0.2s;">
                            <img src="${emoji.url}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;margin-bottom:4px;">
                            <div style="font-size:12px;color:#666;word-break:break-word;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;">${emoji.text || '无描述'}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // 绑定事件
            contentArea.querySelectorAll('.emoji-mgmt-item').forEach(item => {
                item.addEventListener('dblclick', function() {
                    const emojiId = this.dataset.id;
                    editEmojiDescription(AppState.emojis.find(e => e.id === emojiId));
                });
                
                item.addEventListener('click', function() {
                    if (document.getElementById('emoji-mgmt-delete-btn').dataset.active === 'true') {
                        this.classList.toggle('selected');
                        this.style.borderColor = this.classList.contains('selected') ? '#000' : '#e8e8e8';
                        this.style.background = this.classList.contains('selected') ? '#f0f0f0' : '#f9f9f9';
                    }
                });
            });
        }

        function toggleEmojiMgmtDeleteMode() {
            const btn = document.getElementById('emoji-mgmt-delete-btn');
            const isActive = btn.dataset.active === 'true';
            const contentArea = document.getElementById('emoji-mgmt-content-area');
            
            if (isActive) {
                // 删除选中的表情
                const selectedItems = contentArea.querySelectorAll('.emoji-mgmt-item.selected');
                if (selectedItems.length === 0) {
                    alert('请先选择要删除的表情包');
                    return;
                }
                
                if (!confirm(`确定要删除选中的 ${selectedItems.length} 个表情包吗？`)) return;
                
                selectedItems.forEach(item => {
                    const emojiId = item.dataset.id;
                    AppState.emojis = AppState.emojis.filter(e => e.id !== emojiId);
                });
                
                saveToStorage();
                
                // 重新渲染当前分组
                const activeTag = document.querySelector('.emoji-mgmt-group-tag.active');
                if (activeTag) {
                    renderEmojiMgmtGrid(activeTag.dataset.groupId);
                }
                
                // 退出删除模式
                btn.dataset.active = 'false';
                btn.style.color = '#666';
                contentArea.querySelectorAll('.emoji-mgmt-item').forEach(item => {
                    item.classList.remove('selected');
                    item.style.borderColor = '#e8e8e8';
                    item.style.background = '#f9f9f9';
                });
            } else {
                // 进入删除模式
                btn.dataset.active = 'true';
                btn.style.color = '#f00';
                contentArea.querySelectorAll('.emoji-mgmt-item').forEach(item => {
                    item.style.cursor = 'pointer';
                    item.style.opacity = '1';
                });
            }
        }

        function deleteEmojiGroup(groupId) {
            // 删除分组
            AppState.emojiGroups = AppState.emojiGroups.filter(g => g.id !== groupId);
            
            // 同时删除该分组下的所有表情包
            AppState.emojis = AppState.emojis.filter(e => e.groupId !== groupId);
            
            // 保存到本地存储
            saveToStorage();
            
            // 重新渲染分组列表
            renderEmojiMgmtGroups();
            
            // 重新渲染表情包网格（显示第一个分组）
            const firstGroup = AppState.emojiGroups[0];
            if (firstGroup) {
                renderEmojiMgmtGrid(firstGroup.id);
            }
        }

        function createNewEmojiGroup() {
            const groupName = prompt('请输入新分组的名称：');
            if (!groupName || groupName.trim() === '') return;
            
            const newGroup = {
                id: 'group_' + Date.now(),
                name: groupName.trim(),
                description: ''
            };
            
            AppState.emojiGroups.push(newGroup);
            saveToStorage();
            
            // 重新渲染分组列表
            renderEmojiMgmtGroups();
            // 选中新分组
            renderEmojiMgmtGrid(newGroup.id);
        }

        function editEmojiGroupName(groupId) {
            const group = AppState.emojiGroups.find(g => g.id === groupId);
            if (!group) return;
            
            const newName = prompt('请输入新的分组名称：', group.name);
            if (!newName || newName.trim() === '') return;
            
            group.name = newName.trim();
            saveToStorage();
            
            // 重新渲染分组列表
            renderEmojiMgmtGroups();
        }

        function renderEmojiGroupList() {
            const list = document.getElementById('emoji-group-list');
            list.innerHTML = '';
            
            AppState.emojiGroups.forEach(group => {
                const item = document.createElement('div');
                item.className = 'emoji-group-item';
                item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid #f0f0f0;';
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = group.name;
                nameSpan.style.cssText = 'flex:1;font-size:14px;';
                
                const count = AppState.emojis.filter(e => e.groupId === group.id).length;
                const countSpan = document.createElement('span');
                countSpan.textContent = count + ' 个表情';
                countSpan.style.cssText = 'color:#999;font-size:12px;margin-right:12px;';
                
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '删除';
                deleteBtn.className = 'emoji-mgmt-btn';
                deleteBtn.style.cssText = 'width:60px;height:32px;';
                
                if (group.id === 'group_default') {
                    deleteBtn.disabled = true;
                    deleteBtn.style.cssText = 'width:60px;height:32px;opacity:0.5;cursor:not-allowed;';
                }
                
                deleteBtn.addEventListener('click', function() {
                    if (group.id === 'group_default') {
                        alert('默认分组不能删除');
                        return;
                    }
                    
                    if (count > 0) {
                        alert('该分组下还有表情包，请先删除或移动这些表情包');
                        return;
                    }
                    
                    if (!confirm('确认删除此分组吗？')) return;
                    
                    AppState.emojiGroups = AppState.emojiGroups.filter(g => g.id !== group.id);
                    saveToStorage();
                    renderEmojiGroupList();
                    renderEmojiGroups('chat');
                });
                
                item.appendChild(nameSpan);
                item.appendChild(countSpan);
                item.appendChild(deleteBtn);
                list.appendChild(item);
            });
        }
        function editEmojiDescription(emoji) {
            const newDesc = prompt('修改表情包描述：', emoji.text || '');
            if (newDesc !== null && newDesc.trim()) {
                emoji.text = newDesc.trim();
                saveToStorage();
                
                // 刷新当前分组显示
                const activeTag = document.querySelector('.emoji-group-tag.active');
                if (activeTag) {
                    filterEmojiByGroup(activeTag.dataset.groupId, 'mgmt');
                }
            }
        }
        
        function showUrlImportDialog(context) {
            let modal = document.getElementById('url-import-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'url-import-modal';
            modal.className = 'emoji-mgmt-modal show';
            modal.innerHTML = `
                <div class="emoji-mgmt-content">
                    <div class="emoji-mgmt-header">
                        <h3 style="margin:0;font-size:14px;color:#000;">导入URL表情包</h3>
                        <button class="emoji-mgmt-close" onclick="document.getElementById('url-import-modal').remove();">
                            <svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div style="padding:16px;flex:1;overflow-y:auto;background:#ffffff;">
                        <div style="margin-bottom:12px;font-size:12px;color:#666;line-height:1.5;">
                            支持以下格式（文本描述:图床链接，多个用分号分隔）：<br>
                            例如：<br>
                            <span style="font-family:monospace;font-size:11px;">宝宝我来啦：https://image.uglycat.cc/w41na5.jpeg;宝宝我在：https://i.postimg.cc/xxx.png</span>
                        </div>
                        <textarea id="url-input-area" class="group-input" style="width:100%;height:150px;padding:10px;border:1px solid #ddd;border-radius:4px;resize:vertical;font-family:monospace;font-size:12px;color:#000;background:#ffffff;"></textarea>
                        <div style="margin-top:12px;display:flex;gap:8px;">
                            <button class="emoji-mgmt-btn" id="url-import-confirm" style="flex:1;background:#000;color:#fff;border:none;font-weight:500;">导入</button>
                            <button class="emoji-mgmt-btn" onclick="document.getElementById('url-import-modal').remove();" style="flex:1;">取消</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // 点击外部关闭
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            document.getElementById('url-import-confirm').addEventListener('click', function() {
                const text = document.getElementById('url-input-area').value;
                if (!text.trim()) {
                    alert('请输入URL链接');
                    return;
                }
                importUrlEmojis(text, context);
                document.getElementById('url-import-modal').remove();
            });
        }
        
        function importUrlEmojis(text, context) {
            // 支持以下格式：
            // 1. 文本:URL;文本:URL;... (推荐，英文冒号+分号)
            // 2. 文本：URL；文本：URL；... (中文冒号+分号)
            // 3. 文本\nURL\n文本\nURL\n... (兼容旧格式)
            
            let emojis = [];
            
            // 先尝试检测是否用了分号或冒号（英文或中文）
            if (text.includes(';') || text.includes('；') || text.includes(':') || text.includes('：')) {
                // 格式1/2: 用分号分隔多个表情包，每个表情包用冒号分隔名称和URL
                // 支持英文分号;和中文分号；混合
                const pairs = text.split(/[;；]/).map(p => p.trim()).filter(p => p);
                
                emojis = pairs.map(pair => {
                    // 支持英文冒号:和中文冒号：
                    const colonIndex = pair.search(/[:：]/);
                    if (colonIndex === -1) return null;
                    
                    const name = pair.substring(0, colonIndex).trim();
                    const url = pair.substring(colonIndex + 1).trim();
                    
                    if (name && url && (url.startsWith('http://') || url.startsWith('https://'))) {
                        return { text: name, url: url };
                    }
                    return null;
                }).filter(e => e !== null);
            } else {
                // 格式3: 每行交替的名称和URL
                const lines = text.split('\n').map(l => l.trim()).filter(l => l);
                for (let i = 0; i < lines.length; i += 2) {
                    if (i + 1 < lines.length) {
                        const name = lines[i];
                        const url = lines[i + 1];
                        
                        if ((url.startsWith('http://') || url.startsWith('https://')) && name) {
                            emojis.push({ text: name, url: url });
                        }
                    }
                }
            }
            
            if (emojis.length === 0) {
                alert('未找到有效的URL链接，请检查格式');
                return;
            }
            
            // 选择分组
            let modal = document.getElementById('group-select-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'group-select-modal';
            modal.className = 'emoji-mgmt-modal show';
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:300px;">
                    <div class="emoji-mgmt-header">
                        <h3 style="margin:0;font-size:14px;color:#000;">选择分组</h3>
                        <button class="emoji-mgmt-close" onclick="document.getElementById('group-select-modal').remove();">
                            <svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div id="group-select-list" style="flex:1;overflow-y:auto;padding:12px;"></div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // 点击外部关闭
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            const list = document.getElementById('group-select-list');
            AppState.emojiGroups.forEach(group => {
                const item = document.createElement('button');
                item.className = 'emoji-mgmt-btn';
                item.textContent = group.name;
                item.style.cssText = 'width:100%;height:40px;margin-bottom:8px;';
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    emojis.forEach(emoji => {
                        AppState.emojis.push({
                            id: 'emoji_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            url: emoji.url,
                            text: emoji.text,
                            groupId: group.id,
                            createdAt: new Date().toISOString()
                        });
                    });
                    
                    saveToStorage();
                    if (context === 'mgmt') {
                        renderEmojiMgmtGroups();
                        const firstGroup = AppState.emojiGroups[0];
                        if (firstGroup) renderEmojiMgmtGrid(firstGroup.id);
                    } else {
                        renderEmojiLibrary();
                        renderEmojiGroups('chat');
                    }
                    document.getElementById('group-select-modal').remove();
                    alert('已导入 ' + emojis.length + ' 个表情包');
                });
                list.appendChild(item);
            });
        }

        // ========== 角色设置相关 ==========
        function openChatMoreMenu(chat) {
            let menu = document.getElementById('chat-more-menu');
            if (menu) menu.remove();
            
            menu = document.createElement('div');
            menu.id = 'chat-more-menu';
            menu.style.cssText = `
                position: fixed;
                top: 50px;
                right: 12px;
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                min-width: 150px;
                overflow: hidden;
                animation: slideDown 0.2s ease-out;
            `;
            
            const closeMenu = () => {
                const m = document.getElementById('chat-more-menu');
                if (m) m.remove();
            };
            
            menu.innerHTML = `
                <div class="chat-menu-item" onclick="closeMenuAndAction(() => openCharacterSettings(AppState.currentChat));" style="padding:12px 16px;border-bottom:1px solid #f0f0f0;cursor:pointer;font-size:13px;transition:background 0.15s;">角色设置</div>
                <div class="chat-menu-item" onclick="closeMenuAndAction(() => manualSummarizeConversation());" style="padding:12px 16px;border-bottom:1px solid #f0f0f0;cursor:pointer;font-size:13px;transition:background 0.15s;">手动总结</div>
                <div class="chat-menu-item" onclick="closeMenuAndAction(() => openContextSummarySettings());" style="padding:12px 16px;cursor:pointer;font-size:13px;transition:background 0.15s;">总结设置</div>
            `;
            
            document.body.appendChild(menu);
            
            // 添加样式
            if (!document.querySelector('style[data-chat-menu]')) {
                const style = document.createElement('style');
                style.setAttribute('data-chat-menu', 'true');
                style.textContent = `
                    @keyframes slideDown {
                        from {
                            opacity: 0;
                            transform: translateY(-10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    .chat-menu-item:hover {
                        background: #f5f5f5;
                    }
                    
                    .chat-menu-item:active {
                        background: #efefef;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // 点击外部关闭菜单
            const closeMenuHandler = (e) => {
                const targetMenu = document.getElementById('chat-more-menu');
                if (targetMenu && !e.target.closest('#chat-more-menu') && !e.target.closest('.chat-more')) {
                    targetMenu.remove();
                    document.removeEventListener('click', closeMenuHandler);
                }
            };
            
            document.addEventListener('click', closeMenuHandler);
        }
        
        // 辅助函数：关闭菜单并执行操作
        function closeMenuAndAction(action) {
            const menu = document.getElementById('chat-more-menu');
            if (menu) {
                menu.remove();
            }
            setTimeout(() => {
                action();
            }, 100);
        }

        function openContextSummarySettings() {
            let modal = document.getElementById('summary-settings-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'summary-settings-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });

            const conv = AppState.conversations.find(c => c.id === AppState.currentChat);
            const hasSummaries = conv && conv.summaries && conv.summaries.length > 0;
            
            const summaryListHTML = hasSummaries ? `
                <div style="margin-bottom:20px;border-top:1px solid #e8e8e8;padding-top:16px;">
                    <div style="font-size:14px;color:#333;font-weight:600;margin-bottom:12px;">📋 所有总结</div>
                    <div style="max-height:300px;overflow-y:auto;">
                        ${conv.summaries.map((sum, idx) => `
                            <div style="padding:12px;background:#f9f9f9;border-radius:8px;margin-bottom:8px;border-left:3px solid #0066cc;">
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                                    <div style="font-size:12px;color:#666;flex:1;">
                                        基于最后 <strong>${sum.messageCount || '?'}</strong> 条消息 • 
                                        <strong>${new Date(sum.timestamp).toLocaleString('zh-CN')}</strong>
                                    </div>
                                    <div style="display:flex;gap:4px;white-space:nowrap;margin-left:8px;">
                                        <button onclick="editSummary('${AppState.currentChat}', ${idx})" style="padding:4px 8px;font-size:11px;border:1px solid #0066cc;background:#fff;color:#0066cc;border-radius:4px;cursor:pointer;">编辑</button>
                                        <button onclick="deleteSummary('${AppState.currentChat}', ${idx})" style="padding:4px 8px;font-size:11px;border:1px solid #f44;background:#fff;color:#f44;border-radius:4px;cursor:pointer;">删除</button>
                                    </div>
                                </div>
                                <div style="padding:8px;background:#fff;border-radius:4px;font-size:12px;color:#333;max-height:100px;overflow-y:auto;line-height:1.5;white-space:pre-wrap;word-break:break-all;">
                                    ${escapeHtml(sum.content)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '';
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:500px;max-height:90vh;overflow-y:auto;">
                    <div style="padding:16px;border-bottom:1px solid #e8e8e8;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="margin:0;font-size:16px;color:#333;font-weight:600;">总结设置</h3>
                        <button onclick="document.getElementById('summary-settings-modal').remove();" style="border:none;background:none;cursor:pointer;font-size:20px;color:#666;">×</button>
                    </div>
                    
                    <div style="padding:16px;">
                        <!-- 自动总结启用 -->
                        <div style="margin-bottom:16px;">
                            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                                <input type="checkbox" id="auto-summary-enabled" ${AppState.apiSettings.summaryEnabled ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
                                <span style="font-size:14px;color:#333;font-weight:500;">启用自动总结</span>
                            </label>
                            <div style="font-size:11px;color:#999;margin-top:4px;">当消息达到设定数量后自动进行总结</div>
                        </div>
                        
                        <!-- 自动总结间隔 -->
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">每多少条消息后自动总结</label>
                            <input type="number" id="summary-interval" value="${AppState.apiSettings.summaryInterval}" min="5" max="200" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px;">
                        </div>
                        
                        <!-- 保留最新消息数 -->
                        <div style="margin-bottom:20px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">总结后保留最新消息数</label>
                            <input type="number" id="summary-keep-latest" value="${AppState.apiSettings.summaryKeepLatest}" min="5" max="50" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px;">
                        </div>

                        <!-- 总结列表 -->
                        ${summaryListHTML}
                        
                        <!-- 操作按钮 -->
                        <div style="display:flex;gap:8px;justify-content:center;">
                            <button onclick="document.getElementById('summary-settings-modal').remove();" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:13px;">取消</button>
                            <button onclick="saveSummarySettings();" style="flex:1;padding:10px;border:none;border-radius:4px;background:#000;color:#fff;cursor:pointer;font-size:13px;">保存</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 保存设置按钮事件
            window.saveSummarySettings = function() {
                AppState.apiSettings.summaryEnabled = document.getElementById('auto-summary-enabled').checked;
                AppState.apiSettings.summaryInterval = parseInt(document.getElementById('summary-interval').value) || 50;
                AppState.apiSettings.summaryKeepLatest = parseInt(document.getElementById('summary-keep-latest').value) || 10;
                
                saveToStorage();
                document.getElementById('summary-settings-modal').remove();
                showToast('总结设置已保存');
            };
        }

        function manualSummarizeConversation() {
            if (!AppState.currentChat) return;
            
            const messages = AppState.messages[AppState.currentChat.id] || [];
            if (messages.length < 3) {
                showToast('消息过少，无需总结');
                return;
            }
            
            // 关闭菜单
            const menu = document.getElementById('chat-more-menu');
            if (menu) menu.remove();
            
            showToast('正在生成总结...');
            
            // 调用API生成总结（优先使用副API）
            summarizeContextWithAPI(AppState.currentChat.id, true); // true 表示手动总结
        }

        function summarizeContextWithAPI(convId, isManual = false) {
            // ========== 【新架构】使用副API动态提示词总结对话 ==========
            const conv = AppState.conversations.find(c => c.id === convId);
            if (!conv) {
                showToast('对话未找到');
                return;
            }

            const hasSecondaryApi = AppState.apiSettings.secondaryEndpoint && AppState.apiSettings.secondaryApiKey && AppState.apiSettings.secondarySelectedModel;
            
            if (!hasSecondaryApi) {
                showToast('请先配置副API设置');
                return;
            }
            
            // 收集对话内容
            const messages = AppState.messages[convId] || [];
            if (messages.length === 0) {
                showToast('没有消息可以总结');
                return;
            }

            let conversationText = '';
            messages.forEach(m => {
                if (m.type === 'sent' && !m.isRetracted) {
                    conversationText += `用户: ${m.content}\n`;
                } else if (m.type === 'received' && !m.isRetracted) {
                    conversationText += `${conv.name}: ${m.content}\n`;
                }
            });

            // 使用新的动态提示词系统总结
            summarizeTextViaSecondaryAPI(
                conversationText,
                (result) => {
                    if (!conv.summaries) {
                        conv.summaries = [];
                    }
                    
                    conv.summaries.push({
                        content: result,
                        isAutomatic: !isManual,
                        timestamp: new Date().toISOString(),
                        messageCount: messages.length
                    });
                    
                    saveToStorage();
                    showToast('总结已生成');
                    
                    // 触发重新渲染UI
                    if (AppState.currentChat && AppState.currentChat.id === convId) {
                        renderChatMessages();
                    }
                    renderConversations();
                },
                (error) => {
                    console.error('总结生成出错:', error);
                    showToast('总结生成失败: ' + error);
                }
            );
        }

        function showSummaryList(convId) {
            const conv = AppState.conversations.find(c => c.id === convId);
            if (!conv || !conv.summaries || conv.summaries.length === 0) return;
            
            let modal = document.getElementById('summary-list-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'summary-list-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            let summaryHTML = '';
            conv.summaries.forEach((summary, index) => {
                summaryHTML += `
                    <div style="margin-bottom:12px;padding:12px;background:#f9f9f9;border-radius:4px;border-left:3px solid #333;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <div style="font-size:12px;color:#999;">
                                ${summary.isAutomatic ? '自动' : '手动'}总结 #${index + 1}
                                <span style="margin-left:8px;">${new Date(summary.timestamp).toLocaleString()}</span>
                            </div>
                            <div style="display:flex;gap:4px;">
                                <button onclick="editSummary('${convId}', ${index})" style="padding:2px 6px;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:11px;border-radius:2px;">编辑</button>
                                <button onclick="deleteSummary('${convId}', ${index})" style="padding:2px 6px;border:1px solid #f44;background:#fff;color:#f44;cursor:pointer;font-size:11px;border-radius:2px;">删除</button>
                            </div>
                        </div>
                        <div style="font-size:12px;color:#333;line-height:1.6;word-break:break-all;">${escapeHtml(summary.content)}</div>
                    </div>
                `;
            });
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:500px;">
                    <div style="padding:16px;border-bottom:1px solid #e8e8e8;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="margin:0;font-size:16px;color:#333;font-weight:600;">对话总结</h3>
                        <button onclick="document.getElementById('summary-list-modal').remove();" style="border:none;background:none;cursor:pointer;font-size:20px;color:#666;">×</button>
                    </div>
                    
                    <div style="padding:16px;max-height:60vh;overflow-y:auto;">
                        ${summaryHTML || '<div style="text-align:center;color:#999;padding:20px;">暂无总结记录</div>'}
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 全局函数
            window.editSummary = function(convId, index) {
                const conv = AppState.conversations.find(c => c.id === convId);
                if (!conv || !conv.summaries) return;
                
                const summary = conv.summaries[index];
                const newContent = prompt('编辑总结内容：', summary.content);
                if (newContent && newContent.trim()) {
                    summary.content = newContent;
                    saveToStorage();
                    showSummaryList(convId);
                    showToast('总结已更新');
                }
            };
            
            window.deleteSummary = function(convId, index) {
                if (!confirm('确定要删除这条总结吗？')) return;
                
                const conv = AppState.conversations.find(c => c.id === convId);
                if (!conv || !conv.summaries) return;
                
                conv.summaries.splice(index, 1);
                saveToStorage();
                showSummaryList(convId);
                showToast('总结已删除');
            };
        }

        function openCharacterSettings(chat) {
            let modal = document.getElementById('character-settings-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'character-settings-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            // 获取局部世界书列表
            const localWbs = AppState.worldbooks.filter(w => !w.isGlobal);
            
            // 获取角色对应的用户名称
            const userNameForChar = chat.userNameForChar || AppState.user.name;
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:500px;max-height:90vh;overflow-y:auto;">
                    <div style="padding:16px;border-bottom:1px solid #e8e8e8;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="margin:0;font-size:16px;color:#333;font-weight:600;">角色设置</h3>
                        <button class="emoji-close-btn" onclick="document.getElementById('character-settings-modal').remove();" style="width:32px;height:32px;border-radius:50%;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;color:#666;">×</button>
                    </div>
                    
                    <div style="padding:16px;">
                        <!-- 头像区域 - 情侣空间风格 -->
                        <div style="text-align:center;margin-bottom:24px;">
                            <div style="display:flex;justify-content:center;align-items:flex-end;gap:16px;margin-bottom:12px;">
                                <!-- 角色头像 -->
                                <div>
                                    <div id="settings-char-avatar-display" style="width:70px;height:70px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;margin-bottom:8px;border:2px solid #000;overflow:hidden;">
                                        ${chat.avatar ? `<img src="${chat.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '<span style="font-size:28px;">' + chat.name.charAt(0) + '</span>'}
                                    </div>
                                    <button id="char-avatar-btn" style="padding:6px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;width:100%;">修改</button>
                                    <div style="font-size:12px;color:#666;margin-top:4px;">角色头像</div>
                                </div>
                                
                                <!-- 用户头像 -->
                                <div>
                                    <div id="settings-user-avatar-display" style="width:70px;height:70px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;margin-bottom:8px;border:2px solid #ddd;overflow:hidden;">
                                        ${chat.userAvatar ? `<img src="${chat.userAvatar}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '<span style="font-size:28px;">' + AppState.user.name.charAt(0) + '</span>'}
                                    </div>
                                    <button id="user-avatar-btn" style="padding:6px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;width:100%;">修改</button>
                                    <div style="font-size:12px;color:#666;margin-top:4px;">你的头像</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 角色名称 -->
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">角色名称</label>
                            <input type="text" id="char-name-input" value="${chat.name || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;">
                        </div>
                        
                        <!-- 角色人设 -->
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">角色人物设定</label>
                            <textarea id="char-desc-input" style="width:100%;min-height:100px;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:12px;font-family:monospace;resize:vertical;">${chat.description || ''}</textarea>
                        </div>
                        
                        <!-- 用户名称（角色对话中的用户名） -->
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">用户名称</label>
                            <input type="text" id="user-name-for-char" value="${userNameForChar}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;">
                            <div style="font-size:11px;color:#999;margin-top:4px;">在与该角色对话时，AI会读取此名称（不影响个人资料昵称）</div>
                        </div>
                        
                        <!-- 用户人设 -->
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">用户人物设定</label>
                            <textarea id="user-desc-input" style="width:100%;min-height:80px;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:12px;font-family:monospace;resize:vertical;">${AppState.user && AppState.user.personality ? AppState.user.personality : ''}</textarea>
                        </div>
                        
                        <!-- 绑定表情包分组 (支持多个) - 水平滑动框 -->
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">绑定表情包分组</label>
                            <div id="char-emoji-groups-list" style="background:#f9f9f9;border-radius:8px;overflow-x:auto;overflow-y:hidden;display:flex;flex-wrap:nowrap;gap:8px;padding:8px;border:1px solid #ddd;scroll-behavior:smooth;">
                                ${AppState.emojiGroups.map(g => `
                                    <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:#fff;border:1px solid #ddd;border-radius:20px;cursor:pointer;font-size:13px;user-select:none;flex-shrink:0;white-space:nowrap;transition:all 0.2s;">
                                        <input type="checkbox" class="eg-checkbox" value="${g.id}" style="cursor:pointer;width:16px;height:16px;flex-shrink:0;margin:0;">
                                        <span>${g.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                            <div style="font-size:11px;color:#999;margin-top:4px;">支持多选，向右滑动查看更多</div>
                        </div>
                        
                        <!-- 绑定局部世界书 (支持多个) - 水平滑动框 -->
                        <div style="margin-bottom:20px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">绑定局部世界书</label>
                            <div id="char-worldbooks-list" style="background:#f9f9f9;border-radius:8px;overflow-x:auto;overflow-y:hidden;display:flex;flex-wrap:nowrap;gap:8px;padding:8px;border:1px solid #ddd;scroll-behavior:smooth;">
                                ${localWbs.map(w => `
                                    <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:#fff;border:1px solid #ddd;border-radius:20px;cursor:pointer;font-size:13px;user-select:none;flex-shrink:0;white-space:nowrap;transition:all 0.2s;">
                                        <input type="checkbox" class="wb-checkbox" value="${w.id}" style="cursor:pointer;width:16px;height:16px;flex-shrink:0;margin:0;">
                                        <span>${w.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                            <div style="font-size:11px;color:#999;margin-top:4px;">支持多选，向右滑动查看更多</div>
                        </div>
                        
                        <!-- 聊天背景图片 -->
                        <div style="margin-bottom:20px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">聊天背景图片</label>
                            <div style="width:100%;height:80px;border:1px solid #ddd;border-radius:4px;background-size:cover;background-position:center;background-image:${chat.chatBgImage ? `url('${chat.chatBgImage}')` : 'none'};display:flex;align-items:center;justify-content:center;margin-bottom:8px;background-color:#f5f5f5;">
                                ${!chat.chatBgImage ? '<span style="color:#999;font-size:12px;">无背景图</span>' : ''}
                            </div>
                            <button id="chat-bg-upload-btn" style="padding:8px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;width:100%;margin-bottom:6px;">选择背景图</button>
                            ${chat.chatBgImage ? `<button id="chat-bg-clear-btn" style="padding:8px 12px;border:1px solid #f44;border-radius:4px;background:#fff;color:#f44;cursor:pointer;font-size:12px;width:100%;">清除背景</button>` : ''}
                        </div>
                        
                        <!-- 操作按钮 -->
                        <div style="display:flex;gap:8px;justify-content:center;border-top:1px solid #e8e8e8;padding-top:16px;">
                            <button onclick="document.getElementById('character-settings-modal').remove();" style="padding:8px 16px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:13px;flex:1;">取消</button>
                            <button onclick="saveCharacterSettings('${chat.id}');" style="padding:8px 16px;border:none;border-radius:4px;background:#000;color:#fff;cursor:pointer;font-size:13px;flex:1;">保存</button>
                            <button onclick="deleteCharacter('${chat.id}');" style="padding:8px 16px;border:1px solid #f44;border-radius:4px;background:#fff;color:#f44;cursor:pointer;font-size:13px;flex:1;">删除角色</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // 设置当前绑定的分组（多个）
            if (chat.boundEmojiGroups && Array.isArray(chat.boundEmojiGroups)) {
                chat.boundEmojiGroups.forEach(egId => {
                    const checkbox = document.querySelector(`.eg-checkbox[value="${egId}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            // 设置当前绑定的世界书（多个）
            if (chat.boundWorldbooks && Array.isArray(chat.boundWorldbooks)) {
                chat.boundWorldbooks.forEach(wbId => {
                    const checkbox = document.querySelector(`.wb-checkbox[value="${wbId}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            // 角色头像修改按钮
            const charAvatarBtn = document.getElementById('char-avatar-btn');
            if (charAvatarBtn) {
                charAvatarBtn.addEventListener('click', function() {
                    openImagePickerForCharacter('avatar', chat.id);
                });
            }
            
            // 用户头像修改按钮
            const userAvatarBtn = document.getElementById('user-avatar-btn');
            if (userAvatarBtn) {
                userAvatarBtn.addEventListener('click', function() {
                    openImagePicker('user-avatar', true);  // 标记为从角色设置页面调用
                });
            }
            
            // 聊天背景图片按钮
            const chatBgUploadBtn = document.getElementById('chat-bg-upload-btn');
            if (chatBgUploadBtn) {
                chatBgUploadBtn.addEventListener('click', function() {
                    openChatBgImagePicker(chat.id);
                });
            }
            
            const chatBgClearBtn = document.getElementById('chat-bg-clear-btn');
            if (chatBgClearBtn) {
                chatBgClearBtn.addEventListener('click', function() {
                    const conv = AppState.conversations.find(c => c.id === chat.id);
                    if (conv) {
                        conv.chatBgImage = null;
                        saveToStorage();
                        // 重新打开设置窗口以刷新
                        document.getElementById('character-settings-modal').remove();
                        openCharacterSettings(conv);
                    }
                });
            }
        }
        
        // 打开聊天背景图片选择器
        function openChatBgImagePicker(charId) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/jpeg,image/png,image/webp,image/gif';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function(readEvent) {
                    const conv = AppState.conversations.find(c => c.id === charId);
                    if (conv) {
                        conv.chatBgImage = readEvent.target.result;
                        saveToStorage();
                        // 重新打开设置窗口以刷新
                        document.getElementById('character-settings-modal').remove();
                        openCharacterSettings(conv);
                        showToast('背景图片已更新');
                    }
                };
                reader.readAsDataURL(file);
            };
            input.click();
        }

        function saveCharacterSettings(charId) {
            const conv = AppState.conversations.find(c => c.id === charId);
            if (!conv) return;
            
            conv.name = document.getElementById('char-name-input').value || conv.name;
            conv.description = document.getElementById('char-desc-input').value;
            conv.userNameForChar = document.getElementById('user-name-for-char').value || AppState.user.name;
            
            // 保存绑定的表情包分组（支持多个）
            const egCheckboxes = document.querySelectorAll('.eg-checkbox:checked');
            conv.boundEmojiGroups = Array.from(egCheckboxes).map(cb => cb.value);
            
            // 保存绑定的世界书（支持多个）
            const wbCheckboxes = document.querySelectorAll('.wb-checkbox:checked');
            conv.boundWorldbooks = Array.from(wbCheckboxes).map(cb => cb.value);
            
            // 注意：用户头像已经通过applyImage()保存到conv.userAvatar中了
            
            if (AppState.user) {
                AppState.user.personality = document.getElementById('user-desc-input').value;
            }
            
            saveToStorage();
            renderConversations();
            
            // 如果当前正在聊天，更新聊天页面的显示
            if (AppState.currentChat && AppState.currentChat.id === charId) {
                AppState.currentChat = conv;
                
                // 立即应用背景图片到聊天页面
                const chatPage = document.getElementById('chat-page');
                if (chatPage) {
                    if (conv.chatBgImage) {
                        chatPage.style.backgroundImage = `url('${conv.chatBgImage}')`;
                        chatPage.style.backgroundSize = 'cover';
                        chatPage.style.backgroundPosition = 'center';
                        chatPage.style.backgroundAttachment = 'fixed';
                    } else {
                        chatPage.style.backgroundImage = 'none';
                    }
                }
                
                renderChatMessages(charId);
                // 更新聊天标题
                document.getElementById('chat-title').textContent = conv.name;
            }
            
            document.getElementById('character-settings-modal').remove();
            showToast('设置已保存');
        }

        function deleteCharacter(charId) {
            const conv = AppState.conversations.find(c => c.id === charId);
            if (!conv) return;
            
            if (!confirm(`确定要删除 ${conv.name} 及其所有聊天记录吗？`)) return;
            
            // 删除会话
            AppState.conversations = AppState.conversations.filter(c => c.id !== charId);
            
            // 同时从好友列表中删除
            AppState.friends = AppState.friends.filter(f => f.id !== charId);
            
            // 删除对应的消息记录
            delete AppState.messages[charId];
            
            // 如果当前正在聊天，关闭聊天页面
            if (AppState.currentChat && AppState.currentChat.id === charId) {
                AppState.currentChat = null;
                document.getElementById('chat-page').classList.remove('open');
            }
            
            // 保存和重新渲染
            saveToStorage();
            renderConversations();
            renderFriends();
            
            // 关闭设置对话框
            const settingsModal = document.getElementById('character-settings-modal');
            if (settingsModal) settingsModal.remove();
            
            showToast('角色已删除');
        }

        // ===== 角色心声系统 =====
        function openCharacterMindState(chat) {
            console.log(`\n🎬 打开心声页面 - 角色: ${chat.name}, ID: ${chat.id}`);
            
            let modal = document.getElementById('mind-state-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'mind-state-modal';
            modal.className = 'emoji-mgmt-modal show';
            modal.style.cssText = 'background:rgba(0,0,0,0.6);';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            // 获取或初始化心声数据
            if (!chat.mindStates) {
                chat.mindStates = [];
            }
            
            console.log(`   mindStates长度: ${chat.mindStates.length}`);
            if (chat.mindStates.length > 0) {
                console.log(`   最后一条心声数据:`, chat.mindStates[chat.mindStates.length - 1]);
            }
            
            const mindItems = [
                { key: 'affinity', label: '好感度', format: 'affinity' },
                { key: 'outfit', label: '穿搭' },
                { key: 'mood', label: '心情' },
                { key: 'action', label: '动作' },
                { key: 'thought', label: '心声' },
                { key: 'badThought', label: '坏心思' }
            ];
            
            // 获取当前状态
            const currentState = chat.mindStates[chat.mindStates.length - 1] || {};
            const isFailedState = currentState.failed;
            
            // 【修复】检查是否有真实的心声数据（而不是仅有系统字段）
            // 只要有以下任一字段有值，就认为有心声数据：affinity, outfit, mood, action, thought, badThought
            const hasRealMindData = currentState.affinity !== undefined 
                || currentState.outfit 
                || currentState.mood 
                || currentState.action 
                || currentState.thought 
                || currentState.badThought;
            
            const hasNoMindState = chat.mindStates.length === 0 || !hasRealMindData;
            
            console.log(`   isFailedState: ${isFailedState}`);
            console.log(`   hasRealMindData: ${hasRealMindData}`);
            console.log(`   hasNoMindState: ${hasNoMindState}`);
            
            let content = `
                <div class="emoji-mgmt-content" style="max-width:400px;background:#f5f5f5;display:flex;flex-direction:column;max-height:80vh;">
                    <div style="padding:16px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;background:#fff;flex-shrink:0;">
                        <h3 style="margin:0;font-size:16px;color:#333;font-weight:600;">${chat.name}的心声</h3>
                        <button onclick="document.getElementById('mind-state-modal').remove();" style="border:none;background:none;cursor:pointer;font-size:20px;color:#666;">×</button>
                    </div>
                    ${isFailedState ? `<div style="padding:12px;background:#fff3cd;border-bottom:1px solid #ffc107;color:#856404;font-size:12px;">⚠️ 心声提取失败：请确保API已配置正确，且AI在回复末尾添加了完整的【心声】标记。</div>` : ''}
            `;
            
            if (hasNoMindState) {
                content += `<div style="padding:20px;background:#fff;margin-bottom:0;flex:1;overflow-y:auto;overflow-x:hidden;display:flex;align-items:center;justify-content:center;text-align:center;"><div style="color:#999;"><div style="font-size:32px;margin-bottom:12px;">💭</div><div style="font-size:14px;margin-bottom:8px;">暂无心声数据</div><div style="font-size:12px;color:#bbb;">双击角色头像生成首条心声</div></div></div>`;
            } else {
                content += `<div style="padding:16px;background:#fff;margin-bottom:0;flex:1;overflow-y:auto;overflow-x:hidden;">`;
                
                // 【优化】先单独处理好感度，确保它总是第一个显示
                const affinityItem = mindItems.find(item => item.key === 'affinity');
                const otherItems = mindItems.filter(item => item.key !== 'affinity');
                
                console.log(`   🎨 开始渲染心声内容...`);
                console.log(`   affinity字段在currentState中:`, Object.keys(currentState).includes('affinity'));
                console.log(`   affinity值:`, currentState.affinity);
                console.log(`   affinity类型:`, typeof currentState.affinity);
                
                // 先渲染好感度（如果有）
                const affinityValue = currentState[affinityItem.key] !== undefined ? currentState[affinityItem.key] : null;
                console.log(`   ✓ 最终affinityValue:`, affinityValue, `(类型: ${typeof affinityValue})`);
                
                if (affinityValue !== null && typeof affinityValue === 'number') {
                    console.log(`   ✅ 好感度存在，开始渲染...`);
                    const affinityColor = affinityValue >= 70 ? '#4CAF50' : (affinityValue >= 40 ? '#FFC107' : '#F44336');
                    const change = currentState.affinityChange || 0;
                    const changeDisplay = change > 0 ? `+${change}` : change;
                    const reason = currentState.affinityReason || '';
                    
                    const affinityBar = `
                        <div style="width:100%;height:8px;background:#e0e0e0;border-radius:4px;margin-top:4px;overflow:hidden;">
                            <div style="width:${affinityValue}%;height:100%;background:${affinityColor};transition:width 0.3s;"></div>
                        </div>
                        <div style="font-size:12px;color:${affinityColor};margin-top:4px;font-weight:bold;">${affinityValue}/100</div>
                    `;
                    
                    let changeReasonHtml = '';
                    if (change !== 0 || reason) {
                        changeReasonHtml = `<div style="font-size:12px;color:#999;margin-top:8px;padding-top:8px;border-top:1px solid #eee;">`;
                        if (change !== 0) {
                            const changeColor = change > 0 ? '#4CAF50' : (change < 0 ? '#F44336' : '#999');
                            changeReasonHtml += `<div style="color:${changeColor};font-weight:bold;">变化：${changeDisplay}</div>`;
                        }
                        if (reason) {
                            changeReasonHtml += `<div style="color:#666;margin-top:4px;">原因：${escapeHtml(String(reason))}</div>`;
                        }
                        changeReasonHtml += `</div>`;
                    }
                    
                    content += `
                        <div style="margin-bottom:12px;padding:12px;background:#f9f9f9;border-radius:4px;border-left:3px solid ${affinityColor};">
                            <div style="font-size:14px;color:#333;font-weight:600;margin-bottom:4px;display:flex;align-items:center;">
                                <span>好感度</span>
                                <span style="margin-left:auto;font-size:11px;background:${affinityColor};color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;">${affinityValue}</span>
                            </div>
                            ${affinityBar}
                            ${changeReasonHtml}
                        </div>
                    `;
                } else {
                    console.log(`   ⚠️ 好感度值为null或不是数字:`, affinityValue);
                }
                
                // 显示失败提示（如果有）
                if (currentState.failed) {
                    content += `
                        <div style="margin-bottom:12px;padding:12px;background:#fff3cd;border-radius:4px;border-left:3px solid #ff9800;">
                            <div style="font-size:13px;color:#ff9800;word-break:break-all;">⚠️ ${currentState.reason || '心声数据提取失败'}</div>
                        </div>
                    `;
                }
                
                // 再渲染其他字段
                otherItems.forEach(item => {
                    let value = currentState[item.key] !== undefined ? currentState[item.key] : null;
                    let displayValue = value;
                    
                    // 只显示非空的字段
                    if (value === null || value === undefined || value === '') {
                        return;
                    }
                    
                    // 检查字段值是否被污染（包含其他标签的内容）
                    const hasOtherLabels = /穿搭|心情|动作|心声|坏心思|好感度/.test(String(value));
                    const itemColor = hasOtherLabels ? '#ff9800' : '#333';
                    
                    content += `
                        <div style="margin-bottom:12px;padding:12px;background:#f9f9f9;border-radius:4px;border-left:3px solid ${itemColor};">
                            <div style="font-size:14px;color:#333;font-weight:600;margin-bottom:4px;">${item.label}</div>
                            <div style="font-size:13px;color:${hasOtherLabels ? '#ff9800' : '#666'};word-break:break-all;">${escapeHtml(String(displayValue))}</div>
                        </div>
                    `;
                });
                
                content += `</div>`;
            }
            
            content += `
                    <div style="padding:12px;background:#fff;border-top:1px solid #ddd;display:flex;gap:8px;flex-shrink:0;">
                        <button onclick="showCharacterMindHistory('${chat.id}');" style="flex:1;padding:10px;border:1px solid #ddd;background:#fff;border-radius:4px;cursor:pointer;font-size:13px;">历史心声</button>
                        <button onclick="document.getElementById('mind-state-modal').remove();" style="flex:1;padding:10px;border:none;background:#333;color:#fff;border-radius:4px;cursor:pointer;font-size:13px;">关闭</button>
                    </div>
                </div>
            `;
            
            modal.innerHTML = content;
            document.body.appendChild(modal);
        }

        function clearCharacterMindState(charId) {
            const chat = AppState.conversations.find(c => c.id === charId);
            if (!chat) return;
            
            if (!chat.mindStates) {
                chat.mindStates = [];
            }
            
            // 清空最后一条的所有心声
            if (chat.mindStates.length > 0) {
                chat.mindStates[chat.mindStates.length - 1] = {};
            }
            
            saveToStorage();
            showToast('心声已清空');
            openCharacterMindState(chat);
        }

        function showCharacterMindHistory(charId) {
            const chat = AppState.conversations.find(c => c.id === charId);
            if (!chat) return;
            
            let modal = document.getElementById('mind-history-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'mind-history-modal';
            modal.className = 'emoji-mgmt-modal show';
            modal.style.cssText = 'background:rgba(0,0,0,0.6);';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });

            // 生成历史心声内容
            let historyContent = '';
            if (chat.mindStates && chat.mindStates.length > 0) {
                // 反向遍历（最新的在上面）
                for (let i = chat.mindStates.length - 1; i >= 0; i--) {
                    const state = chat.mindStates[i];
                    const recordIndex = chat.mindStates.length - i;
                    
                    // 处理好感度显示（包含变化和原因）
                    let affinityDisplay = '';
                    if (state.affinity !== undefined && typeof state.affinity === 'number') {
                        const affinityColor = state.affinity >= 70 ? '#4CAF50' : (state.affinity >= 40 ? '#FFC107' : '#F44336');
                        const change = state.affinityChange || 0;
                        const changeDisplay = change > 0 ? `+${change}` : change;
                        const reason = state.affinityReason || '';
                        
                        affinityDisplay = `<div style="margin-bottom:6px;">
                            <span style="color:${affinityColor};font-size:12px;font-weight:bold;">好感度：</span>
                            <span style="color:${affinityColor};font-size:13px;font-weight:bold;">${state.affinity}/100</span>`;
                        
                        if (change !== 0 || reason) {
                            const changeColor = change > 0 ? '#4CAF50' : (change < 0 ? '#F44336' : '#999');
                            if (change !== 0) {
                                affinityDisplay += `<span style="color:${changeColor};font-size:12px;margin-left:8px;">(${changeDisplay})</span>`;
                            }
                            if (reason) {
                                affinityDisplay += `<div style="font-size:11px;color:#999;margin-top:2px;">原因：${escapeHtml(reason)}</div>`;
                            }
                        }
                        affinityDisplay += `</div>`;
                    }
                    
                    historyContent += `
                        <div style="margin-bottom:16px;padding:12px;background:#f9f9f9;border-radius:4px;border-left:3px solid #333;position:relative;">
                            <button onclick="deleteSingleMindState('${chat.id}', ${i})" style="position:absolute;top:12px;right:12px;padding:4px 8px;border:1px solid #FF3B30;background:#fff;color:#FF3B30;border-radius:4px;cursor:pointer;font-size:11px;white-space:nowrap;">删除</button>
                            <div style="font-size:12px;color:#999;margin-bottom:8px;">记录 #${recordIndex}</div>
                            ${affinityDisplay}
                            ${Object.entries(state).filter(([key]) => !['affinity', 'affinityChange', 'affinityReason'].includes(key)).map(([key, value]) => {
                                const labels = {
                                    'outfit': '穿搭',
                                    'mood': '心情',
                                    'action': '动作',
                                    'thought': '心声',
                                    'badThought': '坏心思'
                                };
                                return `<div style="margin-bottom:6px;"><span style="color:#666;font-size:12px;">${labels[key] || key}：</span><span style="color:#333;font-size:13px;">${escapeHtml(String(value))}</span></div>`;
                            }).join('')}
                        </div>
                    `;
                }
            } else {
                historyContent = '<div style="text-align:center;color:#999;padding:40px 20px;font-size:13px;">暂无历史心声记录</div>';
            }
            
            let content = `
                <div class="emoji-mgmt-content" style="max-width:400px;background:#f5f5f5;display:flex;flex-direction:column;max-height:80vh;">
                    <div style="padding:16px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;background:#fff;flex-shrink:0;">
                        <h3 style="margin:0;font-size:16px;color:#333;font-weight:600;">${chat.name}的历史心声</h3>
                        <button onclick="document.getElementById('mind-history-modal').remove();" style="border:none;background:none;cursor:pointer;font-size:20px;color:#666;">×</button>
                    </div>
                    
                    <div style="padding:16px;background:#fff;flex:1;overflow-y:auto;overflow-x:hidden;">
                        ${historyContent}
                    </div>
                    
                    <div style="padding:12px;background:#fff;border-top:1px solid #ddd;display:flex;gap:8px;flex-shrink:0;">
                        ${(chat.mindStates && chat.mindStates.length > 0) ? `<button onclick="openDeleteConfirmDialog('${chat.id}');" style="flex:1;padding:10px;border:1px solid #FF3B30;background:#fff;color:#FF3B30;border-radius:4px;cursor:pointer;font-size:13px;">清空全部</button>` : ''}
                        <button onclick="document.getElementById('mind-history-modal').remove();" style="flex:1;padding:10px;border:none;background:#333;color:#fff;border-radius:4px;cursor:pointer;font-size:13px;">关闭</button>
                    </div>
                </div>
            `;
            
            modal.innerHTML = content;
            document.body.appendChild(modal);
        }

        // 打开删除二次确认弹窗
        function openDeleteConfirmDialog(charId) {
            const chat = AppState.conversations.find(c => c.id === charId);
            if (!chat) return;
            
            let confirmModal = document.getElementById('delete-confirm-modal');
            if (confirmModal) confirmModal.remove();
            
            confirmModal = document.createElement('div');
            confirmModal.id = 'delete-confirm-modal';
            confirmModal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:center;z-index:50001;';
            
            confirmModal.addEventListener('click', function(e) {
                if (e.target === confirmModal) {
                    confirmModal.remove();
                }
            });
            
            const content = `
                <div style="background:#fff;border-radius:12px;padding:24px;max-width:320px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.2);">
                    <div style="font-size:16px;color:#333;font-weight:600;margin-bottom:12px;">确定要清空全部心声吗？</div>
                    <div style="font-size:13px;color:#999;margin-bottom:24px;">此操作无法撤销，${chat.name}的所有历史心声记录将被永久删除。</div>
                    <div style="display:flex;gap:12px;">
                        <button onclick="document.getElementById('delete-confirm-modal').remove();" style="flex:1;padding:10px;border:1px solid #ddd;background:#f9f9f9;border-radius:8px;cursor:pointer;font-size:13px;color:#333;">取消</button>
                        <button onclick="deleteCharacterMindStates('${charId}');document.getElementById('delete-confirm-modal').remove();" style="flex:1;padding:10px;border:none;background:#FF3B30;border-radius:8px;cursor:pointer;font-size:13px;color:#fff;">确定删除</button>
                    </div>
                </div>
            `;
            
            confirmModal.innerHTML = content;
            document.body.appendChild(confirmModal);
        }

        function deleteSingleMindState(charId, index) {
            const chat = AppState.conversations.find(c => c.id === charId);
            if (!chat || !chat.mindStates) return;
            
            if (!confirm('确定要删除这条心声记录吗？')) return;
            
            chat.mindStates.splice(index, 1);
            saveToStorage();
            showToast('心声已删除');
            showCharacterMindHistory(charId);
        }

        function deleteCharacterMindStates(charId) {
            const chat = AppState.conversations.find(c => c.id === charId);
            if (!chat) return;
            
            if (!confirm('确定要删除该角色的所有心声记录吗？')) return;
            
            chat.mindStates = [];
            saveToStorage();
            showToast('所有心声已删除');
            openCharacterMindState(chat);
        }

        function updateCharacterMindState(charId, mindData) {
            const chat = AppState.conversations.find(c => c.id === charId);
            if (!chat) return;
            
            if (!chat.mindStates) {
                chat.mindStates = [];
            }
            
            // 添加新的心声记录
            chat.mindStates.push(mindData);
            saveToStorage();
        }

        // ===== 世界书系统 =====
        function openAddWorldbookDialog() {
            const modal = document.createElement('div');
            modal.id = 'add-worldbook-modal';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
            
            modal.innerHTML = `
                <div style="background:#fff;border-radius:8px;padding:20px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h3 style="margin:0;font-size:16px;font-weight:600;">新建世界书</h3>
                        <button onclick="document.getElementById('add-worldbook-modal').remove();" style="border:none;background:none;cursor:pointer;font-size:20px;">✕</button>
                    </div>
                    
                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">世界书名称</label>
                        <input id="wb-name-input" type="text" placeholder="如：《异星殖民地世界观》" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;font-size:13px;">
                    </div>
                    
                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">世界书内容</label>
                        <textarea id="wb-content-input" placeholder="描述此世界的设定、背景、规则等..." style="width:100%;height:200px;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;font-size:13px;resize:vertical;"></textarea>
                        <div style="font-size:11px;color:#999;margin-top:4px;">AI会在回复前读取这些内容，以保持话题背景</div>
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="display:flex;align-items:center;font-size:13px;cursor:pointer;">
                            <input id="wb-global-checkbox" type="checkbox" style="margin-right:8px;cursor:pointer;">
                            <span>设为全局世界书（所有角色都会使用）</span>
                        </label>
                    </div>
                    
                    <div style="display:flex;gap:8px;justify-content:flex-end;">
                        <button onclick="document.getElementById('add-worldbook-modal').remove();" style="padding:8px 16px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:13px;">取消</button>
                        <button onclick="saveNewWorldbook();" style="padding:8px 16px;border:none;border-radius:4px;background:#000;color:#fff;cursor:pointer;font-size:13px;">创建</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            document.getElementById('wb-name-input').focus();
            
            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        function handleWorldbookImport(files) {
            if (!files || files.length === 0) return;
            
            Array.from(files).forEach(function(file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const data = JSON.parse(e.target.result);
                        let worldbooks = [];
                        
                        // 处理不同格式的世界书JSON
                        if (Array.isArray(data)) {
                            // 数组格式：[{name, content, isGlobal?}, ...]
                            worldbooks = data.map(wb => ({
                                name: wb.name || wb.title || '未命名世界书',
                                content: wb.content || wb.data || '',
                                isGlobal: wb.isGlobal || wb.global || false
                            }));
                        } else if (typeof data === 'object' && data.name && data.content) {
                            // 单个世界书对象
                            worldbooks = [{
                                name: data.name || data.title || '未命名世界书',
                                content: data.content || data.data || '',
                                isGlobal: data.isGlobal || data.global || false
                            }];
                        } else if (typeof data === 'object') {
                            // 其他格式尝试解析
                            if (data.spec === 'world_book_v1' || data.spec === 'chara_world') {
                                // SillyTavern世界书格式
                                worldbooks = [{
                                    name: data.name || '世界书',
                                    content: data.entries ? JSON.stringify(data.entries) : data.content || '',
                                    isGlobal: false
                                }];
                            }
                        }
                        
                        if (worldbooks.length === 0) {
                            showToast('文件 ' + file.name + ' 格式不支持');
                            return;
                        }
                        
                        // 显示导入选项对话框
                        showWorldbookImportDialog(worldbooks, file.name);
                    } catch (err) {
                        console.error('解析世界书失败:', file.name, err);
                        showToast('文件 ' + file.name + ' 解析失败');
                    }
                };
                reader.readAsText(file);
            });
        }

        function showWorldbookImportDialog(worldbooks, fileName) {
            let modal = document.getElementById('wb-import-dialog-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'wb-import-dialog-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            let wbList = '';
            worldbooks.forEach((wb, idx) => {
                wbList += `
                    <div style="padding:12px;background:#f9f9f9;border-radius:4px;margin-bottom:8px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                            <input type="radio" name="wb-import-type" id="wb-type-${idx}" value="${idx}" ${idx === 0 ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
                            <label for="wb-type-${idx}" style="flex:1;cursor:pointer;font-size:13px;font-weight:500;color:#333;margin:0;">
                                ${escapeHtml(wb.name)}
                            </label>
                        </div>
                        <div style="margin-left:24px;">
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#666;">
                                <input type="radio" name="wb-import-scope-${idx}" value="global" style="width:14px;height:14px;cursor:pointer;">
                                全局世界书（所有角色可用）
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#666;margin-top:4px;">
                                <input type="radio" name="wb-import-scope-${idx}" value="local" checked style="width:14px;height:14px;cursor:pointer;">
                                局部世界书（需绑定到角色）
                            </label>
                        </div>
                    </div>
                `;
            });
            
            // 使用全局变量存储待导入的世界书数据，避免JSON序列化的HTML属性转义问题
            window.pendingWorldbookImport = worldbooks;
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:400px;">
                    <div class="emoji-mgmt-header">
                        <h3 style="margin:0;font-size:14px;color:#000;">选择导入的世界书</h3>
                        <button class="emoji-mgmt-close" onclick="document.getElementById('wb-import-dialog-modal').remove();">
                            <svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div style="padding:16px;flex:1;overflow-y:auto;background:#ffffff;">
                        <div style="margin-bottom:8px;font-size:12px;color:#666;">文件：${escapeHtml(fileName)}</div>
                        ${wbList}
                        <div style="display:flex;gap:8px;margin-top:16px;">
                            <button onclick="document.getElementById('wb-import-dialog-modal').remove();" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:13px;">取消</button>
                            <button onclick="confirmWorldbookImport();" style="flex:1;padding:8px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:500;">导入</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        function confirmWorldbookImport() {
            if (!window.pendingWorldbookImport || window.pendingWorldbookImport.length === 0) {
                showToast('没有待导入的世界书');
                return;
            }
            
            const selectedIdx = parseInt(document.querySelector('input[name="wb-import-type"]:checked').value);
            const selectedWb = window.pendingWorldbookImport[selectedIdx];
            const isGlobal = document.querySelector(`input[name="wb-import-scope-${selectedIdx}"]:checked`).value === 'global';
            
            if (!selectedWb || !selectedWb.content || !selectedWb.content.trim()) {
                showToast('世界书内容为空');
                return;
            }
            
            const newWb = {
                id: 'wb_' + Date.now(),
                name: selectedWb.name || '导入的世界书',
                content: selectedWb.content,
                isGlobal: isGlobal,
                createdAt: new Date().toISOString()
            };
            
            AppState.worldbooks.push(newWb);
            saveToStorage();
            document.getElementById('wb-import-dialog-modal').remove();
            showToast(`世界书"${newWb.name}"导入成功`);
            loadWorldbookUI();
            window.pendingWorldbookImport = null;
        }

        function saveNewWorldbook() {
            const name = document.getElementById('wb-name-input').value.trim();
            const content = document.getElementById('wb-content-input').value.trim();
            const isGlobal = document.getElementById('wb-global-checkbox').checked;
            
            if (!name) {
                alert('请输入世界书名称');
                return;
            }
            
            if (!content) {
                alert('请输入世界书内容');
                return;
            }
            
            const worldbook = {
                id: 'wb_' + Date.now(),
                name: name,
                content: content,
                isGlobal: isGlobal,
                createdAt: new Date().toISOString()
            };
            
            AppState.worldbooks.push(worldbook);
            saveToStorage();
            renderWorldbooks();
            updateCharacterWorldbookSelects();
            document.getElementById('add-worldbook-modal').remove();
            alert('世界书创建成功');
        }

        function deleteWorldbook(wbId) {
            const wb = AppState.worldbooks.find(w => w.id === wbId);
            if (!wb) return;
            
            if (!confirm(`确定要删除「${wb.name}」吗？`)) return;
            
            AppState.worldbooks = AppState.worldbooks.filter(w => w.id !== wbId);
            
            // 清除所有已绑定该世界书的角色
            AppState.conversations.forEach(conv => {
                if (conv.boundWorldbooks && Array.isArray(conv.boundWorldbooks)) {
                    conv.boundWorldbooks = conv.boundWorldbooks.filter(id => id !== wbId);
                }
            });
            
            saveToStorage();
            renderWorldbooks();
            updateCharacterWorldbookSelects();
            alert('世界书已删除');
        }

        function renderWorldbooks() {
            const globalContainer = document.getElementById('global-worldbooks-list');
            const localContainer = document.getElementById('local-worldbooks-list');
            
            if (!globalContainer || !localContainer) return;
            
            const globalWbs = AppState.worldbooks.filter(w => w.isGlobal);
            const localWbs = AppState.worldbooks.filter(w => !w.isGlobal);
            
            globalContainer.innerHTML = globalWbs.map(wb => `
                <div style="background:#f5f5f5;border-radius:8px;padding:12px;margin-bottom:10px;border-left:3px solid #000;">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">
                        <h4 style="margin:0;font-size:13px;font-weight:600;flex:1;">${wb.name}</h4>
                        <div style="display:flex;gap:4px;">
                            <button onclick="editWorldbook('${wb.id}');" style="border:none;background:none;color:#333;cursor:pointer;font-size:12px;padding:0;text-decoration:underline;">编辑</button>
                            <button onclick="deleteWorldbook('${wb.id}');" style="border:none;background:none;color:#f44;cursor:pointer;font-size:14px;padding:0;">✕</button>
                        </div>
                    </div>
                    <p style="margin:0;font-size:12px;color:#666;line-height:1.4;max-height:60px;overflow:hidden;text-overflow:ellipsis;">${wb.content}</p>
                    <div style="font-size:10px;color:#999;margin-top:6px;">创建于 ${new Date(wb.createdAt).toLocaleDateString()}</div>
                </div>
            `).join('');
            
            localContainer.innerHTML = localWbs.map(wb => `
                <div style="background:#f5f5f5;border-radius:8px;padding:12px;margin-bottom:10px;border-left:3px solid #666;">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">
                        <h4 style="margin:0;font-size:13px;font-weight:600;flex:1;">${wb.name}</h4>
                        <div style="display:flex;gap:4px;">
                            <button onclick="editWorldbook('${wb.id}');" style="border:none;background:none;color:#333;cursor:pointer;font-size:12px;padding:0;text-decoration:underline;">编辑</button>
                            <button onclick="deleteWorldbook('${wb.id}');" style="border:none;background:none;color:#f44;cursor:pointer;font-size:14px;padding:0;">✕</button>
                        </div>
                    </div>
                    <p style="margin:0;font-size:12px;color:#666;line-height:1.4;max-height:60px;overflow:hidden;text-overflow:ellipsis;">${wb.content}</p>
                    <div style="font-size:10px;color:#999;margin-top:6px;">创建于 ${new Date(wb.createdAt).toLocaleDateString()}</div>
                </div>
            `).join('');
            
            if (globalWbs.length === 0) {
                globalContainer.innerHTML = '<div style="text-align:center;color:#999;padding:20px;font-size:13px;">暂无全局世界书</div>';
            }
            
            if (localWbs.length === 0) {
                localContainer.innerHTML = '<div style="text-align:center;color:#999;padding:20px;font-size:13px;">暂无局部世界书</div>';
            }
        }
        
        // 编辑世界书
        function editWorldbook(wbId) {
            const wb = AppState.worldbooks.find(w => w.id === wbId);
            if (!wb) return;
            
            let modal = document.getElementById('edit-worldbook-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'edit-worldbook-modal';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
            
            modal.innerHTML = `
                <div style="background:#fff;border-radius:8px;padding:20px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h3 style="margin:0;font-size:16px;font-weight:600;">编辑世界书</h3>
                        <button onclick="document.getElementById('edit-worldbook-modal').remove();" style="border:none;background:none;cursor:pointer;font-size:20px;">✕</button>
                    </div>
                    
                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">世界书名称</label>
                        <input id="edit-wb-name-input" type="text" value="${wb.name}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;font-size:13px;">
                    </div>
                    
                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">世界书内容</label>
                        <textarea id="edit-wb-content-input" style="width:100%;height:200px;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;font-size:13px;resize:vertical;">${wb.content}</textarea>
                    </div>
                    
                    <div style="display:flex;gap:8px;justify-content:flex-end;">
                        <button onclick="document.getElementById('edit-worldbook-modal').remove();" style="padding:8px 16px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:13px;">取消</button>
                        <button onclick="saveEditedWorldbook('${wbId}');" style="padding:8px 16px;border:none;border-radius:4px;background:#000;color:#fff;cursor:pointer;font-size:13px;">保存</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }
        
        // 保存编辑的世界书
        function saveEditedWorldbook(wbId) {
            const wb = AppState.worldbooks.find(w => w.id === wbId);
            if (!wb) return;
            
            const name = document.getElementById('edit-wb-name-input').value.trim();
            const content = document.getElementById('edit-wb-content-input').value.trim();
            
            if (!name || !content) {
                showToast('名称和内容不能为空');
                return;
            }
            
            wb.name = name;
            wb.content = content;
            
            saveToStorage();
            renderWorldbooks();
            document.getElementById('edit-worldbook-modal').remove();
            showToast('世界书已更新');
        }

        function updateCharacterWorldbookSelects() {
            const select = document.getElementById('char-worldbook-select');
            if (!select) return;
            
            const localWbs = AppState.worldbooks.filter(w => !w.isGlobal);
            select.innerHTML = `
                <option value="">未绑定</option>
                ${localWbs.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
            `;
        }

        function bindWorldbookToCharacter(charId, wbId) {
            const conv = AppState.conversations.find(c => c.id === charId);
            if (!conv) return;
            
            if (!conv.boundWorldbooks) {
                conv.boundWorldbooks = [];
            }
            
            if (wbId && !conv.boundWorldbooks.includes(wbId)) {
                conv.boundWorldbooks.push(wbId);
            } else if (!wbId) {
                conv.boundWorldbooks = [];
            }
            
            saveToStorage();
        }

        // ===== 辅助函数 =====
        function showToast(message, duration = 2000) {
            // 移除现有的toast
            const existingToast = document.getElementById('app-toast');
            if (existingToast) existingToast.remove();
            
            const toast = document.createElement('div');
            toast.id = 'app-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 60px;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: #fff;
                padding: 12px 20px;
                border-radius: 6px;
                font-size: 14px;
                z-index: 9998;
                animation: toastSlideUp 0.3s ease-out;
                max-width: 280px;
                word-wrap: break-word;
                text-align: center;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            // 添加关键帧动画
            if (!document.querySelector('style[data-toast-animation]')) {
                const style = document.createElement('style');
                style.setAttribute('data-toast-animation', 'true');
                style.textContent = `
                    @keyframes toastSlideUp {
                        from {
                            opacity: 0;
                            transform: translateX(-50%) translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(-50%) translateY(0);
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            setTimeout(() => {
                toast.style.animation = 'toastSlideUp 0.3s ease-out reverse';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        function showConfirmDialog(message, onConfirm, onCancel) {
            // 移除现有的对话框
            const existingDialog = document.getElementById('app-confirm-dialog');
            if (existingDialog) existingDialog.remove();
            
            const dialog = document.createElement('div');
            dialog.id = 'app-confirm-dialog';
            dialog.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            `;
            
            const content = document.createElement('div');
            content.style.cssText = `
                background: #fff;
                border-radius: 12px;
                padding: 24px 20px;
                max-width: 280px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            `;
            
            const title = document.createElement('div');
            title.style.cssText = `
                font-size: 16px;
                color: #333;
                font-weight: 600;
                margin-bottom: 20px;
                line-height: 1.5;
                word-wrap: break-word;
            `;
            title.textContent = message;
            
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            `;
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = `
                padding: 10px 20px;
                border: 1px solid #ddd;
                background: #f5f5f5;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                color: #333;
                transition: background 0.2s;
                flex: 1;
            `;
            
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '删除';
            confirmBtn.style.cssText = `
                padding: 10px 20px;
                border: none;
                background: #FF3B30;
                color: #fff;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: background 0.2s;
                flex: 1;
            `;
            
            cancelBtn.addEventListener('click', () => {
                dialog.remove();
                if (onCancel) onCancel();
            });
            
            confirmBtn.addEventListener('click', () => {
                dialog.remove();
                if (onConfirm) onConfirm();
            });
            
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);
            
            content.appendChild(title);
            content.appendChild(buttonContainer);
            dialog.appendChild(content);
            document.body.appendChild(dialog);
            
            // 点击外部关闭
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    dialog.remove();
                    if (onCancel) onCancel();
                }
            });
        }

        // ===== 全局函数供HTML onclick属性调用 =====
        window.openChatDirect = function(convId) {
            const conv = AppState.conversations.find(c => c.id === convId);
            if (conv) {
                openChat(conv);
            }
        };

        window.openChatWithFriendDirect = function(friendId) {
            const friend = AppState.friends.find(f => f.id === friendId);
            if (friend) {
                openChatWithFriend(friend);
            }
        };

        // ==================== QQ风格消息通知栏系统 ====================
        
        // 通知管理器 - 初始化通知系统
        function initNotificationSystem() {
            const notificationBar = document.getElementById('notification-bar');
            const closeBtn = document.getElementById('notification-close');

            // 关闭按钮点击
            closeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                hideNotification(true);
            });

            // 通知栏点击 - 打开对应的聊天
            notificationBar.addEventListener('click', function(e) {
                if (e.target === closeBtn) return;
                if (AppState.notification.current) {
                    const convId = AppState.notification.current.convId;
                    const conv = AppState.conversations.find(c => c.id === convId);
                    if (conv) {
                        // 切换到消息页面
                        switchTab('msg-page');
                        // 打开聊天
                        openChat(conv);
                        // 隐藏通知栏
                        hideNotification(true);
                    }
                }
            });

            // 左滑手势识别
            initNotificationSwipeGesture();

            // 暂停时不自动隐藏
            notificationBar.addEventListener('mouseenter', function() {
                pauseNotificationAutoHide();
            });

            notificationBar.addEventListener('mouseleave', function() {
                resumeNotificationAutoHide();
            });
        }

        // 显示通知栏
        function showNotification(data) {
            // data = { convId, name, avatar, message, time }
            if (!data) return;

            const bar = document.getElementById('notification-bar');
            const nameEl = document.getElementById('notification-name');
            const previewEl = document.getElementById('notification-preview');
            const timeEl = document.getElementById('notification-time');
            const avatarEl = document.getElementById('notification-avatar');

            if (!bar || !nameEl || !previewEl || !timeEl || !avatarEl) {
                console.error('❌ 通知栏元素缺失');
                return;
            }

            AppState.notification.current = data;

            // 直接设置内容
            nameEl.textContent = data.name;
            previewEl.textContent = data.message;
            timeEl.textContent = data.time;
            
            if (data.avatar) {
                avatarEl.innerHTML = `<img src="${data.avatar}" alt="${data.name}">`;
            } else {
                avatarEl.textContent = data.name.charAt(0);
            }

            // 清除之前的自动隐藏计时器
            if (AppState.notification.autoHideTimer) {
                clearTimeout(AppState.notification.autoHideTimer);
            }

            // 显示通知栏
            bar.style.display = 'flex';

            // 5秒后自动隐藏
            AppState.notification.autoHideTimer = setTimeout(function() {
                hideNotification(false);
            }, AppState.notification.hideDelay);
        }

        // 隐藏通知栏
        function hideNotification(isManual) {
            const bar = document.getElementById('notification-bar');
            if (!bar) return;

            // 隐藏通知栏
            bar.style.display = 'none';
            bar.classList.remove('show', 'hide', 'slide-out');

            // 清除自动隐藏计时器
            if (AppState.notification.autoHideTimer) {
                clearTimeout(AppState.notification.autoHideTimer);
                AppState.notification.autoHideTimer = null;
            }

            AppState.notification.current = null;
        }

        // 暂停自动隐藏
        function pauseNotificationAutoHide() {
            if (AppState.notification.autoHideTimer) {
                clearTimeout(AppState.notification.autoHideTimer);
                AppState.notification.autoHideTimer = null;
            }
        }

        // 恢复自动隐藏
        function resumeNotificationAutoHide() {
            if (AppState.notification.current && !AppState.notification.autoHideTimer) {
                AppState.notification.autoHideTimer = setTimeout(function() {
                    hideNotification(false);
                }, AppState.notification.hideDelay);
            }
        }

        // 左滑手势识别
        function initNotificationSwipeGesture() {
            const bar = document.getElementById('notification-bar');
            let touchStartX = 0;
            let touchStartY = 0;
            let isSwiping = false;

            bar.addEventListener('touchstart', function(e) {
                pauseNotificationAutoHide();
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                isSwiping = true;
                bar.classList.add('gesture-active');
            }, { passive: true });

            bar.addEventListener('touchmove', function(e) {
                if (!isSwiping) return;

                const touchX = e.touches[0].clientX;
                const touchY = e.touches[0].clientY;
                const deltaX = touchX - touchStartX;
                const deltaY = touchY - touchStartY;

                // 横向滑动距离 > 纵向滑动距离，判定为左滑
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
                    if (deltaX < 0) {
                        // 左滑
                        const swipePercent = Math.abs(deltaX) / bar.offsetWidth;
                        bar.style.transform = `translateX(${deltaX}px)`;
                        bar.style.opacity = Math.max(0.3, 1 - swipePercent);
                    }
                }
            }, { passive: true });

            bar.addEventListener('touchend', function(e) {
                if (!isSwiping) return;

                const touchEndX = e.changedTouches[0].clientX;
                const deltaX = touchEndX - touchStartX;
                const swipePercent = Math.abs(deltaX) / bar.offsetWidth;

                isSwiping = false;
                bar.classList.remove('gesture-active');

                // 滑动超过50%或距离超过100px，则关闭
                if (deltaX < 0 && (swipePercent > 0.5 || Math.abs(deltaX) > 100)) {
                    hideNotificationWithSwipe();
                } else {
                    // 复位
                    bar.style.transform = 'translateX(0)';
                    bar.style.opacity = '1';
                    resumeNotificationAutoHide();
                }
            }, { passive: true });
        }

        // 左滑关闭通知栏
        function hideNotificationWithSwipe() {
            const bar = document.getElementById('notification-bar');
            pauseNotificationAutoHide();
            bar.classList.remove('show', 'hide');
            bar.classList.add('slide-out');
            
            setTimeout(function() {
                bar.classList.remove('slide-out', 'show');
                bar.classList.add('hide');
                bar.style.transform = 'translateX(0)';
                bar.style.opacity = '1';
                AppState.notification.current = null;
            }, 300);
        }

        // 触发通知（在消息添加或对话更新后调用）
        function triggerNotificationIfLeftChat(convId) {
            console.log('🔔 triggerNotificationIfLeftChat 被调用，convId:', convId);
            
            // 检查聊天页面是否打开且该对话正在查看
            const chatPage = document.getElementById('chat-page');
            const isChatPageOpen = chatPage && chatPage.classList.contains('open');
            
            console.log('💬 聊天页面打开:', isChatPageOpen);
            console.log('📱 当前聊天:', AppState.currentChat?.id);
            
            // 只有当聊天页面打开且该对话正在显示时，才不显示通知
            if (isChatPageOpen && AppState.currentChat && AppState.currentChat.id === convId) {
                console.log('⏸️ 聊天页面打开且正在该聊天中，不显示通知');
                return;
            }

            const conv = AppState.conversations.find(c => c.id === convId);
            if (!conv) {
                console.log('❌ 对话不存在');
                return;
            }
            console.log('✅ 找到对话:', conv.name);

            // 构建通知数据
            const messages = AppState.messages[convId];
            console.log('📨 该对话的消息数:', messages ? messages.length : 0);
            
            if (!messages || messages.length === 0) {
                console.log('❌ 没有消息');
                return;
            }

            const lastMessage = messages[messages.length - 1];
            if (!lastMessage || !lastMessage.content) {
                console.log('❌ 最后的消息为空');
                return;
            }

            console.log('📝 最后的消息:', lastMessage.content.substring(0, 30));

            const notificationData = {
                convId: convId,
                name: conv.name || '未命名',
                avatar: conv.avatar || '',
                message: lastMessage.content.substring(0, 50), // 截断消息
                time: formatTime(new Date(lastMessage.time))
            };

            console.log('📢 准备显示通知:', notificationData);
            showNotification(notificationData);
        }

        // ==================== 测试函数 ====================
        // 全局测试通知系统
        window.testNotification = function() {
            const testData = {
                convId: 'test-' + Date.now(),
                name: '测试用户',
                avatar: '🧪',
                message: '这是一条测试通知消息',
                time: formatTime(new Date())
            };
            
            showNotification(testData);
        };

        // 获取通知系统状态
        window.getNotificationStatus = function() {
            const bar = document.getElementById('notification-bar');
            console.log('通知栏:', bar ? '✅ 存在' : '❌ 不存在');
            console.log('当前通知:', AppState.notification.current);
            console.log('计时器运行中:', !!AppState.notification.autoHideTimer);
        };

        // 强制显示通知栏用于测试
        window.forceShowNotificationBar = function() {
            const bar = document.getElementById('notification-bar');
            if (!bar) {
                console.error('❌ 通知栏不存在');
                return;
            }
            console.log('🔴 强制显示通知栏');
            bar.style.display = 'flex';
            bar.textContent = '测试通知栏';
            console.log('✅ 已设置 display: flex');
        };

        // 测试通知触发
        window.testTriggerNotification = function(convId) {
            console.log('测试通知触发，convId:', convId);
            if (!convId && AppState.conversations.length > 0) {
                convId = AppState.conversations[0].id;
                console.log('使用第一个对话:', convId);
            }
            if (convId) {
                triggerNotificationIfLeftChat(convId);
                console.log('已调用 triggerNotificationIfLeftChat');
            }
        };

        // ========== 总结历史管理函数 ==========
        window.showSummaryHistory = function(convId) {
            const conv = AppState.conversations.find(c => c.id === convId);
            if (!conv || !Array.isArray(conv.summaries) || conv.summaries.length === 0) {
                showToast('暂无生成的总结');
                return;
            }
            
            let modal = document.getElementById('summary-history-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'summary-history-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            const summaryItems = conv.summaries.map((sum, idx) => `
                <div style="padding:12px;background:#f9f9f9;border-radius:8px;margin-bottom:12px;border-left:3px solid #0066cc;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <div style="font-size:12px;color:#666;">
                            基于最后 <strong>${sum.messageCount || '?'}</strong> 条消息 • 
                            <strong>${new Date(sum.timestamp).toLocaleString('zh-CN')}</strong>
                        </div>
                        <div style="display:flex;gap:4px;">
                            <button onclick="editSummary('${convId}', ${idx})" style="padding:4px 8px;font-size:12px;border:1px solid #0066cc;background:#fff;color:#0066cc;border-radius:4px;cursor:pointer;">编辑</button>
                            <button onclick="deleteSummary('${convId}', ${idx})" style="padding:4px 8px;font-size:12px;border:1px solid #f44;background:#fff;color:#f44;border-radius:4px;cursor:pointer;">删除</button>
                        </div>
                    </div>
                    <div style="padding:8px;background:#fff;border-radius:4px;font-size:13px;color:#333;max-height:150px;overflow-y:auto;line-height:1.6;white-space:pre-wrap;word-break:break-all;">
                        ${escapeHtml(sum.content)}
                    </div>
                </div>
            `).join('');
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:600px;max-height:80vh;overflow-y:auto;">
                    <div class="emoji-mgmt-header">
                        <h3 style="margin:0;">📋 总结历史</h3>
                        <button class="emoji-mgmt-close" onclick="document.getElementById('summary-history-modal').remove();">
                            <svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div style="padding:16px;">
                        ${summaryItems}
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        };

        window.editSummary = function(convId, summaryIndex) {
            const conv = AppState.conversations.find(c => c.id === convId);
            if (!conv || !conv.summaries || !conv.summaries[summaryIndex]) return;
            
            const summary = conv.summaries[summaryIndex];
            
            let modal = document.getElementById('edit-summary-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'edit-summary-modal';
            modal.className = 'emoji-mgmt-modal show';
            modal.style.cssText = 'background:rgba(0,0,0,0.5);';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content" style="max-width:500px;background:#fff;border-radius:12px;overflow:hidden;">
                    <div style="padding:16px;border-bottom:1px solid #e8e8e8;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="margin:0;font-size:16px;color:#333;font-weight:600;">编辑总结内容</h3>
                        <button onclick="document.getElementById('edit-summary-modal').remove()" style="border:none;background:none;cursor:pointer;font-size:20px;color:#666;">×</button>
                    </div>
                    
                    <div style="padding:16px;">
                        <textarea id="edit-summary-content" style="width:100%;min-height:200px;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:13px;font-family:monospace;resize:vertical;box-sizing:border-box;">${escapeHtml(summary.content)}</textarea>
                        
                        <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">
                            <button onclick="document.getElementById('edit-summary-modal').remove()" style="padding:8px 16px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;">取消</button>
                            <button onclick="saveSummaryEdit('${convId}', ${summaryIndex}, document.getElementById('edit-summary-content').value)" style="padding:8px 16px;border:none;border-radius:6px;background:#0066cc;color:#fff;cursor:pointer;font-size:13px;font-weight:500;">保存</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            document.getElementById('edit-summary-content').focus();
        };

        window.deleteSummary = function(convId, summaryIndex) {
            if (!confirm('确定要删除该总结吗？')) return;
            
            const conv = AppState.conversations.find(c => c.id === convId);
            if (conv && conv.summaries) {
                conv.summaries.splice(summaryIndex, 1);
                saveToStorage();
                showSummaryHistory(convId);  // 刷新列表
                showToast('总结已删除');
            }
        };

        window.saveSummaryEdit = function(convId, summaryIndex, newContent) {
            if (!newContent.trim()) {
                showToast('总结内容不能为空');
                return;
            }
            
            const conv = AppState.conversations.find(c => c.id === convId);
            if (conv && conv.summaries && conv.summaries[summaryIndex]) {
                conv.summaries[summaryIndex].content = newContent.trim();
                saveToStorage();
                showToast('总结已保存');
                document.getElementById('edit-summary-modal').remove();
                showSummaryHistory(convId);  // 刷新列表
            }
        };

        // ======================== 新功能函数 ========================

        // 添加消息到收藏
        function addMessageToCollection(messageId) {
            const convId = AppState.currentChat?.id;
            if (!convId) {
                showToast('请先打开一个对话');
                return;
            }

            const conv = AppState.conversations.find(c => c.id === convId);
            if (!conv) return;

            // 从正确的位置获取消息
            const messages = AppState.messages[convId] || [];
            const msg = messages.find(m => m.id === messageId);
            if (!msg) {
                showToast('消息未找到');
                return;
            }

            // 检查是否已收藏
            const alreadyCollected = AppState.collections.find(c => c.messageId === messageId);
            if (alreadyCollected) {
                showToast('该消息已收藏');
                return;
            }

            const collectionItem = {
                id: 'col_' + Date.now(),
                convId: convId,
                messageId: messageId,
                messageContent: msg.content || msg.text || '',
                senderName: msg.type === 'sent' ? AppState.user.name : conv.name,
                senderAvatar: msg.type === 'sent' ? AppState.user.avatar : conv.avatar,
                collectedAt: new Date().toISOString(),
                originalMessageTime: msg.time || msg.timestamp || new Date().toISOString()
            };

            AppState.collections.push(collectionItem);
            saveToStorage();
            showToast('已收藏');
            
            // 立即关闭菜单和移除高亮
            const menu = document.getElementById('message-context-menu');
            if (menu) {
                menu.remove();
            }
            // 查找并移除高亮背景
            const allBubbles = document.querySelectorAll('.chat-bubble');
            allBubbles.forEach(bubble => {
                if (bubble.style.backgroundColor === 'rgba(0,0,0,0.05)' || bubble.style.backgroundColor !== '') {
                    bubble.style.backgroundColor = '';
                }
            });
        }

        // 打开收藏页面
        function openCollectionPage() {
            let page = document.getElementById('collection-page');
            if (!page) {
                page = document.createElement('div');
                page.id = 'collection-page';
                page.className = 'sub-page';
                document.getElementById('app-container').appendChild(page);
            }

            const collectionsHTML = AppState.collections.length === 0 ? 
                '<div class="empty-state"><div class="empty-text">暂无收藏</div></div>' :
                `<div class="collection-list">
                    ${AppState.collections.map(item => `
                        <div class="collection-item" style="padding:12px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;">
                            <div style="flex:1;">
                                <div style="font-size:12px;color:#999;margin-bottom:4px;">${item.senderName}</div>
                                <div style="font-size:14px;color:#333;word-break:break-all;">${item.messageContent.substring(0, 100)}</div>
                                <div style="font-size:12px;color:#ccc;margin-top:4px;">${new Date(item.collectedAt).toLocaleString()}</div>
                            </div>
                            <button class="delete-collection-btn" onclick="deleteCollectionItem('${item.id}')" style="background:none;border:none;color:#f56c6c;cursor:pointer;font-size:14px;padding:0 8px;">×</button>
                        </div>
                    `).join('')}
                </div>`;

            page.innerHTML = `
                <div class="sub-nav">
                    <div class="back-btn" id="collection-back-btn">
                        <div class="back-arrow"></div>
                        <span>返回</span>
                    </div>
                    <div class="sub-title">收藏</div>
                </div>
                <div class="sub-content" style="overflow-y:auto;padding:0;">
                    ${collectionsHTML}
                </div>
            `;

            page.classList.add('open');

            page.addEventListener('click', function(e) {
                if (e.target.closest('#collection-back-btn')) {
                    page.classList.remove('open');
                }
            });
        }

        // 删除单个收藏
        function deleteCollectionItem(collectionId) {
            AppState.collections = AppState.collections.filter(c => c.id !== collectionId);
            saveToStorage();
            showToast('已删除');
            openCollectionPage(); // 刷新页面
        }

        // 打开钱包页面
        function openWalletPage() {
            let page = document.getElementById('wallet-page');
            if (!page) {
                page = document.createElement('div');
                page.id = 'wallet-page';
                page.className = 'sub-page';
                document.getElementById('app-container').appendChild(page);
            }

            // 获取统计数据
            const totalRecharge = AppState.walletHistory.reduce((sum, item) => sum + item.amount, 0);
            const currentBalance = AppState.user.coins || 0;
            const thisMonthRecharge = AppState.walletHistory.filter(item => {
                const itemDate = new Date(item.time);
                const today = new Date();
                return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
            }).reduce((sum, item) => sum + item.amount, 0);

            const walletHTML = `
                <div class="wallet-container" style="padding:12px 16px;background-color:#f5f5f5;min-height:100vh;">
                    <!-- 头部余额卡片 -->
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:16px;padding:28px 20px;margin-bottom:20px;color:white;box-shadow:0 6px 20px rgba(102,126,234,0.3);">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
                            <div>
                                <div style="font-size:12px;opacity:0.85;margin-bottom:6px;">账户余额</div>
                                <div style="font-size:42px;font-weight:bold;line-height:1;">${currentBalance}</div>
                                <div style="font-size:11px;opacity:0.75;margin-top:4px;">虚拟币</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="background:rgba(255,255,255,0.25);padding:8px 12px;border-radius:8px;font-size:12px;margin-bottom:8px;">VIP会员</div>
                                <div style="font-size:11px;opacity:0.85;">等级: 普通</div>
                            </div>
                        </div>
                        
                        <!-- 统计信息 -->
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;border-top:1px solid rgba(255,255,255,0.2);padding-top:16px;">
                            <div>
                                <div style="font-size:11px;opacity:0.8;">累计充值</div>
                                <div style="font-size:16px;font-weight:bold;margin-top:4px;">${totalRecharge}</div>
                            </div>
                            <div>
                                <div style="font-size:11px;opacity:0.8;">本月充值</div>
                                <div style="font-size:16px;font-weight:bold;margin-top:4px;">${thisMonthRecharge}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 快速操作按钮 -->
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                        <button onclick="switchWalletTab('recharge')" style="padding:14px;background:white;border:1px solid #e0e0e0;border-radius:12px;cursor:pointer;transition:all 0.2s;color:#333;">
                            <div style="font-size:20px;margin-bottom:6px;">💳</div>
                            <div style="font-size:12px;font-weight:500;">充值</div>
                        </button>
                        <button onclick="switchWalletTab('exchange')" style="padding:14px;background:white;border:1px solid #e0e0e0;border-radius:12px;cursor:pointer;transition:all 0.2s;color:#333;">
                            <div style="font-size:20px;margin-bottom:6px;">🔄</div>
                            <div style="font-size:12px;font-weight:500;">兑换</div>
                        </button>
                    </div>

                    <!-- 充值区域 -->
                    <div id="wallet-recharge-section" style="background:white;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e0e0e0;">
                        <div style="font-size:14px;font-weight:bold;color:#333;margin-bottom:14px;">💰 充值方案</div>
                        
                        <!-- 推荐套餐 -->
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:10px;padding:14px;margin-bottom:12px;color:white;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <span style="font-size:13px;font-weight:500;">🔥 热卖推荐</span>
                                <span style="background:rgba(255,255,255,0.3);padding:4px 8px;border-radius:4px;font-size:11px;">省5%</span>
                            </div>
                            <button onclick="rechargeWallet(500)" style="width:100%;padding:12px;background:rgba(255,255,255,0.25);border:1px solid rgba(255,255,255,0.5);border-radius:8px;color:white;font-weight:bold;cursor:pointer;transition:all 0.2s;font-size:13px;">
                                获得500虚拟币 (¥99.99)
                            </button>
                        </div>

                        <!-- 常规充值套餐 -->
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
                            <button onclick="rechargeWallet(50)" style="padding:12px;border:1px solid #e0e0e0;background:#fafafa;border-radius:8px;cursor:pointer;transition:all 0.2s;color:#333;font-size:12px;font-weight:500;">
                                <div style="font-size:16px;font-weight:bold;margin-bottom:4px;">50</div>
                                <div style="font-size:10px;color:#999;">¥9.99</div>
                            </button>
                            <button onclick="rechargeWallet(100)" style="padding:12px;border:1px solid #e0e0e0;background:#fafafa;border-radius:8px;cursor:pointer;transition:all 0.2s;color:#333;font-size:12px;font-weight:500;">
                                <div style="font-size:16px;font-weight:bold;margin-bottom:4px;">100</div>
                                <div style="font-size:10px;color:#999;">¥19.99</div>
                            </button>
                            <button onclick="rechargeWallet(300)" style="padding:12px;border:1px solid #e0e0e0;background:#fafafa;border-radius:8px;cursor:pointer;transition:all 0.2s;color:#333;font-size:12px;font-weight:500;">
                                <div style="font-size:16px;font-weight:bold;margin-bottom:4px;">300</div>
                                <div style="font-size:10px;color:#999;">¥49.99</div>
                            </button>
                            <button onclick="rechargeWallet(1000)" style="padding:12px;border:1px solid #e0e0e0;background:#fafafa;border-radius:8px;cursor:pointer;transition:all 0.2s;color:#333;font-size:12px;font-weight:500;">
                                <div style="font-size:16px;font-weight:bold;margin-bottom:4px;">1000</div>
                                <div style="font-size:10px;color:#999;">¥199.99</div>
                            </button>
                        </div>
                        
                        <!-- 自定义充值 -->
                        <div style="border-top:1px solid #f0f0f0;padding-top:12px;">
                            <div style="font-size:12px;color:#666;margin-bottom:8px;">自定义充值金额</div>
                            <div style="display:flex;gap:8px;">
                                <input type="number" id="custom-recharge-amount" placeholder="输入金额(1-100000)" min="1" max="100000" style="flex:1;padding:10px;border:1px solid #d0d0d0;border-radius:6px;font-size:13px;color:#333;background:#f9f9f9;">
                                <button onclick="rechargeCustomAmount()" style="padding:10px 20px;background:#667eea;border:none;border-radius:6px;color:white;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;">充值</button>
                            </div>
                        </div>
                    </div>

                    <!-- 兑换区域（隐藏） -->
                    <div id="wallet-exchange-section" style="display:none;background:white;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e0e0e0;">
                        <div style="font-size:14px;font-weight:bold;color:#333;margin-bottom:14px;">🎁 虚拟币兑换</div>
                        <div style="background:#f9f9f9;border-radius:8px;padding:12px;margin-bottom:10px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <span style="font-size:12px;font-weight:500;">限量皮肤</span>
                                <span style="background:#667eea;color:white;padding:4px 8px;border-radius:4px;font-size:10px;">需要1000币</span>
                            </div>
                            <button onclick="exchangeItem('skin1', 1000)" style="width:100%;padding:8px;background:white;border:1px solid #d0d0d0;border-radius:6px;color:#333;cursor:pointer;font-size:12px;transition:all 0.2s;">兑换</button>
                        </div>
                        <div style="background:#f9f9f9;border-radius:8px;padding:12px;margin-bottom:10px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <span style="font-size:12px;font-weight:500;">专属头像框</span>
                                <span style="background:#667eea;color:white;padding:4px 8px;border-radius:4px;font-size:10px;">需要500币</span>
                            </div>
                            <button onclick="exchangeItem('frame1', 500)" style="width:100%;padding:8px;background:white;border:1px solid #d0d0d0;border-radius:6px;color:#333;cursor:pointer;font-size:12px;transition:all 0.2s;">兑换</button>
                        </div>
                    </div>

                    <!-- 充值记录 -->
                    <div style="background:white;border-radius:12px;padding:16px;border:1px solid #e0e0e0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                            <div style="font-size:14px;font-weight:bold;color:#333;">📋 充值记录</div>
                            <button onclick="clearWalletHistory()" style="background:none;border:none;color:#999;font-size:12px;cursor:pointer;transition:all 0.2s;">清空</button>
                        </div>
                        ${AppState.walletHistory.length === 0 ? 
                            '<div style="text-align:center;color:#bbb;padding:20px;font-size:12px;">暂无充值记录</div>' :
                            `<div style="max-height:300px;overflow-y:auto;">${AppState.walletHistory.slice(-15).reverse().map((item, index) => `
                                <div style="padding:10px 0;border-bottom:${index === AppState.walletHistory.length - 1 ? 'none' : '1px solid #f5f5f5'};display:flex;justify-content:space-between;align-items:center;">
                                    <div style="flex:1;">
                                        <div style="color:#333;font-size:12px;font-weight:500;margin-bottom:2px;">充值 +${item.amount} 虚拟币</div>
                                        <div style="color:#999;font-size:11px;">${new Date(item.time).toLocaleString()}</div>
                                    </div>
                                    <div style="color:#667eea;font-size:12px;font-weight:bold;">+${item.amount}</div>
                                </div>
                            `).join('')}</div>`
                        }
                    </div>
                </div>`;

            page.innerHTML = `
                <div class="sub-nav">
                    <div class="back-btn" id="wallet-back-btn">
                        <div class="back-arrow"></div>
                        <span>返回</span>
                    </div>
                    <div class="sub-title">钱包</div>
                </div>
                <div class="sub-content" style="overflow-y:auto;padding:0;">
                    ${walletHTML}
                </div>
            `;

            page.classList.add('open');

            page.addEventListener('click', function(e) {
                if (e.target.closest('#wallet-back-btn')) {
                    page.classList.remove('open');
                }
            });
        }

        // 切换钱包标签页
        function switchWalletTab(tab) {
            const rechargeSection = document.getElementById('wallet-recharge-section');
            const exchangeSection = document.getElementById('wallet-exchange-section');
            
            if (tab === 'recharge') {
                if (rechargeSection) rechargeSection.style.display = 'block';
                if (exchangeSection) exchangeSection.style.display = 'none';
            } else if (tab === 'exchange') {
                if (rechargeSection) rechargeSection.style.display = 'none';
                if (exchangeSection) exchangeSection.style.display = 'block';
            }
        }

        // 兑换物品
        function exchangeItem(itemId, cost) {
            if (AppState.user.coins < cost) {
                showToast(`虚拟币不足，还需要${cost - AppState.user.coins}币`);
                return;
            }
            
            AppState.user.coins -= cost;
            saveToStorage();
            
            let itemName = '';
            if (itemId === 'skin1') itemName = '限量皮肤';
            else if (itemId === 'frame1') itemName = '专属头像框';
            
            showToast(`成功兑换${itemName}`);
            openWalletPage(); // 刷新页面
        }

        // 清空钱包历史记录
        function clearWalletHistory() {
            if (confirm('确定要清空所有充值记录吗？')) {
                AppState.walletHistory = [];
                saveToStorage();
                showToast('历史记录已清空');
                openWalletPage(); // 刷新页面
            }
        }

        // 充值虚拟币（预设金额）
        function rechargeWallet(amount) {
            AppState.user.coins = (AppState.user.coins || 0) + amount;
            AppState.walletHistory.push({
                amount: amount,
                time: new Date().toISOString()
            });
            saveToStorage();
            showToast(`充值成功，获得${amount}虚拟币`);
            openWalletPage(); // 刷新页面
        }

        // 自定义充值
        function rechargeCustomAmount() {
            const inputElement = document.getElementById('custom-recharge-amount');
            const amount = parseInt(inputElement.value);
            
            if (!amount || amount < 1 || amount > 100000) {
                showToast('请输入1-100000之间的金额');
                return;
            }
            
            AppState.user.coins = (AppState.user.coins || 0) + amount;
            AppState.walletHistory.push({
                amount: amount,
                time: new Date().toISOString()
            });
            saveToStorage();
            showToast(`充值成功，获得${amount}虚拟币`);
            inputElement.value = '';
            openWalletPage(); // 刷新页面
        }

        // 打开个性装扮页面
        function openDecorationPage() {
            let page = document.getElementById('decoration-page');
            if (!page) {
                page = document.createElement('div');
                page.id = 'decoration-page';
                page.className = 'sub-page';
                document.getElementById('app-container').appendChild(page);
            }

            const themes = [
                { id: 'light', name: '黑白灰简约', icon: '⚪', color: '#f5f5f5' },
                { id: 'pink', name: '白粉色系', icon: '🌸', color: '#fce4ec' },
                { id: 'dark', name: '夜间模式', icon: '🌙', color: '#1a1a1a' }
            ];

            const themesHTML = themes.map(theme => `
                <div onclick="switchTheme('${theme.id}')" style="padding:16px;margin:8px;background:white;border-radius:12px;cursor:pointer;border:${AppState.user.theme === theme.id ? '3px solid #667eea' : '1px solid #e0e0e0'};transition:all 0.2s;text-align:center;">
                    <div style="font-size:32px;margin-bottom:8px;">${theme.icon}</div>
                    <div style="font-size:14px;font-weight:bold;">${theme.name}</div>
                    <div style="font-size:12px;color:#999;margin-top:4px;">${AppState.user.theme === theme.id ? '✓ 已选择' : '点击选择'}</div>
                </div>
            `).join('');

            page.innerHTML = `
                <div class="sub-nav">
                    <div class="back-btn" id="decoration-back-btn">
                        <div class="back-arrow"></div>
                        <span>返回</span>
                    </div>
                    <div class="sub-title">个性装扮</div>
                </div>
                <div class="sub-content" style="overflow-y:auto;padding:16px;background-color:#f9f9f9;">
                    <div style="font-size:16px;font-weight:bold;margin-bottom:12px;">选择主题</div>
                    <div style="display:grid;grid-template-columns:1fr;gap:8px;">
                        ${themesHTML}
                    </div>
                </div>
            `;

            page.classList.add('open');

            page.addEventListener('click', function(e) {
                if (e.target.closest('#decoration-back-btn')) {
                    page.classList.remove('open');
                }
            });
        }

        // 切换主题
        function switchTheme(themeId) {
            AppState.user.theme = themeId;
            saveToStorage();
            applyTheme(themeId);
            showToast('主题已切换');
            setTimeout(() => {
                openDecorationPage(); // 刷新页面
            }, 200);
        }

        // 应用主题
        function applyTheme(themeId) {
            const root = document.documentElement;
            let themeConfig = {};

            switch(themeId) {
                case 'light':
                    themeConfig = {
                        '--bg-primary': '#ffffff',
                        '--bg-secondary': '#f5f5f5',
                        '--text-primary': '#000000',
                        '--text-secondary': '#666666',
                        '--border-color': '#f0f0f0'
                    };
                    document.documentElement.style.backgroundColor = '#ffffff';
                    document.documentElement.style.color = '#000000';
                    break;
                case 'pink':
                    themeConfig = {
                        '--bg-primary': '#fff9fc',
                        '--bg-secondary': '#fce4ec',
                        '--text-primary': '#8b3a62',
                        '--text-secondary': '#d81b60',
                        '--border-color': '#f8bbd0'
                    };
                    document.documentElement.style.backgroundColor = '#fff9fc';
                    document.documentElement.style.color = '#8b3a62';
                    break;
                case 'dark':
                    themeConfig = {
                        '--bg-primary': '#1a1a1a',
                        '--bg-secondary': '#2a2a2a',
                        '--text-primary': '#e0e0e0',
                        '--text-secondary': '#a0a0a0',
                        '--border-color': '#3a3a3a'
                    };
                    document.documentElement.style.backgroundColor = '#1a1a1a';
                    document.documentElement.style.color = '#e0e0e0';
                    break;
                case 'blue':
                    themeConfig = {
                        '--bg-primary': '#e3f2fd',
                        '--bg-secondary': '#bbdefb',
                        '--text-primary': '#0d47a1',
                        '--text-secondary': '#1565c0',
                        '--border-color': '#90caf9'
                    };
                    document.documentElement.style.backgroundColor = '#e3f2fd';
                    document.documentElement.style.color = '#0d47a1';
                    break;
                case 'green':
                    themeConfig = {
                        '--bg-primary': '#e8f5e9',
                        '--bg-secondary': '#c8e6c9',
                        '--text-primary': '#1b5e20',
                        '--text-secondary': '#2e7d32',
                        '--border-color': '#81c784'
                    };
                    document.documentElement.style.backgroundColor = '#e8f5e9';
                    document.documentElement.style.color = '#1b5e20';
                    break;
                case 'purple':
                    themeConfig = {
                        '--bg-primary': '#f3e5f5',
                        '--bg-secondary': '#e1bee7',
                        '--text-primary': '#4a148c',
                        '--text-secondary': '#6a1b9a',
                        '--border-color': '#ce93d8'
                    };
                    document.documentElement.style.backgroundColor = '#f3e5f5';
                    document.documentElement.style.color = '#4a148c';
                    break;
                case 'orange':
                    themeConfig = {
                        '--bg-primary': '#ffe0b2',
                        '--bg-secondary': '#ffcc80',
                        '--text-primary': '#e65100',
                        '--text-secondary': '#f57c00',
                        '--border-color': '#ffb74d'
                    };
                    document.documentElement.style.backgroundColor = '#ffe0b2';
                    document.documentElement.style.color = '#e65100';
                    break;
                case 'grey':
                    themeConfig = {
                        '--bg-primary': '#eceff1',
                        '--bg-secondary': '#cfd8dc',
                        '--text-primary': '#263238',
                        '--text-secondary': '#455a64',
                        '--border-color': '#b0bec5'
                    };
                    document.documentElement.style.backgroundColor = '#eceff1';
                    document.documentElement.style.color = '#263238';
                    break;
                default:
                    themeConfig = {
                        '--bg-primary': '#ffffff',
                        '--bg-secondary': '#f5f5f5',
                        '--text-primary': '#000000',
                        '--text-secondary': '#666666',
                        '--border-color': '#f0f0f0'
                    };
                    document.documentElement.style.backgroundColor = '#ffffff';
                    document.documentElement.style.color = '#000000';
            }

            // 应用主题变量到根元素
            Object.keys(themeConfig).forEach(key => {
                root.style.setProperty(key, themeConfig[key]);
            });

            // 更新所有包含文本内容的元素
            setTimeout(() => {
                document.querySelectorAll('*').forEach(el => {
                    if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
                        if (window.getComputedStyle(el).color === 'rgb(0, 0, 0)' || window.getComputedStyle(el).color === 'rgb(255, 255, 255)') {
                            // 让浏览器自然使用继承的颜色
                        }
                    }
                });
            }, 50);
        }

        // 应用保存的主题（在初始化时调用）
        function applyInitialTheme() {
            if (AppState.user.theme) {
                applyTheme(AppState.user.theme);
            }
        }

        // 检查并执行自动总结
        function checkAndAutoSummarize(convId) {
            // 检查是否启用了自动总结
            if (!AppState.apiSettings.summaryEnabled) return;
            
            const messages = AppState.messages[convId] || [];
            const conv = AppState.conversations.find(c => c.id === convId);
            if (!conv) return;
            
            // 检查是否已经有未总结的消息数达到阈值
            const summaryInterval = AppState.apiSettings.summaryInterval || 50;
            const unsummarizedCount = messages.filter(m => !m.isSummarized).length;
            
            // 如果未总结消息数达到阈值，触发自动总结
            if (unsummarizedCount >= summaryInterval) {
                console.log(`自动总结触发：未总结消息数 ${unsummarizedCount} >= ${summaryInterval}`);
                // 延迟执行，避免阻塞UI
                setTimeout(() => {
                    summarizeContextWithAPI(convId, false); // false 表示自动总结
                }, 500);
            }
        }

        // 暴露关键函数到 window 对象，以便其他页面/脚本访问
        window.saveToIndexDB = saveToIndexDB;
        window.getAppState = () => AppState;
        window.AppState = AppState;
