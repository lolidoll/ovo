/**
 * MiniMax TTS (文本转语音) 管理器
 * 负责调用 MiniMax API 进行语音合成和播放
 */

const MinimaxTTS = {
    // 配置
    config: {
        enabled: false,
        groupId: '',
        apiKey: '',
        voiceId: 'female-tianmei',
        speed: 1.0,
        volume: 1.0
    },

    // 音频缓存
    audioCache: new Map(),

    // 当前播放的音频
    currentAudio: null,

    /**
     * 初始化 MiniMax TTS
     */
    init: function(appState) {
        this.AppState = appState;
        
        // 从 AppState 加载配置
        if (appState.apiSettings && appState.apiSettings.minimaxTTS) {
            this.config = { ...this.config, ...appState.apiSettings.minimaxTTS };
        }
        
        console.log('[MinimaxTTS] 初始化完成', this.config);
    },

    /**
     * 更新配置
     */
    updateConfig: function(config) {
        this.config = { ...this.config, ...config };
        
        // 保存到 AppState
        if (!this.AppState.apiSettings.minimaxTTS) {
            this.AppState.apiSettings.minimaxTTS = {};
        }
        this.AppState.apiSettings.minimaxTTS = { ...this.config };
        
        console.log('[MinimaxTTS] 配置已更新', this.config);
    },

    /**
     * 检查是否已配置
     */
    isConfigured: function() {
        return this.config.enabled && 
               this.config.groupId && 
               this.config.apiKey;
    },

    /**
     * 合成语音
     * @param {string} text - 要合成的文本
     * @param {Object} options - 可选参数 {voiceId, speed, volume}
     * @returns {Promise<string>} 音频 URL
     */
    synthesize: async function(text, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('MiniMax TTS 未配置或未启用');
        }

        if (!text || !text.trim()) {
            throw new Error('文本不能为空');
        }

        // 检查缓存
        const cacheKey = this.getCacheKey(text, options);
        if (this.audioCache.has(cacheKey)) {
            console.log('[MinimaxTTS] 使用缓存音频');
            return this.audioCache.get(cacheKey);
        }

        const voiceId = options.voiceId || this.config.voiceId;
        const speed = options.speed !== undefined ? options.speed : this.config.speed;
        const volume = options.volume !== undefined ? options.volume : this.config.volume;

        try {
            console.log('[MinimaxTTS] 开始合成语音:', { text: text.substring(0, 50), voiceId, speed, volume });

            const url = `https://api.minimax.chat/v1/text_to_speech?GroupId=${this.config.groupId}`;
            
            const requestBody = {
                model: 'speech-01',
                text: text,
                voice_id: voiceId,
                speed: speed,
                vol: volume,
                audio_sample_rate: 32000,
                bitrate: 128000
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[MinimaxTTS] API 错误:', response.status, errorText);
                throw new Error(`MiniMax API 错误: ${response.status} ${errorText}`);
            }

            // 检查响应内容类型
            const contentType = response.headers.get('content-type');
            console.log('[MinimaxTTS] 响应内容类型:', contentType);

            // 如果返回的是直接音频数据
            if (contentType && contentType.includes('audio')) {
                console.log('[MinimaxTTS] 检测到直接音频响应');
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // 缓存音频（注意：blob URL 在页面卸载后会失效）
                this.audioCache.set(cacheKey, audioUrl);
                
                console.log('[MinimaxTTS] 语音合成成功（直接音频）');
                return audioUrl;
            }

            // 尝试解析 JSON 响应
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                // 如果不是 JSON，尝试读取文本
                const textResponse = await response.text();
                console.error('[MinimaxTTS] 无法解析 JSON，原始响应:', textResponse.substring(0, 200));
                throw new Error(`无法解析 API 响应: ${textResponse.substring(0, 100)}`);
            }
            
            console.log('[MinimaxTTS] API 响应数据:', data);

            // 检查不同的响应格式
            const audioBase64 = data.audio_file || data.audio || data.data;
            
            if (!audioBase64) {
                console.error('[MinimaxTTS] 响应格式错误，缺少音频数据:', data);
                throw new Error('未能获取音频数据，响应格式不正确');
            }

            // MiniMax 返回 base64 编码的音频
            const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
            
            // 缓存音频
            this.audioCache.set(cacheKey, audioUrl);
            
            console.log('[MinimaxTTS] 语音合成成功');
            return audioUrl;

        } catch (error) {
            console.error('[MinimaxTTS] 合成失败:', error);
            throw error;
        }
    },

    /**
     * 播放文本语音
     * @param {string} text - 要播放的文本
     * @param {Object} options - 可选参数
     * @returns {Promise<void>}
     */
    speak: async function(text, options = {}) {
        try {
            // 停止当前播放
            this.stop();

            const audioUrl = await this.synthesize(text, options);
            
            // 创建音频对象
            const audio = new Audio(audioUrl);
            audio.volume = options.playVolume !== undefined ? options.playVolume : 1.0;
            
            this.currentAudio = audio;

            // 播放完成后的回调
            return new Promise((resolve, reject) => {
                audio.onended = () => {
                    console.log('[MinimaxTTS] 播放完成');
                    this.currentAudio = null;
                    resolve();
                };

                audio.onerror = (error) => {
                    console.error('[MinimaxTTS] 播放错误:', error);
                    this.currentAudio = null;
                    reject(error);
                };

                audio.play().catch(error => {
                    console.error('[MinimaxTTS] 播放失败:', error);
                    this.currentAudio = null;
                    reject(error);
                });
            });

        } catch (error) {
            console.error('[MinimaxTTS] speak 失败:', error);
            throw error;
        }
    },

    /**
     * 停止当前播放
     */
    stop: function() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
            console.log('[MinimaxTTS] 已停止播放');
        }
    },

    /**
     * 暂停播放
     */
    pause: function() {
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
            console.log('[MinimaxTTS] 已暂停播放');
        }
    },

    /**
     * 继续播放
     */
    resume: function() {
        if (this.currentAudio && this.currentAudio.paused) {
            this.currentAudio.play();
            console.log('[MinimaxTTS] 已继续播放');
        }
    },

    /**
     * 获取缓存键
     */
    getCacheKey: function(text, options = {}) {
        const voiceId = options.voiceId || this.config.voiceId;
        const speed = options.speed !== undefined ? options.speed : this.config.speed;
        const volume = options.volume !== undefined ? options.volume : this.config.volume;
        return `${text}_${voiceId}_${speed}_${volume}`;
    },

    /**
     * 清除缓存
     */
    clearCache: function() {
        this.audioCache.clear();
        console.log('[MinimaxTTS] 缓存已清除');
    },

    /**
     * 测试语音合成
     */
    test: async function() {
        const testText = '你好，我是 MiniMax 语音合成系统，很高兴为你服务。';
        
        try {
            console.log('[MinimaxTTS] 开始测试...');
            await this.speak(testText);
            console.log('[MinimaxTTS] 测试成功');
            return true;
        } catch (error) {
            console.error('[MinimaxTTS] 测试失败:', error);
            throw error;
        }
    }
};

// 导出到全局
window.MinimaxTTS = MinimaxTTS;

console.log('[MinimaxTTS] 模块已加载');