/**
 * FILE: valueField.ts
 * PURPOSE: Render a labelled boxed value field (label line + input-style box line) for numeric/text settings.
 * LAYER: component
 * DEPENDS_ON: ../ansiPadEnd.js, ../ansiSlice.js, ../palette.js
 * RULES:
 * - Empty values render a dim dash so an unfilled field is visually distinct from a zero value.
 */
import { ansiPadEnd } from "../ansiPadEnd.js";
import { ansiSlice } from "../ansiSlice.js";
import { DIM, GRAY, RESET, WHITE } from "../palette.js";

/**
 * PURPOSE: Produce the two lines of a labelled boxed field: dim label then `[ value ]` box.
 * INPUT:
 * - label: string — field caption shown above the box
 * - value: string — current field content (may be empty)
 * - width: number — inner width of the box (minimum 8)
 * - suffix: string | undefined — optional unit rendered dim inside the box (e.g. "USDT", "%")
 * OUTPUT:
 * - string[] — exactly two styled lines
 * USES:
 * - ansiPadEnd, ansiSlice
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - The box never wraps; long values are truncated to keep the form grid aligned.
 */
export function renderValueField(
  label: string,
  value: string,
  width: number,
  suffix?: string,
): string[] {
  const inner = Math.max(8, width);
  const shown = value.trim() === "" ? "—" : value;
  const tail = suffix ? ` ${suffix}` : "";
  const text = ansiSlice(shown, Math.max(0, inner - 2 - tail.length));
  const body = `${WHITE}${ansiPadEnd(` ${text}`, Math.max(0, inner - tail.length - 1))}${RESET}${tail ? `${DIM}${tail}${RESET}` : ""}`;
  return [`${GRAY}${label}${RESET}`, `${DIM}[${RESET}${body} ${DIM}]${RESET}`];
}
