# statsplus-mcp

MCP server that exposes the [StatsPlus API](https://wiki.statsplus.net/web-tools/statsplus-api) as tools for use with Claude and other MCP-compatible clients.

## Project Structure

```
src/
  index.ts    – MCP server entry point (stdio transport)
  client.ts   – HTTP client for the StatsPlus REST API
  tools.ts    – Tool definitions and request dispatch
  types.ts    – TypeScript interfaces for API data
tests/
  client.test.ts  – Unit tests for StatsPlusClient
  tools.test.ts   – Unit tests for tool dispatch
.env.example  – Template for local credentials (copy to .env)
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `STATSPLUS_LEAGUE_URL` | Yes | Your league's URL slug, e.g. `mbl` |
| `STATSPLUS_COOKIE` | No | Session cookie for authenticated access |

**Authentication note:** The StatsPlus API requires you to be logged in to your league at `https://statsplus.net/<LGURL>` and linked to a team. Pass your session cookie via `STATSPLUS_COOKIE` in the format `sessionid=<value>;csrftoken=<value>`.

**Local development:** Copy `.env.example` to `.env` and fill in your credentials. `.env` is gitignored.

## Available Tools

| Tool | Description |
|---|---|
| `get_player_batting_stats` | Batting stats; filter by `year`, `pid`, `split` |
| `get_player_pitching_stats` | Pitching stats; filter by `year`, `pid`, `split` |
| `get_player_fielding_stats` | Fielding stats by position; filter by `year`, `pid`, `split` |
| `get_team_batting_stats` | Team batting stats with rate stats; filter by `year`, `split` |
| `get_team_pitching_stats` | Team pitching stats with rate stats; filter by `year`, `split` |
| `get_players` | Player roster with names and team assignments; filter by `team_id` |
| `get_game_history` | All major league games with scores, hits, errors, and pitcher IDs |
| `get_contracts` | All current and active player contracts |
| `get_contract_extensions` | Signed extensions taking effect in future seasons |
| `get_teams` | Team list with IDs and abbreviations |
| `get_draft` | Draft picks; optionally filter by league `lid` |
| `get_exports` | CSV export of all games (scores, pitchers, dates) |

**Split IDs:** `1` = Overall, `2` = vs Left-handed, `3` = vs Right-handed

**Preseason note:** Player stat endpoints (`batting`, `pitching`, `fielding`) return HTTP 204 (no content) when no games have been played for the requested period. Always pass `year` to get historical data during preseason.

## API Behavior Notes

- Stat endpoints return CSV; non-stat endpoints (`teams`, `exports`) return JSON or CSV without needing a year filter.
- The `/players/` endpoint returns roster data including first/last names — useful for resolving `player_id` values returned by stat endpoints.
- `/teambatstats/` and `/teampitchstats/` exist in the API but are not yet implemented here (pending column schema confirmation from StatsPlus devs).
- All CSV responses are parsed dynamically by column header name, so new columns added by the API will pass through even if not typed in the interface.

## Commands

```bash
npm run build       # Compile TypeScript to dist/
npm start           # Run the compiled server
npm test            # Run all tests (vitest)
npm run test:watch  # Run tests in watch mode
npm run lint        # Type-check without emitting
```

## MCP Client Configuration

Add to your MCP client config (e.g. `~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "statsplus": {
      "command": "node",
      "args": ["/path/to/statsplus-mcp/dist/index.js"],
      "env": {
        "STATSPLUS_LEAGUE_URL": "your-league-url",
        "STATSPLUS_COOKIE": "your-session-cookie"
      }
    }
  }
}
```

## Adding New Endpoints

1. Verify the endpoint against the live API with `curl` using `year=<latest>` to confirm it returns data
2. Add types to `src/types.ts` (column names must match the CSV header exactly)
3. Add a method to `StatsPlusClient` in `src/client.ts`
4. Add a tool definition + case in `src/tools.ts`
5. Add tests in `tests/` using real column names from the live response
6. Run `npm test` and `npm run build` to verify
