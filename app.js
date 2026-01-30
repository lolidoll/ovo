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
                // 主API参数设置
                temperature: 0.8, // 温度，默认0.8
                frequencyPenalty: 0.2, // 频率惩罚，默认0.2
                presencePenalty: 0.1, // 存在惩罚，默认0.1
                topP: 1.0, // Top P，默认1.0
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
                theme: 'light', // 主题: light(黑白灰简约), pink(白粉色系), dark(夜间模式)
                visitorCount: 0, // 访客总量
                personality: '' // 用户人设
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
                
                // 初始化副API管理器
                SecondaryAPIManager.init(AppState, showToast, saveToStorage, showLoadingOverlay, hideLoadingOverlay);
                SecondaryAPIManager.initEventListeners();
                
                // 初始化心声管理器
                MindStateManager.init(AppState, saveToStorage, showToast, escapeHtml);
                
                renderUI();
                updateDynamicFuncList();
                setupEmojiLibraryObserver();
                
                // 初始化表情包管理器
                if (window.EmojiManager) {
                    window.EmojiManager.init();
                }
                
                // 初始化朋友圈分组互动系统
                if (typeof MomentsGroupInteraction !== 'undefined' && typeof momentsManager !== 'undefined') {
                    MomentsGroupInteraction.init(momentsManager);
                    console.log('✅ 朋友圈分组互动系统已初始化');
                }
                
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
                    
                    console.log('=== loadFromStorage 恢复数据 ===');
                    console.log('parsed.user:', JSON.stringify(parsed.user, null, 2));
                    
                    // 深度合并用户对象
                    if (parsed.user) {
                        AppState.user = {
                            name: parsed.user.hasOwnProperty('name') ? parsed.user.name : AppState.user.name,
                            avatar: parsed.user.hasOwnProperty('avatar') ? parsed.user.avatar : AppState.user.avatar,
                            signature: parsed.user.hasOwnProperty('signature') ? parsed.user.signature : AppState.user.signature,
                            bgImage: parsed.user.hasOwnProperty('bgImage') ? parsed.user.bgImage : AppState.user.bgImage,
                            coins: parsed.user.hasOwnProperty('coins') ? parsed.user.coins : AppState.user.coins,
                            theme: parsed.user.hasOwnProperty('theme') ? parsed.user.theme : AppState.user.theme,
                            personality: parsed.user.hasOwnProperty('personality') ? parsed.user.personality : '',
                            visitorCount: parsed.user.hasOwnProperty('visitorCount') ? parsed.user.visitorCount : AppState.user.visitorCount
                        };
                        console.log('✓ 已恢复用户信息:', JSON.stringify(AppState.user, null, 2));
                    }
                    
                    // 合并其他属性
                    for (let key in parsed) {
                        if (key !== 'user' && key !== 'conversationStates') {
                            AppState[key] = parsed[key];
                        }
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
                        { id: 'friend_1', name: '小薯片', avatar: 'https://image.uglycat.cc/qs8mf5.png', friendGroupId: 'group_default' }
                    ];
                    console.log('已初始化示例好友数据');
                }
                
                // 如果friendGroups只有默认分组，添加更多分组
                if (!AppState.friendGroups || AppState.friendGroups.length <= 1) {
                    AppState.friendGroups = [
                        { id: 'group_default', name: '默认分组', memberIds: [] }
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
                console.log('=== saveToStorage 开始 ===');
                console.log('当前 AppState.user:', JSON.stringify(AppState.user, null, 2));
                
                const stateToDump = Object.assign({}, AppState);
                delete stateToDump.conversationStates;
                
                if (!stateToDump.user) {
                    stateToDump.user = AppState.user;
                }
                
                console.log('准备保存的 user 数据:', JSON.stringify(stateToDump.user, null, 2));
                
                // 优先保存到IndexDB
                try {
                    await saveToIndexDB(stateToDump);
                    console.log('✓ IndexDB 保存成功');
                } catch (e) {
                    console.warn('IndexDB保存失败，使用localStorage备份:', e);
                    const jsonString = JSON.stringify(stateToDump);
                    localStorage.setItem('shupianjAppState', jsonString);
                    console.log('✓ localStorage (shupianjAppState) 保存成功');
                }
                
                // 同时保存到cachedAppState供朋友圈模块使用
                try {
                    const cachedState = {
                        user: AppState.user ? {
                            name: AppState.user.name,
                            avatar: AppState.user.avatar,
                            signature: AppState.user.signature,
                            bgImage: AppState.user.bgImage,
                            visitorCount: AppState.user.visitorCount,
                            personality: AppState.user.personality
                        } : {}
                    };
                    localStorage.setItem('cachedAppState', JSON.stringify(cachedState));
                    console.log('✓ cachedAppState 保存成功:', JSON.stringify(cachedState.user, null, 2));
                } catch (e) {
                    console.warn('保存cachedAppState失败:', e);
                }
                
                console.log('=== saveToStorage 完成 ===');
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

            // 聊天页面 - 角色设置按钮（全局函数，直接绑定到HTML）
            window.handleChatMoreButtonClick = function(e) {
                console.log('Chat more button clicked, currentChat:', AppState.currentChat);
                e.preventDefault();
                e.stopPropagation();
                
                if (AppState.currentChat) {
                    openChatMoreMenu(AppState.currentChat);
                } else {
                    console.warn('AppState.currentChat is not set');
                    showToast('未找到当前对话');
                }
                
                return false;
            };

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

            // API参数锁定按钮
            const lockBtn = document.getElementById('api-params-lock-btn');
            const paramsContainer = document.getElementById('api-params-container');
            if (lockBtn && paramsContainer) {
                // 初始化锁定状态（从localStorage读取）
                const isLocked = localStorage.getItem('apiParamsLocked') === 'true';
                updateLockButtonState(isLocked);
                
                lockBtn.addEventListener('click', function() {
                    const currentLocked = paramsContainer.classList.contains('locked');
                    const newLocked = !currentLocked;
                    
                    if (newLocked) {
                        paramsContainer.classList.add('locked');
                        lockBtn.classList.add('locked');
                        lockBtn.innerHTML = '<i class="fa-solid fa-lock"></i><span>已锁定</span>';
                        showToast('主API参数已锁定，防止误触');
                    } else {
                        paramsContainer.classList.remove('locked');
                        lockBtn.classList.remove('locked');
                        lockBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i><span>解锁</span>';
                        showToast('主API参数已解锁');
                    }
                    
                    // 保存锁定状态
                    localStorage.setItem('apiParamsLocked', newLocked);
                });
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
            const btnEmoji = document.getElementById('btn-emoji');
            if (btnEmoji) btnEmoji.addEventListener('click', function() {
                toggleEmojiLibrary();
            });

            // 注意：btn-voice-msg 和 btn-location 的事件处理器由各自的模块负责
            // 不需要在这里重复绑定事件


            const btnVoice = document.getElementById('btn-voicecall');
            if (btnVoice) btnVoice.addEventListener('click', function() { showToast('语音通话功能尚未实现'); });

            const btnVideo = document.getElementById('btn-videocall');
            if (btnVideo) btnVideo.addEventListener('click', function() { showToast('视频通话功能尚未实现'); });

            // 线下功能按钮
            const btnOffline = document.getElementById('btn-offline');
            if (btnOffline) btnOffline.addEventListener('click', function() { showToast('线下功能尚未实现'); });

            const btnTakeout = document.getElementById('btn-takeout');
            if (btnTakeout) btnTakeout.addEventListener('click', function() { showToast('点外卖功能尚未实现'); });

            const btnTransfer = document.getElementById('btn-transfer');
            if (btnTransfer) btnTransfer.addEventListener('click', function() { showToast('转账功能尚未实现'); });

            const btnListen = document.getElementById('btn-listen');
            if (btnListen) btnListen.addEventListener('click', function() { showToast('一起听功能尚未实现'); });

            const btnPhone = document.getElementById('btn-phone');
            if (btnPhone) btnPhone.addEventListener('click', function() { showToast('查手机功能尚未实现'); });

            // 更多按钮 - 显示/隐藏更多功能弹出层
            const btnMore = document.getElementById('btn-more');
            const morePanel = document.getElementById('toolbar-more-panel');
            if (btnMore && morePanel) {
                btnMore.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const isVisible = morePanel.style.display !== 'none';
                    morePanel.style.display = isVisible ? 'none' : 'block';
                });
                
                // 点击其他地方关闭弹出层
                document.addEventListener('click', function(e) {
                    if (morePanel && !morePanel.contains(e.target) && e.target !== btnMore) {
                        morePanel.style.display = 'none';
                    }
                });
            }

            const btnFrog = document.getElementById('btn-frog');
            if (btnFrog) btnFrog.addEventListener('click', function() { showToast('旅行青蛙功能尚未实现'); });

            const btnAnonymous = document.getElementById('btn-anonymous');
            if (btnAnonymous) btnAnonymous.addEventListener('click', function() { showToast('匿名提问功能尚未实现'); });

            // 心声按钮
            const mindBtn = document.getElementById('chat-mind-btn');
            if (mindBtn) {
                mindBtn.addEventListener('click', function() {
                    if (AppState.currentChat) {
                        MindStateManager.openCharacterMindState(AppState.currentChat);
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
                
                if (emojiLib && emojiLib.classList.contains('show')) {
                    if (!e.target.closest('#emoji-library') && !e.target.closest('#btn-emoji')) {
                        // 隐藏表情库
                        emojiLib.classList.remove('show');
                        // 恢复输入框和工具栏到初始位置
                        if (inputArea) inputArea.style.transform = 'translateY(0)';
                        if (toolbar) toolbar.style.transform = 'translateY(0)';
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

            // 副API事件监听已迁移到 secondary-api-manager.js
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
            
            // 根据搜索词过滤对话（支持搜索备注和名称）
            let filteredConversations = AppState.conversations;
            if (AppState.searchQuery) {
                filteredConversations = AppState.conversations.filter(conv => {
                    const searchLower = AppState.searchQuery.toLowerCase();
                    const nameMatch = conv.name.toLowerCase().includes(searchLower);
                    const remarkMatch = conv.remark && conv.remark.toLowerCase().includes(searchLower);
                    return nameMatch || remarkMatch;
                });
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
                
                // 优先显示备注，如果没有备注则显示角色名称
                const displayName = conv.remark || conv.name;
                
                item.innerHTML = `
                    <div class="msg-item-content" style="display:flex;align-items:center;gap:12px;padding:12px 15px;background:#fff;position:relative;z-index:2;cursor:pointer;">
                        <div class="msg-avatar">
                            ${avatarContent}
                            ${conv.unread > 0 ? `<div class="msg-badge">${conv.unread > 99 ? '99+' : conv.unread}</div>` : ''}
                        </div>
                        <div class="msg-content">
                            <div class="msg-header">
                                <div class="msg-title">${displayName}</div>
                                <div class="msg-time">${conv.time || ''}</div>
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
                    
                    // 优先显示备注，如果没有备注则显示角色名称
                    const displayName = friend.remark || friend.name;
                    
                    item.innerHTML = `
                        <div class="friend-item-content" style="display:flex;align-items:center;gap:12px;padding:10px 15px;background:#fff;position:relative;z-index:2;">
                            <div class="friend-avatar">${avatarContent}</div>
                            <div class="friend-info" style="flex:1;">
                                <div class="friend-name">${displayName}</div>
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
            // couples-space.js 会自动初始化和渲染内容
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
                    case 'user-persona':
                        if (window.UserPersonaManager) {
                            window.UserPersonaManager.openPersonaManager();
                        } else {
                            showToast('用户设定管理模块未加载');
                        }
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
            modal.className = 'settings-modal-overlay';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.classList.add('closing');
                    setTimeout(() => modal.remove(), 300);
                }
            });
            
            modal.innerHTML = `
                <div class="settings-modal-container">
                    <!-- 顶部标题栏 -->
                    <div class="settings-header">
                        <div class="settings-header-content">
                            <div class="settings-title-group">
                                <div class="settings-icon-wrapper">
                                    <svg viewBox="0 0 24 24" class="settings-icon">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="settings-title">设置</h3>
                                    <p class="settings-subtitle">应用配置与数据管理</p>
                                </div>
                            </div>
                            <button class="settings-close-btn" onclick="document.getElementById('settings-page-modal').classList.add('closing'); setTimeout(() => document.getElementById('settings-page-modal').remove(), 300);">
                                <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <!-- 内容区域 -->
                    <div class="settings-content">
                        <!-- 数据备份与恢复卡片 -->
                        <div class="settings-card">
                            <div class="settings-card-header">
                                <div class="settings-card-icon">
                                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;stroke-width:2;fill:none;">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                </div>
                                <div>
                                    <h4 class="settings-card-title">数据备份与恢复</h4>
                                    <p class="settings-card-desc">导出或导入应用数据</p>
                                </div>
                            </div>
                            
                            <div class="settings-card-content">
                                <button onclick="exportAllData();" class="settings-btn settings-btn-primary">
                                    <svg viewBox="0 0 24 24" class="settings-btn-icon">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    <span>导出数据</span>
                                </button>
                                
                                <button onclick="document.getElementById('import-backup-input').click();" class="settings-btn settings-btn-secondary">
                                    <svg viewBox="0 0 24 24" class="settings-btn-icon">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                    <span>导入数据</span>
                                </button>
                                
                                <input type="file" id="import-backup-input" accept=".json" style="display:none;">
                                
                                <div class="settings-info-box">
                                    <svg viewBox="0 0 24 24" class="settings-info-icon">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="16" x2="12" y2="12"></line>
                                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                    </svg>
                                    <div class="settings-info-text">
                                        备份包含：API预设、聊天记录、用户配置、表情包、角色管理、个性签名、好友、对话等所有数据
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 使用setTimeout确保DOM元素已经完全渲染后再绑定事件
            setTimeout(() => {
                const importInput = document.getElementById('import-backup-input');
                if (importInput) {
                    // 移除可能存在的旧事件监听器
                    const newInput = importInput.cloneNode(true);
                    importInput.parentNode.replaceChild(newInput, importInput);
                    
                    // 绑定新的导入事件
                    newInput.addEventListener('change', function(e) {
                        if (e.target.files && e.target.files[0]) {
                            importAllData(e.target.files[0]);
                            this.value = '';
                        }
                    });
                }
            }, 100);
        }
        
        // 导出所有数据
        function exportAllData() {
            try {
                // 导出所有AppState数据，确保包含所有字段
                const exportData = {
                    version: '1.0',
                    exportTime: new Date().toISOString(),
                    appState: {
                        friends: AppState.friends || [],
                        groups: AppState.groups || [],
                        friendGroups: AppState.friendGroups || [],
                        conversations: AppState.conversations || [],
                        messages: AppState.messages || {},
                        emojis: AppState.emojis || [],
                        emojiGroups: AppState.emojiGroups || [],
                        worldbooks: AppState.worldbooks || [],
                        user: AppState.user || {},
                        apiSettings: AppState.apiSettings || {},
                        collections: AppState.collections || [],
                        walletHistory: AppState.walletHistory || [],
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
                        
                        // 数据验证和修复 - 导入所有字段
                        AppState.friends = Array.isArray(appState.friends) ? appState.friends : [];
                        AppState.groups = Array.isArray(appState.groups) ? appState.groups : [];
                        AppState.friendGroups = Array.isArray(appState.friendGroups) ? appState.friendGroups : AppState.friendGroups;
                        AppState.conversations = Array.isArray(appState.conversations) ? appState.conversations : [];
                        AppState.messages = typeof appState.messages === 'object' ? appState.messages : {};
                        AppState.emojis = Array.isArray(appState.emojis) ? appState.emojis : [];
                        AppState.emojiGroups = Array.isArray(appState.emojiGroups) ? appState.emojiGroups : [];
                        AppState.worldbooks = Array.isArray(appState.worldbooks) ? appState.worldbooks : [];
                        AppState.collections = Array.isArray(appState.collections) ? appState.collections : [];
                        AppState.walletHistory = Array.isArray(appState.walletHistory) ? appState.walletHistory : [];
                        
                        if (appState.user && typeof appState.user === 'object') {
                            AppState.user = Object.assign(AppState.user, appState.user);
                        }
                        
                        if (appState.apiSettings && typeof appState.apiSettings === 'object') {
                            AppState.apiSettings = Object.assign(AppState.apiSettings, appState.apiSettings);
                        }
                        
                        if (appState.dynamicFuncs && typeof appState.dynamicFuncs === 'object') {
                            AppState.dynamicFuncs = Object.assign(AppState.dynamicFuncs, appState.dynamicFuncs);
                        }
                        
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
                remark: '',  // 初始化备注为空
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
                remark: '',  // 初始化备注为空
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
                
                // 尝试从PNG中提取嵌入的角色卡数据
                const reader = new FileReader();
                reader.onload = function(e) {
                    const arrayBuffer = e.target.result;
                    
                    // 尝试解析PNG中的角色卡数据
                    extractCharacterCardFromPNG(arrayBuffer, file.name, function(cardData) {
                        if (cardData) {
                            // 成功提取到角色卡数据，直接导入
                            importExtractedCard(cardData, arrayBuffer);
                        } else {
                            // 没有嵌入数据，显示手动配置对话框
                            const dataUrl = arrayBufferToDataURL(arrayBuffer, file.type);
                            showImageCardConfigDialog(dataUrl, file.name);
                        }
                    });
                };
                reader.readAsArrayBuffer(file);
            });
        }
        
        // 将ArrayBuffer转换为DataURL
        function arrayBufferToDataURL(arrayBuffer, mimeType) {
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            return 'data:' + mimeType + ';base64,' + base64;
        }
        
        // 从PNG图片中提取角色卡数据
        function extractCharacterCardFromPNG(arrayBuffer, fileName, callback) {
            try {
                const uint8Array = new Uint8Array(arrayBuffer);
                
                // 检查PNG文件头
                if (uint8Array[0] !== 0x89 || uint8Array[1] !== 0x50 ||
                    uint8Array[2] !== 0x4E || uint8Array[3] !== 0x47) {
                    callback(null);
                    return;
                }
                
                // 查找tEXt块
                let offset = 8; // 跳过PNG签名
                let characterData = null;
                
                while (offset < uint8Array.length) {
                    // 读取块长度
                    const length = (uint8Array[offset] << 24) |
                                 (uint8Array[offset + 1] << 16) |
                                 (uint8Array[offset + 2] << 8) |
                                 uint8Array[offset + 3];
                    
                    // 读取块类型
                    const type = String.fromCharCode(
                        uint8Array[offset + 4],
                        uint8Array[offset + 5],
                        uint8Array[offset + 6],
                        uint8Array[offset + 7]
                    );
                    
                    // 检查是否为tEXt块
                    if (type === 'tEXt') {
                        // 读取tEXt块数据
                        const dataStart = offset + 8;
                        const dataEnd = dataStart + length;
                        const textData = uint8Array.slice(dataStart, dataEnd);
                        
                        // 查找关键字和值的分隔符（null字节）
                        let nullIndex = -1;
                        for (let i = 0; i < textData.length; i++) {
                            if (textData[i] === 0) {
                                nullIndex = i;
                                break;
                            }
                        }
                        
                        if (nullIndex !== -1) {
                            const keyword = String.fromCharCode.apply(null, textData.slice(0, nullIndex));
                            
                            // 检查是否为角色卡关键字（SillyTavern使用'chara'）
                            if (keyword === 'chara' || keyword === 'ccv3' || keyword === 'charactercard') {
                                const valueBytes = textData.slice(nullIndex + 1);
                                const valueString = new TextDecoder('utf-8').decode(valueBytes);
                                
                                try {
                                    characterData = JSON.parse(valueString);
                                    break;
                                } catch (e) {
                                    console.warn('解析角色卡JSON失败:', e);
                                }
                            }
                        }
                    }
                    
                    // 移动到下一个块 (length + 4(type) + 4(crc) + 4(length))
                    offset += length + 12;
                    
                    // 如果到达IEND块，停止搜索
                    if (type === 'IEND') break;
                }
                
                callback(characterData);
            } catch (error) {
                console.error('提取PNG元数据失败:', error);
                callback(null);
            }
        }
        
        // 导入提取到的角色卡数据
        function importExtractedCard(cardData, imageArrayBuffer) {
            try {
                const card = parseCharacterCard(cardData);
                
                if (!card) {
                    showToast('无法解析角色卡数据');
                    return;
                }
                
                // 将图片数据转换为DataURL作为头像
                const imageDataUrl = arrayBufferToDataURL(imageArrayBuffer, 'image/png');
                card.avatar = imageDataUrl;
                
                // 添加到导入列表
                AppState.importedCards.push(card);
                
                // 更新预览
                const preview = document.getElementById('import-preview');
                if (!preview) return;
                
                const item = document.createElement('div');
                item.className = 'import-preview-item';
                item.innerHTML = `
                    <div class="import-preview-avatar">
                        <img src="${imageDataUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">
                    </div>
                    <div class="import-preview-info">
                        <div class="import-preview-name">${card.name}</div>
                        <div class="import-preview-desc">${card.description ? card.description.substring(0, 50) + '...' : '无描述'}</div>
                        ${card.worldbook ? '<div style="font-size:11px;color:#666;margin-top:4px;">✓ 包含世界书</div>' : ''}
                    </div>
                `;
                preview.appendChild(item);
                
                // 显示导入按钮
                if (AppState.importedCards.length > 0) {
                    document.getElementById('import-all-btn').classList.add('show');
                }
                
                showToast('成功提取角色卡：' + card.name);
            } catch (error) {
                console.error('导入角色卡失败:', error);
                showToast('导入失败：' + error.message);
            }
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
            let worldbookEntries = [];
            
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
                
                // 提取世界书信息 - 优先使用character_book（标准格式）
                if (data.data.character_book && data.data.character_book.entries) {
                    // SillyTavern标准世界书格式
                    const entries = data.data.character_book.entries;
                    if (Array.isArray(entries) && entries.length > 0) {
                        // 将条目合并为文本内容
                        worldbookEntries = entries.map(entry => {
                            let text = '';
                            if (entry.keys && entry.keys.length > 0) {
                                text += `关键词: ${entry.keys.join(', ')}\n`;
                            }
                            if (entry.content) {
                                text += entry.content;
                            }
                            return text;
                        }).filter(t => t.trim());
                        
                        if (worldbookEntries.length > 0) {
                            worldbook = {
                                name: data.data.character_book.name || (data.data.name + '的世界书'),
                                content: worldbookEntries.join('\n\n---\n\n'),
                                isGlobal: false
                            };
                        }
                    }
                }
                // 备用：检查world_scenario字段
                else if (data.data.world_scenario) {
                    worldbook = {
                        name: data.data.name + '的世界书',
                        content: data.data.world_scenario,
                        isGlobal: false
                    };
                }
                // 备用：检查extensions.world字段
                else if (data.data.extensions && data.data.extensions.world) {
                    worldbook = {
                        name: data.data.name + '的世界书',
                        content: typeof data.data.extensions.world === 'string'
                            ? data.data.extensions.world
                            : JSON.stringify(data.data.extensions.world, null, 2),
                        isGlobal: false
                    };
                }
                // 备用：使用scenario字段
                else if (data.data.scenario && data.data.scenario.trim()) {
                    worldbook = {
                        name: data.data.name + '的世界书',
                        content: data.data.scenario,
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
                
                // V1格式：检查character_book
                if (data.character_book && data.character_book.entries) {
                    const entries = data.character_book.entries;
                    if (Array.isArray(entries) && entries.length > 0) {
                        worldbookEntries = entries.map(entry => {
                            let text = '';
                            if (entry.keys && entry.keys.length > 0) {
                                text += `关键词: ${entry.keys.join(', ')}\n`;
                            }
                            if (entry.content) {
                                text += entry.content;
                            }
                            return text;
                        }).filter(t => t.trim());
                        
                        if (worldbookEntries.length > 0) {
                            worldbook = {
                                name: data.character_book.name || (data.name + '的世界书'),
                                content: worldbookEntries.join('\n\n---\n\n'),
                                isGlobal: false
                            };
                        }
                    }
                }
                // 备用：V1中检查scenario字段作为世界书
                else if (data.scenario && data.scenario.trim()) {
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
                if (worldbook && worldbook.content && worldbook.content.trim()) {
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
            
            let worldbookCount = 0;
            
            AppState.importedCards.forEach(function(card) {
                // 导入角色
                AppState.friends.push(card);
                
                let boundWorldbookIds = [];
                
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
                        worldbookCount++;
                    }
                    
                    boundWorldbookIds.push(existingWb.id);
                }
                
                // 创建对应的会话（无论是否有世界书）
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
                        boundWorldbooks: boundWorldbookIds  // 绑定世界书（如果有）
                    };
                    AppState.conversations.unshift(conv);
                } else if (boundWorldbookIds.length > 0) {
                    // 如果会话已存在，更新其绑定的世界书
                    conv.boundWorldbooks = conv.boundWorldbooks || [];
                    boundWorldbookIds.forEach(wbId => {
                        if (!conv.boundWorldbooks.includes(wbId)) {
                            conv.boundWorldbooks.push(wbId);
                        }
                    });
                }
            });
            
            saveToStorage();
            renderFriends();
            renderWorldbooks();  // 刷新世界书列表
            
            const message = worldbookCount > 0
                ? `成功导入 ${AppState.importedCards.length} 个角色及 ${worldbookCount} 个世界书`
                : `成功导入 ${AppState.importedCards.length} 个角色`;
            showToast(message);
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
            
            // 优先显示备注，如果没有备注则显示角色名称
            const displayName = conv.remark || conv.name;
            document.getElementById('chat-title').textContent = displayName;
            
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
            
            // 应用消息气泡颜色
            if (window.CharacterSettingsManager && conv) {
                window.CharacterSettingsManager.applyBubbleColors(conv);
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
            
            // 更新心声按钮显示
            MindStateManager.updateMindStateButton(conv);
            
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
                    remark: friend.remark || '',  // 保存备注
                    avatar: friend.avatar,
                    description: friend.description || '',
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
                    unread: 0
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
                
                // 撤回消息：显示为中心提示，包含原始内容
                if (msg.isRetracted) {
                    const retractWrapper = document.createElement('div');
                    retractWrapper.className = 'retracted-message-wrapper';
                    retractWrapper.dataset.messageId = msg.id;
                    retractWrapper.style.cssText = `
                        text-align: center;
                        margin: 8px 0;
                        padding: 8px 0;
                        user-select: none;
                        -webkit-user-select: none;
                        -webkit-touch-callout: none;
                    `;
                    
                    // 撤回提示文字
                    const retractNotice = document.createElement('div');
                    retractNotice.style.cssText = `
                        color: #999;
                        font-size: 12px;
                        margin-bottom: 2px;
                    `;
                    retractNotice.textContent = msg.content;
                    
                    // 被撤回的原始内容
                    const retractedContent = document.createElement('div');
                    retractedContent.style.cssText = `
                        color: #bbb;
                        font-size: 11px;
                        padding: 6px 10px;
                        background: #f5f5f5;
                        border-radius: 4px;
                        display: inline-block;
                        max-width: 70%;
                        word-break: break-word;
                        margin-top: 2px;
                    `;
                    retractedContent.textContent = msg.retractedContent || '内容已删除';
                    
                    retractWrapper.appendChild(retractNotice);
                    retractWrapper.appendChild(retractedContent);
                    
                    // 添加长按事件监听（使用与普通消息相同的模式）
                    let longPressTimer;
                    let touchStarted = false;
                    let touchStartX = 0;
                    let touchStartY = 0;
                    
                    retractWrapper.addEventListener('touchstart', (e) => {
                        touchStarted = true;
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                        longPressTimer = setTimeout(() => {
                            if (touchStarted) {
                                // 防止系统自动选择文本
                                if (window.getSelection) {
                                    window.getSelection().removeAllRanges();
                                }
                                showMessageContextMenu(msg, null, retractWrapper);
                            }
                        }, 300);
                    }, { passive: true });
                    
                    retractWrapper.addEventListener('touchmove', (e) => {
                        // 计算移动距离
                        const moveX = Math.abs(e.touches[0].clientX - touchStartX);
                        const moveY = Math.abs(e.touches[0].clientY - touchStartY);
                        
                        // 如果移动超过10px，认为是滚动，不是长按
                        if (moveX > 10 || moveY > 10) {
                            clearTimeout(longPressTimer);
                            touchStarted = false;
                        }
                    }, { passive: true });
                    
                    retractWrapper.addEventListener('touchend', (e) => {
                        touchStarted = false;
                        clearTimeout(longPressTimer);
                        // 清除选择
                        if (window.getSelection) {
                            window.getSelection().removeAllRanges();
                        }
                    }, { passive: true });
                    
                    retractWrapper.addEventListener('touchcancel', () => {
                        touchStarted = false;
                        clearTimeout(longPressTimer);
                    });
                    
                    // PC端右键菜单
                    retractWrapper.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        showMessageContextMenu(msg, e.clientX, e.clientY);
                    });
                    
                    container.appendChild(retractWrapper);
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
                        textContent += `<div style="padding:6px;margin-bottom:8px;border-left:3px solid #ddd;background:#f5f5f5;border-radius:4px;font-size:11px;color:#999;max-width:200px;cursor:pointer;" data-scroll-to="${replyId}"><div style="margin-bottom:3px;font-weight:500;color:#666;font-size:11px;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${replyAuthor}</div><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:190px;font-size:11px;">${escapeHtml(replyContent)}</div></div>`;
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
                    textContent += `<div style="padding:8px;margin-top:8px;background:#f9f9f9;border-radius:4px;font-size:12px;color:#666;border-left:2px solid #ddd;"><div style="font-weight:500;margin-bottom:4px;color:#999;font-size:11px;">${msg.translation.targetLanguage}</div><div>${escapeHtml(transText)}</div><button class="close-trans-btn" data-msg-id="${msg.id}" style="margin-top:4px;background:none;border:none;color:#999;cursor:pointer;font-size:12px;padding:0;">关闭</button></div>`;
                }
                
                // 转发朋友圈消息已经设置了 textContent，这里直接使用
                if (!(msg.isForward && msg.forwardedMoment)) {
                    textContent += `</div>`;
                }
                
                // 一次性设置bubble.innerHTML (必须在添加事件监听器之前！)
                if (msg.type === 'voice') {
                    // 语音条消息渲染
                    const duration = msg.duration || 1;
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
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
                    const senderName = msg.sender === 'sent' ? AppState.user.name : AppState.currentChat.name;
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
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
                    
                    // 添加地理位置气泡的点击事件（仅在非多选模式下）
                    if (!AppState.isSelectMode) {
                        const locationBubble = bubble.querySelector('.location-bubble');
                        if (locationBubble) {
                            locationBubble.addEventListener('click', (e) => {
                                e.stopPropagation();
                                if (typeof LocationMessageModule !== 'undefined') {
                                    LocationMessageModule.showLocationDetails(msg.locationName, msg.locationAddress, locationBubble);
                                }
                            });
                        }
                    }
                } else if (msg.isForward && msg.forwardedMoment) {
                    // 转发朋友圈消息 - 简洁优雅的卡片（黑白灰风格）
                    console.log('🎯 检测到转发朋友圈消息:', msg);
                    const forwarded = msg.forwardedMoment;
                    const momentAuthor = escapeHtml(forwarded.author || '用户');
                    const momentContent = escapeHtml(forwarded.content || '').trim().split('\n').map(line => line.trim()).join('\n');
                    const momentDate = forwarded.timestamp ? new Date(forwarded.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
                    
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
                        <div style="
                            width: 160px;
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
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
                        <img src="${msg.imageData}" alt="图片" style="max-width:100px;max-height:100px;width:auto;height:auto;border-radius:8px;display:block;">
                    `;
                    // 为图片消息添加特殊class
                    bubble.classList.add('image-message');
                } else if (msg.emojiUrl || msg.isEmoji) {
                    // 表情包消息：显示头像 + 100px表情包（统一处理AI和用户发送的表情包）
                    // emojiUrl是新格式，isEmoji标记的旧格式也需要支持
                    const emojiImageUrl = msg.emojiUrl || (msg.isEmoji && AppState.emojis.find(e => e.text === msg.content)?.url);
                    if (emojiImageUrl) {
                        bubble.innerHTML = `
                            <div class="chat-avatar">${avatarContent}</div>
                            <img src="${emojiImageUrl}" alt="表情" style="max-width:100px;max-height:100px;width:auto;height:auto;border-radius:8px;display:block;">
                        `;
                    } else {
                        // 如果找不到表情包图片，显示文字
                        bubble.innerHTML = `
                            <div class="chat-avatar">${avatarContent}</div>
                            ${textContent}
                        `;
                    }
                    // 为表情包消息添加特殊class
                    bubble.classList.add('emoji-message');
                } else {
                    // 其他消息（普通文本、表情+文字、有描述的图片等）
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
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
                    document.removeEventListener('touchend', closeMenuHandler);
                }
            };
            
            // 延迟添加关闭监听器，避免长按松开时立即关闭菜单
            setTimeout(() => {
                document.addEventListener('click', closeMenuHandler);
                document.addEventListener('touchend', closeMenuHandler);
            }, 300);
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
                // 只有退出多选模式时才需要重新渲染
                renderChatMessages();
                return;
            }
            
            // 优化:只更新当前气泡的选中状态,而不是重新渲染所有消息
            const bubble = document.querySelector(`.chat-bubble[data-msg-id="${msgId}"]`);
            if (bubble) {
                if (index > -1) {
                    // 取消选中
                    bubble.classList.remove('selected');
                } else {
                    // 选中
                    bubble.classList.add('selected');
                }
            }
            
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

        // ===== 副API调用函数已迁移到 secondary-api-manager.js =====
        // 使用 SecondaryAPIManager.callSecondaryAPI() 替代
        // 使用 SecondaryAPIManager.callWithDynamicPrompt() 替代
        
        // 兼容性包装函数
        function callSecondaryAPI(messages, systemPrompt, onSuccess, onError, timeout = 30000) {
            return SecondaryAPIManager.callSecondaryAPI(messages, systemPrompt, onSuccess, onError, timeout);
        }
        
        function callSecondaryAPIWithDynamicPrompt(content, promptType = 'translate', onSuccess, onError) {
            return SecondaryAPIManager.callWithDynamicPrompt(content, promptType, onSuccess, onError);
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
                // 注意：朋友圈个人资料现在完全独立，不再同步
                
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
                // 注意：朋友圈个人资料现在完全独立，不再同步
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

            // 注意：副API密钥显示/隐藏切换已在SecondaryAPIManager.initEventListeners()中处理
            // 避免重复绑定事件
            
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
            // 创建自定义输入模态框
            let modal = document.getElementById('new-preset-name-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'new-preset-name-modal';
            modal.className = 'emoji-mgmt-modal show';
            modal.innerHTML = `
                <div class="emoji-mgmt-content">
                    <h3>新增预设</h3>
                    <button class="emoji-mgmt-close" onclick="document.getElementById('new-preset-name-modal').remove();">
                        <svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    
                    <label>预设名称</label>
                    <input type="text" id="new-preset-name-input" placeholder="请输入预设名称" style="width:100%;padding:12px 16px;border:1.5px solid #e5e5e5;border-radius:12px;font-size:15px;color:#1a1a1a;background:#fafafa;outline:none;margin-bottom:16px;">
                    
                    <div style="display:flex;gap:12px;justify-content:flex-end;">
                        <button class="emoji-mgmt-btn" onclick="document.getElementById('new-preset-name-modal').remove();">取消</button>
                        <button class="emoji-mgmt-btn" style="background:linear-gradient(135deg, #3a3a3a 0%, #1a1a1a 100%);color:#fff;border:none;" onclick="confirmNewPresetName();">确定</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 聚焦输入框
            setTimeout(() => {
                const input = document.getElementById('new-preset-name-input');
                if (input) {
                    input.focus();
                    input.addEventListener('keypress', function(e) {
                        if (e.key === 'Enter') {
                            confirmNewPresetName();
                        }
                    });
                }
            }, 100);
            
            // 防止模态框关闭时冒泡
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }
        
        // 确认新预设名称
        function confirmNewPresetName() {
            const nameInput = document.getElementById('new-preset-name-input');
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) {
                showToast('请输入预设名称');
                return;
            }
            
            document.getElementById('new-preset-name-modal').remove();
            
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

        // 为预设拉取副API模型 - 已迁移到 secondary-api-manager.js
        async function fetchSecondaryModelsForPreset(preset) {
            return SecondaryAPIManager.fetchModelsForPreset(preset);
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
                const apiKeyToggle = document.getElementById('api-key-toggle');
                
                // 新增的主API参数元素
                const temperatureEl = document.getElementById('temperature-input');
                const frequencyPenaltyEl = document.getElementById('frequency-penalty-input');
                const presencePenaltyEl = document.getElementById('presence-penalty-input');
                const topPEl = document.getElementById('top-p-input');

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
                
                // 加载主API参数并更新显示值
                if (temperatureEl) {
                    const tempValue = s.temperature !== undefined ? s.temperature : 0.8;
                    temperatureEl.value = tempValue;
                    const tempDisplay = document.getElementById('temperature-value');
                    if (tempDisplay) tempDisplay.textContent = tempValue;
                }
                if (frequencyPenaltyEl) {
                    const fpValue = s.frequencyPenalty !== undefined ? s.frequencyPenalty : 0.2;
                    frequencyPenaltyEl.value = fpValue;
                    const fpDisplay = document.getElementById('frequency-penalty-value');
                    if (fpDisplay) fpDisplay.textContent = fpValue;
                }
                if (presencePenaltyEl) {
                    const ppValue = s.presencePenalty !== undefined ? s.presencePenalty : 0.1;
                    presencePenaltyEl.value = ppValue;
                    const ppDisplay = document.getElementById('presence-penalty-value');
                    if (ppDisplay) ppDisplay.textContent = ppValue;
                }
                if (topPEl) {
                    const topPValue = s.topP !== undefined ? s.topP : 1.0;
                    topPEl.value = topPValue;
                    const topPDisplay = document.getElementById('top-p-value');
                    if (topPDisplay) topPDisplay.textContent = topPValue;
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

                // 副API设置加载已迁移到 secondary-api-manager.js
                SecondaryAPIManager.loadSettingsToUI();
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
            // 世界书功能已迁移到worldbook.js
            // WorldbookManager会自动初始化
            console.log('世界书UI由WorldbookManager管理');
        }

        // API参数锁定状态更新函数
        function updateLockButtonState(isLocked) {
            const lockBtn = document.getElementById('api-params-lock-btn');
            const paramsContainer = document.getElementById('api-params-container');
            
            if (lockBtn && paramsContainer) {
                if (isLocked) {
                    paramsContainer.classList.add('locked');
                    lockBtn.classList.add('locked');
                    lockBtn.innerHTML = '<i class="fa-solid fa-lock"></i><span>已锁定</span>';
                } else {
                    paramsContainer.classList.remove('locked');
                    lockBtn.classList.remove('locked');
                    lockBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i><span>解锁</span>';
                }
            }
        }

        function saveApiSettingsFromUI() {
            const endpoint = (document.getElementById('api-endpoint') || {}).value || '';
            const apiKey = (document.getElementById('api-key') || {}).value || '';
            const selected = (document.getElementById('models-select') || {}).value || '';
            const aiTime = !!((document.getElementById('ai-time-aware') || {}).checked);
            
            // 主API参数
            const temperature = parseFloat((document.getElementById('temperature-input') || {}).value || 0.8);
            const frequencyPenalty = parseFloat((document.getElementById('frequency-penalty-input') || {}).value || 0.2);
            const presencePenalty = parseFloat((document.getElementById('presence-penalty-input') || {}).value || 0.1);
            const topP = parseFloat((document.getElementById('top-p-input') || {}).value || 1.0);

            AppState.apiSettings = AppState.apiSettings || {};
            AppState.apiSettings.endpoint = endpoint.trim();
            AppState.apiSettings.apiKey = apiKey.trim();
            AppState.apiSettings.selectedModel = selected;
            AppState.apiSettings.aiTimeAware = aiTime;
            
            // 保存主API参数（添加范围验证）
            AppState.apiSettings.temperature = isNaN(temperature) ? 0.8 : Math.max(0, Math.min(2, temperature));
            AppState.apiSettings.frequencyPenalty = isNaN(frequencyPenalty) ? 0.2 : Math.max(-2, Math.min(2, frequencyPenalty));
            AppState.apiSettings.presencePenalty = isNaN(presencePenalty) ? 0.1 : Math.max(-2, Math.min(2, presencePenalty));
            AppState.apiSettings.topP = isNaN(topP) ? 1.0 : Math.max(0, Math.min(1, topP));

            // 保存副API设置 - 已迁移到 secondary-api-manager.js
            SecondaryAPIManager.saveSettingsFromUI();

            // persist
            saveToStorage();
            loadApiSettingsToUI();
            showToast('设置已保存');
        }

        // ========== 线上模式 - 主API拉取模型（调用MainAPIManager） ==========
        async function fetchModels() {
            if (window.MainAPIManager && window.MainAPIManager.fetchModels) {
                return await MainAPIManager.fetchModels();
            } else {
                showToast('主API管理器未加载，请刷新页面');
                console.error('MainAPIManager未初始化');
            }
        }

        // 拉取副API的模型列表 - 已迁移到 secondary-api-manager.js
        async function fetchSecondaryModels() {
            return SecondaryAPIManager.fetchModels();
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
                temperature: api.temperature !== undefined ? api.temperature : 0.8,
                max_tokens: 10000,
                frequency_penalty: api.frequencyPenalty !== undefined ? api.frequencyPenalty : 0.2,
                presence_penalty: api.presencePenalty !== undefined ? api.presencePenalty : 0.1,
                top_p: api.topP !== undefined ? api.topP : 1.0
            };

            // 固定使用 /v1 路径
            const endpoint = baseEndpoint + '/chat/completions';

            let lastError = null;
            let success = false;
            let timeoutId = null;

            try {
                const controller = new AbortController();
                timeoutId = setTimeout(() => controller.abort(), 60000);
                
                const fetchOptions = {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, apiKey ? { 'Authorization': 'Bearer ' + apiKey } : {}),
                    body: JSON.stringify(body),
                    signal: controller.signal
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

                const res = await fetch(endpoint, fetchOptions);
                clearTimeout(timeoutId);

                console.log('📥 API响应状态:', res.status, res.statusText);

                // 🔧 修复：无论用户是否离开对话，都处理API响应
                // 这样即使用户切换到其他页面，API调用也能正常完成并触发通知
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
                            
                            // 🔧 修复：强制立即刷新聊天界面，确保AI回复立即显示
                            if (AppState.currentChat && AppState.currentChat.id === convId) {
                                // 使用 setTimeout 0 确保在下一个事件循环中渲染，避免被阻塞
                                setTimeout(() => {
                                    renderChatMessages();
                                }, 0);
                            }
                        } else {
                            lastError = '未在返回中找到文本回复';
                            console.error('❌ 无法从API响应中提取文本。完整响应数据:');
                            console.error(JSON.stringify(data, null, 2));
                            console.error('响应keys:', Object.keys(data));
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

            // 🔧 修复：无论用户是否在当前对话，都显示错误提示
            if (!success) {
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


        // 获取表情包使用说明
        function getEmojiInstructions(conv) {
            // 支持旧版单个绑定和新版多个绑定
            const boundGroups = conv.boundEmojiGroups || (conv.boundEmojiGroup ? [conv.boundEmojiGroup] : []);
            
            if (!boundGroups || boundGroups.length === 0) {
                return null;  // 如果没有绑定表情包，不添加指令
            }
            
            // 收集所有绑定分组中的表情包
            let allEmojis = [];
            let groupNames = [];
            
            boundGroups.forEach(groupId => {
                const emojiGroup = AppState.emojiGroups.find(g => g.id === groupId);
                if (emojiGroup) {
                    groupNames.push(emojiGroup.name);
                    const emojisInGroup = AppState.emojis.filter(e => e.groupId === groupId);
                    allEmojis = allEmojis.concat(emojisInGroup);
                }
            });
            
            if (allEmojis.length === 0) return null;
            
            // 构建表情包列表
            const emojiList = allEmojis.map(e => `"${e.text}"`).join('、');
            const groupNameStr = groupNames.length > 1 ? groupNames.join('、') : groupNames[0];
            
            return `【表情包系统】你可以在回复中发送表情包，但不是每次都要发。根据上下文内容判断是否合适发送表情包，发送的概率应该是有选择性的。
你有权访问以下表情包分组【${groupNameStr}】中的表情：${emojiList}

发送表情包的方法：在你的回复中任何位置，使用以下格式包含表情包：
【表情包】${allEmojis.length > 0 ? allEmojis[0].text : '表情'}【/表情包】

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
            systemPrompts.push(MindStateManager.getMindStateSystemPrompt());
            
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

3. 【语音条消息】格式为：[用户名发送了语音条，时长X秒]\n语音内容：文字内容
   - 用户发送的是语音条，但会以文字形式展示给你
   - 识别这是语音条后，你可以：
     * 理解这是更亲密、更口语化的交流方式
     * 适当回应语音的特点（如"听到你的声音了"、"你的语气..."等）
     * 也可以用语音条回复（使用【语音条】格式）
   - 语音条通常用于表达更私密、犹豫、情绪化的内容

4. 【地理位置消息】格式为：[用户名发送了地理位置]\n位置名称：...\n详细地址：...\n距离范围：...
   - 用户分享了一个地理位置
   - 识别后应该：
     * 确认收到位置信息
     * 根据情境回应（如"好的，我知道了"、"这个地方我知道"等）
     * 如果合适，可以分享相关的地点或约定见面
   - 可以使用【地理位置】格式回复自己的位置

5. 【普通文字消息】这是用户的正常对话文字
   - 直接理解和回应用户的文字内容

记住：不同类型的消息代表不同的交流意图，要正确识别并做出恰当回应。`);



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
            
            // 添加语音消息和地理位置发送说明
            systemPrompts.push(`【语音消息和地理位置发送格式】
你可以主动发送语音消息和地理位置，使用以下格式：

1. 【语音消息】使用格式：【语音条】语音内容文字|时长【/语音条】
   - 语音内容：你想说的话（会被转换为语音条显示）
   - 时长：语音时长（秒），建议1-60秒，根据内容长度合理设置
   - 示例：【语音条】嗯...我在想要不要去那边看看|3【/语音条】
   - 示例：【语音条】好啊，我也想去！|2【/语音条】
   - 注意：语音条适合表达犹豫、思考、私密的话，或者想要更亲密的交流时使用

2. 【地理位置】使用格式：【地理位置】位置名称|详细地址|距离【/地理位置】
   - 位置名称：地点的名字（必填）
   - 详细地址：具体地址（选填，可以为空）
   - 距离：距离范围，单位米（选填，默认5米）
   - 示例：【地理位置】星巴克咖啡|北京市朝阳区建国路1号|10【/地理位置】
   - 示例：【地理位置】天安门广场||【/地理位置】
   - 注意：分享位置时适合约见面、推荐地点、告诉对方你在哪里

3. 【撤回消息】使用格式：【撤回】消息ID【/撤回】
   - 消息ID：你要撤回的之前发送的消息的ID（从上下文中获取）
   - 示例：【撤回】msg_1738070123456【/撤回】
   - 使用场景：
     * 说错话或发错内容时（如口误、信息错误）
     * 后悔刚才说的话时（如太冲动、情绪失控）
     * 需要改口或纠正之前的说法时
     * 意识到信息不应该透露时
   - 重要提示：
     * 只在真正需要时使用，不要频繁撤回
     * 撤回后用户会看到"角色名撤回了一条消息"的提示
     * 撤回的原始内容会被保存，但用户看不到
     * 通常在撤回后需要重新表达或解释

使用建议：
- 语音条：适合表达情绪、犹豫、私密内容，或想要更真实的交流感时
- 地理位置：适合约见面、分享你在的地方、推荐好去处
- 撤回消息：只在说错话、后悔、需要改口等特殊情况下使用，不要滥用
- 不要每次都使用这些功能，根据对话情境自然地选择
- 可以和普通文字消息结合使用，先发文字再发语音/位置，或反之`);
            
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
            
            // 添加绑定的表情包分组信息（支持多个分组）
            const boundGroups = conv.boundEmojiGroups || (conv.boundEmojiGroup ? [conv.boundEmojiGroup] : []);
            if (boundGroups && boundGroups.length > 0) {
                boundGroups.forEach(groupId => {
                    const emojiGroup = AppState.emojiGroups && AppState.emojiGroups.find(g => g.id === groupId);
                    if (emojiGroup && emojiGroup.description) {
                        out.push({ role: 'system', content: `表情包分组【${emojiGroup.name}】描述：${emojiGroup.description}` });
                    }
                });
            }
            
            // 单独处理时间信息：不在worldbookParts中，而是在单独的system消息中
            // 这样可以确保AI知道当前时间，但用户不会在对话中看到这个时间戳
            if (AppState.apiSettings && AppState.apiSettings.aiTimeAware) {
                out.push({ role: 'system', content: '当前时间：' + new Date().toLocaleString('zh-CN') });
            }

            // 直接使用所有消息，不再限制上下文条数
            msgs.forEach((m, index) => {
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
                
                // 如果消息是语音条，提供语音条信息
                if (m.type === 'voice') {
                    const duration = m.duration || 1;
                    const senderName = m.sender === 'sent' ? (userNameToUse || '用户') : charName;
                    messageContent = `[${senderName}发送了语音条，时长${duration}秒]\n语音内容：${m.content}`;
                }
                
                // 如果消息是地理位置，提供地理位置信息
                if (m.type === 'location') {
                    const locationName = m.locationName || '位置';
                    const locationAddress = m.locationAddress || '';
                    const locationDistance = m.locationDistance || 5;
                    const senderName = m.sender === 'sent' ? (userNameToUse || '用户') : charName;
                    messageContent = `[${senderName}发送了地理位置]\n位置名称：${locationName}\n详细地址：${locationAddress}\n距离范围：约${locationDistance}米`;
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
            // ========== 第一步：提前提取并保存心声数据（无论单消息还是多消息） ==========
            MindStateManager.handleMindStateSave(convId, text);
            
            // ========== 第二步：检查是否包含思考过程格式 ==========
            const thinkingData = parseThinkingProcess(text);
            
            if (thinkingData) {
                // 存在思考过程，分批添加消息
                appendMultipleAssistantMessages(convId, thinkingData);
            } else {
                // 普通消息，按原有逻辑处理
                appendSingleAssistantMessage(convId, text, true); // 传递skipMindStateExtraction=true，避免重复提取
            }
            
            // ========== 第三步：更新心声按钮 ==========
            const conv = AppState.conversations.find(c => c.id === convId);
            if (AppState.currentChat && AppState.currentChat.id === convId && conv) {
                MindStateManager.updateMindStateButton(conv);
            }
            
            // ========== 第四步：触发自动生成朋友圈 ==========
            if (typeof MomentsGroupInteraction !== 'undefined' && conv) {
                // 异步触发，不阻塞主流程
                setTimeout(() => {
                    try {
                        MomentsGroupInteraction.checkAndTriggerAutoMoments(conv.id, conv.name);
                    } catch (e) {
                        console.error('触发自动生成朋友圈失败:', e);
                    }
                }, 500);
            }
        }

        function appendSingleAssistantMessage(convId, text, skipMindStateExtraction = false) {
            // ========== 第一步：清理AI回复（移除心声标记） ==========
            // 首先应用强大的清理函数
            text = cleanAIResponse(text);
            
            // ========== 第二步：处理撤回标记 ==========
            // 匹配撤回标记：【撤回】消息ID【/撤回】
            const retractRegex = /【撤回】([^【]+?)【\/撤回】/;
            const retractMatch = text.match(retractRegex);
            
            if (retractMatch && retractMatch[1]) {
                const targetMsgId = retractMatch[1].trim();
                // AI主动撤回某条消息
                if (!AppState.messages[convId]) {
                    AppState.messages[convId] = [];
                }
                const messages = AppState.messages[convId];
                const msgIndex = messages.findIndex(m => m.id === targetMsgId);
                
                if (msgIndex > -1) {
                    const originalMsg = messages[msgIndex];
                    const characterName = AppState.conversations.find(c => c.id === convId)?.name || 'AI';
                    const retractText = `${characterName}撤回了一条消息`;
                    
                    // 创建撤回占位符消息
                    const retractMsg = {
                        id: targetMsgId,
                        type: originalMsg.type,
                        content: retractText,
                        timestamp: originalMsg.timestamp,
                        isRetracted: true,
                        retractedContent: originalMsg.content
                    };
                    
                    // 替换原消息
                    messages[msgIndex] = retractMsg;
                    
                    saveToStorage();
                    if (AppState.currentChat && AppState.currentChat.id === convId) renderChatMessages();
                    renderConversations();
                }
                
                // 从文本中移除撤回标记
                text = text.replace(retractRegex, '').trim();
                
                // 如果移除撤回标记后没有其他内容，直接返回
                if (!text || !text.trim()) {
                    return;
                }
            }
            
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
            
            // ========== 第四步：处理语音消息信息 ==========
            // 匹配语音条标记：【语音条】语音内容|时长【/语音条】
            const voiceRegex = /【语音条】([^|【]+)\|?([^【]*)【\/语音条】/;
            const voiceMatch = text.match(voiceRegex);
            let voiceContent = null;
            let voiceDuration = 1;
            let isVoice = false;
            
            if (voiceMatch && voiceMatch[1]) {
                isVoice = true;
                voiceContent = voiceMatch[1].trim();
                if (voiceMatch[2]) {
                    const durationStr = voiceMatch[2].trim();
                    const parsedDuration = parseInt(durationStr);
                    if (!isNaN(parsedDuration) && parsedDuration > 0) {
                        voiceDuration = parsedDuration;
                    }
                }
                // 从文本中移除语音条标记
                text = text.replace(voiceRegex, '').trim();
            }
            
            // ========== 第五步：处理地理位置信息 ==========
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
            
            // ========== 第六步：创建并添加AI消息 ==========
            if (!AppState.messages[convId]) {
                AppState.messages[convId] = [];
            }
            
            // 如果检测到语音消息，创建语音消息
            if (isVoice && voiceContent) {
                const aiVoiceMsg = {
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    type: 'voice',
                    content: voiceContent,
                    sender: 'received',
                    duration: voiceDuration,
                    time: new Date().toISOString(),
                    apiCallRound: currentApiCallRound
                };
                AppState.messages[convId].push(aiVoiceMsg);
            }
            
            // 如果检测到地理位置消息，创建地理位置消息
            if (isLocation && locationName) {
                const aiLocationMsg = {
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    type: 'location',
                    content: `${locationName}${locationAddress ? ' - ' + locationAddress : ''} (${locationDistance}米范围)`,
                    locationName: locationName,
                    locationAddress: locationAddress || '',
                    locationDistance: locationDistance,
                    sender: 'received',
                    time: new Date().toISOString(),
                    apiCallRound: currentApiCallRound
                };
                AppState.messages[convId].push(aiLocationMsg);
            }
            
            // 如果还有其他文本内容或表情包，创建普通消息
            if (text && text.trim()) {
                const aiMsg = {
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    type: 'received',
                    content: text,
                    emojiUrl: emojiUrl,
                    isEmoji: emojiUrl ? true : false,
                    time: new Date().toISOString(),
                    apiCallRound: currentApiCallRound
                };
                AppState.messages[convId].push(aiMsg);
            } else if (!isVoice && !isLocation && emojiUrl) {
                // 如果只有表情包，没有文本，创建纯表情包消息
                const aiMsg = {
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    type: 'received',
                    content: '',
                    emojiUrl: emojiUrl,
                    isEmoji: true,
                    time: new Date().toISOString(),
                    apiCallRound: currentApiCallRound
                };
                AppState.messages[convId].push(aiMsg);
            }
            
            // ========== 第七步：更新会话信息和心声消息ID ==========
            const conv = AppState.conversations.find(c => c.id === convId);
            const aiMsg = AppState.messages[convId][AppState.messages[convId].length - 1];
            
            // 更新最后一条心声记录的消息ID（如果心声已经被提前保存）
            MindStateManager.updateMindStateMessageId(convId, aiMsg.id);
            
            // 更新会话信息
            if (conv) {
                // 根据消息类型设置不同的显示文本
                let lastMsgDisplay = text || '[表情包]';
                if (isVoice) {
                    lastMsgDisplay = '[语音]';
                } else if (isLocation) {
                    lastMsgDisplay = '[位置]';
                } else if (emojiUrl && !text) {
                    lastMsgDisplay = '[表情包]';
                }
                conv.lastMsg = lastMsgDisplay;
                conv.time = formatTime(new Date());
                conv.lastMessageTime = aiMsg.time;  // 保存完整时间戳用于排序
            }

            saveToStorage();
            
            // 🔧 修复：确保在当前聊天时立即渲染消息
            const shouldRender = AppState.currentChat && AppState.currentChat.id === convId;
            console.log('💬 appendSingleAssistantMessage - 是否需要渲染:', shouldRender, 'currentChat:', AppState.currentChat?.id, 'convId:', convId);
            
            if (shouldRender) {
                console.log('🎨 立即调用 renderChatMessages()');
                renderChatMessages();
            }
            
            renderConversations();

            // 检查是否需要自动总结
            checkAndAutoSummarize(convId);

            // 触发通知 - 如果用户不在当前聊天中
            triggerNotificationIfLeftChat(convId);
        }

        function appendMultipleAssistantMessages(convId, thinkingData) {
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
                    
                    // 处理语音消息
                    const voiceRegex = /【语音条】([^|【]+)\|?([^【]*)【\/语音条】/;
                    const voiceMatch = content.match(voiceRegex);
                    let isVoice = false;
                    let voiceContent = null;
                    let voiceDuration = 1;
                    
                    if (voiceMatch && voiceMatch[1]) {
                        isVoice = true;
                        voiceContent = voiceMatch[1].trim();
                        if (voiceMatch[2]) {
                            const parsedDuration = parseInt(voiceMatch[2].trim());
                            if (!isNaN(parsedDuration) && parsedDuration > 0) {
                                voiceDuration = parsedDuration;
                            }
                        }
                        content = content.replace(voiceRegex, '').trim();
                    }
                    
                    // 处理地理位置
                    const locationRegex = /【地理位置】([^|【]+)\|?([^|【]*)\|?([^【]*)【\/地理位置】/;
                    const locationMatch = content.match(locationRegex);
                    let isLocation = false;
                    let locationName = null;
                    let locationAddress = null;
                    let locationDistance = 5;
                    
                    if (locationMatch && locationMatch[1]) {
                        isLocation = true;
                        locationName = locationMatch[1].trim();
                        locationAddress = locationMatch[2] ? locationMatch[2].trim() : '';
                        if (locationMatch[3]) {
                            const parsedDistance = parseInt(locationMatch[3].trim());
                            if (!isNaN(parsedDistance) && parsedDistance > 0) {
                                locationDistance = parsedDistance;
                            }
                        }
                        content = content.replace(locationRegex, '').trim();
                    }
                    
                    // 【新架构】心声已在 appendAssistantMessage 中从主API响应自动提取
                    
                    content = cleanAIResponse(content);
                    
                    if (!AppState.messages[convId]) {
                        AppState.messages[convId] = [];
                    }
                    
                    // 创建语音消息
                    if (isVoice && voiceContent) {
                        const aiVoiceMsg = {
                            id: 'msg_' + Date.now() + '_' + Math.random(),
                            type: 'voice',
                            content: voiceContent,
                            sender: 'received',
                            duration: voiceDuration,
                            time: new Date().toISOString(),
                            apiCallRound: currentApiCallRound
                        };
                        AppState.messages[convId].push(aiVoiceMsg);
                    }
                    
                    // 创建地理位置消息
                    if (isLocation && locationName) {
                        const aiLocationMsg = {
                            id: 'msg_' + Date.now() + '_' + Math.random(),
                            type: 'location',
                            content: `${locationName}${locationAddress ? ' - ' + locationAddress : ''} (${locationDistance}米范围)`,
                            locationName: locationName,
                            locationAddress: locationAddress || '',
                            locationDistance: locationDistance,
                            sender: 'received',
                            time: new Date().toISOString(),
                            apiCallRound: currentApiCallRound
                        };
                        AppState.messages[convId].push(aiLocationMsg);
                    }
                    
                    // 创建普通文本或表情包消息
                    if (content || emojiUrl) {
                        const aiMsg = {
                            id: 'msg_' + Date.now() + '_' + Math.random(),
                            type: 'received',
                            content: content,
                            emojiUrl: emojiUrl,
                            isEmoji: emojiUrl ? true : false,
                            time: new Date().toISOString(),
                            apiCallRound: currentApiCallRound
                        };
                        AppState.messages[convId].push(aiMsg);
                    }
                    
                    // 更新会话信息
                    const conv = AppState.conversations.find(c => c.id === convId);
                    if (conv) {
                        conv.lastMsg = content || '[表情包]';
                        conv.time = formatTime(new Date());
                        conv.lastMessageTime = aiMsg.time;
                    }
                    
                    // 更新最后一条心声记录的消息ID（只在最后一条消息时）
                    if (index === messages.length - 1) {
                        MindStateManager.updateMindStateMessageId(convId, aiMsg.id);
                    }
                    
                    saveToStorage();
                    
                    // 🔧 修复：确保在当前聊天时立即渲染每条消息
                    const shouldRender = AppState.currentChat && AppState.currentChat.id === convId;
                    console.log('💬 appendMultipleAssistantMessages [消息', index + 1, '/', messages.length, '] - 是否需要渲染:', shouldRender);
                    
                    if (shouldRender) {
                        console.log('🎨 立即调用 renderChatMessages()');
                        renderChatMessages();
                    }
                    
                    renderConversations();
                    
                    // 只在最后一条消息后触发通知
                    if (index === messages.length - 1) {
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
            // 将换行符转换为<br>标签，避免在消息气泡中出现空行
            return div.innerHTML.replace(/\n/g, '<br>');
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
                    
                    // 【新架构】心声已在 appendSingleAssistantMessage 中从主API响应自动提取
                    
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
                    
                    // 只在最后一条消息后触发通知和更新心声按钮
                    if (index === messages.length - 1) {
                        // 更新心声按钮（如果当前正在查看这个会话）
                        const conv = AppState.conversations.find(c => c.id === convId);
                        if (AppState.currentChat && AppState.currentChat.id === convId && conv) {
                            MindStateManager.updateMindStateButton(conv);
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
                        sendEmojiWithText(emoji);
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
                                // 重新渲染聊天表情库
                                renderEmojiLibrary();
                                renderEmojiGroups('chat');
                                // 如果表情包管理器是打开的，也刷新它
                                if (window.EmojiManager && document.getElementById('emoji-manager-page').style.display !== 'none') {
                                    window.EmojiManager.renderGroups();
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
            // 使用新的全屏表情包管理器
            if (window.EmojiManager) {
                window.EmojiManager.show();
            }
        }

        // 这些函数已迁移到emoji-manager.js中

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
                    // 重新渲染聊天表情库
                    renderEmojiLibrary();
                    renderEmojiGroups('chat');
                    // 如果表情包管理器是打开的，也刷新它
                    if (window.EmojiManager && document.getElementById('emoji-manager-page').style.display !== 'none') {
                        window.EmojiManager.renderGroups();
                    }
                    document.getElementById('group-select-modal').remove();
                    alert('已导入 ' + emojis.length + ' 个表情包');
                });
                list.appendChild(item);
            });
        }

        // ========== 角色设置相关 ==========
        // 直接打开角色设置，不再显示菜单
        function openChatMoreMenu(chat) {
            console.log('openChatMoreMenu called with chat:', chat);
            if (chat) {
                if (window.CharacterSettingsManager && window.CharacterSettingsManager.openCharacterSettings) {
                    window.CharacterSettingsManager.openCharacterSettings(chat);
                } else {
                    console.error('CharacterSettingsManager not available');
                    showToast('角色设置管理器未加载');
                }
            } else {
                console.warn('No chat provided to openChatMoreMenu');
                showToast('未找到角色信息');
            }
        }

        // 角色设置和总结功能已迁移到 CharacterSettingsManager 模块
        // 保留全局函数引用以兼容旧代码
        window.editSummary = function(convId, index) {
            CharacterSettingsManager.editSummary(convId, index);
        };
        
        window.deleteSummary = function(convId, index) {
            CharacterSettingsManager.deleteSummary(convId, index);
        };

        // openCharacterSettings 已迁移到 CharacterSettingsManager 模块
        function openCharacterSettings(chat) {
            CharacterSettingsManager.openCharacterSettings(chat);
        }

        // 以下是旧版本实现，已废弃
        function openCharacterSettingsOld(chat) {
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
            
            // 获取角色应该使用的用户人设
            let currentPersona = null;
            let userNameForChar = chat.userNameForChar || AppState.user.name;
            let userPersonality = AppState.user && AppState.user.personality ? AppState.user.personality : '';
            
            if (window.UserPersonaManager) {
                currentPersona = window.UserPersonaManager.getPersonaForConversation(chat.id);
                if (currentPersona) {
                    userNameForChar = currentPersona.userName;
                    userPersonality = currentPersona.personality || '';
                }
            }
            
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
                        
                        <!-- 备注 -->
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">备注</label>
                            <input type="text" id="char-remark-input" value="${chat.remark || ''}" placeholder="设置备注后将优先显示备注" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;">
                            <div style="font-size:11px;color:#999;margin-top:4px;">设置备注后，好友列表和聊天页面会优先显示备注而非角色名称</div>
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
                        
                        <!-- 用户人设选择 -->
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">选择用户人设</label>
                            <select id="user-persona-select" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;margin-bottom:8px;">
                                <option value="">使用默认人设</option>
                                ${window.AppState.userPersonas && window.AppState.userPersonas.map(p => `
                                    <option value="${p.id}" ${chat.boundPersonaId === p.id ? 'selected' : ''}>
                                        ${p.name}${p.id === window.AppState.defaultPersonaId ? ' (默认)' : ''}
                                    </option>
                                `).join('')}
                            </select>
                            <div style="display:flex;gap:8px;margin-bottom:8px;">
                                <button id="manage-personas-btn" style="flex:1;padding:6px 12px;border:1px solid #4CAF50;border-radius:4px;background:#fff;color:#4CAF50;cursor:pointer;font-size:12px;">管理人设</button>
                                <button id="apply-persona-btn" style="flex:1;padding:6px 12px;border:none;border-radius:4px;background:#4CAF50;color:#fff;cursor:pointer;font-size:12px;">应用人设</button>
                            </div>
                        </div>
                        
                        <!-- 用户人设 -->
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:13px;color:#666;margin-bottom:6px;font-weight:600;">用户人物设定</label>
                            <textarea id="user-desc-input" style="width:100%;min-height:80px;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:12px;font-family:monospace;resize:vertical;">${userPersonality}</textarea>
                            <div style="font-size:11px;color:#999;margin-top:4px;">当前显示的是实际使用的人设内容</div>
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
            
            // 管理人设按钮
            const managePersonasBtn = document.getElementById('manage-personas-btn');
            if (managePersonasBtn) {
                managePersonasBtn.addEventListener('click', function() {
                    if (window.UserPersonaManager) {
                        window.UserPersonaManager.openPersonaManager();
                    }
                });
            }
            
            // 应用人设按钮
            const applyPersonaBtn = document.getElementById('apply-persona-btn');
            if (applyPersonaBtn) {
                applyPersonaBtn.addEventListener('click', function() {
                    const selectedPersonaId = document.getElementById('user-persona-select').value;
                    const conv = AppState.conversations.find(c => c.id === chat.id);
                    
                    if (!conv) return;
                    
                    // 如果选择了特定人设
                    if (selectedPersonaId) {
                        const persona = AppState.userPersonas.find(p => p.id === selectedPersonaId);
                        if (persona) {
                            // 更新用户名称和人设内容
                            document.getElementById('user-name-for-char').value = persona.userName;
                            document.getElementById('user-desc-input').value = persona.personality || '';
                            
                            // 保存绑定关系
                            conv.boundPersonaId = selectedPersonaId;
                            
                            showToast('已应用人设: ' + persona.name);
                        }
                    } else {
                        // 使用默认人设
                        const defaultPersona = AppState.userPersonas.find(p => p.id === AppState.defaultPersonaId);
                        if (defaultPersona) {
                            document.getElementById('user-name-for-char').value = defaultPersona.userName;
                            document.getElementById('user-desc-input').value = defaultPersona.personality || '';
                        }
                        
                        // 移除绑定关系
                        delete conv.boundPersonaId;
                        
                        showToast('已应用默认人设');
                    }
                    
                    saveToStorage();
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

        // saveCharacterSettings 已迁移到 CharacterSettingsManager 模块
        function saveCharacterSettings(charId) {
            CharacterSettingsManager.saveCharacterSettings(charId);
        }

        // 以下是旧版本实现，已废弃
        function saveCharacterSettingsOld(charId) {
            const conv = AppState.conversations.find(c => c.id === charId);
            if (!conv) return;
            
            conv.name = document.getElementById('char-name-input').value || conv.name;
            conv.remark = document.getElementById('char-remark-input').value.trim();
            conv.description = document.getElementById('char-desc-input').value;
            conv.userNameForChar = document.getElementById('user-name-for-char').value || AppState.user.name;
            
            // 同步更新好友列表中的备注
            const friend = AppState.friends.find(f => f.id === charId);
            if (friend) {
                friend.remark = conv.remark;
            }
            
            // 保存绑定的表情包分组（支持多个）
            const egCheckboxes = document.querySelectorAll('.eg-checkbox:checked');
            conv.boundEmojiGroups = Array.from(egCheckboxes).map(cb => cb.value);
            
            // 保存绑定的世界书（支持多个）
            const wbCheckboxes = document.querySelectorAll('.wb-checkbox:checked');
            conv.boundWorldbooks = Array.from(wbCheckboxes).map(cb => cb.value);
            
            // 保存绑定的用户人设
            const selectedPersonaId = document.getElementById('user-persona-select').value;
            if (selectedPersonaId) {
                conv.boundPersonaId = selectedPersonaId;
            } else {
                delete conv.boundPersonaId;
            }
            
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
                // 更新聊天标题（优先显示备注）
                const displayName = conv.remark || conv.name;
                document.getElementById('chat-title').textContent = displayName;
            }
            
            document.getElementById('character-settings-modal').remove();
            showToast('设置已保存');
        }

        // deleteCharacter 已迁移到 CharacterSettingsManager 模块
        function deleteCharacter(charId) {
            CharacterSettingsManager.deleteCharacter(charId);
        }

        // ===== 角色心声系统 (已迁移到mind-state-manager.js) =====
        // 所有心声功能由MindStateManager管理
        
        // ===== 世界书系统 (已迁移到worldbook.js) =====
        // 所有世界书功能由WorldbookManager管理
        
        // 保留这些函数供其他模块调用
        function renderWorldbooks() {
            if (window.WorldbookManager) {
                window.WorldbookManager.render();
            }
        }
        
        function editWorldbook(wbId) {
            if (window.WorldbookManager) {
                window.WorldbookManager.edit(wbId);
            }
        }
        
        function deleteWorldbook(wbId) {
            if (window.WorldbookManager) {
                window.WorldbookManager.delete(wbId);
            }
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

        // 显示加载提示框
        function showLoadingOverlay(message = '正在拉取模型...') {
            // 移除现有的加载提示框
            const existingOverlay = document.getElementById('loading-overlay');
            if (existingOverlay) return; // 如果已存在，不重复创建
            
            const overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay show';
            
            overlay.innerHTML = `
                <div class="loading-modal">
                    <div class="loading-modal-spinner"></div>
                    <div class="loading-modal-text">${message}</div>
                </div>
            `;
            
            document.body.appendChild(overlay);
        }

        // 隐藏加载提示框
        function hideLoadingOverlay() {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.remove();
            }
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
            
            // 🔧 修复：只有当聊天页面打开且该对话正在显示时，才不显示通知
            // 这样可以确保用户离开聊天页面后能看到通知
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
            
            // 🔧 修复：支持多种消息类型的通知显示
            let messagePreview = '';
            if (lastMessage.emojiUrl) {
                messagePreview = '[表情包]';
            } else if (lastMessage.type === 'voice') {
                messagePreview = '[语音消息]';
            } else if (lastMessage.type === 'location') {
                messagePreview = '[位置]';
            } else if (lastMessage.isImage) {
                messagePreview = '[图片]';
            } else if (lastMessage.content) {
                messagePreview = lastMessage.content.substring(0, 50);
            } else {
                console.log('❌ 最后的消息为空');
                return;
            }

            console.log('📝 最后的消息预览:', messagePreview);

            const notificationData = {
                convId: convId,
                name: conv.remark || conv.name || '未命名', // 优先显示备注
                avatar: conv.avatar || '',
                message: messagePreview,
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

        // 打开收藏页面 - 现代化设计
        function openCollectionPage() {
            let page = document.getElementById('collection-page');
            if (!page) {
                page = document.createElement('div');
                page.id = 'collection-page';
                page.className = 'sub-page';
                document.getElementById('app-container').appendChild(page);
            }

            const collectionsHTML = AppState.collections.length === 0 ?
                `<div class="empty-state" style="padding:80px 40px;text-align:center;">
                    <div style="width:120px;height:120px;margin:0 auto 24px;background:linear-gradient(135deg,#f5f5f5 0%,#ffffff 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
                        <svg viewBox="0 0 24 24" style="width:60px;height:60px;stroke:#666;stroke-width:1.5;fill:none;stroke-linecap:round;stroke-linejoin:round;">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div style="font-size:16px;color:#999;font-weight:500;margin-bottom:8px;">暂无收藏</div>
                    <div style="font-size:13px;color:#ccc;">收藏的消息会显示在这里</div>
                </div>` :
                `<div class="collection-list" style="padding:16px;">
                    ${AppState.collections.map((item, index) => `
                        <div class="collection-item" style="background:linear-gradient(135deg,#ffffff 0%,#f8f8f8 100%);border-radius:16px;padding:16px;margin-bottom:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);border:1px solid #e8e8e8;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 20px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'">
                            <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:linear-gradient(180deg,#333 0%,#1a1a1a 100%);"></div>
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                                <div style="flex:1;min-width:0;">
                                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                                        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#333 0%,#1a1a1a 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
                                            ${item.senderName.charAt(0)}
                                        </div>
                                        <div>
                                            <div style="font-size:14px;color:#333;font-weight:600;margin-bottom:2px;">${item.senderName}</div>
                                            <div style="font-size:11px;color:#999;">
                                                <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;stroke-width:2;fill:none;display:inline-block;vertical-align:middle;margin-right:4px;">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <path d="M12 6v6l4 2"></path>
                                                </svg>
                                                ${new Date(item.collectedAt).toLocaleString('zh-CN', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                                            </div>
                                        </div>
                                    </div>
                                    <div style="font-size:14px;color:#555;line-height:1.6;word-break:break-all;padding-left:40px;margin-bottom:8px;">
                                        ${item.messageContent.length > 150 ? item.messageContent.substring(0, 150) + '...' : item.messageContent}
                                    </div>
                                    ${item.originalMessageTime ? `
                                        <div style="font-size:11px;color:#bbb;padding-left:40px;display:flex;align-items:center;gap:4px;">
                                            <svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:currentColor;stroke-width:2;fill:none;">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                            </svg>
                                            原消息时间: ${new Date(item.originalMessageTime).toLocaleString('zh-CN')}
                                        </div>
                                    ` : ''}
                                </div>
                                <button class="delete-collection-btn" onclick="deleteCollectionItem('${item.id}')" style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#666 0%,#444 100%);border:none;color:#fff;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.3s ease;box-shadow:0 2px 8px rgba(0,0,0,0.2);" onmouseover="this.style.transform='scale(1.1) rotate(90deg)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.2)'">
                                    <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;stroke-width:2.5;fill:none;stroke-linecap:round;">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>`;

            page.innerHTML = `
                <div class="sub-nav" style="background:linear-gradient(135deg,#2c2c2c 0%,#1a1a1a 100%);border:none;box-shadow:0 4px 12px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:space-between;position:relative;">
                    <div class="back-btn" id="collection-back-btn" style="color:#fff;background:transparent;border:none;padding:6px 14px;transition:all 0.3s ease;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                        <div class="back-arrow" style="border-left-color:#fff;border-bottom-color:#fff;"></div>
                        <span>返回</span>
                    </div>
                    <div class="sub-title" style="color:#fff;font-weight:600;letter-spacing:0.5px;font-size:17px;position:absolute;left:50%;transform:translateX(-50%);">
                        我的收藏
                    </div>
                    <div style="width:60px;"></div>
                </div>
                <div class="sub-content" style="overflow-y:auto;padding:0;background:linear-gradient(180deg,#f8f8f8 0%,#ffffff 100%);">
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
                    CharacterSettingsManager.summarizeConversation(convId, true); // true 表示自动总结
                }, 500);
            }
        }

        // ========== 初始化主API管理器(线上模式) ==========
        if (window.MainAPIManager) {
            MainAPIManager.init(
                AppState,
                showToast,
                saveToStorage,
                showLoadingOverlay,
                hideLoadingOverlay
            );
        }
        
        // 暴露关键函数到 window 对象，以便其他页面/脚本访问
        window.saveToIndexDB = saveToIndexDB;
        window.getAppState = () => AppState;
        window.AppState = AppState;
        window.getConversationState = getConversationState;
        window.appendAssistantMessage = appendAssistantMessage;
        window.setLoadingStatus = setLoadingStatus;
        window.replaceNamePlaceholders = replaceNamePlaceholders;
        window.extractGenderInfo = extractGenderInfo;
        window.getEmojiInstructions = getEmojiInstructions;
