// The upgrade path (Round 4 §B), walked in a real browser at 1300x900 and 390x844.
//
// WHY A BROWSER. The path is a disclosure on the climb's lower rung, and four of its rulings are
// facts about a live page rather than about markup:
//
//   · IT EXPANDS IN PLACE, BELOW THE RUNGS, AND MOVES NO FOCUS (§D). A panel mounted anywhere
//     else in the tab, or one that steals focus on open, renders identical markup; only geometry
//     and `document.activeElement` tell them apart.
//   · ONE CANDIDATE PER LINE AT 390, never a wrapped run — a run of names wraps mid-name there.
//     Read as distinct line tops, because the class list is the same either way.
//   · THE CHIPS ARE 44px ON THE PHONE and 30px above it, read resolved.
//   · BLOCKED IS REACHABLE AND LEADS SOMEWHERE: a game-changer commander puts Core out of reach
//     of removals, the commander is drawn on a dashed edge, and the nearest reachable target is
//     one press away. That state needs a deck built for it; no fixture account holds one.
//
// TWO MUTATIONS WERE RUN AGAINST IT AND BOTH FAIL: the phone's candidate list left as a wrapped
// run (2 line tops for 5 names), and the nearest reachable target searched DOWNWARD, where every
// lower bracket is blocked too and no link is drawn (both widths).
//
// TWO FIXTURES, built and deleted in a `finally`: five game changers beside a two-card combo
// (Sanguine Bond and Exquisite Blood), and four game changers under a game-changer commander.
// Seeds `user_prefs.about_version_seen` forward, as every probe on this surface does. Needs a
// server with ANALYSIS_TAB_ENABLED=true. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3023 node scripts/probe-upgrade-path.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
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

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 }, chipH: 30 },
  { label: 390, viewport: { width: 390, height: 844 }, chipH: 44 },
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
    { key: "blocked", commander: gcCommander.oracle_id, cards: gcs.slice(0, 4) },
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
  await onPageRole(p, "button", /Analyze this deck/).first().click();
  const ready = await onPage(p, 'section[aria-label="Your bracket"]')
    .first().waitFor({ state: "visible", timeout: 25_000 }).then(() => true, () => false);
  return report(`${label}px · the verdict is drawn`, ready, ready ? "ready" : "no verdict after 25s");
}

const panel = (p) => onPage(p, '[data-testid="upgrade-path"]').first();
const triggers = (p) => onPageRole(p, "button", /what would have to go/);
const trigger = (p) => triggers(p).first();

