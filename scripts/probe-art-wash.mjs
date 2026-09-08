// Gate for the art-wash readability amendment: the four surfaces that draw a
// wash — the deck tile, Home's ready-to-build hero, the commander rec and
// discovery rows, and Home's resume row.
//
// JSDOM applies no CSS and loads no images, so the unit tests can assert which
// URL a layer was handed but never that the frame is gone, that the band keeps
// its height when a commander has no crop, or that the two accessibility media
// queries do what they claim. That is what this probe is for, and it writes a
// screenshot per viewport for the design review.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   node scripts/probe-art-wash.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

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
          // Named here rather than left to Clerk: an undefined emailAddressId
          // fails inside prepareFirstFactor with an error that says nothing
          // about the account being unable to take a code.
          if (!factor?.emailAddressId) {
            const offered = (attempt.supportedFirstFactors ?? []).map((f) => f.strategy).join(", ");
            return `${email} offers no usable email_code first factor (offered: ${offered || "none"}). The probe user must be a +clerk_test address.`;
          }
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

// Every wash on the page, with the URL each art layer resolved, the opacity the
// browser actually computed, and the height of the band the wash sits in. The
// URL is the whole readability claim: `art_crop` is frame-free, `normal` is not.
const READ_WASHES = `() => {
  const layers = [...document.querySelectorAll('.art-wash-art')];
  return layers.filter((l) => l.getClientRects().length).map((l) => {
    const s = getComputedStyle(l);
    const band = l.parentElement?.parentElement;
    const image = s.backgroundImage;
    return {
      url: /url\\(/.test(image) ? image.replace(/^.*?url\\(["']?/, '').replace(/["']?\\).*$/, '') : null,
      gradient: /gradient/.test(image) ? image.slice(0, 40) : null,
      opacity: Number(s.opacity),
      display: s.display,
      reducedVar: s.getPropertyValue('--art-wash-reduced-opacity').trim(),
      bandHeight: band ? Math.round(band.getBoundingClientRect().height) : null,
      scrims: l.parentElement ? l.parentElement.querySelectorAll('.art-wash-scrim').length : 0,
    };
  });
}`;

// The scrims outlive the art under `forced-colors`, so they are what proves the
// band kept its height when the photograph left.
const READ_SCRIM_HEIGHTS = `[...document.querySelectorAll('.art-wash-scrim')].map((s) => Math.round(s.getBoundingClientRect().height))`;

const ROUTES = [
  ["home", "/"],
  ["decks", "/decks"],
  ["commanders", "/commanders"],
  ["discover", "/commanders?lane=discover"],
];

const VIEWPORTS = [
  ["mobile", 375, 812],
  ["desktop", 1440, 900],
];

const findings = [];
const note = (line) => {
  findings.push(line);
  console.log(line);
};

await clerkSetup();

const browser = await chromium.launch();
try {
  for (const [vpName, width, height] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await signIn(page);

    for (const [routeName, path] of ROUTES) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);
      const washes = await page.evaluate(`(${READ_WASHES})()`);
      await page.screenshot({ path: `/tmp/art-wash-${vpName}-${routeName}.png`, fullPage: false });

      const framed = washes.filter((w) => w.url && !w.url.includes("art_crop"));
      const cropped = washes.filter((w) => w.url && w.url.includes("art_crop"));
      const gradients = washes.filter((w) => !w.url && w.gradient);
      note(
        `${vpName} ${routeName}: ${washes.length} art layers — ${cropped.length} art_crop, ` +
          `${framed.length} framed, ${gradients.length} identity gradient`,
      );
      if (framed.length) note(`  FAIL framed art still on ${routeName}: ${framed[0].url}`);
      const bands = [...new Set(washes.map((w) => w.bandHeight))].filter((h) => h);
      note(`  band heights: ${bands.sort((a, b) => a - b).join(", ")}`);
      for (const g of gradients) {
        if (g.opacity !== 1) note(`  FAIL identity gradient at opacity ${g.opacity}, expected 1`);
        if (g.reducedVar !== "1") note(`  FAIL gradient reduced var ${g.reducedVar}, expected 1`);
      }
    }

    // The two accessibility mechanisms, on the surface that carries every case.
    await page.goto(`${BASE}/commanders`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const base = await page.evaluate(`(${READ_WASHES})()`);
    const baseScrims = await page.evaluate(READ_SCRIM_HEIGHTS);

    // Playwright's `emulateMedia` has no `prefers-reduced-transparency` option and
    // ignores one silently, so the check has to go through CDP or it passes vacuously.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    });
    if (!(await page.evaluate(`matchMedia('(prefers-reduced-transparency: reduce)').matches`))) {
      throw new Error("reduced-transparency emulation did not take — the check would be vacuous");
    }
    await page.waitForTimeout(300);
    const reduced = await page.evaluate(`(${READ_WASHES})()`);
    await page.screenshot({ path: `/tmp/art-wash-${vpName}-reduced-transparency.png` });
    // Every comparison below pairs by index, so a change in how many layers are
    // laid out has to fail here — otherwise the pairing silently slips and the
    // per-layer checks compare unrelated elements.
    if (reduced.length !== base.length) {
      note(`  FAIL layer count changed under the preference: ${base.length} → ${reduced.length}`);
    } else {
      const raised = reduced.filter((w, i) => w.opacity > base[i].opacity + 0.001);
      note(
        `${vpName} reduced-transparency: ${reduced.filter((w, i) => w.opacity < base[i].opacity).length} layers dimmed, ${raised.length} raised`,
      );
      if (raised.length) note(`  FAIL a layer got MORE opaque under the preference`);
      const shiftedR = reduced.filter((w, i) => w.bandHeight !== base[i].bandHeight);
      if (shiftedR.length) note(`  FAIL band height changed under reduced transparency`);
      else note(`  band heights unchanged`);
    }

    await cdp.send("Emulation.setEmulatedMedia", { features: [] });
    await page.emulateMedia({ forcedColors: "active" });
    await page.waitForTimeout(300);
    const forced = await page.evaluate(`(${READ_WASHES})()`);
    await page.screenshot({ path: `/tmp/art-wash-${vpName}-forced-colors.png` });
    // The art leaves, so the scrims are what still measures the band. Compare them
    // to the same list before the rule fired rather than eyeballing the numbers.
    const forcedScrims = await page.evaluate(READ_SCRIM_HEIGHTS);
    note(
      `${vpName} forced-colors: ${forced.length} art layers still laid out (expect 0), ` +
        `${forcedScrims.length} scrims at ${[...new Set(forcedScrims)].join(", ")}px`,
    );
    if (forced.length) note(`  FAIL art layer survived forced-colors`);
    if (forcedScrims.length !== baseScrims.length) {
      note(`  FAIL scrim count changed: ${baseScrims.length} → ${forcedScrims.length}`);
    } else if (forcedScrims.some((h, i) => h !== baseScrims[i])) {
      note(`  FAIL band height changed under forced colours`);
    } else {
      note(`  band heights unchanged`);
    }

    await page.emulateMedia({ forcedColors: "none" });
    await context.close();
  }
} finally {
  await browser.close();
}

const fails = findings.filter((f) => f.includes("FAIL"));
console.log(`\n${fails.length} failures. Screenshots in /tmp/art-wash-*.png`);
if (fails.length) process.exitCode = 1;
