// The Analysis tab, measured in a real browser at 1300x900 and 390x844.
//
// TWO RULINGS, one flag, and the flag is why this probe exists rather than a unit test.
//
// THE TAB IS SECOND, AND THE ROW STILL FITS. Round 0's ruling is a POSITION rather than a
// presence, and `builder-tab-specs.test.ts` pins the order of the array — what only a browser
// can say is what a FIFTH cell does to the row at 390px. The tablist is a plain flex row with
// no `overflow-x` anywhere on it or its ancestors, so a cell that does not fit does not scroll
// away: it overflows the viewport or wraps. The check is therefore on the LAST cell's right
// edge, not on Analysis's own — Analysis sits at x≈98 and would pass at any width, while the
// cells it pushes are Games and Versions.
//
// THE MIX STRIP HAS ONE MOUNT, at "Your deck", Analysis on or off (#1310). Round 0 had moved it
// into the Analysis panel; #1310 put it back on the spine above the tab row, because its
// "consider →" cells switch the shell's tabs and a strip inside one panel could not. So the check
// is that exactly ONE strip exists, above the tab row, before and after the Analysis tab is
// opened, and that the Analysis panel holds NONE: a second mount in the panel looks right in a
// screenshot of either surface alone.
//
// IT ASSERTS AGAINST A STATED EXPECTATION, never against what it finds. `PROBE_ANALYSIS_EXPECT`
// is `on` (default) or `off`, and the run fails when the server disagrees with it. Reading the
// flag's state off the page and then checking "the layout matches whatever I found" would pass
// on a deployment where the tab silently failed to render — it would simply assert the off
// layout and report a clean run. So the expectation comes from outside, and the two layouts are
// both real, checkable states:
//
//   ANALYSIS_TAB_ENABLED=true  pnpm dev          → PROBE_ANALYSIS_EXPECT=on   (the drawn layout)
//   pnpm dev                                      → PROBE_ANALYSIS_EXPECT=off  (today's layout)
//
// IT CLEARS THE WALKED DECK'S STORED READING before each width, and puts the row back as captured
// in a `finally`. Since #874 a deck with a stored reading draws it on open, with no invitation,
// and opening the tab calls one action — the stored peek — which answers `none` here. So the
// counts below allow exactly that peek before the press. It writes nothing else. Signs in through Clerk's dev instance — see the local-auth note in memory.
// Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3010 node scripts/probe-analysis-tab.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertModelStandIn, pageGet } from "./lib/model-stand-in.mjs";
import { holdProfile } from "./lib/profile-hold.mjs";
import { onPage, onPageRole, PAGE } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  // To clear the walked deck's stored reading, so the tab draws its invitation; see `run()`.
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

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

// Counted here rather than at each call site, for `probe-commander-availability`'s
// reason: a check that forgot to count printed ` FAIL ` and then `All checks
// passed.` over the top, with the exit code agreeing with the wrong half.
let failures = 0;
// RETURNS `ok`, and that is load-bearing rather than a convenience. The first version of this
// file copied a `report` that returned nothing and then wrote `if (!report(...)) continue` to
// bail when the tab was missing — which is always true of `undefined`, so every run skipped
// every check after the first and printed `All checks passed.` over two readings.
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
}

const EXPECT = process.env.PROBE_ANALYSIS_EXPECT ?? "on";
if (!["on", "off"].includes(EXPECT)) {
  throw new Error(`PROBE_ANALYSIS_EXPECT must be "on" or "off", got ${EXPECT}.`);
}

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

/**
 * The decks to consider, found by asking the page rather than by an id.
 *
 * PREFERRING ONE WITH A VERSION, because the row's widest state is the one worth measuring: a
 * brew draws no Versions cell, so a fixture that happens to be one exercises FOUR cells and the
 * fifth-cell overflow — the only thing a new tab can break at 390px — never happens. The first
 * version of this probe measured exactly that and reported the row fits.
 */
async function findDeck(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page
    .waitForFunction(
      (scope) => {
        const root = document.querySelector(scope);
        const links = [...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
          .map((a) => a.getAttribute("href"))
          .filter((h) => h && h.split("/").length === 3 && !["new", "import"].includes(h.split("/")[2]));
        return links.length > 0 || Boolean(root?.textContent?.includes("No decks"));
      },
      PAGE,
      { timeout: 15_000 },
    )
    .catch(() => {});
  return page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.split("/").length === 3 && !["new", "import"].includes(h.split("/")[2]));
  }, PAGE);
}

