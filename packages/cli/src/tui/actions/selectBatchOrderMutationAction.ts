/**
 * FILE: selectBatchOrderMutationAction.ts
 * PURPOSE: Collect and explicitly confirm batch place/amend/cancel writes supplied as a JSON order array.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ./confirmMutation.js
 * RULES:
 * - The orders payload must parse as a non-empty JSON array of objects; the preview shows only the count and shape, never secrets.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { confirmMutation, type MutationIntent } from "./confirmMutation.js";

/**
 * PURPOSE: Build a validated batch-order command and release it only after exact mode-aware confirmation.
 * INPUT:
 * - input: Interface — prompt channel for product, batch action, JSON payload, and confirmation
 * - state: TuiDashboardState — active profile and effective demo/live environment
 * OUTPUT:
 * - Promise<string[] | undefined> — confirmed CLI arguments or undefined when cancelled/invalid
 * USES:
 * - confirmMutation, Interface.question, JSON.parse, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects when terminal input closes while the batch payload is being collected.
 * RULES:
 * - Options support batch-cancel only; spot/swap/futures support place/amend/cancel with the CLI revalidating the full schema.
 */
export async function selectBatchOrderMutationAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Batch order operations\n");
  process.stdout.write("  1  Spot  2  Swap  3  Futures  4  Options (batch-cancel only)\n");
  const productChoice = (await input.question("  Product: ")).trim();
  const products = ["spot", "swap", "futures", "option"];
  const productIndex = Number(productChoice) - 1;
  const product = Number.isInteger(productIndex) && productIndex >= 0 && productIndex < 4
    ? products[productIndex]
    : undefined;
  if (product === undefined) return undefined;

  let action = "cancel";
  if (product !== "option") {
    process.stdout.write("  1  Place  2  Amend  3  Cancel\n");
    const actionChoice = (await input.question("  Batch action: ")).trim();
    if (actionChoice === "1") action = "place";
    else if (actionChoice === "2") action = "amend";
    else if (actionChoice === "3") action = "cancel";
    else return undefined;
  }

  process.stdout.write("  Enter a JSON array of orders, e.g. [{\"instId\":\"BTC-USDT\",\"ordId\":\"123\"}]\n");
  const payload = (await input.question("  Orders JSON: ")).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    process.stdout.write("  Invalid JSON; no command was built.\n");
    return undefined;
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((o) => typeof o !== "object" || o === null || Array.isArray(o))) {
    process.stdout.write("  Orders must be a non-empty JSON array of objects; no command was built.\n");
    return undefined;
  }
  if (parsed.length > 20) {
    process.stdout.write("  At most 20 orders per batch; no command was built.\n");
    return undefined;
  }

  const intent: MutationIntent = action === "place" ? "BATCH PLACE ORDERS" : action === "amend" ? "BATCH AMEND ORDERS" : "BATCH CANCEL ORDERS";
  const summary = `${product.toUpperCase()} batch ${action}: ${parsed.length} order(s) supplied as validated JSON`;
  const confirmation = await confirmMutation(input, state, intent, summary);
  if (confirmation === undefined) return undefined;

  const args = product === "option"
    ? ["option", "batch-cancel", "--orders", payload]
    : [product, "batch", "--action", action, "--orders", payload];
  args.push(...confirmation);
  return args;
}
