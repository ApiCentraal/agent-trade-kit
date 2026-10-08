/**
 * FILE: tui.test.ts
 * PURPOSE: Verify safe query routing, financial-operation confirmations, and secret-free dashboard output.
 * LAYER: util
 * DEPENDS_ON: node:assert/strict, node:test, node:readline/promises, node:stream, node:timers/promises, ../src/tui
 * RULES:
 * - Use synthetic state and in-memory prompt streams; tests must never read credentials, run child commands, or contact APIs.
 */
import assert from "node:assert/strict";
import { createInterface } from "node:readline/promises";
import { PassThrough } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { renderDashboard } from "../src/tui/renderDashboard.js";
import { confirmMutation } from "../src/tui/actions/confirmMutation.js";
import { selectAlgoOrderMutationAction } from "../src/tui/actions/selectAlgoOrderMutationAction.js";
import { selectBatchOrderMutationAction } from "../src/tui/actions/selectBatchOrderMutationAction.js";
import { selectAccountAction } from "../src/tui/actions/selectAccountAction.js";
import { selectAccountMutationAction } from "../src/tui/actions/selectAccountMutationAction.js";
import { selectBotAction } from "../src/tui/actions/selectBotAction.js";
import { selectBotMutationAction } from "../src/tui/actions/selectBotMutationAction.js";
import { selectEarnAction } from "../src/tui/actions/selectEarnAction.js";
import { selectEventMarketAction } from "../src/tui/actions/selectEventMarketAction.js";
import { selectIndicatorAction } from "../src/tui/actions/selectIndicatorAction.js";
import { selectMarketAction } from "../src/tui/actions/selectMarketAction.js";
import { selectMarketAnalyticsAction } from "../src/tui/actions/selectMarketAnalyticsAction.js";
import { selectNewsAction } from "../src/tui/actions/selectNewsAction.js";
import { selectOrderMutationAction } from "../src/tui/actions/selectOrderMutationAction.js";
import { selectPositionsAction } from "../src/tui/actions/selectPositionsAction.js";
import { selectProfileAction } from "../src/tui/actions/selectProfileAction.js";
import { selectSkillAction } from "../src/tui/actions/selectSkillAction.js";
import { selectSmartMoneyAction } from "../src/tui/actions/selectSmartMoneyAction.js";
import { selectYieldInsightsAction } from "../src/tui/actions/selectYieldInsightsAction.js";
import type { TuiDashboardState } from "../src/tui/types.js";

/**
 * PURPOSE: Ensure dashboard queries map safely and financial writes require exact demo/live confirmations.
 * INPUT:
 * - none
 * OUTPUT:
 * - Promise<void> — resolves after screen, query-route, and transaction-confirmation assertions pass
 * USES:
 * - renderDashboard, confirmMutation, and focused account/market/order/transfer selector functions
 * EFFECT:
 * - none
 * ERRORS:
 * - Throws an assertion error when safe routes, mode flags, mutation confirmations, or secret redaction regress.
 * RULES:
 * - All prompt streams are in-memory and returned CLI commands are asserted without invoking the command runner.
 */
