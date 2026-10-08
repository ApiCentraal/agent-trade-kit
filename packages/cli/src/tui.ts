/**
 * FILE: tui.ts
 * PURPOSE: Start the standalone interactive terminal dashboard executable.
 * LAYER: controller
 * DEPENDS_ON: ./tui/launchTui.js
 * RULES:
 * - Report startup failures to stderr and use a failing process exit code without printing configuration secrets.
 */
import { launchTui } from "./tui/launchTui.js";

try {
  await launchTui();
} catch {
  process.stderr.write("Unable to start the terminal dashboard because configuration or terminal access failed.\n");
  process.exitCode = 1;
}
