# 账户管理功能实现报告

## 1. 主流邮件服务商认证支持

已实现对以下主流服务商的完整支持：

### 认证方式
- **OAuth 2.0**: Gmail, Outlook, Yahoo, iCloud (Web)
- **IMAP/SMTP**: 支持所有标准 IMAP 服务商（如 163, QQ, 自定义域名）

### 实现细节
- **OAuth 配置**: `utils/oauthProviders.ts` 包含各服务商的 Client ID, Endpoints, Scopes。
- **IMAP 连接**: `electron/main.js` 中的 `account:add` 使用 `imap-simple` 验证凭证。
- **UI 交互**: `components/AddAccountDialog.tsx` 提供分步向导：
  1. 选择登录方式 (OAuth / 手动)
  2. 选择服务商
  3. 输入凭证 (或 OAuth 授权)
  4. 验证连接
  5. 完成添加

## 2. 安全存储

已实现基于系统级加密的凭证存储：

- **技术**: 使用 Electron 的 `safeStorage` API (Windows DPAPI / macOS Keychain)。
- **加密内容**: 
  - 用户密码 (IMAP 模式)
  - OAuth Access Token & Refresh Token
- **存储位置**: SQLite 数据库 (`accounts` 表) 中的 `encryptedPassword` 和 `encryptedOAuthToken` 字段。
- **安全性**: 数据库中不存储明文密码，仅在内存中解密用于连接。

## 3. 多账户切换

已实现完整的账户管理和切换功能：

- **Sidebar 显示**: `components/Sidebar.tsx` 渲染账户列表，显示服务商图标和账户名称。
- **快速切换**: 点击 Sidebar 中的账户图标即可切换当前视图的邮件列表。
- **账户添加**: Sidebar 底部提供 "Add Account" 按钮，打开添加向导。
- **账户删除**: 悬停在账户上显示删除按钮，支持从本地移除账户和数据。
- **状态管理**: `App.tsx` 管理 `currentUser` 和 `profiles` 状态，支持多用户档案（Profile）和每个档案下的多邮箱账户。

## 验证步骤

1. **添加账户**:
   - 点击 Sidebar "+" 按钮
   - 选择 "OAuth 登陆" -> "Gmail"
   - 完成浏览器授权
   - 验证账户出现在 Sidebar

2. **手动添加**:
   - 选择 "手动输入" -> "其他 (IMAP)"
   - 输入服务器信息 (imap.example.com)
   - 输入账号密码
   - 验证连接成功

3. **切换账户**:
   - 添加第二个账户
   - 点击 Sidebar 不同账户图标
   - 验证邮件列表刷新为对应账户邮件

4. **删除账户**:
   - 悬停在账户图标上
   - 点击垃圾桶图标
   - 验证账户从列表消失

## 代码位置

- **后端逻辑**: `electron/main.js` (account:add, account:delete, email:sync)
- **前端 UI**: `components/AddAccountDialog.tsx`, `components/Sidebar.tsx`
- **配置**: `utils/oauthProviders.ts`, `utils/emailProviders.ts`
