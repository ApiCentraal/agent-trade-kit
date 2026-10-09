/**
 * FILE: refreshTickers.ts
 * PURPOSE: Refresh the status-bar ticker line by running the public market ticker command and capturing its first data line.
 * LAYER: service
 * DEPENDS_ON: ./runCliCommandCaptured.js, ./screen/sessionLog.js
 * RULES:
 * - Uses read-only public market data; failures are logged and degrade to an empty ticker list.
 */
import { runCliCommandCaptured } from "./runCliCommandCaptured.js";
import type { SessionLog } from "./screen/sessionLog.js";

/** Symbols shown in the status bar. */
const TICKER_IDS = ["BTC-USDT", "ETH-USDT", "SOL-USDT"];

/**
 * PURPOSE: Collect a compact price line per major symbol for the status bar.
 * INPUT:
 * - log: SessionLog — receives the raw captured lines and any failure notes
 * OUTPUT:
 * - string[] — compact "SYM price" summaries, empty on failure
 * USES:
 * - runCliCommandCaptured, SessionLog.add
 * EFFECT:
 * - io
 * ERRORS:
 * - Child failures are swallowed into empty results and logged; they never crash the dashboard.
 * RULES:
 * - Runs at most when the user presses R; the renderer never fetches prices on its own.
 */
export function refreshTickers(log: SessionLog): string[] {
  const tickers: string[] = [];
  for (const instId of TICKER_IDS) {
    try {
      const result = runCliCommandCaptured(["market", "ticker", instId]);
      log.add("info", `market ticker ${instId} (exit ${result.exitCode})`);
      for (const line of result.lines) log.add("info", line);
      const dataLine = result.lines.find((line) => /\d/.test(line) && !/error|fail/i.test(line));
      if (result.exitCode === 0 && dataLine) {
        const priceMatch = dataLine.match(/(\d[\d,]*(?:\.\d+)?)/);
        tickers.push(`${instId.replace("-USDT", "")} ${priceMatch ? priceMatch[1] : dataLine.slice(0, 18)}`);
      }
    } catch {
      log.add("warn", `ticker refresh failed for ${instId}`);
    }
  }
  return tickers;
}
