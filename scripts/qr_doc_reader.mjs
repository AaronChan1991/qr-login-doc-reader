#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

function parseArgs(argv) {
  const args = {
    url: "",
    headless: false,
    forceLogin: false,
    waitMs: 180000
  };

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--url" || a === "-u") {
      args.url = argv[i + 1] ?? "";
      i += 1;
    } else if (a === "--headless") {
      args.headless = true;
    } else if (a === "--force-login") {
      args.forceLogin = true;
    } else if (a === "--wait-ms") {
      const raw = Number(argv[i + 1]);
      if (!Number.isFinite(raw) || raw <= 0) {
        throw new Error("Invalid --wait-ms value");
      }
      args.waitMs = Math.floor(raw);
      i += 1;
    } else if (a === "--help" || a === "-h") {
      printHelpAndExit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }

  if (!args.url) {
    throw new Error("Missing required argument: --url");
  }
  return args;
}

function printHelpAndExit(code) {
  console.log(`Usage:
  node scripts/qr_doc_reader.mjs --url "<protected-link>" [--headless] [--force-login] [--wait-ms 180000]

Options:
  --url, -u        Target document URL (required)
  --headless       Run browser in headless mode
  --force-login    Ignore stored auth state and require fresh QR login
  --wait-ms        Login wait timeout in ms (default: 180000)
  --help, -h       Show this help
`);
  process.exit(code);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sanitizeName(input) {
  return input.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 120);
}

async function getPageSignals(page) {
  const title = await page.title();
  const text = await page.evaluate(() => document.body?.innerText ?? "");
  return {
    url: page.url(),
    title,
    text
  };
}

function needsInteractiveLogin({ url, title, text }) {
  const urlHints = /login|signin|auth|oauth|scan|qrcode|qr/i.test(url);
  const loginText = `${title}\n${text}`.slice(0, 6000);
  const textHints =
    /(登录|扫码|二维码|请登录|认证|单点登录|企业微信|微信扫码|scan qr|scan code|qr code|sign in|log in|sso)/i.test(
      loginText
    );

  return urlHints || textHints;
}

async function waitForLoginUrlChange(page, timeoutMs) {
  const begin = Date.now();
  let last = page.url();
  while (Date.now() - begin < timeoutMs) {
    await page.waitForTimeout(1500);
    const curr = page.url();
    if (curr !== last) return true;
    last = curr;
  }
  return false;
}

async function saveArtifacts(page, targetUrl, outputDir) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const host = new URL(targetUrl).host;
  const base = sanitizeName(`${host}-${stamp}`);

  const txtPath = path.join(outputDir, `${base}.txt`);
  const htmlPath = path.join(outputDir, `${base}.html`);
  const pngPath = path.join(outputDir, `${base}.png`);

  const title = await page.title();
  const html = await page.content();
  const text = await page.evaluate(() => document.body?.innerText ?? "");

  fs.writeFileSync(txtPath, `URL: ${targetUrl}\nTitle: ${title}\n\n${text}`, "utf8");
  fs.writeFileSync(htmlPath, html, "utf8");
  await page.screenshot({ path: pngPath, fullPage: true });

  return { title, txtPath, htmlPath, pngPath };
}

async function main() {
  const args = parseArgs(process.argv);

  const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const stateDir = path.join(skillRoot, "state");
  const outputDir = path.join(skillRoot, "output");
  const storagePath = path.join(stateDir, "storage-state.json");

  ensureDir(stateDir);
  ensureDir(outputDir);

  const hasStorage = fs.existsSync(storagePath);
  const useStorage = hasStorage && !args.forceLogin;

  const browser = await chromium.launch({ headless: args.headless });
  const context = await browser.newContext(useStorage ? { storageState: storagePath } : {});
  const page = await context.newPage();

  try {
    await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});

    const signals = await getPageSignals(page);
    const likelyLogin = needsInteractiveLogin(signals);

    if (args.forceLogin) {
      console.log("[qr-doc-reader] Forced login requested. Complete QR scan in browser...");
      console.log(`[qr-doc-reader] Waiting up to ${Math.floor(args.waitMs / 1000)}s`);

      const loggedIn = await waitForLoginUrlChange(page, args.waitMs);
      if (!loggedIn) {
        throw new Error("Login timeout. Re-run and complete scan before timeout.");
      }

      await context.storageState({ path: storagePath });
      console.log(`[qr-doc-reader] Saved session state: ${storagePath}`);

      await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
    } else if (likelyLogin) {
      console.log("[qr-doc-reader] Login required. Complete QR scan in browser...");
      console.log(`[qr-doc-reader] Waiting up to ${Math.floor(args.waitMs / 1000)}s`);

      const loggedIn = await waitForLoginUrlChange(page, args.waitMs);
      if (!loggedIn) {
        throw new Error("Login timeout. Re-run and complete scan before timeout.");
      }

      await context.storageState({ path: storagePath });
      console.log(`[qr-doc-reader] Saved session state: ${storagePath}`);

      await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
    } else {
      if (useStorage) {
        console.log("[qr-doc-reader] Reused saved session. No login challenge detected.");
      } else {
        console.log("[qr-doc-reader] No login challenge detected. Reading page directly.");
      }
    }

    const out = await saveArtifacts(page, args.url, outputDir);
    console.log("[qr-doc-reader] Done");
    console.log(`Title: ${out.title}`);
    console.log(`Text: ${out.txtPath}`);
    console.log(`HTML: ${out.htmlPath}`);
    console.log(`Screenshot: ${out.pngPath}`);
    console.log(`Final URL: ${page.url()}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error(`[qr-doc-reader] Error: ${err.message}`);
  process.exit(1);
});
