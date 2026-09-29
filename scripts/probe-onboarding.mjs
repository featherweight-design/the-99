// probe:onboarding — the first-run upload flow, pressed, at 390x844 and 1300x900.
//
// Prod walk 2026-09-28 (Hugh, first run on an empty account). Every ruling here is a fact
// about laid-out geometry or painted pixels, which jsdom has neither of:
//
//   3  desktop: the card fan stays where it was when the step's text column grows, through
//      the paste panel and through a whole review screen. The step card was `items-center`,
//      so the fan drifted to the middle of whatever the flow had drawn.
//   9  phone: `Unmatched: N skipped` and `Parse errors: N` sit left over their lists. The
//      step card's phone `text-center` leaked into the review screen.
//   10 phone: the paste textarea fills its column. The same card's `items-center` shrank
//      the paste panel to its content.
//   4  the issue inspector's `No names match` state draws FILLED cards, so the front one
//      covers the one behind. It drew stroke-only rects, which read as crossing outlines.
//   5a a FIRST import (nothing to lose) confirms straight from Continue, holding it at a
//      disabled `Importing…`, with no Replace modal. A collection that exists by the confirm
//      (a second tab imported) makes the server write nothing and the flow open the REPLACE
//      modal instead: the skip is only as safe as "nothing to lose" is true on the server.
//   D9 the replace confirm is calm: no typed token, no --danger or --warning anywhere in the
//      resting dialog (read as resolved colours, not class names), focus on Keep current, a
//      now → after pair, and a button naming the matched count.
//   D10 the upload entry's replace note is plain and shows only over a collection.
//   D11 the phone review's exit is a 46px Cancel left of Continue, and the ‹ is gone. Embedded
//      in first run the card names the file, the fan steps aside and the bar is the card's
//      foot; on /collection/replace the bar is sticky above the tab bar.
//
// FIXTURE. First run shows only to an account with no collection, and both local-dev fixture
// accounts own ~2,700 rows, so this signs in as a DEDICATED empty account on Clerk's
// DEVELOPMENT instance (`onboard-probe+clerk_test@the99.app`, override with PROBE_EMAIL). The
// CSV is staging-shaped: about 3,100 real catalog names, 110 names no card carries (staging's
// uploads skip 0 to 133), and 3 malformed rows so both headings draw. Every run deletes the
// account's `csv_uploads` and `collection_items` in a `finally`, which returns it to first run.
// Point it at `local-dev`, NEVER production.
//
//   PROBE_BASE=http://localhost:3311 pnpm probe:onboarding
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { DATABASE_URL } = requireEnv(["DATABASE_URL", "CLERK_SECRET_KEY"]);
const EMAIL = process.env.PROBE_EMAIL ?? "onboard-probe+clerk_test@the99.app";
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const sql = neon(DATABASE_URL);
// The two branches this must never run against. `cleanup` deletes the signed-in account's whole
// collection and every upload it made, so the target is checked, and refused when it cannot be
// read, before any write (the rule `probe:overview-hold` follows).
const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

const VIEWPORTS = [
  { label: "phone 390x844", width: 390, height: 844, phone: true },
  { label: "desktop 1300x900", width: 1300, height: 900, phone: false },
];

// PROBE_SHOTS=<dir> also photographs each state at each width, for a PR body.
const SHOTS = process.env.PROBE_SHOTS;
async function shot(page, vp, name) {
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${vp.phone ? "390" : "1300"}-${name}.png`) });
}

let failures = 0;
function report(ok, name, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " PASS " : " FAIL "} ${name}${detail ? `  (${detail})` : ""}`);
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const result = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return { error: `sign-in status: ${attempt.status}` };
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return { userId: window.Clerk.user?.id };
    } catch (error) {
      return { error: error?.errors?.[0]?.longMessage ?? String(error) };
    }
  }, EMAIL);
  if (result.error) throw new Error(`Clerk sign-in failed: ${result.error}`);
  return result.userId;
}

