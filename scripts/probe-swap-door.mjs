/**
 * probe:swap-door — the card modal's door to a Shopping row's stand-ins, and card → sheet → card
 * (swap tools PR 4c, the addendum's §2 and §3), at 1300x900 and 390x844.
 *
 * It presses through the path a reader takes. A Shopping row opens its card, and the door draws
 * under the price tag (desktop) or as a strip under the art header (phone), with the limit line in
 * `--warning` when over. The same card opened from All draws no door (audit F17). The door opens
 * the sheet OVER the card, and the card stays the same DOM node under it. The sheet's way back
 * names the card. On the phone the three layers start at 52, 96 and 140 (F16); on desktop a
 * stand-in sits 80px below its original. Escape peels one layer at a time: to the stand-in's name,
 * then to the door. After a Take the door says what came in, and Escape lands on the receipt.
 *
 * FIXTURE. The sheet probe's: a brew of unowned cards above $10 at the newest price run. The deck
 * is deleted in a `finally`, and the account's About row is put back as the run found it. Point it
 * at local-dev, never production.
 */
import { readFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { onPage, onPageRole } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";
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

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
  // A short desktop window: the layers stepped down must still end above the fold.
  { label: "1280x720", viewport: { width: 1280, height: 720 } },
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
  aboutPrior = await captureAboutSeen(userId);
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
    `insert into decks (user_id, name, commander_oracle_id) values ($1, 'probe · swap door', $2) returning id`,
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

const q = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const swapButton = (page, name) =>
  onPageRole(page, "button", new RegExp(`^Cheaper stand-ins for ${q(name)},`)).first();
const cardDialogs = (page) => page.locator('[role="dialog"][aria-labelledby^="card-modal-title"]');
const sheetDialog = (page) => page.getByRole("dialog", { name: "Cheaper stand-ins" });
const focused = (page) => page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
const topOf = async (loc) => Math.round((await loc.boundingBox())?.y ?? -1);

/** The door's limit line: its words, and whether its painted ink is the token named. */
function readDoor(door, token) {
  return door.evaluate((el, name) => {
    const line = el.querySelector("span");
    const ref = document.createElement("span");
    ref.style.color = `var(${name})`;
    el.appendChild(ref);
    const want = getComputedStyle(ref).color;
    ref.remove();
    const ink = getComputedStyle(line).color;
    return { text: line?.textContent ?? "", ink, want, inkMatches: ink === want };
  }, token);
}

/** Open the row's card from its name, which is what a reader presses. */
async function openRowCard(page, name) {
  // The name's own text: the name trigger on desktop, and the row's press on a phone, both open the card.
  // The phone's list is windowed, so a row below the fold is scrolled into being first.
  const target = onPage(page, "span, button").filter({ hasText: new RegExp(`^${q(name)}$`) }).filter({ visible: true }).first();
  for (let i = 0; i < 8 && (await target.count()) === 0; i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(250);
  }
  await target.click();
  const card = cardDialogs(page).first();
  await card.waitFor({ timeout: 20_000 });
  return card;
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
  const cut = fx.picks.land;
  console.log(`fixture ${deckId}: the door on ${cut}`);

  for (const w of WIDTHS) {
    const tag = `${w.label}`;
    const phone = w.label === 390;
    await page.setViewportSize(w.viewport);

    // No door on a card opened from All (F17): a deck alone does not mean Shopping.
    await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
    await onPageRole(page, "button", /^All \d+/).filter({ visible: true }).first().click();
    let card = await openRowCard(page, cut);
    await page.waitForTimeout(500);
    const doorsFromAll = await card.locator('[data-testid="stand-in-door"]').filter({ visible: true }).count();
    report(`${tag} no door from All`, doorsFromAll === 0, `${doorsFromAll} doors`);
    await page.keyboard.press("Escape");
    await card.waitFor({ state: "detached", timeout: 5_000 });

    // The door, from a Shopping row: under the limit first, in --fg-faint, with the same link.
    await onPageRole(page, "button", /^Shopping \d+/).filter({ visible: true }).first().click();
    await swapButton(page, cut).waitFor({ timeout: 20_000 });
    const underCard = await openRowCard(page, fx.under);
    const underDoor = underCard.locator('[data-testid="stand-in-door"]').filter({ visible: true });
    await underDoor.waitFor({ timeout: 10_000 });
    const underRead = await readDoor(underDoor, "--fg-faint");
    const underLink = await underDoor.getByRole("button", { name: /See cheaper stand-ins/ }).count();
    report(`${tag} door: under the limit, in --fg-faint, with the link`,
      /^under your \$\d+ limit$/.test(underRead.text) && underRead.inkMatches && underLink === 1,
      `${underRead.text}, ink ${underRead.ink} against ${underRead.want}, ${underLink} link`);
    await page.keyboard.press("Escape");
    await underCard.waitFor({ state: "detached", timeout: 5_000 });
    card = await openRowCard(page, cut);
    const door = card.locator('[data-testid="stand-in-door"]').filter({ visible: true });
    await door.waitFor({ timeout: 10_000 });
    const doorRead = await readDoor(door, "--warning");
    report(`${tag} door: over the limit, in --warning`, /^over your \$\d+ limit$/.test(doorRead.text) && doorRead.inkMatches,
      `${doorRead.text}, ink ${doorRead.ink} against ${doorRead.want}`);
    if (phone) {
      const strip = await door.boundingBox();
      report(`${tag} door: a 44px strip`, strip && Math.round(strip.height) >= 44, `${strip?.height}px`);
    }
    const link = door.getByRole("button", { name: /See cheaper stand-ins/ });
    if (phone) {
      const lb = await link.boundingBox();
      report(`${tag} door: a 44px target`, lb && Math.round(lb.height) >= 44, `${lb?.height}px`);
    }
    const shot = async (name) => {
      if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/swap-door-${name}-${w.label}.png` });
    };
    await shot("over");
    // Marked so its return can be told from a remount: the same node keeps its scroll.
    await card.evaluate((el) => { el.dataset.probeHeld = "1"; });
    const cardTop = await topOf(card);

    // Card → sheet: the sheet opens OVER the card, and the card stays under it.
    await link.click();
    const sheet = sheetDialog(page);
    await sheet.waitFor({ timeout: 10_000 });
    await page.waitForFunction(() => document.querySelector('[data-testid="stand-ins-sheet"] h4'), null, { timeout: 30_000 });
    const held = await page.evaluate(() => {
      const el = document.querySelector('[data-probe-held="1"]');
      return { mounted: el !== null, inert: el?.closest("[inert]") !== null };
    });
    report(`${tag} sheet over card: the card stays mounted and inert`, held.mounted && held.inert, JSON.stringify(held));
    const back = phone
      ? sheet.getByRole("button", { name: `Back to ${cut}` })
      : sheet.getByRole("button", { name: `Back to ${cut}` }).filter({ hasText: cut });
    report(`${tag} sheet over card: its way back names the card`, await back.isVisible(), phone ? "× Back to …" : "← pill");
    await shot("sheet-over-card");
    if (!phone) {
      const box = await sheet.boundingBox();
      report(`${tag} the sheet over the card ends above the fold`, box && box.y + box.height <= w.viewport.height,
        `bottom ${Math.round((box?.y ?? 0) + (box?.height ?? 0))} of ${w.viewport.height}`);
    }

    // Sheet → stand-in: a third layer.
    const standInName = (await sheet.locator("li button").first().textContent())?.trim();
    await sheet.locator("li button").first().click();
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"][aria-labelledby^="card-modal-title"]').length === 2, null, { timeout: 15_000 });
    const topY = await topOf(cardDialogs(page).nth(1));
    // The phone's stepped depths (52 / 96 / 140) were retired by stacked sheets R1; the
    // stacked-sheets plan's walk measures that geometry, and no layout probe re-asserts it.
    if (!phone) {
      const box = await cardDialogs(page).nth(1).boundingBox();
      const room = Math.min(80, Math.floor((w.viewport.height - (box?.height ?? 0)) / 2 - 8));
      report(`${tag} the stand-in sits 80px below its original, or as far as the window allows`,
        Math.abs(topY - cardTop - room) <= 1, `${cardTop} → ${topY}, room ${room}`);
      report(`${tag} the stand-in ends above the fold`, box && box.y + box.height <= w.viewport.height,
        `bottom ${Math.round((box?.y ?? 0) + (box?.height ?? 0))} of ${w.viewport.height}`);
    }
    const scrim = await cardDialogs(page).nth(1).evaluate((el) => {
      const wrap = el.parentElement;
      const ref = document.createElement("span");
      ref.style.color = "color-mix(in oklab, var(--bg) 60%, transparent)";
      document.body.appendChild(ref);
      const want = getComputedStyle(ref).color;
      ref.remove();
      return { got: getComputedStyle(wrap).backgroundColor, want };
    });
    report(`${tag} the stand-in layer draws its own 60% scrim`, scrim.got === scrim.want, `${scrim.got} against ${scrim.want}`);
    const footer = await cardDialogs(page).nth(1).locator('[data-testid="stand-in-footer"]').filter({ visible: true }).count();
    report(`${tag} the stand-in carries the Take footer`, footer === 1, `${footer}`);

    // Escape peels one layer at a time.
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"][aria-labelledby^="card-modal-title"]').length === 1, null, { timeout: 5_000 });
    await page.waitForTimeout(200);
    report(`${tag} Escape: to the sheet, on the stand-in's name`, (await sheet.isVisible()) && (await focused(page)) === standInName,
      `focus on ${await focused(page)}`);
    await page.keyboard.press("Escape");
    await sheet.waitFor({ state: "detached", timeout: 5_000 });
    await page.waitForTimeout(300);
    const returned = await page.evaluate(() => {
      const el = document.querySelector('[data-probe-held="1"]');
      return { same: el !== null, inert: el?.closest("[inert]") !== null };
    });
    report(`${tag} Escape: to the same card, live again`, returned.same && !returned.inert, JSON.stringify(returned));
    const onDoor = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName === "BUTTON" && el.closest('[data-testid="stand-in-door"]') !== null;
    });
    report(`${tag} Escape: focus on the door's link`, onDoor, onDoor ? "the door's button" : `focus on <${await page.evaluate(() => document.activeElement?.tagName)}>`);

    // Take from the sheet opened over the card: the door then says what came in.
    await link.click();
    await sheet.waitFor({ timeout: 10_000 });
    await page.waitForFunction(() => document.querySelector('[data-testid="stand-ins-sheet"] h4'), null, { timeout: 30_000 });
    const toBuy = sheet.locator("li").filter({ has: page.getByRole("button", { name: /^Take / }) }).first();
    const addName = (await toBuy.locator("button").first().textContent())?.trim();
    await toBuy.getByRole("button", { name: /^Take / }).click();
    await sheet.locator('[data-testid="stand-in-taken"]').waitFor({ timeout: 20_000 });
    await page.keyboard.press("Escape");
    await sheet.waitFor({ state: "detached", timeout: 5_000 });
    const swapped = card.locator('[data-testid="stand-in-door"]').filter({ visible: true });
    await swapped.waitFor({ timeout: 10_000 });
    const swappedText = (await swapped.textContent())?.trim();
    await shot("swapped");
    const hasLink = await swapped.getByRole("button").count();
    report(`${tag} after Take: the door says what came in, and is not a control`,
      swappedText === `swapped out · ${addName} is in` && hasLink === 0, `${swappedText}, ${hasLink} controls`);
    // The swapped line draws while the sheet is still up; the card is live again a render after it goes.
    await page.waitForFunction(() => document.querySelector('[data-probe-held="1"]')?.closest("[inert]") === null, null, { timeout: 5_000 });
    await page.keyboard.press("Escape");
    await cardDialogs(page).first().waitFor({ state: "detached", timeout: 5_000 });
    const receipt = onPage(page, '[data-testid="swap-receipt"]:visible').first();
    await receipt.waitFor({ timeout: 15_000 });
    report(`${tag} Escape again: the receipt`, ((await receipt.textContent()) ?? "").includes(addName ?? "?"), (await receipt.textContent())?.slice(0, 60));
    await page.waitForTimeout(200);
    const onUndo = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName === "BUTTON" && el.closest('[data-testid="swap-receipt"]') !== null;
    });
    report(`${tag} Escape again: focus on the receipt's Undo swap`, onUndo, onUndo ? "Undo swap" : `focus on <${await page.evaluate(() => document.activeElement?.tagName)}>`);
    await receipt.getByRole("button", { name: /^Undo the swap/ }).click();
    const undone = await onPage(page, '[data-testid="swap-receipt"]').first().waitFor({ state: "detached", timeout: 15_000 }).then(() => true, () => false);
    const { rows: restored } = await pool.query(
      `select 1 from deck_cards dc join cards c using (oracle_id) where dc.deck_id = $1 and c.name = $2`, [deckId, cut]);
    report(`${tag} Undo swap from the receipt: the cut is back in the draft`, undone && restored.length === 1,
      `receipt ${undone ? "gone" : "still drawn"}, ${cut} ${restored.length ? "in" : "not in"} the draft`);
    if (!restored.length) break;
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
      await restoreAboutSeen(aboutPrior);
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
