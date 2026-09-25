// The upgrade path (Round 4 §B), walked in a real browser at 1300x900 and 390x844.
//
// WHY A BROWSER. The path is a sheet opened from the climb's lower rung (handoff §3, 3b, since
// #885 — it was an in-place disclosure before), and its rulings are facts about a live page:
//
//   · IT IS A DIALOG THAT TAKES FOCUS AND GIVES IT BACK. The opener says `aria-haspopup`, focus
//     moves inside on open, and Escape returns it to the opener — `document.activeElement` is
//     the only witness to either.
//   · ONE TARGET, the bracket directly below the reading, named in the sheet's header, with no
//     chips choosing another.
//   · ONE CANDIDATE PER LINE AT 390, never a wrapped run — a run of names wraps mid-name there.
//     Read as distinct line tops, because the class list is the same either way.
//   · BLOCKED IS REACHABLE AND SAID PLAINLY: a game-changer commander under Upgraded puts Core
//     out of reach of removals, the commander is drawn on a dashed edge, and no nearer target is
//     offered, because the targets nest upward. That state needs a deck built for it; no fixture
//     account holds one.
//
// ONE MUTATION WAS RUN AGAINST THE PHONE LIST AND FAILS: the candidate list left as a wrapped run
// (2 line tops for 5 names). The sheet's checks were rewritten after #885 and carry no mutation
// record of their own yet.
//
// TWO FIXTURES, built and deleted in a `finally`: five game changers beside a two-card combo
// (Sanguine Bond and Exquisite Blood), and a game-changer commander over nothing else.
// Seeds `user_prefs.about_version_seen` forward, as every probe on this surface does. Needs a
// server with ANALYSIS_TAB_ENABLED=true. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3023 node scripts/probe-upgrade-path.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { padToWhole } from "./lib/whole-deck.mjs";
import { onPage, onPageRole, PAGE } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

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
  const userId = await page.evaluate(() => window.Clerk.user.id);
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  await sql`
    insert into user_prefs (user_id, about_version_seen) values (${userId}, ${version})
    on conflict (user_id) do update
      set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  await clearAboutSheet(page, userId);
  return userId;
}

async function buildFixtures(userId, made) {
  const gcs = await sql`
    select oracle_id from cards where game_changer and type_line not ilike '%legendary creature%'
    order by name limit 5`;
  const [plain] = await sql`
    select oracle_id from cards
    where type_line ilike 'Legendary Creature%' and not game_changer
      and color_identity @> array['W','B']::text[] and cardinality(color_identity) = 2
    order by name limit 1`;
  const [gcCommander] = await sql`
    select oracle_id from cards where game_changer and type_line ilike 'Legendary Creature%'
    order by name limit 1`;
  const pair = await sql`
    select oracle_id from cards where name in ('Sanguine Bond', 'Exquisite Blood') order by name`;
  if (gcs.length < 5 || !plain || !gcCommander || pair.length < 2) {
    throw new Error("the catalog cannot build these fixtures");
  }
  const specs = [
    { key: "combo", commander: plain.oracle_id, cards: [...gcs, ...pair] },
    // One game changer, the commander: the reading is Upgraded, so the target is Core, which
    // allows none, and the one card carrying it cannot leave.
    { key: "blocked", commander: gcCommander.oracle_id, cards: [] },
  ];
  const decks = {};
  for (const s of specs) {
    const id = crypto.randomUUID();
    made.push(id);
    await sql`
      insert into decks (id, user_id, name, commander_oracle_id)
      values (${id}, ${userId}, ${`Upgrade path probe · ${s.key}`}, ${s.commander})`;
    for (const c of s.cards) {
      await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${id}, ${c.oracle_id}, 1)`;
    }
    // Whole, or the press is refused (ruling 1). Wastes moves no bracket fact.
    await padToWhole(sql, id, s.cards.length);
    decks[s.key] = id;
  }
  return decks;
}

/** The deck page, the Analysis tab by a PRESS, and the profile asked for. */
async function openAnalysis(p, deckId, label) {
  await p.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  const up = await p.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 25_000 }).then(() => true, () => false);
  if (!report(`${label}px · the deck page rendered`, up, up ? "tablist is up" : "no tablist")) return false;
  const tab = onPageRole(p, "tab", /Analysis/);
  if (!report(`${label}px · the Analysis tab is drawn`, (await tab.count()) > 0,
      "absent means ANALYSIS_TAB_ENABLED is off on this server")) return false;
  await tab.first().click();
  await onPageRole(p, "button", /^(Re-)?[Aa]nalyze$/).first().click();
  const ready = await onPage(p, 'section[aria-label="Your bracket"]')
    .first().waitFor({ state: "visible", timeout: 25_000 }).then(() => true, () => false);
  return report(`${label}px · the verdict is drawn`, ready, ready ? "ready" : "no verdict after 25s");
}

