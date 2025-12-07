# Nexus Mail - 快速入门指南

## 🎯 您的应用已准备好！

Nexus Mail 1.0.0 现已支持 OAuth 2.0 认证，用户可以安全地使用 Gmail、Outlook、Yahoo 和 iCloud 账户。

---

## 📦 获取应用

**下载地址**: `dist/windows/Nexus Mail Setup 1.0.0.exe` (481.79 MB)

或者从开发版本直接运行:
```bash
npm run electron:dev
```

---

## ⚡ 3分钟快速配置

### 步骤 1️⃣ - 配置 OAuth

#### 对于 Gmail 用户
1. 访问 https://console.cloud.google.com
2. 启用 Gmail API
3. 创建 OAuth 凭证 (Web App)
4. 设置重定向 URI: `http://localhost:7357/callback`
5. 复制 Client ID 和 Secret

#### 对于 Outlook 用户
1. 访问 https://portal.azure.com
2. 在 Entra ID 中注册应用
3. 设置重定向 URI: `http://localhost:7357/callback`
4. 配置 API 权限 (Mail.Read, Mail.Send)
5. 复制 Client ID 和 Secret

#### 对于 Yahoo 用户
1. 访问 https://developer.yahoo.com
2. 创建 Web 应用
3. 设置重定向 URI: `http://localhost:7357/callback`
4. 复制 Client ID 和 Secret

### 步骤 2️⃣ - 创建 .env 文件

在项目根目录创建 `.env` 文件:

```env
# Google
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your-client-secret

# Microsoft
VITE_MICROSOFT_CLIENT_ID=your-azure-client-id
VITE_MICROSOFT_CLIENT_SECRET=your-azure-client-secret

# Yahoo
VITE_YAHOO_CLIENT_ID=your-yahoo-client-id
VITE_YAHOO_CLIENT_SECRET=your-yahoo-client-secret

# Apple (可选，需要开发者账户)
VITE_APPLE_CLIENT_ID=your-apple-services-id
VITE_APPLE_CLIENT_SECRET=your-apple-private-key
```

### 步骤 3️⃣ - 启动应用

```bash
# 开发环境
npm run electron:dev

# 或打开生成的 exe
dist/windows/Nexus Mail Setup 1.0.0.exe
```

---

## 👥 用户体验流程

```
应用启动
   ↓
[欢迎屏幕]
   ↓
输入邮箱地址 (例: user@gmail.com)
   ↓
选择快速登陆方式 (推荐 OAuth)
   ↓
点击服务商按钮 (Gmail/Outlook/Yahoo)
   ↓
[浏览器打开登陆页面]
用户输入密码并授权
   ↓
[自动返回应用]
账户已添加！开始同步邮件
```

---

## 🔍 关键功能

### ✨ OAuth 登陆（推荐）
- ✅ 无需向应用提供密码
- ✅ 直接跳转到服务商登陆
- ✅ 一键授权
- ✅ 自动获取邮件访问权限

### 🔐 安全特性
- ✅ 密码使用系统级加密 (Windows DPAPI)
- ✅ OAuth Token 加密存储
- ✅ 本地回调服务器 (localhost:7357)
- ✅ 完全的隐私保护

### 📧 邮件功能
- ✅ 多账户管理
- ✅ 邮件同步
- ✅ 邮件发送
- ✅ 邮件搜索和筛选

---

## 📚 详细文档

### 配置相关
1. **`OAuth_Configuration_Guide.md`** - 每个服务商的详细配置步骤
2. **`OAuth_Configuration_Checklist.md`** - 配置检查清单（推荐打印）
3. **`OAUTH_SETUP_GUIDE.md`** - OAuth 快速上手指南
4. **`OAUTH_IMPLEMENTATION.md`** - 技术实现细节

### 项目相关
1. **`IMPLEMENTATION_GUIDE.md`** - 完整项目实现指南
2. **`README.md`** - 项目概览

---

## 🆘 遇到问题？

### 常见问题

| 问题 | 解决方案 |
|-----|--------|
| 应用启动时无 OAuth 选项 | 检查 `.env` 文件是否存在并正确配置 |
| "重定向 URI 不匹配" | 确保 URI 完全匹配: `http://localhost:7357/callback` |
| 浏览器未打开 | 检查 localhost:7357 端口是否被占用 |
| Token 过期错误 | 重新添加账户重新授权 |

### 需要帮助？
查看完整的故障排除指南: **`OAuth_Configuration_Guide.md`** 的"常见问题排查"部分

---

## 🚀 下一步

### 开发人员
- [ ] 阅读 `OAuth_Configuration_Guide.md`
- [ ] 配置 OAuth 凭证
- [ ] 运行 `npm run electron:dev` 测试
- [ ] 进行本地测试

### 最终用户
- [ ] 下载 `.exe` 安装程序
- [ ] 按照屏幕提示完成配置
- [ ] 添加邮箱账户
- [ ] 开始使用 Nexus Mail！

---

## 📋 文件结构

```
Mail.develop/
├── .env.example              ← OAuth 配置模板
├── .env                      ← 您的 OAuth 凭证（保密）
├── OAuth_Configuration_Guide.md    ← 详细配置步骤
├── OAuth_Configuration_Checklist.md ← 检查清单
├── OAUTH_SETUP_GUIDE.md            ← 快速上手
├── OAUTH_IMPLEMENTATION.md         ← 技术细节
├── QUICK_START.md            ← 本文件
│
├── utils/
│   ├── oauthProviders.ts     ← OAuth 配置模块
│   └── authValidator.ts      ← 认证验证模块
│
├── components/
│   ├── Onboarding.tsx        ← 新用户引导（OAuth 集成）
│   ├── AddAccountDialog.tsx  ← 添加账户对话框
│   └── ...
│
├── electron/
│   ├── main.js              ← OAuth 后端处理
│   └── preload.js           ← API 暴露
│
└── dist/windows/
    └── Nexus Mail Setup 1.0.0.exe  ← 最终应用
```

---

## ✅ 验证清单

启动应用前，确保：
- [ ] `.env` 文件已创建并包含正确的凭证
- [ ] 没有使用占位符如 "YOUR_CLIENT_ID"
- [ ] 所有 OAuth 应用的重定向 URI 都设置为 `http://localhost:7357/callback`
- [ ] 开发服务器已启动（`npm run electron:dev`）

---

## 💡 提示

1. **首次启动**: 应用会引导您添加第一个邮箱账户
2. **OAuth 优先**: 使用 OAuth 比手动输入密码更安全
3. **多账户**: 可添加来自不同服务商的多个账户
4. **自动同步**: 账户添加后会自动同步最新邮件

---

**版本**: Nexus Mail 1.0.0  
**最后更新**: 2025-12-06  
**状态**: ✅ 生产就绪

现在就开始使用 Nexus Mail 吧！🎉
