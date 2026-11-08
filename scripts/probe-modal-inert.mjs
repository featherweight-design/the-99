// probe:modal-inert — every aria-modal surface holds the page behind it (the bottom tab bar on a phone, the left rail on
// desktop). Companion to probe-sheet-inert.mjs, which proves the mechanism on one Sheet; this one sweeps the surfaces
// that are NOT built on Sheet (and a Sheet control). Per surface and viewport it opens the surface, then asserts that
// every visible `nav` landmark is inert (itself or under an inert ancestor) AND that the browser's accessibility tree
// (CDP getFullAXTree) lists none of the nav's links. A surface that cannot be opened reports CANNOT-OPEN, never PASS.
//
//   E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app PROBE_BASE=http://localhost:3471 node scripts/probe-modal-inert.mjs [filter-substring]
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3300";
const ONLY = process.argv[2];
const PHONE = { width: 390, height: 844 };
const DESK = { width: 1280, height: 800 };

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      await signIn.create({ identifier: email });
      const factor = signIn.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
      const attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

/** Browser accessibility tree (CDP) as "role:name" lines; Playwright's snapshot ignores `inert`, this does not. */
const tree = async (page) => {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  return nodes.filter((n) => !n.ignored && n.role?.value && n.name?.value).map((n) => `${n.role.value}:${n.name.value}`);
};

/** Visible nav landmarks, whether each is inert, and the accessible names of their links. */
const shell = (page) =>
  page.evaluate(() => {
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const navs = [...document.querySelectorAll("nav")].filter(visible);
    return navs.map((n) => ({
      label: n.getAttribute("aria-label") ?? n.getAttribute("data-rail-nav") ?? "nav",
      inert: !!n.closest("[inert]"),
      links: [...n.querySelectorAll("a[href]")].map((a) => (a.getAttribute("aria-label") || a.textContent).trim().replace(/\s+/g, " ")).filter(Boolean),
    }));
  });

const MODAL = '[aria-modal="true"]';
const click = async (loc, timeout = 6000) => {
  await loc.first().waitFor({ state: "visible", timeout });
  await loc.first().click();
};
/** First link href on the page matching a pattern, as a path. */
const hrefOf = (page, re) =>
  page.evaluate((src) => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).find((h) => new RegExp(src).test(h)) ?? null, re);

