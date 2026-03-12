/**
 * 相机功能模块
 * 处理带描述对话框的图片发送功能
 */

const PHOTO_DESCRIPTION_CARD_IMAGE = 'https://img.heliar.top/file/1773290751509_IMG_20260312_124453.jpg';

// 初始化相机按钮事件监听
function initCameraButton() {
    const btnCamera = document.getElementById('btn-camera');
    
    // 相机按钮 - 直接显示文字描述对话框
    if (btnCamera) {
        btnCamera.addEventListener('click', function() {
            showPhotoDescriptionDialog(null);
        });
    }
}

// 显示图片描述对话框
function showPhotoDescriptionDialog(imageData) {
    let modal = document.getElementById('photo-description-modal');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'photo-description-modal';
    modal.className = 'emoji-mgmt-modal show';
    modal.style.cssText = 'background:rgba(255,236,246,0.72);backdrop-filter:blur(4px);';
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // 保存imageData到全局变量以便在发送时使用（可能为null）
    window.currentPhotoData = imageData;
    
    modal.innerHTML = `
        <div class="emoji-mgmt-content" style="max-width:320px;background:linear-gradient(180deg,#fffdfd 0%,#fff5fa 100%);border-radius:16px;overflow:hidden;border:1px solid #ffd7e8;box-shadow:0 14px 36px rgba(226,130,164,0.24);">
            <div style="padding:16px 16px 14px;text-align:center;border-bottom:1px solid #ffe3ef;background:linear-gradient(180deg,#fff8fb 0%,#fff2f8 100%);">
                <h3 style="margin:0;font-size:16px;color:#9f4e6f;font-weight:700;letter-spacing:0.4px;">图片描述</h3>
            </div>
            <div style="padding:16px;">
                <textarea id="photo-desc-input" placeholder="请输入图片描述内容..." style="width:100%;height:104px;padding:10px 11px;border:1px solid #f3bfd5;border-radius:10px;font-size:13px;line-height:1.5;resize:vertical;background:#fffdfd;color:#5f3847;outline:none;"></textarea>
            </div>
            <div style="padding:12px 14px;border-top:1px solid #ffe4ef;display:flex;gap:10px;justify-content:flex-end;background:#fff9fc;">
                <button onclick="document.getElementById('photo-description-modal').remove();" style="padding:8px 16px;border:1px solid #efc3d7;border-radius:9px;background:#fff;cursor:pointer;font-size:13px;color:#8f4d67;">取消</button>
                <button onclick="sendPhotoWithDescription(window.currentPhotoData);" style="padding:8px 18px;border:none;border-radius:9px;background:linear-gradient(135deg,#ff7cae 0%,#ff94bf 100%);box-shadow:0 6px 14px rgba(255,123,172,0.35);color:#fff;cursor:pointer;font-size:13px;font-weight:600;">发送</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('photo-desc-input').focus();
}

// 发送带描述的图片
function sendPhotoWithDescription(imageData, descFromParam, needsVision) {
    let desc = '';
    
    // 如果参数中有描述，使用参数中的描述（直接发送模式）
    if (typeof descFromParam !== 'undefined') {
        desc = descFromParam;
    } else {
        // 否则从输入框获取描述（有对话框模式）
        const descInput = document.getElementById('photo-desc-input');
        desc = descInput ? descInput.value.trim() : '';
    }
    
    if (!AppState.currentChat) {
        showToast('会话已关闭');
        return;
    }
    
    if (!AppState.messages[AppState.currentChat.id]) {
        AppState.messages[AppState.currentChat.id] = [];
    }
    
    // 判断消息类型
    if (imageData && needsVision) {
        // 照片按钮：有图片数据且需要AI识图 - 发送图片消息
        const messageContent = desc || '[图片]';
        
        const msg = {
            id: 'msg_' + Date.now(),
            type: 'sent',
            content: messageContent,
            imageData: imageData,  // 保存图片数据
            isImage: true,
            photoDescription: desc,  // 保存图片描述（AI后台读取）
            needsVision: true,  // 标记需要AI识图
            time: new Date().toISOString()
        };
        
        AppState.messages[AppState.currentChat.id].push(msg);
        
        const conv = AppState.conversations.find(c => c.id === AppState.currentChat.id);
        if (conv) {
            conv.lastMsg = '[图片]';
            conv.time = formatTime(new Date());
            conv.lastMessageTime = msg.time;
        }
    } else {
        // 相机按钮：无图片数据 - 发送文字描述卡片
        if (!desc) {
            showToast('请输入图片描述');
            return;
        }

        const cardImageUrl = window.PHOTO_DESCRIPTION_CARD_IMAGE || PHOTO_DESCRIPTION_CARD_IMAGE;
        
        const msg = {
            id: 'msg_' + Date.now(),
            type: 'sent',
            content: desc,
            isPhotoDescription: true,  // 标记为图片描述消息
            photoDescription: desc,  // 保存图片描述
            photoCardImage: cardImageUrl,  // 图片描述卡片封面图
            time: new Date().toISOString()
        };
        
        AppState.messages[AppState.currentChat.id].push(msg);
        
        const conv = AppState.conversations.find(c => c.id === AppState.currentChat.id);
        if (conv) {
            conv.lastMsg = '[图片描述]';
            conv.time = formatTime(new Date());
            conv.lastMessageTime = msg.time;
        }
    }
    
    saveToStorage();
    renderChatMessages();
    renderConversations();
    
    // 关闭弹窗
    const modal = document.getElementById('photo-description-modal');
    if (modal) modal.remove();
}

// 暴露函数到全局作用域
window.showPhotoDescriptionDialog = showPhotoDescriptionDialog;
window.sendPhotoWithDescription = sendPhotoWithDescription;
window.PHOTO_DESCRIPTION_CARD_IMAGE = PHOTO_DESCRIPTION_CARD_IMAGE;

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCameraButton);
} else {
    initCameraButton();
}
