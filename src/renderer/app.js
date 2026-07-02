// Application state
let accounts = [];
let updateInterval = null;
let countdownInterval = null;
let latestUsageData = {}; // Map of accountId -> usage data
let isExpanded = false;
let expiredAccounts = {}; // Map of accountId -> boolean (true if expired)
const inFlightFetches = new Set(); // accountIds currently being fetched — prevents overlapping calls

// User settings (populated from main process on init)
let settings = {};
let warnThreshold = 75;
let dangerThreshold = 90;
let isCompactMode = false;
const alertFired = {}; // Map of accountId -> { session_warn, session_danger, weekly_warn, weekly_danger }
const DEFAULT_REFRESH_SECONDS = 300;
const WIDGET_HEIGHT_COLLAPSED = 110;
const WIDGET_ROW_HEIGHT = 24;
const ACCOUNT_SECTION_HEIGHT = 90; // Height per account section

// Debug logging — only shows in DevTools (development mode).
// Regular users won't see verbose logs in production.
const DEBUG = (new URLSearchParams(window.location.search)).has('debug');
function debugLog(...args) {
  if (DEBUG) console.log('[Debug]', ...args);
}

// DOM elements
const elements = {
    loadingContainer: document.getElementById('loadingContainer'),
    loginContainer: document.getElementById('loginContainer'),
    noUsageContainer: document.getElementById('noUsageContainer'),
    mainContent: document.getElementById('mainContent'),
    accountsContainer: document.getElementById('accountsContainer'),
    loginStep1: document.getElementById('loginStep1'),
    loginStep2: document.getElementById('loginStep2'),
    autoDetectBtn: document.getElementById('autoDetectBtn'),
    autoDetectError: document.getElementById('autoDetectError'),
    openBrowserLink: document.getElementById('openBrowserLink'),
    nextStepBtn: document.getElementById('nextStepBtn'),
    backStepBtn: document.getElementById('backStepBtn'),
    sessionKeyInput: document.getElementById('sessionKeyInput'),
    nicknameInput: document.getElementById('nicknameInput'),
    connectBtn: document.getElementById('connectBtn'),
    sessionKeyError: document.getElementById('sessionKeyError'),
    refreshBtn: document.getElementById('refreshBtn'),
    minimizeBtn: document.getElementById('minimizeBtn'),
    closeBtn: document.getElementById('closeBtn'),

    settingsBtn: document.getElementById('settingsBtn'),
    settingsOverlay: document.getElementById('settingsOverlay'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    settingsAccountsList: document.getElementById('settingsAccountsList'),
    addAccountBtn: document.getElementById('addAccountBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    coffeeBtn: document.getElementById('coffeeBtn'),

    // Settings controls
    autoStartToggle: document.getElementById('autoStartToggle'),
    autoStartCol: document.getElementById('autoStartCol'),
    autoStartHint: document.getElementById('autoStartHint'),
    minimizeToTrayToggle: document.getElementById('minimizeToTrayToggle'),
    trayLabel: document.getElementById('trayLabel'),
    alwaysOnTopToggle: document.getElementById('alwaysOnTopToggle'),
    usageAlertsToggle: document.getElementById('usageAlertsToggle'),
    compactModeToggle: document.getElementById('compactModeToggle'),
    themeBtns: document.querySelectorAll('.theme-btn'),
    timeFormat: document.getElementById('timeFormat'),
    weeklyDateFormat: document.getElementById('weeklyDateFormat'),
    refreshInterval: document.getElementById('refreshInterval'),
    warnThreshold: document.getElementById('warnThreshold'),
    dangerThreshold: document.getElementById('dangerThreshold'),
    settingsVersionLabel: document.getElementById('settingsVersionLabel')
};

// Initialize
async function init() {
    setupEventListeners();

    // Load settings first so theme/thresholds/format apply before first render
    settings = await window.electronAPI.getSettings();
    warnThreshold = settings.warnThreshold ?? 75;
    dangerThreshold = settings.dangerThreshold ?? 90;
    applyTheme(settings.theme);
    applyCompactMode(!!settings.compactMode);
    if (window.electronAPI.platform === 'darwin' && elements.trayLabel) {
        elements.trayLabel.textContent = 'Hide from Dock';
    }

    // Version label in settings footer
    try {
        const version = await window.electronAPI.getAppVersion();
        if (elements.settingsVersionLabel) {
            elements.settingsVersionLabel.textContent = `Version v${version}`;
        }
    } catch (e) { /* ignore */ }

    accounts = await window.electronAPI.getCredentials();

    if (accounts && accounts.length > 0) {
        showMainContent();
        renderAccounts();
        await fetchAllUsageData();
        startAutoUpdate();
        startCountdown();
    } else {
        showLoginRequired();
    }
}

// Event Listeners
function setupEventListeners() {
    // Step 1: Login via BrowserWindow
    elements.autoDetectBtn.addEventListener('click', handleAutoDetect);

    // Step navigation
    elements.nextStepBtn.addEventListener('click', () => {
        elements.loginStep1.style.display = 'none';
        elements.loginStep2.style.display = 'block';
        elements.sessionKeyInput.focus();
    });

    elements.backStepBtn.addEventListener('click', () => {
        elements.loginStep2.style.display = 'none';
        elements.loginStep1.style.display = 'flex';
        elements.sessionKeyError.textContent = '';
    });

    // Open browser link in step 2
    elements.openBrowserLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.electronAPI.openExternal('https://claude.ai');
    });

    // Step 2: Manual sessionKey connect
    elements.connectBtn.addEventListener('click', handleConnect);
    elements.sessionKeyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleConnect();
        elements.sessionKeyError.textContent = '';
    });

    elements.refreshBtn.addEventListener('click', async () => {
        debugLog('Refresh button clicked');
        elements.refreshBtn.classList.add('spinning');
        await fetchAllUsageData();
        elements.refreshBtn.classList.remove('spinning');
    });

    elements.minimizeBtn.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });

    elements.closeBtn.addEventListener('click', () => {
        window.electronAPI.closeWindow();
    });


    // Settings calls
    elements.settingsBtn.addEventListener('click', async () => {
        await loadSettings();
        renderSettingsAccounts();
        elements.settingsOverlay.style.display = 'flex';
        // Give the settings panel a comfortable working height
        window.electronAPI.resizeWindow(520);
    });

    elements.closeSettingsBtn.addEventListener('click', async () => {
        await saveSettings();
        elements.settingsOverlay.style.display = 'none';
        resizeWidget();
    });

    // Theme buttons — highlight selection immediately (persisted on Done)
    elements.themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyTheme(btn.dataset.theme);
        });
    });

    elements.logoutBtn.addEventListener('click', async () => {
        await window.electronAPI.deleteCredentials();
        accounts = [];
        elements.settingsOverlay.style.display = 'none';
        showLoginRequired();
    });

    elements.addAccountBtn.addEventListener('click', () => {
        elements.settingsOverlay.style.display = 'none';
        showLoginRequired();
    });

    elements.coffeeBtn.addEventListener('click', () => {
        window.electronAPI.openExternal('https://paypal.me/SlavomirDurej?country.x=GB&locale.x=en_GB');
    });

    // Listen for refresh requests from tray
    window.electronAPI.onRefreshUsage(async () => {
        await fetchAllUsageData();
    });

    // Listen for session expiration events (403 errors)
    window.electronAPI.onSessionExpired(() => {
        debugLog('Session expired event received');
        accounts = [];
        showLoginRequired();
    });
}

