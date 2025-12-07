import React, { useState } from 'react';
import { ChevronRight, Check, Mail, Loader2, ArrowRight, ShieldCheck, Zap, User as UserIcon, Users, Briefcase, PenTool, ArrowLeft, Key, User, Sun, Moon, Cloud, Eye, EyeOff, AlertCircle, ExternalLink } from 'lucide-react';
import { User as UserType, Theme } from '../types';
import { isValidEmail } from '../utils/validation';
import { getAllOAuthProviders } from '../utils/oauthProviders';

interface OnboardingProps {
  onComplete: (user: UserType, password: string) => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, currentTheme, onThemeChange }) => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'next' | 'back'>('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loginMode, setLoginMode] = useState<'oauth' | 'manual' | null>('oauth');
  const [selectedOAuthProvider, setSelectedOAuthProvider] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [oauthTokens, setOAuthTokens] = useState<any>(null);
  const [createdAccount, setCreatedAccount] = useState<any>(null);

  const [selectedGroupOption, setSelectedGroupOption] = useState('Personal');
  const [customGroupText, setCustomGroupText] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [newProfileId] = useState(Date.now().toString());

  const OAUTH_PROVIDERS = getAllOAuthProviders();

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

  const changeStep = (newStep: number) => {
    setDirection(newStep > step ? 'next' : 'back');
    setStep(newStep);
  };

  // OAuth callback listener
  React.useEffect(() => {
    const handleCodeReceived = (data: { code: string }) => {
      handleOAuthCodeExchange(data.code);
    };

    const unsubscribe = window.electronAPI?.oauth?.on?.('oauth:code-received', handleCodeReceived);

    return () => {
      if (window.electronAPI?.oauth?.off) {
        window.electronAPI.oauth.off('oauth:code-received', handleCodeReceived);
      }
    };
  }, [selectedOAuthProvider]);

  const deriveNameFromEmail = (emailStr: string) => {
    if (!emailStr) return '';
    const namePart = emailStr.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError(null);
  };

  const validateAndProceedEmail = () => {
    if (!email.trim()) {
      setEmailError('邮箱地址不能为空');
      return false;
    }
    if (!isValidEmail(email)) {
      setEmailError('请输入有效的邮箱地址');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleOAuthStart = async (providerId: string) => {
    setSelectedOAuthProvider(providerId);
    setIsLoading(true);
    setEmailError(null);

    try {
      const result = await window.electronAPI?.oauth?.login?.(providerId);
      
      if (!result?.success) {
        setEmailError(result?.error || 'OAuth 登陆启动失败');
        setIsLoading(false);
        return;
      }

      // Wait for OAuth callback - the flow will continue in handleOAuthCodeExchange
    } catch (err: any) {
      setEmailError(err.message || 'OAuth 登陆失败');
      setIsLoading(false);
    }
  };

  const handleOAuthCodeExchange = async (code: string) => {
    if (!selectedOAuthProvider) {
      setEmailError('未选择 OAuth 提供商');
      setIsLoading(false);
      return;
    }

    try {
      const result = await window.electronAPI?.oauth?.exchangeCode?.({ providerId: selectedOAuthProvider, code });

      if (!result?.success) {
        setEmailError(result?.error || 'Token 交换失败');
        setIsLoading(false);
        return;
      }

      // Store tokens and user info
      setOAuthTokens(result.token);
      
      // Extract email from token response or use provider name as fallback
      let oauthEmail = '';
      let oauthName = '';

      // 1. Try ID Token
      if (result.token?.id_token) {
        try {
          const payload = JSON.parse(atob(result.token.id_token.split('.')[1]));
          oauthEmail = payload.email;
          oauthName = payload.name;
        } catch (e) {
          console.error('Failed to decode ID token', e);
        }
      }

      // 2. Fetch Profile if needed
      if (!oauthEmail) {
        const profile = await fetchUserProfile(selectedOAuthProvider, result.token);
        if (profile) {
          oauthEmail = profile.email;
          oauthName = profile.name;
        }
      }

      // 3. Fallback (should not happen if scopes are correct)
      if (!oauthEmail) {
         oauthEmail = `user@${selectedOAuthProvider}.com`; // Last resort
      }

      setEmail(oauthEmail);
      
      if (!userName) {
        setUserName(oauthName || deriveNameFromEmail(oauthEmail));
      }

      const addAccountResult = await window.electronAPI.addAccount({
        email: oauthEmail,
        password: '', // No password for OAuth
        provider: selectedOAuthProvider,
        oauthToken: result.token,
        displayName: oauthName || oauthEmail.split('@')[0],
        profileId: newProfileId
      });

      if (addAccountResult.success && addAccountResult.account) {
        setCreatedAccount(addAccountResult.account);
        setIsLoading(false);
        changeStep(3);
      } else {
        setEmailError(addAccountResult.error || 'Failed to add account');
        setIsLoading(false);
      }
    } catch (err: any) {
      setEmailError(err.message || 'OAuth 认证失败');
      setIsLoading(false);
    }
  };

  const handleManualConnect = () => {
    if (!validateAndProceedEmail()) return;
    if (!password) {
      setEmailError('密码不能为空');
      return;
    }
    setIsLoading(true);
    setEmailError(null);
    
    setTimeout(() => {
      setIsLoading(false);
      if (!userName) setUserName(deriveNameFromEmail(email));
      changeStep(3);
    }, 1500);
  };

  const handleProfileSetup = () => {
    if (!userName) return;
    if (selectedGroupOption === 'Custom' && !customGroupText) return;
    changeStep(4);
  };

  const handleFinalize = async () => {
    const finalGroup = selectedGroupOption === 'Custom' ? customGroupText : selectedGroupOption;
    
    // If we already created an account (OAuth), update its display name if changed
    if (createdAccount && window.electronAPI?.updateAccount) {
      try {
        await window.electronAPI.updateAccount(createdAccount.id, { displayName: userName });
        // Update the local object too
        createdAccount.displayName = userName;
      } catch (e) {
        console.error('Failed to update account name', e);
      }
    }

    onComplete({
      id: newProfileId,
      name: userName,
      email: email,
      group: finalGroup,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`,
      accounts: createdAccount ? [createdAccount] : [],
      oauthToken: oauthTokens,
      oauthProvider: selectedOAuthProvider || undefined
    }, password);
  };

  // Windows 11 Slide Animation Classes
  const animationClass = direction === 'next'
    ? 'animate-slide-in-right'
    : 'animate-slide-in-left';

  const toggleTheme = () => {
    onThemeChange(currentTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-win-bg relative overflow-hidden p-4">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-full bg-win-surface border border-win-border text-win-text hover:bg-win-surface-hover transition-colors z-50 shadow-sm"
        title="Toggle Theme"
      >
        {currentTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Background Mesh (Windows 11 Bloom) */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#0066CC] rounded-full blur-[120px] opacity-20 animate-pulse-fluent"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#7000CC] rounded-full blur-[120px] opacity-20 animate-pulse-fluent" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Window Frame - strict rounded-3xl */}
      <div className="w-full max-w-lg bg-win-panel/80 backdrop-blur-xl border border-win-border rounded-3xl shadow-win-elevation flex flex-col relative overflow-hidden z-10 transition-all duration-500 max-h-[90vh] h-auto min-h-[500px]">

        {/* Step 1: Welcome (OOBE Style) */}
        {step === 1 && (
          <div className={`flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center ${animationClass}`}>
            <div className="mb-8 p-6 rounded-full bg-win-surface border border-win-border shadow-inner">
              <Mail className="w-12 h-12 text-win-primary" strokeWidth={1.5} />
            </div>

            <h1 className="text-2xl font-semibold text-win-text mb-3">Welcome to Nexus Mail</h1>
            <p className="text-win-subtext text-base leading-relaxed max-w-xs mb-8">
              A refined experience for your inbox. <br />
              Simple, fast, and focused.
            </p>

            <button
              onClick={() => changeStep(2)}
              className="group flex items-center gap-2 bg-win-primary hover:bg-win-hover active:bg-win-pressed text-white px-8 py-2.5 rounded-xl font-medium transition-all shadow-sm active:scale-[0.98]"
            >
              <span>Get Started</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* Step 2: Email & Connection */}
        {step === 2 && (
          <div className={`flex-1 flex flex-col p-8 md:p-10 ${animationClass}`}>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-win-text mb-1">Add Your Email</h2>
              <p className="text-win-subtext text-sm">Sign in to sync your emails.</p>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[60vh]">
              {/* OAuth Recommendation - Always Show */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 animate-slide-down-fluent">
                <div className="flex items-start gap-3">
                  <Cloud size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-600 mb-2">推荐使用 OAuth 登陆</p>
                    <p className="text-xs text-blue-600/80">更安全，无需记住密码，直接跳转到服务商登陆。</p>
                  </div>
                </div>
              </div>

              {/* OAuth Error Display */}
              {emailError && (
                <div className="flex items-start gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3 animate-slide-down-fluent">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{emailError}</span>
                </div>
              )}

              {/* OAuth Providers - Always shown */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-win-subtext">快速登陆</p>
                <div className="grid grid-cols-2 gap-2">
                  {OAUTH_PROVIDERS.slice(0, 4).map(provider => (
                    <button
                      key={provider.id}
                      onClick={() => handleOAuthStart(provider.id)}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 p-3 rounded-lg border border-win-border bg-win-surface hover:bg-win-surface-hover hover:border-win-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {isLoading && selectedOAuthProvider === provider.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Cloud size={14} />
                      )}
                      <span>{provider.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Input - Only show when explicitly toggled */}
              {showEmailInput && (
                <div className="space-y-2 animate-slide-down-fluent">
                  <label className="text-xs font-semibold text-win-subtext ml-1">Email Address</label>
                  <div className="relative group w-full">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="name@example.com"
                      className={`fluent-input pl-10 rounded-xl w-full box-border ${emailError ? 'border-red-500 focus:border-red-500' : ''}`}
                      autoFocus
                      disabled={isLoading}
                    />
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-win-muted group-focus-within:text-win-primary transition-colors" />
                  </div>
                  {emailError && (
                    <div className="flex items-center gap-2 text-xs text-red-500 ml-1">
                      <AlertCircle size={12} />
                      <span>{emailError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Password Input - Show when manual mode */}
              {showEmailInput && loginMode === 'manual' && (
                <div className="space-y-2 animate-slide-down-fluent">
                  <label className="text-xs font-semibold text-win-subtext ml-1">密码</label>
                  <div className="relative group w-full">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="fluent-input pl-10 pr-10 rounded-xl w-full box-border"
                      disabled={isLoading}
                    />
                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-win-muted" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-win-muted hover:text-win-text transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {showEmailInput && (
                <div className="flex items-center gap-2 text-xs text-win-muted">
                  <ShieldCheck size={14} className="text-win-primary" />
                  <span>密码使用系统级加密保护</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-win-border">
              <button
                onClick={() => {
                  if (showEmailInput) {
                    setShowEmailInput(false);
                    setEmail('');
                    setPassword('');
                    setLoginMode('oauth');
                  } else {
                    changeStep(1);
                  }
                }}
                className="text-win-subtext hover:text-win-text transition-colors text-sm px-3 py-2 rounded-xl hover:bg-win-surface-hover"
              >
                {showEmailInput ? '返回' : '返回'}
              </button>
              
              <div className="flex gap-2 items-center">
                {!showEmailInput && (
                  <button
                    onClick={() => {
                      setShowEmailInput(true);
                      setLoginMode('manual');
                    }}
                    className="text-win-subtext hover:text-win-text transition-colors text-sm px-3 py-2 rounded-xl hover:bg-win-surface-hover underline"
                  >
                    邮箱登陆
                  </button>
                )}
                
                {showEmailInput && loginMode === 'manual' && (
                  <button
                    onClick={handleManualConnect}
                    disabled={!email || !password || isLoading || !isValidEmail(email)}
                    className={`
                      flex items-center gap-2 px-6 py-2 rounded-xl font-medium text-sm transition-all
                      ${!email || !password || isLoading || !isValidEmail(email)
                        ? 'bg-win-surface-active text-win-subtext cursor-not-allowed'
                        : 'bg-win-primary hover:bg-win-hover active:bg-win-pressed text-white shadow-sm active:scale-[0.98]'}
                    `}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{isLoading ? '连接中...' : '下一步'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Profile Configuration */}
        {step === 3 && (
          <div className={`flex-1 flex flex-col p-8 md:p-10 ${animationClass}`}>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-win-text mb-1">Your Profile</h2>
              <p className="text-win-subtext text-sm">How should we address you?</p>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[60vh]">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-win-subtext ml-1">Display Name</label>
                <div className="relative group w-full">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Alex Chen"
                    className="fluent-input pl-10 rounded-xl w-full box-border"
                    autoFocus
                  />
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-win-muted group-focus-within:text-win-primary transition-colors" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-win-subtext ml-1">Account Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Personal', 'Work', 'Admin', 'Custom'].map((grp) => (
                    <button
                      key={grp}
                      onClick={() => setSelectedGroupOption(grp)}
                      className={`
                        px-3 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2
                        ${selectedGroupOption === grp
                          ? 'bg-win-surface-active border-win-primary text-win-text shadow-[inset_0_0_0_1px_#0066cc]'
                          : 'bg-win-surface border-transparent text-win-subtext hover:bg-win-surface-hover'}
                      `}
                    >
                      {grp}
                    </button>
                  ))}
                </div>

                {selectedGroupOption === 'Custom' && (
                  <div className="mt-2 animate-slide-up-fluent">
                    <input
                      type="text"
                      value={customGroupText}
                      onChange={(e) => setCustomGroupText(e.target.value)}
                      placeholder="Enter custom type..."
                      className="fluent-input rounded-xl w-full box-border"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-win-border">
              <button
                onClick={() => changeStep(2)}
                className="text-win-subtext hover:text-win-text transition-colors text-sm px-3 py-2 rounded-xl hover:bg-win-surface-hover"
              >
                Back
              </button>
              <button
                onClick={handleProfileSetup}
                disabled={!userName || (selectedGroupOption === 'Custom' && !customGroupText)}
                className={`
                  flex items-center gap-2 px-6 py-2 rounded-xl font-medium text-sm transition-all
                  ${!userName || (selectedGroupOption === 'Custom' && !customGroupText)
                    ? 'bg-win-surface-active text-win-subtext cursor-not-allowed'
                    : 'bg-win-primary hover:bg-win-hover active:bg-win-pressed text-white shadow-sm active:scale-[0.98]'}
                `}
              >
                <span>Continue</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className={`flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center ${animationClass}`}>
            <div className="mb-6 w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <Check className="w-8 h-8 text-green-500" strokeWidth={2.5} />
            </div>

            <h2 className="text-xl font-semibold text-win-text mb-2">All Set!</h2>
            <p className="text-win-subtext text-sm mb-8">
              Your account has been successfully configured.
            </p>

            {/* Profile Summary Card */}
            <div className="w-full bg-win-surface rounded-2xl p-4 mb-8 border border-win-border flex items-center gap-4 shadow-sm text-left">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} className="w-12 h-12 rounded-full bg-win-bg border border-win-border" alt="Avatar" />
              <div className="flex-1 min-w-0">
                <div className="text-win-text font-semibold text-sm truncate">{userName}</div>
                <div className="text-xs text-win-subtext truncate">{email}</div>
                <div className="mt-1 inline-block text-[10px] text-win-primary bg-[#0066cc15] px-1.5 py-0.5 rounded-md border border-win-primary/20">
                  {selectedGroupOption === 'Custom' ? customGroupText : selectedGroupOption}
                </div>
              </div>
            </div>

            <button
              onClick={handleFinalize}
              className="w-full bg-win-primary hover:bg-win-hover text-white font-semibold py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Launch App</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-win-border">
          <div
            className="h-full bg-win-primary transition-all duration-500 ease-fluent"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
