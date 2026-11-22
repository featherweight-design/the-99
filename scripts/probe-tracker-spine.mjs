// The life tracker's centre strip as Hugh tested it (bugs 4 to 10, 2026-11-21), at phone and tablet width:
//   4. a strip button held down fills with the accent and is pushed in (scaled under 1), easing both ways;
//   5. day/night: the old icon turns out as the new one turns in, 320 ms each; reduced motion draws only the new one;
//   6. Menu is drawn over the spine, so every part of it takes a press;
//   7. a real press on End turn passes the turn;
//   8. the dice menu pops in over the spine, inside the viewport;
//   9. a tap on the landed coin, or a landed die, rolls again; only a tap off it closes;
//  10. a coin flip draws a coin that flips.
// It only reads and taps: the game lives on the device (localStorage), so it writes nothing to the database. The audit
// account must sit at the fixture's S4 table; production and staging are refused.
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-tracker-spine.mjs
// Optional: SETUP_TABLE, SHOTS=<dir>.
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
].filter((w) => !process.env.ONLY || w.label.startsWith(process.env.ONLY));

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


const [{ branch } = {}] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
assertNotSharedBranch(branch, "probe:tracker-spine");

// The center of an element, and whether a press there lands on it (nothing drawn over it).
const hitOf = (loc) =>
  loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.x + r.width / 2;
    const y = r.y + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { x, y, r: { x: r.x, y: r.y, w: r.width, h: r.height }, hits: hit === el || el.contains(hit), on: hit ? `${hit.tagName.toLowerCase()}${hit.dataset?.testid ? `[${hit.dataset.testid}]` : ""}.${String(hit.className).slice(0, 90)} in seat ${hit.querySelector?.("[data-seat]")?.dataset.seat ?? hit.closest("[data-seat]")?.dataset.seat}; mine ${el.closest("[data-seat]")?.dataset.seat}; hit rect ${(() => { const q = hit.getBoundingClientRect(); return [q.x, q.y, q.width, q.height].map(Math.round).join(","); })()}; el ${[r.x, r.y, r.width, r.height].map(Math.round).join(",")}` : "nothing" };
  });

