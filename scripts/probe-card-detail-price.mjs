// The price under the art, and the zoom, in the card modal (card-detail R2, §1-§3).
//
// What a browser proves and a test cannot — LAID-OUT GEOMETRY, and nothing else:
// that the tag paints at all; where the stack under the card begins relative to the
// art (10px) and in what order its rows sit; that it fits a short window rather than
// being clipped by the dialog; that the art turns; and that the zoom is the DIALOG's
// rectangle rather than the viewport's. DESKTOP ONLY: the phone's art header, its
// stack and its zoom retired with the card carousel's phone round (R2).
//
// It makes no writes. It used to pick a different printing to prove the figure
// follows the art; that is proved by `card-modal-price.test.tsx` instead, and picking
// persists an art preference on the account being probed. See the note at the pick
// site below.
//
// Run by hand with the dev server up:
//   PROBE_CARD="<card name>" node scripts/probe-card-detail-price.mjs
// The turn is only checked on a two-faced card, and the script says so rather than
// passing quietly. Run it a second time against a `transform` card with
// PROBE_TWO_FACED=1, which makes a missing turn control a failure.
// Add PROBE_PRICED=1 where the card has a figure, which makes a missing tag a
// failure rather than a state the run could not judge. It is the caller's claim
// on purpose: read off the page it would be an assertion that cannot fail.
//
// PROBE_CARD can be any card the signed-in account owns.
// Not part of `pnpm test`: it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, settled } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
/**
 * The reader's claim that PROBE_CARD has a figure, which makes the tag's absence
 * a defect. It cannot be read off the page: "there is a tag, so a tag was
 * expected" is an assertion that cannot fail.
 */
const EXPECT_PRICED = process.env.PROBE_PRICED === "1";
const CARD = process.env.PROBE_CARD;
if (!CARD) throw new Error("Set PROBE_CARD to a card the account owns.");

// Lifted from `scripts/probe-card-detail-availability.mjs`, which documents at
// length why the hosted portal cannot be driven unattended and `window.Clerk` can.
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

/**
 * What each placement is showing, and whether assistive tech can reach it. `aria-hidden` is asked of the ANCESTOR chain rather than the
 * node, because the trap is a heading wrapper, not the tag itself.
 */
async function readPrice(page) {
  return page.evaluate(() => {
    const read = (id) => {
      // Both breakpoint trees are mounted at once and separated by CSS, so the
      // first node with a given test id is not necessarily the one being painted —
      // and a hidden one measures zero, which would make every figure below a
      // fiction. The visible one is the placement under test.
      const node = [...document.querySelectorAll(`[data-testid="${id}"]`)]
        .find((n) => n.getBoundingClientRect().width > 0);
      if (!node) return null;
      const tag = node.querySelector("span[class*='font-mono']") ?? node;
      const style = getComputedStyle(tag);
      return {
        text: (node.textContent ?? "").trim(),
        ink: style.color,
        border: style.border,
        hiddenFromScreenReaders: Boolean(node.closest("[aria-hidden='true']")),
        // The gap between the art and the tag, measured rather than asserted from
        // the class list — a margin a sibling collapses is a margin that is not there.
        gapFromArt: (() => {
          // By test id, NOT by `[style*="63/88"]`: Chromium serialises the inline
          // style as `aspect-ratio: 63 / 88`, spaces and all, so that selector
          // matches nothing and the measurement silently became null. Both
          // breakpoint trees are mounted at once, so the visible box is still the
          // one to measure.
          const art = ["modal-art-desktop", "modal-art-mobile"]
            .flatMap((t) => [...document.querySelectorAll(`[data-testid="${t}"]`)])
            .find((n) => n.getBoundingClientRect().width > 0);
          if (!art) return null;
          return Math.round(node.getBoundingClientRect().top - art.getBoundingClientRect().bottom);
        })(),
      };
    };
    // No `compact` key: the compact header retired with the phone's art header.
    return {
      desktop: read("modal-price-desktop"),
      mobile: read("modal-price-mobile"),
    };
  });
}

