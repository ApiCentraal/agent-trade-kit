/**
 * FILE: runBotWizard.ts
 * PURPOSE: Guide the user through the six-step bot-creation flow with a live form preview and exact confirmation.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ../askInstrumentId.js, ./nlBotParser.js, ./botPresets.js, ./buildWizardArgs.js, ../actions/confirmMutation.js
 * RULES:
 * - The wizard never executes anything itself; it returns confirmed CLI args for the launcher to run.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState, TuiWizardDraft } from "../types.js";
import { askInstrumentId, COMMON_SPOT_IDS, COMMON_SWAP_IDS } from "../askInstrumentId.js";
import { confirmMutation } from "../actions/confirmMutation.js";
import { parseBotIntent } from "./nlBotParser.js";
import { applyRiskPreset } from "./botPresets.js";
import { buildWizardArgs } from "./buildWizardArgs.js";

/** Repaint callback supplied by the launcher: draft + active step + the prompt hint for the input box. */
export type WizardDraw = (draft: TuiWizardDraft, step: number, hint: string, intentText?: string) => void;

const DECIMAL = /^\d+(?:\.\d+)?$/;

/**
 * PURPOSE: Run the wizard stepper (Intent → Strategy → Market → Risk → Preview → Deploy) and return confirmed args.
 * INPUT:
 * - input: Interface — prompt channel for answers
 * - state: TuiDashboardState — profile/mode context for the confirmation gate
 * - draw: WizardDraw — repaints the dashboard panes with the live draft between steps
 * - initialIntent: string | undefined — natural-language intent typed on the home prompt; skips the Intent question
 * OUTPUT:
 * - Promise<string[] | undefined> — confirmed CLI args, or undefined when cancelled/invalid
 * USES:
 * - parseBotIntent, applyRiskPreset, buildWizardArgs, askInstrumentId, confirmMutation, Interface.question
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes mid-wizard.
 * RULES:
 * - Empty answers keep the current draft value; only validated values overwrite the draft.
 */
