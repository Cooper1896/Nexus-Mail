/**
 * Email Authentication Validator Module
 * Handles provider-specific authentication validation and error messages
 */

import { ProviderConfig, getProviderConfig, EMAIL_PROVIDERS } from './emailProviders';

export interface AuthError {
  code: string;
  message: string;
  userMessage: string;
  suggestion?: string;
  requiresAppPassword?: boolean;
}

export interface CredentialValidationResult {
  valid: boolean;
  errors: AuthError[];
}

/**
 * Common authentication errors and their user-friendly messages
 */
const AUTH_ERRORS: Record<string, AuthError> = {
  INVALID_EMAIL: {
    code: 'INVALID_EMAIL',
    message: 'Invalid email format',
    userMessage: '邮箱格式不正确'
  },
  EMPTY_PASSWORD: {
    code: 'EMPTY_PASSWORD',
    message: 'Password is required',
    userMessage: '密码不能为空'
  },
  AUTHENTICATION_FAILED: {
    code: 'AUTHENTICATION_FAILED',
    message: 'Authentication failed',
    userMessage: '身份验证失败，请检查邮箱和密码',
    suggestion: '确保使用了正确的密码（某些服务需要应用专用密码）'
  },
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid credentials',
    userMessage: '邮箱或密码错误'
  },
  ACCOUNT_LOCKED: {
    code: 'ACCOUNT_LOCKED',
    message: 'Account is locked',
    userMessage: '账户已锁定，请检查您的邮箱收件箱',
    suggestion: '可能是由于多次错误尝试，请稍后再试'
  },
  APP_PASSWORD_REQUIRED: {
    code: 'APP_PASSWORD_REQUIRED',
    message: 'App password required',
    userMessage: '此邮箱需要使用应用专用密码',
    requiresAppPassword: true
  },
  CONNECTION_TIMEOUT: {
    code: 'CONNECTION_TIMEOUT',
    message: 'Connection timeout',
    userMessage: '连接超时，请检查网络连接',
    suggestion: '请确保您的网络连接正常'
  },
  ACCOUNT_ALREADY_EXISTS: {
    code: 'ACCOUNT_ALREADY_EXISTS',
    message: 'Account already exists',
    userMessage: '该账户已添加'
  },
  IMAP_NOT_ENABLED: {
    code: 'IMAP_NOT_ENABLED',
    message: 'IMAP is not enabled',
    userMessage: 'IMAP功能未启用，请在邮箱设置中启用'
  },
  SMTP_NOT_ENABLED: {
    code: 'SMTP_NOT_ENABLED',
    message: 'SMTP is not enabled',
    userMessage: 'SMTP功能未启用，请在邮箱设置中启用'
  },
  CERTIFICATE_ERROR: {
    code: 'CERTIFICATE_ERROR',
    message: 'Certificate verification failed',
    userMessage: 'SSL证书验证失败'
  },
  PORT_ERROR: {
    code: 'PORT_ERROR',
    message: 'Invalid port number',
    userMessage: '端口号无效（有效范围: 1-65535）'
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network error',
    userMessage: '网络错误，请检查连接'
  }
};

/**
 * Map common error messages to our error codes
 */
function mapErrorToCode(errorMessage: string, providerId: string): string {
  const msg = errorMessage.toLowerCase();

  // Authentication errors
  if (msg.includes('invalid credentials') || msg.includes('authentication failed')) {
    return 'INVALID_CREDENTIALS';
  }

  if (msg.includes('locked') || msg.includes('suspend')) {
    return 'ACCOUNT_LOCKED';
  }

  if (msg.includes('app password') || msg.includes('application-specific')) {
    return 'APP_PASSWORD_REQUIRED';
  }

  if (msg.includes('imap') && msg.includes('disabled')) {
    return 'IMAP_NOT_ENABLED';
  }

  if (msg.includes('timeout')) {
    return 'CONNECTION_TIMEOUT';
  }

  if (msg.includes('certificate') || msg.includes('ssl')) {
    return 'CERTIFICATE_ERROR';
  }

  if (msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('network')) {
    return 'NETWORK_ERROR';
  }

  // Provider-specific patterns
  if (providerId === 'gmail') {
    if (msg.includes('please log in via your web browser')) {
      return 'APP_PASSWORD_REQUIRED';
    }
  }

  if (providerId === 'outlook' || providerId === 'outlook.com') {
    if (msg.includes('sign in with app password')) {
      return 'APP_PASSWORD_REQUIRED';
    }
  }

  if (providerId === 'qq') {
    if (msg.includes('authorization code') || msg.includes('授权码')) {
      return 'APP_PASSWORD_REQUIRED';
    }
  }

  return 'AUTHENTICATION_FAILED';
}

/**
 * Get authentication error details
 */
export function getAuthError(errorCode: string): AuthError {
  return AUTH_ERRORS[errorCode] || {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    userMessage: '发生未知错误'
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: AuthError } {
  if (!email || email.trim() === '') {
    return { valid: false, error: getAuthError('EMPTY_PASSWORD') };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: getAuthError('INVALID_EMAIL') };
  }

  return { valid: true };
}

/**
 * Validate password
 */
