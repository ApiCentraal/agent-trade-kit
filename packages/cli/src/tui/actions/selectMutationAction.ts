/**
 * FILE: selectMutationAction.ts
 * PURPOSE: Route the advanced transaction menu to separately confirmed order, transfer, bot, and Earn workflows.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ./select*MutationAction.js
 * RULES:
 * - Every mutating child selector must call confirmMutation before returning a command that writes exchange state.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { selectAccountMutationAction } from "./selectAccountMutationAction.js";
import { selectBotMutationAction } from "./selectBotMutationAction.js";
import { selectEarnMutationAction } from "./selectEarnMutationAction.js";
import { selectEventMutationAction } from "./selectEventMutationAction.js";
import { selectOrderMutationAction } from "./selectOrderMutationAction.js";

/**
 * PURPOSE: Dispatch an explicitly selected mutation category to a guarded domain-specific workflow.
 * INPUT:
 * - input: Interface — prompt channel for category and transaction fields
 * - state: TuiDashboardState — selected profile and active trading mode
 * OUTPUT:
 * - Promise<string[] | undefined> — confirmed CLI arguments or undefined when returning/cancelling
 * USES:
 * - selectAccountMutationAction, selectBotMutationAction, selectEarnMutationAction, selectEventMutationAction, selectOrderMutationAction
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if a delegated mutation workflow rejects or terminal input closes unexpectedly.
 * RULES:
 * - Each returned transaction must have passed its domain confirmation phrase and explicit demo/live mode check.
 */
export async function selectMutationAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Trading & funds operations\n");
  process.stdout.write(`  Active mode: ${state.mode} — every operation needs a second confirmation.\n`);
  process.stdout.write("  1  Spot/swap/futures/options orders and closes\n");
  process.stdout.write("  2  Event-contract orders\n");
  process.stdout.write("  3  Transfers and account settings\n");
  process.stdout.write("  4  Grid/DCA bot operations\n");
  process.stdout.write("  5  Earn purchases, redemptions, and settings\n");
  const choice = (await input.question("  Choose 1–5, or Q to return: ")).trim().toLowerCase();

  if (choice === "1") return selectOrderMutationAction(input, state);
  if (choice === "2") return selectEventMutationAction(input, state);
  if (choice === "3") return selectAccountMutationAction(input, state);
  if (choice === "4") return selectBotMutationAction(input, state);
  if (choice === "5") return selectEarnMutationAction(input, state);
  return undefined;
}
