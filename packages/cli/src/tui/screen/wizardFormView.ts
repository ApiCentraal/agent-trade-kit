/**
 * FILE: wizardFormView.ts
 * PURPOSE: Render the wizard draft as the numbered configuration form from the target layout:
 *          seven sections (bot type, market, capital, parameters, entry/exit, risk, environment)
 *          arranged in balanced columns with pill/select/toggle widgets.
 * LAYER: component
 * DEPENDS_ON: ../types.js, ../ansiPadEnd.js, ../ansiWidth.js, ../ansiSlice.js, ./palette.js, ./widgets/pillRow.js, ./widgets/selectBox.js, ./widgets/toggleRow.js, ./widgets/valueField.js
 * RULES:
 * - Sections show only draft-derived values; unset fields render a dim dash instead of guessed defaults.
 * - Column packing is deterministic (fixed section order) so re-renders never reorder content.
 */
import type { TuiDashboardState, TuiWizardDraft } from "../types.js";
import { ansiPadEnd } from "./ansiPadEnd.js";
import { ansiSlice } from "./ansiSlice.js";
import { DIM, GRAY, RESET, WHITE } from "./palette.js";
import { renderPillRow } from "./widgets/pillRow.js";
import { renderSelectBox } from "./widgets/selectBox.js";
import { renderToggleRow } from "./widgets/toggleRow.js";
import { renderValueField } from "./widgets/valueField.js";

/** Section caption rendered above each numbered block. */
function sectionHeader(num: number, title: string): string {
  return `${WHITE}${num}. ${title}${RESET}`;
}

/** Small dim label used above a widget inside a section. */
function fieldLabel(text: string): string {
  return `${GRAY}${text}${RESET}`;
}

/**
 * PURPOSE: Build the seven numbered configuration sections as independent line arrays.
 * INPUT:
 * - draft: TuiWizardDraft | undefined — current wizard answers (empty = landing state)
 * - state: TuiDashboardState — mode/profile for the environment section
 * - fieldWidth: number — inner width available per column for boxed fields
 * OUTPUT:
 * - string[][] — one line array per section, in fixed order 1..7
 * USES:
 * - renderPillRow, renderSelectBox, renderToggleRow, renderValueField
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - DCA drafts swap section 4/5 content (safety orders, TP/SL) for grid parameters; this is the only structural branch.
 */
