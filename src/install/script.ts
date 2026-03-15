import type { Env } from '../types';
import { getVpsReportInterval } from '../utils/vpsInterval';
import { D1_SCHEMAS } from '../db/schema';

export async function handleInstallScript(request: Request, url: URL, env: Env): Promise<Response> {
  const baseUrl = url.origin;
  let vpsReportInterval = '60';

  try {
    if (D1_SCHEMAS?.app_config) {
      await env.DB.exec(D1_SCHEMAS.app_config);
    }
    const interval = await getVpsReportInterval(env);
    vpsReportInterval = interval.toString();
  } catch {
    // Use default value
  }

  const script = `#!/bin/bash
# VPS Status Installer - Ubuntu 18.04+ only, systemd required

set -euo pipefail

# ── OS check ──────────────────────────────────────────────────────────────────
if [[ ! -f /etc/os-release ]]; then
  echo "ERROR: Cannot detect OS. Ubuntu 18.04+ is required." >&2
  exit 1
fi
# shellcheck source=/dev/null
source /etc/os-release
if [[ "\${ID:-}" != "ubuntu" ]]; then
  echo "ERROR: This installer only supports Ubuntu. Detected: \${PRETTY_NAME:-unknown}." >&2
  exit 1
fi
major=\$(echo "\${VERSION_ID:-0}" | cut -d. -f1)
if [[ "\$major" -lt 18 ]]; then
  echo "ERROR: Ubuntu 18.04+ required. Detected: \${VERSION_ID:-unknown}." >&2
  exit 1
fi

# ── Defaults ──────────────────────────────────────────────────────────────────
API_KEY=""
SERVER_ID=""
WORKER_URL="${baseUrl}"
INSTALL_DIR="/opt/vps-status"
SERVICE_NAME="vps-status"
INTERVAL=${vpsReportInterval}

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    -k|--key)      API_KEY="$2";    shift 2 ;;
    -s|--server)   SERVER_ID="$2";  shift 2 ;;
    -u|--url)      WORKER_URL="$2"; shift 2 ;;
    -d|--dir)      INSTALL_DIR="$2"; shift 2 ;;
    -i|--interval) INTERVAL="$2";   shift 2 ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
done

if [[ -z "$API_KEY" || -z "$SERVER_ID" ]]; then
  echo "Error: API key (-k) and server ID (-s) are required."
  echo "Usage: $0 -k API_KEY -s SERVER_ID [-u WORKER_URL] [-i INTERVAL]"
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Error: This script requires root privileges."
  exit 1
fi

echo "=== VPS Status Installer ==="
echo "Install directory : $INSTALL_DIR"
echo "Worker URL        : $WORKER_URL"
echo "Report interval   : \${INTERVAL}s"

# ── Install dependencies ──────────────────────────────────────────────────────
apt-get update -qq
apt-get install -y -qq curl bc

# ── Create install directory ──────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"

# ── Write monitor script ──────────────────────────────────────────────────────
cat > "$INSTALL_DIR/monitor.sh" << 'EOF'
#!/bin/bash
# VPS Status daemon

API_KEY="__API_KEY__"
SERVER_ID="__SERVER_ID__"
WORKER_URL="__WORKER_URL__"
INTERVAL=__INTERVAL__

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"; }

# CPU usage percent and load averages
get_cpu() {
  local idle usage load
  idle=$(top -bn1 | grep -i "cpu(s)" | sed 's/.*,\\s*\\([0-9.]*\\)\\s*%\\?\\s*id.*/\\1/')
  usage=$(echo "scale=1; 100 - \${idle:-0}" | bc)
  load=$(awk '{print $1","$2","$3}' /proc/loadavg)
  echo "{\\"usage_percent\\":\${usage},\\"load_avg\\":[\${load}]}"
}

# Memory stats in KB using /proc/meminfo
get_memory() {
  local total free used pct
  total=$(awk '/^MemTotal:/{print $2}'     /proc/meminfo)
  free=$(awk  '/^MemAvailable:/{print $2}' /proc/meminfo)
  used=$(( total - free ))
  pct=$(echo "scale=1; \${used} * 100 / \${total}" | bc)
  echo "{\\"total\\":\${total},\\"used\\":\${used},\\"free\\":\${free},\\"usage_percent\\":\${pct}}"
}

# Disk usage of / in GB
get_disk() {
  local info total used free pct
  info=$(df -k / | awk 'NR==2{print $2,$3,$4,$5}')
  total=$(echo "$info" | awk '{printf "%.2f", $1/1024/1024}')
  used=$(echo "$info"  | awk '{printf "%.2f", $2/1024/1024}')
  free=$(echo "$info"  | awk '{printf "%.2f", $3/1024/1024}')
  pct=$(echo "$info"   | awk '{gsub(/%/,""); print $4}')
  echo "{\\"total\\":\${total},\\"used\\":\${used},\\"free\\":\${free},\\"usage_percent\\":\${pct}}"
}

# Network speed via /proc/net/dev with 1-second sample
get_network() {
  local iface rx1 tx1 rx2 tx2 dl ul
  iface=$(ip route show default 2>/dev/null | awk '/default/{print $5; exit}')
  if [[ -z "$iface" ]]; then
    echo '{"upload_speed":0,"download_speed":0,"total_upload":0,"total_download":0}'
    return
  fi
  rx1=$(awk -v i="\${iface}:" '$1==i{print $2}'  /proc/net/dev)
  tx1=$(awk -v i="\${iface}:" '$1==i{print $10}' /proc/net/dev)
  sleep 1
  rx2=$(awk -v i="\${iface}:" '$1==i{print $2}'  /proc/net/dev)
  tx2=$(awk -v i="\${iface}:" '$1==i{print $10}' /proc/net/dev)
  dl=$(( rx2 - rx1 )); [[ $dl -lt 0 ]] && dl=0
  ul=$(( tx2 - tx1 )); [[ $ul -lt 0 ]] && ul=0
  echo "{\\"upload_speed\\":\${ul},\\"download_speed\\":\${dl},\\"total_upload\\":\${tx2},\\"total_download\\":\${rx2}}"
}

# Uptime in seconds from /proc/uptime
get_uptime() { awk '{printf "%d", $1}' /proc/uptime; }

report() {
  local ts cpu mem disk net up payload resp
  ts=$(date +%s)
  cpu=$(get_cpu)
  mem=$(get_memory)
  disk=$(get_disk)
  net=$(get_network)
  up=$(get_uptime)
  payload="{\\"timestamp\\":\${ts},\\"cpu\\":\${cpu},\\"memory\\":\${mem},\\"disk\\":\${disk},\\"network\\":\${net},\\"uptime\\":\${up}}"
  log "Reporting..."
  resp=$(curl -sf -X POST "\${WORKER_URL}/api/report/\${SERVER_ID}" \\
    -H "Content-Type: application/json" \\
    -H "X-API-Key: \${API_KEY}" \\
    --max-time 10 \\
    -d "\${payload}" 2>&1) && log "OK: \${resp}" || log "WARN: \${resp}"
}

log "Monitor started (interval: \${INTERVAL}s)"
while true; do
  report
  sleep "\${INTERVAL}"
done
EOF

# Replace placeholders
sed -i "s|__API_KEY__|$API_KEY|g"       "$INSTALL_DIR/monitor.sh"
sed -i "s|__SERVER_ID__|$SERVER_ID|g"   "$INSTALL_DIR/monitor.sh"
sed -i "s|__WORKER_URL__|$WORKER_URL|g" "$INSTALL_DIR/monitor.sh"
sed -i "s|__INTERVAL__|$INTERVAL|g"     "$INSTALL_DIR/monitor.sh"
chmod +x "$INSTALL_DIR/monitor.sh"

# ── Create systemd service ────────────────────────────────────────────────────
cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=VPS Status Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$INSTALL_DIR/monitor.sh
Restart=always
RestartSec=10
User=root
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start  "$SERVICE_NAME"

echo "=== Installation complete ==="
echo "Check status : systemctl status $SERVICE_NAME"
echo "View logs    : journalctl -u $SERVICE_NAME -f"
`;

  return new Response(script, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="install.sh"',
    },
  });
}
