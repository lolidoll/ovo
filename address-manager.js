// 地址管理系统

// 地址管理器
const AddressManager = {
    // 获取所有地址
    getAddresses: function() {
        const addresses = localStorage.getItem('user_addresses');
        return addresses ? JSON.parse(addresses) : [];
    },

    // 保存地址列表
    saveAddresses: function(addresses) {
        localStorage.setItem('user_addresses', JSON.stringify(addresses));
    },

    // 添加地址
    addAddress: function(address) {
        const addresses = this.getAddresses();
        
        // 如果是默认地址，取消其他地址的默认状态
        if (address.isDefault) {
            addresses.forEach(addr => addr.isDefault = false);
        }
        
        // 如果是第一个地址，自动设为默认
        if (addresses.length === 0) {
            address.isDefault = true;
        }
        
        address.id = Date.now().toString();
        address.createTime = Date.now();
        addresses.push(address);
        
        this.saveAddresses(addresses);
        return address.id;
    },

    // 更新地址
    updateAddress: function(id, updates) {
        const addresses = this.getAddresses();
        const index = addresses.findIndex(addr => addr.id === id);
        
        if (index !== -1) {
            // 如果设为默认，取消其他地址的默认状态
            if (updates.isDefault) {
                addresses.forEach(addr => addr.isDefault = false);
            }
            
            addresses[index] = { ...addresses[index], ...updates };
            this.saveAddresses(addresses);
            return true;
        }
        return false;
    },

    // 删除地址
    deleteAddress: function(id) {
        let addresses = this.getAddresses();
        const index = addresses.findIndex(addr => addr.id === id);
        
        if (index !== -1) {
            const wasDefault = addresses[index].isDefault;
            addresses.splice(index, 1);
            
            // 如果删除的是默认地址，将第一个地址设为默认
            if (wasDefault && addresses.length > 0) {
                addresses[0].isDefault = true;
            }
            
            this.saveAddresses(addresses);
            return true;
        }
        return false;
    },

    // 设置默认地址
    setDefaultAddress: function(id) {
        const addresses = this.getAddresses();
        
        addresses.forEach(addr => {
            addr.isDefault = (addr.id === id);
        });
        
        this.saveAddresses(addresses);
    },

    // 获取默认地址
    getDefaultAddress: function() {
        const addresses = this.getAddresses();
        return addresses.find(addr => addr.isDefault) || addresses[0] || null;
    },

    // 根据ID获取地址
    getAddressById: function(id) {
        const addresses = this.getAddresses();
        return addresses.find(addr => addr.id === id);
    }
};

// 地址管理页面
const AddressManagePage = {
    currentEditId: null,

    init: function() {
        this.bindEvents();
    },

    bindEvents: function() {
        // 打开地址管理页面
        const addressMenuItem = document.querySelector('.mine-menu-item:has(.fa-map-marker-alt)');
        if (addressMenuItem) {
            addressMenuItem.addEventListener('click', () => {
                this.show();
            });
        }

        // 返回按钮
        const backBtn = document.getElementById('address-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // 添加地址按钮
        const addBtn = document.getElementById('address-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                AddressEditPage.show();
            });
        }
    },

    show: function() {
        const page = document.getElementById('address-manage-page');
        if (page) {
            page.classList.add('active');
            this.render();
        }
    },

    hide: function() {
        const page = document.getElementById('address-manage-page');
        if (page) {
            page.classList.remove('active');
        }
    },

    render: function() {
        const addresses = AddressManager.getAddresses();
        const listEl = document.getElementById('address-list');
        const emptyEl = document.getElementById('address-empty');

        if (addresses.length === 0) {
            if (listEl) listEl.innerHTML = '';
            if (emptyEl) emptyEl.classList.add('active');
            return;
        }

        if (emptyEl) emptyEl.classList.remove('active');
        
        if (listEl) {
            const html = addresses.map(addr => `
                <div class="address-item" data-id="${addr.id}">
                    <div class="address-item-top">
                        <div class="address-item-name">${addr.name}</div>
                        <div class="address-item-phone">${addr.phone}</div>
                        ${addr.isDefault ? '<div class="address-item-default">默认</div>' : ''}
                    </div>
                    <div class="address-item-region">${addr.region}</div>
                    <div class="address-item-detail">${addr.detail}</div>
                    <div class="address-item-actions">
                        <div class="address-item-btn ${addr.isDefault ? 'default' : ''}" data-action="default" data-id="${addr.id}">
                            ${addr.isDefault ? '默认地址' : '设为默认'}
                        </div>
                        <div class="address-item-btn" data-action="edit" data-id="${addr.id}">编辑</div>
                        <div class="address-item-btn" data-action="delete" data-id="${addr.id}">删除</div>
                    </div>
                </div>
            `).join('');
            
            listEl.innerHTML = html;
            this.bindItemEvents();
        }
    },

    bindItemEvents: function() {
        const listEl = document.getElementById('address-list');
        if (!listEl) return;

        // 地址项按钮点击
        listEl.querySelectorAll('.address-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                const id = e.currentTarget.dataset.id;

                switch(action) {
                    case 'default':
                        if (!e.currentTarget.classList.contains('default')) {
                            AddressManager.setDefaultAddress(id);
                            this.render();
                        }
                        break;
                    case 'edit':
                        AddressEditPage.show(id);
                        break;
                    case 'delete':
                        if (confirm('确定要删除这个地址吗？')) {
                            AddressManager.deleteAddress(id);
                            this.render();
                        }
                        break;
                }
            });
        });
    }
};

