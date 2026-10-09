import { defineConfig } from "drizzle-kit";

// Tabel dibuat otomatis oleh lib/db.ts; config ini untuk drizzle-kit (studio / generate).
export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_PATH || "data/talentlink.db" },
});
