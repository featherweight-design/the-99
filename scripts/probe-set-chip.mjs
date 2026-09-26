// probe:set-chip — picking a set, a type or an availability state on /collection moves nothing else
// in the filter row.
//
// The desktop Set trigger used to read `Set: The Hobbit` once one set was picked, so it grew by the
// set's name. The row is anchored at its right edge, so the growth went LEFT: the colour pips and
// Type moved 131px on a pick of `Marvel Super Heroes`, while the control after it stayed put. It counts now (`Set 0`, `Set 1`, `Sets 2`), and a hidden sizer holds it at its widest
// one-digit form, so from nothing chosen up to nine it is one width.
//
// jsdom lays nothing out, so a unit test can say what the label reads and nothing about what moved.
// At 1300x900 this presses the Set trigger, picks a set, closes the panel and reads the left edge
// of every other visible control in the row, on BOTH sides of the trigger; then picks a second set
// and reads them again. Its first version checked only the controls after the trigger, and passed
// the unfixed build. At
// 390x844 the Set control lives in the filter sheet, so the check there is that picking a set
// through the sheet leaves the phone's row where it was, apart from the Filters badge, which
// counts the dimensions on and is reported rather than asserted.
//
// It picks sets through the page, never by writing the URL. Its one write is the About row
// `clearAboutSheet` sets for the account (every entry marked seen), which it leaves set. Point it at
// `local-dev`.
//
//   PROBE_BASE=http://localhost:3018 node scripts/probe-set-chip.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPage, openSheet } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// A `+clerk_test` account signs in by email code and needs no password; any other needs one.
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const TOLERANCE = 0.5;

let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " ok " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
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
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (e) {
        return String(e?.errors?.[0]?.longMessage ?? e);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(failure);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

/**
 * Every visible control on the row the anchor sits in, by accessible name, with its left edge.
 * The row is the anchor's nearest ancestor holding more than one visible button.
 */
const readRow = (anchor) =>
  anchor.evaluate((el) => {
    let row = el.parentElement;
    const visible = (b) => b.getBoundingClientRect().width > 0;
    while (row && [...row.querySelectorAll("button")].filter(visible).length < 3) row = row.parentElement;
    return [...(row?.querySelectorAll("button") ?? [])].filter(visible).map((b) => ({
      name: b.getAttribute("aria-label") ?? b.textContent.trim(),
      left: b.getBoundingClientRect().left,
      width: b.getBoundingClientRect().width,
    }));
  });

/** Pairs two readings of the row by position in it, and returns the controls that moved. */
function moved(before, after, skip) {
  const out = [];
  if (before.length !== after.length) return [`row went from ${before.length} controls to ${after.length}`];
  before.forEach((b, i) => {
    if (skip(b, i)) return;
    const a = after[i];
    if (Math.abs(a.left - b.left) > TOLERANCE) out.push(`${b.name.slice(0, 32)} ${b.left.toFixed(1)} → ${a.left.toFixed(1)}`);
  });
  return out;
}

// Every trigger on the row that counts: Set (#1050), then Type and Availability (Hugh, 2026-09-27).
const COUNTING = [
  { aria: "Filter by set", name: "set", labels: ["Set 0", "Set 1", "Sets 2"] },
  { aria: "Filter by type", name: "type", labels: ["Type 0", "Type 1", "Types 2"] },
  { aria: "Filter by availability", name: "availability", labels: ["Availability 0", "Availability 1", "Availability 2"] },
];

async function desktop(page, t) {
  await page.setViewportSize({ width: 1300, height: 900 });
  await page.goto(`${BASE}/collection?view=grid`, { waitUntil: "networkidle" });
  const trigger = onPage(page, `button[aria-label^="${t.aria}"]:visible`).first();
  // Null rather than a 30s wait when the label is missing, so a build without it reports quickly.
  const label = () => trigger.locator("[data-trigger-label]").textContent({ timeout: 2_000 }).catch(() => null);
  const pick = async (nth) => {
    await trigger.click();
    const options = page.locator('[role="option"][aria-selected="false"]:not([aria-disabled="true"])');
    await options.first().waitFor({ state: "visible", timeout: 5_000 });
    await options.nth(nth).click();
    await page.keyboard.press("Escape");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
  };

  const at0 = await readRow(trigger);
  const own = at0.findIndex((c) => c.name.startsWith(t.aria));
  report(own >= 0 && at0.length > 1, `1300 ${t.name}: the trigger has other controls on its row to measure`, `${at0.length} controls, it at ${own}`);
  report((await label()) === t.labels[0], `1300 ${t.name}: nothing picked reads ${t.labels[0]}`, await label());

  await pick(0);
  const at1 = await readRow(trigger);
  report((await label()) === t.labels[1], `1300 ${t.name}: one picked reads ${t.labels[1]}`, await label());
  const shift1 = moved(at0, at1, (_, i) => i === own);
  report(shift1.length === 0, `1300 ${t.name}: picking one moves nothing else on the row`, shift1.join("; ") || "all still");

  await pick(0);
  const at2 = await readRow(trigger);
  report((await label()) === t.labels[2], `1300 ${t.name}: two picked reads ${t.labels[2]}`, await label());
  const shift2 = moved(at1, at2, (_, i) => i === own);
  report(shift2.length === 0, `1300 ${t.name}: picking a second moves nothing else on the row`, shift2.join("; ") || "all still");
}

async function phone(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/collection?view=grid`, { waitUntil: "networkidle" });
  const filters = onPage(page, 'button[aria-haspopup="dialog"]:visible').first();
  const before = await readRow(filters);

  const sheet = await openSheet(page);
  if (!sheet) {
    report(false, "390: the filter sheet opens");
    return;
  }
  await sheet.locator('button[aria-label^="Filter by set"]').click();
  const sets = onPage(page, '[role="dialog"][aria-label="Filter by set"]');
  await sets.waitFor({ state: "visible", timeout: 5_000 });
  await sets.locator('button[role="switch"][aria-checked="false"]:not([aria-disabled="true"])').first().click();
  await sets.getByRole("button", { name: "Done" }).click();
  await page.keyboard.press("Escape");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);

  const after = await readRow(filters);
  // Paired by NAME here: a pick adds the set's own removable chip to this row, which is the chip
  // row doing its job. The Filters button counts the dimensions on, so it may grow by its badge.
  const byName = new Map(after.map((c) => [c.name, c]));
  const shift = before
    .slice(1)
    .filter((b) => byName.has(b.name) && Math.abs(byName.get(b.name).left - b.left) > TOLERANCE)
    .map((b) => `${b.name.slice(0, 32)} ${b.left.toFixed(1)} → ${byName.get(b.name).left.toFixed(1)}`);
  const kept = before.slice(1).filter((b) => byName.has(b.name)).length;
  report(kept > 0, "390: the phone's row has controls beside Filters to measure", `${kept} kept`);
  const badge = `${before[0]?.width.toFixed(1)} → ${after[0]?.width.toFixed(1)}px`;
  report(shift.length === 0, "390: picking a set moves nothing else in the phone's row", shift.join("; ") || `all still (Filters ${badge})`);
}

await clerkSetup();
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const userId = await signIn(page);
  await clearAboutSheet(page, userId);
  for (const t of COUNTING) await desktop(page, t);
  await phone(page);
} catch (e) {
  failures += 1;
  console.log(`FAIL  run aborted — ${e?.stack ?? e}`);
} finally {
  await browser.close();
}
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
