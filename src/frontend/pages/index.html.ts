export function getIndexHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nexus | Fleet Telemetry</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <script>
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
<body class="d-flex flex-column h-100">
    <div id="toastContainer" class="toast-container"></div>

    <nav class="navbar navbar-expand-lg sticky-top py-2">
        <div class="container-fluid px-4">
            <a class="navbar-brand d-flex align-items-center" href="/">
                <svg class="me-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="22 12 18 12 15 20 9 4 6 12 2 12"/>
                </svg>
                <span class="brand-nexus">NEXUS</span><span class="brand-status">STATUS</span>
            </a>
            <div class="d-flex align-items-center gap-2">
                <button id="themeToggler" class="btn btn-outline-light btn-sm" title="Toggle theme">
                    <i class="bi bi-moon-stars-fill"></i>
                </button>
                <a id="adminAuthLink" class="btn btn-outline-light btn-sm" href="/login.html">Admin Login</a>
            </div>
        </div>
    </nav>

    <main class="container-fluid px-4 py-4 flex-shrink-0">
        <div id="demoModeBanner" class="alert alert-warning d-none py-2" role="status"></div>

        <div id="noServers" class="alert alert-info d-none" role="alert"></div>
        <div class="card border-0">
            <div class="card-header d-flex justify-content-between align-items-center">
                <div><i class="bi bi-hdd-network me-2"></i>Compute Nodes</div>
                <div class="small text-muted">auto-refresh: 1 min</div>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive desktop-only">
                    <table class="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th class="ps-4">Server</th>
                                <th>Status</th>
                                <th>CPU</th>
                                <th>Memory</th>
                                <th>Disk</th>
                                <th>Upload</th>
                                <th>Download</th>
                                <th>Uptime</th>
                                <th>Last Update</th>
                                <th class="pe-4">Availability</th>
                            </tr>
                        </thead>
                        <tbody id="serverTableBody" class="font-monospace">
                            <tr>
                                <td colspan="10" class="text-center py-4 text-muted">Loading server telemetry...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="mobileServerContainer" class="mobile-card-container p-3">
                    <div class="text-center py-4 text-muted">Loading server telemetry...</div>
                </div>
            </div>
        </div>

        <template id="serverDetailsTemplate">
            <tr class="server-details-row d-none">
                <td colspan="10">
                    <div class="server-details-content"></div>
                </td>
            </tr>
        </template>

        <div id="noSites" class="alert alert-info d-none mt-4" role="alert"></div>
        <div class="card border-0">
            <div class="card-header d-flex justify-content-between align-items-center">
                <div><i class="bi bi-globe2 me-2"></i>Website Monitors</div>
                <div class="small text-muted">auto-refresh: 60 min</div>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive desktop-only">
                    <table class="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th class="ps-4">Website</th>
                                <th>Status</th>
                                <th>HTTP Code</th>
                                <th>Response Time</th>
                                <th>Last Checked</th>
                                <th class="pe-4">24h History</th>
                            </tr>
                        </thead>
                        <tbody id="siteStatusTableBody" class="font-monospace">
                            <tr>
                                <td colspan="6" class="text-center py-4 text-muted">Loading website monitor data...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="mobileSiteContainer" class="mobile-card-container p-3">
                    <div class="text-center py-4 text-muted">Loading website monitor data...</div>
                </div>
            </div>
        </div>
    </main>

    <div class="modal fade" id="chartsModal" tabindex="-1" aria-labelledby="chartsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="chartsModalLabel"><i class="bi bi-graph-up-arrow me-2"></i>12-Hour Charts</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div id="chartsModalLoading" class="text-center py-4">
                        <div class="spinner-border text-info" role="status"></div>
                        <div class="mt-2">Loading chart data...</div>
                    </div>
                    <div id="chartsContainer" class="d-none">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="card mb-0">
                                    <div class="card-header py-2"><strong>CPU Usage (%)</strong></div>
                                    <div class="card-body"><canvas id="cpuChart"></canvas></div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card mb-0">
                                    <div class="card-header py-2"><strong>Memory Usage (%)</strong></div>
                                    <div class="card-body"><canvas id="memoryChart"></canvas></div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card mb-0">
                                    <div class="card-header py-2"><strong>Disk Usage (%)</strong></div>
                                    <div class="card-body"><canvas id="diskChart"></canvas></div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card mb-0">
                                    <div class="card-header py-2"><strong>Network Speed (KB/s)</strong></div>
                                    <div class="card-body"><canvas id="networkChart"></canvas></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="chartsError" class="alert alert-danger d-none mt-3">Failed to load chart data.</div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <footer class="footer py-3 mt-auto">
        <div class="container-fluid px-4 text-center small text-muted">
            <div>VPS Status © 2026</div>
            <div class="fleet-footnote">Realtime VPS metrics with 12-hour availability and endpoint checks.</div>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="/js/main.js"></script>
</body>
</html>`;
}
