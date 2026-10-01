import { useState, type FormEvent } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch } from '../../store';
import { signIn } from '../../store';
import { AuthLayout } from '../../components/AuthLayout';
import { api } from '../../lib/api';

export function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') || '');
    try {
      const result = await api<{ access_token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: String(data.get('password') || '') }) });
      sessionStorage.setItem('talentflow-token', result.access_token);
      const user = await api<{ full_name: string; role: 'employee' | 'hr' | 'admin' }>('/auth/me');
      dispatch(signIn({ name: user.full_name, role: user.role, token: result.access_token }));
      navigate(user.role === 'employee' ? '/jobs' : '/staff', { replace: true });
    } catch (error) { sessionStorage.removeItem('talentflow-token'); setMessage(error instanceof Error ? error.message : 'Unable to sign in.'); }
  }
  return <AuthLayout><>{message && <div role="alert" className="form-message">{message}</div>}<form className="auth-form" onSubmit={handleSubmit}><label>Email address<input type="email" name="email" placeholder="you@example.com" autoComplete="email" required /></label><label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} name="password" placeholder="Enter your password" autoComplete="current-password" minLength={8} required /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label><div className="form-options"><label className="check-label"><input type="checkbox" name="remember" /> Keep me signed in</label><button type="button" className="text-link" onClick={() => setMessage('Password reset is not configured yet.')}>Forgot password?</button></div><button className="submit-button" type="submit">Sign in&nbsp; →</button></form><div className="auth-legal">Sign in with your TalentFlow account.</div></></AuthLayout>;
}
