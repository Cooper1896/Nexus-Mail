# OAuth 配置指导手册

## 📋 概述

此文档指导您如何为 Nexus Mail 配置 OAuth 2.0 认证，使用户可以通过各大邮箱服务商（Gmail、Outlook、Yahoo、iCloud）进行安全认证。

---

## 🔧 快速开始

### 第1步：创建 .env 文件

1. 在项目根目录复制 `.env.example` 文件
2. 重命名为 `.env`
3. 按照下述步骤填入各服务商的凭证

---

## 1️⃣ Google Gmail OAuth 配置

### 获取 Client ID 和 Secret

#### Step 1: 访问 Google Cloud Console
- 前往 https://console.cloud.google.com
- 如没有项目，点击"创建项目"

#### Step 2: 启用 Gmail API
1. 在左侧菜单，点击"API 和服务" → "库"
2. 搜索 "Gmail API"
3. 点击 Gmail API，然后点击"启用"

#### Step 3: 创建 OAuth 凭证
1. 点击"API 和服务" → "凭证"
2. 点击"创建凭证" → "OAuth 客户端 ID"
3. 选择"Web 应用"
4. 填写信息：
   - 名称：任意（如 "Nexus Mail"）
   - 授权的 JavaScript 源：`http://localhost:5173`（开发环境）
   - 授权的重定向 URI：**`http://localhost:7357/callback`**（必须精确）

5. 创建后，下载 JSON 文件，找到：
   - `client_id`：复制到 `.env` 的 `VITE_GOOGLE_CLIENT_ID`
   - `client_secret`：复制到 `.env` 的 `VITE_GOOGLE_CLIENT_SECRET`

#### Step 4: 配置 OAuth 同意屏幕
1. 点击"OAuth 同意屏幕"
2. 选择"外部"用户类型
3. 填写应用名称、用户支持邮箱等信息
4. 添加范围时，搜索并选择：
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`

### .env 配置示例
```env
VITE_GOOGLE_CLIENT_ID=1234567890-abcdefghijk.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=GOCSPX-1234567890abcdefghij
```

---

## 2️⃣ Microsoft Outlook OAuth 配置

### 获取 Client ID 和 Secret

#### Step 1: 访问 Azure Portal
- 前往 https://portal.azure.com
- 使用 Microsoft 账户登陆（需要 Microsoft 365 订阅或免费账户）

#### Step 2: 注册应用
1. 在左侧菜单搜索 "Azure AD" 或 "Entra ID"
2. 点击"应用注册" → "新注册"
3. 填写信息：
   - 名称：`Nexus Mail` 或任意名称
   - 支持的账户类型：选择"任何组织目录中的账户和个人 Microsoft 账户"
   - 重定向 URI：选择"Web"，输入 `http://localhost:7357/callback`

4. 注册后，在"概览"页面找到：
   - `应用(客户端) ID`：复制到 `.env` 的 `VITE_MICROSOFT_CLIENT_ID`

#### Step 3: 创建客户端密钥
1. 在左侧菜单，点击"证书和机密"
2. 点击"新建客户端密钥"
3. 描述：任意（如 "Nexus Mail Secret"）
4. 过期时间：建议选择"24 个月"或"永不过期"
5. 复制"值"到 `.env` 的 `VITE_MICROSOFT_CLIENT_SECRET`

#### Step 4: 配置 API 权限
1. 在左侧菜单，点击"API 权限"
2. 点击"添加权限"
3. 选择"Microsoft Graph"
4. 选择"委托的权限"
5. 搜索并添加以下权限：
   - `Mail.Read`
   - `Mail.Send`
   - `offline_access`
6. 点击"授予管理员同意"

### .env 配置示例
```env
VITE_MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789012
VITE_MICROSOFT_CLIENT_SECRET=1234567890abcdefgh.IJKLmnopqr-stuvwxyz_ABC
```

---

## 3️⃣ Yahoo Mail OAuth 配置

