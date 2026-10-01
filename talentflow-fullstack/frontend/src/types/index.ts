export type Job = {
  job_id: number; title: string; experience: string;
  employment_type: string; posted_date: string; category: string; skills: string[];
  match_score: number | null; matched_skills: string[]; missing_skills: string[];
  skill_match: number | null; experience_match: number | null; technology_match: number | null; description: string;
};
