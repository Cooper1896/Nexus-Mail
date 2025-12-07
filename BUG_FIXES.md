# 登录凭证和邮件同步问题修复报告

## 问题分析

软件登录后无法保存凭证和资料，以及无法正常获取邮件的根本原因：

### 1. **用户会话不持久化**
- **问题**: 用户登录后的状态（currentUser、profiles）仅存储在React的内存状态中
- **后果**: 应用刷新后所有登录信息丢失，需要重新onboarding
- **原因**: 缺少localStorage持久化机制

### 2. **OAuth令牌保存流程不完整**
- **问题**: 虽然OAuth令牌被保存到数据库，但onboarding完成后没有立即自动添加为账户
- **后果**: 令牌存储但无法用于邮件同步

### 3. **邮件同步错误处理不足**
- **问题**: email:sync处理器缺少充分的错误处理、重试机制和详细的日志
- **后果**: 同步失败时用户无法了解失败原因

---

## 修复内容

### 修复1: 用户会话持久化 (App.tsx)

**添加localStorage管理：**

```typescript
// 1. 应用启动时从localStorage恢复用户状态
useEffect(() => {
  const savedUser = localStorage.getItem('currentUser');
  const savedProfiles = localStorage.getItem('profiles');
  const savedTheme = localStorage.getItem('theme') as Theme;
  
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setCurrentView('mail');  // 直接进入邮件视图
    } catch (err) {
      console.error('Failed to restore user session:', err);
      localStorage.removeItem('currentUser');
    }
  }
  // ... 恢复profiles和theme
}, []);

// 2. 状态变化时自动保存到localStorage
useEffect(() => {
  if (currentUser) {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }
}, [currentUser]);

useEffect(() => {
  if (profiles.length > 0) {
    localStorage.setItem('profiles', JSON.stringify(profiles));
  }
}, [profiles]);

useEffect(() => {
  localStorage.setItem('theme', theme);
}, [theme]);
```

**好处：**
- ✅ 用户登录信息在应用刷新后保持
- ✅ 用户偏好设置（主题）被记住
- ✅ 多个用户档案被正确保存和恢复

---

### 修复2: OAuth令牌和账户保存流程 (App.tsx)

**改进handleOnboardingComplete函数：**

```typescript
const handleOnboardingComplete = async (user: User, password?: string) => {
  if (window.electronAPI) {
    const accountDetails: any = {
      email: user.email,
      displayName: user.name
    };

    // 正确处理OAuth或密码认证
    if (user.oauthToken) {
      accountDetails.oauthToken = user.oauthToken;
      accountDetails.provider = user.oauthProvider || 'gmail';
    } else {
      accountDetails.password = password;
      accountDetails.provider = accountDetails.provider || 'gmail';
    }

    try {
      // 添加账户到数据库
      const result = await window.electronAPI.addAccount(accountDetails);

      if (result.success && result.account) {
        // 更新用户对象包含新账户
        const updatedUser = {
          ...user,
          accounts: [result.account]
        };
        
        setCurrentUser(updatedUser);
        setCurrentView('mail');
        
        // 立即触发邮件同步
        setTimeout(() => {
          handleSync();
        }, 500);
      } else {
        alert('无法添加账户: ' + (result.error || '未知错误'));
      }
    } catch (err) {
      console.error('Error adding account:', err);
      alert('添加账户出错，请重试');
    }
  }
};
```

**好处：**
- ✅ OAuth令牌正确存储到数据库（带DPAPI加密）
- ✅ 账户立即可用于邮件同步
- ✅ 自动触发初始邮件同步
- ✅ 错误信息对用户友好

---

### 修复3: 邮件同步流程改进 (electron/main.js)

**增强email:sync处理器：**

