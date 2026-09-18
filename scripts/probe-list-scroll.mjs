// The expandable lists on `/commanders/[slug]`, measured in a real browser at
// 1300x900 and 390x844 — the two rulings there that jsdom cannot answer.
//
// THE SCROLL IS DISCARDED. An expanded list is a scroll box, and its `<ul>` is
// one DOM node across every facet and every disclosure. Collapsing it
// does not write to `scrollTop`, so the offset the reader left survives while the
// box is unscrollable and comes back the moment `maxHeight`/`overflowY` return:
// expanding Creatures, scrolling to the foot, switching to Artifacts and pressing
// `Show all` reopened at the BOTTOM of a list nobody had scrolled. jsdom stores
// `scrollTop` as a plain number with no layout behind it, so the unit test proves
// the write happens and this proves the box actually returns to its top.
//
// THE IDENTITY IS NAMED. `GRU` is the pips again in a second alphabet, beside the
// swatches that already carry the colours. `Temur` is the word a player uses.
//
// Makes no writes. Signs in through Clerk's dev instance — see the local-auth
// note in memory. Point it at `local-dev`, never production.
//
// EVERY visible disclosure is pressed, not the first: the page draws Role
// Coverage's four role lists beside the synergy panel's own, they have the same
// rule, and a run that took the first match measured one of them while naming the
// other. Both had the defect; both take the same hook.
//
//   PROBE_BASE=http://localhost:3010 node scripts/probe-list-scroll.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { PAGE } from "./lib/surface.mjs";

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
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
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

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

/**
 * Every closed `Show all …` disclosure the reader can actually press.
 *
 * VISIBLE ones only, and that clause is load-bearing rather than defensive: Role
 * Coverage draws four disclosures of its own on the same page, and the width this
 * probe is not running at keeps its copy in the DOM. A run that took the first
 * match spent thirty seconds trying to click a hidden button on the panel it was
 * not measuring.
 */
const DISCLOSURES = (page) =>
  [...document.querySelectorAll(`${page} button[aria-expanded="false"]`)]
    .filter((b) => /Show all/.test(b.textContent ?? ""))
    .filter((b) => b.getBoundingClientRect().width > 0 && b.offsetParent !== null)
    .map((b) => b.getAttribute("aria-controls"))
    .filter(Boolean);

