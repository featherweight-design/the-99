// probe:autocapture-names — PostHog autocapture drops another reader's name, pressed in a real browser (PersonName plan,
// PR G; the seal that switched autocapture on). jsdom proves the class works (`src/lib/person-name/autocapture.test.tsx`);
// this proves the PAGES carry it: every family draws a name somewhere only the real app reaches (a menu, a sheet, a row).
//
// How: the app's own analytics are dormant off the production hostname, so the probe loads the pinned posthog-js
// bundle (`node_modules/posthog-js/dist/array.full.js`) into each page, starts it on the production options
// (`posthogOptions`, so the switch under test is the shipped one) with `before_send` recording every event and sending
// none, then for each family's route finds the text nodes that hold a name the audit account can see (its friends, its
// pods, its friends' decks: read-only SQL), presses the nearest clickable ancestor, and fails if any `$autocapture`
// event carries that name anywhere in its text, attributes or elements chain. A positive control (an unmarked button
// pressed on the same page) must be recorded, so a silent harness cannot pass.
//
// Families and where they are pressed: friends (`/friends` list and rows), pods (the pods pane on `/friends` and the
// friend page's pod chips), spares and requests (each friend page's Spares tab), the feed (Home's rows), friend decks
// (each friend page's Decks tab and `/decks`), Rule 0 (`/friends/table` when the account has a table) and the game
// log (a deck's Games tab). A route that draws none of the account's names reports SKIP for that family, never PASS:
// the account needs friends, a pod, a friend with decks (`scripts/seed-r3-picker-fixture.mts` seeds some).
//
// READ-ONLY: the account's rows are only selected, nothing is written. It presses buttons and links the app draws, and a
// press that navigates is followed by a fresh page load for the next one. Local-dev only: production and staging are
// refused by `PROBE_BASE` (loopback, with a port). Point it at a server serving THIS worktree.
//
//   PROBE_BASE=http://localhost:3312 pnpm probe:autocapture-names
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { posthogOptions } from "../src/lib/analytics/posthog";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "" || u.pathname !== "/") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only (http://localhost:3312)`);
  }
}
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");
const sql = neon(DATABASE_URL);
const POSTHOG_BUNDLE = join(process.cwd(), "node_modules/posthog-js/dist/array.full.js");

type W = {
  posthog: { init: (key: string, config: Record<string, unknown>) => void; autocapture?: { onRemoteConfig: (c: unknown) => void } };
  __events: string[];
};

let failures = 0;
const check = (ok: boolean, label: string, saw: unknown) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${typeof saw === "string" ? saw : JSON.stringify(saw)})`);
};
const skip = (label: string, why: string) => console.log(`SKIP  ${label}  (${why})`);

async function signIn(page: Page, email: string, password: string) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Clerk = (window as any).Clerk;
      try {
        const signIn = Clerk.client.signIn;
        let attempt = email.includes("+clerk_test")
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === "email_code");
          if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (error as any)?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [email, password ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return page.evaluate(() => (window as any).Clerk.user.id as string);
}

/** posthog-js on the shipped options in this page; every event is recorded in `window.__events` and none is sent. */
async function armPostHog(page: Page) {
  await page.addScriptTag({ path: POSTHOG_BUNDLE });
  const { before_send: _shipped, ...options } = posthogOptions("https://ph.invalid");
  void _shipped;
  await page.evaluate((shipped) => {
    const w = window as unknown as W;
    w.__events = [];
    w.posthog.init("phc_probe", {
      ...shipped,
      capture_pageview: false,
      capture_pageleave: false,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      rageclick: false,
      persistence: "memory",
      disable_external_dependency_loading: true,
      opt_out_useragent_filter: true,
      before_send: (event: unknown) => {
        if (event) w.__events.push(JSON.stringify(event));
        return null;
      },
    });
    w.posthog.autocapture?.onRemoteConfig({ ok: true, config: { autocapture_opt_out: false } });
  }, options as Record<string, unknown>);
}

/** Presses the nearest clickable ancestor of the first visible text node holding `name`; false when none is drawn. */
async function pressName(page: Page, name: string): Promise<boolean> {
  return page.evaluate((needle) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.nodeValue?.includes(needle)) continue;
      const host = node.parentElement;
      if (!host || host.closest("script,style")) continue;
      const target = host.closest<HTMLElement>("a,button,summary,[role='button'],[role='menuitem'],[role='tab'],label") ?? host;
      const box = target.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      target.click();
      return true;
    }
    return false;
  }, name);
}

async function events(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as W).__events.slice());
}

type Family = { family: string; routes: string[]; names: string[] };

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
    const page = await context.newPage();
    const userId = await signIn(page, EMAIL, PASSWORD ?? "");

    // The names this account can see, read-only. Three characters or more, so a short name cannot match by accident.
    const friends = (await sql`select sp.display_name as name, sp.public_id as pid from friend_links fl join social_profiles sp on sp.user_id = fl.friend_user_id where fl.user_id = ${userId} order by sp.display_name limit 6`) as { name: string; pid: string }[];
    const podNames = ((await sql`select distinct p.name as name from pods p join pod_members pm on pm.pod_id = p.id where pm.user_id = ${userId} limit 6`) as { name: string }[]).map((r) => r.name);
    const deckNames = ((await sql`select distinct d.name as name from decks d join friend_links fl on fl.friend_user_id = d.user_id where fl.user_id = ${userId} limit 8`) as { name: string }[]).map((r) => r.name);
    const long = (names: string[]) => [...new Set(names)].filter((n) => n.trim().length >= 3);
    const friendNames = long(friends.map((f) => f.name));
    const friendPages = friends.slice(0, 3).map((f) => `/friends/${f.pid}`);

    const families: Family[] = [
      { family: "friends", routes: ["/friends", "/"], names: friendNames },
      { family: "pods", routes: ["/friends", ...friendPages], names: long(podNames) },
      { family: "spares and requests", routes: friendPages, names: friendNames },
      { family: "feed", routes: ["/"], names: friendNames },
      { family: "friend decks", routes: [...friendPages, "/decks"], names: long(deckNames) },
      { family: "Rule 0", routes: ["/friends/table"], names: [...friendNames, ...long(podNames)] },
      { family: "game log", routes: ["/decks"], names: [...friendNames, ...long(deckNames)] },
    ];

    for (const { family, routes, names } of families) {
      let pressed = 0;
      let leaked: string[] = [];
      for (const route of routes) {
        for (const name of names) {
          await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" }).catch(() => undefined);
          await armPostHog(page);
          if (!(await pressName(page, name))) continue;
          pressed += 1;
          await page.waitForTimeout(250);
          leaked = leaked.concat((await events(page)).filter((e) => e.includes('"$autocapture"') && e.includes(name.replace(/"/g, '\\"'))).map(() => `${route}: ${name}`));
        }
      }
      if (pressed === 0) skip(`${family}: a press on a name`, "no route drew one of this account's names");
      else check(leaked.length === 0, `${family}: no $autocapture event carries a name, over ${pressed} press(es)`, leaked);
    }

    // The control: an unmarked button on a page is recorded, so a harness that records nothing cannot pass the above.
    await page.goto(`${BASE}/friends`, { waitUntil: "networkidle" }).catch(() => undefined);
    await armPostHog(page);
    await page.evaluate(() => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "probe control";
      document.body.append(b);
      b.click();
    });
    await page.waitForTimeout(250);
    check((await events(page)).some((e) => e.includes('"$autocapture"') && e.includes("probe control")), "control: an unmarked button press is recorded", await events(page).then((e) => e.length));
  } finally {
    await browser.close();
  }
  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
