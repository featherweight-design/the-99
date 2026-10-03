// Gate 2 for #43 Task 10: the Availability filter on /collection, driven
// rather than read. Signs in, drives it at both widths and reports where it
// sits, what its four values say, whether the counts still partition the
// collection, whether a zero-count value resists both the mouse and the
// keyboard, and what the URL, the chips and `Clear all` did.
//
// The two widths are NOT the same control. The wide form keeps the dropdown
// panel this probe was written for: a `Filter by availability` trigger opens
// a listbox of `role="option"` rows. The compact form has none of that —
// `filter-sheet.tsx` draws Availability as four `role="switch"` SheetChips
// directly in the sheet, with no nested panel to open. A phone run that still
// looked for the wide trigger inside an opened sheet found nothing and either
// threw or silently measured zero of everything; `openSheet` alone (from
// `lib/surface.mjs`) does not fix that, because the button it would then
// click does not exist at this width. The phone path below presses the
// chips directly and reads `aria-checked` rather than `aria-selected`.
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
import { openSheet } from "./lib/surface.mjs";

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

// The compact form's four values, read as SheetChips rather than listbox
// options. Scoped to the `role="group"` whose `aria-label` names Availability
// — "Availability" live, or the degraded sentence (`collectionFilterDisabledAria`,
// which still contains the word) when the aggregate could not be read — so a
// phone run cannot wander into the Color or Set groups beside it.
//
// Scoped to the SHEET'S OWN dialog, the one `openSheet` returns, never the
// whole page — the single-scope convention `lib/surface.mjs` states for
// exactly this reason: an unscoped `[role="group"]` lookup can resolve
// against a matching group the shell renders outside `<main>`, which is the
// same substitution that produced two false findings in `probe-sets.mjs`.
// A caller with no dialog (the trigger never opened) gets `page.locator(...)`
// with no matches rather than a crash, which still reads as the group not
// being found.
function availabilityChipsLocator(dialogOrPage) {
  return dialogOrPage.locator('[role="group"][aria-label*="vailab" i]').getByRole("switch");
}

function availabilityChipLocator(dialogOrPage, index) {
  return availabilityChipsLocator(dialogOrPage).nth(index);
}

