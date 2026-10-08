/**
 * FILE: selectBox.ts
 * PURPOSE: Render a boxed "dropdown" field showing the current value and a down-caret affordance.
 * LAYER: component
 * DEPENDS_ON: ../ansiPadEnd.js, ../ansiSlice.js, ../palette.js
 * RULES:
 * - The box is decorative only; the caret signals "editable via prompt" since this TUI is keyboard-driven.
 */
import { ansiPadEnd } from "../ansiPadEnd.js";
import { ansiSlice } from "../ansiSlice.js";
import { DIM, RESET, WHITE } from "../palette.js";

/**
 * PURPOSE: Produce a single-line boxed select field padded to the requested width.
 * INPUT:
 * - value: string — currently selected or placeholder text
 * - width: number — inner width of the box (minimum 8)
 * OUTPUT:
 * - string — one styled line of `width + 2` printable columns
 * USES:
 * - ansiPadEnd, ansiSlice
 * EFFECT:
 * - none
 * ERRORS:
 * - Throws via ansiPadEnd assumptions if width is negative; callers pass sane section widths.
 * RULES:
 * - Value text is truncated, never wrapped, because form rows must stay single-line.
 */
export function renderSelectBox(value: string, width: number): string {
  const inner = Math.max(8, width);
  const caret = "▾";
  const text = ansiSlice(value, Math.max(0, inner - 2));
  const body = ansiPadEnd(` ${text}`, inner - 1) + caret;
  return `${DIM}[${RESET}${WHITE}${body}${RESET}${DIM}]${RESET}`;
}
