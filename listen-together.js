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
                <div class="listen-topbar">
                    <button class="listen-close" id="listen-close">×</button>
                    <div class="listen-topbar-info" id="listen-topbar-info">
                        <span class="listen-topbar-song" id="listen-topbar-song">选一首歌</span>
                        <span class="listen-topbar-artist" id="listen-topbar-artist">一起听</span>
                    </div>
                </div>
                <div class="listen-body">
                    <div class="listen-search-panel" id="listen-search-panel" style="display:none;">
                        <div class="listen-search-box">
                            <input type="text" id="listen-search-input" placeholder="搜索歌曲...">
                            <button class="listen-search-btn" id="listen-search-btn">搜索</button>
                        </div>
                        <div class="listen-songs" id="listen-songs"></div>
                    </div>
                    <div class="listen-fav-panel" id="listen-fav-panel" style="display:none;">
                        <div class="listen-fav-songs" id="listen-fav-songs"></div>
                    </div>
                    <div class="listen-player" id="listen-player">
                        <div style="overflow:hidden;">
                            <div class="listen-swiper" id="listen-swiper">
                                <div class="listen-page">
                                    <div class="listen-now-playing">
                                        <div class="listen-cover-wrap">
                                            <div class="listen-cover-ring"></div>
                                            <img class="listen-now-cover" id="listen-now-cover" src="${PLACEHOLDER}">
                                        </div>
                                        <div class="listen-now-title" id="listen-now-title">选一首歌</div>
                                        <div class="listen-now-artist" id="listen-now-artist">一起听</div>
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
                <div class="listen-progress">
                    <span id="listen-current-time">0:00</span>
                    <div class="listen-progress-bar" id="listen-progress-bar">
                        <div class="listen-progress-fill" id="listen-progress-fill"></div>
                    </div>
                    <span id="listen-duration">0:00</span>
                </div>
                <div class="listen-controls">
                    <button class="listen-ctrl-btn" id="listen-tab-search" title="搜索"><svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg></button>
                    <button class="listen-ctrl-btn" id="listen-mode" title="顺序播放"><svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg></button>
                    <button class="listen-ctrl-btn" id="listen-prev"><svg viewBox="0 0 24 24"><path d="M19 20L9 12l10-8v16zM5 19V5h2v14H5z"/></svg></button>
                    <button class="listen-ctrl-btn play-btn" id="listen-play"><svg viewBox="0 0 24 24" id="listen-play-icon"><path d="M8 5v14l11-7z"/></svg></button>
                    <button class="listen-ctrl-btn" id="listen-next"><svg viewBox="0 0 24 24"><path d="M5 4l10 8-10 8V4zm12 0h2v16h-2V4z"/></svg></button>
                    <button class="listen-ctrl-btn" id="listen-fav" title="喜欢"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>
                    <button class="listen-ctrl-btn" id="listen-tab-fav" title="我的喜欢"><svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/></svg></button>
                </div>
            </div>
        </div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
        bindEvents();
    }
    
    let swiperPage = 0;
    
    function bindEvents() {
        document.getElementById('listen-close').onclick = close;
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
        
        // 滑动切换页面
        const swiper = document.getElementById('listen-swiper');
        let startX = 0;
        swiper.addEventListener('touchstart', e => startX = e.touches[0].clientX, {passive:true});
        swiper.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 40) setSwiperPage(dx > 0 ? 0 : 1);
        }, {passive:true});
        swiper.addEventListener('mousedown', e => startX = e.clientX);
        swiper.addEventListener('mouseup', e => {
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 40) setSwiperPage(dx > 0 ? 0 : 1);
        });
        
        audio.ontimeupdate = () => { updateProgress(); updateLyric(); };
        audio.onended = playNext;
        audio.onplay = () => { isPlaying = true; updateUI(); };
        audio.onpause = () => { isPlaying = false; updateUI(); };
    }
    
    function setSwiperPage(page) {
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
        container.innerHTML = validSongs.map((s, i) => {
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
            item.onclick = () => {
                playSong(parseInt(item.dataset.idx));
                document.getElementById('listen-search-panel').style.display = 'none';
                document.getElementById('listen-player').style.display = '';
            };
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
        document.getElementById('listen-topbar-song').textContent = name;
        document.getElementById('listen-topbar-artist').textContent = artist;
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
        if (idx >= 0) {
            if (confirm('确认从我的喜欢中移除？')) {
                favorites.splice(idx, 1);
                localStorage.setItem('listen-favorites', JSON.stringify(favorites));
                updateFavBtn();
            }
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
        const fp = document.getElementById('listen-fav-panel');
        const pl = document.getElementById('listen-player');
        if (sp.style.display !== 'none') {
            sp.style.display = 'none';
            pl.style.display = '';
        } else {
            sp.style.display = '';
            fp.style.display = 'none';
            pl.style.display = 'none';
        }
    }
    
    function toggleFavPanel() {
        const sp = document.getElementById('listen-search-panel');
        const fp = document.getElementById('listen-fav-panel');
        const pl = document.getElementById('listen-player');
        if (fp.style.display !== 'none') {
            fp.style.display = 'none';
            pl.style.display = '';
        } else {
            fp.style.display = '';
            sp.style.display = 'none';
            pl.style.display = 'none';
            renderFavSongs();
        }
    }
    
    function renderFavSongs() {
        const container = document.getElementById('listen-fav-songs');
        const validFavs = favorites.filter(f => f);
        if (!validFavs.length) {
            container.innerHTML = '<div class="listen-empty">暂无收藏</div>';
            return;
        }
        container.innerHTML = validFavs.map((s, i) => {
            let name = s.name || s.title || '未知';
            let artist = s.artist || s.author || '未知';
            if (Array.isArray(name)) name = name[0] || '未知';
            if (Array.isArray(artist)) artist = artist.join('/') || '未知';
            const pic = s.pic || s.cover || PLACEHOLDER;
            return `
            <div class="listen-song-item" data-fav-idx="${i}">
                <img class="listen-song-cover" src="${pic}" onerror="this.src='${PLACEHOLDER}'">
                <div class="listen-song-info">
                    <div class="listen-song-name">${name}</div>
                    <div class="listen-song-artist">${artist}</div>
                </div>
            </div>`;
        }).join('');
        container.querySelectorAll('.listen-song-item').forEach(item => {
            item.onclick = () => {
                songs = favorites.filter(f => f);
                playSong(parseInt(item.dataset.favIdx));
                document.getElementById('listen-fav-panel').style.display = 'none';
                document.getElementById('listen-player').style.display = '';
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
    
    function open() {
        createModal();
        document.getElementById('listen-together-modal').classList.add('show');
    }
    
    function close() {
        document.getElementById('listen-together-modal')?.classList.remove('show');
        audio.pause();
    }
    
    window.ListenTogether = { open, close };
})();