export async function runBotWizard(
  input: Interface,
  state: TuiDashboardState,
  draw: WizardDraw,
  initialIntent?: string,
): Promise<string[] | undefined> {
  let draft: TuiWizardDraft = {};
  let intentText: string | undefined;

  if (initialIntent !== undefined) {
    intentText = initialIntent;
    draft = { ...draft, ...parseBotIntent(initialIntent) };
  } else {
    draw(draft, 0, "Describe your bot, e.g. \"grid bot BTC 100 USDT low risk\" — blank for manual setup");
    const intent = (await input.question("  › ")).trim();
    if (intent.toLowerCase() === "q") return undefined;
    if (intent) {
      intentText = intent;
      draft = { ...draft, ...parseBotIntent(intent) };
    }
  }

  draw(draft, 1, "Strategy: 1 = grid trading, 2 = DCA bot", intentText);
  const botPick = (await input.question(`  Choose 1–2${draft.botType ? ` (Enter = ${draft.botType})` : ""}: `)).trim().toLowerCase();
  if (botPick === "q") return undefined;
  if (botPick === "1") draft.botType = "grid";
  else if (botPick === "2") draft.botType = "dca";
  else if (botPick && !draft.botType) return undefined;
  draft.botType ??= "grid";

  draw(draft, 2, "Market: 1 = spot, 2 = contract (perpetual swap)", intentText);
  const marketPick = (await input.question(`  Choose 1–2${draft.market ? ` (Enter = ${draft.market})` : ""}: `)).trim();
  if (marketPick === "q") return undefined;
  if (marketPick === "1") draft.market = "spot";
  else if (marketPick === "2") draft.market = "contract";
  else if (marketPick && !draft.market) return undefined;
  draft.market ??= "spot";

  draw(draft, 2, "Trading pair — pick a number below or type an instrument id", intentText);
  const instId = draft.instId
    ? ((await input.question(`  Instrument (Enter = ${draft.instId}, or type a new id): `)).trim() || draft.instId)
    : await askInstrumentId(input, { suggestions: draft.market === "contract" ? COMMON_SWAP_IDS : COMMON_SPOT_IDS });
  if (instId === undefined || !/^[A-Za-z0-9-]{3,40}$/.test(instId)) return undefined;
  draft.instId = instId;

  draw(draft, 2, `Capital amount in ${draft.ccy ?? "USDT"} committed by the bot`, intentText);
  const amount = (await input.question(`  Capital amount${draft.amount ? ` (Enter = ${draft.amount})` : ""}: `)).trim();
  const finalAmount = amount || draft.amount || "";
  if (!DECIMAL.test(finalAmount) || Number(finalAmount) <= 0) return undefined;
  draft.amount = finalAmount;
  draft.ccy ??= "USDT";

  draw(draft, 3, "Risk level: 1 = low, 2 = medium, 3 = high", intentText);
  const riskPick = (await input.question(`  Choose 1–3${draft.risk ? ` (Enter = ${draft.risk})` : ""}: `)).trim();
  const risk = riskPick === "1" ? "low" : riskPick === "2" ? "medium" : riskPick === "3" ? "high" : draft.risk;
  if (!risk) return undefined;
  draft = applyRiskPreset(draft, risk);

  if (draft.botType === "grid") {
    draw(draft, 3, "Grid parameters — Enter accepts the shown default", intentText);
    const minPx = (await input.question(`  Min price${draft.minPx ? ` (Enter = ${draft.minPx})` : ""}: `)).trim() || draft.minPx || "";
    const maxPx = (await input.question(`  Max price${draft.maxPx ? ` (Enter = ${draft.maxPx})` : ""}: `)).trim() || draft.maxPx || "";
    const gridNum = (await input.question(`  Grid levels 2–100 (Enter = ${draft.gridNum ?? "20"}): `)).trim() || draft.gridNum || "20";
    if (!DECIMAL.test(minPx) || !DECIMAL.test(maxPx) || Number(maxPx) <= Number(minPx)) return undefined;
    draft = { ...draft, minPx, maxPx, gridNum };
    if (draft.market === "contract") {
      const lever = (await input.question(`  Leverage (Enter = ${draft.lever ?? "2"}): `)).trim() || draft.lever || "2";
      const direction = (await input.question(`  Direction long/short/neutral (Enter = ${draft.direction ?? "neutral"}): `)).trim().toLowerCase() || draft.direction || "neutral";
      if (!DECIMAL.test(lever) || Number(lever) <= 0 || !["long", "short", "neutral"].includes(direction)) return undefined;
      draft = { ...draft, lever, direction: direction as "long" | "short" | "neutral" };
    }
  } else {
    draw(draft, 3, "DCA parameters — Enter accepts the shown default", intentText);
    const safety = (await input.question(`  Safety orders 0–100 (Enter = ${draft.maxSafetyOrds ?? "4"}): `)).trim() || draft.maxSafetyOrds || "4";
    const tpPct = (await input.question(`  Take-profit ratio e.g. 0.03 = 3% (Enter = ${draft.tpPct ?? "0.03"}): `)).trim() || draft.tpPct || "0.03";
    const slPct = (await input.question(`  Stop-loss ratio, blank = none${draft.slPct ? ` (Enter = ${draft.slPct})` : ""}: `)).trim() || draft.slPct || "";
    if (!/^\d{1,3}$/.test(safety) || Number(safety) > 100 || !DECIMAL.test(tpPct) || Number(tpPct) <= 0) return undefined;
    if (slPct && !DECIMAL.test(slPct)) return undefined;
    draft = { ...draft, maxSafetyOrds: safety, tpPct, ...(slPct ? { slPct } : {}) };
    if (draft.market === "contract") {
      const lever = (await input.question(`  Leverage (Enter = ${draft.lever ?? "2"}): `)).trim() || draft.lever || "2";
      const direction = (await input.question(`  Direction long/short (Enter = ${draft.direction ?? "long"}): `)).trim().toLowerCase() || draft.direction || "long";
      if (!DECIMAL.test(lever) || Number(lever) <= 0 || !["long", "short"].includes(direction)) return undefined;
      draft = { ...draft, lever, direction: direction as "long" | "short" };
    }
  }

  const build = buildWizardArgs(draft);
  if (!build.ok) {
    process.stdout.write(`\n  Cannot deploy: ${build.reason}.\n`);
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }

  draw(draft, 4, `Preview: ${build.summary}`, intentText);
  draw(draft, 5, "Confirm deployment — check the inspector, then confirm below", intentText);
  const confirmation = await confirmMutation(input, state, "CREATE BOT", build.summary);
  return confirmation === undefined ? undefined : [...build.args, ...confirmation];
}
