/**
 * FILE: headerBar.ts
 * PURPOSE: Render the top identity bar: brand, zone tabs, DEMO/LIVE segmented mode, profile, and API status.
 * LAYER: component
 * DEPENDS_ON: ../types.js, ./ansiPadEnd.js, ./ansiSlice.js, ./ansiWidth.js, ./palette.js
 * RULES:
 * - Displays only non-secret state; profile names are sanitized of control characters before rendering.
 */
import type { TuiDashboardState } from "../types.js";
import { ansiPadEnd } from "./ansiPadEnd.js";
import { ansiSlice } from "./ansiSlice.js";
import { ansiWidth } from "./ansiWidth.js";
import { BLACK, BOLD, CYAN, DIM, GRAY, GREEN, GREEN_BG, RED_BG, RESET, WHITE, YELLOW } from "./palette.js";

/** Top navigation zones; caret marks a dropdown affordance like the target header. */
const ZONES: Array<{ label: string; caret: boolean }> = [
  { label: "Bots", caret: false },
  { label: "Markets", caret: true },
  { label: "Account", caret: true },
  { label: "Developer", caret: true },
  { label: "Docs", caret: true },
];

/** Control-character class kept as a literal so source files never embed raw control bytes. */
const CONTROL_CHARS = new RegExp("\\p{Cc}", "gu");

/**
 * PURPOSE: Replace control characters in profile-derived text with spaces before rendering.
 * INPUT:
 * - text: string — profile or path text from user configuration
 * OUTPUT:
 * - string — sanitized text safe for single-line terminal rendering
 * USES:
 * - none
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Applied to every config-sourced string before it reaches a pane line.
 */
function sanitizeText(text: string): string {
  return text.replace(CONTROL_CHARS, " ");
}

/**
 * PURPOSE: Build the two-line header: brand + segmented DEMO/LIVE + zone tabs + profile + API status.
 * INPUT:
 * - state: TuiDashboardState — safe profile, mode, and credential readiness
 * - width: number — total printable width of the header line
 * OUTPUT:
 * - string[] — exactly two printable lines of `width` columns each
 * USES:
 * - ansiPadEnd, ansiSlice, ansiWidth
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - The active mode segment is filled (green for DEMO, red for LIVE); secrets are never displayed.
 */
export function renderHeaderBar(state: TuiDashboardState, width: number): string[] {
  const profile = ansiSlice(sanitizeText(state.activeProfile), 16);
  const demoSeg = state.mode === "DEMO" ? `${GREEN_BG}${BLACK} DEMO ${RESET}` : `${DIM} DEMO ${RESET}`;
  const liveSeg = state.mode === "LIVE" ? `${RED_BG}${WHITE} LIVE ${RESET}` : `${DIM} LIVE ${RESET}`;
  const modeSeg = state.mode === "NOT CONFIGURED" ? `${YELLOW} NOT CONFIGURED ${RESET}` : `${demoSeg}${liveSeg}`;
  const apiBadge = state.credentialsReady ? `${GREEN}● API Connected${RESET}` : `${YELLOW}● No credentials${RESET}`;
  const brand = `${BOLD}${CYAN}◆ OKX${RESET}  ${BOLD}Bot Config CLI${RESET} ${CYAN} BETA ${RESET}`;
  const tabs = ZONES.map((zone, index) => {
    const label = zone.caret ? `${zone.label} ▾` : zone.label;
    return index === 0 ? `${WHITE}${label}${RESET}` : `${GRAY}${label}${RESET}`;
  }).join("   ");
  const left = `${brand}  ${DIM}│${RESET}  ${tabs}`;
  const right = `${modeSeg}  ${GRAY}Profile:${RESET} ${profile}  ${apiBadge}  ${DIM}Spot${RESET}`;
  const pad = Math.max(1, width - ansiWidth(left) - ansiWidth(right));
  return [ansiPadEnd(`${left}${" ".repeat(pad)}${right}`, width), `${DIM}${"─".repeat(width)}${RESET}`];
}
