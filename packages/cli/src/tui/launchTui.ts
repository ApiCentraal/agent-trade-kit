/**
 * FILE: launchTui.ts
 * PURPOSE: Drive the interactive terminal control room: multi-pane dashboard on large terminals, compact dashboard elsewhere.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ./getDashboardState.js, ./renderDashboard.js, ./runCliCommand.js, ./runCliCommandCaptured.js, ./isInteractiveArgs.js, ./refreshTickers.js, ./actions/selectDashboardAction.js, ./screen/renderScreen.js, ./screen/sessionLog.js, ./screen/usePaneLayout.js, ./screen/navDispatch.js, ./wizard/runBotWizard.js
 * RULES:
 * - Financial mutations keep their exact mode-aware confirmation; pane layout is presentation only.
 * - Credential entry runs only inside the spawned `config init` wizard; secrets never pass through TUI state.
 */
import { createInterface } from "node:readline/promises";
import { getDashboardState } from "./getDashboardState.js";
import { renderDashboard } from "./renderDashboard.js";
import { runCliCommand } from "./runCliCommand.js";
import { runCliCommandCaptured } from "./runCliCommandCaptured.js";
import { isInteractiveArgs } from "./isInteractiveArgs.js";
import { refreshTickers } from "./refreshTickers.js";
import { selectDashboardAction } from "./actions/selectDashboardAction.js";
import { renderScreen } from "./screen/renderScreen.js";
import { SessionLog } from "./screen/sessionLog.js";
import { usePaneLayout } from "./screen/usePaneLayout.js";
import { dispatchNavKey } from "./screen/navDispatch.js";
import { runBotWizard } from "./wizard/runBotWizard.js";
import type { TuiWizardDraft } from "./types.js";

/**
 * PURPOSE: Keep the control room open while coordinating domain submenus and existing safe CLI workflows.
 * INPUT:
 * - none
 * OUTPUT:
 * - Promise<void> — resolves when the user exits the dashboard
 * USES:
 * - createInterface, getDashboardState, renderDashboard, renderScreen, runCliCommand, runCliCommandCaptured, dispatchNavKey, runBotWizard, refreshTickers
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects when configuration cannot be read, a prompt closes unexpectedly, or a child CLI process cannot be started.
 * RULES:
 * - Child commands run only from validated action results; interactive children inherit the terminal, the rest are captured into the log pane.
 */
export async function launchTui(): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stderr.write("The terminal dashboard requires an interactive TTY.\n");
    process.exitCode = 1;
    return;
  }
  if (!usePaneLayout()) {
    await launchCompactDashboard();
    return;
  }
  await launchPaneDashboard();
}

/**
 * PURPOSE: Run the legacy single-box dashboard loop for small or non-capable terminals.
 * INPUT:
 * - none
 * OUTPUT:
 * - Promise<void> — resolves on exit
 * USES:
 * - getDashboardState, renderDashboard, selectDashboardAction, runCliCommand
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects on config read or prompt failures.
 * RULES:
 * - Identical behavior to the pre-pane dashboard; kept as the always-available fallback.
 */
async function launchCompactDashboard(): Promise<void> {
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

/**
 * PURPOSE: Run the multi-pane control-room loop: pane render → key selection → flow → captured result in the log pane.
 * INPUT:
 * - none
 * OUTPUT:
 * - Promise<void> — resolves on exit
 * USES:
 * - getDashboardState, renderScreen, SessionLog, dispatchNavKey, runBotWizard, refreshTickers, runCliCommand, runCliCommandCaptured, isInteractiveArgs
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects on config read or prompt failures.
 * RULES:
 * - Sidebar keys trigger flows; w opens the bot wizard; l opens fullscreen logs; r refreshes tickers; q exits.
 */
async function launchPaneDashboard(): Promise<void> {
  const log = new SessionLog();
  let tickers: string[] = [];
  let latencyMs: number | undefined;
  let input = createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write("\u001b[?25l");

  const draw = (draft: TuiWizardDraft | undefined, step: number, hint: string | undefined, intentText?: string): void => {
    const state = getDashboardState();
    process.stdout.write("\u001b[2J\u001b[H");
    process.stdout.write(
      renderScreen({
        state,
        logEntries: log.tail(6),
        wizardDraft: draft,
        wizardStep: step,
        wizardHint: hint,
        intentText,
        tickers,
        latencyMs,
        clock: new Date().toTimeString().slice(0, 8),
        columns: process.stdout.columns ?? 120,
        rows: process.stdout.rows ?? 40,
      }),
    );
  };

  const KNOWN_KEYS = new Set(["w", "l", "r", "q", "1", "2", "4", "5", "6", "7", "8", "9", "0", "a", "b", "c", "e", "f", "g", "h", "k"]);

  log.add("info", "dashboard ready — select a key or describe a bot to begin");
  try {
    while (true) {
      draw(undefined, -1, undefined);
      const raw = (await input.question("  › ")).trim();
      const choice = raw.toLowerCase();
      if (choice === "q") break;

      if (choice === "l") {
        process.stdout.write("\u001b[2J\u001b[H");
        process.stdout.write("  Session log\n\n");
        for (const entry of log.all()) {
          process.stdout.write(`  ${entry.time} ${entry.level.toUpperCase().padEnd(5)} ${entry.text}\n`);
        }
        await input.question("\n  Press Enter to return to the dashboard...");
        continue;
      }

      if (choice === "r") {
        const started = Date.now();
        tickers = refreshTickers(log);
        latencyMs = Date.now() - started;
        continue;
      }

      const isWizard = choice === "w" || (!KNOWN_KEYS.has(choice) && raw.length > 2);
      const args = isWizard
        ? await runBotWizard(input, getDashboardState(), draw, choice === "w" ? undefined : raw)
        : await dispatchNavKey(choice, input, getDashboardState());

      if (args === undefined) {
        if (choice) log.add("warn", `no action for key "${choice}"`);
        continue;
      }

      if (isInteractiveArgs(args)) {
        input.close();
        process.stdout.write("\u001b[2J\u001b[H\u001b[?25h");
        const exitCode = runCliCommand(args);
        log.add(exitCode === 0 ? "info" : "error", `${args.join(" ")} exited ${exitCode} (interactive)`);
        input = createInterface({ input: process.stdin, output: process.stdout });
        process.stdout.write("\u001b[?25l");
        await input.question("\n  Press Enter to return to the dashboard...");
        continue;
      }

      const result = runCliCommandCaptured(args);
      log.add("info", `$ okx ${args.join(" ")}`);
      for (const line of result.lines) {
        log.add(result.exitCode === 0 ? "info" : "error", line);
      }
      log.add(result.exitCode === 0 ? "info" : "error", `exit ${result.exitCode} — L for full log`);
    }
  } finally {
    input.close();
    process.stdout.write("\u001b[?25h\u001b[0m\n");
  }
}
