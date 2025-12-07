# OAuth 配置检查清单

## ✅ 快速配置步骤

### 1. Google Gmail
- [ ] 访问 https://console.cloud.google.com
- [ ] 创建或选择项目
- [ ] 启用 Gmail API
- [ ] 创建 OAuth 2.0 凭证（Web 应用）
- [ ] 设置重定向 URI: `http://localhost:7357/callback`
- [ ] 复制 Client ID 到 `.env` → `VITE_GOOGLE_CLIENT_ID`
- [ ] 复制 Client Secret 到 `.env` → `VITE_GOOGLE_CLIENT_SECRET`
- [ ] 配置 OAuth 同意屏幕
- [ ] 添加权限范围: `gmail.readonly`, `gmail.send`, `gmail.modify`

### 2. Microsoft Outlook
- [ ] 访问 https://portal.azure.com
- [ ] 进入 Azure AD (Entra ID)
- [ ] 注册新应用
- [ ] 设置重定向 URI: `http://localhost:7357/callback`
- [ ] 复制应用(客户端) ID 到 `.env` → `VITE_MICROSOFT_CLIENT_ID`
- [ ] 创建客户端密钥
- [ ] 复制密钥值到 `.env` → `VITE_MICROSOFT_CLIENT_SECRET`
- [ ] 配置 API 权限: `Mail.Read`, `Mail.Send`, `offline_access`
- [ ] 授予管理员同意

### 3. Yahoo Mail
- [ ] 访问 https://developer.yahoo.com
- [ ] 登陆 Yahoo 账户
- [ ] 创建新应用
- [ ] 选择 Web 应用类型
- [ ] 设置重定向 URI: `http://localhost:7357/callback`
- [ ] 复制 Client ID 到 `.env` → `VITE_YAHOO_CLIENT_ID`
- [ ] 复制 Client Secret 到 `.env` → `VITE_YAHOO_CLIENT_SECRET`
- [ ] 启用权限: `mail-r`, `mail-w`

### 4. Apple iCloud Mail
- [ ] 访问 https://developer.apple.com (需要付费开发者账户)
- [ ] 进入 Certificates, Identifiers & Profiles
- [ ] 创建 Services ID
- [ ] 启用 "Sign in with Apple"
- [ ] 配置 Web Authentication
- [ ] 设置回调 URL: `http://localhost:7357/callback`
- [ ] 下载 Private Key
- [ ] 复制 Services ID 到 `.env` → `VITE_APPLE_CLIENT_ID`
- [ ] 复制 Private Key 到 `.env` → `VITE_APPLE_CLIENT_SECRET`

---

## 📋 文件检查清单

### 确保以下文件存在
- [ ] `.env` - 包含 OAuth 凭证
- [ ] `.env.example` - 配置模板（已提供）
- [ ] `utils/oauthProviders.ts` - OAuth 配置模块
- [ ] `electron/main.js` - 包含 OAuth 处理
- [ ] `components/Onboarding.tsx` - OAuth UI 集成
- [ ] `OAUTH_SETUP_GUIDE.md` - OAuth 快速指南
- [ ] `OAUTH_IMPLEMENTATION.md` - 完整技术文档

---

## 🧪 测试检查清单

### 在开发环境测试
- [ ] 运行 `npm run electron:dev`
- [ ] 应用启动时显示 Onboarding 页面
- [ ] 输入邮箱后看到 OAuth 选项
- [ ] 点击 Gmail 按钮 → 打开浏览器登陆窗口
- [ ] 使用 Gmail 账户登陆并授权
- [ ] 自动返回应用后完成配置
- [ ] 邮件账户显示在列表中

### 对每个提供商重复上述测试
- [ ] Gmail
- [ ] Outlook
- [ ] Yahoo
- [ ] iCloud (可选)

---

## 🐛 调试检查清单

如果出现问题，检查以下项目：

### 环境变量
- [ ] `.env` 文件在项目根目录
- [ ] 凭证值正确且无多余空格
- [ ] 没有使用占位符如 "YOUR_CLIENT_ID"
- [ ] 开发服务器已重启（npm run electron:dev）

### OAuth 应用配置
- [ ] 重定向 URI 精确为 `http://localhost:7357/callback`
- [ ] 权限范围包括 gmail.send, Mail.Send 等必要权限
- [ ] 应用状态为"已启用"或"活跃"
- [ ] OAuth 凭证未过期

### 网络和端口
- [ ] localhost:7357 端口可用（未被占用）
- [ ] 网络连接正常
- [ ] 防火墙允许本地回环连接

### 应用日志
- [ ] 检查浏览器控制台是否有错误 (F12)
- [ ] 查看 Electron 开发工具输出
- [ ] 搜索 "OAuth" 相关的错误信息

---

## 🚀 部署前检查清单

### 生产环境准备
- [ ] 为生产环境创建新的 OAuth 应用
- [ ] 配置生产域名 (如 mail.example.com)
- [ ] 更新重定向 URI 为生产地址
- [ ] 在生产服务器设置环境变量
- [ ] 不要将 .env 提交到 Git
- [ ] 使用 .gitignore 排除 .env 文件
- [ ] 测试生产环境的 OAuth 流程

### 安全检查
- [ ] Client Secret 未硬编码在源代码中
- [ ] 环境变量通过安全的 CI/CD 管道注入
- [ ] 生产和开发使用不同的凭证
- [ ] Token 在存储时已加密

---

## 📞 获取帮助

**文档引用**:
- 详细配置步骤: `OAuth_Configuration_Guide.md`
- 快速上手指南: `OAUTH_SETUP_GUIDE.md`
- 技术实现细节: `OAUTH_IMPLEMENTATION.md`

**常见错误**:
1. "凭证未配置" → 检查 `.env` 文件
2. "重定向 URI 不匹配" → 确保 URI 精确为 `http://localhost:7357/callback`
3. "无法打开浏览器窗口" → 检查 localhost:7357 端口
4. "Token 无效" → 重新授权应用

---

**打印此清单**，按步骤完成 OAuth 配置！
