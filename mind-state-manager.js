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
        
        // 使用固定颜色（发送按钮颜色）
        const fillColor = '#FFB6C1'; // 发送按钮渐变的起始颜色
        const textColor = '#fff';
        
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
            // 情感羁绊
            { key: 'jealousy', labels: ['醋意值', 'Jealousy'] },
            { key: 'jealousyTrigger', labels: ['醋意值触发', 'Jealousy Trigger'] },
            // 欲望
            { key: 'excitement', labels: ['兴奋度', 'Excitement'] },
            { key: 'excitementDesc', labels: ['兴奋度描述', 'Excitement Desc'] },
            { key: 'bodyTrait', labels: ['身体反应', '体征', 'Physical Trait'] },
            // 随身物品
            { key: 'items', labels: ['随身物品', 'Items'] },
            // 购物车
            { key: 'shoppingCart', labels: ['购物车', 'Shopping Cart'] },
            // 随身听
            { key: 'musicPlayer', labels: ['随身听', 'Music Player'] },
            // 心声内容
            { key: 'content', labels: ['心声', 'Inner Voice', 'Mind Voice'] },
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
                    // 模式1：标签：内容（多行优先，匹配到下一个字段标签或分组标题）- 用于多行字段
                    new RegExp(`${label}[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(?:位置|穿搭|醋意值触发|醋意值|兴奋度描述|兴奋度|身体反应|随身物品|购物车|随身听|心声|潜台词|真意|好感度变化|好感度原因|好感度)[：:]|\\n\\s*\\[|$)`, 'i'),
                    // 模式2：标签：内容（单行，匹配到换行符）- 用于简单字段
                    new RegExp(`${label}[：:]+\\s*([^\\n]+)`, 'i')
                ];
                
                for (const pattern of patterns) {
                    const match = mindContent.match(pattern);
                    if (match && match[1]) {
                        value = match[1].trim();
                        // 移除多余的标点和标记
                        value = value.replace(/^[：:]+/, '').trim();
                        // 移除开头的换行符
                        value = value.replace(/^\n+/, '').trim();
                        
                        // 特殊处理：保留多行内容的换行符
                        // 对于身体反应、随身物品、购物车等字段，保留换行结构
                        if (['bodyTrait', 'items', 'shoppingCart'].includes(fieldDef.key)) {
                            // 清理多余的空行，但保留单个换行
                            value = value.replace(/\n{3,}/g, '\n\n').trim();
                            // 移除可能混入的其他字段标签或分组标题
                            value = value.split(/\n(?=位置|穿搭|醋意值|兴奋度|身体反应|随身物品|购物车|随身听|心声|潜台词|好感度|\[)/)[0].trim();
                            
                            // 清理每行前后的空白，但保留换行结构
                            value = value.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
                        }
                        
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
位置：当前所在位置和姿态
穿搭：上装下装描述，包含材质状态和关键饰品

[情感与欲望]
醋意值: ▮▮▮▮▮▮▮▮▯▯ (xx%)
醋意值触发：触发醋意的具体原因

兴奋度: ▮▮▮▮▯▯▯▯▯▯ (xx%)
兴奋度描述：身体的直接反馈描述

身体反应：必须写2-3个器官的拟人化骚话吐槽，每个器官单独一行。
【强制要求】男性角色必须包含【阴茎】，女性角色必须包含【小穴】或【阴道】。
格式示例：
阴茎：喂喂喂，刚冲完冷水澡冷静下来，她随便一条消息就让你抬头？主人你有点骨气行不行！
喉结：主人，别这么紧张行不行，搞得我也开始跟着上下滚动了，好像发出点黏糊糊的声音啊。
嘴唇：“宝宝”两个字而已，主人你这么激动干嘛，害得我蹦的那么快，不知道的还以为我跑了三千米呢。

随身物品：必须生成1-3个随身携带的物品（不要一直出现手机），每个物品单独一行。
格式示例：
最新款iPhone 17 pro 手机(屏保是她的照片，上次趁她睡着了偷偷拍下来的，像一只小花猫，可爱死了)
有些泛旧的心型银质钥匙扣(上次她特意送的生日礼物，一直放在身上，舍不得摘下来)

购物车：必须生成1-3条购物车里的商品（已下单、已删除、已退款等），每条商品单独一行，承接上文逻辑。
格式示例：
上次她提到的某某品牌的情侣款真丝睡衣(她肤质嫩，还对纯棉过敏，买真丝最适合她了，下次就让她穿给自己看)
某某品牌的茉莉味按摩精油(她上次说过喜欢这个味道的，正好存货快用完了，下次亲手给她按摩用)
某某品牌黑色蕾丝款丝袜(这个品牌的丝袜质量差，一撕就破，买几双备用着，让外卖员明天就送货上门)

随身听：推荐1首符合情境的中文歌曲。格式"歌曲名 - 歌手 / 歌词片段"。

心声：角色不为人知的内心独白，包含停顿、喘息或语气词
潜台词：揭露内心最卑微或狂乱的祈求，建议用第二人称"你"

好感度：[0-100整数] 好感度变化：[±3] 好感度原因：[20字以内]

**格式检查清单（必须全部满足）：**
✓ 身体反应：2-3个器官，每个单独一行，必含性器官
✓ 随身物品：1-3个物品，每个单独一行
✓ 购物车：1-3个商品，每个单独一行
✓ 所有15个字段都必须填写，不得遗漏

**必须包含全部15个字段：位置、穿搭、醋意值、醋意值触发、兴奋度、兴奋度描述、身体反应、随身物品、购物车、随身听、心声、潜台词、好感度、好感度变化、好感度原因**
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
            { key: 'jealousy', label: '醋意值' },
            { key: 'jealousyTrigger', label: '醋意值触发' },
            { key: 'excitement', label: '兴奋度' },
            { key: 'excitementDesc', label: '兴奋度描述' },
            { key: 'bodyTrait', label: '身体反应' },
            { key: 'items', label: '随身物品' },
            { key: 'shoppingCart', label: '购物车' },
            { key: 'musicPlayer', label: '随身听' },
            { key: 'content', label: '心声' },
            { key: 'hiddenMeaning', label: '潜台词' }
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
        
        // 按分组显示心声数据
        const groupedItems = {
            '基本信息': [
                { key: 'location', label: '位置', icon: '📍' },
                { key: 'outfit', label: '穿搭', icon: '👗' }
            ],
            '情感与欲望': [
                { key: 'jealousy', label: '醋意值', icon: '💚', hasProgress: true },
                { key: 'jealousyTrigger', label: '触发因素', icon: '⚡' },
                { key: 'excitement', label: '兴奋度', icon: '🔥', hasProgress: true },
                { key: 'excitementDesc', label: '状态描述', icon: '💭' },
                { key: 'bodyTrait', label: '身体反应', icon: '💓' }
            ],
            '随身物品': [
                { key: 'items', label: '随身物品', icon: '🎒' }
            ],
            '购物车': [
                { key: 'shoppingCart', label: '购物车', icon: '🛒' }
            ],
            '随身听': [
                { key: 'musicPlayer', label: '随身听', icon: '🎧' }
            ],
            '内心独白': [
                { key: 'content', label: '心声', icon: '💬' },
                { key: 'hiddenMeaning', label: '潜台词', icon: '🎭' }
            ]
        };
        
        // 遍历分组显示
        for (const [groupName, items] of Object.entries(groupedItems)) {
            let hasContent = false;
            let groupContent = '';
            
            for (const item of items) {
                let value = currentState[item.key] !== undefined ? currentState[item.key] : null;
                
                // 跳过空字段
                if (value === null || value === undefined || value === '') {
                    continue;
                }
                
                hasContent = true;
                
                // 特殊处理进度条字段
                if (item.hasProgress && typeof value === 'number') {
                    const progressColor = value >= 70 ? '#ff6b9d' : (value >= 40 ? '#ff85a6' : '#ffabc0');
                    groupContent += `
                        <div style="margin-bottom:clamp(10px,2.5vw,12px);padding:clamp(12px,2.5vw,14px);background:rgba(255,255,255,0.6);border-radius:12px;border:1px solid rgba(255,218,228,0.3);">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <span style="font-size:clamp(12px,2.8vw,13px);color:#ff85a6;font-weight:600;">${item.icon} ${item.label}</span>
                                <span style="font-size:clamp(12px,2.8vw,13px);color:${progressColor};font-weight:700;">${value}%</span>
                            </div>
                            <div style="width:100%;height:4px;background:rgba(255,218,228,0.3);border-radius:20px;overflow:hidden;">
                                <div style="width:${value}%;height:100%;background:linear-gradient(90deg,#ffabc0,${progressColor});transition:width 0.6s ease;"></div>
                            </div>
                        </div>
                    `;
                } else {
                    // 普通文本字段 - 特殊处理多行内容
                    let displayValue = String(value);
                    
                    // 对于身体反应、随身物品、购物车，保留换行并转换为HTML
                    if (['bodyTrait', 'items', 'shoppingCart'].includes(item.key)) {
                        // 先转义HTML，然后将换行符转换为<br>
                        displayValue = escapeHtml(displayValue).replace(/\n/g, '<br>');
                        
                        groupContent += `
                            <div style="margin-bottom:clamp(10px,2.5vw,12px);padding:clamp(12px,2.5vw,14px);background:rgba(255,255,255,0.6);border-radius:12px;border:1px solid rgba(255,218,228,0.3);">
                                <div style="font-size:clamp(11px,2.5vw,12px);color:#d4a5b8;font-weight:600;margin-bottom:6px;">${item.icon} ${item.label}</div>
                                <div style="font-size:clamp(12px,2.8vw,13px);color:#9b7a9f;line-height:1.8;word-break:break-word;">${displayValue}</div>
                            </div>
                        `;
                    } else {
                        // 其他字段正常转义
                        displayValue = escapeHtml(displayValue);
                        
                        groupContent += `
                            <div style="margin-bottom:clamp(10px,2.5vw,12px);padding:clamp(12px,2.5vw,14px);background:rgba(255,255,255,0.6);border-radius:12px;border:1px solid rgba(255,218,228,0.3);">
                                <div style="font-size:clamp(11px,2.5vw,12px);color:#d4a5b8;font-weight:600;margin-bottom:6px;">${item.icon} ${item.label}</div>
                                <div style="font-size:clamp(12px,2.8vw,13px);color:#9b7a9f;line-height:1.8;word-break:break-word;white-space:pre-wrap;">${displayValue}</div>
                            </div>
                        `;
                    }
                }
            }
            
            // 如果分组有内容，则显示分组
            if (hasContent) {
                content += `
                    <div style="margin-bottom:clamp(14px,3vw,18px);">
                        <div style="font-size:clamp(13px,3vw,14px);font-weight:700;color:#ff85a6;margin-bottom:clamp(10px,2.5vw,12px);padding-bottom:8px;border-bottom:2px solid rgba(255,133,166,0.3);">${groupName}</div>
                        ${groupContent}
                    </div>
                `;
            }
        }
        
        // 好感度单独处理，放在最后
        if (typeof currentState.affinity === 'number') {
            const affinityColor = currentState.affinity >= 70 ? '#ff6b9d' : (currentState.affinity >= 40 ? '#ff85a6' : '#ffabc0');
            const change = currentState.affinityChange || 0;
            const changeDisplay = change > 0 ? `+${change}` : change;
            const reason = currentState.affinityReason || '';
            
            content += `
                <div style="margin-top:clamp(16px,4vw,20px);padding:clamp(16px,3.5vw,20px);background:linear-gradient(135deg,#ffffff 0%,#fffafc 50%,#fff8fb 100%);border-radius:16px;border:2px solid rgba(255,133,166,0.3);box-shadow:0 8px 28px rgba(255,182,193,0.18);position:relative;overflow:hidden;">
                    <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:radial-gradient(circle,rgba(255,218,228,0.15),transparent 70%);"></div>
                    <div style="position:relative;font-size:clamp(14px,3.5vw,15px);font-weight:700;color:#ff85a6;margin-bottom:12px;letter-spacing:0.5px;">💖 好感度</div>
                    <div style="width:100%;height:8px;background:linear-gradient(90deg,rgba(255,218,228,0.4),rgba(255,228,235,0.4));border-radius:20px;overflow:hidden;position:relative;box-shadow:inset 0 1px 3px rgba(255,182,193,0.1);">
                        <div style="width:${currentState.affinity}%;height:100%;background:linear-gradient(90deg,#ffd5e0 0%,#ffabc0 50%,#ff85a6 100%);transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1);border-radius:20px;box-shadow:0 0 12px rgba(255,133,166,0.5);"></div>
                    </div>
                    <div style="font-size:clamp(24px,6vw,28px);font-weight:800;color:${affinityColor};margin-top:clamp(12px,3vw,16px);text-align:center;letter-spacing:1px;text-shadow:0 2px 12px rgba(255,133,166,0.25);">${currentState.affinity}<span style="font-size:clamp(14px,3.5vw,16px);color:#ffabc0;margin-left:4px;">/100</span></div>
                    ${change !== 0 || reason ? `
                        <div style="margin-top:clamp(12px,3vw,16px);padding-top:clamp(12px,3vw,16px);border-top:1px solid rgba(255,218,228,0.4);">
                            ${change !== 0 ? `<div style="display:inline-block;background:${change > 0 ? 'rgba(255,218,228,0.4)' : 'rgba(255,228,235,0.4)'};padding:6px clamp(10px,2.5vw,14px);border-radius:20px;color:${change > 0 ? '#ff6b9d' : '#ff85a6'};font-weight:700;margin-bottom:8px;font-size:clamp(12px,2.8vw,13px);">变化 ${changeDisplay}</div>` : ''}
                            ${reason ? `<div style="color:#b08ba6;line-height:1.7;font-size:clamp(12px,3vw,13px);">${escapeHtml(String(reason))}</div>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
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
            const hasOtherLabels = /位置|穿搭|醋意值|醋意值触发|兴奋度|兴奋度描述|身体反应|随身物品|购物车|随身听|心声|潜台词|真意|好感度|好感度变化|好感度原因/.test(String(value));
            
            // 对于多行字段，需要特殊处理显示
            let finalDisplayValue;
            if (['bodyTrait', 'items', 'shoppingCart'].includes(item.key)) {
                // 转义HTML后转换换行符为<br>
                finalDisplayValue = escapeHtml(String(displayValue)).replace(/\n/g, '<br>');
            } else {
                finalDisplayValue = escapeHtml(String(displayValue));
            }
            
            content += `
                <div style="margin-bottom:clamp(12px,2.5vw,14px);padding:clamp(16px,3.5vw,20px);background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,250,252,0.95));border-radius:16px;border:1px solid rgba(255,218,228,0.4);box-shadow:0 6px 20px rgba(255,182,193,0.12);transition:all 0.4s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;" onmouseover="this.style.boxShadow='0 8px 32px rgba(255,182,193,0.2)';this.style.transform='translateY(-3px)';this.style.borderColor='rgba(255,192,203,0.5)'" onmouseout="this.style.boxShadow='0 6px 20px rgba(255,182,193,0.12)';this.style.transform='translateY(0)';this.style.borderColor='rgba(255,218,228,0.4)'">
                    <div style="position:absolute;top:0;left:0;right:0;height:60%;background:linear-gradient(180deg,rgba(255,240,245,0.3),transparent);pointer-events:none;"></div>
                    <div style="position:relative;font-size:clamp(12px,3vw,13px);color:#ff85a6;font-weight:700;margin-bottom:10px;letter-spacing:0.3px;">${item.label}</div>
                    <div style="position:relative;font-size:clamp(13px,3.2vw,14px);color:${hasOtherLabels ? '#ff6b9d' : '#9b7a9f'};word-break:break-word;line-height:1.9;font-weight:400;">${finalDisplayValue}</div>
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
                        <button onclick="MindStateManager.openSingleDeleteConfirmDialog('${chat.id}', ${i})" style="position:relative;float:right;padding:clamp(5px,1.2vw,6px) clamp(10px,2.5vw,14px);border:1px solid rgba(255,192,203,0.4);background:rgba(255,255,255,0.8);color:#ff85a6;border-radius:12px;cursor:pointer;font-size:clamp(10px,2.2vw,11px);white-space:nowrap;font-weight:700;transition:all 0.3s;" onmouseover="this.style.background='rgba(255,250,252,0.95)';this.style.borderColor='rgba(255,192,203,0.6)'" onmouseout="this.style.background='rgba(255,255,255,0.8)';this.style.borderColor='rgba(255,192,203,0.4)'">删除</button>
                        <div style="position:relative;font-size:clamp(10px,2.2vw,11px);color:#d4a5b8;margin-bottom:clamp(10px,2.5vw,14px);font-weight:700;letter-spacing:0.3px;">记录 #${recordIndex}</div>
                        ${affinityDisplay}
                        ${Object.entries(state).filter(([key]) => !['affinity', 'affinityChange', 'affinityReason', 'timestamp', 'messageId', 'failed', 'reason', 'failedReason'].includes(key)).map(([key, value]) => {
                            const labels = {
                                'location': '位置',
                                'outfit': '穿搭',
                                'jealousy': '醋意值',
                                'jealousyTrigger': '醋意值触发',
                                'excitement': '兴奋度',
                                'excitementDesc': '兴奋度描述',
                                'bodyTrait': '身体反应',
                                'items': '随身物品',
                                'shoppingCart': '购物车',
                                'musicPlayer': '随身听',
                                'content': '心声',
                                'hiddenMeaning': '潜台词'
                            };
                            if (!labels[key]) return '';
                            
                            // 对于多行字段，保留换行符
                            let displayValue = String(value);
                            if (['bodyTrait', 'items', 'shoppingCart'].includes(key)) {
                                displayValue = escapeHtml(displayValue).replace(/\n/g, '<br>');
                            } else {
                                displayValue = escapeHtml(displayValue);
                            }
                            
                            return `<div style="position:relative;margin-bottom:clamp(10px,2.5vw,12px);line-height:1.8;"><span style="color:#ff85a6;font-size:clamp(11px,2.5vw,12px);font-weight:700;">${labels[key]}：</span><span style="color:#9b7a9f;font-size:clamp(12px,3vw,13px);word-break:break-word;">${displayValue}</span></div>`;
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
     * 打开单条删除确认对话框
     * @param {string} charId - 角色ID
     * @param {number} index - 记录索引
     */
    function openSingleDeleteConfirmDialog(charId, index) {
        const chat = AppState.conversations.find(c => c.id === charId);
        if (!chat || !chat.mindStates || !chat.mindStates[index]) return;
        
        const mindState = chat.mindStates[index];
        let confirmModal = document.getElementById('single-delete-confirm-modal');
        if (confirmModal) confirmModal.remove();
        
        confirmModal = document.createElement('div');
        confirmModal.id = 'single-delete-confirm-modal';
        confirmModal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,240,245,0.92);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);display:flex;justify-content:center;align-items:center;z-index:9999999;';
        
        confirmModal.addEventListener('click', function(e) {
            if (e.target === confirmModal) {
                confirmModal.remove();
            }
        });
        
        // 获取心声内容预览
        let contentPreview = '';
        if (mindState.content) {
            contentPreview = mindState.content.length > 50 ? mindState.content.substring(0, 50) + '...' : mindState.content;
        } else {
            contentPreview = '记录 #' + (index + 1);
        }
        
        const modalContent = `
            <div style="background:linear-gradient(180deg,#ffffff 0%,#fffbfd 100%);border-radius:20px;padding:clamp(24px,6vw,36px) clamp(20px,5vw,30px);max-width:min(360px,90vw);width:100%;text-align:center;box-shadow:0 24px 56px rgba(255,182,193,0.35);border:1px solid rgba(255,228,235,0.6);position:relative;overflow:hidden;margin:0 auto;">
                <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:radial-gradient(circle,rgba(255,218,228,0.2),transparent 70%);"></div>
                <div style="position:relative;font-size:clamp(17px,4.5vw,20px);font-weight:700;color:#ff85a6;margin-bottom:clamp(8px,2vw,12px);letter-spacing:0.5px;">确定要删除这条心声记录吗?</div>
                <div style="position:relative;font-size:clamp(12px,2.8vw,13px);color:#b08ba6;margin-bottom:clamp(10px,2.5vw,14px);padding:clamp(12px,3vw,16px);background:rgba(255,240,245,0.5);border-radius:12px;line-height:1.6;max-height:100px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(contentPreview)}</div>
                <div style="position:relative;font-size:clamp(13px,3.2vw,14px);color:#b08ba6;margin-bottom:clamp(24px,6vw,32px);line-height:1.8;">此操作无法撤销,该条心声记录将被永久删除。</div>
                <div style="position:relative;display:flex;gap:clamp(10px,2.5vw,14px);">
                    <button onclick="document.getElementById('single-delete-confirm-modal').remove();" style="flex:1;padding:clamp(12px,3vw,14px);border:1.5px solid rgba(255,192,203,0.4);background:rgba(255,255,255,0.8);border-radius:16px;cursor:pointer;font-size:clamp(13px,3.2vw,14px);color:#ff85a6;font-weight:700;transition:all 0.3s;box-shadow:0 4px 16px rgba(255,182,193,0.12);white-space:nowrap;" onmouseover="this.style.background='rgba(255,250,252,0.95)';this.style.boxShadow='0 6px 24px rgba(255,182,193,0.22)';this.style.transform='translateY(-2px)';this.style.borderColor='rgba(255,192,203,0.6)'" onmouseout="this.style.background='rgba(255,255,255,0.8)';this.style.boxShadow='0 4px 16px rgba(255,182,193,0.12)';this.style.transform='translateY(0)';this.style.borderColor='rgba(255,192,203,0.4)'">取消</button>
                    <button onclick="MindStateManager.deleteSingleMindState('${charId}', ${index});document.getElementById('single-delete-confirm-modal').remove();" style="flex:1;padding:clamp(12px,3vw,14px);border:none;background:linear-gradient(135deg,#ff85a6 0%,#ff6b9d 100%);border-radius:16px;cursor:pointer;font-size:clamp(13px,3.2vw,14px);color:#fff;font-weight:700;transition:all 0.3s;box-shadow:0 6px 20px rgba(255,107,157,0.4);white-space:nowrap;" onmouseover="this.style.boxShadow='0 8px 32px rgba(255,107,157,0.55)';this.style.transform='translateY(-2px) scale(1.02)'" onmouseout="this.style.boxShadow='0 6px 20px rgba(255,107,157,0.4)';this.style.transform='translateY(0) scale(1)'">确定删除</button>
                </div>
            </div>
        `;
        
        confirmModal.innerHTML = modalContent;
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
        
        chat.mindStates = [];
        saveToStorage();
        showToast('所有心声已清空');
        
        // 立即刷新显示空状态
        showCharacterMindHistory(charId);
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
                
                // 计算变化值，限制在±3范围内
                let change = mindStateData.affinity - previousAffinity;
                
                // 如果AI返回的变化值超出±3范围，则限制它
                if (change > 3) {
                    console.warn(`⚠️ 好感度变化过大 (${change})，已限制为 +3`);
                    change = 3;
                    mindStateData.affinity = previousAffinity + 3;
                } else if (change < -3) {
                    console.warn(`⚠️ 好感度变化过大 (${change})，已限制为 -3`);
                    change = -3;
                    mindStateData.affinity = previousAffinity - 3;
                }
                
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
        openSingleDeleteConfirmDialog,
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