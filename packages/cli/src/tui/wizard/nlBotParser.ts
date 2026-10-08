/**
 * FILE: nlBotParser.ts
 * PURPOSE: Parse a short natural-language bot description into a partial wizard draft without any LLM dependency.
 * LAYER: service
 * DEPENDS_ON: ../types.js
 * RULES:
 * - Only explicit keywords map to fields; unrecognized input yields an empty draft so financial parameters are never guessed.
 */
import type { TuiWizardDraft } from "../types.js";

/** Recognized base coins that map to USDT pairs. */
const KNOWN_COINS = ["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "LTC", "AVAX", "LINK", "DOT", "OKB", "TON", "TRX", "NEAR", "ARB", "OP"];

/** Extracted intent fields; every property is optional because parsing is best-effort. */
export interface ParsedBotIntent {
  botType?: "grid" | "dca";
  market?: "spot" | "contract";
  instId?: string;
  amount?: string;
  ccy?: string;
  risk?: "low" | "medium" | "high";
  direction?: "long" | "short";
  lever?: string;
  minPx?: string;
  maxPx?: string;
}

/**
 * PURPOSE: Turn a free-text description like "grid bot BTC 100 USDT low risk" into wizard prefill values.
 * INPUT:
 * - text: string — user-typed natural-language intent
 * OUTPUT:
 * - ParsedBotIntent — only the fields that matched explicit patterns; empty when nothing matched
 * USES:
 * - none
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Deterministic regex/keyword matching only; ambiguous or missing fields stay undefined for the wizard to ask.
 */
export function parseBotIntent(text: string): ParsedBotIntent {
  const lower = text.toLowerCase();
  const out: ParsedBotIntent = {};

  if (/\b(dca|martingale|accumulat|dip|averag)/.test(lower)) out.botType = "dca";
  else if (/\b(grid|range|arbitrage|scalp)/.test(lower)) out.botType = "grid";

  if (/\b(futur|swap|perp|contract|leverag|margin)/.test(lower)) out.market = "contract";
  else if (/\bspot\b/.test(lower)) out.market = "spot";

  const coin = KNOWN_COINS.find((c) => new RegExp(`\\b${c.toLowerCase()}\\b`).test(lower));
  if (coin) out.instId = out.market === "contract" ? `${coin}-USDT-SWAP` : `${coin}-USDT`;

  const amount = lower.match(/(\d+(?:\.\d+)?)\s*(usdt|usdc|btc|eth)/);
  if (amount) {
    out.amount = amount[1];
    out.ccy = amount[2].toUpperCase();
  }

  if (/\b(low|conservat|safe|small)\b/.test(lower)) out.risk = "low";
  else if (/\b(high|aggress|degen)\b/.test(lower)) out.risk = "high";
  else if (/\b(medium|moderate|balanced)\b/.test(lower)) out.risk = "medium";

  if (/\blong\b/.test(lower)) out.direction = "long";
  else if (/\bshort\b/.test(lower)) out.direction = "short";

  const lever = lower.match(/(\d{1,3})\s*x\b/);
  if (lever) out.lever = lever[1];

  const range = lower.match(/(?:between|range|from)\s*(\d+(?:\.\d+)?)\s*(?:and|-|to)\s*(\d+(?:\.\d+)?)/);
  if (range) {
    out.minPx = range[1];
    out.maxPx = range[2];
  }

  return out;
}
