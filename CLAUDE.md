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
| `STATSPLUS_LEAGUE_URL` | Yes | Your league's URL slug, e.g. `myleague` |
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
| `get_players` | Player roster; filter by `team_id` or `org_id` (all players in an MLB org) |
| `find_player` | Search players by name (partial, case-insensitive) — resolves name → ID without full roster download |
| `start_ratings_job` | Fires the async ratings export job and returns a `poll_url` immediately — call at start of workflow |
| `get_ratings` | Collect ratings results; pass `poll_url` from `start_ratings_job` to skip re-starting the job; filter by `player_ids` |
| `get_game_history` | All major league games with scores, hits, errors, and pitcher IDs |
| `get_contracts` | Active player contracts; filter by `team_id` (MLB org) or `player_id` |
| `get_contract_extensions` | Signed extensions taking effect in future seasons |
| `get_teams` | Team list with IDs and abbreviations |
| `get_draft` | Draft picks; optionally filter by league `lid` |
| `get_exports` | CSV export of all games (scores, pitchers, dates) |

**Split IDs:** `1` = Overall, `2` = vs Left-handed, `3` = vs Right-handed

**Recommended ratings workflow:** Call `start_ratings_job()` early in your workflow to get a `poll_url`, do other data lookups while the job processes (~60–90s), then call `get_ratings(poll_url)` to collect results without blocking.

**Preseason note:** Player stat endpoints (`batting`, `pitching`, `fielding`) return HTTP 204 (no content) when no games have been played for the requested period. Always pass `year` to get historical data during preseason.

## API Behavior Notes

- Stat endpoints return CSV; non-stat endpoints (`teams`, `exports`) return JSON or CSV without needing a year filter.
- The `/players/` endpoint returns roster data including first/last names — use `find_player(name)` for quick name→ID lookups, or `get_players(org_id)` for a full org roster.
- All CSV responses are parsed dynamically by column header name, so new columns added by the API will pass through even if not typed in the interface.
- `/ratings/` is an async background job. `start_ratings_job()` fires the request and returns a `poll_url` immediately. `get_ratings(poll_url)` polls (no initial 30s delay when poll_url is provided). Without poll_url, `get_ratings()` starts a new job, waits 30s, then polls every 15s. Typically resolves in 60–90s total; times out after ~5 minutes.
- `get_contracts` and `get_players` filtering is client-side — the full dataset is always fetched from the API, then filtered before returning. Filters reduce response payload but not network transfer.

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
`get_players`, `get_contracts`, and `get_ratings` can return datasets too large for the context window. When that happens, the MCP client saves output to a temp file at `~/.claude/projects/.../tool-results/<tool-name>-<timestamp>.txt`. The format is a JSON array with a single `{type: "text", text: "..."}` object. To work with them:
```python
import json
data = json.load(open(file_path))
records = json.loads(data[0]['text'])
```
Use the filter params (`org_id`, `team_id`, `player_id`, `player_ids`) to reduce payload size and avoid hitting the file-save threshold.

### Minor league players return empty stats arrays
`get_player_batting_stats`, `get_player_pitching_stats`, and `get_player_fielding_stats` only return MLB-level stats. Players in AAA or below return `[]` even when specifying a `year`. There is no minor league stats endpoint — use `get_ratings` for prospect evaluation instead.

### split_id 21 is postseason data
`split_id: 21` is confirmed postseason. Multiple players from a playoff team all showed 6–7 AB rows (matching a playoff series) under this split, with `pitches_seen` populated (unlike splits 2/3 which always have `pitches_seen: 0`). Filter it out for regular-season analysis. Note that `wpa` and `ubr` are only populated on `split_id: 1` (overall) — splits 2, 3, and 21 always show `wpa: 0` and `ubr: 0`.

### Player team context in `get_players`
Minor league players have their affiliate `Team ID` set to the minor league team (e.g., 93 = Durham Bulls), not the MLB parent. The `Parent Team ID` field holds the MLB org. Always use `Parent Team ID` to resolve which MLB team controls a minor league player.

