import { expect, type Page } from "@playwright/test"
import { fillByLabel } from "./form"

export function uniqueEmail(emailDomain: string) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
  return `qa+${stamp}@${emailDomain}`
}

export async function skipWelcome(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("iskilog:welcome-complete", "true")
  })
}

export async function openAuth(page: Page) {
  await page.goto("/")
  await expect(page.getByText("Welcome back")).toBeVisible()
}

export async function signUpUser(page: Page, args: { firstName?: string; lastName?: string; email: string; password: string }) {
  const firstName = args.firstName ?? "QA"
  const lastName = args.lastName ?? "Automation"

  await openAuth(page)
  await page.getByRole("button", { name: /^Sign up$/ }).last().click()
  await expect(page.getByText("Create account")).toBeVisible()

  await fillByLabel(page, "Name", firstName)
  await fillByLabel(page, "Last Name", lastName)
  await fillByLabel(page, "Email", args.email)
  await fillByLabel(page, "New Password", args.password)
  await page.getByRole("checkbox", { name: /Agree to policies/i }).check()
  await page.getByRole("button", { name: /^Sign up$/ }).first().click()

  // Depending on local Supabase auth config, sign-up can:
  // 1) Stay on auth screen with "Account created..." message, or
  // 2) Immediately create a session and navigate to Home.
  const accountCreated = page.getByText(/Account created/i)
  const homeHeading = page.getByRole("heading", { name: "iSkiLog" })

  try {
    await Promise.any([
      accountCreated.waitFor({ state: "visible", timeout: 15_000 }),
      homeHeading.waitFor({ state: "visible", timeout: 15_000 })
    ])
  } catch {
    await expect(accountCreated).toBeVisible()
  }
}

export async function loginUser(page: Page, args: { email: string; password: string }) {
  await openAuth(page)
  await fillByLabel(page, "Email", args.email)
  await fillByLabel(page, "Password", args.password)
  await page.getByRole("button", { name: /^Login$/ }).click()
  await expectHomeLoaded(page)
}

export async function signUpThenLogin(page: Page, args: { emailDomain: string; password?: string }) {
  const email = uniqueEmail(args.emailDomain)
  const password = args.password ?? "Qaauto123"

  await signUpUser(page, { email, password })

  const onAuthScreen = await page
    .getByText("Welcome back")
    .isVisible()
    .catch(() => false)

  if (onAuthScreen) {
    await loginUser(page, { email, password })
  } else {
    await expectHomeLoaded(page)
  }

  return { email, password }
}

export async function expectHomeLoaded(page: Page) {
  await expect(page.getByRole("heading", { name: "iSkiLog" })).toBeVisible()
  await expect(page.getByText(/No sets logged yet|Season Total:|total training sets/i)).toBeVisible()
}

export async function logoutUser(page: Page) {
  await page.getByRole("button", { name: "Settings" }).click()
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()
  await page.getByRole("button", { name: /^Log Out$/ }).click()
  await expect(page.getByText("Welcome back")).toBeVisible()
}
