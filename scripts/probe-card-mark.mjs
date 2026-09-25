// probe:card-mark — the card mark's four rulings, measured in a real browser.
//
// jsdom lays nothing out, so every ruling here is invisible to the unit suite: a size is a
// class string, a collision is two elements that never have rects, and a row that GREW is a
// height nothing computes. The unit tests can say which glyph a surface asks for; only this
// can say what the reader gets.
//
// WHAT IT MEASURES, at 1300x900 and 390x844:
//   · the mark's drawn box on each surface — including the deck's CARD VIEW, which is
//     reached by a press rather than a URL and which a URL-driven sweep therefore missed
//     entirely, letting it ship with no mark and no key — and ALWAYS exactly 16x16, the
//     one size the mark draws at anywhere (ruled 2026-09-21, replacing a 12px floor that
//     let six mounts ship four different sizes)
//   · no collision in the row's densest state — measured as intersecting RECTS against the
//     ownership dot, the availability marker, the buy tag, the pips and the caption
//   · no row grew — a marked row against an unmarked one on the same surface, measured in
//     two passes because the search that finds the marked card leaves nothing to compare
//     it against. LIVE on the collection row and inert on the tile, whose height its art
//     fixes; the body of that check says so rather than implying it guards both
//   · the key is on screen wherever a mark is — SEEN, not merely present in the DOM, since
//     a hidden or zero-sized key produces the same three SVGs — and a FAILURE, never a note
//   · the glow is a `filter`, never a `box-shadow` — a shadow would be in the box model and
//     every "nothing grew" check above would start lying
//
// A RUN THAT FINDS NO MARKED CARD FAILS. The reference account owns 17 marked cards out of
// ~2,805, so a sweep of an arbitrary page photographs nothing and reads as a clean pass —
// which is this probe's own "not a pass" rule broken by the probe. It says which card it
// found, and stops if it found none.
//
// Run by hand, and not part of `pnpm test`:
//   node scripts/probe-card-mark.mjs
//   PROBE_BASE=http://localhost:3600 PROBE_MARKED_CARD="Farewell" node scripts/probe-card-mark.mjs
//
// TWO PRECONDITIONS, both of which fail LOUDLY rather than quietly:
//
//   1. The account must own a card carrying a fact, and a deck must hold one. 17 of the
//      reference account's ~2,805 collection rows carry a mark, and most decks hold none.
//
//   2. The account must have SEEN the current `ABOUT_VERSION`. The About gate (#658)
//      redirects a reader below it to /about, so `/decks` silently becomes the About page
//      — whose own specimen deck links then read as this account's decks. Visit /about once
//      in the app to clear it. This probe will not clear it for you: doing so writes
//      `about_version_seen` on your account, and this script makes no writes.
//
// Point it at `local-dev`. It makes no writes.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, PAGE } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
// An EXTRA-TURN card by default, not a Game Changer: `game_changer` rides the card row and
// has always reached every surface, while the two joined flags are the pair that had no
// route to the modal at all. The default exercises the path that was broken.
const CARD = process.env.PROBE_MARKED_CARD ?? "Expropriate";
// `cardMarkCopy.modalHeading`, stated once here because a probe cannot import the TS module.
// It was "In the bracket rules" until the tutor joined the block on 2026-09-22.
const MODAL_HEADING = "Bracket facts";
// A deck that HOLDS a marked card — DISCOVERED by asking /decks rather than hardcoded.
//
// A hardcoded id was wrong twice over: most decks hold no marked card at all (the busiest
// on this data holds four of 99), and the ids differ per fixture account, so a literal
// belonging to one account reports "no mark" on another's perfectly working build. Asking
// the page cannot drift from it.
const DECK = process.env.PROBE_DECK ?? null;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 }, hasTouch: false },
  // `hasTouch` IS THE PHONE, not the width. A 390px context with Playwright's default
  // pointer reports `(pointer: fine)`, so the app correctly opens a hover tooltip there
  // and the phone's "stays silent" check read as a pass only while the tooltip was
  // broken on every surface — a false green produced by two faults cancelling.
  { label: 390, viewport: { width: 390, height: 844 }, hasTouch: true },
];

