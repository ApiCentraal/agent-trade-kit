/**
 * FILE: launchTui.ts
 * PURPOSE: Drive the complete interactive, safety-scoped terminal workflow for agent-trade-kit.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ./getDashboardState.js, ./renderDashboard.js, ./runCliCommand.js, ./actions/selectDashboardAction.js
 * RULES:
 * - Data queries remain read-only; financial mutations require mode-aware confirmation in dedicated action flows.
 * - Credential entry runs only inside the spawned `config init` wizard; secrets never pass through TUI state.
 */
import { createInterface } from "node:readline/promises";
import { getDashboardState } from "./getDashboardState.js";
import { renderDashboard } from "./renderDashboard.js";
import { runCliCommand } from "./runCliCommand.js";
import { selectDashboardAction } from "./actions/selectDashboardAction.js";

/**
 * PURPOSE: Keep the control room open while coordinating domain submenus and existing safe CLI workflows.
 * INPUT:
 * - none
 * OUTPUT:
 * - Promise<void> — resolves when the user exits the dashboard
 * USES:
 * - createInterface, getDashboardState, renderDashboard, runCliCommand, selectDashboardAction
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects when configuration cannot be read, a prompt closes unexpectedly, or a child CLI process cannot be started.
 * RULES:
 * - Child commands are launched only from validated action results; credential entry stays outside this dashboard.
 */
export async function launchTui(): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stderr.write("The terminal dashboard requires an interactive TTY.\n");
    process.exitCode = 1;
    return;
  }

  let input = createInterface({ input: process.stdin, output: process.stdout });
  let advanced = false;
  process.stdout.write("\u001b[?25l");

  try {
    while (true) {
      const state = getDashboardState();
      process.stdout.write("\u001b[2J\u001b[H");
      process.stdout.write(renderDashboard(state, advanced));
      const prompt = advanced ? "\n  Choose an action [1–5, B, Q]: " : "\n  Choose an action [1–6, A, Q]: ";
      const choice = (await input.question(prompt)).trim().toLowerCase();
      const selection = await selectDashboardAction(choice, input, state, advanced);
      if (selection.kind === "exit") break;
      if (selection.kind === "toggle-view") { advanced = !advanced; continue; }
      if (selection.kind === "stay") continue;

      input.close();
      process.stdout.write("\u001b[?25h");
      const exitCode = runCliCommand(selection.args);
      input = createInterface({ input: process.stdin, output: process.stdout });
      if (exitCode !== 0) process.stdout.write(`\n  Command exited with code ${exitCode}.\n`);
      await input.question("\n  Press Enter to return to the dashboard...");
    }
  } finally {
    input.close();
    process.stdout.write("\u001b[?25h\u001b[0m\n");
  }
}
