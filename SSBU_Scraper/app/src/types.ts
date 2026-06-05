export interface MatchupEntry {
  opponent: string;
  score: number;
  votes: number;
}

export interface Character {
  rank: number;
  name: string;
  tier: string;
  image?: string;
  tier_score: number;
  matchup_avg: number | null;
  favorable: number | null;
  unfavorable: number | null;
  even: number | null;
  matchup_error: string;
  matchups: MatchupEntry[];
}

export interface CharacterStats {
  avg: number;
  stdDev: number;
  median: number;
  best: MatchupEntry;
  worst: MatchupEntry;
  count: number;
}

export type Category =
  | 'strong-adv'
  | 'decent-adv'
  | 'small-adv'
  | 'even'
  | 'small-dis'
  | 'decent-dis'
  | 'strong-dis';
