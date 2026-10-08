/**
 * FILE: selectBotAction.ts
 * PURPOSE: Monitor active/history orders, details, fills, and positions for grid and DCA bots.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ../askInstrumentId.js
 * RULES:
 * - Expose only bot query commands; all bot creation, amendments, stopping, and position-closing actions stay out of the TUI.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { askInstrumentId, COMMON_SWAP_IDS } from "../askInstrumentId.js";

/**
 * PURPOSE: Convert a bot-monitoring choice into a validated, read-only CLI query.
 * INPUT:
 * - input: Interface — prompt channel for bot type, identifier, and active/history selection
 * - state: TuiDashboardState — active profile for the bot query
 * OUTPUT:
 * - Promise<string[] | undefined> — CLI arguments or undefined when returning/choosing invalid parameters
 * USES:
 * - Interface.question, askInstrumentId, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while bot-monitoring parameters are requested.
 * RULES:
 * - Bot identifiers must be alphanumeric/underscore/hyphen; generated commands only query existing bots.
 */
export async function selectBotAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Trading bot monitor\n");
  process.stdout.write("  1  Grid orders\n");
  process.stdout.write("  2  Grid details\n");
  process.stdout.write("  3  Grid sub-orders\n");
  process.stdout.write("  4  Contract-grid positions\n");
  process.stdout.write("  5  DCA orders\n");
  process.stdout.write("  6  DCA details\n");
  process.stdout.write("  7  DCA sub-orders\n");
  process.stdout.write("  8  Liquidation-price calculator\n");
  const choice = (await input.question("  Choose 1–8, or Q to return: ")).trim().toLowerCase();
  const profileArgs = ["--profile", state.activeProfile];

  if (choice === "8") {
    const instId = await askInstrumentId(input, { suggestions: COMMON_SWAP_IDS });
    const sz = (await input.question("  Contract size (positive decimal): ")).trim();
    const lever = (await input.question("  Leverage (positive decimal): ")).trim();
    if (instId === undefined || !/^\d+(?:\.\d+)?$/.test(sz) || Number(sz) <= 0 || !/^\d+(?:\.\d+)?$/.test(lever) || Number(lever) <= 0) {
      process.stdout.write("  Provide a valid instrument id and positive size and leverage.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const args = ["bot", "grid", "liquidate-price", "--instId", instId, "--sz", sz, "--lever", lever];
    const direction = (await input.question("  Direction (long, short; blank for none): ")).trim().toLowerCase();
    if (direction && direction !== "long" && direction !== "short") return undefined;
    if (direction) args.push("--direction", direction);
    for (const [flag, label] of [["minPx", "Minimum price"], ["maxPx", "Maximum price"], ["gridNum", "Grid levels"]] as const) {
      const value = (await input.question(`  ${label} (blank to skip): `)).trim();
      if (value) {
        if (!/^\d+(?:\.\d+)?$/.test(value) || Number(value) <= 0) return undefined;
        args.push(`--${flag}`, value);
      }
    }
    args.push(...profileArgs);
    return args;
  }

  if (choice === "1" || choice === "2" || choice === "3" || choice === "4") {
    const algoOrdType = (await input.question("  Grid type (grid, contract_grid, moon_grid): ")).trim();
    if (!["grid", "contract_grid", "moon_grid"].includes(algoOrdType)) {
      process.stdout.write("  Choose grid, contract_grid, or moon_grid.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    if (choice === "1") {
      const status = (await input.question("  1  Active  2  History: ")).trim();
      if (status !== "1" && status !== "2") {
        process.stdout.write("  Choose 1 or 2.\n");
        await input.question("  Press Enter to return to the dashboard...");
        return undefined;
      }
      const args = ["bot", "grid", "orders", "--algoOrdType", algoOrdType];
      if (status === "2") args.push("--history");
      args.push(...profileArgs);
      return args;
    }

    const algoId = (await input.question("  Grid algo id: ")).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(algoId)) {
      process.stdout.write("  Invalid bot id.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    if (choice === "2") return ["bot", "grid", "details", "--algoOrdType", algoOrdType, "--algoId", algoId, ...profileArgs];
    if (choice === "4") {
      if (algoOrdType !== "contract_grid") {
        process.stdout.write("  Position details are available for contract_grid bots only.\n");
        await input.question("  Press Enter to return to the dashboard...");
        return undefined;
      }
      return ["bot", "grid", "positions", "--algoOrdType", "contract_grid", "--algoId", algoId, ...profileArgs];
    }
    const pending = (await input.question("  1  Filled sub-orders  2  Pending sub-orders: ")).trim();
    if (pending !== "1" && pending !== "2") return undefined;
    const args = ["bot", "grid", "sub-orders", "--algoOrdType", algoOrdType, "--algoId", algoId];
    if (pending === "2") args.push("--pending");
    args.push(...profileArgs);
    return args;
  }

  if (choice === "5") {
    const algoOrdType = (await input.question("  DCA type (all, spot_dca, contract_dca): ")).trim() || "all";
    if (!["all", "spot_dca", "contract_dca"].includes(algoOrdType)) {
      process.stdout.write("  Choose all, spot_dca, or contract_dca.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const status = (await input.question("  1  Active  2  History: ")).trim();
    if (status !== "1" && status !== "2") {
      process.stdout.write("  Choose 1 or 2.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const args = ["bot", "dca", "orders"];
    if (algoOrdType !== "all") args.push("--algoOrdType", algoOrdType);
    if (status === "2") args.push("--history");
    args.push(...profileArgs);
    return args;
  }

  if (choice === "6" || choice === "7") {
    const algoOrdType = (await input.question("  DCA type (spot_dca, contract_dca): ")).trim();
    if (algoOrdType !== "spot_dca" && algoOrdType !== "contract_dca") {
      process.stdout.write("  Choose spot_dca or contract_dca.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const algoId = (await input.question("  DCA algo id: ")).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(algoId)) {
      process.stdout.write("  Invalid bot id.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const route = choice === "6" ? "details" : "sub-orders";
    return ["bot", "dca", route, "--algoOrdType", algoOrdType, "--algoId", algoId, ...profileArgs];
  }

  return undefined;
}
