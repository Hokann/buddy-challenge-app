// types/healthAnalysis.ts
export interface RedFlag {
  category: string;
  issue: string;
  explanation: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SubScores {
  nutrition: number;
  processing: number;
  additives: number;
  [key: string]: number;
}

export interface HealthAnalysis {
  overall_score: number;
  sub_scores: SubScores;
  red_flags: RedFlag[];
  recommendation: string;
  explanation: string;
}