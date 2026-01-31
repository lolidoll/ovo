/**
 * AI图片生成器模块
 * 让角色可以根据上下文主动生成并发送AI图片
 */

const AIImageGenerator = {
    // 初始化
    init: function(appState, toastFunc, saveFunc) {
        this.AppState = appState;
        this.showToast = toastFunc;
        this.saveToStorage = saveFunc;
        this.isGenerating = false;
        console.log('✅ AI图片生成器已初始化');
    },

    /**
     * 从AI回复中提取图片生成指令
     * 支持格式：
     * 1. [IMAGE]图片描述[/IMAGE] 或 [IMG]图片描述[/IMG]
     * 2. [角色名发送了一张图片，图片内容：描述] (AI模仿用户发图格式)
     */
    extractImageInstructions: function(text) {
        if (!text || typeof text !== 'string') return [];
        
        const instructions = [];
        
        // 匹配 [IMAGE]...[/IMAGE] 格式
        const imageRegex = /\[IMAGE\]([\s\S]*?)\[\/IMAGE\]/gi;
        let match;
        
        while ((match = imageRegex.exec(text)) !== null) {
            const description = match[1].trim();
            if (description) {
                instructions.push({
                    type: 'image',
                    description: description,
                    fullMatch: match[0],
                    index: match.index
                });
            }
        }
        
        // 匹配 [IMG]...[/IMG] 格式
        const imgRegex = /\[IMG\]([\s\S]*?)\[\/IMG\]/gi;
        while ((match = imgRegex.exec(text)) !== null) {
            const description = match[1].trim();
            if (description) {
                instructions.push({
                    type: 'image',
                    description: description,
                    fullMatch: match[0],
                    index: match.index
                });
            }
        }
        
        // 匹配 [角色名发送了一张图片，图片内容：...] 格式
        // 这是AI模仿用户发图时的格式
        const userStyleRegex = /\[([^发]+)发送了一张图片[，,]图片内容[：:]([^\]]+)\]/gi;
        while ((match = userStyleRegex.exec(text)) !== null) {
            const description = match[2].trim();
            if (description) {
                // 检查是否是base64数据，如果是则提取实际图片
                if (description.startsWith('data:image')) {
                    instructions.push({
                        type: 'direct_image',  // 直接使用图片数据
                        imageData: description,
                        description: `${match[1]}发送的图片`,
                        fullMatch: match[0],
                        index: match.index
                    });
                } else {
                    // 如果是文字描述，则作为生图指令
                    instructions.push({
                        type: 'image',
                        description: description,
                        fullMatch: match[0],
                        index: match.index
                    });
                }
            }
        }
        
        // 按出现顺序排序
        instructions.sort((a, b) => a.index - b.index);
        
        return instructions;
    },

    /**
     * 清理文本中的图片生成标记
     */
    removeImageTags: function(text) {
        if (!text || typeof text !== 'string') return text;
        
        // 移除 [IMAGE]...[/IMAGE] 和 [IMG]...[/IMG] 标记
        text = text.replace(/\[IMAGE\][\s\S]*?\[\/IMAGE\]/gi, '');
        text = text.replace(/\[IMG\][\s\S]*?\[\/IMG\]/gi, '');
        
        // 移除 [角色名发送了一张图片，图片内容：...] 格式
        text = text.replace(/\[([^发]+)发送了一张图片[，,]图片内容[：:][^\]]+\]/gi, '');
        
        // 清理多余空行
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.trim();
        
        return text;
    },

    /**
     * 调用AI生图API生成图片
     * @param {string} prompt - 图片描述提示词
     * @param {string} apiType - API类型：'openai', 'stability', 'custom'
     * @returns {Promise<string>} - 返回图片的base64数据或URL
     */
    generateImage: async function(prompt, apiType = 'openai') {
        if (this.isGenerating) {
            throw new Error('正在生成图片，请稍候...');
        }

        this.isGenerating = true;

        try {
            // 获取API设置
            const api = this.AppState.apiSettings || {};
            
            // 检查是否配置了图片生成端点
            const imageEndpoint = api.imageEndpoint || api.endpoint;
            const imageApiKey = api.imageApiKey || api.apiKey;
            
            if (!imageEndpoint) {
                throw new Error('未配置图片生成API端点');
            }

            console.log('🎨 开始生成图片:', {
                prompt: prompt.substring(0, 50) + '...',
                apiType: apiType,
                endpoint: imageEndpoint
            });

            let imageData = null;

            // 根据API类型调用不同的生图服务
            switch (apiType) {
                case 'openai':
                    imageData = await this.generateWithOpenAI(imageEndpoint, imageApiKey, prompt);
                    break;
                case 'stability':
                    imageData = await this.generateWithStability(imageEndpoint, imageApiKey, prompt);
                    break;
                case 'custom':
                    imageData = await this.generateWithCustomAPI(imageEndpoint, imageApiKey, prompt);
                    break;
                default:
                    // 默认尝试OpenAI格式
                    imageData = await this.generateWithOpenAI(imageEndpoint, imageApiKey, prompt);
            }

            console.log('✅ 图片生成成功');
            return imageData;

        } catch (error) {
            console.error('❌ 图片生成失败:', error);
            throw error;
        } finally {
            this.isGenerating = false;
        }
    },

    /**
     * 使用OpenAI DALL-E API生成图片
     */
    generateWithOpenAI: async function(endpoint, apiKey, prompt) {
        // 规范化端点
        const normalized = endpoint.replace(/\/$/, '');
        const baseEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
        const imageEndpoint = baseEndpoint + '/images/generations';

        const body = {
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
            response_format: 'b64_json'  // 返回base64格式
        };

        const response = await fetch(imageEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API错误 (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        if (data.data && data.data[0]) {
            // 如果返回的是base64
            if (data.data[0].b64_json) {
                return `data:image/png;base64,${data.data[0].b64_json}`;
            }
            // 如果返回的是URL
            if (data.data[0].url) {
                // 将URL转换为base64
                return await this.urlToBase64(data.data[0].url);
            }
        }

        throw new Error('无法从API响应中提取图片数据');
    },

    /**
     * 使用Stability AI API生成图片
     */
    generateWithStability: async function(endpoint, apiKey, prompt) {
        const imageEndpoint = endpoint + '/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';

        const formData = new FormData();
        formData.append('text_prompts[0][text]', prompt);
        formData.append('cfg_scale', '7');
        formData.append('height', '1024');
        formData.append('width', '1024');
        formData.append('samples', '1');
        formData.append('steps', '30');

        const response = await fetch(imageEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Stability AI错误 (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        if (data.artifacts && data.artifacts[0] && data.artifacts[0].base64) {
            return `data:image/png;base64,${data.artifacts[0].base64}`;
        }

        throw new Error('无法从Stability AI响应中提取图片数据');
    },

    /**
     * 使用自定义API生成图片
     */
    generateWithCustomAPI: async function(endpoint, apiKey, prompt) {
        // 自定义API格式，可根据实际需求调整
        const body = {
            prompt: prompt,
            width: 1024,
            height: 1024
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`自定义API错误 (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        // 尝试从不同的字段提取图片数据
        if (data.image) {
            if (data.image.startsWith('data:')) {
                return data.image;
            }
            return `data:image/png;base64,${data.image}`;
        }
        
        if (data.url) {
            return await this.urlToBase64(data.url);
        }

        throw new Error('无法从自定义API响应中提取图片数据');
    },

    /**
     * 将图片URL转换为base64
     */
    urlToBase64: async function(url) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('URL转base64失败:', error);
            // 如果转换失败，直接返回URL
            return url;
        }
    },

    /**
     * 处理AI回复中的图片生成指令
     * @param {string} convId - 对话ID
     * @param {string} text - AI回复文本
     * @returns {Promise<string>} - 返回清理后的文本（用于文字消息显示）
     */
    processImageInstructions: async function(convId, text) {
        const instructions = this.extractImageInstructions(text);
        
        if (instructions.length === 0) {
            return text;  // 没有图片指令，直接返回原文本
        }

        console.log(`🎨 检测到 ${instructions.length} 个图片生成指令`);

        // 清理文本中的图片标记，保留其他文字内容
        let cleanedText = this.removeImageTags(text);
        
        // 如果清理后文本为空或只有空白，返回空字符串
        // 这样文字消息就不会显示
        cleanedText = cleanedText.trim();

        // 获取API类型设置
        const apiType = this.AppState.apiSettings?.imageApiType || 'openai';

        // 异步生成并发送图片（不阻塞文本消息）
        // 延迟稍微长一点，确保文字消息先显示
        setTimeout(async () => {
            for (const instruction of instructions) {
                let imageData = null;
                let generationFailed = false;
                
                // 如果是直接图片数据，直接使用
                if (instruction.type === 'direct_image') {
                    imageData = instruction.imageData;
                    this.sendImageMessage(convId, imageData, instruction.description, false);
                    console.log('✅ 直接使用AI提供的图片数据');
                } else {
                    // 需要生成图片
                    try {
                        this.showToast('🎨 正在生成图片...');
                        
                        // 尝试生成图片
                        imageData = await this.generateImage(instruction.description, apiType);
                        
                        this.showToast('✅ 图片已生成');
                        
                    } catch (error) {
                        console.error('生成图片失败，使用默认图片:', error);
                        this.showToast('⚠️ 生图失败，使用默认图片');
                        
                        // 使用默认图片
                        imageData = 'https://image.uglycat.cc/q3w37y.jpg';
                        generationFailed = true;
                    }
                    
                    // 发送图片消息（无论成功还是失败）
                    this.sendImageMessage(convId, imageData, instruction.description, generationFailed);
                }
                
                // 每张图片之间间隔一下
                if (instructions.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }, 800);  // 延迟800ms，确保文字消息先显示

        return cleanedText;
    },

    /**
     * 发送图片消息到对话
     */
    sendImageMessage: function(convId, imageData, description, isFallback = false) {
        if (!this.AppState.messages[convId]) {
            this.AppState.messages[convId] = [];
        }

        const msg = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: 'received',  // AI发送的消息
            content: description || '[AI生成的图片]',
            imageData: imageData,
            isImage: true,
            isAIGenerated: true,  // 标记为AI生成的图片
            imageDescription: description,  // 保存图片描述用于弹窗显示
            isGenerationFailed: isFallback,  // 标记是否使用了默认图片
            time: new Date().toISOString()
        };

        this.AppState.messages[convId].push(msg);

        // 更新会话
        const conv = this.AppState.conversations.find(c => c.id === convId);
        if (conv) {
            conv.lastMsg = '[图片]';
            conv.time = formatTime(new Date());
            conv.lastMessageTime = msg.time;
        }

        this.saveToStorage();
        
        // 如果当前正在查看这个对话，刷新消息列表
        if (this.AppState.currentChat && this.AppState.currentChat.id === convId) {
            renderChatMessages();
        }
        
        renderConversations();
    },

    /**
     * 显示图片描述弹窗
     */
    showImageDescriptionModal: function(description, isFailed) {
        // 移除已存在的弹窗
        const existingModal = document.getElementById('ai-image-description-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'ai-image-description-modal';
        modal.className = 'emoji-mgmt-modal show';
        modal.style.zIndex = '10000';
        
        const statusText = isFailed ? '⚠️ 图片生成失败，显示默认图片' : '✅ AI生成的图片';
        
        modal.innerHTML = `
            <div class="emoji-mgmt-content" style="max-width: 500px; max-height: 70vh;">
                <div class="emoji-mgmt-header">
                    <h3 style="margin: 0; font-size: 16px;">图片描述</h3>
                    <button class="emoji-mgmt-close" onclick="document.getElementById('ai-image-description-modal').remove()">×</button>
                </div>
                <div class="emoji-mgmt-body" style="padding: 20px; max-height: 60vh; overflow-y: auto;">
                    <div style="
                        background: ${isFailed ? '#fff3cd' : '#d1ecf1'};
                        border: 1px solid ${isFailed ? '#ffc107' : '#bee5eb'};
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 15px;
                        color: ${isFailed ? '#856404' : '#0c5460'};
                        font-size: 13px;
                        text-align: center;
                    ">
                        ${statusText}
                    </div>
                    <div style="
                        background: #f8f9fa;
                        border-radius: 8px;
                        padding: 15px;
                        line-height: 1.6;
                        color: #333;
                        font-size: 14px;
                        white-space: pre-wrap;
                        word-break: break-word;
                    ">
                        ${description || '无描述'}
                    </div>
                </div>
                <div class="emoji-mgmt-footer" style="padding: 15px; text-align: center;">
                    <button onclick="document.getElementById('ai-image-description-modal').remove()"
                            style="
                                padding: 8px 24px;
                                background: #007bff;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                            ">
                        关闭
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 点击背景关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
};

// 导出到全局
if (typeof window !== 'undefined') {
    window.AIImageGenerator = AIImageGenerator;
}