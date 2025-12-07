# Google OAuth 应用配置指南

## 问题
收到 `Error 403: access_denied` - "The developer hasn't given you access to this app"

这意味着你的邮箱还未被添加到 Google OAuth 应用的测试用户列表。

## 解决方案：添加测试用户

### 步骤 1：进入 Google Cloud Console
1. 打开 https://console.cloud.google.com/
2. 确保选择正确的项目（Nexus Mail 项目）
3. 左侧菜单搜索 "OAuth" 或找到 "APIs & Services" > "OAuth consent screen"

### 步骤 2：添加测试用户
1. 在 "OAuth consent screen" 页面
2. 向下滚动到 **"Test users"** 部分
3. 点击 **"+ Add users"** 按钮
4. 在弹出框中输入你的邮箱地址（例如：2@gmail.com）
5. 点击 "Add" 确认
6. 保存更改

### 步骤 3：验证配置
1. 回到应用的 OAuth 2.0 Client IDs 部分
2. 确保你的 `client_id` 和 `client_secret` 与 `.env` 文件匹配：
   ```env
   VITE_GMAIL_CLIENT_ID=29033903482-nd5uvedl7ac9rithft12jf2miktk9n0t.apps.googleusercontent.com
   VITE_GMAIL_CLIENT_SECRET=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
   ```

### 步骤 4：重启应用
1. 停止当前的 Electron 开发服务器
2. 运行：`npm run electron:dev`
3. 再次尝试 Gmail OAuth 登陆

## 常见问题

### Q: 我添加了测试用户，但仍然收到 403 错误
**A:** 请确保：
- 测试用户邮箱与你登录 Google OAuth 时使用的邮箱完全相同
- 已刷新页面或重启应用
- Client ID 和 Secret 与 Google Cloud Console 中的一致

### Q: 如何让应用不需要测试用户？
**A:** 需要完成 Google 的 OAuth 应用验证，步骤如下：
1. 在 OAuth consent screen 上传应用图标和品牌信息
2. 完成隐私政策 URL
3. 提交应用进行 Google 验证（需要 1-5 个工作日）
4. 验证通过后，任何人都可以访问你的应用

### Q: 开发期间有其他办法吗？
**A:** 是的，可以使用本地 OAuth 模拟或使用个人 Gmail 账户测试。

## 相关文档
- [Google OAuth 官方文档](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 测试用户配置](https://support.google.com/cloud/answer/10311080)
