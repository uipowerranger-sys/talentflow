import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { api } from '../../lib/api';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { signIn } from '../../store';

export function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get('password') !== data.get('confirmPassword')) { setError('Those passwords don’t match. Please check and try again.'); return; }
    try {
      const result = await api<{ access_token: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ full_name: `${data.get('firstName')} ${data.get('lastName')}`, email: data.get('email'), password: data.get('password') }) });
      dispatch(signIn({ name: `${data.get('firstName')} ${data.get('lastName')}`, token: result.access_token }));
      navigate('/jobs', { replace: true });
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to create your account.'); }
  }
  return <AuthLayout register><>{error && <div role="alert" className="form-message">{error}</div>}<form className="auth-form compact-form" onSubmit={handleSubmit}><div className="name-fields"><label>First name<input name="firstName" placeholder="Jordan" autoComplete="given-name" required /></label><label>Last name<input name="lastName" placeholder="Davis" autoComplete="family-name" required /></label></div><label>Email address<input type="email" name="email" placeholder="you@example.com" autoComplete="email" required /></label><label>Create a password<div className="password-field"><input type={showPassword ? 'text' : 'password'} name="password" placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label><label>Confirm password<input type="password" name="confirmPassword" placeholder="Enter your password again" autoComplete="new-password" minLength={8} required /></label><label className="check-label terms"><input type="checkbox" required /><span>I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.</span></label><button className="submit-button" type="submit">Create account&nbsp; →</button></form><div className="auth-legal">Create your TalentFlow account.</div></></AuthLayout>;
}