### 获取 Client ID 和 Secret

#### Step 1: 访问 Yahoo Developer Platform
- 前往 https://developer.yahoo.com
- 使用 Yahoo 账户登陆（若无账户，需要创建）

#### Step 2: 创建应用
1. 点击"我的应用"
2. 点击"创建应用"
3. 填写信息：
   - 应用名称：`Nexus Mail`
   - 应用类型：选择"Web 应用"
   - 重定向 URI：`http://localhost:7357/callback`

4. 创建后，在应用详情页面找到：
   - `Client ID`：复制到 `.env` 的 `VITE_YAHOO_CLIENT_ID`
   - `Client Secret`：复制到 `.env` 的 `VITE_YAHOO_CLIENT_SECRET`

#### Step 3: 选择权限范围
1. 在应用设置中，确保启用了以下权限：
   - `mail-r` (读取邮件)
   - `mail-w` (写入邮件)
   - `sdpp-w`, `sdpp-r` (配置文件读写)

### .env 配置示例
```env
VITE_YAHOO_CLIENT_ID=dj0yJmk9abc123def456ghi789&sv=1&d=XXXXXXXX&t=dXXXXXXXXX
VITE_YAHOO_CLIENT_SECRET=1234567890abcdefghijklmnopqrst
```

---

## 4️⃣ Apple iCloud Mail OAuth 配置

### 获取 Client ID 和 Secret

#### Step 1: Apple Developer Account
- 前往 https://developer.apple.com
- 使用 Apple ID 登陆（需要 Apple Developer 会员资格，99 USD/年）

#### Step 2: 创建应用标识符
1. 点击"Account"
2. 进入"Certificates, Identifiers & Profiles"
3. 点击"Identifiers" → "+"
4. 选择"App IDs"或"Services IDs"（对于 OAuth，选择 Services IDs）

#### Step 3: 配置 Sign in with Apple
1. 创建 Services ID：
   - Identifier: `com.nexusmail.app`
   - Description: `Nexus Mail`

2. 启用 "Sign in with Apple"
3. 在"Edit"中配置：
   - 主应用 ID：选择对应的 App ID
   - Web Authentication Configuration：
     - 域：`localhost` 或您的域名
     - Return URLs：`http://localhost:7357/callback`

#### Step 4: 生成凭证
1. 点击"Sign in with Apple"旁的"Configure"
2. 下载生成的 Private Key
3. 记录相关信息：
   - `Services ID`：作为 Client ID
   - Private Key 内容：作为 Client Secret

### .env 配置示例
```env
VITE_APPLE_CLIENT_ID=com.nexusmail.app.123456789
VITE_APPLE_CLIENT_SECRET=-----BEGIN PRIVATE KEY-----\nMIIEv...（完整的私钥内容）\n-----END PRIVATE KEY-----
```

---

## 📝 完整的 .env 配置文件模板

```env
# ============================================
# OAuth 2.0 Configuration for Nexus Mail
# ============================================

# Google (Gmail)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your-client-secret

# Microsoft (Outlook / Hotmail)
VITE_MICROSOFT_CLIENT_ID=your-azure-client-id
VITE_MICROSOFT_CLIENT_SECRET=your-azure-client-secret

# Yahoo Mail
VITE_YAHOO_CLIENT_ID=your-yahoo-client-id
VITE_YAHOO_CLIENT_SECRET=your-yahoo-client-secret

# Apple (iCloud Mail)
VITE_APPLE_CLIENT_ID=your-apple-services-id
VITE_APPLE_CLIENT_SECRET=your-apple-private-key

# Development Environment
NODE_ENV=development
```

---

## ✅ 验证配置

### 开发环境测试

1. **启动应用**
   ```bash
   npm run electron:dev
   ```

