/**
 * FILE: stepper.ts
 * PURPOSE: Render the numbered wizard stepper with done/current/pending states connected by dashes.
 * LAYER: component
 * DEPENDS_ON: ../ansiWidth.js, ../ansiPadEnd.js, ../palette.js
 * RULES:
 * - Completed steps render a checkmark, the current step is bold/cyan, pending steps are dim — matching the target "Intent → … → Deploy" strip.
 */
import { ansiPadEnd } from "../ansiPadEnd.js";
import { ansiWidth } from "../ansiWidth.js";
import { BOLD, CYAN, DIM, GREEN, RESET } from "../palette.js";

/**
 * PURPOSE: Build the one-line wizard progress stepper.
 * INPUT:
 * - steps: string[] — step labels in order (e.g. Intent, Strategy, Market, Risk, Preview, Deploy)
 * - current: number — index of the active step; -1 renders all steps pending
 * - width: number — target printable width; connectors stretch to fill the space
 * OUTPUT:
 * - string — styled stepper line of approximately `width` columns
 * USES:
 * - ansiPadEnd, ansiWidth
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Each connector gets an equal share of the remaining width; a narrow terminal simply shortens the dashes.
 */
export function renderStepper(steps: string[], current: number, width: number): string {
  const parts: string[] = [];
  for (let i = 0; i < steps.length; i += 1) {
    const num = `${i + 1} ${steps[i]}`;
    parts.push(
      i < current
        ? `${GREEN}✓${num}${RESET}`
        : i === current
          ? `${BOLD}${CYAN}${num}${RESET}`
          : `${DIM}${num}${RESET}`,
    );
  }
  const fixedWidth = parts.reduce((sum, part) => sum + ansiWidth(part), 0);
  const connectors = Math.max(0, steps.length - 1);
  const gap = connectors === 0 ? 0 : Math.max(2, Math.floor((width - fixedWidth) / connectors));
  const link = `${DIM}${"─".repeat(gap)}${RESET}`;
  return ansiPadEnd(parts.join(link), width);
}
