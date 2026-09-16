// Commander availability — the rulings only a layout engine can answer.
//
// Run by hand, and not part of `pnpm test`:
//   node scripts/probe-commander-availability.mjs
//   PROBE_BASE=http://localhost:3600 PROBE_SLUG=<slug> node scripts/probe-commander-availability.mjs
//
// Read-only: it visits one commander page and writes nothing. Point it at
// `local-dev`.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
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

function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  return ok;
}

/**
 * Commander availability — the rulings only a layout engine can answer.
 *
 * Four of this feature's decisions are invisible to jsdom, and two of them are
 * the ones review kept asking about:
 *
 *   1. THE CHIP WRAP (readiness D1). The chip declares a fixed 28px with no
 *      floor and its name shipped as a bare span, so the marker's measured
 *      69-89px made a long name wrap and break the pill. A unit test can assert
 *      the `whitespace-nowrap` class and nothing about whether the line held.
 *   2. THE MARKER'S RESOLVED TYPE. Left to inherit, it paints in the page's sans
 *      base — half again the size of the figure beside it — while every class
 *      assertion passes.
 *   3. THE KEY'S PIP BASELINE. `LegendPip` carried inline offsets that `KeyPip`
 *      reproduces; whether the two atoms sit on the same baseline is a question
 *      about laid-out boxes, and Design flagged it unverified.
 *   4. THE SYNERGY SLOT holding its width, so the toggle column does not walk
 *      up and down the list as a reader scans it.
 *
 * Read-only: it visits a commander page and writes nothing.
 *
 *   node scripts/probe-commander-availability.mjs
 *   PROBE_BASE=http://localhost:3600 PROBE_SLUG=<slug> node scripts/probe-commander-availability.mjs
 */

const WIDTHS = [
  { name: "desktop", viewport: { width: 1300, height: 900 } },
  { name: "phone", viewport: { width: 390, height: 844 } },
];

/** The chip's own declared height. A wrapped name is what breaks it. */
const CHIP_HEIGHT = 28;

/** The synergy slot's width, by value — the column is sized to its widest
    occupant rather than to its content, so it is a constant and not a floor. */
const SLOT_PX = 88;

/** §4.4's ruling, by value at each geometry. */
const MARKER_PX = { chip: 10.5, row: 11.5 };

/**
 * Press through the About interstitial if it is standing in the way.
 *
 * `ABOUT_VERSION` gates every route: bump it and the next request from an
 * account that has not acknowledged the new version is redirected to
 * `/about?next=<where you were going>`. That is the feature working — a bump is
 * meant to put the page in front of every reader once more — but it means ANY
 * browser probe run in the same round as a bump lands on About instead of the
 * surface it meant to measure, and reports whatever it finds there.
 *
 * This one hit exactly that: the round that added the commander-availability
 * entry is the round this probe was written in.
 */
async function clearAboutGate(page) {
  if (!page.url().includes("/about")) return false;
  const got = onPageRole(page, "button", /got it/i).first();
  await got.waitFor({ state: "visible", timeout: 15_000 });
  await Promise.all([page.waitForLoadState("domcontentloaded"), got.click()]);
  return true;
}

async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  if (await clearAboutGate(page)) {
    // The form returns the reader to `next`, which is where we were going — but
    // land on it explicitly rather than trusting the redirect to be exact.
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  }
}

/** The chip, by the geometry it declares rather than by a composed class list. */
const CHIP = 'button[class*="h-[28px]"]';

/** The synergy slot, by the width it declares. */
const SLOT = 'li span[style*="width: 88px"]';

/**
 * A commander whose Role Coverage actually draws chips.
 *
 * The first row on `/commanders` is not good enough: Role Coverage is built from
 * the OWNED pool, so a commander the player owns nothing for renders the panel's
 * empty state and every chip reading below measures nothing. The first fixture
 * this probe picked was exactly that, and reported three failures that were
 * about the fixture rather than the build.
 */
