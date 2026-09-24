// The Analysis tab's Overview, measured in a real browser at 1300x900 and 390x844.
//
// WHY A BROWSER. Its rulings are layout, and one grid restyled at `md:` leaves identical markup
// whichever way it lays out: the overview heads the left column at 1300 with the climb under it
// and the box spanning both rows beside them, and leads the tab on the phone, box then climb
// after it. It is ONE mount, so the probe counts visible copies rather than trusting the markup.
// The modal is 700px wide at 1300, and a card named in it previews ABOVE the sheet, which is a
// stacking fact jsdom has no model of.
//
// IT REACHES EVERYTHING BY A PRESS: Analysis is client state with no address, the reading comes
// from pressing Analyze, and the overview from pressing `Write one` — the Overview's own control
// (ruling A). So the deck must have NO overview when the run starts; it picks the first deck on
// the account that has none, and fails when none of the first twelve qualifies.
//
// THE MODEL IS THE STUB, and the probe asserts it: the row it wrote must say `model = 'stub'`. A
// server started with `SYNOPSIS_LIVE=1` would spend a real call here, and a run that did so is
// reported as a failure rather than a pass. Start the server without it.
//
// WRITES, all undone in the `finally`: the walked deck's `deck_profiles` row is held on disk and
// put back (`profile-hold.mjs`); the overview it writes and the ledger row that paid for it are
// deleted, so a run neither leaves an overview behind nor spends the account's credit; and the
// About row `probe:verdict-block` writes. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3010 node scripts/probe-synopsis-ui.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { holdProfile } from "./lib/profile-hold.mjs";
import { onPage, onPageRole, PAGE } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);

