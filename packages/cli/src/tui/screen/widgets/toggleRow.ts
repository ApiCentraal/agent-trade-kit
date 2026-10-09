/**
 * FILE: toggleRow.ts
 * PURPOSE: Render a labelled on/off indicator row for static risk-execution flags.
 * LAYER: component
 * DEPENDS_ON: ../palette.js
 * RULES:
 * - Toggles are informational (filled dot = on, hollow = off); they mirror the target layout where risk guards are shown enabled.
 */
import { DIM, GREEN, RESET } from "../palette.js";

/**
 * PURPOSE: Produce one toggle line with a colored state dot and dim label.
 * INPUT:
 * - label: string — option name shown after the indicator
 * - on: boolean — whether the option is enabled in the current draft
 * OUTPUT:
 * - string — styled line "● label" (on) or "○ label" (off)
 * USES:
 * - palette SGR codes only
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Purely presentational; callers decide the state, this widget never infers it.
 */
export function renderToggleRow(label: string, on: boolean): string {
  const dot = on ? `${GREEN}●${RESET}` : `${DIM}○${RESET}`;
  return `${dot} ${DIM}${label}${RESET}`;
}
