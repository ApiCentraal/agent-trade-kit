/**
 * FILE: confirmMutation.ts
 * PURPOSE: Gate every TUI financial/configuration mutation behind a profile/mode preview and typed confirmation.
 * LAYER: middleware
 * DEPENDS_ON: node:readline/promises, ../types.js
 * RULES:
 * - Refuse mutation when demo/live mode is unknown and require a mode-specific exact phrase before returning execution flags.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";

export type MutationIntent =
  | "PLACE ORDER"
  | "AMEND ORDER"
  | "CANCEL ORDER"
  | "CLOSE POSITION"
  | "PLACE EVENT ORDER"
  | "AMEND EVENT ORDER"
  | "CANCEL EVENT ORDER"
  | "TRANSFER FUNDS"
  | "CHANGE POSITION MODE"
  | "CHANGE LEVERAGE"
  | "CREATE BOT"
  | "AMEND BOT"
  | "STOP BOT"
  | "CLOSE BOT POSITION"
  | "BUY EARN"
  | "REDEEM EARN"
  | "CHANGE EARN RATE"
  | "CHANGE AUTO-EARN"
  | "CANCEL EARN ORDER"
  | "PLACE ALGO ORDER"
  | "PLACE TRAILING ORDER"
  | "AMEND ALGO ORDER"
  | "CANCEL ALGO ORDER"
  | "BATCH PLACE ORDERS"
  | "BATCH AMEND ORDERS"
  | "BATCH CANCEL ORDERS";

/**
 * PURPOSE: Show a transaction summary and require an exact demo/live confirmation before enabling CLI execution.
 * INPUT:
 * - input: Interface — prompt channel for the confirmation phrase
 * - state: TuiDashboardState — active profile and effective demo/live mode
 * - intent: MutationIntent — fixed operation name included in the confirmation phrase
 * - summary: string — validated non-secret description of the exact mutation
 * OUTPUT:
 * - Promise<string[] | undefined> — explicit mode/profile CLI flags, or undefined when blocked/cancelled
 * USES:
 * - Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while the mutation confirmation is being requested.
 * RULES:
 * - `NOT CONFIGURED` is fail-closed; live execution requires typing `CONFIRM LIVE <INTENT>` exactly.
 */
export async function confirmMutation(
  input: Interface,
  state: TuiDashboardState,
  intent: MutationIntent,
  summary: string,
): Promise<string[] | undefined> {
  if (state.mode !== "DEMO" && state.mode !== "LIVE") {
    process.stdout.write("  Mutation blocked: configure an explicit demo or live profile first.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }

  const safeProfile = state.activeProfile.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
  process.stdout.write("\n  Review before execution\n");
  process.stdout.write(`  Mode: ${state.mode}\n`);
  process.stdout.write(`  Profile: ${safeProfile}\n`);
  process.stdout.write(`  Action: ${summary}\n`);
  const expected = `CONFIRM ${state.mode} ${intent}`;
  const typed = await input.question(`  Type ${expected} exactly: `);
  if (typed !== expected) {
    process.stdout.write("  Mutation cancelled; no CLI command was run.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }

  return [state.mode === "DEMO" ? "--demo" : "--live", "--profile", state.activeProfile];
}
