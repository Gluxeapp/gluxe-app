import { defineConfig } from "drizzle-kit";

// Struttura del database e migrazioni. Le migrazioni si generano con `npm run db:genera`
// e si applicano con `npm run db:aggiorna`.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["app"],
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
