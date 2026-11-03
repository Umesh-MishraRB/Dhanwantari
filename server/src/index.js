import mongoose from "mongoose";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";
import { warmUpMailer } from "./services/mailer.js";

async function main() {
  await connectDB();
  warmUpMailer(); // fire-and-forget
  const server = createApp().listen(env.port, () => console.log(`[server] http://localhost:${env.port}  (ML: ${env.mlMock ? "MOCK" : env.mlApiUrl})`));

  // Graceful shutdown so deploys / restarts do not cut uploads or DB writes in half.
  const stop = (sig) => {
    console.log(`[server] ${sig} received, shutting down`);
    server.close(async () => {
      await mongoose.disconnect().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));
}

process.on("unhandledRejection", (r) => console.error("[server] unhandled rejection:", r));
main().catch((err) => {
  console.error("Failed to start:", err.message);
  process.exit(1);
});
