import { z } from "zod";
import type { StatsPlusClient } from "./client.js";

export const splitIdSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().describe(
  "Split ID: 1 = Overall, 2 = vs Left-handed, 3 = vs Right-handed"
);

export const toolDefinitions = [
  {
    name: "get_player_batting_stats",
    description:
      "Retrieve player batting statistics. Returns stat lines with splits. Omit all params to get all players for all seasons.",
    inputSchema: z.object({
      year: z.number().int().min(1900).max(2100).optional().describe("Season year, e.g. 2024"),
      pid: z.number().int().positive().optional().describe("Player ID for a single player"),
      split: splitIdSchema,
    }),
  },
  {
    name: "get_player_pitching_stats",
    description:
      "Retrieve player pitching statistics. Returns stat lines with splits. Omit all params to get all players for all seasons.",
    inputSchema: z.object({
      year: z.number().int().min(1900).max(2100).optional().describe("Season year, e.g. 2024"),
      pid: z.number().int().positive().optional().describe("Player ID for a single player"),
      split: splitIdSchema,
    }),
  },
  {
    name: "get_teams",
    description: "Retrieve the list of teams in the league with their IDs and abbreviations.",
    inputSchema: z.object({}),
  },
  {
    name: "get_draft",
    description: "Retrieve draft data. For multi-league associations, specify the league ID.",
    inputSchema: z.object({
      lid: z.number().int().positive().optional().describe("League ID for associations with multiple drafts"),
    }),
  },
  {
    name: "get_exports",
    description:
      "Retrieve a CSV export of all major league games since the league started, including scores, starting pitchers, winning/losing pitchers, and game dates.",
    inputSchema: z.object({}),
  },
] as const;

type ToolName = (typeof toolDefinitions)[number]["name"];

export async function handleTool(
  name: ToolName,
  args: Record<string, unknown>,
  client: StatsPlusClient
): Promise<unknown> {
  switch (name) {
    case "get_player_batting_stats":
      return client.getPlayerBatStats({
        year: args.year as number | undefined,
        pid: args.pid as number | undefined,
        split: args.split as 1 | 2 | 3 | undefined,
      });

    case "get_player_pitching_stats":
      return client.getPlayerPitchStats({
        year: args.year as number | undefined,
        pid: args.pid as number | undefined,
        split: args.split as 1 | 2 | 3 | undefined,
      });

    case "get_teams":
      return client.getTeams();

    case "get_draft":
      return client.getDraft({
        lid: args.lid as number | undefined,
      });

    case "get_exports":
      return client.getExports();

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
