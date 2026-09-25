// probe:climb-locks — the climb's *What would have to go* sheet with locked candidates (Locked,
// sub-project 5.1, PR 6 climb half), at 1300x900 and 390x844.
//
// What only a browser answers: that the lock set actually REACHES the sheet. It travels from the
// deck page's rows (`getDeckDetail`'s `locked`) through the builder shell, the Analysis panel and
// the climb into the sheet, and every unit test here hands the sheet its set directly, so a prop
// dropped at any mount site passes the whole suite. The probe presses the lower rung's opener and
// reads the sheet: the locked candidate LAST and marked, the note under the rule, the word beside
// the mark from `md` and the mark alone on a phone.
//
// Two states, one per lock set, on the upgrade-path fixture deck (five game changers, reading 4-5,
// so Upgraded asks two of five to go):
//   - one game changer locked: listed last, marked, and `listedLast` under the rule;
//   - four locked: `unreachable`, in listedLast's slot.
// The combo half is not walked: this deck's combo is neither a loop nor assembled, so Upgraded
// does not list it, and a lock on it would measure nothing. `upgrade-path.test.tsx` pins it.
//
// IT WRITES `deck_locks` rows on that fixture deck and deletes exactly the rows it wrote in a
// `finally`; it refuses to start when the deck already holds a lock, since clearing is not
// restoring. It also raises the account's `user_prefs.about_version_seen`, as
// `probe:verdict-block` does. Needs a server with NEVER_CUT_ENABLED=true and
// ANALYSIS_TAB_ENABLED=true. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3237 node scripts/probe-climb-locks.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? null;
const DECK = process.env.PROBE_CLIMB_DECK ?? "d0000000-0000-4000-8000-00000000d5c1";
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const sql = neon(DATABASE_URL);

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

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
  // The About gate, cleared as `probe:verdict-block` clears it, with `greatest` so a checkout
  // pinned behind the database never lowers the stored value.
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  const userId = await page.evaluate(() => window.Clerk.user.id);
  await sql`
    insert into user_prefs (user_id, about_version_seen) values (${userId}, ${version})
    on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  return userId;
}

/** The fixture's candidates by name, off its stored reading rather than ids that rot. */
async function fixture(userId) {
  const [row] = await sql`
    select profile->'brackets'->'gameChangers' as gcs
    from deck_profiles p join decks d on d.id = p.deck_id
    where p.deck_id = ${DECK} and d.user_id = ${userId}`;
  if (!row) throw new Error(`No stored reading for ${DECK} under the signed-in account.`);
  if (row.gcs.length !== 5) throw new Error(`${DECK} no longer holds five game changers; the states below assume it.`);
  return { gcs: row.gcs };
}

async function openSheet(page) {
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded" });
  await onPageRole(page, "tab", /Analysis/).first().click();
  const opener = onPageRole(page, "button", /what would have to go/).first();
  await opener.waitFor({ state: "visible", timeout: 30_000 });
  await opener.click();
  await page.getByTestId("upgrade-path").waitFor({ state: "visible" });
}

/** Everything the checks read, off the laid-out sheet. */
function readSheet(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-testid="upgrade-path"]');
    const visible = (el) => !!el && el.getBoundingClientRect().width > 0;
    const lists = [...panel.querySelectorAll("ul")].map((ul) => [...ul.querySelectorAll(":scope > li")].map((li) => ({
      name: li.querySelector("button")?.textContent ?? "",
      locked: !!li.querySelector('[data-testid="climb-locked"]'),
    })));
    const locks = [...panel.querySelectorAll('[data-testid="climb-locked"]')].map((l) => ({
      mark: visible(l.querySelector('[data-testid="lock-mark"]')),
      word: visible(l.querySelector("span.font-mono")),
    }));
    const notes = [...panel.querySelectorAll('[data-testid="climb-lock-note"]')].map((n) => n.textContent);
    return { lists, locks, notes };
  });
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  const written = [];
  try {
    const context = await browser.newContext({ viewport: WIDTHS[0].viewport });
    const page = await context.newPage();
    const userId = await signIn(page);
    const { gcs } = await fixture(userId);
    const [held] = await sql`select count(*)::int as n from deck_locks where deck_id = ${DECK}`;
    if (held.n > 0) throw new Error(`${DECK} already holds ${held.n} lock(s); this probe clears only what it writes.`);

    const lock = async (ids) => {
      await sql`delete from deck_locks where deck_id = ${DECK}`;
      written.length = 0;
      for (const id of ids) {
        written.push(id);
        await sql`insert into deck_locks (deck_id, oracle_id) values (${DECK}, ${id})`;
      }
    };

    const states = [
      {
        name: "one locked",
        ids: [gcs[1].oracleId],
        check: (label, s) => {
          const gcList = s.lists.find((l) => l.length === 5);
          report(`${label} · the locked game changer is listed last`, gcList?.at(-1)?.name.includes(gcs[1].name) && gcList.at(-1).locked,
            gcList ? gcList.map((c) => `${c.name}${c.locked ? " [locked]" : ""}`).join(", ") : "no five-candidate list");
          report(`${label} · listedLast under the rule`, s.notes.includes(`You locked ${gcs[1].name}, so it is listed last. It still counts.`), JSON.stringify(s.notes));
        },
      },
      {
        name: "out of reach",
        ids: gcs.slice(1).map((g) => g.oracleId),
        check: (label, s) => {
          report(`${label} · the count rule says Upgraded is out of reach`, s.notes.includes("4 of these are locked. Upgraded can’t be reached while they are."), JSON.stringify(s.notes));
          const gcList = s.lists.find((l) => l.length === 5);
          report(`${label} · the one unlocked candidate leads`, gcList?.[0]?.name.includes(gcs[0].name) && !gcList[0].locked && gcList.slice(1).every((c) => c.locked),
            gcList ? gcList.map((c) => `${c.name}${c.locked ? " [locked]" : ""}`).join(", ") : "no five-candidate list");
          report(`${label} · listedLast gives way to unreachable`, !s.notes.some((n) => n.includes("listed last")), `${s.notes.length} note(s)`);
        },
      },
    ];

    for (const state of states) {
      await lock(state.ids);
      for (const { label, viewport } of WIDTHS) {
        await page.setViewportSize(viewport);
        await openSheet(page);
        const s = await readSheet(page);
        const tag = `${label}px · ${state.name}`;
        state.check(tag, s);
        report(`${tag} · every lock draws its mark`, s.locks.length > 0 && s.locks.every((l) => l.mark), `${s.locks.length} lock(s)`);
        const words = s.locks.filter((l) => l.word).length;
        report(`${tag} · the word ${label === 390 ? "is not drawn on a phone" : "is drawn beside the mark"}`,
          label === 390 ? words === 0 : words === s.locks.length, `${words} of ${s.locks.length}`);
        if (SHOTS) await onPage(page, '[role="dialog"]').first().screenshot({ path: `${SHOTS}/climb-${state.name.replace(/ /g, "-")}-${label}.png` });
      }
    }
  } finally {
    // Exactly the rows this run wrote; the deck held none when it started.
    try {
      for (const id of written) await sql`delete from deck_locks where deck_id = ${DECK} and oracle_id = ${id}`;
    } catch (err) {
      console.error("cleanup failed:", err);
      failures += 1;
    }
    await browser.close();
  }
}

await run();
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
