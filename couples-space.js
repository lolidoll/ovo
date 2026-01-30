/**
 * 情侣空间 - 完整重构版
 * 支持多情侣、AI智能互动、自定义风格
 */
(function() {
    'use strict';
    
    // ========== 状态管理 ==========
    const State = {
        partners: [],
        currentPartnerId: null,
        letterStyles: [
            { id: 'romantic', name: '浪漫温柔', desc: '经典浪漫风格' },
            { id: 'cute', name: '甜蜜可爱', desc: '俏皮活泼' },
            { id: 'deep', name: '深情款款', desc: '真挚感人' },
            { id: 'poetic', name: '诗意文艺', desc: '优美动人' },
            { id: 'funny', name: '幽默搞笑', desc: '轻松诙谐' }
        ],
        paperTheme: '',
        paperColors: { bg: '#FFF0F5', border: '#FFC0D4', text: '#333' }
    };
    
    // ========== 工具函数 ==========
    function load() {
        try {
            const data = JSON.parse(localStorage.getItem('couplesSpaceData') || '{}');
            if (data.partners) State.partners = data.partners;
            if (data.currentPartnerId) State.currentPartnerId = data.currentPartnerId;
            if (data.letterStyles) State.letterStyles = data.letterStyles;
            if (data.paperTheme) State.paperTheme = data.paperTheme;
            if (data.paperColors) State.paperColors = data.paperColors;
        } catch(e) {
            console.error('加载情侣空间数据失败:', e);
        }
    }
    
    function save() {
        try {
            const dataToSave = {
                partners: State.partners,
                currentPartnerId: State.currentPartnerId,
                letterStyles: State.letterStyles,
                paperTheme: State.paperTheme,
                paperColors: State.paperColors
            };
            localStorage.setItem('couplesSpaceData', JSON.stringify(dataToSave));
            console.log('情侣空间数据已保存:', dataToSave);
        } catch(e) {
            console.error('保存情侣空间数据失败:', e);
        }
    }
    
    function toast(msg) {
        if (typeof showToast === 'function') showToast(msg);
        else alert(msg);
    }
    
    function getPartner() {
        return State.partners.find(p => p.id === State.currentPartnerId);
    }
    
    function getFriends() {
        return (typeof AppState !== 'undefined' && AppState.friends) || [];
    }
    
    function getMessages(partnerId) {
        if (typeof AppState === 'undefined') return [];
        return AppState.messages[partnerId] || [];
    }
    
    function callAI(prompt, partnerId) {
        return new Promise((resolve, reject) => {
            if (typeof sendMessageToAI === 'function') {
                sendMessageToAI(prompt, partnerId).then(resolve).catch(reject);
            } else if (typeof AppState !== 'undefined' && AppState.apiSettings.endpoint) {
                fetch(AppState.apiSettings.endpoint + '/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (AppState.apiSettings.apiKey || '')
                    },
                    body: JSON.stringify({
                        model: AppState.apiSettings.selectedModel,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.8
                    })
                }).then(r => r.json()).then(d => resolve(d.choices[0].message.content)).catch(reject);
            } else {
                reject(new Error('API未配置'));
            }
        });
    }
    
    function modal(id, content) {
        let m = document.getElementById(id);
        if (m) m.remove();
        m = document.createElement('div');
        m.id = id;
        m.className = 'couples-modal';
        m.innerHTML = `<div class="couples-modal-content">${content}</div>`;
        document.body.appendChild(m);
    }
    
    function closeModal(id) {
        const m = document.getElementById(id);
        if (m) m.remove();
    }
    
    // ========== 渲染函数 ==========
    function render() {
        const el = document.getElementById('couples-space-content');
        if (!el) return;
        
        const p = getPartner();
        const userName = (typeof AppState !== 'undefined' && AppState.user.name) || '我';
        
        // 获取当前情侣对应对话的用户头像
        let userAvatar = '';
        if (p && typeof AppState !== 'undefined') {
            const conv = AppState.conversations.find(c => c.id === p.id);
            userAvatar = (conv && conv.userAvatar) || AppState.user.avatar || '';
        }
        
        el.innerHTML = `
            <div class="cp-container">
                <div class="cp-header" onclick="CS.openSelector()">
                    <div class="cp-avatars">
                        <div class="cp-avatar">${userAvatar ? `<img src="${userAvatar}">` : userName[0]}</div>
                        <div class="cp-heart">♥</div>
                        <div class="cp-avatar">${p ? (p.avatar ? `<img src="${p.avatar}">` : p.name[0]) : '?'}</div>
                    </div>
                </div>
                
                ${p ? `
                    <div class="cp-grid">
                        <div class="cp-card" onclick="CS.dailyQ()">
                            <div class="cp-title">每日一问</div>
                        </div>
                        <div class="cp-card" onclick="CS.letter()">
                            <div class="cp-title">AI情书</div>
                        </div>
                        <div class="cp-card" onclick="CS.miniTheater()">
                            <div class="cp-title">小剧场</div>
                        </div>
                        <div class="cp-card" onclick="CS.adventureCard()">
                            <div class="cp-title">日常奇遇卡</div>
                        </div>
                        <div class="cp-card" onclick="CS.wishList()">
                            <div class="cp-title">心愿清单</div>
                        </div>
                    </div>
                ` : `
                    <div class="cp-empty">
                        <div class="cp-empty-icon">♡</div>
                        <div class="cp-empty-text">还没有情侣哦</div>
                        <button class="cp-btn" onclick="CS.openSelector()">添加情侣</button>
                    </div>
                `}
            </div>
        `;
    }
    
    // ========== 核心功能 ==========
    const CS = {
        init() {
            load();
            render();
            
            // 绑定返回按钮
            const backBtn = document.getElementById('couples-space-back-btn');
            if (backBtn) {
                backBtn.onclick = function() {
                    if (typeof closeSubPage === 'function') {
                        closeSubPage('couples-space-page');
                    }
                };
            }
        },
        
        openSelector() {
            const friends = getFriends();
            const html = `
                <h3>选择情侣</h3>
                <button class="cp-close" onclick="CS.close('sel')">×</button>
                <div class="cp-modal-body">
                    <div class="cp-section">
                        <div class="cp-subtitle">当前情侣</div>
                        ${State.partners.length > 0 ? State.partners.map(p => `
                            <div class="cp-item ${p.id === State.currentPartnerId ? 'active' : ''}" onclick="CS.select('${p.id}')">
                                <div class="cp-item-info">
                                    <div class="cp-item-avatar">${p.avatar ? `<img src="${p.avatar}">` : p.name[0]}</div>
                                    <div class="cp-item-name">${p.name}</div>
                                </div>
                                <button class="cp-remove" onclick="event.stopPropagation();CS.remove('${p.id}')">解除</button>
                            </div>
                        `).join('') : '<div class="cp-empty-text">还没有情侣</div>'}
                    </div>
                    <div class="cp-section">
                        <div class="cp-subtitle">可添加好友</div>
                        ${friends.filter(f => !State.partners.find(p => p.id === f.id)).map(f => `
                            <div class="cp-item" onclick="CS.add('${f.id}')">
                                <div class="cp-item-info">
                                    <div class="cp-item-avatar">${f.avatar ? `<img src="${f.avatar}">` : f.name[0]}</div>
                                    <div class="cp-item-name">${f.name}</div>
                                </div>
                                <button class="cp-add">添加</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            modal('sel', html);
        },
        
        select(id) {
            State.currentPartnerId = id;
            save();
            closeModal('sel');
            render();
            toast('已切换');
        },
        
        add(id) {
            const f = getFriends().find(x => x.id === id);
            if (!f) return;
            State.partners.push({ id: f.id, name: f.name, avatar: f.avatar, time: Date.now() });
            if (!State.currentPartnerId) State.currentPartnerId = id;
            save();
            closeModal('sel');
            render();
            toast('已添加');
        },
        
        remove(id) {
            if (!confirm('确定解除？')) return;
            State.partners = State.partners.filter(p => p.id !== id);
            if (State.currentPartnerId === id) {
                State.currentPartnerId = State.partners[0] ? State.partners[0].id : null;
            }
            save();
            closeModal('sel');
            render();
        },
        
        dailyQ() {
            const p = getPartner();
            if (!p) return toast('请先选择情侣');
            
            modal('dq', `
                <h3>每日一问</h3>
                <button class="cp-close" onclick="CS.close('dq')">×</button>
                <div class="cp-modal-body">
                    <div class="cp-section">
                        <div class="cp-subtitle">选择提问方式</div>
                        <div style="display:flex;gap:12px;margin-bottom:20px;">
                            <button class="cp-btn" onclick="CS.showCustomQuestion()" style="flex:1">自定义问题</button>
                            <button class="cp-btn" onclick="CS.generateQuestion()" style="flex:1">AI生成问题</button>
                        </div>
                    </div>
                    
                    <div id="dq-custom" style="display:none">
                        <div class="cp-label">输入你的问题</div>
                        <textarea id="dq-custom-input" class="cp-textarea" placeholder="想问TA什么呢..." style="min-height:100px"></textarea>
                        <button class="cp-btn" onclick="CS.askCustomQuestion()">提问</button>
                    </div>
                    
                    <div id="dq-result" style="display:none">
                        <div class="cp-label">问题</div>
                        <div id="dq-question" class="cp-question"></div>
                        <div class="cp-label" style="margin-top:16px">TA的回答</div>
                        <div id="dq-answer"></div>
                    </div>
                </div>
            `);
        },
        
        showCustomQuestion() {
            document.getElementById('dq-custom').style.display = 'block';
            document.getElementById('dq-result').style.display = 'none';
        },
        
        askCustomQuestion() {
            const question = document.getElementById('dq-custom-input').value.trim();
            if (!question) return toast('请输入问题');
            
            document.getElementById('dq-custom').style.display = 'none';
            document.getElementById('dq-result').style.display = 'block';
            document.getElementById('dq-question').textContent = question;
            document.getElementById('dq-answer').innerHTML = '<div class="cp-loading">生成回答中...</div>';
            
            CS.getAnswerForQuestion(question);
        },
        
        generateQuestion() {
            document.getElementById('dq-result').style.display = 'block';
            document.getElementById('dq-question').innerHTML = '<div class="cp-loading">AI生成问题与回答中...</div>';
            document.getElementById('dq-answer').innerHTML = '';
            
            const p = getPartner();
            const userName = (typeof AppState !== 'undefined' && AppState.user.name) || '我';
            
            // 获取用户人设
            let userPersonality = '';
            if (typeof AppState !== 'undefined') {
                const conv = AppState.conversations.find(c => c.id === p.id);
                if (conv && conv.boundPersonaId) {
                    const persona = AppState.userPersonas.find(p => p.id === conv.boundPersonaId);
                    if (persona) userPersonality = persona.personality || '';
                } else if (AppState.user && AppState.user.personality) {
                    userPersonality = AppState.user.personality;
                }
            }
            
            // 获取角色人设
            let charPersonality = '';
            if (typeof AppState !== 'undefined') {
                const conv = AppState.conversations.find(c => c.id === p.id);
                if (conv) {
                    charPersonality = conv.personality || conv.description || '';
                }
            }
            
            // 获取对话历史
            const msgs = getMessages(p.id).slice(-10).map(m => `${m.isUser ? userName : p.name}: ${m.content}`).join('\n');
            
            const prompt = `你正在情侣空间中为${userName}和${p.name}生成一个有趣的情侣问题和回答。

【用户信息】
名字：${userName}
${userPersonality ? `人设：${userPersonality}` : ''}

【角色信息】
名字：${p.name}
${charPersonality ? `人设：${charPersonality}` : ''}

【对话历史】
${msgs || '暂无对话历史'}

请生成：
1. 一个适合情侣之间的有趣问题（15-30字）
2. ${p.name}对这个问题的回答（50-100字，要符合TA的性格，用亲密温暖的语气）

返回JSON格式：{"question":"问题内容","answer":"回答内容"}
不要任何额外说明，只返回JSON。`;
            
            callAI(prompt, p.id)
                .then(resp => {
                    try {
                        const match = resp.match(/\{[^}]+\}/);
                        if (!match) throw new Error('格式错误');
                        const result = JSON.parse(match[0]);
                        
                        document.getElementById('dq-question').textContent = result.question;
                        document.getElementById('dq-answer').innerHTML = `<p>${result.answer}</p>`;
                    } catch(e) {
                        document.getElementById('dq-question').innerHTML = '<div class="cp-error">生成失败，请重试</div>';
                        document.getElementById('dq-answer').innerHTML = '';
                        console.error(e);
                    }
                })
                .catch(() => {
                    document.getElementById('dq-question').innerHTML = '<div class="cp-error">生成失败</div>';
                    document.getElementById('dq-answer').innerHTML = '';
                });
        },
        
        getAnswerForQuestion(question) {
            const p = getPartner();
            const userName = (typeof AppState !== 'undefined' && AppState.user.name) || '我';
            
            // 获取用户人设
            let userPersonality = '';
            if (typeof AppState !== 'undefined') {
                const conv = AppState.conversations.find(c => c.id === p.id);
                if (conv && conv.boundPersonaId) {
                    const persona = AppState.userPersonas.find(p => p.id === conv.boundPersonaId);
                    if (persona) userPersonality = persona.personality || '';
                } else if (AppState.user && AppState.user.personality) {
                    userPersonality = AppState.user.personality;
                }
            }
            
            // 获取角色人设
            let charPersonality = '';
            if (typeof AppState !== 'undefined') {
                const conv = AppState.conversations.find(c => c.id === p.id);
                if (conv) {
                    charPersonality = conv.personality || conv.description || '';
                }
            }
            
            // 获取对话历史
            const msgs = getMessages(p.id).slice(-10).map(m => `${m.isUser ? userName : p.name}: ${m.content}`).join('\n');
            
            const prompt = `你是${p.name}，现在在你和${userName}的情侣空间中。

【你的信息】
名字：${p.name}
${charPersonality ? `人设：${charPersonality}` : ''}

【对方信息】
名字：${userName}
${userPersonality ? `人设：${userPersonality}` : ''}

【对话历史】
${msgs || '暂无对话历史'}

${userName}在情侣空间向你提问："${question}"

请用亲密温暖的语气回答这个问题（50-100字），要符合你的性格特点。直接输出回答内容，不要任何额外说明。`;
            
            callAI(prompt, p.id)
                .then(answer => {
                    document.getElementById('dq-answer').innerHTML = `<p>${answer}</p>`;
                })
                .catch(() => {
                    document.getElementById('dq-answer').innerHTML = '<div class="cp-error">生成失败</div>';
                });
        },
        
        letter() {
            const p = getPartner();
            if (!p) return toast('请先选择情侣');
            
            modal('let', `
                <h3>AI情书</h3>
                <button class="cp-close" onclick="CS.close('let')">×</button>
                <div class="cp-modal-body">
                    <div class="cp-label">情书风格</div>
                    <select id="let-style" class="cp-select">
                        ${State.letterStyles.map(s => `<option value="${s.id}">${s.name} - ${s.desc}</option>`).join('')}
                    </select>
                    <button class="cp-btn-sec" onclick="CS.manageStyles()" style="margin-top:8px;width:100%">管理风格</button>
                    
                    <div class="cp-label" style="margin-top:16px">信纸主题关键词</div>
                    <input type="text" id="let-theme" class="cp-input"
                           placeholder="如：樱花、星空、海洋、秋日、雪夜..."
                           value="${State.paperTheme || ''}">
                    <div class="cp-hint">AI将根据关键词生成独特的信纸样式</div>
                    
                    <div id="let-preview" style="display:none;margin-top:12px">
                        <div class="cp-label">预览信纸</div>
                        <div id="let-preview-paper" class="cp-letter-preview"></div>
                    </div>
                    
                    <button class="cp-btn" onclick="CS.genPaper()" style="margin-top:12px">生成信纸</button>
                    <button class="cp-btn" onclick="CS.genLetter()" id="let-gen-btn" style="display:none;margin-top:8px">生成情书</button>
                    
                    <div id="let-result" style="display:none;margin-top:16px">
                        <div class="cp-label">完成的情书</div>
                        <div id="let-paper" class="cp-letter-paper">
                            <div id="let-content"></div>
                        </div>
                        <button class="cp-btn-sec" onclick="CS.copyLetter()">复制</button>
                    </div>
                </div>
            `);
            
            if (State.paperTheme) {
                document.getElementById('let-preview').style.display = 'block';
                document.getElementById('let-gen-btn').style.display = 'inline-block';
                const preview = document.getElementById('let-preview-paper');
                preview.style.background = State.paperColors.bg;
                preview.style.borderColor = State.paperColors.border;
                preview.style.color = State.paperColors.text;
                preview.textContent = `${State.paperTheme}主题`;
            }
        },
        
        genPaper() {
            const theme = document.getElementById('let-theme').value.trim();
            if (!theme) return toast('请输入主题关键词');
            
            const p = getPartner();
            const preview = document.getElementById('let-preview');
            const previewPaper = document.getElementById('let-preview-paper');
            const genBtn = document.getElementById('let-gen-btn');
            
            preview.style.display = 'block';
            previewPaper.innerHTML = '<div class="cp-loading">AI设计中...</div>';
            
            const prompt = `根据"${theme}"主题，设计一个情书信纸配色方案。要求：
1. 背景色(bg)：浅色系，符合主题氛围
2. 边框色(border)：比背景稍深，和谐搭配
3. 文字色(text)：确保可读性

返回JSON格式：{"bg":"#颜色","border":"#颜色","text":"#颜色","desc":"简短描述(20字内)"}
不要任何额外说明，只返回JSON。`;
            
            callAI(prompt, p.id)
                .then(resp => {
                    try {
                        const match = resp.match(/\{[^}]+\}/);
                        if (!match) throw new Error('格式错误');
                        const colors = JSON.parse(match[0]);
                        
                        State.paperTheme = theme;
                        State.paperColors = {
                            bg: colors.bg || '#FFF0F5',
                            border: colors.border || '#FFC0D4',
                            text: colors.text || '#333'
                        };
                        save();
                        
                        previewPaper.style.background = State.paperColors.bg;
                        previewPaper.style.borderColor = State.paperColors.border;
                        previewPaper.style.color = State.paperColors.text;
                        previewPaper.innerHTML = `
                            <div style="padding:12px">
                                <strong>${theme}</strong>
                                <p style="font-size:12px;margin-top:4px">${colors.desc || '主题信纸'}</p>
                            </div>
                        `;
                        genBtn.style.display = 'inline-block';
                        toast('信纸生成成功');
                    } catch(e) {
                        previewPaper.innerHTML = '<div class="cp-error">生成失败，请重试</div>';
                        console.error(e);
                    }
                })
                .catch(() => {
                    previewPaper.innerHTML = '<div class="cp-error">生成失败</div>';
                });
        },
        
        genLetter() {
            const p = getPartner();
            const style = document.getElementById('let-style').value;
            const styleName = State.letterStyles.find(s => s.id === style).name;
            
            if (!State.paperTheme) return toast('请先生成信纸');
            
            const result = document.getElementById('let-result');
            const content = document.getElementById('let-content');
            const paperDiv = document.getElementById('let-paper');
            
            result.style.display = 'block';
            content.innerHTML = '<div class="cp-loading">生成中...</div>';
            paperDiv.style.background = State.paperColors.bg;
            paperDiv.style.borderColor = State.paperColors.border;
            paperDiv.style.color = State.paperColors.text;
            
            const msgs = getMessages(p.id).slice(-10).map(m => m.content).join('\n');
            const prompt = `你是${p.name}，写一封${styleName}的情书给伴侣。
要求：
1. 风格：${styleName}
2. 信纸主题：${State.paperTheme}（可以在内容中自然融入主题元素）
3. 字数：150-250字
4. 对话历史参考：${msgs || '无'}

直接输出情书内容，不要任何额外说明。`;
            
            callAI(prompt, p.id)
                .then(l => { content.innerHTML = `<p>${l.replace(/\n/g, '<br>')}</p>`; })
                .catch(() => { content.innerHTML = '<div class="cp-error">生成失败</div>'; });
        },
        
        copyLetter() {
            const text = document.getElementById('let-content').innerText;
            navigator.clipboard.writeText(text).then(() => toast('已复制')).catch(() => toast('复制失败'));
        },
        
        manageStyles() {
            modal('style', `
                <h3>管理情书风格</h3>
                <button class="cp-close" onclick="CS.close('style')">×</button>
                <div class="cp-modal-body">
                    <div class="cp-style-section">
                        <div class="cp-subtitle">情书风格 <button class="cp-add-btn" onclick="CS.addStyle()">+</button></div>
                        ${State.letterStyles.map((s, i) => `
                            <div class="cp-style-item">
                                <div>${s.name} - ${s.desc}</div>
                                ${State.letterStyles.length > 1 ? `<button class="cp-remove" onclick="CS.delStyle(${i})">×</button>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <button class="cp-btn" onclick="CS.close('style');CS.letter()">返回</button>
                </div>
            `);
        },
        
        miniTheater() {
            toast('小剧场功能开发中，敬请期待...');
        },
        
        adventureCard() {
            toast('日常奇遇卡功能开发中，敬请期待...');
        },
        
        wishList() {
            toast('心愿清单功能开发中，敬请期待...');
        },
        
        addStyle() {
            const name = prompt('风格名称:');
            if (!name) return;
            const desc = prompt('风格描述:');
            if (!desc) return;
            State.letterStyles.push({ id: Date.now().toString(), name, desc });
            save();
            closeModal('style');
            CS.manageStyles();
        },
        
        delStyle(idx) {
            if (State.letterStyles.length <= 1) return toast('至少保留一个');
            State.letterStyles.splice(idx, 1);
            save();
            closeModal('style');
            CS.manageStyles();
        },
        
        close(id) {
            closeModal(id);
        },
        
        back() {
            if (typeof closeSubPage === 'function') {
                closeSubPage();
            }
        }
    };
    
    // 暴露全局接口
    window.CS = CS;
    window.CouplesSpace = CS;
    
    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', CS.init);
    } else {
        setTimeout(CS.init, 500);
    }
})();