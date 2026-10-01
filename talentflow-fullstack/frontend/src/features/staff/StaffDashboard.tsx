import { useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { signOut, type AppDispatch, type RootState } from '../../store';

type EmployeeRecord = { id: number; name: string; email: string; experience: number; skills: string[]; resume: { filename: string; status: string; extracted_text: string | null } | null; applications: { job_id: number; job_title: string; status: string; match_score: number; created_at: string }[] };
type Thread = { id: number; subject: string; employee_name: string; employee_email: string; messages: { id: number; sender_role: string; sender_name: string; body: string; created_at: string }[] };

export function StaffDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { name, role } = useSelector((state: RootState) => state.auth);
  const [notice, setNotice] = useState('');
  const [activeThread, setActiveThread] = useState<number | null>(null);
  const employeesQuery = useQuery({ queryKey: ['hr-employees'], queryFn: async () => (await api<{ employees: EmployeeRecord[] }>('/hr/employees')).employees, enabled: role === 'hr' });
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
        const rawSkills = String(data.get('required_skills') || '');
        await api('/hr/jobs', { method: 'POST', body: JSON.stringify({ title: data.get('title'), company: data.get('company'), location: data.get('location'), category: data.get('category'), employment_type: data.get('employment_type'), experience_min: Number(data.get('experience_min')), experience_max: Number(data.get('experience_max')), description: data.get('description'), required_skills: rawSkills.split(',').map((skill) => skill.trim()).filter(Boolean) }) });
        setNotice('Job posted. Employees can now see it in the database-backed job list.');
        form.reset();
        await client.invalidateQueries({ queryKey: ['jobs'] });
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not complete this action.'); }
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
        <section className="staff-panel"><h2>Post a job</h2><p>Published roles are written to the database and appear in employee job search.</p><form className="staff-form" onSubmit={submit}><label>Job title<input name="title" required minLength={2} maxLength={200} /></label><label>Company<input name="company" required /></label><label>Location<input name="location" required /></label><label>Category<input name="category" required /></label><label>Employment type<select name="employment_type"><option>Full time</option><option>Contract</option><option>Part time</option><option>Internship</option></select></label><div className="staff-form-row"><label>Min. experience<input name="experience_min" type="number" min="0" max="60" step="0.5" defaultValue="0" /></label><label>Max. experience<input name="experience_max" type="number" min="0" max="60" step="0.5" defaultValue="0" /></label></div><label>Required skills (comma separated)<input name="required_skills" placeholder="React, TypeScript, SQL" required /></label><label>Job description<textarea name="description" rows={5} required minLength={20} /></label><button className="button" type="submit">Publish job</button></form>{notice && <p role="status" className="staff-notice">{notice}</p>}</section>
        <section className="staff-panel"><h2>Employee profiles <span>({employees.length})</span></h2><p>Profiles, resume text, submitted applications, and skill data from PostgreSQL.</p>{employeesQuery.isLoading ? <p>Loading employees…</p> : employees.length === 0 ? <div className="empty-state"><strong>No employee profiles yet</strong><p>Employee registrations will appear here.</p></div> : <div className="employee-list">{employees.map((employee) => <details className="employee-record" key={employee.id}><summary><span><strong>{employee.name}</strong><small>{employee.email}</small></span><span>{employee.experience} years · {employee.applications.length} applications</span></summary><div className="employee-detail"><b>Skills:</b> {employee.skills.join(', ') || 'No skills added'}<br /><b>Resume:</b> {employee.resume ? `${employee.resume.filename} (${employee.resume.status})` : 'Not uploaded'}<br /><b>Applications:</b> {employee.applications.map((app) => `${app.job_title} · ${app.status} · ${app.match_score}%`).join(' | ') || 'None'}{employee.resume?.extracted_text && <><h3>Extracted resume content</h3><pre>{employee.resume.extracted_text}</pre></>}</div></details>)}</div>}
          <hr /><h2>Employee messages <span>({threads.length})</span></h2>{threads.length === 0 ? <p>Employee conversations will appear here.</p> : <div className="message-workspace"><div className="thread-list">{threads.map((thread) => <button className={selectedThread?.id === thread.id ? 'thread-link active' : 'thread-link'} key={thread.id} onClick={() => setActiveThread(thread.id)}><strong>{thread.subject}</strong><small>{thread.employee_name} · {thread.employee_email}</small><span>{thread.messages[thread.messages.length - 1]?.body.slice(0, 90)}</span></button>)}</div>{selectedThread && <div className="thread-view"><h3>{selectedThread.subject}</h3><small>{selectedThread.employee_name} · {selectedThread.employee_email}</small><div className="thread-messages">{selectedThread.messages.map((message) => <article key={message.id}><b>{message.sender_name} · {message.sender_role}</b><p>{message.body}</p></article>)}</div><form className="reply-form" onSubmit={reply}><textarea name="body" rows={3} placeholder="Write a reply to the employee…" required maxLength={10000} /><button className="button" type="submit">Send reply</button></form></div>}</div>}</section>
      </>}</div>
    </main></div>;
}
