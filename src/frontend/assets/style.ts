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
    --bad: #ff3f76;
    --warn: #ffb11f;
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
    --bad: #d7265f;
    --warn: #c77800;
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
    font-size: 1.02rem;
    padding-top: 0.92rem;
    padding-bottom: 0.92rem;
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

.server-table thead th {
    color: var(--muted);
    font-size: 0.86rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    padding-top: 0.78rem;
    padding-bottom: 0.78rem;
    white-space: nowrap;
}

.server-table tbody td {
    font-size: 0.94rem;
}

.server-table .server-col,
.server-table .server-name-cell {
    text-align: left;
    padding-left: 1.35rem !important;
}

.server-table .server-name-cell {
    font-size: 1rem;
    font-weight: 600;
}

.server-table .metric-col,
.server-table .metric-cell {
    text-align: center;
    padding-left: 0.72rem;
    padding-right: 0.72rem;
}

.server-table .availability-col,
.server-table .availability-cell {
    text-align: center;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
}

.server-table .progress {
    margin-left: auto;
    margin-right: auto;
    max-width: 108px;
}

.server-table .progress-text {
    text-align: center !important;
}

.site-table thead th {
    color: var(--muted);
    font-size: 0.86rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    padding-top: 0.78rem;
    padding-bottom: 0.78rem;
    white-space: nowrap;
}

.site-table tbody td {
    font-size: 0.94rem;
}

.site-table .site-col,
.site-table .site-name-cell {
    text-align: left;
    padding-left: 1.35rem !important;
}

.site-table .site-name-cell {
    font-size: 1rem;
    font-weight: 600;
}

.site-table .site-metric-col,
.site-table .site-metric-cell {
    text-align: center;
    padding-left: 0.72rem;
    padding-right: 0.72rem;
}

.site-table .site-history-col,
.site-table .site-history-cell {
    text-align: center;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
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
    background: linear-gradient(90deg, #ff8a00, var(--warn));
}

.progress-bar-bad {
    background: linear-gradient(90deg, #ff1f5d, var(--bad));
}

.progress-text {
    color: var(--muted);
    font-size: 0.82rem;
    margin-top: 0.2rem;
}

/* Status badges */
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.76rem;
    border-radius: 999px;
    font-size: 0.79rem;
    font-weight: 700;
    letter-spacing: 0.04em;
}

.status-online {
    color: #a8ffda;
    border: 1px solid rgba(55, 210, 143, 0.32);
    background: rgba(55, 210, 143, 0.16);
}

.status-offline {
    color: #ffd2df;
    border: 1px solid rgba(255, 63, 118, 0.42);
    background: rgba(255, 63, 118, 0.2);
}

[data-bs-theme="light"] .status-online {
    color: #10693f;
    background: #def8eb;
    border-color: #9ce4c3;
}

[data-bs-theme="light"] .status-offline {
    color: #94153f;
    background: #ffd6e2;
    border-color: #ff8aac;
}

/* Detail rows */
.server-row {
    cursor: pointer;
}

.server-details-row td {
    padding: 0 !important;
}

.server-details-content {
    padding: 1.16rem;
    background: color-mix(in oklab, var(--card-solid) 90%, transparent);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.96rem;
}

.detail-item {
    border: 1px solid var(--border);
    border-radius: 11px;
    padding: 1.12rem 1.14rem 0.98rem;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.detail-title {
    display: block;
    margin-bottom: 0.16rem;
    color: color-mix(in oklab, var(--text) 62%, var(--muted));
    font-size: 1.04rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-weight: 700;
}

.detail-line {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    width: 100%;
    column-gap: 0.82rem;
    row-gap: 0.1rem;
    padding: 0.03rem 0;
}

.detail-label {
    color: color-mix(in oklab, var(--text) 72%, var(--muted));
    font-size: 1.08rem;
    letter-spacing: 0.01em;
    font-weight: 500;
}

.detail-label-sub {
    display: block;
    margin-top: 0;
    font-size: 0.96rem;
    letter-spacing: 0.01em;
    line-height: 1.2;
}

.detail-metric {
    color: var(--text);
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    text-align: right;
    line-height: 1.3;
    font-size: 1.02rem;
}

.detail-line-load {
    align-items: end;
}

.detail-line-load .detail-metric {
    white-space: nowrap;
}

.detail-note {
    margin-top: 0.3rem;
    font-size: 1rem;
    color: color-mix(in oklab, var(--text) 60%, var(--muted));
}

[data-bs-theme="light"] .detail-title {
    color: #3c5478;
}

[data-bs-theme="light"] .detail-label {
    color: #405a82;
}

[data-bs-theme="light"] .detail-note {
    color: #4a6289;
}

.chart-trigger-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.34rem;
    margin-left: 0.45rem;
    padding: 0.22rem 0.62rem;
    border: 1px solid color-mix(in oklab, var(--accent) 42%, var(--border));
    border-radius: 999px;
    background: rgba(63, 208, 255, 0.12);
    color: var(--accent);
    font-size: 0.72rem;
    line-height: 1;
    font-weight: 600;
    letter-spacing: 0.04em;
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.chart-trigger-btn:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: #061624;
    transform: translateY(-1px);
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
    gap: 0.45rem;
}

.mobile-card-title {
    margin: 0;
    font-size: 1.12rem;
    line-height: 1.16;
    word-break: break-word;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.62rem;
    padding: 0.4rem 0;
    border-bottom: 1px dashed var(--border);
}

.mobile-card-column-item {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
    min-width: 0;
}

.mobile-card-label {
    color: var(--muted);
    font-size: 0.78rem;
    letter-spacing: 0.03em;
    line-height: 1.18;
    text-transform: uppercase;
    display: block;
}

.mobile-card-value {
    color: var(--text);
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    display: block;
    font-size: 1.02rem;
    line-height: 1.22;
    word-break: break-word;
}

.mobile-card-two-columns .mobile-card-value {
    white-space: nowrap;
}

.mobile-card-meta {
    font-size: 0.9rem;
}

.mobile-card-action-row {
    border-bottom: none;
    padding-top: 0.55rem;
}

.mobile-chart-btn {
    width: 100%;
    border-radius: 10px;
    border: 1px solid color-mix(in oklab, var(--accent) 48%, var(--border));
    background: rgba(63, 208, 255, 0.14);
    color: var(--accent);
    font-weight: 700;
    letter-spacing: 0.02em;
}

.mobile-chart-btn:hover {
    background: var(--accent);
    color: #061624;
}

.mobile-history-container {
    margin-top: 0.45rem;
}

.mobile-history-label {
    color: var(--muted);
    margin-bottom: 0.2rem;
    font-size: 0.74rem;
}

.mobile-history-row {
    padding-top: 0.55rem;
    padding-bottom: 0.35rem;
}

.mobile-history-bars {
    display: grid;
    grid-template-columns: repeat(24, minmax(0, 1fr));
    gap: 2px;
    width: 100%;
    height: 22px;
}

.mobile-history-bars .history-bar {
    width: auto;
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
