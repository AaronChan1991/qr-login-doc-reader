# QR Login Doc Reader

一个命令行工具，用于读取需要扫码登录、SSO 跳转或 Cookie 认证的网页。自动检测页面是否需要登录，仅在必要时提示手动扫码，并持久化浏览器会话以便后续自动访问。

## 功能特性

- 自动检测登录/扫码页面（支持企业微信、微信扫码等国内 SSO 流程）
- 仅在页面确实需要认证时才提示手动扫码
- 本地持久化浏览器会话状态，后续运行自动跳过登录
- 导出页面纯文本、HTML 快照和全页截图

## 环境要求

- Node.js >= 18
- Chromium（通过 Playwright 自动安装）

## 安装

```bash
cd scripts
npm install
npx playwright install chromium
```

## 使用方法

```bash
node scripts/qr_doc_reader.mjs --url "https://example.com/protected/doc"
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `--url`, `-u` | 目标文档 URL（必填） |
| `--headless` | 以无头模式运行浏览器 |
| `--force-login` | 忽略已保存的会话，强制重新扫码登录 |
| `--wait-ms <毫秒>` | 登录等待超时时间（默认：180000，即 3 分钟） |
| `--help`, `-h` | 显示帮助信息 |

### 使用示例

```bash
# 首次运行 — 打开浏览器，如需登录则等待扫码
node scripts/qr_doc_reader.mjs --url "https://docs.internal.com/req/123"

# 后续运行 — 复用已保存的会话，无需登录
node scripts/qr_doc_reader.mjs --url "https://docs.internal.com/req/456"

# 强制重新登录
node scripts/qr_doc_reader.mjs --url "https://docs.internal.com/req/123" --force-login
```

## 输出产物

产物保存在 `output/` 目录：

| 文件类型 | 内容 |
|----------|------|
| `*.txt` | URL、页面标题、提取的可见文本 |
| `*.html` | 完整渲染的 DOM 快照 |
| `*.png` | 全页截图 |

## 工作原理

1. 使用 Playwright（Chromium）打开目标 URL
2. 检测页面 URL 和内容中的登录标识（如 `login`、`扫码`、`二维码`、`SSO` 等关键词）
3. 若未检测到登录页面，直接读取页面内容
4. 若需要登录，等待用户在浏览器窗口中手动扫码
5. 登录成功后，将会话状态保存到 `state/storage-state.json`
6. 导出页面内容和截图到 `output/`

## 项目结构

```
qr-login-doc-reader/
├── scripts/
│   ├── qr_doc_reader.mjs   # 主脚本
│   └── package.json
├── state/                   # 持久化的浏览器会话状态
├── output/                  # 导出的页面产物
├── agents/                  # Agent 配置
└── SKILL.md                 # Claude Code 技能定义
```

## 许可证

MIT
