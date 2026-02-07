# Implementation Context
Generated: 2026-02-07T18:23:00Z
Task: multi-account-support
Branch: dalph/multi-account-support

## Project Stack
- **Language:** JavaScript (Node.js)
- **Package Manager:** npm
- **Framework:** Electron 28.0.0

## Available Commands
- **Test:** not configured
- **Lint:** not configured
- **Typecheck:** not configured
- **Build:** `npm run build` or `npm run build:win`

## Project Structure
- Source code: `src/renderer/` (renderer), `main.js`, `preload.js` (main)
- Tests: not configured
- Config: `package.json`, `electron-store` (encrypted storage)

## Codebase Patterns
- Electron app with `electron-store` for persistence
- IPC communication between `main.js` and `src/renderer/app.js`
- Usage data fetched via `src/fetch-via-window.js` to bypass Cloudflare
- UI uses vanilla JS and CSS in `src/renderer/`
- Session cookie management via `session.defaultSession.cookies`
- Window resizing via `ipcMain.on('resize-window')`
- **Storage Migration Pattern** -> Migrations should be idempotent - check if migration already done before attempting
- **electron-store Encryption** -> Encryption key must match exactly between test and production code
- **Timestamp IDs** -> Using `Date.now().toString()` provides simple unique IDs without UUID libraries
- **Account Object Structure** -> Each account has: `id`, `sessionKey`, `organizationId`, `nickname` (nullable)
- **Cookie Isolation Pattern** -> Always clear existing sessionKey cookie before setting new one to prevent cross-account data leakage
- **Account Lookup Pattern** -> Use `accounts.find(acc => acc.id === accountId)` to retrieve a specific account by ID
- **Credential Extraction** -> Use destructuring `const { sessionKey, organizationId } = account;` to extract credentials from account objects
- **Error Handling** -> Always validate that account exists and has required credentials before proceeding with API requests
- **UI Input Field Pattern** -> When adding optional input fields, use placeholder text like "(optional)" to indicate field is not required
- **Credentials Object Pattern** -> When adding optional fields to credentials, use null fallback (e.g., `nickname: nickname || null`) to maintain consistency with existing patterns
- **IPC Response Pattern** -> Return structured objects with `success` boolean and either `account` (on success) or `error` (on failure) instead of simple boolean values to provide better feedback to renderer
- **Multi-Account Architecture** -> App uses accounts array with each account having id, sessionKey, organizationId, and optional nickname. Usage data stored as map keyed by accountId
- **Dynamic DOM Generation** -> Account sections generated with unique IDs using `account-${account.id}` pattern. Each section has nickname header, usage sections, expand toggle, and expandable details
- **Per-Account State** -> Each account independently expandable/collapsible. Expand toggle uses `data-account-id` attribute to identify which account to expand
- **Per-Account State Tracking** -> For independent multi-account operations, use per-account state maps (e.g., `sessionResetTriggered[accountId] = {}`) instead of global flags to prevent cross-account interference

## Notes
- Store encryption key: `claude-widget-secure-key-2024`
- Current storage: `sessionKey`, `organizationId` (need to migrate to `accounts` array)
- Widget dimensions: 480x140 (collapsed)
