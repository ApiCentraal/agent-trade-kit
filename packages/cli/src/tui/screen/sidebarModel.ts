/**
 * FILE: sidebarModel.ts
 * PURPOSE: Define the grouped navigation model that maps sidebar keys to dashboard domains.
 * LAYER: model
 * DEPENDS_ON: ../types.js
 * RULES:
 * - Item keys are unique single characters so one keypress can start a flow without Enter.
 */
import type { TuiNavItem } from "../types.js";

/** Sidebar sections in display order, mirroring the target control-room grouping. */
const NAV_SECTIONS: Array<{ section: string; items: Array<{ key: string; label: string }> }> = [
  {
    section: "Bot configuration",
    items: [
      { key: "w", label: "Create bot wizard" },
      { key: "1", label: "My bots & preview" },
      { key: "2", label: "Bot operations" },
    ],
  },
  {
    section: "Markets",
    items: [
      { key: "4", label: "Market data" },
      { key: "5", label: "Analytics & indicators" },
      { key: "6", label: "Event contracts" },
    ],
  },
  {
    section: "Account",
    items: [
      { key: "7", label: "Overview & limits" },
      { key: "8", label: "Positions & activity" },
      { key: "9", label: "Trading operations" },
      { key: "0", label: "Earn operations" },
    ],
  },
  {
    section: "Insights",
    items: [
      { key: "a", label: "News & sentiment" },
      { key: "b", label: "Smart money" },
      { key: "k", label: "Earn overview" },
    ],
  },
  {
    section: "Tools",
    items: [
      { key: "c", label: "Profiles & API keys" },
      { key: "e", label: "MCP clients" },
      { key: "f", label: "Authentication" },
      { key: "g", label: "Health & updates" },
      { key: "h", label: "Skills marketplace" },
    ],
  },
];

/**
 * PURPOSE: Flatten the grouped navigation definition into ordered items for rendering and dispatch.
 * INPUT:
 * - none
 * OUTPUT:
 * - TuiNavItem[] — ordered nav items, each carrying its section label
 * USES:
 * - none
 * EFFECT:
 * - none
 * ERRORS:
 * - none
 * RULES:
 * - The returned order is the display order; callers must not re-sort.
 */
export function buildNavItems(): TuiNavItem[] {
  const items: TuiNavItem[] = [];
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) items.push({ ...item, section: section.section });
  }
  return items;
}
