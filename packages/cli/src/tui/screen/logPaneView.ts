/**
 * FILE: logPaneView.ts
 * PURPOSE: Render the bottom CLI/API log pane from the bounded session log.
 * LAYER: component
 * DEPENDS_ON: ../types.js, ./boxPane.js, ./palette.js
 * RULES:
 * - Entries are rendered newest-last; each row is truncated by the pane itself.
 */
import type { TuiLogEntry } from "../types.js";
import { boxPane } from "./boxPane.js";
import { CYAN, DIM, GRAY, GREEN, RED, RESET, YELLOW } from "./palette.js";

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
 * - Level colors: info cyan, warn yellow, error red; the pane title doubles as a hint for the fullscreen view.
 */
export function renderLogPane(entries: TuiLogEntry[], width: number, height: number): string[] {
  const inner = Math.max(0, height - 2);
  const visible = entries.slice(Math.max(0, entries.length - inner));
  const lines = visible.map((entry) => {
    const color = entry.level === "error" ? RED : entry.level === "warn" ? YELLOW : CYAN;
    const tag = entry.level.toUpperCase().padEnd(5);
    return `${GRAY}${entry.time}${RESET} ${color}${tag}${RESET} ${entry.text}`;
  });
  while (lines.length < inner) lines.push(`${DIM}${GREEN}·${RESET}${DIM}${""}${RESET}`);
  return boxPane({ width, height, title: "CLI Logs — L for fullscreen", lines });
}
