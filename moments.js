/**
 * 朋友圈功能模块 - 使用 IndexedDB 存储
 * 所有朋友圈相关的JS代码都在这个文件中
 */

// 延迟初始化，确保DOM加载完成
let momentsPageReady = false;

function checkMomentsPageReady() {
  if (typeof document !== 'undefined' && document.getElementById('feedList')) {
    momentsPageReady = true;
    return true;
  }
  return false;
}

// 删除确认相关变量
let pendingDeleteMomentId = null;

// 显示删除确认弹窗
function showDeleteConfirm(momentId) {
  pendingDeleteMomentId = momentId;
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) {
    modal.classList.add('show');
  }
}

// 关闭删除确认弹窗
function closeDeleteConfirm() {
  pendingDeleteMomentId = null;
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// 确认删除
function confirmDelete() {
  if (pendingDeleteMomentId && momentsManager) {
    momentsManager.deleteMoment(pendingDeleteMomentId);
    momentsManager.renderMoments();
    closeDeleteConfirm();
  }
}

// 朋友圈数据存储
class MomentsManager {
  constructor() {
    this.moments = []; // 所有朋友圈
    this.comments = {}; // 评论存储 {momentId: [comments]}
    this.notifications = []; // 通知列表
    this.autoSettings = {
      enabled: false,
      interval: 30, // 分钟
      count: 1 // 每次生成几条
    };
    this.autoReplyEnabled = true;
    
    // 加载数据
    this.loadFromStorage();
    
    if (checkMomentsPageReady()) {
      this.initProfileData();
    }
  }

  // 从 localStorage 加载数据
  loadFromStorage() {
    const saved = localStorage.getItem('momentsData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.moments = data.moments || [];
        this.comments = data.comments || {};
        this.notifications = data.notifications || [];
        this.autoSettings = data.autoSettings || this.autoSettings;
      } catch (e) {
        console.error('加载朋友圈数据失败:', e);
      }
    }
  }

  // 保存数据到 localStorage
  saveToStorage() {
    const data = {
      moments: this.moments,
      comments: this.comments,
      notifications: this.notifications,
      autoSettings: this.autoSettings
    };
    try {
      localStorage.setItem('momentsData', JSON.stringify(data));
    } catch (e) {
      console.error('保存朋友圈数据失败:', e);
    }
  }

  // 初始化个人资料数据
  initProfileData() {
    try {
      let userName = null;
      let userAvatar = null;
      
      // 第一阶段：从localStorage读取已保存的数据（优先级最高 - 确保持久化）
      try {
        const saved = localStorage.getItem('cachedAppState');
        if (saved) {
          const appState = JSON.parse(saved);
          if (appState.user) {
            if (appState.user.name) userName = appState.user.name;
            if (appState.user.avatar) userAvatar = appState.user.avatar;
          }
        }
      } catch (e) {
        console.log('从localStorage读取用户信息出错:', e.message);
      }
      
      // 第二阶段：从侧边栏补充（如果localStorage没有）
      if (!userName || !userAvatar) {
        try {
          // 尝试从父窗口侧边栏获取
          if (window.parent && window.parent !== window) {
            if (!userName) {
              const displayName = window.parent.document.getElementById('display-name');
              if (displayName && displayName.textContent) {
                userName = displayName.textContent.trim();
              }
              if (!userName) {
                const userNameEl = window.parent.document.querySelector('.user-name');
                if (userNameEl && userNameEl.textContent) {
                  userName = userNameEl.textContent.trim();
                }
              }
            }
            
            if (!userAvatar) {
              const cardAvatar = window.parent.document.getElementById('card-avatar');
              if (cardAvatar) {
                const img = cardAvatar.querySelector('img');
                if (img && img.src) {
                  userAvatar = img.src;
                }
              }
            }
          }
          
          // 如果父窗口获取失败，尝试当前窗口
          if (!userName) {
            const displayName = document.getElementById('display-name');
            if (displayName && displayName.textContent) {
              userName = displayName.textContent.trim();
            }
          }
          
          if (!userAvatar) {
            const cardAvatar = document.getElementById('card-avatar');
            if (cardAvatar) {
              const img = cardAvatar.querySelector('img');
              if (img && img.src) {
                userAvatar = img.src;
              }
            }
          }
        } catch (e) {
          console.log('从侧边栏获取用户信息出错:', e.message);
        }
      }
      
      // 第三阶段：从AppState补充（如果前两个阶段都失败）
      const appState = this.getAppState();
      if (!userName && appState && appState.user) {
        userName = appState.user.name || '用户';
      }
      if (!userAvatar && appState && appState.user) {
        userAvatar = appState.user.avatar || '';
      }
      
      // 最后的默认值
      if (!userName) {
        userName = '用户';
      }
      
      if (!userAvatar && appState && appState.user) {
        userAvatar = appState.user.avatar || '';
      } else if (!userAvatar) {
        userAvatar = '';
      }
      
      // 第三阶段：设置朋友圈UI
      try {
        const nameEl = document.getElementById('profileName');
        if (nameEl) {
          nameEl.textContent = userName;
          nameEl.style.cursor = 'pointer';
          
          // 名字可点击编辑
          nameEl.onclick = () => {
            try {
              const newName = prompt('修改用户名:', userName);
              if (newName && newName.trim()) {
                userName = newName.trim();
                nameEl.textContent = newName.trim();
                // 同步到侧边栏（这个函数会处理所有的更新）
                this.syncNameToSidebar(newName.trim());
              }
            } catch (e) {
              console.log('修改用户名出错:', e.message);
            }
          };
        }
      } catch (e) {
        console.log('设置名字出错:', e.message);
      }
      
      try {
        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl) {
          avatarEl.src = userAvatar;
          avatarEl.style.cursor = 'pointer';
          
          // 头像可点击编辑
          avatarEl.onclick = () => {
            try {
              const newAvatar = prompt('输入新头像URL:', userAvatar || '');
              if (newAvatar && newAvatar.trim()) {
                avatarEl.src = newAvatar.trim();
                // 同步到侧边栏（这个函数会处理所有的更新）
                this.syncAvatarToSidebar(newAvatar.trim());
              }
            } catch (e) {
              console.log('修改头像出错:', e.message);
            }
          };
          
          // 同步到AppState
          if (appState && appState.user) {
            appState.user.avatar = userAvatar;
            localStorage.setItem('cachedAppState', JSON.stringify(appState));
          }
          // 同步到侧边栏
          this.syncAvatarToSidebar(userAvatar);
        }
      } catch (e) {
        console.log('设置头像出错:', e.message);
      }
      
      // 设置访客总量
      try {
        const visitorEl = document.getElementById('visitorCount');
        if (visitorEl) {
          const visitorCount = (appState && appState.user && appState.user.visitorCount) || 0;
          visitorEl.textContent = visitorCount;
          
          // 访客总量可点击修改
          const parentP = visitorEl.parentElement;
          if (parentP) {
            parentP.onclick = (e) => {
              try {
                if (e.target === visitorEl || (e.target.parentElement && e.target.parentElement === parentP)) {
                  const newCount = prompt('修改访客总量:', visitorCount);
                  if (newCount !== null && !isNaN(newCount)) {
                    const countVal = parseInt(newCount);
                    visitorEl.textContent = countVal;
                    
                    // 更新所有存储位置
                    if (window.AppState && window.AppState.user) {
                      window.AppState.user.visitorCount = countVal;
                    }
                    
                    try {
                      let cachedState = JSON.parse(localStorage.getItem('cachedAppState') || '{}');
                      if (!cachedState.user) cachedState.user = {};
                      cachedState.user.visitorCount = countVal;
                      localStorage.setItem('cachedAppState', JSON.stringify(cachedState));
                      
                      let shupianjState = JSON.parse(localStorage.getItem('shupianjAppState') || '{}');
                      if (!shupianjState.user) shupianjState.user = {};
                      shupianjState.user.visitorCount = countVal;
                      localStorage.setItem('shupianjAppState', JSON.stringify(shupianjState));
                    } catch (e) {
                      console.log('保存访客总量出错:', e.message);
                    }
                    
                    // 调用主应用的saveToStorage确保完整保存
                    if (typeof window.saveToStorage === 'function') {
                      window.saveToStorage().catch(e => {
                        console.log('主应用saveToStorage失败:', e.message);
                      });
                    }
                  }
                }
              } catch (e) {
                console.log('修改访客总量出错:', e.message);
              }
            };
            parentP.style.cursor = 'pointer';
          }
        }
      } catch (e) {
        console.log('设置访客总量出错:', e.message);
      }
    } catch (e) {
      console.log('initProfileData出错:', e.message);
    }
  }
  
  // 同步昵称到侧边栏
  syncNameToSidebar(name) {
    try {
      if (!name) return;
      
      console.log('syncNameToSidebar called with:', name);
      
      // 0. 同时保存到AppState和localStorage（持久化） - 最重要！
      if (!window.AppState) {
        window.AppState = {};
      }
      if (!window.AppState.user) {
        window.AppState.user = {};
      }
      window.AppState.user.name = name;
      console.log('Updated AppState.user.name');
      
      // 保存到localStorage (同时保存到两个位置以备不时之需)
      try {
        let cachedState = JSON.parse(localStorage.getItem('cachedAppState') || '{}');
        if (!cachedState.user) cachedState.user = {};
        cachedState.user.name = name;
        localStorage.setItem('cachedAppState', JSON.stringify(cachedState));
        console.log('Saved cachedAppState');
        
        let shupianjState = JSON.parse(localStorage.getItem('shupianjAppState') || '{}');
        if (!shupianjState.user) shupianjState.user = {};
        shupianjState.user.name = name;
        localStorage.setItem('shupianjAppState', JSON.stringify(shupianjState));
        console.log('Saved shupianjAppState');
      } catch (e) {
        console.log('保存到localStorage出错:', e.message);
      }
      
      // 调用主应用的saveToStorage确保完整保存
      if (typeof window.saveToStorage === 'function') {
        window.saveToStorage().catch(e => {
          console.log('主应用saveToStorage失败:', e.message);
        });
      }
      
      // 1. 更新侧边栏显示名字
      const displayName = document.getElementById('display-name');
      if (displayName) {
        displayName.textContent = name;
        console.log('Updated #display-name');
      } else {
        console.log('#display-name not found');
      }
      
      // 更新顶部用户名显示
      const userNameEl = document.querySelector('.user-name');
      if (userNameEl) {
        userNameEl.textContent = name;
        console.log('Updated .user-name');
      } else {
        console.log('.user-name not found');
      }
      
      // 2. 更新朋友圈页面的名字
      const profileName = document.getElementById('profileName');
      if (profileName) {
        profileName.textContent = name;
        console.log('Updated #profileName');
      } else {
        console.log('#profileName not found');
      }
    } catch (e) {
      console.log('syncNameToSidebar出错:', e.message);
    }
  }
  
  // 同步头像到侧边栏
  syncAvatarToSidebar(avatarUrl) {
    try {
      if (!avatarUrl) return;
      
      console.log('syncAvatarToSidebar called with:', avatarUrl);
      
      // 0. 同时保存到AppState和localStorage（持久化） - 最重要！
      if (!window.AppState) {
        window.AppState = {};
      }
      if (!window.AppState.user) {
        window.AppState.user = {};
      }
      window.AppState.user.avatar = avatarUrl;
      console.log('Updated AppState.user.avatar');
      
      // 保存到localStorage (同时保存到三个位置)
      try {
        let cachedState = JSON.parse(localStorage.getItem('cachedAppState') || '{}');
        if (!cachedState.user) cachedState.user = {};
        cachedState.user.avatar = avatarUrl;
        localStorage.setItem('cachedAppState', JSON.stringify(cachedState));
        console.log('Saved cachedAppState');
        
        let shupianjState = JSON.parse(localStorage.getItem('shupianjAppState') || '{}');
        if (!shupianjState.user) shupianjState.user = {};
        shupianjState.user.avatar = avatarUrl;
        localStorage.setItem('shupianjAppState', JSON.stringify(shupianjState));
        console.log('Saved shupianjAppState');
      } catch (e) {
        console.log('保存到localStorage出错:', e.message);
      }
      
      // 调用主应用的saveToStorage确保完整保存
      if (typeof window.saveToStorage === 'function') {
        window.saveToStorage().catch(e => {
          console.log('主应用saveToStorage失败:', e.message);
        });
      }
      
      // 1. 立即更新朋友圈页面的头像（大头像）
      const profileAvatar = document.getElementById('profileAvatar');
      if (profileAvatar) {
        profileAvatar.src = avatarUrl;
        console.log('Updated #profileAvatar');
      } else {
        console.log('#profileAvatar not found');
      }
      
      // 2. 立即更新侧边栏卡片头像
      const cardAvatar = document.getElementById('card-avatar');
      if (cardAvatar) {
        // 使用innerHTML方式（与updateUserDisplay保持一致）
        cardAvatar.innerHTML = `<img src="${avatarUrl}" alt="">`;
        console.log('Updated #card-avatar with innerHTML');
      } else {
        console.log('#card-avatar not found');
      }
      
      // 3. 立即更新顶部用户头像
      const userAvatarDisplay = document.getElementById('user-avatar-display');
      if (userAvatarDisplay) {
        // 使用innerHTML方式（与updateUserDisplay保持一致）
        userAvatarDisplay.innerHTML = `<img src="${avatarUrl}" alt="">`;
        console.log('Updated #user-avatar-display with innerHTML');
      } else {
        console.log('#user-avatar-display not found');
      }
    } catch (e) {
      console.log('syncAvatarToSidebar出错:', e.message);
    }
  }

  // 获取应用状态
  getAppState() {
    try {
      // 首先尝试从当前窗口获取AppState（index.html中moments是内嵌的）
      if (window.AppState) {
        return window.AppState;
      }
      // 次级：尝试从父窗口获取AppState
      if (window.parent && window.parent !== window) {
        if (window.parent.AppState) {
          return window.parent.AppState;
        }
      }
      // 尝试从localStorage中获取缓存的AppState
      const cached = localStorage.getItem('cachedAppState');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.log('无法访问AppState:', e.message);
    }
    return null;
  }

  // 获取用户头像
  getUserAvatar() {
    // 优先从侧边栏获取（主窗口的sidebar card-avatar）- 这是用户实际修改的地方
    try {
      let sidebarImg = null;
      
      // 尝试从父窗口获取侧边栏头像
      if (window.parent && window.parent !== window) {
        const cardAvatar = window.parent.document.getElementById('card-avatar');
        if (cardAvatar) {
          sidebarImg = cardAvatar.querySelector('img');
          if (sidebarImg && sidebarImg.src && sidebarImg.src.trim()) {
            return sidebarImg.src;
          }
        }
      }
      
      // 尝试在当前窗口获取
      const cardAvatarCurrent = document.getElementById('card-avatar');
      if (cardAvatarCurrent) {
        sidebarImg = cardAvatarCurrent.querySelector('img');
        if (sidebarImg && sidebarImg.src && sidebarImg.src.trim()) {
          return sidebarImg.src;
        }
      }
    } catch (e) {
      console.log('无法从侧边栏获取头像:', e.message);
    }
    
    // 次级：从profileAvatar获取（朋友圈页面的头像）
    try {
      const profileAvatar = document.getElementById('profileAvatar');
      if (profileAvatar && profileAvatar.src && profileAvatar.src.trim()) {
        return profileAvatar.src;
      }
    } catch (e) {
      console.log('无法获取profileAvatar:', e.message);
    }
    
    // 最后从AppState获取（备选方案）
    try {
      const appState = this.getAppState();
      if (appState && appState.user && appState.user.avatar && appState.user.avatar.trim()) {
        return appState.user.avatar;
      }
    } catch (e) {
      console.log('无法从AppState获取头像:', e.message);
    }
    
    return '';
  }

  // 获取用户名
  getUserName() {
    // 优先从侧边栏获取（主窗口的display-name或user-name） - 这是用户实际设置的名字
    try {
      let displayName = null;
      
      // 尝试从父窗口获取侧边栏昵称
      if (window.parent && window.parent !== window) {
        // 优先尝试display-name
        displayName = window.parent.document.getElementById('display-name');
        if (displayName && displayName.textContent && displayName.textContent.trim()) {
          return displayName.textContent.trim();
        }
        // 尝试user-name
        const userName = window.parent.document.querySelector('.user-name');
        if (userName && userName.textContent && userName.textContent.trim()) {
          return userName.textContent.trim();
        }
      }
      
      // 尝试在当前窗口获取
      displayName = document.getElementById('display-name');
      if (displayName && displayName.textContent && displayName.textContent.trim()) {
        return displayName.textContent.trim();
      }
      
      const userName = document.querySelector('.user-name');
      if (userName && userName.textContent && userName.textContent.trim()) {
        return userName.textContent.trim();
      }
    } catch (e) {
      console.log('无法从侧边栏获取昵称:', e.message);
    }
    
    // 次级：降级到朋友圈的profileName
    try {
      const profileName = document.getElementById('profileName');
      if (profileName && profileName.textContent && profileName.textContent.trim()) {
        return profileName.textContent.trim();
      }
    } catch (e) {
      console.log('无法获取profileName:', e.message);
    }
    
    // 最后从AppState获取（备选方案）
    try {
      const appState = this.getAppState();
      if (appState && appState.user && appState.user.name && appState.user.name.trim()) {
        return appState.user.name;
      }
    } catch (e) {
      console.log('无法从AppState获取用户名:', e.message);
    }
    
    return '用户';
  }

  // 保存用户信息到主页面的AppState（用于moments页面修改后同步回主页面）
  saveUserInfoToMainPage(name, avatar) {
    try {
      console.log('saveUserInfoToMainPage called:', { name, avatar });
      
      // 获取主页面的AppState（moments通常是嵌入在index.html中的）
      const mainAppState = window.AppState || (window.parent && window.parent.AppState);
      
      console.log('mainAppState:', mainAppState);
      
      if (mainAppState) {
        if (!mainAppState.user) {
          mainAppState.user = {};
        }
        
        // 修改AppState
        if (name) {
          mainAppState.user.name = name;
          console.log('Updated AppState.user.name:', name);
        }
        if (avatar) {
          mainAppState.user.avatar = avatar;
          console.log('Updated AppState.user.avatar:', avatar);
        }
        
        // 立即保存到cachedAppState（供moments读取）
        try {
          const cachedState = {
            user: mainAppState.user ? {
              name: mainAppState.user.name,
              avatar: mainAppState.user.avatar,
              signature: mainAppState.user.signature,
              bgImage: mainAppState.user.bgImage,
              visitorCount: mainAppState.user.visitorCount
            } : {}
          };
          localStorage.setItem('cachedAppState', JSON.stringify(cachedState));
          console.log('Saved cachedAppState:', cachedState);
        } catch (e) {
          console.log('保存cachedAppState失败:', e.message);
        }
        
        // 立即保存到shupianjAppState（供主页面读取）
        try {
          localStorage.setItem('shupianjAppState', JSON.stringify(mainAppState));
          console.log('Saved shupianjAppState');
        } catch (e) {
          console.log('保存shupianjAppState失败:', e.message);
        }
        
        // 同时更新侧边栏显示（直接更新 DOM）
        if (name) {
          try {
            const displayName = document.getElementById('display-name');
            if (displayName) displayName.textContent = name;
            const userNameEl = document.querySelector('.user-name');
            if (userNameEl) userNameEl.textContent = name;
            console.log('Updated sidebar name to:', name);
          } catch (e) {
            console.log('更新侧边栏名字失败:', e.message);
          }
        }
        if (avatar) {
          try {
            const cardAvatar = document.getElementById('card-avatar');
            if (cardAvatar) {
              const img = cardAvatar.querySelector('img');
              if (img) {
                img.src = avatar;
              } else {
                const newImg = document.createElement('img');
                newImg.src = avatar;
                newImg.alt = '头像';
                newImg.style.width = '100%';
                newImg.style.height = '100%';
                newImg.style.objectFit = 'cover';
                cardAvatar.appendChild(newImg);
              }
            }
            const userAvatarDisplay = document.getElementById('user-avatar-display');
            if (userAvatarDisplay) {
              const img = userAvatarDisplay.querySelector('img');
              if (img) {
                img.src = avatar;
              } else {
                const newImg = document.createElement('img');
                newImg.src = avatar;
                newImg.alt = '用户头像';
                newImg.style.width = '100%';
                newImg.style.height = '100%';
                newImg.style.objectFit = 'cover';
                userAvatarDisplay.appendChild(newImg);
              }
            }
            console.log('Updated sidebar avatar to:', avatar);
          } catch (e) {
            console.log('更新侧边栏头像失败:', e.message);
          }
        }
        
        // 调用异步saveToStorage（非阻塞式）
        if (typeof window.saveToStorage === 'function') {
          window.saveToStorage().catch(e => {
            console.log('主页面saveToStorage失败:', e.message);
          });
        }
      }
    } catch (e) {
      console.log('保存用户信息到主页面出错:', e.message);
    }
  }

  // 获取好友分组
  getFriendGroups() {
    try {
      const appState = this.getAppState();
      if (appState && appState.friendGroups && Array.isArray(appState.friendGroups)) {
        // 确保返回的是最新数据的引用
        return appState.friendGroups;
      }
    } catch (e) {
      console.log('获取friendGroups出错:', e.message);
    }
    
    // 备选方案
    return [
      { id: 'group_default', name: '默认分组', memberIds: [] }
    ];
  }

  // 获取好友列表
  getFriends() {
    try {
      const appState = this.getAppState();
      if (appState && appState.friends && Array.isArray(appState.friends)) {
        // 确保返回的是最新数据的引用
        return appState.friends;
      }
    } catch (e) {
      console.log('获取friends出错:', e.message);
    }
    
    return [];
  }

  // 新增朋友圈
  addMoment(data) {
    const moment = {
      id: 'moment_' + Date.now(),
      author: data.author || this.getUserName(),
      authorAvatar: data.authorAvatar || this.getUserAvatar(),
      content: data.content || '',
      images: data.images || [],
      visibility: data.visibility || 'group_all', // 可见范围
      isUserPost: data.isUserPost !== false,
      createdAt: new Date().toISOString(),
      likes: 0,
      liked: false
    };

    this.moments.unshift(moment); // 最新的在前面
    this.comments[moment.id] = [];
    this.saveToStorage();

    // 如果启用自动回复，调用API生成评论
    if (this.autoReplyEnabled && !data.isUserPost) {
      this.generateCommentsForMoment(moment.id);
    }

    return moment;
  }

  // 获取特定朋友圈的评论
  getMomentComments(momentId) {
    return this.comments[momentId] || [];
  }

  // 添加评论
  addComment(momentId, commentData) {
    if (!this.comments[momentId]) {
      this.comments[momentId] = [];
    }

    const comment = {
      id: 'comment_' + Date.now(),
      momentId: momentId,
      author: commentData.author || this.getUserName(),
      authorAvatar: commentData.authorAvatar || this.getUserAvatar(),
      content: commentData.content,
      isUserComment: commentData.isUserComment !== false,
      createdAt: new Date().toISOString(),
      replies: []
    };

    this.comments[momentId].push(comment);
    this.saveToStorage();

    // 如果不是用户的评论，可能需要生成回复
    if (this.autoReplyEnabled && commentData.isUserComment) {
      this.generateReplyForComment(momentId, comment.id);
    }

    return comment;
  }

  // 为评论添加回复
  addReply(momentId, commentId, replyData) {
    const comments = this.comments[momentId];
    if (!comments) return null;

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return null;

    const reply = {
      id: 'reply_' + Date.now(),
      author: replyData.author || this.getUserName(),
      authorAvatar: replyData.authorAvatar || this.getUserAvatar(),
      content: replyData.content,
      isUserReply: replyData.isUserReply !== false,
      createdAt: new Date().toISOString()
    };

    comment.replies.push(reply);
    this.saveToStorage();

    return reply;
  }

  // 调用API生成朋友圈评论
  async generateCommentsForMoment(momentId) {
    try {
      const moment = this.moments.find(m => m.id === momentId);
      if (!moment) return;

      const appState = this.getAppState();
      if (!appState || !appState.apiSettings) return;

      const friends = this.getFriends();
      if (friends.length === 0) return;

      // 获取可见范围内的好友
      const visibleFriends = friends; // 简化处理，实际应该根据visibility过滤

      // 为每个好友生成评论
      for (let friend of visibleFriends.slice(0, 3)) { // 最多生成3条评论
        // 这里应该调用真实的API
        const comment = this.generateCommentWithAI(friend, moment);
        
        if (!this.comments[momentId]) {
          this.comments[momentId] = [];
        }
        this.comments[momentId].push(comment);
        
        // 延迟添加以模拟真实的网络延迟
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      this.saveToStorage();
      this.renderMoments();
    } catch (error) {
      console.error('生成评论失败:', error);
    }
  }

  // AI生成评论（这里应该替换为真实的API调用）
  generateCommentWithAI(friend, moment) {
    return {
      id: 'comment_' + Date.now() + Math.random(),
      momentId: moment.id,
      author: friend.name || '朋友',
      authorAvatar: friend.avatar || '',
      content: this.generateRandomComment(moment.content),
      isUserComment: false,
      createdAt: new Date().toISOString(),
      replies: []
    };
  }

  // 替代为真实API的伪代码示例
  /*
  async generateCommentWithAPI(friend, moment) {
    const response = await fetch(appState.apiSettings.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${appState.apiSettings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: appState.apiSettings.selectedModel,
        prompt: `角色${friend.name}对朋友圈"${moment.content}"的回应（5-20字）：`,
        max_tokens: 50
      })
    });
    const data = await response.json();
    return {
      // ... 使用API返回的内容构建评论对象
    };
  }
  */

  // 为用户的评论生成AI回复
  async generateReplyForComment(momentId, commentId) {
    try {
      const moment = this.moments.find(m => m.id === momentId);
      if (!moment || !moment.author) return;

      const comments = this.comments[momentId];
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      // 找到发送该朋友圈的好友信息
      const friend = this.getFriends().find(f => f.name === moment.author);
      if (!friend) return;

      const reply = {
        id: 'reply_' + Date.now(),
        author: moment.author,
        authorAvatar: moment.authorAvatar,
        content: this.generateRandomReply(comment.content),
        isUserReply: false,
        createdAt: new Date().toISOString()
      };

      comment.replies.push(reply);
      this.saveToStorage();
      this.renderMoments();
    } catch (error) {
      console.error('生成回复失败:', error);
    }
  }

  // 生成随机评论（简化版，实际应调用API）
  generateRandomComment(momentContent) {
    const comments = [
      '😂哈哈，我也是这样的！',
      '好羡慕呀，什么时候一起去？',
      '赞赞赞👍👍👍',
      '太棒了！',
      '同感同感！',
      '开心就好！',
      '嗯嗯，我支持你！',
      '这个我也喜欢！'
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }

  // 生成随机回复
  generateRandomReply(commentContent) {
    const replies = [
      '谢谢你呀！😊',
      '一起呀，约好了！',
      '哈哈，你也来吧！',
      '谢谢支持！',
      '对对对，就是这样！',
      '我也是呢！',
      '改天约！'
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // 删除朋友圈 (内部方法，由确认弹窗调用)
  deleteMoment(momentId) {
    this.moments = this.moments.filter(m => m.id !== momentId);
    delete this.comments[momentId];
    this.saveToStorage();
  }

  // 删除评论
  deleteComment(momentId, commentId) {
    if (this.comments[momentId]) {
      this.comments[momentId] = this.comments[momentId].filter(
        c => c.id !== commentId
      );
      this.saveToStorage();
    }
  }

  // 添加通知
  addNotification(data) {
    const notification = {
      id: 'notif_' + Date.now(),
      type: data.type || 'comment', // comment, reply, like
      from: data.from,
      fromAvatar: data.fromAvatar,
      content: data.content,
      momentId: data.momentId,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    this.notifications.unshift(notification);
    this.saveToStorage();

    return notification;
  }

  // 获取未读通知
  getUnreadNotifications() {
    return this.notifications.filter(n => !n.isRead);
  }

  // 标记通知为已读
  markNotificationAsRead(notificationId) {
    const notif = this.notifications.find(n => n.id === notificationId);
    if (notif) {
      notif.isRead = true;
      this.saveToStorage();
    }
  }

  // 渲染朋友圈列表
  renderMoments() {
    try {
      const feedList = document.getElementById('feedList');
      if (!feedList) return;

      feedList.innerHTML = '';

      // 获取用户头像（用于评论框），禁用默认值
      let userAvatarUrl = '';
      try {
        userAvatarUrl = this.getUserAvatar() || '';
      } catch (e) {
        console.log('获取用户头像失败:', e.message);
        userAvatarUrl = '';
      }

      this.moments.forEach(moment => {
        try {
          const feedItem = document.createElement('div');
          feedItem.className = 'feed-item';
          feedItem.id = 'moment_' + moment.id;

          // 头部
          const header = document.createElement('div');
          header.className = 'feed-header';
          const authorAvatar = moment.authorAvatar || '';
          const avatarHTML = authorAvatar ? `<img src="${authorAvatar}" class="feed-avatar" alt="头像">` : '';
          header.innerHTML = `
            ${avatarHTML}
            <div class="feed-user-info">
              <span class="feed-username">${moment.author || '未知用户'}</span>
            </div>
            <button class="feed-delete-btn" onclick="showDeleteConfirm('${moment.id}')" title="删除此朋友圈">×</button>
          `;

          // 内容
          const content = document.createElement('div');
          content.className = 'feed-content';
          content.textContent = moment.content || '';

          // 图片
          let imagesHTML = '';
          if (moment.images && moment.images.length > 0) {
            imagesHTML = `<div class="feed-images">
              ${moment.images.map(img => `<img src="${img}" alt="图片" onclick="viewImage(this.src)">`).join('')}
            </div>`;
          }

          // 操作按钮和时间
          const time = this.formatTime(moment.createdAt);
          const actions = document.createElement('div');
          actions.className = 'feed-actions';
          actions.innerHTML = `
            <span class="feed-time">${time}</span>
            <div style="display: flex; gap: 2px; margin-left: auto;">
              <button class="action-btn" onclick="momentsManager.toggleLike('${moment.id}')">
                ${moment.liked ? '❤️ ' : ''}点赞
              </button>
              <button class="action-btn" onclick="openCommentModal('${moment.id}')">评论</button>
              <button class="action-btn" onclick="forwardMoment('${moment.id}')">转发</button>
            </div>
          `;

          // 评论输入框
          const commentInput = document.createElement('div');
          commentInput.className = 'comment-input';
          const avatarImg = userAvatarUrl ? `<img src="${userAvatarUrl}" class="comment-avatar" alt="头像">` : '';
          commentInput.innerHTML = `
            ${avatarImg}
            <input type="text" placeholder="说点什么吧..." 
                   onkeypress="if(event.key==='Enter') submitMomentComment('${moment.id}', this.value)">
          `;

          // 评论区
          const commentsSection = document.createElement('div');
          commentsSection.className = 'comments-section';
          try {
            const momentComments = this.getMomentComments(moment.id) || [];
            momentComments.forEach(comment => {
              try {
                const commentItem = document.createElement('div');
                commentItem.className = 'comment-item';
                const authorName = (comment && comment.author) || '未知用户';
                const commentContent = (comment && comment.content) || '';
                commentItem.innerHTML = `
                  <div class="comment-header">
                    <div>
                      <span class="comment-user">${authorName}</span>
                      <span style="color: #666;">: ${commentContent}</span>
                      ${comment && comment.isUserComment ? `<button class="comment-delete-btn" onclick="momentsManager.deleteComment('${moment.id}', '${comment.id}'); momentsManager.renderMoments();">×</button>` : ''}
                    </div>
                  </div>
                  ${this.renderReplies(comment.replies)}
                `;

                if (comment.replies && comment.replies.length > 0) {
                  const repliesHTML = comment.replies.map(reply => `
                    <div class="reply-item">
                      <div class="reply-header">
                        <span class="reply-user">${reply.author || '未知用户'}</span>
                        <span style="color: #666;">: ${reply.content || ''}</span>
                      </div>
                    </div>
                  `).join('');
                  commentItem.innerHTML += repliesHTML;
                }

                commentsSection.appendChild(commentItem);
              } catch (e) {
                console.log('渲染单个评论时出错:', e.message);
              }
            });
          } catch (e) {
            console.log('获取评论列表出错:', e.message);
          }

          feedItem.appendChild(header);
          feedItem.appendChild(content);
          if (imagesHTML) {
            feedItem.innerHTML += imagesHTML;
          }
          feedItem.appendChild(actions);
          feedItem.appendChild(commentInput);
          feedItem.appendChild(commentsSection);

          feedList.appendChild(feedItem);
        } catch (e) {
          console.log('渲染单个朋友圈项时出错:', e.message);
        }
      });
    } catch (e) {
      console.log('renderMoments出错:', e.message);
    }
  }

  // 渲染回复
  renderReplies(replies) {
    if (!replies || replies.length === 0) return '';
    return replies.map(reply => `
      <div class="reply-item">
        <div class="reply-header">
          <span class="reply-user">${reply.author}</span>
          <span style="color: #666;">: ${reply.content}</span>
        </div>
      </div>
    `).join('');
  }

  // 格式化时间
  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return date.toLocaleDateString('zh-CN');
  }

  // 切换点赞
  toggleLike(momentId) {
    const moment = this.moments.find(m => m.id === momentId);
    if (moment) {
      moment.liked = !moment.liked;
      if (moment.liked) {
        moment.likes = (moment.likes || 0) + 1;
      } else {
        moment.likes = Math.max((moment.likes || 0) - 1, 0);
      }
      this.saveToStorage();
      this.renderMoments();
    }
  }
}

// 全局实例
let momentsManager = new MomentsManager();

// ====== 页面初始化 ======
// 支持加载完成时自动初始化
function initMomentsPage() {
  if (!checkMomentsPageReady()) {
    console.log('等待moments页面加载完成...');
    setTimeout(initMomentsPage, 100);
    return;
  }

  momentsPageReady = true;
  initializePage();
}

// 在DOMContentLoaded和可选的直接调用时运行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    initMomentsPage();
  });
} else {
  // 文档已加载
  initMomentsPage();
}

