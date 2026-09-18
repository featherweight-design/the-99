// The commander row, measured in a real browser at 1300x900 and 390x844.
//
// Two figures here cannot be derived, and deriving them is what went wrong last
// time. `labelAtPx` tells the art wash where its ramp has to top out, and the
// two retired rows carried 56 and 63 because someone added up padding, glyph
// and gap heights — which put the top of a rank on a rising ramp. The handoff
// replaces both with "one value for one band" and gives no number.
//
// And the SENTENCE CLAMP. The longest stored sentence is 190 characters against
// a budget derived from a 190-character estimate, which is zero margin on a
// proxy: characters do not wrap, glyphs do. `innerText` reads back WHOLE on a
// clamped element, so every text assertion in the unit suite passes over a
// sentence the reader sees cut. Only `scrollHeight` against `clientHeight` can
// tell.
//
// Makes no writes. Signs in through Clerk's dev instance — see the local-auth
// note in memory. Point it at local-dev.
//
//   PROBE_BASE=http://localhost:3007 node scripts/probe-commander-row.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

// Verbatim from `probe-mana-symbols.mjs`: localhost runs Clerk's DEV instance,
// where only `window.Clerk` plus a `+clerk_test` code signs in.
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

const WIDTHS = [
  { name: "desktop", width: 1300, height: 900 },
  { name: "phone", width: 390, height: 844 },
];

/**
 * The shortest sentence this run will accept as having exercised the clamp.
 *
 * The longest stored sentence is 190 characters and the mean is 148, so a screen
 * whose worst is under this is a screen of ordinary sentences — it says the
 * clamp was not tripped by anything, which is not the same as saying it holds.
 */
const LONG_ENOUGH = 175;

/**
 * A commander whose stored sentence is the catalogue's longest (190 characters
 * on local-dev, tied with `Big Bertha`). Searched for BY NAME, because the list
 * is windowed: the first screen is whatever ranked highest, and a run that
 * measured only that proved nothing about the clamp it exists for. Override with
 * PROBE_LONG_COMMANDER.
 */
const LONG_COMMANDER = process.env.PROBE_LONG_COMMANDER ?? "Deadpool, Trading Card";

