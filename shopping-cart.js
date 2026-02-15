
// 购物车和订单系统管理
(function() {
    'use strict';

    // 显示支付成功弹窗
    function showPaymentSuccessModal(orderAmount, newBalance) {
        const modal = document.createElement('div');
        modal.className = 'shopping-payment-success-modal';
        modal.innerHTML = `
            <div class="shopping-modal-overlay"></div>
            <div class="shopping-modal-box">
                <div class="shopping-modal-icon success">
                    <i class="fa fa-check-circle"></i>
                </div>
                <div class="shopping-modal-title">支付成功！</div>
                <div class="shopping-payment-details">
                    <div class="payment-detail-item">
                        <span class="detail-label">支付金额：</span>
                        <span class="detail-value">¥${orderAmount.toFixed(2)}</span>
                    </div>
                    <div class="payment-detail-item">
                        <span class="detail-label">当前余额：</span>
                        <span class="detail-value balance">¥${newBalance.toFixed(2)}</span>
                    </div>
                    <div class="payment-detail-tip">
                        <i class="fa fa-truck"></i> 订单将在3秒后自动发货
                    </div>
                </div>
                <button class="shopping-modal-btn" onclick="this.closest('.shopping-payment-success-modal').remove()">确定</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加显示动画
        setTimeout(() => modal.classList.add('show'), 10);
        
        // 3秒后自动关闭
        setTimeout(() => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }, 3000);
    }

    // 显示美化的确认弹窗
    function showConfirmModal(message, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'shopping-confirm-modal';
        modal.innerHTML = `
            <div class="shopping-modal-overlay"></div>
            <div class="shopping-modal-box">
                <div class="shopping-modal-icon warning">
                    <i class="fa fa-exclamation-circle"></i>
                </div>
                <div class="shopping-modal-message">${message}</div>
                <div class="shopping-modal-buttons">
                    <button class="shopping-modal-btn cancel">取消</button>
                    <button class="shopping-modal-btn confirm">确定</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加显示动画
        setTimeout(() => modal.classList.add('show'), 10);
        
        // 绑定按钮事件
        const cancelBtn = modal.querySelector('.shopping-modal-btn.cancel');
        const confirmBtn = modal.querySelector('.shopping-modal-btn.confirm');
        
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };
        
        cancelBtn.onclick = closeModal;
        confirmBtn.onclick = () => {
            onConfirm();
            closeModal();
        };
        
        // 点击遮罩关闭
        modal.querySelector('.shopping-modal-overlay').onclick = closeModal;
    }

    // 购物车数据存储
    const CartManager = {
        // 获取购物车数据
        getCart: function() {
            const cart = localStorage.getItem('shopping_cart');
            return cart ? JSON.parse(cart) : [];
        },

        // 保存购物车数据
        saveCart: function(cart) {
            localStorage.setItem('shopping_cart', JSON.stringify(cart));
        },

        // 添加商品到购物车
        addItem: function(goods) {
            const cart = this.getCart();
            
            // 使用商品名称作为唯一标识进行匹配
            const existingItem = cart.find(item => item.name === goods.name);
            
            console.log('添加商品到购物车:', goods.name, '现有商品:', existingItem ? '找到' : '未找到');
            
            if (existingItem) {
                existingItem.quantity += 1;
                console.log('累加数量，新数量:', existingItem.quantity);
            } else {
                const newItem = {
                    id: goods.name, // 使用商品名称作为ID
                    image: goods.image,
                    name: goods.name,
                    price: goods.price,
                    spec: '默认规格',
                    quantity: 1,
                    checked: true,
                    addTime: Date.now()
                };
                cart.push(newItem);
                console.log('添加新商品:', newItem);
            }
            
            this.saveCart(cart);
            return true;
        },

        // 删除购物车商品
        removeItem: function(itemId) {
            let cart = this.getCart();
            cart = cart.filter(item => item.id !== itemId);
            this.saveCart(cart);
        },

        // 更新商品数量
        updateQuantity: function(itemId, quantity) {
            const cart = this.getCart();
            const item = cart.find(item => item.id === itemId);
            if (item) {
                item.quantity = Math.max(1, quantity);
                this.saveCart(cart);
            }
        },

        // 更新商品选中状态
        updateChecked: function(itemId, checked) {
            const cart = this.getCart();
            const item = cart.find(item => item.id === itemId);
            if (item) {
                item.checked = checked;
                this.saveCart(cart);
            }
        },

        // 全选/取消全选
        toggleAllChecked: function(checked) {
            const cart = this.getCart();
            cart.forEach(item => item.checked = checked);
            this.saveCart(cart);
        },

        // 获取选中的商品
        getCheckedItems: function() {
            return this.getCart().filter(item => item.checked);
        },

        // 计算选中商品总价
        getTotal: function() {
            const checkedItems = this.getCheckedItems();
            return checkedItems.reduce((total, item) => {
                return total + (parseFloat(item.price) * item.quantity);
            }, 0);
        },

        // 清空购物车
        clearCart: function() {
            this.saveCart([]);
        }
    };

    // 快递公司列表（中国主流快递公司）
    const EXPRESS_COMPANIES = [
        { name: '顺丰速运', code: 'SF', prefix: 'SF' },
        { name: '圆通速递', code: 'YTO', prefix: 'YT' },
        { name: '中通快递', code: 'ZTO', prefix: 'ZTO' },
        { name: '申通快递', code: 'STO', prefix: 'STO' },
        { name: '韵达快递', code: 'YD', prefix: 'YD' },
        { name: '百世快递', code: 'BEST', prefix: 'BT' },
        { name: '天天快递', code: 'TTES', prefix: 'TT' },
        { name: '邮政EMS', code: 'EMS', prefix: 'EMS' },
        { name: '德邦快递', code: 'DBL', prefix: 'DB' },
        { name: '京东物流', code: 'JD', prefix: 'JD' },
        { name: '极兔速递', code: 'JTSD', prefix: 'JT' },
        { name: '菜鸟速递', code: 'CNSD', prefix: 'CN' }
    ];

    // 订单数据存储
    const OrderManager = {
        // 获取所有订单
        getOrders: function() {
            const orders = localStorage.getItem('shopping_orders');
            return orders ? JSON.parse(orders) : [];
        },

        // 保存订单
        saveOrders: function(orders) {
            localStorage.setItem('shopping_orders', JSON.stringify(orders));
        },

        // 随机选择快递公司并生成物流单号
        generateLogistics: function() {
            const company = EXPRESS_COMPANIES[Math.floor(Math.random() * EXPRESS_COMPANIES.length)];
            const randomNum = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
            return {
                company: company.name,
                trackingNo: company.prefix + randomNum
            };
        },

        // 创建新订单
        createOrder: function(orderData) {
            const orders = this.getOrders();
            const newOrder = {
                id: 'ORD' + Date.now(),
                orderNo: this.generateOrderNo(),
                goods: orderData.goods,
                totalAmount: orderData.totalAmount,
                address: orderData.address,
                message: orderData.message || '',
                paymentMethod: '',
                status: 'unpaid', // unpaid, unshipped, shipped, completed, cancelled
                createTime: Date.now(),
                payTime: null,
                shipTime: null,
                completeTime: null,
                logistics: null
            };
            
            orders.unshift(newOrder);
            this.saveOrders(orders);
            return newOrder;
        },

        // 生成订单号
        generateOrderNo: function() {
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
            return `${year}${month}${day}${random}`;
        },

        // 更新订单状态
        updateOrderStatus: function(orderId, status, extraData = {}) {
            const orders = this.getOrders();
            const order = orders.find(o => o.id === orderId);
            if (order) {
                order.status = status;
                
                if (status === 'unshipped' && !order.payTime) {
                    order.payTime = Date.now();
                    order.paymentMethod = extraData.paymentMethod || '支付宝';
                }
                if (status === 'shipped' && !order.shipTime) {
                    order.shipTime = Date.now();
                    order.logistics = extraData.logistics || this.generateLogistics();
                }
                if (status === 'completed' && !order.completeTime) {
                    order.completeTime = Date.now();
                }
                
                this.saveOrders(orders);
            }
        },

        // 删除订单
        deleteOrder: function(orderId) {
            let orders = this.getOrders();
            orders = orders.filter(o => o.id !== orderId);
            this.saveOrders(orders);
        },

        // 根据状态筛选订单
        getOrdersByStatus: function(status) {
            const orders = this.getOrders();
            if (status === 'all') return orders;
            return orders.filter(o => o.status === status);
        },

        // 获取订单详情
        getOrderById: function(orderId) {
            const orders = this.getOrders();
            return orders.find(o => o.id === orderId);
        }
    };

    // 购物车页面管理
    const CartPage = {
        init: function() {
            this.bindEvents();
            this.renderCart();
        },

        bindEvents: function() {
            const cartFooter = document.getElementById('cart-footer');
            const cartAllCheck = document.getElementById('cart-all-check');
            const cartSettleBtn = document.getElementById('cart-settle-btn');
            const cartManageBtn = document.getElementById('cart-manage-btn');

            // 全选按钮
            if (cartAllCheck) {
                cartAllCheck.addEventListener('click', () => {
                    const isChecked = cartAllCheck.classList.toggle('active');
                    CartManager.toggleAllChecked(isChecked);
                    this.renderCart();
                });
            }

            // 结算按钮
            if (cartSettleBtn) {
                cartSettleBtn.addEventListener('click', () => {
                    const checkedItems = CartManager.getCheckedItems();
                    if (checkedItems.length === 0) {
                        alert('请选择要结算的商品');
                        return;
                    }
                    this.goToOrderConfirm(checkedItems);
                });
            }

            // 管理按钮
            if (cartManageBtn) {
                cartManageBtn.addEventListener('click', () => {
                    alert('管理功能：可以删除商品、移入收藏等');
                });
            }
        },

        renderCart: function() {
            const cart = CartManager.getCart();
            const cartEmpty = document.getElementById('cart-empty');
            const cartContent = document.getElementById('cart-content');
            const cartFooter = document.getElementById('cart-footer');
            const cartList = document.getElementById('cart-list');

            if (cart.length === 0) {
                // 购物车为空：显示空状态，隐藏内容区域
                if (cartEmpty) cartEmpty.classList.add('active');
                if (cartContent) {
                    cartContent.style.display = 'none';
                    cartContent.classList.remove('active');
                }
                if (cartFooter) cartFooter.classList.remove('active');
                return;
            }

            // 购物车有商品：隐藏空状态，显示内容区域
            if (cartEmpty) cartEmpty.classList.remove('active');
            if (cartContent) {
                cartContent.style.display = 'block';
                cartContent.classList.add('active');
            }
            if (cartFooter) cartFooter.classList.add('active');

            // 渲染购物车商品列表
            if (cartList) {
                const html = cart.map(item => `
                    <div class="cart-item" data-id="${item.id}">
                        <div class="cart-check ${item.checked ? 'active' : ''}" data-id="${item.id}"></div>
                        <img src="${item.image}" alt="${item.name}" class="cart-img">
                        <div class="cart-info">
                            <div class="cart-name">${item.name}</div>
                            <div class="cart-price-num">
                                <div class="cart-price">¥${item.price}</div>
                                <div class="cart-num">
                                    <div class="cart-num-btn minus" data-id="${item.id}">-</div>
                                    <input type="text" value="${item.quantity}" class="cart-num-input" data-id="${item.id}" readonly>
                                    <div class="cart-num-btn plus" data-id="${item.id}">+</div>
                                </div>
                            </div>
                        </div>
                        <div class="cart-item-delete" data-id="${item.id}" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #999; font-size: 20px; cursor: pointer; padding: 10px; z-index: 10; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                            <i class="fa fa-trash-o" style="pointer-events: none;"></i>
                        </div>
                    </div>
                `).join('');
                cartList.innerHTML = html;

                // 绑定商品项事件
                this.bindCartItemEvents();
            }

            // 更新底部统计
            this.updateCartFooter();
        },

        bindCartItemEvents: function() {
            const cartList = document.getElementById('cart-list');
            if (!cartList) return;

            // 选择框点击
            cartList.querySelectorAll('.cart-check').forEach(check => {
                check.addEventListener('click', (e) => {
                    const itemId = e.target.dataset.id;
                    const isChecked = e.target.classList.toggle('active');
                    CartManager.updateChecked(itemId, isChecked);
                    this.updateCartFooter();
                });
            });

            // 删除按钮点击
            cartList.querySelectorAll('.cart-item-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = e.currentTarget.dataset.id;
                    if (confirm('确定要删除这件商品吗？')) {
                        CartManager.removeItem(itemId);
                        this.renderCart();
                    }
                });
            });

            // 数量减少
            cartList.querySelectorAll('.cart-num-btn.minus').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = e.target.dataset.id;
                    const input = cartList.querySelector(`.cart-num-input[data-id="${itemId}"]`);
                    let quantity = parseInt(input.value) || 1;
                    
                    if (quantity > 1) {
                        // 数量大于1，直接减少
                        quantity--;
                        input.value = quantity;
                        CartManager.updateQuantity(itemId, quantity);
                        this.updateCartFooter();
                    } else if (quantity === 1) {
                        // 数量为1时，弹出确认框
                        showConfirmModal('确定要删除该商品吗？', () => {
                            CartManager.removeItem(itemId);
                            CartPage.renderCart();
                        });
                    }
                });
            });

            // 数量增加
            cartList.querySelectorAll('.cart-num-btn.plus').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = e.target.dataset.id;
                    const input = cartList.querySelector(`.cart-num-input[data-id="${itemId}"]`);
                    let quantity = parseInt(input.value) || 1;
                    quantity++;
                    input.value = quantity;
                    CartManager.updateQuantity(itemId, quantity);
                    this.updateCartFooter();
                });
            });
        },

        updateCartFooter: function() {
            const checkedItems = CartManager.getCheckedItems();
            const total = CartManager.getTotal();
            const allItems = CartManager.getCart();
            const allChecked = allItems.length > 0 && allItems.every(item => item.checked);

            const cartAllCheck = document.getElementById('cart-all-check');
            const cartCount = document.getElementById('cart-count');
            const cartTotalPrice = document.getElementById('cart-total-price');

            if (cartAllCheck) {
                if (allChecked) {
                    cartAllCheck.classList.add('active');
                } else {
                    cartAllCheck.classList.remove('active');
                }
                
                // 全选点击事件（移除旧的再添加新的）
                const newAllCheck = cartAllCheck.cloneNode(true);
                cartAllCheck.parentNode.replaceChild(newAllCheck, cartAllCheck);
                
                newAllCheck.addEventListener('click', () => {
                    const newAllChecked = !newAllCheck.classList.contains('active');
                    CartManager.toggleAllChecked(newAllChecked);
                    this.renderCart();
                });
            }

            if (cartCount) {
                cartCount.textContent = checkedItems.length;
            }

            if (cartTotalPrice) {
                cartTotalPrice.textContent = '¥' + total.toFixed(2);
            }
        },

        goToOrderConfirm: function(items) {
            // 存储待结算商品
            sessionStorage.setItem('order_confirm_items', JSON.stringify(items));
            
            // 显示订单确认页面
            const orderConfirmPage = document.getElementById('order-confirm-page');
            if (orderConfirmPage) {
                orderConfirmPage.classList.add('active');
                OrderConfirmPage.init();
            }
        }
    };

    // 订单确认页面管理
    const OrderConfirmPage = {
        init: function() {
            this.loadOrderData();
            this.bindEvents();
        },

        bindEvents: function() {
            const orderBackBtn = document.getElementById('order-back-btn');
            const orderSubmitBtn = document.getElementById('order-submit-btn');
            const addAddressBtn = document.getElementById('add-address-btn');

            if (orderBackBtn) {
                orderBackBtn.addEventListener('click', () => {
                    document.getElementById('order-confirm-page').classList.remove('active');
                });
            }

            if (orderSubmitBtn) {
                orderSubmitBtn.addEventListener('click', () => {
                    this.submitOrder();
                });
            }

            if (addAddressBtn) {
                addAddressBtn.addEventListener('click', () => {
                    this.showAddAddressDialog();
                });
            }
        },

        loadDefaultAddress: function() {
            const defaultAddress = AddressManager.getDefaultAddress();
            const orderAddress = document.getElementById('order-address');
            
            if (defaultAddress && orderAddress) {
                orderAddress.innerHTML = `
                    <div class="order-address-info" style="cursor: pointer;">
                        <div class="order-address-icon">
                            <i class="fa fa-map-marker-alt"></i>
                        </div>
                        <div class="order-address-details">
                            <div class="order-address-name-phone">
                                <span>${defaultAddress.name}</span>
                                <span style="margin-left: 15px;">${defaultAddress.phone}</span>
                            </div>
                            <div class="order-address-text">${defaultAddress.region} ${defaultAddress.detail}</div>
                        </div>
                        <div class="order-address-arrow">
                            <i class="fa fa-chevron-right"></i>
                        </div>
                    </div>
                `;
                sessionStorage.setItem('order_address', JSON.stringify(defaultAddress));
                
                // 绑定点击事件，可以选择其他地址
                setTimeout(() => {
                    const addressInfo = orderAddress.querySelector('.order-address-info');
                    if (addressInfo) {
                        addressInfo.addEventListener('click', () => {
                            AddressManagePage.show();
                            document.getElementById('order-confirm-page').classList.remove('active');
                        });
                    }
                }, 0);
            } else if (orderAddress) {
                orderAddress.innerHTML = `
                    <div class="order-address-empty" id="add-address-btn-dynamic">
                        <i class="fa fa-plus-circle"></i>
                        <span>请添加收货地址</span>
                    </div>
                `;
                // 重新绑定点击事件
                setTimeout(() => {
                    const addBtn = document.getElementById('add-address-btn-dynamic');
                    if (addBtn) {
                        addBtn.addEventListener('click', () => {
                            AddressManagePage.show();
                            document.getElementById('order-confirm-page').classList.remove('active');
                        });
                    }
                }, 0);
            }
        },

        loadOrderData: function() {
            const itemsJson = sessionStorage.getItem('order_confirm_items');
            if (!itemsJson) return;

            const items = JSON.parse(itemsJson);
            
            // 加载默认地址
            this.loadDefaultAddress();
            
            // 渲染商品列表
            const goodsList = document.getElementById('order-goods-list');
            if (goodsList) {
                goodsList.innerHTML = items.map(item => `
                    <div class="order-goods-item">
                        <img src="${item.image}" alt="${item.name}" class="order-goods-img">
                        <div class="order-goods-info">
                            <div class="order-goods-name">${item.name}</div>
                            <div class="order-goods-spec">${item.spec}</div>
                            <div class="order-goods-price-num">
                                <div class="order-goods-price">¥${item.price}</div>
                                <div class="order-goods-num">x${item.quantity}</div>
                            </div>
                        </div>
                    </div>
                `).join('');
            }

            // 计算金额
            const totalAmount = items.reduce((sum, item) => {
                return sum + (parseFloat(item.price) * item.quantity);
            }, 0);

            const orderGoodsAmount = document.getElementById('order-goods-amount');
            const orderFreight = document.getElementById('order-freight');
            const orderTotalPrice = document.getElementById('order-total-price');

            if (orderGoodsAmount) orderGoodsAmount.textContent = '¥' + totalAmount.toFixed(2);
            if (orderFreight) orderFreight.textContent = '¥0.00';
            if (orderTotalPrice) orderTotalPrice.textContent = '¥' + totalAmount.toFixed(2);
        },

        showAddAddressDialog: function() {
            // 模拟添加地址
            const address = {
                name: '张三',
                phone: '138****5678',
                detail: '浙江省杭州市西湖区文三路123号'
            };

            const orderAddress = document.getElementById('order-address');
            if (orderAddress) {
                orderAddress.innerHTML = `
                    <div class="order-address-info">
                        <div class="order-address-icon">
                            <i class="fa fa-map-marker-alt"></i>
                        </div>
                        <div class="order-address-details">
                            <div class="order-address-name-phone">
                                <span>${address.name}</span>
                                <span style="margin-left: 15px;">${address.phone}</span>
                            </div>
                            <div class="order-address-text">${address.detail}</div>
                        </div>
                    </div>
                `;
            }

            sessionStorage.setItem('order_address', JSON.stringify(address));
        },

        submitOrder: function() {
            const addressJson = sessionStorage.getItem('order_address');
            const defaultAddress = AddressManager.getDefaultAddress();
            
            if (!addressJson && !defaultAddress) {
                alert('请先添加收货地址');
                AddressManagePage.show();
                document.getElementById('order-confirm-page').classList.remove('active');
                return;
            }

            const itemsJson = sessionStorage.getItem('order_confirm_items');
            const items = JSON.parse(itemsJson);
            const address = JSON.parse(addressJson);
            const message = document.getElementById('order-message-input')?.value || '';

            const totalAmount = items.reduce((sum, item) => {
                return sum + (parseFloat(item.price) * item.quantity);
            }, 0);

            // 创建订单
            const order = OrderManager.createOrder({
                goods: items,
                totalAmount: totalAmount,
                address: address,
                message: message
            });

            // 存储订单ID用于支付
            sessionStorage.setItem('current_order_id', order.id);

            // 从购物车中移除已下单商品
            items.forEach(item => {
                CartManager.removeItem(item.id);
            });

            // 跳转到支付页面
            document.getElementById('order-confirm-page').classList.remove('active');
            const paymentPage = document.getElementById('payment-page');
            if (paymentPage) {
                paymentPage.classList.add('active');
                PaymentPage.init(order);
            }
        }
    };

    // 支付页面管理
    const PaymentPage = {
        currentOrder: null,
        selectedMethod: 'balance',
        eventsInitialized: false,

        init: function(order) {
            this.currentOrder = order;
            this.selectedMethod = 'balance'; // 默认使用余额支付
            this.renderOrderInfo();
            
            // 只在第一次初始化时绑定事件
            if (!this.eventsInitialized) {
                this.bindEvents();
                this.eventsInitialized = true;
            }
        },

        bindEvents: function() {
            const paymentBackBtn = document.getElementById('payment-back-btn');
            const paymentConfirmBtn = document.getElementById('payment-confirm-btn');

            if (paymentBackBtn) {
                paymentBackBtn.onclick = () => {
                    document.getElementById('payment-page').classList.remove('active');
                };
            }

            if (paymentConfirmBtn) {
                paymentConfirmBtn.onclick = () => {
                    this.confirmPayment();
                };
            }
        },

        renderOrderInfo: function() {
            if (!this.currentOrder) return;

            const paymentAmount = document.getElementById('payment-amount');
            const paymentOrderNo = document.getElementById('payment-order-no');
            const paymentFinalAmount = document.getElementById('payment-final-amount');
            const balanceDisplay = document.getElementById('payment-balance-display');

            if (paymentAmount) {
                paymentAmount.textContent = '¥' + this.currentOrder.totalAmount.toFixed(2);
            }
            if (paymentOrderNo) {
                paymentOrderNo.textContent = this.currentOrder.orderNo;
            }
            if (paymentFinalAmount) {
                paymentFinalAmount.textContent = '¥' + this.currentOrder.totalAmount.toFixed(2);
            }
            
            // 显示实际余额
            if (balanceDisplay && window.WalletManager) {
                const balance = window.WalletManager.getBalance();
                balanceDisplay.textContent = `余额：¥${balance.toFixed(2)}`;
            }
        },

        confirmPayment: function() {
            if (!this.currentOrder) return;

            // 检查钱包系统是否加载
            if (!window.WalletManager) {
                alert('钱包系统未加载，请刷新页面后重试');
                return;
            }
            
            const orderAmount = this.currentOrder.totalAmount;
            const result = window.WalletManager.deductBalance(orderAmount, '购物支付');
            
            if (!result.success) {
                alert(result.message);
                return;
            }
            
            // 余额支付成功
            OrderManager.updateOrderStatus(this.currentOrder.id, 'unshipped', {
                paymentMethod: '余额支付（喵币）'
            });
            
            // 模拟发货（3秒后自动发货）
            setTimeout(() => {
                OrderManager.updateOrderStatus(this.currentOrder.id, 'shipped');
            }, 3000);
            
            showPaymentSuccessModal(orderAmount, result.newBalance);
            
            // 关闭支付页面
            document.getElementById('payment-page').classList.remove('active');
            
            // 刷新购物车
            CartPage.renderCart();
        }
    };

    // 订单列表页面管理
    const OrderListPage = {
        currentStatus: 'all',

        init: function() {
            this.bindEvents();
            this.renderOrders();
        },

        bindEvents: function() {
            const orderListBackBtn = document.getElementById('order-list-back-btn');
            const tabs = document.querySelectorAll('.order-list-tab');

            if (orderListBackBtn) {
                orderListBackBtn.addEventListener('click', () => {
                    document.getElementById('order-list-page').classList.remove('active');
                });
            }

            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.currentStatus = tab.dataset.status;
                    this.renderOrders();
                });
            });
        },

        renderOrders: function() {
            const orders = OrderManager.getOrdersByStatus(this.currentStatus);
            const orderListEmpty = document.getElementById('order-list-empty');
            const orderItemsContainer = document.getElementById('order-items-container');

            if (orders.length === 0) {
                if (orderListEmpty) orderListEmpty.classList.add('active');
                if (orderItemsContainer) orderItemsContainer.innerHTML = '';
                return;
            }

            if (orderListEmpty) orderListEmpty.classList.remove('active');

            const statusTexts = {
                'unpaid': '待付款',
                'unshipped': '待发货',
                'shipped': '待收货',
                'completed': '已完成',
                'cancelled': '已取消'
            };

            if (orderItemsContainer) {
                orderItemsContainer.innerHTML = orders.map(order => `
                    <div class="order-item-card" data-id="${order.id}">
                        <div class="order-item-header">
                            <div class="order-item-no">订单号：${order.orderNo}</div>
                            <div class="order-item-status">${statusTexts[order.status]}</div>
                        </div>
                        <div class="order-item-goods">
                            ${order.goods.map(item => `
                                <div class="order-item-goods-item">
                                    <img src="${item.image}" alt="${item.name}" class="order-item-img">
                                    <div class="order-item-info">
                                        <div class="order-item-name">${item.name}</div>
                                        <div class="order-item-price-num">
                                            <div class="order-item-price">¥${item.price}</div>
                                            <div class="order-item-num">x${item.quantity}</div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-item-footer">
                            <div class="order-item-total">
                                实付：<span class="order-item-total-price">¥${order.totalAmount.toFixed(2)}</span>
                            </div>
                            <div class="order-item-actions">
                                ${this.getOrderActions(order)}
                            </div>
                        </div>
                    </div>
                `).join('');

                // 绑定订单操作按钮
                this.bindOrderActions();
            }
        },

        getOrderActions: function(order) {
            let actions = '<div class="order-item-btn" onclick="OrderListPage.viewOrderDetail(\'' + order.id + '\')">查看详情</div>';
            
            if (order.status === 'unpaid') {
                actions += '<div class="order-item-btn primary">立即付款</div>';
            } else if (order.status === 'shipped') {
                actions += '<div class="order-item-btn primary" onclick="OrderListPage.confirmReceipt(\'' + order.id + '\')">确认收货</div>';
            } else if (order.status === 'completed') {
                actions += '<div class="order-item-btn">评价</div>';
            }
            
            return actions;
        },

        bindOrderActions: function() {
            // 可以在这里添加更多按钮事件
        },

        viewOrderDetail: function(orderId) {
            const order = OrderManager.getOrderById(orderId);
            if (order) {
                const orderDetailPage = document.getElementById('order-detail-page');
                if (orderDetailPage) {
                    orderDetailPage.classList.add('active');
                    OrderDetailPage.init(order);
                }
            }
        },

        confirmReceipt: function(orderId) {
            if (confirm('确认收货吗？')) {
                OrderManager.updateOrderStatus(orderId, 'completed');
                this.renderOrders();
                alert('收货成功！');
            }
        }
    };

    // 订单详情页面管理
    const OrderDetailPage = {
        currentOrder: null,

        init: function(order) {
            this.currentOrder = order;
            this.renderOrderDetail();
            this.bindEvents();
        },

        bindEvents: function() {
            const orderDetailBackBtn = document.getElementById('order-detail-back-btn');
            const detailDeleteBtn = document.getElementById('detail-delete-btn');
            const detailConfirmBtn = document.getElementById('detail-confirm-btn');

            if (orderDetailBackBtn) {
                orderDetailBackBtn.addEventListener('click', () => {
                    document.getElementById('order-detail-page').classList.remove('active');
                });
            }

            if (detailDeleteBtn) {
                detailDeleteBtn.addEventListener('click', () => {
                    if (confirm('确定删除此订单吗？')) {
                        OrderManager.deleteOrder(this.currentOrder.id);
                        document.getElementById('order-detail-page').classList.remove('active');
                        OrderListPage.renderOrders();
                        alert('订单已删除');
                    }
                });
            }

            if (detailConfirmBtn) {
                detailConfirmBtn.addEventListener('click', () => {
                    if (this.currentOrder.status === 'shipped') {
                        OrderManager.updateOrderStatus(this.currentOrder.id, 'completed');
                        alert('收货成功！');
                        document.getElementById('order-detail-page').classList.remove('active');
                        OrderListPage.renderOrders();
                    }
                });
            }
        },

        renderOrderDetail: function() {
            if (!this.currentOrder) return;

            const statusTexts = {
                'unpaid': { main: '等待买家付款', sub: '请尽快完成支付' },
                'unshipped': { main: '等待商家发货', sub: '商家将尽快为您发货' },
                'shipped': { main: '商品已发货', sub: '请注意查收' },
                'completed': { main: '交易成功', sub: '感谢您的购买' },
                'cancelled': { main: '订单已取消', sub: '' }
            };

            // 更新状态
            const statusMainText = document.getElementById('status-main-text');
            const statusSubText = document.getElementById('status-sub-text');
            if (statusMainText) statusMainText.textContent = statusTexts[this.currentOrder.status].main;
            if (statusSubText) statusSubText.textContent = statusTexts[this.currentOrder.status].sub;

            // 更新物流信息
            if (this.currentOrder.logistics) {
                const logisticsCompanyName = document.getElementById('logistics-company-name');
                const logisticsTrackingNo = document.getElementById('logistics-tracking-no');
                if (logisticsCompanyName) logisticsCompanyName.textContent = this.currentOrder.logistics.company;
                if (logisticsTrackingNo) logisticsTrackingNo.textContent = this.currentOrder.logistics.trackingNo;
            }

            // 更新收货地址
            if (this.currentOrder.address) {
                const detailAddressName = document.getElementById('detail-address-name');
                const detailAddressPhone = document.getElementById('detail-address-phone');
                const detailAddressText = document.getElementById('detail-address-text');
                if (detailAddressName) detailAddressName.textContent = this.currentOrder.address.name;
                if (detailAddressPhone) detailAddressPhone.textContent = this.currentOrder.address.phone;
                if (detailAddressText) detailAddressText.textContent = this.currentOrder.address.detail;
            }

            // 更新商品列表
            const orderDetailGoodsList = document.getElementById('order-detail-goods-list');
            if (orderDetailGoodsList) {
                orderDetailGoodsList.innerHTML = this.currentOrder.goods.map(item => `
                    <div class="order-goods-item">
                        <img src="${item.image}" alt="${item.name}" class="order-goods-img">
                        <div class="order-goods-info">
                            <div class="order-goods-name">${item.name}</div>
                            <div class="order-goods-spec">${item.spec}</div>
                            <div class="order-goods-price-num">
                                <div class="order-goods-price">¥${item.price}</div>
                                <div class="order-goods-num">x${item.quantity}</div>
                            </div>
                        </div>
                    </div>
                `).join('');
            }

            // 更新订单信息
            const detailOrderNo = document.getElementById('detail-order-no');
            const detailOrderTime = document.getElementById('detail-order-time');
            const detailPaymentMethod = document.getElementById('detail-payment-method');
            const detailGoodsAmount = document.getElementById('detail-goods-amount');
            const detailFreight = document.getElementById('detail-freight');
            const detailTotalAmount = document.getElementById('detail-total-amount');

            if (detailOrderNo) detailOrderNo.textContent = this.currentOrder.orderNo;
            if (detailOrderTime) detailOrderTime.textContent = new Date(this.currentOrder.createTime).toLocaleString('zh-CN');
            if (detailPaymentMethod) detailPaymentMethod.textContent = this.currentOrder.paymentMethod || '未支付';
            if (detailGoodsAmount) detailGoodsAmount.textContent = '¥' + this.currentOrder.totalAmount.toFixed(2);
            if (detailFreight) detailFreight.textContent = '¥0.00';
            if (detailTotalAmount) detailTotalAmount.textContent = '¥' + this.currentOrder.totalAmount.toFixed(2);

            // 更新底部按钮
            const orderDetailFooter = document.getElementById('order-detail-footer');
            if (orderDetailFooter) {
                if (this.currentOrder.status === 'shipped') {
                    orderDetailFooter.innerHTML = `
                        <div class="order-detail-btn" id="detail-delete-btn">删除订单</div>
                        <div class="order-detail-btn primary" id="detail-confirm-btn">确认收货</div>
                    `;
                } else {
                    orderDetailFooter.innerHTML = `
                        <div class="order-detail-btn" id="detail-delete-btn">删除订单</div>
                    `;
                }
                // 重新绑定事件
                this.bindEvents();
            }
        }
    };

    // 导出到全局
    window.CartManager = CartManager;
    window.OrderManager = OrderManager;
    window.CartPage = CartPage;
    window.OrderConfirmPage = OrderConfirmPage;
    window.PaymentPage = PaymentPage;
    window.OrderListPage = OrderListPage;
    window.OrderDetailPage = OrderDetailPage;

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            CartPage.init();
        });
    } else {
        CartPage.init();
    }

})();