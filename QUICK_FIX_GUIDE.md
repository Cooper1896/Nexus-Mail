# 快速修复指南

## 问题症状
- ❌ 登录后应用刷新，用户信息丢失
- ❌ 邮件无法同步或同步失败
- ❌ OAuth登录后账户未添加
- ❌ 应用重启后需要重新登录

## 应用的修复

### 1️⃣ localStorage 持久化已启用
你的用户登录信息现在会自动保存在浏览器本地存储中。

**工作原理：**
```
用户登录 → OAuth/密码认证 → 
添加账户到DB → 保存用户信息到localStorage → 
下次启动时自动恢复
```

### 2️⃣ OAuth 令牌正确保存和使用
OAuth令牌从Onboarding流程到账户创建再到邮件同步的完整链路已修复。

**流程：**
```
OAuth提供商 → Authorization Code → 
Token交换 → DPAPI加密存储 → 
邮件同步时解密使用XOAUTH2认证
```

### 3️⃣ 邮件同步增强
增加了OAuth支持、详细错误处理和重试逻辑。

**支持的提供商：**
- ✅ Gmail (OAuth + XOAUTH2)
- ✅ Outlook (OAuth + XOAUTH2)  
- ✅ Yahoo (OAuth + XOAUTH2)
- ✅ 任何标准IMAP服务器（密码认证）

---

## 本地测试步骤

### 1. 构建应用
```bash
cd d:\Mail.develop
npm run build
```

### 2. 开发模式测试
```bash
npm run electron:dev
```

### 3. 完整流程测试

#### 初次运行：
1. 启动应用 → 进入Onboarding
2. 选择OAuth登录 → 选择Gmail
3. 授权后自动返回应用
4. 应用应该自动添加账户并同步邮件
5. 刷新应用 (Ctrl+R) → 用户信息应该保留

#### 重启测试：
1. 完全关闭应用
2. 重新启动应用
3. 应该直接进入邮件视图（不需要重新登录）
4. 验证：用户名、账户、邮件都在

---

## 关键修复代码位置

### App.tsx 修复
```typescript
// 行 ~40-70: localStorage初始化
useEffect(() => {
  const savedUser = localStorage.getItem('currentUser');
  // ... 恢复用户状态
}, []);

// 行 ~77-96: 自动保存状态
useEffect(() => {
  if (currentUser) {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }
}, [currentUser]);

// 行 ~378-430: 改进的onboarding处理
const handleOnboardingComplete = async (user: User, password?: string) => {
  // ... 添加账户到DB
  // ... 自动触发同步
};
```

### electron/main.js 修复
```javascript
// 行 ~575-730: 增强的邮件同步
ipcMain.handle('email:sync', async (_, accountId) => {
  // ... OAuth令牌解密
  // ... XOAUTH2配置
  // ... 详细错误处理
});
```

---

## 故障排查

### 问题：刷新后用户信息丢失
**解决方案：**
- 检查浏览器localStorage是否被清空
- 清除浏览器缓存后重试
- 检查DevTools console中是否有错误信息

### 问题：邮件无法同步
**检查项：**
1. 检查应用console日志查看[email:sync]信息
2. 验证OAuth令牌是否正确保存
3. 检查Gmail/Outlook中是否需要允许低安全性应用
4. 尝试使用app-specific密码（对于Gmail和Outlook）

### 问题：OAuth登录后无法添加账户
**调试步骤：**
1. 打开DevTools (F12)
2. 查看Console标签中的错误
3. 检查Network标签中account:add请求的响应
4. 查看electron主进程日志

---

## 环境变量要求

确保.env文件中配置了OAuth凭证：

```env
# Gmail
VITE_GMAIL_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
VITE_GMAIL_CLIENT_SECRET=YOUR_CLIENT_SECRET

# Outlook
VITE_MICROSOFT_CLIENT_ID=YOUR_CLIENT_ID
VITE_MICROSOFT_CLIENT_SECRET=YOUR_CLIENT_SECRET

# Yahoo (可选)
VITE_YAHOO_CLIENT_ID=YOUR_CLIENT_ID
VITE_YAHOO_CLIENT_SECRET=YOUR_CLIENT_SECRET
```

---

## 性能建议

### 初始同步
- 首次登录会获取最近20封邮件
- 如果账户有大量邮件，可能需要1-2分钟

### 定期同步
- 应用在后台每60秒检查一次新邮件
- 手动点击"Sync"按钮立即同步

### 优化
- 可以修改`INITIAL_SYNC_COUNT`来改变首次获取的邮件数量
- 可以调整同步间隔（目前是60秒）

---

## 构建和部署

### 开发构建
```bash
npm run dev          # Vite开发服务器
npm run electron:dev # 带Electron的完整应用
```

### 生产构建
```bash
npm run build          # 构建React应用
npm run electron:build # 构建可执行文件
```

输出文件位于: `dist/windows/Nexus Mail Setup 1.0.0.exe`

---

## 技术细节

### 令牌存储
- 使用Windows DPAPI加密（safeStorage）
- OAuth令牌和密码都以base64编码的加密形式存储
- 只有应用进程可以解密

### 邮件获取
- IMAP协议用于读取邮件
- OAuth使用XOAUTH2机制
- 最多存储20条最近邮件（可配置）

### localStorage内容
```javascript
{
  "currentUser": {
    "id": "1234567890",
    "name": "用户名",
    "email": "user@example.com",
    "accounts": [/* ... */],
    "oauthToken": {/* ... */}
  },
  "profiles": [/* ... */],
  "theme": "dark"
}
```

---

**最后更新**: 2025-12-07  
**修复版本**: v1.0.0-hotfix-01
