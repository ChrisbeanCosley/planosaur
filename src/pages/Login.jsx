import { useState } from 'react';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';
import './Login.css';

export default function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { tone: 'error' | 'info', text }
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const switchMode = (next) => {
    setMode(next);
    setMessage(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            // Same fields Settings edits; full_name is what the sidebar and invoices show.
            data: {
              first_name: form.firstName.trim(),
              last_name: form.lastName.trim(),
              full_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage({ tone: 'info', text: 'Almost there! Check your email for a link to confirm your account.' });
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage({ tone: 'info', text: 'If that email has an account, a reset link is on its way.' });
      }
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const titles = { signin: 'Welcome back', signup: 'Create your account', reset: 'Reset your password' };
  const actions = { signin: 'Sign in', signup: 'Create account', reset: 'Send reset link' };

  return (
    <div className="login">
      <div className="login__card card">
        <img src={logo} alt="" className="login__logo" />
        <div className="login__brand">Planosaur</div>
        <h1>{titles[mode]}</h1>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <div className="form-row-group">
              <label className="form-row">
                <span>First name</span>
                <input className="field" value={form.firstName} onChange={set('firstName')} required autoComplete="given-name" />
              </label>
              <label className="form-row">
                <span>Surname</span>
                <input className="field" value={form.lastName} onChange={set('lastName')} required autoComplete="family-name" />
              </label>
            </div>
          )}
          <label className="form-row">
            <span>Email</span>
            <input className="field" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
          </label>
          {mode !== 'reset' && (
            <label className="form-row">
              <span>Password</span>
              <input
                className="field"
                type="password"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </label>
          )}

          {message && <p className={`login__message login__message--${message.tone}`}>{message.text}</p>}

          <button type="submit" className="btn login__submit" disabled={busy}>
            {busy ? 'Please wait…' : actions[mode]}
          </button>
        </form>

        <div className="login__switch">
          {mode === 'signin' && (
            <>
              <button type="button" className="link-button" onClick={() => switchMode('reset')}>
                Forgot password?
              </button>
              <span>
                New here?{' '}
                <button type="button" className="link-button" onClick={() => switchMode('signup')}>
                  Create an account
                </button>
              </span>
            </>
          )}
          {mode !== 'signin' && (
            <button type="button" className="link-button" onClick={() => switchMode('signin')}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
