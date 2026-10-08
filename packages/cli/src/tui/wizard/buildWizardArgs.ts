/**
 * FILE: buildWizardArgs.ts
 * PURPOSE: Convert a completed wizard draft into validated CLI arguments plus a human-readable preview summary.
 * LAYER: service
 * DEPENDS_ON: ../types.js
 * RULES:
 * - Every numeric field is revalidated here regardless of how the draft was filled; invalid drafts never produce args.
 */
import type { TuiWizardDraft } from "../types.js";

const DECIMAL = /^\d+(?:\.\d+)?$/;
const INST_ID = /^[A-Za-z0-9-]{3,40}$/;

/** Either validated CLI args + preview summary, or a readable reason the draft is incomplete. */
export type WizardBuild = { ok: true; args: string[]; summary: string } | { ok: false; reason: string };

/**
 * PURPOSE: Validate the draft and emit the exact `bot grid create` or `bot dca create` argument array.
 * INPUT:
 * - draft: TuiWizardDraft — collected wizard answers (already preset-merged)
 * OUTPUT:
 * - WizardBuild — ok with args/summary, or not-ok with the first blocking reason
 * USES:
 * - none
 * EFFECT:
 * - none
 * ERRORS:
 * - Returns ok:false with a reason for any missing or invalid required field; never throws.
 * RULES:
 * - Mode/profile flags are appended later by confirmMutation; this builder emits only operation arguments.
 */
export function buildWizardArgs(draft: TuiWizardDraft): WizardBuild {
  if (!draft.instId || !INST_ID.test(draft.instId)) return { ok: false, reason: "instrument id missing or invalid" };
  if (!draft.amount || !DECIMAL.test(draft.amount) || Number(draft.amount) <= 0) return { ok: false, reason: "capital amount missing or invalid" };

  if (draft.botType === "dca") {
    const algoOrdType = draft.market === "contract" ? "contract_dca" : "spot_dca";
    const direction = draft.direction ?? "long";
    const args = [
      "bot", "dca", "create",
      "--algoOrdType", algoOrdType,
      "--instId", draft.instId,
      "--direction", direction,
      "--initOrdAmt", draft.amount,
      "--maxSafetyOrds", draft.maxSafetyOrds ?? "4",
      "--tpPct", draft.tpPct ?? "0.03",
    ];
    if (algoOrdType === "contract_dca") {
      const lever = draft.lever ?? "2";
      if (!DECIMAL.test(lever) || Number(lever) <= 0) return { ok: false, reason: "leverage invalid" };
      args.push("--lever", lever);
    }
    if (draft.slPct && DECIMAL.test(draft.slPct)) args.push("--slPct", draft.slPct);
    const summary = `Create ${algoOrdType} on ${draft.instId}; direction=${direction}; initial=${draft.amount} ${draft.ccy ?? "USDT"}; safety=${draft.maxSafetyOrds ?? "4"}; TP=${draft.tpPct ?? "0.03"}${draft.slPct ? `; SL=${draft.slPct}` : ""}`;
    return { ok: true, args, summary };
  }

  if (!draft.minPx || !draft.maxPx || !DECIMAL.test(draft.minPx) || !DECIMAL.test(draft.maxPx)) {
    return { ok: false, reason: "grid price range missing or invalid" };
  }
  if (Number(draft.maxPx) <= Number(draft.minPx)) return { ok: false, reason: "grid range invalid: max must exceed min" };
  const gridNum = draft.gridNum ?? "20";
  if (!/^\d{1,3}$/.test(gridNum) || Number(gridNum) < 2 || Number(gridNum) > 100) return { ok: false, reason: "grid count must be 2–100" };

  if (draft.market === "contract") {
    const lever = draft.lever ?? "2";
    const direction = draft.direction ?? "neutral";
    if (!DECIMAL.test(lever) || Number(lever) <= 0) return { ok: false, reason: "leverage invalid" };
    const args = [
      "bot", "grid", "create",
      "--instId", draft.instId,
      "--algoOrdType", "contract_grid",
      "--minPx", draft.minPx,
      "--maxPx", draft.maxPx,
      "--gridNum", gridNum,
      "--sz", draft.amount,
      "--lever", lever,
      "--direction", direction,
    ];
    if (draft.runType) args.push("--runType", draft.runType === "geometric" ? "2" : "1");
    const summary = `Create contract grid on ${draft.instId}; range=${draft.minPx}–${draft.maxPx}; levels=${gridNum}; size=${draft.amount}; leverage=${lever}; direction=${direction}`;
    return { ok: true, args, summary };
  }

  const args = [
    "bot", "grid", "create",
    "--instId", draft.instId,
    "--algoOrdType", "grid",
    "--minPx", draft.minPx,
    "--maxPx", draft.maxPx,
    "--gridNum", gridNum,
    "--quoteSz", draft.amount,
  ];
  if (draft.runType) args.push("--runType", draft.runType === "geometric" ? "2" : "1");
  const summary = `Create spot grid on ${draft.instId}; range=${draft.minPx}–${draft.maxPx}; levels=${gridNum}; capital=${draft.amount} ${draft.ccy ?? "USDT"}`;
  return { ok: true, args, summary };
}
