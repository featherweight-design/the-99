// Presses a life tracker panel's − and + halves and samples every 40 ms what the player sees (the half's wash, the panel's
// tint, the pending figure). It asserts the life press of ADDENDUM-life-press ("Nudge"): a 10% accent wash only while a finger
// is down and gone within 250 ms of release, the glyph staying muted, the number ticking and nudging on every step, the pending
// figure in the gain or loss ink fading out at the commit, nothing held through the 2 s window, no panel tint, a hold that steps
// by ten after 480 ms, and a slid-off press that ends its wash and hands nothing on.
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
  { label: "desktop 1300x900", viewport: { width: 1300, height: 900 } },
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
      // The pending figure's ink against the theme's --success and --danger, resolved to rgb by a probe element.
      pendingInk: (() => {
        const n = panel.querySelector("[data-testid=life-pending]");
        return n ? getComputedStyle(n).color : "";
      })(),
      success: (() => { const t = document.createElement("i"); t.style.color = "var(--success)"; document.body.append(t); const c = getComputedStyle(t).color; t.remove(); return c; })(),
      danger: (() => { const t = document.createElement("i"); t.style.color = "var(--danger)"; document.body.append(t); const c = getComputedStyle(t).color; t.remove(); return c; })(),
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

    // The life press (addendum "life press = Nudge"): a 10% accent wash only while a finger is down, the number ticking and
    // nudging on every step, the pending figure in --success / --danger ink fading out at the commit, nothing held through the window.
    for (const which of ["half-minus", "half-plus"]) {
      const half = page.getByTestId(which).first();
      const box = await half.boundingBox();
      const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      // Two short presses (under the 480 ms hold), 700 ms apart, each sampled while down and after release.
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      await page.waitForTimeout(250);
      const down1 = await sample(half);
      await page.mouse.up();
      await page.waitForTimeout(60);
      const anim1 = await page.getByTestId("life-number").first().evaluate((el) => el.firstElementChild.getAnimations().map((a) => a.animationName));
      await page.waitForTimeout(240);
      const up1 = await sample(half);
      report(`${which}: the wash draws at about 10% while the finger is down`, alpha(down1.bg) > 0.07 && alpha(down1.bg) < 0.13, down1.bg);
      report(`${which}: the wash is gone within 250 ms of release, with the change still pending`, alpha(up1.bg) < 0.03 && !!up1.pending, `${up1.bg} pending ${up1.pending}`);
      report(`${which}: the glyph stays muted, never the accent`, down1.fg === up1.fg, `${down1.fg} vs ${up1.fg}`);
      report(`${which}: the number ticks and nudges on a tap`, anim1.some((n) => n.startsWith("life-nudge")), anim1.join(","));
      report(`${which}: the pending figure takes the gain or loss ink`, up1.pendingInk === (which === "half-plus" ? up1.success : up1.danger), `${up1.pendingInk}`);
      // A second step while pending nudges again.
      await page.mouse.down();
      await page.waitForTimeout(120);
      await page.mouse.up();
      await page.waitForTimeout(60);
      const anim2 = await page.getByTestId("life-number").first().evaluate((el) => el.firstElementChild.getAnimations().map((a) => a.animationName));
      report(`${which}: a second tap plays the nudge again`, anim2.some((n) => n.startsWith("life-nudge")), anim2.join(","));
      await page.waitForTimeout(250); // the 200 ms fade-out of the second press's wash
      // Through the window: no wash, no tint, and at the commit the figure fades out while the number's own animation does not replay.
      const rows = [];
      const t0 = Date.now();
      while (Date.now() - t0 < 2800) {
        rows.push({ t: Date.now() - t0, ...(await sample(half)), fading: await page.getByTestId("life-pending-fade").count(), numAnims: await page.getByTestId("life-number").first().evaluate((el) => el.getAnimations({ subtree: true }).length) });
        await page.waitForTimeout(40);
      }
      report(`${which}: nothing is held through the window (no wash)`, rows.every((r) => alpha(r.bg) < 0.03), `max ${Math.max(...rows.map((r) => alpha(r.bg))).toFixed(2)}`);
      report(`${which}: no panel tint at any point`, rows.every((r) => r.tint === "none" || r.tint.endsWith("@0.00")), [...new Set(rows.map((r) => r.tint))].join(" "));
      report(`${which}: the number does not animate again at the commit`, rows.every((r) => r.numAnims === 0), `max ${Math.max(...rows.map((r) => r.numAnims))}`);
      report(`${which}: the figure fades out at the commit`, rows.some((r) => r.fading > 0));
      await page.waitForTimeout(600);
      report(`${which}: the faded figure is gone`, (await page.getByTestId("life-pending-fade").count()) === 0);
    }

    // Holding steps by ten after 480 ms, then every 380 ms.
    {
      const plus = page.getByTestId("half-plus").first();
      const pb = await plus.boundingBox();
      const life = () => page.getByTestId("life-number").first().evaluate((el) => Number(el.firstElementChild.textContent));
      const start = await life();
      await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(400);
      const early = await life();
      await page.waitForTimeout(200);
      const first = await life();
      await page.waitForTimeout(300);
      const second = await life();
      await page.mouse.up();
      report("no hold step before 480 ms", early === start, `${start} -> ${early}`);
      report("the first hold step lands after 480 ms, by ten", first === start + 10, `${start} -> ${first}`);
      report("the repeat step lands 380 ms after the first (by 900 ms)", second === start + 20, `${start} -> ${second}`);
      await page.waitForTimeout(2600);
    }

    // A press that slides off without a step ends its wash and hands nothing to the other half.
    {
      const plus = page.getByTestId("half-plus").first();
      const minus = page.getByTestId("half-minus").first();
      const pb = await plus.boundingBox();
      const mb = await minus.boundingBox();
      await page.touchscreen.tap(pb.x + pb.width / 2, pb.y + pb.height / 2);
      await page.waitForTimeout(500);
      await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(120);
      await page.mouse.move(mb.x + mb.width / 2, mb.y - 200, { steps: 4 });
      await page.mouse.up();
      await page.waitForTimeout(300);
      const p = await sample(plus);
      const m = await sample(minus);
      report("a slid-off press leaves its own half without a wash", alpha(m.bg) < 0.03, m.bg);
      report("a slid-off press hands nothing to the pending half", alpha(p.bg) < 0.03, p.bg);
      await page.waitForTimeout(2400);
    }
    await context.close();

    // Reduced motion: the wash still draws while the finger is down (it is state, not motion), and nothing animates.
    const calm = await browser.newContext({ viewport, hasTouch: true, isMobile: viewport.width < 768, reducedMotion: "reduce" });
    const calmPage = await calm.newPage();
    await signIn(calmPage);
    await calmPage.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "networkidle", timeout: 180_000 });
    await calmPage.getByRole("button", { name: "Start", exact: true }).evaluate((el) => el.click());
    await calmPage.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
    await calmPage.evaluate(() => {
      document.querySelectorAll("[data-seat-notice-stack], nextjs-portal").forEach((n) => n.remove());
      document.querySelector("[data-testid=first-roll] > button")?.click();
    });
    await calmPage.getByTestId("first-roll").waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
    await calmPage.waitForTimeout(800);
    const calmHalf = calmPage.getByTestId("half-plus").first();
    const cb = await calmHalf.boundingBox();
    await calmPage.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
    await calmPage.mouse.down();
    await calmPage.waitForTimeout(250);
    const calmDown = await sample(calmHalf);
    await calmPage.mouse.up();
    await calmPage.waitForTimeout(60);
    const calmAnims = await calmPage.getByTestId("life-number").first().evaluate((el) => el.getAnimations({ subtree: true }).length);
    report("reduced motion: the wash still draws while the finger is down", alpha(calmDown.bg) > 0.07 && alpha(calmDown.bg) < 0.13, calmDown.bg);
    report("reduced motion: the number does not animate", calmAnims === 0, `${calmAnims} animations`);
    await calm.close();
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exitCode = failures ? 1 : 0;