// Handle manual sessionKey connect
async function handleConnect() {
    const sessionKey = elements.sessionKeyInput.value.trim();
    const nickname = elements.nicknameInput.value.trim();
    
    if (!sessionKey) {
        elements.sessionKeyError.textContent = 'Please paste your session key';
        return;
    }

    elements.connectBtn.disabled = true;
    elements.connectBtn.textContent = '...';
    elements.sessionKeyError.textContent = '';

    try {
        const result = await window.electronAPI.validateSessionKey(sessionKey);
        if (result.success) {
            // Check if this is a reconnection
            const reconnectingAccountId = window.reconnectingAccountId;
            
            if (reconnectingAccountId) {
                // Update existing account's credentials
                const accountIndex = accounts.findIndex(acc => acc.id === reconnectingAccountId);
                if (accountIndex !== -1) {
                    const updatedAccount = {
                        ...accounts[accountIndex],
                        sessionKey: sessionKey,
                        organizationId: result.organizationId,
                        nickname: nickname || accounts[accountIndex].nickname
                    };
                    
                    // Update the account in storage via main process
                    const saveResult = await window.electronAPI.saveCredentials(updatedAccount);
                    if (saveResult.success) {
                        // Update local state
                        accounts[accountIndex] = saveResult.account;
                        
                        // Clear expired state
                        if (expiredAccounts[reconnectingAccountId]) {
                            delete expiredAccounts[reconnectingAccountId];
                        }
                        
                        // Clear reconnecting flag
                        window.reconnectingAccountId = null;
                        
                        elements.sessionKeyInput.value = '';
                        elements.nicknameInput.value = '';
                        showMainContent();
                        renderAccounts();
                        await fetchUsageData(saveResult.account.id);
                    } else {
                        elements.sessionKeyError.textContent = saveResult.error || 'Failed to update account';
                    }
                }
            } else {
                // New account connection
                const newAccount = { sessionKey, organizationId: result.organizationId, nickname: nickname || null };
                const saveResult = await window.electronAPI.saveCredentials(newAccount);
                if (saveResult.success) {
                    accounts.push(saveResult.account);
                    elements.sessionKeyInput.value = '';
                    elements.nicknameInput.value = '';
                    showMainContent();
                    renderAccounts();
                    await fetchUsageData(saveResult.account.id);
                    startAutoUpdate();
                } else {
                    elements.sessionKeyError.textContent = saveResult.error || 'Failed to save account';
                }
            }
        } else {
            elements.sessionKeyError.textContent = result.error || 'Invalid session key';
        }
    } catch (error) {
        elements.sessionKeyError.textContent = 'Connection failed. Check your key.';
    } finally {
        elements.connectBtn.disabled = false;
        elements.connectBtn.textContent = 'Connect';
    }
}

// Handle auto-detect from browser cookies
async function handleAutoDetect() {
    elements.autoDetectBtn.disabled = true;
    elements.autoDetectBtn.textContent = 'Waiting...';
    elements.autoDetectError.textContent = '';

    try {
        const result = await window.electronAPI.detectSessionKey();
        if (!result.success) {
            elements.autoDetectError.textContent = result.error || 'Login failed';
            return;
        }

        // Got sessionKey from login, now validate it
        elements.autoDetectBtn.textContent = 'Validating...';
        const validation = await window.electronAPI.validateSessionKey(result.sessionKey);

        if (validation.success) {
            const newAccount = {
                sessionKey: result.sessionKey,
                organizationId: validation.organizationId
            };
            const saveResult = await window.electronAPI.saveCredentials(newAccount);
            if (saveResult.success) {
                accounts.push(saveResult.account);
                showMainContent();
                renderAccounts();
                await fetchUsageData(saveResult.account.id);
                startAutoUpdate();
            } else {
                elements.autoDetectError.textContent = saveResult.error || 'Failed to save account';
            }
        } else {
            elements.autoDetectError.textContent =
                'Session invalid. Try again or use Manual →';
        }
    } catch (error) {
        elements.autoDetectError.textContent = error.message || 'Login failed';
    } finally {
        elements.autoDetectBtn.disabled = false;
        elements.autoDetectBtn.textContent = 'Log in';
    }
}

