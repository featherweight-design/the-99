// Gate for #213/#214 Phase 11: the three discovery empty states and the reveal
// window, driven rather than read. Opens `/commanders?scope=play` at both widths
// and reports what actually rendered — which state fired, the strings it carried,
// and whether the reveal control sits in the list with the row gap reaching it.
//
// Two of the three empties need data no real collection produces, so each has a
// scratch lever. Edit, restart the dev server — the floor is read at module load
// — probe, then revert:
//
//   Floor empty: `PROBE_PATH=/commanders?scope=play&sort=new`, because the floor
//     only filters under the novelty sort, plus `NOVELTY_FLOOR` in
//     `src/lib/discovery/floor.ts` raised above the best candidate's overlap.
//   No-decks banner: `loadPlayedTags` in `src/lib/discovery/novelty.ts` returning
//     `[]`. Deleting the fixture account's decks would do it too and is worse:
//     the rows carry `deck_cards` that nothing here needs to touch.
//   Filtered empty: a colour no candidate covers. Under the novelty sort with the
//     floor raised to leave a handful, `&c=WUBRG` empties the list; its built
//     clause needs one built deck whose identity covers the filter.
//
// Run by hand: `PROBE_BASE=http://localhost:3001 node scripts/probe-discovery-ui.mjs`.
// Not part of `pnpm test`: it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PATH = process.env.PROBE_PATH ?? "/commanders?scope=play";

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
];

// Lifted verbatim from `scripts/probe-rollup-ui.mjs`, which documents at length
// why the hosted portal cannot be driven unattended and `window.Clerk` can.
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
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

// Only the visible half. Both widths render into the DOM, so reading text
// content alone would report the desktop copy while looking at a phone.
async function read(page) {
  return page.evaluate(() => {
    // `sr-only` clips to a 1px box rather than leaving the layout, so it has
    // client rects and passes for on-screen text. The live region is reported
    // separately below; without this it would also arrive as a leaf, reading as
    // copy a sighted user can see.
    const visible = (n) => n.getClientRects().length > 0 && !n.closest(".sr-only");
    const leaves = [];
    for (const node of document.querySelectorAll("main h1, main h2, main p, main span, main button")) {
      if (!visible(node) || node.children.length > 0) continue;
      const text = (node.textContent ?? "").trim();
      if (text === "") continue;
      leaves.push(text);
    }

    const main = document.querySelector("main");
    const list = main?.querySelector("ul") ?? null;
    const rows = list ? [...list.querySelectorAll(":scope > li")].filter(visible) : [];
    const reveal = [...(main?.querySelectorAll("button") ?? [])].find(
      (b) => visible(b) && /Show \d+ more/.test(b.getAttribute("aria-label") ?? ""),
    );

    // The claim the review round turned on: the gap between the control and the
    // card above it is the list's own row gap, which only reaches it inside the
    // `<ul>`. Measured, not asserted from the class string.
    //
    // Measured from the control's own row and its predecessor, never from the
    // last two rows: those are the same pair only while the control is in the
    // list, so the shortcut would report a real number — the gap between two
    // cards — in exactly the case this is here to catch.
    let revealGap = null;
    const revealRow = reveal?.closest("li");
    const revealIndex = revealRow ? rows.indexOf(revealRow) : -1;
    if (revealIndex > 0) {
      const prev = rows[revealIndex - 1];
      revealGap = Math.round(
        revealRow.getBoundingClientRect().top - prev.getBoundingClientRect().bottom,
      );
    }

    return {
      leaves,
      rowCount: rows.length,
      listGap: list ? getComputedStyle(list).rowGap : null,
      reveal: reveal
        ? {
            insideList: !!reveal.closest("ul"),
            aria: reveal.getAttribute("aria-label"),
            band: reveal.textContent.trim(),
            gapAbove: revealGap,
          }
        : null,
      liveRegion: main?.querySelector('[aria-live="polite"]')?.textContent ?? null,
      // The empties mark one phrase inside their body, so the paragraph has a
      // child and never reaches `leaves` — the sentence carrying the server's
      // figures would otherwise be the one string the probe could not report.
      paragraphs: [...(main?.querySelectorAll("p") ?? [])]
        .filter((p) => visible(p) && p.children.length > 0)
        .map((p) => p.textContent.trim()),
    };
  });
}

function report(label, seen) {
  console.log(`\n--- ${label}`);
  console.log(`  rows in list: ${seen.rowCount} · list row-gap ${seen.listGap}`);
  if (seen.reveal) {
    console.log(`  reveal: insideList=${seen.reveal.insideList} gapAbove=${seen.reveal.gapAbove}px`);
    console.log(`  reveal aria: ${seen.reveal.aria}`);
    console.log(`  reveal text: ${seen.reveal.band}`);
  } else {
    console.log("  reveal: absent");
  }
  console.log(`  live region: ${JSON.stringify(seen.liveRegion)}`);
  for (const p of seen.paragraphs) console.log(`  ¶ ${p}`);
  for (const l of seen.leaves) console.log(`    · ${l}`);
}

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}${PATH}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    report(`${vp.label} — ${PATH}`, await read(page));

    // The reveal's own effects: the announcement and the focus move only exist
    // after a real click, so they cannot be read off the first paint.
    const control = page.locator('main button[aria-label^="Show "]').first();
    if (await control.count()) {
      await control.click();
      await page.waitForTimeout(600);
      const after = await read(page);
      console.log(`  after reveal → rows ${after.rowCount}, live ${JSON.stringify(after.liveRegion)}`);
      console.log(`  focus now on: ${await page.evaluate(() => document.activeElement?.tagName)}`);
    }

    await page.screenshot({
      path: `/tmp/discovery-${vp.width}.png`,
      fullPage: true,
    });
    await context.close();
  }
} finally {
  await browser.close();
}
