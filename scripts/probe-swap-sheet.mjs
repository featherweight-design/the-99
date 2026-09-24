/**
 * probe:swap-sheet — the stand-ins sheet and the row's ⇄ (swap tools, PR 4a), walked at 390x844 and
 * 1300x900. It PRESSES the ⇄ on each fixture row and reads what the sheet drew.
 *
 * What only a browser answers:
 *   - the ⇄ is 22x20 on desktop and 44x44 on the phone, on an over row only; an under row keeps an
 *     empty 22px slot on desktop, and gives it back to the name on the phone;
 *   - the sheet is 640px wide and centred on desktop, and a sheet from 52px on the phone;
 *   - each kind reads as its kind: a land's lead names colors, a fetch's names the types it finds,
 *     a spell's names its role and the commander's decks, and every list ends in the price foot;
 *   - the list comes from the real gather (`loadStandIns`), so a row the engine returns draws.
 *
 * FIXTURE. A brew led by Kenrith (all five colors, so no fixture card is off-identity) holding, for
 * each kind, the first card from a named list this account does NOT own: a dual land, a fetch and
 * two removal spells, all above $10 at the newest price run, plus one card under $10. An unowned
 * card is a Shopping row. The deck is deleted in a `finally`. Needs a server with
 * `SWAP_TOOLS_ENABLED=true`. Point it at `local-dev`, never production.
 */
import { readFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { onPageRole, PAGE } from "./lib/surface.mjs";
import { requireEnv } from "./lib/env.mjs";

neonConfig.webSocketConstructor = ws;
const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const pool = new Pool({ connectionString: DATABASE_URL });

const KINDS = {
  land: ["Plateau", "Taiga", "Badlands", "Scrubland", "Tundra", "Volcanic Island", "Bayou", "Savannah"],
  fetch: ["Wooded Foothills", "Arid Mesa", "Misty Rainforest", "Scalding Tarn", "Verdant Catacombs", "Marsh Flats"],
  spell: ["Deadly Rollick", "Cyclonic Rift"],
  // A utility land whose stand-ins all give up the same thing: said once in the lead (Hugh, 2026-09-24).
  utility: ["Cavern of Souls"],
};
/** How each kind's lead opens, from the copy module's own templates. */
const LEAD = {
  land: /^Every land here makes /,
  fetch: /^Every land here finds a /,
  spell: /^Every card here is /,
  utility: /^Every land here makes .*and each gives up /,
};

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
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  // Clear the About gate: below the current version `proxy.ts` redirects every route to /about.
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  await pool.query(
    `insert into user_prefs (user_id, about_version_seen) values ($1, $2)
       on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, $2)`,
    [userId, version],
  );
  return userId;
}


async function firstUnowned(userId, names) {
  const { rows } = await pool.query(
    `select c.oracle_id, c.name from cards c
      where c.name = any($2::text[])
        and not exists (select 1 from collection_items ci where ci.user_id = $1 and ci.oracle_id = c.oracle_id)`,
    [userId, names],
  );
  return names.map((n) => rows.find((r) => r.name === n)).find(Boolean) ?? null;
}

async function buildDeck(userId, onDeck) {
  const { rows: [commander] } = await pool.query(`select oracle_id from cards where name = 'Kenrith, the Returned King'`);
  if (!commander) throw new Error("The catalog holds no Kenrith.");
  const picks = {};
  for (const [kind, names] of Object.entries(KINDS)) {
    picks[kind] = await firstUnowned(userId, names);
    if (!picks[kind]) throw new Error(`The account owns every ${kind} fixture: ${names.join(", ")}.`);
  }
  const { rows: [under] } = await pool.query(
    `with newest as (select max(as_of) t from printing_prices)
     select c.oracle_id, c.name from cards c join printings p on p.oracle_id = c.oracle_id
       join printing_prices pp on pp.scryfall_id = p.scryfall_id, newest
      where c.commander_legal and pp.as_of = newest.t and pp.price_cents is not null and c.name not like '%//%'
        and c.type_line like '%Instant%'
        and not exists (select 1 from collection_items ci where ci.user_id = $1 and ci.oracle_id = c.oracle_id)
      group by c.oracle_id, c.name having max(pp.price_cents) <= 400 order by c.name limit 1`,
    [userId],
  );
  const { rows: [deck] } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id) values ($1, 'probe · swap sheet', $2) returning id`,
    [userId, commander.oracle_id],
  );
  onDeck(deck.id);
  const ids = [...Object.values(picks), under].map((r) => r.oracle_id);
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto) select $1, unnest($2::uuid[]), 1, false`,
    [deck.id, ids],
  );
  return { deckId: deck.id, picks: Object.fromEntries(Object.entries(picks).map(([k, r]) => [k, r.name])), under: under.name };
}

