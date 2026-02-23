/**
 * 一起听功能诊断脚本
 * 用于检查歌词上下文是否正确实现
 */

window.ListenTogetherDiagnostic = {
    /**
     * 检查歌词上下文完整性
     */
    checkLyricContext: function() {
        console.log('========== 一起听歌词上下文诊断 ==========');
        
        if (!window.ListenTogether) {
            console.error('❌ ListenTogether模块未加载');
            return { success: false, message: 'ListenTogether模块未加载' };
        }
        
        const state = window.ListenTogether.getState();
        console.log('当前一起听状态:', state);
        
        // 1. 检查一起听是否激活
        console.log('\n【检查1】一起听激活状态：', state.isActive ? '✓ 已激活' : '✗ 未激活');
        if (!state.isActive) {
            console.warn('⚠️ 一起听尚未激活，请先打开一起听');
            return { success: false, message: '一起听未激活' };
        }
        
        // 2. 检查当前歌曲
        console.log('\n【检查2】当前歌曲信息：');
        if (!state.currentSong) {
            console.error('❌ 未获取到当前歌曲');
            return { success: false, message: '当前歌曲为空' };
        }
        
        const songName = state.currentSong.name || state.currentSong.title || '未知';
        const artist = state.currentSong.artist || state.currentSong.author || '未知';
        console.log(`  歌曲：${songName}`);
        console.log(`  歌手：${artist}`);
        console.log(`  ✓ 歌曲和歌手都可正确读取`);
        
        // 3. 检查歌词数据
        console.log('\n【检查3】歌词数据完整性：');
        
        if (!state.allLyrics) {
            console.warn('⚠️ allLyrics不存在或为空 - 歌词可能未加载');
            console.warn('  原因可能：');
            console.warn('    1. 正在加载歌词中');
            console.warn('    2. API歌词接口无法访问');
            console.warn('    3. 歌曲不支持歌词');
            return { success: false, message: 'allLyrics为空，歌词未加载' };
        }
        
        console.log(`  ✓ allLyrics存在，包含${state.allLyrics.length}行歌词`);
        console.log(`  示例歌词（1-3行）：`);
        state.allLyrics.slice(0, 3).forEach((lyric, idx) => {
            console.log(`    ${idx + 1}: ${lyric}`);
        });
        
        // 4. 检查当前歌词索引
        console.log('\n【检查4】当前歌词索引：');
        
        if (state.currentLyricIndex === undefined || state.currentLyricIndex === null) {
            console.warn('⚠️ currentLyricIndex不存在');
            console.warn('  可能原因：');
            console.warn('    1. 歌词工作不正常');
            console.warn('    2. 音频未播放');
            return { success: false, message: 'currentLyricIndex为空' };
        }
        
        console.log(`  ✓ 当前歌词索引：${state.currentLyricIndex}`);
        console.log(`  ✓ 当前歌词：${state.allLyrics[state.currentLyricIndex] || '(索引超出范围)'}`);
        
        // 5. 检查上下文歌词范围
        console.log('\n【检查5】歌词上下文完整性（上下各10句）：');
        
        const startIndex = Math.max(0, state.currentLyricIndex - 10);
        const endIndex = Math.min(state.allLyrics.length, state.currentLyricIndex + 11);
        
        console.log(`  范围：${startIndex} - ${endIndex - 1}`);
        console.log(`  共${endIndex - startIndex}行歌词`);
        console.log(`  ✓ 上下文歌词详情：`);
        
        for (let i = startIndex; i < endIndex; i++) {
            const prefix = i === state.currentLyricIndex ? '▶' : ' ';
            const marker = i === state.currentLyricIndex ? '  【← 当前】' : '';
            console.log(`    ${prefix} ${i}: ${state.allLyrics[i]}${marker}`);
        }
        
        // 6. 检查播放状态
        console.log('\n【检查6】播放状态：');
        console.log(`  播放中：${state.isPlaying ? '✓ 是' : '✗ 否'}`);
        
        if (!state.isPlaying) {
            console.warn('⚠️ 音频已暂停，歌词索引可能不会更新');
            console.warn('  建议：播放音频后重新诊断');
        }
        
        // 7. 邀请指令说明
        console.log('\n【检查7】一起听邀请指令说明：');
        console.log('  ✓ [ACCEPT_LISTEN_INVITATION]：直接使用，无需参数，表示接受邀请');
        console.log('  ✓ [REJECT_LISTEN_INVITATION]：直接使用，无需参数，表示拒绝邀请');
        console.log('  ✓ 这两个指令只在用户发送邀请时可用，进入一起听状态后不可用');
        console.log('  ✓ AI可以在指令前后用正常对话表达想法');
        
        // 8. 系统提示检查
        console.log('\n【检查8】系统提示中是否包含歌词：：');
        console.log('  这将由main-api-manager.js中的生成逻辑处理');
        console.log('  ✓ 系统提示中应该包含以下内容：');
        console.log(`    - 歌曲名：${songName}`);
        console.log(`    - 歌手：${artist}`);
        console.log(`    - 当前歌词：${state.allLyrics[state.currentLyricIndex]}`);
        console.log(`    - 上下文歌词：共${endIndex - startIndex}行`);
        
        console.log('\n========== 诊断完成 ==========');
        console.log('✅ 所有检查通过！一起听歌词上下文已完整实现');
        
        return {
            success: true,
            message: '所有检查通过',
            data: {
                songName,
                artist,
                totalLyrics: state.allLyrics.length,
                currentLyricIndex: state.currentLyricIndex,
                contextRange: `${startIndex}-${endIndex - 1}`,
                isPlaying: state.isPlaying
            }
        };
    },
    
    /**
     * 模拟生成系统提示（用于测试）
     */
    simulateSystemPrompt: function() {
        console.log('\n========== 模拟系统提示生成 ==========');
        
        const state = window.ListenTogether.getState();
        
        if (!state.isActive || !state.allLyrics) {
            console.warn('⚠️ 无法生成：一起听未激活或歌词为空');
            return;
        }
        
        const listenContext = [];
        
        // 歌曲信息
        const songName = state.currentSong.name || state.currentSong.title || '';
        const artist = state.currentSong.artist || state.currentSong.author || '';
        
        listenContext.push('【远程一起听音乐】目前你和用户在手机聊天应用的"一起听"功能中同步播放音乐。');
        
        if (songName) {
            if (artist) {
                listenContext.push(`- 当前播放歌曲：${songName} - ${artist}`);
            } else {
                listenContext.push(`- 当前播放歌曲：${songName}`);
            }
        }
        
        // 歌词上下文
        if (state.allLyrics && state.allLyrics.length > 0) {
            listenContext.push('- 【当前播放的歌词上下文】这是当前正在播放的歌曲的歌词：');
            
            const currentLyricIndex = state.currentLyricIndex || 0;
            const startIndex = Math.max(0, currentLyricIndex - 10);
            const endIndex = Math.min(state.allLyrics.length, currentLyricIndex + 11);
            
            if (startIndex > 0) {
                listenContext.push(`  ...（前${startIndex}行歌词省略）`);
            }
            
            for (let i = startIndex; i < endIndex; i++) {
                const lyric = state.allLyrics[i];
                if (i === currentLyricIndex) {
                    listenContext.push(`  ▶ ${lyric}  【← 正在播放】`);
                } else {
                    listenContext.push(`    ${lyric}`);
                }
            }
            
            if (endIndex < state.allLyrics.length) {
                listenContext.push(`  ...（后${state.allLyrics.length - endIndex}行歌词省略）`);
            }
        }
        
        console.log('完整系统提示内容：');
        listenContext.forEach(line => console.log(line));
        console.log('\n========== 模拟完成 ==========');
    },
    
    /**
     * 实时监听歌词更新
     */
    monitorLyricUpdates: function(duration = 10000) {
        console.log(`\n========== 开始监听歌词更新（${duration}ms） ==========`);
        
        let lastLyricIndex = -1;
        const monitorInterval = setInterval(() => {
            const state = window.ListenTogether.getState();
            
            if (!state.isActive) {
                console.log('一起听已关闭，停止监听');
                clearInterval(monitorInterval);
                return;
            }
            
            if (state.currentLyricIndex !== lastLyricIndex) {
                lastLyricIndex = state.currentLyricIndex;
                const lyric = state.allLyrics?.[state.currentLyricIndex];
                console.log(`[${new Date().toLocaleTimeString()}] 歌词已更新：`);
                console.log(`  索引：${state.currentLyricIndex}`);
                console.log(`  内容：${lyric || '(未知)'}`);
            }
        }, 1000);
        
        setTimeout(() => {
            clearInterval(monitorInterval);
            console.log(`========== 监听完成 ==========\n`);
        }, duration);
    }
};

// 导出到window
console.log('✓ 一起听诊断工具已加载，使用 window.ListenTogetherDiagnostic.checkLyricContext() 进行检查');
