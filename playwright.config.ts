import { defineConfig, devices } from "@playwright/test"
import dotenv from "dotenv"

dotenv.config({ path: ".env.test" })

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173"

export default defineConfig({
  testDir: "./tests/e2e/specs",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 900 }
  },
  webServer: {
    // `--mode test` makes Vite load `.env.test` (local Docker Supabase) and
    // ignore `.env.local` (the hosted project). Without it the browser drives
    // the app against production while every DB helper points at Docker.
    command: "npm run dev -- --mode test --host 127.0.0.1 --port 4173",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  globalSetup: "./tests/e2e/global.setup.ts",
  globalTeardown: "./tests/e2e/global.teardown.ts",
  projects: [
    {
      name: "chromium",
      testIgnore: /groups\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      // The Groups leaderboard row layout is driven by a 360px constraint and
      // browser zoom is disabled app-wide — so the Groups spec runs only here.
      name: "mobile",
      testMatch: /groups\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 } }
    }
  ],
  outputDir: "test-results/playwright"
})
