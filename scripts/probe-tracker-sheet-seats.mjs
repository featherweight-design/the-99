// Opens and closes the life tracker's player sheet from every seat of a four-seat game at phone width (and at tablet
// widths) and measures what a player at that seat sees, with getBoundingClientRect:
//   - while it rises, and once it has risen, the sheet faces the same way as the seat's panel (the same rotation);
//   - the sheet lies inside the viewport, and its close × is inside the viewport and is what a press there hits;
//   - after the × closes it, the tracker is back where it started: its rect, and every scroll offset above it, unchanged;
//   - before any sheet opens, every point of each seat's panel takes a press on that seat (no other seat's box over it).
// It only reads and taps: Start and every change live on the device (localStorage), so it writes nothing to the
// database. The audit account must sit at the table (`scripts/seed-rule-zero-fixture.mts`'s S4); production and
// staging are refused.
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-tracker-sheet-seats.mjs
// Optional: SETUP_TABLE (default the fixture's S4), SHOTS=<dir> to keep a photograph of each seat's open sheet.
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL", "CLERK_SECRET_KEY"]);
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("This probe runs against a local dev server only.");
const TABLE = process.env.SETUP_TABLE ?? "7a0e0000-0000-4000-8000-000000000013";
const SHOTS = process.env.SHOTS;
const WIDTHS = [
  { label: "phone 390x844", viewport: { width: 390, height: 844 } },
  { label: "tablet 1024x768", viewport: { width: 1024, height: 768 } },
  { label: "tablet 820x1180", viewport: { width: 820, height: 1180 } },
];

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

// Where the tracker sits, and every scroll offset from it up to the document: what "back where it started" compares.
const placement = (page) =>
  page.getByTestId("tracker-play").evaluate((el) => {
    const r = el.getBoundingClientRect();
    const scrolls = [];
    for (let n = el; n; n = n.parentElement) if (n.scrollTop || n.scrollLeft) scrolls.push(`${n.tagName.toLowerCase()}${n.dataset.testid ? `[${n.dataset.testid}]` : ""}:${n.scrollLeft},${n.scrollTop}`);
    const doc = document.scrollingElement;
    return { rect: [r.x, r.y, r.width, r.height].map(Math.round).join(","), scrolls: scrolls.join(" "), doc: `${doc.scrollLeft},${doc.scrollTop}` };
  });

// The rotation an element is drawn at, summed over itself and its ancestors, in degrees (0, 90, 180, -90).
const turnOf = (loc) =>
  loc.evaluate((el) => {
    let deg = 0;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const t = getComputedStyle(n).transform;
      if (t && t !== "none") {
        const m = new DOMMatrix(t);
        deg += Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI);
      }
    }
    return ((((deg + 180) % 360) + 360) % 360) - 180;
  });

