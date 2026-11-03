import { Component } from "react";
import { AlertTriangle } from "lucide-react";

/** Catches render errors so a bug in one page shows a friendly message instead of a blank screen. */
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[ui] render error:", error, info?.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    // Deliberately English-only and hook-free: the i18n provider itself may be what failed.
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="glass max-w-md p-8" role="alert">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-300" />
          <h1 className="mt-3 text-xl font-semibold text-lav-100">Something went wrong</h1>
          <p className="mt-2 text-sm text-lav-300">The page hit an unexpected problem. Reloading usually fixes it.</p>
          <button className="btn-primary mt-5" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    );
  }
}
