/**
 * FILE: statusBar.ts
 * PURPOSE: Render the bottom status line: brand+version, mode, market tickers, API status, latency, and clock.
 * LAYER: component
 * DEPENDS_ON: ../types.js, ./ansiPadEnd.js, ./ansiWidth.js, ./palette.js
 * RULES:
 * - Ticker text comes from captured CLI output and is truncated to the status width; it is never fetched inside renderers.
 */
import type { TuiDashboardState } from "../types.js";
import { ansiPadEnd } from "./ansiPadEnd.js";
import { ansiWidth } from "./ansiWidth.js";
import { BOLD, CYAN, DIM, GRAY, GREEN, RED, RESET, YELLOW } from "./palette.js";

/**
 * PURPOSE: Build the two-line footer: brand/ticker/status line and the key-hint bar.
 * INPUT:
 * - width: number — total printable width
 * - options.state: TuiDashboardState — version, mode, and credential readiness
 * - options.tickers: string[] — captured market summaries shown dimmed, may be empty
 * - options.latencyMs: number | undefined — measured child-spawn latency of the last refresh
 * - options.clock: string | undefined — HH:MM:SS shown at the right edge
 * OUTPUT:
 * - string[] — exactly two printable lines of `width` columns each
 * USES:
 * - ansiPadEnd, ansiWidth
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Latency and clock render only when supplied; the hint bar always advertises the same global keys.
 */
export function renderStatusBar(
  width: number,
  options: {
    state: TuiDashboardState;
    tickers: string[];
    latencyMs: number | undefined;
    clock: string | undefined;
  },
): string[] {
  const modeColor = options.state.mode === "LIVE" ? RED : options.state.mode === "DEMO" ? GREEN : YELLOW;
  const brand = `${BOLD}${CYAN}◆ OKX${RESET} ${DIM}Bot Config CLI v${options.state.version}${RESET}  ${modeColor}${options.state.mode}${RESET}${options.state.mode === "DEMO" ? `${DIM} Testnet${RESET}` : ""}`;
  const api = options.state.credentialsReady ? `${GREEN}● API Connected${RESET}` : `${YELLOW}● No credentials${RESET}`;
  const latency = options.latencyMs === undefined ? `${DIM}Latency: -- ms${RESET}` : `${GRAY}Latency: ${options.latencyMs} ms${RESET}`;
  const clock = options.clock ? `${GRAY}${options.clock}${RESET}` : "";
  const right = `${api}   ${latency}   ${clock}`;
  const tickerBudget = Math.max(0, width - ansiWidth(brand) - ansiWidth(right) - 10);
  const shown: string[] = [];
  let used = 0;
  for (const ticker of options.tickers) {
    const cost = ansiWidth(ticker) + (shown.length > 0 ? 3 : 0);
    if (used + cost > tickerBudget) break;
    shown.push(ticker);
    used += cost;
  }
  const tickerText =
    shown.length > 0 ? shown.join(`${DIM}   ${RESET}`) : `${DIM}press R for tickers${RESET}`;
  const middle = `${DIM}│${RESET}  ${tickerText}`;
  const pad = Math.max(1, width - ansiWidth(brand) - ansiWidth(middle) - ansiWidth(right) - 2);
  const line1 = ansiPadEnd(`${brand}  ${middle}${" ".repeat(pad)}${right}`, width);
  const hints = `${GRAY}Keys${RESET}  ${CYAN}w${RESET}${DIM} wizard${RESET}   ${CYAN}1-0 a-k${RESET}${DIM} select${RESET}   ${CYAN}l${RESET}${DIM} logs${RESET}   ${CYAN}r${RESET}${DIM} refresh${RESET}   ${CYAN}q${RESET}${DIM} quit${RESET}`;
  return [line1, ansiPadEnd(hints, width)];
}