const [{ branch } = {}] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
assertNotSharedBranch(branch, "probe:tracker-sheet-seats");

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const { label, viewport } of WIDTHS) {
    console.log(`\n## ${label}`);
    const context = await browser.newContext({ viewport, hasTouch: true });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "networkidle", timeout: 180_000 });
    const start = page.getByRole("button", { name: "Start", exact: true });
    await start.waitFor({ timeout: 60_000 }).catch(async () => {
      throw new Error(`no Start button at ${page.url()}: ${((await page.locator("main").innerText().catch(() => "")) || "").slice(0, 300)}`);
    });
    await start.evaluate((el) => el.click());
    await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
    // Clear what is not the table: the seat notices, Next's dev badge, and a Random start's first-roll overlay (a tap clears it).
    await page.evaluate(() => {
      document.querySelectorAll("[data-seat-notice-stack], nextjs-portal").forEach((n) => n.remove());
      document.querySelector("[data-testid=first-roll] > button")?.click();
    });
    await page.getByTestId("first-roll").waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(400);

    const openers = page.getByTestId("panel-sheet");
    const seats = await openers.count();
    report("four seats drawn", seats === 4, `${seats}`);
    // Every point of a seat's panel takes a press on that seat: no other seat's box is drawn over it (End turn on seat 2
    // once landed on seat 3's unturned box). A grid of points across each panel, hit-tested.
    const strays = await page.evaluate(() =>
      [...document.querySelectorAll("[data-testid=tracker-panel]")].flatMap((panel) => {
        const r = panel.getBoundingClientRect();
        const box = panel.parentElement;
        const out = [];
        for (const fx of [0.08, 0.3, 0.5, 0.7, 0.92]) for (const fy of [0.08, 0.3, 0.5, 0.7, 0.92]) {
          const hit = document.elementFromPoint(r.x + r.width * fx, r.y + r.height * fy);
          if (hit && !box.contains(hit) && hit.closest("[data-testid=tracker-spine]") === null) {
            const other = hit.closest("[data-seat]")?.dataset.seat ?? hit.querySelector?.("[data-seat]")?.dataset.seat ?? hit.tagName.toLowerCase();
            out.push(`seat ${panel.dataset.seat} at ${fx},${fy} hits ${other}`);
          }
        }
        return out;
      }),
    );
    report("every point of each seat's panel takes the press on that seat", strays.length === 0, strays.slice(0, 4).join("; "));
    const home = await placement(page);
    console.log(`       tracker at ${home.rect}; scroll ${home.doc} ${home.scrolls}`);

    for (let i = 0; i < seats; i++) {
      const opener = openers.nth(i);
      const seatTurn = await turnOf(opener);
      // Frame 0: press, then read the sheet's rotation on the first frame it is painted.
      const first = await opener.evaluate(
        (el) =>
          new Promise((done) => {
            el.click();
            const read = () => {
              const sheet = document.querySelector("[data-testid=tracker-sheet]");
              if (!sheet) return requestAnimationFrame(read);
              let deg = 0;
              for (let n = sheet; n && n !== document.body; n = n.parentElement) {
                const t = getComputedStyle(n).transform;
                if (t && t !== "none") {
                  const m = new DOMMatrix(t);
                  deg += Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI);
                }
              }
              done(((((deg + 180) % 360) + 360) % 360) - 180);
            };
            requestAnimationFrame(read);
          }),
      );
      const sheet = page.getByTestId("tracker-sheet");
      report(`seat ${i + 1}: at frame 0 the sheet faces the seat`, first === seatTurn, `seat ${seatTurn}°, sheet ${first}°`);
      await page.waitForTimeout(110);
      const rising = await turnOf(sheet);
      report(`seat ${i + 1}: mid-slide the sheet faces the seat`, rising === seatTurn, `seat ${seatTurn}°, sheet ${rising}°`);
      await page.waitForTimeout(450);
      const risen = await turnOf(sheet);
      report(`seat ${i + 1}: at rest the sheet faces the seat`, risen === seatTurn, `seat ${seatTurn}°, sheet ${risen}°`);
      const box = await sheet.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, r: r.right, b: r.bottom };
      });
      const inside = box.x >= -1 && box.y >= -1 && box.r <= viewport.width + 1 && box.b <= viewport.height + 1;
      report(`seat ${i + 1}: the sheet lies inside the viewport`, inside, [box.x, box.y, box.r, box.b].map(Math.round).join(","));
      const close = sheet.getByRole("button", { name: /close/i });
      const x = await close.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        const hit = document.elementFromPoint(cx, cy);
        return { cx, cy, hits: hit === el || el.contains(hit), on: hit ? `${hit.tagName.toLowerCase()}${hit.dataset?.testid ? `[${hit.dataset.testid}]` : ""}.${String(hit.className).slice(0, 60)}` : "nothing" };
      });
      const xInside = x.cx >= 0 && x.cy >= 0 && x.cx <= viewport.width && x.cy <= viewport.height;
      report(`seat ${i + 1}: the close × is on screen and pressable`, xInside && x.hits, `${Math.round(x.cx)},${Math.round(x.cy)} hits ${x.hits ? "the ×" : x.on}`);
      const during = await placement(page);
      report(`seat ${i + 1}: the tracker holds still while the sheet is open`, during.rect === home.rect && during.doc === home.doc && during.scrolls === home.scrolls, `${during.rect}; ${during.doc} ${during.scrolls}`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/sheet-seats-${viewport.width}-seat${i + 1}.png` });
      if (xInside && x.hits) await page.mouse.click(x.cx, x.cy);
      else await close.evaluate((el) => el.click());
      await sheet.waitFor({ state: "detached", timeout: 5_000 });
      await page.waitForTimeout(150);
      const after = await placement(page);
      report(`seat ${i + 1}: after close the tracker is back where it started`, after.rect === home.rect && after.doc === home.doc && after.scrolls === home.scrolls, `${after.rect}; ${after.doc} ${after.scrolls}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exitCode = failures ? 1 : 0;