// Playwright locators throughout, not `page.evaluate`, so this reads the
// SAME nodes `availabilityChipLocator` clicks — a `nth(i)` into one is valid
// against the other only because both walk the same scoped locator. Returns
// null when the sheet carries no such group at all, which the caller treats
// as its own finding rather than crashing on an empty array.
async function availabilityChipsPhone(dialogOrPage) {
  const switches = availabilityChipsLocator(dialogOrPage);
  const count = await switches.count();
  if (count === 0) return null;
  const chips = [];
  for (let i = 0; i < count; i++) {
    const chip = switches.nth(i);
    const box = await chip.boundingBox();
    chips.push({
      text: ((await chip.textContent()) ?? "").trim(),
      aria: await chip.getAttribute("aria-label"),
      checked: await chip.getAttribute("aria-checked"),
      disabled: await chip.getAttribute("aria-disabled"),
      height: box ? Math.round(box.height) : null,
    });
  }
  return chips;
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

// A bounded click, failing LOUDLY rather than hanging. Playwright's default
// actionability timeout is 30s, and a broken filter effect (the phone path's
// "Clear all" never clears because no chip's click ever actually applied)
// waits out that whole 30s before an uncaught `TimeoutError` kills the
// process — which prints a stack trace, not a named finding, and reads as
// "still running" for anyone watching rather than as a failure. This prints
// `FAIL <label>` and exits 1 at a 5s bound instead, so a broken effect is a
// fast, readable red rather than a slow, silent one.
async function requireClick(locator, label, opts = {}) {
  try {
    await locator.click({ timeout: 5_000, ...opts });
  } catch (error) {
    console.log(`\nFAIL ${label}: ${(error?.message ?? String(error)).split("\n")[0]}`);
    process.exit(1);
  }
}

await clerkSetup();
const browser = await chromium.launch();

// An unreachable phone control used to close its context and move on to the
// desktop leg silently — a run that found nothing at 390 still exited 0.
// Both legs still run either way, so a real finding at one width is never
// hidden by a pass at the other, but the run as a whole reports red.
let exitCode = 0;

for (const { label, width, height } of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await signIn(page);
  console.log(`\n########## ${label}`);

  await page.goto(`${BASE}/collection`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  show("filter row order", await triggerOrder(page));
  show("result count on load", await resultCount(page));
  show("availability banner (expect [])", await banner(page));

  if (width === 390) {
    // The compact form: no `Filter by availability` trigger exists at this
    // width, wide or degraded — `triggerOrder`/`availabilityTrigger` above
    // would read null or absent for it either way, which is the point this
    // branch exists to stop mistaking for "unreachable".
    let dialog = await openSheet(page);
    if (!dialog) {
      // Unreachable, and loudly: closing the context and moving on to the
      // desktop leg must not look like a pass. A silent `continue` here is
      // exactly the regression this rewrite exists to stop.
      show("phone — no sheet trigger found", null);
      exitCode = 1;
      await context.close();
      continue;
    }
    await page.waitForTimeout(300);

    const chipsOnOpen = await availabilityChipsPhone(dialog);
    show("phone — availability chips on open", chipsOnOpen);
    if (chipsOnOpen === null) {
      show("phone — no availability group found in the sheet", null);
      exitCode = 1;
      await context.close();
      continue;
    }
    if (chipsOnOpen.length > 0 && chipsOnOpen.every((c) => c.disabled === "true")) {
      // Degraded run: every chip refuses the mouse, and that is the finding —
      // not a failure of the probe, so it does not mark `exitCode`.
      show("phone — degraded, every chip disabled", chipsOnOpen);
      await context.close();
      continue;
    }

    // The zero-count chip has to resist the mouse AND the keyboard; a click
    // handler that returns early still leaves a focus-then-Enter path open.
    const deadIndex = chipsOnOpen.findIndex((c) => c.disabled === "true");
    const dead = deadIndex === -1 ? undefined : chipsOnOpen[deadIndex];
    if (dead) {
      const before = await resultCount(page);
      const deadChip = availabilityChipLocator(dialog, deadIndex);
      await requireClick(deadChip, "phone — zero-count chip (mouse)", { force: true });
      await page.waitForTimeout(300);
      await deadChip.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      show("phone — zero-count chip resisted click + keyboard", {
        chip: dead.text,
        countBefore: before,
        countAfter: await resultCount(page),
        url: page.url(),
      });
    } else {
      show("phone — zero-count chip", "none present under the forced buckets");
    }

    // Pick two live states and confirm the URL, the page's own chips and the
    // count agree — read through `aria-checked`, the chip's own state, never
    // `aria-selected`, which `role="switch"` does not carry.
    const afterDead = await availabilityChipsPhone(dialog);
    const liveIndices = afterDead
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.disabled !== "true")
      .slice(0, 2);
    for (const { c, i } of liveIndices) {
      await requireClick(availabilityChipLocator(dialog, i), `phone — select "${c.text}"`);
      await page.waitForTimeout(400);
    }
    const live = liveIndices.map(({ c }) => c);
    show("phone — after selecting two states", {
      picked: live.map((c) => c.text),
      url: page.url(),
      chips: await chips(page),
      count: await resultCount(page),
      availabilityChips: await availabilityChipsPhone(dialog),
    });

    // Resume: the selection has to survive a reload, from the URL alone. The
    // sheet is client state and does not survive the reload on its own, so
    // it is reopened here to read the chips' state rebuilt from that URL —
    // a fact about the sheet, not about anything persisting in the DOM.
    const selectedUrl = page.url();
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    show("phone — after reload", {
      url: page.url(),
      urlUnchanged: page.url() === selectedUrl,
      chips: await chips(page),
      count: await resultCount(page),
    });
    dialog = await openSheet(page);
    await page.waitForTimeout(300);
    show(
      "phone — chips rebuilt from the URL after reload",
      dialog ? await availabilityChipsPhone(dialog) : null,
    );

    // The sheet's scrim sits over the page's own chip row and intercepts a
    // click aimed at it, so it has to close first — `useDialogA11y` binds
    // Escape to the sheet's own `onDismiss`.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // Reverse: one ✕ removes exactly one state. The page's own chip row sits
    // outside the sheet (`filter-chassis.tsx`'s chip line), so this reads the
    // same whether or not the sheet happens to be open — once it is closed.
    const firstChip = (await chips(page))[0];
    if (firstChip) {
      await requireClick(
        page.getByRole("button", { name: firstChip.aria }),
        "phone — remove filter chip",
      );
      await page.waitForTimeout(500);
      show("phone — after one chip ✕", {
        removed: firstChip.aria,
        url: page.url(),
        chips: await chips(page),
        count: await resultCount(page),
      });
    }

    // Repeat: re-select the same state, then clear everything. `Clear all`
    // is the same page-level control as the ✕ above, not a sheet footer.
    dialog = await openSheet(page);
    await page.waitForTimeout(300);
    if (dialog) {
      const afterChip = await availabilityChipsPhone(dialog);
      const againIndex = afterChip?.findIndex((c) => c.disabled !== "true") ?? -1;
      if (againIndex !== -1) {
        await requireClick(availabilityChipLocator(dialog, againIndex), "phone — re-select a chip");
        await page.waitForTimeout(400);
      }
    }
    show("phone — after re-selecting", { url: page.url(), chips: await chips(page) });

    // Same scrim, same reason: close the sheet before reaching for the
    // page-level control behind it.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    await requireClick(page.getByRole("button", { name: "Clear all" }), "phone — Clear all");
    await page.waitForTimeout(600);
    show("phone — after Clear all", {
      url: page.url(),
      chips: await chips(page),
      count: await resultCount(page),
    });

    await context.close();
    continue;
  }

  show("trigger on load", await availabilityTrigger(page));
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
process.exit(exitCode);
