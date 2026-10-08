/**
 * FILE: sidebarView.ts
 * PURPOSE: Render the grouped navigation as pane lines: dim section headers, a highlighted active
 *          create-bot row with numbered wizard-step echoes, and right-aligned key badges.
 * LAYER: component
 * DEPENDS_ON: ../types.js, ./ansiPadEnd.js, ./ansiWidth.js, ./palette.js, ./sidebarModel.js
 * RULES:
 * - The wizard-step echo lines are decorative mirrors of the live stepper, not dispatchable items.
 */
import type { TuiNavItem } from "../types.js";
import { ansiPadEnd } from "./ansiPadEnd.js";
import { ansiWidth } from "./ansiWidth.js";
import { BLACK, CYAN, DIM, GRAY, GREEN, GREEN_BG, RESET, WHITE } from "./palette.js";
import { SIDEBAR_WIZARD_STEPS } from "./sidebarModel.js";

/**
 * PURPOSE: Produce sidebar content lines grouped under dim section headers.
 * INPUT:
 * - items: TuiNavItem[] — ordered navigation entries from buildNavItems
 * - innerWidth: number — printable width inside the sidebar pane
 * - wizardStep: number — active wizard step (0–5) or -1 when idle; echoes as ✓/numbered rows
 * OUTPUT:
 * - string[] — styled lines ready to be placed inside the sidebar pane
 * USES:
 * - ansiPadEnd, ansiWidth, SIDEBAR_WIZARD_STEPS
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Item rows render as `label … [key]`; a blank line separates sections; "Create bot" is always the emphasized row.
 * - When `maxLines` cannot hold the full tree, step echoes and blank separators are dropped first;
 *   remaining overflow is truncated from the bottom so top sections always stay visible.
 */
export function renderSidebarLines(
  items: TuiNavItem[],
  innerWidth: number,
  wizardStep: number,
  maxLines?: number,
): string[] {
  const full = buildLines(items, innerWidth, wizardStep, { echoes: true, separators: true, headers: true });
  if (maxLines === undefined || full.length <= maxLines) return full;
  const compact = buildLines(items, innerWidth, wizardStep, { echoes: false, separators: false, headers: true });
  if (compact.length <= maxLines) return compact;
  return buildLines(items, innerWidth, wizardStep, { echoes: false, separators: false, headers: false }).slice(0, maxLines);
}

/**
 * PURPOSE: Build the sidebar line list with optional decorative elements.
 * INPUT:
 * - items: TuiNavItem[] — ordered navigation entries from buildNavItems
 * - innerWidth: number — printable width inside the sidebar pane
 * - wizardStep: number — active wizard step for the ✓/● echo glyphs
 * - density.echoes: boolean — include the six wizard-step mirror rows under "Create bot"
 * - density.separators: boolean — include blank lines between sections
 * - density.headers: boolean — include dim section headers; dropped last so items always fit
 * OUTPUT:
 * - string[] — styled lines ready to be placed inside the sidebar pane
 * USES:
 * - ansiPadEnd, ansiWidth, SIDEBAR_WIZARD_STEPS
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Every dispatchable item and the Quit row must render in all density tiers.
 */
function buildLines(
  items: TuiNavItem[],
  innerWidth: number,
  wizardStep: number,
  density: { echoes: boolean; separators: boolean; headers: boolean },
): string[] {
  const lines: string[] = [];
  let lastSection = "";
  for (const item of items) {
    if (item.section !== lastSection) {
      if (density.headers) {
        if (density.separators && lines.length > 0) lines.push("");
        lines.push(`${GRAY}${item.section.toUpperCase()}${RESET}`);
      }
      lastSection = item.section;
    }
    if (item.key === "w") {
      const row = `${GREEN_BG}${BLACK}${ansiPadEnd(` ▸ ${item.label}`, innerWidth - 4)}${RESET}`;
      lines.push(`${row}${DIM} [w]${RESET}`);
      if (density.echoes) {
        for (let i = 0; i < SIDEBAR_WIZARD_STEPS.length; i += 1) {
          const glyph = wizardStep > i ? `${GREEN}✓${RESET}` : wizardStep === i ? `${CYAN}●${RESET}` : `${DIM}${i + 1}${RESET}`;
          lines.push(`    ${glyph} ${DIM}${SIDEBAR_WIZARD_STEPS[i]}${RESET}`);
        }
      }
      continue;
    }
    const badge = `${DIM}[${item.key}]${RESET}`;
    const label = `${WHITE}${item.label}${RESET}`;
    const pad = Math.max(1, innerWidth - ansiWidth(label) - 4);
    lines.push(` ${label}${" ".repeat(pad)}${badge}`);
  }
  lines.push(` ${DIM}Quit${" ".repeat(Math.max(1, innerWidth - 9))}[q]${RESET}`);
  return lines;
}
