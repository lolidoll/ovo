// 用户信息编辑功能

(function() {
    'use strict';

    // 初始化用户信息编辑功能
    function initMineEdit() {
        console.log('初始化用户信息编辑功能');
        
        // 加载保存的用户信息
        loadUserInfo();
        
        // 绑定编辑按钮
        const editBtn = document.getElementById('mine-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', openEditModal);
        }
        
        // 绑定关闭按钮
        const closeBtn = document.getElementById('mine-edit-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeEditModal);
        }
        
        // 绑定取消按钮
        const cancelBtn = document.getElementById('mine-edit-btn-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeEditModal);
        }
        
        // 绑定保存按钮
        const saveBtn = document.getElementById('mine-edit-btn-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveUserInfo);
        }
        
        // 绑定头像输入框变化事件
        const avatarInput = document.getElementById('mine-edit-avatar-input');
        if (avatarInput) {
            avatarInput.addEventListener('input', updateAvatarPreview);
        }
        
        // 绑定头像按钮点击事件
        const avatarBtn = document.getElementById('mine-edit-avatar-btn');
        if (avatarBtn) {
            avatarBtn.addEventListener('click', () => {
                avatarInput.focus();
            });
        }
        
        // 点击弹窗背景关闭
        const modal = document.getElementById('mine-edit-modal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeEditModal();
                }
            });
        }
    }
    
    // 打开编辑弹窗
    function openEditModal() {
        console.log('打开编辑弹窗');
        
        const modal = document.getElementById('mine-edit-modal');
        if (!modal) return;
        
        // 加载当前用户信息到表单
        const userInfo = getUserInfo();
        
        document.getElementById('mine-edit-avatar-input').value = userInfo.avatar;
        document.getElementById('mine-edit-avatar-preview').src = userInfo.avatar;
        document.getElementById('mine-edit-name-input').value = userInfo.name;
        document.getElementById('mine-edit-id-input').value = userInfo.id;
        document.getElementById('mine-edit-follow-input').value = userInfo.followCount;
        document.getElementById('mine-edit-fans-input').value = userInfo.fansCount;
        
        // 显示弹窗
        modal.classList.add('active');
    }
    
    // 关闭编辑弹窗
    function closeEditModal() {
        console.log('关闭编辑弹窗');
        
        const modal = document.getElementById('mine-edit-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    // 更新头像预览
    function updateAvatarPreview() {
        const avatarInput = document.getElementById('mine-edit-avatar-input');
        const avatarPreview = document.getElementById('mine-edit-avatar-preview');
        
        if (avatarInput && avatarPreview) {
            const url = avatarInput.value.trim();
            if (url) {
                avatarPreview.src = url;
            }
        }
    }
    
    // 获取用户信息
    function getUserInfo() {
        const defaultInfo = {
            avatar: 'https://picsum.photos/55/55?random=50',
            name: '淘宝用户123456',
            id: '1234567890',
            followCount: 0,
            fansCount: 12
        };
        
        try {
            const saved = localStorage.getItem('taobao_user_info');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('读取用户信息失败:', error);
        }
        
        return defaultInfo;
    }
    
    // 加载用户信息到页面
    function loadUserInfo() {
        const userInfo = getUserInfo();
        
        // 更新头像
        const avatarImg = document.getElementById('mine-avatar-img');
        if (avatarImg) {
            avatarImg.src = userInfo.avatar;
        }
        
        // 更新用户名
        const nameDisplay = document.getElementById('mine-name-display');
        if (nameDisplay) {
            nameDisplay.textContent = userInfo.name;
        }
        
        // 更新ID
        const idDisplay = document.getElementById('mine-id-display');
        if (idDisplay) {
            idDisplay.textContent = `ID: ${userInfo.id}`;
        }
        
        // 更新关注数
        const followNum = document.getElementById('mine-follow-num');
        if (followNum) {
            followNum.textContent = userInfo.followCount;
        }
        
        // 更新粉丝数
        const fansNum = document.getElementById('mine-fans-num');
        if (fansNum) {
            fansNum.textContent = userInfo.fansCount;
        }
        
        console.log('用户信息已加载:', userInfo);
    }
    
    // 保存用户信息
    function saveUserInfo() {
        console.log('保存用户信息');
        
        // 获取表单数据
        const avatar = document.getElementById('mine-edit-avatar-input').value.trim();
        const name = document.getElementById('mine-edit-name-input').value.trim();
        const id = document.getElementById('mine-edit-id-input').value.trim();
        const followCount = parseInt(document.getElementById('mine-edit-follow-input').value) || 0;
        const fansCount = parseInt(document.getElementById('mine-edit-fans-input').value) || 0;
        
        // 验证数据
        if (!name) {
            alert('请输入用户名');
            return;
        }
        
        if (!id) {
            alert('请输入淘宝ID');
            return;
        }
        
        if (!avatar) {
            alert('请输入头像URL');
            return;
        }
        
        // 构建用户信息对象
        const userInfo = {
            avatar: avatar,
            name: name,
            id: id,
            followCount: followCount,
            fansCount: fansCount
        };
        
        // 保存到localStorage
        try {
            localStorage.setItem('taobao_user_info', JSON.stringify(userInfo));
            console.log('用户信息已保存:', userInfo);
            
            // 更新页面显示
            loadUserInfo();
            
            // 关闭弹窗
            closeEditModal();
            
            // 显示成功提示
            alert('保存成功！');
        } catch (error) {
            console.error('保存用户信息失败:', error);
            alert('保存失败，请重试');
        }
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMineEdit);
    } else {
        initMineEdit();
    }
    
    // 暴露到全局
    window.MineEdit = {
        init: initMineEdit,
        loadUserInfo: loadUserInfo
    };
    
})();