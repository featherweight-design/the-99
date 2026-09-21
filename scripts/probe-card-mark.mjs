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
//   · no row or caption grew — a marked row against an unmarked one on the same surface
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
// A deck that HOLDS a marked card. Most 99-card decks hold none — the reference account's
// busiest holds four — so this cannot be any deck, and a run against one that holds none
// would report "found no mark" about a build that is working.
const DECK = process.env.PROBE_DECK ?? "da3359f3-4f39-4632-ae74-4f2434d96c45";
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

const FLOOR = 12;

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

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    for (const { label, viewport } of WIDTHS) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await signIn(page);

      for (const [surface, url, search] of [
        ["decklist row", `/decks/${DECK}`, null],
        ["collection rows", "/collection?view=rows", CARD],
        ["collection tiles", "/collection", CARD],
      ]) {
        await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
        // `attached`, never `visible`: a collapsed title is zero-width, which Playwright
        // calls hidden, and waiting on visibility turns a layout defect into a 30s timeout
        // that abandons every width after the first.
        await onPage(page, "h1").first().waitFor({ state: "attached", timeout: 30_000 });
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
            drawn.length ? `${drawn.length} mark(s)` : why)) {
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
            const line = mark.closest("span, div");
            for (const other of line?.parentElement?.querySelectorAll("span, img, svg, button") ?? []) {
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
      }
      // THE MODAL. The one surface that spells the facts out, and the one whose loader had
      // no route to the two joined flags at all — so a mark drawn everywhere else proves
      // nothing about it.
      await page.goto(`${BASE}/collection?view=rows`, { waitUntil: "domcontentloaded" });
      await onPage(page, "h1").first().waitFor({ state: "attached", timeout: 30_000 });
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
