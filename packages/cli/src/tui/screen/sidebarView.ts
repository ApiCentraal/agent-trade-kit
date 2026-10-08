/**
 * FILE: sidebarView.ts
 * PURPOSE: Render the grouped navigation items as pane content lines with section headers.
 * LAYER: component
 * DEPENDS_ON: ../types.js, ./palette.js
 * RULES:
 * - Section headers are dim; item keys are cyan so the single-keypress affordance stays visible.
 */
import type { TuiNavItem } from "../types.js";
import { CYAN, DIM, GRAY, RESET } from "./palette.js";

/**
 * PURPOSE: Produce sidebar content lines grouped under dim section headers.
 * INPUT:
 * - items: TuiNavItem[] — ordered navigation entries from buildNavItems
 * OUTPUT:
 * - string[] — styled lines ready to be placed inside the sidebar pane
 * USES:
 * - none
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Items render as `<key>  <label>`; a blank line separates sections.
 */
export function renderSidebarLines(items: TuiNavItem[]): string[] {
  const lines: string[] = [];
  let lastSection = "";
  for (const item of items) {
    if (item.section !== lastSection) {
      lines.push(`${GRAY}${item.section.toUpperCase()}${RESET}`);
      lastSection = item.section;
    }
    lines.push(` ${CYAN}${item.key}${RESET}  ${item.label}`);
  }
  lines.push("", `${DIM}q${RESET}  ${DIM}Quit dashboard${RESET}`);
  return lines;
}
