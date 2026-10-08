/**
 * FILE: selectYieldInsightsAction.ts
 * PURPOSE: Route users to focused Earn, news/calendar, or smart-money analytics submenus.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ./selectEarnAction.js, ./selectNewsAction.js, ./selectSmartMoneyAction.js
 * RULES:
 * - Only observational routes are delegated; Earn purchases, redemptions, and trading actions remain excluded.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { selectEarnAction } from "./selectEarnAction.js";
import { selectNewsAction } from "./selectNewsAction.js";
import { selectSmartMoneyAction } from "./selectSmartMoneyAction.js";

/**
 * PURPOSE: Dispatch an insight-category choice to its corresponding read-only submenu.
 * INPUT:
 * - input: Interface — prompt channel for category and detail selections
 * - state: TuiDashboardState — active profile for account-backed analytics
 * OUTPUT:
 * - Promise<string[] | undefined> — CLI arguments or undefined when returning/choosing an invalid category
 * USES:
 * - selectEarnAction, selectNewsAction, selectSmartMoneyAction, Interface.question
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes or a delegated submenu rejects.
 * RULES:
 * - Delegation is limited to read-only Earn, news, and smart-money command families.
 */
export async function selectYieldInsightsAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Yield & insights\n");
  process.stdout.write("  1  Earn monitor\n");
  process.stdout.write("  2  News & calendar\n");
  process.stdout.write("  3  Smart-money analytics\n");
  const choice = (await input.question("  Choose 1–3, or Q to return: ")).trim().toLowerCase();
  if (choice === "1") return selectEarnAction(input, state);
  if (choice === "2") return selectNewsAction(input, state);
  if (choice === "3") return selectSmartMoneyAction(input, state);
  return undefined;
}
