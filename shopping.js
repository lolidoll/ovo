// 购物页面脚本 - 淘宝风格

(function() {
    'use strict';

    // 购物页面初始化
    function initShoppingPage() {
        const shoppingPage = document.getElementById('shopping-page');
        if (!shoppingPage) return;

        // 绑定返回按钮点击事件
        const backBtn = shoppingPage.querySelector('.shopping-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                console.log('购物页面返回按钮被点击');
                // 使用正确的方式关闭子页面
                shoppingPage.classList.remove('open');
                // 恢复底部导航栏
                const tabBar = document.getElementById('tab-bar');
                const chatPage = document.getElementById('chat-page');
                if (tabBar) {
                    if (!chatPage || !chatPage.classList.contains('open')) {
                        tabBar.style.visibility = '';
                        tabBar.style.pointerEvents = '';
                    }
                }
            });
        }

        // 绑定生成按钮点击事件
        const generateBtn = document.getElementById('shopping-generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', generateShoppingContent);
        }

        // 绑定购物车空状态按钮
        const cartGoShop = shoppingPage.querySelector('#cart-go-shop');
        if (cartGoShop) {
            cartGoShop.addEventListener('click', () => {
                const cartEmpty = shoppingPage.querySelector('.cart-empty');
                const cartList = shoppingPage.querySelector('.cart-list');
                const cartFooter = shoppingPage.querySelector('.cart-footer');
                
                if (cartEmpty) cartEmpty.classList.remove('active');
                if (cartList) cartList.classList.add('active');
                if (cartFooter) cartFooter.classList.add('active');
            });
        }

        // 绑定购物车选择框事件
        const cartChecks = shoppingPage.querySelectorAll('.cart-check');
        cartChecks.forEach(check => {
            check.addEventListener('click', function() {
                this.classList.toggle('active');
                calculateCart();
                updateAllCheckStatus();
            });
        });

        // 绑定全选按钮
        const cartAllCheck = shoppingPage.querySelector('#cart-all-check');
        if (cartAllCheck) {
            cartAllCheck.addEventListener('click', function() {
                const isActive = this.classList.toggle('active');
                const itemChecks = shoppingPage.querySelectorAll('.cart-item .cart-check');
                itemChecks.forEach(check => {
                    if (isActive) {
                        check.classList.add('active');
                    } else {
                        check.classList.remove('active');
                    }
                });
                calculateCart();
            });
        }

        // 绑定数量增减按钮
        const cartNumBtns = shoppingPage.querySelectorAll('.cart-num-btn');
        cartNumBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const input = this.parentElement.querySelector('.cart-num-input');
                let num = parseInt(input.value) || 1;
                
                if (this.textContent === '+') {
                    num++;
                } else if (num > 1) {
                    num--;
                }
                
                input.value = num;
                calculateCart();
            });
        });

        // 初始化计算
        calculateCart();
        
        // 绑定我的订单入口
        const mineOrderItems = shoppingPage.querySelectorAll('.mine-order-item');
        mineOrderItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                const orderListPage = document.getElementById('order-list-page');
                if (orderListPage && window.OrderListPage) {
                    orderListPage.classList.add('active');
                    // 根据点击的按钮设置默认tab
                    const statusMap = ['all', 'unpaid', 'unshipped', 'shipped', 'completed'];
                    window.OrderListPage.currentStatus = statusMap[index] || 'all';
                    window.OrderListPage.init();
                }
            });
        });
        
        // 绑定查看全部订单
        const mineOrderMore = shoppingPage.querySelector('.mine-order-more');
        if (mineOrderMore) {
            mineOrderMore.addEventListener('click', () => {
                const orderListPage = document.getElementById('order-list-page');
                if (orderListPage && window.OrderListPage) {
                    orderListPage.classList.add('active');
                    window.OrderListPage.currentStatus = 'all';
                    window.OrderListPage.init();
                }
            });
        }
    }

    // 切换购物车页面
    function toggleCartPage() {
        const shoppingPage = document.getElementById('shopping-page');
        if (!shoppingPage) return;

        const mainContent = shoppingPage.querySelector('.shopping-main-content');
        const cartPage = shoppingPage.querySelector('.cart-page');
        const cartFooter = shoppingPage.querySelector('.cart-footer');

        if (mainContent && cartPage) {
            const isCartActive = cartPage.classList.contains('active');
            
            if (isCartActive) {
                // 返回主页面
                cartPage.classList.remove('active');
                mainContent.classList.add('active');
                if (cartFooter) cartFooter.classList.remove('active');
            } else {
                // 进入购物车
                mainContent.classList.remove('active');
                cartPage.classList.add('active');
                
                // 检查购物车是否为空
                const cartEmpty = shoppingPage.querySelector('.cart-empty');
                const cartList = shoppingPage.querySelector('.cart-list');
                
                if (cartEmpty && cartEmpty.classList.contains('active')) {
                    if (cartFooter) cartFooter.classList.remove('active');
                } else if (cartList && cartList.classList.contains('active')) {
                    if (cartFooter) cartFooter.classList.add('active');
                }
            }
        }
    }

    // 计算购物车总价
    function calculateCart() {
        const shoppingPage = document.getElementById('shopping-page');
        if (!shoppingPage) return;

        let total = 0;
        let count = 0;

        const cartItems = shoppingPage.querySelectorAll('.cart-item');
        cartItems.forEach((item, index) => {
            const check = item.querySelector('.cart-check');
            if (check && check.classList.contains('active')) {
                const priceText = item.querySelector('.cart-price').textContent;
                const price = parseFloat(priceText.replace('¥', ''));
                const numInput = item.querySelector('.cart-num-input');
                const num = parseInt(numInput.value) || 1;
                
                total += price * num;
                count += num;
            }
        });

        const cartFooterMoney = shoppingPage.querySelector('.cart-footer-money');
        const cartFooterPay = shoppingPage.querySelector('.cart-footer-pay');
        
        if (cartFooterMoney) {
            cartFooterMoney.textContent = `¥${total.toFixed(2)}`;
        }
        
        if (cartFooterPay) {
            cartFooterPay.textContent = `结算(${count})`;
        }
    }

    // 更新全选状态
    function updateAllCheckStatus() {
        const shoppingPage = document.getElementById('shopping-page');
        if (!shoppingPage) return;

        const cartAllCheck = shoppingPage.querySelector('#cart-all-check');
        const itemChecks = shoppingPage.querySelectorAll('.cart-item .cart-check');
        
        if (cartAllCheck && itemChecks.length > 0) {
            const allChecked = Array.from(itemChecks).every(check => check.classList.contains('active'));
            
            if (allChecked) {
                cartAllCheck.classList.add('active');
            } else {
                cartAllCheck.classList.remove('active');
            }
        }
    }

    // 存储当前商品详情数据
    let currentGoodsData = null;

    // 商品卡片点击事件
    function handleGoodsClick(event) {
        const card = event.currentTarget;
        const img = card.querySelector('img');
        const name = card.querySelector('.name').textContent;
        const priceText = card.querySelector('.price').textContent;
        const price = priceText.split('¥')[1]?.split(' ')[0] || '0';
        const sales = card.querySelector('.sales')?.textContent || '';
        
        // 获取imageDesc（从生成的数据中）
        const imageDesc = img.getAttribute('data-desc') || name;
        
        // 显示商品详情
        showGoodsDetail({
            id: name, // 使用商品名称作为唯一ID
            image: img.src,
            name: name,
            price: price,
            sales: sales,
            desc: imageDesc
        });
    }

    // 闪购商品点击事件
    function handleFlashItemClick(event) {
        const item = event.currentTarget;
        const img = item.querySelector('img');
        const name = item.querySelector('.name').textContent;
        const priceText = item.querySelector('.price').textContent;
        const price = priceText.replace('¥', '');
        
        // 获取imageDesc（从生成的数据中）
        const imageDesc = img.getAttribute('data-desc') || name;
        
        // 显示商品详情
        showGoodsDetail({
            id: name, // 使用商品名称作为唯一ID
            image: img.src,
            name: name,
            price: price,
            sales: '热销中',
            desc: imageDesc
        });
    }

    // 显示商品详情页
    function showGoodsDetail(data) {
        currentGoodsData = data;
        
        const detailPage = document.getElementById('goods-detail-page');
        const detailImg = document.getElementById('goods-detail-img');
        const detailName = document.getElementById('goods-detail-name');
        const detailPrice = document.getElementById('goods-detail-price');
        const detailSales = document.getElementById('goods-detail-sales');
        const detailDesc = document.getElementById('goods-detail-desc');
        
        if (!detailPage) return;
        
        // 填充数据
        if (detailImg) detailImg.src = data.image;
        if (detailName) detailName.textContent = data.name;
        if (detailPrice) detailPrice.textContent = `¥${data.price}`;
        if (detailSales) detailSales.textContent = data.sales;
        if (detailDesc) detailDesc.textContent = data.desc;
        
        // 显示详情页
        detailPage.classList.add('active');
        
        console.log('显示商品详情:', data);
    }

    // 关闭商品详情页
    function closeGoodsDetail() {
        const detailPage = document.getElementById('goods-detail-page');
        if (detailPage) {
            detailPage.classList.remove('active');
        }
        currentGoodsData = null;
    }

    // 显示美化的成功提示框
    function showSuccessModal(message) {
        const modal = document.createElement('div');
        modal.className = 'shopping-success-modal';
        modal.innerHTML = `
            <div class="shopping-modal-overlay"></div>
            <div class="shopping-modal-box">
                <div class="shopping-modal-icon">
                    <i class="fa fa-check-circle"></i>
                </div>
                <div class="shopping-modal-message">${message}</div>
                <button class="shopping-modal-btn" onclick="this.closest('.shopping-success-modal').remove()">确定</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加显示动画
        setTimeout(() => modal.classList.add('show'), 10);
        
        // 2秒后自动关闭
        setTimeout(() => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }, 2000);
    }

    // 加入购物车
    function addToCart() {
        if (!currentGoodsData) return;
        
        // 使用CartManager添加商品到购物车
        if (window.CartManager) {
            const success = window.CartManager.addItem({
                id: currentGoodsData.id || Date.now().toString(),
                image: currentGoodsData.image,
                name: currentGoodsData.name,
                price: currentGoodsData.price,
                desc: currentGoodsData.desc
            });
            
            if (success) {
                showSuccessModal(`已将 "${currentGoodsData.name}" 加入购物车！`);
                // 刷新购物车页面
                if (window.CartPage) {
                    window.CartPage.renderCart();
                }
            }
        } else {
            showSuccessModal(`已将 "${currentGoodsData.name}" 加入购物车！`);
        }
        
        console.log('加入购物车:', currentGoodsData);
        
        // 关闭详情页
        closeGoodsDetail();
    }

    // 转发商品给好友
    function forwardGoods() {
        if (!currentGoodsData) return;
        
        // 显示转发弹窗
        showForwardModal();
    }

    // 显示转发选择弹窗
    function showForwardModal() {
        const modal = document.getElementById('forward-modal');
        const modalList = document.getElementById('forward-modal-list');
        
        if (!modal || !modalList) return;
        
        // 获取对话列表（从AppState中）
        const conversations = window.AppState?.conversations || [];
        
        console.log('📋 转发弹窗 - 可用对话列表:', conversations);
        
        // 生成好友列表HTML
        let listHTML = '';
        
        // 显示所有对话（包括AI角色）
        conversations.forEach(conv => {
            // 排除群组对话，显示所有私聊（包括AI角色）
            if (!conv.isGroup) {
                const avatarSrc = conv.avatar || conv.characterAvatar || 'https://via.placeholder.com/45';
                const displayName = conv.name || conv.characterName || '未命名';
                const lastMsg = conv.lastMessage || '点击转发商品';
                
                listHTML += `
                    <div class="forward-modal-item" data-conv-id="${conv.id}">
                        <div class="forward-modal-avatar">
                            <img src="${avatarSrc}" alt="${displayName}">
                        </div>
                        <div class="forward-modal-info">
                            <div class="forward-modal-name">${displayName}</div>
                            <div class="forward-modal-desc">${lastMsg}</div>
                        </div>
                    </div>
                `;
                
                console.log('✅ 添加对话:', {
                    id: conv.id,
                    name: displayName,
                    type: conv.type,
                    isGroup: conv.isGroup
                });
            }
        });
        
        // 如果没有对话，显示提示
        if (!listHTML) {
            listHTML = '<div style="text-align: center; padding: 40px 20px; color: #999;">暂无对话，请先创建AI角色或添加好友</div>';
            console.log('⚠️ 没有可用的对话');
        }
        
        modalList.innerHTML = listHTML;
        
        // 绑定点击事件
        const items = modalList.querySelectorAll('.forward-modal-item');
        items.forEach(item => {
            item.addEventListener('click', function() {
                const convId = this.getAttribute('data-conv-id');
                handleForwardToConv(convId);
            });
        });
        
        // 显示弹窗
        modal.classList.add('active');
    }

    // 关闭转发弹窗
    function closeForwardModal() {
        const modal = document.getElementById('forward-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // 处理转发到指定对话
    function handleForwardToConv(convId) {
        if (!currentGoodsData || !convId) return;
        
        console.log('转发商品到对话:', convId, currentGoodsData);
        
        // 构造商品卡片消息数据
        const goodsCardMessage = {
            type: 'goods_card',
            goodsData: {
                image: currentGoodsData.image,
                name: currentGoodsData.name,
                price: currentGoodsData.price,
                sales: currentGoodsData.sales,
                desc: currentGoodsData.desc
            }
        };
        
        // 发送消息到聊天页面
        sendGoodsCardMessage(convId, goodsCardMessage);
        
        // 关闭弹窗和详情页
        closeForwardModal();
        closeGoodsDetail();
        
        // 切换到消息页面并打开该对话
        switchToMessagePage(convId);
        
        showSuccessModal('商品已转发！');
    }

    // 发送商品卡片消息
    function sendGoodsCardMessage(convId, goodsCardMessage) {
        // 确保AppState存在
        if (!window.AppState) return;
        
        const conversation = window.AppState.conversations.find(c => c.id === convId);
        if (!conversation) return;
        
        // 创建消息对象
        const message = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            convId: convId,
            sender: 'sent',  // 'sent' 表示用户发送的消息（显示在右侧）
            type: 'goods_card',
            content: `[商品] ${goodsCardMessage.goodsData.name}`,
            goodsData: goodsCardMessage.goodsData,
            timestamp: new Date().toISOString(),
            status: 'sent'
        };
        
        // 添加到消息列表
        if (!window.AppState.messages[convId]) {
            window.AppState.messages[convId] = [];
        }
        window.AppState.messages[convId].push(message);
        
        // 更新对话的最后消息
        conversation.lastMessage = `[商品] ${goodsCardMessage.goodsData.name}`;
        conversation.lastMessageTime = new Date().toISOString();
        conversation.unread = 0;
        
        // 保存到localStorage
        try {
            localStorage.setItem('conversations', JSON.stringify(window.AppState.conversations));
            localStorage.setItem('messages', JSON.stringify(window.AppState.messages));
        } catch (error) {
            console.error('保存消息失败:', error);
        }
        
        console.log('商品卡片消息已发送:', message);
    }

    // 切换到消息页面并打开指定对话
    function switchToMessagePage(convId) {
        console.log('🔄 切换到消息页面，对话ID:', convId);
        
        // 关闭购物页面
        const shoppingPage = document.getElementById('shopping-page');
        if (shoppingPage) {
            shoppingPage.classList.remove('active');
        }
        
        // 切换到消息tab
        const msgTab = document.querySelector('.tab[data-tab="msg-page"]');
        if (msgTab) {
            msgTab.click();
        }
        
        // 打开指定对话并强制刷新
        setTimeout(() => {
            if (window.AppState) {
                // 设置当前对话
                const conv = window.AppState.conversations?.find(c => c.id === convId) || null;
                if (conv) {
                    window.AppState.currentChat = conv;
                } else {
                    console.warn('⚠️ 未找到对话对象，无法设置currentChat:', convId);
                }
                
                // 尝试多种渲染方法，确保消息显示
                if (window.renderConversation) {
                    console.log('✅ 使用 renderConversation 渲染');
                    window.renderConversation(convId);
                } else if (window.switchConversation) {
                    console.log('✅ 使用 switchConversation 渲染');
                    window.switchConversation(convId);
                } else if (window.renderMessages) {
                    console.log('✅ 使用 renderMessages 渲染');
                    window.renderMessages();
                }
                
                // 如果有对话列表点击事件，也尝试触发
                const convItem = document.querySelector(`.conversation-item[data-conv-id="${convId}"]`);
                if (convItem) {
                    console.log('✅ 触发对话项点击事件');
                    convItem.click();
                }
                
                // 强制滚动到底部
                setTimeout(() => {
                    const chatMessages = document.getElementById('chat-messages');
                    if (chatMessages) {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                        console.log('✅ 滚动到底部');
                    }
                }, 50);
            }
        }, 100);
    }

    // 分类导航点击事件
    function handleCategoryClick(event) {
        const item = event.currentTarget;
        const categoryName = item.querySelector('.text').textContent;
        console.log('点击分类:', categoryName);
        // 这里可以添加跳转到分类页面的逻辑
    }

    // 绑定商品卡片事件
    function bindGoodsEvents() {
        const shoppingPage = document.getElementById('shopping-page');
        if (!shoppingPage) return;

        // 商品卡片
        const goodsCards = shoppingPage.querySelectorAll('.goods-card');
        goodsCards.forEach(card => {
            card.addEventListener('click', handleGoodsClick);
        });

        // 闪购商品
        const flashItems = shoppingPage.querySelectorAll('.flash-item');
        flashItems.forEach(item => {
            item.addEventListener('click', handleFlashItemClick);
        });

        // 分类导航
        const categoryItems = shoppingPage.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', handleCategoryClick);
        });
    }

    // 底部导航栏切换
    function initFooterNav() {
        const shoppingPage = document.getElementById('shopping-page');
        if (!shoppingPage) {
            console.error('购物页面未找到！');
            return;
        }

        const footerItems = shoppingPage.querySelectorAll('.shopping-footer-item');
        console.log('找到底部导航项:', footerItems.length);
        
        const mainContent = shoppingPage.querySelector('.shopping-main-content');
        const categoryPage = shoppingPage.querySelector('.category-page');
        const cartPage = shoppingPage.querySelector('.cart-page');
        const minePage = shoppingPage.querySelector('.mine-page');
        const cartFooter = shoppingPage.querySelector('.cart-footer');

        console.log('页面元素检查:', {
            mainContent: !!mainContent,
            categoryPage: !!categoryPage,
            cartPage: !!cartPage,
            minePage: !!minePage
        });

        footerItems.forEach((item, index) => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const tab = this.dataset.tab;
                console.log('点击底部导航:', tab);
                
                // 更新激活状态
                footerItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');

                // 隐藏所有页面
                if (mainContent) mainContent.classList.remove('active');
                if (categoryPage) categoryPage.classList.remove('active');
                if (cartPage) cartPage.classList.remove('active');
                if (minePage) minePage.classList.remove('active');
                if (cartFooter) cartFooter.classList.remove('active');

                // 显示对应页面
                if (tab === 'home') {
                    console.log('切换到首页');
                    if (mainContent) mainContent.classList.add('active');
                } else if (tab === 'category') {
                    console.log('切换到分类');
                    if (categoryPage) categoryPage.classList.add('active');
                } else if (tab === 'cart') {
                    console.log('切换到购物车');
                    if (cartPage) cartPage.classList.add('active');
                    
                    // 渲染购物车内容
                    if (window.CartPage) {
                        window.CartPage.renderCart();
                    }
                } else if (tab === 'mine') {
                    console.log('切换到我的');
                    if (minePage) minePage.classList.add('active');
                }
            }, false);
        });
        
        console.log('底部导航栏初始化完成');
    }

    // 分类页面交互
    function initCategoryPage() {
        const shoppingPage = document.getElementById('shopping-page');
        if (!shoppingPage) return;

        // 左侧分类切换 - 切换时检查缓存并显示对应数据
        const categoryLeftItems = shoppingPage.querySelectorAll('.category-left-item');
        categoryLeftItems.forEach(item => {
            item.addEventListener('click', function() {
                // 更新激活状态
                categoryLeftItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                
                // 获取分类名称并更新标题
                const categoryName = this.getAttribute('data-category') || this.textContent;
                console.log('切换分类:', categoryName);
                
                const categoryGoodsTitle = shoppingPage.querySelector('#category-goods-title');
                if (categoryGoodsTitle) {
                    categoryGoodsTitle.textContent = categoryName;
                }
                
                // 检查该分类是否有缓存数据
                const categoryGoodsGrid = shoppingPage.querySelector('#category-goods-grid');
                if (categoryGoodsGrid) {
                    const cachedGoods = getCachedCategoryGoods(categoryName);
                    
                    if (cachedGoods && cachedGoods.length > 0) {
                        // 有缓存，显示缓存数据
                        console.log('📦 切换分类，加载缓存:', categoryName);
                        renderCategoryGoods(cachedGoods);
                    } else {
                        // 无缓存，显示提示
                        categoryGoodsGrid.innerHTML = `
                            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #999;">
                                <i class="fas fa-magic" style="font-size: 48px; margin-bottom: 16px; color: #ddd;"></i>
                                <div style="font-size: 14px;">点击右上角"生成"按钮</div>
                                <div style="font-size: 14px; margin-top: 4px;">生成${categoryName}商品</div>
                            </div>
                        `;
                    }
                }
            });
        });
        
        // 绑定生成按钮点击事件 - 强制重新生成并覆盖
        const categoryGenerateBtn = shoppingPage.querySelector('#category-generate-btn');
        if (categoryGenerateBtn) {
            categoryGenerateBtn.addEventListener('click', async function() {
                // 获取当前激活的分类
                const activeCategory = shoppingPage.querySelector('.category-left-item.active');
                if (activeCategory) {
                    const categoryName = activeCategory.getAttribute('data-category') || activeCategory.textContent;
                    
                    // 清除该分类的缓存（强制重新生成）
                    const key = `category_goods_${categoryName}`;
                    localStorage.removeItem(key);
                    console.log('🗑️ 已清除旧数据，准备重新生成:', categoryName);
                    
                    // 重新生成
                    await generateCategoryGoods(categoryName);
                }
            });
        }
        
        // 页面初始化时检查是否有缓存
        const categoryGoodsGrid = shoppingPage.querySelector('#category-goods-grid');
        const firstCategory = categoryLeftItems[0];
        if (firstCategory && categoryGoodsGrid) {
            const categoryName = firstCategory.getAttribute('data-category') || firstCategory.textContent;
            const cachedGoods = getCachedCategoryGoods(categoryName);
            
            if (cachedGoods && cachedGoods.length > 0) {
                // 有缓存，显示缓存数据
                console.log('📦 页面初始化，加载缓存:', categoryName);
                renderCategoryGoods(cachedGoods);
            } else {
                // 无缓存，显示提示
                categoryGoodsGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #999;">
                        <i class="fas fa-magic" style="font-size: 48px; margin-bottom: 16px; color: #ddd;"></i>
                        <div style="font-size: 14px;">点击右上角"生成"按钮</div>
                        <div style="font-size: 14px; margin-top: 4px;">生成${categoryName}商品</div>
                    </div>
                `;
            }
        }
    }
    
    // 生成分类商品 - 调用AI API
    async function generateCategoryGoods(categoryName) {
        console.log('🎨 开始生成分类商品:', categoryName);
        
        const shoppingPage = document.getElementById('shopping-page');
        if (!shoppingPage) return;
        
        const categoryGoodsTitle = shoppingPage.querySelector('#category-goods-title');
        const categoryGoodsGrid = shoppingPage.querySelector('#category-goods-grid');
        const categoryGenerateBtn = shoppingPage.querySelector('#category-generate-btn');
        
        if (!categoryGoodsTitle || !categoryGoodsGrid) {
            console.error('未找到分类商品展示区域');
            return;
        }
        
        // 检查是否已有该分类的缓存数据
        const cachedGoods = getCachedCategoryGoods(categoryName);
        if (cachedGoods && cachedGoods.length > 0) {
            console.log('📦 使用缓存的商品数据:', categoryName);
            renderCategoryGoods(cachedGoods);
            return;
        }
        
        // 检查MainAPIManager是否可用
        if (!window.MainAPIManager) {
            alert('API管理器未加载，请刷新页面重试');
            return;
        }
        
        // 设置生成按钮为生成中状态
        if (categoryGenerateBtn) {
            categoryGenerateBtn.classList.add('generating');
            categoryGenerateBtn.querySelector('span').textContent = '生成中...';
        }
        
        // 显示加载状态
        categoryGoodsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: #999;">
                <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
                <div>正在生成${categoryName}商品...</div>
            </div>
        `;
        
        try {
            // 获取当前日期时间
            const now = new Date();
            const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
            const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
            const weekDay = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
            
            // 构建AI提示词 - 加入日期时间
            const prompt = `当前时间：${dateStr} ${weekDay} ${timeStr}

生成淘宝${categoryName}分类的商品JSON数据：

{
  "goodsList": [
    {"name": "[15-25字${categoryName}商品标题]", "imageDesc": "[60-80字超详细${categoryName}商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字${categoryName}商品标题]", "imageDesc": "[60-80字超详细${categoryName}商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字${categoryName}商品标题]", "imageDesc": "[60-80字超详细${categoryName}商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字${categoryName}商品标题]", "imageDesc": "[60-80字超详细${categoryName}商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字${categoryName}商品标题]", "imageDesc": "[60-80字超详细${categoryName}商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字${categoryName}商品标题]", "imageDesc": "[60-80字超详细${categoryName}商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字${categoryName}商品标题]", "imageDesc": "[60-80字超详细${categoryName}商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字${categoryName}商品标题]", "imageDesc": "[60-80字超详细${categoryName}商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字${categoryName}商品标题]", "imageDesc": "[60-80字超详细${categoryName}商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字${categoryName}商品标题]", "imageDesc": "[60-80字超详细${categoryName}商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"}
  ]
}

要求：
1. 只返回JSON，不要其他文字
2. 必须生成10个${categoryName}相关的商品
3. imageDesc是商品图片的详细描述，要包含所有视觉细节，用于AI图片生成
4. 价格和销量只填数字，不要单位
5. 商品要真实、多样化、符合${categoryName}分类特点`;

            // 调用主API
            const messages = [
                {
                    role: 'system',
                    content: '你是一个专业的电商内容生成助手，擅长生成真实、吸引人的商品信息。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ];
            
            console.log('📤 发送AI生成请求');
            
            // 使用MainAPIManager调用API
            const response = await callMainAPI(messages);
            
            console.log('📥 收到AI响应:', response);
            
            // 解析JSON响应
            let data;
            try {
                // 清理响应文本
                let cleanedResponse = response.trim();
                
                // 移除markdown代码块标记
                cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
                
                // 智能提取完整的JSON对象
                let jsonStr = null;
                
                // 方法1: 直接解析整个响应
                try {
                    data = JSON.parse(cleanedResponse);
                    console.log('✅ 方法1成功：直接解析');
                } catch (e1) {
                    console.log('⚠️ 方法1失败，尝试方法2');
                    
                    // 方法2: 使用括号匹配提取完整JSON
                    const startIndex = cleanedResponse.indexOf('{');
                    if (startIndex !== -1) {
                        let braceCount = 0;
                        let endIndex = -1;
                        
                        for (let i = startIndex; i < cleanedResponse.length; i++) {
                            const char = cleanedResponse[i];
                            if (char === '{') {
                                braceCount++;
                            } else if (char === '}') {
                                braceCount--;
                                if (braceCount === 0) {
                                    endIndex = i;
                                    break;
                                }
                            }
                        }
                        
                        if (endIndex !== -1) {
                            jsonStr = cleanedResponse.substring(startIndex, endIndex + 1);
                            
                            // 尝试修复常见的JSON格式问题
                            jsonStr = jsonStr
                                .replace(/,(\s*[}\]])/g, '$1')  // 移除尾随逗号
                                .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')  // 确保键名有引号
                                .replace(/:\s*'([^']*)'/g, ': "$1"');  // 单引号改双引号
                            
                            data = JSON.parse(jsonStr);
                            console.log('✅ 方法2成功：括号匹配提取JSON');
                        } else {
                            throw new Error('未找到完整的JSON对象（括号不匹配）');
                        }
                    } else {
                        throw new Error('响应中未找到JSON数据');
                    }
                }
                
                // 验证数据结构
                if (!data.goodsList || !Array.isArray(data.goodsList)) {
                    throw new Error('JSON数据结构不完整，缺少goodsList字段');
                }
                
                console.log('✅ JSON解析成功，商品数量:', data.goodsList.length);
                
            } catch (e) {
                console.error('❌ JSON解析失败:', e);
                categoryGoodsGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: #999;">
                        <div>生成失败：${e.message}</div>
                        <div style="margin-top: 10px; font-size: 12px;">请查看控制台了解详情</div>
                    </div>
                `;
                return;
            }
            
            // 处理商品数据，生成图片URL
            const goodsData = data.goodsList.map(goods => {
                // 使用imageDesc作为图片生成提示词
                const imagePrompt = encodeURIComponent(goods.imageDesc || goods.name);
                const imageUrl = `https://gen.pollinations.ai/image/${imagePrompt}?model=zimage&width=1080&height=2160&nologo=true&key=sk_InRGAIaBbde6kBPCSzO4FsOHTvYKQocd`;
                
                return {
                    name: goods.name,
                    image: imageUrl,
                    imageDesc: goods.imageDesc,
                    price: goods.price,
                    sales: `${goods.sales}万+人付款`
                };
            });
            
            // 保存到本地缓存（覆盖旧数据）
            saveCategoryGoods(categoryName, goodsData);
            
            // 渲染商品列表
            renderCategoryGoods(goodsData);
            
            console.log('✅ 分类商品生成完成并已保存');
            
        } catch (error) {
            console.error('❌ 生成分类商品失败:', error);
            categoryGoodsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: #999;">
                    <div>生成失败：${error.message}</div>
                </div>
            `;
        } finally {
            // 恢复生成按钮状态
            const shoppingPage = document.getElementById('shopping-page');
            const categoryGenerateBtn = shoppingPage?.querySelector('#category-generate-btn');
            if (categoryGenerateBtn) {
                categoryGenerateBtn.classList.remove('generating');
                categoryGenerateBtn.querySelector('span').textContent = '生成';
            }
        }
    }
    
    // 刷新当前对话，显示新消息
    function refreshCurrentConversation() {
        console.log('🔄 刷新当前对话');
        
        // 获取当前激活的对话ID
        const activeConvItem = document.querySelector('.conversation-item.active');
        if (activeConvItem) {
            const convId = activeConvItem.getAttribute('data-conv-id');
            console.log('📱 当前对话ID:', convId);
            
            // 尝试多种渲染方法
            if (window.renderConversation) {
                console.log('✅ 使用 renderConversation 刷新');
                window.renderConversation(convId);
            } else if (window.switchConversation) {
                console.log('✅ 使用 switchConversation 刷新');
                window.switchConversation(convId);
            } else if (window.renderMessages) {
                console.log('✅ 使用 renderMessages 刷新');
                window.renderMessages();
            }
            
            // 强制滚动到底部
            setTimeout(() => {
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    console.log('✅ 滚动到底部');
                }
            }, 100);
        } else {
            console.log('⚠️ 没有激活的对话');
        }
    }
    
    // 保存分类商品到localStorage
    function saveCategoryGoods(categoryName, goodsData) {
        try {
            const key = `category_goods_${categoryName}`;
            localStorage.setItem(key, JSON.stringify({
                categoryName: categoryName,
                goods: goodsData,
                timestamp: Date.now()
            }));
            console.log('💾 分类商品已保存:', categoryName);
        } catch (error) {
            console.error('保存分类商品失败:', error);
        }
    }
    
    // 获取缓存的分类商品
    function getCachedCategoryGoods(categoryName) {
        try {
            const key = `category_goods_${categoryName}`;
            const cached = localStorage.getItem(key);
            if (cached) {
                const data = JSON.parse(cached);
                return data.goods;
            }
        } catch (error) {
            console.error('读取缓存失败:', error);
        }
        return null;
    }
    
    // 刷新当前对话，显示新消息
    function refreshCurrentConversation() {
        console.log('🔄 刷新当前对话');
        
        // 获取当前激活的对话ID
        const activeConvItem = document.querySelector('.conversation-item.active');
        if (activeConvItem) {
            const convId = activeConvItem.getAttribute('data-conv-id');
            console.log('📱 当前对话ID:', convId);
            
            // 尝试多种渲染方法
            if (window.renderConversation) {
                console.log('✅ 使用 renderConversation 刷新');
                window.renderConversation(convId);
            } else if (window.switchConversation) {
                console.log('✅ 使用 switchConversation 刷新');
                window.switchConversation(convId);
            } else if (window.renderMessages) {
                console.log('✅ 使用 renderMessages 刷新');
                window.renderMessages();
            }
            
            // 强制滚动到底部
            setTimeout(() => {
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    console.log('✅ 滚动到底部');
                }
            }, 100);
        } else {
            console.log('⚠️ 没有激活的对话');
        }
    }
    
    // 渲染分类商品列表
    function renderCategoryGoods(goodsData) {
        const shoppingPage = document.getElementById('shopping-page');
        if (!shoppingPage) return;
        
        const categoryGoodsGrid = shoppingPage.querySelector('#category-goods-grid');
        if (!categoryGoodsGrid) return;
        
        // 清空现有内容
        categoryGoodsGrid.innerHTML = '';
        
        // 渲染商品卡片
        goodsData.forEach(goods => {
            const card = document.createElement('div');
            card.className = 'goods-card';
            card.innerHTML = `
                <img src="${goods.image}" alt="${goods.name}" data-desc="${goods.imageDesc || goods.name}" loading="lazy">
                <div class="desc">
                    <div class="name">${goods.name}</div>
                    <div>
                        <span class="price">¥${goods.price}</span>
                        <span class="sales">${goods.sales}</span>
                    </div>
                </div>
            `;
            
            // 绑定点击事件
            card.addEventListener('click', function() {
                const img = card.querySelector('img');
                const name = card.querySelector('.name').textContent;
                const priceText = card.querySelector('.price').textContent;
                const price = priceText.split('¥')[1];
                const sales = card.querySelector('.sales')?.textContent || '';
                
                // 获取imageDesc（从生成的数据中）
                const imageDesc = img.getAttribute('data-desc') || name;
                
                // 显示商品详情
                showGoodsDetail({
                    id: name,
                    image: img.src,
                    name: name,
                    price: price,
                    sales: sales,
                    desc: imageDesc
                });
            });
            
            categoryGoodsGrid.appendChild(card);
        });
    }

    // 获取当前日期和最近的节假日
    function getHolidayKeyword() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        
        // 节假日映射
        const holidays = {
            '1-1': '元旦',
            '2-14': '情人节',
            '3-8': '妇女节',
            '5-1': '劳动节',
            '6-1': '儿童节',
            '10-1': '国庆节',
            '11-11': '双十一',
            '12-12': '双十二',
            '12-25': '圣诞节'
        };
        
        // 检查今天是否是节假日
        const todayKey = `${month}-${day}`;
        if (holidays[todayKey]) {
            return holidays[todayKey];
        }
        
        // 检查最近7天内的节假日
        for (let i = 1; i <= 7; i++) {
            const futureDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
            const futureMonth = futureDate.getMonth() + 1;
            const futureDay = futureDate.getDate();
            const futureKey = `${futureMonth}-${futureDay}`;
            if (holidays[futureKey]) {
                return holidays[futureKey];
            }
        }
        
        // 根据季节返回默认关键词
        if (month >= 3 && month <= 5) return '春季';
        if (month >= 6 && month <= 8) return '夏季';
        if (month >= 9 && month <= 11) return '秋季';
        return '冬季';
    }

    // AI生成购物内容
    async function generateShoppingContent() {
        console.log('🎨 开始生成购物内容');
        
        const generateBtn = document.getElementById('shopping-generate-btn');
        const searchInput = document.getElementById('shopping-search-input');
        
        if (!generateBtn || !searchInput) return;
        
        // 检查MainAPIManager是否可用
        if (!window.MainAPIManager) {
            alert('API管理器未加载，请刷新页面重试');
            return;
        }
        
        // 设置生成中状态
        generateBtn.classList.add('generating');
        generateBtn.querySelector('span').textContent = '生成中...';
        
        try {
            // 获取节假日关键词
            const holidayKeyword = getHolidayKeyword();
            
            // 构建AI提示词（精简版）
            const prompt = `生成淘宝购物页面JSON数据（主题：${holidayKeyword}）：

{
  "searchKeyword": "淘宝热搜 [与${holidayKeyword}相关的10字热搜]",
  "flashItems": [
    {"description": "[5-8字美食名称]", "imageDesc": "[20-30字美食详细描述：食材+口味+外观+温度+特点，像美团外卖的美食描述]", "price": "[9.9-39.9]"},
    {"description": "[5-8字美食名称]", "imageDesc": "[20-30字美食详细描述：食材+口味+外观+温度+特点，像美团外卖的美食描述]", "price": "[9.9-39.9]"},
    {"description": "[5-8字美食名称]", "imageDesc": "[20-30字美食详细描述：食材+口味+外观+温度+特点，像美团外卖的美食描述]", "price": "[9.9-39.9]"}
  ],
  "goodsList": [
    {"name": "[15-25字商品标题]", "imageDesc": "[60-80字超详细商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字商品标题]", "imageDesc": "[60-80字超详细商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字商品标题]", "imageDesc": "[60-80字超详细商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字商品标题]", "imageDesc": "[60-80字超详细商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字商品标题]", "imageDesc": "[60-80字超详细商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字商品标题]", "imageDesc": "[60-80字超详细商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字商品标题]", "imageDesc": "[60-80字超详细商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字商品标题]", "imageDesc": "[60-80字超详细商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字商品标题]", "imageDesc": "[60-80字超详细商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字商品标题]", "imageDesc": "[60-80字超详细商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字商品标题]", "imageDesc": "[60-80字超详细商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"},
    {"name": "[15-25字商品标题]", "imageDesc": "[60-80字超详细商品描述：颜色+材质+外观+设计+尺寸+功能+使用场景+卖点，要非常详细具体]", "price": "[19.9-199]", "sales": "[1-20]"}
  ]
}

要求：
1. 只返回JSON，不要其他文字
2. flashItems是外卖美食（吃的喝的），要符合${holidayKeyword}季节特点
3. goodsList是淘宝商品，要符合${holidayKeyword}主题
4. imageDesc是商品/美食图片的详细描述，要包含所有视觉细节
5. 价格和销量只填数字，不要单位`;

            // 调用主API
            const messages = [
                {
                    role: 'system',
                    content: '你是一个专业的电商内容生成助手，擅长生成真实、吸引人的商品信息。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ];
            
            console.log('📤 发送AI生成请求');
            
            // 使用MainAPIManager调用API
            const response = await callMainAPI(messages);
            
            console.log('📥 收到AI响应:', response);
            
            // 解析JSON响应
            let data;
            try {
                // 清理响应文本
                let cleanedResponse = response.trim();
                
                // 移除markdown代码块标记
                cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
                
                // 智能提取完整的JSON对象
                let jsonStr = null;
                
                // 方法1: 直接解析整个响应
                try {
                    data = JSON.parse(cleanedResponse);
                    console.log('✅ 方法1成功：直接解析');
                } catch (e1) {
                    console.log('⚠️ 方法1失败，尝试方法2');
                    
                    // 方法2: 使用括号匹配提取完整JSON
                    const startIndex = cleanedResponse.indexOf('{');
                    if (startIndex !== -1) {
                        let braceCount = 0;
                        let endIndex = -1;
                        
                        for (let i = startIndex; i < cleanedResponse.length; i++) {
                            const char = cleanedResponse[i];
                            if (char === '{') {
                                braceCount++;
                            } else if (char === '}') {
                                braceCount--;
                                if (braceCount === 0) {
                                    endIndex = i;
                                    break;
                                }
                            }
                        }
                        
                        console.log('🔍 括号匹配结果:', {
                            startIndex,
                            endIndex,
                            finalBraceCount: braceCount,
                            responseLength: cleanedResponse.length
                        });
                        
                        if (endIndex !== -1) {
                            jsonStr = cleanedResponse.substring(startIndex, endIndex + 1);
                            console.log('📝 提取的JSON长度:', jsonStr.length);
                            
                            // 尝试修复常见的JSON格式问题
                            jsonStr = jsonStr
                                .replace(/,(\s*[}\]])/g, '$1')  // 移除尾随逗号
                                .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')  // 确保键名有引号
                                .replace(/:\s*'([^']*)'/g, ': "$1"');  // 单引号改双引号
                            
                            try {
                                data = JSON.parse(jsonStr);
                                console.log('✅ 方法2成功：括号匹配提取JSON');
                            } catch (e2) {
                                console.error('❌ JSON解析失败');
                                console.error('原始响应:', response);
                                console.error('清理后的响应:', cleanedResponse);
                                console.error('提取的JSON:', jsonStr);
                                console.error('解析错误:', e2);
                                throw new Error('无法解析JSON格式：' + e2.message);
                            }
                        } else {
                            console.error('❌ 括号不匹配');
                            console.error('原始响应:', response);
                            console.error('清理后的响应:', cleanedResponse);
                            console.error('响应长度:', cleanedResponse.length);
                            console.error('最终括号计数:', braceCount);
                            
                            // 如果响应看起来被截断，给出更友好的提示
                            if (braceCount > 0) {
                                throw new Error('AI响应可能被截断，请尝试：\n1. 增加max_tokens参数\n2. 简化提示词\n3. 重新生成');
                            } else {
                                throw new Error('未找到完整的JSON对象（括号不匹配）');
                            }
                        }
                    } else {
                        console.error('❌ 未找到JSON起始标记');
                        console.error('原始响应:', response);
                        throw new Error('响应中未找到JSON数据');
                    }
                }
                
                // 验证数据结构
                if (!data.searchKeyword || !data.flashItems || !data.goodsList) {
                    console.warn('数据结构:', data);
                    throw new Error('JSON数据结构不完整，缺少必需字段');
                }
                
                console.log('✅ JSON解析成功:', data);
                
            } catch (e) {
                console.error('❌ JSON解析失败:', e);
                alert('生成失败：' + e.message + '\n\n请查看控制台了解详情');
                return;
            }
            
            // 更新页面内容
            updateShoppingContent(data);
            
            console.log('✅ 购物内容生成完成');
            
        } catch (error) {
            console.error('❌ 生成失败:', error);
            alert('生成失败：' + error.message);
        } finally {
            // 恢复按钮状态
            generateBtn.classList.remove('generating');
            generateBtn.querySelector('span').textContent = '生成';
        }
    }
    
    // 调用主API的辅助函数
    function callMainAPI(messages) {
        return new Promise((resolve, reject) => {
            const api = window.AppState?.apiSettings;
            if (!api || !api.endpoint || !api.selectedModel) {
                reject(new Error('请先配置API设置'));
                return;
            }
            
            const apiKey = api.apiKey || '';
            const normalized = api.endpoint.replace(/\/+$/, '');
            const baseEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
            const endpoint = baseEndpoint + '/chat/completions';
            
            const body = {
                model: api.selectedModel,
                messages: messages,
                temperature: 0.7,
                max_tokens: 8000
            };
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            
            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body),
                signal: controller.signal
            })
            .then(res => {
                clearTimeout(timeoutId);
                if (!res.ok) {
                    throw new Error(`API请求失败: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    resolve(data.choices[0].message.content);
                } else {
                    reject(new Error('API响应格式错误'));
                }
            })
            .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
    
    // 保存生成的内容到localStorage
    function saveShoppingContent(data) {
        try {
            localStorage.setItem('shopping_generated_content', JSON.stringify(data));
            console.log('✅ 购物内容已保存到localStorage');
        } catch (error) {
            console.error('❌ 保存购物内容失败:', error);
        }
    }
    
    // 从localStorage加载保存的内容
    function loadShoppingContent() {
        try {
            const savedData = localStorage.getItem('shopping_generated_content');
            if (savedData) {
                const data = JSON.parse(savedData);
                console.log('✅ 从localStorage加载购物内容');
                updateShoppingContent(data);
                return true;
            }
        } catch (error) {
            console.error('❌ 加载购物内容失败:', error);
        }
        return false;
    }
    
    // 更新购物页面内容
    function updateShoppingContent(data) {
        const shoppingPage = document.getElementById('shopping-page');
        if (!shoppingPage) return;
        
        // 1. 更新搜索栏
        const searchInput = document.getElementById('shopping-search-input');
        if (searchInput && data.searchKeyword) {
            searchInput.placeholder = data.searchKeyword;
        }
        
        // 2. 更新外卖闪购商品
        const flashItems = shoppingPage.querySelectorAll('.flash-item');
        if (data.flashItems && flashItems.length >= 3) {
            data.flashItems.forEach((item, index) => {
                if (index < flashItems.length) {
                    const flashItem = flashItems[index];
                    
                    // 使用Pollinations AI生成真实图片
                    const img = flashItem.querySelector('img');
                    if (img) {
                        // 使用imageDesc作为提示词生成图片
                        const prompt = encodeURIComponent(item.imageDesc || item.description);
                        const imageUrl = `https://gen.pollinations.ai/image/${prompt}?model=zimage&width=1080&height=2160&nologo=true&key=sk_InRGAIaBbde6kBPCSzO4FsOHTvYKQocd`;
                        img.src = imageUrl;
                        img.alt = item.description;
                        
                        // 保存详细描述到data属性，供详情页使用
                        img.setAttribute('data-desc', item.imageDesc || item.description);
                        
                        // 添加加载状态
                        img.style.opacity = '0.5';
                        img.onload = function() {
                            this.style.opacity = '1';
                        };
                        img.onerror = function() {
                            console.error('图片加载失败:', imageUrl);
                            this.style.opacity = '1';
                        };
                    }
                    
                    // 更新商品名称和价格
                    const nameEl = flashItem.querySelector('.name');
                    const priceEl = flashItem.querySelector('.price');
                    if (nameEl) nameEl.textContent = item.description;
                    if (priceEl) priceEl.textContent = `¥${item.price}`;
                }
            });
        }
        
        // 3. 更新主商品列表
        const goodsCards = shoppingPage.querySelectorAll('.goods-card');
        if (data.goodsList && goodsCards.length >= 12) {
            data.goodsList.forEach((item, index) => {
                if (index < 12 && index < goodsCards.length) {
                    const card = goodsCards[index];
                    
                    // 使用Pollinations AI生成真实图片
                    const img = card.querySelector('img');
                    if (img) {
                        // 使用imageDesc作为提示词生成图片
                        const prompt = encodeURIComponent(item.imageDesc || item.name);
                        const imageUrl = `https://gen.pollinations.ai/image/${prompt}?model=zimage&width=1080&height=2160&nologo=true&key=sk_InRGAIaBbde6kBPCSzO4FsOHTvYKQocd`;
                        img.src = imageUrl;
                        img.alt = item.name;
                        
                        // 保存详细描述到data属性，供详情页使用
                        img.setAttribute('data-desc', item.imageDesc || item.name);
                        
                        // 添加加载状态
                        img.style.opacity = '0.5';
                        img.onload = function() {
                            this.style.opacity = '1';
                        };
                        img.onerror = function() {
                            console.error('图片加载失败:', imageUrl);
                            this.style.opacity = '1';
                        };
                    }
                    
                    // 更新商品信息
                    const nameEl = card.querySelector('.name');
                    const priceEl = card.querySelector('.price');
                    
                    if (nameEl) nameEl.textContent = item.name;
                    if (priceEl) {
                        priceEl.innerHTML = `¥${item.price} <span class="sales">月销${item.sales}w+</span>`;
                    }
                }
            });
        }
        
        // 保存到localStorage
        saveShoppingContent(data);
        
        console.log('✅ 页面内容已更新');
    }

    // 初始化商品详情页
    function initGoodsDetail() {
        // 返回按钮
        const backBtn = document.getElementById('goods-detail-back');
        if (backBtn) {
            backBtn.addEventListener('click', closeGoodsDetail);
        }
        
        // 加入购物车按钮
        const addCartBtn = document.getElementById('goods-detail-add-cart');
        if (addCartBtn) {
            addCartBtn.addEventListener('click', addToCart);
        }
        
        // 转发按钮
        const forwardBtn = document.getElementById('goods-detail-forward');
        if (forwardBtn) {
            forwardBtn.addEventListener('click', forwardGoods);
        }
        
        // 转发弹窗关闭按钮
        const modalCloseBtn = document.getElementById('forward-modal-close');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', closeForwardModal);
        }
        
        // 点击弹窗背景关闭
        const modal = document.getElementById('forward-modal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeForwardModal();
                }
            });
        }
        
        console.log('商品详情页初始化完成');
    }

    // 初始化所有功能
    function initAll() {
        console.log('购物页面初始化开始...');
        initShoppingPage();
        bindGoodsEvents();
        initGoodsDetail();
        
        // 页面加载时尝试恢复保存的内容
        loadShoppingContent();
        initFooterNav();
        initCategoryPage();
        
        // 初始化购物车页面
        if (window.CartPage) {
            window.CartPage.init();
        }
        
        console.log('购物页面初始化完成！');
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // 延迟初始化，确保DOM完全加载
            setTimeout(initAll, 100);
        });
    } else {
        // 如果DOM已经加载完成，立即初始化
        setTimeout(initAll, 100);
    }

    // 导出函数供外部使用
    window.ShoppingPage = {
        init: initShoppingPage,
        toggleCart: toggleCartPage,
        calculateCart: calculateCart,
        initFooterNav: initFooterNav,
        initCategoryPage: initCategoryPage,
        initAll: initAll,
        showGoodsDetail: showGoodsDetail,
        closeGoodsDetail: closeGoodsDetail
    };

})();