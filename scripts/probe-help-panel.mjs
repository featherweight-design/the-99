// probe:help-panel — the ? and its panel and sheet (discovery R2·8, plan `2026-10-16-discovery-r2-r3.md`, "Browser
// probes"; design table `docs/superpowers/design-tables/discovery-r2-8-help.md`), in a real browser at 390x844 and
// 1300x900.
//
// What jsdom cannot see, and the unit tests therefore do not prove: the ? in the real shell (the rail's foot from `md`,
// the header's right below it), the entries fetched from `GET /api/about/entries` under the reader's own switches, the
// panel's focus in a real document, and Show me reaching a control the page actually draws. It presses the ?, a row,
// an Elsewhere chip and Show me, and searches, asserting:
//   - the ? holds `aria-expanded` while open, and the panel is `aria-modal` false at 1300, true (over a scrim) at 390;
//   - focus moves into the panel on open, and back to the ? on close, by Escape, by ✕ and by the ? again (the scrim at
//     390, which covers the header);
//   - the title names the screen: `Collection · Cards`, `A deck · Your deck`, and `A deck · Shopping` once the deck's own
//     Shopping tab is pressed;
//   - at 1300 Tab from a page control stays in the page (non-modal); at 390 Tab stays in the sheet, and the page has no
//     horizontal scroll with the sheet open;
//   - a row opens in place, and an Elsewhere chip swaps the list (the section head names the chosen place);
//   - a search draws hits or the none line, and the list comes back when it is cleared;
//   - Show me closes the panel and lands its halo (`data-target-halo`) on a drawn control, pressing nothing. The pages
//     are tried in turn until one draws a Show me; none drawing one is SKIP, never PASS.
// Card details under it (R2·9, readiness gap 5), on a card opened from `/collection`:
//   - at 1300 the rail's ? is drawn above card details' backdrop (it is the element at its own centre), is one extra
//     Tab stop in card details' cycle, and Tab reaches nothing else outside the dialog; pressed, the panel opens as a
//     stacked dialog (`aria-modal` true) titled `Collection · Card details` over the open card, holds Tab, and Escape
//     closes the panel only (focus back on the ?), then a second Escape closes card details;
//   - at 390 nothing is added: no ? is lifted, and Tab never reaches one.
//
// IT WRITES NOTHING: no database connection, and every press is a read (the panel, its search, Show me's halo). So it
// needs no scratch branch. The deck it opens is the account's first on `/decks`.
//
// The server: `next start` with `HELP_PANEL_ENABLED=true` (and, for Show me, the tools' switches on).
//
//   PROBE_BASE=http://localhost:3311 [PROBE_SHOTS=<dir>] pnpm probe:help-panel
//
// The switch-off case (no ?) needs a second server and is reported SKIP; the unit tests hold it.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole, settled } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "" || u.pathname !== "/") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only (http://localhost:3311)`);
  }
}
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");

const WIDTHS = [
  { name: "390", width: 390, height: 844, phone: true, place: "header" },
  { name: "1300", width: 1300, height: 900, phone: false, place: "rail" },
];
const PANEL = 'section[role="dialog"][aria-label="About this screen"]';
/** A body the panel has filled: the section head, G21's line, or a search's answer. */
const FILLED = `${PANEL} [data-help-here], ${PANEL} [data-help-empty]`;
/** A query no entry holds, for the none line. */
const NOWHERE = "zqxjvkw";
/** Where the open panel and sheet are photographed (`help-1300.png`, `help-390.png`); unset photographs nothing. */
const SHOTS = process.env.PROBE_SHOTS ?? null;

let failures = 0;
let skips = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};
const skip = (label, why) => {
  skips += 1;
  console.log(`SKIP  ${label}  (${why})`);
};

