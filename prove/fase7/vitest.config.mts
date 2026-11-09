import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)), "server-only": fileURLToPath(new URL("../fase6/vuoto.ts", import.meta.url)) } },
  test: { include: ["prove/fase7/**/*.prova.ts"], testTimeout: 120000 },
});
