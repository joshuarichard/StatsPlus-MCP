#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { StatsPlusClient } from "./client.js";
import { toolDefinitions, handleTool } from "./tools.js";

const LEAGUE_URL = process.env.STATSPLUS_LEAGUE_URL;
const COOKIE = process.env.STATSPLUS_COOKIE;

if (!LEAGUE_URL) {
  console.error("Error: STATSPLUS_LEAGUE_URL environment variable is required.");
  console.error("  Set it to your league's URL slug, e.g. 'mlb2025' or 'myleague'");
  process.exit(1);
}

const client = new StatsPlusClient({ leagueUrl: LEAGUE_URL, cookie: COOKIE });

const server = new Server(
  {
    name: "statsplus-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: toolDefinitions.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema),
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const toolDef = toolDefinitions.find((t) => t.name === name);
  if (!toolDef) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  const parsed = toolDef.inputSchema.safeParse(args ?? {});
  if (!parsed.success) {
    return {
      content: [
        {
          type: "text",
          text: `Invalid arguments: ${parsed.error.message}`,
        },
      ],
      isError: true,
    };
  }

  try {
    const result = await handleTool(
      name as Parameters<typeof handleTool>[0],
      parsed.data as Record<string, unknown>,
      client
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("StatsPlus MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
