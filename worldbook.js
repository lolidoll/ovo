// ===== 世界书管理系统 =====
// 独立的世界书管理模块，包含浅粉白主题和多格式导入功能

(function() {
    'use strict';

    // 世界书管理器命名空间
    window.WorldbookManager = {
        activeTab: 'global',

        // 初始化
        init: function() {
            this.bindEvents();
            this.switchTab(this.activeTab, { silent: true });
            console.log('世界书管理器已初始化');
        },

        // 绑定事件
        bindEvents: function() {
            const addBtn = document.getElementById('worldbook-add-btn');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.openAddDialog());
            }

            const backBtn = document.getElementById('worldbook-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => this.closePage());
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

            this.bindTabEvents();
        },

        // 打开新增世界书对话框（浅粉白主题）
        openAddDialog: function() {
            this.closeModal('add-worldbook-modal');

            const modal = document.createElement('div');
            modal.id = 'add-worldbook-modal';
            modal.className = 'worldbook-modal-mask';

            modal.innerHTML = `
                <div class="worldbook-modal-card">
                    <div class="worldbook-modal-header">
                        <h3 class="worldbook-modal-title">新建世界书</h3>
                        <button type="button" class="worldbook-modal-close" data-action="close">×</button>
                    </div>

                    <div class="worldbook-modal-body">
                        <div class="worldbook-field">
                            <label class="worldbook-field-label">世界书名称</label>
                            <input id="wb-name-input" class="worldbook-input" type="text" placeholder="例如：赛博朋克2077世界观">
                        </div>

                        <div class="worldbook-field">
                            <label class="worldbook-field-label">世界书内容</label>
                            <textarea id="wb-content-input" class="worldbook-textarea" placeholder="描述设定、背景、规则等&#10;&#10;支持使用占位符：&#10;{{char}} - 角色名称&#10;{{user}} - 用户名称"></textarea>
                            <div class="worldbook-field-hint">角色会在回复前读取这些内容</div>
                        </div>

                        <div class="worldbook-field">
                            <label class="worldbook-field-label">世界书类型</label>
                            <div class="worldbook-type-grid">
                                <label class="worldbook-type-option">
                                    <input name="wb-type" type="radio" value="local" checked>
                                    <span>局部</span>
                                </label>
                                <label class="worldbook-type-option">
                                    <input name="wb-type" type="radio" value="global">
                                    <span>全局</span>
                                </label>
                                <label class="worldbook-type-option">
                                    <input name="wb-type" type="radio" value="offline">
                                    <span>线下</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="worldbook-modal-footer">
                        <button type="button" class="worldbook-btn" data-action="cancel">取消</button>
                        <button type="button" class="worldbook-btn primary" data-action="save">创建</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const close = () => this.closeModal('add-worldbook-modal');
            const closeBtn = modal.querySelector('[data-action="close"]');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');
            const saveBtn = modal.querySelector('[data-action="save"]');

            if (closeBtn) closeBtn.addEventListener('click', close);
            if (cancelBtn) cancelBtn.addEventListener('click', close);
            if (saveBtn) saveBtn.addEventListener('click', () => this.saveNew());

            this.bindBackdropClose(modal);

            const nameInput = document.getElementById('wb-name-input');
            if (nameInput) {
                setTimeout(() => nameInput.focus(), 60);
            }
        },

        // 保存新建的世界书
        saveNew: function() {
            const name = document.getElementById('wb-name-input').value.trim();
            const content = document.getElementById('wb-content-input').value.trim();
            const typeRadio = document.querySelector('input[name="wb-type"]:checked');
            const type = typeRadio ? typeRadio.value : 'local';
            
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
                isGlobal: type === 'global',
                isOffline: type === 'offline',
                createdAt: new Date().toISOString()
            };
            
            this.ensureWorldbookStore().push(worldbook);
            window.saveToStorage();
            this.render();
            this.switchTab(type, { silent: true });
            
            if (typeof window.updateCharacterWorldbookSelects === 'function') {
                window.updateCharacterWorldbookSelects();
            }
            
            this.closeModal('add-worldbook-modal');
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

        // 解析JSON文件（支持SillyTavern格式和多种编码）
        parseJSONFile: function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        let text = '';
                        
                        // 尝试多种编码解码JSON
                        const decoders = [
                            new TextDecoder('utf-8'),
                            new TextDecoder('gbk'),
                            new TextDecoder('gb2312'),
                            new TextDecoder('utf-16le'),
                            new TextDecoder('utf-16be')
                        ];
                        
                        for (const decoder of decoders) {
                            try {
                                text = decoder.decode(arrayBuffer);
                                // 尝试解析JSON验证是否有效
                                JSON.parse(text);
                                break; // 成功解析，跳出循环
                            } catch (err) {
                                continue; // 尝试下一个编码
                            }
                        }
                        
                        if (!text) {
                            reject(new Error('无法解析JSON文件，可能编码不支持'));
                            return;
                        }
                        
                        const data = JSON.parse(text);
                        const worldbooks = [];

                        // 处理不同格式的JSON
                        if (Array.isArray(data)) {
                            // 数组格式
                            worldbooks.push(...data.map(wb => ({
                                name: wb.name || wb.title || '未命名世界书',
                                content: wb.content || wb.data || wb.description || '',
                                isGlobal: wb.isGlobal || wb.global || false
                            })));
                        } else if (data.entries && typeof data.entries === 'object') {
                            // SillyTavern世界书格式（包括带spec和不带spec的）
                            // entries 可能是对象 {"0": {...}, "1": {...}} 或数组
                            const entries = data.entries;
                            const entriesArray = Array.isArray(entries) 
                                ? entries 
                                : Object.values(entries);

                            // 按displayIndex或uid排序
                            entriesArray.sort((a, b) => {
                                const aIndex = a.displayIndex ?? a.uid ?? 0;
                                const bIndex = b.displayIndex ?? b.uid ?? 0;
                                return aIndex - bIndex;
                            });

                            const content = entriesArray.map(e => {
                                // 提取关键词
                                const keys = Array.isArray(e.key) ? e.key.filter(k => k).join(', ') : '';
                                const keysecondary = Array.isArray(e.keysecondary) && e.keysecondary.length > 0 
                                    ? e.keysecondary.filter(k => k).join(', ') 
                                    : '';
                                
                                // 提取注释
                                const comment = e.comment || '';
                                
                                // 提取内容
                                const entryContent = e.content || e.text || '';
                                
                                // 组合格式
                                let entryText = '';
                                if (comment) {
                                    entryText += `# ${comment}\n\n`;
                                }
                                if (keys) {
                                    entryText += `**关键词**: ${keys}\n`;
                                    if (keysecondary) {
                                        entryText += `**次要关键词**: ${keysecondary}\n`;
                                    }
                                    entryText += '\n';
                                }
                                entryText += entryContent;
                                
                                return entryText;
                            }).join('\n\n---\n\n');

                            // 使用文件名或data中的name作为世界书名称
                            const worldbookName = data.name || file.name.replace(/\.json$/i, '');

                            worldbooks.push({
                                name: worldbookName,
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
                reader.readAsArrayBuffer(file);
            });
        },

        // 解析TXT文件（支持UTF-8、GBK、GB2312等编码自动检测）
        parseTXTFile: function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        let content = '';
                        
                        // 按优先级尝试各种编码
                        const encodings = ['utf-8', 'gbk', 'gb2312', 'big5', 'utf-16le', 'utf-16be'];
                        let bestContent = '';
                        let bestScore = -1;
                        
                        for (const encoding of encodings) {
                            try {
                                const decoder = new TextDecoder(encoding, { fatal: false });
                                const decoded = decoder.decode(arrayBuffer);
                                
                                // 检测解码质量：计算中文字符比例
                                const chineseCharCount = (decoded.match(/[\u4e00-\u9fa5]/g) || []).length;
                                const totalChars = decoded.length;
                                const chineseRatio = totalChars > 0 ? chineseCharCount / totalChars : 0;
                                
                                // 检查是否包含乱码字符（替换字符）
                                const hasReplacementChars = decoded.includes('\uFFFD');
                                
                                // 计算得分：中文比例高且无替换字符的编码优先
                                let score = chineseRatio;
                                if (!hasReplacementChars) score += 0.5;
                                if (encoding === 'utf-8') score += 0.1; // UTF-8 优先
                                
                                if (score > bestScore) {
                                    bestScore = score;
                                    bestContent = decoded;
                                }
                            } catch (encodingError) {
                                // 该编码失败，继续尝试下一个
                                continue;
                            }
                        }
                        
                        content = bestContent.trim();
                        
                        if (content && content.length > 0) {
                            resolve({
                                name: file.name.replace(/\.txt$/i, ''),
                                content: content,
                                isGlobal: false
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
        },

        // 解析DOC/DOCX文件
        parseDOCFile: function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        
                        // 检查文件扩展名
                        const isDocx = file.name.toLowerCase().endsWith('.docx');
                        const isDoc = file.name.toLowerCase().endsWith('.doc');
                        
                        if (isDocx) {
                            // DOCX 文件需要 mammoth.js 库
                            if (typeof mammoth !== 'undefined') {
                                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                                const content = result.value.trim();
                                if (content) {
                                    resolve({
                                        name: file.name.replace(/\.docx$/i, ''),
                                        content: content,
                                        isGlobal: false
                                    });
                                } else {
                                    resolve(null);
                                }
                            } else {
                                // 尝试使用 JSZip 解析 DOCX（它是 ZIP 格式）
                                if (typeof JSZip !== 'undefined') {
                                    try {
                                        const zip = await JSZip.loadAsync(arrayBuffer);
                                        const documentXml = await zip.file('word/document.xml').async('string');
                                        // 提取文本内容
                                        const textContent = documentXml
                                            .replace(/<w:t[^>]*>/g, '')
                                            .replace(/<\/w:t>/g, '')
                                            .replace(/<[^>]+>/g, '')
                                            .trim();
                                        
                                        if (textContent) {
                                            resolve({
                                                name: file.name.replace(/\.docx$/i, ''),
                                                content: textContent,
                                                isGlobal: false
                                            });
                                        } else {
                                            resolve(null);
                                        }
                                    } catch (zipError) {
                                        reject(new Error('无法解析DOCX文件。请在index.html中添加mammoth.js库以获得完整支持：\n<script src="https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js"><\/script>'));
                                    }
                                } else {
                                    reject(new Error('无法解析DOCX文件。请在index.html中添加mammoth.js库：\n<script src="https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js"><\/script>'));
                                }
                            }
                        } else if (isDoc) {
                            // 旧版 DOC 文件（二进制格式），尝试多种编码
                            let text = '';
                            const decoders = [
                                new TextDecoder('gbk'),
                                new TextDecoder('gb2312'),
                                new TextDecoder('utf-8'),
                                new TextDecoder('utf-16le')
                            ];
                            
                            for (const decoder of decoders) {
                                try {
                                    const decoded = decoder.decode(arrayBuffer);
                                    const chineseCount = (decoded.match(/[\u4e00-\u9fa5]/g) || []).length;
                                    if (chineseCount > 10) {
                                        text = decoded;
                                        break;
                                    }
                                } catch (err) {
                                    continue;
                                }
                            }
                            
                            // 清理文本
                            const content = text.replace(/[^\x20-\x7E\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef\n\r\t]/g, '').trim();
                            
                            if (content.length > 50) {
                                resolve({
                                    name: file.name.replace(/\.doc$/i, ''),
                                    content: content,
                                    isGlobal: false
                                });
                            } else {
                                reject(new Error('DOC文件解析失败。建议将文档转换为DOCX或TXT格式后再导入。'));
                            }
                        } else {
                            reject(new Error('不支持的文件格式'));
                        }
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
        },

        // 显示导入选择对话框（浅粉白主题）
        showImportDialog: function(worldbooks, fileName) {
            this.closeModal('wb-import-dialog-modal');

            const modal = document.createElement('div');
            modal.id = 'wb-import-dialog-modal';
            modal.className = 'worldbook-modal-mask';

            const wbList = worldbooks.map((wb, idx) => `
                <div class="worldbook-import-item">
                    <div class="worldbook-import-head">
                        <input type="radio" name="wb-import-type" id="wb-type-${idx}" value="${idx}" ${idx === 0 ? 'checked' : ''}>
                        <label for="wb-type-${idx}" class="worldbook-import-name" title="${this.escapeHtml(wb.name || '未命名世界书')}">${this.escapeHtml(wb.name || '未命名世界书')}</label>
                    </div>
                    <div class="worldbook-scope-options">
                        <label class="worldbook-scope-option">
                            <input type="radio" name="wb-import-scope-${idx}" value="global">
                            <span>全局世界书（所有角色可用）</span>
                        </label>
                        <label class="worldbook-scope-option">
                            <input type="radio" name="wb-import-scope-${idx}" value="local" checked>
                            <span>局部世界书（需绑定到角色）</span>
                        </label>
                        <label class="worldbook-scope-option">
                            <input type="radio" name="wb-import-scope-${idx}" value="offline">
                            <span>线下世界书（仅本地使用）</span>
                        </label>
                    </div>
                </div>
            `).join('');

            window.pendingWorldbookImport = worldbooks;

            modal.innerHTML = `
                <div class="worldbook-modal-card">
                    <div class="worldbook-modal-header">
                        <h3 class="worldbook-modal-title">选择导入的世界书</h3>
                        <button type="button" class="worldbook-modal-close" data-action="close">×</button>
                    </div>

                    <div class="worldbook-modal-body">
                        <div class="worldbook-import-fileinfo">📁 文件：${this.escapeHtml(fileName)}</div>
                        <div class="worldbook-import-list">
                            ${wbList}
                        </div>
                    </div>

                    <div class="worldbook-modal-footer">
                        <button type="button" class="worldbook-btn" data-action="cancel">取消</button>
                        <button type="button" class="worldbook-btn primary" data-action="import">导入</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const close = () => this.closeModal('wb-import-dialog-modal');
            const closeBtn = modal.querySelector('[data-action="close"]');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');
            const importBtn = modal.querySelector('[data-action="import"]');

            if (closeBtn) closeBtn.addEventListener('click', close);
            if (cancelBtn) cancelBtn.addEventListener('click', close);
            if (importBtn) importBtn.addEventListener('click', () => this.confirmImport());

            this.bindBackdropClose(modal);
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
            
            const selectedIdx = Number.parseInt(selectedRadio.value, 10);
            if (Number.isNaN(selectedIdx)) {
                this.showToast('导入选项无效，请重试', 'warning');
                return;
            }
            const selectedWb = window.pendingWorldbookImport[selectedIdx];
            const scopeRadio = document.querySelector(`input[name="wb-import-scope-${selectedIdx}"]:checked`);
            const scope = scopeRadio ? scopeRadio.value : 'local';
            
            if (!selectedWb || !selectedWb.content || !selectedWb.content.trim()) {
                this.showToast('世界书内容为空', 'warning');
                return;
            }
            
            const newWb = {
                id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: selectedWb.name || '导入的世界书',
                content: selectedWb.content,
                isGlobal: scope === 'global',
                isOffline: scope === 'offline',
                createdAt: new Date().toISOString()
            };
            
            this.ensureWorldbookStore().push(newWb);
            window.saveToStorage();
            this.closeModal('wb-import-dialog-modal');
            this.showToast(`世界书"${newWb.name}"导入成功`, 'success');
            this.render();
            this.switchTab(scope, { silent: true });
            
            if (typeof window.loadWorldbookUI === 'function') {
                window.loadWorldbookUI();
            }
            
            window.pendingWorldbookImport = null;
        },

        // 编辑世界书（浅粉白主题）
        edit: function(wbId) {
            const wb = this.ensureWorldbookStore().find(w => w.id === wbId);
            if (!wb) return;
            
            this.closeModal('edit-worldbook-modal');

            const modal = document.createElement('div');
            modal.id = 'edit-worldbook-modal';
            modal.className = 'worldbook-modal-mask';
            
            modal.innerHTML = `
                <div class="worldbook-modal-card">
                    <div class="worldbook-modal-header">
                        <h3 class="worldbook-modal-title">编辑世界书</h3>
                        <button type="button" class="worldbook-modal-close" data-action="close">×</button>
                    </div>

                    <div class="worldbook-modal-body">
                        <div class="worldbook-field">
                            <label class="worldbook-field-label">世界书名称</label>
                            <input id="edit-wb-name-input" class="worldbook-input" type="text" value="${this.escapeHtml(wb.name)}">
                        </div>

                        <div class="worldbook-field">
                            <label class="worldbook-field-label">世界书内容</label>
                            <textarea id="edit-wb-content-input" class="worldbook-textarea">${this.escapeHtml(wb.content)}</textarea>
                        </div>
                    </div>

                    <div class="worldbook-modal-footer">
                        <button type="button" class="worldbook-btn" data-action="cancel">取消</button>
                        <button type="button" class="worldbook-btn primary" data-action="save">保存</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);

            const close = () => this.closeModal('edit-worldbook-modal');
            const closeBtn = modal.querySelector('[data-action="close"]');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');
            const saveBtn = modal.querySelector('[data-action="save"]');

            if (closeBtn) closeBtn.addEventListener('click', close);
            if (cancelBtn) cancelBtn.addEventListener('click', close);
            if (saveBtn) saveBtn.addEventListener('click', () => this.saveEdit(wbId));

            this.bindBackdropClose(modal);
        },

        // 保存编辑
        saveEdit: function(wbId) {
            const wb = this.ensureWorldbookStore().find(w => w.id === wbId);
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

            if (typeof window.updateCharacterWorldbookSelects === 'function') {
                window.updateCharacterWorldbookSelects();
            }

            this.closeModal('edit-worldbook-modal');
            this.showToast('世界书已更新', 'success');
        },

        // 快速更改类别（移动到其他Tab）
        openCategoryDialog: function(wbId) {
            const wb = this.ensureWorldbookStore().find(w => w.id === wbId);
            if (!wb) return;

            const currentType = this.getWorldbookType(wb);
            const targetTypes = ['global', 'local', 'offline'].filter(type => type !== currentType);
            if (targetTypes.length === 0) {
                this.showToast('没有可移动的类别', 'warning');
                return;
            }

            const optionsHTML = targetTypes.map((type, index) => `
                <label class="worldbook-type-option">
                    <input name="change-wb-type" type="radio" value="${type}" ${index === 0 ? 'checked' : ''}>
                    <span>${this.getTabLabel(type)}</span>
                </label>
            `).join('');

            this.closeModal('worldbook-category-modal');

            const modal = document.createElement('div');
            modal.id = 'worldbook-category-modal';
            modal.className = 'worldbook-modal-mask';

            modal.innerHTML = `
                <div class="worldbook-modal-card compact">
                    <div class="worldbook-modal-header">
                        <h3 class="worldbook-modal-title">移动世界书</h3>
                        <button type="button" class="worldbook-modal-close" data-action="close">×</button>
                    </div>

                    <div class="worldbook-modal-body">
                        <div class="worldbook-field" style="margin-bottom:0;">
                            <div class="worldbook-type-grid move-grid">
                                ${optionsHTML}
                            </div>
                        </div>
                    </div>

                    <div class="worldbook-modal-footer">
                        <button type="button" class="worldbook-btn" data-action="cancel">取消</button>
                        <button type="button" class="worldbook-btn primary" data-action="apply">移动</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const close = () => this.closeModal('worldbook-category-modal');
            const closeBtn = modal.querySelector('[data-action="close"]');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');
            const applyBtn = modal.querySelector('[data-action="apply"]');

            if (closeBtn) closeBtn.addEventListener('click', close);
            if (cancelBtn) cancelBtn.addEventListener('click', close);
            if (applyBtn) {
                applyBtn.addEventListener('click', () => {
                    const selected = modal.querySelector('input[name="change-wb-type"]:checked');
                    if (!selected) {
                        this.showToast('请选择目标类别', 'warning');
                        return;
                    }
                    const nextType = this.normalizeTab(selected ? selected.value : currentType);
                    this.applyCategoryChange(wbId, nextType);
                    close();
                });
            }

            this.bindBackdropClose(modal);
        },

        applyCategoryChange: function(wbId, nextType) {
            const wb = this.ensureWorldbookStore().find(w => w.id === wbId);
            if (!wb) return;

            const targetType = this.normalizeTab(nextType);
            const currentType = this.getWorldbookType(wb);

            if (currentType === targetType) {
                this.showToast('已在该类别，无需移动', 'info');
                return;
            }

            this.setWorldbookType(wb, targetType);
            window.saveToStorage();
            this.render();
            this.switchTab(targetType, { silent: true });

            if (typeof window.updateCharacterWorldbookSelects === 'function') {
                window.updateCharacterWorldbookSelects();
            }

            this.showToast(`已移动到${this.getTabLabel(targetType)}`, 'success');
        },

        // 删除世界书（浅粉白主题确认框）
        delete: function(wbId) {
            const wb = this.ensureWorldbookStore().find(w => w.id === wbId);
            if (!wb) return;
            
            this.closeModal('delete-worldbook-modal');

            const modal = document.createElement('div');
            modal.id = 'delete-worldbook-modal';
            modal.className = 'worldbook-modal-mask';
            
            modal.innerHTML = `
                <div class="worldbook-modal-card compact">
                    <div class="worldbook-modal-body">
                        <div class="worldbook-delete-icon">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </div>

                        <h3 class="worldbook-delete-title">确认删除</h3>
                        <p class="worldbook-delete-text">
                            确定要删除世界书<br>
                            <strong>「${this.escapeHtml(wb.name)}」</strong>吗？<br>
                            <span>⚠️ 此操作无法撤销</span>
                        </p>
                    </div>

                    <div class="worldbook-modal-footer">
                        <button type="button" class="worldbook-btn" data-action="cancel">取消</button>
                        <button type="button" class="worldbook-btn danger" data-action="delete">删除</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);

            const cancelBtn = modal.querySelector('[data-action="cancel"]');
            const deleteBtn = modal.querySelector('[data-action="delete"]');

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.closeModal('delete-worldbook-modal'));
            }

            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.confirmDelete(wbId);
                    this.closeModal('delete-worldbook-modal');
                });
            }

            this.bindBackdropClose(modal);
        },

        // 确认删除
        confirmDelete: function(wbId) {
            const worldbooks = this.ensureWorldbookStore();
            window.AppState.worldbooks = worldbooks.filter(w => w.id !== wbId);
            
            // 清除所有已绑定该世界书的角色
            (window.AppState.conversations || []).forEach(conv => {
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

        // 渲染世界书列表（浅粉白主题）
        render: function() {
            const globalContainer = document.getElementById('global-worldbooks-list');
            const localContainer = document.getElementById('local-worldbooks-list');
            const offlineContainer = document.getElementById('offline-worldbooks-list');

            if (!globalContainer || !localContainer) return;

            const worldbooks = this.ensureWorldbookStore();
            const globalWbs = worldbooks.filter(w => w.isGlobal && !w.isOffline);
            const localWbs = worldbooks.filter(w => !w.isGlobal && !w.isOffline);
            const offlineWbs = worldbooks.filter(w => w.isOffline);

            globalContainer.innerHTML = globalWbs.length > 0
                ? globalWbs.map(wb => this.renderWorldbookItem(wb, 'global')).join('')
                : this.renderEmptyState('📚', '暂无全局世界书', '点击上方按钮创建或导入');

            localContainer.innerHTML = localWbs.length > 0
                ? localWbs.map(wb => this.renderWorldbookItem(wb, 'local')).join('')
                : this.renderEmptyState('📖', '暂无局部世界书', '点击上方按钮创建或导入');

            if (offlineContainer) {
                offlineContainer.innerHTML = offlineWbs.length > 0
                    ? offlineWbs.map(wb => this.renderWorldbookItem(wb, 'offline')).join('')
                    : this.renderEmptyState('📕', '暂无线下世界书', '点击上方按钮创建或导入');
            }

            this.switchTab(this.activeTab, { silent: true });
        },

        closePage: function() {
            if (typeof window.closeSubPage === 'function') {
                window.closeSubPage('worldbook-page');
                return;
            }

            const page = document.getElementById('worldbook-page');
            if (page) {
                page.classList.remove('open');
            }

            const tabBar = document.getElementById('tab-bar');
            if (tabBar) {
                tabBar.style.visibility = '';
                tabBar.style.pointerEvents = '';
            }
        },

        bindTabEvents: function() {
            const tabButtons = document.querySelectorAll('#worldbook-page .worldbook-tab-btn');
            tabButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    this.switchTab(button.dataset.worldbookTab || 'global');
                });
            });
        },

        switchTab: function(tabKey, options = {}) {
            const nextTab = this.normalizeTab(tabKey);
            this.activeTab = nextTab;

            const page = document.getElementById('worldbook-page');
            if (!page) return;

            page.querySelectorAll('.worldbook-tab-btn').forEach((button) => {
                const active = (button.dataset.worldbookTab || '') === nextTab;
                button.classList.toggle('active', active);
                button.setAttribute('aria-selected', active ? 'true' : 'false');
            });

            page.querySelectorAll('.worldbook-tab-panel').forEach((panel) => {
                const active = (panel.dataset.worldbookPanel || '') === nextTab;
                panel.classList.toggle('active', active);
            });

            if (options && !options.silent && options.toast) {
                this.showToast(options.toast, 'success');
            }
        },

        normalizeTab: function(tabKey) {
            return ['global', 'local', 'offline'].includes(tabKey) ? tabKey : 'global';
        },

        getTabLabel: function(tabKey) {
            const type = this.normalizeTab(tabKey);
            if (type === 'global') return '全局';
            if (type === 'offline') return '线下';
            return '局部';
        },

        getWorldbookType: function(wb) {
            if (!wb) return 'local';
            if (wb.isOffline) return 'offline';
            if (wb.isGlobal) return 'global';
            return 'local';
        },

        setWorldbookType: function(wb, type) {
            if (!wb) return;
            const normalized = this.normalizeTab(type);
            wb.isGlobal = normalized === 'global';
            wb.isOffline = normalized === 'offline';
        },

        ensureWorldbookStore: function() {
            if (!window.AppState) {
                window.AppState = {};
            }
            if (!Array.isArray(window.AppState.worldbooks)) {
                window.AppState.worldbooks = [];
            }
            return window.AppState.worldbooks;
        },

        closeModal: function(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.remove();
            }
        },

        bindBackdropClose: function(modal) {
            if (!modal) return;
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.remove();
                }
            });
        },

        renderWorldbookItem: function(wb, typeClass) {
            return `
                <div class="worldbook-item ${typeClass}">
                    <div class="worldbook-item-head">
                        <h4 class="worldbook-item-title" title="${this.escapeHtml(wb.name || '未命名世界书')}">${this.escapeHtml(wb.name || '未命名世界书')}</h4>
                        <div class="worldbook-item-actions">
                            <button class="worldbook-item-btn" onclick="window.WorldbookManager.edit('${wb.id}');">修改</button>
                            <button class="worldbook-item-btn" onclick="window.WorldbookManager.openCategoryDialog('${wb.id}');">移动</button>
                            <button class="worldbook-item-btn delete" onclick="window.WorldbookManager.delete('${wb.id}');">删除</button>
                        </div>
                    </div>
                    <p class="worldbook-item-content">${this.escapeHtml(wb.content || '')}</p>
                </div>
            `;
        },

        renderEmptyState: function(icon, title, description) {
            return `
                <div class="worldbook-empty">
                    <div class="worldbook-empty-icon">${icon}</div>
                    <div class="worldbook-empty-title">${title}</div>
                    <div class="worldbook-empty-desc">${description}</div>
                </div>
            `;
        },

        // 工具函数：HTML转义
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        },
        
        // 获取线下世界书内容（供线下功能使用）
        getOfflineWorldbooksContent: function() {
            const offlineWbs = this.ensureWorldbookStore().filter(w => w.isOffline);
            return offlineWbs.map(wb => wb.content).join('\n\n');
        },

        // 显示提示消息
        showToast: function(message, type = 'info') {
            if (typeof window.showToast === 'function') {
                window.showToast(message);
            } else {
                const oldToast = document.getElementById('worldbook-toast');
                if (oldToast) oldToast.remove();

                const toast = document.createElement('div');
                toast.id = 'worldbook-toast';
                toast.style.cssText = `
                    position: fixed;
                    bottom: 72px;
                    left: 50%;
                    transform: translateX(-50%) translateY(24px) scale(0.92);
                    opacity: 0;
                    background: linear-gradient(145deg, rgba(255, 251, 254, 0.98) 0%, rgba(255, 234, 245, 0.96) 100%);
                    color: #8f4b67;
                    padding: 12px 22px;
                    border-radius: 999px;
                    font-size: 14px;
                    font-weight: 600;
                    letter-spacing: 0.2px;
                    border: 1px solid rgba(255, 194, 220, 0.9);
                    box-shadow: 0 10px 28px rgba(255, 154, 196, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    z-index: 2147483000;
                    max-width: min(82vw, 360px);
                    text-align: center;
                    line-height: 1.45;
                    word-break: break-word;
                    pointer-events: none;
                    transition: opacity 0.28s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
                `;
                toast.textContent = message;
                document.body.appendChild(toast);

                requestAnimationFrame(() => {
                    toast.style.opacity = '1';
                    toast.style.transform = 'translateX(-50%) translateY(0) scale(1)';
                });

                setTimeout(() => {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(-50%) translateY(24px) scale(0.92)';
                    setTimeout(() => toast.remove(), 280);
                }, 2000);
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
