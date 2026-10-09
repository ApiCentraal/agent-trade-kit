/**
 * FILE: selectBotMutationAction.ts
 * PURPOSE: Create, amend, stop, or close grid/DCA bots with explicit transaction previews.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ./confirmMutation.js, ../collectOptionalParams.js
 * RULES:
 * - Every bot mutation requires a demo/live confirmation; DCA safety-order fields are collected when enabled.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { confirmMutation } from "./confirmMutation.js";
import { collectOptionalParams } from "../collectOptionalParams.js";
import type { OptionalParamSpec } from "../collectOptionalParams.js";
import { askInstrumentId, COMMON_SPOT_IDS, COMMON_SWAP_IDS } from "../askInstrumentId.js";

/**
 * PURPOSE: Build a validated bot lifecycle command and return it only after explicit user confirmation.
 * INPUT:
 * - input: Interface — prompt channel for bot type, parameters, and confirmation
 * - state: TuiDashboardState — selected profile and effective trading mode
 * OUTPUT:
 * - Promise<string[] | undefined> — confirmed CLI arguments or undefined when cancelled/invalid
 * USES:
 * - confirmMutation, collectOptionalParams, Interface.question, TuiDashboardState
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while bot settings are being collected.
 * RULES:
 * - IDs, prices, sizes, leverage, safety-order counts, and directions are validated before command creation.
 */