async function signIn(page, email, password) {
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
          if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
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
    [email, password ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  // The /about gate sends each fresh browser once, and its redirect writes the `about_v` cookie that lets the next
  // load through. Passing it here writes nothing to the account (the dismiss would).
  await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" });
}

/** The ? for this width: a shell control, outside `<main>`, so it is reached by its own data attribute. */
const helpButton = (page, w) => page.locator(`[data-help-button="${w.place}"]`);

/** Whether focus is inside the panel, and whether it is on the ?. */
const focusState = (page, w) =>
  page.evaluate(([panel, place]) => {
    const a = document.activeElement;
    return { inPanel: a?.closest(panel) !== null && a !== null, onButton: a?.getAttribute("data-help-button") === place };
  }, [PANEL, w.place]);

async function open(page, w) {
  // At 390 the ? scrolls away with the header (row 23, G15): a reader scrolls back up to reach it.
  if (w.phone) await page.evaluate(() => window.scrollTo(0, 0));
  await helpButton(page, w).click();
  await page.waitForSelector(FILLED, { timeout: 15_000 });
}

/**
 * Escape, then wait for the panel to leave. The sheet holds a history entry (Back closes it), so its close steps the
 * history back, and a navigation started before that lands is aborted by it.
 */
async function escape(page) {
  await page.keyboard.press("Escape");
  await page.waitForSelector(PANEL, { state: "detached", timeout: 5_000 }).catch(() => {});
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(300);
}

async function visit(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  // A second pass of the gate, should the first not have held: one retry, then the page must be the one asked for.
  if (new URL(page.url()).pathname === "/about" && !path.startsWith("/about")) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  }
  if (new URL(page.url()).pathname === "/about" && !path.startsWith("/about")) throw new Error(`asked for ${path}, the /about gate held`);
  await page.locator("main").first().waitFor({ timeout: 30_000 });
  // Past hydration: the ? is a client control.
  await page.waitForFunction(() => document.querySelector("[data-help-button]") !== null, null, { timeout: 15_000 }).catch(() => {});
}

const CARD = '[role="dialog"][aria-labelledby="card-modal-title"]';

/** What has focus: inside card details, inside the panel, the ?, or somewhere else. */
const focusPlace = (page) =>
  page.evaluate(([card, panel]) => {
    const a = document.activeElement;
    if (a === null || a === document.body) return "body";
    if (a.closest(panel)) return "panel";
    if (a.hasAttribute("data-help-button")) return "help";
    if (a.closest(card)) return "card";
    return `outside:${a.tagName.toLowerCase()}`;
  }, [CARD, PANEL]);

