// Collection quick filters feedback (Hugh 2026-11-25), PR B: the You own one rows. The card you own leads on the left
// and is the bold name; the missing card follows on the right; on a phone its dashed placeholder draws only the +.
//
// Run by hand against a dev server: `PROBE_BASE=http://localhost:3114 node scripts/probe-combos-one-row.mjs`.
// It fails on main, where the missing card leads, the missing name is the bold one and a phone placeholder says
// "not owned". Not part of `pnpm test`: it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;

const VIEWPORTS = [
  { label: "phone 390x844", width: 390, height: 844, form: "phone" },
  { label: "tablet 820x1180", width: 820, height: 1180, form: "phone" },
  { label: "tablet 1180x820", width: 1180, height: 820, form: "wide" },
  { label: "desktop 1300x900", width: 1300, height: 900, form: "wide" },
];

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

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
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}


await clerkSetup();
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/collection?combos=one`, { waitUntil: "domcontentloaded" });
    console.log(`\n== ${vp.label}`);
    await page.waitForSelector("[data-combo-pair]", { timeout: 30_000 });
    const rows = page.locator("[data-combo-pair]");
    const n = Math.min(await rows.count(), 5);
    check(n > 0, `${vp.label}: own one draws pairs`);
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      const missing = row.locator("[data-combo-missing]");
      check((await missing.count()) === 1, `${vp.label} row ${i}: one missing placeholder`);
      const fact = (await row.innerText()).match(/Missing ([^\n·]+?)(?: ·|\n|$)/)?.[1]?.trim();
      const title = (await row.locator("[data-combo-title]").innerText()).replace(/\s+/g, " ");
      check(!!fact && !title.startsWith(fact), `${vp.label} row ${i}: the owned card leads the title (${title})`);
      check(
        await missing.evaluate((el) => el === el.parentElement.lastElementChild),
        `${vp.label} row ${i}: the missing card is on the right`,
      );
      const text = await missing.innerText();
      if (vp.form === "phone") {
        check(!/not owned/i.test(text), `${vp.label} row ${i}: the phone placeholder drops "not owned"`);
        check(text.trim() === "+", `${vp.label} row ${i}: the phone placeholder is the + alone`);
      }
      check(
        await missing.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        `${vp.label} row ${i}: the placeholder text fits inside the dashed border`,
      );
    }
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${vp.label}: no sideways page scroll`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures.length > 0) {
  console.log(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nall ok");
