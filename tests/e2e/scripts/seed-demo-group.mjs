import process from "node:process"
import dotenv from "dotenv"
import pg from "pg"

/**
 * Seeds one demo group with ~40 members and a spread of logged sets, so the
 * leaderboard can be looked at with real-looking data.
 *
 *   node tests/e2e/scripts/seed-demo-group.mjs ["Group name"]
 *
 * The current signed-in local user (the most recent non-@e2e.iskilog.test
 * account) is added as a member so the board is reachable and shows a "You"
 * row. The fake members use the @e2e.iskilog.test domain, so `npm run
 * e2e:db:cleanup` / `e2e:db:prepare` removes the whole demo.
 */

dotenv.config({ path: ".env.test" })

const DOMAIN = process.env.E2E_TEST_EMAIL_DOMAIN ?? "e2e.iskilog.test"
const GROUP_NAME = process.argv[2] ?? `Riverside Ski Club ${new Date().getFullYear()}`
const FAKE_COUNT = 39

const NAMES = [
  "Emma Lindqvist", "Mateo Rossi", "Aiko Tanaka", "Liam O'Brien", "Sofia Hernández",
  "Noah Andersen", "Priya Nair", "Lucas Meyer", "Chloe Dubois", "Diego Fernández",
  "Hannah Schmidt", "Yuki Nakamura", "Oliver Novak", "Amara Okafor", "Ethan Kowalski",
  "Isabella Conti", "Jonas Bergström", "Mei Lin", "Rafael Silva", "Freya Johansson",
  "Kai Petersen", "Nadia Haddad", "Thomas Weber", "Elena Popova", "Marcus Nilsson",
  "Sara Costa", "Viktor Ivanov", "Lucia Romano", "Daniel Cohen", "Anna Kowalczyk",
  "Hugo Martin", "Yara Nasser", "Felix Braun", "Camila Torres", "Erik Larsen",
  "Julia Nováková", "Omar Farouk", "Lena Vogel", "Tobias Hansen"
]

const EVENTS = ["slalom", "tricks", "jump", "other"]

// Deterministic PRNG so re-running gives the same board.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(42)
const randInt = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1))

function url() {
  const u = process.env.E2E_SUPABASE_DB_URL
  if (!u) throw new Error("Missing E2E_SUPABASE_DB_URL in .env.test")
  return u
}

/** A member's 30-day and last-7-day set counts, plus their favoured discipline. */
function plan(i) {
  const specialty = EVENTS[i % 4]
  let total30
  if (i < 4) total30 = randInt(18, 30)        // a few clear leaders
  else if (i >= FAKE_COUNT - 5) total30 = 0    // a handful with nothing
  else total30 = randInt(0, 14)               // the long mid tail
  const last7 = total30 === 0 ? 0 : Math.min(total30, randInt(0, Math.ceil(total30 * 0.4)))
  return { specialty, total30, last7 }
}

function pickEvent(specialty) {
  return rng() < 0.6 ? specialty : EVENTS[randInt(0, 3)]
}

const client = new pg.Client({ connectionString: url() })
await client.connect()

try {
  await client.query("begin")

  const me = await client.query(
    `select id from auth.users
      where email not like $1
      order by created_at desc limit 1`,
    [`%@${DOMAIN}`]
  )
  if (me.rows.length === 0) {
    throw new Error(
      "No local signed-in user found. Sign in to the app once, then re-run."
    )
  }
  const myId = me.rows[0].id

  // Idempotent: clear any previous run so re-seeding is safe.
  //   - the fake members (cascades their profiles / sets / memberships)
  //   - the demo group (cascades remaining memberships)
  //   - the real user's sets in the demo window, since they are re-added below
  await client.query(`delete from auth.users where email like 'demo-%@${DOMAIN}'`)
  await client.query("delete from public.groups where name like 'Riverside Ski Club%'")
  const wiped = await client.query(
    "delete from public.sets where user_id = $1 and date >= current_date - 29",
    [myId]
  )
  if (wiped.rowCount > 0) {
    console.log(`  (cleared ${wiped.rowCount} of your sets from the last 30 days to re-seed)`)
  }

  const group = await client.query(
    `insert into public.groups (name, description, created_by)
     values ($1, $2, $3) returning id`,
    [GROUP_NAME, "Weekly practice crew — slalom, tricks and jump.", myId]
  )
  const groupId = group.rows[0].id

  // The real user: a mid-table row with a clear discipline mix.
  await client.query(
    "insert into public.group_members (group_id, user_id) values ($1, $2) on conflict do nothing",
    [groupId, myId]
  )
  const mySets = [
    ["slalom", 1], ["slalom", 2], ["slalom", 4], ["tricks", 3], ["tricks", 9],
    ["jump", 5], ["slalom", 12], ["tricks", 15], ["jump", 18], ["other", 22]
  ]
  for (const [event, daysAgo] of mySets) {
    await client.query(
      "insert into public.sets (user_id, event_type, date) values ($1, $2, current_date - $3::int)",
      [myId, event, daysAgo]
    )
  }

  let totalSets = mySets.length

  for (let i = 0; i < FAKE_COUNT; i++) {
    const email = `demo-${String(i + 1).padStart(2, "0")}@${DOMAIN}`
    const u = await client.query(
      `insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at)
       values (extensions.gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
               'authenticated', 'authenticated', $1, now(), now(), now())
       returning id`,
      [email]
    )
    const uid = u.rows[0].id

    await client.query(
      "insert into public.profiles (user_id, full_name) values ($1, $2)",
      [uid, NAMES[i]]
    )
    await client.query(
      "insert into public.group_members (group_id, user_id) values ($1, $2)",
      [groupId, uid]
    )

    const p = plan(i)
    for (let s = 0; s < p.total30; s++) {
      const daysAgo = s < p.last7 ? randInt(0, 5) : randInt(6, 29)
      await client.query(
        "insert into public.sets (user_id, event_type, date) values ($1, $2, current_date - $3::int)",
        [uid, pickEvent(p.specialty), daysAgo]
      )
      totalSets++
    }
  }

  await client.query("commit")

  console.log(`\n  Group:   ${GROUP_NAME}`)
  console.log(`  Members: ${FAKE_COUNT + 1} (you + ${FAKE_COUNT})`)
  console.log(`  Sets:    ${totalSets} across the last 30 days`)
  console.log(`  Open:    /groups/${groupId}\n`)
} catch (error) {
  await client.query("rollback")
  throw error
} finally {
  await client.end()
}