async function overDetails(browser, w, deckPath) {
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone });
  const page = await context.newPage();
  try {
    await signIn(page, EMAIL, PASSWORD);
    // A card from the collection, whose open card is its own screen; else a deck's row (an empty collection).
    await visit(page, "/collection");
    let trigger = onPage(page, '[aria-label^="View details for "]').filter({ visible: true }).first();
    let fromCollection = await trigger.waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false);
    if (!fromCollection && deckPath) {
      await visit(page, deckPath);
      trigger = onPage(page, "[data-decklist-row]").filter({ visible: true }).first();
    }
    const has = fromCollection || (await trigger.waitFor({ state: "visible", timeout: 30_000 }).then(() => true).catch(() => false));
    if (!has) return skip(`${w.name} the ? over card details`, "neither the collection nor a deck draws a card");
    console.log(`card from ${fromCollection ? "/collection" : deckPath}`);
    await trigger.click();
    await page.locator("#card-modal-title").waitFor({ timeout: 30_000 });
    await page.waitForTimeout(400);
    const lifted = page.locator('body > [data-help-button="rail"]');

    // Tab through card details' whole cycle and a little past: where focus goes.
    const places = new Set();
    for (let i = 0; i < 60; i += 1) {
      await page.keyboard.press("Tab");
      places.add(await focusPlace(page));
    }
    const outside = [...places].filter((p) => p.startsWith("outside") || p === "body" || p === "panel");

    if (w.phone) {
      check((await lifted.count()) === 0, `${w.name} card details lifts no ?`, `${await lifted.count()}`);
      check(!places.has("help"), `${w.name} Tab in card details never reaches a ?`, [...places].join(", "));
      check(outside.length === 0, `${w.name} Tab stays in card details`, [...places].join(", "));
      return;
    }

    check((await lifted.count()) === 1, `${w.name} the rail's ? is lifted over card details`, `${await lifted.count()}`);
    const onTop = await page.evaluate(() => {
      const b = document.querySelector('body > [data-help-button="rail"]');
      if (!b) return "no ?";
      const r = b.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit === b ? "the ?" : (hit?.outerHTML.slice(0, 80) ?? "nothing");
    });
    check(onTop === "the ?", `${w.name} the ? is above the backdrop (a pointer reaches it)`, onTop);
    const slot = await page.evaluate(() => {
      const b = document.querySelector('body > [data-help-button="rail"]')?.getBoundingClientRect();
      const r = document.querySelector("[data-help-slot]")?.getBoundingClientRect();
      return b && r ? { dx: Math.round(b.left - r.left), dy: Math.round(b.top - r.top), w: Math.round(b.width), slotW: Math.round(r.width) } : null;
    });
    check(
      slot !== null && slot.dx === 0 && slot.dy === 0 && slot.w === 38 && slot.slotW === 38,
      `${w.name} the lifted ? keeps its place at the rail's foot`,
      JSON.stringify(slot),
    );
    check(places.has("help"), `${w.name} the ? is a stop in card details' Tab cycle`, [...places].join(", "));
    check(outside.length === 0, `${w.name} Tab reaches nothing else outside card details`, [...places].join(", "));

    await lifted.click();
    await page.waitForSelector(FILLED, { timeout: 15_000 });
    const modal = await page.locator(PANEL).getAttribute("aria-modal");
    check(modal === "true", `${w.name} over card details the panel is a stacked dialog`, `aria-modal ${modal}`);
    check((await page.locator(CARD).count()) === 1, `${w.name} card details stays open under the panel`, `${await page.locator(CARD).count()}`);
    const title = await page.locator(`${PANEL} h2`).textContent();
    if (fromCollection) check(title === "Collection · Card details", `${w.name} the title names card details`, `${title}`);
    else skip(`${w.name} the title names card details`, `opened from a deck, whose screen is the deck (${title})`);
    check((await focusPlace(page)) === "panel", `${w.name} focus moves into the stacked panel`, await focusPlace(page));
    const inPanel = new Set();
    for (let i = 0; i < 24; i += 1) {
      await page.keyboard.press("Tab");
      inPanel.add(await focusPlace(page));
    }
    check(inPanel.size === 1 && inPanel.has("panel"), `${w.name} the stacked panel holds Tab (one trap live)`, [...inPanel].join(", "));
    if (SHOTS) {
      await settled(page.locator(PANEL));
      await page.screenshot({ path: `${SHOTS}/help-over-details-${w.name}.png` });
    }

    await page.keyboard.press("Escape");
    await page.waitForSelector(PANEL, { state: "detached", timeout: 5_000 }).catch(() => {});
    check((await page.locator(PANEL).count()) === 0, `${w.name} Escape closes the panel`, "closed");
    check((await page.locator(CARD).count()) === 1, `${w.name} that Escape leaves card details open`, `${await page.locator(CARD).count()}`);
    check((await focusPlace(page)) === "help", `${w.name} focus goes back to the ?`, await focusPlace(page));
    await page.keyboard.press("Escape");
    await page.waitForSelector(CARD, { state: "detached", timeout: 5_000 }).catch(() => {});
    check((await page.locator(CARD).count()) === 0, `${w.name} a second Escape closes card details`, `${await page.locator(CARD).count()}`);
    check((await lifted.count()) === 0, `${w.name} the ? goes back into the rail`, `${await lifted.count()}`);
  } finally {
    await context.close();
  }
}

