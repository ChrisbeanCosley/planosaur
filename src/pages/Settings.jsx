import { useEffect, useRef, useState } from 'react';
import { Image, KeyRound, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

const RESEND_SECONDS = 60; // Supabase only allows one code email per minute

export default function Settings() {
  return (
    <div className="settings">
      <h1 className="page-title">Settings</h1>
      <div className="settings__sections">
        <ProfileSection />
        <LogoSection />
        <PasswordSection />
      </div>
    </div>
  );
}

function Message({ message }) {
  if (!message) return null;
  return (
    <p className={`settings__message settings__message--${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'}>
      {message.text}
    </p>
  );
}

function ProfileSection() {
  const { user, name, updateName } = useAuth();
  const [fullName, setFullName] = useState(name);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const changed = fullName.trim() && fullName.trim() !== name;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await updateName(fullName.trim());
      setMessage({ tone: 'success', text: 'Profile saved.' });
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card settings__card">
      <h2 className="settings__heading">
        <UserRound size={17} strokeWidth={1.8} /> Profile
      </h2>
      <form onSubmit={save} className="settings__form">
        <label className="form-row">
          <span>Name</span>
          <input className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
        </label>
        <label className="form-row">
          <span>Email</span>
          <input className="field" value={user?.email ?? ''} disabled />
        </label>
        <Message message={message} />
        <div className="settings__actions">
          <button type="submit" className="btn" disabled={busy || !changed}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </section>
  );
}

// Company logo shown at the top of invoices.
function LogoSection() {
  const { logoUrl, uploadLogo, removeLogo } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInput = useRef(null);

  const run = async (action, success) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: success });
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (file) run(() => uploadLogo(file), 'Logo saved. It now appears on your invoices.');
  };

  const remove = () => {
    if (!window.confirm('Remove your company logo from invoices?')) return;
    run(removeLogo, 'Logo removed.');
  };

  return (
    <section className="card settings__card">
      <h2 className="settings__heading">
        <Image size={17} strokeWidth={1.8} /> Company logo
      </h2>
      <div className="settings__form">
        <div className="settings__logo">
          {logoUrl ? <img src={logoUrl} alt="Company logo" /> : <span>No logo yet</span>}
        </div>
        <p className="settings__hint">Shown at the top of your invoices. PNG or JPG, up to 2 MB.</p>
        <Message message={message} />
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg"
          className="visually-hidden"
          onChange={onFile}
          tabIndex={-1}
          aria-hidden="true"
        />
        <div className="settings__actions">
          {logoUrl && (
            <button type="button" className="btn btn--ghost" onClick={remove} disabled={busy}>
              Remove
            </button>
          )}
          <button type="button" className="btn" onClick={() => fileInput.current?.click()} disabled={busy}>
            {busy ? 'Saving…' : logoUrl ? 'Replace logo' : 'Upload logo'}
          </button>
        </div>
      </div>
    </section>
  );
}

// Two steps: email a one-time code, then enter it with the new password.
function PasswordSection() {
  const { user, sendPasswordCode, changePassword } = useAuth();
  const [step, setStep] = useState('start'); // 'start' | 'verify'
  const [form, setForm] = useState({ code: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await sendPasswordCode();
      setStep('verify');
      setCooldown(RESEND_SECONDS);
      setMessage({ tone: 'info', text: `We emailed a code to ${user?.email}. It expires after a few minutes.` });
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setMessage({ tone: 'error', text: 'The two passwords don’t match.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await changePassword(form.password, form.code.trim());
      setStep('start');
      setForm({ code: '', password: '', confirm: '' });
      setMessage({ tone: 'success', text: 'Your password has been changed.' });
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setStep('start');
    setForm({ code: '', password: '', confirm: '' });
    setMessage(null);
  };

  return (
    <section className="card settings__card">
      <h2 className="settings__heading">
        <KeyRound size={17} strokeWidth={1.8} /> Change password
      </h2>

      {step === 'start' ? (
        <div className="settings__form">
          <p className="settings__hint">
            <Mail size={14} strokeWidth={1.8} /> For your security we’ll email a one-time code to {user?.email} before
            your password can be changed.
          </p>
          <Message message={message} />
          <div className="settings__actions">
            <button type="button" className="btn" onClick={sendCode} disabled={busy}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="settings__form">
          <Message message={message} />
          <label className="form-row">
            <span>Code from email</span>
            <input
              className="field settings__code"
              value={form.code}
              onChange={set('code')}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              autoFocus
            />
          </label>
          <label className="form-row">
            <span>New password</span>
            <input
              className="field"
              type="password"
              value={form.password}
              onChange={set('password')}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label className="form-row">
            <span>Confirm new password</span>
            <input
              className="field"
              type="password"
              value={form.confirm}
              onChange={set('confirm')}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <div className="settings__actions">
            <button type="button" className="link-button" onClick={sendCode} disabled={busy || cooldown > 0}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={cancel} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={busy}>
              {busy ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
