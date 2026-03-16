import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { sentryVitePlugin } from "@sentry/vite-plugin"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const hasSentryUploadConfig = Boolean(
    env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT
  )

  return {
    build: {
      sourcemap: "hidden"
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(hasSentryUploadConfig
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              authToken: env.SENTRY_AUTH_TOKEN,
              telemetry: false,
              sourcemaps: {
                filesToDeleteAfterUpload: ["./dist/**/*.map"]
              }
            })
          ]
        : [])
    ]
  }
})
