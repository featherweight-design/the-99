// Gate 2 for #43 Task 10: the Availability ▾ panel on /collection, driven
// rather than read. Signs in, opens the panel at both widths and reports where
// it sits in the filter row, what its four rows say, whether the counts still
// partition the collection, whether a zero-count row resists both the mouse and
// the keyboard, and what the URL, the chips and `Clear all` did.
//
// States are forced at the seam, the same stub `probe-collection-avail.mjs`
// documents: run the dev server with AVAIL_FORCE=1, which buckets every oracle
// id across free/soft/hard/over. A dev account cannot reach `hard` or `over`
// with real figures without a second finished deck competing for a single copy.
// That stub is reverted before the PR opens.
//
// The degraded case is its own run: start the dev server with the stub throwing
// instead, and this reports the disabled trigger and the absent banner.
//
// Run by hand, and not part of `pnpm test` — it needs a browser and a
// signed-in session: `node scripts/probe-collection-filter.mjs`
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

// CLERK_SECRET_KEY is asserted but not bound: `clerkSetup()` reads it from the
// environment itself.
const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// Demanded separately, because a `+clerk_test` fixture address takes the
// email-code path and has no password to supply.
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
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
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor?.emailAddressId,
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

// Where the trigger sits among its siblings, left to right. The design puts it
// fourth on desktop and fifth on phone, and only the drawn order proves it.
async function triggerOrder(page) {
  return page.evaluate(() => {
    const triggers = [...document.querySelectorAll("button")].filter(
      (b) => b.offsetParent && /▾$/.test((b.textContent ?? "").trim()),
    );
    return triggers
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
      .map((b) => (b.textContent ?? "").trim());
  });
}

async function availabilityTrigger(page) {
  return page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((n) =>
      (n.textContent ?? "").trim().startsWith("Availability"),
    );
    if (!b) return null;
    const box = b.getBoundingClientRect();
    return {
      text: (b.textContent ?? "").trim(),
      aria: b.getAttribute("aria-label"),
      disabled: b.disabled,
      height: Math.round(box.height),
    };
  });
}

async function menuRows(page) {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll('[role="option"], [role="menuitemcheckbox"]')];
    return rows.map((r) => {
      const box = r.getBoundingClientRect();
      return {
        text: (r.textContent ?? "").trim(),
        aria: r.getAttribute("aria-label"),
        ariaDisabled: r.getAttribute("aria-disabled"),
        selected: r.getAttribute("aria-selected") ?? r.getAttribute("aria-checked"),
        height: Math.round(box.height),
        glyphs: r.querySelectorAll("svg").length,
      };
    });
  });
}

async function chips(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('button[aria-label^="Remove filter:"]')].map((b) => ({
      aria: b.getAttribute("aria-label"),
      chipText: (b.parentElement?.textContent ?? "").trim(),
      target: Math.round(b.getBoundingClientRect().height),
    })),
  );
}

async function resultCount(page) {
  return page.evaluate(() => {
    const n = [...document.querySelectorAll("span")].find((s) =>
      /^Showing |results$/.test((s.textContent ?? "").trim()),
    );
    return n ? (n.textContent ?? "").trim() : null;
  });
}

// A banner would be a role="status"/"alert" carrying the degraded sentence. The
// design says /collection has none, so the absence is the assertion.
async function banner(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[role="status"], [role="alert"]')]
      .map((n) => (n.textContent ?? "").trim())
      .filter((t) => /availab/i.test(t)),
  );
}

async function openPanel(page) {
  await page.getByRole("button", { name: /Filter by availability/ }).click();
  await page.waitForTimeout(500);
}

function show(title, value) {
  console.log(`\n  --- ${title}`);
  console.log(
    JSON.stringify(value, null, 2)
      .split("\n")
      .map((l) => `  ${l}`)
      .join("\n"),
  );
}

await clerkSetup();
const browser = await chromium.launch();

for (const { label, width, height } of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await signIn(page);
  console.log(`\n########## ${label}`);

  await page.goto(`${BASE}/collection`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  show("filter row order", await triggerOrder(page));
  show("trigger on load", await availabilityTrigger(page));
  show("result count on load", await resultCount(page));
  show("availability banner (expect [])", await banner(page));

  const trigger = await availabilityTrigger(page);
  if (trigger?.disabled) {
    // Degraded run: nothing below is reachable, and that is the finding.
    show("degraded — panel unreachable", trigger);
    await context.close();
    continue;
  }

  await openPanel(page);
  show("menu rows", await menuRows(page));

  // The zero-count row has to resist the mouse AND the keyboard; a click
  // handler that returns early still leaves an arrow-then-Enter path open.
  const dead = (await menuRows(page)).find((r) => r.ariaDisabled === "true");
  if (dead) {
    const before = await resultCount(page);
    await page.getByRole("option", { name: dead.aria ?? dead.text }).click({ force: true });
    await page.waitForTimeout(400);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    show("zero-count row resisted click + keyboard", {
      row: dead.text,
      countBefore: before,
      countAfter: await resultCount(page),
      url: page.url(),
    });
  } else {
    show("zero-count row", "none present under the forced buckets");
  }

  // Pick two live states and confirm the URL, the chips and the count agree.
  const live = (await menuRows(page)).filter((r) => r.ariaDisabled !== "true").slice(0, 2);
  for (const row of live) {
    await page.getByRole("option", { name: row.aria ?? row.text }).click();
    await page.waitForTimeout(500);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  show("after selecting two states", {
    picked: live.map((r) => r.text),
    url: page.url(),
    trigger: await availabilityTrigger(page),
    chips: await chips(page),
    count: await resultCount(page),
  });

  // Resume: the selection has to survive a reload, from the URL alone.
  const selectedUrl = page.url();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  show("after reload", {
    url: page.url(),
    urlUnchanged: page.url() === selectedUrl,
    chips: await chips(page),
    count: await resultCount(page),
  });

  // Reverse: one ✕ removes exactly one state.
  const firstChip = (await chips(page))[0];
  if (firstChip) {
    await page.getByRole("button", { name: firstChip.aria }).click();
    await page.waitForTimeout(500);
    show("after one chip ✕", {
      removed: firstChip.aria,
      url: page.url(),
      chips: await chips(page),
      count: await resultCount(page),
    });
  }

  // Repeat: re-select the same state, then clear everything.
  await openPanel(page);
  const again = (await menuRows(page)).filter((r) => r.ariaDisabled !== "true")[0];
  await page.getByRole("option", { name: again.aria ?? again.text }).click();
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  show("after re-selecting", { url: page.url(), chips: await chips(page) });

  await page.getByRole("button", { name: "Clear all" }).click();
  await page.waitForTimeout(600);
  show("after Clear all", {
    url: page.url(),
    chips: await chips(page),
    count: await resultCount(page),
    trigger: await availabilityTrigger(page),
  });

  await context.close();
}

await browser.close();