export async function selectBotMutationAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Bot operations\n");
  process.stdout.write("  1  Create grid bot\n");
  process.stdout.write("  2  Amend grid range or TP/SL\n");
  process.stdout.write("  3  Stop grid bot\n");
  process.stdout.write("  4  Close contract-grid position\n");
  process.stdout.write("  5  Create DCA bot\n");
  process.stdout.write("  6  Stop DCA bot\n");
  const choice = (await input.question("  Choose 1–6, or Q to return: ")).trim().toLowerCase();

  if (choice === "1") {
    const algoOrdType = (await input.question("  Grid type (grid or contract_grid): ")).trim();
    if (algoOrdType !== "grid" && algoOrdType !== "contract_grid") return undefined;
    const instId = await askInstrumentId(input, { suggestions: algoOrdType === "grid" ? COMMON_SPOT_IDS : COMMON_SWAP_IDS });
    const minPx = (await input.question("  Minimum price (positive decimal): ")).trim();
    const maxPx = (await input.question("  Maximum price (positive decimal): ")).trim();
    const gridNum = (await input.question("  Number of grid levels (2–100): ")).trim();
    if (instId === undefined || !/^\d+(?:\.\d+)?$/.test(minPx) || !/^\d+(?:\.\d+)?$/.test(maxPx) || Number(minPx) <= 0 || Number(maxPx) <= Number(minPx) || !/^\d{1,3}$/.test(gridNum) || Number(gridNum) < 2 || Number(gridNum) > 100) return undefined;

    const args = ["bot", "grid", "create", "--instId", instId, "--algoOrdType", algoOrdType, "--minPx", minPx, "--maxPx", maxPx, "--gridNum", gridNum];
    let sizingSummary = "";
    if (algoOrdType === "grid") {
      const sizeBasis = (await input.question("  Size basis (1 quote currency, 2 base currency): ")).trim();
      if (sizeBasis !== "1" && sizeBasis !== "2") return undefined;
      const flag = sizeBasis === "1" ? "quoteSz" : "baseSz";
      const size = (await input.question(`  ${flag === "quoteSz" ? "Quote" : "Base"} size (positive decimal): `)).trim();
      if (!/^\d+(?:\.\d+)?$/.test(size) || Number(size) <= 0) return undefined;
      args.push(`--${flag}`, size);
      sizingSummary = `; ${flag}=${size}`;
    } else {
      const sz = (await input.question("  Contract size (positive decimal): ")).trim();
      const lever = (await input.question("  Leverage (positive decimal): ")).trim();
      const direction = (await input.question("  Direction (long, short, neutral): ")).trim().toLowerCase();
      if (!/^\d+(?:\.\d+)?$/.test(sz) || Number(sz) <= 0 || !/^\d+(?:\.\d+)?$/.test(lever) || Number(lever) <= 0 || !["long", "short", "neutral"].includes(direction)) return undefined;
      args.push("--sz", sz, "--lever", lever, "--direction", direction);
      sizingSummary = `; size=${sz}; leverage=${lever}; direction=${direction}`;
      const contractExtra = await collectOptionalParams(input, [
        { flag: "basePos", label: "Open base position", kind: "bool", boolAsFlag: true },
        { flag: "tpRatio", label: "Take-profit ratio (0.1 = 10%)", kind: "decimal" },
        { flag: "slRatio", label: "Stop-loss ratio (0.1 = 10%)", kind: "decimal" },
      ]);
      if (contractExtra === undefined) return undefined;
      args.push(...contractExtra.args);
      sizingSummary += contractExtra.summary;
    }
    const sharedExtra = await collectOptionalParams(input, [
      { flag: "runType", label: "Grid spacing 1=arithmetic 2=geometric", kind: "enum", choices: ["1", "2"] },
      { flag: "tpTriggerPx", label: "Take-profit trigger price", kind: "decimal" },
      { flag: "slTriggerPx", label: "Stop-loss trigger price", kind: "decimal" },
      { flag: "algoClOrdId", label: "Client order id", kind: "id" },
    ]);
    if (sharedExtra === undefined) return undefined;
    args.push(...sharedExtra.args);
    const confirmation = await confirmMutation(input, state, "CREATE BOT", `Create ${algoOrdType} on ${instId}; range=${minPx}–${maxPx}; levels=${gridNum}${sizingSummary}${sharedExtra.summary}`);
    return confirmation === undefined ? undefined : [...args, ...confirmation];
  }

  if (choice === "2" || choice === "3" || choice === "4") {
    const algoId = (await input.question("  Bot algo id: ")).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(algoId)) return undefined;
    if (choice === "2") {
      const amendMode = (await input.question("  Amend what (1 price range, 2 TP/SL, 3 both): ")).trim();
      if (amendMode !== "1" && amendMode !== "2" && amendMode !== "3") return undefined;
      const args = ["bot", "grid", "amend", "--algoId", algoId];
      let summary = `Amend grid bot ${algoId}`;
      if (amendMode !== "2") {
        const minPx = (await input.question("  New minimum price: ")).trim();
        const maxPx = (await input.question("  New maximum price: ")).trim();
        const gridNum = (await input.question("  New grid levels (2–100): ")).trim();
        if (!/^\d+(?:\.\d+)?$/.test(minPx) || !/^\d+(?:\.\d+)?$/.test(maxPx) || Number(minPx) <= 0 || Number(maxPx) <= Number(minPx) || !/^\d{1,3}$/.test(gridNum) || Number(gridNum) < 2 || Number(gridNum) > 100) return undefined;
        args.push("--minPx", minPx, "--maxPx", maxPx, "--gridNum", gridNum);
        summary += `; range=${minPx}–${maxPx}; levels=${gridNum}`;
      }
      if (amendMode !== "1") {
        const instId = await askInstrumentId(input, { suggestions: [...COMMON_SPOT_IDS, ...COMMON_SWAP_IDS] });
        if (instId === undefined) return undefined;
        args.push("--instId", instId);
        const tpsl = await collectOptionalParams(input, [
          { flag: "tpTriggerPx", label: "New TP trigger price (-1 clears)", kind: "decimal", allowMinusOne: true },
          { flag: "slTriggerPx", label: "New SL trigger price (-1 clears)", kind: "decimal", allowMinusOne: true },
          { flag: "tpRatio", label: "New TP ratio (-1 clears)", kind: "decimal", allowMinusOne: true },
          { flag: "slRatio", label: "New SL ratio (-1 clears)", kind: "decimal", allowMinusOne: true },
        ]);
        if (tpsl === undefined || tpsl.args.length === 0) return undefined;
        args.push(...tpsl.args);
        summary += `; TP/SL on ${instId}${tpsl.summary}`;
      }
      const topUp = await collectOptionalParams(input, [
        { flag: "topUpAmt", label: "Margin top-up amount (contract grid only)", kind: "decimal" },
      ]);
      if (topUp === undefined) return undefined;
      args.push(...topUp.args);
      const confirmation = await confirmMutation(input, state, "AMEND BOT", `${summary}${topUp.summary}`);
      return confirmation === undefined ? undefined : [...args, ...confirmation];
    }
    if (choice === "4") {
      const confirmation = await confirmMutation(input, state, "CLOSE BOT POSITION", `Market-close remaining contract-grid position for bot ${algoId}`);
      return confirmation === undefined
        ? undefined
        : ["bot", "grid", "close-position", "--algoId", algoId, "--mktClose", ...confirmation];
    }
    const algoOrdType = (await input.question("  Grid type (grid, contract_grid, moon_grid): ")).trim();
    const instId = await askInstrumentId(input, { suggestions: [...COMMON_SPOT_IDS, ...COMMON_SWAP_IDS] });
    if (!["grid", "contract_grid", "moon_grid"].includes(algoOrdType) || instId === undefined) return undefined;
    const stopType = (await input.question("  Stop mode (1 or 2): ")).trim();
    if (stopType !== "1" && stopType !== "2") return undefined;
    const confirmation = await confirmMutation(input, state, "STOP BOT", `Stop ${algoOrdType} bot ${algoId} on ${instId} with stop mode ${stopType}`);
    return confirmation === undefined
      ? undefined
      : ["bot", "grid", "stop", "--algoId", algoId, "--algoOrdType", algoOrdType, "--instId", instId, "--stopType", stopType, ...confirmation];
  }

  if (choice === "5") {
    const algoOrdType = (await input.question("  DCA type (spot_dca or contract_dca): ")).trim();
    const instId = await askInstrumentId(input, { suggestions: algoOrdType === "spot_dca" ? COMMON_SPOT_IDS : COMMON_SWAP_IDS });
    const direction = (await input.question("  Direction (long or short): ")).trim().toLowerCase();
    const initOrdAmt = (await input.question("  Initial order amount (positive decimal): ")).trim();
    const maxSafetyOrds = (await input.question("  Safety orders (0–100): ")).trim();
    const tpPct = (await input.question("  Take-profit ratio (0.03 = 3%): ")).trim();
    if ((algoOrdType !== "spot_dca" && algoOrdType !== "contract_dca") || instId === undefined || !["long", "short"].includes(direction) || !/^\d+(?:\.\d+)?$/.test(initOrdAmt) || Number(initOrdAmt) <= 0 || !/^\d{1,3}$/.test(maxSafetyOrds) || Number(maxSafetyOrds) > 100 || !/^\d+(?:\.\d+)?$/.test(tpPct) || Number(tpPct) <= 0) return undefined;

    const args = ["bot", "dca", "create", "--algoOrdType", algoOrdType, "--instId", instId, "--direction", direction, "--initOrdAmt", initOrdAmt, "--maxSafetyOrds", maxSafetyOrds, "--tpPct", tpPct];
    let sizeSummary = "";
    if (algoOrdType === "contract_dca") {
      const lever = (await input.question("  Leverage (positive decimal): ")).trim();
      if (!/^\d+(?:\.\d+)?$/.test(lever) || Number(lever) <= 0) return undefined;
      args.push("--lever", lever);
      sizeSummary = `; leverage=${lever}`;
    }
    if (Number(maxSafetyOrds) > 0) {
      const safetyOrdAmt = (await input.question("  Safety order amount (positive decimal): ")).trim();
      const pxSteps = (await input.question("  Price steps (positive decimal): ")).trim();
      const pxStepsMult = (await input.question("  Price-step multiplier (positive decimal): ")).trim();
      const volMult = (await input.question("  Volume multiplier (positive decimal): ")).trim();
      if (!/^\d+(?:\.\d+)?$/.test(safetyOrdAmt) || Number(safetyOrdAmt) <= 0 || !/^\d+(?:\.\d+)?$/.test(pxSteps) || Number(pxSteps) <= 0 || !/^\d+(?:\.\d+)?$/.test(pxStepsMult) || Number(pxStepsMult) <= 0 || !/^\d+(?:\.\d+)?$/.test(volMult) || Number(volMult) <= 0) return undefined;
      args.push("--safetyOrdAmt", safetyOrdAmt, "--pxSteps", pxSteps, "--pxStepsMult", pxStepsMult, "--volMult", volMult);
      sizeSummary += `; safety amount=${safetyOrdAmt}; steps=${pxSteps}`;
    }

    const slExtra = await collectOptionalParams(input, [
      { flag: "slPct", label: "Stop-loss ratio (0.05 = 5%)", kind: "decimal" },
    ]);
    if (slExtra === undefined) return undefined;
    args.push(...slExtra.args);
    sizeSummary += slExtra.summary;
    if (slExtra.args.length > 0) {
      const slMode = await collectOptionalParams(input, [
        { flag: "slMode", label: "Stop-loss mode", kind: "enum", choices: ["limit", "market"] },
      ]);
      if (slMode === undefined) return undefined;
      args.push(...slMode.args);
      sizeSummary += slMode.summary;
    }

    const triggerStrategies = algoOrdType === "spot_dca" ? ["instant", "rsi"] : ["instant", "price", "rsi"];
    const triggerStrategy = (await input.question(`  Trigger strategy (${triggerStrategies.join("/")}; blank = instant): `)).trim().toLowerCase();
    if (triggerStrategy && !triggerStrategies.includes(triggerStrategy)) return undefined;
    if (triggerStrategy && triggerStrategy !== "instant") {
      args.push("--triggerStrategy", triggerStrategy);
      sizeSummary += `; trigger=${triggerStrategy}`;
      if (triggerStrategy === "price") {
        const triggerPx = (await input.question("  Trigger price (positive decimal): ")).trim();
        if (!/^\d+(?:\.\d+)?$/.test(triggerPx) || Number(triggerPx) <= 0) return undefined;
        args.push("--triggerPx", triggerPx);
        sizeSummary += `; triggerPx=${triggerPx}`;
      }
      const condSpec: OptionalParamSpec = { flag: "triggerCond", label: "Trigger condition", kind: "enum", choices: ["cross_up", "cross_down"] };
      const triggerParams: OptionalParamSpec[] = triggerStrategy === "rsi"
        ? [condSpec,
            { flag: "thold", label: "RSI threshold (for example 30)", kind: "decimal" },
            { flag: "timeframe", label: "RSI timeframe (for example 15m)", kind: "id" },
            { flag: "timePeriod", label: "RSI period", kind: "decimal" }]
        : [condSpec];
      const collected = await collectOptionalParams(input, triggerParams);
      if (collected === undefined) return undefined;
      const required = triggerStrategy === "rsi" ? ["--triggerCond", "--thold", "--timeframe"] : [];
      if (required.some((f) => !collected.args.includes(f))) {
        process.stdout.write("  RSI triggers require condition, threshold, and timeframe.\n");
        await input.question("  Press Enter to return to the dashboard...");
        return undefined;
      }
      args.push(...collected.args);
      sizeSummary += collected.summary;
    }

    const misc = await collectOptionalParams(input, [
      { flag: "allowReinvest", label: "Allow reinvestment", kind: "bool" },
      ...(algoOrdType === "spot_dca" ? [{ flag: "reserveFunds", label: "Reserve funds for safety orders", kind: "bool" as const }] : []),
      { flag: "tradeQuoteCcy", label: "Trade quote currency", kind: "id" },
      { flag: "algoClOrdId", label: "Client order id", kind: "id" },
    ]);
    if (misc === undefined) return undefined;
    args.push(...misc.args);
    const confirmation = await confirmMutation(input, state, "CREATE BOT", `Create ${algoOrdType} on ${instId}; direction=${direction}; initial amount=${initOrdAmt}; safety orders=${maxSafetyOrds}; TP=${tpPct}${sizeSummary}${misc.summary}`);
    return confirmation === undefined ? undefined : [...args, ...confirmation];
  }

  if (choice === "6") {
    const algoOrdType = (await input.question("  DCA type (spot_dca or contract_dca): ")).trim();
    const algoId = (await input.question("  DCA algo id: ")).trim();
    if ((algoOrdType !== "spot_dca" && algoOrdType !== "contract_dca") || !/^[A-Za-z0-9_-]{1,64}$/.test(algoId)) return undefined;
    const args = ["bot", "dca", "stop", "--algoOrdType", algoOrdType, "--algoId", algoId];
    if (algoOrdType === "spot_dca") {
      const stopType = (await input.question("  Stop mode (1 sell all, 2 keep tokens): ")).trim();
      if (stopType !== "1" && stopType !== "2") return undefined;
      args.push("--stopType", stopType);
    }
    const confirmation = await confirmMutation(input, state, "STOP BOT", `Stop ${algoOrdType} bot ${algoId}`);
    return confirmation === undefined ? undefined : [...args, ...confirmation];
  }

  return undefined;
}
