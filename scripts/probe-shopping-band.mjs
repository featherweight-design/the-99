// The Shopping list between 768 and 1300px, on a real deck (Hugh's ruling, 2026-09-26).
//
// In the band from md to lg the two-column grid squeezed a Shopping row's name to 0–43px beside
// its pips, EDHREC figure, price and limit. Hugh picked a combination:
//   1. the cost pips move BELOW the name there, the phone's own two lines, already shipped;
//   2. the buy tag's figure hugs its word there instead of holding a 46px column open;
//   3. `over $X` stacks on the buy tag as one group there;
//   4. the availability marker reads `short` and draws the count only above one.
// Every one of those is a fact about laid-out geometry, which jsdom has none of, so this reads it:
//   - no drawn name narrower than 40px, at every width;
//   - the page does not scroll sideways, measured with one name stretched to 126 characters (the
//     `sideways` rule from probe:deck-locks: whether a fixture has a long name is a fact about data);
//   - below 1024 every row's pips sit on a line under its name, and from 1024 beside it;
//   - below 1024 an `over $X` sits directly above its row's buy tag, and the figure hugs the word;
//   - no marker anywhere on the page draws `short 1`.
// A width with no Shopping row, no pips or no over row reports that it measured nothing and FAILS.
//
// Run against origin/main before this change it fails 18 checks: names squeezed to 16px at 768,
// pips beside the name, a 17.5px gap in the buy tag and `short 1` on 15 rows. Three mutations each
// fail it on their own: the tag's slot reserved at every width (the hug check, 3 widths); the
// stacked `over $X` hidden (3 widths); and the Shopping row's breakpoint put back to md (names and
// pips, 6 checks).
//
// Its last section is a second bug in the same row (Hugh, 2026-09-26): entering Lock cards mode
// shifted the decklist. Every row grew 2px on desktop (the toggle's 22px box in a 20px content
// box), and the mode's key line was 2.75px taller than the mark key it replaces. It reads every
// row's height and the first row's top before the press, in the mode and after Done, at 390 and
// 1300, and asserts Shopping has no mode to shift. Each fix reverted fails it on its own: the
// toggle's `md:-my-[1px]` (96 rows at 1300) and the line's 16px leading (first row, both widths).
//
// It WRITES only the account's About row, as every probe that clears the gate does. With
// PROBE_SHOTS set it saves a full-page picture per width. Point it at local-dev, NEVER production.
//
//   PROBE_BASE=http://localhost:3285 PROBE_DECK_NAME="HD - Gishath" PROBE_SHOTS=/tmp/band \
//     pnpm probe:shopping-band
import { mkdirSync } from "node:fs";
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
const DECK_NAME = process.env.PROBE_DECK_NAME ?? "HD - Gishath";
const SHOTS = process.env.PROBE_SHOTS ?? null;
const sql = neon(DATABASE_URL);
const WIDTHS = [768, 820, 900, 1024, 1300];
const LG = 1024;

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
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
  await clearAboutSheet(page, userId);
  return userId;
}

/** One pass over the drawn Shopping rows: each row's name, pips, over line, buy tag and figure. */
const READ_ROWS = () => {
  const drawn = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  };
  const rows = [];
  for (const name of document.querySelectorAll("main button[aria-label^='View details for ']")) {
    if (!drawn(name) || !name.textContent.trim()) continue;
    const row = name.closest(".group");
    if (!row) continue;
    const n = name.getBoundingClientRect();
    const pips = [...row.querySelectorAll("span.rounded-full.font-mono")].filter(drawn).map((p) => p.getBoundingClientRect());
    const over = [...row.querySelectorAll("span")].find((s) => drawn(s) && /^over \$/.test(s.textContent.trim()) && s.children.length === 0);
    const tag = [...row.querySelectorAll("span")].find((s) => drawn(s) && /^buy/.test(s.textContent.trim()) && s.className.includes("rounded-[4px]"));
    // The figure is the tag's last text span; its box against its own ink is the reserved slot.
    let slack = null;
    if (tag) {
      const figure = [...tag.querySelectorAll("span")].reverse().find((s) => /\$|sold out/.test(s.textContent) && s.children.length <= 1);
      if (figure) {
        const range = document.createRange();
        range.selectNodeContents(figure);
        slack = figure.getBoundingClientRect().width - range.getBoundingClientRect().width;
      }
    }
    // A short name (Taiga) is narrow because it is short, not because it collapsed: the floor is
    // 40px or the name's own full width, whichever is less.
    rows.push({
      name: name.textContent.trim(),
      nameWidth: n.width,
      nameNeeds: Math.min(40, name.scrollWidth),
      nameTop: n.top,
      nameBottom: n.bottom,
      pipTop: pips.length ? Math.min(...pips.map((p) => p.top)) : null,
      pipCenter: pips.length ? pips[0].top + pips[0].height / 2 : null,
      nameCenter: n.top + n.height / 2,
      over: over ? over.getBoundingClientRect().toJSON() : null,
      tag: tag ? tag.getBoundingClientRect().toJSON() : null,
      slack,
    });
  }
  const shortOne = [...document.querySelectorAll("main span")].filter((s) => drawn(s) && /(^|\s)short 1(\b|,)/.test(s.textContent) && s.children.length === 0).length;
  const doc = document.documentElement;
  return { rows, shortOne, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
};

