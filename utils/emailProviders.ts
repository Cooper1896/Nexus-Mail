/**
 * Email Provider Configuration Module
 * Supports Gmail, Outlook, Yahoo, QQ, Netease 163, iCloud, and custom IMAP
 */

export interface ProviderConfig {
  id: string;
  name: string;
  domain: string;
  color: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  secure: boolean;
  requiresAppPassword: boolean;
  appPasswordUrl?: string;
  helpUrl?: string;
  notes?: string;
}

export interface ProviderHelp {
  title: string;
  steps: string[];
  moreInfoUrl: string;
}

export const EMAIL_PROVIDERS: Record<string, ProviderConfig> = {
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    domain: '@gmail.com',
    color: '#EA4335',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    secure: true,
    requiresAppPassword: true,
    appPasswordUrl: 'https://myaccount.google.com/apppasswords',
    helpUrl: 'https://support.google.com/accounts/answer/185833',
    notes: 'Requires App Password. Use 2-step verification to generate one.'
  },
  outlook: {
    id: 'outlook',
    name: 'Outlook',
    domain: '@outlook.com',
    color: '#0078D4',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    secure: false,
    requiresAppPassword: true,
    appPasswordUrl: 'https://account.live.com/proxycontact',
    helpUrl: 'https://support.microsoft.com/en-us/account-billing/using-app-passwords-with-your-microsoft-account',
    notes: 'Requires App Password if 2FA is enabled. Allow "Less secure apps" if no 2FA.'
  },
  yahoo: {
    id: 'yahoo',
    name: 'Yahoo',
    domain: '@yahoo.com',
    color: '#6001D2',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 465,
    secure: true,
    requiresAppPassword: true,
    appPasswordUrl: 'https://login.yahoo.com/account/security',
    helpUrl: 'https://help.yahoo.com/kb/SLN15241.html',
    notes: 'Requires App Password. Generate in Account Security settings.'
  },
  icloud: {
    id: 'icloud',
    name: 'iCloud',
    domain: '@icloud.com',
    color: '#999999',
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.me.com',
    smtpPort: 587,
    secure: false,
    requiresAppPassword: true,
    appPasswordUrl: 'https://appleid.apple.com/account/manage',
    helpUrl: 'https://support.apple.com/en-us/HT202304',
    notes: 'Use App-specific password from Apple ID Security settings.'
  },
  qq: {
    id: 'qq',
    name: 'QQ邮箱',
    domain: '@qq.com',
    color: '#12B7F5',
    imapHost: 'imap.qq.com',
    imapPort: 993,
    smtpHost: 'smtp.qq.com',
    smtpPort: 465,
    secure: true,
    requiresAppPassword: true,
    appPasswordUrl: 'https://mail.qq.com/cgi-bin/frame',
    helpUrl: 'https://service.mail.qq.com/detail/0/75',
    notes: '需要生成授权密码。在QQ邮箱设置-账户中启用IMAP/SMTP功能。'
  },
  '163': {
    id: '163',
    name: '网易邮箱',
    domain: '@163.com',
    color: '#D43E2A',
    imapHost: 'imap.163.com',
    imapPort: 993,
    smtpHost: 'smtp.163.com',
    smtpPort: 465,
    secure: true,
    requiresAppPassword: true,
    appPasswordUrl: 'https://mail.163.com/dashi',
    helpUrl: 'https://help.mail.163.com/mailluhelp/nav/7_1_5_0_0_1.html',
    notes: '需要生成授权密码。在设置-账户-POP3/SMTP/IMAP中开启。'
  },
  imap: {
    id: 'imap',
    name: '自定义IMAP',
    domain: '',
    color: '#666666',
    imapHost: '',
    imapPort: 993,
    smtpHost: '',
    smtpPort: 587,
    secure: true,
    requiresAppPassword: false,
    notes: '使用自定义IMAP/SMTP服务器配置。'
  }
};

/**
 * Detect provider from email domain
 */
