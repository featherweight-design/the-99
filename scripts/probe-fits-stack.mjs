// probe:fits-stack — a card opened from inside Find a deck stacks OVER the picker.
//
// The picker names a combo partner in a deck's reason line, and that name opens the partner's card.
// It used to open BEHIND the picker: both are fixed at z-50, and the picker came later in the
// document, so it painted over the card the reader had just asked for. And closing that card closed
// the picker with it. The rule is the stand-ins sheet's: the card goes over the sheet, and Escape
// steps back to the sheet.
//
// jsdom paints nothing, so the unit tests can pin document order and nothing about what is on top.
// This reads it from the laid-out page at 1300x900 and 390x844, on /collection and on the card's
// set page: the element at the centre of the stacked card's dialog belongs to that dialog, and
// after Escape the picker is there and the card is not. The set page is walked because its grid
// closed any open card it did not draw, and a partner is off the grid by nature: the card opened
// and shut in one frame, which the pre-open pass found before any run did.
//
// It needs a card whose picker draws a combo reason, and finds one by query: an owned card that a
// two-card Spellbook variant pairs with a card sitting in one of the reader's decks. The page has
// the last word, since the picker's own rules decide which reasons it draws, so it tries up to
// eight candidates and FAILS when none of them draws a partner to press. Its one write is the
// About row `clearAboutSheet` sets for the account (every entry marked seen), which it leaves set.
// Needs a server with SWAP_TOOLS_ENABLED=true. Point it at `local-dev`.
//
//   PROBE_BASE=http://localhost:3019 node scripts/probe-fits-stack.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPage } from "./lib/surface.mjs";

neonConfig.webSocketConstructor = ws;

const {
  E2E_AUDIT_USER_EMAIL: EMAIL,
  DATABASE_URL,
} = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// A `+clerk_test` account signs in by email code and needs no password; any other needs one.
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const VIEWPORTS = [
  { width: 1300, height: 900 },
  { width: 390, height: 844 },
];

const pool = new Pool({ connectionString: DATABASE_URL });
let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " ok " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

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
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (e) {
        return String(e?.errors?.[0]?.longMessage ?? e);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(failure);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

/** Owned cards a two-card variant pairs with a card in one of the reader's decks. */
async function candidates(userId) {
  const { rows } = await pool.query(
    `select distinct cx.name as card, cy.name as partner
       from spellbook_variant_cards x
       join spellbook_variant_cards y on y.variant_id = x.variant_id and y.oracle_id <> x.oracle_id
       join (select variant_id from spellbook_variant_cards group by variant_id having count(*) = 2) v
         on v.variant_id = x.variant_id
       join collection_items ci on ci.user_id = $1 and ci.oracle_id = x.oracle_id
       join deck_cards dc on dc.oracle_id = y.oracle_id
       join decks d on d.id = dc.deck_id and d.user_id = $1
       join cards cx on cx.oracle_id = x.oracle_id
       join cards cy on cy.oracle_id = y.oracle_id
      where not exists (select 1 from deck_cards z where z.deck_id = d.id and z.oracle_id = x.oracle_id)
        and cx.name not like '%//%'
      order by cx.name
      limit 8`,
    [userId],
  );
  return rows;
}

/** A set the reader owns `card` in, for the set grid's walk. */
async function ownedSet(userId, card) {
  const { rows } = await pool.query(
    `select ci.set_code from collection_items ci
       join cards c on c.oracle_id = ci.oracle_id
      where ci.user_id = $1 and c.name = $2 order by ci.set_code limit 1`,
    [userId, card],
  );
  return rows[0]?.set_code ?? null;
}

/**
 * Opens `card` on a grid, presses Find a deck, and returns the partner trigger it draws. The
 * grid is /collection by default, or a set page (`/collection/sets/<code>`), whose grid used to
 * close any open card it did not draw: a partner is off that grid by nature.
 */
async function openPicker(page, card, partner, setCode = null) {
  const route = setCode
    ? `/collection/sets/${setCode}?q=${encodeURIComponent(card)}`
    : `/collection?view=grid&q=${encodeURIComponent(card)}`;
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  // A set cell names its card in its own label; a /collection tile is found by its art box.
  const tile = setCode
    ? onPage(page, `button[aria-label^="${card.replace(/"/g, '\\"')}"]`).first()
    : onPage(page, 'button:has(div[style*="aspect-ratio"])').first();
  if ((await tile.count()) === 0) return null;
  await tile.click();
  const door = page.getByRole("button", { name: `Find a deck for ${card}` }).first();
  try {
    await door.waitFor({ state: "visible", timeout: 8_000 });
  } catch {
    return null;
  }
  await door.click();
  const picker = page.getByTestId("fits-picker");
  await picker.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="fits-picker"] [role="status"]'),
    null,
    { timeout: 15_000 },
  );
  const trigger = picker.getByRole("button", { name: new RegExp(partner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first();
  return (await trigger.count()) > 0 ? trigger : null;
}

/** True when the element painted at the centre of the dialog naming `name` belongs to it. */
const onTop = (page, name) =>
  page.evaluate((cardName) => {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(
      (d) => !d.querySelector('[data-testid="fits-picker"]') && d.textContent.includes(cardName)
        && d.getBoundingClientRect().height > 0,
    );
    const top = dialogs.at(-1);
    if (!top) return { found: false };
    const r = top.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 120));
    return { found: true, onTop: top.contains(hit), hit: hit?.closest("[role=dialog]")?.getAttribute("data-testid") ?? hit?.tagName };
  }, name);

