import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still checking, null = signed out
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  // Supabase calls resolve to { data, error }; throw so callers can use try/catch.
  const run = async (promise) => {
    const { data, error } = await promise;
    if (error) throw error;
    return data;
  };

  const value = {
    loading: session === undefined,
    user,
    name,
    signOut: () => supabase.auth.signOut(),
    updateName: (fullName) => run(supabase.auth.updateUser({ data: { full_name: fullName } })),
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
