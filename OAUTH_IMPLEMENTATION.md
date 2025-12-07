#!/usr/bin/env node

# OAuth2 Authentication Implementation Guide

## Overview
已实现 OAuth2 认证流程，允许用户通过 OAuth 方式登陆主流邮箱服务商，而不需要提供明文密码。

## Implemented Features

### 1. OAuth Providers Support
- **Gmail** (Google OAuth)
- **Outlook / Hotmail** (Microsoft OAuth)
- **Yahoo Mail** (Yahoo OAuth)
- **iCloud Mail** (Apple OAuth)

### 2. New Files Created
- `/utils/oauthProviders.ts` - OAuth 配置和工具函数
- `/components/OAuthLogin.tsx` - OAuth 登陆流程组件（可选使用）
- `/electron/main.js` - 增强了 OAuth 处理的 IPC 端点

### 3. Modified Files
- `/electron/preload.js` - 添加 OAuth API 暴露
- `/electron/main.js` - 添加 OAuth 登陆流程处理
- `/components/AddAccountDialog.tsx` - 集成 OAuth 登陆选项
- `/types.ts` - 添加 OAuth 相关的类型定义

## How It Works

### Login Flow (OAuth)
1. **用户点击 OAuth 登陆** → AddAccountDialog 第1步显示登陆方式选择
2. **选择 OAuth 方式** → 显示 OAuth 提供商列表（Gmail, Outlook, Yahoo, iCloud）
3. **选择提供商** → 启动本地 OAuth 回调服务器（localhost:7357）
4. **打开浏览器** → 跳转到服务商登陆页面（例如 accounts.google.com）
5. **用户授权** → 输入用户名密码并授权应用访问邮箱
6. **获取 Authorization Code** → 服务商重定向回 localhost:7357/callback
7. **交换 Access Token** → 使用 Authorization Code 获取 OAuth Token
8. **保存凭证** → Token 用于 IMAP 连接（XOAUTH2），不存储明文密码

### Manual Login Flow
1. 用户点击手动输入
2. 选择邮箱服务商
3. 输入邮箱地址和密码（或应用专用密码）
4. 系统验证连接并加密密码存储

## OAuth Configuration

### Environment Variables Required
设置以下环境变量以启用 OAuth（在 .env 文件或系统环境变量中）：

```bash
# Google (Gmail)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft (Outlook)
VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id
VITE_MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Yahoo
VITE_YAHOO_CLIENT_ID=your-yahoo-client-id
VITE_YAHOO_CLIENT_SECRET=your-yahoo-client-secret

# Apple (iCloud)
VITE_APPLE_CLIENT_ID=your-apple-client-id
VITE_APPLE_CLIENT_SECRET=your-apple-client-secret
```

### Register OAuth Applications
需要在各服务商注册应用获取 Client ID 和 Client Secret：

1. **Gmail (Google Cloud)**
   - 访问 https://console.cloud.google.com
   - 创建 OAuth 2.0 凭证（Web Application）
   - 授权重定向 URI: `http://localhost:7357/callback`
   - 必需范围: Gmail API 的 read/send 权限

2. **Outlook (Microsoft Azure)**
   - 访问 https://portal.azure.com
   - 创建应用注册
   - 添加 Web 平台重定向 URI: `http://localhost:7357/callback`
   - 必需权限: Mail.Read, Mail.Send

3. **Yahoo**
   - 访问 https://developer.yahoo.com
   - 创建应用
   - 设置回调 URI: `http://localhost:7357/callback`

4. **Apple (iCloud)**
   - 访问 https://developer.apple.com
   - 配置 Sign in with Apple
   - 设置回调 URL

## API Reference

### electronAPI.oauth.login(providerId: string)
启动 OAuth 登陆流程

```typescript
const result = await window.electronAPI.oauth.login('gmail');
// Returns: { success: boolean; message?: string; error?: string }
```

### electronAPI.oauth.exchangeCode(data: { providerId: string; code: string })
交换授权码获取 Access Token

```typescript
const result = await window.electronAPI.oauth.exchangeCode({
  providerId: 'gmail',
  code: 'authorization-code'
});
// Returns: { success: boolean; token?: any; error?: string }
```

### electronAPI.oauth.on(event: string, listener: Function)
监听 OAuth 事件

```typescript
window.electronAPI.oauth.on('oauth:code-received', (data) => {
  console.log('Code received:', data.code);
});
```

## Security Considerations

1. **密码从不存储** - OAuth 流程中，用户从不需要向应用提供密码
2. **Access Token 加密** - Token 在存储时使用 Windows DPAPI 加密（在 electron/main.js 中实现）
3. **Local Callback Server** - 仅监听 localhost，安全的本地回调处理
4. **Redirect URI 验证** - 服务商会验证重定向 URI 与注册的一致

## IMAP Connection with OAuth

对于支持 OAuth 的服务商（Gmail, Outlook, Yahoo），使用 XOAUTH2 认证：

```javascript
// Gmail/Outlook/Yahoo XOAUTH2 格式
const xoauth2 = `user=${email}\x01auth=Bearer ${accessToken}\x01\x01`;

// IMAP 连接配置
{
  imap: {
    user: email,
    xoauth2: xoauth2,  // 使用 XOAUTH2 而不是密码
    host: 'imap.gmail.com',
    port: 993,
    tls: true
  }
}
```

## Testing OAuth Locally

### 开发环境测试
1. 启动开发服务器: `npm run electron:dev`
2. 在 AddAccountDialog 中选择 OAuth 登陆
3. 选择邮箱服务商
4. 系统会打开浏览器窗口进行认证
5. 登陆并授权后，自动获取 Token

### 常见问题排查

**Q: "未配置 OAuth 凭证"** 
A: 需要设置环境变量。在开发模式中，检查 .env 文件是否正确配置。

**Q: 重定向 URI 不匹配**
A: 确保注册的应用重定向 URI 为 `http://localhost:7357/callback`

**Q: Token 过期**
A: 使用 refresh_token 重新获取新的 access_token（需在实现中添加）

## Future Enhancements

1. **Token 刷新** - 实现 refresh_token 自动刷新机制
2. **更多提供商** - 支持其他邮箱服务商
3. **生产部署** - 使用生产环境回调 URL
4. **Token 过期处理** - 自动重新认证过期的 Token

## Build & Deployment

构建 OAuth 支持的 exe：
```bash
npm run electron:build
```

生成的 exe 位于: `dist/windows/Nexus Mail Setup 1.0.0.exe`

## Related Files

- **OAuth 工具**: `/utils/oauthProviders.ts` (280+ 行)
- **主进程处理**: `/electron/main.js` (OAuth 部分约 150+ 行)
- **前端集成**: `/components/AddAccountDialog.tsx` (OAuth 步骤处理)
- **类型定义**: `/types.ts` (OAuth API 类型)
