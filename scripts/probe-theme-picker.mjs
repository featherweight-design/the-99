// Phase 5 gate for the theme system: opens the account menu at both widths and
// reports what the picker actually is.
//
// The failure this exists to catch is a picker that reads correctly in jsdom and
// is unusable in a browser. Two things in particular cannot be seen from a unit
// test: whether a miniature genuinely paints the theme it offers — that depends
// on real cascade resolution of a nested `data-theme`, which jsdom does not do —
// and whether the chips survive the width they are given, which depends on the
// display face the theme actually loaded.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   PROBE_USER_EMAIL=you@example.com node scripts/probe-theme-picker.mjs
import { mkdir } from "node:fs/promises";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

// PROBE_USER_EMAIL is the seeded account: the shell only renders its account
// menu for a signed-in user, and the rail is where the desktop trigger lives.
// Named rather than defaulted, so no address is checked into the repo.
const { PROBE_USER_EMAIL: EMAIL, CLERK_SECRET_KEY: SECRET } = requireEnv([
  "PROBE_USER_EMAIL",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOT_DIR ?? "/tmp/theme-picker-shots";

async function clerkApi(path, init) {
  const response = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Clerk ${path}: ${JSON.stringify(body)}`);
  return body;
}

async function signInTicket() {
  const users = await clerkApi(`/users?email_address=${encodeURIComponent(EMAIL)}`);
  const user = users[0];
  if (!user) throw new Error(`No Clerk user for ${EMAIL} in this instance.`);
  const { token } = await clerkApi("/sign_in_tokens", {
    method: "POST",
    body: JSON.stringify({ user_id: user.id, expires_in_seconds: 3600 }),
  });
  return token;
}

async function signIn(page, ticket) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (ticket) => {
    try {
      const attempt = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, ticket);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

// What each chip is, as painted. The miniature's background is the interesting
// one: six identical values would mean the nested data-theme is not resolving
// and every chip is previewing the theme in force.
function readPicker(page) {
  return page.evaluate(() => {
    const group = document.querySelector('[role="radiogroup"]');
    if (!group) return null;
    const grid = getComputedStyle(group);
    return {
      columns: grid.gridTemplateColumns,
      gap: grid.gap,
      chips: [...group.querySelectorAll('[role="radio"]')].map((chip) => {
        const box = chip.getBoundingClientRect();
        const mini = chip.querySelector("[data-theme]");
        // The theme name, not the miniature's "99": the first span that is
        // neither the miniature nor inside it.
        const label = chip.querySelector(":scope > span:not([data-theme]) > span");
        return {
          name: label?.textContent ?? "",
          checked: chip.getAttribute("aria-checked"),
          width: Math.round(box.width),
          height: Math.round(box.height),
          previews: mini?.getAttribute("data-theme") ?? null,
          miniBackground: mini ? getComputedStyle(mini).backgroundColor : null,
          // A name wider than its box is a name the chip cannot hold.
          labelOverflows: label ? label.scrollWidth > label.clientWidth + 1 : false,
          tick: !!chip.querySelector("[data-selected-tick]"),
        };
      }),
    };
  });
}

await clerkSetup();
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch();
const findings = [];

for (const viewport of [
  { label: "390", width: 390, height: 844, trigger: "header" },
  { label: "desktop", width: 1300, height: 900, trigger: "rail" },
]) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  await signIn(page, await signInTicket());
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  // Both call sites are breakpoint-gated, so exactly one trigger is visible.
  // Dispatched rather than clicked: the dev overlay's portal covers the rail
  // foot, and a real click there lands on the overlay however long it waits.
  // Both triggers are in the DOM at every width — the rail's and the mobile
  // header's — and CSS hides one of them. Dispatched rather than clicked: the
  // dev overlay's portal covers the rail foot, and a real click there lands on
  // the overlay however long Playwright waits for it to move.
  await page
    .getByRole("button", { name: /account/i })
    .filter({ visible: true })
    .first()
    .evaluate((el) => el.click());
  await page.waitForSelector('[role="radiogroup"]');
  // The sheet slides up and the popover fades in; measuring before either
  // settles reports a panel that is still halfway off the screen.
  await page.waitForTimeout(500);

  const picker = readPicker(page);
  const state = await picker;
  console.log(`\n=== ${viewport.label} (${viewport.trigger}) ===`);
  console.log(`grid: ${state.columns} gap ${state.gap}`);
  for (const chip of state.chips) {
    console.log(
      `  ${chip.width}×${chip.height} ${chip.previews} bg=${chip.miniBackground}` +
        `${chip.checked === "true" ? " CHECKED" : ""}${chip.tick ? " tick" : ""}` +
        `${chip.labelOverflows ? "  <-- LABEL OVERFLOWS" : ""}  ${chip.name}`,
    );
  }

  const backgrounds = new Set(state.chips.map((c) => c.miniBackground));
  if (backgrounds.size !== state.chips.length) {
    findings.push(
      `${viewport.label}: ${state.chips.length} miniatures paint only ${backgrounds.size} distinct backgrounds — a nested data-theme is not resolving.`,
    );
  }
  for (const chip of state.chips.filter((c) => c.labelOverflows)) {
    findings.push(`${viewport.label}: "${chip.name}" does not fit its ${chip.width}px chip.`);
  }
  if (viewport.label === "390") {
    for (const chip of state.chips.filter((c) => c.height < 44)) {
      findings.push(`390: "${chip.name}" is ${chip.height}px tall, under the 44px minimum.`);
    }
  }
  // The picker made the panel taller. A sheet is anchored to the bottom edge, so
  // a panel that outgrows the viewport loses its top — which is the identity
  // header — rather than scrolling.
  const panel = await page.evaluate(() => {
    const el = document.querySelector('[role="dialog"], [role="radiogroup"]')?.closest("div[class]");
    const host = el?.closest('[role="dialog"]') ?? el?.parentElement;
    const box = host?.getBoundingClientRect();
    return box ? { top: Math.round(box.top), bottom: Math.round(box.bottom) } : null;
  });
  if (panel && panel.top < 0) {
    findings.push(`${viewport.label}: the panel starts ${-panel.top}px above the viewport.`);
  }

  const checked = state.chips.filter((c) => c.checked === "true");
  if (checked.length !== 1) findings.push(`${viewport.label}: ${checked.length} chips checked.`);
  if (checked.length === 1 && !checked[0].tick) {
    findings.push(`${viewport.label}: the checked chip draws no tick — selection is colour alone.`);
  }

  await page.screenshot({ path: `${SHOTS}/picker-${viewport.label}.png` });

  // Arrow keys have to select, not only move: there is no Save.
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.locator('[role="radio"][aria-checked="true"]').focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    cookie: document.cookie.includes("the99_theme"),
    announced: document.querySelector('[role="status"]')?.textContent ?? "",
  }));
  console.log(`  arrow: ${before} -> ${after.theme}, cookie ${after.cookie}, "${after.announced}"`);
  if (after.theme === before) findings.push(`${viewport.label}: an arrow key moved but did not select.`);
  if (!after.cookie) findings.push(`${viewport.label}: selection wrote no cookie.`);
  if (!after.announced.trim()) findings.push(`${viewport.label}: selection announced nothing.`);

  await page.screenshot({ path: `${SHOTS}/picker-${viewport.label}-after-arrow.png` });
  await context.close();
}

await browser.close();

console.log("");
if (findings.length === 0) {
  console.log("Picker holds at both widths.");
} else {
  console.log(`${findings.length} finding(s):`);
  for (const f of findings) console.log("  " + f);
}