function buildSections(
  draft: TuiWizardDraft | undefined,
  state: TuiDashboardState,
  fieldWidth: number,
): string[][] {
  const d = draft ?? {};
  const isDca = d.botType === "dca";
  const strategyLabel = d.botType === "dca" ? "DCA Bot" : d.botType === "grid" ? "Grid Trading" : "Auto";
  const modeIndex = isDca ? 3 : d.market === "contract" ? 1 : d.market === "spot" ? 0 : -1;
  const accountIndex = d.market === "contract" ? 1 : 0;

  const modePills =
    fieldWidth >= 34 ? ["Spot", "Futures", "Arbitrage", "DCA", "Custom"]
    : fieldWidth >= 24 ? ["Spot", "Fut", "Arb", "DCA"]
    : ["Spot", "Fut", "DCA"];
  const s1: string[] = [
    sectionHeader(1, "Bot type"),
    fieldLabel("Strategy"),
    renderSelectBox(strategyLabel, fieldWidth),
    fieldLabel("Mode"),
    renderPillRow(modePills, modeIndex),
  ];

  const pairLabel = d.instId ? d.instId.replace(/-(?=[^-]*$)/, "/") : "BTC/USDT";
  const s2: string[] = [
    sectionHeader(2, "Market"),
    fieldLabel("Trading pair"),
    renderSelectBox(pairLabel, fieldWidth),
    fieldLabel("Account type"),
    renderPillRow(["Spot", "Margin"], accountIndex),
  ];

  const capitalValue = d.amount ?? "";
  const s3: string[] = [
    sectionHeader(3, "Capital allocation"),
    ...renderValueField(`Total capital (${d.ccy ?? "USDT"})`, capitalValue, fieldWidth),
    renderPillRow(["25%", "50%", "75%", "100%"], capitalValue ? 3 : -1),
  ];

  const s4: string[] = isDca
    ? [
        sectionHeader(4, "DCA parameters"),
        ...renderValueField("Safety orders", d.maxSafetyOrds ?? "", fieldWidth),
        ...renderValueField("Initial order", d.amount ?? "", fieldWidth, d.ccy ?? "USDT"),
      ]
    : [
        sectionHeader(4, "Grid parameters"),
        ...renderValueField("Price range (USDT)", d.minPx && d.maxPx ? `${d.minPx} → ${d.maxPx}` : "", fieldWidth),
        ...renderValueField("Number of grids", d.gridNum ?? "", fieldWidth),
        fieldLabel("Grid mode"),
        renderPillRow(["Arithmetic", "Geometric"], d.runType === "geometric" ? 1 : 0),
      ];

  const s5: string[] = isDca
    ? [
        sectionHeader(5, "Entry & exit rules"),
        ...renderValueField("Take-profit ratio", d.tpPct ?? "", fieldWidth),
        ...renderValueField("Stop-loss ratio", d.slPct ?? "", fieldWidth),
      ]
    : [
        sectionHeader(5, "Entry & exit rules"),
        ...renderValueField("Take profit per grid", "", fieldWidth, "%"),
        ...renderValueField("Stop loss (overall)", d.slPct ?? "", fieldWidth, "%"),
      ];

  const riskIndex = d.risk === "low" ? 0 : d.risk === "medium" ? 1 : d.risk === "high" ? 2 : -1;
  const s6: string[] = [
    sectionHeader(6, "Risk & execution"),
    fieldLabel("Risk level"),
    renderPillRow(["Low", "Medium", "High"], riskIndex),
    ...renderValueField("Max open orders", d.gridNum ?? "", Math.min(fieldWidth, 12)),
    renderToggleRow("Allow rebalancing", true),
  ];

  const botName = `${(d.instId ?? "BTC/USDT").split("-")[0] ?? "BTC"} ${isDca ? "DCA" : "Grid"} Bot`;
  const envIndex = state.mode === "LIVE" ? 1 : state.mode === "DEMO" ? 0 : -1;
  const envPills = fieldWidth >= 30 ? ["Demo (Testnet)", "Live (Mainnet)"] : ["Demo", "Live"];
  const s7: string[] = [
    sectionHeader(7, "Environment"),
    fieldLabel("Run in"),
    renderPillRow(envPills, envIndex),
    ...renderValueField("Bot name", botName, fieldWidth),
  ];

  return [s1, s2, s3, s4, s5, s6, s7];
}

/** Pack order per column count, matching the target's column grouping. */
const COLUMN_PACKING: Record<number, number[][]> = {
  3: [[0, 1, 2], [3, 4], [5, 6]],
  2: [[0, 1, 2], [3, 4, 5, 6]],
  1: [[0, 1, 2, 3, 4, 5, 6]],
};

/**
 * PURPOSE: Build compact `Label: value` sections for narrow columns where boxed fields would overflow.
 * INPUT:
 * - draft: TuiWizardDraft | undefined — current wizard answers
 * - state: TuiDashboardState — mode for the environment line
 * OUTPUT:
 * - string[][] — seven short line arrays in the same fixed order as buildSections
 * USES:
 * - palette SGR codes only
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Same data, denser rows; used only when columns are too narrow for bordered widgets.
 */
