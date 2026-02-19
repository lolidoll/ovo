/**
 * 情侣空间 - 粉白色系设计
 * 参考QQ情侣空间、moments.css和iOS原生APP风格
 * 功能：历史聊天统计、闺蜜专属吐槽嗑糖报告、核心数据、活跃时段、消息类型、时光记录
 */
(function() {
    'use strict';
    
    // ========== 状态管理 ==========
    const State = {
        currentCharacterId: null,
        currentCharacter: null,
        statsData: {},
        timeRange: '7days', // 7days, 30days, 90days, all
        emotionReport: null,
        isGeneratingReport: false,
        reportHistory: [] // 报告历史记录
    };
    
    // ========== 工具函数 ==========
    function getCharacters() {
        if (typeof AppState === 'undefined') return [];
        return AppState.friends || [];
    }
    
    function getMessages(characterId) {
        if (typeof AppState === 'undefined') return [];
        return AppState.messages[characterId] || [];
    }
    
    function getConversation(characterId) {
        if (typeof AppState === 'undefined') return null;
        return AppState.conversations.find(c => c.id === characterId);
    }
    
    function toast(msg) {
        if (typeof showToast === 'function') {
            showToast(msg);
        } else {
            console.log(msg);
        }
    }
    
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    function getTimeRangeText(range) {
        const map = {
            '7days': '近7天',
            '30days': '近30天',
            '90days': '近90天',
            'all': '全部'
        };
        return map[range] || '近7天';
    }
    
    function getRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        return formatDate(timestamp);
    }
    
    // AI调用函数 - 修复max_tokens限制导致回复不完整的问题
    function callAI(prompt, characterId) {
        return new Promise((resolve, reject) => {
            if (typeof sendMessageToAI === 'function') {
                sendMessageToAI(prompt, characterId).then(resolve).catch(reject);
            } else if (typeof AppState !== 'undefined' && AppState.apiSettings && AppState.apiSettings.endpoint) {
                console.log('🔧 [情侣空间] 准备调用AI生成报告');
                console.log('📝 提示词长度:', prompt.length, '字符');
                
                const requestBody = {
                    model: AppState.apiSettings.selectedModel || 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.9,
                    max_tokens: 16000, // 大幅增加到16000，确保超长报告完整
                    stream: false // 明确禁用流式输出，确保完整响应
                };
                
                console.log('📤 请求参数:', {
                    model: requestBody.model,
                    max_tokens: requestBody.max_tokens,
                    temperature: requestBody.temperature
                });
                
                // 规范化endpoint（确保包含/v1）
                const normalized = window.APIUtils?.normalizeEndpoint?.(AppState.apiSettings.endpoint) ||
                    (AppState.apiSettings.endpoint.replace(/\/$/, '').endsWith('/v1') ?
                     AppState.apiSettings.endpoint.replace(/\/$/, '') :
                     AppState.apiSettings.endpoint.replace(/\/+$/, '') + '/v1');
                fetch(normalized + '/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (AppState.apiSettings.apiKey || '')
                    },
                    body: JSON.stringify(requestBody)
                }).then(r => r.json()).then(d => {
                    console.log('📥 [情侣空间] 收到AI响应');
                    
                    if (d.choices && d.choices[0] && d.choices[0].message) {
                        const content = d.choices[0].message.content;
                        const finishReason = d.choices[0].finish_reason;
                        
                        console.log('✅ 报告生成成功');
                        console.log('📊 报告长度:', content.length, '字符');
                        console.log('🏁 完成原因:', finishReason);
                        
                        // 检查是否因为token限制而截断
                        if (finishReason === 'length') {
                            console.warn('⚠️ 警告：报告可能因max_tokens限制而被截断！');
                            console.warn('💡 建议：增加max_tokens参数或优化提示词');
                        }
                        
                        resolve(content);
                    } else {
                        console.error('❌ API响应格式错误:', d);
                        reject(new Error('API响应格式错误'));
                    }
                }).catch(err => {
                    console.error('❌ [情侣空间] AI调用失败:', err);
                    reject(err);
                });
            } else {
                reject(new Error('API未配置'));
            }
        });
    }
    
    // ========== 数据分析函数 ==========
    function analyzeMessages(messages, timeRange) {
        console.log('=== 开始分析消息 ===');
        console.log('总消息数:', messages ? messages.length : 0);
        console.log('时间范围:', timeRange);
        
        // 打印前3条消息的结构
        if (messages && messages.length > 0) {
            console.log('消息样本:', messages.slice(0, 3).map(m => ({
                type: m.type,
                time: m.time,
                timestamp: m.timestamp,
                content: m.content ? m.content.substring(0, 20) : ''
            })));
        }
        
        // 如果没有消息，返回空数据
        if (!messages || messages.length === 0) {
            console.log('没有消息，返回空数据');
            return {
                totalMessages: 0,
                userMessages: 0,
                aiMessages: 0,
                messageTypes: { text: 0, image: 0, voice: 0, video: 0, location: 0, redEnvelope: 0, transfer: 0, other: 0 },
                hourlyActivity: new Array(24).fill(0),
                continuousDays: 0,
                mostActiveHour: 0,
                avgResponseTime: 0,
                recentMessages: []
            };
        }
        
        const now = Date.now();
        let startTime = 0;
        
        switch(timeRange) {
            case '7days':
                startTime = now - 7 * 24 * 60 * 60 * 1000;
                break;
            case '30days':
                startTime = now - 30 * 24 * 60 * 60 * 1000;
                break;
            case '90days':
                startTime = now - 90 * 24 * 60 * 60 * 1000;
                break;
            case 'all':
                startTime = 0;
                break;
        }
        
        // 过滤时间范围内的消息，确保timestamp存在
        const filteredMessages = messages.filter(m => {
            // 将ISO字符串转换为时间戳
            const timeStr = m.time || m.timestamp;
            const timestamp = timeStr ? new Date(timeStr).getTime() : Date.now();
            const isInRange = timestamp >= startTime;
            return isInRange;
        });
        
        console.log('开始时间:', new Date(startTime).toISOString());
        console.log('当前时间:', new Date(now).toISOString());
        console.log('过滤后消息数:', filteredMessages.length);
        
        // 基础统计
        const totalMessages = filteredMessages.length;
        // 消息类型：sent=用户发送，received=AI接收
        const userMessages = filteredMessages.filter(m => m.type === 'sent').length;
        const aiMessages = filteredMessages.filter(m => m.type === 'received').length;
        
        console.log('统计结果 - 总消息:', totalMessages, '用户:', userMessages, 'AI:', aiMessages);
        
        // 消息类型统计
        const messageTypes = {
            text: 0,
            image: 0,
            voice: 0,
            video: 0,
            location: 0,
            redEnvelope: 0,
            transfer: 0,
            other: 0
        };
        
        filteredMessages.forEach(msg => {
            const msgType = msg.type || 'text';
            if (msgType === 'image') messageTypes.image++;
            else if (msgType === 'voice') messageTypes.voice++;
            else if (msgType === 'video') messageTypes.video++;
            else if (msgType === 'location') messageTypes.location++;
            else if (msgType === 'red-envelope') messageTypes.redEnvelope++;
            else if (msgType === 'transfer') messageTypes.transfer++;
            else if (msgType === 'text' || !msgType) messageTypes.text++;
            else messageTypes.other++;
        });
        
        // 活跃时段统计（按小时）
        const hourlyActivity = new Array(24).fill(0);
        filteredMessages.forEach(msg => {
            const timeStr = msg.time || msg.timestamp;
            const timestamp = timeStr ? new Date(timeStr).getTime() : Date.now();
            const hour = new Date(timestamp).getHours();
            if (hour >= 0 && hour < 24) {
                hourlyActivity[hour]++;
            }
        });
        
        // 连续聊天天数
        const chatDays = new Set();
        filteredMessages.forEach(msg => {
            const timeStr = msg.time || msg.timestamp;
            const timestamp = timeStr ? new Date(timeStr).getTime() : Date.now();
            chatDays.add(formatDate(timestamp));
        });
        const continuousDays = chatDays.size;
        
        // 最活跃时段
        let maxActivity = 0;
        let mostActiveHour = 0;
        hourlyActivity.forEach((count, hour) => {
            if (count > maxActivity) {
                maxActivity = count;
                mostActiveHour = hour;
            }
        });
        
        // 平均响应时间（简化计算）
        let totalResponseTime = 0;
        let responseCount = 0;
        for (let i = 1; i < filteredMessages.length; i++) {
            // 检查消息类型是否不同（sent vs received）
            if (filteredMessages[i].type !== filteredMessages[i-1].type) {
                const currentTimeStr = filteredMessages[i].time || filteredMessages[i].timestamp;
                const prevTimeStr = filteredMessages[i-1].time || filteredMessages[i-1].timestamp;
                const currentTime = currentTimeStr ? new Date(currentTimeStr).getTime() : Date.now();
                const prevTime = prevTimeStr ? new Date(prevTimeStr).getTime() : Date.now();
                const responseTime = currentTime - prevTime;
                if (responseTime > 0 && responseTime < 3600000) { // 小于1小时的响应
                    totalResponseTime += responseTime;
                    responseCount++;
                }
            }
        }
        const avgResponseTime = responseCount > 0 ? Math.floor(totalResponseTime / responseCount / 60000) : 0;
        
        return {
            totalMessages,
            userMessages,
            aiMessages,
            messageTypes,
            hourlyActivity,
            continuousDays,
            mostActiveHour,
            avgResponseTime,
            recentMessages: filteredMessages // 所有过滤后的消息
        };
    }
    
    // 生成闺蜜专属吐槽嗑糖报告
    async function generateEmotionReport() {
        if (!State.currentCharacterId) {
            toast('请先选择角色');
            return;
        }
        
        if (State.isGeneratingReport) {
            return;
        }
        
        State.isGeneratingReport = true;
        State.emotionReport = null;
        render();
        
        try {
            const stats = State.statsData;
            // 获取该角色的所有消息
            const allMessages = getMessages(State.currentCharacterId);
            
            // 提取最近50条对话片段用于分析
            const dialogSamples = allMessages.slice(-50).map(m => {
                const sender = m.type === 'sent' ? '你' : State.currentCharacter.name;
                const content = m.content || '[非文字消息]';
                return `${sender}: ${content}`;
            }).join('\n');
            
            // 获取用户名称
            const userName = (typeof AppState !== 'undefined' && AppState.user && AppState.user.name) ? AppState.user.name : '你';
            const charName = State.currentCharacter.name;
            
            const prompt = `你现在是${userName}的**专属亲闺蜜**，人设：嘴毒心软、嗑糖十级选手、八卦雷达拉满，和${userName}关系铁到穿一条裤子，绝对**全程站${userName}**，说话直来直去、接地气、有梗，不搞虚的，从闺蜜视角复盘TA和${charName}的聊天记录（聊天记录是${userName}主动转发给你的），字数800-1200字：

时间范围：${getTimeRangeText(State.timeRange)}
总消息数：${stats.totalMessages}条
你发送：${stats.userMessages}条
对方回复：${stats.aiMessages}条
连续聊天：${stats.continuousDays}天
最活跃时段：${stats.mostActiveHour}:00-${stats.mostActiveHour+1}:00
平均响应时间：${stats.avgResponseTime}分钟

最近对话片段：
${dialogSamples}

现在请你严格按照以下要求，输出一份「闺蜜专属吐槽嗑糖报告」，必须**有细节、有情绪、有笑点**，拒绝空泛敷衍！

## 核心任务（注意分段）
### 1. 【精准吐槽·只怼${charName}】（占比40%）
从闺蜜视角，精准扒出聊天里${charName}的**槽点**，要求：
- 必须结合**具体聊天原文**（直接引用关键句子），不能瞎编；
- 吐槽方向：敷衍回复、直男发言、双标现场、恋爱脑行为、不主动、不体贴、画大饼、情绪敷衍等；
- 语气：毒舌但不伤人，主打「我懂你委屈，我帮你骂」，用「宝子」「我真的会谢」「绝了」「救命」等口语化表达；
- 禁止吐槽${userName}，只针对${charName}！

### 2. 【疯狂嗑糖·挖隐藏糖】（占比35%）
从闺蜜嗑糖视角，挖出聊天里**被忽略的高甜细节**，要求：
- 必须结合**具体聊天原文**，挖「暗戳戳的温柔」「双向奔赴的小举动」「只有你们懂的暗号」「不经意的关心」；
- 标注「高甜预警」，用激动、磕疯了的语气放大甜蜜，让${userName}感受到被宠；
- 对比吐槽，突出「他也有很爱你的时候」，甜而不腻；
- 结合聊天统计数据（如主动发消息次数、聊天高峰时段、高频甜蜜关键词），佐证糖点。

### 3. 【数据解读·闺蜜式分析】（占比20%）
结合系统给出的**聊天统计数据**（如：聊天总时长、主动发送次数TOP、高频关键词、情感曲线、相处高峰时段等），用闺蜜唠嗑的方式解读：
1. 总结你们的**相处模式**（粘人型、互怼型、慢热型、热恋型、双向奔赴型等）；
2. 点评**情感健康度**：哪些地方超甜，哪些地方${userName}需要注意（如${charName}回复变慢、负面情绪增多、聊天敷衍、付出不对等）；
3. 给出**闺蜜式建议**：不卑微、不内耗、该怼怼、该宠宠，具体、可落地；
4. 一句话**精准总结**这段聊天的核心氛围。

### 4. 【专属彩蛋·互动喊话】（占比5%）
1. 给${charName}起一个**又损又好记的外号**（结合TA的聊天行为，如「粘人精」「土情话制造机」「直男笨蛋男友」「敷衍大王」）；
2. 对${userName}说一句**贴心又有梗的话**，对${charName}隔空放一句**专属狠话**（如「${charName}听好了！再敢敷衍${userName}，我第一个不放过你！」）；
3. 提炼一句**闺蜜专属金句**，概括这段聊天的核心情绪。

## 风格与格式要求（严格遵守）
1. **语气**：全程闺蜜唠嗑感，口语化、网络化，符合年轻女生聊天习惯，拒绝书面语；
2. **细节**：必须**引用聊天原文**，让${userName}觉得「你真的看了我的记录！」；
3. **排版**：段落清晰，搭配少量emoji增加趣味性；
4. **情绪**：吐槽要解气，嗑糖要上头，建议要走心，全程站${userName}，不引导内耗；
5. **禁止**：不攻击${userName}、不聊无关内容、不输出负能量。

请基于以上所有信息，直接输出最终的闺蜜吐槽嗑糖报告！`;
            
            const report = await callAI(prompt, State.currentCharacterId);
            State.emotionReport = report;
            
            // 保存到历史记录
            const reportRecord = {
                id: 'report_' + Date.now(),
                characterId: State.currentCharacterId,
                characterName: State.currentCharacter.name,
                characterAvatar: State.currentCharacter.avatar,
                report: report,
                createdAt: new Date().toISOString(),
                timeRange: State.timeRange,
                stats: {
                    totalMessages: stats.totalMessages,
                    userMessages: stats.userMessages,
                    aiMessages: stats.aiMessages,
                    continuousDays: stats.continuousDays
                }
            };
            State.reportHistory.unshift(reportRecord); // 添加到开头
            saveReportHistory(); // 保存到localStorage
            
            toast('报告生成成功');
        } catch (error) {
            console.error('生成报告失败:', error);
            toast('生成失败：' + error.message);
            State.emotionReport = '生成失败，请检查API配置后重试';
        } finally {
            State.isGeneratingReport = false;
            render();
        }
    }
    
    // 保存报告历史到localStorage
    function saveReportHistory() {
        try {
            localStorage.setItem('couplesSpaceReportHistory', JSON.stringify(State.reportHistory));
        } catch (e) {
            console.error('保存报告历史失败:', e);
        }
    }
    
    // 加载报告历史
    function loadReportHistory() {
        try {
            const saved = localStorage.getItem('couplesSpaceReportHistory');
            if (saved) {
                State.reportHistory = JSON.parse(saved);
            }
        } catch (e) {
            console.error('加载报告历史失败:', e);
            State.reportHistory = [];
        }
    }
    
    // 删除报告
    function deleteReport(reportId) {
        State.reportHistory = State.reportHistory.filter(r => r.id !== reportId);
        saveReportHistory();
        toast('报告已删除');
        render();
    }
    
    // 查看历史报告
    function viewHistoryReport(reportId) {
        const report = State.reportHistory.find(r => r.id === reportId);
        if (report) {
            State.emotionReport = report.report;
            render();
        }
    }
    
    // ========== 渲染函数 ==========
    function render() {
        const container = document.getElementById('couplesSpaceContent');
        if (!container) return;
        
        // 如果没有选择角色，显示选择提示
        if (!State.currentCharacterId) {
            container.innerHTML = `
                <div class="cs-empty-state">
                    <div class="cs-empty-icon">♡</div>
                    <div class="cs-empty-text">
                        点击右上角选择角色<br>
                        开始查看你们的专属空间
                    </div>
                </div>
            `;
            return;
        }
        
        const character = State.currentCharacter;
        if (!character) return;
        
        const messages = getMessages(State.currentCharacterId);
        const stats = analyzeMessages(messages, State.timeRange);
        State.statsData = stats;
        
        // 渲染主界面
        container.innerHTML = `
            <!-- 个人信息卡片 -->
            <div class="cs-profile-card">
                <div class="cs-profile-header">
                    <img src="${character.avatar}" alt="${character.name}" class="cs-avatar">
                    <div class="cs-profile-info">
                        <h3>${character.name}</h3>
                        <p>你们已经聊了 ${stats.totalMessages} 条消息</p>
                    </div>
                </div>
                
                <!-- 时间范围选择 -->
                <div class="cs-time-selector">
                    <button class="cs-time-btn ${State.timeRange === '7days' ? 'active' : ''}" data-range="7days">近7天</button>
                    <button class="cs-time-btn ${State.timeRange === '30days' ? 'active' : ''}" data-range="30days">近30天</button>
                    <button class="cs-time-btn ${State.timeRange === '90days' ? 'active' : ''}" data-range="90days">近90天</button>
                    <button class="cs-time-btn ${State.timeRange === 'all' ? 'active' : ''}" data-range="all">全部</button>
                </div>
            </div>
            
            <!-- 核心数据 -->
            <div class="cs-stats-grid">
                <div class="cs-stat-card">
                    <div class="cs-stat-value">${stats.totalMessages}</div>
                    <div class="cs-stat-label">消息总数</div>
                </div>
                <div class="cs-stat-card">
                    <div class="cs-stat-value">${stats.continuousDays}</div>
                    <div class="cs-stat-label">聊天天数</div>
                </div>
                <div class="cs-stat-card">
                    <div class="cs-stat-value">${stats.mostActiveHour}:00</div>
                    <div class="cs-stat-label">最活跃时段</div>
                </div>
                <div class="cs-stat-card">
                    <div class="cs-stat-value">${stats.avgResponseTime}分</div>
                    <div class="cs-stat-label">平均响应</div>
                </div>
            </div>
            
            <!-- 闺蜜专属吐槽嗑糖报告 -->
            <div class="cs-emotion-section">
                <div class="cs-section-title">
                    <span>♥</span>
                    <span>闺蜜专属吐槽嗑糖报告</span>
                </div>
                
                ${renderEmotionReport()}
            </div>
            
            <!-- 活跃时段分析 -->
            <div class="cs-activity-section">
                <div class="cs-section-title">
                    <span>▪</span>
                    <span>活跃时段分析</span>
                </div>
                <div class="cs-activity-chart">
                    ${renderActivityChart(stats.hourlyActivity)}
                </div>
            </div>
            
            <!-- 消息类型分布 -->
            <div class="cs-message-types">
                <div class="cs-section-title">
                    <span>●</span>
                    <span>消息类型分布</span>
                </div>
                <div class="cs-type-list">
                    ${renderMessageTypes(stats.messageTypes, stats.totalMessages)}
                </div>
            </div>
            
            <!-- 时光记录 -->
            <div class="cs-timeline-section">
                <div class="cs-section-title">
                    <span>◆</span>
                    <span>时光记录</span>
                </div>
                <div class="cs-timeline">
                    ${renderTimeline(stats.recentMessages)}
                </div>
            </div>
        `;
        
        // 绑定事件
        bindEvents();
    }
    
    function renderEmotionReport() {
        if (State.isGeneratingReport) {
            return `
                <div class="cs-loading">
                    <div class="cs-loading-spinner"></div>
                    <div>AI正在分析中...</div>
                </div>
            `;
        }
        
        if (State.emotionReport) {
            return `
                <div class="cs-emotion-report">
                    <div class="cs-report-content">${State.emotionReport}</div>
                    <div class="cs-report-actions">
                        <button class="cs-regenerate-btn" onclick="CouplesSpace.regenerateReport()">重新生成</button>
                        <button class="cs-history-btn" onclick="CouplesSpace.openReportHistory()">历史报告</button>
                    </div>
                </div>
            `;
        }
        
        // 获取当前角色的历史报告数量
        const historyCount = State.reportHistory.filter(r => r.characterId === State.currentCharacterId).length;
        
        return `
            <button class="cs-generate-btn" onclick="CouplesSpace.generateReport()">
                生成报告
            </button>
            <div class="cs-emotion-placeholder">
                点击按钮，生成<br>
                闺蜜专属吐槽嗑糖报告
            </div>
            ${historyCount > 0 ? `
                <button class="cs-view-history-btn" onclick="CouplesSpace.openReportHistory()">
                    查看历史报告 (${historyCount})
                </button>
            ` : ''}
        `;
    }
    
    // 渲染历史报告列表
    function renderReportHistory() {
        // 筛选当前角色的报告
        const reports = State.reportHistory.filter(r => r.characterId === State.currentCharacterId);
        
        if (reports.length === 0) {
            return '<div class="cs-empty-text">暂无历史报告</div>';
        }
        
        return reports.map(report => {
            const date = new Date(report.createdAt);
            const dateStr = `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            const timeRangeText = getTimeRangeText(report.timeRange);
            
            return `
                <div class="cs-history-item">
                    <div class="cs-history-header">
                        <div class="cs-history-info">
                            <div class="cs-history-date">${dateStr}</div>
                            <div class="cs-history-meta">${timeRangeText} · ${report.stats.totalMessages}条消息</div>
                        </div>
                        <button class="cs-history-delete" onclick="CouplesSpace.deleteReport('${report.id}')" title="删除">×</button>
                    </div>
                    <div class="cs-history-preview">${report.report.substring(0, 100)}...</div>
                    <button class="cs-history-view" onclick="CouplesSpace.viewHistoryReport('${report.id}')">查看完整报告</button>
                </div>
            `;
        }).join('');
    }
    
    // 打开历史报告模态框
    function openReportHistory() {
        const modal = document.createElement('div');
        modal.className = 'cs-selector-modal show';
        modal.innerHTML = `
            <div class="cs-selector-content cs-history-modal">
                <div class="cs-selector-header">
                    <h3>历史报告</h3>
                    <button class="cs-close-btn" onclick="CouplesSpace.closeReportHistory()">×</button>
                </div>
                <div class="cs-history-list">
                    ${renderReportHistory()}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 防止背景滚动
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        
        // 点击背景关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeReportHistory();
            }
        });
        
        // 阻止模态框内容的触摸事件冒泡
        const content = modal.querySelector('.cs-selector-content');
        content.addEventListener('touchmove', function(e) {
            e.stopPropagation();
        });
    }
    
    function closeReportHistory() {
        const modal = document.querySelector('.cs-selector-modal');
        if (modal) {
            modal.remove();
            
            // 恢复背景滚动
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
    }
    
    function renderActivityChart(hourlyActivity) {
        const maxActivity = Math.max(...hourlyActivity, 1);
        const hours = [0, 3, 6, 9, 12, 15, 18, 21]; // 显示8个时段
        
        return hours.map(hour => {
            const count = hourlyActivity[hour];
            const height = (count / maxActivity) * 100;
            return `
                <div class="cs-activity-bar" style="height: ${height}%">
                    <div class="cs-activity-value">${count}</div>
                    <div class="cs-activity-label">${hour}:00</div>
                </div>
            `;
        }).join('');
    }
    
    function renderMessageTypes(types, total) {
        const typeConfig = [
            { key: 'text', name: '文字消息', icon: 'T' },
            { key: 'image', name: '图片消息', icon: 'I' },
            { key: 'voice', name: '语音消息', icon: 'V' },
            { key: 'video', name: '视频消息', icon: 'M' },
            { key: 'location', name: '位置消息', icon: 'L' },
            { key: 'redEnvelope', name: '红包消息', icon: 'R' },
            { key: 'transfer', name: '转账消息', icon: '$' }
        ];
        
        return typeConfig
            .filter(config => types[config.key] > 0)
            .map(config => {
                const count = types[config.key];
                const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
                return `
                    <div class="cs-type-item">
                        <div class="cs-type-icon">${config.icon}</div>
                        <div class="cs-type-info">
                            <div class="cs-type-name">${config.name}</div>
                            <div class="cs-type-bar">
                                <div class="cs-type-progress" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                        <div class="cs-type-count">${count}</div>
                    </div>
                `;
            }).join('');
    }
    
    function renderTimeline(messages) {
        if (!messages || messages.length === 0) {
            return '<div class="cs-empty-text">暂无聊天记录</div>';
        }
        
        // 取最近10条重要消息
        const importantMessages = messages
            .filter(m => m.type !== 'system')
            .slice(-10)
            .reverse();
        
        return importantMessages.map(msg => {
            // type: 'sent'=用户发送, 'received'=AI接收
            const senderName = msg.type === 'sent' ? '你' : State.currentCharacter.name;
            const content = msg.content ? (msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content) : '[非文字消息]';
            const timeStr = msg.time || msg.timestamp;
            const timestamp = timeStr ? new Date(timeStr).getTime() : Date.now();
            
            return `
                <div class="cs-timeline-item">
                    <div class="cs-timeline-dot"></div>
                    <div class="cs-timeline-date">${formatDate(timestamp)}</div>
                    <div class="cs-timeline-content">${senderName}: ${content}</div>
                    <div class="cs-timeline-meta">${formatTime(timestamp)}</div>
                </div>
            `;
        }).join('');
    }
    
    function bindEvents() {
        // 时间范围切换
        document.querySelectorAll('.cs-time-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const range = this.dataset.range;
                State.timeRange = range;
                State.emotionReport = null; // 切换时间范围时清空报告
                render();
            });
        });
    }
    
    // ========== 角色选择器 ==========
    function openSelector() {
        const characters = getCharacters();
        if (characters.length === 0) {
            toast('暂无角色');
            return;
        }
        
        // 防止背景滚动（移动端优化）
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        
        const modal = document.createElement('div');
        modal.className = 'cs-selector-modal show';
        modal.innerHTML = `
            <div class="cs-selector-content">
                <div class="cs-selector-header">
                    <h3>选择角色</h3>
                    <button class="cs-close-btn" onclick="CouplesSpace.closeSelector()">×</button>
                </div>
                <div class="cs-character-list">
                    ${characters.map(char => `
                        <div class="cs-character-item" data-id="${char.id}">
                            <img src="${char.avatar}" alt="${char.name}" class="cs-character-avatar">
                            <div class="cs-character-info">
                                <div class="cs-character-name">${char.name}</div>
                                <div class="cs-character-desc">${char.description || '暂无简介'}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定选择事件
        modal.querySelectorAll('.cs-character-item').forEach(item => {
            item.addEventListener('click', function() {
                const characterId = this.dataset.id;
                selectCharacter(characterId);
                closeSelector();
            });
        });
        
        // 点击背景关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeSelector();
            }
        });
        
        // 阻止模态框内容的触摸事件冒泡（防止误关闭）
        const content = modal.querySelector('.cs-selector-content');
        content.addEventListener('touchmove', function(e) {
            e.stopPropagation();
        });
    }
    
    function closeSelector() {
        const modal = document.querySelector('.cs-selector-modal');
        if (modal) {
            modal.remove();
            
            // 恢复背景滚动
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
    }
    
    function selectCharacter(characterId) {
        const characters = getCharacters();
        const character = characters.find(c => c.id === characterId);
        if (!character) return;
        
        State.currentCharacterId = characterId;
        State.currentCharacter = character;
        State.emotionReport = null;
        State.timeRange = '7days';
        
        render();
        toast(`已切换到 ${character.name}`);
    }
    
    // ========== 初始化 ==========
    function init() {
        console.log('情侣空间初始化');
        
        // 加载历史报告
        loadReportHistory();
        
        // 自动选择第一个角色
        const characters = getCharacters();
        if (characters.length > 0 && !State.currentCharacterId) {
            selectCharacter(characters[0].id);
        } else {
            render();
        }
    }
    
    // ========== 导出API ==========
    window.CouplesSpace = {
        init,
        openSelector,
        closeSelector,
        selectCharacter,
        setTimeRange: (range) => {
            State.timeRange = range;
            State.emotionReport = null;
            render();
        },
        generateReport: generateEmotionReport,
        regenerateReport: () => {
            State.emotionReport = null;
            generateEmotionReport();
        },
        openReportHistory,
        closeReportHistory,
        viewHistoryReport,
        deleteReport
    };
    
})();