### A player can show Level 1 in roster but have no stats for a given year
If a player is on the MLB roster (`Level: 1`) in `get_players` but returns `[]` from a stat endpoint with a specific year, they likely had no MLB plate appearances that year (e.g., promoted in the offseason after the season ended, or injured all year). Not a data error — just no qualifying activity.

### Ratings have no OVR field — compute it from components
The ratings endpoint does not include a composite overall rating. Compute OVR manually using these standard formulas:

```python
# Hitter OVR (position players)
# Pow and Cntct are the primary offensive drivers; Eye (walks/OBP) next;
# Gap is secondary power; Ks avoidance matters least (power hitters still produce)
def bat_ovr(p):
    return (p['Pow']   * 0.30 +
            p['Cntct'] * 0.25 +
            p['Eye']   * 0.20 +
            p['Gap']   * 0.15 +
            p['Ks']    * 0.10)

# Pitcher OVR (SP or RP)
# Control is the most important attribute (walks are costly); Stuff second (Ks);
# Movement third (contact quality / GB rate)
def pit_ovr(p):
    ctrl = (p['Ctrl_R'] + p['Ctrl_L']) / 2
    return (ctrl       * 0.40 +
            p['Stf']   * 0.35 +
            p['Mov']   * 0.25)

# Potential versions (same weights, Pot- prefix fields)
def bat_pot(p):
    return (p['PotPow']   * 0.30 +
            p['PotCntct'] * 0.25 +
            p['PotEye']   * 0.20 +
            p['PotGap']   * 0.15 +
            p['PotKs']    * 0.10)

def pit_pot(p):
    return (p['PotCtrl'] * 0.40 +
            p['PotStf']  * 0.35 +
            p['PotMov']  * 0.25)
```

Use these consistently across all analyses. Ratings are on a 20–80 scale; 50 = MLB average, 60+ = above average, 70+ = star, 80 = elite.

### Ratings `Pos` field reflects role, not handedness
A player listed as `"Pos": "RP"` in ratings is a reliever, not necessarily a right-handed pitcher. The role designation (SP/RP) comes from the OOTP role, not pitching hand. The `Throws` field provides handedness. User-described "RHP" / "LHP" may map to `"RP"` or `"SP"` with `Throws: "R"` / `"L"`.

### WAR in batting stats is full positional WAR, not just batting
The `war` field accounts for batting, baserunning (`ubr`), and defense. A player with a strong offensive line can have a surprisingly low WAR due to poor speed/baserunning. Always check `ubr` alongside `war` when the numbers seem mismatched.

### Omitting `year` from stat endpoints returns all historical seasons (MLB only)
Calling `get_player_batting_stats(pid=X)` with no year returns every season on record for that player — useful for career context. This only works for players with MLB history; minor leaguers still return `[]` regardless.

### Contracts for minor leaguers show $0 salary
Minor league contracts in `get_contracts` have all `salary0`–`salary14` fields as 0. The `contract_team_id` reflects the MLB parent org, while `team_id` is the current affiliate. `is_major: 0` identifies minor league deals. `season_year: 0` on minor league contracts (vs actual year on MLB deals).

### `get_players` filtering is client-side
All three params (`team_id`, `org_id`) filter the response after fetching the full roster. `team_id` is passed to the API as a query param (server-side filtering where supported); `org_id` filters client-side by `Parent Team ID`. For full-org lookups, prefer `org_id` over iterating `team_id` per affiliate. Use `find_player(name)` for single-player name lookups — it avoids needing to process the full roster in the context window.

## Adding New Endpoints

1. Verify the endpoint against the live API with `curl` using `year=<latest>` to confirm it returns data
2. Add types to `src/types.ts` (column names must match the CSV header exactly)
3. Add a method to `StatsPlusClient` in `src/client.ts`
4. Add a tool definition + case in `src/tools.ts`
5. Add tests in `tests/` using real column names from the live response
6. Run `npm test` and `npm run build` to verify
