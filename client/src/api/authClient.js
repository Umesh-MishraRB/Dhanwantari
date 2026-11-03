// Minimal Auth.js client (what next-auth/react does, without Next.js).
// Talks to the Auth.js routes mounted by @auth/express at /auth/*.
async function csrfToken() {
  const res = await fetch("/auth/csrf", { credentials: "include" });
  if (!res.ok) throw new Error("Cannot reach the authentication service.");
  return (await res.json()).csrfToken;
}

const formHeaders = { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" };

export async function signIn(email, password) {
  const res = await fetch("/auth/callback/credentials", {
    method: "POST",
    credentials: "include",
    headers: formHeaders,
    body: new URLSearchParams({ csrfToken: await csrfToken(), email, password, callbackUrl: "/", json: "true" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || String(data.url || "").includes("error=")) throw new Error("Incorrect email or password.");
}

export async function signOut() {
  await fetch("/auth/signout", {
    method: "POST",
    credentials: "include",
    headers: formHeaders,
    body: new URLSearchParams({ csrfToken: await csrfToken(), callbackUrl: "/", json: "true" }),
  });
}

export async function getSession() {
  const res = await fetch("/auth/session", { credentials: "include" });
  const data = await res.json().catch(() => null);
  return data?.user ? data : null;
}

/** Starts the Google OAuth redirect flow (full-page navigation to Google, then back to /?oauth=1). */
export async function signInWithGoogle() {
  const res = await fetch("/auth/signin/google", {
    method: "POST",
    credentials: "include",
    headers: formHeaders,
    body: new URLSearchParams({ csrfToken: await csrfToken(), callbackUrl: "/?oauth=1", json: "true" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error("Could not start Google sign-in.");
  window.location.assign(data.url);
}