// Fetch usage data from Claude API
async function fetchUsageData(accountId) {
    debugLog('fetchUsageData called for account:', accountId);

    if (inFlightFetches.has(accountId)) {
        debugLog('Fetch already in flight for account', accountId, '— skipping');
        return;
    }

    inFlightFetches.add(accountId);
    try {
        debugLog('Calling electronAPI.fetchUsageData...');
        const data = normalizeUsageData(await window.electronAPI.fetchUsageData(accountId));
        debugLog('Received usage data for account', accountId, ':', data);
        latestUsageData[accountId] = data;
        // Clear expired state if fetch succeeds
        if (expiredAccounts[accountId]) {
            delete expiredAccounts[accountId];
        }
        updateAccountUI(accountId, data);
        checkUsageAlerts(accountId, data);
    } catch (error) {
        console.error('Error fetching usage data for account', accountId, ':', error);
        if (error.message.includes('SessionExpired') || error.message.includes('Unauthorized')) {
            // Mark account as expired instead of removing it
            expiredAccounts[accountId] = true;
            debugLog('Account marked as expired:', accountId);
            updateAccountExpiredUI(accountId);
        } else {
            debugLog('Failed to fetch usage data for account', accountId);
        }
    } finally {
        inFlightFetches.delete(accountId);
    }
}

// Fetch usage data for all accounts
async function fetchAllUsageData() {
    debugLog('fetchAllUsageData called');
    for (const account of accounts) {
        await fetchUsageData(account.id);
    }
}

// Render all account sections
function renderAccounts() {
    elements.accountsContainer.innerHTML = '';
    
    accounts.forEach(account => {
        const accountSection = document.createElement('div');
        const isExpired = expiredAccounts[account.id];
        accountSection.className = `account-section ${isExpired ? 'expired' : ''}`;
        accountSection.id = `account-${account.id}`;
        accountSection.innerHTML = `
            <!-- Account Header -->
            <div class="account-header">
                <span class="account-nickname">${account.nickname || 'Account'}</span>
                ${isExpired ? '<span class="expired-badge">Expired</span>' : ''}
            </div>
            
            ${isExpired ? `
            <!-- Expired State -->
            <div class="expired-state">
                <p class="expired-message">Session expired. Please reconnect to view usage data.</p>
                <button class="reconnect-btn" data-account-id="${account.id}">Reconnect</button>
            </div>
            ` : `
            <!-- Column Headers -->
            <div class="usage-headers">
                <span></span>
                <span class="col-header progress-header">Used</span>
                <span class="col-header right">%</span>
                <span class="col-header">Resets In</span>
                <span class="col-header right">Resets At</span>
            </div>

            <!-- Session Usage -->
            <div class="usage-section">
                <span class="usage-label">Current Session</span>
                <div class="progress-bar">
                    <div class="progress-fill session-progress-${account.id}" style="width: 0%"></div>
                </div>
                <span class="usage-percentage session-percentage-${account.id}">0%</span>
                <div class="timer-container">
                    <div class="timer-text session-time-text-${account.id}">--:--</div>
                    <svg class="mini-timer" width="16" height="16" viewBox="0 0 24 24">
                        <circle class="timer-bg" cx="12" cy="12" r="10" />
                        <circle class="timer-progress session-timer-${account.id}" cx="12" cy="12" r="10"
                            style="stroke-dasharray: 63; stroke-dashoffset: 63" />
                    </svg>
                </div>
                <span class="resets-at-text session-resets-at-${account.id}">—</span>
            </div>

            <!-- Weekly Usage -->
            <div class="usage-section">
                <span class="usage-label">Weekly Limit</span>
                <div class="progress-bar">
                    <div class="progress-fill weekly weekly-progress-${account.id}" style="width: 0%"></div>
                </div>
                <span class="usage-percentage weekly-percentage-${account.id}">0%</span>
                <div class="timer-container">
                    <div class="timer-text weekly-time-text-${account.id}">--:--</div>
                    <svg class="mini-timer" width="16" height="16" viewBox="0 0 24 24">
                        <circle class="timer-bg" cx="12" cy="12" r="10" />
                        <circle class="timer-progress weekly weekly-timer-${account.id}" cx="12" cy="12" r="10"
                            style="stroke-dasharray: 63; stroke-dashoffset: 63" />
                    </svg>
                </div>
                <span class="resets-at-text weekly-resets-at-${account.id}">—</span>
            </div>

            `}
            
            <!-- Expand Toggle -->
            <div class="expand-toggle expand-toggle-${account.id}" data-account-id="${account.id}" style="display: ${isExpired ? 'none' : 'flex'}">
                <svg class="expand-arrow expand-arrow-${account.id}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </div>

            <!-- Expandable Details -->
            <div class="expand-section expand-section-${account.id}" style="display: none;">
                <div class="extra-rows-${account.id}"></div>
            </div>
        `;
        
        elements.accountsContainer.appendChild(accountSection);
        
        // Add event listener for reconnect button if account is expired
        if (isExpired) {
            const reconnectBtn = accountSection.querySelector('.reconnect-btn');
            reconnectBtn.addEventListener('click', () => handleReconnect(account.id));
        }
        
        // Add event listener for expand toggle
        const expandToggle = accountSection.querySelector(`.expand-toggle-${account.id}`);
        if (expandToggle) {
            expandToggle.addEventListener('click', () => {
            const accountId = expandToggle.dataset.accountId;
            const arrow = accountSection.querySelector(`.expand-arrow-${accountId}`);
                const section = accountSection.querySelector(`.expand-section-${accountId}`);
                const isExpanded = arrow.classList.contains('expanded');
                
                arrow.classList.toggle('expanded', !isExpanded);
                section.style.display = !isExpanded ? 'block' : 'none';
                // Populate the extra-row countdowns immediately on expand
                if (!isExpanded) refreshExtraTimersForAccount(accountId);
                resizeWidget();
            });
        }
    });
    
    resizeWidget();
}