// 同时允许手动调用
setTimeout(() => {
  if (!momentsPageReady) {
    initMomentsPage();
  }
}, 500);

function initializePage() {
  // 返回按钮（如果存在）
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      window.history.back();
    });
  }

  // 通知按钮（如果存在）
  const notificationBtn = document.getElementById('notificationBtn');
  if (notificationBtn) {
    notificationBtn.addEventListener('click', function () {
      showNotifications();
    });
  }

  // 设置按钮（如果存在）
  const settingBtn = document.getElementById('settingBtn');
  if (settingBtn) {
    settingBtn.addEventListener('click', function () {
      const bgFileInput = document.getElementById('bgFileInput');
      if (bgFileInput) {
        bgFileInput.click();
      }
    });
  }

  // 功能导航 - 为各个标签页添加点击事件
  const momentsBtn = document.querySelector('[data-tab="moments"]');
  if (momentsBtn) {
    momentsBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openMomentDialog();
    });
  }

  const logBtn = document.querySelector('[data-tab="log"]');
  if (logBtn) {
    logBtn.addEventListener('click', function (e) {
      e.preventDefault();
      console.log('切换到日志');
    });
  }

  const photosBtn = document.querySelector('[data-tab="photos"]');
  if (photosBtn) {
    photosBtn.addEventListener('click', function (e) {
      e.preventDefault();
      console.log('切换到相册');
    });
  }

  const messageBtn = document.querySelector('[data-tab="message"]');
  if (messageBtn) {
    messageBtn.addEventListener('click', function (e) {
      e.preventDefault();
      console.log('切换到留言');
    });
  }

  // 更多按钮
  const moreBtn = document.querySelector('[data-tab="more"]');
  if (moreBtn) {
    moreBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openMoreModal();
    });
  }

  // 初始化好友分组选择
  initGroupSelect();

  // 初始化好友选择
  initCharacterSelect();

  // 初始化个人信息（确保头像和昵称正确显示）
  momentsManager.initProfileData();

  // 初始化朋友圈列表
  momentsManager.renderMoments();

  // 同步头像变化监听（如果有外部修改）
  monitorAvatarChanges();
  
  // 监听好友和分组数据变化，实时更新选择框
  monitorFriendsAndGroupsChanges();
}

