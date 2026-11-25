// Probe: the landing's "how it works" steps under the on-page copy editor. Each step is a bold lead plus a body in one
// span (src/components/landing/bring.tsx). Pressing each part must open its OWN row, never a template that fits the
// whole line (help-me-choose-history row.aria once did). The landing is signed-out and the editor is admin-only, so this
// signs in, injects the step markup built from the real copy leaf into /decks, and presses each part.
//   PROBE_BASE=http://localhost:3410 E2E_AUDIT_USER_EMAIL=... node scripts/probe-copy-editor-steps.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3410";
const VPS = [
  { label: "phone", width: 390, height: 844, touch: true },
  { label: "desktop", width: 1300, height: 900, touch: false },
];
let failed = 0;
const check = (n, ok, d = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : d ? `  (${d})` : ""}`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const f = await page.evaluate(async (email) => {
    try {
      const s = window.Clerk.client.signIn;
      let a = await s.create({ identifier: email });
      if (a.status === "needs_first_factor" || a.status === "needs_client_trust") {
        const fac = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
        await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: fac?.emailAddressId });
        a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (a.status !== "complete") return `status ${a.status}`;
      await window.Clerk.setActive({ session: a.createdSessionId });
      return null;
    } catch (e) {
      return e?.errors?.[0]?.longMessage ?? String(e);
    }
  }, EMAIL);
  if (f) throw new Error(`sign-in failed: ${f}`);
}

const browser = await chromium.launch();
try {
  await clerkSetup();
  const all = JSON.parse(readFileSync(new URL("../.generated/copy-rows.json", import.meta.url), "utf8"));
  const list = Array.isArray(all) ? all : all.rows;
  const steps = [0, 1, 2].map((i) => ({
    b: list.find((r) => r.key.endsWith(`landingCopy.bring.firstTimer.steps[${i}].b`)),
    rest: list.find((r) => r.key.endsWith(`landingCopy.bring.firstTimer.steps[${i}].rest`)),
  })).filter((s) => s.b && s.rest);
  check("rows: step rows found", steps.length > 0, String(steps.length));
  for (const vp of VPS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });
    const page = await ctx.newPage();
    await signIn(page);
    await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const door = vp.touch ? page.locator('button[aria-label="Edit copy"]:visible') : page.locator("button:visible", { hasText: "Edit copy" });
    await door.first().click();
    await page.waitForTimeout(1500);
    await page.evaluate((ss) => {
      const ol = document.createElement("ol");
      ol.id = "probe-steps";
      ol.style.cssText = "position:fixed;top:90px;left:12px;right:12px;z-index:1;margin:0;padding:12px;list-style:none;background:#fff;color:#000;display:flex;flex-direction:column;gap:10px";
      for (const s of ss) {
        const li = document.createElement("li");
        const span = document.createElement("span");
        const b = document.createElement("b");
        b.textContent = s.b.text;
        span.append(b, ` ${s.rest.text}`);
        li.append(span);
        ol.append(li);
      }
      // Only the steps may carry text, so no other line's outline sits under a press.
      for (const el of [...document.body.children]) if (!el.hasAttribute("data-copy-editor") && !/^(SCRIPT|STYLE)$/.test(el.tagName)) el.style.display = "none";
      document.body.append(ol);
    }, steps);
    await page.waitForTimeout(1500);
    for (const [i, s] of steps.entries()) {
      for (const [part, want] of [["lead", s.b], ["body", s.rest]]) {
        const pt = await page.evaluate(([idx, p]) => {
          const li = document.querySelectorAll("#probe-steps li")[idx];
          const span = li.querySelector("span");
          const b = li.querySelector("b");
          let r;
          if (p === "lead") r = b.getBoundingClientRect();
          else {
            const range = document.createRange();
            range.setStart(span.lastChild, 2);
            range.setEnd(span.lastChild, 12);
            r = range.getBoundingClientRect();
          }
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }, [i, part]);
        if (vp.touch) await page.touchscreen.tap(pt.x, pt.y);
        else await page.mouse.move(pt.x, pt.y);
        await page.waitForTimeout(300);
        let tag = (await page.locator("[data-copy-tag]").innerText().catch(() => "")).replace(/\s+/g, " ");
        check(`${vp.label} step ${i + 1} ${part}: targets its own row (${want.key.split("#")[1].split(".").slice(-2).join(".")})`, tag.includes(`steps[${i}].${want.key.endsWith(".b") ? "b" : "rest"}`) && !/row\.aria/.test(tag), tag);
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
