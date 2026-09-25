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
 * two removal spells, all above $10 at the newest price run, plus one card under $10. Mana Vault is
 * the staple case (H4): its stand-ins include Sol Ring, a universal staple, whose row names it as
 * one, and sorts last in its type group (v2 D1). Each group shows five rows; every `Show all` is
 * PRESSED and read back for the count it names, `aria-expanded` and its height. An unowned
 * card is a Shopping row. The deck is deleted in a `finally`, and the account's About row is put back as the run found it. Needs a server with
 * `SWAP_TOOLS_ENABLED=true`. Point it at `local-dev`, never production.
 */
import { readFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { onPage, onPageRole, PAGE } from "./lib/surface.mjs";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

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
  // H4 (PR 6): Sol Ring is a universal staple and a ramp stand-in for Mana Vault, so its row says
  // `staple, any commander` where a spell's row quotes the commander's figure.
  staple: ["Mana Vault"],
};
/** How each kind's lead opens, from the copy module's own templates. */
const LEAD = {
  land: /^Every land here makes /,
  fetch: /^Every land here finds a /,
  spell: /^Every card here is /,
  utility: /^Every land here makes .*and each gives up /,
  staple: /^Every card here is ramp /,
};
const STAPLE_FACT = "staple, any commander";
/** v2 D1 (addendum §1b): type groups only, and a land is offered only lands. */
const SAME_TYPE = /^same type · [a-z]+$/;
const LAND_GROUP = "same type · lands";
const SHOWN = 5;

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

let failures = 0;
/** The About row as the run found it, so the `finally` can put it back. */
let aboutPrior = null;
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
  // What was there is captured first and put back in the `finally`.
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  const prior = await pool.query(`select about_version_seen from user_prefs where user_id = $1`, [userId]);
  aboutPrior = { userId, existed: prior.rowCount > 0, value: prior.rows[0]?.about_version_seen ?? null };
  await pool.query(
    `insert into user_prefs (user_id, about_version_seen) values ($1, $2)
       on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, $2)`,
    [userId, version],
  );
  await clearAboutSheet(page, userId);
  return userId;
}


