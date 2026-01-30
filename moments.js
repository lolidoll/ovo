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
    
    // 加载朋友圈独立的个人资料数据
    const profileSaved = localStorage.getItem('momentsProfileData');
    if (profileSaved) {
      try {
        this.profileData = JSON.parse(profileSaved);
      } catch (e) {
        console.error('加载朋友圈个人资料失败:', e);
        this.profileData = {
          name: '薯片机用户',
          avatar: '',
          visitorCount: 0,
          bgImage: ''
        };
      }
    } else {
      this.profileData = {
        name: '薯片机用户',
        avatar: '',
        visitorCount: 0,
        bgImage: ''
      };
    }
    
    // 如果没有bgImage属性，添加默认值
    if (!this.profileData.hasOwnProperty('bgImage')) {
      this.profileData.bgImage = '';
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
    
    // 保存朋友圈独立的个人资料数据
    try {
      localStorage.setItem('momentsProfileData', JSON.stringify(this.profileData));
      console.log('朋友圈个人资料已保存:', this.profileData);
    } catch (e) {
      console.error('保存朋友圈个人资料失败:', e);
    }
  }

  // 初始化个人资料数据（完全独立，不与侧边栏同步）
  initProfileData() {
    try {
      console.log('=== 朋友圈个人资料初始化 ===');
      console.log('独立存储的个人资料:', this.profileData);
      
      // 设置用户名
      const nameEl = document.getElementById('profileName');
      if (nameEl) {
        nameEl.textContent = this.profileData.name;
        nameEl.style.cursor = 'pointer';
        nameEl.title = '点击修改用户名';
        
        // 创建新的元素来替换旧元素，这样可以移除所有事件监听器
        const newNameEl = nameEl.cloneNode(true);
        nameEl.parentNode.replaceChild(newNameEl, nameEl);
        
        // 添加点击事件
        newNameEl.addEventListener('click', () => {
          const newName = prompt('修改朋友圈用户名:', this.profileData.name);
          if (newName && newName.trim()) {
            this.profileData.name = newName.trim();
            newNameEl.textContent = newName.trim();
            this.saveToStorage();
            console.log('朋友圈用户名已更新:', this.profileData.name);
          }
        });
      }
      
      // 设置头像
      const avatarEl = document.getElementById('profileAvatar');
      if (avatarEl) {
        if (this.profileData.avatar) {
          avatarEl.src = this.profileData.avatar;
        }
        avatarEl.style.cursor = 'pointer';
        avatarEl.title = '点击修改头像';
      }
      
      // 设置访客总量
      const visitorEl = document.getElementById('visitorCount');
      if (visitorEl) {
        visitorEl.textContent = this.profileData.visitorCount;
        const parentP = visitorEl.parentElement;
        if (parentP) {
          parentP.style.cursor = 'pointer';
          parentP.title = '点击修改访客总量';
          
          // 创建新的元素来替换旧元素，这样可以移除所有事件监听器
          const newParentP = parentP.cloneNode(true);
          parentP.parentNode.replaceChild(newParentP, parentP);
          
          // 重新获取visitorCount元素（因为父元素已被替换）
          const newVisitorEl = newParentP.querySelector('#visitorCount');
          
          // 添加点击事件
          newParentP.addEventListener('click', () => {
            const newCount = prompt('修改朋友圈访客总量:', this.profileData.visitorCount);
            if (newCount !== null && !isNaN(newCount)) {
              const countVal = parseInt(newCount);
              if (countVal >= 0) {
                this.profileData.visitorCount = countVal;
                newVisitorEl.textContent = countVal;
                this.saveToStorage();
                console.log('朋友圈访客总量已更新:', countVal);
              }
            }
          });
        }
      }
      
      console.log('=== 朋友圈个人资料初始化完成 ===');
    } catch (e) {
      console.error('initProfileData出错:', e);
    }
  }
  
  // 注意：朋友圈个人资料现在完全独立，不再与侧边栏同步

  // 获取应用状态（仅用于获取好友和分组数据）
  getAppState() {
    try {
      // 首先尝试从当前窗口获取AppState
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

  // 获取用户头像（仅从朋友圈独立存储获取）
  getUserAvatar() {
    // 直接从朋友圈独立存储的profileData获取
    return this.profileData.avatar || '';
  }

  // 获取用户名（仅从朋友圈独立存储获取）
  getUserName() {
    // 直接从朋友圈独立存储的profileData获取
    return this.profileData.name || '薯片机用户';
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
      visibility: data.visibility || 'group_all', // 可见范围（分组ID）
      visibilityName: data.visibilityName || '所有好友', // 可见范围名称（用于显示）
      isUserPost: data.isUserPost !== false,
      createdAt: new Date().toISOString(),
      likes: 0,
      liked: false
    };

    this.moments.unshift(moment); // 最新的在前面
    this.comments[moment.id] = [];
    this.saveToStorage();
    
    console.log('✓ 朋友圈已添加到存储');
    console.log('  ID:', moment.id);
    console.log('  可见范围:', moment.visibilityName, `(${moment.visibility})`);

    // 如果启用自动回复，调用API生成评论
    if (this.autoReplyEnabled && data.isUserPost) {
      // 用户发送朋友圈时，触发分组互动系统
      if (typeof MomentsGroupInteraction !== 'undefined') {
        MomentsGroupInteraction.onMomentPublished(moment.id);
      } else {
        // 备选方案：使用旧的评论生成方法
        this.generateCommentsForMoment(moment.id);
      }
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

    // 如果是用户的评论，触发角色回复
    if (this.autoReplyEnabled && commentData.isUserComment) {
      // 触发分组互动系统中的用户评论处理
      if (typeof MomentsGroupInteraction !== 'undefined') {
        // 获取该朋友圈的发布者（目标角色）
        const moment = this.moments.find(m => m.id === momentId);
        if (moment && moment.author) {
          MomentsGroupInteraction.onUserComment(momentId, commentData.content, moment.author);
        }
      } else {
        // 备选方案：使用旧的回复生成方法
        this.generateReplyForComment(momentId, comment.id);
      }
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
          const visibilityName = moment.visibilityName || '所有好友';
          const visibilityBadge = moment.isUserPost ? `<span class="visibility-badge" title="可见范围：${visibilityName}">${visibilityName}</span>` : '';
          header.innerHTML = `
            ${avatarHTML}
            <div class="feed-user-info">
              <span class="feed-username">${moment.author || '未知用户'}</span>
            </div>
            ${visibilityBadge}
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

  // 初始化个人信息（确保头像和昵称正确显示）
  momentsManager.initProfileData();

  // 初始化朋友圈列表
  momentsManager.renderMoments();

  // 注意：已禁用 monitorAvatarChanges，朋友圈个人资料完全独立
  // monitorAvatarChanges();
  
  // 监听好友和分组数据变化，实时更新选择框
  monitorFriendsAndGroupsChanges();
  
  // 恢复保存的背景图
  restoreMomentsBgImage();
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
      
      // 如果好友数据有变化，重新渲染朋友圈
      if (currentFriendsJSON !== lastFriendsJSON) {
        console.log('检测到好友数据变化，更新朋友圈');
        lastFriendsJSON = currentFriendsJSON;
        
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

// 打开角色分组发布朋友圈对话框
function openRoleGroupMomentsDialog() {
  try {
    closeMoreModal();
    const roleGroupMomentsModal = document.getElementById('roleGroupMomentsModal');
    if (roleGroupMomentsModal) {
      roleGroupMomentsModal.classList.add('show');
      // 初始化分组选择
      initRoleGroupSelect();
    }
  } catch (e) {
    console.log('openRoleGroupMomentsDialog出错:', e.message);
  }
}

function closeRoleGroupMomentsDialog() {
  try {
    const roleGroupMomentsModal = document.getElementById('roleGroupMomentsModal');
    if (roleGroupMomentsModal) {
      roleGroupMomentsModal.classList.remove('show');
    }
  } catch (e) {
    console.log('closeRoleGroupMomentsDialog出错:', e.message);
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
    
    // 获取选中的分组信息
    const groups = momentsManager.getFriendGroups();
    const selectedGroup = groups.find(g => g.id === groupId);
    const groupName = selectedGroup ? selectedGroup.name : '所有好友';

    if (!text && images.length === 0) {
      alert('请输入文字或选择图片');
      return;
    }

    // 获取朋友圈独立存储的用户信息
    let userName = momentsManager.getUserName() || '用户';
    let userAvatar = momentsManager.getUserAvatar() || '';

    // 创建朋友圈 - 使用朋友圈独立存储的头像和昵称
    momentsManager.addMoment({
      author: userName,
      authorAvatar: userAvatar,
      content: text,
      images: images,
      visibility: groupId,
      visibilityName: groupName,
      isUserPost: true
    });
    
    console.log('✓ 朋友圈已发布');
    console.log('  可见范围:', groupName, `(${groupId})`);
    console.log('  内容:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    
    // 刷新显示
    momentsManager.renderMoments();
    closeMomentDialog();

    alert('发布成功！\n可见范围：' + groupName);
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
    z-index: 9999999;
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
        
        const bgImageData = e.target.result;
        const bgUrl = `url('${bgImageData}')`;
        
        // 保存背景图到 localStorage
        if (momentsManager && momentsManager.profileData) {
          momentsManager.profileData.bgImage = bgImageData;
          momentsManager.saveToStorage();
          console.log('朋友圈背景图已保存到 localStorage');
        }
        
        // 应用背景图
        applyMomentsBgImage(bgUrl);
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

// 应用朋友圈背景图
function applyMomentsBgImage(bgUrl) {
  try {
    // 设置全局CSS变量
    if (document.documentElement) {
      document.documentElement.style.setProperty('--bg-image', bgUrl);
      document.documentElement.style.setProperty('--bg-color', 'transparent');
    }
    
    // 设置moments-page本身的背景（全屏覆盖）
    try {
      const momentsPage = document.getElementById('moments-page');
      if (momentsPage) {
        momentsPage.style.backgroundImage = bgUrl;
        momentsPage.style.backgroundRepeat = 'no-repeat';
        momentsPage.style.backgroundPosition = 'center top';
        momentsPage.style.backgroundSize = 'cover';
        momentsPage.style.backgroundColor = 'transparent';
      }
    } catch (e) {
      console.log('设置moments-page背景出错:', e.message);
    }
    
    // sub-content设置为透明，让背景图显示
    try {
      const subContent = document.querySelector('#moments-page .sub-content');
      if (subContent) {
        subContent.style.backgroundColor = 'transparent';
        subContent.style.backgroundImage = 'none';
      }
    } catch (e) {
      console.log('设置sub-content背景出错:', e.message);
    }
    
    // 动态列表区域也设置为透明，完全显示背景图
    try {
      const feedList = document.querySelector('#moments-page .feed-list');
      if (feedList) {
        feedList.style.backgroundColor = 'transparent';
        feedList.style.backgroundImage = 'none';
      }
    } catch (e) {
      console.log('设置feed-list背景出错:', e.message);
    }
    
    // 评论区也设置为透明，完全显示背景图
    try {
      const commentsSections = document.querySelectorAll('#moments-page .comments-section');
      commentsSections.forEach(section => {
        section.style.backgroundColor = 'transparent';
        section.style.backgroundImage = 'none';
        section.style.borderTop = 'none';
      });
    } catch (e) {
      console.log('设置comments-section背景出错:', e.message);
    }
    
    // 评论项也设置为透明
    try {
      const commentItems = document.querySelectorAll('#moments-page .comment-item');
      commentItems.forEach(item => {
        item.style.backgroundColor = 'transparent';
        item.style.backgroundImage = 'none';
      });
    } catch (e) {
      console.log('设置comment-item背景出错:', e.message);
    }
    
    // 评论对话框也设置为透明
    try {
      const commentThreads = document.querySelectorAll('#moments-page .comment-thread');
      commentThreads.forEach(thread => {
        thread.style.backgroundColor = 'transparent';
        thread.style.backgroundImage = 'none';
      });
    } catch (e) {
      console.log('设置comment-thread背景出错:', e.message);
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
    console.log('applyMomentsBgImage出错:', e.message);
  }
}

// 恢复保存的背景图
function restoreMomentsBgImage() {
  try {
    if (momentsManager && momentsManager.profileData && momentsManager.profileData.bgImage) {
      const bgImageData = momentsManager.profileData.bgImage;
      const bgUrl = `url('${bgImageData}')`;
      applyMomentsBgImage(bgUrl);
      console.log('朋友圈背景图已从 localStorage 恢复');
    }
  } catch (e) {
    console.log('restoreMomentsBgImage出错:', e.message);
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
        
        // 更新朋友圈的头像显示
        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) {
          profileAvatar.src = avatarUrl;
        }
        
        // 保存到朋友圈独立存储
        if (momentsManager && momentsManager.profileData) {
          momentsManager.profileData.avatar = avatarUrl;
          momentsManager.saveToStorage();
          console.log('朋友圈头像已保存');
        }
        
        // 重新渲染朋友圈列表以更新评论框头像
        if (momentsManager) {
          momentsManager.renderMoments();
        }
      } catch (e) {
        console.error('头像加载处理出错:', e);
      }
    };
    
    reader.onerror = function (e) {
      console.error('读取头像文件出错:', e);
    };
    
    reader.readAsDataURL(file);
  } catch (e) {
    console.error('changeProfileAvatar出错:', e);
  }
}

// ====== 工具函数 ======

function initGroupSelect() {
  const select = document.getElementById('groupSelect');
  if (!select) return;
  
  try {
    // 直接从AppState获取最新的好友分组数据，确保完全同步
    const groups = momentsManager.getFriendGroups();
    
    console.log('=== 初始化朋友圈分组选择 ===');
    console.log('从AppState.friendGroups获取到的分组:', groups);
    
    if (!groups || groups.length === 0) {
      console.log('⚠️ 未获取到好友分组，显示默认分组');
      // 如果没有分组，显示一个提示选项
      select.innerHTML = `
        <option value="group_all">所有好友(请先在好友页面创建分组)</option>
      `;
      return;
    }
    
    // 添加"所有好友"选项作为第一个选项
    let optionsHTML = '<option value="group_all">所有好友</option>';
    
    // 添加所有从好友页面同步的分组
    optionsHTML += groups.map(group => {
      if (!group || !group.id) {
        return '';
      }
      const groupName = group.name || '未命名分组';
      const memberCount = (group.memberIds && Array.isArray(group.memberIds)) ? group.memberIds.length : 0;
      return `<option value="${group.id}">${groupName} (${memberCount}人)</option>`;
    }).join('');
    
    select.innerHTML = optionsHTML;
    console.log('✓ 朋友圈分组选择已更新，共', groups.length + 1, '个选项(含"所有好友")');
  } catch (e) {
    console.error('初始化好友分组出错:', e.message);
    // 降级处理
    select.innerHTML = `
      <option value="group_all">所有好友(加载失败)</option>
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

// ====== 角色分组发布朋友圈相关函数 ======

function initRoleGroupSelect() {
  const groupSelect = document.getElementById('roleGroupSelect');
  if (!groupSelect) return;
  
  try {
    const groups = momentsManager.getFriendGroups();
    
    console.log('=== 初始化角色分组选择 ===');
    console.log('获取到的分组:', groups);
    
    if (!groups || groups.length === 0) {
      groupSelect.innerHTML = '<option value="">暂无分组</option>';
      return;
    }
    
    // 添加"所有好友"选项
    let optionsHTML = '<option value="group_all">所有好友</option>';
    
    // 添加所有分组
    optionsHTML += groups.map(group => {
      if (!group || !group.id) {
        return '';
      }
      const groupName = group.name || '未命名分组';
      const memberCount = (group.memberIds && Array.isArray(group.memberIds)) ? group.memberIds.length : 0;
      return `<option value="${group.id}">${groupName} (${memberCount}人)</option>`;
    }).join('');
    
    groupSelect.innerHTML = optionsHTML;
    
    // 监听分组变化，更新角色列表
    groupSelect.addEventListener('change', updateRoleGroupCharacterList);
    
    console.log('✓ 角色分组选择已初始化');
  } catch (e) {
    console.error('初始化角色分组出错:', e.message);
    groupSelect.innerHTML = '<option value="">加载失败</option>';
  }
}

function updateRoleGroupCharacterList() {
  const groupSelect = document.getElementById('roleGroupSelect');
  const characterListContainer = document.getElementById('roleGroupCharacterList');
  
  if (!groupSelect || !characterListContainer) return;
  
  try {
    const groupId = groupSelect.value;
    if (!groupId) {
      characterListContainer.innerHTML = '<div style="color:#999;padding:20px;text-align:center;">请先选择分组</div>';
      return;
    }
    
    // 获取该分组的所有角色
    const characters = MomentsGroupInteraction.getGroupCharacters(groupId);
    
    console.log(`获取分组 ${groupId} 的角色:`, characters);
    
    if (!characters || characters.length === 0) {
      characterListContainer.innerHTML = '<div style="color:#999;padding:20px;text-align:center;">该分组暂无角色</div>';
      return;
    }
    
    // 生成角色列表（复选框）
    let html = '<div style="padding:10px 0;">';
    
    // 添加"全选"按钮
    html += `
      <div style="margin-bottom:10px;display:flex;gap:8px;">
        <button id="selectAllRoles" style="flex:1;padding:8px;background:#ff6b9d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;">全选</button>
        <button id="deselectAllRoles" style="flex:1;padding:8px;background:#ddd;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:13px;">取消全选</button>
      </div>
    `;
    
    // 添加角色复选框
    html += '<div style="max-height:200px;overflow-y:auto;border:1px solid #ddd;border-radius:4px;padding:8px;">';
    characters.forEach(character => {
      const charId = character.id || character.name;
      html += `
        <label style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-radius:4px;transition:background 0.2s;">
          <input type="checkbox" class="roleCharacterCheckbox" value="${charId}" data-name="${character.name}" style="cursor:pointer;">
          <span>${character.name || '未命名'}</span>
        </label>
      `;
    });
    html += '</div>';
    
    html += '</div>';
    
    characterListContainer.innerHTML = html;
    
    // 绑定全选/取消全选事件
    const selectAllBtn = document.getElementById('selectAllRoles');
    const deselectAllBtn = document.getElementById('deselectAllRoles');
    
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.roleCharacterCheckbox').forEach(cb => cb.checked = true);
      });
    }
    
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.roleCharacterCheckbox').forEach(cb => cb.checked = false);
      });
    }
    
    console.log('✓ 角色列表已更新');
  } catch (e) {
    console.error('更新角色列表出错:', e.message);
    characterListContainer.innerHTML = '<div style="color:#999;padding:20px;text-align:center;">加载失败</div>';
  }
}

