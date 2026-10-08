/**
 * FILE: pillRow.ts
 * PURPOSE: Render a segmented pill row ("radio button" style options) as one terminal line.
 * LAYER: component
 * DEPENDS_ON: ../palette.js
 * RULES:
 * - The active option is drawn filled (green background); inactive options are dim so the current selection is unambiguous at a glance.
 */
import { BLACK, DIM, GREEN_BG, RESET } from "../palette.js";

/**
 * PURPOSE: Produce the styled one-line pill row used for mode/risk/grid-mode selections.
 * INPUT:
 * - options: string[] — option labels in display order
 * - activeIndex: number — index of the selected option; -1 when nothing is chosen yet
 * OUTPUT:
 * - string — styled line containing all pills separated by single spaces
 * USES:
 * - palette SGR codes only
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - activeIndex outside the range renders all pills inactive; callers never mutate the input array.
 */
export function renderPillRow(options: string[], activeIndex: number): string {
  return options
    .map((option, index) =>
      index === activeIndex
        ? `${GREEN_BG}${BLACK} ${option} ${RESET}`
        : `${DIM} ${option} ${RESET}`,
    )
    .join(" ");
}