// The step card is found by its structure rather than a class list, so a changed utility
// cannot make the probe measure something else.
async function geometry(page) {
  return page.evaluate(() => {
    // The step card, found by the hidden fan carrying the "99". Not the upload input: the review
    // screen replaces it. The fan sits in a `display: contents` wrapper (it steps aside on the
    // phone while a review is open), so the card is the wrapper's parent and the text column is
    // the wrapper's next sibling.
    const fan =
      [...document.querySelectorAll('main [aria-hidden="true"]')].find(
        (el) => el.textContent?.includes("99") && el.getBoundingClientRect().height > 0,
      ) ?? null;
    const wrapper = fan?.parentElement ?? null;
    const card = wrapper?.parentElement ?? null;
    const column = wrapper?.nextElementSibling ?? null;
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const c = r(card);
    const f = r(fan);
    const col = r(column);
    return {
      found: Boolean(card && fan && column),
      fanTop: f && c ? f.top - c.top : null,
      fanHeight: f?.height ?? null,
      columnHeight: col?.height ?? null,
      columnLeft: col?.left ?? null,
      columnWidth: col?.width ?? null,
    };
  });
}

function csvFixture(names) {
  const quote = (s) => `"${s.replaceAll('"', '""')}"`;
  const lines = ["Name,Quantity"];
  for (const name of names) lines.push(`${quote(name)},1`);
  for (let i = 0; i < 110; i += 1) lines.push(`${quote(`Probe Nonexistent Card ${i}`)},1`);
  lines.push(`${quote("Sol Ring")},x`, `${quote("Command Tower")},two`, `,1`);
  const file = join(tmpdir(), `probe-onboarding-${process.pid}.csv`);
  writeFileSync(file, lines.join("\n"));
  return file;
}

async function cleanup(userId) {
  if (!userId) return;
  await sql`delete from collection_items where user_id = ${userId}`;
  await sql`delete from csv_uploads where user_id = ${userId}`;
  // The ranked lists this walk loads write the account's scores as they render, and a confirm
  // warms them again in `after()`, which can land once this has run. So clear, let a warm
  // still in flight finish, and clear again: the next run starts from an empty account.
  await sql`delete from commander_scores where user_id = ${userId}`;
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await sql`delete from commander_scores where user_id = ${userId}`;
}

