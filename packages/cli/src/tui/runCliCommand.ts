/**
 * FILE: runCliCommand.ts
 * PURPOSE: Execute an existing CLI management or read-only command from the dashboard.
 * LAYER: service
 * DEPENDS_ON: node:child_process, node:url
 * RULES:
 * - Pass arguments directly to Node without a shell so dashboard input cannot become shell syntax.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * PURPOSE: Reuse the established CLI command implementations while preserving the user's terminal I/O.
 * INPUT:
 * - args: string[] — validated command and positional arguments for the bundled CLI
 * OUTPUT:
 * - number — child exit code, using 1 when the process terminates without one
 * USES:
 * - spawnSync, process.execPath, bundled dist/index.js
 * EFFECT:
 * - io
 * ERRORS:
 * - Throws when Node cannot start the CLI child process.
 * RULES:
 * - Never invoke a shell and never transform user-provided arguments into a command string.
 */
export function runCliCommand(args: string[]): number {
  const cliEntry = fileURLToPath(new URL("./index.js", import.meta.url));
  const result = spawnSync(process.execPath, [cliEntry, ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}