async function findCommanderSlug(page) {
  if (process.env.PROBE_SLUG) return process.env.PROBE_SLUG;
  await goto(page, "/commanders");
  // `evaluateAll` does not wait, and this list paints client-side — so wait for
  // one row before collecting them all, or the sweep reads an empty document and
  // reports "no commanders" on a page that has them.
  await onPage(page, 'a[href^="/commanders/"]').first().waitFor({ state: "attached", timeout: 30_000 });
  const hrefs = await onPage(page, 'a[href^="/commanders/"]').evaluateAll((els) =>
    els.map((e) => e.getAttribute("href")).filter(Boolean),
  );
  const slugs = [...new Set(hrefs.map((h) => h.split("/commanders/")[1].split("?")[0]))].filter(Boolean);
  if (slugs.length === 0) throw new Error("No commander row on /commanders — cannot pick a fixture.");
  for (const slug of slugs.slice(0, 8)) {
    await goto(page, `/commanders/${slug}`);
    // The loop reuses ONE page, and a locator resolves against whatever document
    // is current — so without this the chips of the PREVIOUS commander satisfy
    // the wait and the loop returns a slug whose own page has none. That is
    // exactly what it did: it picked a commander with zero chips and then
    // reported three failures about the build.
    await page.waitForURL((u) => u.pathname === `/commanders/${slug}`, { timeout: 30_000 });
    await onPage(page, "h1").first().waitFor({ state: "attached", timeout: 30_000 });
    // WAIT for a chip rather than counting immediately: the panels paint after
    // the heading, so an instant count returns 0 on a page that has 48 of them
    // and the loop walks past a perfectly good fixture.
    // BOTH panels, not just the chips. A commander EDHREC does not index draws
    // Role Coverage and an empty synergy list, and this probe measures the slot
    // as well — so a chips-only fixture reports "the synergy panel did not
    // render" and blames the build for what the fixture chose.
    try {
      await onPage(page, CHIP).first().waitFor({ state: "attached", timeout: 8_000 });
      await onPage(page, SLOT).first().waitFor({ state: "attached", timeout: 8_000 });
      return slug;
    } catch {
      continue;
    }
  }
  throw new Error(
    `None of the first ${Math.min(8, slugs.length)} commanders draws a Role Coverage chip — ` +
      `this account owns nothing in their roles. Pass PROBE_SLUG for one it does.`,
  );
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  let failures = 0;
  const fail = () => { failures += 1; };

  try {
    const slug = await (async () => {
      const c = await browser.newContext({ viewport: WIDTHS[0].viewport });
      const p = await c.newPage();
      await signIn(p);
      const s = await findCommanderSlug(p);
      await c.close();
      return s;
    })();
    console.log(`fixture: /commanders/${slug}\n`);

    for (const { name, viewport } of WIDTHS) {
      console.log(`── ${name} ${viewport.width}x${viewport.height} ──`);
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await signIn(page);
      await goto(page, `/commanders/${slug}`);
      await page.waitForURL((u) => u.pathname === `/commanders/${slug}`, { timeout: 30_000 });
      await onPage(page, "h1").first().waitFor({ state: "attached", timeout: 30_000 });
      // The panels paint after the heading. Counting straight after the h1 reads
      // an empty document and reports "no chip on the page" over a page with
      // fifty — the same mistake the fixture loop made one function up.
      await onPage(page, CHIP).first().waitFor({ state: "attached", timeout: 15_000 }).catch(() => {});
      await onPage(page, "li").first().waitFor({ state: "attached", timeout: 15_000 }).catch(() => {});

      // ── 1. the chip wrap ────────────────────────────────────────────────
      //
      // Measured on the CHIP only, which is desktop-only — the phone draws
      // `CoverageRow`, which truncates and is a different component.
      if (name === "desktop") {
        const chips = onPage(page, CHIP);
        const n = await chips.count();
        if (n === 0) {
          report("chip wrap", false, "no Role Coverage chip on the page — the reading lost its subject, NOT a pass");
          fail();
        } else {
          const boxes = await chips.evaluateAll((els) =>
            els.map((el) => {
              const r = el.getBoundingClientRect();
              const nameEl = el.querySelector("span > span");
              return {
                h: Math.round(r.height * 100) / 100,
                text: nameEl?.textContent ?? "",
                lines: nameEl ? Math.round(nameEl.getBoundingClientRect().height / parseFloat(getComputedStyle(nameEl).lineHeight || "14")) : 0,
              };
            }),
          );
          // THE HEIGHT CHECK ALONE MEASURES NOTHING, and the mutation run proved
          // it: reverting `whitespace-nowrap` left every check green, because no
          // name on any fixture is long enough to wrap inside a chip at 1300px.
          // A chip that cannot fit simply takes its own line in the flex-wrap.
          //
          // So the rule is asserted where it lives — the name's computed
          // white-space — and the height is kept beside it as the invariant that
          // would catch a wrap arriving by some other route. One of the two can
          // fail without the other.
          const ws = await chips.first().evaluate((el) => {
            const nameEl = el.querySelector("span > span");
            return nameEl ? getComputedStyle(nameEl).whiteSpace : null;
          });
          const nowrap = ws === "nowrap";
          report("the chip's name is not allowed to wrap", nowrap, `white-space: ${ws}`);
          if (!nowrap) fail();

          const tallest = boxes.reduce((a, b) => (b.h > a.h ? b : a));
          const ok = tallest.h <= CHIP_HEIGHT + 0.5;
          report(
            "chip holds its 28px",
            ok,
            `${boxes.length} chips, tallest ${tallest.h}px against ${CHIP_HEIGHT}px` +
              (ok ? "" : ` — "${tallest.text}" wrapped`),
          );
          if (!ok) fail();

          // A run where no chip is near the cap proves little, so say so.
          // A NOTE, not a check. It reports on the fixture's strength rather
          // than on the build, so it must not print `FAIL` — a run that ends
          // "All checks passed." after a FAIL line is a probe whose own output
          // cannot be read. `report` is not used here for that reason.
          const widest = boxes.reduce((a, b) => (b.text.length > a.text.length ? b : a));
          console.log(
            `  note  longest chip name is "${widest.text}" (${widest.text.length} chars)` +
              (widest.text.length >= 12
                ? ""
                : " — under 12, so the height reading above is weak; pass PROBE_SLUG for a" +
                  " commander with longer staples"),
          );
        }
      }

      // ── 2. the marker's resolved type ───────────────────────────────────
      // `:visible` again, and for the same reason the key pip needed it: BOTH
      // widths' panels are in the DOM at once. Unfiltered, a phone run measures
      // the hidden desktop chips' 10.5px markers beside the phone's own 11.5px
      // rows and reports 17 of 25 "off" on a build where every visible marker is
      // correct.
      const markers = onPage(page, '[class*="tracking-[0.02em]"]:visible');
      const mCount = await markers.count();
      if (mCount === 0) {
        report(
          "marker type",
          false,
          "no availability marker drawn — this account's collection covers its decks, so the" +
            " state has to be BUILT. NOT a pass: sleeve a copy into a committed deck first.",
        );
        fail();
      } else {
        const sizes = await markers.evaluateAll((els) =>
          els.map((el) => ({
            px: Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100,
            family: getComputedStyle(el).fontFamily,
            text: el.textContent ?? "",
          })),
        );
        const want = name === "desktop" ? MARKER_PX.chip : MARKER_PX.row;
        const bad = sizes.filter((s) => Math.abs(s.px - want) > 0.6);
        report(
          "marker takes the figure's size, not the page's sans",
          bad.length === 0,
          `${sizes.length} markers, sizes ${[...new Set(sizes.map((s) => s.px))].join("/")}px` +
            ` against ${want}px` + (bad.length ? ` — ${bad.length} off` : ""),
        );
        if (bad.length) fail();

        const mono = sizes.every((s) => /mono/i.test(s.family));
        report("marker is mono, as the figure beside it is", mono, sizes[0].family);
        if (!mono) fail();
      }

      // ── 3. the key's pip baseline ───────────────────────────────────────
      //
      // The pip and the first word of the key share a line. If the atoms sit on
      // different baselines the pip rides above or below the text it labels,
      // which is what Design could not verify.
      // `:visible` is load-bearing. Both widths' panels are in the DOM at once
      // and one is hidden, so an unfiltered query finds the hidden copy first
      // and measures it at 0x0 — reporting a broken key on a healthy build. The
      // first run of this probe did exactly that.
      const keyPip = onPage(
        page,
        'p[class*="font-mono"] > span[aria-hidden="true"]:visible > span[class*="rounded-full"]',
      ).first();
      if (await keyPip.count()) {
        const geom = await keyPip.evaluate((dot) => {
          const wrap = dot.parentElement;
          const para = wrap.parentElement;
          const d = dot.getBoundingClientRect();
          const p = para.getBoundingClientRect();
          return { dotMid: d.top + d.height / 2, paraTop: p.top, lineH: parseFloat(getComputedStyle(para).lineHeight), size: Math.round(d.width * 100) / 100 };
        });
        const firstLineMid = geom.paraTop + geom.lineH / 2;
        const off = Math.abs(geom.dotMid - firstLineMid);
        // The size is checked BEFORE the offset: a 0px dot sits 0px from
        // everything, so an offset assertion alone passes on a dot that is not
        // being drawn at all.
        const sized = geom.size >= 5.5 && geom.size <= 6.5;
        report("key pip is drawn at 6px", sized, `${geom.size}px`);
        if (!sized) fail();
        report(
          "key pip sits on the key's first line",
          sized && off <= 3,
          `dot centre ${Math.round(off * 100) / 100}px from the line's centre`,
        );
        if (!sized || off > 3) fail();
      } else {
        report("key pip", false, "no dot key found — NOT a pass");
        fail();
      }

      // ── 4. the synergy slot holds one width ─────────────────────────────
      if (name === "desktop") {
        const slots = onPage(page, SLOT);
        const sCount = await slots.count();
        if (sCount === 0) {
          report("synergy slot", false, "no 88px slot drawn — the synergy panel did not render, NOT a pass");
          fail();
        } else {
          const widths = await slots.evaluateAll((els) =>
            els.map((el) => Math.round(el.getBoundingClientRect().width * 100) / 100),
          );
          // The contract is 88px, not "at least 88px". A floor would pass a
          // regression widening the column to 100 — uniform, wider, and wrong,
          // since the figure is chosen to hold `buy · sold out` and no more.
          const uniform = new Set(widths).size === 1;
          const exact = uniform && Math.abs(widths[0] - SLOT_PX) < 0.5;
          report(
            "every synergy slot is exactly the slot width",
            exact,
            `${widths.length} slots, widths ${[...new Set(widths)].join("/")}px against ${SLOT_PX}px`,
          );
          if (!exact) fail();
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run();
