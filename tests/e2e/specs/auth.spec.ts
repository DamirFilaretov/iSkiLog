import { test, expect } from "@playwright/test"
import { expectHomeLoaded, loginUser, logoutUser, signUpThenLogin, skipWelcome } from "../utils/auth"

test.beforeEach(async ({ page }) => {
  await skipWelcome(page)
})

test("flow 1: sign up and first login shows empty state", async ({ page }) => {
  await signUpThenLogin(page, { emailDomain: process.env.E2E_TEST_EMAIL_DOMAIN ?? "e2e.iskilog.test" })

  await expect(page.getByText("No sets logged yet")).toBeVisible()
  await expect(page.getByText("Quick Add")).toBeVisible()
})

test("flow 2: login and logout blocks protected pages", async ({ page }) => {
  const creds = await signUpThenLogin(page, { emailDomain: process.env.E2E_TEST_EMAIL_DOMAIN ?? "e2e.iskilog.test" })

  await logoutUser(page)
  await page.goto("/history")
  await expect(page.getByText("Welcome back")).toBeVisible()

  await loginUser(page, creds)
  await expectHomeLoaded(page)
})

test("flow 10: refresh keeps session and data hydration completes", async ({ page }) => {
  await signUpThenLogin(page, { emailDomain: process.env.E2E_TEST_EMAIL_DOMAIN ?? "e2e.iskilog.test" })

  await page.reload()

  await expectHomeLoaded(page)
  await expect(page.getByText("Welcome back")).toHaveCount(0)
})
