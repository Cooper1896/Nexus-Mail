# 邮件客户端快速启动和测试指南

## 🚀 快速启动

### 1. 安装依赖（首次运行）
```bash
cd d:\Mail.develop
npm install
```

### 2. 启动应用
```bash
npm run electron:dev
```

应用将在 3-5 秒内启动 Electron 窗口。

---

## 📝 初始化流程

### 第一步：创建个人资料
1. 应用启动时会提示创建个人资料
2. 输入名称（如 "我的邮箱"）
3. 点击 "创建"

### 第二步：添加邮箱账户
1. 点击 "添加账户" 或 "+"
2. 选择邮箱提供商：
   - Gmail
   - Outlook
   - Apple Mail
   - QQ Mail
   - 163 Mail
   - 其他 (自定义 IMAP)

3. 点击认证按钮，完成 OAuth 验证

### 第三步：等待邮件同步
- 首次同步将获取最近 7 天的邮件
- 同步进度会显示在界面上
- 根据邮件数量，可能需要 10-30 秒

### 第四步：验证修复
打开邮件检查：
- ✅ **中文邮件** - 应该显示正确的中文字符
- ✅ **日文邮件** - 应该显示正确的日文字符
- ✅ **多语言邮件** - 应该混合显示正确

---

## 🔍 验证编码修复

### 查看应用日志

在应用运行时，查看终端输出，寻找以下日志：

#### ✅ 成功恢复 UTF-8
```
[email:sync] Auto-recovered UTF-8 - detected UTF-8 encoded as Latin-1
```

#### ✅ 字符集检测
```
[MIME] Content-Type: text/plain; charset="utf-8"
[Charset] Successfully decoded: utf-8
```

#### ✅ Quoted-Printable 解码
```
[email:sync] Processing Quoted-Printable encoded content
```

#### ✅ 邮件处理
```
[email:sync] Processed body length: 1234, first 50 chars: Hello world...
```

### 预期的正常启动日志
```
Successfully loaded .env file
Gmail Client ID loaded: true
Gmail Client Secret loaded: true
[account:list] Requesting accounts for profileId: ...
[email:list] Found 0 emails for folder: inbox
[email:sync-all] Starting full sync for account: ...
```

---

## 🛠️ 故障诊断

### 问题 1：应用无法启动

**症状**: Electron 窗口不出现，或立即崩溃

**解决步骤**:
```bash
# 1. 检查依赖
npm install

# 2. 清理旧文件
npm run clean 2>/dev/null; npm run build

# 3. 重新启动
npm run electron:dev
```

### 问题 2：无法连接到邮箱

**症状**: 认证失败，或无法获取邮件

**检查清单**:
- [ ] 网络连接正常
- [ ] 邮箱账户凭证正确
- [ ] 已启用应用专用密码（某些邮箱需要）
- [ ] 邮箱的 IMAP 访问已启用
- [ ] 防火墙未阻止 IMAP 端口（通常 993）

**尝试**:
```bash
# 清空数据库后重新添加账户
node clear-database.js
npm run electron:dev
```

### 问题 3：邮件仍显示乱码

**症状**: 邮件内容显示为 "Ä§Â¥ƒÃ" 或其他乱码

**检查清单**:
- [ ] 查看应用日志中是否有 UTF-8 恢复消息
- [ ] 检查是否是 Base64 编码的邮件（应该被自动解码）
- [ ] 尝试刷新或重新同步邮件

**尝试**:
```bash
# 清空所有邮件数据重新同步
node clear-database.js

# 重新启动并等待新的同步
npm run electron:dev
```

---

## 📊 监控和日志

### 启用详细日志

在 `electron/main.js` 中，已在关键位置添加了 `console.log`：

```javascript
// 邮件同步
[email:sync] ...

// 字符集处理
[Charset] ...

// MIME 解析
[MIME] ...

// MIME 头部
[MIME Header] ...
```

### 日志级别

| 前缀 | 级别 | 含义 |
|------|------|------|
| `[email:sync]` | 信息 | 邮件同步操作 |
| `[Charset]` | 信息 | 字符集转换 |
| `[MIME]` | 信息 | MIME 解析 |
| `[account:list]` | 信息 | 账户操作 |
| `[email:list]` | 信息 | 邮件列表 |
| `ERROR` | 错误 | 严重错误 |
| `warn` | 警告 | 警告信息 |

---

## ✅ 性能优化技巧

### 1. 快速同步
- 应用默认只同步最近 7 天的邮件
- 首次同步后，只会获取新邮件

### 2. 内存使用
- 应用使用 `removeAllListeners()` 防止内存泄漏
- 连接有 3 秒超时防止长期占用资源

### 3. 网络优化
- IMAP 搜索有 30 秒超时
- 邮件采用批量处理（最多 50 封/批）

---

## 🧪 高级测试

### 测试 1：验证字符集支持

```bash
# 运行诊断工具
node diagnose-charset.js

# 预期输出: 所有编码都返回 true
# ✓ GB2312: true
# ✓ GBK: true
# ✓ Big5: true
# ... 等等
```

### 测试 2：模拟真实场景

```bash
# 运行高级诊断
node diagnose-charset-advanced.js

# 预期输出: 4 个场景测试
# Test 1 (GB2312 QP): ✓
# Test 2 (UTF-8 Base64): ✓
# Test 3 (Big5 Base64): ✓
# Test 4 (ISO-8859-1 QP): ✓
```

### 测试 3：连接修复验证

```bash
# 运行连接修复测试
node test-connection-fix.js

# 预期输出:
# ✅ 搜索超时处理 - 通过
# ✅ 连接关闭安全处理 - 通过
# ✅ 日期格式化 - 通过
```

---

## 📋 应用数据位置

### Windows 本地数据
```
%LOCALAPPDATA%\Nexus Mail\
├── nexus-mail.db          # SQLite 数据库
├── cache/                 # 缓存文件
└── logs/                  # 日志文件
```

### 清空所有数据
```bash
# 自动清空脚本
node clear-database.js

# 或手动删除
rmdir /s /q "%LOCALAPPDATA%\Nexus Mail"
```

---

## 🔐 安全信息

### OAuth 凭证存储
- Gmail/Microsoft OAuth 令牌存储在本地数据库中
- 使用系统默认 SQLite 加密
- 建议定期检查账户权限

### IMAP 连接安全
- 使用 TLS/SSL (端口 993)
- 不存储明文密码
- 使用应用专用密码（推荐）

---

## 📞 常用命令

```bash
# 启动开发环境
npm run electron:dev

# 构建生产版本
npm run build
npm run electron

# 清理构建文件
npm run clean

# 运行测试
npm run test

# 诊断工具
node diagnose-charset.js
node diagnose-charset-advanced.js
node test-connection-fix.js
node clear-database.js
```

---

## 💡 提示和技巧

1. **快速重启** - 使用 `Ctrl+R` 在应用中重新加载
2. **开发者工具** - `F12` 打开浏览器开发者工具
3. **主进程日志** - 主进程日志显示在启动终端中
4. **数据备份** - 定期备份 `%LOCALAPPDATA%\Nexus Mail\`

---

## 📚 相关文档

- `FINAL_SOLUTION_SUMMARY.md` - 完整解决方案说明
- `SOCKET_FIX_REPORT.md` - Socket 错误修复说明
- `CHARSET_FIX_SUMMARY.md` - 字符集修复说明
- `RECONNECT_GUIDE.md` - 邮箱重新连接指南

---

**上次更新**: 2025-12-07
**版本**: 1.0.0
