// probe:card-mark — the card mark's four rulings, measured in a real browser.
//
// jsdom lays nothing out, so every ruling here is invisible to the unit suite: a size is a
// class string, a collision is two elements that never have rects, and a row that GREW is a
// height nothing computes. The unit tests can say which glyph a surface asks for; only this
// can say what the reader gets.
//
// WHAT IT MEASURES, at 1300x900 and 390x844:
//   · the mark's drawn box on each surface, and NEVER below the 12px floor
//   · no collision in the row's densest state — measured as intersecting RECTS against the
//     ownership dot, the availability marker, the buy tag, the pips and the caption
//   · no row grew — a marked row against an unmarked one on the same surface, measured in
//     two passes because the search that finds the marked card leaves nothing to compare
//     it against. LIVE on the collection row and inert on the tile, whose height its art
//     fixes; the body of that check says so rather than implying it guards both
//   · the key is on screen wherever a mark is, which is the rule that makes a wordless mark
//     legal at all, and a FAILURE rather than a note
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

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
// An EXTRA-TURN card by default, not a Game Changer: `game_changer` rides the card row and
// has always reached every surface, while the two joined flags are the pair that had no
// route to the modal at all. The default exercises the path that was broken.
const CARD = process.env.PROBE_MARKED_CARD ?? "Expropriate";
// A deck that HOLDS a marked card — DISCOVERED by asking /decks rather than hardcoded.
//
// A hardcoded id was wrong twice over: most decks hold no marked card at all (the busiest
// on this data holds four of 99), and the ids differ per fixture account, so a literal
// belonging to one account reports "no mark" on another's perfectly working build. Asking
// the page cannot drift from it.
const DECK = process.env.PROBE_DECK ?? null;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

const FLOOR = 12;
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
  const hrefs = await page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...new Set([...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && !h.includes("/new") && h.split("/").length === 3))];
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
    for (const { label, viewport } of WIDTHS) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await signIn(page);

      const found = DECK ? { href: `/decks/${DECK}` } : await findMarkedDeck(page);
      const deckHref = found?.href ?? null;
      if (!deckHref) {
        report(`${label}px · decklist row · a deck that holds a marked card`, false,
          found?.truncated
            ? `none among the first ${found.seen} of ${found.total} decks — raise DECK_SCAN_LIMIT or set PROBE_DECK`
            : `no deck on this account draws one (checked ${found?.seen ?? 0}) — the fixture is missing, not the mark`);
      }

      for (const [surface, url, search] of [
        ...(deckHref ? [["decklist row", deckHref, null]] : []),
        ["collection rows", "/collection?view=rows", CARD],
        // `?view=grid` EXPLICITLY. With no param the view resolves to
        // `isDesktop ? "grid" : "rows"` and a fresh context stores nothing, so at 390 this
        // surface rendered the ROWS view — and the tile's 12px mark, the only one drawn at
        // the floor this probe exists to guard, was never measured at the width that matters.
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

        const smallest = Math.min(...drawn.map((m) => Math.min(m.w, m.h)));
        report(`${label}px · ${surface} · never below the ${FLOOR}px floor`,
          smallest >= FLOOR, `smallest ${smallest}px`);

        // THE RULE THAT MAKES A WORDLESS MARK LEGAL. A failure, never a note.
        report(`${label}px · ${surface} · the key is on screen with the marks`,
          keyed.length >= 3, `${keyed.length} key entr(ies)`);

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
        // Rows are CARD BUTTONS. A first version looked for `li`/`tr`, found neither, and
        // reported "cannot compare" — which failed rather than passing, but proved nothing.
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
        const markedH = await page.evaluate((scope) => {
          const root = document.querySelector(scope);
          // NOT the first mark in the document: the key renders before the rows and its
          // samples are not inside a button, so `querySelector` returned one of those and
          // `closest("button")` was null. The key's own marks are excluded everywhere in
          // this probe for the same reason.
          const el = [...(root?.querySelectorAll('[data-testid^="card-fact-"]') ?? [])]
            .find((m) => !m.closest('[role="group"]'))
            ?.closest("button");
          return el ? Math.round(el.getBoundingClientRect().height) : 0;
        }, PAGE);
        await searchFor(page, "");
        const plainH = await page.evaluate((scope) => {
          const root = document.querySelector(scope);
          const hs = [...(root?.querySelectorAll("button") ?? [])]
            .filter((b) => !b.querySelector('[data-testid^="card-fact-"]'))
            .map((b) => Math.round(b.getBoundingClientRect().height))
            .filter((h) => h > 24);
          return hs.length ? Math.max(...hs) : 0;
        }, PAGE);
        report(`${label}px · ${surface} · no row grew for the mark`,
          Boolean(markedH && plainH) && markedH <= plainH,
          markedH && plainH ? `marked ${markedH}px vs unmarked ${plainH}px`
                            : `marked ${markedH}px, unmarked ${plainH}px — nothing to compare`);
      }
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
        const block = await page.evaluate((card) => {
          const dialog = document.querySelector('[role="dialog"]');
          if (!dialog) return null;
          const heading = [...dialog.querySelectorAll("h3")].find(
            (h) => h.textContent?.trim() === "In the bracket rules",
          );
          if (!heading) return { found: false, card };
          const items = [...(heading.parentElement?.querySelectorAll("li") ?? [])].map((li) =>
            li.textContent?.trim(),
          );
          return { found: true, items };
        }, CARD);
        report(`${label}px · modal · spells the facts out`, Boolean(block?.found),
          block?.found ? block.items.join(" / ") : "no `In the bracket rules` block");
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
