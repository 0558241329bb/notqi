import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserCategory = 'children' | 'students' | 'adults' | 'non-native';

interface UserData {
  id: string;
  name: string;
  email: string;
  category: UserCategory;
  level: string;
  goal: string;
  language_pref: string;
}

interface AuthState {
  user: UserData | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, user: UserData) => void;
  logout: () => void;
  updateProfile: (data: Partial<UserData>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('natqi_token');
    const savedUser = localStorage.getItem('natqi_user');

    if (savedToken && savedUser) {
      setState({
        user: JSON.parse(savedUser),
        token: savedToken,
        loading: false,
      });
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    const categories = ['children', 'students', 'adults', 'non-native'];
    // Remove all existing theme classes
    categories.forEach(cat => document.body.classList.remove(`theme-${cat}`));
    // Apply current category theme
    if (state.user?.category) {
      document.body.classList.add(`theme-${state.user.category}`);
    }
  }, [state.user?.category]);

  const login = (token: string, user: UserData) => {
    localStorage.setItem('natqi_token', token);
    localStorage.setItem('natqi_user', JSON.stringify(user));
    setState({ user, token, loading: false });
  };

  const logout = () => {
    localStorage.removeItem('natqi_token');
    localStorage.removeItem('natqi_user');
    setState({ user: null, token: null, loading: false });
  };

  const updateProfile = (data: Partial<UserData>) => {
    if (!state.user) return;
    const updatedUser = { ...state.user, ...data };
    localStorage.setItem('natqi_user', JSON.stringify(updatedUser));
    setState(prev => ({ ...prev, user: updatedUser }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
