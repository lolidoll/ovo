/**
 * 朋友圈分组互动系统 - 角色智能评论与互动
 * 功能：
 * 1. 用户发送朋友圈时，分组内所有角色自动生成评论
 * 2. 角色之间相互评论和互动
 * 3. 用户评论时，角色回复用户
 * 4. 其他角色根据情况决定是否回复
 */

const MomentsGroupInteraction = {
  // 初始化
  init: function(momentsManagerInstance) {
    this.momentsManager = momentsManagerInstance;
    console.log('✅ 朋友圈分组互动系统已初始化');
  },

  resolveNamePlaceholders: function(text, userName, charName) {
    if (!text || typeof text !== 'string') return text || '';
    if (window.MainAPIManager && typeof window.MainAPIManager.replaceNamePlaceholders === 'function') {
      return window.MainAPIManager.replaceNamePlaceholders(text, userName, charName);
    }
    if (typeof window.replaceNamePlaceholders === 'function') {
      return window.replaceNamePlaceholders(text, userName, charName);
    }
    return text
      .replace(/\{\{user\}\}/g, userName || '')
      .replace(/\{\{char\}\}/g, charName || '');
  },

  getConversationForCharacter: function(character) {
    try {
      const appState = this.momentsManager.getAppState();
      if (!appState || !Array.isArray(appState.conversations)) return null;

      const byId = appState.conversations.find(c => c && (c.id === character.id || c.id === character.characterId));
      if (byId) return byId;

      const byName = appState.conversations.find(c => c && c.name === character.name);
      return byName || null;
    } catch (e) {
      console.error('获取角色对话信息失败:', e);
      return null;
    }
  },

  getUserContextForCharacter: function(character, conversation) {
    const appState = this.momentsManager.getAppState();
    const convId = (conversation && conversation.id) || character.id;
    let persona = null;

    if (window.UserPersonaManager && typeof window.UserPersonaManager.getPersonaForConversation === 'function') {
      try {
        persona = window.UserPersonaManager.getPersonaForConversation(convId);
      } catch (e) {
        persona = null;
      }
    }

    const userNameForChar = (persona && persona.userName)
      || (conversation && conversation.userNameForChar)
      || (appState && appState.user && appState.user.name)
      || '用户';
    const userPersonalityRaw = (persona && persona.personality)
      || (conversation && conversation.userPersonality)
      || (appState && appState.user && appState.user.personality)
      || '';
    const charName = (conversation && conversation.name) || character.name || '角色';
    const userPersonality = this.resolveNamePlaceholders(userPersonalityRaw, userNameForChar, charName);
    const userNicknameForChar = ((conversation && conversation.userNicknameForChar)
      || (appState && appState.user && appState.user.nickname)
      || '').trim();

    return {
      userNameForChar,
      userPersonality,
      userNicknameForChar,
      persona
    };
  },

  formatChatMessagesForContext: function(convId, userName, charName, limit = 50) {
    try {
      const appState = this.momentsManager.getAppState();
      const messages = appState && appState.messages ? (appState.messages[convId] || []) : [];
      if (!Array.isArray(messages) || messages.length === 0) return '';

      const sanitized = messages.filter(msg => msg && !msg.isRetracted && msg.type !== 'system');
      if (sanitized.length === 0) return '';

      const recent = sanitized.slice(-limit);
      const lines = recent.map(msg => {
        const isUser = msg.type === 'sent' || msg.sender === 'sent' || msg.role === 'user';
        const sender = isUser ? (userName || '用户') : (charName || '角色');
        let content = '';

        if (msg.isEmoji && msg.content) {
          content = `[表情包:${msg.content}]`;
        } else if (msg.isImage) {
          content = msg.photoDescription ? `[图片] ${msg.photoDescription}` : '[图片]';
        } else if (msg.type === 'voice') {
          const duration = msg.duration ? `${msg.duration}秒` : '';
          content = `[语音${duration}] ${msg.content || ''}`.trim();
        } else if (msg.type === 'location') {
          content = `[位置] ${msg.content || ''}`.trim();
        } else if (typeof msg.content === 'string') {
          content = msg.content;
        } else if (typeof msg.text === 'string') {
          content = msg.text;
        } else if (Array.isArray(msg.content)) {
          const textParts = msg.content
            .filter(item => item && item.type === 'text' && item.text)
            .map(item => item.text);
          content = textParts.join(' ');
        }

        if (!content) content = '[空消息]';
        return `${sender}：${content.substring(0, 200)}`;
      });

      return lines.join('\n');
    } catch (e) {
      console.error('格式化聊天上下文失败:', e);
      return '';
    }
  },

  formatOfflineMessagesForContext: function(convId, userName, charName, limit = 10) {
    try {
      const offlineData = localStorage.getItem('stOfflineData');
      if (!offlineData) return '';

      const parsed = JSON.parse(offlineData);
      const offlineMessages = parsed && parsed.messages ? parsed.messages[convId] : null;
      if (!Array.isArray(offlineMessages) || offlineMessages.length === 0) return '';

      const recent = offlineMessages.slice(-limit);
      const lines = recent.map(msg => {
        const roleLabel = msg.role === 'user' ? (userName || '用户') : (charName || '角色');
        let content = msg.content || '';
        if (msg.swipes && msg.swipes.length) {
          const swipeIndex = Number.isFinite(msg.swipeIndex) ? msg.swipeIndex : 0;
          content = msg.swipes[swipeIndex] || msg.swipes[0] || content;
        }
        return `${roleLabel}：${String(content).substring(0, 200)}`;
      });

      return lines.join('\n');
    } catch (e) {
      console.error('格式化线下聊天上下文失败:', e);
      return '';
    }
  },

  buildRoleContextBundle: function(character, settings) {
    const conversation = this.getConversationForCharacter(character) || {};
    const mergedSettings = settings || this.getCharacterSettings(character) || {};
    const userContext = this.getUserContextForCharacter(character, conversation);
    const convId = conversation.id || character.id;
    const charName = mergedSettings.name || conversation.name || character.name || '角色';

    const recentChatText = this.formatChatMessagesForContext(convId, userContext.userNameForChar, charName, 50);
    const offlineChatText = this.formatOfflineMessagesForContext(convId, userContext.userNameForChar, charName, 10);

    return {
      conversation,
      settings: mergedSettings,
      userContext,
      recentChatText,
      offlineChatText
    };
  },

  buildMomentUserContent: function(text, images) {
    const safeText = text || '';
    const imageList = Array.isArray(images) ? images.filter(Boolean) : [];
    if (imageList.length === 0) return safeText;

    const maxImages = 4;
    const trimmedImages = imageList.slice(0, maxImages);
    const content = [{ type: 'text', text: safeText }];
    trimmedImages.forEach(url => {
      content.push({
        type: 'image_url',
        image_url: { url }
      });
    });

    return content;
  },

  /**
   * 获取分组内的所有角色
   * @param {string} groupId - 分组ID
   * @returns {Array} 分组内的角色列表
   */
  getGroupCharacters: function(groupId) {
    try {
      const appState = this.momentsManager.getAppState();
      if (!appState || !appState.friends) return [];

      const friends = appState.friends || [];

      if (Array.isArray(groupId)) {
        const groupSet = new Set(groupId.filter(Boolean));
        if (groupSet.has('group_all')) {
          return friends;
        }

        return friends.filter(f => {
          const friendGroupId = f.friendGroupId || 'group_default';
          return groupSet.has(friendGroupId);
        });
      }

      // 如果是"所有好友"分组，返回所有角色
      if (groupId === 'group_all') {
        return friends;
      }

      // 否则，按好友分组字段过滤
      return friends.filter(f => (f.friendGroupId || 'group_default') === groupId) || [];
    } catch (e) {
      console.error('获取分组角色失败:', e);
      return [];
    }
  },

  /**
   * 获取角色的设定信息
   * @param {Object} character - 角色对象
   * @returns {Object} 角色设定
   */
  getCharacterSettings: function(character) {
    try {
      const conversation = this.getConversationForCharacter(character) || {};
      const name = (conversation.name || character.name || '角色').trim();
      const description = this.resolveNamePlaceholders(
        (conversation.description || character.description || '').trim(),
        (conversation.userNameForChar || (this.momentsManager.getAppState()?.user?.name || '用户')),
        name
      );
      const personality = (conversation.personality || character.personality || '').trim();
      const avatar = conversation.avatar || character.avatar || '';
      const charNickname = (conversation.charNickname || character.charNickname || '').trim();
      const remark = (conversation.remark || character.remark || '').trim();

      return {
        id: conversation.id || character.id,
        name,
        description,
        personality,
        avatar,
        charNickname,
        remark
      };
    } catch (e) {
      console.error('获取角色设定失败:', e);
      return null;
    }
  },

  /**
   * 调用主API生成角色评论
   * @param {Object} character - 角色对象
   * @param {Object} moment - 朋友圈对象
   * @param {Object} context - 上下文信息
   * @returns {Promise<string>} 生成的评论内容
   */
  generateCharacterComment: async function(character, moment, context = {}) {
    try {
      const appState = this.momentsManager.getAppState();
      if (!appState || !appState.apiSettings) {
        console.warn('API设置不完整，使用默认评论');
        return this.getDefaultComment(character, moment);
      }

      const characterSettings = this.getCharacterSettings(character);
      if (!characterSettings) {
        console.warn(`⚠️ 角色${character.name}没有设定信息，跳过评论生成`);
        return null;
      }

      const messages = this.buildCommentPrompt(character, moment, characterSettings, context);

      // 调用主API
      const response = await this.callMainAPI(appState, messages, { maxTokens: 8000 });
      if (!response) {
        console.warn(`⚠️ API调用失败，${character.name}的评论未生成`);
        return null;
      }
      return response;
    } catch (error) {
      console.error('生成角色评论失败:', error);
      return null;
    }
  },

  /**
   * 构建评论提示词
   * @param {Object} character - 角色
   * @param {Object} moment - 朋友圈
   * @param {Object} settings - 角色设定
   * @param {Object} context - 上下文
   * @returns {string} 提示词
   */
  buildCommentPrompt: function(character, moment, settings, context) {
    const bundle = this.buildRoleContextBundle(character, settings);
    const userContext = bundle.userContext || {};
    const roleSettings = bundle.settings || settings || {};

    const systemLines = [];
    systemLines.push('你要严格作为一个真实的人类进行角色扮演。');
    systemLines.push('');
    systemLines.push('【角色信息】');
    systemLines.push(`好友名称：${roleSettings.name || '角色'}`);
    if (roleSettings.charNickname) {
      systemLines.push(`角色网名：${roleSettings.charNickname}`);
    }
    if (roleSettings.remark) {
      systemLines.push(`备注名称：${roleSettings.remark}`);
    }
    if (roleSettings.personality) {
      systemLines.push(`性格：${roleSettings.personality}`);
    }
    if (roleSettings.description) {
      systemLines.push(`角色设定：${roleSettings.description}`);
    }

    systemLines.push('');
    systemLines.push('【用户信息】');
    systemLines.push(`我的名字：${userContext.userNameForChar || '用户'}`);
    if (userContext.userNicknameForChar) {
      systemLines.push(`我的网名：${userContext.userNicknameForChar}`);
    }
    if (userContext.userPersonality) {
      systemLines.push(`人设内容：${userContext.userPersonality}`);
    }

    if (bundle.recentChatText) {
      systemLines.push('');
      systemLines.push('【聊天页面最新50楼层】');
      systemLines.push(bundle.recentChatText);
    }
    if (bundle.offlineChatText) {
      systemLines.push('');
      systemLines.push('【线下页面最新10楼层】');
      systemLines.push(bundle.offlineChatText);
    }

    const userLines = [];
    const momentText = moment && moment.content ? String(moment.content).trim() : '';
    const momentAuthor = (moment && moment.author) || '用户';
    const momentVisibility = (moment && moment.visibilityName) || '';
    const imageCount = moment && Array.isArray(moment.images) ? moment.images.filter(Boolean).length : 0;

    userLines.push('【朋友圈内容】');
    userLines.push(`发布者：${momentAuthor}`);
    userLines.push(`文字：${momentText || '（无文字）'}`);
    if (momentVisibility) {
      userLines.push(`可见范围：${momentVisibility}`);
    }
    if (imageCount > 0) {
      userLines.push(`图片数量：${imageCount}张（请识图）`);
      if (imageCount > 4) {
        userLines.push('提示：图片较多，仅发送前4张供识图。');
      }
    }

    if (context.existingComments && context.existingComments.length > 0) {
      userLines.push('');
      userLines.push('【已有评论】');
      context.existingComments.forEach((comment, index) => {
        userLines.push(`${index + 1}. ${comment.author}：${comment.content}`);
      });
    }

    userLines.push('');
    userLines.push('【任务】');

    if (context.isReplyToUser) {
      const replyText = context.userReply || context.userComment || '';
      userLines.push(`用户在朋友圈评论区对你发言，请作为${roleSettings.name || '角色'}回复用户。`);
      if (context.targetCommentAuthor && context.targetCommentContent) {
        userLines.push(`被回复的评论：${context.targetCommentAuthor}：${context.targetCommentContent}`);
      }
      if (replyText) {
        userLines.push(`用户内容：${replyText}`);
      }
      userLines.push('要求：');
      userLines.push('1. 保持角色设定，不能OOC（出戏）');
      userLines.push('2. 回复要自然、有趣、符合角色性格');
      userLines.push('3. 长度：10-60字');
      userLines.push('4. 只输出回复内容，不要包含其他文字');
    } else {
      userLines.push(`请作为${roleSettings.name || '角色'}对这条朋友圈进行评论。`);
      userLines.push('要求：');
      userLines.push('1. 保持角色设定，不能OOC（出戏）');
      userLines.push('2. 评论要自然、有趣、符合角色性格');
      userLines.push('3. 长度：10-60字');
      userLines.push('4. 只输出评论内容，不要包含其他文字');
      if (context.existingComments && context.existingComments.length > 0) {
        userLines.push('5. 评论应与已有评论不同，避免重复');
      }
    }

    const systemPrompt = systemLines.join('\n');
    const userPrompt = userLines.join('\n');
    const userContent = this.buildMomentUserContent(userPrompt, moment && moment.images ? moment.images : []);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];
  },

  /**
   * 调用主API
   * @param {Object} appState - 应用状态
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} API响应
   */
  callMainAPI: async function(appState, messages, options = {}) {
    try {
      const api = appState.apiSettings || {};
      if (!api.endpoint || !api.selectedModel) {
        console.warn('API配置不完整');
        return null;
      }

      const endpoint = window.APIUtils && window.APIUtils.normalizeEndpoint
        ? window.APIUtils.normalizeEndpoint(api.endpoint) + '/chat/completions'
        : api.endpoint.replace(/\/$/, '').replace(/\/v1$/, '') + '/v1/chat/completions';

      const payloadMessages = Array.isArray(messages)
        ? messages
        : [{ role: 'user', content: String(messages || '') }];

      const body = {
        model: api.selectedModel,
        messages: payloadMessages,
        temperature: options.temperature !== undefined
          ? options.temperature
          : (api.temperature !== undefined ? api.temperature : 0.8),
        max_tokens: options.maxTokens || 8000,
        frequency_penalty: api.frequencyPenalty !== undefined ? api.frequencyPenalty : 0.2,
        presence_penalty: api.presencePenalty !== undefined ? api.presencePenalty : 0.1,
        top_p: api.topP !== undefined ? api.topP : 1.0
      };

      let controller = null;
      let timeoutId = null;
      if (window.APIUtils && window.APIUtils.createTimeoutController) {
        const timeout = window.APIUtils.createTimeoutController(300000);
        controller = timeout.controller;
        timeoutId = timeout.timeoutId;
      }

      const fetchOptions = window.APIUtils && window.APIUtils.createFetchOptions
        ? window.APIUtils.createFetchOptions(api.apiKey, body, controller ? controller.signal : undefined)
        : {
            method: 'POST',
            headers: Object.assign(
              { 'Content-Type': 'application/json' },
              api.apiKey ? { 'Authorization': 'Bearer ' + api.apiKey } : {}
            ),
            body: JSON.stringify(body)
          };

      console.log('📤 调用主API生成朋友圈内容/评论...');
      const response = await fetch(endpoint, fetchOptions);

      if (window.APIUtils && window.APIUtils.clearTimeoutController) {
        window.APIUtils.clearTimeoutController(timeoutId);
      }

      if (!response.ok) {
        console.error(`API请求失败 [${response.status}]:`, response.statusText);
        return null;
      }

      const data = await response.json();
      const customPaths = api.customResponseFieldPaths
        ? api.customResponseFieldPaths.split('\n').map(p => p.trim()).filter(Boolean)
        : [];
      const content = window.APIUtils && window.APIUtils.extractTextWithCustomMapping
        ? window.APIUtils.extractTextWithCustomMapping(data, customPaths)
        : (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
            ? data.choices[0].message.content
            : '');

      if (content) {
        console.log('✅ API响应成功:', content.substring(0, 50) + '...');
        return content.trim();
      }

      return null;
    } catch (error) {
      console.error('调用主API失败:', error);
      return null;
    }
  },

  /**
   * 获取默认评论（当API未配置时返回null，不生成模拟评论）
   * @param {Object} character - 角色
   * @param {Object} moment - 朋友圈
   * @returns {null} 返回null，表示不生成评论
   */
  getDefaultComment: function(character, moment) {
    // 当API未配置时，不生成任何模拟评论
    return null;
  },

  /**
   * 用户发送朋友圈时触发 - 分组内角色自动评论
   * @param {string} momentId - 朋友圈ID
   */
  onMomentPublished: async function(momentId) {
    try {
      const moment = this.momentsManager.moments.find(m => m.id === momentId);
      if (!moment) return;

      console.log('🔔 朋友圈已发布，触发分组角色评论...');
      console.log('  朋友圈ID:', momentId);
      const visibilityGroups = moment.visibilityGroups && moment.visibilityGroups.length > 0
        ? moment.visibilityGroups
        : (moment.visibility ? [moment.visibility] : ['group_all']);
      console.log('  可见范围:', visibilityGroups.join(','));

      // 获取分组内的所有角色
      const characters = this.getGroupCharacters(visibilityGroups);
      console.log(`  分组内角色数: ${characters.length}`);

      if (characters.length === 0) {
        console.log('  分组内没有角色，跳过');
        return;
      }

      // 为每个角色生成评论
      const generatedComments = [];
      for (let i = 0; i < characters.length; i++) {
        const character = characters[i];
        console.log(`\n  [${i + 1}/${characters.length}] 生成${character.name}的评论...`);

        // 生成评论
        const commentContent = await this.generateCharacterComment(character, moment, {
          existingComments: generatedComments
        });

        if (commentContent && commentContent.trim()) {
          // 添加评论到朋友圈
          const comment = this.momentsManager.addComment(momentId, {
            author: character.name,
            authorAvatar: character.avatar || '',
            content: commentContent,
            isUserComment: false
          });

          if (moment.isUserPost && comment) {
            this.momentsManager.addNotification({
              type: 'comment',
              from: character.name,
              fromAvatar: character.avatar || '',
              content: `评论了你：${commentContent}`,
              momentId: momentId,
              commentId: comment.id
            });
          }

          generatedComments.push({
            author: character.name,
            content: commentContent
          });

          console.log(`  ✅ ${character.name}的评论已添加`);

          // 延迟以避免API限流
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log(`  ⚠️ ${character.name}的评论为空，跳过`);
        }
      }

      // 触发角色间互动
      if (generatedComments.length > 1) {
        console.log('\n🔄 触发角色间互动...');
        await this.triggerCharacterInteraction(momentId, characters, generatedComments);
      }

      this.momentsManager.renderMoments();
    } catch (error) {
      console.error('处理朋友圈发布失败:', error);
    }
  },

  /**
   * 触发角色间互动 - 角色可能会相互评论
   * @param {string} momentId - 朋友圈ID
   * @param {Array} characters - 分组内的角色
   * @param {Array} existingComments - 已有的评论
   */
  triggerCharacterInteraction: async function(momentId, characters, existingComments) {
    try {
      // 随机选择1-2个角色进行互动
      const interactionCount = Math.floor(Math.random() * 2) + 1;
      const selectedIndices = [];
      
      while (selectedIndices.length < interactionCount && selectedIndices.length < characters.length) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        if (!selectedIndices.includes(randomIndex)) {
          selectedIndices.push(randomIndex);
        }
      }

      for (const index of selectedIndices) {
        const character = characters[index];
        console.log(`  ${character.name}正在思考是否要互动...`);

        // 生成互动评论
        const interactionComment = await this.generateCharacterComment(character, 
          this.momentsManager.moments.find(m => m.id === momentId),
          {
            existingComments: existingComments,
            isInteraction: true
          }
        );

        if (interactionComment && interactionComment.trim()) {
          this.momentsManager.addComment(momentId, {
            author: character.name,
            authorAvatar: character.avatar || '',
            content: interactionComment,
            isUserComment: false
          });

          console.log(`  ✅ ${character.name}的互动评论已添加`);
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log(`  ⚠️ ${character.name}的互动评论为空，跳过`);
        }
      }
    } catch (error) {
      console.error('触发角色互动失败:', error);
    }
  },

  /**
   * 用户评论时触发 - 角色回复用户，其他角色可能也会回复
   * @param {string} momentId - 朋友圈ID
   * @param {string} userComment - 用户评论内容
   * @param {string} targetCharacterName - 目标角色名称（用户评论的对象）
   */
  onUserComment: async function(momentId, userComment, commentId, targetCharacterName) {
    try {
      const moment = this.momentsManager.moments.find(m => m.id === momentId);
      if (!moment) return;

      console.log('💬 用户评论已提交，触发角色回复...');
      console.log('  用户评论:', userComment);
      console.log('  目标角色:', targetCharacterName);

      const visibilityGroups = moment.visibilityGroups && moment.visibilityGroups.length > 0
        ? moment.visibilityGroups
        : (moment.visibility ? [moment.visibility] : ['group_all']);

      // 获取分组内的所有角色
      const characters = this.getGroupCharacters(visibilityGroups);
      if (!characters || characters.length === 0) {
        console.log('  分组内没有角色，跳过回复');
        return;
      }

      const targetCharacter = targetCharacterName
        ? characters.find(c => c.name === targetCharacterName)
        : null;
      const fallbackTarget = (!targetCharacter && !moment.isUserPost)
        ? characters.find(c => c.name === moment.author)
        : null;

      const replyTargets = [];
      const target = targetCharacter || fallbackTarget;
      if (target) {
        replyTargets.push(target);
      }
      characters.forEach(character => {
        if (!replyTargets.find(item => item.id === character.id || item.name === character.name)) {
          replyTargets.push(character);
        }
      });

      if (!commentId) {
        console.log('  缺少commentId，无法添加回复');
        return;
      }

      for (let i = 0; i < replyTargets.length; i++) {
        const character = replyTargets[i];
        console.log(`\n  [${i + 1}/${replyTargets.length}] ${character.name}正在回复用户评论...`);

        const replyContent = await this.generateCharacterComment(character, moment, {
          isReplyToUser: true,
          userComment: userComment
        });

        if (replyContent && replyContent.trim()) {
          const reply = this.momentsManager.addReply(momentId, commentId, {
            author: character.name,
            authorAvatar: character.avatar || '',
            content: replyContent,
            isUserReply: false
          });

          if (reply) {
            this.momentsManager.addNotification({
              type: 'reply',
              from: character.name,
              fromAvatar: character.avatar || '',
              content: `回复了你：${replyContent}`,
              momentId: momentId,
              commentId: commentId,
              replyId: reply.id
            });
          }

          console.log(`  ✅ ${character.name}的回复已添加`);
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log(`  ⚠️ ${character.name}的回复为空，跳过`);
        }
      }

      this.momentsManager.renderMoments();
    } catch (error) {
      console.error('处理用户评论失败:', error);
    }
  },

  /**
   * 用户回复评论时触发 - 角色及其他角色回复用户
   * @param {string} momentId - 朋友圈ID
   * @param {string} commentId - 被回复的评论ID
   * @param {string} userReply - 用户回复内容
   * @param {string} targetCharacterName - 被回复的角色名称
   */
  onUserReply: async function(momentId, commentId, userReply, targetCharacterName) {
    try {
      const moment = this.momentsManager.moments.find(m => m.id === momentId);
      if (!moment) return;

      const comments = this.momentsManager.comments && this.momentsManager.comments[momentId]
        ? this.momentsManager.comments[momentId]
        : [];
      const targetComment = comments.find(c => c.id === commentId);

      console.log('💬 用户回复评论，触发角色回复...');
      console.log('  用户回复:', userReply);

      const visibilityGroups = moment.visibilityGroups && moment.visibilityGroups.length > 0
        ? moment.visibilityGroups
        : (moment.visibility ? [moment.visibility] : ['group_all']);

      const characters = this.getGroupCharacters(visibilityGroups);
      if (!characters || characters.length === 0) {
        console.log('  分组内没有角色，跳过回复');
        return;
      }

      let targetCharacter = null;
      if (targetCharacterName) {
        targetCharacter = characters.find(c => c.name === targetCharacterName);
      }
      if (!targetCharacter && targetComment) {
        targetCharacter = characters.find(c => c.name === targetComment.author);
      }

      const replyTargets = [];
      if (targetCharacter) {
        replyTargets.push(targetCharacter);
      }
      characters.forEach(character => {
        if (!replyTargets.find(item => item.id === character.id || item.name === character.name)) {
          replyTargets.push(character);
        }
      });

      for (let i = 0; i < replyTargets.length; i++) {
        const character = replyTargets[i];
        console.log(`\n  [${i + 1}/${replyTargets.length}] ${character.name}正在回复用户...`);

        const replyContent = await this.generateCharacterComment(character, moment, {
          isReplyToUser: true,
          userReply: userReply,
          targetCommentAuthor: targetComment ? targetComment.author : '',
          targetCommentContent: targetComment ? targetComment.content : ''
        });

        if (replyContent && replyContent.trim()) {
          const reply = this.momentsManager.addReply(momentId, commentId, {
            author: character.name,
            authorAvatar: character.avatar || '',
            content: replyContent,
            isUserReply: false
          });

          if (reply) {
            this.momentsManager.addNotification({
              type: 'reply',
              from: character.name,
              fromAvatar: character.avatar || '',
              content: `回复了你：${replyContent}`,
              momentId: momentId,
              commentId: commentId,
              replyId: reply.id
            });
          }

          console.log(`  ✅ ${character.name}的回复已添加`);
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log(`  ⚠️ ${character.name}的回复为空，跳过`);
        }
      }

      this.momentsManager.renderMoments();
    } catch (error) {
      console.error('处理用户回复失败:', error);
    }
  },

  /**
   * 选中的角色发布朋友圈 - 触发主API生成评论
   * @param {string} momentId - 朋友圈ID
   * @param {Array} selectedCharacters - 选中的角色数组
   * @param {Array} allGroupCharacters - 分组内的所有角色
   */
  onMomentPublishedBySelectedRoles: async function(momentId, selectedCharacters, allGroupCharacters) {
    try {
      const moment = this.momentsManager.moments.find(m => m.id === momentId);
      if (!moment) return;

      console.log('🎯 选中的角色发布朋友圈');
      console.log('  朋友圈ID:', momentId);
      console.log('  选中角色数:', selectedCharacters.length);
      console.log('  分组内所有角色数:', allGroupCharacters.length);

      // 第一步：选中的角色生成评论
      const generatedComments = [];
      for (let i = 0; i < selectedCharacters.length; i++) {
        const character = selectedCharacters[i];
        console.log(`\n  [${i + 1}/${selectedCharacters.length}] 生成${character.name}的评论...`);

        const commentContent = await this.generateCharacterComment(character, moment, {
          existingComments: generatedComments
        });

        if (commentContent && commentContent.trim()) {
          const comment = this.momentsManager.addComment(momentId, {
            author: character.name,
            authorAvatar: character.avatar || '',
            content: commentContent,
            isUserComment: false
          });

          generatedComments.push({
            author: character.name,
            content: commentContent
          });

          console.log(`  ✅ ${character.name}的评论已添加`);
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log(`  ⚠️ ${character.name}的评论为空，跳过`);
        }
      }

      // 第二步：分组内其他未被选中的角色也生成评论
      const unselectedCharacters = allGroupCharacters.filter(c =>
        !selectedCharacters.find(sc => (sc.id || sc.name) === (c.id || c.name))
      );

      if (unselectedCharacters.length > 0) {
        console.log(`\n📢 分组内还有 ${unselectedCharacters.length} 个未被选中的角色，他们也会生成评论`);
        
        for (let i = 0; i < unselectedCharacters.length; i++) {
          const character = unselectedCharacters[i];
          console.log(`  [${i + 1}/${unselectedCharacters.length}] 生成${character.name}的评论...`);

          const commentContent = await this.generateCharacterComment(character, moment, {
            existingComments: generatedComments
          });

          if (commentContent && commentContent.trim()) {
            const comment = this.momentsManager.addComment(momentId, {
              author: character.name,
              authorAvatar: character.avatar || '',
              content: commentContent,
              isUserComment: false
            });

            generatedComments.push({
              author: character.name,
              content: commentContent
            });

            console.log(`  ✅ ${character.name}的评论已添加`);
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.log(`  ⚠️ ${character.name}的评论为空，跳过`);
          }
        }
      }

      // 第三步：触发角色间互动
      if (generatedComments.length > 1) {
        console.log('\n🔄 触发角色间互动...');
        await this.triggerCharacterInteraction(momentId, allGroupCharacters, generatedComments);
      }

      this.momentsManager.renderMoments();
      console.log('✨ 选中角色发布朋友圈流程完成');
    } catch (error) {
      console.error('处理选中角色朋友圈发布失败:', error);
    }
  },

  /**
   * 为选中的角色生成朋友圈内容并发布
   * @param {Array} selectedCharacters - 选中的角色数组
   * @param {Array} allGroupCharacters - 分组内的所有角色
   * @param {string} groupId - 分组ID
   */
  publishMomentsBySelectedRoles: async function(selectedCharacters, allGroupCharacters, groupId) {
    try {
      console.log('🎯 为选中的角色生成朋友圈内容');
      console.log('  选中角色数:', selectedCharacters.length);
      console.log('  分组内所有角色数:', allGroupCharacters.length);

      const groups = this.momentsManager.getFriendGroups();
      const groupNameMap = {};
      (groups || []).forEach(g => {
        if (g && g.id) groupNameMap[g.id] = g.name || '未命名分组';
      });
      const visibilityGroups = groupId === 'group_all' ? ['group_all'] : [groupId];
      const visibilityName = groupId === 'group_all'
        ? '所有好友'
        : (groupNameMap[groupId] || '分组');

      // 为每个选中的角色生成朋友圈内容
      for (let i = 0; i < selectedCharacters.length; i++) {
        const character = selectedCharacters[i];
        console.log(`\n  [${i + 1}/${selectedCharacters.length}] 为${character.name}生成朋友圈内容...`);

        // 生成朋友圈内容
        const momentContent = await this.generateMomentContent(character);

        if (momentContent && momentContent.trim()) {
          console.log(`  ✅ ${character.name}的朋友圈内容已生成`);
          
          // 创建朋友圈
          const moment = this.momentsManager.addMoment({
            author: character.name,
            authorAvatar: character.avatar || '',
            content: momentContent,
            visibility: visibilityGroups[0] || 'group_all',
            visibilityGroups: visibilityGroups,
            visibilityName: visibilityName,
            isUserPost: false
          });

          console.log(`  ✅ ${character.name}的朋友圈已创建: ${moment.id}`);

          // 触发分组内所有角色的评论
          await this.onMomentPublishedBySelectedRoles(moment.id, selectedCharacters, allGroupCharacters);

          // 延迟以避免API限流
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`  ⚠️ ${character.name}的朋友圈内容为空，跳过`);
        }
      }

      this.momentsManager.renderMoments();
      console.log('✨ 角色朋友圈发布流程完成');
    } catch (error) {
      console.error('为选中角色生成朋友圈失败:', error);
    }
  },

  /**
   * 生成朋友圈内容
   * @param {Object} character - 角色对象
   * @returns {Promise<string>} 生成的朋友圈内容
   */
  generateMomentContent: async function(character) {
    try {
      const appState = this.momentsManager.getAppState();
      if (!appState || !appState.apiSettings) {
        console.warn('API设置不完整，无法生成朋友圈内容');
        return null;
      }

      const characterSettings = this.getCharacterSettings(character);
      if (!characterSettings) {
        console.warn(`⚠️ 角色${character.name}没有设定信息，跳过朋友圈生成`);
        return null;
      }

      // 构建提示词
      const messages = this.buildMomentPrompt(character, characterSettings);

      // 调用主API生成朋友圈内容
      const response = await this.callMainAPI(appState, messages, { maxTokens: 8000 });
      if (!response) {
        console.warn(`⚠️ API调用失败，${character.name}的朋友圈内容未生成`);
        return null;
      }
      return response;
    } catch (error) {
      console.error('生成朋友圈内容失败:', error);
      return null;
    }
  },

  /**
   * 获取与角色的最近N条对话
   * @param {Object} character - 角色对象
   * @param {number} count - 获取的对话数量
   * @returns {Array} 对话数组
   */
  getRecentMessagesWithCharacter: function(character, count = 20) {
    try {
      const appState = this.momentsManager.getAppState();
      if (!appState || !appState.messages) return [];

      const convId = character.id;
      const messages = appState.messages[convId] || [];
      if (!Array.isArray(messages)) return [];

      return messages.slice(-count);
    } catch (e) {
      console.error('获取角色对话失败:', e);
      return [];
    }
  },

  /**
   * 构建朋友圈内容生成提示词
   * @param {Object} character - 角色
   * @param {Object} settings - 角色设定
   * @param {Array} recentMessages - 最近的对话
   * @returns {string} 提示词
   */
  buildMomentPrompt: function(character, settings) {
    const bundle = this.buildRoleContextBundle(character, settings);
    const userContext = bundle.userContext || {};
    const roleSettings = bundle.settings || settings || {};

    const systemLines = [];
    systemLines.push('你要严格作为一个真实的人类进行角色扮演。');
    systemLines.push('');
    systemLines.push('【角色信息】');
    systemLines.push(`好友名称：${roleSettings.name || '角色'}`);
    if (roleSettings.charNickname) {
      systemLines.push(`角色网名：${roleSettings.charNickname}`);
    }
    if (roleSettings.remark) {
      systemLines.push(`备注名称：${roleSettings.remark}`);
    }
    if (roleSettings.personality) {
      systemLines.push(`性格：${roleSettings.personality}`);
    }
    if (roleSettings.description) {
      systemLines.push(`角色设定：${roleSettings.description}`);
    }

    systemLines.push('');
    systemLines.push('【用户信息】');
    systemLines.push(`我的名字：${userContext.userNameForChar || '用户'}`);
    if (userContext.userNicknameForChar) {
      systemLines.push(`我的网名：${userContext.userNicknameForChar}`);
    }
    if (userContext.userPersonality) {
      systemLines.push(`人设内容：${userContext.userPersonality}`);
    }

    if (bundle.recentChatText) {
      systemLines.push('');
      systemLines.push('【聊天页面最新50楼层】');
      systemLines.push(bundle.recentChatText);
    }
    if (bundle.offlineChatText) {
      systemLines.push('');
      systemLines.push('【线下页面最新10楼层】');
      systemLines.push(bundle.offlineChatText);
    }

    const userLines = [];
    userLines.push('【任务】');
    userLines.push(`请作为${roleSettings.name || '角色'}，基于你的性格和最近对话生成一条朋友圈内容。`);
    userLines.push('要求：');
    userLines.push('1. 保持角色设定，不能OOC（出戏）');
    userLines.push('2. 内容要自然、有趣、符合角色性格');
    userLines.push('3. 可以是日常分享、感悟、吐槽等');
    userLines.push('4. 长度：30-120字');
    userLines.push('5. 只输出朋友圈内容，不要包含其他文字');

    return [
      { role: 'system', content: systemLines.join('\n') },
      { role: 'user', content: userLines.join('\n') }
    ];
  },

  /**
   * 检查并触发自动生成朋友圈
   * 在用户与角色聊天时调用
   * 根据对话上下文智能判断是否发送朋友圈
   * @param {string} characterId - 角色ID
   * @param {string} characterName - 角色名称
   */
  checkAndTriggerAutoMoments: async function(characterId, characterName) {
    try {
      const appState = this.momentsManager.getAppState();
      if (!appState) return;

      // 检查是否启用了自动生成朋友圈
      const autoMomentsSettings = this.momentsManager.autoMomentsSettings || appState.autoMomentsSettings;
      if (!autoMomentsSettings || !autoMomentsSettings.enabled) {
        return;
      }

      // 检查该角色是否在自动生成列表中
      if (!autoMomentsSettings.characterIds || !autoMomentsSettings.characterIds.includes(characterId)) {
        return;
      }

      // 智能判断：是否应该发送朋友圈
      // 根据对话频率、时间间隔等因素决定
      if (!this.shouldTriggerAutoMoments(characterId)) {
        console.log(`⏭️ ${characterName}暂时不发朋友圈（根据对话上下文判断）`);
        return;
      }

      console.log(`🎯 ${characterName}决定发朋友圈`);

      // 获取角色对象
      const friends = appState.friends || [];
      const character = friends.find(f => f.id === characterId || f.name === characterName);
      if (!character) {
        console.warn(`⚠️ 找不到角色: ${characterName}`);
        return;
      }

      // 生成朋友圈内容
      const momentContent = await this.generateMomentContent(character);
      if (!momentContent || !momentContent.trim()) {
        console.warn(`⚠️ ${characterName}的朋友圈内容为空`);
        return;
      }

      // 处理可见分组
      const groups = this.momentsManager.getFriendGroups();
      const groupNameMap = {};
      (groups || []).forEach(g => {
        if (g && g.id) groupNameMap[g.id] = g.name || '未命名分组';
      });

      let visibilityGroups = Array.isArray(autoMomentsSettings.groupIds)
        ? autoMomentsSettings.groupIds.filter(Boolean)
        : [];
      if (visibilityGroups.length === 0 || visibilityGroups.includes('group_all')) {
        visibilityGroups = ['group_all'];
      }

      const visibilityName = visibilityGroups[0] === 'group_all'
        ? '所有好友'
        : visibilityGroups.map(id => groupNameMap[id] || '未命名分组').join('、');

      // 创建朋友圈
      const moment = this.momentsManager.addMoment({
        author: character.name,
        authorAvatar: character.avatar || '',
        content: momentContent,
        visibilityGroups: visibilityGroups,
        visibility: visibilityGroups[0] || 'group_all',
        visibilityName: visibilityName,
        isUserPost: false
      });

      console.log(`✅ ${characterName}的朋友圈已发布: ${moment.id}`);

      // 记录该角色最后发朋友圈的时间
      if (!this.lastAutoMomentsTime) {
        this.lastAutoMomentsTime = {};
      }
      this.lastAutoMomentsTime[characterId] = Date.now();

      // 触发分组内评论
      const allGroupCharacters = this.getGroupCharacters(visibilityGroups);
      await this.onMomentPublishedBySelectedRoles(moment.id, [character], allGroupCharacters);

      // 刷新显示
      this.momentsManager.renderMoments();

      // 显示通知
      this.showAutoMomentsNotification(character.name, momentContent);

    } catch (error) {
      console.error('触发自动生成朋友圈失败:', error);
    }
  },

  /**
   * 智能判断是否应该发送朋友圈
   * 模拟真实人类的行为：不是每次都发，而是根据上下文判断
   * @param {string} characterId - 角色ID
   * @returns {boolean} 是否应该发送
   */
  shouldTriggerAutoMoments: function(characterId) {
    // 30% 的概率发送朋友圈（模拟真实人类行为）
    const randomChance = Math.random();
    if (randomChance > 0.3) {
      return false;
    }

    // 检查时间间隔：同一个角色不能在短时间内连续发朋友圈
    if (!this.lastAutoMomentsTime) {
      this.lastAutoMomentsTime = {};
    }

    const lastTime = this.lastAutoMomentsTime[characterId];
    if (lastTime) {
      const timeDiff = Date.now() - lastTime;
      // 如果距离上次发朋友圈少于5分钟，则不发
      const minInterval = 5 * 60 * 1000; // 5分钟
      if (timeDiff < minInterval) {
        return false;
      }
    }

    return true;
  },

  /**
   * 显示自动生成朋友圈的通知
   * @param {string} characterName - 角色名称
   * @param {string} momentContent - 朋友圈内容
   */
  showAutoMomentsNotification: function(characterName, momentContent) {
    try {
      // 创建通知元素
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
        font-size: 14px;
        line-height: 1.5;
      `;

      notification.innerHTML = `
        <div style="font-weight: 600;margin-bottom:8px;">
          <i class="fas fa-star" style="margin-right:8px;"></i>${characterName}发布了朋友圈
        </div>
        <div style="font-size:13px;opacity:0.9;margin-bottom:8px;">
          ${momentContent.substring(0, 50)}${momentContent.length > 50 ? '...' : ''}
        </div>
        <div style="font-size:12px;opacity:0.8;">
          点击朋友圈查看详情
        </div>
      `;

      // 添加样式动画
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      if (!document.querySelector('style[data-auto-moments]')) {
        style.setAttribute('data-auto-moments', 'true');
        document.head.appendChild(style);
      }

      // 添加点击事件
      notification.style.cursor = 'pointer';
      notification.addEventListener('click', () => {
        // 可以在这里添加跳转到朋友圈的逻辑
        console.log('用户点击了通知');
      });

      // 添加到页面
      document.body.appendChild(notification);

      // 3秒后自动移除
      setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);

      console.log('✓ 通知已显示');
    } catch (error) {
      console.error('显示通知失败:', error);
    }
  }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
module.exports = MomentsGroupInteraction;
}