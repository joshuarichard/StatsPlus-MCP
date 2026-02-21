import type {
  StatsPlusConfig,
  PlayerBatStatsParams,
  PlayerBatStatLine,
  PlayerPitchStatsParams,
  PlayerPitchStatLine,
  Team,
  DraftParams,
  DraftPick,
  GetPlayersParams,
  Player,
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

  async getPlayerPitchStats(params: PlayerPitchStatsParams = {}): Promise<PlayerPitchStatLine[]> {
    return this.getCsv<PlayerPitchStatLine>("/playerpitchstatsv2/", {
      year: params.year,
      pid: params.pid,
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
    return this.getCsv<Player>("/players/", {
      team_id: params.team_id,
    });
  }

  async getExports(): Promise<ExportsResponse> {
    return this.getJson<ExportsResponse>("/exports/");
  }
}

export { parseCsv, parseCsvRow };
