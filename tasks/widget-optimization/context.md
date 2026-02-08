# Implementation Context
Generated: 2026-02-08T09:33:00Z
Task: widget-optimization
Branch: dalph/widget-optimization

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
- Electron main window configured in `main.js` with `alwaysOnTop: true`
- Renderer uses `src/renderer/styles.css` for layout and `src/renderer/app.js` for logic
- Account data is stored in `electron-store` under the `accounts` key
- IPC communication between `main.js` and `src/renderer/app.js`
- Usage data fetched via `src/fetch-via-window.js` to bypass Cloudflare
- Session cookie management via `session.defaultSession.cookies`
- Window resizing via `ipcMain.on('resize-window')`
- Store encryption key: `claude-widget-secure-key-2024`
- Widget dimensions: 480x140 (collapsed)

## Notes
- Store encryption key: `claude-widget-secure-key-2024`
- Current storage: `accounts` array with each account having id, sessionKey, organizationId, and optional nickname
- Widget is currently bulky and needs slim UI redesign
- Window needs to be "sticky to desktop" (ignore Win+D)
