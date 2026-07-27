import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, clearToken, getToken } from "@/lib/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getToken()) { setLoading(false); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setProfile(data.profile);
    } catch (e) {
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    await refresh();
    return data.user;
  };
  const signup = async (payload) => {
    const { data } = await api.post("/auth/signup", payload);
    setToken(data.token);
    setUser(data.user);
    await refresh();
    return data.user;
  };
  const logout = () => { clearToken(); setUser(null); setProfile(null); };

  return (
    <AuthCtx.Provider value={{ user, profile, loading, login, signup, logout, refresh, setProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}
