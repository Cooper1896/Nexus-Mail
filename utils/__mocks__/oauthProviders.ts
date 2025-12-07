// Jest mock for utils/oauthProviders.ts
export const OAUTH_PROVIDERS = {
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    config: {
      clientId: 'test-gmail-client-id',
      clientSecret: 'test-gmail-secret',
      redirectUri: 'http://localhost/oauth/callback',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: ['https://mail.google.com/'],
      accessType: 'offline'
    },
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    getAuthorizationUrl: (state: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`
  },
  outlook: {
    id: 'outlook',
    name: 'Outlook',
    config: {
      clientId: 'test-outlook-client-id',
      clientSecret: 'test-outlook-secret',
      redirectUri: 'http://localhost/oauth/callback',
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scope: ['https://outlook.office.com/IMAP.AccessAsUser.All', 'https://outlook.office.com/SMTP.Send', 'offline_access']
    },
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    getAuthorizationUrl: (state: string) => `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?state=${state}`
  },
  yahoo: {
    id: 'yahoo',
    name: 'Yahoo',
    config: {
      clientId: 'test-yahoo-client-id',
      clientSecret: 'test-yahoo-secret',
      redirectUri: 'http://localhost/oauth/callback',
      authorizationUrl: 'https://api.login.yahoo.com/oauth2/request_auth',
      tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
      scope: ['mail-r', 'mail-w']
    },
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 587,
    getAuthorizationUrl: (state: string) => `https://api.login.yahoo.com/oauth2/request_auth?state=${state}`
  }
};

export const getAllOAuthProviders = () => Object.values(OAUTH_PROVIDERS);
export const getOAuthProvider = (id: string) => OAUTH_PROVIDERS[id as keyof typeof OAUTH_PROVIDERS];
export const isOAuthProvider = (providerId: string) => providerId in OAUTH_PROVIDERS;