// ====== 好友和分组实时同步监听 ======
function monitorFriendsAndGroupsChanges() {
  let lastFriendsJSON = JSON.stringify(momentsManager.getFriends());
  let lastGroupsJSON = JSON.stringify(momentsManager.getFriendGroups());
  
  // 每500ms检查一次是否有数据变化
  setInterval(function() {
    try {
      const currentFriendsJSON = JSON.stringify(momentsManager.getFriends());
      const currentGroupsJSON = JSON.stringify(momentsManager.getFriendGroups());
      
      // 如果好友数据有变化，重新初始化好友选择框
      if (currentFriendsJSON !== lastFriendsJSON) {
        console.log('检测到好友数据变化，更新好友选择框');
        lastFriendsJSON = currentFriendsJSON;
        
        try {
          initCharacterSelect();
        } catch (e) {
          console.log('更新好友选择框出错:', e.message);
        }
        
        // 如果有已发布的朋友圈，也重新渲染（确保角色列表最新）
        try {
          momentsManager.renderMoments();
        } catch (e) {
          console.log('重新渲染朋友圈出错:', e.message);
        }
      }
      
      // 如果分组数据有变化，重新初始化分组选择框
      if (currentGroupsJSON !== lastGroupsJSON) {
        console.log('检测到分组数据变化，更新分组选择框');
        lastGroupsJSON = currentGroupsJSON;
        
        try {
          initGroupSelect();
        } catch (e) {
          console.log('更新分组选择框出错:', e.message);
        }
      }
    } catch (e) {
      console.log('监听好友和分组变化时出错:', e.message);
    }
  }, 500);
}

