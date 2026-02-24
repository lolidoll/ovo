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

  /**
   * 获取分组内的所有角色
   * @param {string} groupId - 分组ID
   * @returns {Array} 分组内的角色列表
   */
  getGroupCharacters: function(groupId) {
    try {
      const appState = this.momentsManager.getAppState();
      if (!appState || !appState.friends) return [];

      // 如果是"所有好友"分组，返回所有角色
      if (groupId === 'group_all') {
        return appState.friends || [];
      }

      // 否则，从分组中获取成员
      const group = appState.friendGroups?.find(g => g.id === groupId);
      if (!group || !group.memberIds) return [];

      // 根据memberIds获取对应的角色
      return appState.friends.filter(f => group.memberIds.includes(f.id)) || [];
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
      // 优先从角色对象本身获取设定（角色设置页面的设定）
      if (character.personality || character.description) {
        return {
          name: character.name,
          description: character.description || '',
          personality: character.personality || '',
          avatar: character.avatar || ''
        };
      }

      // 如果角色对象中没有设定，尝试从conversations中查找
      const appState = this.momentsManager.getAppState();
      if (!appState || !appState.conversations) return null;

      const conversation = appState.conversations.find(c => c.id === character.id);
      if (!conversation) return null;

      return {
        name: character.name,
        description: conversation.description || '',
        personality: conversation.personality || '',
        avatar: character.avatar || ''
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

      // 构建提示词
      const prompt = this.buildCommentPrompt(character, moment, characterSettings, context);

      // 调用主API
      const response = await this.callMainAPI(appState, prompt);
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
    let prompt = `你要严格作为一个真实的人类进行角色扮演。\n\n`;
    
    // 角色设定
    prompt += `【角色设定】\n`;
    prompt += `名字：${settings.name}\n`;
    if (settings.personality) {
      prompt += `性格：${settings.personality}\n`;
    }
    if (settings.description) {
      prompt += `背景：${settings.description}\n`;
    }
    prompt += `\n`;

    // 朋友圈内容
    prompt += `【朋友圈内容】\n`;
    prompt += `发布者：${moment.author}\n`;
    prompt += `内容：${moment.content}\n`;
    prompt += `\n`;

    // 任务
    prompt += `【任务】\n`;
    if (context.isReplyToUser) {
      prompt += `用户评论了这条朋友圈，你需要作为${settings.name}回复用户的评论。\n`;
      prompt += `用户评论：${context.userComment}\n`;
      prompt += `要求：\n`;
      prompt += `1. 保持角色设定，不能OOC（出戏）\n`;
      prompt += `2. 回复要自然、有趣、符合角色性格\n`;
      prompt += `3. 长度：10-50字\n`;
      prompt += `4. 只输出回复内容，不要包含其他文字\n`;
    } else {
      prompt += `请作为${settings.name}对这条朋友圈进行评论。\n`;
      prompt += `要求：\n`;
      prompt += `1. 保持角色设定，不能OOC（出戏）\n`;
      prompt += `2. 评论要自然、有趣、符合角色性格\n`;
      prompt += `3. 长度：10-50字\n`;
      prompt += `4. 只输出评论内容，不要包含其他文字\n`;
      
      // 如果有其他角色的评论，可以参考
      if (context.existingComments && context.existingComments.length > 0) {
        prompt += `\n【已有的评论】\n`;
        context.existingComments.forEach((comment, index) => {
          prompt += `${index + 1}. ${comment.author}：${comment.content}\n`;
        });
        prompt += `\n你的评论应该与已有评论不同，避免重复。\n`;
      }
    }

    return prompt;
  },

  /**
   * 调用主API
   * @param {Object} appState - 应用状态
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} API响应
   */
  callMainAPI: async function(appState, prompt) {
    try {
      const api = appState.apiSettings || {};
      if (!api.endpoint || !api.selectedModel) {
        console.warn('API配置不完整');
        return null;
      }

      const normalized = api.endpoint.replace(/\/$/, '');
      const baseEndpoint = normalized.endsWith('/v1') ? normalized : normalized + '/v1';
      const endpoint = baseEndpoint + '/chat/completions';

      const body = {
        model: api.selectedModel,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: api.temperature !== undefined ? api.temperature : 0.8,
        max_tokens: 100,
        frequency_penalty: api.frequencyPenalty !== undefined ? api.frequencyPenalty : 0.2,
        presence_penalty: api.presencePenalty !== undefined ? api.presencePenalty : 0.1,
        top_p: api.topP !== undefined ? api.topP : 1.0
      };

      const fetchOptions = {
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          api.apiKey ? { 'Authorization': 'Bearer ' + api.apiKey } : {}
        ),
        body: JSON.stringify(body)
      };

      console.log('📤 调用主API生成角色评论...');
      const response = await fetch(endpoint, fetchOptions);

      if (!response.ok) {
        console.error(`API请求失败 [${response.status}]:`, response.statusText);
        return null;
      }

      const data = await response.json();
      
      // 提取响应内容
      if (data.choices && data.choices.length > 0) {
        const content = data.choices[0].message?.content || '';
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
      console.log('  可见范围:', moment.visibility);

      // 获取分组内的所有角色
      const characters = this.getGroupCharacters(moment.visibility);
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
  onUserComment: async function(momentId, userComment, targetCharacterName) {
    try {
      const moment = this.momentsManager.moments.find(m => m.id === momentId);
      if (!moment) return;

      console.log('💬 用户评论已提交，触发角色回复...');
      console.log('  用户评论:', userComment);
      console.log('  目标角色:', targetCharacterName);

      // 获取分组内的所有角色
      const characters = this.getGroupCharacters(moment.visibility);
      
      // 找到目标角色
      const targetCharacter = characters.find(c => c.name === targetCharacterName);
      if (!targetCharacter) {
        console.log('  目标角色不在分组内');
        return;
      }

      // 目标角色回复用户
      console.log(`\n  [主回复] ${targetCharacter.name}正在回复用户...`);
      const targetReply = await this.generateCharacterComment(targetCharacter, moment, {
        isReplyToUser: true,
        userComment: userComment
      });

      if (targetReply && targetReply.trim()) {
        this.momentsManager.addComment(momentId, {
          author: targetCharacter.name,
          authorAvatar: targetCharacter.avatar || '',
          content: targetReply,
          isUserComment: false
        });

        console.log(`  ✅ ${targetCharacter.name}的回复已添加`);
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.log(`  ⚠️ ${targetCharacter.name}的回复为空，跳过`);
      }

      // 其他角色根据情况决定是否回复
      const otherCharacters = characters.filter(c => c.id !== targetCharacter.id);
      if (otherCharacters.length > 0) {
        console.log(`\n  [其他角色] 检查其他${otherCharacters.length}个角色是否要回复...`);
        
        for (const character of otherCharacters) {
          // 30%的概率其他角色会回复
          if (Math.random() < 0.3) {
            console.log(`  ${character.name}决定加入讨论...`);
            
            const otherReply = await this.generateCharacterComment(character, moment, {
              isReplyToUser: true,
              userComment: userComment,
              targetCharacter: targetCharacter.name
            });

            if (otherReply && otherReply.trim()) {
              this.momentsManager.addComment(momentId, {
                author: character.name,
                authorAvatar: character.avatar || '',
                content: otherReply,
                isUserComment: false
              });

              console.log(`  ✅ ${character.name}的回复已添加`);
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              console.log(`  ⚠️ ${character.name}的回复为空，跳过`);
            }
          }
        }
      }

      this.momentsManager.renderMoments();
    } catch (error) {
      console.error('处理用户评论失败:', error);
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
            visibility: groupId,
            visibilityName: '分组',
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

      // 获取与该角色的最近20条对话
      const recentMessages = this.getRecentMessagesWithCharacter(character, 20);

      // 构建提示词
      const prompt = this.buildMomentPrompt(character, characterSettings, recentMessages);

      // 调用主API生成朋友圈内容
      const response = await this.callMainAPI(appState, prompt);
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

      // 查找与该角色相关的对话
      const characterMessages = appState.messages.filter(msg => {
        // 检查消息是否与该角色相关
        return msg.characterId === character.id ||
               msg.characterName === character.name ||
               msg.author === character.name;
      });

      // 返回最近的N条对话
      return characterMessages.slice(-count);
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
  buildMomentPrompt: function(character, settings, recentMessages) {
    let prompt = `你要严格作为一个真实的人类进行角色扮演。\n\n`;

    // 角色设定
    prompt += `【角色设定】\n`;
    prompt += `名字：${settings.name}\n`;
    if (settings.personality) {
      prompt += `性格：${settings.personality}\n`;
    }
    if (settings.description) {
      prompt += `背景：${settings.description}\n`;
    }
    prompt += `\n`;

    // 最近的对话上下文
    if (recentMessages && recentMessages.length > 0) {
      prompt += `【最近的对话】\n`;
      recentMessages.forEach((msg, index) => {
        const author = msg.author || msg.characterName || '用户';
        prompt += `${index + 1}. ${author}：${msg.content || msg.text}\n`;
      });
      prompt += `\n`;
    }

    // 任务
    prompt += `【任务】\n`;
    prompt += `请作为${settings.name}，基于你的性格和最近的对话，生成一条朋友圈内容。\n`;
    prompt += `要求：\n`;
    prompt += `1. 保持角色设定，不能OOC（出戏）\n`;
    prompt += `2. 内容要自然、有趣、符合角色性格\n`;
    prompt += `3. 可以是日常分享、感悟、吐槽等\n`;
    prompt += `4. 长度：30-100字\n`;
    prompt += `5. 只输出朋友圈内容，不要包含其他文字\n`;

    return prompt;
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
      const autoMomentsSettings = appState.autoMomentsSettings;
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

      // 创建朋友圈
      const moment = this.momentsManager.addMoment({
        author: character.name,
        authorAvatar: character.avatar || '',
        content: momentContent,
        isUserPost: false
      });

      console.log(`✅ ${characterName}的朋友圈已发布: ${moment.id}`);

      // 记录该角色最后发朋友圈的时间
      if (!this.lastAutoMomentsTime) {
        this.lastAutoMomentsTime = {};
      }
      this.lastAutoMomentsTime[characterId] = Date.now();

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