/**
 * FILE: sessionLog.ts
 * PURPOSE: Keep a bounded ring buffer of TUI events and captured child-process output for the dashboard log pane.
 * LAYER: model
 * DEPENDS_ON: ../types.js
 * RULES:
 * - Entries are truncated per line and the buffer is capped so captured output can never exhaust memory or leak credential-sized blobs.
 */
import type { TuiLogEntry } from "../types.js";

/** Maximum retained entries; older rows are dropped so the pane stays cheap to render. */
const MAX_ENTRIES = 400;
/** Per-line printable cap so a single child line cannot flood the pane. */
const MAX_LINE = 240;

/**
 * PURPOSE: Append a timestamped entry while enforcing the ring-buffer and per-line bounds.
 * INPUT:
 * - entries: TuiLogEntry[] — live buffer to mutate
 * - level: TuiLogEntry["level"] — severity shown in the pane
 * - text: string — raw event or captured child output line
 * OUTPUT:
 * - TuiLogEntry[] — the same buffer, trimmed to MAX_ENTRIES
 * USES:
 * - none
 * EFFECT:
 * - state
 * ERRORS:
 * - none
 * RULES:
 * - Caller-provided text is truncated before storage; secrets must never be passed in by callers.
 */
function pushEntry(entries: TuiLogEntry[], level: TuiLogEntry["level"], text: string): TuiLogEntry[] {
  entries.push({ time: new Date().toTimeString().slice(0, 8), level, text: text.slice(0, MAX_LINE) });
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  return entries;
}

/**
 * PURPOSE: Own the dashboard log buffer and expose append/query operations used by the log pane.
 * RULES:
 * - This class is the only writer of captured output; renderers receive immutable snapshots.
 */
export class SessionLog {
  private readonly entries: TuiLogEntry[] = [];

  /**
   * PURPOSE: Record one TUI or child-process event for later display.
   * INPUT:
   * - level: "info" | "warn" | "error" — severity tag for coloring
   * - text: string — event description or one captured output line
   * OUTPUT:
   * - void
   * USES:
   * - pushEntry
   * EFFECT:
   * - state
   * ERRORS:
   * - none
   * RULES:
   * - Multi-line text is split so each stored entry stays a single printable row.
   */
  add(level: "info" | "warn" | "error", text: string): void {
    for (const line of text.split(/\r?\n/)) {
      if (line.length > 0) pushEntry(this.entries, level, line);
    }
  }

  /**
   * PURPOSE: Return the most recent entries for pane rendering.
   * INPUT:
   * - count: number — maximum rows to return, taken from the tail
   * OUTPUT:
   * - TuiLogEntry[] — newest entries in chronological order
   * USES:
   * - none
   * EFFECT:
   * - none
   * ERRORS:
   * - none
   * RULES:
   * - Returns a copy so renderers cannot mutate the buffer.
   */
  tail(count: number): TuiLogEntry[] {
    return this.entries.slice(Math.max(0, this.entries.length - count));
  }

  /**
   * PURPOSE: Expose the full buffer for the fullscreen log view.
   * INPUT:
   * - none
   * OUTPUT:
   * - TuiLogEntry[] — all retained entries in chronological order
   * USES:
   * - none
   * EFFECT:
   * - none
   * ERRORS:
   * - none
   * RULES:
   * - Returns a copy; the buffer itself stays private.
   */
  all(): TuiLogEntry[] {
    return [...this.entries];
  }
}