// ====== 模态框相关函数 ======

function openMomentDialog() {
  try {
    // 打开朋友圈对话框前，重新加载好友分组
    initGroupSelect();
    const momentModal = document.getElementById('momentModal');
    if (momentModal) {
      momentModal.classList.add('show');
    }
  } catch (e) {
    console.log('openMomentDialog出错:', e.message);
  }
}

function closeMomentDialog() {
  try {
    const momentModal = document.getElementById('momentModal');
    if (momentModal) {
      momentModal.classList.remove('show');
    }
    
    const momentText = document.getElementById('momentText');
    if (momentText) {
      momentText.value = '';
    }
    
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
      imagePreview.innerHTML = '';
    }
    
    const momentInput = document.getElementById('momentInput');
    if (momentInput) {
      momentInput.value = '';
    }
  } catch (e) {
    console.log('closeMomentDialog出错:', e.message);
  }
}

function openCommentModal(momentId) {
  try {
    const modal = document.getElementById('commentModal');
    const commentThread = document.getElementById('commentThread');
    
    if (!modal || !commentThread) {
      console.log('无法找到评论对话框');
      return;
    }

    // 显示该朋友圈的所有评论
    const comments = momentsManager.getMomentComments(momentId) || [];
    commentThread.innerHTML = '';

    comments.forEach(comment => {
      try {
        if (!comment) return;
        
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        const authorName = (comment && comment.author) || '未知用户';
        const commentContent = (comment && comment.content) || '';
        commentDiv.innerHTML = `
          <div class="comment-header">
            <span class="comment-user">${authorName}</span>
            <span style="color: #666;">: ${commentContent}</span>
          </div>
          ${momentsManager.renderReplies(comment.replies)}
        `;
        commentThread.appendChild(commentDiv);
      } catch (e) {
        console.log('处理单个评论出错:', e.message);
      }
    });

    // 保存momentId以便提交时使用
    modal.dataset.momentId = momentId;
    modal.classList.add('show');
  } catch (e) {
    console.log('openCommentModal出错:', e.message);
  }
}

