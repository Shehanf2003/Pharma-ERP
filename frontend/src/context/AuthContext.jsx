import React, { createContext, useState, useContext, useEffect } from 'react';
import  axiosInstance from "../lib/axios.js"; 

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axiosInstance.get('/auth/check');
        setUser(res.data);
        // Cache user for offline access
        localStorage.setItem('offline_user', JSON.stringify(res.data));
      } catch (error) {
        // If network error or server error, try to restore from cache
        if (!error.response || error.response.status >= 500) {
           const cached = localStorage.getItem('offline_user');
           if (cached) {
             try {
               setUser(JSON.parse(cached));
               console.log("Restored user session from offline cache");
             } catch (e) {
               console.error("Failed to parse cached user", e);
               setUser(null);
             }
           } else {
             setUser(null);
           }
        } else {
           // If 401/403 (unauthorized), clear cache
           localStorage.removeItem('offline_user');
           setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await axiosInstance.post('/auth/login', { email, password });
      setUser(res.data);
      localStorage.setItem('offline_user', JSON.stringify(res.data));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      // Always clear local state and cache
      setUser(null);
      localStorage.removeItem('offline_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
