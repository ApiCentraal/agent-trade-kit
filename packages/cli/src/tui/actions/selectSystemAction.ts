/**
 * FILE: selectSystemAction.ts
 * PURPOSE: Offer local diagnostics, remote version checks, and confirmed package/Pilot lifecycle management.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises
 * RULES:
 * - Maintenance changes require exact user confirmation; no install, removal, or upgrade runs directly from an unconfirmed selection.
 */
import type { Interface } from "node:readline/promises";

/**
 * PURPOSE: Route health checks or explicitly confirmed Pilot and package maintenance to existing CLI commands.
 * INPUT:
 * - input: Interface — prompt channel for the selected maintenance query
 * OUTPUT:
 * - Promise<string[] | undefined> — CLI arguments or undefined when returning/choosing an invalid option
 * USES:
 * - Interface.question
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while a maintenance query is being selected.
 * RULES:
 * - Upgrade, Pilot install, and Pilot removal each require their exact confirmation phrase before command arguments are returned.
 */
export async function selectSystemAction(input: Interface): Promise<string[] | undefined> {
  process.stdout.write("\n  Health & maintenance\n");
  process.stdout.write("  1  CLI diagnostics\n");
  process.stdout.write("  2  CLI + MCP diagnostics\n");
  process.stdout.write("  3  Pilot runtime status\n");
  process.stdout.write("  4  Check for CLI updates (no install)\n");
  process.stdout.write("  5  Upgrade CLI + MCP packages\n");
  process.stdout.write("  6  Install/refresh Pilot helper\n");
  process.stdout.write("  7  Remove Pilot helper\n");
  const choice = (await input.question("  Choose 1–7, or Q to return: ")).trim().toLowerCase();

  switch (choice) {
    case "1":
      return ["diagnose", "--cli"];
    case "2":
      return ["diagnose", "--all"];
    case "3":
      return ["pilot", "status"];
    case "4":
      return ["upgrade", "--check"];
    case "5": {
      const confirmation = await input.question("  This installs global CLI/MCP packages. Type UPGRADE: ");
      if (confirmation === "UPGRADE") return ["upgrade", "--force"];
      process.stdout.write("  Package upgrade cancelled.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    case "6": {
      const confirmation = await input.question("  This downloads/updates the Pilot helper. Type INSTALL PILOT: ");
      if (confirmation === "INSTALL PILOT") return ["pilot", "install"];
      process.stdout.write("  Pilot installation cancelled.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    case "7": {
      const confirmation = await input.question("  This deletes the local Pilot helper. Type REMOVE PILOT: ");
      if (confirmation === "REMOVE PILOT") return ["pilot", "remove"];
      process.stdout.write("  Pilot removal cancelled.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    default:
      return undefined;
  }
}
