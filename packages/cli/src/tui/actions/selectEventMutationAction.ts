/**
 * FILE: selectEventMutationAction.ts
 * PURPOSE: Place, amend, or cancel event-contract orders through explicit transaction previews.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ./confirmMutation.js
 * RULES:
 * - Event order writes require a profile/mode-specific confirmation after instrument, outcome, size, and price are displayed.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { confirmMutation } from "./confirmMutation.js";

/**
 * PURPOSE: Build a validated event-contract order command and return it only after exact confirmation.
 * INPUT:
 * - input: Interface — prompt channel for event order fields and confirmation
 * - state: TuiDashboardState — active profile and demo/live mode
 * OUTPUT:
 * - Promise<string[] | undefined> — confirmed CLI arguments or undefined when cancelled/invalid
 * USES:
 * - confirmMutation, Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while event order parameters are requested.
 * RULES:
 * - Outcomes are safe identifier strings; every event place/amend/cancel command requires a typed confirmation.
 */
export async function selectEventMutationAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Event-contract order operations\n");
  process.stdout.write("  1  Place order\n");
  process.stdout.write("  2  Amend order\n");
  process.stdout.write("  3  Cancel order\n");
  const choice = (await input.question("  Choose 1–3, or Q to return: ")).trim().toLowerCase();
  if (choice !== "1" && choice !== "2" && choice !== "3") return undefined;

  const instId = (await input.question("  Event contract instrument id: ")).trim();
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(instId)) return undefined;

  if (choice === "1") {
    const side = (await input.question("  Side (buy or sell): ")).trim().toLowerCase();
    const outcome = (await input.question("  Outcome id (for example yes/no): ")).trim().toLowerCase();
    const sz = (await input.question("  Size (positive decimal): ")).trim();
    const ordType = (await input.question("  Order type (market or limit): ")).trim().toLowerCase();
    if ((side !== "buy" && side !== "sell") || !/^[a-z0-9_-]{1,32}$/.test(outcome) || !/^\d+(?:\.\d+)?$/.test(sz) || Number(sz) <= 0 || (ordType !== "market" && ordType !== "limit")) return undefined;
    let px = "";
    if (ordType === "limit") {
      px = (await input.question("  Limit price (positive decimal): ")).trim();
      if (!/^\d+(?:\.\d+)?$/.test(px) || Number(px) <= 0) return undefined;
    }
    const summary = `${side} ${ordType} ${sz} ${instId} outcome=${outcome}${px ? ` at ${px}` : " at market"}`;
    const confirmation = await confirmMutation(input, state, "PLACE EVENT ORDER", summary);
    if (confirmation === undefined) return undefined;
    const args = ["event", "place", instId, side, outcome, sz, "--ordType", ordType];
    if (px) args.push("--px", px);
    args.push(...confirmation);
    return args;
  }

  const ordId = (await input.question("  Event order id: ")).trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(ordId)) return undefined;
  if (choice === "3") {
    const confirmation = await confirmMutation(input, state, "CANCEL EVENT ORDER", `Cancel event order ${ordId} on ${instId}`);
    return confirmation === undefined ? undefined : ["event", "cancel", instId, ordId, ...confirmation];
  }

  const px = (await input.question("  New price (blank to keep): ")).trim();
  const sz = (await input.question("  New size (blank to keep): ")).trim();
  if (!px && !sz) return undefined;
  if ((px && (!/^\d+(?:\.\d+)?$/.test(px) || Number(px) <= 0)) || (sz && (!/^\d+(?:\.\d+)?$/.test(sz) || Number(sz) <= 0))) return undefined;
  const summary = `Amend event order ${ordId} on ${instId}${px ? `; price=${px}` : ""}${sz ? `; size=${sz}` : ""}`;
  const confirmation = await confirmMutation(input, state, "AMEND EVENT ORDER", summary);
  if (confirmation === undefined) return undefined;
  const args = ["event", "amend", instId, ordId];
  if (px) args.push("--px", px);
  if (sz) args.push("--sz", sz);
  args.push(...confirmation);
  return args;
}
