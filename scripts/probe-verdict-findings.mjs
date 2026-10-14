// The findings, their receipt and the stacked card modal, measured in a real browser at 1300x900
// and 390x844.
//
// WHY A BROWSER. Four of the rulings here are facts about laid-out geometry or about two dialogs
// at once, and jsdom has neither:
//
//   · The five findings are TILES IN ONE ROW on desktop and ROWS IN ONE COLUMN on the phone, from
//     one list restyled at `md:`. A class that did not compile leaves the markup identical and the
//     layout wrong, so the probe groups the five by their MEASURED top edge.
//   · The receipt is a 760px modal on desktop, four tiles across, and a sheet from 52px down on
//     the phone (Analysis tab handoff §3, 3a).
//   · A card opened from the receipt STACKS (verdict addendum, ruling 1): the receipt stays, steps
//     down to `--surface-sunken` on desktop. On the phone the card REPLACES the receipt (stacked
//     sheets R1), and this probe asserts no phone geometry for it (see the note at the stacked
//     check below); `stacked-phone.test.tsx` and the stacked-sheets walk hold that.
//   · Two dismissals land in the order the sheets were opened: Escape closes the card and leaves
//     the receipt, and a second Escape closes the receipt. `useDialogA11y` answers a key pressed
//     inside another dialog by ignoring it, and only a real focus model can say it did.
//   · On desktop the stacked card's close is the WAY BACK: a `← {finding}` pill in the ✕'s slot,
//     and the card's name keeps clear of it however long the label. That clearance is a measured
//     reserve (readiness finding 10), so the probe reads the name row's rects against the pill's.
//     Pressing the pill is the first dismissal on desktop; Escape is the phone's.
//   · How we make these decisions opens as a SHEET (3c), 560px on desktop, with its five rows (tutors the fifth, brief §5.5).
//   · What would have to go opens from the climb's lower rung as a SHEET (3b): 700px on desktop,
//     a 43px header on the phone whose sentence is 14px, the target's mark in that header, no
//     target chips, no decklist link, and a candidate that stacks a card whose way back is the
//     target bracket's name.
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
import { holdProfile } from "./lib/profile-hold.mjs";
import { onPage, onPageRole, PAGE } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

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
/** Every deck whose stored reading this run cleared, and how to put it back. */
const held = new Map();
const heldSql = neon(DATABASE_URL);
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
  await clearAboutSheet(page, await page.evaluate(() => window.Clerk.user.id));
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
  // THE PRESS IS REQUIRED. The deck's stored reading is cleared first (held on disk, restored in
  // `run()`'s `finally`), so the only way to a reading is the press. A probe that fell back on a
  // stored reading stayed green through a renamed button and measured nothing.
  const deckId = href.split("/")[2];
  if (!held.has(deckId)) held.set(deckId, await holdProfile(heldSql, deckId));
  await heldSql`delete from deck_profiles where deck_id = ${deckId}::uuid`;
  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  const up = await page.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 })
    .then(() => true).catch(() => false);
  if (!up) return false;
  await page.waitForTimeout(500);
  const tab = onPageRole(page, "tab", /analysis/i);
  if ((await tab.count()) === 0) return false;
  await tab.first().click();
  // `Analyze` before a reading (PR B's label), `Re-analyze` on the banner over a stale one (C2).
  const invite = onPageRole(page, "button", /^Analyze$/);
  // The tab holds its loader until the whole tab can paint (#1025), so the press is not there the
  // moment the tab is. Wait for it; a renamed press still times out and fails below.
  await invite.first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  if (!report(`the Analyze press is on ${href}`, (await invite.count()) > 0, "none: the press was renamed or removed")) return false;
  await invite.first().click();
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
    report(`${label}px · the receipt is a 760px modal`, Math.abs(box.width - 760) <= 1, `width ${box.width}`);
  }

  // THE TILES: one per card, painted art where the deck has it, and no fact mark on any tile.
  const tiles = await receipt.evaluate((r) => {
    const grid = r.querySelector('[data-testid="receipt-grid"]');
    const all = [...(grid?.querySelectorAll('[data-testid="receipt-tile"]') ?? [])];
    const painted = all.filter((t) => {
      // The art is the plate's own layer since the card-art fades (`ArtLayer`), never the plate's background.
      const plate = t.firstElementChild;
      return !!plate && [plate, ...plate.querySelectorAll("*")].some((e) => getComputedStyle(e).backgroundImage.startsWith("url("));
    }).length;
    const cols = new Set(all.slice(0, 6).map((t) => Math.round(t.getBoundingClientRect().left))).size;
    return { count: all.length, painted, cols, marks: grid?.querySelectorAll('[data-testid^="card-fact-"]').length ?? -1 };
  });
  report(`${label}px · the receipt draws a tile per card`, tiles.count > 0, `${tiles.count} tiles`);
  report(`${label}px · tiles carry the deck's own art`, tiles.painted > 0, `${tiles.painted} of ${tiles.count} painted`);
  report(`${label}px · no fact mark on a tile (ruling 2)`, tiles.marks === 0, `${tiles.marks} marks`);
  report(`${label}px · ${phone ? "two" : "up to four"} tiles to a row`,
    phone ? tiles.cols === Math.min(2, tiles.count) : tiles.cols === Math.min(4, tiles.count), `${tiles.cols} columns`);

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
  // The phone's 96px card sheet and the visible receipt header above it were retired by stacked
  // sheets R1: the card now covers the receipt at full height. No layout probe re-asserts it.

  // THE WAY BACK (desktop). The pill names the receipt, sits in the ✕'s slot, and nothing in the
  // card's name row runs under it. The receipt's body steps down to 0.35 behind the card.
  if (!phone) {
    const back = await page.evaluate((finding) => {
      const c = document.querySelector('[role="dialog"][aria-labelledby="card-modal-title"]');
      const pill = c?.querySelector('[data-testid="card-modal-back"]');
      const title = c?.querySelector("#card-modal-title");
      const row = title?.closest("[style*='--close-reserve']");
      const r = document.querySelector('[data-testid="receipt-modal"]');
      if (!pill || !row) return { pill: !!pill, row: !!row };
      const p = pill.getBoundingClientRect();
      const inkRight = Math.max(...[...row.querySelectorAll("*")]
        .filter((el) => el.children.length === 0 && el.getBoundingClientRect().width > 0)
        .map((el) => el.getBoundingClientRect().right));
      return {
        pill: true,
        row: true,
        text: pill.textContent,
        named: pill.getAttribute("aria-label") === `Back to ${finding}`,
        pillLeft: Math.round(p.left),
        inkRight: Math.round(inkRight),
        overlapV: p.bottom > row.getBoundingClientRect().top && p.top < row.getBoundingClientRect().bottom,
        bodyOpacity: r ? getComputedStyle(r.lastElementChild).opacity : null,
      };
    }, await receipt.locator("h2").innerText());
    report(`${label}px · the stacked card's close is a way back named for the receipt`,
      back.pill && back.named === true, back.pill ? `"${back.text}"` : "no pill");
    report(`${label}px · the card's name row keeps clear of the pill`,
      back.row && (!back.overlapV || back.inkRight <= back.pillLeft - 8),
      back.row ? `ink ends ${back.inkRight}, pill from ${back.pillLeft}` : "no name row");
    report(`${label}px · the receipt's body steps down to 0.35 behind the card`,
      back.bodyOpacity === "0.35", `opacity ${back.bodyOpacity}`);
  }

  // TWO DISMISSALS, IN ORDER. On desktop the first is the pill, on the phone Escape.
  if (phone) await page.keyboard.press("Escape");
  else await card.locator('[data-testid="card-modal-back"]').click();
  await card.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
  const afterOne = { card: await card.count(), receipt: await receipt.count() };
  report(`${label}px · ${phone ? "Escape" : "the pill"} closes the card and lands on the receipt`,
    afterOne.card === 0 && afterOne.receipt === 1, `card ${afterOne.card}, receipt ${afterOne.receipt}`);
  await page.keyboard.press("Escape");
  await receipt.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
  report(`${label}px · a second Escape closes the receipt`, (await receipt.count()) === 0,
    `receipt ${await receipt.count()}`);

  // PROVENANCE (3c): an opener, and a sheet with five rows, 560 on desktop, closed by Escape.
  const opener = onPageRole(page, "button", /How we make these decisions/);
  // Desktop: the head row's right end. Phone: under the findings box. One mount either way.
  const place = await opener.evaluate((b) => {
    const block = b.closest('[data-testid="findings-block"]');
    const head = block.querySelector("h3").getBoundingClientRect();
    const list = block.querySelector("ul").getBoundingClientRect();
    const r = b.getBoundingClientRect();
    return { rowGap: Math.abs(r.top + r.height / 2 - (head.top + head.height / 2)), rightGap: Math.round(block.getBoundingClientRect().right - r.right), belowList: r.top >= list.bottom - 1 };
  });
  report(`${label}px · the provenance opener sits ${phone ? "under the findings box" : "at the head row's right end"}`,
    phone ? place.belowList : place.rowGap <= 8 && place.rightGap <= 2,
    phone ? `below list ${place.belowList}` : `off the head's line by ${Math.round(place.rowGap)}px, ${place.rightGap}px from the right`);
  const popup = await opener.getAttribute("aria-haspopup");
  await opener.click();
  const sheet = page.locator('[role="dialog"]').filter({ has: page.locator('[data-testid="provenance"]') });
  await sheet.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  const terms = await sheet.locator("dt").count();
  report(`${label}px · provenance opens a sheet with five rows`, popup === "dialog" && terms === 5,
    `haspopup ${popup}, ${terms} rows`);
  // Brief §5.5: the fifth row is tutors, its measured basis and the size of the set, and its lines
  // are not cut at either width. Read by its label, never by position, so a reordered sheet that
  // drops the row still reads 4 above rather than passing here on another row.
  const tutors = await sheet.locator("dt").evaluateAll((dts) => {
    const dt = dts.find((d) => d.textContent.trim().startsWith("Tutors"));
    // The row is its dt and every dd after it (a from line, then a misses line), up to the next dt.
    const dds = [];
    for (let el = dt?.nextElementSibling; el && el.tagName === "DD"; el = el.nextElementSibling) dds.push(el);
    if (dds.length === 0) return null;
    const cut = dds.flatMap((dd) => [dd, ...dd.querySelectorAll("*")]).some((el) => el.scrollWidth > el.clientWidth);
    const h = dds.reduce((sum, dd) => sum + dd.getBoundingClientRect().height, 0);
    return { text: dds.map((dd) => dd.innerText).join(" "), cut, h };
  });
  report(`${label}px · the tutors row states its basis and the set's size, uncut`,
    !!tutors && /22 cards of a curated set/.test(tutors.text) && /we count \d+ cards as tutors/.test(tutors.text) && !tutors.cut && tutors.h > 0,
    tutors ? `cut ${tutors.cut}, ${Math.round(tutors.h)}px, "${tutors.text.slice(0, 60)}…"` : "no tutors row");
  const pbox = await sheet.boundingBox();
  if (phone) {
    report(`${label}px · the provenance sheet starts 52px down`, pbox && Math.abs(pbox.y - 52) <= 1, `top ${pbox?.y}`);
  } else {
    report(`${label}px · the provenance sheet is 560px`, pbox && Math.abs(pbox.width - 560) <= 1, `width ${pbox?.width}`);
  }
  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
  report(`${label}px · Escape closes the provenance sheet`, (await sheet.count()) === 0, `${await sheet.count()} open`);

  await walkUpgradePath(page, label, width);
}

