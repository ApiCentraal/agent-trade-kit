/**
 * FILE: selectClientAction.ts
 * PURPOSE: Inspect detected MCP clients or configure a supported client with a least-privilege or approved full scope.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ../../commands/client-setup.js
 * RULES:
 * - Require explicit confirmation before writing client configuration and a second confirmation for all MCP capabilities.
 */
import type { Interface } from "node:readline/promises";
import { SUPPORTED_CLIENTS } from "../../commands/client-setup.js";
import type { ClientId } from "../../commands/client-setup.js";
import type { TuiDashboardState } from "../types.js";

/**
 * PURPOSE: Inspect supported clients or return a confirmed setup command with bounded MCP capability scope.
 * INPUT:
 * - input: Interface — prompt channel for client selection and side-effect confirmations
 * - state: TuiDashboardState — profile to attach to the MCP client configuration
 * OUTPUT:
 * - Promise<string[] | undefined> — setup arguments, or undefined when the user cancels or chooses an invalid option
 * USES:
 * - SUPPORTED_CLIENTS, Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while client setup confirmations are requested.
 * RULES:
 * - Market-only is the default least-privilege scope; full access requires the exact phrase ENABLE ALL and every setup requires CONFIGURE.
 */
export async function selectClientAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  MCP client integrations\n");
  process.stdout.write("  1  List detected clients\n");
  process.stdout.write("  2  Configure a client\n");
  const setupChoice = (await input.question("  Choose 1–2, or Q to return: ")).trim().toLowerCase();
  if (setupChoice === "1") return ["config", "setup-clients"];
  if (setupChoice !== "2") return undefined;

  let clientIndex = 0;
  for (const client of SUPPORTED_CLIENTS) {
    process.stdout.write(`  ${clientIndex + 1}. ${client}\n`);
    clientIndex += 1;
  }
  const clientName = (await input.question("  Client id (or Q to return): ")).trim();
  if (clientName.toLowerCase() === "q") return undefined;
  if (!SUPPORTED_CLIENTS.includes(clientName as ClientId)) {
    process.stdout.write("  Choose a client id shown above.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }

  process.stdout.write("\n  Module scope\n");
  process.stdout.write("  1  Market only — public read-only data\n");
  process.stdout.write("  2  All modules — includes account, trading, and funds actions\n");
  const scope = (await input.question("  Choose 1 or 2 (default 1): ")).trim() || "1";
  if (scope !== "1" && scope !== "2") {
    process.stdout.write("  Setup cancelled: choose 1 or 2.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }

  if (scope === "2") {
    const fullAccess = await input.question("  Type ENABLE ALL to allow every MCP module: ");
    if (fullAccess !== "ENABLE ALL") {
      process.stdout.write("  Full-access setup cancelled.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
  }

  const confirmation = await input.question("  This writes the selected client config and may create a backup. Type CONFIGURE: ");
  if (confirmation !== "CONFIGURE") {
    process.stdout.write("  Client setup cancelled.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }

  const modules = scope === "1" ? "market" : "all";
  return ["setup", "--client", clientName, "--profile", state.activeProfile, "--modules", modules];
}
