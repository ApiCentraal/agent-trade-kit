/**
 * FILE: selectIndicatorAction.ts
 * PURPOSE: List supported technical indicators or query bounded historical indicator values.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ../askInstrumentId.js
 * RULES:
 * - Indicator requests are read-only and use an allow-listed bar interval plus validated indicator/instrument identifiers.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { askInstrumentId, COMMON_SPOT_IDS, COMMON_SWAP_IDS } from "../askInstrumentId.js";

/**
 * PURPOSE: Build a technical-indicator listing or value query from validated user input.
 * INPUT:
 * - input: Interface — prompt channel for indicator and instrument parameters
 * - state: TuiDashboardState — active profile for the market-data query
 * OUTPUT:
 * - Promise<string[] | undefined> — indicator CLI arguments or undefined when returning/choosing invalid input
 * USES:
 * - Interface.question, askInstrumentId, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while indicator query parameters are requested.
 * RULES:
 * - Historical indicator query limit is fixed at 20 and bar intervals are constrained to supported values.
 */
export async function selectIndicatorAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Technical indicators\n");
  process.stdout.write("  1  List supported indicators\n");
  process.stdout.write("  2  Query indicator values\n");
  const choice = (await input.question("  Choose 1 or 2, or Q to return: ")).trim().toLowerCase();
  if (choice === "1") return ["market", "indicator", "list"];
  if (choice !== "2") return undefined;

  const indicator = (await input.question("  Indicator name (choose from the catalog): ")).trim().toLowerCase();
  if (!/^[a-z][a-z0-9_-]{1,31}$/.test(indicator)) {
    process.stdout.write("  Indicator name must be 2–32 letters, numbers, underscores, or hyphens.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }
  const instId = await askInstrumentId(input, { suggestions: [...COMMON_SPOT_IDS, ...COMMON_SWAP_IDS] });
  if (instId === undefined) {
    process.stdout.write("  Instrument id may contain only letters, numbers, and hyphens.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }
  const bar = (await input.question("  Bar (3m, 5m, 15m, 1H, 4H, 12Hutc, 1Dutc, 3Dutc, 1Wutc; default 1H): ")).trim() || "1H";
  if (!["3m", "5m", "15m", "1H", "4H", "12Hutc", "1Dutc", "3Dutc", "1Wutc"].includes(bar)) {
    process.stdout.write("  Choose one of the listed intervals.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }
  return ["market", "indicator", indicator, instId, "--bar", bar, "--limit", "20", "--profile", state.activeProfile];
}
