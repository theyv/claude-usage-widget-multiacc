# Verification Guide: Sticky to Desktop Behavior (US-001)

## Overview
This document describes how to verify that the Claude Usage Widget window remains visible on the desktop even when Win+D (Show Desktop) is pressed.

## Acceptance Criteria

### AC1: Modify main.js to use Windows-specific window settings to ignore Win+D minimization
**Status:** ✅ IMPLEMENTED
**Verification:** Code review of [`main.js`](main.js:78)
- Changed `mainWindow.setAlwaysOnTop(true, 'floating')` to `mainWindow.setAlwaysOnTop(true, 'screen-saver')`
- The `'screen-saver'` level is specifically designed for desktop widgets that need to stay on top of other windows, including when Win+D is pressed

### AC2: Window survives Win+D and remains visible on the desktop
**Status:** ⏭️ REQUIRES MANUAL TESTING
**Verification Steps:**
1. Start the application: `npm start`
2. Position the widget somewhere on the desktop
3. Press Win+D (Show Desktop) on your keyboard
4. **Expected Behavior:** The widget should remain visible on the desktop
5. **Previous Behavior (before fix):** The widget would be hidden/minimized

**Note:** This requires manual testing on Windows. The `'screen-saver'` alwaysOnTop level is designed to prevent the window from being hidden by Win+D, but actual behavior may vary depending on Windows version and configuration.

### AC3: Window is still draggable and functional
**Status:** ✅ PRESERVED
**Verification:**
- The window configuration still includes `frame: false` and `transparent: true`
- No changes were made to drag-related code
- The `move` event handler is still active (line 81-84 in main.js)
- IPC handlers for window management are still in place

### AC4: Typecheck/lint passes
**Status:** ⏭️ NOT CONFIGURED
**Verification:** According to context.md, no test, lint, or typecheck commands are configured for this project.

## Technical Details

### Change Made
```javascript
// Before:
mainWindow.setAlwaysOnTop(true, 'floating');

// After:
mainWindow.setAlwaysOnTop(true, 'screen-saver');
```

### Why 'screen-saver'?
The `'screen-saver'` level for `setAlwaysOnTop()` is specifically designed for:
- Desktop widgets
- Screen savers
- Applications that need to stay visible even when the user presses Win+D

According to Electron documentation, this level is higher than `'floating'` and should prevent the window from being hidden by the Show Desktop command.

### Known Limitations
- The effectiveness of `'screen-saver'` may vary depending on Windows version
- Some Windows security settings may override this behavior
- This is a Windows-specific feature and may not work on macOS or Linux

## Testing Checklist
- [ ] Application starts without errors
- [ ] Window appears on desktop
- [ ] Window is draggable
- [ ] Window can be resized (via IPC)
- [ ] Window is always on top of other windows
- [ ] **Window remains visible when Win+D is pressed**
- [ ] Window can be hidden via tray icon
- [ ] Window can be shown via tray icon
- [ ] Window position is saved when moved
- [ ] Window position is restored on restart

## References
- Electron BrowserWindow API: https://www.electronjs.org/docs/latest/api/browser-window
- GitHub Issue #11232: https://github.com/electron/electron/issues/11232 (discusses Win+D behavior)
- GitHub Issue #38020: https://github.com/electron/electron/issues/38020 (discusses 'screen-saver' level)