/**
 * What sits UNDER the card, and in what order (#3, #4): the zoom hint, then the
 * turn control, then the price. The stack's own top is the placement ruling now
 * — 10px under the desktop art — because the price is its last
 * row rather than its only one, and measuring the price against the art would
 * turn every change of line-height above it into a failing figure.
 *
 * Order is measured rather than read off the markup: all three are laid out by a
 * flex column, and a column whose `flex-direction` or source order slipped would
 * still carry every element the DOM check looks for.
 */
async function readUnderCard(page) {
  return page.evaluate(() => {
    const visible = (sel, root = document) =>
      [...root.querySelectorAll(sel)].find((n) => n.getBoundingClientRect().width > 0) ?? null;
    const stack = visible('[data-testid="modal-under-card"]');
    if (!stack) return null;
    const art = ["modal-art-desktop", "modal-art-mobile"]
      .flatMap((t) => [...document.querySelectorAll(`[data-testid="${t}"]`)])
      .find((n) => n.getBoundingClientRect().width > 0);
    const top = (n) => (n ? Math.round(n.getBoundingClientRect().top) : null);
    const hint = stack.querySelector('[data-testid="modal-zoom-hint"]');
    const turn = stack.querySelector('button[aria-label^="Turn over to"]');
    const price = stack.querySelector('[data-testid^="modal-price-"]');
    return {
      gapFromArt: art
        ? Math.round(stack.getBoundingClientRect().top - art.getBoundingClientRect().bottom)
        : null,
      hint: hint?.textContent?.trim() ?? null,
      order: { hint: top(hint), turn: top(turn), price: top(price) },
      hasTurn: Boolean(turn),
      hasPrice: Boolean(price),
      // The ⤢ plate the hint replaced. It has no test id of its own, so the check
      // is the glyph: if it is anywhere in the dialog, the mark came back.
      zoomGlyphStillDrawn: (document.querySelector('[role="dialog"]')?.textContent ?? "")
        .includes("\u2922"),
    };
  });
}

function assertUnderCard(where, stack, expectedGap, expectedHint, priced) {
  if (!stack) {
    console.log(`\nFAIL: ${where} drew nothing under the card at all.`);
    process.exitCode = 1;
    return;
  }
  if (stack.gapFromArt === null || Math.abs(stack.gapFromArt - expectedGap) > 1) {
    console.log(
      `\nFAIL: ${where} stack sits ${stack.gapFromArt}px under the art, expected ${expectedGap}px.`,
    );
    process.exitCode = 1;
  }
  if (stack.hint !== expectedHint) {
    console.log(`\nFAIL: ${where} hint reads ${JSON.stringify(stack.hint)}, expected ${JSON.stringify(expectedHint)}.`);
    process.exitCode = 1;
  }
  // Hint above turn above price, with whichever rows this card has.
  const rows = [stack.order.hint, stack.order.turn, stack.order.price].filter((t) => t !== null);
  if (rows.some((t, i) => i > 0 && t <= rows[i - 1])) {
    console.log(
      `\nFAIL: ${where} stack is out of order — hint, turn, price top to bottom, got`
        + ` ${JSON.stringify(stack.order)}.`,
    );
    process.exitCode = 1;
  }
  if (stack.zoomGlyphStillDrawn) {
    console.log(`\nFAIL: ${where} still draws the \u2922 plate the hint replaced.`);
    process.exitCode = 1;
  }
  // "THE TAG PAINTS AT ALL" is this probe's oldest claim, and it was reduced to a
  // log line when the compact check went: every geometry check above passes on a
  // card with no figure, because the hint stack is there either way.
  //
  // The EXPECTATION comes from the caller, never from the render. Reading it back
  // off the page — "there is a tag, so a tag was expected" — is an assertion that
  // cannot fail, which is worse than none: removing `priceTag` from the modal
  // flips both sides together and the run stays green. `PROBE_PRICED=1` is the
  // reader saying this card HAS a figure, and only then is its absence a defect.
  if (priced) {
    if (!stack.hasPrice) {
      console.log(
        `\nFAIL: ${where} has a figure for this printing and drew no tag under the card.`,
      );
      process.exitCode = 1;
    }
  } else {
    console.log(
      `\nNOT EXERCISED: ${where} — "the tag paints" was not checked. Run with`
        + " PROBE_PRICED=1 against a card the feed has priced to assert it; the stack's"
        + " geometry above is checked either way.",
    );
  }
}

