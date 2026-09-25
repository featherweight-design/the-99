// probe:deck-locks — Locked (never cut) on the deck page, `/decks/[id]`, at 1300x900 and 390x844,
// against a real Postgres (Locked PR 4a).
//
// It PRESSES the path a player takes and reads every result back from `deck_locks` and `deck_cards`,
// not only off the screen, because the toggle is optimistic: a row can draw a lock the server
// refused, and only the database says whether it held.
//   - Lock cards enters the mode: its label reads Done, the mode's line replaces the key line, and
//     Keep all and Clear all auto stay in place, disabled.
//   - A row's toggle locks its card (aria-pressed, then a live `deck_locks` row), including an auto
//     card; Done leaves the mode and the locked row keeps its mark.
//   - Clear all auto counts only the copies it can take, sweeps every auto card but the locked one,
//     and its receipt says the locked card stayed.
//   - A locked card removed with its ✕ and brought back with the row's Undo comes back LOCKED (L1).
//   - The card view (4b): the mode is kept across List and Card, a tile's toggle locks its card,
//     the tile keeps its lock on the meta line at rest (F8), and the tile's Undo returns it locked.
//   - Under the Shopping filter Lock cards is absent.
//   - T1: at 1300 the toolbar, with two-digit auto and kept counts and a draft note at v10, is one
//     line. 1280 is printed, not asserted (the addendum records it as about 5px over).
//
// Fixture, built per width under the signed-in account and deleted in a `finally` (cards, versions
// and locks cascade): a committed copy of the template at version 10, twelve of its cards marked
// auto, and one card cut from the draft so the toolbar carries a draft note. Needs a server with
// NEVER_CUT_ENABLED=true. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3239 node scripts/probe-deck-locks.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? null;
const TEMPLATE = process.env.PROBE_TEMPLATE_DECK ?? "a1111111-1111-1111-1111-111111111111";
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
  await clearAboutSheet(page, userId);
  return userId;
}

/** A committed copy of the template at version 10, twelve cards auto, one cut from the draft. */
async function buildDeck(userId, name, made) {
  const [t] = await sql`select commander_oracle_id, partner_oracle_id from decks where id = ${TEMPLATE}`;
  if (!t) throw new Error(`No template deck ${TEMPLATE}.`);
  const [{ id }] = await sql`
    insert into decks (user_id, name, commander_oracle_id, partner_oracle_id, filled)
    values (${userId}, ${name}, ${t.commander_oracle_id}, ${t.partner_oracle_id}, true) returning id`;
  made.push(id); // recorded before anything else can throw, so the `finally` always deletes it
  await sql`insert into deck_cards (deck_id, oracle_id, quantity, auto)
    select ${id}, oracle_id, quantity, false from deck_cards where deck_id = ${TEMPLATE}`;
  const [v] = await sql`
    insert into deck_versions (deck_id, number, commander_oracle_id, partner_oracle_id)
    values (${id}, 10, ${t.commander_oracle_id}, ${t.partner_oracle_id}) returning id`;
  await sql`insert into deck_version_cards (version_id, oracle_id, quantity)
    select ${v.id}, oracle_id, quantity from deck_cards where deck_id = ${id}`;
  // The Undo card is colorless and legal, so its re-add passes validation on any template; the
  // twelve autos and the cut are any other non-basic singletons.
  const [plain, tile] = await sql`
    select dc.oracle_id, c.name from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
    where dc.deck_id = ${id} and dc.quantity = 1 and c.type_line not like 'Basic Land%'
      and cardinality(c.color_identity) = 0 and c.commander_legal
    order by dc.oracle_id limit 2`;
  if (!tile) throw new Error("The template holds fewer than two colorless legal singletons to Undo.");
  const picks = await sql`
    select dc.oracle_id, c.name from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
    where dc.deck_id = ${id} and dc.quantity = 1 and c.type_line not like 'Basic Land%'
      and dc.oracle_id not in (${plain.oracle_id}, ${tile.oracle_id})
    order by dc.oracle_id limit 13`;
  if (picks.length < 13) throw new Error("The template holds fewer than 13 other non-basic singletons.");
  const autos = picks.slice(0, 12).map((p) => p.oracle_id);
  // F8's crowded line: a Game Changer asked for twice against the one copy owned, locked, so its
  // tile's meta line carries the dot, a `short` chip, a count, the lock and its fact marks at once.
  const [crowded] = await sql`
    select dc.oracle_id, c.name from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
    where dc.deck_id = ${id} and dc.quantity = 1 and c.game_changer
      and dc.oracle_id not in (${plain.oracle_id}, ${tile.oracle_id})
      and dc.oracle_id <> all(${autos}::uuid[])
      and dc.oracle_id <> ${picks[12].oracle_id} -- the card cut from the draft below
    order by dc.oracle_id limit 1`;
  if (!crowded) throw new Error("The template holds no Game Changer singleton for the crowded tile.");
  await sql`update deck_cards set quantity = 2 where deck_id = ${id} and oracle_id = ${crowded.oracle_id}`;
  await sql`insert into deck_locks (deck_id, oracle_id) values (${id}, ${crowded.oracle_id})`;
  await sql`update deck_cards set auto = true where deck_id = ${id} and oracle_id = any(${autos}::uuid[])`;
  await sql`delete from deck_cards where deck_id = ${id} and oracle_id = ${picks[12].oracle_id}`;
  return {
    deckId: id,
    autoLocked: { oracleId: picks[0].oracle_id, name: picks[0].name },
    autos,
    plain: { oracleId: plain.oracle_id, name: plain.name },
    tile: { oracleId: tile.oracle_id, name: tile.name },
    crowded: { oracleId: crowded.oracle_id, name: crowded.name },
  };
}

