/**
 * FILE: inspectorModel.ts
 * PURPOSE: Build the right-hand inspector content: configuration summary, validation checks, and order estimates.
 * LAYER: model
 * DEPENDS_ON: ../types.js
 * RULES:
 * - All checks are local and deterministic; the inspector never performs exchange calls.
 */
import type { TuiDashboardState, TuiWizardDraft } from "../types.js";

/** A single labelled row in the configuration summary. */
export interface InspectorField {
  label: string;
  value: string;
}

/** A named validation check with a pass/fail/note status. */
export interface InspectorCheck {
  label: string;
  status: "pass" | "fail" | "note";
  detail: string;
}

/** Inspector content consumed by the inspector view. */
export interface InspectorModel {
  fields: InspectorField[];
  checks: InspectorCheck[];
  estimates: InspectorField[];
}

/**
 * PURPOSE: Summarize the active context (wizard draft or session status) into inspector fields, checks, and estimates.
 * INPUT:
 * - state: TuiDashboardState — safe profile and credential readiness
 * - draft: TuiWizardDraft | undefined — in-progress bot configuration, when the wizard is active
 * - lastAction: string | undefined — last executed `okx …` line with its exit code, for session overview
 * OUTPUT:
 * - InspectorModel — labelled fields, validation checks, and locally estimated order exposure
 * USES:
 * - none
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Checks never guess: missing values produce "note" entries, contradictions produce "fail".
 */
export function buildInspectorModel(
  state: TuiDashboardState,
  draft: TuiWizardDraft | undefined,
  lastAction?: string,
): InspectorModel {
  const checks: InspectorCheck[] = [
    {
      label: "API connection",
      status: state.credentialsReady ? "pass" : "fail",
      detail: state.credentialsReady ? `${state.mode} profile` : "not configured",
    },
    {
      label: "Trading mode",
      status: state.mode === "DEMO" ? "pass" : state.mode === "LIVE" ? "note" : "fail",
      detail: state.mode === "LIVE" ? "live — confirm carefully" : state.mode.toLowerCase(),
    },
  ];

  const fields: InspectorField[] = [
    { label: "Profile", value: state.activeProfile },
    { label: "Mode", value: state.mode },
    ...(lastAction ? [{ label: "Last action", value: lastAction }] : []),
  ];
  const estimates: InspectorField[] = [];

  if (!draft) {
    checks.push({ label: "Active flow", status: "note", detail: "select an action to preview" });
    return { fields, checks, estimates };
  }

  fields.push(
    { label: "Strategy", value: draft.botType === "dca" ? "DCA bot" : draft.botType === "grid" ? "Grid trading" : "—" },
    { label: "Pair", value: draft.instId ?? "—" },
    { label: "Capital", value: draft.amount ? `${draft.amount} ${draft.ccy ?? "USDT"}` : "—" },
    { label: "Price range", value: draft.minPx && draft.maxPx ? `${draft.minPx} – ${draft.maxPx}` : "—" },
    { label: "Grids", value: draft.gridNum ?? "—" },
    { label: "Risk level", value: draft.risk ?? "—" },
    { label: "Environment", value: state.mode },
  );

  checks.push(
    {
      label: "Symbol available",
      status: draft.instId ? (/^[A-Z0-9]+-[A-Z0-9]+(-SWAP)?$/.test(draft.instId) ? "pass" : "fail") : "note",
      detail: draft.instId ?? "not set",
    },
    {
      label: "Capital set",
      status: draft.amount && Number(draft.amount) > 0 ? "pass" : "note",
      detail: draft.amount ? `${draft.amount} ${draft.ccy ?? "USDT"}` : "pending",
    },
    {
      label: "Range logic",
      status:
        draft.minPx && draft.maxPx
          ? Number(draft.minPx) < Number(draft.maxPx)
            ? "pass"
            : "fail"
          : "note",
      detail: draft.minPx && draft.maxPx ? `${draft.minPx} < ${draft.maxPx}` : "pending",
    },
  );

  const grids = draft.gridNum ? Number(draft.gridNum) : 0;
  const amount = draft.amount ? Number(draft.amount) : 0;
  if (draft.botType === "grid" && grids > 0 && amount > 0) {
    const buys = Math.floor(grids / 2);
    estimates.push(
      { label: "Total orders", value: `${grids} (${buys} buy / ${grids - buys} sell)` },
      { label: "Capital / order", value: `${(amount / grids).toFixed(2)} ${draft.ccy ?? "USDT"}` },
    );
  } else if (draft.botType === "dca") {
    const safety = draft.maxSafetyOrds ? Number(draft.maxSafetyOrds) : 0;
    estimates.push({ label: "Max orders", value: `${safety + 1} (1 + ${safety} safety)` });
  }
  if (amount > 0) estimates.push({ label: "Capital at risk", value: `${amount} ${draft.ccy ?? "USDT"}` });

  return { fields, checks, estimates };
}