// Update UI for expired account
function updateAccountExpiredUI(accountId) {
    const accountSection = document.getElementById(`account-${accountId}`);
    if (!accountSection) return;
    
    // Add expired class to section
    accountSection.classList.add('expired');
    
    // Hide expand toggle
    const expandToggle = accountSection.querySelector('.expand-toggle');
    if (expandToggle) {
        expandToggle.style.display = 'none';
    }
    
    // Hide expand section
    const expandSection = accountSection.querySelector('.expand-section');
    if (expandSection) {
        expandSection.style.display = 'none';
    }
    
    // Add expired state content
    const accountHeader = accountSection.querySelector('.account-header');
    const existingBadge = accountHeader.querySelector('.expired-badge');
    if (!existingBadge) {
        const badge = document.createElement('span');
        badge.className = 'expired-badge';
        badge.textContent = 'Expired';
        accountHeader.appendChild(badge);
    }
    
    // Remove existing usage sections and add expired state
    const usageSections = accountSection.querySelectorAll('.usage-section');
    usageSections.forEach(section => section.remove());
    
    // Check if expired state already exists
    let expiredState = accountSection.querySelector('.expired-state');
    if (!expiredState) {
        expiredState = document.createElement('div');
        expiredState.className = 'expired-state';
        expiredState.innerHTML = `
            <p class="expired-message">Session expired. Please reconnect to view usage data.</p>
            <button class="reconnect-btn" data-account-id="${accountId}">Reconnect</button>
        `;
        accountSection.appendChild(expiredState);
        
        // Add event listener for reconnect button
        const reconnectBtn = expiredState.querySelector('.reconnect-btn');
        reconnectBtn.addEventListener('click', () => handleReconnect(accountId));
    }
}

// Handle reconnection for expired account
async function handleReconnect(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    // Show login step 2 for this account
    elements.settingsOverlay.style.display = 'none';
    showLoginRequired();
    
    // Pre-fill session key input with the account's session key
    elements.sessionKeyInput.value = account.sessionKey;
    
    // Pre-fill nickname if available
    if (account.nickname) {
        elements.nicknameInput.value = account.nickname;
    }
    
    // Store the account ID being reconnected for later use
    window.reconnectingAccountId = accountId;
}

// Update UI for a specific account
function updateAccountUI(accountId, data) {
    if (hasNoUsage(data)) {
        // For now, we'll still show the account section with 0% values
        // Could add a "no usage" indicator later
    }

    // Session data
    const sessionUtilization = data.five_hour?.utilization || 0;
    const sessionResetsAt = data.five_hour?.resets_at;

    const sessionProgress = document.querySelector(`.session-progress-${accountId}`);
    const sessionPercentage = document.querySelector(`.session-percentage-${accountId}`);
    const sessionTimer = document.querySelector(`.session-timer-${accountId}`);
    const sessionTimeText = document.querySelector(`.session-time-text-${accountId}`);
    const sessionResetsAtEl = document.querySelector(`.session-resets-at-${accountId}`);

    if (sessionProgress && sessionPercentage && sessionTimer && sessionTimeText) {
        updateProgressBar(sessionProgress, sessionPercentage, sessionUtilization);
        updateTimer(sessionTimer, sessionTimeText, sessionResetsAt, 5 * 60);
    }
    if (sessionResetsAtEl) {
        sessionResetsAtEl.textContent = formatResetsAt(sessionResetsAt, false);
        sessionResetsAtEl.style.opacity = sessionResetsAt ? '1' : '0.4';
    }

    // Weekly data
    const weeklyUtilization = data.seven_day?.utilization || 0;
    const weeklyResetsAt = data.seven_day?.resets_at;

    const weeklyProgress = document.querySelector(`.weekly-progress-${accountId}`);
    const weeklyPercentage = document.querySelector(`.weekly-percentage-${accountId}`);
    const weeklyTimer = document.querySelector(`.weekly-timer-${accountId}`);
    const weeklyTimeText = document.querySelector(`.weekly-time-text-${accountId}`);
    const weeklyResetsAtEl = document.querySelector(`.weekly-resets-at-${accountId}`);

    if (weeklyProgress && weeklyPercentage && weeklyTimer && weeklyTimeText) {
        updateProgressBar(weeklyProgress, weeklyPercentage, weeklyUtilization, true);
        updateTimer(weeklyTimer, weeklyTimeText, weeklyResetsAt, 7 * 24 * 60);
    }
    if (weeklyResetsAtEl) {
        weeklyResetsAtEl.textContent = formatResetsAt(weeklyResetsAt, true);
        weeklyResetsAtEl.style.opacity = weeklyResetsAt ? '1' : '0.4';
    }

    // Build extra rows
    buildExtraRowsForAccount(accountId, data);
    
    // Refresh timers for this account if expanded
    const expandArrow = document.querySelector(`.expand-arrow-${accountId}`);
    if (expandArrow && expandArrow.classList.contains('expanded')) {
        refreshExtraTimersForAccount(accountId);
    }
}

