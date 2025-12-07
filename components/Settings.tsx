
import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Shield, ChevronRight, Plus, RefreshCw, CheckCircle2, AlertCircle, X, Globe, Smartphone, Lock, Moon, Sun, Monitor, Palette, EyeOff, Ban, Calendar, Clock, MapPin, Check } from 'lucide-react';
import { User as UserType, Account, Theme, Language } from '../types';

interface SettingsProps {
  user: UserType;
  onBack: () => void;
  onAddAccount: () => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  onUpdateProfile?: (updatedUser: UserType) => void;
  onEditProfile?: () => void;
  currentLanguage?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onBack, onAddAccount, currentTheme, onThemeChange, onUpdateProfile, onEditProfile, currentLanguage = 'en', onLanguageChange }) => {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'personalization' | 'privacy' | 'language'>('main');
  const [accounts, setAccounts] = useState<Account[]>(user.accounts || []);

  // Update accounts when user prop changes
  useEffect(() => {
    if (user.accounts) {
      setAccounts(user.accounts);
    }
  }, [user.accounts]);

  // Load accounts from backend on mount to ensure freshness
  useEffect(() => {
    const loadAccounts = async () => {
      if (window.electronAPI) {
        try {
          const backendAccounts = await window.electronAPI.getAccounts(user.id);
          setAccounts(backendAccounts);
        } catch (err) {
          console.error('Failed to load accounts:', err);
        }
      }
    };
    loadAccounts();
  }, []);

  const renderStatusIndicator = (status: string, lastSync: string, minimal: boolean = false) => {
    if (status === 'syncing') {
      return (
        <div className={`flex items-center gap-1.5 ${minimal ? 'text-amber-400' : 'text-amber-400'}`}>
          <RefreshCw size={minimal ? 12 : 14} className="animate-spin" />
          <span className={minimal ? "text-xs" : "text-sm font-medium"}>{minimal ? 'Syncing...' : 'Syncing in progress...'}</span>
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div className={`flex items-center gap-1.5 ${minimal ? 'text-red-400' : 'text-red-400'}`}>
          <AlertCircle size={minimal ? 12 : 14} />
          <span className={minimal ? "text-xs" : "text-sm font-medium"}>{minimal ? 'Error' : 'Connection Error'}</span>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-1.5 ${minimal ? 'text-emerald-400' : 'text-emerald-400'}`}>
        <CheckCircle2 size={minimal ? 12 : 14} />
        <span className={minimal ? "text-xs" : "text-sm font-medium"}>{minimal ? lastSync : 'Synced'}</span>
      </div>
    );
  };

  const renderThemeOption = (theme: Theme, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => onThemeChange(theme)}
      className={`
        flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 w-full h-32 gap-3
        ${currentTheme === theme
          ? 'border-win-primary bg-win-surface-active shadow-sm'
          : 'border-transparent bg-win-surface hover:bg-win-surface-hover hover:border-win-border'}
      `}
    >
      <div className={`p-3 rounded-full ${currentTheme === theme ? 'bg-win-primary text-white' : 'bg-win-border text-win-text'}`}>
        {icon}
      </div>
      <span className={`text-sm font-medium ${currentTheme === theme ? 'text-win-primary' : 'text-win-text'}`}>{label}</span>
    </button>
  );

  const renderMainSettings = () => (
    <div className="animate-win-open h-full flex flex-col">
      <div className="px-8 pt-8 pb-4 flex justify-between items-start border-b border-win-border">
        <div>
          <h2 className="text-2xl font-semibold text-win-text mb-1">设置</h2>
          <p className="text-win-subtext text-sm">管理已连接的账户和偏好设置。</p>
        </div>
        <button
          onClick={onBack}
          className="p-2 text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-xl transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
        {/* Profile Card */}
        <div className="bg-win-surface border border-win-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <img src={user.avatar} className="w-16 h-16 rounded-full bg-win-border object-cover" alt="Avatar" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-win-text">{user.name}</h3>
            <p className="text-sm text-win-subtext">{user.email}</p>
            <button
              onClick={onEditProfile}
              className="mt-3 px-4 py-1.5 text-xs font-medium text-win-primary bg-win-surface-hover hover:bg-win-surface-active border border-win-border rounded-lg transition-colors"
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Accounts List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-win-text">邮箱账户</h3>
            <button
              onClick={onAddAccount}
              className="text-xs flex items-center gap-1 text-win-primary hover:bg-win-surface-hover font-medium px-3 py-1.5 rounded-xl border border-transparent hover:border-win-border transition-all"
            >
              <Plus size={14} />
              添加账户
            </button>
          </div>

          <div className="space-y-2">
            {accounts.length === 0 && <p className="text-sm text-win-subtext italic">未连接任何账户。</p>}
            {accounts.map((acc) => (
              <div
                key={acc.id}
                onClick={() => setSelectedAccount(acc.id)}
                className="group flex items-center justify-between p-3 rounded-2xl bg-win-surface hover:bg-win-surface-hover border border-win-border transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm border border-win-border"
                    style={{ 
                      backgroundColor: {
                        gmail: '#EA4335',
                        outlook: '#0078D4',
                        yahoo: '#6001D2',
                        qq: '#12B7F5',
                        '163': '#D43E2A',
                        icloud: '#999999',
                        imap: '#666666'
                      }[acc.provider] || '#666666'
                    }}
                  >
                    {acc.provider.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-win-text text-sm font-medium">{acc.displayName || acc.email}</div>
                    <div className="flex items-center gap-2 text-xs text-win-subtext mt-0.5">
                      <span className="capitalize">{acc.provider}</span>
                      <span>•</span>
                      <span>{acc.email}</span>
                    </div>
                    <div className="mt-1">
                      {renderStatusIndicator(acc.status || 'active', acc.lastSync || 'Never', true)}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-win-subtext group-hover:text-win-text transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* General Preferences */}
        <div>
          <h3 className="text-sm font-semibold text-win-text mb-3">General</h3>
          <div className="space-y-1 bg-win-surface border border-win-border rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setActiveTab('personalization')}
              className="w-full flex items-center justify-between p-3 hover:bg-win-surface-hover text-left transition-colors border-b border-win-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <Palette size={18} className="text-win-subtext" />
                <div className="flex flex-col">
                  <span className="text-sm text-win-text font-medium">Personalization</span>
                  <span className="text-xs text-win-subtext">Theme, colors, and layout</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-win-subtext" />
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className="w-full flex items-center justify-between p-3 hover:bg-win-surface-hover text-left transition-colors border-b border-win-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <Shield size={18} className="text-win-subtext" />
                <div className="flex flex-col">
                  <span className="text-sm text-win-text font-medium">Privacy & Security</span>
                  <span className="text-xs text-win-subtext">Encryption, blocking, and data</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-win-subtext" />
            </button>
            <button
              onClick={() => setActiveTab('language')}
              className="w-full flex items-center justify-between p-3 hover:bg-win-surface-hover text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe size={18} className="text-win-subtext" />
                <div className="flex flex-col">
                  <span className="text-sm text-win-text font-medium">Language & Region</span>
                  <span className="text-xs text-win-subtext">Region, formats, and time</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-win-subtext" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPersonalization = () => (
    <div className="animate-slide-in-right h-full flex flex-col">
      <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-win-border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('main')}
            className="flex items-center gap-2 text-win-subtext hover:text-win-text hover:bg-win-surface-hover p-2 rounded-xl transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-semibold text-win-text mb-1">Personalization</h2>
            <p className="text-win-subtext text-sm">Customize your viewing experience.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-8">

        <section>
          <h3 className="text-sm font-semibold text-win-text mb-4">App Theme</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderThemeOption('light', <Sun size={24} />, 'Light')}
            {renderThemeOption('dark', <Moon size={24} />, 'Dark')}
            {renderThemeOption('system', <Monitor size={24} />, 'System')}
          </div>
          <p className="text-xs text-win-subtext mt-3">
            Select your preferred appearance mode. System mode follows your Windows settings.
          </p>
        </section>

        <div className="h-px bg-win-border"></div>

        <section>
          <h3 className="text-sm font-semibold text-win-text mb-4">Accent Color</h3>
          <div className="bg-win-surface border border-win-border rounded-2xl p-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-win-primary shadow-sm border-2 border-white ring-2 ring-win-primary cursor-pointer"></div>
              <div className="w-10 h-10 rounded-full bg-purple-600 shadow-sm cursor-pointer hover:scale-110 transition-transform"></div>
              <div className="w-10 h-10 rounded-full bg-emerald-500 shadow-sm cursor-pointer hover:scale-110 transition-transform"></div>
              <div className="w-10 h-10 rounded-full bg-orange-500 shadow-sm cursor-pointer hover:scale-110 transition-transform"></div>
              <div className="w-10 h-10 rounded-full bg-rose-500 shadow-sm cursor-pointer hover:scale-110 transition-transform"></div>
            </div>
            <p className="text-xs text-win-subtext mt-4">
              Accent colors are applied to buttons, links, and active states.
            </p>
          </div>
        </section>

      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="animate-slide-in-right h-full flex flex-col">
      <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-win-border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('main')}
            className="flex items-center gap-2 text-win-subtext hover:text-win-text hover:bg-win-surface-hover p-2 rounded-xl transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-semibold text-win-text mb-1">Privacy & Security</h2>
            <p className="text-win-subtext text-sm">Control how your data is handled.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-6">
        <div className="bg-win-surface border border-win-border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <EyeOff size={20} className="text-win-subtext" />
              <div>
                <div className="text-sm font-medium text-win-text">Block Tracking Pixels</div>
                <div className="text-xs text-win-subtext">Prevent senders from knowing when you open emails</div>
              </div>
            </div>
            <div className="w-10 h-5 bg-win-primary rounded-full relative cursor-pointer hover:bg-win-hover transition-colors">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>

          <div className="h-px bg-win-border"></div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock size={20} className="text-win-subtext" />
              <div>
                <div className="text-sm font-medium text-win-text">End-to-End Encryption</div>
                <div className="text-xs text-win-subtext">Encrypt draft emails locally before syncing</div>
              </div>
            </div>
            <div className="w-10 h-5 bg-win-primary rounded-full relative cursor-pointer hover:bg-win-hover transition-colors">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>

          <div className="h-px bg-win-border"></div>

          <div className="flex items-center justify-between cursor-not-allowed opacity-70">
            <div className="flex items-center gap-3">
              <Ban size={20} className="text-win-subtext" />
              <div>
                <div className="text-sm font-medium text-win-text">Manage Blocked Senders</div>
                <div className="text-xs text-win-subtext">0 blocked contacts</div>
              </div>
            </div>
            <ChevronRight size={16} className="text-win-subtext" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderLanguage = () => (
    <div className="animate-slide-in-right h-full flex flex-col">
      <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-win-border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('main')}
            className="flex items-center gap-2 text-win-subtext hover:text-win-text hover:bg-win-surface-hover p-2 rounded-xl transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-semibold text-win-text mb-1">Language & Region</h2>
            <p className="text-win-subtext text-sm">Formatting, time zones, and language preferences.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-win-subtext uppercase tracking-wider">Display Language</label>
            <div className="mt-2 bg-win-surface border border-win-border rounded-2xl overflow-hidden">
              {[
                { code: 'en', label: 'English (US)', sub: 'English (United States)' },
                { code: 'zh-CN', label: '简体中文', sub: 'Chinese (Simplified)' },
                { code: 'zh-TW', label: '繁體中文', sub: 'Chinese (Traditional)' }
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onLanguageChange?.(lang.code as Language)}
                  className="w-full p-3 border-b border-win-border last:border-0 flex items-center justify-between hover:bg-win-surface-hover transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <Globe size={18} className="text-win-subtext" />
                    <div>
                      <div className="text-sm text-win-text font-medium">{lang.label}</div>
                      <div className="text-xs text-win-subtext">{lang.sub}</div>
                    </div>
                  </div>
                  {currentLanguage === lang.code && <Check size={16} className="text-win-primary" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-win-subtext uppercase tracking-wider">Region</label>
            <div className="mt-2 bg-win-surface border border-win-border rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:bg-win-surface-hover transition-colors">
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-win-subtext" />
                <span className="text-sm text-win-text">United States</span>
              </div>
              <span className="text-xs text-win-subtext">English (US)</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-win-subtext uppercase tracking-wider">Date & Time</label>
            <div className="mt-2 bg-win-surface border border-win-border rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-win-border flex items-center justify-between hover:bg-win-surface-hover transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-win-subtext" />
                  <div>
                    <div className="text-sm text-win-text">Short Date</div>
                    <div className="text-xs text-win-subtext">10/24/2025</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-win-subtext" />
              </div>
              <div className="p-3 flex items-center justify-between hover:bg-win-surface-hover transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-win-subtext" />
                  <div>
                    <div className="text-sm text-win-text">First Day of Week</div>
                    <div className="text-xs text-win-subtext">Sunday</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-win-subtext" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAccountDetails = () => {
    const acc = accounts.find(a => a.id === selectedAccount);
    if (!acc) return null;

    const handleDeleteAccount = async () => {
      if (window.confirm(`确定要删除账户 ${acc.email} 吗？此操作无法撤销。`)) {
        try {
          if (window.electronAPI) {
            const result = await window.electronAPI.deleteAccount(acc.id);
            if (result.success) {
              setAccounts(accounts.filter(a => a.id !== acc.id));
              setSelectedAccount(null);
            } else {
              alert('删除失败: ' + result.error);
            }
          }
        } catch (err) {
          alert('删除账户出错: ' + (err instanceof Error ? err.message : String(err)));
        }
      }
    };

    const handleSyncAccount = async () => {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.syncEmails(acc.id);
          if (result.success) {
            alert('同步完成: ' + result.message);
            // 更新账户列表
            const updated = accounts.map(a => 
              a.id === acc.id ? { ...a, lastSync: result.lastSync, status: 'active' as const } : a
            );
            setAccounts(updated);
          } else {
            alert('同步失败: ' + result.error);
          }
        }
      } catch (err) {
        alert('同步出错: ' + (err instanceof Error ? err.message : String(err)));
      }
    };

    return (
      <div className="animate-slide-up-fluent h-full flex flex-col">
        <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-win-border">
          <button
            onClick={() => setSelectedAccount(null)}
            className="flex items-center gap-2 text-win-subtext hover:text-win-text hover:bg-win-surface-hover p-2 rounded-xl transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            <span>返回</span>
          </button>
          <h2 className="text-lg font-semibold text-win-text">{acc.displayName || acc.email}</h2>
          <div className="w-6"></div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
          <div 
            className="bg-win-surface border border-win-border rounded-2xl p-6 flex flex-col items-center mb-6 shadow-sm"
          >
            <div 
              className="w-16 h-16 rounded-2xl border border-win-border flex items-center justify-center text-2xl font-bold text-white mb-3"
              style={{ 
                backgroundColor: {
                  gmail: '#EA4335',
                  outlook: '#0078D4',
                  yahoo: '#6001D2',
                  qq: '#12B7F5',
                  '163': '#D43E2A',
                  icloud: '#999999',
                  imap: '#666666'
                }[acc.provider] || '#666666'
              }}
            >
              {acc.provider.charAt(0).toUpperCase()}
            </div>
            <div className="text-center">
              <div className="text-sm text-win-text font-medium mb-1">{acc.email}</div>
              <div className="flex items-center gap-2 justify-center">
                <div className={`w-2 h-2 rounded-full ${
                  acc.status === 'active' ? 'bg-green-500' : 
                  acc.status === 'syncing' ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}></div>
                <span className="text-xs text-win-subtext capitalize">
                  {acc.status === 'active' ? '已连接' : 
                   acc.status === 'syncing' ? '正在同步' : 
                   '错误'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* 账户信息 */}
            <div>
              <h3 className="text-sm font-semibold text-win-text mb-3">账户信息</h3>
              <div className="bg-win-surface rounded-2xl border border-win-border divide-y divide-win-border shadow-sm">
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-win-subtext">服务商</span>
                  <span className="text-sm text-win-text font-medium capitalize">{acc.provider}</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-win-subtext">显示名称</span>
                  <span className="text-sm text-win-text font-medium">{acc.displayName || '未设置'}</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-win-subtext">最后同步</span>
                  <span className="text-sm text-win-text font-medium">{acc.lastSync || '从未'}</span>
                </div>
                {acc.imapHost && (
                  <>
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-sm text-win-subtext">IMAP</span>
                      <span className="text-sm text-win-text font-medium">{acc.imapHost}:{acc.imapPort}</span>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-sm text-win-subtext">SMTP</span>
                      <span className="text-sm text-win-text font-medium">{acc.smtpHost}:{acc.smtpPort}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 同步设置 */}
            <div>
              <h3 className="text-sm font-semibold text-win-text mb-3">同步设置</h3>
              <div className="bg-win-surface rounded-2xl border border-win-border p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-win-text font-medium">同步频率</div>
                    <div className="text-xs text-win-subtext">检查新邮件</div>
                  </div>
                  <select className="bg-win-bg border border-win-border rounded-xl px-2 py-1 text-sm text-win-text focus:outline-none focus:border-win-primary">
                    <option>自动</option>
                    <option>15分钟</option>
                    <option>每小时</option>
                  </select>
                </div>

                <div className="h-px bg-win-border"></div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-win-text font-medium">通知</div>
                    <div className="text-xs text-win-subtext">显示横幅通知</div>
                  </div>
                  <div className="w-10 h-5 bg-win-primary rounded-full relative cursor-pointer border border-transparent hover:bg-win-hover transition-colors">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="pt-4 space-y-2">
              <button 
                onClick={handleSyncAccount}
                className="w-full py-2.5 bg-win-primary text-white border border-transparent rounded-xl hover:bg-win-hover transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                立即同步
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="w-full py-2 bg-win-surface text-red-400 border border-win-border rounded-xl hover:bg-red-500/10 hover:border-red-500/50 transition-all text-sm font-medium"
              >
                删除账户
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col relative text-left select-none text-win-text">
      <div className="flex-1 overflow-hidden">
        {selectedAccount
          ? renderAccountDetails()
          : activeTab === 'personalization'
            ? renderPersonalization()
            : activeTab === 'privacy'
              ? renderPrivacy()
              : activeTab === 'language'
                ? renderLanguage()
                : renderMainSettings()
        }
      </div>
    </div>
  );
};