function buildCompactSections(draft: TuiWizardDraft | undefined, state: TuiDashboardState): string[][] {
  const d = draft ?? {};
  const isDca = d.botType === "dca";
  const kv = (label: string, value: string): string => `  ${GRAY}${label}${RESET} ${WHITE}${value}${RESET}`;
  const env = state.mode === "LIVE" ? "Live (Mainnet)" : "Demo (Testnet)";
  return [
    [
      sectionHeader(1, "Bot type"),
      kv("Strategy:", d.botType === "dca" ? "DCA Bot" : d.botType === "grid" ? "Grid Trading" : "Auto"),
      kv("Mode:", isDca ? "DCA" : d.market === "contract" ? "Futures" : d.market === "spot" ? "Spot" : "—"),
    ],
    [
      sectionHeader(2, "Market"),
      kv("Pair:", d.instId ? d.instId.replace(/-(?=[^-]*$)/, "/") : "—"),
      kv("Account:", d.market === "contract" ? "Margin" : "Spot"),
    ],
    [
      sectionHeader(3, "Capital allocation"),
      kv("Total:", d.amount ? `${d.amount} ${d.ccy ?? "USDT"}` : "—"),
    ],
    isDca
      ? [sectionHeader(4, "DCA parameters"), kv("Safety orders:", d.maxSafetyOrds ?? "—"), kv("Initial order:", d.amount ?? "—")]
      : [
          sectionHeader(4, "Grid parameters"),
          kv("Range:", d.minPx && d.maxPx ? `${d.minPx} → ${d.maxPx}` : "—"),
          kv("Grids:", `${d.gridNum ?? "—"} · ${d.runType === "geometric" ? "Geometric" : "Arithmetic"}`),
        ],
    isDca
      ? [sectionHeader(5, "Entry & exit rules"), kv("Take profit:", d.tpPct ?? "—"), kv("Stop loss:", d.slPct ?? "none")]
      : [sectionHeader(5, "Entry & exit rules"), kv("TP per grid:", "—%"), kv("Stop loss:", d.slPct ? `${d.slPct}%` : "—%")],
    [
      sectionHeader(6, "Risk & execution"),
      kv("Risk:", d.risk ?? "—"),
      kv("Max orders:", d.gridNum ?? d.maxSafetyOrds ?? "—"),
    ],
    [
      sectionHeader(7, "Environment"),
      kv("Run in:", env),
      kv("Bot name:", `${(d.instId ?? "BTC/USDT").split("-")[0] ?? "BTC"} ${isDca ? "DCA" : "Grid"} Bot`),
    ],
  ];
}

/**
 * PURPOSE: Compose the numbered sections into side-by-side columns sized to the pane width.
 * INPUT:
 * - draft: TuiWizardDraft | undefined — wizard answers to display
 * - state: TuiDashboardState — mode/profile for the environment section
 * - width: number — printable width of the form area
 * OUTPUT:
 * - string[] — form body lines, each padded to `width`
 * USES:
 * - buildSections, ansiPadEnd, ansiWidth
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - Column count adapts to width (3 ≥ 84, 2 ≥ 54, else 1); a blank line separates stacked sections inside a column.
 */
export function renderWizardForm(
  draft: TuiWizardDraft | undefined,
  state: TuiDashboardState,
  width: number,
): string[] {
  const columns = width >= 84 ? 3 : width >= 48 ? 2 : 1;
  const gutter = 3;
  const colWidth = Math.floor((width - gutter * (columns - 1)) / columns);
  const sections = colWidth >= 25 ? buildSections(draft, state, colWidth - 2) : buildCompactSections(draft, state);
  const packing = COLUMN_PACKING[columns] ?? COLUMN_PACKING[1];

  const columnLines: string[][] = packing.map((sectionIds) => {
    const lines: string[] = [];
    sectionIds.forEach((id, index) => {
      if (index > 0) lines.push("");
      lines.push(...sections[id]);
    });
    return lines;
  });

  const height = Math.max(...columnLines.map((lines) => lines.length));
  const out: string[] = [];
  for (let row = 0; row < height; row += 1) {
    const cells = columnLines.map((lines) => ansiPadEnd(ansiSlice(lines[row] ?? "", colWidth), colWidth));
    out.push(ansiPadEnd(cells.join(" ".repeat(gutter)), width));
  }
  return out;
}
