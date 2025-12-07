# 📝 预览应用代码结构说明

## 🏗️ 应用架构概览

预览中正在运行的是一个 **Nexus Mail** 邮件客户端应用，基于 React + TypeScript + Electron 构建。

### 应用类型
- **前端框架**: React 19.2.1 + TypeScript 5.2.2
- **构建工具**: Vite 5.0.12
- **桌面框架**: Electron 28.2.0
- **样式框架**: Tailwind CSS 3.4.1
- **UI 组件库**: Lucide React 0.556.0

## 📁 代码结构

```
d:\Mail.develop\
├── index.html              # HTML 入口页面
├── index.tsx               # React 应用入口
├── index.css               # 全局样式（Tailwind + 自定义 CSS 变量）
├── App.tsx                 # 主应用组件（869 行）
├── types.ts                # TypeScript 类型定义
├── tailwind.config.js      # Tailwind 配置
├── vite.config.ts          # Vite 构建配置
├── tsconfig.json           # TypeScript 配置
│
├── components/             # React 组件库
│   ├── Onboarding.tsx      # 初始化步骤流程（596 行）
│   ├── OAuthLogin.tsx      # OAuth 登陆对话框
│   ├── Sidebar.tsx         # 左侧导航栏
│   ├── EmailList.tsx       # 邮件列表
│   ├── ReadingPane.tsx     # 邮件阅读窗格
│   ├── ComposeModal.tsx    # 邮件编写对话框
│   ├── Settings.tsx        # 设置界面
│   ├── AddAccountDialog.tsx    # 添加账户对话框
│   ├── AddProfileDialog.tsx    # 添加个人资料对话框
│   ├── EditProfileDialog.tsx   # 编辑个人资料对话框
│   ├── ChatInterface.tsx   # 聊天界面
│   ├── MessageBubble.tsx   # 消息气泡组件
│   └── UsageChart.tsx      # 使用统计图表
│
├── utils/                  # 工具函数
│   ├── oauthProviders.ts   # OAuth 提供商配置（270 行）
│   ├── authValidator.ts    # 认证验证器
│   ├── emailProviders.ts   # 邮件提供商配置
│   └── validation.ts       # 验证工具函数
│
├── electron/               # Electron 主进程
│   ├── main.js             # 主进程（2129 行，刚刚优化）
│   └── preload.js          # 预加载脚本
│
├── .env                    # 环境变量（包含 OAuth 凭证）
├── package.json            # 项目依赖配置
└── dist/                   # 构建输出目录
    ├── index.html
    ├── assets/
    │   ├── index-*.css
    │   └── index-*.js
    └── ...
```

## 🎨 UI 设计特点

### 主题系统
- **亮色主题**: Windows 风格的浅色设计
- **暗色主题**: 深色模式支持
- **玻璃态设计**: `glass-panel` 类实现毛玻璃效果

### 色彩变量 (CSS 变量)
```css
:root {
  --win-bg: #f3f3f3;                    /* 背景色 */
  --win-panel: rgba(255, 255, 255, 0.7); /* 面板背景 */
  --win-surface: #ffffff;               /* 表面色 */
  --win-text: #1a1a1a;                  /* 文本色 */
  --shadow-color: rgba(0, 0, 0, 0.1);   /* 阴影色 */
}
```

### 响应式设计
- Tailwind CSS 提供响应式类（sm, md, lg, xl）
- 移动菜单支持（`isMobileMenuOpen` 状态）
- 自适应布局

## 🔄 应用流程

### 初始化流程
```
1. index.tsx 加载 App.tsx
   ↓
2. App.tsx 检查本地存储的用户数据
   ↓
3. 如果无用户 → 显示 Onboarding 组件
   ↓
4. 用户选择登陆方式 (OAuth 或 手动)
   ↓
5. 登陆完成 → 显示主邮件界面
```

### Onboarding 步骤流程
```
Step 1: 选择登陆方式
  ├─ OAuth 登陆 (推荐)
  └─ 手动输入凭证

Step 2: 选择邮件提供商
  ├─ Gmail (Google)
  ├─ Outlook (Microsoft)
  ├─ Yahoo Mail
  └─ iCloud Mail

Step 3: OAuth 认证流程
  ├─ 启动 OAuth 窗口
  ├─ 获取授权码
  ├─ 交换 Token
  └─ 获取用户信息

Step 4: 个人资料设置
  ├─ 显示名称
  ├─ 自定义邮箱名
  └─ 分组选择

Step 5: 完成设置
  └─ 创建账户并返回主界面
```

## 💾 主要状态管理

### App.tsx 核心状态
```typescript
// 用户相关
const [currentUser, setCurrentUser] = useState<User | undefined>();
const [currentView, setCurrentView] = useState<AppView>('setup');
const [profiles, setProfiles] = useState<User[]>([]);

// 邮件数据
const [emails, setEmails] = useState<Email[]>([]);
const [folders, setFolders] = useState<Folder[]>([]);
const [selectedFolderId, setSelectedFolderId] = useState('inbox');
const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

// 同步状态
const [syncStatus, setSyncStatus] = useState({...});
const [syncProgress, setSyncProgress] = useState({...});
const [isSyncing, setIsSyncing] = useState(false);

// UI 状态
const [isComposeOpen, setIsComposeOpen] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
const [filterType, setFilterType] = useState<FilterType>('all');
const [theme, setTheme] = useState<Theme>('system');
```

