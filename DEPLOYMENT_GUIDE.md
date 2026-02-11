# Agent Arena 部署指南

## 🚀 方案 C：Vercel + Railway 部署（支持自定义域名）

### 架构
- **前端**: Vite + React → **Vercel** → `bots-arena.com`
- **后端**: Express → **Railway** → `api.bots-arena.com` (可选)
- **数据库**: Railway PostgreSQL (免费)
- **缓存**: Railway Redis (免费)

---

## 📋 部署步骤

### 步骤 1：推送代码到 GitHub

由于当前环境无法直接推送到 GitHub，请手动执行以下命令：

```bash
cd ~/.openclaw/workspace/agent-arena/

# 1. 在 GitHub 上创建新仓库（名称：agent-arena）
# 访问: https://github.com/new

# 2. 添加远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/agent-arena.git

# 3. 推送代码
git push -u origin main
```

---

### 步骤 2：部署后端到 Railway

1. **注册/登录 Railway**
   - 访问: https://railway.app/
   - 使用 GitHub 账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择 `agent-arena` 仓库

3. **添加数据库服务**
   - 点击 "New" → "Database" → "Add PostgreSQL"
   - 点击 "New" → "Database" → "Add Redis"

4. **配置环境变量**
   在项目 Settings → Variables 中添加：
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   JWT_SECRET=your-super-secret-jwt-key-change-this
   NODE_ENV=production
   PORT=3000
   ```

5. **部署**
   - Railway 会自动检测 `package.json` 并部署
   - 等待部署完成，获得域名: `https://agent-arena-api.up.railway.app`

---

### 步骤 3：部署前端到 Vercel

1. **注册/登录 Vercel**
   - 访问: https://vercel.com/
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "Add New..." → "Project"
   - 选择 `agent-arena` GitHub 仓库

3. **配置构建设置**
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend/`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/`

4. **添加环境变量**
   在 Settings → Environment Variables 中添加：
   ```
   VITE_API_URL=https://agent-arena-api.up.railway.app
   ```

5. **部署**
   - 点击 "Deploy"
   - 等待构建完成
   - 获得临时域名: `https://agent-arena-xxx.vercel.app`

---

### 步骤 4：绑定自定义域名 `bots-arena.com`

#### 前端域名配置（Vercel）

1. **Vercel Dashboard** → 你的项目 → Settings → Domains
2. 点击 "Add Domain"
3. 输入: `bots-arena.com`
4. 根据提示配置 DNS：

   **方式 A: A 记录（推荐）**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: 600
   ```

   **方式 B: CNAME 记录**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 600
   ```

5. 等待 DNS 生效（5-30 分钟）

#### 后端域名配置（Railway，可选）

1. **Railway Dashboard** → 你的项目 → Settings → Domains
2. 点击 "Custom Domain"
3. 输入: `api.bots-arena.com`
4. 在 DNS 中添加 CNAME：
   ```
   Type: CNAME
   Name: api
   Value: agent-arena-api.up.railway.app
   TTL: 600
   ```

5. 更新前端环境变量为自定义域名：
   ```
   VITE_API_URL=https://api.bots-arena.com
   ```

---

## 📁 项目结构

```
agent-arena/
├── frontend/                 # React 前端
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── src/                      # Express 后端
│   ├── index.js             # 入口文件
│   ├── routes/              # API 路由
│   ├── models/              # 数据模型
│   ├── services/            # 业务逻辑
│   └── games/               # 游戏实现
├── tests/                    # 测试文件
├── scripts/                  # 部署脚本
├── package.json              # 后端依赖
└── README.md                 # 项目文档
```

---

## 🔧 配置文件

### `vercel.json`（前端配置）

已创建在 `frontend/vercel.json`：

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

### `railway.json`（后端配置）

已创建在项目根目录：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 🌐 DNS 配置参考

在你的域名商（GoDaddy/阿里云/腾讯云）控制台添加以下记录：

| 类型 | 主机记录 | 记录值 | 说明 |
|------|---------|--------|------|
| A | @ | 76.76.21.21 | 主域名指向 Vercel |
| CNAME | www | cname.vercel-dns.com | www 子域名 |
| CNAME | api | agent-arena-api.up.railway.app | API 子域名 |

---

## ✅ 部署检查清单

- [ ] 代码已推送到 GitHub
- [ ] Railway 后端部署成功
- [ ] Vercel 前端部署成功
- [ ] 自定义域名已绑定
- [ ] HTTPS 证书已生效
- [ ] API 连接测试通过
- [ ] 游戏功能测试正常

---

## 🆘 常见问题

### 1. CORS 错误
确保后端允许前端域名访问：
```javascript
// src/index.js
app.use(cors({
  origin: ['https://bots-arena.com', 'https://www.bots-arena.com']
}));
```

### 2. WebSocket 连接失败
Railway 支持 WebSocket，确保使用 wss 协议：
```javascript
const socket = io('wss://api.bots-arena.com');
```

### 3. 环境变量不生效
在 Vercel/Railway 重新部署以刷新环境变量。

---

## 📞 需要帮助？

如果遇到问题，可以：
1. 查看 Vercel 部署日志
2. 查看 Railway 部署日志
3. 检查浏览器控制台错误信息
4. 联系开发团队

---

**部署完成后，访问**: https://bots-arena.com 🎉
