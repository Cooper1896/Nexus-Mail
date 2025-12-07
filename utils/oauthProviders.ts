/**
 * OAuth2 Provider Configuration for Email Services
 * Handles authentication flow for Gmail, Outlook, Yahoo, iCloud
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scope: string[];
  accessType?: string;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: number;
  tokenType: string;
}

export interface OAuthProvider {
  id: string;
  name: string;
  config: OAuthConfig;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  getAuthorizationUrl: (state: string) => string;
}

// OAuth2 Provider Configurations
// Note: These are placeholder credentials for development
// In production, these should be stored securely in environment variables
export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    config: {
      clientId: import.meta.env.VITE_GMAIL_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
      clientSecret: import.meta.env.VITE_GMAIL_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
      redirectUri: 'http://localhost:7357/callback',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'email',
        'profile'
      ],
      accessType: 'offline'
    },
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    getAuthorizationUrl(state: string) {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        response_type: 'code',
        scope: this.config.scope.join(' '),
        access_type: this.config.accessType || 'offline',
        state,
        prompt: 'consent'
      });
      return `${this.config.authorizationUrl}?${params.toString()}`;
    }
  },

  outlook: {
    id: 'outlook',
    name: 'Outlook / Hotmail',
    config: {
      clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || 'YOUR_MICROSOFT_CLIENT_ID',
      clientSecret: import.meta.env.VITE_MICROSOFT_CLIENT_SECRET || 'YOUR_MICROSOFT_CLIENT_SECRET',
      redirectUri: 'http://localhost:7357/callback',
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scope: [
        'Mail.Read',
        'Mail.Send',
        'offline_access',
        'User.Read'
      ]
    },
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    getAuthorizationUrl(state: string) {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        response_type: 'code',
        scope: this.config.scope.join(' '),
        state,
        response_mode: 'query',
        prompt: 'select_account'
      });
      return `${this.config.authorizationUrl}?${params.toString()}`;
    }
  },

  yahoo: {
    id: 'yahoo',
    name: 'Yahoo Mail',
    config: {
      clientId: import.meta.env.VITE_YAHOO_CLIENT_ID || 'YOUR_YAHOO_CLIENT_ID',
      clientSecret: import.meta.env.VITE_YAHOO_CLIENT_SECRET || 'YOUR_YAHOO_CLIENT_SECRET',
      redirectUri: 'http://localhost:7357/callback',
      authorizationUrl: 'https://api.login.yahoo.com/oauth2/request_auth',
      tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
      scope: [
        'mail-r',
        'mail-w',
        'sdpp-w',
        'sdpp-r'
      ]
    },
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 587,
    getAuthorizationUrl(state: string) {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        response_type: 'code',
        scope: this.config.scope.join(' '),
        state,
        language: 'en-US'
      });
      return `${this.config.authorizationUrl}?${params.toString()}`;
    }
  },

  icloud: {
    id: 'icloud',
    name: 'iCloud Mail',
    config: {
      clientId: import.meta.env.VITE_APPLE_CLIENT_ID || 'YOUR_APPLE_CLIENT_ID',
      clientSecret: import.meta.env.VITE_APPLE_CLIENT_SECRET || 'YOUR_APPLE_CLIENT_SECRET',
      redirectUri: 'http://localhost:7357/callback',
      authorizationUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      scope: [
        'email',
        'name'
      ]
    },
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.me.com',
    smtpPort: 587,
    getAuthorizationUrl(state: string) {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        response_type: 'code id_token',
        response_mode: 'form_post',
        scope: this.config.scope.join(' '),
        state,
        use_popup: 'true'
      });
      return `${this.config.authorizationUrl}?${params.toString()}`;
    }
  }
};

/**
 * Get OAuth configuration for a specific provider
 */
export function getOAuthProvider(providerId: string): OAuthProvider | null {
  return OAUTH_PROVIDERS[providerId] || null;
}

/**
 * Get all available OAuth providers
 */
export function getAllOAuthProviders(): OAuthProvider[] {
  return Object.values(OAUTH_PROVIDERS);
}

/**
 * Generate OAuth state parameter
 */
export function generateOAuthState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Validate OAuth configuration
 */
export function validateOAuthConfig(provider: OAuthProvider): boolean {
  const { clientId, clientSecret, redirectUri } = provider.config;
  
  // Check if credentials are not placeholders
  const hasValidCredentials = 
    clientId && !clientId.includes('YOUR_') &&
    clientSecret && !clientSecret.includes('YOUR_') &&
    redirectUri && redirectUri.startsWith('http');

  if (!hasValidCredentials) {
    console.warn(
      `OAuth credentials for ${provider.name} are not configured. ` +
      `Please set environment variables: VITE_${provider.id.toUpperCase()}_CLIENT_ID and VITE_${provider.id.toUpperCase()}_CLIENT_SECRET`
    );
    return false;
  }

  return true;
}

/**
 * Extract email from OAuth token response (provider-specific)
 */
export function extractEmailFromOAuthResponse(providerId: string, response: any): string | null {
  switch (providerId) {
    case 'gmail':
      return response.email;
    case 'outlook':
      return response.userPrincipalName || response.mail;
    case 'yahoo':
      return response.email;
    case 'icloud':
      return response.email;
    default:
      return null;
  }
}

/**
 * Get IMAP access token configuration for OAuth
 * Gmail and Outlook use special XOAUTH2 authentication
 */
export function getIMAPOAuthConfig(providerId: string, email: string, accessToken: string) {
  switch (providerId) {
    case 'gmail':
      // Gmail uses XOAUTH2 with access token
      return {
        xoauth2: `user=${email}\x01auth=Bearer ${accessToken}\x01\x01`
      };
    
    case 'outlook':
      // Outlook uses XOAUTH2 with access token
      return {
        xoauth2: `user=${email}\x01auth=Bearer ${accessToken}\x01\x01`
      };
    
    case 'yahoo':
      // Yahoo uses XOAUTH2 with access token
      return {
        xoauth2: `user=${email}\x01auth=Bearer ${accessToken}\x01\x01`
      };
    
    case 'icloud':
      // iCloud requires app-specific password, not OAuth
      return null;
    
    default:
      return null;
  }
}
