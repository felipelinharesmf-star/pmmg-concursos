import React, { useState, useEffect } from 'react';
import { Screen } from './types';
import Layout from './components/Layout';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import FilterScreen from './screens/FilterScreen';
import QuestionScreen from './screens/QuestionScreen';
import SettingsScreen from './screens/SettingsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import PerformanceScreen from './screens/PerformanceScreen';

import SubscriptionScreen from './screens/SubscriptionScreen';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.LOGIN);
  const [params, setParams] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentScreen(Screen.DASHBOARD);
      } else {
        setCurrentScreen(Screen.LOGIN);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        if (currentScreen === Screen.LOGIN) setCurrentScreen(Screen.DASHBOARD);
      } else {
        setCurrentScreen(Screen.LOGIN);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = (screen: Screen, newParams?: any) => {
    setCurrentScreen(screen);
    setParams(newParams);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-surface-50">Carregando...</div>;
  }

  const showLayout = currentScreen !== Screen.LOGIN && currentScreen !== Screen.ONBOARDING;
  const showBottomNav = true;

  return (
    <>
      {!showLayout && (
        <div className="app-container">
          {currentScreen === Screen.LOGIN && <LoginScreen onNavigate={handleNavigate} />}
          {currentScreen === Screen.ONBOARDING && <OnboardingScreen onNavigate={handleNavigate} />}
        </div>
      )}

      {showLayout && (
        <Layout
          activeScreen={currentScreen}
          onNavigate={handleNavigate}
          showBottomNav={showBottomNav}
        >
          {currentScreen === Screen.DASHBOARD && <DashboardScreen onNavigate={handleNavigate} />}
          {currentScreen === Screen.FILTER && <FilterScreen onNavigate={handleNavigate} params={params} />}
          {currentScreen === Screen.QUESTION && <QuestionScreen onNavigate={handleNavigate} params={params} />}
          {currentScreen === Screen.SETTINGS && <SettingsScreen onNavigate={handleNavigate} />}
          {currentScreen === Screen.PERFORMANCE && <PerformanceScreen onNavigate={handleNavigate} />}

          {currentScreen === Screen.SUBSCRIPTION && <SubscriptionScreen onNavigate={handleNavigate} />}
        </Layout>
      )}
    </>
  );
};

export default App;
