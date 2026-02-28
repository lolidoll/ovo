#!/usr/bin/env python
# -*- coding: utf-8 -*-

import re

# 新菜单HTML
new_menu = '''            <div class="menu-list">
                <div class="menu-item" data-func="emoji">
                    <div class="menu-icon">
                        <svg class="icon-svg" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                            <line x1="9" y1="9" x2="9.01" y2="9"></line>
                            <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                    </div>
                    <div class="menu-text">表情包</div>
                </div>
                
                <div class="menu-item" data-func="worldbook">
                    <div class="menu-icon">
                        <svg class="icon-svg" viewBox="0 0 24 24">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                            <path d="M12 13v2"></path>
                        </svg>
                    </div>
                    <div class="menu-text">世界书</div>
                </div>
                
                <div class="menu-item" data-func="user-persona">
                    <div class="menu-icon">
                        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="8" r="5"></circle>
                            <path d="M3 21c0-4 4-7 9-7s9 3 9 7"></path>
                        </svg>
                    </div>
                    <div class="menu-text">人设</div>
                </div>
                
                <div class="menu-item" data-func="collection">
                    <div class="menu-icon">
                        <svg class="icon-svg" viewBox="0 0 24 24">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div class="menu-text">收藏</div>
                </div>
                
                <div class="menu-divider"></div>
                
                <div class="menu-item" data-func="prompt-templates" style="opacity: 0.5; pointer-events: none;">
                    <div class="menu-icon">
                        <svg class="icon-svg" viewBox="0 0 24 24">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            <line x1="9" y1="10" x2="15" y2="10"></line>
                            <line x1="9" y1="14" x2="13" y2="14"></line>
                        </svg>
                    </div>
                    <div class="menu-text">提示词</div>
                </div>
                
                <div class="menu-item" data-func="preset">
                    <div class="menu-icon">
                        <svg class="icon-svg" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                            <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                        </svg>
                    </div>
                    <div class="menu-text">线下预设</div>
                </div>
                
                <div class="menu-item" data-func="wallet">
                    <div class="menu-icon">
                        <svg class="icon-svg" viewBox="0 0 24 24">
                            <rect x="2" y="6" width="20" height="14" rx="2"></rect>
                            <path d="M2 10h20"></path>
                            <circle cx="16" cy="14" r="1.5"></circle>
                        </svg>
                    </div>
                    <div class="menu-text">钱包</div>
                </div>
                
                <div class="menu-item" data-func="couples-space">
                    <div class="menu-icon">
                        <svg class="icon-svg" viewBox="0 0 24 24">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </div>
                    <div class="menu-text">情侣空间</div>
                </div>
                
                <div class="menu-item" data-func="decoration">
                    <div class="menu-icon">
                        <svg class="icon-svg" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M12 2v4"></path>
                            <path d="M12 18v4"></path>
                            <path d="M4.93 4.93l2.83 2.83"></path>
                            <path d="M16.24 16.24l2.83 2.83"></path>
                            <path d="M2 12h4"></path>
                            <path d="M18 12h4"></path>
                            <path d="M4.93 19.07l2.83-2.83"></path>
                            <path d="M16.24 7.76l2.83-2.83"></path>
                        </svg>
                    </div>
                    <div class="menu-text">个性装扮</div>
                </div>
                
                <div class="menu-item" data-func="api-settings">
                    <div class="menu-icon">
                        <svg class="icon-svg" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                            <circle cx="17.5" cy="17.5" r="3.5"></circle>
                        </svg>
                    </div>
                    <div class="menu-text">API设置</div>
                </div>
                
                <div class="menu-item" data-func="settings">
                    <div class="menu-icon">
                        <svg class="icon-svg" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </div>
                    <div class="menu-text">设置</div>
                </div>
            </div>'''

# 读取文件
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 找出并替换菜单部分
# 从 <div class="menu-list"> 到第一个闭合的 </div>之后
pattern = r'<div class="menu-list">.*?</div>\s*</div>'
match = re.search(pattern, content, re.DOTALL)

if match:
    old_menu = match.group()
    content = content.replace(old_menu, new_menu + '\n        </div>')
    
    # 写回文件
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('✓ 侧边栏菜单已成功更新')
else:
    print('✗ 未找到菜单')
