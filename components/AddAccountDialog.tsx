import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, ShieldCheck, Loader2, Check, X, User, AlertCircle, HelpCircle, ExternalLink, Eye, EyeOff, Cloud } from 'lucide-react';
import { Account } from '../types';
import { isValidEmail } from '../utils/validation';
import { getAllProviders, getProviderConfig, getProviderHelp } from '../utils/emailProviders';
import { getAllOAuthProviders } from '../utils/oauthProviders';
import { translateAuthError, getAuthenticationHelp, getDetailedAuthHint } from '../utils/authValidator';

interface AddAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (account: Account) => void;
  profileId: string;
}

const PROVIDERS = getAllProviders();

export const AddAccountDialog: React.FC<AddAccountDialogProps> = ({ isOpen, onClose, onComplete, profileId }) => {
  const [step, setStep] = useState(1); // 1: Login Type, 2: Provider Selection (OAuth), 3: Credentials, 4: Success
  const [loginType, setLoginType] = useState<'oauth' | 'manual' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const [customConfig, setCustomConfig] = useState({
    imapHost: '',
    imapPort: 993,
    smtpHost: '',
    smtpPort: 587,
    secure: true
  });

  const fetchUserProfile = async (provider: string, token: any) => {
    try {
      let url = '';
      const headers = { 'Authorization': `Bearer ${token.access_token}` };
  
      if (provider === 'gmail') {
        url = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json';
      } else if (provider === 'outlook') {
        url = 'https://graph.microsoft.com/v1.0/me';
      } else if (provider === 'yahoo') {
        url = 'https://api.login.yahoo.com/openid/v1/userinfo';
      }
  
      if (!url) return null;
  
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const data = await response.json();
      
      if (provider === 'gmail') {
        return { email: data.email, name: data.name };
      } else if (provider === 'outlook') {
        return { email: data.mail || data.userPrincipalName, name: data.displayName };
      } else if (provider === 'yahoo') {
        return { email: data.email, name: data.name };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Listen for OAuth events
  useEffect(() => {
    if (!isOpen || !window.electronAPI?.oauth) return;

    const handleOAuthCode = async (data: { code: string }) => {
      if (!selectedProvider) return;
      
      try {
        // 1. Exchange code for token
        const tokenResult = await window.electronAPI.oauth.exchangeCode({
          providerId: selectedProvider,
          code: data.code
        });

        if (!tokenResult.success || !tokenResult.token) {
          throw new Error(tokenResult.error || 'Token exchange failed');
        }

        // 2. Fetch User Profile
        let email = '';
        let displayName = '';
        
        // Try to get from ID Token first
        if (tokenResult.token.id_token) {
           try {
             const payload = JSON.parse(atob(tokenResult.token.id_token.split('.')[1]));
             email = payload.email;
             displayName = payload.name;
           } catch (e) {
             console.error('Failed to decode ID token', e);
           }
        }

        // If not in ID token, fetch from API
        if (!email) {
          const profile = await fetchUserProfile(selectedProvider, tokenResult.token);
          if (profile) {
            email = profile.email;
            displayName = profile.name || displayName;
          }
        }

        if (!email) {
           throw new Error('Could not retrieve email address from provider');
        }

        const result = await window.electronAPI.addAccount({
          email: email,
          password: '', // No password for OAuth
          provider: selectedProvider,
          oauthToken: tokenResult.token,
          displayName: displayName || email.split('@')[0],
          profileId: profileId
        });

        if (result.success && result.account) {
          setIsLoading(false);
          setEmail(result.account.email);
          setDisplayName(result.account.displayName || '');
          setStep(5); // Success
        } else {
          setError(result.error || 'Failed to add account');
          setIsLoading(false);
        }

      } catch (err: any) {
        setError(err.message || 'OAuth setup failed');
        setIsLoading(false);
      }
    };

    const handleOAuthError = (data: { error: string }) => {
      setError(data.error);
      setIsLoading(false);
    };

    window.electronAPI.oauth.on('oauth:code-received', handleOAuthCode);
    window.electronAPI.oauth.on('oauth:error', handleOAuthError);

    return () => {
      window.electronAPI.oauth.off('oauth:code-received', handleOAuthCode);
      window.electronAPI.oauth.off('oauth:error', handleOAuthError);
    };
  }, [isOpen, selectedProvider]);

  if (!isOpen) return null;

  const PROVIDERS = getAllProviders();
  const OAUTH_PROVIDERS = getAllOAuthProviders();

  const handleLoginTypeSelect = (type: 'oauth' | 'manual') => {
    setLoginType(type);
    setError(null);
    if (type === 'oauth') {
      setStep(2); // Provider selection for OAuth
    } else {
      setStep(3); // Provider selection for manual input
    }
  };

  const handleOAuthProvider = async (providerId: string) => {
    setSelectedProvider(providerId);
    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI?.oauth?.login?.(providerId);
      
      if (!result?.success) {
        setError(result?.error || '启动认证失败');
        setIsLoading(false);
        return;
      }

      // Wait for OAuth code
      // The IPC event will be listened to from main process
      // For now, we'll auto-complete after OAuth
    } catch (err: any) {
      setError(err.message || '登陆失败');
      setIsLoading(false);
    }
  };

  const handleManualProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setError(null);
    if (providerId === 'imap') {
      setShowCustomConfig(true);
    }
    setStep(4);
  };

  const handleConnect = async () => {
    if (!email || !password || !isValidEmail(email)) return;
    setIsLoading(true);
    setError(null);

    try {
      if (window.electronAPI) {
        const payload: any = {
          email,
          password,
          provider: selectedProvider || undefined,
          displayName: displayName || email.split('@')[0],
          profileId: profileId
        };

        if (showCustomConfig && selectedProvider === 'imap') {
          payload.customConfig = customConfig;
        }

        const result = await window.electronAPI.addAccount(payload);

        if (result.success && result.account) {
          setIsLoading(false);
          setDisplayName(result.account.displayName || email.split('@')[0]);
          setStep(5); // Success
        } else {
          setError(result.error || 'Failed to add account');
          setIsLoading(false);
        }
      } else {
        // Demo mode without Electron
        setTimeout(() => {
          setIsLoading(false);
          setDisplayName(email.split('@')[0]);
          setStep(5); // Success
        }, 1500);
      }
    } catch (err: any) {
      const authError = translateAuthError(err, selectedProvider || 'imap');
      setError(authError.userMessage);
      setIsLoading(false);
    }
  };

  const handleFinish = async () => {
    // Refresh accounts from backend if needed
    const newAccount: Account = {
      id: Date.now().toString(),
      email: email,
      displayName: displayName,
      provider: (selectedProvider as Account['provider']) || 'imap',
      status: 'active',
      lastSync: 'Just now'
    };

    onComplete(newAccount);
    handleClose();
  };

  const handleClose = () => {
    // Reset state
    setTimeout(() => {
      setStep(1);
      setEmail('');
      setPassword('');
      setSelectedProvider(null);
      setDisplayName('');
      setError(null);
      setShowPassword(false);
      setShowHelpModal(false);
      setShowCustomConfig(false);
      setCustomConfig({
        imapHost: '',
        imapPort: 993,
        smtpHost: '',
        smtpPort: 587,
        secure: true
      });
    }, 300);
    onClose();
  };

  const handleBack = () => {
    setError(null);
    if (step === 2) {
      setStep(1);
      setLoginType(null);
      setSelectedProvider(null);
    } else if (step === 3) {
      setStep(1);
      setLoginType(null);
      setSelectedProvider(null);
    } else if (step === 4) {
      setStep(3);
      setSelectedProvider(null);
      setShowCustomConfig(false);
    }
  };

  const getProviderInfo = () => {
    if (!selectedProvider) return null;
    return getProviderConfig(selectedProvider);
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={handleClose} />
      <div className="w-full max-w-md bg-win-bg border border-win-border rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-win-open flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-win-border bg-win-surface/50">
          <h2 className="text-lg font-semibold text-win-text">Add Account</h2>
          <button
            onClick={handleClose}
            className="p-1 text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">

          {/* Step 1: Login Type Selection */}
          {step === 1 && (
            <div className="space-y-4 animate-slide-in-right">
              <h3 className="text-base font-semibold text-win-text mb-4">选择登陆方式</h3>
              
              <button
                onClick={() => handleLoginTypeSelect('oauth')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-win-border bg-gradient-to-r from-win-surface/50 to-blue-500/5 hover:border-blue-500 hover:bg-gradient-to-r hover:from-win-surface hover:to-blue-500/10 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors flex-shrink-0">
                  <Cloud size={24} className="text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-win-text">OAuth 登陆（推荐）</div>
                  <div className="text-xs text-win-subtext mt-0.5">跳转到服务商进行安全认证</div>
                </div>
                <ArrowRight size={18} className="text-win-subtext group-hover:text-blue-500 transition-colors" />
              </button>

              <button
                onClick={() => handleLoginTypeSelect('manual')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-win-border bg-win-surface hover:bg-win-surface-hover hover:border-win-border-active transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-win-surface-hover flex items-center justify-center group-hover:bg-win-border transition-colors flex-shrink-0">
                  <Mail size={24} className="text-win-text" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-win-text">手动输入</div>
                  <div className="text-xs text-win-subtext mt-0.5">输入邮箱和密码手动连接</div>
                </div>
                <ArrowRight size={18} className="text-win-subtext group-hover:text-win-primary transition-colors" />
              </button>

              <p className="text-xs text-win-muted text-center mt-6">
                🔒 您的密码仅用于 IMAP 连接，不会发送到我们的服务器
              </p>
            </div>
          )}

          {/* Step 2: OAuth Provider Selection */}
          {step === 2 && (
            <div className="space-y-4 animate-slide-in-right">
              <button
                onClick={() => {
                  setLoginType(null);
                  setStep(1);
                }}
                className="flex items-center gap-2 text-sm text-win-subtext hover:text-win-primary transition-colors mb-2"
              >
                <ArrowRight size={14} className="rotate-180" />
                返回
              </button>
              
              <h3 className="text-base font-semibold text-win-text mb-4">选择邮箱服务商</h3>
              
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                {OAUTH_PROVIDERS.map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => handleOAuthProvider(provider.id)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-win-border bg-win-surface hover:bg-win-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {provider.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-win-text">{provider.name}</div>
                      <div className="text-xs text-win-subtext">OAuth 认证</div>
                    </div>
                    {isLoading && selectedProvider === provider.id ? (
                      <Loader2 size={16} className="animate-spin text-win-primary" />
                    ) : (
                      <ExternalLink size={16} className="text-win-subtext group-hover:text-win-primary transition-colors" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Manual Provider Selection (Before Credentials) */}
          {step === 3 && (
            <div className="space-y-4 animate-slide-in-right">
              <button
                onClick={() => {
                  setLoginType(null);
                  setStep(1);
                }}
                className="flex items-center gap-2 text-sm text-win-subtext hover:text-win-primary transition-colors mb-2"
              >
                <ArrowRight size={14} className="rotate-180" />
                返回
              </button>
              
              <h3 className="text-base font-semibold text-win-text mb-4">选择你的邮箱服务商</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {PROVIDERS.map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => handleManualProviderSelect(provider.id)}
                    className="flex items-center gap-3 p-4 rounded-xl border border-win-border bg-win-surface hover:bg-win-surface-hover hover:border-win-border-active transition-all text-left group relative"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: provider.color }}
                    >
                      {provider.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-win-text group-hover:text-win-primary truncate">
                        {provider.name}
                      </div>
                      {provider.domain && (
                        <div className="text-xs text-win-muted truncate">{provider.domain}</div>
                      )}
                    </div>
                    {provider.requiresAppPassword && (
                      <div className="text-xs bg-orange-500/20 text-orange-500 px-2 py-1 rounded-md whitespace-nowrap">
                        需要密码
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Manual Credentials Input */}
          {step === 4 && (
            <div className="space-y-6 animate-slide-in-right">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  {selectedProvider && (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ backgroundColor: getProviderInfo()?.color }}
                    >
                      {getProviderInfo()?.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-win-text font-medium">
                      {getProviderInfo()?.name}
                    </h3>
                    <p className="text-xs text-win-subtext">输入你的凭证</p>
                  </div>
                </div>
                {!showCustomConfig && selectedProvider && selectedProvider !== 'imap' && (
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="p-2 rounded-lg hover:bg-win-surface-hover text-win-subtext hover:text-win-primary transition-colors"
                    title="获取帮助"
                  >
                    <HelpCircle size={18} />
                  </button>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{error}</p>
                    {selectedProvider && selectedProvider !== 'imap' && (
                      <p className="text-xs mt-1 opacity-90">{getAuthenticationHelp(selectedProvider)}</p>
                    )}
                  </div>
                </div>
              )}

              {!showCustomConfig && selectedProvider && selectedProvider !== 'imap' && getProviderInfo()?.notes && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm">
                  <ShieldCheck size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{getProviderInfo()?.notes}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-win-subtext ml-1">邮箱</label>
                  <div className="relative group w-full">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className={`fluent-input pl-10 rounded-xl w-full box-border ${email && !isValidEmail(email) ? 'border-red-500 focus:border-red-500' : ''}`}
                      autoFocus
                    />
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-win-muted group-focus-within:text-win-primary transition-colors" />
                  </div>
                  {email && !isValidEmail(email) && (
                    <p className="text-[10px] text-red-500 ml-1">请输入有效的邮箱地址</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-win-subtext ml-1">密码 / 应用密码</label>
                  <div className="relative group w-full">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="fluent-input pl-10 pr-10 rounded-xl w-full box-border"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-win-muted">
                      <div className="w-4 h-4 rounded-full border-2 border-current opacity-60"></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-win-muted hover:text-win-text transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-win-muted ml-1">
                    {selectedProvider === 'gmail' && 'Gmail 需要应用专用密码'}
                    {selectedProvider === 'outlook' && 'Outlook 需要应用密码或启用"安全性较低的应用"'}
                    {selectedProvider === 'yahoo' && 'Yahoo 需要应用专用密码'}
                    {selectedProvider === 'qq' && 'QQ邮箱需要授权码'}
                    {selectedProvider === '163' && '网易邮箱需要授权码'}
                    {selectedProvider === 'icloud' && 'iCloud 需要应用专用密码'}
                    {selectedProvider === 'imap' && '输入您的 IMAP 邮箱密码'}
                  </p>
                </div>

                {/* Custom IMAP Configuration */}
                {showCustomConfig && selectedProvider === 'imap' && (
                  <div className="space-y-4 pt-4 border-t border-win-border">
                    <p className="text-xs font-semibold text-win-subtext">IMAP 配置</p>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-win-subtext ml-1">IMAP 服务器</label>
                      <input
                        type="text"
                        value={customConfig.imapHost}
                        onChange={(e) => setCustomConfig({ ...customConfig, imapHost: e.target.value })}
                        placeholder="imap.example.com"
                        className="fluent-input pl-3 rounded-xl w-full box-border"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-win-subtext ml-1">IMAP 端口</label>
                        <input
                          type="number"
                          value={customConfig.imapPort}
                          onChange={(e) => setCustomConfig({ ...customConfig, imapPort: parseInt(e.target.value) })}
                          min="1"
                          max="65535"
                          className="fluent-input pl-3 rounded-xl w-full box-border"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-win-subtext ml-1">IMAP SSL</label>
                        <select
                          value={customConfig.secure ? 'true' : 'false'}
                          onChange={(e) => setCustomConfig({ ...customConfig, secure: e.target.value === 'true' })}
                          className="fluent-input pl-3 rounded-xl w-full box-border"
                        >
                          <option value="true">启用</option>
                          <option value="false">禁用</option>
                        </select>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-win-subtext">SMTP 配置</p>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-win-subtext ml-1">SMTP 服务器</label>
                      <input
                        type="text"
                        value={customConfig.smtpHost}
                        onChange={(e) => setCustomConfig({ ...customConfig, smtpHost: e.target.value })}
                        placeholder="smtp.example.com"
                        className="fluent-input pl-3 rounded-xl w-full box-border"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-win-subtext ml-1">SMTP 端口</label>
                        <input
                          type="number"
                          value={customConfig.smtpPort}
                          onChange={(e) => setCustomConfig({ ...customConfig, smtpPort: parseInt(e.target.value) })}
                          min="1"
                          max="65535"
                          className="fluent-input pl-3 rounded-xl w-full box-border"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-win-muted pt-2">
                  <ShieldCheck size={14} className="text-win-primary" />
                  <span>密码使用系统级加密保护</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-sm text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-xl transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={handleConnect}
                  disabled={
                    !email || !password || isLoading || !isValidEmail(email) ||
                    (showCustomConfig && (!customConfig.imapHost || !customConfig.smtpHost))
                  }
                  className={`
                    flex items-center gap-2 px-6 py-2 rounded-xl font-medium text-sm transition-all
                    ${!email || !password || isLoading || !isValidEmail(email) || (showCustomConfig && (!customConfig.imapHost || !customConfig.smtpHost))
                      ? 'bg-win-surface-active text-win-subtext cursor-not-allowed'
                      : 'bg-win-primary hover:bg-win-hover active:bg-win-pressed text-white shadow-sm active:scale-[0.98]'}
                  `}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isLoading ? '添加中...' : '添加账户'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <div className="space-y-6 animate-slide-in-right text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mx-auto flex items-center justify-center">
                <Check size={32} className="text-green-500" />
              </div>

              <div>
                <h3 className="text-win-text font-semibold text-lg">账户已添加!</h3>
                <p className="text-sm text-win-subtext mt-1">{email}</p>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-win-subtext ml-1">显示名称</label>
                <div className="relative group w-full">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="fluent-input pl-10 rounded-xl w-full box-border"
                  />
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-win-muted group-focus-within:text-win-primary transition-colors" />
                </div>
              </div>

              <button
                onClick={handleFinish}
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-win-primary hover:bg-win-hover text-white rounded-xl font-medium text-sm shadow-sm active:scale-[0.98] transition-all"
              >
                <span>完成</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && selectedProvider && selectedProvider !== 'imap' && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowHelpModal(false)} />
          <div className="relative z-10 w-full max-w-sm bg-win-bg border border-win-border rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-win-border bg-win-surface/50">
              <h3 className="text-lg font-semibold text-win-text flex items-center gap-2">
                <HelpCircle size={20} className="text-blue-500" />
                {getProviderInfo()?.name} 帮助
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-4">
                {getProviderInfo()?.notes && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-600">{getProviderInfo()?.notes}</p>
                  </div>
                )}

                {getProviderInfo()?.requiresAppPassword && (
                  <>
                    <div>
                      <h4 className="font-semibold text-win-text mb-2">应用密码生成步骤:</h4>
                      <ol className="space-y-2 text-sm text-win-subtext">
                        {selectedProvider === 'gmail' && (
                          <>
                            <li>1. 访问 <span className="text-win-primary">myaccount.google.com/apppasswords</span></li>
                            <li>2. 选择应用为 "Mail"，设备为 "Windows Computer"</li>
                            <li>3. 生成应用专用密码</li>
                            <li>4. 使用生成的密码登录</li>
                          </>
                        )}
                        {selectedProvider === 'outlook' && (
                          <>
                            <li>1. 访问 <span className="text-win-primary">account.microsoft.com/security</span></li>
                            <li>2. 启用两步验证（如未启用）</li>
                            <li>3. 生成应用密码</li>
                            <li>4. 使用生成的密码登录</li>
                          </>
                        )}
                        {selectedProvider === 'yahoo' && (
                          <>
                            <li>1. 登录 <span className="text-win-primary">login.yahoo.com</span></li>
                            <li>2. 访问账户安全设置</li>
                            <li>3. 生成应用密码</li>
                            <li>4. 使用生成的密码登录</li>
                          </>
                        )}
                        {selectedProvider === 'icloud' && (
                          <>
                            <li>1. 访问 <span className="text-win-primary">appleid.apple.com</span></li>
                            <li>2. 点击安全选项</li>
                            <li>3. 在"应用专用密码"中生成密码</li>
                            <li>4. 使用生成的密码登录</li>
                          </>
                        )}
                        {selectedProvider === 'qq' && (
                          <>
                            <li>1. 登录 QQ 邮箱</li>
                            <li>2. 访问设置 - 账户</li>
                            <li>3. 在 POP3/SMTP 部分开启授权</li>
                            <li>4. 生成授权码并使用</li>
                          </>
                        )}
                        {selectedProvider === '163' && (
                          <>
                            <li>1. 登录网易邮箱</li>
                            <li>2. 访问设置 - 账户</li>
                            <li>3. 在 POP3/SMTP/IMAP 部分开启服务</li>
                            <li>4. 生成授权码并使用</li>
                          </>
                        )}
                      </ol>
                    </div>

                    {getProviderInfo()?.appPasswordUrl && (
                      <a
                        href={getProviderInfo()?.appPasswordUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-win-primary hover:text-win-hover text-sm font-medium mt-2"
                      >
                        <span>直接前往生成页面</span>
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </>
                )}

                {getProviderInfo()?.helpUrl && (
                  <a
                    href={getProviderInfo()?.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-win-primary hover:text-win-hover text-sm font-medium"
                  >
                    <span>查看完整帮助文档</span>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