// Build extra rows for a specific account
function buildExtraRowsForAccount(accountId, data) {
    const extraRowsContainer = document.querySelector(`.extra-rows-${accountId}`);
    if (!extraRowsContainer) return;

    extraRowsContainer.innerHTML = '';
    let count = 0;

    for (const [key, config] of Object.entries(EXTRA_ROW_CONFIG)) {
        const value = data[key];
        if (!value || value.utilization === undefined) continue;

        const utilization = value.utilization || 0;
        const resetsAt = value.resets_at;
        const colorClass = config.color;
        const isWeekly = key.includes('seven_day');

        const row = document.createElement('div');
        row.className = 'usage-section';
        row.innerHTML = `
            <span class="usage-label">${config.label}</span>
            <div class="progress-bar">
                <div class="progress-fill ${colorClass}" style="width: ${Math.min(utilization, 100)}%"></div>
            </div>
            <span class="usage-percentage">${Math.round(utilization)}%</span>
            <div class="timer-container">
                <div class="timer-text extra-timer-${accountId}-${key}" data-resets="${resetsAt || ''}" data-total="${isWeekly ? 7 * 24 * 60 : 5 * 60}">--:--</div>
                <svg class="mini-timer" width="16" height="16" viewBox="0 0 24 24">
                    <circle class="timer-bg" cx="12" cy="12" r="10" />
                    <circle class="timer-progress extra-timer-circle-${accountId}-${key} ${colorClass}" cx="12" cy="12" r="10"
                        style="stroke-dasharray: 63; stroke-dashoffset: 63" />
                </svg>
            </div>
            <span class="resets-at-text" style="opacity: ${resetsAt ? '1' : '0.4'}">${formatResetsAt(resetsAt, isWeekly)}</span>
        `;

        const progressEl = row.querySelector('.progress-fill');
        if (utilization >= dangerThreshold) progressEl.classList.add('danger');
        else if (utilization >= warnThreshold) progressEl.classList.add('warning');

        extraRowsContainer.appendChild(row);
        count++;
    }

    // Hide toggle if no extra rows
    const expandToggle = document.querySelector(`.expand-toggle-${accountId}`);
    if (expandToggle) {
        expandToggle.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Refresh extra timers for a specific account
function refreshExtraTimersForAccount(accountId) {
    const extraRowsContainer = document.querySelector(`.extra-rows-${accountId}`);
    if (!extraRowsContainer) return;

    // Pair each row's timer text with its own circle. Pairing the two
    // querySelectorAll lists by index breaks as soon as one row has a text
    // but no circle, leaving every later row's timer stuck at --:--.
    extraRowsContainer.querySelectorAll('.usage-section').forEach((row) => {
        const textEl = row.querySelector('.timer-text');
        const circleEl = row.querySelector('.timer-progress');
        if (!textEl || !circleEl) return;
        const resetsAt = textEl.dataset.resets;
        const totalMinutes = parseInt(textEl.dataset.total);
        if (resetsAt) {
            updateTimer(circleEl, textEl, resetsAt, totalMinutes);
        }
    });
}

// Check if there's no usage data
function hasNoUsage(data) {
    const sessionUtilization = data.five_hour?.utilization || 0;
    const sessionResetsAt = data.five_hour?.resets_at;
    const weeklyUtilization = data.seven_day?.utilization || 0;
    const weeklyResetsAt = data.seven_day?.resets_at;

    return sessionUtilization === 0 && !sessionResetsAt &&
        weeklyUtilization === 0 && !weeklyResetsAt;
}

// Extra row label mapping for API fields
const EXTRA_ROW_CONFIG = {
    seven_day_sonnet: { label: 'Sonnet (7d)', color: 'weekly' },
    seven_day_opus: { label: 'Opus (7d)', color: 'opus' },
    seven_day_cowork: { label: 'Cowork (7d)', color: 'weekly' },
    seven_day_oauth_apps: { label: 'OAuth Apps (7d)', color: 'weekly' },
    extra_usage: { label: 'Extra Usage', color: 'extra' },
};

// claude.ai now reports per-model weekly limits (e.g. Fable) as entries in the
// `limits` array with kind "weekly_scoped"; the legacy seven_day_<model> fields
// arrive null for those models. Map each scoped weekly limit onto a synthetic
// seven_day_* field so it renders like any other extra row. Deliberately generic:
// whatever scoped limits Anthropic sends next render without another release.
function normalizeUsageData(data) {
    if (!data) return data;
    for (const limit of (data.limits || [])) {
        if (limit.kind !== 'weekly_scoped' || limit.percent == null) continue;
        const scopeName = limit.scope?.model?.display_name || limit.scope?.surface || 'Scoped';
        const key = 'seven_day_' + scopeName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (!EXTRA_ROW_CONFIG[key]) {
            EXTRA_ROW_CONFIG[key] = { label: `${scopeName} (7d)`, color: 'opus' };
            // Re-insert extra_usage so model rows stay grouped above it
            const extraUsage = EXTRA_ROW_CONFIG.extra_usage;
            delete EXTRA_ROW_CONFIG.extra_usage;
            EXTRA_ROW_CONFIG.extra_usage = extraUsage;
        }
        // Only fill the synthetic field if the legacy field didn't already provide data
        if (!data[key] || data[key].utilization === undefined) {
            data[key] = { utilization: limit.percent, resets_at: limit.resets_at };
        }
    }
    return data;
}

// Format reset date for the "Resets At" column, honoring the user's settings.
// Session (5h): shows time like "3:59 PM" / "15:59".
// Weekly (7d): shows date per weeklyDateFormat ("Mar 13", "Fri Mar 13", or with time).
function formatResetsAt(resetsAt, isWeekly) {
    if (!resetsAt) return '—';
    const date = new Date(resetsAt);
    if (isNaN(date)) return '—';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const timeFormat = settings.timeFormat || '12h';
    const weeklyDateFormat = settings.weeklyDateFormat || 'date';

    const formatTime = (d) => {
        if (timeFormat === '24h') {
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        }
        let hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
    };

    if (isWeekly) {
        const dayStr = days[date.getDay()];
        const monthStr = months[date.getMonth()];
        const dayNum = date.getDate();
        if (weeklyDateFormat === 'date-day') return `${dayStr} ${monthStr} ${dayNum}`;
        if (weeklyDateFormat === 'date-day-time') return `${dayStr} ${monthStr} ${dayNum} ${formatTime(date)}`;
        return `${monthStr} ${dayNum}`; // default: 'date'
    }
    return formatTime(date);
}

// ── Settings ────────────────────────────────────────────────────────────

// Populate the settings controls from stored settings.
async function loadSettings() {
    settings = await window.electronAPI.getSettings();
    const isLinux = window.electronAPI.platform === 'linux';
    const isPortable = window.electronAPI.isPortable;
    const autoStartUnsupported = isLinux || isPortable;

    elements.autoStartToggle.checked = autoStartUnsupported ? false : !!settings.autoStart;
    elements.autoStartToggle.disabled = autoStartUnsupported;
    if (elements.autoStartCol) {
        elements.autoStartCol.classList.toggle('settings-col-disabled', autoStartUnsupported);
    }
    if (elements.autoStartHint) {
        elements.autoStartHint.style.display = autoStartUnsupported ? 'inline' : 'none';
        elements.autoStartHint.textContent = isPortable ? 'Not in portable mode' : 'Not on Linux';
    }

    elements.minimizeToTrayToggle.checked = !!settings.minimizeToTray;
    elements.alwaysOnTopToggle.checked = settings.alwaysOnTop !== false;
    elements.usageAlertsToggle.checked = settings.usageAlerts !== false;
    elements.compactModeToggle.checked = !!settings.compactMode;
    elements.timeFormat.value = settings.timeFormat || '12h';
    elements.weeklyDateFormat.value = settings.weeklyDateFormat || 'date';
    elements.refreshInterval.value = String(settings.refreshInterval || '300');
    elements.warnThreshold.value = settings.warnThreshold ?? 75;
    elements.dangerThreshold.value = settings.dangerThreshold ?? 90;

    warnThreshold = settings.warnThreshold ?? 75;
    dangerThreshold = settings.dangerThreshold ?? 90;

    elements.themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === (settings.theme || 'dark'));
    });
    applyTheme(settings.theme);
}

