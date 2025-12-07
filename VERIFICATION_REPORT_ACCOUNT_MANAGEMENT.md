# Account Management Implementation Verification

## 1. Mainstream Email Providers Support
- **IMAP/SMTP**: Implemented using `imap-simple` and `nodemailer` in `electron/main.js`.
- **OAuth**: Implemented for Gmail, Outlook, Yahoo.
  - **Scopes**: Updated to include `openid`, `email`, `profile` to ensure `id_token` retrieval.
  - **Flow**: `AddAccountDialog.tsx` initiates login -> `electron/main.js` opens auth window -> `preload.js` listens for code -> `AddAccountDialog.tsx` exchanges code for token -> `account:add` stores token.

## 2. Secure Storage
- **Implementation**: Uses Electron's `safeStorage` API.
- **Data**: Encrypts passwords for manual accounts and OAuth tokens for OAuth accounts.
- **Storage**: Stored in SQLite `accounts` table as `encryptedPassword` and `encryptedOAuthToken`.

## 3. Multi-account Switching
- **UI**: `Sidebar.tsx` displays a list of accounts under the "Accounts" section.
- **Interaction**: Clicking an account filters the view (logic in `App.tsx` needs to ensure `selectedAccountId` filters emails).
- **State**: `App.tsx` manages `currentUser.accounts` and `selectedAccountId`.

## 4. Code Quality & Robustness
- **Preload**: Fixed `oauth.on` and `oauth.off` to correctly handle listener removal using a Map.
- **Error Handling**: `AddAccountDialog.tsx` handles OAuth errors and displays them.
- **Fallback**: OAuth flow attempts to decode `id_token` for email, with a fallback if missing (though `email` scope should prevent this).

## 5. Next Steps
- **Testing**: Run the application and test adding accounts (both manual and OAuth).
- **Email Sync**: Verify `email:sync` uses the correct credentials (password vs OAuth token) based on the account type. (Reviewed `electron/main.js`, logic seems correct).
