import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside a React server environment; tests run in plain Node.
      "server-only": fileURLToPath(new URL("./src/test/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test",
      ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      APP_URL: "http://localhost:3000",
    },
  },
});
