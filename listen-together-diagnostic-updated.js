// Listen Together 诊断工具 - 更新版
// 专门用于测试指令限制逻辑和一起听状态管理

window.ListenTogetherDiagnostic = {
    // 基础状态检查
    checkState: function() {
        console.log('=== Listen Together 状态检查 ===');
        
        const state = window.ListenTogether?.getState();
        if (!state) {
            console.error('❌ ListenTogether 状态不可用');
            return;
        }
        
        console.log('🎵 一起听状态:', state.isActive ? '🟢 活跃' : '🔴 未激活');
        console.log('🎤 发起者:', state.initiator || '未知');
        
        if (state.isActive && state.currentSong) {
            console.log('🎶 当前歌曲:', state.currentSong.name || state.currentSong.title);
            console.log('🎤 歌手:', state.currentSong.artist || state.currentSong.author);
        }
        
        // 检查消息中的未回复邀请
        const unrepliedUserInvites = window.ListenTogether?.findUnrepliedUserInvitations();
        const unrepliedAIInvites = window.ListenTogether?.findUnrepliedAIInvitations();
        
        console.log('📬 用户未回复邀请数:', unrepliedUserInvites?.length || 0);
        console.log('📬 AI未回复邀请数:', unrepliedAIInvites?.length || 0);
        
        return state;
    },

    // 指令可用性模拟
    simulateInstructionAvailability: function() {
        console.log('=== 指令可用性模拟 ===');
        
        const state = window.ListenTogether?.getState();
        if (!state) return;
        
        // 模拟不同状态下的指令可用性
        const scenarios = [
            { name: '初始状态（没有一起听）', isActive: false, hasUserInvite: false },
            { name: '用户邀请中（未回复）', isActive: false, hasUserInvite: true },
            { name: '一起听活跃中', isActive: true, hasUserInvite: false },
            { name: '一起听活跃+用户邀请', isActive: true, hasUserInvite: true }
        ];
        
        scenarios.forEach(scenario => {
            const mockState = { 
                ...state, 
                isActive: scenario.isActive 
            };
            
            // 模拟消息中的用户邀请
            const mockUserInvite = scenario.hasUserInvite ? [{
                type: 'listen_invite',
                sender: 'received',
                isInvitationToListen: true,
                isInvitationAnswered: false,
                songName: '测试歌曲'
            }] : [];
            
            const available = this.getAvailableInstructions(mockState, mockUserInvite);
            
            console.log(`\n📋 ${scenario.name}:`);
            console.log('可用指令:', Object.keys(available).join(', '));
        });
    },

    // 获取可用指令（核心逻辑）
    getAvailableInstructions: function(listenState, userInvites = []) {
        const available = {};
        
        // CHANGE_SONG - 总是可用（一起听状态中）
        if (listenState.isActive) {
            available.CHANGE_SONG = {
                name: 'CHANGE_SONG',
                description: '切歌',
                available: true,
                reason: '一起听状态中可用'
            };
        }
        
        // ADD_FAVORITE_SONG - 总是可用（一起听状态中）
        if (listenState.isActive) {
            available.ADD_FAVORITE_SONG = {
                name: 'ADD_FAVORITE_SONG',
                description: '收藏歌曲',
                available: true,
                reason: '一起听状态中可用'
            };
        }
        
        // INVITE_LISTEN - 仅在非一起听状态可用
        if (!listenState.isActive) {
            available.INVITE_LISTEN = {
                name: 'INVITE_LISTEN',
                description: '邀请用户一起听',
                available: true,
                reason: '不处于一起听状态时可用'
            };
        } else {
            available.INVITE_LISTEN = {
                name: 'INVITE_LISTEN',
                description: '邀请用户一起听',
                available: false,
                reason: '已处于一起听状态，不可用'
            };
        }
        
        // ACCEPT/REJECT - 仅在用户有未回复邀请时可用
        if (userInvites.length > 0) {
            available.ACCEPT_LISTEN_INVITATION = {
                name: 'ACCEPT_LISTEN_INVITATION',
                description: '接受邀请',
                available: true,
                reason: '用户发送了未回复的邀请'
            };
            
            available.REJECT_LISTEN_INVITATION = {
                name: 'REJECT_LISTEN_INVITATION',
                description: '拒绝邀请',
                available: true,
                reason: '用户发送了未回复的邀请'
            };
        } else {
            available.ACCEPT_LISTEN_INVITATION = {
                name: 'ACCEPT_LISTEN_INVITATION',
                description: '接受邀请',
                available: false,
                reason: '没有用户邀请'
            };
            
            available.REJECT_LISTEN_INVITATION = {
                name: 'REJECT_LISTEN_INVITATION',
                description: '拒绝邀请',
                available: false,
                reason: '没有用户邀请'
            };
        }
        
        return available;
    },

    // 测试邀请发送流程
    testInvitationFlow: function() {
        console.log('=== 邀请流程测试 ===');
        
        // 检查初始状态
        const initialState = this.checkState();
        
        // 模拟发送邀请的测试
        if (initialState && !initialState.isActive) {
            console.log('✅ 状态检查通过：可以发送邀请');
            
            // 检查是否存在一起听状态管理器
            if (window.ListenTogether && window.ListenTogether.toggleListenTogether) {
                console.log('✅ 一键加入一起听功能可用');
            } else {
                console.log('⚠️ 一键加入一起听功能可能不存在');
            }
        } else {
            console.log('❌ 当前处于一起听状态，无法发送新邀请');
        }
    },

    // 测试切歌功能
    testChangeSong: function() {
        console.log('=== 切歌功能测试 ===');
        
        const state = this.checkState();
        
        if (state && state.isActive) {
            console.log('✅ 一同听状态中，切歌功能应该可用');
            
            // 检查喜欢库中的歌曲
            const favorites = localStorage.getItem('listen-favorites');
            if (favorites) {
                try {
                    const favoritesArray = JSON.parse(favorites);
                    console.log(`🎵 喜欢库中有 ${favoritesArray.length} 首歌曲`);
                    console.log('示例歌曲:', favoritesArray.slice(0, 3));
                } catch (e) {
                    console.log('❌ 喜欢库解析失败');
                }
            } else {
                console.log('❌ 喜欢库为空');
            }
        } else {
            console.log('❌ 不处于一起听状态，切歌指令不可用');
        }
    },

    // 完整功能测试
    runFullTest: function() {
        console.log('🚀 开始 Listen Together 完整功能测试...\n');
        
        // 1. 基础状态检查
        this.checkState();
        
        // 2. 指令可用性模拟
        this.simulateInstructionAvailability();
        
        // 3. 邀请流程测试
        this.testInvitationFlow();
        
        // 4. 切歌功能测试
        this.testChangeSong();
        
        // 5. 系统提示生成（如果main-api-manager可用）
        this.testSystemPromptGeneration();
        
        console.log('\n✅ 测试完成');
    },

    // 测试系统提示生成（模拟main-api-manager逻辑）
    testSystemPromptGeneration: function() {
        console.log('=== 系统提示生成测试 ===');
        
        // 模拟用户发送邀请的消息
        const mockUserInvite = [{
            type: 'listen_invite',
            sender: 'received',
            isInvitationToListen: true,
            isInvitationAnswered: false,
            songName: '告白气球'
        }];
        
        // 模拟不同状态
        const testCases = [
            {
                name: '用户邀请中 + 不处于一起听',
                listenState: { isActive: false },
                userInvites: mockUserInvite
            },
            {
                name: '一起听进行中',
                listenState: { isActive: true },
                userInvites: []
            },
            {
                name: '不处于一起听 + 无邀请',
                listenState: { isActive: false },
                userInvites: []
            }
        ];
        
        testCases.forEach(testCase => {
            console.log(`\n📋 测试场景: ${testCase.name}`);
            
            const instructions = this.getAvailableInstructions(
                testCase.listenState, 
                testCase.userInvites
            );
            
            console.log('可用指令:');
            Object.entries(instructions).forEach(([key, info]) => {
                const status = info.available ? '✅' : '❌';
                console.log(`  ${status} [${info.name}] - ${info.reason}`);
            });
        });
    },

    // 实时监控歌词更新
    monitorLyricUpdates: function(duration = 10000) {
        console.log(`🎵 开始监控歌词更新 (${duration}ms)...`);
        
        let startTime = Date.now();
        let updateCount = 0;
        
        const checkInterval = setInterval(() => {
            const state = window.ListenTogether?.getState();
            
            if (state && state.currentLyricIndex !== undefined) {
                updateCount++;
                console.log(`🔄 歌词更新 #${updateCount}: 索引=${state.currentLyricIndex}`);
                
                if (state.allLyrics && state.allLyrics.length > 0) {
                    const currentLyric = state.allLyrics[state.currentLyricIndex];
                    if (currentLyric) {
                        console.log(`🎤 当前歌词: ${currentLyric}`);
                    }
                }
            }
            
            if (Date.now() - startTime >= duration) {
                clearInterval(checkInterval);
                console.log(`✅ 监控完成，共检测到 ${updateCount} 次歌词更新`);
            }
        }, 1000);
    }
};

// 在控制台直接可用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ListenTogetherDiagnostic;
}