let failures = 0;
const check = (label, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};
const note = (line) => console.log(line);

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const w of WIDTHS) {
    const context = await browser.newContext({ viewport: { width: w.width, height: w.height } });
    const page = await context.newPage();
    await signIn(page);
    // The longest sentence MEASURED at this width, across both lanes. Asserted
    // once per width rather than per route, because the lanes are disjoint and
    // the clamp is one behaviour — exercising it on either is what matters.
    let longestSeen = 0;

    for (const route of ["/commanders", "/discover"]) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      // Search the long-sentence commander onto the screen. Typed into the rack's
      // own control rather than pushed as a URL parameter, so the run exercises
      // the path a reader takes.
      // Search the long-sentence commander onto the screen, and CLEAR the box
      // again when this lane does not hold it. The two lanes are disjoint by
      // construction — `/commanders` lists what the reader owns and `/discover`
      // what they do not — so no one commander appears on both, and a filled box
      // that matched nothing left the run with no rows at all.
      const search = onPage(page, "input[type='search'], input[placeholder]").first();
      const searchable = (await search.count()) > 0;
      if (searchable) {
        await search.fill(LONG_COMMANDER.split(",")[0]);
        await page.waitForTimeout(700);
        if ((await onPage(page, "a[href^='/commanders/']").count()) === 0) {
          await search.fill("");
          await page.waitForTimeout(700);
        }
      }
      const rows = onPage(page, "a[href^='/commanders/']");
      const count = await rows.count();
      if (count === 0) throw new Error(`${route} at ${w.name}: no rows — fixture or route broken`);
      note(`\n${route} @ ${w.name}: ${count} row link(s)`);

      // ── the wash's ramp clears its own ink ────────────────────────────
      //
      // NOT the constant, read back. What matters is whether the ramp tops out
      // ABOVE the tallest marked ink: a value too small leaves the rank sitting
      // on a rising gradient, which is the defect the two old figures existed
      // to avoid and the reason this is measured rather than derived.
      const ramp = await page.evaluate(() => {
        const band = document.querySelector("main [data-wash-label]")?.closest("div[style*='height']");
        if (!band) return null;
        const bandRect = band.getBoundingClientRect();
        const inks = [...band.querySelectorAll("[data-wash-label]")];
        // Pixels from the FOOT of the band to the top of the tallest ink, which
        // is the same origin `labelAtPx` is stated in.
        const tallest = Math.max(
          ...inks.map((el) => bandRect.bottom - el.getBoundingClientRect().top),
        );
        // Where the scrim reaches FULL opacity, recovered from the painted
        // gradient rather than from the constant that produced it. `bottomScrimStops`
        // puts that stop at `(band - labelAtPx) / band`, so this is the ramp's
        // finish line in pixels from the top of the band.
        // The VERTICAL scrim, identified by the ABSENCE of an angle. Both
        // `.art-wash-scrim` nodes carry a gradient; the horizontal one is
        // `90deg` and keeps it in computed style, while 180deg is CSS's default
        // direction and is dropped — so matching on "180deg" found nothing
        // across all 50 nodes. A `*` sweep of the band's descendants found
        // nothing either, because the wash mounts its own wrapper.
        const scrim = [...(band.querySelectorAll(".art-wash-scrim") ?? [])]
          .map((el) => getComputedStyle(el).backgroundImage)
          .find((bg) => bg.includes("linear-gradient") && !bg.includes("deg"));
        const stops = scrim ? [...scrim.matchAll(/([\d.]+)%/g)].map((m) => Number(m[1])) : [];
        const scrimCount = document.querySelectorAll(".art-wash-scrim").length;
        const rampEndsPct = stops.length >= 3 ? stops[stops.length - 2] : null;
        return {
          bandHeight: Math.round(bandRect.height),
          inkFromFoot: Math.round(tallest),
          rampEndsPx: rampEndsPct === null ? null : Math.round((rampEndsPct / 100) * bandRect.height),
          scrimCount,
          scrimSample: scrim ? scrim.slice(0, 80) : null,
        };
      });
      if (!ramp) throw new Error(`${route} at ${w.name}: no marked ink found in the band`);
      note(`  band ${ramp.bandHeight}px · tallest marked ink ${ramp.inkFromFoot}px from the foot`);
      check(
        `${route} @ ${w.name}: the band is the documented height`,
        ramp.bandHeight,
        208,
      );
      // THE RAMP HAS TO FINISH BEFORE THE INK STARTS, which is the property
      // `labelAtPx` exists to buy: ink sitting on a rising gradient is the defect
      // the two retired figures were chosen to avoid.
      //
      // Read off the PAINTED gradient, never the constant. A first version of
      // this probe printed the ink height and asserted nothing, so the ramp
      // could top out below the rank with every check green; a second imported
      // the constant, which only ever agrees with itself.
      if (ramp.rampEndsPx === null) {
        throw new Error(
          `${route} at ${w.name}: no vertical scrim gradient found — ` +
            `${ramp.scrimCount} .art-wash-scrim node(s), sample ${ramp.scrimSample}`,
        );
      }
      const inkTop = ramp.bandHeight - ramp.inkFromFoot;
      note(`  ramp reaches full opacity at ${ramp.rampEndsPx}px; ink starts at ${inkTop}px`);
      check(
        `${route} @ ${w.name}: the ramp finishes above the ink`,
        ramp.rampEndsPx <= inkTop,
        true,
      );

      // ── the sentence is not silently cut ──────────────────────────────
      const clamp = await page.evaluate(() => {
        const paras = [...document.querySelectorAll("main p")];
        const clamped = paras.filter((p) => getComputedStyle(p).webkitLineClamp !== "none");
        let worst = null;
        for (const p of clamped) {
          const over = p.scrollHeight - p.clientHeight;
          if (!worst || over > worst.over) {
            worst = {
              over,
              chars: (p.textContent ?? "").length,
              lines: Math.round(p.clientHeight / parseFloat(getComputedStyle(p).lineHeight)),
            };
          }
        }
        return { clampedCount: clamped.length, worst };
      });
      note(
        `  ${clamp.clampedCount} clamped sentence(s)` +
          (clamp.worst
            ? ` · worst overflow ${clamp.worst.over}px at ${clamp.worst.chars} chars ` +
              `(${clamp.worst.lines} lines drawn)`
            : ""),
      );
      // A clamped element whose content overflows is a sentence the reader sees
      // cut. The handoff's ruling if this fails: widen the measure, never add a
      // third line.
      if (clamp.worst) {
        check(`${route} @ ${w.name}: no sentence is cut`, clamp.worst.over <= 0, true);
        // AND THE RUN HAS TO HAVE MEASURED A LONG ONE. The list is windowed, so
        // the first screen is whatever ranked highest — not the catalogue's
        // longest sentence. The first version passed on a 145-character worst
        // case while the longest stored sentence is 190, which is to say it
        // proved nothing about the clamp it exists for.
        longestSeen = Math.max(longestSeen, clamp.worst.chars);
      }

      // ── THE GAP LINE'S OCCUPANTS TAKE THE SAME NUMBER OF LINES ────────
      //
      // D9: row height varies with the SENTENCE and with nothing else — not
      // with the sort, not with the lane, and not with which occupant the gap
      // slot drew. That last clause had nothing measuring it, and 2026-09-18's
      // copy change is exactly what could break it: the retired `allPlayed`
      // sentence was 56 characters, the `unplayed` form with three themes is
      // 61, and the replacement that names the commander's top three themes is
      // 81. At 390px a 12.5px sans line holds roughly 58 characters, so this is
      // decided by wrapping rather than by anything a class list shows.
      //
      // The gap `<p>` carries NO clamp, so the clamp check above skips it
      // entirely — `webkitLineClamp` is "none" here — and an overflowing gap
      // line does not overflow, it reflows and moves the row.
      //
      // Read as a MAXIMUM over every gap line on screen rather than per row: the
      // property is that no occupant takes more lines than another, and the
      // widest form of whichever occupants this screen holds is what bounds it.
      const gapLines = await page.evaluate(() => {
        const paras = [...document.querySelectorAll("main p")];
        // The gap line is the unclamped paragraph — the prose sentence is the
        // clamped one, and the untagged note is a `<p>` too and belongs here.
        const gaps = paras.filter((p) => getComputedStyle(p).webkitLineClamp === "none");
        let worst = null;
        for (const p of gaps) {
          const lh = parseFloat(getComputedStyle(p).lineHeight);
          const lines = Math.round(p.clientHeight / lh);
          const text = (p.textContent ?? "").trim();
          if (!worst || lines > worst.lines || (lines === worst.lines && text.length > worst.chars))
            worst = { lines, chars: text.length, text: text.slice(0, 64) };
        }
        return { gapCount: gaps.length, worst };
      });
      note(
        `  ${gapLines.gapCount} gap line(s)` +
          (gapLines.worst
            ? ` · worst ${gapLines.worst.lines} line(s) at ${gapLines.worst.chars} chars — ` +
              `"${gapLines.worst.text}"`
            : ""),
      );
      // A run that found no gap line measured nothing: the slot is NEVER empty
      // (D2), so zero means the selector lost its subject rather than that the
      // rows are clean.
      check(`${route} @ ${w.name}: gap lines were found`, gapLines.gapCount > 0, true);
      if (gapLines.worst) {
        // The budget is the drawing's: one line above `sm`, two at 390px. Three
        // is the failure — it moves row height with the occupant, and the
        // remedy is shorter copy rather than a taller row.
        //
        // ONLY THE PHONE CELLS REACH THIS, and the run says so rather than
        // leaving it as an implied strength: a lead grown to 137 characters
        // fails `/commanders @ phone` and passes all three other cells, because
        // a 1300px measure holds almost anything the copy can say. Measured by
        // mutation, not assumed.
        const budget = w.width < 768 ? 2 : 1;
        check(
          `${route} @ ${w.name}: no gap line exceeds ${budget} line(s)`,
          gapLines.worst.lines <= budget,
          true,
        );
      }

      // ── no separator ends a line ──────────────────────────────────────
      //
      // FOUND BY THE CONTACT SHEET, not by any assertion here: the foot line
      // wrapped as "1,179 decks tracked ·" with the price on the next line. The
      // separator and the figure it precedes were two siblings in a wrapping
      // row, so they split at the break — which is the dangling separator review
      // reported in round 1, reachable by WRAPPING rather than by a null field.
      //
      // Read by GEOMETRY rather than by class list: what matters is that no
      // separator is the last thing on its own line, and a class assertion
      // cannot see where a line broke.
      //
      // ONLY ONE OF THE FOUR CELLS REACHES IT, and that is worth saying rather
      // than overstating the check: splitting the separator back into a sibling
      // fails `/discover` at 390 alone, because that is the only route and width
      // where the foot line is long enough to wrap. The other three pass on a
      // broken build. A fixture whose prices were all short would reach none.
      const dangling = await page.evaluate(() => {
        const seps = [...document.querySelectorAll("main span[aria-hidden='true']")].filter(
          (el) => el.textContent?.trim() === "·",
        );
        let bad = 0;
        for (const sep of seps) {
          const r = sep.getBoundingClientRect();
          if (r.width === 0) continue;
          // The figure that follows it sits in the SAME flex item, so a break
          // between them would put the next sibling's box on a lower line.
          const next = sep.nextElementSibling?.getBoundingClientRect();
          if (next && next.width > 0 && next.top >= r.bottom) bad += 1;
        }
        return { seps: seps.length, bad };
      });
      note(`  ${dangling.seps} separator(s) drawn`);
      // WHETHER A SEPARATOR CAN EXIST HERE IS ROUTE-DEPENDENT, and that is a
      // fact about the composition rather than about the fixture. Fit is the
      // plated chip in the band now, so the foot line is the deck count and the
      // price — and every `/commanders` row is a commander the reader OWNS, so
      // its price is `absent` and one figure is left with nothing to separate.
      //
      // `/discover` lists what they do not own, so it is the lane with two
      // figures, and a run that finds none there measured nothing.
      if (route === "/discover") {
        check(`${route} @ ${w.name}: separators were drawn`, dangling.seps > 0, true);
      } else {
        check(`${route} @ ${w.name}: one figure, so no separator`, dangling.seps, 0);
      }
      check(`${route} @ ${w.name}: no separator ends a line`, dangling.bad, 0);

      // ── the row has no control on it ──────────────────────────────────
      // The disclosure went with the tag list, which is what let the row stop
      // being a client component. A button here means it came back.
      const buttons = await onPage(page, "a[href^='/commanders/']")
        .first()
        .locator("xpath=ancestor::li[1]")
        .locator("button")
        .count()
        .catch(() => 0);
      check(`${route} @ ${w.name}: no control on the row`, buttons, 0);
    }
    // THE RUN HAS TO HAVE MEASURED A LONG ONE SOMEWHERE. Without this the clamp
    // checks above pass on a screen of ordinary sentences, which says the clamp
    // was never tripped rather than that it holds. The first version asserted
    // this per route and failed on the lane that cannot hold the commander.
    check(
      `@ ${w.name}: a near-longest sentence was measured (${longestSeen} chars)`,
      longestSeen >= LONG_ENOUGH,
      true,
    );
    await context.close();
  }
} catch (err) {
  // A `process.exit` in the `finally` below runs BEFORE the exception reaches
  // anything, so a throw was reported as "all checks passed" over a run that
  // made one check. Third time this trap has been written in this codebase —
  // AGENTS.md records it against `probe:score-lock`, and `probe:payload` hit it
  // too. Anything thrown is a failed run, loudly.
  failures += 1;
  console.error("\nthrew:", err);
} finally {
  await browser.close();
  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}