function publishRoleGroupMoment() {
  try {
    const groupSelect = document.getElementById('roleGroupSelect');
    
    if (!groupSelect) {
      alert('对话框元素缺失');
      return;
    }
    
    const groupId = groupSelect.value;
    if (!groupId) {
      alert('请选择分组');
      return;
    }
    
    // 获取选中的角色
    const selectedCheckboxes = document.querySelectorAll('.roleCharacterCheckbox:checked');
    if (selectedCheckboxes.length === 0) {
      alert('请选择至少一个角色');
      return;
    }
    
    const selectedCharacterIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    const selectedCharacterNames = Array.from(selectedCheckboxes).map(cb => cb.dataset.name);
    
    console.log('=== 角色分组发布朋友圈 ===');
    console.log('分组ID:', groupId);
    console.log('选中的角色:', selectedCharacterNames);
    
    // 获取该分组的所有角色（用于后续评论）
    const allGroupCharacters = MomentsGroupInteraction.getGroupCharacters(groupId);
    
    // 获取选中的角色对象
    const selectedCharacters = allGroupCharacters.filter(c => selectedCharacterIds.includes(c.id || c.name));
    
    // 显示加载提示
    alert('正在生成朋友圈内容，请稍候...');
    
    // 调用分组互动系统生成朋友圈内容并发布
    if (typeof MomentsGroupInteraction !== 'undefined') {
      MomentsGroupInteraction.publishMomentsBySelectedRoles(selectedCharacters, allGroupCharacters, groupId);
    }
    
    momentsManager.renderMoments();
    closeRoleGroupMomentsDialog();
    
  } catch (e) {
    console.error('发布角色分组朋友圈出错:', e.message);
    alert('发布失败: ' + e.message);
  }
}