/**
 * ONE SIZE, EVERYWHERE — the glyph, in the key and on a card alike. A FLOOR is what this
 * used to check, and a floor is what let the mark ship at 12, 13, 14 and 16 across six
 * mounts while passing: every one of those clears 12. An exact figure is the ruling.
 */
const SIZE = 16;
const SIZE_TOLERANCE_PX = 0.5;

/**
 * Every DRAWN mark's box, the key's samples included, against the one size. A zero box is
 * skipped rather than reported: a responsive twin (`hidden md:block`) is in the DOM at both
 * widths and is not a mark anyone sees at the width it is hidden at.
 */
function sizeOffenders(list) {
  return list
    .filter((m) => m.w > 0 && m.h > 0)
    .filter((m) => Math.abs(m.w - SIZE) > SIZE_TOLERANCE_PX || Math.abs(m.h - SIZE) > SIZE_TOLERANCE_PX)
    .map((m) => `${m.fact} ${m.w}x${m.h}`);
}
/**
 * A COPY of `OPEN_DELAY_MS` in `fact-tooltip.tsx`, and unavoidably one: this is a node
 * script and that is a `.tsx` module. Nothing ties them together, so a change to the
 * component's delay drifts this silently — the wait carries 350ms of headroom for that
 * reason, and a shortened delay stays covered while a lengthened one fails loudly rather
 * than reporting "nothing opened".
 */
const OPEN_DELAY_MS = 400;
// Each deck page is a round trip, so the scan is capped — and the cap is REPORTED, because a
// silent one turns "this account has no marked deck" into a claim about the first eight.
const DECK_SCAN_LIMIT = 8;

