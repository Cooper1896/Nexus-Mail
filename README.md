# Nexus Mail - Desktop Client

## Setup & Installation

1.  **Install Dependencies**
    ```bash
    npm install
    ```
    *Note: This will also compile the `better-sqlite3` native module for Electron.*

2.  **Development Mode**
    Run the app locally with hot-reload:
    ```bash
    npm run electron:dev
    ```

3.  **Build for Windows (.exe)**
    Generate the production installer and portable executable:
    ```bash
    npm run electron:build
    ```
    The output files will be in the `dist/windows` directory.

## Features
- **Electron & React**: Dual-process architecture.
- **SQLite Database**: Local email storage with `better-sqlite3`.
- **Encrypted Storage**: Credentials secured via Electron `safeStorage`.
- **IMAP/SMTP**: Full email protocol support.
- **AI Summarization**: Integration with Gemini API.

## Requirements
- Node.js 18+
- Windows (for building .exe)
