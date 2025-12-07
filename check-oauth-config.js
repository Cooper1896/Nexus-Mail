#!/usr/bin/env node

/**
 * OAuth Configuration Check Script
 * Diagnoses OAuth setup issues
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔍 OAuth Configuration Check');
console.log('================================\n');

const envVars = [
  'VITE_GMAIL_CLIENT_ID',
  'VITE_GMAIL_CLIENT_SECRET',
  'VITE_MICROSOFT_CLIENT_ID',
  'VITE_MICROSOFT_CLIENT_SECRET',
  'VITE_YAHOO_CLIENT_ID',
  'VITE_YAHOO_CLIENT_SECRET'
];

console.log('📋 Environment Variables Status:');
let allConfigured = true;

envVars.forEach(varName => {
  const value = process.env[varName];
  const isConfigured = value && !value.includes('your-') && !value.includes('YOUR_');
  const status = isConfigured ? '✅' : '❌';
  const display = value ? `${value.substring(0, 30)}...` : 'NOT SET';
  console.log(`  ${status} ${varName}: ${display}`);
  if (!isConfigured) allConfigured = false;
});

console.log('\n📁 File Checks:');
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);
console.log(`  ${envExists ? '✅' : '❌'} .env file exists`);

const mainPath = path.join(__dirname, 'electron/main.js');
const mainExists = fs.existsSync(mainPath);
console.log(`  ${mainExists ? '✅' : '❌'} electron/main.js exists`);

console.log('\n🌐 OAuth Providers Configuration:');
const providers = {
  gmail: {
    name: 'Google (Gmail)',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    redirectUri: 'http://localhost:7357/callback',
    scopes: ['https://mail.google.com/', 'email', 'profile']
  },
  outlook: {
    name: 'Microsoft (Outlook)',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    redirectUri: 'http://localhost:7357/callback',
    scopes: ['Mail.Read', 'Mail.Send', 'offline_access']
  },
  yahoo: {
    name: 'Yahoo Mail',
    authUrl: 'https://api.login.yahoo.com/oauth2/request_auth',
    tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
    redirectUri: 'http://localhost:7357/callback',
    scopes: ['mail-r', 'mail-w']
  }
};

Object.entries(providers).forEach(([id, config]) => {
  const clientId = process.env[`VITE_${id.toUpperCase()}_CLIENT_ID`];
  const clientSecret = process.env[`VITE_${id.toUpperCase()}_CLIENT_SECRET`];
  const isConfigured = clientId && !clientId.includes('your-') && !clientId.includes('YOUR_');
  
  console.log(`\n  ${isConfigured ? '✅' : '⚠️'} ${config.name}`);
  console.log(`     Auth URL: ${config.authUrl}`);
  console.log(`     Token URL: ${config.tokenUrl}`);
  console.log(`     Redirect URI: ${config.redirectUri}`);
  console.log(`     Scopes: ${config.scopes.join(', ')}`);
  console.log(`     Configured: ${isConfigured ? 'YES' : 'NO'}`);
});

console.log('\n💡 Troubleshooting Guide:');
if (!allConfigured) {
  console.log(`
  1. If you see "NOT SET" or "your-*" values above, you need to:
     a) Get OAuth credentials from the provider:
        - Gmail: https://console.cloud.google.com
        - Outlook: https://portal.azure.com
        - Yahoo: https://developer.yahoo.com
     
     b) Create a .env file in the project root with:
        VITE_GMAIL_CLIENT_ID=your_gmail_client_id
        VITE_GMAIL_CLIENT_SECRET=your_gmail_client_secret
        (repeat for other providers)
     
     c) Restart the development server for changes to take effect
  
  2. Make sure the OAuth application redirect URI is set to:
     http://localhost:7357/callback
  
  3. For Gmail, make sure to enable the Gmail API in Google Cloud Console
  
  4. Check that your OAuth credentials are valid and haven't expired
  `);
} else {
  console.log(`
  ✅ All OAuth providers are properly configured!
  
  You can now:
  1. Start the development server: npm run dev
  2. Click on a mail provider to initiate OAuth login
  3. You should see a browser window open for authentication
  `);
}

console.log('\n📝 Debug Information:');
console.log(`  Node version: ${process.version}`);
console.log(`  Working directory: ${process.cwd()}`);
console.log(`  .env path: ${envPath}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);

console.log('\n================================');
