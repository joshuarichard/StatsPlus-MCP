import { z } from "zod";
import type { StatsPlusClient } from "./client.js";

export const splitIdSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().describe(
  "Split ID: 1 = Overall, 2 = vs Left-handed, 3 = vs Right-handed"
);

type ToolHandler = (args: Record<string, unknown>, client: StatsPlusClient) => Promise<unknown>;

export const toolDefinitions = [
  {
    name: "get_player_batting_stats",
    description:
      "Retrieve player batting statistics. Returns stat lines with splits. Defaults to top-level (MLB) leagues; pass lid to get stats for a specific league (e.g. minor leagues). Omit all params to get all players for all seasons.",
    inputSchema: z.object({
      year: z.number().int().min(1900).max(2100).optional().describe("Season year, e.g. 2024"),
      pid: z.number().int().positive().optional().describe("Player ID for a single player"),
      split: splitIdSchema,
      lid: z.number().int().positive().optional().describe("League ID — defaults to all top-level leagues; pass a specific league ID to get minor league stats"),
    }),
    handler: ((a, c) => c.getPlayerBatStats(a)) as ToolHandler,
  },
  {
    name: "get_player_fielding_stats",
    description:
      "Retrieve player fielding statistics by position. Returns stat lines with splits. Defaults to top-level (MLB) leagues; pass lid to get stats for a specific league. Omit all params to get all players for all seasons.",
    inputSchema: z.object({
      year: z.number().int().min(1900).max(2100).optional().describe("Season year, e.g. 2024"),
      pid: z.number().int().positive().optional().describe("Player ID for a single player"),
      split: splitIdSchema,
      lid: z.number().int().positive().optional().describe("League ID — defaults to all top-level leagues; pass a specific league ID to get minor league stats"),
    }),
    handler: ((a, c) => c.getPlayerFieldStats(a)) as ToolHandler,
  },
  {
    name: "get_player_pitching_stats",
    description:
      "Retrieve player pitching statistics. Returns stat lines with splits. Defaults to top-level (MLB) leagues; pass lid to get stats for a specific league (e.g. minor leagues). Omit all params to get all players for all seasons.",
    inputSchema: z.object({
      year: z.number().int().min(1900).max(2100).optional().describe("Season year, e.g. 2024"),
      pid: z.number().int().positive().optional().describe("Player ID for a single player"),
      split: splitIdSchema,
      lid: z.number().int().positive().optional().describe("League ID — defaults to all top-level leagues; pass a specific league ID to get minor league stats"),
    }),
    handler: ((a, c) => c.getPlayerPitchStats(a)) as ToolHandler,
  },
  {
    name: "get_team_batting_stats",
    description: "Retrieve team batting statistics. Omit params to get all teams for all seasons.",
    inputSchema: z.object({
      year: z.number().int().min(1900).max(2100).optional().describe("Season year, e.g. 2058"),
      split: splitIdSchema,
    }),
    handler: ((a, c) => c.getTeamBatStats(a)) as ToolHandler,
  },
  {
    name: "get_team_pitching_stats",
    description: "Retrieve team pitching statistics. Omit params to get all teams for all seasons.",
    inputSchema: z.object({
      year: z.number().int().min(1900).max(2100).optional().describe("Season year, e.g. 2058"),
      split: splitIdSchema,
    }),
    handler: ((a, c) => c.getTeamPitchStats(a)) as ToolHandler,
  },
  {
    name: "get_teams",
    description: "Retrieve the list of teams in the league with their IDs and abbreviations.",
    inputSchema: z.object({}),
    handler: ((_a, c) => c.getTeams()) as ToolHandler,
  },
  {
    name: "get_draft",
    description: "Retrieve draft data. For multi-league associations, specify the league ID.",
    inputSchema: z.object({
      lid: z.number().int().positive().optional().describe("League ID for associations with multiple drafts"),
    }),
    handler: ((a, c) => c.getDraft(a)) as ToolHandler,
  },
  {
    name: "get_exports",
    description:
      "Retrieve a CSV export of all major league games since the league started, including scores, starting pitchers, winning/losing pitchers, and game dates.",
    inputSchema: z.object({}),
    handler: ((_a, c) => c.getExports()) as ToolHandler,
  },
  {
    name: "start_ratings_job",
    description:
      "Start the async ratings export job and return a poll_url immediately, without waiting. Call this at the beginning of a workflow, do other data lookups while the job processes (~60–90s), then call get_ratings(poll_url) to collect results. This avoids blocking the workflow mid-step.",
    inputSchema: z.object({}),
    handler: ((_a, c) => c.startRatingsJob()) as ToolHandler,
  },
  {
    name: "get_ratings",
    description:
      "Retrieve player ratings (overall, potential, and per-attribute). If you have a poll_url from start_ratings_job, pass it here to collect results without re-starting the job. Without poll_url, starts a new job and blocks up to ~5 minutes waiting for results.",
    inputSchema: z.object({
      poll_url: z.string().url().optional()
        .describe("Poll URL returned by start_ratings_job. If provided, skips the job startup and 30s initial delay."),
      player_ids: z.array(z.number().int().positive()).optional()
        .describe("Filter results to specific player IDs. The full async job still runs, but only matching players are returned."),
    }),
    handler: ((a, c) => c.getRatings(a)) as ToolHandler,
  },
  {
    name: "get_game_history",
    description:
      "Retrieve all major league games since the league started, including scores, hitting, pitchers, and game dates.",
    inputSchema: z.object({}),
    handler: ((_a, c) => c.getGameHistory()) as ToolHandler,
  },
  {
    name: "get_contracts",
    description: "Retrieve all current and active player contracts.",
    inputSchema: z.object({
      team_id: z.number().int().positive().optional()
        .describe("MLB team ID — filters by the team that holds the contract (contract_team_id)"),
      player_id: z.number().int().positive().optional()
        .describe("Player ID to fetch a single player's contract"),
    }),
    handler: ((a, c) => c.getContracts(a)) as ToolHandler,
  },
  {
    name: "get_contract_extensions",
    description: "Retrieve signed contract extensions that take effect in future seasons.",
    inputSchema: z.object({}),
    handler: ((_a, c) => c.getContractExtensions()) as ToolHandler,
  },
  {
    name: "get_players",
    description: "Retrieve the player roster. Optionally filter by team_id to get a single team's players.",
    inputSchema: z.object({
      team_id: z.number().int().positive().optional().describe("Team ID to filter by"),
      org_id: z.number().int().positive().optional()
        .describe("MLB org team ID — returns all players in the org (MLB roster + all affiliates) by filtering on Parent Team ID"),
    }),
    handler: ((a, c) => c.getPlayers(a)) as ToolHandler,
  },
  {
    name: "find_player",
    description: "Search for players by name (partial, case-insensitive). Returns matching players with their IDs and team info. Use this to resolve a player name to an ID without downloading the full roster.",
    inputSchema: z.object({
      name: z.string().describe("Name to search (partial, case-insensitive match on first name, last name, or full name)"),
    }),
    handler: ((a, c) => c.findPlayer(a as { name: string })) as ToolHandler,
  },
] as const;

type ToolName = (typeof toolDefinitions)[number]["name"];

export const toolMap: ReadonlyMap<string, (typeof toolDefinitions)[number]> =
  new Map(toolDefinitions.map((t) => [t.name, t]));

export async function handleTool(
  name: ToolName,
  args: Record<string, unknown>,
  client: StatsPlusClient
): Promise<unknown> {
  const tool = toolMap.get(name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.handler(args, client);
}
