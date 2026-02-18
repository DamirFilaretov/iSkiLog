import { expect, type Locator, type Page } from "@playwright/test"

type Scope = Page | Locator

function labelSelector(label: string) {
  const safe = label.replace(/"/g, '\\"')
  return [
    `label:has-text("${safe}") + input`,
    `label:has-text("${safe}") + div input`,
    `label:has-text("${safe}") + textarea`,
    `label:has-text("${safe}") + div textarea`,
    `label:has-text("${safe}") + select`,
    `label:has-text("${safe}") + div select`
  ].join(", ")
}

export function controlByLabel(scope: Scope, label: string) {
  return scope.locator(labelSelector(label)).first()
}

export async function fillByLabel(scope: Scope, label: string, value: string) {
  const control = controlByLabel(scope, label)
  await expect(control, `Expected control for label '${label}' to be visible`).toBeVisible()
  await control.fill(value)
}