async function testDashboardSummaryAndGuardedRoutes(): Promise<void> {
  const state: TuiDashboardState = {
    version: "1.4.8",
    activeProfile: "demo",
    mode: "DEMO",
    credentialsReady: true,
    configPath: "C:/Users/test/.okx/config.toml",
    profileNames: ["demo", "live", "paper", "alpha", "beta"],
  };
  const screen = renderDashboard(state);
  const advancedScreen = renderDashboard(state, true);

  assert.match(screen, /AGENT TRADE KIT/);
  assert.match(screen, /Account overview/);
  assert.match(screen, /Positions & activity/);
  assert.match(screen, /Market data/);
  assert.match(screen, /Trading bot monitor/);
  assert.match(screen, /Trading & funds operations/);
  assert.match(screen, /Advanced tools/);
  assert.doesNotMatch(screen, /Yield & insights/);
  assert.doesNotMatch(screen, /Tools & skills/);
  assert.match(advancedScreen, /Yield & insights/);
  assert.match(advancedScreen, /Tools & skills/);
  assert.match(advancedScreen, /Authentication/);
  assert.match(advancedScreen, /Back to simple menu/);
  assert.match(screen, /Financial actions preview first/);
  assert.doesNotMatch(screen, /api_key|secret_key|passphrase/i);

  const accountSource = new PassThrough();
  const accountInput = createInterface({ input: accountSource, output: new PassThrough() });
  const accountSelection = selectAccountAction(accountInput, state);
  accountSource.write("1\n");
  assert.deepEqual(await accountSelection, ["account", "balance-all", "--profile", "demo"]);
  accountInput.close();

  const sizingSource = new PassThrough();
  const sizingInput = createInterface({ input: sizingSource, output: new PassThrough() });
  const sizingSelection = selectAccountAction(sizingInput, state);
  sizingSource.write("7\n");
  await delay(0);
  sizingSource.write("5\n");
  await delay(0);
  sizingSource.write("cross\n");
  assert.deepEqual(await sizingSelection, ["account", "max-size", "--instId", "BTC-USDT-SWAP", "--tdMode", "cross", "--profile", "demo"]);
  sizingInput.close();

  const marketSource = new PassThrough();
  const marketInput = createInterface({ input: marketSource, output: new PassThrough() });
  const marketSelection = selectMarketAction(marketInput, state);
  marketSource.write("1\n");
  await delay(0);
  marketSource.write("1\n");
  assert.deepEqual(await marketSelection, ["market", "ticker", "BTC-USDT", "--profile", "demo"]);
  marketInput.close();

  const analyticsSource = new PassThrough();
  const analyticsInput = createInterface({ input: analyticsSource, output: new PassThrough() });
  const analyticsSelection = selectMarketAnalyticsAction(analyticsInput, state);
  analyticsSource.write("6\n");
  await delay(0);
  analyticsSource.write("SWAP\n");
  await delay(0);
  analyticsSource.write("volUsd24h\n");
  assert.deepEqual(await analyticsSelection, ["market", "filter", "--instType", "SWAP", "--sortBy", "volUsd24h", "--sortOrder", "desc", "--limit", "20", "--profile", "demo"]);
  analyticsInput.close();

  const eventSource = new PassThrough();
  const eventInput = createInterface({ input: eventSource, output: new PassThrough() });
  const eventSelection = selectEventMarketAction(eventInput, state);
  eventSource.write("1\n");
  await delay(0);
  eventSource.write("BTC\n");
  assert.deepEqual(await eventSelection, ["event", "browse", "--underlying", "BTC", "--profile", "demo"]);
  eventInput.close();

  const indicatorSource = new PassThrough();
  const indicatorInput = createInterface({ input: indicatorSource, output: new PassThrough() });
  const indicatorSelection = selectIndicatorAction(indicatorInput, state);
  indicatorSource.write("2\n");
  await delay(0);
  indicatorSource.write("rsi\n");
  await delay(0);
  indicatorSource.write("5\n");
  await delay(0);
  indicatorSource.write("1H\n");
  assert.deepEqual(await indicatorSelection, ["market", "indicator", "rsi", "BTC-USDT-SWAP", "--bar", "1H", "--limit", "20", "--profile", "demo"]);
  indicatorInput.close();

  const positionsSource = new PassThrough();
  const positionsInput = createInterface({ input: positionsSource, output: new PassThrough() });
  const positionsSelection = selectPositionsAction(positionsInput, state);
  positionsSource.write("7\n");
  await delay(0);
  positionsSource.write("3\n");
  assert.deepEqual(await positionsSelection, ["futures", "orders", "--history", "--profile", "demo"]);
  positionsInput.close();

  const eventOrdersSource = new PassThrough();
  const eventOrdersInput = createInterface({ input: eventOrdersSource, output: new PassThrough() });
  const eventOrdersSelection = selectPositionsAction(eventOrdersInput, state);
  eventOrdersSource.write("7\n");
  await delay(0);
  eventOrdersSource.write("5\n");
  assert.deepEqual(await eventOrdersSelection, ["event", "orders", "--status", "history", "--profile", "demo"]);
  eventOrdersInput.close();

  const botSource = new PassThrough();
  const botInput = createInterface({ input: botSource, output: new PassThrough() });
  const botSelection = selectBotAction(botInput, state);
  botSource.write("1\n");
  await delay(0);
  botSource.write("contract_grid\n");
  await delay(0);
  botSource.write("2\n");
  assert.deepEqual(await botSelection, ["bot", "grid", "orders", "--algoOrdType", "contract_grid", "--history", "--profile", "demo"]);
  botInput.close();

  const earnSource = new PassThrough();
  const earnInput = createInterface({ input: earnSource, output: new PassThrough() });
  const earnSelection = selectEarnAction(earnInput, state);
  earnSource.write("3\n");
  await delay(0);
  earnSource.write("USDT\n");
  assert.deepEqual(await earnSelection, ["earn", "savings", "rate-history", "--limit", "20", "--ccy", "USDT", "--profile", "demo"]);
  earnInput.close();

  const autoEarnSource = new PassThrough();
  const autoEarnInput = createInterface({ input: autoEarnSource, output: new PassThrough() });
  const autoEarnSelection = selectEarnAction(autoEarnInput, state);
  autoEarnSource.write("9\n");
  await delay(0);
  autoEarnSource.write("USDT\n");
  assert.deepEqual(await autoEarnSelection, ["earn", "auto-earn", "status", "USDT", "--profile", "demo"]);
  autoEarnInput.close();

  const insightsSource = new PassThrough();
  const insightsInput = createInterface({ input: insightsSource, output: new PassThrough() });
  const insightsSelection = selectYieldInsightsAction(insightsInput, state);
  insightsSource.write("2\n");
  await delay(0);
  insightsSource.write("3\n");
  await delay(0);
  insightsSource.write("Bitcoin\n");
  assert.deepEqual(await insightsSelection, ["news", "search", "--keyword", "Bitcoin", "--limit", "20", "--profile", "demo"]);
  insightsInput.close();

  const smartMoneySource = new PassThrough();
  const smartMoneyInput = createInterface({ input: smartMoneySource, output: new PassThrough() });
  const smartMoneySelection = selectSmartMoneyAction(smartMoneyInput, state);
  smartMoneySource.write("7\n");
  assert.deepEqual(await smartMoneySelection, ["smartmoney", "signal-overview-by-filter", "--period", "7", "--profile", "demo"]);
  smartMoneyInput.close();

  const orderSource = new PassThrough();
  const orderInput = createInterface({ input: orderSource, output: new PassThrough() });
  const orderSelection = selectOrderMutationAction(orderInput, state);
  orderSource.write("1\n");
  await delay(0);
  orderSource.write("1\n");
  await delay(0);
  orderSource.write("1\n");
  await delay(0);
  orderSource.write("buy\n");
  await delay(0);
  orderSource.write("limit\n");
  await delay(0);
  orderSource.write("0.01\n");
  await delay(0);
  orderSource.write("65000\n");
  await delay(0);
  orderSource.write("n\n");
  await delay(0);
  orderSource.write("n\n");
  await delay(0);
  orderSource.write("CONFIRM DEMO PLACE ORDER\n");
  assert.deepEqual(await orderSelection, ["spot", "place", "--instId", "BTC-USDT", "--tdMode", "cash", "--side", "buy", "--ordType", "limit", "--sz", "0.01", "--px", "65000", "--demo", "--profile", "demo"]);
  orderInput.close();

  const transferSource = new PassThrough();
  const transferInput = createInterface({ input: transferSource, output: new PassThrough() });
  const transferSelection = selectAccountMutationAction(transferInput, state);
  transferSource.write("1\n");
  await delay(0);
  transferSource.write("USDT\n");
  await delay(0);
  transferSource.write("10\n");
  await delay(0);
  transferSource.write("6\n");
  await delay(0);
  transferSource.write("18\n");
  await delay(0);
  transferSource.write("\n");
  await delay(0);
  transferSource.write("CONFIRM DEMO TRANSFER FUNDS\n");
  assert.deepEqual(await transferSelection, ["account", "transfer", "--ccy", "USDT", "--amt", "10", "--from", "6", "--to", "18", "--demo", "--profile", "demo"]);
  transferInput.close();

  const cancelConfirmationSource = new PassThrough();
  const cancelConfirmationInput = createInterface({ input: cancelConfirmationSource, output: new PassThrough() });
  const cancelledMutation = confirmMutation(cancelConfirmationInput, state, "PLACE ORDER", "test order");
  cancelConfirmationSource.write("CONFIRM LIVE PLACE ORDER\n");
  await delay(0);
  cancelConfirmationSource.write("\n");
  assert.equal(await cancelledMutation, undefined);
  cancelConfirmationInput.close();

  const liveState: TuiDashboardState = { ...state, mode: "LIVE" };
  const liveConfirmationSource = new PassThrough();
  const liveConfirmationInput = createInterface({ input: liveConfirmationSource, output: new PassThrough() });
  const confirmedLive = confirmMutation(liveConfirmationInput, liveState, "TRANSFER FUNDS", "transfer 10 USDT");
  liveConfirmationSource.write("CONFIRM LIVE TRANSFER FUNDS\n");
  assert.deepEqual(await confirmedLive, ["--live", "--profile", "demo"]);
  liveConfirmationInput.close();

  const unconfiguredState: TuiDashboardState = { ...state, mode: "NOT CONFIGURED", credentialsReady: false };
  const blockedSource = new PassThrough();
  const blockedInput = createInterface({ input: blockedSource, output: new PassThrough() });
  const blockedMutation = confirmMutation(blockedInput, unconfiguredState, "PLACE ORDER", "test order");
  await delay(0);
  blockedSource.write("\n");
  assert.equal(await blockedMutation, undefined);
  blockedInput.close();

  const algoSource = new PassThrough();
  const algoInput = createInterface({ input: algoSource, output: new PassThrough() });
  const algoSelection = selectAlgoOrderMutationAction(algoInput, state);
  algoSource.write("1\n");
  await delay(0);
  algoSource.write("2\n");
  await delay(0);
  algoSource.write("1\n");
  await delay(0);
  algoSource.write("oco\n");
  await delay(0);
  algoSource.write("sell\n");
  await delay(0);
  algoSource.write("1\n");
  await delay(0);
  algoSource.write("cross\n");
  await delay(0);
  algoSource.write("70000\n");
  await delay(0);
  algoSource.write("-1\n");
  await delay(0);
  algoSource.write("60000\n");
  await delay(0);
  algoSource.write("-1\n");
  await delay(0);
  algoSource.write("CONFIRM DEMO PLACE ALGO ORDER\n");
  assert.deepEqual(await algoSelection, ["swap", "algo", "place", "--instId", "BTC-USDT-SWAP", "--tdMode", "cross", "--side", "sell", "--ordType", "oco", "--sz", "1", "--tpTriggerPx", "70000", "--tpOrdPx", "-1", "--slTriggerPx", "60000", "--slOrdPx", "-1", "--demo", "--profile", "demo"]);
  algoInput.close();

  const batchSource = new PassThrough();
  const batchInput = createInterface({ input: batchSource, output: new PassThrough() });
  const batchSelection = selectBatchOrderMutationAction(batchInput, state);
  batchSource.write("4\n");
  await delay(0);
  batchSource.write('[{"instId":"BTC-USD-240927-60000-C","ordId":"123"}]\n');
  await delay(0);
  batchSource.write("CONFIRM DEMO BATCH CANCEL ORDERS\n");
  assert.deepEqual(await batchSelection, ["option", "batch-cancel", "--orders", '[{"instId":"BTC-USD-240927-60000-C","ordId":"123"}]', "--demo", "--profile", "demo"]);
  batchInput.close();

  const badJsonSource = new PassThrough();
  const badJsonInput = createInterface({ input: badJsonSource, output: new PassThrough() });
  const badJsonSelection = selectBatchOrderMutationAction(badJsonInput, state);
  badJsonSource.write("1\n");
  await delay(0);
  badJsonSource.write("1\n");
  await delay(0);
  badJsonSource.write("not-json\n");
  assert.equal(await badJsonSelection, undefined);
  badJsonInput.close();

  const profileSource = new PassThrough();
  const profileInput = createInterface({ input: profileSource, output: new PassThrough() });
  const profileSelection = selectProfileAction(profileInput, state);
  profileSource.write("3\n");
  await delay(0);
  profileSource.write("SETUP\n");
  assert.deepEqual(await profileSelection, ["config", "init"]);
  profileInput.close();

  const skillsSource = new PassThrough();
  const skillsInput = createInterface({ input: skillsSource, output: new PassThrough() });
  const skillsSelection = selectSkillAction(skillsInput, state);
  skillsSource.write("7\n");
  await delay(0);
  skillsSource.write("demo-skill\n");
  await delay(0);
  skillsSource.write("INSTALL SKILL\n");
  const skillArgs = await skillsSelection;
  assert.deepEqual(skillArgs, ["skill", "add", "demo-skill", "--profile", "demo"]);
  assert.equal(skillArgs?.includes("--force"), false);
  skillsInput.close();

  const installedSource = new PassThrough();
  const installedInput = createInterface({ input: installedSource, output: new PassThrough() });
  const installedSelection = selectSkillAction(installedInput, state);
  installedSource.write("4\n");
  assert.deepEqual(await installedSelection, ["skill", "list"]);
  installedInput.close();

  const tpSlSource = new PassThrough();
  const tpSlInput = createInterface({ input: tpSlSource, output: new PassThrough() });
  const tpSlSelection = selectOrderMutationAction(tpSlInput, state);
  for (const answer of ["1", "1", "1", "buy", "market", "0.5", "y", "70000", "-1", "y", "55000", "-1"]) {
    tpSlSource.write(`${answer}\n`);
    await delay(0);
  }
  tpSlSource.write("CONFIRM DEMO PLACE ORDER\n");
  assert.deepEqual(await tpSlSelection, ["spot", "place", "--instId", "BTC-USDT", "--tdMode", "cash", "--side", "buy", "--ordType", "market", "--sz", "0.5", "--tpTriggerPx", "70000", "--tpOrdPx", "-1", "--slTriggerPx", "55000", "--slOrdPx", "-1", "--demo", "--profile", "demo"]);
  tpSlInput.close();

  const closeSource = new PassThrough();
  const closeInput = createInterface({ input: closeSource, output: new PassThrough() });
  const closeSelection = selectOrderMutationAction(closeInput, state);
  for (const answer of ["4", "1", "1", "cross", "", "y"]) {
    closeSource.write(`${answer}\n`);
    await delay(0);
  }
  closeSource.write("CONFIRM DEMO CLOSE POSITION\n");
  assert.deepEqual(await closeSelection, ["swap", "close", "--instId", "BTC-USDT-SWAP", "--mgnMode", "cross", "--autoCxl", "--demo", "--profile", "demo"]);
  closeInput.close();

  const subTransferSource = new PassThrough();
  const subTransferInput = createInterface({ input: subTransferSource, output: new PassThrough() });
  const subTransferSelection = selectAccountMutationAction(subTransferInput, state);
  for (const answer of ["1", "USDT", "10", "6", "18", "1", "mysub"]) {
    subTransferSource.write(`${answer}\n`);
    await delay(0);
  }
  subTransferSource.write("CONFIRM DEMO TRANSFER FUNDS\n");
  assert.deepEqual(await subTransferSelection, ["account", "transfer", "--ccy", "USDT", "--amt", "10", "--from", "6", "--to", "18", "--transferType", "1", "--subAcct", "mysub", "--demo", "--profile", "demo"]);
  subTransferInput.close();

  const leverageSource = new PassThrough();
  const leverageInput = createInterface({ input: leverageSource, output: new PassThrough() });
  const leverageSelection = selectAccountMutationAction(leverageInput, state);
  for (const answer of ["3", "2", "1", "20", "cross", "long"]) {
    leverageSource.write(`${answer}\n`);
    await delay(0);
  }
  leverageSource.write("CONFIRM DEMO CHANGE LEVERAGE\n");
  assert.deepEqual(await leverageSelection, ["swap", "leverage", "--instId", "BTC-USDT-SWAP", "--lever", "20", "--mgnMode", "cross", "--posSide", "long", "--demo", "--profile", "demo"]);
  leverageInput.close();

  const leverageViewSource = new PassThrough();
  const leverageViewInput = createInterface({ input: leverageViewSource, output: new PassThrough() });
  const leverageViewSelection = selectAccountAction(leverageViewInput, state);
  for (const answer of ["9", "1", "1", "cross"]) {
    leverageViewSource.write(`${answer}\n`);
    await delay(0);
  }
  assert.deepEqual(await leverageViewSelection, ["swap", "get-leverage", "--instId", "BTC-USDT-SWAP", "--mgnMode", "cross", "--profile", "demo"]);
  leverageViewInput.close();

  const orderDetailSource = new PassThrough();
  const orderDetailInput = createInterface({ input: orderDetailSource, output: new PassThrough() });
  const orderDetailSelection = selectPositionsAction(orderDetailInput, state);
  for (const answer of ["12", "2", "1", "12345"]) {
    orderDetailSource.write(`${answer}\n`);
    await delay(0);
  }
  assert.deepEqual(await orderDetailSelection, ["swap", "get", "--instId", "BTC-USDT-SWAP", "--ordId", "12345", "--profile", "demo"]);
  orderDetailInput.close();

  const liqSource = new PassThrough();
  const liqInput = createInterface({ input: liqSource, output: new PassThrough() });
  const liqSelection = selectBotAction(liqInput, state);
  for (const answer of ["8", "1", "1", "10", "", "50000", "70000", "10"]) {
    liqSource.write(`${answer}\n`);
    await delay(0);
  }
  assert.deepEqual(await liqSelection, ["bot", "grid", "liquidate-price", "--instId", "BTC-USDT-SWAP", "--sz", "1", "--lever", "10", "--minPx", "50000", "--maxPx", "70000", "--gridNum", "10", "--profile", "demo"]);
  liqInput.close();

  const newsSource = new PassThrough();
  const newsInput = createInterface({ input: newsSource, output: new PassThrough() });
  const newsSelection = selectNewsAction(newsInput, state);
  newsSource.write("12\n");
  await delay(0);
  newsSource.write("article-123\n");
  assert.deepEqual(await newsSelection, ["news", "detail", "article-123", "--profile", "demo"]);
  newsInput.close();

  const gridCreateSource = new PassThrough();
  const gridCreateInput = createInterface({ input: gridCreateSource, output: new PassThrough() });
  const gridCreateSelection = selectBotMutationAction(gridCreateInput, state);
  for (const answer of ["1", "grid", "1", "40000", "80000", "20", "2", "0.001", "2", "70000", "50000", ""]) {
    gridCreateSource.write(`${answer}\n`);
    await delay(0);
  }
  gridCreateSource.write("CONFIRM DEMO CREATE BOT\n");
  assert.deepEqual(await gridCreateSelection, ["bot", "grid", "create", "--instId", "BTC-USDT", "--algoOrdType", "grid", "--minPx", "40000", "--maxPx", "80000", "--gridNum", "20", "--baseSz", "0.001", "--runType", "2", "--tpTriggerPx", "70000", "--slTriggerPx", "50000", "--demo", "--profile", "demo"]);
  gridCreateInput.close();

  const gridAmendSource = new PassThrough();
  const gridAmendInput = createInterface({ input: gridAmendSource, output: new PassThrough() });
  const gridAmendSelection = selectBotMutationAction(gridAmendInput, state);
  for (const answer of ["2", "algo-1", "2", "1", "70000", "-1", "", "", ""]) {
    gridAmendSource.write(`${answer}\n`);
    await delay(0);
  }
  gridAmendSource.write("CONFIRM DEMO AMEND BOT\n");
  assert.deepEqual(await gridAmendSelection, ["bot", "grid", "amend", "--algoId", "algo-1", "--instId", "BTC-USDT", "--tpTriggerPx", "70000", "--slTriggerPx", "-1", "--demo", "--profile", "demo"]);
  gridAmendInput.close();

  const dcaSource = new PassThrough();
  const dcaInput = createInterface({ input: dcaSource, output: new PassThrough() });
  const dcaSelection = selectBotMutationAction(dcaInput, state);
  for (const answer of ["5", "spot_dca", "1", "long", "100", "0", "0.03", "0.05", "market", "rsi", "cross_down", "30", "15m", "14", "", "yes", "", ""]) {
    dcaSource.write(`${answer}\n`);
    await delay(0);
  }
  dcaSource.write("CONFIRM DEMO CREATE BOT\n");
  assert.deepEqual(await dcaSelection, ["bot", "dca", "create", "--algoOrdType", "spot_dca", "--instId", "BTC-USDT", "--direction", "long", "--initOrdAmt", "100", "--maxSafetyOrds", "0", "--tpPct", "0.03", "--slPct", "0.05", "--slMode", "market", "--triggerStrategy", "rsi", "--triggerCond", "cross_down", "--thold", "30", "--timeframe", "15m", "--timePeriod", "14", "--reserveFunds", "true", "--demo", "--profile", "demo"]);
  dcaInput.close();

  const badTpslSource = new PassThrough();
  const badTpslInput = createInterface({ input: badTpslSource, output: new PassThrough() });
  const badTpslSelection = selectOrderMutationAction(badTpslInput, state);
  for (const answer of ["1", "1", "1", "buy", "market", "0.5", "y", "not-a-price", "-1"]) {
    badTpslSource.write(`${answer}\n`);
    await delay(0);
  }
  assert.equal(await badTpslSelection, undefined);
  badTpslInput.close();
}

test("dashboard exposes safe views and maps confirmed transaction routes", testDashboardSummaryAndGuardedRoutes);
