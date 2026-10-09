/**
 * FILE: types.ts
 * PURPOSE: Define the non-secret state required to render the terminal dashboard.
 * LAYER: dto
 * DEPENDS_ON: none
 * RULES:
 * - Dashboard state may contain credential-presence booleans but must never contain credential values.
 */
export interface TuiDashboardState {
  version: string;
  activeProfile: string;
  mode: "DEMO" | "LIVE" | "NOT CONFIGURED";
  credentialsReady: boolean;
  configPath: string;
  profileNames: string[];
}

export type TuiSelectionResult =
  | { kind: "command"; args: string[] }
  | { kind: "stay" }
  | { kind: "toggle-view" }
  | { kind: "exit" };

/** One captured child-process output line kept for the dashboard log pane. */
export interface TuiLogEntry {
  time: string;
  level: "info" | "warn" | "error";
  text: string;
}

/** A single navigable sidebar entry bound to a selector flow. */
export interface TuiNavItem {
  key: string;
  label: string;
  section: string;
}

/** Mutable wizard draft shared between the bot wizard and the inspector pane. */
export interface TuiWizardDraft {
  botType?: "grid" | "dca";
  instId?: string;
  market?: "spot" | "contract";
  amount?: string;
  ccy?: string;
  risk?: "low" | "medium" | "high";
  minPx?: string;
  maxPx?: string;
  gridNum?: string;
  runType?: "arithmetic" | "geometric";
  tpPct?: string;
  slPct?: string;
  maxSafetyOrds?: string;
  direction?: "long" | "short" | "neutral";
  lever?: string;
}
