/**
 * 地理位置功能模块
 * 处理地理位置消息的发送、接收和显示
 * 采用黑白简约风设计，参考QQ发送定位的效果
 */

const LocationMessageModule = (function() {
    // 私有变量
    let locationModalOpen = false;
    let locationMessages = new Map(); // 存储地理位置消息内容 { messageId: { locationName, address, type: 'location' } }

    // 初始化地理位置功能
    function init() {
        initLocationButton();
        initLocationModal();
    }

    // 初始化地理位置按钮事件
    function initLocationButton() {
        const locationBtn = document.getElementById('btn-location');
        if (locationBtn) {
            locationBtn.addEventListener('click', openLocationModal);
        }
    }

    // 打开地理位置输入弹窗
    function openLocationModal() {
        // 创建或获取弹窗容器
        let modal = document.getElementById('location-modal');
        if (!modal) {
            modal = createLocationModal();
            document.body.appendChild(modal);
        }

        modal.style.display = 'flex';
        locationModalOpen = true;
        document.getElementById('location-input').value = '';
        document.getElementById('location-address-input').value = '';
        document.getElementById('location-input').focus();

        // 添加遮罩和关闭事件
        const backdrop = modal.querySelector('.location-modal-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', closeLocationModal);
        }

        // 关闭按钮
        const closeBtn = modal.querySelector('.location-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeLocationModal);
        }

        // 发送按钮
        const sendBtn = modal.querySelector('.location-send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', sendLocationMessage);
        }

        // 回车快速发送
        const input = modal.querySelector('.location-input');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    sendLocationMessage();
                }
            });
        }
    }

    // 关闭地理位置输入弹窗
    function closeLocationModal() {
        const modal = document.getElementById('location-modal');
        if (modal) {
            modal.style.display = 'none';
            locationModalOpen = false;
        }
    }

    // 创建地理位置输入弹窗
    function createLocationModal() {
        const modal = document.createElement('div');
        modal.id = 'location-modal';
        modal.className = 'location-modal';
        modal.innerHTML = `
            <div class="location-modal-backdrop"></div>
            <div class="location-modal-content">
                <div class="location-modal-header">
                    <h3 class="location-modal-title">发送地理位置</h3>
                    <button class="location-modal-close" title="关闭">×</button>
                </div>
                <div class="location-modal-body">
                    <div class="location-form-group">
                        <label class="location-label">位置名称</label>
                        <input class="location-input" id="location-input" type="text" placeholder="例如：天安门广场" />
                    </div>
                    <div class="location-form-group">
                        <label class="location-label">详细地址</label>
                        <textarea class="location-address-input" id="location-address-input" placeholder="例如：北京市东城区东长安街1号" rows="3"></textarea>
                    </div>
                    <div class="location-form-group">
                        <label class="location-label">距离范围 (米)</label>
                        <input class="location-input" id="location-distance-input" type="number" placeholder="例如：5" value="5" min="1" max="9999" />
                    </div>
                    <div class="location-tips">
                        <div class="location-tip-item">按 Ctrl+Enter 快速发送</div>
                    </div>
                </div>
                <div class="location-modal-footer">
                    <button class="location-cancel-btn">取消</button>
                    <button class="location-send-btn">发送</button>
                </div>
            </div>
        `;

        // 绑定取消按钮
        const cancelBtn = modal.querySelector('.location-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeLocationModal);
        }

        return modal;
    }

    // 发送地理位置消息
    function sendLocationMessage() {
        const locationNameInput = document.getElementById('location-input');
        const locationAddressInput = document.getElementById('location-address-input');
        const locationDistanceInput = document.getElementById('location-distance-input');
        const locationName = locationNameInput.value.trim();
        const locationAddress = locationAddressInput.value.trim();
        const locationDistance = parseInt(locationDistanceInput.value) || 5;

        if (!locationName) {
            alert('请输入位置名称');
            return;
        }

        // 获取当前对话
        if (!AppState.currentChat) {
            alert('请先打开一个对话');
            return;
        }

        const convId = AppState.currentChat.id;

        // 创建地理位置消息对象
        const locationMsg = {
            id: generateMessageId(),
            conversationId: convId,
            type: 'location',
            content: `${locationName}${locationAddress ? ' - ' + locationAddress : ''} (${locationDistance}米范围)`,
            locationName: locationName,
            locationAddress: locationAddress || '',
            locationDistance: locationDistance,
            sender: 'sent',
            timestamp: new Date().toISOString()
        };

        // 保存地理位置消息
        locationMessages.set(locationMsg.id, {
            locationName: locationName,
            locationAddress: locationAddress,
            locationDistance: locationDistance,
            type: 'location'
        });

        // 将消息添加到对话
        if (!AppState.messages[convId]) {
            AppState.messages[convId] = [];
        }
        AppState.messages[convId].push(locationMsg);

        // 保存到本地存储
        if (typeof saveToStorage === 'function') {
            saveToStorage();
        }

        // 重新渲染对话消息
        if (typeof renderChatMessages === 'function') {
            renderChatMessages();
        }

        // 关闭弹窗
        closeLocationModal();

        // 触发AI回复
        if (typeof callApiWithConversation === 'function') {
            callApiWithConversation();
        }
    }

    // 显示地理位置详情
    function showLocationDetails(locationName, locationAddress, locationBubbleEl) {
        // locationBubbleEl 就是 .location-bubble 元素
        if (!locationBubbleEl) {
            return;
        }

        // 检查是否已经显示过详情
        let nextEl = locationBubbleEl.nextElementSibling;
        if (nextEl && nextEl.classList.contains('location-details')) {
            // 第二次点击，隐藏详情
            nextEl.remove();
            return;
        }

        // 创建详情显示元素 - 插入到location-bubble的后面
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'location-details';
        detailsDiv.innerHTML = `
            <div class="location-detail-item">
                <span class="location-detail-label">位置：</span>
                <span class="location-detail-value">${escapeHtml(locationName)}</span>
            </div>
            ${locationAddress ? `
                <div class="location-detail-item">
                    <span class="location-detail-label">地址：</span>
                    <span class="location-detail-value">${escapeHtml(locationAddress)}</span>
                </div>
            ` : ''}
        `;

        // 插入到location-bubble的后面
        locationBubbleEl.parentNode.insertBefore(detailsDiv, locationBubbleEl.nextSibling);
    }

    // AI回复地理位置消息
    function sendAILocationMessage(conversationId, locationName, locationAddress = '', locationDistance = 5) {
        const locationMsg = {
            id: generateMessageId(),
            conversationId: conversationId,
            type: 'location',
            content: `${locationName}${locationAddress ? ' - ' + locationAddress : ''} (${locationDistance}米范围)`,
            locationName: locationName,
            locationAddress: locationAddress,
            locationDistance: locationDistance,
            sender: 'received',
            timestamp: new Date().toISOString()
        };

        // 保存地理位置消息
        locationMessages.set(locationMsg.id, {
            locationName: locationName,
            locationAddress: locationAddress,
            locationDistance: locationDistance,
            type: 'location'
        });

        // 将消息添加到对话
        if (!AppState.messages[conversationId]) {
            AppState.messages[conversationId] = [];
        }
        AppState.messages[conversationId].push(locationMsg);

        // 保存到本地存储
        if (typeof saveToStorage === 'function') {
            saveToStorage();
        }

        // 重新渲染对话消息
        if (typeof renderChatMessages === 'function') {
            renderChatMessages();
        }
    }

    // 获取地理位置消息详情
    function getLocationMessage(messageId) {
        return locationMessages.get(messageId);
    }

    // 生成消息ID
    function generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 转义HTML字符
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // 导出公开方法
    return {
        init: init,
        sendLocationMessage: sendLocationMessage,
        sendAILocationMessage: sendAILocationMessage,
        showLocationDetails: showLocationDetails,
        getLocationMessage: getLocationMessage,
        closeLocationModal: closeLocationModal
    };
})();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    if (typeof LocationMessageModule !== 'undefined') {
        LocationMessageModule.init();
    }
});