async function walk(browser, vp, csvPath) {
  console.log(`\n── ${vp.label}`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const userId = await signIn(page);
  try {
    await cleanup(userId);
    await clearAboutSheet(page, userId);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await onPageRole(page, "button", "Upload a CSV").waitFor();

    const rest = await geometry(page);
    await shot(page, vp, "rest");
    report(rest.found, "found the step card, its fan and its text column");
    // First-run rulings 1 and 2: step 2 names both paths, and there is no import foot.
    report(await onPage(page, "text=Pick a commander or import a deck").first().isVisible(), "R1 locked step 2 names both paths");
    report(!(await onPage(page, "text=Already have a deck elsewhere?").count()), "R1 step 1 has no import foot");
    if (!vp.phone) {
      console.log(
        `  rest: fan top ${rest.fanTop}px in its card; text column ${rest.columnHeight}px against a ${rest.fanHeight}px fan`,
      );
    }

    // ── Paste a list
    await onPageRole(page, "button", "Paste a list").click();
    const textarea = onPageRole(page, "textbox", "Paste your card list");
    await textarea.waitFor();
    const paste = await geometry(page);
    await shot(page, vp, "paste");
    const ta = await textarea.boundingBox();
    if (!vp.phone) {
      report(paste.fanTop === rest.fanTop, "3  the fan holds its place when the paste panel opens", `rest ${rest.fanTop}px, paste ${paste.fanTop}px`);
    }
    report(
      ta && Math.abs(ta.width - paste.columnWidth) <= 1,
      "10 the paste textarea fills its column",
      `textarea ${ta?.width}px, column ${paste.columnWidth}px`,
    );
    if (vp.phone) {
      // The column sits in the card's 16px padding inside the page's 16px gutter, plus the
      // card's 1px border: 390 - 2 * (16 + 1 + 16) = 324.
      report(ta && ta.width >= vp.width - 2 * 33 - 1, "10 on the phone that is the page's width less its gutters", `${ta?.width}px`);
    }
    await onPageRole(page, "button", "Back").click();

    // ── A CSV through the file input
    await onPage(page, "input[aria-label='Upload collection CSV']").setInputFiles(csvPath);
    const unmatchedHeading = onPage(page, "text=/^Unmatched(:| names:)/").locator("visible=true").first();
    await unmatchedHeading.waitFor({ timeout: 60_000 });
    const review = await geometry(page);
    await shot(page, vp, "review");
    if (!vp.phone) {
      report(review.fanTop === rest.fanTop, "3  the fan holds its place under a whole review screen", `rest ${rest.fanTop}px, review ${review.fanTop}px`);
    }
    for (const pattern of [/^Unmatched(:| names:)/, /^Parse errors:/]) {
      const heading = onPage(page, `text=${pattern}`).locator("visible=true").first();
      const read = await heading.evaluate((el) => {
        // The matched node may be a width-specific <span> inside the heading block, so walk up
        // to the block whose parent also holds the list. The TEXT's own box is what the reader
        // sees placed, so the left edge is read off a Range over it, never the block (a
        // full-width block is left-aligned by construction whatever its text does).
        let block = el;
        while (block.parentElement && !block.parentElement.querySelector(":scope > ul")) block = block.parentElement;
        const list = block.parentElement?.querySelector(":scope > ul") ?? null;
        const range = document.createRange();
        range.selectNodeContents(el);
        const h = range.getBoundingClientRect();
        const l = list?.getBoundingClientRect();
        return {
          text: el.textContent,
          align: getComputedStyle(block).textAlign,
          headingLeft: h.left,
          listLeft: l?.left ?? null,
        };
      });
      report(
        read.listLeft !== null && read.align !== "center" && Math.abs(read.headingLeft - read.listLeft) <= 1,
        `9  "${read.text}" sits left over its list`,
        `align ${read.align}, heading ${Math.round(read.headingLeft)}px, list ${Math.round(read.listLeft)}px`,
      );
    }

    // ── The issue inspector, searched to no match
    await onPageRole(page, "button", /^View [\d,]+ issues?$/).click();
    // Scoped to the page: the shell's account sheet is also a dialog, and comes first.
    const dialog = onPageRole(page, "dialog");
    await dialog.waitFor();
    await dialog.getByRole("textbox").first().fill("zzqx no card is called this");
    await dialog.getByText(/^No names match/).waitFor();
    await shot(page, vp, "no-match");
    const fan = await dialog.locator("svg:has(rect)").first().evaluate((svg) => {
      const rects = [...svg.querySelectorAll("rect")].map((r) => getComputedStyle(r).fill);
      const box = svg.getBoundingClientRect();
      return { rects, width: box.width };
    });
    report(
      fan.rects.length === 3 && fan.rects.every((f) => f !== "none" && !/rgba\(0, 0, 0, 0\)/.test(f)),
      "4  the empty state's three cards are filled",
      fan.rects.join(" | "),
    );
    report(fan.width === (vp.phone ? 52 : 56), "4  the mark is the mock's size", `${fan.width}px`);
    await page.keyboard.press("Escape");
  } finally {
    await cleanup(userId);
    await context.close();
  }
}


// Holds every server action for `ms`, so the pending state is on screen long enough to read.
// A first import of two cards otherwise replaces and navigates inside one frame.
async function holdActions(page, ms) {
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

async function pasteToReview(page, text) {
  await onPageRole(page, "button", "Paste a list").click();
  await onPageRole(page, "textbox", "Paste your card list").fill(text);
  await onPageRole(page, "button", /^Preview/).click();
  const cont = onPageRole(page, "button", /^Continue to (import|replace)/);
  await cont.waitFor({ timeout: 60_000 });
  return cont;
}

async function firstImport(browser, vp) {
  console.log(`\n── ${vp.label}: the first import`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const userId = await signIn(page);
  try {
    // A. Empty collection: Continue confirms, holds at Importing…, and lands on the receipt.
    await cleanup(userId);
    await clearAboutSheet(page, userId);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const cont = await pasteToReview(page, "3 Sol Ring\n1 Command Tower");
    await holdActions(page, 1500);
    await cont.click();
    const held = onPageRole(page, "button", "Importing…");
    const heldSeen = await held.waitFor({ timeout: 1000 }).then(() => true, () => false);
    report(heldSeen && (await held.isDisabled()), "5a Continue holds at a disabled Importing… while the import runs");
    report(!(await onPageRole(page, "dialog").isVisible().catch(() => false)), "5a no Replace modal opens on a first import");
    await page.waitForURL(/\/collection\/replace\/summary\//, { timeout: 60_000 });
    const [{ n }] = await sql`select count(*)::int n from collection_items where user_id = ${userId}`;
    report(n > 0, "5a the first import wrote the collection", `${n} rows`);
    await page.unroute("**/*");

    // B. The preview says empty, but a collection exists by the confirm (a second tab
    // imported): the server writes nothing and the modal opens.
    await cleanup(userId);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const cont2 = await pasteToReview(page, "3 Sol Ring");
    const [card] = await sql`select oracle_id from cards where name = 'Command Tower' limit 1`;
    await sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${userId}, ${card.oracle_id}, 1, 'cmr')`;
    await cont2.click();
    const dialog = onPageRole(page, "dialog");
    const opened = await dialog.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    report(opened, "5a a collection found at the confirm opens the Replace modal instead");
    const warning = opened ? await dialog.innerText() : "";
    report(/Replace your collection\?/.test(warning) && /Replace with \d/.test(warning), "5a and it is the REPLACE variant, not the import one", warning.slice(0, 80).replace(/\s+/g, " "));
    const rows = await sql`select oracle_id from collection_items where user_id = ${userId}`;
    report(rows.length === 1 && rows[0].oracle_id === card.oracle_id, "5a and the confirm wrote nothing", `${rows.length} rows`);
    report(!/\/summary\//.test(page.url()), "5a and did not navigate to a receipt");
  } finally {
    await cleanup(userId);
    await context.close();
  }
}

// ── First-run R3: the calm replace (D9, D10, D11; design table first-run-calm-replace.md).
// Every rule here is geometry or a resolved style: whether the confirm carries any red or amber,
// where focus lands, whether the phone's Cancel sits beside Continue at 46px, whether the bar is
// sticky above the tab bar or in flow as the card's foot, and whether the fan steps aside.
const redOrAmber = (dialog) =>
  dialog.evaluate((root) => {
    const probe = document.createElement("div");
    document.body.append(probe);
    const resolve = (v) => {
      probe.style.color = `var(${v})`;
      return getComputedStyle(probe).color;
    };
    const hot = new Set([resolve("--danger"), resolve("--warning")]);
    probe.remove();
    const hits = [];
    for (const el of [root, ...root.querySelectorAll("*")]) {
      const cs = getComputedStyle(el);
      for (const prop of ["color", "backgroundColor", "borderTopColor", "borderLeftColor"]) {
        if (hot.has(cs[prop]) && el.getBoundingClientRect().width > 0) hits.push(`${el.tagName.toLowerCase()} ${prop}`);
      }
    }
    return hits;
  });

async function barOf(page) {
  // The confirm bar is the parent of the row holding Cancel and Continue.
  return onPageRole(page, "button", "Cancel").evaluate((cancel) => {
    const bar = cancel.parentElement.parentElement;
    const cs = getComputedStyle(bar);
    const tabbar = getComputedStyle(document.documentElement).getPropertyValue("--tabbar-h").trim();
    return { position: cs.position, bottom: cs.bottom, tabbar };
  });
}

async function calmReplace(browser, vp) {
  console.log(`\n── ${vp.label}: the calm replace`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const userId = await signIn(page);
  try {
    // A. Embedded in first run (5a).
    await cleanup(userId);
    await clearAboutSheet(page, userId);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await pasteToReview(page, "3 Sol Ring\n1 Command Tower");
    const card = onPage(page, "[data-reviewing]");
    const reviewing = onPage(page, "text=/^Reviewing · /i").first();
    if (vp.phone) {
      report(await reviewing.isVisible(), "D11 5a the card names what is under review", await reviewing.innerText().catch(() => "none"));
      const fan = await card.evaluate((el) => {
        const fanEl = el.querySelector('[aria-hidden="true"]');
        return fanEl ? fanEl.getBoundingClientRect().width : -1;
      });
      report(fan === 0, "D11 5a the fan steps aside while reviewing", `${fan}px`);
      const align = await card.evaluate((el) => getComputedStyle(el).alignItems);
      report(align === "flex-start", "D11 5a the card goes left-aligned", align);
      report(!(await onPage(page, "text=Review import").isVisible().catch(() => false)), "D11 5a the embedded review draws no header of its own");
      // The bar is the card's FOOT: flush to its sides and bottom, inside its 1px border.
      const flush = await onPageRole(page, "button", "Cancel").evaluate((c) => {
        const bar = c.parentElement.parentElement.getBoundingClientRect();
        const cardEl = c.closest("[data-reviewing]");
        const box = cardEl.getBoundingClientRect();
        const b = parseFloat(getComputedStyle(cardEl).borderLeftWidth);
        return { left: bar.left - box.left - b, right: box.right - b - bar.right, bottom: box.bottom - b - bar.bottom };
      });
      report(
        [flush.left, flush.right, flush.bottom].every((d) => Math.abs(d) <= 0.5),
        "D11 5a the confirm bar runs flush to the card's sides and foot",
        `inset ${flush.left.toFixed(1)} / ${flush.right.toFixed(1)} / ${flush.bottom.toFixed(1)}px`,
      );
    } else {
      report(!(await reviewing.isVisible().catch(() => false)), "D11 desktop keeps the card as it was: no REVIEWING line");
    }
    const cancel = onPageRole(page, "button", "Cancel");
    const cont = onPageRole(page, "button", /^Continue to (import|replace)/);
    const [cb, nb] = [await cancel.boundingBox(), await cont.boundingBox()];
    report(cb && nb && Math.abs(cb.y - nb.y) < 2 && cb.x < nb.x, "D11 Cancel sits left of Continue on one row", cb && nb ? `cancel ${Math.round(cb.x)},${Math.round(cb.y)} continue ${Math.round(nb.x)},${Math.round(nb.y)}` : "missing");
    if (vp.phone) report(cb && Math.round(cb.height) === 46, "D11 the phone's Cancel is a 46px hairline", cb ? `${cb.height}px` : "missing");
    const embeddedBar = await barOf(page);
    report(embeddedBar.position !== "sticky", "D11 5a the bar is the card's foot, in flow", embeddedBar.position);
    await shot(page, vp, "calm-embedded-review");
    await cancel.click();
    report(await onPageRole(page, "button", "Upload a CSV").isVisible(), "D11 Cancel returns step 1 to its entries");
    // The flow reports a closed review from an effect, a render after the entries return.
    const gone = await onPage(page, "[data-reviewing]").waitFor({ state: "detached", timeout: 5000 }).then(() => true, () => false);
    report(gone, "D11 and the REVIEWING state is gone");

    // B. /collection/replace with nothing to replace: the page is how a collection starts.
    await page.goto(`${BASE}/collection/replace`, { waitUntil: "networkidle" });
    report(await onPageRole(page, "heading", "Add your collection").first().isVisible(), "copy the replace page reads Add your collection at 0 cards");
    report(!(await onPage(page, "text=/replaces your current/").count()), "D10 no replace note over an empty collection");

    // C. /collection/replace over a collection (5b, 4c, 4a/4b).
    const seeded = await sql`select oracle_id from cards where name in ('Command Tower', 'Arcane Signet') order by name`;
    for (const r of seeded) {
      await sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${userId}, ${r.oracle_id}, 1, 'cmr')`;
    }
    await page.goto(`${BASE}/collection/replace`, { waitUntil: "networkidle" });
    const note = onPage(page, "text=/replaces your current/").first();
    report(await note.isVisible(), "D10 the note shows over a collection", await note.innerText().catch(() => "none"));
    const noteInk = await note.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, left: cs.borderLeftWidth, text: el.textContent };
    });
    report(noteInk.left === "1px" && !/⚠/.test(noteInk.text), "D10 a plain note: no amber rule, no icon", `left border ${noteInk.left}`);
    await pasteToReview(page, "3 Sol Ring");
    if (vp.phone) {
      report(!(await onPageRole(page, "button", "Back to upload").count()), "D11 5b the ‹ is gone");
      report(await onPage(page, "text=Review import").first().isVisible(), "D11 5b the header reads Review import");
      report(!(await onPageRole(page, "heading", "Replace collection").isVisible().catch(() => false)), "D11 5b no page header above the review");
    }
    const bar = await barOf(page);
    report(
      bar.position === "sticky" && (vp.phone ? bar.bottom === bar.tabbar : bar.bottom === "0px"),
      vp.phone ? "D11 5b the bar is sticky above the tab bar" : "the desktop bar stays sticky at the foot",
      `${bar.position}, bottom ${bar.bottom}, tab bar ${bar.tabbar}`,
    );
    await shot(page, vp, "calm-replace-review");
    await onPageRole(page, "button", /^Continue to replace/).click();
    const dialog = onPageRole(page, "dialog");
    await dialog.waitFor({ timeout: 15_000 });
    await page.waitForTimeout(250);
    report(!(await dialog.getByRole("textbox").count()), "D9 no typed token");
    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
    report(focused === "Keep current", "D9 focus opens on Keep current", focused ?? "none");
    const text = (await dialog.innerText()).replace(/\s+/g, " ");
    report(/Now 2 cards?/i.test(text) && /After 3/i.test(text), "D9 the now → after pair reads the two counts", text.slice(0, 90));
    report(/Replace with 3 cards/.test(text), "D9 the button names what the player gets", text.match(/Replace with [^ ]+ \w+/)?.[0] ?? "none");
    const hot = await redOrAmber(dialog);
    report(hot.length === 0, "D9 no --danger or --warning anywhere in the resting dialog", hot.slice(0, 3).join(", ") || "none");
    await shot(page, vp, "calm-confirm");
    await onPageRole(page, "button", "Keep current").click();
    report(!(await dialog.isVisible().catch(() => false)), "D9 Keep current closes it");
    const rows = await sql`select count(*)::int n from collection_items where user_id = ${userId}`;
    report(rows[0].n === seeded.length, "D9 and writes nothing", `${rows[0].n} rows`);
  } finally {
    await cleanup(userId);
    await context.close();
  }
}

