/**
 * FILE: mainHomeView.ts
 * PURPOSE: Render the central pane's home content: quick actions, a natural-language hint, and example prompts.
 * LAYER: component
 * DEPENDS_ON: ./palette.js
 * RULES:
 * - The home pane is informational only; selection happens through sidebar keys, not by clicking.
 */
import { CYAN, DIM, GRAY, GREEN, RESET, YELLOW } from "./palette.js";

/** Example natural-language intents shown under the input hint, mirroring the target image. */
const EXAMPLES = [
  "Grid bot with 100 USDT on BTC, low risk",
  "DCA into ETH every dip, medium risk",
  "Contract grid on SOL with leverage",
];

/**
 * PURPOSE: Build the home content lines for the main pane when no flow is active.
 * INPUT:
 * - width: number — inner printable width of the main pane
 * OUTPUT:
 * - string[] — styled content lines for the main pane
 * USES:
 * - none
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Keep the home pane short: it is a landing zone, not a second menu; the sidebar owns navigation.
 */
export function renderMainHomeLines(width: number): string[] {
  void width;
  return [
    `${CYAN}Create a new bot${RESET}  ${DIM}or pick any action on the left${RESET}`,
    "",
    `${GREEN}❯${RESET} ${DIM}Press W and describe your idea — e.g. "grid bot BTC 100 USDT low risk"${RESET}`,
    "",
    `${GRAY}EXAMPLES${RESET}`,
    ...EXAMPLES.map((example) => `  ${DIM}${example}${RESET}`),
    "",
    `${GRAY}QUICK ACTIONS${RESET}`,
    `  ${CYAN}1${RESET}  My bots             ${CYAN}7${RESET}  Account overview`,
    `  ${CYAN}4${RESET}  Market data         ${CYAN}8${RESET}  Positions & activity`,
    `  ${CYAN}9${RESET}  Funds & transfers   ${CYAN}c${RESET}  Profiles & API keys`,
    "",
    `${YELLOW}Financial actions preview first${RESET}${DIM} — nothing executes without an exact confirmation.${RESET}`,
  ];
}
