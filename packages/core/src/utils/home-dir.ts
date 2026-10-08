/**
 * FILE: home-dir.ts
 * PURPOSE: Resolve the effective home directory for all user-level paths
 *          (~/.okx config, logs, binaries, caches) in a single place so the
 *          behavior stays consistent across platforms.
 * LAYER: util
 * DEPENDS_ON: node:os (homedir fallback)
 * RULES:
 * - An explicit HOME environment variable always wins, including on Windows.
 *   Tests and container/CI environments set HOME to isolate state; os.homedir()
 *   ignores HOME on Windows (uses USERPROFILE), which silently leaked reads and
 *   writes into the real user profile.
 * - Resolved per call, never at module load: callers may mutate process.env
 *   between invocations (tests do this deliberately).
 * - Never log or return credential material; this only resolves a directory.
 */
import { homedir } from "node:os";

/**
 * PURPOSE: Return the directory treated as the user's home for CLI state.
 * INPUT:
 * - none: reads process.env.HOME and falls back to the OS home directory.
 * OUTPUT:
 * - string: absolute path to the effective home directory.
 * USES:
 * - os.homedir() when HOME is unset or empty.
 * EFFECT:
 * - none: pure environment/lookup read, no filesystem access.
 * ERRORS:
 * - none: homedir() always returns a path on supported platforms.
 * RULES:
 * - Must be called lazily at use-site; do not cache the result in module
 *   scope because process.env may change between calls.
 */
export function homeDir(): string {
  const envHome = process.env.HOME;
  return envHome && envHome.length > 0 ? envHome : homedir();
}
