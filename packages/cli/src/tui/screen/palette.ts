/**
 * FILE: palette.ts
 * PURPOSE: Centralize the OKX control-room color scheme so all panes share one visual language.
 * LAYER: config
 * DEPENDS_ON: none
 * RULES:
 * - Colors are emitted only as SGR sequences and must be paired with RESET to avoid bleeding into pane borders.
 */
export const RESET = "\u001b[0m";
export const DIM = "\u001b[2m";
export const BOLD = "\u001b[1m";
/** OKX accent green used for active selections, badges, and success checks. */
export const GREEN = "\u001b[92m";
/** Cyan used for titles, keys, and navigation accents. */
export const CYAN = "\u001b[96m";
/** Yellow used for warnings and demo-mode emphasis. */
export const YELLOW = "\u001b[93m";
/** Red used for errors and LIVE-mode emphasis. */
export const RED = "\u001b[91m";
/** Muted gray used for secondary labels and inactive items. */
export const GRAY = "\u001b[90m";
