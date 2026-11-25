// Collection quick filters feedback (Hugh 2026-11-25), PR C: the combos view loads with the list's skeleton, opens with both
// toggle counts, and keeps the chip pressed while the Collection's filters narrow the pairs.
//
// Run by hand against a dev server: `PROBE_BASE=http://localhost:3147 node scripts/probe-combos-filters.mjs`.
// It fails on main, where the view is blank while it loads, the "You own one" count pops in after its side is
// fetched, and typing a search takes the chip back to the card list. Not part of `pnpm test`: it needs a browser
// and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { gzipSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// The combos request is held so the loading state can be seen; HOLD_MS=0 measures the open without it.
const HOLD_MS = Number(process.env.HOLD_MS ?? 1500);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;

const VIEWPORTS = [
  { label: "phone 390x844", width: 390, height: 844, form: "phone" },
  { label: "tablet 820x1180", width: 820, height: 1180, form: "phone" },
  { label: "tablet 1180x820", width: 1180, height: 820, form: "wide" },
  { label: "desktop 1300x900", width: 1300, height: 900, form: "wide" },
];

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

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
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}



await clerkSetup();
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await signIn(page);
    // Hold the combos request so the loading state can be seen.
    let payload = null;
    let fetchedAt = 0;
    let fetchMs = 0;
    await page.route("**/api/collection-combos*", async (route) => {
      await new Promise((r) => setTimeout(r, HOLD_MS));
      const startedAt = Date.now();
      const response = await route.fetch();
      const body = await response.body();
      fetchedAt = Date.now();
      fetchMs = fetchedAt - startedAt;
      if (!payload) payload = { raw: body.length, gzip: gzipSync(body).length, json: JSON.parse(body.toString()) };
      if (process.env.DUMP_PAYLOAD) writeFileSync(process.env.DUMP_PAYLOAD, body);
      await route.fulfill({ response, body });
    });
    await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" });
    console.log(`\n== ${vp.label}`);
    const chip = page.locator("[data-quick-strip]:visible button", { hasText: "Two-card combos" }).first();
    await chip.waitFor({ timeout: 30_000 });
    const pressedAt = Date.now();
    await chip.click();
    check((await chip.getAttribute("aria-pressed")) === "true", `${vp.label}: the chip is pressed`);
    check(
      (await page.locator("[data-combos-loading]").count()) > 0,
      `${vp.label}: the list's loading state draws while the pairs load, not a blank`,
    );
    await page.waitForSelector("[data-combo-pair]", { timeout: 30_000 });
    console.log(`   press to first pair: ${Date.now() - pressedAt - HOLD_MS} ms (held ${HOLD_MS} ms); server+transfer ${fetchMs} ms, response handed to first pair ${Date.now() - fetchedAt} ms`);
    const toggle = (label) => page.locator("[data-combos-view] [role=group] button", { hasText: label });
    check(/\d/.test(await toggle("You own one").innerText()), `${vp.label}: the You own one count is there with the first pairs`);
    check(/\d/.test(await toggle("You own both").innerText()), `${vp.label}: the You own both count is there with the first pairs`);
    if (!payload.json.pieces) {
      console.log(`   payload (old shape): ${Math.round(payload.raw / 1024)} KB raw, ${Math.round(payload.gzip / 1024)} KB gzip, ${payload.json.both.pairs.length} both + ${payload.json.one.pairs.length} one pairs`);
      await context.close();
      continue;
    }
    const wireOne = payload.json.one.pairs.length;
    const wireBoth = payload.json.both.pairs.length;
    console.log(`   payload: ${Math.round(payload.raw / 1024)} KB raw, ${Math.round(payload.gzip / 1024)} KB gzip, ${wireBoth} both + ${wireOne} one pairs, ${Object.keys(payload.json.pieces).length} cards`);
    const countOf = async (label) => Number((await toggle(label).innerText()).replace(/[^0-9]/g, ""));
    check((await countOf("You own both")) === wireBoth && !payload.json.both.truncated, `${vp.label}: the You own both count is every pair the server sent (${wireBoth})`);
    check((await countOf("You own one")) === wireOne && !payload.json.one.truncated, `${vp.label}: the You own one count is every pair the server sent (${wireOne}), not a capped 300`);
    // The list's windowing: a page of pairs mounts, then Show more, never all of them at once.
    const mounted = await page.locator("[data-combo-pair]").count();
    check(mounted <= 200, `${vp.label}: at most one page of pairs mounts (${mounted})`);
    check(mounted === Math.min(wireBoth, 200), `${vp.label}: Own both mounts ${mounted} of ${wireBoth}`);
    const before = await page.locator("[data-combo-pair]").count();
    // A word of the first pair's first card, so something survives the search.
    const title = (await page.locator("[data-combo-title]").first().innerText()).replace(/\s+/g, " ");
    const word = title.split(" ").find((w) => w.length > 3 && /^[A-Za-z]+$/.test(w)) ?? title.slice(0, 4);
    const search = page.locator("input[type=search]:visible, [role=searchbox]:visible").first();
    await search.fill(word);
    await page.waitForTimeout(600);
    check((await chip.getAttribute("aria-pressed")) === "true", `${vp.label}: typing "${word}" keeps the chip pressed`);
    check((await page.locator("[data-combos-view]").count()) === 1, `${vp.label}: the combos view stays`);
    const after = await page.locator("[data-combo-pair]").count();
    check(after > 0 && after <= before, `${vp.label}: the search narrows the pairs (${before} to ${after})`);
    await search.fill("");
    await page.waitForTimeout(400);
    check((await page.locator("[data-combo-pair]").count()) === before, `${vp.label}: clearing the search brings every pair back`);
    // Own one, a name search AND a colour filter together (the missing card is tested on name, colours and type; the
    // owned-copy filters do not apply to it): the chip stays, the view stays, and some pairs survive but not all.
    await page.goto(`${BASE}/collection?combos=one`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-combo-pair]", { timeout: 30_000 });
    const oneAll = await countOf("You own one");
    // The Own one count after a filter is the full set's, so it can exceed what a page mounts; Show more reveals the rest.
    if (oneAll > 200) {
      check((await page.locator("[data-combos-more]").count()) === 1, `${vp.label}: Own one (${oneAll}) offers Show more`);
      await page.locator("[data-combos-more]").click();
      check((await page.locator("[data-combo-pair]").count()) === Math.min(oneAll, 400), `${vp.label}: Show more adds a page`);
    }
    await page.goto(`${BASE}/collection?combos=one&q=Blood&c=B`, { waitUntil: "domcontentloaded" });
    const chipOne = page.locator("[data-quick-strip]:visible button", { hasText: "Two-card combos" }).first();
    await chipOne.waitFor({ timeout: 30_000 });
    await page.waitForSelector("[data-combos-view]", { timeout: 30_000 });
    await page.waitForSelector("[data-combos-loading]", { state: "detached", timeout: 30_000 });
    await page.waitForTimeout(500);
    const oneNarrow = await countOf("You own one");
    check((await chipOne.getAttribute("aria-pressed")) === "true", `${vp.label}: Blood + Black on Own one keeps the chip pressed`);
    check(oneNarrow > 0 && oneNarrow < oneAll, `${vp.label}: Blood + Black narrows Own one (${oneAll} to ${oneNarrow})`);
    // Ground truth from the server's own payload: every pair with a Blood-named card that is black on either side
    // (the unfiltered list holds pairs ranked past 300, which the capped payload could not search).
    const pieces = payload.json.pieces;
    const truth = payload.json.one.pairs.filter((p) =>
      [p.a, p.b].some((id) => pieces[id].name.toLowerCase().includes("blood") && pieces[id].colorIdentity.includes("B")),
    ).length;
    console.log(`   Blood + Black on Own one: ${oneNarrow} shown; payload pairs with a black Blood card either side: ${truth}`);
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${vp.label}: no sideways page scroll`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures.length > 0) {
  console.log(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nall ok");