async function walk(p, { label, chipH }, decks) {
  // ── The disclosure: closed, then open in place, focus left where it was ─────────────────
  if (await openAnalysis(p, decks.combo, label)) {
    const t = trigger(p);
    report(`${label}px · the lower rung carries the disclosure, closed`,
      (await triggers(p).count()) === 1 && (await t.getAttribute("aria-expanded")) === "false",
      `${await triggers(p).count()} trigger(s), expanded=${await t.getAttribute("aria-expanded")}`);
    await t.click();
    const opened = await panel(p).waitFor({ timeout: 5_000 }).then(() => true, () => false);
    report(`${label}px · pressing it opens the path`, opened && (await t.getAttribute("aria-expanded")) === "true",
      opened ? "panel drawn" : "no panel");
    if (opened) {
      const geo = await p.evaluate(() => {
        const panelEl = document.querySelector('main [data-testid="upgrade-path"]');
        const rung = document.querySelector('main [data-testid="climb-rung"][data-role="below"]');
        const box = rung?.parentElement;
        const focused = document.activeElement;
        return {
          below: panelEl && box ? Math.round(panelEl.getBoundingClientRect().top - box.getBoundingClientRect().bottom) : null,
          controls: document.querySelector('main [aria-controls][aria-expanded="true"]')?.getAttribute("aria-controls") === panelEl?.id,
          focusOnTrigger: focused?.getAttribute("aria-expanded") === "true",
        };
      });
      report(`${label}px · it expands below the rungs, not in place of them`, geo.below !== null && geo.below >= 0 && geo.below < 40,
        `${geo.below}px below the rungs`);
      report(`${label}px · aria-controls names the panel`, geo.controls, String(geo.controls));
      report(`${label}px · and focus stays on the trigger`, geo.focusOnTrigger, geo.focusOnTrigger ? "trigger" : "moved");

      const chips = await panel(p).evaluate((el) =>
        [...el.querySelectorAll('[role="group"] button')].map((b) => ({
          text: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height), pressed: b.getAttribute("aria-pressed"),
        })));
      report(`${label}px · the targets are the brackets below, nearest first`,
        chips.map((c) => c.text).join("/") === "Upgraded/Core/Exhibition" && chips[0]?.pressed === "true",
        chips.map((c) => `${c.text}${c.pressed === "true" ? "*" : ""}`).join(" / "));
      report(`${label}px · each chip is ${chipH}px tall`, chips.length > 0 && chips.every((c) => c.h === chipH),
        chips.map((c) => c.h).join(", "));

      // u2: any two of five, and at 390 one name per line.
      const list = await panel(p).evaluate((el) => {
        const items = [...el.querySelectorAll("ul li")];
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

      // u3 + u4: at Core all five are forced, and the combo is forbidden outright.
      await panel(p).getByRole("button", { name: "Core" }).click();
      const core = await panel(p).evaluate((el) => el.textContent.replace(/\s+/g, " "));
      report(`${label}px · at Core the cards are named, no "any"`,
        /would have to go\./.test(core) && !/Any \d/.test(core), core.slice(0, 140));
      report(`${label}px · and the combo is broken by either half`,
        core.includes("Core doesn't allow two-card combos at all.") && core.includes("Either half breaks it.")
          && core.includes("Sanguine Bond") && core.includes("Exquisite Blood"),
        core.slice(core.indexOf("Two-card"), core.indexOf("Two-card") + 120));
      report(`${label}px · and never says remove`, !/\bremove\b/i.test(core), "no remove");

      await t.click();
      report(`${label}px · pressing again closes it`, (await panel(p).count()) === 0, `${await panel(p).count()} panel(s)`);
    }
  }

  // ── Blocked: the commander carries the excess ───────────────────────────────────────────
  if (await openAnalysis(p, decks.blocked, label)) {
    await trigger(p).click();
    await panel(p).waitFor({ timeout: 5_000 }).catch(() => {});
    await panel(p).getByRole("button", { name: "Core" }).click();
    const b = await panel(p).evaluate((el) => {
      const chip = [...el.querySelectorAll("span")].find((s) => s.textContent.includes("your commander") && getComputedStyle(s).borderStyle === "dashed");
      return {
        text: el.textContent.replace(/\s+/g, " "),
        dashed: Boolean(chip),
        danger: [...el.querySelectorAll("*")].some((n) => /--danger/.test(n.getAttribute("class") ?? "")),
      };
    });
    report(`${label}px · Core is not reachable by removing cards`, b.text.includes("Core, not reachable by removing cards"), b.text.slice(0, 80));
    report(`${label}px · the commander sits on a dashed edge`, b.dashed, b.dashed ? "dashed chip" : "none");
    report(`${label}px · plainly: no danger ink`, !b.danger && !/impossible|sorry/i.test(b.text), "plain");
    const nearest = panel(p).getByRole("button", { name: /Upgraded is reachable/ });
    report(`${label}px · the nearest reachable target is offered`, (await nearest.count()) === 1,
      `${await nearest.count()} link(s)`);
    if ((await nearest.count()) === 1) {
      await nearest.click();
      const after = await panel(p).evaluate((el) => el.textContent.replace(/\s+/g, " "));
      report(`${label}px · and one press reads it`, after.includes("Upgraded, two things would have to go"), after.slice(0, 80));
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
