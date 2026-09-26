import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * ============================================================================
 * AUTHENTICATION CONTEXT (AuthContext)
 * ============================================================================
 * 
 * Purpose:
 * Centralizes authentication state management across the entire React application.
 * 
 * Key Functions:
 * 1. Token Persistence: Stores JWT in `localStorage` under key `crh_auth_token`.
 * 2. Session Hydration: On app startup, checks for existing token and verifies it
 *    against `/api/auth/me` to restore user session without requiring re-login.
 * 3. Auth Actions: Exposes `login()`, `signup()`, `logout()`, and `refreshUser()`.
 * 4. Custom Hook: `useAuth()` provides clean, typed access with error boundary checking.
 */

const AuthContext = createContext(null);

const TOKEN_KEY = 'crh_auth_token';
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch current user profile from server using active JWT
   */
  const fetchCurrentUser = useCallback(async (authToken) => {
    if (!authToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        setUser(data.user);
        setError(null);
      } else {
        // Token is invalid or expired
        console.warn('Session expired or invalid token:', data.message);
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Hydrate user profile whenever token changes or on initial mount
  useEffect(() => {
    fetchCurrentUser(token);
  }, [token, fetchCurrentUser]);

  /**
   * Login user with email & password
   */
  const login = async (email, password) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }

      // Save token to localStorage & update state
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Register new user (student, cr, or lecturer)
   */
  const signup = async (userData) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Signup failed. Please check your details.');
      }

      // Save token to localStorage & update state
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Log out user: clears token from localStorage and resets user state
   */
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  };

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user,
    isCRPending: user?.role === 'cr' && !user?.isApproved,
    login,
    signup,
    logout,
    refreshUser: () => fetchCurrentUser(token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to consume AuthContext safely
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
