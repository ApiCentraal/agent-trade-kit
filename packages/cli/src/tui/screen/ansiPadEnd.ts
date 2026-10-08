/**
 * FILE: ansiPadEnd.ts
 * PURPOSE: Pad a styled string with spaces up to a fixed printable width so bordered panes stay aligned.
 * LAYER: util
 * DEPENDS_ON: ./ansiWidth.js, ./ansiSlice.js
 * RULES:
 * - Padding never splits an ANSI sequence; overlong input is truncated safely instead.
 */
import { ansiWidth } from "./ansiWidth.js";
import { ansiSlice } from "./ansiSlice.js";

/**
 * PURPOSE: Right-pad a possibly styled string to an exact printable width.
 * INPUT:
 * - text: string — terminal text that may contain ANSI SGR color codes
 * - width: number — target printable column count
 * OUTPUT:
 * - string — text padded or truncated to exactly `width` columns, ANSI-closed
 * USES:
 * - ansiWidth, ansiSlice
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Every pane line must be exactly `width` printable columns; callers must not pad styled text with string.padEnd.
 */
export function ansiPadEnd(text: string, width: number): string {
  const sliced = ansiSlice(text, width);
  const gap = width - ansiWidth(sliced);
  return gap > 0 ? `${sliced}${" ".repeat(gap)}` : sliced;
}