function closeCommentModal() {
  try {
    const commentModal = document.getElementById('commentModal');
    if (commentModal) {
      commentModal.classList.remove('show');
    }
    
    const commentInputText = document.getElementById('commentInputText');
    if (commentInputText) {
      commentInputText.value = '';
    }
  } catch (e) {
    console.log('closeCommentModal出错:', e.message);
  }
}

function openNotificationModal() {
  showNotifications();
}

function closeNotificationModal() {
  try {
    const notificationModal = document.getElementById('notificationModal');
    if (notificationModal) {
      notificationModal.classList.remove('show');
    }
  } catch (e) {
    console.log('closeNotificationModal出错:', e.message);
  }
}

function openMoreModal() {
  try {
    const moreModal = document.getElementById('moreModal');
    if (moreModal) {
      moreModal.classList.add('show');
    }
  } catch (e) {
    console.log('openMoreModal出错:', e.message);
  }
}

function closeMoreModal() {
  try {
    const moreModal = document.getElementById('moreModal');
    if (moreModal) {
      moreModal.classList.remove('show');
    }
  } catch (e) {
    console.log('closeMoreModal出错:', e.message);
  }
}

function openCharacterMomentsDialog() {
  try {
    // 打开角色朋友圈对话框前，重新加载好友列表
    initCharacterSelect();
    const characterMomentsModal = document.getElementById('characterMomentsModal');
    if (characterMomentsModal) {
      characterMomentsModal.classList.add('show');
    }
  } catch (e) {
    console.log('openCharacterMomentsDialog出错:', e.message);
  }
}

function closeCharacterMomentsDialog() {
  try {
    const characterMomentsModal = document.getElementById('characterMomentsModal');
    if (characterMomentsModal) {
      characterMomentsModal.classList.remove('show');
    }
  } catch (e) {
    console.log('closeCharacterMomentsDialog出错:', e.message);
  }
}

function openAutoMomentsDialog() {
  try {
    const autoMomentsModal = document.getElementById('autoMomentsModal');
    if (autoMomentsModal) {
      autoMomentsModal.classList.add('show');
    }
    
    // 加载当前设置
    const autoInterval = document.getElementById('autoInterval');
    if (autoInterval) {
      autoInterval.value = momentsManager.autoSettings.interval;
    }
    
    const autoRandomCount = document.getElementById('autoRandomCount');
    if (autoRandomCount) {
      autoRandomCount.value = momentsManager.autoSettings.count;
    }
    
    const autoEnabled = document.getElementById('autoEnabled');
    if (autoEnabled) {
      autoEnabled.checked = momentsManager.autoSettings.enabled;
    }
  } catch (e) {
    console.log('openAutoMomentsDialog出错:', e.message);
  }
}

function closeAutoMomentsDialog() {
  try {
    const autoMomentsModal = document.getElementById('autoMomentsModal');
    if (autoMomentsModal) {
      autoMomentsModal.classList.remove('show');
    }
  } catch (e) {
    console.log('closeAutoMomentsDialog出错:', e.message);
  }
}

function openAutoReplyDialog() {
  try {
    const autoReplyModal = document.getElementById('autoReplyModal');
    if (autoReplyModal) {
      autoReplyModal.classList.add('show');
    }
    
    const autoReplyEnabled = document.getElementById('autoReplyEnabled');
    if (autoReplyEnabled) {
      autoReplyEnabled.checked = momentsManager.autoReplyEnabled;
    }
  } catch (e) {
    console.log('openAutoReplyDialog出错:', e.message);
  }
}

function closeAutoReplyDialog() {
  try {
    const autoReplyModal = document.getElementById('autoReplyModal');
    if (autoReplyModal) {
      autoReplyModal.classList.remove('show');
    }
  } catch (e) {
    console.log('closeAutoReplyDialog出错:', e.message);
  }
}

// ====== 朋友圈发布相关 ======

function handleImageSelect(input) {
  try {
    if (!input || !input.files) return;
    
    const files = Array.from(input.files);
    const preview = document.getElementById('imagePreview');
    if (!preview) {
      console.log('无法找到图片预览容器');
      return;
    }

    files.forEach((file, index) => {
      try {
        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            if (!e.target || !e.target.result) return;
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.position = 'relative';

            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.display = 'inline-block';
            container.appendChild(img);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '×';
            removeBtn.onclick = function (e) {
              try {
                e.preventDefault();
                e.stopPropagation();
                container.remove();
              } catch (e) {
                console.log('删除图片出错:', e.message);
              }
            };
            container.appendChild(removeBtn);

            preview.appendChild(container);
          } catch (e) {
            console.log('处理图片加载出错:', e.message);
          }
        };
        reader.readAsDataURL(file);
      } catch (e) {
        console.log('读取文件出错:', e.message);
      }
    });
  } catch (e) {
    console.log('handleImageSelect出错:', e.message);
  }
}

function publishMoment() {
  try {
    const momentTextEl = document.getElementById('momentText');
    if (!momentTextEl) {
      console.log('无法找到朋友圈文字输入框');
      return;
    }
    
    const text = momentTextEl.value.trim();
    
    const imagePreview = document.getElementById('imagePreview');
    let images = [];
    if (imagePreview) {
      images = Array.from(imagePreview.querySelectorAll('img')).map(img => img.src || '');
    }
    
    const groupSelect = document.getElementById('groupSelect');
    const groupId = groupSelect ? groupSelect.value : 'group_all';

    if (!text && images.length === 0) {
      alert('请输入文字或选择图片');
      return;
    }

    // 获取侧边栏的用户信息 - 直接从getUserName和getUserAvatar读取
    let userName = momentsManager.getUserName() || '用户';
    let userAvatar = momentsManager.getUserAvatar() || '';

    // 发布前：同步用户信息到localStorage（确保持久化）
    momentsManager.syncNameToSidebar(userName);
    if (userAvatar) {
      momentsManager.syncAvatarToSidebar(userAvatar);
    }

    // 创建朋友圈 - 用户发的朋友圈使用侧边栏的头像和昵称
    momentsManager.addMoment({
      author: userName,
      authorAvatar: userAvatar,
      content: text,
      images: images,
      visibility: groupId,
      isUserPost: true
    });
    
    // 刷新显示
    momentsManager.renderMoments();
    closeMomentDialog();

    alert('发布成功！');
  } catch (e) {
    console.log('publishMoment出错:', e.message);
    alert('发布失败');
  }
}

