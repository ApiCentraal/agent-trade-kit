/**
 * FILE: askInstrumentId.ts
 * PURPOSE: Offer common instruments as a numbered pick list so users rarely have to type an instrument id.
 * LAYER: util
 * DEPENDS_ON: node:readline/promises
 * RULES:
 * - Manual entry stays available via option 0 and is validated against the same strict id format as before.
 */
import type { Interface } from "node:readline/promises";

/** Frequently used spot pairs, shown first in pick lists. */
export const COMMON_SPOT_IDS = ["BTC-USDT", "ETH-USDT", "SOL-USDT", "XRP-USDT"];

/** Frequently used perpetual swaps, shown for contract flows. */
export const COMMON_SWAP_IDS = ["BTC-USDT-SWAP", "ETH-USDT-SWAP", "SOL-USDT-SWAP"];

const INST_ID_PATTERN = /^[A-Za-z0-9-]{3,40}$/;

/**
 * PURPOSE: Resolve an instrument id from a numbered suggestion list or a validated manual entry.
 * INPUT:
 * - input: Interface — prompt channel
 * - options.suggestions: string[] — instruments offered as numbered shortcuts; empty list asks for manual input only
 * OUTPUT:
 * - Promise<string | undefined> — a validated instrument id, or undefined when the entry is invalid or the user cancels
 * USES:
 * - Interface.question
 * EFFECT:
 * - io
 * ERRORS:
 * - Returns undefined on invalid manual input instead of throwing, matching the existing selector convention.
 * RULES:
 * - The numbered list never constrains manual entry; option 0 accepts any value that matches the strict instrument id format.
 */
export async function askInstrumentId(
  input: Interface,
  options?: { suggestions?: string[] },
): Promise<string | undefined> {
  const suggestions = options?.suggestions ?? [];
  if (suggestions.length > 0) {
    process.stdout.write("  Instruments: ");
    process.stdout.write(suggestions.map((id, index) => `${index + 1}=${id}`).join("  "));
    process.stdout.write("  0=other\n");
    const pick = (await input.question("  Choose a number or 0 to type it yourself: ")).trim();
    const index = Number(pick) - 1;
    if (Number.isInteger(index) && index >= 0 && index < suggestions.length) return suggestions[index];
    if (pick !== "0") return undefined;
  }
  const instId = (await input.question("  Instrument id: ")).trim();
  if (!INST_ID_PATTERN.test(instId)) return undefined;
  return instId;
}
