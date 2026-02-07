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

## Notes
- Store encryption key: `claude-widget-secure-key-2024`
- Current storage: `sessionKey`, `organizationId` (need to migrate to `accounts` array)
- Widget dimensions: 480x140 (collapsed)