// Read the settings controls, persist them, and apply immediately.
async function saveSettings() {
    const activeThemeBtn = document.querySelector('.theme-btn.active');
    let warn = parseInt(elements.warnThreshold.value);
    let danger = parseInt(elements.dangerThreshold.value);
    if (isNaN(warn) || warn < 1 || warn > 99) warn = 75;
    if (isNaN(danger) || danger < 1 || danger > 99) danger = 90;
    warnThreshold = warn;
    dangerThreshold = danger;

    const compactToggle = elements.compactModeToggle.checked;
    if (compactToggle !== isCompactMode) {
        applyCompactMode(compactToggle);
    }

    const newSettings = {
        autoStart: (window.electronAPI.platform === 'linux' || window.electronAPI.isPortable)
            ? false : elements.autoStartToggle.checked,
        minimizeToTray: elements.minimizeToTrayToggle.checked,
        alwaysOnTop: elements.alwaysOnTopToggle.checked,
        usageAlerts: elements.usageAlertsToggle.checked,
        compactMode: isCompactMode,
        theme: activeThemeBtn ? activeThemeBtn.dataset.theme : 'dark',
        timeFormat: elements.timeFormat.value || '12h',
        weeklyDateFormat: elements.weeklyDateFormat.value || 'date',
        refreshInterval: elements.refreshInterval.value || '300',
        warnThreshold: warn,
        dangerThreshold: danger
    };

    const result = await window.electronAPI.saveSettings(newSettings);
    settings = (result && result.settings) ? result.settings : newSettings;
    applyTheme(settings.theme);

    // Re-render so new thresholds, time/date format and compact layout take effect
    renderAccounts();
    for (const accountId of Object.keys(latestUsageData)) {
        if (latestUsageData[accountId]) {
            updateAccountUI(accountId, latestUsageData[accountId]);
        }
    }

    // Restart auto-update in case the interval changed
    startAutoUpdate();
}

// Apply the light/dark theme to the document body.
function applyTheme(theme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = !theme || theme === 'dark' || (theme === 'system' && prefersDark);
    document.body.classList.toggle('theme-light', !useDark);
}

// Toggle compact (denser) layout.
function applyCompactMode(compact) {
    isCompactMode = compact;
    document.body.classList.toggle('compact-mode', compact);
    resizeWidget();
}

// Fire desktop notifications when an account crosses the warn/danger thresholds.
// Flags are tracked per account and reset once usage drops back below warn.
function checkUsageAlerts(accountId, data) {
    if (!settings.usageAlerts) return;
    if (!alertFired[accountId]) alertFired[accountId] = {};
    const flags = alertFired[accountId];
    const account = accounts.find(a => a.id === accountId);
    const label = (account && account.nickname) || 'Account';

    const sessionPct = data.five_hour?.utilization || 0;
    const weeklyPct = data.seven_day?.utilization || 0;

    if (sessionPct < warnThreshold) { flags.session_warn = false; flags.session_danger = false; }
    if (weeklyPct < warnThreshold) { flags.weekly_warn = false; flags.weekly_danger = false; }

    if (sessionPct >= dangerThreshold && !flags.session_danger) {
        flags.session_danger = true;
        flags.session_warn = true;
        window.electronAPI.showNotification('Claude Usage Widget', `${label}: session usage at ${Math.round(sessionPct)}% — running low`);
    } else if (sessionPct >= warnThreshold && !flags.session_warn) {
        flags.session_warn = true;
        window.electronAPI.showNotification('Claude Usage Widget', `${label}: session usage reached ${Math.round(sessionPct)}%`);
    }

    if (weeklyPct >= dangerThreshold && !flags.weekly_danger) {
        flags.weekly_danger = true;
        flags.weekly_warn = true;
        window.electronAPI.showNotification('Claude Usage Widget', `${label}: weekly usage at ${Math.round(weeklyPct)}% — running low`);
    } else if (weeklyPct >= warnThreshold && !flags.weekly_warn) {
        flags.weekly_warn = true;
        window.electronAPI.showNotification('Claude Usage Widget', `${label}: weekly usage reached ${Math.round(weeklyPct)}%`);
    }
}

