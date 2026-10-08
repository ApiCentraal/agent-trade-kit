/**
 * FILE: selectNewsAction.ts
 * PURPOSE: Query market news, coin sentiment, calendars, publishers, and regional coverage.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js
 * RULES:
 * - News actions are read-only; free-form values are passed as discrete CLI arguments after validation.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";

/**
 * PURPOSE: Convert a news or economic-calendar choice into a validated read-only CLI command.
 * INPUT:
 * - input: Interface — prompt channel for coin, keyword, sentiment, or region
 * - state: TuiDashboardState — active profile for consistent CLI configuration
 * OUTPUT:
 * - Promise<string[] | undefined> — CLI arguments or undefined when returning/choosing invalid input
 * USES:
 * - Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while a news query parameter is requested.
 * RULES:
 * - Coin symbols, search text, and sentiment values are validated; each route is read-only.
 */
export async function selectNewsAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  News & calendar\n");
  process.stdout.write("  1  Latest news\n");
  process.stdout.write("  2  Important news\n");
  process.stdout.write("  3  Search news\n");
  process.stdout.write("  4  News by coin\n");
  process.stdout.write("  5  Coin sentiment\n");
  process.stdout.write("  6  Coin sentiment trend\n");
  process.stdout.write("  7  News by sentiment\n");
  process.stdout.write("  8  Sentiment ranking\n");
  process.stdout.write("  9  Economic calendar\n");
  process.stdout.write("  10 News platforms\n");
  process.stdout.write("  11 Calendar regions\n");
  process.stdout.write("  12 Article detail\n");
  const choice = (await input.question("  Choose 1–12, or Q to return: ")).trim().toLowerCase();
  const profileArgs = ["--profile", state.activeProfile];

  if (choice === "1") return ["news", "latest", "--limit", "20", ...profileArgs];
  if (choice === "2") return ["news", "important", "--limit", "20", ...profileArgs];
  if (choice === "8") return ["news", "sentiment-rank", "--period", "24h", "--limit", "20", ...profileArgs];
  if (choice === "9") return ["news", "economic-calendar", "--limit", "20", ...profileArgs];
  if (choice === "10") return ["news", "platforms", ...profileArgs];
  if (choice === "11") return ["news", "list-regions", ...profileArgs];
  if (choice === "12") {
    const articleId = (await input.question("  Article id: ")).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(articleId)) {
      process.stdout.write("  Article id may contain only letters, numbers, hyphens, and underscores.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    return ["news", "detail", articleId, ...profileArgs];
  }

  if (choice === "3") {
    const keyword = (await input.question("  Search term (2–80 characters): ")).trim();
    if (keyword.length < 2 || keyword.length > 80 || /[\u0000-\u001f\u007f]/.test(keyword)) {
      process.stdout.write("  Search term must be 2–80 printable characters.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    return ["news", "search", "--keyword", keyword, "--limit", "20", ...profileArgs];
  }

  if (choice === "4" || choice === "5" || choice === "6") {
    const coin = (await input.question("  Coin symbol (for example BTC): ")).trim().toUpperCase();
    if (!/^[A-Z0-9]{2,15}$/.test(coin)) {
      process.stdout.write("  Coin symbol must use 2–15 letters or numbers.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    if (choice === "4") return ["news", "by-coin", "--coins", coin, ...profileArgs];
    if (choice === "5") return ["news", "coin-sentiment", "--coins", coin, "--period", "24h", ...profileArgs];
    return ["news", "coin-trend", coin, "--period", "24h", "--points", "24", ...profileArgs];
  }

  if (choice === "7") {
    const sentiment = (await input.question("  Sentiment (bullish or bearish): ")).trim().toLowerCase();
    if (sentiment !== "bullish" && sentiment !== "bearish") {
      process.stdout.write("  Choose bullish or bearish.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    return ["news", "by-sentiment", "--sentiment", sentiment, "--limit", "20", ...profileArgs];
  }

  return undefined;
}