/** 3b: what would have to go, from the climb's lower rung. */
async function walkUpgradePath(page, label, width) {
  const phone = width < 768;
  const opener = onPageRole(page, "button", /what would have to go/);
  if (!report(`${label}px · the lower rung offers what would have to go`, (await opener.count()) === 1,
    `${await opener.count()} openers`)) return;
  if (phone) {
    // Its own row at the rung's right edge, and a 44px target (the 390 frame).
    const geo = await opener.evaluate((b) => {
      const rung = b.closest('[data-testid="climb-rung"]').getBoundingClientRect();
      const r = b.getBoundingClientRect();
      return { h: Math.round(r.height), gapRight: Math.round(rung.right - r.right) };
    });
    report(`${label}px · the rung's opener is a 44px target at the rung's right`,
      geo.h >= 44 && geo.gapRight <= 14, `${geo.h}px tall, ${geo.gapRight}px from the rung's right`);
  }
  const popup = await opener.getAttribute("aria-haspopup");
  await opener.click();
  const sheet = page.locator('[role="dialog"]').filter({ has: page.locator('[data-testid="upgrade-path"]') });
  await sheet.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  const box = await sheet.boundingBox();
  if (!report(`${label}px · it opens a sheet`, popup === "dialog" && box !== null, `haspopup ${popup}`)) return;
  if (phone) {
    report(`${label}px · the path's sheet starts 52px down`, Math.abs(box.y - 52) <= 1, `top ${box.y}`);
  } else {
    report(`${label}px · the path's sheet is 700px`, Math.abs(box.width - 700) <= 1, `width ${box.width}`);
  }
  const head = await sheet.evaluate((d) => {
    const h = d.firstElementChild;
    const title = h?.querySelector("h2");
    const hb = h.getBoundingClientRect();
    return {
      mark: !!h?.querySelector('[data-testid="bracket-mark"]'),
      title: title?.textContent ?? "",
      size: title ? getComputedStyle(title).fontSize : null,
      // A one-line title ellipsizes with scrollWidth only a pixel over clientWidth, so the width
      // test has no tolerance and applies to a nowrap title alone; a clamped one overflows down.
      clipped: title
        ? (getComputedStyle(title).whiteSpace === "nowrap" && title.scrollWidth > title.clientWidth)
          || title.scrollHeight > title.clientHeight + 1
        : null,
      titleLines: title ? Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight)) : null,
      inkInside: [...h.querySelectorAll("h2, [data-testid='bracket-mark']")].every((el) => el.getBoundingClientRect().bottom <= hb.bottom + 0.5),
      height: Math.round(hb.height),
      chips: d.querySelectorAll("[aria-pressed], [role='group']").length,
      decklist: /open your decklist/i.test(d.textContent ?? ""),
    };
  });
  report(`${label}px · the target's mark heads the sheet`, head.mark, head.mark ? "drawn" : "absent");
  report(`${label}px · the header names the target and what goes`, /would have to go|not reachable/.test(head.title),
    `"${head.title}"`);
  if (phone) {
    report(`${label}px · the header's sentence is 14px, inside a 43px header`,
      head.size === "14px" && head.height === 43 && head.inkInside, `${head.size}, header ${head.height}px`);
    // The 390 frame draws the sentence WHOLE, wrapping inside the 43px header, never truncated.
    report(`${label}px · the header's sentence is whole`, head.clipped === false && head.titleLines <= 2,
      `clipped ${head.clipped}, ${head.titleLines} lines`);
  }
  report(`${label}px · no target chips and no decklist link`, head.chips === 0 && !head.decklist,
    `${head.chips} chips, decklist ${head.decklist}`);

  // A CANDIDATE STACKS, and the way back is the target's name, the opening words of the header.
  // A path blocked by the command zone lists no candidate by design (the commander is a span),
  // so no candidate is a failure only on a path that is not blocked.
  const candidate = sheet.locator('[data-testid="upgrade-path"] button').first();
  if ((await candidate.count()) === 0 && /not reachable/.test(head.title)) {
    console.log(`       (${label}px · the path is blocked with nothing cuttable: no candidate to stack)`);
    await page.keyboard.press("Escape");
    return;
  }
  if (!report(`${label}px · the path lists a candidate to open`, (await candidate.count()) === 1, `${await candidate.count()} found`)) {
    await page.keyboard.press("Escape");
    return;
  }
  await candidate.click();
  const card = page.locator('[role="dialog"][aria-labelledby="card-modal-title"]');
  await card.waitFor({ state: "visible", timeout: 15_000 });
  report(`${label}px · a candidate stacks on the sheet`, (await sheet.count()) === 1, "sheet stays");
  if (!phone) {
    const back = await card.locator('[data-testid="card-modal-back"]').getAttribute("aria-label").catch(() => null);
    // One wording at both widths since 2026-10-05 (`deckAnalysisCopy.sheets.upgradePath`): the
    // bracket name alone read as a place in the climb, not a way back to this sheet.
    report(`${label}px · the card's way back names the sheet`, back === "Back to What would have to go", `${back ?? "no pill"}`);
  }
  await page.keyboard.press("Escape");
  await card.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
  report(`${label}px · Escape lands back on the path`, (await card.count()) === 0 && (await sheet.count()) === 1,
    `card ${await card.count()}, sheet ${await sheet.count()}`);
  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
  report(`${label}px · a second Escape closes the path`, (await sheet.count()) === 0, `${await sheet.count()} open`);
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
      // 3b needs a rung below the reading, which a deck at the bottom of the ladder has none of,
      // so the fixture must draw both a finding with cards AND the lower rung's opener.
      if ((await openAnalysis(scout, candidate)) && (await listFinding(scout))
        && (await onPageRole(scout, "button", /what would have to go/).count()) === 1) {
        href = candidate;
        break;
      }
    }
    await first.close();
    if (!report("a deck with a finding to open", href !== null, href ?? "none of the first 12 decks has both a finding with cards and a rung below")) return;
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
    for (const [deckId, restore] of held) {
      await restore().catch((e) => report(`put back ${deckId}'s analysis`, false, e.message));
    }
    await browser.close();
  }
}

await run();
// Outside `run()`, so no early return can skip it, and never `process.exit` inside a `finally`.
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