// open(page, vp) must leave a visible aria-modal surface or throw. The surface list: id, file, route, trigger text, widths.
const S = [
  { id: "CONTROL add-cards (useInertPage)", file: "collection/add-cards-sheet.tsx", route: "/collection", trigger: "button 'Add cards'",
    open: (p) => click(p.getByRole("button", { name: "Add cards" })) },
  { id: "collection filter-sheet", file: "collection/filter-sheet.tsx", route: "/collection", trigger: "button 'Filter cards'", vps: ["phone"],
    open: (p) => click(p.getByRole("button", { name: "Filter cards" })) },
  { id: "FilterPanel phone sheet (collection Sort)", file: "ui/filter-panel.tsx", route: "/collection", trigger: "button /^Sort cards/", vps: ["phone"],
    open: (p) => click(p.getByRole("button", { name: /^Sort cards/ })) },
  { id: "FilterPanel phone sheet (decks Sort)", file: "ui/filter-panel.tsx", route: "/decks", trigger: "button /^Sort/", vps: ["phone"],
    open: (p) => click(p.getByRole("button", { name: /^Sort ·/ })) },
  { id: "deck-filter-sheet", file: "decks/deck-filter-sheet.tsx", route: "/decks", trigger: "button 'Filter decks'", vps: ["phone"],
    open: (p) => click(p.getByRole("button", { name: "Filter decks" })) },
  { id: "shelf-sheet (folder picker)", file: "decks/shelf-sheet.tsx", route: "/decks", trigger: "button /^Folder:/", vps: ["phone"],
    open: (p) => click(p.getByRole("button", { name: /^Folder:/ })) },
  { id: "folder-create-dialog (from shelf-sheet)", file: "decks/folder-create-dialog.tsx", route: "/decks", trigger: "Folder: then 'New folder'", vps: ["phone"],
    open: async (p) => { await click(p.getByRole("button", { name: /^Folder:/ })); await click(p.getByRole("button", { name: /^New folder/ })); await p.locator('[aria-label="New folder"]' + MODAL).waitFor({ timeout: 4000 }); } },
  { id: "shelf-menu (shelf actions)", file: "decks/shelf-menu.tsx", route: "/decks", trigger: "button /^Actions for <folder>/ on a folder chip", vps: ["phone", "desk"],
    open: (p) => click(p.locator('[aria-haspopup="dialog"][aria-label^="Actions for"]').filter({ has: p.locator("xpath=self::*") }), 3000) },
  { id: "commanders rack filter-sheet", file: "commanders/rack/filter-sheet.tsx", route: "/commanders", trigger: "button 'Filters'", vps: ["phone"],
    open: (p) => click(p.getByRole("button", { name: "Filters", exact: true })) },
  { id: "commanders Printed-in set-list-sheet", file: "ui/set-list-sheet.tsx", route: "/commanders", trigger: "Filters, then 'Printed in'", vps: ["phone"],
    open: async (p) => { await click(p.getByRole("button", { name: "Filters", exact: true })); await click(p.getByRole("button", { name: /printed in|sets/i })); await p.locator('[aria-modal="true"]').nth(1).waitFor({ timeout: 4000 }); } },
  { id: "cart-filter-sheet (shopping)", file: "decks/cart/cart-filter-sheet.tsx", route: "/decks/shopping", trigger: "button 'Filter cards'", vps: ["phone"],
    open: (p) => click(p.getByRole("button", { name: "Filter cards" })) },
  { id: "set-grid-view filter sheet", file: "sets/set-grid-view.tsx", route: "/collection/sets/dsk", trigger: "button 'Filters'", vps: ["phone"],
    open: (p) => click(p.getByRole("button", { name: "Filters", exact: true })) },
  { id: "card-search (phone)", file: "card-search/card-search.tsx", route: "/decks", trigger: "button 'Search all cards'", vps: ["phone"],
    open: (p) => click(p.getByRole("button", { name: "Search all cards" })) },
  { id: "card-modal", file: "cards/card-modal.tsx", route: "/collection", trigger: "first card row button", 
    open: (p) => click(p.getByRole("button", { name: /, \d+ cop(y|ies)/ })) },
  { id: "revert-confirm", file: "collection/revert-confirm.tsx", route: "/collection/history", trigger: "first button 'Revert'",
    open: async (p) => { await click(p.getByRole("button", { name: /^Revert/ })); } },
  { id: "got-it-confirm", file: "decks/got-it-confirm.tsx", route: "/decks/shopping", trigger: "button /^Bought .*\\?/",
    open: (p) => click(p.getByRole("button", { name: /^Bought .*\?/ })) },
  { id: "social-modal (signature picker)", file: "social/social-modal.tsx", route: "/friends", trigger: "button 'Choose your signature card'",
    open: (p) => click(p.getByRole("button", { name: "Choose your signature card" })) },
  { id: "social-modal (add a friend)", file: "social/pod-add-friends.tsx", route: "/friends", trigger: "button 'Add a friend'",
    open: (p) => click(p.getByRole("button", { name: "Add a friend" })) },
  { id: "account-menu (documented exempt)", file: "shell/account-menu.tsx", route: "/decks", trigger: "button /^Account:/", expectLive: true,
    open: (p) => click(p.getByRole("button", { name: /^Account:/ })) },
  { id: "creator-note", file: "about/reference/creator-note.tsx", route: "/about?tab=reference", trigger: "link 'A note from the creator' (a[href=#creator-note])",
    open: (p) => click(p.locator("a[data-creator-note-row]")) },
  { id: "start-precon", file: "decks/precons/start-precon.tsx", route: "/decks/precons", trigger: "first precon tile, then 'Start with this precon'",
    open: async (p) => { const h = await hrefOf(p, "^/decks/precons/[^/]+$"); if (!h) throw new Error("no precon link"); await p.goto(BASE + h, { waitUntil: "networkidle" }); await click(p.getByRole("button", { name: /Start with this precon/ })); } },
  { id: "export-dialog (deck builder)", file: "decks/export-dialog.tsx", route: "/decks", trigger: "first deck, then Export",
    open: async (p) => { const h = await hrefOf(p, "^/decks/\\d+$|^/decks/[0-9a-f-]{8,}$"); if (!h) throw new Error("no deck link"); await p.goto(BASE + h, { waitUntil: "networkidle" }); await click(p.getByRole("button", { name: /^Export/ })); } },
  { id: "friends-list remove (confirm)", file: "social/friends-list.tsx", route: "/friends", trigger: "friend row menu",
    open: (p) => click(p.locator('button[aria-label*="options" i], button[aria-label*="menu" i]'), 2500) },
  { id: "confirm-modal (replace flow)", file: "collection/confirm-modal.tsx", route: "/collection/replace", trigger: "needs an uploaded CSV",
    open: () => { throw new Error("needs a CSV upload through the replace flow"); } },
  { id: "admin confirm-frame / setting-dialog", file: "admin/confirm-frame.tsx, setting-dialog.tsx", route: "/admin/flags", trigger: "admin only",
    open: async (p) => { await p.goto(BASE + "/admin/flags", { waitUntil: "networkidle" }); if (!/\/admin/.test(p.url())) throw new Error("audit user is not an admin (redirected to " + new URL(p.url()).pathname + ")"); await click(p.getByRole("button", { name: /set|kill|change|edit/i }), 2500); } },
];