export function detectProvider(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() || '';

  if (domain.includes('gmail')) return 'gmail';
  if (domain.includes('googlemail')) return 'gmail';
  if (domain.includes('outlook')) return 'outlook';
  if (domain.includes('hotmail')) return 'outlook';
  if (domain.includes('live.com')) return 'outlook';
  if (domain.includes('msn.com')) return 'outlook';
  if (domain.includes('yahoo')) return 'yahoo';
  if (domain.includes('ymail')) return 'yahoo';
  if (domain.includes('rocketmail')) return 'yahoo';
  if (domain.includes('icloud') || domain.includes('me.com') || domain.includes('mac.com')) return 'icloud';
  if (domain.includes('qq.com')) return 'qq';
  if (domain === '163.com') return '163';
  if (domain.includes('126.com')) return '163';
  if (domain.includes('yeah.net')) return '163';

  return 'imap'; // Default to custom IMAP
}

/**
 * Get provider configuration by ID
 */
export function getProviderConfig(providerId: string): ProviderConfig {
  return EMAIL_PROVIDERS[providerId] || EMAIL_PROVIDERS.imap;
}

/**
 * Get all providers for UI display
 */
export function getAllProviders(): ProviderConfig[] {
  return Object.values(EMAIL_PROVIDERS);
}

/**
 * Get help information for a provider
 */
export function getProviderHelp(providerId: string): ProviderHelp | null {
  const config = getProviderConfig(providerId);

  const helpSteps: Record<string, string[]> = {
    gmail: [
      '前往 myaccount.google.com/apppasswords',
      '选择 Mail 和 Windows Computer（或您的设备）',
      '生成应用专用密码',
      '使用生成的密码登录邮件客户端'
    ],
    outlook: [
      '访问 account.live.com/security',
      '启用两步验证（如未启用）',
      '生成应用密码',
      '使用生成的密码登录'
    ],
    yahoo: [
      '访问 login.yahoo.com/account/security',
      '在安全和隐私部分生成应用密码',
      '选择应用为 "Other App"',
      '使用生成的密码登录'
    ],
    icloud: [
      '访问 appleid.apple.com',
      '选择安全选项',
      '在"应用专用密码"部分生成密码',
      '使用生成的密码登录'
    ],
    qq: [
      '登录 QQ 邮箱',
      '访问设置 > 账户',
      '在 POP3/SMTP 部分开启授权',
      '生成授权密码并使用该密码登录'
    ],
    '163': [
      '登录网易邮箱',
      '访问设置 > 账户',
      '在 POP3/SMTP/IMAP 部分开启服务',
      '生成授权密码并使用该密码登录'
    ]
  };

  if (helpSteps[providerId]) {
    return {
      title: `${config.name} 设置指南`,
      steps: helpSteps[providerId],
      moreInfoUrl: config.helpUrl || ''
    };
  }

  return null;
}

/**
 * Validate custom IMAP configuration
 */
export function validateCustomConfig(config: {
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  secure: boolean;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.imapHost || config.imapHost.trim() === '') {
    errors.push('IMAP服务器地址不能为空');
  }

  if (!config.imapPort || config.imapPort < 1 || config.imapPort > 65535) {
    errors.push('IMAP端口必须是1-65535之间的数字');
  }

  if (!config.smtpHost || config.smtpHost.trim() === '') {
    errors.push('SMTP服务器地址不能为空');
  }

  if (!config.smtpPort || config.smtpPort < 1 || config.smtpPort > 65535) {
    errors.push('SMTP端口必须是1-65535之间的数字');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if provider requires app password
 */
export function requiresAppPassword(providerId: string): boolean {
  const config = getProviderConfig(providerId);
  return config.requiresAppPassword;
}

/**
 * Get provider-specific connection options
 */
export function getConnectionOptions(
  email: string,
  password: string,
  config: ProviderConfig
) {
  return {
    imap: {
      user: email,
      password: password,
      host: config.imapHost,
      port: config.imapPort,
      tls: config.secure,
      authTimeout: 10000
    },
    smtp: {
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: email,
        pass: password
      }
    }
  };
}
