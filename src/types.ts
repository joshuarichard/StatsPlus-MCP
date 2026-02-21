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

// ---- Player Fielding Stats ----
// Columns: id,player_id,year,team_id,league_id,level_id,split_id,position,
//          tc,a,po,er,ip,g,gs,e,dp,tp,pb,sba,rto,ipf,plays,plays_base,roe,
//          opps_0,opps_made_0,opps_1,opps_made_1,opps_2,opps_made_2,
//          opps_3,opps_made_3,opps_4,opps_made_4,opps_5,opps_made_5,
//          framing,arm,zr

export interface PlayerFieldStatsParams {
  year?: number;
  pid?: number;
  split?: SplitId;
}

export interface PlayerFieldStatLine {
  id: number;
  player_id: number;
  year: number;
  team_id: number;
  league_id: number;
  level_id: number;
  split_id: number;
  position: number;
  tc: number;
  a: number;
  po: number;
  er: number;
  ip: number;
  g: number;
  gs: number;
  e: number;
  dp: number;
  tp: number;
  pb: number;
  sba: number;
  rto: number;
  ipf: number;
  plays: number;
  plays_base: number;
  roe: number;
  opps_0: number;
  opps_made_0: number;
  opps_1: number;
  opps_made_1: number;
  opps_2: number;
  opps_made_2: number;
  opps_3: number;
  opps_made_3: number;
  opps_4: number;
  opps_made_4: number;
  opps_5: number;
  opps_made_5: number;
  framing: number;
  arm: number;
  zr: number;
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

// ---- Game History ----
// Columns: game_id,league_id,home_team,away_team,attendance,date,time,game_type,
//          played,dh,innings,runs0,runs1,hits0,hits1,errors0,errors1,
//          winning_pitcher,losing_pitcher,save_pitcher,starter0,starter1,cup
// pitcher/starter fields are empty string when not applicable, numeric player_id otherwise.

export interface GameHistoryEntry {
  game_id: number;
  league_id: number;
  home_team: number;
  away_team: number;
  attendance: number;
  date: string;
  time: number;
  game_type: number;
  played: number;
  dh: number;
  innings: number;
  runs0: number;
  runs1: number;
  hits0: number;
  hits1: number;
  errors0: number;
  errors1: number;
  winning_pitcher: number | string;
  losing_pitcher: number | string;
  save_pitcher: number | string;
  starter0: number | string;
  starter1: number | string;
  cup: number;
}

// ---- Contracts ----
// Columns: player_id,team_id,league_id,is_major,no_trade,
//          last_year_team_option,last_year_player_option,last_year_vesting_option,
//          next_last_year_team_option,next_last_year_player_option,next_last_year_vesting_option,
//          contract_team_id,contract_league_id,season_year,
//          salary0..salary14,years,current_year,
//          minimum_pa,minimum_pa_bonus,minimum_ip,minimum_ip_bonus,
//          mvp_bonus,cyyoung_bonus,allstar_bonus,
//          next_last_year_option_buyout,last_year_option_buyout
// Used by both /contract and /contractextension endpoints.

export interface Contract {
  player_id: number;
  team_id: number;
  league_id: number;
  is_major: number;
  no_trade: number;
  last_year_team_option: number;
  last_year_player_option: number;
  last_year_vesting_option: number;
  next_last_year_team_option: number;
  next_last_year_player_option: number;
  next_last_year_vesting_option: number;
  contract_team_id: number;
  contract_league_id: number;
  season_year: number;
  salary0: number;
  salary1: number;
  salary2: number;
  salary3: number;
  salary4: number;
  salary5: number;
  salary6: number;
  salary7: number;
  salary8: number;
  salary9: number;
  salary10: number;
  salary11: number;
  salary12: number;
  salary13: number;
  salary14: number;
  years: number;
  current_year: number;
  minimum_pa: number;
  minimum_pa_bonus: number;
  minimum_ip: number;
  minimum_ip_bonus: number;
  mvp_bonus: number;
  cyyoung_bonus: number;
  allstar_bonus: number;
  next_last_year_option_buyout: number;
  last_year_option_buyout: number;
}

// ---- Exports ----
// JSON object keyed by date (YYYY-MM-DD) → array of team IDs for games on that date.
// Also includes a "current_date" key with today's simulated date.

export interface ExportsResponse {
  current_date: string;
  [date: string]: number[] | string;
}
