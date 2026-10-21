import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

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
          if (!factor?.emailAddressId) {
            const offered = (attempt.supportedFirstFactors ?? []).map((f) => f.strategy).join(", ");
            return `${email} offers no usable email_code first factor (offered: ${offered || "none"}). The probe user must be a +clerk_test address.`;
          }
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
          });
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


// Gate for the phone deck header's action row (Update from a list, Export, Commit as vN, the
// deck's ⋯): ONE line at 360, 375, 390 and 430. JSDOM applies no CSS, so only a browser can say
// whether the row wrapped. The row is measured on every deck that draws it; the commit control's
// label is also stretched to "Commit as v12" in the page, since the header itself only ever
// carries "Commit as v1" (later versions live in the pending banner).
//
// Run by hand, not part of `pnpm test`:   node scripts/probe-deck-action-row.mjs
const WIDTHS = [360, 375, 390, 430];
const fails = [];
const fail = (line) => {
  fails.push(line);
  console.log(`  FAIL ${line}`);
};

const READ_ROW = `(label) => {
  const row = [...document.querySelectorAll('[data-spine-actions]')].find((r) => r.getClientRects().length > 0);
  if (!row) return { found: false };
  const commit = [...row.querySelectorAll('a')].find((a) => /^Commit as v/.test(a.textContent.trim()));
  if (commit && label) commit.textContent = label;
  const kids = [...row.children].map((c) => c.getBoundingClientRect());
  const exp = [...row.querySelectorAll('button')].find((b) => /Export/.test(b.textContent));
  // Name = text a screen reader gets: an sr-only span is exposed, a display:none one is not.
  return {
    found: true,
    hasCommit: Boolean(commit),
    tops: [...new Set(kids.map((r) => Math.round(r.top)))],
    right: Math.max(...kids.map((r) => r.right)),
    left: Math.min(...kids.map((r) => r.left)),
    overflow: row.scrollWidth > row.clientWidth,
    exportName: exp ? ([...exp.querySelectorAll('span')].filter((n) => getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden').map((n) => n.textContent).join('').trim()) : null,
    exportW: exp ? Math.round(exp.getBoundingClientRect().width) : null,
    count: kids.length,
  };
}`;

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    const deckPaths = await page.evaluate(
      `[...new Set([...document.querySelectorAll('a[href^="/decks/"]')].map((a) => a.getAttribute('href')).filter((h) => /^\\/decks\\/[0-9a-f-]{36}$/.test(h)))]`,
    );
    let measured = 0;
    let withCommit = 0;
    for (const path of deckPaths) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      for (const label of [null, "Commit as v12"]) {
        const r = await page.evaluate(`(${READ_ROW})(${JSON.stringify(label)})`);
        if (!r.found) continue;
        if (label === null) measured += 1;
        if (r.hasCommit) withCommit += label === null ? 1 : 0;
        else if (label) continue;
        const tag = `${width}px ${path} ${label ?? "as shipped"}`;
        console.log(`${tag}: ${r.count} controls, tops ${r.tops}, right ${Math.round(r.right)}, export "${r.exportName}" ${r.exportW}px`);
        if (r.tops.length > 1) fail(`${tag}: row wrapped onto ${r.tops.length} lines`);
        if (r.overflow || r.right > width + 0.5 || r.left < -0.5) fail(`${tag}: row overflows the viewport`);
        if (r.exportName !== null && r.exportName === "") fail(`${tag}: Export lost its accessible name`);
      }
    }
    if (!measured) fail(`${width}px: no deck drew the action row`);
    if (!withCommit) console.log(`  note ${width}px: no deck offered a first commit; "Commit as v12" not measured here`);
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`\n${fails.length} failures.`);
if (fails.length) process.exitCode = 1;
