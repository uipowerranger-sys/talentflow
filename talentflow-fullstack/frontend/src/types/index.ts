export type Job = {
  job_id: number; title: string; company: string; location: string; experience: string;
  employment_type: string; posted_date: string; category: string; skills: string[];
  match_score: number; matched_skills: string[]; missing_skills: string[];
  skill_match: number; experience_match: number; technology_match: number; description: string;
};
