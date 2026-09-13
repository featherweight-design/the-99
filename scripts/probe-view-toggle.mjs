// E3 for #349: the view well on both surfaces at 390px and at desktop, and
// (since the preference started persisting) whether the choice survives leaving
// the route.
//
// The question the plan asks is whether `/collection`'s phone filter bar can
// absorb the segments growing from 28×24 to 44×44 — and the answer has to be
// measured, because a bar that clips or wraps is a finding that goes back to
// Design rather than a licence to give the two surfaces different controls.
//
// Run by hand: `node scripts/probe-view-toggle.mjs`
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
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

/** The well, its two segments, and the row that has to hold them. */
async function well(page, names) {
  return page.evaluate((labels) => {
    const segments = labels.map((label) =>
      document.querySelector(`button[aria-label="${label}"]`),
    );
    if (segments.some((s) => !s)) return null;
    const box = segments[0].closest("div").getBoundingClientRect();
    const row = segments[0].closest("div").parentElement.getBoundingClientRect();
    const scroller = segments[0].closest("div").parentElement;
    return {
      segments: segments.map((s) => {
        const b = s.getBoundingClientRect();
        return {
          label: s.getAttribute("aria-label"),
          pressed: s.getAttribute("aria-pressed"),
          width: Math.round(b.width),
          height: Math.round(b.height),
        };
      }),
      well: { width: Math.round(box.width), height: Math.round(box.height) },
      row: {
        clientWidth: scroller.clientWidth,
        scrollWidth: scroller.scrollWidth,
        overflowing: scroller.scrollWidth > scroller.clientWidth,
        height: Math.round(row.height),
        // Where the row wraps, and what sits on each line: a bar that gained a
        // whole line is a finding even when nothing clipped.
        lines: [...scroller.children]
          .filter((c) => c.getBoundingClientRect().width > 0)
          .reduce((acc, c) => {
            const b = c.getBoundingClientRect();
            const top = Math.round(b.top);
            const line = acc.find((l) => Math.abs(l.top - top) < 12);
            const text = (c.getAttribute("aria-label") ?? c.textContent ?? "").trim();
            if (line) line.items.push(text);
            else acc.push({ top, items: [text] });
            return acc;
          }, [])
          .map((l) => l.items),
      },
    };
  }, names);
}

/** Press a segment and wait for it to take. */
async function press(page, label) {
  await page.click(`button[aria-label="${label}"]`);
  await page.waitForFunction(
    (l) => document.querySelector(`button[aria-label="${l}"]`)?.getAttribute("aria-pressed") === "true",
    label,
    { timeout: 5_000 },
  );
}

async function pressed(page, labels) {
  return page.evaluate(
    (ls) =>
      ls.find(
        (l) => document.querySelector(`button[aria-label="${l}"]`)?.getAttribute("aria-pressed") === "true",
      ) ?? null,
    labels,
  );
}

/**
 * The preference is localStorage, so nothing short of a real navigation proves
 * it: component state survives a client-side route change on its own if the
 * tree is not unmounted, and a URL mirror survives anything with the parameter
 * still in it. Each surface is therefore left by loading another route, then
 * re-entered at a bare URL.
 */
async function persistence(page, { url, labels, choose, bare }) {
  await page.goto(url, { waitUntil: "networkidle" });
  const opened = await pressed(page, labels);
  await press(page, choose);

  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  await page.goto(bare, { waitUntil: "networkidle" });
  const returned = await pressed(page, labels);

  return { opened, chose: choose, returned, kept: returned === choose };
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  const report = {};

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await signIn(page);

    await page.goto(`${BASE}/collection`, { waitUntil: "networkidle" });
    const collection = await well(page, ["Rows view", "Grid view"]);

    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    // `/decks/import` and `/decks/new` are on this page too, and the first is
    // off-screen at phone width — take a deck by its href rather than by order.
    const deckHref = await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="/decks/"]')]
        .map((a) => a.getAttribute("href"))
        .find((h) => !["/decks/import", "/decks/new"].includes(h)),
    );
    if (!deckHref) throw new Error("No deck to open — seed one first.");
    await page.goto(`${BASE}${deckHref}`, { waitUntil: "networkidle" });
    const deck = await well(page, ["List view", "Card view"]);

    // The deck's own view, and `/collection`'s, each pressed and then returned
    // to. `/collection` mirrors the choice into `?view=`, so it is re-entered at
    // a bare URL — otherwise the parameter would answer instead of the store.
    const deckPersists = await persistence(page, {
      url: `${BASE}${deckHref}`,
      labels: ["List view", "Card view"],
      choose: "Card view",
      bare: `${BASE}${deckHref}`,
    });
    const collectionPersists = await persistence(page, {
      url: `${BASE}/collection`,
      labels: ["Rows view", "Grid view"],
      choose: vp.width < 768 ? "Grid view" : "Rows view",
      bare: `${BASE}/collection`,
    });

    // A link naming a view has to beat the stored habit, or a shared URL shows
    // the recipient their own list rather than the sender's.
    const contrary = collectionPersists.chose === "Grid view" ? "rows" : "grid";
    await page.goto(`${BASE}/collection?view=${contrary}`, { waitUntil: "networkidle" });
    const urlWins = {
      param: contrary,
      pressed: await pressed(page, ["Rows view", "Grid view"]),
    };
    urlWins.honoured = urlWins.pressed?.toLowerCase().startsWith(contrary) ?? false;

    report[vp.label] = { collection, deck, deckPersists, collectionPersists, urlWins };
    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