await clerkSetup();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  for (const { label, viewport } of WIDTHS) {
    console.log(`\n## ${label}`);
    const context = await browser.newContext({ viewport, hasTouch: true });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "networkidle", timeout: 180_000 });
    const start = page.getByRole("button", { name: "Start", exact: true });
    await start.waitFor({ timeout: 60_000 });
    await start.evaluate((el) => el.click());
    await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
    // Clear what is not the table: the seat notices, Next's dev badge, and a Random start's first-roll overlay (a tap clears it).
    await page.evaluate(() => {
      document.querySelectorAll("[data-seat-notice-stack], nextjs-portal").forEach((n) => n.remove());
      document.querySelector("[data-testid=first-roll] > button")?.click();
    });
    await page.getByTestId("first-roll").waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(400);
    const spine = page.getByTestId("tracker-spine");
    const spineBox = await spine.boundingBox();
    const accent = await page.evaluate(() => {
      const d = document.createElement("i");
      d.style.color = "var(--accent)";
      document.body.append(d);
      const c = getComputedStyle(d).color;
      d.remove();
      return c;
    });

    // 7. End turn: a real press on the pill passes the turn.
    const pill = page.getByTestId("end-turn");
    if (await pill.count()) {
      const before = await pill.evaluate((el) => el.closest("[data-seat]")?.getAttribute("data-seat") ?? el.closest("[data-testid=tracker-panel]")?.textContent?.slice(0, 20));
      const h = await hitOf(pill);
      report("7 End turn is pressable (nothing drawn over it)", h.hits, h.on);
      await page.mouse.click(h.x, h.y);
      await page.waitForTimeout(500);
      const after = (await pill.count()) ? await pill.evaluate((el) => el.closest("[data-seat]")?.getAttribute("data-seat") ?? el.closest("[data-testid=tracker-panel]")?.textContent?.slice(0, 20)) : null;
      report("7 End turn passes the turn", after !== null && after !== before, `${before} -> ${after}`);
    } else report("7 End turn pill drawn", false, "no end-turn");

    // 4. A strip button pressed draws the accent and a push, and eases between them.
    for (const id of ["strip-monarch", "strip-day", "strip-dice", "strip-menu"]) {
      const b = page.getByTestId(id);
      const h = await hitOf(b);
      const rest = await b.evaluate((el) => ({ t: getComputedStyle(el).transitionProperty, d: getComputedStyle(el).transitionDuration }));
      await page.mouse.move(h.x, h.y);
      await page.mouse.down();
      // Past the 0.2s ease with room to spare, so the fill is read at rest, not mid-transition.
      await page.waitForTimeout(400);
      const held = await b.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { bg: cs.backgroundColor, tf: cs.transform };
      });
      if (SHOTS && id === "strip-dice") await page.screenshot({ path: `${SHOTS}/spine-held-${viewport.width}.png` });
      await page.mouse.up();
      await page.waitForTimeout(250);
      // Undo whatever the press did, so the next button starts from rest.
      if (id === "strip-dice" || id === "strip-menu" || id === "strip-monarch") await page.keyboard.press("Escape");
      if (id === "strip-dice" || id === "strip-menu" || id === "strip-monarch") {
        const open = await page.locator("[data-testid=dice-menu], [role=dialog]").count();
        if (open) await b.evaluate((el) => el.click());
        await page.waitForTimeout(250);
      }
      const scale = held.tf === "none" ? 1 : Number((/matrix\(([^,]+)/.exec(held.tf) ?? [0, 1])[1]);
      report(`4 ${id} held: accent fill`, held.bg.replace(/\s/g, "") === accent.replace(/\s/g, ""), `${held.bg} vs ${accent}`);
      report(`4 ${id} held: pushed (scaled under 1)`, scale < 0.99, `${held.tf}`);
      report(`4 ${id} eases (transform and color transition)`, /transform|all/.test(rest.t) && /background|all/.test(rest.t), `${rest.t} ${rest.d}`);
    }

    // 5. Day/night (addendum R2, K1): each toggle turns the old icon out and the new one in, both 320 ms, no overshoot.
    const day = page.getByTestId("strip-day");
    for (let n = 0; n < 2; n++) {
      await day.evaluate((el) => el.click());
      await page.waitForTimeout(40);
      if (SHOTS && n === 0) {
        await page.waitForTimeout(100);
        await page.screenshot({ path: `${SHOTS}/spine-day-turn-${viewport.width}.png` });
      }
      const anim = await day.evaluate((el) =>
        el.getAnimations({ subtree: true }).map((a) => ({ name: a.animationName, ms: a.effect?.getTiming().duration, ease: a.effect?.getTiming().easing, tid: a.effect?.target?.getAttribute("data-testid") })),
      );
      const out = anim.find((a) => a.name === "dn-out" && a.tid === "strip-day-out");
      const inn = anim.find((a) => a.name === "dn-in" && a.tid === "strip-day-icon");
      report(`5 day/night toggle ${n + 1}: the old icon turns out and the new one turns in, 320 ms each`, !!out && !!inn && out.ms === 320 && inn.ms === 320, JSON.stringify(anim));
      await page.waitForTimeout(600);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await day.evaluate((el) => el.click());
    await page.waitForTimeout(40);
    const reduced = await day.evaluate((el) => ({
      out: [...el.querySelectorAll("[data-testid=strip-day-out]")].filter((e) => getComputedStyle(e).display !== "none").length,
      icons: [...el.querySelectorAll("svg")].filter((e) => e.getClientRects().length).length,
    }));
    report("5 day/night under reduced motion: only the incoming icon is drawn", reduced.out === 0 && reduced.icons === 1, JSON.stringify(reduced));
    await page.emulateMedia({ reducedMotion: null });

    // 6. Menu: drawn over the spine, so every part of it is pressable.
    const menuBtn = page.getByTestId("strip-menu");
    await menuBtn.evaluate((el) => el.click());
    await page.waitForTimeout(300);
    const menu = page.getByRole("dialog", { name: /menu/i });
    if (await menu.count()) {
      const pts = await menu.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const out = [];
        for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.2, 0.5, 0.8]) {
          const hit = document.elementFromPoint(r.x + r.width * fx, r.y + r.height * fy);
          out.push(!!hit && (hit === el || el.contains(hit)));
        }
        return out;
      });
      report("6 Menu is drawn over the spine (all of it pressable)", pts.every(Boolean), pts.map((p) => (p ? 1 : 0)).join(""));
      await menuBtn.evaluate((el) => el.click()).catch(() => {});
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
    } else report("6 Menu opens", false, "no dialog");

    // 8. The dice menu pops in over the spine, as drawn.
    await page.getByTestId("strip-dice").evaluate((el) => el.click());
    await page.waitForTimeout(350);
    const dm = await page.getByTestId("dice-menu").boundingBox();
    const overlaps = dm && spineBox && dm.x < spineBox.x + spineBox.width && dm.x + dm.width > spineBox.x && dm.y < spineBox.y + spineBox.height && dm.y + dm.height > spineBox.y;
    const inside = dm && dm.x >= 0 && dm.y >= 0 && dm.x + dm.width <= viewport.width && dm.y + dm.height <= viewport.height;
    report("8 the dice menu sits over the spine", !!overlaps, dm ? [dm.x, dm.y, dm.width, dm.height].map(Math.round).join(",") + ` spine ${[spineBox.x, spineBox.y, spineBox.width, spineBox.height].map(Math.round).join(",")}` : "none");
    report("8 the dice menu lies inside the viewport", !!inside);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/spine-dice-menu-${viewport.width}.png` });

    // 10. Coin: a coin is drawn and flips.
    await page.getByRole("menuitem").nth(2).evaluate((el) => el.click());
    await page.waitForTimeout(250);
    const coin = page.getByTestId("dice-coin");
    const coinDrawn = (await coin.count()) > 0;
    report("10 the coin is drawn", coinDrawn);
    if (coinDrawn) {
      const spin = await coin.evaluate((el) => el.getAnimations().length);
      report("10 the coin flips (animates)", spin > 0, `${spin}`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/spine-coin-${viewport.width}.png` });
    }
    await page.locator("[data-testid=dice-roll][data-landed]").waitFor({ timeout: 6000 }).catch(() => {});

    // 9. A tap on the coin flips again; only a tap off it closes.
    const rolledAgain = async (target, what) => {
      const k0 = await page.getByTestId("dice-roll").getAttribute("data-k");
      const b = await target.boundingBox();
      if (!b) return report(`9 the ${what} takes a tap`, false, "not drawn");
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(300);
      const open = (await page.getByTestId("dice-roll").count()) > 0;
      const k1 = open ? await page.getByTestId("dice-roll").getAttribute("data-k") : null;
      report(`9 tapping the ${what} keeps the roll open`, open);
      report(`9 tapping the ${what} rolls again`, open && k1 !== k0, `${k0} -> ${k1}`);
    };
    if (coinDrawn) await rolledAgain(coin, "coin");
    else report("9 tapping the coin rolls again", false, "no coin drawn");
    await page.locator("[data-testid=dice-roll][data-landed]").waitFor({ timeout: 6000 }).catch(() => {});
    await page.mouse.click(8, viewport.height / 2);
    await page.waitForTimeout(300);
    report("9 a tap off the coin closes the roll", (await page.getByTestId("dice-roll").count()) === 0);

    // 9. A thrown d20: once it lands, a tap where it lies rolls again. Needs the 3D scene (WebGL): with no canvas in the
    // dice layer the result card alone is drawn, and the check says so rather than failing.
    await page.getByTestId("strip-dice").evaluate((el) => el.click());
    await page.waitForTimeout(300);
    await page.getByRole("menuitem").nth(1).evaluate((el) => el.click());
    await page.locator("[data-testid=dice-roll][data-landed]").waitFor({ timeout: 8000 }).catch(() => {});
    const dieHit = page.getByTestId("dice-die").first();
    const scene3d = await page.evaluate(() => {
      const c = document.querySelector("#tracker-dice canvas");
      return !!c && getComputedStyle(document.getElementById("tracker-dice")).visibility === "visible";
    });
    if ((await dieHit.count()) > 0) await rolledAgain(dieHit, "d20");
    else if (scene3d) report("9 the landed d20 takes a tap", false, "no tap target over the die");
    else console.log("  (no 3D scene: the d20 tap is not checked)");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/spine-d20-${viewport.width}.png` });

    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exitCode = failures ? 1 : 0;
