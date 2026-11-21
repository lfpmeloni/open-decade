# open-decade

**A free, open-source personal investment agent that runs on your own computer.**

Tell it what you own. It reads live market prices, x-rays your portfolio, lists what needs
attention, and builds an optimized target portfolio with concrete next steps — and you can
chat with it about any of it. The reasoning is done by [Claude Code](https://claude.com/claude-code)
running in the background; everything it learns about you is stored as plain files in `data/`
on your machine.

Free for anyone to use, forever (Apache-2.0). Not financial advice — it is decision support; you decide and execute.

## What you get

- **Portfolio** — your assets valued at live prices, by asset class and currency, with stale/missing prices flagged
- **Attention points** — prioritized issues to fix (reserve, concentration, drift, costs, missing info)
- **Optimized target** — the allocation to aim for, why, and the trades to get there
- **Chat** — ask anything about your portfolio; it updates your profile and holdings as you talk
- **History** — every chat, market reading and recommendation is kept, dated

## Quick start

Requirements: [Node.js](https://nodejs.org) 22+ and [Claude Code](https://claude.com/claude-code) installed and logged in (`claude` works in your terminal).

```bash
git clone https://github.com/lfpmeloni/open-decade.git
cd open-decade
npm start            # → http://127.0.0.1:4317
```

On first start, `data/` is created from the example in `data.example/`. Replace it with your own:
edit **Holdings** and **Profile** in the web UI (or the files directly), or just describe your
assets in the chat. Then click **Refresh prices → Run review → Optimize**.

No npm install, no build, no database, no account. You can also skip the UI and run `claude` in
this folder — the same agent, skills and data.

## Your data stays yours

```
open-decade/
├── data/              ← YOUR data (gitignored, never committed or uploaded)
│   ├── profile.md, holdings.csv
│   ├── market/  attention.json  target.json  recommendations/  chats/
├── app/               ← framework: local web server + UI
├── .claude/skills/    ← framework: market data, review, optimize, contribute
├── knowledge/         ← framework: the investment method
└── CLAUDE.md          ← framework: the agent's instructions
```

- The web server listens on `127.0.0.1` only — it is not reachable from other devices.
- `data/` is plain Markdown/CSV/JSON: readable, portable, easy to back up (copy the folder). To keep it elsewhere (e.g. an encrypted drive), make `data/` a symlink to that folder.
- Your messages and the files the agent reads go to Anthropic through your Claude Code account, under its terms. Market-data requests send only ticker symbols.
- **Updating** never touches your data: `git pull`.

## Markets and extending it

Prices come from pluggable providers in `.claude/skills/market-data/providers/`. The default
covers stocks, ETFs, FX and crypto on most global exchanges. Missing an exchange, country or
asset type? Ask the agent: *"add a price provider for X"* — the `contribute` skill guides it to
build, test and package the change as a pull request.

## Contributing

Contributions are the point: every new provider, check or method improvement makes the agent
better for everyone. Build it while you use it, open a PR, and the maintainer reviews, tests and
ships it in the next release. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Configuration

| env | default | |
|---|---|---|
| `PORT` | `4317` | web UI port |
| `OD_DATA` | `./data` | data folder location (or symlink `data/` to e.g. an encrypted drive) |
| `CLAUDE_BIN` | `claude` | Claude Code executable |

The agent runs `claude` with the standard model (`sonnet`) at low effort to keep it fast and cheap.

## License

Apache-2.0. open-decade is an independent project, not affiliated with any company named Decade.
