/**
 * FILE: selectEarnAction.ts
 * PURPOSE: Monitor savings rates, Earn products/orders, auto-earn state, and DCD order history.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js
 * RULES:
 * - Only read-only Earn routes are exposed; purchases, redemptions, cancellations, and rate changes are excluded.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";

/**
 * PURPOSE: Return a bounded Earn monitoring query from the selected subcategory.
 * INPUT:
 * - input: Interface — prompt channel for currency, product, and DCD query parameters
 * - state: TuiDashboardState — active profile for private Earn queries
 * OUTPUT:
 * - Promise<string[] | undefined> — CLI arguments or undefined when returning/choosing invalid values
 * USES:
 * - Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while Earn query parameters are requested.
 * RULES:
 * - Currency/underlying/option-type inputs are validated and no returned route can purchase or redeem a product.
 */
export async function selectEarnAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Earn monitor\n");
  process.stdout.write("  1  Savings balance\n");
  process.stdout.write("  2  Savings lending history\n");
  process.stdout.write("  3  Savings rate history\n");
  process.stdout.write("  4  Fixed-term products\n");
  process.stdout.write("  5  Fixed-term orders\n");
  process.stdout.write("  6  On-chain offers\n");
  process.stdout.write("  7  Active on-chain orders\n");
  process.stdout.write("  8  On-chain order history\n");
  process.stdout.write("  9  Auto-Earn status\n");
  process.stdout.write("  10 DCD pairs\n");
  process.stdout.write("  11 DCD products\n");
  process.stdout.write("  12 DCD order history\n");
  process.stdout.write("  13 Flash Earn projects\n");
  const choice = (await input.question("  Choose 1–13, or Q to return: ")).trim().toLowerCase();
  const profileArgs = ["--profile", state.activeProfile];

  if (choice === "1" || choice === "2" || choice === "3" || choice === "4" || choice === "5" || choice === "9") {
    const ccy = (await input.question("  Currency (optional): ")).trim().toUpperCase();
    if (ccy && !/^[A-Z0-9]{2,15}$/.test(ccy)) {
      process.stdout.write("  Currency code must use 2–15 letters or numbers.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const routes: Record<string, string[]> = {
      "1": ["earn", "savings", "balance"],
      "2": ["earn", "savings", "lending-history", "--limit", "20"],
      "3": ["earn", "savings", "rate-history", "--limit", "20"],
      "4": ["earn", "savings", "fixed-products"],
      "5": ["earn", "savings", "fixed-orders"],
      "9": ["earn", "auto-earn", "status"],
    };
    const args = routes[choice];
    if (args === undefined) return undefined;
    if (ccy && (choice === "1" || choice === "9")) args.push(ccy);
    else if (ccy) args.push("--ccy", ccy);
    args.push(...profileArgs);
    return args;
  }

  if (choice === "6") return ["earn", "onchain", "offers", ...profileArgs];
  if (choice === "7") return ["earn", "onchain", "orders", ...profileArgs];
  if (choice === "8") return ["earn", "onchain", "history", ...profileArgs];
  if (choice === "10") return ["earn", "dcd", "pairs", ...profileArgs];
  if (choice === "12") return ["earn", "dcd", "orders", "--limit", "20", ...profileArgs];
  if (choice === "13") return ["earn", "flash-earn", "projects", ...profileArgs];

  if (choice === "11") {
    const baseCcy = (await input.question("  Base currency: ")).trim().toUpperCase();
    const quoteCcy = (await input.question("  Quote currency: ")).trim().toUpperCase();
    const optType = (await input.question("  Option type (C or P): ")).trim().toUpperCase();
    if (!/^[A-Z0-9]{2,15}$/.test(baseCcy) || !/^[A-Z0-9]{2,15}$/.test(quoteCcy) || (optType !== "C" && optType !== "P")) {
      process.stdout.write("  Enter valid currency codes and C or P.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    return ["earn", "dcd", "products", "--baseCcy", baseCcy, "--quoteCcy", quoteCcy, "--optType", optType, ...profileArgs];
  }

  return undefined;
}
