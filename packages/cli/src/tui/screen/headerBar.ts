/**
 * FILE: headerBar.ts
 * PURPOSE: Render the top identity bar with product name, zone tabs, mode badge, profile, and API status.
 * LAYER: component
 * DEPENDS_ON: ../types.js, ./ansiPadEnd.js, ./ansiSlice.js, ./ansiWidth.js, ./palette.js
 * RULES:
 * - Displays only non-secret state; profile names are sanitized of control characters before rendering.
 */
import type { TuiDashboardState } from "../types.js";
import { ansiPadEnd } from "./ansiPadEnd.js";
import { ansiSlice } from "./ansiSlice.js";
import { ansiWidth } from "./ansiWidth.js";
import { BOLD, CYAN, DIM, GRAY, GREEN, RED, RESET, YELLOW } from "./palette.js";

/** Top navigation zones mirroring the target control-room layout. */
const ZONES = ["Bots", "Markets", "Account", "Developer", "Docs"];

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
 * PURPOSE: Build the two-line header: brand + zone tabs, then a dim divider.
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
 * - Mode colors: DEMO green, LIVE red, NOT CONFIGURED yellow; secrets are never displayed.
 */
export function renderHeaderBar(state: TuiDashboardState, width: number): string[] {
  const profile = ansiSlice(sanitizeText(state.activeProfile), 16);
  const modeColor = state.mode === "LIVE" ? RED : state.mode === "DEMO" ? GREEN : YELLOW;
  const apiBadge = state.credentialsReady ? `${GREEN}API Connected${RESET}` : `${YELLOW}No credentials${RESET}`;
  const brand = `${BOLD}${CYAN}◆ OKX${RESET}  ${BOLD}Agent Trade Kit${RESET} ${DIM}v${state.version}${RESET}`;
  const tabs = ZONES.map((zone, index) =>
    index === 0 ? `${CYAN}${zone}${RESET}` : `${GRAY}${zone}${RESET}`,
  ).join(`${DIM}  ·  ${RESET}`);
  const left = `${brand}   ${DIM}|${RESET}   ${tabs}`;
  const right = `${modeColor}${BOLD}${state.mode}${RESET}  ${GRAY}Profile:${RESET} ${profile}  ${apiBadge}`;
  const pad = Math.max(1, width - ansiWidth(left) - ansiWidth(right));
  return [ansiPadEnd(`${left}${" ".repeat(pad)}${right}`, width), `${DIM}${"─".repeat(width)}${RESET}`];
}
