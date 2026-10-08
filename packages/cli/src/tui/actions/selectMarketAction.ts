/**
 * FILE: selectMarketAction.ts
 * PURPOSE: Provide validated, read-only access to market prices, depth, candles, contracts, and analysis.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ../askInstrumentId.js, ./selectEventMarketAction.js, ./selectIndicatorAction.js, ./selectMarketAnalyticsAction.js
 * RULES:
 * - Every market shortcut is a public-data query and accepts only allow-listed types or validated instrument identifiers.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { askInstrumentId, COMMON_SPOT_IDS, COMMON_SWAP_IDS } from "../askInstrumentId.js";
import { selectEventMarketAction } from "./selectEventMarketAction.js";
import { selectIndicatorAction } from "./selectIndicatorAction.js";
import { selectMarketAnalyticsAction } from "./selectMarketAnalyticsAction.js";

/**
 * PURPOSE: Convert a market-data selection into a bounded CLI query with validated parameters.
 * INPUT:
 * - input: Interface — prompt channel for instrument and query parameters
 * - state: TuiDashboardState — active profile to pass to the selected market request
 * OUTPUT:
 * - Promise<string[] | undefined> — CLI arguments or undefined when returning/choosing invalid parameters
 * USES:
 * - Interface.question, askInstrumentId, TuiDashboardState, selectEventMarketAction, selectIndicatorAction, selectMarketAnalyticsAction
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while market parameters are requested.
 * RULES:
 * - Instrument identifiers, bar intervals, limits, and instrument types are validated before a CLI command is returned.
 */
export async function selectMarketAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Market data\n");
  process.stdout.write("  1  Ticker\n");
  process.stdout.write("  2  Market-wide tickers\n");
  process.stdout.write("  3  Order book\n");
  process.stdout.write("  4  Candles\n");
  process.stdout.write("  5  Instruments\n");
  process.stdout.write("  6  Funding rate\n");
  process.stdout.write("  7  Recent trades\n");
  process.stdout.write("  8  Mark price\n");
  process.stdout.write("  9  Open interest\n");
  process.stdout.write("  10 Event contracts\n");
  process.stdout.write("  11 Technical indicators\n");
  process.stdout.write("  12 Advanced market analytics\n");
  const choice = (await input.question("  Choose 1–12, or Q to return: ")).trim().toLowerCase();
  const profileArgs = ["--profile", state.activeProfile];

  if (choice === "10") return selectEventMarketAction(input, state);
  if (choice === "11") return selectIndicatorAction(input, state);
  if (choice === "12") return selectMarketAnalyticsAction(input, state);

  if (choice === "2" || choice === "5" || choice === "8" || choice === "9") {
    const allowedTypes = choice === "9" ? ["SWAP", "FUTURES", "OPTION"] : ["SPOT", "SWAP", "FUTURES", "OPTION"];
    const instType = (await input.question(`  Instrument type (${allowedTypes.join(", ")}): `)).trim().toUpperCase();
    if (!allowedTypes.includes(instType)) {
      process.stdout.write("  Choose one of the listed instrument types.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    if (choice === "2") return ["market", "tickers", instType, ...profileArgs];
    if (choice === "5") return ["market", "instruments", "--instType", instType, ...profileArgs];

    const instId = (await input.question("  Instrument id (optional): ")).trim();
    if (instId && !/^[A-Za-z0-9-]{3,40}$/.test(instId)) {
      process.stdout.write("  Instrument id may contain only letters, numbers, and hyphens.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const args = ["market", choice === "8" ? "mark-price" : "open-interest", "--instType", instType];
    if (instId) args.push("--instId", instId);
    args.push(...profileArgs);
    return args;
  }

  if (choice === "1" || choice === "3" || choice === "4" || choice === "6" || choice === "7") {
    const instId = await askInstrumentId(input, { suggestions: [...COMMON_SPOT_IDS, ...COMMON_SWAP_IDS] });
    if (instId === undefined) {
      process.stdout.write("  Enter 3–40 letters, numbers, or hyphens.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    if (choice === "1") return ["market", "ticker", instId, ...profileArgs];
    if (choice === "6") {
      const history = (await input.question("  1  Current rate  2  Rate history: ")).trim();
      if (history !== "1" && history !== "2") {
        process.stdout.write("  Choose 1 or 2.\n");
        await input.question("  Press Enter to return to the dashboard...");
        return undefined;
      }
      const args = ["market", "funding-rate", instId];
      if (history === "2") args.push("--history", "--limit", "20");
      args.push(...profileArgs);
      return args;
    }
    if (choice === "7") return ["market", "trades", instId, "--limit", "20", ...profileArgs];
    if (choice === "3") return ["market", "orderbook", instId, "--sz", "20", ...profileArgs];

    const bar = (await input.question("  Candle interval (1m, 5m, 15m, 1H, 4H, 1D; default 1H): ")).trim() || "1H";
    if (!["1m", "5m", "15m", "1H", "4H", "1D"].includes(bar)) {
      process.stdout.write("  Choose one of the listed candle intervals.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    return ["market", "candles", instId, "--bar", bar, "--limit", "20", ...profileArgs];
  }

  return undefined;
}
