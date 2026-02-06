/**
 * 心声管理器 - Mind State Manager
 * 负责角色心声系统的所有功能
 */

const MindStateManager = (function() {
    'use strict';

    // 私有变量
    let AppState = null;
    let saveToStorage = null;
    let showToast = null;
    let escapeHtml = null;

    /**
     * 初始化心声管理器
     * @param {Object} appState - 应用状态对象
     * @param {Function} saveFunc - 保存函数
     * @param {Function} toastFunc - 提示函数
     * @param {Function} escapeFunc - HTML转义函数
     */
    function init(appState, saveFunc, toastFunc, escapeFunc) {
        AppState = appState;
        saveToStorage = saveFunc;
        showToast = toastFunc;
        escapeHtml = escapeFunc;
        console.log('💖 心声管理器已初始化');
    }

    /**
     * 更新心声按钮显示
     * @param {Object} conv - 会话对象
     */
    function updateMindStateButton(conv) {
        const heartSvg = document.getElementById('chat-mind-heart');
        const fillRect = document.getElementById('heart-fill-rect');
        const affinityText = document.getElementById('heart-affinity-text');
        
        if (!heartSvg || !fillRect || !affinityText) return;
        
        // 获取最新的好感度数据
        let affinity = 0;
        if (conv && conv.mindStates && conv.mindStates.length > 0) {
            // 从最后一条心声记录中获取好感度
            const lastMindState = conv.mindStates[conv.mindStates.length - 1];
            if (lastMindState && typeof lastMindState.affinity === 'number') {
                affinity = Math.max(0, Math.min(100, lastMindState.affinity)); // 限制在0-100之间
            }
        }
        
        // 更新填充高度（从底部向上填充）
        const fillHeight = (affinity / 100) * 24; // 24是SVG的高度
        fillRect.setAttribute('y', String(24 - fillHeight));
        fillRect.setAttribute('height', String(fillHeight));
        
        // 更新好感度数值显示
        affinityText.textContent = String(affinity);
        
        // 根据好感度设置颜色 - 公主风粉嫩配色
        let fillColor = '#e8e8e8'; // 默认浅灰色
        let textColor = '#999';
        
        if (affinity >= 80) {
            fillColor = '#ff6b9d'; // 高好感度：深粉红色
            textColor = '#fff';
        } else if (affinity >= 60) {
            fillColor = '#ff85a6'; // 中高好感度：粉红色
            textColor = '#fff';
        } else if (affinity >= 40) {
            fillColor = '#ffabc0'; // 中等好感度：浅粉色
            textColor = '#fff';
        } else if (affinity >= 20) {
            fillColor = '#ffd5e0'; // 中低好感度：很淡粉色
            textColor = '#ff85a6';
        }
        
        // 更新填充路径的颜色
        const fillPath = heartSvg.querySelector('path[clip-path]');
        if (fillPath) {
            fillPath.setAttribute('fill', fillColor);
        }
        
        // 更新文字颜色
        affinityText.setAttribute('fill', textColor);
        
        console.log(`💖 心声按钮已更新 - 好感度: ${affinity}, 填充高度: ${fillHeight}px, 颜色: ${fillColor}`);
    }

    /**
     * 从文本中提取心声数据
     * @param {string} text - API响应文本
     * @returns {Object|null} 心声数据对象或null
     */
    function extractMindStateFromText(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }
        
        // 查找【心声】标记
        const mindMarkerIndex = text.indexOf('【心声】');
        
        if (mindMarkerIndex === -1) {
            console.log('🔎 未在主API响应中找到【心声】标记');
            return null;
        }
        
        // 提取【心声】之后的所有内容
        const mindContent = text.substring(mindMarkerIndex + 5).trim();
        
        if (!mindContent) {
            console.log('🔎 【心声】标记后没有内容');
            return null;
        }
        
        console.log('📋 从主API响应中提取到心声内容，长度:', mindContent.length);
        console.log('📋 心声原始内容:', mindContent.substring(0, 200));
        
        let mindState = {};
        
        // 字段定义 - 必须与AI实际输出的标签完全一致
        const fieldDefinitions = [
            { key: 'location', labels: ['位置', 'Location'] },
            { key: 'outfit', labels: ['穿搭', 'Outfit'] },
            // 基础指标
            { key: 'stamina', labels: ['体力', 'Stamina'] },
            { key: 'staminaDesc', labels: ['状态', 'Status'] },
            { key: 'sanity', labels: ['理智', 'Sanity'] },
            { key: 'sanityDesc', labels: ['理智线', 'Mental Line'] },
            { key: 'stress', labels: ['压力', 'Stress'] },
            { key: 'stressSource', labels: ['压力源', 'Stress Source'] },
            // 情感羁绊 - 注意：主标签（百分比）和子标签（描述）是相同的
            { key: 'possessiveness', labels: ['占有欲', 'Possessiveness'] },
            { key: 'possessivenessAction', labels: ['占有欲行为', 'Possessiveness Action'] },
            { key: 'jealousy', labels: ['醋意值', 'Jealousy'] },
            { key: 'jealousyTrigger', labels: ['醋意值触发', 'Jealousy Trigger'] },
            { key: 'security', labels: ['安全感', 'Security'] },
            { key: 'securityDesc', labels: ['安全感状态', 'Security Status'] },
            // 欲望
            { key: 'excitement', labels: ['兴奋度', 'Excitement'] },
            { key: 'excitementDesc', labels: ['兴奋度描述', 'Excitement Desc'] },
            { key: 'sensitivity', labels: ['敏感度', 'Sensitivity'] },
            { key: 'weakPoints', labels: ['敏感度描述', 'G点状态', 'Sensitivity Desc'] },
            { key: 'desire', labels: ['渴望程度', 'Desire Level'] },
            { key: 'desireDesc', labels: ['渴望', 'Desire'] },
            { key: 'bodyReaction', labels: ['身体反应', 'Body Reaction'] },
            { key: 'bodyTrait', labels: ['体征', 'Physical Trait'] },
            { key: 'bodyLower', labels: ['下身', 'Lower Body'] },
            { key: 'bodyInstinct', labels: ['本能', 'Instinct'] },
            // 随身物品
            { key: 'coreItem', labels: ['核心物品', 'Core Item'] },
            { key: 'consumable', labels: ['消耗品', 'Consumable'] },
            { key: 'hiddenItem', labels: ['隐藏物品', 'Hidden Item'] },
            // 心声
            { key: 'mindVoice', labels: ['心声', 'Inner Voice'] },
            { key: 'hiddenMeaning', labels: ['潜台词', '真意', 'Subtext'] },
            // 好感度
            { key: 'affinity', labels: ['好感度', 'Affinity'] },
            { key: 'affinityChange', labels: ['好感度变化', 'Affinity Change'] },
            { key: 'affinityReason', labels: ['好感度原因', 'Reason'] }
        ];
        
        // 处理所有字段 - 使用更灵活的提取方法
        for (const fieldDef of fieldDefinitions) {
            let value = null;
            
            // 尝试所有可能的标签
            for (const label of fieldDef.labels) {
                // 创建更灵活的匹配模式
                const patterns = [
                    // 模式1：标签：内容（单行，匹配到换行符）
                    new RegExp(`${label}[：:]+\\s*([^\\n]+)`, 'i'),
                    // 模式2：标签：内容（多行，匹配到下一个标签）
                    new RegExp(`${label}[：:]\\s*([\\s\\S]*?)(?=\\n(?:位置|穿搭|体力|状态|理智|理智线|压力|压力源|占有欲|占有欲行为|醋意值|醋意值触发|安全感|安全感状态|兴奋度|兴奋度描述|敏感度|敏感度描述|G点状态|渴望程度|渴望|身体反应|体征|下身|本能|核心物品|消耗品|隐藏物品|心声|潜台词|真意|好感度|好感度变化|好感度原因|基础指标|情感羁绊|欲望|随身物品)[：:]|$)`, 'i'),
                    // 模式3：标签：内容（宽松模式）
                    new RegExp(`${label}[：:]\\s*(.+?)(?=\\n\\n|$)`, 'is')
                ];
                
                for (const pattern of patterns) {
                    const match = mindContent.match(pattern);
                    if (match && match[1]) {
                        value = match[1].trim();
                        // 移除多余的标点和标记
                        value = value.replace(/^[：:]+/, '').trim();
                        // 移除开头的换行符
                        value = value.replace(/^\n+/, '').trim();
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
                // 清理值：移除可能的多余标记
                value = value.replace(/【.*?】/g, '').trim();
                
                // 保留必要的换行，但移除多余的空白
                value = value.replace(/\n{3,}/g, '\n\n').trim();
                
                // 防止字段值过长被其他字段内容污染
                if (value.length > 1000) {
                    value = value.substring(0, 1000);
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
            console.log('⚠️ 心声数据解析失败，内容可能格式不正确');
            console.log('解析的内容:', mindContent);
            return null;
        }
        
        console.log('✅ 成功从主API响应中提取心声数据:', mindState);
        return mindState;
    }

    /**
     * 获取心声系统提示词
     * @returns {string} 心声系统提示词
     */
    function getMindStateSystemPrompt() {
        return `【重要】必须每次在回复最后添加以下格式的心声信息，不能省略、不能变更格式：

【心声】
位置：当前所在位置的具体场景地点以及相对位置
穿搭: 上装与下装描述(材质/状态)、关键饰品(暗示性格或关系)，注意描述细节：如领口敞开的程度、衣物上沾染的气味、或是某处显眼的污渍/褶皱。

基础指标：
体力: ▮▮▮▮▮▯▯▯▯▯ (xx%)
状态：状态描述此处填写约15-30字，描述身体当前的疲劳程度或爆发力储备。

理智: ▮▮▯▯▯▯▯▯▯▯ (xx%)
理智线：精神侧写，此处填写约15-30字，描述理智线的状态。例：红灯闪烁，全凭此时此刻你在他视线范围内吊着一口气。

压力: ▮▮▮▮▮▮▮▮▯▯ (xx%)
压力源：列举2-3个具体来源。例：外界的噪音、无法触碰你的焦虑、被抛弃的妄想。

[情感羁绊]
占有欲: ▮▮▮▮▮▮▮▮▯▯ (xx%)
占有欲行为：他此时想要做什么来确认主权？例：想要把名字刻在你的骨血里。

醋意值: ▮▮▮▮▮▮▮▮▯▯ (xx%)
醋意值触发：他对什么感到不满？例：仅仅是路过的风吹起了你的头发，他都觉得那是冒犯。

安全感: ▮▮▮▮▮▮▮▮▯▯ (xx%)
安全感状态：他是否感到安全？若破碎，需要何种特定行为修复？例：急需通过疼痛或体温来确认存在感。

[欲望]
兴奋度: ▮▮▮▮▯▯▯▯▯▯ (xx%)
兴奋度描述：此处描写身体的直接反馈。例：处于"待机"状态，但引信已经暴露在外，等待点火。

敏感度: ▮▮▮▮▮▮▮▮▯▯ (xx%)
敏感度描述：列举3-4个具体部位目前的反应。包含：声音变化、肌肉颤抖、体温升高等细节。

渴望程度: ▮▮▮▮▮▮▯▯▯▯ (xx%)
渴望：意象化描述，心理层面的渴求：他此时想要如何对待你，或希望被你如何对待？需包含矛盾感或强烈的情绪色彩。

[身体反应]
- 体征：面部/皮肤/汗水等微观描写。例：眼角泛起生理性的泪花，脖颈青筋浮现。
- 下身：此处可大胆描写其充血、勃起程度或体液分泌情况。
- 本能：动物性的冲动。例：想要撕咬、想要筑巢、想要臣服。

[随身物品]
- 核心物品：对他意义重大的物品，通常与你有关。
- 消耗品：香烟、糖果、药物等，体现生活习惯。
- 隐藏物品：平时不轻易示人的物品，暗示其阴暗面或深情。

[此时此刻的心声]
心声：此处填写角色的台词/独白，语气需极度符合人设，包含停顿、喘息或语气词
潜台词：此处揭露他口是心非之下，灵魂深处最卑微或最狂乱的祈求。建议使用第二人称"你"来增强冲击力

好感度：[0-100整数] 好感度变化：[±10] 好感度原因：[20字以内]

IMPORTANT: 心声必须在回复最后、不能分割到多个MSG、所有字段必须有内容、使用中文冒号：
`;
    }

    /**
     * 打开角色心声对话框
     * @param {Object} chat - 聊天对象
     */
    function openCharacterMindState(chat) {
        let modal = document.getElementById('mind-state-modal');
        if (modal) modal.remove();
        
        modal = document.createElement('div');
        modal.id = 'mind-state-modal';
        modal.className = 'emoji-mgmt-modal show';
        modal.style.cssText = 'background:rgba(255,240,245,0.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);';
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // 获取或初始化心声数据
        if (!chat.mindStates) {
            chat.mindStates = [];
        }
        
        const mindItems = [
            { key: 'affinity', label: '好感度', format: 'affinity' },
            { key: 'location', label: '位置' },
            { key: 'outfit', label: '穿搭' },
            { key: 'stamina', label: '体力' },
            { key: 'staminaDesc', label: '状态描述' },
            { key: 'sanity', label: '理智' },
            { key: 'sanityDesc', label: '精神侧写' },
            { key: 'stress', label: '压力' },
            { key: 'stressSource', label: '压力源' },
            { key: 'possessiveness', label: '占有欲' },
            { key: 'possessivenessAction', label: '行为预测' },
            { key: 'jealousy', label: '醋意值' },
            { key: 'jealousyTrigger', label: '触发阈值' },
            { key: 'security', label: '安全感' },
            { key: 'securityDesc', label: '状态详述' },
            { key: 'excitement', label: '兴奋度' },
            { key: 'excitementDesc', label: '阶段描述' },
            { key: 'sensitivity', label: '敏感度' },
            { key: 'weakPoints', label: 'G点/弱点' },
            { key: 'desire', label: '渴望程度' },
            { key: 'desireDesc', label: '意象化描述' },
            { key: 'bodyReaction', label: '身体反应' },
            { key: 'items', label: '随身物品' },
            { key: 'innerVoice', label: '此时此刻的心声' },
            { key: 'subtext', label: '潜台词/真意' }
        ];
        
        // 获取当前状态
        const currentState = chat.mindStates[chat.mindStates.length - 1] || {};
        const isFailedState = currentState.failed;
        
        let content = `
            <div class="emoji-mgmt-content" style="max-width:min(420px,95vw);width:100%;background:linear-gradient(180deg,#fffbfd 0%,#fff5f9 100%);display:flex;flex-direction:column;max-height:90vh;border-radius:20px;overflow:hidden;box-shadow:0 24px 48px rgba(255,182,193,0.25),0 0 0 1px rgba(255,240,245,0.5);position:relative;margin:0 auto;">
                <div style="position:absolute;top:0;left:0;right:0;height:200px;background:radial-gradient(ellipse at top,rgba(255,228,235,0.4) 0%,transparent 70%);pointer-events:none;"></div>
                <div style="position:relative;padding:clamp(18px,5vw,28px) clamp(16px,4vw,24px) clamp(16px,4vw,22px);background:linear-gradient(135deg,rgba(255,245,250,0.95) 0%,rgba(255,250,252,0.9) 100%);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,228,235,0.3);">
                    <h3 style="margin:0;font-size:clamp(18px,5vw,22px);font-weight:700;color:#ff85a6;letter-spacing:0.5px;text-shadow:0 2px 8px rgba(255,133,166,0.2);text-align:center;">${chat.name}的心声</h3>
                </div>
                ${isFailedState ? `<div style="margin:clamp(12px,3vw,18px) clamp(12px,3vw,20px) 0;padding:clamp(12px,3vw,16px) clamp(14px,3vw,18px);background:linear-gradient(135deg,rgba(255,235,240,0.9),rgba(255,245,248,0.9));border-radius:14px;border:1px solid rgba(255,192,203,0.3);box-shadow:0 4px 12px rgba(255,182,193,0.1);"><div style="color:#ff6b9d;font-size:clamp(12px,3vw,13px);line-height:1.7;font-weight:500;">心声提取失败：请确保API已配置正确，且AI在回复末尾添加了完整的【心声】标记。</div></div>` : ''}
                
                <div style="padding:clamp(16px,4vw,22px) clamp(12px,3vw,20px) clamp(12px,3vw,16px);flex:1;overflow-y:auto;overflow-x:hidden;position:relative;-webkit-overflow-scrolling:touch;">
        `;
        
        mindItems.forEach(item => {
            // 不使用默认值"暂无"，直接显示空或已生成的值
            let value = currentState[item.key] !== undefined ? currentState[item.key] : null;
            let displayValue = value;
            
            // 检查是否有失败标记
            if (currentState.failed) {
                // 显示失败原因，但不影响其他字段的显示
                if (item.key === 'outfit') {
                    // 在第一个字段（穿搭）处显示失败提示
                    content += `
                        <div style="margin-bottom:18px;padding:18px 20px;background:linear-gradient(135deg,rgba(255,235,240,0.8),rgba(255,245,248,0.8));border-radius:18px;border:1px solid rgba(255,192,203,0.25);box-shadow:0 4px 16px rgba(255,182,193,0.08);">
                            <div style="font-size:13px;color:#ff6b9d;line-height:1.8;font-weight:500;">${currentState.reason || '心声数据提取失败'}</div>
                        </div>
                    `;
                    return;
                }
            }
            
            // 好感度特殊处理（移到最前面，并显示变化和原因）
            if (item.key === 'affinity' && typeof value === 'number') {
                const affinityColor = value >= 70 ? '#ff6b9d' : (value >= 40 ? '#ff85a6' : '#ffabc0');
                const change = currentState.affinityChange || 0;
                const changeDisplay = change > 0 ? `+${change}` : change;
                const reason = currentState.affinityReason || '';
                
                const affinityBar = `
                    <div style="width:100%;height:6px;background:linear-gradient(90deg,rgba(255,218,228,0.4),rgba(255,228,235,0.4));border-radius:20px;margin-top:clamp(12px,3vw,16px);overflow:hidden;position:relative;box-shadow:inset 0 1px 3px rgba(255,182,193,0.1);">
                        <div style="width:${value}%;height:100%;background:linear-gradient(90deg,#ffd5e0 0%,#ffabc0 50%,#ff85a6 100%);transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1);border-radius:20px;box-shadow:0 0 12px rgba(255,133,166,0.5);"></div>
                    </div>
                    <div style="font-size:clamp(22px,6vw,26px);font-weight:800;color:${affinityColor};margin-top:clamp(10px,2.5vw,14px);text-align:center;letter-spacing:1px;text-shadow:0 2px 12px rgba(255,133,166,0.25);">${value}<span style="font-size:clamp(14px,3.5vw,16px);color:#ffabc0;margin-left:2px;">/100</span></div>
                `;
                
                let changeReasonHtml = '';
                if (change !== 0 || reason) {
                    changeReasonHtml = `<div style="margin-top:clamp(12px,3vw,16px);padding-top:clamp(12px,3vw,16px);border-top:1px solid rgba(255,218,228,0.4);">`;
                    if (change !== 0) {
                        const changeColor = change > 0 ? '#ff6b9d' : (change < 0 ? '#ff85a6' : '#ffabc0');
                        const changeBg = change > 0 ? 'rgba(255,218,228,0.4)' : 'rgba(255,228,235,0.4)';
                        changeReasonHtml += `<div style="display:inline-block;background:${changeBg};padding:6px clamp(10px,2.5vw,14px);border-radius:20px;color:${changeColor};font-weight:700;margin-bottom:8px;font-size:clamp(12px,2.8vw,13px);">变化 ${changeDisplay}</div>`;
                    }
                    if (reason) {
                        changeReasonHtml += `<div style="color:#b08ba6;line-height:1.7;font-size:clamp(12px,3vw,13px);">${escapeHtml(String(reason))}</div>`;
                    }
                    changeReasonHtml += `</div>`;
                }
                
                content += `
                    <div style="margin-bottom:clamp(14px,3vw,18px);padding:clamp(18px,4vw,24px) clamp(16px,3vw,22px);background:linear-gradient(135deg,#ffffff 0%,#fffafc 50%,#fff8fb 100%);border-radius:18px;border:1px solid rgba(255,218,228,0.5);box-shadow:0 8px 28px rgba(255,182,193,0.18);position:relative;overflow:hidden;">
                        <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:radial-gradient(circle,rgba(255,218,228,0.15),transparent 70%);"></div>
                        <div style="position:relative;font-size:clamp(14px,3.5vw,15px);font-weight:700;color:#ff85a6;margin-bottom:6px;letter-spacing:0.5px;">${item.label}</div>
                        ${affinityBar}
                        ${changeReasonHtml}
                    </div>
                `;
                return;
            }
            
            // 只显示非空的字段
            if (value === null || value === undefined || value === '') {
                return; // 跳过空字段，不显示
            }
            
            // 检查字段值是否被污染（包含其他标签的内容）
            const hasOtherLabels = /位置|穿搭|体力|状态描述|理智|精神侧写|压力|压力源|占有欲|行为预测|醋意值|触发阈值|安全感|状态详述|兴奋度|阶段描述|敏感度|G点|弱点|渴望程度|意象化描述|身体反应|随身物品|此时此刻的心声|潜台词|真意|好感度/.test(String(value));
            
            content += `
                <div style="margin-bottom:clamp(12px,2.5vw,14px);padding:clamp(16px,3.5vw,20px);background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,250,252,0.95));border-radius:16px;border:1px solid rgba(255,218,228,0.4);box-shadow:0 6px 20px rgba(255,182,193,0.12);transition:all 0.4s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;" onmouseover="this.style.boxShadow='0 8px 32px rgba(255,182,193,0.2)';this.style.transform='translateY(-3px)';this.style.borderColor='rgba(255,192,203,0.5)'" onmouseout="this.style.boxShadow='0 6px 20px rgba(255,182,193,0.12)';this.style.transform='translateY(0)';this.style.borderColor='rgba(255,218,228,0.4)'">
                    <div style="position:absolute;top:0;left:0;right:0;height:60%;background:linear-gradient(180deg,rgba(255,240,245,0.3),transparent);pointer-events:none;"></div>
                    <div style="position:relative;font-size:clamp(12px,3vw,13px);color:#ff85a6;font-weight:700;margin-bottom:10px;letter-spacing:0.3px;">${item.label}</div>
                    <div style="position:relative;font-size:clamp(13px,3.2vw,14px);color:${hasOtherLabels ? '#ff6b9d' : '#9b7a9f'};word-break:break-all;line-height:1.9;font-weight:400;">${escapeHtml(String(displayValue))}</div>
                </div>
            `;
        });
        
        content += `
                </div>
                
                <div style="padding:clamp(14px,3.5vw,20px) clamp(12px,3vw,20px);background:linear-gradient(135deg,rgba(255,250,252,0.98),rgba(255,245,250,0.98));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid rgba(255,218,228,0.3);display:flex;gap:clamp(10px,2.5vw,14px);flex-shrink:0;">
                    <button onclick="MindStateManager.showCharacterMindHistory('${chat.id}');" style="flex:1;padding:clamp(12px,3vw,14px);border:1.5px solid rgba(255,192,203,0.4);background:rgba(255,255,255,0.8);border-radius:16px;cursor:pointer;font-size:clamp(13px,3.2vw,14px);color:#ff85a6;font-weight:700;transition:all 0.3s;box-shadow:0 4px 16px rgba(255,182,193,0.12);white-space:nowrap;" onmouseover="this.style.background='rgba(255,250,252,0.95)';this.style.boxShadow='0 6px 24px rgba(255,182,193,0.22)';this.style.transform='translateY(-2px)';this.style.borderColor='rgba(255,192,203,0.6)'" onmouseout="this.style.background='rgba(255,255,255,0.8)';this.style.boxShadow='0 4px 16px rgba(255,182,193,0.12)';this.style.transform='translateY(0)';this.style.borderColor='rgba(255,192,203,0.4)'">历史心声</button>
                    <button onclick="document.getElementById('mind-state-modal').remove();" style="flex:1;padding:clamp(12px,3vw,14px);border:none;background:linear-gradient(135deg,#ff85a6 0%,#ff6b9d 100%);color:#fff;border-radius:16px;cursor:pointer;font-size:clamp(13px,3.2vw,14px);font-weight:700;transition:all 0.3s;box-shadow:0 6px 20px rgba(255,107,157,0.4);white-space:nowrap;" onmouseover="this.style.boxShadow='0 8px 32px rgba(255,107,157,0.55)';this.style.transform='translateY(-2px) scale(1.02)'" onmouseout="this.style.boxShadow='0 6px 20px rgba(255,107,157,0.4)';this.style.transform='translateY(0) scale(1)'">关闭</button>
                </div>
            </div>
        `;
        
        modal.innerHTML = content;
        document.body.appendChild(modal);
    }

    /**
     * 清空角色心声
     * @param {string} charId - 角色ID
     */
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

    /**
     * 显示角色历史心声
     * @param {string} charId - 角色ID
     */
    function showCharacterMindHistory(charId) {
        const chat = AppState.conversations.find(c => c.id === charId);
        if (!chat) return;
        
        let modal = document.getElementById('mind-history-modal');
        if (modal) modal.remove();
        
        modal = document.createElement('div');
        modal.id = 'mind-history-modal';
        modal.className = 'emoji-mgmt-modal show';
        modal.style.cssText = 'background:rgba(255,240,245,0.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);';
        
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
                    const affinityColor = state.affinity >= 70 ? '#ff6b9d' : (state.affinity >= 40 ? '#ff85a6' : '#ffabc0');
                    const change = state.affinityChange || 0;
                    const changeDisplay = change > 0 ? `+${change}` : change;
                    const reason = state.affinityReason || '';
                    
                    affinityDisplay = `<div style="margin-bottom:clamp(10px,2.5vw,14px);padding:clamp(10px,2.5vw,12px) clamp(12px,3vw,16px);background:linear-gradient(135deg,rgba(255,250,252,0.8),rgba(255,255,255,0.8));border-radius:12px;border:1px solid rgba(255,218,228,0.4);">
                        <span style="color:${affinityColor};font-size:clamp(12px,3vw,13px);font-weight:700;">好感度：</span>
                        <span style="color:${affinityColor};font-size:clamp(14px,3.5vw,16px);font-weight:800;">${state.affinity}/100</span>`;
                    
                    if (change !== 0 || reason) {
                        const changeColor = change > 0 ? '#ff6b9d' : (change < 0 ? '#ff85a6' : '#ffabc0');
                        if (change !== 0) {
                            affinityDisplay += `<span style="color:${changeColor};font-size:clamp(11px,2.5vw,12px);margin-left:6px;font-weight:700;">(${changeDisplay})</span>`;
                        }
                        if (reason) {
                            affinityDisplay += `<div style="font-size:clamp(11px,2.5vw,12px);color:#b08ba6;margin-top:6px;line-height:1.6;">原因：${escapeHtml(reason)}</div>`;
                        }
                    }
                    affinityDisplay += `</div>`;
                }
                
                historyContent += `
                    <div style="margin-bottom:clamp(12px,3vw,16px);padding:clamp(16px,3.5vw,20px);background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,250,252,0.95));border-radius:16px;border:1px solid rgba(255,218,228,0.4);position:relative;box-shadow:0 6px 20px rgba(255,182,193,0.12);transition:all 0.4s cubic-bezier(0.4,0,0.2,1);overflow:hidden;" onmouseover="this.style.boxShadow='0 8px 32px rgba(255,182,193,0.2)';this.style.transform='translateY(-3px)';this.style.borderColor='rgba(255,192,203,0.5)'" onmouseout="this.style.boxShadow='0 6px 20px rgba(255,182,193,0.12)';this.style.transform='translateY(0)';this.style.borderColor='rgba(255,218,228,0.4)'">
                        <div style="position:absolute;top:0;left:0;right:0;height:50%;background:linear-gradient(180deg,rgba(255,240,245,0.3),transparent);pointer-events:none;"></div>
                        <button onclick="MindStateManager.deleteSingleMindState('${chat.id}', ${i})" style="position:relative;float:right;padding:clamp(5px,1.2vw,6px) clamp(10px,2.5vw,14px);border:1px solid rgba(255,192,203,0.4);background:rgba(255,255,255,0.8);color:#ff85a6;border-radius:12px;cursor:pointer;font-size:clamp(10px,2.2vw,11px);white-space:nowrap;font-weight:700;transition:all 0.3s;" onmouseover="this.style.background='rgba(255,250,252,0.95)';this.style.borderColor='rgba(255,192,203,0.6)'" onmouseout="this.style.background='rgba(255,255,255,0.8)';this.style.borderColor='rgba(255,192,203,0.4)'">删除</button>
                        <div style="position:relative;font-size:clamp(10px,2.2vw,11px);color:#d4a5b8;margin-bottom:clamp(10px,2.5vw,14px);font-weight:700;letter-spacing:0.3px;">记录 #${recordIndex}</div>
                        ${affinityDisplay}
                        ${Object.entries(state).filter(([key]) => !['affinity', 'affinityChange', 'affinityReason', 'timestamp', 'messageId', 'failed', 'reason', 'failedReason'].includes(key)).map(([key, value]) => {
                            const labels = {
                                'location': '位置',
                                'outfit': '穿搭',
                                'stamina': '体力',
                                'staminaDesc': '状态描述',
                                'sanity': '理智',
                                'sanityDesc': '精神侧写',
                                'stress': '压力',
                                'stressSource': '压力源',
                                'possessiveness': '占有欲',
                                'possessivenessAction': '行为预测',
                                'jealousy': '醋意值',
                                'jealousyTrigger': '触发阈值',
                                'security': '安全感',
                                'securityDesc': '状态详述',
                                'excitement': '兴奋度',
                                'excitementDesc': '阶段描述',
                                'sensitivity': '敏感度',
                                'weakPoints': 'G点/弱点',
                                'desire': '渴望程度',
                                'desireDesc': '意象化描述',
                                'bodyReaction': '身体反应',
                                'items': '随身物品',
                                'innerVoice': '此时此刻的心声',
                                'subtext': '潜台词/真意'
                            };
                            if (!labels[key]) return '';
                            return `<div style="position:relative;margin-bottom:clamp(10px,2.5vw,12px);line-height:1.8;"><span style="color:#ff85a6;font-size:clamp(11px,2.5vw,12px);font-weight:700;">${labels[key]}：</span><span style="color:#9b7a9f;font-size:clamp(12px,3vw,13px);">${escapeHtml(String(value))}</span></div>`;
                        }).join('')}
                    </div>
                `;
            }
        } else {
            historyContent = '<div style="text-align:center;color:#d4a5b8;padding:clamp(40px,10vw,50px) clamp(16px,4vw,20px);font-size:clamp(13px,3.2vw,14px);line-height:1.8;">暂无历史心声记录<br>开始对话即可生成心声</div>';
        }
        
        let content = `
            <div class="emoji-mgmt-content" style="max-width:min(420px,95vw);width:100%;background:linear-gradient(180deg,#fffbfd 0%,#fff5f9 100%);display:flex;flex-direction:column;max-height:90vh;border-radius:20px;overflow:hidden;box-shadow:0 24px 48px rgba(255,182,193,0.25);position:relative;margin:0 auto;">
                <div style="position:absolute;top:0;left:0;right:0;height:200px;background:radial-gradient(ellipse at top,rgba(255,228,235,0.4) 0%,transparent 70%);pointer-events:none;"></div>
                <div style="position:relative;padding:clamp(18px,5vw,28px) clamp(16px,4vw,24px) clamp(16px,4vw,22px);background:linear-gradient(135deg,rgba(255,245,250,0.95) 0%,rgba(255,250,252,0.9) 100%);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,218,228,0.3);">
                    <h3 style="margin:0;font-size:clamp(18px,5vw,22px);font-weight:700;color:#ff85a6;letter-spacing:0.5px;text-shadow:0 2px 8px rgba(255,133,166,0.2);text-align:center;">${chat.name}的历史心声</h3>
                </div>
                
                <div style="padding:clamp(16px,4vw,22px) clamp(12px,3vw,20px) clamp(12px,3vw,16px);flex:1;overflow-y:auto;overflow-x:hidden;position:relative;-webkit-overflow-scrolling:touch;">
                    ${historyContent}
                </div>
                
                <div style="padding:clamp(14px,3.5vw,20px) clamp(12px,3vw,20px);background:linear-gradient(135deg,rgba(255,250,252,0.98),rgba(255,245,250,0.98));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid rgba(255,218,228,0.3);display:flex;gap:clamp(10px,2.5vw,14px);flex-shrink:0;">
                    ${(chat.mindStates && chat.mindStates.length > 0) ? `<button onclick="MindStateManager.openDeleteConfirmDialog('${chat.id}');" style="flex:1;padding:clamp(12px,3vw,14px);border:1.5px solid rgba(255,192,203,0.4);background:rgba(255,255,255,0.8);border-radius:16px;cursor:pointer;font-size:clamp(13px,3.2vw,14px);color:#ff85a6;font-weight:700;transition:all 0.3s;box-shadow:0 4px 16px rgba(255,182,193,0.12);white-space:nowrap;" onmouseover="this.style.background='rgba(255,250,252,0.95)';this.style.boxShadow='0 6px 24px rgba(255,182,193,0.22)';this.style.transform='translateY(-2px)';this.style.borderColor='rgba(255,192,203,0.6)'" onmouseout="this.style.background='rgba(255,255,255,0.8)';this.style.boxShadow='0 4px 16px rgba(255,182,193,0.12)';this.style.transform='translateY(0)';this.style.borderColor='rgba(255,192,203,0.4)'">清空全部</button>` : ''}
                    <button onclick="document.getElementById('mind-history-modal').remove();" style="flex:1;padding:clamp(12px,3vw,14px);border:none;background:linear-gradient(135deg,#ff85a6 0%,#ff6b9d 100%);color:#fff;border-radius:16px;cursor:pointer;font-size:clamp(13px,3.2vw,14px);font-weight:700;transition:all 0.3s;box-shadow:0 6px 20px rgba(255,107,157,0.4);white-space:nowrap;" onmouseover="this.style.boxShadow='0 8px 32px rgba(255,107,157,0.55)';this.style.transform='translateY(-2px) scale(1.02)'" onmouseout="this.style.boxShadow='0 6px 20px rgba(255,107,157,0.4)';this.style.transform='translateY(0) scale(1)'">关闭</button>
                </div>
            </div>
        `;
        
        modal.innerHTML = content;
        document.body.appendChild(modal);
    }

    /**
     * 打开删除确认对话框
     * @param {string} charId - 角色ID
     */
    function openDeleteConfirmDialog(charId) {
        const chat = AppState.conversations.find(c => c.id === charId);
        if (!chat) return;
        
        let confirmModal = document.getElementById('delete-confirm-modal');
        if (confirmModal) confirmModal.remove();
        
        confirmModal = document.createElement('div');
        confirmModal.id = 'delete-confirm-modal';
        confirmModal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,240,245,0.92);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);display:flex;justify-content:center;align-items:center;z-index:9999999;';
        
        confirmModal.addEventListener('click', function(e) {
            if (e.target === confirmModal) {
                confirmModal.remove();
            }
        });
        
        const content = `
            <div style="background:linear-gradient(180deg,#ffffff 0%,#fffbfd 100%);border-radius:20px;padding:clamp(24px,6vw,36px) clamp(20px,5vw,30px);max-width:min(360px,90vw);width:100%;text-align:center;box-shadow:0 24px 56px rgba(255,182,193,0.35);border:1px solid rgba(255,228,235,0.6);position:relative;overflow:hidden;margin:0 auto;">
                <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:radial-gradient(circle,rgba(255,218,228,0.2),transparent 70%);"></div>
                <div style="position:relative;font-size:clamp(17px,4.5vw,20px);font-weight:700;color:#ff85a6;margin-bottom:clamp(14px,3.5vw,18px);letter-spacing:0.5px;">确定要清空全部心声吗？</div>
                <div style="position:relative;font-size:clamp(13px,3.2vw,14px);color:#b08ba6;margin-bottom:clamp(24px,6vw,32px);line-height:1.8;">此操作无法撤销，${chat.name}的所有历史心声记录将被永久删除。</div>
                <div style="position:relative;display:flex;gap:clamp(10px,2.5vw,14px);">
                    <button onclick="document.getElementById('delete-confirm-modal').remove();" style="flex:1;padding:clamp(12px,3vw,14px);border:1.5px solid rgba(255,192,203,0.4);background:rgba(255,255,255,0.8);border-radius:16px;cursor:pointer;font-size:clamp(13px,3.2vw,14px);color:#ff85a6;font-weight:700;transition:all 0.3s;box-shadow:0 4px 16px rgba(255,182,193,0.12);white-space:nowrap;" onmouseover="this.style.background='rgba(255,250,252,0.95)';this.style.boxShadow='0 6px 24px rgba(255,182,193,0.22)';this.style.transform='translateY(-2px)';this.style.borderColor='rgba(255,192,203,0.6)'" onmouseout="this.style.background='rgba(255,255,255,0.8)';this.style.boxShadow='0 4px 16px rgba(255,182,193,0.12)';this.style.transform='translateY(0)';this.style.borderColor='rgba(255,192,203,0.4)'">取消</button>
                    <button onclick="MindStateManager.deleteCharacterMindStates('${charId}');document.getElementById('delete-confirm-modal').remove();" style="flex:1;padding:clamp(12px,3vw,14px);border:none;background:linear-gradient(135deg,#ff85a6 0%,#ff6b9d 100%);border-radius:16px;cursor:pointer;font-size:clamp(13px,3.2vw,14px);color:#fff;font-weight:700;transition:all 0.3s;box-shadow:0 6px 20px rgba(255,107,157,0.4);white-space:nowrap;" onmouseover="this.style.boxShadow='0 8px 32px rgba(255,107,157,0.55)';this.style.transform='translateY(-2px) scale(1.02)'" onmouseout="this.style.boxShadow='0 6px 20px rgba(255,107,157,0.4)';this.style.transform='translateY(0) scale(1)'">确定删除</button>
                </div>
            </div>
        `;
        
        confirmModal.innerHTML = content;
        document.body.appendChild(confirmModal);
    }

    /**
     * 删除单条心声记录
     * @param {string} charId - 角色ID
     * @param {number} index - 记录索引
     */
    function deleteSingleMindState(charId, index) {
        const chat = AppState.conversations.find(c => c.id === charId);
        if (!chat || !chat.mindStates) return;
        
        if (!confirm('确定要删除这条心声记录吗？')) return;
        
        chat.mindStates.splice(index, 1);
        saveToStorage();
        showToast('心声已删除');
        showCharacterMindHistory(charId);
    }

    /**
     * 删除角色所有心声
     * @param {string} charId - 角色ID
     */
    function deleteCharacterMindStates(charId) {
        const chat = AppState.conversations.find(c => c.id === charId);
        if (!chat) return;
        
        if (!confirm('确定要删除该角色的所有心声记录吗？')) return;
        
        chat.mindStates = [];
        saveToStorage();
        showToast('所有心声已删除');
        openCharacterMindState(chat);
    }

    /**
     * 更新角色心声
     * @param {string} charId - 角色ID
     * @param {Object} mindData - 心声数据
     */
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

    /**
     * 处理心声数据保存（从主API响应中提取并保存）
     * @param {string} convId - 会话ID
     * @param {string} text - API响应文本
     * @returns {Object|null} 提取的心声数据
     */
    function handleMindStateSave(convId, text) {
        // 提取心声数据
        const mindStateData = extractMindStateFromText(text);
        
        // 如果心声提取失败，输出诊断信息
        if (!mindStateData) {
            console.warn('⚠️ 心声提取失败 - 可能的原因：');
            console.warn('  1. AI没有在回复末尾添加【心声】标记');
            console.warn('  2. 【心声】后面的格式不符合预期');
            console.warn('  3. 心声被分割到多条[MSG]消息中');
            console.warn('  API响应文本（前500字）:', text.substring(0, 500));
        }
        
        // 保存心声数据到会话
        const conv = AppState.conversations.find(c => c.id === convId);
        const hasValidMindData = mindStateData && Object.values(mindStateData).some(v => v !== null && v !== undefined && v !== '');
        
        if (conv && hasValidMindData) {
            if (!conv.mindStates) {
                conv.mindStates = [];
            }
            
            // 自动计算好感度变化
            if (typeof mindStateData.affinity === 'number') {
                // 获取上一次的好感度
                let previousAffinity = 50; // 默认初始好感度
                if (conv.mindStates.length > 0) {
                    const lastMindState = conv.mindStates[conv.mindStates.length - 1];
                    if (typeof lastMindState.affinity === 'number') {
                        previousAffinity = lastMindState.affinity;
                    }
                }
                
                // 计算变化值
                const change = mindStateData.affinity - previousAffinity;
                mindStateData.affinityChange = change;
                
                console.log(`💕 好感度变化计算: ${previousAffinity} → ${mindStateData.affinity} (${change >= 0 ? '+' : ''}${change})`);
            }
            
            // 添加时间戳（消息ID稍后添加）
            mindStateData.timestamp = new Date().toISOString();
            mindStateData.messageId = 'pending';  // 临时标记，稍后更新
            mindStateData.failed = false;
            conv.mindStates.push(mindStateData);
            console.log('💾 心声数据已提前保存到会话:', convId, mindStateData);
        } else if (!mindStateData || !hasValidMindData) {
            // 心声提取失败或为空 - 创建一个失败记录
            if (conv) {
                if (!conv.mindStates) {
                    conv.mindStates = [];
                }
                conv.mindStates.push({
                    timestamp: new Date().toISOString(),
                    messageId: 'pending',
                    failed: true,
                    reason: !mindStateData ? '【心声】标记未找到，请检查API回复' : '心声数据为空，请确保AI返回了完整的心声信息',
                    failedReason: !mindStateData ? 'NO_MINDSTATE_MARKER' : 'EMPTY_MINDSTATE_DATA'
                });
                console.log('⚠️ 已记录心声提取失败:', !mindStateData ? '【心声】标记未找到' : '心声数据为空');
            }
        }
        
        return mindStateData;
    }

    /**
     * 更新心声记录的消息ID
     * @param {string} convId - 会话ID
     * @param {string} messageId - 消息ID
     */
    function updateMindStateMessageId(convId, messageId) {
        const conv = AppState.conversations.find(c => c.id === convId);
        if (conv && conv.mindStates && conv.mindStates.length > 0) {
            const lastMindState = conv.mindStates[conv.mindStates.length - 1];
            if (lastMindState.messageId === 'pending') {
                lastMindState.messageId = messageId;
                console.log('✅ 已更新心声记录的消息ID:', messageId);
            }
        }
    }

    /**
     * 删除会话对应的心声数据
     * @param {string} convId - 会话ID
     */
    function removeMindStateForConversation(convId) {
        const conv = AppState.conversations.find(c => c.id === convId);
        if (conv && conv.mindStates && Array.isArray(conv.mindStates)) {
            conv.mindStates.pop();  // 删除最后一条心声记录
            console.log('🗑️ 已删除会话心声记录:', convId);
        }
    }

    // 导出公共API
    return {
        init,
        updateMindStateButton,
        extractMindStateFromText,
        getMindStateSystemPrompt,
        openCharacterMindState,
        clearCharacterMindState,
        showCharacterMindHistory,
        openDeleteConfirmDialog,
        deleteSingleMindState,
        deleteCharacterMindStates,
        updateCharacterMindState,
        handleMindStateSave,
        updateMindStateMessageId,
        removeMindStateForConversation
    };
})();

// 将MindStateManager导出到全局作用域
window.MindStateManager = MindStateManager;