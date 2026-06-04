#!/usr/bin/env bash
# claude_keepalive.sh
# Sends a minimal message to Claude Code every 5h5m to claim the new rolling window.
# Usage:
#   ./claude_keepalive.sh                  # runs indefinitely
#   ./claude_keepalive.sh --times 3        # runs exactly 3 times then exits
#   ./claude_keepalive.sh --interval 18600 # custom interval in seconds (default: 18300 = 5h5m)

set -euo pipefail

INTERVAL=18060   # 5 hours + 1 minutes in seconds
TIMES=0          # 0 = run indefinitely
COUNT=0
LOG_FILE="$HOME/.claude_keepalive.log"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --times)    TIMES="$2";    shift 2 ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    --help)
      echo "Usage: $0 [--times N] [--interval SECONDS]"
      echo "  --times N       Run N times then exit (default: 0 = forever)"
      echo "  --interval S    Seconds between pings (default: 18300 = 5h5m)"
      exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

ping_claude() {
  local output
  local exitcode

  output=$(claude -p "hi" 2>&1)
  exitcode=$?

  echo "$output" >> "$LOG_FILE"

  if [[ $exitcode -eq 0 ]]; then
    log "✓ Ping sent successfully (count: $COUNT)"
  else
    log "✗ Ping failed (exit code: $exitcode)"
    log "Error: $output"
  fi
}

# Trap Ctrl+C for a clean exit
trap 'echo; log "Stopped by user."; exit 0' INT TERM

log "Starting Claude keepalive (interval: ${INTERVAL}s, times: ${TIMES:-∞})"
log "Log file: $LOG_FILE"
echo "Press Ctrl+C to stop."
echo

while true; do
  COUNT=$((COUNT + 1))

  ping_claude

  # Exit if we've hit the requested number of pings
  if [[ $TIMES -gt 0 && $COUNT -ge $TIMES ]]; then
    log "Reached requested count ($TIMES). Exiting."
    exit 0
  fi

  # Show next ping time
  NEXT=$(date -v +"${INTERVAL}S" '+%H:%M:%S' 2>/dev/null \
      || date -d "+${INTERVAL} seconds" '+%H:%M:%S' 2>/dev/null \
      || echo "in ~$((INTERVAL/3600))h$((INTERVAL%3600/60))m")
  log "Next ping at ~$NEXT (sleeping ${INTERVAL}s)"
  sleep "$INTERVAL"
done