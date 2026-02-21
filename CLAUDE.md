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
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `STATSPLUS_LEAGUE_URL` | Yes | Your league's URL slug, e.g. `mlb2025` |
| `STATSPLUS_COOKIE` | No | Session cookie for authenticated access |

**Authentication note:** The StatsPlus API requires you to be logged in to your league at `https://statsplus.net/<LGURL>` and linked to a team. Pass your session cookie via `STATSPLUS_COOKIE`.

## Available Tools

| Tool | Description |
|---|---|
| `get_player_batting_stats` | Batting stats; filter by `year`, `pid`, `split` |
| `get_player_pitching_stats` | Pitching stats; filter by `year`, `pid`, `split` |
| `get_teams` | Team list with IDs and abbreviations |
| `get_draft` | Draft picks; optionally filter by league `lid` |
| `get_exports` | CSV export of all games (scores, pitchers, dates) |

**Split IDs:** `1` = Overall, `2` = vs Left-handed, `3` = vs Right-handed

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

1. Add types to `src/types.ts`
2. Add a method to `StatsPlusClient` in `src/client.ts`
3. Add a tool definition + case in `src/tools.ts`
4. Add tests in `tests/`
5. Run `npm test` and `npm run build` to verify
