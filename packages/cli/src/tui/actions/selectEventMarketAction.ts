/**
 * FILE: selectEventMarketAction.ts
 * PURPOSE: Browse read-only event-contract summaries, series, events, and markets.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js
 * RULES:
 * - Expose public event information only; event order placement, amendments, and cancellations remain excluded.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";

/**
 * PURPOSE: Return a validated event-contract discovery query for the chosen series or underlying.
 * INPUT:
 * - input: Interface — prompt channel for event view, underlying, series, and detail selection
 * - state: TuiDashboardState — active profile for the public event query
 * OUTPUT:
 * - Promise<string[] | undefined> — event CLI arguments or undefined when returning/choosing invalid input
 * USES:
 * - Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while event query parameters are requested.
 * RULES:
 * - Series identifiers are restricted to alphanumeric, underscore, and hyphen characters; only read routes are returned.
 */
export async function selectEventMarketAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Event contracts\n");
  process.stdout.write("  1  Browse active contracts\n");
  process.stdout.write("  2  List event series\n");
  process.stdout.write("  3  Query events/markets by series\n");
  const choice = (await input.question("  Choose 1–3, or Q to return: ")).trim().toLowerCase();
  const profileArgs = ["--profile", state.activeProfile];

  if (choice === "1") {
    const underlying = (await input.question("  Underlying asset (optional, e.g. BTC): ")).trim().toUpperCase();
    if (underlying && !/^[A-Z0-9]{2,16}$/.test(underlying)) {
      process.stdout.write("  Underlying must be 2–16 letters or numbers.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const args = ["event", "browse"];
    if (underlying) args.push("--underlying", underlying);
    args.push(...profileArgs);
    return args;
  }
  if (choice === "2") return ["event", "series", "--all", ...profileArgs];
  if (choice !== "3") return undefined;

  const seriesId = (await input.question("  Event series id: ")).trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(seriesId)) {
    process.stdout.write("  Series id may contain only letters, numbers, underscores, and hyphens.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }
  process.stdout.write("  1  Events in series\n");
  process.stdout.write("  2  Markets in series\n");
  const detail = (await input.question("  Choose 1 or 2: ")).trim();
  if (detail !== "1" && detail !== "2") {
    process.stdout.write("  Choose 1 or 2.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }
  return detail === "1"
    ? ["event", "events", seriesId, "--limit", "20", ...profileArgs]
    : ["event", "markets", seriesId, "--limit", "20", ...profileArgs];
}
