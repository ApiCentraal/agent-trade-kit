/**
 * FILE: selectSmartMoneyAction.ts
 * PURPOSE: Explore trader leaderboards, trader histories, and aggregate smart-money signals.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js
 * RULES:
 * - Smart-money routes are observational only and must not place, amend, or cancel exchange orders.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";

/**
 * PURPOSE: Build a validated smart-money analytics query from the selected drill-down.
 * INPUT:
 * - input: Interface — prompt channel for trader ids, instrument ids, and currency symbols
 * - state: TuiDashboardState — active profile for the analytics request
 * OUTPUT:
 * - Promise<string[] | undefined> — CLI arguments or undefined when returning/choosing invalid input
 * USES:
 * - Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects when terminal input closes while trader or instrument parameters are requested.
 * RULES:
 * - IDs are constrained to safe identifier characters; multi-trader lists are comma-separated validated IDs.
 */
export async function selectSmartMoneyAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Smart-money analytics\n");
  process.stdout.write("  1  Trader leaderboard\n");
  process.stdout.write("  2  Search trader\n");
  process.stdout.write("  3  Trader performance\n");
  process.stdout.write("  4  Current trader positions\n");
  process.stdout.write("  5  Trader position history\n");
  process.stdout.write("  6  Trader order history\n");
  process.stdout.write("  7  Signal overview by filters\n");
  process.stdout.write("  8  Signal overview by traders\n");
  process.stdout.write("  9  Signal trend by filters\n");
  process.stdout.write("  10 Signal trend by traders\n");
  const choice = (await input.question("  Choose 1–10, or Q to return: ")).trim().toLowerCase();
  const profileArgs = ["--profile", state.activeProfile];

  if (choice === "1") return ["smartmoney", "traders-by-filter", "--limit", "10", ...profileArgs];
  if (choice === "7") return ["smartmoney", "signal-overview-by-filter", "--period", "7", ...profileArgs];

  if (choice === "2") {
    const keyword = (await input.question("  Trader keyword: ")).trim();
    if (keyword.length < 2 || keyword.length > 80 || /[\u0000-\u001f\u007f]/.test(keyword)) {
      process.stdout.write("  Search term must be 2–80 printable characters.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    return ["smartmoney", "search-trader", "--keyword", keyword, ...profileArgs];
  }

  if (choice === "3" || choice === "8" || choice === "10") {
    const authorIds = (await input.question("  Trader ids (comma-separated): ")).trim();
    if (!/^[A-Za-z0-9_-]{1,64}(,[A-Za-z0-9_-]{1,64})*$/.test(authorIds)) {
      process.stdout.write("  Enter one or more ids separated by commas.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    if (choice === "3") return ["smartmoney", "performance-by-trader", "--authorIds", authorIds, "--period", "90", ...profileArgs];
    if (choice === "8") return ["smartmoney", "signal-overview-by-trader", "--authorIds", authorIds, "--period", "7", ...profileArgs];
    const instCcy = (await input.question("  Instrument currency (for example BTC): ")).trim().toUpperCase();
    if (!/^[A-Z0-9]{2,15}$/.test(instCcy)) return undefined;
    return ["smartmoney", "signal-trend-by-trader", "--authorIds", authorIds, "--instCcy", instCcy, "--limit", "24", ...profileArgs];
  }

  if (choice === "4" || choice === "5" || choice === "6") {
    const authorId = (await input.question("  Trader id: ")).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(authorId)) {
      process.stdout.write("  Enter a valid trader id.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const instrument = (await input.question("  Instrument id (optional): ")).trim();
    if (instrument && !/^[A-Za-z0-9-]{3,40}$/.test(instrument)) return undefined;
    const action = choice === "4" ? "trader-positions" : choice === "5" ? "trader-positions-history" : "trader-orders-history";
    const args = ["smartmoney", action, "--authorId", authorId];
    if (instrument) args.push("--instId", instrument);
    if (choice !== "4") args.push("--limit", "20");
    args.push(...profileArgs);
    return args;
  }

  if (choice === "9") {
    const instCcy = (await input.question("  Instrument currency (for example BTC): ")).trim().toUpperCase();
    if (!/^[A-Z0-9]{2,15}$/.test(instCcy)) return undefined;
    return ["smartmoney", "signal-trend-by-filter", "--instCcy", instCcy, "--limit", "24", ...profileArgs];
  }

  return undefined;
}
