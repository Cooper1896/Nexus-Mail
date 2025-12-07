const { app, BrowserWindow, ipcMain, safeStorage, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const imaps = require('imap-simple');
const http = require('http');
const { URL } = require('url');
const iconv = require('iconv-lite');

// Load environment variables from .env file
const dotenv = require('dotenv');
const envPath = path.join(__dirname, '../.env');
console.log('Loading .env from:', envPath);
const envResult = dotenv.config({ path: envPath });
if (envResult.error) {
  console.warn('Warning: Could not load .env file:', envResult.error.message);
} else {
  console.log('Successfully loaded .env file');
}

// Debug: Log loaded OAuth credentials
console.log('Gmail Client ID loaded:', !!process.env.VITE_GMAIL_CLIENT_ID);
console.log('Gmail Client Secret loaded:', !!process.env.VITE_GMAIL_CLIENT_SECRET);

// sql.js is a pure JS SQLite - no native compilation needed
let db;

// --- OAUTH CONFIGURATION ---
let oauthWindow = null;
let oauthCallbackServer = null;

// --- DATABASE SETUP ---
const dbPath = app.isPackaged
  ? path.join(app.getPath('userData'), 'nexus-mail.db')
  : path.join(__dirname, '../nexus-mail.db');

// Email Provider Configurations
const PROVIDER_CONFIGS = {
  gmail: {
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    secure: true
  },
  outlook: {
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    secure: false
  },
  yahoo: {
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 465,
    secure: true
  },
  icloud: {
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.me.com',
    smtpPort: 587,
    secure: false
  },
  qq: {
    imapHost: 'imap.qq.com',
    imapPort: 993,
    smtpHost: 'smtp.qq.com',
    smtpPort: 465,
    secure: true
  },
  '163': {
    imapHost: 'imap.163.com',
    imapPort: 993,
    smtpHost: 'smtp.163.com',
    smtpPort: 465,
    secure: true
  }
};

// Auto-detect provider from email
function detectProvider(email) {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  if (domain.includes('gmail')) return 'gmail';
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) return 'outlook';
  if (domain.includes('yahoo')) return 'yahoo';
  if (domain.includes('icloud') || domain.includes('me.com')) return 'icloud';
  if (domain.includes('qq.com')) return 'qq';
  if (domain.includes('163.com')) return '163';
  return 'imap'; // Custom IMAP
}

