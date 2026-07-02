# Claude Usage Widget — Multi-Account

A lightweight desktop widget that displays your Claude.ai usage statistics in real-time, with support for **multiple accounts** side by side.

> This is a community fork of [SlavomirDurej/claude-usage-widget](https://github.com/SlavomirDurej/claude-usage-widget), adding multi-account support, a full settings panel, per-model weekly limits, and reset-time display.

![Claude Usage Widget](assets/claude-usage-screenshot.jpg)

## Features

- 👥 **Multiple accounts** — Track any number of Claude.ai accounts in a single widget, each with its own nickname
- 🎯 **Real-time tracking** — Monitor 5-hour session and weekly usage limits
- 🧠 **Per-model weekly limits** — Separate bars for Opus / Sonnet / Fable when your plan reports them
- 🕒 **Reset times** — See exactly when each limit resets (12h/24h, several date formats)
- 📊 **Visual progress bars** with configurable warn/critical thresholds
- 🔔 **Usage alerts** — Optional desktop notifications when you cross a threshold
- 🎨 **Themes** — Dark / Light / System, plus a Compact mode
- 🔄 **Auto-refresh** — Configurable interval (1–10 min)
- 📍 **Always on top** & 🫥 **Hide from taskbar** (optional)
- 🚀 **Launch at startup** (optional)
- 🔒 **Local, encrypted credential storage** — nothing is sent to third parties

## Installation

### Download a pre-built release
1. Download the latest `Claude Usage Widget Setup <version>.exe` (or the portable build) from [Releases](https://github.com/theyv/claude-usage-widget-multiacc/releases)
2. Run the installer
3. Launch **Claude Usage Widget** from the Start Menu

> Windows may show "Windows protected your PC" for unsigned apps — click **More info → Run anyway**.

### Build from source

**Prerequisites:** Node.js 18+ and npm.

```bash
git clone https://github.com/theyv/claude-usage-widget-multiacc.git
cd claude-usage-widget-multiacc
npm install

# Run in development
npm start

# Build a Windows installer + portable build (run on Windows)
npm run build:win
```

The output lands in `dist/`. Building the Windows `.exe` must run on Windows (or CI) — electron-builder needs native Windows tooling. This repo includes a GitHub Actions workflow (`.github/workflows/build-windows.yml`) that builds on `windows-latest` for pushes, tags (`v*`), and manual runs.

## Usage

### Connecting an account
1. Launch the widget and click **Log in**.
2. If the embedded login is blocked (Claude.ai sometimes blocks embedded browsers), use **Manual**: open claude.ai → `F12` → Application → Cookies → copy the `sessionKey` value and paste it in.
3. Optionally give the account a nickname.
4. Add more accounts anytime from **Settings → Connected Accounts**.

### Controls
- **Drag** the title bar to move the widget
- **Refresh** icon updates data immediately
- **Minimize** hides to the system tray
- **Settings** (⚙️) opens all options

## Settings

| Setting | Description |
|---|---|
| Launch at startup | Start the widget when Windows boots |
| Hide from taskbar | Keep the widget out of the taskbar (tray only) |
| Always on top | Keep the widget above other windows |
| Usage Alerts | Desktop notification when a limit crosses a threshold |
| Compact mode | Denser layout for small screens |
| Theme | Dark / Light / System |
| Time format | 12h (3:59 PM) or 24h (15:59) |
| Date format | `Mar 13` / `Fri Mar 13` / `Fri Mar 13 + time` |
| Auto-refresh | Every 1 / 2 / 5 / 10 minutes |
| Warn at | Warning (%) and critical (%) thresholds for the progress bars |

## Privacy & Security

- Session credentials are stored **locally only**, encrypted via `electron-store`.
- No telemetry. The widget only talks to the official Claude.ai API.
- **Log Out All** removes stored session keys, clears Claude.ai cookies, and wipes Electron session storage.

The encryption key is embedded in the app, which protects against casual file inspection but not a determined attacker with source access. On shared machines, always log out when finished.

**Storage location:** `%APPDATA%/claude-usage-widget/config.json` (encrypted)

## Technical Details

- **Electron** (frameless, no framework — pure JS renderer)
- **electron-store** for encrypted storage
- Usage is fetched through a hidden `BrowserWindow` (see `src/fetch-via-window.js`) to ride the authenticated browser session and pass Cloudflare's bot checks.

**Debug logging:** run with `--debug` or set `DEBUG_LOG=1`.

## License

MIT — see below. Do whatever you like with it.

## Disclaimer

Unofficial tool. Not affiliated with or endorsed by Anthropic. Use at your own discretion.

---

Made with ❤️ for the Claude.ai community.
