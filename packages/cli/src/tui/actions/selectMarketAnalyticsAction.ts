/**
 * FILE: selectMarketAnalyticsAction.ts
 * PURPOSE: Expose read-only index, price-limit, flow, option analytics, and market-scanner queries.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ./selectPairSpreadAction.js
 * RULES:
 * - Analytics queries may not submit orders and must validate instrument types, categories, and identifiers.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { selectPairSpreadAction } from "./selectPairSpreadAction.js";

/**
 * PURPOSE: Convert an advanced market analytics selection into a bounded public or read-only CLI query.
 * INPUT:
 * - input: Interface — prompt channel for index, scanner, open-interest, or option parameters
 * - state: TuiDashboardState — active profile for the market or option data request
 * OUTPUT:
 * - Promise<string[] | undefined> — CLI arguments or undefined when returning/choosing invalid parameters
 * USES:
 * - Interface.question, TuiDashboardState, selectPairSpreadAction
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while analytics parameters are requested.
 * RULES:
 * - All instrument identifiers and enum values are validated; limits are bounded to small read-only result sets.
 */
export async function selectMarketAnalyticsAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Advanced market analytics\n");
  process.stdout.write("  1  Index ticker\n");
  process.stdout.write("  2  Index candles\n");
  process.stdout.write("  3  Price limits\n");
  process.stdout.write("  4  Stock tokens\n");
  process.stdout.write("  5  Instruments by category\n");
  process.stdout.write("  6  Market filter\n");
  process.stdout.write("  7  Open-interest history\n");
  process.stdout.write("  8  Open-interest movers\n");
  process.stdout.write("  9  Option instruments\n");
  process.stdout.write("  10 Option greeks\n");
  process.stdout.write("  11 Pair-spread analysis\n");
  const choice = (await input.question("  Choose 1–11, or Q to return: ")).trim().toLowerCase();
  const profileArgs = ["--profile", state.activeProfile];

  if (choice === "1") {
    const instId = (await input.question("  Index instrument id (optional): ")).trim();
    if (instId && !/^[A-Za-z0-9-]{3,40}$/.test(instId)) return undefined;
    const args = ["market", "index-ticker"];
    if (instId) args.push("--instId", instId);
    args.push(...profileArgs);
    return args;
  }

  if (choice === "2" || choice === "3" || choice === "7" || choice === "9" || choice === "10") {
    const instId = (await input.question("  Instrument or underlying id: ")).trim();
    if (!/^[A-Za-z0-9-]{3,40}$/.test(instId)) {
      process.stdout.write("  Enter a valid instrument identifier.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    if (choice === "3") return ["market", "price-limit", instId, ...profileArgs];
    if (choice === "7") return ["market", "oi-history", instId, "--bar", "1H", "--limit", "20", ...profileArgs];
    if (choice === "9" || choice === "10") {
      const args = ["option", choice === "9" ? "instruments" : "greeks", "--uly", instId, ...profileArgs];
      return args;
    }
    const bar = (await input.question("  Bar interval (1H or 1D; default 1H): ")).trim() || "1H";
    if (bar !== "1H" && bar !== "1D") return undefined;
    return ["market", "index-candles", instId, "--bar", bar, "--limit", "20", ...profileArgs];
  }

  if (choice === "4") {
    const instType = (await input.question("  Instrument type (SPOT or SWAP): ")).trim().toUpperCase();
    if (instType !== "SPOT" && instType !== "SWAP") return undefined;
    return ["market", "stock-tokens", "--instType", instType, ...profileArgs];
  }

  if (choice === "5") {
    const category = (await input.question("  Instrument category (4, 5, 6, or 7): ")).trim();
    if (!["4", "5", "6", "7"].includes(category)) return undefined;
    const args = ["market", "instruments-by-category", "--instCategory", category];
    const instType = (await input.question("  Instrument type (optional SPOT or SWAP): ")).trim().toUpperCase();
    if (instType && instType !== "SPOT" && instType !== "SWAP") return undefined;
    if (instType) args.push("--instType", instType);
    args.push(...profileArgs);
    return args;
  }

  if (choice === "6") {
    const instType = (await input.question("  Instrument type (SPOT, SWAP, FUTURES): ")).trim().toUpperCase();
    if (!["SPOT", "SWAP", "FUTURES"].includes(instType)) return undefined;
    const sortBy = (await input.question("  Sort by (last, chg24hPct, volUsd24h, fundingRate, oiUsd; default volUsd24h): ")).trim() || "volUsd24h";
    if (!["last", "chg24hPct", "volUsd24h", "fundingRate", "oiUsd"].includes(sortBy)) return undefined;
    return ["market", "filter", "--instType", instType, "--sortBy", sortBy, "--sortOrder", "desc", "--limit", "20", ...profileArgs];
  }

  if (choice === "8") {
    const instType = (await input.question("  Instrument type (SWAP or FUTURES): ")).trim().toUpperCase();
    if (instType !== "SWAP" && instType !== "FUTURES") return undefined;
    return ["market", "oi-change", "--instType", instType, "--bar", "1H", "--sortBy", "absOiDeltaPct", "--sortOrder", "desc", "--limit", "20", ...profileArgs];
  }

  if (choice === "11") return selectPairSpreadAction(input, state);
  return undefined;
}
