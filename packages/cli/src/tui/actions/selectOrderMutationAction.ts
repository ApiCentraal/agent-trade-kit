/**
 * FILE: selectOrderMutationAction.ts
 * PURPOSE: Collect and explicitly confirm order writes: basic orders, closes, algo orders, and batch operations.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ../askInstrumentId.js, ./confirmMutation.js, ./selectAlgoOrderMutationAction.js, ./selectBatchOrderMutationAction.js
 * RULES:
 * - Basic market/limit orders, advanced algo orders, and JSON batch writes all preview profile/mode/parameters and require exact confirmation.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { askInstrumentId, COMMON_SPOT_IDS, COMMON_SWAP_IDS } from "../askInstrumentId.js";
import { confirmMutation } from "./confirmMutation.js";
import { selectAlgoOrderMutationAction } from "./selectAlgoOrderMutationAction.js";
import { selectBatchOrderMutationAction } from "./selectBatchOrderMutationAction.js";

/**
 * PURPOSE: Build a validated order or close command and return it only after the user confirms its exact preview.
 * INPUT:
 * - input: Interface — prompt channel for product, order parameters, and confirmation
 * - state: TuiDashboardState — active profile and effective demo/live environment
 * OUTPUT:
 * - Promise<string[] | undefined> — confirmed CLI arguments or undefined when cancelled/invalid
 * USES:
 * - confirmMutation, selectAlgoOrderMutationAction, selectBatchOrderMutationAction, askInstrumentId, Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects when terminal input closes while order parameters are being collected.
 * RULES:
 * - Quantity/price must be positive decimals; no order runs until the exact mode-specific confirmation succeeds.
 */