let failures = 0;
function report(label, ok, detail) {
  // The count lives HERE rather than at each call site: a check that forgot to add one
  // printed FAIL and then "All checks passed" over the top, with the exit code agreeing
  // with the wrong half. A probe whose own output cannot be read is worse than no probe.
  if (!ok) failures += 1;
  console.log(`${ok ? " ok  " : " FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
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
  // Writes a browser cookie only, never the database (see the header).
  await clearAboutSheet(page, await page.evaluate(() => window.Clerk.user.id));
}

/** Every drawn fact mark on the page, with its box and its resolved glow. */
async function marks(page) {
  return page.evaluate((scope) => {
    const root = document.querySelector(scope);
    if (!root) return [];
    return [...root.querySelectorAll('[data-testid^="card-fact-"]')].map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        fact: el.getAttribute("data-testid").replace("card-fact-", ""),
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        x: r.x, y: r.y, right: r.right, bottom: r.bottom,
        filter: cs.filter,
        boxShadow: cs.boxShadow,
        inKey: Boolean(el.closest('[role="group"]')),
        // PRESENCE IS NOT VISIBILITY. A key hidden, collapsed to zero or scrolled past
        // still puts three SVGs in the DOM, and the check that makes a wordless mark legal
        // would pass over a gloss no reader can see.
        onScreen:
          r.width > 0 &&
          r.height > 0 &&
          cs.visibility !== "hidden" &&
          cs.display !== "none" &&
          Number(cs.opacity) > 0 &&
          r.bottom > 0 &&
          r.right > 0 &&
          r.top < window.innerHeight &&
          r.left < window.innerWidth,
      };
    });
  }, PAGE);
}

async function searchFor(page, term) {
  const box = onPage(page, 'input[type="search"]');
  await box.first().fill(term);
  await page.waitForTimeout(1200);
}

/**
 * Navigate, and REFUSE to measure a page we did not ask for.
 *
 * The About gate (#658) redirects a reader below `ABOUT_VERSION` to /about, and it does it
 * silently: the wait resolves, `h1` is present, and every subsequent query runs happily
 * against the wrong page. This probe read /about's own specimen deck links as though they
 * were the account's decks and concluded the fixture was missing.
 *
 * `proxy-mark.json` records the same trap by name — "lets the cell count as reached while
 * photographing the About page". A probe that cannot tell which page it is on cannot report
 * anything about the one it meant to visit.
 */
async function goTo(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await onPage(page, "h1").first().waitFor({ state: "attached", timeout: 30_000 });
  const landed = new URL(page.url()).pathname;
  const wanted = path.split("?")[0];
  if (landed !== wanted) {
    return { ok: false, landed, wanted };
  }
  return { ok: true, landed, wanted };
}

/**
 * The first deck whose page actually DRAWS a mark.
 *
 * Returns the href, or null. Null is a real state on an account whose decks hold none, and
 * is reported as a MISSING FIXTURE rather than a defect: "no deck holds a marked card" and
 * "the mark stopped drawing" look identical from one hardcoded deck, and only one is a bug.
 *
 * IT STOPS AT `DECK_SCAN_LIMIT`, and says so when it does. Opening a deck page costs a
 * round trip, so scanning an account with forty of them would dominate the run — but a
 * silent cap is how "no deck holds one" gets reported about an account whose ninth does.
 * When the scan is truncated the caller is told, so the difference between "looked
 * everywhere" and "looked at eight" is never lost.
 */
async function findMarkedDeck(page) {
  const nav = await goTo(page, "/decks");
  if (!nav.ok) {
    report("decklist row · reached /decks", false,
      `redirected to ${nav.landed} — the About gate sends a reader below ABOUT_VERSION to ` +
      `/about, and its specimen deck links read as this account's decks`);
    return null;
  }
  // WAIT FOR THE LIST, not just for an `h1`. The shell's heading is attached long before
  // the decks are, so reading the anchors here returned only the `new`/`import` CTAs and
  // the probe reported "this account owns no decks at all" about an account that owns one.
  // A race that resolves to an empty list is indistinguishable from an empty list.
  await page
    .waitForFunction(
      (scope) => {
        const root = document.querySelector(scope);
        const links = [...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
          .map((a) => a.getAttribute("href"))
          .filter((h) => h && h.split("/").length === 3 && !["new", "import"].includes(h.split("/")[2]));
        // Either a deck has appeared, or the list has settled with none — the empty state
        // names itself, so the two are told apart rather than waited through.
        return links.length > 0 || Boolean(root?.textContent?.includes("No decks"));
      },
      PAGE,
      { timeout: 15_000 },
    )
    .catch(() => {});
  const hrefs = await page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...new Set([...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href"))
      // `/decks/new` and `/decks/import` are CTAs, not decks, and both match a naive
      // "three segments" test — an account with no decks at all returned two of them and
      // the scan reported "checked 0" rather than "this account has none".
      .filter((h) => h && h.split("/").length === 3 && !["new", "import"].includes(h.split("/")[2])))];
  }, PAGE);
  for (const href of hrefs.slice(0, DECK_SCAN_LIMIT)) {
    const deckNav = await goTo(page, href);
    if (!deckNav.ok) continue;
    await page.waitForTimeout(1500);
    const drawn = (await marks(page)).filter((m) => !m.inKey);
    if (drawn.length > 0) return { href, truncated: false, seen: 0, total: hrefs.length };
  }
  return { href: null, truncated: hrefs.length > DECK_SCAN_LIMIT, seen: Math.min(hrefs.length, DECK_SCAN_LIMIT), total: hrefs.length };
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    for (const { label, viewport, hasTouch } of WIDTHS) {
      const context = await browser.newContext({ viewport, hasTouch });
      const page = await context.newPage();
      await signIn(page);

      const found = DECK ? { href: `/decks/${DECK}` } : await findMarkedDeck(page);
      const deckHref = found?.href ?? null;
      if (!deckHref) {
        report(`${label}px · decklist row · a deck that holds a marked card`, false,
          found?.truncated
            ? `none among the first ${found.seen} of ${found.total} decks — raise DECK_SCAN_LIMIT or set PROBE_DECK`
            : found?.total === 0
              ? "this account owns no decks at all — the fixture is missing, not the mark"
              : `none of this account's ${found?.total} deck(s) holds a marked card — the fixture is missing, not the mark`);
      }

      // THE DECK'S CARD VIEW is reached by pressing a toggle rather than by a URL, which is
      // exactly why the first version of this probe never looked at it — and why it shipped
      // drawing no mark and no key, with every check here green. A surface reachable only
      // by a press is a surface a URL-driven sweep cannot see.
      const cardViewSurface = async () => {
        if (!deckHref) return;
        const nav = await goTo(page, deckHref);
        if (!report(`${label}px · deck card view · reached the deck`, nav.ok,
            nav.ok ? undefined : `redirected to ${nav.landed}`)) return;
        const toggle = onPage(page, 'button[aria-label="Card view"]').first();
        if (!(await toggle.count())) {
          report(`${label}px · deck card view · found the toggle`, false, "no Card view control");
          return;
        }
        await toggle.click();
        await page.waitForTimeout(1200);
        const all = await marks(page);
        const drawn = all.filter((m) => !m.inKey);
        const keyed = all.filter((m) => m.inKey && m.onScreen);
        report(`${label}px · deck card view · the tiles draw the mark`, drawn.length > 0,
          drawn.length ? `${drawn.length} mark(s)` : "no mark on any tile");
        if (drawn.length) {
          const off = sizeOffenders(all);
          report(`${label}px · deck card view · every mark is ${SIZE}x${SIZE}`,
            off.length === 0, off.length ? off.join(", ") : `${drawn.length} at ${SIZE}px`);
        }
        // The pair that shipped broken together: a surface drawing marks with no gloss.
        // Same relation as the row view rather than a count — the deck is a closed set,
        // so the key names exactly the facts its cards carry and nothing else.
        const drawnF = [...new Set(drawn.map((m) => m.fact))].sort();
        const keyF = [...new Set(keyed.map((m) => m.fact))].sort();
        report(`${label}px · deck card view · every drawn mark is glossed by a visible key`,
          keyed.length > 0 && drawnF.every((f) => keyF.includes(f)),
          keyed.length ? `glosses ${keyF.join(", ")}` : "no visible key");
        report(`${label}px · deck card view · and glosses NOTHING the deck does not hold`,
          keyF.every((f) => drawnF.includes(f)),
          keyF.filter((f) => !drawnF.includes(f)).join(", ") || "exact");

        // THE HOVER HERE TOO. The rule is "every surface that draws the glyph", and this
        // surface draws it — a tile mount left bare would otherwise be the one the sweep
        // in the loop above cannot reach, since this view is opened by a press.
        const tileMark = (await onPage(page, '[data-testid^="card-fact-"]').elementHandles())
          .length
          ? await (async () => {
              for (const h of await onPage(page, '[data-testid^="card-fact-"]').elementHandles()) {
                if (await h.evaluate((el) => !el.closest('[role="group"]')
                    && el.getBoundingClientRect().width > 0)) return h;
              }
              return null;
            })()
          : null;
        if (!tileMark) {
          report(`${label}px · deck card view · a tile mark to hover`, false, "none outside the key");
        } else {
          const before = await page.evaluate(() => document.body.innerText);
          const hovered = await tileMark.hover().then(() => true).catch(() => false);
          await page.waitForTimeout(OPEN_DELAY_MS + 350);
          const opened =
            (await page.evaluate(() => document.body.innerText)).length > before.length;
          if (!hovered) {
            report(`${label}px · deck card view · the pointer reached the mark`, false, "hover refused");
          } else if (label === 1300) {
            report(`${label}px · deck card view · the mark explains itself on hover`, opened,
              opened ? "a tooltip opened" : "nothing opened after the delay");
          } else {
            report(`${label}px · deck card view · no hover tooltip under a coarse pointer`, !opened,
              opened ? "a tooltip opened on a phone" : "silent, as designed");
          }
        }
      };

      for (const [surface, url, search] of [
        ...(deckHref ? [["decklist row", deckHref, null]] : []),
        ["collection rows", "/collection?view=rows", CARD],
        // `?view=grid` EXPLICITLY. With no param the view resolves to
        // `isDesktop ? "grid" : "rows"` and a fresh context stores nothing, so at 390 this
        // surface rendered the ROWS view — and the tile, which drew the smallest mark of any
        // surface when the size was still per-mount, was never measured at the width that
        // matters. It draws at the same 16 as everything else now; the explicit param stays,
        // because a surface this check never reaches is a surface it never guards.
        ["collection tiles", "/collection?view=grid", CARD],
      ]) {
        // `attached`, never `visible`: a collapsed title is zero-width, which Playwright
        // calls hidden, and waiting on visibility turns a layout defect into a 30s timeout
        // that abandons every width after the first.
        const nav = await goTo(page, url);
        if (!report(`${label}px · ${surface} · reached the route`, nav.ok,
            nav.ok ? undefined : `redirected to ${nav.landed}`)) continue;
        if (search) await searchFor(page, search);

        const all = await marks(page);
        const drawn = all.filter((m) => !m.inKey);
        const keyed = all.filter((m) => m.inKey);

        // A run that found no mark measured nothing, and saying so is the whole point.
        // A run that found no mark measured nothing, and saying so is the whole point —
        // but WHY it found none decides what the reader should do, so the message names
        // the precondition rather than leaving "no mark" to read as "the mark is broken".
        //
        // Most decks hold no marked card at all: the reference account's busiest holds
        // four of 99, and only one of local-dev's accounts owns a deck holding any. So a
        // deck that draws none is usually the wrong deck, not a regression.
        const why = surface === "decklist row"
          ? `no mark on this deck — PROBE_DECK must name a deck that HOLDS one (most hold none)`
          : `no mark for "${CARD}" — either this account does not own it, or this surface `
            + `is not drawing marks (the modal check below tells the two apart: it passing `
            + `means the card is owned and reachable)`;
        if (!report(`${label}px · ${surface} · found a marked card`, drawn.length > 0,
            drawn.length ? `${drawn.length} mark(s) on ${surface === "decklist row" ? url : `"${CARD}"`}` : why)) {
          continue;
        }

        const off = sizeOffenders(all);
        report(`${label}px · ${surface} · every mark is ${SIZE}x${SIZE}`,
          off.length === 0, off.length ? off.join(", ") : `${drawn.length} at ${SIZE}px`);

        // THE SET LINE SITS UNDER THE NAME, WHOLE. On the meta line it shared a row with the
        // chip and the marks, and a marked card pushed `TLE · uncommon` past the tile's edge
        // (reported 2026-09-23). Measured on the MARKED tile, since an unmarked one had room
        // on the old line too and passes either build. `innerText` reads a truncated span
        // back whole, so the text is judged by `scrollWidth` against `clientWidth`.
        if (surface === "collection tiles") {
          const sub = await page.evaluate((scope) => {
            const mark = [...document.querySelectorAll(`${scope} [data-testid^="card-fact-"]`)]
              .find((m) => !m.closest('[role="group"]') && m.getBoundingClientRect().width > 0);
            const tile = mark?.closest("button");
            const line = tile?.querySelector('[data-testid="tile-sub"]');
            const name = line?.previousElementSibling?.querySelector("span");
            if (!tile || !line || !name) return null;
            const l = line.getBoundingClientRect();
            const n = name.getBoundingClientRect();
            const t = tile.getBoundingClientRect();
            return {
              text: line.textContent,
              below: l.top >= n.bottom - 1,
              aligned: Math.abs(l.left - n.left) <= 1,
              whole: line.scrollWidth <= line.clientWidth && l.right <= t.right,
            };
          }, PAGE);
          report(`${label}px · ${surface} · SET · rarity sits under the name, left-aligned, uncut`,
            sub !== null && sub.below && sub.aligned && sub.whole && /·/.test(sub.text ?? ""),
            sub === null
              ? "no set line on the marked tile — NOT a pass"
              : `"${sub.text}" · ${sub.below ? "below" : "NOT below"} the name · ${sub.aligned ? "aligned" : "NOT aligned"} · ${sub.whole ? "whole" : "CUT"}`);
        }

        // THE KEY IS REACHABLE, which is the strongest true statement available here.
        //
        // An earlier version centred the first marked row and demanded the key be visible
        // WITH it. That is not a property this surface has: `MarkKey` is a static element
        // above the list, so on a 99-card deck whose marked card sits in a late group the
        // two cannot share a viewport, and the check would fail a correct build. It passed
        // only because the fixture deck is short — the fixture was holding the check up.
        //
        // So: scroll to the key, and require it to be drawn. Plus the ordering that makes
        // it a gloss at all — the key PRECEDES the rows it explains, so a reader scrolling
        // into the list has already passed it.
        const keyReading = await page.evaluate((scope) => {
          const root = document.querySelector(scope);
          const all = [...(root?.querySelectorAll('[data-testid^="card-fact-"]') ?? [])];
          const keyEl = all.find((m) => m.closest('[role="group"]'));
          const rowEl = all.find((m) => !m.closest('[role="group"]'));
          keyEl?.scrollIntoView({ block: "center" });
          return {
            hasKey: Boolean(keyEl),
            // `DOCUMENT_POSITION_FOLLOWING` — the row comes after the key.
            keyFirst: Boolean(
              keyEl && rowEl && keyEl.compareDocumentPosition(rowEl) & Node.DOCUMENT_POSITION_FOLLOWING,
            ),
          };
        }, PAGE);
        await page.waitForTimeout(400);
        const settled = await marks(page);
        const keyVisible = settled.filter((m) => m.inKey && m.onScreen);
        report(`${label}px · ${surface} · the key is drawn where a reader can reach it`,
          keyVisible.length > 0, `${keyVisible.length} of ${keyed.length} visible`);
        report(`${label}px · ${surface} · and it precedes the rows it explains`,
          keyReading.keyFirst, keyReading.hasKey ? "" : "no key at all");

        // THE HOVER, ON EVERY SURFACE THAT DRAWS THE GLYPH. /collection's rows and tiles
        // shipped the mark bare while the decklist row had the tooltip, so the same glyph
        // explained itself on one surface and not the other (reported 2026-09-19).
        //
        // DESKTOP OPENS, PHONE STAYS SILENT, and the phone half is the rule rather than a
        // limitation: the tooltip is `(pointer: fine)` and must not exist on a touch
        // device, so a tap-to-open regression has to fail something.
        {
          // NOT `.first()`. The KEY renders before the rows and its samples are exempt
          // from the tooltip by design — the word it defines is the next element along —
          // so hovering the first mark in the document hovers a sample that is correct to
          // stay silent, and reports every surface broken.
          const handles = await onPage(page, '[data-testid^="card-fact-"]').elementHandles();
          let mark = null;
          for (const h of handles) {
            const rowMark = await h.evaluate(
              (el) => !el.closest('[role="group"]') && el.getBoundingClientRect().width > 0,
            );
            if (rowMark) { mark = h; break; }
          }
          const before = await page.evaluate(() => document.body.innerText);
          // A SWALLOWED HOVER MAKES THE PHONE CHECK VACUOUS. A `.catch(() => {})` turns a
          // detached, intercepted or off-screen mark into "nothing opened", which the
          // coarse-pointer branch reads as "silent, as designed" — a pass printed over a
          // pointer that was never driven. The failure is reported instead.
          const hovered = mark
            ? await mark.hover().then(() => true).catch(() => false)
            : false;
          // Playwright's hover is a real pointer move, so the open delay is real time.
          await page.waitForTimeout(OPEN_DELAY_MS + 350);
          const after = await page.evaluate(() => document.body.innerText);
          const opened = after.length > before.length;
          if (!mark) {
            report(`${label}px · ${surface} · a row mark to hover`, false, "none outside the key");
          } else if (!hovered) {
            report(`${label}px · ${surface} · the pointer reached the mark`, false, "hover refused");
          } else if (label === 1300) {
            report(`${label}px · ${surface} · the mark explains itself on hover`, opened,
              opened ? "a tooltip opened" : "nothing opened after the delay");
            // THE BUBBLE IS WHOLE AND IN THE PAGE'S FACE, on every host. On /collection's
            // tiles it was drawn inside an `overflow-hidden` button and cut off at the tile's
            // edges, and it inherited the caption's mono face while the decklist's read in
            // sans (reported 2026-09-23). `opened` above counts text and saw neither. The
            // face is compared with the BODY's, which is what the decklist row inherits.
            const tip = await page.evaluate(() => {
              const b = document.querySelector('[data-testid="fact-tooltip"]');
              if (!b) return null;
              const r = b.getBoundingClientRect();
              let clipped = false;
              for (let n = b.parentElement; n && n !== document.body; n = n.parentElement) {
                const cs = getComputedStyle(n);
                if (cs.overflowX !== "visible" || cs.overflowY !== "visible") clipped = true;
              }
              return {
                inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
                clipped,
                face: getComputedStyle(b).fontFamily === getComputedStyle(document.body).fontFamily,
                font: getComputedStyle(b).fontFamily.split(",")[0],
              };
            });
            report(`${label}px · ${surface} · the tooltip is whole: on screen, under no clipping box`,
              tip !== null && tip.inView && !tip.clipped,
              tip === null ? "no bubble found — NOT a pass" : `${tip.inView ? "on screen" : "OFF screen"} · ${tip.clipped ? "inside a clipping box" : "unclipped"}`);
            report(`${label}px · ${surface} · the tooltip reads in the page's face, not its host's`,
              tip !== null && tip.face, tip === null ? "no bubble found — NOT a pass" : tip.font);
          } else {
            report(`${label}px · ${surface} · no hover tooltip under a coarse pointer`, !opened,
              opened ? "a tooltip opened on a phone" : "silent, as designed");
          }
        }

        const glowed = drawn.every((m) => m.filter?.includes("drop-shadow"));
        const shadowed = drawn.some((m) => m.boxShadow && m.boxShadow !== "none");
        report(`${label}px · ${surface} · the glow is a filter, not a shadow`,
          glowed && !shadowed, glowed ? (shadowed ? "a box-shadow is also set" : "drop-shadow") : "no drop-shadow");

        // No collision, measured as intersecting rects against everything else on the line.
        const overlap = await page.evaluate((scope) => {
          const root = document.querySelector(scope);
          const hits = [];
          for (const mark of root.querySelectorAll('[data-testid^="card-fact-"]')) {
            if (mark.closest('[role="group"]')) continue;
            const a = mark.getBoundingClientRect();
            // Sweep the whole ROW, not the mark's immediate line. The tooltip wraps each
            // mark in its own `relative inline-flex` span wherever `(pointer: fine)` matches
            // — which headless Chromium reports at both widths — so `closest("span,div")`
            // landed on that wrapper and its parent was the name block. The sweep then saw
            // the name, the two-faced mark and the count, and never the pip track, the
            // availability marker, the buy tag or the meta caption the ruling names. A mark
            // overlapping the fixed pip track reported `clear`.
            const row = mark.closest("li, tr, [class*='grid-cols'], [class*='flex']")?.closest("li, tr") ?? mark.closest("li, tr") ?? mark.parentElement?.parentElement?.parentElement;
            for (const other of row?.querySelectorAll("span, img, svg, button") ?? []) {
              if (other === mark || other.contains(mark) || mark.contains(other)) continue;
              if (other.querySelector('[data-testid^="card-fact-"]')) continue;
              const b = other.getBoundingClientRect();
              if (b.width === 0 || b.height === 0) continue;
              const intersects = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
              if (intersects) hits.push(other.className || other.tagName);
            }
          }
          return hits;
        }, PAGE);
        report(`${label}px · ${surface} · no collision with its neighbours`,
          overlap.length === 0, overlap.length ? `overlaps ${overlap.length}: ${overlap[0]}` : "clear");

        // NOTHING GREW. The glow is a `filter` and the mark is `shrink-0`, so a marked row
        // must be exactly as tall as an unmarked one on the same surface at the same width.
        //
        // Measured in TWO PASSES, because the search that finds the marked card leaves one
        // row on screen and there is nothing to compare it against: the marked row while
        // filtered, the unmarked ones after clearing. Same surface, same viewport.
        //
        // A ROW IS NOT THE SAME ELEMENT ON EVERY SURFACE. /collection's rows are card
        // BUTTONS; a decklist row is a `div` carrying the click, because the row holds
        // controls of its own and a button may not nest one. A version that assumed a
        // button everywhere measured 0 on the decklist and reported "nothing to compare"
        // — a failure, so not a false green, but it proved nothing for as long as the
        // fixture search was also broken and the surface never ran.
        //
        // `[data-decklist-row]` is a hook the component exposes for exactly this, rather
        // than a composed class list, which belongs to the caller and changes with it.
        //
        // WHAT THIS CHECK GUARDS, measured rather than assumed. Quadrupling the mark's box:
        //   · collection ROWS grow — 78px against 49px at 1300, 91px against 60px at 390 —
        //     so the check is live there.
        //   · collection TILES do NOT — 298px either way. A tile's height comes from its
        //     art's aspect-ratio and a fixed caption, so no mark inside the caption can move
        //     it, and this check is structurally inert on that surface.
        // It is kept for both because the rows earn it and the tiles cost nothing, but a
        // green tile row here is not evidence about the tile.
        //
        // The mutation review proposed — deleting `block` from the mark — moves NEITHER
        // surface: the row's height comes from its own padding rather than the line box.
        // The missing check was real; that particular way of exposing it was not.
        const rowSel = surface === "decklist row" ? "[data-decklist-row]" : "button";
        const markedH = await page.evaluate(([scope, rowSel]) => {
          const root = document.querySelector(scope);
          // NOT the first mark in the document: the key renders before the rows and its
          // samples are not inside a button, so `querySelector` returned one of those and
          // `closest("button")` was null. The key's own marks are excluded everywhere in
          // this probe for the same reason.
          const el = [...(root?.querySelectorAll('[data-testid^="card-fact-"]') ?? [])]
            .find((m) => !m.closest('[role="group"]'))
            ?.closest(rowSel);
          return el ? Math.round(el.getBoundingClientRect().height) : 0;
        }, [PAGE, rowSel]);
        await searchFor(page, "");
        const plainH = await page.evaluate(([scope, rowSel]) => {
          const root = document.querySelector(scope);
          const hs = [...(root?.querySelectorAll(rowSel) ?? [])]
            .filter((b) => !b.querySelector('[data-testid^="card-fact-"]'))
            .map((b) => Math.round(b.getBoundingClientRect().height))
            .filter((h) => h > 24);
          return hs.length ? Math.max(...hs) : 0;
        }, [PAGE, rowSel]);
        report(`${label}px · ${surface} · no row grew for the mark`,
          Boolean(markedH && plainH) && markedH <= plainH,
          markedH && plainH ? `marked ${markedH}px vs unmarked ${plainH}px`
                            : `marked ${markedH}px, unmarked ${plainH}px — nothing to compare`);
      }
      await cardViewSurface();

      // THE MODAL. The one surface that spells the facts out, and the one whose loader had
      // no route to the two joined flags at all — so a mark drawn everywhere else proves
      // nothing about it.
      const modalNav = await goTo(page, "/collection?view=rows");
      if (!modalNav.ok) {
        report(`${label}px · modal · reached /collection`, false, `redirected to ${modalNav.landed}`);
      } else {
      await searchFor(page, CARD);
      const trigger = onPage(page, `button:has-text("${CARD}")`).first();
      if (await trigger.count()) {
        await trigger.click();
        await page.locator('[role="dialog"]').first().waitFor({ timeout: 10_000 });
        const block = await page.evaluate(([card, headingText]) => {
          const dialog = document.querySelector('[role="dialog"]');
          if (!dialog) return null;
          const heading = [...dialog.querySelectorAll("h3")].find(
            (h) => h.textContent?.trim() === headingText,
          );
          if (!heading) return { found: false, card };
          const items = [...(heading.parentElement?.querySelectorAll("li") ?? [])].map((li) =>
            li.textContent?.trim(),
          );
          return { found: true, items };
        }, [CARD, MODAL_HEADING]);
        report(`${label}px · modal · spells the facts out`, Boolean(block?.found),
          block?.found ? block.items.join(" / ") : `no \`${MODAL_HEADING}\` block`);
      } else {
        report(`${label}px · modal · reached a marked card`, false, `no trigger for "${CARD}"`);
      }
      }

      await context.close();
    }
  } finally {
    // No `process.exit` here: it swallows a throw, and three probes in this repo have
    // printed "all checks passed" over a case that never ran because of it.
    await browser.close();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run();
