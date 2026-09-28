// probe:issues-sheet — the Import issues inspector on a phone, as a bottom sheet, and the
// desktop modal it leaves alone. First-run onboarding handoff D8 + READINESS corrections 2 and 4.
//
// At 390x844, every ruling below is a fact about laid-out geometry or a pointer, which jsdom
// has neither of:
//   - it is a BOTTOM SHEET: the panel's bottom is the viewport's, its top corners are 22px and
//     its ground resolves to --surface-inset, at most 86vh tall;
//   - its height is HELD: switching tabs and typing a filter that matches nothing leave the
//     panel's height unchanged to the pixel (a 110-row tab and a 3-row tab differ by ~500px,
//     so an unheld sheet cannot pass by accident);
//   - the list is the one scroll body: a wheel over it scrolls it and the panel stays put;
//   - only the handle and the title block drag it: a drag started on the TABS moves nothing,
//     and 100px on the title dismisses it;
//   - Escape dismisses it;
//   - the no-match title is 17px in the display face (correction 4).
// At 1300x900 the modal is 660x640 as before and that title is 19px.
//
// FIXTURE. The issues come from a first-run upload, so this signs in as the DEDICATED empty
// account on Clerk's DEVELOPMENT instance (`onboard-probe+clerk_test@the99.app`, override with
// PROBE_EMAIL), as probe:onboarding does, and uploads the same staging-shaped CSV: ~3,100 real
// catalog names, 110 names no card carries and 3 malformed rows. Every run deletes the
// account's `csv_uploads` and `collection_items` in a `finally`, which returns it to first run.
// Point it at `local-dev`, NEVER production; staging and production are refused by branch id.
//
//   PROBE_BASE=http://localhost:3314 pnpm probe:issues-sheet
//   PROBE_SHOTS=<dir> also photographs each state at each width.
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { DATABASE_URL } = requireEnv(["DATABASE_URL", "CLERK_SECRET_KEY"]);
const EMAIL = process.env.PROBE_EMAIL ?? "onboard-probe+clerk_test@the99.app";
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const sql = neon(DATABASE_URL);
// `cleanup` deletes the signed-in account's whole collection and every upload it made, so the
// target is checked, and refused when it cannot be read, before any write.
const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

const VIEWPORTS = [
  { label: "phone 390x844", width: 390, height: 844, phone: true },
  { label: "desktop 1300x900", width: 1300, height: 900, phone: false },
];

const SHOTS = process.env.PROBE_SHOTS;
async function shot(page, vp, name) {
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `issues-${vp.phone ? "390" : "1300"}-${name}.png`) });
}

// Counted HERE, not at each call site: a check that forgot to count printed FAIL and then
// "All checks passed" over it once already (probe:commander-availability).
let failures = 0;
function report(ok, name, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " PASS " : " FAIL "} ${name}${detail ? `  (${detail})` : ""}`);
}

const NO_MATCH = "zzqx no card is called this";

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

// `unmatched` names no card carries, and `bad` malformed rows (a quantity that is not a number).
function csvFixture(names, { unmatched, bad, tag }) {
  const quote = (s) => `"${s.replaceAll('"', '""')}"`;
  const lines = ["Name,Quantity"];
  for (const name of names) lines.push(`${quote(name)},1`);
  for (let i = 0; i < unmatched; i += 1) lines.push(`${quote(`Probe Nonexistent Card ${i}`)},1`);
  for (let i = 0; i < bad; i += 1) lines.push(`${quote(names[i])},x`);
  const file = join(tmpdir(), `probe-issues-sheet-${tag}-${process.pid}.csv`);
  writeFileSync(file, lines.join("\n"));
  return file;
}

async function cleanup(userId) {
  if (!userId) return;
  await sql`delete from collection_items where user_id = ${userId}`;
  await sql`delete from csv_uploads where user_id = ${userId}`;
}

/** The dialog's box and the facts the phone rulings read, off the live panel. */
async function panelFacts(dialog) {
  return dialog.evaluate((el) => {
    const cs = getComputedStyle(el);
    const probe = document.createElement("div");
    probe.style.background = "var(--surface-inset)";
    el.parentElement.appendChild(probe);
    const inset = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const r = el.getBoundingClientRect();
    return {
      top: r.top,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
      radiusLeft: cs.borderTopLeftRadius,
      radiusRight: cs.borderTopRightRadius,
      bg: cs.backgroundColor,
      inset,
      viewport: window.innerHeight,
    };
  });
}

/** A mouse drag from an element's centre, straight down, with a reading taken mid-gesture. */
async function dragDown(page, locator, distance, dialog) {
  const box = await locator.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + distance / 2, { steps: 5 });
  await page.mouse.move(x, y + distance, { steps: 5 });
  const mid = (await dialog.count()) ? (await dialog.boundingBox())?.y ?? null : null;
  await page.mouse.up();
  return mid;
}