// 提交朋友圈评论
function submitMomentComment(momentId, text) {
  try {
    if (!text || !text.trim()) return;

    momentsManager.addComment(momentId, {
      content: text.trim(),
      isUserComment: true
    });

    momentsManager.renderMoments();

    // 清空输入框
    try {
      const input = document.querySelector(`#moment_${momentId} .comment-input input`);
      if (input) input.value = '';
    } catch (e) {
      console.log('清空输入框出错:', e.message);
    }
  } catch (e) {
    console.log('submitMomentComment出错:', e.message);
  }
}

// 评论对话框提交
function submitComment() {
  try {
    const modal = document.getElementById('commentModal');
    if (!modal || !modal.dataset.momentId) {
      console.log('无法获取评论对话框或moment ID');
      return;
    }
    
    const momentId = modal.dataset.momentId;
    const commentInputText = document.getElementById('commentInputText');
    if (!commentInputText) {
      console.log('无法获取评论输入框');
      return;
    }
    
    const text = commentInputText.value.trim();
    if (!text) return;

    momentsManager.addComment(momentId, {
      content: text,
      isUserComment: true
    });

    momentsManager.renderMoments();
    closeCommentModal();
  } catch (e) {
    console.log('submitComment出错:', e.message);
  }
}

// ====== 转发功能 ======
function forwardMoment(momentId) {
  try {
    if (!momentId) return;
    
    const moment = momentsManager.moments.find(m => m && m.id === momentId);
    if (!moment) {
      console.log('无法找到该朋友圈');
      alert('无法找到该朋友圈');
      return;
    }

    // 获取消息页面的对话列表（加入的角色）
    let conversations = [];
    
    console.log('=== 开始获取 conversations ===');
    
    try {
      // 方法1: 首先尝试从 window.AppState 获取（实时数据）
      if (window.AppState && window.AppState.conversations && Array.isArray(window.AppState.conversations)) {
        conversations = window.AppState.conversations;
        console.log('✓ 方法1 从 window.AppState 获取 conversations:', conversations.length, '个');
      }
      
      // 方法2: 尝试从 localStorage 的 shupianjAppState 获取
      if (!conversations || conversations.length === 0) {
        const savedState = localStorage.getItem('shupianjAppState');
        if (savedState) {
          try {
            const appState = JSON.parse(savedState);
            if (appState.conversations && Array.isArray(appState.conversations)) {
              conversations = appState.conversations;
              console.log('✓ 方法2 从 localStorage shupianjAppState 获取 conversations:', conversations.length, '个');
            }
          } catch (e) {
            console.log('✗ 方法2 解析 localStorage 失败:', e.message);
          }
        }
      }
      
      // 方法3: 尝试从 IndexDB 加载的数据获取
      if (!conversations || conversations.length === 0) {
        console.log('✓ 方法3 尝试从主窗口 DOM 提取对话信息');
        let msgList = document.getElementById('msg-list');
        if (!msgList && window.parent && window.parent !== window) {
          try {
            msgList = window.parent.document.getElementById('msg-list');
          } catch (e) {
            console.log('  无法访问父窗口 DOM');
          }
        }
        
        if (msgList && msgList.children && msgList.children.length > 0) {
          conversations = Array.from(msgList.children).map((item, index) => {
            const convId = item.dataset.convId || item.dataset.id || `conv_${index}`;
            let convName = '';
            const nameEl = item.querySelector('[data-role-name], .conversation-name, .msg-name, .role-name');
            if (nameEl) {
              convName = nameEl.textContent.trim();
            } else {
              const textEls = item.querySelectorAll('*');
              for (let el of textEls) {
                if (el.childNodes.length > 0 && el.childNodes[0].nodeType === 3) {
                  const text = el.textContent.trim();
                  if (text && text.length > 0 && text.length < 20) {
                    convName = text;
                    break;
                  }
                }
              }
            }
            
            if (!convName) {
              convName = `角色${index + 1}`;
            }
            
            return {
              id: convId,
              name: convName,
              messages: []
            };
          });
          
          if (conversations.length > 0) {
            console.log('✓ 方法3 从页面 DOM 获取 conversations:', conversations.length, '个');
          }
        }
      }
    } catch (e) {
      console.log('获取conversations出错:', e.message);
    }
    
    console.log('=== 最终结果 ===');
    console.log('最终获取的 conversations 数量:', conversations.length);
    
    if (!conversations || conversations.length === 0) {
      alert('没有加入的角色可以转发。请先在消息页面加入一些角色，然后重新尝试。\n\n提示：可以在消息页面点击"+"按钮添加新的对话角色。');
      return;
    }

    // 创建美观的转发选择对话框
    showForwardDialog(conversations, moment);
  } catch (e) {
    console.log('forwardMoment 执行出错:', e.message);
    alert('转发失败: ' + e.message);
  }
}

// 显示转发选择对话框（美观的 UI）
function showForwardDialog(conversations, moment) {
  // 创建对话框遮罩层
  const backdrop = document.createElement('div');
  backdrop.className = 'forward-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9998;
    display: flex;
    align-items: flex-end;
  `;

  // 创建对话框容器
  const dialog = document.createElement('div');
  dialog.className = 'forward-dialog';
  dialog.style.cssText = `
    background: #fff;
    border-radius: 16px 16px 0 0;
    width: 100%;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease-out;
  `;

  // 添加动画
  const style = document.createElement('style');
  if (!document.getElementById('forward-dialog-styles')) {
    style.id = 'forward-dialog-styles';
    style.textContent = `
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes slideDown {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(100%);
          opacity: 0;
        }
      }

      .forward-dialog.closing {
        animation: slideDown 0.3s ease-in forwards;
      }

      .forward-dialog-header {
        padding: 16px;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .forward-dialog-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }

      .forward-dialog-close {
        font-size: 24px;
        color: #999;
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
      }

      .forward-dialog-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px 0;
      }

      .forward-dialog-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
        transition: background 0.2s;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
      }

      .forward-dialog-item:hover {
        background: #f5f5f5;
      }

      .forward-dialog-item-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        margin-right: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        color: #fff;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        flex-shrink: 0;
      }

      .forward-dialog-item-info {
        flex: 1;
      }

      .forward-dialog-item-name {
        font-size: 14px;
        font-weight: 500;
        color: #333;
        margin-bottom: 4px;
      }

      .forward-dialog-item-status {
        font-size: 12px;
        color: #999;
      }

      .forward-preview {
        padding: 16px;
        background: #f9f9f9;
        border-top: 1px solid #f0f0f0;
      }

      .forward-preview-title {
        font-size: 12px;
        color: #999;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .forward-preview-card {
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 8px;
      }

      .forward-preview-author {
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
      }

      .forward-preview-content {
        font-size: 13px;
        color: #333;
        line-height: 1.4;
      }
    `;
    document.head.appendChild(style);
  }

  // 创建头部
  const header = document.createElement('div');
  header.className = 'forward-dialog-header';
  header.innerHTML = `
    <div class="forward-dialog-title">转发给谁</div>
    <button class="forward-dialog-close">×</button>
  `;

  // 创建列表容器
  const listContainer = document.createElement('div');
  listContainer.className = 'forward-dialog-list';

  // 添加对话项
  conversations.forEach((conv, index) => {
    const item = document.createElement('button');
    item.className = 'forward-dialog-item';
    
    // 生成不同的背景颜色（作为默认头像背景）
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a'];
    const bgColor = colors[index % colors.length];
    
    const initials = conv.name.substring(0, 2);
    
    // 如果角色有头像，显示头像图片；否则显示首字母
    const avatarContent = conv.avatar 
      ? `<img src="${conv.avatar}" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
      : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 500; color: #fff;">${initials}</div>`;
    
    item.innerHTML = `
      <div class="forward-dialog-item-avatar" style="background: linear-gradient(135deg, ${bgColor} 0%, ${colors[(index + 1) % colors.length]} 100%);">
        ${avatarContent}
      </div>
      <div class="forward-dialog-item-info">
        <div class="forward-dialog-item-name">${conv.name}</div>
        <div class="forward-dialog-item-status">点击转发</div>
      </div>
    `;
    
    // 使用 addEventListener 而不是 onclick，确保事件能正确绑定
    item.addEventListener('click', (e) => {
      console.log('📲 用户点击了转发按钮:', conv.name);
      console.log('传入的参数:', { conv, moment });
      e.preventDefault();
      e.stopPropagation();
      console.log('准备执行转发函数...');
      try {
        executeForwardMoment(conv, moment);
        console.log('✅ executeForwardMoment 执行完成');
      } catch (err) {
        console.log('❌ executeForwardMoment 执行出错:', err);
      }
      console.log('关闭对话框...');
      closeDialog();
    });
    
    listContainer.appendChild(item);
  });

  // 创建预览部分
  const preview = document.createElement('div');
  preview.className = 'forward-preview';
  preview.innerHTML = `
    <div class="forward-preview-title">转发内容</div>
    <div class="forward-preview-card">
      <div class="forward-preview-author">${moment.author || '用户'}</div>
      <div class="forward-preview-content">${(moment.content || '').substring(0, 100)}${(moment.content || '').length > 100 ? '...' : ''}</div>
    </div>
  `;

  // 组装对话框
  dialog.appendChild(header);
  dialog.appendChild(listContainer);
  dialog.appendChild(preview);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  console.log('✅ 转发对话框已创建并添加到 DOM，包含', conversations.length, '个对话选项');

  // 关闭函数
  function closeDialog() {
    console.log('关闭对话框动画...');
    dialog.classList.add('closing');
    setTimeout(() => {
      backdrop.remove();
      console.log('对话框已从 DOM 中移除');
    }, 300);
  }

  // 关闭按钮事件
  header.querySelector('.forward-dialog-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeDialog();
  });
  
  // 点击遮罩关闭
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeDialog();
    }
  });
}

