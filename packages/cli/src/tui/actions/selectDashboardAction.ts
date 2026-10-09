/**
 * FILE: selectDashboardAction.ts
 * PURPOSE: Route dashboard selections in either the simple or advanced menu to data, setup, and confirmed workflows.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ./select*Action.js
 * RULES:
 * - Exchange-changing routes are available only through the dedicated mutation selector and its mode-aware exact confirmations.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState, TuiSelectionResult } from "../types.js";
import { selectAccountAction } from "./selectAccountAction.js";
import { selectAuthAction } from "./selectAuthAction.js";
import { selectBotAction } from "./selectBotAction.js";
import { selectClientAction } from "./selectClientAction.js";
import { selectMarketAction } from "./selectMarketAction.js";
import { selectPositionsAction } from "./selectPositionsAction.js";
import { selectProfileAction } from "./selectProfileAction.js";
import { selectSystemAction } from "./selectSystemAction.js";
import { selectYieldInsightsAction } from "./selectYieldInsightsAction.js";
import { selectSkillAction } from "./selectSkillAction.js";
import { selectMutationAction } from "./selectMutationAction.js";

/**
 * PURPOSE: Resolve one top-level dashboard selection into a validated command, submenu stay, or exit.
 * INPUT:
 * - choice: string — normalized top-level key selected by the user
 * - input: Interface — active terminal prompt channel
 * - state: TuiDashboardState — current profile context for command routing
 * - advanced: boolean — whether the advanced menu numbering is active
 * OUTPUT:
 * - Promise<TuiSelectionResult> — child arguments, return-to-dashboard result, or exit result
 * USES:
 * - selectAccountAction, selectAuthAction, selectBotAction, selectClientAction, selectMarketAction, selectMutationAction, selectPositionsAction, selectProfileAction, selectSkillAction, selectSystemAction, selectYieldInsightsAction
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects when a nested prompt closes or a delegated selection flow fails.
 * RULES:
 * - Every exchange mutation routes through selectMutationAction and its mode-aware exact confirmation gate.
 */
export async function selectDashboardAction(
  choice: string,
  input: Interface,
  state: TuiDashboardState,
  advanced = false,
): Promise<TuiSelectionResult> {
  let args: string[] | undefined;

  if (advanced) {
    switch (choice) {
      case "1":
        args = await selectYieldInsightsAction(input, state);
        break;
      case "2":
        args = await selectClientAction(input, state);
        break;
      case "3":
        args = await selectAuthAction(input);
        break;
      case "4":
        args = await selectSystemAction(input);
        break;
      case "5":
        args = await selectSkillAction(input, state);
        break;
      case "b":
        return { kind: "toggle-view" };
      case "q":
        return { kind: "exit" };
      default:
        process.stdout.write("\n  Unknown selection. Choose 1–5, B, or Q.\n");
        await input.question("  Press Enter to return to the dashboard...");
        return { kind: "stay" };
    }
    return args === undefined ? { kind: "stay" } : { kind: "command", args };
  }

  switch (choice) {
    case "1":
      args = await selectAccountAction(input, state);
      break;
    case "2":
      args = await selectPositionsAction(input, state);
      break;
    case "3":
      args = await selectMarketAction(input, state);
      break;
    case "4":
      args = await selectBotAction(input, state);
      break;
    case "5":
      args = await selectMutationAction(input, state);
      break;
    case "6":
      args = await selectProfileAction(input, state);
      break;
    case "a":
      return { kind: "toggle-view" };
    case "q":
      return { kind: "exit" };
    default:
      process.stdout.write("\n  Unknown selection. Choose 1–6, A, or Q.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return { kind: "stay" };
  }

  return args === undefined ? { kind: "stay" } : { kind: "command", args };
}
