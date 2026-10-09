/**
 * FILE: selectEarnMutationAction.ts
 * PURPOSE: Guide explicitly confirmed savings, fixed-term, on-chain, auto-earn, and DCD mutations.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ./confirmMutation.js
 * RULES:
 * - Every purchase, redemption, cancellation, and rate/Auto-Earn change requires a profile/mode-specific preview confirmation.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { confirmMutation } from "./confirmMutation.js";

/**
 * PURPOSE: Build a validated Earn mutation command and release it only after exact user confirmation.
 * INPUT:
 * - input: Interface — prompt channel for currency, quantity, product identifiers, and confirmation
 * - state: TuiDashboardState — active profile and demo/live mode for the account action
 * OUTPUT:
 * - Promise<string[] | undefined> — confirmed Earn CLI arguments or undefined when cancelled/invalid
 * USES:
 * - confirmMutation, Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while an Earn mutation is being collected.
 * RULES:
 * - Currency, amount, product, and order identifiers are validated; no action executes without mode-aware confirmation.
 */
export async function selectEarnMutationAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Earn transactions\n");
  process.stdout.write("  1  Simple Earn purchase\n");
  process.stdout.write("  2  Simple Earn redeem\n");
  process.stdout.write("  3  Change lending rate\n");
  process.stdout.write("  4  Fixed-term purchase\n");
  process.stdout.write("  5  Fixed-term redeem\n");
  process.stdout.write("  6  On-chain purchase\n");
  process.stdout.write("  7  On-chain redeem\n");
  process.stdout.write("  8  Cancel on-chain order\n");
  process.stdout.write("  9  Auto-Earn on\n");
  process.stdout.write("  10 Auto-Earn off\n");
  process.stdout.write("  11 DCD quote-and-buy\n");
  process.stdout.write("  12 DCD redeem\n");
  const choice = (await input.question("  Choose 1–12, or Q to return: ")).trim().toLowerCase();

  if (choice === "1" || choice === "2" || choice === "3" || choice === "4") {
    const ccy = (await input.question("  Currency: ")).trim().toUpperCase();
    if (!/^[A-Z0-9]{2,15}$/.test(ccy)) return undefined;
    const amount = choice === "3" ? "" : (await input.question("  Amount (positive decimal): ")).trim();
    if (amount && (!/^\d+(?:\.\d+)?$/.test(amount) || Number(amount) <= 0)) return undefined;
    const rate = choice === "3" ? (await input.question("  New rate (positive decimal): ")).trim() : "";
    if (rate && (!/^\d+(?:\.\d+)?$/.test(rate) || Number(rate) <= 0)) return undefined;
    const term = choice === "4" ? (await input.question("  Term: ")).trim() : "";
    if (term && !/^[A-Za-z0-9_-]{1,16}$/.test(term)) return undefined;

    const command = choice === "1" ? ["earn", "savings", "purchase"]
      : choice === "2" ? ["earn", "savings", "redeem"]
      : choice === "3" ? ["earn", "savings", "set-rate"]
      : ["earn", "savings", "fixed-purchase"];
    const summary = choice === "3" ? `Set savings lending rate for ${ccy} to ${rate}`
      : `${choice === "2" ? "Redeem" : "Purchase"} ${amount} ${ccy}${term ? ` for term ${term}` : ""}`;
    const intent = choice === "3" ? "CHANGE EARN RATE" : choice === "2" ? "REDEEM EARN" : "BUY EARN";
    const confirmation = await confirmMutation(input, state, intent, summary);
    if (confirmation === undefined) return undefined;
    const args = [...command, "--ccy", ccy];
    if (amount) args.push("--amt", amount);
    if (rate) args.push("--rate", rate);
    if (term) args.push("--term", term, "--confirm");
    args.push(...confirmation);
    return args;
  }

  if (choice === "5") {
    const reqId = (await input.question("  Fixed-term redemption request id: ")).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(reqId)) return undefined;
    const confirmation = await confirmMutation(input, state, "REDEEM EARN", `Redeem fixed-term request ${reqId}`);
    return confirmation === undefined ? undefined : ["earn", "savings", "fixed-redeem", "--reqId", reqId, ...confirmation];
  }

  if (choice === "6") {
    const productId = (await input.question("  On-chain product id: ")).trim();
    const ccy = (await input.question("  Currency: ")).trim().toUpperCase();
    const amt = (await input.question("  Amount (positive decimal): ")).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(productId) || !/^[A-Z0-9]{2,15}$/.test(ccy) || !/^\d+(?:\.\d+)?$/.test(amt) || Number(amt) <= 0) return undefined;
    const confirmation = await confirmMutation(input, state, "BUY EARN", `Purchase on-chain product ${productId}: ${amt} ${ccy}`);
    return confirmation === undefined ? undefined : ["earn", "onchain", "purchase", "--productId", productId, "--ccy", ccy, "--amt", amt, ...confirmation];
  }

  if (choice === "7" || choice === "8") {
    const ordId = (await input.question("  On-chain order id: ")).trim();
    const protocolType = (await input.question("  Protocol type: ")).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(ordId) || !/^[A-Za-z0-9_-]{1,32}$/.test(protocolType)) return undefined;
    const redeem = choice === "7";
    const confirmation = await confirmMutation(input, state, redeem ? "REDEEM EARN" : "CANCEL EARN ORDER", `${redeem ? "Redeem" : "Cancel"} on-chain order ${ordId} (${protocolType})`);
    return confirmation === undefined
      ? undefined
      : ["earn", "onchain", redeem ? "redeem" : "cancel", "--ordId", ordId, "--protocolType", protocolType, ...confirmation];
  }

  if (choice === "9" || choice === "10") {
    const ccy = (await input.question("  Currency: ")).trim().toUpperCase();
    if (!/^[A-Z0-9]{2,15}$/.test(ccy)) return undefined;
    const enable = choice === "9";
    const confirmation = await confirmMutation(input, state, "CHANGE AUTO-EARN", `${enable ? "Enable" : "Disable"} Auto-Earn for ${ccy}`);
    return confirmation === undefined
      ? undefined
      : ["earn", "auto-earn", enable ? "on" : "off", ccy, ...confirmation];
  }

  if (choice === "11") {
    const productId = (await input.question("  DCD product id: ")).trim();
    const sz = (await input.question("  Notional size (positive decimal): ")).trim();
    const notionalCcy = (await input.question("  Notional currency: ")).trim().toUpperCase();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(productId) || !/^\d+(?:\.\d+)?$/.test(sz) || Number(sz) <= 0 || !/^[A-Z0-9]{2,15}$/.test(notionalCcy)) return undefined;
    const confirmation = await confirmMutation(input, state, "BUY EARN", `Buy DCD product ${productId}: ${sz} ${notionalCcy}`);
    return confirmation === undefined
      ? undefined
      : ["earn", "dcd", "quote-and-buy", "--productId", productId, "--sz", sz, "--notionalCcy", notionalCcy, ...confirmation];
  }

  if (choice === "12") {
    const ordId = (await input.question("  DCD order id: ")).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(ordId)) return undefined;
    const confirmation = await confirmMutation(input, state, "REDEEM EARN", `Redeem DCD order ${ordId}`);
    return confirmation === undefined ? undefined : ["earn", "dcd", "redeem-execute", "--ordId", ordId, ...confirmation];
  }

  return undefined;
}
