#!/bin/bash
# VPS Status - Ubuntu-only lightweight VPS monitoring agent
# Supports Ubuntu 18.04+ with systemd
# Usage: bash vps-status.sh <command> [options]
#   Commands: install, uninstall, status, restart, logs

set -euo pipefail

# ─── Constants ────────────────────────────────────────────────────────────────
INSTALL_DIR="/opt/vps-status"
SERVICE_NAME="vps-status"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
MONITOR_SCRIPT="${INSTALL_DIR}/monitor.sh"
CONFIG_FILE="${INSTALL_DIR}/config.env"

# ─── Helpers ──────────────────────────────────────────────────────────────────
info()  { echo -e "\e[32m[INFO]\e[0m  $*"; }
warn()  { echo -e "\e[33m[WARN]\e[0m  $*"; }
error() { echo -e "\e[31m[ERROR]\e[0m $*" >&2; }
die()   { error "$*"; exit 1; }

require_root() {
  [[ "$(id -u)" -eq 0 ]] || die "This script must be run as root."
}

check_ubuntu() {
  if [[ ! -f /etc/os-release ]]; then
    die "Cannot detect OS. Ubuntu 18.04+ is required."
  fi
  # shellcheck source=/dev/null
  source /etc/os-release
  if [[ "${ID:-}" != "ubuntu" ]]; then
    die "This script only supports Ubuntu. Detected: ${PRETTY_NAME:-unknown}."
  fi
  local major
  major=$(echo "${VERSION_ID:-0}" | cut -d. -f1)
  if [[ "$major" -lt 18 ]]; then
    die "Ubuntu 18.04+ is required. Detected: ${VERSION_ID:-unknown}."
  fi
  info "OS check passed: ${PRETTY_NAME}"
}

check_systemd() {
  command -v systemctl &>/dev/null && systemctl is-system-running &>/dev/null || \
    systemctl status &>/dev/null || true
  if ! pidof systemd &>/dev/null && [[ "$(cat /proc/1/comm 2>/dev/null)" != "systemd" ]]; then
    die "systemd is required but not running."
  fi
}

install_packages() {
  info "Updating package list and installing dependencies..."
  apt-get update -qq
  apt-get install -y -qq curl bc sysstat
  info "Dependencies installed."
}

# ─── Usage ────────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
VPS Status - Ubuntu-only monitoring agent

Usage:
  $(basename "$0") install   -k API_KEY -s SERVER_ID -u WORKER_URL [-i INTERVAL]
  $(basename "$0") uninstall
  $(basename "$0") status
  $(basename "$0") restart
  $(basename "$0") logs

Options for install:
  -k, --key       API key for authentication
  -s, --server    Server ID
  -u, --url       Worker URL (e.g. https://your-worker.workers.dev)
  -i, --interval  Report interval in seconds (default: 60)
EOF
  exit 1
}

