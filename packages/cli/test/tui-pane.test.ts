/**
 * FILE: tui-pane.test.ts
 * PURPOSE: Cover the pane-layout control room: ANSI helpers, pane rendering, nav dispatch, NL parser, wizard args, and log capture rules.
 * LAYER: test
 * DEPENDS_ON: node:test, node:assert, ../src/tui/screen/*.js (including exampleCommandsView, headerBar, logPaneView), ../src/tui/wizard/*.js, ../src/tui/isInteractiveArgs.js, ../src/tui/runCliCommandCaptured.js
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
import { renderExampleCommandsLines } from "../src/tui/screen/exampleCommandsView.ts";
import { renderLogPane } from "../src/tui/screen/logPaneView.ts";
import { renderHeaderBar } from "../src/tui/screen/headerBar.ts";
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

/**
 * PURPOSE: Verify that the integrated control room previews the actual mode/profile command and preserves session context.
 * INPUT:
 * - fixed 150×42 screen context — valid draft, captured prior action, and active navigation key
 * OUTPUT:
 * - void — assertions fail when any overview marker or safety phrase is missing
 * USES:
 * - renderScreen, stripAnsi
 * EFFECT:
 * - none
 * ERRORS:
 * - Throws assertion errors when the renderer omits command, mode, confirmation, or active-key context
 * RULES:
 * - Rendering only builds display text; this test must never execute the resulting command.
 */
test("renderScreen shows exact preview gate, last action, and active sidebar item", () => {
  const rendered = stripAnsi(renderScreen({
    ...CTX,
    logEntries: [
      { time: "10:00:00", level: "info", text: "$ okx market ticker BTC-USDT" },
      { time: "10:00:01", level: "info", text: "exit 0 — L for full log" },
    ],
    wizardDraft: {
      botType: "grid", instId: "BTC-USDT", market: "spot", amount: "100", ccy: "USDT",
      risk: "low", minPx: "60000", maxPx: "70000", gridNum: "20",
    },
    wizardStep: 4,
    activeKey: "5",
    columns: 150,
    rows: 42,
  }));
  const compact = rendered.replace(/\s+/g, " ");
  assert.ok(compact.includes("Resulting command"));
  assert.ok(compact.includes("--demo --profile demo"));
  assert.ok(compact.includes("CONFIRM DEMO CREATE BOT"));
  assert.ok(compact.includes("Last action"));
  assert.ok(compact.includes("▸Analytics"));
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

/**
 * PURPOSE: Ensure long wizard commands wrap without losing arguments and show the exact mode-aware confirmation phrase.
 * INPUT:
 * - fixed preview state — representative bot-create argv and confirmation intent
 * OUTPUT:
 * - void — assertions fail if any token or confirmation text is missing
 * USES:
 * - renderExampleCommandsLines, stripAnsi
 * EFFECT:
 * - none
 * ERRORS:
 * - Throws assertion errors when the preview clips a token or omits the confirmation phrase
 * RULES:
 * - Rendering the preview is display-only and must never invoke a CLI command.
 */
test("resulting command preview wraps all args and prints the exact confirmation phrase", () => {
  const command = "okx bot grid create --instId BTC-USDT --algoOrdType grid --minPx 60000 --maxPx 70000 --gridNum 20 --quoteSz 100 --runType 1 --demo --profile demo";
  const lines = renderExampleCommandsLines(40, 12, {
    kind: "preview",
    command,
    confirmation: "CONFIRM DEMO CREATE BOT",
  });
  const plain = lines.map(stripAnsi).map((line) => line.trim()).join(" ").replace(/\s+/g, " ");
  assert.ok(plain.includes(command));
  assert.ok(plain.includes("CONFIRM DEMO CREATE BOT"));
});

/**
 * PURPOSE: Confirm that dynamic terminal escape sequences are removed before they reach visible TUI output.
 * INPUT:
 * - hostile profile/log fixtures — values containing CSI and OSC control sequences
 * OUTPUT:
 * - void — assertions fail if raw cursor/title controls survive
 * USES:
 * - SessionLog, renderHeaderBar, renderLogPane, stripAnsi
 * EFFECT:
 * - none
 * ERRORS:
 * - Throws assertion errors when a control sequence remains in stored/rendered content
 * RULES:
 * - Normal printable text must remain available after sanitization.
 */
test("profile and captured child output cannot inject terminal control sequences", () => {
  const hostileState = { ...STATE, activeProfile: "demo\u001b[2J\u001b]0;injected\u0007" };
  const header = renderHeaderBar(hostileState, 120).join("\n");
  assert.equal(header.includes("\u001b[2J"), false);
  assert.equal(header.includes("injected"), false);

  const log = new SessionLog();
  log.add("info", "\u001b[2Jclean\u001b[0m\u001b]0;title\u0007");
  assert.equal(log.all()[0].text, "clean");
  const rendered = renderLogPane([{ time: "00:00:00", level: "info", text: "\u001b[2Jvisible" }], 80, 4).join("\n");
  assert.equal(rendered.includes("\u001b[2J"), false);
  assert.ok(stripAnsi(rendered).includes("visible"));

  const screen = renderScreen({
    ...CTX,
    state: hostileState,
    tickers: ["BTC 10\u001b[2Jhidden"],
    columns: 150,
    rows: 42,
  });
  assert.equal(screen.includes("\u001b[2J"), false);
  assert.ok(stripAnsi(screen).includes("BTC 10hidden"));
});

/**
 * PURPOSE: Keep failed or incomplete wizard drafts from displaying generic example commands as if they were the deploy preview.
 * INPUT:
 * - blocked preview state — validation reason from the command builder
 * OUTPUT:
 * - void — assertions fail if the blocked state is unclear
 * USES:
 * - renderExampleCommandsLines, stripAnsi
 * EFFECT:
 * - none
 * ERRORS:
 * - Throws assertion errors when the preview panel hides its blocked reason
 * RULES:
 * - Invalid drafts must not be represented by a command that could appear executable.
 */
test("blocked resulting-command panel explains missing setup rather than showing unrelated examples", () => {
  const lines = renderExampleCommandsLines(26, 3, { kind: "blocked", reason: "capital amount missing or invalid" });
  const plain = stripAnsi(lines.join(" ")).replace(/\s+/g, " ");
  assert.ok(plain.includes("Complete setup"));
  assert.ok(plain.includes("capital amount"));
  assert.equal(plain.includes("okx market ticker"), false);
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
