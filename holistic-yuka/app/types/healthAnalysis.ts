export interface RedFlag {
  category: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  explanation: string;
}

export interface SubScores {
  nutrition: number;
  additives: number;
  oils: number;
  toxins: number;
  allergens: number;
}

export interface HealthAnalysis {
  overall_score: number;
  sub_scores: SubScores;
  red_flags: RedFlag[];
  recommendation: string;
  explanation: string;
}