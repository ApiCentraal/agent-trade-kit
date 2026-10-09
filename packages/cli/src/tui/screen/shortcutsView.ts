/**
 * FILE: shortcutsView.ts
 * PURPOSE: Render the stacked "Keyboard shortcuts" helper panel listing the global dashboard keys.
 * LAYER: component
 * DEPENDS_ON: ./ansiPadEnd.js, ./ansiWidth.js, ./palette.js
 * RULES:
 * - The key list must stay in sync with launchTui's global keys (l, r, q) and the wizard entry (w).
 */
import { ansiPadEnd } from "./ansiPadEnd.js";
import { ansiWidth } from "./ansiWidth.js";
import { CYAN, DIM, RESET } from "./palette.js";

/** Global key bindings shown in the shortcuts panel. */
const SHORTCUTS: Array<{ key: string; action: string }> = [
  { key: "w", action: "Create bot wizard" },
  { key: "l", action: "Fullscreen logs" },
  { key: "r", action: "Refresh tickers" },
  { key: "q", action: "Quit" },
];

/**
 * PURPOSE: Produce panel lines pairing each key with its action.
 * INPUT:
 * - width: number — printable width inside the panel
 * - maxRows: number — how many shortcut rows fit
 * OUTPUT:
 * - string[] — styled panel content lines
 * USES:
 * - ansiPadEnd, ansiWidth
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Keys render cyan in a fixed column; actions are dim so scanning is fast.
 */
export function renderShortcutsLines(width: number, maxRows: number): string[] {
  const lines: string[] = [];
  for (const shortcut of SHORTCUTS.slice(0, maxRows)) {
    const key = `${CYAN}${shortcut.key.toUpperCase()}${RESET}`;
    const action = `${DIM}${shortcut.action}${RESET}`;
    const pad = Math.max(1, width - 4 - ansiWidth(action));
    lines.push(ansiPadEnd(`${key}   ${" ".repeat(pad)}${action}`, width));
  }
  if (lines.length === 0) lines.push(`${DIM}no shortcuts${RESET}`);
  return lines;
}
