/**
 * FILE: renderScreen.ts
 * PURPOSE: Compose the full control-room frame: header, sidebar, create-bot main pane, the stacked
 *          inspector/example/shortcuts right column, tabbed log pane, and status bar.
 * LAYER: component
 * DEPENDS_ON: ../types.js, ../wizard/buildWizardArgs.js, ./boxPane.js, ./headerBar.js, ./inspectorModel.js, ./inspectorView.js, ./createBotView.js, ./exampleCommandsView.js, ./shortcutsView.js, ./logPaneView.js, ./sidebarModel.js, ./sidebarView.js, ./statusBar.js, ./ansiPadEnd.js
 * RULES:
 * - Pane widths are computed from the live terminal size; callers must only invoke this when usePaneLayout() is true.
 */
import type { TuiDashboardState, TuiLogEntry, TuiWizardDraft } from "../types.js";
import { buildWizardArgs } from "../wizard/buildWizardArgs.js";
import { ansiPadEnd } from "./ansiPadEnd.js";
import { boxPane } from "./boxPane.js";
import { renderHeaderBar } from "./headerBar.js";
import { buildInspectorModel } from "./inspectorModel.js";
import { renderInspectorLines } from "./inspectorView.js";
import { renderCreateBotView } from "./createBotView.js";
import { renderExampleCommandsLines } from "./exampleCommandsView.js";
import { renderShortcutsLines } from "./shortcutsView.js";
import { renderLogPane } from "./logPaneView.js";
import { buildNavItems } from "./sidebarModel.js";
import { renderSidebarLines } from "./sidebarView.js";
import { renderStatusBar } from "./statusBar.js";

/** Minimum terminal size required for the multi-pane layout; 120×30 covers the default Windows console. */
export const PANE_MIN_COLUMNS = 110;
export const PANE_MIN_ROWS = 26;

/** Everything the frame needs for one full render. */
export interface ScreenContext {
  state: TuiDashboardState;
  logEntries: TuiLogEntry[];
  wizardDraft: TuiWizardDraft | undefined;
  wizardStep: number;
  wizardHint: string | undefined;
  intentText: string | undefined;
  tickers: string[];
  latencyMs: number | undefined;
  clock: string;
  columns: number;
  rows: number;
  /** Sidebar key of the most recently dispatched flow; rendered as a ▸ marker for session overview. */
  activeKey?: string;
}

/**
 * PURPOSE: Render the complete dashboard screen for the current terminal size.
 * INPUT:
 * - ctx: ScreenContext — dashboard state, log tail, wizard draft/step/hint, tickers, latency, clock, terminal size
 * OUTPUT:
 * - string — the complete ANSI screen ready for a full redraw
 * USES:
 * - renderHeaderBar, renderSidebarLines, renderCreateBotView, buildInspectorModel, renderInspectorLines, renderExampleCommandsLines, renderShortcutsLines, renderLogPane, renderStatusBar, boxPane
 * EFFECT:
 * - none
 * ERRORS:
 * - Throws when the terminal is smaller than the pane minimum; callers must gate with usePaneLayout().
 * - RULES:
 * - Layout: header(2) + body(sidebar | main | right column) + log(4-8 flex) + status(2); every pane line is width-exact.
 * - Below 140 columns the side panes narrow; below ~30 rows the sidebar drops step echoes and the main view drops decorations.
 */