function resizeWidget() {
    // Wait for DOM to update
    setTimeout(() => {
        const container = document.querySelector('.widget-container');
        if (container) {
            // We want the height of the container to determine window size
            // Adding a small buffer for safety
            const height = Math.ceil(container.scrollHeight);
            debugLog('Auto-resizing window to:', height);
            window.electronAPI.resizeWindow(height);
        }
    }, 50);
}

// Track if we've already triggered a refresh for expired timers (per-account)
const sessionResetTriggered = {}; // Map of accountId -> boolean
const weeklyResetTriggered = {}; // Map of accountId -> boolean

function refreshTimers() {
    if (!latestUsageData) return;
    
    // Refresh timers for all accounts
    for (const accountId of Object.keys(latestUsageData)) {
        const data = latestUsageData[accountId];
        if (!data) continue;
        
        // Session data
        const sessionUtilization = data.five_hour?.utilization || 0;
        const sessionResetsAt = data.five_hour?.resets_at;

        // Check if session timer has expired and we need to refresh
        if (sessionResetsAt) {
            const sessionDiff = new Date(sessionResetsAt) - new Date();
            if (sessionDiff <= 0 && !sessionResetTriggered[accountId]) {
                sessionResetTriggered[accountId] = true;
                debugLog('Session timer expired for account', accountId, ', triggering refresh...');
                setTimeout(() => {
                    fetchUsageData(accountId);
                }, 3000);
            } else if (sessionDiff > 0) {
                sessionResetTriggered[accountId] = false;
            }
        }

        // Weekly data
        const weeklyUtilization = data.seven_day?.utilization || 0;
        const weeklyResetsAt = data.seven_day?.resets_at;

        // Check if weekly timer has expired and we need to refresh
        if (weeklyResetsAt) {
            const weeklyDiff = new Date(weeklyResetsAt) - new Date();
            if (weeklyDiff <= 0 && !weeklyResetTriggered[accountId]) {
                weeklyResetTriggered[accountId] = true;
                debugLog('Weekly timer expired for account', accountId, ', triggering refresh...');
                setTimeout(() => {
                    fetchUsageData(accountId);
                }, 3000);
            } else if (weeklyDiff > 0) {
                weeklyResetTriggered[accountId] = false;
            }
        }
    }
}

function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        refreshTimers();
        // Refresh extra timers for all expanded accounts
        for (const account of accounts) {
            const expandToggle = document.querySelector(`.expand-toggle-${account.id}`);
            if (expandToggle && expandToggle.querySelector('.expand-arrow').classList.contains('expanded')) {
                refreshExtraTimersForAccount(account.id);
            }
        }
    }, 30000);
}

// Update progress bar
function updateProgressBar(progressElement, percentageElement, value, isWeekly = false) {
    const percentage = Math.min(Math.max(value, 0), 100);

    progressElement.style.width = `${percentage}%`;
    percentageElement.textContent = `${Math.round(percentage)}%`;

    // Update color based on usage level
    progressElement.classList.remove('warning', 'danger');
    if (percentage >= dangerThreshold) {
        progressElement.classList.add('danger');
    } else if (percentage >= warnThreshold) {
        progressElement.classList.add('warning');
    }
}

