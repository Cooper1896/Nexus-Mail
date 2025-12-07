# 主流邮件服务商认证实现指南

## 功能概述

本实现为 Nexus Mail 添加了支持主流邮件服务商的完整认证系统，包括：

### ✅ 已实现功能

#### 1. **邮件服务商支持**
- ✓ Gmail (需要应用专用密码)
- ✓ Outlook (需要应用密码)
- ✓ Yahoo (需要应用专用密码)
- ✓ QQ 邮箱 (需要授权码)
- ✓ 网易 163 邮箱 (需要授权码)
- ✓ iCloud (需要应用专用密码)
- ✓ 自定义 IMAP/SMTP (完全可配置)

#### 2. **核心功能**
- ✓ **账户添加**: 自动检测邮箱提供商
- ✓ **验证凭证**: 通过 IMAP 连接测试
- ✓ **密码加密**: 使用 Windows DPAPI 安全存储
- ✓ **错误处理**: 提供用户友好的错误消息
- ✓ **账户管理**: 查看、编辑、删除、同步
- ✓ **邮件同步**: IMAP 支持邮件拉取
- ✓ **应用密码指导**: 为每个服务商提供步骤指南

---

## 文件结构

### 新增模块

#### `/utils/emailProviders.ts`
提供商配置和检测模块

**主要导出:**
```typescript
// 获取所有提供商
getAllProviders(): ProviderConfig[]

// 按ID获取提供商配置
getProviderConfig(providerId: string): ProviderConfig

// 从邮箱地址检测提供商
detectProvider(email: string): string

// 获取提供商帮助信息
getProviderHelp(providerId: string): ProviderHelp | null

// 验证自定义 IMAP 配置
validateCustomConfig(config): { valid: boolean; errors: string[] }

// 获取连接选项
getConnectionOptions(email, password, config)
```

#### `/utils/authValidator.ts`
认证验证和错误处理模块

**主要功能:**
```typescript
// 验证邮箱格式
validateEmail(email): { valid: boolean; error?: AuthError }

// 验证密码
validatePassword(password): { valid: boolean; error?: AuthError }

// 翻译认证错误为用户友好消息
translateAuthError(error, providerId): AuthError

// 获取认证帮助信息
getAuthenticationHelp(providerId): string

// 获取详细的认证提示
getDetailedAuthHint(providerId, error?): string

// 获取基于邮箱域名的提供商建议
suggestProvider(email): { providerId: string; name: string } | null
```

### 修改的组件

#### `/components/AddAccountDialog.tsx`
增强了账户添加对话框

**新增功能:**
- 从 `emailProviders` 动态加载提供商列表
- 显示应用密码需求标志
- 集成帮助模态框，显示逐步指南
- 支持自定义 IMAP/SMTP 配置
- 密码可见性切换
- 改进的错误消息处理
- 中文界面支持

**核心变更:**
```typescript
// 原来的静态提供商列表
const PROVIDERS = [...]

// 现在动态加载
import { getAllProviders } from '../utils/emailProviders'
const PROVIDERS = getAllProviders()

// 支持自定义 IMAP 配置
const [showCustomConfig, setShowCustomConfig] = useState(false)
const [customConfig, setCustomConfig] = useState({...})

// 在 payload 中传递
if (showCustomConfig && selectedProvider === 'imap') {
  payload.customConfig = customConfig
}
```

#### `/components/Settings.tsx`
增强了设置面板

**新增功能:**
- 显示账户颜色编码
- 账户详情面板
- 同步按钮
- 删除账户功能
- 显示 IMAP/SMTP 配置信息
- 中文界面支持

#### `/electron/main.js`
增强了账户管理后端

**改进:**
- 改进的错误消息翻译
- 更详细的凭证验证错误提示
- 同步状态管理 (syncing → active/error)
- 更好的密码解密错误处理

---

## 使用流程

### 场景 1: 添加 Gmail 账户

1. **打开添加账户对话框** → 选择 Gmail
2. **输入凭证**
   - 邮箱: `user@gmail.com`
   - 密码: 应用专用密码 (从 myaccount.google.com/apppasswords 生成)
3. **点击"添加账户"**
   - 系统会通过 IMAP 验证凭证
   - 成功后进入确认步骤