async function initDatabase() {
  const SQL = await require('sql.js')();

  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch (err) {
    console.error('Database load error:', err);
    db = new SQL.Database();
  }

  // Initialize Tables with expanded schema
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      profileId TEXT,
      email TEXT UNIQUE,
      displayName TEXT,
      provider TEXT,
      encryptedPassword TEXT,
      encryptedOAuthToken TEXT,
      imapHost TEXT,
      imapPort INTEGER,
      smtpHost TEXT,
      smtpPort INTEGER,
      secure INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      lastSync TEXT,
      createdAt TEXT
    );
    
    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      accountId TEXT,
      folderId TEXT,
      senderName TEXT,
      senderEmail TEXT,
      subject TEXT,
      preview TEXT,
      body TEXT,
      attachments TEXT,
      timestamp DATETIME,
      isRead INTEGER DEFAULT 0,
      isStarred INTEGER DEFAULT 0,
      FOREIGN KEY(accountId) REFERENCES accounts(id) ON DELETE CASCADE
    );
  `);

  // Migration: Ensure encryptedOAuthToken and profileId columns exist
  try {
    db.run("ALTER TABLE accounts ADD COLUMN encryptedOAuthToken TEXT");
  } catch (e) {}
  
  try {
    db.run("ALTER TABLE accounts ADD COLUMN profileId TEXT");
    console.log('Migration: Added profileId column');
  } catch (e) {}

  try {
    db.run("ALTER TABLE emails ADD COLUMN attachments TEXT");
    console.log('Migration: Added attachments column');
  } catch (e) {}

  saveDatabase();
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// --- MIME DECODING HELPERS ---

// Decode MIME encoded headers (=?UTF-8?B?...?= or =?UTF-8?Q?...?=)
function decodeMimeHeader(str) {
  if (!str) return str;
  
  // Match encoded words: =?charset?encoding?encoded_text?=
  const encodedWordRegex = /=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi;
  
  return str.replace(encodedWordRegex, (match, charset, encoding, encodedText) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        // Base64 encoding
        const decoded = Buffer.from(encodedText, 'base64');
        const result = decodeWithCharset(decoded, charset);
        console.log(`[MIME Header] Decoded B-encoded ${charset}: ${encodedText.substring(0, 20)}... => ${result.substring(0, 20)}...`);
        return result;
      } else if (encoding.toUpperCase() === 'Q') {
        // Quoted-printable encoding
        const decoded = encodedText
          .replace(/_/g, ' ')
          .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        
        // For Q-encoding with non-ASCII charset, we need to handle it as bytes
        if (charset.toLowerCase() !== 'us-ascii' && charset.toLowerCase() !== 'utf-8') {
          try {
            const buffer = Buffer.from(decoded, 'latin1'); // Q-encoding produces 8-bit bytes
            const result = decodeWithCharset(buffer, charset);
            console.log(`[MIME Header] Decoded Q-encoded ${charset}: ${encodedText.substring(0, 20)}... => ${result.substring(0, 20)}...`);
            return result;
          } catch (e) {
            console.warn(`[MIME Header] Q-decode failed for ${charset}:`, e.message);
          }
        }
        
        return decoded;
      }
    } catch (e) {
      console.error('[MIME Header] Decode error:', e);
    }
    return match;
  });
}

// Robust MIME parser - handles nested multipart and various encodings
function parseMimeMessage(rawMessage, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) {
    console.warn('[parseMimeMessage] Max nesting depth exceeded, stopping');
    return { text: '', html: '', attachments: [] };
  }
  
  if (!rawMessage) return { text: '', html: '', attachments: [] };
  
  const result = { text: '', html: '', attachments: [] };
  
  console.log(`[parseMimeMessage] Input length: ${rawMessage.length}, first 100 chars: ${rawMessage.substring(0, 100).replace(/\n/g, '\\n')}`);
  
  // Helper to recursively parse parts
  function parseParts(content, boundary, currentDepth = 0) {
    const parts = content.split(new RegExp('--' + boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('--')) continue; // End boundary
      
      const partResult = parseMimePart(part, currentDepth + 1);
      if (partResult.text && !result.text) result.text = partResult.text;
      if (partResult.html && !result.html) result.html = partResult.html;
      if (partResult.attachments && partResult.attachments.length > 0) {
        result.attachments.push(...partResult.attachments);
      }
    }
  }

  // Extract Content-Type and boundary from the message
  const headerMatch = rawMessage.match(/^([\s\S]*?)\r?\n\r?\n/);
  const headers = headerMatch ? headerMatch[1] : '';
  
  const contentTypeMatch = headers.match(/Content-Type:\s*([^;\r\n]+)/i);
  const contentType = contentTypeMatch ? contentTypeMatch[1].trim().toLowerCase() : 'text/plain';
  
  const boundaryMatch = headers.match(/boundary=["']?([^"'\r\n;]+)["']?/i);
  
  console.log(`[parseMimeMessage] Content-Type: ${contentType}, has boundary: ${!!boundaryMatch}`);
  
  if (boundaryMatch && contentType.includes('multipart')) {
    parseParts(rawMessage, boundaryMatch[1], depth);
  } else {
    const partResult = parseMimePart(rawMessage, depth);
    result.text = partResult.text;
    result.html = partResult.html;
    result.attachments = partResult.attachments;
    
    console.log(`[parseMimeMessage] Result - text length: ${result.text.length}, html length: ${result.html.length}`);
  }
  
  return result;
}

function parseMimePart(part, depth = 0) {
  // Prevent deep recursion
  if (depth > 10) {
    console.warn('[parseMimePart] Max nesting depth exceeded');
    return { text: '', html: '', attachments: [] };
  }
  
  const result = { text: '', html: '', attachments: [] };
  
  // Split headers and body
  const headerBodySplit = part.split(/\r?\n\r?\n/);
  if (headerBodySplit.length < 2) return result;
  
  const headers = headerBodySplit[0];
  let body = headerBodySplit.slice(1).join('\n\n');
  
  // Check for nested multipart
  const nestedBoundaryMatch = headers.match(/boundary=["']?([^"'\r\n;]+)["']?/i);
  if (nestedBoundaryMatch && headers.toLowerCase().includes('multipart')) {
    // Parse nested multipart - extract boundary and parse the body parts
    const boundaryRegex = new RegExp('--' + nestedBoundaryMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const nestedParts = body.split(boundaryRegex);
    
    for (let i = 1; i < nestedParts.length; i++) {
      const nestedPart = nestedParts[i];
      if (nestedPart.startsWith('--')) continue; // End boundary
      
      const nestedResult = parseMimePart(nestedPart, depth + 1);
      if (nestedResult.text && !result.text) result.text = nestedResult.text;
      if (nestedResult.html && !result.html) result.html = nestedResult.html;
      if (nestedResult.attachments && nestedResult.attachments.length > 0) {
        result.attachments.push(...nestedResult.attachments);
      }
    }
    
    return result;
  }
  
  // Get content type
  const ctMatch = headers.match(/Content-Type:\s*([^;\r\n]+)/i);
  const contentType = ctMatch ? ctMatch[1].trim().toLowerCase() : 'text/plain';
  
  // Get transfer encoding first (needed before logging)
  const encodingMatch = headers.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
  const encoding = encodingMatch ? encodingMatch[1].trim().toLowerCase() : '7bit';
  
  // Get charset (handle various formats)
  const charsetMatch = headers.match(/charset=["']?([^"'\r\n;]+)["']?/i);
  let charset = charsetMatch ? charsetMatch[1].trim().toLowerCase() : 'utf-8';
  
  // Normalize some common charset variations
  if (charset.startsWith('iso-2022')) charset = 'iso-8859-1';
  
  console.log(`[MIME] Content-Type: ${contentType}, Charset: ${charset}, Encoding: ${encoding}`);
  
  // Get Content-Disposition (attachment check)
  const dispositionMatch = headers.match(/Content-Disposition:\s*([^;\r\n]+)/i);
  const disposition = dispositionMatch ? dispositionMatch[1].trim().toLowerCase() : '';
  
  // Get Filename
  const filenameMatch = headers.match(/filename\*?=["']?([^"'\r\n;]+)["']?/i);
  let filename = filenameMatch ? filenameMatch[1] : '';
  if (filename) {
      // Handle RFC 2231 encoded filename (e.g., filename*=utf-8''%E4%B8%AD%E6%96%87.txt)
      if (filename.toLowerCase().startsWith("utf-8''")) {
          try {
              filename = decodeURIComponent(filename.split("''")[1]);
          } catch (e) {}
      } else {
          filename = decodeMimeHeader(filename);
      }
  }

  // Decode body based on transfer encoding
  let buffer;
  if (encoding === 'base64') {
    try {
      const base64Content = body.replace(/\s/g, '');
      buffer = Buffer.from(base64Content, 'base64');
    } catch (e) {
      console.error('Base64 decode error:', e.message);
      buffer = Buffer.from(body);
    }
  } else if (encoding === 'quoted-printable') {
    buffer = decodeQuotedPrintable(body); // Now returns a Buffer
  } else {
    buffer = Buffer.from(body);
  }
  
  // Check if it is an attachment
  if (disposition === 'attachment' || (disposition === 'inline' && filename) || contentType === 'application/octet-stream' || (filename && !contentType.startsWith('text/'))) {
      if (!filename) filename = 'unnamed_attachment';
      result.attachments.push({
          filename,
          contentType,
          size: buffer.length,
          content: buffer // Keep buffer for saving later
      });
      return result; // Don't treat as text/html body
  }

  // Decode charset for text/html
  const decodedBody = decodeWithCharset(buffer, charset);
  
  // Clean up body - remove any remaining MIME markers if they exist
  const cleanBody = decodedBody
    .replace(/^------=_Part_[\w.]+[\r\n]*/gm, '')
    .trim();
  
  if (contentType.includes('text/html')) {
    result.html = cleanBody;
    result.text = stripHtml(cleanBody); // Fallback text
  } else if (contentType.includes('text/plain')) {
    result.text = cleanBody;
  }
  
  return result;
}

function decodeWithCharset(buffer, charset) {
  // Handle cases where buffer might be a string
  if (typeof buffer === 'string') {
    return buffer;
  }
  
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return '';
  }
  
  const charsetMap = {
    'gb2312': 'gbk',
    'gb18030': 'gbk',
    'gb_2312-80': 'gbk',
    'gb-2312': 'gbk',
    'big5': 'big5',
    'big5-hkscs': 'big5',
    'iso-8859-1': 'latin1',
    'iso-8859-15': 'latin1',
    'windows-1252': 'latin1',
    'cp1252': 'latin1',
    'us-ascii': 'utf8',
    'ascii': 'utf8',
    'ks_c_5601-1987': 'cp949',
    'ks_c_5601': 'cp949',
    'euc-kr': 'cp949',
    'shift_jis': 'shiftjis',
    'shift-jis': 'shiftjis',
    'sjis': 'shiftjis',
    'windows-31j': 'shiftjis',
    'euc-jp': 'eucjp',
    'ujis': 'eucjp',
    'utf-8': 'utf8',
    'utf8': 'utf8',
    'utf-16': 'utf16le',
    'utf-16le': 'utf16le',
    'utf-16be': 'utf16be'
  };
  
  const normalizedCharset = charsetMap[charset.toLowerCase().trim()] || charset.toLowerCase().trim();
  
  console.log(`[decodeWithCharset] Attempting to decode with charset: ${charset} (normalized: ${normalizedCharset}), buffer size: ${buffer.length}`);
  
  try {
    // Use iconv-lite for robust decoding
    if (iconv.encodingExists(normalizedCharset)) {
      const decoded = iconv.decode(buffer, normalizedCharset);
      const result = decoded.replace(/\0/g, '');
      console.log(`[decodeWithCharset] Successfully decoded with ${normalizedCharset}, result length: ${result.length}`);
      return result;
    }
  } catch (e) {
    console.warn(`[Charset] iconv decode failed for "${charset}" (normalized: "${normalizedCharset}"):`, e.message);
  }

  // 如果指定的编码失败，尝试常见的中文编码
  if (normalizedCharset !== 'gbk' && normalizedCharset !== 'big5' && normalizedCharset !== 'utf8') {
    console.log(`[decodeWithCharset] Primary encoding failed, trying fallback encodings...`);
    
    const fallbackEncodings = ['gbk', 'big5', 'utf8'];
    for (const enc of fallbackEncodings) {
      try {
        if (iconv.encodingExists(enc)) {
          const decoded = iconv.decode(buffer, enc);
          const result = decoded.replace(/\0/g, '');
          // 简单启发式判断：如果结果看起来合理就返回
          if (result.length > 0 && !result.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/)) {
            console.log(`[decodeWithCharset] Fallback succeeded with ${enc}`);
            return result;
          }
        }
      } catch (e) {
        // 继续尝试下一个编码
      }
    }
  }

  try {
    if (typeof TextDecoder !== 'undefined') {
      // Try to use TextDecoder if iconv fails or charset not supported by iconv
      const decoder = new TextDecoder(normalizedCharset, { fatal: false });
      const decoded = decoder.decode(buffer);
      return decoded.replace(/\0/g, '');
    }
  } catch (e) {
    console.warn(`[Charset] TextDecoder failed for "${charset}":`, e.message);
  }
  
  // Fallback to utf8
  try {
    const decoded = buffer.toString('utf8');
    const result = decoded.replace(/\0/g, '');
    console.log(`[decodeWithCharset] Falling back to UTF-8`);
    return result;
  } catch (e) {
    console.error('[Charset] All decoding failed, returning empty string');
    return '';
  }
}

function stripHtml(html) {
  // Improved sanitizer: Preserves layout tags but removes scripts/styles/dangerous attributes
  if (!html) return '';
  
  let sanitized = html
    // Remove scripts
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, "")
    // Remove styles (optional, but usually email clients inline styles. 
    // If we keep <style>, it might affect the whole app. 
    // Better to scope it or remove it. For now, let's remove global style blocks but keep inline styles)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, "")
    // Remove object/embed/iframe
    .replace(/<(object|embed|iframe)\b[^>]*>[\s\S]*?<\/\1>/gim, "")
    // Remove event handlers (on...)
    .replace(/ on\w+="[^"]*"/gim, "")
    // Remove javascript: links
    .replace(/href="javascript:[^"]*"/gim, 'href="#"');

  // Note: We do NOT remove <div>, <table>, <p>, etc. anymore.
  // But for the 'preview' text in the list, we still want plain text.
  // So we need a separate 'extractText' function for previews.
  
  return sanitized;
}

// Extract plain text for preview/search
function extractPlainText(html) {
   return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Clean invalid/corrupted characters from text
function cleanCorruptedText(text) {
  if (!text || typeof text !== 'string') return '';
  
  // Remove common corrupted character patterns
  // Remove control characters except common whitespace
  text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  
  // Replace multiple consecutive special characters with single space
  text = text.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]+/g, ' ');
  
  // Fix common mojibake patterns (when UTF-8 is interpreted as Latin-1 or similar)
  // This is complex, so we'll do basic sanitation
  text = text.replace(/\?+/g, '?'); // Collapse multiple question marks
  
  return text.trim();
}

// Extract plain text from MIME multipart content (enhanced version)
function extractPlainTextFromMime(rawBody) {
  if (!rawBody) return '';
  
  const parsed = parseMimeMessage(rawBody);
  
  // Prefer plain text, fall back to stripped HTML
  let body = parsed.text || extractPlainText(parsed.html) || '';
  
  return body;
}

// Decode quoted-printable encoding
// Decode quoted-printable encoding - returns a buffer for proper charset handling
function decodeQuotedPrintable(str) {
  // First remove soft line breaks
  let result = str.replace(/=\r?\n/g, '');
  
  // Decode =XX sequences into bytes
  const bytes = [];
  for (let i = 0; i < result.length; i++) {
    if (result[i] === '=' && i + 2 < result.length) {
      const hex = result.substring(i + 1, i + 3);
      try {
        bytes.push(parseInt(hex, 16));
        i += 2;
      } catch (e) {
        // Invalid hex, keep the original character
        bytes.push(result.charCodeAt(i));
      }
    } else {
      // For characters in ASCII range, use their byte value
      const code = result.charCodeAt(i);
      if (code < 256) {
        bytes.push(code);
      } else {
        // For non-ASCII, we would need UTF-8 encoding, but QP shouldn't normally have this
        bytes.push(63); // Replace with '?'
      }
    }
  }
  
  return Buffer.from(bytes);
}

function dbRun(sql, params = [], autoSave = true) {
  db.run(sql, params);
  if (autoSave) saveDatabase();
}

function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result;
  }
  stmt.free();
  return null;
}

function dbAll(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// --- OAUTH FLOW HANDLING ---
const OAUTH_PROVIDERS = {
  gmail: {
    clientId: process.env.VITE_GMAIL_CLIENT_ID || 'YOUR_GMAIL_CLIENT_ID',
    clientSecret: process.env.VITE_GMAIL_CLIENT_SECRET || 'YOUR_GMAIL_CLIENT_SECRET',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://mail.google.com/', 'email', 'profile'],
    imapHost: 'imap.gmail.com',
    imapPort: 993
  },
  outlook: {
    clientId: process.env.VITE_MICROSOFT_CLIENT_ID || 'YOUR_MICROSOFT_CLIENT_ID',
    clientSecret: process.env.VITE_MICROSOFT_CLIENT_SECRET || 'YOUR_MICROSOFT_CLIENT_SECRET',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['Mail.Read', 'Mail.Send', 'offline_access', 'openid', 'email', 'profile'],
    imapHost: 'outlook.office365.com',
    imapPort: 993
  },
  yahoo: {
    clientId: process.env.VITE_YAHOO_CLIENT_ID || 'YOUR_YAHOO_CLIENT_ID',
    clientSecret: process.env.VITE_YAHOO_CLIENT_SECRET || 'YOUR_YAHOO_CLIENT_SECRET',
    authUrl: 'https://api.login.yahoo.com/oauth2/request_auth',
    tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
    scopes: ['mail-r', 'mail-w', 'openid', 'email', 'profile'],
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993
  }
};

function startOAuthCallbackServer(onCallback) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      console.log('[OAuth Callback Server] Received request:', req.url);
      
      try {
        const parsedUrl = new URL(req.url, 'http://localhost:7357');
        const code = parsedUrl.searchParams.get('code');
        const state = parsedUrl.searchParams.get('state');
        const error = parsedUrl.searchParams.get('error');
        const errorDescription = parsedUrl.searchParams.get('error_description');

        console.log('[OAuth Callback] Code:', !!code, 'Error:', error);

        if (error) {
          const errorMsg = `${error}${errorDescription ? ': ' + errorDescription : ''}`;
          console.error('[OAuth Callback] Error received:', errorMsg);
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<html><body><h1>认证失败</h1><p>错误: ${errorMsg}</p></body></html>`);
          onCallback(null, errorMsg);
        } else if (code) {
          console.log('[OAuth Callback] Authorization code received');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<html><body><h1>✓ 成功！</h1><p>您已成功授权。请关闭此窗口。</p></body></html>`);
          onCallback(code, null);
        } else {
          console.error('[OAuth Callback] Missing authorization code');
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<html><body><h1>错误</h1><p>缺少授权代码</p></body></html>`);
          onCallback(null, '缺少授权代码');
        }
      } catch (e) {
        console.error('[OAuth Callback Server] Error parsing request:', e);
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<html><body><h1>服务器错误</h1><p>${e.message}</p></body></html>`);
      }

      // Clean up
      server.close(() => {
        console.log('[OAuth Callback Server] Server closed');
      });
      
      if (oauthWindow && !oauthWindow.isDestroyed()) {
        setTimeout(() => {
          try {
            oauthWindow.close();
          } catch (e) {
            console.error('[OAuth] Error closing window:', e);
          }
        }, 1000);
      }
    });

    server.on('error', (err) => {
      console.error('[OAuth Callback Server] Error:', err);
      reject(err);
    });

    server.listen(7357, 'localhost', () => {
      console.log('[OAuth Callback Server] Listening on http://localhost:7357');
      resolve(server);
    });

    // Handle server timeout
    server.timeout = 300000; // 5 minutes
  });
}

async function exchangeCodeForToken(providerId, code) {
  const provider = OAUTH_PROVIDERS[providerId];
  if (!provider) {
    console.error('[Token Exchange] Provider not found:', providerId);
    return null;
  }

  try {
    console.log('[Token Exchange] Exchanging code for token...');
    const https = require('https');
    return new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:7357/callback',
        client_id: provider.clientId,
        client_secret: provider.clientSecret
      }).toString();

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const url = new URL(provider.tokenUrl);
      const req = https.request(url, options, (res) => {
        let data = '';
        console.log('[Token Exchange] Response status:', res.statusCode);
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            console.log('[Token Exchange] Response received:', {
              hasAccessToken: !!result.access_token,
              hasRefreshToken: !!result.refresh_token,
              hasError: !!result.error
            });
            resolve(result);
          } catch (e) {
            console.error('[Token Exchange] JSON parse error:', e);
            reject(e);
          }
        });
      });

      req.on('error', (err) => {
        console.error('[Token Exchange] Request error:', err);
        reject(err);
      });
      
      req.write(postData);
      req.end();
    });
  } catch (err) {
    console.error('[Token Exchange] Error:', err);
    return null;
  }
}

async function refreshAccessToken(providerId, refreshToken) {
  const provider = OAUTH_PROVIDERS[providerId];
  if (!provider) return null;

  try {
    const https = require('https');
    return new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: provider.clientId,
        client_secret: provider.clientSecret
      }).toString();

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const url = new URL(provider.tokenUrl);
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.error) {
              reject(new Error(result.error_description || result.error));
            } else {
              resolve(result);
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    return null;
  }
}

// --- WINDOW MANAGEMENT ---
let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    // frame: false, // Use native frame for better performance and standard controls
    titleBarStyle: 'default', // Ensure standard title bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: path.join(__dirname, '../resources/icon.ico')
  });



  const startUrl = process.env.NODE_ENV === 'development' || !app.isPackaged
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  ipcMain.on('window:minimize', () => mainWindow.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow.close());
};

app.whenReady().then(async () => {
  await initDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  saveDatabase();
  if (process.platform !== 'darwin') app.quit();
});

// --- ACCOUNT MANAGEMENT ---

// 0. OAuth Login - Start OAuth flow
ipcMain.handle('oauth:login', async (_, providerId) => {
  console.log(`[OAuth] Login initiated for provider: ${providerId}`);
  
  const provider = OAUTH_PROVIDERS[providerId];
  if (!provider) {
    const error = `不支持的提供商: ${providerId}`;
    console.error('[OAuth]', error);
    return { success: false, error };
  }

  // Check if OAuth credentials are configured
  if (provider.clientId.includes('YOUR_') || provider.clientSecret.includes('YOUR_')) {
    const error = `未配置 ${providerId} OAuth 凭证。您已配置的凭证:\n- clientId: ${provider.clientId}\n- clientSecret: ${provider.clientSecret}\n\n请在 .env 文件中设置 VITE_${providerId.toUpperCase()}_CLIENT_ID 和 VITE_${providerId.toUpperCase()}_CLIENT_SECRET`;
    console.error('[OAuth] Credentials error:', error);
    return { success: false, error };
  }

  console.log(`[OAuth] Using clientId: ${provider.clientId.substring(0, 20)}...`);

  try {
    // Check if mainWindow exists
    if (!mainWindow || mainWindow.isDestroyed()) {
      throw new Error('Main window is not available');
    }

    // Start callback server
    console.log('[OAuth] Starting callback server on localhost:7357');
    oauthCallbackServer = await startOAuthCallbackServer((code, error) => {
      console.log('[OAuth Callback]', error ? `Error: ${error}` : `Received code: ${code?.substring(0, 20)}...`);
      if (error) {
        mainWindow.webContents.send('oauth:error', { error });
      } else if (code) {
        mainWindow.webContents.send('oauth:code-received', { code });
      }
    });
    console.log('[OAuth] Callback server started successfully');

    // Create OAuth window
    console.log('[OAuth] Creating OAuth authorization window');
    oauthWindow = new BrowserWindow({
      width: 500,
      height: 700,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });

    // Handle window closed
    oauthWindow.on('closed', () => {
      console.log('[OAuth] OAuth window closed');
      oauthWindow = null;
      if (oauthCallbackServer) {
        oauthCallbackServer.close();
        oauthCallbackServer = null;
      }
    });

    const state = Math.random().toString(36).substring(7);
    const scopes = provider.scopes.join(' ');
    
    const authUrl = `${provider.authUrl}?${new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: 'http://localhost:7357/callback',
      response_type: 'code',
      scope: scopes,
      state,
      access_type: 'offline',
      prompt: 'consent'
    }).toString()}`;

    console.log('[OAuth] Loading authorization URL');
    await oauthWindow.loadURL(authUrl);
    oauthWindow.show();
    
    console.log('[OAuth] Authorization window opened successfully');
    return { success: true, message: '已打开认证窗口' };
  } catch (err) {
    console.error('[OAuth] Login error:', err);
    if (oauthWindow && !oauthWindow.isDestroyed()) {
      oauthWindow.close();
    }
    if (oauthCallbackServer) {
      oauthCallbackServer.close();
      oauthCallbackServer = null;
    }
    return { success: false, error: err.message };
  }
});

// Exchange code for token
ipcMain.handle('oauth:exchange-code', async (_, { providerId, code }) => {
  console.log(`[OAuth Exchange] Exchanging code for provider: ${providerId}`);
  
  try {
    const token = await exchangeCodeForToken(providerId, code);
    
    if (!token) {
      const error = 'Token exchange failed: No response from server';
      console.error('[OAuth Exchange]', error);
      return { success: false, error };
    }
    
    if (token.error) {
      const errorMsg = `${token.error}${token.error_description ? ': ' + token.error_description : ''}`;
      console.error('[OAuth Exchange] OAuth error:', errorMsg);
      return { success: false, error: errorMsg };
    }
    
    console.log('[OAuth Exchange] Token received successfully');
    return { success: true, token };
  } catch (err) {
    console.error('[OAuth Exchange] Exception:', err);
    return { success: false, error: err.message };
  }
});

// 1. Add Account
ipcMain.handle('account:add', async (_, details) => {
  const { email, password, provider: providedProvider, displayName, customConfig, oauthToken, profileId } = details;

  // Detect provider if not provided
  const provider = providedProvider || detectProvider(email);
  const config = customConfig || PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.gmail;

  // 1. Verify Credentials (skip for OAuth)
  if (!oauthToken) {
    try {
      const connectionConfig = {
        imap: {
          user: email,
          password: password,
          host: config.imapHost,
          port: config.imapPort,
          tls: config.secure,
          authTimeout: 10000
        }
      };

      const connection = await imaps.connect(connectionConfig);
      await connection.end();
    } catch (err) {
      console.error('Credential verification failed:', err);
      
      // Provide more detailed error messages
      const errorMsg = err.message || err.toString();
      let friendlyError = 'Authentication failed: Check your email and password';
      
      if (errorMsg.includes('Invalid credentials') || errorMsg.includes('invalid user')) {
        friendlyError = 'Invalid email or password';
      } else if (errorMsg.includes('AUTHENTICATE failed') || errorMsg.includes('login disabled')) {
        friendlyError = 'Authentication failed. Try using an App Password instead of your regular password.';
      } else if (errorMsg.includes('timeout')) {
        friendlyError = 'Connection timeout. Check your network or try a different port.';
      } else if (errorMsg.includes('certificate')) {
        friendlyError = 'SSL/TLS certificate verification failed.';
      }
      
      return { success: false, error: friendlyError };
    }
  }

  // Encrypt password using Windows DPAPI (or store OAuth token)
  let encryptedPassword = password;
  let encryptedOAuthToken = null;
  
  if (oauthToken) {
    // Store OAuth token securely
    if (safeStorage.isEncryptionAvailable()) {
      const tokenString = JSON.stringify(oauthToken);
      encryptedOAuthToken = safeStorage.encryptString(tokenString).toString('base64');
    }
  } else if (safeStorage.isEncryptionAvailable()) {
    encryptedPassword = safeStorage.encryptString(password).toString('base64');
  }

  const id = Date.now().toString();
  const name = displayName || email.split('@')[0];
  const now = new Date().toISOString();

  try {
    // Check if account exists (globally unique email for now)
    const existing = dbGet('SELECT * FROM accounts WHERE email = ?', [email]);
    if (existing) {
      // If account exists but profileId is different (e.g. after DB clear/restore or user switch),
      // update the profileId to claim the account for the current user.
      if (existing.profileId !== profileId) {
        console.log(`[account:add] Updating profileId for ${email} from ${existing.profileId} to ${profileId}`);
        dbRun('UPDATE accounts SET profileId = ? WHERE id = ?', [profileId, existing.id]);
        
        // Return the existing account with updated profileId
        return {
          success: true,
          account: {
            id: existing.id,
            email: existing.email,
            displayName: existing.displayName,
            provider: existing.provider,
            status: existing.status,
            lastSync: existing.lastSync
          }
        };
      }
      
      return { success: false, error: 'This account is already added' };
    }

    dbRun(
      `INSERT INTO accounts (id, profileId, email, displayName, provider, encryptedPassword, encryptedOAuthToken, imapHost, imapPort, smtpHost, smtpPort, secure, status, lastSync, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, profileId, email, name, provider, encryptedPassword, encryptedOAuthToken,
        config.imapHost, config.imapPort, config.smtpHost, config.smtpPort,
        config.secure ? 1 : 0, 'active', now, now]
    );
    saveDatabase();

    return {
      success: true,
      account: {
        id,
        email,
        displayName: name,
        provider,
        status: 'active',
        lastSync: now
      }
    };
  } catch (err) {
    console.error('Add account error:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMessage || 'Database error occurred' };
  }
});

