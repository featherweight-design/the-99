// probe:locked-nav — the first-run lock on the nav, pressed, at 390x844 and 1300x900.
//
// Design table: docs/superpowers/design-tables/first-run-locked-nav.md. Every check here is a
// fact about RESOLVED geometry or style, which jsdom has neither of; `nav.test.tsx` pins the
// contract and the open/close rules, and this says they land:
//
//   desktop  the well is 48px wide, radius 12, on `--surface-sunken` with a 1px `--border`
//            (1.3-1.10); the note is 268px wide at the rail's right edge + 12 with its caret on
//            the hovered slot's centre (3.1, 3.8, 3.9); it stays open while the pointer travels
//            from the slot onto it (3.21); Escape returns focus to the slot; Go to step 1 focuses
//            Upload a CSV (3.19); the page line draws under the H1 on first run only (2.x, 2.10).
//   phone    the bar is 88px while locked and <main> reserves exactly that (4.1); the bracket
//            spans slots 2 to 5 and its label is centred on the box's top edge (4.4-4.6); the
//            note's foot sits 10px above the bar with its caret on the tapped slot (5.1, 5.8);
//            Go to step 1 focuses Upload a CSV (5.15).
//
// FIXTURE. The lock draws only for an account with no collection, so this signs in as the same
// DEDICATED empty account `probe:onboarding` uses, on Clerk's DEVELOPMENT instance
// (`onboard-probe+clerk_test@the99.app`, override with PROBE_EMAIL). Its collection and uploads
// are cleared on the way in and out, and the one deck the dashboard case writes is deleted in a
// `finally`. Point it at `local-dev`, NEVER production.
//
//   PROBE_BASE=http://localhost:3319 pnpm probe:locked-nav
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPageRole } from "./lib/surface.mjs";

const { DATABASE_URL } = requireEnv(["DATABASE_URL", "CLERK_SECRET_KEY"]);
const EMAIL = process.env.PROBE_EMAIL ?? "onboard-probe+clerk_test@the99.app";
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const sql = neon(DATABASE_URL);
// `cleanup` deletes the signed-in account's collection and uploads, so the target is checked,
// and refused when it cannot be read, before any write (the `probe:onboarding` rule).
const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

