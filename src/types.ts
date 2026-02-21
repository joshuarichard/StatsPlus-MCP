export interface StatsPlusConfig {
  leagueUrl: string;
  cookie?: string;
}

export type SplitId = 1 | 2 | 3;

// ---- Player Batting Stats ----

export interface PlayerBatStatsParams {
  year?: number;
  pid?: number;
  split?: SplitId;
}

export interface PlayerBatStatLine {
  split_id: SplitId;
  pid: number;
  year: number;
  team_id: number;
  g: number;
  pa: number;
  ab: number;
  r: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  sb: number;
  cs: number;
  bb: number;
  so: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  [key: string]: unknown;
}

// ---- Player Pitching Stats ----

export interface PlayerPitchStatsParams {
  year?: number;
  pid?: number;
  split?: SplitId;
}

export interface PlayerPitchStatLine {
  split_id: SplitId;
  pid: number;
  year: number;
  team_id: number;
  g: number;
  gs: number;
  w: number;
  l: number;
  sv: number;
  ip: number;
  h: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  era: number;
  whip: number;
  [key: string]: unknown;
}

// ---- Teams ----

export interface Team {
  team_id: number;
  name: string;
  abbr: string;
  [key: string]: unknown;
}

// ---- Draft ----

export interface DraftParams {
  lid?: number;
}

export interface DraftPick {
  round: number;
  pick: number;
  pid: number;
  team_id: number;
  year: number;
  [key: string]: unknown;
}

// ---- Exports ----

export interface ExportsResponse {
  csv: string;
}
