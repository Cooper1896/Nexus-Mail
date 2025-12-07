# Gmail OAuth 快速修复检查清单

## ✅ 已完成的修复

- [x] 增强环境变量加载（main.js）
- [x] 改进 OAuth 登陆处理器
- [x] 改进回调服务器
- [x] 增强 Token 交换函数
- [x] 改进 React 组件错误处理
- [x] 添加详细的日志记录

## 🧪 快速验证步骤

### 1. 检查配置（2秒）
```bash
node check-oauth-config.js
```
**预期输出：** 
```
✅ VITE_GMAIL_CLIENT_ID
✅ VITE_GMAIL_CLIENT_SECRET
```

### 2. 测试 OAuth 流程（5秒）
```bash
node test-oauth-flow.js
```
**预期输出：**
```
✅ Gmail credentials are properly configured
✅ Authorization URL can be generated
✅ Callback server can be created on port 7357
✅ Token endpoint is accessible
```

### 3. 启动应用
```bash
# 终端1：启动 Vite 开发服务器
npm run dev

# 终端2：启动 Electron
npm run electron:dev
```

### 4. 测试登陆
1. 在 App 中点击 "Gmail" 按钮
2. 浏览器窗口弹出
3. 输入 Google 账户
4. 点击授权
5. 看到 "✓ 成功！" 消息

## 📋 状态

| 项目 | 状态 |
|------|------|
| Gmail 凭证 | ✅ 配置完成 |
| 环境变量 | ✅ 已加载 |
| 主进程日志 | ✅ 已增强 |
| 回调服务器 | ✅ 已改进 |
| 错误处理 | ✅ 已改进 |
| 测试脚本 | ✅ 已创建 |
| 文档 | ✅ 已完成 |

## 🔍 调试日志

### 在浏览器开发者工具中
按 `Ctrl+Shift+I` 打开，查看 Console 标签，找这些日志：
```
[OAuth] Login initiated for provider: gmail
[OAuth] Using clientId: 29033903482-...
[OAuth] Authorization window opened successfully
[OAuth Callback] Received code: ...
[Token Exchange] Token received successfully
```

### 在终端中
在运行 `npm run electron:dev` 的终端中查看相同的日志

## 💾 新创建的文件

- `check-oauth-config.js` - 配置检查工具
- `test-oauth-flow.js` - OAuth 流程测试
- `OAUTH_FIX_GUIDE.md` - 详细修复指南
- `OAUTH_FIX_SUMMARY.md` - 修复摘要

## 🚨 常见问题

### Q: 修改了 .env 后没有生效？
A: 需要重启 `npm run electron:dev`（React 组件会自动热更新）

### Q: 还是看不到 OAuth 窗口？
A: 运行 `node check-oauth-config.js` 检查凭证是否正确配置

### Q: 浏览器窗口卡住了？
A: 检查网络连接，查看浏览器开发者工具的 Network 标签

### Q: 收到 "invalid_grant" 错误？
A: 授权代码已过期或重定向 URI 不匹配，这是正常的测试响应

## 📞 需要重新生成 OAuth 凭证？

1. 访问 https://console.cloud.google.com
2. 创建或选择项目
3. 启用 Gmail API
4. 创建 OAuth 2.0 凭证（Desktop App）
5. 设置重定向 URI：`http://localhost:7357/callback`
6. 复制 Client ID 和 Client Secret 到 .env
7. 重启 Electron 应用

## ✨ 修复完成！

你现在可以：
1. 启动应用
2. 点击 "Gmail" 按钮
3. 完成 Google 认证
4. 成功添加 Gmail 账户

---
**最后更新：** 2025-12-07