export function renderScreen(ctx: ScreenContext): string {
  const width = ctx.columns;
  if (width < PANE_MIN_COLUMNS || ctx.rows < PANE_MIN_ROWS) {
    throw new Error("pane layout requires a larger terminal");
  }

  const narrow = width < 140;
  const sidebarWidth = narrow ? 22 : 26;
  const rightWidth = narrow ? 28 : 32;
  const mainWidth = width - sidebarWidth - rightWidth;
  const headerHeight = 2;
  const statusHeight = 2;
  let logHeight = Math.max(4, Math.min(8, Math.floor(ctx.rows * 0.16)));
  let bodyHeight = ctx.rows - headerHeight - logHeight - statusHeight;

  // Grant the sidebar one extra row when that flips it into the wizard-echo tier: the step
  // mirror under "Create bot" is part of the target layout and worth one log line.
  const navItems = buildNavItems();
  let sidebarLines = renderSidebarLines(navItems, sidebarWidth - 2, ctx.wizardStep, bodyHeight - 2, ctx.activeKey);
  if (logHeight > 4) {
    const taller = renderSidebarLines(navItems, sidebarWidth - 2, ctx.wizardStep, bodyHeight - 1, ctx.activeKey);
    if (taller.length > sidebarLines.length && taller.length <= bodyHeight - 1) {
      logHeight -= 1;
      bodyHeight += 1;
      sidebarLines = taller;
    }
  }

  const header = renderHeaderBar(ctx.state, width);
  const sidebar = boxPane({
    width: sidebarWidth,
    height: bodyHeight,
    lines: sidebarLines,
  });

  const main = boxPane({
    width: mainWidth,
    height: bodyHeight,
    lines: renderCreateBotView({
      draft: ctx.wizardDraft,
      state: ctx.state,
      step: ctx.wizardStep,
      hint: ctx.wizardHint,
      intentText: ctx.intentText,
      width: mainWidth - 4,
      height: bodyHeight - 2,
    }),
  });

  const shortcutsHeight = bodyHeight >= 26 ? 7 : 5;
  const examplesHeight = Math.max(4, Math.min(9, Math.floor(bodyHeight * 0.24)));
  const inspectorHeight = Math.max(8, bodyHeight - shortcutsHeight - examplesHeight);

  // Last captured command + its exit for the inspector's "Last action" summary row.
  let lastAction: string | undefined;
  for (let i = ctx.logEntries.length - 1; i >= 0; i -= 1) {
    const text = ctx.logEntries[i].text;
    if (text.startsWith("exit ")) {
      lastAction = `${lastAction ?? ""} ${text}`.trim();
    } else if (text.startsWith("$ ")) {
      lastAction = `${text.slice(2)}${lastAction ? ` · ${lastAction}` : ""}`;
      break;
    }
  }

  // When the wizard draft already produces a command, lead the examples panel with the real thing.
  let exampleCommands: string[] | undefined;
  if (ctx.wizardDraft) {
    const built = buildWizardArgs(ctx.wizardDraft);
    if (built.ok) exampleCommands = [`okx ${built.args.join(" ")}`];
  }

  const inspector = boxPane({
    width: rightWidth,
    height: inspectorHeight,
    title: "Generated configuration",
    lines: renderInspectorLines(buildInspectorModel(ctx.state, ctx.wizardDraft, lastAction), rightWidth - 2),
  });
  const examples = boxPane({
    width: rightWidth,
    height: examplesHeight,
    title: exampleCommands ? "Resulting command" : "Example commands",
    lines: renderExampleCommandsLines(rightWidth - 2, examplesHeight - 2, exampleCommands),
  });
  const shortcuts = boxPane({
    width: rightWidth,
    height: shortcutsHeight,
    title: "Keyboard shortcuts",
    lines: renderShortcutsLines(rightWidth - 2, shortcutsHeight - 2),
  });
  const right = [...inspector, ...examples, ...shortcuts];

  const out: string[] = [...header];
  for (let i = 0; i < bodyHeight; i += 1) {
    const row = `${sidebar[i] ?? ansiPadEnd("", sidebarWidth)}${main[i] ?? ansiPadEnd("", mainWidth)}${right[i] ?? ansiPadEnd("", rightWidth)}`;
    out.push(ansiPadEnd(row, width));
  }
  out.push(...renderLogPane(ctx.logEntries, width, logHeight));
  out.push(
    ...renderStatusBar(width, {
      state: ctx.state,
      tickers: ctx.tickers,
      latencyMs: ctx.latencyMs,
      clock: ctx.clock,
    }),
  );
  return `${out.join("\n")}\n`;
}
