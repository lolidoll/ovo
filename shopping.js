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
                shoppingPage.classList.remove('active');
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
            const baseEndpoint = api.endpoint.replace(/\/+$/, '');
            const endpoint = baseEndpoint + '/v1/chat/completions';
            
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
                    
                    // 移除图片，添加文字卡片（显示详细描述）
                    const img = flashItem.querySelector('img');
                    if (img) {
                        const textCard = document.createElement('div');
                        textCard.className = 'text-card';
                        textCard.innerHTML = `<div class="card-text">${item.imageDesc || item.description}</div>`;
                        img.replaceWith(textCard);
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
                    
                    // 移除图片，添加文字卡片（显示详细描述）
                    const img = card.querySelector('img');
                    if (img) {
                        const textCard = document.createElement('div');
                        textCard.className = 'text-card';
                        textCard.innerHTML = `<div class="card-text">${item.imageDesc || item.name}</div>`;
                        img.replaceWith(textCard);
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

    // 初始化所有功能
    function initAll() {
        console.log('购物页面初始化开始...');
        initShoppingPage();
        bindGoodsEvents();
        
        // 页面加载时尝试恢复保存的内容
        loadShoppingContent();
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