```javascript
ipcMain.handle('email:sync', async (_, accountId) => {
  try {
    console.log('[email:sync] Starting sync for account:', accountId);
    const account = dbGet('SELECT * FROM accounts WHERE id = ?', [accountId]);
    if (!account) throw new Error('Account not found');

    // 更新账户状态为"syncing"
    dbRun('UPDATE accounts SET status = ? WHERE id = ?', ['syncing', accountId]);

    let config;
    
    // 处理OAuth认证
    if (account.encryptedOAuthToken) {
      console.log('[email:sync] Using OAuth authentication');
      let oauthToken;
      try {
        if (safeStorage.isEncryptionAvailable()) {
          const buffer = Buffer.from(account.encryptedOAuthToken, 'base64');
          const tokenString = safeStorage.decryptString(buffer);
          oauthToken = JSON.parse(tokenString);
        }
      } catch (e) {
        console.error('OAuth token decryption failed:', e);
        throw new Error('Failed to decrypt OAuth token: ' + e.message);
      }

      // 支持多个OAuth提供商（Gmail、Outlook、Yahoo）
      if ((account.provider === 'gmail' || account.provider === 'outlook' || account.provider === 'yahoo') 
          && oauthToken.access_token) {
        const xoauth2 = `user=${account.email}\x01auth=Bearer ${oauthToken.access_token}\x01\x01`;
        config = {
          imap: {
            user: account.email,
            xoauth2: xoauth2,
            host: account.imapHost,
            port: account.imapPort,
            tls: account.secure === 1,
            authTimeout: 3000
          }
        };
      } else {
        throw new Error(`OAuth provider ${account.provider} not fully supported for IMAP`);
      }
    } else {
      // 处理密码认证
      console.log('[email:sync] Using password authentication');
      let password = account.encryptedPassword;
      if (safeStorage.isEncryptionAvailable()) {
        try {
          const buffer = Buffer.from(account.encryptedPassword, 'base64');
          password = safeStorage.decryptString(buffer);
        } catch (e) {
          console.error('Password decryption failed:', e);
          throw new Error('Failed to decrypt password');
        }
      }

      config = {
        imap: {
          user: account.email,
          password: password,
          host: account.imapHost,
          port: account.imapPort,
          tls: account.secure === 1,
          authTimeout: 3000
        }
      };
    }

    // IMAP连接与邮件获取
    console.log('[email:sync] Connecting to IMAP server:', account.imapHost);
    let connection;
    try {
      connection = await imaps.connect(config);
      console.log('[email:sync] Connected to IMAP server');
    } catch (connectErr) {
      console.error('[email:sync] IMAP connection error:', connectErr.message);
      if (connectErr.message.includes('AUTHENTICATE') || connectErr.message.includes('authentication')) {
        throw new Error('Authentication failed. Please check your credentials or use an app-specific password.');
      }
      throw connectErr;
    }
    
    try {
      await connection.openBox('INBOX', false);
      const messages = await connection.search(['ALL'], { 
        bodies: ['HEADER', 'TEXT'],
        markSeen: false 
      });
      
      const recentMessages = messages.slice(-20).reverse();
      let syncedCount = 0;

      for (const item of recentMessages) {
        try {
          const header = item.parts.find(part => part.which === 'HEADER');
          if (!header) continue;

          const subject = header.body.subject?.[0] || '(No Subject)';
          const from = header.body.from?.[0] || 'Unknown';
          const date = header.body.date?.[0] || new Date().toISOString();
          const body = item.parts.find(part => part.which === 'TEXT')?.body || '';
          const id = item.attributes.uid.toString();

          const existing = dbGet('SELECT id FROM emails WHERE id = ? AND accountId = ?', [id, accountId]);
          if (!existing) {
            dbRun(
              `INSERT INTO emails (...) VALUES (...)`,
              [id, accountId, 'inbox', from, from, subject, body.substring(0, 100), body, date, 0, 0]
            );
            syncedCount++;
          }
        } catch (itemErr) {
          console.error('[email:sync] Error processing email:', itemErr.message);
          continue; // 跳过此邮件，继续下一个
        }
      }

      const now = new Date().toISOString();
      dbRun('UPDATE accounts SET lastSync = ?, status = ? WHERE id = ?', [now, 'active', accountId]);

      return { success: true, message: `Synced ${syncedCount} new emails`, lastSync: now };
    } finally {
      try {
        connection.end();
      } catch (e) {
        console.error('[email:sync] Error closing connection:', e.message);
      }
    }
  } catch (err) {
    console.error('[email:sync] Sync error:', err);
    dbRun('UPDATE accounts SET status = ? WHERE id = ?', ['error', accountId]);
    
    // 提供有意义的错误消息
    let errorMsg = 'Sync failed: ' + err.message;
    if (err.message && err.message.includes('AUTHENTICATE')) {
      errorMsg = 'Authentication failed - check your password or use app-specific password';
    } else if (err.message && err.message.includes('timeout')) {
      errorMsg = 'Connection timeout - check your network connection';
    } else if (err.message && err.message.includes('certificate')) {
      errorMsg = 'SSL/TLS certificate verification failed';
    }
    
    return { success: false, error: errorMsg };
  }
});
```