/** Every drawn decklist row's height, in order, and the first row's top in the document. */
const READ_HEIGHTS = () => {
  const rows = [...document.querySelectorAll("main button[aria-label^='View details for ']")]
    .filter((b) => b.getBoundingClientRect().width > 0)
    .map((b) => b.closest(".group"))
    .filter(Boolean);
  const heights = rows.map((r) => Math.round(r.getBoundingClientRect().height * 10) / 10);
  const firstTop = rows.length ? Math.round((rows[0].getBoundingClientRect().top + window.scrollY) * 10) / 10 : -1;
  return { heights, firstTop };
};

/** The `sideways` rule from probe:deck-locks: stretch one drawn name, measure, put it back. */
async function sideways(page) {
  return page.evaluate(async () => {
    const doc = document.documentElement;
    const name = [...document.querySelectorAll("main button[aria-label^='View details for ']")]
      .find((b) => b.getBoundingClientRect().width > 0 && b.textContent.trim());
    const was = name?.textContent ?? null;
    if (name) name.textContent = "Growing Rites of Itlimoc of the Longest Name Ever Printed // Itlimoc, Cradle of the Sun at Its Very Widest, and Then Some More";
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const out = { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, stretched: name !== null };
    if (name) name.textContent = was;
    return out;
  });
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: WIDTHS[0], height: 900 } });
    const userId = await signIn(page);
    const [deck] = await sql`select id from decks where user_id = ${userId} and name = ${DECK_NAME} limit 1`;
    if (!deck) throw new Error(`The signed-in account (${userId}) holds no deck named ${DECK_NAME}.`);
    if (SHOTS) mkdirSync(SHOTS, { recursive: true });

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "networkidle" });
      const pill = onPageRole(page, "button", /^Shopping \d+$/).filter({ visible: true }).first();
      if ((await pill.count()) === 0) {
        report(`${width}px · the Shopping list`, false, "no Shopping pill: the deck buys nothing, so this measured nothing");
        continue;
      }
      await pill.click();
      await onPage(page, "button[aria-label^='View details for ']").first().waitFor({ state: "visible", timeout: 15_000 });
      await page.waitForTimeout(800);
      if (SHOTS) {
        // The top of the list, where the priciest rows and the over-limit ones sit, at the width's
        // own viewport; and the whole page beside it.
        await page.evaluate(() => {
          const first = document.querySelector("main button[aria-label^='View details for ']");
          if (first) window.scrollTo(0, first.getBoundingClientRect().top + window.scrollY - 110);
        });
        // The pointer is still over a row after the pill's click, which opens a hover preview.
        await page.mouse.move(width - 2, 2);
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${SHOTS}/shopping-${width}.png` });
        await page.screenshot({ path: `${SHOTS}/shopping-${width}-full.png`, fullPage: true });
      }

      const { rows, shortOne, scrollWidth, clientWidth } = await page.evaluate(READ_ROWS);
      if (rows.length === 0) {
        report(`${width}px · Shopping rows`, false, "none drawn — NOT a pass");
        continue;
      }
      const squeezed = rows.filter((r) => r.nameWidth < r.nameNeeds - 0.5);
      const narrowest = rows.reduce((a, b) => (b.nameWidth < a.nameWidth ? b : a));
      report(`${width}px · no name collapses below 40px`, squeezed.length === 0,
        squeezed.length
          ? `${squeezed.length} squeezed, e.g. ${squeezed[0].name} at ${squeezed[0].nameWidth.toFixed(1)}px`
          : `${rows.length} rows; narrowest ${narrowest.nameWidth.toFixed(1)}px is ${narrowest.name}, its whole name`);
      report(`${width}px · the page does not scroll sideways`, scrollWidth <= clientWidth, `${scrollWidth} / ${clientWidth}`);
      const s = await sideways(page);
      report(`${width}px · nor with a 126-character name`, s.stretched && s.scrollWidth <= s.clientWidth, JSON.stringify(s));

      const withPips = rows.filter((r) => r.pipTop !== null);
      if (withPips.length === 0) {
        report(`${width}px · pips`, false, "no row draws pips — NOT a pass");
      } else if (width < LG) {
        const beside = withPips.filter((r) => r.pipTop < r.nameBottom - 1);
        report(`${width}px · every row's pips sit under its name`, beside.length === 0,
          beside.length ? `${beside.length} beside, e.g. ${beside[0].name}` : `${withPips.length} rows`);
      } else {
        const under = withPips.filter((r) => Math.abs(r.pipCenter - r.nameCenter) > 4);
        report(`${width}px · every row's pips sit beside its name`, under.length === 0,
          under.length ? `${under.length} off the name's line, e.g. ${under[0].name}` : `${withPips.length} rows`);
      }

      const overs = rows.filter((r) => r.over && r.tag);
      if (overs.length === 0) {
        report(`${width}px · over the limit`, false, "no row draws `over $X` beside a buy tag — NOT a pass");
      } else if (width < LG) {
        const apart = overs.filter((r) => !(r.over.bottom <= r.tag.top + 1 && r.tag.top - r.over.bottom < 6
          && r.over.right > r.tag.left && r.over.left < r.tag.right));
        report(`${width}px · \`over $X\` stacks on its buy tag`, apart.length === 0,
          apart.length ? `${apart[0].name}: over ${JSON.stringify(apart[0].over)} tag ${JSON.stringify(apart[0].tag)}` : `${overs.length} rows`);
      }

      const slacks = rows.filter((r) => r.slack !== null);
      if (width < LG && slacks.length) {
        const widest = slacks.reduce((a, b) => (b.slack > a.slack ? b : a));
        report(`${width}px · the buy tag's figure hugs its word`, widest.slack < 2,
          `largest gap ${widest.slack.toFixed(1)}px (${widest.name})`);
      }
      report(`${width}px · no marker draws \`short 1\``, shortOne === 0, `${shortOne} drawn`);
    }

    // ── Lock cards mode shifts nothing (Hugh, 2026-09-26) ─────────────────
    // Entering the mode swaps every row's ✕ for a lock toggle. The toggle was taller than the row's
    // content box on desktop, so every row grew and the page moved under the pointer that pressed
    // it. Read on the decklist (All) at 390 and 1300: every row's height and the first row's top,
    // before the press, in the mode, and after Done. Shopping has no mode, which is asserted too.
    for (const width of [390, 1300]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "networkidle" });
      const lockButton = onPageRole(page, "button", /^Lock cards$/).filter({ visible: true }).first();
      if ((await lockButton.count()) === 0) {
        report(`${width}px · Lock cards`, false, "no Lock cards control: NEVER_CUT_ENABLED is off, so this measured nothing");
        continue;
      }
      await page.mouse.move(width - 2, 2);
      const before = await page.evaluate(READ_HEIGHTS);
      await lockButton.click();
      await onPage(page, "[data-testid='row-lock-toggle']").first().waitFor({ state: "visible", timeout: 15_000 });
      await page.mouse.move(width - 2, 2);
      await page.waitForTimeout(300);
      const inMode = await page.evaluate(READ_HEIGHTS);
      const done = onPageRole(page, "button", /^Done$/).filter({ visible: true }).first();
      await done.click();
      await page.waitForTimeout(300);
      const after = await page.evaluate(READ_HEIGHTS);
      const moved = (a, b) => a.heights.map((h, i) => Math.abs(h - (b.heights[i] ?? -1))).filter((d) => d > 0.5).length;
      report(`${width}px · entering Lock cards changes no row's height`,
        before.heights.length > 0 && moved(before, inMode) === 0,
        `${before.heights.length} rows; ${moved(before, inMode)} changed, e.g. ${before.heights[0]} → ${inMode.heights[0]}px`);
      report(`${width}px · nor moves the first row`, Math.abs(before.firstTop - inMode.firstTop) < 0.5,
        `${before.firstTop} → ${inMode.firstTop}`);
      report(`${width}px · leaving it puts everything back`,
        moved(before, after) === 0 && Math.abs(before.firstTop - after.firstTop) < 0.5,
        `${moved(before, after)} rows changed; first row ${before.firstTop} → ${after.firstTop}`);

      const pill = onPageRole(page, "button", /^Shopping \d+$/).filter({ visible: true }).first();
      await pill.click();
      await page.waitForTimeout(500);
      const shoppingLock = await onPageRole(page, "button", /^Lock cards$/).filter({ visible: true }).count();
      report(`${width}px · Shopping has no Lock cards mode to shift`, shoppingLock === 0, `${shoppingLock} drawn`);
    }
  } finally {
    await browser.close();
  }
}

run()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exit(failures === 0 ? 0 : 1);
  });
