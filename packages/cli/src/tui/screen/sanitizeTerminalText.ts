/**
 * FILE: sanitizeTerminalText.ts
 * PURPOSE: Remove terminal control sequences from dynamic text before it is displayed inside dashboard panes.
 * LAYER: util
 * DEPENDS_ON: none
 * RULES:
 * - Untrusted configuration values and child-process output may not emit cursor, erase, OSC, or line-control sequences.
 */
const ANSI_CONTROL_SEQUENCE = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001b\\)|[PX^_][\s\S]*?\u001b\\|[@-_])/g;
const CONTROL_CHARS = /[\p{Cc}\u2028\u2029]/gu;

/**
 * PURPOSE: Make user/configuration/process text safe for inline terminal display without changing ordinary content.
 * INPUT:
 * - text: string — dynamic single-line text that may contain ANSI or control sequences
 * OUTPUT:
 * - string — printable text with terminal escape sequences removed and control characters replaced by spaces
 * USES:
 * - none
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Apply at display/storage boundaries; never use the sanitized text as executable arguments or as a replacement for validation.
 */
export function sanitizeTerminalText(text: string): string {
  return text.replace(ANSI_CONTROL_SEQUENCE, "").replace(CONTROL_CHARS, " ");
}
