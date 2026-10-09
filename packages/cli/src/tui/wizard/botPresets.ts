/**
 * FILE: botPresets.ts
 * PURPOSE: Provide conservative/medium/aggressive default parameter sets so beginners can create bots with minimal input.
 * LAYER: config
 * DEPENDS_ON: ../types.js
 * RULES:
 * - Presets fill optional fields only; required market inputs (instrument, capital) are never guessed.
 */
import type { TuiWizardDraft } from "../types.js";

/**
 * PURPOSE: Merge a risk-level preset into a draft without overwriting fields the user already set.
 * INPUT:
 * - draft: TuiWizardDraft — current wizard answers
 * - risk: "low" | "medium" | "high" — chosen risk profile
 * OUTPUT:
 * - TuiWizardDraft — draft with preset defaults applied to unset fields
 * USES:
 * - none
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Presets never override explicit user answers; they only supply defaults for blank fields.
 */
export function applyRiskPreset(draft: TuiWizardDraft, risk: "low" | "medium" | "high"): TuiWizardDraft {
  const merged: TuiWizardDraft = { ...draft, risk };
  if (draft.botType === "dca") {
    merged.maxSafetyOrds ??= risk === "low" ? "2" : risk === "medium" ? "4" : "8";
    merged.tpPct ??= risk === "low" ? "0.05" : risk === "medium" ? "0.03" : "0.02";
    merged.slPct ??= risk === "low" ? "0.10" : risk === "medium" ? "0.15" : "0.25";
  } else {
    merged.gridNum ??= risk === "low" ? "10" : risk === "medium" ? "20" : "40";
    merged.runType ??= "arithmetic";
  }
  return merged;
}
