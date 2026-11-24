// The commander art fills each damage card in the phone sheet (design handoff addendum-shelf-art, B): on a phone the
// Damage tab's card is at least 176px tall, the art covers the whole card (not a 56px strip), the player's name sits
// over the art's head, and every commander's name and stepper sit inside the card over its foot. iPad and desktop keep
// their `DamageArt` cards. At phone 390x844 and 360x740, desktop 1300x900 and iPad 1180x820 and 820x1180. Start and every
// change live on the device (localStorage), so it writes nothing to the database and may run against local-dev. On
// main the phone card draws a 56px art strip, so the art-covers-the-card check fails.
//
//   PROBE_BASE=http://localhost:3417 node scripts/probe-tracker-shelf-art.mjs
// Optional: SHELF_TABLE (default the fixture's S4, four seats: three opponents, one sideways), SHOTS=<dir>.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const TABLE = process.env.SHELF_TABLE ?? "7a0e0000-0000-4000-8000-000000000013";
const SHOTS = process.env.SHOTS;
const WIDTHS = [
  { label: "phone 390x844", width: 390, height: 844, phone: true },
  { label: "phone 360x740", width: 360, height: 740, phone: true },
  { label: "desktop 1300x900", width: 1300, height: 900, phone: false },
  { label: "iPad 1180x820", width: 1180, height: 820, phone: false },
  { label: "iPad 820x1180", width: 820, height: 1180, phone: false },
];

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

// The audit account is a `+clerk_test` address: Clerk's fixed 424242 code, through `window.Clerk` on the app's origin
// (as `probe-rollup-ui.mjs`, which says why the hosted portal cannot be driven).
async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
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

const shot = async (page, name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};
const style = (loc, props) =>
  loc.evaluate((el, ps) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
  }, props);

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const { label, width, height, phone } of WIDTHS) {
    console.log(`\n## ${label}`);
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "networkidle" });
    const start = page.getByRole("button", { name: "Start", exact: true });
    await start.waitFor({ timeout: 20_000 }).catch(async () => {
      await shot(page, `${width}-no-start`);
      throw new Error(`no Start button at ${page.url()}`);
    });
    await start.evaluate((el) => el.click());
    await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.querySelectorAll("[data-seat-notice-stack]").forEach((n) => n.remove()));
    await page.locator('[data-testid="panel-sheet"]').first().evaluate((el) => el.click());
    const sheet = page.getByRole("dialog");
    await sheet.waitFor({ timeout: 10_000 });
    await page.waitForTimeout(600);

    const cards = await sheet.evaluate((root) => {
      const box = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      };
      return [...root.querySelectorAll("span[aria-hidden]")]
        .filter((s) => s.querySelector("img") || s.className.includes("bg-[color:var(--elevated)]"))
        .map((strip) => {
          const card = strip.closest("div.overflow-hidden");
          if (!card) return null;
          const c = box(card);
          const inside = (el) => {
            const b = box(el);
            return b.x >= c.x - 0.5 && b.y >= c.y - 0.5 && b.x + b.w <= c.x + c.w + 0.5 && b.y + b.h <= c.y + c.h + 0.5;
          };
          const steppers = [...card.querySelectorAll('[aria-live="polite"]')];
          const name = card.querySelector("b");
          return {
            card: c,
            art: box(strip),
            tagged: card.getAttribute("data-testid") === "damage-card",
            steppers: steppers.length,
            steppersInside: steppers.every(inside),
            nameInside: !!name && inside(name),
            nameOverArt: !!name && box(name).y < c.y + c.h * 0.4,
          };
        })
        .filter(Boolean);
    });
    check("the Damage tab draws a card per opponent", cards.length >= 2, `${cards.length} cards`);
    for (const [i, k] of cards.entries()) {
      const tag = `card ${i + 1}`;
      check(`${tag}: the art covers the whole card`, Math.abs(k.art.h - k.card.h) <= 1 && Math.abs(k.art.w - k.card.w) <= 1, `art ${k.art.w.toFixed(0)}x${k.art.h.toFixed(0)}, card ${k.card.w.toFixed(0)}x${k.card.h.toFixed(0)}`);
      if (phone) check(`${tag}: at least 176px tall`, k.card.h >= 175.5, `${k.card.h.toFixed(0)}px`);
      check(`${tag}: its steppers stay inside it`, k.steppers >= 1 && k.steppersInside, `${k.steppers} stepper(s)`);
      check(`${tag}: the player's name sits over the art's head`, k.nameInside && k.nameOverArt);
      check(`${tag}: ${phone ? "no" : "the"} damage-card tag`, phone ? !k.tagged : k.tagged);
    }
    const overflow = await sheet.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    check("the sheet does not scroll sideways", !overflow);
    await shot(page, `${width}x${height}-damage`);
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed");
process.exit(failed ? 1 : 0);
