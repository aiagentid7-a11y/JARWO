import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import Login from './Login';
import { Loader2 } from 'lucide-react';

interface AuthContextValue {
  user: User | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const saved = localStorage.getItem('ahb_local_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        localStorage.removeItem('ahb_local_session');
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (data?.session) {
        setSession(data.session);
      }
      setIsLoading(false);
    }).catch(() => {
      if (!isMounted) return;
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        setSession(newSession);
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    localStorage.removeItem('ahb_local_session');
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setSession(null);
  };

  if (isLoading && !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <AuthContext.Provider value={{ user: session.user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

