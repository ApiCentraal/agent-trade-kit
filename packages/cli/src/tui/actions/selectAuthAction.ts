/**
 * FILE: selectAuthAction.ts
 * PURPOSE: Expose existing OAuth status, login, and logout flows with visible side-effect confirmations.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises
 * RULES:
 * - Auth commands may install, remove, or refresh a local helper; each filesystem/session change requires an exact confirmation.
 */
import type { Interface } from "node:readline/promises";

/**
 * PURPOSE: Return a chosen auth command only after the user acknowledges helper refresh or logout effects.
 * INPUT:
 * - input: Interface — prompt channel for auth action and confirmation
 * OUTPUT:
 * - Promise<string[] | undefined> — auth CLI arguments, or undefined when the user cancels/returns
 * USES:
 * - Interface.question
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while authentication confirmation is requested.
 * RULES:
 * - Every auth mutation requires its exact install/remove/logout phrase; session status/login additionally require CONTINUE.
 */
export async function selectAuthAction(input: Interface): Promise<string[] | undefined> {
  process.stdout.write("\n  Authentication\n");
  process.stdout.write("  1  Session status\n");
  process.stdout.write("  2  Log in\n");
  process.stdout.write("  3  Log out\n");
  process.stdout.write("  4  Install/refresh auth helper\n");
  process.stdout.write("  5  Remove auth helper\n");
  const choice = (await input.question("  Choose 1–5, or Q to return: ")).trim().toLowerCase();
  if (choice === "q") return undefined;

  let action = "";
  if (choice === "1") action = "status";
  if (choice === "2") action = "login";
  if (choice === "3") action = "logout";
  if (choice === "4") action = "install";
  if (choice === "5") action = "remove";
  if (!action) {
    process.stdout.write("  Choose one of the listed authentication actions.\n");
    await input.question("  Press Enter to return to the dashboard...");
    return undefined;
  }

  if (action === "install") {
    const confirmation = await input.question("  This downloads the local auth helper. Type INSTALL AUTH: ");
    if (confirmation !== "INSTALL AUTH") {
      process.stdout.write("  Auth installation cancelled.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
  } else if (action === "remove") {
    const confirmation = await input.question("  This removes the local auth helper. Type REMOVE AUTH: ");
    if (confirmation !== "REMOVE AUTH") {
      process.stdout.write("  Auth helper removal cancelled.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
  } else {
    process.stdout.write("  The CLI may download or refresh its local authentication helper.\n");
    if (action === "logout") {
      const logoutConfirmation = await input.question("  Type LOGOUT to revoke this local session: ");
      if (logoutConfirmation !== "LOGOUT") {
        process.stdout.write("  Logout cancelled.\n");
        await input.question("  Press Enter to return to the dashboard...");
        return undefined;
      }
    }
    const confirmation = await input.question("  Type CONTINUE to run the selected auth command: ");
    if (confirmation !== "CONTINUE") {
      process.stdout.write("  Authentication action cancelled.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
  }

  return ["auth", action];
}
