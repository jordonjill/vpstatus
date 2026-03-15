# VPS Status

VPS and website monitoring dashboard built on **Cloudflare Workers** + **D1**.

## Chinese Deployment Guide (Cloudflare Dashboard)

- [Cloudflare Worker 图形化部署完全指南（中文）](docs/cloudflare-worker-dashboard-deploy-zh-cn.md)

It provides:
- VPS metrics (CPU, memory, disk, network, uptime)
- 12-hour VPS history
- Website availability checks with 24-hour history
- Admin panel for servers/sites/settings
- Ubuntu agent installer (`/install.sh`) with `systemd`

## Prerequisites

| Requirement | Notes |
|---|---|
| Cloudflare account | Workers + D1 |
| Node.js >= 18 | Local dev/deploy |
| Ubuntu 18.04+ | For VPS agent |

## Deploy (Wrangler CLI)

### 1. Install dependencies

```bash
npm install
```

### 2. Create a D1 database

```bash
npx wrangler d1 create vps-monitor-db
```

Copy the returned `database_id` into `wrangler.toml`:

```toml
[[ d1_databases ]]
binding = "DB"
database_name = "vps-monitor-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

### 3. Set secrets

`JWT_SECRET` is required.

```bash
npx wrangler secret put JWT_SECRET
```

Optional secrets:

```bash
npx wrangler secret put USERNAME        # optional: pre-seed admin username
npx wrangler secret put PASSWORD        # optional: pre-seed admin password
npx wrangler secret put ALLOWED_ORIGINS # optional: comma-separated CORS allowlist
```

Notes:
- `USERNAME` and `PASSWORD` are only used to pre-create the first admin account.
- If not provided, you will create the first admin from the login page setup flow.

### 4. Deploy

```bash
npm run deploy
```

### 5. Initialize tables (optional but recommended)

Tables are auto-created on first request, but you can initialize explicitly:

```bash
curl https://<your-worker>/api/init-db
```

### 6. Cron trigger for website checks

Current default in `wrangler.toml`:

```toml
[triggers]
crons = ["* * * * *"]
```

This means the scheduled job runs **every minute** and performs website checks.

## First Login / Initial Setup

Open:
- `https://<your-worker>/login`
- or `https://<your-worker>/admin`

Behavior:
- If no admin exists, UI switches to **Initial Admin Setup** and you create the first account.
- If an admin exists, use normal login.

## Add Monitoring Targets

### Add a website

Admin panel -> **Add Website** -> provide:
- `url` (must start with `http://` or `https://`)
- `name` (optional)

The system performs an immediate check after creation, then scheduled checks via cron.

### Add a VPS server

Admin panel -> **Add Server**.

After creating a server, install the agent on that VPS:

```bash
curl -sL https://<your-worker>/install.sh | bash -s -- \
  -k <FULL_API_KEY> \
  -s <SERVER_ID> \
  -u https://<your-worker>
```

`/api/admin/servers` returns masked keys by default.  
Use `GET /api/admin/servers?full_key=true` (admin auth) when you need the full key.

## What `/install.sh` installs on VPS

The generated installer does the following:
1. Verifies Ubuntu 18.04+ and root privileges
2. Installs apt packages: `curl`, `bc`
3. Writes monitor script to `/opt/vps-status/monitor.sh` (or custom `-d`)
4. Creates `/etc/systemd/system/vps-status.service`
5. Enables and starts `vps-status`

Installer flags:

| Flag | Description | Default |
|---|---|---|
| `-k`, `--key` | API key (required) | - |
| `-s`, `--server` | server ID (required) | - |
| `-u`, `--url` | Worker URL | current worker origin |
| `-d`, `--dir` | install directory | `/opt/vps-status` |
| `-i`, `--interval` | report interval seconds | value from app config (default 60) |

Service operations:

```bash
systemctl status vps-status
systemctl restart vps-status
journalctl -u vps-status -f
```

## API Overview

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/auth/setup-required` | public | Whether first admin setup is needed |
| `POST` | `/api/auth/setup` | public | Create first admin account |
| `POST` | `/api/auth/login` | public | Login, returns JWT |
| `GET` | `/api/auth/status` | Bearer token optional | Auth/session status |
| `POST` | `/api/auth/change-password` | Bearer token | Change admin password |
| `GET` | `/api/servers` | public | Server list (public + admin aware) |
| `POST` | `/api/admin/servers` | Bearer token (admin) | Add server |
| `POST` | `/api/report/:id` | `X-API-Key` | Receive VPS metrics from agent |
| `GET` | `/api/status/batch` | public | Latest VPS status list |
| `GET` | `/api/history/:id` | public/admin | 12-hour VPS history |
| `GET` | `/api/sites/status` | public | Website status + 24h history |
| `POST` | `/api/admin/sites` | Bearer token | Add monitored website |
| `GET` | `/api/admin/settings/vps-report-interval` | public | Current VPS report interval |
| `POST` | `/api/admin/settings/vps-report-interval` | Bearer token | Update VPS report interval |
| `GET` | `/api/init-db` | public | Force table initialization |
| `GET` | `/install.sh` | public | Download generated VPS installer |

## Development

```bash
npm run dev
npm run build
npm run deploy
```

## Notes

- Keep `JWT_SECRET` strong and private.
- Keep server API keys private.
- If something fails, check Worker logs and VPS service logs (`journalctl -u vps-status -f`).

## License

MIT
