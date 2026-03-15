export function getMainJs(): string {
  return `// main.js - Dashboard page JavaScript logic

// Global variables
let vpsUpdateInterval = null;
let siteUpdateInterval = null;
let serverDataCache = {}; // Cache server data to avoid re-fetching for details
const DEFAULT_VPS_REFRESH_INTERVAL_MS = 60000; // Default to 60 seconds for VPS data if backend setting fails
const DEMO_AVAILABILITY = {
    'edge-sin-01': 99.8,
    'db-core-02': 98.9,
    'cdn-usw-03': 99.4
};
const demoState = { servers: false, sites: false };
let demoNoticeShown = false;

// ==================== Unified API Request Utilities ====================

// Get authentication headers
function getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}

// Unified API request function (for authenticated requests)
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: getAuthHeaders(),
        ...options
    };

    try {
        const response = await fetch(url, defaultOptions);

        // Handle authentication failure
        if (response.status === 401) {
            localStorage.removeItem('auth_token');
            if (window.location.pathname !== '/login.html') {
                window.location.href = 'login.html';
            }
            throw new Error('Authentication failed, please log in again');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || \`Request failed (\${response.status})\`);
        }

        return await response.json();
    } catch (error) {
                throw error;
    }
}

// Public API request function (for unauthenticated requests)
async function publicApiRequest(url, options = {}) {
    const defaultOptions = {
        headers: getAuthHeaders(), // Still send token if available, but not required
        ...options
    };

    try {
        const response = await fetch(url, defaultOptions);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || \`Request failed (\${response.status})\`);
        }

        return await response.json();
    } catch (error) {
                throw error;
    }
}

function updateDemoBanner() {
    const banner = document.getElementById('demoModeBanner');
    if (!banner) return;

    const active = [];
    if (demoState.servers) active.push('VPS');
    if (demoState.sites) active.push('Website');

    if (active.length === 0) {
        banner.classList.add('d-none');
        return;
    }

    banner.classList.remove('d-none');
    banner.textContent = 'DEMO MODE: showing mock ' + active.join(' + ') + ' data';
}

function setDemoSource(source, enabled, reason = '') {
    demoState[source] = enabled;
    updateDemoBanner();

    if (enabled && !demoNoticeShown) {
        showToast('info', reason || 'Demo mode enabled. Showing virtual monitoring data.');
        demoNoticeShown = true;
    }
}

function buildDemoServerStatuses() {
    const now = Math.floor(Date.now() / 1000);
    return [
        {
            server: { id: 'edge-sin-01', name: 'edge-singapore-01', description: 'Public edge gateway' },
            metrics: {
                timestamp: now - 32,
                cpu: { usage_percent: 31.2, load_avg: [0.62, 0.58, 0.54] },
                memory: { total: 8388608, used: 3523215, free: 4865393, usage_percent: 42.0 },
                disk: { total: 320.0, used: 116.4, free: 203.6, usage_percent: 36.4 },
                network: { upload_speed: 182432, download_speed: 624112, total_upload: 4520182421, total_download: 13924019231 },
                uptime: 983421
            },
            error: false
        },
        {
            server: { id: 'db-core-02', name: 'db-core-02', description: 'Primary telemetry storage' },
            metrics: {
                timestamp: now - 58,
                cpu: { usage_percent: 57.8, load_avg: [1.12, 0.96, 0.83] },
                memory: { total: 16777216, used: 10821304, free: 5955912, usage_percent: 64.5 },
                disk: { total: 512.0, used: 386.6, free: 125.4, usage_percent: 75.5 },
                network: { upload_speed: 84531, download_speed: 184224, total_upload: 12902422011, total_download: 32210477001 },
                uptime: 2469011
            },
            error: false
        },
        {
            server: { id: 'cdn-usw-03', name: 'cdn-us-west-03', description: 'Traffic relay node' },
            metrics: {
                timestamp: now - 19,
                cpu: { usage_percent: 23.4, load_avg: [0.41, 0.39, 0.34] },
                memory: { total: 4194304, used: 1572864, free: 2621440, usage_percent: 37.5 },
                disk: { total: 160.0, used: 47.2, free: 112.8, usage_percent: 29.5 },
                network: { upload_speed: 95412, download_speed: 301993, total_upload: 2194012931, total_download: 9114023122 },
                uptime: 603522
            },
            error: false
        }
    ];
}

function buildSiteHistory(pattern = 'steady') {
    const now = Math.floor(Date.now() / 1000);
    const history = [];

    for (let i = 0; i < 24; i++) {
        const timestamp = now - i * 3600;
        let status = 'UP';
        let statusCode = 200;
        let response = 120 + (i % 7) * 10;

        if (pattern === 'sporadic' && (i === 7 || i === 18)) {
            status = 'DOWN';
            statusCode = 502;
            response = 0;
        }

        if (pattern === 'slow' && (i % 6 === 0)) {
            status = 'TIMEOUT';
            statusCode = 504;
            response = 10000;
        }

        history.push({
            timestamp,
            status,
            status_code: statusCode,
            response_time_ms: response
        });
    }

    return history;
}

function buildDemoSites() {
    const now = Math.floor(Date.now() / 1000);
    return [
        {
            id: 'site-docs',
            name: 'docs.service.internal',
            url: 'https://docs.service.internal',
            last_status: 'UP',
            last_status_code: 200,
            last_response_time_ms: 132,
            last_checked: now - 80,
            history: buildSiteHistory('steady')
        },
        {
            id: 'site-api',
            name: 'api-gateway.service.internal',
            url: 'https://api-gateway.service.internal',
            last_status: 'DOWN',
            last_status_code: 502,
            last_response_time_ms: 0,
            last_checked: now - 130,
            history: buildSiteHistory('sporadic')
        },
        {
            id: 'site-assets',
            name: 'assets-edge.service.internal',
            url: 'https://assets-edge.service.internal',
            last_status: 'TIMEOUT',
            last_status_code: 504,
            last_response_time_ms: 10000,
            last_checked: now - 170,
            history: buildSiteHistory('slow')
        }
    ];
}

function buildDemoChartHistory(serverId) {
    const now = Math.floor(Date.now() / 1000);
    const pointCount = 49; // 12h, sampled every 15 minutes
    const intervalSeconds = 15 * 60;

    const profiles = {
        'edge-sin-01': { cpu: 33, memory: 42, disk: 36, upload: 182000, download: 620000 },
        'db-core-02': { cpu: 58, memory: 65, disk: 75, upload: 84000, download: 185000 },
        'cdn-usw-03': { cpu: 24, memory: 38, disk: 30, upload: 95000, download: 302000 },
    };
    const profile = profiles[serverId] || { cpu: 44, memory: 57, disk: 63, upload: 128000, download: 286000 };

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const round1 = value => Math.round(value * 10) / 10;
    const history = [];

    for (let idx = 0; idx < pointCount; idx++) {
        const timestamp = now - (pointCount - 1 - idx) * intervalSeconds;
        const waveFast = Math.sin((idx / pointCount) * Math.PI * 4);
        const waveSlow = Math.cos((idx / pointCount) * Math.PI * 2.2);

        const cpu = clamp(profile.cpu + waveFast * 8 + waveSlow * 3, 8, 96);
        const memory = clamp(profile.memory + waveFast * 4 + waveSlow * 2.2, 15, 97);
        const disk = clamp(profile.disk + waveSlow * 2.8, 8, 98);

        const uploadSpeed = Math.max(0, Math.round(profile.upload * (1 + waveFast * 0.24 + waveSlow * 0.08)));
        const downloadSpeed = Math.max(0, Math.round(profile.download * (1 + waveFast * 0.3 + waveSlow * 0.1)));

        history.push({
            timestamp,
            cpu: { usage_percent: round1(cpu) },
            memory: { usage_percent: round1(memory) },
            disk: { usage_percent: round1(disk) },
            network: {
                upload_speed: uploadSpeed,
                download_speed: downloadSpeed,
            },
        });
    }

    return history;
}

// Function to fetch VPS refresh interval and start periodic VPS data updates
async function initializeVpsDataUpdates() {
        let vpsRefreshIntervalMs = DEFAULT_VPS_REFRESH_INTERVAL_MS;

    try {
                const data = await publicApiRequest('/api/admin/settings/vps-report-interval');
                if (data && typeof data.interval === 'number' && data.interval > 0) {
            vpsRefreshIntervalMs = data.interval * 1000; // Convert seconds to milliseconds
                    } else {
            // Use default value
        }
    } catch (error) {
            }

    // Clear existing interval if any
    if (vpsUpdateInterval) {
                clearInterval(vpsUpdateInterval);
    }

    // VPS data refreshes at the rate set in admin settings
        vpsUpdateInterval = setInterval(() => {
                loadAllServerStatuses();
    }, vpsRefreshIntervalMs);

    }

// Website status refreshes once per hour
function initializeSiteDataUpdates() {
    const hourlyRefreshInterval = 60 * 60 * 1000; // 1 hour
        // Clear any existing auto-refresh interval
    if (siteUpdateInterval) {
        clearInterval(siteUpdateInterval);
    }

    // Set hourly refresh
    siteUpdateInterval = setInterval(() => {
                loadAllSiteStatuses();
    }, hourlyRefreshInterval);

    }

// Removed manual refresh button code, replaced with auto-refresh

// Execute after the page loads (only for main page)
document.addEventListener('DOMContentLoaded', function() {
        // Check if we're on the main page by looking for the server table
    const serverTableBody = document.getElementById('serverTableBody');
    if (!serverTableBody) {
        // Not on the main page, only initialize theme
                initializeTheme();
        return;
    }

        // Initialize theme
    initializeTheme();

    // Load initial data
    loadAllServerStatuses();
    loadAllSiteStatuses();

    // Initialize periodic updates separately
        initializeVpsDataUpdates();
        initializeSiteDataUpdates();

    // Add click event listener to the table body for row expansion
    serverTableBody.addEventListener('click', handleRowClick);

    // Check login status and update admin link
    updateAdminLink();
});

// --- Theme Management ---
const THEME_KEY = 'vps-status-theme';
const LIGHT_THEME = 'light';
const DARK_THEME = 'dark';

function initializeTheme() {
    const themeToggler = document.getElementById('themeToggler');
    if (!themeToggler) return;

    const storedTheme = localStorage.getItem(THEME_KEY) || LIGHT_THEME;
    applyTheme(storedTheme);

    themeToggler.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
        applyTheme(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    const themeTogglerIcon = document.querySelector('#themeToggler i');
    if (themeTogglerIcon) {
        if (theme === DARK_THEME) {
            themeTogglerIcon.classList.remove('bi-moon-stars-fill');
            themeTogglerIcon.classList.add('bi-sun-fill');
        } else {
            themeTogglerIcon.classList.remove('bi-sun-fill');
            themeTogglerIcon.classList.add('bi-moon-stars-fill');
        }
    }
}
// --- End Theme Management ---

// Check login status and update the admin link in the navbar
async function updateAdminLink() {
    const adminLink = document.getElementById('adminAuthLink');
    if (!adminLink) return; // Exit if link not found

    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            // Not logged in (no token)
            adminLink.textContent = 'Admin Login';
            adminLink.href = '/login.html';
            return;
        }

        const data = await publicApiRequest('/api/auth/status');
        if (data.authenticated) {
            // Logged in
            adminLink.textContent = 'Admin Panel';
            adminLink.href = '/admin.html';
        } else {
            // Invalid token or not authenticated
            adminLink.textContent = 'Admin Login';
            adminLink.href = '/login.html';
            localStorage.removeItem('auth_token'); // Clean up invalid token
        }
    } catch (error) {
                // Network error, assume not logged in
        adminLink.textContent = 'Admin Login';
        adminLink.href = '/login.html';
    }
}


// Handle click on a server row
function handleRowClick(event) {
    const clickedRow = event.target.closest('tr.server-row');
    if (!clickedRow) return; // Not a server row

    const serverId = clickedRow.getAttribute('data-server-id');
    const detailsRow = clickedRow.nextElementSibling; // The details row is the next sibling

    if (detailsRow && detailsRow.classList.contains('server-details-row')) {
        // Toggle visibility
        detailsRow.classList.toggle('d-none');

        // If showing, populate with detailed data
        if (!detailsRow.classList.contains('d-none')) {
            populateDetailsRow(serverId, detailsRow);
        }
    }
}

// Populate the detailed row with data
async function populateDetailsRow(serverId, detailsRow) {
    const serverData = serverDataCache[serverId];
    const detailsContentDiv = detailsRow.querySelector('.server-details-content');

    if (!serverData || !serverData.metrics || !detailsContentDiv) {
        detailsContentDiv.innerHTML = '<p class="text-muted">No detailed data available</p>';
        return;
    }

    const metrics = serverData.metrics;

    let detailsHtml = '';

    // CPU Details - show usage % prominently, then load averages
    if (metrics.cpu) {
        const usagePct = typeof metrics.cpu.usage_percent === 'number' ? metrics.cpu.usage_percent.toFixed(1) + '%' : '-';
        const loadAvgStr = metrics.cpu.load_avg ? metrics.cpu.load_avg.join(' / ') : '-';
        detailsHtml += \`
            <div class="detail-item">
                <strong class="detail-title">CPU</strong>
                <div class="detail-line">
                    <span class="detail-label">Usage</span>
                    <span class="detail-metric">\${usagePct}</span>
                </div>
                <div class="detail-line detail-line-load">
                    <span class="detail-label">
                        <span class="detail-label-main">Load Avg</span>
                        <span class="detail-label-sub">(1m/5m/15m)</span>
                    </span>
                    <span class="detail-metric">\${loadAvgStr}</span>
                </div>
            </div>
        \`;
    }

    // Memory Details
    if (metrics.memory) {
        detailsHtml += \`
            <div class="detail-item">
                <strong class="detail-title">Memory</strong>
                <div class="detail-line">
                    <span class="detail-label">Total Memory</span>
                    <span class="detail-metric">\${formatDataSize(metrics.memory.total * 1024)}</span>
                </div>
                <div class="detail-line">
                    <span class="detail-label">Used Memory</span>
                    <span class="detail-metric">\${formatDataSize(metrics.memory.used * 1024)}</span>
                </div>
                <div class="detail-line">
                    <span class="detail-label">Free Memory</span>
                    <span class="detail-metric">\${formatDataSize(metrics.memory.free * 1024)}</span>
                </div>
            </div>
        \`;
    }

    // Disk Details
    if (metrics.disk) {
         detailsHtml += \`
            <div class="detail-item">
                <strong class="detail-title">Disk (/)</strong>
                <div class="detail-line">
                    <span class="detail-label">Total Storage</span>
                    <span class="detail-metric">\${typeof metrics.disk.total === 'number' ? metrics.disk.total.toFixed(2) : '-'} GB</span>
                </div>
                <div class="detail-line">
                    <span class="detail-label">Used Storage</span>
                    <span class="detail-metric">\${typeof metrics.disk.used === 'number' ? metrics.disk.used.toFixed(2) : '-'} GB</span>
                </div>
                <div class="detail-line">
                    <span class="detail-label">Free Storage</span>
                    <span class="detail-metric">\${typeof metrics.disk.free === 'number' ? metrics.disk.free.toFixed(2) : '-'} GB</span>
                </div>
            </div>
        \`;
    }

    // Network Totals (with async 12h delta below)
    if (metrics.network) {
        detailsHtml += \`
            <div class="detail-item">
                <strong class="detail-title">Total Traffic</strong>
                <div class="detail-line">
                    <span class="detail-label">Total Upload</span>
                    <span class="detail-metric">\${formatDataSize(metrics.network.total_upload)}</span>
                </div>
                <div class="detail-line">
                    <span class="detail-label">Total Download</span>
                    <span class="detail-metric">\${formatDataSize(metrics.network.total_download)}</span>
                </div>
                <span class="detail-note" id="traffic12h-\${serverId}">Loading 12h data…</span>
            </div>
        \`;
    }

    detailsContentDiv.innerHTML = detailsHtml || '<p class="text-muted">No detailed data available</p>';

    // Async: compute 12h traffic delta from history
    if (metrics.network) {
        try {
            const result = await publicApiRequest(\`/api/history/\${serverId}\`);
            const history = (result.history || []).filter(h => h.network);
            const el = detailsContentDiv.querySelector(\`#traffic12h-\${serverId}\`);
            if (el) {
                if (history.length >= 2) {
                    const oldest = history[0];
                    const newest = history[history.length - 1];
                    const ulDelta = newest.network.total_upload - oldest.network.total_upload;
                    const dlDelta = newest.network.total_download - oldest.network.total_download;
                    const hrs = Math.max(1, Math.round((newest.timestamp - oldest.timestamp) / 3600));
                    if (ulDelta >= 0 && dlDelta >= 0) {
                        el.textContent = \`\${hrs}h: ↑ \${formatDataSize(ulDelta)} / ↓ \${formatDataSize(dlDelta)}\`;
                    } else {
                        el.textContent = 'Cumulative since boot';
                    }
                } else {
                    el.textContent = 'Cumulative since boot';
                }
            }
        } catch {
            const el = detailsContentDiv.querySelector(\`#traffic12h-\${serverId}\`);
            if (el) el.textContent = 'Cumulative since boot';
        }
    }
}


// Load all server statuses
async function loadAllServerStatuses() {
        try {
        // Use batch API to fetch all VPS statuses at once
        let batchData;
        try {
            batchData = await publicApiRequest('/api/status/batch');
        } catch (error) {
            // If batch API fails, database may not be initialized, attempt initialization
                        await publicApiRequest('/api/init-db');
            batchData = await publicApiRequest('/api/status/batch');
        }

        let allStatuses = batchData.servers || [];
        const noServersAlert = document.getElementById('noServers');

        if (allStatuses.length === 0) {
            allStatuses = buildDemoServerStatuses();
            if (noServersAlert) {
                noServersAlert.textContent = 'No real VPS data yet. Showing demo nodes.';
                noServersAlert.classList.remove('d-none');
            }
            setDemoSource('servers', true, 'No real VPS data found. Showing demo data.');
        } else {
            if (noServersAlert) noServersAlert.classList.add('d-none');
            setDemoSource('servers', false);
        }

        // Update the serverDataCache with the latest data
        allStatuses.forEach(data => {
             serverDataCache[data.server.id] = data;
        });

        // 3. Render the table using DOM manipulation
        renderServerTable(allStatuses);

    } catch (error) {
        const noServersAlert = document.getElementById('noServers');
        if (noServersAlert) {
            noServersAlert.textContent = 'Backend unreachable. Showing demo VPS data.';
            noServersAlert.classList.remove('d-none');
        }

        const demoStatuses = buildDemoServerStatuses();
        demoStatuses.forEach(data => {
            serverDataCache[data.server.id] = data;
        });
        renderServerTable(demoStatuses);
        setDemoSource('servers', true, 'API unavailable. Showing demo data.');
    }
}

// Generate progress bar HTML
function getProgressBarHtml(percentage) {
    if (typeof percentage !== 'number' || isNaN(percentage)) return '-';
    const percent = Math.max(0, Math.min(100, percentage)); // Ensure percentage is between 0 and 100
    let barClass;

    if (percent >= 80) {
        barClass = 'progress-bar-bad'; // Red for >= 80%
    } else if (percent >= 50) {
        barClass = 'progress-bar-warn'; // Yellow for 50-79%
    } else {
        barClass = 'progress-bar-ok'; // Blue/accent for < 50%
    }

    return \`
        <div style="min-width: 90px;">
            <div class="progress" style="height: 8px;">
                <div class="progress-bar \${barClass}" role="progressbar" style="width: \${percent}%;" aria-valuenow="\${percent}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <div class="progress-text text-end">\${percent.toFixed(1)}%</div>
        </div>
    \`;
}


// Mobile helper functions
function getServerStatusBadge(status) {
    if (status === 'online') {
        return { class: 'status-badge status-online', text: 'ACTIVE' };
    } else if (status === 'offline') {
        return { class: 'status-badge status-offline', text: 'OFFLINE' };
    } else if (status === 'error') {
        return { class: 'bg-warning text-dark', text: 'Error' };
    } else {
        return { class: 'status-badge bg-secondary bg-opacity-25 text-white', text: 'UNKNOWN' };
    }
}


// Mobile server card rendering function
function renderMobileServerCards(allStatuses) {
    const mobileContainer = document.getElementById('mobileServerContainer');
    if (!mobileContainer) return;

    mobileContainer.innerHTML = '';

    if (!allStatuses || allStatuses.length === 0) {
        mobileContainer.innerHTML = \`
            <div class="text-center p-4">
                <i class="bi bi-server text-muted" style="font-size: 3rem;"></i>
                <div class="mt-3 text-muted">
                    <h6>No server data</h6>
                    <small>Please log in to the admin panel to add servers</small>
                </div>
            </div>
        \`;
        return;
    }

    allStatuses.forEach(data => {
        const serverId = data.server.id;
        const serverName = data.server.name;
        const metrics = data.metrics;
        const hasError = data.error;

        const card = document.createElement('div');
        card.className = 'mobile-server-card';
        card.setAttribute('data-server-id', serverId);

        // Determine server status
        let status = 'unknown';
        let lastUpdate = 'Never';

        if (hasError) {
            status = 'error';
        } else if (metrics) {
            const now = new Date();
            const lastReportTime = new Date(metrics.timestamp * 1000);
            const diffMinutes = (now - lastReportTime) / (1000 * 60);

            if (diffMinutes <= 5) {
                status = 'online';
            } else {
                status = 'offline';
            }
            lastUpdate = lastReportTime.toLocaleString();
        }

        const statusInfo = getServerStatusBadge(status);

        // Card header
        const cardHeader = document.createElement('div');
        cardHeader.className = 'mobile-card-header';
        cardHeader.innerHTML = \`
            <div style="flex: 1;"></div>
            <h6 class="mobile-card-title text-center" style="flex: 1;">\${serverName || 'Unnamed Server'}</h6>
            <div style="flex: 1; display: flex; justify-content: flex-end;">
                <span class="badge \${statusInfo.class}">\${statusInfo.text}</span>
            </div>
        \`;

        // Card body - show all info
        const cardBody = document.createElement('div');
        cardBody.className = 'mobile-card-body';

        // Get all data
        const cpuValue = metrics && metrics.cpu && typeof metrics.cpu.usage_percent === 'number' ? \`\${metrics.cpu.usage_percent.toFixed(1)}%\` : '-';
        const memoryValue = metrics && metrics.memory && typeof metrics.memory.usage_percent === 'number' ? \`\${metrics.memory.usage_percent.toFixed(1)}%\` : '-';
        const diskValue = metrics && metrics.disk && typeof metrics.disk.usage_percent === 'number' ? \`\${metrics.disk.usage_percent.toFixed(1)}%\` : '-';
        const uptimeValue = metrics && metrics.uptime ? formatUptime(metrics.uptime) : '-';
        const uploadSpeed = metrics && metrics.network ? formatNetworkSpeed(metrics.network.upload_speed) : '-';
        const downloadSpeed = metrics && metrics.network ? formatNetworkSpeed(metrics.network.download_speed) : '-';
        const totalUpload = metrics && metrics.network ? formatDataSize(metrics.network.total_upload) : '-';
        const totalDownload = metrics && metrics.network ? formatDataSize(metrics.network.total_download) : '-';

        // Upload speed | Download speed
        const speedRow = document.createElement('div');
        speedRow.className = 'mobile-card-two-columns';
        speedRow.innerHTML = \`
            <div class="mobile-card-column-item">
                <span class="mobile-card-label">Upload Speed</span>
                <span class="mobile-card-value">\${uploadSpeed}</span>
            </div>
            <div class="mobile-card-column-item">
                <span class="mobile-card-label">Download Speed</span>
                <span class="mobile-card-value">\${downloadSpeed}</span>
            </div>
        \`;
        cardBody.appendChild(speedRow);

        // CPU | Memory
        const cpuMemoryRow = document.createElement('div');
        cpuMemoryRow.className = 'mobile-card-two-columns';
        cpuMemoryRow.innerHTML = \`
            <div class="mobile-card-column-item">
                <span class="mobile-card-label">CPU</span>
                <span class="mobile-card-value">\${cpuValue}</span>
            </div>
            <div class="mobile-card-column-item">
                <span class="mobile-card-label">Memory</span>
                <span class="mobile-card-value">\${memoryValue}</span>
            </div>
        \`;
        cardBody.appendChild(cpuMemoryRow);

        // Disk | Uptime
        const diskUptimeRow = document.createElement('div');
        diskUptimeRow.className = 'mobile-card-two-columns';
        diskUptimeRow.innerHTML = \`
            <div class="mobile-card-column-item">
                <span class="mobile-card-label">Disk</span>
                <span class="mobile-card-value">\${diskValue}</span>
            </div>
            <div class="mobile-card-column-item">
                <span class="mobile-card-label">Uptime</span>
                <span class="mobile-card-value">\${uptimeValue}</span>
            </div>
        \`;
        cardBody.appendChild(diskUptimeRow);

        // Total upload | Total download
        const totalRow = document.createElement('div');
        totalRow.className = 'mobile-card-two-columns';
        totalRow.innerHTML = \`
            <div class="mobile-card-column-item">
                <span class="mobile-card-label">Total Upload</span>
                <span class="mobile-card-value">\${totalUpload}</span>
            </div>
            <div class="mobile-card-column-item">
                <span class="mobile-card-label">Total Download</span>
                <span class="mobile-card-value">\${totalDownload}</span>
            </div>
        \`;
        cardBody.appendChild(totalRow);

        // Last updated - single row
        const lastUpdateRow = document.createElement('div');
        lastUpdateRow.className = 'mobile-card-row';
        lastUpdateRow.innerHTML = \`
            <span class="mobile-card-label">Last Updated</span>
            <span class="mobile-card-value mobile-card-meta">\${lastUpdate}</span>
        \`;
        cardBody.appendChild(lastUpdateRow);

        const chartRow = document.createElement('div');
        chartRow.className = 'mobile-card-row mobile-card-action-row';
        chartRow.innerHTML = \`
            <button class="btn btn-sm mobile-chart-btn" data-server-id="\${serverId}" data-server-name="\${serverName || 'Server'}">
                <i class="bi bi-graph-up-arrow"></i> 12h Charts
            </button>
        \`;
        cardBody.appendChild(chartRow);

        // Assemble card
        card.appendChild(cardHeader);
        card.appendChild(cardBody);

        mobileContainer.appendChild(card);
    });

    document.querySelectorAll('.mobile-chart-btn').forEach(btn => {
        btn.addEventListener('click', function(event) {
            event.stopPropagation();
            const sid = this.getAttribute('data-server-id');
            const sname = this.getAttribute('data-server-name') || 'Server';
            if (sid) openChartsModal(sid, sname);
        });
    });
}

// Mobile website card rendering function
function renderMobileSiteCards(sites) {
    const mobileContainer = document.getElementById('mobileSiteContainer');
    if (!mobileContainer) return;

    mobileContainer.innerHTML = '';

    if (!sites || sites.length === 0) {
        mobileContainer.innerHTML = \`
            <div class="text-center p-4">
                <i class="bi bi-globe text-muted" style="font-size: 3rem;"></i>
                <div class="mt-3 text-muted">
                    <h6>No monitored websites</h6>
                    <small>Please log in to the admin panel to add websites</small>
                </div>
            </div>
        \`;
        return;
    }

    sites.forEach(site => {
        const card = document.createElement('div');
        card.className = 'mobile-site-card';

        const statusInfo = getSiteStatusBadge(site.last_status);
        const lastCheckTime = site.last_checked ? new Date(site.last_checked * 1000).toLocaleString() : 'Never';
        const responseTime = site.last_response_time_ms !== null ? \`\${site.last_response_time_ms} ms\` : '-';

        // Card header
        const cardHeader = document.createElement('div');
        cardHeader.className = 'mobile-card-header';
        cardHeader.innerHTML = \`
            <div style="flex: 1;"></div>
            <h6 class="mobile-card-title text-center" style="flex: 1;">\${site.name || 'Unnamed Website'}</h6>
            <div style="flex: 1; display: flex; justify-content: flex-end;">
                <span class="badge \${statusInfo.class}">\${statusInfo.text}</span>
            </div>
        \`;

        // Card body
        const cardBody = document.createElement('div');
        cardBody.className = 'mobile-card-body';

                // Site info - two column layout
        const statusCode = site.last_status_code || '-';

        // Status code | Response time
        const statusResponseRow = document.createElement('div');
        statusResponseRow.className = 'mobile-card-two-columns';
        statusResponseRow.innerHTML = \`
            <div class="mobile-card-column-item">
                <span class="mobile-card-label">Status Code</span>
                <span class="mobile-card-value">\${statusCode}</span>
            </div>
            <div class="mobile-card-column-item">
                <span class="mobile-card-label">Response Time</span>
                <span class="mobile-card-value">\${responseTime}</span>
            </div>
        \`;
        cardBody.appendChild(statusResponseRow);

        // Last checked - single row
        const lastCheckRow = document.createElement('div');
        lastCheckRow.className = 'mobile-card-row';
        lastCheckRow.innerHTML = \`
            <span class="mobile-card-label">Last Checked</span>
            <span class="mobile-card-value mobile-card-meta">\${lastCheckTime}</span>
        \`;
        cardBody.appendChild(lastCheckRow);

        // 24h history bars - always shown even when no data
        const historyContainer = document.createElement('div');
        historyContainer.className = 'mobile-history-container mobile-card-row mobile-history-row';
        historyContainer.innerHTML = \`
            <div class="mobile-history-label">24h History</div>
            <div class="history-bar-container mobile-history-bars"></div>
        \`;
        cardBody.appendChild(historyContainer);

        // Render history bars using unified function
        const historyBarContainer = historyContainer.querySelector('.history-bar-container');
        renderSiteHistoryBar(historyBarContainer, site.history || []);

        // Assemble card
        card.appendChild(cardHeader);
        card.appendChild(cardBody);

        mobileContainer.appendChild(card);
    });
}





// Render the server table using DOM manipulation
function renderServerTable(allStatuses) {
    const tableBody = document.getElementById('serverTableBody');
    const detailsTemplate = document.getElementById('serverDetailsTemplate');

    // 1. Store IDs of currently expanded servers
    const expandedServerIds = new Set();
    // Iterate over main server rows to find their expanded detail rows
    tableBody.querySelectorAll('tr.server-row').forEach(mainRow => {
        const detailRow = mainRow.nextElementSibling;
        if (detailRow && detailRow.classList.contains('server-details-row') && !detailRow.classList.contains('d-none')) {
            const serverId = mainRow.getAttribute('data-server-id');
            if (serverId) {
                expandedServerIds.add(serverId);
            }
        }
    });

    tableBody.innerHTML = ''; // Clear existing rows

    allStatuses.forEach(data => {
        const serverId = data.server.id;
        const serverName = data.server.name;
        const metrics = data.metrics;
        const hasError = data.error;

        let statusBadge = '<span class="status-badge bg-secondary bg-opacity-25 text-white">UNKNOWN</span>';
        let cpuHtml = '-';
        let memoryHtml = '-';
        let diskHtml = '-';
        let uploadSpeed = '-';
        let downloadSpeed = '-';
        let uptime = '-';
        let lastUpdate = '-';

        if (hasError) {
            statusBadge = '<span class="status-badge bg-warning bg-opacity-25 text-warning">ERROR</span>';
        } else if (metrics) {
            const now = new Date();
            const lastReportTime = new Date(metrics.timestamp * 1000);
            const diffMinutes = (now - lastReportTime) / (1000 * 60);

            if (diffMinutes <= 5) { // Considered online within 5 minutes
                statusBadge = '<span class="status-badge status-online">ACTIVE</span>';
            } else {
                statusBadge = '<span class="status-badge status-offline">OFFLINE</span>';
            }

            cpuHtml = getProgressBarHtml(metrics.cpu.usage_percent);
            memoryHtml = getProgressBarHtml(metrics.memory.usage_percent);
            diskHtml = getProgressBarHtml(metrics.disk.usage_percent);
            uploadSpeed = formatNetworkSpeed(metrics.network.upload_speed);
            downloadSpeed = formatNetworkSpeed(metrics.network.download_speed);
            uptime = metrics.uptime ? formatUptime(metrics.uptime) : '-';
            lastUpdate = lastReportTime.toLocaleString();
        }

        // Create the main row
        const mainRow = document.createElement('tr');
        mainRow.classList.add('server-row');
        mainRow.setAttribute('data-server-id', serverId);
        mainRow.innerHTML = \`
            <td class="server-name-cell">
                \${serverName}
                <button class="chart-trigger-btn" data-server-id="\${serverId}" data-server-name="\${serverName}" title="View 12h charts" onclick="event.stopPropagation(); openChartsModal('\${serverId}', '\${serverName}')">
                    <i class="bi bi-graph-up"></i><span>12h</span>
                </button>
            </td>
            <td class="metric-cell">\${statusBadge}</td>
            <td class="metric-cell">\${cpuHtml}</td>
            <td class="metric-cell">\${memoryHtml}</td>
            <td class="metric-cell">\${diskHtml}</td>
            <td class="metric-cell">\${uploadSpeed}</td>
            <td class="metric-cell">\${downloadSpeed}</td>
            <td class="metric-cell">\${uptime}</td>
            <td class="metric-cell">\${lastUpdate}</td>
            <td id="avail-\${serverId}" class="availability-cell"><span class="text-muted small">-</span></td>
        \`;

        // Clone the details row template
        const detailsRowElement = detailsTemplate.content.cloneNode(true).querySelector('tr');

        tableBody.appendChild(mainRow);
        tableBody.appendChild(detailsRowElement);

        // 2. If this server was previously expanded, re-expand it and populate its details
        if (expandedServerIds.has(serverId)) {
            detailsRowElement.classList.remove('d-none');
            populateDetailsRow(serverId, detailsRowElement); // Populate content
        }
    });

    // 3. Also render mobile cards
    renderMobileServerCards(allStatuses);

    // 4. Load availability data for each server asynchronously
    loadServerAvailability(allStatuses);
}


// Format network speed
function formatNetworkSpeed(bytesPerSecond) {
    if (typeof bytesPerSecond !== 'number' || isNaN(bytesPerSecond)) return '-';
    if (bytesPerSecond < 1024) {
        return \`\${bytesPerSecond.toFixed(1)} B/s\`;
    } else if (bytesPerSecond < 1024 * 1024) {
        return \`\${(bytesPerSecond / 1024).toFixed(1)} KB/s\`;
    } else if (bytesPerSecond < 1024 * 1024 * 1024) {
        return \`\${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s\`;
    } else {
        return \`\${(bytesPerSecond / (1024 * 1024 * 1024)).toFixed(1)} GB/s\`;
    }
}

// Format data size
function formatDataSize(bytes) {
    if (typeof bytes !== 'number' || isNaN(bytes)) return '-';
    if (bytes < 1024) {
        return \`\${bytes.toFixed(1)} B\`;
    } else if (bytes < 1024 * 1024) {
        return \`\${(bytes / 1024).toFixed(1)} KB\`;
    } else if (bytes < 1024 * 1024 * 1024) {
        return \`\${(bytes / (1024 * 1024)).toFixed(1)} MB\`;
    } else if (bytes < 1024 * 1024 * 1024 * 1024) {
        return \`\${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB\`;
    } else {
        return \`\${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TB\`;
    }
}

// Format uptime from seconds to a human-readable string
function formatUptime(totalSeconds) {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
        return '-';
    }

    const days = Math.floor(totalSeconds / (3600 * 24));
    totalSeconds %= (3600 * 24);
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);

    let uptimeString = '';
    if (days > 0) {
        uptimeString += \`\${days}d \`;
    }
    if (hours > 0) {
        uptimeString += \`\${hours}h \`;
    }
    if (minutes > 0 || (days === 0 && hours === 0)) {
        uptimeString += \`\${minutes}m\`;
    }

    return uptimeString.trim() || '0m';
}


// --- Website Status Functions ---

// Load all website statuses
async function loadAllSiteStatuses() {
    try {
        let data;
        try {
            data = await publicApiRequest('/api/sites/status');
        } catch (error) {
            // If site status fetch fails, database may not be initialized, attempt initialization
                        await publicApiRequest('/api/init-db');
            data = await publicApiRequest('/api/sites/status');
        }
        let sites = data.sites || [];

        const noSitesAlert = document.getElementById('noSites');

        if (sites.length === 0) {
            sites = buildDemoSites();
            if (noSitesAlert) {
                noSitesAlert.textContent = 'No real website monitors yet. Showing demo endpoints.';
                noSitesAlert.classList.remove('d-none');
            }
            setDemoSource('sites', true, 'No real website monitors found. Showing demo data.');
        } else {
            if (noSitesAlert) noSitesAlert.classList.add('d-none');
            setDemoSource('sites', false);
        }

        renderSiteStatusTable(sites);

    } catch (error) {
        const noSitesAlert = document.getElementById('noSites');
        if (noSitesAlert) {
            noSitesAlert.textContent = 'Backend unreachable. Showing demo website monitor data.';
            noSitesAlert.classList.remove('d-none');
        }

        renderSiteStatusTable(buildDemoSites());
        setDemoSource('sites', true, 'API unavailable. Showing demo data.');
    }
}

// Render the website status table
async function renderSiteStatusTable(sites) {
    const tableBody = document.getElementById('siteStatusTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    for (const site of sites) {
        const row = document.createElement('tr');
        const statusInfo = getSiteStatusBadge(site.last_status);
        const lastCheckTime = site.last_checked ? new Date(site.last_checked * 1000).toLocaleString() : 'Never';
        const responseTime = site.last_response_time_ms !== null ? \`\${site.last_response_time_ms} ms\` : '-';

        const historyCell = document.createElement('td');
        historyCell.className = 'site-history-cell';
        const historyContainer = document.createElement('div');
        historyContainer.className = 'history-bar-container';
        historyCell.appendChild(historyContainer);

        row.innerHTML = \`
            <td class="site-name-cell">\${site.name || '-'}</td>
            <td class="site-metric-cell"><span class="badge \${statusInfo.class}">\${statusInfo.text}</span></td>
            <td class="site-metric-cell">\${site.last_status_code || '-'}</td>
            <td class="site-metric-cell">\${responseTime}</td>
            <td class="site-metric-cell">\${lastCheckTime}</td>
        \`;
        row.appendChild(historyCell);
        tableBody.appendChild(row);

        // Render history bars using site history data
        renderSiteHistoryBar(historyContainer, site.history || []);
    }

    // Also render mobile cards
    renderMobileSiteCards(sites);
}

// Render 24h history bar for a site (unified function for PC and mobile)
function renderSiteHistoryBar(containerElement, history) {
    let historyHtml = '';
    const now = new Date();

    for (let i = 0; i < 24; i++) {
        const slotTime = new Date(now);
        slotTime.setHours(now.getHours() - i);
        const slotStart = new Date(slotTime);
        slotStart.setMinutes(0, 0, 0);
        const slotEnd = new Date(slotTime);
        slotEnd.setMinutes(59, 59, 999);

        const slotStartTimestamp = Math.floor(slotStart.getTime() / 1000);
        const slotEndTimestamp = Math.floor(slotEnd.getTime() / 1000);

        const recordForHour = history?.find(
            r => r.timestamp >= slotStartTimestamp && r.timestamp <= slotEndTimestamp
        );

        let barClass = 'history-bar-pending';
        let titleText = \`\${String(slotStart.getHours()).padStart(2, '0')}:00 - \${String((slotStart.getHours() + 1) % 24).padStart(2, '0')}:00: No data\`;

        if (recordForHour) {
            if (recordForHour.status === 'UP') {
                barClass = 'history-bar-up';
            } else if (['DOWN', 'TIMEOUT', 'ERROR'].includes(recordForHour.status)) {
                barClass = 'history-bar-down';
            }
            const recordDate = new Date(recordForHour.timestamp * 1000);
            titleText = \`\${recordDate.toLocaleString()}: \${recordForHour.status} (\${recordForHour.status_code || 'N/A'}), \${recordForHour.response_time_ms || '-'}ms\`;
        }

        historyHtml += \`<div class="history-bar \${barClass}" title="\${titleText}"></div>\`;
    }

    containerElement.innerHTML = historyHtml;
}


// Get website status badge class and text (copied from admin.js for reuse)
function getSiteStatusBadge(status) {
    switch (status) {
        case 'UP': return { class: 'status-badge status-online', text: 'UP' };
        case 'DOWN': return { class: 'status-badge status-offline', text: 'DOWN' };
        case 'TIMEOUT': return { class: 'status-badge bg-warning bg-opacity-25 text-warning', text: 'TIMEOUT' };
        case 'ERROR': return { class: 'status-badge bg-danger bg-opacity-25 text-danger', text: 'ERROR' };
        case 'PENDING': return { class: 'status-badge bg-secondary bg-opacity-25 text-white', text: 'PENDING' };
        default: return { class: 'status-badge bg-secondary bg-opacity-25 text-white', text: 'UNKNOWN' };
    }
}

// ==================== Server Availability (12h uptime from metrics_history) ====================

// Fetch 12h history for each server and compute availability percentage
async function loadServerAvailability(allStatuses) {
    const reportIntervalSec = 60; // Assume 60s report interval for slot counting
    const twelveHours = 12 * 60 * 60;

    if (demoState.servers) {
        allStatuses.forEach(data => {
            const serverId = data.server.id;
            const cell = document.getElementById(\`avail-\${serverId}\`);
            if (!cell) return;

            const pct = DEMO_AVAILABILITY[serverId] || 98.7;
            const color = pct >= 99 ? 'text-success' : pct >= 95 ? 'text-warning' : 'text-danger';
            cell.innerHTML = \`<span class="\${color} small fw-bold">\${pct.toFixed(1)}%</span>\`;
        });
        return;
    }

    const promises = allStatuses.map(async data => {
        const serverId = data.server.id;
        const cell = document.getElementById(\`avail-\${serverId}\`);
        if (!cell) return;
        try {
            const result = await publicApiRequest(\`/api/history/\${serverId}\`);
            const history = result.history || [];
            if (history.length === 0) {
                cell.innerHTML = '<span class="text-muted small">N/A</span>';
                return;
            }
            const now = Math.floor(Date.now() / 1000);
            const windowStart = now - twelveHours;
            const totalSlots = Math.ceil(twelveHours / reportIntervalSec);
            const reportedSlots = history.filter(h => h.timestamp >= windowStart).length;
            const pct = Math.min(100, Math.round((reportedSlots / totalSlots) * 1000) / 10);
            const color = pct >= 99 ? 'text-success' : pct >= 95 ? 'text-warning' : 'text-danger';
            cell.innerHTML = \`<span class="\${color} small fw-bold">\${pct.toFixed(1)}%</span>\`;
        } catch {
            cell.innerHTML = '<span class="text-muted small">-</span>';
        }
    });
    await Promise.allSettled(promises);
}

// ==================== Charts Modal (12h metrics charts via Chart.js) ====================

let activeCharts = [];

async function openChartsModal(serverId, serverName) {
    const modal = document.getElementById('chartsModal');
    if (!modal) return;

    document.getElementById('chartsModalLabel').textContent = \`12-Hour Charts — \${serverName}\`;
    document.getElementById('chartsModalLoading').classList.remove('d-none');
    document.getElementById('chartsContainer').classList.add('d-none');
    document.getElementById('chartsError').classList.add('d-none');

    // Destroy existing Chart instances to avoid canvas reuse errors
    activeCharts.forEach(c => c.destroy());
    activeCharts = [];

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    try {
        let history = [];
        let usingDemoHistory = false;
        try {
            const result = await publicApiRequest(\`/api/history/\${serverId}\`);
            history = result.history || [];
        } catch {
            history = [];
        }

        if (history.length === 0) {
            history = buildDemoChartHistory(serverId);
            usingDemoHistory = true;
        }

        if (usingDemoHistory) {
            document.getElementById('chartsModalLabel').textContent = \`12-Hour Charts — \${serverName} (Demo)\`;
        }

        const newestTimestamp = history[history.length - 1].timestamp || Math.floor(Date.now() / 1000);
        const windowStartTimestamp = newestTimestamp - (12 * 60 * 60);
        const theme = document.documentElement.getAttribute('data-bs-theme') || 'dark';
        const axisColor = theme === 'light' ? 'rgba(16, 32, 57, 0.76)' : 'rgba(232, 238, 252, 0.74)';
        const majorGridColor = theme === 'light' ? 'rgba(16, 32, 57, 0.12)' : 'rgba(232, 238, 252, 0.14)';
        const minorGridColor = theme === 'light' ? 'rgba(16, 32, 57, 0.08)' : 'rgba(232, 238, 252, 0.09)';

        const toHourPosition = (timestamp) =>
            Math.max(0, Math.min(12, (timestamp - windowStartTimestamp) / 3600));

        const points = history.map(item => ({ x: toHourPosition(item.timestamp), item }));

        const toSeries = (extractor) =>
            points
                .map(({ x, item }) => ({ x, y: extractor(item) }))
                .filter(point => typeof point.y === 'number' && !Number.isNaN(point.y));

        const baseXScale = {
            type: 'linear',
            min: 0,
            max: 12,
            title: {
                display: true,
                text: 'Hours (12h)',
                color: axisColor,
                font: { size: 13, weight: '700' },
                padding: { top: 8 },
            },
            ticks: {
                stepSize: 3,
                color: axisColor,
                callback: value => (Number(value) % 3 === 0 ? value : ''),
                maxRotation: 0,
            },
            grid: { color: majorGridColor, drawBorder: false },
            border: { display: false },
        };

        const buildPercentOptions = (label, color) => ({
            type: 'line',
            data: {
                datasets: [{
                    label,
                    data: [],
                    borderColor: color,
                    backgroundColor: color + '26',
                    fill: true,
                    tension: 0.24,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    borderWidth: 2,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: false } },
                scales: {
                    x: baseXScale,
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            maxTicksLimit: 5,
                            color: axisColor,
                            callback: value => value + '%',
                        },
                        grid: { color: minorGridColor, drawBorder: false },
                        border: { display: false },
                    },
                },
            },
        });

        const cpuOpts = buildPercentOptions('CPU %', '#2f9bff');
        cpuOpts.data.datasets[0].data = toSeries(item => item.cpu ? item.cpu.usage_percent : null);
        activeCharts.push(new Chart(document.getElementById('cpuChart'), cpuOpts));

        const memOpts = buildPercentOptions('Memory %', '#22c58b');
        memOpts.data.datasets[0].data = toSeries(item => item.memory ? item.memory.usage_percent : null);
        activeCharts.push(new Chart(document.getElementById('memoryChart'), memOpts));

        const diskOpts = buildPercentOptions('Disk %', '#ff9d2e');
        diskOpts.data.datasets[0].data = toSeries(item => item.disk ? item.disk.usage_percent : null);
        activeCharts.push(new Chart(document.getElementById('diskChart'), diskOpts));

        const netOpts = {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Upload KB/s',
                        data: toSeries(item => item.network ? item.network.upload_speed / 1024 : null),
                        borderColor: '#00c9ff',
                        backgroundColor: '#00c9ff24',
                        fill: false,
                        tension: 0.24,
                        pointRadius: 0,
                        pointHoverRadius: 3,
                        borderWidth: 2,
                    },
                    {
                        label: 'Download KB/s',
                        data: toSeries(item => item.network ? item.network.download_speed / 1024 : null),
                        borderColor: '#5f7cff',
                        backgroundColor: '#5f7cff24',
                        fill: false,
                        tension: 0.24,
                        pointRadius: 0,
                        pointHoverRadius: 3,
                        borderWidth: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            color: axisColor,
                            boxWidth: 7,
                            boxHeight: 7,
                        },
                    },
                },
                scales: {
                    x: baseXScale,
                    y: {
                        beginAtZero: true,
                        ticks: {
                            maxTicksLimit: 5,
                            color: axisColor,
                        },
                        grid: { color: minorGridColor, drawBorder: false },
                        border: { display: false },
                    },
                },
            },
        };
        activeCharts.push(new Chart(document.getElementById('networkChart'), netOpts));

        document.getElementById('chartsModalLoading').classList.add('d-none');
        document.getElementById('chartsContainer').classList.remove('d-none');
    } catch (err) {
        document.getElementById('chartsModalLoading').classList.add('d-none');
        document.getElementById('chartsError').classList.remove('d-none');
    }
}
`;
}