/** The named list's own scroll state. */
const LIST = (id) => {
  const ul = document.getElementById(id);
  if (!ul) return null;
  return { top: ul.scrollTop, max: ul.scrollHeight - ul.clientHeight };
};

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();

  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      await signIn(page);

      await page.goto(`${BASE}/commanders`, { waitUntil: "networkidle" });
      await page.waitForTimeout(3_000);
      const slug = await page.evaluate(() =>
        [...document.querySelectorAll('a[href^="/commanders/"]')]
          .map((a) => a.getAttribute("href"))
          .find((h) => h && h !== "/commanders") ?? null);
      if (slug === null) {
        report(`${width}px · a commander to read`, false, "the list drew no row");
        await context.close();
        continue;
      }
      await page.goto(`${BASE}${slug}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(3_000);

      // The identity, by its NAME. Read off the page rather than compared to a
      // second copy of the namer, which would only ever agree with itself: a bare
      // WUBRG run beside the pips is the defect, in any combination.
      const codes = await page.evaluate((p) =>
        [...document.querySelectorAll(`${p} span.font-mono`)]
          .map((s) => (s.textContent ?? "").trim())
          .filter((t) => /^[WUBRG]{2,5}$/.test(t)), PAGE);
      report(
        `${width}px · the identity is named, not spelled`,
        codes.length === 0,
        codes.length === 0 ? "no bare WUBRG run on the page" : `found ${codes.join(", ")}`,
      );

      // Two disclosures are the subject: the first is scrolled to its foot and the
      // SECOND is the one that must open at its top. A commander whose panel draws
      // only one facet deep enough to expand cannot measure this, and says so
      // rather than passing.
      const ids = await page.evaluate(DISCLOSURES, PAGE);
      if (ids.length === 0) {
        report(
          `${width}px · a list deep enough to scroll`,
          false,
          "no facet on this commander's panel expands — NOT a pass: pick a commander with"
            + " more support, or a fuller collection",
        );
        await context.close();
        continue;
      }

      // Every one of them, in turn. Each is opened, scrolled to its foot, closed
      // and opened again — the reported path, reduced to the transition that owes
      // the discard.
      for (const id of ids) {
        await page.click(`[aria-controls="${id}"]`);
        await page.waitForTimeout(400);
        await page.evaluate((listId) => {
          const ul = document.getElementById(listId);
          if (ul) ul.scrollTop = ul.scrollHeight;
        }, id);
        await page.waitForTimeout(200);
        const atFoot = await page.evaluate(LIST, id);
        // A list that does not scroll measured nothing. It is not a failure —
        // a role with 12 cards has no 320px of them — but it is not a pass
        // either, so it is counted and named.
        if (atFoot === null || atFoot.max === 0) {
          console.log(`  --   ${width}px · ${id} — opens without scrolling, nothing to discard`);
          await page.click(`[aria-controls="${id}"]`);
          await page.waitForTimeout(250);
          continue;
        }
        // The SAME button, pressed twice: it is the disclosure's own toggle, and
        // `[aria-expanded="true"]` is not — at 390 the first match on the page
        // belonged to another section, so the list never collapsed, the state
        // never moved, and the check read an offset the effect had never been
        // asked to clear. It failed, correctly, on a working build.
        await page.click(`[aria-controls="${id}"]`);
        await page.waitForTimeout(300);
        await page.click(`[aria-controls="${id}"]`);
        await page.waitForTimeout(400);
        const reopened = await page.evaluate(LIST, id);
        report(
          `${width}px · ${id} reopens at the top`,
          reopened !== null && reopened.top === 0,
          reopened === null
            ? "the list vanished"
            : `left at ${Math.round(atFoot.top)} of ${Math.round(atFoot.max)},`
              + ` reopened at ${Math.round(reopened.top)}`,
        );
        await page.click(`[aria-controls="${id}"]`);
        await page.waitForTimeout(250);
      }

      // And the path as it was REPORTED, which no single disclosure covers: the
      // synergy panel expanded, scrolled to its foot, a different PILL pressed,
      // then `Show all` on the facet that pill selected. The `<ul>` keeps its id
      // across facets, so this is the same box reached a second way.
      const facetIds = await page.evaluate(DISCLOSURES, PAGE);
      const pills = await page.evaluate((p) =>
        [...document.querySelectorAll(`${p} [role="radio"]`)]
          .filter((r) => r.getBoundingClientRect().width > 0 && r.offsetParent !== null)
          .map((r, i) => ({ i, name: r.getAttribute("aria-label") ?? r.textContent ?? "", on: r.getAttribute("aria-checked") === "true" }))
          .filter((r) => !r.on && !/, 0 /.test(r.name)), PAGE);
      if (facetIds.length === 0 || pills.length === 0) {
        report(
          `${width}px · a facet strip with a second populated pill`,
          false,
          "this commander's panel draws one populated facet — NOT a pass: the reported path"
            + " needs two",
        );
      } else {
        const panel = facetIds[facetIds.length - 1];
        await page.click(`[aria-controls="${panel}"]`);
        await page.waitForTimeout(400);
        await page.evaluate((listId) => {
          const ul = document.getElementById(listId);
          if (ul) ul.scrollTop = ul.scrollHeight;
        }, panel);
        await page.waitForTimeout(200);
        await page.evaluate(([p, i]) => {
          [...document.querySelectorAll(`${p} [role="radio"]`)]
            .filter((r) => r.getBoundingClientRect().width > 0 && r.offsetParent !== null)[i]
            .click();
        }, [PAGE, pills[0].i]);
        await page.waitForTimeout(400);
        const reopenable = await page.evaluate(DISCLOSURES, PAGE);
        const next = reopenable.find((r) => r === panel) ?? reopenable[reopenable.length - 1];
        if (next === undefined) {
          report(
            `${width}px · the switched facet expands`,
            false,
            `${pills[0].name.trim()} holds too few rows to expand — NOT a pass`,
          );
        } else {
          await page.click(`[aria-controls="${next}"]`);
          await page.waitForTimeout(400);
          const after = await page.evaluate(LIST, next);
          report(
            `${width}px · a switched facet opens at the top`,
            after !== null && after.top === 0,
            after === null
              ? "the list vanished"
              : `${pills[0].name.trim()} at offset ${Math.round(after.top)} of ${Math.round(after.max)}`,
          );
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run();
