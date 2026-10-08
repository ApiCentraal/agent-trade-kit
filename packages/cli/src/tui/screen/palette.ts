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
/** Bright white used for emphasized values inside the configuration form. */
export const WHITE = "\u001b[97m";
/** Black foreground paired with GREEN_BG for filled active pills and buttons. */
export const BLACK = "\u001b[30m";
/** Green background used for filled pills, toggles, and the deploy button. */
export const GREEN_BG = "\u001b[42m";
/** Red background used for the LIVE segment of the mode switch. */
export const RED_BG = "\u001b[41m";
/** Inverse video used for the focused sidebar row. */
export const INVERSE = "\u001b[7m";
