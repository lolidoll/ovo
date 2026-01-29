/**
 * 照片功能模块
 * 处理无描述对话框的直接图片发送功能
 */

// 初始化照片按钮事件监听
function initPhotoButton() {
    const btnPhoto = document.getElementById('btn-photo');
    const toolbarFile = document.getElementById('toolbar-file-input');
    
    // 照片按钮 - 无描述对话框，直接发送
    if (btnPhoto && toolbarFile) {
        btnPhoto.addEventListener('click', function() {
            toolbarFile.dataset.mode = 'no-description';
            toolbarFile.click();
        });
    }
    
    // 文件选择事件处理
    if (toolbarFile) {
        toolbarFile.addEventListener('change', function(e) {
            handleToolbarFileSelect(e.target.files, this.dataset.mode || 'with-description');
        });
    }
}

// 处理工具栏文件选择
function handleToolbarFileSelect(files, mode = 'with-description') {
    if (!files || files.length === 0) return;
    if (!AppState.currentChat) {
        showToast('请先打开会话再发送图片');
        return;
    }
    
    // 读取第一个文件
    const file = files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        
        if (mode === 'no-description') {
            // 照片按钮：直接发送，需要AI识图
            sendPhotoWithDescription(imageData, '', true);
        } else {
            // 相机按钮：显示描述对话框，不需要AI识图
            showPhotoDescriptionDialog(imageData);
        }
    };
    reader.readAsDataURL(file);
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhotoButton);
} else {
    initPhotoButton();
}