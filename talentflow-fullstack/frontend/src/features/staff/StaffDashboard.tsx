import { useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { signOut, type AppDispatch, type RootState } from '../../store';
import { HrCatalogManager } from './HrCatalogManager';

type EmployeeRecord = { id: number; name: string; email: string; experience: number; skills: string[]; resume: { filename: string; status: string; extracted_text: string | null } | null; applications: { application_id: number; job_id: number; job_title: string; status: string; match_score: number; created_at: string }[] };
type HrJob = { job_id: number; title: string; category: string; employment_type: string; experience_min: number; experience_max: number; description: string; required_skills: string[]; is_active: boolean };
type SkillOption = { id: number; name: string };
type Thread = { id: number; subject: string; employee_name: string; employee_email: string; messages: { id: number; sender_role: string; sender_name: string; body: string; created_at: string }[] };

function RequiredSkillPicker({ skills, selected }: { skills: SkillOption[]; selected: string[] }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(selected);
  const count = picked.length;
  return <div className="skill-picker"><button className="button secondary" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{count ? `${count} skill${count === 1 ? '' : 's'} selected` : 'Choose required skills'} <span aria-hidden="true">⌄</span></button><div className={`skill-picker-options${open ? ' open' : ''}`}>{skills.length ? skills.map((skill) => <label key={skill.id}><input type="checkbox" name="required_skills" value={skill.name} checked={picked.includes(skill.name)} onChange={(event) => setPicked(event.target.checked ? [...picked, skill.name] : picked.filter((name) => name !== skill.name))} />{skill.name}</label>) : <p>Add skills above before posting a job.</p>}</div></div>;
}

export function StaffDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { name, role } = useSelector((state: RootState) => state.auth);
  const [notice, setNotice] = useState('');
  const [activeThread, setActiveThread] = useState<number | null>(null);
  const [editingJob, setEditingJob] = useState<HrJob | null>(null);
  const categoriesQuery = useQuery({ queryKey: ['hr-categories'], queryFn: async () => (await api<{ id: number; name: string }[]>('/hr/categories')), enabled: role === 'hr' });
  const skillsQuery = useQuery({ queryKey: ['hr-skills'], queryFn: async () => (await api<{ id: number; name: string }[]>('/hr/skills')), enabled: role === 'hr' });
  const employeesQuery = useQuery({ queryKey: ['hr-employees'], queryFn: async () => (await api<{ employees: EmployeeRecord[] }>('/hr/employees')).employees, enabled: role === 'hr' });
  const jobsQuery = useQuery({ queryKey: ['hr-jobs'], queryFn: async () => (await api<{ jobs: HrJob[] }>('/hr/jobs')).jobs, enabled: role === 'hr' });
  const threadsQuery = useQuery({ queryKey: ['hr-messages'], queryFn: async () => (await api<{ threads: Thread[] }>('/hr/messages')).threads, enabled: role === 'hr', refetchInterval: 8000 });
  const employees = employeesQuery.data || [];
  const threads = threadsQuery.data || [];
  const selectedThread = threads.find((thread) => thread.id === activeThread) || threads[0];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice('');
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      if (role === 'admin') {
        const result = await api<{ full_name: string; email: string }>('/admin/hr', { method: 'POST', body: JSON.stringify({ full_name: data.get('full_name'), email: data.get('email'), password: data.get('password') }) });
        setNotice(`HR account created for ${result.full_name} (${result.email}).`);
      } else {
        const requiredSkills = data.getAll('required_skills').map(String);
        if (requiredSkills.length === 0) { setNotice('Choose at least one required skill.'); return; }
        const payload = { title: data.get('title'), category: data.get('category'), employment_type: data.get('employment_type'), experience_min: Number(data.get('experience_min')), experience_max: Number(data.get('experience_max')), description: data.get('description'), required_skills: requiredSkills };
        if (editingJob) {
          await api(`/hr/jobs/${editingJob.job_id}`, { method: 'PUT', body: JSON.stringify(payload) });
          setNotice('Job updated.');
          setEditingJob(null);
        } else {
          await api('/hr/jobs', { method: 'POST', body: JSON.stringify(payload) });
          setNotice('Job posted. Employees can now see it in the database-backed job list.');
        }
        form.reset();
        await client.invalidateQueries({ queryKey: ['hr-jobs'] });
        await client.invalidateQueries({ queryKey: ['jobs'] });
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not complete this action.'); }
  }

  async function deleteJob(job: HrJob) {
    if (!window.confirm(`Close and remove “${job.title}” from employee job listings?`)) return;
    try {
      await api(`/hr/jobs/${job.job_id}`, { method: 'DELETE' });
      setNotice(`“${job.title}” is no longer visible to employees.`);
      await Promise.all([jobsQuery.refetch(), client.invalidateQueries({ queryKey: ['jobs'] })]);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not delete this job.'); }
  }

  async function markSelected(application: EmployeeRecord['applications'][number]) {
    try {
      await api(`/hr/applications/${application.application_id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'SELECTED' }) });
      setNotice(`${application.job_title}: employee marked selected and the job has been closed.`);
      await Promise.all([employeesQuery.refetch(), jobsQuery.refetch(), client.invalidateQueries({ queryKey: ['jobs'] })]);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not update this application.'); }
  }

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedThread) return;
    const form = event.currentTarget; const data = new FormData(form);
    try { await api(`/hr/messages/${selectedThread.id}/reply`, { method: 'POST', body: JSON.stringify({ body: data.get('body') }) }); form.reset(); await threadsQuery.refetch(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Reply could not be sent.'); }
  }

  function logout() { dispatch(signOut()); navigate('/login', { replace: true }); }

  return <div className="app-page"><header className="topbar"><Link className="brand" to="/staff"><span className="brand-mark" /><span>Talent<span className="brand-purple">Flow</span></span></Link><nav className="top-nav"><span className="selected">{role === 'admin' ? 'Admin console' : 'HR workspace'}</span></nav><div className="user-menu"><span className="avatar">{name.slice(0, 2).toUpperCase()}</span><span className="user-name">{name}</span><button onClick={logout}>Sign out</button></div></header>
    <main className="page-shell"><section className="page-intro"><div><div className="eyebrow light-eyebrow">{role === 'admin' ? 'TalentFlow access' : 'People and opportunities'}</div><h1>{role === 'admin' ? <>Manage <span>HR access.</span></> : <>Your HR <span>workspace.</span></>} </h1><p>{role === 'admin' ? 'Create HR accounts. Employees self-register and are assigned employee access.' : 'Publish roles, review employee profiles, and respond to conversations.'}</p></div></section>
      <div className="staff-grid">{role === 'admin' ? <section className="staff-panel"><h2>Create an HR account</h2><p>Only administrators can provision HR access. Share the temporary password securely so the HR user can sign in.</p><form className="staff-form" onSubmit={submit}><label>Full name<input name="full_name" required maxLength={160} /></label><label>Work email<input name="email" type="email" required /></label><label>Temporary password<input name="password" type="password" required minLength={12} autoComplete="new-password" /></label><button className="button" type="submit">Create HR account</button></form>{notice && <p role="status" className="staff-notice">{notice}</p>}</section> : <>
        <section className="staff-panel"><h2>{editingJob ? 'Update a job' : 'Post a job'}</h2><p>Published roles are written to the database and appear in employee job search.</p><HrCatalogManager /><form key={editingJob?.job_id || 'new-job'} className="staff-form" onSubmit={submit}><label>Job title<input name="title" required minLength={2} maxLength={200} defaultValue={editingJob?.title || ''} /></label><label>Category<select name="category" required defaultValue={editingJob?.category || ''}><option value="" disabled>Select a category</option>{categoriesQuery.data?.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label><label>Employment type<select name="employment_type" defaultValue={editingJob?.employment_type || 'Full time'}><option>Full time</option><option>Contract</option><option>Part time</option><option>Internship</option></select></label><div className="staff-form-row"><label>Min. experience<input name="experience_min" type="number" min="0" max="60" step="0.5" defaultValue={editingJob?.experience_min ?? 0} /></label><label>Max. experience<input name="experience_max" type="number" min="0" max="60" step="0.5" defaultValue={editingJob?.experience_max ?? 0} /></label></div><div className="staff-form-label"><span>Required skills</span><RequiredSkillPicker skills={skillsQuery.data || []} selected={editingJob?.required_skills || []} /></div><label>Job description<textarea name="description" rows={5} required minLength={20} defaultValue={editingJob?.description || ''} /></label><div className="job-actions"><button className="button" type="submit">{editingJob ? 'Save changes' : 'Publish job'}</button>{editingJob && <button className="button secondary" type="button" onClick={() => setEditingJob(null)}>Cancel</button>}</div></form>{notice && <p role="status" className="staff-notice">{notice}</p>}<hr /><h2>Your job posts <span>({jobsQuery.data?.length || 0})</span></h2>{jobsQuery.isLoading ? <p>Loading jobs…</p> : !jobsQuery.data?.length ? <p>You haven’t posted any jobs yet.</p> : <div className="employee-list">{jobsQuery.data.map((job) => <article className="employee-record" key={job.job_id}><summary><span><strong>{job.title}</strong><small>{job.category} · {job.employment_type}</small></span><span>{job.is_active ? 'Open' : 'Closed'}</span></summary><div className="job-actions">{job.is_active && <><button className="button secondary" type="button" onClick={() => setEditingJob(job)}>Edit</button><button className="button secondary" type="button" onClick={() => void deleteJob(job)}>Delete</button></>}</div></article>)}</div>}</section>
        <section className="staff-panel"><h2>Employee profiles <span>({employees.length})</span></h2><p>Profiles, resume text, submitted applications, and skill data from PostgreSQL.</p>{employeesQuery.isLoading ? <p>Loading employees…</p> : employees.length === 0 ? <div className="empty-state"><strong>No employee profiles yet</strong><p>Employee registrations will appear here.</p></div> : <div className="employee-list">{employees.map((employee) => <details className="employee-record" key={employee.id}><summary><span><strong>{employee.name}</strong><small>{employee.email}</small></span><span>{employee.experience} years · {employee.applications.length} applications</span></summary><div className="employee-detail"><b>Skills:</b> {employee.skills.join(', ') || 'No skills added'}<br /><b>Resume:</b> {employee.resume ? `${employee.resume.filename} (${employee.resume.status})` : 'Not uploaded'}<br /><b>Applications:</b>{employee.applications.length ? <div className="application-review-list">{employee.applications.map((app) => <div key={app.application_id}><span>{app.job_title} · {app.status} · {app.match_score}%</span>{app.status !== 'SELECTED' && <button className="button secondary" type="button" onClick={() => void markSelected(app)}>Mark selected</button>}</div>)}</div> : ' None'}{employee.resume?.extracted_text && <><h3>Extracted resume content</h3><pre>{employee.resume.extracted_text}</pre></>}</div></details>)}</div>}
          <hr /><h2>Employee messages <span>({threads.length})</span></h2>{threads.length === 0 ? <p>Employee conversations will appear here.</p> : <div className="message-workspace"><div className="thread-list">{threads.map((thread) => <button className={selectedThread?.id === thread.id ? 'thread-link active' : 'thread-link'} key={thread.id} onClick={() => setActiveThread(thread.id)}><strong>{thread.subject}</strong><small>{thread.employee_name} · {thread.employee_email}</small><span>{thread.messages[thread.messages.length - 1]?.body.slice(0, 90)}</span></button>)}</div>{selectedThread && <div className="thread-view"><h3>{selectedThread.subject}</h3><small>{selectedThread.employee_name} · {selectedThread.employee_email}</small><div className="thread-messages">{selectedThread.messages.map((message) => <article key={message.id}><b>{message.sender_name} · {message.sender_role}</b><p>{message.body}</p></article>)}</div><form className="reply-form" onSubmit={reply}><textarea name="body" rows={3} placeholder="Write a reply to the employee…" required maxLength={10000} /><button className="button" type="submit">Send reply</button></form></div>}</div>}</section>
      </>}</div>
    </main></div>;
}
