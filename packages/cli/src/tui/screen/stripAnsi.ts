/**
 * FILE: stripAnsi.ts
 * PURPOSE: Remove ANSI SGR escape sequences so layout math can measure the printable width of styled text.
 * LAYER: util
 * DEPENDS_ON: none
 * RULES:
 * - Only SGR color sequences are stripped; the pane renderer never emits cursor or erase sequences inside pane content.
 */
const SGR_PATTERN = /\u001b\[[0-9;]*m/g;

/**
 * PURPOSE: Produce the unstyled version of a terminal string for width computation.
 * INPUT:
 * - text: string — terminal text that may contain ANSI SGR color codes
 * OUTPUT:
 * - string — text without SGR sequences
 * USES:
 * - none
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - The result length is the printable column count used by all pane padding and truncation.
 */
export function stripAnsi(text: string): string {
  return text.replace(SGR_PATTERN, "");
}