let failures = 0;
function report(ok, name, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " PASS " : " FAIL "} ${name}${detail ? `  (${detail})` : ""}`);
}
const near = (a, b, tol = 1) => a != null && b != null && Math.abs(a - b) <= tol;
const px = (n) => (n == null ? "none" : `${Math.round(n * 10) / 10}px`);

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const result = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return { error: `sign-in status: ${attempt.status}` };
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return { userId: window.Clerk.user?.id };
    } catch (error) {
      return { error: error?.errors?.[0]?.longMessage ?? String(error) };
    }
  }, EMAIL);
  if (result.error) throw new Error(`Clerk sign-in failed: ${result.error}`);
  return result.userId;
}

async function cleanup(userId) {
  if (!userId) return;
  await sql`delete from collection_items where user_id = ${userId}`;
  await sql`delete from csv_uploads where user_id = ${userId}`;
}

// The locked slot of one chrome, whichever is drawn at this width. Both chromes are mounted at
// every width and one is hidden, so the visible one is the one being measured.
function lockedSlot(page, label) {
  return page.locator(`[data-locked-slot="${label}"]:visible`);
}

/** A token resolved in the page's theme, as the browser would paint it. */
async function resolve(page, prop, value) {
  return page.evaluate(
    ([p, v]) => {
      const el = document.createElement("div");
      el.style.setProperty(p, v);
      document.body.append(el);
      const out = getComputedStyle(el).getPropertyValue(p);
      el.remove();
      return out;
    },
    [prop, value],
  );
}

async function openNote(page) {
  return page.evaluate(() => {
    const note = [...document.querySelectorAll('[data-lock-note="open"]')].find(
      (n) => n.getBoundingClientRect().width > 0,
    );
    if (!note) return null;
    const r = note.getBoundingClientRect();
    const caret = note.querySelector("[data-lock-caret]")?.getBoundingClientRect() ?? null;
    return {
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      width: r.width,
      caretX: caret ? caret.left + caret.width / 2 : null,
      caretY: caret ? caret.top + caret.height / 2 : null,
    };
  });
}

async function centre(locator) {
  const b = await locator.boundingBox();
  return b ? { ...b, x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
}

async function focusedIsUpload(page) {
  return page.evaluate(() => {
    const a = document.activeElement;
    return Boolean(a?.hasAttribute("data-step1-upload")) && a.textContent?.trim() === "Upload a CSV";
  });
}

async function desktop(page) {
  console.log("\n── desktop 1300x900: first run");
  await page.setViewportSize({ width: 1300, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await onPageRole(page, "button", "Upload a CSV").waitFor();

  // 1. The well.
  const well = await page.evaluate(() => {
    const el = document.querySelector("aside [data-lock-well]");
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      width: el.getBoundingClientRect().width,
      radius: cs.borderTopLeftRadius,
      bg: cs.backgroundColor,
      border: `${cs.borderTopWidth} ${cs.borderTopColor}`,
      slots: el.querySelectorAll("[data-locked-slot]").length,
    };
  });
  const sunken = await resolve(page, "background-color", "var(--surface-sunken)");
  const border = await resolve(page, "border-top-color", "var(--border)");
  report(well?.width === 48, "1.3 the well is 48px wide", px(well?.width));
  report(well?.radius === "12px", "1.10 the well's radius is 12px", well?.radius);
  report(well?.bg === sunken, "1.7 the well is --surface-sunken", `${well?.bg} vs ${sunken}`);
  report(well?.border === `1px ${border}`, "1.8 the well's border is 1px --border", well?.border);
  report(well?.slots === 4, "1.1 the well holds the four locked slots", String(well?.slots));

  // 2. The page line, first run.
  const line = page.locator("[data-lock-page-line]");
  report(await line.isVisible(), "2.2 the page line draws under the H1 on first run");
  const lineStyle = await line.evaluate((el) => {
    const h1 = el.previousElementSibling?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { size: getComputedStyle(el).fontSize, color: getComputedStyle(el).color, gap: h1 ? r.top - h1.bottom : null };
  });
  const muted = await resolve(page, "color", "var(--fg-muted)");
  report(lineStyle.size === "12.5px" && lineStyle.color === muted, "2.5/2.6 page line 12.5px in --fg-muted", `${lineStyle.size} ${lineStyle.color}`);
  report(near(lineStyle.gap, 12), "2.3 12px under the H1", px(lineStyle.gap));

  // 3. Hover opens the note, placed against the rail and the slot.
  const decks = lockedSlot(page, "Decks");
  await decks.hover();
  await page.waitForSelector('[data-lock-note="open"]');
  const rail = await page.locator("aside").boundingBox();
  const slot = await centre(decks);
  let note = await openNote(page);
  report(note?.width === 268, "3.1 the note is 268px wide", px(note?.width));
  report(near(note?.left, rail.x + rail.width + 12, 0.5), "3.8 the note sits 12px right of the rail", `note ${px(note?.left)}, rail right ${px(rail.x + rail.width)}`);
  report(near(note?.caretY, slot.y), "3.9 the caret is level with the hovered slot's centre", `caret ${px(note?.caretY)}, slot ${px(slot.y)}`);
  report((await decks.getAttribute("aria-expanded")) === "true", "L1 the hovered slot says it is expanded");

  // Hovering another slot moves the note there.
  const discover = lockedSlot(page, "Discover");
  await discover.hover();
  const dSlot = await centre(discover);
  note = await openNote(page);
  report(near(note?.caretY, dSlot.y) && (await decks.getAttribute("aria-expanded")) === "false", "3.24 hovering another slot moves the note to it", `caret ${px(note?.caretY)}, slot ${px(dSlot.y)}`);

  // 4. The pointer travels from the slot onto the note, across the 12px gap, and it stays.
  await decks.hover();
  note = await openNote(page);
  await page.mouse.move(note.left + note.width / 2, note.top + 20, { steps: 12 });
  const stillOpen = (await decks.getAttribute("aria-expanded")) === "true" && (await openNote(page)) !== null;
  report(stillOpen, "3.21 the note stays open while the pointer moves from the slot onto it");

  // 5. Escape closes and puts focus on the slot, from a hover and from keyboard focus.
  await page.keyboard.press("Escape");
  const afterEsc = await page.evaluate(() => ({
    focused: document.activeElement?.getAttribute("data-locked-slot"),
    open: Boolean(document.querySelector('[data-lock-note="open"]')),
  }));
  report(afterEsc.focused === "Decks" && !afterEsc.open, "L5 Escape closes the note and returns focus to the slot", JSON.stringify(afterEsc));
  await page.mouse.move(700, 450);
  await page.mouse.click(700, 450);
  await lockedSlot(page, "Commanders").focus();
  report((await lockedSlot(page, "Commanders").getAttribute("aria-expanded")) === "true", "L2 keyboard focus opens the note");
  await page.keyboard.press("Escape");
  report(
    (await page.evaluate(() => document.activeElement?.getAttribute("data-locked-slot"))) === "Commanders" &&
      (await lockedSlot(page, "Commanders").getAttribute("aria-expanded")) === "false",
    "L5 Escape from keyboard focus closes it and stays on the slot",
  );

  // 6. Go to step 1.
  await lockedSlot(page, "Collection").hover();
  await page.getByRole("button", { name: "Go to step 1" }).filter({ visible: true }).click();
  report(await focusedIsUpload(page), "3.19 Go to step 1 focuses Upload a CSV");
  report(!(await openNote(page)), "3.19 and closes the note");
}

async function phone(page) {
  console.log("\n── phone 390x844: first run");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await onPageRole(page, "button", "Upload a CSV").waitFor();

  const bar = page.locator('nav[aria-label="Primary"]:visible').last();
  const barBox = await bar.boundingBox();
  report(barBox?.height === 88, "4.1 the bar is 88px while locked", px(barBox?.height));
  const mainPad = await page.evaluate(() => getComputedStyle(document.querySelector("main")).paddingBottom);
  report(mainPad === "88px", "4.1 <main> reserves the bar's 88px", mainPad);
  report(!(await page.locator("[data-lock-page-line]").isVisible()), "2.9 no page line on the phone");

  // The bracket.
  const b = await page.evaluate(() => {
    const row = document.querySelector("[data-lock-bracket]")?.getBoundingClientRect();
    const box = document.querySelector("[data-lock-bracket-box]")?.getBoundingClientRect();
    const label = document.querySelector("[data-lock-bracket-label]")?.getBoundingClientRect();
    return { row, box, label };
  });
  const s2 = await lockedSlot(page, "Collection").boundingBox();
  const s5 = await lockedSlot(page, "Decks").boundingBox();
  report(near(b.row?.left, s2.x) && near(b.row?.right, s5.x + s5.width), "4.4 the bracket row spans slots 2 to 5", `row ${px(b.row?.left)}-${px(b.row?.right)}, slots ${px(s2.x)}-${px(s5.x + s5.width)}`);
  report(near(b.box?.left, s2.x + 8) && near(b.box?.right, s5.x + s5.width - 8), "4.5 the box is inset 8px within its row", `${px(b.box?.left)}-${px(b.box?.right)}`);
  const labelMidY = b.label ? b.label.top + b.label.height / 2 : null;
  const labelMidX = b.label ? b.label.left + b.label.width / 2 : null;
  const boxMidX = b.box ? b.box.left + b.box.width / 2 : null;
  report(near(labelMidY, b.box?.top) && near(labelMidX, boxMidX), "4.6 the label is centred on the box's top edge", `label ${px(labelMidX)},${px(labelMidY)}; box top ${px(b.box?.top)}, mid ${px(boxMidX)}`);

  // Tap opens the note above the bar, caret on the tapped slot.
  for (const label of ["Decks", "Commanders"]) {
    const slot = lockedSlot(page, label);
    await slot.tap();
    const note = await openNote(page);
    const c = await centre(slot);
    const barTop = (await bar.boundingBox()).y;
    report(near(note?.bottom, barTop - 10), `5.1 ${label}: the note's foot sits 10px above the bar`, `note bottom ${px(note?.bottom)}, bar top ${px(barTop)}`);
    report(near(note?.caretX, c.x), `5.8 ${label}: the caret is on the tapped slot's centre`, `caret ${px(note?.caretX)}, slot ${px(c.x)}`);
    report(near(note?.left, 12, 0.5) && near(note?.right, 390 - 12, 0.5), `5.1 ${label}: the note is inset 12px each side`, `${px(note?.left)}-${px(note?.right)}`);
    // A second tap closes it.
    await slot.tap();
    report(!(await openNote(page)), `5.17 ${label}: a second tap closes it`);
  }

  await lockedSlot(page, "Discover").tap();
  await page.getByRole("button", { name: "Go to step 1" }).filter({ visible: true }).tap();
  report(await focusedIsUpload(page), "5.15 Go to step 1 focuses Upload a CSV");
  report(!(await openNote(page)), "5.17 and closes the note");
}

