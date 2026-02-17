/**
 * 主API管理器 - 线上模式
 * 负责处理所有主API相关的调用和配置
 */

const MainAPIManager = {
    // 初始化
    init: function(appState, toastFunc, saveFunc, showLoadingFunc, hideLoadingFunc) {
        this.AppState = appState;
        this.showToast = toastFunc;
        this.saveToStorage = saveFunc;
        this.showLoadingOverlay = showLoadingFunc;
        this.hideLoadingOverlay = hideLoadingFunc;
        this.currentApiCallRound = null;
        console.log('✅ 主API管理器(线上模式)已初始化');
    },

    // ========== Token 估算函数 ==========
    
    /**
     * 估算文本的token数量
     * 使用简单的启发式方法：中文字符约1.5 tokens，英文单词约1.3 tokens
     */
    estimateTokenCount: function(text) {
        if (!text) return 0;
        
        // 统计中文字符数
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        
        // 统计英文单词数（简单按空格分割）
        const englishWords = text.replace(/[\u4e00-\u9fa5]/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
        
        // 估算：中文字符 * 1.5 + 英文单词 * 1.3
        return Math.ceil(chineseChars * 1.5 + englishWords * 1.3);
    },
    
    /**
     * 计算消息列表的总token数
     */
    calculateMessagesTokenCount: function(messages) {
        let totalTokens = 0;
        
        messages.forEach(msg => {
            // 角色标记的开销（约4 tokens per message）
            totalTokens += 4;
            
            if (typeof msg.content === 'string') {
                totalTokens += this.estimateTokenCount(msg.content);
            } else if (Array.isArray(msg.content)) {
                // 处理包含图片的消息
                msg.content.forEach(item => {
                    if (item.type === 'text') {
                        totalTokens += this.estimateTokenCount(item.text);
                    } else if (item.type === 'image_url') {
                        // 图片大约消耗 85-170 tokens，取中间值
                        totalTokens += 128;
                    }
                });
            } else {
                // 处理其他类型的消息（语音、位置、表情包等）
                // 这些消息的 content 可能不是字符串也不是数组
                // 给一个估算值来代表这类消息的 token 消耗
                totalTokens += 20;
            }
        });
        
        // 添加对话的固定开销
        totalTokens += 3;
        
        return totalTokens;
    },
    
    /**
     * 获取指定对话的token统计信息
     */
    getConversationTokenStats: function(convId) {
        const messages = this.collectConversationForApi(convId);
        const totalTokens = this.calculateMessagesTokenCount(messages);
        
        return {
            totalTokens: totalTokens,
            messageCount: messages.length,
            formattedTokens: totalTokens.toLocaleString('zh-CN')
        };
    },
    
    // ========== 线上模式 - 主API调用核心函数 ==========
    
    /**
     * 验证API配置是否完整
     * 仅在准备实际API请求时调用，不应在UI交互中调用
     * @returns {boolean} 配置是否有效
     */
    validateApiConfiguration: function() {
        const api = this.AppState.apiSettings || {};
        if (!api.endpoint || !api.selectedModel) {
            return false;
        }
        return true;
    },

    /**
     * 调用主API进行对话
     */
    callApiWithConversation: async function() {
        if (!this.AppState.currentChat) {
            this.showToast('请先打开或创建一个聊天会话,然后双击头像触发。');
            return;
        }

        const convId = this.AppState.currentChat.id;
        const convState = getConversationState(convId);
        
        // 检查该对话的文字聊天是否已在进行API调用
        // 注意：语音通话API使用独立的锁 isVoiceCallApiCalling，不影响文字聊天
        if (convState.isApiCalling) {
            this.showToast('正在等待上一次回复完成...');
            return;
        }

        // 生成新的API调用回合ID
        this.currentApiCallRound = 'round_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        currentApiCallRound = this.currentApiCallRound; // 同步到全局

        // 获取 API 设置（提前到使用前）
        const api = this.AppState.apiSettings || {};

        // 注册到后台保活系统
        if (window.BackgroundKeepAlive) {
            window.BackgroundKeepAlive.registerApiCall(this.currentApiCallRound, {
                convId: convId,
                type: 'chat',
                endpoint: api.endpoint,
                model: api.selectedModel
            });
        }

        // 标记该对话正在进行API调用
        convState.isApiCalling = true;
        convState.isTyping = true;

        // 标记用户消息已被AI读取
        const convMessages = this.AppState.messages?.[convId] || [];
        let updatedReadStatus = false;
        convMessages.forEach(msg => {
            const isUserMsg = msg && (msg.type === 'sent' || msg.sender === 'sent');
            if (isUserMsg && msg.readByAI !== true) {
                msg.readByAI = true;
                updatedReadStatus = true;
            }
        });
        if (updatedReadStatus) {
            this.saveToStorage();
            if (this.AppState.currentChat && this.AppState.currentChat.id === convId && window.renderChatMessages) {
                window.renderChatMessages(true);
            }
        }
        
        setLoadingStatus(true);
        
        // 只在当前对话仍打开时显示打字指示器
        const updateTypingStatus = () => {
            if (this.AppState.currentChat && this.AppState.currentChat.id === convId) {
                const indicator = document.getElementById('chat-typing-indicator');
                if (indicator) indicator.style.display = 'flex';
            }
        };
        updateTypingStatus();

        // 使用 APIUtils 规范化端点
        const baseEndpoint = window.APIUtils.normalizeEndpoint(api.endpoint);
        const apiKey = api.apiKey || '';
        const messages = this.collectConversationForApi(convId);
        
        // 检查是否正在与当前角色进行语音通话，如果是则注入通话上下文
        if (window.VoiceCallSystem && window.VoiceCallSystem.isInCall()) {
            const currentCallerId = window.VoiceCallSystem.getCurrentCallerId();
            if (currentCallerId === convId) {
                // 正在与当前角色通话中，注入通话上下文
                const callConversation = window.VoiceCallSystem.getCurrentCallConversation();
                if (callConversation && callConversation.length > 0) {
                    console.log('📞 检测到正在进行语音通话，注入通话上下文');
                    
                    // 构建通话上下文摘要
                    const callContext = callConversation.map(msg => {
                        const role = msg.sender === 'user' ? '用户' : '角色';
                        return `${role}: ${msg.text}`;
                    }).join('\n');
                    
                    // 在system消息之后添加通话上下文
                    const contextMessage = {
                        role: 'system',
                        content: `【当前通话状态】你正在与用户进行语音通话，以下是通话中的最近对话内容（请作为重要上下文参考）：\n\n${callContext}\n\n请在回复时考虑通话中的对话内容，保持话题的连贯性。`
                    };
                    
                    // 找到最后一个system消息的位置，在其后插入
                    let lastSystemIndex = -1;
                    for (let i = messages.length - 1; i >= 0; i--) {
                        if (messages[i].role === 'system') {
                            lastSystemIndex = i;
                            break;
                        }
                    }
                    
                    if (lastSystemIndex >= 0) {
                        messages.splice(lastSystemIndex + 1, 0, contextMessage);
                    } else {
                        // 如果没有system消息，添加到开头
                        messages.unshift(contextMessage);
                    }
                    
                    console.log('✅ 语音通话上下文已注入，共', callConversation.length, '条对话');
                }
            }
        }
        
        // 检查是否正在与当前角色进行视频通话，如果是则注入通话上下文
        if (window.VideoCallSystem && window.VideoCallSystem.isInCall()) {
            const currentCallerId = window.VideoCallSystem.getCurrentCallerId();
            if (currentCallerId === convId) {
                // 正在与当前角色视频通话中，注入通话上下文
                const callConversation = window.VideoCallSystem.getCurrentCallConversation();
                if (callConversation && callConversation.length > 0) {
                    console.log('📹 检测到正在进行视频通话，注入通话上下文');
                    
                    // 构建通话上下文摘要
                    const callContext = callConversation.map(msg => {
                        const role = msg.sender === 'user' ? '用户' : '角色';
                        return `${role}: ${msg.text}`;
                    }).join('\n');
                    
                    // 在system消息之后添加通话上下文
                    const contextMessage = {
                        role: 'system',
                        content: `【当前通话状态】你正在与用户进行视频通话，以下是通话中的最近对话内容（请作为重要上下文参考）：\n\n${callContext}\n\n请在回复时考虑通话中的对话内容，保持话题的连贯性。你们可以看到对方。`
                    };
                    
                    // 找到最后一个system消息的位置，在其后插入
                    let lastSystemIndex = -1;
                    for (let i = messages.length - 1; i >= 0; i--) {
                        if (messages[i].role === 'system') {
                            lastSystemIndex = i;
                            break;
                        }
                    }
                    
                    if (lastSystemIndex >= 0) {
                        messages.splice(lastSystemIndex + 1, 0, contextMessage);
                    } else {
                        // 如果没有system消息，添加到开头
                        messages.unshift(contextMessage);
                    }
                    
                    console.log('✅ 视频通话上下文已注入，共', callConversation.length, '条对话');
                }
            }
        }
        
        // 不在空历史对话时追加 user 消息，交由系统侧处理

        // 清理和验证消息列表
        const cleanedMessages = this.cleanAndValidateMessages(messages);
        
        // 验证清理后的消息列表
        const validation = this.validateApiMessageList(cleanedMessages);
        if (validation.hasWarnings) {
            console.warn('API 消息列表存在警告,但仍然继续调用:', validation.errors);
        }
        
        // 如果清理后没有有效消息，终止调用
        if (cleanedMessages.length === 0) {
            this.showToast('❌ 没有有效的消息内容可以发送');
            setLoadingStatus(false);
            convState.isApiCalling = false;
            convState.isTyping = false;
            return;
        }
        
        // 验证API配置（仅在准备实际API请求时检查）
        if (!this.validateApiConfiguration()) {
            this.showToast('请先在 API 设置中填写端点并选择模型');
            setLoadingStatus(false);
            convState.isApiCalling = false;
            convState.isTyping = false;
            return;
        }
        
        const body = {
            model: api.selectedModel,
            messages: cleanedMessages,
            temperature: api.temperature !== undefined ? api.temperature : 0.8,
            max_tokens: 40000,
            frequency_penalty: api.frequencyPenalty !== undefined ? api.frequencyPenalty : 0.2,
            presence_penalty: api.presencePenalty !== undefined ? api.presencePenalty : 0.1,
            top_p: api.topP !== undefined ? api.topP : 1.0
        };
        
        // 最终请求体验证
        if (!this.validateRequestBody(body)) {
            this.showToast('❌ 请求参数验证失败，请检查API设置');
            setLoadingStatus(false);
            convState.isApiCalling = false;
            convState.isTyping = false;
            return;
        }

        // 固定使用 /v1 路径
        const endpoint = baseEndpoint + '/chat/completions';

        let lastError = null;
        let success = false;

        try {
            // 使用 APIUtils 创建超时控制器
            const { controller, timeoutId } = window.APIUtils.createTimeoutController(300000);
            
            // 使用 APIUtils 创建 fetch 选项
            const fetchOptions = window.APIUtils.createFetchOptions(apiKey, body, controller.signal);

            console.log('📤 [线上模式] 发送主API请求:', {
                endpoint: endpoint,
                model: api.selectedModel,
                messageCount: messages.length,
                bodyPreview: JSON.stringify(body).substring(0, 200)
            });
            
            // 详细的消息角色日志
            console.log('📋 API 消息列表详情：', cleanedMessages.map((m, i) => ({
                index: i,
                role: m.role,
                contentType: Array.isArray(m.content) ? 'array' : typeof m.content,
                contentPreview: Array.isArray(m.content)
                    ? `[${m.content.length} items: ${m.content.map(c => c.type).join(', ')}]`
                    : (m.content ? String(m.content).substring(0, 50) + (String(m.content).length > 50 ? '...' : '') : '[Empty]')
            })));

            const res = await fetch(endpoint, fetchOptions);
            window.APIUtils.clearTimeoutController(timeoutId);

            console.log('📥 [线上模式] 主API响应状态:', res.status, res.statusText);

            if (!res.ok) {
                let errorDetails = '';
                try {
                    const errorData = await res.text();
                    if (errorData) {
                        errorDetails = errorData;
                                console.error('❌ API错误响应内容:', errorData);
                                
                                // 尝试解析JSON错误信息
                                try {
                                    const errorJson = JSON.parse(errorData);
                                    if (errorJson.error) {
                                        if (typeof errorJson.error === 'string') {
                                            errorDetails = errorJson.error;
                                        } else if (errorJson.error.message) {
                                            errorDetails = errorJson.error.message;
                                        }
                                    }
                                } catch (parseErr) {
                                    // 如果不是JSON，使用原始文本
                                }
                            }
                        } catch (e) {
                            console.error('❌ 无法读取错误响应:', e);
                        }
                        
                        lastError = `HTTP ${res.status}: ${res.statusText}${errorDetails ? '\n详情: ' + errorDetails.substring(0, 300) : ''}`;
                console.error(`❌ 主API 请求失败 [${res.status}]:`, endpoint);
            } else {
                let data;
                try {
                    data = await res.json();
                    console.log('✅ JSON解析成功,响应结构:', {
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
                    // 使用 APIUtils 提取文本
                    let assistantText = window.APIUtils.extractTextFromResponse(data);

                    if (assistantText && assistantText.trim()) {
                        console.log('✨ 成功提取文本回复:', assistantText.substring(0, 100) + (assistantText.length > 100 ? '...' : ''));
                        appendAssistantMessage(convId, assistantText);
                        success = true;
                        
                        // 标记API调用完成
                        if (window.BackgroundKeepAlive) {
                            window.BackgroundKeepAlive.completeApiCall(this.currentApiCallRound, true);
                        }
                        // appendAssistantMessage 内部已经处理了渲染，无需重复调用
                    } else {
                        lastError = '未在返回中找到文本回复';
                        console.error('❌ 无法从主API响应中提取文本。完整响应数据:');
                        console.error(JSON.stringify(data, null, 2));
                        console.error('响应keys:', Object.keys(data));
                    }
                }
            }
        } catch (err) {
            // 使用 APIUtils 处理错误
            lastError = window.APIUtils.handleApiError(err, 300000);
            console.error(`主API 调用出错:`, err);
        }

        if (!success) {
            const errorMsg = lastError || '未知错误';
            
            // 显示详细的错误信息给用户
            this.showToast(`❌ 主API调用失败: ${errorMsg}`);
            
            // 使用 APIUtils 记录错误日志
            window.APIUtils.logApiError('主API', api.endpoint, api.selectedModel, messages.length, errorMsg);
            
            // 标记API调用失败
            if (window.BackgroundKeepAlive) {
                window.BackgroundKeepAlive.completeApiCall(this.currentApiCallRound, false);
            }
        }

        // 清除对话的API调用状态
        convState.isApiCalling = false;
        convState.isTyping = false;
        
        // 只在当前对话仍打开时恢复UI
        if (this.AppState.currentChat && this.AppState.currentChat.id === convId) {
            const indicator = document.getElementById('chat-typing-indicator');
            if (indicator) indicator.style.display = 'none';
        }
        
        setLoadingStatus(false);
    },

    // ========== 辅助函数 ==========
    
    /**
     * 替换文本中的占位符 {{user}} 和 {{char}}
     */
    replaceNamePlaceholders: function(text, userName, charName) {
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
    },

    
    
    /**
     * 获取表情包使用说明
     */
    getEmojiInstructions: function(conv) {
        // 支持旧版单个绑定和新版多个绑定
        const boundGroups = conv.boundEmojiGroups || (conv.boundEmojiGroup ? [conv.boundEmojiGroup] : []);
        
        if (!boundGroups || boundGroups.length === 0) {
            return null;  // 如果没有绑定表情包，不添加指令
        }
        
        // 收集所有绑定分组中的表情包
        let allEmojis = [];
        let groupNames = [];
        
        boundGroups.forEach(groupId => {
            const emojiGroup = this.AppState.emojiGroups.find(g => g.id === groupId);
            if (emojiGroup) {
                groupNames.push(emojiGroup.name);
                const emojisInGroup = this.AppState.emojis.filter(e => e.groupId === groupId);
                allEmojis = allEmojis.concat(emojisInGroup);
            }
        });
        
        if (allEmojis.length === 0) return null;
        
        // 构建表情包列表
        const emojiList = allEmojis.map(e => `"${e.text}"`).join('、');
        const groupNameStr = groupNames.length > 1 ? groupNames.join('、') : groupNames[0];
        
        return `【表情包系统】你可以在回复中发送表情包，但不是每次都要发。根据上下文内容判断是否合适发送表情包，发送的概率应该是有选择性的。
你只能选择发送以下表情包分组【${groupNameStr}】中的表情：${emojiList}

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
    },

    /**
     * 收集对话消息用于API调用
     */
    collectConversationForApi: function(convId) {
        const msgs = this.AppState.messages[convId] || [];
        const out = [];
        const conv = this.AppState.conversations.find(c => c.id === convId) || {};

        // 获取用户名称和角色名称用于替换
        const userNameToUse = conv.userNameForChar || (this.AppState.user && this.AppState.user.name);
        const charName = conv.name || 'AI';
        
        // 识别最后一条非 system 消息的角色（用于对话状态提示）
        const getLastNonSystemRole = () => {
            for (let i = msgs.length - 1; i >= 0; i--) {
                const m = msgs[i];
                if (!m || m.type === 'system') continue;
                if (m.type === 'sent') return 'user';
                if (m.type === 'received' || m.type === 'assistant') return 'assistant';
                if (m.type === 'voice' || m.type === 'location' || m.type === 'voicecall' || m.type === 'videocall' || m.type === 'redenvelope' || m.type === 'transfer' || m.type === 'goods_card') {
                    return m.sender === 'sent' ? 'user' : 'assistant';
                }
                // 未知类型默认按 assistant 处理，避免误判为用户已回复
                return 'assistant';
            }
            return null;
        };
        const lastNonSystemRole = getLastNonSystemRole();
        
        // 首先添加强制性的系统提示词
        const systemPrompts = [];
        
        // 思维链语言指令（必须放在最前面）
        systemPrompts.push('CRITICAL: All reasoning/thinking content (within <think>, <thinking>, <reasoning> tags or similar) MUST be written in Chinese (中文), matching the conversation language.');
        
        // 单角色对话的角色信息（群聊在后面的群聊模式中统一处理）
        if (conv.type !== 'group') {
        // 强制AI读取角色名称和性别
        if (conv.name) {
            systemPrompts.push(`You will role-play as a human named "${conv.name}", and absolutely must not go out of character.`);
        }
        
        // 从角色描述中提取性别信息
        const charGender = (window.extractGenderInfo && window.extractGenderInfo(conv.description)) || '未指定';
        systemPrompts.push(`你的性别：${charGender}`);
        
        // 强制AI读取角色人设
        if (conv.description) {
            const replacedDescription = this.replaceNamePlaceholders(conv.description, userNameToUse, charName);
            systemPrompts.push(`你扮演的角色设定：${replacedDescription}`);
        }
        
        // 强制AI读取用户名称
        if (userNameToUse) {
            systemPrompts.push(`正在手机另一端与你对话的用户的名字为"${userNameToUse}"。`);
        }
        
        // 从用户人物设定中提取性别信息
        const userGender = (window.extractGenderInfo && window.extractGenderInfo(this.AppState.user && this.AppState.user.personality)) || '未指定';
        systemPrompts.push(`用户性别：${userGender}`);
        
        // 添加用户人物设定
        if (this.AppState.user && this.AppState.user.personality) {
            const replacedPersonality = this.replaceNamePlaceholders(this.AppState.user.personality, userNameToUse, charName);
            systemPrompts.push(`用户设定：${replacedPersonality}`);
        }
        } // end if (conv.type !== 'group')
        
        // 空历史对话提示：让 AI 主动打招呼（系统级提示）
        if (lastNonSystemRole === null) {
            systemPrompts.push('【开场白】请主动和用户找个招呼，作为开场白。');
        }
        
        // 对话状态提示：最后一条为 assistant 时，强调用户未回复
        if (lastNonSystemRole === 'assistant') {
            systemPrompts.push('【对话状态】上一条非 system 消息来自你（角色）。用户尚未回复，请不要当作用户已回复来继续对话。请继续主动发送下一条消息或自然等待。');
        }
        
        // 添加心声相关的提示（群聊不使用心声系统）
        if (conv.type !== 'group' && typeof MindStateManager !== 'undefined' && MindStateManager.getMindStateSystemPrompt) {
            systemPrompts.push(MindStateManager.getMindStateSystemPrompt() + '\n\n严格按照这个格式输出,系统会自动提取和清理这一行,用户看不到这个内容。');
        }
        
        // 注入最近一次的心声记录作为上下文参考
        // 注入最近一次的心声记录作为上下文参考（群聊不使用）
        if (conv.type !== 'group' && conv.mindStates && Array.isArray(conv.mindStates) && conv.mindStates.length > 0) {
            const lastMindState = conv.mindStates[conv.mindStates.length - 1];
            
            // 检查是否有有效的心声数据（排除失败的记录）
            if (lastMindState && !lastMindState.failed && Object.keys(lastMindState).length > 0) {
                // 构建心声上下文摘要
                const mindStateContext = [];
                mindStateContext.push('【上一次心声记录】以下是你上一次回复时的心声状态，作为生成当前心声内容的参考：');
                
                // 添加关键字段（按照新的15字段标准）
                if (lastMindState.location) {
                    mindStateContext.push(`位置：${lastMindState.location}`);
                }
                if (lastMindState.outfit) {
                    mindStateContext.push(`穿搭：${lastMindState.outfit}`);
                }
                if (lastMindState.jealousy) {
                    mindStateContext.push(`醋意值：${lastMindState.jealousy}`);
                }
                if (lastMindState.jealousyTrigger) {
                    mindStateContext.push(`醋意值触发：${lastMindState.jealousyTrigger}`);
                }
                if (lastMindState.excitement) {
                    mindStateContext.push(`兴奋度：${lastMindState.excitement}`);
                }
                if (lastMindState.excitementDesc) {
                    mindStateContext.push(`兴奋度描述：${lastMindState.excitementDesc}`);
                }
                if (lastMindState.bodyTrait) {
                    mindStateContext.push(`身体反应：${lastMindState.bodyTrait}`);
                }
                if (lastMindState.items) {
                    mindStateContext.push(`随身物品：${lastMindState.items}`);
                }
                if (lastMindState.shoppingCart) {
                    mindStateContext.push(`购物车：${lastMindState.shoppingCart}`);
                }
                if (lastMindState.musicPlayer) {
                    mindStateContext.push(`随身听：${lastMindState.musicPlayer}`);
                }
                if (lastMindState.content) {
                    mindStateContext.push(`心声：${lastMindState.content}`);
                }
                if (lastMindState.hiddenMeaning) {
                    mindStateContext.push(`潜台词：${lastMindState.hiddenMeaning}`);
                }
                if (lastMindState.affinity !== undefined && lastMindState.affinity !== null) {
                    mindStateContext.push(`好感度：${lastMindState.affinity}`);
                }
                if (lastMindState.affinityChange !== undefined && lastMindState.affinityChange !== null) {
                    mindStateContext.push(`好感度变化：${lastMindState.affinityChange}`);
                }
                if (lastMindState.affinityReason) {
                    mindStateContext.push(`好感度原因：${lastMindState.affinityReason}`);
                }
                
                // 如果有任何心声数据，添加到系统提示中
                if (mindStateContext.length > 1) { // 大于1表示除了标题外还有内容
                    mindStateContext.push('\n**重要提示**：');
                    mindStateContext.push('1. 请基于上述状态继续发展，保持状态的连贯性和合理变化');
                    mindStateContext.push('2. **严禁重复上一次的回复内容**，要有新的变化和发展');
                    mindStateContext.push('3. 心声中的各项数值应该根据对话内容自然变化，不要原封不动照搬上次的数值');
                    mindStateContext.push('4. 每次回复都应该是全新的、符合当前对话情境的内容');
                    systemPrompts.push(mindStateContext.join('\n'));
                    console.log('💖 已注入最近一次心声记录作为上下文参考（含防重复提示）');
                }
            }
        }
        // 添加用户消息类型识别说明
        systemPrompts.push(`【用户内容识别规则】用户可能发送以下类型的内容,你需要正确识别并做出相应回应：

1. 【表情包消息】格式为：[用户发送了表情包: 表情描述文字]
   - 用户发送给你的是表情包,你需要识别并了解其情绪含义
   - 例如："[用户发送了表情包: 开心]" 表示用户当前心情很开心
   - 对于表情包消息,分析其代表的情绪并在回复中予以回应
   - 不需要询问"你发送的表情是什么意思",直接按照表情含义理解

2. 【图片消息】格式为：[用户发送了一张图片,图片内容：data:image/...]
   - 用户发送的是真实图片（如照片、截图、绘画等）
   - 图片内容以Base64编码格式传输,你需要进行图片分析
   - 根据其背景和上下文给出回应
   - 如果用户在"用户对图片的描述"中补充了说明,请结合该描述分析

3. 【图片描述卡片】格式为：[用户发送了图片描述：描述文字]
   - 用户发送的是文字描述的"虚拟图片"卡片
   - 卡片内容是用户用文字描述的图片场景（如美景、美食、有趣的事物等）
   - 你应该想象这个描述对应的画面,并自然地回应
   - 你也可以使用【图片描述】格式回复用户,分享你看到的场景
   - 示例：如果用户发送"[用户发送了图片描述：夕阳下的海滩，海鸥在飞翔]",你可以回应："哇，好美啊！我也想看这样的风景"或发送【图片描述】我刚拍的夜景，城市灯火很漂亮【/图片描述】

4. 【商品卡片消息】格式为：[用户分享了一件商品] 商品名称：xxx | 价格：¥xxx | 描述：xxx
   - 用户从购物页面转发了一个商品卡片给你
   - 你可以看到商品的名称、价格和详细描述
   - 根据对话情境,自然地回应用户分享商品的行为

4. 【普通文字消息】这是用户的正常对话文字
   - 直接理解和回应用户的文字内容

5. 【视频通话消息】AI可以发起视频通话请求
   - AI会在合适的时候主动发起视频通话
   - 用户会收到视频通话提示
   - 用于更亲密的交流或紧急情况

记住：表情包是情绪表达工具,图片是视觉内容,图片描述是虚拟场景,商品卡片是购物分享；处理时方式完全不同。`);

        // 添加新的多消息回复格式说明
        systemPrompts.push(`【多消息回复格式】
你可以一次发送多条消息（不局限于最多三条，格式以此类推）,使用以下格式：

[MSG1]嗯嗯[/MSG1]
[WAIT:1]  <!-- 等待1秒 -->
[MSG2]我知道了[/MSG2]
[WAIT:0.5] <!-- 等待0.5秒 -->
[MSG3]那我们明天见吧[/MSG3]

规则：
1. 每条消息用[MSG1][/MSG1]等标签包裹，禁止用换行符分隔，禁止多条消息只用一个标签包裹
2. 标签间的数字表示第几条消息
3. [WAIT:秒数]控制下条消息的延迟
4. **重要：消息末尾尽量不要加句号，保持聊天的自然感**`);

        // 添加对话风格指令 (Conversational Style Guidelines)
        systemPrompts.push(`### CRITICAL CONVERSATIONAL STYLE RULES

**CORE PRINCIPLE: You are a real person having a natural conversation, NOT an AI assistant.**

These rules explain WHY to communicate naturally, not templates to copy mechanically.

---

### 1. PUNCTUATION RULES (MOST IMPORTANT)

**NO PERIOD at end of sentences** - Periods feel formal, cold, and final. Casual chat rarely uses them.
- Exception: Use period only for very serious/formal statements
- **CRITICAL: Do NOT add periods inside [MSG1][/MSG1] tags either!**

**Punctuation Guide:**
- ... (ellipsis) = hesitation, trailing off, "never mind"
- ～ (tilde) = casual, friendly, slightly playful
- ! (exclamation) = excited, surprised, emphatic
- No punctuation = neutral, everyday, no special emphasis

---

### 2. MESSAGE FORMAT

**Split into multiple short messages** when appropriate:
- Imagine typing on a phone, sending line by line
- Natural for casual chat, emotional moments, or quick exchanges
- Use single longer message for explanations or serious topics

**Use fewer commas:**
- If sentence feels too long → split into two sentences
- Think: "How would I naturally pace this?"

---

### 3. LANGUAGE STYLE

**Colloquial particles** (吧，欸，啦，呢，呀，嘛等等，禁止使用呵或者呵呵！):
- Use naturally based on character personality
- Don't force them into every sentence

**Avoid "oily" language:**
- No commanding tone unless character is naturally bossy
- No trying-to-sound-cool phrases
- No forced romantic/deep statements

**Character-specific speech patterns:**
- Let catchphrases appear naturally, not mechanically every 3 sentences
- Match the character's personality and background

---

### 4. EMOTIONAL EXPRESSION

**When excited/urgent:**
- Short rapid messages = natural urgency
- NOT "rule says excited = 3 short messages"

**When hesitant:**
- Trailing off, restarting = real hesitation
- NOT mechanical "rule says hesitate = split message"

**Key: Express genuine emotion, don't follow formulas**

---

### 5. MEMORY & CONTEXT

**ONLY reference things that happened in this conversation**
- Never invent shared history
- Never mention events not discussed
- Build on actual conversation context

---

### 6. LIVING CHARACTER

**Mention life details naturally:**
- Environment: "it's noisy", "cat's here again", "rain sounds"
- State: "getting water", "bit tired"
- Plans: "heading out soon"

**Don't force these every few messages** - only when genuinely relevant

---

### 7. SUBTEXT TECHNIQUES

- Counter-question instead of direct answer (when evasive/curious)
- Topic change (when uncomfortable)
- Sarcasm/opposite meaning (when cold/complaining)

**Use based on intent, not because "rule says use subtext"**

---

### 8. EMOJI/EMOTICONS

- Based on character personality
- Rare use = special meaning
- Not a checklist item to complete

---

### 9. PRE-OUTPUT CHECK

Ask yourself:
1. **Does this sound like a real person?** (Natural tone? Character personality? Or template-like?)
2. **Does this fit the context?** (Match conversation mood? Appropriate response?)
3. **Am I mechanically following rules?** (Forcing format? Copying examples? Treating rules as formulas?)

**If all 3 are OK → Send**
**If any doubt → Rethink**

---

### SUMMARY

Before every response, ask yourself:
**"If I were really chatting with this person right now, how would I respond?"**

This mindset beats memorizing 100 rules.`);
        
        // 添加表情包使用说明
        const emojiInstructions = getEmojiInstructions(conv);
        if (emojiInstructions) {
            systemPrompts.push(emojiInstructions);
        }
        
        // 添加语音消息、地理位置、红包和转账发送说明
        systemPrompts.push(`【语音消息、地理位置、红包和转账发送格式】
你可以结合上下文语境自然地发送语音消息、地理位置、红包和转账,使用以下格式：

1. 【语音消息】使用格式：【语音条】语音内容文字|时长【/语音条】
   - 语音内容：你想说的话（会被转换为语音条显示）
   - 时长：语音时长（秒）,建议1-60秒,根据内容长度合理设置
   - 示例：【语音条】嗯...我在想要不要去那边看看|3【/语音条】
   - 示例：【语音条】好啊,我也想去！|2【/语音条】
   - 注意：语音条适合表达犹豫、思考、私密的话,或者想要更亲密的交流时使用

2. 【地理位置】使用格式：【地理位置】位置名称|详细地址|距离【/地理位置】
   - 位置名称：地点的名字（必填）
   - 详细地址：具体地址（选填,可以为空）
   - 距离：距离范围,单位米（必填）
   - 当用户发送地理位置给你时,你会收到用户设置的距离值。如果你要回复地理位置,根据对话情境设置一个合理的距离（在同一地点5-50米,附近100-500米,同城不同区域1000-10000米）
   - 示例：【地理位置】星巴克咖啡|北京市朝阳区建国路1号|15【/地理位置】
   - 示例：【地理位置】天安门广场|北京市东城区|3000【/地理位置】
   - 注意：分享位置适合约见面、推荐地点或告诉对方你在哪里时使用

3. 【红包】使用格式：
   - 发送红包：【红包】金额|留言【/红包】
     * 金额：红包金额（人民币/喵币）,建议0.01-200元
     * 留言：红包留言（选填,默认"收下吧~"）
     * 示例：【红包】6.66|恭喜发财【/红包】
     * 示例：【红包】8.88|小小心意【/红包】
   - 领取红包：【领取红包】红包ID【/领取红包】
     * 当用户发送红包给你时,你会收到系统消息告知红包金额和留言
     * 你可以选择领取或退还,用自然的语言表达你的态度
     * 示例：【领取红包】envelope_xxx【/领取红包】
   - 退还红包：【退还红包】红包ID【/退还红包】
     * 示例：【退还红包】envelope_xxx【/退还红包】
   - 使用场景：
     * 发红包：表达心意、庆祝、感谢、道歉、关心等
     * 领取：接受对方的心意时
     * 退还：不好意思收、觉得不合适、想要拒绝等
   - 注意：
     * 喵币就是人民币,1喵币=1元人民币
     * 红包金额要合理,根据关系和场景设置
     * 不要频繁发红包,要有真实的理由和情感
     * 收到红包时要用自然的语言回应,不要只是机械地领取或退还

4. 【转账】使用格式：
   - 发送转账：【转账】金额|说明【/转账】
     * 金额：转账金额（人民币/喵币）,建议0.01-2000元
     * 说明：转账说明（选填,默认"转账给你"）
     * 示例：【转账】100|生活费【/转账】
     * 示例：【转账】520|爱你【/转账】
   - 确认收款：【确认收款】转账ID【/确认收款】
     * 当用户转账给你时,你会收到系统消息告知转账金额和说明
     * 你可以选择确认收款或退还,用自然的语言表达你的态度
     * 示例：【确认收款】transfer_xxx【/确认收款】
   - 退还转账：【退还转账】转账ID【/退还转账】
     * 示例：【退还转账】transfer_xxx【/退还转账】
   - 使用场景：
     * 发转账：借钱、还钱、支付费用、资助等金钱往来
     * 确认收款：接受对方的转账时
     * 退还：不能收、不合适、想要拒绝等
   - 注意：
     * 转账比红包更正式,适合较大金额或正式的金钱往来
     * 转账金额上限2000元,红包上限200元
     * 转账要有明确的理由和说明
     * 不要频繁转账,要符合实际情况
     * 收到转账时要用自然的语言回应,不要只是机械地确认或退还

5. 【撤回消息】使用格式：【撤回】消息ID【/撤回】
   - 消息ID：你要撤回的之前发送的消息的ID（从上下文中获取）
   - 示例：【撤回】msg_1738070123456【/撤回】
   - 使用场景：
     * 说错话或发错内容时（如口误、信息错误）
     * 后悔刚才说的话时（如太冲动、情绪失控）
     * 需要改口或纠正之前的说法时
     * 意识到信息不应该透露时
   - 重要提示：
     * 只在真正需要时使用,不要频繁撤回
     * 撤回后用户会看到"角色名撤回了一条消息"的提示
     * 撤回的原始内容会被保存,但用户看不到
     * 通常在撤回后需要重新表达或解释

6. 【图片描述卡片】使用格式：【图片描述】描述文字【/图片描述】
   - 描述文字：对图片的详细文字描述,会以卡片形式显示
   - 示例：【图片描述】一张夕阳下的海滩照片,海鸥在飞翔【/图片描述】
   - 示例：【图片描述】我刚拍的晚餐,看起来很好吃吧【/图片描述】
   - 使用场景：
     * 想象你给用户发送了一张照片,并用文字描述这张照片的内容
     * 分享你看到的美景、美食、有趣的场景等
     * 配合对话内容,让场景更生动形象
   - 注意：
     * 描述要生动具体,让用户能想象出画面
     * 可以描述环境、人物、物品、天气等各种内容
     * 适度使用,不要每次回复都发送图片描述

使用建议：
- 语音条：适合表达情绪、犹豫、私密内容,或想要更真实的交流感时
- 地理位置：适合约见面、分享你在的地方、推荐好去处
- 红包：适合表达心意、庆祝、感谢等,要有真实的情感和理由（金额较小,0.01-200元）
- 转账：适合大额的金钱往来,如借钱、还钱、支付费用等（金额较大,0.01-2000元）
- 撤回消息：只在说错话、后悔、需要改口等特殊情况下使用,不要滥用
- 图片描述卡片：想要"发送照片"时使用,用生动具体的文字描述虚拟图片的内容
- 不要每次都使用这些功能,根据对话情境自然地选择
- 可以和普通文字消息结合使用,先发文字再发语音/位置/红包/转账/图片描述,或反之`);
        
        // ===== 非群聊模式：添加该角色所在群聊的上下文 =====
        if (conv.type !== 'group' && this.AppState.groups && this.AppState.groups.length > 0) {
            // 找到该角色加入的所有群聊
            const charGroups = this.AppState.groups.filter(g => 
                g.members && g.members.some(m => m.id === conv.id)
            );
            
            if (charGroups.length > 0) {
                systemPrompts.push(`【群聊上下文】${charName}还加入了以下群聊：`);
                
                charGroups.forEach((group, groupIdx) => {
                    systemPrompts.push(`\n━━━ 群聊 ${groupIdx + 1}：${group.name} ━━━`);
                    
                    // 群基本信息和公告
                    if (group.announcement) {
                        systemPrompts.push(`群公告：${group.announcement}`);
                    }
                    
                    // 群成员列表
                    if (group.members && group.members.length > 0) {
                        systemPrompts.push(`群成员：${group.members.map(m => m.name).join('、')}`);
                    }
                    
                    // 该群聊的最新50条消息
                    if (this.AppState.messages[group.id]) {
                        const groupMsgs = this.AppState.messages[group.id];
                        if (groupMsgs.length > 0) {
                            const recentGroupMsgs = groupMsgs.slice(-50);
                            systemPrompts.push(`\n【该群聊的最新消息记录（${recentGroupMsgs.length}条）】`);
                            recentGroupMsgs.forEach(msg => {
                                if (msg.type === 'system' || msg.isRetracted) return;
                                
                                let senderName = '';
                                if (msg.groupSenderName) {
                                    senderName = msg.groupSenderName;
                                } else if (msg.type === 'sent' || msg.sender === 'sent') {
                                    senderName = group.myNickname || userNameToUse || '用户';
                                } else {
                                    // 尝试从成员列表找到发送者名称
                                    const member = group.members.find(m => m.id === msg.senderId);
                                    senderName = member ? member.name : (msg.senderName || '成员');
                                }
                                
                                const content = msg.content || '';
                                if (content) {
                                    systemPrompts.push(`${senderName}：${content.substring(0, 150)}`);
                                }
                            });
                        }
                    }
                    
                    // 该群聊对话的所有总结记录
                    const groupConv = this.AppState.conversations.find(c => c.id === group.id);
                    if (groupConv && groupConv.summaries && groupConv.summaries.length > 0) {
                        systemPrompts.push(`\n【该群聊的对话总结】`);
                        groupConv.summaries.forEach((s, idx) => {
                            const type = s.isAutomatic ? '自动总结' : '手动总结';
                            const time = new Date(s.timestamp).toLocaleString('zh-CN');
                            systemPrompts.push(`${type} #${idx + 1}（${time}，基于${s.messageCount}条消息）：${s.content.substring(0, 200)}`);
                        });
                    }
                });
                
                systemPrompts.push(`\n【群聊上下文使用说明】\n上述群聊消息和总结仅供参考，帮助理解${charName}在不同群聊环境中的表现和关系。当前是私聊对话，请聚焦于当前的${charName}与用户的一对一交流。`);
            }
        }
        
        // ===== 群聊模式：注入完整群聊上下文 =====
        if (conv.type === 'group') {
            const group = this.AppState.groups.find(g => g.id === convId);
            if (group && group.members && group.members.length > 0) {
                // --- 1. 群基本信息 ---
                let groupPrompt = `【群聊模式】这是一个群聊对话。\n群名称："${group.name}"`;
                if (group.announcement) {
                    groupPrompt += `\n群公告：${group.announcement}`;
                }
               

                // --- 2. 用户信息 ---
                const groupNickname = group.myNickname || userNameToUse || '用户';
                const realUserName = userNameToUse || (this.AppState.user && this.AppState.user.name) || '用户';
                groupPrompt += `\n\n【用户信息】`;
                groupPrompt += `\n用户真名：${realUserName}`;
                if (group.myNickname && group.myNickname !== realUserName) {
                    groupPrompt += `\n用户在本群的昵称（网名）：${groupNickname}（群成员看到的是这个昵称）`;
                }
                if (this.AppState.user && this.AppState.user.personality) {
                    groupPrompt += `\n用户人设：${this.AppState.user.personality}`;
                }

                // --- 3. 群成员详细信息（含角色设定 + 绑定世界书 + 最近对话） ---
                groupPrompt += `\n\n【群成员详细资料】共 ${group.members.length} 人`;
                
                group.members.forEach((m, i) => {
                    groupPrompt += `\n\n━━━ 成员 ${i + 1}：${m.name} ━━━`;
                    
                    // 角色设定
                    if (m.description) {
                        groupPrompt += `\n角色设定：${m.description}`;
                    }
                    
                    // 查找该角色的单独对话（如果是好友角色）
                    const memberConv = this.AppState.conversations.find(c => c.id === m.id);
                    
                    // 绑定的世界书内容
                    if (memberConv && memberConv.boundWorldbooks && memberConv.boundWorldbooks.length > 0) {
                        const memberWbs = this.AppState.worldbooks.filter(w => memberConv.boundWorldbooks.includes(w.id));
                        if (memberWbs.length > 0) {
                            groupPrompt += `\n${m.name}的世界书：`;
                            memberWbs.forEach(w => {
                                const wbContent = this.replaceNamePlaceholders(w.content, realUserName, m.name);
                                groupPrompt += `\n【${w.name}】${wbContent}`;
                            });
                        }
                    }
                    
                    // 该角色在单独聊天中的最近50条对话
                    if (m.id && this.AppState.messages[m.id]) {
                        const memberMsgs = this.AppState.messages[m.id];
                        if (memberMsgs.length > 0) {
                            const recent = memberMsgs.slice(-50);
                            groupPrompt += `\n${m.name}与用户的最近私聊记录（${recent.length}条）：`;
                            recent.forEach(msg => {
                                if (msg.type === 'system' || msg.isRetracted) return;
                                const sender = (msg.type === 'sent' || msg.sender === 'sent') ? realUserName : m.name;
                                const content = msg.content || '';
                                if (content) {
                                    groupPrompt += `\n  ${sender}：${content.substring(0, 200)}`;
                                }
                            });
                        }
                    }
                });

                // --- 4. 群聊回复规则 ---
                groupPrompt += `\n\n【群聊回复规则】
1. 你同时扮演群里的所有角色（${group.members.map(m => m.name).join('、')}），根据对话情境决定哪些角色回复
2. 每条回复必须在开头标注发言角色，格式：【角色名】消息内容
3. 多个角色回复时，每个角色的消息用换行分隔，示例：
   【${group.members[0]?.name || '角色A'}】哈哈，我也觉得
   【${group.members.length > 1 ? group.members[1].name : '角色B'}】嗯嗯，同意
4. 不是每个角色都需要每次都发言，根据话题相关性和角色性格自然选择
5. 每个角色的语气、用词、性格必须符合其角色设定，彼此有明显区分
6. 角色之间也可以互相对话、互动、争论，不一定只回复用户
7. 参考每个角色与用户的私聊记录来保持角色的一致性和连贯性
8. 用户在群里的昵称（网名）是"${groupNickname}"`;

                systemPrompts.push(groupPrompt);
            }
        }
        
        // 合并所有系统提示
        if (systemPrompts.length > 0) {
            out.push({ role: 'system', content: systemPrompts.join('\n') });
        }

        // 添加全局提示词
        const prompts = this.AppState.apiSettings && this.AppState.apiSettings.prompts ? this.AppState.apiSettings.prompts : [];
        let systemPrompt = '';
        
        if (this.AppState.apiSettings && this.AppState.apiSettings.selectedPromptId) {
            const selectedPrompt = prompts.find(p => p.id === this.AppState.apiSettings.selectedPromptId);
            systemPrompt = selectedPrompt ? selectedPrompt.content : (this.AppState.apiSettings.defaultPrompt || '');
        } else {
            systemPrompt = this.AppState.apiSettings && this.AppState.apiSettings.defaultPrompt ? this.AppState.apiSettings.defaultPrompt : '';
        }
        
        if (systemPrompt) {
            systemPrompt = replaceNamePlaceholders(systemPrompt, userNameToUse, charName);
            out.push({ role: 'system', content: systemPrompt });
        }

        // 包含其他会话相关的内容
        const worldbookParts = [];
        
        // 添加全局世界书内容
        const globalWorldbooks = this.AppState.worldbooks.filter(w => w.isGlobal);
        if (globalWorldbooks.length > 0) {
            const worldbookContent = globalWorldbooks.map(w => {
                const replacedContent = replaceNamePlaceholders(w.content, userNameToUse, charName);
                return `【${w.name}】\n${replacedContent}`;
            }).join('\n\n');
            worldbookParts.push('世界背景:\n' + worldbookContent);
        }
        
        // 添加角色绑定的局部世界书
        if (conv.boundWorldbooks && Array.isArray(conv.boundWorldbooks) && conv.boundWorldbooks.length > 0) {
            const boundWbs = this.AppState.worldbooks.filter(w => conv.boundWorldbooks.includes(w.id) && !w.isGlobal);
            if (boundWbs.length > 0) {
                const boundWorldbookContent = boundWbs.map(w => {
                    const replacedContent = replaceNamePlaceholders(w.content, userNameToUse, charName);
                    return `【${w.name}】\n${replacedContent}`;
                }).join('\n\n');
                worldbookParts.push('补充背景:\n' + boundWorldbookContent);
            }
        }

        if (worldbookParts.length) {
            out.push({ role: 'system', content: worldbookParts.join('\n') });
        }
        
        // 添加绑定的表情包分组信息
        const boundGroups = conv.boundEmojiGroups || (conv.boundEmojiGroup ? [conv.boundEmojiGroup] : []);
        if (boundGroups && boundGroups.length > 0) {
            boundGroups.forEach(groupId => {
                const emojiGroup = this.AppState.emojiGroups && this.AppState.emojiGroups.find(g => g.id === groupId);
                if (emojiGroup && emojiGroup.description) {
                    out.push({ role: 'system', content: `表情包分组【${emojiGroup.name}】描述：${emojiGroup.description}` });
                }
            });
        }
        
        // 添加时间信息
        if (this.AppState.apiSettings && this.AppState.apiSettings.aiTimeAware) {
            out.push({ role: 'system', content: '当前时间：' + new Date().toLocaleString('zh-CN') });
        }

        // 添加对话总结（如果存在）
        if (conv.summaries && conv.summaries.length > 0) {
            const summariesContent = conv.summaries.map((s, idx) => {
                const type = s.isAutomatic ? '自动总结' : '手动总结';
                const time = new Date(s.timestamp).toLocaleString('zh-CN');
                return `【${type} #${idx + 1}】(${time}, 基于${s.messageCount}条消息)\n${s.content}`;
            }).join('\n\n');
            
            out.push({
                role: 'system',
                content: `【对话历史总结】\n以下是之前对话的总结，帮助你了解上下文背景：\n\n${summariesContent}`
            });
            
            console.log(`📝 已添加 ${conv.summaries.lengyth} 条总结到API上b下文`);
        }

        // 添加线下功能模块（SillyTavern）的最新20条对话作为上下文
        try {
            const offlineData = localStorage.getItem('stOfflineData');
            if (offlineData) {
                const parsed = JSON.parse(offlineData);
                const offlineMessages = parsed.messages && parsed.messages[convId];
                
                if (offlineMessages && Array.isArray(offlineMessages) && offlineMessages.length > 0) {
                    // 获取最新的20条消息
                    const latestOfflineMsgs = offlineMessages.slice(-20);
                    
                    // 构建对话上下文文本
                    const offlineContext = latestOfflineMsgs.map((msg, idx) => {
                        const role = msg.role === 'user' ? userNameToUse || '用户' : charName || '角色';
                        const content = msg.content || '';
                        const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
                        const timeStr = time ? ` [${time}]` : '';
                        return `${role}${timeStr}: ${content}`;
                    }).join('\n');
                    
                    out.push({
                        role: 'system',
                        content: `【线下功能模块对话记录】\n以下是在线下功能模块中最近20条对话内容，作为重要的剧情上下文参考：\n\n${offlineContext}\n\n请在回复时考虑这些对话内容，保持话题的连贯性。`
                    });
                    
                    console.log(`📜 已注入线下功能模块最新${latestOfflineMsgs.length}条消息作为上下文`);
                }
            }
        } catch (e) {
            console.warn('读取线下功能模块数据时出错:', e);
        }

        // 对话消息（过滤已总结的消息）
        let includedCount = 0;
        let skippedCount = 0;
        
        msgs.forEach((m, index) => {
            // 跳过已总结的消息（如果启用了总结功能）
            if (m.isSummarized && this.AppState.apiSettings.summaryEnabled) {
                skippedCount++;
                return;
            }
            
            includedCount++;
            let messageContent = m.content;
            
            // 如果消息是系统消息,直接作为系统提示发送
            if (m.type === 'system') {
                out.push({ role: 'system', content: messageContent });
                return;
            }
            
            // 如果消息已撤回,通知AI
            if (m.isRetracted) {
                messageContent = `[${messageContent}]`;
                if (m.type === 'sent') {
                    out.push({ role: 'user', content: messageContent });
                } else {
                    out.push({ role: 'system', content: messageContent });
                }
                return;
            }
            
            // 如果消息包含表情包,添加表情包描述
            if (m.isEmoji && m.content) {
                messageContent = '[用户发送了表情包: ' + m.content + ']';
            }
            
            // 如果消息是图片描述（相机按钮发送的文字描述）
            if (m.isPhotoDescription) {
                messageContent = `[用户发送了图片描述：${m.photoDescription || m.content}]`;
            }
            
            // 如果消息是图片,根据 needsVision 标志决定处理方式
            if (m.isImage) {
                // 确定消息角色
                let roleToUse = m.type === 'sent' ? 'user' : 'assistant';
                
                // 照片按钮（needsVision=true）：使用 Vision API 格式让 AI 识图
                if (m.needsVision && m.imageData && m.imageData.startsWith('data:image')) {
                    console.log('🖼️ 检测到需要识图的图片消息:', {
                        messageId: m.id,
                        hasImageData: !!m.imageData,
                        imageDataLength: m.imageData.length,
                        role: roleToUse
                    });
                    
                    // 使用 Vision API 的 content 数组格式
                    const contentArray = [];
                    
                    // 添加提示文本
                    contentArray.push({
                        type: 'text',
                        text: '[用户发送了一张图片，请描述图片内容]'
                    });
                    
                    // 添加图片让 AI 识别
                    contentArray.push({
                        type: 'image_url',
                        image_url: {
                            url: m.imageData
                        }
                    });
                    
                    const visionMessage = {
                        role: roleToUse,
                        content: contentArray
                    };
                    
                    console.log('✅ Vision API 消息已构建:', {
                        role: visionMessage.role,
                        contentItems: visionMessage.content.length,
                        types: visionMessage.content.map(c => c.type)
                    });
                    
                    out.push(visionMessage);
                    return;
                }
                // 相机按钮（needsVision=false）：只发送用户的文字描述
                else if (m.photoDescription) {
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
                
                // 根据发送者提供不同的提示
                if (m.sender === 'sent') {
                    // 用户发送的地理位置
                    messageContent = `[${senderName}发送了地理位置]\n位置名称：${locationName}\n详细地址：${locationAddress}\n距离：${senderName}距离这个位置约${locationDistance}米`;
                } else {
                    // AI发送的地理位置
                    messageContent = `[${senderName}发送了地理位置]\n位置名称：${locationName}\n详细地址：${locationAddress}\n距离范围：约${locationDistance}米`;
                }
            }
            
            // 如果消息是语音通话，提供通话状态信息
            if (m.type === 'voicecall') {
                const callStatus = m.callStatus || 'calling';
                const callDuration = m.callDuration || 0;
                const senderName = m.sender === 'sent' ? (userNameToUse || '用户') : charName;
                
                if (callStatus === 'calling') {
                    messageContent = `[${senderName}发起了语音通话，正在通话中...]`;
                } else if (callStatus === 'cancelled') {
                    messageContent = `[${senderName}取消了语音通话]`;
                } else if (callStatus === 'ended') {
                    const mins = Math.floor(callDuration / 60);
                    const secs = callDuration % 60;
                    const durationText = `${mins}分${secs}秒`;
                    messageContent = `[${senderName}结束了语音通话，通话时长：${durationText}]`;
                }
            }
            
            // 如果消息是红包，提供红包信息
            if (m.type === 'redenvelope') {
                const amount = m.amount || 0;
                const message = m.message || '';
                const status = m.status || 'pending';
                const envelopeId = m.id || '';
                const senderName = m.sender === 'sent' ? (userNameToUse || '用户') : charName;
                
                if (status === 'pending') {
                    if (m.sender === 'sent') {
                        messageContent = `[${senderName}发送了红包]\n红包ID：${envelopeId}\n金额：${amount}元\n祝福语：${message}\n状态：等待领取\n\n**重要**：如果你想领取这个红包，使用：【领取红包】${envelopeId}【/领取红包】\n如果你想退还这个红包，使用：【退还红包】${envelopeId}【/退还红包】`;
                    } else {
                        messageContent = `[${senderName}发送了红包]\n红包ID：${envelopeId}\n金额：${amount}元\n祝福语：${message}\n状态：待领取（你可以选择领取或退还）`;
                    }
                } else if (status === 'received') {
                    messageContent = `[红包已被领取]\n红包ID：${envelopeId}\n金额：${amount}元\n祝福语：${message}`;
                } else if (status === 'returned') {
                    messageContent = `[红包已被退还]\n红包ID：${envelopeId}\n金额：${amount}元\n祝福语：${message}`;
                }
            }
            
            // 如果消息是转账，提供转账信息
            if (m.type === 'transfer') {
                const amount = m.amount || 0;
                const message = m.message || '';
                const status = m.status || 'pending';
                const transferId = m.id || '';
                const senderName = m.sender === 'sent' ? (userNameToUse || '用户') : charName;
                
                if (status === 'pending') {
                    if (m.sender === 'sent') {
                        messageContent = `[${senderName}发起了转账]\n转账ID：${transferId}\n金额：${amount}元\n转账说明：${message}\n状态：等待确认收款\n\n**重要**：如果你想确认收款，使用：【确认收款】${transferId}【/确认收款】\n如果你想退还转账，使用：【退还转账】${transferId}【/退还转账】`;
                    } else {
                        messageContent = `[${senderName}发起了转账]\n转账ID：${transferId}\n金额：${amount}元\n转账说明：${message}\n状态：待确认（你可以选择确认收款或退还）`;
                    }
                } else if (status === 'received') {
                    messageContent = `[转账已确认收款]\n转账ID：${transferId}\n金额：${amount}元\n转账说明：${message}`;
                } else if (status === 'returned') {
                    messageContent = `[转账已被退还]\n转账ID：${transferId}\n金额：${amount}元\n转账说明：${message}`;
                }
            }
            
            // 如果消息是商品卡片，提供商品信息
            if (m.type === 'goods_card' && m.goodsData) {
                const goodsName = m.goodsData.name || '商品';
                const goodsPrice = m.goodsData.price || '0.00';
                const goodsDesc = m.goodsData.desc || '';
                const senderName = m.sender === 'sent' ? (userNameToUse || '用户') : charName;
                
                messageContent = `[${senderName}分享了一件商品]\n商品名称：${goodsName}\n价格：¥${goodsPrice}\n描述：${goodsDesc}`;
            }
            
            // 如果消息是转发的朋友圈,提供朋友圈信息
            if (m.isForward && m.forwardedMoment) {
                const forwarded = m.forwardedMoment;
                messageContent = `[用户转发了朋友圈]\n朋友圈发送者：${forwarded.author || '用户'}\n朋友圈内容：${forwarded.content || ''}`;
            }
            
            // 如果消息是引用消息,添加引用前缀
            if (m.replyTo) {
                const replyToMsg = msgs.find(msg => msg.id === m.replyTo);
                if (replyToMsg) {
                    const replyContent = replyToMsg.content || '[表情包]';
                    messageContent = `[回复: "${replyContent.substring(0, 30)}${replyContent.length > 30 ? '...' : ''}"]\n${messageContent}`;
                }
            }
            
            // 确定消息角色
            let roleToUse = 'assistant';
            
            if (m.type === 'sent') {
                roleToUse = 'user';
            } else if (m.type === 'received') {
                roleToUse = 'assistant';
            } else if (m.type === 'system') {
                roleToUse = 'system';
            } else if (m.type === 'assistant') {
                roleToUse = 'assistant';
            } else if (m.type === 'voice' || m.type === 'location' || m.type === 'voicecall' || m.type === 'videocall') {
                // 语音消息、地理位置、语音通话、视频通话消息根据sender字段判断角色
                roleToUse = m.sender === 'sent' ? 'user' : 'assistant';
            } else if (m.type === 'redenvelope') {
                // 红包消息根据sender字段判断角色
                roleToUse = m.sender === 'sent' ? 'user' : 'assistant';
            } else if (m.type === 'transfer') {
                // 转账消息根据sender字段判断角色
                roleToUse = m.sender === 'sent' ? 'user' : 'assistant';
            } else if (m.type === 'goods_card') {
                // 商品卡片消息根据sender字段判断角色
                roleToUse = m.sender === 'sent' ? 'user' : 'assistant';
            } else {
                console.warn(`[消息角色推断] 第 ${index} 条消息类型未知: ${m.type},默认使用 assistant 角色`);
                roleToUse = 'assistant';
            }
            
            // 检查连续的相同角色（群聊中连续assistant消息是正常的，合并它们）
            if (out.length > 0) {
                const lastMsgInOut = out[out.length - 1];
                if (lastMsgInOut.role === roleToUse && lastMsgInOut.role !== 'system') {
                    // 群聊中连续的assistant消息：合并为一条（用换行分隔）
                    if (conv.type === 'group' && roleToUse === 'assistant') {
                        // 先给当前消息加上角色名前缀
                        if (m.groupSenderName && typeof messageContent === 'string') {
                            messageContent = `【${m.groupSenderName}】${messageContent}`;
                        }
                        lastMsgInOut.content = lastMsgInOut.content + '\n' + messageContent;
                        return; // 跳过push，已合并到上一条
                    }
                    
                    // 安全地获取content预览（处理字符串和数组两种情况）
                    const getPrevContentPreview = () => {
                        if (Array.isArray(lastMsgInOut.content)) {
                            return `[Vision API: ${lastMsgInOut.content.length} items]`;
                        }
                        return lastMsgInOut.content.substring(0, 40);
                    };
                    
                    const getCurrContentPreview = () => {
                        if (Array.isArray(messageContent)) {
                            return `[Vision API: ${messageContent.length} items]`;
                        }
                        if (!messageContent) {
                            return '[Empty content]';
                        }
                        return String(messageContent).substring(0, 40);
                    };
                    
                    console.warn(`[API消息警告] 第 ${index + 1} 条消息与前一条消息角色相同（都是 ${roleToUse}）`, {
                        prevMsg: { content: getPrevContentPreview() },
                        currMsg: { type: m.type, content: getCurrContentPreview() }
                    });
                }
            }
            
            // 群聊消息：为received消息添加发送者角色名前缀
            if (conv.type === 'group' && roleToUse === 'assistant' && m.groupSenderName && typeof messageContent === 'string') {
                messageContent = `【${m.groupSenderName}】${messageContent}`;
            }
            
            out.push({ role: roleToUse, content: messageContent });
        });

        // 末尾对话状态提示（提高模型对“用户未回复”的识别）
        if (lastNonSystemRole === 'assistant') {
            out.push({
                role: 'system',
                content: '【对话状态】用户尚未回复上一条消息。请不要把用户当作已回复来继续对话，请继续主动发送下一条消息。'
            });
        }


        // 检查是否需要添加系统触发消息
        // 情况1：空历史对话（没有用户消息）
        // 情况2：只有assistant消息，没有用户消息
        const hasUserMessage = out.some(m => m.role === 'user');
        if (!hasUserMessage) {
            console.log('⚠️ 检测到没有用户消息，添加系统触发消息');
            out.push({
                role: 'system',
                content: '【开始对话】请主动发送开场白与用户开始对话。'
            });
        }

        if (skippedCount > 0) {
            console.log(`📝 已跳过 ${skippedCount} 条已总结的消息，包含 ${includedCount} 条最新消息`);
        }

        return out;
    },

    /**
     * 清理和验证消息，移除无效的消息
     * @param {Array} messages - 原始消息列表
     * @returns {Array} 清理后的有效消息列表
     */
    cleanAndValidateMessages: function(messages) {
        if (!messages || messages.length === 0) return [];
        
        const cleaned = [];
        
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            
            // 检查基本属性
            if (!msg || !msg.role) {
                console.warn(`⚠️ 跳过消息 ${i}: 缺少必需属性`);
                continue;
            }
            
            // 检查角色是否有效
            if (!['system', 'user', 'assistant'].includes(msg.role)) {
                console.warn(`⚠️ 跳过消息 ${i}: 无效的角色 "${msg.role}"`);
                continue;
            }
            
            // 处理content
            let validContent = null;
            
            if (Array.isArray(msg.content)) {
                // Vision API 格式：content 是数组
                if (msg.content.length === 0) {
                    console.warn(`⚠️ 跳过消息 ${i}: content 数组为空`);
                    continue;
                }
                
                // 验证数组中的每个元素
                const validItems = msg.content.filter(item => {
                    if (!item || !item.type) return false;
                    
                    if (item.type === 'text') {
                        return item.text && typeof item.text === 'string' && item.text.trim().length > 0;
                    }
                    
                    if (item.type === 'image_url') {
                        return item.image_url && item.image_url.url && typeof item.image_url.url === 'string';
                    }
                    
                    return false;
                });
                
                if (validItems.length === 0) {
                    console.warn(`⚠️ 跳过消息 ${i}: content 数组中没有有效项`);
                    continue;
                }
                
                validContent = validItems;
            } else if (typeof msg.content === 'string') {
                // 字符串格式
                const trimmed = msg.content.trim();
                if (trimmed.length === 0) {
                    console.warn(`⚠️ 跳过消息 ${i}: content 为空字符串`);
                    continue;
                }
                validContent = trimmed;
            } else if (msg.content === null || msg.content === undefined) {
                console.warn(`⚠️ 跳过消息 ${i}: content 为 null 或 undefined`);
                continue;
            } else {
                // 尝试转换为字符串
                try {
                    const str = String(msg.content).trim();
                    if (str.length === 0 || str === '[object Object]') {
                        console.warn(`⚠️ 跳过消息 ${i}: content 无法转换为有效字符串`);
                        continue;
                    }
                    validContent = str;
                } catch (e) {
                    console.warn(`⚠️ 跳过消息 ${i}: content 转换失败`, e);
                    continue;
                }
            }
            
            // 添加清理后的消息
            cleaned.push({
                role: msg.role,
                content: validContent
            });
        }
        
        console.log(`✅ 消息清理完成: 原始 ${messages.length} 条 → 有效 ${cleaned.length} 条`);
        return cleaned;
    },
    
    /**
     * 验证请求体是否符合API规范
     * @param {Object} body - 请求体对象
     * @returns {boolean} 是否有效
     */
    validateRequestBody: function(body) {
        if (!body) {
            console.error('❌ 请求体为空');
            return false;
        }
        
        if (!body.model || typeof body.model !== 'string') {
            console.error('❌ 无效的 model 参数:', body.model);
            return false;
        }
        
        if (!Array.isArray(body.messages)) {
            console.error('❌ messages 必须是数组');
            return false;
        }
        
        if (body.messages.length === 0) {
            console.error('❌ messages 数组为空');
            return false;
        }
        
        // 验证每条消息
        for (let i = 0; i < body.messages.length; i++) {
            const msg = body.messages[i];
            
            if (!msg.role || !['system', 'user', 'assistant'].includes(msg.role)) {
                console.error(`❌ 消息 ${i} 角色无效:`, msg.role);
                return false;
            }
            
            if (msg.content === undefined || msg.content === null) {
                console.error(`❌ 消息 ${i} content 为空`);
                return false;
            }
            
            if (typeof msg.content === 'string' && msg.content.trim().length === 0) {
                console.error(`❌ 消息 ${i} content 为空字符串`);
                return false;
            }
            
            if (Array.isArray(msg.content) && msg.content.length === 0) {
                console.error(`❌ 消息 ${i} content 数组为空`);
                return false;
            }
        }
        
        // 验证参数范围
        if (body.temperature !== undefined && (typeof body.temperature !== 'number' || body.temperature < 0 || body.temperature > 2)) {
            console.error('❌ temperature 参数超出范围 (0-2):', body.temperature);
            return false;
        }
        
        if (body.top_p !== undefined && (typeof body.top_p !== 'number' || body.top_p < 0 || body.top_p > 1)) {
            console.error('❌ top_p 参数超出范围 (0-1):', body.top_p);
            return false;
        }
        
        console.log('✅ 请求体验证通过');
        return true;
    },

    /**
     * 验证消息列表的角色标记是否正确
     */
    validateApiMessageList: function(messages) {
        if (!messages || messages.length === 0) return { isValid: true, errors: [] };
        
        const errors = [];
        let lastRole = null;
        let consecutiveCount = 0;
        
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            
            // 检查消息是否具有必需的属性
            // content 可以是字符串或数组（Vision API格式）
            if (!msg.role || (msg.content === undefined || msg.content === null)) {
                errors.push(`消息 ${i}: 缺少 role 或 content 属性`);
                continue;
            }
            
            // 如果content是数组，检查是否为空
            if (Array.isArray(msg.content) && msg.content.length === 0) {
                errors.push(`消息 ${i}: content 数组为空`);
                continue;
            }
            
            // 检查角色值是否有效
            if (!['system', 'user', 'assistant'].includes(msg.role)) {
                errors.push(`消息 ${i}: 无效的角色值 "${msg.role}",应为 system/user/assistant`);
            }
            
            // 检查相邻非 system 消息不应该角色相同
            if (msg.role !== 'system') {
                if (lastRole === msg.role) {
                    consecutiveCount++;
                    if (consecutiveCount > 0) {
                        errors.push(`消息 ${i}: 与前${consecutiveCount}条消息角色相同（都是 ${msg.role}）,这可能导致 API 混淆`);
                    }
                } else {
                    consecutiveCount = 0;
                    lastRole = msg.role;
                }
            }
        }
        
        if (errors.length > 0) {
            console.warn('[API 消息验证警告]', errors);
            return { isValid: true, errors: errors, hasWarnings: true };
        }
        
        return { isValid: true, errors: [], hasWarnings: false };
    },

    /**
     * 拉取主API模型列表
     */
    fetchModels: async function() {
        const endpoint = (document.getElementById('api-endpoint') || {}).value || this.AppState.apiSettings.endpoint || '';
        const apiKey = (document.getElementById('api-key') || {}).value || this.AppState.apiSettings.apiKey || '';

        if (!endpoint) { 
            this.showToast('请先填写 API 端点'); 
            return; 
        }
        
        // 显示加载提示框
        this.showLoadingOverlay('正在拉取主API模型...');

        // 规范化端点
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
                const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时
                
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
                    console.warn('[线上模式] fetch models failed:', url, lastError);
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
                    lastError = '请求超时（5分钟）';
                    console.error('❌ [线上模式] 拉取模型列表超时:', url);
                } else if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
                    lastError = 'CORS 错误或网络问题。请检查 API 端点是否正确';
                    console.error('[线上模式] fetch models CORS/network error:', url, e);
                } else {
                    lastError = e.message;
                    console.warn('[线上模式] fetch models failed:', url, e);
                }
            }
        }
        
        if (models.length === 0) {
            this.hideLoadingOverlay();
            const msg = lastError ? `未能拉取到模型：${lastError}` : '未能拉取到模型,请检查端点与密钥';
            this.showToast(msg);
            console.error('[线上模式] 获取模型列表失败');
            return;
        }

        this.AppState.apiSettings = this.AppState.apiSettings || {};
        this.AppState.apiSettings.models = models;
        this.AppState.apiSettings.selectedModel = models[0].id;
        this.saveToStorage();

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
            sel.value = this.AppState.apiSettings.selectedModel;
        }
        if (display) display.textContent = this.AppState.apiSettings.selectedModel || '未选择';
        
        this.hideLoadingOverlay();
        this.showToast('[线上模式] 已拉取到 ' + models.length + ' 个模型');
    }
};

// 导出到全局
window.MainAPIManager = MainAPIManager;
