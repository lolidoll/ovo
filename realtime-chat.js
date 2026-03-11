(function () {
    const PROFILE_STORAGE_KEY = 'miao_realtime_chat_profile_v2';
    const DEFAULT_ZONE_CAPACITY = 100;
    const PLACEHOLDER_URL_PATTERN = /YOUR_ZONE_/i;
    const POLL_MS = { stats: 12000, lobby: 7000, heartbeat: 18000, room: 2500 };

    const state = {
        inited: false,
        pageOpen: false,
        route: 'zone',
        zones: [],
        zoneStats: {},
        selectedZoneId: '',
        rooms: [],
        currentRoom: null,
        members: [],
        messages: [],
        messageIdSet: new Set(),
        lastMessageTs: 0,
        pendingJoinRoomId: '',
        user: null,
        timers: { stats: null, lobby: null, heartbeat: null, room: null },
        getAppState: null,
        showToast: null
    };

    const ui = {};

    function init(options) {
        if (state.inited) return;
        state.getAppState = options && typeof options.getAppState === 'function'
            ? options.getAppState
            : function () { return window.AppState || {}; };
        state.showToast = options && typeof options.showToast === 'function' ? options.showToast : null;

        cacheUi();
        if (!ui.root) return;

        state.zones = getZoneConfig();
        state.user = getOrCreateProfile();

        bindEvents();
        renderUser();
        renderZones();
        renderRooms();
        renderRoomPage();
        renderRoute();

        state.inited = true;
        if (isForumPageOpen()) onPageOpen();
    }

    function onPageOpen() {
        if (!state.inited) return;
        state.pageOpen = true;
        setRoute('zone');

        refreshZoneStats(false).then(function () {
            if (!state.selectedZoneId) {
                const best = pickBestZone();
                if (best) state.selectedZoneId = best.id;
            }
            renderZones();
        });
        startStatsTimer();
    }

    function onPageClose() {
        if (!state.inited) return;
        state.pageOpen = false;
        stopTimers();
        closeModal(ui.createRoomModal);
        closeModal(ui.joinKeyModal);
        hideEmojiPicker();
        if (state.currentRoom) {
            leaveRoom({ silent: true, skipToast: true }).catch(function () {
                resetRoomState();
            });
        }
    }

    function cacheUi() {
        ui.root = document.getElementById('rtc-root');
        ui.viewZone = document.getElementById('rtc-view-zone');
        ui.viewLobby = document.getElementById('rtc-view-lobby');
        ui.viewRoom = document.getElementById('rtc-view-room');

        ui.userAvatar = document.getElementById('rtc-user-avatar');
        ui.userName = document.getElementById('rtc-user-name');
        ui.userId = document.getElementById('rtc-user-id');
        ui.editProfileBtn = document.getElementById('rtc-edit-profile-btn');

        ui.zoneRefreshBtn = document.getElementById('rtc-zone-refresh-btn');
        ui.zoneList = document.getElementById('rtc-zone-list');

        ui.backZoneBtn = document.getElementById('rtc-back-zone-btn');
        ui.lobbyZoneName = document.getElementById('rtc-lobby-zone-name');
        ui.lobbyZoneOnline = document.getElementById('rtc-lobby-zone-online');
        ui.lobbyRefreshBtn = document.getElementById('rtc-lobby-refresh-btn');
        ui.createRoomBtn = document.getElementById('rtc-create-room-btn');
        ui.roomList = document.getElementById('rtc-room-list');
        ui.roomEmpty = document.getElementById('rtc-room-empty');

        ui.backLobbyBtn = document.getElementById('rtc-back-lobby-btn');
        ui.leaveRoomBtn = document.getElementById('rtc-leave-room-btn');
        ui.roomAvatar = document.getElementById('rtc-room-avatar');
        ui.roomName = document.getElementById('rtc-room-name');
        ui.roomZoneLine = document.getElementById('rtc-room-zone-line');
        ui.memberList = document.getElementById('rtc-member-list');
        ui.messageList = document.getElementById('rtc-message-list');
        ui.chatEmpty = document.getElementById('rtc-chat-empty');
        ui.messageInput = document.getElementById('rtc-message-input');
        ui.sendBtn = document.getElementById('rtc-send-btn');
        ui.emojiToggleBtn = document.getElementById('rtc-emoji-toggle-btn');
        ui.emojiPicker = document.getElementById('rtc-emoji-picker');

        ui.createRoomModal = document.getElementById('rtc-create-room-modal');
        ui.createRoomName = document.getElementById('rtc-create-room-name');
        ui.createRoomAvatar = document.getElementById('rtc-create-room-avatar');
        ui.createRoomPrivate = document.getElementById('rtc-create-room-private');
        ui.createRoomKeyWrap = document.getElementById('rtc-create-room-key-wrap');
        ui.createRoomKey = document.getElementById('rtc-create-room-key');
        ui.createRoomCancelBtn = document.getElementById('rtc-create-room-cancel-btn');
        ui.createRoomConfirmBtn = document.getElementById('rtc-create-room-confirm-btn');

        ui.joinKeyModal = document.getElementById('rtc-join-key-modal');
        ui.joinKeyInput = document.getElementById('rtc-join-room-key');
        ui.joinKeyCancelBtn = document.getElementById('rtc-join-room-cancel-btn');
        ui.joinKeyConfirmBtn = document.getElementById('rtc-join-room-confirm-btn');
    }

    function bindEvents() {
        ui.zoneRefreshBtn.addEventListener('click', function () { refreshZoneStats(true); });
        ui.zoneList.addEventListener('click', function (event) {
            const card = event.target.closest('.rtc-zone-card');
            if (!card) return;
            const zoneId = card.getAttribute('data-zone-id');
            if (!zoneId) return;
            enterLobby(zoneId);
        });

        ui.editProfileBtn.addEventListener('click', editProfile);

        ui.backZoneBtn.addEventListener('click', function () {
            leaveRoom({ silent: true, skipToast: true }).finally(function () { setRoute('zone'); });
        });
        ui.lobbyRefreshBtn.addEventListener('click', function () { refreshRooms(true); });
        ui.createRoomBtn.addEventListener('click', function () {
            if (!state.selectedZoneId) return notify('请先选择线路');
            const zone = getSelectedZone();
            if (!zone || !isZoneConfigured(zone)) return notify('该线路未配置后端地址');
            openCreateRoomModal();
        });

        ui.roomList.addEventListener('click', function (event) {
            const btn = event.target.closest('.rtc-room-enter-btn');
            if (!btn) return;
            const roomId = btn.getAttribute('data-room-id');
            if (!roomId) return;
            const isPrivate = btn.getAttribute('data-private') === '1';
            if (isPrivate) {
                state.pendingJoinRoomId = roomId;
                ui.joinKeyInput.value = '';
                openModal(ui.joinKeyModal);
                setTimeout(function () { ui.joinKeyInput.focus(); }, 10);
                return;
            }
            joinRoom(roomId, '').catch(function (error) { notify(error.message || '加入房间失败'); });
        });

        ui.backLobbyBtn.addEventListener('click', function () {
            leaveRoom({ silent: false, skipToast: true }).finally(function () { setRoute('lobby'); });
        });
        ui.leaveRoomBtn.addEventListener('click', function () {
            leaveRoom({ silent: false, skipToast: false }).catch(function (error) { notify(error.message || '离开失败'); });
        });

        ui.messageInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendTextMessage();
            }
        });
        ui.sendBtn.addEventListener('click', sendTextMessage);
        ui.emojiToggleBtn.addEventListener('click', function () {
            if (ui.emojiPicker.classList.contains('rtc-hidden')) {
                renderEmojiPicker();
                ui.emojiPicker.classList.remove('rtc-hidden');
            } else {
                hideEmojiPicker();
            }
        });
        ui.emojiPicker.addEventListener('click', function (event) {
            const btn = event.target.closest('.rtc-emoji-item');
            if (!btn) return;
            const url = btn.getAttribute('data-url') || '';
            const text = btn.getAttribute('data-text') || '';
            if (!url) return;
            sendMessage('', url, text).catch(function (error) { notify(error.message || '发送失败'); });
        });

        ui.createRoomPrivate.addEventListener('change', function () {
            if (ui.createRoomPrivate.checked) {
                ui.createRoomKeyWrap.classList.remove('rtc-hidden');
            } else {
                ui.createRoomKeyWrap.classList.add('rtc-hidden');
                ui.createRoomKey.value = '';
            }
        });
        ui.createRoomCancelBtn.addEventListener('click', function () { closeModal(ui.createRoomModal); });
        ui.createRoomConfirmBtn.addEventListener('click', function () {
            createRoom().catch(function (error) { notify(error.message || '创建房间失败'); });
        });

        ui.joinKeyCancelBtn.addEventListener('click', function () {
            closeModal(ui.joinKeyModal);
            state.pendingJoinRoomId = '';
        });
        ui.joinKeyConfirmBtn.addEventListener('click', function () {
            const roomId = state.pendingJoinRoomId;
            const key = String(ui.joinKeyInput.value || '').trim();
            if (!roomId) return closeModal(ui.joinKeyModal);
            joinRoom(roomId, key).catch(function (error) { notify(error.message || '密钥错误或加入失败'); });
        });

        ui.createRoomModal.addEventListener('click', function (event) {
            if (event.target === ui.createRoomModal) closeModal(ui.createRoomModal);
        });
        ui.joinKeyModal.addEventListener('click', function (event) {
            if (event.target === ui.joinKeyModal) {
                closeModal(ui.joinKeyModal);
                state.pendingJoinRoomId = '';
            }
        });
    }

    function setRoute(route) {
        state.route = route;
        renderRoute();
    }

    function renderRoute() {
        ui.viewZone.classList.toggle('rtc-hidden', state.route !== 'zone');
        ui.viewLobby.classList.toggle('rtc-hidden', state.route !== 'lobby');
        ui.viewRoom.classList.toggle('rtc-hidden', state.route !== 'room');
    }

    function renderUser() {
        ui.userName.textContent = state.user.name || '游客';
        ui.userId.textContent = 'ID: ' + shortId(state.user.id || '');
        if (state.user.avatar) {
            ui.userAvatar.innerHTML = '<img src="' + escapeHtml(state.user.avatar) + '" alt="">';
        } else {
            ui.userAvatar.textContent = initialFrom(state.user.name || '游客');
        }
    }

    async function enterLobby(zoneId) {
        const zone = state.zones.find(function (item) { return item.id === zoneId; });
        if (!zone) return notify('线路不存在');
        if (!isZoneConfigured(zone)) return notify('该线路后端未配置，请先填写 Worker 地址');

        if (state.currentRoom) {
            await leaveRoom({ silent: true, skipToast: true });
        }

        state.selectedZoneId = zoneId;
        setRoute('lobby');
        updateLobbyHeader();
        await pingPresence();
        await refreshRooms(false);
        startLobbyTimers();
    }

    function updateLobbyHeader() {
        const zone = getSelectedZone();
        const stats = zone ? (state.zoneStats[zone.id] || {}) : {};
        const online = toInt(stats.onlineCount, 0);
        const cap = toInt(stats.capacity, zone ? zone.capacity : DEFAULT_ZONE_CAPACITY);
        ui.lobbyZoneName.textContent = zone ? zone.name : '-';
        ui.lobbyZoneOnline.textContent = zone ? ('在线 ' + online + ' / ' + cap) : '在线人数 -';
    }

    function renderZones() {
        ui.zoneList.innerHTML = state.zones.map(function (zone) {
            const stats = state.zoneStats[zone.id] || {};
            const online = toInt(stats.onlineCount, 0);
            const capacity = toInt(stats.capacity, zone.capacity);
            const roomCount = toInt(stats.roomCount, 0);
            const configured = isZoneConfigured(zone);
            const active = zone.id === state.selectedZoneId;
            const offline = !!stats.error;

            let badge = '可进入';
            if (!configured) badge = '未配置后端';
            else if (offline) badge = '后端异常';
            else if (online >= capacity) badge = '已满员';
            else badge = '空位 ' + Math.max(capacity - online, 0);

            return '' +
                '<div class="rtc-zone-card ' + (active ? 'active' : '') + ' ' + (offline ? 'offline' : '') + '" data-zone-id="' + escapeHtml(zone.id) + '">' +
                '  <div>' +
                '    <div class="rtc-zone-title">' + escapeHtml(zone.name) + '</div>' +
                '    <div class="rtc-zone-online">在线 ' + online + ' / ' + capacity + ' · 房间 ' + roomCount + '</div>' +
                '  </div>' +
                '  <div class="rtc-zone-badge">' + escapeHtml(badge) + '</div>' +
                '</div>';
        }).join('');
    }

    function renderRooms() {
        updateLobbyHeader();
        ui.createRoomBtn.disabled = !getSelectedZone();

        if (!state.rooms.length) {
            ui.roomList.innerHTML = '';
            ui.roomEmpty.classList.remove('rtc-hidden');
            return;
        }

        ui.roomEmpty.classList.add('rtc-hidden');
        ui.roomList.innerHTML = state.rooms.map(function (room) {
            const avatar = sanitizeImageUrl(room.avatar);
            const joined = !!room.joined;
            const tag = room.isPrivate ? '密钥房' : '公开房';
            const preview = room.lastMessagePreview ? escapeHtml(room.lastMessagePreview) : '暂无消息';
            return '' +
                '<div class="rtc-room-item">' +
                '  <div class="rtc-room-avatar">' +
                (avatar ? '<img src="' + escapeHtml(avatar) + '" alt="">' : escapeHtml(initialFrom(room.name || '房'))) +
                '  </div>' +
                '  <div class="rtc-room-main">' +
                '    <div class="rtc-room-name">' + escapeHtml(room.name || '未命名房间') + '</div>' +
                '    <div class="rtc-room-meta">' +
                '      <span class="rtc-room-tag">' + escapeHtml(tag) + '</span>' +
                '      <span>' + toInt(room.memberCount, 0) + ' 人</span>' +
                '      <span>' + preview + '</span>' +
                '    </div>' +
                '  </div>' +
                '  <button class="rtc-room-enter-btn ' + (joined ? 'in-room' : '') + '" type="button" data-room-id="' + escapeHtml(room.id) + '" data-private="' + (room.isPrivate ? '1' : '0') + '">' +
                (joined ? '重进' : '进入') +
                '  </button>' +
                '</div>';
        }).join('');
    }

    function renderRoomPage() {
        if (!state.currentRoom) {
            ui.roomName.textContent = '未进入房间';
            ui.roomZoneLine.textContent = '请选择房间';
            ui.roomAvatar.textContent = '房';
            ui.memberList.innerHTML = '';
            ui.messageList.innerHTML = '';
            ui.chatEmpty.classList.remove('rtc-hidden');
            setRoomComposerEnabled(false);
            return;
        }

        const zone = getSelectedZone();
        ui.roomName.textContent = state.currentRoom.name || '未命名房间';
        ui.roomZoneLine.textContent = (zone ? zone.name : '当前线路') + ' · 在线 ' + toInt(state.currentRoom.memberCount, state.members.length) + ' 人';

        const avatar = sanitizeImageUrl(state.currentRoom.avatar);
        if (avatar) {
            ui.roomAvatar.innerHTML = '<img src="' + escapeHtml(avatar) + '" alt="">';
        } else {
            ui.roomAvatar.textContent = initialFrom(state.currentRoom.name || '房');
        }

        if (state.members.length) {
            ui.memberList.innerHTML = state.members.map(function (m) {
                const mAvatar = sanitizeImageUrl(m.avatar);
                return '' +
                    '<div class="rtc-member-item">' +
                    '  <div class="rtc-member-avatar">' +
                    (mAvatar ? '<img src="' + escapeHtml(mAvatar) + '" alt="">' : escapeHtml(initialFrom(m.name || 'U'))) +
                    '  </div>' +
                    '  <div class="rtc-member-name">' + escapeHtml(m.name || '未知用户') + '</div>' +
                    '</div>';
            }).join('');
        } else {
            ui.memberList.innerHTML = '<div class="rtc-empty" style="padding:2px 8px;">正在同步房间成员...</div>';
        }

        if (!state.messages.length) {
            ui.messageList.innerHTML = '';
            ui.chatEmpty.classList.remove('rtc-hidden');
        } else {
            ui.chatEmpty.classList.add('rtc-hidden');
            ui.messageList.innerHTML = state.messages.map(function (msg) {
                const self = msg.userId === state.user.id;
                const role = self ? 'self' : 'other';
                const text = msg.text ? '<div>' + escapeHtml(msg.text).replace(/\n/g, '<br>') + '</div>' : '';
                const emoji = msg.emojiUrl ? '<img class="rtc-msg-emoji" src="' + escapeHtml(msg.emojiUrl) + '" alt="emoji">' : '';
                return '' +
                    '<div class="rtc-msg ' + role + '">' +
                    '  <div class="rtc-msg-name">' + escapeHtml(msg.userName || '匿名用户') + '</div>' +
                    '  <div class="rtc-msg-bubble">' + text + emoji + '</div>' +
                    '  <div class="rtc-msg-time">' + formatTime(msg.createdAt) + '</div>' +
                    '</div>';
            }).join('');
            scrollMessagesBottom();
        }

        setRoomComposerEnabled(true);
    }

    function renderEmojiPicker() {
        const app = state.getAppState ? state.getAppState() : {};
        const emojis = Array.isArray(app.emojis) ? app.emojis : [];
        if (!emojis.length) {
            ui.emojiPicker.innerHTML = '<div class="rtc-empty">你还没有表情包，请先去表情包管理导入。</div>';
            return;
        }

        ui.emojiPicker.innerHTML = emojis.slice(0, 240).map(function (e) {
            const url = sanitizeImageUrl(e.url || '');
            if (!url) return '';
            const text = String(e.text || '表情');
            return '' +
                '<button class="rtc-emoji-item" type="button" data-url="' + escapeHtml(url) + '" data-text="' + escapeHtml(text) + '">' +
                '  <img src="' + escapeHtml(url) + '" alt="emoji">' +
                '  <span class="rtc-emoji-text">' + escapeHtml(text) + '</span>' +
                '</button>';
        }).join('');
    }

    function setRoomComposerEnabled(enabled) {
        ui.leaveRoomBtn.disabled = !enabled;
        ui.messageInput.disabled = !enabled;
        ui.sendBtn.disabled = !enabled;
        ui.emojiToggleBtn.disabled = !enabled;
    }

    function openCreateRoomModal() {
        ui.createRoomName.value = '';
        ui.createRoomAvatar.value = '';
        ui.createRoomPrivate.checked = false;
        ui.createRoomKeyWrap.classList.add('rtc-hidden');
        ui.createRoomKey.value = '';
        openModal(ui.createRoomModal);
        setTimeout(function () { ui.createRoomName.focus(); }, 10);
    }

    async function createRoom() {
        const zone = getSelectedZone();
        if (!zone || !isZoneConfigured(zone)) throw new Error('线路未配置');

        const name = normalizeRoomName(ui.createRoomName.value);
        const avatar = sanitizeImageUrl(ui.createRoomAvatar.value);
        const isPrivate = !!ui.createRoomPrivate.checked;
        const key = String(ui.createRoomKey.value || '').trim();
        if (!name) throw new Error('房间名不能为空');
        if (isPrivate && key.length < 4) throw new Error('密钥至少 4 位');

        const data = await requestApi(zone, '/v1/rooms', 'POST', {
            user: state.user,
            name: name,
            avatar: avatar,
            isPrivate: isPrivate,
            key: key
        });

        closeModal(ui.createRoomModal);
        enterRoom(data);
        notify('房间创建成功');
        await refreshRooms(false);
    }

    async function joinRoom(roomId, key) {
        const zone = getSelectedZone();
        if (!zone || !isZoneConfigured(zone)) throw new Error('线路不可用');
        if (!roomId) throw new Error('房间不存在');

        if (state.currentRoom && state.currentRoom.id !== roomId) {
            await leaveRoom({ silent: true, skipToast: true });
        }

        const data = await requestApi(zone, '/v1/rooms/' + encodeURIComponent(roomId) + '/join', 'POST', {
            user: state.user,
            key: String(key || '')
        });

        closeModal(ui.joinKeyModal);
        state.pendingJoinRoomId = '';
        enterRoom(data);
        notify('已进入房间');
        await refreshRooms(false);
    }

    function enterRoom(data) {
        resetRoomState();
        state.currentRoom = data.room || null;
        state.members = Array.isArray(data.members) ? data.members : [];
        appendMessages(Array.isArray(data.messages) ? data.messages : []);
        setRoute('room');
        renderRoomPage();
        startRoomTimer();
    }

    async function leaveRoom(options) {
        options = options || {};
        if (!state.currentRoom) return;
        const zone = getSelectedZone();
        const roomId = state.currentRoom.id;

        if (zone && isZoneConfigured(zone)) {
            try {
                await requestApi(zone, '/v1/rooms/' + encodeURIComponent(roomId) + '/leave', 'POST', {
                    userId: state.user.id
                });
            } catch (error) {
                if (!options.silent) throw error;
            }
        }

        resetRoomState();
        renderRoomPage();
        if (!options.skipToast) notify('已离开房间');
        await refreshRooms(false);
    }

    async function syncRoom() {
        if (!state.currentRoom) return;
        const zone = getSelectedZone();
        if (!zone || !isZoneConfigured(zone)) return;

        try {
            const data = await requestApi(
                zone,
                '/v1/rooms/' + encodeURIComponent(state.currentRoom.id) +
                '/sync?since=' + encodeURIComponent(String(state.lastMessageTs)) +
                '&userId=' + encodeURIComponent(state.user.id),
                'GET'
            );

            if (data.roomDeleted) {
                notify('房间已关闭，自动返回大厅');
                resetRoomState();
                setRoute('lobby');
                await refreshRooms(false);
                return;
            }

            if (data.room) {
                state.currentRoom = Object.assign({}, state.currentRoom, data.room);
            }
            state.members = Array.isArray(data.members) ? data.members : [];
            appendMessages(Array.isArray(data.messages) ? data.messages : []);
            renderRoomPage();
        } catch (error) {
            console.warn('房间同步失败:', error.message || error);
        }
    }

    function sendTextMessage() {
        const text = String(ui.messageInput.value || '').trim();
        if (!text) return;
        sendMessage(text, '', '').then(function () {
            ui.messageInput.value = '';
        }).catch(function (error) {
            notify(error.message || '发送失败');
        });
    }

    async function sendMessage(text, emojiUrl, emojiText) {
        if (!state.currentRoom) throw new Error('请先进入房间');
        const zone = getSelectedZone();
        if (!zone || !isZoneConfigured(zone)) throw new Error('线路不可用');

        const msgText = normalizeMessageText(text);
        const msgEmoji = sanitizeImageUrl(emojiUrl);
        if (!msgText && !msgEmoji) return;

        const data = await requestApi(zone, '/v1/rooms/' + encodeURIComponent(state.currentRoom.id) + '/messages', 'POST', {
            user: state.user,
            text: msgText,
            emojiUrl: msgEmoji,
            emojiText: String(emojiText || '').trim().slice(0, 30)
        });

        if (data.message) {
            appendMessages([data.message]);
            renderRoomPage();
        }
        await syncRoom();
    }

    async function refreshZoneStats(showErrorToast) {
        const tasks = state.zones.map(function (zone) {
            if (!isZoneConfigured(zone)) {
                state.zoneStats[zone.id] = { onlineCount: 0, roomCount: 0, capacity: zone.capacity, error: '未配置' };
                return Promise.resolve();
            }

            return requestApi(zone, '/v1/stats', 'GET').then(function (data) {
                state.zoneStats[zone.id] = {
                    onlineCount: toInt(data.onlineCount, 0),
                    roomCount: toInt(data.roomCount, 0),
                    capacity: toInt(data.capacity, zone.capacity),
                    error: ''
                };
            }).catch(function (error) {
                state.zoneStats[zone.id] = { onlineCount: 0, roomCount: 0, capacity: zone.capacity, error: error.message || '异常' };
                if (showErrorToast) notify(zone.name + ' 获取失败：' + (error.message || '连接异常'));
            });
        });

        await Promise.all(tasks);
        renderZones();
        updateLobbyHeader();
    }

    async function refreshRooms(showErrorToast) {
        const zone = getSelectedZone();
        if (!zone || !isZoneConfigured(zone)) {
            state.rooms = [];
            renderRooms();
            return;
        }

        try {
            const data = await requestApi(zone, '/v1/rooms?userId=' + encodeURIComponent(state.user.id), 'GET');
            state.rooms = Array.isArray(data.rooms) ? data.rooms : [];
            state.zoneStats[zone.id] = {
                onlineCount: toInt(data.onlineCount, 0),
                roomCount: toInt(data.roomCount, state.rooms.length),
                capacity: toInt(data.capacity, zone.capacity),
                error: ''
            };

            if (state.currentRoom) {
                const found = state.rooms.find(function (r) { return r.id === state.currentRoom.id; });
                if (!found) {
                    notify('房间已关闭，返回大厅');
                    resetRoomState();
                    setRoute('lobby');
                } else {
                    state.currentRoom = Object.assign({}, state.currentRoom, found);
                }
            }

            renderRooms();
            renderRoomPage();
            renderZones();
        } catch (error) {
            if (showErrorToast) notify(error.message || '拉取房间失败');
        }
    }

    async function pingPresence() {
        const zone = getSelectedZone();
        if (!zone || !isZoneConfigured(zone)) return;

        try {
            const data = await requestApi(zone, '/v1/presence/ping', 'POST', {
                user: state.user,
                roomId: state.currentRoom ? state.currentRoom.id : ''
            });
            state.zoneStats[zone.id] = {
                onlineCount: toInt(data.onlineCount, 0),
                roomCount: toInt(data.roomCount, state.zoneStats[zone.id] && state.zoneStats[zone.id].roomCount),
                capacity: toInt(data.capacity, zone.capacity),
                error: ''
            };
            updateLobbyHeader();
            renderZones();
        } catch (error) {
            console.warn('presence ping failed:', error.message || error);
        }
    }

    function appendMessages(list) {
        if (!Array.isArray(list) || !list.length) return;
        list.forEach(function (item) {
            if (!item || !item.id) return;
            if (state.messageIdSet.has(item.id)) return;
            state.messageIdSet.add(item.id);

            state.messages.push({
                id: String(item.id),
                userId: String(item.userId || ''),
                userName: normalizeName(item.userName || '匿名用户'),
                text: normalizeMessageText(item.text || ''),
                emojiUrl: sanitizeImageUrl(item.emojiUrl || ''),
                createdAt: toInt(item.createdAt, Date.now())
            });
            state.lastMessageTs = Math.max(state.lastMessageTs, toInt(item.createdAt, 0));
        });

        state.messages.sort(function (a, b) { return a.createdAt - b.createdAt; });
        if (state.messages.length > 240) {
            const removed = state.messages.splice(0, state.messages.length - 240);
            removed.forEach(function (msg) { state.messageIdSet.delete(msg.id); });
        }
    }

    function resetRoomState() {
        state.currentRoom = null;
        state.members = [];
        state.messages = [];
        state.messageIdSet = new Set();
        state.lastMessageTs = 0;
        clearTimer('room');
        hideEmojiPicker();
    }

    function startStatsTimer() {
        clearTimer('stats');
        state.timers.stats = setInterval(function () {
            if (!state.pageOpen) return;
            refreshZoneStats(false);
        }, POLL_MS.stats);
    }

    function startLobbyTimers() {
        clearTimer('lobby');
        clearTimer('heartbeat');
        clearTimer('room');

        state.timers.lobby = setInterval(function () {
            if (!state.pageOpen || state.route !== 'lobby') return;
            refreshRooms(false);
        }, POLL_MS.lobby);

        state.timers.heartbeat = setInterval(function () {
            if (!state.pageOpen || !state.selectedZoneId) return;
            if (state.route !== 'lobby' && state.route !== 'room') return;
            pingPresence();
        }, POLL_MS.heartbeat);
    }

    function startRoomTimer() {
        clearTimer('room');
        state.timers.room = setInterval(function () {
            if (!state.pageOpen || state.route !== 'room' || !state.currentRoom) return;
            syncRoom();
        }, POLL_MS.room);
    }

    function stopTimers() {
        clearTimer('stats');
        clearTimer('lobby');
        clearTimer('heartbeat');
        clearTimer('room');
    }

    function clearTimer(name) {
        if (state.timers[name]) {
            clearInterval(state.timers[name]);
            state.timers[name] = null;
        }
    }

    async function requestApi(zone, path, method, body) {
        const baseUrl = normalizeBaseUrl(zone.baseUrl);
        if (!baseUrl || !/^https?:\/\//i.test(baseUrl) || PLACEHOLDER_URL_PATTERN.test(baseUrl)) {
            throw new Error('线路后端未配置');
        }

        const options = {
            method: method || 'GET',
            headers: { 'Content-Type': 'application/json' }
        };
        if (body && options.method !== 'GET') options.body = JSON.stringify(body);

        const response = await fetch(baseUrl + path, options);
        let payload = null;
        try {
            payload = await response.json();
        } catch (error) {
            payload = null;
        }
        if (!response.ok || !payload || payload.ok !== true) {
            const message = payload && payload.error ? payload.error : ('请求失败（' + response.status + '）');
            throw new Error(message);
        }
        return payload;
    }

    function editProfile() {
        const nextNameRaw = prompt('输入聊天室昵称（最多 24 字）', state.user.name || '游客');
        if (nextNameRaw === null) return;
        const nextName = normalizeName(nextNameRaw);
        if (!nextName) return notify('昵称不能为空');

        const nextAvatarRaw = prompt('输入头像 URL（可留空）', state.user.avatar || '');
        if (nextAvatarRaw === null) return;

        state.user = {
            id: state.user.id,
            name: nextName,
            avatar: sanitizeImageUrl(nextAvatarRaw)
        };
        saveProfile(state.user);
        renderUser();
        pingPresence();
    }

    function getZoneConfig() {
        const cfg = window.REALTIME_CHAT_CONFIG && Array.isArray(window.REALTIME_CHAT_CONFIG.zones)
            ? window.REALTIME_CHAT_CONFIG.zones
            : [];
        const source = cfg.length ? cfg : [
            { id: 'zone-1', name: '喵机一区', baseUrl: '', capacity: DEFAULT_ZONE_CAPACITY },
            { id: 'zone-2', name: '喵机二区', baseUrl: '', capacity: DEFAULT_ZONE_CAPACITY }
        ];
        return source.map(function (raw, i) {
            return {
                id: String(raw.id || ('zone-' + (i + 1))).trim(),
                name: String(raw.name || ('线路' + (i + 1))).trim(),
                baseUrl: normalizeBaseUrl(raw.baseUrl),
                capacity: toInt(raw.capacity, DEFAULT_ZONE_CAPACITY)
            };
        });
    }

    function getOrCreateProfile() {
        let stored = null;
        try {
            const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
            if (raw) stored = JSON.parse(raw);
        } catch (error) {
            stored = null;
        }

        const appState = state.getAppState ? state.getAppState() : {};
        const user = appState && appState.user ? appState.user : {};
        const profile = {
            id: stored && stored.id ? String(stored.id) : createUserId(),
            name: normalizeName((stored && stored.name) || user.nickname || user.name || '游客') || '游客',
            avatar: sanitizeImageUrl((stored && stored.avatar) || user.avatar || '')
        };
        saveProfile(profile);
        return profile;
    }

    function pickBestZone() {
        const candidates = state.zones.filter(isZoneConfigured);
        if (!candidates.length) return null;
        let best = candidates[0];
        let bestLoad = Number.POSITIVE_INFINITY;
        candidates.forEach(function (zone) {
            const stats = state.zoneStats[zone.id] || {};
            if (stats.error) return;
            const online = toInt(stats.onlineCount, 0);
            const cap = toInt(stats.capacity, zone.capacity || DEFAULT_ZONE_CAPACITY) || DEFAULT_ZONE_CAPACITY;
            if (online >= cap) return;
            const load = online / cap;
            if (load < bestLoad) {
                best = zone;
                bestLoad = load;
            }
        });
        return best;
    }

    function getSelectedZone() {
        return state.zones.find(function (zone) { return zone.id === state.selectedZoneId; }) || null;
    }

    function isZoneConfigured(zone) {
        if (!zone || !zone.baseUrl) return false;
        if (PLACEHOLDER_URL_PATTERN.test(zone.baseUrl)) return false;
        return /^https?:\/\//i.test(zone.baseUrl);
    }

    function notify(message) {
        if (!message) return;
        if (typeof state.showToast === 'function') state.showToast(message);
        else console.log('[RealtimeChat]', message);
    }

    function saveProfile(profile) {
        try {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
        } catch (error) {
            console.warn('保存资料失败', error.message);
        }
    }

    function createUserId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
        return 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    }

    function openModal(el) {
        if (el) el.classList.remove('rtc-hidden');
    }

    function closeModal(el) {
        if (el) el.classList.add('rtc-hidden');
    }

    function hideEmojiPicker() {
        ui.emojiPicker.classList.add('rtc-hidden');
    }

    function scrollMessagesBottom() {
        requestAnimationFrame(function () {
            ui.messageList.scrollTop = ui.messageList.scrollHeight;
        });
    }

    function normalizeBaseUrl(url) {
        return String(url || '').trim().replace(/\/+$/, '');
    }

    function normalizeName(name) {
        return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 24);
    }

    function normalizeRoomName(name) {
        return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    }

    function normalizeMessageText(text) {
        return String(text || '').replace(/\r\n/g, '\n').trim().slice(0, 500);
    }

    function sanitizeImageUrl(url) {
        const s = String(url || '').trim();
        if (!s) return '';
        if (/^https?:\/\//i.test(s)) return s.slice(0, 1200);
        if (/^data:image\//i.test(s)) return s.slice(0, 8000);
        return '';
    }

    function toInt(value, fallback) {
        const n = Number(value);
        if (!Number.isFinite(n)) return Number.isFinite(fallback) ? fallback : 0;
        return Math.floor(n);
    }

    function initialFrom(text) {
        const s = String(text || '').trim();
        return s ? s.charAt(0).toUpperCase() : '喵';
    }

    function shortId(value) {
        const s = String(value || '');
        if (s.length <= 10) return s;
        return s.slice(0, 6) + '...' + s.slice(-4);
    }

    function formatTime(ts) {
        const date = new Date(toInt(ts, Date.now()));
        return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function isForumPageOpen() {
        const page = document.getElementById('forum-page');
        return !!(page && page.classList.contains('open'));
    }

    window.RealtimeChat = {
        init: init,
        onPageOpen: onPageOpen,
        onPageClose: onPageClose,
        refresh: function () { return refreshZoneStats(true); }
    };
})();
