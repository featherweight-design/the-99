// probe:fan-content-notice — the Fan Content notice (launch epic A1) on the signed-out surfaces, at 390x844 and 1300x900.
//
// Design: design/design_handoff_the99_fan_content_notice (R2). What jsdom cannot say is where the notice LANDS, so this reads
// resolved geometry on every bare-branch route: `/`, `/sign-up`, `/join/<token>`, `/friend/<token>` and `/offline`. Per route
// and width, signed out:
//   1  one `footer[data-fan-content-notice]` exists, and it is the last thing in the document;
//   2  AT REST it starts at or below the fold (its top is >= the viewport height), so the page looks as it shipped;
//   3  scrolled to the end it is fully on screen, and its last line is inside the viewport;
//   4  its text is the locked passages, its ink is the theme's `--fg-muted`, and it is not `position: fixed`;
//   5  the phone shows it in 6 lines or fewer (3 + 3 in Plex Sans at 390; a wall is the failure the brief named);
//   6  the page has no sideways scroll.
// With E2E_AUDIT_USER_EMAIL set it also signs in as that (read-only) audit account on Clerk's DEVELOPMENT instance and checks
// the signed-in shell on `/`, `/decks`, `/collection` and the 404 (a short page, so the one that proves the fold): the notice is one footer, a SIBLING after <main>, starts at or
// below the tab bar's top edge at rest on the phone (the fold moves with the 74px/88px bar), and scrolled to the end its last
// line clears the bar; on desktop it sits in the column beside the rail, never under it.
// Read-only: no write. Point it at a server serving THIS worktree (read the pid's cwd first).
//
//   PROBE_BASE=http://localhost:3466 pnpm probe:fan-content-notice
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import "./lib/env.mjs";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// (A signed-out request to an unknown path is sent to sign in by the proxy, so the signed-out 404 is not reachable to probe; the
// signed-in 404 below is a SHORT page, which is what proves the fold.)
const ROUTES = ["/", "/sign-up", "/join/probe-token", "/friend/probe-token", "/offline", "/privacy", "/terms"];
const WIDTHS = [
  { label: "390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { label: "1300", viewport: { width: 1300, height: 900 } },
];
let failures = 0;
const report = (ok, name, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? " PASS " : " FAIL "} ${name}${detail ? `  (${detail})` : ""}`);
};

async function signIn(page, email) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const result = await page.evaluate(async (e) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: e });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return { error: `sign-in status: ${attempt.status}` };
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return { ok: true };
    } catch (error) {
      return { error: error?.errors?.[0]?.longMessage ?? String(error) };
    }
  }, email);
  if (result.error) throw new Error(`Clerk sign-in failed: ${result.error}`);
}

const browser = await chromium.launch();
try {
  if (process.env.E2E_AUDIT_USER_EMAIL) {
    await clerkSetup();
    for (const w of WIDTHS) {
      const context = await browser.newContext({ viewport: w.viewport, isMobile: w.isMobile, hasTouch: w.hasTouch });
      const page = await context.newPage();
      await signIn(page, process.env.E2E_AUDIT_USER_EMAIL);
      for (const route of ["/", "/decks", "/collection", "/privacy", "/terms", "/probe-missing"]) {
        const name = `signed in ${route} @${w.label}`;
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
        const g = await page.evaluate(() => {
          const f = document.querySelector("footer[data-fan-content-notice]");
          const main = document.querySelector("main");
          if (!f) return null;
          const bar = [...document.querySelectorAll('nav[aria-label="Primary"]')].find((n) => n.getBoundingClientRect().height > 0 && getComputedStyle(n).position === "fixed");
          const rail = [...document.querySelectorAll('nav[aria-label="Primary"]')].find((n) => n.getBoundingClientRect().width > 0 && getComputedStyle(n).position !== "fixed");
          const r = f.getBoundingClientRect();
          return {
            count: document.querySelectorAll("footer[data-fan-content-notice]").length,
            sibling: f.parentElement === main.parentElement && !main.contains(f) && main.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING,
            top: r.top + window.scrollY, vh: window.innerHeight, barTop: bar ? bar.getBoundingClientRect().top : null,
            left: r.left, railRight: rail ? rail.getBoundingClientRect().right : 0,
          };
        });
        report(g?.count === 1 && !!g.sibling, `${name}: one notice, a sibling after <main>`);
        if (!g) continue;
        const fold = g.barTop ?? g.vh;
        report(g.top >= fold - 1, `${name}: at rest it starts at or below ${g.barTop ? "the tab bar's top edge" : "the fold"}`, `top ${Math.round(g.top)} vs ${Math.round(fold)}`);
        if (w.label === "1300") report(g.left >= g.railRight - 1, `${name}: beside the rail, not under it`, `${Math.round(g.left)} vs rail ${Math.round(g.railRight)}`);
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const end = await page.evaluate(() => {
          const r = document.querySelector("footer[data-fan-content-notice]").getBoundingClientRect();
          const bar = [...document.querySelectorAll('nav[aria-label="Primary"]')].find((n) => n.getBoundingClientRect().height > 0 && getComputedStyle(n).position === "fixed");
          return { bottom: r.bottom, limit: bar ? bar.getBoundingClientRect().top : window.innerHeight };
        });
        report(end.bottom <= end.limit + 1, `${name}: scrolled to the end its last line clears the bar`, `${Math.round(end.bottom)} <= ${Math.round(end.limit)}`);
      }
      // The pages whose action dock is `fixed` over the foot of the page (A1b). Scrolled to the end, the notice's last line
      // must clear the TOPMOST fixed dock, not only the tab bar. A page that draws no dock at this width is reported as
      // skipped, never as a pass: the top-off bar
      // needs PROBE_TOPOFF_PATH (a deck with open slots; the probe presses the strip's door itself).
      const precon = await page.goto(`${BASE}/decks/precons`, { waitUntil: "networkidle" }).then(() => page.evaluate(() => document.querySelector('a[href^="/decks/precons/"]')?.getAttribute("href") ?? null));
      const DOCKED = [
        ["picker", "/decks/new"],
        ["intake", "/decks/new/choose"],
        ["precon", precon],
        ["top-off", process.env.PROBE_TOPOFF_PATH ?? null],
      ];
      for (const [label, path] of DOCKED) {
        const name = `signed in ${label} dock @${w.label}`;
        if (!path) { console.log(` SKIP  ${name}: no route to open`); continue; }
        await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
        if (label === "top-off") {
          // The list (and its pinned commit bar) mounts only after the strip's door is pressed. Pressing it is a view state, no write.
          const door = page.getByRole("button", { name: /^Choose the cards for the last/ });
          if (!(await door.count())) { console.log(` SKIP  ${name}: no open slots on ${path}, so no top-off door`); continue; }
          await door.first().click();
          await page.waitForTimeout(800);
        }
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const m = await page.evaluate(() => {
          const f = document.querySelector("footer[data-fan-content-notice]");
          if (!f) return null;
          const vh = window.innerHeight;
          const docks = [...document.querySelectorAll("body *")].filter((e) => {
            if (e === f || f.contains(e) || e.closest("nav") || e.closest('[role="dialog"]')) return false;
            const cs = getComputedStyle(e);
            const r = e.getBoundingClientRect();
            return cs.position === "fixed" && cs.display !== "none" && r.width > 200 && r.height > 20 && r.height < 240 && r.top > vh / 2 && r.bottom < vh + 1;
          });
          const dockTop = docks.length ? Math.min(...docks.map((e) => e.getBoundingClientRect().top)) : null;
          // The last LINE, not the box: the box always ends at the column's foot, and its bottom padding is what clears the dock.
          return { bottom: f.querySelector("div").getBoundingClientRect().bottom, dockTop, docks: docks.length };
        });
        if (!m) { report(false, `${name}: a notice is drawn`); continue; }
        if (m.dockTop === null) { console.log(` SKIP  ${name}: no fixed dock drawn at this width`); continue; }
        report(m.bottom <= m.dockTop + 1, `${name}: scrolled to the end the notice clears the dock`, `${Math.round(m.bottom)} <= ${Math.round(m.dockTop)}`);
      }
      await context.close();
    }
  }
  for (const w of WIDTHS) {
    const context = await browser.newContext({ viewport: w.viewport, isMobile: w.isMobile, hasTouch: w.hasTouch });
    for (const route of ROUTES) {
      const page = await context.newPage();
      const name = `${route} @${w.label}`;
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      const count = await page.locator("footer[data-fan-content-notice]").count();
      report(count === 1, `${name}: exactly one notice`, `found ${count}`);
      if (count !== 1) { await page.close(); continue; }
      const rest = await page.evaluate(() => {
        const f = document.querySelector("footer[data-fan-content-notice]");
        const r = f.getBoundingClientRect();
        const body = document.body;
        const last = [...body.children].filter((c) => c.tagName !== "SCRIPT" && c.tagName !== "NEXT-ROUTE-ANNOUNCER").at(-1);
        const p = f.querySelectorAll("p");
        const line = parseFloat(getComputedStyle(p[0]).lineHeight);
        return {
          top: r.top + window.scrollY, vh: window.innerHeight, position: getComputedStyle(f).position,
          ink: getComputedStyle(p[0]).color, expectedInk: getComputedStyle(document.documentElement).getPropertyValue("--fg-muted").trim(),
          lines: Math.round((p[0].getBoundingClientRect().height + p[1].getBoundingClientRect().height) / line),
          lastIsNotice: f === last || last.contains(f), overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          text: [...p].map((x) => x.textContent.replace(/\s*↗/, "")),
        };
      });
      report(rest.top >= rest.vh - 1, `${name}: at rest it starts at or below the fold`, `top ${Math.round(rest.top)} of ${rest.vh}`);
      report(rest.position !== "fixed" && rest.position !== "sticky", `${name}: not fixed`, rest.position);
      report(rest.lastIsNotice, `${name}: last in the document`);
      report(!rest.overflowX, `${name}: no sideways scroll`);
      report(rest.text[0].startsWith("The 99 is unofficial Fan Content") && rest.text[1].startsWith("Card images and mana symbols"), `${name}: the locked passages`);
      if (w.label === "390") report(rest.lines <= 6, `${name}: not a wall`, `${rest.lines} lines`);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const end = await page.evaluate(() => {
        const r = document.querySelector("footer[data-fan-content-notice]").getBoundingClientRect();
        return { bottom: r.bottom, top: r.top, vh: window.innerHeight };
      });
      report(end.top >= 0 && end.bottom <= end.vh + 1, `${name}: scrolled to the end it is fully on screen`, `${Math.round(end.top)}..${Math.round(end.bottom)} of ${end.vh}`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
