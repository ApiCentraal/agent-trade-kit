/**
 * FILE: ansiSlice.ts
 * PURPOSE: Truncate a styled string to a printable width without cutting through ANSI escape sequences.
 * LAYER: util
 * DEPENDS_ON: none
 * RULES:
 * - A reset sequence is appended whenever truncation happens inside styled content so colors never bleed into borders.
 */
const SGR_PATTERN = /\u001b\[[0-9;]*m/;
const RESET = "\u001b[0m";

/**
 * PURPOSE: Keep at most `width` printable columns of styled text while preserving complete SGR sequences.
 * INPUT:
 * - text: string — terminal text that may contain ANSI SGR color codes
 * - width: number — maximum printable column count to keep
 * OUTPUT:
 * - string — truncated text ending with a reset when any styling was emitted
 * USES:
 * - none
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Escape sequences are copied verbatim but never counted toward the width budget.
 */
export function ansiSlice(text: string, width: number): string {
  let out = "";
  let used = 0;
  let styled = false;
  let index = 0;
  while (index < text.length && used < width) {
    const match = text.slice(index).match(SGR_PATTERN);
    if (match && match.index === 0) {
      out += match[0];
      if (match[0] !== RESET) styled = true;
      index += match[0].length;
      continue;
    }
    out += text[index];
    used += 1;
    index += 1;
  }
  if (styled && !out.endsWith(RESET)) out += RESET;
  return out;
}
