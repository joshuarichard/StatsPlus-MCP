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

  describe("getPlayerFieldStats", () => {
    const header = "id,player_id,year,team_id,league_id,level_id,split_id,position,tc,a,po,er,ip,g,gs,e,dp,tp,pb,sba,rto,ipf,plays,plays_base,roe,opps_0,opps_made_0,opps_1,opps_made_1,opps_2,opps_made_2,opps_3,opps_made_3,opps_4,opps_made_4,opps_5,opps_made_5,framing,arm,zr";

    it("calls the /playerfieldstatsv2/ endpoint", async () => {
      mockCsvResponse(`${header}\n`);
      await client.getPlayerFieldStats();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/playerfieldstatsv2/");
    });

    it("appends year, pid, and split params", async () => {
      mockCsvResponse(`${header}\n`);
      await client.getPlayerFieldStats({ year: 2058, pid: 42, split: 2 });
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("year=2058");
      expect(url).toContain("pid=42");
      expect(url).toContain("split=2");
    });

    it("parses CSV into PlayerFieldStatLine objects", async () => {
      mockCsvResponse(`${header}\n464,65,2058,7,100,1,0,6,470,311,149,0,971,123,113,10,60,0,0,0,0,2,326,317,10,302,283,27,20,44,24,58,18,67,13,12,0,0.0,0.0,5.4636`);
      const result = await client.getPlayerFieldStats();
      expect(result).toHaveLength(1);
      expect(result[0].player_id).toBe(65);
      expect(result[0].position).toBe(6);
      expect(result[0].e).toBe(10);
      expect(result[0].zr).toBe(5.4636);
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

  describe("startRatingsJob", () => {
    const initMsg = "Request received, please check https://statsplus.net/mbl/api/mycsv/?request=test-uuid for output. The process may take several minutes.";

    it("calls the /ratings/ endpoint", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(initMsg) });
      await client.startRatingsJob();
      expect(mockFetch.mock.calls[0][0]).toContain("/api/ratings/");
    });

    it("returns poll_url extracted from response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(initMsg) });
      const result = await client.startRatingsJob();
      expect(result.poll_url).toContain("mycsv/?request=test-uuid");
    });

    it("throws if poll URL cannot be parsed from response", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve("Unexpected response") });
      await expect(client.startRatingsJob()).rejects.toThrow("Unexpected /ratings/ response");
    });

    it("makes only one fetch call (no polling)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(initMsg) });
      await client.startRatingsJob();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getRatings", () => {
    const initMsg = "Request received, please check https://statsplus.net/mbl/api/mycsv/?request=test-uuid for output. The process may take several minutes.";
    const csvData = "player_id,team_id,overall\n65,7,14\n";

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("calls /ratings/ then polls the returned URL", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(initMsg) })
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(csvData) });

      const promise = client.getRatings();
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch.mock.calls[0][0]).toContain("/api/ratings/");
      expect(mockFetch.mock.calls[1][0]).toContain("mycsv/?request=test-uuid");
      expect(result).toHaveLength(1);
      expect(result[0].player_id).toBe(65);
      expect(result[0].overall).toBe(14);
    });

    it("filters by player_ids when provided", async () => {
      const multiCsv = "ID,player_id,team_id,overall\n65,65,7,14\n99,99,5,12\n";
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(initMsg) })
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(multiCsv) });

      const promise = client.getRatings({ player_ids: [65] });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toHaveLength(1);
      expect(result[0].ID).toBe(65);
    });

    it("returns all ratings when player_ids is empty array", async () => {
      const multiCsv = "ID,player_id,team_id,overall\n65,65,7,14\n99,99,5,12\n";
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(initMsg) })
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(multiCsv) });

      const promise = client.getRatings({ player_ids: [] });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toHaveLength(2);
    });

    it("retries polling when response says Request received", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(initMsg) })
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(initMsg) })
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(csvData) });

      const promise = client.getRatings();
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(1);
    });

    it("retries polling when response says still in progress", async () => {
      const inProgressMsg = "Request ID abc-123 still in progress, check back soon";
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(initMsg) })
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(inProgressMsg) })
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(csvData) });

      const promise = client.getRatings();
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(1);
    });

    it("throws if poll URL cannot be parsed from response", async () => {
      // Error thrown before any setTimeout — no timer advancement needed
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve("Unexpected response") });
      await expect(client.getRatings()).rejects.toThrow("Unexpected /ratings/ response");
    });

    it("throws if poll endpoint returns non-ok status", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(initMsg) })
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: "Server Error", text: () => Promise.resolve("") });

      // Attach rejection handler before advancing timers to avoid unhandled rejection warning
      const promise = client.getRatings();
      const assertion = expect(promise).rejects.toThrow("Ratings poll error: 500");
      await vi.runAllTimersAsync();
      await assertion;
    });

    it("skips /ratings/ fetch and polls directly when poll_url is provided", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(csvData) });

      const result = await client.getRatings({ poll_url: "https://statsplus.net/mbl/api/mycsv/?request=test-uuid" });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain("mycsv/?request=test-uuid");
      expect(result).toHaveLength(1);
    });

    it("does not need timer advancement when poll_url provided and job is ready", async () => {
      // With fake timers active, if the promise resolves without runAllTimersAsync(),
      // it confirms no setTimeout is blocking the poll_url path
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(csvData) });

      const result = await client.getRatings({ poll_url: "https://statsplus.net/mbl/api/mycsv/?request=test-uuid" });
      expect(result).toHaveLength(1);
    });

    it("retries polling when poll_url provided and job not yet complete", async () => {
      const inProgressMsg = "Request ID abc-123 still in progress, check back soon";
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(inProgressMsg) })
        .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(csvData) });

      const promise = client.getRatings({ poll_url: "https://statsplus.net/mbl/api/mycsv/?request=test-uuid" });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
    });

    it("filters by player_ids when poll_url is provided", async () => {
      const multiCsv = "ID,player_id,team_id,overall\n65,65,7,14\n99,99,5,12\n";
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(multiCsv) });

      const result = await client.getRatings({
        poll_url: "https://statsplus.net/mbl/api/mycsv/?request=test-uuid",
        player_ids: [65],
      });

      expect(result).toHaveLength(1);
      expect(result[0].ID).toBe(65);
    });
  });

  describe("getTeamBatStats", () => {
    const header = "name,tid,abbr,pa,ab,h,k,tb,s,d,t,hr,sb,cs,rbi,r,bb,ibb,hp,sh,sf,ci,gidp,xbh,avg,obp,slg,ops,iso,k_pct,bb_pct,babip,woba,split_id";

    it("calls the /teambatstats/ endpoint", async () => {
      mockCsvResponse(`${header}\n`);
      await client.getTeamBatStats();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/teambatstats/");
    });

    it("appends year and split params", async () => {
      mockCsvResponse(`${header}\n`);
      await client.getTeamBatStats({ year: 2058, split: 1 });
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("year=2058");
      expect(url).toContain("split=1");
    });

    it("parses CSV into TeamBatStatLine objects", async () => {
      mockCsvResponse(`${header}\nBoston,4,BOS,6327,5658,1518,1206,2451,954,365,29,170,92,32,798,820,572,18,55,3,38,1,105,564,0.2683,0.3399,0.4333,0.7732,0.1650,19.0626,9.0296,0.3091,0.3341,1`);
      const result = await client.getTeamBatStats();
      expect(result).toHaveLength(1);
      expect(result[0].tid).toBe(4);
      expect(result[0].abbr).toBe("BOS");
      expect(result[0].hr).toBe(170);
      expect(result[0].split_id).toBe(1);
    });
  });

  describe("getTeamPitchStats", () => {
    const header = "name,tid,abbr,ip,ab,tb,ha,k,bf,bb,r,er,gb,fb,pi,ipf,sa,d,sh,sf,t,hra,bk,ci,iw,wp,hp,s,bs,cg,outs,era,lob,k_pct,bb_pct,k_bb_pct,fip,x_fip,e_f,babip,gbfb,hrfb,hr_pct,avg,obp,split_id";

    it("calls the /teampitchstats/ endpoint", async () => {
      mockCsvResponse(`${header}\n`);
      await client.getTeamPitchStats();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/teampitchstats/");
    });

    it("appends year and split params", async () => {
      mockCsvResponse(`${header}\n`);
      await client.getTeamPitchStats({ year: 2058, split: 2 });
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("year=2058");
      expect(url).toContain("split=2");
    });

    it("parses CSV into TeamPitchStatLine objects", async () => {
      mockCsvResponse(`${header}\nBoston,4,BOS,1444,5695,0,1525,1348,6359,563,801,765,1265,1544,23826,15,922,361,5,36,38,204,4,0,32,39,60,46,25,2,4347,4.7516,72.326,21.1983,8.8536,12.3447,4.5631,4.3873,0.1884,0.3161,45.0338,13.2124,3.2081,0.2678,0.3381,1`);
      const result = await client.getTeamPitchStats();
      expect(result).toHaveLength(1);
      expect(result[0].tid).toBe(4);
      expect(result[0].abbr).toBe("BOS");
      expect(result[0].era).toBe(4.7516);
      expect(result[0].split_id).toBe(1);
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

    it("filters by org_id on Parent Team ID", async () => {
      mockCsvResponse(`${header}\n1,John,Doe,7,851,MLB,SP,Starter,28,\n2,Jane,Smith,93,851,A,OF,Starter,22,\n3,Bob,Jones,5,5,MLB,RP,Reliever,30,`);
      const result = await client.getPlayers({ org_id: 851 });
      expect(result).toHaveLength(2);
      expect(result[0].ID).toBe(1);
      expect(result[1].ID).toBe(2);
    });

    it("includes MLB-level players whose Team ID matches org_id", async () => {
      mockCsvResponse(`${header}\n1,John,Doe,851,851,MLB,SP,Starter,28,\n2,Jane,Smith,93,851,A,OF,Starter,22,\n3,Bob,Jones,5,5,MLB,RP,Reliever,30,`);
      const result = await client.getPlayers({ org_id: 851 });
      expect(result).toHaveLength(2);
    });

    it("returns all players when org_id is not provided", async () => {
      mockCsvResponse(`${header}\n1,John,Doe,7,851,MLB,SP,Starter,28,\n2,Bob,Jones,5,5,MLB,RP,Reliever,30,`);
      const result = await client.getPlayers();
      expect(result).toHaveLength(2);
    });
  });

  describe("findPlayer", () => {
    const header = 'ID,"First Name","Last Name","Team ID","Parent Team ID",Level,Pos,Role,Age,Retired';

    it("calls the /players/ endpoint", async () => {
      mockCsvResponse(`${header}\n`);
      await client.findPlayer({ name: "Doe" });
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/players/");
    });

    it("filters by last name (case-insensitive)", async () => {
      mockCsvResponse(`${header}\n1,John,Doe,7,851,MLB,SP,Starter,28,\n2,Jane,Smith,7,851,MLB,OF,Starter,25,`);
      const result = await client.findPlayer({ name: "doe" });
      expect(result).toHaveLength(1);
      expect(result[0].ID).toBe(1);
    });

    it("filters by first name (case-insensitive)", async () => {
      mockCsvResponse(`${header}\n1,John,Doe,7,851,MLB,SP,Starter,28,\n2,Jane,Smith,7,851,MLB,OF,Starter,25,`);
      const result = await client.findPlayer({ name: "jane" });
      expect(result).toHaveLength(1);
      expect(result[0].ID).toBe(2);
    });

    it("filters by partial full name", async () => {
      mockCsvResponse(`${header}\n1,John,Doe,7,851,MLB,SP,Starter,28,\n2,Jane,Smith,7,851,MLB,OF,Starter,25,`);
      const result = await client.findPlayer({ name: "john doe" });
      expect(result).toHaveLength(1);
      expect(result[0].ID).toBe(1);
    });

    it("returns empty array when no match", async () => {
      mockCsvResponse(`${header}\n1,John,Doe,7,851,MLB,SP,Starter,28,`);
      const result = await client.findPlayer({ name: "xyz" });
      expect(result).toHaveLength(0);
    });

    it("returns multiple matches for partial name", async () => {
      mockCsvResponse(`${header}\n1,John,Doe,7,851,MLB,SP,Starter,28,\n2,Johnny,Doeby,7,851,MLB,OF,Starter,25,\n3,Bob,Smith,5,5,MLB,RP,Reliever,30,`);
      const result = await client.findPlayer({ name: "john" });
      expect(result).toHaveLength(2);
    });
  });

  describe("getGameHistory", () => {
    const header = "game_id,league_id,home_team,away_team,attendance,date,time,game_type,played,dh,innings,runs0,runs1,hits0,hits1,errors0,errors1,winning_pitcher,losing_pitcher,save_pitcher,starter0,starter1,cup";

    it("calls the /gamehistory/ endpoint", async () => {
      mockCsvResponse(`${header}\n`);
      await client.getGameHistory();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/gamehistory/");
    });

    it("parses CSV into GameHistoryEntry objects with correct types", async () => {
      mockCsvResponse(`${header}\n2013000001,100,2,6,0,2013-04-01,1905,0,1,0,9,4,7,9,13,0,0,,,,,, 0`);
      const result = await client.getGameHistory();
      expect(result).toHaveLength(1);
      expect(result[0].game_id).toBe(2013000001);
      expect(result[0].home_team).toBe(2);
      expect(result[0].away_team).toBe(6);
      expect(result[0].date).toBe("2013-04-01");
      expect(result[0].runs0).toBe(4);
      expect(result[0].runs1).toBe(7);
    });

    it("parses pitcher fields as numbers when populated", async () => {
      mockCsvResponse(`${header}\n2013000002,100,1,3,0,2013-04-01,1905,0,1,0,9,5,3,10,7,1,0,42,88,0,42,99,0`);
      const result = await client.getGameHistory();
      expect(result[0].winning_pitcher).toBe(42);
      expect(result[0].losing_pitcher).toBe(88);
      expect(result[0].starter0).toBe(42);
      expect(result[0].starter1).toBe(99);
    });
  });

  describe("getContracts", () => {
    const header = "player_id,team_id,league_id,is_major,no_trade,last_year_team_option,last_year_player_option,last_year_vesting_option,next_last_year_team_option,next_last_year_player_option,next_last_year_vesting_option,contract_team_id,contract_league_id,season_year,salary0,salary1,salary2,salary3,salary4,salary5,salary6,salary7,salary8,salary9,salary10,salary11,salary12,salary13,salary14,years,current_year,minimum_pa,minimum_pa_bonus,minimum_ip,minimum_ip_bonus,mvp_bonus,cyyoung_bonus,allstar_bonus,next_last_year_option_buyout,last_year_option_buyout";
    const row1 = "65,7,100,1,0,0,0,0,0,0,0,851,100,2058,5000000,5500000,6000000,0,0,0,0,0,0,0,0,0,0,0,0,3,1,0,0,0,0,0,0,0,0,0";
    const row2 = "99,5,100,1,0,0,0,0,0,0,0,5,100,2058,3000000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0";

    it("calls the /contract/ endpoint", async () => {
      mockCsvResponse(`${header}\n`);
      await client.getContracts();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/contract/");
    });

    it("parses CSV into Contract objects", async () => {
      mockCsvResponse(`${header}\n${row1}`);
      const result = await client.getContracts();
      expect(result).toHaveLength(1);
      expect(result[0].player_id).toBe(65);
      expect(result[0].team_id).toBe(7);
      expect(result[0].salary0).toBe(5000000);
      expect(result[0].years).toBe(3);
    });

    it("filters by team_id (contract_team_id)", async () => {
      mockCsvResponse(`${header}\n${row1}\n${row2}`);
      const result = await client.getContracts({ team_id: 851 });
      expect(result).toHaveLength(1);
      expect(result[0].player_id).toBe(65);
    });

    it("filters by player_id", async () => {
      mockCsvResponse(`${header}\n${row1}\n${row2}`);
      const result = await client.getContracts({ player_id: 99 });
      expect(result).toHaveLength(1);
      expect(result[0].player_id).toBe(99);
    });

    it("returns all contracts when no params provided", async () => {
      mockCsvResponse(`${header}\n${row1}\n${row2}`);
      const result = await client.getContracts();
      expect(result).toHaveLength(2);
    });
  });

  describe("getContractExtensions", () => {
    it("calls the /contractextension/ endpoint", async () => {
      mockCsvResponse("player_id,team_id\n");
      await client.getContractExtensions();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("/api/contractextension/");
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
