// Application state
let accounts = [];
let updateInterval = null;
let countdownInterval = null;
let latestUsageData = {}; // Map of accountId -> usage data
let isExpanded = false;
let expiredAccounts = {}; // Map of accountId -> boolean (true if expired)
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const WIDGET_HEIGHT_COLLAPSED = 140;
const WIDGET_ROW_HEIGHT = 30;
const ACCOUNT_SECTION_HEIGHT = 140; // Height per account section

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
    coffeeBtn: document.getElementById('coffeeBtn')
};

// Initialize
async function init() {
    setupEventListeners();
    accounts = await window.electronAPI.getCredentials();

    if (accounts && accounts.length > 0) {
        showMainContent();
        renderAccounts();
        await fetchAllUsageData();
        startAutoUpdate();
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
    elements.settingsBtn.addEventListener('click', () => {
        renderSettingsAccounts();
        elements.settingsOverlay.style.display = 'flex';
    });

    elements.closeSettingsBtn.addEventListener('click', () => {
        elements.settingsOverlay.style.display = 'none';
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

    try {
        debugLog('Calling electronAPI.fetchUsageData...');
        const data = await window.electronAPI.fetchUsageData(accountId);
        debugLog('Received usage data for account', accountId, ':', data);
        latestUsageData[accountId] = data;
        // Clear expired state if fetch succeeds
        if (expiredAccounts[accountId]) {
            delete expiredAccounts[accountId];
        }
        updateAccountUI(accountId, data);
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
            <!-- Session Usage -->
            <div class="usage-section">
                <span class="usage-label">Current Session</span>
                <div class="progress-bar">
                    <div class="progress-fill session-progress-${account.id}" style="width: 0%"></div>
                </div>
                <span class="usage-percentage session-percentage-${account.id}">0%</span>
                <div class="timer-container">
                    <div class="timer-text session-time-text-${account.id}">--:--</div>
                    <svg class="mini-timer" width="24" height="24" viewBox="0 0 24 24">
                        <circle class="timer-bg" cx="12" cy="12" r="10" />
                        <circle class="timer-progress session-timer-${account.id}" cx="12" cy="12" r="10"
                            style="stroke-dasharray: 63; stroke-dashoffset: 63" />
                    </svg>
                </div>
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
                    <svg class="mini-timer" width="24" height="24" viewBox="0 0 24 24">
                        <circle class="timer-bg" cx="12" cy="12" r="10" />
                        <circle class="timer-progress weekly weekly-timer-${account.id}" cx="12" cy="12" r="10"
                            style="stroke-dasharray: 63; stroke-dashoffset: 63" />
                    </svg>
                </div>
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

    if (sessionProgress && sessionPercentage && sessionTimer && sessionTimeText) {
        updateProgressBar(sessionProgress, sessionPercentage, sessionUtilization);
        updateTimer(sessionTimer, sessionTimeText, sessionResetsAt, 5 * 60);
    }

    // Weekly data
    const weeklyUtilization = data.seven_day?.utilization || 0;
    const weeklyResetsAt = data.seven_day?.resets_at;

    const weeklyProgress = document.querySelector(`.weekly-progress-${accountId}`);
    const weeklyPercentage = document.querySelector(`.weekly-percentage-${accountId}`);
    const weeklyTimer = document.querySelector(`.weekly-timer-${accountId}`);
    const weeklyTimeText = document.querySelector(`.weekly-time-text-${accountId}`);

    if (weeklyProgress && weeklyPercentage && weeklyTimer && weeklyTimeText) {
        updateProgressBar(weeklyProgress, weeklyPercentage, weeklyUtilization, true);
        updateTimer(weeklyTimer, weeklyTimeText, weeklyResetsAt, 7 * 24 * 60);
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

        const row = document.createElement('div');
        row.className = 'usage-section';
        row.innerHTML = `
            <span class="usage-label">${config.label}</span>
            <div class="progress-bar">
                <div class="progress-fill ${colorClass}" style="width: ${Math.min(utilization, 100)}%"></div>
            </div>
            <span class="usage-percentage">${Math.round(utilization)}%</span>
            <div class="timer-container">
                <div class="timer-text extra-timer-${accountId}-${key}" data-resets="${resetsAt || ''}" data-total="${key.includes('seven_day') ? 7 * 24 * 60 : 5 * 60}">--:--</div>
                <svg class="mini-timer" width="24" height="24" viewBox="0 0 24 24">
                    <circle class="timer-bg" cx="12" cy="12" r="10" />
                    <circle class="timer-progress extra-timer-circle-${accountId}-${key} ${colorClass}" cx="12" cy="12" r="10"
                        style="stroke-dasharray: 63; stroke-dashoffset: 63" />
                </svg>
            </div>
        `;

        const progressEl = row.querySelector('.progress-fill');
        if (utilization >= 90) progressEl.classList.add('danger');
        else if (utilization >= 75) progressEl.classList.add('warning');

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

    const timerTexts = extraRowsContainer.querySelectorAll('.timer-text');
    const timerCircles = extraRowsContainer.querySelectorAll('.timer-progress');

    timerTexts.forEach((textEl, i) => {
        const resetsAt = textEl.dataset.resets;
        const totalMinutes = parseInt(textEl.dataset.total);
        const circleEl = timerCircles[i];
        if (resetsAt && circleEl) {
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

function resizeWidget() {
    let totalHeight = 0;
    let hasExpanded = false;
    
    for (const account of accounts) {
        const expandSection = document.querySelector(`.expand-section-${account.id}`);
        const expandArrow = document.querySelector(`.expand-arrow-${account.id}`);
        
        if (expandSection && expandArrow && expandArrow.classList.contains('expanded')) {
            const extraRows = document.querySelector(`.extra-rows-${account.id}`);
            const extraCount = extraRows ? extraRows.children.length : 0;
            totalHeight += ACCOUNT_SECTION_HEIGHT + 12 + (extraCount * WIDGET_ROW_HEIGHT);
            hasExpanded = true;
        } else {
            totalHeight += ACCOUNT_SECTION_HEIGHT;
        }
    }
    
    // Add header height (approx 60px for top controls)
    totalHeight += 60;
    
    window.electronAPI.resizeWindow(totalHeight);
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
    }, 1000);
}

// Update progress bar
function updateProgressBar(progressElement, percentageElement, value, isWeekly = false) {
    const percentage = Math.min(Math.max(value, 0), 100);

    progressElement.style.width = `${percentage}%`;
    percentageElement.textContent = `${Math.round(percentage)}%`;

    // Update color based on usage level
    progressElement.classList.remove('warning', 'danger');
    if (percentage >= 90) {
        progressElement.classList.add('danger');
    } else if (percentage >= 75) {
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
    updateInterval = setInterval(() => {
        fetchAllUsageData();
    }, UPDATE_INTERVAL);
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
        accountItem.innerHTML = `
            <div class="account-info">
                <span class="account-nickname">${account.nickname || 'Account'}</span>
            </div>
            <button class="remove-account-btn" data-account-id="${account.id}" title="Remove account">
                Remove
            </button>
        `;
        elements.settingsAccountsList.appendChild(accountItem);
        
        // Add event listener for remove button
        const removeBtn = accountItem.querySelector('.remove-account-btn');
        removeBtn.addEventListener('click', async () => {
            const accountId = removeBtn.dataset.accountId;
            await handleRemoveAccount(accountId);
        });
    });
    
    // Show "Add Another Account" button if fewer than 2 accounts
    elements.addAccountBtn.style.display = accounts.length < 2 ? 'block' : 'none';
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
