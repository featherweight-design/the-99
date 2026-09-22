// The findings, their receipt and the stacked card modal, measured in a real browser at 1300x900
// and 390x844.
//
// WHY A BROWSER. Four of the rulings here are facts about laid-out geometry or about two dialogs
// at once, and jsdom has neither:
//
//   · The five findings are TILES IN ONE ROW on desktop and ROWS IN ONE COLUMN on the phone, from
//     one list restyled at `md:`. A class that did not compile leaves the markup identical and the
//     layout wrong, so the probe groups the five by their MEASURED top edge.
//   · The receipt is a 560px modal on desktop and a sheet from 52px down on the phone.
//   · A card opened from the receipt STACKS (verdict addendum, ruling 1): the receipt stays, steps
//     down to `--surface-sunken`, and on the phone the card sheet starts at 96px so the receipt's
//     header row is visible above it. What proves that is the header's rect against the card
//     sheet's top, not a class on either.
//   · Two dismissals land in the order the sheets were opened: Escape closes the card and leaves
//     the receipt, and a second Escape closes the receipt. `useDialogA11y` answers a key pressed
//     inside another dialog by ignoring it, and only a real focus model can say it did.
//
// IT FINDS ITS OWN FIXTURE by pressing each of the account's decks until one draws a finding with
// cards behind it, rather than naming an id that rots — a deck with nothing in it has no receipt
// to open, and a run over one would report every receipt check as passing about nothing. A run
// that finds no such deck FAILS.
//
// IT WRITES ONE ROW: `user_prefs.about_version_seen`, raised with `greatest(...)`, exactly as
// `probe:verdict-block` does and for the same reason. No deck, collection or catalog row.
// Needs a server with ANALYSIS_TAB_ENABLED=true. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3010 node scripts/probe-verdict-findings.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole, PAGE } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  // Read only to clear the About gate. This probe writes nothing else.
  "DATABASE_URL",
]);
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];
/** The five, in the handoff's order. */
const ORDER = ["gameChangers", "massLandDenial", "extraTurns", "twoCardCombos", "tutors"];

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
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
          });
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

  // CLEAR THE ABOUT GATE BEFORE ANY ROUTE IS ASKED FOR. Since #658 `proxy.ts` redirects a reader
  // below the current `ABOUT_VERSION` to `/about?next=…` — so a probe that navigates straight to
  // `/decks` scrapes the About page instead, and its specimen deck links then read as this
  // account's decks. The first run of this file did exactly that: it reported "no Analysis tab"
  // about `/decks/about-resume-edited`, a routing problem wearing a flag problem's clothes.
  //
  // Seeded rather than clicked through: the flag lives in `user_prefs` and this account may have
  // no row at all, so visiting the page does not write one. Left set afterwards on purpose —
  // "this account has seen the About page" is true once this ran.
  //
  // `greatest(...)`, which is what `lib/about/read.ts` itself writes. A bare assignment LOWERS
  // the stored value when this checkout is pinned behind the database's, putting the About page
  // back in front of a real reader on their next navigation.
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  await neon(DATABASE_URL)`
    insert into user_prefs (user_id, about_version_seen)
    values (${await page.evaluate(() => window.Clerk.user.id)}, ${version})
    on conflict (user_id) do update
      set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
}

/** Every deck on the account, asked of the page. */
async function deckHrefs(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  return page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...new Set([...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.split("/").length === 3 && !["new", "import"].includes(h.split("/")[2])))];
  }, PAGE);
}

/** Open the deck's Analysis tab by a PRESS — the tab is client state and has no address. */
async function openAnalysis(page, href) {
  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  const up = await page.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 })
    .then(() => true).catch(() => false);
  if (!up) return false;
  await page.waitForTimeout(500);
  const tab = onPageRole(page, "tab", /analysis/i);
  if ((await tab.count()) === 0) return false;
  await tab.first().click();
  const invite = onPageRole(page, "button", /Analyze this deck/);
  if ((await invite.count()) > 0) await invite.first().click();
  return page.waitForSelector(`${PAGE} [data-testid="findings-block"]`, { timeout: 30_000 })
    .then(() => true).catch(() => false);
}

/** The first finding with cards behind it that opens a tile grid rather than a combo. */
async function listFinding(page) {
  return page.evaluate(([scope, order]) => {
    const root = document.querySelector(scope);
    for (const id of order) {
      if (id === "twoCardCombos") continue;
      const li = root?.querySelector(`[data-testid="finding-${id}"]`);
      if (li && li.dataset.state !== "empty") return id;
    }
    return null;
  }, [PAGE, ORDER]);
}

async function walk(page, label, width) {
  const phone = width < 768;

  // THE FIVE, in order, and in the layout their width draws.
  const items = await page.evaluate(([scope, order]) => {
    const root = document.querySelector(scope);
    return order.map((id) => {
      const el = root?.querySelector(`[data-testid="finding-${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { id, state: el.dataset.state, top: Math.round(r.top), left: Math.round(r.left),
        buttons: el.querySelectorAll("button").length };
    });
  }, [PAGE, ORDER]);
  report(`${label}px · all five findings, in order`, items.every(Boolean),
    items.map((i) => i?.id ?? "missing").join(", "));
  const present = items.filter(Boolean);
  const tops = new Set(present.map((i) => i.top));
  const lefts = new Set(present.map((i) => i.left));
  report(
    `${label}px · ${phone ? "rows in one column" : "tiles in one row"}`,
    phone ? tops.size === present.length && lefts.size === 1 : tops.size === 1 && lefts.size === present.length,
    `${tops.size} distinct tops, ${lefts.size} distinct lefts`,
  );
  const zeros = present.filter((i) => i.state === "empty");
  report(`${label}px · a zero draws no control`, zeros.every((i) => i.buttons === 0),
    zeros.length === 0 ? "no empty finding on this deck — nothing to read" : `${zeros.length} empty, controls: ${zeros.map((i) => i.buttons).join(",")}`);

  const id = await listFinding(page);
  if (!report(`${label}px · a finding with cards behind it`, id !== null, id ?? "none on this deck")) return;

  const control = onPage(page, `[data-testid="finding-${id}"] button`);
  if (phone) {
    const h = await control.evaluate((b) => b.getBoundingClientRect().height);
    report(`${label}px · the phone's control is a 44px target`, h >= 44, `${h}px`);
  }
  await control.click();
  const receipt = page.locator('[data-testid="receipt-modal"]');
  await receipt.waitFor({ state: "visible", timeout: 5_000 });
  const box = await receipt.boundingBox();
  if (phone) {
    report(`${label}px · the receipt is a sheet from 52px down, full width`,
      Math.abs(box.y - 52) <= 1 && Math.abs(box.width - width) <= 1, `top ${box.y}, width ${box.width}`);
  } else {
    report(`${label}px · the receipt is a 560px modal`, Math.abs(box.width - 560) <= 1, `width ${box.width}`);
  }

  // THE TILES: one per card, painted art where the deck has it, and no fact mark on any tile.
  const tiles = await receipt.evaluate((r) => {
    const grid = r.querySelector('[data-testid="receipt-grid"]');
    const all = [...(grid?.querySelectorAll('[data-testid="receipt-tile"]') ?? [])];
    const painted = all.filter((t) => {
      const plate = t.firstElementChild;
      return plate && getComputedStyle(plate).backgroundImage.startsWith("url(");
    }).length;
    const cols = new Set(all.slice(0, 6).map((t) => Math.round(t.getBoundingClientRect().left))).size;
    return { count: all.length, painted, cols, marks: grid?.querySelectorAll('[data-testid^="card-fact-"]').length ?? -1 };
  });
  report(`${label}px · the receipt draws a tile per card`, tiles.count > 0, `${tiles.count} tiles`);
  report(`${label}px · tiles carry the deck's own art`, tiles.painted > 0, `${tiles.painted} of ${tiles.count} painted`);
  report(`${label}px · no fact mark on a tile (ruling 2)`, tiles.marks === 0, `${tiles.marks} marks`);
  report(`${label}px · ${phone ? "two" : "up to five"} tiles to a row`,
    phone ? tiles.cols === Math.min(2, tiles.count) : tiles.cols === Math.min(5, tiles.count), `${tiles.cols} columns`);

  // THE STACK. A tile opens the card and the receipt stays.
  await receipt.locator('[data-testid="receipt-tile"]').first().click();
  const card = page.locator('[role="dialog"][aria-labelledby="card-modal-title"]');
  await card.waitFor({ state: "visible", timeout: 15_000 });
  const stack = await page.evaluate(() => {
    const r = document.querySelector('[data-testid="receipt-modal"]');
    const c = document.querySelector('[role="dialog"][aria-labelledby="card-modal-title"]');
    const head = r?.firstElementChild;
    return {
      receiptUp: !!r && r.getBoundingClientRect().height > 0,
      receiptBg: r ? getComputedStyle(r).backgroundColor : null,
      sunken: getComputedStyle(document.documentElement).getPropertyValue("--surface-sunken").trim(),
      cardTop: c ? Math.round(c.getBoundingClientRect().top) : null,
      headBottom: head ? Math.round(head.getBoundingClientRect().bottom) : null,
      headTop: head ? Math.round(head.getBoundingClientRect().top) : null,
    };
  });
  report(`${label}px · the receipt stays under the card`, stack.receiptUp, stack.receiptUp ? "still drawn" : "gone");
  const hex = (css) => {
    const m = (css ?? "").match(/\d+/g);
    return m ? "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("") : "";
  };
  report(`${label}px · the receipt steps down to --surface-sunken`,
    hex(stack.receiptBg) === stack.sunken.toLowerCase(), `${hex(stack.receiptBg)} against ${stack.sunken}`);
  if (phone) {
    report(`${label}px · the card sheet starts at 96px`, Math.abs(stack.cardTop - 96) <= 1, `top ${stack.cardTop}`);
    // THE PROPERTY THE OFFSET EXISTS FOR, and not the figure: the receipt's header row sits above
    // the card sheet, whole, so a reader sees what a dismissal lands on.
    report(`${label}px · the receipt's header is visible above it`,
      stack.headBottom !== null && stack.headBottom <= stack.cardTop && stack.headTop >= 52,
      `header ${stack.headTop}–${stack.headBottom}, card from ${stack.cardTop}`);
  }

  // TWO DISMISSALS, IN ORDER.
  await page.keyboard.press("Escape");
  await card.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
  const afterOne = { card: await card.count(), receipt: await receipt.count() };
  report(`${label}px · Escape closes the card and lands on the receipt`,
    afterOne.card === 0 && afterOne.receipt === 1, `card ${afterOne.card}, receipt ${afterOne.receipt}`);
  await page.keyboard.press("Escape");
  await receipt.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
  report(`${label}px · a second Escape closes the receipt`, (await receipt.count()) === 0,
    `receipt ${await receipt.count()}`);

  // PROVENANCE: collapsed, and four rows once pressed.
  const toggle = onPageRole(page, "button", /How we make these decisions/);
  const expanded = await toggle.getAttribute("aria-expanded");
  await toggle.click();
  const terms = await onPage(page, '[data-testid="provenance"] dt').count();
  report(`${label}px · provenance opens from collapsed to four rows`, expanded === "false" && terms === 4,
    `was ${expanded}, ${terms} rows`);
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const first = await browser.newContext({ viewport: WIDTHS[0].viewport });
    const scout = await first.newPage();
    await signIn(scout);
    let href = null;
    for (const candidate of (await deckHrefs(scout)).slice(0, 12)) {
      if ((await openAnalysis(scout, candidate)) && (await listFinding(scout))) { href = candidate; break; }
    }
    await first.close();
    if (!report("a deck with a finding to open", href !== null, href ?? "none of the first 12 decks has one")) return;
    console.log(`       (walking ${href})`);

    for (const { label, viewport } of WIDTHS) {
      const ctx = await browser.newContext({ viewport });
      const p = await ctx.newPage();
      await signIn(p);
      if (report(`${label}px · the Analysis tab drew its findings`, await openAnalysis(p, href), "pressed")) {
        await walk(p, label, viewport.width);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

await run();
// Outside `run()`, so no early return can skip it, and never `process.exit` inside a `finally`.
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
