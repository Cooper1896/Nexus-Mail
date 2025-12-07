import React, { useState, useEffect } from 'react';
import {
  Inbox, Send, Archive, Trash2, File, Star,
  Plus, Settings, ChevronLeft, ChevronRight,
  UserPlus, Mail, PanelLeftClose, PanelLeftOpen,
  Check, AtSign, RefreshCw, CheckCircle2
} from 'lucide-react';
import { Folder, User, Account } from '../types';

interface SidebarProps {
  selectedFolderId: string;
  onSelectFolder: (id: string) => void;
  folders: Folder[];
  user?: User;
  profiles?: User[];
  onSwitchProfile?: (id: string) => void;
  onOpenSettings: () => void;
  onAddUser: () => void;
  onCompose: () => void;
  mobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;

  // Account Management
  selectedAccountId?: string | null;
  onSelectAccount?: (accountId: string | null) => void;
  onAddAccount?: () => void;
  onDeleteAccount?: (accountId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedFolderId,
  onSelectFolder,
  folders,
  user,
  profiles = [],
  onSwitchProfile,
  onOpenSettings,
  onAddUser,
  onCompose,
  mobileMenuOpen,
  onCloseMobileMenu,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  onDeleteAccount
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folderId: string } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const getIcon = (iconName: string, active: boolean) => {
    const props = { size: 20, className: active ? 'text-win-primary' : 'text-win-subtext group-hover:text-win-text transition-colors duration-200' };
    switch (iconName) {
      case 'inbox': return <Inbox {...props} />;
      case 'send': return <Send {...props} />;
      case 'archive': return <Archive {...props} />;
      case 'trash': return <Trash2 {...props} />;
      case 'file': return <File {...props} />;
      case 'star': return <Star {...props} />;
      default: return <Inbox {...props} />;
    }
  };

  const defaultUser: User = {
    id: 'guest',
    name: 'Guest User',
    email: 'guest@nexus.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest',
    group: 'Guest'
  };

  const currentUser = user || defaultUser;
  const displayProfiles = profiles.length > 0 ? profiles : [currentUser];
  const userAccounts = currentUser.accounts || [];

  const widthClass = isCollapsed ? 'w-[72px]' : 'w-[280px]';
  const widthDuration = 'duration-300';
  const widthDelay = isCollapsed ? 'delay-100' : 'delay-0';
  const textOpacityClass = isCollapsed ? 'opacity-0 pointer-events-none hidden' : 'opacity-100 block';
  const textDuration = 'duration-200';
  const textDelay = isCollapsed ? 'delay-0' : 'delay-200';

  const mobileClasses = mobileMenuOpen
    ? 'fixed inset-y-0 left-0 z-50 w-[280px] bg-win-panel border-r border-win-border shadow-2xl transform transition-transform duration-300 translate-x-0'
    : 'hidden md:flex flex-col h-full bg-win-panel/50 backdrop-blur-xl border-r border-win-border relative transition-[width] ease-fluent will-change-[width]';

  const containerClasses = mobileMenuOpen ? mobileClasses : `${mobileClasses} ${widthClass} ${widthDuration} ${widthDelay}`;