export async function selectOrderMutationAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Order operations\n");
  process.stdout.write("  1  Place market/limit order\n");
  process.stdout.write("  2  Amend order size/price\n");
  process.stdout.write("  3  Cancel order\n");
  process.stdout.write("  4  Close swap/futures position\n");
  process.stdout.write("  5  Algo orders (conditional/OCO/trailing/TWAP)\n");
  process.stdout.write("  6  Batch orders (JSON payload)\n");
  const choice = (await input.question("  Choose 1–6, or Q to return: ")).trim().toLowerCase();
  if (choice === "5") return selectAlgoOrderMutationAction(input, state);
  if (choice === "6") return selectBatchOrderMutationAction(input, state);
  if (!/^[1-4]$/.test(choice)) return undefined;

  if (choice === "1") {
    process.stdout.write("  1  Spot  2  Swap  3  Futures  4  Options\n");
    const productChoice = (await input.question("  Product: ")).trim();
    const products = ["spot", "swap", "futures", "option"];
    const productIndex = Number(productChoice) - 1;
    const product = Number.isInteger(productIndex) ? products[productIndex] : undefined;
    if (product === undefined) return undefined;

    const instId = await askInstrumentId(input, { suggestions: product === "spot" ? COMMON_SPOT_IDS : product === "option" ? [] : COMMON_SWAP_IDS });
    if (instId === undefined) return undefined;
    const side = (await input.question("  Side (buy or sell): ")).trim().toLowerCase();
    if (side !== "buy" && side !== "sell") return undefined;
    const ordType = (await input.question("  Order type (market or limit): ")).trim().toLowerCase();
    if (ordType !== "market" && ordType !== "limit") return undefined;
    const size = (await input.question("  Size (positive decimal): ")).trim();
    if (!/^\d+(?:\.\d+)?$/.test(size) || Number(size) <= 0) return undefined;

    let px = "";
    if (ordType === "limit") {
      px = (await input.question("  Limit price (positive decimal): ")).trim();
      if (!/^\d+(?:\.\d+)?$/.test(px) || Number(px) <= 0) return undefined;
    }

    let tdMode = "cash";
    if (product !== "spot") {
      const modes = product === "option" ? ["cash", "cross", "isolated"] : ["cross", "isolated"];
      tdMode = (await input.question(`  Margin mode (${modes.join(", ")}): `)).trim().toLowerCase();
      if (!modes.includes(tdMode)) return undefined;
    }

    let posSide = "";
    if (product === "swap" || product === "futures") {
      posSide = (await input.question("  Position side (net, long, short; default net): ")).trim().toLowerCase() || "net";
      if (!["net", "long", "short"].includes(posSide)) return undefined;
    }

    let reduceOnly = false;
    if (product !== "spot") {
      const reduceChoice = (await input.question("  Reduce-only? (y/N): ")).trim().toLowerCase();
      if (reduceChoice !== "" && reduceChoice !== "y" && reduceChoice !== "n") return undefined;
      reduceOnly = reduceChoice === "y";
    }

    const attachTp = (await input.question("  Attach take-profit? (y/N): ")).trim().toLowerCase();
    if (attachTp !== "" && attachTp !== "y" && attachTp !== "n") return undefined;
    let tpTriggerPx = "";
    let tpOrdPx = "";
    if (attachTp === "y") {
      tpTriggerPx = (await input.question("  TP trigger price (positive decimal): ")).trim();
      tpOrdPx = (await input.question("  TP order price (-1 for market): ")).trim();
      if (!/^\d+(?:\.\d+)?$/.test(tpTriggerPx) || Number(tpTriggerPx) <= 0 || (tpOrdPx !== "-1" && (!/^\d+(?:\.\d+)?$/.test(tpOrdPx) || Number(tpOrdPx) <= 0))) return undefined;
    }
    const attachSl = (await input.question("  Attach stop-loss? (y/N): ")).trim().toLowerCase();
    if (attachSl !== "" && attachSl !== "y" && attachSl !== "n") return undefined;
    let slTriggerPx = "";
    let slOrdPx = "";
    if (attachSl === "y") {
      slTriggerPx = (await input.question("  SL trigger price (positive decimal): ")).trim();
      slOrdPx = (await input.question("  SL order price (-1 for market): ")).trim();
      if (!/^\d+(?:\.\d+)?$/.test(slTriggerPx) || Number(slTriggerPx) <= 0 || (slOrdPx !== "-1" && (!/^\d+(?:\.\d+)?$/.test(slOrdPx) || Number(slOrdPx) <= 0))) return undefined;
    }

    const tpslSummary = `${tpTriggerPx ? `; tp=${tpTriggerPx}/${tpOrdPx}` : ""}${slTriggerPx ? `; sl=${slTriggerPx}/${slOrdPx}` : ""}`;
    const summary = `${product.toUpperCase()} ${side} ${ordType} ${size} ${instId}${px ? ` at ${px}` : " at market"}; mode=${tdMode}${posSide ? `; position=${posSide}` : ""}${reduceOnly ? "; reduce-only" : ""}${tpslSummary}`;
    const confirmation = await confirmMutation(input, state, "PLACE ORDER", summary);
    if (confirmation === undefined) return undefined;
    const args = [product, "place", "--instId", instId, "--tdMode", tdMode, "--side", side, "--ordType", ordType, "--sz", size];
    if (px) args.push("--px", px);
    if (posSide) args.push("--posSide", posSide);
    if (reduceOnly) args.push("--reduceOnly");
    if (tpTriggerPx) args.push("--tpTriggerPx", tpTriggerPx, "--tpOrdPx", tpOrdPx);
    if (slTriggerPx) args.push("--slTriggerPx", slTriggerPx, "--slOrdPx", slOrdPx);
    args.push(...confirmation);
    return args;
  }

  if (choice === "2" || choice === "3") {
    process.stdout.write("  1  Spot  2  Swap  3  Futures  4  Options\n");
    const productChoice = (await input.question("  Product: ")).trim();
    const products = ["spot", "swap", "futures", "option"];
    const productIndex = Number(productChoice) - 1;
    const product = Number.isInteger(productIndex) ? products[productIndex] : undefined;
    if (product === undefined) return undefined;
    const instId = await askInstrumentId(input, { suggestions: product === "spot" ? COMMON_SPOT_IDS : product === "option" ? [] : COMMON_SWAP_IDS });
    const ordId = (await input.question("  Exchange order id: ")).trim();
    if (instId === undefined || !/^[A-Za-z0-9_-]{1,64}$/.test(ordId)) return undefined;

    if (choice === "3") {
      const summary = `Cancel ${product.toUpperCase()} order ${ordId} on ${instId}`;
      const confirmation = await confirmMutation(input, state, "CANCEL ORDER", summary);
      if (confirmation === undefined) return undefined;
      const args = product === "option"
        ? [product, "cancel", "--instId", instId, "--ordId", ordId]
        : [product, "cancel", instId, "--ordId", ordId];
      args.push(...confirmation);
      return args;
    }

    const newSz = (await input.question("  New size (blank to keep): ")).trim();
    const newPx = (await input.question("  New price (blank to keep): ")).trim();
    if (!newSz && !newPx) return undefined;
    if ((newSz && (!/^\d+(?:\.\d+)?$/.test(newSz) || Number(newSz) <= 0)) || (newPx && (!/^\d+(?:\.\d+)?$/.test(newPx) || Number(newPx) <= 0))) return undefined;
    const summary = `Amend ${product.toUpperCase()} order ${ordId} on ${instId}${newSz ? `; size=${newSz}` : ""}${newPx ? `; price=${newPx}` : ""}`;
    const confirmation = await confirmMutation(input, state, "AMEND ORDER", summary);
    if (confirmation === undefined) return undefined;
    const args = [product, "amend", "--instId", instId, "--ordId", ordId];
    if (newSz) args.push("--newSz", newSz);
    if (newPx) args.push("--newPx", newPx);
    args.push(...confirmation);
    return args;
  }

  process.stdout.write("  1  Swap  2  Futures\n");
  const productChoice = (await input.question("  Product: ")).trim();
  const product = productChoice === "1" ? "swap" : productChoice === "2" ? "futures" : undefined;
  if (product === undefined) return undefined;
  const instId = await askInstrumentId(input, { suggestions: COMMON_SWAP_IDS });
  if (instId === undefined) return undefined;
  const mgnMode = (await input.question("  Margin mode (cross or isolated): ")).trim().toLowerCase();
  if (mgnMode !== "cross" && mgnMode !== "isolated") return undefined;
  const posSide = (await input.question("  Position side (net, long, short; optional): ")).trim().toLowerCase();
  if (posSide && !["net", "long", "short"].includes(posSide)) return undefined;
  const autoCxlChoice = (await input.question("  Cancel related algo orders on close? (y/N): ")).trim().toLowerCase();
  if (autoCxlChoice !== "" && autoCxlChoice !== "y" && autoCxlChoice !== "n") return undefined;
  const autoCxl = autoCxlChoice === "y";
  const summary = `Close ${product.toUpperCase()} position on ${instId}; margin=${mgnMode}${posSide ? `; side=${posSide}` : ""}${autoCxl ? "; cancel algo orders" : ""}`;
  const confirmation = await confirmMutation(input, state, "CLOSE POSITION", summary);
  if (confirmation === undefined) return undefined;
  const args = [product, "close", "--instId", instId, "--mgnMode", mgnMode];
  if (posSide) args.push("--posSide", posSide);
  if (autoCxl) args.push("--autoCxl");
  args.push(...confirmation);
  return args;
}
