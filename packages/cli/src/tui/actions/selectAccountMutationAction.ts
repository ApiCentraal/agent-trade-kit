/**
 * FILE: selectAccountMutationAction.ts
 * PURPOSE: Perform explicitly confirmed account transfers, position-mode changes, and leverage updates.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ../askInstrumentId.js, ./confirmMutation.js
 * RULES:
 * - Transfers and account settings are financial mutations and require a mode-specific preview confirmation.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { askInstrumentId, COMMON_SPOT_IDS, COMMON_SWAP_IDS } from "../askInstrumentId.js";
import { confirmMutation } from "./confirmMutation.js";

/**
 * PURPOSE: Collect validated transfer/settings fields and return only explicitly confirmed CLI commands.
 * INPUT:
 * - input: Interface — prompt channel for currency, amount, account, and leverage fields
 * - state: TuiDashboardState — selected profile and demo/live environment
 * OUTPUT:
 * - Promise<string[] | undefined> — confirmed account CLI arguments or undefined when cancelled/invalid
 * USES:
 * - confirmMutation, askInstrumentId, Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while account mutation parameters are requested.
 * RULES:
 * - Transfers stay within funding/trading accounts 6/18; sub-account transfer types require a validated sub-account name, and amounts/leverage must be positive decimals.
 */
export async function selectAccountMutationAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Account mutations\n");
  process.stdout.write("  1  Transfer between funding and trading accounts\n");
  process.stdout.write("  2  Change position mode\n");
  process.stdout.write("  3  Update leverage\n");
  const choice = (await input.question("  Choose 1–3, or Q to return: ")).trim().toLowerCase();

  if (choice === "1") {
    const ccy = (await input.question("  Currency: ")).trim().toUpperCase();
    const amt = (await input.question("  Amount (positive decimal): ")).trim();
    if (!/^[A-Z0-9]{2,15}$/.test(ccy) || !/^\d+(?:\.\d+)?$/.test(amt) || Number(amt) <= 0) return undefined;
    process.stdout.write("  6  Funding  18  Trading\n");
    const from = (await input.question("  From account (6 or 18): ")).trim();
    const to = (await input.question("  To account (6 or 18): ")).trim();
    if ((from !== "6" && from !== "18") || (to !== "6" && to !== "18") || from === to) return undefined;
    process.stdout.write("  Transfer type: 0 = own account, 1 = main→sub, 2 = sub→main, 3 = sub→sub\n");
    const transferType = (await input.question("  Transfer type (blank = 0): ")).trim();
    if (transferType !== "" && !["0", "1", "2", "3"].includes(transferType)) return undefined;
    let subAcct = "";
    if (transferType === "1" || transferType === "2" || transferType === "3") {
      subAcct = (await input.question("  Sub-account name: ")).trim();
      if (!/^[A-Za-z0-9_-]{1,32}$/.test(subAcct)) return undefined;
    }
    const typeSummary = transferType && transferType !== "0" ? `; type=${transferType} sub=${subAcct}` : "";
    const summary = `Transfer ${amt} ${ccy} from ${from === "6" ? "funding" : "trading"} to ${to === "6" ? "funding" : "trading"}${typeSummary}`;
    const confirmation = await confirmMutation(input, state, "TRANSFER FUNDS", summary);
    if (confirmation === undefined) return undefined;
    const args = ["account", "transfer", "--ccy", ccy, "--amt", amt, "--from", from, "--to", to];
    if (transferType && transferType !== "0") args.push("--transferType", transferType, "--subAcct", subAcct);
    args.push(...confirmation);
    return args;
  }

  if (choice === "2") {
    process.stdout.write("  Position modes: net_mode or long_short_mode\n");
    const posMode = (await input.question("  New position mode: ")).trim();
    if (posMode !== "net_mode" && posMode !== "long_short_mode") return undefined;
    const confirmation = await confirmMutation(input, state, "CHANGE POSITION MODE", `Set account position mode to ${posMode}`);
    return confirmation === undefined
      ? undefined
      : ["account", "set-position-mode", "--posMode", posMode, ...confirmation];
  }

  if (choice === "3") {
    process.stdout.write("  1  Spot  2  Swap  3  Futures\n");
    const productChoice = (await input.question("  Product: ")).trim();
    const product = productChoice === "1" ? "spot" : productChoice === "2" ? "swap" : productChoice === "3" ? "futures" : undefined;
    if (product === undefined) return undefined;

    let instId = "";
    let ccy = "";
    if (product === "spot") {
      process.stdout.write("  1  Instrument pair  2  Currency\n");
      const target = (await input.question("  Set leverage by: ")).trim();
      if (target === "1") instId = (await askInstrumentId(input, { suggestions: COMMON_SPOT_IDS })) ?? "";
      else if (target === "2") ccy = (await input.question("  Currency: ")).trim().toUpperCase();
      else return undefined;
      if (target === "1" && !instId) return undefined;
      if (ccy && !/^[A-Z0-9]{2,15}$/.test(ccy)) return undefined;
    } else {
      const picked = await askInstrumentId(input, { suggestions: COMMON_SWAP_IDS });
      if (picked === undefined) return undefined;
      instId = picked;
    }

    const lever = (await input.question("  New leverage (positive number): ")).trim();
    if (!/^\d+(?:\.\d+)?$/.test(lever) || Number(lever) <= 0) return undefined;
    const mgnMode = (await input.question("  Margin mode (cross or isolated): ")).trim().toLowerCase();
    if (mgnMode !== "cross" && mgnMode !== "isolated") return undefined;
    let posSide = "";
    if (product === "swap" || product === "futures") {
      posSide = (await input.question("  Position side (long or short; required in hedge mode, blank for net): ")).trim().toLowerCase();
      if (posSide && posSide !== "long" && posSide !== "short") return undefined;
    }
    const summary = `Set ${product.toUpperCase()} leverage to ${lever}x (${mgnMode}) for ${instId || ccy}${posSide ? `; side=${posSide}` : ""}`;
    const confirmation = await confirmMutation(input, state, "CHANGE LEVERAGE", summary);
    if (confirmation === undefined) return undefined;
    const args = [product, "leverage"];
    if (instId) args.push("--instId", instId);
    if (ccy) args.push("--ccy", ccy);
    args.push("--lever", lever, "--mgnMode", mgnMode);
    if (posSide) args.push("--posSide", posSide);
    args.push(...confirmation);
    return args;
  }

  return undefined;
}
