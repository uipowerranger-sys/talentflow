const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';

type ApiError = { detail?: string };

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('talentflow-token');
  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiError;
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type ApiJob = {
  job_id: number; title: string; category: string;
  experience: string; employment_type: string; posted_at: string; required_skills: string[];
  description: string; match_score: number | null; can_apply: boolean; matched_skills: string[];
  missing_skills: string[]; skill_match: number | null; experience_match: number | null;
  technology_match: number | null;
};

export type Job = {
  job_id: number; title: string; experience: string;
  employment_type: string; posted_date: string; category: string; skills: string[];
  match_score: number | null; matched_skills: string[]; missing_skills: string[];
  skill_match: number | null; experience_match: number | null; technology_match: number | null; description: string;
};

export function toJob(job: ApiJob): Job {
  return { ...job, posted_date: job.posted_at, skills: job.required_skills,
    match_score: job.match_score, skill_match: job.skill_match,
    experience_match: job.experience_match, technology_match: job.technology_match };
}
