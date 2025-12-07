const { contextBridge, ipcRenderer } = require('electron');

const listeners = new Map();

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // OAuth
  oauth: {
    login: (providerId) => ipcRenderer.invoke('oauth:login', providerId),
    exchangeCode: ({ providerId, code }) => ipcRenderer.invoke('oauth:exchange-code', { providerId, code }),
    on: (channel, callback) => {
      const subscription = (_, data) => callback(data);
      // Store the wrapper function mapped to the original callback
      // Note: This assumes callback reference is stable.
      // If the same callback is used for multiple channels, we might need a better key.
      // But for now, let's use a composite key or just map callback -> map of channel -> subscription?
      // Simple map callback -> subscription is risky if same callback used for multiple events.
      // Let's use a Map<Callback, Map<Channel, Subscription>>.
      
      if (!listeners.has(callback)) {
        listeners.set(callback, new Map());
      }
      const channelMap = listeners.get(callback);
      channelMap.set(channel, subscription);
      
      ipcRenderer.on(channel, subscription);
    },
    off: (channel, callback) => {
      const channelMap = listeners.get(callback);
      if (channelMap && channelMap.has(channel)) {
        const subscription = channelMap.get(channel);
        ipcRenderer.removeListener(channel, subscription);
        channelMap.delete(channel);
        if (channelMap.size === 0) {
          listeners.delete(callback);
        }
      }
    }
  },

  // Account Management
  addAccount: (accountDetails) => ipcRenderer.invoke('account:add', accountDetails),
  getAccounts: (profileId) => ipcRenderer.invoke('account:list', profileId),
  deleteAccount: (accountId) => ipcRenderer.invoke('account:delete', accountId),
  updateAccount: (accountId, updates) => ipcRenderer.invoke('account:update', accountId, updates),

  // Email Operations
  syncEmails: (accountId) => ipcRenderer.invoke('email:sync', accountId),
  syncAllEmails: (accountId) => ipcRenderer.invoke('email:sync-all', accountId),
  getEmails: (folderId, accountId, profileId) => ipcRenderer.invoke('email:list', folderId, accountId, profileId),
  getUnreadCounts: (profileId) => ipcRenderer.invoke('email:get-unread-counts', profileId),
  sendEmail: (emailData) => ipcRenderer.invoke('email:send', emailData),
  sendEmailWithAttachments: (emailData) => ipcRenderer.invoke('email:send-with-attachments', emailData),
  saveDraft: (draftData) => ipcRenderer.invoke('email:save-draft', draftData),
  
  // Sync Progress Events
  onSyncProgress: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on('sync:progress', subscription);
    return () => ipcRenderer.removeListener('sync:progress', subscription);
  },
  
  // Email Actions (sync to server)
  markEmailRead: (emailId, isRead) => ipcRenderer.invoke('email:mark-read', emailId, isRead),
  starEmail: (emailId, isStarred) => ipcRenderer.invoke('email:star', emailId, isStarred),
  moveEmail: (emailId, targetFolderId) => ipcRenderer.invoke('email:move', emailId, targetFolderId),
  deleteEmail: (emailId) => ipcRenderer.invoke('email:delete', emailId),

  // AI
  generateSummary: (content) => ipcRenderer.invoke('ai:summarize', content),

  // Window Controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // System
  openPath: (path) => ipcRenderer.invoke('shell:open-path', path),
});