async function openCard(page, name) {
  await page.goto(`${BASE}/collection?view=rows&q=${encodeURIComponent(name)}`, {
    waitUntil: "domcontentloaded",
  });
  // A role locator with an escaped pattern, not an interpolated attribute selector:
  // a card name carrying a quote, a bracket or a backslash would make that selector
  // invalid or change what it means, and the probe would fail before opening anything.
  const pattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},`);
  // Pressed up to three times. The row paints before React has hydrated it, so a
  // first click on a cold dev server lands on markup with no handler attached and
  // nothing happens — there is no state to wait for, only the absence of a
  // dialog, so the retry IS the wait.
  const row = page.getByRole("button", { name: pattern }).first();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await row.click();
    const opened = await page
      .waitForSelector('[role="dialog"]', { timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (opened) break;
    if (attempt === 2) throw new Error(`the modal never opened for ${name}`);
  }
  // The card is fetched on click and the price rides that fetch, so the modal opens
  // before it has either. Waited for, not slept through: a fixed delay turns a slow
  // Neon response into a false failure, and the art box is the right thing to wait
  // on because it arrives with the card whether or not the card has a price —
  // waiting for the tag itself would hang on every silent state.
  await page
    .waitForFunction(
      () => [...document.querySelectorAll('[data-testid^="modal-art-"]')]
        .some((n) => n.getBoundingClientRect().width > 0),
      null,
      { timeout: 15_000 },
    );
}

/**
 * The zoom, measured rather than described: the layer must cover the DIALOG's
 * rectangle and not the viewport's — that is the whole of §3.1, and it is the one
 * thing a unit test cannot see.
 */
async function readZoom(page) {
  return page.evaluate(() => {
    const layer = document.querySelector('[data-testid="card-zoom"]');
    if (!layer) return null;
    const dialog = document.querySelector('[role="dialog"]');
    const card = document.querySelector('[data-testid="card-zoom-card"]');
    const l = layer.getBoundingClientRect();
    const d = dialog.getBoundingClientRect();
    const c = card?.getBoundingClientRect();
    return {
      // Two pixels of tolerance, not one: above `md` the dialog draws a 1px border
      // and the layer is sized to the padding box inside it. That hairline is the
      // one part of the dialog the layer cannot cover, by construction.
      coversDialog:
        Math.abs(l.top - d.top) <= 2 && Math.abs(l.left - d.left) <= 2
        && Math.abs(l.width - d.width) <= 3 && Math.abs(l.height - d.height) <= 3,
      coversViewport: Math.abs(l.width - window.innerWidth) <= 1,
      card: c ? { width: Math.round(c.width), height: Math.round(c.height) } : null,
      caption: (layer.querySelector("p")?.textContent ?? "").trim(),
      dialogs: document.querySelectorAll('[role="dialog"]').length,
    };
  });
}

const browser = await chromium.launch();
try {
  await clerkSetup();

  // ── desktop ──────────────────────────────────────────────────────────────
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  await signIn(page);
  await openCard(page, CARD);
  const desktop = await readPrice(page);
  console.log(`\n── desktop · ${CARD} ──`);
  console.log(JSON.stringify(desktop, null, 2));
  // The placement is the ruling; a stack that has drifted away from the art
  // satisfies nothing. Table row 1.1: 10px under the art at desktop.
  assertUnderCard("desktop", await readUnderCard(page), 10, "Click to zoom", EXPECT_PRICED);

  // WHAT THIS PROBE DELIBERATELY DOES NOT DO: pick a different printing.
  //
  // It used to. Selecting a tile is a WRITE — `setCardArtPreference` persists
  // (user, oracle) — so the probe had to choose an unselected tile, remember the
  // old one, restore it in a `finally`, and find the right reset control when
  // there had been no pick at all. Six review rounds went into that machinery, on
  // a hand-run script, to prove something a unit test already proves: the modal's
  // tag follows the resolved printing (`card-modal-price.test.tsx`, mutation-checked
  // by reverting `priceFor` and watching eight cases fail).
  //
  // What a browser proves and a test cannot is what is on this page: that the tag
  // paints and where it sits relative to the art. That is all this probe claims now,
  // and it makes no writes at all.

  // The zoom, at this width. 372x520 is the drawn figure; the layer is the dialog's
  // rectangle, never the page's.
  await page.getByRole("button", { name: /^Look at / }).first().click();
  await page.waitForSelector('[data-testid="card-zoom"]', { timeout: 5_000 });
  // The layer animates in over 200ms from `scale(.94)`, so a rect read on
  // attachment measures a card mid-flight and fails the size check for no reason.
  // Waited for the geometry to settle, not for a duration.
  // `settled` asks the engine which animations are running on the layer and
  // waits for those promises, rather than comparing a rect to `offsetWidth` —
  // which compares a SCALED box to an unscaled one and reports "settled" at any
  // scale near 1. That is why `coversDialog` failed intermittently at 371x518
  // against a 372x520 card: read one frame early, correct one frame later.
  await settled(onPage(page, '[data-testid="card-zoom"]')).catch(() => {});
  const zoom = await readZoom(page);
  console.log("\n── desktop · zoom ──");
  console.log(JSON.stringify(zoom, null, 2));
  if (!zoom?.coversDialog || zoom.coversViewport || zoom.dialogs !== 1) {
    console.log("\nFAIL: the zoom must be a region inside the one dialog, sized to it.");
    process.exitCode = 1;
  }
  // 372x520 is the drawn figure for a one-faced card. A two-faced one gives back
  // 56px of column — the 44px turn control now sits UNDER the card rather than on
  // it, plus the 12px above it — and the ratio takes the width down with it.
  const twoFacedHere = Boolean(await page.locator('[data-testid="card-zoom"] button[aria-label^="Turn over to"]').count());
  const expectZoom = twoFacedHere ? { width: 352, height: 492 } : { width: 372, height: 520 };
  if (!zoom?.card
    || Math.abs(zoom.card.width - expectZoom.width) > 2
    || Math.abs(zoom.card.height - expectZoom.height) > 3) {
    console.log(
      `\nFAIL: zoomed card is ${JSON.stringify(zoom?.card)}, expected about`
        + ` ${expectZoom.width}x${expectZoom.height}.`,
    );
    process.exitCode = 1;
  }
  // The turn, where a browser is the only witness: jsdom has no transforms, so a
  // unit test can see `data-face` change and nothing about the card actually turning.
  const turn = page.locator('[data-testid="card-zoom"] button[aria-label^="Turn over to"]');
  if (await turn.count()) {
    const before = await page.locator('[data-testid="card-zoom-card"]').evaluate(
      (n) => getComputedStyle(n).transform,
    );
    await turn.click();
    await page.waitForTimeout(500);
    const after = await page.locator('[data-testid="card-zoom-card"]').evaluate(
      (n) => getComputedStyle(n).transform,
    );
    // Where the control actually sits, which only a browser can say. It is UNDER
    // the card now (#4) — bottom-right covered a creature's power and toughness,
    // and bottom-centre still printed a button across the picture — so the check
    // is that it clears the card's bottom edge and stays centred on it.
    const placement = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="card-zoom-card"]');
      const control = document.querySelector('[data-testid="card-zoom"] button[aria-label^="Turn over to"]');
      if (!card || !control) return null;
      const c = card.getBoundingClientRect();
      const b = control.getBoundingClientRect();
      const centreOffset = Math.round((b.left + b.right) / 2 - (c.left + c.right) / 2);
      return {
        belowCard: b.top >= c.bottom - 1,
        gapUnderCard: Math.round(b.top - c.bottom),
        centreOffset,
        centred: Math.abs(centreOffset) <= 2,
      };
    });
    const stillOpen = await page.locator('[data-testid="card-zoom"]').count();
    console.log("\n── desktop · the turn ──");
    console.log(JSON.stringify({ before, after, stillOpen: Boolean(stillOpen), placement }, null, 2));
    if (!placement?.belowCard) {
      console.log("\nFAIL: the turn control still sits ON the zoomed card; it belongs under it.");
      process.exitCode = 1;
    }
    if (!placement?.centred) {
      console.log(
        `\nFAIL: the turn control is ${placement?.centreOffset}px off centre under the card.`,
      );
      process.exitCode = 1;
    }
    // 12px is the spacing, not just "somewhere below": the figure is part of the
    // geometry E17 records, and a margin change that kept the control outside the
    // card would otherwise pass every check here.
    if (placement && Math.abs(placement.gapUnderCard - 12) > 1) {
      console.log(
        `\nFAIL: the turn sits ${placement.gapUnderCard}px under the zoomed card, expected 12px.`,
      );
      process.exitCode = 1;
    }
    if (before === after) {
      console.log("\nFAIL: the card did not turn — the transform is unchanged.");
      process.exitCode = 1;
    }
    if (!stillOpen) {
      console.log("\nFAIL: turning the card dismissed the zoom.");
      process.exitCode = 1;
    }
  } else if (process.env.PROBE_TWO_FACED === "1") {
    console.log("\nFAIL: PROBE_TWO_FACED is set but this card has no turn control.");
    process.exitCode = 1;
  } else {
    console.log(
      "\n(one-faced card: the turn was NOT checked. Run again with"
        + ' PROBE_CARD="<a transform card>" PROBE_TWO_FACED=1 to require it.)',
    );
  }

  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-testid="card-zoom"]', { state: "detached", timeout: 5_000 });
  if (!(await page.locator('[role="dialog"]').count())) {
    console.log("\nFAIL: the first Escape closed the dialog as well as the zoom.");
    process.exitCode = 1;
  }

  // THE TURN IN THE MODAL ITSELF (#2), which the zoom's own check cannot stand in
  // for: this art used to swap one background for another with no motion, so a
  // `data-face` attribute flipping is exactly what the broken version also did.
  // Only a computed transform separates them, and only a browser has one.
  // `:visible`, not `.first()`: both breakpoint trees are mounted and the phone's
  // is the one that comes first in document order, so an unscoped locator waits
  // thirty seconds to click something `display:none`.
  const artTurn = page.locator('[data-testid="modal-under-card"] button[aria-label^="Turn over to"]:visible');
  if (await artTurn.count()) {
    const box = page.locator('[data-testid="modal-art-turn"]:visible');
    const before = await box.evaluate((n) => getComputedStyle(n).transform);
    await artTurn.click();
    await page.waitForTimeout(500);
    const after = await box.evaluate((n) => getComputedStyle(n).transform);
    // The zoom trigger is stretched over the art and must NOT ride the rotation:
    // on the back face it would be facing away, and the card would stop opening.
    const stillOpens = await page
      .getByRole("button", { name: /^Look at / })
      .first()
      .evaluate((n) => {
        const r = n.getBoundingClientRect();
        return document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2) === n;
      });
    console.log("\n── desktop · the turn, in the modal ──");
    console.log(JSON.stringify({ before, after, stillOpens }, null, 2));
    if (before === after) {
      console.log("\nFAIL: the art in the modal did not turn — the transform is unchanged.");
      process.exitCode = 1;
    }
    if (!stillOpens) {
      console.log("\nFAIL: the zoom trigger is not hit-testable on the back face.");
      process.exitCode = 1;
    }
  } else if (process.env.PROBE_TWO_FACED === "1") {
    console.log("\nFAIL: PROBE_TWO_FACED is set but the modal draws no turn control under the art.");
    process.exitCode = 1;
  }
  await context.close();

  // ── a SHORT desktop window, where the stack has to fit ───────────────────
  //
  // The dialog is `min(620px, 85vh)` and `overflow-hidden`, and the column
  // centres the art — so the room under the art is half the slack, and at 600px
  // it was 42px against a two-faced stack wanting 90 — 10 + 15 + 6 + 32 + 6 + 21.
  // The turn control and the
  // tag were cut off and unreachable, which is invisible at 900px. E19.
  const shortCtx = await browser.newContext({ viewport: { width: 1300, height: 600 } });
  const shortPage = await shortCtx.newPage();
  await signIn(shortPage);
  await openCard(shortPage, CARD);
  const short = await shortPage.evaluate(() => {
    const vis = (sel) =>
      [...document.querySelectorAll(sel)].find((n) => n.getBoundingClientRect().width > 0) ?? null;
    const dialog = document.querySelector('[role="dialog"]');
    const stack = vis('[data-testid="modal-under-card"]');
    const art = vis('[data-testid="modal-art-desktop"]');
    if (!dialog || !stack || !art) return null;
    const d = dialog.getBoundingClientRect();
    const s = stack.getBoundingClientRect();
    const a = art.getBoundingClientRect();
    // The stack that is on screen is not the worst case: a price can appear on a
    // pick at any time and row 1.14 forbids anything above it moving, so the art
    // reserves the tag's row whether or not this card has a figure. The invariant
    // is therefore about the ROOM under the art, not about today's stack.
    //
    // The stack's height is MEASURED and the tag's row is added only when it is
    // not already there. The figures this file used to repeat from the component
    // were a second copy of an arithmetic the component had already got wrong —
    // 18px for a tag whose box is 21 — so a probe agreeing with them proved they
    // agreed, not that either was right.
    const priced = stack.querySelector('[data-testid^="modal-price-"]');
    const TAG_ROW = 6 + 21; // the 6px gap and the tag's own measured box
    const needed = Math.ceil(s.height) + 10 + (priced ? 0 : TAG_ROW);
    return {
      dialogHeight: Math.round(d.height),
      artWidth: Math.round(a.width),
      stackHeight: Math.round(s.height),
      priced: Boolean(priced),
      needed,
      roomUnderArt: Math.round(d.bottom - a.bottom),
      overflowPx: Math.round(s.bottom - d.bottom),
      // Clipped is not the same as absent: the node is laid out either way, so
      // the question is whether a press would land on it.
      lastRowReachable: (() => {
        const rows = [...stack.children];
        const last = rows[rows.length - 1];
        if (!last) return false;
        const r = last.getBoundingClientRect();
        const at = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        return at !== null && (last.contains(at) || at.contains(last));
      })(),
    };
  });
  console.log("\n── desktop 1300x600 · the stack still fits ──");
  console.log(JSON.stringify(short, null, 2));
  if (!short || short.overflowPx > 0 || short.roomUnderArt < short.needed || !short.lastRowReachable) {
    console.log(
      "\nFAIL: the under-card stack is clipped by the dialog on a short window (E19)."
        + " The art has to give back the height the stack needs.",
    );
    process.exitCode = 1;
  }
  await shortCtx.close();

  // NO PHONE PASS since the card carousel's phone round (R2): the phone's art header, the stack
  // under it and the phone zoom this pass measured are all retired. The phone's card, sheet and
  // price line are in the carousel's contact-sheet inventory (`card-carousel.json`) and its
  // property table (`design-tables/card-carousel-phone.md`).
} finally {
  await browser.close();
}
