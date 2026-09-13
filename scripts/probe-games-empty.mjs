// Gate for the Games tab's empty state, at both breakpoints, against a real
// database. Three rulings live here that no unit test in this repository can
// settle, because each is a fact about laid-out geometry rather than markup:
//
//   1. THE DESKTOP GROUP IS CENTRED. `justify-content: center` alone proves
//      nothing — the content column has to have a ceiling for there to be any
//      free space to distribute. And equal gaps either side prove nothing
//      either: with the column unconstrained the group spans the section edge
//      to edge, so both gaps read as the section's own padding and look
//      perfectly symmetric while centring nothing. The discriminators are the
//      column's width and the computed `justify-content`, which is why this
//      script asserts on those and reports the gaps as evidence rather than as
//      the test.
//   2. THE MARK IS TOP-ALIGNED, IN BOTH STATES. The card-fan mark sits level
//      with the top of the content column whether the form is collapsed or
//      open. Collapsed, the old `align-items: center` was 36px out and easy to
//      miss; with the form open it was 442px out, which is the defect that was
//      reported. Only the expanded state makes the ruling obvious, so the probe
//      measures both.
//   3. THE SCOPE NOTE IS GONE, from both widths and both states.
//
// It also holds the phone to its block layout — mark ABOVE the column, not
// beside it — because this is a `md:`-only change and the parity that matters
// is that 390px did not move.
//
// THE FIXTURE IS THIS SCRIPT'S OWN. A deck page the signed-in player does not
// own is a 404, so a run pointed at someone else's deck would report every
// surface absent and make a working feature look dead. It creates one deck with
// no games under the account it signs in as, and deletes it in a `finally`.
//
// Point it at `local-dev` or a scratch Neon branch — NEVER production. It writes.
//
// Run by hand, with a dev server up:
//   node scripts/probe-games-empty.mjs
// PROBE_BASE selects the server; it defaults to the dev server's own port.
// Not part of `pnpm test`: it needs a browser, a signed-in session and a database.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";

neonConfig.webSocketConstructor = ws;

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, wide: true },
  { name: "phone", width: 390, height: 844, wide: false },
];
const SCOPE_NOTE = "This tab tells you what is letting the deck down";
// The content column's ceiling, and the cap the component sets. A probe that
// read the number off the element would agree with any value it found.
const COLUMN_MAX = 720;

const failures = [];
const check = (label, ok, detail) => {
  if (!ok) failures.push(`${label} — ${detail}`);
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok ? "" : ` — ${detail}`}`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test")
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor?.emailAddressId,
          });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

await clerkSetup();
const pool = new Pool({ connectionString: DATABASE_URL });
const browser = await chromium.launch();
let deckId = null;

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const userId = await signIn(page);

    if (!deckId) {
      // Any legendary creature will do: the commander is a not-null foreign key
      // and nothing this probe measures depends on which one it is.
      const commander = await pool.query(
        `select oracle_id from cards where type_line ilike '%Legendary Creature%' limit 1`,
      );
      if (commander.rowCount === 0) throw new Error("No legendary creature in `cards` — seed first.");
      const { rows } = await pool.query(
        `insert into decks (user_id, name, commander_oracle_id) values ($1, $2, $3) returning id`,
        [userId, "Probe · games empty state", commander.rows[0].oracle_id],
      );
      deckId = rows[0].id;
    }

    // The Games tab is client state, not a URL parameter, so the probe presses it.
    await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /^Games/ }).click({ timeout: 60_000 });
    const heading = page.getByRole("heading", { name: "Three games is a pattern." });
    await heading.waitFor({ timeout: 30_000 });

    const section = page.locator("section").filter({ has: heading }).last();
    // Two direct div children, in order: the card-fan mark, then the content
    // column. Anchored by position rather than by `aria-hidden`, which both the
    // mark and elements inside the column carry.
    const mark = section.locator("> div").nth(0);
    const column = section.locator("> div").nth(1);

    const measure = async () => {
      const [s, m, c] = await Promise.all([
        section.boundingBox(),
        mark.boundingBox(),
        column.boundingBox(),
      ]);
      const style = await section.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { align: cs.alignItems, justify: cs.justifyContent };
      });
      return { s, m, c, ...style };
    };

    for (const state of ["collapsed", "form open"]) {
      if (state === "form open") {
        await page.getByRole("button", { name: "Log your first game" }).click();
        await page.getByRole("heading", { name: "Log a game" }).waitFor({ timeout: 30_000 });
      }
      const { s, m, c, align, justify } = await measure();
      const where = `${vp.name} · ${state}`;

      if (vp.wide) {
        check(`${where}: mark top-aligned with the column`, Math.abs(m.y - c.y) <= 1,
          `mark ${m.y.toFixed(1)} vs column ${c.y.toFixed(1)}`);
        check(`${where}: align-items is flex-start`, align === "flex-start", `got ${align}`);
        check(`${where}: justify-content is center`, justify === "center", `got ${justify}`);
        // The ceiling is the half that makes the centring real. Without it the
        // column fills the section and the gaps below are symmetric anyway.
        check(`${where}: column is capped at ${COLUMN_MAX}`, Math.round(c.width) === COLUMN_MAX,
          `got ${c.width.toFixed(1)}`);
        const left = Math.min(m.x, c.x) - s.x;
        const right = s.x + s.width - Math.max(m.x + m.width, c.x + c.width);
        check(`${where}: group centred in the section`, Math.abs(left - right) <= 1,
          `left ${left.toFixed(1)} vs right ${right.toFixed(1)}`);
        check(`${where}: the centring has room to happen`, left > 100,
          `only ${left.toFixed(1)}px either side — the column is filling the tab`);
      } else {
        // Block layout: the mark stacks ABOVE the column rather than beside it.
        check(`${where}: mark stacks above the column`, m.y + m.height <= c.y + 1,
          `mark ends ${(m.y + m.height).toFixed(1)}, column starts ${c.y.toFixed(1)}`);
      }

      check(`${where}: no scope note`, (await page.getByText(SCOPE_NOTE).count()) === 0,
        "the scope note is on the page");
    }
    await context.close();
  }
} finally {
  if (deckId) await pool.query(`delete from decks where id = $1`, [deckId]);
  await browser.close();
  await pool.end();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nAll checks passed.");
