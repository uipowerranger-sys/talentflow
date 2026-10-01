import { useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { signOut, type AppDispatch, type RootState } from '../../store';

type Thread = { id: number; subject: string; messages: { id: number; sender_role: string; sender_name: string; body: string; created_at: string }[] };

export function EmployeeMessagesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const name = useSelector((state: RootState) => state.auth.name);
  const [notice, setNotice] = useState('');
  const query = useQuery({ queryKey: ['employee-messages'], queryFn: async () => (await api<{ threads: Thread[] }>('/employee/messages')).threads, refetchInterval: 8000 });
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice('');
    const form = event.currentTarget; const data = new FormData(form);
    try { await api('/employee/messages', { method: 'POST', body: JSON.stringify({ subject: data.get('subject'), body: data.get('body') }) }); form.reset(); setNotice('Your message was sent to HR.'); await query.refetch(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Message could not be sent.'); }
  }
  function logout() { dispatch(signOut()); navigate('/login', { replace: true }); }
  return <div className="app-page"><header className="topbar"><Link className="brand" to="/jobs"><span className="brand-mark" /><span>Talent<span className="brand-purple">Flow</span></span></Link><nav className="top-nav"><Link to="/jobs">Find jobs</Link><Link className="selected" to="/messages">Messages to HR</Link></nav><div className="user-menu"><span className="avatar">{name.slice(0, 2).toUpperCase()}</span><span className="user-name">{name}</span><button onClick={logout}>Sign out</button></div></header><main className="page-shell"><section className="page-intro"><div><div className="eyebrow light-eyebrow">Employee support</div><h1>Messages to <span>HR.</span></h1><p>Ask a question and continue the conversation here. Replies are saved to your account.</p></div></section><section className="staff-panel employee-messages"><h2>Start a conversation</h2><form className="staff-form" onSubmit={send}><label>Subject<input name="subject" required minLength={3} maxLength={200} /></label><label>Message<textarea name="body" required rows={4} maxLength={10000} /></label><button className="button" type="submit">Send to HR</button></form>{notice && <p role="status" className="staff-notice">{notice}</p>}<hr /><h2>Your conversations</h2>{query.isLoading ? <p>Loading messages…</p> : !query.data?.length ? <div className="empty-state"><strong>No conversations yet</strong><p>Messages you send and HR replies will show here.</p></div> : <div className="employee-thread-list">{query.data.map((thread) => <article className="employee-thread" key={thread.id}><h3>{thread.subject}</h3>{thread.messages.map((message) => <div className={`conversation-message ${message.sender_role === 'hr' ? 'from-hr' : ''}`} key={message.id}><b>{message.sender_name} · {message.sender_role}</b><p>{message.body}</p><small>{new Date(message.created_at).toLocaleString()}</small></div>)}</article>)}</div>}</section></main></div>;
}