/** Opens each candidate until one draws a Versions cell — the widest row. */
async function pickWidestDeck(page, hrefs) {
  for (const href of hrefs.slice(0, 6)) {
    await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const cells = await readTabs(page);
    if (cells.some((c) => /version/i.test(c.label) || /version/i.test(c.aria))) {
      return { href, widest: true };
    }
  }
  return { href: hrefs[0] ?? null, widest: false };
}

/** Every tab cell's label and box, in document order. */
const readTabs = (page) =>
  page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...(root?.querySelectorAll('[role="tab"]') ?? [])].map((t) => {
      const r = t.getBoundingClientRect();
      return {
        label: (t.textContent ?? "").trim().slice(0, 24),
        aria: t.getAttribute("aria-label") ?? "",
        selected: t.getAttribute("aria-selected") === "true",
        x: Math.round(r.x),
        w: Math.round(r.width),
      };
    });
  }, PAGE);

/** Where the Recommended mix strip is, relative to the tab row, and how many the Analysis panel holds. */
const readStrip = (page) =>
  page.evaluate((scope) => {
    const root = document.querySelector(scope);
    const strips = [...(root?.querySelectorAll('section[aria-label="Recommended mix"]') ?? [])];
    const tablist = root?.querySelector('[role="tablist"]');
    const tabTop = tablist ? tablist.getBoundingClientRect().top : null;
    const panel = root?.querySelector("#panel-analysis");
    return {
      count: strips.length,
      inPanel: panel ? panel.querySelectorAll('section[aria-label="Recommended mix"]').length : null,
      // Which side of the tab row each strip sits on. The spine is above it; the panel below.
      sides: strips.map((s) => {
        const r = s.getBoundingClientRect();
        return { top: Math.round(r.top), height: Math.round(r.height), above: tabTop !== null && r.top < tabTop };
      }),
      tabTop: tabTop === null ? null : Math.round(tabTop),
    };
  }, PAGE);

