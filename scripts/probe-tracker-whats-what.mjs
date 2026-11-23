// Drives the What's what guide (addendum What's what) on the real tracker: for every layout the fixture table offers, at
// phone 390x844, desktop 1300x900 and iPad 1180x820 and 820x1180, it starts a game on a fresh device and asserts that the
// guide opens by itself once the first-player roll is done, labels every control drawn with no label over another label,
// the header or a control, holds the board inert, closes by Esc, the close button and a tap anywhere without a life
// change behind it, is spent for the device (a key outside the `the99.tracker.` prefix the game sweep owns), is not shown
// again on reload, and that the Menu's first row opens it and returns focus to the Menu.
// It only reads and taps: the game lives on the device (localStorage), so it writes nothing to the database. The audit
// account must sit at the table (`scripts/seed-rule-zero-fixture.mts`'s S4, seeded on a scratch branch the dev server points at).
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-tracker-whats-what.mjs
// Optional: SETUP_TABLE (default the fixture's S4).
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("This probe runs against a local dev server only.");
const TABLE = process.env.SETUP_TABLE ?? "7a0e0000-0000-4000-8000-000000000013";
const VIEWPORTS = [
  { label: "phone 390x844", viewport: { width: 390, height: 844 }, touch: true },
  { label: "desktop 1300x900", viewport: { width: 1300, height: 900 }, touch: false },
  { label: "iPad 1180x820", viewport: { width: 1180, height: 820 }, touch: true },
  { label: "iPad 820x1180", viewport: { width: 820, height: 1180 }, touch: true },
];
const FLAG = "the99.trackerGuide.seen";

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
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
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

// Segment geometry: does a leader pass through a label box (other than the one it starts from), or cross another leader?
const ccw = (a, b, c) => (c.y - a.y) * (b.x - a.x) - (b.y - a.y) * (c.x - a.x);
const cross = (p, q) => {
  const a = { x: p.x1, y: p.y1 }, b = { x: p.x2, y: p.y2 }, c = { x: q.x1, y: q.y1 }, d = { x: q.x2, y: q.y2 };
  return ccw(a, b, c) * ccw(a, b, d) < 0 && ccw(c, d, a) * ccw(c, d, b) < 0;
};
const through = (s, r) => {
  const pad = 1;
  for (let t = 0.03; t < 0.97; t += 0.01) {
    const x = s.x1 + (s.x2 - s.x1) * t, y = s.y1 + (s.y2 - s.y1) * t;
    if (x > r.x + pad && x < r.x + r.w - pad && y > r.y + pad && y < r.y + r.h - pad) return true;
  }
  return false;
};

const overlap = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

// Every label, the header and every drawn control, as boxes, read from the page.
const read = (page) =>
  page.evaluate(() => {
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    };
    const guide = document.querySelector("[data-testid=whats-what]");
    if (!guide) return null;
    const labels = {};
    for (const el of guide.querySelectorAll("[data-ww]")) {
      if (getComputedStyle(el).visibility === "hidden") continue;
      labels[el.getAttribute("data-ww")] = box(el);
    }
    const canvas = document.querySelector("[data-testid=tracker-spine]")?.parentElement;
    const live = (el) => !el.closest("[data-testid=panel-front]")?.hasAttribute("inert");
    const controls = [];
    for (const sel of ["strip-round", "strip-monarch", "strip-initiative", "strip-day", "strip-dice", "strip-undo", "strip-menu"]) {
      const el = canvas?.querySelector(`[data-testid=${sel}]`);
      if (el) controls.push({ id: sel, ...box(el) });
    }
    // The labelled panel: the foot pane, else the first. Life is the glyph inside each half, as the guide cuts it out.
    const panelEl = canvas?.querySelector('[data-testid="tracker-panel"][data-pane="foot"]') ?? canvas?.querySelector('[data-testid="tracker-panel"]');
    for (const sel of ["half-minus", "half-plus"]) {
      const el = panelEl?.querySelector(`[data-testid=${sel}] > span:last-child`);
      if (el) controls.push({ id: sel, ...box(el) });
    }
    for (const sel of ["panel-sheet", "panel-badges"]) {
      const el = panelEl?.querySelector(`[data-testid=${sel}]`);
      if (el) controls.push({ id: sel, ...box(el) });
    }
    for (const el of canvas?.querySelectorAll("[data-testid=end-turn]") ?? []) if (live(el)) controls.push({ id: "end-turn", ...box(el) });
    return { labels, controls, canvas: canvas ? box(canvas) : null, inert: canvas?.hasAttribute("inert") ?? false, header: box(guide.querySelector("[data-testid=whats-what-header]")), leaders: guide.querySelectorAll("svg line").length, segs: [...guide.querySelectorAll("svg line")].map((l) => ({ x1: +l.getAttribute("x1"), y1: +l.getAttribute("y1"), x2: +l.getAttribute("x2"), y2: +l.getAttribute("y2") })), svg: (() => { const r = guide.querySelector("svg")?.getBoundingClientRect(); return r ? { x: r.left, y: r.top } : { x: 0, y: 0 }; })() };
  });

