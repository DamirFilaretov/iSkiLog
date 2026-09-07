import { expect, type Page } from "@playwright/test"
import { fillByLabel } from "./form"

export function uniqueEmail(emailDomain: string) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
  return `qa+${stamp}@${emailDomain}`
}

export async function skipWelcome(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("iskilog:welcome-complete", "true")
    // The 10-step tutorial auto-starts once per fresh account and navigates to
    // "/", detaching any modal a spec is mid-way through. Mark it done up front.
    window.localStorage.setItem("iskilog:tutorial:completed", "true")
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
  await page.getByRole("checkbox", { name: /Agree to policy/i }).check()
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

export async function signUpThenLogin(
  page: Page,
  args: { emailDomain: string; password?: string; firstName?: string; lastName?: string }
) {
  const email = uniqueEmail(args.emailDomain)
  const password = args.password ?? "Qaauto123"

  await signUpUser(page, { email, password, firstName: args.firstName, lastName: args.lastName })

  const onAuthScreen = await page
    .getByText("Welcome back")
    .isVisible()
    .catch(() => false)

  if (onAuthScreen) {
    await loginUser(page, { email, password })
  }

  // New users always see the Welcome gate (a 4-slide intro, no Skip button).
  // Wait for it, then click through "Next" to the final "Get Started".
  const nextButton = page.getByRole("button", { name: /^Next$/ })
  const getStarted = page.getByRole("button", { name: /^Get Started$/ })
  const homeContent = page.getByText(/No sets logged yet|Season Total:|total training sets/i)
  const found = await Promise.race([
    nextButton.waitFor({ state: "visible", timeout: 10_000 }).then(() => "welcome" as const),
    getStarted.waitFor({ state: "visible", timeout: 10_000 }).then(() => "welcome" as const),
    homeContent.waitFor({ state: "visible", timeout: 10_000 }).then(() => "home" as const),
  ]).catch(() => "timeout" as const)

  if (found === "welcome") {
    for (let guard = 0; guard < 10; guard++) {
      if (!(await nextButton.isVisible().catch(() => false))) break
      await nextButton.click()
    }
    await getStarted.click()
  }

  await expectHomeLoaded(page)

  return { email, password }
}

export async function expectHomeLoaded(page: Page) {
  await expect(page.getByRole("heading", { name: "iSkiLog" })).toBeVisible()
  await expect(page.getByText(/No sets logged yet|Season Total:|total training sets/i)).toBeVisible()
}

export async function logoutUser(page: Page) {
  await page.getByRole("button", { name: "Settings" }).click()
  // Settings.tsx has no page heading — wait for its Log Out button instead.
  const logout = page.getByRole("button", { name: /^Log Out$/ })
  await expect(logout).toBeVisible()
  await logout.click()
  await expect(page.getByText("Welcome back")).toBeVisible()
}
