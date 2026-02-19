/**
 * group-chat.js - 群聊功能模块
 * 负责：创建群聊（多成员选择）、群聊消息渲染、群聊聊天页面适配
 */
(function() {
    'use strict';

    // ===== 创建群聊页面逻辑 =====
    let selectedFriendIds = [];
    let customMembers = [];

    function openCreateGroupPage() {
        selectedFriendIds = [];
        customMembers = [];
        const page = document.getElementById('create-group-page');
        if (!page) return;

        // 清空表单
        const nameInput = document.getElementById('group-name-input');
        const avatarInput = document.getElementById('group-avatar-input');
        const descInput = document.getElementById('group-desc-input');
        const avatarFileInput = document.getElementById('cg-avatar-file-input');
        if (nameInput) nameInput.value = '';
        if (avatarInput) { avatarInput.value = ''; avatarInput.style.display = 'none'; }
        if (descInput) descInput.value = '';
        if (avatarFileInput) avatarFileInput.value = '';

        // 重置头像预览
        const avatarPicker = document.getElementById('cg-avatar-picker');
        if (avatarPicker) {
            avatarPicker.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"><path d="M23 19V5a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2z"/><circle cx="12" cy="13" r="4"/></svg>';
        }
        // 重置头像标签
        const avatarLabel = avatarPicker && avatarPicker.closest('.avatar-wrapper') && avatarPicker.closest('.avatar-wrapper').querySelector('.avatar-label');
        if (avatarLabel) avatarLabel.textContent = '点击上传头像';

        renderFriendSelection();
        renderSelectedBar();
        renderCustomMembers();
        page.classList.add('open');
    }

    function closeCreateGroupPage() {
        const page = document.getElementById('create-group-page');
        if (page) page.classList.remove('open');
    }

    // 渲染好友选择列表
    function renderFriendSelection() {
        const container = document.getElementById('cg-friend-list');
        if (!container) return;

        const friends = (window.AppState && AppState.friends) || [];
        if (friends.length === 0) {
            container.innerHTML = '<div class="cg-friend-empty">暂无好友，可以在下方添加自定义角色</div>';
            return;
        }

        container.innerHTML = friends.map(function(f) {
            const isSelected = selectedFriendIds.includes(f.id);
            const avatarHtml = f.avatar
                ? '<img src="' + f.avatar + '" alt="">'
                : (f.name ? f.name.charAt(0) : '?');
            return '<div class="cg-friend-item' + (isSelected ? ' selected' : '') + '" data-friend-id="' + f.id + '">' +
                '<div class="cg-friend-check"></div>' +
                '<div class="cg-friend-avatar">' + avatarHtml + '</div>' +
                '<div class="cg-friend-name">' + (f.remark || f.name) + '</div>' +
                '</div>';
        }).join('');

        // 绑定点击事件
        container.querySelectorAll('.cg-friend-item').forEach(function(item) {
            item.addEventListener('click', function() {
                const fid = this.dataset.friendId;
                const idx = selectedFriendIds.indexOf(fid);
                if (idx >= 0) {
                    selectedFriendIds.splice(idx, 1);
                    this.classList.remove('selected');
                } else {
                    selectedFriendIds.push(fid);
                    this.classList.add('selected');
                }
                updateMemberCount();
                renderSelectedBar();
            });
        });
    }

    // 更新已选人数
    function updateMemberCount() {
        const el = document.getElementById('cg-member-count');
        const total = selectedFriendIds.length + customMembers.length;
        if (el) el.textContent = '(已选 ' + total + ' 人)';
    }

    // 渲染已选成员预览条
    function renderSelectedBar() {
        const bar = document.getElementById('cg-selected-bar');
        const container = document.getElementById('cg-selected-avatars');
        if (!bar || !container) return;

        const friends = (window.AppState && AppState.friends) || [];
        const selectedFriends = friends.filter(function(f) { return selectedFriendIds.includes(f.id); });
        const allSelected = selectedFriends.concat(customMembers);

        if (allSelected.length === 0) {
            bar.style.display = 'none';
            return;
        }
        bar.style.display = 'block';

        container.innerHTML = allSelected.map(function(m) {
            const avatarHtml = m.avatar
                ? '<img src="' + m.avatar + '" alt="">'
                : (m.name ? m.name.charAt(0) : '?');
            return '<div class="cg-selected-tag">' +
                '<div class="cg-selected-tag-avatar">' + avatarHtml + '</div>' +
                '<span>' + (m.remark || m.name) + '</span>' +
                '</div>';
        }).join('');
    }

    // 渲染自定义角色列表
    function renderCustomMembers() {
        const container = document.getElementById('cg-custom-members');
        if (!container) return;

        container.innerHTML = customMembers.map(function(m, i) {
            const avatarHtml = m.avatar
                ? '<img src="' + m.avatar + '" alt="">'
                : (m.name ? m.name.charAt(0) : '?');
            return '<div class="cg-custom-card" data-index="' + i + '">' +
                '<div class="cg-custom-card-avatar">' + avatarHtml + '</div>' +
                '<div class="cg-custom-card-info">' +
                    '<div class="cg-custom-card-name">' + m.name + '</div>' +
                    '<div class="cg-custom-card-desc">' + (m.description || '无设定') + '</div>' +
                '</div>' +
                '<button class="cg-custom-card-remove" data-index="' + i + '">×</button>' +
                '</div>';
        }).join('');

        // 绑定删除
        container.querySelectorAll('.cg-custom-card-remove').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(this.dataset.index);
                customMembers.splice(idx, 1);
                renderCustomMembers();
                updateMemberCount();
                renderSelectedBar();
            });
        });
    }

    // 打开自定义角色弹窗
    function openCustomMemberModal() {
        const modal = document.getElementById('cg-custom-modal');
        if (!modal) return;
        // 清空
        var nameInput = document.getElementById('cg-custom-name');
        var avatarInput = document.getElementById('cg-custom-avatar-url');
        var descInput = document.getElementById('cg-custom-desc');
        var preview = document.getElementById('cg-custom-avatar-preview');
        if (nameInput) nameInput.value = '';
        if (avatarInput) avatarInput.value = '';
        if (descInput) descInput.value = '';
        if (preview) preview.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#999" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        modal.style.display = 'flex';
    }

    function closeCustomMemberModal() {
        var modal = document.getElementById('cg-custom-modal');
        if (modal) modal.style.display = 'none';
    }

    function confirmCustomMember() {
        var name = document.getElementById('cg-custom-name').value.trim();
        var avatar = document.getElementById('cg-custom-avatar-url').value.trim();
        var desc = document.getElementById('cg-custom-desc').value.trim();

        if (!name) {
            if (typeof showToast === 'function') showToast('请输入角色名称');
            return;
        }

        customMembers.push({
            id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name: name,
            avatar: avatar,
            description: desc,
            isCustom: true
        });

        closeCustomMemberModal();
        renderCustomMembers();
        updateMemberCount();
        renderSelectedBar();
    }

    // 提交创建群聊
    function submitCreateGroup() {
        var name = document.getElementById('group-name-input').value.trim();
        var avatar = document.getElementById('group-avatar-input').value.trim();
        var announcement = document.getElementById('group-desc-input').value.trim();

        if (!name) {
            if (typeof showToast === 'function') showToast('请输入群聊名称');
            return;
        }

        var friends = (window.AppState && AppState.friends) || [];
        var selectedFriends = friends.filter(function(f) { return selectedFriendIds.includes(f.id); });
        var allMembers = [];

        // 添加选中的好友作为成员
        selectedFriends.forEach(function(f) {
            allMembers.push({
                id: f.id,
                name: f.name,
                avatar: f.avatar || '',
                description: f.description || '',
                isCustom: false
            });
        });

        // 添加自定义角色
        customMembers.forEach(function(m) {
            allMembers.push({
                id: m.id,
                name: m.name,
                avatar: m.avatar || '',
                description: m.description || '',
                isCustom: true
            });
        });

        if (allMembers.length === 0) {
            if (typeof showToast === 'function') showToast('请至少选择或添加一个群成员');
            return;
        }

        var group = {
            id: 'group_' + Date.now(),
            name: name,
            avatar: avatar,
            announcement: announcement,
            memberCount: allMembers.length,
            members: allMembers,
            createdAt: new Date().toISOString()
        };

        AppState.groups.push(group);
        if (typeof saveToStorage === 'function') saveToStorage();
        if (typeof renderGroups === 'function') renderGroups();
        closeCreateGroupPage();

        // 自动打开群聊
        if (typeof openChatWithGroup === 'function') {
            openChatWithGroup(group);
        }
    }

    // ===== 群聊聊天页面适配 =====

    // 进入群聊时调整UI
    function applyGroupChatMode(conv) {
        var chatPage = document.getElementById('chat-page');
        if (!chatPage) return;

        if (conv && conv.type === 'group') {
            chatPage.classList.add('group-chat-mode');

            // 更新标题显示成员数（放在群名称后面同一行）
            var group = AppState.groups.find(function(g) { return g.id === conv.id; });
            var memberCount = group ? group.members.length + 1 : 1; // +1 把用户自己算上
            var chatTitle = document.getElementById('chat-title');
            if (chatTitle) {
                var displayName = conv.remark || conv.name;
                if (memberCount > 0) {
                    chatTitle.textContent = displayName + '(' + memberCount + ')';
                } else {
                    chatTitle.textContent = displayName;
                }
            }
        } else {
            chatPage.classList.remove('group-chat-mode');
        }
    }

    // 群聊消息渲染：在received消息气泡上方显示发送者名称
    function renderGroupSenderName(msg, bubble, conv) {
        if (!conv || conv.type !== 'group') return;

        // 只对received类型消息显示发送者名称
        var isReceived = (msg.type === 'voice' || msg.type === 'location' || msg.type === 'voicecall' || msg.type === 'videocall' || msg.type === 'redenvelope' || msg.type === 'transfer' || msg.type === 'goods_card')
            ? msg.sender === 'received'
            : msg.type === 'received';

        if (!isReceived) return;

        var senderName = msg.groupSenderName || '未知';
        var nameEl = document.createElement('div');
        nameEl.className = 'group-msg-sender-name';
        nameEl.textContent = senderName;

        // 插入到bubble最前面
        bubble.insertBefore(nameEl, bubble.firstChild);
    }

    // 获取群成员头像（用于群聊消息显示）
    function getGroupMemberAvatar(conv, senderName) {
        if (!conv || conv.type !== 'group') return '';
        var group = AppState.groups.find(function(g) { return g.id === conv.id; });
        if (!group || !group.members) return '';
        var member = group.members.find(function(m) { return m.name === senderName; });
        return member ? member.avatar : '';
    }

    // ===== 群头像：支持本地文件上传 + URL =====
    function setupAvatarPreview() {
        var avatarInput = document.getElementById('group-avatar-input');
        var avatarPicker = document.getElementById('cg-avatar-picker');
        var fileInput = document.getElementById('cg-avatar-file-input');
        if (!avatarPicker) return;

        var defaultSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"><path d="M23 19V5a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2z"/><circle cx="12" cy="13" r="4"/></svg>';
        var avatarLabel = avatarPicker.closest('.avatar-wrapper') && avatarPicker.closest('.avatar-wrapper').querySelector('.avatar-label');

        // 点击头像区域 -> 弹出文件选择
        avatarPicker.addEventListener('click', function() {
            if (fileInput) fileInput.click();
        });

        // 本地文件选择
        if (fileInput) {
            fileInput.addEventListener('change', function() {
                var file = this.files[0];
                if (!file || !file.type.startsWith('image/')) return;
                var reader = new FileReader();
                reader.onload = function(e) {
                    if (avatarInput) avatarInput.value = e.target.result;
                    avatarPicker.innerHTML = '<img src="' + e.target.result + '" alt="" style="width:100%;height:100%;object-fit:cover;">';
                    if (avatarLabel) avatarLabel.textContent = '点击更换头像';
                };
                reader.readAsDataURL(file);
            });
        }

        // URL输入预览
        if (avatarInput) {
            avatarInput.addEventListener('input', function() {
                var url = this.value.trim();
                if (url && !url.startsWith('data:')) {
                    avatarPicker.innerHTML = '<img src="' + url + '" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.remove()">';
                    if (avatarLabel) avatarLabel.textContent = '点击更换头像';
                } else if (!url) {
                    avatarPicker.innerHTML = defaultSvg;
                    if (avatarLabel) avatarLabel.textContent = '点击上传头像';
                }
            });
        }
    }

    // 自定义角色弹窗头像：支持本地文件上传 + URL
    function setupCustomAvatarPreview() {
        var avatarInput = document.getElementById('cg-custom-avatar-url');
        var preview = document.getElementById('cg-custom-avatar-preview');
        var fileInput = document.getElementById('cg-custom-avatar-file');
        if (!preview) return;

        var defaultSvg = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

        // 点击头像预览 -> 弹出文件选择
        preview.addEventListener('click', function() {
            if (fileInput) fileInput.click();
        });

        // 本地文件选择
        if (fileInput) {
            fileInput.addEventListener('change', function() {
                var file = this.files[0];
                if (!file || !file.type.startsWith('image/')) return;
                var reader = new FileReader();
                reader.onload = function(e) {
                    if (avatarInput) avatarInput.value = e.target.result;
                    preview.innerHTML = '<img src="' + e.target.result + '" alt="" style="width:100%;height:100%;object-fit:cover;">';
                };
                reader.readAsDataURL(file);
            });
        }

        // URL输入预览
        if (avatarInput) {
            avatarInput.addEventListener('input', function() {
                var url = this.value.trim();
                if (url && !url.startsWith('data:')) {
                    preview.innerHTML = '<img src="' + url + '" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.remove()">';
                } else if (!url) {
                    preview.innerHTML = defaultSvg;
                }
            });
        }
    }

    // ===== 初始化事件绑定 =====
    function initGroupChatEvents() {
        // 注意：返回、取消、提交按钮的事件已在 app.js 中绑定，这里只绑定 group-chat.js 独有的事件

        // 添加自定义角色按钮
        var addCustomBtn = document.getElementById('cg-add-custom-btn');
        if (addCustomBtn) addCustomBtn.addEventListener('click', openCustomMemberModal);

        // 自定义角色弹窗按钮
        var customCancel = document.getElementById('cg-custom-cancel');
        if (customCancel) customCancel.addEventListener('click', closeCustomMemberModal);

        var customConfirm = document.getElementById('cg-custom-confirm');
        if (customConfirm) customConfirm.addEventListener('click', confirmCustomMember);

        // 点击弹窗背景关闭
        var modal = document.getElementById('cg-custom-modal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) closeCustomMemberModal();
            });
        }

        setupAvatarPreview();
        setupCustomAvatarPreview();
    }

    // DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGroupChatEvents);
    } else {
        initGroupChatEvents();
    }

    // ===== 暴露全局接口 =====
    window.GroupChat = {
        openCreateGroupPage: openCreateGroupPage,
        closeCreateGroupPage: closeCreateGroupPage,
        applyGroupChatMode: applyGroupChatMode,
        renderGroupSenderName: renderGroupSenderName,
        getGroupMemberAvatar: getGroupMemberAvatar,
        submitCreateGroup: submitCreateGroup
    };

})();
