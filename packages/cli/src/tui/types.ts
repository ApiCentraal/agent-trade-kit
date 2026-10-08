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
