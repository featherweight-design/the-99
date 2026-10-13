// The one-suggestion precon notice is laid out as drawn (bug batch D item 2, Hugh 2026-10-13), walked in a
// real browser at 390x844 and 1300x900.
//
// The ✕ is pinned in the band's top-right corner; the text and `Link it` share ONE row (text left, flexible and
// wrapping; the button right, centred on it), and the row's right padding keeps both clear of the ✕'s column. The
// notice must also be shorter than the two-row layout it replaced (BEFORE_HEIGHT, measured on main).
// JSDOM has no layout, so the unit test pins the classes and this reads the boxes.
//
// It needs a precon that the shared rule suggests for a deck, and local-dev holds no precon catalog, so it
// writes one: a fixture deck (a commander and 30 other non-basic cards) and a fixture precon with exactly
// that list, under the account it signs in as, both deleted in a `finally`. Point it at `local-dev`, never
// production or staging (it checks the branch). Needs PRECONS_ENABLED=true in the server's environment.
//
// Start the server FRESH for the run and stop it after: `loadPreconCatalog` memoizes the catalog for ten minutes
// per server, keyed on a catalog generation this fixture does not move, so a server that already read the catalog
// never shows the fixture row, and one that reads it during the run keeps showing it after the cleanup.
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
// The band's height on main (Link it on its own row), measured by this probe at each width.
const BEFORE_HEIGHT = { phone: 128.1, desktop: 108.3 };

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
    await link.waitFor({ timeout: 30_000 }).catch(() => {
      throw new Error("no precon notice drew: restart the dev server so its ten-minute precon catalog memo is empty, then run again");
    });
    const close = onPage(page, 'button[aria-label^="Dismiss the suggestion"]').first();
    const m = await page.evaluate(
      ([l, c]) => {
        const band = l.closest('div[style*="surface-rail"]');
        const box = (e) => e.getBoundingClientRect();
        const text = l.parentElement.firstElementChild;
        const bandBox = box(band);
        return {
          band: { top: bandBox.top, right: bandBox.right, height: bandBox.height },
          close: { top: box(c).top, right: box(c).right, left: box(c).left },
          link: { left: box(l).left, right: box(l).right, top: box(l).top, bottom: box(l).bottom },
          text: { top: box(text).top, bottom: box(text).bottom, textRight: [...text.querySelectorAll("p")].map((p) => {
            const r = document.createRange(); r.selectNodeContents(p); return r.getBoundingClientRect().right;
          }) },
        };
      },
      [await link.elementHandle(), await close.elementHandle()],
    );
    // The offsets the classes name: right 4 / top 2 on the phone, right 22 / top 4 from md up.
    const want = w.name === "phone" ? { right: 4, top: 2 } : { right: 22, top: 4 };
    const right = m.band.right - m.close.right;
    const top = m.close.top - m.band.top;
    check(Math.abs(right - want.right) <= 1 && Math.abs(top - want.top) <= 1, `${w.name}: the ✕ sits ${want.right}px from the band's right edge and ${want.top}px from its top`, `${right.toFixed(1)}px from the right, ${top.toFixed(1)}px from the top`);
    const sameRow = m.link.top >= m.text.top - 0.5 && m.link.top <= m.text.bottom;
    check(sameRow, `${w.name}: Link it's top lies within the text block's height`, `link top ${m.link.top.toFixed(0)}, text ${m.text.top.toFixed(0)}-${m.text.bottom.toFixed(0)}`);
    const dy = Math.abs((m.link.top + m.link.bottom) / 2 - (m.text.top + m.text.bottom) / 2);
    check(dy <= 2, `${w.name}: Link it is vertically centred on the text`, `${dy.toFixed(1)}px off`);
    check(m.text.textRight.every((r) => r <= m.link.left + 0.5), `${w.name}: the text does not overlap Link it`, `text ends ${Math.max(...m.text.textRight).toFixed(0)}, button starts ${m.link.left.toFixed(0)}`);
    check(m.link.right <= m.close.left + 0.5, `${w.name}: Link it stops before the ✕'s column`, `button ends ${m.link.right.toFixed(0)}, ✕ starts ${m.close.left.toFixed(0)}`);
    check(m.text.textRight.every((r) => r <= m.close.left + 0.5), `${w.name}: the text stops before the ✕'s column`, `text ends ${Math.max(...m.text.textRight).toFixed(0)}, ✕ starts ${m.close.left.toFixed(0)}`);
    console.log(`${w.name}: band height ${m.band.height.toFixed(1)}px (main: ${BEFORE_HEIGHT[w.name]}px)`);
    check(m.band.height < BEFORE_HEIGHT[w.name], `${w.name}: the notice is shorter than the two-row layout`, `${m.band.height.toFixed(1)}px against ${BEFORE_HEIGHT[w.name]}px`);
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
