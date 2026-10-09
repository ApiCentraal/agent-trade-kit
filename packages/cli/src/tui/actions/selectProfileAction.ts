/**
 * FILE: selectProfileAction.ts
 * PURPOSE: List configured profile names, switch the default, or launch the interactive credential wizard.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js
 * RULES:
 * - Never display credential material; profile switches require an indexed existing profile and an exact SWITCH confirmation, and credential setup only launches the existing CLI wizard.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";

/**
 * PURPOSE: Let the user inspect profile names or request a validated default-profile switch.
 * INPUT:
 * - input: Interface — prompt channel for profile actions and selection
 * - state: TuiDashboardState — configured profile names and active profile
 * OUTPUT:
 * - Promise<string[] | undefined> — config command arguments, or undefined for display/help/back actions
 * USES:
 * - Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while a profile action is awaiting confirmation.
 * RULES:
 * - Profile listing reveals names only; switching requires a 1-based index and exact SWITCH confirmation.
 * - Credential secrets are collected solely by the spawned `config init` wizard, never echoed into TUI state.
 */
export async function selectProfileAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Profile manager\n");
  process.stdout.write("  1  List configured profiles\n");
  process.stdout.write("  2  Switch active profile\n");
  process.stdout.write("  3  Credential setup wizard\n");
  const choice = (await input.question("  Choose 1–3, or Q to return: ")).trim().toLowerCase();

  if (choice === "1" || choice === "2") {
    if (state.profileNames.length === 0) {
      process.stdout.write("  No profiles are configured. Use option 3 to run the credential setup wizard.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }

    let index = 0;
    for (const profileName of state.profileNames) {
      const safeName = profileName.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
      const marker = profileName === state.activeProfile ? "  (active)" : "";
      process.stdout.write(`  ${index + 1}. ${safeName}${marker}\n`);
      index += 1;
    }

    if (choice === "1") {
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }

    const requested = Number((await input.question("  Profile number to activate: ")).trim());
    if (!Number.isInteger(requested) || requested < 1 || requested > state.profileNames.length) {
      process.stdout.write("  Select one of the listed profile numbers.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const profileName = state.profileNames[requested - 1];
    if (profileName === undefined) return undefined;
    const safeName = profileName.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
    const confirmation = await input.question(`  Set "${safeName}" as default? Type SWITCH: `);
    if (confirmation !== "SWITCH") {
      process.stdout.write("  Profile switch cancelled.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    return ["config", "use", profileName];
  }

  if (choice === "3") {
    process.stdout.write("  The wizard asks for site, demo/live mode, profile name, and API credentials,\n");
    process.stdout.write("  then writes ~/.okx/config.toml. Secrets are entered in the child wizard only.\n");
    const confirmation = await input.question("  Type SETUP to start the credential wizard: ");
    if (confirmation !== "SETUP") {
      process.stdout.write("  Credential setup cancelled.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    return ["config", "init"];
  }

  return undefined;
}
