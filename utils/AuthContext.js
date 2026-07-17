import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from './supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setStaffProfile(null);
      return;
    }
    supabase
      .from('staff_profiles')
      .select('id, full_name, hospital_id, hospitals ( id, name )')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setStaffProfile(data));
  }, [session]);

  useEffect(() => {
    if (loading || !router.isReady) return;
    const isPublic = router.pathname === '/login';
    if (!isPublic && !session) router.replace('/login');
    if (isPublic && session) router.replace('/');
  }, [loading, session, router.isReady, router.pathname]);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    router.replace('/');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ session, staffProfile, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
