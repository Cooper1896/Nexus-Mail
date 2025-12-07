import React, { useState, useEffect } from 'react';
import { Loader2, ExternalLink, AlertCircle, Check } from 'lucide-react';
import { getAllOAuthProviders, getOAuthProvider } from '../utils/oauthProviders';

interface OAuthLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (email: string, provider: string, tokens: any) => void;
}

export const OAuthLogin: React.FC<OAuthLoginProps> = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(1); // 1: Select Provider, 2: Authenticating, 3: Success
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [tokens, setTokens] = useState<any>(null);

  const providers = getAllOAuthProviders();

  useEffect(() => {
    // Listen for OAuth code received via ipcRenderer
    const handleCodeReceived = (data: { code: string }) => {
      handleCodeExchange(data.code);
    };

    // Subscribe to oauth:code-received event from main process
    const unsubscribe = window.electronAPI?.oauth?.on?.('oauth:code-received', handleCodeReceived);

    return () => {
      if (window.electronAPI?.oauth?.off) {
        window.electronAPI.oauth.off('oauth:code-received', handleCodeReceived);
      }
    };
  }, [selectedProvider]);

  const handleProviderSelect = async (providerId: string) => {
    setSelectedProvider(providerId);
    setIsLoading(true);
    setError(null);
    setStep(2);

    try {
      console.log(`[OAuthLogin] Initiating login for provider: ${providerId}`);
      const result = await window.electronAPI?.oauth?.login?.(providerId);
      
      console.log('[OAuthLogin] Login result:', result);
      
      if (!result?.success) {
        const errorMsg = result?.error || '启动认证失败';
        console.error('[OAuthLogin] Login failed:', errorMsg);
        setError(errorMsg);
        setStep(1);
        setIsLoading(false);
      }
    } catch (err: any) {
      const errorMsg = err.message || '登陆失败';
      console.error('[OAuthLogin] Exception during login:', err);
      setError(errorMsg);
      setStep(1);
      setIsLoading(false);
    }
  };

  const handleCodeExchange = async (code: string) => {
    if (!selectedProvider) return;

    try {
      const result = await window.electronAPI?.oauth?.exchangeCode?.({
        providerId: selectedProvider,
        code
      });

      if (result?.success && result.token) {
        setTokens(result.token);
        setIsLoading(false);
        setStep(3);

        // Get user email from OAuth provider
        // In a real implementation, you'd call the provider's userinfo endpoint
        const userEmail = result.token.email || `user@${selectedProvider}.com`;
        setEmail(userEmail);

        // Auto-complete after 2 seconds
        setTimeout(() => {
          if (onComplete) {
            onComplete(userEmail, selectedProvider, result.token);
          }
          onClose();
        }, 2000);
      } else {
        setError(result?.error || 'Token exchange failed');
        setIsLoading(false);
        setStep(1);
      }
    } catch (err: any) {
      setError(err.message || 'Token exchange failed');
      setIsLoading(false);
      setStep(1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-win-panel border border-win-border rounded-2xl shadow-win-elevation max-w-md w-full p-6">
        {/* Step 1: Select Provider */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-win-text">选择邮箱服务商</h2>
            <p className="text-sm text-win-text-secondary">点击您想要登陆的邮箱服务商</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              {providers.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider.id)}
                  disabled={isLoading}
                  className="flex items-center gap-3 p-3 rounded-lg bg-win-surface border border-win-border hover:bg-win-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-win-primary to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    {provider.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-win-text">{provider.name}</div>
                    <div className="text-xs text-win-text-secondary">点击启动登陆</div>
                  </div>
                  <ExternalLink size={16} className="text-win-text-secondary" />
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full mt-4 py-2 px-4 rounded-lg bg-win-surface border border-win-border hover:bg-win-surface-hover text-win-text transition-colors"
            >
              取消
            </button>
          </div>
        )}

        {/* Step 2: Authenticating */}
        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 size={48} className="text-win-primary animate-spin" />
            <h3 className="text-lg font-semibold text-win-text">正在认证...</h3>
            <p className="text-sm text-win-text-secondary text-center">
              请在弹出的浏览器窗口中完成登陆和授权
            </p>
            <p className="text-xs text-win-text-secondary">
              稍后自动关闭
            </p>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <Check size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-win-text">认证成功！</h3>
            <p className="text-sm text-win-text-secondary text-center">
              邮箱: <span className="font-medium text-win-text">{email}</span>
            </p>
            <p className="text-xs text-win-text-secondary">
              即将添加账户...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
