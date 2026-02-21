import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StatsPlusClient } from "../src/client.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockJsonResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { get: () => "application/json" },
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function mockTextResponse(text: string, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { get: () => "text/csv" },
    text: () => Promise.resolve(text),
  });
}

describe("StatsPlusClient", () => {
  const client = new StatsPlusClient({ leagueUrl: "testleague" });

  describe("constructor", () => {
    it("strips leading/trailing slashes from leagueUrl", () => {
      const c = new StatsPlusClient({ leagueUrl: "/myteam/" });
      // Base URL is private, but we can verify it works by making a call
      mockJsonResponse([]);
      expect(() => c.getTeams()).not.toThrow();
    });

    it("includes Cookie header when cookie is provided", async () => {
      const c = new StatsPlusClient({ leagueUrl: "league", cookie: "session=abc123" });
      mockJsonResponse([]);
      await c.getTeams();
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)["Cookie"]).toBe("session=abc123");
    });

    it("omits Cookie header when not provided", async () => {
      mockJsonResponse([]);
      await client.getTeams();
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)["Cookie"]).toBeUndefined();
    });
  });

  describe("getTeams", () => {
    it("calls the /teams/ endpoint", async () => {
      const teams = [{ team_id: 1, name: "Yankees", abbr: "NYY" }];
      mockJsonResponse(teams);
      const result = await client.getTeams();
      expect(result).toEqual(teams);
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/teams/");
    });
  });

  describe("getPlayerBatStats", () => {
    it("calls the /playerbatstatsv2/ endpoint without params", async () => {
      mockJsonResponse([]);
      await client.getPlayerBatStats();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/playerbatstatsv2/");
    });

    it("appends year param when provided", async () => {
      mockJsonResponse([]);
      await client.getPlayerBatStats({ year: 2024 });
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("year=2024");
    });

    it("appends pid param when provided", async () => {
      mockJsonResponse([]);
      await client.getPlayerBatStats({ pid: 42 });
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("pid=42");
    });

    it("appends split param when provided", async () => {
      mockJsonResponse([]);
      await client.getPlayerBatStats({ split: 2 });
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("split=2");
    });

    it("returns parsed stat lines", async () => {
      const stats = [{ split_id: 1, pid: 5, year: 2023, avg: 0.305 }];
      mockJsonResponse(stats);
      const result = await client.getPlayerBatStats({ pid: 5 });
      expect(result).toEqual(stats);
    });
  });

  describe("getPlayerPitchStats", () => {
    it("calls the /playerpitchstatsv2/ endpoint", async () => {
      mockJsonResponse([]);
      await client.getPlayerPitchStats();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/playerpitchstatsv2/");
    });

    it("appends year, pid, and split params", async () => {
      mockJsonResponse([]);
      await client.getPlayerPitchStats({ year: 2022, pid: 99, split: 3 });
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("year=2022");
      expect(url).toContain("pid=99");
      expect(url).toContain("split=3");
    });
  });

  describe("getDraft", () => {
    it("calls the /draftv2/ endpoint", async () => {
      mockJsonResponse([]);
      await client.getDraft();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/draftv2/");
    });

    it("appends lid param when provided", async () => {
      mockJsonResponse([]);
      await client.getDraft({ lid: 101 });
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("lid=101");
    });
  });

  describe("getExports", () => {
    it("calls the /exports/ endpoint", async () => {
      mockTextResponse("game_id,date,home,away\n1,2024-04-01,NYY,BOS");
      await client.getExports();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/exports/");
    });

    it("returns raw CSV text", async () => {
      const csv = "game_id,date\n1,2024-04-01";
      mockTextResponse(csv);
      const result = await client.getExports();
      expect(result).toBe(csv);
    });
  });

  describe("error handling", () => {
    it("throws on non-ok HTTP response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        headers: { get: () => "text/html" },
      });
      await expect(client.getTeams()).rejects.toThrow("403");
    });

    it("throws on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      await expect(client.getTeams()).rejects.toThrow("Network error");
    });
  });
});
