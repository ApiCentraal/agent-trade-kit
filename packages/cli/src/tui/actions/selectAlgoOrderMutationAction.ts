/**
 * FILE: selectAlgoOrderMutationAction.ts
 * PURPOSE: Collect and explicitly confirm advanced algo-order writes: conditional/OCO/trigger/move-stop/iceberg/TWAP, trailing stops, amendments, and cancellations.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ../askInstrumentId.js, ./confirmMutation.js
 * RULES:
 * - Only documented algo order types are offered; every write previews profile/mode/parameters and requires exact confirmation.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { askInstrumentId, COMMON_SPOT_IDS, COMMON_SWAP_IDS } from "../askInstrumentId.js";
import { confirmMutation } from "./confirmMutation.js";

const DECIMAL = /^\d+(?:\.\d+)?$/;
const ALGO_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * PURPOSE: Build a validated algo/trailing order command and release it only after exact mode-aware confirmation.
 * INPUT:
 * - input: Interface — prompt channel for product, algo parameters, and confirmation
 * - state: TuiDashboardState — active profile and effective demo/live environment
 * OUTPUT:
 * - Promise<string[] | undefined> — confirmed CLI arguments or undefined when cancelled/invalid
 * USES:
 * - confirmMutation, askInstrumentId, Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects when terminal input closes while algo-order parameters are being collected.
 * RULES:
 * - Numeric fields must be positive decimals; per-type required fields are enforced before the confirmation preview.
 */
export async function selectAlgoOrderMutationAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Algo order operations\n");
  process.stdout.write("  1  Place algo order (conditional/OCO/trigger/move-stop/iceberg/TWAP)\n");
  process.stdout.write("  2  Place trailing order\n");
  process.stdout.write("  3  Amend algo order\n");
  process.stdout.write("  4  Cancel algo order\n");
  const choice = (await input.question("  Choose 1–4, or Q to return: ")).trim().toLowerCase();
  if (!/^[1-4]$/.test(choice)) return undefined;

  const allowTrail = choice !== "2";
  process.stdout.write(allowTrail
    ? "  1  Spot  2  Swap  3  Futures  4  Options\n"
    : "  1  Spot  2  Swap  3  Futures\n");
  const productChoice = (await input.question("  Product: ")).trim();
  const products = ["spot", "swap", "futures", "option"];
  const productIndex = Number(productChoice) - 1;
  const product = Number.isInteger(productIndex) && productIndex >= 0 && productIndex < (allowTrail ? 4 : 3)
    ? products[productIndex]
    : undefined;
  if (product === undefined) return undefined;

  const instId = await askInstrumentId(input, { suggestions: product === "spot" ? COMMON_SPOT_IDS : product === "option" ? [] : COMMON_SWAP_IDS });
  if (instId === undefined) return undefined;

  if (choice === "1") {
    process.stdout.write("  Algo types: conditional, oco, trigger, move_order_stop, iceberg, twap\n");
    const ordType = (await input.question("  Algo order type: ")).trim().toLowerCase();
    if (!["conditional", "oco", "trigger", "move_order_stop", "iceberg", "twap"].includes(ordType)) return undefined;
    const side = (await input.question("  Side (buy or sell): ")).trim().toLowerCase();
    if (side !== "buy" && side !== "sell") return undefined;
    const sz = (await input.question("  Size (positive decimal): ")).trim();
    if (!DECIMAL.test(sz) || Number(sz) <= 0) return undefined;

    let tdMode = "cash";
    if (product !== "spot") {
      const modes = product === "option" ? ["cash", "cross", "isolated"] : ["cross", "isolated"];
      tdMode = (await input.question(`  Margin mode (${modes.join(", ")}): `)).trim().toLowerCase();
      if (!modes.includes(tdMode)) return undefined;
    }

    const args = [product, "algo", "place", "--instId", instId, "--tdMode", tdMode, "--side", side, "--ordType", ordType, "--sz", sz];
    const summaryParts = [`${ordType}`];

    if (ordType === "conditional" || ordType === "trigger") {
      const triggerPx = (await input.question("  Trigger price (positive decimal): ")).trim();
      const orderPx = (await input.question("  Order price (positive decimal, -1 for market): ")).trim();
      if (!DECIMAL.test(triggerPx) || Number(triggerPx) <= 0 || (orderPx !== "-1" && (!DECIMAL.test(orderPx) || Number(orderPx) <= 0))) return undefined;
      args.push("--triggerPx", triggerPx, "--orderPx", orderPx);
      summaryParts.push(`trigger=${triggerPx}`, `orderPx=${orderPx}`);
    } else if (ordType === "oco") {
      const tpTriggerPx = (await input.question("  TP trigger price: ")).trim();
      const tpOrdPx = (await input.question("  TP order price (-1 for market): ")).trim();
      const slTriggerPx = (await input.question("  SL trigger price: ")).trim();
      const slOrdPx = (await input.question("  SL order price (-1 for market): ")).trim();
      const pxOk = (v: string) => v === "-1" || (DECIMAL.test(v) && Number(v) > 0);
      if (!DECIMAL.test(tpTriggerPx) || Number(tpTriggerPx) <= 0 || !DECIMAL.test(slTriggerPx) || Number(slTriggerPx) <= 0 || !pxOk(tpOrdPx) || !pxOk(slOrdPx)) return undefined;
      args.push("--tpTriggerPx", tpTriggerPx, "--tpOrdPx", tpOrdPx, "--slTriggerPx", slTriggerPx, "--slOrdPx", slOrdPx);
      summaryParts.push(`tp=${tpTriggerPx}/${tpOrdPx}`, `sl=${slTriggerPx}/${slOrdPx}`);
    } else if (ordType === "move_order_stop") {
      const callbackRatio = (await input.question("  Callback ratio % (blank to use spread): ")).trim();
      const callbackSpread = callbackRatio ? "" : (await input.question("  Callback spread (positive decimal): ")).trim();
      if (callbackRatio && (!DECIMAL.test(callbackRatio) || Number(callbackRatio) <= 0)) return undefined;
      if (!callbackRatio && (!DECIMAL.test(callbackSpread) || Number(callbackSpread) <= 0)) return undefined;
      if (callbackRatio) args.push("--callbackRatio", callbackRatio);
      else args.push("--callbackSpread", callbackSpread);
      const activePx = (await input.question("  Activation price (blank for none): ")).trim();
      if (activePx) {
        if (!DECIMAL.test(activePx) || Number(activePx) <= 0) return undefined;
        args.push("--activePx", activePx);
      }
      summaryParts.push(callbackRatio ? `callback=${callbackRatio}%` : `spread=${callbackSpread}`);
    } else if (ordType === "iceberg") {
      process.stdout.write("  Variance basis: 1  --pxVar (price variance)  2  --pxSpread (spread)\n");
      const basis = (await input.question("  Basis (1 or 2): ")).trim();
      const basisValue = (await input.question(`  ${basis === "1" ? "Price variance" : "Spread"} (positive decimal): `)).trim();
      const szLimit = (await input.question("  Size limit per order (positive decimal): ")).trim();
      const pxLimit = (await input.question("  Price limit (positive decimal): ")).trim();
      if ((basis !== "1" && basis !== "2") || !DECIMAL.test(basisValue) || Number(basisValue) <= 0 || !DECIMAL.test(szLimit) || Number(szLimit) <= 0 || !DECIMAL.test(pxLimit) || Number(pxLimit) <= 0) return undefined;
      args.push(basis === "1" ? "--pxVar" : "--pxSpread", basisValue, "--szLimit", szLimit, "--pxLimit", pxLimit);
      summaryParts.push(`${basis === "1" ? "pxVar" : "pxSpread"}=${basisValue}`, `szLimit=${szLimit}`, `pxLimit=${pxLimit}`);
    } else {
      const szLimit = (await input.question("  Size limit per slice (positive decimal): ")).trim();
      const pxLimit = (await input.question("  Price limit (positive decimal): ")).trim();
      const timeInterval = (await input.question("  Time interval seconds (positive integer): ")).trim();
      if (!DECIMAL.test(szLimit) || Number(szLimit) <= 0 || !DECIMAL.test(pxLimit) || Number(pxLimit) <= 0 || !/^\d+$/.test(timeInterval) || Number(timeInterval) <= 0) return undefined;
      args.push("--szLimit", szLimit, "--pxLimit", pxLimit, "--timeInterval", timeInterval);
      summaryParts.push(`szLimit=${szLimit}`, `pxLimit=${pxLimit}`, `interval=${timeInterval}s`);
    }

    const confirmation = await confirmMutation(input, state, "PLACE ALGO ORDER", `${product.toUpperCase()} ${side} ${sz} ${instId} — ${summaryParts.join("; ")}`);
    return confirmation === undefined ? undefined : [...args, ...confirmation];
  }

  if (choice === "2") {
    const side = (await input.question("  Side (buy or sell): ")).trim().toLowerCase();
    if (side !== "buy" && side !== "sell") return undefined;
    const sz = (await input.question("  Size (positive decimal): ")).trim();
    if (!DECIMAL.test(sz) || Number(sz) <= 0) return undefined;
    const callbackRatio = (await input.question("  Callback ratio % (blank to use spread): ")).trim();
    const callbackSpread = callbackRatio ? "" : (await input.question("  Callback spread (positive decimal): ")).trim();
    if (callbackRatio && (!DECIMAL.test(callbackRatio) || Number(callbackRatio) <= 0)) return undefined;
    if (!callbackRatio && (!DECIMAL.test(callbackSpread) || Number(callbackSpread) <= 0)) return undefined;
    const activePx = (await input.question("  Activation price (blank for none): ")).trim();
    if (activePx && (!DECIMAL.test(activePx) || Number(activePx) <= 0)) return undefined;

    let tdMode = "cash";
    if (product !== "spot") {
      tdMode = (await input.question("  Margin mode (cross or isolated): ")).trim().toLowerCase();
      if (tdMode !== "cross" && tdMode !== "isolated") return undefined;
    }
    let posSide = "";
    if (product === "swap" || product === "futures") {
      posSide = (await input.question("  Position side (net, long, short; blank for none): ")).trim().toLowerCase();
      if (posSide && !["net", "long", "short"].includes(posSide)) return undefined;
    }

    const args = [product, "algo", "trail", "--instId", instId, "--side", side, "--sz", sz, "--tdMode", tdMode];
    if (callbackRatio) args.push("--callbackRatio", callbackRatio);
    else args.push("--callbackSpread", callbackSpread);
    if (activePx) args.push("--activePx", activePx);
    if (posSide) args.push("--posSide", posSide);
    const summary = `${product.toUpperCase()} trailing ${side} ${sz} ${instId}; ${callbackRatio ? `callback=${callbackRatio}%` : `spread=${callbackSpread}`}${activePx ? `; activePx=${activePx}` : ""}`;
    const confirmation = await confirmMutation(input, state, "PLACE TRAILING ORDER", summary);
    return confirmation === undefined ? undefined : [...args, ...confirmation];
  }

  const algoId = (await input.question("  Algo order id: ")).trim();
  if (!ALGO_ID.test(algoId)) return undefined;

  if (choice === "4") {
    const confirmation = await confirmMutation(input, state, "CANCEL ALGO ORDER", `Cancel ${product.toUpperCase()} algo order ${algoId} on ${instId}`);
    return confirmation === undefined ? undefined : [product, "algo", "cancel", "--instId", instId, "--algoId", algoId, ...confirmation];
  }

  const newSz = (await input.question("  New size (blank to keep): ")).trim();
  const newTpTriggerPx = (await input.question("  New TP trigger price (blank to keep): ")).trim();
  const newTpOrdPx = (await input.question("  New TP order price (blank to keep): ")).trim();
  const newSlTriggerPx = (await input.question("  New SL trigger price (blank to keep): ")).trim();
  const newSlOrdPx = (await input.question("  New SL order price (blank to keep): ")).trim();
  const updates: Record<string, string> = { newSz, newTpTriggerPx, newTpOrdPx, newSlTriggerPx, newSlOrdPx };
  const filled = Object.entries(updates).filter(([, v]) => v !== "");
  if (filled.length === 0) return undefined;
  for (const [, v] of filled) {
    if (v !== "-1" && (!DECIMAL.test(v) || Number(v) <= 0)) return undefined;
  }
  const summary = `Amend ${product.toUpperCase()} algo ${algoId} on ${instId}: ${filled.map(([k, v]) => `${k}=${v}`).join(", ")}`;
  const confirmation = await confirmMutation(input, state, "AMEND ALGO ORDER", summary);
  if (confirmation === undefined) return undefined;
  const args = [product, "algo", "amend", "--instId", instId, "--algoId", algoId];
  for (const [k, v] of filled) args.push(`--${k}`, v);
  args.push(...confirmation);
  return args;
}