const DESKTOP = { width: 1300, height: 900 };
const PHONE = { width: 390, height: 844 };

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
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
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  // The About gate, cleared as `probe:verdict-block` clears it; see that file for why.
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  const userId = await page.evaluate(() => window.Clerk.user.id);
  await sql`
    insert into user_prefs (user_id, about_version_seen) values (${userId}, ${version})
    on conflict (user_id) do update
      set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  return userId;
}

async function deckHrefs(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  return page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...new Set([...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.split("/").length === 3 && !["new", "import"].includes(h.split("/")[2])))];
  }, PAGE);
}

/** The deck page, its Analysis tab pressed. Waits for the Overview slot or the empty state. */
async function openAnalysis(page, href) {
  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 });
  await page.waitForTimeout(500);
  await onPageRole(page, "tab", /analysis/i).first().click();
}

const visibleOverviews = (page) =>
  page.evaluate(() => [...document.querySelectorAll('[data-testid="synopsis-overview"]')]
    .filter((e) => e.getBoundingClientRect().width > 0).length);

/** The three cells' rects: the overview, the verdict box and the climb. */
const cells = (page) =>
  page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) };
    };
    return {
      overview: rect(document.querySelector('[data-testid="synopsis-overview"]')),
      box: rect(document.querySelector('[data-testid="verdict-cell"]')),
      climb: rect(document.querySelector('[data-testid="climb-cell"]')),
    };
  });

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  const holds = [];
  /** The walked deck, which held no overview when the run began: every row on it is this run's. */
  let walked = null;
  try {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await signIn(page);

    // A deck with no overview at all, so `Write one` is what the tab offers.
    let href = null;
    for (const candidate of (await deckHrefs(page)).slice(0, 12)) {
      const [{ n }] = await sql`select count(*)::int as n from deck_synopses where deck_id = ${candidate.split("/")[2]}::uuid`;
      if (n === 0) { href = candidate; break; }
    }
    if (!report("a deck with no overview", href !== null, href ?? "every one of the first 12 decks has one")) return;
    const deckId = href.split("/")[2];
    walked = deckId;
    holds.push(await holdProfile(sql, deckId));
    await sql`delete from deck_profiles where deck_id = ${deckId}::uuid`;
    console.log(`       (walking ${href})`);

    // Before a reading: no Overview, and no space for one (§6.2).
    await openAnalysis(page, href);
    await page.waitForTimeout(800);
    report("1300px · no overview before a reading", (await visibleOverviews(page)) === 0, `${await visibleOverviews(page)} drawn`);

    // The reading, by a press. The Overview arrives with it, offering `Write one`.
    await onPageRole(page, "button", /^Analyze$/).first().click();
    await page.waitForSelector(`${PAGE} [data-testid="findings-block"]`, { timeout: 30_000 });
    const writeOne = onPage(page, '[data-testid="synopsis-overview"]').getByRole("button", { name: "Write one" });
    await writeOne.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
    // The Overview is read before the reading settles and again after it: wait for the second
    // answer, which is the one that enables the press, before reading what it says.
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('[data-testid="synopsis-overview"] button')].find((e) => e.textContent === "Write one");
      return b && !b.disabled;
    }, null, { timeout: 15_000 }).catch(() => {});
    if (!report("1300px · Write one is offered over the fresh reading", (await writeOne.count()) === 1, `${await writeOne.count()} found`)) return;
    // Read AT the moment the press enables, never after a wait: an enabled press with no note
    // beside it is the defect this check found, a state read for the reading before.
    const note = await onPage(page, '[data-testid="synopsis-overview"]').innerText();
    report("1300px · the press names the credit it spends", /Uses a credit/.test(note), note.replace(/\s+/g, " ").slice(0, 120));

    // The write, by the Overview's own press.
    await writeOne.click();
    const entry = onPage(page, '[data-testid="synopsis-overview"]').getByRole("button", { name: /View full overview/ });
    await entry.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    const rows = await sql`select id, model, status, model_call_id from deck_synopses where deck_id = ${deckId}::uuid`;
    report("the write stored one finished run", rows.length === 1 && rows[0].status === "done", JSON.stringify(rows.map((r) => r.status)));
    report("the model was the stub", rows.every((r) => r.model === "stub"),
      `${rows.map((r) => r.model).join(", ")} — restart the server without SYNOPSIS_LIVE`);
    if (!report("1300px · the overview is drawn, with its entry point", (await entry.count()) === 1, `${await entry.count()} entry points`)) return;
    const marks = await onPage(page, '[data-testid="synopsis-overview"] p').first().innerText();
    report("1300px · no raw [[mark]] reaches the reader", !marks.includes("[["), marks.slice(0, 100));

    // 1300: the overview heads the left column, the climb under it, the box beside both.
    const d = await cells(page);
    report("1300px · drawn once", (await visibleOverviews(page)) === 1, `${await visibleOverviews(page)} visible`);
    report("1300px · the overview heads the left column, over the climb",
      d.overview && d.climb && Math.abs(d.overview.left - d.climb.left) <= 1 && d.overview.bottom <= d.climb.top,
      `overview ${JSON.stringify(d.overview)}, climb ${JSON.stringify(d.climb)}`);
    report("1300px · the box sits beside it, level with its top",
      d.box && d.box.left >= d.overview.right && Math.abs(d.box.top - d.overview.top) <= 2,
      `box ${JSON.stringify(d.box)}`);
    report("1300px · the gap to the climb is the row gap, not the box's slack",
      d.climb.top - d.overview.bottom <= 40, `${d.climb.top - d.overview.bottom}px`);

    // The modal: 700 wide, four sections, and a card preview above it.
    await entry.click();
    const modal = page.locator('[data-testid="receipt-modal"]');
    await modal.waitFor({ state: "visible", timeout: 10_000 });
    const m = await modal.evaluate((el) => ({
      width: Math.round(el.getBoundingClientRect().width),
      headings: [...el.querySelectorAll("h3")].map((h) => h.textContent),
    }));
    report("1300px · the modal is 700 wide", m.width === 700, `${m.width}px`);
    report("1300px · four sections, in order",
      m.headings.join("|").toLowerCase() === "overview|primer|key cards|weaknesses", m.headings.join(" | "));
    const names = modal.locator('[data-testid="synopsis-card"]');
    if (report("1300px · the card names in the modal are live", (await names.count()) > 0, `${await names.count()}`)) {
      // Hover names until one previews: a card the catalog has no picture for opens no box, by
      // design, and nothing in the DOM says which names have art.
      for (let i = 0; i < Math.min(8, await names.count()); i += 1) {
        await names.nth(i).hover();
        await page.waitForTimeout(400);
        if (await page.locator('[data-testid="hover-preview"]').count()) break;
      }
      const z = await page.evaluate(() => {
        const box = document.querySelector('[data-testid="hover-preview"]');
        const sheet = document.querySelector('[data-testid="receipt-modal"]')?.closest(".fixed");
        return box ? { box: Number(getComputedStyle(box).zIndex), sheet: Number(getComputedStyle(sheet).zIndex) } : null;
      });
      report("1300px · the preview paints above the sheet", z !== null && z.box > z.sheet,
        z ? `preview z ${z.box}, sheet z ${z.sheet}` : "no preview (the card may have no art)");
    }
    await page.keyboard.press("Escape");
    await ctx.close();

    // 390: one column, overview first, then the box, then the climb.
    const phone = await browser.newContext({ viewport: PHONE });
    const p = await phone.newPage();
    await signIn(p);
    await openAnalysis(p, href);
    await p.waitForSelector(`${PAGE} [data-testid="synopsis-overview"]`, { timeout: 20_000 }).catch(() => {});
    const q = await cells(p);
    report("390px · drawn once", (await visibleOverviews(p)) === 1, `${await visibleOverviews(p)} visible`);
    report("390px · overview, then box, then climb",
      q.overview && q.box && q.climb && q.overview.bottom <= q.box.top && q.box.bottom <= q.climb.top,
      `overview ${q.overview?.top}-${q.overview?.bottom}, box ${q.box?.top}-${q.box?.bottom}, climb ${q.climb?.top}`);
    const phoneEntry = onPage(p, '[data-testid="synopsis-overview"]').getByRole("button", { name: /View full overview/ });
    const h = await phoneEntry.evaluate((el) => Math.round(el.getBoundingClientRect().height)).catch(() => 0);
    report("390px · the entry point is a 44px target", h >= 44, `${h}px`);
    await phoneEntry.click();
    const pm = p.locator('[data-testid="receipt-modal"]');
    await pm.waitFor({ state: "visible", timeout: 10_000 });
    const pw = await pm.evaluate((el) => Math.round(el.getBoundingClientRect().width));
    report("390px · the modal takes the width", pw >= 380, `${pw}px`);
    await phone.close();
  } finally {
    // The overview this run wrote, and the credit it spent, so a run leaves neither behind.
    // Read from the database rather than from what the run saw, so a write that landed after a
    // check failed is cleared too. The deck held none when the run began.
    if (walked) {
      const rows = await sql`select id, model_call_id from deck_synopses where deck_id = ${walked}::uuid`.catch(() => []);
      for (const row of rows) {
        await sql`delete from deck_synopses where id = ${row.id}::uuid`.catch((e) => report("delete the written overview", false, e.message));
        if (row.model_call_id) {
          await sql`delete from model_calls where id = ${row.model_call_id}::uuid`.catch((e) => report("delete its ledger row", false, e.message));
        }
      }
    }
    for (const restore of holds) await restore().catch((e) => report("put back the analysis", false, e.message));
    await browser.close();
  }
}

// A throw is a failure the report must SAY: with the climb laid over the overview the press is
// intercepted and Playwright times out, and that run has to read as failed rather than as a crash.
await run().catch((e) => report("the walk completed", false, e.message.split("\n")[0]));
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
