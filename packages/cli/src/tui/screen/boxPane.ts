/**
 * FILE: boxPane.ts
 * PURPOSE: Draw one bordered pane (optionally titled) as an array of fixed-width printable lines.
 * LAYER: util
 * DEPENDS_ON: ./ansiPadEnd.js, ./ansiSlice.js, ./ansiWidth.js, ./palette.js
 * RULES:
 * - Every returned line is exactly `width` printable columns so panes can be zipped side by side.
 */
import { ansiPadEnd } from "./ansiPadEnd.js";
import { ansiSlice } from "./ansiSlice.js";
import { ansiWidth } from "./ansiWidth.js";
import { CYAN, DIM, RESET } from "./palette.js";

/**
 * PURPOSE: Wrap content lines in a box-drawing border sized to a fixed rectangle.
 * INPUT:
 * - options.width: number — total printable width including borders; minimum 4
 * - options.lines: string[] — pane content; lines are truncated or padded to fit
 * - options.title: string | undefined — optional label drawn into the top border
 * - options.height: number | undefined — fixed total row count; missing rows are blank-padded
 * OUTPUT:
 * - string[] — pane rows, each exactly `width` printable columns
 * USES:
 * - ansiPadEnd, ansiSlice, ansiWidth
 * EFFECT:
 * - none
 * ERRORS:
 * - Throws when width is below 4 because a border cannot be drawn.
 * RULES:
 * - Content styling must stay inside the content area; borders are always dim gray.
 */
export function boxPane(options: { width: number; lines: string[]; title?: string; height?: number }): string[] {
  const width = options.width;
  if (width < 4) throw new Error("pane width must be at least 4 columns");
  const inner = width - 2;
  let top = `${DIM}┌${"─".repeat(inner)}┐${RESET}`;
  if (options.title) {
    const label = ` ${ansiSlice(options.title, Math.max(0, inner - 2))} `;
    const labelWidth = ansiWidth(label);
    top = `${DIM}┌${RESET}${CYAN}${label}${RESET}${DIM}${"─".repeat(Math.max(0, inner - labelWidth))}┐${RESET}`;
  }
  const rows: string[] = [top];
  const bodyRows = options.height !== undefined ? Math.max(0, options.height - 2) : options.lines.length;
  for (let i = 0; i < bodyRows; i += 1) {
    const line = options.lines[i] ?? "";
    rows.push(`${DIM}│${RESET}${ansiPadEnd(line, inner)}${DIM}│${RESET}`);
  }
  rows.push(`${DIM}└${"─".repeat(inner)}┘${RESET}`);
  return rows;
}
