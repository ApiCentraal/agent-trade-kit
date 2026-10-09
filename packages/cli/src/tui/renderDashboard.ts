/**
 * FILE: renderDashboard.ts
 * PURPOSE: Render the compact control-room screen in a beginner view or an advanced view from non-secret profile status.
 * LAYER: util
 * DEPENDS_ON: ./types.js, Node.js terminal width
 * RULES:
 * - Render credential readiness only; never render credential values.
 */
import type { TuiDashboardState } from "./types.js";

/**
 * PURPOSE: Produce a readable, color-accented terminal menu that fits common console widths.
 * INPUT:
 * - state: TuiDashboardState — safe profile and configuration summary
 * - advanced: boolean — true renders the full specialist tool list instead of the simplified everyday menu
 * OUTPUT:
 * - string — complete ANSI terminal screen with dashboard actions and status
 * USES:
 * - TuiDashboardState
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Keep order placement behind explicit confirmation and truncate long paths/profile names to the panel width.
 * - The default view stays short for new users; specialist tooling lives behind the advanced toggle.
 */
export function renderDashboard(state: TuiDashboardState, advanced = false): string {
  const width = Math.max(44, Math.min(74, (process.stdout.columns ?? 82) - 4));
  const border = "─".repeat(width);
  const credentials = state.credentialsReady ? "READY" : "NOT SET";
  const activeProfile = state.activeProfile.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
  const configPath = state.configPath.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
  const safeProfileNames: string[] = [];
  for (const profileName of state.profileNames) {
    safeProfileNames.push(profileName.replace(/[\u0000-\u001f\u007f-\u009f]/g, " "));
  }
  const visibleProfileNames: string[] = [];
  let visibleProfileCount = 0;
  for (const profileName of safeProfileNames) {
    if (visibleProfileCount < 3) visibleProfileNames.push(profileName.slice(0, 14));
    visibleProfileCount += 1;
  }
  if (safeProfileNames.length > 3) visibleProfileNames.push(`+${safeProfileNames.length - 3} more`);
  const profileNames = visibleProfileNames.length > 0 ? visibleProfileNames.join(", ") : "none";
  const rows = [
    "  CONTROL ROOM  /  OKX",
    "",
    `  PROFILE      ${activeProfile}`,
    `  MODE         ${state.mode}`,
    `  API KEYS     ${credentials}`,
    `  PROFILES     ${profileNames}`,
    `  CONFIG       ${configPath}`,
    "",
    "  ACTIONS",
  ];
  const simpleChoices = [
    "  1    Account overview",
    "  2    Positions & activity",
    "  3    Market data",
    "  4    Trading bot monitor",
    "  5    Trading & funds operations",
    "  6    Profile manager",
    "  A    Advanced tools",
    "  Q    Quit",
  ];
  const advancedChoices = [
    "  1    Yield & insights",
    "  2    MCP client integrations",
    "  3    Authentication",
    "  4    Health, Pilot & updates",
    "  5    Tools & skills",
    "  B    Back to simple menu",
    "  Q    Quit",
  ];
  const choices = advanced ? advancedChoices : simpleChoices;
  let screen = `┌${border}┐\n`;
  const title = "  AGENT TRADE KIT";
  screen += `│\u001b[96m${title}\u001b[0m${" ".repeat(width - title.length)}│\n`;
  screen += `│  Terminal control room  ·  v${state.version}${" ".repeat(Math.max(0, width - 30 - state.version.length))}│\n`;
  screen += `├${border}┤\n`;

  for (const row of rows) {
    const visible = row.slice(0, width);
    screen += `│${visible.padEnd(width)}│\n`;
  }

  for (const choice of choices) {
    const visible = choice.slice(0, width);
    screen += `│\u001b[96m${visible.slice(0, 5)}\u001b[0m${visible.slice(5).padEnd(width - 5)}│\n`;
  }

  screen += `├${border}┤\n`;
  const safetyNote = "  Financial actions preview first and need an exact confirmation.";
  screen += `│${safetyNote.slice(0, width).padEnd(width)}│\n`;
  const exitHint = advanced ? "  Select 1–5, B to go back, or Q to exit." : "  Select 1–6, A for more tools, or Q to exit.";
  screen += `│${exitHint.padEnd(width)}│\n`;
  screen += `└${border}┘\n`;
  return screen;
}
