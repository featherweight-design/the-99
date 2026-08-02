import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    // Mirrors the `@/*` path in tsconfig.json. Components mix relative and aliased imports,
    // and Vitest reads neither tsconfig nor the Next.js resolver on its own.
    // Anchored regex rather than the bare string "@": that key would also swallow
    // scoped packages such as @clerk/nextjs and @testing-library/react.
    alias: [{ find: /^@\//, replacement: `${fileURLToPath(new URL("./src", import.meta.url))}/` }],
  },
});
