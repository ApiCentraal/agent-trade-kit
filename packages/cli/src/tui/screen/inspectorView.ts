/**
 * FILE: inspectorView.ts
 * PURPOSE: Render the inspector model into pane lines: summary fields, validation checklist, and estimates.
 * LAYER: component
 * DEPENDS_ON: ./inspectorModel.js, ./palette.js
 * RULES:
 * - Check statuses map to fixed glyphs (✓ / ✗ / •) with green/red/gray coloring.
 */
import type { InspectorModel } from "./inspectorModel.js";
import { CYAN, DIM, GRAY, GREEN, RED, RESET } from "./palette.js";

/**
 * PURPOSE: Produce styled inspector lines from the summary model.
 * INPUT:
 * - model: InspectorModel — fields, checks, and estimates built from non-secret state
 * OUTPUT:
 * - string[] — styled content lines for the inspector pane
 * USES:
 * - none
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Values are rendered as provided by the model; this view adds no validation of its own.
 */
export function renderInspectorLines(model: InspectorModel): string[] {
  const lines: string[] = [`${GRAY}SUMMARY${RESET}`];
  for (const field of model.fields) {
    lines.push(`${DIM}${field.label}${RESET}`, `  ${field.value}`);
  }
  lines.push("", `${GRAY}VALIDATION${RESET}`);
  for (const check of model.checks) {
    const glyph = check.status === "pass" ? `${GREEN}✓${RESET}` : check.status === "fail" ? `${RED}✗${RESET}` : `${GRAY}•${RESET}`;
    lines.push(`${glyph} ${check.label}`);
    lines.push(`  ${DIM}${check.detail}${RESET}`);
  }
  if (model.estimates.length > 0) {
    lines.push("", `${GRAY}ESTIMATED EXPOSURE${RESET}`);
    for (const estimate of model.estimates) {
      lines.push(`${DIM}${estimate.label}${RESET}  ${CYAN}${estimate.value}${RESET}`);
    }
  }
  return lines;
}