// 执行转发朋友圈操作
function executeForwardMoment(conversation, moment) {
  try {
    console.log('🔄 开始执行转发朋友圈...');
    console.log('  目标对话:', conversation);
    console.log('  原朋友圈:', moment);
    
    // 从主窗口获取 AppState（确保能写入）
    let appState = window.AppState;
    if (!appState) {
      const savedState = localStorage.getItem('shupianjAppState');
      if (savedState) {
        appState = JSON.parse(savedState);
      }
    }
    
    console.log('📊 当前 AppState:', {
      hasAppState: !!appState,
      hasConversations: !!appState?.conversations,
      conversationCount: appState?.conversations?.length,
      currentChatId: window.AppState?.currentChat?.id
    });
    
    if (appState && appState.conversations) {
      const targetConv = appState.conversations.find(c => c && c.id === conversation.id);
      console.log('🎯 找到目标对话:', {
        found: !!targetConv,
        convName: targetConv?.name,
        convId: targetConv?.id,
        messageCount: targetConv?.messages?.length || 0
      });
      
      if (targetConv) {
        // 创建转发消息对象（带有特殊格式，便于 AI 理解）
        const forwardMessage = {
          id: Date.now().toString(),
          sender: 'user',
          type: 'sent',  // 添加 type 字段
          content: ``,  // 内容为空，卡片会完全处理显示
          timestamp: new Date().toISOString(),
          isUserMessage: true,
          isForward: true,  // ⭐ 标记为转发朋友圈（特殊标记）
          isForwarded: false,  // ⭐ 明确表示不是普通转发消息
          forwardedMoment: {
            id: moment.id,
            author: moment.author || '用户',
            content: moment.content || '',
            images: moment.images || [],
            timestamp: moment.timestamp || ''
          }
        };
        
        console.log('📝 创建的转发消息:', forwardMessage);
        
        // 添加消息到对话
        if (!targetConv.messages) {
          targetConv.messages = [];
        }
        
        targetConv.messages.push(forwardMessage);
        
        console.log('✅ 消息已添加到对话，现在共有', targetConv.messages.length, '条消息');
        
        // 保存到 localStorage 和 IndexDB
        localStorage.setItem('shupianjAppState', JSON.stringify(appState));
        console.log('💾 已保存到 localStorage');
        
        if (window.AppState) {
          window.AppState = appState;
          console.log('🔗 已更新 window.AppState');
        }
        
        // 同时更新 AppState.messages 中的对应对话消息
        if (!window.AppState.messages[conversation.id]) {
          window.AppState.messages[conversation.id] = [];
        }
        window.AppState.messages[conversation.id] = targetConv.messages;
        console.log('📋 已更新 AppState.messages[' + conversation.id + ']');
        
        // 异步保存到 IndexDB
        if (window.saveToIndexDB) {
          window.saveToIndexDB(appState).catch(e => {
            console.log('⚠️ 保存到 IndexDB 失败:', e.message);
          });
        }
        
        console.log('✨ 检查当前打开的对话:');
        console.log('  currentChat:', window.AppState?.currentChat);
        console.log('  currentChat.id:', window.AppState?.currentChat?.id);
        console.log('  conversation.id:', conversation.id);
        console.log('  是否相同:', window.AppState?.currentChat?.id === conversation.id);
        
        // 如果当前打开的是同一对话，刷新消息显示
        if (window.AppState && window.AppState.currentChat && window.AppState.currentChat.id === conversation.id) {
          console.log('✨ 检测到对话已打开，准备刷新显示...');
          
          // 调用 app.js 的渲染函数来更新显示
          if (typeof renderChatMessages === 'function') {
            console.log('🎨 调用 renderChatMessages() 刷新对话...');
            renderChatMessages();
            console.log('✅ 消息显示已刷新');
          } else {
            console.log('⚠️ renderChatMessages 函数不可用');
          }
        } else {
          console.log('ℹ️ 对话未打开或不是当前对话，消息已保存');
          console.log('🔄 自动打开目标对话...');
          
          // 对话未打开，自动打开它
          try {
            // 首先找到目标对话
            if (typeof openChat === 'function') {
              console.log('📱 调用 openChat() 打开对话:', conversation);
              openChat(conversation);
              
              // openChat 会修改 currentChat，我们需要等待 DOM 更新后再刷新消息
              setTimeout(() => {
                if (typeof renderChatMessages === 'function') {
                  console.log('🎨 对话打开后，刷新消息显示...');
                  renderChatMessages();
                  console.log('✅ 消息显示已刷新');
                }
              }, 100);
            } else {
              console.log('⚠️ openChat 函数不可用，消息已保存但需要用户手动打开对话');
            }
          } catch (e) {
            console.log('⚠️ 自动打开对话失败:', e.message);
          }
        }
        
        alert(`✓ 已转发给 ${conversation.name}`);
        console.log('✓ 转发成功:', { 
          target: conversation.name, 
          momentAuthor: moment.author,
          momentContent: moment.content,
          messageId: forwardMessage.id
        });
      } else {
        console.log('❌ 无法找到目标对话');
        alert('无法找到目标角色，请确认该角色仍然存在');
      }
    } else {
      console.log('❌ AppState 或 conversations 不可用');
      alert('无法获取应用状态，转发失败');
    }
  } catch (e) {
    console.log('❌ 执行转发出错:', e.message, e.stack);
    alert('转发时出错: ' + e.message);
  }
}

// ====== 角色发布朋友圈 ======
function publishCharacterMoment() {
  try {
    const characterSelect = document.getElementById('characterSelect');
    if (!characterSelect) {
      console.log('无法找到角色选择框');
      return;
    }
    
    const characterId = characterSelect.value;
    const charMomentType = document.querySelector('input[name="charMomentType"]:checked');
    if (!charMomentType) {
      console.log('无法找到朋友圈类型选择');
      return;
    }
    
    const momentType = charMomentType.value;

    if (!characterId) {
      alert('请选择角色');
      return;
    }

    const friends = momentsManager.getFriends();
    if (!friends || !Array.isArray(friends)) {
      alert('无法加载好友列表');
      return;
    }
    
    const character = friends.find(f => f && f.id === characterId);
    if (!character) {
      alert('该角色不存在');
      return;
    }

    let content = '';
    if (momentType === 'manual') {
      const textEl = document.getElementById('characterMomentText');
      if (!textEl) {
        console.log('无法找到朋友圈内容输入框');
        return;
      }
      
      content = textEl.value.trim();
      if (!content) {
        alert('请输入朋友圈内容');
        return;
      }
    } else {
      // 自动生成
      const charName = (character && character.name) || '未知角色';
      content = `这是 ${charName} 的随机朋友圈 #AI生成`;
    }

    momentsManager.addMoment({
      author: character.name || '未知角色',
      authorAvatar: character.avatar || '',
      content: content,
      isUserPost: false
    });

    momentsManager.renderMoments();
    closeCharacterMomentsDialog();
    alert('发布成功！');
  } catch (e) {
    console.log('publishCharacterMoment出错:', e.message);
    alert('发布失败');
  }
}

// ====== 自动生成朋友圈设置 ======
function saveAutoMomentSettings() {
  try {
    const autoInterval = document.getElementById('autoInterval');
    if (autoInterval) {
      momentsManager.autoSettings.interval = parseInt(autoInterval.value) || 30;
    }
    
    const autoRandomCount = document.getElementById('autoRandomCount');
    if (autoRandomCount) {
      momentsManager.autoSettings.count = parseInt(autoRandomCount.value) || 1;
    }
    
    const autoEnabled = document.getElementById('autoEnabled');
    if (autoEnabled) {
      momentsManager.autoSettings.enabled = autoEnabled.checked;
    }

    momentsManager.saveToStorage();
    closeAutoMomentsDialog();
    alert('设置已保存');
  } catch (e) {
    console.log('saveAutoMomentSettings出错:', e.message);
    alert('设置保存失败');
  }
}

// ====== 自动回复设置 ======
function saveAutoReplySettings() {
  try {
    const autoReplyEnabled = document.getElementById('autoReplyEnabled');
    if (autoReplyEnabled) {
      momentsManager.autoReplyEnabled = autoReplyEnabled.checked;
    }
    
    momentsManager.saveToStorage();
    closeAutoReplyDialog();
    alert('设置已保存');
  } catch (e) {
    console.log('saveAutoReplySettings出错:', e.message);
    alert('设置保存失败');
  }
}

