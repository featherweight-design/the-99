// Taps a life tracker panel's − and + halves three times, 300 ms apart, and samples every 40 ms through the commit
// (2 s after the last tap) what the player sees: the pressed half's background and glyph color, the panel's gain/loss
// tint and the pending figure. It asserts the pressed color shows from the first tap, fades steadily (only falling, and
// still showing halfway) so it is gone by the commit rather than dropping at it, and that no tint flashes across the panel when the change commits.
// It only reads and taps: the game lives on the device (localStorage), so it writes nothing to the database. The audit
// account must sit at the table (`scripts/seed-rule-zero-fixture.mts`'s S4); production and staging are refused.
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-tracker-life-tap.mjs
// Optional: SETUP_TABLE (default the fixture's S4).
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
const WIDTHS = [
  { label: "phone 390x844", viewport: { width: 390, height: 844 } },
  { label: "tablet 1024x768", viewport: { width: 1024, height: 768 } },
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

// The pressed half's background, the panel's tint layer and the life shown, sampled every 40 ms.
const sample = (half) =>
  half.evaluate((el) => {
    const panel = el.closest("[data-testid=panel-front]") ?? el.closest("[data-testid=tracker-panel]") ?? el.parentElement.parentElement;
    // A tint is any animating layer, outside the halves, that covers most of the panel (main's `life-pulse` span was one),
    // found by what it does rather than by its class, so a renamed or reworked flash is still caught.
    const pr = panel.getBoundingClientRect();
    const tint = [...panel.querySelectorAll("*")].find((n) => {
      if (n.closest("button") || n.getAnimations().length === 0) return false;
      const r = n.getBoundingClientRect();
      return r.width * r.height > 0.5 * pr.width * pr.height;
    });
    // What the half draws: its own ground, or the fill layer inside it, its alpha scaled by the layer's opacity.
    const fill = el.querySelector("[data-testid=half-fill]");
    const own = getComputedStyle(el).backgroundColor;
    const layer = fill ? getComputedStyle(fill) : null;
    const m = layer?.backgroundColor.match(/[\d.]+/g)?.map(Number);
    const drawn = layer && m ? `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${((m[3] ?? 1) * Number(layer.opacity)).toFixed(3)})` : own;
    return {
      bg: drawn,
      fg: getComputedStyle(el).color,
      tint: tint ? `${getComputedStyle(tint).backgroundColor}@${Number(getComputedStyle(tint).opacity).toFixed(2)}` : "none",
      pending: panel.querySelector("[data-testid=life-pending]")?.textContent ?? "",
    };
  });
const alpha = (c) => {
  const m = c.match(/rgba?\(([^)]+)\)/) ?? c.match(/color\(srgb ([^)]+)\)/);
  if (!m) return 0;
  const parts = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return parts.length > 3 ? parts[3] : 1;
};

const [{ branch } = {}] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
assertNotSharedBranch(branch, "probe:tracker-life-tap");

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const { label, viewport } of WIDTHS) {
    console.log(`\n## ${label}`);
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: viewport.width < 768 });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "networkidle", timeout: 180_000 });
    const start = page.getByRole("button", { name: "Start", exact: true });
    await start.waitFor({ timeout: 60_000 }).catch(async () => {
      throw new Error(`no Start button at ${page.url()}: ${((await page.locator("main").innerText().catch(() => "")) || "").slice(0, 300)}`);
    });
    await start.evaluate((el) => el.click());
    await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
    await page.evaluate(() => {
      document.querySelectorAll("[data-seat-notice-stack], nextjs-portal").forEach((n) => n.remove());
      document.querySelector("[data-testid=first-roll] > button")?.click();
    });
    await page.getByTestId("first-roll").waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(800);

    for (const which of ["half-minus", "half-plus"]) {
      const half = page.getByTestId(which).first();
      const box = await half.boundingBox();
      const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      const t0 = Date.now();
      const rows = [];
      const taps = [0, 300, 600];
      let next = 0;
      while (Date.now() - t0 < 3400) {
        const t = Date.now() - t0;
        if (next < taps.length && t >= taps[next]) {
          await page.touchscreen.tap(at.x, at.y);
          next++;
        }
        rows.push({ t: Date.now() - t0, ...(await sample(half)) });
        await page.waitForTimeout(40);
      }
      console.log(`  ${which}: taps at ${taps.join(", ")} ms; commit due ~${600 + 2000} ms`);
      let last = "";
      for (const r of rows) {
        const line = `${r.bg} | ${r.fg} | tint ${r.tint} | ${r.pending}`;
        if (line !== last) console.log(`   ${String(r.t).padStart(5)}ms  ${line}`);
        last = line;
      }
      const pressedRows = rows.filter((r) => r.pending);
      const first = pressedRows[0];
      report(`${which}: the first sample after a tap already carries the pressed color`, first && alpha(first.bg) >= 0.15, first?.bg ?? "never pressed");
      const commitAt = rows.findIndex((r, i) => i > 0 && rows[i - 1].pending && !r.pending);
      const around = rows.slice(Math.max(0, commitAt - 2), commitAt + 4);
      const before = commitAt > 0 ? alpha(rows[commitAt - 1].bg) : 0;
      report(`${which}: the pressed color has faded out by the commit (no sudden drop)`, before <= 0.05, `alpha before commit ${before.toFixed(2)}`);
      // Steady: after the last tap the ground only falls, and halfway to the commit it is still showing.
      const fading = rows.filter((r) => r.t > 700 && r.pending).map((r) => alpha(r.bg));
      const mid = rows.filter((r) => r.pending && r.t >= 1500 && r.t <= 1800).map((r) => alpha(r.bg));
      report(`${which}: the pressed color fades steadily after the last tap`, fading.length > 5 && fading.every((a, i) => i === 0 || a <= fading[i - 1] + 0.005) && mid.some((a) => a >= 0.05 && a <= 0.14), `mid ${mid.map((a) => a.toFixed(2)).join(" ")}`);
      report(`${which}: no panel tint flashes at the commit`, around.every((r) => r.tint === "none" || r.tint.endsWith("@0.00")), around.map((r) => r.tint).join(" "));
      await page.waitForTimeout(800);
    }

    // A press that slides off without a step hands the light back to the half whose change is pending, mid-fade.
    {
      const plus = page.getByTestId("half-plus").first();
      const minus = page.getByTestId("half-minus").first();
      const pb = await plus.boundingBox();
      const mb = await minus.boundingBox();
      await page.touchscreen.tap(pb.x + pb.width / 2, pb.y + pb.height / 2);
      await page.waitForTimeout(900);
      await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(120);
      await page.mouse.move(mb.x + mb.width / 2, mb.y - 200, { steps: 4 });
      await page.mouse.up();
      await page.waitForTimeout(60);
      const p = await sample(plus);
      const m = await sample(minus);
      report("a slid-off press leaves its own half unlit", alpha(m.bg) < 0.03, m.bg);
      report("a slid-off press hands the light back to the pending half, mid-fade", alpha(p.bg) >= 0.05 && alpha(p.bg) <= 0.14, p.bg);
      await page.waitForTimeout(2400);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exitCode = failures ? 1 : 0;