async function startGame(page, layoutIndex) {
  await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "networkidle", timeout: 180_000 });
  const radios = page.getByRole("radio");
  await radios.first().waitFor({ timeout: 60_000 }).catch(async () => {
    throw new Error(`no layout choice (signed in as ${await page.evaluate(() => window.Clerk?.user?.id)}) at ${page.url()}: ${((await page.locator("body").innerText().catch(() => "")) || "").slice(0, 300)}`);
  });
  const count = await radios.count();
  if (layoutIndex >= count) return { count, name: null };
  const name = await radios.nth(layoutIndex).getAttribute("aria-label");
  await radios.nth(layoutIndex).evaluate((el) => el.click());
  await page.getByRole("button", { name: "Start", exact: true }).evaluate((el) => el.click());
  await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
  await page.evaluate(() => {
    document.querySelectorAll("[data-seat-notice-stack], nextjs-portal").forEach((n) => n.remove());
    document.querySelector("[data-testid=first-roll] > button")?.click();
  });
  return { count, name };
}

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const { label, viewport, touch } of VIEWPORTS) {
    console.log(`\n## ${label}`);
    for (let i = 0; ; i++) {
      const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch && viewport.width < 768 });
      const page = await context.newPage();
      await signIn(page);
      const { count, name } = await startGame(page, i);
      if (name === null) {
        await context.close();
        break;
      }
      const at = `${label} / ${name} (${i + 1} of ${count})`;
      // It opens by itself after the roll, within 600 ms plus the roll's own exit and a render.
      const opened = await page.getByTestId("whats-what").waitFor({ timeout: 6_000 }).then(() => true, () => false);
      if (!report(`${at}: opens by itself after Start`, opened)) {
        await context.close();
        continue;
      }
      await page.waitForTimeout(450);
      const g = await read(page);
      report(`${at}: the board is inert while it shows`, g.inert);
      const ids = Object.keys(g.labels);
      for (const must of ["round", "dice", "undo", "menu", "life", "header"]) report(`${at}: label "${must}" is placed`, ids.includes(must));
      report(`${at}: every control drawn has its label or the Life/End turn pair`, g.leaders >= ids.filter((k) => k !== "header").length, `${g.leaders} leaders, ${ids.length - 1} labels`);
      const boxes = Object.entries(g.labels);
      const clashes = [];
      for (let a = 0; a < boxes.length; a++) {
        for (let b = a + 1; b < boxes.length; b++) if (overlap(boxes[a][1], boxes[b][1])) clashes.push(`${boxes[a][0]}/${boxes[b][0]}`);
        for (const c of g.controls) if (overlap(boxes[a][1], c)) clashes.push(`${boxes[a][0]} over ${c.id}`);
        const b = boxes[a][1];
        if (b.x < g.canvas.x - 0.5 || b.y < g.canvas.y - 0.5 || b.x + b.w > g.canvas.x + g.canvas.w + 0.5 || b.y + b.h > g.canvas.y + g.canvas.h + 0.5) clashes.push(`${boxes[a][0]} outside the canvas`);
      }
      report(`${at}: no label over another label, a control, or off the canvas`, clashes.length === 0, clashes.join(", "));
      // Every line traces to one control: no leader runs through a label (its own included past its edge) and none crosses another.
      const segs = g.segs.map((q) => ({ x1: q.x1 + g.svg.x, y1: q.y1 + g.svg.y, x2: q.x2 + g.svg.x, y2: q.y2 + g.svg.y }));
      const bad = [];
      segs.forEach((sg, a) => {
        for (const [id, r] of [...boxes, ["header", g.header]]) if (through(sg, r)) bad.push(`leader ${a} through ${id}`);
        for (let b = a + 1; b < segs.length; b++) if (cross(sg, segs[b])) bad.push(`leader ${a} x ${b}`);
      });
      report(`${at}: no leader runs through a label or crosses another leader`, bad.length === 0, bad.slice(0, 6).join(", "));
      const flag = await page.evaluate((f) => ({ set: window.localStorage.getItem(f), prefixed: Object.keys(window.localStorage).filter((k) => k.startsWith("the99.tracker.") && k.includes("Guide")) }), FLAG);
      report(`${at}: the device flag is set, outside the the99.tracker. prefix`, flag.set !== null && flag.prefixed.length === 0);
      if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${label.replace(/[^a-z0-9]+/gi, "-")}-${name.replace(/[^a-z0-9]+/gi, "-")}.png` });

      // A tap on the board closes the guide and reaches nothing behind it.
      const life = () => page.getByTestId("life-number").first().evaluate((el) => Number(el.firstElementChild.textContent));
      const before = await life();
      const half = g.controls.find((c) => c.id === "half-plus");
      await page.mouse.click(half.x + half.w / 2, half.y + half.h / 2);
      await page.getByTestId("whats-what").waitFor({ state: "detached", timeout: 3_000 }).catch(() => {});
      report(`${at}: a tap anywhere closes it`, (await page.getByTestId("whats-what").count()) === 0);
      await page.waitForTimeout(2600);
      report(`${at}: the tap that closed it changed no life`, (await life()) === before, `${before} -> ${await life()}`);

      if (i === 0) {
        // Reload: the game resumes, and the guide stays spent.
        await page.reload({ waitUntil: "networkidle" });
        await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(1500);
        report(`${at}: not shown again on resume`, (await page.getByTestId("whats-what").count()) === 0);

        // The Menu's first row opens it; Esc closes it and focus returns to the Menu.
        await page.getByTestId("strip-menu").evaluate((el) => el.click());
        const row = page.getByRole("menuitem").first();
        await row.waitFor({ timeout: 3_000 });
        report(`${at}: the Menu's first row is What’s what`, ((await row.textContent()) ?? "").startsWith("What’s what"));
        report(`${at}: the row takes the Menu's open focus`, await row.evaluate((el) => el === document.activeElement));
        await row.evaluate((el) => el.click());
        await page.getByTestId("whats-what").waitFor({ timeout: 3_000 });
        report(`${at}: pressing the row closes the Menu`, (await page.getByTestId("strip-menu-pop").count()) === 0);
        await page.waitForTimeout(300);
        report(
          `${at}: focus is on the close button`,
          await page.getByTestId("whats-what-close").evaluate((el) => el === document.activeElement),
          await page.evaluate(() => `${document.activeElement?.tagName} ${document.activeElement?.getAttribute("data-testid")}`),
        );
        await page.keyboard.press("Escape");
        await page.getByTestId("whats-what").waitFor({ state: "detached", timeout: 3_000 }).catch(() => {});
        report(`${at}: Esc closes it`, (await page.getByTestId("whats-what").count()) === 0);
        report(`${at}: focus returns to the Menu button`, await page.getByTestId("strip-menu").evaluate((el) => el === document.activeElement));
        // The close button.
        await page.getByTestId("strip-menu").evaluate((el) => el.click());
        await page.getByRole("menuitem").first().evaluate((el) => el.click());
        await page.getByTestId("whats-what").waitFor({ timeout: 3_000 });
        const closeBox = await page.getByTestId("whats-what-close").boundingBox();
        report(`${at}: the close button is at least 44px`, closeBox.width >= 44 && closeBox.height >= 44, `${closeBox.width}x${closeBox.height}`);
        await page.getByTestId("whats-what-close").evaluate((el) => el.click());
        await page.getByTestId("whats-what").waitFor({ state: "detached", timeout: 3_000 }).catch(() => {});
        report(`${at}: the close button closes it`, (await page.getByTestId("whats-what").count()) === 0);
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exitCode = failures ? 1 : 0;
