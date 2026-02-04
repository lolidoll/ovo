// 购物页面脚本 - 淘宝风格

(function() {
    'use strict';

    // 购物页面初始化
    function initShoppingPage() {
        const shoppingPage = document.getElementById('shopping-page');
        if (!shoppingPage) return;

        // 绑定购物车图标点击事件
        const cartIcon = shoppingPage.querySelector('.shopping-header-icon');
        if (cartIcon) {
            cartIcon.addEventListener('click', toggleCartPage);
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

    // 商品卡片点击事件
    function handleGoodsClick(event) {
        const card = event.currentTarget;
        const goodsName = card.querySelector('.name').textContent;
        console.log('点击商品:', goodsName);
        // 这里可以添加跳转到商品详情页的逻辑
    }

    // 闪购商品点击事件
    function handleFlashItemClick(event) {
        const item = event.currentTarget;
        const itemName = item.querySelector('.name').textContent;
        console.log('点击闪购商品:', itemName);
        // 这里可以添加跳转到商品详情页的逻辑
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
                    
                    // 检查购物车是否为空
                    const cartEmpty = shoppingPage.querySelector('.cart-empty');
                    const cartList = shoppingPage.querySelector('.cart-list');
                    
                    if (cartEmpty && cartEmpty.classList.contains('active')) {
                        if (cartFooter) cartFooter.classList.remove('active');
                    } else if (cartList && cartList.classList.contains('active')) {
                        if (cartFooter) cartFooter.classList.add('active');
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

        // 顶部标签切换
        const categoryTopItems = shoppingPage.querySelectorAll('.category-top-item');
        categoryTopItems.forEach(item => {
            item.addEventListener('click', function() {
                categoryTopItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // 左侧分类切换
        const categoryLeftItems = shoppingPage.querySelectorAll('.category-left-item');
        categoryLeftItems.forEach(item => {
            item.addEventListener('click', function() {
                categoryLeftItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    // 初始化所有功能
    function initAll() {
        console.log('购物页面初始化开始...');
        initShoppingPage();
        bindGoodsEvents();
        initFooterNav();
        initCategoryPage();
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
        initAll: initAll
    };

})();