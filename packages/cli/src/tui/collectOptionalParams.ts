/**
 * FILE: collectOptionalParams.ts
 * PURPOSE: Prompt for optional CLI flag values and append only validated, non-empty entries to a command.
 * LAYER: util
 * DEPENDS_ON: node:readline/promises
 * RULES:
 * - Blank answers skip the flag entirely; invalid values abort the whole flow by returning undefined.
 */
import type { Interface } from "node:readline/promises";

/**
 * PURPOSE: Describe one optional CLI flag so the collector can prompt and validate it uniformly.
 */
export interface OptionalParamSpec {
  /** CLI flag name without dashes, for example "runType". */
  flag: string;
  /** Human-readable prompt label shown before the value. */
  label: string;
  /** Validation shape applied to a non-empty answer. */
  kind: "decimal" | "enum" | "id" | "bool";
  /** Allowed values when kind is "enum". */
  choices?: string[];
  /** Also accept "-1" when kind is "decimal" (OKX uses it to clear a TP/SL). */
  allowMinusOne?: boolean;
  /** When true emit --flag/--no-flag; when false emit --flag true|false. */
  boolAsFlag?: boolean;
}

/**
 * PURPOSE: Collect optional parameters interactively so sparse flags stay off the generated CLI command.
 * INPUT:
 * - input: Interface — prompt channel
 * - specs: OptionalParamSpec[] — ordered flags to offer; each may be left blank
 * OUTPUT:
 * - Promise<{ args: string[]; summary: string } | undefined> — validated flags and a preview fragment, or undefined on invalid input
 * USES:
 * - Interface.question
 * EFFECT:
 * - io
 * ERRORS:
 * - Returns undefined when any provided value fails validation.
 * RULES:
 * - Optional parameters must never be sent with empty values; every emitted flag carries a validated value.
 */
export async function collectOptionalParams(
  input: Interface,
  specs: OptionalParamSpec[],
): Promise<{ args: string[]; summary: string } | undefined> {
  const args: string[] = [];
  const parts: string[] = [];
  for (const spec of specs) {
    const hint = spec.kind === "enum" ? ` (${spec.choices?.join("/")})` : spec.kind === "bool" ? " (yes/no)" : spec.allowMinusOne ? " (positive decimal or -1)" : "";
    const value = (await input.question(`  ${spec.label}${hint}, blank to skip: `)).trim().toLowerCase();
    if (!value) continue;

    if (spec.kind === "bool") {
      if (value !== "yes" && value !== "y" && value !== "no" && value !== "n") return undefined;
      const truthy = value === "yes" || value === "y";
      if (spec.boolAsFlag) {
        args.push(truthy ? `--${spec.flag}` : `--no-${spec.flag}`);
      } else {
        args.push(`--${spec.flag}`, truthy ? "true" : "false");
      }
      parts.push(`${spec.flag}=${truthy}`);
      continue;
    }

    const valid =
      spec.kind === "enum"
        ? spec.choices?.includes(value) === true
        : spec.kind === "id"
          ? /^[A-Za-z0-9_-]{1,64}$/.test(value)
          : (spec.allowMinusOne && value === "-1") || (/^\d+(?:\.\d+)?$/.test(value) && Number(value) > 0);
    if (!valid) return undefined;
    args.push(`--${spec.flag}`, value);
    parts.push(`${spec.flag}=${value}`);
  }
  return { args, summary: parts.length ? `; ${parts.join("; ")}` : "" };
}