2. **测试 OAuth 流程**
   - 应用启动时，进入新用户引导页面
   - 输入邮箱地址（如 `user@gmail.com`）
   - 在输入邮箱后，应该看到 OAuth 快速登陆按钮
   - 点击对应服务商的按钮（如 "Gmail"）
   - 浏览器应该打开服务商的登陆页面
   - 使用您的账户登陆并授权
   - 授权后应自动返回应用并添加账户

3. **检查环境变量加载**
   - 打开浏览器开发者工具（F12）
   - 如果 OAuth 配置有问题，应该看到错误提示
   - 检查 `.env` 文件是否正确加载

---

## 🚀 生产环境部署

### 重要注意事项

1. **重定向 URI 变更**
   - 开发环境：`http://localhost:7357/callback`
   - 生产环境：需要使用您应用的实际域名，如 `https://mail.example.com/callback`

2. **生成新的 OAuth 凭证**
   - 在各服务商创建新的 OAuth 应用（生产环境专用）
   - 配置生产域名和 HTTPS 回调 URI

3. **更新 main.js 中的回调 URI**
   ```javascript
   // electron/main.js 中搜索 'localhost:7357'，替换为您的生产域名
   const OAUTH_CALLBACK_URI = process.env.NODE_ENV === 'development' 
     ? 'http://localhost:7357/callback'
     : 'https://mail.example.com/callback';
   ```

4. **使用环境变量管理**
   - 不要将真实凭证提交到 git
   - 使用 `.env.local` 或 `.env.production`
   - 在服务器设置环境变量

---

## 🔐 安全最佳实践

1. **保护 Client Secret**
   - ❌ 永远不要在代码中硬编码
   - ❌ 永远不要提交到版本控制
   - ✅ 使用环境变量
   - ✅ 在生产环境使用 CI/CD 管道注入

2. **本地开发**
   - 使用本地 localhost:7357 回调服务器
   - 定期更新 OAuth 凭证
   - 从不使用生产凭证测试

3. **Token 管理**
   - Access Token 存储时使用 DPAPI 加密
   - 实现 Token 刷新机制
   - 定期检查 Token 过期时间

---

## 🐛 常见问题排查

### Q1: "未配置 OAuth 凭证"
**问题**: 启动应用时收到这个错误
**解决方案**:
1. 确认 `.env` 文件存在于项目根目录
2. 检查 `.env` 文件中的凭证是否正确填入
3. 确保没有多余的空格或特殊字符
4. 重启开发服务器：`npm run electron:dev`

### Q2: "重定向 URI 不匹配"
**问题**: OAuth 服务商返回此错误
**解决方案**:
1. 检查各服务商 OAuth 应用配置中的重定向 URI
2. 确保完全匹配：`http://localhost:7357/callback`
3. 检查 main.js 中的回调地址是否正确
4. 清除浏览器缓存重新尝试

### Q3: "无法打开浏览器登陆窗口"
**问题**: 点击 OAuth 按钮后没有反应
**解决方案**:
1. 检查网络连接
2. 检查 localhost:7357 端口是否被占用
3. 查看浏览器控制台是否有错误信息
4. 尝试手动访问 `http://localhost:7357` 测试

### Q4: "Token 过期或无效"
**问题**: 添加账户后无法同步邮件
**解决方案**:
1. 重新添加账户（会重新获取新 Token）
2. 检查 OAuth 应用中权限范围是否正确
3. 确认用户账户未被禁用
4. 检查 API 使用配额是否已超

---

## 📚 参考文档

- [Google OAuth 2.0 文档](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Graph OAuth 文档](https://learn.microsoft.com/en-us/graph/auth/)
- [Yahoo OAuth 文档](https://developer.yahoo.com/oauth/)
- [Apple Sign in with Apple 文档](https://developer.apple.com/sign-in-with-apple/)

---

## 💬 获取帮助

如遇到问题，请：
1. 查看本文档的"常见问题"部分
2. 检查 OAuth 服务商的官方文档
3. 查看应用的错误日志
4. 在社区论坛寻求帮助

---

**最后更新**: 2025-12-06  
**版本**: Nexus Mail 1.0.0
