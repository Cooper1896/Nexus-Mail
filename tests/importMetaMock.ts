// Mock for import.meta.env in Jest environment
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_GMAIL_CLIENT_ID: 'test-gmail-client-id',
        VITE_GMAIL_CLIENT_SECRET: 'test-gmail-secret',
        VITE_OUTLOOK_CLIENT_ID: 'test-outlook-client-id',
        VITE_OUTLOOK_CLIENT_SECRET: 'test-outlook-secret',
        VITE_YAHOO_CLIENT_ID: 'test-yahoo-client-id',
        VITE_YAHOO_CLIENT_SECRET: 'test-yahoo-secret'
      }
    }
  },
  writable: true
});