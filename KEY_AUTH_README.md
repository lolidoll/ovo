# 密钥验证系统 - 快速参考

## 🎯 系统架构

```
GitHub Pages (前端)          Vercel (后端)
┌────────────────────┐       ┌────────────────────┐
│  index.html        │       │  api/verify-key   │
│  key-auth.js       │◄─────►│  api/manage-keys   │
│  auth-modal.js     │       │  (环境变量密钥)    │
└────────────────────┘       └────────▲────┬──────┘
                                     │    │
                                     │    └──────► Upstash Redis
                                     │             (使用记录)
                                     │
                        ┌────────────┴─────────┐
                        │   Discord OAuth       │
                        │   api/callback        │
                        └───────────────────────┘
```

## 📦 已创建/修改的文件

| 文件 | 状态 | 说明 |
|------|:----:|------|
| `api/verify-key.js` | ✅ 新建 | 密钥验证 API |
| `api/manage-keys.js` | ✅ 新建 | 密钥管理 API |
| `key-auth.js` | ✅ 新建 | 前端密钥验证 |
| `key-auth.css` | ✅ 新建 | 密钥输入框样式 |
| `auth-modal.js` | ✅ 修改 | 集成密钥验证 |
| `index.html` | ✅ 修改 | 引入新文件 |
| `login.js` | ✅ 修改 | 检查密钥状态 |

## 🚀 部署前操作

### 1. Upstash Redis
- 访问 [upstash.com](https://upstash.com/)
- 创建免费 Redis 数据库
- 复制 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`

### 2. Vercel 环境变量

在 Vercel Dashboard 配置：

```bash
# 必须配置
REDIS_URL=https://xxx-xxx.upstash.io
REDIS_TOKEN=AXXxxx...
VALID_KEYS=test123,abc456,xyz789
ADMIN_PASSWORD=your_password

# Discord
DISCORD_CLIENT_SECRET=your_discord_secret
```

### 3. 重新部署

```bash
git add .
git commit -m "Add key auth system"
git push
```

## 🧪 测试

```bash
# 测试密钥验证
curl "https://ovo-psi.vercel.app/api/verify-key?key=test123"
```

## 📝 用户流程

1. 访问网页 → 显示密钥输入框
2. 输入密钥 → 验证成功
3. 显示 Discord 登录按钮
4. Discord 登录 → 进入主界面

## ⚙️ 添加新密钥

```javascript
fetch('https://ovo-psi.vercel.app/api/manage-keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    password: 'your_admin_password',
    action: 'generate'
  })
})
.then(res => res.json())
.then(data => {
  // 将 data.key 添加到 Vercel 环境变量 VALID_KEYS
  // 然后重新部署
});
```

## 📚 详细文档

完整部署指南请查看 [KEY_AUTH_DEPLOYMENT_GUIDE.md](KEY_AUTH_DEPLOYMENT_GUIDE.md)
