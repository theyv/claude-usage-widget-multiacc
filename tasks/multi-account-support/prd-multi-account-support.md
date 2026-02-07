# PRD: Multi-Account Support

## Introduction
The Claude Usage Widget currently supports only one Claude.ai account at a time. Users with multiple accounts (e.g., personal and professional) need to see usage for both simultaneously to manage their limits effectively. This feature will allow adding a second account and displaying both in a vertically stacked view within the widget.

## Goals
- Support up to 2 independent Claude.ai accounts.
- Display both accounts simultaneously in a vertically stacked layout.
- Allow users to distinguish accounts by nickname (manual entry) or email (auto-fetch).
- Provide a simple flow to add/manage the second account via the settings menu.

## User Stories

### US-001: Migrate storage to account array
**Description:** As a developer, I want to migrate the existing single-account storage to an array-based structure so that I can support multiple accounts.

**Acceptance Criteria:**
- [ ] Check for existing `sessionKey` and `organizationId` in `electron-store`.
- [ ] If they exist, move them into an `accounts` array as the first entry.
- [ ] Each account object should have a unique `id` (UUID or timestamp).
- [ ] Typecheck/lint passes.

### US-002: Update main process IPC for account list
**Description:** As a developer, I want to update the `get-credentials` IPC handler to return the full list of accounts.

**Acceptance Criteria:**
- [ ] `ipcMain.handle('get-credentials', ...)` returns the `accounts` array from the store.
- [ ] Returns an empty array if no accounts are connected.
- [ ] Typecheck/lint passes.

### US-003: Update session cookie management for multi-account
**Description:** As a developer, I want to update `setSessionCookie` to handle switching between accounts during API calls.

**Acceptance Criteria:**
- [ ] `setSessionCookie` is called with the specific `sessionKey` before each account's API request.
- [ ] Ensure cookies are cleared or overwritten correctly to avoid cross-account data leakage.
- [ ] Typecheck/lint passes.

### US-004: Parameterize usage fetching by account
**Description:** As a developer, I want to update the `fetch-usage-data` IPC handler to accept an account ID or credentials.

**Acceptance Criteria:**
- [ ] `ipcMain.handle('fetch-usage-data', ...)` takes `accountId` as a parameter.
- [ ] It retrieves the correct `sessionKey` and `organizationId` for that account.
- [ ] It sets the session cookie before making the request.
- [ ] Typecheck/lint passes.

### US-005: Add Nickname field to Login UI
**Description:** As a user, I want to be able to enter a nickname when connecting an account so I can identify it.

**Acceptance Criteria:**
- [ ] Add a "Nickname" input field to `loginStep2` in `index.html`.
- [ ] Update `app.js` to capture this value during `handleConnect`.
- [ ] Verify in browser.

### US-006: Update save-credentials for multiple accounts
**Description:** As a developer, I want to update the `save-credentials` IPC handler to append new accounts to the list.

**Acceptance Criteria:**
- [ ] `ipcMain.handle('save-credentials', ...)` appends the new account object to the `accounts` array.
- [ ] Prevents duplicate accounts (based on `sessionKey` or `organizationId`).
- [ ] Typecheck/lint passes.

### US-007: Render multiple account sections in UI
**Description:** As a user, I want the main widget to render a section for each connected account.

**Acceptance Criteria:**
- [ ] Refactor `app.js` to loop through the accounts array.
- [ ] Create a container for each account's usage data.
- [ ] Display the account nickname in the section header.
- [ ] Verify in browser.

### US-008: Implement independent auto-update for each account
**Description:** As a developer, I want each account to have its own update cycle.

**Acceptance Criteria:**
- [ ] `fetchUsageData` is called for each account in the list.
- [ ] UI updates only the specific section for that account.
- [ ] Verify in browser.

### US-009: Dynamic widget resizing for two accounts
**Description:** As a user, I want the widget to grow in height when I have two accounts connected.

**Acceptance Criteria:**
- [ ] Update `resizeWidget` to calculate height based on the number of accounts.
- [ ] Ensure the window doesn't cut off content when two accounts are displayed.
- [ ] Verify in browser.

### US-010: Account management in Settings (Add/Remove)
**Description:** As a user, I want to manage my accounts from the settings menu.

**Acceptance Criteria:**
- [ ] Settings overlay lists all connected accounts with their nicknames.
- [ ] Each account has a "Remove" button.
- [ ] An "Add Another Account" button is visible if fewer than 2 accounts are connected.
- [ ] Verify in browser.

### US-011: Account-specific session expiration handling
**Description:** As a user, I want only the expired account to show a login prompt, not the whole app.

**Acceptance Criteria:**
- [ ] If an API call fails for Account A, only Account A's section shows an "Expired" state.
- [ ] Account B continues to function normally.
- [ ] Verify in browser.

## Functional Requirements
- FR-1: Storage must support at least 2 accounts.
- FR-2: Each account must have a unique identifier.
- FR-3: The widget must allow adding a second account without losing the first.
- FR-4: The UI must display the nickname/email for each account section.
- FR-5: The widget window must increase its height when a second account is added.

## Testing Requirements
- **Puppeteer Verification:** Use the `puppeteer` MCP tool to verify multi-account functionality.
- **Test Scenarios:**
  - Verify that two account sections are rendered when two accounts are connected.
  - Verify that nicknames are correctly displayed in the UI.
  - Verify that removing an account correctly updates the UI and storage.
  - Verify that the widget height adjusts when adding/removing the second account.

## Non-Goals (Out of Scope)
- Support for more than 2 accounts in this iteration.
- Reordering accounts.
- Side-by-side display layout.

## Technical Considerations
- `electron-store` migration: need to handle existing single-account users gracefully.
- Window size: `WIDGET_HEIGHT_COLLAPSED` will need to double or become dynamic.
- IPC complexity: switching from single global state to account-specific state in renderer.

## Success Metrics
- User can successfully log in to two different Claude accounts.
- Both accounts show correct, independent usage percentages.
- Both nicknames are clearly visible in the widget UI.
