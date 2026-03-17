        const DEFAULT_APP_BACKGROUND_IMAGE = 'https://img.heliar.top/file/1772604265513_IMG_20260304_104453.jpg';
        const SUMMARY_PROMPT_V2 = '使用角色的第一人称写「精简记忆卡片」。不要引用原句，改写为更有画面感的精简总结。输出按以下分区，每区之间空一行：\n\n【剧情回顾】\n(概况完整覆盖所有剧情节点，<=150字)\n\n【关键事件】\n- ... (1-3条，每条<=12字)\n\n【约定】\n- ... / 暂无\n\n【纪念日】\n- ... / 暂无\n\n【成长】\n(1句，<=30字)\n\n【情感羁绊】\n阶段：...\n补充：...\n\n规则：\n- 仅输出以上栏目，不要输出【封面】、标题、章节或“本次总结”。\n- 输入会包含【章节名】【对话对象】，仅用于理解，不要在输出中直接复写标签。\n- 没有信息写“暂无”。\n- 可适度渲染情绪但不编造事实。\n- 简体中文。';

        // 应用状态
        const AppState = {
            currentTab: 'msg-page',
            currentChat: null,
            friends: [],
            groups: [],
            friendGroups: [
                { id: 'group_default', name: '默认分组', memberIds: [] }
            ], // 好友分组
            groupChatGroups: [
                { id: 'group_default', name: '默认分组', memberIds: [] }
            ], // 群聊分组
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
            // 虚拟滚动状态
            virtualScroll: {
                enabled: true, // 是否启用虚拟滚动
                renderBatchSize: 30, // 每批渲染的消息数量
                bufferSize: 10, // 上下缓冲区大小
                currentStartIndex: 0, // 当前渲染的起始索引
                isLoadingMore: false, // 是否正在加载更多
                scrollThreshold: 200 // 触发加载的滚动阈值（像素）
            },
            // 渲染防抖
            renderDebounce: {
                timer: null,
                delay: 16 // 约60fps
            },
            apiSettings: {
                endpoint: '',
                apiKey: '',
                models: [],
                selectedModel: '',
                aiTimeAware: false,
                offlineTimeAware: false,
                // 主API参数设置
                temperature: 0.8, // 温度，默认0.8
                frequencyPenalty: 0.2, // 频率惩罚，默认0.2
                presencePenalty: 0.1, // 存在惩罚，默认0.1
                topP: 1.0, // Top P，默认1.0
                prompts: [],
                selectedPromptId: '',
                defaultPrompt: 'null',
                summaryEnabled: true, // 是否启用自动总结
                summaryInterval: 50, // 每多少条消息后自动总结
                summaryKeepLatest: 20, // 总结后保留最新的消息数
                // 副API设置
                secondaryEndpoint: '', // 副API端点
                secondaryApiKey: '', // 副API密钥
                secondaryModels: [], // 副API的可用模型列表
                secondarySelectedModel: '', // 副API选定的模型
                // 副API参数设置
                secondaryTemperature: 0.8, // 温度，默认0.8
                secondaryFrequencyPenalty: 0.2, // 频率惩罚，默认0.2
                secondaryPresencePenalty: 0.1, // 存在惩罚，默认0.1
                secondaryTopP: 1.0, // Top P，默认1.0
                // 副API功能提示词
                secondaryPrompts: {
                    translateChinese: '你是一个翻译助手。将用户提供的非中文文本翻译成简体中文。只返回翻译结果，不要有其他内容。',
                    translateEnglish: '你是一个翻译助手。将用户提供的中文文本翻译成英文。只返回翻译结果，不要有其他内容。',
                    summarize: SUMMARY_PROMPT_V2
                },
                // AI图片生成设置
                imageEndpoint: '', // 图片生成API端点（可选，默认使用主API端点）
                imageApiKey: '', // 图片生成API密钥（可选，默认使用主API密钥）
                imageApiType: 'openai' // 图片生成API类型：'openai', 'stability', 'custom'
            },
            user: {
                name: '小喵1号',
                nickname: '', // 用户网名（社交软件虚拟名称）
                avatar: '', // 侧边栏头像
                signature: '这个人很懒',
                bgImage: '',
                coins: 0, // 虚拟币余额
                visitorCount: 0, // 访客总量
                personality: '' // 用户人设
            },
            // 备注：对话级别的用户头像存储在conversation对象的userAvatar字段中
            dynamicFuncs: {
    moments: true,        // 朋友圈
    forum: true,          // 真人联机聊天室
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
            collections: [], // 收藏的消息 [{ id, convId, messageId, messageContent, senderName, senderAvatar, senderType, isGroup, groupSenderName, collectedAt, originalMessageTime }]
            walletHistory: [], // 钱包充值记录
            fontStore: {
                owned: []
            },
            importedCards: [],
            conversationStates: {},  // 运行时状态：{ convId: { isApiCalling, isTyping, isVoiceCallApiCalling } }
            notification: {
                current: null,  // 当前通知数据 { convId, name, avatar, message, time }
                autoHideTimer: null,
                hideDelay: 5000  // 5秒后自动隐藏
            }
        };

        function getEffectiveUserBackgroundImage(bgImage) {
            const normalizedBgImage = typeof bgImage === 'string' ? bgImage.trim() : '';
            return normalizedBgImage || DEFAULT_APP_BACKGROUND_IMAGE;
        }

        function normalizeSingleGreetingText(entity) {
            if (!entity) return '';
            return String(entity.greeting || '').trim();
        }

        function openTextareaExpandEditor(targetTextarea, titleText = '放大编辑') {
            const sourceTextarea = typeof targetTextarea === 'string'
                ? document.getElementById(targetTextarea)
                : targetTextarea;

            if (!sourceTextarea) return;

            const existing = document.getElementById('textarea-expand-editor-overlay');
            if (existing) {
                existing.remove();
            }

            const overlay = document.createElement('div');
            overlay.id = 'textarea-expand-editor-overlay';
            overlay.className = 'textarea-expand-editor-overlay';

            const modal = document.createElement('div');
            modal.className = 'textarea-expand-editor-modal';

            const header = document.createElement('div');
            header.className = 'textarea-expand-editor-header';

            const title = document.createElement('div');
            title.className = 'textarea-expand-editor-title';
            title.textContent = titleText || '放大编辑';

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'textarea-expand-editor-close';
            closeBtn.setAttribute('aria-label', '关闭');
            closeBtn.textContent = '×';

            header.appendChild(title);
            header.appendChild(closeBtn);

            const body = document.createElement('div');
            body.className = 'textarea-expand-editor-body';

            const editor = document.createElement('textarea');
            editor.className = 'textarea-expand-editor-input';
            editor.value = sourceTextarea.value || '';
            editor.placeholder = sourceTextarea.placeholder || '';

            body.appendChild(editor);

            const footer = document.createElement('div');
            footer.className = 'textarea-expand-editor-actions';

            const meta = document.createElement('div');
            meta.className = 'textarea-expand-editor-meta';

            const countText = document.createElement('span');
            countText.className = 'textarea-expand-editor-count';

            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'textarea-expand-editor-clear';
            clearBtn.textContent = '清空';

            meta.appendChild(countText);
            meta.appendChild(clearBtn);

            const actionButtons = document.createElement('div');
            actionButtons.className = 'textarea-expand-editor-action-buttons';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'textarea-expand-editor-cancel';
            cancelBtn.textContent = '取消';

            const confirmBtn = document.createElement('button');
            confirmBtn.type = 'button';
            confirmBtn.className = 'textarea-expand-editor-confirm';
            confirmBtn.textContent = '应用';

            actionButtons.appendChild(cancelBtn);
            actionButtons.appendChild(confirmBtn);

            footer.appendChild(meta);
            footer.appendChild(actionButtons);

            modal.appendChild(header);
            modal.appendChild(body);
            modal.appendChild(footer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const updateCount = function() {
                const count = Array.from(editor.value || '').length;
                countText.textContent = `字数：${count}`;
                clearBtn.disabled = count === 0;
            };

            updateCount();

            const escHandler = function(e) {
                if (e.key === 'Escape') {
                    closeModal(false);
                }
            };

            const closeModal = function(shouldApply) {
                if (shouldApply) {
                    sourceTextarea.value = editor.value;
                    sourceTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                    sourceTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                }

                document.removeEventListener('keydown', escHandler);
                overlay.classList.add('closing');
                setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                    if (shouldApply) {
                        sourceTextarea.focus();
                    }
                }, 180);
            };

            closeBtn.addEventListener('click', function() {
                closeModal(false);
            });
            cancelBtn.addEventListener('click', function() {
                closeModal(false);
            });
            confirmBtn.addEventListener('click', function() {
                closeModal(true);
            });
            clearBtn.addEventListener('click', function() {
                if (!editor.value) return;
                editor.value = '';
                updateCount();
                editor.focus();
            });
            editor.addEventListener('input', updateCount);
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    closeModal(false);
                }
            });
            document.addEventListener('keydown', escHandler);

            requestAnimationFrame(() => {
                overlay.classList.add('show');
                editor.focus();
                editor.setSelectionRange(editor.value.length, editor.value.length);
            });
        }

        window.openTextareaExpandEditor = openTextareaExpandEditor;

        
        
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
                // 强制重新计算视口高度
                if (window.setViewportHeight) {
                    window.setViewportHeight();
                }
                
                await loadFromStorage();

                // 清理已下线的页面缩放遗留状态
                localStorage.removeItem('pageZoomScale');
                document.documentElement.classList.remove('page-scaled');
                document.documentElement.style.removeProperty('--page-scale');
                const appContainer = document.getElementById('app-container');
                if (appContainer) {
                    appContainer.classList.remove('page-scaled');
                }

                initEventListeners();
                initNotificationSystem();
                initApiSettingsUI();
                initWorldbookUI();
                
                // 初始化搜索栏显示状态
                const msgSearchBar = document.getElementById('msg-search-bar');
                const friendSearchBar = document.getElementById('friend-search-bar');
                if (msgSearchBar) msgSearchBar.style.display = 'block';
                if (friendSearchBar) friendSearchBar.style.display = 'none';
                
                // 初始化副API管理器
                SecondaryAPIManager.init(AppState, showToast, saveToStorage, showLoadingOverlay, hideLoadingOverlay);
                SecondaryAPIManager.initEventListeners();
                
                // 初始化心声管理器
                MindStateManager.init(AppState, saveToStorage, showToast, escapeHtml);
                
                // 初始化AI图片生成器
                if (window.AIImageGenerator) {
                    AIImageGenerator.init(AppState, showToast, saveToStorage);
                    console.log('✅ AI图片生成器已初始化');
                }
                
                // 初始化 MiniMax TTS
                if (window.MinimaxTTS) {
                    MinimaxTTS.init(AppState);
                    console.log('✅ MiniMax TTS 已初始化');
                }
                
                renderUI();
                updateDynamicFuncList();
                setupEmojiLibraryObserver();
                
                // 初始化表情包管理器
                if (window.EmojiManager) {
                    window.EmojiManager.init();
                }

                // 初始化真人联机聊天室
                if (window.RealtimeChat && typeof window.RealtimeChat.init === 'function') {
                    window.RealtimeChat.init({
                        getAppState: () => AppState,
                        showToast
                    });
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
            } else {
                // 页面从后台返回时，标记当前聊天中的AI消息为已读
                console.log('页面从后台返回，检查未读消息...');
                if (AppState.currentChat) {
                    const convId = AppState.currentChat.id;
                    const messages = AppState.messages[convId] || [];
                    let hasUnreadAI = false;
                    
                    messages.forEach(msg => {
                        // AI发送的消息（received类型）标记为已读
                        if ((msg.type === 'received' || (msg.type === 'voice' || msg.type === 'location' || msg.type === 'voicecall' || msg.type === 'videocall') && msg.sender === 'received') && msg.readByUser !== true) {
                            msg.readByUser = true;
                            hasUnreadAI = true;
                        }
                    });
                    
                    if (hasUnreadAI) {
                        saveToStorage();
                        // 如果当前在聊天页面，重新渲染以显示已读状态
                        const chatPage = document.getElementById('chat-page');
                        if (chatPage && chatPage.classList.contains('open')) {
                            renderChatMessagesDebounced();
                        }
                    }
                }
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
                            nickname: parsed.user.hasOwnProperty('nickname') ? parsed.user.nickname : (AppState.user.nickname || ''),
                            avatar: parsed.user.hasOwnProperty('avatar') ? parsed.user.avatar : AppState.user.avatar,
                            signature: parsed.user.hasOwnProperty('signature') ? parsed.user.signature : AppState.user.signature,
                            bgImage: parsed.user.hasOwnProperty('bgImage') ? parsed.user.bgImage : AppState.user.bgImage,
                            coins: parsed.user.hasOwnProperty('coins') ? parsed.user.coins : AppState.user.coins,
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
                    if (!AppState.fontStore || typeof AppState.fontStore !== 'object') {
                        AppState.fontStore = { owned: [] };
                    }
                    if (!Array.isArray(AppState.fontStore.owned)) {
                        AppState.fontStore.owned = [];
                    }
                    console.log('加载数据成功，用户背景图:', AppState.user.bgImage);
                } else {
                    console.log('没有保存的数据');
                }

                const legacySummaryPromptA = '你是一个专业的对话总结员。请为下面的对话内容生成一份简洁准确的总结。总结应该：1. 抓住对话的核心内容和主题；2. 保留重要信息和决策；3. 简洁明了，长度适中（200-300字）；4. 用简体中文或原语言撰写。';
                const legacySummaryPromptB = '你是一个专业的对话总结员。请为下面的内容生成一份简洁准确的总结。总结应该：1. 抓住核心内容和主题；2. 保留重要信息；3. 简洁明了，长度适中（200-300字）；4. 用简体中文撰写。';
                const legacySummaryPromptC = '请以角色的第一人称写成“画面式记忆档案”。不要引用或复述原句，改写为更具画面感的精简总结。输出必须包含以下栏目，且标题以【章节名】开头并包含【对话对象】：\n\n标题：\n本章纪实：\n关键事件：\n约定清单：\n纪念日：\n成长轨迹：\n情感羁绊（阶段）：\n\n补充：\n- 章节名从“序章/第一章/第二章...”中取用，以输入提供的【章节名】为准。\n- 没有信息的项写“暂无”。\n- 可以适度渲染情绪与关系走向，但不要编造对话中不存在的客观事实。\n- 简体中文。';
                const legacySummaryPromptD = '使用角色的第一人称写「精简记忆卡片」。不要引用原句，改写为更有画面感的精简总结。输出按以下分区，每区之间空一行：\n\n【封面】\n标题：{章节名}｜与{对话对象}的{2~6字关键词}\n章节：{章节名}\n\n【本次总结】\n(1-2句，<=60字)\n\n【关键事件】\n- ... (1-3条，每条<=12字)\n\n【约定】\n- ... / 暂无\n\n【纪念日】\n- ... / 暂无\n\n【成长】\n(1句，<=30字)\n\n【情感羁绊】\n阶段：...\n一句话：...\n\n规则：\n- 章节名使用输入提供的【章节名】（如序章、第一章、第二章...），对话对象使用【对话对象】。\n- 没有信息写“暂无”。\n- 可适度渲染情绪但不编造事实。\n- 简体中文。';
                if (!AppState.apiSettings) {
                    AppState.apiSettings = {};
                }
                if (!AppState.apiSettings.secondaryPrompts) {
                    AppState.apiSettings.secondaryPrompts = {};
                }
                if (typeof AppState.apiSettings.summaryEnabled !== 'boolean') {
                    AppState.apiSettings.summaryEnabled = true;
                }
                if (!Number.isFinite(AppState.apiSettings.summaryInterval)) {
                    AppState.apiSettings.summaryInterval = 50;
                }
                if (!Number.isFinite(AppState.apiSettings.summaryKeepLatest)) {
                    AppState.apiSettings.summaryKeepLatest = 20;
                }
                const currentSummaryPrompt = AppState.apiSettings.secondaryPrompts.summarize;
                if (!currentSummaryPrompt || currentSummaryPrompt === legacySummaryPromptA || currentSummaryPrompt === legacySummaryPromptB || currentSummaryPrompt === legacySummaryPromptC || currentSummaryPrompt === legacySummaryPromptD) {
                    AppState.apiSettings.secondaryPrompts.summarize = SUMMARY_PROMPT_V2;
                }
                
                // ===== 初始化示例数据 =====
                // 如果friends为空，添加示例好友
                if (!AppState.friends || AppState.friends.length === 0) {
                    AppState.friends = [
                        { id: 'friend_1', name: '客服1号', avatar: 'https://image.uglycat.cc/hoxxrm.jpg', friendGroupId: 'group_default'}
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

                if (!AppState.groupChatGroups || AppState.groupChatGroups.length === 0) {
                    AppState.groupChatGroups = [
                        { id: 'group_default', name: '默认分组', memberIds: [] }
                    ];
                    console.log('已初始化示例群聊分组');
                }

                if (Array.isArray(AppState.groups)) {
                    const hasDefaultGroup = AppState.groupChatGroups.some(g => g.id === 'group_default');
                    const fallbackGroupId = hasDefaultGroup
                        ? 'group_default'
                        : (AppState.groupChatGroups[0] ? AppState.groupChatGroups[0].id : 'group_default');
                    AppState.groups.forEach(group => {
                        if (!group.groupChatGroupId || !AppState.groupChatGroups.some(g => g.id === group.groupChatGroupId)) {
                            group.groupChatGroupId = fallbackGroupId;
                        }
                    });
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
                
                // 删除不可序列化的属性
                delete stateToDump.conversationStates;
                delete stateToDump._debouncedRender;
                delete stateToDump.eventHandlersInitialized;
                
                // 删除其他可能的函数属性
                Object.keys(stateToDump).forEach(key => {
                    if (typeof stateToDump[key] === 'function') {
                        delete stateToDump[key];
                    }
                });
                
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
                            nickname: AppState.user.nickname,
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
            document.getElementById('user-info').addEventListener('click', function(e) {
                e.stopPropagation();
                document.getElementById('side-menu').classList.add('open');
                document.getElementById('mask').classList.add('show');
            });

            // 点击遮罩层关闭侧边栏
            const mask = document.getElementById('mask');
            if (mask) {
                mask.addEventListener('click', function(e) {
                    e.stopPropagation();
                    closeSideMenu();
                });
            }

            // 点击侧边栏内容区域不关闭，但允许内部元素正常工作
            document.getElementById('side-menu').addEventListener('click', function(e) {
                // 只阻止事件冒泡，不阻止内部元素的事件处理
                e.stopPropagation();
            });

            // 点击页面其他区域关闭侧边栏 - 在捕获阶段处理，阻止事件传播到下层元素
            document.addEventListener('click', function(e) {
                const sideMenu = document.getElementById('side-menu');
                const userInfo = document.getElementById('user-info');

                if (sideMenu && sideMenu.classList.contains('open')) {
                    const isClickInsideSideMenu = sideMenu.contains(e.target);
                    const isClickUserInfo = userInfo && userInfo.contains(e.target);

                    // 只有当点击的是页面其他区域时才处理
                    if (!isClickInsideSideMenu && !isClickUserInfo) {
                        // 在捕获阶段阻止事件传播，防止点击穿透到下层元素
                        e.preventDefault();
                        e.stopPropagation();

                        // 延迟执行关闭
                        setTimeout(function() {
                            closeSideMenu();
                        }, 50);
                    }
                }
            }, { capture: true });

            // 添加按钮（iOS 普通浏览器 touchend 兜底，避免 click 被吞）
            const addBtn = document.getElementById('add-btn');
            if (addBtn) {
                const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
                let addBtnTapLockUntil = 0;

                const handleAddBtnTap = function(e) {
                    if (e) {
                        e.stopPropagation();
                    }
                    const now = Date.now();
                    if (now < addBtnTapLockUntil) {
                        return;
                    }
                    addBtnTapLockUntil = now + 320;
                    toggleAddPopup();
                };

                addBtn.addEventListener('click', handleAddBtnTap);

                if (isIOSDevice) {
                    addBtn.style.touchAction = 'manipulation';
                    addBtn.addEventListener('touchend', function(e) {
                        e.preventDefault();
                        handleAddBtnTap(e);
                    }, { passive: false });
                }
            }

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
                searchInput.addEventListener('focus', function() {
                    this.placeholder = '';
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
                friendSearchInput.addEventListener('focus', function() {
                    this.placeholder = '';
                });
            }

            // 底部标签栏 - 移动端性能优化
            function initTabBarEvents() {
                // 先移除现有的事件监听器，避免重复绑定
                document.querySelectorAll('.tab-item').forEach(function(tab) {
                    tab.replaceWith(tab.cloneNode(true));
                });

                document.querySelectorAll('.tab-item').forEach(function(tab) {
                    let lastClickTime = 0;
                    let touchStartTime = 0;
                    let clickTimeout = null;
                    
                    // 点击事件处理
                    const handleTabClick = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const now = Date.now();
                        // 优化防抖间隔，平衡响应性和防误触
                        if (now - lastClickTime < 120) {
                            console.log('🚫 点击间隔太短，被防抖阻止');
                            return;
                        }
                        lastClickTime = now;
                        
                        // 清除之前的超时
                        if (clickTimeout) {
                            clearTimeout(clickTimeout);
                            clickTimeout = null;
                        }
                        
                        try {
                            const tabId = this.dataset.tab;
                            if (tabId) {
                                console.log('🔄 切换到标签:', tabId);
                                switchTabWithRetry(tabId);
                                
                                // 添加点击反馈
                                this.style.transform = 'scale(0.95)';
                                setTimeout(() => {
                                    this.style.transform = '';
                                }, 100);
                            }
                        } catch (error) {
                            console.error('标签切换错误:', error);
                        }
                    };
                    
                    // 绑定点击事件
                    tab.addEventListener('click', handleTabClick, { passive: false });
                    
                    // iOS Safari 特殊处理 - 触摸事件
                    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                        const handleTouchEnd = function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const now = Date.now();
                            if (now - lastClickTime < 120) {
                                return;
                            }
                            lastClickTime = now;
                            
                            try {
                                const tabId = this.dataset.tab;
                                if (tabId) {
                                    console.log('🔄 切换到标签:', tabId);
                                    switchTabWithRetry(tabId);
                                    
                                    // 添加点击反馈
                                    this.style.transform = 'scale(0.95)';
                                    setTimeout(() => {
                                        this.style.transform = '';
                                    }, 100);
                                }
                            } catch (error) {
                                console.error('iOS标签切换错误:', error);
                            }
                        };
                        
                        tab.addEventListener('touchstart', function(e) {
                            touchStartTime = Date.now();
                        }, { passive: true });
                        
                        tab.addEventListener('touchend', handleTouchEnd, { passive: false });
                    }
                });
                
                console.log('✅ 底部标签栏事件初始化完成');
            }

            // 切换标签页的重试机制
            function switchTabWithRetry(tabId, maxRetries = 3) {
                let retryCount = 0;
                
                function attemptSwitch() {
                    try {
                        // 智能判断：只有当DOM状态和 AppState 都相同时才阻止切换
                        const currentPage = document.querySelector('.main-content.active');
                        const currentActiveTab = document.querySelector('.tab-item.active');
                        const isDOMSameTab = currentPage && currentPage.id === tabId;
                        const isAppStateSameTab = AppState.currentTab === tabId;
                        
                        if (isDOMSameTab && isAppStateSameTab && retryCount === 0) {
                            console.log('🔄 页面和状态都已经是相同标签，无需切换:', tabId);
                            return;
                        }
                        
                        switchTab(tabId);
                        
                        // 验证切换是否成功
                        setTimeout(() => {
                            const verifyCurrentPage = document.querySelector('.main-content.active');
                            const verifyCurrentActiveTab = document.querySelector('.tab-item.active');
                            
                            if (!verifyCurrentPage || !verifyCurrentActiveTab || 
                                !verifyCurrentPage.id || !verifyCurrentActiveTab.dataset.tab ||
                                verifyCurrentPage.id !== tabId || verifyCurrentActiveTab.dataset.tab !== tabId) {
                                
                                retryCount++;
                                console.log(`⚠️ 切换验证失败，重试 ${retryCount}/${maxRetries}`);
                                
                                if (retryCount < maxRetries) {
                                    setTimeout(attemptSwitch, 200);
                                } else {
                                    console.error('🚫 标签切换失败，达到最大重试次数');
                                }
                            } else {
                                console.log('✅ 标签切换验证成功');
                            }
                        }, 100);
                        
                    } catch (error) {
                        console.error('切换尝试失败:', error);
                        retryCount++;
                        if (retryCount < maxRetries) {
                            setTimeout(attemptSwitch, 200);
                        }
                    }
                }
                
                attemptSwitch();
            }

            // 初始化底部标签栏事件
            initTabBarEvents();
            
            // 添加页面状态重新绑定功能
            window.rebindTabBarEvents = function() {
                console.log('🔄 重新绑定底部标签栏事件...');
                initTabBarEvents();
            };
            
            // 监听页面显示事件（PWA模式下可能需要）
            if ('visibilityState' in document) {
                document.addEventListener('visibilitychange', function() {
                    if (document.visibilityState === 'visible') {
                        // 页面重新可见时重新绑定事件
                        setTimeout(() => {
                            window.rebindTabBarEvents();
                        }, 100);
                    }
                });
            }

            // 强制刷新标签状态
            window.forceRefreshTabState = function() {
                console.log('🔄 强制刷新标签状态...');
                const currentTab = AppState.currentTab;
                if (currentTab) {
                    // 先移除所有active状态
                    document.querySelectorAll('.tab-item').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    document.querySelectorAll('.main-content').forEach(page => {
                        page.classList.remove('active');
                    });
                    
                    // 重新激活当前标签
                    const activeTab = document.querySelector(`.tab-item[data-tab="${currentTab}"]`);
                    const activePage = document.getElementById(currentTab);
                    if (activeTab) activeTab.classList.add('active');
                    if (activePage) activePage.classList.add('active');

                    const topNav = document.getElementById('top-nav');
                    const appContainer = document.getElementById('app-container');
                    const shouldHideTopNav = currentTab === 'dynamic-page' || currentTab === 'moments-page' || currentTab === 'channel-page';

                    if (topNav) {
                        topNav.style.display = shouldHideTopNav ? 'none' : 'flex';
                    }

                    if (appContainer) {
                        appContainer.classList.toggle('top-nav-hidden', shouldHideTopNav);
                    }

                    if (window.MessageBackgroundManager && typeof window.MessageBackgroundManager.setPageTypeByTab === 'function') {
                        window.MessageBackgroundManager.setPageTypeByTab(currentTab);
                    }
                }
            };

            // 状态同步监听器
            function setupStateSync() {
                // 监听页面变化，同步更新 AppState
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.target.classList && mutation.target.classList.contains('main-content')) {
                            const activePage = document.querySelector('.main-content.active');
                            if (activePage && activePage.id) {
                                if (AppState.currentTab !== activePage.id) {
                                    console.log('🔄 检测到页面状态变化，同步更新 AppState:', activePage.id);
                                    AppState.currentTab = activePage.id;
                                }
                            }
                        }
                    });
                });

                // 监听所有 main-content 元素
                document.querySelectorAll('.main-content').forEach(function(page) {
                    observer.observe(page, {
                        attributes: true,
                        attributeFilter: ['class'],
                        childList: false,
                        subtree: false
                    });
                });

                console.log('✅ 状态同步监听器已设置');
            }

            // 初始化状态同步
            setupStateSync();

            // 好友分组折叠
            document.querySelectorAll('.group-header').forEach(function(header) {
                header.addEventListener('click', function() {
                    const group = this.dataset.group;
                    const list = document.querySelector(`.friend-list[data-group="${group}"]`);
                    this.classList.toggle('collapsed');
                    list.classList.toggle('show');
                });
            });

            // 好友页面分组管理
            const friendPage = document.getElementById('friend-page');
            if (friendPage) {
                friendPage.querySelectorAll('.group-header .group-edit').forEach(function(btn) {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        const header = this.closest('.group-header');
                        if (!header) return;
                        if (header.dataset.group === 'common') {
                            setFriendManageMode(!getFriendManageMode());
                            renderFriends();
                        } else if (header.dataset.group === 'groups') {
                            setGroupManageMode(!getGroupManageMode());
                            renderGroups();
                        }
                    });
                });

                updateFriendManageButton();
                updateGroupManageButton();
            }

            // 动态页面功能项
            document.querySelectorAll('.func-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    const pageId = this.dataset.page;
                    if (pageId) {
                        // 朋友圈页面现在是 main-content，使用 switchTab
                        if (pageId === 'moments-page') {
                            switchTab(pageId);
                        } else {
                            openSubPage(pageId);
                        }
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

            // 顶部菜单按钮
            document.querySelectorAll('.left-menu-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    const func = this.dataset.func;
                    handleMenuClick(func);
                });
            });

            // 横向设置菜单项
            document.querySelectorAll('.horizontal-menu-item').forEach(function(item) {
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

            initAddFriendCardCollapse();

            const friendDescExpandBtn = document.getElementById('friend-desc-expand-btn');
            if (friendDescExpandBtn) {
                friendDescExpandBtn.addEventListener('click', function() {
                    openTextareaExpandEditor('friend-desc-input', '编辑人设描述');
                });
            }

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

            // 聊天页面 - 角色设置按钮（三个点）
            // 现在使用HTML内联事件，不需要在这里绑定
            // 按钮直接调用 CharacterSettingsManager.openCharacterSettings()

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
                    const quoteBar = document.getElementById('quote-message-bar');
                    const chatInput = document.getElementById('chat-input');
                    if (quoteContainer) quoteContainer.style.display = 'none';
                    if (quoteBar) quoteBar.style.display = '';
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
            const offlineTimeToggle = document.getElementById('offline-time-aware');
            if (offlineTimeToggle) {
                offlineTimeToggle.addEventListener('change', function() {
                    AppState.apiSettings.offlineTimeAware = this.checked;
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

            // 注意：聊天区头像双击事件已在 renderChatMessages() 函数中通过事件委托处理
            // 不在此处重复绑定，避免多次触发API调用

            // 双击头像处理函数 - 触发AI回复，心声会自动从主API响应中提取
            window.handleDoubleClickAvatar = async function() {
                if (!AppState.currentChat) {
                    showToast('请先打开或创建一个聊天会话');
                    return;
                }

                // 触发主API调用（AI会在回复末尾返回心声数据）
                console.log('========== 🎯 【新架构】双击头像：触发主API调用，心声将在响应中自动提取 ==========');
                const apiResult = MainAPIManager.callApiWithConversation();
                
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

            const btnVideo = document.getElementById('btn-videocall');
            if (btnVideo) btnVideo.addEventListener('click', function() { showToast('视频通话功能尚未实现'); });

            // 注意：btn-offline 由 chat-qq-toolbar.js 处理

            const btnTakeout = document.getElementById('btn-takeout');
            if (btnTakeout) btnTakeout.addEventListener('click', function() { showToast('点外卖功能尚未实现'); });

            const btnTransfer = document.getElementById('btn-transfer');
            if (btnTransfer) btnTransfer.addEventListener('click', function() { showToast('转账功能尚未实现'); });

            const btnListen = document.getElementById('btn-listen');
            if (btnListen) btnListen.addEventListener('click', function() { showToast('一起听功能尚未实现'); });

            // 注意：btn-phone 由 iphone-simulator.js 处理

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

            // 角色设置按钮（三个点）
            const chatMoreBtn = document.getElementById('chat-more-btn');
            if (chatMoreBtn) {
                chatMoreBtn.addEventListener('click', function(e) {
                    if (!AppState.currentChat) {
                        showToast('请先选择一个角色');
                        return;
                    }
                    
                    if (!window.CharacterSettingsManager) {
                        showToast('角色设置模块未加载');
                        return;
                    }
                    
                    try {
                        CharacterSettingsManager.openCharacterSettings(AppState.currentChat);
                    } catch (error) {
                        console.error('Error opening character settings:', error);
                        showToast('打开角色设置失败：' + error.message);
                    }
                });
                
                // 移动端触摸事件支持
                let touchStartTime = 0;
                let touchMoved = false;
                
                chatMoreBtn.addEventListener('touchstart', function(e) {
                    touchStartTime = Date.now();
                    touchMoved = false;
                }, { passive: true });
                
                chatMoreBtn.addEventListener('touchmove', function(e) {
                    touchMoved = true;
                }, { passive: true });
                
                chatMoreBtn.addEventListener('touchend', function(e) {
                    const touchDuration = Date.now() - touchStartTime;
                    
                    // 如果触摸移动了或者时间太长，不处理
                    if (touchMoved || touchDuration > 500) {
                        return;
                    }
                    
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (!AppState.currentChat) {
                        showToast('请先选择一个角色');
                        return;
                    }
                    
                    if (!window.CharacterSettingsManager) {
                        showToast('角色设置模块未加载');
                        return;
                    }
                    
                    try {
                        CharacterSettingsManager.openCharacterSettings(AppState.currentChat);
                    } catch (error) {
                        console.error('Error opening character settings:', error);
                        showToast('打开角色设置失败：' + error.message);
                    }
                }, { passive: false });
            }

            // 表情包管理按钮
            const btnEmojiManager = document.getElementById('emoji-manager-btn');
            if (btnEmojiManager) {
                btnEmojiManager.addEventListener('click', function() {
                    openEmojiGroupManager();
                });
            }

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
                // 初始状态：输入框为text类型，按钮显示"隐藏"
                apiKeyToggle.textContent = '隐藏';
                apiKeyToggle.addEventListener('click', function() {
                    if (apiKeyInput.type === 'text') {
                        apiKeyInput.type = 'password';
                        this.textContent = '显示';
                    } else {
                        apiKeyInput.type = 'text';
                        this.textContent = '隐藏';
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
            document.getElementById('card-signature').textContent = user.signature || '这个人很懒';
            
            const cardAvatar = document.getElementById('card-avatar');
            if (user.avatar) {
                cardAvatar.innerHTML = `<img src="${user.avatar}" alt="">`;
            } else {
                cardAvatar.textContent = user.name.charAt(0);
            }

            const cardBg = document.getElementById('card-bg');
            const sideMenu = document.getElementById('side-menu');
            if (user.bgImage) {
                cardBg.style.backgroundImage = `url(${user.bgImage})`;
                // 让侧边栏整体继承背景图
                sideMenu.style.backgroundImage = `url(${user.bgImage})`;
                sideMenu.style.backgroundSize = 'cover';
                sideMenu.style.backgroundPosition = 'center';
                sideMenu.style.backgroundAttachment = 'fixed';
            } else {
                // 恢复默认白色背景
                sideMenu.style.backgroundImage = 'none';
                sideMenu.style.backgroundColor = '#ffffff';
            }

            // 编辑页面
            document.getElementById('card-edit-preview-name').textContent = user.name;
            document.getElementById('card-edit-preview-sig').textContent = user.signature || '这个人很懒';
            
            const previewAvatar = document.getElementById('card-edit-preview-avatar');
            if (user.avatar) {
                previewAvatar.innerHTML = `<img src="${user.avatar}" alt="">`;
            } else {
                previewAvatar.textContent = user.name.charAt(0);
            }

            const editPreview = document.getElementById('card-edit-preview');
            if (editPreview) {
                const effectiveEditBgImage = getEffectiveUserBackgroundImage(user.bgImage);
                editPreview.style.backgroundImage = `url('${effectiveEditBgImage}')`;
                editPreview.style.backgroundSize = 'cover';
                editPreview.style.backgroundPosition = 'center';
                editPreview.style.backgroundRepeat = 'no-repeat';
            }

            const editAvatarSmall = document.getElementById('edit-avatar-small');
            if (user.avatar) {
                editAvatarSmall.innerHTML = `<img src="${user.avatar}" alt="">`;
            } else {
                editAvatarSmall.style.backgroundColor = '#e8e8e8';
            }

            document.getElementById('edit-name-value').textContent = user.name;
            document.getElementById('edit-signature-value').textContent = user.signature || '这个人很懒';
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


        // 渲染会话列表 - 移动端性能优化版
        function getConversationDisplayName(conv) {
            if (!conv) return '未命名';
            const remark = (conv.remark || '').trim();
            const nickname = (conv.charNickname || '').trim();
            const realName = (conv.name || '').trim();
            return remark || nickname || realName || '未命名';
        }

        function getFriendDisplayName(friend) {
            if (!friend) return '未命名';
            const remark = (friend.remark || '').trim();
            const nickname = (friend.charNickname || '').trim();
            const realName = (friend.name || '').trim();
            return remark || nickname || realName || '未命名';
        }

        // 网名变更提示（显示在聊天区中间，类似撤回提示）
        function addNicknameChangeNotice(convId, modifierRole, targetRole, oldNickname, newNickname, persist = true) {
            if (!convId) return false;

            const conv = AppState.conversations && AppState.conversations.find(c => c.id === convId);
            if (!conv) return false;

            const oldName = String(oldNickname || '').trim();
            const newName = String(newNickname || '').trim();
            if (oldName === newName) return false;

            const newText = newName ? `“${newName}”` : '清空';
            const userRealName = String(conv.userNameForChar || (AppState.user && AppState.user.name) || '用户').trim();
            const roleRealName = String(conv.name || '角色').trim();

            let noticeContent = '';
            if (modifierRole === 'user' && targetRole === 'user') {
                // 用户改自己的网名
                noticeContent = `${userRealName}将网名修改为了${newText}`;
            } else if (modifierRole === 'user' && targetRole === 'assistant') {
                // 用户改角色的网名
                noticeContent = `${userRealName}登录你的账号并将你的网名修改为${newText}`;
            } else if (modifierRole === 'assistant' && targetRole === 'assistant') {
                // 角色改自己的网名
                noticeContent = `${roleRealName}将网名修改为了${newText}`;
            } else {
                // 其他兜底场景
                const modifierText = modifierRole === 'assistant' ? '角色' : (modifierRole === 'user' ? '用户' : '系统');
                const targetText = targetRole === 'assistant' ? '角色' : '用户';
                noticeContent = `${modifierText}将${targetText}网名修改为${newText}`;
            }

            if (!AppState.messages[convId]) {
                AppState.messages[convId] = [];
            }

            AppState.messages[convId].push({
                id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                type: 'nickname_change',
                sender: 'system',
                modifierRole: modifierRole,
                targetRole: targetRole,
                oldNickname: oldName,
                newNickname: newName,
                content: noticeContent,
                time: new Date().toISOString(),
                readByUser: !!(AppState.currentChat && AppState.currentChat.id === convId)
            });

            if (persist) {
                saveToStorage();
                if (AppState.currentChat && AppState.currentChat.id === convId) {
                    renderChatMessagesDebounced();
                }
                renderConversations();
            }

            return true;
        }

        function renderConversations() {
            // 防抖：防止频繁渲染
            if (renderConversations._timer) {
                clearTimeout(renderConversations._timer);
            }
            renderConversations._timer = setTimeout(() => {
                _renderConversationsImpl();
            }, 16); // 约60fps
        }

        // 实际渲染会话列表的实现
        function _renderConversationsImpl() {
            const msgList = document.getElementById('msg-list');
            const emptyState = document.getElementById('msg-empty');
            
            if (!msgList) return;

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
                if (emptyState) emptyState.style.display = 'flex';
                // 清除旧的会话项
                const oldItems = msgList.querySelectorAll('.msg-item');
                oldItems.forEach(item => item.remove());
                return;
            }
            
            if (emptyState) emptyState.style.display = 'none';
            
            // 使用 DocumentFragment 批量插入
            const fragment = document.createDocumentFragment();
            
            // 按最后消息时间排序（最新的在前）
            filteredConversations.sort(function(a, b) {
                const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
                const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
                return bTime - aTime;
            });

            // 清除旧的会话项
            const oldItems = msgList.querySelectorAll('.msg-item');
            oldItems.forEach(item => item.remove());
            
            // 限制最大渲染数量，移动端只渲染前50条
            const maxItems = Math.min(filteredConversations.length, 50);
            
            for (let i = 0; i < maxItems; i++) {
                const conv = filteredConversations[i];
                const item = document.createElement('div');
                item.className = 'msg-item clickable-optimized';
                item.dataset.id = conv.id;
                item.dataset.type = conv.type;
                
                const avatarContent = conv.avatar
                    ? `<img src="${conv.avatar}" alt="">`
                    : conv.name.charAt(0);
                
                // 显示优先级：备注 > 网名 > 真名
                const displayName = getConversationDisplayName(conv);
                
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
                            <div class="msg-desc">${escapeHtml(conv.lastMsg || '')}</div>
                        </div>
                    </div>
                `;
                
                // 使用节流优化点击事件
                let lastClickTime = 0;
                item.addEventListener('click', function(e) {
                    const now = Date.now();
                    if (now - lastClickTime < 200) return;
                    lastClickTime = now;
                    openChat(conv);
                }, { passive: true });
                
                fragment.appendChild(item);
            }
            
            // 批量插入DOM
            msgList.appendChild(fragment);
        }

        function getFriendManageMode() {
            const friendPage = document.getElementById('friend-page');
            return !!(friendPage && friendPage.classList.contains('friend-manage-mode'));
        }

        function setFriendManageMode(active) {
            const friendPage = document.getElementById('friend-page');
            if (!friendPage) return;
            friendPage.classList.toggle('friend-manage-mode', !!active);
            if (active) {
                if (!AppState.groupCollapsedStates) {
                    AppState.groupCollapsedStates = {};
                }
                if (Array.isArray(AppState.friendGroups)) {
                    AppState.friendGroups.forEach(group => {
                        AppState.groupCollapsedStates[group.id] = true;
                    });
                }
            }
            updateFriendManageButton();
        }

        function updateFriendManageButton() {
            const btn = document.querySelector('#friend-page .group-header[data-group="common"] .group-edit');
            if (btn) {
                btn.textContent = getFriendManageMode() ? '完成' : '管理';
            }
        }

        function getGroupManageMode() {
            const friendPage = document.getElementById('friend-page');
            return !!(friendPage && friendPage.classList.contains('group-manage-mode'));
        }

        function setGroupManageMode(active) {
            const friendPage = document.getElementById('friend-page');
            if (!friendPage) return;
            friendPage.classList.toggle('group-manage-mode', !!active);
            if (active) {
                if (!AppState.groupChatCollapsedStates) {
                    AppState.groupChatCollapsedStates = {};
                }
                if (Array.isArray(AppState.groupChatGroups)) {
                    AppState.groupChatGroups.forEach(group => {
                        AppState.groupChatCollapsedStates[group.id] = true;
                    });
                }
            }
            updateGroupManageButton();
        }

        function updateGroupManageButton() {
            const btn = document.querySelector('#friend-page .group-header[data-group="groups"] .group-edit');
            if (btn) {
                btn.textContent = getGroupManageMode() ? '完成' : '管理';
            }
        }

        let friendDragPayload = null;
        let groupChatDragPayload = null;

        function ensureFriendSortIndex() {
            if (!Array.isArray(AppState.friends)) return;
            const groups = {};
            AppState.friends.forEach(friend => {
                const groupId = friend.friendGroupId || 'group_default';
                if (!groups[groupId]) groups[groupId] = [];
                groups[groupId].push(friend);
            });

            Object.keys(groups).forEach(groupId => {
                const groupFriends = groups[groupId];
                const hasMissing = groupFriends.some(friend => !Number.isFinite(friend.friendSortIndex));
                if (hasMissing) {
                    groupFriends.forEach((friend, index) => {
                        friend.friendSortIndex = index;
                    });
                } else {
                    groupFriends.sort((a, b) => a.friendSortIndex - b.friendSortIndex);
                    groupFriends.forEach((friend, index) => {
                        friend.friendSortIndex = index;
                    });
                }
            });
        }

        function getSortedFriendsInGroup(groupId) {
            return AppState.friends
                .filter(friend => (friend.friendGroupId || 'group_default') === groupId)
                .sort((a, b) => {
                    const aIndex = Number.isFinite(a.friendSortIndex) ? a.friendSortIndex : 0;
                    const bIndex = Number.isFinite(b.friendSortIndex) ? b.friendSortIndex : 0;
                    return aIndex - bIndex;
                });
        }

        function getNextFriendSortIndex(groupId) {
            let maxIndex = -1;
            AppState.friends.forEach(friend => {
                if ((friend.friendGroupId || 'group_default') !== groupId) return;
                if (Number.isFinite(friend.friendSortIndex)) {
                    maxIndex = Math.max(maxIndex, friend.friendSortIndex);
                }
            });
            return maxIndex + 1;
        }

        function applyFriendOrder(groupId, orderedFriends) {
            orderedFriends.forEach((friend, index) => {
                friend.friendGroupId = groupId;
                friend.friendSortIndex = index;
            });
        }

        function reorderFriendInGroup(friendId, targetFriendId, groupId) {
            const ordered = getSortedFriendsInGroup(groupId);
            const fromIndex = ordered.findIndex(friend => friend.id === friendId);
            const toIndex = ordered.findIndex(friend => friend.id === targetFriendId);
            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
            const moved = ordered.splice(fromIndex, 1)[0];
            const insertIndex = fromIndex < toIndex ? Math.max(toIndex - 1, 0) : toIndex;
            ordered.splice(insertIndex, 0, moved);
            applyFriendOrder(groupId, ordered);
        }

        function ensureGroupChatSortIndex() {
            if (!Array.isArray(AppState.groups)) return;
            const groups = {};
            AppState.groups.forEach(groupChat => {
                const groupId = groupChat.groupChatGroupId || 'group_default';
                if (!groups[groupId]) groups[groupId] = [];
                groups[groupId].push(groupChat);
            });

            Object.keys(groups).forEach(groupId => {
                const groupChats = groups[groupId];
                const hasMissing = groupChats.some(groupChat => !Number.isFinite(groupChat.groupSortIndex));
                if (hasMissing) {
                    groupChats.forEach((groupChat, index) => {
                        groupChat.groupSortIndex = index;
                    });
                } else {
                    groupChats.sort((a, b) => a.groupSortIndex - b.groupSortIndex);
                    groupChats.forEach((groupChat, index) => {
                        groupChat.groupSortIndex = index;
                    });
                }
            });
        }

        function getSortedGroupChats(groupId) {
            return AppState.groups
                .filter(groupChat => (groupChat.groupChatGroupId || 'group_default') === groupId)
                .sort((a, b) => {
                    const aIndex = Number.isFinite(a.groupSortIndex) ? a.groupSortIndex : 0;
                    const bIndex = Number.isFinite(b.groupSortIndex) ? b.groupSortIndex : 0;
                    return aIndex - bIndex;
                });
        }

        function getNextGroupChatSortIndex(groupId) {
            let maxIndex = -1;
            AppState.groups.forEach(groupChat => {
                if ((groupChat.groupChatGroupId || 'group_default') !== groupId) return;
                if (Number.isFinite(groupChat.groupSortIndex)) {
                    maxIndex = Math.max(maxIndex, groupChat.groupSortIndex);
                }
            });
            return maxIndex + 1;
        }

        function applyGroupChatOrder(groupId, orderedGroups) {
            orderedGroups.forEach((groupChat, index) => {
                groupChat.groupChatGroupId = groupId;
                groupChat.groupSortIndex = index;
            });
        }

        function reorderGroupChatInGroup(groupChatId, targetGroupChatId, groupChatGroupId) {
            const ordered = getSortedGroupChats(groupChatGroupId);
            const fromIndex = ordered.findIndex(groupChat => groupChat.id === groupChatId);
            const toIndex = ordered.findIndex(groupChat => groupChat.id === targetGroupChatId);
            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
            const moved = ordered.splice(fromIndex, 1)[0];
            const insertIndex = fromIndex < toIndex ? Math.max(toIndex - 1, 0) : toIndex;
            ordered.splice(insertIndex, 0, moved);
            applyGroupChatOrder(groupChatGroupId, ordered);
        }

        function parseDragPayload(event) {
            if (!event || !event.dataTransfer) return null;
            const text = event.dataTransfer.getData('text/plain');
            if (!text) return null;
            try {
                return JSON.parse(text);
            } catch (e) {
                return null;
            }
        }

        function bindLongPressDrag(handle, target) {
            if (!handle || !target) return;
            let pressTimer = null;
            const clearPress = function() {
                if (pressTimer) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                }
                target.classList.remove('drag-arming');
            };

            handle.addEventListener('touchstart', function() {
                clearPress();
                pressTimer = setTimeout(() => {
                    target.classList.add('drag-arming');
                    if (navigator.vibrate) {
                        navigator.vibrate(8);
                    }
                }, 160);
            }, { passive: true });

            handle.addEventListener('touchend', clearPress);
            handle.addEventListener('touchcancel', clearPress);
            handle.addEventListener('dragend', clearPress);
            handle.addEventListener('dragstart', function() {
                target.classList.add('drag-arming');
            });
        }

        // 渲染好友列表 - 移动端性能优化版
        function renderFriends() {
            // 防抖：防止频繁渲染
            if (renderFriends._timer) {
                clearTimeout(renderFriends._timer);
            }
            renderFriends._timer = setTimeout(() => {
                _renderFriendsImpl();
            }, 16); // 约60fps
        }

        // 实际渲染好友列表的实现
        function _renderFriendsImpl() {
            const friendList = document.querySelector('.friend-list[data-group="common"]');
            const count = document.querySelector('.group-header[data-group="common"] .group-count');
            const isManageMode = getFriendManageMode();
            updateFriendManageButton();
            
            if (!friendList) return;

            if (!Array.isArray(AppState.friendGroups)) {
                AppState.friendGroups = [];
            }
            if (!AppState.friendGroups.some(group => group.id === 'group_default')) {
                AppState.friendGroups.unshift({ id: 'group_default', name: '默认分组', memberIds: [] });
            }

            ensureFriendSortIndex();
            
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
            
            if (AppState.friends.length === 0 && !isManageMode) {
                friendList.innerHTML = `
                    <div class="empty-state" style="padding: 30px 20px;">
                        <div class="empty-text">暂无好友</div>
                    </div>
                `;
                return;
            }
            
            friendList.innerHTML = '';

            if (isManageMode) {
                const toolbar = document.createElement('div');
                toolbar.className = 'friend-manage-toolbar';
                toolbar.innerHTML = `
                    <div class="friend-manage-tip">拖动分组或好友即可排序/移动</div>
                    <button class="friend-manage-add-group" type="button">+ 新增分组</button>
                `;
                const addBtn = toolbar.querySelector('.friend-manage-add-group');
                if (addBtn) {
                    addBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        addFriendGroup();
                    });
                }
                friendList.appendChild(toolbar);
            }

            const friendGroupOptions = AppState.friendGroups.map(group => {
                return {
                    id: group.id,
                    name: escapeHtml(group.name || '')
                };
            });
            
            // 初始化折叠状态存储
            if (!AppState.groupCollapsedStates) {
                AppState.groupCollapsedStates = {};
            }
            
            // 按分组显示好友
            AppState.friendGroups.forEach((group, groupIndex) => {
                const groupFriends = (groupedFriends[group.id] || []).sort((a, b) => {
                    const aIndex = Number.isFinite(a.friendSortIndex) ? a.friendSortIndex : 0;
                    const bIndex = Number.isFinite(b.friendSortIndex) ? b.friendSortIndex : 0;
                    return aIndex - bIndex;
                });
                if (groupFriends.length === 0 && !isManageMode) return;
                
                const isCollapsed = AppState.groupCollapsedStates[group.id] || false;
                const canMoveUp = isManageMode && groupIndex > 0;
                const canMoveDown = isManageMode && groupIndex < AppState.friendGroups.length - 1;
                const safeGroupName = escapeHtml(group.name || '');
                
                // 添加分组头
                const groupHeader = document.createElement('div');
                groupHeader.className = 'friend-subgroup-header';
                groupHeader.dataset.groupId = group.id;
                groupHeader.dataset.collapsed = isCollapsed;
                groupHeader.setAttribute('aria-expanded', String(!isCollapsed));
                if (isCollapsed) {
                    groupHeader.classList.add('is-collapsed');
                }
                
                groupHeader.innerHTML = `
                    <div class="friend-subgroup-left">
                        <span class="friend-subgroup-caret"></span>
                        ${isManageMode ? `<span class="friend-drag-handle" draggable="true" data-drag-type="friend-group" data-group-id="${group.id}" aria-label="拖动分组">≡</span>` : ''}
                        <span class="friend-subgroup-name">${safeGroupName}</span>
                        <span class="friend-subgroup-count">${groupFriends.length}</span>
                    </div>
                    <div class="friend-subgroup-actions">
                        ${isManageMode ? `<button type="button" onclick="event.stopPropagation();moveFriendGroup('${group.id}', -1)" class="friend-subgroup-action" ${canMoveUp ? '' : 'disabled'}>上移</button>` : ''}
                        ${isManageMode ? `<button type="button" onclick="event.stopPropagation();moveFriendGroup('${group.id}', 1)" class="friend-subgroup-action" ${canMoveDown ? '' : 'disabled'}>下移</button>` : ''}
                        ${isManageMode ? `<button type="button" onclick="event.stopPropagation();editFriendGroup('${group.id}')" class="friend-subgroup-action">编辑</button>` : ''}
                        ${isManageMode && group.id !== 'group_default' ? `<button type="button" onclick="event.stopPropagation();deleteFriendGroup('${group.id}')" class="friend-subgroup-action danger">删除</button>` : ''}
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
                if (isCollapsed) {
                    friendsContainer.classList.add('is-collapsed');
                }
                
                // 添加分组中的好友
                if (groupFriends.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'empty-state';
                    empty.style.cssText = 'padding:12px 20px;background:#fff;';
                    empty.innerHTML = '<div class="empty-text">暂无好友</div>';
                    friendsContainer.appendChild(empty);
                } else {
                    groupFriends.forEach(friend => {
                        const item = document.createElement('div');
                        item.className = 'friend-item';
                        item.dataset.id = friend.id;
                        item.dataset.groupId = group.id;
                        
                        const avatarContent = friend.avatar
                            ? `<img src="${friend.avatar}" alt="">`
                            : friend.name.charAt(0);
                        
                        // 显示优先级：备注 > 网名 > 真名
                        const displayName = getFriendDisplayName(friend);
                        const activeGroupId = friend.friendGroupId && groupedFriends[friend.friendGroupId]
                            ? friend.friendGroupId
                            : 'group_default';
                        const groupOptionsHtml = friendGroupOptions.map(option => {
                            const selected = option.id === activeGroupId ? 'selected' : '';
                            return `<option value="${option.id}" ${selected}>${option.name}</option>`;
                        }).join('');
                        const dragHandleHtml = isManageMode
                            ? `<span class="friend-drag-handle" draggable="true" data-drag-type="friend-item" data-friend-id="${friend.id}" data-group-id="${group.id}" aria-label="拖动好友">≡</span>`
                            : '';
                        const manageSelectHtml = isManageMode
                            ? `<select class="friend-group-select" data-friend-id="${friend.id}">${groupOptionsHtml}</select>`
                            : '';
                        
                        item.innerHTML = `
                            <div class="friend-item-content">
                                ${dragHandleHtml}
                                <div class="friend-avatar">${avatarContent}</div>
                                <div class="friend-info" style="flex:1;">
                                    <div class="friend-name">${displayName}</div>
                                    <div class="friend-status">${friend.status || ''}</div>
                                </div>
                                ${manageSelectHtml}
                            </div>
                        `;
                        
                        item.addEventListener('click', function(e) {
                            if (getFriendManageMode()) return;
                            openChatWithFriend(friend);
                        });

                        if (isManageMode) {
                            const select = item.querySelector('.friend-group-select');
                            if (select) {
                                select.addEventListener('click', function(e) {
                                    e.stopPropagation();
                                });
                                select.addEventListener('change', function(e) {
                                    e.stopPropagation();
                                    moveFriendToGroup(friend.id, this.value);
                                });
                            }

                            const handle = item.querySelector('.friend-drag-handle');
                            if (handle) {
                                bindLongPressDrag(handle, item);
                            }
                        }
                        
                        friendsContainer.appendChild(item);
                    });
                }
                
                friendList.appendChild(friendsContainer);
            });
            
            if (!isManageMode) {
                // 非管理模式下保留轻量入口
                const addGroupBtn = document.createElement('div');
                addGroupBtn.className = 'friend-add-group-btn';
                addGroupBtn.textContent = '+ 新增分组';
                addGroupBtn.addEventListener('click', addFriendGroup);
                friendList.appendChild(addGroupBtn);
            }

            if (isManageMode) {
                bindFriendManageDnD();
            }
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

        function moveFriendGroup(groupId, direction) {
            const groups = AppState.friendGroups || [];
            const index = groups.findIndex(group => group.id === groupId);
            if (index === -1) return;
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= groups.length) return;
            const moved = groups.splice(index, 1)[0];
            groups.splice(targetIndex, 0, moved);
            saveToStorage();
            renderFriends();
        }

        function moveFriendToGroup(friendId, groupId, beforeFriendId) {
            const group = AppState.friendGroups.find(g => g.id === groupId);
            const friend = AppState.friends.find(f => f.id === friendId);
            if (!group || !friend) return;
            const isSameGroup = friend.friendGroupId === groupId;
            if (isSameGroup && !beforeFriendId) return;

            friend.friendGroupId = groupId;

            if (beforeFriendId) {
                reorderFriendInGroup(friendId, beforeFriendId, groupId);
            } else {
                friend.friendSortIndex = getNextFriendSortIndex(groupId);
            }

            if (AppState.groupCollapsedStates) {
                AppState.groupCollapsedStates[groupId] = false;
            }
            saveToStorage();
            renderFriends();
            showToast(`已移动到 ${group.name}`);
        }

        function reorderFriendGroupByDrag(sourceGroupId, targetGroupId) {
            if (!sourceGroupId || !targetGroupId || sourceGroupId === targetGroupId) return;
            const groups = AppState.friendGroups || [];
            const fromIndex = groups.findIndex(group => group.id === sourceGroupId);
            const toIndex = groups.findIndex(group => group.id === targetGroupId);
            if (fromIndex === -1 || toIndex === -1) return;
            const moved = groups.splice(fromIndex, 1)[0];
            groups.splice(toIndex, 0, moved);
            saveToStorage();
            renderFriends();
        }

        function bindFriendManageDnD() {
            const list = document.querySelector('.friend-list[data-group="common"]');
            if (!list) return;

            const groupHandles = list.querySelectorAll('[data-drag-type="friend-group"]');
            groupHandles.forEach(handle => {
                handle.addEventListener('dragstart', function(e) {
                    const groupId = this.dataset.groupId;
                    friendDragPayload = { type: 'friend-group', groupId: groupId };
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', JSON.stringify(friendDragPayload));
                });
                handle.addEventListener('dragend', function() {
                    friendDragPayload = null;
                });
                bindLongPressDrag(handle, handle.closest('.friend-subgroup-header'));
            });

            const itemHandles = list.querySelectorAll('[data-drag-type="friend-item"]');
            itemHandles.forEach(handle => {
                handle.addEventListener('dragstart', function(e) {
                    const friendId = this.dataset.friendId;
                    const groupId = this.dataset.groupId;
                    friendDragPayload = { type: 'friend-item', friendId: friendId, groupId: groupId };
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', JSON.stringify(friendDragPayload));
                });
                handle.addEventListener('dragend', function() {
                    friendDragPayload = null;
                });
                bindLongPressDrag(handle, handle.closest('.friend-item'));
            });

            const groupHeaders = list.querySelectorAll('.friend-subgroup-header');
            groupHeaders.forEach(header => {
                header.addEventListener('dragover', function(e) {
                    const payload = friendDragPayload || parseDragPayload(e);
                    if (!payload) return;
                    if (payload.type === 'friend-group' || payload.type === 'friend-item') {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        header.classList.add('drag-over');
                    }
                });
                header.addEventListener('dragleave', function() {
                    header.classList.remove('drag-over');
                });
                header.addEventListener('drop', function(e) {
                    e.preventDefault();
                    header.classList.remove('drag-over');
                    const payload = friendDragPayload || parseDragPayload(e);
                    if (!payload) return;
                    const targetGroupId = header.dataset.groupId;
                    if (payload.type === 'friend-group') {
                        reorderFriendGroupByDrag(payload.groupId, targetGroupId);
                    } else if (payload.type === 'friend-item') {
                        moveFriendToGroup(payload.friendId, targetGroupId);
                    }
                });
            });

            const friendItems = list.querySelectorAll('.friend-item');
            friendItems.forEach(item => {
                item.addEventListener('dragover', function(e) {
                    const payload = friendDragPayload || parseDragPayload(e);
                    if (!payload || payload.type !== 'friend-item') return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    item.classList.add('drag-over');
                });
                item.addEventListener('dragleave', function() {
                    item.classList.remove('drag-over');
                });
                item.addEventListener('drop', function(e) {
                    e.preventDefault();
                    item.classList.remove('drag-over');
                    const payload = friendDragPayload || parseDragPayload(e);
                    if (!payload || payload.type !== 'friend-item') return;
                    const targetFriendId = item.dataset.id;
                    const targetGroupId = item.dataset.groupId;
                    if (!targetFriendId || !targetGroupId) return;
                    if (payload.friendId === targetFriendId) return;
                    if (payload.groupId === targetGroupId) {
                        reorderFriendInGroup(payload.friendId, targetFriendId, targetGroupId);
                        saveToStorage();
                        renderFriends();
                    } else {
                        moveFriendToGroup(payload.friendId, targetGroupId, targetFriendId);
                    }
                });
            });

            const groupContainers = list.querySelectorAll('.group-friends-container');
            groupContainers.forEach(container => {
                container.addEventListener('dragover', function(e) {
                    const payload = friendDragPayload || parseDragPayload(e);
                    if (!payload || payload.type !== 'friend-item') return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    container.classList.add('drag-over');
                });
                container.addEventListener('dragleave', function() {
                    container.classList.remove('drag-over');
                });
                container.addEventListener('drop', function(e) {
                    e.preventDefault();
                    container.classList.remove('drag-over');
                    const payload = friendDragPayload || parseDragPayload(e);
                    if (!payload || payload.type !== 'friend-item') return;
                    const targetGroupId = container.dataset.groupId;
                    if (!targetGroupId) return;
                    moveFriendToGroup(payload.friendId, targetGroupId);
                });
            });
        }

        // 渲染群聊列表
        function renderGroups() {
            const groupList = document.querySelector('.friend-list[data-group="groups"]');
            const count = document.querySelector('.group-header[data-group="groups"] .group-count');
            const isManageMode = getGroupManageMode();
            updateGroupManageButton();

            if (!groupList || !count) return;

            if (!Array.isArray(AppState.groupChatGroups)) {
                AppState.groupChatGroups = [];
            }
            if (!AppState.groupChatGroups.some(group => group.id === 'group_default')) {
                AppState.groupChatGroups.unshift({ id: 'group_default', name: '默认分组', memberIds: [] });
            }

            ensureGroupChatSortIndex();

            const groups = Array.isArray(AppState.groups) ? AppState.groups : [];
            count.textContent = `(${groups.length}/${groups.length})`;
            
            if (groups.length === 0 && !isManageMode) {
                groupList.innerHTML = `
                    <div class="empty-state" style="padding: 30px 20px;">
                        <div class="empty-text">暂无群聊</div>
                    </div>
                `;
                return;
            }
            
            const groupedChats = {};
            AppState.groupChatGroups.forEach(group => {
                groupedChats[group.id] = [];
            });

            groups.forEach(group => {
                const targetGroupId = group.groupChatGroupId && groupedChats[group.groupChatGroupId]
                    ? group.groupChatGroupId
                    : 'group_default';
                group.groupChatGroupId = targetGroupId;
                if (!groupedChats[targetGroupId]) groupedChats[targetGroupId] = [];
                groupedChats[targetGroupId].push(group);
            });
            
            groupList.innerHTML = '';

            if (isManageMode) {
                const toolbar = document.createElement('div');
                toolbar.className = 'friend-manage-toolbar group-manage-toolbar';
                toolbar.innerHTML = `
                    <div class="friend-manage-tip">拖动分组或群聊即可排序/移动</div>
                    <button class="friend-manage-add-group" type="button">+ 新增分组</button>
                `;
                const addBtn = toolbar.querySelector('.friend-manage-add-group');
                if (addBtn) {
                    addBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        addGroupChatGroup();
                    });
                }
                groupList.appendChild(toolbar);
            }

            if (!AppState.groupChatCollapsedStates) {
                AppState.groupChatCollapsedStates = {};
            }

            const groupChatOptions = AppState.groupChatGroups.map(group => {
                return {
                    id: group.id,
                    name: escapeHtml(group.name || '')
                };
            });
            
            AppState.groupChatGroups.forEach((group, groupIndex) => {
                const groupChats = (groupedChats[group.id] || []).sort((a, b) => {
                    const aIndex = Number.isFinite(a.groupSortIndex) ? a.groupSortIndex : 0;
                    const bIndex = Number.isFinite(b.groupSortIndex) ? b.groupSortIndex : 0;
                    return aIndex - bIndex;
                });
                if (groupChats.length === 0 && !isManageMode) return;
                
                const isCollapsed = AppState.groupChatCollapsedStates[group.id] || false;
                const canMoveUp = isManageMode && groupIndex > 0;
                const canMoveDown = isManageMode && groupIndex < AppState.groupChatGroups.length - 1;
                const safeGroupName = escapeHtml(group.name || '');
                
                const groupHeader = document.createElement('div');
                groupHeader.className = 'friend-subgroup-header groupchat-subgroup-header';
                groupHeader.dataset.groupId = group.id;
                groupHeader.dataset.collapsed = isCollapsed;
                groupHeader.setAttribute('aria-expanded', String(!isCollapsed));
                if (isCollapsed) {
                    groupHeader.classList.add('is-collapsed');
                }
                
                groupHeader.innerHTML = `
                    <div class="friend-subgroup-left">
                        <span class="friend-subgroup-caret"></span>
                        ${isManageMode ? `<span class="friend-drag-handle" draggable="true" data-drag-type="group-chat-group" data-group-id="${group.id}" aria-label="拖动分组">≡</span>` : ''}
                        <span class="friend-subgroup-name">${safeGroupName}</span>
                        <span class="friend-subgroup-count">${groupChats.length}</span>
                    </div>
                    <div class="friend-subgroup-actions">
                        ${isManageMode ? `<button type="button" onclick="event.stopPropagation();moveGroupChatGroup('${group.id}', -1)" class="friend-subgroup-action" ${canMoveUp ? '' : 'disabled'}>上移</button>` : ''}
                        ${isManageMode ? `<button type="button" onclick="event.stopPropagation();moveGroupChatGroup('${group.id}', 1)" class="friend-subgroup-action" ${canMoveDown ? '' : 'disabled'}>下移</button>` : ''}
                        ${isManageMode ? `<button type="button" onclick="event.stopPropagation();editGroupChatGroup('${group.id}')" class="friend-subgroup-action">编辑</button>` : ''}
                        ${isManageMode && group.id !== 'group_default' ? `<button type="button" onclick="event.stopPropagation();deleteGroupChatGroup('${group.id}')" class="friend-subgroup-action danger">删除</button>` : ''}
                    </div>
                `;
                
                groupHeader.addEventListener('click', function() {
                    AppState.groupChatCollapsedStates[group.id] = !AppState.groupChatCollapsedStates[group.id];
                    saveToStorage();
                    renderGroups();
                });
                
                groupList.appendChild(groupHeader);
                
                const groupContainer = document.createElement('div');
                groupContainer.className = 'group-friends-container';
                groupContainer.dataset.groupId = group.id;
                if (isCollapsed) {
                    groupContainer.classList.add('is-collapsed');
                }
                
                if (groupChats.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'empty-state';
                    empty.style.cssText = 'padding:12px 20px;background:#fff;';
                    empty.innerHTML = '<div class="empty-text">暂无群聊</div>';
                    groupContainer.appendChild(empty);
                } else {
                    groupChats.forEach(function(groupChat) {
                        const item = document.createElement('div');
                        item.className = 'friend-item';
                        item.dataset.id = groupChat.id;
                        item.dataset.groupId = group.id;
                        
                        const avatarContent = groupChat.avatar
                            ? `<img src="${groupChat.avatar}" alt="">`
                            : (groupChat.name ? groupChat.name.charAt(0) : '?');
                        const memberCount = groupChat.memberCount || (Array.isArray(groupChat.members) ? groupChat.members.length : 0);
                        const activeGroupId = groupChat.groupChatGroupId && groupedChats[groupChat.groupChatGroupId]
                            ? groupChat.groupChatGroupId
                            : 'group_default';
                        const groupOptionsHtml = groupChatOptions.map(option => {
                            const selected = option.id === activeGroupId ? 'selected' : '';
                            return `<option value="${option.id}" ${selected}>${option.name}</option>`;
                        }).join('');
                        const dragHandleHtml = isManageMode
                            ? `<span class="friend-drag-handle" draggable="true" data-drag-type="group-chat-item" data-group-id="${group.id}" data-groupchat-id="${groupChat.id}" aria-label="拖动群聊">≡</span>`
                            : '';
                        const manageSelectHtml = isManageMode
                            ? `<select class="group-chat-group-select" data-group-id="${groupChat.id}">${groupOptionsHtml}</select>`
                            : '';
                        
                        item.innerHTML = `
                            <div class="friend-item-content">
                                ${dragHandleHtml}
                                <div class="friend-avatar">${avatarContent}</div>
                                <div class="friend-info" style="flex:1;">
                                    <div class="friend-name">${escapeHtml(groupChat.name || '')}</div>
                                    <div class="friend-status">${memberCount}人</div>
                                </div>
                                ${manageSelectHtml}
                            </div>
                        `;
                        
                        item.addEventListener('click', function() {
                            if (getGroupManageMode()) return;
                            openChatWithGroup(groupChat);
                        });

                        if (isManageMode) {
                            const select = item.querySelector('.group-chat-group-select');
                            if (select) {
                                select.addEventListener('click', function(e) {
                                    e.stopPropagation();
                                });
                                select.addEventListener('change', function(e) {
                                    e.stopPropagation();
                                    moveGroupChatToGroup(groupChat.id, this.value);
                                });
                            }

                            const handle = item.querySelector('.friend-drag-handle');
                            if (handle) {
                                bindLongPressDrag(handle, item);
                            }
                        }
                        
                        groupContainer.appendChild(item);
                    });
                }
                
                groupList.appendChild(groupContainer);
            });

            if (!isManageMode) {
                const addGroupBtn = document.createElement('div');
                addGroupBtn.className = 'friend-add-group-btn';
                addGroupBtn.textContent = '+ 新增分组';
                addGroupBtn.addEventListener('click', addGroupChatGroup);
                groupList.appendChild(addGroupBtn);
            }

            if (isManageMode) {
                bindGroupChatManageDnD();
            }
        }

        function addGroupChatGroup() {
            const groupName = prompt('请输入分组名称：', '');
            if (!groupName || !groupName.trim()) return;

            if (!Array.isArray(AppState.groupChatGroups)) {
                AppState.groupChatGroups = [];
            }

            AppState.groupChatGroups.push({
                id: generateId(),
                name: groupName.trim(),
                memberIds: []
            });

            saveToStorage();
            renderGroups();
            showToast('分组已添加');
        }

        function editGroupChatGroup(groupId) {
            const group = AppState.groupChatGroups.find(g => g.id === groupId);
            if (!group) return;

            const newName = prompt('编辑分组名称：', group.name);
            if (!newName || !newName.trim()) return;

            group.name = newName.trim();
            saveToStorage();
            renderGroups();
            showToast('分组已更新');
        }

        function deleteGroupChatGroup(groupId) {
            const group = AppState.groupChatGroups.find(g => g.id === groupId);
            if (!group || group.id === 'group_default') return;

            if (!confirm(`确定要删除分组 "${group.name}" 吗？该分组中的群聊将移到默认分组`)) return;

            AppState.groups.forEach(groupChat => {
                if (groupChat.groupChatGroupId === groupId) {
                    groupChat.groupChatGroupId = 'group_default';
                }
            });

            AppState.groupChatGroups = AppState.groupChatGroups.filter(g => g.id !== groupId);
            saveToStorage();
            renderGroups();
            showToast('分组已删除');
        }

        function moveGroupChatGroup(groupId, direction) {
            const groups = AppState.groupChatGroups || [];
            const index = groups.findIndex(group => group.id === groupId);
            if (index === -1) return;
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= groups.length) return;
            const moved = groups.splice(index, 1)[0];
            groups.splice(targetIndex, 0, moved);
            saveToStorage();
            renderGroups();
        }

        function moveGroupChatToGroup(groupId, targetGroupId, beforeGroupId) {
            const targetGroup = AppState.groupChatGroups.find(g => g.id === targetGroupId);
            const groupChat = AppState.groups.find(g => g.id === groupId);
            if (!targetGroup || !groupChat) return;
            const isSameGroup = groupChat.groupChatGroupId === targetGroupId;
            if (isSameGroup && !beforeGroupId) return;

            groupChat.groupChatGroupId = targetGroupId;

            if (beforeGroupId) {
                reorderGroupChatInGroup(groupId, beforeGroupId, targetGroupId);
            } else {
                groupChat.groupSortIndex = getNextGroupChatSortIndex(targetGroupId);
            }

            if (AppState.groupChatCollapsedStates) {
                AppState.groupChatCollapsedStates[targetGroupId] = false;
            }
            saveToStorage();
            renderGroups();
            showToast(`已移动到 ${targetGroup.name}`);
        }

        function reorderGroupChatGroupByDrag(sourceGroupId, targetGroupId) {
            if (!sourceGroupId || !targetGroupId || sourceGroupId === targetGroupId) return;
            const groups = AppState.groupChatGroups || [];
            const fromIndex = groups.findIndex(group => group.id === sourceGroupId);
            const toIndex = groups.findIndex(group => group.id === targetGroupId);
            if (fromIndex === -1 || toIndex === -1) return;
            const moved = groups.splice(fromIndex, 1)[0];
            groups.splice(toIndex, 0, moved);
            saveToStorage();
            renderGroups();
        }

        function bindGroupChatManageDnD() {
            const list = document.querySelector('.friend-list[data-group="groups"]');
            if (!list) return;

            const groupHandles = list.querySelectorAll('[data-drag-type="group-chat-group"]');
            groupHandles.forEach(handle => {
                handle.addEventListener('dragstart', function(e) {
                    const groupId = this.dataset.groupId;
                    groupChatDragPayload = { type: 'group-chat-group', groupId: groupId };
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', JSON.stringify(groupChatDragPayload));
                });
                handle.addEventListener('dragend', function() {
                    groupChatDragPayload = null;
                });
                bindLongPressDrag(handle, handle.closest('.friend-subgroup-header'));
            });

            const itemHandles = list.querySelectorAll('[data-drag-type="group-chat-item"]');
            itemHandles.forEach(handle => {
                handle.addEventListener('dragstart', function(e) {
                    const groupId = this.dataset.groupId;
                    const groupChatId = this.dataset.groupchatId;
                    groupChatDragPayload = { type: 'group-chat-item', groupId: groupId, groupChatId: groupChatId };
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', JSON.stringify(groupChatDragPayload));
                });
                handle.addEventListener('dragend', function() {
                    groupChatDragPayload = null;
                });
                bindLongPressDrag(handle, handle.closest('.friend-item'));
            });

            const groupHeaders = list.querySelectorAll('.friend-subgroup-header');
            groupHeaders.forEach(header => {
                header.addEventListener('dragover', function(e) {
                    const payload = groupChatDragPayload || parseDragPayload(e);
                    if (!payload) return;
                    if (payload.type === 'group-chat-group' || payload.type === 'group-chat-item') {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        header.classList.add('drag-over');
                    }
                });
                header.addEventListener('dragleave', function() {
                    header.classList.remove('drag-over');
                });
                header.addEventListener('drop', function(e) {
                    e.preventDefault();
                    header.classList.remove('drag-over');
                    const payload = groupChatDragPayload || parseDragPayload(e);
                    if (!payload) return;
                    const targetGroupId = header.dataset.groupId;
                    if (payload.type === 'group-chat-group') {
                        reorderGroupChatGroupByDrag(payload.groupId, targetGroupId);
                    } else if (payload.type === 'group-chat-item') {
                        moveGroupChatToGroup(payload.groupChatId, targetGroupId);
                    }
                });
            });

            const groupItems = list.querySelectorAll('.friend-item');
            groupItems.forEach(item => {
                item.addEventListener('dragover', function(e) {
                    const payload = groupChatDragPayload || parseDragPayload(e);
                    if (!payload || payload.type !== 'group-chat-item') return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    item.classList.add('drag-over');
                });
                item.addEventListener('dragleave', function() {
                    item.classList.remove('drag-over');
                });
                item.addEventListener('drop', function(e) {
                    e.preventDefault();
                    item.classList.remove('drag-over');
                    const payload = groupChatDragPayload || parseDragPayload(e);
                    if (!payload || payload.type !== 'group-chat-item') return;
                    const targetGroupChatId = item.dataset.id;
                    const targetGroupId = item.dataset.groupId;
                    if (!targetGroupChatId || !targetGroupId) return;
                    if (payload.groupChatId === targetGroupChatId) return;
                    if (payload.groupId === targetGroupId) {
                        reorderGroupChatInGroup(payload.groupChatId, targetGroupChatId, targetGroupId);
                        saveToStorage();
                        renderGroups();
                    } else {
                        moveGroupChatToGroup(payload.groupChatId, targetGroupId, targetGroupChatId);
                    }
                });
            });

            const groupContainers = list.querySelectorAll('.group-friends-container');
            groupContainers.forEach(container => {
                container.addEventListener('dragover', function(e) {
                    const payload = groupChatDragPayload || parseDragPayload(e);
                    if (!payload || payload.type !== 'group-chat-item') return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    container.classList.add('drag-over');
                });
                container.addEventListener('dragleave', function() {
                    container.classList.remove('drag-over');
                });
                container.addEventListener('drop', function(e) {
                    e.preventDefault();
                    container.classList.remove('drag-over');
                    const payload = groupChatDragPayload || parseDragPayload(e);
                    if (!payload || payload.type !== 'group-chat-item') return;
                    const targetGroupId = container.dataset.groupId;
                    if (!targetGroupId) return;
                    moveGroupChatToGroup(payload.groupChatId, targetGroupId);
                });
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

        // 切换标签页 - 移动端性能优化版
        function switchTab(tabId) {
            try {
                // 智能判断：只有当DOM状态和 AppState 都相同时才阻止切换
                const currentPage = document.querySelector('.main-content.active');
                const currentActiveTab = document.querySelector('.tab-item.active');
                const isDOMSameTab = currentPage && currentPage.id === tabId;
                const isAppStateSameTab = AppState.currentTab === tabId;
                
                if (isDOMSameTab && isAppStateSameTab) {
                    console.log('🔄 页面和状态都已经是相同标签，无需切换:', tabId);
                    return;
                }
                
                // 检查是否过于频繁切换（防抖）
                const now = Date.now();
                if (switchTab._lastSwitchTime && now - switchTab._lastSwitchTime < 120) {
                    console.log('🚫 切换过于频繁，被防抖阻止');
                    return;
                }
                switchTab._lastSwitchTime = now;
                
                console.log('🔄 开始切换标签:', tabId, '当前DOM:', isDOMSameTab ? '相同' : '不同', '当前状态:', isAppStateSameTab ? '相同' : '不同');

                // 使用 requestAnimationFrame 优化渲染
                requestAnimationFrame(() => {
                    try {
                        // 更新标签栏状态
                        const allTabs = document.querySelectorAll('.tab-item');
                        allTabs.forEach(function(tab) {
                            tab.classList.remove('active');
                        });
                        
                        const activeTab = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
                        if (activeTab) {
                            activeTab.classList.add('active');
                            console.log('✅ 激活标签:', tabId);
                        } else {
                            console.warn('⚠️ 未找到标签元素:', tabId);
                        }
                        
                        // 更新内容区域
                        const allPages = document.querySelectorAll('.main-content');
                        allPages.forEach(function(page) {
                            page.classList.remove('active');
                        });
                        
                        const targetPage = document.getElementById(tabId);
                        if (targetPage) {
                            targetPage.classList.add('active');
                            console.log('✅ 激活页面:', tabId);
                        } else {
                            console.warn('⚠️ 未找到页面元素:', tabId);
                        }
                        
                        // 更新顶部导航栏显示
                        const topNav = document.getElementById('top-nav');
                        if (topNav) {
                            if (tabId === 'dynamic-page' || tabId === 'moments-page' || tabId === 'channel-page') {
                                topNav.style.display = 'none';
                                console.log('📱 隐藏顶部导航栏');
                            } else {
                                topNav.style.display = 'flex';
                                console.log('📱 显示顶部导航栏');
                            }
                        }

                        const appContainer = document.getElementById('app-container');
                        if (appContainer) {
                            if (tabId === 'dynamic-page' || tabId === 'moments-page' || tabId === 'channel-page') {
                                appContainer.classList.add('top-nav-hidden');
                            } else {
                                appContainer.classList.remove('top-nav-hidden');
                            }
                        }
                        
                        // 更新搜索栏显示
                        const msgSearchBar = document.getElementById('msg-search-bar');
                        const friendSearchBar = document.getElementById('friend-search-bar');
                        if (msgSearchBar && friendSearchBar) {
                            if (tabId === 'msg-page') {
                                msgSearchBar.style.display = 'block';
                                friendSearchBar.style.display = 'none';
                                console.log('🔍 显示消息搜索栏');
                            } else if (tabId === 'friend-page') {
                                msgSearchBar.style.display = 'none';
                                friendSearchBar.style.display = 'block';
                                console.log('🔍 显示好友搜索栏');
                            } else {
                                msgSearchBar.style.display = 'none';
                                friendSearchBar.style.display = 'none';
                                console.log('🔍 隐藏搜索栏');
                            }
                        }
                        
                        // 立即更新应用状态，避免阻止后续操作
                        AppState.currentTab = tabId;
                        console.log('✅ 状态更新完成:', tabId);

                        if (window.MessageBackgroundManager && typeof window.MessageBackgroundManager.setPageTypeByTab === 'function') {
                            window.MessageBackgroundManager.setPageTypeByTab(tabId);
                        }

                        // 震动反馈（如果支持）
                        if (navigator.vibrate) {
                            navigator.vibrate(10);
                        }
                        
                    } catch (error) {
                        console.error('🚫 标签切换渲染错误:', error);
                    }
                });
                
            } catch (error) {
                console.error('🚫 标签切换错误:', error);
            }
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

        // 打开子页面 - 移动端性能优化版
        function openSubPage(pageId) {
            // 防止重复打开
            const page = document.getElementById(pageId);
            if (!page || page.classList.contains('open')) {
                return;
            }

            // 使用 requestAnimationFrame 优化动画
            requestAnimationFrame(() => {
                page.classList.add('open');
                
                // 隐藏底部导航栏（非聊天页面）
                const tabBar = document.getElementById('tab-bar');
                if (tabBar && pageId !== 'chat-page') {
                    tabBar.style.visibility = 'hidden';
                    tabBar.style.pointerEvents = 'none';
                }
                
                // 打开设置与配置页面时重新初始化UI
                if (pageId === 'api-settings-page') {
                    setTimeout(function() {
                        initApiSettingsUI();
                    }, 100);
                }
                // 打开世界书页面时，渲染世界书列表
                if (pageId === 'worldbook-page') {
                    setTimeout(function() {
                        renderWorldbooks();
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
                // 打开购物页面时，初始化购物页面
                if (pageId === 'shopping-page') {
                    setTimeout(function() {
                        try {
                            if (window.ShoppingPage && typeof window.ShoppingPage.initAll === 'function') {
                                window.ShoppingPage.initAll();
                            }
                        } catch (e) {
                            console.log('shopping page initialization error:', e.message);
                        }
                    }, 100);
                }

                // 打开真人联机聊天室页面时启动实时拉取
                if (pageId === 'forum-page' && window.RealtimeChat && typeof window.RealtimeChat.onPageOpen === 'function') {
                    setTimeout(function() {
                        window.RealtimeChat.onPageOpen();
                    }, 60);
                }
            });
        }

        // 关闭子页面 - 移动端性能优化版
        function closeSubPage(pageId) {
            const page = document.getElementById(pageId);
            if (!page) return;

            requestAnimationFrame(() => {
                page.classList.remove('open');
                
                // 显示底部导航栏（非聊天页面关闭时）
                const tabBar = document.getElementById('tab-bar');
                const chatPage = document.getElementById('chat-page');
                if (tabBar && pageId !== 'chat-page') {
                    // 如果聊天页面没打开，才显示底部导航栏
                    if (!chatPage || !chatPage.classList.contains('open')) {
                        tabBar.style.visibility = '';
                        tabBar.style.pointerEvents = '';
                    }
                }

                // 关闭真人联机聊天室页面时停止轮询并离房
                if (pageId === 'forum-page' && window.RealtimeChat && typeof window.RealtimeChat.onPageClose === 'function') {
                    window.RealtimeChat.onPageClose();
                }
            });
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
                        switchTab('moments-page');
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
                    case 'forum':
                        openSubPage('forum-page');
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
                            showToast('我的人设模块未加载');
                        }
                        break;
                    case 'shopping':
                        openSubPage('shopping-page');
                        break;
                    case 'weather':
                        showToast('天气功能开发中');
                        break;
                    case 'calendar':
                        showToast('日历功能开发中');
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
            if (window.STPresetManager) {
                window.STPresetManager.open();
            } else {
                showToast('预设管理模块未加载');
            }
        }

        
        // 打开设置页面（全屏子页面）
        function openSettingsPage() {
            let page = document.getElementById('settings-page');
            if (!page) {
                page = document.createElement('div');
                page.id = 'settings-page';
                page.className = 'sub-page settings-config-page';
                document.getElementById('app-container').appendChild(page);
            }
            page.classList.add('settings-config-page');
            
            // 检测设备类型和浏览器
            const ua = navigator.userAgent;
            const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
            const isAndroid = /Android/.test(ua);
            const deviceType = isIOS ? 'iOS' : (isAndroid ? 'Android' : 'Desktop');
            
            // 浏览器检测
            const isEdge = /Edg/.test(ua);
            const isOpera = /OPR|Opera/.test(ua);
            const isYandex = /YaBrowser/.test(ua);
            const isChrome = /Chrome/.test(ua) && !isEdge && !isOpera && !isYandex;
            const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !isEdge;
            
            // 确定浏览器名称
            let browserName = 'Unknown';
            if (isChrome) browserName = 'Chrome';
            else if (isEdge) browserName = 'Edge';
            else if (isOpera) browserName = 'Opera';
            else if (isYandex) browserName = 'Yandex';
            else if (isSafari) browserName = 'Safari';
            
            // 检查通知权限状态
            let notificationStatus = 'default';
            let notificationSupported = 'Notification' in window;
            if (notificationSupported) {
                notificationStatus = Notification.permission;
            }
            
            // 检查Service Worker支持
            const swSupported = 'serviceWorker' in navigator;
            
            page.innerHTML = `
                <div class="sub-nav friend-nav settings-config-nav">
                    <div class="back-btn" id="settings-back-btn" aria-label="返回"></div>
                    <div class="sub-title">通知与数据</div>
                </div>
                
                <div class="sub-content settings-config-content" style="padding:10px 16px 100px;">
                    <!-- 通知设置区域 -->
                    <div class="settings-section" style="margin-top:0;">
                        <div class="settings-section-header">
                            <svg viewBox="0 0 24 24" class="settings-section-icon">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                            <span>通知设置</span>
                        </div>
                        
                        <div class="settings-item" id="notification-permission-item">
                            <div class="settings-item-left">
                                <div class="settings-item-title">系统通知权限</div>
                                <div class="settings-item-desc" id="notification-status-text">
                                    ${!notificationSupported ? '不支持' :
                                      notificationStatus === 'granted' ? '已授权 (' + deviceType + ' · ' + browserName + ')' :
                                      notificationStatus === 'denied' ? '已拒绝' : '未设置'}
                                </div>
                            </div>
                            <div class="settings-item-right">
                                <button class="settings-toggle-btn" id="notification-toggle-btn"
                                    data-status="${notificationStatus}"
                                    data-device="${deviceType}"
                                    data-browser="${browserName}"
                                    ${!notificationSupported ? 'disabled style="opacity:0.5;"' : ''}>
                                    ${!notificationSupported ? '不支持' :
                                      notificationStatus === 'granted' ? '已开启' : '请求授权'}
                                </button>
                            </div>
                        </div>
                        
                        <div class="settings-info-box" style="${isIOS ? 'background:#fff3cd;border-color:#ffc107;' : ''}">
                            <svg viewBox="0 0 24 24" class="settings-info-icon">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            <div class="settings-info-text">
                                ${isIOS ?
                                    '<strong>iOS设备说明 (${browserName})：</strong><br>' +
                                    '• Safari浏览器：需要将网站"添加到主屏幕"后才能接收通知<br>' +
                                    '• 添加方法：点击分享按钮 → 选择"添加到主屏幕"<br>' +
                                    '• 从主屏幕图标打开应用后，通知功能才会生效' :
                                  isAndroid ?
                                    '<strong>Android设备说明 (' + browserName + ')：</strong><br>' +
                                    (isChrome ? '• Chrome浏览器：直接点击"请求授权"即可<br>' :
                                     isEdge ? '• Edge浏览器：直接点击"请求授权"即可<br>' :
                                     isOpera ? '• Opera浏览器：直接点击"请求授权"即可<br>' :
                                     isYandex ? '• Yandex浏览器：直接点击"请求授权"即可<br>' :
                                     '• 直接点击"请求授权"即可<br>') +
                                    '• 建议添加到主屏幕以获得更好的体验<br>' +
                                    '• 如权限被拒绝，请在浏览器设置中手动开启' :
                                    '<strong>桌面浏览器说明 (' + browserName + ')：</strong><br>' +
                                    '开启后，您可以在后台收到消息通知，即使应用未打开也能及时了解新消息'}
                            </div>
                        </div>
                        
                        ${swSupported ? `
                        <div class="settings-item">
                            <div class="settings-item-left">
                                <div class="settings-item-title">后台保活服务</div>
                                <div class="settings-item-desc" id="sw-status-text">检测中...</div>
                            </div>
                            <div class="settings-item-right">
                                <span id="sw-status-badge" style="padding:4px 12px;border-radius:12px;font-size:12px;background:#e0e0e0;color:#666;">
                                    检测中
                                </span>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- 数据备份与恢复区域 -->
                    <div class="settings-section">
                        <div class="settings-section-header">
                            <svg viewBox="0 0 24 24" class="settings-section-icon">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <span>数据管理</span>
                        </div>
                        
                        <div class="settings-item">
                            <div class="settings-item-left">
                                <div class="settings-item-title">导出数据</div>
                                <div class="settings-item-desc">备份所有应用数据</div>
                            </div>
                            <div class="settings-item-right">
                                <button class="settings-action-btn" onclick="exportAllData();">
                                    <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;fill:none;">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    导出
                                </button>
                            </div>
                        </div>
                        
                        <div class="settings-item">
                            <div class="settings-item-left">
                                <div class="settings-item-title">导入数据</div>
                                <div class="settings-item-desc">从备份文件恢复</div>
                            </div>
                            <div class="settings-item-right">
                                <button class="settings-action-btn" onclick="document.getElementById('import-backup-input').click();">
                                    <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;fill:none;">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                    导入
                                </button>
                            </div>
                        </div>
                        
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
            `;
            
            page.classList.add('open');
            
            // 绑定返回按钮事件
            setTimeout(() => {
                const backBtn = document.getElementById('settings-back-btn');
                if (backBtn) {
                    backBtn.addEventListener('click', function() {
                        page.classList.remove('open');
                    });
                }
                
                // 绑定通知权限按钮事件
                const notificationBtn = document.getElementById('notification-toggle-btn');
                if (notificationBtn) {
                    notificationBtn.addEventListener('click', function() {
                        const device = this.dataset.device;
                        const browser = this.dataset.browser;
                        requestNotificationPermission(device, browser);
                    });
                }
                
                // 检查Service Worker状态
                if (swSupported) {
                    checkServiceWorkerStatus();
                }
                
                // 绑定导入事件
                const importInput = document.getElementById('import-backup-input');
                if (importInput) {
                    const newInput = importInput.cloneNode(true);
                    importInput.parentNode.replaceChild(newInput, importInput);
                    
                    newInput.addEventListener('change', function(e) {
                        if (e.target.files && e.target.files[0]) {
                            importAllData(e.target.files[0]);
                            this.value = '';
                        }
                    });
                }
            }, 100);
        }
        
        // 请求通知权限（根据设备类型和浏览器提供不同提示）
        async function requestNotificationPermission(deviceType = 'Desktop', browserName = 'Unknown') {
            console.log('🔔 开始请求通知权限:', { deviceType, browserName });
            
            // 检查1: 浏览器是否支持Notification API
            if (!('Notification' in window)) {
                console.error('❌ 浏览器不支持Notification API');
                showToast('❌ 您的浏览器不支持通知功能', 3000);
                return;
            }
            
            const isIOS = deviceType === 'iOS';
            const isAndroid = deviceType === 'Android';
            
            // 检查2: 当前权限状态
            const currentPermission = Notification.permission;
            console.log('📊 当前权限状态:', currentPermission);
            
            if (currentPermission === 'granted') {
                console.log('✅ 权限已授予');
                showToast('✅ 通知权限已授权');
                // 发送测试通知
                sendTestNotification(deviceType, browserName);
                return;
            }
            
            if (currentPermission === 'denied') {
                console.warn('⚠️ 权限已被拒绝');
                if (isIOS) {
                    showToast('❌ 通知权限已被拒绝<br>请在 设置 → Safari → 网站设置 中开启', 4000);
                } else if (isAndroid) {
                    let settingsPath = '浏览器设置 → 网站设置 → 通知';
                    if (browserName === 'Chrome') settingsPath = 'Chrome设置 → 网站设置 → 通知';
                    else if (browserName === 'Edge') settingsPath = 'Edge设置 → 网站权限 → 通知';
                    else if (browserName === 'Opera') settingsPath = 'Opera设置 → 网站设置 → 通知';
                    else if (browserName === 'Yandex') settingsPath = 'Yandex设置 → 网站设置 → 通知';
                    showToast(`❌ 通知权限已被拒绝<br><br>可能原因：<br>1. 之前点击过"阻止"<br>2. 系统通知被禁用<br>3. 浏览器通知被禁用<br><br>解决方法：<br>请在 ${settingsPath} 中手动开启`, 6000);
                } else {
                    let settingsPath = '浏览器设置';
                    if (browserName === 'Chrome') settingsPath = 'Chrome设置 → 隐私和安全 → 网站设置 → 通知';
                    else if (browserName === 'Edge') settingsPath = 'Edge设置 → Cookie和网站权限 → 通知';
                    else if (browserName === 'Opera') settingsPath = 'Opera设置 → 网站设置 → 通知';
                    else if (browserName === 'Yandex') settingsPath = 'Yandex设置 → 网站 → 通知';
                    showToast(`❌ 通知权限已被拒绝<br>请在 ${settingsPath} 中开启`, 4000);
                }
                return;
            }
            
            // 检查3: iOS特殊要求
            if (isIOS && !window.navigator.standalone) {
                console.warn('⚠️ iOS需要PWA模式');
                showToast('📱 iOS提示：<br>请先将网站"添加到主屏幕"<br>然后从主屏幕图标打开<br>才能请求通知权限', 5000);
                return;
            }
            
            // 检查4: 协议支持（file:// 不支持，需要 HTTPS 或 localhost）
            if (location.protocol === 'file:') {
                console.error('❌ file:// 协议不支持通知功能');
                showToast('❌ 通知功能不支持 file:// 协议<br><br>请使用以下方式访问：<br>1. 启动本地服务器（http://localhost）<br>2. 使用 HTTPS 部署<br>3. 使用 Live Server 等工具', 6000);
                return;
            }
            
            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                console.error('❌ 非HTTPS环境');
                showToast('❌ 通知功能需要HTTPS环境<br>当前是: ' + location.protocol, 4000);
                return;
            }
            
            // 检查5: Android特殊检查
            if (isAndroid) {
                console.log('📱 Android设备额外检查...');
                // 检查系统通知是否被禁用
                if (typeof navigator.permissions !== 'undefined') {
                    try {
                        const permissionStatus = await navigator.permissions.query({ name: 'notifications' });
                        console.log('🔍 Permission API状态:', permissionStatus.state);
                        if (permissionStatus.state === 'denied') {
                            showToast('❌ 系统级通知权限被禁用<br><br>请检查：<br>1. 系统设置 → 应用 → ' + browserName + ' → 通知<br>2. 确保浏览器有通知权限', 6000);
                            return;
                        }
                    } catch (e) {
                        console.warn('⚠️ Permission API不可用:', e);
                    }
                }
            }
            
            // 开始请求权限
            console.log('🚀 调用 Notification.requestPermission()');
            showToast('⏳ 正在请求通知权限...', 2000);
            
            try {
                const permission = await Notification.requestPermission();
                console.log('📊 权限请求结果:', permission);
                
                if (permission === 'granted') {
                    console.log('✅ 权限授予成功');
                    showToast('✅ 通知权限已授权');
                    updateNotificationUI('granted', deviceType, browserName);
                    // 发送测试通知
                    sendTestNotification(deviceType, browserName);
                    
                    // 尝试注册Service Worker（如果支持）
                    if ('serviceWorker' in navigator) {
                        registerServiceWorker();
                    }
                } else if (permission === 'denied') {
                    console.warn('❌ 用户拒绝了权限');
                    if (isAndroid) {
                        showToast('❌ 通知权限被拒绝<br><br>常见原因：<br>1. 点击了"阻止"按钮<br>2. 系统通知被关闭<br>3. 浏览器通知被禁用<br><br>请手动在浏览器设置中开启', 6000);
                    } else {
                        showToast('❌ 通知权限被拒绝');
                    }
                    updateNotificationUI('denied', deviceType, browserName);
                } else {
                    console.log('⚠️ 权限状态为 default（关闭了弹窗）');
                    showToast('⚠️ 您关闭了权限请求弹窗<br>请再次点击"请求授权"', 3000);
                    updateNotificationUI('default', deviceType, browserName);
                }
            } catch (error) {
                console.error('❌ 请求通知权限异常:', error);
                console.error('错误堆栈:', error.stack);
                
                if (isIOS) {
                    showToast('❌ iOS设备需要从主屏幕图标打开才能授权通知', 4000);
                } else if (isAndroid) {
                    showToast(`❌ 请求失败<br><br>错误信息: ${error.message}<br><br>可能原因：<br>1. 浏览器版本过旧<br>2. 系统通知被禁用<br>3. 浏览器通知被禁用<br><br>请检查系统设置和浏览器设置`, 6000);
                } else {
                    showToast('❌ 请求通知权限失败: ' + error.message, 4000);
                }
            }
        }
        
        // 更新通知UI
        function updateNotificationUI(status, deviceType = 'Desktop', browserName = 'Unknown') {
            const statusText = document.getElementById('notification-status-text');
            const toggleBtn = document.getElementById('notification-toggle-btn');
            
            if (statusText) {
                statusText.textContent = status === 'granted' ? `已授权 (${deviceType} · ${browserName})` :
                                        status === 'denied' ? '已拒绝' : '未设置';
            }
            
            if (toggleBtn) {
                toggleBtn.textContent = status === 'granted' ? '已开启' : '请求授权';
                toggleBtn.dataset.status = status;
            }
        }
        
        // 检查Service Worker状态
        async function checkServiceWorkerStatus() {
            const statusText = document.getElementById('sw-status-text');
            const statusBadge = document.getElementById('sw-status-badge');
            
            if (!('serviceWorker' in navigator)) {
                console.warn('⚠️ 浏览器不支持 Service Worker');
                if (statusText) statusText.textContent = '不支持';
                if (statusBadge) {
                    statusBadge.textContent = '不支持';
                    statusBadge.style.background = '#9e9e9e';
                    statusBadge.style.color = '#fff';
                }
                return;
            }
            
            // 检查协议是否支持（file:// 协议不支持 Service Worker）
            if (location.protocol === 'file:') {
                console.warn('⚠️ file:// 协议不支持 Service Worker，请使用 http:// 或 https:// 访问');
                if (statusText) statusText.textContent = '不支持（file://协议）';
                if (statusBadge) {
                    statusBadge.textContent = '不支持';
                    statusBadge.style.background = '#9e9e9e';
                    statusBadge.style.color = '#fff';
                }
                return;
            }
            
            try {
                // 等待一下，让 background-keep-alive.js 有时间注册 Service Worker
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const registration = await navigator.serviceWorker.getRegistration();
                
                if (registration) {
                    // 检查 Service Worker 的状态
                    const sw = registration.active || registration.waiting || registration.installing;
                    
                    if (registration.active) {
                        console.log('✅ Service Worker 运行中');
                        if (statusText) statusText.textContent = '运行中';
                        if (statusBadge) {
                            statusBadge.textContent = '运行中';
                            statusBadge.style.background = '#4caf50';
                            statusBadge.style.color = '#fff';
                        }
                    } else if (registration.waiting) {
                        console.log('⏳ Service Worker 等待激活');
                        if (statusText) statusText.textContent = '等待激活';
                        if (statusBadge) {
                            statusBadge.textContent = '等待激活';
                            statusBadge.style.background = '#2196f3';
                            statusBadge.style.color = '#fff';
                        }
                    } else if (registration.installing) {
                        console.log('⏳ Service Worker 安装中');
                        if (statusText) statusText.textContent = '安装中';
                        if (statusBadge) {
                            statusBadge.textContent = '安装中';
                            statusBadge.style.background = '#2196f3';
                            statusBadge.style.color = '#fff';
                        }
                        
                        // 安装中，1秒后再次检查
                        setTimeout(() => checkServiceWorkerStatus(), 1000);
                    }
                } else {
                    console.warn('⚠️ Service Worker 未注册');
                    if (statusText) statusText.textContent = '未激活';
                    if (statusBadge) {
                        statusBadge.textContent = '未激活';
                        statusBadge.style.background = '#ff9800';
                        statusBadge.style.color = '#fff';
                    }
                }
            } catch (error) {
                console.error('检查Service Worker状态失败:', error);
                if (statusText) statusText.textContent = '检测失败';
                if (statusBadge) {
                    statusBadge.textContent = '检测失败';
                    statusBadge.style.background = '#f44336';
                    statusBadge.style.color = '#fff';
                }
            }
        }
        
        // 注册Service Worker
        async function registerServiceWorker() {
            if (!('serviceWorker' in navigator)) {
                console.log('浏览器不支持Service Worker');
                showToast('❌ 浏览器不支持 Service Worker');
                return;
            }
            
            // 检查协议
            if (location.protocol === 'file:') {
                console.error('❌ file:// 协议不支持 Service Worker');
                showToast('❌ Service Worker 需要 HTTP/HTTPS 环境<br><br>请使用本地服务器运行：<br>python -m http.server 8000', 6000);
                return;
            }
            
            try {
                // 检查是否已经注册过（避免重复注册）
                const existingRegistration = await navigator.serviceWorker.getRegistration();
                if (existingRegistration) {
                    console.log('✅ Service Worker 已经注册，无需重复注册');
                    showToast('✅ 后台服务已在运行');
                    checkServiceWorkerStatus();
                    return;
                }
                
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('✅ Service Worker注册成功:', registration);
                
                // 等待激活
                await navigator.serviceWorker.ready;
                
                // 更新UI
                checkServiceWorkerStatus();
                
                showToast('✅ 后台服务已激活');
            } catch (error) {
                console.error('❌ Service Worker注册失败:', error);
                
                // 根据错误类型提供更详细的提示
                let errorMsg = '⚠️ 后台服务激活失败';
                if (error.name === 'SecurityError') {
                    errorMsg = '❌ 安全错误：需要 HTTPS 或 localhost 环境';
                } else if (error.message.includes('protocol')) {
                    errorMsg = '❌ 协议错误：请使用 http:// 或 https:// 访问';
                } else {
                    errorMsg = `❌ 激活失败: ${error.message}`;
                }
                
                showToast(errorMsg, 5000);
            }
        }
        
        // 发送测试通知
        function sendTestNotification(deviceType = 'Desktop', browserName = 'Unknown') {
            if (Notification.permission === 'granted') {
                const notificationOptions = {
                    body: '通知功能已成功开启！',
                    icon: 'https://image.uglycat.cc/qs8mf5.png',
                    badge: 'https://image.uglycat.cc/qs8mf5.png',
                    tag: 'test-notification',
                    requireInteraction: false,
                    silent: false
                };
                
                // 如果有Service Worker，使用它发送通知（更可靠）
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification('喵机1号', notificationOptions);
                    }).catch(error => {
                        console.error('通过Service Worker发送通知失败:', error);
                        // 降级使用普通Notification API
                        new Notification('喵机1号', notificationOptions);
                    });
                } else {
                    const notification = new Notification('喵机1号', notificationOptions);
                    
                    notification.onclick = function() {
                        window.focus();
                        notification.close();
                    };
                    
                    // 3秒后自动关闭
                    setTimeout(() => {
                        notification.close();
                    }, 3000);
                }
            }
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
                        groupChatGroups: AppState.groupChatGroups || [],
                        conversations: AppState.conversations || [],
                        messages: AppState.messages || {},
                        emojis: AppState.emojis || [],
                        emojiGroups: AppState.emojiGroups || [],
                        worldbooks: AppState.worldbooks || [],
                        user: AppState.user || {},
                        apiSettings: AppState.apiSettings || {},
                        collections: AppState.collections || [],
                        walletHistory: AppState.walletHistory || [],
                        fontStore: AppState.fontStore || {},
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
                const modal = document.getElementById('settings-page-modal');
                if (modal) {
                    modal.remove();
                }
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
                        AppState.groupChatGroups = Array.isArray(appState.groupChatGroups) ? appState.groupChatGroups : AppState.groupChatGroups;
                        AppState.conversations = Array.isArray(appState.conversations) ? appState.conversations : [];
                        AppState.messages = typeof appState.messages === 'object' ? appState.messages : {};
                        AppState.emojis = Array.isArray(appState.emojis) ? appState.emojis : [];
                        AppState.emojiGroups = Array.isArray(appState.emojiGroups) ? appState.emojiGroups : [];
                        AppState.worldbooks = Array.isArray(appState.worldbooks) ? appState.worldbooks : [];
                        AppState.collections = Array.isArray(appState.collections) ? appState.collections : [];
                        AppState.walletHistory = Array.isArray(appState.walletHistory) ? appState.walletHistory : [];
                        AppState.fontStore = appState.fontStore && typeof appState.fontStore === 'object'
                            ? appState.fontStore
                            : { owned: [] };
                        if (!Array.isArray(AppState.fontStore.owned)) {
                            AppState.fontStore.owned = [];
                        }
                        
                        if (appState.user && typeof appState.user === 'object') {
                            AppState.user = Object.assign(AppState.user, appState.user);
                        }
                        
                        if (appState.apiSettings && typeof appState.apiSettings === 'object') {
                            AppState.apiSettings = Object.assign(AppState.apiSettings, appState.apiSettings);
                        }
                        
                        if (appState.dynamicFuncs && typeof appState.dynamicFuncs === 'object') {
                            AppState.dynamicFuncs = Object.assign(AppState.dynamicFuncs, appState.dynamicFuncs);
                        }

                        if (!Array.isArray(AppState.groupChatGroups) || AppState.groupChatGroups.length === 0) {
                            AppState.groupChatGroups = [
                                { id: 'group_default', name: '默认分组', memberIds: [] }
                            ];
                        } else if (!AppState.groupChatGroups.some(g => g.id === 'group_default')) {
                            AppState.groupChatGroups.unshift({ id: 'group_default', name: '默认分组', memberIds: [] });
                        }

                        if (Array.isArray(AppState.groups)) {
                            const defaultGroupId = AppState.groupChatGroups.some(g => g.id === 'group_default')
                                ? 'group_default'
                                : (AppState.groupChatGroups[0] ? AppState.groupChatGroups[0].id : 'group_default');
                            AppState.groups.forEach(group => {
                                if (!group.groupChatGroupId || !AppState.groupChatGroups.some(g => g.id === group.groupChatGroupId)) {
                                    group.groupChatGroupId = defaultGroupId;
                                }
                            });
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
        function initAddFriendPersonaSection() {
            if (window.UserPersonaManager && typeof window.UserPersonaManager.initUserPersonas === 'function') {
                window.UserPersonaManager.initUserPersonas();
            }

            const personaSelect = document.getElementById('af-user-persona-select');
            const userNameInput = document.getElementById('af-user-name-input');
            const userNicknameInput = document.getElementById('af-user-nickname-input');
            const userDescInput = document.getElementById('af-user-desc-input');

            const personas = Array.isArray(AppState.userPersonas) ? AppState.userPersonas : [];
            const defaultPersona = personas.find(p => p.id === AppState.defaultPersonaId) || personas[0] || null;

            if (personaSelect) {
                personaSelect.innerHTML = `
                    <option value="">使用默认人设</option>
                    ${personas.map(p => `
                        <option value="${p.id}">
                            ${escapeHtml(p.name)}${p.id === AppState.defaultPersonaId ? ' (默认)' : ''}
                        </option>
                    `).join('')}
                `;
                personaSelect.value = '';
            }

            if (userNameInput) {
                userNameInput.value = (defaultPersona && defaultPersona.userName) || (AppState.user && AppState.user.name) || '用户';
            }

            if (userNicknameInput) {
                userNicknameInput.value = (AppState.user && AppState.user.nickname) || '';
            }

            if (userDescInput) {
                userDescInput.value = (defaultPersona && defaultPersona.personality) || (AppState.user && AppState.user.personality) || '';
            }

            const manageBtn = document.getElementById('af-manage-personas-btn');
            if (manageBtn) {
                manageBtn.onclick = function() {
                    if (window.UserPersonaManager && typeof window.UserPersonaManager.openPersonaManager === 'function') {
                        window.UserPersonaManager.openPersonaManager();
                    } else {
                        showToast('人设管理器未加载');
                    }
                };
            }

            const applyBtn = document.getElementById('af-apply-persona-btn');
            if (applyBtn) {
                applyBtn.onclick = function() {
                    applyAddFriendPersonaSelection();
                };
            }
        }

        function initAddFriendGroupSelect() {
            const groupSelect = document.getElementById('af-friend-group-select');
            if (!groupSelect) return;

            const sourceGroups = Array.isArray(AppState.friendGroups) ? AppState.friendGroups.slice() : [];
            if (!sourceGroups.some(group => group.id === 'group_default')) {
                sourceGroups.unshift({ id: 'group_default', name: '默认分组', memberIds: [] });
            }

            groupSelect.innerHTML = sourceGroups.map(group => {
                const label = escapeHtml(group.name || '未命名分组');
                return `<option value="${group.id}">${label}</option>`;
            }).join('');

            groupSelect.value = 'group_default';
        }

        function applyAddFriendPersonaSelection() {
            const personaSelect = document.getElementById('af-user-persona-select');
            const userNameInput = document.getElementById('af-user-name-input');
            const userDescInput = document.getElementById('af-user-desc-input');

            if (!personaSelect) return;

            const personas = Array.isArray(AppState.userPersonas) ? AppState.userPersonas : [];
            const selectedPersonaId = personaSelect.value;

            if (selectedPersonaId) {
                const persona = personas.find(p => p.id === selectedPersonaId);
                if (!persona) {
                    showToast('所选人设不存在');
                    return;
                }

                if (userNameInput) userNameInput.value = persona.userName || (AppState.user && AppState.user.name) || '用户';
                if (userDescInput) userDescInput.value = persona.personality || '';
                showToast('已应用人设: ' + persona.name);
                return;
            }

            const defaultPersona = personas.find(p => p.id === AppState.defaultPersonaId) || personas[0] || null;
            if (userNameInput) userNameInput.value = (defaultPersona && defaultPersona.userName) || (AppState.user && AppState.user.name) || '用户';
            if (userDescInput) userDescInput.value = (defaultPersona && defaultPersona.personality) || (AppState.user && AppState.user.personality) || '';
            showToast('已应用默认人设');
        }

        function setAddFriendCardCollapsed(card, collapsed) {
            if (!card) return;

            const header = card.querySelector('.card-header');
            card.classList.toggle('af-collapsed', !!collapsed);

            if (header) {
                header.setAttribute('aria-expanded', String(!collapsed));
            }
        }

        function resetAddFriendCardCollapseState() {
            const addFriendPage = document.getElementById('add-friend-page');
            if (!addFriendPage) return;

            addFriendPage.querySelectorAll('.settings-card').forEach(card => {
                setAddFriendCardCollapsed(card, true);
            });
        }

        function initAddFriendCardCollapse() {
            const addFriendPage = document.getElementById('add-friend-page');
            if (!addFriendPage) return;

            const cards = addFriendPage.querySelectorAll('.settings-card');
            cards.forEach((card, index) => {
                const header = card.querySelector('.card-header');
                const body = card.querySelector('.card-body');
                if (!header || !body) return;

                header.classList.add('af-collapsible-header');
                header.setAttribute('role', 'button');
                header.setAttribute('tabindex', '0');

                if (!body.id) {
                    body.id = `af-card-body-${index + 1}`;
                }
                header.setAttribute('aria-controls', body.id);

                if (header.dataset.afCollapseBound === '1') {
                    return;
                }
                header.dataset.afCollapseBound = '1';

                const toggleCard = function() {
                    const isCollapsed = card.classList.contains('af-collapsed');
                    setAddFriendCardCollapsed(card, !isCollapsed);
                };

                header.addEventListener('click', function(e) {
                    e.preventDefault();
                    toggleCard();
                });

                header.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleCard();
                    }
                });
            });

            resetAddFriendCardCollapseState();
        }

        function openAddFriendPage() {
            document.getElementById('add-friend-page').classList.add('open');
            resetAddFriendCardCollapseState();
            initAddFriendPersonaSection();
            initAddFriendGroupSelect();
            
            // 初始化头像选择器
            setTimeout(() => {
                // 好友头像处理
                const afAvatarPicker = document.getElementById('af-avatar-picker');
                const afFileInput = document.getElementById('af-avatar-file-input');
                
                if (afAvatarPicker && afFileInput) {
                    afAvatarPicker.addEventListener('click', function() {
                        afFileInput.click();
                    });
                    
                    afFileInput.addEventListener('change', function() {
                        const file = this.files[0];
                        if (!file || !file.type.startsWith('image/')) return;
                        
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            document.getElementById('friend-avatar-input').value = e.target.result;
                            afAvatarPicker.innerHTML = '<img src="' + e.target.result + '" alt="" style="width:100%;height:100%;object-fit:cover;">';
                            const afAvatarLabel = afAvatarPicker.closest('.avatar-wrapper').querySelector('.avatar-label');
                            if (afAvatarLabel) afAvatarLabel.textContent = '点击更换头像';
                        };
                        reader.readAsDataURL(file);
                    });
                }
                
                // 用户头像处理
                const afUserAvatarPicker = document.getElementById('af-user-avatar-picker');
                const afUserFileInput = document.getElementById('af-user-avatar-file-input');
                
                if (afUserAvatarPicker && afUserFileInput) {
                    afUserAvatarPicker.addEventListener('click', function() {
                        afUserFileInput.click();
                    });
                    
                    afUserFileInput.addEventListener('change', function() {
                        const file = this.files[0];
                        if (!file || !file.type.startsWith('image/')) return;
                        
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            document.getElementById('friend-user-avatar-input').value = e.target.result;
                            afUserAvatarPicker.innerHTML = '<img src="' + e.target.result + '" alt="" style="width:100%;height:100%;object-fit:cover;">';
                            const afUserAvatarLabel = afUserAvatarPicker.closest('.avatar-wrapper').querySelector('.avatar-label');
                            if (afUserAvatarLabel) afUserAvatarLabel.textContent = '点击更换头像';
                        };
                        reader.readAsDataURL(file);
                    });
                }
            }, 100);
        }

        function closeAddFriendPage() {
            document.getElementById('add-friend-page').classList.remove('open');
            // 清空输入
            document.getElementById('friend-name-input').value = '';
            document.getElementById('friend-char-nickname-input').value = '';
            document.getElementById('friend-remark-input').value = '';
            document.getElementById('friend-avatar-input').value = '';
            document.getElementById('friend-user-avatar-input').value = '';
            document.getElementById('friend-desc-input').value = '';
            document.getElementById('af-user-name-input').value = '';
            document.getElementById('af-user-nickname-input').value = '';
            document.getElementById('af-user-desc-input').value = '';
            const afPersonaSelect = document.getElementById('af-user-persona-select');
            if (afPersonaSelect) afPersonaSelect.value = '';
            const afGroupSelect = document.getElementById('af-friend-group-select');
            if (afGroupSelect) afGroupSelect.value = 'group_default';
            document.getElementById('friend-greeting-input').value = '';
            
            // 重置头像预览
            const afAvatarPicker = document.getElementById('af-avatar-picker');
            if (afAvatarPicker) {
                afAvatarPicker.innerHTML = '';
            }
            // 重置头像标签
            const afAvatarLabel = afAvatarPicker && afAvatarPicker.closest('.avatar-wrapper') && afAvatarPicker.closest('.avatar-wrapper').querySelector('.avatar-label');
            if (afAvatarLabel) afAvatarLabel.textContent = '好友头像';
            
            // 重置用户头像预览
            const afUserAvatarPicker = document.getElementById('af-user-avatar-picker');
            if (afUserAvatarPicker) {
                afUserAvatarPicker.innerHTML = '';
            }
            // 重置用户头像标签
            const afUserAvatarLabel = afUserAvatarPicker && afUserAvatarPicker.closest('.avatar-wrapper') && afUserAvatarPicker.closest('.avatar-wrapper').querySelector('.avatar-label');
            if (afUserAvatarLabel) afUserAvatarLabel.textContent = '我的头像';
        }

        function submitAddFriend() {
            const name = document.getElementById('friend-name-input').value.trim();
            const charNickname = document.getElementById('friend-char-nickname-input').value.trim();
            const remark = document.getElementById('friend-remark-input').value.trim();
            const avatar = document.getElementById('friend-avatar-input').value.trim();
            const desc = document.getElementById('friend-desc-input').value.trim();
            const userAvatar = document.getElementById('friend-user-avatar-input').value.trim();
            const userNameForChar = document.getElementById('af-user-name-input').value.trim() || (AppState.user && AppState.user.name) || '用户';
            const userNicknameForChar = document.getElementById('af-user-nickname-input').value.trim();
            const userPersonality = document.getElementById('af-user-desc-input').value.trim();
            const selectedPersonaId = document.getElementById('af-user-persona-select').value;
            const greeting = document.getElementById('friend-greeting-input').value.trim();
            const groupSelect = document.getElementById('af-friend-group-select');
            const selectedGroupId = groupSelect ? groupSelect.value : 'group_default';
            
            if (!name) {
                showToast('未输入TA的名字');
                return;
            }
            
            const friend = {
                id: 'friend_' + Date.now(),
                name: name,
                charNickname: charNickname,
                remark: remark,  // 使用用户输入的备注
                avatar: avatar,
                description: desc,
                userNameForChar: userNameForChar,
                userNicknameForChar: userNicknameForChar,
                greeting: greeting,
                status: desc ? desc.substring(0, 20) + (desc.length > 20 ? '...' : '') : '',
                createdAt: new Date().toISOString()
            };

            let friendGroupId = selectedGroupId;
            if (!Array.isArray(AppState.friendGroups) || !AppState.friendGroups.some(group => group.id === friendGroupId)) {
                friendGroupId = 'group_default';
            }

            friend.friendGroupId = friendGroupId;
            friend.friendSortIndex = getNextFriendSortIndex(friendGroupId);
            
            AppState.friends.push(friend);
            
            // 同时添加到会话列表（同步名称和人设）
            const conv = {
                id: friend.id,
                type: 'friend',
                name: friend.name,
                charNickname: friend.charNickname,
                remark: friend.remark,  // 同步备注
                avatar: friend.avatar,
                description: friend.description,
                userAvatar: userAvatar,  // 该对话的用户头像
                userNameForChar: userNameForChar,
                userNicknameForChar: userNicknameForChar,
                greeting: greeting,
                lastMsg: friend.greeting || '',
                time: formatTime(new Date()),
                lastMessageTime: new Date().toISOString(),  // 保存完整时间戳用于排序
                unread: 0
            };

            if (selectedPersonaId) {
                conv.boundPersonaId = selectedPersonaId;
            }

            if (AppState.user) {
                AppState.user.personality = userPersonality;
                AppState.user.nickname = userNicknameForChar;
            }

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
                        isGreeting: true,
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

        // 创建群聊页面 - 委托给 GroupChat 模块
        function openCreateGroupPage() {
            if (window.GroupChat) {
                window.GroupChat.openCreateGroupPage();
            }
        }

        function closeCreateGroupPage() {
            if (window.GroupChat) {
                window.GroupChat.closeCreateGroupPage();
            }
        }

        function submitCreateGroup() {
            if (window.GroupChat) {
                window.GroupChat.submitCreateGroup();
            }
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
            const tabBar = document.getElementById('tab-bar');
            if (chatPage) {
                chatPage.classList.add('open');
            }
            // 隐藏底部导航栏（防止在聊天页面中暴露）
            if (tabBar) {
                tabBar.style.visibility = 'hidden';
                tabBar.style.pointerEvents = 'none';
            }
            
            // 聊天头部显示优先级：备注 > 网名 > 真名
            const displayName = getConversationDisplayName(conv);
            document.getElementById('chat-title').textContent = displayName;

            // 清除未读
            conv.unread = 0;
            
            // 标记AI发送的消息为已读（用户打开了聊天）
            const messages = AppState.messages[conv.id] || [];
            let hasUnreadAI = false;
            messages.forEach(msg => {
                // AI发送的消息（received类型）标记为已读
                if (msg.type === 'received' && msg.readByUser !== true) {
                    msg.readByUser = true;
                    hasUnreadAI = true;
                }
                // 其他AI发送的消息类型（语音、位置、通话等）
                if ((msg.type === 'voice' || msg.type === 'location'  || msg.type === 'videocall') && msg.sender === 'received' && msg.readByUser !== true) {
                    msg.readByUser = true;
                    hasUnreadAI = true;
                }
            });
            if (hasUnreadAI) {
                saveToStorage();
            }
            
            // 获取该对话的状态并正确显示打字状态
            const convState = getConversationState(conv.id);
            const chatTitle = document.getElementById('chat-title');
            const typingIndicator = document.getElementById('chat-typing-indicator');
            
            // 标题始终显示，打字状态用输入框上方的三点动画表示
            if (chatTitle) chatTitle.style.display = 'inline';
            if (typingIndicator) {
                typingIndicator.style.display = convState.isTyping ? 'flex' : 'none';
            }
            
            // 应用聊天背景图片（从conversation中读取）
            console.log('📱 openChat - 准备应用背景图:', {
                convId: conv?.id,
                convName: conv?.name,
                hasBgImage: !!(conv && conv.chatBgImage),
                bgImagePreview: conv?.chatBgImage ? conv.chatBgImage.substring(0, 100) : 'none'
            });
            
            if (chatPage) {
                if (window.CharacterSettingsManager && typeof window.CharacterSettingsManager.applyChatPageBackground === 'function') {
                    window.CharacterSettingsManager.applyChatPageBackground(conv && conv.chatBgImage ? conv.chatBgImage : null);
                } else if (conv && conv.chatBgImage) {
                    // 兜底逻辑（角色设置模块尚未加载时）
                    chatPage.style.backgroundImage = `url('${conv.chatBgImage}')`;
                    chatPage.style.backgroundSize = 'cover';
                    chatPage.style.backgroundPosition = 'center';
                    chatPage.style.backgroundAttachment = 'fixed';
                } else {
                    chatPage.style.backgroundImage = 'none';
                }

                setTimeout(() => {
                    const appliedBg = chatPage.style.backgroundImage;
                    console.log('🔍 openChat - 验证背景图应用结果:', appliedBg ? appliedBg.substring(0, 100) : 'none');
                }, 100);
            } else {
                console.warn('⚠️ openChat - 未找到chat-page元素');
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
            
            // 群聊模式适配（隐藏心声按钮、显示成员数等）
            if (window.GroupChat) {
                window.GroupChat.applyGroupChatMode(conv);
            }
            
            // 异步渲染消息和保存数据（避免阻塞UI）
            requestAnimationFrame(() => {
                renderChatMessagesDebounced();
                saveToStorage();
                renderConversations();
            });
        }

        function openChatWithFriend(friend) {
            // 查找或创建会话
            let conv = AppState.conversations.find(c => c.id === friend.id);

            const friendGreeting = normalizeSingleGreetingText(friend);
            
            if (!conv) {
                conv = {
                    id: friend.id,
                    type: 'friend',
                    name: friend.name,
                    charNickname: friend.charNickname || '',
                    remark: friend.remark || '',  // 保存备注
                    avatar: friend.avatar,
                    description: friend.description || '',
                    userAvatar: '',  // 该对话的用户头像
                    userNicknameForChar: friend.userNicknameForChar || '',
                    greeting: friendGreeting,
                    lastMsg: friendGreeting || '',
                    time: formatTime(new Date()),
                    lastMessageTime: new Date().toISOString(),  // 保存完整时间戳用于排序
                    unread: 0
                };
                AppState.conversations.unshift(conv);
                
                // 初始化消息并添加开场白
                if (!AppState.messages[friend.id]) {
                    AppState.messages[friend.id] = [];
                    // 如果有开场白，添加为首条消息（由角色主动发出）
                    if (friendGreeting) {
                        AppState.messages[friend.id].push({
                            id: 'msg_' + Date.now(),
                            type: 'received',
                            content: friendGreeting,
                            isGreeting: true,
                            time: new Date().toISOString()
                        });
                    }
                }
                
                saveToStorage();
                renderConversations();
            }

            // 会话已存在时，同步单开场白
            conv.greeting = friendGreeting;
            
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
                    description: group.description || '',
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
            
            const chatPage = document.getElementById('chat-page');
            chatPage.classList.remove('open');
            chatPage.classList.remove('group-chat-mode');
            
            // 移除群聊成员数显示
            const memberCount = chatPage.querySelector('.group-chat-member-count');
            if (memberCount) memberCount.remove();
            
            // 显示底部导航栏
            const tabBar = document.getElementById('tab-bar');
            if (tabBar) {
                tabBar.style.visibility = '';
                tabBar.style.pointerEvents = '';
            }

            // 不清除AppState.currentChat，让打字状态保持为该对话的状态
            // 这样当用户返回时，打字状态会被正确恢复
        }

        // 消息长按菜单状态（保留以防兼容）
        let messageContextState = {
            selectedMessages: [],
            isMultiSelectMode: false
        };

        // 虚拟滚动：渲染指定范围的消息（使用DocumentFragment优化）
        function renderMessageRange(startIndex, endIndex, append = false) {
            const container = document.getElementById('chat-messages');
            const messages = AppState.messages[AppState.currentChat.id] || [];
            
            // 限制索引范围
            startIndex = Math.max(0, startIndex);
            endIndex = Math.min(messages.length, endIndex);
            
            // 使用DocumentFragment批量插入，减少重排
            const fragment = document.createDocumentFragment();
            const tempContainer = document.createElement('div');
            
            // 渲染指定范围的消息到临时容器
            for (let index = startIndex; index < endIndex; index++) {
                const msg = messages[index];
                renderSingleMessage(msg, index, tempContainer);
            }
            
            // 将临时容器的内容移到fragment
            while (tempContainer.firstChild) {
                fragment.appendChild(tempContainer.firstChild);
            }
            
            // 一次性插入DOM
            if (!append) {
                container.innerHTML = '';
            }
            container.appendChild(fragment);
        }
        
        // 渲染单条消息（从原renderChatMessages中提取）
        function renderSingleMessage(msg, index, container) {
            const messages = AppState.messages[AppState.currentChat.id] || [];
            
            // 处理单条消息的渲染逻辑
            {
                // 系统消息通常不显示给用户
                if (msg.type === 'system') {
                    return;
                }

                // 网名变更消息：显示为中心提示（类似撤回消息）
                if (msg.type === 'nickname_change') {
                    const nicknameWrapper = document.createElement('div');
                    nicknameWrapper.className = 'nickname-change-message-wrapper';
                    nicknameWrapper.dataset.messageId = msg.id;
                    nicknameWrapper.style.cssText = `
                        text-align: center;
                        margin: 8px 0;
                        padding: 8px 0;
                        user-select: none;
                        -webkit-user-select: none;
                        -webkit-touch-callout: none;
                    `;

                    const nicknameNotice = document.createElement('div');
                    nicknameNotice.style.cssText = `
                        color: #999;
                        font-size: 12px;
                        display: inline-block;
                        padding: 6px 12px;
                        border-radius: 12px;
                        background: rgba(0, 0, 0, 0.04);
                        max-width: 86%;
                        word-break: break-word;
                    `;
                    nicknameNotice.textContent = msg.content || '网名已更新';

                    nicknameWrapper.appendChild(nicknameNotice);
                    return nicknameWrapper;
                }
                
                // 一起听邀请消息用listen_invite类型处理（卡片样式）
                if (msg.type === 'listen_invite') {
                    // 继续走正常消息流程，在messageContent中显示卡片样式
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
                        }, 500);
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
                    
                    // 多选模式下的点击事件
                    if (AppState.isSelectMode) {
                        // 添加选中状态类
                        if (AppState.selectedMessages.includes(msg.id)) {
                            retractWrapper.classList.add('selected');
                        }
                        
                        retractWrapper.addEventListener('click', (e) => {
                            e.stopPropagation();
                            toggleMessageSelection(msg.id);
                            // 手动切换选中样式
                            if (AppState.selectedMessages.includes(msg.id)) {
                                retractWrapper.classList.add('selected');
                            } else {
                                retractWrapper.classList.remove('selected');
                            }
                        });
                        retractWrapper.style.cursor = 'pointer';
                    }
                    
                    // 返回元素而不是直接添加到DOM
                    return retractWrapper;
                }
                
                const bubble = document.createElement('div');
                const isSelected = AppState.selectedMessages.includes(msg.id);
                // 对于语音、地理位置、通话、红包、转账和商品卡片消息，使用sender属性来设置样式（sent/received）；其他消息使用type
                let bubbleClass = (msg.type === 'voice' || msg.type === 'location' || msg.type === 'voicecall' || msg.type === 'videocall' || msg.type === 'redenvelope' || msg.type === 'transfer' || msg.type === 'goods_card' || msg.type === 'listen_invite') ? msg.sender : msg.type;
                let className = 'chat-bubble ' + bubbleClass;
                if (isSelected) {
                    className += ' selected';
                }
                bubble.className = className;
                bubble.dataset.msgId = msg.id;
                bubble.dataset.msgIndex = index;
                
                let avatarContent;
                // 对于语音、地理位置、通话、红包、转账和商品卡片消息，使用sender属性判断；其他消息使用type
                const isSentMessage = (msg.type === 'voice' || msg.type === 'location' || msg.type === 'voicecall' || msg.type === 'videocall' || msg.type === 'redenvelope' || msg.type === 'transfer' || msg.type === 'goods_card' || msg.type === 'listen_invite')
                    ? msg.sender === 'sent'
                    : msg.type === 'sent';
                
                if (isSentMessage) {
                    // 使用对话级别的用户头像，如果没有设置则使用侧边栏头像
                    const userAvatar = AppState.currentChat.userAvatar || AppState.user.avatar;
                    avatarContent = userAvatar
                        ? `<img src="${userAvatar}" alt="">`
                        : AppState.user.name.charAt(0);
                } else {
                    // 群聊：使用对应成员的头像
                    if (AppState.currentChat.type === 'group' && msg.groupSenderName && window.GroupChat) {
                        const memberAvatar = window.GroupChat.getGroupMemberAvatar(AppState.currentChat, msg.groupSenderName);
                        avatarContent = memberAvatar
                            ? `<img src="${memberAvatar}" alt="">`
                            : (msg.groupSenderName ? msg.groupSenderName.charAt(0) : '?');
                    } else {
                        avatarContent = AppState.currentChat.avatar
                            ? `<img src="${AppState.currentChat.avatar}" alt="">`
                            : AppState.currentChat.name.charAt(0);
                    }
                }
                
                // 群聊发送者名称标记（用于在气泡上方显示）
                let groupSenderNameHtml = '';
                if (AppState.currentChat.type === 'group' && !isSentMessage && msg.groupSenderName) {
                    groupSenderNameHtml = `<div class="group-msg-sender-name">${msg.groupSenderName}</div>`;
                }
                
                let textContent = `<div class="chat-text">`;
                
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
                // ⭐ 图片描述消息优先检查
                if (msg.isPhotoDescription) {
                    // 图片描述消息：清空textContent，将由下面的bubble.innerHTML处理
                    textContent = ``;
                } else if (msg.isForward && msg.forwardedMoment) {
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
                } else if (msg.type === 'voicecall') {
                    // 语音通话消息：显示通话状态卡片
                    textContent = ``; // 清空，由下面的bubble.innerHTML处理
                } else if (msg.type === 'videocall') {
                    // 视频通话消息：显示通话状态卡片
                    textContent = ``; // 清空，由下面的bubble.innerHTML处理
                } else if (msg.type === 'goods_card') {
                    // 商品卡片消息：显示商品卡片
                    textContent = ``; // 清空，由下面的bubble.innerHTML处理
                } else if (msg.type === 'listen_invite') {
                    // 一起听邀请卡片消息
                    textContent = ``; // 清空，由下面的bubble.innerHTML处理
                } else if (msg.musicCard) {
                    // 音乐分享卡片
                    const mc = msg.musicCard;
                    textContent = `<div class="music-share-card" style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(0,0,0,0.03);border-radius:10px;min-width:200px;max-width:260px;cursor:pointer;">
                        <img src="${mc.pic || ''}" style="width:48px;height:48px;border-radius:6px;object-fit:cover;background:#eee;" onerror="this.style.background='#ddd'">
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(mc.name || '')}</div>
                            <div style="font-size:12px;color:#999;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(mc.artist || '')}</div>
                        </div>
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#ec4141"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                    </div>`;
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
                    // 渲染HTML内容（支持用户和AI消息都显示HTML格式）
                    textContent += renderHtmlContent(msg.content);
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
                        <div class="voice-bubble" role="button" tabindex="0" aria-label="语音条，时长${duration}秒">
                            <div class="voice-waveform">
                                <span class="wave"></span>
                                <span class="wave"></span>
                                <span class="wave"></span>
                                <span class="wave"></span>
                            </div>
                            <div class="voice-duration">${duration}秒</div>
                        </div>
                    `;
                    bubble.classList.add('voice-message');
                } else if (msg.type === 'location') {
                    // 地理位置消息渲染 - 浅粉白卡片样式（详细地址 + 距离）
                    const rawLocationAddress = String(msg.locationAddress || msg.locationName || '').trim();
                    const locationAddress = escapeHtml(rawLocationAddress || '未填写详细地址');
                    const locationDistanceKm = normalizeMessageDistanceKm(msg.locationDistance, msg.locationDistanceUnit, 1);
                    const locationDistanceLabel = formatLocationDistanceKm(locationDistanceKm);
                    const senderName = msg.sender === 'sent' ? AppState.user.name : AppState.currentChat.name;
                    const geoMeta = msg.geoMeta && typeof msg.geoMeta === 'object' ? msg.geoMeta : null;
                    const geoLat = geoMeta ? Number(geoMeta.lat) : NaN;
                    const geoLng = geoMeta ? Number(geoMeta.lng) : NaN;
                    const locationMeta = (Number.isFinite(geoLat) && Number.isFinite(geoLng))
                        ? `真实定位 · ${geoLat.toFixed(4)}, ${geoLng.toFixed(4)}`
                        : `${escapeHtml(senderName)} 发送`;

                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
                        <div class="location-bubble">
                            <div class="location-map-preview">
                                <span class="location-map-pin"></span>
                            </div>
                            <div class="location-card-body">
                                <div class="location-card-row">
                                    <div class="location-card-title">地理位置</div>
                                    <div class="location-card-distance">约${locationDistanceLabel}km</div>
                                </div>
                                <div class="location-card-address">${locationAddress}</div>
                                <div class="location-card-meta">${locationMeta}</div>
                            </div>
                        </div>
                    `;
                    bubble.classList.add('location-message');
                } else if (msg.type === 'voicecall') {
                    // 语音通话消息渲染
                    // 通话时长格式化辅助函数（供语音通话和视频通话共用）
                    const formatDuration = (seconds) => {
                        const mins = Math.floor(seconds / 60);
                        const secs = seconds % 60;
                        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                    };
                    
                    const callStatus = msg.callStatus || 'calling';
                    const callDuration = msg.callDuration || 0;
                    const senderName = msg.sender === 'sent' ? AppState.user.name : AppState.currentChat.name;
                    
                    let statusText = '';
                    let statusIcon = '';
                    let durationText = '';
                    
                    if (callStatus === 'calling') {
                        statusText = `语音通话中`;
                        statusIcon = `<div class="voicecall-icon calling-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" fill="currentColor"/>
                            </svg>
                        </div>`;
                    } else if (callStatus === 'cancelled') {
                        statusText = `已取消`;
                        statusIcon = `<div class="voicecall-icon cancelled-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" fill="currentColor"/>
                            </svg>
                        </div>`;
                    } else if (callStatus === 'ended') {
                        const durationText = callDuration > 0 ? formatDuration(callDuration) : '';
                        statusText = durationText ? `已挂断，${durationText}` : `已挂断，由${senderName}挂断`;
                        statusIcon = `<div class="voicecall-icon ended-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" fill="currentColor"/>
                            </svg>
                        </div>`;
                    }
                    
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
                        <div class="voicecall-bubble ${callStatus}">
                            ${statusIcon}
                            <div class="voicecall-info">
                                <div class="voicecall-title">语音通话</div>
                                <div class="voicecall-status">${escapeHtml(statusText)}${durationText ? ' ' + durationText : ''}</div>
                            </div>
                        </div>
                    `;
                    bubble.classList.add('voicecall-message');
                } else if (msg.type === 'videocall') {
                    // 视频通话消息渲染
                    // 通话时长格式化辅助函数（供语音通话和视频通话共用）
                    const formatDuration = (seconds) => {
                        const mins = Math.floor(seconds / 60);
                        const secs = seconds % 60;
                        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                    };
                    
                    const callStatus = msg.callStatus || 'calling';
                    const callDuration = msg.callDuration || 0;
                    const senderName = msg.sender === 'sent' ? AppState.user.name : AppState.currentChat.name;
                    
                    console.log('[VideoCall Render] 渲染视频通话卡片:', {
                        callStatus: callStatus,
                        callDuration: callDuration,
                        messageId: msg.id
                    });
                    
                    let statusText = '';
                    let statusIcon = '';
                    let durationText = '';
                    
                    if (callStatus === 'calling') {
                        statusText = `视频通话中`;
                        statusIcon = `<div class="videocall-icon calling-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
                            </svg>
                        </div>`;
                    } else if (callStatus === 'cancelled') {
                        statusText = `已取消`;
                        statusIcon = `<div class="videocall-icon cancelled-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" fill="currentColor"/>
                            </svg>
                        </div>`;
                    } else if (callStatus === 'ended') {
                        const durationText = callDuration > 0 ? formatDuration(callDuration) : '';
                        statusText = durationText ? `已挂断，${durationText}` : `已挂断`;
                        console.log('[VideoCall Render] ended状态 - callDuration:', callDuration, 'durationText:', durationText);
                        statusIcon = `<div class="videocall-icon ended-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
                            </svg>
                        </div>`;
                    }
                    
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
                        <div class="videocall-bubble ${callStatus}">
                            ${statusIcon}
                            <div class="videocall-info">
                                <div class="videocall-title">视频通话</div>
                                <div class="videocall-status">${escapeHtml(statusText)}${durationText ? ' ' + durationText : ''}</div>
                            </div>
                        </div>
                    `;
                    bubble.classList.add('videocall-message');
                } else if (msg.type === 'redenvelope') {
                    // 红包消息渲染
                    // 优先从RedEnvelopeModule获取最新状态
                    let envelopeData = null;
                    if (window.RedEnvelopeModule) {
                        envelopeData = window.RedEnvelopeModule.getRedEnvelope(msg.id);
                    }
                    
                    // 如果Map中没有，从消息数组中获取最新数据
                    if (!envelopeData) {
                        const convId = AppState.currentChat?.id;
                        if (convId && AppState.messages[convId]) {
                            const latestMsg = AppState.messages[convId].find(m => m.id === msg.id);
                            envelopeData = latestMsg || msg;
                        } else {
                            envelopeData = msg;
                        }
                    }
                    
                    console.log('🧧 渲染红包:', msg.id, '状态:', envelopeData.status, '来源:', envelopeData === msg ? 'msg参数' : 'Map/消息数组');
                    
                    if (!envelopeData.amount) {
                        console.warn('红包数据不完整:', msg.id, envelopeData);
                        return;
                    }
                    
                    const isSent = msg.sender === 'sent';
                    const senderName = isSent ? AppState.user.name : AppState.currentChat.name;
                    const status = envelopeData.status || 'pending';
                    
                    let statusClass = status;
                    let statusText = '';
                    
                    if (status === 'pending') {
                        statusText = isSent ? '等待领取' : '点击领取';
                    } else if (status === 'received') {
                        statusText = '已领取';
                    } else if (status === 'returned') {
                        statusText = '已退还';
                    }
                    
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
                        <div class="red-envelope-card ${statusClass}" onclick="RedEnvelopeModule.openDetailModal('${msg.id}')">
                            <div class="red-envelope-card-header">
                                <div class="red-envelope-card-icon"></div>
                                <div class="red-envelope-card-text">
                                    <div class="red-envelope-card-title">${escapeHtml(envelopeData.message || '恭喜发财，大吉大利')}</div>
                                </div>
                            </div>
                            <div class="red-envelope-card-divider"></div>
                            <div class="red-envelope-card-subtitle">${statusText}</div>
                        </div>
                    `;
                    bubble.classList.add('redenvelope-message');
                } else if (msg.type === 'transfer') {
                    // 转账消息渲染
                    // 优先从TransferModule获取最新状态
                    let transferData = null;
                    if (window.TransferModule) {
                        transferData = window.TransferModule.getTransfer(msg.id);
                    }
                    
                    // 如果Map中没有，从消息数组中获取最新数据
                    if (!transferData) {
                        const convId = AppState.currentChat?.id;
                        if (convId && AppState.messages[convId]) {
                            const latestMsg = AppState.messages[convId].find(m => m.id === msg.id);
                            transferData = latestMsg || msg;
                        } else {
                            transferData = msg;
                        }
                    }
                    
                    console.log('💰 渲染转账:', msg.id, '状态:', transferData.status, '来源:', transferData === msg ? 'msg参数' : 'Map/消息数组');
                    
                    if (!transferData.amount) {
                        console.warn('转账数据不完整:', msg.id, transferData);
                        return;
                    }
                    
                    const isSent = msg.sender === 'sent';
                    const senderName = isSent ? AppState.user.name : AppState.currentChat.name;
                    const status = transferData.status || 'pending';
                    
                    let statusClass = status;
                    let statusText = '';
                    let descText = '';
                    
                    if (status === 'pending') {
                        statusText = isSent ? '待确认' : '待收款';
                        descText = isSent ? '你发起了一笔转账' : '收到一笔转账';
                    } else if (status === 'received') {
                        statusText = '已收款';
                        descText = '已被对方领取';
                    } else if (status === 'returned') {
                        statusText = '已退还';
                        descText = '转账已退还';
                    }
                    
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
                        <div class="transfer-card ${statusClass}" onclick="TransferModule.openDetailModal('${msg.id}')">
                            <div class="transfer-card-header">
                                <div class="transfer-card-icon"></div>
                                <div class="transfer-card-info">
                                    <div class="transfer-card-title">¥${transferData.amount.toFixed(2)}</div>
                                    <div class="transfer-card-note">${descText}</div>
                                </div>
                            </div>
                            <div class="transfer-card-divider"></div>
                            <div class="transfer-card-status">转账</div>
                        </div>
                    `;
                    bubble.classList.add('transfer-message');
                } else if (msg.type === 'goods_card' && msg.goodsData) {
                    // 商品卡片消息渲染
                    const goods = msg.goodsData;
                    const goodsName = escapeHtml(goods.name || '商品');
                    const goodsPrice = goods.price || '0';
                    const goodsImage = goods.image || '';
                    const goodsDesc = escapeHtml(goods.desc || '').substring(0, 60);
                    
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
                        <div class="goods-card-message" style="
                            background: #fff;
                            border: 1px solid #e0e0e0;
                            border-radius: 8px;
                            overflow: hidden;
                            max-width: 260px;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                            cursor: pointer;
                        " onclick="event.stopPropagation();">
                            <div style="
                                width: 100%;
                                height: 180px;
                                background: #f5f5f5;
                                overflow: hidden;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <img src="${goodsImage}" alt="${goodsName}" style="
                                    width: 100%;
                                    height: 100%;
                                    object-fit: cover;
                                ">
                            </div>
                            <div style="padding: 12px;">
                                <div style="
                                    font-size: 14px;
                                    color: #333;
                                    font-weight: 500;
                                    margin-bottom: 8px;
                                    line-height: 1.4;
                                    display: -webkit-box;
                                    -webkit-line-clamp: 2;
                                    -webkit-box-orient: vertical;
                                    overflow: hidden;
                                ">${goodsName}</div>
                                <div style="
                                    font-size: 11px;
                                    color: #999;
                                    margin-bottom: 8px;
                                    line-height: 1.3;
                                    display: -webkit-box;
                                    -webkit-line-clamp: 2;
                                    -webkit-box-orient: vertical;
                                    overflow: hidden;
                                ">${goodsDesc}</div>
                                <div style="
                                    display: flex;
                                    align-items: center;
                                    justify-content: space-between;
                                ">
                                    <div style="
                                        font-size: 18px;
                                        color: #ff4400;
                                        font-weight: bold;
                                    ">¥${goodsPrice}</div>
                                    <div style="
                                        font-size: 11px;
                                        color: #999;
                                        background: #f5f5f5;
                                        padding: 3px 8px;
                                        border-radius: 3px;
                                    ">淘宝商品</div>
                                </div>
                            </div>
                        </div>
                    `;
                    bubble.classList.add('goods-card-bubble');
                } else if (msg.type === 'listen_invite') {
                    // 一起听邀请卡片消息渲染 - 浅粉白主题
                    const isSent = msg.sender === 'sent';
                    const songName = msg.songName || '正在听音乐';
                    
                    // 获取邀请的响应状态
                    const convId = AppState.currentChat.id;
                    const msgs = AppState.messages[convId] || [];
                    let responseStatus = null;
                    
                    // 检查是否已关闭（一起听页面被关闭）
                    if (msg.isListenTogetherClosed) {
                        responseStatus = 'closed';
                    } else if (msg.isInvitationAnswered) {
                        responseStatus = msg.invitationStatus || null;
                    } else if (isSent) {
                        // 如果是用户邀请（sent），检查是否有AI的明确响应
                        // 【修复】只检查有明确响应标记的消息，不要错误地认为普通回复是同意
                        for (let i = msgs.length - 1; i >= 0; i--) {
                            const m = msgs[i];
                            if (m.type === 'received' && m.isRejectionMessage) {
                                responseStatus = 'rejected';
                                break;
                            } else if (m.type === 'received' && m.isAcceptListenInvitation) {
                                // 【修复】只有明确标记为接受的消息才算同意
                                responseStatus = 'accepted';
                                break;
                            }
                        }
                    }
                    
                    // 确定状态文本和颜色
                    let statusText;
                    if (responseStatus === 'closed') {
                        statusText = '已关闭';
                    } else if (responseStatus === 'accepted') {
                        statusText = '已同意';
                    } else if (responseStatus === 'rejected') {
                        statusText = '已拒绝';
                    } else {
                        statusText = '等待回应...';
                    }
                    
                    // 未回复时显示按钮，已回复时显示状态
                    // 【用户邀请AI】时：按钮禁用（AI应自主决定，不通过按钮强制）
                    // 【AI邀请用户】时：按钮启用
                    const shouldDisableButtons = isSent; // 用户邀请AI时禁用
                    const inviteRoleClass = isSent ? 'is-sent' : 'is-received';
                    const statusClassMap = {
                        accepted: 'is-accepted',
                        rejected: 'is-rejected',
                        closed: 'is-closed'
                    };
                    const statusClass = statusClassMap[responseStatus] || 'is-pending';
                    const buttonHtml = !responseStatus ? `
                        <div class="listen-invite-actions${shouldDisableButtons ? ' is-disabled' : ''}">
                            <button class="listen-invite-btn listen-invite-accept-btn" ${shouldDisableButtons ? 'disabled' : ''}>同意</button>
                            <button class="listen-invite-btn listen-invite-reject-btn" ${shouldDisableButtons ? 'disabled' : ''}>拒绝</button>
                        </div>
                    ` : `
                        <div class="listen-invite-status-chip ${statusClass}">${statusText}</div>
                    `;
                    
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
                        <div class="listen-invite-card ${inviteRoleClass}">
                            <div class="listen-invite-topline">
                                <span class="listen-invite-meta">${isSent ? '你发出的邀请' : 'TA 发来的邀请'}</span>
                            </div>
                            <div class="listen-invite-main">
                                <div class="listen-invite-icon-wrap">
                                    <span class="listen-invite-icon">♫</span>
                                </div>
                                <div class="listen-invite-copy">
                                    <div class="listen-invite-title">${isSent ? '邀请加入一起听' : '要一起来听音乐吗'}</div>
                                    <div class="listen-invite-song">${escapeHtml(songName)}</div>
                                </div>
                            </div>
                            <div class="listen-invite-divider"></div>
                            ${buttonHtml}
                        </div>
                    `;
                    bubble.classList.add('listen-invite-bubble');
                    bubble.dataset.msgId = msg.id;
                    
                    // 添加按钮事件监听（仅当AI邀请用户时启用）
                    if (!responseStatus && !isSent) {
                        // 只在AI邀请用户时添加按钮事件（isSent为false时）
                        const acceptBtn = bubble.querySelector('.listen-invite-accept-btn');
                        const rejectBtn = bubble.querySelector('.listen-invite-reject-btn');
                        
                        if (acceptBtn) {
                            acceptBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                handleListenInvitationResponse(msg, 'accept', isSent);
                            });
                        }
                        
                        if (rejectBtn) {
                            rejectBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                handleListenInvitationResponse(msg, 'reject', isSent);
                            });
                        }
                    }
                } else if (msg.isPhotoDescription) {
                    // 图片描述消息 - 图片翻转卡片（正面图片，背面描述）
                    const photoDesc = escapeHtml(msg.photoDescription || msg.content || '');
                    const defaultPhotoCardImage = (typeof window !== 'undefined' && window.PHOTO_DESCRIPTION_CARD_IMAGE)
                        ? window.PHOTO_DESCRIPTION_CARD_IMAGE
                        : 'https://img.heliar.top/file/1773290751509_IMG_20260312_124453.jpg';
                    const photoCardImage = escapeHtml(msg.photoCardImage || defaultPhotoCardImage);
                    
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
                        <div class="photo-description-card photo-description-flip-card" role="button" tabindex="0" aria-label="图片描述卡片" style="
                            width: 142px;
                            max-width: 142px;
                            cursor: pointer;
                            perspective: 1000px;
                            user-select: none;
                        ">
                            <div class="photo-description-card-inner" style="
                                position: relative;
                                width: 100%;
                                height: 162px;
                                transition: transform 0.52s cubic-bezier(0.2, 0.7, 0.2, 1);
                                transform-style: preserve-3d;
                                transform: rotateY(0deg);
                            ">
                                <div class="photo-description-face photo-description-front" style="
                                    position: absolute;
                                    inset: 0;
                                    backface-visibility: hidden;
                                    border: 1px solid #f0d6e1;
                                    border-radius: 8px;
                                    overflow: hidden;
                                    box-shadow: 0 4px 11px rgba(206, 120, 151, 0.24);
                                    background: #fffdfd;
                                ">
                                    <img src="${photoCardImage}" alt="图片描述卡片" style="
                                        display: block;
                                        width: 100%;
                                        height: 100%;
                                        object-fit: cover;
                                        background: #f7eef2;
                                    ">
                                </div>
                                <div class="photo-description-face photo-description-back" style="
                                    position: absolute;
                                    inset: 0;
                                    backface-visibility: hidden;
                                    transform: rotateY(180deg);
                                    border: 1px solid #f0d6e1;
                                    border-radius: 8px;
                                    overflow: hidden;
                                    box-shadow: 0 4px 11px rgba(206, 120, 151, 0.24);
                                    background: linear-gradient(180deg, #fffdfd 0%, #fff4f9 100%);
                                    padding: 7px 7px 6px;
                                ">
                                    <div style="
                                        font-size: 10px;
                                        color: #ac7086;
                                        font-weight: 600;
                                        letter-spacing: 0.2px;
                                        padding-bottom: 4px;
                                        border-bottom: 1px solid #f5dcea;
                                    ">图片描述</div>
                                    <div style="
                                        margin-top: 5px;
                                        font-size: 11px;
                                        color: #5f3344;
                                        line-height: 1.45;
                                        word-break: break-word;
                                        max-height: 128px;
                                        overflow: auto;
                                    ">${photoDesc || '（无描述）'}</div>
                                </div>
                            </div>
                        </div>
                    `;
                    bubble.classList.add('photo-description-message');

                    const flipCard = bubble.querySelector('.photo-description-flip-card');
                    const flipCardInner = bubble.querySelector('.photo-description-card-inner');
                    if (flipCard && flipCardInner) {
                        const toggleFlip = function(event) {
                            if (event) event.stopPropagation();
                            const isFlipped = flipCard.classList.toggle('is-flipped');
                            flipCardInner.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
                        };
                        flipCard.addEventListener('click', toggleFlip);
                        flipCard.addEventListener('keydown', function(event) {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                toggleFlip(event);
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
                    
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
                        <div class="forward-moment-card">
                            <!-- 头部 -->
                            <div class="forward-moment-header">
                                <div class="forward-moment-title">
                                    <div class="forward-moment-icon"></div>
                                    <span class="forward-moment-label">朋友圈</span>
                                </div>
                                <div class="forward-moment-arrow"></div>
                            </div>
                            
                            <!-- 内容 -->
                            <div class="forward-moment-content">
                                <!-- 作者和日期 -->
                                <div class="forward-moment-meta">
                                    <div class="forward-moment-author">${momentAuthor}</div>
                                    <div class="forward-moment-date">${momentDate}</div>
                                </div>
                                
                                <!-- 内容文本 -->
                                <div class="forward-moment-text">
                                    ${momentContent.length > 150 ? momentContent.substring(0, 150) + '...' : momentContent}
                                </div>
                                
                                <!-- 分隔线 -->
                                <div class="forward-moment-divider"></div>
                                
                                <!-- 底部提示 -->
                                <div class="forward-moment-footer">
                                    转发自朋友圈
                                </div>
                            </div>
                        </div>
                    `;
                    bubble.classList.add('forward-moment-message');
                } else if (msg.isImage && msg.imageData) {
                    // 图片消息：限制大小为100px（与表情包相同），保持纵横比，对齐头像
                    // 如果是AI生成的图片，添加点击事件显示描述
                    const clickHandler = msg.isAIGenerated && msg.imageDescription
                        ? `onclick="AIImageGenerator.showImageDescriptionModal('${escapeHtml(msg.imageDescription).replace(/'/g, "\\'")}', ${msg.isGenerationFailed || false})"`
                        : '';
                    const cursorStyle = msg.isAIGenerated && msg.imageDescription ? 'cursor:pointer;' : '';
                    
                    bubble.innerHTML = `
                        <div class="chat-avatar">${avatarContent}</div>
                        <img src="${msg.imageData}"
                             alt="图片"
                             style="max-width:100px;max-height:100px;width:auto;height:auto;border-radius:8px;display:block;${cursorStyle}"
                             ${clickHandler}
                             title="${msg.isAIGenerated ? '点击查看图片描述' : ''}">
                    `;
                    // 为图片消息添加特殊class
                    bubble.classList.add('image-message');
                    if (msg.isAIGenerated) {
                        bubble.classList.add('ai-generated-image');
                    }
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
                
                // 群聊：在received消息中包裹内容区域并添加发送者名称
                if (groupSenderNameHtml) {
                    const avatarEl = bubble.querySelector('.chat-avatar');
                    if (avatarEl) {
                        // 收集avatar之后的所有子节点
                        const contentNodes = [];
                        let sibling = avatarEl.nextSibling;
                        while (sibling) {
                            contentNodes.push(sibling);
                            sibling = sibling.nextSibling;
                        }
                        // 创建包裹容器
                        const wrapper = document.createElement('div');
                        wrapper.style.cssText = 'display:flex;flex-direction:column;min-width:0;';
                        // 添加发送者名称
                        const nameDiv = document.createElement('div');
                        nameDiv.className = 'group-msg-sender-name';
                        nameDiv.textContent = msg.groupSenderName;
                        wrapper.appendChild(nameDiv);
                        // 移动内容节点到wrapper
                        contentNodes.forEach(function(node) { wrapper.appendChild(node); });
                        bubble.appendChild(wrapper);
                    }
                }
                
                // 添加时间戳和已读/未读状态显示（直接添加到bubble，作为bubble的子元素）
                const conv = AppState.currentChat;
                if (conv && (conv.showMessageTimestamp || conv.showMessageReadStatus)) {
                    const showMessageTimestamp = conv.showMessageTimestamp ?? false;
                    const showMessageReadStatus = conv.showMessageReadStatus ?? false;
                    
                    // 创建信息容器
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'message-info-container';
                    
                    let hasInfo = false;
                    
                    // 显示时间戳
                    if (showMessageTimestamp && msg.time) {
                        hasInfo = true;
                        const timeSpan = document.createElement('span');
                        timeSpan.className = 'message-timestamp';
                        const date = new Date(msg.time);
                        const now = new Date();
                        const isToday = date.toDateString() === now.toDateString();
                        
                        let timeText = '';
                        if (isToday) {
                            timeText = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                        } else {
                            timeText = date.toLocaleString('zh-CN', { 
                                month: '2-digit', 
                                day: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            });
                        }
                        
                        timeSpan.textContent = timeText;
                        timeSpan.style.cssText = 'font-size: 10px; color: #aaa; white-space: nowrap;';
                        infoDiv.appendChild(timeSpan);
                    }
                    
                    // 显示已读/未读状态
                    if (showMessageReadStatus) {
                        const isSentMessage = (msg.type === 'voice' || msg.type === 'location' || msg.type === 'voicecall' || msg.type === 'videocall' || msg.type === 'redenvelope' || msg.type === 'transfer' || msg.type === 'goods_card' || msg.type === 'listen_invite')
                            ? msg.sender === 'sent'
                            : msg.type === 'sent';
                        
                        // 获取当前聊天的已读圆圈颜色
                        const readCircleColor = window.currentReadCircleColor || '#FFB6C1';
                        
                        if (isSentMessage) {
                            hasInfo = true;
                            const readStatusSpan = document.createElement('span');
                            readStatusSpan.className = 'message-read-status';
                            readStatusSpan.style.cssText = 'display: flex; align-items: center; gap: 2px; font-size: 10px; white-space: nowrap;';
                            
                            if (msg.readByAI) {
                                readStatusSpan.innerHTML = `
                                    <svg viewBox="0 0 16 16" width="12" height="12" style="fill: ${readCircleColor};">
                                        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.41 4.93L6.64 9.7l-2.05-2.05-.71.71 2.76 2.76 5.48-5.48-.71-.71z"/>
                                    </svg>
                                    <span>已读</span>
                                `;
                            } else {
                                readStatusSpan.innerHTML = `
                                    <svg viewBox="0 0 16 16" width="12" height="12" style="fill: #999;">
                                        <path d="M8 15A7 7 0 118 1a7 7 0 010 14zm0-1.2a5.8 5.8 0 100-11.6 5.8 5.8 0 000 11.6z"/>
                                    </svg>
                                    <span>未读</span>
                                `;
                            }
                            
                            infoDiv.appendChild(readStatusSpan);
                        } else {
                            hasInfo = true;
                            const readStatusSpan = document.createElement('span');
                            readStatusSpan.className = 'message-read-status';
                            readStatusSpan.style.cssText = 'display: flex; align-items: center; gap: 2px; font-size: 10px; white-space: nowrap;';
                            
                            if (msg.readByUser) {
                                readStatusSpan.innerHTML = `
                                    <svg viewBox="0 0 16 16" width="12" height="12" style="fill: ${readCircleColor};">
                                        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.41 4.93L6.64 9.7l-2.05-2.05-.71.71 2.76 2.76 5.48-5.48-.71-.71z"/>
                                    </svg>
                                    <span>已读</span>
                                `;
                            } else {
                                readStatusSpan.innerHTML = `
                                    <svg viewBox="0 0 16 16" width="12" height="12" style="fill: #999;">
                                        <path d="M8 15A7 7 0 118 1a7 7 0 010 14zm0-1.2a5.8 5.8 0 100-11.6 5.8 5.8 0 000 11.6z"/>
                                    </svg>
                                    <span>未读</span>
                                `;
                            }
                            
                            infoDiv.appendChild(readStatusSpan);
                        }
                    }
                    
                    // 如果有信息显示，添加到bubble末尾（与avatar、chat-text平级）
                    if (hasInfo) {
                        bubble.appendChild(infoDiv);
                    }
                }
                
                // 注意：所有事件监听器已移至容器级别的事件委托，不在此处绑定
                // 返回bubble元素，由调用者负责添加到DOM
                return bubble;
            }
        }
        
        // ========== 消息事件处理器初始化（只执行一次）==========
        function initializeMessageEventHandlers(container) {
            const getCurrentConversationMessages = () => {
                const convId = AppState.currentChat?.id;
                if (!convId) return [];
                return AppState.messages[convId] || [];
            };

            const findMessageById = (msgId) => {
                if (!msgId) return null;
                const currentMessages = getCurrentConversationMessages();
                return currentMessages.find(m => m.id === msgId) || null;
            };

            // 1. 头像双击事件（桌面端）
            const avatarDblClickHandler = (e) => {
                const av = e.target.closest('.chat-avatar');
                if (av && !AppState.isSelectMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    MainAPIManager.callApiWithConversation();
                }
            };
            container._avatarDblClickHandler = avatarDblClickHandler;
            container.addEventListener('dblclick', avatarDblClickHandler);
            
            // 2. 头像双击事件（移动端）
            let avatarTapCount = 0;
            let avatarTapTimer = null;
            const avatarTouchHandler = (e) => {
                const av = e.target.closest('.chat-avatar');
                if (av && !AppState.isSelectMode) {
                    avatarTapCount++;
                    if (avatarTapCount === 1) {
                        avatarTapTimer = setTimeout(() => {
                            avatarTapCount = 0;
                        }, 300);
                    } else if (avatarTapCount === 2) {
                        clearTimeout(avatarTapTimer);
                        e.preventDefault();
                        e.stopPropagation();
                        MainAPIManager.callApiWithConversation();
                        avatarTapCount = 0;
                    }
                }
            };
            container._avatarTouchHandler = avatarTouchHandler;
            container.addEventListener('touchend', avatarTouchHandler, { passive: false });
            
            // 3. 点击事件委托
            const delegatedClickHandler = (e) => {
                // 检查是否点击了"加载更多"提示
                const loadMoreHint = e.target.closest('[data-action="load-more"]');
                if (loadMoreHint) {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('点击了加载更多按钮');
                    loadMoreMessages();
                    return;
                }
                
                const closeTransBtn = e.target.closest('.close-trans-btn');
                if (closeTransBtn) {
                    e.stopPropagation();
                    const msgId = closeTransBtn.dataset.msgId;
                    const msg = findMessageById(msgId);
                    if (msg) {
                        msg.translation = null;
                        saveToStorage();
                        renderChatMessagesDebounced();
                    }
                    return;
                }
                
                const replyArea = e.target.closest('[data-scroll-to]');
                if (replyArea) {
                    e.stopPropagation();
                    const targetId = replyArea.dataset.scrollTo;
                    scrollToMessage(targetId);
                    return;
                }
                
                const voiceBubble = e.target.closest('.voice-bubble');
                if (voiceBubble && !AppState.isSelectMode) {
                    e.stopPropagation();
                    const bubble = voiceBubble.closest('.chat-bubble');
                    if (bubble) {
                        const msgId = bubble.dataset.msgId;
                        const msg = findMessageById(msgId);
                        if (msg) {
                            if (msg.sender === 'received' && window.MinimaxTTS && MinimaxTTS.isConfigured()) {
                                MinimaxTTS.speak(msg.content).catch(err => {
                                    console.error('MiniMax TTS 播放失败:', err);
                                    showToast('语音播放失败: ' + err.message);
                                });
                            }
                            if (typeof VoiceMessageModule !== 'undefined' && VoiceMessageModule.showVoiceTranscript) {
                                VoiceMessageModule.showVoiceTranscript(msg.content, voiceBubble);
                            }
                        }
                    }
                    return;
                }
                
                if (AppState.isSelectMode) {
                    const bubble = e.target.closest('.chat-bubble, .retracted-message-wrapper');
                    if (bubble) {
                        e.stopPropagation();
                        // 支持普通消息(data-msg-id)和撤回消息(data-message-id)
                        const msgId = bubble.dataset.msgId || bubble.dataset.messageId;
                        if (msgId) {
                            toggleMessageSelection(msgId);
                        }
                    }
                }
            };
            container._delegatedClickHandler = delegatedClickHandler;
            container.addEventListener('click', delegatedClickHandler);
            
            // 4. 右键菜单事件
            const delegatedContextMenuHandler = (e) => {
                if (AppState.isSelectMode) return;
                const bubble = e.target.closest('.chat-bubble, .retracted-message-wrapper');
                if (bubble) {
                    e.preventDefault();
                    const msgId = bubble.dataset.msgId;
                    const msg = findMessageById(msgId);
                    if (msg) {
                        showMessageContextMenu(msg, e, bubble);
                    }
                }
            };
            container._delegatedContextMenuHandler = delegatedContextMenuHandler;
            container.addEventListener('contextmenu', delegatedContextMenuHandler);
            
            // 5. 长按事件（移动端）
            let longPressTimer = null;
            let touchStarted = false;
            let touchStartX = 0;
            let touchStartY = 0;
            let longPressTriggered = false;
            let touchedBubble = null;
            
            const delegatedTouchStartHandler = (e) => {
                if (AppState.isSelectMode) return;
                const bubble = e.target.closest('.chat-bubble, .retracted-message-wrapper');
                if (bubble) {
                    touchedBubble = bubble;
                    touchStarted = true;
                    longPressTriggered = false;
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    
                    longPressTimer = setTimeout(() => {
                        if (touchStarted && touchedBubble) {
                            longPressTriggered = true;
                            if (window.getSelection) {
                                window.getSelection().removeAllRanges();
                            }
                            const msgId = touchedBubble.dataset.msgId;
                            const msg = findMessageById(msgId);
                            if (msg) {
                                showMessageContextMenu(msg, null, touchedBubble);
                            }
                        }
                    }, 500);
                }
            };
            container._delegatedTouchStartHandler = delegatedTouchStartHandler;
            container.addEventListener('touchstart', delegatedTouchStartHandler, { passive: true });
            
            const delegatedTouchMoveHandler = (e) => {
                if (touchStarted) {
                    const moveX = Math.abs(e.touches[0].clientX - touchStartX);
                    const moveY = Math.abs(e.touches[0].clientY - touchStartY);
                    if (moveX > 10 || moveY > 10) {
                        clearTimeout(longPressTimer);
                        touchStarted = false;
                        touchedBubble = null;
                    }
                }
            };
            container._delegatedTouchMoveHandler = delegatedTouchMoveHandler;
            container.addEventListener('touchmove', delegatedTouchMoveHandler, { passive: true });
            
            const delegatedTouchEndHandler = (e) => {
                touchStarted = false;
                clearTimeout(longPressTimer);
                if (longPressTriggered) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                if (window.getSelection) {
                    window.getSelection().removeAllRanges();
                }
                touchedBubble = null;
            };
            container._delegatedTouchEndHandler = delegatedTouchEndHandler;
            container.addEventListener('touchend', delegatedTouchEndHandler, { passive: false });
            
            // 6. 鼠标长按事件
            let mouseDownTimer = null;
            let mouseDownBubble = null;
            
            const delegatedMouseDownHandler = (e) => {
                if (AppState.isSelectMode) return;
                const bubble = e.target.closest('.chat-bubble, .retracted-message-wrapper');
                if (bubble) {
                    mouseDownBubble = bubble;
                    mouseDownTimer = setTimeout(() => {
                        if (mouseDownBubble) {
                            if (window.getSelection) {
                                window.getSelection().removeAllRanges();
                            }
                            const rect = mouseDownBubble.getBoundingClientRect();
                            const event = new MouseEvent('contextmenu', {
                                bubbles: true,
                                cancelable: true,
                                clientX: rect.left + rect.width / 2,
                                clientY: rect.top + rect.height / 2
                            });
                            mouseDownBubble.dispatchEvent(event);
                        }
                    }, 500);
                }
            };
            container._delegatedMouseDownHandler = delegatedMouseDownHandler;
            container.addEventListener('mousedown', delegatedMouseDownHandler);
            
            const delegatedMouseUpHandler = () => {
                clearTimeout(mouseDownTimer);
                mouseDownBubble = null;
            };
            container._delegatedMouseUpHandler = delegatedMouseUpHandler;
            container.addEventListener('mouseup', delegatedMouseUpHandler);
            container.addEventListener('mouseleave', delegatedMouseUpHandler);
        }
        
        // ========== 优化的虚拟滚动渲染 ==========
        function renderWithVirtualScrollOptimized(messages, container) {
            const totalMessages = messages.length;
            const batchSize = AppState.virtualScroll.renderBatchSize;
            const startIndex = Math.max(0, totalMessages - batchSize);
            
            AppState.virtualScroll.currentStartIndex = startIndex;
            
            container.innerHTML = '';
            const fragment = document.createDocumentFragment();
            
            for (let index = startIndex; index < totalMessages; index++) {
                const messageEl = renderSingleMessage(messages[index], index, null);
                if (messageEl) {
                    fragment.appendChild(messageEl);
                }
            }
            container.appendChild(fragment);
            
            if (startIndex > 0) {
                const loadMoreHint = document.createElement('div');
                loadMoreHint.className = 'load-more-hint';
                loadMoreHint.textContent = `向上滑动加载更早的消息 (还有${startIndex}条)`;
                loadMoreHint.style.cssText = `
                    text-align: center;
                    padding: 12px;
                    color: #999;
                    font-size: 13px;
                    cursor: pointer;
                    user-select: none;
                    background: linear-gradient(to bottom, #f5f5f5, transparent);
                `;
                loadMoreHint.setAttribute('data-action', 'load-more');
                container.insertBefore(loadMoreHint, container.firstChild);
            }
            
            // 使用节流的滚动监听 - 只在第一次或容器不存在监听器时创建
            if (!container._virtualScrollHandler) {
                container._virtualScrollHandler = PerformanceUtils.throttle(() => {
                    if (AppState.virtualScroll.isLoadingMore) return;
                    const scrollTop = container.scrollTop;
                    const currentStart = AppState.virtualScroll.currentStartIndex;
                    if (scrollTop < AppState.virtualScroll.scrollThreshold && currentStart > 0) {
                        loadMoreMessages();
                    }
                }, 100);
                
                container.addEventListener('scroll', container._virtualScrollHandler, { passive: true });
            }
        }
        
        // 主渲染函数：使用虚拟滚动和事件委托优化
        function renderChatMessages(forceScrollToBottom = false) {
            const container = document.getElementById('chat-messages');
             
            // 检查container是否存在
            if (!container) {
                console.warn('chat-messages容器不存在，跳过渲染');
                return;
            }
            
            if (!AppState.currentChat) {
                container.innerHTML = '';
                return;
            }
             
            const messages = AppState.messages[AppState.currentChat.id] || [];
            
            // 优化：只在第一次渲染时初始化事件监听器
            // 使用容器标志位避免重复绑定
            if (!container._eventHandlersInitialized) {
                initializeMessageEventHandlers(container);
                container._eventHandlersInitialized = true;
            }
            
            // 使用优化的渲染策略
            if (!AppState.virtualScroll.enabled || messages.length <= AppState.virtualScroll.renderBatchSize) {
                // 消息数量少，直接渲染
                container.innerHTML = '';
                const fragment = document.createDocumentFragment();
                for (let index = 0; index < messages.length; index++) {
                    const messageEl = renderSingleMessage(messages[index], index, null);
                    if (messageEl) {
                        fragment.appendChild(messageEl);
                    }
                }
                container.appendChild(fragment);
            } else {
                // 使用优化的虚拟滚动
                renderWithVirtualScrollOptimized(messages, container);
            }
            
            // 事件处理已在 initializeMessageEventHandlers 中统一处理
            
            // 滚动到底部（多选模式下不滚动）
            if (!AppState.isSelectMode || forceScrollToBottom) {
                requestAnimationFrame(() => {
                    container.scrollTop = container.scrollHeight;
                });
            }
        }
        
        // 防抖渲染函数 - 使用性能优化工具
        function renderChatMessagesDebounced(forceScrollToBottom = false) {
            // 使用 PerformanceUtils 的防抖函数
            if (!AppState._debouncedRender) {
                AppState._debouncedRender = PerformanceUtils.debounce(
                    (scrollToBottom) => {
                        renderChatMessages(scrollToBottom);
                    },
                    AppState.renderDebounce.delay
                );
            }
            AppState._debouncedRender(forceScrollToBottom);
        }
        
        // 加载更多历史消息
        function loadMoreMessages() {
            console.log('loadMoreMessages 被调用');
            console.log('isLoadingMore:', AppState.virtualScroll.isLoadingMore);
            console.log('currentStartIndex:', AppState.virtualScroll.currentStartIndex);
            
            if (AppState.virtualScroll.isLoadingMore) {
                console.log('正在加载中，跳过');
                // 强制重置，防止卡住
                console.log('强制重置 isLoadingMore 为 false');
                AppState.virtualScroll.isLoadingMore = false;
            }
            
            const container = document.getElementById('chat-messages');
            if (!container) {
                console.error('找不到 chat-messages 容器');
                return;
            }
            
            const messages = AppState.messages[AppState.currentChat.id] || [];
            const currentStart = AppState.virtualScroll.currentStartIndex;
            
            console.log('消息总数:', messages.length);
            console.log('当前起始索引:', currentStart);
            
            if (currentStart <= 0) {
                console.log('已经加载完所有消息');
                return;
            }
            
            AppState.virtualScroll.isLoadingMore = true;
            console.log('开始加载更多消息...');
            
            // 保存当前滚动位置
            const oldScrollHeight = container.scrollHeight;
            const oldScrollTop = container.scrollTop;
            
            // 计算新的起始索引
            const batchSize = AppState.virtualScroll.renderBatchSize;
            const newStart = Math.max(0, currentStart - batchSize);
            
            // 移除"加载更多"提示
            const loadMoreHint = container.querySelector('.load-more-hint');
            if (loadMoreHint) {
                loadMoreHint.remove();
            }
            
            // 在顶部追加更早的消息
            const fragment = document.createDocumentFragment();
            
            console.log(`正在渲染消息从索引 ${newStart} 到 ${currentStart}`);
            for (let index = newStart; index < currentStart; index++) {
                const messageEl = renderSingleMessage(messages[index], index, null);
                if (messageEl) {
                    fragment.appendChild(messageEl);
                }
            }
            console.log(`已渲染 ${fragment.childNodes.length} 条消息`);
            
            // 如果还有更早的消息，添加新的"加载更多"提示
            if (newStart > 0) {
                const newLoadMoreHint = document.createElement('div');
                newLoadMoreHint.className = 'load-more-hint';
                newLoadMoreHint.style.cssText = `
                    text-align: center;
                    padding: 12px;
                    color: #999;
                    font-size: 13px;
                    cursor: pointer;
                    user-select: none;
                    background: linear-gradient(to bottom, #f5f5f5, transparent);
                `;
                newLoadMoreHint.textContent = `向上滑动加载更早的消息 (还有${newStart}条)`;
                newLoadMoreHint.setAttribute('data-action', 'load-more');
                fragment.insertBefore(newLoadMoreHint, fragment.firstChild);
            }
            
            container.insertBefore(fragment, container.firstChild);
            
            // 更新起始索引
            AppState.virtualScroll.currentStartIndex = newStart;
            
            // 恢复滚动位置（保持用户视图不变）
            requestAnimationFrame(() => {
                try {
                    const newScrollHeight = container.scrollHeight;
                    const scrollDiff = newScrollHeight - oldScrollHeight;
                    container.scrollTop = oldScrollTop + scrollDiff;
                    console.log('加载完成，滚动位置已恢复');
                } catch (error) {
                    console.error('恢复滚动位置失败:', error);
                } finally {
                    AppState.virtualScroll.isLoadingMore = false;
                    console.log('isLoadingMore 已重置为 false');
                }
            });
        }

        function showMessageContextMenu(msg, mouseEvent, bubbleElement) {
            // 如果已有菜单，关闭它
            const existingMenu = document.getElementById('message-context-menu');
            if (existingMenu) existingMenu.remove();
            
            // 添加高亮背景 - 更柔和的效果
            if (bubbleElement) {
                bubbleElement.style.backgroundColor = 'rgba(0,0,0,0.03)';
                bubbleElement.style.transition = 'background-color 0.2s ease';
            }
            
            const menu = document.createElement('div');
            menu.id = 'message-context-menu';
            menu.className = 'message-context-menu';
            menu.classList.add(msg.isRetracted ? 'single-action' : 'multi-action');

            const canEdit = isMessageEditable(msg);
            
            // 菜单项HTML - 支持收藏、修改、复制、引用、多选、撤回、删除
            
            // 如果消息已撤回，只显示删除选项
            let menuItems = '';
            if (msg.isRetracted) {
                menuItems = `
                    <button type="button" class="msg-menu-item danger" onclick="deleteMessage('${msg.id}')">删除</button>
                `;
            } else {
                const editBtnHtml = canEdit
                    ? `<button type="button" class="msg-menu-item" onclick="editMessage('${msg.id}')">修改</button>`
                    : '';
                menuItems = `
                    <button type="button" class="msg-menu-item" onclick="addMessageToCollection('${msg.id}')">收藏</button>
                    ${editBtnHtml}
                    <button type="button" class="msg-menu-item" onclick="copyMessage('${msg.id}')">复制</button>
                    <button type="button" class="msg-menu-item" onclick="replyMessage('${msg.id}')">引用</button>
                    <button type="button" class="msg-menu-item" onclick="enterMessageMultiSelect('${msg.id}')">多选</button>
                    <button type="button" class="msg-menu-item warning" onclick="retractMessage('${msg.id}')">撤回</button>
                    <button type="button" class="msg-menu-item danger" onclick="deleteMessage('${msg.id}')">删除</button>
                `;
            }
            
            menu.innerHTML = menuItems;
            document.body.appendChild(menu);
            
            // 定位：左右居中，垂直位于长按消息气泡下方
            requestAnimationFrame(() => {
                const menuRect = menu.getBoundingClientRect();
                const padding = 6; // 屏幕边缘安全距离
                const maxLeft = Math.max(padding, window.innerWidth - menuRect.width - padding);
                const maxTop = Math.max(padding, window.innerHeight - menuRect.height - padding);

                const bubbleRect = bubbleElement ? bubbleElement.getBoundingClientRect() : null;
                const arrowSize = 8;
                const gap = 4;

                // X 轴始终屏幕居中
                let menuLeft = (window.innerWidth - menuRect.width) / 2;
                // Y 轴优先在气泡下方
                let menuTop = bubbleRect ? (bubbleRect.bottom + arrowSize + gap) : ((window.innerHeight - menuRect.height) / 2);

                menuLeft = Math.min(Math.max(menuLeft, padding), maxLeft);
                menuTop = Math.min(Math.max(menuTop, padding), maxTop);

                // 当前模式不显示箭头
                menu.classList.remove('menu-above', 'menu-below');
                menu.style.removeProperty('--arrow-left');

                menu.style.left = `${menuLeft}px`;
                menu.style.top = `${menuTop}px`;
            });
            
            // 添加样式
            if (!document.querySelector('style[data-message-menu]')) {
                const style = document.createElement('style');
                style.setAttribute('data-message-menu', 'true');
                style.textContent = `
                    @keyframes messageMenuFadeIn {
                        from {
                            opacity: 0;
                            transform: scale(0.92) translateY(-4px);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1) translateY(0);
                        }
                    }
                    
                    @keyframes messageMenuFadeOut {
                        from {
                            opacity: 1;
                            transform: scale(1);
                        }
                        to {
                            opacity: 0;
                            transform: scale(0.95);
                        }
                    }
                    
                    .message-context-menu {
                        position: fixed;
                        background: linear-gradient(180deg, #fff8fc 0%, #fff2f8 58%, #fffdfd 100%);
                        backdrop-filter: blur(16px) saturate(150%);
                        -webkit-backdrop-filter: blur(16px) saturate(150%);
                        border-radius: 16px;
                        box-shadow: 0 14px 36px rgba(255, 159, 190, 0.22),
                                    0 4px 14px rgba(0, 0, 0, 0.12),
                                    inset 0 1px 0 rgba(255, 255, 255, 0.85);
                        z-index: 10000;
                        width: auto;
                        max-width: calc(100vw - 10px);
                        overflow-x: auto;
                        overflow-y: visible;
                        -webkit-overflow-scrolling: touch;
                        scrollbar-width: none;
                        animation: messageMenuFadeIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
                        display: flex;
                        flex-wrap: nowrap;
                        align-items: center;
                        justify-content: flex-start;
                        gap: 6px;
                        padding: 8px;
                        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif;
                        border: 1px solid #ffdce8;
                    }

                    .message-context-menu::-webkit-scrollbar {
                        display: none;
                    }

                    .message-context-menu.single-action {
                        width: auto;
                        max-width: min(70vw, 220px);
                        min-width: 110px;
                        justify-content: center;
                    }
                    
                    .message-context-menu.closing {
                        animation: messageMenuFadeOut 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;
                    }
                    
                    /* 小三角指示器 */
                    .message-context-menu.menu-below::before {
                        content: '';
                        position: absolute;
                        top: -7px;
                        left: var(--arrow-left, 50%);
                        transform: translateX(-50%);
                        width: 0;
                        height: 0;
                        border-left: 8px solid transparent;
                        border-right: 8px solid transparent;
                        border-bottom: 8px solid #fff7fb;
                        filter: drop-shadow(0 -2px 4px rgba(255, 159, 190, 0.2));
                    }
                    
                    .message-context-menu.menu-above::after {
                        content: '';
                        position: absolute;
                        bottom: -7px;
                        left: var(--arrow-left, 50%);
                        transform: translateX(-50%);
                        width: 0;
                        height: 0;
                        border-left: 8px solid transparent;
                        border-right: 8px solid transparent;
                        border-top: 8px solid #fff7fb;
                        filter: drop-shadow(0 2px 4px rgba(255, 159, 190, 0.2));
                    }
                    
                    .msg-menu-item {
                        appearance: none;
                        -webkit-appearance: none;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        height: 34px;
                        min-width: 0;
                        padding: 0 6px;
                        border-radius: 12px;
                        border: none;
                        background: linear-gradient(135deg, #ffffff 0%, #fff4f9 100%);
                        color: #b45a7c;
                        cursor: pointer;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        font-size: clamp(10px, 2.5vw, 13px);
                        font-weight: 600;
                        letter-spacing: 0;
                        white-space: nowrap;
                        flex: 0 0 auto;
                        -webkit-tap-highlight-color: transparent;
                        user-select: none;
                        box-shadow: 0 3px 8px rgba(255, 180, 207, 0.2);
                    }

                    .message-context-menu.single-action .msg-menu-item {
                        flex: 0 0 auto;
                        min-width: 88px;
                        padding: 0 14px;
                        font-size: 13px;
                    }
                    
                    .msg-menu-item:active {
                        transform: translateY(1px) scale(0.97);
                        background: linear-gradient(135deg, #fff2f8 0%, #ffe8f1 100%);
                        box-shadow: 0 1px 4px rgba(255, 180, 207, 0.24);
                    }
                    
                    @media (hover: hover) {
                        .msg-menu-item:hover {
                            background: linear-gradient(135deg, #fff4fa 0%, #ffeaf3 100%);
                            transform: translateY(-1px);
                        }
                    }

                    .msg-menu-item.warning {
                        color: #b87334;
                        background: linear-gradient(135deg, #fffaf5 0%, #fff1e5 100%);
                    }

                    .msg-menu-item.danger {
                        color: #d35a7d;
                        background: linear-gradient(135deg, #fff7fa 0%, #ffeaf2 100%);
                    }
                    
                    /* 移动端优化 - 更紧凑的布局，确保一行显示 */
                    @media (max-width: 768px) {
                        .message-context-menu {
                            padding: 7px;
                            gap: 5px;
                            max-width: calc(100vw - 8px);
                        }
                        
                        .msg-menu-item {
                            height: 32px;
                            padding: 0 10px;
                            font-size: clamp(10px, 2.9vw, 12px);
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // 点击外部关闭菜单 - 带动画
            const closeMenuHandler = (e) => {
                if (!e.target.closest('#message-context-menu')) {
                    menu.classList.add('closing');
                    setTimeout(() => {
                        menu.remove();
                        // 移除高亮背景
                        if (bubbleElement) {
                            bubbleElement.style.backgroundColor = '';
                        }
                    }, 200);
                    document.removeEventListener('click', closeMenuHandler);
                    document.removeEventListener('touchend', closeMenuHandler);
                }
            };
            
            // 添加关闭监听器，点击菜单外的地方会关闭菜单
            // 使用 setTimeout 确保菜单完全渲染和定位后再添加监听器，避免立即触发关闭
            setTimeout(() => {
                document.addEventListener('click', closeMenuHandler);
                document.addEventListener('touchend', closeMenuHandler);
            }, 50);
        }
        
        // 统一的菜单关闭函数 - 带动画效果
        function closeMessageContextMenu() {
            const menu = document.getElementById('message-context-menu');
            if (!menu) return;
            
            menu.classList.add('closing');
            setTimeout(() => {
                menu.remove();
                // 移除所有消息气泡的高亮背景
                document.querySelectorAll('.message-bubble').forEach(bubble => {
                    bubble.style.backgroundColor = '';
                });
            }, 200);
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
                closeMessageContextMenu();
            }).catch(() => {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = msg.content;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showToast('复制成功');
                closeMessageContextMenu();
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
            const quoteBar = document.getElementById('quote-message-bar');
            if (!chatInput || !quoteContainer) return;
            
            // 关闭菜单
            closeMessageContextMenu();
            
            // 记录引用的消息ID到输入框的数据属性
            chatInput.dataset.replyToId = msgId;
            
            // 获取消息内容摘要和作者
            let summary = getCollectionPreviewTextFromMessage(msg) || '';
            if (summary.length > 30) summary = `${summary.slice(0, 30)}...`;
            const author = msg.type === 'sent' ? AppState.user.name : AppState.currentChat.name;
            
            // 更新引用消息显示区域
            const quoteContent = document.getElementById('quote-content');
            if (quoteContent) {
                quoteContent.innerHTML = `<strong style="color:#333;">${author}:</strong> ${escapeHtml(summary)}`;
                const fullPreview = getCollectionPreviewTextFromMessage(msg) || '';
                quoteContent.title = `${author}: ${fullPreview}`; // 长按时显示完整内容
            }
            
            // 显示引用消息栏容器
            if (quoteContainer) quoteContainer.style.display = 'flex';
            if (quoteBar) quoteBar.style.display = 'flex';
            
            // 聚焦输入框
            chatInput.focus();
        }

        function isMessageEditable(msg) {
            if (!msg || msg.isRetracted) return false;

            if (msg.type === 'voice') return true;
            if (msg.isPhotoDescription) return true;

            const isPlainTextType = msg.type === 'sent' || msg.type === 'received' || msg.type === 'assistant';
            if (!isPlainTextType) return false;

            if (msg.isImage || msg.emojiUrl || msg.isEmoji || msg.isForward || msg.forwardedMoment || msg.isForwarded) return false;
            if (msg.musicCard || msg.type === 'location' || msg.type === 'voicecall' || msg.type === 'videocall') return false;
            if (msg.type === 'redenvelope' || msg.type === 'transfer' || msg.type === 'goods_card' || msg.type === 'listen_invite') return false;

            return typeof msg.content === 'string';
        }

        function getMessagePreviewText(msg) {
            if (!msg) return '';

            if (msg.emojiUrl || msg.isEmoji) return '[表情包]';
            if (msg.isImage) return '[图片]';
            if (msg.isPhotoDescription) return msg.photoDescription || msg.content || '[图片描述]';
            if (msg.type === 'voice') return '[语音]';
            if (msg.type === 'location') return '[位置]';
            if (msg.type === 'voicecall') return '[语音通话]';
            if (msg.type === 'videocall') return '[视频通话]';
            if (msg.type === 'redenvelope') return '[红包]';
            if (msg.type === 'transfer') return '[转账]';
            if (msg.type === 'goods_card') return msg.goodsData?.name ? `[商品] ${msg.goodsData.name}` : '[商品]';
            if (msg.type === 'listen_invite') return msg.songName ? `[一起听] ${msg.songName}` : '[一起听]';
            if (msg.musicCard) return msg.musicCard.name ? `[音乐] ${msg.musicCard.name}` : '[音乐]';
            if (msg.isForward && msg.forwardedMoment) return '[朋友圈]';

            return typeof msg.content === 'string' ? msg.content : '';
        }

        function updateConversationAfterMessagesChange(convId) {
            const conv = AppState.conversations.find(c => c.id === convId);
            if (!conv) return;

            const messages = AppState.messages[convId] || [];
            const lastMsg = messages[messages.length - 1];

            if (!lastMsg) {
                conv.lastMsg = '';
                conv.time = '';
                conv.lastMessageTime = null;
                return;
            }

            const previewText = getMessagePreviewText(lastMsg);
            const lastTime = lastMsg.time || lastMsg.timestamp || new Date().toISOString();
            conv.lastMsg = previewText;
            conv.time = formatTime(new Date(lastTime));
            conv.lastMessageTime = lastTime;
        }

        function purgeMessagesFromConversation(convId, msgIds) {
            if (!convId || !Array.isArray(msgIds) || msgIds.length === 0) return 0;

            const messages = AppState.messages[convId] || [];
            const idSet = new Set(msgIds.map(id => String(id)));
            msgIds.forEach(id => idSet.add(`sys_retract_${id}`));

            let removedCount = 0;
            for (let i = messages.length - 1; i >= 0; i--) {
                const msgId = String(messages[i].id);
                if (idSet.has(msgId)) {
                    messages.splice(i, 1);
                    removedCount++;
                }
            }

            return removedCount;
        }

        function deleteMessage(msgId) {
            // 显示确认对话框
            showConfirmDialog('是否删除该条消息？删除后不可撤回', function() {
                if (!AppState.currentChat) return;

                const convId = AppState.currentChat.id;
                const removedCount = purgeMessagesFromConversation(convId, [msgId]);

                if (removedCount > 0) {
                    if (Array.isArray(AppState.selectedMessages) && AppState.selectedMessages.length) {
                        AppState.selectedMessages = AppState.selectedMessages.filter(id => String(id) !== String(msgId));
                    }
                    updateConversationAfterMessagesChange(convId);
                    saveToStorage();
                    renderChatMessagesDebounced();
                    renderConversations();
                    showToast('消息已删除');
                }
                
                // 关闭菜单
                closeMessageContextMenu();
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
                    renderChatMessagesDebounced();
                    showToast('消息已撤回');
                }
                
                // 关闭菜单
                closeMessageContextMenu();
            });
        }

        function editMessage(msgId) {
            if (!AppState.currentChat) return;
            const messages = AppState.messages[AppState.currentChat.id] || [];
            const msg = messages.find(m => m.id === msgId);
            
            if (!msg) return;

            if (!isMessageEditable(msg)) {
                showToast('该消息类型暂不支持修改');
                closeMessageContextMenu();
                return;
            }
            
            // 关闭菜单
            closeMessageContextMenu();

            const isVoice = msg.type === 'voice';
            const isPhotoDesc = msg.isPhotoDescription;
            const dialogTitle = isVoice ? '修改语音条' : (isPhotoDesc ? '修改图片描述' : '修改消息');
            const initialContent = isPhotoDesc
                ? (msg.photoDescription || msg.content || '')
                : (msg.content || '');
            const durationValue = isVoice
                ? Math.max(1, Math.min(300, parseInt(msg.duration, 10) || 1))
                : null;
            const durationInputHtml = isVoice
                ? `
                    <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px;">
                        <label for="edit-voice-duration" style="font-size: 12px; color: #666;">语音时长(秒)</label>
                        <input id="edit-voice-duration" type="number" min="1" max="300" value="${durationValue}" style="width: 90px; padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;">
                    </div>
                `
                : '';
            
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
                    <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #333;">${dialogTitle}</h3>
                    <textarea id="edit-msg-input" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical; min-height: 100px; box-sizing: border-box;">${escapeHtml(initialContent)}</textarea>
                    ${durationInputHtml}
                    <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
                        <button onclick="document.getElementById('edit-message-modal').remove();" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px;">取消</button>
                        <button onclick="saveEditedMessageFromModal('${msgId}');" style="padding: 8px 16px; border: none; border-radius: 6px; background: #000; color: #fff; cursor: pointer; font-size: 14px;">保存</button>
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

        function saveEditedMessageFromModal(msgId) {
            const input = document.getElementById('edit-msg-input');
            const durationInput = document.getElementById('edit-voice-duration');
            const newContent = input ? input.value : '';
            const durationValue = durationInput ? durationInput.value : null;
            saveEditedMessage(msgId, newContent, durationValue);
        }

        function saveEditedMessage(msgId, newContent, durationOverride) {
            if (!AppState.currentChat) return;
            const messages = AppState.messages[AppState.currentChat.id] || [];
            const msg = messages.find(m => m.id === msgId);
            
            if (!msg || !newContent.trim()) return;

            const trimmedContent = newContent.trim();

            if (msg.type === 'voice') {
                msg.content = trimmedContent;
                const parsedDuration = parseInt(durationOverride, 10);
                if (Number.isFinite(parsedDuration)) {
                    msg.duration = Math.max(1, Math.min(300, parsedDuration));
                }
            } else if (msg.isPhotoDescription) {
                msg.photoDescription = trimmedContent;
                msg.content = trimmedContent;
            } else {
                msg.content = trimmedContent;
            }

            if (msg.translation) {
                msg.translation = null;
            }
            msg.isEdited = true;
            msg.editedAt = new Date().toISOString();

            if (msg.type === 'sent' || msg.sender === 'sent') {
                msg.readByAI = false;
            }

            updateConversationAfterMessagesChange(AppState.currentChat.id);
            syncCollectionItemsForMessage(msg);
            
            saveToStorage();
            renderChatMessagesDebounced();
            renderConversations();
            showToast('消息已修改');
            
            // 关闭编辑对话框
            const modal = document.getElementById('edit-message-modal');
            if (modal) modal.remove();
        }

        function syncCollectionItemsForMessage(msg) {
            if (!msg || !Array.isArray(AppState.collections)) return;

            const previewText = getCollectionPreviewTextFromMessage(msg);
            AppState.collections.forEach(item => {
                if (String(item.messageId) === String(msg.id)) {
                    item.messageContent = previewText;
                    item.messageSnapshot = buildCollectionMessageSnapshot(msg);
                }
            });
        }

        function enterMessageMultiSelect(msgId) {
            AppState.isSelectMode = true;
            AppState.selectedMessages = [msgId];
            
            renderChatMessagesDebounced();
            showMultiSelectToolbar();
            
            // 关闭菜单
            closeMessageContextMenu();
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
                renderChatMessagesDebounced();
                return;
            }
            
            // 优化:只更新当前气泡的选中状态,而不是重新渲染所有消息
            // 尝试查找普通消息气泡
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
            
            // 尝试查找撤回消息
            const retractWrapper = document.querySelector(`.retracted-message-wrapper[data-message-id="${msgId}"]`);
            if (retractWrapper) {
                if (index > -1) {
                    // 取消选中
                    retractWrapper.classList.remove('selected');
                } else {
                    // 选中
                    retractWrapper.classList.add('selected');
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
                if (deleteBtn) deleteBtn.textContent = '删除';
                if (forwardBtn) forwardBtn.textContent = '转发';
                if (countSpan) countSpan.textContent = count;
            }
        }

        function deleteSelectedMessages() {
            if (AppState.selectedMessages.length === 0) return;
            
            showConfirmDialog(`删除${AppState.selectedMessages.length}条消息？删除后不可撤回`, function() {
                if (!AppState.currentChat) return;

                const convId = AppState.currentChat.id;
                const idsToDelete = [...AppState.selectedMessages];
                const removedCount = purgeMessagesFromConversation(convId, idsToDelete);

                AppState.selectedMessages = [];
                AppState.isSelectMode = false;

                if (removedCount > 0) {
                    updateConversationAfterMessagesChange(convId);
                    saveToStorage();
                    renderChatMessagesDebounced();
                    renderConversations();
                }

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
            
            renderChatMessagesDebounced();
        }

        function selectAllMessages() {
            if (!AppState.currentChat) return;
            
            const messages = AppState.messages[AppState.currentChat.id] || [];
            AppState.selectedMessages = messages.map(m => m.id);
            
            renderChatMessagesDebounced();
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
                padding: 8px 6px;
                display: flex;
                gap: 4px;
                justify-content: space-between;
                align-items: center;
                z-index: 9999;
                animation: slideUp 0.2s ease-out;
                box-sizing: border-box;
            `;
            
            toolbar.innerHTML = `
                <button onclick="selectAllMessages()" style="padding:6px 8px;border:1px solid #ddd;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:12px;white-space:nowrap;min-width:0;flex-shrink:0;">全选</button>
                <div style="flex:1;text-align:center;font-size:12px;color:#666;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">已选 <span id="msg-select-count">1</span> 条</div>
                <button id="msg-forward-selected-btn" onclick="forwardSelectedMessages()" style="padding:6px 8px;border:1px solid #0066cc;border-radius:4px;background:#0066cc;color:#fff;cursor:pointer;font-size:12px;white-space:nowrap;min-width:0;flex-shrink:0;">转发</button>
                <button onclick="exitMultiSelectMode()" style="padding:6px 8px;border:1px solid #ddd;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:12px;white-space:nowrap;min-width:0;flex-shrink:0;">取消</button>
                <button id="msg-delete-selected-btn" onclick="deleteSelectedMessages()" style="padding:6px 8px;border:1px solid #f44;border-radius:4px;background:#f44;color:#fff;cursor:pointer;font-size:12px;white-space:nowrap;min-width:0;flex-shrink:0;">删除</button>
            `;
            
            document.body.appendChild(toolbar);
        }

        function cancelMessageMultiSelect() {
            AppState.isSelectMode = false;
            AppState.selectedMessages = [];
            
            const toolbar = document.getElementById('msg-multi-select-toolbar');
            if (toolbar) toolbar.remove();
            
            renderChatMessagesDebounced();
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

        function toChineseChapterNumber(num) {
            const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
            if (num <= 0) return '零';
            if (num < 10) return digits[num];
            if (num === 10) return '十';
            if (num < 20) return `十${digits[num % 10]}`;
            const tens = Math.floor(num / 10);
            const ones = num % 10;
            return ones === 0 ? `${digits[tens]}十` : `${digits[tens]}十${digits[ones]}`;
        }

        function getSummaryChapterLabel(conv) {
            const count = Array.isArray(conv?.summaries) ? conv.summaries.length : 0;
            if (count === 0) return '序章';
            return `第${toChineseChapterNumber(count)}章`;
        }

        function buildSummaryInput(rawText, options = {}) {
            const includeHeader = options.includeHeader !== false;
            if (!includeHeader) {
                return String(rawText || '');
            }

            const conv = options.conv || AppState.currentChat || {};
            const partnerName = options.partnerName || conv.userNameForChar || AppState.user?.name || '你';
            const chapterLabel = options.chapterLabel || getSummaryChapterLabel(conv);
            const modeLabel = options.modeLabel || '线上聊天';
            const header = options.header || `【章节名】${chapterLabel}\n【对话对象】${partnerName}\n【场景】${modeLabel}`;
            return `${header}\n\n${rawText}`;
        }

        window.buildSummaryInput = buildSummaryInput;
        window.getSummaryChapterLabel = getSummaryChapterLabel;

        function normalizeSummaryContent(rawContent) {
            const text = String(rawContent || '').trim();
            if (!text) return '';

            let cleaned = text.replace(/【本次总结】/g, '【剧情回顾】');
            cleaned = cleaned.replace(/【封面】[\s\S]*?(?=【[^】]+】|$)/g, '').trim();
            cleaned = cleaned.replace(/^(标题|章节名?|章节)：.*$/gm, '').trim();
            cleaned = cleaned.replace(/^一句话[:：]/gm, '补充：');

            return cleaned;
        }

        window.normalizeSummaryContent = normalizeSummaryContent;

        function isSecondaryApiConfigured() {
            if (window.SecondaryAPIManager && typeof window.SecondaryAPIManager.isConfigured === 'function') {
                return window.SecondaryAPIManager.isConfigured();
            }
            const api = AppState.apiSettings || {};
            return !!(api.secondaryEndpoint && api.secondaryApiKey && api.secondarySelectedModel);
        }

        function isMainApiConfigured() {
            const api = AppState.apiSettings || {};
            return !!(api.endpoint && api.selectedModel);
        }

        function summarizeTextViaMainAPI(text, onSuccess, onError) {
            const api = AppState.apiSettings || {};

            if (!isMainApiConfigured()) {
                const errorMsg = '主API未配置';
                showToast('请先在API设置中配置主API');
                if (onError) onError(errorMsg);
                return;
            }

            const systemPrompt = api.secondaryPrompts?.summarize || SUMMARY_PROMPT_V2;
            const baseEndpoint = window.APIUtils.normalizeEndpoint(api.endpoint);
            const endpoint = baseEndpoint + '/chat/completions';
            const { controller, timeoutId } = window.APIUtils.createTimeoutController(300000);

            const body = {
                model: api.selectedModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ],
                temperature: api.temperature !== undefined ? api.temperature : 0.8,
                max_tokens: 10000,
                frequency_penalty: api.frequencyPenalty !== undefined ? api.frequencyPenalty : 0.2,
                presence_penalty: api.presencePenalty !== undefined ? api.presencePenalty : 0.1,
                top_p: api.topP !== undefined ? api.topP : 1.0
            };

            const fetchOptions = window.APIUtils.createFetchOptions(api.apiKey || '', body, controller.signal);

            fetch(endpoint, fetchOptions)
            .then(res => {
                window.APIUtils.clearTimeoutController(timeoutId);
                if (!res.ok) {
                    return res.text().then(text => {
                        const errorMsg = `HTTP ${res.status}: ${res.statusText}\n详情: ${text.substring(0, 200)}`;
                        throw new Error(errorMsg);
                    });
                }
                return res.json();
            })
            .then(data => {
                const customFieldPaths = api.customResponseFieldPaths ? api.customResponseFieldPaths.split('\n').filter(p => p.trim()) : [];
                const result = window.APIUtils.extractTextWithCustomMapping(data, customFieldPaths);
                if (result && result.trim()) {
                    if (onSuccess) onSuccess(result);
                } else {
                    throw new Error('响应格式错误：无法找到有效内容');
                }
            })
            .catch(err => {
                window.APIUtils.clearTimeoutController(timeoutId);
                const userMessage = window.APIUtils.handleApiError(err, 300000);
                window.APIUtils.logApiError('主API', api.endpoint, api.selectedModel, body.messages.length, userMessage);
                showToast(`❌ ${userMessage}`);
                if (onError) onError(userMessage);
            });
        }

        // ========== 副API功能函数：自动总结 ==========
        function summarizeTextViaSecondaryAPI(text, onSuccess, onError) {
            console.log('📝 调用副API总结:', {
                textLength: text.length
            });

            if (isSecondaryApiConfigured() && window.SecondaryAPIManager && typeof window.SecondaryAPIManager.callWithDynamicPrompt === 'function') {
                callSecondaryAPIWithDynamicPrompt(text, 'summarize', onSuccess, onError);
                return;
            }

            summarizeTextViaMainAPI(text, onSuccess, onError);
        }

        // ========== 副API功能函数：总结对话 ==========
        function summarizeConversationViaSecondaryAPI(convId, onSuccess, onError) {
            const conv = AppState.conversations.find(c => c.id === convId);
            const msgs = AppState.messages[convId] || [];
            
            if (msgs.length === 0) {
                showToast('没有消息可以总结');
                if (onError) onError('No messages to summarize');
                return;
            }
            
            // 收集对话内容
            const userLabel = conv?.userNameForChar || AppState.user?.name || '用户';
            const charLabel = conv?.name || '角色';
            let conversationText = '';
            msgs.forEach(m => {
                if (m.type === 'sent') {
                    conversationText += `${userLabel}: ${m.content}\n`;
                } else if (m.type === 'received') {
                    conversationText += `${charLabel}: ${m.content}\n`;
                }
            });
            
            console.log('📝 准备总结对话，内容长度:', conversationText.length);

            const summaryInput = buildSummaryInput(conversationText, {
                conv: conv,
                modeLabel: '线上聊天',
                partnerName: userLabel
            });
            summarizeTextViaSecondaryAPI(summaryInput, onSuccess, onError);
        }

        // ========== 【新架构】心声提取已移至主API响应处理 ==========
        // collectConversationForSecondaryAPI 和 generateCharacterMindStateViaSecondaryAPI 已删除
        // 原因：心声现在直接从主API响应中提取（见 extractMindStateFromText 函数）

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
            const userLabel = conv?.userNameForChar || AppState.user?.name || '用户';
            const charLabel = conv?.name || '角色';
            let conversationText = '';
            msgs.forEach(m => {
                if (m.type === 'sent' && !m.isRetracted) {
                    conversationText += `${userLabel}: ${m.content}\n`;
                } else if (m.type === 'received' && !m.isRetracted) {
                    conversationText += `${charLabel}: ${m.content}\n`;
                }
            });

            showToast(isAutomatic ? '正在自动总结...' : '正在生成总结...');

            const summaryInput = buildSummaryInput(conversationText, {
                conv: conv,
                modeLabel: '线上聊天',
                partnerName: userLabel
            });
            summarizeTextViaSecondaryAPI(
                summaryInput,
                (result) => {
                    const normalizedSummary = typeof window.normalizeSummaryContent === 'function'
                        ? window.normalizeSummaryContent(result)
                        : result;

                    if (!conv.summaries) {
                        conv.summaries = [];
                    }
                    
                    conv.summaries.push({
                        content: normalizedSummary,
                        isAutomatic: isAutomatic,
                        timestamp: new Date().toISOString(),
                        messageCount: msgs.length
                    });
                    
                    saveToStorage();
                    showToast('总结已生成');
                    
                    // 触发重新渲染UI
                    if (AppState.currentChat && AppState.currentChat.id === convId) {
                        renderChatMessagesDebounced();
                    }
                    renderConversations();
                },
                (error) => {
                    console.error('总结出错:', error);
                    showToast('总结失败: ' + error);
                }
            );
        }

        // ========== 一起听功能特殊指令处理 ==========
        
        // 统一处理邀请响应（用户点击卡片按钮）
        // 注意：只有AI邀请用户时，用户才能点击按钮（isUserSent=false时）
        // 用户邀请AI时（isUserSent=true），按钮已禁用，此函数不会被调用
        function handleListenInvitationResponse(invitationMsg, response, isUserSent) {
            const convId = AppState.currentChat.id;
            
            // 标记邀请消息为已回复
            invitationMsg.isInvitationAnswered = true;
            invitationMsg.invitationStatus = response === 'accept' ? 'accepted' : 'rejected';
            
            if (response === 'accept') {
                // 用户接受AI的邀请
                // 传入false表示不再发送邀请卡片（因为已经有了AI的邀请卡片）
                if (window.ListenTogether) {
                    window.ListenTogether.open(false);
                    
                    // 播放AI喜欢库中的随机歌曲
                    setTimeout(() => {
                        if (window.ListenTogether && window.ListenTogether.getState) {
                            const state = window.ListenTogether.getState();
                            state.initiator = 'ai';
                            state.isActive = true;
                        }
                    }, 300);
                }
            }
            // 否则用户拒绝了（不需要额外处理，卡片会显示状态）
            
            // 刷新UI
            saveToStorage();
            renderChatMessagesDebounced();
        }
        
        // 结束一起听状态，标记相关邀请卡片为已关闭
        function endListenTogetherAndMarkClosed() {
            const convId = AppState.currentChat.id;
            if (!AppState.messages[convId]) return;
            
            // 【修复】标记所有未关闭的邀请卡片为已关闭
            // 注意：这个标记是临时的，重新打开一起听时会清除，以允许再次发送邀请卡片
            AppState.messages[convId].forEach(msg => {
                if (msg.type === 'listen_invite' && !msg.isListenTogetherClosed) {
                    msg.isListenTogetherClosed = true;
                }
            });
            
            // 保存状态到存储
            saveToStorage();
            
            // 重新渲染消息，显示"已关闭"状态
            if (renderChatMessagesDebounced) {
                renderChatMessagesDebounced(true);
            }
        }
        
        function processListenTogetherCommands(text) {
            if (!text) return null;
            
            // 处理接受邀请指令 [ACCEPT_LISTEN_INVITATION]
            if (text.includes('[ACCEPT_LISTEN_INVITATION]')) {
                const acceptText = text.replace('[ACCEPT_LISTEN_INVITATION]', '').trim();
                handleAcceptListenInvitation(acceptText);
                return { type: 'ACCEPT_LISTEN_INVITATION' };
            }
            
            // 处理拒绝邀请指令 [REJECT_LISTEN_INVITATION]
            if (text.includes('[REJECT_LISTEN_INVITATION]')) {
                const rejectText = text.replace('[REJECT_LISTEN_INVITATION]', '').trim();
                handleRejectListenInvitation(rejectText);
                return { type: 'REJECT_LISTEN_INVITATION' };
            }
            
            // 处理邀请一起听指令 [INVITE_LISTEN]
            if (text.includes('[INVITE_LISTEN]')) {
                const invitationText = text.replace('[INVITE_LISTEN]', '').trim();
                handleListenTogetherInvitation(invitationText);
                return { type: 'INVITE_LISTEN' };
            }
            
            // 处理切歌指令 [CHANGE_SONG]
            if (text.includes('[CHANGE_SONG]')) {
                const changeText = text.replace('[CHANGE_SONG]', '').trim();
                handleSongChange(changeText);
                return { type: 'CHANGE_SONG' };
            }
            
            return null;
        }
        
        // 处理接受一起听邀请
        // 注意：此函数只在用户发送邀请时被AI的[ACCEPT_LISTEN_INVITATION]指令触发
        // 不需要理由文本，仅做为操作标记
        function handleAcceptListenInvitation() {
            const convId = AppState.currentChat.id;
            
            // 标记原始邀请消息为已回复
            if (AppState.messages[convId]) {
                const invitationMsg = AppState.messages[convId].find(m => 
                    m.type === 'listen_invite' && m.sender === 'received' && !m.isInvitationAnswered
                );
                if (invitationMsg) {
                    invitationMsg.isInvitationAnswered = true;
                    invitationMsg.invitationStatus = 'accepted';
                }
            }
            
            // 更新一起听状态：用户已加入
            if (window.ListenTogether && window.ListenTogether.setState) {
                window.ListenTogether.setState({
                    userAcceptedInvitation: true,
                    userJoinedAt: Date.now()
                });
            }
            
            saveToStorage();
            renderChatMessagesDebounced();
        }
        
        // 处理拒绝一起听邀请
        // 注意：当用户邀请AI时，按钮已禁用，不会调用此函数
        // 此函数仅在AI邀请用户，用户点击"拒绝"按钮时调用
        function handleRejectListenInvitation() {
            const convId = AppState.currentChat.id;
            
            // 标记原始邀请消息为已回复
            if (AppState.messages[convId]) {
                const invitationMsg = AppState.messages[convId].find(m => 
                    m.type === 'listen_invite' && m.sender === 'received' && !m.isInvitationAnswered
                );
                if (invitationMsg) {
                    invitationMsg.isInvitationAnswered = true;
                    invitationMsg.invitationStatus = 'rejected';
                }
            }
            
            saveToStorage();
            renderChatMessagesDebounced();
        }

        // 处理AI主动修改角色网名指令：[SET_CHAR_NICKNAME]新网名
        function handleAISetCharNickname(convId, rawNickname) {
            if (!convId) return;

            const conv = AppState.conversations && AppState.conversations.find(c => c.id === convId);
            if (!conv) return;

            const oldNickname = (conv.charNickname || '').trim();

            const nickname = String(rawNickname || '')
                .replace(/[\[\]【】]/g, '')
                .replace(/^[:：\-\s]+/, '')
                .trim()
                .slice(0, 30);

            if (!nickname) return;
            if (nickname === oldNickname) return;

            conv.charNickname = nickname;

            // 同步到好友数据
            const friend = AppState.friends && AppState.friends.find(f => f.id === convId);
            if (friend) {
                friend.charNickname = nickname;
            }

            // 同步当前聊天引用
            if (AppState.currentChat && AppState.currentChat.id === convId) {
                AppState.currentChat.charNickname = nickname;
                const titleEl = document.getElementById('chat-title');
                if (titleEl) {
                    titleEl.textContent = getConversationDisplayName(conv);
                }
            }

            addNicknameChangeNotice(convId, 'assistant', 'assistant', oldNickname, nickname, true);
            showToast('对方更新了网名：' + nickname);
        }

        // 处理一起听邀请
        function handleListenTogetherInvitation(invitationText) {
            if (window.ListenTogether && window.ListenTogether.getState) {
                const listenState = window.ListenTogether.getState();
                if (listenState.isActive) {
                    // 如果已经在一起听，只显示AI的想法，不生成预设消息
                    // invitationText已经包含了AI自主生成的想法，直接使用
                    // 不需要添加系统消息
                } else {
                    // AI邀请用户一起听
                    showListenTogetherInvitation(invitationText);
                }
            }
        }
        
        // 处理用户邀请加入一起听的逻辑
        function handleUserListenInvitation(userInviteMsg) {
            if (!window.ListenTogether || !window.ListenTogether.getState) return;
            
            const listenState = window.ListenTogether.getState();
            const convId = AppState.currentChat.id;
            
            if (listenState.isActive) {
                // 【场景1】已经处于一起听状态 → 直接打开一起听页面（不显示邀请卡片）
                // 将该邀请标记为已回复（已接受）
                userInviteMsg.isInvitationAnswered = true;
                userInviteMsg.invitationStatus = 'accepted';
                
                // 直接打开一起听页面
                if (window.ListenTogether) {
                    window.ListenTogether.open(false);
                }
            } else {
                // 【场景2】不处于一起听状态 → 显示邀请卡片，让AI自主决定
                // 邀请卡片已由其他逻辑创建，这里仅需保证状态正确
            }
            
            saveToStorage();
        }

        // 智能一起听邀请 - 根据上下文决定是否邀请
        // 显示一起听邀请界面
        function showListenTogetherInvitation(invitationText, skipRender = false) {
            const convId = AppState.currentChat.id;
            const aiName = AppState.currentCharacter?.name || '角色';
            
            // 获取当前播放的歌曲信息
            let songName = '正在听音乐';
            if (window.ListenTogether && window.ListenTogether.getState) {
                const listenState = window.ListenTogether.getState();
                if (listenState.currentSong) {
                    songName = listenState.currentSong.name || listenState.currentSong.title || '正在听音乐';
                }
            }
            
            // AI邀请用户加入一起听（毛玻璃卡片样式，显示在左侧）
            const invitationMsg = {
                id: 'msg_' + Date.now(),
                type: 'listen_invite',
                sender: 'received',  // received表示AI发送，显示在左侧
                content: invitationText || '要一起来听音乐吗',
                songName: songName,
                time: new Date().toISOString(),
                isListenTogetherInvite: true,
                isInvitationToListen: true,
                isInvitationAnswered: false,
                readByUser: false
            };
            
            if (!AppState.messages[convId]) {
                AppState.messages[convId] = [];
            }
            AppState.messages[convId].push(invitationMsg);
            
            AppState.currentChat.lastMsg = invitationMsg.content;
            AppState.currentChat.time = formatTime(new Date());
            AppState.currentChat.lastMessageTime = invitationMsg.time;
            
            saveToStorage();
            
            // 只有在不跳过渲染时才立即渲染（外部调用时）
            // 在appendAssistantMessage中会传入true以避免重复渲染
            if (!skipRender) {
                renderChatMessagesDebounced();
            }
        }

        // 播放下一首歌
        function handleSongChange(songName) {
            if (!songName || !songName.trim()) {
                console.log('⚠️ 未指定要切换的歌曲');
                return;
            }
            
            if (window.ListenTogether && window.ListenTogether.getState) {
                const listenState = window.ListenTogether.getState();
                const convId = AppState.currentChat.id;
                
                // 检查是否在一起听状态中或有待回复的邀请
                const hasUnrepliedInvitation = AppState.messages[convId] && AppState.messages[convId].some(m =>
                    m && m.type === 'listen_invite' && !m.isInvitationAnswered
                );
                
                if (listenState.isActive || hasUnrepliedInvitation) {
                    let songQuery = songName.trim();
                    console.log(`🎵 切歌指令: ${songQuery}`);
                    
                    // 如果包含书名号《》，提取其中的歌曲名
                    const bookMarkMatch = songQuery.match(/[《『「]([^》』」]+)[》』」]/);
                    if (bookMarkMatch && bookMarkMatch[1]) {
                        songQuery = bookMarkMatch[1].trim();
                        console.log(`📍 从书名号中提取歌曲名: ${songQuery}`);
                    }
                    
                    // 先尝试从喜欢库中播放
                    let success = playSongByName(songQuery);
                    
                    if (!success) {
                        // 如果喜欢库中没有，则搜索并添加
                        if (window.ListenTogether && window.ListenTogether.searchAndAddFavorite) {
                            window.ListenTogether.searchAndAddFavorite(songQuery).then(addSuccess => {
                                if (addSuccess) {
                                    // 添加成功，500ms后再次尝试播放
                                    setTimeout(() => {
                                        const playSuccess = playSongByName(songQuery);
                                        if (playSuccess) {
                                            console.log(`✅ 已切歌到: ${songQuery}`);
                                            saveToStorage();
                                            renderChatMessagesDebounced();
                                        }
                                    }, 500);
                                } else {
                                    // 搜索失败，降级到下一首
                                    console.log(`⚠️ 搜索"${songQuery}"失败，切到下一首`);
                                    playNextSong();
                                }
                            }).catch(err => {
                                console.error('搜索歌曲出错:', err);
                                playNextSong();
                            });
                        } else {
                            // ListenTogether未就绪，降级到下一首
                            console.log('⚠️ ListenTogether模块未就绪');
                            playNextSong();
                        }
                    } else {
                        // 在喜欢库中找到并播放成功
                        console.log(`✅ 已切歌到: ${songQuery}`);
                        saveToStorage();
                        renderChatMessagesDebounced();
                    }
                }
            }
        }

        // 【改进2】处理AI收藏歌曲指令
        // 注意：AI通过[ADD_FAVORITE_SONG]指令来收藏歌曲
        // 指令后直接跟歌曲名，通过搜索功能找到歌曲，然后添加到喜欢库
        function handleAIAddFavoriteSong(songName) {
            if (!songName || !songName.trim()) {
                console.log('⚠️ 未指定要收藏的歌曲');
                return;
            }
            
            let songQuery = songName.trim();
            console.log(`💾 收藏歌曲指令: ${songQuery}`);
            
            // 如果包含书名号《》，提取其中的歌曲名
            const bookMarkMatch = songQuery.match(/[《『「]([^》』」]+)[》』」]/);
            if (bookMarkMatch && bookMarkMatch[1]) {
                songQuery = bookMarkMatch[1].trim();
                console.log(`📍 从书名号中提取歌曲名: ${songQuery}`);
            }
            
            // 调用listen-together中的搜索并收藏方法
            if (window.ListenTogether && window.ListenTogether.searchAndAddFavorite) {
                window.ListenTogether.searchAndAddFavorite(songQuery).then(success => {
                    if (success) {
                        console.log(`✅ 已收藏歌曲: ${songQuery}`);
                    } else {
                        console.log(`⚠️ 收藏歌曲失败: ${songQuery}`);
                    }
                    
                    // 刷新UI
                    saveToStorage();
                    renderChatMessagesDebounced();
                }).catch(err => {
                    console.error('收藏歌曲出错:', err);
                });
            } else {
                console.log('⚠️ ListenTogether模块未就绪');
            }
        }

        // 智能切歌 - 根据上下文决定是否切歌
        // 播放下一首歌
        // 播放下一首歌（队列中的下一首）
        function playNextSong() {
            if (window.ListenTogether && window.ListenTogether.playNext) {
                try {
                    window.ListenTogether.playNext();
                    return true;
                } catch (e) {
                    console.error('切歌失败:', e);
                    return false;
                }
            }
            return false;
        }
        
        // 根据歌曲名称从喜欢库中查找并播放
        function playSongByName(songQuery) {
            if (!window.ListenTogether || !window.ListenTogether.playSongByName) {
                // 降级到playNext
                return playNextSong();
            }
            
            try {
                // 调用listen-together.js中的playSongByName方法
                const success = window.ListenTogether.playSongByName(songQuery);
                return success;
            } catch (e) {
                console.error('播放指定歌曲失败:', e);
                // 降级到playNext
                return playNextSong();
            }
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
                replyTo: replyToId || undefined,
                readByAI: false  // 默认未读，AI读取后设为true
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
            renderChatMessagesDebounced();
            renderConversations();
            
            // 清空输入
            input.value = '';
            input.style.height = 'auto';
            input.placeholder = '输入消息...双击任意头像触发角色回复';
            
            // 移除引用显示栏（旧版本）和隐藏新版引用栏
            const replyBar = document.getElementById('reply-bar');
            if (replyBar) replyBar.remove();
            const quoteContainer = document.getElementById('quote-message-bar-container');
            if (quoteContainer) quoteContainer.style.display = 'none';
            const quoteBar = document.getElementById('quote-message-bar');
            if (quoteBar) quoteBar.style.display = '';
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
                renderChatMessagesDebounced();
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

        function openProfileTextEditModal(options = {}) {
            const {
                title = '编辑资料',
                value = '',
                placeholder = '',
                multiline = false,
                maxLength = 80,
                onConfirm = null
            } = options;

            const existingModal = document.getElementById('profile-text-edit-modal');
            if (existingModal) {
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.id = 'profile-text-edit-modal';
            modal.className = 'profile-edit-modal';
            modal.innerHTML = `
                <div class="profile-edit-modal-panel">
                    <div class="profile-edit-modal-header">
                        <div class="profile-edit-modal-title">${title}</div>
                        <button type="button" class="profile-edit-modal-close" aria-label="关闭">×</button>
                    </div>
                    <div class="profile-edit-modal-body"></div>
                    <div class="profile-edit-modal-actions">
                        <button type="button" class="profile-edit-modal-btn ghost">取消</button>
                        <button type="button" class="profile-edit-modal-btn primary">保存</button>
                    </div>
                </div>
            `;

            const modalBody = modal.querySelector('.profile-edit-modal-body');
            const inputElement = document.createElement(multiline ? 'textarea' : 'input');
            inputElement.className = multiline ? 'profile-edit-modal-textarea' : 'profile-edit-modal-input';
            if (!multiline) {
                inputElement.type = 'text';
            }
            inputElement.placeholder = placeholder;
            inputElement.maxLength = maxLength;
            inputElement.value = value || '';
            modalBody.appendChild(inputElement);

            const closeModal = () => {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                }, 240);
            };

            const handleConfirm = () => {
                const nextValue = inputElement.value.trim();
                if (typeof onConfirm === 'function') {
                    const accepted = onConfirm(nextValue);
                    if (accepted === false) {
                        return;
                    }
                }
                closeModal();
            };

            modal.querySelector('.profile-edit-modal-close').addEventListener('click', closeModal);
            modal.querySelector('.profile-edit-modal-btn.ghost').addEventListener('click', closeModal);
            modal.querySelector('.profile-edit-modal-btn.primary').addEventListener('click', handleConfirm);

            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeModal();
                }
            });

            inputElement.addEventListener('keydown', function(e) {
                if (!multiline && e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                }
            });

            document.body.appendChild(modal);

            requestAnimationFrame(() => {
                modal.classList.add('show');
                inputElement.focus();
                if (!multiline) {
                    inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
                }
            });
        }

        function editUserName() {
            openProfileTextEditModal({
                title: '编辑昵称',
                value: AppState.user.name || '',
                placeholder: '请输入新昵称',
                multiline: false,
                maxLength: 20,
                onConfirm: function(newName) {
                    if (!newName) {
                        showToast('昵称不能为空');
                        return false;
                    }
                    AppState.user.name = newName;
                    saveToStorage();
                    updateUserDisplay();
                    return true;
                }
            });
        }

        function editUserSignature() {
            openProfileTextEditModal({
                title: '编辑个性签名',
                value: AppState.user.signature || '',
                placeholder: '请输入个性签名',
                multiline: true,
                maxLength: 80,
                onConfirm: function(newSig) {
                    AppState.user.signature = newSig;
                    saveToStorage();
                    updateUserDisplay();
                    return true;
                }
            });
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

        function getApiSettingsCardBody(card) {
            if (!card) return null;

            if (card.classList.contains('api-params-card')) {
                return card.querySelector('#api-params-container, #secondary-api-params-container');
            }

            return card.querySelector(':scope > div');
        }

        function setApiSettingsCardCollapsed(card, collapsed) {
            if (!card) return;

            const header = card.querySelector('.card-title, .api-params-header');
            const body = getApiSettingsCardBody(card);

            card.classList.toggle('af-collapsed', !!collapsed);

            if (header) {
                header.setAttribute('aria-expanded', String(!collapsed));
            }

            if (!body) return;

            if (collapsed) {
                body.style.display = 'none';
            } else {
                body.style.removeProperty('display');
            }
        }

        function bindApiSettingsCardCollapse(card) {
            if (!card) return;

            const header = card.querySelector('.card-title, .api-params-header');
            if (!header || header.dataset.apiCollapseBound === '1') return;

            header.dataset.apiCollapseBound = '1';
            header.classList.add('af-collapsible-header');
            header.setAttribute('role', 'button');
            header.setAttribute('tabindex', '0');

            header.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCardContent(header);
                }
            });
        }
        
        // 折叠/展开卡片内容
        function toggleCardContent(clickedElement) {
            const headerElement = clickedElement.closest('.card-title') || clickedElement.closest('.api-params-header') || clickedElement;
            if (!headerElement) return;

            const card = headerElement.closest('.settings-card, .api-params-card');
            if (!card) return;

            const isCollapsed = card.classList.contains('af-collapsed');
            setApiSettingsCardCollapsed(card, !isCollapsed);
        }
        
        // 折叠/展开主API参数内容（特殊处理）
        function toggleApiParamsContent(headerElement) {
            toggleCardContent(headerElement);
        }
        
        // 折叠/展开副API参数内容（特殊处理）
        function toggleSecondaryApiParamsContent(headerElement) {
            toggleCardContent(headerElement);
        }
        
        function initApiSettingsUI() {
            // 初始化设置与配置页面内的折叠卡片（样式和交互与添加好友页一致）
            const apiSettingsPage = document.getElementById('api-settings-page');
            if (!apiSettingsPage) return;

            const collapsibleCards = apiSettingsPage.querySelectorAll('.settings-card, .api-params-card');
            collapsibleCards.forEach(card => {
                bindApiSettingsCardCollapse(card);
                setApiSettingsCardCollapsed(card, true);
            });
            
            // 将存储的设置填入界面
            loadApiSettingsToUI();
            
            // 初始化预设选择器
            initApiPresetUI();
            
            // 如果已有API设置和模型列表，则不需要重新拉取（提高稳定性）
            // 只在用户点击"拉取模型"时才手动拉取
            
            // 主API模型选择器 change 事件监听 - 自动保存
            const modelsSelect = document.getElementById('models-select');
            if (modelsSelect) {
                modelsSelect.addEventListener('change', function() {
                    AppState.apiSettings.selectedModel = this.value;
                    const display = document.getElementById('selected-model-display');
                    if (display) display.textContent = this.value;
                    saveToStorage();
                    console.log('✅ 主API模型已更新并保存:', this.value);
                });
            }
            
            // API预设管理按钮 - 新增预设
            const apiPresetCreateBtn = document.getElementById('api-preset-create-btn');
            if (apiPresetCreateBtn) {
                apiPresetCreateBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    createNewApiPreset();
                }, false);
            }
            
            // 初始化预设列表显示
            refreshApiPresetsList();


            // 副API拉取模型按钮
            const pullSecondaryModelsBtn = document.getElementById('pull-secondary-models-btn');
            if (pullSecondaryModelsBtn) {
                pullSecondaryModelsBtn.addEventListener('click', function() {
                    fetchSecondaryModels();
                }, false);
            }

            // 注意：副API密钥显示/隐藏切换已在SecondaryAPIManager.initEventListeners()中处理
            // 避免重复绑定事件
            
            // MiniMax TTS 相关事件
            initMinimaxTTSEvents();
            
            // 添加全局按钮处理 - 确保在手机端也能工作
            setupGlobalButtonHandlers();
        }
        
        // 初始化 MiniMax TTS 事件
        function initMinimaxTTSEvents() {
            // API Key 显示/隐藏切换
            const minimaxKeyToggle = document.getElementById('minimax-api-key-toggle');
            const minimaxKeyInput = document.getElementById('minimax-api-key');
            if (minimaxKeyToggle && minimaxKeyInput) {
                // 初始状态：输入框为text类型，按钮显示"隐藏"
                minimaxKeyToggle.textContent = '隐藏';
                minimaxKeyToggle.addEventListener('click', function() {
                    if (minimaxKeyInput.type === 'text') {
                        minimaxKeyInput.type = 'password';
                        this.textContent = '显示';
                    } else {
                        minimaxKeyInput.type = 'text';
                        this.textContent = '隐藏';
                    }
                });
            }
            
            // 测试按钮
            const testBtn = document.getElementById('test-minimax-tts-btn');
            if (testBtn) {
                testBtn.addEventListener('click', async function() {
                    try {
                        // 保存当前配置
                        saveMinimaxTTSSettings();
                        
                        showToast('正在测试 MiniMax TTS...');
                        await MinimaxTTS.test();
                        showToast('✅ MiniMax TTS 测试成功！');
                    } catch (error) {
                        console.error('MiniMax TTS 测试失败:', error);
                        showToast('❌ 测试失败: ' + error.message);
                    }
                });
            }
        }
        
        // 保存 MiniMax TTS 设置
        function saveMinimaxTTSSettings() {
            const enabled = document.getElementById('minimax-tts-enabled')?.checked || false;
            const groupId = document.getElementById('minimax-group-id')?.value || '';
            const apiKey = document.getElementById('minimax-api-key')?.value || '';
            const voiceId = document.getElementById('minimax-voice-id')?.value || 'female-tianmei';
            const speed = parseFloat(document.getElementById('minimax-speed-input')?.value || 1.0);
            const volume = parseFloat(document.getElementById('minimax-volume-input')?.value || 1.0);
            
            const config = {
                enabled,
                groupId,
                apiKey,
                voiceId,
                speed,
                volume
            };
            
            if (window.MinimaxTTS) {
                MinimaxTTS.updateConfig(config);
            }
            
            saveToStorage();
            console.log('[MiniMax TTS] 设置已保存', config);
        }
        
        // 加载 MiniMax TTS 设置到 UI
        function loadMinimaxTTSSettingsToUI() {
            const config = AppState.apiSettings?.minimaxTTS || {};
            
            const enabledCheckbox = document.getElementById('minimax-tts-enabled');
            const groupIdInput = document.getElementById('minimax-group-id');
            const apiKeyInput = document.getElementById('minimax-api-key');
            const voiceIdInput = document.getElementById('minimax-voice-id');
            const speedInput = document.getElementById('minimax-speed-input');
            const volumeInput = document.getElementById('minimax-volume-input');
            
            if (enabledCheckbox) enabledCheckbox.checked = config.enabled || false;
            if (groupIdInput) groupIdInput.value = config.groupId || '';
            if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
            if (voiceIdInput) voiceIdInput.value = config.voiceId || 'female-tianmei';
            if (speedInput) {
                speedInput.value = config.speed || 1.0;
                document.getElementById('minimax-speed-value').textContent = config.speed || 1.0;
            }
            if (volumeInput) {
                volumeInput.value = config.volume || 1.0;
                document.getElementById('minimax-volume-value').textContent = config.volume || 1.0;
            }
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
            
            // 处理其他按钮事件（如需要可在此扩展）
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
        
        // 刷新预设列表显示
        function refreshApiPresetsList() {
            const listContainer = document.getElementById('api-presets-list');
            if (!listContainer) return;
            
            const presets = AppState.apiSettings?.presets || [];
            const currentPresetId = AppState.apiSettings?.currentPresetId || null;
            
            if (presets.length === 0) {
                listContainer.innerHTML = '<div class="api-preset-empty">暂无预设</div>';
                return;
            }
            
            let html = '';
            presets.forEach((preset) => {
                const isActive = currentPresetId === preset.id;
                const endpointText = preset.endpoint
                    ? `${preset.endpoint.substring(0, 30)}${preset.endpoint.length > 30 ? '...' : ''}`
                    : '未填写';

                html += `
                    <div class="api-preset-item ${isActive ? 'is-active' : ''}">
                        <div class="api-preset-meta">
                            <div class="api-preset-name">${preset.name}</div>
                            <div class="api-preset-line">主API: ${endpointText}</div>
                            ${preset.selectedModel ? `<div class="api-preset-line">模型: ${preset.selectedModel}</div>` : ''}
                        </div>
                        <div class="api-preset-actions">
                            <button class="modern-btn modern-btn-small api-preset-action-btn" onclick="selectApiPreset('${preset.id}');">使用</button>
                            <button class="modern-btn modern-btn-small api-preset-action-btn" onclick="updateApiPreset('${preset.id}');">更新</button>
                            <button class="modern-btn modern-btn-small api-preset-action-btn is-danger" onclick="deleteApiPreset('${preset.id}');">删除</button>
                        </div>
                    </div>
                `;
            });
            
            listContainer.innerHTML = html;
        }
        
        // 创建新API预设
        function createNewApiPreset() {
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
                    <input type="text" id="new-preset-name-input" class="api-preset-name-input" placeholder="请输入预设名称">
                    
                    <div class="api-preset-modal-actions">
                        <button class="emoji-mgmt-btn" onclick="document.getElementById('new-preset-name-modal').remove();">取消</button>
                        <button class="emoji-mgmt-btn api-preset-confirm-btn" onclick="confirmNewPresetName();">确定</button>
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
            refreshApiPresetsList();
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
            showToast(`已加载预设：${preset.name}，正在拉取模型...`);
        }
        
        // 更新API预设（用当前的API设置和模型更新该预设）
        function updateApiPreset(presetId) {
            const preset = (AppState.apiSettings.presets || []).find(p => p.id === presetId);
            if (!preset) return;
            
            // 获取当前表单中的最新配置
            const currentEndpoint = document.getElementById('api-endpoint').value.trim();
            const currentApiKey = document.getElementById('api-key').value.trim();
            const currentSelectedModel = document.getElementById('models-select').value;
            const currentSecondaryEndpoint = document.getElementById('secondary-api-endpoint').value.trim();
            const currentSecondaryApiKey = document.getElementById('secondary-api-key').value.trim();
            const currentSecondarySelectedModel = document.getElementById('secondary-models-select').value;
            
            if (!currentEndpoint || !currentApiKey) {
                showToast('请先填写主API端点和密钥');
                return;
            }
            
            // 更新预设内容
            preset.endpoint = currentEndpoint;
            preset.apiKey = currentApiKey;
            preset.selectedModel = currentSelectedModel;
            preset.secondaryEndpoint = currentSecondaryEndpoint;
            preset.secondaryApiKey = currentSecondaryApiKey;
            preset.secondarySelectedModel = currentSecondarySelectedModel;
            preset.updatedAt = new Date().toISOString();
            
            saveToStorage();
            refreshApiPresetsList();
            showToast(`预设 "${preset.name}" 已更新`);
        }
        
        // 为预设自动拉取模型
        async function fetchModelsForPreset(preset) {
            if (!preset.endpoint) return;
            
            try {
                // 使用 APIUtils 拉取模型（30秒超时）
                const models = await window.APIUtils.fetchModels(preset.endpoint, preset.apiKey, 30000);
                
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
                const userMessage = window.APIUtils.handleApiError(e, 30000);
                showToast(`拉取模型失败: ${userMessage}`);
                console.error('fetch models for preset failed:', e);
            }
        }

        // 为预设拉取副API模型 - 已迁移到 secondary-api-manager.js
        async function fetchSecondaryModelsForPreset(preset) {
            return SecondaryAPIManager.fetchModelsForPreset(preset);
        }
        
        // 删除API预设
        function deleteApiPreset(presetId) {
            // 创建自定义确认对话框
            let modal = document.getElementById('delete-api-preset-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'delete-api-preset-modal';
            modal.className = 'emoji-mgmt-modal show';
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            modal.innerHTML = `
                <div class="emoji-mgmt-content api-preset-delete-content">
                    <div class="emoji-mgmt-header api-preset-delete-header">
                        <h3 class="api-preset-delete-title">确认删除</h3>
                        <button class="emoji-mgmt-close" onclick="document.getElementById('delete-api-preset-modal').remove();">
                            <svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div class="api-preset-delete-body">
                        <p class="api-preset-delete-text">确定要删除该预设吗？删除后将无法恢复。</p>
                    </div>
                    <div class="api-preset-delete-actions">
                        <button class="emoji-mgmt-btn" onclick="document.getElementById('delete-api-preset-modal').remove();">取消</button>
                        <button class="emoji-mgmt-btn api-preset-danger-btn" onclick="confirmDeleteApiPreset('${presetId}');">删除</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
        
        function confirmDeleteApiPreset(presetId) {
            document.getElementById('delete-api-preset-modal').remove();
            
            AppState.apiSettings.presets = (AppState.apiSettings.presets || []).filter(p => p.id !== presetId);
            
            if (AppState.apiSettings.currentPresetId === presetId) {
                AppState.apiSettings.currentPresetId = null;
            }
            
            saveToStorage();
            refreshApiPresetsList();
            showToast('预设已删除');
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
                
                // API密钥默认显示（text类型不触发安全键盘）
                if (keyEl) {
                    keyEl.value = s.apiKey || '';
                    keyEl.type = 'text';  // 保持text类型，不触发安全键盘
                }
                
                if (apiKeyToggle) {
                    apiKeyToggle.textContent = '隐藏';  // 默认状态为显示
                }
                
                if (aiToggle) aiToggle.checked = !!s.aiTimeAware;
                
                const offlineTimeToggle = document.getElementById('offline-time-aware');
                if (offlineTimeToggle) offlineTimeToggle.checked = !!s.offlineTimeAware;
                
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

                // 加载副API参数
                const secondaryTemperatureEl = document.getElementById('secondary-temperature-input');
                const secondaryFrequencyPenaltyEl = document.getElementById('secondary-frequency-penalty-input');
                const secondaryPresencePenaltyEl = document.getElementById('secondary-presence-penalty-input');
                const secondaryTopPEl = document.getElementById('secondary-top-p-input');
                
                if (secondaryTemperatureEl) {
                    const stempValue = s.secondaryTemperature !== undefined ? s.secondaryTemperature : 0.8;
                    secondaryTemperatureEl.value = stempValue;
                    const stempDisplay = document.getElementById('secondary-temperature-value');
                    if (stempDisplay) stempDisplay.textContent = stempValue;
                }
                if (secondaryFrequencyPenaltyEl) {
                    const sfpValue = s.secondaryFrequencyPenalty !== undefined ? s.secondaryFrequencyPenalty : 0.2;
                    secondaryFrequencyPenaltyEl.value = sfpValue;
                    const sfpDisplay = document.getElementById('secondary-frequency-penalty-value');
                    if (sfpDisplay) sfpDisplay.textContent = sfpValue;
                }
                if (secondaryPresencePenaltyEl) {
                    const sppValue = s.secondaryPresencePenalty !== undefined ? s.secondaryPresencePenalty : 0.1;
                    secondaryPresencePenaltyEl.value = sppValue;
                    const sppDisplay = document.getElementById('secondary-presence-penalty-value');
                    if (sppDisplay) sppDisplay.textContent = sppValue;
                }
                if (secondaryTopPEl) {
                    const stopPValue = s.secondaryTopP !== undefined ? s.secondaryTopP : 1.0;
                    secondaryTopPEl.value = stopPValue;
                    const stopPDisplay = document.getElementById('secondary-top-p-value');
                    if (stopPDisplay) stopPDisplay.textContent = stopPValue;
                }

                // 副API设置加载已迁移到 secondary-api-manager.js
                SecondaryAPIManager.loadSettingsToUI();
                
                // 加载 MiniMax TTS 设置
                loadMinimaxTTSSettingsToUI();
                
                // 刷新预设列表显示
                refreshApiPresetsList();
            } catch (e) { console.error(e); }
        }

        // ===== 世界书UI初始化 =====
        function initWorldbookUI() {
            // 世界书功能已迁移到worldbook.js
            // WorldbookManager会自动初始化
            console.log('世界书UI由WorldbookManager管理');
        }



        function saveApiSettingsFromUI() {
            const endpoint = (document.getElementById('api-endpoint') || {}).value || '';
            const apiKey = (document.getElementById('api-key') || {}).value || '';
            const selected = (document.getElementById('models-select') || {}).value || '';
            const aiTime = !!((document.getElementById('ai-time-aware') || {}).checked);
            const offlineTime = !!((document.getElementById('offline-time-aware') || {}).checked);
            
            // 主API参数
            const temperature = parseFloat((document.getElementById('temperature-input') || {}).value || 0.8);
            const frequencyPenalty = parseFloat((document.getElementById('frequency-penalty-input') || {}).value || 0.2);
            const presencePenalty = parseFloat((document.getElementById('presence-penalty-input') || {}).value || 0.1);
            const topP = parseFloat((document.getElementById('top-p-input') || {}).value || 1.0);
            
            // 副API参数
            const secondaryTemperature = parseFloat((document.getElementById('secondary-temperature-input') || {}).value || 0.8);
            const secondaryFrequencyPenalty = parseFloat((document.getElementById('secondary-frequency-penalty-input') || {}).value || 0.2);
            const secondaryPresencePenalty = parseFloat((document.getElementById('secondary-presence-penalty-input') || {}).value || 0.1);
            const secondaryTopP = parseFloat((document.getElementById('secondary-top-p-input') || {}).value || 1.0);

            AppState.apiSettings = AppState.apiSettings || {};
            AppState.apiSettings.endpoint = endpoint.trim();
            AppState.apiSettings.apiKey = apiKey.trim();
            AppState.apiSettings.selectedModel = selected;
            AppState.apiSettings.aiTimeAware = aiTime;
            AppState.apiSettings.offlineTimeAware = offlineTime;
            
            // 保存主API参数（添加范围验证）
            AppState.apiSettings.temperature = isNaN(temperature) ? 0.8 : Math.max(0, Math.min(2, temperature));
            AppState.apiSettings.frequencyPenalty = isNaN(frequencyPenalty) ? 0.2 : Math.max(-2, Math.min(2, frequencyPenalty));
            AppState.apiSettings.presencePenalty = isNaN(presencePenalty) ? 0.1 : Math.max(-2, Math.min(2, presencePenalty));
            AppState.apiSettings.topP = isNaN(topP) ? 1.0 : Math.max(0, Math.min(1, topP));
            
            // 保存副API参数（添加范围验证）
            AppState.apiSettings.secondaryTemperature = isNaN(secondaryTemperature) ? 0.8 : Math.max(0, Math.min(2, secondaryTemperature));
            AppState.apiSettings.secondaryFrequencyPenalty = isNaN(secondaryFrequencyPenalty) ? 0.2 : Math.max(-2, Math.min(2, secondaryFrequencyPenalty));
            AppState.apiSettings.secondaryPresencePenalty = isNaN(secondaryPresencePenalty) ? 0.1 : Math.max(-2, Math.min(2, secondaryPresencePenalty));
            AppState.apiSettings.secondaryTopP = isNaN(secondaryTopP) ? 1.0 : Math.max(0, Math.min(1, secondaryTopP));

            // 保存副API设置 - 已迁移到 secondary-api-manager.js
            SecondaryAPIManager.saveSettingsFromUI();
            
            // 保存 MiniMax TTS 设置
            saveMinimaxTTSSettings();

            // persist
            saveToStorage();
            loadApiSettingsToUI();
            refreshApiPresetsList();
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

        // ========== 主API调用已迁移到 MainAPIManager ==========
        // callApiWithConversation() 和 collectConversationForApi() 已移至 main-api-manager.js
        // 请使用 MainAPIManager.callApiWithConversation() 代替


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
            
            return `【表情包系统】真实社交聊天中表情包使用频率较高。语境轻松、情绪明显或需要强调语气时，优先考虑发送表情包。建议平均每3-5条回复包含1次表情包；若一句话即可表达情绪，也可以只发送表情包。不要每次都发，但也不要长期完全不发。
你有权访问以下表情包分组【${groupNameStr}】中的表情：${emojiList}

发送表情包的方法：在你的回复中任何位置，使用以下格式包含表情包：
【表情包】${allEmojis.length > 0 ? allEmojis[0].text : '表情'}【/表情包】

格式说明：
- 【表情包】和【/表情包】必须成对出现
- 中间填写你选择的表情描述（必须是上面列出的表情之一）
- 不必每次都发，但也不要长期完全不发，保持自然且常见的使用频率
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

        // ========== collectConversationForApi 已迁移到 MainAPIManager ==========
        // 该函数已移至 main-api-manager.js，请使用 MainAPIManager.collectConversationForApi() 代替
        
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
            const hasFormatTags = text.includes('[THINK]') || text.includes('[REPLY') || text.includes('[MSG');
            if (!hasFormatTags) {
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
                
                // 🔧 修复：检查是否有未闭合的MSG标签（AI忘记写闭合标签）
                // 从 lastIndex 开始搜索，看是否有新的 [MSG...]
                let searchStart = lastIndex;
                while (searchStart < text.length) {
                    // 查找下一个 [MSG 开头
                    const msgStartIndex = text.indexOf('[MSG', searchStart);
                    if (msgStartIndex === -1) break;
                    
                    // 提取 MSG 数字
                    const msgHeaderMatch = text.substring(msgStartIndex).match(/\[MSG(\d+)\]/);
                    if (!msgHeaderMatch) {
                        searchStart = msgStartIndex + 1;
                        continue;
                    }
                    
                    const msgHeaderEnd = msgStartIndex + msgHeaderMatch[0].length;
                    
                    // 查找对应的 [/MSGn] 闭合标签
                    const msgNum = msgHeaderMatch[1];
                    const closeTag = `[/MSG${msgNum}]`;
                    const closeTagIndex = text.indexOf(closeTag, msgHeaderEnd);
                    
                    let msgContent;
                    let nextSearchStart;
                    
                    if (closeTagIndex !== -1) {
                        // 找到闭合标签
                        msgContent = text.substring(msgHeaderEnd, closeTagIndex).trim();
                        nextSearchStart = closeTagIndex + closeTag.length;
                    } else {
                        // 未找到闭合标签，提取到文本结尾或下一个[MSG之前
                        const nextMsgStart = text.indexOf('[MSG', msgHeaderEnd);
                        if (nextMsgStart !== -1) {
                            msgContent = text.substring(msgHeaderEnd, nextMsgStart).trim();
                            nextSearchStart = nextMsgStart;
                        } else {
                            msgContent = text.substring(msgHeaderEnd).trim();
                            nextSearchStart = text.length;
                        }
                    }
                    
                    // 过滤空内容和只包含WAIT的内容
                    if (msgContent && !msgContent.match(/^\[WAIT/)) {
                        console.log('🔧 检测到未闭合的MSG标签，自动补充:', msgContent.substring(0, 50));
                        messages.push({
                            type: 'message',
                            content: msgContent,
                            delay: 0
                        });
                        
                        // 检查后面是否有WAIT标记
                        const waitRegex = /\[WAIT:?([\d.]+)?\]/;
                        const nextText = text.substring(nextSearchStart, nextSearchStart + 50);
                        const waitMatch = nextText.match(waitRegex);
                        if (waitMatch) {
                            const delay = waitMatch[1] ? parseFloat(waitMatch[1]) * 1000 : 500;
                            messages[messages.length - 1].delay = delay;
                        }
                    }
                    
                    searchStart = nextSearchStart;
                }
            }
            
            // 注意：如果有思考内容但没有回复，不创建默认消息
            // 这样可以避免在消息气泡中显示"（思考中...）"
            // 思考过程应该是完全隐藏的内部过程
            
            // 如果没有解析到消息，尝试提取残留文本作为兜底
            if (messages.length === 0 && hasFormatTags) {
                const fallbackText = text
                    .replace(/\[THINK\][\s\S]*?\[\/THINK\]/g, '')
                    .replace(/\[REPLY\d+\]|\[\/REPLY\d+\]/g, '')
                    .replace(/\[MSG\d+\]|\[\/MSG\d+\]/g, '')
                    .replace(/\[WAIT(?::[\d.]+)?\]/g, '')
                    .replace(/<thinking>[\s\S]*?(<\/thinking>|$)/gi, '')
                    .replace(/<reasoning>[\s\S]*?(<\/reasoning>|$)/gi, '')
                    .trim();

                if (fallbackText) {
                    messages.push({
                        type: 'message',
                        content: fallbackText,
                        delay: 0
                    });
                }
            }

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
            
            // 【第-1层】清理一起听指令标记（仅删除标记，保留文本内容）
            // 指令标记是系统控制信号，但用户需要看到指令后的AI对话内容
            text = text.replace(/\[ACCEPT_LISTEN_INVITATION\]/g, '');
            text = text.replace(/\[REJECT_LISTEN_INVITATION\]/g, '');
            text = text.replace(/\[INVITE_LISTEN\]/g, '');
            text = text.replace(/\[CHANGE_SONG\]/g, '');
            text = text.replace(/\[ADD_FAVORITE_SONG\]/g, '');
            
            // 第零层：移除API角色标记（如assistant, user等）
            text = text.replace(/^(assistant|system|user)[:：\s]*/gi, '');
            text = text.replace(/[\s\n](assistant|system|user)[:：\s]*/gi, '\n');
            
            // 第零点五层：移除JSON/对象序列化的内容（可能包含role字段）
            text = text.replace(/\{"role":\s*"[^"]*"[\s\S]*?\}/g, '');
            text = text.replace(/"role":\s*"[^"]*"[,]?/g, '');
            
            // 第一层：移除思考过程标记（如果有残留）
            // 这可能在已提取的消息内容中出现
            text = text.replace(/\[THINK\][\s\S]*?\[\/THINK\]/g, '');
            text = text.replace(/<thinking>[\s\S]*?(<\/thinking>|$)/gi, '');
            text = text.replace(/<reasoning>[\s\S]*?(<\/reasoning>|$)/gi, '');
            text = text.replace(/<analysis>[\s\S]*?(<\/analysis>|$)/gi, '');
            text = text.replace(/\[REPLY\d+\]|\[\/REPLY\d+\]/g, '');
            text = text.replace(/\[MSG\d+\]|\[\/MSG\d+\]/g, '');  // 清理新格式的MSG标签
            text = text.replace(/\[WAIT(?::[\d.]+)?\]/g, '');
            
            // 第二层：移除所有带【】标记的系统信息
            // 包括心声、思维链、思考、系统、指令等，但保留红包相关标记
            // 修复：只在【...】闭合标签对时才移除，避免误删除消息内容
            text = text.replace(/【(心声|思维链|思考|系统|指令|提示|缓冲|内部|调试|日志)】[\s\S]*?【\/\1】/g, '');
            
            // 也清理可能没有闭合标签的版本（【标签】内容格式）
            text = text.replace(/【(心声|思维链|思考|系统|指令|提示|缓冲|内部|调试|日志)】/g, '');
            
            // 保留红包相关标记的处理（不删除）
            // 保留图片描述卡片标记的处理（不删除）
            
            // 第三层：移除所有包含"thinking"、"thought"的标记（防止AI用英文绕过）
            text = text.replace(/\n?\[.*?(thinking|thought|mindstate|internal|debug|system|instruction|assistant|role).*?\][\s\S]*?(?=\n|$)/gi, '');
            text = text.replace(/\n?\{.*?(thinking|thought|mindstate|internal|debug|system|instruction|assistant|role).*?\}[\s\S]*?(?=\n|$)/gi, '');
            
            // 第四层：移除类似"穿搭："、"心情："等结构化数据（包含所有新字段，使用AI实际输出的标签名）
            text = text.replace(/\n?(位置|穿搭|醋意值|醋意值触发|兴奋度|兴奋度描述|身体反应|随身物品|购物车|心声|潜台词|真意|好感度|好感度变化|好感度原因|location|outfit|jealousy|jealousyTrigger|excitement|excitementDesc|bodyTrait|items|shoppingCart|content|hiddenMeaning|affinity|affinityChange|affinityReason)[:：][\s\S]*?(?=\n(?:位置|穿搭|醋意值|醋意值触发|兴奋度|兴奋度描述|身体反应|随身物品|购物车|心声|潜台词|真意|好感度|好感度变化|好感度原因|location|outfit|jealousy|jealousyTrigger|excitement|excitementDesc|bodyTrait|items|shoppingCart|content|hiddenMeaning|affinity|affinityChange|affinityReason)|$)/gi, '');

            // 第五层：移除任何看起来像JSON或YAML的结构化数据块
            text = text.replace(/\n?\{[\s\S]*?"(位置|穿搭|醋意值|醋意值触发|兴奋度|兴奋度描述|身体反应|随身物品|购物车|心声|潜台词|真意|好感度|好感度变化|好感度原因|location|outfit|jealousy|jealousyTrigger|excitement|excitementDesc|bodyTrait|items|shoppingCart|content|hiddenMeaning|affinity|affinityChange|affinityReason)"[\s\S]*?\}(?=\n|$)/g, '');
            text = text.replace(/\n?---[\s\S]*?---(?=\n|$)/g, '');
            
            // 第六层：移除基础指标、情感羁绊、欲望等分组标题
            text = text.replace(/\n?\[?基础指标\]?[:：]?/gi, '');
            text = text.replace(/\n?\[?情感羁绊\]?[:：]?/gi, '');
            text = text.replace(/\n?\[?欲望\]?[:：]?/gi, '');
            text = text.replace(/\n?\[?随身物品\]?[:：]?/gi, '');
            text = text.replace(/\n?\[?购物车\]?[:：]?/gi, '');
            text = text.replace(/\n?\[?此时此刻的心声\]?[:：]?/gi, '');
            
            // 第七层：移除时间戳和日期信息
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

        // ===== 群聊消息解析 =====
        // 解析AI群聊回复中的【角色名】消息内容 格式
        function parseGroupChatResponse(text) {
            const results = [];
            // 先清理心声标记
            let cleaned = text.replace(/【心声】[\s\S]*?【\/心声】/g, '').trim();
            // 清理[MSG]标签
            cleaned = cleaned.replace(/\[MSG\d+\]/g, '').replace(/\[\/MSG\d+\]/g, '').replace(/\[WAIT:[0-9.]+\]/g, '');
            
            // 匹配【角色名】消息内容 格式
            const regex = /【([^【】/]{1,20})】([^【]*?)(?=【[^【】/]{1,20}】|$)/gs;
            let match;
            while ((match = regex.exec(cleaned)) !== null) {
                const senderName = match[1].trim();
                const content = match[2].trim();
                // 排除系统标签（如【红包】【转账】等）
                if (content && !['红包', '转账', '领取红包', '退还红包', '确认收款', '退还转账', '语音条', '地理位置', '图片描述', '撤回', '心声', '对话状态', '开场白', '角色名'].includes(senderName)) {
                    results.push({ senderName: senderName, content: content });
                }
            }
            return results;
        }

        // 添加群聊消息（带发送者名称）
        function appendGroupMessage(convId, senderName, content) {
            if (!AppState.messages[convId]) {
                AppState.messages[convId] = [];
            }
            const aiMsg = {
                id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                type: 'received',
                content: content,
                groupSenderName: senderName,
                time: new Date().toISOString(),
                apiCallRound: currentApiCallRound,
                readByUser: !!(AppState.currentChat && AppState.currentChat.id === convId)
            };
            AppState.messages[convId].push(aiMsg);

            // 更新会话
            const conv = AppState.conversations.find(c => c.id === convId);
            if (conv) {
                conv.lastMsg = senderName + ': ' + content.substring(0, 30);
                conv.time = formatTime(new Date());
                conv.lastMessageTime = aiMsg.time;
            }
        }

        function appendAssistantMessage(convId, text) {
            console.log('📝 appendAssistantMessage 被调用 - convId:', convId, 'currentChat:', AppState.currentChat?.id);
            
            // ========== 第一步：提取所有一起听相关指令（新增完善的指令提取）==========
            const directives = [];
            const textWithoutDirectives = text.slice();
            
            // 提取所有指令（保持顺序）
            const instructionPatterns = [
                // ACCEPT/REJECT无参数
                { pattern: /\[ACCEPT_LISTEN_INVITATION\]/s, type: 'ACCEPT_LISTEN_INVITATION', removePattern: /\[ACCEPT_LISTEN_INVITATION\]/ },
                { pattern: /\[REJECT_LISTEN_INVITATION\]/s, type: 'REJECT_LISTEN_INVITATION', removePattern: /\[REJECT_LISTEN_INVITATION\]/ },
                // INVITE_LISTEN: 提取到下一个【或[为止
                { pattern: /\[INVITE_LISTEN\](.*?)(?=\[|【|$)/s, type: 'INVITE_LISTEN', removePattern: /\[INVITE_LISTEN\][^\[\n]*/ },
                // CHANGE_SONG: 只提取歌曲名（到逗号、句号或下一个[为止）
                { pattern: /\[CHANGE_SONG\]([^\[\n,，。.]*?)(?=[,，。.\[]|$)/s, type: 'CHANGE_SONG', removePattern: /\[CHANGE_SONG\][^\[\n,，。.]*/ },
                // ADD_FAVORITE_SONG: 只提取歌曲名（到逗号、句号或下一个[为止）
                { pattern: /\[ADD_FAVORITE_SONG\]([^\[\n,，。.]*?)(?=[,，。.\[]|$)/s, type: 'ADD_FAVORITE_SONG', removePattern: /\[ADD_FAVORITE_SONG\][^\[\n,，。.]*/ },
                // SET_CHAR_NICKNAME: AI主动修改自己的角色网名
                { pattern: /\[SET_CHAR_NICKNAME\](.*?)(?=\[|【|$)/s, type: 'SET_CHAR_NICKNAME', removePattern: /\[SET_CHAR_NICKNAME\][^\[\n]*/ }
            ];
            
            // 找到所有指令及其内容
            for (const {pattern, type} of instructionPatterns) {
                const match = textWithoutDirectives.match(pattern);
                if (match) {
                    directives.push({
                        type: type,
                        content: (match[1] || '').trim()
                    });
                }
            }
            
            // 处理邀请响应指令（优先级最高）
            // 但只有在用户发送了未回复的邀请时才处理
            const unrepliedUserInvitation = AppState.messages[convId] && AppState.messages[convId].find(m => 
                m && m.type === 'listen_invite' && m.sender === 'received' && !m.isInvitationAnswered
            );
            
            const invitationResponses = directives.filter(d => 
                d.type === 'ACCEPT_LISTEN_INVITATION' || d.type === 'REJECT_LISTEN_INVITATION'
            );
            
            for (const response of invitationResponses) {
                // 只有当用户发送了未回复的邀请时，才处理接受/拒绝指令
                if (unrepliedUserInvitation) {
                    if (response.type === 'ACCEPT_LISTEN_INVITATION') {
                        handleAcceptListenInvitation();
                    } else if (response.type === 'REJECT_LISTEN_INVITATION') {
                        handleRejectListenInvitation();
                    }
                } else {
                    // 如果没有用户邀请，则将这些指令作为普通文本保留
                    console.log('⚠️ 使用了接受/拒绝邀请指令，但用户没有发送邀请，指令被忽略');
                }
            }
            
            // 处理其他一起听指令
            const otherDirectives = directives.filter(d => 
                d.type === 'INVITE_LISTEN' || d.type === 'CHANGE_SONG' || d.type === 'ADD_FAVORITE_SONG' || d.type === 'SET_CHAR_NICKNAME'
            );
            
            for (const directive of otherDirectives) {
                if (directive.type === 'INVITE_LISTEN') {
                    showListenTogetherInvitation(directive.content, true); // 传入true跳过立即渲染
                } else if (directive.type === 'CHANGE_SONG') {
                    handleSongChange(directive.content);
                } else if (directive.type === 'ADD_FAVORITE_SONG') {
                    handleAIAddFavoriteSong(directive.content);
                } else if (directive.type === 'SET_CHAR_NICKNAME') {
                    handleAISetCharNickname(convId, directive.content);
                }
            }
            
            // 移除所有指令标记，保留指令后的文本内容（AI自然对话）
            let cleanText = text;
            
            // 【处理规则】
            // ACCEPT/REJECT: 仅删除指令标记
            // INVITE_LISTEN: 删除指令和其内容（邀请理由不显示在消息中）
            // CHANGE_SONG/ADD_FAVORITE_SONG: 删除指令、歌曲名和后面的逗号，保留逗号后的内容
            
            // 1. 删除接受/拒绝指令标记（无内容）
            cleanText = cleanText.replace(/\[ACCEPT_LISTEN_INVITATION\]/g, '');
            cleanText = cleanText.replace(/\[REJECT_LISTEN_INVITATION\]/g, '');
            
            // 2. 删除邀请指令及其理由（不在消息中显示邀请理由）
            cleanText = cleanText.replace(/\[INVITE_LISTEN\][^\[\n]*?(?=\[|$)/gs, '');
            
            // 3. 删除切歌指令、歌曲名和后面的逗号，保留逗号后的内容
            // 匹配: [CHANGE_SONG]歌曲名（任何非[,\n,逗号句号的字符）[,，。.可选]
            // 但要保留后续内容
            cleanText = cleanText.replace(/\[CHANGE_SONG\][^\[\n,，。.]*[,，。.]?\s*/g, '');
            
            // 4. 删除收藏指令、歌曲名和后面的逗号，保留逗号后的内容
            cleanText = cleanText.replace(/\[ADD_FAVORITE_SONG\][^\[\n,，。.]*[,，。.]?\s*/g, '');

            // 5. 删除修改网名指令及其参数
            cleanText = cleanText.replace(/\[SET_CHAR_NICKNAME\][^\[\n]*\s*/g, '');
            
            // 6. 移除多余的空格和换行
            cleanText = cleanText.trim();
            
            // 如果处理了指令但没有其他内容，直接返回
            if (directives.length > 0 && !cleanText) {
                return;
            }
            
            // 使用cleanText继续后续处理
            text = cleanText;
            
            // ========== 【改进】智能一起听行为逻辑（当处于一起听时）==========
            if (window.ListenTogether) {
                const listenState = window.ListenTogether.getState();
                
                // 在一起听活跃状态下，根据AI消息内容智能判断
                if (listenState.isActive && listenState.currentSong) {
                    // 智能判断是否应该收藏当前歌曲
                    // 已移除预设规则，由AI自主决定收藏时机
                    
                    // 智能判断是否应该切歌
                    // 已移除预设规则，由AI自主决定切歌时机
                }
                
                // 不处于一起听状态，智能判断是否应该邀请用户
                // 已移除预设规则，由AI自主决定邀请时机
            }
            

            
            // ========== 群聊模式：解析角色名标记 ==========
            const conv = AppState.conversations.find(c => c.id === convId);
            if (conv && conv.type === 'group') {
                // 提取心声数据（群聊也需要）
                MindStateManager.handleMindStateSave(convId, text);
                
                // 解析【角色名】消息内容 格式
                const groupMessages = parseGroupChatResponse(text);
                if (groupMessages.length > 0) {
                    let delay = 0;
                    groupMessages.forEach(function(gm) {
                        setTimeout(function() {
                            appendGroupMessage(convId, gm.senderName, gm.content);
                            // 每条消息添加后立即渲染
                            saveToStorage();
                            renderChatMessagesDebounced();
                        }, delay);
                        delay += 800; // 每条消息间隔800ms
                    });
                    // 最后更新会话列表
                    setTimeout(function() {
                        renderConversations();
                        // 更新心声按钮
                        if (AppState.currentChat && AppState.currentChat.id === convId) {
                            MindStateManager.updateMindStateButton(conv);
                        }
                    }, delay);
                    return;
                }
                // 如果没有解析到角色名标记，按普通消息处理（使用群名作为发送者）
            }
            
            // ========== 第一步：提前提取并保存心声数据（无论单消息还是多消息） ==========
            MindStateManager.handleMindStateSave(convId, text);
            
            // ========== 第二步：处理AI图片生成指令 ==========
            if (window.AIImageGenerator) {
                cleanText = AIImageGenerator.removeImageTags(cleanText);
                // 异步处理图片生成，不阻塞消息显示
                AIImageGenerator.processImageInstructions(convId, cleanText).catch(err => {
                    console.error('处理图片生成指令失败:', err);
                });
            }
            
            // ========== 第三步：检查是否包含思考过程格式 ==========
            // 使用cleanText来检测思考过程，确保指令已被移除
            const thinkingData = parseThinkingProcess(cleanText);
            
            if (thinkingData) {
                // 存在思考过程，分批添加消息
                console.log('🔀 检测到思考过程，调用 appendMultipleAssistantMessages');
                appendMultipleAssistantMessages(convId, thinkingData);
            } else {
                // 普通消息，按原有逻辑处理
                console.log('💬 普通消息，调用 appendSingleAssistantMessage');
                appendSingleAssistantMessage(convId, cleanText, true); // 传递skipMindStateExtraction=true，避免重复提取
            }
            
            // ========== 第四步：更新心声按钮 ==========
            const convForUpdate = AppState.conversations.find(c => c.id === convId);
            if (AppState.currentChat && AppState.currentChat.id === convId && convForUpdate) {
                MindStateManager.updateMindStateButton(convForUpdate);
            }
            
            // ========== 第五步：触发自动生成朋友圈 ==========
            if (typeof MomentsGroupInteraction !== 'undefined' && convForUpdate) {
                // 异步触发，不阻塞主流程
                setTimeout(() => {
                    try {
                        MomentsGroupInteraction.checkAndTriggerAutoMoments(convForUpdate.id, convForUpdate.name);
                    } catch (e) {
                        console.error('触发自动生成朋友圈失败:', e);
                    }
                }, 500);
            }
        }

        // 获取角色头像的辅助函数
        function getCharacterAvatar() {
            const avatarImg = document.querySelector('.chat-avatar img');
            if (avatarImg && avatarImg.src) {
                return avatarImg.src;
            }
            // 返回默认头像
            return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23ff9a9e"/></svg>';
        }

        function normalizeEmojiKey(value) {
            return String(value || '').toLowerCase().replace(/[^0-9a-z\u4e00-\u9fa5]+/g, '');
        }

        function resolveEmojiFromTag(emojiName, convId) {
            const cleanedName = String(emojiName || '').trim().replace(/^["'“”]+|["'“”]+$/g, '').trim();
            if (!cleanedName) return null;

            const conv = AppState.conversations.find(c => c.id === convId) || {};
            const boundGroups = conv.boundEmojiGroups || (conv.boundEmojiGroup ? [conv.boundEmojiGroup] : []);
            const emojiPool = boundGroups && boundGroups.length > 0
                ? AppState.emojis.filter(e => boundGroups.includes(e.groupId))
                : AppState.emojis;

            if (!emojiPool || emojiPool.length === 0) return null;

            let emoji = emojiPool.find(e => e.text === cleanedName);
            const normalizedName = normalizeEmojiKey(cleanedName);

            if (!emoji && normalizedName) {
                emoji = emojiPool.find(e => normalizeEmojiKey(e.text) === normalizedName);
            }

            if (!emoji && normalizedName) {
                emoji = emojiPool.find(e => {
                    const normalizedText = normalizeEmojiKey(e.text);
                    return normalizedText && (normalizedText.includes(normalizedName) || normalizedName.includes(normalizedText));
                });
            }

            if (!emoji) return null;

            return { url: emoji.url, text: emoji.text };
        }
        
        function appendSingleAssistantMessage(convId, text, skipMindStateExtraction = false) {
            // ========== 第-1步：清理所有一起听指令标记（仅删除标记，保留文本内容） ==========
            // 指令标记只是系统信号，但后面的文本是AI的真实对话用户需要看到
            
            // 【修复】检查是否包含接受邀请指令，用于后续卡片状态判断
            const hasAcceptInvitation = text.includes('[ACCEPT_LISTEN_INVITATION]');
            
            text = text.replace(/\[ACCEPT_LISTEN_INVITATION\]/g, '');
            text = text.replace(/\[REJECT_LISTEN_INVITATION\]/g, '');
            text = text.replace(/\[INVITE_LISTEN\]/g, '');
            text = text.replace(/\[CHANGE_SONG\]/g, '');
            text = text.replace(/\[ADD_FAVORITE_SONG\]/g, '');
            
            text = text.trim();
            
            // 如果所有内容都是指令，则无需继续处理
            if (!text) {
                return;
            }
            
            // ========== 第0步：提前处理红包相关指令（在拆分消息之前） ==========
            const sendEnvelopeRegex = /【红包】([0-9.]+)\|([^【】]*)【\/红包】/g;
            const sendEnvelopeMatches = [...text.matchAll(sendEnvelopeRegex)];
            for (const match of sendEnvelopeMatches) {
                const amount = parseFloat(match[1]);
                const message = match[2] || '收下吧~';
                
                console.log('[RedEnvelope] AI发送红包:', { amount, message });
                
                if (window.RedEnvelopeModule && typeof window.RedEnvelopeModule.sendAIRedEnvelope === 'function') {
                    window.RedEnvelopeModule.sendAIRedEnvelope(convId, amount, message);
                }
                
                text = text.replace(match[0], '').trim();
            }
            
            // 2. 处理AI领取红包：【领取红包】红包ID【/领取红包】
            const receiveEnvelopeRegex = /【领取红包】([^【】]+)【\/领取红包】/g;
            const receiveEnvelopeMatches = [...text.matchAll(receiveEnvelopeRegex)];
            for (const match of receiveEnvelopeMatches) {
                const envelopeId = match[1].trim();
                
                console.log('[RedEnvelope] AI领取红包:', envelopeId);
                
                if (window.RedEnvelopeModule && typeof window.RedEnvelopeModule.handleAIReceive === 'function') {
                    window.RedEnvelopeModule.handleAIReceive(envelopeId);
                }
                
                text = text.replace(match[0], '').trim();
            }
            
            // 3. 处理AI退还红包：【退还红包】红包ID【/退还红包】
            const returnEnvelopeRegex = /【退还红包】([^【】]+)【\/退还红包】/g;
            const returnEnvelopeMatches = [...text.matchAll(returnEnvelopeRegex)];
            for (const match of returnEnvelopeMatches) {
                const envelopeId = match[1].trim();
                
                console.log('[RedEnvelope] AI退还红包:', envelopeId);
                
                if (window.RedEnvelopeModule && typeof window.RedEnvelopeModule.handleAIReturn === 'function') {
                    window.RedEnvelopeModule.handleAIReturn(envelopeId);
                }
                
                text = text.replace(match[0], '').trim();
            }
            
            // 4. 处理AI发送转账：【转账】金额|说明【/转账】
            const sendTransferRegex = /【转账】([0-9.]+)\|([^【】]*)【\/转账】/g;
            const sendTransferMatches = [...text.matchAll(sendTransferRegex)];
            for (const match of sendTransferMatches) {
                const amount = parseFloat(match[1]);
                const message = match[2] || '转账给你';
                
                console.log('[Transfer] AI发送转账:', { amount, message });
                
                if (window.TransferModule && typeof window.TransferModule.sendAITransfer === 'function') {
                    window.TransferModule.sendAITransfer(convId, amount, message);
                }
                
                text = text.replace(match[0], '').trim();
            }
            
            // 5. 处理AI确认收款：【确认收款】转账ID【/确认收款】
            const receiveTransferRegex = /【确认收款】([^【】]+)【\/确认收款】/g;
            const receiveTransferMatches = [...text.matchAll(receiveTransferRegex)];
            for (const match of receiveTransferMatches) {
                const transferId = match[1].trim();
                
                console.log('[Transfer] AI确认收款:', transferId);
                
                if (window.TransferModule && typeof window.TransferModule.handleAIReceive === 'function') {
                    window.TransferModule.handleAIReceive(transferId);
                }
                
                text = text.replace(match[0], '').trim();
            }
            
            // 6. 处理AI退还转账：【退还转账】转账ID【/退还转账】
            const returnTransferRegex = /【退还转账】([^【】]+)【\/退还转账】/g;
            const returnTransferMatches = [...text.matchAll(returnTransferRegex)];
            for (const match of returnTransferMatches) {
                const transferId = match[1].trim();
                
                console.log('[Transfer] AI退还转账:', transferId);
                
                if (window.TransferModule && typeof window.TransferModule.handleAIReturn === 'function') {
                    window.TransferModule.handleAIReturn(transferId);
                }
                
                text = text.replace(match[0], '').trim();
            }
            
            // ========== 第一步：清理AI回复（移除心声标记） ==========
            // 首先应用强大的清理函数
            text = cleanAIResponse(text);
            
            // ========== 第1.5步：检测并拆分包含换行的消息为多个独立气泡 ==========
            // 如果文本包含连续的换行符（两个或更多），将其拆分为多个消息
            const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
            
            if (paragraphs.length > 1) {
                // 检测到多个段落，转换为多消息格式
                console.log('🔀 检测到多段落消息，拆分为', paragraphs.length, '个独立气泡');
                const thinkingData = {
                    messages: paragraphs.map((para, index) => ({
                        content: para,
                        delay: index === 0 ? 0 : 800 // 第一条立即显示，后续每条延迟800ms
                    }))
                };
                appendMultipleAssistantMessages(convId, thinkingData);
                return; // 提前返回，不继续执行单消息逻辑
            }
            
            // 如果只有单个换行符，也拆分为多个消息（更自然的聊天体验）
            const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length > 1) {
                // 检测到多行消息，转换为多消息格式
                console.log('🔀 检测到多行消息，拆分为', lines.length, '个独立气泡');
                const thinkingData = {
                    messages: lines.map((line, index) => ({
                        content: line,
                        delay: index === 0 ? 0 : 600 // 第一条立即显示，后续每条延迟600ms
                    }))
                };
                appendMultipleAssistantMessages(convId, thinkingData);
                return; // 提前返回，不继续执行单消息逻辑
            }
            
            // ========== 第二步：处理撤回标记 ==========
            // 匹配撤回标记：【撤回】消息ID【/撤回】
            const retractRegex = /【\s*撤回\s*】\s*([^【】]+?)\s*【\s*[\/／]\s*撤回\s*】/;
            const retractMatch = text.match(retractRegex);
            
            if (retractMatch && retractMatch[1]) {
                const targetMsgId = retractMatch[1].trim();
                // AI主动撤回某条消息
                if (!AppState.messages[convId]) {
                    AppState.messages[convId] = [];
                }
                const messages = AppState.messages[convId];
                const msgIndex = messages.findIndex(m => String(m.id) === String(targetMsgId));
                
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
                    if (AppState.currentChat && AppState.currentChat.id === convId) renderChatMessagesDebounced();
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
                console.log('🎭 检测到表情包指令:', emojiName);
                console.log('📚 表情包库总量:', AppState.emojis.length);
                
                // 在表情包库中查找对应的表情（支持轻微格式差异）
                const resolvedEmoji = resolveEmojiFromTag(emojiName, convId);
                if (resolvedEmoji) {
                    emojiUrl = resolvedEmoji.url;
                    emojiText = resolvedEmoji.text;
                    console.log('✅ 找到匹配的表情包:', emojiText, emojiUrl);
                } else {
                    console.log('❌ 未找到匹配的表情包，检查表情包描述是否匹配');
                    console.log('🛠️ 现有表情包描述:', AppState.emojis.map(e => e.text));
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
            // 兼容格式：
            // 1) 【地理位置】详细地址|距离【/地理位置】
            // 2) 【地理位置】详细地址【/地理位置】
            // 3) 【地理位置】任意|详细地址|距离【/地理位置】（兼容旧格式，忽略位置名）
            const locationRegex = /【地理位置】([^【]+?)【\/地理位置】/;
            const locationMatch = text.match(locationRegex);
            let locationName = '';
            let locationAddress = '';
            let locationDistance = 1; // 默认1km，但AI应该根据实际情况设置
            let isLocation = false;
            
            if (locationMatch && locationMatch[1]) {
                const locationPayload = locationMatch[1].trim();
                if (locationPayload) {
                    const parts = locationPayload.split('|').map(part => part.trim());
                    const p1 = parts[0] || '';
                    const p2 = parts[1] || '';
                    const p3 = parts[2] || '';

                    if (parts.length >= 3) {
                        locationName = '';
                        locationAddress = p2 || p1;
                        locationDistance = parseLocationDistanceKm(p3, locationDistance);
                    } else if (parts.length === 2) {
                        const parsedDistance = parseLocationDistanceKm(p2, null);
                        locationAddress = p1;
                        locationName = '';
                        if (parsedDistance !== null) {
                            locationDistance = parsedDistance;
                        }
                    } else {
                        // 单字段：按详细地址处理
                        locationAddress = p1;
                    }
                }

                if (!locationAddress && locationName) {
                    locationAddress = locationName;
                }
                isLocation = !!locationAddress;

                // 从文本中移除地理位置标记
                text = text.replace(locationRegex, '').trim();
            }
            
            // ========== 第5.5步：处理语音通话信息 ==========
            // 匹配语音通话标记：【语音通话】【/语音通话】
            const voiceCallRegex = /【语音通话】【\/语音通话】/;
            const voiceCallMatch = text.match(voiceCallRegex);
            let isVoiceCall = false;
            
            if (voiceCallMatch) {
                isVoiceCall = true;
                console.log('[VoiceCall] 检测到AI主动发起语音通话请求');
                
                // 从文本中移除语音通话标记
                text = text.replace(voiceCallRegex, '').trim();
                
                // 获取角色信息
                const conv = AppState.conversations.find(c => c.id === convId);
                const characterName = conv?.name || '未知角色';
                const characterAvatar = getCharacterAvatar();
                
                console.log(`[VoiceCall] 角色名称: ${characterName}`);
                
                // 延迟一小段时间后触发来电
                setTimeout(() => {
                    if (window.VoiceCallSystem && typeof window.VoiceCallSystem.receiveCall === 'function') {
                        window.VoiceCallSystem.receiveCall(characterName, characterAvatar);
                    } else {
                        console.warn('⚠️ 语音通话系统未初始化');
                    }
                }, 800);
            }
            
            // ========== 第5.6步：处理视频通话信息 ==========
            // 匹配视频通话标记：【视频通话】【/视频通话】
            const videoCallRegex = /【视频通话】【\/视频通话】/;
            const videoCallMatch = text.match(videoCallRegex);
            let isVideoCall = false;
            
            if (videoCallMatch) {
                isVideoCall = true;
                console.log('[VideoCall] 检测到AI主动发起视频通话请求');
                
                // 从文本中移除视频通话标记
                text = text.replace(videoCallRegex, '').trim();
                
                // 获取角色信息
                const conv = AppState.conversations.find(c => c.id === convId);
                const characterName = conv?.name || '未知角色';
                const characterAvatar = getCharacterAvatar();
                
                console.log(`[VideoCall] 角色名称: ${characterName}`);
                
                // 延迟一小段时间后触发来电
                setTimeout(() => {
                    if (window.VideoCallSystem && typeof window.VideoCallSystem.receiveCall === 'function') {
                        window.VideoCallSystem.receiveCall(characterName, characterAvatar, convId);
                    } else {
                        console.warn('⚠️ 视频通话系统未初始化');
                    }
                }, 800);
            }
            
            // ========== 第5.7步：红包指令已在函数开头处理，此处已移除重复代码 ==========
            
            // ========== 第5.8步：处理图片描述信息 ==========
            // 匹配图片描述标记：【图片描述】描述文字【/图片描述】
            const photoDescRegex = /【图片描述】([^【]+?)【\/图片描述】/;
            const photoDescMatch = text.match(photoDescRegex);
            let isPhotoDesc = false;
            let photoDescription = null;
            
            if (photoDescMatch && photoDescMatch[1]) {
                isPhotoDesc = true;
                photoDescription = photoDescMatch[1].trim();
                console.log('[PhotoDescription] 检测到AI发送图片描述卡片:', photoDescription);
                
                // 从文本中移除图片描述标记
                text = text.replace(photoDescRegex, '').trim();
            }
            
            // 最终清理：移除所有剩余的【】标记对
            text = text.replace(/【[^】]*】[^【】]*【[\/／][^】]*】/g, '').trim();
            text = text.replace(/\n{3,}/g, '\n\n').trim();
            
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
                    apiCallRound: currentApiCallRound,
                    readByUser: false  // 默认未读
                };
                AppState.messages[convId].push(aiVoiceMsg);
            }
            
            // 如果检测到地理位置消息，创建地理位置消息
            if (isLocation && (locationAddress || locationName)) {
                const effectiveLocationAddress = locationAddress || locationName;
                const locationDistanceLabel = formatLocationDistanceKm(locationDistance);
                const aiLocationMsg = {
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    type: 'location',
                    content: `${effectiveLocationAddress} (${locationDistanceLabel}km)`,
                    locationName: locationName || '',
                    locationAddress: effectiveLocationAddress,
                    locationDistance: locationDistance,
                    locationDistanceUnit: 'km',
                    sender: 'received',
                    time: new Date().toISOString(),
                    apiCallRound: currentApiCallRound,
                    readByUser: false  // 默认未读
                };
                AppState.messages[convId].push(aiLocationMsg);
            }
            
            // 如果检测到图片描述卡片，创建图片描述消息
            if (isPhotoDesc && photoDescription) {
                const aiPhotoDescMsg = {
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    type: 'received',
                    content: '[图片描述]',
                    isPhotoDescription: true,
                    photoDescription: photoDescription,
                    sender: 'received',
                    time: new Date().toISOString(),
                    apiCallRound: currentApiCallRound,
                    readByUser: false  // 默认未读
                };
                AppState.messages[convId].push(aiPhotoDescMsg);
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
                    apiCallRound: currentApiCallRound,
                    readByUser: false,  // 默认未读，用户打开聊天后设为true
                    // 【修复】如果包含接受邀请指令，标记为接受邀请的消息
                    isAcceptListenInvitation: hasAcceptInvitation
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
                    apiCallRound: currentApiCallRound,
                    readByUser: false,  // 默认未读
                    // 【修复】如果包含接受邀请指令，标记为接受邀请的消息
                    isAcceptListenInvitation: hasAcceptInvitation
                };
                AppState.messages[convId].push(aiMsg);
            }
            
            // ========== 第七步：更新会话信息和心声消息ID ==========
            const conv = AppState.conversations.find(c => c.id === convId);
            const aiMsg = AppState.messages[convId][AppState.messages[convId].length - 1];
            
            // 如果当前正在该聊天中，立即将AI消息标记为已读
            if (AppState.currentChat && AppState.currentChat.id === convId && aiMsg) {
                aiMsg.readByUser = true;
                console.log('👀 用户正在聊天中，AI消息立即标记为已读:', aiMsg.id);
            }
            
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
                } else if (isPhotoDesc) {
                    lastMsgDisplay = '[图片描述]';
                } else if (emojiUrl && !text) {
                    lastMsgDisplay = '[表情包]';
                }
                conv.lastMsg = lastMsgDisplay;
                conv.time = formatTime(new Date());
                conv.lastMessageTime = aiMsg.time;  // 保存完整时间戳用于排序
            }

            saveToStorage();
            renderConversations();
            
            // 🔧 修复：强制立即渲染，确保消息在当前对话中立即显示
            console.log('💬 appendSingleAssistantMessage - 准备渲染消息');
            console.log('   - convId:', convId);
            console.log('   - currentChat:', AppState.currentChat?.id);
            console.log('   - 消息数量:', AppState.messages[convId]?.length);
            console.log('   - 最后一条消息:', AppState.messages[convId]?.[AppState.messages[convId].length - 1]);
            
            // 只在当前对话匹配时立即渲染（renderChatMessages内部会检查）
            if (AppState.currentChat && AppState.currentChat.id === convId) {
                console.log('✅ 当前对话匹配，立即调用 renderChatMessages(true)');
                console.log('   - 调用前 DOM 元素数:', document.getElementById('chat-messages')?.children.length);
                renderChatMessages(true);
                console.log('   - 调用后 DOM 元素数:', document.getElementById('chat-messages')?.children.length);
            } else {
                console.log('⚠️ 当前对话不匹配，跳过渲染');
                console.log('   - AppState.currentChat 存在:', !!AppState.currentChat);
                console.log('   - ID 匹配:', AppState.currentChat?.id === convId);
            }

            // 检查是否需要自动总结
            checkAndAutoSummarize(convId);

            // 触发通知 - 如果用户不在当前聊天中
            triggerNotificationIfLeftChat(convId);
        }

        function appendMultipleAssistantMessages(convId, thinkingData) {
            // 处理多条消息的情况，按延迟依次添加
            let currentDelay = 0;
            const messages = thinkingData.messages || [];
            
            // 🔧 修复：在开始处理前保存当前对话状态，避免异步延迟导致的状态不一致
            const isCurrentChatAtStart = AppState.currentChat && AppState.currentChat.id === convId;
            console.log('🔀 appendMultipleAssistantMessages 开始 - convId:', convId, '当前对话匹配:', isCurrentChatAtStart);
            
            messages.forEach((msgData, index) => {
                setTimeout(() => {
                    // 每条消息都进行独立的清理和处理
                    let content = msgData.content.trim();
                    
                    if (!content) return;
                    
                    // 先处理红包指令（在清理之前）
                    // 1. 处理AI发送红包
                    const sendEnvelopeRegex = /【红包】([0-9.]+)\|([^【】]*)【\/红包】/g;
                    let match;
                    while ((match = sendEnvelopeRegex.exec(content)) !== null) {
                        const amount = parseFloat(match[1]);
                        const message = match[2] || '收下吧~';
                        if (window.RedEnvelopeModule && typeof window.RedEnvelopeModule.sendAIRedEnvelope === 'function') {
                            window.RedEnvelopeModule.sendAIRedEnvelope(convId, amount, message);
                        }
                        content = content.replace(match[0], '').trim();
                    }
                    
                    // 2. 处理AI领取红包
                    const receiveEnvelopeRegex = /【领取红包】([^【】]+)【\/领取红包】/g;
                    while ((match = receiveEnvelopeRegex.exec(content)) !== null) {
                        const envelopeId = match[1].trim();
                        if (window.RedEnvelopeModule && typeof window.RedEnvelopeModule.handleAIReceive === 'function') {
                            window.RedEnvelopeModule.handleAIReceive(envelopeId);
                        }
                        content = content.replace(match[0], '').trim();
                    }
                    
                    // 3. 处理AI退还红包
                    const returnEnvelopeRegex = /【退还红包】([^【】]+)【\/退还红包】/g;
                    while ((match = returnEnvelopeRegex.exec(content)) !== null) {
                        const envelopeId = match[1].trim();
                        if (window.RedEnvelopeModule && typeof window.RedEnvelopeModule.handleAIReturn === 'function') {
                            window.RedEnvelopeModule.handleAIReturn(envelopeId);
                        }
                        content = content.replace(match[0], '').trim();
                    }
                    
                    // 4. 处理AI发送转账
                    const sendTransferRegex = /【转账】([0-9.]+)\|([^【】]*)【\/转账】/g;
                    while ((match = sendTransferRegex.exec(content)) !== null) {
                        const amount = parseFloat(match[1]);
                        const message = match[2] || '转账给你';
                        if (window.TransferModule && typeof window.TransferModule.sendAITransfer === 'function') {
                            window.TransferModule.sendAITransfer(convId, amount, message);
                        }
                        content = content.replace(match[0], '').trim();
                    }
                    
                    // 5. 处理AI确认收款
                    const receiveTransferRegex = /【确认收款】([^【】]+)【\/确认收款】/g;
                    while ((match = receiveTransferRegex.exec(content)) !== null) {
                        const transferId = match[1].trim();
                        if (window.TransferModule && typeof window.TransferModule.handleAIReceive === 'function') {
                            window.TransferModule.handleAIReceive(transferId);
                        }
                        content = content.replace(match[0], '').trim();
                    }
                    
                    // 6. 处理AI退还转账
                    const returnTransferRegex = /【退还转账】([^【】]+)【\/退还转账】/g;
                    while ((match = returnTransferRegex.exec(content)) !== null) {
                        const transferId = match[1].trim();
                        if (window.TransferModule && typeof window.TransferModule.handleAIReturn === 'function') {
                            window.TransferModule.handleAIReturn(transferId);
                        }
                        content = content.replace(match[0], '').trim();
                    }
                    
                    // 清理内容
                    content = cleanAIResponse(content);

                    // 处理撤回标记
                    const retractRegex = /【\s*撤回\s*】\s*([^【】]+?)\s*【\s*[\/／]\s*撤回\s*】/;
                    const retractMatch = content.match(retractRegex);
                    if (retractMatch && retractMatch[1]) {
                        const targetMsgId = retractMatch[1].trim();
                        if (!AppState.messages[convId]) {
                            AppState.messages[convId] = [];
                        }
                        const messages = AppState.messages[convId];
                        const msgIndex = messages.findIndex(m => String(m.id) === String(targetMsgId));

                        if (msgIndex > -1) {
                            const originalMsg = messages[msgIndex];
                            const characterName = AppState.conversations.find(c => c.id === convId)?.name || 'AI';
                            const retractText = `${characterName}撤回了一条消息`;

                            const retractMsg = {
                                id: targetMsgId,
                                type: originalMsg.type,
                                content: retractText,
                                timestamp: originalMsg.timestamp,
                                isRetracted: true,
                                retractedContent: originalMsg.content
                            };

                            messages[msgIndex] = retractMsg;

                            saveToStorage();
                            if (AppState.currentChat && AppState.currentChat.id === convId) renderChatMessagesDebounced();
                            renderConversations();
                        }

                        content = content.replace(retractRegex, '').trim();
                        if (!content) {
                            return;
                        }
                    }

                    // 处理语音通话标记
                    const voiceCallRegex = /【语音通话】【\/语音通话】/;
                    if (voiceCallRegex.test(content)) {
                        content = content.replace(voiceCallRegex, '').trim();
                        const conv = AppState.conversations.find(c => c.id === convId);
                        const characterName = conv?.name || '未知角色';
                        const characterAvatar = getCharacterAvatar();
                        setTimeout(() => {
                            if (window.VoiceCallSystem && typeof window.VoiceCallSystem.receiveCall === 'function') {
                                window.VoiceCallSystem.receiveCall(characterName, characterAvatar);
                            } else {
                                console.warn('⚠️ 语音通话系统未初始化');
                            }
                        }, 800);
                    }

                    // 处理视频通话标记
                    const videoCallRegex = /【视频通话】【\/视频通话】/;
                    if (videoCallRegex.test(content)) {
                        content = content.replace(videoCallRegex, '').trim();
                        const conv = AppState.conversations.find(c => c.id === convId);
                        const characterName = conv?.name || '未知角色';
                        const characterAvatar = getCharacterAvatar();
                        setTimeout(() => {
                            if (window.VideoCallSystem && typeof window.VideoCallSystem.receiveCall === 'function') {
                                window.VideoCallSystem.receiveCall(characterName, characterAvatar, convId);
                            } else {
                                console.warn('⚠️ 视频通话系统未初始化');
                            }
                        }, 800);
                    }
                    
                    // 处理表情包
                    let emojiUrl = null;
                    const emojiRegex = /【表情包】([^【]+?)【\/表情包】/;
                    const emojiMatch = content.match(emojiRegex);
                    
                    if (emojiMatch && emojiMatch[1]) {
                        const emojiName = emojiMatch[1].trim();
                        const resolvedEmoji = resolveEmojiFromTag(emojiName, convId);
                        if (resolvedEmoji) {
                            emojiUrl = resolvedEmoji.url;
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
                    
                    // 处理地理位置（仅使用详细地址和距离，兼容旧格式）
                    const locationRegex = /【地理位置】([^【]+?)【\/地理位置】/;
                    const locationMatch = content.match(locationRegex);
                    let isLocation = false;
                    let locationName = '';
                    let locationAddress = '';
                    let locationDistance = 1;
                    
                    if (locationMatch && locationMatch[1]) {
                        const locationPayload = locationMatch[1].trim();
                        if (locationPayload) {
                            const parts = locationPayload.split('|').map(part => part.trim());
                            const p1 = parts[0] || '';
                            const p2 = parts[1] || '';
                            const p3 = parts[2] || '';

                            if (parts.length >= 3) {
                                locationName = '';
                                locationAddress = p2 || p1;
                                locationDistance = parseLocationDistanceKm(p3, locationDistance);
                            } else if (parts.length === 2) {
                                const parsedDistance = parseLocationDistanceKm(p2, null);
                                locationAddress = p1;
                                locationName = '';
                                if (parsedDistance !== null) {
                                    locationDistance = parsedDistance;
                                }
                            } else {
                                locationAddress = p1;
                            }
                        }

                        if (!locationAddress && locationName) {
                            locationAddress = locationName;
                        }
                        isLocation = !!locationAddress;
                        content = content.replace(locationRegex, '').trim();
                    }
                    
                    // 处理图片描述卡片
                    const photoDescRegex = /【图片描述】([^【]+?)【\/图片描述】/;
                    const photoDescMatch = content.match(photoDescRegex);
                    let isPhotoDesc = false;
                    let photoDescription = null;
                    
                    if (photoDescMatch && photoDescMatch[1]) {
                        isPhotoDesc = true;
                        photoDescription = photoDescMatch[1].trim();
                        console.log('[PhotoDescription] 检测到AI发送图片描述卡片:', photoDescription);
                        content = content.replace(photoDescRegex, '').trim();
                    }
                    
                    // 【新架构】心声已在 appendAssistantMessage 中从主API响应自动提取
                    
                    content = cleanAIResponse(content);
                    content = content.replace(/【[^】]*】[^【】]*【[\/／][^】]*】/g, '').trim();
                    content = content.replace(/\n{3,}/g, '\n\n').trim();
                    
                    if (!AppState.messages[convId]) {
                        AppState.messages[convId] = [];
                    }
                    
                    // 🔧 修复：在外部定义 aiMsg 变量，避免作用域错误
                    let aiMsg = null;
                    
                    // 创建语音消息
                    if (isVoice && voiceContent) {
                        aiMsg = {
                            id: 'msg_' + Date.now() + '_' + Math.random(),
                            type: 'voice',
                            content: voiceContent,
                            sender: 'received',
                            duration: voiceDuration,
                            time: new Date().toISOString(),
                            apiCallRound: currentApiCallRound,
                            readByUser: false  // 默认未读
                        };
                        AppState.messages[convId].push(aiMsg);
                    }
                    
                    // 创建地理位置消息
                    if (isLocation && (locationAddress || locationName)) {
                        const effectiveLocationAddress = locationAddress || locationName;
                        const locationDistanceLabel = formatLocationDistanceKm(locationDistance);
                        aiMsg = {
                            id: 'msg_' + Date.now() + '_' + Math.random(),
                            type: 'location',
                            content: `${effectiveLocationAddress} (${locationDistanceLabel}km)`,
                            locationName: locationName || '',
                            locationAddress: effectiveLocationAddress,
                            locationDistance: locationDistance,
                            locationDistanceUnit: 'km',
                            sender: 'received',
                            time: new Date().toISOString(),
                            apiCallRound: currentApiCallRound,
                            readByUser: false  // 默认未读
                        };
                        AppState.messages[convId].push(aiMsg);
                    }
                    
                    // 创建图片描述卡片消息
                    if (isPhotoDesc && photoDescription) {
                        aiMsg = {
                            id: 'msg_' + Date.now() + '_' + Math.random(),
                            type: 'received',
                            content: '[图片描述]',
                            isPhotoDescription: true,
                            photoDescription: photoDescription,
                            sender: 'received',
                            time: new Date().toISOString(),
                            apiCallRound: currentApiCallRound,
                            readByUser: false  // 默认未读
                        };
                        AppState.messages[convId].push(aiMsg);
                    }
                    
                    // 创建普通文本或表情包消息
                    if (content || emojiUrl) {
                        aiMsg = {
                            id: 'msg_' + Date.now() + '_' + Math.random(),
                            type: 'received',
                            content: content,
                            emojiUrl: emojiUrl,
                            isEmoji: emojiUrl ? true : false,
                            time: new Date().toISOString(),
                            apiCallRound: currentApiCallRound,
                            readByUser: false  // 默认未读
                        };
                        AppState.messages[convId].push(aiMsg);
                    }
                    
                    // 更新会话信息
                    const conv = AppState.conversations.find(c => c.id === convId);
                    if (conv && aiMsg) {
                        // 根据消息类型设置不同的显示文本
                        let lastMsgDisplay = content || '[表情包]';
                        if (isVoice) {
                            lastMsgDisplay = '[语音]';
                        } else if (isLocation) {
                            lastMsgDisplay = '[位置]';
                        } else if (isPhotoDesc) {
                            lastMsgDisplay = '[图片描述]';
                        } else if (emojiUrl && !content) {
                            lastMsgDisplay = '[表情包]';
                        }
                        conv.lastMsg = lastMsgDisplay;
                        conv.time = formatTime(new Date());
                        conv.lastMessageTime = aiMsg.time;
                    }
                    
                    // 如果当前正在该聊天中，立即将AI消息标记为已读
                    if (AppState.currentChat && AppState.currentChat.id === convId && aiMsg) {
                        aiMsg.readByUser = true;
                        console.log('👀 用户正在聊天中，AI消息立即标记为已读:', aiMsg.id);
                    }
                    
                    // 更新最后一条心声记录的消息ID（只在最后一条消息时）
                    if (index === messages.length - 1 && aiMsg) {
                        MindStateManager.updateMindStateMessageId(convId, aiMsg.id);
                    }
                    
                    saveToStorage();
                    renderConversations();
                    
                    // 🔧 修复：使用开始时保存的状态判断是否渲染，避免异步延迟导致的问题
                    console.log('💬 appendMultipleAssistantMessages [消息', index + 1, '/', messages.length, '] - 检查渲染');
                    console.log('   - convId:', convId);
                    console.log('   - 开始时对话匹配:', isCurrentChatAtStart);
                    console.log('   - 当前对话:', AppState.currentChat?.id);
                    
                    // 使用开始时的状态判断，并且再次确认当前对话仍然匹配
                    if (isCurrentChatAtStart && AppState.currentChat && AppState.currentChat.id === convId) {
                        console.log('✅ 对话匹配，立即渲染消息');
                        renderChatMessages(true);
                    } else {
                        console.log('⚠️ 对话不匹配或用户已离开，跳过渲染');
                    }
                    
                    // 只在最后一条消息后触发通知
                    if (index === messages.length - 1) {
                        checkAndAutoSummarize(convId);
                        triggerNotificationIfLeftChat(convId);
                    }
                }, currentDelay);
                
                // 累加延迟时间
                currentDelay += msgData.delay || 0;
            });
        }

        function parseLocationDistanceKm(rawValue, fallbackKm = 1) {
            const fallback = fallbackKm === undefined ? 1 : fallbackKm;
            const fallbackReturn = fallbackKm === null ? null : fallback;

            if (rawValue === null || rawValue === undefined) return fallbackReturn;

            const rawText = String(rawValue).trim();
            if (!rawText) return fallbackReturn;

            const cleaned = rawText.replace(/[，,]/g, '').replace(/\s+/g, '');
            const match = cleaned.match(/^([0-9]+(?:\.[0-9]+)?)(.*)$/);
            if (!match) return fallbackReturn;

            const numeric = Number(match[1]);
            if (!Number.isFinite(numeric) || numeric <= 0) return fallbackReturn;

            const unit = String(match[2] || '').toLowerCase();
            let km = numeric;

            if (unit) {
                if (unit.includes('km') || unit.includes('公里') || unit.includes('千米')) {
                    km = numeric;
                } else if ((unit === 'm' || unit.includes('米')) && !unit.includes('km')) {
                    km = numeric / 1000;
                } else if (unit.includes('m') && !unit.includes('km')) {
                    km = numeric / 1000;
                }
            }

            if (!Number.isFinite(km) || km <= 0) return fallbackReturn;
            return Math.min(Math.max(km, 0.01), 9999);
        }

        function normalizeMessageDistanceKm(distance, unit, fallbackKm = 1) {
            const numeric = Number(distance);
            if (!Number.isFinite(numeric) || numeric <= 0) return fallbackKm;

            const normalizedUnit = String(unit || '').toLowerCase();
            let km = numeric;

            if (normalizedUnit === 'km' || normalizedUnit.includes('公里') || normalizedUnit.includes('千米')) {
                km = numeric;
            } else if (!normalizedUnit || normalizedUnit === 'm' || (normalizedUnit.includes('米') && !normalizedUnit.includes('公里'))) {
                km = numeric / 1000;
            }

            if (!Number.isFinite(km) || km <= 0) return fallbackKm;
            return Math.min(Math.max(km, 0.01), 9999);
        }

        function formatLocationDistanceKm(distanceKm) {
            const numeric = Number(distanceKm);
            if (!Number.isFinite(numeric) || numeric <= 0) return '1';

            let formatted = '';
            if (numeric < 1) {
                formatted = numeric.toFixed(2);
            } else if (numeric < 10) {
                formatted = numeric.toFixed(1);
            } else {
                formatted = String(Math.round(numeric));
            }

            return formatted.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
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
                        const resolvedEmoji = resolveEmojiFromTag(emojiName, convId);
                        if (resolvedEmoji) {
                            emojiUrl = resolvedEmoji.url;
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
                    if (AppState.currentChat && AppState.currentChat.id === convId) renderChatMessagesDebounced();
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

        // 安全地渲染HTML内容（用于AI回复等需要显示HTML格式的消息）
        function renderHtmlContent(text) {
            // 直接返回文本，保留HTML标签
            // 注意：不转换换行符，因为AI回复会在appendSingleAssistantMessage中根据换行符拆分成多个气泡
            return text;
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
            renderChatMessagesDebounced();
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

        // 加载状态函数 - 显示输入框上方的三点动画
        function setLoadingStatus(loading) {
            const indicator = document.getElementById('chat-typing-indicator');
            if (indicator) {
                indicator.style.display = loading ? 'flex' : 'none';
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
        // 直接打开角色设置，不再显示菜单（全局可访问）
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
        
        // 确保全局可访问
        window.openChatMoreMenu = openChatMoreMenu;

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
                        <!-- 头像区域 - 双头像风格 -->
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
                    if (window.CharacterSettingsManager && typeof window.CharacterSettingsManager.applyChatPageBackground === 'function') {
                        window.CharacterSettingsManager.applyChatPageBackground(conv.chatBgImage || null);
                    } else if (conv.chatBgImage) {
                        chatPage.style.backgroundImage = `url('${conv.chatBgImage}')`;
                        chatPage.style.backgroundSize = 'cover';
                        chatPage.style.backgroundPosition = 'center';
                        chatPage.style.backgroundAttachment = 'fixed';
                    } else {
                        chatPage.style.backgroundImage = 'none';
                    }
                }
                
                renderChatMessages(charId);
                // 更新聊天标题（备注 > 网名 > 真名）
                const displayName = getConversationDisplayName(conv);
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
                bottom: 72px;
                left: 50%;
                transform: translateX(-50%);
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
                animation: toastPrincessPop 0.32s cubic-bezier(0.22, 1, 0.36, 1);
                max-width: min(82vw, 360px);
                word-break: break-word;
                text-align: center;
                line-height: 1.45;
                pointer-events: none;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            // 添加关键帧动画
            if (!document.querySelector('style[data-toast-animation]')) {
                const style = document.createElement('style');
                style.setAttribute('data-toast-animation', 'true');
                style.textContent = `
                    @keyframes toastPrincessPop {
                        from {
                            opacity: 0;
                            transform: translateX(-50%) translateY(24px) scale(0.92);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(-50%) translateY(0) scale(1);
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            setTimeout(() => {
                toast.style.animation = 'toastPrincessPop 0.28s cubic-bezier(0.4, 0, 1, 1) reverse';
                setTimeout(() => toast.remove(), 280);
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
            } else if (lastMessage.type === 'redenvelope') {
                messagePreview = '[红包]';
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
                name: getConversationDisplayName(conv),
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

        function formatMemoryShardTime(value) {
            if (!value) return '未知时间';
            const time = new Date(value);
            if (Number.isNaN(time.getTime())) return '未知时间';
            return time.toLocaleString('zh-CN');
        }

        let memoryShardsActiveConvId = null;
        let memoryShardsSelectionMode = false;
        let memoryShardsSelectedKeys = new Set();

        function getMemoryShardKey(convId, summaryIndex) {
            return `${convId}::${summaryIndex}`;
        }

        function clearMemoryShardsSelection() {
            memoryShardsSelectedKeys.clear();
        }

        function updateMemoryShardsToolbar() {
            const selectBtn = document.getElementById('memory-shards-select-btn');
            const mergeBtn = document.getElementById('memory-shards-merge-btn');
            if (!selectBtn || !mergeBtn) return;

            const selectedCount = memoryShardsSelectedKeys.size;
            const isSelecting = memoryShardsSelectionMode;

            selectBtn.textContent = isSelecting ? '退出多选' : '多选总结';
            mergeBtn.disabled = !isSelecting || selectedCount < 2;
            mergeBtn.textContent = isSelecting && selectedCount > 0
                ? `生成大总结(${selectedCount})`
                : '生成大总结';
        }

        function setMemoryShardsSelectionMode(enabled) {
            memoryShardsSelectionMode = !!enabled;
            if (!memoryShardsSelectionMode) {
                clearMemoryShardsSelection();
            }
            renderMemoryShardsPage(memoryShardsActiveConvId);
        }

        function summarizeSelectedMemoryShards() {
            const convId = memoryShardsActiveConvId || AppState.currentChat?.id;
            if (!convId) {
                showToast('请先打开一个对话');
                return;
            }

            const conv = AppState.conversations.find(c => String(c.id || '') === String(convId));
            if (!conv || !Array.isArray(conv.summaries)) {
                showToast('对话未找到');
                return;
            }

            const selectedIndices = Array.from(memoryShardsSelectedKeys)
                .filter(key => key.startsWith(`${convId}::`))
                .map(key => Number(key.split('::')[1]))
                .filter(Number.isFinite);

            if (selectedIndices.length < 2) {
                showToast('请至少选择两条总结');
                return;
            }

            const sortedIndices = selectedIndices.slice().sort((a, b) => a - b);
            const selectedSummaries = sortedIndices
                .map(idx => conv.summaries[idx])
                .filter(Boolean);

            if (selectedSummaries.length < 2) {
                showToast('可用总结不足');
                return;
            }

            const mergedText = selectedSummaries
                .map((summary) => String(summary.content || '').trim())
                .filter(Boolean)
                .join('\n\n');

            const mergeInstruction = [
                '以下是多条已生成的记忆卡片内容，请将它们合并为一条新的记忆卡片。',
                '要求：',
                '- 仅基于输入内容，去重合并同义信息，避免重复。',
                '- 不要出现“总结1/总结2”等标签或任何分隔符。',
                '- 不要新增未出现的事实或无关内容。',
                '- 只输出规定栏目。'
            ].join('\n');

            const summaryPayload = `${mergeInstruction}\n\n${mergedText}`;

            const summaryInput = typeof window.buildSummaryInput === 'function'
                ? window.buildSummaryInput(summaryPayload, {
                    conv: conv,
                    modeLabel: '记忆区大总结',
                    includeHeader: false
                })
                : summaryPayload;

            const summarizeFn = window.summarizeTextViaSecondaryAPI || window.summarizeTextViaMainAPI;
            if (!summarizeFn) {
                showToast('总结功能未加载');
                return;
            }

            showToast('正在生成大总结...');

            summarizeFn(
                summaryInput,
                (result) => {
                    const normalizedSummary = typeof window.normalizeSummaryContent === 'function'
                        ? window.normalizeSummaryContent(result)
                        : result;

                    const indicesToRemove = selectedIndices.slice().sort((a, b) => b - a);
                    indicesToRemove.forEach(idx => {
                        if (conv.summaries[idx]) {
                            conv.summaries.splice(idx, 1);
                        }
                    });

                    const totalMessages = selectedSummaries.reduce((sum, item) => {
                        return sum + (Number(item.messageCount) || 0);
                    }, 0);

                    conv.summaries.push({
                        content: normalizedSummary,
                        isAutomatic: false,
                        timestamp: new Date().toISOString(),
                        messageCount: totalMessages || selectedSummaries.length
                    });

                    saveToStorage();
                    memoryShardsSelectionMode = false;
                    clearMemoryShardsSelection();
                    renderMemoryShardsPage(convId);
                    showToast('大总结已生成');
                },
                (error) => {
                    console.error('大总结生成出错:', error);
                    showToast('大总结失败: ' + error);
                }
            );
        }

        function getMemoryShardEntries(filterConvId) {
            const entries = [];
            const conversations = Array.isArray(AppState.conversations) ? AppState.conversations : [];
            const targetId = filterConvId ? String(filterConvId) : '';

            conversations.forEach((conv) => {
                if (targetId && String(conv.id || '') !== targetId) {
                    return;
                }
                const summaries = Array.isArray(conv.summaries) ? conv.summaries : [];
                summaries.forEach((summary, index) => {
                    const content = String(summary.content || '');
                    const isVideoCall = !!summary.isVideoCall || content.includes('视频通话');
                    const isOffline = !!summary.isOffline;

                    entries.push({
                        convId: String(conv.id || ''),
                        convName: String(conv.remark || conv.name || '未命名'),
                        summaryIndex: index,
                        content,
                        isAutomatic: !!summary.isAutomatic,
                        isVideoCall,
                        isOffline,
                        messageCount: summary.messageCount,
                        timestamp: summary.timestamp || ''
                    });
                });
            });

            entries.sort((a, b) => {
                const timeA = new Date(a.timestamp || 0).getTime();
                const timeB = new Date(b.timestamp || 0).getTime();
                return timeB - timeA;
            });

            return entries;
        }

        function parseMemoryShardSections(content) {
            const text = String(content || '').replace(/\r\n/g, '\n').trim();
            if (!text) return null;

            const matches = Array.from(text.matchAll(/【([^】]+)】/g));
            if (matches.length === 0) return null;

            const sections = {};
            matches.forEach((match, index) => {
                const title = String(match[1] || '').trim();
                const start = match.index + match[0].length;
                const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
                const raw = text.slice(start, end).trim();
                if (title) {
                    sections[title] = raw;
                }
            });

            return sections;
        }

        function normalizeMemoryShardSections(sectionMap) {
            if (!sectionMap) return null;

            const normalized = { ...sectionMap };
            const aliasMap = {
                '本次总结': '剧情回顾',
                '本章纪实': '剧情回顾',
                '约定清单': '约定',
                '成长轨迹': '成长',
                '情感羁绊（阶段）': '情感羁绊'
            };

            Object.keys(aliasMap).forEach((legacyKey) => {
                const targetKey = aliasMap[legacyKey];
                if (normalized[legacyKey] && !normalized[targetKey]) {
                    normalized[targetKey] = normalized[legacyKey];
                }
            });

            ['封面', '标题', '章节', '章节名'].forEach((legacyKey) => {
                if (legacyKey in normalized) {
                    delete normalized[legacyKey];
                }
            });

            return normalized;
        }

        function hasKnownMemoryShardSections(sectionMap) {
            if (!sectionMap) return false;
            const knownKeys = ['剧情回顾', '关键事件', '约定', '纪念日', '成长', '情感羁绊'];
            return knownKeys.some(key => String(sectionMap[key] || '').trim());
        }

        function normalizeMemoryShardLines(value) {
            return String(value || '')
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .map(line => line.replace(/^[-•·]\s*/, ''));
        }

        function renderMemoryShardSectionBody(value, preferList) {
            const safeValue = String(value || '').trim();
            if (!safeValue) {
                return '<div class="memory-shard-section-empty">暂无</div>';
            }

            if (preferList) {
                const lines = normalizeMemoryShardLines(safeValue);
                if (lines.length === 0) {
                    return '<div class="memory-shard-section-empty">暂无</div>';
                }
                const itemsHtml = lines.map(line => `<li>${escapeHtml(line)}</li>`).join('');
                return `<ul class="memory-shard-section-list">${itemsHtml}</ul>`;
            }

            const formatted = escapeHtml(safeValue).replace(/\n/g, '<br>');
            return `<div class="memory-shard-section-text">${formatted}</div>`;
        }

        function renderMemoryShardSections(sectionMap) {
            const sectionDefinitions = [
                { key: '剧情回顾', label: '剧情回顾', className: 'review', list: false },
                { key: '关键事件', label: '关键事件', className: 'events', list: true },
                { key: '约定', label: '约定', className: 'promise', list: true },
                { key: '纪念日', label: '纪念日', className: 'anniversary', list: true },
                { key: '成长', label: '成长', className: 'growth', list: false },
                { key: '情感羁绊', label: '情感羁绊', className: 'bond', list: false }
            ];

            const sectionsHtml = sectionDefinitions.map(section => {
                let value = sectionMap?.[section.key] || '';
                if (section.key === '情感羁绊') {
                    value = String(value || '').replace(/^一句话[:：]/gm, '补充：');
                }
                const bodyHtml = renderMemoryShardSectionBody(value, section.list);
                return `
                    <section class="memory-shard-section memory-shard-section-${section.className}">
                        <div class="memory-shard-section-title">${escapeHtml(section.label)}</div>
                        <div class="memory-shard-section-body">${bodyHtml}</div>
                    </section>
                `;
            }).join('');

            return `<div class="memory-shard-sections">${sectionsHtml}</div>`;
        }

        function renderMemoryShardsPage(targetConvId) {
            const page = document.getElementById('memory-shards-page');
            const list = document.getElementById('memory-shards-list');
            if (!page || !list) return;

            const previousConvId = memoryShardsActiveConvId;
            const resolvedConvId = targetConvId !== undefined && targetConvId !== null
                ? String(targetConvId)
                : (memoryShardsActiveConvId || AppState.currentChat?.id || '');
            if (previousConvId && resolvedConvId && previousConvId !== resolvedConvId) {
                memoryShardsSelectionMode = false;
                clearMemoryShardsSelection();
            }
            memoryShardsActiveConvId = resolvedConvId || null;

            const conv = resolvedConvId
                ? AppState.conversations.find(c => String(c.id || '') === resolvedConvId)
                : null;

            if (!conv) {
                memoryShardsSelectionMode = false;
                clearMemoryShardsSelection();
            }

            const heroTitle = page.querySelector('.memory-shards-hero-title');
            const heroDesc = page.querySelector('.memory-shards-hero-desc');
            if (heroTitle) {
                const convName = conv ? String(conv.remark || conv.name || '记忆区') : '记忆区';
                heroTitle.textContent = conv ? `${convName}的记忆碎片` : '记忆区';
            }
            if (heroDesc) {
                heroDesc.textContent = conv
                    ? '管理视频聊天、线上聊天、线下功能模块的所有总结'
                    : '请先打开一个对话查看对应记忆区';
            }

            updateMemoryShardsToolbar();

            const entries = conv ? getMemoryShardEntries(resolvedConvId) : [];
            if (entries.length === 0) {
                memoryShardsSelectionMode = false;
                clearMemoryShardsSelection();
                updateMemoryShardsToolbar();
                list.innerHTML = `
                    <div class="memory-shards-empty">
                        <div class="memory-shards-empty-title">暂无记忆区</div>
                        <div class="memory-shards-empty-desc">生成对话总结后会自动收录在这里</div>
                    </div>
                `;
                return;
            }

            list.innerHTML = entries.map((entry) => {
                const sourceLabel = entry.isVideoCall ? '视频聊天' : (entry.isOffline ? '线下功能' : '线上聊天');
                const sourceClass = entry.isVideoCall ? 'video' : (entry.isOffline ? 'offline' : 'online');
                const summaryType = entry.isAutomatic ? '自动总结' : '手动总结';
                const messageCount = entry.messageCount || '?';
                const timeText = formatMemoryShardTime(entry.timestamp);
                const metaText = `${messageCount}楼层     ${timeText}`;
                const rawSectionMap = parseMemoryShardSections(entry.content);
                const sectionMap = normalizeMemoryShardSections(rawSectionMap);
                const sectionsHtml = sectionMap && hasKnownMemoryShardSections(sectionMap)
                    ? renderMemoryShardSections(sectionMap)
                    : `<div class="memory-shard-content">${escapeHtml(entry.content)}</div>`;

                const itemKey = getMemoryShardKey(entry.convId, entry.summaryIndex);
                const isSelected = memoryShardsSelectedKeys.has(itemKey);
                const selectionHtml = memoryShardsSelectionMode
                    ? `
                        <label class="memory-shard-select">
                            <input class="memory-shard-select-input" type="checkbox" data-memory-select="true" data-conv-id="${escapeHtml(entry.convId)}" data-summary-index="${entry.summaryIndex}" ${isSelected ? 'checked' : ''}>
                            <span>选择</span>
                        </label>
                    `
                    : '';
                const collapsedClass = 'is-collapsed';
                const selectingClass = memoryShardsSelectionMode ? 'is-selecting' : '';

                return `
                    <article class="memory-shard-item ${collapsedClass} ${selectingClass}" data-collapsed="true" data-conv-id="${escapeHtml(entry.convId)}" data-summary-index="${entry.summaryIndex}">
                        <div class="memory-shard-item-accent"></div>
                        <div class="memory-shard-header">
                            <div class="memory-shard-header-main">
                                <div class="memory-shard-title-row">
                                    ${selectionHtml}
                                    <div class="memory-shard-title">${escapeHtml(entry.convName)}</div>
                                </div>
                                <div class="memory-shard-tags">
                                    <span class="memory-shard-tag memory-shard-tag-${sourceClass}">${escapeHtml(sourceLabel)}</span>
                                    <span class="memory-shard-tag memory-shard-tag-muted">${escapeHtml(summaryType)}</span>
                                </div>
                            </div>
                            <div class="memory-shard-actions">
                                <button class="memory-shard-action-btn" type="button" data-memory-action="toggle" aria-expanded="false">展开</button>
                                <button class="memory-shard-action-btn" type="button" data-memory-action="edit" data-conv-id="${escapeHtml(entry.convId)}" data-summary-index="${entry.summaryIndex}">编辑</button>
                                <button class="memory-shard-action-btn danger" type="button" data-memory-action="delete" data-conv-id="${escapeHtml(entry.convId)}" data-summary-index="${entry.summaryIndex}">删除</button>
                            </div>
                        </div>
                        <div class="memory-shard-meta">${escapeHtml(metaText)}</div>
                        <div class="memory-shard-body">
                            ${sectionsHtml}
                        </div>
                    </article>
                `;
            }).join('');
        }

        function openMemoryShardEditor(convId, summaryIndex) {
            const conv = AppState.conversations.find(c => String(c.id) === String(convId));
            if (!conv || !Array.isArray(conv.summaries) || !conv.summaries[summaryIndex]) return;

            const summary = conv.summaries[summaryIndex];
            let modal = document.getElementById('memory-shards-editor-modal');
            if (modal) modal.remove();

            modal = document.createElement('div');
            modal.id = 'memory-shards-editor-modal';
            modal.className = 'memory-shards-modal show';
            modal.innerHTML = `
                <div class="memory-shards-modal-content">
                    <div class="memory-shards-modal-header">
                        <div class="memory-shards-modal-title">编辑记忆</div>
                        <button class="memory-shards-modal-close" type="button" data-memory-action="close">×</button>
                    </div>
                    <div class="memory-shards-modal-body">
                        <textarea class="memory-shards-editor" id="memory-shards-editor-text" placeholder="输入记忆内容...">${escapeHtml(summary.content || '')}</textarea>
                    </div>
                    <div class="memory-shards-modal-actions">
                        <button class="memory-shards-modal-btn" type="button" data-memory-action="cancel">取消</button>
                        <button class="memory-shards-modal-btn primary" type="button" data-memory-action="save" data-conv-id="${escapeHtml(convId)}" data-summary-index="${summaryIndex}">保存</button>
                    </div>
                </div>
            `;

            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.remove();
                }
            });

            document.body.appendChild(modal);
            const textarea = modal.querySelector('#memory-shards-editor-text');
            if (textarea) {
                textarea.focus();
            }

            const closeModal = () => {
                if (modal) modal.remove();
            };

            const closeBtn = modal.querySelector('[data-memory-action="close"]');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeModal);
            }

            const cancelBtn = modal.querySelector('[data-memory-action="cancel"]');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', closeModal);
            }

            const saveBtn = modal.querySelector('[data-memory-action="save"]');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const editor = modal.querySelector('#memory-shards-editor-text');
                    if (editor) {
                        saveMemoryShardEdit(convId, summaryIndex, editor.value);
                    }
                });
            }
        }

        function saveMemoryShardEdit(convId, summaryIndex, newContent) {
            const conv = AppState.conversations.find(c => String(c.id) === String(convId));
            if (!conv || !Array.isArray(conv.summaries) || !conv.summaries[summaryIndex]) return;

            const content = String(newContent || '').trim();
            if (!content) {
                showToast('记忆内容不能为空');
                return;
            }

            conv.summaries[summaryIndex].content = content;
            saveToStorage();
            renderMemoryShardsPage(convId);
            showToast('记忆已保存');

            const modal = document.getElementById('memory-shards-editor-modal');
            if (modal) modal.remove();
        }

        function deleteMemoryShard(convId, summaryIndex) {
            openMemoryShardDeleteConfirm(convId, summaryIndex);
        }

        function openMemoryShardDeleteConfirm(convId, summaryIndex) {
            let modal = document.getElementById('memory-shards-delete-modal');
            if (modal) modal.remove();

            modal = document.createElement('div');
            modal.id = 'memory-shards-delete-modal';
            modal.className = 'memory-shards-modal show';
            modal.innerHTML = `
                <div class="memory-shards-modal-content">
                    <div class="memory-shards-modal-header">
                        <div class="memory-shards-modal-title">删除记忆</div>
                        <button class="memory-shards-modal-close" type="button" aria-label="关闭">×</button>
                    </div>
                    <div class="memory-shards-modal-body">
                        <div class="memory-shards-modal-desc">确定要删除这条记忆区内容吗？</div>
                    </div>
                    <div class="memory-shards-modal-actions">
                        <button class="memory-shards-modal-btn" type="button" data-memory-action="cancel">取消</button>
                        <button class="memory-shards-modal-btn danger" type="button" data-memory-action="delete">删除</button>
                    </div>
                </div>
            `;

            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.remove();
                }
            });

            const closeBtn = modal.querySelector('.memory-shards-modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => modal.remove());
            }

            const cancelBtn = modal.querySelector('[data-memory-action="cancel"]');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => modal.remove());
            }

            const deleteBtn = modal.querySelector('[data-memory-action="delete"]');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    performDeleteMemoryShard(convId, summaryIndex);
                    modal.remove();
                });
            }

            document.body.appendChild(modal);
        }

        function performDeleteMemoryShard(convId, summaryIndex) {
            const conv = AppState.conversations.find(c => String(c.id) === String(convId));
            if (!conv || !Array.isArray(conv.summaries)) return;

            conv.summaries.splice(summaryIndex, 1);
            saveToStorage();
            memoryShardsSelectionMode = false;
            clearMemoryShardsSelection();
            renderMemoryShardsPage(convId);
            showToast('记忆已删除');
        }

        function bindMemoryShardsPageEvents() {
            const page = document.getElementById('memory-shards-page');
            if (!page || page.dataset.bound === 'true') return;

            page.dataset.bound = 'true';

            page.addEventListener('click', (event) => {
                const selectBtn = event.target.closest('#memory-shards-select-btn');
                if (selectBtn) {
                    setMemoryShardsSelectionMode(!memoryShardsSelectionMode);
                    return;
                }

                const mergeBtn = event.target.closest('#memory-shards-merge-btn');
                if (mergeBtn) {
                    summarizeSelectedMemoryShards();
                    return;
                }

                const refreshBtn = event.target.closest('#memory-shards-refresh-btn');
                if (refreshBtn) {
                    renderMemoryShardsPage();
                    return;
                }

                const actionBtn = event.target.closest('[data-memory-action]');
                if (!actionBtn) return;

                const action = actionBtn.dataset.memoryAction;
                if (action === 'toggle') {
                    const item = actionBtn.closest('.memory-shard-item');
                    if (!item) return;
                    const isCollapsed = item.classList.contains('is-collapsed');
                    if (isCollapsed) {
                        item.classList.remove('is-collapsed');
                        item.dataset.collapsed = 'false';
                        actionBtn.textContent = '折叠';
                        actionBtn.setAttribute('aria-expanded', 'true');
                    } else {
                        item.classList.add('is-collapsed');
                        item.dataset.collapsed = 'true';
                        actionBtn.textContent = '展开';
                        actionBtn.setAttribute('aria-expanded', 'false');
                    }
                    return;
                }
                if (action === 'edit') {
                    openMemoryShardEditor(actionBtn.dataset.convId, Number(actionBtn.dataset.summaryIndex));
                    return;
                }
                if (action === 'delete') {
                    deleteMemoryShard(actionBtn.dataset.convId, Number(actionBtn.dataset.summaryIndex));
                    return;
                }
                if (action === 'save') {
                    const textarea = document.getElementById('memory-shards-editor-text');
                    if (textarea) {
                        saveMemoryShardEdit(actionBtn.dataset.convId, Number(actionBtn.dataset.summaryIndex), textarea.value);
                    }
                    return;
                }
                if (action === 'cancel' || action === 'close') {
                    const modal = document.getElementById('memory-shards-editor-modal');
                    if (modal) modal.remove();
                }
            });

            page.addEventListener('change', (event) => {
                const checkbox = event.target.closest('.memory-shard-select-input');
                if (!checkbox) return;

                const convId = checkbox.dataset.convId;
                const summaryIndex = Number(checkbox.dataset.summaryIndex);
                const key = getMemoryShardKey(convId, summaryIndex);
                if (checkbox.checked) {
                    memoryShardsSelectedKeys.add(key);
                } else {
                    memoryShardsSelectedKeys.delete(key);
                }
                updateMemoryShardsToolbar();
            });
        }

        function openMemoryShardsPage(convId) {
            const page = document.getElementById('memory-shards-page');
            const appContainer = document.getElementById('app-container');
            if (page && appContainer && page.parentElement === appContainer) {
                appContainer.appendChild(page);
            }
            bindMemoryShardsPageEvents();
            renderMemoryShardsPage(convId);
            openSubPage('memory-shards-page');
        }

        window.openMemoryShardsPage = openMemoryShardsPage;
        window.renderMemoryShardsPage = renderMemoryShardsPage;

        // ======================== 新功能函数 ========================

        function resolveCollectionEmojiUrl(msg) {
            if (!msg) return '';
            if (msg.emojiUrl) return String(msg.emojiUrl);
            if (msg.isEmoji && msg.content && Array.isArray(AppState.emojis)) {
                const emoji = AppState.emojis.find(e => e.text === msg.content);
                if (emoji && emoji.url) return String(emoji.url);
            }
            return '';
        }

        function buildCollectionMessageSnapshot(msg) {
            if (!msg) return null;

            const musicCard = msg.musicCard
                ? {
                    name: msg.musicCard.name || '',
                    artist: msg.musicCard.artist || '',
                    pic: msg.musicCard.pic || ''
                }
                : null;

            const forwardedMoment = msg.forwardedMoment
                ? {
                    author: msg.forwardedMoment.author || '',
                    content: msg.forwardedMoment.content || '',
                    timestamp: msg.forwardedMoment.timestamp || ''
                }
                : null;

            const goodsData = msg.goodsData
                ? {
                    name: msg.goodsData.name || '',
                    price: msg.goodsData.price ?? '',
                    image: msg.goodsData.image || '',
                    desc: msg.goodsData.desc || ''
                }
                : null;

            const geoMeta = msg.geoMeta && typeof msg.geoMeta === 'object'
                ? {
                    lat: msg.geoMeta.lat,
                    lng: msg.geoMeta.lng,
                    source: msg.geoMeta.source
                }
                : null;

            return {
                id: msg.id,
                type: msg.type,
                sender: msg.sender,
                content: typeof msg.content === 'string' ? msg.content : '',
                isImage: !!msg.isImage,
                imageData: msg.imageData || '',
                needsVision: !!msg.needsVision,
                isPhotoDescription: !!msg.isPhotoDescription,
                photoDescription: msg.photoDescription || '',
                photoCardImage: msg.photoCardImage || '',
                emojiUrl: resolveCollectionEmojiUrl(msg),
                isEmoji: !!msg.isEmoji,
                musicCard,
                forwardedMoment,
                isForward: !!msg.isForward,
                isForwarded: !!msg.isForwarded,
                forwardHeaderText: msg.forwardHeaderText || '',
                duration: msg.duration,
                locationAddress: msg.locationAddress || '',
                locationDistance: msg.locationDistance,
                locationName: msg.locationName || '',
                geoMeta,
                callStatus: msg.callStatus,
                callDuration: msg.callDuration,
                amount: msg.amount,
                message: msg.message,
                status: msg.status,
                goodsData,
                songName: msg.songName || '',
                isInvitationAnswered: msg.isInvitationAnswered,
                invitationStatus: msg.invitationStatus,
                isListenTogetherClosed: msg.isListenTogetherClosed,
                isInvitationToListen: msg.isInvitationToListen
            };
        }

        function getCollectionPreviewTextFromMessage(msg) {
            if (!msg) return '';

            if (msg.emojiUrl || msg.isEmoji) return '[表情包]';
            if (msg.isImage) return '[图片]';
            if (msg.isPhotoDescription) return msg.photoDescription || msg.content || '[图片描述]';
            if (msg.type === 'voice') return msg.content ? `[语音] ${msg.content}` : '[语音]';
            if (msg.type === 'location') return msg.locationAddress || msg.content || '[位置]';
            if (msg.type === 'voicecall') return '[语音通话]';
            if (msg.type === 'videocall') return '[视频通话]';
            if (msg.type === 'redenvelope') return '[红包]';
            if (msg.type === 'transfer') return '[转账]';
            if (msg.type === 'goods_card') return msg.goodsData?.name ? `[商品] ${msg.goodsData.name}` : '[商品]';
            if (msg.type === 'listen_invite') return msg.songName ? `[一起听] ${msg.songName}` : '[一起听]';
            if (msg.musicCard) return msg.musicCard.name ? `[音乐] ${msg.musicCard.name}` : '[音乐]';
            if (msg.isForward && msg.forwardedMoment) return '[朋友圈]';

            return typeof msg.content === 'string' ? msg.content : '';
        }

        function resolveCollectionPreviewMessage(item) {
            if (!item) return null;
            return findCollectionSourceMessage(item) || item.messageSnapshot || null;
        }

        function buildCollectionMessagePreviewHtml(msg) {
            if (!msg) return '';

            const safe = escapeCollectionHtml;
            const isSent = isCollectionSentMessage(msg);
            const directionClass = isSent ? 'sent' : 'received';
            const wrap = (inner) => `<div class="collection-preview ${directionClass}">${inner}</div>`;

            if (msg.isPhotoDescription) {
                const photoDesc = safe(msg.photoDescription || msg.content || '');
                const defaultPhotoCardImage = (typeof window !== 'undefined' && window.PHOTO_DESCRIPTION_CARD_IMAGE)
                    ? window.PHOTO_DESCRIPTION_CARD_IMAGE
                    : 'https://img.heliar.top/file/1773290751509_IMG_20260312_124453.jpg';
                const photoCardImage = safe(msg.photoCardImage || defaultPhotoCardImage);
                const photoHtml = `
                    <div class="photo-description-card" style="
                        width: 142px;
                        max-width: 142px;
                        border-radius: 10px;
                        overflow: hidden;
                        border: 1px solid #f0d6e1;
                        background: #fffdfd;
                        box-shadow: 0 4px 11px rgba(206, 120, 151, 0.24);
                    ">
                        <div style="width:100%;height:110px;overflow:hidden;">
                            <img src="${photoCardImage}" alt="图片描述卡片" style="width:100%;height:100%;object-fit:cover;display:block;">
                        </div>
                        <div style="padding:6px 8px 8px;font-size:11px;color:#6a3c4d;line-height:1.4;word-break:break-word;">
                            <div style="font-size:10px;color:#ac7086;font-weight:600;margin-bottom:4px;">图片描述</div>
                            ${photoDesc || '（无描述）'}
                        </div>
                    </div>
                `;
                return wrap(photoHtml);
            }

            if (msg.isForward && msg.forwardedMoment) {
                const forwarded = msg.forwardedMoment;
                const momentAuthor = safe(forwarded.author || '用户');
                const momentContent = safe(String(forwarded.content || '').trim()).split('\n').map(line => line.trim()).join('\n');
                const momentDate = forwarded.timestamp
                    ? new Date(forwarded.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit' })
                    : '';
                const forwardHtml = `
                    <div class="forward-moment-card">
                        <div class="forward-moment-header">
                            <div class="forward-moment-title">
                                <div class="forward-moment-icon"></div>
                                <span class="forward-moment-label">朋友圈</span>
                            </div>
                            <div class="forward-moment-arrow"></div>
                        </div>
                        <div class="forward-moment-content">
                            <div class="forward-moment-meta">
                                <div class="forward-moment-author">${momentAuthor}</div>
                                <div class="forward-moment-date">${momentDate}</div>
                            </div>
                            <div class="forward-moment-text">
                                ${momentContent.length > 150 ? momentContent.substring(0, 150) + '...' : momentContent}
                            </div>
                            <div class="forward-moment-divider"></div>
                            <div class="forward-moment-footer">转发自朋友圈</div>
                        </div>
                    </div>
                `;
                return wrap(forwardHtml);
            }

            if (msg.musicCard) {
                const mc = msg.musicCard;
                const musicHtml = `
                    <div class="music-share-card" style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(0,0,0,0.03);border-radius:10px;min-width:200px;max-width:260px;">
                        <img src="${safe(mc.pic || '')}" style="width:48px;height:48px;border-radius:6px;object-fit:cover;background:#eee;" onerror="this.style.background='#ddd'">
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safe(mc.name || '')}</div>
                            <div style="font-size:12px;color:#999;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safe(mc.artist || '')}</div>
                        </div>
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#ec4141"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                    </div>
                `;
                return wrap(musicHtml);
            }

            if (msg.isImage && msg.imageData) {
                const imageHtml = `<img class="collection-preview-image" src="${safe(msg.imageData)}" alt="图片">`;
                return wrap(imageHtml);
            }

            const emojiUrl = resolveCollectionEmojiUrl(msg);
            if (emojiUrl) {
                const emojiHtml = `<img class="collection-preview-emoji" src="${safe(emojiUrl)}" alt="表情">`;
                return wrap(emojiHtml);
            }

            if (msg.type === 'voice') {
                const duration = Math.max(1, parseInt(msg.duration, 10) || 1);
                const voiceHtml = `
                    <div class="voice-bubble">
                        <div class="voice-waveform">
                            <span class="wave"></span>
                            <span class="wave"></span>
                            <span class="wave"></span>
                            <span class="wave"></span>
                        </div>
                        <div class="voice-duration">${duration}秒</div>
                    </div>
                `;
                return wrap(voiceHtml);
            }

            if (msg.type === 'location') {
                const rawLocationAddress = String(msg.locationAddress || msg.locationName || '').trim();
                const locationAddress = safe(rawLocationAddress || '未填写详细地址');
                const locationDistanceKm = normalizeMessageDistanceKm(msg.locationDistance, msg.locationDistanceUnit, 1);
                const locationDistanceLabel = formatLocationDistanceKm(locationDistanceKm);
                const geoMeta = msg.geoMeta && typeof msg.geoMeta === 'object' ? msg.geoMeta : null;
                const geoLat = geoMeta ? Number(geoMeta.lat) : NaN;
                const geoLng = geoMeta ? Number(geoMeta.lng) : NaN;
                const locationMeta = (Number.isFinite(geoLat) && Number.isFinite(geoLng))
                    ? `真实定位 · ${geoLat.toFixed(4)}, ${geoLng.toFixed(4)}`
                    : '位置分享';
                const locationHtml = `
                    <div class="location-bubble">
                        <div class="location-map-preview">
                            <span class="location-map-pin"></span>
                        </div>
                        <div class="location-card-body">
                            <div class="location-card-row">
                                <div class="location-card-title">地理位置</div>
                                <div class="location-card-distance">约${locationDistanceLabel}km</div>
                            </div>
                            <div class="location-card-address">${locationAddress}</div>
                            <div class="location-card-meta">${safe(locationMeta)}</div>
                        </div>
                    </div>
                `;
                return wrap(locationHtml);
            }

            if (msg.type === 'voicecall' || msg.type === 'videocall') {
                const isVideo = msg.type === 'videocall';
                const callStatus = msg.callStatus || 'calling';
                const callDuration = msg.callDuration || 0;

                const formatDuration = (seconds) => {
                    const mins = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                };

                let statusText = '';
                let statusIcon = '';
                let durationText = '';

                if (callStatus === 'calling') {
                    statusText = isVideo ? '视频通话中' : '语音通话中';
                    statusIcon = isVideo
                        ? `<div class="videocall-icon calling-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
                            </svg>
                        </div>`
                        : `<div class="voicecall-icon calling-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" fill="currentColor"/>
                            </svg>
                        </div>`;
                } else if (callStatus === 'cancelled') {
                    statusText = '已取消';
                    statusIcon = `<div class="${isVideo ? 'videocall' : 'voicecall'}-icon cancelled-icon">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" fill="currentColor"/>
                        </svg>
                    </div>`;
                } else if (callStatus === 'ended') {
                    durationText = callDuration > 0 ? formatDuration(callDuration) : '';
                    statusText = durationText ? `已挂断，${durationText}` : '已挂断';
                    statusIcon = isVideo
                        ? `<div class="videocall-icon ended-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
                            </svg>
                        </div>`
                        : `<div class="voicecall-icon ended-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" fill="currentColor"/>
                            </svg>
                        </div>`;
                }

                const callHtml = isVideo
                    ? `<div class="videocall-bubble ${callStatus}">
                            ${statusIcon}
                            <div class="videocall-info">
                                <div class="videocall-title">视频通话</div>
                                <div class="videocall-status">${safe(statusText)}${durationText ? ' ' + durationText : ''}</div>
                            </div>
                        </div>`
                    : `<div class="voicecall-bubble ${callStatus}">
                            ${statusIcon}
                            <div class="voicecall-info">
                                <div class="voicecall-title">语音通话</div>
                                <div class="voicecall-status">${safe(statusText)}${durationText ? ' ' + durationText : ''}</div>
                            </div>
                        </div>`;

                return wrap(callHtml);
            }

            if (msg.type === 'redenvelope') {
                const status = msg.status || 'pending';
                const statusText = status === 'received' ? '已领取' : (status === 'returned' ? '已退还' : '等待领取');
                const titleText = safe(msg.message || '恭喜发财，大吉大利');
                const envelopeHtml = `
                    <div class="red-envelope-card ${status}">
                        <div class="red-envelope-card-header">
                            <div class="red-envelope-card-icon"></div>
                            <div class="red-envelope-card-text">
                                <div class="red-envelope-card-title">${titleText}</div>
                            </div>
                        </div>
                        <div class="red-envelope-card-divider"></div>
                        <div class="red-envelope-card-subtitle">${statusText}</div>
                    </div>
                `;
                return wrap(envelopeHtml);
            }

            if (msg.type === 'transfer') {
                const status = msg.status || 'pending';
                const descText = status === 'received'
                    ? '已被对方领取'
                    : (status === 'returned' ? '转账已退还' : (isSent ? '你发起了一笔转账' : '收到一笔转账'));
                const amountText = typeof msg.amount === 'number' ? msg.amount.toFixed(2) : safe(msg.amount || '0');
                const transferHtml = `
                    <div class="transfer-card ${status}">
                        <div class="transfer-card-header">
                            <div class="transfer-card-icon"></div>
                            <div class="transfer-card-info">
                                <div class="transfer-card-title">¥${amountText}</div>
                                <div class="transfer-card-note">${safe(descText)}</div>
                            </div>
                        </div>
                        <div class="transfer-card-divider"></div>
                        <div class="transfer-card-status">转账</div>
                    </div>
                `;
                return wrap(transferHtml);
            }

            if (msg.type === 'goods_card' && msg.goodsData) {
                const goods = msg.goodsData;
                const goodsName = safe(goods.name || '商品');
                const goodsPrice = safe(goods.price ?? '0');
                const goodsImage = safe(goods.image || '');
                const goodsDesc = safe(String(goods.desc || '')).substring(0, 60);
                const goodsHtml = `
                    <div class="goods-card-message" style="
                        background: #fff;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        overflow: hidden;
                        max-width: 260px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                    ">
                        <div style="width: 100%; height: 180px; background: #f5f5f5; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                            <img src="${goodsImage}" alt="${goodsName}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div style="padding: 12px;">
                            <div style="font-size: 14px; color: #333; font-weight: 500; margin-bottom: 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${goodsName}</div>
                            <div style="font-size: 11px; color: #999; margin-bottom: 8px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${goodsDesc}</div>
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div style="font-size: 18px; color: #ff4400; font-weight: bold;">¥${goodsPrice}</div>
                                <div style="font-size: 11px; color: #999; background: #f5f5f5; padding: 3px 8px; border-radius: 3px;">淘宝商品</div>
                            </div>
                        </div>
                    </div>
                `;
                return wrap(goodsHtml);
            }

            if (msg.type === 'listen_invite') {
                let responseStatus = null;
                if (msg.isListenTogetherClosed) {
                    responseStatus = 'closed';
                } else if (msg.isInvitationAnswered) {
                    responseStatus = msg.invitationStatus || null;
                }

                let statusText = '等待回应...';
                if (responseStatus === 'closed') statusText = '已关闭';
                if (responseStatus === 'accepted') statusText = '已同意';
                if (responseStatus === 'rejected') statusText = '已拒绝';

                const statusClassMap = {
                    accepted: 'is-accepted',
                    rejected: 'is-rejected',
                    closed: 'is-closed'
                };
                const statusClass = statusClassMap[responseStatus] || 'is-pending';
                const inviteRoleClass = isSent ? 'is-sent' : 'is-received';
                const songName = safe(msg.songName || '正在听音乐');

                const inviteHtml = `
                    <div class="listen-invite-card ${inviteRoleClass}">
                        <div class="listen-invite-topline">
                            <span class="listen-invite-meta">${isSent ? '你发出的邀请' : 'TA 发来的邀请'}</span>
                        </div>
                        <div class="listen-invite-main">
                            <div class="listen-invite-icon-wrap">
                                <span class="listen-invite-icon">♫</span>
                            </div>
                            <div class="listen-invite-copy">
                                <div class="listen-invite-title">${isSent ? '邀请加入一起听' : '要一起来听音乐吗'}</div>
                                <div class="listen-invite-song">${songName}</div>
                            </div>
                        </div>
                        <div class="listen-invite-divider"></div>
                        <div class="listen-invite-status-chip ${statusClass}">${statusText}</div>
                    </div>
                `;
                return wrap(inviteHtml);
            }

            return '';
        }

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

            const senderDrivenTypes = new Set(['voice', 'location', 'voicecall', 'videocall', 'redenvelope', 'transfer', 'goods_card', 'listen_invite']);
            const isSentMessage = senderDrivenTypes.has(msg.type) ? msg.sender === 'sent' : msg.type === 'sent';
            const isGroupChat = conv.type === 'group';
            const groupSenderName = !isSentMessage ? String(msg.groupSenderName || '').trim() : '';

            const senderName = isGroupChat
                ? (isSentMessage ? (AppState.user?.name || '我') : (groupSenderName || conv.name || '成员'))
                : (isSentMessage ? (AppState.user?.name || '我') : (conv.name || '角色'));

            const senderAvatar = isGroupChat
                ? (conv.avatar || '')
                : (isSentMessage ? (conv.userAvatar || AppState.user?.avatar || '') : (conv.avatar || ''));

            const messageSnapshot = buildCollectionMessageSnapshot(msg);
            const previewText = getCollectionPreviewTextFromMessage(messageSnapshot || msg);

            const collectionItem = {
                id: 'col_' + Date.now(),
                convId: convId,
                messageId: messageId,
                messageContent: previewText || msg.content || msg.text || '',
                messageType: msg.type || '',
                messageSnapshot: messageSnapshot,
                senderName: senderName,
                senderAvatar: senderAvatar,
                senderType: isSentMessage ? 'sent' : 'received',
                isGroup: isGroupChat,
                groupSenderName: groupSenderName,
                collectedAt: new Date().toISOString(),
                originalMessageTime: msg.time || msg.timestamp || new Date().toISOString()
            };

            AppState.collections.push(collectionItem);
            saveToStorage();
            showToast('已收藏');
            
            // 立即关闭菜单和移除高亮
            closeMessageContextMenu();
        }

        function escapeCollectionHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function formatCollectionTime(value, withYear = false) {
            if (!value) return '未知时间';
            const time = new Date(value);
            if (Number.isNaN(time.getTime())) return '未知时间';

            const options = withYear
                ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
                : { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            return time.toLocaleString('zh-CN', options);
        }

        function isCollectionSentMessage(msg) {
            if (!msg) return false;
            const senderDrivenTypes = new Set(['voice', 'location', 'voicecall', 'videocall', 'redenvelope', 'transfer', 'goods_card', 'listen_invite']);
            return senderDrivenTypes.has(msg.type) ? msg.sender === 'sent' : msg.type === 'sent';
        }

        function findCollectionConversation(convId) {
            return (AppState.conversations || []).find((conv) => String(conv.id) === String(convId)) || null;
        }

        function findCollectionSourceMessage(item) {
            if (!item || !item.convId || !item.messageId) return null;
            const messages = AppState.messages?.[item.convId];
            if (!Array.isArray(messages)) return null;
            return messages.find((msg) => String(msg.id) === String(item.messageId)) || null;
        }

        function showCollectionDeleteConfirm(page, collectionId) {
            if (!page || !collectionId) return;

            const collections = Array.isArray(AppState.collections) ? AppState.collections : [];
            const target = collections.find((item) => String(item.id) === String(collectionId));
            if (!target) return;

            const mask = page.querySelector('#collection-delete-confirm-mask');
            const textNode = page.querySelector('#collection-delete-confirm-text');
            if (!mask || !textNode) return;

            textNode.textContent = '确定要删除这条收藏吗？';
            page.dataset.pendingDeleteCollectionId = String(collectionId);
            mask.classList.remove('hidden');
        }

        function hideCollectionDeleteConfirm(page) {
            if (!page) return;
            const mask = page.querySelector('#collection-delete-confirm-mask');
            if (mask) {
                mask.classList.add('hidden');
            }
            delete page.dataset.pendingDeleteCollectionId;
        }

        function resolveCollectionDisplayMeta(item) {
            const conv = findCollectionConversation(item?.convId);
            const sourceMsg = findCollectionSourceMessage(item);
            const isGroup = (conv && conv.type === 'group') || !!item?.isGroup;
            const isSent = sourceMsg
                ? isCollectionSentMessage(sourceMsg)
                : (item?.senderType === 'sent' || item?.senderName === AppState.user?.name);

            if (isGroup) {
                const groupName = String((conv && conv.name) || item?.senderName || '群聊').trim() || '群聊';

                let roleName = '';
                if (sourceMsg) {
                    if (isCollectionSentMessage(sourceMsg)) {
                        roleName = String(AppState.user?.name || '我');
                    } else {
                        roleName = String(sourceMsg.groupSenderName || item?.groupSenderName || item?.senderName || '成员');
                    }
                } else if (item?.groupSenderName) {
                    roleName = String(item.groupSenderName);
                } else if (isSent) {
                    roleName = String(AppState.user?.name || item?.senderName || '我');
                } else {
                    roleName = String(item?.senderName || '成员');
                }

                roleName = roleName.trim() || '成员';
                if (conv && roleName === conv.name) {
                    roleName = item?.groupSenderName ? String(item.groupSenderName).trim() || '成员' : '成员';
                }

                const group = (AppState.groups || []).find((g) => String(g.id) === String(item?.convId));
                const groupAvatar = String((conv && conv.avatar) || (group && group.avatar) || item?.senderAvatar || '').trim();
                return {
                    displayName: `${groupName}-${roleName}`,
                    avatarUrl: groupAvatar
                };
            }

            const displayName = isSent
                ? String(AppState.user?.name || item?.senderName || '我').trim() || '我'
                : String((conv && conv.name) || item?.senderName || '未命名').trim() || '未命名';

            const avatarUrl = String((conv && conv.avatar) || item?.senderAvatar || '').trim();

            return {
                displayName,
                avatarUrl
            };
        }

        // 打开收藏页面 - 浅粉白主题
        function openCollectionPage() {
            let page = document.getElementById('collection-page');
            if (!page) {
                page = document.createElement('div');
                page.id = 'collection-page';
                page.className = 'sub-page';
                document.getElementById('app-container').appendChild(page);
            }

            const collections = Array.isArray(AppState.collections) ? AppState.collections : [];
            const hasCollections = collections.length > 0;
            const collectionsHTML = hasCollections
                ? `<div class="collection-list">
                    ${collections.map((item) => {
                const displayMeta = resolveCollectionDisplayMeta(item);
                const senderName = String(displayMeta.displayName || '未命名').trim() || '未命名';
                const senderAvatar = String(displayMeta.avatarUrl || '').trim();
                const previewSource = resolveCollectionPreviewMessage(item);
                const rawText = previewSource
                    ? getCollectionPreviewTextFromMessage(previewSource)
                    : String(item.messageContent || '').trim();
                const messageText = rawText || '（空消息）';
                const previewText = messageText.length > 150 ? `${messageText.slice(0, 150)}...` : messageText;
                const previewHtml = previewSource ? buildCollectionMessagePreviewHtml(previewSource) : '';
                const messageHtml = previewHtml || escapeCollectionHtml(previewText);
                const collectionId = String(item.id || '');

                return `
                    <article class="collection-item" data-collection-id="${escapeCollectionHtml(collectionId)}">
                        <div class="collection-item-accent"></div>
                        <div class="collection-item-main">
                            <div class="collection-item-content">
                                <div class="collection-item-head">
                                    <div class="collection-avatar">
                                        ${senderAvatar ? `<img src="${escapeCollectionHtml(senderAvatar)}" alt="">` : escapeCollectionHtml(senderName.charAt(0) || '匿')}
                                    </div>
                                    <div class="collection-meta">
                                        <div class="collection-sender">${escapeCollectionHtml(senderName)}</div>
                                    </div>
                                </div>
                                <div class="collection-message">${messageHtml}</div>
                                ${item.originalMessageTime ? `
                                    <div class="collection-origin-time">原消息时间: ${escapeCollectionHtml(formatCollectionTime(item.originalMessageTime, true))}</div>
                                ` : ''}
                            </div>
                            <button class="delete-collection-btn" type="button" data-collection-action="delete" data-collection-id="${escapeCollectionHtml(collectionId)}" aria-label="删除收藏">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </article>
                `;
                    }).join('')}
                </div>`
                : `<div class="empty-state">
                    <div class="empty-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div class="empty-title">暂无收藏</div>
                    <div class="empty-desc">收藏的消息会显示在这里</div>
                </div>`;

            page.innerHTML = `
                <div class="sub-nav friend-nav settings-config-nav">
                    <div class="back-btn" id="collection-back-btn" aria-label="返回"></div>
                    <div class="sub-title">我的收藏</div>
                </div>
                <div class="sub-content collection-main-content">
                    ${collectionsHTML}
                </div>
                <div class="collection-confirm-mask hidden" id="collection-delete-confirm-mask">
                    <div class="collection-confirm-dialog" role="dialog" aria-modal="true" aria-label="删除收藏确认">
                        <div class="collection-confirm-text" id="collection-delete-confirm-text"></div>
                        <div class="collection-confirm-actions">
                            <button class="collection-confirm-btn" id="collection-delete-cancel-btn" type="button">取消</button>
                            <button class="collection-confirm-btn danger" id="collection-delete-confirm-btn" type="button">删除</button>
                        </div>
                    </div>
                </div>
            `;

            page.classList.add('open');
            page.onclick = function(event) {
                if (event.target.closest('#collection-back-btn')) {
                    hideCollectionDeleteConfirm(page);
                    page.classList.remove('open');
                    return;
                }

                const deleteBtn = event.target.closest('[data-collection-action="delete"]');
                if (deleteBtn) {
                    showCollectionDeleteConfirm(page, deleteBtn.dataset.collectionId);
                    return;
                }

                if (event.target.id === 'collection-delete-confirm-mask' || event.target.closest('#collection-delete-cancel-btn')) {
                    hideCollectionDeleteConfirm(page);
                    return;
                }

                if (event.target.closest('#collection-delete-confirm-btn')) {
                    const pendingDeleteId = page.dataset.pendingDeleteCollectionId;
                    hideCollectionDeleteConfirm(page);
                    if (pendingDeleteId) {
                        deleteCollectionItem(pendingDeleteId);
                    }
                }
            };
        }

        // 删除单个收藏
        function deleteCollectionItem(collectionId) {
            const before = Array.isArray(AppState.collections) ? AppState.collections.length : 0;
            AppState.collections = (AppState.collections || []).filter(c => String(c.id) !== String(collectionId));

            if (AppState.collections.length === before) {
                return;
            }

            saveToStorage();
            showToast('已删除');
            openCollectionPage(); // 刷新页面
        }


        // 打开个性装扮页面
        function openDecorationPage(defaultTab = 'font-store') {
            let page = document.getElementById('decoration-main-page');
            if (!page) {
                page = document.createElement('div');
                page.id = 'decoration-main-page';
                page.className = 'sub-page';
                document.getElementById('app-container').appendChild(page);
            }

            const allowedTabs = ['font', 'font-store', 'msg', 'friend'];
            const initialTab = allowedTabs.includes(defaultTab) ? defaultTab : 'font-store';

            const state = {
                activeTab: initialTab,
                storeDetailId: null,
                storePage: 1
            };
            const baseFontStoreItems = [
                {
                    id: 'zoean-dawn-pixel',
                    name: '破晓像素',
                    author: 'zoean',
                    url: 'https://image.uglycat.cc/h3h5tw.otf',
                    price: 36,
                    quote: '像素也可以很温柔，把清晨的光留在字里。',
                    badge: '新品',
                    accent: '#ff8f7a'
                },
                {
                    id: 'envya-jiangcheng-300',
                    name: '江城圆体 300W',
                    author: 'EnvyA',
                    url: 'https://image.uglycat.cc/qlmhjm.TTF',
                    price: 24,
                    quote: '轻一点的笔画，留出呼吸感给长句。',
                    badge: '轻盈',
                    accent: '#7fc7ff'
                },
                {
                    id: 'envya-jiangcheng-400',
                    name: '江城圆体 400W',
                    author: 'EnvyA',
                    url: 'https://image.uglycat.cc/steeac.ttf',
                    price: 26,
                    quote: '厚度刚好，聊天更清晰不费眼。',
                    badge: '清晰',
                    accent: '#7fe3c0'
                },
                {
                    id: 'envya-jiangcheng-500',
                    name: '江城圆体 500W',
                    author: 'EnvyA',
                    url: 'https://image.uglycat.cc/rza7ue.ttf',
                    price: 28,
                    quote: '日常阅读的主力款，耐看又稳。',
                    badge: '日常',
                    accent: '#8cb4ff'
                },
                {
                    id: 'envya-jiangcheng-600',
                    name: '江城圆体 600W',
                    author: 'EnvyA',
                    url: 'https://image.uglycat.cc/a83ri2.ttf',
                    price: 30,
                    quote: '标题更有分量，重点一眼抓住。',
                    badge: '标题',
                    accent: '#ffb05c'
                },
                {
                    id: 'envya-jiangcheng-700',
                    name: '江城圆体 700W',
                    author: 'EnvyA',
                    url: 'https://image.uglycat.cc/r3236q.ttf',
                    price: 32,
                    quote: '最厚的力量感，用来做强调刚好。',
                    badge: '强调',
                    accent: '#ff7b7b'
                },
                {
                    id: 'xuxu-taiwan-bold',
                    name: '台湾字体',
                    author: 'xuxu',
                    url: 'https://img.heliar.top/file/1773205572550_%E6%9C%80%E7%B2%97%E7%9A%84.otf',
                    price: 34,
                    quote: '带一点岛屿的轻松感，把句子放慢一点。',
                    badge: '手写',
                    accent: '#ffd166'
                }
            ];

            const mintFontsRaw = [
                { name: 'qbytrq', url: 'https://nos.netease.com/ysf/929e02030f44016358e7f3da403ef0a8.ttf' },
                { name: 'AZhuPaoPaoTi-2', url: 'https://nos.netease.com/ysf/3ebf95928a515b5b5e223d4f0490374d.ttf' },
                { name: 'BaoTuXiaoBaiTi-2', url: 'https://nos.netease.com/ysf/f03c237b7d9a5a2834c7fd7236851de6.ttf' },
                { name: 'Cubic-11-1.000-R-2', url: 'https://nos.netease.com/ysf/8d33e17429ec97adfdc4d893e5892dde.ttf' },
                { name: 'dingliesongtypeface20241217-2', url: 'https://nos.netease.com/ysf/fafb990aba2ad9434f66241172d53c43.ttf' },
                { name: 'FangZhengFangSongJianTi-1', url: 'https://nos.netease.com/ysf/6243ab9ef2b62586e7a37b92c5636a15.ttf' },
                { name: 'FangZhengKaiTiJianTi-1', url: 'https://nos.netease.com/ysf/7ac5e2fe192072c9ba0b2910360cdd18.ttf' },
                { name: 'JinNianYeYaoJiaYouYa-2', url: 'https://nos.netease.com/ysf/53bf5f004d1de24c55784b9794158ffb.ttf' },
                { name: 'PingFangJiangNanTi-2', url: 'https://nos.netease.com/ysf/5f4276913bc8f5049eab7f49cbde40d6.ttf' },
                { name: 'Tanugo-Round-Regular-2', url: 'https://nos.netease.com/ysf/fd79fa9ecf388151eff313e97892d33f.otf' },
                { name: 'uzura-2', url: 'https://nos.netease.com/ysf/85b0ff28de3d21c7b1893b3ebbc24982.ttf' },
                { name: 'WuXinShouXieTi-2', url: 'https://nos.netease.com/ysf/dfe54fdffd1d723d237fee2cf0bcbfed.otf' },
                { name: 'YeZiGongChangXiaoShiTou-2', url: 'https://nos.netease.com/ysf/3055adcd3488a17a434bebc1997850b2.ttf' },
                { name: '851ShouShu-2', url: 'https://nos.netease.com/ysf/d3409d7cc8c78a21d05f94000700a794.ttf' },
                { name: 'AaXiaoGouGuaiGuaiXiangSuTi-2', url: 'https://nos.netease.com/ysf/41c59a5bfd6c546a2dd60ffb1241c3e2.ttf' },
                { name: 'cjkFonts-allseto-v1.11-2', url: 'https://nos.netease.com/ysf/70df60271996724d684ff223d3f2c672.ttf' },
                { name: 'KeMingChao-2', url: 'https://nos.netease.com/ysf/3bbf9a905a3d5c7cf61db70b38f72001.ttf' },
                { name: 'LingDongQiCheChunTang-2', url: 'https://nos.netease.com/ysf/7456c3b7946ba6b5d8fbf701330cb76d.ttf' },
                { name: 'NaikaiFont-Light-2', url: 'https://nos.netease.com/ysf/4812993f74cbb7ebe670379802a33ca6.ttf' },
                { name: 'SetoFont-1', url: 'https://nos.netease.com/ysf/127b24164cc10aff532b8dfc9c1f9b9e.ttf' },
                { name: 'SourceHanSerifCN-Regular-1', url: 'https://nos.netease.com/ysf/d4c07c91ceda27e386f4ded1091b4de4.otf' },
                { name: 'TaiWanQuanZiKuZhengKaiTi-2', url: 'https://nos.netease.com/ysf/7b9edf1aaf26d77db4ea95dabc89970c.ttf' },
                { name: '汇文明朝体', url: 'https://nos.netease.com/ysf/095535340aeac5afcc6749f182dc19fe.otf' },
                { name: 'StarPandaKids', url: 'https://nos.netease.com/ysf/c694061d726fe0b78330050b6c181cd2.otf' },
                { name: '小灰灰', url: 'https://nos.netease.com/ysf/8f8aa5322afd68c1eb57f28bacd514da.ttf' },
                { name: '元气桃桃', url: 'https://nos.netease.com/ysf/aa5ebeecfda32a4344abf84cd76db70d.ttf' },
                { name: '你呢也在想我吗', url: 'https://nos.netease.com/ysf/fab4fa13c97c3d9bac316f921a5d590f.ttf' },
                { name: '烤肉拌饭', url: 'https://nos.netease.com/ysf/b836dbf9b7e35be360e42716042a0994.ttf' },
                { name: '弯弯月', url: 'https://nos.netease.com/ysf/bd513cbd401a0d12d7e048c1b60c39f0.ttf' },
                { name: '小熊小鱼', url: 'https://nos.netease.com/ysf/ae3e90f917ec7c37b2961c67a037ca57.ttf' },
                { name: '小圆', url: 'https://nos.netease.com/ysf/16251a33f0e7754a71251ba5b7f87db8.ttf' },
                { name: '蘑菇头', url: 'https://nos.netease.com/ysf/6bb44d723fdbfbd26d24620c077fb04b.ttf' },
                { name: '考拉卷', url: 'https://nos.netease.com/ysf/45d89b02d2202f68cac36aeb8314d2c0.ttf' },
                { name: '猫的鱼', url: 'https://nos.netease.com/ysf/e3626bd2b4f105376faac9fc805f25bc.ttf' },
                { name: '卡哇伊手写', url: 'https://nos.netease.com/ysf/c1f67cfa415d564b07bb3dbdd66c3bfc.ttf' },
                { name: '喵喵喵', url: 'https://nos.netease.com/ysf/e6e94c334834416a223ea43da706ab31.ttf' },
                { name: '小面包', url: 'https://nos.netease.com/ysf/413efd4616a069e5b387785a2cdd48dc.ttf' },
                { name: '小森林', url: 'https://nos.netease.com/ysf/d0a77ed2bc75113956c933d2829574d1.ttf' },
                { name: '山海情', url: 'https://nos.netease.com/ysf/ad711ffd9f2d6db7024424921aeec415.ttf' },
                { name: 'Traveler', url: 'https://nos.netease.com/ysf/a42d035e0e07e27485b1e6b06295824f.ttf' },
                { name: '春日玫瑰', url: 'https://nos.netease.com/ysf/a1e145dbac1ec712fa68d7fecee16216.ttf' },
                { name: '多丸体', url: 'https://nos.netease.com/ysf/8dc9e3ffd954d3e4c1315328ac2b8f13.ttf' },
                { name: '贩梦奶酪体', url: 'https://nos.netease.com/ysf/88076b021f2157caea5bcad9ab665832.ttf' },
                { name: '孤岛', url: 'https://nos.netease.com/ysf/35b3034411632014ae4bfbcc3faa73e7.ttf' },
                { name: '故梦', url: 'https://nos.netease.com/ysf/4d0deda4845e9e8657e324ade64b9218.ttf' },
                { name: '诀爱', url: 'https://nos.netease.com/ysf/b7a4e983b18dedf08063532c00575aeb.ttf' },
                { name: '玫瑰', url: 'https://nos.netease.com/ysf/21c4facac6277a860ac0e8fc80589672.ttf' },
                { name: '派小星', url: 'https://nos.netease.com/ysf/66befa5307c1a47d7cfa11ef94504653.ttf' },
                { name: '旁白', url: 'https://nos.netease.com/ysf/c123fc5df16186fb710032bc2a4b2e0e.ttf' },
                { name: '晴空体', url: 'https://nos.netease.com/ysf/f0a6df2cc467bb5039e9e47c1974cd3f.ttf' },
                { name: '圈圈', url: 'https://nos.netease.com/ysf/c797dcf1a83779144ae70cc25158d4ae.ttf' },
                { name: '素笺体', url: 'https://nos.netease.com/ysf/f6ee97395dba0526d19690b7f52a32b7.ttf' },
                { name: '向风', url: 'https://nos.netease.com/ysf/f7080b5c349080d2cb4ba043c85371ef.ttf' },
                { name: '雨眠', url: 'https://nos.netease.com/ysf/4693a815e6259b7aa9f42e0fc330bcc9.ttf' },
                { name: '新蒂下午茶体', url: 'https://nos.netease.com/ysf/ba90280f3623a19f888f54bb6d0a0817.ttf' },
                { name: '白桃奶油泡芙', url: 'https://nos.netease.com/ysf/ec892d0da8afd8cfe550595f1cf955b6.ttf' },
                { name: '第九頁無聲海', url: 'https://nos.netease.com/ysf/fe37e97b7ca08b9a3b7cbdf84e022da0.ttf' },
                { name: '可爱小猫不说谎', url: 'https://nos.netease.com/ysf/59e90fcf2c241c9de668d17e4c58f0cb.ttf' },
                { name: '裙带菜', url: 'https://nos.netease.com/ysf/cc890c58c088b0599b18ef014c2f8142.ttf' },
                { name: '水母情书', url: 'https://nos.netease.com/ysf/1a742f4b20ea50bdc8d00c3d23e95dd7.ttf' },
                { name: '我看见你 你独你', url: 'https://nos.netease.com/ysf/aedfccf91288c14dce6225e3548b83fe.ttf' },
                { name: '幽兰拿铁', url: 'https://nos.netease.com/ysf/4451b59418265078869cc981b56d5674.ttf' },
                { name: '自由', url: 'https://nos.netease.com/ysf/9ad1add4523e027754758dd95a2b6959.ttf' },
                { name: '草莓卷', url: 'https://nos.netease.com/ysf/e6dfc20f3d1f24629717d805d5289788.ttf' },
                { name: '春田花花', url: 'https://nos.netease.com/ysf/aba688d8d28b6b828c20550d332e60ec.ttf' },
                { name: '粗圆体', url: 'https://nos.netease.com/ysf/4ff04cb60f7eb2483355fad7ac09b6e3.ttf' },
                { name: '曲奇小绵芽', url: 'https://nos.netease.com/ysf/9ac8c4bba7f1ffd8f4967df0399e9ebd.ttf' },
                { name: '然の', url: 'https://nos.netease.com/ysf/753a713e6a31ec55c016a9e3253f4350.ttf' },
                { name: '小白兔只', url: 'https://nos.netease.com/ysf/aa82f02ae41eeb14c6e4abe0a8fddf39.ttf' },
                { name: '小面包', url: 'https://nos.netease.com/ysf/4c904279e9d8ed84441a3cc229881336.ttf' },
                { name: '小猪呼呼', url: 'https://nos.netease.com/ysf/5b7ba9d09de14fef27752381a45b8e65.ttf' },
                { name: '一颗萌布丁', url: 'https://nos.netease.com/ysf/010535bedecb1311389aff770ef68203.ttf' }
            ];

            const mintBadges = ['人气', '轻柔', '灵动', '治愈', '元气', '清新', '温柔', '软萌', '舒缓'];
            const mintAccents = ['#ffb677', '#ffd166', '#f7aef8', '#b8f2e6', '#a0c4ff', '#ffadad', '#caffbf', '#9bf6ff', '#ffc6ff'];
            const mintPrices = [18, 20, 22, 24, 26, 28, 30, 32, 34];

            const storeNameOverrides = {
                '江城圆体 300W': '江城圆体·轻细',
                '江城圆体 400W': '江城圆体·清朗',
                '江城圆体 500W': '江城圆体·稳正',
                '江城圆体 600W': '江城圆体·标题',
                '江城圆体 700W': '江城圆体·重墨',
                'Traveler': '远行者'
            };
            const storeNameFronts = [
                '春汐', '月白', '清岚', '松影', '雾绡', '星河', '竹语', '海潮',
                '枕风', '晚灯', '雨眠', '南枝', '旧梦', '浅墨', '柳烟', '雪影',
                '兰庭', '云栖'
            ];
            const storeNameBacks = [
                '轻体', '柔体', '清体', '书体', '圆体', '细体', '简体', '逸体',
                '雅体', '素体', '影体', '澄体'
            ];
            const storePoemSubjects = [
                '春风', '秋水', '晓月', '夜雨', '远山', '归雁', '青灯', '落花',
                '微雪', '松间', '海潮', '柳影', '星河', '薄雾', '炊烟', '暮云',
                '清溪', '旧城'
            ];
            const storePoemActions = [
                '拂', '照', '入', '落', '穿', '染', '洗', '摇', '映', '泊',
                '扣', '随', '归', '绕', '轻点', '轻敲', '微起', '缓行'
            ];
            const storePoemObjects = [
                '柳岸', '石桥', '旧城', '渔火', '平湖', '竹影', '青瓦', '小径',
                '沙洲', '松窗', '溪口', '书页', '花径', '山寺', '苔阶', '檐下',
                '船尾', '灯影'
            ];
            const storePoemEnds = [
                '微凉', '如梦', '无声', '成诗', '初醒', '渐远', '轻响', '入怀',
                '不语', '淡然', '清明', '柔软', '清浅', '未央', '照影', '成烟',
                '相依', '自安'
            ];
            const storeStoryTones = [
                '清润', '温柔', '轻缓', '通透', '笃定', '微凉', '清甜', '安静',
                '柔和', '明朗', '沉稳', '灵动'
            ];
            const storeStoryScenes = [
                '晨雾的巷口', '午后窗前', '雨后的石桥', '晚灯下的书桌',
                '海边的长堤', '山寺的木阶', '旧城的拱门', '竹影摇动的庭院',
                '风起的岸边', '薄雾里的河面', '夜色下的街角', '初晴的屋檐'
            ];
            const storeStoryGestures = [
                '风掠过纸面', '水在石上回响', '光在玻璃上流动', '叶在窗前轻摆',
                '潮在岸边轻拍', '影在墙上游走', '雾在栏杆上散开', '雨在瓦上敲击',
                '星在屋脊上停驻', '烟在巷口缓升', '钟在远处慢响', '云在山背处缓移'
            ];
            const storeStoryTextures = [
                '细密的留白', '柔软的边缘', '克制的起伏', '安稳的重心',
                '松弛的线条', '轻轻的间距', '温热的笔触', '干净的轮廓',
                '舒展的节奏', '静默的停顿', '轻盈的笔意', '细腻的转折'
            ];
            const storeStoryReturns = [
                '更安静的节拍', '更清晰的呼吸', '更从容的步伐', '更柔和的目光',
                '更稳妥的心绪', '更明净的视线', '更缓慢的时间', '更可靠的停顿',
                '更温和的结尾', '更轻的回声', '更平稳的落点', '更柔软的落日'
            ];
            const storeStoryMemories = [
                '一盏灯的温度', '一段旧信的纸香', '一场雨的余韵', '一页书的褶皱',
                '一阵风的回响', '一片海的潮声', '一条街的脚步', '一座桥的轻响',
                '一窗月的安宁', '一树花的静影', '一夜星的微光', '一缕烟的柔远'
            ];

            function buildStoreChineseName(name, index) {
                const trimmedName = String(name || '').trim();
                if (storeNameOverrides[trimmedName]) {
                    return storeNameOverrides[trimmedName];
                }
                if (!/[A-Za-z]/.test(trimmedName)) {
                    return trimmedName;
                }
                const front = storeNameFronts[index % storeNameFronts.length];
                const back = storeNameBacks[Math.floor(index / storeNameFronts.length) % storeNameBacks.length];
                return `${front}${back}`;
            }

            function generatePoemLine(index) {
                const subjectA = storePoemSubjects[index % storePoemSubjects.length];
                const actionA = storePoemActions[index % storePoemActions.length];
                const objectA = storePoemObjects[Math.floor(index / storePoemSubjects.length) % storePoemObjects.length];
                const endA = storePoemEnds[Math.floor(index / (storePoemSubjects.length * 2)) % storePoemEnds.length];
                const subjectB = storePoemSubjects[(index + 5) % storePoemSubjects.length];
                const actionB = storePoemActions[(index + 7) % storePoemActions.length];
                const objectB = storePoemObjects[(index + 11) % storePoemObjects.length];
                const endB = storePoemEnds[(index + 13) % storePoemEnds.length];
                return `${subjectA}${actionA}${objectA}${endA}，${subjectB}${actionB}${objectB}${endB}`;
            }

            function buildStoreStory(item, index) {
                const quoteText = String(item.quote || '').trim() || '风月入怀，星河自安';
                const [lineA, lineB] = quoteText.split('，');
                const mainLineA = lineA || quoteText;
                const mainLineB = lineB || '余韵未央';
                const toneA = storeStoryTones[index % storeStoryTones.length];
                const toneB = storeStoryTones[(index + 5) % storeStoryTones.length];
                const sceneA = storeStoryScenes[index % storeStoryScenes.length];
                const sceneB = storeStoryScenes[(index + 7) % storeStoryScenes.length];
                const gestureA = storeStoryGestures[index % storeStoryGestures.length];
                const textureA = storeStoryTextures[index % storeStoryTextures.length];
                const returnA = storeStoryReturns[index % storeStoryReturns.length];
                const memoryA = storeStoryMemories[index % storeStoryMemories.length];
                const safeName = String(item.name || '这款字体').trim() || '这款字体';
                return `以“${quoteText}”为引，${safeName}把“${mainLineA}”的光色拆成${toneA}的骨架，又将“${mainLineB}”铺成缓慢的纹理，让字的停顿像${sceneA}里的一次呼吸。设计时先让笔画在${sceneB}间行走，再让转折学会${gestureA}的节奏，因此阅读时你会感到它在靠近，也会感到它在退后，始终保持${toneB}的温度。它不靠尖锐情绪抓住你，而是让字面留出${textureA}的空处，让视线在缝隙里看见${memoryA}，普通的句子也会被轻轻照亮。当你把它放进对话、标题或长段叙述时，字形会自动收束重心，把散开的思绪带回${returnA}，像在那句“${quoteText}”里再次落座。`;
            }

            const mintFonts = mintFontsRaw.map((item, index) => {
                return {
                    id: `mint-${index + 1}`,
                    name: item.name,
                    author: '薄荷猫',
                    url: item.url,
                    price: mintPrices[index % mintPrices.length],
                    quote: '',
                    badge: mintBadges[index % mintBadges.length],
                    accent: mintAccents[index % mintAccents.length]
                };
            });

            const rawFontStoreItems = baseFontStoreItems.concat(mintFonts);
            const fontStoreItems = rawFontStoreItems.map((item, index) => {
                const normalizedName = buildStoreChineseName(item.name, index);
                const legacyNames = normalizedName !== item.name ? [item.name] : [];
                return {
                    ...item,
                    name: normalizedName,
                    legacyNames,
                    quote: generatePoemLine(index)
                };
            });

            const storeDetailMoods = [
                '清晨棉雾',
                '薄荷汽泡',
                '杏桃暖风',
                '奶油黄昏',
                '星光夜航',
                '海边微光',
                '旧书房',
                '玻璃花房',
                '电台低语'
            ];
            const storeDetailBenefits = [
                '购买后永久可用，支持全局应用',
                '可随时在字体库中切换',
                '购买记录写入钱包明细'
            ];

            function getFontFormatLabel(url) {
                const cleanUrl = String(url || '').split('?')[0].split('#')[0].toLowerCase();
                if (cleanUrl.endsWith('.otf')) {
                    return 'OTF';
                }
                return 'TTF';
            }

            function getStoreDetailMeta(item, index) {
                const mood = storeDetailMoods[index % storeDetailMoods.length];
                const story = buildStoreStory(item, index);
                return { mood, story };
            }

            function getFontStoreState() {
                if (!AppState.fontStore || typeof AppState.fontStore !== 'object') {
                    AppState.fontStore = { owned: [] };
                }
                if (!Array.isArray(AppState.fontStore.owned)) {
                    AppState.fontStore.owned = [];
                }
                return AppState.fontStore;
            }

            function getInstalledFontForItem(item, manager) {
                if (!manager) {
                    return null;
                }
                const legacyNames = Array.isArray(item.legacyNames) ? item.legacyNames : [];
                const currentName = String(item.name || '').trim();
                return manager.getAllFonts().find((font) => {
                    if (font.storeId && font.storeId === item.id) {
                        return true;
                    }
                    const fontName = String(font.name || '').trim();
                    if (fontName === currentName) {
                        return true;
                    }
                    return legacyNames.some((legacy) => String(legacy || '').trim() === fontName);
                }) || null;
            }

            function isActiveFontForItem(item, activeFont) {
                if (!activeFont) {
                    return false;
                }
                if (activeFont.storeId && activeFont.storeId === item.id) {
                    return true;
                }
                const legacyNames = Array.isArray(item.legacyNames) ? item.legacyNames : [];
                const activeName = String(activeFont.name || '').trim();
                if (activeName === String(item.name || '').trim()) {
                    return true;
                }
                return legacyNames.some((legacy) => String(legacy || '').trim() === activeName);
            }

            
            
            page.innerHTML = `
                <div class="sub-nav friend-nav settings-config-nav">
                    <div class="back-btn" id="decoration-main-back-btn" aria-label="返回"></div>
                    <div class="sub-title">个性装扮</div>
                </div>
                <div class="sub-content decoration-tab-main-content">
                    <div class="decoration-tab-nav" role="tablist" aria-label="个性装扮导航">
                        <button class="decoration-tab-btn active" data-tab="font-store" role="tab" aria-selected="true">字体商店</button>
                        <button class="decoration-tab-btn" data-tab="font" role="tab" aria-selected="false">我的字体</button>
                        <button class="decoration-tab-btn" data-tab="msg" role="tab" aria-selected="false">消息页面</button>
                        <button class="decoration-tab-btn" data-tab="friend" role="tab" aria-selected="false">好友页面</button>
                    </div>

                    <div class="decoration-tab-panels">
                        <section class="decoration-tab-panel active" data-panel="font-store"></section>
                        <section class="decoration-tab-panel" data-panel="font"></section>
                        <section class="decoration-tab-panel" data-panel="msg"></section>
                        <section class="decoration-tab-panel" data-panel="friend"></section>
                    </div>

                    <div class="decoration-modal-mask hidden" id="decoration-modal-mask">
                        <div class="decoration-modal-card" role="dialog" aria-modal="true" aria-labelledby="decoration-modal-title">
                            <div class="decoration-modal-title" id="decoration-modal-title">提示</div>
                            <div class="decoration-modal-text" id="decoration-modal-text"></div>
                            <div class="decoration-modal-actions">
                                <button class="decoration-btn" id="decoration-modal-cancel">取消</button>
                                <button class="decoration-btn primary" id="decoration-modal-confirm">确定</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>
                    #decoration-main-page .decoration-tab-main-content {
                        padding: 0 10px calc(88px + var(--safe-area-inset-bottom));
                        overflow-y: auto;
                        background: linear-gradient(180deg, #fff8fc 0%, #fff1f7 58%, #fffdfd 100%);
                    }

                    #decoration-main-page .sub-nav {
                        background: #fff8fc;
                        border-bottom: 1px solid #ffe0ee;
                        box-shadow: 0 4px 12px rgba(255, 190, 214, 0.16);
                        z-index: 8;
                    }

                    #decoration-main-page .decoration-tab-nav {
                        position: sticky;
                        top: 0;
                        z-index: 6;
                        display: flex;
                        flex-wrap: nowrap;
                        gap: 6px;
                        overflow-x: auto;
                        overflow-y: hidden;
                        white-space: nowrap;
                        -webkit-overflow-scrolling: touch;
                        margin-bottom: 10px;
                        padding: 10px 0 10px;
                        background: #fff8fc;
                        box-shadow: 0 6px 14px rgba(255, 190, 214, 0.2);
                        border-bottom: 1px solid #ffe0ee;
                        scrollbar-width: none;
                    }

                    #decoration-main-page .decoration-tab-nav::-webkit-scrollbar {
                        display: none;
                    }

                    #decoration-main-page .decoration-tab-btn {
                        flex: 0 0 auto;
                        min-width: 62px;
                        height: 30px;
                        padding: 0 10px;
                        border: none;
                        border-radius: 999px;
                        background: #fff;
                        color: #bd7a97;
                        font-size: 12px;
                        font-weight: 600;
                        letter-spacing: 0.1px;
                        box-shadow: 0 2px 8px rgba(249, 161, 192, 0.18);
                        cursor: pointer;
                        transition: transform 0.15s ease, background 0.2s ease, color 0.2s ease;
                        -webkit-tap-highlight-color: transparent;
                    }

                    #decoration-main-page .decoration-tab-btn:active {
                        transform: scale(0.96);
                    }

                    #decoration-main-page .decoration-tab-btn.active {
                        color: #fff;
                        background: linear-gradient(135deg, #ffbbd2 0%, #ff99bc 100%);
                        box-shadow: 0 5px 14px rgba(255, 150, 187, 0.34);
                    }

                    #decoration-main-page .decoration-tab-panel {
                        display: none;
                    }

                    #decoration-main-page .decoration-tab-panel.active {
                        display: block;
                    }

                    #decoration-main-page .decoration-card {
                        background: linear-gradient(180deg, #fffefe 0%, #fff8fc 100%);
                        border: 1px solid #ffdced;
                        border-radius: 16px;
                        padding: 14px;
                        box-shadow: 0 5px 16px rgba(248, 157, 189, 0.14);
                        margin-bottom: 10px;
                    }

                    #decoration-main-page .decoration-card-title {
                        font-size: 16px;
                        font-weight: 700;
                        color: #cb628a;
                        margin-bottom: 4px;
                    }

                    #decoration-main-page .decoration-card-desc {
                        font-size: 12px;
                        color: #bf89a1;
                        line-height: 1.55;
                        margin-bottom: 12px;
                    }

                    #decoration-main-page .decoration-field {
                        margin-bottom: 12px;
                    }

                    #decoration-main-page .decoration-label {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 12px;
                        color: #ba7f98;
                        margin-bottom: 6px;
                    }

                    #decoration-main-page .decoration-input,
                    #decoration-main-page .decoration-range,
                    #decoration-main-page .decoration-color {
                        width: 100%;
                        box-sizing: border-box;
                    }

                    #decoration-main-page .decoration-input {
                        height: 36px;
                        border: 1px solid #ffdce9;
                        border-radius: 10px;
                        background: #fff;
                        color: #9c5878;
                        font-size: 13px;
                        padding: 0 10px;
                        outline: none;
                    }

                    #decoration-main-page .decoration-input:focus {
                        border-color: #ffb0cc;
                        box-shadow: 0 0 0 2px rgba(255, 176, 204, 0.2);
                    }

                    #decoration-main-page .decoration-color {
                        height: 38px;
                        border: 1px solid #ffdce9;
                        border-radius: 10px;
                        padding: 4px;
                        background: #fff;
                    }

                    #decoration-main-page .decoration-range {
                        -webkit-appearance: none;
                        appearance: none;
                        height: 7px;
                        border-radius: 999px;
                        background: linear-gradient(90deg, #ffb8d1 0%, #ffb8d1 50%, #ffe2ee 50%, #ffe2ee 100%);
                        outline: none;
                    }

                    #decoration-main-page .decoration-range::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        border: 2px solid #fff;
                        background: #ff9fc4;
                        box-shadow: 0 3px 8px rgba(255, 152, 189, 0.35);
                    }

                    #decoration-main-page .decoration-range::-moz-range-thumb {
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        border: 2px solid #fff;
                        background: #ff9fc4;
                        box-shadow: 0 3px 8px rgba(255, 152, 189, 0.35);
                    }

                    #decoration-main-page .decoration-action-row {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                    }

                    #decoration-main-page .decoration-btn {
                        min-height: 32px;
                        padding: 0 12px;
                        border-radius: 10px;
                        border: 1px solid #ffd7e7;
                        background: #fff;
                        color: #be7394;
                        font-size: 12px;
                        font-weight: 600;
                        cursor: pointer;
                    }

                    #decoration-main-page .decoration-btn:active {
                        transform: scale(0.97);
                    }

                    #decoration-main-page .decoration-btn.primary {
                        border: none;
                        color: #fff;
                        background: linear-gradient(135deg, #ffb4cf 0%, #ff95ba 100%);
                    }

                    #decoration-main-page .decoration-btn.danger {
                        background: #fff4f8;
                        color: #d96a94;
                        border-color: #ffc9dd;
                    }

                    #decoration-main-page .decoration-upload {
                        border: 1.5px dashed #ffc8de;
                        border-radius: 12px;
                        background: #fffafd;
                        text-align: center;
                        padding: 14px 12px;
                        color: #c57f9d;
                        cursor: pointer;
                        margin-bottom: 12px;
                    }

                    #decoration-main-page .decoration-upload-hint {
                        font-size: 12px;
                        color: #cfa0b5;
                        margin-top: 4px;
                    }

                    #decoration-main-page .decoration-list-empty {
                        border: 1px dashed #ffdbe9;
                        border-radius: 12px;
                        background: #fffafd;
                        padding: 16px 12px;
                        text-align: center;
                        font-size: 12px;
                        color: #c896ad;
                    }

                    #decoration-main-page .decoration-bg-item,
                    #decoration-main-page .decoration-font-item {
                        border: 1px solid #ffe2ee;
                        border-radius: 12px;
                        background: #fff;
                        padding: 10px;
                        margin-bottom: 8px;
                    }

                    #decoration-main-page .decoration-bg-item.active {
                        border-color: #ffafcb;
                        box-shadow: 0 4px 10px rgba(255, 170, 199, 0.2);
                    }

                    #decoration-main-page .decoration-bg-head {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    #decoration-main-page .decoration-bg-preview {
                        width: 50px;
                        height: 50px;
                        border-radius: 8px;
                        border: 1px solid #ffd9e8;
                        background-size: cover;
                        background-position: center;
                        flex-shrink: 0;
                    }

                    #decoration-main-page .decoration-grow {
                        flex: 1;
                        min-width: 0;
                    }

                    #decoration-main-page .decoration-item-name {
                        font-size: 13px;
                        color: #b65f83;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    #decoration-main-page .decoration-item-meta {
                        font-size: 11px;
                        color: #c89eb0;
                        margin-top: 2px;
                    }

                    #decoration-main-page .decoration-font-preview {
                        margin-top: 8px;
                        padding: 8px;
                        border-radius: 8px;
                        background: #fff8fc;
                        color: #a35e7c;
                        font-size: 12px;
                        line-height: 1.5;
                    }

                    #decoration-main-page .decoration-font-hero {
                        background: linear-gradient(135deg, #fff9fd 0%, #ffeef6 100%);
                    }

                    #decoration-main-page .decoration-font-hero-head {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 10px;
                        margin-bottom: 10px;
                    }

                    #decoration-main-page .decoration-font-hero-title {
                        font-size: 17px;
                        font-weight: 700;
                        color: #ca638b;
                    }

                    #decoration-main-page .decoration-font-hero-sub {
                        font-size: 12px;
                        color: #be8aa1;
                        line-height: 1.5;
                    }

                    #decoration-main-page .decoration-font-current {
                        margin-top: 8px;
                        padding: 10px;
                        border-radius: 10px;
                        border: 1px solid #ffd8e8;
                        background: #fff;
                    }

                    #decoration-main-page .decoration-font-current-label {
                        font-size: 11px;
                        color: #bf89a0;
                        margin-bottom: 4px;
                    }

                    #decoration-main-page .decoration-font-current-name {
                        font-size: 13px;
                        font-weight: 600;
                        color: #ae597d;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    #decoration-main-page .decoration-font-action-grid {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 8px;
                    }

                    #decoration-main-page .decoration-font-btn {
                        min-height: 40px;
                        border-radius: 12px;
                        font-size: 13px;
                        font-weight: 700;
                        letter-spacing: 0.1px;
                    }

                    #decoration-main-page .decoration-font-url-wrap {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }

                    #decoration-main-page .decoration-font-url-btn {
                        align-self: flex-start;
                        min-height: 38px;
                        border-radius: 11px;
                        font-size: 13px;
                        font-weight: 700;
                        padding: 0 14px;
                    }

                    #decoration-main-page .decoration-font-list-title {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 10px;
                        font-size: 13px;
                        color: #b87795;
                        font-weight: 600;
                    }

                    #decoration-main-page .decoration-font-item {
                        padding: 12px;
                        border-radius: 13px;
                    }

                    #decoration-main-page .decoration-font-item .decoration-action-row {
                        margin-top: 10px !important;
                    }

                    #decoration-main-page .decoration-font-item .decoration-btn {
                        min-height: 36px;
                        border-radius: 11px;
                        font-size: 12px;
                        font-weight: 700;
                    }

                    #decoration-main-page .decoration-bg-hero {
                        background: linear-gradient(135deg, #fff9fd 0%, #ffeef6 100%);
                    }

                    #decoration-main-page .decoration-bg-hero-head {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 10px;
                        margin-bottom: 10px;
                    }

                    #decoration-main-page .decoration-bg-hero-title {
                        font-size: 17px;
                        font-weight: 700;
                        color: #ca638b;
                    }

                    #decoration-main-page .decoration-bg-hero-sub {
                        font-size: 12px;
                        color: #be8aa1;
                        line-height: 1.5;
                    }

                    #decoration-main-page .decoration-bg-current {
                        margin-top: 8px;
                        padding: 10px;
                        border-radius: 10px;
                        border: 1px solid #ffd8e8;
                        background: #fff;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    #decoration-main-page .decoration-bg-current-preview {
                        width: 56px;
                        height: 56px;
                        border-radius: 10px;
                        border: 1px solid #ffd8e8;
                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;
                        flex-shrink: 0;
                    }

                    #decoration-main-page .decoration-bg-item {
                        padding: 12px;
                        border-radius: 13px;
                    }

                    #decoration-main-page .decoration-bg-item-actions {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 8px;
                        margin-top: 10px;
                    }

                    #decoration-main-page .decoration-bg-item-btn {
                        min-height: 36px;
                        border-radius: 11px;
                        font-size: 12px;
                        font-weight: 700;
                    }

                    #decoration-main-page .decoration-bg-main-actions {
                        margin-top: 10px;
                    }

                    #decoration-main-page .decoration-bg-main-btn {
                        width: 100%;
                        min-height: 40px;
                        border-radius: 12px;
                        font-size: 13px;
                        font-weight: 700;
                    }

                    #decoration-main-page .decoration-inline-badge {
                        display: inline-flex;
                        align-items: center;
                        height: 21px;
                        padding: 0 8px;
                        border-radius: 999px;
                        border: 1px solid #ffbfd7;
                        background: #fff3f9;
                        font-size: 11px;
                        color: #cc6f98;
                    }

                    #decoration-main-page .decoration-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none;
                    }

                    #decoration-main-page .decoration-store-hero-head {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 10px;
                        margin-bottom: 10px;
                    }

                    #decoration-main-page .decoration-store-hero-title {
                        font-size: 17px;
                        font-weight: 700;
                        color: #c85a85;
                    }

                    #decoration-main-page .decoration-store-hero-sub {
                        font-size: 12px;
                        color: #b9849f;
                        line-height: 1.5;
                    }

                    #decoration-main-page .decoration-store-balance {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        padding: 10px;
                        border-radius: 12px;
                        border: 1px solid #ffd8e8;
                        background: #fff;
                    }

                    #decoration-main-page .decoration-store-balance-label {
                        font-size: 12px;
                        color: #c08da2;
                    }

                    #decoration-main-page .decoration-store-balance-value {
                        font-size: 20px;
                        font-weight: 700;
                        color: #c85a85;
                        margin-top: 4px;
                    }

                    #decoration-main-page .decoration-store-stats {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 10px;
                        font-size: 12px;
                        color: #bf89a1;
                    }

                    #decoration-main-page .decoration-store-grid {
                        display: grid !important;
                        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                        gap: 12px;
                        width: 100%;
                        justify-items: stretch;
                    }

                    #decoration-main-page .decoration-store-card {
                        --store-accent: #ffb4cf;
                        position: relative;
                        border-radius: 16px;
                        padding: 14px;
                        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 248, 241, 0.96) 100%);
                        border: 1px solid rgba(255, 212, 182, 0.7);
                        box-shadow: 0 10px 24px rgba(255, 188, 154, 0.18);
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        overflow: hidden;
                        cursor: pointer;
                        transition: transform 0.2s ease, box-shadow 0.2s ease;
                        min-width: 0;
                        align-items: center;
                        text-align: center;
                    }

                    #decoration-main-page .decoration-store-card:hover {
                        transform: translateY(-4px);
                        box-shadow: 0 14px 28px rgba(255, 176, 150, 0.24);
                    }

                    #decoration-main-page .decoration-store-card::before {
                        content: '';
                        position: absolute;
                        left: 0;
                        top: 0;
                        height: 4px;
                        width: 100%;
                        background: var(--store-accent);
                    }

                    #decoration-main-page .decoration-store-card::after {
                        content: '';
                        position: absolute;
                        right: -30px;
                        top: -40px;
                        width: 120px;
                        height: 120px;
                        background: radial-gradient(circle, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
                        pointer-events: none;
                    }

                    #decoration-main-page .decoration-store-card-head {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        width: 100%;
                    }

                    #decoration-main-page .decoration-store-name {
                        font-size: 12px;
                        font-weight: 700;
                        color: #b85c7e;
                    }

                    #decoration-main-page .decoration-store-author {
                        font-size: 12px;
                        color: #a67890;
                        width: 100%;
                    }


                    #decoration-main-page .decoration-store-actions {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        flex-wrap: wrap;
                        margin-top: auto;
                        width: 100%;
                    }

                    #decoration-main-page .decoration-store-price {
                        font-size: 12px;
                        font-weight: 700;
                        color: #c56783;
                        padding: 4px 10px;
                        border-radius: 999px;
                        background: rgba(255, 246, 239, 0.9);
                        border: 1px solid rgba(255, 206, 171, 0.7);
                    }

                    #decoration-main-page .decoration-store-pagination {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        margin-top: 12px;
                        flex-wrap: wrap;
                    }

                    #decoration-main-page .decoration-store-pagination-label {
                        font-size: 12px;
                        color: #b9849f;
                    }

                    #decoration-main-page .decoration-store-pagination-buttons {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 6px;
                    }

                    #decoration-main-page .decoration-store-page-btn {
                        min-width: 28px;
                        height: 28px;
                        padding: 0 8px;
                        border-radius: 999px;
                        border: 1px solid #ffd1e2;
                        background: #fff;
                        color: #b56c89;
                        font-size: 12px;
                        font-weight: 600;
                        cursor: pointer;
                    }

                    #decoration-main-page .decoration-store-page-btn.active,
                    #decoration-main-page .decoration-store-page-btn:disabled {
                        background: linear-gradient(135deg, #ffb4cf 0%, #ff95ba 100%);
                        color: #fff;
                        border-color: transparent;
                        cursor: default;
                    }

                    #decoration-main-page .decoration-store-detail {
                        position: fixed;
                        inset: 0;
                        z-index: 99999;
                        display: flex;
                        align-items: flex-end;
                        justify-content: center;
                    }

                    #decoration-main-page .decoration-store-detail-overlay {
                        position: absolute;
                        inset: 0;
                        background: rgba(77, 29, 49, 0.35);
                        backdrop-filter: blur(6px);
                        -webkit-backdrop-filter: blur(6px);
                    }

                    #decoration-main-page .decoration-store-detail-card {
                        position: relative;
                        width: min(94vw, 720px);
                        max-height: 88vh;
                        overflow-y: auto;
                        background: #fff;
                        border-radius: 24px 24px 0 0;
                        padding: 16px 18px calc(20px + var(--safe-area-inset-bottom));
                        box-shadow: 0 -12px 40px rgba(122, 61, 86, 0.25);
                        border: 1px solid rgba(255, 211, 228, 0.8);
                        animation: decorationStoreDetailUp 0.28s ease;
                    }

                    @keyframes decorationStoreDetailUp {
                        from { transform: translateY(30px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }

                    #decoration-main-page .decoration-store-detail-header {
                        display: grid;
                        grid-template-columns: auto 1fr auto;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 12px;
                    }

                    #decoration-main-page .decoration-store-detail-back {
                        border: none;
                        background: rgba(255, 236, 244, 0.9);
                        color: #b86084;
                        border-radius: 999px;
                        padding: 6px 12px;
                        font-size: 12px;
                        font-weight: 600;
                        cursor: pointer;
                    }

                    #decoration-main-page .decoration-store-detail-title {
                        text-align: center;
                        font-size: 15px;
                        font-weight: 700;
                        color: #b85c7e;
                    }

                    #decoration-main-page .decoration-store-detail-spacer {
                        width: 48px;
                    }

                    #decoration-main-page .decoration-store-detail-hero {
                        border-radius: 16px;
                        padding: 14px;
                        background: linear-gradient(135deg, rgba(255, 243, 249, 0.9), rgba(255, 234, 241, 0.8));
                        border: 1px solid rgba(255, 206, 226, 0.8);
                        margin-bottom: 12px;
                    }

                    #decoration-main-page .decoration-store-detail-name {
                        font-size: 18px;
                        font-weight: 700;
                        color: #b85c7e;
                    }

                    #decoration-main-page .decoration-store-detail-author {
                        margin-top: 6px;
                        font-size: 12px;
                        color: #a97992;
                    }

                    #decoration-main-page .decoration-store-detail-tags {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 6px;
                        margin-top: 10px;
                    }

                    #decoration-main-page .decoration-store-detail-tag {
                        padding: 4px 10px;
                        border-radius: 999px;
                        font-size: 11px;
                        font-weight: 600;
                        color: #a86482;
                        border: 1px solid var(--store-accent);
                        background: rgba(255, 255, 255, 0.9);
                    }

                    #decoration-main-page .decoration-store-detail-section {
                        margin-bottom: 12px;
                    }

                    #decoration-main-page .decoration-store-detail-label {
                        font-size: 13px;
                        font-weight: 700;
                        color: #b85c7e;
                        margin-bottom: 6px;
                    }

                    #decoration-main-page .decoration-store-detail-text {
                        font-size: 12px;
                        line-height: 1.7;
                        color: #9b6a82;
                        background: #fff6ef;
                        border: 1px dashed rgba(255, 192, 160, 0.6);
                        border-radius: 12px;
                        padding: 10px 12px;
                    }

                    #decoration-main-page .decoration-store-detail-list {
                        margin: 0;
                        padding-left: 16px;
                        color: #9b6a82;
                        font-size: 12px;
                        line-height: 1.7;
                    }

                    #decoration-main-page .decoration-store-detail-footer {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 10px;
                        padding-top: 6px;
                        border-top: 1px solid rgba(255, 210, 228, 0.7);
                    }

                    #decoration-main-page .decoration-store-detail-price {
                        font-size: 14px;
                        font-weight: 700;
                        color: #c56783;
                    }

                    #decoration-main-page .decoration-store-detail-actions {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    #decoration-main-page .decoration-store-detail-actions .decoration-btn {
                        min-height: 36px;
                        padding: 0 16px;
                        border-radius: 12px;
                    }

                    #decoration-main-page .decoration-modal-mask {
                        position: fixed;
                        inset: 0;
                        background: rgba(84, 24, 47, 0.2);
                        backdrop-filter: blur(4px);
                        -webkit-backdrop-filter: blur(4px);
                        z-index: 99999;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 14px;
                    }

                    #decoration-main-page .decoration-modal-card {
                        width: min(92vw, 320px);
                        border-radius: 16px;
                        border: 1px solid #ffd7e8;
                        background: #fff;
                        box-shadow: 0 8px 26px rgba(237, 136, 177, 0.26);
                        padding: 14px;
                    }

                    #decoration-main-page .decoration-modal-title {
                        font-size: 16px;
                        font-weight: 700;
                        color: #c95f89;
                    }

                    #decoration-main-page .decoration-modal-text {
                        margin-top: 8px;
                        font-size: 13px;
                        line-height: 1.6;
                        color: #b57b95;
                    }

                    #decoration-main-page .decoration-modal-actions {
                        margin-top: 12px;
                        display: flex;
                        justify-content: flex-end;
                        gap: 8px;
                    }

                    @media (max-width: 480px) {
                        #decoration-main-page .decoration-tab-main-content {
                            padding: 0 8px calc(82px + var(--safe-area-inset-bottom));
                        }

                        #decoration-main-page .decoration-card {
                            padding: 12px;
                            border-radius: 14px;
                        }

                        #decoration-main-page .decoration-tab-btn {
                            min-width: 58px;
                            height: 28px;
                            padding: 0 9px;
                        }

                        #decoration-main-page .decoration-font-action-grid {
                            grid-template-columns: 1fr;
                        }

                        #decoration-main-page .decoration-font-btn,
                        #decoration-main-page .decoration-font-url-btn {
                            width: 100%;
                        }

                        #decoration-main-page .decoration-bg-item-actions {
                            grid-template-columns: 1fr;
                        }

                    }
                </style>
            `;
            
            page.classList.add('open');
            
            const backBtn = page.querySelector('#decoration-main-back-btn');
            if (backBtn) {
                backBtn.onclick = () => {
                    page.classList.remove('open');
                };
            }

            const tabButtons = page.querySelectorAll('.decoration-tab-btn');
            tabButtons.forEach((btn) => {
                btn.onclick = () => switchTab(btn.dataset.tab);
            });

            switchTab(state.activeTab);

            function switchTab(tabName) {
                state.activeTab = tabName;
                if (tabName !== 'font-store') {
                    state.storeDetailId = null;
                }
                tabButtons.forEach((btn) => {
                    const active = btn.dataset.tab === tabName;
                    btn.classList.toggle('active', active);
                    btn.setAttribute('aria-selected', active ? 'true' : 'false');
                });

                page.querySelectorAll('.decoration-tab-panel').forEach((panel) => {
                    panel.classList.toggle('active', panel.dataset.panel === tabName);
                });

                renderActivePanel();
            }

            function renderActivePanel() {
                if (state.activeTab === 'font') {
                    renderFontPanel();
                    return;
                }
                if (state.activeTab === 'font-store') {
                    renderFontStorePanel();
                    return;
                }
                if (state.activeTab === 'msg') {
                    renderBackgroundPanel('msg');
                    return;
                }
                if (state.activeTab === 'friend') {
                    renderBackgroundPanel('friend');
                    return;
                }
                renderFontPanel();
            }

            function setRangeProgress(rangeEl) {
                if (!rangeEl) {
                    return;
                }
                const min = Number(rangeEl.min || 0);
                const max = Number(rangeEl.max || 100);
                const value = Number(rangeEl.value || min);
                const percent = Math.max(0, Math.min(100, ((value - min) / (max - min || 1)) * 100));
                rangeEl.style.background = `linear-gradient(90deg, #ffb8d1 0%, #ffb8d1 ${percent}%, #ffe2ee ${percent}%, #ffe2ee 100%)`;
            }

            function showDecorationDialog({ title = '提示', message = '', confirmText = '确定', cancelText = '取消', danger = false } = {}) {
                const mask = page.querySelector('#decoration-modal-mask');
                const titleEl = page.querySelector('#decoration-modal-title');
                const textEl = page.querySelector('#decoration-modal-text');
                const cancelBtn = page.querySelector('#decoration-modal-cancel');
                const confirmBtn = page.querySelector('#decoration-modal-confirm');

                if (!mask || !titleEl || !textEl || !cancelBtn || !confirmBtn) {
                    return Promise.resolve(confirm(message || title));
                }

                titleEl.textContent = title;
                textEl.textContent = message;
                cancelBtn.textContent = cancelText;
                confirmBtn.textContent = confirmText;
                confirmBtn.classList.toggle('danger', danger);
                confirmBtn.classList.toggle('primary', !danger);
                mask.classList.remove('hidden');

                return new Promise((resolve) => {
                    const close = (result) => {
                        mask.classList.add('hidden');
                        cancelBtn.onclick = null;
                        confirmBtn.onclick = null;
                        mask.onclick = null;
                        resolve(result);
                    };

                    cancelBtn.onclick = () => close(false);
                    confirmBtn.onclick = () => close(true);
                    mask.onclick = (event) => {
                        if (event.target === mask) {
                            close(false);
                        }
                    };
                });
            }

            function renderBackgroundPanel(pageType = 'msg') {
                const currentScope = pageType === 'friend' ? 'friend' : 'msg';
                const panel = page.querySelector(`[data-panel="${currentScope}"]`);
                if (!panel) {
                    return;
                }

                if (!window.MessageBackgroundManager) {
                    panel.innerHTML = `
                        <div class="decoration-card">
                            <div class="decoration-card-title">页面背景</div>
                            <div class="decoration-list-empty">背景管理模块未加载，请刷新页面后重试</div>
                        </div>
                    `;
                    return;
                }

                const manager = window.MessageBackgroundManager;
                const scopeLabel = currentScope === 'friend' ? '好友页面' : '消息页面';
                const scopeBadge = currentScope === 'friend' ? '好友' : '消息';
                const scopeHeroSubtitle = currentScope === 'friend'
                    ? '管理好友页面背景与搜索框样式'
                    : '管理消息页面背景与搜索框样式';
                const currentBackgroundLabel = currentScope === 'friend' ? '当前好友背景' : '当前消息背景';
                const emptyBackgroundText = currentScope === 'friend'
                    ? '未设置，显示默认好友背景'
                    : '未设置，显示默认消息背景';
                const backgrounds = manager
                    .getBackgrounds(currentScope)
                    .slice()
                    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                const currentBackgroundId = manager.getStoredBackgroundId(currentScope);
                const currentSearchInputStyle = manager.getSearchInputStyle(currentScope) || { color: '#ffffff', opacity: 0.6 };
                const currentBackground = currentBackgroundId
                    ? manager.getBackground(currentBackgroundId, currentScope)
                    : null;

                const backgroundsHTML = backgrounds.length > 0
                    ? backgrounds.map((background) => `
                        <div class="decoration-bg-item ${background.id === currentBackgroundId ? 'active' : ''}">
                            <div class="decoration-bg-head">
                                <div class="decoration-bg-preview" style="background-image:url('${background.imageData}')"></div>
                                <div class="decoration-grow">
                                    <div class="decoration-item-name" title="${escapeHtml(background.name)}">${escapeHtml(background.name)}</div>
                                    <div class="decoration-item-meta">${escapeHtml(background.size || '未知大小')}</div>
                                </div>
                                ${background.id === currentBackgroundId ? '<span class="decoration-inline-badge">当前</span>' : ''}
                            </div>
                            <div class="decoration-bg-item-actions">
                                <button class="decoration-btn primary decoration-bg-item-btn" data-bg-action="apply" data-bg-id="${background.id}">设为当前</button>
                                <button class="decoration-btn danger decoration-bg-item-btn" data-bg-action="delete" data-bg-id="${background.id}">删除</button>
                            </div>
                        </div>
                    `).join('')
                    : '<div class="decoration-list-empty">当前页面暂无背景图，先上传一张吧</div>';

                panel.innerHTML = `
                    <div class="decoration-card decoration-bg-hero">
                        <div class="decoration-bg-hero-head">
                            <div>
                                <div class="decoration-bg-hero-title">${scopeLabel}装扮</div>
                                <div class="decoration-bg-hero-sub">${scopeHeroSubtitle}</div>
                            </div>
                            <span class="decoration-inline-badge">${scopeBadge}</span>
                        </div>

                        <div class="decoration-bg-current">
                            ${currentBackground ? `
                                <div class="decoration-bg-current-preview" style="background-image:url('${currentBackground.imageData}')"></div>
                                <div class="decoration-grow">
                                    <div class="decoration-font-current-label">${currentBackgroundLabel}</div>
                                    <div class="decoration-font-current-name" title="${escapeHtml(currentBackground.name)}">${escapeHtml(currentBackground.name)}</div>
                                    <div class="decoration-item-meta">${escapeHtml(currentBackground.size || '未知大小')}</div>
                                </div>
                            ` : `
                                <div class="decoration-grow">
                                    <div class="decoration-font-current-label">${currentBackgroundLabel}</div>
                                    <div class="decoration-font-current-name">${emptyBackgroundText}</div>
                                </div>
                            `}
                        </div>
                    </div>

                    <div class="decoration-card">
                        <div class="decoration-field">
                            <div class="decoration-label">
                                <span>搜索框背景色</span>
                            </div>
                            <input type="color" class="decoration-color" id="decoration-search-bg-color-${currentScope}" value="${currentSearchInputStyle.color}">
                        </div>

                        <div class="decoration-field">
                            <div class="decoration-label">
                                <span>搜索框透明度</span>
                                <span id="decoration-search-opacity-value-${currentScope}">${Math.round(Number(currentSearchInputStyle.opacity) * 100)}%</span>
                            </div>
                            <input type="range" class="decoration-range" id="decoration-search-opacity-${currentScope}" min="0" max="1" step="0.01" value="${currentSearchInputStyle.opacity}">
                        </div>

                        <div class="decoration-upload" id="decoration-bg-upload-area-${currentScope}">
                            <div>点击上传 ${scopeLabel} 背景图</div>
                            <div class="decoration-upload-hint">支持 JPG/PNG/GIF，大小不超过 10MB</div>
                            <input type="file" id="decoration-bg-file-input-${currentScope}" accept="image/*" style="display:none;">
                        </div>
                    </div>

                    <div class="decoration-card">
                        <div class="decoration-font-list-title">
                            <span>${scopeLabel}背景库 (${backgrounds.length})</span>
                            <span>${currentBackground ? `${scopeBadge}页已设置` : `${scopeBadge}页未设置`}</span>
                        </div>
                        ${backgroundsHTML}

                        <div class="decoration-bg-main-actions">
                            <button class="decoration-btn danger decoration-bg-main-btn" id="decoration-clear-current-bg-${currentScope}">清除当前页面背景</button>
                        </div>
                    </div>
                `;

                const colorInput = panel.querySelector(`#decoration-search-bg-color-${currentScope}`);
                const opacityInput = panel.querySelector(`#decoration-search-opacity-${currentScope}`);
                const opacityValue = panel.querySelector(`#decoration-search-opacity-value-${currentScope}`);
                let saveStyleTimer = null;

                const queueSaveSearchStyle = () => {
                    if (!colorInput || !opacityInput || !opacityValue) {
                        return;
                    }
                    const opacity = Number(opacityInput.value);
                    opacityValue.textContent = `${Math.round(opacity * 100)}%`;

                    clearTimeout(saveStyleTimer);
                    saveStyleTimer = setTimeout(() => {
                        manager.saveSearchInputStyle(currentScope, {
                            color: colorInput.value,
                            opacity
                        }).catch((error) => {
                            console.error('保存搜索框样式失败:', error);
                        });
                    }, 120);
                };

                if (colorInput) {
                    colorInput.oninput = queueSaveSearchStyle;
                }
                if (opacityInput) {
                    setRangeProgress(opacityInput);
                    opacityInput.oninput = () => {
                        setRangeProgress(opacityInput);
                        queueSaveSearchStyle();
                    };
                }

                const uploadArea = panel.querySelector(`#decoration-bg-upload-area-${currentScope}`);
                const fileInput = panel.querySelector(`#decoration-bg-file-input-${currentScope}`);
                if (uploadArea && fileInput) {
                    uploadArea.onclick = () => fileInput.click();
                    uploadArea.ondragover = (event) => {
                        event.preventDefault();
                    };
                    uploadArea.ondrop = (event) => {
                        event.preventDefault();
                        const files = event.dataTransfer && event.dataTransfer.files;
                        if (files && files[0]) {
                            handleBackgroundUpload(files[0], currentScope);
                        }
                    };
                    fileInput.onchange = () => {
                        if (fileInput.files && fileInput.files[0]) {
                            handleBackgroundUpload(fileInput.files[0], currentScope);
                        }
                    };
                }

                panel.querySelectorAll('[data-bg-action]').forEach((button) => {
                    button.onclick = async () => {
                        const action = button.dataset.bgAction;
                        const backgroundId = button.dataset.bgId;
                        if (!backgroundId) {
                            return;
                        }

                        if (action === 'apply') {
                            const background = manager.getBackground(backgroundId, currentScope);
                            if (!background) {
                                return;
                            }
                            manager.applyBackground(background, currentScope);
                            await manager.saveCurrentBackgroundId(backgroundId, currentScope);
                            showToast('背景已应用');
                            renderBackgroundPanel(currentScope);
                            return;
                        }

                        if (action === 'delete') {
                            const confirmed = await showDecorationDialog({
                                title: '删除背景',
                                message: '确定删除这张背景图吗？删除后不可恢复。',
                                confirmText: '删除',
                                cancelText: '取消',
                                danger: true
                            });
                            if (!confirmed) {
                                return;
                            }
                            await manager.deleteBackground(backgroundId, currentScope);
                            showToast('背景已删除');
                            renderBackgroundPanel(currentScope);
                        }
                    };
                });

                const clearButton = panel.querySelector(`#decoration-clear-current-bg-${currentScope}`);
                if (clearButton) {
                    clearButton.onclick = async () => {
                        const confirmed = await showDecorationDialog({
                            title: '清除背景',
                            message: `确定清除${scopeLabel}当前已应用背景吗？`,
                            confirmText: '清除',
                            cancelText: '保留',
                            danger: true
                        });
                        if (!confirmed) {
                            return;
                        }
                        await manager.saveCurrentBackgroundId(null, currentScope);
                        manager.applyCurrentTabBackground();
                        showToast('当前页面背景已清除');
                        renderBackgroundPanel(currentScope);
                    };
                }
            }

            function renderFontPanel() {
                const panel = page.querySelector('[data-panel="font"]');
                if (!panel) {
                    return;
                }

                if (!window.FontManager) {
                    panel.innerHTML = `
                        <div class="decoration-card">
                            <div class="decoration-card-title">字体管理</div>
                            <div class="decoration-list-empty">字体管理模块未加载，请刷新页面后重试</div>
                        </div>
                    `;
                    return;
                }

                const manager = window.FontManager;
                const fonts = manager
                    .getAllFonts()
                    .slice()
                    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                const activeFont = manager.getActiveFont();

                const fontsHTML = fonts.length > 0
                    ? fonts.map((font) => {
                        const fontName = String(font.name || '未命名字体').replace(/["'\\]/g, '');
                        const isActive = font.id === manager.currentFontId;
                        return `
                            <div class="decoration-font-item">
                                <div class="decoration-bg-head">
                                    <div class="decoration-grow">
                                        <div class="decoration-item-name" title="${escapeHtml(font.name)}">${escapeHtml(font.name)}</div>
                                        <div class="decoration-item-meta">${new Date(font.createdAt).toLocaleDateString('zh-CN')}</div>
                                    </div>
                                    ${isActive ? '<span class="decoration-inline-badge">使用中</span>' : ''}
                                </div>
                                <div class="decoration-font-preview" style="font-family:'${fontName}',sans-serif;">
                                    字体效果预览：你好，世界！ 0123456789 ABC
                                </div>
                                <div class="decoration-action-row" style="margin-top:8px;">
                                    ${isActive ? '' : `<button class="decoration-btn primary" data-font-action="apply" data-font-id="${font.id}">应用</button>`}
                                    <button class="decoration-btn danger" data-font-action="delete" data-font-id="${font.id}">删除</button>
                                </div>
                            </div>
                        `;
                    }).join('')
                    : '<div class="decoration-list-empty">暂无字体，请导入 TTF/OTF 字体文件</div>';

                panel.innerHTML = `
                    <div class="decoration-card decoration-font-hero">
                        <div class="decoration-font-hero-head">
                            <div>
                                <div class="decoration-font-hero-title">字体</div>
                                <div class="decoration-font-hero-sub">全局字体设置</div>
                            </div>
                            <span class="decoration-inline-badge">喵机1号</span>
                        </div>

                        <div class="decoration-font-current">
                            <div class="decoration-font-current-label">当前字体</div>
                            <div class="decoration-font-current-name">${activeFont ? escapeHtml(activeFont.name) : '系统默认字体'}</div>
                        </div>
                    </div>

                    <div class="decoration-card">
                        <div class="decoration-field">
                            <div class="decoration-label"><span>本地字体文件</span></div>
                            <div class="decoration-font-action-grid">
                                <button class="decoration-btn primary decoration-font-btn" id="decoration-font-import-trigger">导入TTF/OTF</button>
                                <button class="decoration-btn decoration-font-btn" id="decoration-font-reset">恢复默认</button>
                            </div>
                            <input type="file" id="decoration-font-file-input" accept=".ttf,.otf" multiple style="display:none;">
                        </div>

                        <div class="decoration-field">
                            <div class="decoration-label"><span>在线导入</span></div>
                            <div class="decoration-font-url-wrap">
                                <input class="decoration-input" id="decoration-font-url" placeholder="字体URL（TTF/OTF）">
                                <input class="decoration-input" id="decoration-font-url-name" placeholder="字体名称（必填）">
                                <button class="decoration-btn decoration-font-url-btn" id="decoration-font-import-url">URL导入</button>
                            </div>
                        </div>
                    </div>

                    <div class="decoration-card">
                        <div class="decoration-font-list-title">
                            <span>字体库 (${fonts.length})</span>
                            <span>${activeFont ? '已应用 1 款' : '当前未应用自定义字体'}</span>
                        </div>
                        ${fontsHTML}
                    </div>
                `;

                const importTrigger = panel.querySelector('#decoration-font-import-trigger');
                const fileInput = panel.querySelector('#decoration-font-file-input');
                if (importTrigger && fileInput) {
                    importTrigger.onclick = () => fileInput.click();
                    fileInput.onchange = async () => {
                        if (!fileInput.files || fileInput.files.length === 0) {
                            return;
                        }
                        let success = 0;
                        let failed = 0;
                        for (const file of Array.from(fileInput.files)) {
                            try {
                                await manager.importFontFile(file);
                                success += 1;
                            } catch (error) {
                                console.error('导入字体失败:', error);
                                failed += 1;
                            }
                        }
                        showToast(`字体导入完成：成功${success}${failed > 0 ? `，失败${failed}` : ''}`);
                        renderFontPanel();
                    };
                }

                const importUrlButton = panel.querySelector('#decoration-font-import-url');
                if (importUrlButton) {
                    importUrlButton.onclick = async () => {
                        const urlInput = panel.querySelector('#decoration-font-url');
                        const nameInput = panel.querySelector('#decoration-font-url-name');
                        const url = urlInput ? urlInput.value.trim() : '';
                        const name = nameInput ? nameInput.value.trim() : '';
                        if (!url || !name) {
                            showToast('请填写字体URL和字体名称');
                            return;
                        }
                        try {
                            await manager.importFontFromURL(url, name);
                            showToast('在线字体导入成功');
                            renderFontPanel();
                        } catch (error) {
                            console.error('在线导入字体失败:', error);
                            showToast('在线导入失败');
                        }
                    };
                }

                const resetButton = panel.querySelector('#decoration-font-reset');
                if (resetButton) {
                    resetButton.onclick = async () => {
                        const confirmed = await showDecorationDialog({
                            title: '恢复默认字体',
                            message: '确定取消当前字体并恢复默认吗？',
                            confirmText: '恢复',
                            cancelText: '取消'
                        });
                        if (!confirmed) {
                            return;
                        }
                        manager.currentFontId = null;
                        localStorage.removeItem('activeFontId');
                        localStorage.removeItem('activeFontName');
                        manager.removeGlobalFont();
                        const syncTasks = [];
                        manager.fonts.forEach((font) => {
                            if (font.isActive) {
                                font.isActive = false;
                                syncTasks.push(manager.saveFont(font).catch(() => {}));
                            }
                        });
                        if (syncTasks.length > 0) {
                            await Promise.all(syncTasks);
                        }
                        showToast('已恢复默认字体');
                        renderFontPanel();
                    };
                }

                panel.querySelectorAll('[data-font-action]').forEach((button) => {
                    button.onclick = async () => {
                        const action = button.dataset.fontAction;
                        const fontId = button.dataset.fontId;
                        if (!fontId) {
                            return;
                        }

                        if (action === 'apply') {
                            try {
                                await manager.applyFont(fontId);
                                showToast('字体已应用');
                                renderFontPanel();
                            } catch (error) {
                                console.error('应用字体失败:', error);
                                showToast('字体应用失败');
                            }
                            return;
                        }

                        if (action === 'delete') {
                            const confirmed = await showDecorationDialog({
                                title: '删除字体',
                                message: '确定删除这个字体吗？删除后不可恢复。',
                                confirmText: '删除',
                                cancelText: '取消',
                                danger: true
                            });
                            if (!confirmed) {
                                return;
                            }
                            try {
                                await manager.deleteFont(fontId);
                                showToast('字体已删除');
                                renderFontPanel();
                            } catch (error) {
                                console.error('删除字体失败:', error);
                                showToast('删除字体失败');
                            }
                        }
                    };
                });
            }

            function renderFontStorePanel() {
                const panel = page.querySelector('[data-panel="font-store"]');
                if (!panel) {
                    return;
                }

                const manager = window.FontManager;
                const storeState = getFontStoreState();
                const ownedSet = new Set((storeState.owned || []).map(String));
                const activeFont = manager ? manager.getActiveFont() : null;
                const currentCoins = Number(AppState.user && AppState.user.coins || 0);
                const storeRowsPerPage = 5;
                const storeColumns = 3;
                const storePageSize = storeRowsPerPage * storeColumns;
                const totalPages = Math.max(1, Math.ceil(fontStoreItems.length / storePageSize));
                const currentPage = Math.min(Math.max(Number(state.storePage || 1), 1), totalPages);
                if (state.storePage !== currentPage) {
                    state.storePage = currentPage;
                }
                const pageStartIndex = (currentPage - 1) * storePageSize;
                const pageItems = fontStoreItems.slice(pageStartIndex, pageStartIndex + storePageSize);

                const ownedCount = fontStoreItems.filter((item) => {
                    const installedFont = getInstalledFontForItem(item, manager);
                    return ownedSet.has(item.id) || !!installedFont;
                }).length;

                const cardsHTML = pageItems.map((item) => {
                    const installedFont = getInstalledFontForItem(item, manager);
                    const isInstalled = !!installedFont;
                    const isOwned = ownedSet.has(item.id);
                    const isActive = isActiveFontForItem(item, activeFont);
                    const priceText = (isOwned || isInstalled) ? '已拥有' : `${item.price} 喵币`;
                    const accent = item.accent || '#ffb4cf';
                    return `
                        <div class="decoration-store-card" data-store-card="${item.id}" style="--store-accent: ${accent};" role="button" tabindex="0" aria-label="查看${escapeHtml(item.name)}详情">
                            <div class="decoration-store-card-head">
                                <div class="decoration-store-name">${escapeHtml(item.name)}</div>
                            </div>
                            <div class="decoration-store-author">${escapeHtml(item.author)}</div>
                            <div class="decoration-store-actions">
                                <div class="decoration-store-price">${priceText}</div>
                            </div>
                        </div>
                    `;
                }).join('');

                const paginationButtons = Array.from({ length: totalPages }, (_, index) => {
                    const pageNumber = index + 1;
                    const isActive = pageNumber === currentPage;
                    return `
                        <button class="decoration-store-page-btn${isActive ? ' active' : ''}" data-store-page="${pageNumber}" ${isActive ? 'aria-current="page" disabled' : ''} aria-label="第${pageNumber}页">${pageNumber}</button>
                    `;
                }).join('');

                const paginationHTML = `
                    <div class="decoration-store-pagination">
                        <span class="decoration-store-pagination-label">页面</span>
                        <div class="decoration-store-pagination-buttons">
                            ${paginationButtons}
                        </div>
                    </div>
                `;

                panel.innerHTML = `
                    <div class="decoration-card decoration-store-hero">
                        <div class="decoration-store-hero-head">
                            <div>
                                <div class="decoration-store-hero-title">虚拟字体商店</div>
                                <div class="decoration-store-hero-sub">购买后会自动加入字体库，随时可应用</div>
                            </div>
                            <span class="decoration-inline-badge">喵币支付</span>
                        </div>
                        <div class="decoration-store-balance">
                            <div>
                                <div class="decoration-store-balance-label">当前余额</div>
                                <div class="decoration-store-balance-value">${currentCoins}</div>
                            </div>
                            <button class="decoration-btn" id="decoration-font-store-recharge">去钱包</button>
                        </div>
                        <div class="decoration-store-stats">
                            <span>已拥有 ${ownedCount} / ${fontStoreItems.length}</span>
                            <span>字体库持续更新中</span>
                        </div>
                    </div>

                    <div class="decoration-card">
                        <div class="decoration-store-grid">
                            ${cardsHTML}
                        </div>
                        ${paginationHTML}
                    </div>
                `;

                const openFontStoreDetail = (itemId) => {
                    state.storeDetailId = itemId;
                    renderFontStorePanel();
                };

                const closeFontStoreDetail = () => {
                    state.storeDetailId = null;
                    renderFontStorePanel();
                };

                if (state.storeDetailId) {
                    const detailItem = fontStoreItems.find((item) => item.id === state.storeDetailId);
                    if (detailItem) {
                        const detailIndex = Math.max(0, fontStoreItems.indexOf(detailItem));
                        const detailMeta = getStoreDetailMeta(detailItem, detailIndex);
                        const detailFormat = getFontFormatLabel(detailItem.url);
                        const detailAccent = detailItem.accent || '#ffb4cf';
                        const detailInstalled = getInstalledFontForItem(detailItem, manager);
                        const detailIsInstalled = !!detailInstalled;
                        const detailIsOwned = ownedSet.has(detailItem.id);
                        const detailIsActive = isActiveFontForItem(detailItem, activeFont);
                        const detailAction = detailIsActive ? 'none' : (detailIsInstalled ? 'apply' : (detailIsOwned ? 'install' : 'buy'));
                        const detailActionLabel = detailIsActive ? '使用中' : (detailIsInstalled ? '应用' : (detailIsOwned ? '下载' : '购买'));
                        const detailStatus = detailIsActive ? '使用中' : (detailIsInstalled ? '已安装' : (detailIsOwned ? '已购' : '未购买'));
                        const detailStatusLabel = (detailStatus === '未购买' || detailStatus === '已购') ? '' : detailStatus;
                        const detailStatusBadge = detailStatusLabel ? `<span class="decoration-inline-badge">${detailStatusLabel}</span>` : '';
                        const detailPrice = (detailIsOwned || detailIsInstalled) ? '已拥有' : `${detailItem.price} 喵币`;
                        const detailBadge = detailItem.badge ? `<span class="decoration-store-detail-tag">${escapeHtml(detailItem.badge)}</span>` : '';
                        const detailBenefits = storeDetailBenefits.map(item => `<li>${escapeHtml(item)}</li>`).join('');

                        panel.insertAdjacentHTML('beforeend', `
                            <div class="decoration-store-detail" id="decoration-font-store-detail">
                                <div class="decoration-store-detail-overlay" data-store-detail-close="true"></div>
                                <div class="decoration-store-detail-card" style="--store-accent: ${detailAccent};">
                                    <div class="decoration-store-detail-header">
                                        <button class="decoration-store-detail-back" data-store-detail-close="true">返回</button>
                                        <div class="decoration-store-detail-title">字体详情</div>
                                        <div class="decoration-store-detail-spacer"></div>
                                    </div>

                                    <div class="decoration-store-detail-hero">
                                        <div class="decoration-store-detail-name">${escapeHtml(detailItem.name)}</div>
                                        <div class="decoration-store-detail-author">贡献者：${escapeHtml(detailItem.author)}</div>
                                        <div class="decoration-store-detail-tags">
                                            ${detailBadge}
                                            <span class="decoration-store-detail-tag">${detailFormat}</span>
                                            <span class="decoration-store-detail-tag">${escapeHtml(detailMeta.mood)}</span>
                                            ${detailStatusBadge}
                                        </div>
                                    </div>

                                    <div class="decoration-store-detail-section">
                                        <div class="decoration-store-detail-label">评语</div>
                                        <div class="decoration-store-detail-text">${escapeHtml(detailItem.quote)}</div>
                                    </div>

                                    <div class="decoration-store-detail-section">
                                        <div class="decoration-store-detail-label">设计故事</div>
                                        <div class="decoration-store-detail-text">${escapeHtml(detailMeta.story)}</div>
                                    </div>

                                    <div class="decoration-store-detail-section">
                                        <div class="decoration-store-detail-label">购买权益</div>
                                        <ul class="decoration-store-detail-list">
                                            ${detailBenefits}
                                        </ul>
                                    </div>

                                    <div class="decoration-store-detail-footer">
                                        <div class="decoration-store-detail-price">${detailPrice}</div>
                                        <div class="decoration-store-detail-actions">
                                            <button class="decoration-btn primary" data-store-action="${detailAction}" data-store-id="${detailItem.id}" ${detailAction === 'none' ? 'disabled' : ''}>${detailActionLabel}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `);

                        const detailCloseEls = panel.querySelectorAll('[data-store-detail-close="true"]');
                        detailCloseEls.forEach((el) => {
                            el.onclick = (event) => {
                                event.stopPropagation();
                                closeFontStoreDetail();
                            };
                        });
                    } else {
                        state.storeDetailId = null;
                    }
                }

                const walletBtn = panel.querySelector('#decoration-font-store-recharge');
                if (walletBtn) {
                    walletBtn.onclick = () => {
                        if (typeof window.openWalletPage === 'function') {
                            page.classList.remove('open');
                            window.openWalletPage();
                        } else {
                            showToast('钱包模块未加载');
                        }
                    };
                }

                panel.querySelectorAll('[data-store-card]').forEach((card) => {
                    card.onclick = (event) => {
                        if (event.target.closest('[data-store-action]')) {
                            return;
                        }
                        const itemId = card.dataset.storeCard;
                        if (itemId) {
                            openFontStoreDetail(itemId);
                        }
                    };
                });

                panel.querySelectorAll('[data-store-page]').forEach((button) => {
                    button.onclick = () => {
                        const pageValue = Number(button.dataset.storePage);
                        if (!Number.isFinite(pageValue) || pageValue < 1 || pageValue === state.storePage) {
                            return;
                        }
                        state.storePage = pageValue;
                        renderFontStorePanel();
                    };
                });

                const installFont = async (item) => {
                    if (!manager) {
                        showToast('字体管理模块未加载');
                        return null;
                    }
                    const existingFont = getInstalledFontForItem(item, manager);
                    if (existingFont) {
                        return existingFont;
                    }
                    if (typeof showLoadingOverlay === 'function') {
                        showLoadingOverlay('正在下载字体...');
                    }
                    try {
                        const fontData = await manager.importFontFromURL(item.url, item.name, {
                            storeId: item.id,
                            author: item.author,
                            source: 'store'
                        });
                        showToast('字体已加入字体库');
                        return fontData;
                    } catch (error) {
                        console.error('字体下载失败:', error);
                        showToast('字体下载失败');
                        return null;
                    } finally {
                        if (typeof hideLoadingOverlay === 'function') {
                            hideLoadingOverlay();
                        }
                    }
                };

                const purchaseFont = async (item) => {
                    const cost = Number(item.price || 0);
                    const balance = Number(AppState.user && AppState.user.coins || 0);
                    if (balance < cost) {
                        showToast('喵币余额不足，请先充值');
                        return;
                    }

                    const confirmed = await showDecorationDialog({
                        title: '购买字体',
                        message: `确认花费 ${cost} 喵币购买「${item.name}」吗？`,
                        confirmText: '购买',
                        cancelText: '取消'
                    });
                    if (!confirmed) {
                        return;
                    }

                    AppState.user.coins = balance - cost;
                    AppState.walletHistory = Array.isArray(AppState.walletHistory) ? AppState.walletHistory : [];
                    AppState.walletHistory.push({
                        amount: -cost,
                        type: `字体购买·${item.name}`,
                        time: new Date().toISOString()
                    });

                    if (!storeState.owned.includes(item.id)) {
                        storeState.owned.push(item.id);
                    }
                    saveToStorage();

                    const installed = await installFont(item);
                    if (installed) {
                        showToast('购买成功，字体已加入库');
                    } else {
                        showToast('购买成功，可稍后下载字体');
                    }
                    renderFontStorePanel();
                };

                panel.querySelectorAll('[data-store-action]').forEach((button) => {
                    button.onclick = async (event) => {
                        event.stopPropagation();
                        const action = button.dataset.storeAction;
                        const itemId = button.dataset.storeId;
                        const item = fontStoreItems.find(entry => entry.id === itemId);
                        if (!item || action === 'none') {
                            return;
                        }

                        if (action === 'buy') {
                            await purchaseFont(item);
                            return;
                        }

                        if (action === 'install') {
                            const installed = await installFont(item);
                            if (installed) {
                                renderFontStorePanel();
                            }
                            return;
                        }

                        if (action === 'apply') {
                            if (!manager) {
                                showToast('字体管理模块未加载');
                                return;
                            }
                            const installedFont = getInstalledFontForItem(item, manager);
                            if (!installedFont) {
                                showToast('请先下载字体');
                                return;
                            }
                            try {
                                await manager.applyFont(installedFont.id);
                                showToast('字体已应用');
                                renderFontStorePanel();
                                if (state.activeTab !== 'font') {
                                    renderFontPanel();
                                }
                            } catch (error) {
                                console.error('应用字体失败:', error);
                                showToast('字体应用失败');
                            }
                        }
                    };
                });

            }

            function handleBackgroundUpload(file, pageType = 'msg') {
                if (!window.MessageBackgroundManager) {
                    return;
                }

                if (!file || !file.type.startsWith('image/')) {
                    showToast('请选择图片文件');
                    return;
                }

                if (file.size > 10 * 1024 * 1024) {
                    showToast('图片大小不能超过10MB');
                    return;
                }

                const manager = window.MessageBackgroundManager;
                const reader = new FileReader();

                reader.onload = async (event) => {
                    const backgroundData = {
                        id: manager.generateId(),
                        name: file.name,
                        size: formatFileSize(file.size),
                        imageData: event.target.result,
                        createdAt: new Date().toISOString()
                    };

                    const currentScope = pageType === 'friend' ? 'friend' : 'msg';

                    try {
                        await manager.saveBackground(backgroundData, currentScope);
                        manager.applyBackground(backgroundData, currentScope);
                        await manager.saveCurrentBackgroundId(backgroundData.id, currentScope);
                        showToast('背景上传并应用成功');
                        renderBackgroundPanel(currentScope);
                    } catch (error) {
                        console.error('上传背景失败:', error);
                        showToast('保存背景图失败');
                    }
                };

                reader.onerror = () => {
                    showToast('读取图片失败');
                };

                reader.readAsDataURL(file);
            }

            function formatFileSize(bytes) {
                if (!bytes) {
                    return '0 B';
                }
                const units = ['B', 'KB', 'MB', 'GB'];
                let size = bytes;
                let unitIndex = 0;
                while (size >= 1024 && unitIndex < units.length - 1) {
                    size /= 1024;
                    unitIndex += 1;
                }
                return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
            }

            function escapeHtml(text) {
                return String(text || '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

        }
        
        // 打开消息背景管理器
        function openMessageBackgroundManager(pageType = 'msg') {
            openDecorationPage(pageType === 'friend' ? 'friend' : 'msg');
        }

        // 检查并执行自动总结
        function checkAndAutoSummarize(convId) {
            // 检查是否启用了自动总结
            if (!AppState.apiSettings.summaryEnabled) return;
            if (window.CharacterSettingsManager && window.CharacterSettingsManager.summaryInProgress) return;
            
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
        window.showToast = showToast;
        window.saveToStorage = saveToStorage;
        window.saveToIndexDB = saveToIndexDB;
        window.getAppState = () => AppState;
        window.AppState = AppState;
        window.getConversationState = getConversationState;
        window.appendAssistantMessage = appendAssistantMessage;
        window.setLoadingStatus = setLoadingStatus;
        window.replaceNamePlaceholders = replaceNamePlaceholders;
        window.extractGenderInfo = extractGenderInfo;
        window.getEmojiInstructions = getEmojiInstructions;
        window.getConversationDisplayName = getConversationDisplayName;
        window.addNicknameChangeNotice = addNicknameChangeNotice;
        window.renderChatMessages = renderChatMessages;
        window.renderConversations = renderConversations;
        
        // 暴露多选相关函数到 window 对象
        window.toggleMessageSelection = toggleMessageSelection;
        window.enterMessageMultiSelect = enterMessageMultiSelect;
        window.exitMultiSelectMode = exitMultiSelectMode;
        window.selectAllMessages = selectAllMessages;
        window.deleteSelectedMessages = deleteSelectedMessages;
        window.forwardSelectedMessages = forwardSelectedMessages;
        
        // 暴露消息菜单相关函数到 window 对象
        window.showMessageContextMenu = showMessageContextMenu;
        window.closeMessageContextMenu = closeMessageContextMenu;
        window.endListenTogetherAndMarkClosed = endListenTogetherAndMarkClosed;        
        // 检查消息背景管理器是否加载
        console.log('📝 app.js 初始化完成，检查消息背景管理器...');
        setTimeout(() => {
            console.log('✅ MessageBackgroundManager:', !!window.MessageBackgroundManager);
            console.log('✅ MessageBackgroundManagerUI:', !!window.MessageBackgroundManagerUI);
        }, 1000);