const panel = (p) => p.locator('[role="dialog"] [data-testid="upgrade-path"]').first();
const dialog = (p) => p.locator('[role="dialog"]').filter({ has: p.locator('[data-testid="upgrade-path"]') }).first();
const triggers = (p) => onPageRole(p, "button", /what would have to go/);
const trigger = (p) => triggers(p).first();
const titleOf = (p) => dialog(p).evaluate((el) => (el.querySelector("h2, h3")?.textContent ?? "").trim());

async function walk(p, { label }, decks) {
  // ── The sheet: one opener on the lower rung, focus in, Escape back to it ────────────────
  if (await openAnalysis(p, decks.combo, label)) {
    const t = trigger(p);
    report(`${label}px · the lower rung carries one opener, for a dialog`,
      (await triggers(p).count()) === 1 && (await t.getAttribute("aria-haspopup")) === "dialog",
      `${await triggers(p).count()} opener(s), haspopup=${await t.getAttribute("aria-haspopup")}`);
    await t.click();
    const opened = await panel(p).waitFor({ timeout: 5_000 }).then(() => true, () => false);
    report(`${label}px · pressing it opens the path in a sheet`, opened, opened ? "sheet drawn" : "no sheet");
    if (opened) {
      const focusIn = await dialog(p).evaluate((el) => el.contains(document.activeElement));
      report(`${label}px · focus moves into the sheet`, focusIn, focusIn ? "inside" : "left behind");

      // ONE TARGET, the bracket directly below the reading: no chips choose another (§3, 3b).
      const title = await titleOf(p);
      report(`${label}px · the target is the bracket below, named in the header`, title.startsWith("Upgraded,"), title);
      report(`${label}px · and no chips offer another`,
        (await panel(p).locator('[role="group"] button').count()) === 0, "no target chips");

      // u2: any two of five, and at 390 one name per line.
      const list = await panel(p).evaluate((el) => {
        const items = [...(el.querySelector("ul")?.querySelectorAll("li") ?? [])];
        return {
          text: el.textContent.replace(/\s+/g, " "),
          tops: items.map((li) => Math.round(li.getBoundingClientRect().top)),
        };
      });
      report(`${label}px · any two of these five, none picked`, list.text.includes("Any 2 of these 5 would do it."),
        list.text.slice(0, 120));
      if (label === 390) {
        report("390px · one candidate per line", list.tops.length === 5 && new Set(list.tops).size === 5,
          `${new Set(list.tops).size} line tops for ${list.tops.length} names`);
      }
      report(`${label}px · and never says remove`, !/\bremove\b/i.test(list.text), "no remove");

      await p.keyboard.press("Escape");
      const closed = await panel(p).waitFor({ state: "detached", timeout: 3_000 }).then(() => true, () => false);
      const back = await t.evaluate((b) => b === document.activeElement);
      report(`${label}px · Escape closes it and focus returns to the opener`, closed && back,
        `${closed ? "closed" : "still open"}, focus ${back ? "on the opener" : "elsewhere"}`);
    }
  }

  // ── Blocked: the commander carries the excess ───────────────────────────────────────────
  if (await openAnalysis(p, decks.blocked, label)) {
    await trigger(p).click();
    const opened = await panel(p).waitFor({ timeout: 5_000 }).then(() => true, () => false);
    if (report(`${label}px · the blocked deck opens its sheet`, opened, opened ? "sheet drawn" : "no sheet")) {
      const title = await titleOf(p);
      const b = await panel(p).evaluate((el) => {
        const chip = [...el.querySelectorAll("span")].find((s) => s.textContent.includes("your commander") && getComputedStyle(s).borderStyle === "dashed");
        return {
          text: el.textContent.replace(/\s+/g, " "),
          dashed: Boolean(chip),
          danger: [...el.querySelectorAll("*")].some((n) => /--danger/.test(n.getAttribute("class") ?? "")),
        };
      });
      report(`${label}px · Core is not reachable by removing cards`, title === "Core, not reachable by removing cards", title);
      report(`${label}px · the commander sits on a dashed edge`, b.dashed, b.dashed ? "dashed chip" : "none");
      report(`${label}px · plainly: no danger ink`, !b.danger && !/impossible|sorry/i.test(b.text), "plain");
      // The targets nest upward, so nothing between this one and the reading is nearer.
      const nearer = await panel(p).getByRole("button", { name: /is reachable/ }).count();
      report(`${label}px · and names no nearer target`, nearer === 0, `${nearer} link(s)`);
    }
  }
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  const made = [];
  let decks = null;
  try {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: width.viewport });
      const p = await ctx.newPage();
      const userId = await signIn(p);
      decks ??= await buildFixtures(userId, made);
      await walk(p, width, decks);
      await ctx.close();
    }
  } finally {
    await browser.close();
    if (made.length) await sql`delete from decks where id = any(${made})`;
    console.log(`       (cleaned up ${made.length} fixture deck${made.length === 1 ? "" : "s"})`);
  }
}

await run();
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
