export function getAdminHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - VPS Status</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <script>
        // Set theme immediately to avoid flash of wrong theme
        (function() {
            const theme = localStorage.getItem('vps-status-theme') || 'dark';
            document.documentElement.setAttribute('data-bs-theme', theme);
        })();
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet" integrity="sha384-4LISF5TTJX/fLmGSxO53rV4miRxdg84mZsxmO8Rx5jGtp/LbrixFETvWa5a6sESd" crossorigin="anonymous">
    <link href="/css/style.css" rel="stylesheet">
</head>
<body>
    <!-- Toast notification container -->
    <div id="toastContainer" class="toast-container"></div>

    <nav class="navbar navbar-expand-lg border-bottom sticky-top shadow-sm py-3">
        <div class="container-fluid px-4">
            <a class="navbar-brand d-flex align-items-center" href="/">
                <svg class="me-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="22 12 18 12 15 20 9 4 6 12 2 12"/>
                </svg>
                <span class="brand-nexus">NEXUS</span><span class="brand-status">COMMAND</span>
            </a>
            <div class="d-flex gap-3 align-items-center">
                <button id="themeToggler" class="btn btn-outline-light btn-sm rounded-circle p-2 d-flex shadow-sm">
                    <i class="bi bi-moon-stars-fill"></i>
                </button>
                <button class="btn btn-outline-info btn-sm rounded-pill px-3 shadow-sm d-flex align-items-center" id="changePasswordBtnDesktop" title="Change password">
                    <i class="bi bi-key me-2"></i><span>Security</span>
                </button>
                <div class="dropdown">
                    <button class="btn btn-outline-light btn-sm rounded-pill px-3 shadow-sm d-flex align-items-center dropdown-toggle" type="button" id="adminMenuDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bi bi-gear me-2"></i><span>System</span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end drop-blur" aria-labelledby="adminMenuDropdown" style="background: var(--card-bg); backdrop-filter: blur(20px); border: 1px solid var(--border-color);">
                        <li><button class="dropdown-item text-info" id="changePasswordBtn"><i class="bi bi-key me-2"></i>Change Password</button></li>
                    </ul>
                </div>
                <button id="logoutBtn" class="btn btn-danger btn-sm rounded-pill px-3 shadow-sm d-flex align-items-center">
                    <i class="bi bi-box-arrow-right me-2"></i><span>Disconnect</span>
                </button>
            </div>
        </div>
    </nav>

    <!-- Main admin card container -->
    <div class="container mt-4">
        <div class="card shadow-sm">
            <div class="card-body">
                <!-- Server Management section -->
                <div class="mb-4">
                    <div class="admin-header-row mb-3">
                        <div class="admin-header-title">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-server me-2"></i>Server Management
                            </h5>
                        </div>
                        <div class="admin-header-content">
                            <!-- VPS data update frequency form -->
                            <form id="globalSettingsFormPartial" class="admin-settings-form">
                                <div class="settings-group">
                                    <label for="vpsReportInterval" class="form-label">VPS Report Interval (seconds):</label>
                                    <div class="input-group">
                                        <input type="number" class="form-control form-control-sm" id="vpsReportInterval" placeholder="e.g. 60" min="1" style="width: 100px;">
                                        <button type="button" id="saveVpsReportIntervalBtn" class="btn btn-info btn-sm">Save</button>
                                    </div>
                                </div>
                            </form>

                            <!-- Action buttons -->
                            <div class="admin-actions-group">
                                <!-- Server auto-sort dropdown -->
                                <div class="dropdown me-2">
                                    <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="serverAutoSortDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                        <i class="bi bi-sort-alpha-down"></i> Auto Sort
                                    </button>
                                    <ul class="dropdown-menu" aria-labelledby="serverAutoSortDropdown">
                                        <li><a class="dropdown-item active" href="#" onclick="autoSortServers('custom')">Custom Order</a></li>
                                        <li><a class="dropdown-item" href="#" onclick="autoSortServers('name')">Sort by Name</a></li>
                                        <li><a class="dropdown-item" href="#" onclick="autoSortServers('status')">Sort by Status</a></li>
                                    </ul>
                                </div>

                                <!-- Add server button -->
                                <button id="addServerBtn" class="btn btn-primary">
                                    <i class="bi bi-plus-circle"></i> Add Server
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Desktop table view -->
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Description</th>
                                    <th>Status</th>
                                    <th>Last Updated</th>
                                    <th>API Key</th>
                                    <th>VPS Script</th>
                                    <th>Visible <i class="bi bi-question-circle text-muted" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Whether this server is visible to guests"></i></th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="serverTableBody">
                                <tr>
                                    <td colspan="10" class="text-center">Loading...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Mobile card view -->
                    <div class="mobile-card-container" id="mobileAdminServerContainer">
                        <div class="text-center p-3">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <div class="mt-2">Loading server data...</div>
                        </div>
                    </div>
                </div>

                <hr class="my-4">

                <!-- Website Monitoring Management section -->
                <div>
                    <div class="admin-header-row mb-3">
                        <div class="admin-header-title">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-globe me-2"></i>Website Monitoring
                            </h5>
                        </div>
                        <div class="admin-header-content">
                            <div class="admin-actions-group desktop-only">
                                <!-- Site auto-sort dropdown -->
                                <div class="dropdown me-2">
                                    <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="siteAutoSortDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                        <i class="bi bi-sort-alpha-down"></i> Auto Sort
                                    </button>
                                    <ul class="dropdown-menu" aria-labelledby="siteAutoSortDropdown">
                                        <li><a class="dropdown-item active" href="#" onclick="autoSortSites('custom')">Custom Order</a></li>
                                        <li><a class="dropdown-item" href="#" onclick="autoSortSites('name')">Sort by Name</a></li>
                                        <li><a class="dropdown-item" href="#" onclick="autoSortSites('url')">Sort by URL</a></li>
                                        <li><a class="dropdown-item" href="#" onclick="autoSortSites('status')">Sort by Status</a></li>
                                    </ul>
                                </div>

                                <button id="addSiteBtn" class="btn btn-success">
                                    <i class="bi bi-plus-circle"></i> Add Website
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Desktop table view -->
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Name</th>
                                    <th>URL</th>
                                    <th>Status</th>
                                    <th>Code</th>
                                    <th>Response Time (ms)</th>
                                    <th>Last Checked</th>
                                    <th>Visible <i class="bi bi-question-circle text-muted" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Whether this website is visible to guests"></i></th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="siteTableBody">
                                <tr>
                                    <td colspan="9" class="text-center">Loading...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Mobile card view -->
                    <div class="mobile-card-container" id="mobileAdminSiteContainer">
                        <div class="text-center p-3">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <div class="mt-2">Loading website data...</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <!-- Add / Edit Server Modal -->
    <div class="modal fade" id="serverModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="serverModalTitle">Add Server</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="serverForm">
                        <input type="hidden" id="serverId">
                        <div class="mb-3">
                            <label for="serverName" class="form-label">Server Name</label>
                            <input type="text" class="form-control" id="serverName" required>
                        </div>
                        <div class="mb-3">
                            <label for="serverDescription" class="form-label">Description (optional)</label>
                            <textarea class="form-control" id="serverDescription" rows="2"></textarea>
                        </div>

                        <div id="serverIdDisplayGroup" class="mb-3 d-none">
                            <label for="serverIdDisplay" class="form-label">Server ID</label>
                            <div class="input-group">
                                <input type="text" class="form-control" id="serverIdDisplay" readonly>
                                <button class="btn btn-outline-secondary" type="button" id="copyServerIdBtn">
                                    <i class="bi bi-clipboard"></i>
                                </button>
                            </div>
                        </div>

                        <div id="apiKeyGroup" class="mb-3 d-none">
                            <label for="apiKey" class="form-label">API Key</label>
                            <div class="input-group">
                                <input type="text" class="form-control" id="apiKey" readonly>
                                <button class="btn btn-outline-secondary" type="button" id="copyApiKeyBtn">
                                    <i class="bi bi-clipboard"></i>
                                </button>
                            </div>
                        </div>

                        <div id="workerUrlDisplayGroup" class="mb-3 d-none">
                            <label for="workerUrlDisplay" class="form-label">Worker URL</label>
                            <div class="input-group">
                                <input type="text" class="form-control" id="workerUrlDisplay" readonly>
                                <button class="btn btn-outline-secondary" type="button" id="copyWorkerUrlBtn">
                                    <i class="bi bi-clipboard"></i>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="saveServerBtn">Save</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Add / Edit Website Modal -->
    <div class="modal fade" id="siteModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="siteModalTitle">Add Website</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="siteForm">
                        <input type="hidden" id="siteId">
                        <div class="mb-3">
                            <label for="siteName" class="form-label">Website Name (optional)</label>
                            <input type="text" class="form-control" id="siteName">
                        </div>
                        <div class="mb-3">
                            <label for="siteUrl" class="form-label">Website URL</label>
                            <input type="url" class="form-control" id="siteUrl" placeholder="https://example.com" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="saveSiteBtn">Save</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Confirm Delete Server Modal -->
    <div class="modal fade" id="deleteModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Confirm Delete</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete server "<span id="deleteServerName"></span>"?</p>
                    <p class="text-danger">This action is irreversible. All associated monitoring data will also be deleted.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Confirm Delete Website Modal -->
    <div class="modal fade" id="deleteSiteModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Confirm Delete Website</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to stop monitoring "<span id="deleteSiteName"></span>" (<span id="deleteSiteUrl"></span>)?</p>
                    <p class="text-danger">This action is irreversible.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirmDeleteSiteBtn">Delete</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Change Password Modal -->
    <div class="modal fade" id="passwordModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Change Password</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="passwordForm">
                        <div class="mb-3">
                            <label for="currentPassword" class="form-label">Current Password</label>
                            <input type="password" class="form-control" id="currentPassword" required>
                        </div>
                        <div class="mb-3">
                            <label for="newPassword" class="form-label">New Password</label>
                            <input type="password" class="form-control" id="newPassword" required>
                        </div>
                        <div class="mb-3">
                            <label for="confirmPassword" class="form-label">Confirm New Password</label>
                            <input type="password" class="form-control" id="confirmPassword" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="savePasswordBtn">Save</button>
                </div>
            </div>
        </div>
    </div>

    <footer class="footer fixed-bottom py-2 bg-light border-top">
        <div class="container text-center">
            <span class="text-muted small">VPS Status &copy; 2026</span>
            <a href="https://github.com/jordonjill/status" target="_blank" rel="noopener noreferrer" class="ms-3 text-muted" title="GitHub Repository">
                <i class="bi bi-github"></i>
            </a>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>
    <script src="/js/admin.js"></script>
</body>
</html>`;
}
