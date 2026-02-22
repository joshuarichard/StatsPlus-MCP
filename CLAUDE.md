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
| `get_ratings` | Player ratings (overall, potential, per-attribute); async — waits up to ~5 min |
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
- `/ratings/` is an async background job. The client hits the endpoint to start the job, waits 30s, then polls every 15s. The poll response says `"Request ID ... still in progress, check back soon"` until ready. Typically resolves in 60–90 seconds; times out after ~5 minutes.

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

## Known MCP Tool Quirks (observed in practice)

### Large payload endpoints save to file
`get_players`, `get_contracts`, and `get_ratings` all return datasets too large for the context window. The MCP client saves them to a temp file at `~/.claude/projects/.../tool-results/<tool-name>-<timestamp>.txt`. The format is a JSON array with a single `{type: "text", text: "..."}` object. To work with them:
```python
import json
data = json.load(open(file_path))
records = json.loads(data[0]['text'])
```
Use `jq` or Python filtering to extract specific players by `player_id` or `ID`.

### Minor league players return empty stats arrays
`get_player_batting_stats`, `get_player_pitching_stats`, and `get_player_fielding_stats` only return MLB-level stats. Players in AAA or below return `[]` even when specifying a `year`. There is no minor league stats endpoint — use `get_ratings` for prospect evaluation instead.

### Undocumented split IDs
Batting stats occasionally include `split_id: 21` (observed as a small-sample additional row). Only splits 1, 2, 3 are documented. The extra row appears to be postseason or some special split — safe to filter out for analysis.

### Player team context in `get_players`
Minor league players have their affiliate `Team ID` set to the minor league team (e.g., 93 = Durham Bulls), not the MLB parent. The `Parent Team ID` field holds the MLB org. Always use `Parent Team ID` to resolve which MLB team controls a minor league player.

### Ratings `Pos` field reflects role, not handedness
A player listed as `"Pos": "RP"` in ratings is a reliever, not necessarily a right-handed pitcher. The role designation (SP/RP) comes from the OOTP role, not pitching hand. The `Throws` field provides handedness. User-described "RHP" / "LHP" may map to `"RP"` or `"SP"` with `Throws: "R"` / `"L"`.

### Contracts for minor leaguers show $0 salary
Minor league contracts in `get_contracts` have all `salary0`–`salary14` fields as 0. The `contract_team_id` reflects the MLB parent org, while `team_id` is the current affiliate. `is_major: 0` identifies minor league deals. `season_year: 0` on minor league contracts (vs actual year on MLB deals).

### `get_players` `team_id` filter still fetches globally
When using `get_players` without `team_id`, the full league-wide roster is returned. Consider using the filter when you only care about one team's players to reduce payload size — though the response will still be large for big orgs with many affiliates.

## Adding New Endpoints

1. Verify the endpoint against the live API with `curl` using `year=<latest>` to confirm it returns data
2. Add types to `src/types.ts` (column names must match the CSV header exactly)
3. Add a method to `StatsPlusClient` in `src/client.ts`
4. Add a tool definition + case in `src/tools.ts`
5. Add tests in `tests/` using real column names from the live response
6. Run `npm test` and `npm run build` to verify
