/**
 * FILE: runCliCommandCaptured.ts
 * PURPOSE: Execute a bundled CLI command while capturing its output for the dashboard log pane instead of inheriting the terminal.
 * LAYER: service
 * DEPENDS_ON: node:child_process, node:url
 * RULES:
 * - Arguments pass directly to Node without a shell; output is truncated per line by SessionLog, never executed.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Result of one captured CLI execution. */
export interface CapturedRun {
  exitCode: number;
  lines: string[];
}

/**
 * PURPOSE: Run a CLI command silently and return its combined output lines plus exit code for the log pane.
 * INPUT:
 * - args: string[] — validated command and arguments for the bundled CLI
 * OUTPUT:
 * - CapturedRun — exit code and stdout/stderr lines merged in process order
 * USES:
 * - spawnSync, process.execPath, bundled dist/index.js
 * EFFECT:
 * - io
 * ERRORS:
 * - Throws when Node cannot start the CLI child process.
 * RULES:
 * - Never invoke a shell; interactive flows must use runCliCommand (stdio:inherit) instead so prompts still work.
 */
export function runCliCommandCaptured(args: string[]): CapturedRun {
  const cliEntry = fileURLToPath(new URL("./index.js", import.meta.url));
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const lines: string[] = [];
  if (result.stdout) lines.push(...result.stdout.split(/\r?\n/));
  if (result.stderr) lines.push(...result.stderr.split(/\r?\n/).map((line) => `stderr: ${line}`));
  return { exitCode: result.status ?? 1, lines: lines.filter((line) => line.length > 0) };
}
