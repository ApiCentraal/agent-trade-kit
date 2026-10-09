/**
 * FILE: ansiWidth.ts
 * PURPOSE: Measure the printable column count of a styled terminal string.
 * LAYER: util
 * DEPENDS_ON: ./stripAnsi.js
 * RULES:
 * - Wide glyphs are counted as one column; pane content is restricted to single-width characters by construction.
 */
import { stripAnsi } from "./stripAnsi.js";

/**
 * PURPOSE: Return the number of terminal columns a string occupies, ignoring ANSI styling.
 * INPUT:
 * - text: string — terminal text that may contain ANSI SGR color codes
 * OUTPUT:
 * - number — printable column count
 * USES:
 * - stripAnsi
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - This width is the single source of truth for pane alignment; do not use text.length on styled strings.
 */
export function ansiWidth(text: string): number {
  return stripAnsi(text).length;
}
