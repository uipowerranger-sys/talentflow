import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useJobs } from './useJobs';
import type { Job } from '../../types';
import type { AppDispatch, RootState } from '../../store';
import { signOut } from '../../store';
import { AppHeader } from '../../components/AppHeader';
import { JobCard } from '../../components/JobCard';
import { MatchDetails } from '../../components/MatchDetails';
import { ResumeUpload } from '../resume/ResumeUpload';
import { SkillsSection } from '../profile/SkillsSection';
import { api } from '../../lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const categories = ['Software Development', 'UI Development', 'Backend Development', 'Full Stack Development', 'Data Engineering', 'DevOps'];
const locations = ['Bengaluru', 'Dubai', 'Hyderabad', 'Remote', 'Abu Dhabi'];
const experiences = ['2-4 years', '3-5 years', '4-6 years', '5-7 years', '5-8 years', '6-8 years'];

export function JobSearchPage() {
  const dispatch = useDispatch<AppDispatch>(); const navigate = useNavigate();
  const name = useSelector((state: RootState) => state.auth.name);
  const { data: jobs = [] } = useJobs();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: () => api<{ resume: { status: string } | null }>('/candidates/me') });
  const { data: profileSkills } = useQuery({ queryKey: ['profile-skills'], queryFn: () => api<{ id: number; name: string }[]>('/candidates/me/skills') });
  const [query, setQuery] = useState(''); const [technology, setTechnology] = useState(''); const [category, setCategory] = useState(''); const [location, setLocation] = useState(''); const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState(['React', 'TypeScript', 'JavaScript', 'Node.js', 'Redux', 'HTML5', 'CSS3']);
  const [activeJob, setActiveJob] = useState<Job | null>(null); const [toast, setToast] = useState('');
  const [uploadComplete, setUploadComplete] = useState(false); const [saved, setSaved] = useState<number[]>([]);
  const uploaded = uploadComplete || Boolean(profile?.resume);
  useEffect(() => { if (profileSkills) setSkills(profileSkills.map((skill) => skill.name)); }, [profileSkills]);
  const visibleJobs = useMemo(() => jobs.filter((job) => {
    const text = `${job.title} ${job.company} ${job.category} ${job.location} ${job.skills.join(' ')}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (!technology || job.skills.includes(technology)) && (!category || job.category === category) && (!location || job.location === location) && (!experience || job.experience === experience);
  }), [jobs, query, technology, category, location, experience]);
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(''), 2800); }
  function logout() { dispatch(signOut()); navigate('/login', { replace: true }); }
  async function addSkills(next: string[]) { try { await api('/candidates/me/skills', { method: 'POST', body: JSON.stringify({ skills: next }) }); await queryClient.invalidateQueries(); notify('Skills updated. Your matches have been refreshed.'); } catch (error) { notify(error instanceof Error ? error.message : 'Could not update skills.'); } }
  async function removeSkill(skill: string) { const record = profileSkills?.find((item) => item.name === skill); if (!record) return; try { await api(`/candidates/me/skills/${record.id}`, { method: 'DELETE' }); await queryClient.invalidateQueries(); } catch (error) { notify(error instanceof Error ? error.message : 'Could not remove skill.'); } }
  async function apply(jobId: number) { try { const result = await api<{ message: string }>(`/jobs/${jobId}/apply`, { method: 'POST' }); notify(result.message); } catch (error) { notify(error instanceof Error ? error.message : 'Could not apply.'); } }
  return <div className="app-page"><AppHeader name={name} onSignOut={logout} /><main className="page-shell">
    <section className="page-intro"><div><div className="eyebrow light-eyebrow">Your next chapter starts here</div><h1>Find your next <span>opportunity.</span></h1><p>Discover roles shaped around your skills, experience and career goals.</p></div><div className="live-note"><i /> 248 new opportunities this week</div></section>
    <div className="workspace-grid"><aside className="side-panel"><div className="side-kicker">Your workspace</div><a className="side-link active" href="#jobs">⌕ <span>Find opportunities</span></a><a className="side-link" href="#jobs">♡ <span>Saved jobs</span><b>{saved.length}</b></a><a className="side-link" href="#profile">▤ <span>My profile</span></a><div className="side-promo"><small>YOUR NEXT CHAPTER</small><h3>Good work starts with the right fit.</h3><p>Build a clearer picture of what you bring.</p><a href="#profile">Update profile&nbsp; ↗</a></div></aside>
    <section className="jobs-column" id="jobs">{!uploaded ? <ResumeUpload onUploaded={() => { setUploadComplete(true); notify('Resume uploaded. Profile analysis is ready.'); }} /> : <div className="resume-complete"><span>✓</span><div><strong>Your resume has been added</strong><small>Your profile is ready for more relevant opportunities.</small></div></div>}
        <div className="filters-card"><label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs, skills or companies" aria-label="Search jobs, skills or companies" /></label><div className="filter-row"><select aria-label="Technology" value={technology} onChange={(event) => setTechnology(event.target.value)}><option value="">Technology</option>{['React', 'Angular', 'Java', 'Python', 'Node.js', '.NET', 'Azure', 'AWS'].map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Job category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Job category</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Location" value={location} onChange={(event) => setLocation(event.target.value)}><option value="">Any location</option>{locations.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Experience" value={experience} onChange={(event) => setExperience(event.target.value)}><option value="">Experience</option>{experiences.map((item) => <option key={item}>{item}</option>)}</select></div></div>
        <div className="results-heading"><div><h2>{skills.length > 7 ? 'Jobs matched to your profile' : 'Latest opportunities'} <span>({visibleJobs.length})</span></h2><p>Thoughtfully selected roles from teams building what’s next.</p></div><span className="sort-label">Most relevant</span></div>
        <div className="job-list">{visibleJobs.length ? visibleJobs.map((job) => <JobCard key={job.job_id} job={job} saved={saved.includes(job.job_id)} onSave={() => setSaved((current) => current.includes(job.job_id) ? current.filter((id) => id !== job.job_id) : [...current, job.job_id])} onDetails={() => setActiveJob(job)} onApply={() => apply(job.job_id)} />) : <div className="empty-state"><strong>No matching opportunities found</strong><p>Try removing a filter or broadening your search.</p><button className="button secondary" onClick={() => { setQuery(''); setTechnology(''); setCategory(''); setLocation(''); setExperience(''); }}>Clear filters</button></div>}</div>
      </section><SkillsSection skills={skills} onRemove={removeSkill} onAdd={addSkills} />
    </div></main>{activeJob && <MatchDetails job={activeJob} onClose={() => setActiveJob(null)} onApply={() => { setActiveJob(null); apply(activeJob.job_id); }} />}{toast && <div role="status" className="toast">✓&nbsp; {toast}</div>}</div>;
}
