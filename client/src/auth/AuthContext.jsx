import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import * as authClient from "../api/authClient.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const homeFor = (role) => (role === "doctor" ? "/doctor" : "/patient");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [pending, setPending] = useState(null); // verified Google identity that still has to choose patient / doctor
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get("/api/me");
      setUser(data.user);
      setProfile(data.profile);
      setPending(data.pending || null);
      return data.user;
    } catch {
      setUser(null);
      setProfile(null);
      setPending(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onExpired = () => { setUser(null); setProfile(null); };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const login = useCallback(
    async (email, password) => {
      await authClient.signIn(email, password);
      const u = await refresh();
      if (!u) throw new Error("Signed in, but the session could not be read. Check the server logs.");
      return u;
    },
    [refresh]
  );

  const completeGoogle = useCallback(
    async (payload) => {
      await api.post("/api/google/complete", payload);
      const u = await refresh();
      if (!u) throw new Error("Your account was created, but the session could not be read. Please log in again.");
      return u;
    },
    [refresh]
  );

  const register = useCallback((payload) => api.post("/api/register", payload), []);

  const logout = useCallback(async () => {
    await authClient.signOut().catch(() => {});
    setUser(null);
    setProfile(null);
    setPending(null);
  }, []);

  const value = useMemo(() => ({ user, profile, pending, loading, login, completeGoogle, register, logout, refresh }), [user, profile, pending, loading, login, completeGoogle, register, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
