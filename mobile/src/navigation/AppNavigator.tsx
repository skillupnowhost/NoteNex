import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import AuthNavigator from './AuthNavigator';
import BottomTabNavigator from './BottomTabNavigator';
import SplashScreen from '../screens/SplashScreen';
import LoadingScreen from '../screens/LoadingScreen';

type AppState = 'splash' | 'loading' | 'ready';

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [appState, setAppState] = useState<AppState>('splash');

  function onSplashDone() {
    setAppState('loading');
  }

  useEffect(() => {
    if (appState === 'loading' && !loading) {
      setAppState('ready');
    }
  }, [loading, appState]);

  if (appState === 'splash') {
    return <SplashScreen onFinish={onSplashDone} />;
  }

  if (appState === 'loading' || loading) {
    return <LoadingScreen />;
  }

  return user ? <BottomTabNavigator /> : <AuthNavigator />;
}
