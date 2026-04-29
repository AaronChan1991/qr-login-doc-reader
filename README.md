# QR Login Doc Reader

[中文文档](./README_zh.md)

A CLI tool that reads web pages behind QR-code login, SSO redirects, or cookie-based authentication. It detects whether a page requires login, prompts for manual QR scan only when needed, and persists browser sessions for future automated access.

## Features

- Auto-detects login/QR-code challenges (supports Chinese SSO flows like WeCom, WeChat)
- Prompts for manual QR scan only when authentication is actually required
- Persists browser session state locally — subsequent runs skip login automatically
- Exports page content as plain text, HTML snapshot, and full-page screenshot

## Prerequisites

- Node.js >= 18
- Chromium (installed via Playwright)

## Installation

```bash
cd scripts
npm install
npx playwright install chromium
```

## Usage

```bash
node scripts/qr_doc_reader.mjs --url "https://example.com/protected/doc"
```

### Options

| Flag | Description |
|------|-------------|
| `--url`, `-u` | Target document URL (required) |
| `--headless` | Run browser in headless mode |
| `--force-login` | Ignore stored session, require fresh QR scan |
| `--wait-ms <ms>` | Login wait timeout in milliseconds (default: 180000) |
| `--help`, `-h` | Show help |

### Examples

```bash
# First run — opens browser, waits for QR scan if needed
node scripts/qr_doc_reader.mjs --url "https://docs.internal.com/req/123"

# Later runs — reuses saved session, no login needed
node scripts/qr_doc_reader.mjs --url "https://docs.internal.com/req/456"

# Force re-login
node scripts/qr_doc_reader.mjs --url "https://docs.internal.com/req/123" --force-login
```

## Output

Artifacts are saved to `output/`:

| File | Content |
|------|---------|
| `*.txt` | URL, page title, and extracted visible text |
| `*.html` | Full rendered DOM snapshot |
| `*.png` | Full-page screenshot |

## How It Works

1. Opens the target URL with Playwright (Chromium)
2. Checks the page URL and content for login indicators (keywords like `login`, `扫码`, `二维码`, `SSO`, etc.)
3. If no login challenge is detected, reads the page directly
4. If login is required, waits for manual QR scan in the browser window
5. After successful login, saves session state to `state/storage-state.json`
6. Exports page content and screenshot to `output/`

## License

MIT