async function run() {
  // Global setup, once, before any page gets a testing token — the bot-protection bypass
  // needs the frontend API URL and throws without it.
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: WIDTHS[0].viewport });
    const page = await context.newPage();
    await signIn(page);
    // THE SPEND GUARD, before any press: Analyze may write the overview.
    await assertModelStandIn(BASE, ["synopsis"], { get: pageGet(page) });
    const hrefs = await findDeck(page);
    if (hrefs.length === 0) {
      report("a deck to walk", false, "this account owns no decks — the fixture is missing");
      return;
    }
    const { href, widest } = await pickWidestDeck(page, hrefs);
    // A NOTE rather than a pass: the run says plainly which row it measured, so a green over
    // the four-cell case is never read as a green over the five-cell one.
    console.log(
      widest
        ? `       (walking ${href} — it draws a Versions cell, so the row is at its widest)`
        : `       (NOTE: no deck of ${hrefs.length} draws a Versions cell — the FIVE-cell row is not measured)`,
    );
    await context.close();
    const deckId = href.split("/")[2];
    const sql = neon(DATABASE_URL);
    // On disk before the first delete, so a dead run or a failed restore cannot lose it.
    const restore = await holdProfile(sql, deckId);
    try {
    for (const { label, viewport } of WIDTHS) {
      await sql`delete from deck_profiles where deck_id = ${deckId}`;
      const ctx = await browser.newContext({ viewport });
      const p = await ctx.newPage();
      await signIn(p);
      await p.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      // A SWALLOWED WAIT IS HOW THE `off` RUN MEASURES NOTHING. With `.catch(() => {})` a page
      // that never rendered — a 500, a half-failed sign-in, the wrong port — yields no tabs, and
      // "no Analysis tab, as the flag says" then reports `absent` and passes. The failure is
      // reported instead, and the width is abandoned rather than asserted over.
      const tablist = await p
        .waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      if (!report(`${label}px · the deck page rendered its tab row`, tablist,
          tablist ? "tablist is up" : "no tablist — the page did not render")) {
        await ctx.close();
        continue;
      }
      await p.waitForTimeout(800);

      const tabs = await readTabs(p);
      const analysisAt = tabs.findIndex((t) => /analysis/i.test(t.label) || /analysis/i.test(t.aria));

      // THE EXPECTATION DECIDES, not the page. See the header.
      if (EXPECT === "off") {
        report(`${label}px · no Analysis tab, as the flag says`, analysisAt === -1,
          analysisAt === -1 ? "absent" : `drawn at position ${analysisAt + 1}`);
        const strip = await readStrip(p);
        report(`${label}px · the mix strip stays in the spine`,
          strip.count === 1 && strip.sides[0]?.above === true,
          `${strip.count} strip(s), ${strip.sides[0]?.above ? "above" : "below"} the tabs`);
        await ctx.close();
        continue;
      }

      if (!report(`${label}px · the Analysis tab is drawn`, analysisAt !== -1,
          analysisAt === -1 ? "absent — is ANALYSIS_TAB_ENABLED set on this server?" : "present")) {
        await ctx.close();
        continue;
      }

      // SECOND, and measured rather than counted: a cell can be in the document and scrolled
      // off a phone's tab row, which is the failure Round 0's "fifth position" argument names.
      report(`${label}px · it is the SECOND cell`, analysisAt === 1,
        `position ${analysisAt + 1} of ${tabs.length}`);
      const first = tabs[0];
      const analysis = tabs[analysisAt];
      report(`${label}px · and it sits after the first cell`,
        analysis.w > 0 && analysis.x > first.x,
        `x=${analysis.x} w=${analysis.w}`);

      // THE CELLS THE FIFTH TAB PUSHES. Analysis is second and fits at any width by
      // construction; what a new cell can break is the far end of the row, and this row has no
      // scroller to absorb it.
      const last = tabs[tabs.length - 1];
      report(`${label}px · the whole row fits the viewport`,
        last.x + last.w <= viewport.width,
        `last cell ends at ${last.x + last.w} of ${viewport.width}`);

      // Before the press: the strip is on the spine, at Your deck (#1310), and the panel is not up yet.
      const before = await readStrip(p);
      report(`${label}px · the strip is at Your deck, above the tabs`,
        before.count === 1 && before.sides[0]?.above === true,
        `${before.count} strip(s), above the tabs: ${before.sides.filter((s) => s.above).length}`);

      // ── The profile payload, counted as SERVER-ACTION POSTS ─────────────────────────────
      //
      // The whole reason the fetch is a press rather than automatic is that a profile costs
      // 630ms median and up to 2.2s on the slowest real deck, and Round 4 forbids an auto-run
      // on tab open. So what is measured is the count of action calls.
      //
      // FILTERED ON THE `next-action` HEADER, not on the method. `page.on("request")` sees
      // cross-origin traffic, and Clerk's client posts to its own frontend API on this page for
      // a session touch and a token refresh — either landing inside a counted window would
      // break a correct build. `probe-list-payloads.mjs` already filters this way.
      //
      // THE BODY IS NOT CHECKED, and an earlier version of this comment said it was. Next
      // serialises an action to a hashed id in the `next-action` header; its NAME appears
      // nowhere in the request, so matching the body would never fire and the count would read
      // 0 forever. What identifies the action instead is its OUTCOME, asserted below: a profile
      // reply replaces the invitation with the re-ask, which no other action would do.
      // BY ACTION ID, which is what Next actually sends. A server action is serialised to a
      // hashed id in the `next-action` header — its NAME appears nowhere, so matching the body
      // on "fetchDeckProfile" would never fire and the count would read 0 forever: a silent
      // pass on "fetched nothing" and a failure on a working build.
      //
      // Collecting the distinct ids is what makes the count mean WHICH action rather than just
      // how many. Only one action is reachable here while the reader presses tabs and the
      // invitation, so exactly one distinct id is the assertion.
      const actions = [];
      p.on("request", (r) => {
        if (r.method() !== "POST") return;
        const id = r.headers()["next-action"];
        if (id) actions.push(id);
      });
      const posts = () => actions.length;
      await p.waitForTimeout(400);
      report(`${label}px · no action called before anything is pressed`, posts() === 0,
        `${posts()} action call(s) before the press`);

      await onPage(p, '[role="tab"]').nth(analysisAt).click();
      await p.waitForTimeout(600);

      // The one call opening the tab may make is the stored peek, which computes nothing.
      const peeked = posts();
      report(`${label}px · opening the tab only asks for a stored reading`, peeked <= 1,
        `${peeked} action call(s) after opening the tab`);

      // ROUND 4 RULING 7: the verdict fires on analyse or commit and nowhere else. The tab draws
      // the invitation instead, and pressing THAT is what costs 630ms.
      const invite = onPageRole(p, "button", /^Analyze$/);
      if (!report(`${label}px · the tab invites the reader to analyze`,
        (await invite.count()) > 0, "no invitation drawn")) {
        await ctx.close();
        continue;
      }
      await invite.first().click();
      // WAITED FOR, not slept past. The slowest real deck builds a profile in 1.8-2.2s, so a
      // fixed 1.2s sleep failed a correct build whose reply was merely slow. The timeout is
      // well above the measured maximum, and the thing waited for is the state a reply
      // produces rather than an elapsed time.
      await onPage(p, 'section[aria-label="Your bracket"]')
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .catch(() => {});
      const afterPress = posts();
      report(`${label}px · pressing it fetches the profile once`, afterPress - peeked === 1,
        `${afterPress - peeked} action call(s) after the press`);
      report(`${label}px · and it was ONE action, not two different ones`,
        new Set(actions.slice(peeked)).size === 1,
        `${new Set(actions.slice(peeked)).size} distinct action id(s) after the press`);

      // AND THE ACTION WAS THE PROFILE FETCH, proved by its OUTCOME rather than by its id.
      //
      // A count of one distinct opaque id says a single action ran; it cannot say WHICH, so a
      // regression wiring this control to some other action would satisfy both checks above.
      // Nothing observable carries the id, so the discriminator is the state only a profile
      // reply can produce: the empty state is replaced by the bracket box (the consolidated tab
      // draws no re-ask on a reading). An action that fetched something else would leave the
      // empty state where it was.
      const stillInviting = await onPage(p, '[data-testid="analysis-empty"]').count();
      const box = await onPage(p, 'section[aria-label="Your bracket"]').count();
      report(`${label}px · and it was the PROFILE fetch, not merely an action`,
        stillInviting === 0 && box === 1,
        `empty state ${stillInviting}, bracket box ${box} — a profile reply replaces one with the other`);

      // THE CACHE, and the reason the hook lives in the shell rather than the panel. One panel
      // renders at a time, so the Analysis panel unmounts on a tab switch — a fetch owned by
      // the panel would re-pay the whole build here, and every assertion about the rendered
      // state would still pass.
      const otherTab = analysisAt === 0 ? 1 : 0;
      await onPage(p, '[role="tab"]').nth(otherTab).click();
      await p.waitForTimeout(300);
      await onPage(p, '[role="tab"]').nth(analysisAt).click();
      await p.waitForTimeout(600);
      report(`${label}px · leaving the tab and returning does not re-fetch`,
        posts() === afterPress,
        `${posts()} call(s) total, ${posts() - afterPress} on the return`);

      // NO SYNOPSIS SLOT at all until sub-project 6 (readiness finding 6): no placeholder line and
      // no control that cannot write.
      const synopsis = await p.evaluate((scope) => {
        const panel = document.querySelector(scope)?.querySelector("#panel-analysis");
        const text = panel?.textContent ?? "";
        return {
          placeholder: /No summary has been written|Overview/.test(text),
          write: text.includes("Write one"),
        };
      }, PAGE);
      report(`${label}px · no synopsis slot and no placeholder for one`, !synopsis.placeholder,
        synopsis.placeholder ? "a placeholder is drawn" : "none drawn");
      report(`${label}px · and no control that cannot work`, !synopsis.write,
        synopsis.write ? "a Write one control is drawn" : "no write control");

      const panel = await p.evaluate((scope) =>
        Boolean(document.querySelector(scope)?.querySelector("#panel-analysis")), PAGE);
      report(`${label}px · pressing it opens the Analysis panel`, panel,
        panel ? "panel-analysis is in the document" : "no panel");

      const after = await readStrip(p);
      // EXACTLY ONE, with the Analysis tab open: the spine's (#1310). A second mount in the panel
      // looks right in a screenshot of either surface alone.
      report(`${label}px · exactly one mix strip exists`, after.count === 1,
        `${after.count} strip(s)`);
      report(`${label}px · and it is above the tab row, at Your deck`,
        after.count === 1 && after.sides[0]?.above === true,
        after.count === 1 ? `top ${after.sides[0].top} vs tabs ${after.tabTop}` : "not measurable");
      report(`${label}px · the Analysis tab draws no mix strip`,
        after.inPanel === 0,
        after.inPanel === null ? "no Analysis panel to read" : `${after.inPanel} strip(s) in the panel`);
      await ctx.close();
    }
    } finally {
      await restore();
    }
  } finally {
    await browser.close();
  }
}

await run();
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