async function titleFacts(dialog) {
  return dialog.evaluate((el) => {
    const title = [...el.querySelectorAll("p")].find((p) => p.textContent?.startsWith("No names match"));
    const heading = el.querySelector("h2");
    if (!title || !heading) return null;
    const t = getComputedStyle(title);
    return {
      size: t.fontSize,
      family: t.fontFamily,
      displayFamily: getComputedStyle(heading).fontFamily,
      bodyFamily: getComputedStyle(document.body).fontFamily,
    };
  });
}

async function openInspector(page) {
  await onPageRole(page, "button", /^View [\d,]+ issues?$/).click();
  // Scoped to the page: the shell's account sheet is also a dialog, and comes first.
  const dialog = onPageRole(page, "dialog", "Import issues");
  await dialog.waitFor();
  // Let the held height land and any entrance settle before reading a box.
  await page.waitForTimeout(250);
  return dialog;
}

async function upload(page, csvPath) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await onPageRole(page, "button", "Upload a CSV").waitFor();
  await onPage(page, "input[aria-label='Upload collection CSV']").setInputFiles(csvPath);
  await onPage(page, "text=/^Unmatched(:| names:)/").locator("visible=true").first().waitFor({ timeout: 60_000 });
}

/** The listed tab's list box against its content, to read whether the sheet was sized to it. */
async function listFit(dialog) {
  return dialog.locator("[data-issue-list]").first().evaluate((el) => ({
    box: el.clientHeight,
    content: el.scrollHeight,
  }));
}