# ─── Monitor script content ───────────────────────────────────────────────────
write_monitor_script() {
  local api_key="$1"
  local server_id="$2"
  local worker_url="$3"
  local interval="$4"

  cat > "$MONITOR_SCRIPT" << EOF
#!/bin/bash
# VPS Status - data collection and reporting daemon

API_KEY="${api_key}"
SERVER_ID="${server_id}"
WORKER_URL="${worker_url}"
INTERVAL=${interval}

log() {
  echo "\$(date '+%Y-%m-%d %H:%M:%S') - \$1"
}

# CPU usage percent (idle subtracted from 100) and load averages
get_cpu() {
  local idle
  idle=\$(top -bn1 | grep -i "cpu(s)" | sed 's/.*,\\s*\\([0-9.]*\\)\\s*%\\?\\s*id.*/\\1/')
  local usage
  usage=\$(echo "scale=1; 100 - \${idle:-0}" | bc)
  local load
  load=\$(awk '{print \$1","(\$2)","(\$3)}' /proc/loadavg)
  echo "{\\"usage_percent\\":\${usage},\\"load_avg\\":[\${load}]}"
}

# Memory stats in KB
get_memory() {
  local total used free pct
  total=\$(awk '/^MemTotal:/{print \$2}' /proc/meminfo)
  free=\$(awk '/^MemAvailable:/{print \$2}' /proc/meminfo)
  used=\$(( total - free ))
  pct=\$(echo "scale=1; \${used} * 100 / \${total}" | bc)
  echo "{\\"total\\":\${total},\\"used\\":\${used},\\"free\\":\${free},\\"usage_percent\\":\${pct}}"
}

# Disk usage of / in GB (floating point)
get_disk() {
  local info total used free pct
  info=\$(df -k / | awk 'NR==2{print \$2,\$3,\$4,\$5}')
  total=\$(echo "\$info" | awk '{printf "%.2f", \$1/1024/1024}')
  used=\$(echo "\$info"  | awk '{printf "%.2f", \$2/1024/1024}')
  free=\$(echo "\$info"  | awk '{printf "%.2f", \$3/1024/1024}')
  pct=\$(echo "\$info"   | awk '{gsub(/%/,""); print \$4}')
  echo "{\\"total\\":\${total},\\"used\\":\${used},\\"free\\":\${free},\\"usage_percent\\":\${pct}}"
}

# Network speed via /proc/net/dev (bytes/second) + totals
get_network() {
  # Find default interface
  local iface
  iface=\$(ip route show default 2>/dev/null | awk '/default/{print \$5; exit}')
  if [[ -z "\$iface" ]]; then
    echo '{"upload_speed":0,"download_speed":0,"total_upload":0,"total_download":0}'
    return
  fi

  # Read counters twice with 1s gap
  local rx1 tx1 rx2 tx2
  rx1=\$(awk -v iface="\${iface}:" '\$1==iface{print \$2}' /proc/net/dev)
  tx1=\$(awk -v iface="\${iface}:" '\$1==iface{print \$10}' /proc/net/dev)
  sleep 1
  rx2=\$(awk -v iface="\${iface}:" '\$1==iface{print \$2}' /proc/net/dev)
  tx2=\$(awk -v iface="\${iface}:" '\$1==iface{print \$10}' /proc/net/dev)

  local dl_speed ul_speed
  dl_speed=\$(( rx2 - rx1 ))
  ul_speed=\$(( tx2 - tx1 ))
  [[ "\$dl_speed" -lt 0 ]] && dl_speed=0
  [[ "\$ul_speed" -lt 0 ]] && ul_speed=0

  echo "{\\"upload_speed\\":\${ul_speed},\\"download_speed\\":\${dl_speed},\\"total_upload\\":\${tx2},\\"total_download\\":\${rx2}}"
}

# Uptime in seconds from /proc/uptime
get_uptime() {
  awk '{printf "%d", \$1}' /proc/uptime
}

report() {
  local ts cpu mem disk net uptime_s payload response
  ts=\$(date +%s)
  cpu=\$(get_cpu)
  mem=\$(get_memory)
  disk=\$(get_disk)
  net=\$(get_network)
  uptime_s=\$(get_uptime)

  payload="{\\"timestamp\\":\${ts},\\"cpu\\":\${cpu},\\"memory\\":\${mem},\\"disk\\":\${disk},\\"network\\":\${net},\\"uptime\\":\${uptime_s}}"

  log "Reporting metrics to \${WORKER_URL}/api/report/\${SERVER_ID}"
  response=\$(curl -sf -X POST "\${WORKER_URL}/api/report/\${SERVER_ID}" \\
    -H "Content-Type: application/json" \\
    -H "X-API-Key: \${API_KEY}" \\
    --max-time 10 \\
    -d "\${payload}" 2>&1) && log "OK: \${response}" || log "WARN: report failed: \${response}"
}

log "VPS Status started (interval: \${INTERVAL}s)"
while true; do
  report
  sleep "\${INTERVAL}"
done
EOF

  chmod +x "$MONITOR_SCRIPT"
}

# ─── Systemd service ──────────────────────────────────────────────────────────
write_service() {
  cat > "$SERVICE_FILE" << EOF
[Unit]
Description=VPS Status Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${MONITOR_SCRIPT}
Restart=always
RestartSec=10
User=root
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF
}

# ─── Commands ─────────────────────────────────────────────────────────────────
cmd_install() {
  local api_key="" server_id="" worker_url="" interval="60"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -k|--key)      api_key="$2";    shift 2 ;;
      -s|--server)   server_id="$2";  shift 2 ;;
      -u|--url)      worker_url="$2"; shift 2 ;;
      -i|--interval) interval="$2";   shift 2 ;;
      *) die "Unknown option: $1" ;;
    esac
  done

  [[ -n "$api_key" ]]    || die "API key is required (-k)"
  [[ -n "$server_id" ]]  || die "Server ID is required (-s)"
  [[ -n "$worker_url" ]] || die "Worker URL is required (-u)"

  require_root
  check_ubuntu
  check_systemd
  install_packages

  info "Creating install directory: ${INSTALL_DIR}"
  mkdir -p "$INSTALL_DIR"

  info "Writing monitor script..."
  write_monitor_script "$api_key" "$server_id" "$worker_url" "$interval"

  info "Writing systemd service..."
  write_service

  info "Enabling and starting service..."
  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"
  systemctl start "$SERVICE_NAME"

  info "Installation complete!"
  info "Service status: systemctl status ${SERVICE_NAME}"
  info "Logs:           journalctl -u ${SERVICE_NAME} -f"
}

cmd_uninstall() {
  require_root
  info "Stopping and disabling service..."
  systemctl stop  "$SERVICE_NAME" 2>/dev/null || true
  systemctl disable "$SERVICE_NAME" 2>/dev/null || true
  rm -f "$SERVICE_FILE"
  systemctl daemon-reload
  info "Removing install directory..."
  rm -rf "$INSTALL_DIR"
  info "Uninstall complete."
}

cmd_status() {
  systemctl status "$SERVICE_NAME" --no-pager
}

cmd_restart() {
  require_root
  systemctl restart "$SERVICE_NAME"
  info "Service restarted."
}

cmd_logs() {
  journalctl -u "$SERVICE_NAME" -f --no-pager
}

# ─── Entry point ──────────────────────────────────────────────────────────────
main() {
  local cmd="${1:-}"
  shift || true

  case "$cmd" in
    install)   cmd_install "$@" ;;
    uninstall) cmd_uninstall ;;
    status)    cmd_status ;;
    restart)   cmd_restart ;;
    logs)      cmd_logs ;;
    *)         usage ;;
  esac
}

main "$@"
