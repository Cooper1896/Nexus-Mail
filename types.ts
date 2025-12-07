export interface Account {
  id: string;
  email: string;
  displayName?: string;
  provider: 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'qq' | '163' | 'imap';
  status: 'active' | 'syncing' | 'error';
  lastSync?: string;
  // Optional IMAP/SMTP config for custom providers
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  group?: string;
  accounts?: Account[];
  theme?: 'light' | 'dark' | 'system';
  oauthToken?: any;
  oauthProvider?: string;
}

export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  path?: string;
}

export interface Email {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  preview: string;
  body: string;
  attachments?: Attachment[];
  timestamp: string;
  read: boolean;
  starred: boolean;
  folderId: string;
  accountId?: string;
  avatarColor?: string;
  labels?: string[];
  isNew?: boolean; // Visual flag for new arrival
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
  count?: number;
  type: 'system' | 'custom';
}

export type ViewMode = 'list' | 'grid';
export type AppView = 'mail' | 'settings' | 'setup';
export type Theme = 'light' | 'dark' | 'system';
export type FilterType = 'all' | 'unread' | 'starred';
export type SortOption = 'date-desc' | 'date-asc' | 'sender-asc' | 'sender-desc' | 'subject-asc' | 'subject-desc';
export type Language = 'en' | 'zh-CN' | 'zh-TW';

// Email Attachment for sending
export interface EmailAttachment {
  filename: string;
  path?: string;           // File path on disk
  content?: string;        // Base64 encoded content
  contentType?: string;    // MIME type
}

// Sync Progress Event Data
export interface SyncProgressData {
  type: 'start' | 'folder-count' | 'count-complete' | 'folder-start' | 'email-synced' | 'folder-complete' | 'folder-error' | 'complete' | 'error';
  accountId?: string;
  folderId?: string;
  imapFolder?: string;
  message?: string;
  count?: number;
  totalEmails?: number;
  processed?: number;
  total?: number;
  synced?: number;
  folderSynced?: number;
  totalSynced?: number;
  emailId?: string;
  subject?: string;
  senderName?: string;
  senderEmail?: string;
  timestamp?: string;
  isNew?: boolean;
  email?: Email;
  error?: string;
  results?: Record<string, { success: boolean; synced?: number; total?: number; error?: string }>;
}

// Global Window Interface for Electron
declare global {
  interface Window {
    electronAPI: {
      platform: string;
      // OAuth
      oauth: {
        login: (providerId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
        exchangeCode: (data: { providerId: string; code: string }) => Promise<{ success: boolean; token?: any; error?: string }>;
        on: (event: string, listener: (data: any) => void) => void;
        off: (event: string, listener: (data: any) => void) => void;
      };
      // Account Management
      addAccount: (details: {
        email: string;
        password?: string;
        provider?: string;
        displayName?: string;
        oauthToken?: any;
        profileId: string;
        customConfig?: {
          imapHost: string;
          imapPort: number;
          smtpHost: string;
          smtpPort: number;
          secure: boolean;
        };
      }) => Promise<{ success: boolean; account?: Account; error?: string }>;
      getAccounts: (profileId: string) => Promise<Account[]>;
      deleteAccount: (accountId: string) => Promise<{ success: boolean; error?: string }>;
      updateAccount: (accountId: string, updates: { displayName?: string; status?: string }) => Promise<{ success: boolean; error?: string }>;
      // Email Sync Operations
      syncEmails: (accountId: string) => Promise<{ success: boolean; message?: string; lastSync?: string; error?: string }>;
      syncAllEmails: (accountId: string) => Promise<{ success: boolean; results?: Record<string, { success: boolean; synced?: number; total?: number; error?: string }>; lastSync?: string; totalSynced?: number; totalEmails?: number; error?: string }>;
      getEmails: (folderId: string, accountId?: string, profileId?: string) => Promise<Email[]>;
      getUnreadCounts: (profileId: string) => Promise<Record<string, number>>;
      // Email Send Operations
      sendEmail: (data: { to: string; subject: string; body: string; accountId?: string }) => Promise<{ success: boolean; messageId?: string; error?: string }>;
      sendEmailWithAttachments: (data: {
        to: string;
        cc?: string;
        bcc?: string;
        subject: string;
        body: string;
        html?: string;
        attachments?: EmailAttachment[];
        accountId?: string;
      }) => Promise<{ success: boolean; messageId?: string; error?: string }>;
      saveDraft: (data: { to?: string; subject?: string; body?: string; accountId?: string }) => Promise<{ success: boolean; draftId?: string; error?: string }>;
      // Sync Progress Events
      onSyncProgress: (callback: (data: SyncProgressData) => void) => () => void;
      // Email Actions (sync to server)
      markEmailRead: (emailId: string, isRead: boolean) => Promise<{ success: boolean; warning?: string; error?: string }>;
      starEmail: (emailId: string, isStarred: boolean) => Promise<{ success: boolean; warning?: string; error?: string }>;
      moveEmail: (emailId: string, targetFolderId: string) => Promise<{ success: boolean; newEmailId?: string; warning?: string; error?: string }>;
      deleteEmail: (emailId: string) => Promise<{ success: boolean; warning?: string; error?: string }>;
      // AI
      generateSummary: (text: string) => Promise<string>;
      // Window Controls
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    }
  }
}
