# okx-tui theming examples

Rendered screenshots of the `okx-tui` terminal dashboard, generated from the real
selector and dashboard code — not mockups. Use them for docs, blog posts, or as a
reference when restyling the terminal theme.

| File | Screen |
| --- | --- |
| `01-control-room.png` | Multi-pane control room: header with mode/profile/API status, grouped sidebar with wizard-step echo, create-bot form, configuration inspector, CLI log pane, and ticker status bar |
| `02-bot-wizard.png` | Create-bot wizard at the deploy step: preview text, `CONFIRM DEMO …` prompt, live inspector summary, and validation checklist |
| `03-mutation-menu.png` | Trading operations submenu (orders, transfers, bots, Earn, events) |
| `04-order-preview-confirmation.png` | Order flow with instrument pick list, TP/SL prompts, and the exact `CONFIRM DEMO …` preview |
| `05-bot-monitor-menu.png` | Grid/DCA bot monitoring submenu |
| `06-installed-skills.png` | Installed-skills view (`~/.agents/skills` scan + registry) |
| `07-compact-dashboard.png` | Compact single-box fallback used on terminals smaller than 110×26 |

## Regenerating

Run the generator from the repository root — it writes terminal-styled HTML to
`html/` next to this file; screenshot each page to produce the PNGs:

```bash
pnpm --filter @okx_ai/okx-trade-cli exec tsx ../../docs/theming/examples/generate.mjs
```

The generator patches `process.stdout.write` to capture real TUI output, feeds
selectors scripted stdin answers, and converts ANSI colors to HTML spans. It never
confirms a mutation and never contacts the exchange.