4. **设置显示名称** → 完成

### 场景 2: 添加自定义 IMAP 账户

1. **打开添加账户对话框** → 选择"自定义 IMAP"
2. **输入邮箱和密码**
3. **配置 IMAP/SMTP 服务器**
   ```
   IMAP: imap.example.com:993
   IMAP 端口: 993
   IMAP SSL: 启用
   
   SMTP: smtp.example.com:587
   SMTP 端口: 587
   ```
4. **验证并完成**

### 场景 3: 查看和管理账户

1. **打开设置** → 邮箱账户部分
2. **点击账户** → 查看详情
   - 查看服务商、邮箱地址、显示名称
   - 查看 IMAP/SMTP 配置（如适用）
   - 查看最后同步时间
3. **操作**
   - **立即同步**: 手动拉取邮件
   - **删除账户**: 移除账户及其邮件

---

## 错误处理

### 常见错误及解决方案

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| "Invalid credentials" | 邮箱或密码错误 | 检查邮箱和密码是否正确 |
| "App password required" | 使用了常规密码而不是应用专用密码 | 生成应用专用密码 |
| "IMAP disabled" | IMAP 未启用 | 在邮箱设置中启用 IMAP |
| "Connection timeout" | 网络问题或服务器无响应 | 检查网络，尝试不同的端口 |
| "SSL certificate error" | SSL/TLS 验证失败 | 尝试禁用 SSL 或更改端口 |

### 错误消息流程

```
用户输入 → validateCredentialsFormat() 
  ↓
通过格式验证 → 尝试 IMAP 连接
  ↓
捕获异常 → mapErrorToCode()
  ↓
translateAuthError() → 用户友好的消息
  ↓
displayError() 显示给用户
```

---

## API 集成

### 前端到后端通信

#### 添加账户
```typescript
const result = await window.electronAPI.addAccount({
  email: string,
  password: string,
  provider?: string,        // 自动检测如果未提供
  displayName?: string,     // 可选
  customConfig?: {          // 仅用于自定义 IMAP
    imapHost: string,
    imapPort: number,
    smtpHost: string,
    smtpPort: number,
    secure: boolean
  }
})
// 返回: { success: boolean, account?: Account, error?: string }
```

#### 获取账户列表
```typescript
const accounts = await window.electronAPI.getAccounts()
// 返回: Account[]
```

#### 删除账户
```typescript
const result = await window.electronAPI.deleteAccount(accountId)
// 返回: { success: boolean, error?: string }
```

#### 同步邮件
```typescript
const result = await window.electronAPI.syncEmails(accountId)
// 返回: { success: boolean, message?: string, lastSync?: string, error?: string }
```

---

## 密码安全

### 加密策略

1. **Windows DPAPI 加密** (优先)
   - 使用操作系统级别的 DPAPI API
   - 每个用户/计算机特定的密钥
   - 即使数据库文件被盗也无法解密
   ```javascript
   if (safeStorage.isEncryptionAvailable()) {
     encrypted = safeStorage.encryptString(password).toString('base64')
   }
   ```

2. **解密** (使用时)
   ```javascript
   const buffer = Buffer.from(encrypted, 'base64')
   const password = safeStorage.decryptString(buffer)
   ```

3. **后备方案**
   - 如果 DPAPI 不可用，密码以 base64 编码存储（不安全）
   - 日志输出: "Password encryption not available"

### 最佳实践

✓ 密码从不以明文形式存储或传输  
✓ 连接后立即使用、不缓存  
✓ IMAP/SMTP 配置信息无加密（不敏感）  
✓ 密钥管理由操作系统处理  

---

## 配置示例

### `types.ts` 中的 Account 接口

```typescript
export interface Account {
  id: string
  email: string
  displayName?: string
  provider: 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'qq' | '163' | 'imap'
  status: 'active' | 'syncing' | 'error'
  lastSync?: string
  imapHost?: string      // 仅用于自定义 IMAP
  imapPort?: number
  smtpHost?: string
  smtpPort?: number
}
```

---

## 开发指南

### 添加新的邮件提供商

