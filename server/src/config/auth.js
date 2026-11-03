import Credentials from "@auth/core/providers/credentials";
import Google from "@auth/core/providers/google";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { env } from "./env.js";

/**
 * Auth.js (via @auth/express) configuration.
 * - Credentials provider (email + password), JWT sessions stored in an httpOnly cookie.
 * - Google provider (only enabled when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set).
 *   Existing accounts are matched by verified Google e-mail; first-time Google users finish onboarding in the app
 *   (choose patient / doctor, doctors add specialization + licence) before the account is created.
 * - The application role (patient | doctor) lives on the User document and is copied
 *   into the JWT and the session so route guards can read it without a DB hit.
 */
export const googleEnabled = Boolean(env.google.clientId && env.google.clientSecret);

export const authConfig = {
  secret: env.authSecret,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/", error: "/" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email || "").toLowerCase().trim();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        const user = await User.findOne({ email }).select("+passwordHash");
        if (!user || !user.isActive || !user.passwordHash) return null; // Google-only accounts have no password

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
      },
    }),
    ...(googleEnabled
      ? [Google({ clientId: env.google.clientId, clientSecret: env.google.clientSecret })]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      try {
        // Only trust Google e-mails that Google itself has verified (prevents account takeover by e-mail).
        if (!profile?.email || profile.email_verified !== true) return "/?error=GoogleUnverified";
        const email = profile.email.toLowerCase().trim();

        const existing = await User.findOne({ email });
        if (existing) {
          if (!existing.isActive) return false;
          if (existing.googleId && existing.googleId !== profile.sub) return false;
          if (!existing.googleId) {
            existing.googleId = profile.sub;
            if (!existing.avatarUrl && profile.picture) existing.avatarUrl = profile.picture;
            await existing.save();
          }
        }
        // No account yet: do NOT create one here. The session is "pending" and the app asks the person
        // to choose patient / doctor and complete the profile (POST /api/google/complete).
        return true;
      } catch (err) {
        console.error("[auth] Google sign-in failed:", err);
        return false;
      }
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google") {
        const dbUser = await User.findOne({ email: profile.email.toLowerCase().trim() });
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.pending = false;
        } else {
          token.pending = true; // verified Google identity without an app account yet
        }
      } else if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.pending = Boolean(token.pending && !token.id);
      return session;
    },
  },
};
