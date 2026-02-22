# StatsPlus MCP Server

An [MCP](https://modelcontextprotocol.io) server that exposes the [StatsPlus API](https://wiki.statsplus.net/web-tools/statsplus-api) as tools for use with Claude and other MCP-compatible clients.

## Prerequisites

- Node.js 18+
- A StatsPlus league account linked to a team

## Installation

```bash
git clone https://github.com/joshuarichard/StatsPlus-MCP.git
cd StatsPlus-MCP
npm install
npm run build
```

## Configuration

### Getting your session cookie

The StatsPlus API requires an active browser session. To get your cookie:

1. Log into `https://statsplus.net/<your-league-url>` in your browser
2. Open DevTools (`Cmd+Option+I` on Mac, `F12` on Windows/Linux)
3. Go to **Application** → **Cookies** → `https://statsplus.net`
4. Copy the `sessionid` and `csrftoken` values and combine them:
   ```
   sessionid=<value>;csrftoken=<value>
   ```

### Adding to Claude Code

```bash
claude mcp add statsplus \
  -e STATSPLUS_LEAGUE_URL=<your-league-url> \
  -e "STATSPLUS_COOKIE=sessionid=<sessionid>;csrftoken=<csrftoken>" \
  -- node /path/to/StatsPlus-MCP/dist/index.js
```

Replace:
- `<your-league-url>` — your league's URL slug (e.g. `mbl`, `mlb2025`)
- `<sessionid>` — the `sessionid` cookie value from your browser
- `<csrftoken>` — the `csrftoken` cookie value from your browser
- `/path/to/StatsPlus-MCP` — the absolute path where you cloned this repo

### Local development

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

`.env` is gitignored and will not be committed.

## Available Tools

| Tool | Description | Parameters |
|---|---|---|
| `get_player_batting_stats` | Player batting statistics | `year?`, `pid?`, `split?` |
| `get_player_pitching_stats` | Player pitching statistics | `year?`, `pid?`, `split?` |
| `get_player_fielding_stats` | Player fielding statistics by position | `year?`, `pid?`, `split?` |
| `get_team_batting_stats` | Team batting statistics with rate stats | `year?`, `split?` |
| `get_team_pitching_stats` | Team pitching statistics with rate stats | `year?`, `split?` |
| `get_players` | Player roster with names and team assignments | `team_id?`, `org_id?` |
| `find_player` | Search players by name (partial, case-insensitive) | `name` |
| `start_ratings_job` | Start the async ratings export; returns `poll_url` immediately | — |
| `get_ratings` | Collect ratings results (pass `poll_url` to avoid re-starting the job) | `poll_url?`, `player_ids?` |
| `get_game_history` | All major league games with scores, hits, errors, and pitcher IDs | — |
| `get_contracts` | All current and active player contracts | `team_id?`, `player_id?` |
| `get_contract_extensions` | Signed extensions taking effect in future seasons | — |
| `get_teams` | Team list with IDs and abbreviations | — |
| `get_draft` | Draft picks | `lid?` |
| `get_exports` | CSV export of all league games | — |

**Split IDs:** `1` = Overall, `2` = vs Left-handed, `3` = vs Right-handed

### Usage tips

- **Name-to-ID resolution:** Use `find_player(name)` for quick name → ID lookups without downloading the full roster. For a full org's players, use `get_players(org_id)` which filters by `Parent Team ID`.

- **Ratings workflow:** The ratings export is an async job that takes 60–90 seconds. To avoid blocking mid-workflow, call `start_ratings_job()` first, do your other lookups while it processes, then call `get_ratings(poll_url)` to collect results:
  ```
  start_ratings_job()              → { poll_url: "..." }
  get_player_batting_stats(...)    ← runs concurrently
  get_contracts(team_id: ...)
  get_ratings(poll_url: "...")     → results ready, no extra wait
  ```
  Calling `get_ratings()` without a `poll_url` starts a new job and blocks until complete. Ratings columns include batting attributes (`Cntct`, `Gap`, `Pow`, `Eye`, `Ks`) with L/R splits, `Pot*` potential counterparts, and positional grades. Key encoding notes:
  - Star ratings are stored as `stars × 2` — e.g. 3.5 stars = `7`, 5 stars = `10`
  - International complex players have a **negative** `League` value (e.g. `-100`)
  - Column names are not guaranteed to be stable across OOTP versions

- **Preseason / empty responses:** During preseason, all stat endpoints return HTTP 204 with no data for the upcoming year. Always pass `year=<most recent completed season>` to get data.

- **Fielding:** `get_player_fielding_stats` returns one row per player per position per split. A player who appeared at multiple positions will have multiple rows — one for each.

- **Game history:** `runs0`/`hits0`/`errors0` are the home team; `runs1`/`hits1`/`errors1` are the away team. `winning_pitcher`, `losing_pitcher`, `starter0`, and `starter1` are numeric player IDs. `save_pitcher` is `0` when there is no save pitcher.

- **Contracts:** `salary0` is the current season salary, `salary1` is next season, and so on through `salary14`. Unpopulated years are `0`. `is_major` and `no_trade` are `0`/`1` integers. `contract_team_id` is the MLB org that holds the contract (use this with the `team_id` filter). `get_contract_extensions` uses the same schema for deals already signed but not yet in effect.

- **Splits:** All stat endpoints that accept a `split` parameter use `1` = Overall, `2` = vs Left-handed, `3` = vs Right-handed. Omitting `split` returns all three rows per player/team.

## Development

```bash
npm run build       # Compile TypeScript
npm test            # Run tests
npm run test:watch  # Run tests in watch mode
npm run lint        # Type-check without emitting
```

## License

MIT
