import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { ReadingPane } from './components/ReadingPane';
import { Onboarding } from './components/Onboarding';
import { Settings } from './components/Settings';
import { ComposeModal } from './components/ComposeModal';
import { AddAccountDialog } from './components/AddAccountDialog.tsx';
import { AddProfileDialog } from './components/AddProfileDialog';
import { EditProfileDialog } from './components/EditProfileDialog';
import { Email, Folder, User, AppView, Theme, Account, FilterType, Language, SyncProgressData } from './types';
import { Menu, Minus, Square, X as XIcon } from 'lucide-react';

// Initialize with empty array, data will come from Electron
const INITIAL_EMAILS: Email[] = [];

const INITIAL_FOLDERS: Folder[] = [
  { id: 'inbox', name: 'Inbox', icon: 'inbox', count: 0, type: 'system' },
  { id: 'sent', name: 'Sent', icon: 'send', type: 'system' },
  { id: 'drafts', name: 'Drafts', icon: 'file', count: 0, type: 'system' },
  { id: 'archive', name: 'Archive', icon: 'archive', type: 'system' },
  { id: 'trash', name: 'Trash', icon: 'trash', type: 'system' },
  { id: 'spam', name: 'Spam', icon: 'file', type: 'system' }
];

const App: React.FC = () => {
  // Application State
  const [currentView, setCurrentView] = useState<AppView>('setup');
  const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);
  const [profiles, setProfiles] = useState<User[]>([]);
  const [theme, setTheme] = useState<Theme>('system');
  const [language, setLanguage] = useState<Language>('en');
  
  // Initialize app state from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const savedProfiles = localStorage.getItem('profiles');
    const savedTheme = localStorage.getItem('theme') as Theme;
    
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setCurrentView('mail');
      } catch (err) {
        console.error('Failed to restore user session:', err);
        localStorage.removeItem('currentUser');
      }
    }
    
    if (savedProfiles) {
      try {
        const parsedProfiles = JSON.parse(savedProfiles);
        setProfiles(parsedProfiles);
      } catch (err) {
        console.error('Failed to restore profiles:', err);
        localStorage.removeItem('profiles');
      }
    }
    
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Data State
  const [emails, setEmails] = useState<Email[]>(INITIAL_EMAILS);
  const [folders, setFolders] = useState<Folder[]>(INITIAL_FOLDERS);
  const [syncStatus, setSyncStatus] = useState<{ status: 'idle' | 'syncing' | 'error' | 'success', lastSync: string, message?: string }>({ status: 'idle', lastSync: 'Never' });
  const [syncProgress, setSyncProgress] = useState<{ processed: number; total: number; synced: number; currentFolder: string } | null>(null);

  // UI State
  const [selectedFolderId, setSelectedFolderId] = useState('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = useState(false);
  const [isAddProfileDialogOpen, setIsAddProfileDialogOpen] = useState(false);
  const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

  const appRef = useRef<HTMLDivElement>(null);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // Save profiles to localStorage whenever they change
  useEffect(() => {
    if (profiles.length > 0) {
      localStorage.setItem('profiles', JSON.stringify(profiles));
    }
  }, [profiles]);

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load Accounts from Electron Backend
  const loadAccountsFromBackend = async () => {
    if (window.electronAPI && currentUser) {
      try {
        const accounts = await window.electronAPI.getAccounts(currentUser.id);
        const updatedUser = { ...currentUser, accounts };
        setCurrentUser(updatedUser);
        setProfiles(prev => prev.map(p => p.id === updatedUser.id ? updatedUser : p));
      } catch (err) {
        console.error('Failed to load accounts:', err);
      }
    }
  };

  // Update unread counts from backend
  const updateUnreadCounts = async () => {
    if (window.electronAPI && currentUser) {
      try {
        const counts = await window.electronAPI.getUnreadCounts(currentUser.id);
        setFolders(prev => prev.map(f => ({
          ...f,
          count: counts[f.id] || 0
        })));
      } catch (err) {
        console.error('Failed to update unread counts:', err);
      }
    }
  };

  // Update counts when emails change or user changes
  useEffect(() => {
    if (currentUser) {
      updateUnreadCounts();
    }
  }, [emails, currentUser?.id]);

  // Load accounts on user change
  useEffect(() => {
    if (currentUser && currentView === 'mail') {
      loadAccountsFromBackend();
      // Clear emails when switching user to avoid leak
      setEmails([]);
    }
  }, [currentUser?.id, currentView]);

  // Listen for sync progress events
  useEffect(() => {
    if (!window.electronAPI?.onSyncProgress) return;
    
    const unsubscribe = window.electronAPI.onSyncProgress((data: SyncProgressData) => {
      console.log('[App] Sync progress:', data.type, data);
      
      switch (data.type) {
        case 'start':
          setSyncProgress({ processed: 0, total: 0, synced: 0, currentFolder: '' });
          setSyncStatus({ status: 'syncing', lastSync: syncStatus.lastSync, message: data.message });
          break;
          
        case 'count-complete':
          setSyncProgress(prev => ({ ...prev!, total: data.totalEmails || 0 }));
          setSyncStatus({ status: 'syncing', lastSync: syncStatus.lastSync, message: `Found ${data.totalEmails} emails` });
          break;
          
        case 'folder-start':
          setSyncProgress(prev => ({ ...prev!, currentFolder: data.folderId || '' }));
          setSyncStatus({ status: 'syncing', lastSync: syncStatus.lastSync, message: `Syncing ${data.folderId}...` });
          break;
          
        case 'email-synced':
          setSyncProgress(prev => ({
            ...prev!,
            processed: data.processed || 0,
            synced: data.totalSynced || 0,
            currentFolder: data.folderId || prev?.currentFolder || ''
          }));
          
          // Add new email to list in real-time (newest first)
          if (data.isNew && data.email) {
            setEmails(prev => {
              // Check if already exists
              if (prev.find(e => e.id === data.email!.id)) return prev;
              // Insert at beginning (newest first)
              return [data.email!, ...prev];
            });
          }
          
          setSyncStatus({ 
            status: 'syncing', 
            lastSync: syncStatus.lastSync, 
            message: `${data.processed}/${data.total} - ${data.subject?.substring(0, 30)}...` 
          });
          break;
          
        case 'folder-complete':
          setSyncStatus({ 
            status: 'syncing', 
            lastSync: syncStatus.lastSync, 
            message: `${data.folderId}: ${data.synced} new / ${data.total} total` 
          });
          break;
          
        case 'complete':
          setSyncProgress(null);
          setSyncStatus({ 
            status: 'success', 
            lastSync: new Date().toLocaleTimeString(), 
            message: `Synced ${data.totalSynced} new emails` 
          });
          setIsSyncing(false);
          break;
          
        case 'error':
          setSyncProgress(null);
          setSyncStatus({ status: 'error', lastSync: syncStatus.lastSync, message: data.error });
          setIsSyncing(false);
          break;
      }
    });
    
    return () => unsubscribe();
  }, [syncStatus.lastSync]);

  // Auto-sync emails when accounts change (only once)
  useEffect(() => {
    if (currentUser && currentUser.accounts && currentUser.accounts.length > 0 && currentView === 'mail' && !isSyncing) {
      const autoSync = async () => {
        if (!window.electronAPI || isSyncing) return;
        setIsSyncing(true);
        try {
          setSyncStatus(prev => ({ ...prev, status: 'syncing', message: 'Syncing emails...' }));
          
          for (const acc of currentUser.accounts!) {
            // Use syncAllEmails for auto-sync too, to ensure all folders are updated
            const result = await window.electronAPI.syncAllEmails(acc.id);
            console.log('[App] Sync result for', acc.email, ':', result);
          }
          
          // Refresh emails
          const fetchedEmails = await window.electronAPI.getEmails(selectedFolderId, selectedAccountId || undefined);
          console.log('[App] After sync, fetched', fetchedEmails.length, 'emails');
          setEmails(fetchedEmails);
          
          // Refresh unread counts
          await updateUnreadCounts();
          
          setSyncStatus({ status: 'success', lastSync: new Date().toLocaleTimeString(), message: 'Synced' });
        } catch (e) {
          console.error('[App] Sync error:', e);
          setSyncStatus({ status: 'error', lastSync: new Date().toLocaleTimeString(), message: 'Sync failed' });
        } finally {
          setIsSyncing(false);
        }
      };

      const timer = setTimeout(autoSync, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentUser?.accounts?.length, currentView]);

  const handleSync = async () => {
    if (!currentUser?.accounts || currentUser.accounts.length === 0) return;
    if (isSyncing) {
      console.log('[App] Sync already in progress, skipping');
      return;
    }

    setIsSyncing(true);
    setSyncStatus(prev => ({ ...prev, status: 'syncing', message: 'Checking for new messages...' }));

    if (window.electronAPI) {
      try {
        let accountsToSync = [];
        if (selectedAccountId) {
          const acc = currentUser.accounts.find(a => a.id === selectedAccountId);
          if (acc) accountsToSync.push(acc);
        } else {
          accountsToSync = currentUser.accounts;
        }

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < accountsToSync.length; i++) {
          const acc = accountsToSync[i];
          setSyncStatus({
            status: 'syncing',
            lastSync: new Date().toLocaleTimeString(),
            message: `Syncing all folders for ${acc.email} (${i + 1}/${accountsToSync.length})...`
          });

          // Use syncAllEmails to sync all folders
          const res = await window.electronAPI.syncAllEmails(acc.id);
          if (res.success) successCount++;
          else failCount++;
        }

        if (failCount === 0) {
          setSyncStatus({ status: 'success', lastSync: new Date().toLocaleTimeString(), message: 'All accounts up to date' });
        } else if (successCount > 0) {
          setSyncStatus({ status: 'success', lastSync: new Date().toLocaleTimeString(), message: `Synced ${successCount} accounts, ${failCount} failed` });
        } else {
          setSyncStatus({ status: 'error', lastSync: new Date().toLocaleTimeString(), message: 'Sync failed' });
        }

        // Refresh emails
        const fetchedEmails = await window.electronAPI.getEmails(selectedFolderId, selectedAccountId || undefined);
        setEmails(fetchedEmails);

        // Refresh accounts to get updated lastSync times
        await loadAccountsFromBackend();

        // Refresh unread counts
        await updateUnreadCounts();

      } catch (e) {
        setSyncStatus({ status: 'error', lastSync: new Date().toLocaleTimeString(), message: 'Connection failed' });
      }
    } else {
      // Simulation
      setTimeout(() => {
        setSyncStatus({ status: 'success', lastSync: new Date().toLocaleTimeString(), message: 'Up to date' });
        setIsSyncing(false);
      }, 2000);
    }
    setIsSyncing(false);
  };
  // Load Data from Electron Backend
  useEffect(() => {
    if (window.electronAPI && currentUser) {
      // 1. Load Emails
      setIsLoadingEmails(true);
      window.electronAPI.getEmails(selectedFolderId, selectedAccountId || undefined, currentUser.id).then(fetchedEmails => {
        console.log('[App] Fetched emails:', fetchedEmails.length, 'for folder:', selectedFolderId);
        setEmails(fetchedEmails);
        setIsLoadingEmails(false);
      });

      // 2. Poll for Sync (Simplified)
      const interval = setInterval(() => {
        if (currentUser.accounts?.[0]) {
          handleSync();
        }
      }, 60000); // 60s poll

      return () => clearInterval(interval);
    }
  }, [selectedFolderId, currentUser?.id, selectedAccountId]);

  // Window Title Bar (Custom) - REMOVED for native frame

  // Theme Logic
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        if (mediaQuery.matches) root.classList.add('dark');
        else root.classList.remove('dark');
      }
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  // Glass Reflection Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!appRef.current) return;
      const { clientX, clientY } = e;
      const { left, top, width, height } = appRef.current.getBoundingClientRect();
      const x = (clientX - left) / width;
      const y = (clientY - top) / height;
      appRef.current.style.setProperty('--mouse-x', `${x}`);
      appRef.current.style.setProperty('--mouse-y', `${y}`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Filter Emails
  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      const inFolder = email.folderId === selectedFolderId;
      const matchesSearch = email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.body.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAccount = selectedAccountId ? true : true;

      let matchesFilter = true;
      if (filterType === 'unread') matchesFilter = !email.read;
      if (filterType === 'starred') matchesFilter = email.starred;

      return inFolder && matchesSearch && matchesAccount && matchesFilter;
    });
  }, [emails, selectedFolderId, searchQuery, selectedAccountId, filterType]);

  const selectedEmail = useMemo(() =>
    emails.find(e => e.id === selectedEmailId) || null,
    [emails, selectedEmailId]);

  // Update Counts
  useEffect(() => {
    const counts = {
      inbox: emails.filter(e => e.folderId === 'inbox' && !e.read).length,
      drafts: emails.filter(e => e.folderId === 'drafts').length,
    };

    setFolders(prev => prev.map(f => {
      if (f.id === 'inbox') return { ...f, count: counts.inbox };
      if (f.id === 'drafts') return { ...f, count: counts.drafts };
      return f;
    }));
  }, [emails]);

  const handleDeleteEmail = async (id: string) => {
    const email = emails.find(e => e.id === id);
    if (!email) return;
    
    // Optimistic UI Update
    if (email.folderId === 'trash') {
      // Permanently delete
      setEmails(prev => prev.filter(e => e.id !== id));
      if (window.electronAPI) {
        await window.electronAPI.deleteEmail(id);
      }
    } else {
      // Move to trash
      setEmails(prev => prev.map(e => e.id === id ? { ...e, folderId: 'trash' } : e));
      if (window.electronAPI) {
        const result = await window.electronAPI.moveEmail(id, 'trash');
        if (result?.newEmailId && result.newEmailId !== id) {
          const newId = result.newEmailId;
          setEmails(prev => prev.map(e => e.id === id ? { ...e, id: newId, folderId: 'trash' } : e));
        }
      }
    }
    if (selectedEmailId === id) setSelectedEmailId(null);
  };

  const handleArchiveEmail = async (id: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, folderId: 'archive' } : e));
    if (window.electronAPI) {
      const result = await window.electronAPI.moveEmail(id, 'archive');
      if (result?.newEmailId && result.newEmailId !== id) {
        const newId = result.newEmailId;
        setEmails(prev => prev.map(e => e.id === id ? { ...e, id: newId, folderId: 'archive' } : e));
      }
    }
    if (selectedEmailId === id) setSelectedEmailId(null);
  };

  const handleMarkSpam = async (id: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, folderId: 'spam' } : e));
    if (window.electronAPI) {
      const result = await window.electronAPI.moveEmail(id, 'spam');
      if (result?.newEmailId && result.newEmailId !== id) {
        const newId = result.newEmailId;
        setEmails(prev => prev.map(e => e.id === id ? { ...e, id: newId, folderId: 'spam' } : e));
      }
    }
    if (selectedEmailId === id) setSelectedEmailId(null);
  };

  const handleStarEmail = async (id: string) => {
    const email = emails.find(e => e.id === id);
    const newStarred = !email?.starred;
    setEmails(prev => prev.map(e => e.id === id ? { ...e, starred: newStarred } : e));
    if (window.electronAPI) {
      await window.electronAPI.starEmail(id, newStarred);
    }
  };

  const handleMarkUnread = async (id: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, read: false } : e));
    if (window.electronAPI) {
      await window.electronAPI.markEmailRead(id, false);
    }
    if (selectedEmailId === id) setSelectedEmailId(null);
  };

  const handleSendEmail = async (to: string, subject: string, body: string, attachments?: any[]) => {
    if (window.electronAPI) {
      try {
        if (attachments && attachments.length > 0) {
          await window.electronAPI.sendEmailWithAttachments({
            to,
            subject,
            body,
            attachments: attachments.map(a => ({ filename: a.name, path: a.path }))
          });
        } else {
          await window.electronAPI.sendEmail({ to, subject, body });
        }

        // In a real app, we'd wait for sync to show it in Sent, but let's optimistic update:
        const newEmail: Email = {
          id: Date.now().toString(),
          senderName: 'Me',
          senderEmail: currentUser?.email || 'me@nexus.com',
          subject,
          preview: body.slice(0, 50) + '...',
          body,
          timestamp: 'Just now',
          read: true,
          starred: false,
          folderId: 'sent',
          avatarColor: 'bg-slate-600',
          attachments: attachments ? attachments.map(a => ({ 
            filename: a.name, 
            contentType: 'application/octet-stream', 
            size: a.size, 
            path: a.path 
          })) : []
        };
        setEmails(prev => [newEmail, ...prev]);
      } catch (error) {
        console.error("Failed to send email:", error);
        alert("Failed to send email. Please check your connection and try again.");
      }
    }
    setIsComposeOpen(false);
  };

  const handleMarkAsRead = async (id: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, read: true } : e));
    if (window.electronAPI) {
      await window.electronAPI.markEmailRead(id, true);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentView !== 'mail' || isComposeOpen) return;
      if (e.key === 'j' || e.key === 'k') {
        const currentIndex = filteredEmails.findIndex(e => e.id === selectedEmailId);
        if (e.key === 'j' && currentIndex < filteredEmails.length - 1) {
          setSelectedEmailId(filteredEmails[currentIndex + 1].id);
        } else if (e.key === 'k' && currentIndex > 0) {
          setSelectedEmailId(filteredEmails[currentIndex - 1].id);
        } else if (!selectedEmailId && filteredEmails.length > 0) {
          setSelectedEmailId(filteredEmails[0].id);
        }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEmailId) {
        if (e.key === 'Backspace') {
          const activeTag = document.activeElement?.tagName;
          if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') handleDeleteEmail(selectedEmailId);
        } else {
          handleDeleteEmail(selectedEmailId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, isComposeOpen, selectedEmailId, filteredEmails]);

  useEffect(() => {
    if (selectedEmailId) handleMarkAsRead(selectedEmailId);
  }, [selectedEmailId]);


  const handleOnboardingComplete = async (user: User, password?: string) => {
    // If the user object already has accounts (e.g. created during OAuth flow), use them
    if (user.accounts && user.accounts.length > 0) {
      if (!profiles.find(p => p.id === user.id)) {
        setProfiles(prev => [...prev, user]);
      } else {
        setProfiles(prev => prev.map(p => p.id === user.id ? user : p));
      }
      setCurrentUser(user);
      setCurrentView('mail');
      
      // Auto-trigger sync
      setTimeout(() => {
        handleSync();
      }, 500);
      return;
    }

    // Otherwise, try to add the account now (Manual flow)
    if (window.electronAPI) {
      const accountDetails: any = {
        email: user.email,
        displayName: user.name,
        profileId: user.id
      };

      if (user.oauthToken) {
        accountDetails.oauthToken = user.oauthToken;
        accountDetails.provider = user.oauthProvider || 'gmail';
      } else {
        accountDetails.password = password;
        accountDetails.provider = accountDetails.provider || 'gmail';
      }

      try {
        const result = await window.electronAPI.addAccount(accountDetails);

        if (result.success && result.account) {
          // Add the account to the user
          const updatedUser = {
            ...user,
            accounts: [result.account]
          };
          
          // Update profile list and current user
          if (!profiles.find(p => p.id === updatedUser.id)) {
            setProfiles(prev => [...prev, updatedUser]);
          } else {
            setProfiles(prev => prev.map(p => p.id === updatedUser.id ? updatedUser : p));
          }
          
          setCurrentUser(updatedUser);
          setCurrentView('mail');
          
          // Auto-trigger sync after account is added
          setTimeout(() => {
            handleSync();
          }, 500);
        } else {
          console.error('Failed to add account:', result.error);
          
          // If account already exists, we can proceed gracefully
          if (result.error && (result.error.includes('already added') || result.error.includes('UNIQUE constraint'))) {
             const updatedUser = { ...user };
             // We might want to fetch the account to ensure we have the ID, but for now let's proceed
             // Ideally we should fetch the account from DB, but we don't have a method exposed for 'getAccountByEmail'
             // Let's just proceed and let loadAccountsFromBackend fix the state
             
             if (!profiles.find(p => p.id === updatedUser.id)) {
                setProfiles(prev => [...prev, updatedUser]);
             }
             setCurrentUser(updatedUser);
             setCurrentView('mail');
             return;
          }

          alert('无法添加账户: ' + (result.error || '未知错误'));
        }
      } catch (err: any) {
        console.error('Error adding account:', err);
        alert('添加账户出错: ' + (err.message || '请重试'));
      }
    } else {
      // Fallback for testing without Electron
      if (!profiles.find(p => p.id === user.id)) {
        setProfiles(prev => [...prev, user]);
      }
      setCurrentUser(user);
      setCurrentView('mail');
    }
  };

  const handleCreateProfile = (name: string) => {
    const newProfile: User = {
      id: Date.now().toString(),
      name: name,
      email: `${name.toLowerCase().replace(/\s/g, '.')}@local`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      group: 'Local',
      accounts: []
    };
    setProfiles(prev => [...prev, newProfile]);
    setCurrentUser(newProfile);
    setIsAddProfileDialogOpen(false);
  };

  const handleSwitchProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) setCurrentUser(profile);
  };

  const handleAddAccount = async (newAccount: Account) => {
    if (!currentUser) return;
    // Refresh accounts from backend to get the latest list
    await loadAccountsFromBackend();
    setIsAddAccountDialogOpen(false);
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!currentUser || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.deleteAccount(accountId);
      if (result.success) {
        // Refresh accounts from backend
        await loadAccountsFromBackend();
        // Clear selected account if it was deleted
        if (selectedAccountId === accountId) {
          setSelectedAccountId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  const handleUpdateProfile = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setProfiles(prev => prev.map(p => p.id === updatedUser.id ? updatedUser : p));
  };

  if (currentView === 'setup') {
    return (
      <>
        {/* {renderTitleBar()} */}
        <div className="h-screen w-screen">
          <Onboarding
            onComplete={handleOnboardingComplete}
            currentTheme={theme}
            onThemeChange={setTheme}
          />
        </div>
      </>
    );
  }

  const isBackgroundActive = currentView === 'settings' || isAddAccountDialogOpen || isAddProfileDialogOpen || isEditProfileDialogOpen;

  return (
    <>
      {/* {renderTitleBar()} */}
      <div className="flex h-screen w-screen font-sans animate-fade-in overflow-hidden relative text-win-text bg-win-bg">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-win-panel backdrop-blur-md border-b border-win-border z-30 flex items-center px-4 justify-between">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-win-subtext active:bg-win-surface-active rounded-md transition-colors">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-win-text">Nexus Mail</span>
          <div className="w-8"></div>
        </div>

        <div
          ref={appRef}
          className="w-full h-full relative overflow-hidden"
        >
          <div className={`h-full w-full flex origin-center ${isBackgroundActive ? 'scale-[0.92] opacity-50 blur-[12px] pointer-events-none overflow-hidden grayscale-[0.2]' : ''}`}>
            <Sidebar
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
              user={currentUser}
              profiles={profiles}
              onSwitchProfile={handleSwitchProfile}
              onOpenSettings={() => setCurrentView('settings')}
              onAddUser={() => setIsAddProfileDialogOpen(true)}
              onCompose={() => setIsComposeOpen(true)}
              onAddAccount={() => setIsAddAccountDialogOpen(true)}
              onDeleteAccount={handleDeleteAccount}
              mobileMenuOpen={isMobileMenuOpen}
              onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
            />

            <div className="flex flex-1 min-w-0 bg-transparent relative">
              <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-win-border h-full ${selectedEmailId ? 'hidden md:flex' : 'flex'} flex-col`}>
                <EmailList
                  emails={filteredEmails}
                  selectedEmailId={selectedEmailId}
                  onSelectEmail={(id) => setSelectedEmailId(id)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  currentFilter={filterType}
                  onFilterChange={setFilterType}
                  syncStatus={syncStatus}
                  onSync={handleSync}
                  emailCount={emails.length}
                  syncProgress={syncProgress}
                  isLoading={isLoadingEmails}
                />
              </div>
              <main className={`flex-1 h-full bg-win-surface/40 min-w-0 ${selectedEmailId ? 'block' : 'hidden md:block'}`}>
                <div className="h-full relative">
                  {selectedEmailId && (
                    <button
                      onClick={() => setSelectedEmailId(null)}
                      className="md:hidden absolute top-4 left-4 z-50 text-win-subtext bg-win-surface p-2 rounded-full shadow-lg border border-win-border"
                    >
                      ← Back
                    </button>
                  )}
                  <ReadingPane
                    email={selectedEmail}
                    onDelete={handleDeleteEmail}
                    onArchive={handleArchiveEmail}
                    onStar={handleStarEmail}
                    onMarkUnread={handleMarkUnread}
                    onMarkSpam={handleMarkSpam}
                  />
                </div>
              </main>
            </div>
          </div>

          {/* Modal Layers */}
          {currentView === 'settings' && currentUser && (
            <div className="absolute inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="absolute inset-0" onClick={() => setCurrentView('mail')}></div>
              <div
                className="w-full max-w-5xl h-[85%] bg-win-bg border border-win-border rounded-3xl shadow-2xl overflow-hidden animate-win-open relative z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <Settings
                  user={currentUser}
                  onBack={() => setCurrentView('mail')}
                  onAddAccount={() => setIsAddAccountDialogOpen(true)}
                  currentTheme={theme}
                  onThemeChange={setTheme}
                  onUpdateProfile={handleUpdateProfile}
                  onEditProfile={() => setIsEditProfileDialogOpen(true)}
                  currentLanguage={language}
                  onLanguageChange={setLanguage}
                />
              </div>
            </div>
          )}

          <ComposeModal
            isOpen={isComposeOpen}
            onClose={() => setIsComposeOpen(false)}
            onSend={handleSendEmail}
          />
          <AddAccountDialog
            isOpen={isAddAccountDialogOpen}
            onClose={() => setIsAddAccountDialogOpen(false)}
            onComplete={handleAddAccount}
            profileId={currentUser?.id || ''}
          />
          <AddProfileDialog
            isOpen={isAddProfileDialogOpen}
            onClose={() => setIsAddProfileDialogOpen(false)}
            onComplete={handleCreateProfile}
          />
          {currentUser && (
            <EditProfileDialog
              isOpen={isEditProfileDialogOpen}
              onClose={() => setIsEditProfileDialogOpen(false)}
              currentUser={currentUser}
              onSave={(updatedUser) => {
                handleUpdateProfile(updatedUser);
              }}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default App;
