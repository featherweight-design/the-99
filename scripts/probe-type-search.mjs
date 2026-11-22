// Collection Type search, at 390x844 and 1300x900. Typing a type-line word in /collection's search finds cards
// by type as well as name: "zombie" and "saga" must return cards, a word that is no name and no type returns none,
// and "art" must not return a card only because it is an Artifact. Read-only. The account needs a Zombie that is
// not named for one (it fails on main when none matches by name).
//
//   PROBE_BASE=http://localhost:<port> [PROBE_SHOTS=<dir>] pnpm probe:type-search
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
];

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async ([email, password]) => {
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
  }, [EMAIL, PASSWORD ?? ""]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const VIEW = VIEWPORTS;
let failed = 0;
const check = (label, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`); if (!ok) failed++; };
await clerkSetup();
const browser = await chromium.launch();
for (const vp of VIEW) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  await signIn(page);
  const count = async (q) => {
    await page.goto(`${BASE}/collection?view=grid&q=${encodeURIComponent(q)}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
    return page.locator("[data-collection-tile]").count();
  };
  const zombie = await count("zombie");
  if (process.env.PROBE_SHOTS) await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none!important}" });
  if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/zombie-${vp.width}.png` });
  const saga = await count("saga");
  const art = await count("art");
  const artifact = await count("artifact");
  const none = await count("xqzvkw");
  check(`${vp.label}: "zombie" finds cards`, zombie > 0, `${zombie}`);
  check(`${vp.label}: "saga" finds cards`, saga > 0, `${saga}`);
  check(`${vp.label}: "artifact" finds the Artifacts`, artifact > 0, `${artifact}`);
  check(`${vp.label}: "art" is not "artifact"`, art < artifact, `art ${art}, artifact ${artifact}`);
  check(`${vp.label}: nonsense finds none`, none === 0, `${none}`);
  await context.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
