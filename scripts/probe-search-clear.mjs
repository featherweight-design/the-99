// One tap on a search field's ✕ empties it and leaves focus in the field, at both widths.
//
// JSDOM has no layout and no blur-on-tap, and the defect this guards (a ✕ that moved out from under
// the finger when Safari blurred the field and a sibling reappeared) only exists in an engine, so the
// unit test in text-field.test.tsx pins the mechanism and this proves the press. For every surface
// listed it types, presses the ✕ ONCE with a real pointer at the button's centre, and reports the
// field's value, whether it is still the focused element, and whether the ✕ held its box.
//
//   PROBE_BASE=http://localhost:3210 node scripts/probe-search-clear.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1300, height: 900 },
];
// A route and the field on it. Each field is reached inside <main>, never the shell's.
const SURFACES = [
  { route: "/commanders", name: "commanders rack", widths: ["phone", "desktop"] },
  { route: "/collection", name: "collection compact", widths: ["phone"] },
  { route: "/collection", name: "collection wide", widths: ["desktop"] },
  { route: "/collection/sets", name: "sets index", widths: ["phone", "desktop"] },
  // The deck list's field is in the column at desktop and behind its search button, in a sheet, on the phone.
  { route: "/decks", name: "decks column", widths: ["desktop"] },
  { route: "/decks", name: "decks sheet", widths: ["phone"], open: 'button[aria-label="Search decks"]', field: '[role="dialog"] [data-search-field]' },
  { route: "/decks/precons", name: "precons list", widths: ["phone", "desktop"], open: null, field: "main [data-search-field]" },
];

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
          if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
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

let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const w of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width: w.width, height: w.height },
      hasTouch: w.name === "phone",
      isMobile: w.name === "phone",
    });
    const page = await context.newPage();
    await signIn(page);
    for (const s of SURFACES.filter((x) => x.widths.includes(w.name))) {
      await page.goto(`${BASE}${s.route}`, { waitUntil: "domcontentloaded" });
      const scope = s.field ?? "main [data-search-field]";
      if (s.open && w.name === "phone") await onPage(page, s.open).first().click();
      const input = page.locator(`${scope} input`).first();
      await input.waitFor({ state: "visible", timeout: 30_000 });
      const clear = page.locator(`${scope} button[aria-label]`).first();
      await input.fill("zzq");
      await clear.waitFor({ state: "visible" });
      const before = await clear.boundingBox();
      // A real pointer at the centre: a locator click would retry until the button stopped moving.
      if (w.name === "phone") await page.touchscreen.tap(before.x + before.width / 2, before.y + before.height / 2);
      else await page.mouse.click(before.x + before.width / 2, before.y + before.height / 2);
      await page.waitForTimeout(250);
      const after = await page.evaluate((sel) => ({
        value: document.querySelector(`${sel} input`)?.value,
        focused: document.activeElement === document.querySelector(`${sel} input`),
      }), scope);
      const tag = `${w.name} ${s.name}`;
      check(after.value === "", `${tag}: one tap empties the field`, `value=${JSON.stringify(after.value)}`);
      check(after.focused, `${tag}: the field keeps focus`, `focused=${after.focused}`);
      const held = await clear.boundingBox();
      check(!!held && Math.abs(held.x - before.x) < 1 && Math.abs(held.y - before.y) < 1, `${tag}: the ✕ holds its box`, `before=${Math.round(before.x)},${Math.round(before.y)} after=${held ? `${Math.round(held.x)},${Math.round(held.y)}` : "gone"}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
