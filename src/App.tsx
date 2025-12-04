import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { LandingPage } from './components/LandingPage';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import type { User } from '@supabase/supabase-js';

type AppState = 'landing' | 'auth' | 'dashboard';

function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setAppState('dashboard');
        } else {
          setAppState('landing');
        }
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        setAppState('dashboard');
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAppState('landing');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-text mx-auto mb-4"></div>
          <p className="font-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (appState === 'landing') {
    return <LandingPage onGetStarted={() => setAppState('auth')} />;
  }

  if (appState === 'auth') {
    return <Auth onAuthSuccess={() => setAppState('dashboard')} />;
  }

  return <Dashboard onSignOut={handleSignOut} />;
}

export default App;
