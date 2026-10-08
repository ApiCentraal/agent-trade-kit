/**
 * FILE: exec-target.ts
 * PURPOSE: Resolve the executable + argv pair used to spawn a helper binary
 *          that may be a JavaScript file (.js/.mjs/.cjs) instead of a native
 *          executable (e.g. OKX_AUTH_BIN / OKX_PILOT_BINARY_PATH overrides and
 *          test fixtures).
 * LAYER: util
 * DEPENDS_ON: node:process (execPath)
 * RULES:
 * - Windows cannot spawn script files directly (no shebang handling), and on
 *   POSIX a script without a shebang fails too — routing through the current
 *   Node runtime keeps script overrides working everywhere.
 * - Native executables and .exe/.bat-shimmable paths are returned untouched.
 */
export interface ExecTarget {
  command: string;
  args: string[];
}

/**
 * PURPOSE: Map a binary path + args to a spawnable command; scripts run via
 *          the current Node.js runtime.
 * INPUT:
 * - binPath: string — configured binary path (may point at a JS script).
 * - args: string[] — arguments intended for the binary.
 * OUTPUT:
 * - ExecTarget — { command, args } where command is process.execPath for
 *   scripts (with binPath prepended to args) or binPath itself otherwise.
 * USES:
 * - process.execPath when binPath ends in .js/.mjs/.cjs.
 * EFFECT:
 * - none: pure mapping, no process is spawned here.
 * ERRORS:
 * - none.
 * RULES:
 * - Must not inspect the filesystem — extension match only, so callers stay
 *   deterministic and fast.
 */
export function execTarget(binPath: string, args: string[]): ExecTarget {
  if (/\.(?:mjs|cjs|js)$/i.test(binPath)) {
    return { command: process.execPath, args: [binPath, ...args] };
  }
  return { command: binPath, args };
}