1. **在 `emailProviders.ts` 中添加配置**
```typescript
export const EMAIL_PROVIDERS: Record<string, ProviderConfig> = {
  // ... 现有提供商
  newprovider: {
    id: 'newprovider',
    name: 'New Provider',
    domain: '@newprovider.com',
    color: '#XXXXXX',
    imapHost: 'imap.newprovider.com',
    imapPort: 993,
    smtpHost: 'smtp.newprovider.com',
    smtpPort: 465,
    secure: true,
    requiresAppPassword: true,
    appPasswordUrl: 'https://...',
    helpUrl: 'https://...',
    notes: '...'
  }
}
```

2. **在 `authValidator.ts` 中添加错误映射**
```typescript
if (providerId === 'newprovider') {
  if (msg.includes('specific_error_pattern')) {
    return 'APP_PASSWORD_REQUIRED'
  }
}
```

3. **在 `detectProvider()` 中添加域名检测**
```typescript
export function detectProvider(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() || ''
  // ... 现有检测
  if (domain.includes('newprovider')) return 'newprovider'
}
```

### 测试账户验证

```typescript
import { validateEmail, validatePassword, validateCredentialsFormat } from '@/utils/authValidator'
import { getProviderConfig } from '@/utils/emailProviders'

// 测试邮箱验证
expect(validateEmail('test@gmail.com').valid).toBe(true)
expect(validateEmail('invalid').valid).toBe(false)

// 测试密码验证
expect(validatePassword('12345').valid).toBe(true)
expect(validatePassword('').valid).toBe(false)

// 测试完整验证
const result = validateCredentialsFormat('test@gmail.com', 'password123')
expect(result.valid).toBe(true)
```

---

## 常见问题

**Q: 为什么 Gmail 需要应用专用密码？**  
A: 为了安全起见，Google 不允许第三方应用访问常规密码。应用专用密码只能用于 IMAP/SMTP，限制了损害范围。

**Q: 我可以使用常规密码登录吗？**  
A: 对于大多数提供商，如果未启用双因素认证，可以使用常规密码。但建议始终使用应用专用密码以获得最佳安全性。

**Q: 我的密码存储在哪里？**  
A: 密码使用 Windows DPAPI 加密后存储在 SQLite 数据库中。每台计算机/用户的密钥不同，即使复制数据库文件也无法解密。

**Q: 我可以同步多个账户吗？**  
A: 是的！您可以添加无限数量的账户。每个账户独立同步。

**Q: 邮件同步需要多长时间？**  
A: 初始同步取决于邮箱大小和网络速度。后续同步应该在几秒钟内完成。

---

## 故障排除

### 调试步骤

1. **检查浏览器控制台** (F12)
   - 查找 JavaScript 错误
   - 检查网络请求

2. **检查 Electron 主进程日志**
   - 查看 IMAP 连接错误
   - 验证数据库操作

3. **启用详细日志** (main.js)
   ```javascript
   const config = {
     imap: {
       // ... 配置
       debug: console.log  // 启用 IMAP 调试
     }
   }
   ```

4. **测试 IMAP 连接**
   ```bash
   # 使用工具如 Thunderbird 或命令行测试
   openssl s_client -connect imap.gmail.com:993
   ```

---

## 性能优化

- ✓ 邮件同步限制为最近 20 条（可配置）
- ✓ 密码仅在需要时解密
- ✓ IMAP 连接在使用后立即关闭
- ✓ 数据库操作批量处理

---

## 安全性检查清单

- ✓ 密码使用 DPAPI 加密
- ✓ 不记录敏感信息（密码、令牌）
- ✓ IMAP/SMTP 使用 TLS 连接
- ✓ 数据库文件不通过网络传输
- ✓ 定期同步，避免长期存储
- ✓ 用户可控制地删除账户和邮件

---

## 更新日志

### v1.0.0 (2025-12-06)

**新增:**
- ✓ Gmail、Outlook、Yahoo、QQ、163、iCloud 支持
- ✓ 自定义 IMAP/SMTP 支持
- ✓ 账户管理面板
- ✓ 应用密码指导
- ✓ 错误处理和用户消息
- ✓ 密码加密存储
- ✓ 邮件同步功能
- ✓ 中文界面

---

## 许可证

此实现遵循项目主许可证。
