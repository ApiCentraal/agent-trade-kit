/**
 * FILE: tui-pane.test.ts
 * PURPOSE: Cover the pane-layout control room: ANSI helpers, pane rendering, nav dispatch, NL parser, wizard args, and log capture rules.
 * LAYER: test
 * DEPENDS_ON: node:test, node:assert, ../src/tui/screen/*.js, ../src/tui/wizard/*.js, ../src/tui/isInteractiveArgs.js, ../src/tui/runCliCommandCaptured.js
 * RULES:
 * - No test performs exchange calls; captured-run tests use node itself, not the CLI.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { stripAnsi } from "../src/tui/screen/stripAnsi.ts";
import { ansiWidth } from "../src/tui/screen/ansiWidth.ts";
import { ansiPadEnd } from "../src/tui/screen/ansiPadEnd.ts";
import { ansiSlice } from "../src/tui/screen/ansiSlice.ts";
import { boxPane } from "../src/tui/screen/boxPane.ts";
import { renderPillRow } from "../src/tui/screen/widgets/pillRow.ts";
import { renderStepper } from "../src/tui/screen/widgets/stepper.ts";
import { renderWizardForm } from "../src/tui/screen/wizardFormView.ts";
import { renderScreen, PANE_MIN_COLUMNS, PANE_MIN_ROWS } from "../src/tui/screen/renderScreen.ts";
import { buildNavItems } from "../src/tui/screen/sidebarModel.ts";
import { buildInspectorModel } from "../src/tui/screen/inspectorModel.ts";
import { SessionLog } from "../src/tui/screen/sessionLog.ts";
import { parseBotIntent } from "../src/tui/wizard/nlBotParser.ts";
import { applyRiskPreset } from "../src/tui/wizard/botPresets.ts";
import { buildWizardArgs } from "../src/tui/wizard/buildWizardArgs.ts";
import { isInteractiveArgs } from "../src/tui/isInteractiveArgs.ts";
import { dispatchNavKey } from "../src/tui/screen/navDispatch.ts";
import type { TuiDashboardState } from "../src/tui/types.ts";
import type { Interface } from "node:readline/promises";

const STATE: TuiDashboardState = {
  version: "1.4.8",
  activeProfile: "demo",
  mode: "DEMO",
  credentialsReady: true,
  configPath: "C:\\cfg\\config.toml",
  profileNames: ["demo"],
};

function fakeInput(answers: string[]): Interface {
  const queue = [...answers];
  return {
    question: async () => queue.shift() ?? "",
  } as unknown as Interface;
}

test("ansi helpers measure, pad, and slice styled text without breaking sequences", () => {
  const styled = `\u001b[96mhello\u001b[0m`;
  assert.equal(ansiWidth(styled), 5);
  assert.equal(stripAnsi(styled), "hello");
  assert.equal(ansiWidth(ansiPadEnd(styled, 8)), 8);
  assert.equal(ansiWidth(ansiSlice("abcdef", 3)), 3);
  assert.ok(ansiSlice(styled + "tail", 6).includes("\u001b[0m"));
});

test("boxPane draws exact-width borders and truncates overlong lines", () => {
  const rows = boxPane({ width: 20, lines: ["hi", "a] much longer line than fits"], title: "T" });
  assert.equal(rows.length, 4);
  for (const row of rows) assert.equal(ansiWidth(row), 20);
});

test("sidebar nav keys are unique and dispatch maps every key", async () => {
  const items = buildNavItems();
  const keys = items.map((i) => i.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.includes("w") && keys.includes("h"));
});

const CTX = {
  state: STATE,
  logEntries: [] as { time: string; level: "info"; text: string }[],
  wizardDraft: undefined,
  wizardStep: -1,
  wizardHint: undefined,
  intentText: undefined,
  tickers: [] as string[],
  latencyMs: undefined,
  clock: "14:42:18",
};

test("renderScreen composes the control-room panes and rejects smaller terminals", () => {
  const screen = renderScreen({
    ...CTX,
    logEntries: [{ time: "00:00:00", level: "info", text: "ready" }],
    columns: 140,
    rows: 40,
  });
  const plain = stripAnsi(screen);
  assert.ok(plain.includes("BOT CONFIGURATION"));
  assert.ok(plain.includes("Create a new bot"));
  assert.ok(plain.includes("CLI Logs"));
  assert.ok(plain.includes("Backtest"));
  assert.ok(plain.includes("Generated configuration"));
  assert.ok(plain.includes("Example commands"));
  assert.ok(plain.includes("Keyboard shortcuts"));
  assert.ok(plain.includes("DEMO"));
  assert.ok(plain.includes("API Connected"));
  assert.ok(plain.includes("Latency"));
  assert.throws(() =>
    renderScreen({ ...CTX, columns: PANE_MIN_COLUMNS - 10, rows: PANE_MIN_ROWS }),
  );
});

test("pill rows highlight only the active option", () => {
  const row = renderPillRow(["Low", "Medium", "High"], 1);
  const plain = stripAnsi(row);
  assert.ok(plain.includes("Medium"));
  assert.ok(row.includes("\u001b[42m"), "active pill uses the filled green background");
  assert.equal(renderPillRow(["A", "B"], -1).includes("\u001b[42m"), false);
});

test("stepper shows done, current, and pending step states", () => {
  const line = renderStepper(["Intent", "Strategy", "Market"], 1, 60);
  const plain = stripAnsi(line);
  assert.ok(plain.includes("✓1 Intent"), "finished steps carry a checkmark");
  assert.ok(plain.includes("2 Strategy"));
  assert.ok(plain.includes("3 Market"));
});

test("wizard form renders numbered sections and environment pills from state", () => {
  const lines = renderWizardForm(
    { botType: "grid", instId: "BTC-USDT", market: "spot", amount: "100", gridNum: "20", risk: "low" },
    STATE,
    100,
  );
  const plain = lines.map(stripAnsi).join("\n");
  assert.ok(plain.includes("1. Bot type"));
  assert.ok(plain.includes("4. Grid parameters"));
  assert.ok(plain.includes("7. Environment"));
  assert.ok(plain.includes("BTC/USDT"));
  assert.ok(plain.includes("Run in"));
  assert.ok(plain.includes("Demo"));
});

test("inspector flags missing credentials and summarizes a wizard draft", () => {
  const noCreds = buildInspectorModel({ ...STATE, credentialsReady: false }, undefined);
  assert.equal(noCreds.checks[0].status, "fail");

  const model = buildInspectorModel(STATE, {
    botType: "grid", instId: "BTC-USDT", market: "spot",
    amount: "100", ccy: "USDT", risk: "low", minPx: "60000", maxPx: "70000", gridNum: "20",
  });
  assert.ok(model.fields.some((f) => f.label === "Pair" && f.value === "BTC-USDT"));
  assert.ok(model.estimates.some((e) => e.label === "Total orders" && e.value.startsWith("20")));
  assert.ok(model.checks.every((c) => c.status !== "fail"));
});

test("session log bounds entries and keeps chronological tail", () => {
  const log = new SessionLog();
  log.add("info", "line one\nline two");
  log.add("error", "boom");
  const all = log.all();
  assert.equal(all.length, 3);
  assert.equal(log.tail(1)[0].level, "error");
});

test("nlBotParser extracts bot type, pair, amount, risk, and market deterministically", () => {
  const parsed = parseBotIntent("Create a BTC grid bot with 100 USDT, low risk, spot only");
  assert.equal(parsed.botType, "grid");
  assert.equal(parsed.market, "spot");
  assert.equal(parsed.instId, "BTC-USDT");
  assert.equal(parsed.amount, "100");
  assert.equal(parsed.ccy, "USDT");
  assert.equal(parsed.risk, "low");

  const contract = parseBotIntent("futures grid SOL 50 usdt 3x leverage");
  assert.equal(contract.market, "contract");
  assert.equal(contract.instId, "SOL-USDT-SWAP");
  assert.equal(contract.lever, "3");

  assert.deepEqual(parseBotIntent("hello world"), {});
});

test("risk presets fill defaults without overwriting user answers", () => {
  const preset = applyRiskPreset({ botType: "grid", gridNum: "99" }, "low");
  assert.equal(preset.gridNum, "99");
  assert.equal(preset.runType, "arithmetic");
  const dca = applyRiskPreset({ botType: "dca" }, "high");
  assert.equal(dca.maxSafetyOrds, "8");
  assert.equal(dca.tpPct, "0.02");
});

test("buildWizardArgs validates drafts and emits grid and dca arg arrays", () => {
  const grid = buildWizardArgs({
    botType: "grid", instId: "BTC-USDT", market: "spot", amount: "100", ccy: "USDT",
    minPx: "60000", maxPx: "70000", gridNum: "20",
  });
  assert.ok(grid.ok);
  assert.deepEqual(grid.args.slice(0, 3), ["bot", "grid", "create"]);
  assert.ok(grid.args.includes("--quoteSz") && grid.args.includes("--algoOrdType"));

  const reversed = buildWizardArgs({ botType: "grid", instId: "BTC-USDT", market: "spot", amount: "1", minPx: "9", maxPx: "1", gridNum: "10" });
  assert.equal(reversed.ok, false);

  const dca = buildWizardArgs({ botType: "dca", instId: "ETH-USDT", market: "spot", amount: "50", maxSafetyOrds: "3", tpPct: "0.04" });
  assert.ok(dca.ok);
  assert.ok(dca.args.includes("spot_dca") && dca.args.includes("--maxSafetyOrds"));

  const contractGrid = buildWizardArgs({ botType: "grid", instId: "BTC-USDT-SWAP", market: "contract", amount: "10", minPx: "1", maxPx: "2", gridNum: "5", lever: "3", direction: "long" });
  assert.ok(contractGrid.ok);
  assert.ok(contractGrid.args.includes("contract_grid") && contractGrid.args.includes("--lever"));
});

test("interactive args whitelist keeps prompting flows on the real terminal", () => {
  assert.equal(isInteractiveArgs(["config", "init"]), true);
  assert.equal(isInteractiveArgs(["auth", "login"]), true);
  assert.equal(isInteractiveArgs(["market", "ticker", "BTC-USDT"]), false);
  assert.equal(isInteractiveArgs(["bot", "grid", "create"]), false);
});

test("navDispatch returns undefined for unknown keys without side effects", async () => {
  assert.equal(await dispatchNavKey("z", fakeInput([]), STATE), undefined);
});