// 地址编辑页面
const AddressEditPage = {
    currentId: null,

    init: function() {
        this.bindEvents();
    },

    bindEvents: function() {
        // 返回按钮
        const backBtn = document.getElementById('address-edit-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // 默认地址开关
        const switchEl = document.getElementById('address-default-switch');
        if (switchEl) {
            switchEl.addEventListener('click', () => {
                switchEl.classList.toggle('active');
            });
        }

        // 保存按钮
        const saveBtn = document.getElementById('address-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.save();
            });
        }

        // 删除按钮
        const deleteBtn = document.getElementById('address-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('确定要删除这个地址吗？')) {
                    if (this.currentId) {
                        AddressManager.deleteAddress(this.currentId);
                        this.hide();
                        AddressManagePage.render();
                    }
                }
            });
        }
    },

    show: function(id = null) {
        this.currentId = id;
        const page = document.getElementById('address-edit-page');
        const title = document.getElementById('address-edit-title');
        const deleteBtn = document.getElementById('address-delete-btn');

        if (id) {
            // 编辑模式
            if (title) title.textContent = '编辑地址';
            if (deleteBtn) deleteBtn.style.display = 'block';
            this.loadAddress(id);
        } else {
            // 新增模式
            if (title) title.textContent = '新增地址';
            if (deleteBtn) deleteBtn.style.display = 'none';
            this.clearForm();
        }

        if (page) {
            page.classList.add('active');
        }
    },

    hide: function() {
        const page = document.getElementById('address-edit-page');
        if (page) {
            page.classList.remove('active');
        }
        this.currentId = null;
    },

    loadAddress: function(id) {
        const address = AddressManager.getAddressById(id);
        if (!address) return;

        document.getElementById('address-name').value = address.name || '';
        document.getElementById('address-phone').value = address.phone || '';
        document.getElementById('address-region').value = address.region || '';
        document.getElementById('address-detail').value = address.detail || '';
        
        const switchEl = document.getElementById('address-default-switch');
        if (switchEl) {
            if (address.isDefault) {
                switchEl.classList.add('active');
            } else {
                switchEl.classList.remove('active');
            }
        }
    },

    clearForm: function() {
        document.getElementById('address-name').value = '';
        document.getElementById('address-phone').value = '';
        document.getElementById('address-region').value = '';
        document.getElementById('address-detail').value = '';
        
        const switchEl = document.getElementById('address-default-switch');
        if (switchEl) {
            switchEl.classList.remove('active');
        }
    },

    save: function() {
        const name = document.getElementById('address-name').value.trim();
        const phone = document.getElementById('address-phone').value.trim();
        const region = document.getElementById('address-region').value.trim();
        const detail = document.getElementById('address-detail').value.trim();
        const isDefault = document.getElementById('address-default-switch').classList.contains('active');

        // 验证
        if (!name) {
            alert('请输入收货人姓名');
            return;
        }
        if (!phone) {
            alert('请输入手机号码');
            return;
        }
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            alert('请输入正确的手机号码');
            return;
        }
        if (!region) {
            alert('请输入所在地区');
            return;
        }
        if (!detail) {
            alert('请输入详细地址');
            return;
        }

        const addressData = {
            name,
            phone,
            region,
            detail,
            isDefault
        };

        if (this.currentId) {
            // 更新
            AddressManager.updateAddress(this.currentId, addressData);
        } else {
            // 新增
            AddressManager.addAddress(addressData);
        }

        this.hide();
        AddressManagePage.render();
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    AddressManagePage.init();
    AddressEditPage.init();
});