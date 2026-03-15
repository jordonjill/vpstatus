export function getLoginHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nexus | Admin Auth</title>
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
    <style>
        .auth-shell {
            min-height: calc(100vh - 58px);
            display: grid;
            place-items: center;
            padding: 2rem 1rem 3rem;
        }

        .auth-card {
            width: min(440px, 100%);
            border: 1px solid var(--border);
            border-radius: 18px;
            background: var(--card);
            box-shadow: var(--shadow);
            overflow: hidden;
        }

        .auth-head {
            padding: 1.3rem 1.4rem 1rem;
            border-bottom: 1px solid var(--border);
        }

        .auth-body {
            padding: 1.2rem 1.4rem 1.4rem;
        }

        .auth-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            padding: 0.25rem 0.55rem;
            border-radius: 999px;
            border: 1px solid var(--border);
            color: var(--muted);
            font-size: 0.78rem;
            font-family: 'JetBrains Mono', monospace;
        }

        .input-group-text {
            background: transparent;
            color: var(--muted);
            border-color: var(--border);
        }

        .form-control {
            border-left: 0;
        }

        .auth-note {
            color: var(--muted);
            font-size: 0.82rem;
        }
    </style>
</head>
<body>
    <div id="toastContainer" class="toast-container"></div>

    <nav class="navbar py-2">
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
                <a class="btn btn-outline-light btn-sm" href="/">Home</a>
            </div>
        </div>
    </nav>

    <main class="auth-shell">
        <section class="auth-card">
            <div class="auth-head">
                <div id="authModeChip" class="auth-chip"><i class="bi bi-shield-lock"></i>admin-auth</div>
                <h3 id="authTitle" class="mt-3 mb-1">Control Panel Login</h3>
                <p id="authSubtitle" class="mb-0 text-muted">Use admin credentials to access server and website management.</p>
            </div>
            <div class="auth-body">
                <form id="loginForm">
                    <div class="mb-3">
                        <label for="username" class="form-label">Username</label>
                        <div class="input-group">
                            <span class="input-group-text"><i class="bi bi-person"></i></span>
                            <input type="text" class="form-control" id="username" required autocomplete="username">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="password" class="form-label">Password</label>
                        <div class="input-group">
                            <span class="input-group-text"><i class="bi bi-key"></i></span>
                            <input type="password" class="form-control" id="password" required autocomplete="current-password">
                        </div>
                    </div>
                    <div id="confirmPasswordGroup" class="mb-3 d-none">
                        <label for="confirmPassword" class="form-label">Confirm Password</label>
                        <div class="input-group">
                            <span class="input-group-text"><i class="bi bi-check2-circle"></i></span>
                            <input type="password" class="form-control" id="confirmPassword" autocomplete="new-password">
                        </div>
                    </div>
                    <div id="loginAlert" class="alert alert-danger d-none" role="alert">Login failed.</div>
                    <div class="d-grid">
                        <button id="submitButton" type="submit" class="btn btn-primary">Sign In</button>
                    </div>
                </form>
                <div class="mt-3 auth-note">
                    <small id="defaultCredentialsInfo">Loading default credentials info...</small>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer py-3 mt-auto">
        <div class="container-fluid px-4 text-center small text-muted">
            VPS Status © 2026
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>
    <script src="/js/login.js"></script>
</body>
</html>`;
}
