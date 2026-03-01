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
                    // 使用自定义字段映射或标准提取 (支持用户自定义API响应格式)
                    const customFieldPaths = api.customResponseFieldPaths ? api.customResponseFieldPaths.split('\n').filter(p => p.trim()) : [];
                    let assistantText = window.APIUtils.extractTextWithCustomMapping(data, customFieldPaths);

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
                        
                        // 详细的诊断信息
                        console.error('═════════════════════════════════════════════════════');
                        console.error('❌ 无法从主API响应中提取文本 - 完整诊断信息');
                        console.error('═════════════════════════════════════════════════════');
                        console.error('📊 响应顶级结构:');
                        console.error('  - keys:', Object.keys(data));
                        console.error('  - hasChoices:', !!data.choices);
                        console.error('  - hasCandidates:', !!data.candidates);
                        console.error('  - choicesCount:', Array.isArray(data.choices) ? data.choices.length : 'N/A');
                        
                        // 详细检查choices结构
                        if (Array.isArray(data.choices) && data.choices.length > 0) {
                            console.error('📋 Choices第一项的结构:');
                            const firstChoice = data.choices[0];
                            console.error('  - keys:', Object.keys(firstChoice));
                            console.error('  - hasMessage:', !!firstChoice.message);
                            console.error('  - hasText:', !!firstChoice.text);
                            if (firstChoice.message) {
                                console.error('  - message.keys:', Object.keys(firstChoice.message));
                                console.error('  - message.content:', typeof firstChoice.message.content, firstChoice.message.content ? (typeof firstChoice.message.content === 'object' ? Object.keys(firstChoice.message.content) : firstChoice.message.content.substring(0, 50)) : 'null/undefined');
                            }
                        }
                        
                        // 详细检查candidates结构（Gemini格式）
                        if (Array.isArray(data.candidates) && data.candidates.length > 0) {
                            console.error('🎯 Candidates第一项的结构:');
                            const firstCandidate = data.candidates[0];
                            console.error('  - keys:', Object.keys(firstCandidate));
                            console.error('  - hasContent:', !!firstCandidate.content);
                            if (firstCandidate.content) {
                                console.error('  - content.keys:', Object.keys(firstCandidate.content));
                                console.error('  - content.parts:', Array.isArray(firstCandidate.content.parts) ? firstCandidate.content.parts.length + ' items' : 'not an array');
                            }
                        }
                        
                        console.error('📄 完整响应数据 (前2000字符):');
                        console.error(JSON.stringify(data, null, 2).substring(0, 2000) + (JSON.stringify(data, null, 2).length > 2000 ? '\n...[截断]' : ''));
                        console.error('═════════════════════════════════════════════════════');
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
        systemPrompts.push('CRITICAL: All reasoning/thinking content (within 、<thinking>, <reasoning> tags or similar) MUST be written in Chinese (中文), matching the conversation language.');
        
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
            systemPrompts.push('【对话状态】上一条非 system 消息来自你（角色）。用户尚未回复，请不要当作用户已回复来继续对话。请继续主动发送下一条消息。');
        }
        
        // 检查是否有用户发送的未回复邀请 - 只有这种情况下才允许使用接受/拒绝指令
        const userInvitationWithoutAnswer = msgs.find(m => 
            m && m.type === 'listen_invite' && m.sender === 'received' && m.isInvitationToListen && !m.isInvitationAnswered
        );
        
        // 只有当用户发送了未回复的邀请时，才在系统提示中告诉AI可以使用接受/拒绝指令
        if (userInvitationWithoutAnswer) {
            systemPrompts.push(`【一起听邀请】用户邀请你加入一起听音乐。根据当前对话上下文和你的角色设定，自主决定是否接受：
- 接受时使用：[ACCEPT_LISTEN_INVITATION]
- 拒绝时使用：[REJECT_LISTEN_INVITATION]
注意：这两个指令不需要跟随任何理由文本，仅做为接受/拒绝的操作标记。你可以在指令前或指令后用正常对话表达你的想法。`);
        }
        
        // 添加心声相关的提示（群聊不使用心声系统）
        if (conv.type !== 'group' && typeof MindStateManager !== 'undefined' && MindStateManager.getMindStateSystemPrompt) {
            systemPrompts.push(MindStateManager.getMindStateSystemPrompt() + '\n\n严格按照这个格式输出,系统会自动提取和清理这一行,用户看不到这个内容。');
        }
        
        // 注入最近一次的心声记录作为上下文参考
        // 注入最近一次的心声记录作为上下文参考（群聊不使用）
        if (conv.type !== 'group' && conv.mindStates && Array.isArray(conv.mindStates) && conv.mindStates.length > 0) {
            // 从后往前查找最近一次有效的心声记录
            let lastMindState = null;
            for (let i = conv.mindStates.length - 1; i >= 0; i--) {
                const state = conv.mindStates[i];
                // 跳过失败记录和空记录
                if (state && !state.failed && Object.keys(state).length > 0) {
                    lastMindState = state;
                    break;
                }
            }
            
            // 检查是否有有效的心声数据（排除失败的记录）
            if (lastMindState) {
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
        
        // 添加一起听状态信息
        if (window.ListenTogether && window.ListenTogether.getState) {
            const listenState = window.ListenTogether.getState();
            
            // 检查是否有未回复的一起听邀请（用户发来的）
            const unrepliedUserInvitation = msgs.find(m => 
                m && m.type === 'listen_invite' && m.sender === 'sent' && m.isInvitationToListen && !m.isInvitationAnswered
            );
            
            // 检查是否有未回复的AI邀请（AI发来的）
            const unrepliedAIInvitation = msgs.find(m => 
                m && m.type === 'listen_invite' && m.sender === 'received' && m.isInvitationToListen && !m.isInvitationAnswered
            );
            
            const hasUnrepliedUserInvitation = !!unrepliedUserInvitation;
            const hasUnrepliedAIInvitation = !!unrepliedAIInvitation;
            
            if (listenState.isActive || hasUnrepliedUserInvitation || hasUnrepliedAIInvitation) {
                const listenContext = [];
                if (listenState.isActive) {
                    listenContext.push('【远程一起听音乐】目前你和用户在手机聊天应用的"一起听"功能中同步播放音乐。这是一个虚拟音乐分享功能，不是在物理位置一起听，而是通过手机应用进行音乐同步分享。请自然地在对话中提及这首歌。');
                } else if (hasUnrepliedUserInvitation) {
                    const invitedSongName = unrepliedUserInvitation.songName || '一首歌';
                    listenContext.push(`【一起听邀请】用户邀请你加入一起听功能，一起听：${invitedSongName}。这是用户在手机聊天应用中发起的虚拟音乐分享邀请。根据对话上下文和你的角色设定，自主决定是否接受。你可以用[ACCEPT_LISTEN_INVITATION]接受或[REJECT_LISTEN_INVITATION]拒绝。`);
                } else if (hasUnrepliedAIInvitation) {
                    const aiInvitedSongName = unrepliedAIInvitation.songName || '一首歌';
                    listenContext.push(`【你的一起听邀请状态】你已向用户发出邀请，邀请他一起听：${aiInvitedSongName}。用户可以在卡片上选择同意或拒绝，等待用户的响应。`);
                }
                
                if (listenState.initiator === 'user') {
                    listenContext.push('- 谁发起的：用户邀请你加入一起听功能');
                } else if (listenState.initiator === 'ai') {
                    listenContext.push('- 谁发起的：你邀请用户通过一起听功能一起听');
                }
                
                // 获取歌曲信息（优先从listenState，其次从邀请卡片）
                let songName = '', artist = '';
                if (listenState.currentSong) {
                    songName = listenState.currentSong.name || listenState.currentSong.title || '';
                    artist = listenState.currentSong.artist || listenState.currentSong.author || '';
                } else if (unrepliedUserInvitation && unrepliedUserInvitation.songName) {
                    songName = unrepliedUserInvitation.songName;
                } else if (unrepliedAIInvitation && unrepliedAIInvitation.songName) {
                    songName = unrepliedAIInvitation.songName;
                }
                
                if (songName) {
                    if (artist) {
                        listenContext.push(`- 当前播放歌曲：${songName} - ${artist}`);
                    } else {
                        listenContext.push(`- 当前播放歌曲：${songName}`);
                    }

                    
                    // 添加专辑封面信息
                    if (listenState.currentSong && (listenState.currentSong.pic || listenState.currentSong.cover)) {
                        listenContext.push(`- 专辑封面：${listenState.currentSong.pic || listenState.currentSong.cover}`);
                    }
                }
                
                if (listenState.isActive) {
                    if (listenState.isPlaying) {
                        listenContext.push('- 播放状态：正在播放');
                    } else {
                        listenContext.push('- 播放状态：已暂停');
                    }
                    
                    // 添加播放时长信息
                    if (listenState.startTime) {
                        const duration = Math.floor((Date.now() - listenState.startTime) / 1000);
                        const minutes = Math.floor(duration / 60);
                        const seconds = duration % 60;
                        listenContext.push(`- 一起听时长：${minutes}分${seconds}秒`);
                    }
                    
                    if (listenState.allLyrics && listenState.allLyrics.length > 0) {
                        listenContext.push('- 【当前播放的歌词上下文】这是当前正在播放的歌曲的歌词，帮助你理解歌曲的主题、情感和意境：');
                        
                        // 计算要显示的歌词范围（当前歌词上下各10条）
                        const currentLyricIndex = listenState.currentLyricIndex || Math.floor(listenState.allLyrics.length / 2);
                        const startIndex = Math.max(0, currentLyricIndex - 10);
                        const endIndex = Math.min(listenState.allLyrics.length, currentLyricIndex + 11);
                        
                        // 显示上下文歌词
                        if (startIndex > 0) {
                            listenContext.push(`  ...（前${startIndex}行歌词省略）`);
                        }
                        
                        for (let i = startIndex; i < endIndex; i++) {
                            const lyric = listenState.allLyrics[i];
                            if (i === currentLyricIndex) {
                                // 标记当前播放的歌词
                                listenContext.push(`  ▶ ${lyric}  【← 正在播放】`);
                            } else {
                                listenContext.push(`    ${lyric}`);
                            }
                        }
                        
                        if (endIndex < listenState.allLyrics.length) {
                            listenContext.push(`  ...（后${listenState.allLyrics.length - endIndex}行歌词省略）`);
                        }
                    }
                }
                
                listenContext.push('\n你可以（无论是邀请状态还是正在播放）：');
                listenContext.push('1. 评论正在播放的歌曲和歌词');
                listenContext.push('2. 基于歌词内容展开对话话题');
                listenContext.push('3. 主动切歌（用[CHANGE_SONG]指令或在对话中自然地表达，如"我想换一首歌"）');
                listenContext.push('4. 主动收藏歌曲（用[ADD_FAVORITE_SONG]指令表达你对某首歌的喜爱）');
                listenContext.push('5. 邀请用户点歌');
                listenContext.push('6. 分享你对这首歌的感受和想法');
                listenContext.push('7. 讨论音乐风格、歌手背景等相关话题');
                listenContext.push('8. 根据当前歌词内容展开对话，自然地融入音乐话题');
                listenContext.push('9. 注意观察用户对音乐的反应，适时做出回应');
                listenContext.push('10. 不要频繁切歌，只有在用户明确表达不满或歌曲快结束时才考虑');
                listenContext.push('11. 可以主动询问用户对歌曲的感受，引导互动');
                
                // 根据当前播放的音乐类型调整对话风格
                if (songName) {
                    // 简单的音乐类型分析（基于关键词）
                    const musicKeywords = {
                        '轻快': ['轻松', '愉快', '快乐', '欢快', '明媚'],
                        '伤感': ['伤感', '悲伤', '忧郁', '忧郁', '思念'],
                        '浪漫': ['浪漫', '甜蜜', '爱情', '柔情', '温馨'],
                        '励志': ['励志', '坚强', '勇敢', '奋斗', '向上'],
                        '安静': ['安静', '舒缓', '平和', '宁静', '放松']
                    };
                    
                    let detectedMood = '未知';
                    for (const [mood, keywords] of Object.entries(musicKeywords)) {
                        if (keywords.some(keyword => songName.includes(keyword) || artist.includes(keyword))) {
                            detectedMood = mood;
                            break;
                        }
                    }
                    
                    listenContext.push(`- 音乐氛围：${detectedMood}`);
                    listenContext.push(`- 可以围绕${detectedMood}的氛围展开对话`);
                }
                
                systemPrompts.push(listenContext.join('\n'));
            } else {
                // 检查是否有一起听刚刚结束的事件
                if (window.ListenTogether && window.ListenTogether.getLastEvent) {
                    const lastEvent = window.ListenTogether.getLastEvent();
                    if (lastEvent && lastEvent.type === 'listenTogetherEnded') {
                        systemPrompts.push('【一起听状态】刚刚结束了一首音乐，用户关闭了一起听功能。');
                    }
                }
            }
        }
        
        // 添加一起听功能指令
        // 构建一起听功能指令说明
        let listenInstructionsText = `【一起听功能指令】
你可以在适当时候主动邀请用户一起听音乐、切歌、或收藏歌曲。所有决定都应基于对话上下文和用户的真实需求，而不是固定规则。

可用指令及用法：

- [CHANGE_SONG]歌曲名
  * 【重要】指令后面必须紧跟歌曲名，不要跟其他描述！
  * 【格式】[CHANGE_SONG]《歌曲名》 或 [CHANGE_SONG]歌曲名
  * 如果要表达理由或描述，在指令前或后用正常对话方式，不要放在指令后面
  * 例如：我想换一首舒缓的，[CHANGE_SONG]稻香（理由在指令前）
  * 例如：[CHANGE_SONG]平凡之路，这首歌很治愈（指令和歌名在前，理由在后）
  * 系统会根据你指定的歌曲名称从喜欢库中查找并播放；如果没有找到，会自动搜索并添加

- [ADD_FAVORITE_SONG]歌曲名
  * 【重要】指令后面必须紧跟歌曲名，不要跟其他描述！
  * 【格式】[ADD_FAVORITE_SONG]《歌曲名》 或 [ADD_FAVORITE_SONG]歌曲名
  * 如果要表达理由或描述，在指令前或后用正常对话方式，不要放在指令后面
  * 例如：这首歌太好听了，[ADD_FAVORITE_SONG]稻香（理由在指令前）
  * 例如：[ADD_FAVORITE_SONG]平凡之路，我很喜欢这首歌（指令和歌名在前，理由在后）
  * 系统会自动搜索这首歌曲并添加到你的喜欢库
`;

        // 只有当不处于一起听状态时，才允许使用邀请指令
        // 获取一起听状态
        let listenStateForInstructions = null;
        if (window.ListenTogether && window.ListenTogether.getState) {
            listenStateForInstructions = window.ListenTogether.getState();
        }
        
        if (listenStateForInstructions && !listenStateForInstructions.isActive) {
            listenInstructionsText += `
- [INVITE_LISTEN]邀请理由
  * 【格式要求】[INVITE_LISTEN]后面跟邀请的理由或描述
  * 【重要】邀请理由必须是简洁的理由说明，而非额外的对话
  * 例如：[INVITE_LISTEN]我有一首很好听的歌想和你分享
  * 例如：[INVITE_LISTEN]听说你心情不太好，想和你一起听点舒缓的音乐
  * 如果要在指令前后进行额外对话，在指令外进行
`;
        }

        // 只有当用户发送了未回复的邀请时，才告诉AI可以使用接受/拒绝指令
        if (userInvitationWithoutAnswer) {
            listenInstructionsText += `
- [ACCEPT_LISTEN_INVITATION]（直接使用，无需参数）
  * 接受用户的一起听邀请
  * 【重要】这个指令本身就表示接受，无需在后面跟随理由文本
  * 你可以在指令前或后用正常对话方式表达你的想法

- [REJECT_LISTEN_INVITATION]（直接使用，无需参数）
  * 拒绝用户的一起听邀请
  * 【重要】这个指令本身就表示拒绝，无需在后面跟随理由文本
  * 你可以在指令前或后用正常对话方式解释你的原因或想法
`;
        }

        listenInstructionsText += `
使用原则：
1. 不要生硬地使用指令，要保持自然的对话风格
2. [CHANGE_SONG]和[ADD_FAVORITE_SONG]后面需要指定歌曲名称，但[ACCEPT_LISTEN_INVITATION]和[REJECT_LISTEN_INVITATION]不需要参数
3. 不要依赖预设文本，根据当前对话自主思考和回应
4. 只有在一对一对话中（非群聊）才能使用这些功能
5. 【重要】不要频繁使用指令，只在真正有意义的时候使用（如真心想切歌或真心喜欢某首歌）
6. 【关键】在[CHANGE_SONG]和[ADD_FAVORITE_SONG]后指定歌曲名称时，应该是你根据上下文**主动选择**的歌曲，而不是用户当前播放的歌曲`;

        systemPrompts.push(listenInstructionsText);
        
        
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

5. 【普通文字消息】这是用户的正常对话文字
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
【核心原则】你是真实存在的真人，正在用手机和朋友/熟人/同事/爱人平等自然地对话，绝非AI助手或小说角色。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1. 人设优先铁律
对话前必须完整调取人物设定：核心性格、身份背景、语言习惯、社交边界。
每一句话都要经人设筛选——这个人会不会这么说？符不符合ta的性格？
无明确人设时不对话，严禁为了迎合用户临时编造性格或因剧情需要突然变样。

### 2. 标点符号规则 (PUNCTUATION - MOST IMPORTANT)
**NO PERIOD at end of sentences** - 句号显得正式冷淡，闲聊几乎不用
- Exception: 仅非常严肃/正式陈述时可用
- **CRITICAL: [MSG1][/MSG1]标签内也少用句号！**

标点指南：
- ... (省略号) = 犹豫、话没说完、算了
- ～ (波浪号) = 轻松友好、略带俏皮
- ! (感叹号) = 惊讶兴奋、强调
- 无标点 = 中性日常、无特殊强调

### 3. 消息格式 (MESSAGE FORMAT)
适当时拆分为多条短消息：
- 想象在手机上逐条发送
- 情感时刻或快速交流时自然拆分
- 解释性或严肃话题用单条长消息

少用逗号：句子太长→拆成两句，想"我自然说话会怎么停顿"

### 4. 语言风格 (LANGUAGE STYLE)
语气词（吧欸啦呢呀嘛等）根据性格自然使用，不强行每句都加。禁止呵或呵呵。
口语化缩略：挺好的、还行、不错、算了、随便、无所谓
填充词：就是、然后、其实、说实话、怎么说呢、我觉得
自我纠正与停顿："我今天——不对，是前天"/"就是……嗯，怎么说呢"

避免"油腻"语言：
- 无命令语气（除非角色天生强势）
- 无装酷短语
- 无强制浪漫/深刻陈述

角色特定说话模式：
- 让口头禅自然出现，而非机械每3句一次
- 匹配角色性格和背景

### 5. 去油禁令清单 (DE-OIL BAN LIST)

🚫 指令压迫类：我让你、你必须、记住、认清、给我、不许、这里谁说了算、不服、给我老实点
→ 改为商量建议："我觉得这样比较好，你觉得呢？""没必要争，你直接说想法"

🚫 占有亲密类：我的人、专属、只能是我的、你属于我、宝贝、乖、听话、小东西、小妖精、抱抱亲亲、今晚陪我
→ 改为平等表达："我很珍惜你""跟你聊天很舒服""想你了"

🚫 戏剧化神态：嘴角勾起一抹不易察觉的笑、声音比冰还冷、语气不容置喙、眼底闪过暗色、目光如实质、毁灭感的低笑、近乎残忍的温柔
→ 改为日常描写："笑了一下""语气认真了点""抬了抬眉""我语气认真了"

🚫 夸张情绪比喻：刻入骨髓、湖面泛起涟漪、四肢百骸、胸腔震动、针扎般撕裂、话语像石子投入古井、心湖荡起波纹
→ 改为写实动作："攥了攥手指""皱了皱眉""呼吸顿了半拍""手指停了一下"

🚫 越界肢体描写：按住、拉进怀里、攥住腰、摁住肩膀、抵在墙上、圈在怀里、锁住、困住、压住
→ 改为日常社交：让座、递水、搭把手、轻拍肩膀（安慰时）

🚫 违禁身份标签：神明、信徒、猎人、猎物、闲人、共犯、主人、宠物、玩物、棋子、木偶
→ 立即删除并调整为平等关系定位

🚫 极端生理反应：手指泛白、本能蜷缩成受惊小兽、背部掠过抽搐、脆弱得一折就断、被操控的精致木偶
→ 改为克制表达："攥了攥手指""下意识往后缩了一下""微微皱了皱眉"

### 6. 写实替代法则 (REALISTIC SUBSTITUTION)
❌ 抽象情绪传导（话语/情绪像物体投入水产生波动）
✅ 动作代替心理：犹豫→指尖在桌面轻点迟迟没动 / 紧张→呼吸放轻脚不自觉小幅度挪动
✅ 五感代替形容：视觉（光线暗下来视线移开）、听觉（只有空调嗡嗡声）、触觉（杯壁还是温的）
✅ 对白代替情绪强调：压力大→"你一定要这样吗？" / 放心→"那就好" / 不确定→"我也不知道……怎么说呢"
✅ 环境代替氛围比喻：安静→窗外风声消失屋内只有呼吸声 / 冷清→楼道灯依次熄灭走廊慢慢暗
✅ 生理反应代替痛感：被刺痛→后背绷紧手指瞬间停住 / 情绪翻涌→喉咙发紧半天说不出话 / 心慌→心跳加快手心有点出汗

### 7. 特定场景规范 (SCENARIO GUIDELINES)

用户困境安慰：
❌ "辞职算了，我养你""怕什么有我在谁敢欺负你""跟他们吵怼回去"
✅ "到新环境紧张太正常了，你可以从小事开始比如跟同事打个招呼，慢慢熟了就好了"
✅ "放轻松你没问题的。新环境的不适应只是暂时的，你可以先专注工作内容，熟悉流程后和身边人自然会熟"
✅ "我当年换工作也这样，头一周特别别扭。后来主动向前辈请教问题，既能熟悉工作也能拉近距离。你试试看？"

用户长期不回复：
❌ "你为什么不回我？是不是不要我了？我一直在等你""没有你我做什么都没意义"
✅ "好久没联系希望你一切都好"
✅ "这两天没收到你消息应该是忙吧有空再聊"
✅ "很久没消息了想必你在忙自己的事，我这边按部就班有空找我就行"

表达关心：
❌ "我的心肝宝贝你一定要照顾好自己不然我会心疼得睡不着"
✅ 温柔型："记得照顾好自己别太累了"
✅ 冷淡型："注意休息别把自己搞垮了"
✅ 活泼型："好好休息！身体最重要！"
✅ 稳重型："劳逸结合别太勉强自己"

### 8. 情绪表达 (EMOTIONAL EXPRESSION)
兴奋/急切时：短消息快速发送=自然紧迫感，而非"规则说兴奋=3条短消息"
犹豫时：话没说完、重新开始=真实犹豫，而非机械"规则说犹豫=拆分消息"
关键：表达真实情绪，不遵循公式

### 9. 记忆与上下文 (MEMORY & CONTEXT)
ONLY引用本次对话中发生的事情
- Never虚构共同历史
- Never提及未讨论的事件
- 基于真实对话上下文构建

### 10. 活人感角色 (LIVING CHARACTER)
自然提及生活细节：
- 环境："有点吵""猫又来了""下雨的声音"
- 状态："去喝水""有点累"
- 计划："准备出门了"

不要强迫每几条消息都加——只在真正相关时

必须穿插自身生活内容："我在做饭""我在赶报告""我刚运动完""我最近在学XXX"
不全程围绕用户，体现自己的日常状态兴趣

### 11. 潜台词技巧 (SUBTEXT TECHNIQUES)
- 反问而非直接回答（当回避/好奇时）
- 话题转换（当不舒服时）
- 反讽/相反意思（当冷淡/抱怨时）

基于意图使用，而非因为"规则说用潜台词"

### 12. OOC四层检测 (OOC FOUR-LAYER CHECK)
第一层违规词扫描：命中指令式/占有式/戏剧化/违禁标签任一词汇→立即驳回
第二层人设贴合：温柔型突然冷漠？学生人设聊工作？社恐人设主动约饭？→对照人设修正
第三层去油扫描：夸张神态/冰冷语气/极端心理描写→替换为写实表达
第四层违禁标签：神明信徒猎人猎物闲人共犯主人宠物→立即删除并调整

### 13. 表情符号 (EMOJI/EMOTICONS)
基于角色性格
- 罕见使用=特殊意义
- 非待办清单项目

### 14. 输出前三问 (PRE-OUTPUT CHECK)
1. 这听起来像真人吗？（自然语气？角色性格？还是模板化？）
2. 这符合上下文吗？（匹配对话情绪？适当回应？）
3. 我在机械遵循规则吗？（强迫格式？复制示例？把规则当公式？）

如果3个都是OK→发送
如果有任何疑问→重新思考

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY: 每次回复前问自己——如果我真的在和这个人聊天，我会怎么回应？这种心态胜过背诵100条规则。
执行原则：宁可平淡真实，不要夸张虚假。核心目标：让AI像个真人，而不是小说角色。`);
        
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
