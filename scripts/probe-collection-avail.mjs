// Gate 2 for #43 Task 9: the availability marker on /collection, driven rather
// than read. Signs in, opens /collection at both widths, and reports what the
// rows, the tiles and the card-detail block actually rendered — the drawn text,
// its computed type and colour, the row heights either side of a marker, and
// the sentence a screen reader would get.
//
// States are forced at the seam, the same stub `probe-availability-ui.mjs`
// documents: run the dev server with AVAIL_FORCE=1, which buckets every oracle
// id across free/soft/hard/over. A dev account cannot reach `hard` or `over`
// with real figures without a second finished deck competing for a single copy.
// That stub is reverted before the PR opens.
//
// Run by hand, and not part of `pnpm test` — it needs a browser and a
// signed-in session: `node scripts/probe-collection-avail.mjs`
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

async function rows(page) {
  return page.evaluate(() => {
    const out = [];
    for (const b of document.querySelectorAll("button[aria-label]")) {
      const label = b.getAttribute("aria-label") ?? "";
      if (!b.querySelector("span[title]")) continue;
      const box = b.getBoundingClientRect();
      const marker = [...b.querySelectorAll("span")]
        .reverse()
        .find((n) => /^(\d+ free|\d+ in a draft|short \d+)$/.test((n.textContent ?? "").trim()));
      const name = b.querySelector("span[title]");
      const ms = marker ? getComputedStyle(marker) : null;
      const s = getComputedStyle(b);
      out.push({
        aria: label,
        height: Math.round(box.height),
        border: s.borderTopColor,
        background: s.backgroundColor,
        nameTitle: name?.getAttribute("title") ?? null,
        nameClipped: name ? name.scrollWidth > name.clientWidth + 1 : null,
        marker: marker
          ? {
              text: (marker.textContent ?? "").trim(),
              size: ms.fontSize,
              weight: ms.fontWeight,
              family: ms.fontFamily.split(",")[0],
              tracking: ms.letterSpacing,
              width: Math.round(marker.getBoundingClientRect().width),
            }
          : null,
      });
    }
    return out;
  });
}

async function tiles(page) {
  return page.evaluate(() => {
    const out = [];
    for (const b of document.querySelectorAll("button")) {
      const art = b.querySelector("div.relative");
      if (!art) continue;
      const chip = [...art.children].find((n) =>
        /free|in a draft|short/.test((n.textContent ?? "").trim()),
      );
      const badge = [...art.children].find((n) => (n.textContent ?? "").trim().startsWith("×"));
      const artBox = art.getBoundingClientRect();
      const rel = (n) => {
        const r = n.getBoundingClientRect();
        return { left: Math.round(r.left - artBox.left), top: Math.round(r.top - artBox.top) };
      };
      out.push({
        name: b.querySelector("div.truncate")?.textContent?.trim(),
        border: getComputedStyle(b).borderTopColor,
        badge: badge ? { text: badge.textContent.trim(), ...rel(badge) } : null,
        chip: chip
          ? {
              text: chip.textContent.trim(),
              ...rel(chip),
              label: (() => {
                // `spoken` appends an sr-only prose span, so "last span" is the
                // wrong one to measure — take the one carrying the drawn text.
                const l = [...chip.querySelectorAll("span")].find((n) =>
                  /^(\d+ free|\d+ in a draft|short \d+)$/.test((n.textContent ?? "").trim()),
                );
                const s = getComputedStyle(l);
                return { size: s.fontSize, weight: s.fontWeight, family: s.fontFamily.split(",")[0] };
              })(),
              bg: getComputedStyle(chip).backgroundColor,
              overflowsArt: chip.getBoundingClientRect().right > artBox.right,
            }
          : null,
      });
      if (out.length >= 8) break;
    }
    return out;
  });
}

async function detail(page) {
  return page.evaluate(() => {
    const heading = [...document.querySelectorAll("div")].find(
      (n) => (n.textContent ?? "").trim() === "In your collection" && n.children.length === 0,
    );
    if (!heading) return null;
    const block = heading.parentElement;
    return [...block.children].map((n) => ({
      text: (n.textContent ?? "").trim(),
      size: getComputedStyle(n).fontSize,
      colour: getComputedStyle(n).color,
    }));
  });
}

function show(title, value) {
  console.log(`\n  --- ${title}`);
  console.log(JSON.stringify(value, null, 2).split("\n").map((l) => `  ${l}`).join("\n"));
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

  // Both views are reachable at both widths; the default just differs.
  await page.getByRole("button", { name: "Rows view" }).click();
  await page.waitForTimeout(900);
  const all = await rows(page);
  // The load-bearing comparison: a marked row must be exactly as tall as a bare
  // one, or the marker has pushed the list around.
  const heights = (f) => [...new Set(all.filter(f).map((r) => r.height))];
  show("row heights", {
    bare: heights((r) => !r.marker),
    marked: heights((r) => r.marker),
    bareCount: all.filter((r) => !r.marker).length,
    markedCount: all.filter((r) => r.marker).length,
  });
  show("rows (first 8)", all.slice(0, 8));

  await page.getByRole("button", { name: "Grid view" }).click();
  await page.waitForTimeout(900);
  show("tiles", (await tiles(page)).slice(0, 4));

  await page.getByRole("button", { name: "Rows view" }).click();
  await page.waitForTimeout(700);

  // Open a card that is committed, so the detail block has something to draw.
  const committed = page.locator("button[aria-label*='no free copies']").first();
  if (await committed.count()) {
    await committed.click();
    await page.waitForTimeout(900);
    show("card detail", await detail(page));
    await page.keyboard.press("Escape");
  } else {
    console.log("\n  --- card detail: NO COMMITTED ROW FOUND");
  }

  await context.close();
}

await browser.close();
