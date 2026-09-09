import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('stocksense_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('stocksense_access_token');
    if (token) {
      authApi.getMe()
        .then(res => {
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('stocksense_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          localStorage.removeItem('stocksense_access_token');
          localStorage.removeItem('stocksense_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.success && res.tokens?.accessToken) {
      localStorage.setItem('stocksense_access_token', res.tokens.accessToken);
      localStorage.setItem('stocksense_user', JSON.stringify(res.user));
      setUser(res.user);
    }
    return res;
  };

  const signup = async (name, email, password, confirmPassword) => {
    const res = await authApi.signup({ name, email, password, confirmPassword });
    if (res.success && res.tokens?.accessToken) {
      localStorage.setItem('stocksense_access_token', res.tokens.accessToken);
      localStorage.setItem('stocksense_user', JSON.stringify(res.user));
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('stocksense_access_token');
    localStorage.removeItem('stocksense_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
