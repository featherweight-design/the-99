// Gate 2 for #183/#177: does anything the user needs sit under the phone's
// bottom stack? Signs in as the audit user, walks the two routes at a phone
// viewport, and reports each element's gap to the nearest occluder.
//
// The measurement, not the eyeball: an element is occluded when its bottom
// edge falls inside the union of the shell tab bar and the route's dock. A
// screenshot cannot tell you a caption is 4px clear rather than 4px under.
//
// Run by hand: `node scripts/probe-bottom.mjs`. Not part of `pnpm test` (needs
// a browser and a signed-in session).
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

// CLERK_SECRET_KEY is asserted but not bound: `clerkSetup()` reads it from the
// environment itself.
const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3002";

// The handoff draws one phone frame, but the empty builder centres itself in
// the remaining column, so its clearance is a function of viewport *height*.
// A short phone is the case that can collide when a tall one does not.
const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "iPhone SE · 375x667", width: 375, height: 667 },
  { label: "desktop · 1280x900", width: 1280, height: 900 },
];

// There are no in-app auth routes — `proxy.ts` sends protected routes to Clerk's
// hosted Account Portal, and that portal cannot be driven unattended: it gates
// every new browser behind an emailed device-trust code. Sign-in tickets do not
// help either, because this app mounts no Clerk component to redeem one, so the
// ticket round-trips into a portal↔localhost redirect loop. Backend-minted
// session cookies are rejected by the middleware handshake.
//
// What works is signing in through `window.Clerk` on the app's own origin, and
// answering the device-trust code with a `+clerk_test` address.
async function signIn(page) {
  // Exempts this browser from the bot and new-device checks, which otherwise
  // stop sign-in at an emailed code no fixture can answer.
  await setupClerkTestingToken({ page });

  // Sign in through `window.Clerk` on the app's own origin rather than through
  // the hosted portal. The portal hands the session back across origins, and
  // that handoff loops forever against a dev instance on localhost.
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });

  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = await signIn.create({ identifier: email, password });

        // The instance trusts devices, so a fresh browser owes an emailed code
        // on top of the password. A `+clerk_test` address always accepts
        // 424242 and sends no mail, which is what makes this runnable headless.
        if (attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find(
            (f) => f.strategy === "email_code",
          );
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor?.emailAddressId,
          });
          attempt = await signIn.attemptFirstFactor({
            strategy: "email_code",
            code: "424242",
          });
        }

        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

// The union of everything pinned to the bottom edge, measured rather than
// assumed: the tab bar is 80px by the shell's own hard-coded value, but the
// dock's height depends on the field inside it and changes between widths.
async function bottomStack(page) {
  return page.evaluate(() => {
    const pinned = [...document.querySelectorAll("body *")].filter((el) => {
      const s = getComputedStyle(el);
      if (s.position !== "fixed" && s.position !== "sticky") return false;
      if (s.visibility === "hidden" || s.display === "none") return false;
      const r = el.getBoundingClientRect();
      // Drawn, sitting in the bottom stack, and short enough to be a bar rather
      // than a column. Without the height ceiling the desktop sidebar — sticky
      // and full-height — reads as an occluder starting at y=0, and then every
      // element on the page scores as a hit.
      //
      // The tolerance is 84px, not 4px: a route dock sits at `bottom: 80px`,
      // on top of the tab bar rather than on the viewport edge, and at 4px the
      // probe saw only the tab bar and passed rows the dock was covering.
      return r.height > 0 && r.height < innerHeight * 0.5 && r.bottom > innerHeight - 84;
    });
    // Tagged so each target can re-derive a ceiling that excludes the bars it
    // lives inside. The Create button is *in* the dock; measured against it,
    // the route's own primary action reads as occluded by itself.
    for (const el of document.querySelectorAll("[data-probe-occluder]")) {
      delete el.dataset.probeOccluder;
    }
    for (const el of pinned) el.dataset.probeOccluder = "1";
    return pinned.map((el) => ({
      tag: el.tagName.toLowerCase(),
      cls: el.className?.toString().slice(0, 60) ?? "",
      top: Math.round(el.getBoundingClientRect().top),
      bottom: Math.round(el.getBoundingClientRect().bottom),
    }));
  });
}