// ── First-run R2: a read collection and no decks (Hugh's O1 and O7 rulings, 2026-09-28).
// Home is the dashboard; its resume slot holds /decks' own pair; New deck is a ghost so
// Browse commanders is the one fill; and /decks states the true buildable count.
async function zeroDecks(browser, vp) {
  console.log(`\n── ${vp.label}: a collection and no decks`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const userId = await signIn(page);
  try {
    await cleanup(userId);
    // Enough owned commanders that the true count clears the retired cap of nine.
    await sql`insert into collection_items (user_id, oracle_id, quantity, set_code)
      select ${userId}, oracle_id, 1, 'probe' from cards
      where type_line like 'Legendary Creature%' order by oracle_id limit 60`;
    await clearAboutSheet(page, userId);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const heading = onPageRole(page, "heading", "No decks yet");
    const drawn = await heading.waitFor({ timeout: 60_000 }).then(() => true, () => false);
    report(drawn, "R2 Home draws the No decks yet section");
    // A "fill" is the bone fill, `--fg` as a background, resolved in this theme. Any other
    // background (Ready to build's art panels) is not a button's fill.
    const fills = await onPage(page, "a").evaluateAll((links) => {
      const probe = document.createElement("div");
      probe.style.background = "var(--fg)";
      document.body.append(probe);
      const bone = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return links
        .filter((a) => a.getBoundingClientRect().width > 0)
        .filter((a) => getComputedStyle(a).backgroundColor === bone)
        .map((a) => a.textContent?.trim());
    });
    // Ready to build's cards carry a fill each (ruling 14 is one per REGION); O7 is about the
    // header's New deck against the zero section's pair, so those two are what is read.
    report(
      fills.includes("Browse commanders") && !fills.includes("New deck"),
      "R2 Browse commanders is filled and the header's New deck is a ghost",
      fills.join(" | "),
    );
    const importLink = onPageRole(page, "link", "Import a deck");
    report((await importLink.getAttribute("href")) === "/decks/import", "R2 Import a deck sits beside it");
    report(!(await onPage(page, "text=/commanders buildable from/").count()), "R2 Home draws no buildable line");
    await shot(page, vp, "zero-decks");

    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    const line = onPage(page, "text=/commanders buildable from/").first();
    const text = (await line.waitFor({ timeout: 60_000 }).then(() => line.innerText(), () => "")) || "";
    const n = Number(text.match(/^(\d+)/)?.[1] ?? NaN);
    // The true count, read where the ranking wrote it: one score row per ranked commander, and
    // this account has no deck to hold one back. `> 9` alone passes a page capped at ten.
    const [{ scored }] = await sql`select count(*)::int as scored from commander_scores where user_id = ${userId}`;
    report(n > 9 && n === scored, "R2 /decks states the true buildable count, not the old cap of nine", `${text} · scored ${scored}`);
  } finally {
    await cleanup(userId);
    await context.close();
  }
}

async function main() {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`probe:onboarding refuses branch ${branch ?? "(unknown)"}; point DATABASE_URL at local-dev or a scratch branch.`);
  }
  const names = (await sql`select name from cards where name not like '%//%' order by name limit 3100`).map((r) => r.name);
  if (names.length < 3000) throw new Error(`catalog too small for a staging-shaped CSV: ${names.length} names`);
  const csvPath = csvFixture(names);
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) await walk(browser, vp, csvPath);
    for (const vp of VIEWPORTS) await firstImport(browser, vp);
    for (const vp of VIEWPORTS) await calmReplace(browser, vp);
    for (const vp of VIEWPORTS) await zeroDecks(browser, vp);
  } finally {
    await browser.close();
  }
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exitCode = failures ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
