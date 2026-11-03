import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";

/** useApi("/api/path") -> { data, loading, error, reload }.  Pass null to skip fetching. */
export function useApi(path) {
  const [state, setState] = useState({ data: null, loading: Boolean(path), error: "" });

  const load = useCallback(async () => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      setState({ data: await api.get(path), loading: false, error: "" });
    } catch (e) {
      setState({ data: null, loading: false, error: e.message });
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
