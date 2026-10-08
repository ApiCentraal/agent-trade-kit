/**
 * FILE: renderScreen.ts
 * PURPOSE: Compose the full control-room frame: header, sidebar, main pane, inspector, log pane, and status bar.
 * LAYER: component
 * DEPENDS_ON: ../types.js, ./boxPane.js, ./headerBar.js, ./inspectorModel.js, ./inspectorView.js, ./logPaneView.js, ./mainHomeView.js, ./sidebarModel.js, ./sidebarView.js, ./statusBar.js, ./ansiPadEnd.js, ./ansiWidth.js
 * RULES:
 * - Pane widths are computed from the live terminal size; callers must only invoke this when usePaneLayout() is true.
 */
import type { TuiDashboardState, TuiLogEntry, TuiWizardDraft } from "../types.js";
import { ansiPadEnd } from "./ansiPadEnd.js";
import { boxPane } from "./boxPane.js";
import { renderHeaderBar } from "./headerBar.js";
import { buildInspectorModel } from "./inspectorModel.js";
import { renderInspectorLines } from "./inspectorView.js";
import { renderLogPane } from "./logPaneView.js";
import { renderMainHomeLines } from "./mainHomeView.js";
import { buildNavItems } from "./sidebarModel.js";
import { renderSidebarLines } from "./sidebarView.js";
import { renderStatusBar } from "./statusBar.js";

/** Minimum terminal size required for the multi-pane layout. */
export const PANE_MIN_COLUMNS = 110;
export const PANE_MIN_ROWS = 35;

/** Everything the frame needs for one full render. */
export interface ScreenContext {
  state: TuiDashboardState;
  logEntries: TuiLogEntry[];
  wizardDraft: TuiWizardDraft | undefined;
  mainLines: string[] | undefined;
  mainTitle: string | undefined;
  tickers: string[];
  lastRefresh: string | undefined;
  columns: number;
  rows: number;
}

/**
 * PURPOSE: Render the complete dashboard screen for the current terminal size.
 * INPUT:
 * - ctx: ScreenContext — dashboard state, log tail, optional wizard draft, optional main-pane override, terminal size
 * OUTPUT:
 * - string — the complete ANSI screen ready for a full redraw
 * USES:
 * - renderHeaderBar, renderSidebarLines, renderMainHomeLines, buildInspectorModel, renderInspectorLines, renderLogPane, renderStatusBar, boxPane
 * EFFECT:
 * - none
 * ERRORS:
 * - Throws when the terminal is smaller than the pane minimum; callers must gate with usePaneLayout().
 * RULES:
 * - Layout: header(2) + body(sidebar|main|inspector) + log(4-9 flex) + status(2); every pane line is width-exact.
 */
export function renderScreen(ctx: ScreenContext): string {
  const width = ctx.columns;
  if (width < PANE_MIN_COLUMNS || ctx.rows < PANE_MIN_ROWS) {
    throw new Error("pane layout requires a larger terminal");
  }

  const sidebarWidth = 30;
  const inspectorWidth = 38;
  const mainWidth = width - sidebarWidth - inspectorWidth;
  const bodyHeight = 27;
  const logHeight = Math.max(4, Math.min(9, ctx.rows - 2 - bodyHeight - 2));

  const header = renderHeaderBar(ctx.state, width);
  const sidebar = boxPane({
    width: sidebarWidth,
    height: bodyHeight,
    title: "Navigate",
    lines: renderSidebarLines(buildNavItems()),
  });
  const main = boxPane({
    width: mainWidth,
    height: bodyHeight,
    title: ctx.mainTitle ?? "Home",
    lines: ctx.mainLines ?? renderMainHomeLines(mainWidth - 4),
  });
  const inspector = boxPane({
    width: inspectorWidth,
    height: bodyHeight,
    title: "Configuration",
    lines: renderInspectorLines(buildInspectorModel(ctx.state, ctx.wizardDraft)),
  });

  const out: string[] = [...header];
  const bodyRows = Math.max(sidebar.length, main.length, inspector.length);
  for (let i = 0; i < bodyRows; i += 1) {
    const row = `${sidebar[i] ?? ansiPadEnd("", sidebarWidth)}${main[i] ?? ansiPadEnd("", mainWidth)}${inspector[i] ?? ansiPadEnd("", inspectorWidth)}`;
    out.push(ansiPadEnd(row, width));
  }
  out.push(...renderLogPane(ctx.logEntries, width, logHeight));
  out.push(...renderStatusBar(width, { tickers: ctx.tickers, lastRefresh: ctx.lastRefresh }));
  return `${out.join("\n")}\n`;
}
