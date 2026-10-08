# okx-tui theming examples

Rendered screenshots of the `okx-tui` terminal dashboard, generated from the real
selector and dashboard code — not mockups. Use them for docs, blog posts, or as a
reference when restyling the terminal theme.

| File | Screen |
| --- | --- |
| `01-dashboard-simple.png` | Default simplified home view for everyday use |
| `02-dashboard-advanced.png` | Advanced menu behind the `A` toggle |
| `03-trading-operations-menu.png` | `Trading & funds operations` submenu |
| `04-order-preview-confirmation.png` | Order flow with instrument pick list, TP/SL prompts, and the exact `CONFIRM DEMO …` preview |
| `05-bot-monitor-menu.png` | Grid/DCA bot monitoring submenu |
| `06-installed-skills.png` | Installed-skills view (`~/.agents/skills` scan + registry) |

## Regenerating

Run the generator from the repository root — it writes terminal-styled HTML to
`html/` next to this file; screenshot each page at ~960×720 to produce the PNGs:

```bash
pnpm --filter @okx_ai/okx-trade-cli exec tsx ../../docs/theming/examples/generate.mjs
```

The generator patches `process.stdout.write` to capture real TUI output, feeds
selectors scripted stdin answers, and converts ANSI colors to HTML spans. It never
confirms a mutation and never contacts the exchange.
