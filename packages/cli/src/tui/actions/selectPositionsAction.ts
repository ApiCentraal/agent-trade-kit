/**
 * FILE: selectPositionsAction.ts
 * PURPOSE: Offer read-only positions, order/algo-order history, fills, account bills, and local audit views.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ../askInstrumentId.js
 * RULES:
 * - This submenu may query exchange state but must not amend, place, or cancel orders.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { askInstrumentId, COMMON_SPOT_IDS, COMMON_SWAP_IDS } from "../askInstrumentId.js";

/**
 * PURPOSE: Map a portfolio/activity selection to a read-only CLI query scoped to the active profile.
 * INPUT:
 * - input: Interface — prompt channel for product and history selection
 * - state: TuiDashboardState — active profile for the selected query
 * OUTPUT:
 * - Promise<string[] | undefined> — CLI arguments, or undefined when the user returns/chooses an invalid option
 * USES:
 * - Interface.question, askInstrumentId, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while a product query is being selected.
 * RULES:
 * - Product choices are fixed to supported read-only routes; order history is explicitly selected and never mutated.
 */
export async function selectPositionsAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Positions & activity\n");
  process.stdout.write("  1  All open positions\n");
  process.stdout.write("  2  Swap positions\n");
  process.stdout.write("  3  Futures positions\n");
  process.stdout.write("  4  Options positions\n");
  process.stdout.write("  5  Position history\n");
  process.stdout.write("  6  Active orders\n");
  process.stdout.write("  7  Historical orders\n");
  process.stdout.write("  8  Recent fills\n");
  process.stdout.write("  9  Recent account bills\n");
  process.stdout.write("  10 Local trade audit trail\n");
  process.stdout.write("  11 Algo orders\n");
  process.stdout.write("  12 Order detail\n");
  const choice = (await input.question("  Choose 1–12, or Q to return: ")).trim().toLowerCase();
  const profileArgs = ["--profile", state.activeProfile];

  if (choice === "1") return ["account", "positions", ...profileArgs];
  if (choice === "2") return ["swap", "positions", ...profileArgs];
  if (choice === "3") return ["futures", "positions", ...profileArgs];
  if (choice === "4") return ["option", "positions", ...profileArgs];
  if (choice === "5") return ["account", "positions-history", "--limit", "20", ...profileArgs];
  if (choice === "9") return ["account", "bills", "--limit", "20", ...profileArgs];
  if (choice === "10") return ["account", "audit", "--limit", "20", ...profileArgs];
  if (choice === "11") {
    process.stdout.write("  1  Spot  2  Swap  3  Futures  4  Options\n");
    const algoProductChoice = (await input.question("  Product: ")).trim();
    const algoProduct = algoProductChoice === "1" ? "spot" : algoProductChoice === "2" ? "swap" : algoProductChoice === "3" ? "futures" : algoProductChoice === "4" ? "option" : "";
    if (!algoProduct) {
      process.stdout.write("  Choose one of the listed products.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const statusChoice = (await input.question("  Pending (1) or history (2): ")).trim();
    if (statusChoice !== "1" && statusChoice !== "2") return undefined;
    const args = [algoProduct, "algo", "orders"];
    if (statusChoice === "2") args.push("--history");
    args.push(...profileArgs);
    return args;
  }
  if (choice === "12") {
    process.stdout.write("  1  Spot  2  Swap  3  Futures  4  Options\n");
    const getProductChoice = (await input.question("  Product: ")).trim();
    const getProduct = getProductChoice === "1" ? "spot" : getProductChoice === "2" ? "swap" : getProductChoice === "3" ? "futures" : getProductChoice === "4" ? "option" : "";
    const instId = await askInstrumentId(input, { suggestions: getProduct === "spot" ? COMMON_SPOT_IDS : getProduct === "option" ? [] : COMMON_SWAP_IDS });
    const ordId = (await input.question("  Exchange order id (blank to use client id): ")).trim();
    const clOrdId = ordId ? "" : (await input.question("  Client order id: ")).trim();
    if (!getProduct || instId === undefined || (!ordId && !clOrdId)
      || (ordId && !/^[A-Za-z0-9_-]{1,64}$/.test(ordId)) || (clOrdId && !/^[A-Za-z0-9_-]{1,64}$/.test(clOrdId))) {
      process.stdout.write("  Provide a listed product, a valid instrument id, and an order id or client order id.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const args = [getProduct, "get", "--instId", instId];
    if (ordId) args.push("--ordId", ordId);
    else args.push("--clOrdId", clOrdId);
    args.push(...profileArgs);
    return args;
  }
  if (choice !== "6" && choice !== "7" && choice !== "8") {
    if (choice !== "q") {
      process.stdout.write("  Choose one of the listed portfolio actions.\n");
      await input.question("  Press Enter to return to the dashboard...");
    }
    return undefined;
  }

  process.stdout.write("  1  Spot  2  Swap  3  Futures  4  Options  5  Event contracts\n");
  const productChoice = (await input.question("  Product: ")).trim();
  let product = "";
  if (productChoice === "1") product = "spot";
  if (productChoice === "2") product = "swap";
  if (productChoice === "3") product = "futures";
  if (productChoice === "4") product = "option";
  if (productChoice === "5") product = "event";
  if (!product) {
    process.stdout.write("  Choose one of the listed products.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }

  if (choice === "8") return [product, "fills", ...profileArgs];
  if (product === "event") {
    return ["event", "orders", "--status", choice === "7" ? "history" : "open", ...profileArgs];
  }
  const args = [product, "orders"];
  if (choice === "7") args.push("--history");
  args.push(...profileArgs);
  return args;
}