const lockOf = async (deckId, oracleId) =>
  (await sql`select removed_at from deck_locks where deck_id = ${deckId} and oracle_id = ${oracleId}`)[0] ?? null;
const holds = async (deckId, oracleId) =>
  (await sql`select 1 from deck_cards where deck_id = ${deckId} and oracle_id = ${oracleId}`).length > 0;
async function until(check, ms = 15_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
const visible = (locator) => locator.filter({ visible: true }).first();

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  const made = [];
  try {
    const context = await browser.newContext({ viewport: WIDTHS[0].viewport });
    const page = await context.newPage();
    const userId = await signIn(page);

    for (const { label, viewport } of WIDTHS) {
      await page.setViewportSize(viewport);
      const fx = await buildDeck(userId, `Probe · deck locks ${label}`, made);
      const tag = `${label}px`;
      await page.goto(`${BASE}/decks/${fx.deckId}`, { waitUntil: "domcontentloaded" });
      const lockButton = visible(onPageRole(page, "button", /^Lock cards$/));
      await lockButton.waitFor({ state: "visible", timeout: 30_000 });

      // T1: every toolbar control on one line at 1300 (their tops within 6px of each other).
      if (label === 1300) {
        for (const w of [1300, 1280]) {
          await page.setViewportSize({ width: w, height: 900 });
          const tops = await page.evaluate(() => {
            const b = [...document.querySelectorAll("main button")].find((x) => /^Lock cards$/.test(x.innerText.trim()));
            const bar = b?.parentElement?.parentElement;
            return bar ? [...bar.querySelectorAll("button")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => Math.round(x.getBoundingClientRect().top)) : [];
          });
          const spread = tops.length ? Math.max(...tops) - Math.min(...tops) : -1;
          if (w === 1300) report(`${tag} · T1: the toolbar is one line`, tops.length > 2 && spread <= 6, `${tops.length} controls, top spread ${spread}px`);
          else console.log(`  note 1280px · toolbar top spread ${spread}px (recorded, not asserted)`);
        }
        await page.setViewportSize(viewport);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/deck-locks-toolbar-${label}.png` });
      }

      // The mode.
      await lockButton.click();
      const done = visible(onPageRole(page, "button", /^Done$/));
      report(`${tag} · Lock cards reads Done in the mode`, await done.isVisible().catch(() => false), "");
      const line = await onPage(page, "text=Locked cards are never suggested as cuts.").count();
      report(`${tag} · the mode's line is drawn`, line > 0, `${line}`);
      const clearDisabled = await page.evaluate(() => [...document.querySelectorAll("main button")]
        .filter((b) => /^Clear (all )?auto/.test(b.innerText.trim()) && b.getBoundingClientRect().width > 0)
        .every((b) => b.disabled));
      report(`${tag} · Clear all auto stays in place, disabled`, clearDisabled, "");

      // Lock an auto card and a plain one through their toggles.
      for (const card of [fx.autoLocked, fx.plain]) {
        const toggle = visible(onPage(page, `[aria-label="Lock ${card.name}"]`));
        await toggle.click();
        const pressed = await toggle.getAttribute("aria-pressed");
        const held = await until(async () => (await lockOf(fx.deckId, card.oracleId))?.removed_at === null);
        report(`${tag} · the toggle locks ${card.name}`, pressed === "true" && held, `aria-pressed ${pressed}, in deck_locks: ${held}`);
      }
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/deck-locks-mode-${label}.png` });
      await done.click();
      report(`${tag} · Done leaves the mode`, await lockButton.isVisible().catch(() => false), "");
      // The locked row keeps its mark at rest: the desktop slot beside ✕, the phone's mark after
      // the name. Read inside the row that holds the card's own remove button.
      const mark = await page.evaluate(([name, phone]) => {
        const remove = [...document.querySelectorAll("main button")].find((b) => b.getAttribute("aria-label") === `Remove ${name}` && b.getBoundingClientRect().width > 0);
        let row = remove?.parentElement ?? null;
        const sel = phone ? '[data-testid="row-lock-mark"]' : '[data-testid="row-lock-shortcut"]';
        while (row && !row.querySelector(sel)) row = row.parentElement;
        const el = row?.querySelector(sel);
        return el ? { drawn: el.getBoundingClientRect().width > 0, title: el.getAttribute("title") } : null;
      }, [fx.plain.name, label === 390]);
      report(`${tag} · the locked row keeps its mark at rest`, !!mark?.drawn, JSON.stringify(mark));

      // Clear all auto: counts the copies it can take, sweeps all but the locked one.
      const clear = visible(onPageRole(page, "button", /^Clear all \d+ untouched auto cards/));
      const clearText = (await clear.innerText()).trim();
      report(`${tag} · Clear counts only the clearable copies`, /· 11$/.test(clearText), clearText);
      await clear.click();
      const swept = await until(async () => !(await holds(fx.deckId, fx.autos[1])));
      const stayed = await holds(fx.deckId, fx.autoLocked.oracleId);
      report(`${tag} · the sweep leaves the locked auto card`, swept && stayed, `swept others ${swept}, locked stayed ${stayed}`);
      const receipt = await onPage(page, "text=/1 locked card stayed/").count();
      report(`${tag} · the receipt says the locked card stayed`, receipt > 0, `${receipt}`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/deck-locks-receipt-${label}.png` });

      // L1: remove the locked plain card, then Undo.
      await visible(onPage(page, `[aria-label="Remove ${fx.plain.name}"]`)).click();
      const gone = await until(async () => !(await holds(fx.deckId, fx.plain.oracleId)));
      await visible(onPage(page, `[aria-label="Undo removing ${fx.plain.name}"]`)).click();
      const back = await until(() => holds(fx.deckId, fx.plain.oracleId));
      const lock = await lockOf(fx.deckId, fx.plain.oracleId);
      report(`${tag} · Undo returns a locked card LOCKED (L1)`, gone && back && lock?.removed_at === null,
        `removed ${gone}, back ${back}, lock ${lock ? `removed_at ${lock.removed_at}` : "none"}`);

      // The card view (Locked 4b): the mode is kept across List and Card, a tile's toggle locks its
      // card, the tile keeps its mark at rest (never dropped from its meta line, F8), and the tile's
      // Undo returns a locked card locked.
      await lockButton.click();
      await visible(onPageRole(page, "button", /^Card view$/)).click();
      report(`${tag} · the mode is kept across List and Card`, await done.isVisible().catch(() => false), "");
      const tileToggle = visible(onPage(page, `[data-testid="tile-lock-toggle"][aria-label="Lock ${fx.tile.name}"]`));
      await tileToggle.click();
      const tileHeld = await until(async () => (await lockOf(fx.deckId, fx.tile.oracleId))?.removed_at === null);
      report(`${tag} · a tile's toggle locks ${fx.tile.name}`, (await tileToggle.getAttribute("aria-pressed")) === "true" && tileHeld, `in deck_locks: ${tileHeld}`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/deck-locks-card-mode-${label}.png` });
      await done.click();
      const tileMark = await page.evaluate((name) => {
        const remove = [...document.querySelectorAll("main button")].find((b) => b.getAttribute("aria-label") === `Remove ${name}` && b.getBoundingClientRect().width > 0);
        let tile = remove?.parentElement ?? null;
        while (tile && !tile.querySelector('[data-testid="tile-lock-mark"]')) tile = tile.parentElement;
        const mark = tile?.querySelector('[data-testid="tile-lock-mark"]');
        if (!mark) return null;
        const m = mark.getBoundingClientRect();
        const line = mark.parentElement.getBoundingClientRect();
        return { width: Math.round(m.width), inside: m.left >= line.left - 0.5 && m.right <= line.right + 0.5 };
      }, fx.tile.name);
      report(`${tag} · the tile keeps its lock on the meta line (F8)`, !!tileMark && tileMark.width > 0 && tileMark.inside, JSON.stringify(tileMark));
      // F8 on the crowded line: the lock inside its line, and every fact mark either WHOLE inside the
      // fact group or wholly outside it (dropped), never sliced.
      const crowd = await page.evaluate((name) => {
        // The tile is the nearest ancestor holding this card's own remove button (one copy or more).
        const holder = (el) => {
          for (let n = el; n; n = n.parentElement) {
            if ([...n.querySelectorAll("button")].some((b) => ((l) => l.startsWith("Remove") && l.includes(name))(b.getAttribute("aria-label") ?? ""))) return n;
          }
          return null;
        };
        const line = [...document.querySelectorAll("main [data-testid='tile-lock-mark']")]
          .filter((m) => m.getBoundingClientRect().width > 0)
          .find((m) => { const t = holder(m); return t && t.querySelectorAll("[data-testid='tile-lock-mark']").length === 1; })
          ?.parentElement;
        if (!line) {
          const removes = [...document.querySelectorAll("main button")].map((b) => b.getAttribute("aria-label") ?? "").filter((l) => l.includes(name));
          return { missing: true, marks: document.querySelectorAll("main [data-testid='tile-lock-mark']").length, removes };
        }
        const mark = line.querySelector("[data-testid='tile-lock-mark']").getBoundingClientRect();
        const lineBox = line.getBoundingClientRect();
        const group = line.querySelector("[data-testid='tile-fact-marks']");
        const g = group?.getBoundingClientRect();
        const glyphs = group ? [...group.children].slice(1).map((el) => el.getBoundingClientRect()) : [];
        const sliced = glyphs.filter((r) => r.top < g.bottom && r.bottom > g.top && r.left < g.right && r.right > g.right + 0.5).length;
        const shown = glyphs.filter((r) => r.top < g.bottom && r.right <= g.right + 0.5).length;
        return {
          lockInside: mark.left >= lineBox.left - 0.5 && mark.right <= lineBox.right + 0.5 && mark.width > 0,
          groupWidth: g ? Math.round(g.width) : null, glyphs: glyphs.length, shown, sliced,
        };
      }, fx.crowded.name);
      report(`${tag} · the crowded line keeps its lock and slices no fact mark (F8)`, !!crowd && crowd.lockInside && crowd.sliced === 0 && crowd.glyphs > 0, JSON.stringify(crowd));
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/deck-locks-card-rest-${label}.png` });
      await visible(onPage(page, `[aria-label="Remove ${fx.tile.name}"]`)).click();
      const tileGone = await until(async () => !(await holds(fx.deckId, fx.tile.oracleId)));
      await visible(onPage(page, `[aria-label="Undo removing ${fx.tile.name}"]`)).click();
      const tileBack = await until(() => holds(fx.deckId, fx.tile.oracleId));
      const tileLock = await lockOf(fx.deckId, fx.tile.oracleId);
      report(`${tag} · the tile's Undo returns a locked card LOCKED (L1)`, tileGone && tileBack && tileLock?.removed_at === null,
        `removed ${tileGone}, back ${tileBack}, lock ${tileLock ? `removed_at ${tileLock.removed_at}` : "none"}`);
      await visible(onPageRole(page, "button", /^List view$/)).click();

      // Shopping: Lock cards is absent.
      const shopping = visible(onPageRole(page, "button", /^Shopping \d+$/));
      if (await shopping.count()) {
        await shopping.click();
        await page.waitForTimeout(400);
        const present = await onPageRole(page, "button", /^Lock cards$/).filter({ visible: true }).count();
        report(`${tag} · Lock cards is absent under Shopping`, present === 0, `${present} drawn`);
      } else {
        report(`${tag} · Lock cards is absent under Shopping`, false, "no Shopping pill to press: the fixture buys nothing");
      }
    }
  } finally {
    try {
      for (const id of made) await sql`delete from decks where id = ${id}`;
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
