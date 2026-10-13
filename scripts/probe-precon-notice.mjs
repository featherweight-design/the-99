// The one-suggestion precon notice is laid out as drawn (bug batch D item 2, Hugh 2026-10-13), walked in a
// real browser at 390x844 and 1300x900.
//
// The ✕ is pinned in the band's top-right corner, `Link it` is flush with the band's right padding edge
// on a line of its own, and the text keeps the width less the ✕'s column (it never runs under the ✕).
// JSDOM has no layout, so the unit test pins the classes and this reads the boxes.
//
// It needs a precon that the shared rule suggests for a deck, and local-dev holds no precon catalog, so it
// writes one: a fixture deck (a commander and 30 other non-basic cards) and a fixture precon with exactly
// that list, under the account it signs in as, both deleted in a `finally`. Point it at `local-dev`, never
// production or staging (it checks the branch). Needs PRECONS_ENABLED=true in the server's environment.
//
//   PRECONS_ENABLED=true pnpm dev   (another shell)
//   PROBE_BASE=http://localhost:3000 node scripts/probe-precon-notice.mjs
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";
const FILE = "probe-precon-notice.json";

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1300, height: 900 },
];

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
          if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  return page.evaluate(() => window.Clerk.user.id);
}

let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};

let deckId = null;
async function cleanup() {
  await sql`delete from precons where file_name = ${FILE}`;
  if (deckId) await sql`delete from decks where id = ${deckId}`;
}

await clerkSetup();
const [{ id: branch }] = await sql`select current_setting('neon.branch_id', true) as id`;
if (!branch || branch === PRODUCTION || branch === STAGING) {
  throw new Error(`refusing to write a fixture to ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev`);
}
const browser = await chromium.launch();
try {
  const probeContext = await browser.newContext();
  const probePage = await probeContext.newPage();
  const userId = await signIn(probePage);
  await probeContext.close();

  const cards = await sql`
    select oracle_id from cards
    where commander_legal and type_line not like 'Basic%' and type_line not like '%//%'
    order by name limit 31`;
  if (cards.length < 31) throw new Error("the catalog holds too few cards for the fixture");
  const [lead, ...rest] = cards;
  const [deck] = await sql`
    insert into decks (user_id, name, commander_oracle_id) values (${userId}, 'probe:precon-notice', ${lead.oracle_id}) returning id`;
  deckId = deck.id;
  for (const c of rest) await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}, ${c.oracle_id}, 1)`;
  await sql`insert into precons (file_name, name, set_code, release_date) values (${FILE}, 'Probe Notice', 'PRB', '2026-01-01')`;
  await sql`insert into precon_cards (file_name, position, oracle_id, quantity, is_commander) values (${FILE}, 0, ${lead.oracle_id}, 1, true)`;
  for (const [i, c] of rest.entries()) {
    await sql`insert into precon_cards (file_name, position, oracle_id, quantity, is_commander) values (${FILE}, ${i + 1}, ${c.oracle_id}, 1, false)`;
  }

  for (const w of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width: w.width, height: w.height },
      hasTouch: w.name === "phone",
      isMobile: w.name === "phone",
    });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
    const link = onPage(page, 'button:has-text("Link it")').first();
    await link.waitFor({ timeout: 30_000 });
    const close = onPage(page, 'button[aria-label^="Dismiss the suggestion"]').first();
    const m = await page.evaluate(
      ([l, c]) => {
        const band = l.closest('div[style*="surface-rail"]');
        const box = (e) => e.getBoundingClientRect();
        const text = l.parentElement.firstElementChild;
        const bandBox = box(band);
        const pad = parseFloat(getComputedStyle(band).paddingRight);
        return {
          band: { top: bandBox.top, right: bandBox.right },
          pad,
          close: { top: box(c).top, right: box(c).right, left: box(c).left, bottom: box(c).bottom },
          link: { right: box(l).right, top: box(l).top },
          text: { right: box(text).right, textRight: [...text.querySelectorAll("p")].map((p) => {
            const r = document.createRange(); r.selectNodeContents(p); return r.getBoundingClientRect().right;
          }) },
        };
      },
      [await link.elementHandle(), await close.elementHandle()],
    );
    check(m.band.right - m.close.right <= 24 && m.close.top - m.band.top <= 8, `${w.name}: the ✕ sits in the band's top-right corner`, `${(m.band.right - m.close.right).toFixed(0)}px from the right, ${(m.close.top - m.band.top).toFixed(0)}px from the top`);
    check(Math.abs(m.band.right - m.pad - m.link.right) <= 1, `${w.name}: Link it is flush with the band's right padding edge`, `${(m.band.right - m.pad - m.link.right).toFixed(1)}px short`);
    check(m.link.top >= m.close.bottom, `${w.name}: Link it clears the ✕ below it`, `link top ${m.link.top.toFixed(0)}, ✕ bottom ${m.close.bottom.toFixed(0)}`);
    check(m.text.textRight.every((r) => r <= m.close.left + 0.5), `${w.name}: the text stops before the ✕'s column`, `text ends ${Math.max(...m.text.textRight).toFixed(0)}, ✕ starts ${m.close.left.toFixed(0)}`);
    await context.close();
  }
} finally {
  await cleanup();
  await browser.close();
}
if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
