export interface StatsPlusConfig {
  leagueUrl: string;
  cookie?: string;
}

export type SplitId = 1 | 2 | 3;

// ---- Player Batting Stats ----
// Columns: id,player_id,year,team_id,game_id,league_id,level_id,split_id,position,
//          ab,h,k,pa,pitches_seen,g,gs,d,t,hr,r,rbi,sb,cs,bb,ibb,gdp,sh,sf,hp,ci,
//          wpa,stint,ubr,war

export interface PlayerBatStatsParams {
  year?: number;
  pid?: number;
  split?: SplitId;
}

export interface PlayerBatStatLine {
  id: number;
  player_id: number;
  year: number;
  team_id: number;
  game_id: number;
  league_id: number;
  level_id: number;
  split_id: number;
  position: number;
  ab: number;
  h: number;
  k: number;
  pa: number;
  pitches_seen: number;
  g: number;
  gs: number;
  d: number;
  t: number;
  hr: number;
  r: number;
  rbi: number;
  sb: number;
  cs: number;
  bb: number;
  ibb: number;
  gdp: number;
  sh: number;
  sf: number;
  hp: number;
  ci: number;
  wpa: number;
  stint: number;
  ubr: number;
  war: number;
}

// ---- Player Pitching Stats ----
// Columns: id,player_id,year,team_id,game_id,league_id,level_id,split_id,ip,ab,tb,ha,k,
//          bf,rs,bb,r,er,gb,fb,pi,ipf,g,gs,w,l,s,sa,da,sh,sf,ta,hra,bk,ci,iw,wp,hp,gf,
//          dp,qs,svo,bs,ra,cg,sho,sb,cs,hld,ir,irs,wpa,li,stint,outs,sd,md,war,ra9war

export interface PlayerPitchStatsParams {
  year?: number;
  pid?: number;
  split?: SplitId;
}

export interface PlayerPitchStatLine {
  id: number;
  player_id: number;
  year: number;
  team_id: number;
  game_id: number;
  league_id: number;
  level_id: number;
  split_id: number;
  ip: number;
  ab: number;
  tb: number;
  ha: number;
  k: number;
  bf: number;
  rs: number;
  bb: number;
  r: number;
  er: number;
  gb: number;
  fb: number;
  pi: number;
  ipf: number;
  g: number;
  gs: number;
  w: number;
  l: number;
  s: number;
  sa: number;
  da: number;
  sh: number;
  sf: number;
  ta: number;
  hra: number;
  bk: number;
  ci: number;
  iw: number;
  wp: number;
  hp: number;
  gf: number;
  dp: number;
  qs: number;
  svo: number;
  bs: number;
  ra: number;
  cg: number;
  sho: number;
  sb: number;
  cs: number;
  hld: number;
  ir: number;
  irs: number;
  wpa: number;
  li: number;
  stint: number;
  outs: number;
  sd: number;
  md: number;
  war: number;
  ra9war: number;
}

// ---- Teams ----
// Columns: ID,Name,Nickname,Parent Team ID

export interface Team {
  ID: number;
  Name: string;
  Nickname: string;
  "Parent Team ID": number;
}

// ---- Draft ----
// Columns: ID,Round,Pick In Round,Supp,Overall,Player Name,Team,Team ID,Position,Age,College,Auto Pick,Time (UTC)

export interface DraftParams {
  lid?: number;
}

export interface DraftPick {
  ID: number;
  Round: number;
  "Pick In Round": number;
  Supp: string;
  Overall: number;
  "Player Name": string;
  Team: string;
  "Team ID": number;
  Position: string;
  Age: number;
  College: string;
  "Auto Pick": string;
  "Time (UTC)": string;
}

// ---- Players ----
// Columns: ID,"First Name","Last Name","Team ID","Parent Team ID",Level,Pos,Role,Age,Retired

export interface GetPlayersParams {
  team_id?: number;
}

export interface Player {
  ID: number;
  "First Name": string;
  "Last Name": string;
  "Team ID": number;
  "Parent Team ID": number;
  Level: string;
  Pos: string;
  Role: string;
  Age: number;
  Retired: string;
}

// ---- Exports ----
// JSON object keyed by date (YYYY-MM-DD) → array of team IDs for games on that date.
// Also includes a "current_date" key with today's simulated date.

export interface ExportsResponse {
  current_date: string;
  [date: string]: number[] | string;
}
