/**
 * FILE: generate.mjs
 * PURPOSE: Render real okx-tui screens (pane dashboard, wizard, and selector flows) into terminal-styled HTML pages for documentation screenshots.
 * LAYER: util
 * DEPENDS_ON: node:readline/promises, node:stream, node:fs, tsx runtime for TypeScript source imports
 * RULES:
 * - Captured output comes from the real dashboard/selector code; scenarios must never confirm a mutation.
 */

import { createInterface } from "node:readline/promises";
import { PassThrough } from "node:stream";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { renderDashboard } from "../../../packages/cli/src/tui/renderDashboard.ts";
import { renderScreen } from "../../../packages/cli/src/tui/screen/renderScreen.ts";
import { selectMutationAction } from "../../../packages/cli/src/tui/actions/selectMutationAction.ts";
import { selectOrderMutationAction } from "../../../packages/cli/src/tui/actions/selectOrderMutationAction.ts";
import { selectBotAction } from "../../../packages/cli/src/tui/actions/selectBotAction.ts";
import { selectSkillAction } from "../../../packages/cli/src/tui/actions/selectSkillAction.ts";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "html");
mkdirSync(outDir, { recursive: true });

const state = {
  version: "1.4.8",
  activeProfile: "demo",
  mode: "DEMO",
  credentialsReady: true,
  configPath: "C:/Users/you/.okx/config.toml",
  profileNames: ["demo", "live", "paper"],
};

const ANSI_COLORS = { "30": "#4b5563", "31": "#f87171", "32": "#4ade80", "33": "#fbbf24", "34": "#60a5fa", "35": "#c084fc", "36": "#22d3ee", "37": "#e5e7eb", "90": "#6b7280", "91": "#f87171", "92": "#4ade80", "93": "#fbbf24", "94": "#60a5fa", "95": "#c084fc", "96": "#22d3ee", "97": "#f9fafb" };

function ansiToHtml(text) {
  let html = "";
  let open = false;
  const re = /\[(\d+(?:;\d+)*)m|\[\d*[A-Za-z]|\[\?\d+[a-z]/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    html += escapeHtml(text.slice(last, m.index));
    last = m.index + m[0].length;
    const code = m[1];
    if (code === undefined) continue;
    if (code === "0" || code === "") { if (open) { html += "</span>"; open = false; } continue; }
    const color = ANSI_COLORS[code.split(";").pop()];
    if (color) { if (open) html += "</span>"; html += `<span style="color:${color}">`; open = true; }
  }
  html += escapeHtml(text.slice(last));
  if (open) html += "</span>";
  return html.replace(/\r/g, "");
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function page(body, width = 900) {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#0b0f14;display:flex;justify-content:center;padding:32px;font-family:'Cascadia Code','Cascadia Mono',Consolas,Menlo,monospace">
<div style="background:#0d1117;border:1px solid #21262d;border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.55);min-width:760px;max-width:${width}px">
<div style="display:flex;align-items:center;gap:7px;padding:12px 16px;border-bottom:1px solid #21262d">
<span style="width:12px;height:12px;border-radius:50%;background:#ff5f57"></span><span style="width:12px;height:12px;border-radius:50%;background:#febc2e"></span><span style="width:12px;height:12px;border-radius:50%;background:#28c840"></span>
<span style="margin-left:12px;color:#8b949e;font-size:12px">okx-tui — agent trade kit</span></div>
<pre style="margin:0;padding:20px 24px;color:#e5e7eb;font-size:13.5px;line-height:1.5;white-space:pre-wrap">${body}</pre>
</div></body></html>`;
}

async function capture(fn) {
  const chunks = [];
  const orig = process.stdout.write;
  process.stdout.write = (chunk, ...rest) => { chunks.push(String(chunk)); if (typeof rest[0] === "function") rest[0](); return true; };
  try { await fn(); } finally { process.stdout.write = orig; }
  return chunks.join("");
}

async function runSelector(selector, answers, { settleMs = 60 } = {}) {
  const src = new PassThrough();
  const input = createInterface({ input: src, output: process.stdout, terminal: true });
  let text;
  await capture(async () => {
    const pending = selector(input, state);
    for (const answer of answers) {
      src.write(`${answer}\n`);
      await new Promise((r) => setTimeout(r, settleMs));
    }
    await pending;
  }).then((t) => { text = t; });
  input.close();
  return text;
}

const logTail = [
  { time: "14:42:10", level: "info", text: "dashboard ready — select a key to begin" },
  { time: "14:42:15", level: "info", text: "$ okx market ticker BTC-USDT" },
  { time: "14:42:15", level: "info", text: "instId: BTC-USDT  last: 64247.3  vol24h: 8192.44" },
  { time: "14:42:15", level: "info", text: "exit 0 — L for full log" },
];

const baseCtx = {
  state,
  wizardDraft: undefined,
  mainLines: undefined,
  mainTitle: undefined,
  tickers: ["BTC 64247.3", "ETH 2403.4", "SOL 162.4"],
  lastRefresh: "14:42:15",
  columns: 140,
  rows: 36,
};

const scenes = [];

scenes.push(["01-control-room", renderScreen({ ...baseCtx, logEntries: logTail }) + "  › "]);

const wizardDraft = {
  botType: "grid", instId: "BTC-USDT", market: "spot", amount: "100", ccy: "USDT",
  risk: "low", minPx: "60000", maxPx: "70000", gridNum: "20", runType: "arithmetic",
};
scenes.push(["02-bot-wizard", renderScreen({
  ...baseCtx,
  logEntries: logTail,
  wizardDraft,
  mainTitle: "Create bot · 6/6",
  mainLines: [
    "  Step 6 · Preview & deploy",
    "  Create spot grid on BTC-USDT; range=60000–70000; levels=20; capital=100 USDT",
    "",
    "  Review before execution",
    "  Mode: DEMO",
    "  Profile: demo",
    "  Action: Create grid on BTC-USDT; range=60000–70000; levels=20; capital=100 USDT",
    "  Type CONFIRM DEMO CREATE BOT exactly: ",
  ],
})]);

scenes.push(["03-mutation-menu", await runSelector(selectMutationAction, ["q"])]);
scenes.push(["04-order-preview-confirmation", await runSelector(selectOrderMutationAction,
  ["1", "1", "1", "buy", "market", "0.5", "n", "n", "CONFIRM DEMO PLACE ORDER"])]);
scenes.push(["05-bot-monitor-menu", await runSelector(selectBotAction, ["q"])]);
scenes.push(["06-installed-skills", await runSelector(selectSkillAction, ["4"])]);
scenes.push(["07-compact-dashboard", renderDashboard(state, false) + "\n  Choose an action [1–6, A, Q]: "]);

for (const [name, raw] of scenes) {
  writeFileSync(join(outDir, `${name}.html`), page(ansiToHtml(raw), name.startsWith("0") && !name.includes("compact") ? 1240 : 900));
}
console.log(`wrote ${scenes.length} html pages to ${outDir}`);