// 3a: two SHORT tabs, the opening one the shorter. The held height has to come from the tab
// that is NOT on screen when the sheet opens, which is the half of the measurement no long
// list can see (a long list holds at the cap without measuring).
async function walkShort(browser, vp, csvPath) {
  console.log(`\n── ${vp.label}, short lists (3a)`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const userId = await signIn(page);
  try {
    await cleanup(userId);
    await clearAboutSheet(page, userId);
    await upload(page, csvPath);
    const dialog = await openInspector(page);
    const open = await panelFacts(dialog);
    await shot(page, vp, "short-open");
    const cap = 0.86 * open.viewport;
    report(open.height < cap - 50, "a short pair of tabs is held under the 86vh cap", `${open.height}px against ${cap}px`);
    const first = await listFit(dialog);
    await dialog.getByRole("tab", { name: /Parse errors/ }).click();
    await page.waitForTimeout(150);
    const tabbed = await panelFacts(dialog);
    const second = await listFit(dialog);
    await shot(page, vp, "short-parse-errors");
    report(tabbed.height === open.height, "switching to the longer tab leaves the height unchanged", `${open.height}px → ${tabbed.height}px`);
    report(
      second.content <= second.box + 1 && second.box - second.content <= 2,
      "the height is the longer tab's: its list fits whole, with no slack",
      `list box ${second.box}px, content ${second.content}px (opening tab: ${first.content}px of ${first.box}px)`,
    );
    await page.keyboard.press("Escape");
  } finally {
    await cleanup(userId);
    await context.close();
  }
}

async function walk(browser, vp, csvPath) {
  console.log(`\n── ${vp.label}`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const userId = await signIn(page);
  try {
    await cleanup(userId);
    await clearAboutSheet(page, userId);
    await upload(page, csvPath);

    let dialog = await openInspector(page);
    const filter = () => dialog.getByRole("textbox").first();

    if (!vp.phone) {
      const box = await panelFacts(dialog);
      await shot(page, vp, "open");
      report(box.width === 660 && box.height === 640, "the desktop modal is 660x640, unchanged", `${box.width}x${box.height}`);
      await filter().fill(NO_MATCH);
      await dialog.getByText(/^No names match/).waitFor();
      await shot(page, vp, "no-match");
      const t = await titleFacts(dialog);
      report(t?.size === "19px", "the no-match title is 19px on desktop", t?.size);
      report(
        t && t.family === t.displayFamily && t.family !== t.bodyFamily,
        "the no-match title is in the display face",
        t?.family,
      );
      const after = await panelFacts(dialog);
      report(after.height === 640, "the modal still reads 640px under a no-match filter", `${after.height}px`);
      await page.keyboard.press("Escape");
      return;
    }

    // ── A bottom sheet in the filter sheet's vocabulary
    const open = await panelFacts(dialog);
    await shot(page, vp, "open");
    report(Math.abs(open.bottom - open.viewport) <= 0.5, "the panel's bottom is the viewport's", `bottom ${open.bottom}px of ${open.viewport}px`);
    report(open.radiusLeft === "22px" && open.radiusRight === "22px", "its top corners are 22px", `${open.radiusLeft} / ${open.radiusRight}`);
    report(open.bg === open.inset, "its ground resolves to --surface-inset", `${open.bg} vs ${open.inset}`);
    report(open.height <= 0.86 * open.viewport + 0.5, "it is at most 86vh tall", `${open.height}px against ${0.86 * open.viewport}px`);
    const held = open.height;

    // ── The list is the one scroll body
    const list = dialog.locator("[data-issue-list]").first();
    const listBox = await list.boundingBox();
    await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + listBox.height / 2);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(300);
    // The scroller is the <ul> on a plain list and react-window's outer box on a virtualised one.
    const scrolled = await list.evaluate((el) => {
      const scroller = [el, ...el.querySelectorAll("*")].find((n) => /auto|scroll/.test(getComputedStyle(n).overflowY));
      return scroller ? scroller.scrollTop : -1;
    });
    const afterWheel = await panelFacts(dialog);
    report(scrolled > 0, "a wheel over the list scrolls the list", `scrollTop ${scrolled}px`);
    report(afterWheel.top === open.top && afterWheel.height === held, "and the panel stays put", `top ${open.top} → ${afterWheel.top}, height ${held} → ${afterWheel.height}`);

    // ── Held through a tab switch and a no-match filter
    await dialog.getByRole("tab", { name: /Parse errors/ }).click();
    await page.waitForTimeout(150);
    const tabbed = await panelFacts(dialog);
    await shot(page, vp, "parse-errors");
    report(tabbed.height === held, "switching tabs leaves the height unchanged", `${held}px → ${tabbed.height}px`);
    await filter().fill(NO_MATCH);
    await dialog.getByText(/^No names match/).waitFor();
    await page.waitForTimeout(150);
    const filtered = await panelFacts(dialog);
    await shot(page, vp, "no-match");
    report(filtered.height === held, "a filter matching nothing leaves the height unchanged", `${held}px → ${filtered.height}px`);
    const t = await titleFacts(dialog);
    report(t?.size === "17px", "the no-match title is 17px on the phone", t?.size);
    report(
      t && t.family === t.displayFamily && t.family !== t.bodyFamily,
      "the no-match title is in the display face",
      t?.family,
    );

    // ── Only the handle and the title block drag it
    // Measured from where the panel is NOW, so this reads the gesture and not the held height
    // (which the checks above own).
    const tabs = dialog.getByRole("tablist");
    const beforeTabDrag = (await panelFacts(dialog)).top;
    const tabMid = await dragDown(page, tabs, 150, dialog);
    const afterTabDrag = await panelFacts(dialog);
    report(
      tabMid === beforeTabDrag && afterTabDrag.top === beforeTabDrag,
      "a drag started on the tabs does not move the panel",
      `top ${beforeTabDrag}px, mid-drag ${tabMid}px, after ${afterTabDrag.top}px`,
    );
    const titleMid = await dragDown(page, dialog.getByRole("heading", { name: "Import issues" }), 100, dialog);
    await page.waitForTimeout(200);
    const gone = (await dialog.count()) === 0;
    report(
      titleMid !== null && titleMid > beforeTabDrag + 50 && gone,
      "a 100px drag on the title block follows the pointer and dismisses",
      `mid-drag top ${titleMid}px from ${beforeTabDrag}px, ${gone ? "closed" : "still open"}`,
    );

    // ── Escape
    if (!gone) await page.keyboard.press("Escape");
    dialog = await openInspector(page);
    const reopened = await panelFacts(dialog);
    report(reopened.height === held, "reopened, it measures the same held height", `${held}px → ${reopened.height}px`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    report((await dialog.count()) === 0, "Escape dismisses it");
  } finally {
    await cleanup(userId);
    await context.close();
  }
}

async function main() {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`probe:issues-sheet refuses branch ${branch ?? "(unknown)"}; point DATABASE_URL at local-dev or a scratch branch.`);
  }
  const names = (await sql`select name from cards where name not like '%//%' order by name limit 3100`).map((r) => r.name);
  if (names.length < 3000) throw new Error(`catalog too small for a staging-shaped CSV: ${names.length} names`);
  // Long: past the 150-row virtualisation threshold, as staging's worst uploads are.
  const csvPath = csvFixture(names, { unmatched: 170, bad: 3, tag: "long" });
  // Short: 2 unmatched (the opening tab) against 6 parse errors, which together fit under 86vh.
  const shortPath = csvFixture(names.slice(0, 200), { unmatched: 2, bad: 6, tag: "short" });
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) await walk(browser, vp, csvPath);
    await walkShort(browser, VIEWPORTS[0], shortPath);
  } finally {
    await browser.close();
  }
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exitCode = failures ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
