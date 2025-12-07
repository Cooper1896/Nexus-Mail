# 快速参考 - 邮件服务商认证

## 🚀 快速开始

### 1. 添加账户
```
打开应用 → 点击"添加账户" → 选择提供商 → 输入凭证 → 完成
```

### 2. 配置提供商

#### Gmail
- 邮箱: user@gmail.com
- 密码: **应用专用密码**（不是常规密码）
- 生成: myaccount.google.com/apppasswords

#### Outlook
- 邮箱: user@outlook.com
- 密码: 常规密码或**应用密码**（如启用 2FA）

#### Yahoo
- 邮箱: user@yahoo.com
- 密码: **应用专用密码**
- 生成: login.yahoo.com/account/security

#### QQ 邮箱
- 邮箱: xxxxx@qq.com
- 密码: **授权码**（不是账户密码）
- 生成: QQ 邮箱设置 → 账户 → POP3/SMTP → 生成授权码
- 需要: 先在设置中启用 IMAP/SMTP

#### 网易 163 邮箱
- 邮箱: user@163.com
- 密码: **授权码**
- 生成: 邮箱设置 → 账户 → POP3/SMTP/IMAP → 生成授权码

#### iCloud
- 邮箱: user@icloud.com
- 密码: **应用专用密码**
- 生成: appleid.apple.com → 安全 → 应用专用密码

#### 自定义 IMAP
- IMAP: imap.provider.com:993 (通常 993 或 143)
- SMTP: smtp.provider.com:465 或 587
- SSL: 通常为 993 (IMAP) 和 465 (SMTP)

---

## 📋 提供商信息表

| 提供商 | IMAP | IMAP 端口 | SMTP | SMTP 端口 | SSL | 需要应用密码 |
|--------|------|----------|------|----------|-----|-------------|
| Gmail | imap.gmail.com | 993 | smtp.gmail.com | 465 | ✓ | ✓ |
| Outlook | outlook.office365.com | 993 | smtp.office365.com | 587 | ✗ | 有时 |
| Yahoo | imap.mail.yahoo.com | 993 | smtp.mail.yahoo.com | 465 | ✓ | ✓ |
| QQ | imap.qq.com | 993 | smtp.qq.com | 465 | ✓ | ✓ |
| 163 | imap.163.com | 993 | smtp.163.com | 465 | ✓ | ✓ |
| iCloud | imap.mail.me.com | 993 | smtp.mail.me.com | 587 | ✗ | ✓ |

---

## ⚠️ 常见问题解决

### "身份验证失败"
→ 检查邮箱和密码  
→ 对于需要应用密码的提供商，生成应用密码  
→ 点击帮助图标查看详细步骤

### "IMAP 功能未启用"
→ 登录邮箱网站  
→ 进入设置/账户  
→ 查找 POP3/SMTP/IMAP 选项  
→ 启用 IMAP

### "连接超时"
→ 检查网络连接  
→ 尝试不同的端口（如 143 代替 993）  
→ 禁用 SSL 重试（仅自定义 IMAP）

### "证书验证失败"
→ 这通常是过时的系统日期/时间问题  
→ 更新系统时间  
→ 或对自定义 IMAP 禁用 SSL

---

## 🔧 API 快速参考

### 添加账户
```javascript
const result = await window.electronAPI.addAccount({
  email: 'user@gmail.com',
  password: 'app-password-here',
  provider: 'gmail',           // 可选，自动检测
  displayName: 'My Gmail',     // 可选
  customConfig: { ... }        // 仅 IMAP
})
```

### 获取账户
```javascript
const accounts = await window.electronAPI.getAccounts()
```

### 同步邮件
```javascript
const result = await window.electronAPI.syncEmails(accountId)
```

### 删除账户
```javascript
const result = await window.electronAPI.deleteAccount(accountId)
```

### 更新账户
```javascript
const result = await window.electronAPI.updateAccount(accountId, {
  displayName: 'New Name',
  status: 'active'
})
```

---

## 🔐 安全提示

✅ **推荐做法:**
- 使用应用专用密码
- 启用账户的 2FA
- 定期检查已连接的应用
- 使用独特且强大的密码

❌ **不要做:**
- 不要共享应用密码
- 不要在代码中硬编码密码
- 不要通过不安全的通道传输凭证
- 不要启用"允许安全性较低的应用"

---

## 📊 账户状态

| 状态 | 含义 | 操作 |
|------|------|------|
| 🟢 已连接 | 账户活跃并可同步 | 点击"立即同步" |
| 🟡 正在同步 | 当前正在拉取邮件 | 等待完成 |
| 🔴 错误 | 连接失败 | 检查凭证或网络 |

---

## 📁 文件参考

### 关键文件
- `utils/emailProviders.ts` - 提供商配置
- `utils/authValidator.ts` - 认证验证
- `components/AddAccountDialog.tsx` - 添加账户 UI
- `components/Settings.tsx` - 账户管理 UI
- `electron/main.js` - 后端账户管理

### 文档
- `IMPLEMENTATION_GUIDE.md` - 完整实现文档
- `TEST_CHECKLIST.md` - 测试场景
- `QUICK_REFERENCE.md` - 本文档

---

## 🆘 获取帮助

### 在应用中
1. 点击添加账户对话框中的帮助图标
2. 查看针对您的提供商的逐步指南
3. 点击"生成密码"或"帮助文档"链接

### 错误消息
- 应用会显示具体的错误消息
- 查看错误下方的建议
- 按照步骤解决

### 诊断
- 检查浏览器控制台 (F12) 查看 JavaScript 错误
- 检查 Electron 进程日志查看连接错误
- 测试 IMAP 连接: `telnet imap.provider.com 993`

---

## 🎯 常用场景速查

### 场景: 添加 Gmail
```
1. 打开添加账户
2. 选择 Gmail
3. 输入邮箱: user@gmail.com
4. 访问 myaccount.google.com/apppasswords
5. 生成应用密码
6. 输入应用密码
7. 完成
```

### 场景: 迁移多个账户
```
1. 对每个账户重复添加过程
2. 新添加的账户会立即同步
3. 所有邮件将保存到本地
4. 可同时使用多个账户
```

### 场景: 同步特定账户
```
1. 打开设置 → 邮箱账户
2. 点击目标账户
3. 点击"立即同步"
4. 等待完成
```

---

## 💡 提示

- **多个账户:** 可添加无限个账户，混合不同的提供商
- **应用密码:** 比常规密码更安全，可随时撤销
- **自动同步:** 默认自动同步，可在设置中更改频率
- **离线访问:** 同步后，邮件存储在本地，离线可访问
- **隐私:** 密码使用 Windows DPAPI 加密，永远不会明文存储

---

## 📞 支持矩阵

| 问题 | 支持状态 | 说明 |
|------|---------|------|
| IMAP/SMTP 基础 | ✅ 完全支持 | 所有主要提供商 |
| OAuth 2.0 | ⏳ 计划中 | 未来版本 |
| 两步验证 | ✅ 支持（通过应用密码） | 推荐方式 |
| 代理支持 | 🔄 有限 | 取决于系统设置 |
| 离线访问 | ✅ 支持 | 同步后可离线读取 |

---

**最后更新:** 2025-12-06  
**版本:** 1.0.0
