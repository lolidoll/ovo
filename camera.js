/**
 * 相机功能模块
 * 处理带描述对话框的图片发送功能
 */

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
    modal.style.cssText = 'background:rgba(0,0,0,0.7);';
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // 保存imageData到全局变量以便在发送时使用（可能为null）
    window.currentPhotoData = imageData;
    
    modal.innerHTML = `
        <div class="emoji-mgmt-content" style="max-width:300px;background:#fff;border-radius:12px;overflow:hidden;">
            <div style="padding:16px;text-align:center;border-bottom:1px solid #e8e8e8;">
                <h3 style="margin:0;font-size:16px;color:#333;font-weight:600;">图片描述</h3>
            </div>
            <div style="padding:16px;">
                <textarea id="photo-desc-input" placeholder="请输入图片描述内容..." style="width:100%;height:100px;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px;resize:vertical;"></textarea>
            </div>
            <div style="padding:12px;border-top:1px solid #e8e8e8;display:flex;gap:8px;justify-content:flex-end;">
                <button onclick="document.getElementById('photo-description-modal').remove();" style="padding:8px 16px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:13px;">取消</button>
                <button onclick="sendPhotoWithDescription(null);" style="padding:8px 16px;border:none;border-radius:4px;background:#000;color:#fff;cursor:pointer;font-size:13px;">发送</button>
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
        
        const msg = {
            id: 'msg_' + Date.now(),
            type: 'sent',
            content: desc,
            isPhotoDescription: true,  // 标记为图片描述消息
            photoDescription: desc,  // 保存图片描述
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

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCameraButton);
} else {
    initCameraButton();
}