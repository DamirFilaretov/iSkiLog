import { defineConfig } from "vitest/config"

/**
 * Database-level tests for the Groups security boundary.
 * Separate from `npm run test`, which is scoped to src/.
 */
export default defineConfig({
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/db/setup.ts"],
    // These share one database, and several assert on global catalogue state.
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000
  }
})
