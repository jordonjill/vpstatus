export function getAdminJs(): string {
  return `// admin.js - Admin panel JavaScript logic

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

// Unified API request function
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
            window.location.href = 'login.html';
            throw new Error('Authentication failed. Please log in again.');
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

// Global variables for VPS data updates
let vpsUpdateInterval = null;
const DEFAULT_VPS_REFRESH_INTERVAL_MS = 120000; // Default to 120 seconds for VPS data if backend setting fails

// Function to fetch VPS refresh interval and start periodic VPS data updates
async function initializeVpsDataUpdates() {
        let vpsRefreshIntervalMs = DEFAULT_VPS_REFRESH_INTERVAL_MS;

    try {
                const data = await apiRequest('/api/admin/settings/vps-report-interval');
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

    // Set up new periodic updates for VPS data ONLY
        vpsUpdateInterval = setInterval(() => {
                // Reload server list to get updated data
        if (typeof loadServerList === 'function') {
            loadServerList();
        }
    }, vpsRefreshIntervalMs);

    }

// --- Theme Management (copied from main.js) ---
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

// Tooltips now use browser native title attribute, no JavaScript initialization needed

// Global variables
let currentServerId = null;
let currentSiteId = null; // For site deletion
let serverList = [];
let siteList = []; // For monitored sites
let hasAddedNewServer = false; // Track whether a new server has been added

// Execute after page load
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize theme
    initializeTheme();

    // Check login status - authentication check must complete first
    await checkLoginStatus();

    // Initialize event listeners
    initEventListeners();

    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Load server list
    loadServerList();
    // Load monitored website list
    loadSiteList();
    // Load global settings (VPS Report Interval)
    loadGlobalSettings();

    // Initialize admin panel periodic refresh
    initializeVpsDataUpdates();

    // Check if using default password
    checkDefaultPasswordUsage();

    // Cleanup loop removed to reduce unnecessary timers.
    });

// Check login status
async function checkLoginStatus() {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('auth_token');
        if (!token) {
            // Not logged in, redirect to login page
            window.location.href = 'login.html';
            return;
        }

        const data = await apiRequest('/api/auth/status');
        if (!data.authenticated) {
            // Not logged in, redirect to login page
            window.location.href = 'login.html';
        }
    } catch (error) {
                window.location.href = 'login.html';
    }
}

// Check if using default password
async function checkDefaultPasswordUsage() {
    try {
        // Check if default password warning has been shown
        const hasShownDefaultPasswordWarning = localStorage.getItem('hasShownDefaultPasswordWarning');

        if (hasShownDefaultPasswordWarning === 'true') {
            return; // Warning already shown, skip
        }

        // Check current user login status and default password usage
        const token = localStorage.getItem('auth_token');
                if (token) {
            try {
                const statusData = await apiRequest('/api/auth/status');
                if (statusData.authenticated && statusData.user && statusData.user.usingDefaultPassword) {
                    // Show default password warning
                    showToast('warning',
                        'Security Notice: You are using the default password. Please change your password immediately by clicking the key icon in the top-right corner.',
                        { duration: 10000 }); // Show for 10 seconds

                    // Mark warning as shown
                    localStorage.setItem('hasShownDefaultPasswordWarning', 'true');
                }
            } catch (error) {
                            }
        }
    } catch (error) {
            }
}

// Initialize event listeners
function initEventListeners() {
    // Add server button
    document.getElementById('addServerBtn').addEventListener('click', function() {
        showServerModal();
    });

    // Save server button
    document.getElementById('saveServerBtn').addEventListener('click', function() {
        saveServer();
    });

    // Helper function for copying text to clipboard and providing button feedback
    function copyToClipboard(textToCopy, buttonElement) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalHtml = buttonElement.innerHTML;
            buttonElement.innerHTML = '<i class="bi bi-check-lg"></i>'; // Using a larger check icon
            buttonElement.classList.add('btn-success');
            buttonElement.classList.remove('btn-outline-secondary');

            setTimeout(() => {
                buttonElement.innerHTML = originalHtml;
                buttonElement.classList.remove('btn-success');
                buttonElement.classList.add('btn-outline-secondary');
            }, 2000);
        }).catch(err => {
            // Silently handle copy failure
            const originalHtml = buttonElement.innerHTML;
            buttonElement.innerHTML = '<i class="bi bi-x-lg"></i>'; // Error icon
            buttonElement.classList.add('btn-danger');
            buttonElement.classList.remove('btn-outline-secondary');
            setTimeout(() => {
                buttonElement.innerHTML = originalHtml;
                buttonElement.classList.remove('btn-danger');
                buttonElement.classList.add('btn-outline-secondary');
            }, 2000);
        });
    }

    // Copy API key button
    document.getElementById('copyApiKeyBtn').addEventListener('click', function() {
        const apiKeyInput = document.getElementById('apiKey');
        copyToClipboard(apiKeyInput.value, this);
    });

    // Copy server ID button
    document.getElementById('copyServerIdBtn').addEventListener('click', function() {
        const serverIdInput = document.getElementById('serverIdDisplay');
        copyToClipboard(serverIdInput.value, this);
    });

    // Copy Worker URL button
    document.getElementById('copyWorkerUrlBtn').addEventListener('click', function() {
        const workerUrlInput = document.getElementById('workerUrlDisplay');
        copyToClipboard(workerUrlInput.value, this);
    });

    // Confirm delete button
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        if (currentServerId) {
            deleteServer(currentServerId);
        }
    });

    // Change password button (mobile)
    document.getElementById('changePasswordBtn').addEventListener('click', function() {
        showPasswordModal();
    });

    // Change password button (desktop)
    document.getElementById('changePasswordBtnDesktop').addEventListener('click', function() {
        showPasswordModal();
    });

    // Save password button
    document.getElementById('savePasswordBtn').addEventListener('click', function() {
        changePassword();
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        logout();
    });

    // --- Site Monitoring Event Listeners ---
    document.getElementById('addSiteBtn').addEventListener('click', function() {
        showSiteModal();
    });

    document.getElementById('saveSiteBtn').addEventListener('click', function() {
        saveSite();
    });

     document.getElementById('confirmDeleteSiteBtn').addEventListener('click', function() {
        if (currentSiteId) {
            deleteSite(currentSiteId);
        }
    });


    // Global Settings Event Listener
    document.getElementById('saveVpsReportIntervalBtn').addEventListener('click', function() {
        saveVpsReportInterval();
    });

    // Server modal close event listener
    const serverModal = document.getElementById('serverModal');
    if (serverModal) {
        serverModal.addEventListener('hidden.bs.modal', function() {
            // Check if a new server was added and needs to refresh list
            if (hasAddedNewServer) {
                hasAddedNewServer = false; // Reset flag
                loadServerList(); // Refresh server list
            }
        });
    }

    // Initialize sort dropdown default selection
    setTimeout(() => {
        // Ensure DOM is fully loaded
        updateServerSortDropdownSelection('custom');
        updateSiteSortDropdownSelection('custom');
    }, 100);
}

// --- Server Management Functions ---

// Load server list
async function loadServerList() {
    try {
        const data = await apiRequest('/api/admin/servers');
        serverList = data.servers || [];

        // Simplified logic: render directly, smart status display handles updating buttons
        renderServerTable(serverList);
    } catch (error) {
                showToast('danger', 'Failed to load server list. Please refresh the page.');
    }
}

// Render server table
function renderServerTable(servers) {
    const tableBody = document.getElementById('serverTableBody');

    // Simplified state management: no longer needs complex state saving

    tableBody.innerHTML = '';

    if (servers.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="10" class="text-center">No server data available.</td>'; // Updated colspan
        tableBody.appendChild(row);
        // Also update mobile cards
        renderMobileAdminServerCards([]);
        return;
    }

    servers.forEach((server, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-server-id', server.id);
        row.classList.add('server-row-draggable');
        row.draggable = true;

        // Format last update time
        let lastUpdateText = 'Never';
        let statusBadge = '<span class="status-badge bg-secondary bg-opacity-25 text-white">UNKNOWN</span>';

        if (server.last_report) {
            const lastUpdate = new Date(server.last_report * 1000);
            lastUpdateText = lastUpdate.toLocaleString();

            // Check if online (last report within 5 minutes)
            const now = new Date();
            const diffMinutes = (now - lastUpdate) / (1000 * 60);

            if (diffMinutes <= 5) {
                statusBadge = '<span class="status-badge status-online">ACTIVE</span>';
            } else {
                statusBadge = '<span class="status-badge status-offline">OFFLINE</span>';
            }
        }

        // Smart status display: fully preserve updating button states
        const existingToggle = document.querySelector('.server-visibility-toggle[data-server-id="' + server.id + '"]');
        const isCurrentlyUpdating = existingToggle && existingToggle.dataset.updating === 'true';
        const displayState = isCurrentlyUpdating ? existingToggle.checked : server.is_public;
        const needsUpdatingState = isCurrentlyUpdating;

        row.innerHTML =
            '<td>' +
                '<div class="btn-group">' +
                    '<i class="bi bi-grip-vertical text-muted me-2" style="cursor: grab;" title="Drag to reorder"></i>' +
                     '<button class="btn btn-sm btn-outline-secondary move-server-btn" data-id="' + server.id + '" data-direction="up" ' + (index === 0 ? 'disabled' : '') + '>' +
                        '<i class="bi bi-arrow-up"></i>' +
                    '</button>' +
                     '<button class="btn btn-sm btn-outline-secondary move-server-btn" data-id="' + server.id + '" data-direction="down" ' + (index === servers.length - 1 ? 'disabled' : '') + '>' +
                        '<i class="bi bi-arrow-down"></i>' +
                    '</button>' +
                '</div>' +
            '</td>' +
            '<td>' + server.id + '</td>' +
            '<td>' + server.name + '</td>' +
            '<td>' + (server.description || '-') + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td>' + lastUpdateText + '</td>' +
            '<td>' +
                '<button class="btn btn-sm btn-outline-secondary view-key-btn" data-id="' + server.id + '">' +
                    '<i class="bi bi-key"></i> View Key' +
                '</button>' +
            '</td>' +
            '<td>' +
                '<button class="btn btn-sm btn-outline-info copy-vps-script-btn" data-id="' + server.id + '" data-name="' + server.name + '" title="Copy VPS install script">' +
                    '<i class="bi bi-clipboard-plus"></i> Copy Script' +
                '</button>' +
            '</td>' +
            '<td>' +
                '<div class="form-check form-switch">' +
                    '<input class="form-check-input server-visibility-toggle" type="checkbox" data-server-id="' + server.id + '" ' + (displayState ? 'checked' : '') + (needsUpdatingState ? ' data-updating="true"' : '') + '>' +
                '</div>' +
            '</td>' +
            '<td>' +
                '<div class="btn-group">' +
                    '<button class="btn btn-sm btn-outline-primary edit-server-btn" data-id="' + server.id + '">' +
                        '<i class="bi bi-pencil"></i>' +
                    '</button>' +
                    '<button class="btn btn-sm btn-outline-danger delete-server-btn" data-id="' + server.id + '" data-name="' + server.name + '">' +
                        '<i class="bi bi-trash"></i>' +
                    '</button>' +
                '</div>' +
            '</td>';

        tableBody.appendChild(row);
    });

    // Initialize drag sort
    initializeServerDragSort();

    // Add event listeners
    document.querySelectorAll('.view-key-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const serverId = this.getAttribute('data-id');
            viewApiKey(serverId);
        });
    });

    document.querySelectorAll('.edit-server-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const serverId = this.getAttribute('data-id');
            editServer(serverId);
        });
    });

    document.querySelectorAll('.delete-server-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const serverId = this.getAttribute('data-id');
            const serverName = this.getAttribute('data-name');
            showDeleteConfirmation(serverId, serverName);
        });
    });

    document.querySelectorAll('.move-server-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const serverId = this.getAttribute('data-id');
            const direction = this.getAttribute('data-direction');
            moveServer(serverId, direction);
        });
    });

    document.querySelectorAll('.copy-vps-script-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const serverId = this.getAttribute('data-id');
            const serverName = this.getAttribute('data-name');
            copyVpsInstallScript(serverId, serverName, this);
        });
    });

    // Optimized visibility toggle event listener - directly handle state change
    document.querySelectorAll('.server-visibility-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(event) {
            // If toggle is being updated, ignore click
            if (this.disabled || this.dataset.updating === 'true') {
                event.preventDefault();
                return;
            }

            const serverId = this.getAttribute('data-server-id');
            const targetState = this.checked; // State after click is the target state
            const originalState = !this.checked; // Original state is the opposite of target

                        // Immediately set to loading state
            this.disabled = true;
            this.style.opacity = '0.6';
            this.dataset.updating = 'true';

            updateServerVisibility(serverId, targetState, originalState, this);
        });
    });

    // Re-apply visual state of updating buttons (new elements created by re-render)
    document.querySelectorAll('.server-visibility-toggle[data-updating="true"]').forEach(toggle => {
        toggle.disabled = true;
        toggle.style.opacity = '0.6';
    });

    // Also render mobile cards
    renderMobileAdminServerCards(servers);
}

// Initialize server drag sort
function initializeServerDragSort() {
    const tableBody = document.getElementById('serverTableBody');
    if (!tableBody) return;

    let draggedElement = null;
    let draggedOverElement = null;

    // Add event listeners for all draggable rows
    const draggableRows = tableBody.querySelectorAll('.server-row-draggable');

    draggableRows.forEach(row => {
        row.addEventListener('dragstart', function(e) {
            draggedElement = this;
            this.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.outerHTML);
        });

        row.addEventListener('dragend', function(e) {
            this.style.opacity = '';
            draggedElement = null;
            draggedOverElement = null;

            // Remove all drag styles
            draggableRows.forEach(r => {
                r.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        });

        row.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (this === draggedElement) return;

            draggedOverElement = this;

            // Remove drag styles from other rows
            draggableRows.forEach(r => {
                if (r !== this) {
                    r.classList.remove('drag-over-top', 'drag-over-bottom');
                }
            });

            // Determine insert position
            const rect = this.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;

            if (e.clientY < midpoint) {
                this.classList.add('drag-over-top');
                this.classList.remove('drag-over-bottom');
            } else {
                this.classList.add('drag-over-bottom');
                this.classList.remove('drag-over-top');
            }
        });

        row.addEventListener('drop', function(e) {
            e.preventDefault();

            if (this === draggedElement) return;

            const draggedServerId = draggedElement.getAttribute('data-server-id');
            const targetServerId = this.getAttribute('data-server-id');

            // Determine insert position
            const rect = this.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const insertBefore = e.clientY < midpoint;

            // Perform drag sort
            performServerDragSort(draggedServerId, targetServerId, insertBefore);
        });
    });
}

// Perform server drag sort
async function performServerDragSort(draggedServerId, targetServerId, insertBefore) {
    try {
        // Get current server list ID order
        const currentOrder = serverList.map(server => server.id);

        // Calculate new sort order
        const draggedIndex = currentOrder.indexOf(draggedServerId);
        const targetIndex = currentOrder.indexOf(targetServerId);

        if (draggedIndex === -1 || targetIndex === -1) {
            throw new Error('Server not found');
        }

        // Create new sort array
        const newOrder = [...currentOrder];
        newOrder.splice(draggedIndex, 1); // Remove dragged element

        // Calculate insert position
        let insertIndex = targetIndex;
        if (draggedIndex < targetIndex) {
            insertIndex = targetIndex - 1;
        }
        if (!insertBefore) {
            insertIndex += 1;
        }

        newOrder.splice(insertIndex, 0, draggedServerId); // Insert at new position

        // Send batch reorder request
        await apiRequest('/api/admin/servers/batch-reorder', {
            method: 'POST',
            body: JSON.stringify({ serverIds: newOrder })
        });

        // Reload server list
        await loadServerList();
        showToast('success', 'Server order updated successfully.');

    } catch (error) {
                showToast('danger', 'Drag sort failed: ' + error.message);
        // Reload to restore original state
        loadServerList();
    }
}


// Function to copy VPS installation script
async function copyVpsInstallScript(serverId, serverName, buttonElement) {
    const originalButtonHtml = buttonElement.innerHTML;
    buttonElement.disabled = true;
    buttonElement.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';

    try {
        // Request server info including full API key
        const response = await apiRequest('/api/admin/servers?full_key=true');
        const server = response.servers.find(s => s.id === serverId);

        if (!server || !server.api_key) {
            throw new Error('Server or API key not found. Please refresh.');
        }

        const apiKey = server.api_key;
        const workerUrl = window.location.origin;

        // Generate install command using the worker-served installer.
        const scriptCommand = 'curl -sL ' + workerUrl + '/install.sh | bash -s -- -k ' + apiKey + ' -s ' + serverId + ' -u ' + workerUrl;

        await navigator.clipboard.writeText(scriptCommand);

        buttonElement.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
        buttonElement.classList.remove('btn-outline-info');
        buttonElement.classList.add('btn-success');

        showToast('success', 'Install script for "' + serverName + '" copied to clipboard.');

    } catch (error) {
                showToast('danger', 'Failed to copy script: ' + error.message);
        buttonElement.innerHTML = '<i class="bi bi-x-lg"></i> Copy Failed';
        buttonElement.classList.remove('btn-outline-info');
        buttonElement.classList.add('btn-danger');
    } finally {
        setTimeout(() => {
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalButtonHtml;
            buttonElement.classList.remove('btn-success', 'btn-danger');
            buttonElement.classList.add('btn-outline-info');
        }, 3000); // Revert button state after 3 seconds
    }
}

// Update server visibility
async function updateServerVisibility(serverId, isPublic, originalState, toggleElement) {
    const startTime = Date.now();
        try {
        const data = await apiRequest('/api/admin/servers/' + serverId + '/visibility', {
            method: 'POST',
            body: JSON.stringify({ is_public: isPublic })
        });

        const requestTime = Date.now() - startTime;
                // Update local data
        const serverIndex = serverList.findIndex(s => s.id === serverId);
        if (serverIndex !== -1) {
            serverList[serverIndex].is_public = isPublic;
        }

        // Set final normal state after success - using reliable recovery mechanism
        function restoreButtonState(retryCount = 0) {
            const currentToggle = document.querySelector('.server-visibility-toggle[data-server-id="' + serverId + '"]');
            if (currentToggle) {
                                currentToggle.checked = isPublic;
                currentToggle.style.opacity = '1';
                currentToggle.disabled = false;
                delete currentToggle.dataset.updating;

                // Show success toast directly
                showToast('success', 'Server visibility ' + (isPublic ? 'enabled' : 'disabled') + ' successfully.');
            } else if (retryCount < 3) {
                                setTimeout(() => restoreButtonState(retryCount + 1), 100);
            } else {
                // Silently handle missing button element
            }
        }

        // Immediately try to restore, retry on failure
        restoreButtonState();

    } catch (error) {
                // Restore original state on failure
        const currentToggle = document.querySelector('.server-visibility-toggle[data-server-id="' + serverId + '"]');
        if (currentToggle) {
            currentToggle.checked = originalState;
            currentToggle.style.opacity = '1';
            currentToggle.disabled = false;
            delete currentToggle.dataset.updating;

            // Show error toast directly, no need to wait for state change
            showToast('danger', 'Failed to update visibility: ' + error.message);
        } else {
            // If toggle element not found, show error immediately
            showToast('danger', 'Failed to update visibility: ' + error.message);
        }
    }
}

// Move server order
async function moveServer(serverId, direction) {
    try {
        await apiRequest('/api/admin/servers/' + serverId + '/reorder', {
            method: 'POST',
            body: JSON.stringify({ direction })
        });

        // Reload list to reflect new order
        await loadServerList();
        showToast('success', 'Server moved ' + (direction === 'up' ? 'up' : 'down') + ' successfully.');

    } catch (error) {
                showToast('danger', 'Failed to move server: ' + error.message);
    }
}

// Show server modal (add mode)
function showServerModal() {
    // Reset form and flags
    document.getElementById('serverForm').reset();
    document.getElementById('serverId').value = '';
    document.getElementById('apiKeyGroup').classList.add('d-none');
    document.getElementById('serverIdDisplayGroup').classList.add('d-none');
    document.getElementById('workerUrlDisplayGroup').classList.add('d-none');
    hasAddedNewServer = false; // Reset new server flag

    // Set modal title
    document.getElementById('serverModalTitle').textContent = 'Add Server';

    // Show modal
    const serverModal = new bootstrap.Modal(document.getElementById('serverModal'));
    serverModal.show();
}

// Edit server
function editServer(serverId) {
    const server = serverList.find(s => s.id === serverId);
    if (!server) return;

    // Fill form
    document.getElementById('serverId').value = server.id;
    document.getElementById('serverName').value = server.name;
    document.getElementById('serverDescription').value = server.description || '';
    document.getElementById('apiKeyGroup').classList.add('d-none');
    document.getElementById('serverIdDisplayGroup').classList.add('d-none');
    document.getElementById('workerUrlDisplayGroup').classList.add('d-none');

    // Set modal title
    document.getElementById('serverModalTitle').textContent = 'Edit Server';

    // Show modal
    const serverModal = new bootstrap.Modal(document.getElementById('serverModal'));
    serverModal.show();
}

// Save server
async function saveServer() {
    const serverId = document.getElementById('serverId').value;
    const serverName = document.getElementById('serverName').value.trim();
    const serverDescription = document.getElementById('serverDescription').value.trim();
    // const enableFrequentNotifications = document.getElementById('serverEnableFrequentNotifications').checked; // Removed

    if (!serverName) {
        showToast('warning', 'Server name cannot be empty.');
        return;
    }

    try {
        let data;

        if (serverId) {
            // Update server
            data = await apiRequest('/api/admin/servers/' + serverId, {
                method: 'PUT',
                body: JSON.stringify({
                    name: serverName,
                    description: serverDescription
                })
            });
        } else {
            // Add server
            data = await apiRequest('/api/admin/servers', {
                method: 'POST',
                body: JSON.stringify({
                    name: serverName,
                    description: serverDescription
                })
            });
        }

        // If new server added, smoothly switch to key display (don't hide modal)
        if (!serverId && data.server && data.server.api_key) {
            hasAddedNewServer = true; // Mark new server as added

            // Show key info directly in current modal for smooth UX
            // Don't hide modal, switch content for a natural transition feel
            showApiKeyInCurrentModal(data.server);
            showToast('success', 'Server added successfully.');

            // Asynchronously refresh server list in the background
            loadServerList().catch(error => {
                            });
        } else {
            // Edit server case: hide modal normally and refresh list
            const serverModal = bootstrap.Modal.getInstance(document.getElementById('serverModal'));
            serverModal.hide();

            await loadServerList();
            showToast('success', serverId ? 'Server updated successfully.' : 'Server added successfully.');
        }
    } catch (error) {
        const message = error && error.message ? error.message : 'Unknown error';
        showToast('danger', 'Failed to save server: ' + message);
    }
}

// View API key (get full key version)
async function viewApiKey(serverId) {
    try {
        // Request server info including full API key
        const response = await apiRequest('/api/admin/servers?full_key=true');
        const server = response.servers.find(s => s.id === serverId);

        if (server && server.api_key) {
            showApiKey(server);
        } else {
            showToast('danger', 'Server info or API key not found. Please try again.');
        }
    } catch (error) {
                showToast('danger', 'Failed to retrieve API key. Please try again.');
    }
}

// Show API key in current modal (for smooth transition after adding server)
function showApiKeyInCurrentModal(server) {
    // Fill form data
    document.getElementById('serverId').value = server.id;
    document.getElementById('serverName').value = server.name;
    document.getElementById('serverDescription').value = server.description || '';

    // Show API key, server ID and Worker URL
    document.getElementById('apiKey').value = server.api_key;
    document.getElementById('apiKeyGroup').classList.remove('d-none');

    document.getElementById('serverIdDisplay').value = server.id;
    document.getElementById('serverIdDisplayGroup').classList.remove('d-none');

    document.getElementById('workerUrlDisplay').value = window.location.origin;
    document.getElementById('workerUrlDisplayGroup').classList.remove('d-none');

    // Update modal title
    document.getElementById('serverModalTitle').textContent = 'Server Details & API Key';

    // Note: don't create new modal, switch content in current modal for a natural transition feel
}

// Show API key (for view key button)
function showApiKey(server) {
    // Fill form
    document.getElementById('serverId').value = server.id; // Hidden input for form submission if needed
    document.getElementById('serverName').value = server.name;
    document.getElementById('serverDescription').value = server.description || '';

    // Populate and show API Key, Server ID, and Worker URL
    document.getElementById('apiKey').value = server.api_key;
    document.getElementById('apiKeyGroup').classList.remove('d-none');

    document.getElementById('serverIdDisplay').value = server.id;
    document.getElementById('serverIdDisplayGroup').classList.remove('d-none');

    document.getElementById('workerUrlDisplay').value = window.location.origin;
    document.getElementById('workerUrlDisplayGroup').classList.remove('d-none');

    // Set modal title
    document.getElementById('serverModalTitle').textContent = 'Server Details & API Key';

    // Show modal
    const serverModal = new bootstrap.Modal(document.getElementById('serverModal'));
    serverModal.show();
}

// Show delete confirmation
function showDeleteConfirmation(serverId, serverName) {
    currentServerId = serverId;
    document.getElementById('deleteServerName').textContent = serverName;

    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    deleteModal.show();
}

// Delete server
async function deleteServer(serverId) {
    try {
        await apiRequest('/api/admin/servers/' + serverId + '?confirm=true', {
            method: 'DELETE'
        });

        // Hide modal
        const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        deleteModal.hide();

        // Reload server list
        loadServerList();
        showToast('success', 'Server deleted successfully.');
    } catch (error) {
                showToast('danger', 'Failed to delete server. Please try again.');
    }
}


// --- Site Monitoring Functions (Continued) ---

// Update website visibility
async function updateSiteVisibility(siteId, isPublic, originalState, toggleElement) {
    const startTime = Date.now();
        try {
        await apiRequest('/api/admin/sites/' + siteId + '/visibility', {
            method: 'POST',
            body: JSON.stringify({ is_public: isPublic })
        });

        const requestTime = Date.now() - startTime;
                        // Update local data
        const siteIndex = siteList.findIndex(s => s.id === siteId);
        if (siteIndex !== -1) {
            siteList[siteIndex].is_public = isPublic;
        }

        // Set final normal state after success - using reliable recovery mechanism
        function restoreButtonState(retryCount = 0) {
            const currentToggle = document.querySelector('.site-visibility-toggle[data-site-id="' + siteId + '"]');
            if (currentToggle) {
                                currentToggle.checked = isPublic;
                currentToggle.style.opacity = '1';
                currentToggle.disabled = false;
                delete currentToggle.dataset.updating;

                // Show success toast directly
                showToast('success', 'Website visibility ' + (isPublic ? 'enabled' : 'disabled') + ' successfully.');
            } else if (retryCount < 3) {
                                setTimeout(() => restoreButtonState(retryCount + 1), 100);
            } else {
                // Silently handle missing website button element
            }
        }

        // Immediately try to restore, retry on failure
        restoreButtonState();

    } catch (error) {
                // Restore original state on failure
        const currentToggle = document.querySelector('.site-visibility-toggle[data-site-id="' + siteId + '"]');
        if (currentToggle) {
            currentToggle.checked = originalState;
            currentToggle.style.opacity = '1';
            currentToggle.disabled = false;
            delete currentToggle.dataset.updating;

            // Show error toast directly, no need to wait for state change
            showToast('danger', 'Failed to update visibility: ' + error.message);
        } else {
            // If toggle element not found, show error immediately
            showToast('danger', 'Failed to update visibility: ' + error.message);
        }
    }
}

// Move website order
async function moveSite(siteId, direction) {
    try {
        await apiRequest('/api/admin/sites/' + siteId + '/reorder', {
            method: 'POST',
            body: JSON.stringify({ direction })
        });

        // Reload list to reflect new order
        await loadSiteList();
        showToast('success', 'Website moved ' + (direction === 'up' ? 'up' : 'down') + ' successfully.');

    } catch (error) {
                showToast('danger', 'Failed to move website: ' + error.message);
    }
}


// --- Password Management Functions ---

// Show change password modal
function showPasswordModal() {
    // Reset form
    document.getElementById('passwordForm').reset();

    const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
    passwordModal.show();
}

// Change password
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('warning', 'All password fields are required.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('warning', 'New password and confirmation do not match.');
        return;
    }

    try {
        await apiRequest('/api/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        // Hide modal
        const passwordModal = bootstrap.Modal.getInstance(document.getElementById('passwordModal'));
        passwordModal.hide();

        // Clear default password warning flag so it shows again if user logs in with default password
        localStorage.removeItem('hasShownDefaultPasswordWarning');

        showToast('success', 'Password changed successfully.');
    } catch (error) {
                showToast('danger', 'Failed to change password. Please try again.');
    }
}


// --- Auth Functions ---

// Logout
function logout() {
    // Clear token and warning flags from localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('hasShownDefaultPasswordWarning');

    // Redirect to login page
    window.location.href = 'login.html';
}


// --- Site Monitoring Functions ---

// Load monitored website list
async function loadSiteList() {
    try {
        const data = await apiRequest('/api/admin/sites');
        siteList = data.sites || [];

        // Simplified logic: render directly, smart status display handles updating buttons
        renderSiteTable(siteList);
    } catch (error) {
                showToast('danger', 'Failed to load website list: ' + error.message);
    }
}

// Render monitored website table
function renderSiteTable(sites) {
    const tableBody = document.getElementById('siteTableBody');

    // Simplified state management: no longer needs complex state saving

    tableBody.innerHTML = '';

    if (sites.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No monitored websites found.</td></tr>'; // Colspan updated
        // Also update mobile cards
        renderMobileAdminSiteCards([]);
        return;
    }

    sites.forEach((site, index) => { // Added index for sorting buttons
        const row = document.createElement('tr');
        row.setAttribute('data-site-id', site.id);
        row.classList.add('site-row-draggable');
        row.draggable = true;

        const statusInfo = getSiteStatusBadge(site.last_status);
        const lastCheckTime = site.last_checked ? new Date(site.last_checked * 1000).toLocaleString() : 'Never';
        const responseTime = site.last_response_time_ms !== null ? \`\${site.last_response_time_ms} ms\` : '-';

        // Smart status display: fully preserve updating button states
        const existingToggle = document.querySelector('.site-visibility-toggle[data-site-id="' + site.id + '"]');
        const isCurrentlyUpdating = existingToggle && existingToggle.dataset.updating === 'true';
        const displayState = isCurrentlyUpdating ? existingToggle.checked : site.is_public;
        const needsUpdatingState = isCurrentlyUpdating;

        row.innerHTML = \`
             <td>
                <div class="btn-group btn-group-sm">
                    <i class="bi bi-grip-vertical text-muted me-2" style="cursor: grab;" title="Drag to reorder"></i>
                     <button class="btn btn-outline-secondary move-site-btn" data-id="\${site.id}" data-direction="up" \${index === 0 ? 'disabled' : ''} title="Move Up">
                        <i class="bi bi-arrow-up"></i>
                    </button>
                     <button class="btn btn-outline-secondary move-site-btn" data-id="\${site.id}" data-direction="down" \${index === sites.length - 1 ? 'disabled' : ''} title="Move Down">
                        <i class="bi bi-arrow-down"></i>
                    </button>
                </div>
            </td>
            <td>\${site.name || '-'}</td>
            <td><a href="\${site.url}" target="_blank" rel="noopener noreferrer">\${site.url}</a></td>
            <td><span class="badge \${statusInfo.class}">\${statusInfo.text}</span></td>
            <td>\${site.last_status_code || '-'}</td>
            <td>\${responseTime}</td>
            <td>\${lastCheckTime}</td>
            <td>
                <div class="form-check form-switch">
                    <input class="form-check-input site-visibility-toggle" type="checkbox" data-site-id="\${site.id}" \${displayState ? 'checked' : ''}\${needsUpdatingState ? ' data-updating="true"' : ''}>
                </div>
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary edit-site-btn" data-id="\${site.id}" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-site-btn" data-id="\${site.id}" data-name="\${site.name || site.url}" data-url="\${site.url}" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        \`;
        tableBody.appendChild(row);
    });

    // Initialize drag sort
    initializeSiteDragSort();

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-site-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const siteId = this.getAttribute('data-id');
            editSite(siteId);
        });
    });

    document.querySelectorAll('.delete-site-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const siteId = this.getAttribute('data-id');
            const siteName = this.getAttribute('data-name');
            const siteUrl = this.getAttribute('data-url');
            showDeleteSiteConfirmation(siteId, siteName, siteUrl);
        });
    });

    // Add event listeners for move buttons
    document.querySelectorAll('.move-site-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const siteId = this.getAttribute('data-id');
            const direction = this.getAttribute('data-direction');
            moveSite(siteId, direction);
        });
    });

    // Optimized website visibility toggle event listener - directly handle state change
    document.querySelectorAll('.site-visibility-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(event) {
            // If toggle is being updated, ignore click
            if (this.disabled || this.dataset.updating === 'true') {
                event.preventDefault();
                return;
            }

            const siteId = this.getAttribute('data-site-id');
            const targetState = this.checked; // State after click is the target state
            const originalState = !this.checked; // Original state is the opposite of target

                        // Immediately set to loading state
            this.disabled = true;
            this.style.opacity = '0.6';
            this.dataset.updating = 'true';

            updateSiteVisibility(siteId, targetState, originalState, this);
        });
    });

    // Re-apply visual state of updating buttons (new elements created by re-render)
    document.querySelectorAll('.site-visibility-toggle[data-updating="true"]').forEach(toggle => {
        toggle.disabled = true;
        toggle.style.opacity = '0.6';
    });

    // Also render mobile cards
    renderMobileAdminSiteCards(sites);
}

// Initialize website drag sort
function initializeSiteDragSort() {
    const tableBody = document.getElementById('siteTableBody');
    if (!tableBody) return;

    let draggedElement = null;
    let draggedOverElement = null;

    // Add event listeners for all draggable rows
    const draggableRows = tableBody.querySelectorAll('.site-row-draggable');

    draggableRows.forEach(row => {
        row.addEventListener('dragstart', function(e) {
            draggedElement = this;
            this.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.outerHTML);
        });

        row.addEventListener('dragend', function(e) {
            this.style.opacity = '';
            draggedElement = null;
            draggedOverElement = null;

            // Remove all drag styles
            draggableRows.forEach(r => {
                r.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        });

        row.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (this === draggedElement) return;

            draggedOverElement = this;

            // Remove drag styles from other rows
            draggableRows.forEach(r => {
                if (r !== this) {
                    r.classList.remove('drag-over-top', 'drag-over-bottom');
                }
            });

            // Determine insert position
            const rect = this.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;

            if (e.clientY < midpoint) {
                this.classList.add('drag-over-top');
                this.classList.remove('drag-over-bottom');
            } else {
                this.classList.add('drag-over-bottom');
                this.classList.remove('drag-over-top');
            }
        });

        row.addEventListener('drop', function(e) {
            e.preventDefault();

            if (this === draggedElement) return;

            const draggedSiteId = draggedElement.getAttribute('data-site-id');
            const targetSiteId = this.getAttribute('data-site-id');

            // Determine insert position
            const rect = this.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const insertBefore = e.clientY < midpoint;

            // Perform drag sort
            performSiteDragSort(draggedSiteId, targetSiteId, insertBefore);
        });
    });
}

// Perform website drag sort
async function performSiteDragSort(draggedSiteId, targetSiteId, insertBefore) {
    try {
        // Get current website list ID order
        const currentOrder = siteList.map(site => site.id);

        // Calculate new sort order
        const draggedIndex = currentOrder.indexOf(draggedSiteId);
        const targetIndex = currentOrder.indexOf(targetSiteId);

        if (draggedIndex === -1 || targetIndex === -1) {
            throw new Error('Website not found');
        }

        // Create new sort array
        const newOrder = [...currentOrder];
        newOrder.splice(draggedIndex, 1); // Remove dragged element

        // Calculate insert position
        let insertIndex = targetIndex;
        if (draggedIndex < targetIndex) {
            insertIndex = targetIndex - 1;
        }
        if (!insertBefore) {
            insertIndex += 1;
        }

        newOrder.splice(insertIndex, 0, draggedSiteId); // Insert at new position

        // Send batch reorder request
        await apiRequest('/api/admin/sites/batch-reorder', {
            method: 'POST',
            body: JSON.stringify({ siteIds: newOrder })
        });

        // Reload website list
        await loadSiteList();
        showToast('success', 'Website order updated successfully.');

    } catch (error) {
                showToast('danger', 'Drag sort failed: ' + error.message);
        // Reload to restore original state
        loadSiteList();
    }
}

// Get badge style and text for website status
function getSiteStatusBadge(status) {
    switch (status) {
        case 'UP': return { class: 'status-badge status-online', text: 'UP' };
        case 'DOWN': return { class: 'status-badge status-offline', text: 'DOWN' };
        case 'TIMEOUT': return { class: 'status-badge bg-warning bg-opacity-25 text-warning', text: 'TIMEOUT' };
        case 'ERROR': return { class: 'status-badge bg-danger bg-opacity-25 text-danger', text: 'ERROR' };
        case 'PENDING': return { class: 'bg-secondary', text: 'Pending' };
        default: return { class: 'bg-secondary', text: 'Unknown' };
    }
}


// Show add/edit website modal (handles both add and edit)
function showSiteModal(siteIdToEdit = null) {
    const form = document.getElementById('siteForm');
    form.reset();
    const modalTitle = document.getElementById('siteModalTitle');
    const siteIdInput = document.getElementById('siteId');

    if (siteIdToEdit) {
        const site = siteList.find(s => s.id === siteIdToEdit);
        if (site) {
            modalTitle.textContent = 'Edit Website';
            siteIdInput.value = site.id;
            document.getElementById('siteName').value = site.name || '';
            document.getElementById('siteUrl').value = site.url;
            // document.getElementById('siteEnableFrequentNotifications').checked = site.enable_frequent_down_notifications || false; // Removed
        } else {
            showToast('danger', 'Website not found.');
            return;
        }
    } else {
        modalTitle.textContent = 'Add Website';
        siteIdInput.value = ''; // Clear ID for add mode
        // document.getElementById('siteEnableFrequentNotifications').checked = false; // Removed
    }

    const siteModal = new bootstrap.Modal(document.getElementById('siteModal'));
    siteModal.show();
}

// Function to call when edit button is clicked
function editSite(siteId) {
    showSiteModal(siteId);
}

// Save website (add or update)
async function saveSite() {
    const siteId = document.getElementById('siteId').value; // Get ID from hidden input
    const siteName = document.getElementById('siteName').value.trim();
    const siteUrl = document.getElementById('siteUrl').value.trim();
    // const enableFrequentNotifications = document.getElementById('siteEnableFrequentNotifications').checked; // Removed

    if (!siteUrl) {
        showToast('warning', 'Please enter a website URL.');
        return;
    }
    if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
         showToast('warning', 'URL must start with http:// or https://');
         return;
    }

    const requestBody = {
        url: siteUrl,
        name: siteName
        // enable_frequent_down_notifications: enableFrequentNotifications // Removed
    };
    let apiUrl = '/api/admin/sites';
    let method = 'POST';

    if (siteId) { // If siteId exists, it's an update
        apiUrl = \`/api/admin/sites/\${siteId}\`;
        method = 'PUT';
    }

    try {
        const responseData = await apiRequest(apiUrl, {
            method: method,
            body: JSON.stringify(requestBody)
        });

        const siteModalInstance = bootstrap.Modal.getInstance(document.getElementById('siteModal'));
        if (siteModalInstance) {
            siteModalInstance.hide();
        }

        await loadSiteList(); // Reload the list
        showToast('success', siteId ? 'Website updated successfully.' : 'Website added successfully.');

    } catch (error) {
                showToast('danger', 'Failed to save website: ' + error.message);
    }
}

// Show delete website confirmation modal
function showDeleteSiteConfirmation(siteId, siteName, siteUrl) {
    currentSiteId = siteId;
    document.getElementById('deleteSiteName').textContent = siteName;
    document.getElementById('deleteSiteUrl').textContent = siteUrl;
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteSiteModal'));
    deleteModal.show();
}


// Delete website monitoring
async function deleteSite(siteId) {
    try {
        await apiRequest(\`/api/admin/sites/\${siteId}?confirm=true\`, {
            method: 'DELETE'
        });

        // Hide modal and reload list
        const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteSiteModal'));
        deleteModal.hide();
        await loadSiteList(); // Reload list
        showToast('success', 'Website monitoring deleted successfully.');
        currentSiteId = null; // Reset current ID

    } catch (error) {
                showToast('danger', 'Failed to delete website: ' + error.message);
    }
}


// --- Utility Functions ---

// Unified Toast notification function (enhanced)
function showToast(type, message, options = {}) {
    const defaults = {
        success: 3000,
        info: 5000,
        warning: 8000,
        danger: 10000
    };

    const duration = options.duration || defaults[type] || 5000;
    const persistent = options.persistent || false;

    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'unified-toast ' + type;

    const icons = {
        success: 'bi-check-circle-fill',
        danger: 'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };

    const icon = document.createElement('i');
    icon.className = 'toast-icon bi ' + (icons[type] || icons.info);
    toast.appendChild(icon);

    const content = document.createElement('div');
    content.className = 'toast-content';
    content.textContent = String(message || '');
    toast.appendChild(content);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', function() {
        hideToast(toast);
    });
    toast.appendChild(closeBtn);

    if (!persistent) {
        const progress = document.createElement('div');
        progress.className = 'toast-progress';
        progress.style.animationDuration = duration + 'ms';
        toast.appendChild(progress);
    }

    container.appendChild(toast);

    if (!persistent) {
        setTimeout(() => hideToast(toast), duration);
    }

    return toast;
}

function hideToast(toast) {
    if (!toast || toast.classList.contains('hiding')) return;
    toast.classList.add('hiding');
    setTimeout(function() {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}





// --- Global Settings Functions (VPS Report Interval) ---
async function loadGlobalSettings() {
    try {
        const settings = await apiRequest('/api/admin/settings/vps-report-interval');
        if (settings && typeof settings.interval === 'number') {
            document.getElementById('vpsReportInterval').value = settings.interval;
        } else {
            document.getElementById('vpsReportInterval').value = 120; // Default if not set
        }
    } catch (error) {
                showToast('danger', 'Failed to load VPS report interval: ' + error.message);
        document.getElementById('vpsReportInterval').value = 120; // Default on error
    }
}

async function saveVpsReportInterval() {
    const intervalInput = document.getElementById('vpsReportInterval');
    const interval = parseInt(intervalInput.value, 10);

    if (isNaN(interval) || interval < 1) { // Changed to interval < 1
        showToast('warning', 'VPS report interval must be a number >= 1.');
        return;
    }
    // Removed warning for interval < 10

    try {
        await apiRequest('/api/admin/settings/vps-report-interval', {
            method: 'POST',
            body: JSON.stringify({ interval: interval })
        });

        showToast('success', 'VPS report interval saved. Frontend refresh updated.');

        // Immediately update the frontend refresh interval
        // Check if we're on a page that has VPS data updates running
        if (typeof initializeVpsDataUpdates === 'function') {
            try {
                await initializeVpsDataUpdates();
                            } catch (error) {
                            }
        }
    } catch (error) {
                showToast('danger', 'Failed to save VPS report interval: ' + error.message);
    }
}

// --- Auto Sort Features ---

// Auto sort servers
async function autoSortServers(sortBy) {
    try {
        await apiRequest('/api/admin/servers/auto-sort', {
            method: 'POST',
            body: JSON.stringify({ sortBy: sortBy, order: 'asc' })
        });

        // Update dropdown selection state
        updateServerSortDropdownSelection(sortBy);

        // Reload server list
        await loadServerList();
        showToast('success', 'Servers sorted by ' + getSortDisplayName(sortBy) + '.');

    } catch (error) {
                showToast('danger', 'Failed to auto-sort servers: ' + error.message);
    }
}

// Auto sort websites
async function autoSortSites(sortBy) {
    try {
        await apiRequest('/api/admin/sites/auto-sort', {
            method: 'POST',
            body: JSON.stringify({ sortBy: sortBy, order: 'asc' })
        });

        // Update dropdown selection state
        updateSiteSortDropdownSelection(sortBy);

        // Reload website list
        await loadSiteList();
        showToast('success', 'Websites sorted by ' + getSortDisplayName(sortBy) + '.');

    } catch (error) {
                showToast('danger', 'Failed to auto-sort websites: ' + error.message);
    }
}

// Get sort field display name
function getSortDisplayName(sortBy) {
    const displayNames = {
        'custom': 'Custom',
        'name': 'Name',
        'status': 'Status',
        'created_at': 'Created',
        'added_at': 'Added',
        'url': 'URL'
    };
    return displayNames[sortBy] || sortBy;
}

// Update server sort dropdown selection
function updateServerSortDropdownSelection(selectedSortBy) {
    const dropdown = document.querySelector('#serverAutoSortDropdown + .dropdown-menu');
    if (!dropdown) return;

    // Remove all active classes
    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to selected item
    const selectedItem = dropdown.querySelector(\`[onclick="autoSortServers('\${selectedSortBy}')"]\`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
}

// Update website sort dropdown selection
function updateSiteSortDropdownSelection(selectedSortBy) {
    const dropdown = document.querySelector('#siteAutoSortDropdown + .dropdown-menu');
    if (!dropdown) return;

    // Remove all active classes
    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to selected item
    const selectedItem = dropdown.querySelector(\`[onclick="autoSortSites('\${selectedSortBy}')"]\`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
}

// Admin page mobile server card rendering function
function renderMobileAdminServerCards(servers) {
    const mobileContainer = document.getElementById('mobileAdminServerContainer');
    if (!mobileContainer) return;

    mobileContainer.innerHTML = '';

    if (!servers || servers.length === 0) {
        mobileContainer.innerHTML = '<div class="text-center p-3 text-muted">No server data available.</div>';
        return;
    }

    servers.forEach(server => {
        const card = document.createElement('div');
        card.className = 'mobile-server-card';
        card.setAttribute('data-server-id', server.id);

        // Status display logic (same as desktop)
        let statusBadge = '<span class="status-badge bg-secondary bg-opacity-25 text-white">UNKNOWN</span>';
        let lastUpdateText = 'Never';

        if (server.last_report) {
            const lastUpdate = new Date(server.last_report * 1000);
            lastUpdateText = lastUpdate.toLocaleString();

            // Check if online (last report within 5 minutes)
            const now = new Date();
            const diffMinutes = (now - lastUpdate) / (1000 * 60);

            if (diffMinutes <= 5) {
                statusBadge = '<span class="status-badge status-online">ACTIVE</span>';
            } else {
                statusBadge = '<span class="status-badge status-offline">OFFLINE</span>';
            }
        }

        // Card header
        const cardHeader = document.createElement('div');
        cardHeader.className = 'mobile-card-header';
        cardHeader.innerHTML = \`
            <div class="mobile-card-header-left">
                \${statusBadge}
            </div>
            <h6 class="mobile-card-title text-center">\${server.name || 'Unnamed Server'}</h6>
            <div class="mobile-card-header-right">
                <span class="me-2">Show</span>
                <div class="form-check form-switch d-inline-block">
                    <input class="form-check-input server-visibility-toggle" type="checkbox"
                           data-server-id="\${server.id}" \${server.is_public ? 'checked' : ''}>
                </div>
            </div>
        \`;

        // Card body
        const cardBody = document.createElement('div');
        cardBody.className = 'mobile-card-body';

        // Description - single row
        if (server.description) {
            const descRow = document.createElement('div');
            descRow.className = 'mobile-card-row';
            descRow.innerHTML = \`
                <span class="mobile-card-label">Description</span>
                <span class="mobile-card-value">\${server.description}</span>
            \`;
            cardBody.appendChild(descRow);
        }



        // Four buttons - two-row, two-column layout
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'mobile-card-buttons-grid';
        buttonsContainer.innerHTML = \`
            <div class="d-flex gap-2 mb-2">
                <button class="btn btn-outline-secondary btn-sm flex-fill" onclick="showServerApiKey('\${server.id}')">
                    <i class="bi bi-key"></i> View Key
                </button>
                <button class="btn btn-outline-info btn-sm flex-fill" onclick="copyVpsInstallScript('\${server.id}', '\${server.name}', this)">
                    <i class="bi bi-clipboard"></i> Copy Script
                </button>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-outline-primary btn-sm flex-fill" onclick="editServer('\${server.id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-outline-danger btn-sm flex-fill" onclick="deleteServer('\${server.id}')">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </div>
        \`;
        cardBody.appendChild(buttonsContainer);

        // Last update time - bottom single row (consistent with desktop)
        const lastUpdateRow = document.createElement('div');
        lastUpdateRow.className = 'mobile-card-row mobile-card-footer';
        lastUpdateRow.innerHTML = \`
            <span class="mobile-card-label">Last Updated: \${lastUpdateText}</span>
        \`;
        cardBody.appendChild(lastUpdateRow);

        // Assemble card
        card.appendChild(cardHeader);
        card.appendChild(cardBody);

        mobileContainer.appendChild(card);
    });

    // Add event listeners for mobile visibility toggles
    document.querySelectorAll('.server-visibility-toggle').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const serverId = this.dataset.serverId;
            const isPublic = this.checked;
            toggleServerVisibility(serverId, isPublic);
        });
    });
}

// Toggle server visibility
async function toggleServerVisibility(serverId, isPublic) {
    try {
        const toggle = document.querySelector(\`.server-visibility-toggle[data-server-id="\${serverId}"]\`);
        if (toggle) {
            toggle.disabled = true;
            toggle.style.opacity = '0.6';
        }

        await apiRequest(\`/api/admin/servers/\${serverId}/visibility\`, {
            method: 'POST',
            body: JSON.stringify({ is_public: isPublic })
        });

        // Update local data
        const serverIndex = serverList.findIndex(s => s.id === serverId);
        if (serverIndex !== -1) {
            serverList[serverIndex].is_public = isPublic;
        }

        if (toggle) {
            toggle.disabled = false;
            toggle.style.opacity = '1';
        }

        showToast('success', 'Server visibility ' + (isPublic ? 'enabled' : 'disabled') + ' successfully.');

    } catch (error) {
                // Restore toggle state
        const toggle = document.querySelector(\`.server-visibility-toggle[data-server-id="\${serverId}"]\`);
        if (toggle) {
            toggle.checked = !isPublic;
            toggle.disabled = false;
            toggle.style.opacity = '1';
        }

        showToast('danger', 'Failed to toggle visibility: ' + error.message);
    }
}

// Admin page mobile website card rendering function
function renderMobileAdminSiteCards(sites) {
    const mobileContainer = document.getElementById('mobileAdminSiteContainer');
    if (!mobileContainer) return;

    mobileContainer.innerHTML = '';

    // Add centered sort and add website buttons
    const mobileActionsContainer = document.createElement('div');
    mobileActionsContainer.className = 'text-center mb-3';
    mobileActionsContainer.innerHTML = \`
        <div class="d-flex gap-2 justify-content-center">
            <div class="dropdown">
                <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-sort-alpha-down"></i> Auto Sort
                </button>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item active" href="#" onclick="autoSortSites('custom')">Custom Order</a></li>
                    <li><a class="dropdown-item" href="#" onclick="autoSortSites('name')">Sort by Name</a></li>
                    <li><a class="dropdown-item" href="#" onclick="autoSortSites('url')">Sort by URL</a></li>
                    <li><a class="dropdown-item" href="#" onclick="autoSortSites('status')">Sort by Status</a></li>
                </ul>
            </div>
            <button id="addSiteBtnMobile" class="btn btn-success" onclick="showSiteModal()">
                <i class="bi bi-plus-circle"></i> Add Website
            </button>
        </div>
    \`;
    mobileContainer.appendChild(mobileActionsContainer);

    if (!sites || sites.length === 0) {
        const noDataDiv = document.createElement('div');
        noDataDiv.className = 'text-center p-3 text-muted';
        noDataDiv.textContent = 'No monitored websites found.';
        mobileContainer.appendChild(noDataDiv);
        return;
    }

    sites.forEach(site => {
        const card = document.createElement('div');
        card.className = 'mobile-site-card';

        const statusInfo = getSiteStatusBadge(site.last_status);
        const lastCheckTime = site.last_checked ? new Date(site.last_checked * 1000).toLocaleString() : 'Never';
        const responseTime = site.last_response_time_ms !== null ? \`\${site.last_response_time_ms} ms\` : '-';

        // Card header - mirrors server card layout: status top-left, name center, visibility toggle top-right
        const cardHeader = document.createElement('div');
        cardHeader.className = 'mobile-card-header';
        cardHeader.innerHTML = \`
            <div class="mobile-card-header-left">
                <span class="badge \${statusInfo.class}">\${statusInfo.text}</span>
            </div>
            <h6 class="mobile-card-title text-center">\${site.name || 'Unnamed Website'}</h6>
            <div class="mobile-card-header-right">
                <span class="me-2">Show</span>
                <div class="form-check form-switch d-inline-block">
                    <input class="form-check-input site-visibility-toggle" type="checkbox"
                           data-site-id="\${site.id}" \${site.is_public ? 'checked' : ''}>
                </div>
            </div>
        \`;

        // Card body
        const cardBody = document.createElement('div');
        cardBody.className = 'mobile-card-body';

        // URL and website link - single row
        const urlRow = document.createElement('div');
        urlRow.className = 'mobile-card-row';
        urlRow.innerHTML = \`
            <span class="mobile-card-label" style="word-break: break-all;">
                URL: \${site.url}<a href="\${site.url}" target="_blank" rel="noopener noreferrer" class="text-decoration-none" style="margin-left: 4px;"><i class="bi bi-box-arrow-up-right"></i></a>
            </span>
        \`;
        cardBody.appendChild(urlRow);



        // Last checked - single row
        const lastCheckRow = document.createElement('div');
        lastCheckRow.className = 'mobile-card-row';
        lastCheckRow.innerHTML = \`
            <span class="mobile-card-label">Last Checked: \${lastCheckTime}</span>
        \`;
        cardBody.appendChild(lastCheckRow);

        // Action buttons - edit and delete
        const actionsRow = document.createElement('div');
        actionsRow.className = 'mobile-card-row';
        actionsRow.innerHTML = \`
            <div class="d-flex gap-2 w-100">
                <button class="btn btn-outline-primary btn-sm flex-fill" onclick="editSite('\${site.id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-outline-danger btn-sm flex-fill" onclick="deleteSite('\${site.id}')">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </div>
        \`;
        cardBody.appendChild(actionsRow);

        // Assemble card
        card.appendChild(cardHeader);
        card.appendChild(cardBody);

        mobileContainer.appendChild(card);
    });

    // Add event listeners for mobile website visibility toggles
    document.querySelectorAll('.site-visibility-toggle').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const siteId = this.dataset.siteId;
            const isPublic = this.checked;
            toggleSiteVisibility(siteId, isPublic);
        });
    });
}

// Toggle website visibility
async function toggleSiteVisibility(siteId, isPublic) {
    try {
        const toggle = document.querySelector(\`.site-visibility-toggle[data-site-id="\${siteId}"]\`);
        if (toggle) {
            toggle.disabled = true;
            toggle.style.opacity = '0.6';
        }

        await apiRequest(\`/api/admin/sites/\${siteId}/visibility\`, {
            method: 'POST',
            body: JSON.stringify({ is_public: isPublic })
        });

        // Update local data
        const siteIndex = siteList.findIndex(s => s.id === siteId);
        if (siteIndex !== -1) {
            siteList[siteIndex].is_public = isPublic;
        }

        if (toggle) {
            toggle.disabled = false;
            toggle.style.opacity = '1';
        }

        showToast('success', 'Website visibility ' + (isPublic ? 'enabled' : 'disabled') + ' successfully.');

    } catch (error) {
                // Restore toggle state
        const toggle = document.querySelector(\`.site-visibility-toggle[data-site-id="\${siteId}"]\`);
        if (toggle) {
            toggle.checked = !isPublic;
            toggle.disabled = false;
            toggle.style.opacity = '1';
        }

        showToast('danger', 'Failed to toggle visibility: ' + error.message);
    }
}

// Mobile view server API key
function showServerApiKey(serverId) {
    viewApiKey(serverId);
}
`;
}
