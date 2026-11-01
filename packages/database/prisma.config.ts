import "dotenv/config";
import { defineConfig } from "prisma/config";

// CLI/migrate connection. Uses the direct (non-pooled) URL because
// Supavisor's transaction pooler (DATABASE_URL, port 6543) doesn't support
// the prepared statements migrations need — see root CLAUDE.md.
//
// Read with process.env rather than Prisma's env(), which throws when the
// variable is unset: `prisma generate` runs on every `npm install`
// (postinstall) and never connects, so a build without DIRECT_URL — a Vercel
// preview, CI — must still get a client. Commands that do connect (migrate,
// studio) fail on their own when it's missing.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
