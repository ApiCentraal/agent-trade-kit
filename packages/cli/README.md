[English](README.md) | [中文](README.zh-CN.md)

# okx-trade-cli

Command line tool for OKX. Supports market data, account queries, spot and swap
trading, and configuration management.

### Install

```bash
npm install -g @okx_ai/okx-trade-cli
```

### Configure credentials

Create `~/.okx/config.toml`:

```toml
default_profile = "demo"

[profiles.live]
api_key = "your-live-api-key"
secret_key = "your-live-secret-key"
passphrase = "your-live-passphrase"

[profiles.demo]
api_key = "your-demo-api-key"
secret_key = "your-demo-secret-key"
passphrase = "your-demo-passphrase"
demo = true
```

### Quick usage

```bash
okx market ticker BTC-USDT
okx market orderbook BTC-USDT --sz 5
okx account balance
okx spot orders
okx swap positions
```

### Help

```bash
okx --help
okx market --help
okx bot grid --help
```

### Examples

```bash
okx market candles BTC-USDT --bar 1H --limit 10
okx account balance BTC,ETH
okx spot place --instId BTC-USDT --side buy --ordType market --sz 100
okx swap leverage --instId BTC-USDT-SWAP --lever 10 --mgnMode cross
```

### Terminal dashboard

Launch the interactive control room with:

```bash
okx-tui
```

On terminals of at least 110×35 the dashboard opens as a multi-pane control room: a header with mode/profile/API status, a grouped sidebar (bot configuration, markets, account, insights, tools) navigable by single-key shortcuts, a main pane with a guided **create-bot wizard** (`W`) that accepts a natural-language intent line (e.g. `grid bot BTC 100 USDT low risk`) and shows a live configuration summary with validation checks in the right inspector, and a bottom CLI-logs pane that captures every command's output (`L` for fullscreen, `R` to refresh tickers). Command output is captured into the log pane; interactive flows such as `config init` still run fullscreen. Smaller terminals automatically fall back to the compact single-box dashboard.

The compact view offers balances, positions, market data, bots, trading operations, and profiles — with specialist tools (Earn/news/smart-money insights, MCP clients, authentication, health/Pilot, and skills) behind the `A` advanced toggle. Common instruments are offered as numbered pick lists (manual entry stays available via `0`), and optional fields can be left blank to keep exchange defaults.

It includes account balances/limits (including per-instrument leverage settings), position/order/fill history with per-order detail lookup, market and options analytics, event-contract discovery, grid/DCA bot details plus a grid liquidation-price calculator, Earn and Auto-Earn monitoring, news/calendar/sentiment with article detail, smart-money drill-downs, marketplace skill management (installed-skills view covers both the CLI registry and `~/.agents/skills`), profile management, MCP client setup, OAuth/helper lifecycle, diagnostics, Pilot lifecycle, CLI/MCP upgrades, and tool discovery. Client setup, auth changes, and software installs/removals/upgrades require exact confirmation; MCP capability setup defaults to market-only data, while full access requires a separate opt-in. Credential entry is launched from the dashboard's profile manager and runs in the existing `okx config init` wizard. The dashboard never displays API secrets.

Financial operations cover market/limit order placement with attached TP/SL, order amendment/cancellation, swap/futures position closes (optionally cancelling related algo orders), advanced algo orders (conditional, OCO, move-order-stop, iceberg, TWAP, trailing), JSON batch place/amend/cancel, funding/trading and sub-account transfers, position-mode and leverage changes, event-contract orders, grid/DCA bot lifecycle (grid spacing, TP/SL triggers and ratios, DCA stop-loss and price/RSI triggers), and Earn purchases/redemptions/rate and Auto-Earn changes. Every financial operation shows an action/profile/mode preview and requires an exact `CONFIRM DEMO <ACTION>` or `CONFIRM LIVE <ACTION>` phrase before the existing CLI command runs; an unconfigured environment fails closed.

For more details, see the [repository README](../../README.md).
