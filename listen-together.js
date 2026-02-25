/**
 * 一起听模块 - 使用 GD音乐台API
 */
(function() {
    'use strict';
    
    // 【新增】后端代理地址检测
    let PROXY_URL = 'http://localhost:3000';  // 默认本地后端
    let proxyAvailable = false;  // 后端代理是否可用
    
    // 检测后端代理是否可用
    async function checkProxyAvailability() {
        try {
            const res = await fetch(`${PROXY_URL}/health`, { 
                method: 'GET',
                timeout: 2000 
            });
            if (res.ok) {
                proxyAvailable = true;
                console.log('✅ 后端代理可用');
                return true;
            }
        } catch (e) {
            console.warn('❌ 后端代理不可用，将使用备用方案');
            proxyAvailable = false;
        }
        return false;
    }
    
    // 获取图片URL的函数
    function getPicUrl(pic_id, size = 300) {
        if (!pic_id) return null;
        
        if (proxyAvailable) {
            // 如果后端可用，使用后端代理（有缓存）
            return `${PROXY_URL}/api/music/pic?pic_id=${pic_id}&size=${size}`;
        } else {
            // 备用方案1：直接使用网易云CDN（可能受防盗链限制）
            return `https://p2.music.126.net/${pic_id}?param=${size}y${size}`;
        }
    }
    
    // GD音乐台API（主要使用网易云源）
    let APIS = [
        'https://music-api.gdstudio.xyz/api.php'
    ];
    
    // 【改进】从localStorage加载自定义API（保留备用功能）
    const savedAPIs = localStorage.getItem('listen-custom-apis');
    if (savedAPIs) {
        try {
            APIS = JSON.parse(savedAPIs);
        } catch (e) {
            console.error('读取自定义API失败:', e);
        }
    }
    
    // 【改进】改为多选模式：保存多个选中的API索引数组
    let selectedAPIIndices = [];
    const savedSelectedAPIs = localStorage.getItem('listen-selected-api-indices');
    if (savedSelectedAPIs) {
        try {
            selectedAPIIndices = JSON.parse(savedSelectedAPIs);
        } catch (e) {
            console.error('读取选中API列表失败:', e);
            selectedAPIIndices = [0]; // 默认选中第一个
        }
    } else {
        selectedAPIIndices = [0]; // 默认选中第一个
    }
    
    // 当前使用的API索引（从选中列表中随机选择，或者轮流切换）
    let currentAPIIndex = 0;
    let apiIdx = selectedAPIIndices[currentAPIIndex] || 0;
    let audio = new Audio();
    let songs = [];
    let currentIdx = null;
    let isPlaying = false;
    let favorites = JSON.parse(localStorage.getItem('listen-favorites') || '[]');
    let playMode = localStorage.getItem('listen-playmode') || 'order'; // order, random, loop
    let currentLyrics = [];
    let currentView = 'search'; // search, favorites
    let cachedComments = JSON.parse(localStorage.getItem('listen-comments-cache') || '{}');
    
    // 【新增】音质选择 - 128, 320, 999(无损)
    let musicQuality = localStorage.getItem('listen-music-quality') || '320';
    
    // 【改进】GD支持的所有音乐源 - 自动遍历，不需要手动切换
    const ALL_MUSIC_SOURCES = ['netease', 'kuwo', 'joox'];  // GD真实支持的源
    
    // 获取歌曲的函数 - 尝试所有音乐源
    async function searchSongs(keyword, maxRetries = 3) {
        const api = APIS[selectedAPIIndices[0]] || APIS[0];
        const TIMEOUT = 10000;
        
        for (const source of ALL_MUSIC_SOURCES) {
            for (let retry = 1; retry <= maxRetries; retry++) {
                try {
                    console.log(`[搜索] 源: ${source}, 重试: ${retry}/${maxRetries}`);
                    
                    const url = `${api}?types=search&source=${source}&name=${encodeURIComponent(keyword)}&count=50`;
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
                    
                    const res = await fetch(url, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    
                    if (!res.ok) {
                        console.warn(`❌ HTTP ${res.status}，重试...`);
                        continue;
                    }
                    
                    const data = await res.json();
                    
                    if (data && Array.isArray(data) && data.length > 0) {
                        console.log(`✅ 【${source}】搜索成功，${data.length}首歌曲`);
                        return { songs: data, source };
                    } else {
                        console.warn(`❌ 【${source}】返回空数据，重试...`);
                    }
                } catch (e) {
                    console.warn(`❌ 【${source}】错误: ${e.message}`);
                }
            }
        }
        
        console.error('❌ 所有音乐源搜索失败');
        return null;
    }
    
    // 获取播放URL的函数 - 尝试所有音乐源
    async function getSongUrl(songId, maxRetries = 2) {
        const api = APIS[selectedAPIIndices[0]] || APIS[0];
        const TIMEOUT = 10000;
        
        for (const source of ALL_MUSIC_SOURCES) {
            for (let retry = 1; retry <= maxRetries; retry++) {
                try {
                    console.log(`[获取URL] 源: ${source}, 重试: ${retry}/${maxRetries}`);
                    
                    const url = `${api}?types=url&source=${source}&id=${songId}&br=${musicQuality}`;
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
                    
                    const res = await fetch(url, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    
                    if (!res.ok) {
                        console.warn(`❌ HTTP ${res.status}，重试...`);
                        continue;
                    }
                    
                    const data = await res.json();
                    
                    if (data && data.url) {
                        console.log(`✅ 【${source}】获取URL成功，音质: ${data.br}kbps`);
                        return data.url;
                    }
                } catch (e) {
                    console.warn(`❌ 【${source}】错误: ${e.message}`);
                }
            }
        }
        
        console.error('❌ 所有音乐源都无法获取播放URL');
        return null;
    }
    
    // 获取歌词的函数 - 尝试所有音乐源
    async function getLyric(lyricId, maxRetries = 2) {
        const api = APIS[selectedAPIIndices[0]] || APIS[0];
        const TIMEOUT = 5000;
        
        for (const source of ALL_MUSIC_SOURCES) {
            for (let retry = 1; retry <= maxRetries; retry++) {
                try {
                    const url = `${api}?types=lyric&source=${source}&id=${lyricId}`;
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
                    
                    const res = await fetch(url, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    
                    if (!res.ok) continue;
                    
                    const data = await res.json();
                    
                    if (data && data.lyric) {
                        console.log(`✅ 【${source}】歌词加载成功`);
                        return data.lyric;
                    }
                } catch (e) {
                    // 歌词失败无需输出，直接跳过
                }
            }
        }
        
        return null;
    }
    
    // 默认占位图
    const PLACEHOLDER = 'https://img.heliar.top/file/1772015240645_IMG_20260225_182612.jpg';
    
    function createModal() {
        if (document.getElementById('listen-together-modal')) return;
        
        // 【新增】检测后端代理可用性
        checkProxyAvailability();
        
        const userAvatar = (window.AppState && AppState.currentChat && AppState.currentChat.userAvatar) || (window.AppState && AppState.user && AppState.user.avatar) || PLACEHOLDER;
        const aiAvatar = (window.AppState && AppState.currentChat && AppState.currentChat.avatar) || PLACEHOLDER;
        
        const html = `
        <div class="listen-together-modal" id="listen-together-modal">
            <div class="listen-container">
                <div class="listen-topbar">
                    <button class="listen-minimize" id="listen-minimize" title="最小化"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" stroke-width="2"><line x1="4" y1="12" x2="20" y2="12"/></svg></button>
                    <button class="listen-api-btn" id="listen-api-btn" title="选择音乐API"><svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 9.5c0 .83-.67 1.5-1.5 1.5S11 13.33 11 12.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5z"/></svg></button>
                    <div class="listen-topbar-info" id="listen-topbar-info">
                        <span class="listen-topbar-title" id="listen-topbar-title">选一首歌</span>
                    </div>
                    <button class="listen-close" id="listen-bg-btn" title="设置背景"><svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></button>
                    <button class="listen-close listen-close-main" id="listen-close-btn" title="关闭一起听"><svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
                    <input type="file" id="listen-bg-input" accept="image/*" style="display:none;">
                </div>
                <div class="listen-body">
                    <div class="listen-search-panel" id="listen-search-panel" style="display:none;">
                        <div class="listen-panel-topbar"><button class="listen-panel-back" id="listen-search-back"><svg viewBox="0 0 24 24" width="22" height="22" fill="white"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button><span>搜索歌曲</span><div style="width:22px"></div></div>
                        <div class="listen-search-box">
                            <input type="text" id="listen-search-input" placeholder="搜索歌曲...">
                            <button class="listen-search-btn" id="listen-search-btn">搜索</button>
                        </div>
                        <div class="listen-songs" id="listen-songs"></div>
                    </div>
                    <div class="listen-fav-panel" id="listen-fav-panel" style="display:none;">
                        <div class="listen-panel-topbar"><button class="listen-panel-back" id="listen-fav-back"><svg viewBox="0 0 24 24" width="22" height="22" fill="white"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button><span>我的喜欢</span><div style="width:22px"></div></div>
                        <div class="listen-fav-songs" id="listen-fav-songs"></div>
                    </div>
                    <div class="listen-comment-panel" id="listen-comment-panel" style="display:none;">
                        <div class="listen-panel-topbar"><button class="listen-panel-back" id="listen-comment-back"><svg viewBox="0 0 24 24" width="22" height="22" fill="white"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button><span>热门评论</span><div style="width:22px"></div></div>
                        <div class="listen-comments" id="listen-comments"></div>
                    </div>
                    <div class="listen-player" id="listen-player">
                        <div class="listen-swiper-wrap">
                            <div class="listen-swiper" id="listen-swiper">
                                <div class="listen-page">
                                    <div class="listen-now-playing">
                                        <div class="listen-avatars">
                                            <img class="listen-avatar" src="${userAvatar}" onerror="this.src='${PLACEHOLDER}'">
                                            <img class="listen-avatar" src="${aiAvatar}" onerror="this.src='${PLACEHOLDER}'">
                                        </div>
                                        <div class="listen-together-text" id="listen-together-text">相距1314公里，一起听了0小时0分钟</div>
                                        <div class="listen-cover-wrap">
                                            <div class="listen-cover-ring"></div>
                                            <img class="listen-now-cover" id="listen-now-cover" src="${PLACEHOLDER}">
                                        </div>
                                    </div>
                                </div>
                                <div class="listen-page">
                                    <div class="listen-lyric-page">
                                        <div class="listen-lyric" id="listen-lyric">暂无歌词</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="listen-page-dots">
                            <div class="listen-page-dot active" id="listen-dot-0"></div>
                            <div class="listen-page-dot" id="listen-dot-1"></div>
                        </div>
                    </div>
                </div>
                <div class="listen-extra-btns">
                    <button class="listen-ctrl-btn" id="listen-tab-search" title="搜索"><svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg></button>
                    <button class="listen-ctrl-btn" id="listen-download" title="下载"><svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></button>
                    <button class="listen-ctrl-btn" id="listen-comment" title="评论"><svg viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg></button>
                    <button class="listen-ctrl-btn" id="listen-share" title="分享"><svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg></button>
                    <button class="listen-ctrl-btn" id="listen-fav" title="喜欢"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>
                </div>
                <div class="listen-progress">
                    <span id="listen-current-time">0:00</span>
                    <div class="listen-progress-bar" id="listen-progress-bar">
                        <div class="listen-progress-fill" id="listen-progress-fill"></div>
                    </div>
                    <span id="listen-duration">0:00</span>
                </div>
                <div class="listen-controls">
                    <button class="listen-ctrl-btn" id="listen-mode" title="顺序播放"><svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg></button>
                    <button class="listen-ctrl-btn" id="listen-prev"><svg viewBox="0 0 24 24"><path d="M19 20L9 12l10-8v16zM5 19V5h2v14H5z"/></svg></button>
                    <button class="listen-ctrl-btn play-btn" id="listen-play"><svg viewBox="0 0 24 24" id="listen-play-icon"><path d="M8 5v14l11-7z"/></svg></button>
                    <button class="listen-ctrl-btn" id="listen-next"><svg viewBox="0 0 24 24"><path d="M5 4l10 8-10 8V4zm12 0h2v16h-2V4z"/></svg></button>
                    <button class="listen-ctrl-btn" id="listen-tab-fav" title="我的喜欢"><svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg></button>
                </div>
            </div>
        </div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
        bindEvents();
    }
    
    let swiperPage = 0;
    
    function bindEvents() {
        document.getElementById('listen-minimize').onclick = minimize;
        document.getElementById('listen-search-btn').onclick = search;
        document.getElementById('listen-search-input').onkeypress = e => e.key === 'Enter' && search();
        document.getElementById('listen-play').onclick = togglePlay;
        document.getElementById('listen-prev').onclick = playPrev;
        document.getElementById('listen-next').onclick = playNext;
        document.getElementById('listen-progress-bar').onclick = seek;
        document.getElementById('listen-mode').onclick = toggleMode;
        document.getElementById('listen-fav').onclick = toggleFavorite;
        document.getElementById('listen-tab-search').onclick = toggleSearchPanel;
        document.getElementById('listen-tab-fav').onclick = toggleFavPanel;
        document.getElementById('listen-download').onclick = downloadSong;
        document.getElementById('listen-comment').onclick = toggleCommentPanel;
        document.getElementById('listen-share').onclick = shareSong;
        document.getElementById('listen-search-back').onclick = () => document.getElementById('listen-search-panel').style.display = 'none';
        document.getElementById('listen-fav-back').onclick = () => document.getElementById('listen-fav-panel').style.display = 'none';
        document.getElementById('listen-comment-back').onclick = () => document.getElementById('listen-comment-panel').style.display = 'none';
        
        // 背景图设置
        document.getElementById('listen-bg-btn').onclick = () => document.getElementById('listen-bg-input').click();
        document.getElementById('listen-bg-input').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const url = ev.target.result;
                localStorage.setItem('listen-bg-custom', url);
                applyCustomBg(url);
            };
            reader.readAsDataURL(file);
        };
        const savedBg = localStorage.getItem('listen-bg-custom');
        if (savedBg) applyCustomBg(savedBg);
        
        // 滑动切换页面
        const swiperWrap = document.getElementById('listen-swiper').parentElement;
        let sx = 0, sy = 0, swiping = null;
        swiperWrap.addEventListener('touchstart', e => {
            sx = e.touches[0].clientX;
            sy = e.touches[0].clientY;
            swiping = null;
        }, {passive: true});
        swiperWrap.addEventListener('touchmove', e => {
            if (swiping === false) return;
            const dx = e.touches[0].clientX - sx;
            const dy = e.touches[0].clientY - sy;
            if (swiping === null) {
                if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                    swiping = Math.abs(dx) > Math.abs(dy);
                }
            }
            if (swiping) e.preventDefault();
        }, {passive: false});
        swiperWrap.addEventListener('touchend', e => {
            if (swiping !== true) return;
            const dx = e.changedTouches[0].clientX - sx;
            if (dx < -30) setSwiperPage(1);
            else if (dx > 30) setSwiperPage(0);
        }, {passive: true});
        // 鼠标拖拽
        swiperWrap.addEventListener('mousedown', e => { sx = e.clientX; swiping = true; });
        swiperWrap.addEventListener('mouseup', e => {
            if (!swiping) return;
            const dx = e.clientX - sx;
            if (dx < -30) setSwiperPage(1);
            else if (dx > 30) setSwiperPage(0);
            swiping = null;
        });
        // 点击圆点切换
        document.getElementById('listen-dot-0').onclick = () => setSwiperPage(0);
        document.getElementById('listen-dot-1').onclick = () => setSwiperPage(1);
        
        audio.ontimeupdate = () => { updateProgress(); updateLyric(); };
        audio.onended = playNext;
        audio.onplay = () => { isPlaying = true; updateUI(); };
        audio.onpause = () => { isPlaying = false; updateUI(); };
    }
    
    function setSwiperPage(page) {
        page = Math.max(0, Math.min(1, page));
        swiperPage = page;
        document.getElementById('listen-swiper').style.transform = `translateX(-${page * 50}%)`;
        document.getElementById('listen-dot-0').classList.toggle('active', page === 0);
        document.getElementById('listen-dot-1').classList.toggle('active', page === 1);
    }
    
    async function search() {
        const keyword = document.getElementById('listen-search-input').value.trim();
        if (!keyword) return;
        
        const container = document.getElementById('listen-songs');
        container.innerHTML = '<div class="listen-loading">搜索中...</div>';
        
        // 【改进】使用新的searchSongs函数 - 自动遍历所有音乐源
        const result = await searchSongs(keyword);
        
        if (result && result.songs && result.songs.length > 0) {
            songs = result.songs.map((item, idx) => {
                return {
                    id: item.id,
                    name: item.name,
                    title: item.name,
                    artist: Array.isArray(item.artist) ? item.artist.join('/') : item.artist,
                    author: Array.isArray(item.artist) ? item.artist.join('/') : item.artist,
                    pic: item.pic_id ? `https://p2.music.126.net/${item.pic_id}?param=500y500` : (item.pic || null),
                    pic_id: item.pic_id,
                    cover: null,
                    lrc: null,
                    lyric_id: item.lyric_id,
                    source: result.source,
                    url: null
                };
            });
            console.log('✅ 搜索成功，歌曲列表:', songs.length, '首');
            renderSongs();
        } else {
            console.error('❌ 搜索完全失败');
            container.innerHTML = '<div class="listen-empty">搜索失败，请检查网络或重试</div>';
        }
    }
    
    function renderSongs() {
        const container = document.getElementById('listen-songs');
        const validSongs = songs.filter(s => s);
        if (!validSongs.length) {
            container.innerHTML = '<div class="listen-empty">暂无歌曲</div>';
            return;
        }
        console.log('📊 渲染歌曲数量:', validSongs.length);
        container.innerHTML = validSongs.map((s, i) => {
            let name = s.name || s.title || '未知';
            let artist = s.artist || s.author || '未知';
            if (Array.isArray(name)) name = name[0] || '未知';
            if (Array.isArray(artist)) artist = artist.join('/') || '未知';
            
            // 【改进】使用getPicUrl获取图片URL（自动选择后端或CDN）
            const pic = s.pic_id ? getPicUrl(s.pic_id, 300) : PLACEHOLDER;
            console.log(`📍 歌曲${i}: ${name} - pic_id="${s.pic_id}" -> URL: ${pic}`);
            
            return `
            <div class="listen-song-item${currentIdx === i ? ' active' : ''}" data-idx="${i}">
                <img class="listen-song-cover" src="${PLACEHOLDER}" data-src="${pic}" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
                <div class="listen-song-info">
                    <div class="listen-song-name">${name}</div>
                    <div class="listen-song-artist">${artist}</div>
                </div>
            </div>`;
        }).join('');
        
        // 【优化】延迟加载图片 - 避免一次性加载所有图片导致卡顿
        setTimeout(() => {
            container.querySelectorAll('.listen-song-cover[data-src]').forEach((img, idx) => {
                setTimeout(() => {
                    img.src = img.dataset.src;
                }, idx * 100);  // 每100ms加载一张，分散请求
            });
        }, 200);
        
        container.querySelectorAll('.listen-song-item').forEach(item => {
            item.onclick = () => {
                playSong(parseInt(item.dataset.idx));
                document.getElementById('listen-search-panel').style.display = 'none';
            };
        });
    }
    
    async function playSong(idx) {
        if (idx < 0 || idx >= songs.length) return;
        
        const song = songs[idx];
        currentIdx = idx;
        
        // 持久化播放状态
        localStorage.setItem('listen-songs', JSON.stringify(songs));
        localStorage.setItem('listen-currentIdx', String(idx));
        
        let name = song.name || song.title || '未知';
        let artist = song.artist || song.author || '未知';
        if (Array.isArray(name)) name = name[0] || '未知';
        if (Array.isArray(artist)) artist = artist.join('/') || '未知';
        console.log('播放歌曲:', name, artist, song);
        // 【改进】合并为一行显示：歌曲名-歌手名
        document.getElementById('listen-topbar-title').textContent = `${name} - ${artist}`;
        const cover = document.getElementById('listen-now-cover');
        
        // GD音乐台API：使用pic_id + 后端代理获取图片
        const pic = song.pic_id ? getPicUrl(song.pic_id, 500) : PLACEHOLDER;
        
        cover.src = pic;
        cover.onerror = () => {
            console.warn('⚠️ 图片加载失败');
            cover.src = PLACEHOLDER;
        };
        // 动态背景模糊
        document.getElementById('listen-together-modal').style.setProperty('--listen-bg', `url(${pic})`);
        
        renderSongs();
        loadLyric(song);
        
        // 【改进】获取播放URL - 自动遍历所有音乐源
        const playUrl = await getSongUrl(song.id);
        
        if (playUrl) {
            song.url = playUrl;
            audio.src = playUrl;
            audio.play();
        } else {
            console.error('❌ 无法获取播放URL');
        }
    }
    
    async function loadLyric(song) {
        const lyricEl = document.getElementById('listen-lyric');
        currentLyrics = [];
        if (!song || (!song.id && !song.lyric_id)) {
            lyricEl.innerHTML = '<div style="opacity:0.5;">暂无歌词</div>';
            return;
        }
        lyricEl.innerHTML = '<div style="opacity:0.5;">加载中...</div>';
        
        // 【改进】使用新的getLyric函数 - 自动遍历所有音乐源
        const lyricId = song.lyric_id || song.id;
        const lyricText = await getLyric(lyricId);
        
        if (lyricText) {
            currentLyrics = lyricText.split('\n')
                .map(l => {
                    const match = l.match(/\[(\d+):(\d+)\.?(\d*)\](.*)/);
                    if (match) {
                        const time = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseInt(match[3]) / 1000 : 0);
                        return { time, text: match[4].trim() };
                    }
                    return null;
                })
                .filter(l => l && l.text && !l.text.startsWith('by:') && !l.text.startsWith('ti:') && !l.text.startsWith('ar:'));
            renderLyrics();
            console.log('✅ 歌词加载成功，共', currentLyrics.length, '行');
        } else {
            lyricEl.innerHTML = '<div style="opacity:0.5;">暂无歌词</div>';
        }
    }
    
    function renderLyrics() {
        const lyricEl = document.getElementById('listen-lyric');
        lyricEl.innerHTML = currentLyrics.map((l, i) => 
            `<div class="lyric-line" data-time="${l.time}" data-idx="${i}">${l.text}</div>`
        ).join('');
    }
    
    function updateLyric() {
        if (!currentLyrics.length) return;
        const cur = audio.currentTime;
        let activeIdx = -1;
        for (let i = 0; i < currentLyrics.length; i++) {
            if (currentLyrics[i].time <= cur) activeIdx = i;
            else break;
        }
        const lines = document.querySelectorAll('.lyric-line');
        lines.forEach((line, i) => {
            line.style.opacity = i === activeIdx ? '1' : '0.4';
            line.style.color = i === activeIdx ? '#fff' : 'rgba(255,255,255,0.5)';
            line.style.transform = i === activeIdx ? 'scale(1.05)' : 'scale(1)';
            line.style.transition = 'all 0.3s';
        });
        if (activeIdx >= 0 && lines[activeIdx]) {
            const lyricContainer = document.getElementById('listen-lyric');
            const line = lines[activeIdx];
            lyricContainer.scrollTop = line.offsetTop - lyricContainer.offsetHeight / 2 + line.offsetHeight / 2;
            
            // 更新当前歌词上下文到一起听状态
            updateLyricContext(activeIdx);
        }
    }
    
    function updateLyricContext(currentLyricIndex) {
        if (!currentLyrics.length || currentLyricIndex < 0) return;
        
        // 获取当前歌词及其上下2行（用于UI显示）
        const contextStart = Math.max(0, currentLyricIndex - 2); // 上2行
        const contextEnd = Math.min(currentLyrics.length - 1, currentLyricIndex + 2); // 下2行
        
        const contextLyrics = [];
        for (let i = contextStart; i <= contextEnd; i++) {
            if (currentLyrics[i]) {
                const prefix = i === currentLyricIndex ? '> ' : '  ';
                contextLyrics.push(`${prefix}${currentLyrics[i].text}`);
            }
        }
        
        // 提取原始歌词列表（不带前缀）用于系统提示
        const rawLyrics = currentLyrics.map(lyric => lyric.text || lyric);
        
        // 更新一起听状态中的歌词上下文
        if (window.ListenTogether && window.ListenTogether.setState) {
            window.ListenTogether.setState({
                lyrics: contextLyrics,  // UI显示用（带前缀）
                allLyrics: rawLyrics,   // 系统提示用（原始歌词列表）
                currentLyricIndex: currentLyricIndex  // 当前歌词在原始列表中的索引
            });
        }
    }
    
    function togglePlay() {
        if (!audio.src) return;
        isPlaying ? audio.pause() : audio.play();
    }
    
    function playPrev() {
        if (currentIdx === null || !songs.length) return;
        playSong(currentIdx > 0 ? currentIdx - 1 : songs.length - 1);
    }
    
    function playNext() {
        if (currentIdx === null || !songs.length) return;
        if (playMode === 'random') {
            playSong(Math.floor(Math.random() * songs.length));
        } else if (playMode === 'loop') {
            playSong(currentIdx);
        } else {
            playSong((currentIdx + 1) % songs.length);
        }
    }
    
    function toggleMode() {
        const modes = ['order', 'random', 'loop'];
        const idx = modes.indexOf(playMode);
        playMode = modes[(idx + 1) % modes.length];
        localStorage.setItem('listen-playmode', playMode);
        const btn = document.getElementById('listen-mode');
        const icons = {
            order: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>',
            random: '<path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>',
            loop: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><circle cx="12" cy="12" r="2"/>'
        };
        btn.innerHTML = `<svg viewBox="0 0 24 24">${icons[playMode]}</svg>`;
        btn.title = {order: '顺序播放', random: '随机播放', loop: '单曲循环'}[playMode];
    }
    
    function toggleFavorite() {
        if (currentIdx === null || !songs[currentIdx]) return;
        const song = songs[currentIdx];
        const idx = favorites.findIndex(f => f && f.title === song.title && f.author === song.author);
        if (idx >= 0) {
            // 【改进】使用主题样式的确认对话框
            showRemoveFavoriteConfirmDialog(song, () => {
                favorites.splice(idx, 1);
                localStorage.setItem('listen-favorites', JSON.stringify(favorites));
                updateFavBtn();
            });
        } else {
            favorites.push(song);
            localStorage.setItem('listen-favorites', JSON.stringify(favorites));
            updateFavBtn();
        }
    }
    
    function updateFavBtn() {
        const btn = document.getElementById('listen-fav');
        if (!btn) return;
        let isFav = false;
        if (currentIdx !== null && songs[currentIdx]) {
            const song = songs[currentIdx];
            isFav = favorites.some(f => f && f.title === song.title && f.author === song.author);
        }
        btn.style.color = isFav ? '#ff4466' : '';
        btn.querySelector('svg').style.fill = isFav ? '#ff4466' : '';
    }
    
    function toggleSearchPanel() {
        const sp = document.getElementById('listen-search-panel');
        sp.style.display = sp.style.display === 'none' ? '' : 'none';
    }
    
    function toggleFavPanel() {
        const fp = document.getElementById('listen-fav-panel');
        fp.style.display = fp.style.display === 'none' ? '' : 'none';
        if (fp.style.display !== 'none') renderFavSongs();
    }
    
    function renderFavSongs() {
        const container = document.getElementById('listen-fav-songs');
        const validFavs = favorites.filter(f => f);
        if (!validFavs.length) {
            container.innerHTML = '<div class="listen-empty">暂无收藏</div>';
            return;
        }
        console.log('💝 渲染收藏歌曲数量:', validFavs.length);
        container.innerHTML = validFavs.map((s, i) => {
            let name = s.name || s.title || '未知';
            let artist = s.artist || s.author || '未知';
            if (Array.isArray(name)) name = name[0] || '未知';
            if (Array.isArray(artist)) artist = artist.join('/') || '未知';
            
            // 【改进】使用getPicUrl获取图片URL（自动选择后端或CDN）
            const pic = s.pic_id ? getPicUrl(s.pic_id, 300) : PLACEHOLDER;
            
            return `
            <div class="listen-song-item" data-fav-idx="${i}">
                <img class="listen-song-cover" src="${PLACEHOLDER}" data-src="${pic}" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
                <div class="listen-song-info">
                    <div class="listen-song-name">${name}</div>
                    <div class="listen-song-artist">${artist}</div>
                </div>
            </div>`;
        }).join('');
        
        // 【优化】延迟加载图片 - 避免一次性加载所有图片导致卡顿
        setTimeout(() => {
            container.querySelectorAll('.listen-song-cover[data-src]').forEach((img, idx) => {
                setTimeout(() => {
                    img.src = img.dataset.src;
                }, idx * 100);  // 每100ms加载一张，分散请求
            });
        }, 200);
        
        container.querySelectorAll('.listen-song-item').forEach(item => {
            item.onclick = () => {
                songs = favorites.filter(f => f);
                playSong(parseInt(item.dataset.favIdx));
                document.getElementById('listen-fav-panel').style.display = 'none';
            };
        });
    }
    
    function updateUI() {
        const icon = document.getElementById('listen-play-icon');
        const cover = document.getElementById('listen-now-cover');
        icon.innerHTML = isPlaying ? '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>' : '<path d="M8 5v14l11-7z"/>';
        cover.classList.toggle('playing', isPlaying);
        updateFavBtn();
    }
    
    function updateProgress() {
        const cur = audio.currentTime, dur = audio.duration || 0;
        document.getElementById('listen-current-time').textContent = fmt(cur);
        document.getElementById('listen-duration').textContent = fmt(dur);
        document.getElementById('listen-progress-fill').style.width = dur ? (cur / dur * 100) + '%' : '0%';
    }
    
    function seek(e) {
        if (!audio.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        audio.currentTime = (e.clientX - rect.left) / rect.width * audio.duration;
    }
    
    function fmt(s) {
        return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    }
    
    function applyCustomBg(url) {
        const modal = document.getElementById('listen-together-modal');
        if (!modal) return;
        modal.style.setProperty('--listen-custom-bg', `url(${url})`);
        modal.classList.add('custom-bg');
    }
    
    // 下载歌曲
    function downloadSong() {
        if (currentIdx === null || !songs[currentIdx]) return;
        const song = songs[currentIdx];
        const url = song.url;
        if (!url) { alert('暂无下载链接'); return; }
        const a = document.createElement('a');
        a.href = url;
        a.download = (song.name || song.title || '歌曲') + '.mp3';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
    
    // 评论面板
    function toggleCommentPanel() {
        const cp = document.getElementById('listen-comment-panel');
        if (cp.style.display !== 'none') {
            cp.style.display = 'none';
        } else {
            cp.style.display = '';
            showComments();
        }
    }
    
    function getSongKey() {
        if (currentIdx === null || !songs[currentIdx]) return null;
        const s = songs[currentIdx];
        return (s.name || s.title || '') + '-' + (s.artist || s.author || '');
    }
    
    function showComments() {
        const key = getSongKey();
        if (key && cachedComments[key]) {
            const c = cachedComments[key];
            renderComments(c.comments, c.charName);
            return;
        }
        generateComments(false);
    }
    
    async function generateComments(force) {
        const container = document.getElementById('listen-comments');
        if (currentIdx === null || !songs[currentIdx]) {
            container.innerHTML = '<div class="listen-empty">请先播放一首歌</div>';
            return;
        }
        container.innerHTML = '<div class="listen-loading">正在加载评论...</div>';
        
        const song = songs[currentIdx];
        const songName = song.name || song.title || '未知';
        const artist = song.artist || song.author || '未知';
        const AS = window.AppState;
        const chat = AS && AS.currentChat;
        const charName = chat ? chat.name : 'AI';
        const charDesc = chat ? (chat.description || '') : '';
        const userName = AS && AS.user ? AS.user.name : '用户';
        const userDesc = AS && AS.user ? (AS.user.description || '') : '';
        
        // 获取最近50条对话
        let recentChat = '';
        if (chat && AS.messages && AS.messages[chat.id]) {
            const msgs = AS.messages[chat.id].slice(-50);
            recentChat = msgs.map(m => `${m.type === 'sent' ? userName : charName}: ${m.content}`).join('\n');
        }
        
        const api = AS && AS.apiSettings;
        const apiKey = (document.getElementById('api-key') || {}).value || (api && api.apiKey) || '';
        const apiEndpoint = (document.getElementById('api-endpoint') || {}).value || (api && api.endpoint) || '';
        const apiModel = (document.getElementById('models-select') || {}).value || (api && api.model) || 'gpt-3.5-turbo';
        if (!apiEndpoint || !apiKey) {
            container.innerHTML = '<div class="listen-empty">请先配置API</div>';
            return;
        }
        
        const endpoint = window.APIUtils ? window.APIUtils.normalizeEndpoint(apiEndpoint) : apiEndpoint.replace(/\/$/, '') + '/v1';
        const prompt = `你是一个网易云音乐评论区模拟器。请为歌曲《${songName}》(${artist})生成25条网易云风格的热门评论。

要求：
1. 评论风格要像真实网易云用户，有感性的、搞笑的、讲故事的、文艺的、伤感的
2. 每条评论要有用户昵称、点赞数、评论内容
3. 其中必须包含3-4条是"${charName}"发的评论（角色设定：${charDesc}）
4. 每条评论必须有2-5条回复，形成热闹的互动讨论
5. "${charName}"必须在多条评论下回复网友，回复风格符合角色设定
6. 回复中要有网友之间互相讨论、抬杠、共鸣的内容
7. ${charName}的评论风格要符合角色设定和以下最近对话的语气风格
8. 点赞数从几十到几万不等

最近对话参考（用于模仿${charName}的语气）：
${recentChat.substring(0, 1500)}

请严格按以下JSON数组格式返回，不要有其他内容：
[{"user":"昵称","likes":数字,"content":"评论内容","replies":[{"user":"回复者昵称","content":"回复内容"}]}]`;

        try {
            const res = await fetch(endpoint + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({ model: apiModel, messages: [{ role: 'user', content: prompt }], temperature: 0.9 })
            });
            const data = await res.json();
            const text = window.APIUtils ? window.APIUtils.extractTextFromResponse(data) : (data.choices?.[0]?.message?.content || '');
            console.log('评论API返回:', text.substring(0, 200));
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const comments = JSON.parse(jsonMatch[0]);
                const key = getSongKey();
                if (key) {
                    cachedComments[key] = { comments, charName };
                    localStorage.setItem('listen-comments-cache', JSON.stringify(cachedComments));
                }
                renderComments(comments, charName);
            } else {
                container.innerHTML = '<div class="listen-empty">评论解析失败，请重试</div>';
            }
        } catch (e) {
            console.error('评论生成失败:', e);
            container.innerHTML = '<div class="listen-empty">评论加载失败</div>';
        }
    }
    
    function renderComments(comments, charName) {
        const container = document.getElementById('listen-comments');
        container.innerHTML = comments.map((c, i) => {
            const isChar = c.user === charName;
            let avatar;
            if (isChar) {
                avatar = (window.AppState?.currentChat?.avatar) || PLACEHOLDER;
            } else {
                // 基于用户名生成初始 QQ 号（1000万-1亿范围）
                const nameHash = c.user ? Array.from(c.user).reduce((h, ch) => ((h << 5) - h + ch.charCodeAt(0)) | 0, 0) : i;
                const baseQQ = Math.abs(nameHash) % 90000000 + 10000000;
                avatar = `https://q.qlogo.cn/g?b=qq&nk=${baseQQ}&s=100`;
            }
            let html = `<div class="listen-comment-item${isChar ? ' is-char' : ''}">
                <img class="listen-comment-avatar" src="${avatar}" ${!isChar ? `data-base-qq="${Math.abs((c.user ? Array.from(c.user).reduce((h, ch) => ((h << 5) - h + ch.charCodeAt(0)) | 0, 0) : i) % 90000000 + 10000000)}" data-retry="0" onerror="window.listenCommentAvatarRetry?.(this, 100)"` : `onerror="this.src='${PLACEHOLDER}'"`}>
                <div class="listen-comment-body">
                    <div class="listen-comment-user">${c.user}</div>
                    <div class="listen-comment-text">${c.content}</div>
                    <div class="listen-comment-likes"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:3px"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>${c.likes || 0}</div>
                    ${(c.replies || []).map(r => {
                        const rIsChar = r.user === charName;
                        return `<div class="listen-comment-reply${rIsChar ? ' is-char' : ''}">
                            <span class="listen-comment-reply-user">${r.user}</span>：${r.content}
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
            return html;
        }).join('');
        container.insertAdjacentHTML('beforeend', '<div style="text-align:center;padding:16px;"><button class="listen-comment-refresh" style="border:none;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);padding:8px 20px;border-radius:16px;font-size:13px;cursor:pointer;">换一批</button></div>');
        container.querySelector('.listen-comment-refresh').onclick = () => generateComments(true);
    }
    
    // 评论头像重试机制
    window.listenCommentAvatarRetry = function(img, maxRetry) {
        const baseQQ = parseInt(img.dataset.baseQQ) || 0;
        let retryCount = parseInt(img.dataset.retry) || 0;
        
        if (retryCount >= maxRetry) {
            img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCBmaWxsPSIjMzMzIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjUwIi8+PC9zdmc+';
            return;
        }
        
        retryCount++;
        const newQQ = baseQQ + retryCount;
        img.src = `https://q.qlogo.cn/g?b=qq&nk=${newQQ}&s=100`;
        img.dataset.retry = retryCount;
    };
    
    // 分享歌曲
    function shareSong() {
        if (currentIdx === null || !songs[currentIdx]) { alert('请先播放一首歌'); return; }
        const AS = window.AppState;
        if (!AS || !AS.conversations || !AS.conversations.length) return;
        
        const song = songs[currentIdx];
        const songName = song.name || song.title || '未知';
        const artist = song.artist || song.author || '未知';
        const pic = song.pic || song.cover || PLACEHOLDER;
        
        // 弹出角色选择
        const list = AS.conversations.map((c, i) => `<div class="listen-share-item" data-idx="${i}">
            <img class="listen-share-avatar" src="${c.avatar || PLACEHOLDER}" onerror="this.src='${PLACEHOLDER}'">
            <span>${c.name}</span>
        </div>`).join('');
        
        const overlay = document.createElement('div');
        overlay.className = 'listen-share-overlay';
        overlay.innerHTML = `<div class="listen-share-modal">
            <div class="listen-share-title">分享给</div>
            <div class="listen-share-list">${list}</div>
            <button class="listen-share-cancel" id="listen-share-cancel">取消</button>
        </div>`;
        document.getElementById('listen-together-modal').appendChild(overlay);
        
        overlay.querySelector('#listen-share-cancel').onclick = () => overlay.remove();
        overlay.querySelectorAll('.listen-share-item').forEach(item => {
            item.onclick = () => {
                const idx = parseInt(item.dataset.idx);
                const conv = AS.conversations[idx];
                if (!conv) return;
                
                // 构建音乐卡片消息
                const musicCard = `[音乐分享]${songName} - ${artist}`;
                const msg = {
                    id: 'msg_' + Date.now(),
                    type: 'sent',
                    content: musicCard,
                    time: new Date().toISOString(),
                    musicCard: { name: songName, artist, pic },
                    readByAI: false
                };
                
                if (!AS.messages[conv.id]) AS.messages[conv.id] = [];
                AS.messages[conv.id].push(msg);
                
                conv.lastMsg = musicCard;
                conv.time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                conv.lastMessageTime = msg.time;
                
                if (window.saveToStorage) window.saveToStorage();
                if (window.renderChatMessages && AS.currentChat && AS.currentChat.id === conv.id) {
                    window.renderChatMessages(true);
                }
                
                overlay.remove();
                alert(`已分享「${songName}」给 ${conv.name}`);
            };
        });
    }
    
    // 发送邀请一起听的消息给AI
    function sendListenInvitationToAI() {
        const AS = window.AppState;
        if (!AS || !AS.currentChat) return;
        
        const convId = AS.currentChat.id;
        if (!AS.messages[convId]) AS.messages[convId] = [];
        
        // 【修复】检查是否已经有未回复的邀请卡片，防止重复发送
        // 但要忽略已关闭的邀请卡片（isListenTogetherClosed=true），允许发送新邀请
        const existingInvitation = AS.messages[convId].find(m => 
            m.type === 'listen_invite' && m.sender === 'sent' && !m.isInvitationAnswered && !m.isListenTogetherClosed
        );
        if (existingInvitation) {
            // 已有未回复的邀请，不再发送新的
            return;
        }
        
        // 获取当前播放的歌曲信息
        let songName = '正在听音乐';
        if (listenState.currentSong) {
            songName = listenState.currentSong.name || listenState.currentSong.title || '正在听音乐';
        }
        
        // 用户邀请AI加入一起听（按照红包样式，显示在右侧）
        const systemMsg = {
            id: 'msg_' + Date.now(),
            type: 'listen_invite',
            sender: 'sent',  // sent表示用户发送，显示在右侧
            content: '邀请加入一起听音乐',
            songName: songName,
            time: new Date().toISOString(),
            isInvitationToListen: true,
            isUserInviteListen: true,
            isInvitationAnswered: false
        };
        
        AS.messages[convId].push(systemMsg);
        
        // 更新对话最后一条消息
        AS.currentChat.lastMsg = '邀请加入一起听';
        AS.currentChat.time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        AS.currentChat.lastMessageTime = systemMsg.time;
        
        // 保存存储
        if (window.saveToStorage) window.saveToStorage();
        
        // 立即渲染消息
        if (window.renderChatMessagesDebounced) {
            window.renderChatMessagesDebounced(true);
        }
    }
    
    // 一起听状态管理
    let listenState = {
        isActive: false,
        initiator: null, // 'user' or 'ai'
        startTime: null,
        currentSong: null,
        isPlaying: false,
        lyrics: [],
        context: {}
    };
    
    // 一起听事件记录
    let listenEvents = [];
    
    // 记录一起听事件
    function addListenTogetherEvent(type, data) {
        const event = {
            type,
            timestamp: Date.now(),
            data
        };
        listenEvents.push(event);
        // 只保留最近10个事件
        if (listenEvents.length > 10) {
            listenEvents = listenEvents.slice(-10);
        }
        return event;
    }
    
    // 一起听时长统计
    let listenStartTime = null;
    function updateListenTime() {
        if (!listenStartTime) return;
        const diff = Math.floor((Date.now() - listenStartTime) / 1000);
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const el = document.getElementById('listen-together-text');
        if (el) el.textContent = `相距1314公里，一起听了${h}小时${m}分钟`;
    }
    
    function open(shouldSendInvitation = true) {
        // 检查当前是否已处于一起听状态
        if (listenState.isActive && shouldSendInvitation) {
            // 已经在一起听状态，用户再次邀请时直接打开一起听页面，不发送邀请卡片
            createModal();
            const modal = document.getElementById('listen-together-modal');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            return;
        }
        
        createModal();
        const modal = document.getElementById('listen-together-modal');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // 更新一起听状态
        listenState.isActive = true;
        listenState.initiator = shouldSendInvitation ? 'user' : 'ai';
        listenState.startTime = Date.now();
        if (!listenStartTime) listenStartTime = Date.now();
        if (!window._listenTimeInterval) {
            window._listenTimeInterval = setInterval(updateListenTime, 10000);
        }
        
        // 记录一起听开始事件
        addListenTogetherEvent('listenTogetherStarted', {
            initiator: shouldSendInvitation ? 'user' : 'ai',
            timestamp: Date.now()
        });
        
        // 恢复上次播放状态
        if (currentIdx === null) {
            try {
                const saved = localStorage.getItem('listen-songs');
                const savedIdx = localStorage.getItem('listen-currentIdx');
                if (saved && savedIdx !== null) {
                    songs = JSON.parse(saved);
                    playSong(parseInt(savedIdx));
                }
            } catch(e) {}
        }
        
        // 仅在用户主动点击且不处于一起听状态时发送邀请卡片
        if (shouldSendInvitation) {
            sendListenInvitationToAI();
        }
        
        // 通知一起听状态开始
        if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('listenTogetherStarted', {
                detail: { timestamp: Date.now(), initiator: shouldSendInvitation ? 'user' : 'ai' }
            }));
        }
    }
    
    // 最小化状态管理
    let isMinimized = false;
    let entryBtn = null;
    
    function minimize() {
        const modal = document.getElementById('listen-together-modal');
        if (!modal) return;
        modal.classList.remove('show');
        isMinimized = true;
        createEntryButton();
    }
    
    function restore() {
        const modal = document.getElementById('listen-together-modal');
        if (!modal) return;
        modal.classList.add('show');
        isMinimized = false;
        removeEntryButton();
    }
    
    // 【新增】显示关闭确认对话框，符合主题样式
    function showCloseConfirmDialog(onConfirm) {
        // 移除现有的对话框
        const existingDialog = document.getElementById('listen-close-confirm-dialog');
        if (existingDialog) existingDialog.remove();
        
        // 获取AI名称
        const AS = window.AppState;
        const aiName = (AS && AS.currentChat && AS.currentChat.name) || 'TA';
        
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'listen-close-confirm-dialog';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10002;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #fff;
            border-radius: 16px;
            padding: 28px 24px;
            max-width: 100%;
            width: 320px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.15);
            border: 1px solid rgba(255,51,51,0.1);
            animation: slideUp 0.3s ease-out;
        `;
        
        // 添加动画样式
        if (!document.getElementById('listen-dialog-animation')) {
            const style = document.createElement('style');
            style.id = 'listen-dialog-animation';
            style.textContent = `
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 18px;
            color: #333;
            font-weight: 600;
            margin-bottom: 12px;
            text-align: center;
        `;
        title.textContent = '确定要关闭一起听吗？';
        
        const subtitle = document.createElement('div');
        subtitle.style.cssText = `
            font-size: 14px;
            color: #666;
            margin-bottom: 24px;
            text-align: center;
            line-height: 1.6;
        `;
        subtitle.innerHTML = `与<span style="color: #ff3333;">${escapeHtml(aiName)}</span>的音乐时光就要结束了...`;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: center;
        `;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '继续听';
        cancelBtn.style.cssText = `
            padding: 12px 24px;
            border: 1px solid #ff3333;
            background: #fff;
            color: #ff3333;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            flex: 1;
            user-select: none;
            min-height: 44px;
        `;
        cancelBtn.addEventListener('mouseover', () => {
            cancelBtn.style.background = 'rgba(255,51,51,0.05)';
        });
        cancelBtn.addEventListener('mouseout', () => {
            cancelBtn.style.background = '#fff';
        });
        cancelBtn.addEventListener('touchstart', () => {
            cancelBtn.style.background = 'rgba(255,51,51,0.05)';
        });
        cancelBtn.addEventListener('touchend', () => {
            cancelBtn.style.background = '#fff';
        });
        
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '关闭';
        confirmBtn.style.cssText = `
            padding: 12px 24px;
            border: none;
            background: #ff3333;
            color: #fff;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            flex: 1;
            user-select: none;
            min-height: 44px;
            box-shadow: 0 4px 12px rgba(255,51,51,0.2);
        `;
        confirmBtn.addEventListener('mouseover', () => {
            confirmBtn.style.boxShadow = '0 6px 16px rgba(255,51,51,0.3)';
            confirmBtn.style.transform = 'translateY(-2px)';
        });
        confirmBtn.addEventListener('mouseout', () => {
            confirmBtn.style.boxShadow = '0 4px 12px rgba(255,51,51,0.2)';
            confirmBtn.style.transform = 'translateY(0)';
        });
        confirmBtn.addEventListener('touchstart', () => {
            confirmBtn.style.boxShadow = '0 6px 16px rgba(255,51,51,0.3)';
        });
        confirmBtn.addEventListener('touchend', () => {
            confirmBtn.style.boxShadow = '0 4px 12px rgba(255,51,51,0.2)';
        });
        
        cancelBtn.addEventListener('click', () => {
            dialogOverlay.remove();
        });
        
        confirmBtn.addEventListener('click', () => {
            dialogOverlay.remove();
            if (onConfirm) onConfirm();
        });
        
        // 点击背景也能关闭
        dialogOverlay.addEventListener('click', (e) => {
            if (e.target === dialogOverlay) {
                dialogOverlay.remove();
            }
        });
        
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);
        dialog.appendChild(title);
        dialog.appendChild(subtitle);
        dialog.appendChild(buttonContainer);
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
    }
    
    // 【新增】HTML转义函数，防止XSS
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    // 【新增】显示移除喜欢确认对话框，白红主题
    function showRemoveFavoriteConfirmDialog(song, onConfirm) {
        // 移除现有的对话框
        const existingDialog = document.getElementById('listen-remove-fav-confirm-dialog');
        if (existingDialog) existingDialog.remove();
        
        const songName = (song && song.title) || '这首歌';
        
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'listen-remove-fav-confirm-dialog';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10002;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #fff;
            border-radius: 16px;
            padding: 28px 24px;
            max-width: 100%;
            width: 320px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.15);
            border: 1px solid rgba(255,51,51,0.1);
            animation: slideUp 0.3s ease-out;
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 18px;
            color: #333;
            font-weight: 600;
            margin-bottom: 12px;
            text-align: center;
        `;
        title.textContent = '移除收藏';
        
        const subtitle = document.createElement('div');
        subtitle.style.cssText = `
            font-size: 14px;
            color: #666;
            margin-bottom: 24px;
            text-align: center;
            line-height: 1.6;
        `;
        subtitle.innerHTML = `确认从我的喜欢中移除<span style="color: #ff3333;">${escapeHtml(songName)}</span>？`;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: center;
        `;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            padding: 12px 24px;
            border: 1px solid #ff3333;
            background: #fff;
            color: #ff3333;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            flex: 1;
            user-select: none;
            min-height: 44px;
        `;
        cancelBtn.addEventListener('mouseover', () => {
            cancelBtn.style.background = 'rgba(255,51,51,0.05)';
        });
        cancelBtn.addEventListener('mouseout', () => {
            cancelBtn.style.background = '#fff';
        });
        cancelBtn.addEventListener('touchstart', () => {
            cancelBtn.style.background = 'rgba(255,51,51,0.05)';
        });
        cancelBtn.addEventListener('touchend', () => {
            cancelBtn.style.background = '#fff';
        });
        
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '移除';
        confirmBtn.style.cssText = `
            padding: 12px 24px;
            border: none;
            background: #ff3333;
            color: #fff;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            flex: 1;
            user-select: none;
            min-height: 44px;
            box-shadow: 0 4px 12px rgba(255,51,51,0.2);
        `;
        confirmBtn.addEventListener('mouseover', () => {
            confirmBtn.style.boxShadow = '0 6px 16px rgba(255,51,51,0.3)';
            confirmBtn.style.transform = 'translateY(-2px)';
        });
        confirmBtn.addEventListener('mouseout', () => {
            confirmBtn.style.boxShadow = '0 4px 12px rgba(255,51,51,0.2)';
            confirmBtn.style.transform = 'translateY(0)';
        });
        confirmBtn.addEventListener('touchstart', () => {
            confirmBtn.style.boxShadow = '0 6px 16px rgba(255,51,51,0.3)';
        });
        confirmBtn.addEventListener('touchend', () => {
            confirmBtn.style.boxShadow = '0 4px 12px rgba(255,51,51,0.2)';
        });
        
        cancelBtn.addEventListener('click', () => {
            dialogOverlay.remove();
        });
        
        confirmBtn.addEventListener('click', () => {
            dialogOverlay.remove();
            if (onConfirm) onConfirm();
        });
        
        // 点击背景也能关闭
        dialogOverlay.addEventListener('click', (e) => {
            if (e.target === dialogOverlay) {
                dialogOverlay.remove();
            }
        });
        
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);
        dialog.appendChild(title);
        dialog.appendChild(subtitle);
        dialog.appendChild(buttonContainer);
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
    }
    
    // 【新增】显示API选择对话框
    function showAPISelectDialog() {
        // 移除现有的对话框
        const existingDialog = document.getElementById('listen-api-select-dialog');
        if (existingDialog) existingDialog.remove();
        
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'listen-api-select-dialog';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10002;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #fff;
            border-radius: 16px;
            padding: 24px;
            max-width: 100%;
            width: 320px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.15);
            border: 1px solid rgba(255,51,51,0.1);
            animation: slideUp 0.3s ease-out;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 18px;
            color: #333;
            font-weight: 600;
            margin-bottom: 8px;
            text-align: center;
        `;
        title.textContent = '选择音乐API';
        
        const subtitle = document.createElement('div');
        subtitle.style.cssText = `
            font-size: 12px;
            color: #999;
            margin-bottom: 20px;
            text-align: center;
        `;
        subtitle.textContent = '可同时选择多个API';
        
        const apiList = document.createElement('div');
        apiList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        
        // 创建自定义API输入
        const customApiContainer = document.createElement('div');
        customApiContainer.style.cssText = `
            padding: 12px;
            background: #f5f5f5;
            border-radius: 8px;
            margin-bottom: 10px;
        `;
        
        const customApiLabel = document.createElement('div');
        customApiLabel.style.cssText = `
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
            font-weight: 600;
        `;
        customApiLabel.textContent = '或添加自定义API地址：';
        
        const customApiInput = document.createElement('input');
        customApiInput.type = 'text';
        customApiInput.placeholder = '输入API地址 (如: https://...)';
        customApiInput.style.cssText = `
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 12px;
            box-sizing: border-box;
        `;
        
        const addCustomBtn = document.createElement('button');
        addCustomBtn.textContent = '添加自定义API';
        addCustomBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            margin-top: 8px;
            border: none;
            background: #ff3333;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s;
        `;
        addCustomBtn.addEventListener('click', () => {
            const url = customApiInput.value.trim();
            if (url) {
                // 确保URL以/结尾
                const normalizedUrl = url.endsWith('/') ? url : url + '/';
                if (!APIS.includes(normalizedUrl)) {
                    APIS.push(normalizedUrl);
                    localStorage.setItem('listen-custom-apis', JSON.stringify(APIS));
                    dialogOverlay.remove();
                    showAPISelectDialog(); // 重新打开对话框显示新添加的API
                } else {
                    alert('该API已存在');
                }
            } else {
                alert('请输入API地址');
            }
        });
        
        customApiContainer.appendChild(customApiLabel);
        customApiContainer.appendChild(customApiInput);
        customApiContainer.appendChild(addCustomBtn);
        apiList.appendChild(customApiContainer);
        
        // 【改进】创建API列表项 - 改为复选框多选模式
        APIS.forEach((api, index) => {
            const apiItem = document.createElement('label');
            apiItem.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px;
                background: #f5f5f5;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                user-select: none;
            `;
            
            // 复选框
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedAPIIndices.includes(index);
            checkbox.style.cssText = `
                width: 18px;
                height: 18px;
                cursor: pointer;
                margin-right: 12px;
                accent-color: #ff3333;
            `;
            
            const apiName = document.createElement('span');
            apiName.style.cssText = `
                font-size: 12px;
                font-weight: 600;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                flex: 1;
                color: #333;
            `;
            apiName.textContent = api;
            
            apiItem.addEventListener('mouseover', () => {
                apiItem.style.background = '#ffe0e0';
            });
            apiItem.addEventListener('mouseout', () => {
                apiItem.style.background = '#f5f5f5';
            });
            
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    if (!selectedAPIIndices.includes(index)) {
                        selectedAPIIndices.push(index);
                    }
                } else {
                    selectedAPIIndices = selectedAPIIndices.filter(i => i !== index);
                }
                // 至少保留一个选中的API
                if (selectedAPIIndices.length === 0) {
                    selectedAPIIndices = [index];
                    checkbox.checked = true;
                }
                // 保存到localStorage
                localStorage.setItem('listen-selected-api-indices', JSON.stringify(selectedAPIIndices));
                // 更新当前使用的API
                apiIdx = selectedAPIIndices[currentAPIIndex] || selectedAPIIndices[0];
            });
            
            apiItem.appendChild(checkbox);
            apiItem.appendChild(apiName);
            apiList.appendChild(apiItem);
        });
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            margin-top: 20px;
            border: 1px solid #ddd;
            background: #fff;
            color: #333;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
        `;
        
        // 【新增】音质选择
        const qualityLabel = document.createElement('div');
        qualityLabel.style.cssText = `
            font-size: 14px;
            color: #333;
            font-weight: 600;
            margin-top: 20px;
            margin-bottom: 8px;
        `;
        qualityLabel.textContent = '🎵 音质选择';
        
        const qualityContainer = document.createElement('div');
        qualityContainer.style.cssText = `
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        `;
        
        const qualities = ['128', '320', '999'];
        const qualityLabels = { '128': '128kbps', '320': '320kbps (推荐)', '999': '无损' };
        qualities.forEach(q => {
            const btn = document.createElement('button');
            btn.textContent = qualityLabels[q];
            btn.style.cssText = `
                flex: 1;
                padding: 10px;
                border: 2px solid ${musicQuality === q ? '#ff3333' : '#ddd'};
                background: ${musicQuality === q ? '#ffe0e0' : '#f9f9f9'};
                color: ${musicQuality === q ? '#ff3333' : '#333'};
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: ${musicQuality === q ? '600' : '500'};
                transition: all 0.2s;
            `;
            btn.addEventListener('click', () => {
                musicQuality = q;
                localStorage.setItem('listen-music-quality', q);
                showAPISelectDialog(); // 刷新对话框显示选中状态
            });
            qualityContainer.appendChild(btn);
        });
        
        // 【新增】音乐源选择
        closeBtn.addEventListener('click', () => {
            dialogOverlay.remove();
        });
        closeBtn.addEventListener('mouseover', () => {
            closeBtn.style.background = '#f5f5f5';
        });
        closeBtn.addEventListener('mouseout', () => {
            closeBtn.style.background = '#fff';
        });
        
        dialog.appendChild(title);
        dialog.appendChild(subtitle);
        dialog.appendChild(apiList);
        dialog.appendChild(qualityLabel);
        dialog.appendChild(qualityContainer);
        dialog.appendChild(closeBtn);
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // 点击背景关闭
        dialogOverlay.addEventListener('click', (e) => {
            if (e.target === dialogOverlay) {
                dialogOverlay.remove();
            }
        });
    }
    
    function close() {
        // 【改进】使用主题样式的确认对话框
        showCloseConfirmDialog(() => {
            // 【修复】停止音乐播放
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
            
            const modal = document.getElementById('listen-together-modal');
            if (modal) {
                modal.classList.remove('show');
            }
            isMinimized = false;
            removeEntryButton();
            document.body.style.overflow = '';
            
            // 【修复】清除所有一起听相关状态
            // 更新一起听状态
            listenState.isActive = false;
            listenState.initiator = null;
            listenState.startTime = null;
            listenState.currentSong = null;
            listenState.isPlaying = false;
            listenState.lyrics = [];
            currentIdx = null;
            songs = [];
            
            // 记录一起听结束事件
            addListenTogetherEvent('listenTogetherEnded', {
                timestamp: Date.now(),
                duration: listenState.startTime ? Date.now() - listenState.startTime : 0
            });
            
            // 清理状态
            if (window._listenTimeInterval) {
                clearInterval(window._listenTimeInterval);
                window._listenTimeInterval = null;
            }
            
            // 通知一起听状态结束，并标记相关邀请卡片为已关闭
            if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('listenTogetherEnded', {
                    detail: { timestamp: Date.now() }
                }));
            }
            
            // 标记该聊天中所有相关的邀请卡片为已关闭
            if (window.endListenTogetherAndMarkClosed) {
                window.endListenTogetherAndMarkClosed();
            }
        });
    }
    
    function createEntryButton() {
        if (entryBtn) return;
        const toolbar = document.querySelector('.chat-toolbar-buttons');
        if (!toolbar) return;
        const mindBtn = document.getElementById('chat-mind-btn');
        if (!mindBtn) return;
        
        // 【改进1】创建增强的最小化按钮容器
        entryBtn = document.createElement('div');
        entryBtn.id = 'listen-entry-btn';
        entryBtn.className = 'listen-entry-button-container';
        entryBtn.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 6px 16px;
            background: transparent;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            max-width: 280px;
        `;
        
        // 第一行：歌名和歌手
        const songInfoEl = document.createElement('div');
        songInfoEl.id = 'listen-entry-song-info';
        songInfoEl.style.cssText = `
            font-size: 12px;
            color: black;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
        `;
        songInfoEl.textContent = '一起听';
        
        // 第二行：实时滚动歌词
        const lyricScrollEl = document.createElement('div');
        lyricScrollEl.id = 'listen-entry-lyric';
        lyricScrollEl.style.cssText = `
            font-size: 11px;
            color: #666;
            height: 18px;
            overflow: hidden;
            position: relative;
            white-space: nowrap;
            display: flex;
            align-items: center;
        `;
        
        const lyricTextEl = document.createElement('span');
        lyricTextEl.id = 'listen-entry-lyric-text';
        lyricTextEl.style.cssText = `
            display: inline-block;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 220px;
        `;
        lyricTextEl.textContent = '选一首歌开始';
        
        lyricScrollEl.appendChild(lyricTextEl);
        
        // 不再需要复杂的滚动动画，直接显示实时歌词即可
        if (document.getElementById('listen-scroll-animation')) {
            const oldStyle = document.getElementById('listen-scroll-animation');
            oldStyle.remove();
        }
        
        entryBtn.appendChild(songInfoEl);
        entryBtn.appendChild(lyricScrollEl);
        
        // 悬停效果
        entryBtn.onmouseover = () => {
            entryBtn.style.transform = 'scale(1.02)';
        };
        entryBtn.onmouseout = () => {
            entryBtn.style.transform = 'scale(1)';
        };
        
        // 点击恢复一起听
        entryBtn.onclick = (e) => {
            e.stopPropagation();
            restore();
        };
        
        toolbar.insertBefore(entryBtn, mindBtn);
        
        // 启动实时更新歌词显示
        startLyricScrollUpdate();
    }
    
    // 实时更新歌词显示（基于播放进度，而不是简单滚动）
    function startLyricScrollUpdate() {
        if (window._lyricScrollTimer) clearInterval(window._lyricScrollTimer);
        
        // 使用更频繁的更新以确保实时性
        window._lyricScrollTimer = setInterval(() => {
            const entryBtn = document.getElementById('listen-entry-btn');
            if (!entryBtn) {
                clearInterval(window._lyricScrollTimer);
                return;
            }
            
            // 更新歌名和歌手
            const songInfoEl = document.getElementById('listen-entry-song-info');
            if (songInfoEl && currentIdx !== null && songs[currentIdx]) {
                const song = songs[currentIdx];
                const name = song.name || song.title || '未知';
                const artist = song.artist || song.author || '未知';
                songInfoEl.textContent = `${name} - ${artist}`;
            }
            
            // 【改进】实时获取当前应显示的歌词（基于播放时间）
            const lyricTextEl = document.getElementById('listen-entry-lyric-text');
            if (lyricTextEl && currentLyrics.length > 0) {
                const cur = audio.currentTime || 0;
                let currentLyricIdx = -1;
                
                // 找到当前播放时间对应的歌词行
                for (let i = 0; i < currentLyrics.length; i++) {
                    if (currentLyrics[i].time <= cur) {
                        currentLyricIdx = i;
                    } else {
                        break;
                    }
                }
                
                // 显示当前歌词（而不是文字滚动）
                if (currentLyricIdx >= 0 && currentLyrics[currentLyricIdx]) {
                    const lyricText = currentLyrics[currentLyricIdx].text;
                    lyricTextEl.textContent = lyricText;
                    
                    // 移除旧的动画，使用淡入淡出效果
                    lyricTextEl.style.animation = 'none';
                    lyricTextEl.style.opacity = '1';
                }
            } else if (lyricTextEl && currentLyrics.length === 0) {
                lyricTextEl.textContent = '选一首歌开始';
                lyricTextEl.style.animation = 'none';
            }
        }, 100); // 每100ms更新一次，确保实时性
    }
    
    function removeEntryButton() {
        if (entryBtn && entryBtn.parentNode) {
            entryBtn.parentNode.removeChild(entryBtn);
            entryBtn = null;
        }
        // 清理实时更新定时器
        if (window._lyricScrollTimer) {
            clearInterval(window._lyricScrollTimer);
            window._lyricScrollTimer = null;
        }
    }
    
    // 初始化一起听功能
    function initListenTogether() {
        // 绑定关闭按钮事件
        const closeBtn = document.getElementById('listen-close-btn');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                close();
            };
        }
        
        // 【新增】绑定API选择按钮事件
        const apiBtn = document.getElementById('listen-api-btn');
        if (apiBtn) {
            apiBtn.onclick = (e) => {
                e.stopPropagation();
                showAPISelectDialog();
            };
        }
        
        // 绑定背景设置按钮事件
        const bgBtn = document.getElementById('listen-bg-btn');
        if (bgBtn) {
            bgBtn.onclick = (e) => {
                e.stopPropagation();
                document.getElementById('listen-bg-input').click();
            };
        }
        
        // 绑定背景文件选择事件
        const bgInput = document.getElementById('listen-bg-input');
        if (bgInput) {
            bgInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const modal = document.getElementById('listen-together-modal');
                        modal.style.setProperty('--listen-custom-bg', `url(${e.target.result})`);
                        modal.classList.add('custom-bg');
                    };
                    reader.readAsDataURL(file);
                }
            };
        }
    }
    
    // 在模态框创建后初始化
    const originalCreateModal = createModal;
    createModal = function() {
        originalCreateModal();
        initListenTogether();
    };
    
    window.ListenTogether = { 
        open, 
        close, 
        minimize, 
        restore,
        playNext,
        // 【新增】搜索歌曲并添加到喜欢库（用于AI收藏）
        searchAndAddFavorite: async function(songQuery) {
            if (!songQuery || !songQuery.trim()) {
                console.log('⚠️ 搜索关键词为空');
                return false;
            }
            
            try {
                // 执行搜索 - 使用GD音乐台API
                const keyword = songQuery.trim();
                let searchResults = [];
                
                // 【改进】尝试所有选中的API
                const tryAPIs = selectedAPIIndices.map(idx => APIS[idx]);
                
                for (const api of tryAPIs) {
                    try {
                        const url = `${api}?types=search&source=netease&name=${encodeURIComponent(keyword)}&count=10`;
                        
                        const res = await fetch(url);
                        const data = await res.json();
                        
                        if (data && Array.isArray(data) && data.length) {
                            searchResults = data.map(item => ({
                                id: item.id,
                                name: item.name,
                                title: item.name,
                                artist: Array.isArray(item.artist) ? item.artist.join('/') : item.artist,
                                author: Array.isArray(item.artist) ? item.artist.join('/') : item.artist,
                                pic_id: item.pic_id,
                                lyric_id: item.lyric_id,
                                source: 'netease'
                            }));
                            break;
                        }
                    } catch (e) {
                        console.log('API失败，尝试下一个:', e);
                    }
                }
                
                if (!searchResults.length) {
                    console.log(`⚠️ 搜索"${songQuery}"无结果`);
                    return false;
                }
                
                // 取第一个搜索结果
                const song = searchResults[0];
                const songName = (song.name || song.title || '未知');
                const songArtist = (song.artist || song.author || '未知');
                
                // 检查是否已收藏
                const isDuplicate = favorites.some(f => 
                    f && f.title === (Array.isArray(songName) ? songName[0] : songName) && 
                    f.author === (Array.isArray(songArtist) ? songArtist.join('/') : songArtist)
                );
                
                if (isDuplicate) {
                    console.log(`⚠️ "${songName}"已经在喜欢库中了`);
                    return false;
                }
                
                // 添加到喜欢库
                favorites.push(song);
                localStorage.setItem('listen-favorites', JSON.stringify(favorites));
                
                const displayName = Array.isArray(songName) ? songName[0] : songName;
                const displayArtist = Array.isArray(songArtist) ? songArtist.join('/') : songArtist;
                
                console.log(`✅ 已搜索并收藏: "${displayName}" - ${displayArtist}`);
                return true;
            } catch (e) {
                console.error('搜索并收藏歌曲失败:', e);
                return false;
            }
        },
        // 【新增】根据歌曲名称从喜欢库中查找并播放
        playSongByName: function(songQuery) {
            if (!songQuery || !songQuery.trim()) {
                return playNext(); // 降级到下一首
            }
            
            const query = songQuery.toLowerCase().trim();
            const favs = favorites.filter(f => f);
            let foundSong = null;
            
            // 在喜欢库中查找匹配的歌曲
            for (const fav of favs) {
                if (!fav) continue;
                
                // 获取歌曲信息，支持多种字段名
                const favTitle = (fav.title || fav.name || '').toLowerCase();
                const favAuthor = (fav.author || fav.artist || '').toLowerCase();
                
                // 精确匹配或部分匹配
                if (query === favTitle || query === favAuthor) {
                    foundSong = fav;
                    break;
                }
                
                // 模糊匹配
                if (favTitle.includes(query) || (favAuthor && favAuthor.includes(query))) {
                    foundSong = fav;
                    break;
                }
            }
            
            if (!foundSong) {
                console.log(`⚠️ 未在喜欢库中找到歌曲: ${songQuery}`);
                return playNext(); // 降级到下一首
            }
            
            // 将找到的歌曲添加到播放列表（如果不存在）
            // 比较时也要大小写不敏感
            const songTitle = (foundSong.name || foundSong.title || '');
            const songAuthor = (foundSong.artist || foundSong.author || '');
            
            const songExists = songs.some(s => {
                if (!s) return false;
                const sTitle = (s.name || s.title || '').toLowerCase();
                const sAuthor = (s.artist || s.author || '').toLowerCase();
                const fTitle = songTitle.toLowerCase();
                const fAuthor = songAuthor.toLowerCase();
                return sTitle === fTitle && sAuthor === fAuthor;
            });
            
            if (!songExists) {
                songs.push(foundSong);
                localStorage.setItem('listen-songs', JSON.stringify(songs));
            }
            
            // 查找并播放这首歌
            // 比较时也要大小写不敏感
            const idx = songs.findIndex(s => {
                if (!s) return false;
                const sTitle = (s.name || s.title || '').toLowerCase();
                const sAuthor = (s.artist || s.author || '').toLowerCase();
                const fTitle = songTitle.toLowerCase();
                const fAuthor = songAuthor.toLowerCase();
                return sTitle === fTitle && sAuthor === fAuthor;
            });
            
            if (idx >= 0) {
                playSong(idx);
                console.log(`✅ 已切歌到: ${songTitle} - ${songAuthor}`);
                return true;
            }
            
            return playNext(); // 降级到下一首
        },
        getState: function() {
            const modal = document.getElementById('listen-together-modal');
            listenState.isActive = modal && modal.classList.contains('show') && !isMinimized;
            listenState.currentSong = currentIdx !== null ? songs[currentIdx] : null;
            listenState.isPlaying = !audio.paused;
            
            return listenState;
        }, 
        setState: function(newState) {
            if (newState) {
                Object.assign(listenState, newState);
            }
            return listenState;
        },
        // 【改进4】获取当前歌词上下文 - 供API生成更有沉浸感的对话
        getCurrentLyricContext: function() {
            if (!currentLyrics || currentLyrics.length === 0) return null;
            
            const cur = audio.currentTime || 0;
            let currentLyricIdx = -1;
            
            // 找到当前播放时间对应的歌词
            for (let i = 0; i < currentLyrics.length; i++) {
                if (currentLyrics[i].time <= cur) {
                    currentLyricIdx = i;
                } else {
                    break;
                }
            }
            
            if (currentLyricIdx < 0) return null;
            
            // 返回当前歌词及其上下文（前2行、当前行、后2行）
            const contextLyrics = [];
            const startIdx = Math.max(0, currentLyricIdx - 2);
            const endIdx = Math.min(currentLyrics.length - 1, currentLyricIdx + 2);
            
            for (let i = startIdx; i <= endIdx; i++) {
                if (currentLyrics[i]) {
                    const prefix = i === currentLyricIdx ? '> ' : '  ';
                    contextLyrics.push({
                        prefix: prefix,
                        text: currentLyrics[i].text,
                        isCurrent: i === currentLyricIdx
                    });
                }
            }
            
            return contextLyrics;
        },
        getLastEvent: function() {
            return listenEvents.length > 0 ? listenEvents[listenEvents.length - 1] : null;
        },
        addEvent: addListenTogetherEvent
    };
})();
