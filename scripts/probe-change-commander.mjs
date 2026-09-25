// Change commander's door and sheet, walked in a real browser at 1300x900 and 390x844 (PR 3).
//
// Every check here is a fact about laid-out geometry or about a press, which jsdom has neither of:
// the joined plate's drawn box and its 44px halves, the sheet at 700, a row's 56x41 thumb, the
// figure opening the cards it counts, Choose replacing the list with the confirm and Back putting
// it back, and the press that writes the new commander: read back from the database, not the DOM.
//
// It builds its own fixture: a committed deck, under the account it signs in as, led by a mono-green
// legend and holding three cards that another mono-green commander's decks run, so the figure has
// something to count. It deletes the deck in a finally. Point it at `local-dev` with a server started
// with CHANGE_COMMANDER_ENABLED=true, **never production**.
//
// Run: `node scripts/probe-change-commander.mjs` (no package.json entry: that file is outside this
// lane's fence). PROBE_BASE picks the server (default http://localhost:3000).

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

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
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}: ${detail}`);
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
    on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  return userId;
}

/** A committed mono-green deck holding three cards a real mono-green candidate's decks run. */
async function buildFixture(userId) {
  const [lead] = await sql`
    select c.oracle_id from cards c join commander_support cs on cs.commander_oracle_id = c.oracle_id
    where c.commander_legal and c.color_identity = '{G}' and c.type_line ilike 'Legendary Creature%'
      and cs.synergy_state = 'ok' and cs.deck_count >= 20
    order by cs.deck_count desc, c.oracle_id limit 1`;
  const [target] = await sql`
    select cs.commander_oracle_id as oracle_id from commander_support cs
    join cards c on c.oracle_id = cs.commander_oracle_id
    where c.commander_legal and c.color_identity = '{G}' and cs.synergy_state = 'ok' and cs.deck_count >= 20
      and cs.commander_oracle_id <> ${lead.oracle_id}
    order by cs.deck_count desc, cs.commander_oracle_id limit 1`;
  const hits = await sql`
    select sc.oracle_id from commander_support_cards sc join cards k on k.oracle_id = sc.oracle_id
    where sc.commander_oracle_id = ${target.oracle_id} and k.color_identity <@ '{G}'::text[]
      and k.type_line not ilike '%Land%' and sc.oracle_id not in (select oracle_id from format_staples)
    order by sc.oracle_id limit 3`;
  const [deck] = await sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${userId}, 'probe:change-commander', ${lead.oracle_id}) returning id`;
  for (const h of hits) {
    await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}, ${h.oracle_id}, 1)`;
  }
  const [v] = await sql`
    insert into deck_versions (deck_id, number, commander_oracle_id) values (${deck.id}, 1, ${lead.oracle_id})
    returning id`;
  for (const h of hits) {
    await sql`insert into deck_version_cards (version_id, oracle_id, quantity) values (${v.id}, ${h.oracle_id}, 1)`;
  }
  return { deckId: deck.id, lead: lead.oracle_id };
}

const rect = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { w: r.width, h: r.height, top: r.top, left: r.left };
});

async function walk(page, width, fixture) {
  const tag = `@${width.label}`;
  await page.setViewportSize(width.viewport);
  await page.goto(`${BASE}/decks/${fixture.deckId}`, { waitUntil: "domcontentloaded" });

  const door = onPage(page, '[data-testid="change-commander-door"]').filter({ visible: true });
  await door.first().waitFor({ state: "visible", timeout: 30_000 });
  report(`door ${tag}`, (await door.count()) === 1, `${await door.count()} visible door(s)`);

  // The plate is the door's first child span: 26px on its drawn axis.
  const plate = await rect(door.locator("span").first());
  if (width.label === 1300) report(`plate height ${tag}`, Math.round(plate.h) === 26, `${plate.h}px`);
  else report(`plate ${tag}`, Math.round(plate.w) === 26 && Math.round(plate.h) === 53, `${plate.w}x${plate.h}px`);
  for (const b of await door.locator("button").all()) {
    const r = await rect(b);
    report(`half target ${tag}`, r.h >= 44 && r.w >= 44 - 0.5 || (width.label === 1300 && r.h >= 44), `${Math.round(r.w)}x${Math.round(r.h)}px`);
  }

  // Press the door: the sheet opens at 700 on desktop, with rows.
  await door.getByRole("button", { name: "Change commander" }).click();
  const dialog = page.getByRole("dialog", { name: "Change commander" });
  await dialog.waitFor({ state: "visible" });
  const rows = dialog.locator('[data-testid="change-commander-row"]');
  await rows.first().waitFor({ state: "visible", timeout: 30_000 });
  if (width.label === 1300) {
    const d = await rect(dialog);
    report(`sheet width ${tag}`, Math.round(d.w) === 700, `${d.w}px`);
  }
  // The title is WHOLE: an ellipsized title reads innerText intact, so width is what tells.
  const title = await dialog.locator("h2").first().evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, text: el.textContent }));
  report(`title whole ${tag}`, title.sw <= title.cw, `"${title.text}" ${title.sw}/${title.cw}px`);
  const count = await rows.count();
  report(`rows ${tag}`, count > 0, `${count} row(s)`);
  const thumb = await rect(rows.first().locator("span[aria-hidden=true]").first());
  report(`thumb ${tag}`, Math.round(thumb.w) === 56 && Math.round(thumb.h) === 41, `${thumb.w}x${thumb.h}px`);

  // The row's pip run is laid out as a run: a className that replaced CostPips' own would leave
  // an inline span with the pips touching, and every markup assertion would still pass.
  const run = await rows.first().evaluate((el) => {
    // The mana-value comparison's sibling wraps the first half's run.
    const compare = [...el.querySelectorAll("span")].find((x) => /^\((same as|\d+ (less|more) than) /.test(x.textContent ?? ""));
    const box = compare?.previousElementSibling?.lastElementChild;
    return box ? { display: getComputedStyle(box).display, gap: getComputedStyle(box).columnGap } : null;
  });
  report(`pip run ${tag}`, run?.display === "flex" && run.gap === "3px", JSON.stringify(run));

  // The figure opens the cards it counts, and says so.
  const figure = rows.first().locator("button[aria-expanded]");
  await figure.click();
  report(`figure opens ${tag}`, (await figure.getAttribute("aria-expanded")) === "true", "aria-expanded");
  const panel = page.locator(`#${await figure.getAttribute("aria-controls")}`);
  report(`figure names ${tag}`, (await panel.locator("button").count()) > 0, `${await panel.locator("button").count()} name(s)`);

  // Choose replaces the list with the confirm; Back puts the same list back.
  await rows.first().locator("[data-choose]").click();
  const back = dialog.getByRole("button", { name: "Back to the list" });
  report(`confirm ${tag}`, await back.isVisible(), "Back to the list visible");
  report(`list hidden ${tag}`, !(await rows.first().isVisible()), "rows hidden behind the confirm");
  // The actions carry side padding: a button sized by its label alone reads as text on a slab.
  for (const name of [/^Make .* commander$/, "Back to the list"]) {
    const pad = await dialog.getByRole("button", { name }).evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft));
    report(`action padding ${tag}`, pad >= 12, `${name}: ${pad}px`);
  }
  await back.click();
  report(`back ${tag}`, (await rows.count()) === count && (await rows.first().isVisible()), `${await rows.count()} row(s) again`);
  report(`back keeps the open row ${tag}`, (await figure.getAttribute("aria-expanded")) === "true", "still open");

  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
}

