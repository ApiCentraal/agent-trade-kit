/**
 * FILE: exampleCommandsView.ts
 * PURPOSE: Render the stacked "Example commands" helper panel that mirrors the target's clickable command list.
 * LAYER: component
 * DEPENDS_ON: ./ansiPadEnd.js, ./ansiSlice.js, ./ansiWidth.js, ./palette.js
 * RULES:
 * - Commands are static examples; the Use badge is decorative guidance — nothing executes from this panel.
 */
import { ansiPadEnd } from "./ansiPadEnd.js";
import { ansiSlice } from "./ansiSlice.js";
import { ansiWidth } from "./ansiWidth.js";
import { CYAN, DIM, RESET, WHITE } from "./palette.js";

/** Example commands shown to beginners; safe read-only CLI invocations. */
const EXAMPLE_COMMANDS = [
  "okx market ticker BTC-USDT",
  "okx bot orders --state live",
  "okx account balance",
  "okx market candles BTC-USDT 1H",
];

/**
 * PURPOSE: Produce panel lines listing example commands with a dim "Use" badge per row.
 * INPUT:
 * - width: number — printable width inside the panel
 * - maxRows: number — how many command rows fit
 * OUTPUT:
 * - string[] — styled panel content lines
 * USES:
 * - ansiPadEnd, ansiSlice, ansiWidth
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Rows are truncated to width; the list is static so it never leaks session data.
 */
export function renderExampleCommandsLines(width: number, maxRows: number): string[] {
  const lines: string[] = [];
  for (const command of EXAMPLE_COMMANDS.slice(0, maxRows)) {
    const text = `${WHITE}${ansiSlice(command, Math.max(8, width - 7))}${RESET}`;
    const badge = `${CYAN}Use${RESET}`;
    const pad = Math.max(1, width - ansiWidth(text) - 3);
    lines.push(ansiPadEnd(`${text}${" ".repeat(pad)}${badge}`, width));
  }
  if (lines.length === 0) lines.push(`${DIM}no examples${RESET}`);
  return lines;
}