await clerkSetup();
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: VIEWPORTS[0] })).newPage();
  const userId = await signIn(page);
  // Or an account behind the About version is redirected to /about and no grid ever draws.
  await clearAboutSheet(page, userId);
  const pool8 = await candidates(userId);
  let fixture = null;
  for (const c of pool8) {
    if (await openPicker(page, c.card, c.partner)) {
      fixture = c;
      break;
    }
  }
  if (!fixture) throw new Error(`None of ${pool8.length} candidate(s) drew a combo partner in the picker.`);
  console.log(`fixture: ${fixture.card}, partner ${fixture.partner}`);

  const setCode = await ownedSet(userId, fixture.card);
  if (!setCode) throw new Error(`No owned printing of ${fixture.card} to find its set by.`);
  const walks = VIEWPORTS.flatMap((viewport) => [
    { viewport, setCode: null, where: "collection" },
    { viewport, setCode, where: `set ${setCode}` },
  ]);
  for (const { viewport, setCode: code, where } of walks) {
    await page.setViewportSize(viewport);
    const label = `${viewport.width} ${where}`;
    const trigger = await openPicker(page, fixture.card, fixture.partner, code);
    if (!trigger) {
      report(false, `${label}: picker draws ${fixture.partner}`);
      continue;
    }
    await trigger.click();
    const opened = await page
      .waitForFunction(
        (name) => [...document.querySelectorAll('[role="dialog"]')].some(
          (d) => !d.querySelector('[data-testid="fits-picker"]') && d.textContent.includes(name),
        ),
        fixture.partner,
        { timeout: 10_000 },
      )
      .then(() => true, () => false);
    // A card the page shuts the instant it opens never reaches the checks below.
    report(opened, `${label}: ${fixture.partner} opens and stays open`);
    if (!opened) continue;
    await page.waitForTimeout(300);
    const read = await onTop(page, fixture.partner);
    report(read.found && read.onTop, `${label}: ${fixture.partner} paints over the picker`, `hit ${read.hit}`);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const pickerUp = await page.getByTestId("fits-picker").isVisible();
    const cardGone = !(await onTop(page, fixture.partner)).found;
    report(pickerUp && cardGone, `${label}: Escape steps back to the picker`, `picker ${pickerUp ? "open" : "gone"}, card ${cardGone ? "closed" : "still open"}`);
  }
} catch (e) {
  failures += 1;
  console.log(`FAIL  run aborted — ${e?.stack ?? e}`);
} finally {
  await browser.close();
  await pool.end();
}
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
