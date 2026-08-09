// Cold-eyes capture. Signs in as the audit user, walks a route manifest at a
// phone and a desktop viewport, and writes a full-page screenshot plus an
// overflow report per route × viewport under `audit-output/<runId>/`.
//
// The point is not the pictures. It is that a reviewer who never saw the diffs
// can look at the whole vertical at once — the thing a builder structurally
// cannot do, because it knows why every string is there.
//
// The overflow heuristic is the cheap half: an element wider than its own
// scrolling ancestor, or text clipped by a fixed height, is a defect no
// screenshot at one viewport reliably shows.
//
// Run by hand, against a dev server on PROBE_BASE:
//
//   E2E_AUDIT_USER_EMAIL="alpha-test+clerk_test@the99.app" \
//     node --env-file=.env scripts/audit-sweep.mjs
//
// The `+clerk_test` address is the only identifier the local dev instance signs
// in unattended, and it has no password: Clerk accepts the fixed 424242 code
// for it, which is why E2E_AUDIT_USER_PASSWORD is optional below. Needs a
// browser and a signed-in session, so it stays out of `pnpm test`.
import { mkdir, writeFile } from "node:fs/promises";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3002";
const EMAIL = process.env.E2E_AUDIT_USER_EMAIL;
// Optional. A `+clerk_test` address takes the code path below and has no
// password to give, which is how the local dev instance is actually set up.
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL || !process.env.CLERK_SECRET_KEY) {
  throw new Error("Set E2E_AUDIT_USER_EMAIL and CLERK_SECRET_KEY.");
}

// A surface-adding PR adds its route here in the same PR. A route missing from
// this list is a route no cold-eyes pass will ever look at.
//
// `deck` is resolved at run time from the account's first deck, because the id
// differs per database. `act` runs after load, for states that live behind a
// control rather than behind a URL.
const ROUTES = [
  { name: "home", path: "/" },
  { name: "collection", path: "/collection" },
  { name: "commanders", path: "/commanders" },
  { name: "decks", path: "/decks" },
  { name: "decks-new", path: "/decks/new" },
  { name: "decks-import", path: "/decks/import" },
  { name: "builder-deck", path: "deck" },
  {
    name: "builder-consider",
    path: "deck",
    act: async (page) => {
      const tab = page.getByRole("tab", { name: /cards to consider/i });
      if ((await tab.count()) > 0) await tab.first().click();
      await page.waitForTimeout(500);
    },
  },
  {
    name: "builder-rationale-open",
    path: "deck",
    act: async (page) => {
      const trigger = page.getByRole("button", { name: /why these numbers/i });
      if ((await trigger.count()) > 0) await trigger.first().click();
      await page.waitForTimeout(300);
    },
  },
];

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];

// Lifted from `scripts/probe-bottom.mjs`, which documents at length why the
// hosted Clerk portal cannot be driven unattended and `window.Clerk` can.
async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = password
          ? await signIn.create({ identifier: email, password })
          : await signIn.create({ identifier: email });
        // A `+clerk_test` identifier with no password lands on
        // needs_first_factor, which the same email-code branch serves.
        if (attempt.status === "needs_client_trust" || attempt.status === "needs_first_factor") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          // Named here rather than left to Clerk: an undefined emailAddressId
          // fails inside prepareFirstFactor with an error that says nothing
          // about the account being unable to take a code.
          if (!factor) {
            const offered = (attempt.supportedFirstFactors ?? []).map((f) => f.strategy).join(", ");
            return `${email} offers no email_code first factor (offered: ${offered || "none"}). The audit user must be a +clerk_test address.`;
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
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const overflows = (page) =>
  page.evaluate(() => {
    // The nearest ancestor that decides whether this element's right edge is
    // reachable at all.
    //
    // `hidden` clips: whatever sits past its edge is gone, and that is the
    // defect this heuristic exists to find. `auto` and `scroll` are how a
    // deliberate horizontal scroller is written, and content past *their* edge
    // is the entire point of one. Treating the two alike is what made the
    // collection filter toolbar report 11 hits at 390px on every run — a
    // scroller the property table asks for, reported as a leak — and a
    // heuristic that cries wolf is one nobody reads.
    const scrollParent = (node) => {
      for (let el = node.parentElement; el; el = el.parentElement) {
        const overflow = getComputedStyle(el).overflowX;
        // Only a scroller that actually scrolls reaches its overflowing child.
        // An `overflow-x-auto` whose content fits still clips anything past it.
        if (overflow === "auto" || overflow === "scroll") {
          return { el, reaches: el.scrollWidth > el.clientWidth + 1 };
        }
        if (overflow === "hidden") return { el, reaches: false };
      }
      return { el: document.documentElement, reaches: false };
    };
    const hits = [];
    for (const el of document.querySelectorAll("body *")) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;

      const parent = scrollParent(el);
      const parentBox = parent.el.getBoundingClientRect();
      // 1px of tolerance: sub-pixel layout rounds past an exact comparison and
      // reports half the page.
      if (
        !parent.reaches &&
        (box.right > parentBox.right + 1 || box.left < parentBox.left - 1)
      ) {
        hits.push({
          kind: "horizontal",
          tag: el.tagName.toLowerCase(),
          cls: el.className?.toString().slice(0, 70) ?? "",
          text: (el.textContent ?? "").trim().slice(0, 60),
        });
        continue;
      }
      // Text taller than the box drawn for it. Only leaf-ish nodes, or every
      // ancestor of a clipped string reports the same defect.
      //
      // Three exclusions, each a shape that is clipped on purpose. Without them
      // the first run reported an sr-only label, an SVG numeral and a deliberate
      // two-line clamp, and a heuristic that cries wolf is one nobody reads.
      const clampedOnPurpose =
        style.webkitLineClamp !== "none" || style.textOverflow === "ellipsis";
      const isSvg = el.namespaceURI !== "http://www.w3.org/1999/xhtml";
      const isSrOnly = box.width <= 1 || box.height <= 1;
      if (
        el.children.length === 0 &&
        !clampedOnPurpose &&
        !isSvg &&
        !isSrOnly &&
        el.scrollHeight > el.clientHeight + 2
      ) {
        hits.push({
          kind: "clipped",
          tag: el.tagName.toLowerCase(),
          cls: el.className?.toString().slice(0, 70) ?? "",
          text: (el.textContent ?? "").trim().slice(0, 60),
        });
      }
    }
    return hits;
  });

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = `audit-output/${runId}`;
await mkdir(outDir, { recursive: true });

await clerkSetup();
const browser = await chromium.launch();
const report = [];

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  await signIn(page);

  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  const deckHref = await page.evaluate(() =>
    [...document.querySelectorAll("a")]
      .map((a) => a.getAttribute("href"))
      .find((href) => /^\/decks\/[0-9a-f-]{36}$/.test(href ?? "")),
  );

  for (const route of ROUTES) {
    const path = route.path === "deck" ? deckHref : route.path;
    if (!path) {
      console.log(`skip ${route.name} · no deck on this account`);
      continue;
    }
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    if (route.act) await route.act(page);
    await page.waitForTimeout(400);

    const file = `${outDir}/${route.name}-${viewport.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    const hits = await overflows(page);
    report.push({ route: route.name, viewport: viewport.name, file, overflows: hits });
    console.log(`${file} · ${hits.length} overflow hit${hits.length === 1 ? "" : "s"}`);
  }

  await context.close();
}

await browser.close();
await writeFile(`${outDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nreel + report: ${outDir}`);
