/**
 * 增强的心声显示函数
 * 按照分组结构优化显示格式
 */

function openCharacterMindStateEnhanced(chat) {
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
    
    const currentState = chat.mindStates[chat.mindStates.length - 1] || {};
    const isFailedState = currentState.failed;
    
    // 定义分组结构
    const mindGroups = [
        {
            title: '基本信息',
            icon: '📍',
            color: '#ff85a6',
            items: [
                { key: 'location', label: '位置' },
                { key: 'outfit', label: '穿搭' }
            ]
        },
        {
            title: '情感与欲望',
            icon: '💕',
            color: '#ff6b9d',
            items: [
                { key: 'jealousy', label: '醋意值', subKey: 'jealousyTrigger', subLabel: '触发因素', hasProgress: true },
                { key: 'excitement', label: '兴奋度', subKey: 'excitementDesc', subLabel: '状态描述', hasProgress: true },
                { key: 'bodyTrait', label: '身体反应' }
            ]
        },
        {
            title: '随身物品',
            icon: '🎒',
            color: '#ffabc0',
            items: [
                { key: 'items', label: '随身物品' }
            ]
        },
        {
            title: '购物车',
            icon: '🛒',
            color: '#ff9bb3',
            items: [
                { key: 'shoppingCart', label: '购物车' }
            ]
        },
        {
            title: '内心独白',
            icon: '💭',
            color: '#ff85a6',
            items: [
                { key: 'content', label: '心声' },
                { key: 'hiddenMeaning', label: '潜台词' }
            ]
        }
    ];
    
    let content = `
        <div class="emoji-mgmt-content" style="max-width:min(480px,95vw);width:100%;background:linear-gradient(180deg,#fffbfd 0%,#fff5f9 100%);display:flex;flex-direction:column;max-height:90vh;border-radius:20px;overflow:hidden;box-shadow:0 24px 48px rgba(255,182,193,0.25);position:relative;margin:0 auto;">
            <div style="position:absolute;top:0;left:0;right:0;height:200px;background:radial-gradient(ellipse at top,rgba(255,228,235,0.4) 0%,transparent 70%);pointer-events:none;"></div>
            <div style="position:relative;padding:clamp(18px,5vw,28px) clamp(16px,4vw,24px) clamp(16px,4vw,22px);background:linear-gradient(135deg,rgba(255,245,250,0.95) 0%,rgba(255,250,252,0.9) 100%);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,228,235,0.3);">
                <h3 style="margin:0;font-size:clamp(18px,5vw,22px);font-weight:700;color:#ff85a6;letter-spacing:0.5px;text-shadow:0 2px 8px rgba(255,133,166,0.2);text-align:center;">${chat.name}的心声</h3>
            </div>
            ${isFailedState ? `<div style="margin:clamp(12px,3vw,18px) clamp(12px,3vw,20px) 0;padding:clamp(12px,3vw,16px) clamp(14px,3vw,18px);background:linear-gradient(135deg,rgba(255,235,240,0.9),rgba(255,245,248,0.9));border-radius:14px;border:1px solid rgba(255,192,203,0.3);box-shadow:0 4px 12px rgba(255,182,193,0.1);"><div style="color:#ff6b9d;font-size:clamp(12px,3vw,13px);line-height:1.7;font-weight:500;">心声提取失败：请确保API已配置正确，且AI在回复末尾添加了完整的【心声】标记。</div></div>` : ''}
            
            <div style="padding:clamp(16px,4vw,22px) clamp(12px,3vw,20px) clamp(12px,3vw,16px);flex:1;overflow-y:auto;overflow-x:hidden;position:relative;-webkit-overflow-scrolling:touch;">
    `;
    
    // 首先显示好感度（特殊处理）
    if (typeof currentState.affinity === 'number') {
        const affinity = currentState.affinity;
        const affinityColor = affinity >= 70 ? '#ff6b9d' : (affinity >= 40 ? '#ff85a6' : '#ffabc0');
        const change = currentState.affinityChange || 0;
        const changeDisplay = change > 0 ? `+${change}` : change;
        const reason = currentState.affinityReason || '';
        
        content += `
            <div style="margin-bottom:clamp(18px,4vw,24px);padding:clamp(20px,5vw,28px) clamp(18px,4vw,24px);background:linear-gradient(135deg,#ffffff 0%,#fffafc 50%,#fff8fb 100%);border-radius:20px;border:1px solid rgba(255,218,228,0.5);box-shadow:0 10px 32px rgba(255,182,193,0.2);position:relative;overflow:hidden;">
                <div style="position:absolute;top:-30px;right:-30px;width:140px;height:140px;background:radial-gradient(circle,rgba(255,218,228,0.2),transparent 70%);"></div>
                <div style="position:relative;font-size:clamp(15px,4vw,17px);font-weight:700;color:#ff85a6;margin-bottom:12px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;">
                    <span>💖</span>
                    <span>好感度</span>
                </div>
                <div style="width:100%;height:8px;background:linear-gradient(90deg,rgba(255,218,228,0.4),rgba(255,228,235,0.4));border-radius:20px;margin-top:12px;overflow:hidden;position:relative;box-shadow:inset 0 1px 3px rgba(255,182,193,0.15);">
                    <div style="width:${affinity}%;height:100%;background:linear-gradient(90deg,#ffd5e0 0%,#ffabc0 50%,#ff85a6 100%);transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1);border-radius:20px;box-shadow:0 0 12px rgba(255,133,166,0.5);"></div>
                </div>
                <div style="font-size:clamp(24px,7vw,30px);font-weight:800;color:${affinityColor};margin-top:14px;text-align:center;letter-spacing:1px;text-shadow:0 2px 12px rgba(255,133,166,0.3);">${affinity}<span style="font-size:clamp(16px,4vw,18px);color:#ffabc0;margin-left:4px;">/100</span></div>
                ${(change !== 0 || reason) ? `
                    <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,218,228,0.4);display:flex;flex-direction:column;gap:8px;">
                        ${change !== 0 ? `<div style="display:inline-block;align-self:center;background:${change > 0 ? 'rgba(255,218,228,0.4)' : 'rgba(255,228,235,0.4)'};padding:6px 14px;border-radius:20px;color:${change > 0 ? '#ff6b9d' : '#ff85a6'};font-weight:700;font-size:clamp(12px,3vw,13px);">变化 ${changeDisplay}</div>` : ''}
                        ${reason ? `<div style="color:#b08ba6;line-height:1.7;font-size:clamp(12px,3vw,13px);text-align:center;">${escapeHtml(reason)}</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // 按分组显示其他字段
    mindGroups.forEach(group => {
        // 检查该组是否有数据
        const hasData = group.items.some(item => {
            const value = currentState[item.key];
            const subValue = item.subKey ? currentState[item.subKey] : null;
            return (value !== null && value !== undefined && value !== '') || 
                   (subValue !== null && subValue !== undefined && subValue !== '');
        });
        
        if (!hasData) return; // 跳过没有数据的组
        
        content += `
            <div style="margin-bottom:clamp(16px,4vw,20px);">
                <div style="font-size:clamp(14px,3.5vw,16px);font-weight:700;color:${group.color};margin-bottom:12px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;">
                    <span>${group.icon}</span>
                    <span>${group.title}</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:clamp(10px,2.5vw,12px);">
        `;
        
        group.items.forEach(item => {
            const value = currentState[item.key];
            const subValue = item.subKey ? currentState[item.subKey] : null;
            
            // 跳过空值
            if ((value === null || value === undefined || value === '') &&
                (subValue === null || subValue === undefined || subValue === '')) {
                return;
            }
            
            // 如果是带进度条的字段（百分比指标）
            if (item.hasProgress && value !== null && value !== undefined && value !== '') {
                // 提取百分比数值
                const percentMatch = String(value).match(/(\d+)%/);
                const percent = percentMatch ? parseInt(percentMatch[1]) : 50;
                
                content += `
                    <div style="padding:clamp(14px,3.5vw,18px) clamp(16px,4vw,20px);background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,250,252,0.95));border-radius:14px;border:1px solid rgba(255,218,228,0.35);box-shadow:0 4px 16px rgba(255,182,193,0.1);transition:all 0.3s;">
                        <div style="font-size:clamp(11px,2.8vw,12px);color:${group.color};font-weight:700;margin-bottom:8px;letter-spacing:0.3px;">${item.label}</div>
                        
                        <!-- 进度条和百分比 -->
                        <div style="margin-bottom:${subValue ? '12px' : '0'};">
                            <div style="width:100%;height:6px;background:linear-gradient(90deg,rgba(255,218,228,0.3),rgba(255,228,235,0.3));border-radius:20px;overflow:hidden;position:relative;box-shadow:inset 0 1px 2px rgba(255,182,193,0.1);">
                                <div style="width:${percent}%;height:100%;background:linear-gradient(90deg,${group.color},${group.color}dd);transition:width 0.6s cubic-bezier(0.34,1.56,0.64,1);border-radius:20px;box-shadow:0 0 8px ${group.color}66;"></div>
                            </div>
                            <div style="font-size:clamp(13px,3.2vw,14px);font-weight:700;color:${group.color};margin-top:6px;text-align:right;">${percent}%</div>
                        </div>
                        
                        <!-- 文字描述（不显示子标题）-->
                        ${subValue !== null && subValue !== undefined && subValue !== '' ? `
                            <div style="font-size:clamp(12px,3vw,13px);color:#b08ba6;line-height:1.7;word-break:break-word;">${escapeHtml(String(subValue))}</div>
                        ` : ''}
                    </div>
                `;
            } else if (item.key === 'bodyTrait' || item.key === 'bodyInstinct' || item.key === 'coreItem' || item.key === 'consumable' || item.key === 'hiddenItem' || item.key === 'items' || item.key === 'shoppingCart') {
                // 身体反应、随身物品、购物车字段：列表显示
                if (value !== null && value !== undefined && value !== '') {
                    let displayContent = '';
                    
                    // 处理身体反应：按换行符分条显示（无小标题）
                    if (item.key === 'bodyTrait') {
                        const items = String(value).split('\n').map(s => s.trim()).filter(s => s);
                        displayContent = items.map(item => `<div style="margin-bottom:8px;padding:8px 12px;background:rgba(255,228,235,0.3);border-radius:8px;border-left:3px solid ${group.color};font-size:clamp(12px,3vw,13px);color:#9b7a9f;line-height:1.6;">${escapeHtml(item)}</div>`).join('');
                    }
                    // 处理随身物品：按换行符分条显示（无小标题）
                    else if (item.key === 'items') {
                        const items = String(value).split('\n').map(s => s.trim()).filter(s => s);
                        displayContent = items.map(item => `<div style="margin-bottom:8px;padding:8px 12px;background:rgba(255,228,235,0.3);border-radius:8px;border-left:3px solid ${group.color};font-size:clamp(12px,3vw,13px);color:#9b7a9f;line-height:1.6;">${escapeHtml(item)}</div>`).join('');
                    }
                    // 处理购物车：按换行符分条显示，带删除线效果（无小标题）
                    else if (item.key === 'shoppingCart') {
                        const items = String(value).split('\n').map(s => s.trim()).filter(s => s);
                        displayContent = items.map(item => {
                            const isDeleted = item.includes('删除') || item.includes('已删除') || item.includes('移除');
                            return `<div style="margin-bottom:10px;padding:10px 12px;background:linear-gradient(135deg,rgba(255,228,235,0.4),rgba(255,240,245,0.3));border-radius:8px;border-left:3px solid ${group.color};font-size:clamp(12px,3vw,13px);color:#9b7a9f;line-height:1.6;${isDeleted ? 'text-decoration:line-through;opacity:0.6;' : ''}">${escapeHtml(item)}</div>`;
                        }).join('');
                    }
                    // 其他列表字段：显示小标题 + 列表内容
                    else {
                        displayContent = `
                            <div style="font-size:clamp(11px,2.8vw,12px);color:${group.color};font-weight:700;margin-bottom:8px;letter-spacing:0.3px;">${item.label}</div>
                            <div style="font-size:clamp(12px,3vw,13px);color:#9b7a9f;line-height:1.6;white-space:pre-wrap;">${escapeHtml(String(value))}</div>
                        `;
                    }
                    
                    content += `
                        <div style="padding:clamp(10px,2.5vw,12px) clamp(14px,3.5vw,18px);background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,250,252,0.95));border-radius:12px;border:1px solid rgba(255,218,228,0.3);box-shadow:0 3px 12px rgba(255,182,193,0.08);">
                            ${displayContent}
                        </div>
                    `;
                }
            } else {
                // 普通字段显示（显示小标题）
                if (value !== null && value !== undefined && value !== '') {
                    content += `
                        <div style="padding:clamp(14px,3.5vw,18px) clamp(16px,4vw,20px);background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,250,252,0.95));border-radius:14px;border:1px solid rgba(255,218,228,0.35);box-shadow:0 4px 16px rgba(255,182,193,0.1);transition:all 0.3s;">
                            <div style="font-size:clamp(11px,2.8vw,12px);color:${group.color};font-weight:700;margin-bottom:8px;letter-spacing:0.3px;">${item.label}</div>
                            <div style="font-size:clamp(13px,3.2vw,14px);color:#9b7a9f;line-height:1.8;word-break:break-word;white-space:pre-wrap;">${escapeHtml(String(value))}</div>
                        </div>
                    `;
                }
                if (subValue !== null && subValue !== undefined && subValue !== '') {
                    content += `
                        <div style="padding:clamp(14px,3.5vw,18px) clamp(16px,4vw,20px);background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,250,252,0.95));border-radius:14px;border:1px solid rgba(255,218,228,0.35);box-shadow:0 4px 16px rgba(255,182,193,0.1);transition:all 0.3s;">
                            <div style="font-size:clamp(11px,2.8vw,12px);color:${group.color};font-weight:700;margin-bottom:8px;letter-spacing:0.3px;">${item.subLabel || item.label}</div>
                            <div style="font-size:clamp(12px,3vw,13px);color:#b08ba6;line-height:1.7;word-break:break-word;white-space:pre-wrap;">${escapeHtml(String(subValue))}</div>
                        </div>
                    `;
                }
            }
        });
        
        content += `
                </div>
            </div>
        `;
    });
    
    content += `
            </div>
            
            <div style="padding:clamp(14px,3.5vw,20px) clamp(12px,3vw,20px);background:linear-gradient(135deg,rgba(255,250,252,0.98),rgba(255,245,250,0.98));backdrop-filter:blur(10px);border-top:1px solid rgba(255,218,228,0.3);display:flex;gap:clamp(10px,2.5vw,14px);flex-shrink:0;">
                <button onclick="MindStateManager.showCharacterMindHistory('${chat.id}');" style="flex:1;padding:clamp(12px,3vw,14px);border:1.5px solid rgba(255,192,203,0.4);background:rgba(255,255,255,0.8);border-radius:16px;cursor:pointer;font-size:clamp(13px,3.2vw,14px);color:#ff85a6;font-weight:700;transition:all 0.3s;box-shadow:0 4px 16px rgba(255,182,193,0.12);white-space:nowrap;">历史心声</button>
                <button onclick="document.getElementById('mind-state-modal').remove();" style="flex:1;padding:clamp(12px,3vw,14px);border:none;background:linear-gradient(135deg,#ff85a6 0%,#ff6b9d 100%);color:#fff;border-radius:16px;cursor:pointer;font-size:clamp(13px,3.2vw,14px);font-weight:700;transition:all 0.3s;box-shadow:0 6px 20px rgba(255,107,157,0.4);white-space:nowrap;">关闭</button>
            </div>
        </div>
    `;
    
    modal.innerHTML = content;
    document.body.appendChild(modal);
}

// 替换原有函数
if (typeof MindStateManager !== 'undefined') {
    MindStateManager.openCharacterMindState = openCharacterMindStateEnhanced;
}