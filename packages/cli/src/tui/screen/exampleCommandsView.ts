/**
 * FILE: exampleCommandsView.ts
 * PURPOSE: Render the stacked "Example commands" helper panel; when the wizard draft already builds a
 *          valid command, that concrete command leads the list so the panel doubles as a preview.
 * LAYER: component
 * DEPENDS_ON: ./ansiPadEnd.js, ./ansiSlice.js, ./ansiWidth.js, ./sanitizeTerminalText.js, ./palette.js
 * RULES:
 * - Example rows are static and non-executable; preview rows show an invocation only and never trigger it.
 */
import { ansiPadEnd } from "./ansiPadEnd.js";
import { ansiSlice } from "./ansiSlice.js";
import { ansiWidth } from "./ansiWidth.js";
import { sanitizeTerminalText } from "./sanitizeTerminalText.js";
import { CYAN, DIM, RESET, WHITE } from "./palette.js";

/** Example commands shown to beginners; safe read-only CLI invocations. */
const EXAMPLE_COMMANDS = [
  "okx market ticker BTC-USDT",
  "okx bot orders --state live",
  "okx account balance",
  "okx market candles BTC-USDT 1H",
];

export type ExamplePanelState =
  | { kind: "examples" }
  | { kind: "preview"; command: string; confirmation: string }
  | { kind: "blocked"; reason: string };

/**
 * PURPOSE: Render beginner examples, a wrapped command preview, or a blocked-state explanation without triggering execution.
 * INPUT:
 * - width: number — printable width inside the panel
 * - maxRows: number — how many command rows fit
 * - state: ExamplePanelState — examples mode, validated command preview, or a reason deployment is unavailable
 * OUTPUT:
 * - string[] — styled panel content lines, each limited to the panel row budget
 * USES:
 * - ansiPadEnd, ansiSlice, ansiWidth, sanitizeTerminalText
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Preview command text is display-only; only the separate exact-confirmation flow can authorize execution.
 * - Command wrapping occurs at spaces; when the terminal cannot fit the entire command, a trailing ellipsis marks the omitted remainder.
 */
export function renderExampleCommandsLines(width: number, maxRows: number, state: ExamplePanelState): string[] {
  const lines: string[] = [];
  if (state.kind === "blocked") {
    let rest = `Complete setup: ${sanitizeTerminalText(state.reason)}`;
    let lastChunk = "";
    while (rest.length > 0 && lines.length < maxRows) {
      const continuation = lines.length > 0;
      const capacity = continuation ? width - 2 : width;
      let cut = rest.length <= capacity ? rest.length : rest.lastIndexOf(" ", capacity);
      if (cut <= 0) cut = Math.min(capacity, rest.length);
      lastChunk = continuation ? `  ${rest.slice(0, cut).trimStart()}` : rest.slice(0, cut);
      lines.push(ansiPadEnd(`${DIM}${lastChunk}${RESET}`, width));
      rest = rest.slice(cut).trimStart();
    }
    if (rest.length > 0 && lines.length > 0) {
      lines[lines.length - 1] = ansiPadEnd(`${DIM}${ansiSlice(lastChunk, Math.max(0, width - 1))}…${RESET}`, width);
    }
    return lines;
  }
  if (state.kind === "preview") {
    let rest = sanitizeTerminalText(state.command);
    const confirmation = sanitizeTerminalText(state.confirmation);
    const commandRowBudget = Math.max(1, maxRows - 1);
    let lastChunk = "";
    while (rest.length > 0 && lines.length < commandRowBudget) {
      const continuation = lines.length > 0;
      const capacity = continuation ? width - 2 : width;
      let cut = rest.length <= capacity ? rest.length : rest.lastIndexOf(" ", capacity);
      if (cut <= 0) cut = Math.min(capacity, rest.length);
      lastChunk = continuation ? `  ${rest.slice(0, cut).trimStart()}` : rest.slice(0, cut);
      lines.push(ansiPadEnd(`${WHITE}${lastChunk}${RESET}`, width));
      rest = rest.slice(cut).trimStart();
    }
    if (rest.length > 0 && lines.length > 0) {
      lines[lines.length - 1] = ansiPadEnd(`${WHITE}${ansiSlice(lastChunk, Math.max(0, width - 1))}…${RESET}`, width);
    }
    if (lines.length < maxRows) lines.push(`${CYAN}${ansiSlice(confirmation, width)}${RESET}`);
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
