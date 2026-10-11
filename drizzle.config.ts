import { defineConfig } from "drizzle-kit";

// Struttura del database e migrazioni (dalla Fase 1).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
