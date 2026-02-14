// 钱包功能模块
(function() {
    'use strict';

    // 创建蓝白简约样式的自定义弹窗
    function createCustomModal(title, content, buttons) {
        const modal = document.createElement('div');
        modal.className = 'wallet-custom-modal';
        modal.innerHTML = `
            <div class="wallet-modal-overlay"></div>
            <div class="wallet-modal-box">
                <div class="wallet-modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="wallet-modal-body">
                    ${content}
                </div>
                <div class="wallet-modal-footer">
                    ${buttons}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭动画
        setTimeout(() => modal.classList.add('show'), 10);
        
        return modal;
    }

    // 显示充值弹窗
    function showRechargeModal() {
        const modal = createCustomModal(
            '充值薯片币',
            `<div class="wallet-input-group">
                <label class="wallet-input-label">充值金额</label>
                <input type="number" id="wallet-recharge-input" class="wallet-input" placeholder="请输入充值金额(1-100000)" min="1" max="100000">
                <div class="wallet-input-hint">温馨提示: 充值金额范围为 1-100000 薯片币</div>
            </div>`,
            `<button class="wallet-modal-btn wallet-btn-cancel" onclick="this.closest('.wallet-custom-modal').remove()">取消</button>
             <button class="wallet-modal-btn wallet-btn-confirm" id="wallet-confirm-recharge">确认充值</button>`
        );
        
        const confirmBtn = modal.querySelector('#wallet-confirm-recharge');
        const input = modal.querySelector('#wallet-recharge-input');
        
        confirmBtn.onclick = () => {
            const amount = parseInt(input.value);
            if (!amount || amount < 1 || amount > 100000) {
                showToast('请输入1-100000之间的金额');
                return;
            }
            rechargeWallet(amount);
            modal.remove();
        };
        
        // 按Enter键确认
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
        });
        
        // 自动聚焦输入框
        setTimeout(() => input.focus(), 100);
    }

    // 显示确认弹窗
    function showConfirmModal(message, onConfirm) {
        const modal = createCustomModal(
            '确认操作',
            `<div class="wallet-confirm-message">${message}</div>`,
            `<button class="wallet-modal-btn wallet-btn-cancel" onclick="this.closest('.wallet-custom-modal').remove()">取消</button>
             <button class="wallet-modal-btn wallet-btn-confirm" id="wallet-confirm-action">确认</button>`
        );
        
        const confirmBtn = modal.querySelector('#wallet-confirm-action');
        confirmBtn.onclick = () => {
            onConfirm();
            modal.remove();
        };
    }

    // 显示提示弹窗
    function showAlertModal(message) {
        const modal = createCustomModal(
            '提示',
            `<div class="wallet-confirm-message">${message}</div>`,
            `<button class="wallet-modal-btn wallet-btn-confirm" onclick="this.closest('.wallet-custom-modal').remove()">确定</button>`
        );
    }

    // 打开钱包页面
    window.openWalletPage = function() {
        const page = document.getElementById('wallet-page');
        if (!page) return;
        
        // 更新余额显示
        const balanceElement = document.getElementById('wallet-balance');
        if (balanceElement) {
            balanceElement.textContent = AppState.user.coins || 0;
        }
        
        // 更新交易记录
        updateWalletRecords();
        
        page.classList.add('open');
        
        // 初始化事件监听器
        initWalletEvents();
    };

    // 初始化钱包事件监听器
    function initWalletEvents() {
        const page = document.getElementById('wallet-page');
        if (!page) return;
        
        // 返回按钮
        const backBtn = page.querySelector('.wallet-back-btn');
        if (backBtn) {
            backBtn.onclick = () => page.classList.remove('open');
        }
        
        // 眼睛按钮 - 显示/隐藏余额
        const eyeBtn = document.getElementById('wallet-eye-btn');
        const balanceElement = document.getElementById('wallet-balance');
        let isShow = true;
        if (eyeBtn && balanceElement) {
            eyeBtn.onclick = () => {
                isShow = !isShow;
                if (isShow) {
                    balanceElement.textContent = AppState.user.coins || 0;
                    eyeBtn.className = 'fa-solid fa-eye-slash eye-btn';
                } else {
                    balanceElement.textContent = '****';
                    eyeBtn.className = 'fa-solid fa-eye eye-btn';
                }
            };
        }
        
        // 充值按钮
        const rechargeBtn = document.getElementById('wallet-recharge-btn');
        if (rechargeBtn) {
            rechargeBtn.onclick = showRechargeModal;
        }
        
        // 交易记录按钮
        const recordBtn = document.getElementById('wallet-record-btn');
        const modal = document.getElementById('wallet-trade-modal');
        const closeModal = document.getElementById('wallet-close-modal');
        
        if (recordBtn && modal) {
            recordBtn.onclick = () => {
                modal.style.display = 'flex';
                updateWalletRecords();
            };
        }
        
        if (closeModal && modal) {
            closeModal.onclick = () => modal.style.display = 'none';
            modal.onclick = (e) => {
                if (e.target === modal) modal.style.display = 'none';
            };
        }
        
        // 功能网格项
        const gridItems = page.querySelectorAll('.grid-item');
        gridItems.forEach(item => {
            item.onclick = () => handleWalletFunction(item.dataset.func);
        });
    }

    // 处理钱包功能
    function handleWalletFunction(funcKey) {
        const funcMap = {
            'lottery': { name: '幸运大转盘', cost: 5, desc: '幸运大转盘：消耗5薯片币/次，有机会赢取1000薯片币大奖、稀有装扮等奖励' },
            'daily-fortune': { name: '今日运势', cost: 3, desc: '今日运势：消耗3薯片币/次，基于星座/生肖生成专属日运+幸运指南+避坑建议' },
            'tarot': { name: '今日塔罗牌', cost: 8, desc: '今日塔罗牌：消耗8薯片币/次，单抽塔罗牌解析爱情、事业、运势走向，附带解读方案' },
            'unlock-character': { name: '解锁人设', cost: 50, desc: '解锁人设：消耗50薯片币/个，获得限定AI人设（古风侠客、赛博侦探等）永久对话权限' },
            'dream-analyze': { name: '梦境解析', cost: 10, desc: '梦境解析：消耗10薯片币/次，描述梦境内容，AI生成趣味脑洞解读与潜在寓意' },
            'cold-knowledge': { name: '冷知识推送', cost: 2, desc: '冷知识推送：消耗2薯片币/次，解锁当日专属趣味冷知识，涨见识还能分享好友' },
            'sign-in': { name: '每日签到', cost: 0, reward: 2, desc: '每日签到：今日签到成功，获得2薯片币，连续签到可解锁翻倍奖励' },
            'watch-ad': { name: '看广告赚币', cost: 0, reward: 3, desc: '看广告赚币：观看15秒广告，成功获得3薯片币，每日限3次' },
            'donate': { name: '薯片币捐赠', cost: 0, desc: '薯片币捐赠：捐赠任意数量薯片币，兑换爱心徽章展示在个人主页，传递公益力量' }
        };
        
        const func = funcMap[funcKey];
        if (!func) return;
        
        const currentAmount = AppState.user.coins || 0;
        
        // 余额不足判断
        if (func.cost > 0 && currentAmount < func.cost) {
            showAlertModal('薯片币余额不足，请先赚币或充值~');
            return;
        }
        
        showAlertModal(func.desc);
        
        // 扣除消耗或增加收益
        if (func.cost > 0) {
            AppState.user.coins = currentAmount - func.cost;
            AppState.walletHistory.push({
                amount: -func.cost,
                type: func.name,
                time: new Date().toISOString()
            });
        } else if (func.reward) {
            AppState.user.coins = currentAmount + func.reward;
            AppState.walletHistory.push({
                amount: func.reward,
                type: func.name,
                time: new Date().toISOString()
            });
        }
        
        saveToStorage();
        
        // 更新余额显示
        const balanceElement = document.getElementById('wallet-balance');
        if (balanceElement) {
            balanceElement.textContent = AppState.user.coins || 0;
        }
        
        updateWalletRecords();
    }

    // 充值虚拟币
    function rechargeWallet(amount) {
        AppState.user.coins = (AppState.user.coins || 0) + amount;
        AppState.walletHistory.push({
            amount: amount,
            type: '充值',
            time: new Date().toISOString()
        });
        saveToStorage();
        showToast(`充值成功，获得${amount}薯片币`);
        
        // 更新余额显示
        const balanceElement = document.getElementById('wallet-balance');
        if (balanceElement) {
            balanceElement.textContent = AppState.user.coins || 0;
        }
        
        updateWalletRecords();
    }

    // 更新交易记录
    function updateWalletRecords() {
        const recordList = document.getElementById('wallet-record-list');
        if (!recordList) return;
        
        if (!AppState.walletHistory || AppState.walletHistory.length === 0) {
            recordList.innerHTML = `
                <div style="text-align:center;color:#bbb;padding:20px;font-size:12px;">暂无交易记录</div>
            `;
            return;
        }
        
        const records = AppState.walletHistory.slice(-15).reverse();
        recordList.innerHTML = records.map(item => {
            const isPositive = item.amount > 0;
            const iconClass = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
            const amountClass = isPositive ? 'amount-in' : 'amount-out';
            const sign = isPositive ? '+' : '';
            
            return `
                <div class="record-item">
                    <div class="record-icon">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="record-info">
                        <div class="record-title">${item.type || '交易'}</div>
                        <div class="record-time">${new Date(item.time).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</div>
                    </div>
                    <div class="record-amount ${amountClass}">${sign}${item.amount}</div>
                </div>
            `;
        }).join('');
    }

    // ========== 导出钱包管理函数供其他模块使用 ==========
    
    // 获取当前余额
    window.WalletManager = {
        getBalance: function() {
            return AppState.user.coins || 0;
        },
        
        // 扣除余额
        deductBalance: function(amount, type = '购物支付') {
            const currentBalance = AppState.user.coins || 0;
            
            if (currentBalance < amount) {
                return {
                    success: false,
                    message: '余额不足，请先充值'
                };
            }
            
            // 扣除余额
            AppState.user.coins = currentBalance - amount;
            
            // 添加交易记录
            AppState.walletHistory.push({
                amount: -amount,
                type: type,
                time: new Date().toISOString()
            });
            
            // 保存到localStorage
            saveToStorage();
            
            // 更新钱包页面显示（如果钱包页面已打开）
            const balanceElement = document.getElementById('wallet-balance');
            if (balanceElement) {
                balanceElement.textContent = AppState.user.coins;
            }
            updateWalletRecords();
            
            return {
                success: true,
                newBalance: AppState.user.coins
            };
        },
        
        // 添加余额（用于退款等场景）
        addBalance: function(amount, type = '退款') {
            const currentBalance = AppState.user.coins || 0;
            
            // 增加余额
            AppState.user.coins = currentBalance + amount;
            
            // 添加交易记录
            AppState.walletHistory.push({
                amount: amount,
                type: type,
                time: new Date().toISOString()
            });
            
            // 保存到localStorage
            saveToStorage();
            
            // 更新钱包页面显示（如果钱包页面已打开）
            const balanceElement = document.getElementById('wallet-balance');
            if (balanceElement) {
                balanceElement.textContent = AppState.user.coins;
            }
            updateWalletRecords();
            
            return {
                success: true,
                newBalance: AppState.user.coins
            };
        }
    };

})();