async function main() {
  const [{ id: branch }] = await sql`select current_setting('neon.branch_id', true) as id`;
  if (!branch || branch === PRODUCTION || branch === STAGING || process.env.VERCEL_ENV === "production") {
    throw new Error(`refusing to write a fixture to ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev`);
  }
  await clerkSetup();
  const browser = await chromium.launch();
  let fixture = null;
  try {
    const page = await browser.newPage();
    const userId = await signIn(page);
    fixture = await buildFixture(userId);
    for (const width of WIDTHS) await walk(page, width, fixture);

    // The write, once, at desktop: the live commander moves, and the header says so.
    await page.setViewportSize(WIDTHS[0].viewport);
    await page.goto(`${BASE}/decks/${fixture.deckId}`, { waitUntil: "domcontentloaded" });
    const door = onPage(page, '[data-testid="change-commander-door"]').filter({ visible: true });
    await door.getByRole("button", { name: "Change commander" }).click();
    const dialog = page.getByRole("dialog", { name: "Change commander" });
    const row = dialog.locator('[data-testid="change-commander-row"]').first();
    await row.waitFor({ state: "visible", timeout: 30_000 });
    await row.locator("[data-choose]").click();
    await dialog.getByRole("button", { name: /^Make .* commander$/ }).click();
    await dialog.waitFor({ state: "hidden", timeout: 30_000 });
    const [live] = await sql`select commander_oracle_id as c from decks where id = ${fixture.deckId}`;
    report("write", live.c !== fixture.lead, `commander ${live.c === fixture.lead ? "unchanged" : "moved"}`);
    const [v] = await sql`select commander_oracle_id as c from deck_versions where deck_id = ${fixture.deckId}`;
    report("write is a draft change", v.c === fixture.lead, "the version still holds the old commander");
  } finally {
    if (fixture) await sql`delete from decks where id = ${fixture.deckId}`;
    await browser.close();
  }
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
  });
