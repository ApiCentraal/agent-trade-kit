/**
 * FILE: inspectorView.ts
 * PURPOSE: Render the "Generated configuration" inspector: right-aligned summary rows, a validation
 *          checklist with an n/n passed counter, and locally estimated order exposure.
 * LAYER: component
 * DEPENDS_ON: ./inspectorModel.js, ./ansiPadEnd.js, ./ansiWidth.js, ./ansiSlice.js, ./sanitizeTerminalText.js, ./palette.js
 * RULES:
 * - Check statuses map to fixed glyphs (✓ / ✗ / •) with green/red/gray coloring; the counter shows passed/total.
 */
import type { InspectorModel } from "./inspectorModel.js";
import { ansiPadEnd } from "./ansiPadEnd.js";
import { ansiSlice } from "./ansiSlice.js";
import { ansiWidth } from "./ansiWidth.js";
import { sanitizeTerminalText } from "./sanitizeTerminalText.js";
import { CYAN, DIM, GRAY, GREEN, RED, RESET, WHITE } from "./palette.js";

/**
 * PURPOSE: Render one summary row with the label left-aligned and the value right-aligned.
 * INPUT:
 * - label: string — field caption
 * - value: string — field value (already safe/non-secret)
 * - width: number — printable width of the row
 * OUTPUT:
 * - string — styled row padded to `width`
 * USES:
 * - ansiPadEnd, ansiSlice, ansiWidth
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Dynamic model labels and values are sanitized before truncation so profile/config text cannot emit terminal controls.
 */
function summaryRow(label: string, value: string, width: number): string {
  const valueText = ansiSlice(sanitizeTerminalText(value), Math.max(4, Math.floor(width / 2)));
  const left = `${DIM}${sanitizeTerminalText(label)}${RESET}`;
  const pad = Math.max(1, width - ansiWidth(left) - ansiWidth(valueText));
  return ansiPadEnd(`${left}${" ".repeat(pad)}${WHITE}${valueText}${RESET}`, width);
}

/**
 * PURPOSE: Produce styled inspector lines from the summary model.
 * INPUT:
 * - model: InspectorModel — fields, checks, and estimates built from non-secret state
 * - width: number — printable width inside the inspector pane
 * OUTPUT:
 * - string[] — styled content lines for the inspector pane
 * USES:
 * - summaryRow, ansiPadEnd, ansiWidth
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - The "n/n passed" counter counts only pass-status checks so it matches the visible checklist.
 */
export function renderInspectorLines(model: InspectorModel, width: number): string[] {
  const passed = model.checks.filter((c) => c.status === "pass").length;
  const counterColor = passed === model.checks.length ? GREEN : passed > 0 ? CYAN : GRAY;
  const lines: string[] = [`${GRAY}SUMMARY${RESET}`];
  for (const field of model.fields) {
    lines.push(summaryRow(field.label, field.value, width));
  }
  const counter = `${passed}/${model.checks.length} passed`;
  const header = width >= 30 ? `VALIDATION CHECKS` : `VALIDATION`;
  lines.push("", `${GRAY}${header}${RESET}   ${counterColor}${counter}${RESET}`);
  for (const check of model.checks) {
    const glyph = check.status === "pass" ? `${GREEN}✓${RESET}` : check.status === "fail" ? `${RED}✗${RESET}` : `${GRAY}•${RESET}`;
    const safeLabel = sanitizeTerminalText(check.label);
    const safeDetail = sanitizeTerminalText(check.detail);
    const left = `${glyph} ${WHITE}${ansiSlice(safeLabel, Math.max(6, width - 10))}${RESET}`;
    const detailBudget = Math.max(4, width - ansiWidth(left) - 2);
    const detailText =
      safeDetail.length > detailBudget ? `${ansiSlice(safeDetail, Math.max(3, detailBudget - 1))}…` : safeDetail;
    const pad = Math.max(1, width - ansiWidth(left) - ansiWidth(detailText));
    lines.push(ansiPadEnd(`${left}${" ".repeat(pad)}${DIM}${detailText}${RESET}`, width));
  }
  if (model.estimates.length > 0) {
    lines.push("", `${GRAY}ESTIMATED ORDERS & EXPOSURE${RESET}`);
    for (const estimate of model.estimates) {
      lines.push(summaryRow(estimate.label, estimate.value, width));
    }
  }
  return lines;
}
