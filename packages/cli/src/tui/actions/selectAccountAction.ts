/**
 * FILE: selectAccountAction.ts
 * PURPOSE: Offer read-only balance, account-settings, fee, and withdrawal-limit queries.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ../askInstrumentId.js
 * RULES:
 * - Only inspect account state; transfer, leverage changes, and position-mode changes are never exposed here.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { askInstrumentId, COMMON_SPOT_IDS, COMMON_SWAP_IDS } from "../askInstrumentId.js";

/**
 * PURPOSE: Map an account overview choice to a read-only query scoped to the active profile.
 * INPUT:
 * - input: Interface — prompt channel for optional currency or instrument type
 * - state: TuiDashboardState — profile whose account status is being queried
 * OUTPUT:
 * - Promise<string[] | undefined> — CLI arguments for a read-only account query, or undefined on back/cancel/invalid input
 * USES:
 * - Interface.question, askInstrumentId, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects when terminal input closes while account query parameters are requested.
 * RULES:
 * - Currency input is restricted to alphanumeric codes; fee queries require a supported instrument type.
 */
export async function selectAccountAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Account overview\n");
  process.stdout.write("  1  Combined trading + funding balances\n");
  process.stdout.write("  2  Balance by currency\n");
  process.stdout.write("  3  Funding assets\n");
  process.stdout.write("  4  Account configuration\n");
  process.stdout.write("  5  Trading fee schedule\n");
  process.stdout.write("  6  Maximum withdrawable amount\n");
  process.stdout.write("  7  Maximum order size\n");
  process.stdout.write("  8  Available order size\n");
  process.stdout.write("  9  Current leverage setting\n");
  const choice = (await input.question("  Choose 1–9, or Q to return: ")).trim().toLowerCase();
  const profileArgs = ["--profile", state.activeProfile];

  if (choice === "1") return ["account", "balance-all", ...profileArgs];
  if (choice === "4") return ["account", "config", ...profileArgs];

  if (choice === "2" || choice === "3" || choice === "6") {
    const currency = (await input.question("  Currency (leave blank for all): ")).trim();
    if (currency && !/^[A-Za-z0-9]{2,15}$/.test(currency)) {
      process.stdout.write("  Enter a currency code using 2–15 letters or numbers.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    if (choice === "2") return currency ? ["account", "balance", currency, ...profileArgs] : ["account", "balance", ...profileArgs];
    if (choice === "3") return currency ? ["account", "asset-balance", "--ccy", currency, ...profileArgs] : ["account", "asset-balance", ...profileArgs];
    return currency ? ["account", "max-withdrawal", "--ccy", currency, ...profileArgs] : ["account", "max-withdrawal", ...profileArgs];
  }

  if (choice === "7" || choice === "8") {
    const instId = await askInstrumentId(input, { suggestions: [...COMMON_SPOT_IDS, ...COMMON_SWAP_IDS] });
    if (instId === undefined) {
      process.stdout.write("  Instrument id may contain only letters, numbers, and hyphens.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const tdModeChoices = choice === "7" ? "cross or isolated" : "cross, isolated, or cash";
    const tdMode = (await input.question(`  Trade mode (${tdModeChoices}): `)).trim().toLowerCase();
    const allowedModes = choice === "7" ? ["cross", "isolated"] : ["cross", "isolated", "cash"];
    if (!allowedModes.includes(tdMode)) {
      process.stdout.write("  Choose one of the listed trade modes.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    return ["account", choice === "7" ? "max-size" : "max-avail-size", "--instId", instId, "--tdMode", tdMode, ...profileArgs];
  }

  if (choice === "9") {
    process.stdout.write("  1  Swap  2  Futures\n");
    const productChoice = (await input.question("  Product: ")).trim();
    const product = productChoice === "1" ? "swap" : productChoice === "2" ? "futures" : "";
    const instId = await askInstrumentId(input, { suggestions: COMMON_SWAP_IDS });
    const mgnMode = (await input.question("  Margin mode (cross or isolated): ")).trim().toLowerCase();
    if (!product || instId === undefined || (mgnMode !== "cross" && mgnMode !== "isolated")) {
      process.stdout.write("  Choose a listed product and a valid instrument id and margin mode.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    return [product, "get-leverage", "--instId", instId, "--mgnMode", mgnMode, ...profileArgs];
  }

  if (choice === "5") {
    const instType = (await input.question("  Instrument type (SPOT, SWAP, FUTURES, OPTION): ")).trim().toUpperCase();
    if (!["SPOT", "SWAP", "FUTURES", "OPTION"].includes(instType)) {
      process.stdout.write("  Choose SPOT, SWAP, FUTURES, or OPTION.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const instId = (await input.question("  Instrument id (optional): ")).trim();
    if (instId && !/^[A-Za-z0-9-]{3,40}$/.test(instId)) {
      process.stdout.write("  Instrument id may contain only letters, numbers, and hyphens.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const args = ["account", "fees", "--instType", instType];
    if (instId) args.push("--instId", instId);
    args.push(...profileArgs);
    return args;
  }

  return undefined;
}
