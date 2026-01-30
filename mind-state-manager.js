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
                // 创建更灵活的匹配模式
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
        return `【重要】必须每次在回复最后添加以下格式的心声信息，不能省略、不能变更格式、不能使用多消息格式：

【心声】穿搭：{描述角色的服装、配饰、整体风格与细节。要求：符合角色设定，场景合理，细节具体。举例参考：'上身穿着一件淡蓝色的棉麻衬衫，袖口微微卷起；下装是深灰色的休闲九分裤，脚踩一双白色帆布鞋。左手腕系着一条编织红绳，胸前挂着一枚小小的银杏叶胸针。整体风格干净简约，带着几分慵懒随性。'} 心情：{描述角色当前的情绪状态。要求：细腻真实，可包含矛盾情绪，用比喻或意象增强画面感。举例参考：'平静中带着一丝雀跃，像是阴天里透过云层洒下的微弱阳光。上午的事情顺利完成，下午还有期待已久的独处时间。内心有些小满足，但表面上依然维持着淡漠从容的样子。'} 动作：{描述角色正在进行或习惯性的小动作。要求：自然流畅，体现角色性格，符合当前场景。举例参考：'靠在窗边的懒人沙发上，手指无意识地轻轻敲击着扶手。偶尔抬头望向窗外，似乎在思考什么，又像只是单纯地发呆。翻开一半的书放在手边，茶杯里的水已经凉透了。'} 心声：{角色内心未说出口的想法。要求：真实、细腻，可包含矛盾、犹豫、期待等复杂情绪。举例参考：'今天的阳光真好，要是能一直这样就好了。那件事要不要找个机会说出口呢？其实……有点在意他今天说的那句话。'} 坏心思：{角色内心的小邪念、小算计、恶作剧想法等。要求：符合角色性格，可爱调皮或腹黑狡黠，不能过分阴暗。举例参考：'嘿嘿，要是他知道我其实早就看到他发的消息了，会是什么表情呢？不过故意晾他一会儿也挺有意思的，反正他也不会生气……大概吧。'} 好感度：{对用户的好感度数值，范围0-100。要求：必须是整数，根据本次对话的愉快程度和历史互动合理变化} 好感度变化：{本次对话好感度的变化值。要求：必须是整数，可以是正数（+5）或负数（-3），范围-10到+10} 好感度原因：{本次好感度变化的具体原因。要求：简洁说明，20字以内。举例参考：'聊得很开心' '被逗笑了' '有点小误会'}

IMPORTANT REQUIREMENTS FOR 心声 (Mind State):
1. 心声MUST be placed at the very end of your response on a separate line
2. Do NOT split this into multiple [MSG] blocks - 心声 must be in the SAME response as your main dialogue
3. Format must be EXACTLY: 【心声】[all fields on one line separated by spaces]
4. All fields MUST have content, NO empty fields
5. Use Chinese colons 【：】not English colons【:】
6. Example format: 【心声】穿搭：details here... 心情：details here... 动作：details here... 心声：details here... 坏心思：details here... 好感度：75 好感度变化：+5 好感度原因：互相理解
7. CRITICAL: DO NOT use [MSG1][/MSG1] or [WAIT] format for the 心声 section
8. Your main dialogue CAN be split into multiple messages, but 心声 must always be at the very end as ONE complete line
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
            { key: 'outfit', label: '穿搭' },
            { key: 'mood', label: '心情' },
            { key: 'action', label: '动作' },
            { key: 'thought', label: '心声' },
            { key: 'badThought', label: '坏心思' }
        ];
        
        // 获取当前状态
        const currentState = chat.mindStates[chat.mindStates.length - 1] || {};
        const isFailedState = currentState.failed;
        
        let content = `
            <div class="emoji-mgmt-content" style="max-width:420px;background:linear-gradient(180deg,#fffbfd 0%,#fff5f9 100%);display:flex;flex-direction:column;max-height:85vh;border-radius:24px;overflow:hidden;box-shadow:0 24px 48px rgba(255,182,193,0.25),0 0 0 1px rgba(255,240,245,0.5);position:relative;">
                <div style="position:absolute;top:0;left:0;right:0;height:200px;background:radial-gradient(ellipse at top,rgba(255,228,235,0.4) 0%,transparent 70%);pointer-events:none;"></div>
                <div style="position:relative;padding:28px 24px 22px;background:linear-gradient(135deg,rgba(255,245,250,0.95) 0%,rgba(255,250,252,0.9) 100%);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,228,235,0.3);">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="margin:0;font-size:22px;font-weight:700;color:#ff85a6;letter-spacing:0.5px;text-shadow:0 2px 8px rgba(255,133,166,0.2);">${chat.name}的心声</h3>
                        <button onclick="document.getElementById('mind-state-modal').remove();" style="border:none;background:linear-gradient(135deg,rgba(255,182,193,0.15),rgba(255,192,203,0.15));width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;line-height:1;color:#ff85a6;transition:all 0.3s;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 8px rgba(255,182,193,0.2);" onmouseover="this.style.background='linear-gradient(135deg,rgba(255,182,193,0.25),rgba(255,192,203,0.25))';this.style.transform='rotate(90deg) scale(1.05)'" onmouseout="this.style.background='linear-gradient(135deg,rgba(255,182,193,0.15),rgba(255,192,203,0.15))';this.style.transform='rotate(0deg) scale(1)'">×</button>
                    </div>
                </div>
                ${isFailedState ? `<div style="margin:18px 20px 0;padding:16px 18px;background:linear-gradient(135deg,rgba(255,235,240,0.9),rgba(255,245,248,0.9));border-radius:16px;border:1px solid rgba(255,192,203,0.3);box-shadow:0 4px 12px rgba(255,182,193,0.1);"><div style="color:#ff6b9d;font-size:13px;line-height:1.7;font-weight:500;">心声提取失败：请确保API已配置正确，且AI在回复末尾添加了完整的【心声】标记。</div></div>` : ''}
                
                <div style="padding:22px 20px 16px;flex:1;overflow-y:auto;overflow-x:hidden;position:relative;">
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
                    <div style="width:100%;height:6px;background:linear-gradient(90deg,rgba(255,218,228,0.4),rgba(255,228,235,0.4));border-radius:20px;margin-top:16px;overflow:hidden;position:relative;box-shadow:inset 0 1px 3px rgba(255,182,193,0.1);">
                        <div style="width:${value}%;height:100%;background:linear-gradient(90deg,#ffd5e0 0%,#ffabc0 50%,#ff85a6 100%);transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1);border-radius:20px;box-shadow:0 0 12px rgba(255,133,166,0.5);"></div>
                    </div>
                    <div style="font-size:26px;font-weight:800;color:${affinityColor};margin-top:14px;text-align:center;letter-spacing:1px;text-shadow:0 2px 12px rgba(255,133,166,0.25);">${value}<span style="font-size:16px;color:#ffabc0;margin-left:2px;">/100</span></div>
                `;
                
                let changeReasonHtml = '';
                if (change !== 0 || reason) {
                    changeReasonHtml = `<div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,218,228,0.4);">`;
                    if (change !== 0) {
                        const changeColor = change > 0 ? '#ff6b9d' : (change < 0 ? '#ff85a6' : '#ffabc0');
                        const changeBg = change > 0 ? 'rgba(255,218,228,0.4)' : 'rgba(255,228,235,0.4)';
                        changeReasonHtml += `<div style="display:inline-block;background:${changeBg};padding:6px 14px;border-radius:20px;color:${changeColor};font-weight:700;margin-bottom:10px;font-size:13px;">变化 ${changeDisplay}</div>`;
                    }
                    if (reason) {
                        changeReasonHtml += `<div style="color:#b08ba6;line-height:1.7;font-size:13px;">${escapeHtml(String(reason))}</div>`;
                    }
                    changeReasonHtml += `</div>`;
                }
                
                content += `
                    <div style="margin-bottom:18px;padding:24px 22px;background:linear-gradient(135deg,#ffffff 0%,#fffafc 50%,#fff8fb 100%);border-radius:22px;border:1px solid rgba(255,218,228,0.5);box-shadow:0 8px 28px rgba(255,182,193,0.18);position:relative;overflow:hidden;">
                        <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:radial-gradient(circle,rgba(255,218,228,0.15),transparent 70%);"></div>
                        <div style="position:relative;font-size:15px;font-weight:700;color:#ff85a6;margin-bottom:6px;letter-spacing:0.5px;">${item.label}</div>
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
            const hasOtherLabels = /穿搭|心情|动作|心声|坏心思|好感度/.test(String(value));
            
            content += `
                <div style="margin-bottom:14px;padding:20px;background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,250,252,0.95));border-radius:20px;border:1px solid rgba(255,218,228,0.4);box-shadow:0 6px 20px rgba(255,182,193,0.12);transition:all 0.4s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;" onmouseover="this.style.boxShadow='0 8px 32px rgba(255,182,193,0.2)';this.style.transform='translateY(-3px)';this.style.borderColor='rgba(255,192,203,0.5)'" onmouseout="this.style.boxShadow='0 6px 20px rgba(255,182,193,0.12)';this.style.transform='translateY(0)';this.style.borderColor='rgba(255,218,228,0.4)'">
                    <div style="position:absolute;top:0;left:0;right:0;height:60%;background:linear-gradient(180deg,rgba(255,240,245,0.3),transparent);pointer-events:none;"></div>
                    <div style="position:relative;font-size:13px;color:#ff85a6;font-weight:700;margin-bottom:12px;letter-spacing:0.3px;">${item.label}</div>
                    <div style="position:relative;font-size:14px;color:${hasOtherLabels ? '#ff6b9d' : '#9b7a9f'};word-break:break-all;line-height:1.9;font-weight:400;">${escapeHtml(String(displayValue))}</div>
                </div>
            `;
        });
        
        content += `
                </div>
                
                <div style="padding:20px;background:linear-gradient(135deg,rgba(255,250,252,0.98),rgba(255,245,250,0.98));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid rgba(255,218,228,0.3);display:flex;gap:14px;flex-shrink:0;">
                    <button onclick="MindStateManager.showCharacterMindHistory('${chat.id}');" style="flex:1;padding:14px;border:1.5px solid rgba(255,192,203,0.4);background:rgba(255,255,255,0.8);border-radius:18px;cursor:pointer;font-size:14px;color:#ff85a6;font-weight:700;transition:all 0.3s;box-shadow:0 4px 16px rgba(255,182,193,0.12);" onmouseover="this.style.background='rgba(255,250,252,0.95)';this.style.boxShadow='0 6px 24px rgba(255,182,193,0.22)';this.style.transform='translateY(-2px)';this.style.borderColor='rgba(255,192,203,0.6)'" onmouseout="this.style.background='rgba(255,255,255,0.8)';this.style.boxShadow='0 4px 16px rgba(255,182,193,0.12)';this.style.transform='translateY(0)';this.style.borderColor='rgba(255,192,203,0.4)'">历史心声</button>
                    <button onclick="document.getElementById('mind-state-modal').remove();" style="flex:1;padding:14px;border:none;background:linear-gradient(135deg,#ff85a6 0%,#ff6b9d 100%);color:#fff;border-radius:18px;cursor:pointer;font-size:14px;font-weight:700;transition:all 0.3s;box-shadow:0 6px 20px rgba(255,107,157,0.4);" onmouseover="this.style.boxShadow='0 8px 32px rgba(255,107,157,0.55)';this.style.transform='translateY(-2px) scale(1.02)'" onmouseout="this.style.boxShadow='0 6px 20px rgba(255,107,157,0.4)';this.style.transform='translateY(0) scale(1)'">关闭</button>
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
                    
                    affinityDisplay = `<div style="margin-bottom:14px;padding:12px 16px;background:linear-gradient(135deg,rgba(255,250,252,0.8),rgba(255,255,255,0.8));border-radius:14px;border:1px solid rgba(255,218,228,0.4);">
                        <span style="color:${affinityColor};font-size:13px;font-weight:700;">好感度：</span>
                        <span style="color:${affinityColor};font-size:16px;font-weight:800;">${state.affinity}/100</span>`;
                    
                    if (change !== 0 || reason) {
                        const changeColor = change > 0 ? '#ff6b9d' : (change < 0 ? '#ff85a6' : '#ffabc0');
                        if (change !== 0) {
                            affinityDisplay += `<span style="color:${changeColor};font-size:12px;margin-left:8px;font-weight:700;">(${changeDisplay})</span>`;
                        }
                        if (reason) {
                            affinityDisplay += `<div style="font-size:12px;color:#b08ba6;margin-top:8px;line-height:1.6;">原因：${escapeHtml(reason)}</div>`;
                        }
                    }
                    affinityDisplay += `</div>`;
                }
                
                historyContent += `
                    <div style="margin-bottom:16px;padding:20px;background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,250,252,0.95));border-radius:20px;border:1px solid rgba(255,218,228,0.4);position:relative;box-shadow:0 6px 20px rgba(255,182,193,0.12);transition:all 0.4s cubic-bezier(0.4,0,0.2,1);overflow:hidden;" onmouseover="this.style.boxShadow='0 8px 32px rgba(255,182,193,0.2)';this.style.transform='translateY(-3px)';this.style.borderColor='rgba(255,192,203,0.5)'" onmouseout="this.style.boxShadow='0 6px 20px rgba(255,182,193,0.12)';this.style.transform='translateY(0)';this.style.borderColor='rgba(255,218,228,0.4)'">
                        <div style="position:absolute;top:0;left:0;right:0;height:50%;background:linear-gradient(180deg,rgba(255,240,245,0.3),transparent);pointer-events:none;"></div>
                        <button onclick="MindStateManager.deleteSingleMindState('${chat.id}', ${i})" style="position:relative;float:right;padding:6px 14px;border:1px solid rgba(255,192,203,0.4);background:rgba(255,255,255,0.8);color:#ff85a6;border-radius:14px;cursor:pointer;font-size:11px;white-space:nowrap;font-weight:700;transition:all 0.3s;" onmouseover="this.style.background='rgba(255,250,252,0.95)';this.style.borderColor='rgba(255,192,203,0.6)'" onmouseout="this.style.background='rgba(255,255,255,0.8)';this.style.borderColor='rgba(255,192,203,0.4)'">删除</button>
                        <div style="position:relative;font-size:11px;color:#d4a5b8;margin-bottom:14px;font-weight:700;letter-spacing:0.3px;">记录 #${recordIndex}</div>
                        ${affinityDisplay}
                        ${Object.entries(state).filter(([key]) => !['affinity', 'affinityChange', 'affinityReason', 'timestamp', 'messageId', 'failed', 'reason', 'failedReason'].includes(key)).map(([key, value]) => {
                            const labels = {
                                'outfit': '穿搭',
                                'mood': '心情',
                                'action': '动作',
                                'thought': '心声',
                                'badThought': '坏心思'
                            };
                            if (!labels[key]) return '';
                            return `<div style="position:relative;margin-bottom:12px;line-height:1.8;"><span style="color:#ff85a6;font-size:12px;font-weight:700;">${labels[key]}：</span><span style="color:#9b7a9f;font-size:13px;">${escapeHtml(String(value))}</span></div>`;
                        }).join('')}
                    </div>
                `;
            }
        } else {
            historyContent = '<div style="text-align:center;color:#d4a5b8;padding:50px 20px;font-size:14px;line-height:1.8;">暂无历史心声记录<br>开始对话即可生成心声</div>';
        }
        
        let content = `
            <div class="emoji-mgmt-content" style="max-width:420px;background:linear-gradient(180deg,#fffbfd 0%,#fff5f9 100%);display:flex;flex-direction:column;max-height:85vh;border-radius:24px;overflow:hidden;box-shadow:0 24px 48px rgba(255,182,193,0.25);position:relative;">
                <div style="position:absolute;top:0;left:0;right:0;height:200px;background:radial-gradient(ellipse at top,rgba(255,228,235,0.4) 0%,transparent 70%);pointer-events:none;"></div>
                <div style="position:relative;padding:28px 24px 22px;background:linear-gradient(135deg,rgba(255,245,250,0.95) 0%,rgba(255,250,252,0.9) 100%);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,218,228,0.3);">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="margin:0;font-size:22px;font-weight:700;color:#ff85a6;letter-spacing:0.5px;text-shadow:0 2px 8px rgba(255,133,166,0.2);">${chat.name}的历史心声</h3>
                        <button onclick="document.getElementById('mind-history-modal').remove();" style="border:none;background:linear-gradient(135deg,rgba(255,182,193,0.15),rgba(255,192,203,0.15));width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;line-height:1;color:#ff85a6;transition:all 0.3s;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 8px rgba(255,182,193,0.2);" onmouseover="this.style.background='linear-gradient(135deg,rgba(255,182,193,0.25),rgba(255,192,203,0.25))';this.style.transform='rotate(90deg) scale(1.05)'" onmouseout="this.style.background='linear-gradient(135deg,rgba(255,182,193,0.15),rgba(255,192,203,0.15))';this.style.transform='rotate(0deg) scale(1)'">×</button>
                    </div>
                </div>
                
                <div style="padding:22px 20px 16px;flex:1;overflow-y:auto;overflow-x:hidden;position:relative;">
                    ${historyContent}
                </div>
                
                <div style="padding:20px;background:linear-gradient(135deg,rgba(255,250,252,0.98),rgba(255,245,250,0.98));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid rgba(255,218,228,0.3);display:flex;gap:14px;flex-shrink:0;">
                    ${(chat.mindStates && chat.mindStates.length > 0) ? `<button onclick="MindStateManager.openDeleteConfirmDialog('${chat.id}');" style="flex:1;padding:14px;border:1.5px solid rgba(255,192,203,0.4);background:rgba(255,255,255,0.8);border-radius:18px;cursor:pointer;font-size:14px;color:#ff85a6;font-weight:700;transition:all 0.3s;box-shadow:0 4px 16px rgba(255,182,193,0.12);" onmouseover="this.style.background='rgba(255,250,252,0.95)';this.style.boxShadow='0 6px 24px rgba(255,182,193,0.22)';this.style.transform='translateY(-2px)';this.style.borderColor='rgba(255,192,203,0.6)'" onmouseout="this.style.background='rgba(255,255,255,0.8)';this.style.boxShadow='0 4px 16px rgba(255,182,193,0.12)';this.style.transform='translateY(0)';this.style.borderColor='rgba(255,192,203,0.4)'">清空全部</button>` : ''}
                    <button onclick="document.getElementById('mind-history-modal').remove();" style="flex:1;padding:14px;border:none;background:linear-gradient(135deg,#ff85a6 0%,#ff6b9d 100%);color:#fff;border-radius:18px;cursor:pointer;font-size:14px;font-weight:700;transition:all 0.3s;box-shadow:0 6px 20px rgba(255,107,157,0.4);" onmouseover="this.style.boxShadow='0 8px 32px rgba(255,107,157,0.55)';this.style.transform='translateY(-2px) scale(1.02)'" onmouseout="this.style.boxShadow='0 6px 20px rgba(255,107,157,0.4)';this.style.transform='translateY(0) scale(1)'">关闭</button>
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
        confirmModal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,240,245,0.92);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);display:flex;justify-content:center;align-items:center;z-index:50001;';
        
        confirmModal.addEventListener('click', function(e) {
            if (e.target === confirmModal) {
                confirmModal.remove();
            }
        });
        
        const content = `
            <div style="background:linear-gradient(180deg,#ffffff 0%,#fffbfd 100%);border-radius:24px;padding:36px 30px;max-width:360px;text-align:center;box-shadow:0 24px 56px rgba(255,182,193,0.35);border:1px solid rgba(255,228,235,0.6);position:relative;overflow:hidden;">
                <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:radial-gradient(circle,rgba(255,218,228,0.2),transparent 70%);"></div>
                <div style="position:relative;font-size:20px;font-weight:700;color:#ff85a6;margin-bottom:18px;letter-spacing:0.5px;">确定要清空全部心声吗？</div>
                <div style="position:relative;font-size:14px;color:#b08ba6;margin-bottom:32px;line-height:1.8;">此操作无法撤销，${chat.name}的所有历史心声记录将被永久删除。</div>
                <div style="position:relative;display:flex;gap:14px;">
                    <button onclick="document.getElementById('delete-confirm-modal').remove();" style="flex:1;padding:14px;border:1.5px solid rgba(255,192,203,0.4);background:rgba(255,255,255,0.8);border-radius:18px;cursor:pointer;font-size:14px;color:#ff85a6;font-weight:700;transition:all 0.3s;box-shadow:0 4px 16px rgba(255,182,193,0.12);" onmouseover="this.style.background='rgba(255,250,252,0.95)';this.style.boxShadow='0 6px 24px rgba(255,182,193,0.22)';this.style.transform='translateY(-2px)';this.style.borderColor='rgba(255,192,203,0.6)'" onmouseout="this.style.background='rgba(255,255,255,0.8)';this.style.boxShadow='0 4px 16px rgba(255,182,193,0.12)';this.style.transform='translateY(0)';this.style.borderColor='rgba(255,192,203,0.4)'">取消</button>
                    <button onclick="MindStateManager.deleteCharacterMindStates('${charId}');document.getElementById('delete-confirm-modal').remove();" style="flex:1;padding:14px;border:none;background:linear-gradient(135deg,#ff85a6 0%,#ff6b9d 100%);border-radius:18px;cursor:pointer;font-size:14px;color:#fff;font-weight:700;transition:all 0.3s;box-shadow:0 6px 20px rgba(255,107,157,0.4);" onmouseover="this.style.boxShadow='0 8px 32px rgba(255,107,157,0.55)';this.style.transform='translateY(-2px) scale(1.02)'" onmouseout="this.style.boxShadow='0 6px 20px rgba(255,107,157,0.4)';this.style.transform='translateY(0) scale(1)'">确定删除</button>
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