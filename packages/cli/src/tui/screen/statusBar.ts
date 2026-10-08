/**
 * FILE: statusBar.ts
 * PURPOSE: Render the bottom status line with key hints, optional ticker text, and refresh metadata.
 * LAYER: component
 * DEPENDS_ON: ./ansiPadEnd.js, ./ansiSlice.js, ./ansiWidth.js, ./palette.js
 * RULES:
 * - Ticker text comes from captured CLI output and is truncated to the status width; it is never fetched inside renderers.
 */
import { ansiPadEnd } from "./ansiPadEnd.js";
import { ansiSlice } from "./ansiSlice.js";
import { ansiWidth } from "./ansiWidth.js";
import { CYAN, DIM, GRAY, GREEN, RESET } from "./palette.js";

/**
 * PURPOSE: Build the two-line footer: optional market line and the key-hint bar.
 * INPUT:
 * - width: number — total printable width
 * - options.tickers: string[] — captured market summaries shown dimmed, may be empty
 * - options.lastRefresh: string | undefined — clock time of the last manual refresh
 * OUTPUT:
 * - string[] — exactly two printable lines of `width` columns each
 * USES:
 * - ansiPadEnd, ansiSlice, ansiWidth
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - The hint bar always advertises the same global keys so help stays consistent across panes.
 */
export function renderStatusBar(
  width: number,
  options: { tickers: string[]; lastRefresh: string | undefined },
): string[] {
  const tickerText =
    options.tickers.length > 0
      ? options.tickers.map((t) => `${GREEN}${ansiSlice(t, 26)}${RESET}`).join(`${DIM}   ${RESET}`)
      : `${DIM}Press R to refresh market tickers${RESET}`;
  const refreshLabel = options.lastRefresh ? `${GRAY}refreshed ${options.lastRefresh}${RESET}` : "";
  const tickerPad = Math.max(1, width - ansiWidth(tickerText) - ansiWidth(refreshLabel));
  const tickerLine = ansiPadEnd(`${tickerText}${" ".repeat(tickerPad)}${refreshLabel}`, width);
  const hints = `${GRAY}Keys${RESET} ${CYAN}w/1-9/0/a-h${RESET}${DIM} select${RESET}  ${CYAN}L${RESET}${DIM} logs${RESET}  ${CYAN}R${RESET}${DIM} refresh${RESET}  ${CYAN}Q${RESET}${DIM} quit${RESET}`;
  return [tickerLine, ansiPadEnd(hints, width)];
}
