# 🎯 密钥验证系统 - 部署操作清单

## ✅ 已完成的工作

### 1. 后端 API（Vercel 部署）
- ✅ `api/verify-key.js` - 密钥验证 API
- ✅ `api/manage-keys.js` - 密钥管理 API

### 2. 前端文件（GitHub Pages 部署）
- ✅ `key-auth.js` - 密钥验证前端逻辑
- ✅ `key-auth.css` - 密钥输入框样式
- ✅ `auth-modal.js` - 集成密钥验证

### 3. 文档
- ✅ `KEY_AUTH_DEPLOYMENT_GUIDE.md` - 详细部署指南
- ✅ `KEY_AUTH_README.md` - 快速参考

---

## 📋 你需要做的操作

### 步骤 1: 准备 Upstash Redis

1. 访问 **https://upstash.com/**
2. 注册/登录账户
3. 点击 **"Create Database"**
4. 配置：
   - **Database Name**: `ovo-auth`
   - **Region**: 选择 `ap-northeast-1` (东京) 或离用户最近的区域
   - **Tier**: 选择 **Free** 免费套餐
5. 点击 **"Create"**
6. 进入数据库详情页，找到 **"REST API"** 标签
7. 复制以下信息：
   - `UPSTASH_REDIS_REST_URL` → 记为 `REDIS_URL`
   - `UPSTASH_REDIS_REST_TOKEN` → 记为 `REDIS_TOKEN`

### 步骤 2: 配置 Vercel 环境变量

1. 访问 **https://vercel.com/** 
2. 进入你的 **`ovo-psi`** 项目
3. 点击 **Settings** → **Environment Variables**
4. 添加以下变量（**选择所有环境**: Production, Preview, Development）：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `REDIS_URL` | 你复制的 Upstash URL | Redis 连接地址 |
| `REDIS_TOKEN` | 你复制的 Upstash Token | Redis 认证令牌 |
| `VALID_KEYS` | `test123,abc456,xyz789` | 有效密钥列表（逗号分隔） |
| `ADMIN_PASSWORD` | 设置一个强密码 | 管理员密码 |
| `DISCORD_CLIENT_SECRET` | (已有) | Discord 密钥 |

**示例 `VALID_KEYS`**: 
```
potato123,chip456,snack789,fries321
```

5. 点击 **"Save"** 保存每个变量

### 步骤 3: 部署后端到 Vercel

**方法 1: 通过 Vercel Dashboard**
1. 进入 **`ovo-psi`** 项目
2. 点击 **"Deployments"**
3. 点击最新部署右侧的 **"..."** → **"Redeploy"**
4. 等待部署完成（约 1-2 分钟）

**方法 2: 通过 Git（如果 ovo-psi 有 Git 仓库）**
```bash
cd /path/to/ovo-psi
git add api/verify-key.js api/manage-keys.js
git commit -m "Add key verification API"
git push
```

### 步骤 4: 测试后端 API

```bash
# 测试密钥验证（将 test123 替换为你在 VALID_KEYS 中设置的密钥）
curl "https://ovo-psi.vercel.app/api/verify-key?key=test123"
```

**预期返回（首次验证）**:
```json
{"success":true,"code":"KEY_VALID","message":"密钥验证成功"}
```

**预期返回（再次验证同一密钥）**:
```json
{"error":"密钥已使用","code":"KEY_ALREADY_USED","message":"该密钥已被使用，已永久失效"}
```

### 步骤 5: 部署前端到 GitHub Pages

将以下文件复制/推送到你的 GitHub 仓库（`ovo`）：

**需要推送的文件**:
```
ovo-main/
├── api/
│   ├── verify-key.js      ← 新建
│   └── manage-keys.js     ← 新建
├── key-auth.js            ← 新建
├── key-auth.css           ← 新建
├── auth-modal.js          ← 已修改
├── index.html             ← 已修改
└── login.js               ← 已修改
```

**推送方式**:
```bash
# 在 ovo-main 目录
git init
git add .
git commit -m "Add key verification system"
# 添加你的 GitHub 远程仓库
git remote add origin https://github.com/lolidoll/ovo.git
git push -u origin main
```

### 步骤 6: 验证完整流程

1. 访问 **https://lolidoll.github.io/ovo/**
2. 应该看到密钥输入框
3. 输入你设置的密钥（如 `test123`）
4. 验证成功后，看到 Discord 登录按钮
5. 完成 Discord 登录
6. 进入主界面

---

## 🎁 额外功能

### 查看密钥使用统计

```javascript
// 在浏览器控制台执行
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
});
```

### 生成新密钥

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
  console.log('新密钥:', data.key);
  // ⚠️ 重要：将此密钥手动添加到 Vercel 环境变量 VALID_KEYS 中！
  // 然后重新部署 Vercel 项目
});
```

---

## ⚠️ 常见问题

### Q1: 密钥添加后仍然显示无效
**A**: 确保你在 Vercel Dashboard 中更新了 `VALID_KEYS` 环境变量，并重新部署了项目

### Q2: 验证失败 "服务器内部错误"
**A**: 检查 Vercel 环境变量 `REDIS_URL` 和 `REDIS_TOKEN` 是否正确配置

### Q3: Discord 登录按钮不显示
**A**: 
1. 清除浏览器缓存
2. 清除 localStorage: `localStorage.clear()`
3. 刷新页面重新测试

---

## 📊 文件对照表

| 文件 | 用途 | 部署位置 |
|------|------|---------|
| `api/verify-key.js` | 密钥验证 API | Vercel |
| `api/manage-keys.js` | 密钥管理 API | Vercel |
| `key-auth.js` | 前端密钥验证 | GitHub Pages |
| `key-auth.css` | 密钥输入框样式 | GitHub Pages |
| `auth-modal.js` | 认证模态框（已修改） | GitHub Pages |
| `index.html` | 主页面（已修改） | GitHub Pages |
| `login.js` | 登录逻辑（已修改） | GitHub Pages |

---

## ✅ 完成后检查清单

- [ ] Upstash Redis 已创建并获取 URL/Token
- [ ] Vercel 环境变量已配置（5 个变量）
- [ ] Vercel 项目已重新部署
- [ ] API 测试成功（verify-key 返回成功）
- [ ] 前端文件已推送到 GitHub
- [ ] GitHub Pages 已更新
- [ ] 完整登录流程测试通过

---

## 🎉 部署完成

部署完成后，系统将具备：
- ✅ 密钥验证（一次性使用）
- ✅ Discord OAuth 登录
- ✅ 双重安全保障
- ✅ 使用记录追踪

用户需要：
1. 输入你提供的密钥
2. 使用 Discord 登录
3. 完成验证后进入主界面