// Update circular timer
function updateTimer(timerElement, textElement, resetsAt, totalMinutes) {
    if (!resetsAt) {
        textElement.textContent = '--:--';
        textElement.style.opacity = '0.5';
        textElement.title = 'Starts when a message is sent';
        timerElement.style.strokeDashoffset = 63;
        return;
    }

    // Clear the greyed out styling and tooltip when timer is active
    textElement.style.opacity = '1';
    textElement.title = '';

    const resetDate = new Date(resetsAt);
    const now = new Date();
    const diff = resetDate - now;

    if (diff <= 0) {
        textElement.textContent = 'Resetting...';
        timerElement.style.strokeDashoffset = 0;
        return;
    }

    // Calculate remaining time
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    // const seconds = Math.floor((diff % (1000 * 60)) / 1000); // Optional seconds

    // Format time display
    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        textElement.textContent = `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
        textElement.textContent = `${hours}h ${minutes}m`;
    } else {
        textElement.textContent = `${minutes}m`;
    }

    // Calculate progress (elapsed percentage)
    const totalMs = totalMinutes * 60 * 1000;
    const elapsedMs = totalMs - diff;
    const elapsedPercentage = (elapsedMs / totalMs) * 100;

    // Update circle (63 is ~2*pi*10)
    const circumference = 63;
    const offset = circumference - (elapsedPercentage / 100) * circumference;
    timerElement.style.strokeDashoffset = offset;

    // Update color based on remaining time
    timerElement.classList.remove('warning', 'danger');
    if (elapsedPercentage >= 90) {
        timerElement.classList.add('danger');
    } else if (elapsedPercentage >= 75) {
        timerElement.classList.add('warning');
    }
}

// UI State Management
function showLoginRequired() {
    elements.loadingContainer.style.display = 'none';
    elements.loginContainer.style.display = 'flex';
    elements.noUsageContainer.style.display = 'none';
    elements.mainContent.style.display = 'none';
    // Reset to step 1
    elements.loginStep1.style.display = 'flex';
    elements.loginStep2.style.display = 'none';
    elements.sessionKeyError.textContent = '';
    elements.sessionKeyInput.value = '';
    elements.nicknameInput.value = '';
    stopAutoUpdate();
}

function showNoUsage() {
    elements.loadingContainer.style.display = 'none';
    elements.loginContainer.style.display = 'none';
    elements.noUsageContainer.style.display = 'flex';
    elements.mainContent.style.display = 'none';
}

function showMainContent() {
    elements.loadingContainer.style.display = 'none';
    elements.loginContainer.style.display = 'none';
    elements.noUsageContainer.style.display = 'none';
    elements.mainContent.style.display = 'block';
}

// Auto-update management
function startAutoUpdate() {
    stopAutoUpdate();
    const seconds = parseInt(settings.refreshInterval) || DEFAULT_REFRESH_SECONDS;
    updateInterval = setInterval(() => {
        fetchAllUsageData();
    }, seconds * 1000);
}

function stopAutoUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

// Render accounts in settings overlay
function renderSettingsAccounts() {
    elements.settingsAccountsList.innerHTML = '';
    
    if (accounts.length === 0) {
        elements.settingsAccountsList.innerHTML = '<p class="no-accounts-text">No accounts connected</p>';
        elements.addAccountBtn.style.display = 'block';
        return;
    }
    
    accounts.forEach(account => {
        const accountItem = document.createElement('div');
        accountItem.className = 'account-item';
        accountItem.id = `settings-account-${account.id}`;
        accountItem.innerHTML = `
            <div class="account-info">
                <span class="account-nickname">${account.nickname || 'Account'}</span>
            </div>
            <div class="account-actions">
                <button class="edit-account-btn" data-account-id="${account.id}" title="Edit nickname">
                    Edit
                </button>
                <button class="remove-account-btn" data-account-id="${account.id}" title="Remove account">
                    Remove
                </button>
            </div>
        `;
        elements.settingsAccountsList.appendChild(accountItem);
        
        // Add event listener for edit button
        const editBtn = accountItem.querySelector('.edit-account-btn');
        editBtn.addEventListener('click', () => {
            handleEditNickname(account.id, account.nickname || 'Account');
        });
        
        // Add event listener for remove button
        const removeBtn = accountItem.querySelector('.remove-account-btn');
        removeBtn.addEventListener('click', async () => {
            const accountId = removeBtn.dataset.accountId;
            await handleRemoveAccount(accountId);
        });
    });
    
    // "Add Another Account" button is always available — no cap on account count
    elements.addAccountBtn.style.display = 'block';
}

// Handle nickname editing
async function handleEditNickname(accountId, currentNickname) {
    const accountItem = document.getElementById(`settings-account-${accountId}`);
    if (!accountItem) return;
    
    const accountInfo = accountItem.querySelector('.account-info');
    const accountActions = accountItem.querySelector('.account-actions');
    
    // Replace nickname with input field
    accountInfo.innerHTML = `
        <input type="text" class="edit-nickname-input" value="${currentNickname}" placeholder="Nickname" spellcheck="false" autocomplete="off">
    `;
    
    // Replace action buttons with Save/Cancel
    accountActions.innerHTML = `
        <button class="save-nickname-btn" data-account-id="${accountId}" title="Save nickname">
            Save
        </button>
        <button class="cancel-nickname-btn" data-account-id="${accountId}" title="Cancel">
            Cancel
        </button>
    `;
    
    // Focus input
    const input = accountInfo.querySelector('.edit-nickname-input');
    input.focus();
    input.select();
    
    // Add event listeners
    const saveBtn = accountActions.querySelector('.save-nickname-btn');
    const cancelBtn = accountActions.querySelector('.cancel-nickname-btn');
    
    saveBtn.addEventListener('click', async () => {
        const newNickname = input.value.trim();
        await handleSaveNickname(accountId, newNickname);
    });
    
    cancelBtn.addEventListener('click', () => {
        renderSettingsAccounts();
    });
    
    // Handle Enter key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const newNickname = input.value.trim();
            handleSaveNickname(accountId, newNickname);
        } else if (e.key === 'Escape') {
            renderSettingsAccounts();
        }
    });
}

// Handle saving nickname
async function handleSaveNickname(accountId, nickname) {
    const result = await window.electronAPI.updateNickname(accountId, nickname);
    
    if (result.success) {
        // Update local accounts array
        const accountIndex = accounts.findIndex(acc => acc.id === accountId);
        if (accountIndex !== -1) {
            accounts[accountIndex].nickname = result.account.nickname;
        }
        
        // Re-render settings accounts list
        renderSettingsAccounts();
        
        // Re-render main widget accounts
        renderAccounts();
    } else {
        console.error('Failed to update nickname:', result.error);
        alert('Failed to update nickname: ' + (result.error || 'Unknown error'));
    }
}

// Handle account removal
async function handleRemoveAccount(accountId) {
    const result = await window.electronAPI.removeAccount(accountId);
    
    if (result.success) {
        // Remove account from local state
        accounts = accounts.filter(acc => acc.id !== accountId);
        
        // Remove from usage data map
        delete latestUsageData[accountId];
        
        // Re-render settings accounts list
        renderSettingsAccounts();
        
        // If no accounts left, show login
        if (accounts.length === 0) {
            elements.settingsOverlay.style.display = 'none';
            showLoginRequired();
        } else {
            // Re-render main content accounts
            renderAccounts();
            resizeWidget();
        }
    } else {
        console.error('Failed to remove account:', result.error);
    }
}

// Add spinning animation for refresh button
const style = document.createElement('style');
style.textContent = `
    @keyframes spin-refresh {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .refresh-btn.spinning svg {
        animation: spin-refresh 1s linear;
    }
`;
document.head.appendChild(style);

// Start the application
init();

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    stopAutoUpdate();
    if (countdownInterval) clearInterval(countdownInterval);
});
