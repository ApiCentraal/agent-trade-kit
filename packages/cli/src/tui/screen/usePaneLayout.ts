/**
 * FILE: usePaneLayout.ts
 * PURPOSE: Decide whether the terminal can host the multi-pane control room or must fall back to the simple renderer.
 * LAYER: util
 * DEPENDS_ON: ./renderScreen.js (constants only)
 * RULES:
 * - Returns false for non-TTY streams, tiny terminals, and TERM=dumb so the simple menu always remains reachable.
 */
import { PANE_MIN_COLUMNS, PANE_MIN_ROWS } from "./renderScreen.js";

/**
 * PURPOSE: Check live terminal capabilities against the pane-layout minimums.
 * INPUT:
 * - none
 * OUTPUT:
 * - boolean — true when the multi-pane renderer is safe to use
 * USES:
 * - process.stdout.columns, process.stdout.rows, process.env.TERM
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - TERM=dumb or missing dimensions select the legacy single-box dashboard.
 */
export function usePaneLayout(): boolean {
  const columns = process.stdout.columns ?? 0;
  const rows = process.stdout.rows ?? 0;
  if (process.env.TERM === "dumb") return false;
  return columns >= PANE_MIN_COLUMNS && rows >= PANE_MIN_ROWS;
}
