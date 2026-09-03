// Gate 2 for the availability polish PR: the two touch targets on /collection,
// measured rather than asserted. Signs in, measures every filter trigger at both
// widths, then applies a filter and probes the resulting chip's dismiss ✕.
//
// The ✕ is the reason this exists. Its hit area is a centred `::after` overlay,
// not padding, so `getBoundingClientRect()` reports the ~10x19px glyph and says
// nothing about what a thumb can actually hit. The only honest measurement is
// `elementFromPoint` at the edges of the 44px box the overlay claims to draw —
// a real hit test, through whatever is stacked above it.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   node scripts/probe-touch-targets.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

// CLERK_SECRET_KEY is asserted but not bound: `clerkSetup()` reads it from the
// environment itself.
const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// Demanded separately, because a `+clerk_test` fixture address takes the
// email-code path and has no password to supply.
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}

// 44px is the touch minimum. Desktop is a pointer surface and is reported for
// information only, so a smaller desktop chip is not a failure.
const MIN = 44;
const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844, touch: true },
  { label: "desktop · 1300x900", width: 1300, height: 900, touch: false },
];

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
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor?.emailAddressId,
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

async function triggers(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter((b) => b.offsetParent && /▾$/.test((b.textContent ?? "").trim()))
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
      .map((b) => ({
        text: (b.textContent ?? "").trim(),
        // floor, not round: this figure is compared against MIN, and rounding
        // 43.6 up to 44 would report a passing target that a thumb still misses.
        // Every measurement in this probe errs small for the same reason.
        height: Math.floor(b.getBoundingClientRect().height),
      })),
  );
}

/**
 * The real hit test. Asks the document what is actually on top at the corners of
 * the `min`-sized box centred on the ✕, so a sibling painted over the overlay
 * fails this the same way a missing overlay would.
 *
 * `cornersOk` is the verdict, not `hit`. The corners are the hardest points in
 * the box, and probing them directly answers the only question that matters.
 * `hit` walks the axes for a rough extent and is reported for context: it counts
 * whole pixels either side of centre, so it reads one or two px under the true
 * box and must not be compared against the threshold.
 */
async function dismissHitBox(page, min) {
  return page.evaluate((minPx) => {
    const btn = document.querySelector('button[aria-label^="Remove filter:"]');
    if (!btn) return null;
    const box = btn.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const hits = (dx, dy) => {
      const el = document.elementFromPoint(cx + dx, cy + dy);
      return el === btn || btn.contains(el);
    };
    // Largest half-extent that still lands on the button, per axis.
    const reach = (ax) => {
      let r = 0;
      for (let d = 1; d <= 40; d++) {
        const ok = ax === "x" ? hits(-d, 0) && hits(d, 0) : hits(0, -d) && hits(0, d);
        if (!ok) break;
        r = d;
      }
      return r;
    };
    // The outermost pixel *centres* of the min-sized box, not its mathematical
    // corners. A 44px box centred on cx spans [cx-22, cx+22], and elementFromPoint
    // at exactly ±22 samples the boundary, which belongs to the next pixel out.
    // ±21.5 is the hardest point still inside the box, so this tests the full
    // 44px rather than the 42px an integer inset would.
    const half = minPx / 2 - 0.5;
    return {
      glyph: { w: Math.floor(box.width), h: Math.floor(box.height) },
      hit: { w: reach("x") * 2, h: reach("y") * 2 },
      cornersOk: hits(-half, -half) && hits(half, -half) && hits(-half, half) && hits(half, half),
      aria: btn.getAttribute("aria-label"),
    };
  }, min);
}

// Resolves the instance from the publishable/secret keys already in the env.
await clerkSetup();
const browser = await chromium.launch();
let failures = 0;

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch,
    isMobile: vp.touch,
  });
  const page = await context.newPage();
  await signIn(page);
  await page.goto(`${BASE}/collection`, { waitUntil: "networkidle" });

  console.log(`\n=== ${vp.label} ===`);

  // A probe that measured nothing must not report success. Every path that
  // gives up early counts a failure for the same reason: the interesting
  // outcome is "we could not check", and an exit 0 would read as "checked, fine".
  const bail = (why) => {
    console.log(`  ! ${why}`);
    failures++;
  };

  const found = await triggers(page);
  if (found.length === 0) bail("No filter triggers found — nothing was measured.");
  for (const t of found) {
    const short = vp.touch && t.height < MIN;
    if (short) failures++;
    console.log(`  trigger ${short ? "✗" : "✓"} ${t.height}px  ${t.text}`);
  }

  // A chip only exists once something is filtered. Any panel will do; the ✕ is
  // the same component on every chip.
  const opened = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((n) =>
      (n.textContent ?? "").trim().startsWith("Availability"),
    );
    if (!b || b.disabled) return false;
    b.click();
    return true;
  });
  if (!opened) {
    bail("Availability trigger missing or disabled — no chip to probe.");
    await context.close();
    continue;
  }
  await page.waitForSelector('[role="option"]', { timeout: 10_000 });
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('[role="option"]')].find(
      (r) => r.getAttribute("aria-disabled") !== "true",
    );
    row?.click();
  });

  // The selected row's accessible name, with the panel still up. A row inside an
  // aria-multiselectable listbox already announces its selection through the
  // role, so the name saying it too is the same fact twice in one breath.
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('[role="option"]')].slice(0, 3).map((r) => ({
      aria: r.getAttribute("aria-label"),
      selected: r.getAttribute("aria-selected"),
    })),
  );
  const list = await page.evaluate(() => {
    const ul = document.querySelector('[role="listbox"]');
    return ul && { multi: ul.getAttribute("aria-multiselectable") };
  });
  console.log(`  listbox  aria-multiselectable=${list?.multi ?? "—"}`);
  for (const r of rows) {
    const doubled = r.selected === "true" && /selected/i.test(r.aria ?? "");
    if (doubled) failures++;
    console.log(`  option ${doubled ? "✗ doubled" : "✓"} [selected=${r.selected}] ${r.aria}`);
  }

  await page.keyboard.press("Escape");

  try {
    await page.waitForSelector('button[aria-label^="Remove filter:"]', { timeout: 10_000 });
  } catch {
    bail("No chip appeared after selecting a filter row — the ✕ went unprobed.");
    await context.close();
    continue;
  }

  const x = await dismissHitBox(page, MIN);
  if (!x) {
    bail("The chip ✕ went missing between the wait and the measurement — unprobed.");
    await context.close();
    continue;
  }
  const short = vp.touch && !x.cornersOk;
  if (short) failures++;
  console.log(
    `  chip ✕  ${short ? "✗" : "✓"} glyph ${x.glyph.w}x${x.glyph.h}px, ` +
      `hit ≥${x.hit.w}x${x.hit.h}px, ${MIN}px corners ${x.cornersOk ? "all hit" : "MISS"}`,
  );
  console.log(`          aria: ${x.aria}`);

  await context.close();
}

await browser.close();
// Not "N under 44px": the count also carries doubled announcements and every
// path that could not measure at all, and naming it a size failure would send
// the reader to the wrong line.
console.log(
  failures === 0
    ? "\nAll touch targets pass at 44px, and every check ran."
    : `\n${failures} problems. Read the ✗ and ! lines above.`,
);
process.exit(failures === 0 ? 0 : 1);
