import type {
  StatsPlusConfig,
  PlayerBatStatsParams,
  PlayerBatStatLine,
  PlayerPitchStatsParams,
  PlayerPitchStatLine,
  Team,
  DraftParams,
  DraftPick,
} from "./types.js";

export class StatsPlusClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: StatsPlusConfig) {
    // Normalize: strip trailing slash
    this.baseUrl = `https://statsplus.net/${config.leagueUrl.replace(/^\/|\/$/g, "")}/api`;
    this.headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (config.cookie) {
      this.headers["Cookie"] = config.cookie;
    }
  }

  private async get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
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

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return response.json() as Promise<T>;
    }
    // Fallback: return raw text wrapped as unknown
    const text = await response.text();
    return text as unknown as T;
  }

  async getPlayerBatStats(params: PlayerBatStatsParams = {}): Promise<PlayerBatStatLine[]> {
    return this.get<PlayerBatStatLine[]>("/playerbatstatsv2/", {
      year: params.year,
      pid: params.pid,
      split: params.split,
    });
  }

  async getPlayerPitchStats(params: PlayerPitchStatsParams = {}): Promise<PlayerPitchStatLine[]> {
    return this.get<PlayerPitchStatLine[]>("/playerpitchstatsv2/", {
      year: params.year,
      pid: params.pid,
      split: params.split,
    });
  }

  async getTeams(): Promise<Team[]> {
    return this.get<Team[]>("/teams/");
  }

  async getDraft(params: DraftParams = {}): Promise<DraftPick[]> {
    return this.get<DraftPick[]>("/draftv2/", {
      lid: params.lid,
    });
  }

  async getExports(): Promise<string> {
    return this.get<string>("/exports/");
  }
}