  const handleFolderClick = (id: string) => {
    onSelectFolder(id);
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleAccountClick = (id: string | null) => {
    if (onSelectAccount) onSelectAccount(id);
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, folderId });
  };

  const hasMultipleProfiles = displayProfiles.length > 1;

  return (
    <>
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onCloseMobileMenu}
        />
      )}

      <div className={containerClasses}>

        {/* Header */}
        <div className={`h-12 flex items-center justify-between px-4 mb-2 relative z-10 ${isCollapsed && !mobileMenuOpen ? 'flex-col justify-center gap-2 pt-2 h-auto' : ''}`}>
          <div className={`flex gap-2 group p-2 ${isCollapsed ? 'mb-1' : ''}`}>
            <div className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]/80 active:bg-[#BF4C46] transition-colors shadow-sm cursor-pointer border border-black/10"></div>
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E]/80 active:bg-[#BF8E22] transition-colors shadow-sm cursor-pointer border border-black/10"></div>
            <div className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#28C840]/80 active:bg-[#1E9630] transition-colors shadow-sm cursor-pointer border border-black/10"></div>
          </div>

          {!mobileMenuOpen && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1.5 rounded-lg text-win-subtext hover:text-win-text hover:bg-win-surface-hover transition-colors ${isCollapsed ? 'mt-1' : ''}`}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          )}
        </div>

        {/* Compose Button */}
        <div className={`px-4 mb-4 transition-all duration-300 relative z-0 ${isCollapsed && !mobileMenuOpen ? 'px-0 flex justify-center' : ''}`}>
          <button
            onClick={() => {
              onCompose();
              if (onCloseMobileMenu) onCloseMobileMenu();
            }}
            className={`
              group flex items-center gap-3 bg-win-surface hover:bg-win-surface-hover active:bg-win-surface-active text-win-text border border-win-border rounded-xl shadow-sm transition-all duration-200 ease-fluent active:scale-[0.98]
              ${isCollapsed && !mobileMenuOpen
                ? 'w-12 h-12 p-0 justify-center'
                : 'w-full py-2.5 px-4 justify-center'}
            `}
            title="New Message"
          >
            <Plus size={24} className="text-win-text shrink-0" />
            <span className={`whitespace-nowrap overflow-hidden transition-opacity ease-fluent font-medium ${textOpacityClass} ${textDuration} ${textDelay}`}>New Message</span>
          </button>
        </div>

        {/* Main List Area */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">

          {/* Folders Section */}
          <div className={`px-2 mb-2 transition-opacity ${textOpacityClass} ${textDuration} ${textDelay}`}>
            <p className="text-xs font-semibold text-win-subtext uppercase tracking-wider">Favorites</p>
          </div>

          {folders.map(folder => {
            const isActive = selectedFolderId === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => handleFolderClick(folder.id)}
                onContextMenu={(e) => handleContextMenu(e, folder.id)}
                className={`
                  flex items-center rounded-xl text-sm transition-all duration-150 ease-micro group relative w-full
                  ${isActive ? 'bg-win-surface-active text-win-text' : 'hover:bg-win-surface-hover text-win-subtext'}
                  ${isCollapsed && !mobileMenuOpen ? 'justify-center w-10 h-10 mx-auto' : 'justify-start px-3 py-2'}
                `}
                title={folder.name}
              >
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-win-primary rounded-r-sm"></div>
                )}
                <div className="flex items-center justify-center shrink-0">
                  {getIcon(folder.icon, isActive)}
                </div>
                <span className={`ml-3 whitespace-nowrap overflow-hidden transition-opacity ease-fluent ${isActive ? 'font-semibold' : 'font-normal'} ${textOpacityClass} ${textDuration} ${textDelay}`}>
                  {folder.name}
                </span>
                {typeof folder.count === 'number' && folder.count > 0 && !isCollapsed && (
                  <div className={`ml-auto transition-opacity ease-fluent ${textOpacityClass} ${textDuration} ${textDelay}`}>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-win-primary text-white' : 'bg-win-surface-active text-win-subtext'}`}>{folder.count}</span>
                  </div>
                )}
              </button>
            );
          })}

          {/* Accounts Section */}
          {userAccounts.length > 0 && (
            <>
              <div className={`px-2 mt-6 mb-2 transition-opacity ${textOpacityClass} ${textDuration} ${textDelay}`}>
                <p className="text-xs font-semibold text-win-subtext uppercase tracking-wider">Accounts</p>
              </div>

              {/* All Accounts Option */}
              <button
                onClick={() => handleAccountClick(null)}
                className={`
                        flex items-center rounded-xl text-sm transition-all duration-150 ease-micro group relative w-full
                        ${!selectedAccountId ? 'bg-win-surface-active text-win-text' : 'hover:bg-win-surface-hover text-win-subtext'}
                        ${isCollapsed && !mobileMenuOpen ? 'justify-center w-10 h-10 mx-auto' : 'justify-start px-3 py-2'}
                    `}
                title="All Accounts"
              >
                {!selectedAccountId && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-win-primary rounded-r-sm"></div>
                )}
                <div className="flex items-center justify-center shrink-0">
                  <AtSign size={18} className={!selectedAccountId ? 'text-win-primary' : ''} />
                </div>
                <span className={`ml-3 whitespace-nowrap overflow-hidden transition-opacity ease-fluent ${!selectedAccountId ? 'font-semibold' : 'font-normal'} ${textOpacityClass} ${textDuration} ${textDelay}`}>
                  All Accounts
                </span>
              </button>

              {/* Individual Accounts */}
              {userAccounts.map(account => {
                const isAccActive = selectedAccountId === account.id;
                const providerChar = account.provider.charAt(0).toUpperCase();
                return (
                  <div
                    key={account.id}
                    className="relative group"
                  >
                    <button
                      onClick={() => handleAccountClick(account.id)}
                      className={`
                        flex items-center rounded-xl text-sm transition-all duration-150 ease-micro group relative w-full
                        ${isAccActive ? 'bg-win-surface-active text-win-text' : 'hover:bg-win-surface-hover text-win-subtext'}
                        ${isCollapsed && !mobileMenuOpen ? 'justify-center w-10 h-10 mx-auto' : 'justify-start px-3 py-2 pr-8'}
                      `}
                      title={account.email}
                    >
                      {isAccActive && !isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-win-primary rounded-r-sm"></div>
                      )}
                      <div className="flex items-center justify-center shrink-0">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold border border-current opacity-80 ${isAccActive ? 'text-win-primary border-win-primary' : 'text-win-subtext'}`}>
                          {providerChar}
                        </div>
                      </div>
                      <span className={`ml-3 whitespace-nowrap overflow-hidden text-ellipsis transition-opacity ease-fluent ${isAccActive ? 'font-semibold' : 'font-normal'} ${textOpacityClass} ${textDuration} ${textDelay}`}>
                        {account.displayName || account.email}
                      </span>
                    </button>
                    {/* Delete Button - appears on hover */}
                    {!isCollapsed && onDeleteAccount && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteAccount(account.id); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 text-win-muted transition-all"
                        title="Delete account"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )
              })}

              {/* Add Account Button */}
              {!isCollapsed && onAddAccount && (
                <button
                  onClick={() => { onAddAccount(); if (onCloseMobileMenu) onCloseMobileMenu(); }}
                  className="flex items-center gap-2 px-3 py-2 w-full rounded-xl text-sm text-win-primary hover:bg-win-surface-hover transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Account</span>
                </button>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-win-border space-y-1 relative bg-win-panel">
          <button
            onClick={() => { onOpenSettings(); if (onCloseMobileMenu) onCloseMobileMenu(); }}
            className={`flex items-center gap-3 rounded-xl text-sm text-win-subtext hover:bg-win-surface-hover hover:text-win-text transition-colors w-full ${isCollapsed && !mobileMenuOpen ? 'justify-center w-10 h-10 mx-auto p-0' : 'px-3 py-2'}`}
            title="Settings"
          >
            <Settings size={20} className="shrink-0" />
            <span className={`whitespace-nowrap overflow-hidden transition-opacity ease-fluent ${textOpacityClass} ${textDuration} ${textDelay}`}>Settings</span>
          </button>

          <div className="pt-2 relative group">
            <button
              onClick={(e) => { e.stopPropagation(); onAddUser(); if (onCloseMobileMenu) onCloseMobileMenu(); }}
              className={`absolute z-20 bg-win-primary hover:bg-win-hover text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border-2 border-win-surface ${isCollapsed && !mobileMenuOpen ? '-top-1 -right-0 w-4 h-4 opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100' : 'top-1/2 -translate-y-1/2 -right-2 w-8 h-8 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0'}`}
              title="Add New User Group"
            >
              <Plus size={isCollapsed && !mobileMenuOpen ? 10 : 16} strokeWidth={3} />
            </button>

            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-10 cursor-default" onClick={() => setIsUserMenuOpen(false)}></div>
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-win-surface border border-win-border rounded-xl shadow-win-elevation p-1 z-20 animate-slide-up-fluent">
                  <div className="px-3 py-2 mb-1 border-b border-win-border">
                    <p className="text-xs font-semibold text-win-subtext uppercase">Switch Profile</p>
                  </div>
                  {displayProfiles.map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => { setIsUserMenuOpen(false); if (onSwitchProfile) onSwitchProfile(profile.id); if (onCloseMobileMenu) onCloseMobileMenu(); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors mb-0.5 group ${currentUser.id === profile.id ? 'bg-win-surface-active' : 'hover:bg-win-surface-hover'}`}
                    >
                      <img src={profile.avatar} alt={profile.name} className="w-8 h-8 rounded-full border border-win-border bg-win-bg" />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${currentUser.id === profile.id ? 'text-win-text' : 'text-win-subtext group-hover:text-win-text'}`}>{profile.name}</div>
                        <div className="text-[10px] text-win-subtext flex items-center gap-1">{profile.group || 'Local'}</div>
                      </div>
                      {currentUser.id === profile.id && <Check size={14} className="text-win-primary" />}
                    </button>
                  ))}
                  {!hasMultipleProfiles && (
                    <>
                      <div className="h-px bg-win-border my-1"></div>
                      <button onClick={() => { setIsUserMenuOpen(false); onAddUser(); if (onCloseMobileMenu) onCloseMobileMenu(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-win-surface-hover text-win-primary hover:text-win-hover text-left transition-colors">
                        <div className="w-8 h-8 rounded-lg border border-win-border flex items-center justify-center"><Plus size={16} /></div>
                        <span className="text-sm font-medium">Create new profile</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            <div
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`flex items-center gap-3 px-2 group cursor-pointer hover:bg-win-surface-hover rounded-xl py-2 transition-colors ${isCollapsed && !mobileMenuOpen ? 'justify-center px-0' : ''}`}
            >
              <div className="relative">
                <img src={currentUser.avatar} alt="User" className="w-8 h-8 rounded-full bg-win-surface border border-win-border shrink-0" />
              </div>
              <div className={`flex-1 min-w-0 transition-opacity ease-fluent ${textOpacityClass} ${textDuration} ${textDelay}`}>
                <div className="flex items-center gap-2"><p className="text-sm font-medium text-win-text truncate">{currentUser.name}</p></div>
                <p className="text-xs text-win-subtext truncate">{currentUser.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-win-surface border border-win-border rounded-lg shadow-win-elevation p-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="w-full text-left px-3 py-2 text-sm text-win-text hover:bg-win-surface-hover rounded-md flex items-center gap-2"
              onClick={() => {
                handleFolderClick(contextMenu.folderId);
                setContextMenu(null);
              }}
            >
              <RefreshCw size={14} />
              <span>Sync Folder</span>
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm text-win-text hover:bg-win-surface-hover rounded-md flex items-center gap-2"
              onClick={() => {
                // Placeholder for mark all read
                setContextMenu(null);
              }}
            >
              <CheckCircle2 size={14} />
              <span>Mark all as read</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};
