/**
 * FILE: selectPairSpreadAction.ts
 * PURPOSE: Query historical relative-price spread statistics between two market instruments.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js
 * RULES:
 * - Only compute read-only public market statistics; instrument inputs must not be converted into shell commands.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";

/**
 * PURPOSE: Return a validated pair-spread analysis command for two distinct instruments.
 * INPUT:
 * - input: Interface — prompt channel for the instrument pair and bar interval
 * - state: TuiDashboardState — active profile for the market query
 * OUTPUT:
 * - Promise<string[] | undefined> — CLI arguments or undefined when returning/choosing invalid parameters
 * USES:
 * - Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while pair-spread parameters are requested.
 * RULES:
 * - Both instrument identifiers must match the exchange symbol pattern and the interval must be 5m or 15m.
 */
export async function selectPairSpreadAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  const first = (await input.question("  First instrument: ")).trim();
  const second = (await input.question("  Second instrument: ")).trim();
  if (!/^[A-Za-z0-9-]{3,40}$/.test(first) || !/^[A-Za-z0-9-]{3,40}$/.test(second) || first === second) {
    process.stdout.write("  Enter two different instrument ids using only letters, numbers, and hyphens.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }
  const bar = (await input.question("  Bar interval (5m or 15m; default 5m): ")).trim() || "5m";
  if (bar !== "5m" && bar !== "15m") {
    process.stdout.write("  Choose 5m or 15m.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }
  return ["market", "pair-spread", first, second, "--bar", bar, "--profile", state.activeProfile];
}
