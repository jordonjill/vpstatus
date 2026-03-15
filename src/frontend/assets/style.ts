export function getStyleCss(): string {
  return `/* Base */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
    --bg: #0a111f;
    --bg-soft: #101a2d;
    --card: rgba(16, 26, 45, 0.72);
    --card-solid: #111b30;
    --card-bg: rgba(16, 26, 45, 0.92);
    --text: #e8eefc;
    --muted: #8da3c7;
    --border: rgba(164, 189, 255, 0.2);
    --border-color: rgba(164, 189, 255, 0.2);
    --accent: #3fd0ff;
    --accent-2: #4f7cff;
    --ok: #37d28f;
    --bad: #ff6f91;
    --warn: #f8c35b;
    --shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
}

[data-bs-theme="light"] {
    --bg: #f2f7ff;
    --bg-soft: #e6eefc;
    --card: rgba(255, 255, 255, 0.86);
    --card-solid: #ffffff;
    --card-bg: rgba(255, 255, 255, 0.95);
    --text: #102039;
    --muted: #4e648a;
    --border: rgba(24, 64, 128, 0.14);
    --border-color: rgba(24, 64, 128, 0.14);
    --accent: #0b84ff;
    --accent-2: #4f63ff;
    --ok: #159b5d;
    --bad: #d53b63;
    --warn: #a26b00;
    --shadow: 0 14px 32px rgba(13, 46, 99, 0.12);
}

* {
    box-sizing: border-box;
}

body {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: var(--text) !important;
    background-color: var(--bg) !important;
    background-image:
        radial-gradient(1000px 500px at 8% -8%, rgba(63, 208, 255, 0.18), transparent 45%),
        radial-gradient(900px 500px at 90% 5%, rgba(79, 124, 255, 0.17), transparent 45%),
        linear-gradient(180deg, var(--bg), var(--bg-soft));
    background-attachment: fixed;
}

a {
    color: var(--accent);
}

.text-muted,
.small.text-muted {
    color: var(--muted) !important;
}

h1, h2, h3, h4, h5, h6 {
    color: var(--text);
    letter-spacing: -0.01em;
}

.font-monospace,
code,
pre {
    font-family: 'JetBrains Mono', monospace !important;
}

/* Navbar */
.navbar {
    background: color-mix(in oklab, var(--card-solid) 78%, transparent) !important;
    border-bottom: 1px solid var(--border) !important;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}

.navbar-brand {
    font-weight: 700;
    letter-spacing: 0.04em;
}

.brand-nexus {
    font-weight: 700;
    letter-spacing: 0.06em;
}

.brand-status {
    font-weight: 400;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin-left: 0.25em;
}

.navbar .nav-link,
.navbar a {
    color: var(--text) !important;
}

/* Buttons */
.btn {
    border-radius: 10px;
}

.btn-outline-light {
    border-color: var(--border) !important;
    color: var(--text) !important;
    background: transparent;
}

.btn-outline-light:hover {
    border-color: var(--accent) !important;
    color: #001121 !important;
    background: var(--accent) !important;
}

.btn-outline-secondary {
    border-color: var(--border);
    color: var(--text);
}

.btn-outline-secondary:hover {
    border-color: var(--accent);
    color: var(--text);
    background: rgba(63, 208, 255, 0.12);
}

.btn-primary,
.bg-primary {
    background: linear-gradient(135deg, var(--accent), var(--accent-2)) !important;
    border-color: transparent !important;
    color: #071521 !important;
}

.security-pill-btn {
    border-color: color-mix(in oklab, var(--accent) 66%, #ffffff 12%) !important;
    color: var(--text) !important;
    background: linear-gradient(
        135deg,
        color-mix(in oklab, var(--accent) 30%, transparent),
        color-mix(in oklab, var(--accent-2) 16%, transparent)
    ) !important;
}

.security-pill-btn:hover {
    border-color: var(--accent) !important;
    color: #041422 !important;
    background: linear-gradient(135deg, var(--accent), var(--accent-2)) !important;
}

/* Cards */
.card {
    background: var(--card) !important;
    border: 1px solid var(--border) !important;
    box-shadow: var(--shadow);
    border-radius: 16px;
    margin-bottom: 1.5rem;
    overflow: hidden;
}

.card-header {
    border-bottom: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.01);
}

.card-title {
    color: var(--text);
}

/* Tables */
.table {
    color: var(--text);
    margin-bottom: 0;
}

.table > :not(caption) > * > * {
    background: transparent;
    border-color: var(--border);
    vertical-align: middle;
}

.table-hover > tbody > tr:hover > * {
    --bs-table-accent-bg: rgba(63, 208, 255, 0.06);
    color: var(--text);
}

.table-striped > tbody > tr:nth-of-type(odd) > * {
    --bs-table-accent-bg: rgba(255, 255, 255, 0.02);
    color: var(--text);
}

/* Progress */
.progress {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    overflow: hidden;
}

[data-bs-theme="light"] .progress {
    background: rgba(17, 50, 95, 0.1);
}

.progress-bar {
    transition: width 0.4s ease;
}

.progress-bar-ok {
    background: linear-gradient(90deg, var(--accent-2), var(--accent));
}

.progress-bar-warn {
    background: linear-gradient(90deg, #c98a00, var(--warn));
}

.progress-bar-bad {
    background: linear-gradient(90deg, #c93060, var(--bad));
}

.progress-text {
    color: var(--muted);
    font-size: 0.75rem;
    margin-top: 0.2rem;
}

/* Status badges */
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.32rem 0.72rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
}

.status-online {
    color: #a8ffda;
    border: 1px solid rgba(55, 210, 143, 0.32);
    background: rgba(55, 210, 143, 0.16);
}

.status-offline {
    color: #ffc0cf;
    border: 1px solid rgba(255, 111, 145, 0.32);
    background: rgba(255, 111, 145, 0.16);
}

[data-bs-theme="light"] .status-online {
    color: #10693f;
    background: #def8eb;
    border-color: #9ce4c3;
}

[data-bs-theme="light"] .status-offline {
    color: #892344;
    background: #ffe1e9;
    border-color: #ffc1d1;
}

/* Detail rows */
.server-row {
    cursor: pointer;
}

.server-details-row td {
    padding: 0 !important;
}

.server-details-content {
    padding: 1rem;
    background: color-mix(in oklab, var(--card-solid) 90%, transparent);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.8rem;
}

.detail-item {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
}

.detail-item strong {
    display: block;
    margin-bottom: 0.3rem;
    color: var(--muted);
}

/* Website history bars */
.history-bar-container {
    display: inline-flex;
    flex-direction: row-reverse;
    align-items: center;
    gap: 2px;
    height: 22px;
}

.history-bar {
    width: 7px;
    height: 100%;
    border-radius: 2px;
}

.history-bar-up {
    background: var(--ok);
}

.history-bar-down {
    background: var(--bad);
}

.history-bar-pending {
    background: #6f7f9d;
}

/* Mobile cards */
.mobile-card-container {
    display: none;
}

.mobile-server-card,
.mobile-site-card {
    border: 1px solid var(--border);
    border-radius: 14px;
    margin-bottom: 0.8rem;
    overflow: hidden;
    background: var(--card);
}

.mobile-card-header {
    padding: 0.7rem 0.85rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
}

.mobile-card-title {
    margin: 0;
    font-size: 1rem;
    color: var(--text);
}

.mobile-card-body {
    padding: 0.8rem;
}

.mobile-card-row {
    padding: 0.35rem 0;
    border-bottom: 1px dashed var(--border);
}

.mobile-card-row:last-child {
    border-bottom: none;
}

.mobile-card-two-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.65rem;
    padding: 0.4rem 0;
    border-bottom: 1px dashed var(--border);
}

.mobile-card-column-item {
    min-width: 0;
}

.mobile-card-label {
    color: var(--muted);
    font-size: 0.74rem;
    text-transform: uppercase;
}

.mobile-card-value {
    color: var(--text);
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
}

.mobile-history-container {
    margin-top: 0.45rem;
}

.mobile-history-label {
    color: var(--muted);
    margin-bottom: 0.2rem;
    font-size: 0.74rem;
}

/* Admin layout helpers */
.admin-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: wrap;
}

.admin-header-content {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: wrap;
}

.admin-settings-form .form-label {
    margin-bottom: 0;
    color: var(--muted);
    font-size: 0.8rem;
}

.admin-actions-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.settings-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* Toast */
.toast-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    width: min(92vw, 420px);
}

.unified-toast {
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-columns: 22px 1fr 22px;
    gap: 0.65rem;
    align-items: start;
    padding: 0.8rem 0.9rem 0.9rem;
    border-radius: 12px;
    border: 1px solid var(--border);
    color: var(--text);
    background: color-mix(in oklab, var(--card-solid) 92%, transparent);
    box-shadow: var(--shadow);
    backdrop-filter: blur(10px);
    animation: toast-in 180ms ease-out;
}

.unified-toast.success {
    border-color: color-mix(in oklab, var(--ok) 65%, var(--border));
}

.unified-toast.info {
    border-color: color-mix(in oklab, var(--accent) 65%, var(--border));
}

.unified-toast.warning {
    border-color: color-mix(in oklab, var(--warn) 60%, var(--border));
}

.unified-toast.danger {
    border-color: color-mix(in oklab, var(--bad) 68%, var(--border));
}

.toast-icon {
    margin-top: 0.06rem;
    font-size: 1rem;
}

.unified-toast.success .toast-icon { color: var(--ok); }
.unified-toast.info .toast-icon { color: var(--accent); }
.unified-toast.warning .toast-icon { color: var(--warn); }
.unified-toast.danger .toast-icon { color: var(--bad); }

.toast-content {
    line-height: 1.45;
    word-break: break-word;
}

.toast-close {
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    width: 22px;
    height: 22px;
    padding: 0;
    line-height: 1;
    font-size: 1rem;
    border-radius: 6px;
}

.toast-close:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.08);
}

.toast-progress {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 2px;
    width: 100%;
    transform-origin: left center;
    animation-name: toast-progress;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
}

.unified-toast.warning .toast-progress {
    background: linear-gradient(90deg, #c98a00, var(--warn));
}

.unified-toast.danger .toast-progress {
    background: linear-gradient(90deg, #d53b63, var(--bad));
}

.unified-toast.hiding {
    animation: toast-out 180ms ease-in forwards;
}

/* Modal */
.modal-content {
    border: 1px solid var(--border);
    background: color-mix(in oklab, var(--card-solid) 92%, transparent);
    color: var(--text);
}

.modal-header,
.modal-footer {
    border-color: var(--border);
}

.form-control,
.form-select {
    background: rgba(255, 255, 255, 0.04);
    border-color: var(--border);
    color: var(--text);
}

.form-control:focus,
.form-select:focus {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--accent);
    color: var(--text);
    box-shadow: 0 0 0 0.25rem rgba(63, 208, 255, 0.2);
}

/* Footer */
.footer {
    margin-top: auto;
    border-top: 1px solid var(--border);
    background: transparent;
}

.fleet-footnote {
    margin-top: 0.2rem;
    font-size: 0.76rem;
    letter-spacing: 0.02em;
    opacity: 0.88;
}

/* Responsive */
@media (max-width: 768px) {
    .table-responsive {
        display: none !important;
    }

    .mobile-card-container {
        display: block !important;
    }

    .desktop-only {
        display: none !important;
    }

    .navbar-brand {
        font-size: 1rem;
    }

    .admin-header-row,
    .admin-header-content,
    .settings-group {
        width: 100%;
        align-items: stretch;
    }

    .settings-group {
        flex-direction: column;
    }

    .toast-container {
        left: 0.75rem;
        right: 0.75rem;
        width: auto;
    }
}

@media (min-width: 769px) {
    .mobile-only {
        display: none !important;
    }
}

@keyframes toast-progress {
    from { transform: scaleX(1); }
    to { transform: scaleX(0); }
}

@keyframes toast-in {
    from {
        opacity: 0;
        transform: translateY(-8px) scale(0.98);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes toast-out {
    from {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
    to {
        opacity: 0;
        transform: translateY(-6px) scale(0.98);
    }
}
`;
}