const swapButton = (page, name) =>
  onPageRole(page, "button", new RegExp(`^Cheaper stand-ins for ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},`)).first();

/** The ⇄'s box, and the under row's slot: the span between the buy tag and the ✕, drawn or not. */
async function readRowControls(page, overName, underName) {
  const swap = await swapButton(page, overName).boundingBox();
  const slot = await page.evaluate(([scope, name]) => {
    const root = document.querySelector(scope);
    const trigger = [...root.querySelectorAll("button")].find((b) => b.getClientRects().length && b.getAttribute("aria-label")?.includes(name));
    const row = trigger?.closest(".group");
    if (!row) return null;
    const slot = [...row.querySelectorAll('span[aria-hidden="true"]')].find((s) => s.className.includes("w-[22px]"));
    return slot ? Math.round(slot.getBoundingClientRect().width) : 0;
  }, [PAGE, underName]);
  return { swap, slot };
}

let deckId = null;
let userId = null;
let browser = null;
try {
  await clerkSetup();
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: WIDTHS[0].viewport });
  const page = await context.newPage();
  userId = await signIn(page);
  const fx = await buildDeck(userId, (id) => { deckId = id; });
  console.log(`fixture ${deckId}: ${Object.entries(fx.picks).map(([k, n]) => `${k} ${n}`).join(" · ")} · under ${fx.under}`);

  for (const w of WIDTHS) {
    await page.setViewportSize(w.viewport);
    await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
    await onPageRole(page, "button", /^Shopping \d+/).first().click();
    await swapButton(page, fx.picks.land).waitFor({ timeout: 20_000 });
    const tag = `${w.label}`;

    const { swap, slot } = await readRowControls(page, fx.picks.land, fx.under);
    const want = w.label === 390 ? [44, 44] : [22, 20];
    report(`${tag} ⇄ size`, swap && Math.round(swap.width) === want[0] && Math.round(swap.height) === want[1],
      swap ? `${Math.round(swap.width)}x${Math.round(swap.height)}, want ${want.join("x")}` : "no ⇄");
    const under = await onPageRole(page, "button", new RegExp(`^Cheaper stand-ins for ${fx.under}`)).count();
    report(`${tag} no ⇄ on the under row`, under === 0, `${under} found`);
    report(`${tag} under row's slot`, w.label === 390 ? !slot : slot === 22, `${slot}px`);

    for (const [kind, name] of Object.entries(fx.picks)) {
      // The Shopping row's own tag, to hold the head's against: the same card, the same figure.
      const rowTag = await page.evaluate(([scope, n]) => {
        const root = document.querySelector(scope);
        const t = [...root.querySelectorAll("button")].find((b) => b.getClientRects().length && b.getAttribute("aria-label")?.includes(n));
        const tag = [...(t?.closest(".group")?.querySelectorAll("span") ?? [])]
          .find((s) => s.getClientRects().length && s.textContent.trim().startsWith("buy"));
        return tag?.textContent.replace(/\s+/g, " ").trim() ?? null;
      }, [PAGE, name]);
      await swapButton(page, name).click();
      const dialog = page.getByRole("dialog", { name: "Cheaper stand-ins" });
      await dialog.waitFor({ timeout: 10_000 });
      // The list, or the one sentence drawn in its place, or the failure: whichever lands.
      await page.waitForFunction(() => {
        const s = document.querySelector('[data-testid="stand-ins-sheet"]');
        return s && !s.querySelector('[role="status"]');
      }, null, { timeout: 30_000 });
      const read = await dialog.evaluate((el) => {
        const sheet = el.querySelector('[data-testid="stand-ins-sheet"]');
        const r = el.getBoundingClientRect();
        const paras = [...sheet.querySelectorAll(":scope > p")].map((p) => p.textContent.trim());
        return {
          width: Math.round(r.width), left: Math.round(r.left), top: Math.round(r.top),
          failed: Boolean(sheet.querySelector('[role="alert"]')),
          headings: [...sheet.querySelectorAll("h4")].map((h) => h.textContent.trim()),
          rows: sheet.querySelectorAll("li").length,
          lead: paras[0] ?? "",
          foot: paras.some((p) => p.startsWith("Cheapest printing of each")),
          overflow: el.scrollWidth - el.clientWidth,
          headTag: [...sheet.querySelector("section").querySelectorAll("span")]
            .find((s) => s.textContent.trim().startsWith("buy"))?.textContent.replace(/\s+/g, " ").trim() ?? null,
          // Every row's thumb is painted from the card's art, not left as its empty frame.
          // A row with nothing under its name draws no second line: its left cell is its name line.
          emptyRows: [...sheet.querySelectorAll("li")].filter((li) => !li.querySelector("p")).length,
          blankLines: [...sheet.querySelectorAll("li")].filter((li) => {
            if (li.querySelector("p")) return false;
            const cell = li.querySelector(":scope > div > div");
            const line = cell?.firstElementChild;
            return cell && line && cell.getBoundingClientRect().height > line.getBoundingClientRect().height + 1;
          }).length,
          bareThumbs: [...sheet.querySelectorAll("li")].filter((li) => {
            const thumb = li.querySelector('span[aria-hidden="true"]');
            return !getComputedStyle(thumb).backgroundImage.includes("url(");
          }).length,
        };
      });
      if (w.label === 1300) {
        report(`${tag} ${kind}: 640 and centred`, read.width === 640 && Math.abs(read.left - (1300 - 640) / 2) <= 1,
          `${read.width}px at ${read.left}`);
      } else {
        report(`${tag} ${kind}: a sheet from 52px`, read.width === 390 && read.top === 52, `${read.width}px at top ${read.top}`);
      }
      report(`${tag} ${kind}: read, not failed`, !read.failed, read.failed ? "failed state" : "ok");
      report(`${tag} ${kind}: the lead reads as a ${kind}`, LEAD[kind].test(read.lead), read.lead.slice(0, 70));
      report(`${tag} ${kind}: rows in groups, and the foot`, read.rows > 0 && read.headings.length > 0 && read.foot,
        `${read.rows} rows under ${read.headings.join(" / ")}`);
      report(`${tag} ${kind}: the head's tag is the row's`, read.headTag !== null && read.headTag === rowTag,
        `head ${read.headTag}, row ${rowTag}`);
      report(`${tag} ${kind}: every row's thumb carries its art`, read.bareThumbs === 0, `${read.bareThumbs} bare of ${read.rows}`);
      if (kind === "utility") {
        report(`${tag} utility: rows left with nothing say nothing`, read.emptyRows > 0 && read.blankLines === 0,
          `${read.emptyRows} rows with no line under the name, ${read.blankLines} holding an empty one`);
      }
      report(`${tag} ${kind}: nothing wider than the sheet`, read.overflow <= 0, `${read.overflow}px`);
      if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/swap-sheet-${kind}-${w.label}.png` });
      await dialog.getByRole("button", { name: "Close cheaper stand-ins" }).click();
      await dialog.waitFor({ state: "detached", timeout: 5_000 });
    }
  }
} catch (error) {
  failures += 1;
  console.error(" FAIL  the run threw —", error?.message ?? error);
} finally {
  try {
    if (deckId) {
      await pool.query(`delete from decks where id = $1 and user_id = $2`, [deckId, userId]);
      console.log(`fixture deck ${deckId} deleted`);
    }
  } catch (error) {
    failures += 1;
    console.error(` FAIL  could not delete fixture deck ${deckId}; remove it by hand (${error?.message ?? error})`);
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      await pool.end();
    }
  }
}
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
