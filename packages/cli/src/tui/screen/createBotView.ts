/**
 * FILE: createBotView.ts
 * PURPOSE: Render the main pane as the "Create a new bot" control-room view: title, example chips,
 *          intent input box, six-step stepper, numbered configuration form, and action buttons.
 * LAYER: component
 * DEPENDS_ON: ../types.js, ./ansiPadEnd.js, ./palette.js, ./widgets/stepper.js, ./widgets/pillRow.js, ./wizardFormView.js
 * RULES:
 * - The intent input line is where typed prompts appear; it reflects the hint supplied by the wizard step.
 * - The Deploy button is highlighted only while the wizard is at the confirm step — it is decorative, not a trigger.
 */
import type { TuiDashboardState, TuiWizardDraft } from "../types.js";
import { ansiPadEnd } from "./ansiPadEnd.js";
import { BLACK, BOLD, DIM, GRAY, GREEN, GREEN_BG, RESET, WHITE } from "./palette.js";
import { renderPillRow } from "./widgets/pillRow.js";
import { renderStepper } from "./widgets/stepper.js";
import { renderWizardForm } from "./wizardFormView.js";

/** Stepper labels matching the target image. */
const STEPS = ["Intent", "Strategy", "Market", "Risk", "Preview", "Deploy"];

/** Example intent chips shown under the subtitle. */
const EXAMPLE_CHIPS = [
  "Grid bot 100 USDT",
  "DCA on ETH every day",
  "Futures trend following",
  "Arbitrage BTC-ETH",
];

/**
 * PURPOSE: Compose the main-pane lines for the create-bot view at a given wizard step.
 * INPUT:
 * - options.draft: TuiWizardDraft | undefined — current wizard answers; undefined shows the empty landing form
 * - options.state: TuiDashboardState — mode/profile context for environment pills
 * - options.step: number — active stepper index (0–5); -1 when no wizard is running
 * - options.hint: string | undefined — the current prompt hint drawn inside the input box
 * - options.intentText: string | undefined — the raw intent the user typed on step 1
 * - options.width: number — printable width of the main pane content area
 * - options.height: number | undefined — available content rows; a tighter height drops subtitle/chips first
 * OUTPUT:
 * - string[] — styled content lines for the main pane
 * USES:
 * - renderStepper, renderPillRow, renderWizardForm, ansiPadEnd
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - The hint line is informational: actual user typing happens on the bottom prompt line below the frame.
 * - The Deploy button row is always kept: overflow trims decorative lines, never the form or actions.
 */
export function renderCreateBotView(options: {
  draft: TuiWizardDraft | undefined;
  state: TuiDashboardState;
  step: number;
  hint?: string;
  intentText?: string;
  width: number;
  height?: number;
}): string[] {
  const { draft, state, step, hint, intentText, width, height } = options;
  const inner = Math.max(20, width);
  const chipBudget = Math.max(0, inner - 12);
  const keptChips: string[] = [];
  let chipUsed = 0;
  for (const chip of EXAMPLE_CHIPS) {
    const cost = chip.length + 3;
    if (keptChips.length > 0 && chipUsed + cost > chipBudget) break;
    keptChips.push(`${DIM} ${chip} ${RESET}`);
    chipUsed += cost;
  }
  const chips = keptChips.join(" ");
  const inputBody = ansiPadEnd(
    ` ${GREEN}›${RESET} ${intentText ?? `${DIM}${hint ?? "Describe your trading idea, or configure manually…"}${RESET}`}`,
    inner - 2,
  );

  const form = renderWizardForm(draft, state, inner);
  const stepper = renderStepper(STEPS, step, inner);
  const strategyHeader = `${WHITE}Strategy configuration${RESET}   ${DIM}Adjust the parameters generated from your request.${RESET}`;
  const strategyPills = renderPillRow(["Auto (AI)", "Manual", "Advanced"], 0);
  const buttons = `${DIM}⟳ Backtest${RESET}   ${step === 5 ? `${GREEN_BG}${BLACK} Save & Deploy → ${RESET}` : `${DIM} Save & Deploy → ${RESET}`}`;

  const lines: string[] = [
    `${BOLD}${WHITE}Create a new bot${RESET}`,
    `${DIM}Describe your trading idea in natural language, or configure manually.${RESET}`,
    `${GRAY}Examples:${RESET}  ${chips}`,
    `${DIM}┌${"─".repeat(inner - 2)}┐${RESET}`,
    `${DIM}│${RESET}${inputBody}${DIM}│${RESET}`,
    `${DIM}└${"─".repeat(inner - 2)}┘${RESET}`,
    "",
    stepper,
    "",
    strategyHeader,
    strategyPills,
    "",
    ...form,
    "",
    buttons,
  ];
  if (height === undefined || lines.length <= height) return lines;
  const dense: string[] = [
    `${BOLD}${WHITE}Create a new bot${RESET}`,
    `${DIM}┌${"─".repeat(inner - 2)}┐${RESET}`,
    `${DIM}│${RESET}${inputBody}${DIM}│${RESET}`,
    `${DIM}└${"─".repeat(inner - 2)}┘${RESET}`,
    stepper,
    strategyPills,
    ...form,
    buttons,
  ];
  if (dense.length <= height) return dense;
  return [...dense.slice(0, Math.max(0, height - 1)), buttons];
}
