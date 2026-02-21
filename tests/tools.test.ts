import { describe, it, expect, vi } from "vitest";
import { handleTool, toolDefinitions } from "../src/tools.js";
import type { StatsPlusClient } from "../src/client.js";

function makeMockClient(overrides: Partial<StatsPlusClient> = {}): StatsPlusClient {
  return {
    getPlayerBatStats: vi.fn().mockResolvedValue([]),
    getPlayerPitchStats: vi.fn().mockResolvedValue([]),
    getTeams: vi.fn().mockResolvedValue([]),
    getDraft: vi.fn().mockResolvedValue([]),
    getExports: vi.fn().mockResolvedValue(""),
    ...overrides,
  } as unknown as StatsPlusClient;
}

describe("toolDefinitions", () => {
  it("exports 5 tool definitions", () => {
    expect(toolDefinitions).toHaveLength(5);
  });

  it("includes expected tool names", () => {
    const names = toolDefinitions.map((t) => t.name);
    expect(names).toContain("get_player_batting_stats");
    expect(names).toContain("get_player_pitching_stats");
    expect(names).toContain("get_teams");
    expect(names).toContain("get_draft");
    expect(names).toContain("get_exports");
  });

  it("each tool has a description", () => {
    for (const tool of toolDefinitions) {
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it("each tool has an inputSchema", () => {
    for (const tool of toolDefinitions) {
      expect(tool.inputSchema).toBeDefined();
    }
  });
});

describe("handleTool", () => {
  describe("get_player_batting_stats", () => {
    it("calls getPlayerBatStats with no args", async () => {
      const client = makeMockClient();
      await handleTool("get_player_batting_stats", {}, client);
      expect(client.getPlayerBatStats).toHaveBeenCalledWith({
        year: undefined,
        pid: undefined,
        split: undefined,
      });
    });

    it("passes year, pid, and split to getPlayerBatStats", async () => {
      const client = makeMockClient();
      await handleTool("get_player_batting_stats", { year: 2024, pid: 7, split: 1 }, client);
      expect(client.getPlayerBatStats).toHaveBeenCalledWith({ year: 2024, pid: 7, split: 1 });
    });

    it("returns result from client", async () => {
      const stats = [{ pid: 1, avg: 0.3 }];
      const client = makeMockClient({ getPlayerBatStats: vi.fn().mockResolvedValue(stats) });
      const result = await handleTool("get_player_batting_stats", {}, client);
      expect(result).toEqual(stats);
    });
  });

  describe("get_player_pitching_stats", () => {
    it("calls getPlayerPitchStats with params", async () => {
      const client = makeMockClient();
      await handleTool("get_player_pitching_stats", { year: 2023, split: 2 }, client);
      expect(client.getPlayerPitchStats).toHaveBeenCalledWith({
        year: 2023,
        pid: undefined,
        split: 2,
      });
    });
  });

  describe("get_teams", () => {
    it("calls getTeams with no args", async () => {
      const client = makeMockClient();
      await handleTool("get_teams", {}, client);
      expect(client.getTeams).toHaveBeenCalled();
    });

    it("returns team list", async () => {
      const teams = [{ team_id: 1, name: "Cubs" }];
      const client = makeMockClient({ getTeams: vi.fn().mockResolvedValue(teams) });
      const result = await handleTool("get_teams", {}, client);
      expect(result).toEqual(teams);
    });
  });

  describe("get_draft", () => {
    it("calls getDraft with no lid", async () => {
      const client = makeMockClient();
      await handleTool("get_draft", {}, client);
      expect(client.getDraft).toHaveBeenCalledWith({ lid: undefined });
    });

    it("passes lid to getDraft", async () => {
      const client = makeMockClient();
      await handleTool("get_draft", { lid: 5 }, client);
      expect(client.getDraft).toHaveBeenCalledWith({ lid: 5 });
    });
  });

  describe("get_exports", () => {
    it("calls getExports", async () => {
      const client = makeMockClient();
      await handleTool("get_exports", {}, client);
      expect(client.getExports).toHaveBeenCalled();
    });

    it("returns CSV string", async () => {
      const csv = "date,home,away\n2024-04-01,NYY,BOS";
      const client = makeMockClient({ getExports: vi.fn().mockResolvedValue(csv) });
      const result = await handleTool("get_exports", {}, client);
      expect(result).toBe(csv);
    });
  });

  describe("unknown tool", () => {
    it("throws for an unrecognized tool name", async () => {
      const client = makeMockClient();
      await expect(
        handleTool("nonexistent_tool" as Parameters<typeof handleTool>[0], {}, client)
      ).rejects.toThrow("Unknown tool");
    });
  });
});