// ====== 自动生成朋友圈相关函数 ======

function openAutoMomentsDialog() {
  try {
    const autoMomentsModal = document.getElementById('autoMomentsModal');
    if (autoMomentsModal) {
      autoMomentsModal.classList.add('show');
    }
    
    // 初始化分组列表
    initAutoMomentsGroupList();
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

function initAutoMomentsGroupList() {
  const groupListContainer = document.getElementById('autoMomentsGroupList');
  if (!groupListContainer) return;
  
  try {
    const groups = momentsManager.getFriendGroups();
    
    if (!groups || groups.length === 0) {
      groupListContainer.innerHTML = '<div style="color:#999;padding:20px;text-align:center;">暂无分组</div>';
      return;
    }
    
    // 生成分组列表（复选框）
    let html = '<div style="padding:10px 0;">';
    
    groups.forEach(group => {
      const groupId = group.id;
      html += `
        <label style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-radius:4px;transition:background 0.2s;">
          <input type="checkbox" class="autoMomentsGroupCheckbox" value="${groupId}" data-name="${group.name}" style="cursor:pointer;">
          <span>${group.name || '未命名分组'}</span>
        </label>
      `;
    });
    
    html += '</div>';
    groupListContainer.innerHTML = html;
    
    // 绑定分组复选框变化事件
    document.querySelectorAll('.autoMomentsGroupCheckbox').forEach(checkbox => {
      checkbox.addEventListener('change', updateAutoMomentsCharacterList);
    });
    
    console.log('✓ 自动生成朋友圈分组列表已初始化');
  } catch (e) {
    console.error('初始化自动生成朋友圈分组列表出错:', e.message);
    groupListContainer.innerHTML = '<div style="color:#999;padding:20px;text-align:center;">加载失败</div>';
  }
}

function updateAutoMomentsCharacterList() {
  const characterListContainer = document.getElementById('autoMomentsCharacterList');
  if (!characterListContainer) return;
  
  try {
    // 获取选中的分组
    const selectedGroupCheckboxes = document.querySelectorAll('.autoMomentsGroupCheckbox:checked');
    
    if (selectedGroupCheckboxes.length === 0) {
      characterListContainer.innerHTML = '<div style="color:#999;padding:20px;text-align:center;">请先选择分组</div>';
      return;
    }
    
    // 收集所有选中分组的角色
    const allCharacters = [];
    const characterMap = new Map();
    
    selectedGroupCheckboxes.forEach(checkbox => {
      const groupId = checkbox.value;
      const characters = MomentsGroupInteraction.getGroupCharacters(groupId);
      
      characters.forEach(character => {
        const charId = character.id || character.name;
        if (!characterMap.has(charId)) {
          characterMap.set(charId, character);
          allCharacters.push(character);
        }
      });
    });
    
    if (allCharacters.length === 0) {
      characterListContainer.innerHTML = '<div style="color:#999;padding:20px;text-align:center;">该分组暂无角色</div>';
      return;
    }
    
    // 生成角色列表（复选框）
    let html = '<div style="padding:10px 0;">';
    
    allCharacters.forEach(character => {
      const charId = character.id || character.name;
      html += `
        <label style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-radius:4px;transition:background 0.2s;">
          <input type="checkbox" class="autoMomentsCharacterCheckbox" value="${charId}" data-name="${character.name}" style="cursor:pointer;">
          <span>${character.name || '未命名'}</span>
        </label>
      `;
    });
    
    html += '</div>';
    characterListContainer.innerHTML = html;
    
    console.log('✓ 自动生成朋友圈角色列表已更新');
  } catch (e) {
    console.error('更新自动生成朋友圈角色列表出错:', e.message);
    characterListContainer.innerHTML = '<div style="color:#999;padding:20px;text-align:center;">加载失败</div>';
  }
}

function saveAutoMomentsSettings() {
  try {
    // 获取选中的分组
    const selectedGroupCheckboxes = document.querySelectorAll('.autoMomentsGroupCheckbox:checked');
    const selectedGroupIds = Array.from(selectedGroupCheckboxes).map(cb => cb.value);
    const selectedGroupNames = Array.from(selectedGroupCheckboxes).map(cb => cb.dataset.name);
    
    // 获取选中的角色
    const selectedCharacterCheckboxes = document.querySelectorAll('.autoMomentsCharacterCheckbox:checked');
    const selectedCharacterIds = Array.from(selectedCharacterCheckboxes).map(cb => cb.value);
    const selectedCharacterNames = Array.from(selectedCharacterCheckboxes).map(cb => cb.dataset.name);
    
    if (selectedGroupIds.length === 0) {
      alert('请选择至少一个分组');
      return;
    }
    
    if (selectedCharacterIds.length === 0) {
      alert('请选择至少一个角色');
      return;
    }
    
    console.log('=== 保存自动生成朋友圈设置 ===');
    console.log('选中的分组:', selectedGroupNames);
    console.log('选中的角色:', selectedCharacterNames);
    
    // 保存设置到 momentsManager
    if (!momentsManager.autoMomentsSettings) {
      momentsManager.autoMomentsSettings = {};
    }
    
    momentsManager.autoMomentsSettings.groupIds = selectedGroupIds;
    momentsManager.autoMomentsSettings.characterIds = selectedCharacterIds;
    momentsManager.autoMomentsSettings.enabled = true;
    
    // 保存到本地存储
    momentsManager.saveToStorage();
    
    closeAutoMomentsDialog();
    alert(`✓ 设置已保存！\n选中的 ${selectedCharacterNames.length} 个角色将在聊天时主动发朋友圈`);
    
  } catch (e) {
    console.error('保存自动生成朋友圈设置出错:', e.message);
    alert('保存失败: ' + e.message);
  }
}

// 已禁用：朋友圈个人资料现在完全独立，不再监听或同步侧边栏数据
// function monitorAvatarChanges() { ... }

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
