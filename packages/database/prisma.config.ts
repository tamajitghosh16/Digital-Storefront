import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// CLI/migrate connection. Uses the direct (non-pooled) URL because
// Supavisor's transaction pooler (DATABASE_URL, port 6543) doesn't support
// the prepared statements migrations need — see root CLAUDE.md.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
