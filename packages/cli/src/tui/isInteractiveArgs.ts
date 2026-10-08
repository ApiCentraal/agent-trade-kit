/**
 * FILE: isInteractiveArgs.ts
 * PURPOSE: Decide whether a CLI command needs the real terminal (interactive prompts) instead of captured output.
 * LAYER: util
 * DEPENDS_ON: none
 * RULES:
 * - Commands that prompt on stdin must run with stdio:inherit; capturing them would deadlock the TUI.
 */

/**
 * PURPOSE: Classify CLI arguments as interactive so the dashboard keeps stdin attached to the child.
 * INPUT:
 * - args: string[] — validated command arguments produced by a selector
 * OUTPUT:
 * - boolean — true when the child must inherit the terminal (prompts on stdin)
 * USES:
 * - none
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Whitelist is conservative: config init, OAuth login/logout flows, and auth binary installs stay interactive.
 */
export function isInteractiveArgs(args: string[]): boolean {
  const [command, sub] = args;
  if (command === "config" && sub === "init") return true;
  if (command === "auth") return true;
  if (command === "skill" && (sub === "add" || sub === "download")) return true;
  return false;
}
