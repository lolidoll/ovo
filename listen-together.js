/**
 * 一起听模块 - 使用 Meting API
 */
(function() {
    'use strict';
    
    // 多个API备选
    const APIS = [
        'https://api.injahow.cn/meting/',
        'https://meting.qjqq.cn/',
        'https://api.i-meto.com/meting/api'
    ];
    let apiIdx = 0;
    let audio = new Audio();
    let songs = [];
    let currentIdx = null;
    let isPlaying = false;
    let favorites = JSON.parse(localStorage.getItem('listen-favorites') || '[]');
    let playMode = localStorage.getItem('listen-playmode') || 'order'; // order, random, loop
    let currentLyrics = [];
    let currentView = 'search'; // search, favorites
    
    // 默认占位图
    const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCBmaWxsPSIjMzMzIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjUwIi8+PC9zdmc+';
    
    function createModal() {
        if (document.getElementById('listen-together-modal')) return;
        
        const userAvatar = localStorage.getItem('userAvatar') || PLACEHOLDER;
        const aiAvatar = localStorage.getItem('characterAvatar') || PLACEHOLDER;
        
        const html = `
        <div class="listen-together-modal" id="listen-together-modal">
            <div class="listen-container">
                <div class="listen-header">
                    <button class="listen-header-btn" id="listen-minimize" title="最小化"><svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M19 13H5v-2h14v2z"/></svg></button>
                    <button class="listen-header-btn" id="listen-close" title="关闭"><svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
                </div>
                <div class="listen-couple">
                    <div class="listen-avatar-wrap">
                        <div class="listen-avatar-glow"></div>
                        <img class="listen-avatar" src="${userAvatar}" onerror="this.src='${PLACEHOLDER}'">
                    </div>
                    <div class="listen-link">
                        <div class="listen-link-dot"></div>
                        <div class="listen-link-dot"></div>
                        <div class="listen-link-dot"></div>
                    </div>
                    <div class="listen-avatar-wrap">
                        <div class="listen-avatar-glow"></div>
                        <img class="listen-avatar" src="${aiAvatar}" onerror="this.src='${PLACEHOLDER}'">
                    </div>
                </div>
                <div class="listen-main-swiper" id="listen-main-swiper">
                    <div class="listen-page listen-page-player">
                        <div class="listen-now-playing">
                            <div class="listen-cover-wrap">
                                <div class="listen-cover-ring"></div>
                                <img class="listen-now-cover" id="listen-now-cover" src="${PLACEHOLDER}">
                            </div>
                            <div class="listen-now-title" id="listen-now-title">选一首歌</div>
                            <div class="listen-now-artist" id="listen-now-artist">一起听</div>
                        </div>
                    </div>
                    <div class="listen-page listen-page-lyric">
                        <div class="listen-lyric" id="listen-lyric">暂无歌词</div>
                    </div>
                </div>
                <div class="listen-page-dots">
                    <div class="listen-dot active"></div>
                    <div class="listen-dot"></div>
                </div>
                <div class="listen-player">
                    <div class="listen-progress">
                        <span id="listen-current-time">0:00</span>
                        <div class="listen-progress-bar" id="listen-progress-bar">
                            <div class="listen-progress-fill" id="listen-progress-fill"></div>
                        </div>
                        <span id="listen-duration">0:00</span>
                    </div>
                    <div class="listen-controls">
                        <button class="listen-ctrl-btn" id="listen-mode" title="播放模式"><svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg></button>
                        <button class="listen-ctrl-btn" id="listen-prev"><svg viewBox="0 0 24 24"><path d="M19 20L9 12l10-8v16zM5 19V5h2v14H5z"/></svg></button>
                        <button class="listen-ctrl-btn" id="listen-play"><svg viewBox="0 0 24 24" id="listen-play-icon"><path d="M8 5v14l11-7z"/></svg></button>
                        <button class="listen-ctrl-btn" id="listen-next"><svg viewBox="0 0 24 24"><path d="M5 4l10 8-10 8V4zm12 0h2v16h-2V4z"/></svg></button>
                        <button class="listen-ctrl-btn" id="listen-fav" title="喜欢"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>
                    </div>
                </div>
                <div class="listen-bottom-panel" id="listen-bottom-panel">
                    <div class="listen-panel-handle" id="listen-panel-handle">
                        <div class="listen-handle-bar"></div>
                    </div>
                    <div class="listen-panel-content">
                        <div class="listen-tabs">
                            <button class="listen-tab active" id="listen-tab-search">搜索</button>
                            <button class="listen-tab" id="listen-tab-fav">我的喜欢</button>
                        </div>
                        <div class="listen-search" id="listen-search-area">
                            <div class="listen-search-box">
                                <input type="text" id="listen-search-input" placeholder="搜索想一起听的歌...">
                                <button class="listen-search-btn" id="listen-search-btn">搜索</button>
                            </div>
                        </div>
                        <div class="listen-songs" id="listen-songs"></div>
                    </div>
                </div>
            </div>
        </div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
        bindEvents();
    }
    
    function bindEvents() {
        document.getElementById('listen-close').onclick = close;
        document.getElementById('listen-minimize').onclick = minimize;
        document.getElementById('listen-search-btn').onclick = search;
        document.getElementById('listen-search-input').onkeypress = e => e.key === 'Enter' && search();
        document.getElementById('listen-play').onclick = togglePlay;
        document.getElementById('listen-prev').onclick = playPrev;
        document.getElementById('listen-next').onclick = playNext;
        document.getElementById('listen-progress-bar').onclick = seek;
        document.getElementById('listen-mode').onclick = toggleMode;
        document.getElementById('listen-fav').onclick = toggleFavorite;
        document.getElementById('listen-tab-search').onclick = () => switchView('search');
        document.getElementById('listen-tab-fav').onclick = () => switchView('favorites');
        document.getElementById('listen-panel-handle').onclick = togglePanel;
        
        const swiper = document.getElementById('listen-main-swiper');
        let startX = 0;
        swiper.ontouchstart = e => startX = e.touches[0].clientX;
        swiper.ontouchmove = e => {
            const diff = e.touches[0].clientX - startX;
            if (Math.abs(diff) > 50) {
                swipePage(diff > 0 ? -1 : 1);
                startX = e.touches[0].clientX;
            }
        };
        
        audio.ontimeupdate = () => { updateProgress(); updateLyric(); };
        audio.onended = playNext;
        audio.onplay = () => { isPlaying = true; updateUI(); };
        audio.onpause = () => { isPlaying = false; updateUI(); };
    }
    
    let currentPage = 0;
    let panelOpen = false;
    
    function swipePage(dir) {
        currentPage = Math.max(0, Math.min(1, currentPage + dir));
        const swiper = document.getElementById('listen-main-swiper');
        swiper.style.transform = `translateX(-${currentPage * 100}%)`;
        document.querySelectorAll('.listen-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === currentPage);
        });
    }
    
    function togglePanel() {
        panelOpen = !panelOpen;
        const panel = document.getElementById('listen-bottom-panel');
        panel.classList.toggle('open', panelOpen);
    }
    
    async function search() {
        const keyword = document.getElementById('listen-search-input').value.trim();
        if (!keyword) return;
        
        const container = document.getElementById('listen-songs');
        container.innerHTML = '<div class="listen-loading">搜索中...</div>';
        
        // 尝试多个API
        for (let i = 0; i < APIS.length; i++) {
            try {
                const api = APIS[(apiIdx + i) % APIS.length];
                const url = `${api}?server=netease&type=search&id=${encodeURIComponent(keyword)}`;
                
                const res = await fetch(url);
                const data = await res.json();
                
                console.log('搜索结果:', data);
                
                if (data && data.length) {
                    apiIdx = (apiIdx + i) % APIS.length;
                    songs = data;
                    console.log('歌曲列表:', songs);
                    renderSongs();
                    return;
                }
            } catch (e) {
                console.log('API失败，尝试下一个:', e);
            }
        }
        container.innerHTML = '<div class="listen-empty">搜索失败，请重试</div>';
    }
    
    function renderSongs() {
        const container = document.getElementById('listen-songs');
        const validSongs = songs.filter(s => s);
        if (!validSongs.length) {
            container.innerHTML = '<div class="listen-empty">暂无歌曲</div>';
            return;
        }
        container.innerHTML = validSongs.slice(0, 8).map((s, i) => {
            let name = s.name || s.title || '未知';
            let artist = s.artist || s.author || '未知';
            if (Array.isArray(name)) name = name[0] || '未知';
            if (Array.isArray(artist)) artist = artist.join('/') || '未知';
            const pic = s.pic || s.cover || PLACEHOLDER;
            return `
            <div class="listen-song-item${currentIdx === i ? ' active' : ''}" data-idx="${i}">
                <img class="listen-song-cover" src="${pic}" onerror="this.src='${PLACEHOLDER}'">
                <div class="listen-song-info">
                    <div class="listen-song-name">${name}</div>
                    <div class="listen-song-artist">${artist}</div>
                </div>
            </div>`;
        }).join('');
        
        container.querySelectorAll('.listen-song-item').forEach(item => {
            item.onclick = () => playSong(parseInt(item.dataset.idx));
        });
    }
    
    async function playSong(idx) {
        if (idx < 0 || idx >= songs.length) return;
        
        const song = songs[idx];
        currentIdx = idx;
        
        let name = song.name || song.title || '未知';
        let artist = song.artist || song.author || '未知';
        if (Array.isArray(name)) name = name[0] || '未知';
        if (Array.isArray(artist)) artist = artist.join('/') || '未知';
        console.log('播放歌曲:', name, artist, song);
        document.getElementById('listen-now-title').textContent = name;
        document.getElementById('listen-now-artist').textContent = artist;
        const cover = document.getElementById('listen-now-cover');
        const pic = song.pic || song.cover || PLACEHOLDER;
        cover.src = pic;
        cover.onerror = () => cover.src = PLACEHOLDER;
        
        renderSongs();
        loadLyric(song);
        
        // 如果已有url直接播放
        if (song.url) {
            audio.src = song.url;
            audio.play();
            return;
        }
        
        // 否则获取url
        try {
            const urlLink = song.url;
            if (urlLink) {
                const res = await fetch(urlLink);
                const data = await res.json();
                if (data && data.url) {
                    audio.src = data.url;
                    audio.play();
                }
            }
        } catch (e) {
            console.error('播放失败:', e);
        }
    }
    
    async function loadLyric(song) {
        const lyricEl = document.getElementById('listen-lyric');
        currentLyrics = [];
        if (!song || (!song.id && !song.lrc)) {
            lyricEl.innerHTML = '<div style="opacity:0.5;">暂无歌词</div>';
            return;
        }
        lyricEl.innerHTML = '<div style="opacity:0.5;">加载中...</div>';
        try {
            const lrcUrl = song.lrc;
            if (lrcUrl) {
                const res = await fetch(lrcUrl);
                const text = await res.text();
                if (text) {
                    currentLyrics = text.split('\n')
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
                } else {
                    lyricEl.innerHTML = '<div style="opacity:0.5;">暂无歌词</div>';
                }
            } else {
                lyricEl.innerHTML = '<div style="opacity:0.5;">暂无歌词</div>';
            }
        } catch (e) {
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
            lines[activeIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        const btn = document.getElementById('listen-fav');
        if (idx >= 0) {
            favorites.splice(idx, 1);
            btn.style.fill = 'none';
        } else {
            favorites.push(song);
            btn.style.fill = '#ff6682';
        }
        localStorage.setItem('listen-favorites', JSON.stringify(favorites));
    }
    
    function switchView(view) {
        currentView = view;
        const searchBtn = document.getElementById('listen-tab-search');
        const favBtn = document.getElementById('listen-tab-fav');
        const container = document.getElementById('listen-songs');
        const searchArea = document.getElementById('listen-search-area');
        
        if (view === 'search') {
            searchBtn.classList.add('active');
            favBtn.classList.remove('active');
            searchArea.style.display = '';
            container.innerHTML = '<div class="listen-empty">搜索歌曲</div>';
        } else {
            songs = favorites.filter(f => f);
            searchBtn.classList.remove('active');
            favBtn.classList.add('active');
            searchArea.style.display = 'none';
            renderSongs();
        }
    }
    
    function updateUI() {
        const icon = document.getElementById('listen-play-icon');
        const cover = document.getElementById('listen-now-cover');
        const favBtn = document.getElementById('listen-fav');
        icon.innerHTML = isPlaying ? '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>' : '<path d="M8 5v14l11-7z"/>';
        cover.classList.toggle('playing', isPlaying);
        if (currentIdx !== null && songs[currentIdx]) {
            const song = songs[currentIdx];
            const isFav = favorites.some(f => f && f.title === song.title && f.author === song.author);
            favBtn.style.fill = isFav ? '#ff6682' : 'none';
        }
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
    
    function open() {
        createModal();
        document.getElementById('listen-together-modal').classList.add('show');
    }
    
    function close() {
        document.getElementById('listen-together-modal')?.classList.remove('show');
        document.getElementById('listen-floating')?.remove();
        audio.pause();
    }
    
    function minimize() {
        document.getElementById('listen-together-modal')?.classList.remove('show');
        if (document.getElementById('listen-floating')) return;
        const div = document.createElement('div');
        div.id = 'listen-floating';
        div.style.cssText = 'position:fixed;bottom:80px;right:16px;z-index:9999;width:52px;height:52px;border-radius:50%;background:rgba(28,28,35,0.9);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.4);';
        div.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="rgba(255,100,130,0.9)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';
        div.onclick = () => { div.remove(); open(); };
        document.body.appendChild(div);
    }
    
    window.ListenTogether = { open, close };
})();