async function walk(browser, w, deckPath) {
  console.log(`\n── ${w.name}`);
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone });
  const page = await context.newPage();
  try {
    await signIn(page, EMAIL, PASSWORD);

    // Collection · Cards: the plain screen (H3).
    await visit(page, "/collection");
    const button = helpButton(page, w);
    check((await button.count()) === 1, `${w.name} the ? is drawn in the ${w.place}`, `${await button.count()}`);
    check((await button.getAttribute("aria-expanded")) === "false", `${w.name} the ? reads closed`, `${await button.getAttribute("aria-expanded")}`);
    await open(page, w);
    check((await button.getAttribute("aria-expanded")) === "true", `${w.name} the ? reads open`, `${await button.getAttribute("aria-expanded")}`);
    const modal = await page.locator(PANEL).getAttribute("aria-modal");
    check(modal === (w.phone ? "true" : "false"), `${w.name} the panel is ${w.phone ? "a modal sheet" : "non-modal"}`, `aria-modal ${modal}`);
    const scrim = await page.locator("[data-help-scrim]").count();
    check(scrim === (w.phone ? 1 : 0), `${w.name} a scrim ${w.phone ? "under the sheet" : "is not drawn"}`, `${scrim}`);
    const f1 = await focusState(page, w);
    check(f1.inPanel, `${w.name} focus moves into the panel`, JSON.stringify(f1));
    const title0 = await page.locator(`${PANEL} h2`).textContent();
    check(title0 === "Collection · Cards", `${w.name} the title names the screen`, `${title0}`);
    if (SHOTS) {
      await settled(page.locator(PANEL));
      await page.screenshot({ path: `${SHOTS}/help-${w.name}.png` });
    }

    // Tab: the panel is not modal, so a page control Tabs on through the page; the sheet holds it.
    if (w.phone) {
      let out = 0;
      for (let i = 0; i < 16; i += 1) {
        await page.keyboard.press("Tab");
        if (!(await focusState(page, w)).inPanel) out += 1;
      }
      check(out === 0, `${w.name} Tab stays in the sheet`, `${out} of 16 presses left it`);
      const overflow = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        view: window.innerWidth,
      }));
      check(
        overflow.doc <= overflow.view && overflow.body <= overflow.view,
        `${w.name} no horizontal page scroll with the sheet open`,
        JSON.stringify(overflow),
      );
    } else {
      const control = onPage(page, "a[href], button:not([disabled]), input:not([type='hidden'])").first();
      await control.focus();
      await page.keyboard.press("Tab");
      const f = await page.evaluate((panel) => {
        const a = document.activeElement;
        return { inPanel: a?.closest(panel) != null, inMain: a?.closest("main") != null };
      }, PANEL);
      const still = await page.locator(PANEL).count();
      check(!f.inPanel && f.inMain && still === 1, `${w.name} Tab from a page control stays in the page`, `${JSON.stringify(f)} panel ${still}`);
      // Back into the panel for the rest.
      await page.locator(`${PANEL} button[aria-label="Close"]`).focus();
    }

    // A row opens in place.
    const row = page.locator(`${PANEL} [data-help-row] button[aria-expanded]`).first();
    if ((await row.count()) === 0) {
      skip(`${w.name} a row`, "Collection lists no entry for this reader");
    } else {
      await row.click();
      check((await row.getAttribute("aria-expanded")) === "true", `${w.name} a row opens`, `${await row.getAttribute("aria-expanded")}`);
      const read = await page.locator(`${PANEL} [data-help-open] a`).first().getAttribute("href").catch(() => null);
      check(read?.startsWith("/about?tab=reference#") === true, `${w.name} the open row links to its Reference entry`, `${read}`);
    }

    // An Elsewhere chip swaps the list.
    const before = await page.locator(`${PANEL} [data-help-here]`).textContent();
    const chip = page.locator(`${PANEL} [data-help-chip]`).first();
    if ((await chip.count()) === 0) {
      skip(`${w.name} an Elsewhere chip`, "no other place in Collection holds an entry");
    } else {
      const label = (await chip.textContent())?.replace(/\s*\d+$/, "").trim();
      await chip.click();
      const after = await page.locator(`${PANEL} [data-help-here]`).textContent();
      check(after !== before && after?.toLowerCase().includes(label.toLowerCase()), `${w.name} a chip swaps the list in place`, `${before} → ${after}`);
    }

    // Search: hits for a word every About has, the none line for one it never holds, the list back on clear.
    const field = page.locator(`${PANEL} input[type="search"]`);
    await field.fill("deck");
    await page.waitForSelector(`${PANEL} [data-help-hits], ${PANEL} [data-help-none]`, { timeout: 5_000 }).catch(() => {});
    check((await page.locator(`${PANEL} [data-help-hit]`).count()) > 0, `${w.name} a search draws hits`, `${await page.locator(`${PANEL} [data-help-hit]`).count()} hits`);
    await field.fill(NOWHERE);
    check((await page.locator(`${PANEL} [data-help-none]`).count()) === 1, `${w.name} a search with no match draws the none line`, NOWHERE);
    await field.fill("");
    check((await page.locator(`${PANEL} [data-help-here]`).count()) === 1, `${w.name} clearing the search brings the list back`, "section head");

    // Escape closes, and focus goes back to the ?.
    await page.keyboard.press("Escape");
    await page.waitForSelector(PANEL, { state: "detached", timeout: 5_000 }).catch(() => {});
    check((await page.locator(PANEL).count()) === 0, `${w.name} Escape closes the panel`, `${await page.locator(PANEL).count()} open`);
    const f2 = await focusState(page, w);
    check(f2.onButton, `${w.name} focus goes back to the ? after Escape`, JSON.stringify(f2));

    // ✕ closes, and focus goes back to the ?.
    await open(page, w);
    await page.locator(`${PANEL} button[aria-label="Close"]`).click();
    await page.waitForSelector(PANEL, { state: "detached", timeout: 5_000 }).catch(() => {});
    const f3 = await focusState(page, w);
    check((await page.locator(PANEL).count()) === 0 && f3.onButton, `${w.name} ✕ closes and focus goes back to the ?`, JSON.stringify(f3));

    // The ? again closes. At 390 the scrim covers the header, so the press that lands is the scrim's (row 40).
    await open(page, w);
    if (w.phone) {
      await page.locator("[data-help-scrim]").click({ position: { x: 20, y: 20 } });
    } else {
      await helpButton(page, w).click();
    }
    await page.waitForSelector(PANEL, { state: "detached", timeout: 5_000 }).catch(() => {});
    // The sheet's close steps its history entry back, as Escape's does; a navigation started before it lands is aborted.
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(300);
    const f4 = await focusState(page, w);
    const again = w.phone ? "the scrim" : "the ? again";
    check(
      (await page.locator(PANEL).count()) === 0 && f4.onButton && (await button.getAttribute("aria-expanded")) === "false",
      `${w.name} ${again} closes and focus goes back to the ?`,
      JSON.stringify(f4),
    );

    // The deck page reads the builder's view (H1): its title names the view, and Elsewhere is the deck's.
    if (deckPath === null) {
      skip(`${w.name} the deck page`, "the account holds no deck");
    } else {
      await visit(page, deckPath);
      await open(page, w);
      const title = await page.locator(`${PANEL} h2`).textContent();
      check(title === "A deck · Your deck", `${w.name} the deck page's title names its view`, `${title}`);
      await escape(page);
      // Shopping, by the deck's own control: the builder publishes the view, the URL does not carry it.
      const shopping = onPageRole(page, "tab", /^\s*Shopping/).first();
      if ((await shopping.count()) === 0) {
        skip(`${w.name} the deck's Shopping view`, "the deck draws no Shopping tab");
      } else {
        await shopping.click();
        await open(page, w);
        const shopTitle = await page.locator(`${PANEL} h2`).textContent();
        check(shopTitle === "A deck · Shopping", `${w.name} the title follows the deck's Shopping view`, `${shopTitle}`);
        const head = await page.locator(`${PANEL} [data-help-here]`).textContent().catch(() => null);
        check(/shopping/i.test(head ?? ""), `${w.name} the section head names Shopping`, `${head}`);
        await escape(page);
      }
    }

    // Show me, on the first page that draws one.
    const pages = [deckPath, deckPath && `${deckPath}?tab=analysis`, "/decks", "/collection", "/collection/wishlist", "/collection/replace", "/decks/new", "/friends"].filter(Boolean);
    let shown = false;
    for (const path of pages) {
      await visit(page, path);
      await open(page, w);
      const press = page.locator(`${PANEL} [data-help-show-me]`).first();
      if ((await press.count()) === 0) {
        await escape(page);
        continue;
      }
      const entry = await press.getAttribute("data-help-show-me");
      const before = await page.locator("[data-target-halo]").count();
      check(before === 0, `${w.name} no halo is drawn before Show me`, `${before}`);
      await press.click();
      await page.waitForSelector(PANEL, { state: "detached", timeout: 5_000 }).catch(() => {});
      check((await page.locator(PANEL).count()) === 0, `${w.name} Show me (${entry} on ${path}) closes the panel first`, "closed");
      const halo = await page.waitForSelector("[data-target-halo]", { timeout: 4_000 }).then(() => true).catch(() => false);
      check(halo, `${w.name} Show me lands its halo`, `data-target-halo ${halo}`);
      const pressed = await page.evaluate(() => document.querySelector('[aria-modal="true"]') !== null);
      check(!pressed, `${w.name} Show me presses nothing`, `a modal open: ${pressed}`);
      // Document-wide, never `onPage`: a bubble portals to document.body (or the modal it sits in), outside <main>, so
      // a count scoped to <main> read 0 whatever was drawn. Watched past the moments' 600ms arrival timer, well inside
      // the halo's 2.4s, since the panel's close is what restarts that timer.
      const bubble = await page
        .waitForSelector("[data-moment-bubble]", { state: "attached", timeout: 1_500 })
        .then(() => true)
        .catch(() => false);
      check(!bubble, `${w.name} Show me draws no bubble through the halo`, `a bubble drawn: ${bubble}`);
      shown = true;
      break;
    }
    if (!shown) skip(`${w.name} Show me`, `none of ${pages.length} pages drew a control an entry names`);
  } finally {
    await context.close();
  }
}

skip("the ? is absent with HELP_PANEL_ENABLED off", "needs a second server; the unit tests hold the switched-off shell");
await clerkSetup();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  await signIn(page, EMAIL, PASSWORD);
  // The account's first deck, read off its own decks list: the probe holds no database connection.
  await visit(page, "/decks");
  // A deck's own page is `/decks/<slug>`; the other routes under `/decks/` are not decks.
  const deckPath = await page
    .evaluate(() =>
      [...document.querySelectorAll("main a[href^='/decks/']")]
        .map((a) => a.getAttribute("href"))
        .find((h) => /^\/decks\/[^/?#]+$/.test(h ?? "") && !/^\/decks\/(new|precons|import|shopping)$/.test(h)) ?? null,
    )
    .catch(() => null);
  await page.close();
  console.log(`deck: ${deckPath ?? "none"}`);
  for (const w of WIDTHS) await walk(browser, w, deckPath);
  for (const w of WIDTHS) {
    console.log(`\n── ${w.name} over card details`);
    await overDetails(browser, w, deckPath);
  }
} finally {
  await browser.close();
}
console.log(failures === 0 ? `\nALL PASS${skips ? ` (${skips} skipped)` : ""}` : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
