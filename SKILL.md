---
name: qr-login-doc-reader
description: Read requirement documents or web pages that may require QR-code login, SSO redirects, or authenticated cookies. Use this skill when a shared URL might be protected: first detect whether login is actually required, read directly when it is not, and only trigger manual QR scan login when authentication is needed.
---

# QR Login Doc Reader

Use this skill to access documentation links that may or may not require manual QR scan login.
Persist authenticated browser state locally after the first successful login so later reads are automated.
Capture page text, HTML, and screenshot artifacts for downstream analysis and summarization.

## Workflow

1. Install dependencies once in the skill folder:

```bash
npm install
npx playwright install chromium
```

2. Read a protected URL:

```bash
node scripts/qr_doc_reader.mjs --url "https://example.com/protected/doc"
```

3. Access behavior:
   Open the target URL first.
   Detect whether the page actually presents a login or QR-scan challenge.
   Read the page directly when no login challenge is detected.
   Only wait for manual QR scan login when the page clearly requires authentication.
   Save session state to `state/storage-state.json` after successful login.

4. Later run behavior:
   Reuse saved session state.
   Skip manual login unless the stored session is no longer valid or `--force-login` is provided.

## Output Artifacts

Write outputs to `output/`:
- `*.txt`: URL, title, extracted visible text.
- `*.html`: rendered page DOM snapshot.
- `*.png`: full-page screenshot.

## Command Reference

Use:

```bash
node scripts/qr_doc_reader.mjs --url "<target>"
```

Optional flags:
- `--headless`: run browser in headless mode.
- `--force-login`: ignore existing session and require fresh scan login.
- `--wait-ms <number>`: override login wait timeout in milliseconds (default `180000`).

## Post-Processing Guidance

After extraction:
1. Read the latest `output/*.txt`.
2. Summarize requirements into concise sections:
   Background, Scope, Functional requirements, Non-functional requirements, Risks/Open questions.
3. Highlight any access or rendering gaps if text looks incomplete.
