import type {
  StatsPlusConfig,
  PlayerBatStatsParams,
  PlayerBatStatLine,
  PlayerPitchStatsParams,
  PlayerPitchStatLine,
  PlayerFieldStatsParams,
  PlayerFieldStatLine,
  TeamBatStatsParams,
  TeamBatStatLine,
  TeamPitchStatsParams,
  TeamPitchStatLine,
  Team,
  DraftParams,
  DraftPick,
  GetPlayersParams,
  FindPlayerParams,
  Player,
  PlayerRating,
  GetRatingsParams,
  StartRatingsJobResult,
  GameHistoryEntry,
  Contract,
  GetContractsParams,
  ExportsResponse,
} from "./types.js";

// Parses a CSV string (with headers) into an array of objects.
// Numeric-looking values are coerced to numbers automatically.
function parseCsv(text: string): Record<string, string | number>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]);
  const rows: Record<string, string | number>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvRow(line);
    const row: Record<string, string | number> = {};
    for (let j = 0; j < headers.length; j++) {
      const raw = values[j] ?? "";
      const num = Number(raw);
      row[headers[j]] = raw !== "" && !isNaN(num) ? num : raw;
    }
    rows.push(row);
  }

  return rows;
}

// Parses a single CSV row, handling double-quoted fields.
function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      let field = "";
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field);
      if (line[i] === ",") i++;
    } else {
      // Unquoted field
      const end = line.indexOf(",", i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

export class StatsPlusClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: StatsPlusConfig) {
    this.baseUrl = `https://statsplus.net/${config.leagueUrl.replace(/^\/|\/$/g, "")}/api`;
    this.headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (config.cookie) {
      this.headers["Cookie"] = config.cookie;
    }
  }

  private async fetch(path: string, params: Record<string, string | number | undefined> = {}): Promise<Response> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`StatsPlus API error: ${response.status} ${response.statusText} for ${url}`);
    }

    return response;
  }

  private async getJson<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const response = await this.fetch(path, params);
    return response.json() as Promise<T>;
  }

  private async getCsv<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T[]> {
    const response = await this.fetch(path, params);
    const text = await response.text();
    return parseCsv(text) as T[];
  }

  async getPlayerBatStats(params: PlayerBatStatsParams = {}): Promise<PlayerBatStatLine[]> {
    return this.getCsv<PlayerBatStatLine>("/playerbatstatsv2/", {
      year: params.year,
      pid: params.pid,
      split: params.split,
    });
  }

  async getPlayerFieldStats(params: PlayerFieldStatsParams = {}): Promise<PlayerFieldStatLine[]> {
    return this.getCsv<PlayerFieldStatLine>("/playerfieldstatsv2/", {
      year: params.year,
      pid: params.pid,
      split: params.split,
    });
  }

  async getPlayerPitchStats(params: PlayerPitchStatsParams = {}): Promise<PlayerPitchStatLine[]> {
    return this.getCsv<PlayerPitchStatLine>("/playerpitchstatsv2/", {
      year: params.year,
      pid: params.pid,
      split: params.split,
    });
  }

  async getTeamBatStats(params: TeamBatStatsParams = {}): Promise<TeamBatStatLine[]> {
    return this.getCsv<TeamBatStatLine>("/teambatstats/", {
      year: params.year,
      split: params.split,
    });
  }

  async getTeamPitchStats(params: TeamPitchStatsParams = {}): Promise<TeamPitchStatLine[]> {
    return this.getCsv<TeamPitchStatLine>("/teampitchstats/", {
      year: params.year,
      split: params.split,
    });
  }

  async getTeams(): Promise<Team[]> {
    return this.getCsv<Team>("/teams/");
  }

  async getDraft(params: DraftParams = {}): Promise<DraftPick[]> {
    return this.getCsv<DraftPick>("/draftv2/", {
      lid: params.lid,
    });
  }

  async getPlayers(params: GetPlayersParams = {}): Promise<Player[]> {
    const players = await this.getCsv<Player>("/players/", {
      team_id: params.team_id,
    });
    if (params.org_id !== undefined) {
      return players.filter(
        (p) => p["Parent Team ID"] === params.org_id || p["Team ID"] === params.org_id
      );
    }
    return players;
  }

  async findPlayer(params: FindPlayerParams): Promise<Player[]> {
    const players = await this.getCsv<Player>("/players/", {});
    const query = params.name.toLowerCase();
    return players.filter((p) => {
      const first = String(p["First Name"]).toLowerCase();
      const last = String(p["Last Name"]).toLowerCase();
      return first.includes(query) || last.includes(query) || `${first} ${last}`.includes(query);
    });
  }

  // Kicks off the /ratings/ background job and returns the poll URL.
  // Extracted as a private helper to avoid duplication between startRatingsJob and getRatings.
  private async initiateRatingsJob(): Promise<string> {
    const initResponse = await this.fetch("/ratings/");
    const initText = await initResponse.text();
    const urlMatch = initText.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) {
      throw new Error(`Unexpected /ratings/ response: ${initText}`);
    }
    return urlMatch[0].replace(/[.)]+$/, ""); // strip trailing punctuation
  }

  // Fires the ratings export job and returns the poll URL immediately, without waiting.
  // Use this at the start of a workflow, then call get_ratings(poll_url) later once
  // the other data lookups are done — avoiding a 60–90s block mid-workflow.
  async startRatingsJob(): Promise<StartRatingsJobResult> {
    const pollUrl = await this.initiateRatingsJob();
    return { poll_url: pollUrl };
  }

  async getRatings(params: GetRatingsParams = {}): Promise<PlayerRating[]> {
    const POLL_INTERVAL_MS = 15_000;
    const MAX_ATTEMPTS = 20; // up to ~5 minutes of polling

    let pollUrl: string;

    if (params.poll_url) {
      // Job was already started via startRatingsJob — skip the fetch and initial delay
      pollUrl = params.poll_url;
    } else {
      // Start the job now, then wait the minimum recommended delay before first poll
      pollUrl = await this.initiateRatingsJob();
      await new Promise((resolve) => setTimeout(resolve, 30_000));
    }

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const pollResponse = await fetch(pollUrl, {
        method: "GET",
        headers: this.headers,
      });

      if (!pollResponse.ok) {
        throw new Error(`Ratings poll error: ${pollResponse.status} ${pollResponse.statusText}`);
      }

      const pollText = await pollResponse.text();

      // Still processing if response contains "still in progress" or "Request received"
      if (!pollText.includes("still in progress") && !pollText.startsWith("Request received")) {
        const ratings = parseCsv(pollText) as PlayerRating[];
        if (params.player_ids && params.player_ids.length > 0) {
          const idSet = new Set(params.player_ids);
          return ratings.filter((r) => idSet.has(r["ID"] as number));
        }
        return ratings;
      }

      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    }

    throw new Error("Ratings export timed out after ~5 minutes. Try again later.");
  }

  async getGameHistory(): Promise<GameHistoryEntry[]> {
    return this.getCsv<GameHistoryEntry>("/gamehistory/");
  }

  async getContracts(params: GetContractsParams = {}): Promise<Contract[]> {
    let result = await this.getCsv<Contract>("/contract/", {});
    if (params.team_id !== undefined) {
      result = result.filter((c) => c.contract_team_id === params.team_id);
    }
    if (params.player_id !== undefined) {
      result = result.filter((c) => c.player_id === params.player_id);
    }
    return result;
  }

  async getContractExtensions(): Promise<Contract[]> {
    return this.getCsv<Contract>("/contractextension/");
  }

  async getExports(): Promise<ExportsResponse> {
    return this.getJson<ExportsResponse>("/exports/");
  }
}

export { parseCsv, parseCsvRow };
