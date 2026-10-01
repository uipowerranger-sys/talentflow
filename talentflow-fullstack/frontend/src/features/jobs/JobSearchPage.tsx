import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useJobs } from './useJobs';
import type { Job } from '../../types';
import type { AppDispatch, RootState } from '../../store';
import { signOut } from '../../store';
import { AppHeader } from '../../components/AppHeader';
import { JobCard } from '../../components/JobCard';
import { MatchDetails } from '../../components/MatchDetails';
import { ResumeUpload } from '../resume/ResumeUpload';
import { SkillsSection } from '../profile/SkillsSection';
import { api, toJob, type ApiJob } from '../../lib/api';

type View = 'jobs' | 'saved';
type ResumeProfile = { resume: { status: string } | null };
type ResumeStatus = { status: string; error_message?: string | null };

export function JobSearchPage() {
  const dispatch = useDispatch<AppDispatch>(); const navigate = useNavigate();
  const queryClient = useQueryClient();
  const name = useSelector((state: RootState) => state.auth.name);
  const { data: jobs = [] } = useJobs();
  const { data: savedJobs = [] } = useQuery({ queryKey: ['saved-jobs'], queryFn: async () => (await api<{ jobs: ApiJob[] }>('/jobs/saved')).jobs.map(toJob) });
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: () => api<ResumeProfile>('/candidates/me') });
  const { data: profileSkills = [] } = useQuery({ queryKey: ['profile-skills'], queryFn: () => api<{ id: number; name: string }[]>('/candidates/me/skills') });
  const [view, setView] = useState<View>('jobs');
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [resumeComplete, setResumeComplete] = useState(false);
  const [resumeNotice, setResumeNotice] = useState('');
  const [query, setQuery] = useState(''); const [technology, setTechnology] = useState(''); const [category, setCategory] = useState(''); const [experience, setExperience] = useState('');
  const [activeJob, setActiveJob] = useState<Job | null>(null); const [toast, setToast] = useState('');

  const { data: resumeStatus } = useQuery({
    queryKey: ['resume-status', resumeId],
    queryFn: () => api<ResumeStatus>(`/resumes/status/${resumeId}`),
    enabled: resumeId !== null,
    refetchInterval: (result) => ['queued', 'processing'].includes(result.state.data?.status || '') ? 1200 : false,
  });

  useEffect(() => {
    if (resumeStatus?.status === 'completed') {
      setResumeComplete(true);
      setResumeNotice('Resume analyzed. Your profile matches have been recalculated.');
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      void queryClient.invalidateQueries({ queryKey: ['profile-skills'] });
      setResumeId(null);
    } else if (resumeStatus?.status === 'failed') {
      setResumeComplete(false);
      setResumeNotice(resumeStatus.error_message || 'Resume analysis failed. Try another PDF or DOCX file.');
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setResumeId(null);
    }
  }, [resumeStatus?.status, resumeStatus?.error_message, queryClient]);

  const technologies = useMemo(() => [...new Set(jobs.flatMap((job) => job.skills))].sort(), [jobs]);
  const categories = useMemo(() => [...new Set(jobs.map((job) => job.category))].sort(), [jobs]);
  const experienceOptions = useMemo(() => [...new Set(jobs.map((job) => job.experience))].sort(), [jobs]);
  const list = view === 'saved' ? savedJobs : jobs;
  const visibleJobs = useMemo(() => list.filter((job) => {
    const text = `${job.title} ${job.company} ${job.category} ${job.location} ${job.experience} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase()))
      && (!technology || job.skills.some((skill) => skill.toLowerCase() === technology.toLowerCase()))
      && (!category || job.category === category)
      && (!experience || job.experience === experience);
  }), [list, query, technology, category, experience]);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(''), 2800); }
  function logout() { dispatch(signOut()); navigate('/login', { replace: true }); }
  async function addSkills(next: string[]) {
    try {
      await api('/candidates/me/skills', { method: 'POST', body: JSON.stringify({ skills: next }) });
      await queryClient.invalidateQueries({ queryKey: ['profile-skills'] });
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      notify('Skills updated. Your matches have been refreshed.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not update skills.'); }
  }
  async function removeSkill(skill: string) {
    const record = profileSkills.find((item) => item.name === skill); if (!record) return;
    try {
      await api(`/candidates/me/skills/${record.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['profile-skills'] });
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      notify(`${skill} removed from your skills.`);
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not remove skill.'); }
  }
  async function updateSkill(skill: string, nextName: string) {
    const record = profileSkills.find((item) => item.name === skill); if (!record) return;
    try {
      await api(`/candidates/me/skills/${record.id}`, { method: 'PUT', body: JSON.stringify({ name: nextName }) });
      await queryClient.invalidateQueries({ queryKey: ['profile-skills'] });
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      notify('Skill updated and matches refreshed.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not update skill.'); }
  }
  async function toggleSaved(job: Job, currentlySaved: boolean) {
    const previous = queryClient.getQueryData<Job[]>(['saved-jobs']) || [];
    queryClient.setQueryData<Job[]>(['saved-jobs'], currentlySaved ? previous.filter((item) => item.job_id !== job.job_id) : [job, ...previous]);
    try {
      await api(`/jobs/${job.job_id}/saved`, { method: currentlySaved ? 'DELETE' : 'PUT' });
      await queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
      notify(currentlySaved ? 'Job removed from saved jobs.' : 'Job saved.');
    } catch (error) {
      queryClient.setQueryData(['saved-jobs'], previous);
      notify(error instanceof Error ? error.message : 'Could not update saved jobs.');
    }
  }
  async function apply(jobId: number) {
    try { const result = await api<{ message: string }>(`/jobs/${jobId}/apply`, { method: 'POST' }); notify(result.message); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not apply.'); }
  }

  const resumeState = resumeId !== null ? (resumeStatus?.status || 'queued') : resumeComplete ? 'completed' : profile?.resume?.status || '';
  const savedIds = new Set(savedJobs.map((job) => job.job_id));
  return <div className="app-page"><AppHeader name={name} activeView={view} onNavigate={setView} onSignOut={logout} /><main className="page-shell">
    <section className="page-intro"><div><div className="eyebrow light-eyebrow">Your next chapter starts here</div><h1>{view === 'saved' ? <>Your <span>saved jobs.</span></> : <>Find your next <span>opportunity.</span></>}</h1><p>{view === 'saved' ? 'The roles you bookmarked are kept here for you.' : 'Browse the latest roles, find your fit, and save the ones you like.'}</p></div><div className="live-note"><i /> Latest opportunities</div></section>
    <div className="workspace-grid"><aside className="side-panel"><div className="side-kicker">Opportunities</div><button className={`side-link ${view === 'jobs' ? 'active' : ''}`} onClick={() => setView('jobs')}>⌕ <span>All jobs</span></button><button className={`side-link ${view === 'saved' ? 'active' : ''}`} onClick={() => setView('saved')}>♡ <span>Saved jobs</span><b>{savedJobs.length}</b></button></aside>
      <section className="jobs-column" id="jobs">
        {!resumeState || resumeState === 'failed' ? <><ResumeUpload onUploaded={(id) => { setResumeComplete(false); setResumeId(id); setResumeNotice('Resume uploaded. Analysis is running…'); void queryClient.invalidateQueries({ queryKey: ['profile'] }); }} />{resumeNotice && <p className="resume-status-note" role="status">{resumeNotice}</p>}</> : resumeState === 'completed' ? <div className="resume-complete"><span>✓</span><div><strong>Your resume has been analyzed</strong><small>{resumeNotice || 'Your job match percentages use your resume and skills.'}</small></div></div> : <div className="resume-complete"><span>…</span><div><strong>Analyzing your resume</strong><small>{resumeNotice || 'Your job match percentages will refresh when analysis is complete.'}</small></div></div>}
        <div className="filters-card"><label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs, skills, categories or locations" aria-label="Search jobs, skills, categories or locations" /></label><div className="filter-row"><select aria-label="Technology" value={technology} onChange={(event) => setTechnology(event.target.value)}><option value="">All technologies</option>{technologies.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Job category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Experience" value={experience} onChange={(event) => setExperience(event.target.value)}><option value="">Any experience</option>{experienceOptions.map((item) => <option key={item}>{item}</option>)}</select><button className="button secondary" onClick={() => { setQuery(''); setTechnology(''); setCategory(''); setExperience(''); }}>Clear filters</button></div></div>
        <div className="results-heading"><div><h2>{view === 'saved' ? 'Saved opportunities' : 'Latest opportunities'} <span>({visibleJobs.length})</span></h2><p>{view === 'saved' ? 'Your bookmarked roles.' : 'Newly posted roles, with profile matches when your skills are available.'}</p></div><span className="sort-label">Newest first</span></div>
        <div className="job-list">{visibleJobs.length ? visibleJobs.map((job) => <JobCard key={job.job_id} job={job} saved={savedIds.has(job.job_id)} onSave={() => toggleSaved(job, savedIds.has(job.job_id))} onDetails={() => setActiveJob(job)} onApply={() => apply(job.job_id)} />) : <div className="empty-state"><strong>{view === 'saved' && !savedJobs.length ? 'No saved jobs yet' : 'No matching opportunities found'}</strong><p>{view === 'saved' && !savedJobs.length ? 'Select the heart on any job to save it here.' : 'Try changing your search or filters.'}</p><button className="button secondary" onClick={() => { setView('jobs'); setQuery(''); setTechnology(''); setCategory(''); setExperience(''); }}>Browse all jobs</button></div>}</div>
      </section><SkillsSection skills={profileSkills.map((skill) => skill.name)} onRemove={removeSkill} onAdd={addSkills} onUpdate={updateSkill} />
    </div></main>{activeJob && <MatchDetails job={activeJob} onClose={() => setActiveJob(null)} onApply={() => { setActiveJob(null); apply(activeJob.job_id); }} />}{toast && <div role="status" className="toast">✓&nbsp; {toast}</div>}</div>;
}