// 2. List Accounts
ipcMain.handle('account:list', (_, profileId) => {
  console.log('[account:list] Requesting accounts for profileId:', profileId);
  let sql = 'SELECT id, email, displayName, provider, status, lastSync FROM accounts';
  let params = [];
  
  if (profileId) {
    sql += ' WHERE profileId = ?';
    params.push(profileId);
  }
  
  sql += ' ORDER BY createdAt DESC';

  const accounts = dbAll(sql, params);
  return accounts.map(acc => ({
    id: acc.id,
    email: acc.email,
    displayName: acc.displayName || acc.email.split('@')[0],
    provider: acc.provider,
    status: acc.status || 'active',
    lastSync: acc.lastSync || 'Never'
  }));
});

// 3. Delete Account
ipcMain.handle('account:delete', async (_, accountId) => {
  try {
    // Get account details first to clear sensitive data
    const account = dbGet('SELECT * FROM accounts WHERE id = ?', [accountId]);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    // Delete associated emails
    dbRun('DELETE FROM emails WHERE accountId = ?', [accountId]);
    
    // Delete account (password will be securely cleared by database)
    dbRun('DELETE FROM accounts WHERE id = ?', [accountId]);
    saveDatabase();
    
    console.log(`Account deleted: ${account.email}`);
    return { success: true };
  } catch (err) {
    console.error('Delete account error:', err);
    return { success: false, error: err.message };
  }
});

