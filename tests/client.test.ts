import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StatsPlusClient, parseCsv, parseCsvRow } from "../src/client.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockCsvResponse(csv: string, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { get: () => "text/csv" },
    text: () => Promise.resolve(csv),
  });
}

function mockJsonResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { get: () => "application/json" },
    json: () => Promise.resolve(data),
  });
}

// ---- parseCsvRow ----

describe("parseCsvRow", () => {
  it("splits simple comma-separated values", () => {
    expect(parseCsvRow("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields", () => {
    expect(parseCsvRow('"hello","world"')).toEqual(["hello", "world"]);
  });

  it("handles quoted fields containing commas", () => {
    expect(parseCsvRow('"Parent Team ID","foo,bar"')).toEqual(["Parent Team ID", "foo,bar"]);
  });

  it("handles escaped double-quotes inside quoted fields", () => {
    expect(parseCsvRow('"say ""hi"""')).toEqual(['say "hi"']);
  });
});

// ---- parseCsv ----

describe("parseCsv", () => {
  it("returns empty array for blank input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("returns empty array for headers-only input", () => {
    expect(parseCsv("id,name\n")).toEqual([]);
  });

  it("parses rows into objects keyed by header", () => {
    const result = parseCsv("id,name\n1,Alice\n2,Bob");
    expect(result).toEqual([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
  });

  it("coerces numeric strings to numbers", () => {
    const result = parseCsv("x,y\n3.14,0");
    expect(result[0].x).toBe(3.14);
    expect(result[0].y).toBe(0);
  });

  it("leaves non-numeric strings as strings", () => {
    const result = parseCsv("name\nAlice");
    expect(result[0].name).toBe("Alice");
  });

  it("handles CRLF line endings", () => {
    const result = parseCsv("id,name\r\n1,Alice\r\n");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 1, name: "Alice" });
  });

  it("skips blank trailing lines", () => {
    const result = parseCsv("id\n1\n\n");
    expect(result).toHaveLength(1);
  });
});

// ---- StatsPlusClient ----

describe("StatsPlusClient", () => {
  const client = new StatsPlusClient({ leagueUrl: "testleague" });

  describe("constructor", () => {
    it("includes Cookie header when cookie is provided", async () => {
      const c = new StatsPlusClient({ leagueUrl: "league", cookie: "session=abc123" });
      mockCsvResponse("ID,Name\n1,Yankees");
      await c.getTeams();
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)["Cookie"]).toBe("session=abc123");
    });

    it("omits Cookie header when not provided", async () => {
      mockCsvResponse("ID,Name,Nickname,Parent Team ID\n1,Yankees,NYY,0");
      await client.getTeams();
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)["Cookie"]).toBeUndefined();
    });
  });

  describe("getTeams", () => {
    it("calls the /teams/ endpoint", async () => {
      mockCsvResponse("ID,Name,Nickname,Parent Team ID\n1,Yankees,NYY,0");
      await client.getTeams();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/teams/");
    });

    it("parses CSV into Team objects with numeric ID", async () => {
      mockCsvResponse("ID,Name,Nickname,Parent Team ID\n1,Yankees,NYY,0\n2,Mets,NYM,0");
      const result = await client.getTeams();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ ID: 1, Name: "Yankees", Nickname: "NYY", "Parent Team ID": 0 });
    });
  });

  describe("getPlayerBatStats", () => {
    const header = "id,player_id,year,team_id,game_id,league_id,level_id,split_id,position,ab,h,k,pa,pitches_seen,g,gs,d,t,hr,r,rbi,sb,cs,bb,ibb,gdp,sh,sf,hp,ci,wpa,stint,ubr,war";

    it("calls the /playerbatstatsv2/ endpoint", async () => {
      mockCsvResponse(`${header}\n`);
      await client.getPlayerBatStats();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/playerbatstatsv2/");
    });

    it("appends year, pid, and split params", async () => {
      mockCsvResponse(`${header}\n`);
      await client.getPlayerBatStats({ year: 2058, pid: 42, split: 1 });
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("year=2058");
      expect(url).toContain("pid=42");
      expect(url).toContain("split=1");
    });

    it("parses CSV rows into PlayerBatStatLine objects", async () => {
      mockCsvResponse(`${header}\n1,65,2058,7,0,100,1,1,1,512,152,107,559,1967,151,141,28,1,12,62,61,10,5,39,1,9,1,0,7,0,-0.0155,0,-4.1117,3.3645`);
      const result = await client.getPlayerBatStats({ year: 2058 });
      expect(result).toHaveLength(1);
      expect(result[0].player_id).toBe(65);
      expect(result[0].year).toBe(2058);
      expect(result[0].ab).toBe(512);
      expect(result[0].war).toBe(3.3645);
    });
  });

  describe("getPlayerPitchStats", () => {
    it("calls the /playerpitchstatsv2/ endpoint", async () => {
      mockCsvResponse("id,player_id,year\n");
      await client.getPlayerPitchStats();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/playerpitchstatsv2/");
    });

    it("appends year, pid, and split params", async () => {
      mockCsvResponse("id,player_id\n");
      await client.getPlayerPitchStats({ year: 2057, pid: 99, split: 3 });
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("year=2057");
      expect(url).toContain("pid=99");
      expect(url).toContain("split=3");
    });
  });

  describe("getDraft", () => {
    it("calls the /draftv2/ endpoint", async () => {
      mockCsvResponse('"ID","Round"\n');
      await client.getDraft();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/draftv2/");
    });

    it("appends lid param when provided", async () => {
      mockCsvResponse('"ID","Round"\n');
      await client.getDraft({ lid: 101 });
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("lid=101");
    });

    it("parses quoted CSV headers correctly", async () => {
      mockCsvResponse('"ID","Round","Player Name"\n"1","3","Jane Doe"');
      const result = await client.getDraft();
      expect(result[0]["Player Name"]).toBe("Jane Doe");
      expect(result[0].ID).toBe(1);
    });
  });

  describe("getPlayers", () => {
    const header = 'ID,"First Name","Last Name","Team ID","Parent Team ID",Level,Pos,Role,Age,Retired';

    it("calls the /players/ endpoint", async () => {
      mockCsvResponse(`${header}\n`);
      await client.getPlayers();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/players/");
    });

    it("appends team_id param when provided", async () => {
      mockCsvResponse(`${header}\n`);
      await client.getPlayers({ team_id: 7 });
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("team_id=7");
    });

    it("omits team_id param when not provided", async () => {
      mockCsvResponse(`${header}\n`);
      await client.getPlayers();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).not.toContain("team_id");
    });

    it("parses CSV response into Player objects", async () => {
      mockCsvResponse(`${header}\n1,John,Doe,7,0,MLB,SP,Starter,28,`);
      const result = await client.getPlayers();
      expect(result).toHaveLength(1);
      expect(result[0].ID).toBe(1);
      expect(result[0]["First Name"]).toBe("John");
      expect(result[0]["Last Name"]).toBe("Doe");
      expect(result[0]["Team ID"]).toBe(7);
      expect(result[0].Age).toBe(28);
    });
  });

  describe("getExports", () => {
    it("calls the /exports/ endpoint", async () => {
      mockJsonResponse({ current_date: "2059-02-20", "2059-02-20": [1, 2] });
      await client.getExports();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/exports/");
    });

    it("returns parsed JSON schedule object", async () => {
      const data = { current_date: "2059-02-20", "2059-02-20": [1, 2, 3] };
      mockJsonResponse(data);
      const result = await client.getExports();
      expect(result.current_date).toBe("2059-02-20");
      expect(result["2059-02-20"]).toEqual([1, 2, 3]);
    });
  });

  describe("error handling", () => {
    it("throws on non-ok HTTP response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403, statusText: "Forbidden" });
      await expect(client.getTeams()).rejects.toThrow("403");
    });

    it("throws on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      await expect(client.getTeams()).rejects.toThrow("Network error");
    });
  });
});