async function dashboard(page, userId) {
  console.log("\n── desktop 1300x900: decks, no collection");
  await page.setViewportSize({ width: 1300, height: 900 });
  const [cmd] = await sql`select oracle_id from cards where type_line like 'Legendary Creature%' order by oracle_id limit 1`;
  const [deck] = await sql`insert into decks (user_id, name, commander_oracle_id)
    values (${userId}, 'Probe locked nav', ${cmd.oracle_id}) returning id`;
  try {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.locator("aside [data-lock-well]").waitFor();
    report(!(await onPageRole(page, "button", "Upload a CSV").count()), "L7 the dashboard draws no checklist");
    report(!(await page.locator("[data-lock-page-line]").count()), "2.10 no page line on the dashboard");
    await lockedSlot(page, "Decks").hover();
    await page.getByRole("button", { name: "Go to step 1" }).filter({ visible: true }).click();
    await page.waitForURL(/\/collection\/replace/, { timeout: 30_000 }).catch(() => {});
    report(new URL(page.url()).pathname === "/collection/replace", "L7 Go to step 1 routes to /collection/replace", page.url());
  } finally {
    await sql`delete from decks where id = ${deck.id}`;
  }
}

async function main() {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`probe:locked-nav refuses branch ${branch ?? "(unknown)"}; point DATABASE_URL at local-dev or a scratch branch.`);
  }
  await clerkSetup();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 }, hasTouch: true });
  const page = await context.newPage();
  let userId;
  try {
    userId = await signIn(page);
    await cleanup(userId);
    const [{ decks }] = await sql`select count(*)::int as decks from decks where user_id = ${userId}`;
    if (decks) throw new Error(`the probe account holds ${decks} deck(s); first run needs none`);
    await clearAboutSheet(page, userId);
    await desktop(page);
    await phone(page);
    await dashboard(page, userId);
  } finally {
    await cleanup(userId);
    await browser.close();
  }
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exitCode = failures ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
