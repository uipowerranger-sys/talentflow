import { useQuery } from '@tanstack/react-query';
import { api, toJob, type ApiJob } from '../../lib/api';

export function useJobs() {
  return useQuery({ queryKey: ['jobs'], queryFn: async () => {
    const response = await api<{ jobs: ApiJob[] }>('/jobs/recommended');
    return response.jobs.map(toJob);
  } });
}