// The builder's content lives in its own `md:overflow-y-auto` column, so the
// window is not what scrolls at desktop width. Reading only `window.scrollY`
// reported a caption as unreachable when it was 185px of container scroll away.
async function scrollAllToBottom(page) {
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    for (const el of document.querySelectorAll("*")) {
      if (el.scrollHeight > el.clientHeight + 1) el.scrollTop = el.scrollHeight;
    }
  });
}

async function probe(page, label, targets) {
  await scrollAllToBottom(page);
  await page.waitForTimeout(400);

  const stack = await bottomStack(page);
  const ceiling = stack.length
    ? Math.min(...stack.map((s) => s.top))
    : page.viewportSize().height;

  console.log(`\n=== ${label}`);
  console.log(`  bottom stack starts at y=${ceiling} of ${page.viewportSize().height}`);
  for (const s of stack) console.log(`    pinned ${s.tag}.${s.cls} → ${s.top}–${s.bottom}`);

  for (const [name, locator] of Object.entries(targets)) {
    const el = locator.first();
    if ((await el.count()) === 0) {
      console.log(`  ?  ${name}: not on this screen`);
      continue;
    }
    await scrollAllToBottom(page);
    await page.waitForTimeout(200);
    const box = await el.boundingBox();
    if (!box) {
      console.log(`  ?  ${name}: no box`);
      continue;
    }
    const ownCeiling = await el.evaluate((node) => {
      const tops = [...document.querySelectorAll("[data-probe-occluder]")]
        .filter((bar) => !bar.contains(node))
        .map((bar) => bar.getBoundingClientRect().top);
      return tops.length ? Math.min(...tops) : innerHeight;
    });
    const gap = Math.round(ownCeiling - (box.y + box.height));
    const verdict = gap >= 0 ? "OK " : "HIT";
    const against =
      Math.round(ownCeiling) === ceiling ? "" : ` (measured to y=${Math.round(ownCeiling)} — it sits inside the lower bar)`;
    console.log(
      `  ${verdict} ${name}: bottom=${Math.round(box.y + box.height)}, gap=${gap}px${against}`,
    );
  }
}

// Resolves the instance from the publishable/secret keys already in the env.
await clerkSetup();

const browser = await chromium.launch();

for (const { label, width, height } of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await signIn(page);
  console.log(`\n########## ${label}`);

  // #183 — the empty builder. Matched on the deck id rather than clicked:
  // `/decks/new` and `/decks/import` share the prefix, come first in the
  // document, and are behind a menu at this width.
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  const deckHref = await page.evaluate(() =>
    [...document.querySelectorAll("a")]
      .map((a) => a.getAttribute("href"))
      .find((href) => /^\/decks\/[0-9a-f-]{36}$/.test(href ?? "")),
  );
  if (deckHref) {
    await page.goto(`${BASE}${deckHref}`, { waitUntil: "networkidle" });
    await probe(page, `builder ${deckHref}`, {
      "empty caption": page.getByText(/Ninety-nine slots, zero filled/),
      "role hint": page.getByText(/Try filling your ramp/),
      "last decklist row": page.locator('[data-testid="decklist-row"]').last(),
    });
  } else {
    console.log("\n=== builder: no deck on this account, cannot probe #183");
  }

  // #177 — the Create button on /decks/new.
  await page.goto(`${BASE}/decks/new`, { waitUntil: "networkidle" });
  await probe(page, "/decks/new", {
    "Create button": page.getByRole("button", { name: /create deck/i }),
    // The picker's rows are `aria-pressed` buttons, not radios.
    "last commander row": page.locator("ul li button[aria-pressed]").last(),
  });

  await context.close();
}

await browser.close();
