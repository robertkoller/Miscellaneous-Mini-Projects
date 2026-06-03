# AutoClaude

Automatically recycles your Claude Code 5-hour usage window by sending a minimal ping at the start of each new window. Runs as a persistent background service on a DigitalOcean droplet (or any Linux server).

## How it works

Claude Code gives you a rolling 5-hour usage window. The timer starts the moment you send your first message. Once the window expires, a fresh one opens — with a full token budget.

AutoClaude sends a single-character message (`.`) to Claude Code at the start of every window, anchoring the timer as early as possible. By the time you sit down to work, you're already deep into the current window — or a new one has just opened.

---

## Files

| File | Purpose |
|---|---|
| `claude_keepalive.sh` | The core script. Sends a minimal ping to Claude Code, then sleeps for 5h5m and repeats. |
| `claude-keepalive.service` | systemd service definition. Runs the script as a background daemon that survives reboots. |
| `autoclaude` | CLI management tool. Wraps `systemctl` commands behind a simple interface. |

---

## Setup

### 1. Create a Server

Use anything really, a rasberry pi works, I used a Digital Ocean droplet.

### 2. SSH in and install Claude Code

```bash
ssh root@YOUR_DROPLET_IP

apt update && apt install -y nodejs npm
npm install -g @anthropic-ai/claude-code
```

Verify the install:

```bash
which claude   # should return /usr/local/bin/claude or similar
```

### 3. Authenticate

```bash
claude login
```

This prints a URL. Open it in your browser and complete the OAuth flow. You only need to do this once — the token is stored in `~/.claude/`.

### 4. Copy the scripts onto the droplet

From your local machine:

```bash
scp claude_keepalive.sh autoclaude root@YOUR_DROPLET_IP:~/AutoClaude/
```

Or just SSH in and paste each file manually with `nano`.

### 5. Make the scripts executable

```bash
chmod +x ~/AutoClaude/claude_keepalive.sh
chmod +x ~/AutoClaude/autoclaude
```

### 6. Install the systemd service

Create the service file:

```bash
nano /etc/systemd/system/claude-keepalive.service
```

Paste the contents of `claude-keepalive.service` and save. Then enable and start it:

```bash
systemctl daemon-reload
systemctl enable claude-keepalive   # auto-start on reboot
systemctl start claude-keepalive
systemctl status claude-keepalive   # confirm it's running
```

### 7. Install the autoclaude CLI (optional but recommended)

```bash
ln -s /root/AutoClaude/autoclaude /usr/local/bin/autoclaude
```

Now you can run `autoclaude` from anywhere on the droplet.

---

## Usage

```bash
autoclaude              # show status (default)
autoclaude start        # start the service
autoclaude stop         # stop the service
autoclaude restart      # restart the service
autoclaude enable       # auto-start on reboot
autoclaude disable      # disable auto-start
autoclaude logs         # show last 50 log lines
autoclaude logs 100     # show last 100 log lines
autoclaude follow       # live log stream (Ctrl+C to exit)
autoclaude ping         # send a manual ping right now
autoclaude help         # show all commands
```

---

## Checking logs

Live stream:

```bash
autoclaude follow
# or directly:
journalctl -u claude-keepalive -f
```

Each successful ping logs:

```
[2026-06-03 19:50:04] ✓ Ping sent successfully (count: 1)
[2026-06-03 19:50:04] Next ping at ~00:51:04 (sleeping 18300s)
```

A failed ping logs:

```
[2026-06-03 19:50:04] ✗ Ping failed — Claude Code may not be installed or authenticated
```

If you see failures, check that `claude` is on the PATH and that `claude login` has been completed.

---

## Notes

- **Token cost**: Each ping is a single `.` character — the absolute minimum. It does consume a small amount of your weekly token budget, so avoid running it when you won't be using Claude at all.
- **The weekly cap is separate**: Claude Code also has a weekly usage limit shared across Claude Code, Claude.ai, and Cowork. AutoClaude only helps with the 5-hour window, not the weekly cap.
- **Security**: Your Claude auth token lives in `~/.claude/` on the droplet. Secure your server with SSH key auth only and don't run other services on it.
- **Clock drift**: The interval is 5 hours and 1 minutes (18060 seconds) to give a small buffer after the window resets.