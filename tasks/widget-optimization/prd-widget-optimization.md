# PRD: Widget Optimization

## Introduction
The current Claude Usage Widget is visually bulky and doesn't behave like a native desktop widget (it minimizes when using Win+D). This task aims to implement an ultra-compact "slim" design, fix the "sticky to desktop" behavior on Windows, and allow users to manage account nicknames for better identification.

## Goals
- Implement an ultra-compact UI with smaller fonts and reduced padding.
- Fix window behavior to be "sticky to desktop" (persist on desktop even when Win+D is used).
- Enable nickname editing in the settings overlay for easy account identification.
- Optimize the overall layout for multi-account display in a compact form.

## User Stories

### US-001: Window "Sticky to Desktop" Behavior
**Description:** As a user, I want the widget to stay on the desktop even when I use Win+D (Show Desktop) so it behaves like a real widget.
**Acceptance Criteria:**
- [ ] Modify `main.js` to set `type: 'toolbar'` or use Windows-specific `win.setAlwaysOnTop(true, 'screen-saver')` and `win.setVisibleOnAllWorkspaces(true)`.
- [ ] Ensure the window does not minimize when "Show Desktop" is triggered.
- [ ] Verify that the window is still draggable and functional.
- [ ] Typecheck/lint passes.

### US-002: Base UI "Slim" Global Styles
**Description:** As a user, I want a more compact global interface to save screen space.
**Acceptance Criteria:**
- [ ] Reduce `.widget-container` padding and border widths.
- [ ] Decrease base font sizes in `styles.css`.
- [ ] Tighten spacing in the `.title-bar`.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser.

### US-003: Compact Account Header Design
**Description:** As a user, I want the account name/nickname section to be smaller.
**Acceptance Criteria:**
- [ ] Reduce height and padding of `.account-header`.
- [ ] Decrease font size of `.account-nickname`.
- [ ] Ensure the "Expired" badge fits correctly in the compact header.
- [ ] Verify in browser.

### US-004: Ultra-Compact Usage Rows
**Description:** As a user, I want usage progress bars and labels to be much smaller.
**Acceptance Criteria:**
- [ ] Redesign `.usage-section` to use a single-line or more compact grid layout.
- [ ] Reduce row height to < 28px.
- [ ] Shrink `.progress-bar` height to 4px.
- [ ] Align labels and timers to use width more efficiently.
- [ ] Verify in browser.

### US-005: Space-Optimized Timers
**Description:** As a user, I want the reset timers to take up less vertical space.
**Acceptance Criteria:**
- [ ] Reduce font size of `.timer-text`.
- [ ] Scale down the `.mini-timer` SVG size.
- [ ] Tighten `.timer-container` padding.
- [ ] Verify in browser.

### US-006: Nickname Editing Interface in Settings
**Description:** As a user, I want to be able to change my account nicknames in the settings overlay.
**Acceptance Criteria:**
- [ ] Add an "Edit" icon/button next to each account in the settings list.
- [ ] Clicking "Edit" replaces the nickname text with an input field.
- [ ] Provide "Save" and "Cancel" buttons for the nickname edit.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser.

### US-007: Update Nickname IPC Handler
**Description:** As a developer, I want a dedicated IPC handler to save nickname changes.
**Acceptance Criteria:**
- [ ] Implement `ipcMain.handle('update-nickname', ...)` in `main.js`.
- [ ] Update the `accounts` array in `electron-store` with the new nickname.
- [ ] Ensure the change is persisted immediately.
- [ ] Typecheck/lint passes.

### US-008: Immediate UI Refresh on Nickname Change
**Description:** As a user, I want the main widget to show my new nickname immediately after I save it in settings.
**Acceptance Criteria:**
- [ ] Trigger a UI re-render on the main window after a successful nickname update.
- [ ] Verify the nickname changes in the `.account-nickname` field without app restart.
- [ ] Verify in browser.

### US-009: Compact Settings Overlay UI
**Description:** As a user, I want the settings overlay to also be slim and efficient.
**Acceptance Criteria:**
- [ ] Reduce padding and font sizes in `.settings-content`.
- [ ] Shrink account item rows in the settings list.
- [ ] Ensure the "Add Account" and "Logout" buttons are more compact.
- [ ] Verify in browser.

## Functional Requirements
- FR-1: Window must ignore "Show Desktop" minimization on Windows.
- FR-2: Usage rows must be readable despite the compact size.
- FR-3: Nicknames must support Unicode and have a reasonable length limit.

## Non-Goals (Out of Scope)
- Adding themes (e.g., Light mode).
- Changing the data fetching frequency.
- Drastic changes to the Tray icon behavior.

## Technical Considerations
- Windows "Show Desktop" behavior is tricky in Electron; might need `win.setSkipTaskbar(true)` or specific window levels.
- CSS variables should be used for the compact sizing where possible.

## Success Metrics
- Overall widget height reduced by ~30%.
- Nickname changes reflect in < 500ms.
- Widget survives Win+D.

## Open Questions
- None.
