import { describe, it, expect, vi } from "vitest";
import { handleTool, toolDefinitions } from "../src/tools.js";
import type { StatsPlusClient } from "../src/client.js";

function makeMockClient(overrides: Partial<StatsPlusClient> = {}): StatsPlusClient {
  return {
    getPlayerBatStats: vi.fn().mockResolvedValue([]),
    getPlayerPitchStats: vi.fn().mockResolvedValue([]),
    getPlayerFieldStats: vi.fn().mockResolvedValue([]),
    getTeams: vi.fn().mockResolvedValue([]),
    getDraft: vi.fn().mockResolvedValue([]),
    getExports: vi.fn().mockResolvedValue(""),
    getPlayers: vi.fn().mockResolvedValue([]),
    getTeamBatStats: vi.fn().mockResolvedValue([]),
    getTeamPitchStats: vi.fn().mockResolvedValue([]),
    getGameHistory: vi.fn().mockResolvedValue([]),
    getContracts: vi.fn().mockResolvedValue([]),
    getContractExtensions: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as StatsPlusClient;
}

describe("toolDefinitions", () => {
  it("exports 12 tool definitions", () => {
    expect(toolDefinitions).toHaveLength(12);
  });

  it("includes expected tool names", () => {
    const names = toolDefinitions.map((t) => t.name);
    expect(names).toContain("get_player_batting_stats");
    expect(names).toContain("get_player_pitching_stats");
    expect(names).toContain("get_player_fielding_stats");
    expect(names).toContain("get_teams");
    expect(names).toContain("get_draft");
    expect(names).toContain("get_exports");
    expect(names).toContain("get_players");
    expect(names).toContain("get_team_batting_stats");
    expect(names).toContain("get_team_pitching_stats");
    expect(names).toContain("get_game_history");
    expect(names).toContain("get_contracts");
    expect(names).toContain("get_contract_extensions");
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

  describe("get_player_fielding_stats", () => {
    it("calls getPlayerFieldStats with no args", async () => {
      const client = makeMockClient();
      await handleTool("get_player_fielding_stats", {}, client);
      expect(client.getPlayerFieldStats).toHaveBeenCalledWith({
        year: undefined,
        pid: undefined,
        split: undefined,
      });
    });

    it("passes year, pid, and split to getPlayerFieldStats", async () => {
      const client = makeMockClient();
      await handleTool("get_player_fielding_stats", { year: 2024, pid: 7, split: 2 }, client);
      expect(client.getPlayerFieldStats).toHaveBeenCalledWith({ year: 2024, pid: 7, split: 2 });
    });

    it("returns result from client", async () => {
      const stats = [{ player_id: 1, position: 6, e: 5 }];
      const client = makeMockClient({ getPlayerFieldStats: vi.fn().mockResolvedValue(stats) });
      const result = await handleTool("get_player_fielding_stats", {}, client);
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

  describe("get_team_batting_stats", () => {
    it("calls getTeamBatStats with no args", async () => {
      const client = makeMockClient();
      await handleTool("get_team_batting_stats", {}, client);
      expect(client.getTeamBatStats).toHaveBeenCalledWith({ year: undefined, split: undefined });
    });

    it("passes year and split to getTeamBatStats", async () => {
      const client = makeMockClient();
      await handleTool("get_team_batting_stats", { year: 2058, split: 2 }, client);
      expect(client.getTeamBatStats).toHaveBeenCalledWith({ year: 2058, split: 2 });
    });

    it("returns result from client", async () => {
      const stats = [{ tid: 4, abbr: "BOS", hr: 170 }];
      const client = makeMockClient({ getTeamBatStats: vi.fn().mockResolvedValue(stats) });
      const result = await handleTool("get_team_batting_stats", {}, client);
      expect(result).toEqual(stats);
    });
  });

  describe("get_team_pitching_stats", () => {
    it("calls getTeamPitchStats with no args", async () => {
      const client = makeMockClient();
      await handleTool("get_team_pitching_stats", {}, client);
      expect(client.getTeamPitchStats).toHaveBeenCalledWith({ year: undefined, split: undefined });
    });

    it("passes year and split to getTeamPitchStats", async () => {
      const client = makeMockClient();
      await handleTool("get_team_pitching_stats", { year: 2058, split: 3 }, client);
      expect(client.getTeamPitchStats).toHaveBeenCalledWith({ year: 2058, split: 3 });
    });

    it("returns result from client", async () => {
      const stats = [{ tid: 4, abbr: "BOS", era: 4.75 }];
      const client = makeMockClient({ getTeamPitchStats: vi.fn().mockResolvedValue(stats) });
      const result = await handleTool("get_team_pitching_stats", {}, client);
      expect(result).toEqual(stats);
    });
  });

  describe("get_game_history", () => {
    it("calls getGameHistory", async () => {
      const client = makeMockClient();
      await handleTool("get_game_history", {}, client);
      expect(client.getGameHistory).toHaveBeenCalled();
    });

    it("returns result from client", async () => {
      const games = [{ game_id: 2013000001, home_team: 2, away_team: 6 }];
      const client = makeMockClient({ getGameHistory: vi.fn().mockResolvedValue(games) });
      const result = await handleTool("get_game_history", {}, client);
      expect(result).toEqual(games);
    });
  });

  describe("get_contracts", () => {
    it("calls getContracts", async () => {
      const client = makeMockClient();
      await handleTool("get_contracts", {}, client);
      expect(client.getContracts).toHaveBeenCalled();
    });

    it("returns result from client", async () => {
      const contracts = [{ player_id: 1, team_id: 7, years: 3 }];
      const client = makeMockClient({ getContracts: vi.fn().mockResolvedValue(contracts) });
      const result = await handleTool("get_contracts", {}, client);
      expect(result).toEqual(contracts);
    });
  });

  describe("get_contract_extensions", () => {
    it("calls getContractExtensions", async () => {
      const client = makeMockClient();
      await handleTool("get_contract_extensions", {}, client);
      expect(client.getContractExtensions).toHaveBeenCalled();
    });

    it("returns result from client", async () => {
      const extensions = [{ player_id: 2, team_id: 3, years: 5 }];
      const client = makeMockClient({ getContractExtensions: vi.fn().mockResolvedValue(extensions) });
      const result = await handleTool("get_contract_extensions", {}, client);
      expect(result).toEqual(extensions);
    });
  });

  describe("get_players", () => {
    it("calls getPlayers with no team_id", async () => {
      const client = makeMockClient();
      await handleTool("get_players", {}, client);
      expect(client.getPlayers).toHaveBeenCalledWith({ team_id: undefined });
    });

    it("passes team_id to getPlayers", async () => {
      const client = makeMockClient();
      await handleTool("get_players", { team_id: 7 }, client);
      expect(client.getPlayers).toHaveBeenCalledWith({ team_id: 7 });
    });

    it("returns result from client", async () => {
      const players = [{ ID: 1, "First Name": "John", "Last Name": "Doe" }];
      const client = makeMockClient({ getPlayers: vi.fn().mockResolvedValue(players) });
      const result = await handleTool("get_players", {}, client);
      expect(result).toEqual(players);
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