const results = [];
await clerkSetup();
const browser = await chromium.launch();
for (const s of S) {
  if (ONLY && !(s.id + s.file).toLowerCase().includes(ONLY.toLowerCase())) continue;
  for (const [vpName, vp] of [["phone", PHONE], ["desk", DESK]]) {
    if (s.vps && !s.vps.includes(vpName)) { continue; }
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    let verdict, detail = "";
    try {
      await signIn(page);
      await page.goto(BASE + s.route, { waitUntil: "networkidle" });
      const before = await tree(page);
      try {
        await s.open(page, vp);
        await page.locator(MODAL).first().waitFor({ state: "visible", timeout: 5000 });
      } catch (e) {
        throw Object.assign(new Error(String(e.message).split("\n")[0]), { cannot: true });
      }
      await page.waitForTimeout(500);
      const navs = await shell(page);
      const open = await tree(page);
      const names = navs.flatMap((n) => n.links);
      const reachable = names.filter((n) => open.includes(`link:${n}`));
      const navsLive = navs.filter((n) => !n.inert);
      const ok = navs.length > 0 && navsLive.length === 0 && reachable.length === 0;
      verdict = s.expectLive ? (ok ? "FAIL" : "EXEMPT-LIVE") : ok ? "PASS" : "FAIL";
      detail = `navs=${navs.length} inert=${navs.length - navsLive.length} liveNav=[${navsLive.map((n) => n.label)}] navLinksInAX=${reachable.length}/${names.length}`;
      if (navs.length === 0) { verdict = "CANNOT-OPEN"; detail = "no visible nav landmark found (cannot judge)"; }
      void before;
    } catch (e) {
      verdict = e.cannot ? "CANNOT-OPEN" : "ERROR";
      detail = e.message;
    }
    results.push({ id: s.id, file: s.file, route: s.route, vp: vpName, verdict, detail });
    console.log(`${verdict.padEnd(11)} ${vpName.padEnd(5)} ${s.id}  [${s.file}]  ${detail}`);
    await ctx.close(); // fresh context per surface: nothing leaks from a surface left open
  }
}
await browser.close();

const count = (v) => results.filter((r) => r.verdict === v).length;
console.log(`\nSUMMARY  PASS ${count("PASS")}  FAIL ${count("FAIL")}  CANNOT-OPEN ${count("CANNOT-OPEN")}  EXEMPT-LIVE ${count("EXEMPT-LIVE")}  ERROR ${count("ERROR")}`);
for (const r of results.filter((r) => r.verdict === "FAIL")) console.log(`FAIL  ${r.vp}  ${r.file}  (${r.route})`);
process.exit(results.some((r) => r.verdict === "FAIL" || r.verdict === "ERROR") ? 1 : 0);
