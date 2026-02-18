import { cleanupTestData } from "./scripts/_db.mjs"

export default async function globalTeardown() {
  await cleanupTestData()
}
