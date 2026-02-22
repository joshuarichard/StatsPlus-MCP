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
| `get_players` | Player roster with names and team assignments | `team_id?` |
| `get_ratings` | Player ratings (overall, potential, per-attribute) | — |
| `get_game_history` | All major league games with scores, hits, errors, and pitcher IDs | — |
| `get_contracts` | All current and active player contracts | — |
| `get_contract_extensions` | Signed extensions taking effect in future seasons | — |
| `get_teams` | Team list with IDs and abbreviations | — |
| `get_draft` | Draft picks | `lid?` |
| `get_exports` | CSV export of all league games | — |

**Split IDs:** `1` = Overall, `2` = vs Left-handed, `3` = vs Right-handed

### Usage tips

- **Name-to-ID resolution:** Stat endpoints return numeric `player_id` values with no names attached. Use `get_players` (optionally filtered by `team_id`) to look up a player by name first, then pass their `ID` as `pid` to the stat endpoints.

- **Preseason / empty responses:** During preseason, all stat endpoints (`batting`, `pitching`, `fielding`, `team batting`, `team pitching`) return HTTP 204 with no data for the upcoming year. Always pass `year=<most recent completed season>` to get data.

- **Fielding:** `get_player_fielding_stats` returns one row per player per position per split. A player who appeared at multiple positions will have multiple rows — one for each.

- **Ratings:** `get_ratings` is an async background job. The API queues the export on first request, then you poll a separate URL until the data is ready. This tool handles all of that automatically, but **expect it to block for 60–90 seconds** (up to 5 minutes in the worst case). Columns include batting contact/power/eye attributes (`Cntct`, `Gap`, `Pow`, `Eye`, `Ks`) with L/R splits, `Pot*` potential counterparts, and positional grades. Key encoding notes:
  - Star ratings are stored as `stars × 2` — e.g. 3.5 stars = `7`, 5 stars = `10`
  - International complex players have a **negative** `League` value (e.g. `-100`)
  - Column names are not guaranteed to be stable across OOTP versions

- **Game history:** `runs0`/`hits0`/`errors0` are the home team; `runs1`/`hits1`/`errors1` are the away team. `winning_pitcher`, `losing_pitcher`, `starter0`, and `starter1` are numeric player IDs. `save_pitcher` is `0` when there is no save pitcher.

- **Contracts:** `salary0` is the current season salary, `salary1` is next season, and so on through `salary14`. Unpopulated years are `0`. `is_major` and `no_trade` are `0`/`1` integers. `get_contract_extensions` uses the same schema for deals already signed but not yet in effect.

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