## 🔐 OAuth 集成

### 支持的提供商
1. **Gmail (Google)**
   - 认证 URL: `https://accounts.google.com/o/oauth2/v2/auth`
   - Token 端点: `https://oauth2.googleapis.com/token`
   - 权限: `gmail.readonly`, `gmail.send`, `gmail.modify`

2. **Outlook (Microsoft)**
   - 认证 URL: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
   - Token 端点: `https://login.microsoftonline.com/common/oauth2/v2.0/token`
   - 权限: `Mail.Read`, `Mail.Send`, `offline_access`

3. **Yahoo Mail**
   - 认证 URL: `https://api.login.yahoo.com/oauth2/request_auth`
   - Token 端点: `https://api.login.yahoo.com/oauth2/get_token`
   - 权限: `mail-r`, `mail-w`

### OAuth 回调流程
```
用户点击 OAuth 按钮
  ↓
App → Electron → 启动本地服务器 (localhost:7357)
  ↓
打开浏览器窗口 → 用户授权
  ↓
重定向 → http://localhost:7357/callback?code=...
  ↓
IPC 消息 'oauth:code-received' → React 组件
  ↓
exchangeCodeForToken() → 获取访问令牌
  ↓
fetchUserProfile() → 获取用户信息
  ↓
account:add → 添加账户到数据库
```

## 📡 IPC 通信接口

### Electron <→ React 通信

**React 调用 Electron:**
```typescript
// OAuth 相关
window.electronAPI.oauth.login(providerId)
window.electronAPI.oauth.exchangeCode({ providerId, code })

// 账户管理
window.electronAPI.addAccount(accountDetails)
window.electronAPI.getAccounts(profileId)
window.electronAPI.deleteAccount(accountId)

// 邮件操作
window.electronAPI.syncEmails(accountId)
window.electronAPI.sendEmail(emailData)
window.electronAPI.markEmailRead(emailId, isRead)
```

**Electron 发送信号到 React:**
```javascript
// OAuth 事件
mainWindow.webContents.send('oauth:code-received', { code })
mainWindow.webContents.send('oauth:error', { error })

// 同步事件
mainWindow.webContents.send('sync:progress', progressData)
```

## 🎯 当前预览内容

在 `http://localhost:4173` 预览中，你看到的是：

1. **HTML 页面** (`index.html`)
   - 标题: "Nexus Mail"
   - 包含 CSP 安全策略
   - 根元素: `<div id="root"></div>`
   - 背景: 渐变网格 (mesh-bg)

2. **React App** (`App.tsx`)
   - 当前视图: 'setup' (初始化视图)
   - 显示 Onboarding 组件
   - 用户可以选择登陆方式

3. **Onboarding 流程** (`Onboarding.tsx`)
   - 显示 OAuth 提供商选择
   - Gmail、Outlook、Yahoo 等选项
   - 支持手动输入凭证

4. **样式系统** (`index.css`)
   - Tailwind CSS 基础样式
   - Windows 风格的 UI 主题
   - 支持亮色/暗色模式

## 🚀 核心功能模块

### 1. 认证系统
- OAuth 2.0 流程
- 手动凭证输入
- Token 存储和刷新
- 账户安全加密

### 2. 邮件同步
- IMAP 连接
- 实时进度更新
- 文件夹同步
- 附件处理

### 3. 邮件操作
- 发送邮件 (SMTP)
- 标记已读/未读
- 星标/取消星标
- 移动/删除邮件
- 草稿保存

### 4. 用户管理
- 多账户支持
- 个人资料管理
- 主题切换
- 语言设置

### 5. UI 交互
- 实时搜索
- 邮件过滤
- 同步进度显示
- 键盘快捷键支持

## 📊 项目统计

| 指标 | 值 |
|------|-----|
| 总行数 | ~2000+ |
| React 组件 | 12+ |
| TypeScript 文件 | 20+ |
| Electron 主进程 | 2129 行 |
| CSS 变量 | 15+ |
| 支持的 OAuth 提供商 | 4+ |
| 支持的邮件提供商 | 6+ |

## 🔧 最近的改进 (2025-12-07)

✅ **OAuth 启动失败修复**
- 增强环境变量加载
- 改进错误处理和日志
- 优化 OAuth 窗口管理
- 增强 Token 交换功能

✅ **诊断工具**
- check-oauth-config.js - 配置检查
- test-oauth-flow.js - 流程测试

## 📚 相关文档

- `OAUTH_COMPLETE_SOLUTION.md` - 完整解决方案
- `OAUTH_FIX_GUIDE.md` - 修复指南
- `types.ts` - 类型定义详解
- `package.json` - 依赖信息

---

这就是预览中运行的完整应用代码架构！
