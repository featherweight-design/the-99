// Finding the tools R13: Home's search panel puts the card fan at the panel's right edge from `md`, the field right under
// the title. Measures the panel height and the fan's place at 390, 820x1180, 1180x820 and 1300, with three recent cards
// seeded in the browser's own storage (no database row beyond the About gate, marked seen and put back).
//
//   PROBE_BASE=http://localhost:3492 pnpm probe:home-fan
//   PROBE_SHOTS=<existing dir> adds one viewport PNG per size (the contact sheet's four cells).
//
// Fails on main: there the fan sits in the title row on desktop (no 28px right edge) and the panel is about 100px taller.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}


const ART = `data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='80' height='112'><rect width='80' height='112' fill='#789'/></svg>")}`;
const panel = (page) => page.locator("[data-home-search-panel]");

const VIEWPORTS = [
  { tag: "390x844", width: 390, height: 844, phone: true },
  { tag: "820x1180", width: 820, height: 1180 },
  { tag: "1180x820", width: 1180, height: 820 },
  { tag: "1300x900", width: 1300, height: 900 },
];

async function measure(page) {
  return page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, h: b.height }; };
    const p = document.querySelector("[data-home-search-panel]");
    const fan = document.querySelector("[data-home-fan]");
    const field = document.querySelector("[data-home-search-field]");
    const title = document.getElementById("home-search-title");
    return {
      fans: document.querySelectorAll("[data-home-fan]").length,
      panel: r(p),
      fan: fan ? r(fan) : null,
      fanPosition: fan ? getComputedStyle(fan).position : null,
      field: r(field),
      title: r(title),
      starters: document.querySelector("[data-home-starters]") ? r(document.querySelector("[data-home-starters]")) : null,
    };
  });
}

async function leg(browser, vp) {
  const context = await browser.newContext(
    vp.phone ? { viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true } : { viewport: { width: vp.width, height: vp.height } },
  );
  const page = await context.newPage();
  await signIn(page);
  const userId = await page.evaluate(() => window.Clerk?.user?.id ?? null);
  if (!userId) throw new Error("Signed in, but Clerk reports no user.");
  aboutPrior ??= await captureAboutSeen(userId);
  await clearAboutSheet(page, userId);
  await page.evaluate(([id, art]) => {
    localStorage.setItem(`card-search:recent:${id}`, JSON.stringify(["a", "b", "c"].map((n) => ({ oracleId: n, name: n, imageUri: art, flavorName: null }))));
  }, [userId, ART]);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await panel(page).waitFor({ timeout: 15_000 });
  await page.locator("[data-home-fan]").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(500);
  const m = await measure(page);
  const tag = `${vp.tag}:`;
  if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/r13-home-${vp.tag}.png` });
  console.log(`       ${tag} panel ${Math.round(m.panel.h)}px tall; fan ${m.fan ? `${Math.round(m.panel.r - m.fan.r)}px from the right edge, centre ${Math.round((m.fan.t + m.fan.b) / 2 - m.panel.t)} of ${Math.round(m.panel.h)}` : "none"}`);
  report(`${tag} one fan node`, m.fans === 1);
  if (vp.phone) {
    report(`${tag} the fan stays beside the title (in flow, above the field)`, m.fanPosition === "relative" && m.fan.t < m.field.t, `${m.fanPosition}`);
    report(`${tag} the phone panel is as shipped (the field is below the fan)`, m.field.t >= m.fan.b - 1, `field ${Math.round(m.field.t)} fan bottom ${Math.round(m.fan.b)}`);
  } else {
    report(`${tag} the fan is out of the row (absolute)`, m.fanPosition === "absolute", `${m.fanPosition}`);
    report(`${tag} the fan sits 28px from the panel's right edge`, Math.abs(m.panel.r - m.fan.r - 29) <= 2, `${Math.round(m.panel.r - m.fan.r)}px (28 plus the 1px border)`);
    const mid = (m.fan.t + m.fan.b) / 2;
    report(`${tag} the fan is centred on the panel`, Math.abs(mid - (m.panel.t + m.panel.b) / 2) <= 2, `${Math.round(mid - m.panel.t)} of ${Math.round(m.panel.h)}`);
    report(`${tag} the field starts 12px under the title row`, m.field.t - m.title.b <= 20, `${Math.round(m.field.t - m.title.b)}px under the title text`);
    report(`${tag} the field and the fan do not overlap`, m.field.r <= m.fan.l + 1, `field right ${Math.round(m.field.r)} fan left ${Math.round(m.fan.l)}`);
    if (m.starters) report(`${tag} the starters do not run under the fan`, m.starters.r <= m.fan.l + 1, `starters right ${Math.round(m.starters.r)}`);
    report(`${tag} the field starts within 70px of the panel top (the title row is one line; was 152px with the fan in it)`, m.field.t - m.panel.t <= 70, `${Math.round(m.field.t - m.panel.t)}px`);
  }
  await context.close();
}

let aboutPrior = null;

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) await leg(browser, vp);
  } finally {
    if (aboutPrior) await restoreAboutSeen(aboutPrior).catch((e) => console.error("could not restore About:", e));
    await browser.close();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
