import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Everything that hits the API goes through the dev proxy, so the Auth.js session cookie
// stays same-origin (no CORS / SameSite headaches in development).
const target = "http://localhost:5000";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target, xfwd: true },
      "/auth": { target, xfwd: true },
      "/uploads": { target },
    },
  },
});