export function validatePassword(password: string): { valid: boolean; error?: AuthError } {
  if (!password || password.trim() === '') {
    return { valid: false, error: getAuthError('EMPTY_PASSWORD') };
  }

  if (password.length < 4) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PASSWORD',
        message: 'Password is too short',
        userMessage: '密码长度不能少于4个字符'
      }
    };
  }

  return { valid: true };
}

/**
 * Validate credentials format (before attempting connection)
 */
export function validateCredentialsFormat(
  email: string,
  password: string
): CredentialValidationResult {
  const errors: AuthError[] = [];

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid && emailValidation.error) {
    errors.push(emailValidation.error);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid && passwordValidation.error) {
    errors.push(passwordValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get user-friendly error message for a caught exception
 */
export function translateAuthError(
  error: Error | string,
  providerId: string
): AuthError {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errorCode = mapErrorToCode(errorMsg, providerId);
  const baseError = getAuthError(errorCode);

  // Enhance error with provider-specific guidance
  const config = getProviderConfig(providerId);
  if (baseError.requiresAppPassword && config.appPasswordUrl) {
    baseError.suggestion = `请访问 ${config.appPasswordUrl} 生成应用专用密码`;
  }

  return baseError;
}

/**
 * Check if error requires app password setup
 */
export function isAppPasswordRequired(error: any): boolean {
  const msg = String(error?.message || error || '').toLowerCase();
  return msg.includes('app password') ||
    msg.includes('application-specific') ||
    msg.includes('please log in via your web browser') ||
    msg.includes('authentication code');
}

/**
 * Get authentication help for a provider
 */
export function getAuthenticationHelp(providerId: string): string {
  const config = getProviderConfig(providerId);
  const helpText: Record<string, string> = {
    gmail: `Gmail 需要应用专用密码。请访问 ${config.appPasswordUrl}，启用两步验证后生成应用密码。`,
    outlook: `Outlook 需要应用密码。如果启用了双因素身份验证，请访问 ${config.appPasswordUrl}。`,
    yahoo: `Yahoo 需要应用密码。请访问 ${config.appPasswordUrl} 生成应用专用密码。`,
    icloud: `iCloud 需要应用专用密码。请访问 ${config.appPasswordUrl} 在"安全"部分生成。`,
    qq: `QQ邮箱需要授权码。请登录QQ邮箱，在设置中启用IMAP/SMTP，然后生成授权码。`,
    '163': `网易邮箱需要授权码。请在邮箱设置中启用POP3/SMTP/IMAP，然后生成授权码。`,
    imap: `请输入您的IMAP/SMTP服务器信息。`
  };

  return helpText[providerId] || helpText.imap;
}

/**
 * Build detailed authentication hint
 */
export function getDetailedAuthHint(providerId: string, error?: any): string {
  const config = getProviderConfig(providerId);
  const hints: string[] = [];

  hints.push(`邮件服务商: ${config.name}`);
  hints.push(`IMAP: ${config.imapHost}:${config.imapPort}`);
  hints.push(`SMTP: ${config.smtpHost}:${config.smtpPort}`);

  if (config.requiresAppPassword) {
    hints.push(`⚠️  此服务需要应用专用密码`);
    if (config.appPasswordUrl) {
      hints.push(`📍 生成密码: ${config.appPasswordUrl}`);
    }
  }

  if (config.helpUrl) {
    hints.push(`📚 帮助文档: ${config.helpUrl}`);
  }

  if (error) {
    const authError = translateAuthError(error, providerId);
    if (authError.suggestion) {
      hints.push(`💡 ${authError.suggestion}`);
    }
  }

  return hints.join('\n');
}

/**
 * Suggest which provider based on email domain
 */
export function suggestProvider(email: string): { providerId: string; name: string } | null {
  const domain = email.split('@')[1]?.toLowerCase() || '';

  const suggestions: Record<string, { id: string; name: string }> = {
    'gmail.com': { id: 'gmail', name: 'Gmail' },
    'googlemail.com': { id: 'gmail', name: 'Gmail' },
    'outlook.com': { id: 'outlook', name: 'Outlook' },
    'hotmail.com': { id: 'outlook', name: 'Outlook' },
    'live.com': { id: 'outlook', name: 'Outlook' },
    'msn.com': { id: 'outlook', name: 'Outlook' },
    'yahoo.com': { id: 'yahoo', name: 'Yahoo' },
    'ymail.com': { id: 'yahoo', name: 'Yahoo' },
    'rocketmail.com': { id: 'yahoo', name: 'Yahoo' },
    'icloud.com': { id: 'icloud', name: 'iCloud' },
    'me.com': { id: 'icloud', name: 'iCloud' },
    'mac.com': { id: 'icloud', name: 'iCloud' },
    'qq.com': { id: 'qq', name: 'QQ邮箱' },
    '163.com': { id: '163', name: '网易邮箱' },
    '126.com': { id: '163', name: '网易邮箱' },
    'yeah.net': { id: '163', name: '网易邮箱' }
  };

  if (suggestions[domain]) {
    return { providerId: suggestions[domain].id, name: suggestions[domain].name };
  }

  return null;
}
