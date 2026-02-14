# 密钥验证系统部署指南

## 📋 架构说明

- **前端**: GitHub Pages (`https://lolidoll.github.io/ovo/`)
- **后端**: Vercel Serverless Functions (`https://ovo-psi.vercel.app/`)
- **密钥存储**: Vercel 环境变量 `VALID_KEYS`
- **使用记录**: Upstash Redis

## 🚀 部署步骤

### 步骤 1: 准备 Upstash Redis

1. 访问 [Upstash](https://upstash.com/)
2. 创建免费账户并登录
3. 创建一个新的 Redis 数据库（区域建议选择 `ap-northeast-1` 东京）
4. 获取以下信息：
   - `UPSTASH_REDIS_REST_URL` (或 `REDIS_URL`)
   - `UPSTASH_REDIS_REST_TOKEN` (或 `REDIS_TOKEN`)

```
获取方式：
Upstash Console → 选择你的数据库 → REST API → 复制 URL 和 Token
```

### 步骤 2: 配置 Vercel 环境变量

进入 **Vercel Dashboard** → 你的项目 (`ovo-psi`) → **Settings** → **Environment Variables**

添加以下环境变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `REDIS_URL` | Upstash Redis URL | `https://xxx-xxx-xxx.upstash.io` |
| `REDIS_TOKEN` | Upstash Redis Token | `AXXxxx...` |
| `VALID_KEYS` | 有效的密钥列表（逗号分隔） | `abc123,xyz789,testkey,secret007` |
| `ADMIN_PASSWORD` | 管理员密码 | `your_secure_password_here` |
| `DISCORD_CLIENT_SECRET` | Discord 客户端密钥 | `your_discord_secret` |

**📌 添加环境变量时选择所有环境：** `Production`, `Preview`, `Development`

⚠️ **重要提示**: 
- 每次添加新密钥时，需要手动更新 `VALID_KEYS`
- 环境变量修改后需要重新部署项目才能生效

### 步骤 3: 部署代码到 Vercel

```bash
# 在项目根目录执行
git add .
git commit -m "Add key verification system"
git push origin main
```

Vercel 会自动部署，或者手动触发部署：
- **Vercel Dashboard** → **Deployments** → 点击 **"Redeploy"**

### 步骤 4: 验证部署

```bash
# 测试密钥验证 API（将 testkey 替换为你在 VALID_KEYS 中设置的密钥）
curl "https://ovo-psi.vercel.app/api/verify-key?key=testkey"
```

预期返回：
```json
{"success": true, "code": "KEY_VALID", "message": "密钥验证成功"}
```

## 📝 密钥管理

### 添加新密钥

**方法 1: 通过 Vercel Dashboard（推荐）**

1. 进入 **Vercel Dashboard** → **Settings** → **Environment Variables**
2. 找到 `VALID_KEYS` 变量
3. 点击编辑，添加新密钥到现有列表（用逗号分隔）
4. 例如: `abc123,xyz789,testkey,new_key_123`
5. 点击 **"Save"**
6. 进入 **Deployments** → 点击 **"Redeploy"**（重要！必须重新部署）

**方法 2: 使用 API 生成临时密钥**

```javascript
// 生成新密钥
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
  console.log('新密钥:', data.key);
  // ⚠️ 仍需手动将此密钥添加到 Vercel 环境变量 VALID_KEYS
  console.log('请更新 Vercel 环境变量:', data.instructions);
});
```

### 查看使用统计

```javascript
fetch('https://ovo-psi.vercel.app/api/manage-keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    password: 'your_admin_password'
  })
})
.then(res => res.json())
.then(data => {
  console.log('总密钥数:', data.totalKeys);
  console.log('未使用:', data.unusedKeys);
  console.log('已使用:', data.usedKeys);
  console.log('使用记录:', data.usageLog);
});
```

### 重置已使用的密钥（特殊情况）

```javascript
fetch('https://ovo-psi.vercel.app/api/manage-keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    password: 'your_admin_password',
    action: 'reset_usage',
    key: 'testkey'
  })
})
.then(res => res.json())
.then(data => {
  console.log('密钥状态已重置:', data.message);
});
```

## 🔄 验证流程（双重保障）

```
用户访问 GitHub Pages
        ↓
KeyAuthManager 检查 localStorage
        ↓
   未验证？
        ↓ 是
显示密钥输入模态框
        ↓
用户输入密钥
        ↓
调用 verify-key API
        ↓
后端验证：
  1. 检查密钥是否在 VALID_KEYS
  2. 检查 Redis 是否已使用
  3. 标记为已使用
        ↓
   验证成功
        ↓
保存到 localStorage
        ↓
显示 Discord 登录按钮
        ↓
用户 Discord 登录
        ↓
双重验证完成，隐藏登录框
```

## 🧪 测试 API

```bash
# 1. 验证密钥（首次使用）
curl "https://ovo-psi.vercel.app/api/verify-key?key=testkey"

# 2. 验证已使用的密钥（会返回 403）
curl "https://ovo-psi.vercel.app/api/verify-key?key=testkey"

# 3. 验证不存在的密钥（会返回 404）
curl "https://ovo-psi.vercel.app/api/verify-key?key=invalid"
```

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| [api/verify-key.js](api/verify-key.js) | 密钥验证 API（用户端） |
| [api/manage-keys.js](api/manage-keys.js) | 密钥管理 API（管理员端） |
| [key-auth.js](key-auth.js) | 前端密钥验证模块 |
| [key-auth.css](key-auth.css) | 密钥输入框样式 |
| [auth-modal.js](auth-modal.js) | 认证模态框管理器（已集成密钥验证） |

## 🔍 故障排查

### 问题 1: 验证失败 "服务器内部错误"
**解决方法**:
- 检查 Vercel 环境变量 `REDIS_URL` 和 `REDIS_TOKEN` 是否正确
- 检查 Upstash Redis 是否正常工作（在 Upstash Console 测试连接）
- 查看 Vercel 部署日志

### 问题 2: 密钥验证成功但 Discord 登录按钮不显示
**解决方法**:
- 检查浏览器控制台是否有错误
- 确认 `auth-modal.js` 和 `key-auth.js` 正确加载
- 清除浏览器缓存和 localStorage 重新测试

### 问题 3: 密钥添加后仍然显示无效
**解决方法**:
- ✅ 确认在 Vercel Dashboard 中更新了 `VALID_KEYS`
- ✅ 确认重新部署了项目（环境变量修改后必须重新部署！）
- 等待 1-2 分钟让部署完成
- 检查新密钥格式是否正确（无空格，逗号分隔）

### 问题 4: CORS 错误
**解决方法**:
- 检查 [vercel.json](vercel.json) 中的 CORS 配置
- 确认 API 返回了正确的 CORS 头
- 检查 `api/verify-key.js` 中的 headers 设置

### 问题 5: 密钥在 Redis 中显示已使用
**解决方法**:
```javascript
// 使用管理 API 重置密钥
fetch('https://ovo-psi.vercel.app/api/manage-keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    password: 'your_admin_password',
    action: 'reset_usage',
    key: 'testkey'
  })
})
```

## 🛡️ 安全建议

1. **密钥复杂度**: 使用至少 8 位随机字符串
2. **定期更换**: 建议定期更换有效密钥列表
3. **监控使用**: 定期检查 `api/manage-keys` 的使用统计
4. **单次使用**: 密钥使用后永久失效
5. **日志记录**: Redis 自动记录使用时间和 IP
6. **环境变量**: 不要在代码中硬编码密钥

## 📞 需要你做的操作清单

- [ ] 1. 注册 Upstash 并创建 Redis 数据库
- [ ] 2. 在 Vercel 配置环境变量 (`REDIS_URL`, `REDIS_TOKEN`, `VALID_KEYS`, `ADMIN_PASSWORD`)
- [ ] 3. 部署代码到 Vercel
- [ ] 4. 测试密钥验证 API 是否正常工作
- [ ] 5. 在 GitHub Pages 更新前端代码（确保 `key-auth.js` 被引用）
- [ ] 6. 完整测试登录流程（密钥 + Discord）

## 📄 部署完成后

部署完成后，用户访问流程：

1. 用户打开 `https://lolidoll.github.io/ovo/`
2. 自动弹出密钥输入框
3. 输入你提供的密钥
4. 密钥验证成功后，显示 Discord 登录按钮
5. 完成 Discord 登录后，进入主界面
