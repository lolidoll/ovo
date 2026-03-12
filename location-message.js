/**
 * 地理位置功能模块
 * 处理地理位置消息的发送、接收和显示
 * 浅粉白主题，支持可选真实定位并自动回填详细地址
 */

window.LocationMessageModule = (function() {
    let locationModalOpen = false;
    let locationMessages = new Map(); // { messageId: { locationAddress, locationDistance, geoMeta, type: 'location' } }

    function init() {
        initLocationButton();
    }

    function initLocationButton() {
        const locationBtn = document.getElementById('btn-location');
        if (locationBtn) {
            locationBtn.addEventListener('click', openLocationModal);
        }
    }

    function openLocationModal() {
        let modal = document.getElementById('location-modal');
        if (!modal) {
            modal = createLocationModal();
            document.body.appendChild(modal);
            bindLocationModalEvents(modal);
        }

        modal.style.display = 'flex';
        locationModalOpen = true;

        const addressInput = modal.querySelector('#location-address-input');
        const distanceInput = modal.querySelector('#location-distance-input');
        if (addressInput) addressInput.value = '';
        if (distanceInput) distanceInput.value = '10';

        delete modal.dataset.geoLat;
        delete modal.dataset.geoLng;
        delete modal.dataset.geoSource;
        setGeolocateStatus(modal, '可手动输入，或使用真实定位自动填充', '');

        if (addressInput) addressInput.focus();
    }

    function closeLocationModal() {
        const modal = document.getElementById('location-modal');
        if (modal) {
            modal.style.display = 'none';
            locationModalOpen = false;
        }
    }

    function createLocationModal() {
        const modal = document.createElement('div');
        modal.id = 'location-modal';
        modal.className = 'location-modal';
        modal.innerHTML = `
            <div class="location-modal-backdrop"></div>
            <div class="location-modal-content">
                <div class="location-modal-header">
                    <h3 class="location-modal-title">发送地理位置</h3>
                    <button class="location-modal-close" type="button" title="关闭">×</button>
                </div>
                <div class="location-modal-body">
                    <div class="location-form-group">
                        <label class="location-label">详细地址</label>
                        <textarea class="location-address-input" id="location-address-input" placeholder="例如：上海市浦东新区世纪大道100号" rows="3"></textarea>
                    </div>
                    <div class="location-form-group">
                        <label class="location-label">距离范围 (米)</label>
                        <input class="location-input" id="location-distance-input" type="number" placeholder="例如：120" value="10" min="1" max="99999" />
                        <div class="location-distance-tip">提示：填写你距离该地址的大致距离</div>
                    </div>
                    <div class="location-geolocate-row">
                        <button class="location-geolocate-btn" type="button">获取真实定位（可选）</button>
                        <div class="location-geolocate-status" id="location-geolocate-status">可手动输入，或使用真实定位自动填充</div>
                    </div>
                </div>
                <div class="location-modal-footer">
                    <button class="location-cancel-btn" type="button">取消</button>
                    <button class="location-send-btn" type="button">发送</button>
                </div>
            </div>
        `;
        return modal;
    }

    function bindLocationModalEvents(modal) {
        const backdrop = modal.querySelector('.location-modal-backdrop');
        const closeBtn = modal.querySelector('.location-modal-close');
        const cancelBtn = modal.querySelector('.location-cancel-btn');
        const sendBtn = modal.querySelector('.location-send-btn');
        const geolocateBtn = modal.querySelector('.location-geolocate-btn');
        const addressInput = modal.querySelector('#location-address-input');
        const distanceInput = modal.querySelector('#location-distance-input');

        if (backdrop) backdrop.onclick = closeLocationModal;
        if (closeBtn) closeBtn.onclick = closeLocationModal;
        if (cancelBtn) cancelBtn.onclick = closeLocationModal;
        if (sendBtn) sendBtn.onclick = sendLocationMessage;
        if (geolocateBtn) geolocateBtn.onclick = requestRealLocation;

        const onCtrlEnterSend = function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                sendLocationMessage();
            }
        };
        if (addressInput) addressInput.addEventListener('keydown', onCtrlEnterSend);
        if (distanceInput) distanceInput.addEventListener('keydown', onCtrlEnterSend);
    }

    function notify(message) {
        if (typeof showToast === 'function') {
            showToast(message);
        } else {
            alert(message);
        }
    }

    function setGeolocateStatus(modal, text, statusClass) {
        const statusEl = modal ? modal.querySelector('#location-geolocate-status') : null;
        if (!statusEl) return;
        statusEl.className = 'location-geolocate-status';
        if (statusClass) {
            statusEl.classList.add(statusClass);
        }
        statusEl.textContent = text;
    }

    function normalizeDistance(value) {
        const parsed = parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) return 10;
        return Math.min(parsed, 99999);
    }

    async function requestRealLocation() {
        const modal = document.getElementById('location-modal');
        if (!modal) return;

        if (!navigator.geolocation) {
            setGeolocateStatus(modal, '当前浏览器不支持定位功能，请手动填写地址', 'error');
            notify('当前浏览器不支持定位');
            return;
        }

        const geolocateBtn = modal.querySelector('.location-geolocate-btn');
        if (geolocateBtn) {
            geolocateBtn.disabled = true;
            geolocateBtn.textContent = '定位中...';
        }
        setGeolocateStatus(modal, '正在获取真实定位...', 'loading');

        try {
            const position = await getCurrentPositionAsync();
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            const reverseAddress = await reverseGeocodeAddress(latitude, longitude);
            const finalAddress = reverseAddress || `纬度${latitude.toFixed(6)}，经度${longitude.toFixed(6)}`;

            const addressInput = modal.querySelector('#location-address-input');
            if (addressInput) {
                addressInput.value = finalAddress;
                addressInput.focus();
            }

            modal.dataset.geoLat = String(latitude);
            modal.dataset.geoLng = String(longitude);
            modal.dataset.geoSource = 'browser-geolocation';

            setGeolocateStatus(modal, '已填充真实定位（可继续手动编辑地址）', 'success');
            notify('已获取真实定位');
        } catch (error) {
            console.error('[Location] 获取真实定位失败:', error);
            setGeolocateStatus(modal, '定位失败，请检查定位权限后重试', 'error');
            notify('获取定位失败，请检查定位权限');
        } finally {
            if (geolocateBtn) {
                geolocateBtn.disabled = false;
                geolocateBtn.textContent = '获取真实定位（可选）';
            }
        }
    }

    function getCurrentPositionAsync() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    }

    async function reverseGeocodeAddress(latitude, longitude) {
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=zh`;
        try {
            const response = await fetch(url, { method: 'GET' });
            if (!response.ok) {
                throw new Error('reverse_geocode_failed');
            }
            const data = await response.json();
            const parts = [
                data.principalSubdivision,
                data.city || data.locality,
                data.locality,
                data.postcode ? `邮编${data.postcode}` : ''
            ].filter(Boolean);

            const uniqParts = [...new Set(parts)];
            return uniqParts.join(' ');
        } catch (error) {
            console.warn('[Location] 逆地理编码失败，使用经纬度回退:', error);
            return '';
        }
    }

    function sendLocationMessage() {
        const modal = document.getElementById('location-modal');
        const locationAddressInput = document.getElementById('location-address-input');
        const locationDistanceInput = document.getElementById('location-distance-input');
        const locationAddress = locationAddressInput ? locationAddressInput.value.trim() : '';
        const locationDistance = normalizeDistance(locationDistanceInput ? locationDistanceInput.value : '');

        if (!locationAddress) {
            notify('请输入详细地址');
            if (locationAddressInput) locationAddressInput.focus();
            return;
        }

        if (!AppState.currentChat) {
            notify('请先打开一个对话');
            return;
        }

        const convId = AppState.currentChat.id;
        const now = new Date();
        const nowIso = now.toISOString();

        const geoLat = modal ? parseFloat(modal.dataset.geoLat || '') : NaN;
        const geoLng = modal ? parseFloat(modal.dataset.geoLng || '') : NaN;
        const geoMeta = Number.isFinite(geoLat) && Number.isFinite(geoLng)
            ? {
                lat: geoLat,
                lng: geoLng,
                source: modal.dataset.geoSource || 'browser-geolocation'
            }
            : null;

        const locationMsg = {
            id: generateMessageId(),
            conversationId: convId,
            type: 'location',
            content: `${locationAddress} (${locationDistance}米范围)`,
            locationName: '',
            locationAddress: locationAddress,
            locationDistance: locationDistance,
            sender: 'sent',
            time: nowIso,
            timestamp: nowIso
        };
        if (geoMeta) {
            locationMsg.geoMeta = geoMeta;
        }

        locationMessages.set(locationMsg.id, {
            locationName: '',
            locationAddress: locationAddress,
            locationDistance: locationDistance,
            geoMeta: geoMeta || null,
            type: 'location'
        });

        if (!AppState.messages[convId]) {
            AppState.messages[convId] = [];
        }
        AppState.messages[convId].push(locationMsg);

        const conv = AppState.conversations.find(c => c.id === convId);
        if (conv) {
            conv.lastMsg = '[位置]';
            if (typeof formatTime === 'function') {
                conv.time = formatTime(now);
            }
            conv.lastMessageTime = nowIso;
        }

        if (typeof saveToStorage === 'function') {
            saveToStorage();
        }
        if (typeof renderChatMessages === 'function') {
            renderChatMessages();
        }
        if (typeof renderConversations === 'function') {
            renderConversations();
        }

        closeLocationModal();
    }

    function sendAILocationMessage(conversationId, locationName, locationAddress = '', locationDistance = 10) {
        const normalizedAddress = String(locationAddress || locationName || '').trim();
        if (!normalizedAddress) return;

        const normalizedDistance = normalizeDistance(locationDistance);
        const nowIso = new Date().toISOString();
        const locationMsg = {
            id: generateMessageId(),
            conversationId: conversationId,
            type: 'location',
            content: `${normalizedAddress} (${normalizedDistance}米范围)`,
            locationName: locationName || '',
            locationAddress: normalizedAddress,
            locationDistance: normalizedDistance,
            sender: 'received',
            time: nowIso,
            timestamp: nowIso
        };

        locationMessages.set(locationMsg.id, {
            locationName: locationName || '',
            locationAddress: normalizedAddress,
            locationDistance: normalizedDistance,
            type: 'location'
        });

        if (!AppState.messages[conversationId]) {
            AppState.messages[conversationId] = [];
        }
        AppState.messages[conversationId].push(locationMsg);

        if (typeof saveToStorage === 'function') {
            saveToStorage();
        }
        if (typeof renderChatMessages === 'function') {
            renderChatMessages();
        }
    }

    function getLocationMessage(messageId) {
        return locationMessages.get(messageId);
    }

    function generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    return {
        init: init,
        openLocationModal: openLocationModal,
        sendLocationMessage: sendLocationMessage,
        sendAILocationMessage: sendAILocationMessage,
        getLocationMessage: getLocationMessage,
        closeLocationModal: closeLocationModal
    };
})();

document.addEventListener('DOMContentLoaded', function() {
    if (typeof LocationMessageModule !== 'undefined') {
        LocationMessageModule.init();
    }
});