**改进内容：**
- ✅ 支持OAuth和密码认证的完整令牌解密
- ✅ 支持多个OAuth提供商（Gmail、Outlook、Yahoo）
- ✅ 详细的日志用于调试
- ✅ 每个邮件处理的独立错误捕获，防止一个错误阻止整个同步
- ✅ 改进的连接关闭处理（finally块）
- ✅ 用户友好的错误消息
- ✅ 账户状态跟踪（syncing → active/error）

---

## 测试清单

### 1. 首次登录测试
- [ ] 使用OAuth (Gmail/Outlook) 登录
- [ ] 验证账户正确添加到数据库
- [ ] 验证邮件自动同步
- [ ] 刷新应用，验证登录状态被保留

### 2. 持久化测试
- [ ] 关闭应用完全重启
- [ ] 验证用户状态被恢复
- [ ] 验证主题设置被保留
- [ ] 验证多用户档案被保留

### 3. 邮件同步测试
- [ ] OAuth账户邮件正确同步
- [ ] 密码认证账户邮件正确同步
- [ ] 同步失败时显示有意义的错误
- [ ] 验证最近20封邮件被获取

### 4. 错误处理测试
- [ ] 无效的OAuth令牌
- [ ] 网络超时
- [ ] 错误的密码
- [ ] 服务商不可用

---

## 文件更改总结

| 文件 | 改动 | 行数 |
|------|------|------|
| `App.tsx` | 添加localStorage持久化、改进onboarding处理 | +60 |
| `electron/main.js` | 改进email:sync处理器，添加完整错误处理 | +100 |

---

## 已知限制与未来改进

1. **OAuth令牌刷新** - 当access_token过期时，目前需要重新授权
   - 建议: 实现refresh_token自动刷新机制

2. **离线支持** - 应用需要网络连接来同步邮件
   - 建议: 缓存邮件内容用于离线阅读

3. **iCloud Mail限制** - iCloud不支持OAuth IMAP认证
   - 当前: 需要使用app-specific密码
   - 建议: 实现app-specific密码生成指导

4. **性能优化** - 大量邮件同步时可能变慢
   - 建议: 实现分页和增量同步

---

## 如何重现问题（修复前）

1. 启动应用
2. 使用OAuth登录（例如Gmail）
3. 应用崩溃或刷新
4. 观察：用户登录信息丢失，邮件未同步

## 修复验证

1. 启动应用
2. 使用OAuth登录
3. 邮件应该自动开始同步
4. 刷新应用（F5）
5. 验证：用户信息保留，邮件仍在列表中
6. 关闭应用完全退出
7. 重新启动应用
8. 验证：直接进入邮件视图，所有数据完整

---

**修复完成日期**: 2025-12-07
**构建状态**: ✅ 成功 (npm run build)