// ====== 通知相关 ======
function showNotifications() {
  try {
    const modal = document.getElementById('notificationModal');
    const list = document.getElementById('notificationList');
    
    if (!modal || !list) {
      console.log('无法找到通知对话框或列表');
      return;
    }

    const notifications = momentsManager.notifications || [];

    if (notifications.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #999;">暂无通知</p>';
    } else {
      list.innerHTML = notifications.map(notif => {
        try {
          const from = (notif && notif.from) || '未知用户';
          const content = (notif && notif.content) || '';
          const time = (notif && momentsManager.formatTime(notif.createdAt)) || '刚刚';
          const unreadClass = (notif && !notif.isRead) ? 'unread' : '';
          
          return `
            <div class="notification-item ${unreadClass}">
              <div class="notification-header">
                <span class="notification-user">${from}</span>
                <span class="notification-time">${time}</span>
              </div>
              <div class="notification-text">${content}</div>
            </div>
          `;
        } catch (e) {
          console.log('处理单个通知出错:', e.message);
          return '';
        }
      }).join('');
    }

    modal.classList.add('show');
  } catch (e) {
    console.log('showNotifications出错:', e.message);
  }
}

// ====== 背景设置 ======
function changeBackground(input) {
  try {
    if (!input || !input.files || !input.files[0]) {
      console.log('未选择文件');
      return;
    }
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function (e) {
      try {
        if (!e.target || !e.target.result) return;
        
        const bgUrl = `url('${e.target.result}')`;
        
        // 设置全局CSS变量
        if (document.documentElement) {
          document.documentElement.style.setProperty('--bg-image', bgUrl);
          document.documentElement.style.setProperty('--bg-color', 'transparent');
        }
        
        // 如果在moments-page中，也设置sub-content的背景
        try {
          const subContent = document.querySelector('#moments-page .sub-content');
          if (subContent) {
            subContent.style.backgroundImage = bgUrl;
            subContent.style.backgroundRepeat = 'no-repeat';
            subContent.style.backgroundPosition = 'center center';
            subContent.style.backgroundSize = 'cover';
            subContent.style.backgroundColor = 'transparent';
          }
        } catch (e) {
          console.log('设置sub-content背景出错:', e.message);
        }
        
        // 也直接修改moments-page中:root的变量
        try {
          const momentsPage = document.getElementById('moments-page');
          if (momentsPage) {
            const style = momentsPage.querySelector('style');
            if (style) {
              // 修改:root变量
              const oldContent = style.textContent || '';
              const newContent = oldContent.replace(/--bg-image:\s*url\([^)]*\)/g, `--bg-image: ${bgUrl}`);
              style.textContent = newContent;
            }
          }
        } catch (e) {
          console.log('修改moments-page样式出错:', e.message);
        }
      } catch (e) {
        console.log('背景加载处理出错:', e.message);
      }
    };
    
    reader.onerror = function (e) {
      console.log('读取背景文件出错:', e.message);
    };
    
    reader.readAsDataURL(file);
  } catch (e) {
    console.log('changeBackground出错:', e.message);
  }
}

// ====== 头像修改 ======
function changeProfileAvatar(input) {
  try {
    if (!input || !input.files || !input.files[0]) {
      console.log('未选择头像文件');
      return;
    }
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function (e) {
      try {
        if (!e.target || !e.target.result) return;
        
        const avatarUrl = e.target.result;
        
        // 更新朋友圈的头像
        try {
          const profileAvatar = document.getElementById('profileAvatar');
          if (profileAvatar) {
            profileAvatar.src = avatarUrl;
          }
        } catch (e) {
          console.log('更新profileAvatar出错:', e.message);
        }
        
        // 同步到侧边栏（这个函数会处理所有的更新）
        try {
          momentsManager.syncAvatarToSidebar(avatarUrl);
        } catch (e) {
          console.log('同步侧边栏出错:', e.message);
        }
        
        // 重新渲染朋友圈列表以更新评论框头像
        try {
          momentsManager.renderMoments();
        } catch (e) {
          console.log('重新渲染朋友圈出错:', e.message);
        }
      } catch (e) {
        console.log('头像加载处理出错:', e.message);
      }
    };
    
    reader.onerror = function (e) {
      console.log('读取头像文件出错:', e.message);
    };
    
    reader.readAsDataURL(file);
  } catch (e) {
    console.log('changeProfileAvatar出错:', e.message);
  }
}

// ====== 工具函数 ======

function initGroupSelect() {
  const select = document.getElementById('groupSelect');
  if (!select) return;
  
  try {
    const groups = momentsManager.getFriendGroups();
    
    if (!groups || groups.length === 0) {
      // 即使没有分组，也显示至少默认分组
      select.innerHTML = `
        <option value="group_all">所有好友</option>
        <option value="group_close">亲密好友</option>
      `;
      return;
    }
    
    select.innerHTML = groups.map(group => {
      if (!group || !group.id) {
        return '';
      }
      return `<option value="${group.id}">${group.name || '未命名'}</option>`;
    }).join('');
  } catch (e) {
    console.log('初始化好友分组出错:', e.message);
    // 降级处理
    select.innerHTML = `
      <option value="group_all">所有好友</option>
      <option value="group_close">亲密好友</option>
    `;
  }
}

function initCharacterSelect() {
  const select = document.getElementById('characterSelect');
  if (!select) return;
  
  try {
    const friends = momentsManager.getFriends();
    
    if (!friends || friends.length === 0) {
      select.innerHTML = '<option value="">暂无好友</option>';
      return;
    }

    select.innerHTML = friends.map(friend => {
      if (!friend || !friend.id) {
        return '';
      }
      return `<option value="${friend.id}">${friend.name || '未命名'}</option>`;
    }).join('');
  } catch (e) {
    console.log('初始化好友列表出错:', e.message);
    // 降级处理
    select.innerHTML = '<option value="">暂无好友</option>';
  }
}

function monitorAvatarChanges() {
  // 每2秒检查一次AppState变化，确保UI与AppState同步
  setInterval(function () {
    try {
      const appState = momentsManager.getAppState();
      if (!appState || !appState.user) return;
      
      const profileAvatar = document.getElementById('profileAvatar');
      const profileName = document.getElementById('profileName');
      const visitorEl = document.getElementById('visitorCount');
      
      // 1. 优先从AppState同步到朋友圈UI
      if (profileAvatar && appState.user.avatar) {
        try {
          if (profileAvatar.src !== appState.user.avatar) {
            profileAvatar.src = appState.user.avatar;
          }
        } catch (e) {
          console.log('更新profileAvatar失败:', e.message);
        }
      }
      
      if (profileName && appState.user.name) {
        try {
          if (profileName.textContent !== appState.user.name) {
            profileName.textContent = appState.user.name;
          }
        } catch (e) {
          console.log('更新profileName失败:', e.message);
        }
      }
      
      if (visitorEl && appState.user.visitorCount !== undefined) {
        try {
          if (visitorEl.textContent !== String(appState.user.visitorCount)) {
            visitorEl.textContent = appState.user.visitorCount;
          }
        } catch (e) {
          console.log('更新visitorCount失败:', e.message);
        }
      }
      
      // 2. 同步侧边栏UI（如果存在）
      const cardAvatar = document.getElementById('card-avatar');
      if (cardAvatar && appState.user.avatar) {
        try {
          const img = cardAvatar.querySelector('img');
          if (!img || (img && img.src !== appState.user.avatar)) {
            cardAvatar.innerHTML = `<img src="${appState.user.avatar}" alt="头像">`;
          }
        } catch (e) {
          console.log('更新cardAvatar失败:', e.message);
        }
      }
      
      const userAvatarDisplay = document.getElementById('user-avatar-display');
      if (userAvatarDisplay && appState.user.avatar) {
        try {
          const img = userAvatarDisplay.querySelector('img');
          if (!img || (img && img.src !== appState.user.avatar)) {
            userAvatarDisplay.innerHTML = `<img src="${appState.user.avatar}" alt="">`;
          }
        } catch (e) {
          console.log('更新userAvatarDisplay失败:', e.message);
        }
      }
      
      const displayName = document.getElementById('display-name');
      if (displayName && appState.user.name) {
        try {
          if (displayName.textContent !== appState.user.name) {
            displayName.textContent = appState.user.name;
          }
        } catch (e) {
          console.log('更新displayName失败:', e.message);
        }
      }
      
      // 3. 反向同步：如果朋友圈的信息被直接修改（如编辑用户名），则更新AppState
      if (profileName && profileName.textContent !== appState.user.name) {
        try {
          appState.user.name = profileName.textContent;
          localStorage.setItem('cachedAppState', JSON.stringify(appState));
        } catch (e) {
          console.log('反向同步AppState失败:', e.message);
        }
      }
      
    } catch (e) {
      console.log('监测头像变化时出错:', e.message);
    }
  }, 2000);
}

function viewImage(src) {
  try {
    if (!src) return;
    
    // 简单的图片查看功能
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    `;

    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      border-radius: 8px;
    `;

    modal.appendChild(img);
    modal.onclick = function (e) {
      try {
        e.stopPropagation();
        if (document.body && modal.parentNode) {
          document.body.removeChild(modal);
        }
      } catch (e) {
        console.log('关闭图片查看器出错:', e.message);
      }
    };

    if (document.body) {
      document.body.appendChild(modal);
    }
  } catch (e) {
    console.log('viewImage出错:', e.message);
  }
}

// 关闭所有模态框的快捷方式
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.show').forEach(modal => {
      modal.classList.remove('show');
    });
  }
});

// 点击模态框背景关闭
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('modal') && e.target.classList.contains('show')) {
    e.target.classList.remove('show');
  }
});
