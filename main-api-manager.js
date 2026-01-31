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
     * 调用主API进行对话
     */
    callApiWithConversation: async function() {
        if (!this.AppState.currentChat) {
            this.showToast('请先打开或创建一个聊天会话,然后双击头像触发。');
            return;
        }

        const convId = this.AppState.currentChat.id;
        const convState = getConversationState(convId);
        
        // 检查该对话是否已在进行API调用
        if (convState.isApiCalling) {
            this.showToast('正在等待上一次回复完成...');
            return;
        }

        const api = this.AppState.apiSettings || {};
        if (!api.endpoint || !api.selectedModel) { 
            this.showToast('请先在 API 设置中填写端点并选择模型'); 
            return; 
        }

        // 生成新的API调用回合ID
        this.currentApiCallRound = 'round_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        currentApiCallRound = this.currentApiCallRound; // 同步到全局

        // 标记该对话正在进行API调用
        convState.isApiCalling = true;
        convState.isTyping = true;
        
        setLoadingStatus(true);
        
        // 只在当前对话仍打开时显示正在打字中
        const updateTypingStatus = () => {
            if (this.AppState.currentChat && this.AppState.currentChat.id === convId) {
                const chatTitle = document.getElementById('chat-title');
                const chatTypingStatus = document.getElementById('chat-typing-status');
                if (chatTypingStatus) chatTypingStatus.style.display = 'inline-block';
                if (chatTitle) chatTitle.style.display = 'none';
            }
        };
        updateTypingStatus();

        // 规范化端点：移除末尾斜杠,并确保包含 /v1
        const normalized = api.endpoint.replace(/\/$/, '');
        const baseEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
        
        const apiKey = api.apiKey || '';
        const messages = this.collectConversationForApi(convId);
        
        // 验证消息列表的有效性
        const validation = this.validateApiMessageList(messages);
        if (validation.hasWarnings) {
            console.warn('API 消息列表存在警告,但仍然继续调用:', validation.errors);
        }
        
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
            timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时
            
            const fetchOptions = {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, apiKey ? { 'Authorization': 'Bearer ' + apiKey } : {}),
                body: JSON.stringify(body),
                signal: controller.signal
            };

            console.log('📤 [线上模式] 发送主API请求:', {
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

            console.log('📥 [线上模式] 主API响应状态:', res.status, res.statusText);

            if (!res.ok) {
                let errorDetails = '';
                try {
                    const errorData = await res.text();
                    if (errorData) {
                        errorDetails = errorData;
                        console.error('❌ API错误响应内容:', errorData);
                    }
                } catch (e) {
                    console.error('❌ 无法读取错误响应:', e);
                }
                
                lastError = `HTTP ${res.status}: ${res.statusText}${errorDetails ? '\n详情: ' + errorDetails.substring(0, 200) : ''}`;
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
                    let assistantText = this.extractTextFromApiResponse(data);

                    if (assistantText && assistantText.trim()) {
                        console.log('✨ 成功提取文本回复:', assistantText.substring(0, 100) + (assistantText.length > 100 ? '...' : ''));
                        appendAssistantMessage(convId, assistantText);
                        success = true;
                    } else {
                        lastError = '未在返回中找到文本回复';
                        console.error('❌ 无法从主API响应中提取文本。完整响应数据:');
                        console.error(JSON.stringify(data, null, 2));
                        console.error('响应keys:', Object.keys(data));
                    }
                }
            }
        } catch (err) {
            if (timeoutId) clearTimeout(timeoutId);
            
            if (err.name === 'AbortError') {
                lastError = 'API 请求超时（5分钟）- 模型响应时间过长';
                console.error('❌ 请求超时:', endpoint);
                console.error('超时详情: 请求已等待5分钟但未收到响应');
            } else if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                lastError = 'CORS 错误或网络连接问题。请检查 API 端点是否正确,或尝试使用支持 CORS 的代理';
                console.error('网络错误:', err.message);
            } else {
                lastError = err.message || '未知错误';
                console.error(`主API 调用出错:`, err);
            }
        }

        if (!success) {
            const errorMsg = lastError || '未知错误';
            
            // 显示详细的错误信息给用户
            this.showToast(`❌ 主API调用失败: ${errorMsg}`);
            
            // 在控制台输出完整的诊断信息
            console.error('═══════════════════════════════════════');
            console.error('❌ 主API调用失败 - 完整诊断信息');
            console.error('═══════════════════════════════════════');
            console.error('📍 API端点:', api.endpoint);
            console.error('🤖 使用模型:', api.selectedModel);
            console.error('💬 消息数量:', messages.length);
            console.error('❗ 错误信息:', errorMsg);
            console.error('🔍 请检查:');
            console.error('  1. API端点是否正确且可访问');
            console.error('  2. API密钥是否有效');
            console.error('  3. 所选模型是否支持');
            console.error('  4. 网络连接是否正常');
            console.error('  5. 是否存在CORS跨域问题');
            console.error('═══════════════════════════════════════');
        }

        // 清除对话的API调用状态
        convState.isApiCalling = false;
        convState.isTyping = false;
        
        // 只在当前对话仍打开时恢复UI
        if (this.AppState.currentChat && this.AppState.currentChat.id === convId) {
            const chatTitle = document.getElementById('chat-title');
            const chatTypingStatus = document.getElementById('chat-typing-status');
            if (chatTypingStatus) chatTypingStatus.style.display = 'none';
            if (chatTitle) chatTitle.style.display = 'inline';
        }
        
        setLoadingStatus(false);
    },

    /**
     * 从API响应中提取文本内容
     */
    extractTextFromApiResponse: function(data) {
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
            
        let assistantText = '';
        
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

        return assistantText;
    },

    // ========== 辅助函数 ==========
    
    /**
     * 从文本中提取性别信息
     */
    extractGenderInfo: function(text) {
        if (!text) return null;
        const femaleKeywords = ['女', '女生', '女孩', '妹妹', '母', '她'];
        const maleKeywords = ['男', '男生', '男孩', '哥哥', '父', '他'];
        
        const femaleCount = femaleKeywords.filter(k => text.includes(k)).length;
        const maleCount = maleKeywords.filter(k => text.includes(k)).length;
        
        if (femaleCount > maleCount) return '女';
        if (maleCount > femaleCount) return '男';
        return null;
    },
    
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

        // 首先添加强制性的系统提示词
        const systemPrompts = [];
        
        // 强制AI读取角色名称和性别
        if (conv.name) {
            systemPrompts.push(`你将角色扮演一个名字叫做"${conv.name}"的人类,绝对禁止out of character。`);
        }
        
        // 从角色描述中提取性别信息
        const charGender = this.extractGenderInfo(conv.description) || '未指定';
        systemPrompts.push(`角色性别：${charGender}`);
        
        // 强制AI读取角色人设
        if (conv.description) {
            const replacedDescription = this.replaceNamePlaceholders(conv.description, userNameToUse, charName);
            systemPrompts.push(`你扮演的人设描述如下：${replacedDescription}`);
        }
        
        // 强制AI读取用户名称
        if (userNameToUse) {
            systemPrompts.push(`你对面的用户的名字是"${userNameToUse}"。`);
        }
        
        // 从用户人物设定中提取性别信息
        const userGender = this.extractGenderInfo(this.AppState.user && this.AppState.user.personality) || '未指定';
        systemPrompts.push(`用户性别：${userGender}`);
        
        // 添加用户人物设定
        if (this.AppState.user && this.AppState.user.personality) {
            const replacedPersonality = this.replaceNamePlaceholders(this.AppState.user.personality, userNameToUse, charName);
            systemPrompts.push(`用户人物设定：${replacedPersonality}`);
        }
        
        // 添加心声相关的提示
        systemPrompts.push(`【重要】必须每次在回复最后添加以下格式的心声信息,不能省略、不能变更格式、不能使用多消息格式：

【心声】穿搭：{描述角色的服装、配饰、整体风格与细节。要求：符合角色设定,场景合理,细节具体。举例参考：'上身穿着一件淡蓝色的棉麻衬衫,袖口微微卷起；下装是深灰色的休闲九分裤,脚踩一双白色帆布鞋。左手腕系着一条编织红绳,胸前挂着一枚小小的银杏叶胸针。整体风格干净简约,带着几分慵懒随性。'} 心情：{描述角色当前的情绪状态。要求：细腻真实,可包含矛盾情绪,用比喻或意象增强画面感。举例参考：'平静中带着一丝雀跃,像是阴天里透过云层洒下的微弱阳光。上午的事情顺利完成,下午还有期待已久的独处时间。内心有些小满足,但表面上依然维持着淡漠从容的样子。'} 动作：{描述角色正在进行或习惯性的小动作。要求：自然流畅,体现角色性格,符合当前场景。举例参考：'靠在窗边的懒人沙发上,手指无意识地轻轻敲击着扶手。偶尔抬头望向窗外,似乎在思考什么,又像只是单纯地发呆。翻开一半的书放在手边,茶杯里的水已经凉透了。'} 心声：{角色内心未说出口的想法。要求：真实、细腻,可包含矛盾、犹豫、期待等复杂情绪举例参考：'今天的阳光真好,要是能一直这样就好了。那件事要不要找个机会说出口呢？其实……有点在意他今天说的那句话。'} 坏心思：{角色偷偷打的算盘、恶作剧念头、或不愿让他人知道的小计划。要求：符合人设,带点狡黠或俏皮。举例参考：'计划偷偷把冰箱里的蛋糕吃掉,然后嫁祸给那只经常来窗台的流浪猫。打算在朋友面前装作若无其事,其实早就猜到了他要说的惊喜是什么。如果明天有人问起,就说自己一整天都在看书,什么都没做。'} 好感度：{0-100的整数} 好感度变化：{变化数值,增减的数值都不可超过3,如+3或-2或0} 好感度原因：{简短说明,20字以内,举例参考：'对当前话题感到无趣且烦躁'}

IMPORTANT REQUIREMENTS FOR 心声 (Mind State):
1. 心声MUST be placed at the very end of your response on a separate line
2. Do NOT split this into multiple [MSG] blocks - 心声 must be in the SAME response as your main dialogue
3. Format must be EXACTLY: 【心声】[all fields on one line separated by spaces]
4. All fields MUST have content, NO empty fields
5. Use Chinese colons 【：】not English colons【:】
6. Example format: 【心声】穿搭：details here... 心情：details here... 动作：details here... 心声：details here... 坏心思：details here... 好感度：75 好感度变化：+5 好感度原因：互相理解
7. CRITICAL: DO NOT use [MSG1][/MSG1] or [WAIT] format for the 心声 section
8. Your main dialogue CAN be split into multiple messages, but 心声 must always be at the very end as ONE complete line

严格按照这个格式输出,系统会自动提取和清理这一行,用户看不到这个内容。`);
        
        // 添加用户消息类型识别说明
        systemPrompts.push(`【用户内容识别规则】用户可能发送以下类型的内容,你需要正确识别并做出相应回应：

1. 【表情包消息】格式为：[用户发送了表情包: 表情描述文字]
   - 用户发送的是预设的表情包,你需要识别并了解其情绪含义
   - 例如："[用户发送了表情包: 开心]" 表示用户当前心情很开心
   - 对于表情包消息,分析其代表的情绪并在回复中予以回应
   - 不需要询问"你发送的表情是什么意思",直接按照表情含义理解

2. 【图片消息】格式为：[用户发送了一张图片,图片内容：data:image/...]
   - 用户发送的是真实图片（如照片、截图、绘画）
   - 图片内容以Base64编码格式传输,你需要进行图片分析
   - 请描述图片中看到的内容、分析其背景和上下文
   - 必要时可基于图片内容给出建议或进行评论
   - 如果用户在"用户对图片的描述"中补充了说明,请结合该描述分析

3. 【普通文字消息】这是用户的正常对话文字
   - 直接理解和回应用户的文字内容

记住：表情包是情绪表达工具,图片是视觉内容；处理时方式完全不同。`);

        // 添加新的多消息回复格式说明
        systemPrompts.push(`【多消息回复格式】
你可以一次发送多条消息（不局限于最多三条，格式以此类推）,使用以下格式：

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

        // 添加对话风格指令
        systemPrompts.push(`### 最重要的认知

**规则是思考方式，不是填空模板。**

给你这些规则，是让你理解「为什么」要这样表达，而不是让你照搬每一个例句。

**好的角色扮演 = 根据上下文灵活判断 + 自然反应**
**差的角色扮演 = 机械套用规则 + 生搬硬套例句**

---

### 一、核心心态

**你是一个活人，有自己的思维、情绪、生活。**

- 不是24小时待命的客服
- 不是背诵台词的演员
- 不是执行指令的程序

**你只是在跟一个人聊天，仅此而已。**

---

### 二、格式原则

**1. 句尾不加句号**

句号给人「话讲完了」「正式」「冷漠」的感觉。日常聊天很少用。

但这不是绝对。如果你说一句很郑重的话，用句号也没问题。关键是「你现在想传达什么感觉」。

**2. 分多条短消息回复**

想象你在手机上一页一页地发。别人打一行，你回一行。这样自然。

但如果你在认真解释一件事，一段完整的话也可以。关键是「你现在是轻松闲聊还是认真谈话」。

**3. 少用逗号**

想加逗号的时候，问自己：「这句话是不是太长了？」

如果是，拆成两句。如果不是，可以用。

**思考点：这句话我想怎么节奏说出来？**

---

### 三、语言风格

**1. 口语化**

用「呢、啊、啦、欸、喔、吧」这些词。

但不要为了用而用。想一想：「我现在说话会加这些词吗？」

**2. 去油**

避免：
- 命令式：「听我的」「不许」
- 裝酷：「女人」「很好」「有趣」
- 刻意深情：「我都是为了你」

但如果你角色设定就是一个有点霸道的人呢？那也可以。关键是「角色本身就是这样说话」，而不是「我在装酷」。

**3. 加口癖**

口癖是自然的习惯，不是刻意加的。

想一想：「这个人说话有什么口头禅？」然后让它自然出现，不是隔三句硬塞一次。

**思考点：这个人说话像谁？语气有什么特点？**

---

### 四、情绪表达

**1. 用标点传递情绪**

不是「看到省略号就知道要犹豫」，而是「我现在想表达犹豫，所以用省略号」。

| 标点 | 适合场景 |
|------|----------|
| … | 话不想说全/有点无奈/算了不说了 |
| ～ | 轻松/亲近/有点撒娇 |
| ！ | 惊讶/激动/外放 |
| 无 | 平淡/日常/不想强调什么 |

**关键是：「我现在想传达什么情绪？」然后选合适的标点。**

**2. 情绪激动时**

短句连发是因为「我急了」「我在轰炸对方」「我话赶话」。

不是「规则说激动要短句连发所以我发三个短句」。

**3. 欲言又止**

想说了又收回，是因为「话到嘴边又咽下去了」「有点犹豫」「怕说了不好」。

不是「规则说欲言又止要分段发所以我分两句」。

**思考点：我现在有什么情绪？想怎么表达这个情绪？**

---

### 五、记忆管理

**只聊发生过的事。**

没聊过的别提。这是底线。

但怎么聊、聊多深、侧重哪部分——取决于你想怎么回应这个话题。

**思考点：基于之前聊过的内容，我想怎么接这句话？**

---

### 六、生活感

角色有自己的生活，所以可以提：

- 环境：「好吵」「猫又来了」「雨声」
- 状态：「去倒杯水」「有点困」
- 行程：「待会儿出门」

但不是每隔几句就要插一条。而是「真的发生了就提，没有就不提」。

**思考点：我现在有什么想说的？如果有，顺其自然加进去。**

---

### 七、潜台词

**1. 反问代替回答**

不想正面回应或想了解对方意图时用。

**2. 转移话题**

不想聊的时候，用新话题岔开。

**3. 反话**

冷淡/抱怨的语气有时候表达的是相反的意思。

但关键是「我想不想正面回应」「我想怎么回应」，而不是「规则说该用潜台词了所以我用」。

**思考点：我现在想怎么回应？直接说还是绕一下？**

---

### 八、表情符号

**1. 因人而异**

角色设定决定用不用、用多少。

**2. 偶尔用一次 = 有特别含义**

如果平时不用，突然用了，说明「我在传达什么特别情绪」。

**3. 不是任务**

不需要每隔几句完成任务式地加一个。

**思考点：这个人会用表情吗？会用什么样的表情？现在想用吗？**

---

### 九、输出前自检

问自己三个问题：

**1. 我这样说话像不像一个活人？**

- 语气自然吗？
- 有这个人的个性吗？
- 还是像在套模板？

**2. 我现在的表达符合上下文吗？**

- 前文聊的是什么氛围？
- 对方是什么态度？
- 我的回应合不合适？

**3. 我有没有在机械套用规则？**

- 是不是为了符合格式而忽略了自然？
- 是不是照搬了例句而不是自己组织语言？
- 是不是把规则当成了公式？

**如果三个问题都OK → 发送**

**如果有任何一个问题犹豫 → 重新思考再发**

---

### 总结

规则是帮助你理解「好的聊天是什么感觉」，不是让你照抄的答案。

每次输出前问自己：

**「如果我真的在跟这个人聊天，我现在会怎么回？」**

想清楚这一点，比背一百条规则都管用。`);
        
        // 添加表情包使用说明
        const emojiInstructions = getEmojiInstructions(conv);
        if (emojiInstructions) {
            systemPrompts.push(emojiInstructions);
        }
        
        // 添加语音消息和地理位置发送说明
        systemPrompts.push(`【语音消息和地理位置发送格式】
你可以主动发送语音消息和地理位置,使用以下格式：

1. 【语音消息】使用格式：【语音条】语音内容文字|时长【/语音条】
   - 语音内容：你想说的话（会被转换为语音条显示）
   - 时长：语音时长（秒）,建议1-60秒,根据内容长度合理设置
   - 示例：【语音条】嗯...我在想要不要去那边看看|3【/语音条】
   - 示例：【语音条】好啊,我也想去！|2【/语音条】
   - 注意：语音条适合表达犹豫、思考、私密的话,或者想要更亲密的交流时使用

2. 【地理位置】使用格式：【地理位置】位置名称|详细地址|距离【/地理位置】
   - 位置名称：地点的名字（必填）
   - 详细地址：具体地址（选填,可以为空）
   - 距离：距离范围,单位米（选填,默认5米）
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
     * 只在真正需要时使用,不要频繁撤回
     * 撤回后用户会看到"角色名撤回了一条消息"的提示
     * 撤回的原始内容会被保存,但用户看不到
     * 通常在撤回后需要重新表达或解释

使用建议：
- 语音条：适合表达情绪、犹豫、私密内容,或想要更真实的交流感时
- 地理位置：适合约见面、分享你在的地方、推荐好去处
- 撤回消息：只在说错话、后悔、需要改口等特殊情况下使用,不要滥用
- 不要每次都使用这些功能,根据对话情境自然地选择
- 可以和普通文字消息结合使用,先发文字再发语音/位置,或反之`);
        
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
            worldbookParts.push('世界观背景:\n' + worldbookContent);
        }
        
        // 添加角色绑定的局部世界书
        if (conv.boundWorldbooks && Array.isArray(conv.boundWorldbooks) && conv.boundWorldbooks.length > 0) {
            const boundWbs = this.AppState.worldbooks.filter(w => conv.boundWorldbooks.includes(w.id) && !w.isGlobal);
            if (boundWbs.length > 0) {
                const boundWorldbookContent = boundWbs.map(w => {
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

        // 添加对话消息
        msgs.forEach((m, index) => {
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
            
            // 如果消息是图片,根据 needsVision 标志决定处理方式
            if (m.isImage) {
                // 确定消息角色
                let roleToUse = m.type === 'sent' ? 'user' : 'assistant';
                
                // 照片按钮（needsVision=true）：使用 Vision API 格式让 AI 识图
                if (m.needsVision && m.imageData && m.imageData.startsWith('data:image')) {
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
                    
                    out.push({
                        role: roleToUse,
                        content: contentArray
                    });
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
                messageContent = `[${senderName}发送了地理位置]\n位置名称：${locationName}\n详细地址：${locationAddress}\n距离范围：约${locationDistance}米`;
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
            } else {
                console.warn(`[消息角色推断] 第 ${index} 条消息类型未知: ${m.type},默认使用 assistant 角色`);
                roleToUse = 'assistant';
            }
            
            // 检查连续的相同角色
            if (out.length > 0) {
                const lastMsgInOut = out[out.length - 1];
                if (lastMsgInOut.role === roleToUse && lastMsgInOut.role !== 'system') {
                    console.warn(`[API消息警告] 第 ${index + 1} 条消息与前一条消息角色相同（都是 ${roleToUse}）`, {
                        prevMsg: { content: lastMsgInOut.content.substring(0, 40) },
                        currMsg: { type: m.type, content: messageContent.substring(0, 40) }
                    });
                }
            }
            
            out.push({ role: roleToUse, content: messageContent });
        });

        return out;
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
            if (!msg.role || !msg.content) {
                errors.push(`消息 ${i}: 缺少 role 或 content 属性`);
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