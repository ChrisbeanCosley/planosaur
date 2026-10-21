import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Company logo storage (see supabase/migrations/0004_logo_storage.sql).
const LOGO_BUCKET = 'logos';
const LOGO_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg' };
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_URL_SECONDS = 60 * 60;

export function AuthProvider({ children }) {
  // undefined = still checking, null = signed out
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const meta = user?.user_metadata ?? {};
  // Accounts from before first/last name existed only have full_name: split it as a starting point.
  const [splitFirst = '', ...splitRest] = (meta.full_name ?? '').trim().split(/\s+/);
  const firstName = meta.first_name ?? splitFirst;
  const lastName = meta.last_name ?? splitRest.join(' ');
  const name = meta.full_name || [firstName, lastName].filter(Boolean).join(' ') || user?.email?.split('@')[0] || '';
  const companyName = meta.company_name ?? '';
  const logoPath = meta.logo_path ?? null;

  // The logos bucket is private, so the logo is shown through a short-lived signed URL,
  // refreshed before it expires.
  const [logoUrl, setLogoUrl] = useState(null);
  useEffect(() => {
    if (!logoPath) {
      setLogoUrl(null);
      return undefined;
    }
    let cancelled = false;
    const refresh = async () => {
      const { data } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(logoPath, LOGO_URL_SECONDS);
      if (!cancelled) setLogoUrl(data?.signedUrl ?? null);
    };
    refresh();
    const timer = setInterval(refresh, (LOGO_URL_SECONDS - 300) * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [logoPath]);

  // Supabase calls resolve to { data, error }; throw so callers can use try/catch.
  const run = async (promise) => {
    const { data, error } = await promise;
    if (error) throw error;
    return data;
  };

  const uploadLogo = async (file) => {
    if (!LOGO_TYPES[file.type]) throw new Error('Please choose a PNG or JPG image.');
    if (file.size > LOGO_MAX_BYTES) throw new Error('The logo must be 2 MB or smaller.');
    // A new file name each time so browsers don't keep showing a cached old logo.
    const path = `${user.id}/logo-${Date.now()}.${LOGO_TYPES[file.type]}`;
    await run(supabase.storage.from(LOGO_BUCKET).upload(path, file, { contentType: file.type }));
    await run(supabase.auth.updateUser({ data: { logo_path: path } }));
    if (logoPath) await supabase.storage.from(LOGO_BUCKET).remove([logoPath]);
  };

  const removeLogo = async () => {
    if (!logoPath) return;
    await run(supabase.auth.updateUser({ data: { logo_path: null } }));
    await supabase.storage.from(LOGO_BUCKET).remove([logoPath]);
  };

  const value = {
    loading: session === undefined,
    user,
    name,
    logoUrl,
    // Who invoices are from: shown on the invoice sheet and PDF.
    firstName,
    lastName,
    companyName,
    sender: { name, company: companyName, email: user?.email, logoUrl },
    uploadLogo,
    removeLogo,
    signOut: () => supabase.auth.signOut(),
    // full_name is kept in step so the sidebar, sign-up and invoices all read one value.
    updateName: (first, last) =>
      run(
        supabase.auth.updateUser({
          data: { first_name: first, last_name: last, full_name: [first, last].filter(Boolean).join(' ') },
        }),
      ),
    updateCompanyName: (company) => run(supabase.auth.updateUser({ data: { company_name: company } })),
    // Emails the user a one-time code that proves it's really them.
    sendPasswordCode: () => run(supabase.auth.reauthenticate()),
    // Changes the password; Supabase rejects it unless the emailed code (nonce) is valid.
    changePassword: (password, code) => run(supabase.auth.updateUser({ password, nonce: code })),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
