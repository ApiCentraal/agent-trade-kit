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
 * - Contextual commands (wizard-derived) wrap over multiple rows with an indent, because seeing the
 *   full invocation that will run is the point of the panel; static examples never wrap.
 */
export function renderExampleCommandsLines(width: number, maxRows: number, commands?: string[]): string[] {
  const lines: string[] = [];
  if (commands && commands.length > 0) {
    for (const command of commands.slice(0, maxRows)) {
      let rest = command;
      while (rest.length > 0 && lines.length < maxRows) {
        const continuation = lines.length > 0;
        const capacity = continuation ? width - 2 : width;
        let cut = rest.length <= capacity ? rest.length : rest.lastIndexOf(" ", capacity);
        if (cut <= 0) cut = Math.min(capacity, rest.length);
        const chunk = continuation ? `  ${rest.slice(0, cut).trimStart()}` : rest.slice(0, cut);
        lines.push(ansiPadEnd(`${WHITE}${chunk}${RESET}`, width));
        rest = rest.slice(cut).trimStart();
      }
    }
    if (lines.length < maxRows) {
      lines.push(`${DIM}runs only after exact CONFIRM${RESET}`);
    }
    return lines.slice(0, maxRows);
  }
  for (const command of EXAMPLE_COMMANDS.slice(0, maxRows)) {
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