/** The first named card the account does not own whose every live non-foil price is above $10, so its row draws a ⇄. */
async function firstUnowned(userId, names) {
  const { rows } = await pool.query(
    `with newest as (select max(as_of) t from printing_prices)
     select c.oracle_id, c.name from cards c
      where c.name = any($2::text[])
        and not exists (select 1 from collection_items ci where ci.user_id = $1 and ci.oracle_id = c.oracle_id)
        and exists (select 1 from printings p join printing_prices pp on pp.scryfall_id = p.scryfall_id, newest
                     where p.oracle_id = c.oracle_id and pp.as_of = newest.t and pp.price_cents is not null)
        and not exists (select 1 from printings p join printing_prices pp on pp.scryfall_id = p.scryfall_id, newest
                         where p.oracle_id = c.oracle_id and pp.as_of = newest.t and pp.price_cents <= 1000)`,
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
    if (!picks[kind]) throw new Error(`No ${kind} fixture is unowned and above $10: ${names.join(", ")}.`);
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
          // Each row's name and its fact line, for the staple reading (H4).
          lines: [...sheet.querySelectorAll("li")].map((li) => li.textContent.replace(/\s+/g, " ").trim()),
          emptyRows: [...sheet.querySelectorAll("li")].filter((li) => !li.querySelector("p")).length,
          blankLines: [...sheet.querySelectorAll("li")].filter((li) => {
            if (li.querySelector("p")) return false;
            // The name line is the thumb's parent, and the left cell is the name line's parent, however deep
            // the row wraps them (4b puts a grid between the <li> and the cell).
            const line = li.querySelector('span[aria-hidden="true"]')?.parentElement;
            const cell = line?.parentElement;
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
      // D1: the groups are types. A land or fetch draws the one lands group; a spell draws its own type
      // first and `other types` second, when it draws both.
      const landish = kind === "land" || kind === "fetch" || kind === "utility";
      report(`${tag} ${kind}: type groups, its own type first`,
        // The whole shape, not the first heading: one same-type group at most and first, then one `other
        // types` at most. A collapse into one group, or a second same-type group, fails here.
        landish ? read.headings.length === 1 && read.headings[0] === LAND_GROUP
          : (read.headings.length === 1 && (SAME_TYPE.test(read.headings[0]) || read.headings[0] === "other types"))
            || (read.headings.length === 2 && SAME_TYPE.test(read.headings[0]) && read.headings[1] === "other types"),
        read.headings.join(" / "));
      // D1 with Hugh's Q3: five rows, then a text button that expands the group in place. PRESSED, on every
      // group long enough to carry one, and read back: the count it names, aria-expanded, its height.
      const toggles = await dialog.locator("section").evaluateAll((secs) => secs.map((sec) => ({
        rows: sec.querySelectorAll("li").length,
        label: sec.querySelector("button[aria-expanded]")?.textContent.replace(/[▾▴]/g, "").trim() ?? null,
      })));
      const long = toggles.filter((t) => t.label);
      report(`${tag} ${kind}: a group shows ${SHOWN}, and only a longer one carries Show all`,
        toggles.every((t) => (t.label ? t.rows === SHOWN : t.rows <= SHOWN)), toggles.map((t) => `${t.rows}${t.label ? `+${t.label}` : ""}`).join(", "));
      for (const [i, t] of toggles.entries()) {
        if (!t.label) continue;
        const section = dialog.locator("section").nth(i);
        const button = section.locator("button[aria-expanded]");
        const n = Number(/Show all (\d+)/.exec(t.label)?.[1]);
        const height = await button.evaluate((b) => b.getBoundingClientRect().height);
        await button.click();
        const opened = await section.evaluate((sec) => ({
          rows: sec.querySelectorAll("li").length,
          expanded: sec.querySelector("button[aria-expanded]").getAttribute("aria-expanded"),
        }));
        report(`${tag} ${kind}: Show all draws the ${n} it names, in place, ${w.label === 390 ? 44 : 34}px tall`,
          opened.rows === n && opened.expanded === "true" && Math.round(height) === (w.label === 390 ? 44 : 34),
          `${opened.rows} rows, expanded ${opened.expanded}, ${height}px`);
      }
      if (long.length === 0 && kind === "land") report(`${tag} land: a group long enough to carry Show all`, false, "none drawn");
      if (kind === "staple") {
        // Every group is open now, so a staple ranked past the first five is on the page. Staples sort last.
        const lines = await dialog.locator("section").evaluateAll((secs) => secs.map((sec) =>
          [...sec.querySelectorAll("li")].map((li) => li.textContent.replace(/\s+/g, " ").trim())));
        const sol = lines.flat().find((l) => l.startsWith("Sol Ring"));
        report(`${tag} staple: Sol Ring reads as a staple`, Boolean(sol?.includes(STAPLE_FACT)) && !sol.includes("%"),
          sol?.slice(0, 90) ?? "no Sol Ring row");
        report(`${tag} staple: staples sort last in their group`,
          lines.every((g) => g.every((l, j) => j === 0 || !g[j - 1].includes(STAPLE_FACT) || l.includes(STAPLE_FACT))),
          lines.map((g) => g.slice(-3).map((l) => l.slice(0, 18)).join(" / ")).join(" | "));
      }
      report(`${tag} ${kind}: nothing wider than the sheet`, read.overflow <= 0, `${read.overflow}px`);
      // v2, item 5: a stand-in row previews its card, desktop only by design, and the box draws ABOVE the
      // sheet it was asked for from. A PAINTED image, read after the 240ms delay, because the markup is
      // the same whether or not the catalog had a picture for the card.
      if (w.label === 1300) {
        const rowEl = dialog.locator('[data-testid="stand-in-row"]').first();
        // A sheet with no row drawn (or none visible) records the check as failed rather than throwing,
        // so the run still reaches its cleanup and its report.
        // Show all was pressed above, which scrolls the sheet to its foot: bring the first row back first.
        await rowEl.scrollIntoViewIfNeeded().catch(() => {});
        const rb = await rowEl.boundingBox().catch(() => null);
        if (rb) {
          await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
          await page.mouse.move(rb.x + rb.width / 2 + 4, rb.y + rb.height / 2);
        }
        const box = page.locator('[data-testid="hover-preview"]');
        const seen = rb ? await box.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false) : false;
        const shown = seen ? await box.evaluate((el) => {
          const sheet = document.querySelector('[data-testid="stand-ins-sheet"]')?.closest(".fixed");
          return {
            painted: getComputedStyle(el).backgroundImage.includes("url("),
            above: Number(getComputedStyle(el).zIndex) > Number(sheet ? getComputedStyle(sheet).zIndex : 0),
          };
        }) : null;
        report(`${tag} ${kind}: a stand-in row previews its card, above the sheet`, Boolean(shown?.painted && shown?.above),
          shown ? `painted ${shown.painted}, above ${shown.above}` : rb ? "no preview" : "no stand-in row to hover");
        await page.mouse.move(8, 8);
      }
      if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/swap-sheet-${kind}-${w.label}.png` });
      // The sheet mounts inside the row's click target, and React bubbles a portal's events through it:
      // closing it from the backdrop must not open the row's card as well. The panel stops its own clicks,
      // so the backdrop is the press that reaches the row.
      await page.mouse.click(8, 8);
      const closed = await dialog.waitFor({ state: "detached", timeout: 5_000 }).then(() => true, () => false);
      await page.waitForTimeout(500);
      const dialogs = await page.getByRole("dialog").count();
      report(`${tag} ${kind}: the backdrop closes the sheet and opens nothing behind it`, closed && dialogs === 0,
        `sheet ${closed ? "closed" : "still open"}, ${dialogs} dialogs open`);
      for (let i = 0; i < 3 && (await page.getByRole("dialog").count()) > 0; i++) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
      }
    }

    // ── PR 4b: a stand-in's card stacked over the sheet, Take, the receipt, Undo swap, a refusal ──
    const cut = fx.picks.spell;
    const openSheet = async () => {
      await swapButton(page, cut).click();
      await page.waitForFunction(() => document.querySelector('[data-testid="stand-ins-sheet"] h4'), null, { timeout: 30_000 });
      return page.getByRole("dialog", { name: "Cheaper stand-ins" });
    };
    // The label of the Shopping section an element sits in: the section wrapper's first label.
    const sectionOf = (loc) => loc.evaluate((el) =>
      el.closest("div.mb-\\[16px\\]")?.querySelector("h3, span")?.textContent?.trim() ?? null);
    const cutSection = await sectionOf(swapButton(page, cut));
    let sheet = await openSheet();

    // A stand-in's name opens its card stacked, with the Take footer, and the sheet stays under it.
    const firstName = await sheet.locator("li button").first().textContent();
    await sheet.locator("li button").first().click();
    const card = page.locator('[role="dialog"][aria-labelledby="card-modal-title"]');
    await card.waitFor({ timeout: 15_000 });
    const footer = await card.locator('[data-testid="stand-in-footer"]').filter({ visible: true }).count();
    report(`${tag} stacked: the card draws the Take footer`, footer === 1, `${footer} visible footer(s) on ${firstName}`);
    report(`${tag} stacked: the sheet stays under the card`, await sheet.isVisible(), "sheet mounted");
    if (w.label === 1300) {
      // The pager's own position, the span between Prev and Next (the footer carries mono text too).
      const pos = (await card.getByRole("button", { name: "Next card" }).locator("xpath=preceding-sibling::span[1]").textContent())?.trim();
      report(`${tag} stacked: Prev/Next page the sheet's list`, /^1 of \d+$/.test(pos ?? ""), `position ${pos}`);
      await card.getByRole("button", { name: "Next card" }).click();
      await page.waitForTimeout(800);
      const next = await card.locator('[data-testid="stand-in-footer"]').filter({ visible: true }).count();
      report(`${tag} stacked: the next stand-in keeps its footer`, next === 1, `${next} footer(s)`);
    }
    await page.keyboard.press("Escape");
    await card.waitFor({ state: "detached", timeout: 5_000 });

    // Take the first stand-in to buy.
    const takes = sheet.getByRole("button", { name: /^Take .* in place of / });
    const before = await takes.count();
    const toBuy = sheet.locator("li").filter({ has: page.locator("text=/^buy/") }).first();
    const addName = (await toBuy.locator("button").first().textContent())?.trim();
    await toBuy.getByRole("button", { name: /^Take / }).click();
    const landed = await sheet.locator('[data-testid="stand-in-taken"]').waitFor({ timeout: 20_000 }).then(() => null, async () =>
      (await sheet.locator('[role="alert"], [data-testid="stand-in-refused"]').allTextContents()).join(" | ") || "nothing drawn");
    if (landed !== null) throw new Error(`Take on ${addName} landed no taken row: ${landed}`);
    report(`${tag} take: the taken row, and Take put away on the others`, (await takes.count()) === 0 && before > 1,
      `${before} Take buttons before, ${await takes.count()} after`);
    report(`${tag} take: the note under the head`, await sheet.getByText(/has left the draft/).isVisible(), "takenNote drawn");
    const draft = await pool.query(`select c.name from deck_cards dc join cards c using (oracle_id) where dc.deck_id = $1 and c.name = any($2::text[])`, [deckId, [cut, addName]]);
    const inDraft = draft.rows.map((r) => r.name);
    report(`${tag} take: the draft holds the add and not the cut`, inDraft.includes(addName) && !inDraft.includes(cut),
      `in the draft: ${inDraft.join(", ") || "neither"}`);
    await sheet.getByRole("button", { name: "Close cheaper stand-ins" }).click();

    // The receipt in the cut row's slot, then Undo swap from it.
    const receipt = onPage(page, '[data-testid="swap-receipt"]:visible').first();
    await receipt.waitFor({ timeout: 15_000 });
    report(`${tag} receipt: drawn in the list`, ((await receipt.textContent()) ?? "").includes(`${cut} → ${addName}`), (await receipt.textContent())?.slice(0, 70));
    // The receipt is the page's own note and draws at once; the row leaves when the revalidated page lands.
    const left = await swapButton(page, cut).waitFor({ state: "detached", timeout: 20_000 }).then(() => true, () => false);
    report(`${tag} receipt: the cut row has left the list`, left, left ? "no ⇄ for the cut" : "the cut's ⇄ is still drawn");
    const receiptSection = await sectionOf(receipt);
    report(`${tag} receipt: in the section the cut sat in`, cutSection !== null && receiptSection === cutSection,
      `cut in ${cutSection}, receipt in ${receiptSection}`);
    const rbox = await receipt.boundingBox();
    if (w.label === 390) report(`${tag} receipt: 44px tall`, rbox && Math.round(rbox.height) >= 44, `${rbox?.height}px`);
    await receipt.getByRole("button", { name: /^Undo the swap/ }).click();
    const back = await swapButton(page, cut).waitFor({ timeout: 20_000 }).then(() => true, () => false);
    const gone = await onPage(page, '[data-testid="swap-receipt"]').first().waitFor({ state: "detached", timeout: 10_000 }).then(() => true, () => false);
    report(`${tag} undo: the cut is back and the receipt gone`, back && gone, `cut ${back ? "back" : "missing"}, receipt ${gone ? "gone" : "still drawn"}`);

    // A refusal: the cut leaves the draft behind the sheet's back, and the take is refused with its cause.
    sheet = await openSheet();
    const { rows: [cutRow] } = await pool.query(
      `delete from deck_cards where deck_id = $1 and oracle_id = (select oracle_id from cards where name = $2) returning *`, [deckId, cut]);
    try {
      await sheet.getByRole("button", { name: /^Take / }).first().click();
      const alert = sheet.getByRole("alert");
      await alert.waitFor({ timeout: 20_000 });
      report(`${tag} refused: the panel names the cause`, /another tab/.test((await alert.textContent()) ?? ""), (await alert.textContent())?.slice(0, 60));
      report(`${tag} refused: Take stays live`, (await sheet.getByRole("button", { name: /^Take / }).count()) > 1, "Take still drawn");
    } finally {
      await pool.query(`insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, $3, $4) on conflict do nothing`,
        [cutRow.deck_id, cutRow.oracle_id, cutRow.quantity, cutRow.auto]);
    }
    await sheet.getByRole("button", { name: "Close cheaper stand-ins" }).click();
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
  }
  try {
    if (aboutPrior) {
      if (aboutPrior.existed) {
        await pool.query(`update user_prefs set about_version_seen = $2 where user_id = $1`, [
          aboutPrior.userId,
          aboutPrior.value,
        ]);
      } else {
        await pool.query(`delete from user_prefs where user_id = $1`, [aboutPrior.userId]);
      }
      console.log("About row restored");
    }
  } catch (error) {
    failures += 1;
    console.error(` FAIL  could not restore the About row (${error?.message ?? error})`);
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
