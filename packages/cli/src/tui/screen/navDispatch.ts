/**
 * FILE: navDispatch.ts
 * PURPOSE: Route single-key sidebar selections to the existing domain selector flows.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ../actions/select*Action.js
 * RULES:
 * - Keys match sidebarModel.ts exactly; unknown keys return undefined without side effects.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { selectAccountAction } from "../actions/selectAccountAction.js";
import { selectAuthAction } from "../actions/selectAuthAction.js";
import { selectBotAction } from "../actions/selectBotAction.js";
import { selectBotMutationAction } from "../actions/selectBotMutationAction.js";
import { selectClientAction } from "../actions/selectClientAction.js";
import { selectEarnAction } from "../actions/selectEarnAction.js";
import { selectEarnMutationAction } from "../actions/selectEarnMutationAction.js";
import { selectMutationAction } from "../actions/selectMutationAction.js";
import { selectEventMarketAction } from "../actions/selectEventMarketAction.js";
import { selectMarketAction } from "../actions/selectMarketAction.js";
import { selectNewsAction } from "../actions/selectNewsAction.js";
import { selectPositionsAction } from "../actions/selectPositionsAction.js";
import { selectProfileAction } from "../actions/selectProfileAction.js";
import { selectSkillAction } from "../actions/selectSkillAction.js";
import { selectSmartMoneyAction } from "../actions/selectSmartMoneyAction.js";
import { selectSystemAction } from "../actions/selectSystemAction.js";
import { selectMarketAnalyticsAction } from "../actions/selectMarketAnalyticsAction.js";

/**
 * PURPOSE: Execute the selector bound to a sidebar key and return its command args.
 * INPUT:
 * - key: string — normalized single sidebar key (lowercase)
 * - input: Interface — prompt channel handed to the selector
 * - state: TuiDashboardState — profile/mode context
 * OUTPUT:
 * - Promise<string[] | undefined> — CLI args for launcher execution, undefined on cancel/unknown key
 * USES:
 * - all domain select*Action functions
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects when a delegated selector's prompt closes unexpectedly.
 * RULES:
 * - The "w" (wizard), "l" (logs), "r" (refresh), and "q" keys are handled by the launcher, not here.
 */
export async function dispatchNavKey(
  key: string,
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  switch (key) {
    case "1": return selectBotAction(input, state);
    case "2": return selectBotMutationAction(input, state);
    case "4": return selectMarketAction(input, state);
    case "5": return selectMarketAnalyticsAction(input, state);
    case "6": return selectEventMarketAction(input, state);
    case "7": return selectAccountAction(input, state);
    case "8": return selectPositionsAction(input, state);
    case "9": return selectMutationAction(input, state);
    case "0": return selectEarnMutationAction(input, state);
    case "a": return selectNewsAction(input, state);
    case "b": return selectSmartMoneyAction(input, state);
    case "k": return selectEarnAction(input, state);
    case "c": return selectProfileAction(input, state);
    case "e": return selectClientAction(input, state);
    case "f": return selectAuthAction(input);
    case "g": return selectSystemAction(input);
    case "h": return selectSkillAction(input, state);
    default: return undefined;
  }
}
