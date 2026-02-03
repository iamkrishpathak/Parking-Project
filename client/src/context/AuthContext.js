import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

const USER_KEY = 'parksetu_user';
const TOKEN_KEY = 'parksetu_token';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem(USER_KEY);
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  // create socket connection when user logs in
  useEffect(() => {
    if (user) {
      try {
        const s = io('http://localhost:5000');
        s.on('connect', () => {
          s.emit('join', user._id);
        });
        setSocket(s);
        return () => {
          s.disconnect();
          setSocket(null);
        };
      } catch (err) {
        console.error('Socket connection error', err);
      }
    }
    return () => {};
  }, [user]);

  const login = ({ token: newToken, user: newUser }) => {
    if (newToken) setToken(newToken);
    if (newUser) setUser(newUser);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isHost: user?.role === 'host',
      isDriver: user?.role === 'driver',
      isAdmin: user?.role === 'admin',
      socket,
      login,
      updateUser,
      logout,
    }),
    [user, token, socket]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

