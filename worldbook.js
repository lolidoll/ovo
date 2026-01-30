// ===== 世界书管理系统 =====
// 独立的世界书管理模块，包含白浅灰色简约样式和多格式导入功能

(function() {
    'use strict';

    // 世界书管理器命名空间
    window.WorldbookManager = {
        // 初始化
        init: function() {
            this.bindEvents();
            console.log('世界书管理器已初始化');
        },

        // 绑定事件
        bindEvents: function() {
            const addBtn = document.getElementById('worldbook-add-btn');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.openAddDialog());
            }

            const importBtn = document.getElementById('worldbook-import-btn');
            if (importBtn) {
                importBtn.addEventListener('click', () => {
                    document.getElementById('worldbook-import-input').click();
                });
            }

            const importInput = document.getElementById('worldbook-import-input');
            if (importInput) {
                importInput.addEventListener('change', (e) => {
                    this.handleImport(e.target.files);
                    e.target.value = ''; // 重置input以允许重复导入同一文件
                });
            }
        },

        // 打开新增世界书对话框（现代化黑白灰设计）
        openAddDialog: function() {
            const modal = document.createElement('div');
            modal.id = 'add-worldbook-modal';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000000;backdrop-filter:blur(8px);animation:fadeIn 0.2s ease;';
            
            modal.innerHTML = `
                <div style="background:#fff;border-radius:20px;padding:28px;max-width:520px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3), 0 0 1px rgba(0,0,0,0.1);animation:slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:20px;border-bottom:2px solid #f0f0f0;">
                        <h3 style="margin:0;font-size:20px;font-weight:700;color:#1a1a1a;letter-spacing:0.3px;">新建世界书</h3>
                        <button onclick="document.getElementById('add-worldbook-modal').remove();" style="border:none;background:#f5f5f5;cursor:pointer;font-size:20px;color:#666;padding:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:all 0.2s;">×</button>
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="display:block;font-size:13px;color:#666;margin-bottom:10px;font-weight:600;letter-spacing:0.2px;">世界书名称</label>
                        <input id="wb-name-input" type="text" placeholder="例如：赛博朋克2077世界观" style="width:100%;padding:14px 16px;border:2px solid #e8e8e8;border-radius:12px;box-sizing:border-box;font-size:15px;background:#fafafa;transition:all 0.3s;font-weight:500;">
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="display:block;font-size:13px;color:#666;margin-bottom:10px;font-weight:600;letter-spacing:0.2px;">世界书内容</label>
                        <textarea id="wb-content-input" placeholder="描述此世界的设定、背景、规则等...&#10;&#10;支持使用占位符：&#10;{{char}} - 角色名称&#10;{{user}} - 用户名称" style="width:100%;height:200px;padding:14px 16px;border:2px solid #e8e8e8;border-radius:12px;box-sizing:border-box;font-size:14px;resize:vertical;background:#fafafa;line-height:1.7;transition:all 0.3s;font-family:inherit;"></textarea>
                        <div style="font-size:12px;color:#999;margin-top:10px;padding:10px 14px;background:#f8f8f8;border-radius:8px;border-left:3px solid #ddd;">💡 AI会在回复前读取这些内容以保持话题背景</div>
                    </div>
                    
                    <div style="margin-bottom:28px;">
                        <label style="display:flex;align-items:center;font-size:14px;cursor:pointer;padding:14px 16px;background:linear-gradient(135deg, #f8f8f8 0%, #f0f0f0 100%);border-radius:12px;transition:all 0.3s;border:2px solid transparent;">
                            <input id="wb-global-checkbox" type="checkbox" style="margin-right:12px;cursor:pointer;width:20px;height:20px;accent-color:#2c2c2c;">
                            <span style="color:#333;font-weight:500;">设为全局世界书（所有角色都会使用）</span>
                        </label>
                    </div>
                    
                    <div style="display:flex;gap:12px;justify-content:flex-end;">
                        <button onclick="document.getElementById('add-worldbook-modal').remove();" style="padding:12px 28px;border:2px solid #e0e0e0;border-radius:12px;background:#fff;cursor:pointer;font-size:14px;color:#666;transition:all 0.3s;font-weight:600;">取消</button>
                        <button onclick="window.WorldbookManager.saveNew();" style="padding:12px 28px;border:none;border-radius:12px;background:linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);color:#fff;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.3s;box-shadow:0 4px 12px rgba(0,0,0,0.2);">创建</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 输入框获得焦点
            setTimeout(() => {
                document.getElementById('wb-name-input').focus();
            }, 100);
            
            // 添加输入框聚焦样式和按钮悬停效果
            const inputs = modal.querySelectorAll('input[type="text"], textarea');
            inputs.forEach(input => {
                input.addEventListener('focus', function() {
                    this.style.borderColor = '#2c2c2c';
                    this.style.background = '#fff';
                    this.style.boxShadow = '0 0 0 3px rgba(44,44,44,0.1)';
                });
                input.addEventListener('blur', function() {
                    this.style.borderColor = '#e8e8e8';
                    this.style.background = '#fafafa';
                    this.style.boxShadow = 'none';
                });
            });
            
            // 按钮悬停效果
            const buttons = modal.querySelectorAll('button');
            buttons.forEach(btn => {
                if (btn.textContent.includes('创建')) {
                    btn.addEventListener('mouseenter', function() {
                        this.style.transform = 'translateY(-2px)';
                        this.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                    });
                    btn.addEventListener('mouseleave', function() {
                        this.style.transform = 'translateY(0)';
                        this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    });
                } else if (btn.textContent.includes('取消')) {
                    btn.addEventListener('mouseenter', function() {
                        this.style.background = '#f8f8f8';
                        this.style.borderColor = '#ccc';
                    });
                    btn.addEventListener('mouseleave', function() {
                        this.style.background = '#fff';
                        this.style.borderColor = '#e0e0e0';
                    });
                } else if (btn.textContent === '×') {
                    btn.addEventListener('mouseenter', function() {
                        this.style.background = '#e8e8e8';
                        this.style.transform = 'rotate(90deg)';
                    });
                    btn.addEventListener('mouseleave', function() {
                        this.style.background = '#f5f5f5';
                        this.style.transform = 'rotate(0)';
                    });
                }
            });
            
            // Checkbox悬停效果
            const checkbox = modal.querySelector('label[style*="cursor:pointer"]');
            if (checkbox) {
                checkbox.addEventListener('mouseenter', function() {
                    this.style.background = 'linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 100%)';
                    this.style.borderColor = '#ccc';
                });
                checkbox.addEventListener('mouseleave', function() {
                    this.style.background = 'linear-gradient(135deg, #f8f8f8 0%, #f0f0f0 100%)';
                    this.style.borderColor = 'transparent';
                });
            }
            
            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        },

        // 保存新建的世界书
        saveNew: function() {
            const name = document.getElementById('wb-name-input').value.trim();
            const content = document.getElementById('wb-content-input').value.trim();
            const isGlobal = document.getElementById('wb-global-checkbox').checked;
            
            if (!name) {
                this.showToast('请输入世界书名称', 'warning');
                return;
            }
            
            if (!content) {
                this.showToast('请输入世界书内容', 'warning');
                return;
            }
            
            const worldbook = {
                id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: name,
                content: content,
                isGlobal: isGlobal,
                createdAt: new Date().toISOString()
            };
            
            window.AppState.worldbooks.push(worldbook);
            window.saveToStorage();
            this.render();
            
            if (typeof window.updateCharacterWorldbookSelects === 'function') {
                window.updateCharacterWorldbookSelects();
            }
            
            document.getElementById('add-worldbook-modal').remove();
            this.showToast('世界书创建成功', 'success');
        },

        // 处理文件导入（支持JSON、DOC、TXT）
        handleImport: async function(files) {
            if (!files || files.length === 0) return;
            
            const fileArray = Array.from(files);
            const worldbooks = [];

            for (const file of fileArray) {
                const fileName = file.name.toLowerCase();
                
                try {
                    if (fileName.endsWith('.json')) {
                        // 处理JSON文件
                        const jsonWbs = await this.parseJSONFile(file);
                        worldbooks.push(...jsonWbs);
                    } else if (fileName.endsWith('.txt')) {
                        // 处理TXT文件
                        const txtWb = await this.parseTXTFile(file);
                        if (txtWb) worldbooks.push(txtWb);
                    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
                        // 处理DOC/DOCX文件
                        const docWb = await this.parseDOCFile(file);
                        if (docWb) worldbooks.push(docWb);
                    } else {
                        this.showToast(`不支持的文件格式: ${file.name}`, 'warning');
                    }
                } catch (error) {
                    console.error(`解析文件失败: ${file.name}`, error);
                    this.showToast(`文件 ${file.name} 解析失败`, 'error');
                }
            }

            if (worldbooks.length > 0) {
                this.showImportDialog(worldbooks, fileArray.map(f => f.name).join(', '));
            }
        },

        // 解析JSON文件（支持SillyTavern格式）
        parseJSONFile: function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        const worldbooks = [];
                        
                        // 处理不同格式的JSON
                        if (Array.isArray(data)) {
                            // 数组格式
                            worldbooks.push(...data.map(wb => ({
                                name: wb.name || wb.title || '未命名世界书',
                                content: wb.content || wb.data || wb.description || '',
                                isGlobal: wb.isGlobal || wb.global || false
                            })));
                        } else if (data.spec === 'world_book_v1' || data.spec === 'chara_world') {
                            // SillyTavern世界书格式
                            const entries = data.entries || [];
                            const content = Array.isArray(entries) 
                                ? entries.map(e => {
                                    const keys = Array.isArray(e.keys) ? e.keys.join(', ') : '';
                                    return `【${keys}】\n${e.content || e.text || ''}`;
                                  }).join('\n\n')
                                : JSON.stringify(entries);
                            
                            worldbooks.push({
                                name: data.name || '世界书',
                                content: content,
                                isGlobal: false
                            });
                        } else if (data.name && data.content) {
                            // 单个世界书对象
                            worldbooks.push({
                                name: data.name || data.title || '未命名世界书',
                                content: data.content || data.data || '',
                                isGlobal: data.isGlobal || data.global || false
                            });
                        } else {
                            reject(new Error('不支持的JSON格式'));
                            return;
                        }
                        
                        resolve(worldbooks.filter(wb => wb.content.trim()));
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = reject;
                reader.readAsText(file);
            });
        },

        // 解析TXT文件
        parseTXTFile: function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result.trim();
                    if (content) {
                        resolve({
                            name: file.name.replace(/\.txt$/i, ''),
                            content: content,
                            isGlobal: false
                        });
                    } else {
                        resolve(null);
                    }
                };
                reader.onerror = reject;
                reader.readAsText(file);
            });
        },

        // 解析DOC/DOCX文件
        parseDOCFile: function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        // 检查是否有mammoth库
                        if (typeof mammoth !== 'undefined') {
                            const result = await mammoth.extractRawText({arrayBuffer: e.target.result});
                            const content = result.value.trim();
                            if (content) {
                                resolve({
                                    name: file.name.replace(/\.docx?$/i, ''),
                                    content: content,
                                    isGlobal: false
                                });
                            } else {
                                resolve(null);
                            }
                        } else {
                            // 如果没有mammoth库，尝试简单的文本提取
                            const text = new TextDecoder().decode(new Uint8Array(e.target.result));
                            // 简单的文本清理
                            const content = text.replace(/[^\x20-\x7E\u4e00-\u9fa5\n]/g, '').trim();
                            if (content.length > 50) {
                                resolve({
                                    name: file.name.replace(/\.docx?$/i, ''),
                                    content: content,
                                    isGlobal: false
                                });
                            } else {
                                reject(new Error('请在HTML中引入mammoth.js库以支持DOC/DOCX文件'));
                            }
                        }
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
        },

        // 显示导入选择对话框（现代化黑白灰设计）
        showImportDialog: function(worldbooks, fileName) {
            let modal = document.getElementById('wb-import-dialog-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'wb-import-dialog-modal';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000000;backdrop-filter:blur(8px);animation:fadeIn 0.2s ease;';
            
            const wbList = worldbooks.map((wb, idx) => `
                <div style="padding:16px;background:#fff;border-radius:14px;margin-bottom:12px;border:2px solid #e8e8e8;transition:all 0.3s;box-shadow:0 2px 8px rgba(0,0,0,0.04);" onmouseover="this.style.borderColor='#2c2c2c';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.12)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e8e8e8';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)';this.style.transform='translateY(0)'">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                        <input type="radio" name="wb-import-type" id="wb-type-${idx}" value="${idx}" ${idx === 0 ? 'checked' : ''} style="width:20px;height:20px;cursor:pointer;accent-color:#2c2c2c;">
                        <label for="wb-type-${idx}" style="flex:1;cursor:pointer;font-size:15px;font-weight:600;color:#1a1a1a;margin:0;letter-spacing:0.2px;">
                            ${this.escapeHtml(wb.name)}
                        </label>
                    </div>
                    <div style="margin-left:32px;display:flex;flex-direction:column;gap:8px;">
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;color:#666;padding:8px 10px;border-radius:8px;transition:all 0.2s;background:#fafafa;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fafafa'">
                            <input type="radio" name="wb-import-scope-${idx}" value="global" style="width:18px;height:18px;cursor:pointer;accent-color:#2c2c2c;">
                            <span style="font-weight:500;">全局世界书（所有角色可用）</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;color:#666;padding:8px 10px;border-radius:8px;transition:all 0.2s;background:#fafafa;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fafafa'">
                            <input type="radio" name="wb-import-scope-${idx}" value="local" checked style="width:18px;height:18px;cursor:pointer;accent-color:#2c2c2c;">
                            <span style="font-weight:500;">局部世界书（需绑定到角色）</span>
                        </label>
                    </div>
                </div>
            `).join('');
            
            // 存储待导入的世界书数据
            window.pendingWorldbookImport = worldbooks;
            
            modal.innerHTML = `
                <div style="background:#fff;border-radius:20px;max-width:520px;width:90%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3), 0 0 1px rgba(0,0,0,0.1);animation:slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
                    <div style="padding:24px 28px;border-bottom:2px solid #f0f0f0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <h3 style="margin:0;font-size:20px;color:#1a1a1a;font-weight:700;letter-spacing:0.3px;">选择导入的世界书</h3>
                            <button onclick="document.getElementById('wb-import-dialog-modal').remove();" style="border:none;background:#f5f5f5;cursor:pointer;font-size:20px;color:#666;padding:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:all 0.2s;" onmouseenter="this.style.background='#e8e8e8';this.style.transform='rotate(90deg)'" onmouseleave="this.style.background='#f5f5f5';this.style.transform='rotate(0)'">×</button>
                        </div>
                        <div style="margin-top:10px;font-size:13px;color:#999;padding:8px 12px;background:#f8f8f8;border-radius:8px;border-left:3px solid #ddd;">📁 文件：${this.escapeHtml(fileName)}</div>
                    </div>
                    
                    <div style="padding:20px 28px;flex:1;overflow-y:auto;">
                        ${wbList}
                    </div>
                    
                    <div style="padding:20px 28px;border-top:2px solid #f0f0f0;display:flex;gap:12px;justify-content:flex-end;">
                        <button onclick="document.getElementById('wb-import-dialog-modal').remove();" style="padding:12px 28px;border:2px solid #e0e0e0;border-radius:12px;background:#fff;cursor:pointer;font-size:14px;color:#666;transition:all 0.3s;font-weight:600;" onmouseenter="this.style.background='#f8f8f8';this.style.borderColor='#ccc'" onmouseleave="this.style.background='#fff';this.style.borderColor='#e0e0e0'">取消</button>
                        <button onclick="window.WorldbookManager.confirmImport();" style="padding:12px 28px;background:linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);color:#fff;border:none;border-radius:12px;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.3s;box-shadow:0 4px 12px rgba(0,0,0,0.2);" onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.3)'" onmouseleave="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'">导入</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        },

        // 确认导入
        confirmImport: function() {
            if (!window.pendingWorldbookImport || window.pendingWorldbookImport.length === 0) {
                this.showToast('没有待导入的世界书', 'warning');
                return;
            }
            
            const selectedRadio = document.querySelector('input[name="wb-import-type"]:checked');
            if (!selectedRadio) {
                this.showToast('请选择要导入的世界书', 'warning');
                return;
            }
            
            const selectedIdx = parseInt(selectedRadio.value);
            const selectedWb = window.pendingWorldbookImport[selectedIdx];
            const scopeRadio = document.querySelector(`input[name="wb-import-scope-${selectedIdx}"]:checked`);
            const isGlobal = scopeRadio ? scopeRadio.value === 'global' : false;
            
            if (!selectedWb || !selectedWb.content || !selectedWb.content.trim()) {
                this.showToast('世界书内容为空', 'warning');
                return;
            }
            
            const newWb = {
                id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: selectedWb.name || '导入的世界书',
                content: selectedWb.content,
                isGlobal: isGlobal,
                createdAt: new Date().toISOString()
            };
            
            window.AppState.worldbooks.push(newWb);
            window.saveToStorage();
            document.getElementById('wb-import-dialog-modal').remove();
            this.showToast(`世界书"${newWb.name}"导入成功`, 'success');
            this.render();
            
            if (typeof window.loadWorldbookUI === 'function') {
                window.loadWorldbookUI();
            }
            
            window.pendingWorldbookImport = null;
        },

        // 编辑世界书（现代化黑白灰设计）
        edit: function(wbId) {
            const wb = window.AppState.worldbooks.find(w => w.id === wbId);
            if (!wb) return;
            
            let modal = document.getElementById('edit-worldbook-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'edit-worldbook-modal';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000000;backdrop-filter:blur(8px);animation:fadeIn 0.2s ease;';
            
            modal.innerHTML = `
                <div style="background:#fff;border-radius:20px;padding:28px;max-width:520px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3), 0 0 1px rgba(0,0,0,0.1);animation:slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:20px;border-bottom:2px solid #f0f0f0;">
                        <h3 style="margin:0;font-size:20px;font-weight:700;color:#1a1a1a;letter-spacing:0.3px;">编辑世界书</h3>
                        <button onclick="document.getElementById('edit-worldbook-modal').remove();" style="border:none;background:#f5f5f5;cursor:pointer;font-size:20px;color:#666;padding:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:all 0.2s;" onmouseenter="this.style.background='#e8e8e8';this.style.transform='rotate(90deg)'" onmouseleave="this.style.background='#f5f5f5';this.style.transform='rotate(0)'">×</button>
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="display:block;font-size:13px;color:#666;margin-bottom:10px;font-weight:600;letter-spacing:0.2px;">世界书名称</label>
                        <input id="edit-wb-name-input" type="text" value="${this.escapeHtml(wb.name)}" style="width:100%;padding:14px 16px;border:2px solid #e8e8e8;border-radius:12px;box-sizing:border-box;font-size:15px;background:#fafafa;transition:all 0.3s;font-weight:500;">
                    </div>
                    
                    <div style="margin-bottom:24px;">
                        <label style="display:block;font-size:13px;color:#666;margin-bottom:10px;font-weight:600;letter-spacing:0.2px;">世界书内容</label>
                        <textarea id="edit-wb-content-input" style="width:100%;height:200px;padding:14px 16px;border:2px solid #e8e8e8;border-radius:12px;box-sizing:border-box;font-size:14px;resize:vertical;background:#fafafa;line-height:1.7;transition:all 0.3s;font-family:inherit;">${this.escapeHtml(wb.content)}</textarea>
                    </div>
                    
                    <div style="display:flex;gap:12px;justify-content:flex-end;">
                        <button onclick="document.getElementById('edit-worldbook-modal').remove();" style="padding:12px 28px;border:2px solid #e0e0e0;border-radius:12px;background:#fff;cursor:pointer;font-size:14px;color:#666;transition:all 0.3s;font-weight:600;" onmouseenter="this.style.background='#f8f8f8';this.style.borderColor='#ccc'" onmouseleave="this.style.background='#fff';this.style.borderColor='#e0e0e0'">取消</button>
                        <button onclick="window.WorldbookManager.saveEdit('${wbId}');" style="padding:12px 28px;border:none;border-radius:12px;background:linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);color:#fff;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.3s;box-shadow:0 4px 12px rgba(0,0,0,0.2);" onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.3)'" onmouseleave="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'">保存</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 添加输入框聚焦样式
            const inputs = modal.querySelectorAll('input[type="text"], textarea');
            inputs.forEach(input => {
                input.addEventListener('focus', function() {
                    this.style.borderColor = '#2c2c2c';
                    this.style.background = '#fff';
                    this.style.boxShadow = '0 0 0 3px rgba(44,44,44,0.1)';
                });
                input.addEventListener('blur', function() {
                    this.style.borderColor = '#e8e8e8';
                    this.style.background = '#fafafa';
                    this.style.boxShadow = 'none';
                });
            });
            
            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        },

        // 保存编辑
        saveEdit: function(wbId) {
            const wb = window.AppState.worldbooks.find(w => w.id === wbId);
            if (!wb) return;
            
            const name = document.getElementById('edit-wb-name-input').value.trim();
            const content = document.getElementById('edit-wb-content-input').value.trim();
            
            if (!name || !content) {
                this.showToast('名称和内容不能为空', 'warning');
                return;
            }
            
            wb.name = name;
            wb.content = content;
            
            window.saveToStorage();
            this.render();
            document.getElementById('edit-worldbook-modal').remove();
            this.showToast('世界书已更新', 'success');
        },

        // 删除世界书（现代化黑白灰确认框）
        delete: function(wbId) {
            const wb = window.AppState.worldbooks.find(w => w.id === wbId);
            if (!wb) return;
            
            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000000;backdrop-filter:blur(8px);animation:fadeIn 0.2s ease;';
            
            modal.innerHTML = `
                <div style="background:#fff;border-radius:20px;padding:28px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3), 0 0 1px rgba(0,0,0,0.1);animation:slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
                    <div style="width:56px;height:56px;margin:0 auto 20px;background:linear-gradient(135deg, #ff4444 0%, #cc0000 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(255,68,68,0.3);">
                        <svg viewBox="0 0 24 24" style="width:28px;height:28px;fill:none;stroke:#fff;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </div>
                    <h3 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#1a1a1a;text-align:center;letter-spacing:0.3px;">确认删除</h3>
                    <p style="margin:0 0 28px 0;font-size:15px;color:#666;line-height:1.7;text-align:center;">
                        确定要删除世界书<br>
                        <strong style="color:#1a1a1a;font-weight:600;font-size:16px;">「${this.escapeHtml(wb.name)}」</strong>吗？<br>
                        <span style="font-size:13px;color:#999;margin-top:8px;display:inline-block;">⚠️ 此操作无法撤销</span>
                    </p>
                    <div style="display:flex;gap:12px;">
                        <button onclick="this.closest('[style*=fixed]').remove();" style="flex:1;padding:12px 20px;border:2px solid #e0e0e0;border-radius:12px;background:#fff;cursor:pointer;font-size:14px;color:#666;transition:all 0.3s;font-weight:600;" onmouseenter="this.style.background='#f8f8f8';this.style.borderColor='#ccc'" onmouseleave="this.style.background='#fff';this.style.borderColor='#e0e0e0'">取消</button>
                        <button onclick="window.WorldbookManager.confirmDelete('${wbId}'); this.closest('[style*=fixed]').remove();" style="flex:1;padding:12px 20px;border:none;border-radius:12px;background:linear-gradient(135deg, #ff4444 0%, #cc0000 100%);color:#fff;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.3s;box-shadow:0 4px 12px rgba(255,68,68,0.3);" onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(255,68,68,0.4)'" onmouseleave="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(255,68,68,0.3)'">删除</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        },

        // 确认删除
        confirmDelete: function(wbId) {
            window.AppState.worldbooks = window.AppState.worldbooks.filter(w => w.id !== wbId);
            
            // 清除所有已绑定该世界书的角色
            window.AppState.conversations.forEach(conv => {
                if (conv.boundWorldbooks && Array.isArray(conv.boundWorldbooks)) {
                    conv.boundWorldbooks = conv.boundWorldbooks.filter(id => id !== wbId);
                }
            });
            
            window.saveToStorage();
            this.render();
            
            if (typeof window.updateCharacterWorldbookSelects === 'function') {
                window.updateCharacterWorldbookSelects();
            }
            
            this.showToast('世界书已删除', 'success');
        },

        // 渲染世界书列表（现代化黑白灰设计）
        render: function() {
            const globalContainer = document.getElementById('global-worldbooks-list');
            const localContainer = document.getElementById('local-worldbooks-list');
            
            if (!globalContainer || !localContainer) return;
            
            const globalWbs = window.AppState.worldbooks.filter(w => w.isGlobal);
            const localWbs = window.AppState.worldbooks.filter(w => !w.isGlobal);
            
            // 渲染全局世界书
            globalContainer.innerHTML = globalWbs.map(wb => `
                <div style="background:#fff;border-radius:16px;padding:18px;margin-bottom:12px;border:2px solid #e8e8e8;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);box-shadow:0 2px 8px rgba(0,0,0,0.04);position:relative;overflow:hidden;" onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)';this.style.borderColor='#2c2c2c';this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)';this.style.borderColor='#e8e8e8';this.style.transform='translateY(0)'">
                    <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:linear-gradient(180deg, #2c2c2c 0%, #666 100%);"></div>
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;padding-left:8px;">
                        <h4 style="margin:0;font-size:16px;font-weight:700;flex:1;color:#1a1a1a;letter-spacing:0.2px;">${this.escapeHtml(wb.name)}</h4>
                        <div style="display:flex;gap:6px;flex-shrink:0;">
                            <button onclick="window.WorldbookManager.edit('${wb.id}');" style="border:none;background:#f5f5f5;color:#666;cursor:pointer;font-size:13px;padding:6px 14px;border-radius:8px;transition:all 0.2s;font-weight:600;" onmouseenter="this.style.background='#2c2c2c';this.style.color='#fff'" onmouseleave="this.style.background='#f5f5f5';this.style.color='#666'">编辑</button>
                            <button onclick="window.WorldbookManager.delete('${wb.id}');" style="border:none;background:#fff;color:#ff4444;cursor:pointer;font-size:20px;padding:0;width:32px;height:32px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;border-radius:8px;border:2px solid #ffe8e8;" onmouseenter="this.style.background='#ff4444';this.style.color='#fff';this.style.borderColor='#ff4444'" onmouseleave="this.style.background='#fff';this.style.color='#ff4444';this.style.borderColor='#ffe8e8'">×</button>
                        </div>
                    </div>
                    <p style="margin:0 0 12px 8px;font-size:14px;color:#666;line-height:1.7;max-height:80px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${this.escapeHtml(wb.content)}</p>
                    <div style="font-size:12px;color:#999;margin-top:12px;padding:10px 12px 10px 20px;background:linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);border-radius:10px;display:flex;align-items:center;gap:12px;">
                        <span style="background:linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);color:#fff;padding:4px 12px;border-radius:12px;font-weight:600;font-size:11px;letter-spacing:0.3px;">🌍 全局</span>
                        <span style="color:#999;font-size:12px;">创建于 ${new Date(wb.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                </div>
            `).join('');
            
            // 渲染局部世界书
            localContainer.innerHTML = localWbs.map(wb => `
                <div style="background:#fff;border-radius:16px;padding:18px;margin-bottom:12px;border:2px solid #e8e8e8;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);box-shadow:0 2px 8px rgba(0,0,0,0.04);position:relative;overflow:hidden;" onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)';this.style.borderColor='#666';this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)';this.style.borderColor='#e8e8e8';this.style.transform='translateY(0)'">
                    <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:linear-gradient(180deg, #666 0%, #999 100%);"></div>
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;padding-left:8px;">
                        <h4 style="margin:0;font-size:16px;font-weight:700;flex:1;color:#1a1a1a;letter-spacing:0.2px;">${this.escapeHtml(wb.name)}</h4>
                        <div style="display:flex;gap:6px;flex-shrink:0;">
                            <button onclick="window.WorldbookManager.edit('${wb.id}');" style="border:none;background:#f5f5f5;color:#666;cursor:pointer;font-size:13px;padding:6px 14px;border-radius:8px;transition:all 0.2s;font-weight:600;" onmouseenter="this.style.background='#666';this.style.color='#fff'" onmouseleave="this.style.background='#f5f5f5';this.style.color='#666'">编辑</button>
                            <button onclick="window.WorldbookManager.delete('${wb.id}');" style="border:none;background:#fff;color:#ff4444;cursor:pointer;font-size:20px;padding:0;width:32px;height:32px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;border-radius:8px;border:2px solid #ffe8e8;" onmouseenter="this.style.background='#ff4444';this.style.color='#fff';this.style.borderColor='#ff4444'" onmouseleave="this.style.background='#fff';this.style.color='#ff4444';this.style.borderColor='#ffe8e8'">×</button>
                        </div>
                    </div>
                    <p style="margin:0 0 12px 8px;font-size:14px;color:#666;line-height:1.7;max-height:80px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${this.escapeHtml(wb.content)}</p>
                    <div style="font-size:12px;color:#999;margin-top:12px;padding:10px 12px 10px 20px;background:linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);border-radius:10px;display:flex;align-items:center;gap:12px;">
                        <span style="background:linear-gradient(135deg, #666 0%, #888 100%);color:#fff;padding:4px 12px;border-radius:12px;font-weight:600;font-size:11px;letter-spacing:0.3px;">📍 局部</span>
                        <span style="color:#999;font-size:12px;">创建于 ${new Date(wb.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                </div>
            `).join('');
            
            // 空状态已在HTML中定义，这里不需要再设置
            if (globalWbs.length === 0) {
                globalContainer.innerHTML = '<div style="text-align:center;color:#999;padding:48px 20px;background:#fff;border-radius:16px;font-size:14px;border:2px dashed #e8e8e8;"><div style="font-size: 48px; margin-bottom: 12px; opacity: 0.3;">📚</div><div style="font-weight: 500;">暂无全局世界书</div><div style="font-size: 12px; color: #bbb; margin-top: 8px;">点击上方按钮创建或导入</div></div>';
            }
            
            if (localWbs.length === 0) {
                localContainer.innerHTML = '<div style="text-align:center;color:#999;padding:48px 20px;background:#fff;border-radius:16px;font-size:14px;border:2px dashed #e8e8e8;"><div style="font-size: 48px; margin-bottom: 12px; opacity: 0.3;">📖</div><div style="font-weight: 500;">暂无局部世界书</div><div style="font-size: 12px; color: #bbb; margin-top: 8px;">点击上方按钮创建或导入</div></div>';
            }
        },

        // 工具函数：HTML转义
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        // 显示提示消息
        showToast: function(message, type = 'info') {
            if (typeof window.showToast === 'function') {
                window.showToast(message);
            } else {
                alert(message);
            }
        }
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.WorldbookManager.init();
        });
    } else {
        window.WorldbookManager.init();
    }
})();