// 4. Update Account
ipcMain.handle('account:update', async (_, accountId, updates) => {
  try {
    const account = dbGet('SELECT * FROM accounts WHERE id = ?', [accountId]);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    const { displayName, status, password } = updates;
    
    // Update display name
    if (displayName) {
      dbRun('UPDATE accounts SET displayName = ? WHERE id = ?', [displayName, accountId]);
    }
    
    // Update status (active, error, syncing)
    if (status) {
      dbRun('UPDATE accounts SET status = ? WHERE id = ?', [status, accountId]);
    }
    
    // Update password with encryption
    if (password) {
      try {
        let encryptedPassword = password;
        if (safeStorage.isEncryptionAvailable()) {
          encryptedPassword = safeStorage.encryptString(password).toString('base64');
        }
        dbRun('UPDATE accounts SET encryptedPassword = ? WHERE id = ?', [encryptedPassword, accountId]);
        console.log('Password updated for account:', account.email);
      } catch (err) {
        console.error('Password update error:', err);
        return { success: false, error: 'Failed to update password' };
      }
    }
    saveDatabase();
    
    return { success: true };
  } catch (err) {
    console.error('Update account error:', err);
    return { success: false, error: err.message };
  }
});

// 5. Sync Emails (Real Implementation)
ipcMain.handle('email:sync', async (_, accountId) => {
  try {
    console.log('[email:sync] Starting sync for account:', accountId);
    const account = dbGet('SELECT * FROM accounts WHERE id = ?', [accountId]);
    if (!account) throw new Error('Account not found');

    console.log('[email:sync] Account found:', account.email, account.provider);

    // Update status to syncing
    dbRun('UPDATE accounts SET status = ? WHERE id = ?', ['syncing', accountId]);

    let config;
    
    // Check if this is an OAuth account
    if (account.encryptedOAuthToken) {
      console.log('[email:sync] Using OAuth authentication');
      // OAuth authentication
      let oauthToken;
      try {
        if (safeStorage.isEncryptionAvailable()) {
          const buffer = Buffer.from(account.encryptedOAuthToken, 'base64');
          const tokenString = safeStorage.decryptString(buffer);
          oauthToken = JSON.parse(tokenString);
          console.log('[email:sync] OAuth token decrypted successfully');
        } else {
          oauthToken = JSON.parse(account.encryptedOAuthToken);
          console.log('[email:sync] OAuth token parsed without encryption');
        }
      } catch (e) {
        console.error('OAuth token decryption failed:', e);
        throw new Error('Failed to decrypt OAuth token: ' + e.message);
      }

      // Use XOAUTH2 authentication for Gmail OAuth
      if ((account.provider === 'gmail' || account.provider === 'outlook' || account.provider === 'yahoo') && oauthToken.access_token) {
        // Construct the XOAUTH2 string: user={email}^Aauth=Bearer {token}^A^A
        const authData = `user=${account.email}\x01auth=Bearer ${oauthToken.access_token}\x01\x01`;
        const xoauth2 = Buffer.from(authData).toString('base64');
        
        console.log('[email:sync] Access token (first 20 chars):', oauthToken.access_token.substring(0, 20) + '...');
        console.log('[email:sync] Token expires_in:', oauthToken.expires_in);
        
        config = {
          imap: {
            user: account.email,
            xoauth2: xoauth2,
            host: account.imapHost,
            port: account.imapPort,
            tls: account.secure === 1,
            authTimeout: 30000, // Increased timeout further
            connTimeout: 30000,
            tlsOptions: { rejectUnauthorized: false }
          }
        };
        console.log('[email:sync] XOAUTH2 config created for', account.provider);
      } else if (account.provider === 'icloud') {
        throw new Error('iCloud currently does not support OAuth IMAP. Please use app-specific password.');
      } else {
        throw new Error(`OAuth provider ${account.provider} not fully supported for IMAP`);
      }
    } else {
      console.log('[email:sync] Using password authentication');
      // Password authentication
      let password = account.encryptedPassword;
      if (safeStorage.isEncryptionAvailable()) {
        try {
          const buffer = Buffer.from(account.encryptedPassword, 'base64');
          password = safeStorage.decryptString(buffer);
          console.log('[email:sync] Password decrypted successfully');
        } catch (e) {
          console.error('Password decryption failed:', e);
          throw new Error('Failed to decrypt password');
        }
      }

      config = {
        imap: {
          user: account.email,
          password: password,
          host: account.imapHost,
          port: account.imapPort,
          tls: account.secure === 1,
          authTimeout: 3000
        }
      };
    }

    console.log('[email:sync] Connecting to IMAP server:', account.imapHost);
    let connection;
    
    const connectAndSync = async (currentConfig, isRetry = false) => {
      try {
        connection = await imaps.connect(currentConfig);
        console.log('[email:sync] Connected to IMAP server');
      } catch (connectErr) {
        console.error('[email:sync] IMAP connection error:', connectErr.message);
        
        // Token Refresh Logic
        if (!isRetry && account.encryptedOAuthToken && (connectErr.message.includes('AUTHENTICATE') || connectErr.message.includes('authentication') || connectErr.message.includes('credentials'))) {
           console.log('[email:sync] Authentication failed, trying to refresh token...');
           try {
             let oauthToken;
             if (safeStorage.isEncryptionAvailable()) {
                const buffer = Buffer.from(account.encryptedOAuthToken, 'base64');
                oauthToken = JSON.parse(safeStorage.decryptString(buffer));
             } else {
                oauthToken = JSON.parse(account.encryptedOAuthToken);
             }

             if (oauthToken.refresh_token) {
               const newTokens = await refreshAccessToken(account.provider, oauthToken.refresh_token);
               if (newTokens && newTokens.access_token) {
                 console.log('[email:sync] Token refreshed successfully');
                 
                 // Merge new tokens (keep refresh token if not returned)
                 const updatedTokens = { ...oauthToken, ...newTokens };
                 if (!newTokens.refresh_token) updatedTokens.refresh_token = oauthToken.refresh_token;

                 // Update DB
                 let encryptedTokens;
                 const tokenString = JSON.stringify(updatedTokens);
                 if (safeStorage.isEncryptionAvailable()) {
                   encryptedTokens = safeStorage.encryptString(tokenString).toString('base64');
                 } else {
                   encryptedTokens = tokenString;
                 }
                 dbRun('UPDATE accounts SET encryptedOAuthToken = ? WHERE id = ?', [encryptedTokens, accountId]);

                 // Update Config
                 const authData = `user=${account.email}\x01auth=Bearer ${updatedTokens.access_token}\x01\x01`;
                 const xoauth2 = Buffer.from(authData).toString('base64');
                 currentConfig.imap.xoauth2 = xoauth2;
                 
                 // Retry
                 return connectAndSync(currentConfig, true);
               }
             }
           } catch (refreshErr) {
             console.error('[email:sync] Token refresh failed:', refreshErr);
           }
        }

        if (connectErr.message.includes('AUTHENTICATE') || connectErr.message.includes('authentication')) {
          throw new Error('Authentication failed. Please check your credentials or use an app-specific password.');
        }
        throw connectErr;
      }
      return connection;
    };

    connection = await connectAndSync(config);
    
    try {
      await connection.openBox('INBOX', false);
      console.log('[email:sync] INBOX opened');

      // Only fetch recent emails (last 7 days) for faster sync
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      // 确保日期格式正确
      const year = oneWeekAgo.getFullYear();
      const month = String(oneWeekAgo.getMonth() + 1).padStart(2, '0');
      const day = String(oneWeekAgo.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      console.log('[email:sync] Searching for emails since', dateStr);
      
      const searchCriteria = [['SINCE', oneWeekAgo]];
      // Fetch HEADER for metadata and '' (Full Body) for content/attachments
      // We avoid 'TEXT' because it strips MIME headers needed for correct charset decoding
      const fetchOptions = {
        bodies: ['HEADER', ''],
        struct: true,
        markSeen: false
      };

      console.log('[email:sync] Searching for emails...');
      
      // 添加搜索超时保护
      let messages = [];
      try {
        const searchPromise = connection.search(searchCriteria, fetchOptions);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Search timeout after 30s')), 30000)
        );
        
        messages = await Promise.race([searchPromise, timeoutPromise]);
      } catch (searchErr) {
        console.error('[email:sync] Search error:', searchErr.message);
        
        // 如果搜索失败，返回错误而不是崩溃
        throw new Error(`Failed to search emails: ${searchErr.message}`);
      }
      
      console.log('[email:sync] Found', messages.length, 'emails');
      
      const recentMessages = messages.slice(-50).reverse();
      console.log('[email:sync] Processing', recentMessages.length, 'recent emails');

      let syncedCount = 0;
      for (const item of recentMessages) {
        try {
          const header = item.parts.find(part => part.which === 'HEADER');
          const fullBody = item.parts.find(part => part.which === '');

          if (!header) {
            console.warn('[email:sync] Skipping email with no header');
            continue;
          }

          // Decode MIME encoded subject
          let subject = header.body.subject?.[0] || '(No Subject)';
          subject = decodeMimeHeader(subject);
          
          // Parse sender
          let from = header.body.from?.[0] || 'Unknown';
          from = decodeMimeHeader(from);
          
          // Extract sender name and email
          let senderName = from;
          let senderEmail = from;
          const emailMatch = from.match(/<([^>]+)>/);
          if (emailMatch) {
            senderEmail = emailMatch[1];
            senderName = from.replace(/<[^>]+>/, '').trim().replace(/^"|"$/g, '');
          }
          
          const dateHeader = header.body.date?.[0];
          const date = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();
          
          // Get body content - Prefer fullBody to ensure we have MIME headers
          let rawBody = fullBody ? fullBody.body : '';
          
          // 关键修复：检测并恢复可能被错误编码的 UTF-8
          // imap-simple 可能将 UTF-8 字节解释为 Latin-1 字符
          if (rawBody && typeof rawBody === 'string') {
            // 特征：连续的高字节组合，看起来像 UTF-8 序列被错误解释
            const hasHighBytes = /[\u00C0-\u00FF][\u0080-\u00BF]/.test(rawBody);
            
            if (hasHighBytes) {
              try {
                // 尝试恢复：Latin-1 → UTF-8
                const recoveredBody = Buffer.from(rawBody, 'latin1').toString('utf8');
                
                // 检查恢复是否有效（无替代字符，长度合理）
                if (!recoveredBody.includes('\ufffd') && recoveredBody.length < rawBody.length * 2) {
                  rawBody = recoveredBody;
                  console.log(`[email:sync] Auto-recovered UTF-8 encoding from IMAP data`);
                }
              } catch (e) {
                console.warn(`[email:sync] UTF-8 recovery failed: ${e.message}`);
              }
            }
          }
          
          console.log(`[email:sync] Raw body length: ${rawBody.length}, type: ${typeof rawBody}, first 50 chars: ${rawBody.substring(0, 50).replace(/\n/g, '\\n')}`);
          
          // Process body (HTML or Text->HTML)
          const processed = processEmailBody(rawBody);
          const body = processed.body;  // 提取实际的 body 字符串
          const attachments = processed.attachments;
          
          console.log(`[email:sync] Processed body length: ${body.length}, first 50 chars: ${body.substring(0, 50).replace(/\n/g, '\\n')}`);

          const uid = item.attributes.uid.toString();
          const id = `${accountId}-${uid}`;

          // Generate preview from plain text
          const previewText = extractPlainText(body);
          const preview = previewText.substring(0, 150).replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim() + '...';

          const existing = dbGet('SELECT id FROM emails WHERE id = ?', [id]);

          if (!existing) {
            dbRun(
              `INSERT INTO emails (id, accountId, folderId, senderName, senderEmail, subject, preview, body, timestamp, isRead, isStarred)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [id, accountId, 'inbox', senderName, senderEmail, subject, preview, body, date, 0, 0]
            );
            syncedCount++;
          }
        } catch (itemErr) {
          console.error('[email:sync] Error processing email:', itemErr.message);
          continue; // Skip this email and continue with next
        }
      }

      connection.end();
      console.log('[email:sync] Synced', syncedCount, 'new emails');

      const now = new Date().toISOString();
      dbRun('UPDATE accounts SET lastSync = ?, status = ? WHERE id = ?', [now, 'active', accountId]);
      saveDatabase();

      return { success: true, message: `Synced ${syncedCount} new emails`, lastSync: now };
    } finally {
      // 安全关闭连接
      if (connection) {
        try {
          console.log('[email:sync] Closing connection...');
          
          // 移除所有监听器防止内存泄漏
          if (typeof connection.removeAllListeners === 'function') {
            connection.removeAllListeners();
          }
          
          // 创建关闭Promise，带超时机制
          const closeConnectionSafely = () => {
            return new Promise((resolve) => {
              const closeTimeout = setTimeout(() => {
                console.warn('[email:sync] Connection close timeout, resolving...');
                resolve();
              }, 3000); // 3秒超时
              
              try {
                // 监听连接关闭事件
                if (typeof connection.once === 'function') {
                  connection.once('end', () => {
                    clearTimeout(closeTimeout);
                    console.log('[email:sync] Connection closed successfully');
                    resolve();
                  });
                  
                  connection.once('error', (err) => {
                    clearTimeout(closeTimeout);
                    console.warn('[email:sync] Connection error during close (ignored):', err.message);
                    resolve();
                  });
                }
                
                // 执行关闭
                if (typeof connection.end === 'function') {
                  connection.end();
                }
              } catch (err) {
                clearTimeout(closeTimeout);
                console.warn('[email:sync] Error during close attempt:', err.message);
                resolve();
              }
            });
          };
          
          await closeConnectionSafely();
        } catch (err) {
          console.error('[email:sync] Unexpected error in finally block:', err.message);
          // 继续执行，不抛出
        }
      }
    }
  } catch (err) {
    console.error('[email:sync] Sync error:', err);
    
    // 尝试关闭连接
    try {
      if (connection && typeof connection.end === 'function') {
        connection.end();
      }
    } catch (e) {
      // 忽略连接关闭错误
    }
    
    // Update status to error
    dbRun('UPDATE accounts SET status = ? WHERE id = ?', ['error', accountId]);
    saveDatabase();
    
    let errorMsg = 'Sync failed: ' + err.message;
    if (err.message && err.message.includes('AUTHENTICATE')) {
      errorMsg = 'Authentication failed - check your password or use app-specific password';
    } else if (err.message && err.message.includes('timeout')) {
      errorMsg = 'Connection timeout - check your network connection';
    } else if (err.message && err.message.includes('certificate')) {
      errorMsg = 'SSL/TLS certificate verification failed';
    }
    
    return { success: false, error: errorMsg };
  }
});

// 6. Get Emails
ipcMain.handle('email:list', (_, folderId, accountId = null, profileId = null) => {
  let sql = 'SELECT * FROM emails WHERE folderId = ?';
  let params = [folderId];

  if (accountId) {
    sql += ' AND accountId = ?';
    params.push(accountId);
  } else if (profileId) {
    sql += ' AND accountId IN (SELECT id FROM accounts WHERE profileId = ?)';
    params.push(profileId);
  }

  sql += ' ORDER BY timestamp DESC';

  const emails = dbAll(sql, params);
  console.log(`[email:list] Found ${emails.length} emails for folder: ${folderId}, account: ${accountId || 'all'}, profile: ${profileId || 'any'}`);
  
  return emails.map(e => {
    // 应用编码修复：某些邮件的 body 可能已经被错误编码
    // 尝试从 Latin-1 恢复到 UTF-8
    let body = e.body;
    
    try {
      // 检测是否看起来像被错误编码的 UTF-8（UTF-8 as Latin-1）
      // 特征：包含高于 127 的字节序列
      if (body && typeof body === 'string') {
        // 尝试恢复：Latin-1 字符串 → 缓冲区 → UTF-8
        const suspiciousChars = /[\u00C0-\u00FF][\u0080-\u00BF]/.test(body);
        
        if (suspiciousChars) {
          // 可能是 UTF-8 被解释为 Latin-1
          try {
            const buffer = Buffer.from(body, 'latin1');
            const recovered = buffer.toString('utf8');
            
            // 检查恢复后是否看起来更合理
            if (recovered.length < body.length * 2 && !recovered.includes('\ufffd')) {
              body = recovered;
              console.log(`[email:list] Auto-recovered UTF-8 encoding for email: ${e.id}`);
            }
          } catch (e) {
            // 恢复失败，保持原样
          }
        }
      }
    } catch (e) {
      console.error('[email:list] Error processing body encoding:', e.message);
    }
    
    return {
      id: e.id,
      accountId: e.accountId,
      folderId: e.folderId,
      senderName: e.senderName,
      senderEmail: e.senderEmail,
      subject: e.subject,
      preview: e.preview,
      body: body,
      timestamp: e.timestamp,
      read: !!e.isRead,
      starred: !!e.isStarred,
      avatarColor: 'bg-slate-600'
    };
  });
});

// 7. Send Email (Real Implementation)
ipcMain.handle('email:send', async (_, emailData) => {
  const { to, subject, body, accountId } = emailData;

  try {
    let account;
    if (accountId) {
      account = dbGet('SELECT * FROM accounts WHERE id = ?', [accountId]);
    } else {
      const accounts = dbAll('SELECT * FROM accounts');
      if (accounts.length > 0) account = accounts[0];
    }

    if (!account) throw new Error('No account configured');

    let password = account.encryptedPassword;
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(account.encryptedPassword, 'base64');
        password = safeStorage.decryptString(buffer);
      } catch (e) {
        password = account.encryptedPassword;
      }
    }

    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpPort === 465,
      auth: {
        user: account.email,
        pass: password,
      },
    });

    const info = await transporter.sendMail({
      from: `"${account.displayName}" <${account.email}>`,
      to: to,
      subject: subject,
      text: body,
    });

    const id = Date.now().toString();
    const now = new Date().toISOString();
    dbRun(
      `INSERT INTO emails (id, accountId, folderId, senderName, senderEmail, subject, preview, body, timestamp, isRead, isStarred)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account.id, 'sent', 'Me', account.email, subject, body.substring(0, 100), body, now, 1, 0]
    );
    saveDatabase();

    return { success: true, message: 'Email sent successfully', messageId: info.messageId };
  } catch (err) {
    console.error('Send email error:', err);
    return { success: false, error: err.message };
  }
});

// 8. AI Summarize
ipcMain.handle('ai:summarize', async (_, content) => {
  return "AI summarization requires API key configuration.";
});

// --- IMAP FOLDER MAPPING ---
const IMAP_FOLDER_MAPPING = {
  gmail: {
    inbox: 'INBOX',
    sent: '[Gmail]/Sent Mail',
    drafts: '[Gmail]/Drafts',
    trash: '[Gmail]/Trash',
    spam: '[Gmail]/Spam',
    archive: '[Gmail]/All Mail'
  },
  outlook: {
    inbox: 'INBOX',
    sent: 'Sent',
    drafts: 'Drafts',
    trash: 'Deleted',
    spam: 'Junk',
    archive: 'Archive'
  },
  yahoo: {
    inbox: 'INBOX',
    sent: 'Sent',
    drafts: 'Draft',
    trash: 'Trash',
    spam: 'Bulk Mail',
    archive: 'Archive'
  },
  default: {
    inbox: 'INBOX',
    sent: 'Sent',
    drafts: 'Drafts',
    trash: 'Trash',
    spam: 'Spam',
    archive: 'Archive'
  }
};

function getImapFolder(provider, folderId) {
  const mapping = IMAP_FOLDER_MAPPING[provider] || IMAP_FOLDER_MAPPING.default;
  return mapping[folderId] || folderId.toUpperCase();
}

// Helper: Create IMAP connection for an account
async function createImapConnection(account) {
  let config;
  
  if (account.encryptedOAuthToken) {
    let oauthToken;
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(account.encryptedOAuthToken, 'base64');
      oauthToken = JSON.parse(safeStorage.decryptString(buffer));
    } else {
      oauthToken = JSON.parse(account.encryptedOAuthToken);
    }
    
    const authData = `user=${account.email}\x01auth=Bearer ${oauthToken.access_token}\x01\x01`;
    const xoauth2 = Buffer.from(authData).toString('base64');
    
    config = {
      imap: {
        user: account.email,
        xoauth2: xoauth2,
        host: account.imapHost,
        port: account.imapPort,
        tls: account.secure === 1,
        authTimeout: 30000,
        connTimeout: 30000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };
  } else {
    let password = account.encryptedPassword;
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(account.encryptedPassword, 'base64');
      password = safeStorage.decryptString(buffer);
    }
    
    config = {
      imap: {
        user: account.email,
        password: password,
        host: account.imapHost,
        port: account.imapPort,
        tls: account.secure === 1,
        authTimeout: 30000,
        connTimeout: 30000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };
  }
  
  return await imaps.connect(config);
}

// Send sync progress to renderer
function sendSyncProgress(event, data) {
  try {
    if (event && event.sender && !event.sender.isDestroyed()) {
      event.sender.send('sync:progress', data);
    }
  } catch (e) {
    console.error('[sendSyncProgress] Error:', e.message);
  }
}

// 9. Sync All Folders - Enhanced with progress and all emails
ipcMain.handle('email:sync-all', async (event, accountId) => {
  console.log('[email:sync-all] Starting full sync for account:', accountId);
  
  const account = dbGet('SELECT * FROM accounts WHERE id = ?', [accountId]);
  if (!account) {
    return { success: false, error: 'Account not found' };
  }
  
  const foldersToSync = ['inbox', 'sent', 'drafts', 'trash', 'spam'];
  const results = {};
  let totalSynced = 0;
  let totalEmails = 0;
  
  try {
    dbRun('UPDATE accounts SET status = ? WHERE id = ?', ['syncing', accountId]);
    
    sendSyncProgress(event, { 
      type: 'start', 
      accountId, 
      message: `Connecting to ${account.email}...` 
    });
    
    const connection = await createImapConnection(account);
    
    // First pass: count total emails across all folders
    for (const folderId of foldersToSync) {
      try {
        const imapFolder = getImapFolder(account.provider, folderId);
        await connection.openBox(imapFolder, true); // Read-only for counting
        
        const searchCriteria = ['ALL'];
        const messages = await connection.search(searchCriteria, { bodies: [] });
        totalEmails += messages.length;
        
        sendSyncProgress(event, {
          type: 'folder-count',
          folderId,
          count: messages.length,
          totalEmails
        });
      } catch (e) {
        console.log(`[email:sync-all] Could not count folder ${folderId}:`, e.message);
      }
    }
    
    sendSyncProgress(event, {
      type: 'count-complete',
      totalEmails,
      message: `Found ${totalEmails} emails to sync`
    });
    
    let processedEmails = 0;
    
    // Second pass: sync all emails
    for (const folderId of foldersToSync) {
      try {
        const imapFolder = getImapFolder(account.provider, folderId);
        console.log(`[email:sync-all] Syncing folder: ${folderId} -> ${imapFolder}`);
        
        sendSyncProgress(event, {
          type: 'folder-start',
          folderId,
          imapFolder,
          message: `Syncing ${folderId}...`
        });
        
        await connection.openBox(imapFolder, false);
        
        // 1. Fetch UIDs only (fast)
        const searchCriteria = ['ALL'];
        const uidFetchOptions = {
          bodies: ['HEADER.FIELDS (DATE)'], // Minimal fetch
          struct: true,
          markSeen: false
        };
        
        const allMessages = await connection.search(searchCriteria, uidFetchOptions);
        
        // 2. Filter new UIDs (Optimized)
        // Fetch all existing IDs for this folder in one query to avoid N+1 DB calls
        const existingRows = dbAll('SELECT id FROM emails WHERE accountId = ? AND folderId = ?', [accountId, folderId]);
        const existingIds = new Set(existingRows.map(row => row.id));
        
        const newUids = [];
        for (const item of allMessages) {
            const uid = item.attributes.uid.toString();
            const id = `${accountId}-${folderId}-${uid}`;
            if (!existingIds.has(id)) {
                newUids.push(item.attributes.uid);
            }
        }
        
        console.log(`[email:sync-all] Folder ${folderId}: Found ${allMessages.length} total, ${newUids.length} new`);

        let folderSynced = 0;
        
        // 3. Fetch new messages in batches
        if (newUids.length > 0) {
            const batchSize = 50; // Increased batch size for better throughput
            const attachmentsDir = path.join(app.getPath('userData'), 'attachments');
            if (!fs.existsSync(attachmentsDir)) {
                fs.mkdirSync(attachmentsDir, { recursive: true });
            }

            for (let i = 0; i < newUids.length; i += batchSize) {
                const batch = newUids.slice(i, i + batchSize);
                
                const messages = await connection.search([['UID', batch]], {
                    bodies: ['HEADER', ''],
                    struct: true,
                    markSeen: false
                });

                for (const item of messages) {
                  try {
            const header = item.parts.find(part => part.which === 'HEADER');
            const fullBody = item.parts.find(part => part.which === '');
            
            if (!header) continue;
            
            let subject = decodeMimeHeader(header.body.subject?.[0] || '(No Subject)');
            let from = decodeMimeHeader(header.body.from?.[0] || 'Unknown');
            
            let senderName = from;
            let senderEmail = from;
            const emailMatch = from.match(/<([^>]+)>/);
            if (emailMatch) {
              senderEmail = emailMatch[1];
              senderName = from.replace(/<[^>]+>/, '').trim().replace(/^"|"$/g, '');
            }
            
            const dateHeader = header.body.date?.[0];
            const date = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();
            
            // Prefer fullBody to ensure we have MIME headers for correct charset decoding
            let rawBody = fullBody ? fullBody.body : '';
            
            // Process body (HTML or Text->HTML) and attachments
            const processed = processEmailBody(rawBody);
            const body = processed.body;
            const attachments = processed.attachments;
            
            const uid = item.attributes.uid.toString();
            const id = `${accountId}-${folderId}-${uid}`;
            
            // Save attachments to disk
            const savedAttachments = [];
            if (attachments && attachments.length > 0) {
                const emailAttachmentsDir = path.join(attachmentsDir, id);
                if (!fs.existsSync(emailAttachmentsDir)) {
                    fs.mkdirSync(emailAttachmentsDir, { recursive: true });
                }
                
                for (const att of attachments) {
                    const safeFilename = att.filename.replace(/[^a-z0-9.]/gi, '_');
                    const filePath = path.join(emailAttachmentsDir, safeFilename);
                    fs.writeFileSync(filePath, att.content);
                    savedAttachments.push({
                        filename: att.filename,
                        contentType: att.contentType,
                        size: att.size,
                        path: filePath
                    });
                }
            }
            const attachmentsJson = JSON.stringify(savedAttachments);

            // Generate preview from plain text
            const previewText = extractPlainText(body);
            const preview = previewText.substring(0, 150).replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim() + '...';
            
            // Check flags
            const flags = item.attributes.flags || [];
            const isRead = flags.includes('\\Seen') ? 1 : 0;
            const isStarred = flags.includes('\\Flagged') ? 1 : 0;
            
            dbRun(
              `INSERT OR REPLACE INTO emails (id, accountId, folderId, senderName, senderEmail, subject, preview, body, attachments, timestamp, isRead, isStarred)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [id, accountId, folderId, senderName, senderEmail, subject, preview, body, attachmentsJson, date, isRead, isStarred],
              false // Don't save to disk yet
            );
            
            folderSynced++;
            totalSynced++;
            processedEmails++;
            
            // Throttle progress updates (every 10 emails) to avoid IPC overload
            if (processedEmails % 10 === 0 || processedEmails === totalEmails) {
              sendSyncProgress(event, {
                type: 'email-synced',
                folderId,
                emailId: id,
                subject: subject.substring(0, 50),
                senderName,
                senderEmail,
                timestamp: date,
                isNew: true,
                processed: processedEmails,
                total: totalEmails,
                folderSynced,
                totalSynced,
                email: {
                  id,
                  accountId,
                  folderId,
                  senderName,
                  senderEmail,
                  subject,
                  preview,
                  body,
                  attachments: savedAttachments,
                  timestamp: date,
                  read: !!isRead,
                  starred: !!isStarred,
                  avatarColor: 'bg-slate-600',
                  isNew: true
                }
              });
            }
            
          } catch (itemErr) {
            console.error(`[email:sync-all] Error processing email in ${folderId}:`, itemErr.message);
            processedEmails++;
          }
        }
        // Save database after each batch
        saveDatabase();
      }
    } else {
        processedEmails += allMessages.length;
      }
        
        results[folderId] = { success: true, synced: folderSynced, total: allMessages.length };
        console.log(`[email:sync-all] Folder ${folderId}: synced ${folderSynced} new emails out of ${allMessages.length}`);
        
        sendSyncProgress(event, {
          type: 'folder-complete',
          folderId,
          synced: folderSynced,
          total: allMessages.length
        });
        
      } catch (folderErr) {
        console.error(`[email:sync-all] Error syncing folder ${folderId}:`, folderErr.message);
        results[folderId] = { success: false, error: folderErr.message };
        
        sendSyncProgress(event, {
          type: 'folder-error',
          folderId,
          error: folderErr.message
        });
      }
    }
    
    connection.end();
    
    const now = new Date().toISOString();
    dbRun('UPDATE accounts SET lastSync = ?, status = ? WHERE id = ?', [now, 'active', accountId]);
    saveDatabase();
    
    sendSyncProgress(event, {
      type: 'complete',
      totalSynced,
      totalEmails,
      results,
      message: `Sync complete: ${totalSynced} new emails`
    });
    
    return { success: true, results, lastSync: now, totalSynced, totalEmails };
  } catch (err) {
    console.error('[email:sync-all] Error:', err);
    dbRun('UPDATE accounts SET status = ? WHERE id = ?', ['error', accountId]);
    saveDatabase();
    
    sendSyncProgress(event, {
      type: 'error',
      error: err.message
    });
    
    return { success: false, error: err.message };
  }
});

// 10. Mark Email as Read/Unread
ipcMain.handle('email:mark-read', async (_, emailId, isRead) => {
  console.log('[email:mark-read]', emailId, isRead);
  
  try {
    const email = dbGet('SELECT * FROM emails WHERE id = ?', [emailId]);
    if (!email) {
      return { success: false, error: 'Email not found' };
    }
    
    const account = dbGet('SELECT * FROM accounts WHERE id = ?', [email.accountId]);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }
    
    // Extract UID from email ID (format: accountId-folderId-uid or accountId-uid)
    const parts = emailId.split('-');
    const uid = parts[parts.length - 1];
    const folderId = parts.length > 2 ? parts[parts.length - 2] : email.folderId;
    
    // Update on IMAP server
    const connection = await createImapConnection(account);
    const imapFolder = getImapFolder(account.provider, folderId);
    
    await connection.openBox(imapFolder, false);
    
    if (isRead) {
      await connection.addFlags(uid, ['\\Seen']);
    } else {
      await connection.delFlags(uid, ['\\Seen']);
    }
    
    connection.end();
    
    // Update local database
    dbRun('UPDATE emails SET isRead = ? WHERE id = ?', [isRead ? 1 : 0, emailId]);
    saveDatabase();
    
    return { success: true };
  } catch (err) {
    console.error('[email:mark-read] Error:', err);
    // Still update local DB even if IMAP fails
    dbRun('UPDATE emails SET isRead = ? WHERE id = ?', [isRead ? 1 : 0, emailId]);
    saveDatabase();
    return { success: true, warning: 'Updated locally, server sync failed' };
  }
});

// 11. Toggle Star
ipcMain.handle('email:star', async (_, emailId, isStarred) => {
  console.log('[email:star]', emailId, isStarred);
  
  try {
    const email = dbGet('SELECT * FROM emails WHERE id = ?', [emailId]);
    if (!email) {
      return { success: false, error: 'Email not found' };
    }
    
    const account = dbGet('SELECT * FROM accounts WHERE id = ?', [email.accountId]);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }
    
    const parts = emailId.split('-');
    const uid = parts[parts.length - 1];
    const folderId = parts.length > 2 ? parts[parts.length - 2] : email.folderId;
    
    const connection = await createImapConnection(account);
    const imapFolder = getImapFolder(account.provider, folderId);
    
    await connection.openBox(imapFolder, false);
    
    if (isStarred) {
      await connection.addFlags(uid, ['\\Flagged']);
    } else {
      await connection.delFlags(uid, ['\\Flagged']);
    }
    
    connection.end();
    
    dbRun('UPDATE emails SET isStarred = ? WHERE id = ?', [isStarred ? 1 : 0, emailId]);
    saveDatabase();
    
    return { success: true };
  } catch (err) {
    console.error('[email:star] Error:', err);
    dbRun('UPDATE emails SET isStarred = ? WHERE id = ?', [isStarred ? 1 : 0, emailId]);
    saveDatabase();
    return { success: true, warning: 'Updated locally, server sync failed' };
  }
});

// 12. Move Email (Delete/Archive)
ipcMain.handle('email:move', async (_, emailId, targetFolderId) => {
  console.log('[email:move]', emailId, '->', targetFolderId);
  
  try {
    const email = dbGet('SELECT * FROM emails WHERE id = ?', [emailId]);
    if (!email) {
      return { success: false, error: 'Email not found' };
    }
    
    const account = dbGet('SELECT * FROM accounts WHERE id = ?', [email.accountId]);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }
    
    const parts = emailId.split('-');
    const uid = parts[parts.length - 1];
    const sourceFolderId = parts.length > 2 ? parts[parts.length - 2] : email.folderId;
    
    const connection = await createImapConnection(account);
    const sourceFolder = getImapFolder(account.provider, sourceFolderId);
    const targetFolder = getImapFolder(account.provider, targetFolderId);
    
    await connection.openBox(sourceFolder, false);
    
    // Copy to target folder then delete from source
    await connection.moveMessage(uid, targetFolder);
    
    connection.end();
    
    // Update local database - change folder ID and email ID
    const newEmailId = `${email.accountId}-${targetFolderId}-${uid}`;
    dbRun('UPDATE emails SET id = ?, folderId = ? WHERE id = ?', [newEmailId, targetFolderId, emailId]);
    saveDatabase();
    
    return { success: true, newEmailId };
  } catch (err) {
    console.error('[email:move] Error:', err);
    // Fallback: just update local DB
    const parts = emailId.split('-');
    const uid = parts[parts.length - 1];
    const newEmailId = `${dbGet('SELECT accountId FROM emails WHERE id = ?', [emailId])?.accountId || parts[0]}-${targetFolderId}-${uid}`;
    dbRun('UPDATE emails SET id = ?, folderId = ? WHERE id = ?', [newEmailId, targetFolderId, emailId]);
    saveDatabase();
    return { success: true, warning: 'Moved locally, server sync failed', newEmailId };
  }
});

// 13. Delete Email Permanently
ipcMain.handle('email:delete', async (_, emailId) => {
  console.log('[email:delete]', emailId);
  
  try {
    const email = dbGet('SELECT * FROM emails WHERE id = ?', [emailId]);
    if (!email) {
      return { success: false, error: 'Email not found' };
    }
    
    const account = dbGet('SELECT * FROM accounts WHERE id = ?', [email.accountId]);
    if (!account) {
      // Just delete from local DB
      dbRun('DELETE FROM emails WHERE id = ?', [emailId]);
      saveDatabase();
      return { success: true };
    }
    
    const parts = emailId.split('-');
    const uid = parts[parts.length - 1];
    const folderId = parts.length > 2 ? parts[parts.length - 2] : email.folderId;
    
    try {
      const connection = await createImapConnection(account);
      const imapFolder = getImapFolder(account.provider, folderId);
      
      await connection.openBox(imapFolder, false);
      await connection.addFlags(uid, ['\\Deleted']);
      
      // Expunge to permanently delete
      await connection.imap.expungeAsync ? 
        connection.imap.expungeAsync() : 
        new Promise((resolve, reject) => {
          connection.imap.expunge((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      
      connection.end();
    } catch (imapErr) {
      console.error('[email:delete] IMAP error:', imapErr);
    }
    
    // Delete from local DB
    dbRun('DELETE FROM emails WHERE id = ?', [emailId]);
    saveDatabase();
    
    return { success: true };
  } catch (err) {
    console.error('[email:delete] Error:', err);
    dbRun('DELETE FROM emails WHERE id = ?', [emailId]);
    saveDatabase();
    return { success: true, warning: 'Deleted locally' };
  }
});

// 14. Send Email with Attachments
ipcMain.handle('email:send-with-attachments', async (_, emailData) => {
  const { to, cc, bcc, subject, body, html, attachments, accountId } = emailData;
  
  console.log('[email:send-with-attachments] Sending to:', to);
  
  try {
    let account;
    if (accountId) {
      account = dbGet('SELECT * FROM accounts WHERE id = ?', [accountId]);
    } else {
      const accounts = dbAll('SELECT * FROM accounts');
      if (accounts.length > 0) account = accounts[0];
    }
    
    if (!account) throw new Error('No account configured');
    
    let transporterConfig = {
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpPort === 465
    };
    
    // OAuth or password authentication
    if (account.encryptedOAuthToken) {
      let oauthToken;
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(account.encryptedOAuthToken, 'base64');
        oauthToken = JSON.parse(safeStorage.decryptString(buffer));
      } else {
        oauthToken = JSON.parse(account.encryptedOAuthToken);
      }
      
      // For Gmail, use OAuth2
      if (account.provider === 'gmail') {
        transporterConfig.auth = {
          type: 'OAuth2',
          user: account.email,
          accessToken: oauthToken.access_token
        };
      } else {
        // For other OAuth providers, try XOAUTH2
        transporterConfig.auth = {
          type: 'OAuth2',
          user: account.email,
          accessToken: oauthToken.access_token
        };
      }
    } else {
      let password = account.encryptedPassword;
      if (safeStorage.isEncryptionAvailable()) {
        try {
          const buffer = Buffer.from(account.encryptedPassword, 'base64');
          password = safeStorage.decryptString(buffer);
        } catch (e) {
          password = account.encryptedPassword;
        }
      }
      
      transporterConfig.auth = {
        user: account.email,
        pass: password
      };
    }
    
    const transporter = nodemailer.createTransport(transporterConfig);
    
    // Prepare attachments
    let mailAttachments = [];
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        if (att.path) {
          // File path
          mailAttachments.push({
            filename: att.filename || path.basename(att.path),
            path: att.path
          });
        } else if (att.content) {
          // Base64 content
          mailAttachments.push({
            filename: att.filename,
            content: Buffer.from(att.content, 'base64'),
            contentType: att.contentType
          });
        }
      }
    }
    
    const mailOptions = {
      from: `"${account.displayName}" <${account.email}>`,
      to: to,
      subject: subject,
      text: body,
      attachments: mailAttachments
    };
    
    if (cc) mailOptions.cc = cc;
    if (bcc) mailOptions.bcc = bcc;
    if (html) mailOptions.html = html;
    
    const info = await transporter.sendMail(mailOptions);
    
    // Save to sent folder
    const id = `${account.id}-sent-${Date.now()}`;
    const now = new Date().toISOString();
    dbRun(
      `INSERT INTO emails (id, accountId, folderId, senderName, senderEmail, subject, preview, body, timestamp, isRead, isStarred)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account.id, 'sent', 'Me', account.email, subject, body.substring(0, 100), body, now, 1, 0]
    );
    saveDatabase();
    
    console.log('[email:send-with-attachments] Email sent:', info.messageId);
    return { success: true, message: 'Email sent successfully', messageId: info.messageId };
  } catch (err) {
    console.error('[email:send-with-attachments] Error:', err);
    return { success: false, error: err.message };
  }
});

// 15. Save Draft
ipcMain.handle('email:save-draft', async (_, draftData) => {
  const { to, subject, body, accountId } = draftData;
  
  try {
    let account;
    if (accountId) {
      account = dbGet('SELECT * FROM accounts WHERE id = ?', [accountId]);
    } else {
      const accounts = dbAll('SELECT * FROM accounts');
      if (accounts.length > 0) account = accounts[0];
    }
    
    if (!account) throw new Error('No account configured');
    
    const id = `${account.id}-drafts-${Date.now()}`;
    const now = new Date().toISOString();
    
    dbRun(
      `INSERT INTO emails (id, accountId, folderId, senderName, senderEmail, subject, preview, body, timestamp, isRead, isStarred)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account.id, 'drafts', to || 'Draft', account.email, subject || '(No Subject)', body?.substring(0, 100) || '', body || '', now, 0, 0]
    );
    saveDatabase();
    
    return { success: true, draftId: id };
  } catch (err) {
    console.error('[email:save-draft] Error:', err);
    return { success: false, error: err.message };
  }
});

// 12. Get Unread Counts
ipcMain.handle('email:get-unread-counts', (_, profileId) => {
  if (!profileId) return {};
  
  const sql = `
    SELECT folderId, COUNT(*) as count 
    FROM emails 
    JOIN accounts ON emails.accountId = accounts.id
    WHERE emails.isRead = 0 AND accounts.profileId = ?
    GROUP BY folderId
  `;
  
  try {
    const results = dbAll(sql, [profileId]);
    const counts = {};
    results.forEach(r => counts[r.folderId] = r.count);
    return counts;
  } catch (e) {
    console.error('Get unread counts error:', e);
    return {};
  }
});

// System
ipcMain.handle('shell:open-path', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (e) {
    console.error('Open path error:', e);
    return { success: false, error: e.message };
  }
});


// Helper to process body: prefer HTML, fallback to Text->HTML
function processEmailBody(rawBody) {
  const parsed = parseMimeMessage(rawBody);
  let body = parsed.html;
  let finalBody = '';
  
  if (body && body.trim().length > 0) {
    // It is HTML, sanitize it
    finalBody = stripHtml(body);
    // Clean corrupted characters that might have survived
    finalBody = cleanCorruptedText(finalBody);
  } else {
    // Fallback to text, convert to HTML
    let text = parsed.text || rawBody || '';
    // Clean corrupted text first
    text = cleanCorruptedText(text);
    
    // Escape HTML entities in text to prevent injection
    const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    finalBody = escapedText.replace(/\r?\n/g, '<br>');
  }

  return {
      body: finalBody,
      attachments: parsed.attachments || []
  };
}