/**
 * FILE: logPaneView.ts
 * PURPOSE: Render the bottom log pane: tab strip (CLI Logs active) plus timestamped captured output.
 * LAYER: component
 * DEPENDS_ON: ../types.js, ./boxPane.js, ./sanitizeTerminalText.js, ./palette.js
 * RULES:
 * - Entries are rendered newest-last after terminal-control sanitization; the extra tabs are visual anchors matching the target and stay dim.
 */
import type { TuiLogEntry } from "../types.js";
import { boxPane } from "./boxPane.js";
import { sanitizeTerminalText } from "./sanitizeTerminalText.js";
import { CYAN, DIM, GRAY, GREEN, RED, RESET, WHITE, YELLOW } from "./palette.js";

/** Tab labels mirroring the target log pane; only the first is active (session log). */
const LOG_TABS = ["CLI Logs", "Backtest", "Order Preview", "API Response"];

/**
 * PURPOSE: Produce the bordered log pane lines for the lower screen region.
 * INPUT:
 * - entries: TuiLogEntry[] — newest-tail snapshot from SessionLog
 * - width: number — pane width including borders
 * - height: number — pane height including borders
 * OUTPUT:
 * - string[] — bordered pane rows of `width` columns
 * USES:
 * - boxPane
 * EFFECT:
 * - none
 * ERRORS:
 * - Propagates boxPane's width error when width < 4.
 * RULES:
 * - Level colors: info cyan, warn yellow, error red; one content row is reserved for the tab strip.
 */
export function renderLogPane(entries: TuiLogEntry[], width: number, height: number): string[] {
  const inner = Math.max(0, height - 2);
  const tabRow = LOG_TABS.map((tab, index) => (index === 0 ? `${WHITE}${tab}${RESET}` : `${DIM}${tab}${RESET}`)).join(`${DIM}  │  ${RESET}`);
  const visibleRows = Math.max(0, inner - 1);
  const visible = entries.slice(Math.max(0, entries.length - visibleRows));
  const lines: string[] = [tabRow];
  if (visible.length === 0 && inner > 1) {
    lines.push(`${DIM}no captured output yet — press a nav key or describe a bot${RESET}`);
  }
  for (const entry of visible) {
    const color = entry.level === "error" ? RED : entry.level === "warn" ? YELLOW : CYAN;
    const tag = entry.level === "error" ? "ERR" : entry.level === "warn" ? "WARN" : "INFO";
    const safeText = sanitizeTerminalText(entry.text);
    const text = safeText.startsWith("$ ")
      ? `${WHITE}${safeText}${RESET}`
      : safeText.startsWith("exit ")
        ? `${DIM}${safeText}${RESET}`
        : safeText;
    lines.push(`${GRAY}${entry.time}${RESET}  ${color}${tag}${RESET}  ${text}`);
  }
  while (lines.length < inner) lines.push(`${DIM}·${RESET}`);
  return boxPane({ width, height, lines });
}
