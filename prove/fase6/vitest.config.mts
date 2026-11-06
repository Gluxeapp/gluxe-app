import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)), "server-only": fileURLToPath(new URL("./vuoto.ts", import.meta.url)) } },
  test: { include: ["prove/fase6/**/*.prova.ts"], testTimeout: 120000 },
});
