/**
 * FILE: exampleCommandsView.ts
 * PURPOSE: Render the stacked "Example commands" helper panel; when the wizard draft already builds a
 *          valid command, that concrete command leads the list so the panel doubles as a preview.
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
 * - commands: string[] | undefined — contextual commands (wizard-derived) to lead the static examples
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
 * - The "Use" badge is omitted when the command itself needs nearly the full row, so text never clips mid-token.
 */
export function renderExampleCommandsLines(width: number, maxRows: number, commands?: string[]): string[] {
  const lines: string[] = [];
  const list = commands && commands.length > 0 ? commands : EXAMPLE_COMMANDS;
  for (const command of list.slice(0, maxRows)) {
    const fitsBadge = command.length + 5 <= width;
    const text = fitsBadge
      ? `${WHITE}${command}${RESET}`
      : `${WHITE}${ansiSlice(command, Math.max(8, width - 1))}${RESET}`;
    if (!fitsBadge) {
      lines.push(ansiPadEnd(text, width));
      continue;
    }
    const badge = `${CYAN}Use${RESET}`;
    const pad = Math.max(1, width - ansiWidth(text) - 3);
    lines.push(ansiPadEnd(`${text}${" ".repeat(pad)}${badge}`, width));
  }
  if (lines.length === 0) lines.push(`${DIM}no examples${RESET}`);
  return lines;
}
