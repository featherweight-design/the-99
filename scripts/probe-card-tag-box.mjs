// probe:card-tag-box — the `[[` card tag in Help me choose's "Anything else?" box (card-tags PR 1), at
// 1300x900 and 390x844. Three facts about a laid-out page, which jsdom does not produce:
//
// 1. THE LIST OPENS FROM THE BOX. Typing `[[Rhys` shows the picker's listbox with a card to pick.
// 2. THE LIST IS NEVER UNDER THE PHONE'S DOCK. The box is scrolled to the foot of the window, where
//    the fixed dock sits; the list (below or flipped above) must not overlap the dock's box, and the
//    option painted at its centre must be the list's own, not the dock's.
// 3. A PICKED CARD SUBMITS AS A TAG. Picking writes the name into the box; pressing Find commanders
//    sends `[[<oracle id>|Name]]` in the server action's request. The request is ABORTED in the
//    browser, so no read runs and no credit is spent.
//
// Needs a server with HELP_ME_CHOOSE_ENABLED=true. It writes the account's About row through
// `clearAboutSheet` and nothing else. Point it at `local-dev`, never production.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const QUERY = "Rhys";
const TAG = /\[\[[0-9a-f-]{36}\|[^\]|]*Rhystic Study\]\]/;

const VIEWPORTS = [
  { label: 1300, width: 1300, height: 900 },
  { label: 390, width: 390, height: 844 },
];

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
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
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
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
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

await clerkSetup();
const browser = await chromium.launch();

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const userId = await signIn(page);
    await clearAboutSheet(page, userId);

    await page.goto(`${BASE}/decks/new/choose`, { waitUntil: "networkidle" });
    const box = onPage(page, "textarea");
    await box.waitFor({ timeout: 60_000 });

    // Put the box at the foot of the window, where the phone's dock is, so a list opening downward would be under it.
    await box.evaluate((n) => {
      const dock = document.querySelector('[data-testid="choose-dock"]');
      const dockTop = dock && getComputedStyle(dock).display !== "none" ? dock.getBoundingClientRect().top : window.innerHeight;
      const rect = n.getBoundingClientRect();
      window.scrollBy(0, rect.bottom - (dockTop - 24));
    });
    await box.click();
    await page.keyboard.type(`a deck around [[${QUERY}`);
    const list = onPageRole(page, "listbox");
    await list.waitFor({ timeout: 10_000 });
    const option = onPageRole(page, "option", /Rhystic Study/);
    await option.first().waitFor({ timeout: 10_000 });
    // The picker eases the box to the top a beat after it opens; let the placement settle.
    await page.waitForTimeout(1500);
    report(`${vp.label} the list opens from [[ and offers Rhystic Study`, (await option.count()) > 0);

    const geometry = await list.evaluate((ul) => {
      const l = ul.getBoundingClientRect();
      const dockEl = document.querySelector('[data-testid="choose-dock"]');
      const dock = dockEl && getComputedStyle(dockEl).display !== "none" ? dockEl.getBoundingClientRect() : null;
      const first = ul.querySelector('[role="option"]').getBoundingClientRect();
      const hit = document.elementFromPoint(first.left + first.width / 2, first.top + first.height / 2);
      return {
        overlapsDock: dock ? l.bottom > dock.top && l.top < dock.bottom : false,
        dockTop: dock ? Math.round(dock.top) : null,
        listTop: Math.round(l.top), listBottom: Math.round(l.bottom),
        onTop: Boolean(hit && ul.contains(hit)),
        inWindow: l.top >= 0 && l.bottom <= window.innerHeight,
      };
    });
    report(`${vp.label} the list does not overlap the dock`, !geometry.overlapsDock,
      `list ${geometry.listTop}-${geometry.listBottom}px, dock top ${geometry.dockTop ?? "none"}`);
    report(`${vp.label} the first option is what is painted at its centre, inside the window`, geometry.onTop && geometry.inWindow, JSON.stringify(geometry));

    await option.first().dispatchEvent("mousedown");
    const written = await box.inputValue();
    report(`${vp.label} picking writes the card's name into the box`, written.includes("Rhystic Study") && !/\[\[[0-9a-f-]{36}/.test(written), JSON.stringify(written));

    // Press Find commanders and read the server action's request, then abort it: no read, no credit.
    let posted = null;
    await page.route("**/decks/new/choose*", async (route) => {
      const req = route.request();
      if (req.method() === "POST") {
        posted = req.postData();
        await route.abort();
      } else {
        await route.continue();
      }
    });
    // Two presses are in the document (the desktop one and the phone dock's); the visible one is the one a reader has.
    const pressTarget = onPageRole(page, "button", /Find commanders|credit/).filter({ visible: true }).first();
    await pressTarget.click();
    await page.waitForTimeout(1500);
    report(`${vp.label} Find commanders sends the picked card as a stored tag`, posted !== null && TAG.test(decodeURIComponent(posted.replace(/\+/g, " "))), posted ? posted.slice(0, 200) : "no POST seen");
    await page.unroute("**/decks/new/choose*");
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
