// The desktop rail on a touch screen (desktop nav labels handoff, R2 for the split, R1 as the touch
// rail, V1 for short touch screens), measured in a real browser because every rule here is a media
// query and jsdom applies none.
//
// Four contexts:
//   pointer-1300  1300x900, no emulation. The rail is today's: 62px, 38px slots, no visible label.
//   touch-768     768x1024 under `(hover: none)`. 88px, 72 x 52 slots, each label drawn at 9px on a
//                 12px line (audit V-E1), `main` 26px narrower, the account control in view.
//   touch-852     852x393 under `(hover: none)`, a phone held sideways. The short rule: 72 x 44
//                 slots, the nav one scroll region between the mark and the account control, the
//                 account control whole in the viewport, and a keyboard focus ring on the first
//                 slot not cut by that region (V-E2).
//   phone-390     390x844, a phone. The tab bar is untouched: its slots, label size and markup carry
//                 none of the rail's touch classes, and the rail is not drawn (audit E5).
//
// `(hover: none)` comes from a `hasTouch` context (see TOUCH). Each touch context asserts the query
// actually matches before it measures: the first version emulated it through CDP, which Chromium
// ignores for `hover`, and every touch row measured the pointer rail.
//
// First run (PROBE_LOCKED_EMAIL): the locked well is reachable only on an account with no cards,
// and neither fixture account is one. Name a `+clerk_test` account with an empty collection and
// the touch-852 context walks it too: the well 80px wide, its slots 72 x 44, and an open lock note
// that follows the nav when it scrolls (V-E3). Without it the locked rows say so and do not pass.
//
// Run by hand against a server for this worktree, and not part of `pnpm test`:
//   node scripts/probe-nav-labels.mjs
//   PROBE_BASE=http://localhost:3600 PROBE_LOCKED_EMAIL=… node scripts/probe-nav-labels.mjs
// Makes no writes beyond what signing in does.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const LOCKED_EMAIL = process.env.PROBE_LOCKED_EMAIL ?? null;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (LOCKED_EMAIL && !LOCKED_EMAIL.includes("+clerk_test")) {
  throw new Error("PROBE_LOCKED_EMAIL must be a +clerk_test account.");
}

async function signIn(page, email, password) {
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
    [email, password ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

let failures = 0;
// Counts its own failures, so a check that forgets to cannot print FAIL over "All checks passed."
function check(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

// A touch screen: `hasTouch` makes Chromium report `(hover: none)` and `(pointer: coarse)` while
// leaving a desktop viewport alone. CDP's `Emulation.setEmulatedMedia` does NOT emulate `hover`
// (measured: it reads false with the feature set), and `isMobile` turns 768 into a 980px layout
// viewport through the meta tag.
const TOUCH = { hasTouch: true };

/** Everything the rail draws, read once the page has settled. */
const READ_RAIL = () => {
  const rail = document.querySelector("aside");
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  };
  if (!rail || rail.getBoundingClientRect().width === 0) return { drawn: false };
  const nav = rail.querySelector("[data-rail-nav]");
  const slots = [...rail.querySelectorAll("a, [data-locked-slot]")].map((el) => {
    const label = el.querySelector("[data-rail-label]");
    const ls = label ? getComputedStyle(label) : null;
    return {
      name: el.getAttribute("aria-label"),
      box: box(el),
      label: label && ls.display !== "none"
        ? { text: label.textContent, size: ls.fontSize, line: ls.lineHeight, box: box(label) }
        : null,
    };
  });
  const account = rail.querySelector("div.mt-auto");
  const well = rail.querySelector("[data-lock-well]");
  const main = document.querySelector("main");
  return {
    drawn: true,
    hoverNone: matchMedia("(hover: none)").matches,
    railWidth: rail.getBoundingClientRect().width,
    railVar: getComputedStyle(document.documentElement).getPropertyValue("--rail-w").trim(),
    nav: box(nav),
    navOverflow: nav ? getComputedStyle(nav).overflowY : null,
    navScrollable: nav ? nav.scrollHeight > nav.clientHeight + 1 : false,
    slots,
    account: box(account),
    well: box(well),
    main: box(main),
    viewport: { width: innerWidth, height: innerHeight },
  };
};

const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;

async function readRail(page, path = "/decks") {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForSelector("aside, nav[aria-label='Primary']", { state: "attached", timeout: 30_000 });
  await page.waitForTimeout(800);
  return page.evaluate(READ_RAIL);
}

function checkSlots(tag, r, { width, height, labelled }) {
  const live = r.slots;
  check(`${tag}: five slots`, live.length === 5, `${live.length} drawn`);
  const off = live.filter((s) => !near(s.box.width, width) || !near(s.box.height, height));
  check(
    `${tag}: every slot is ${width} x ${height}`,
    live.length > 0 && off.length === 0,
    off.length ? off.map((s) => `${s.name} ${s.box.width}x${s.box.height}`).join(", ") : "all match",
  );
  if (labelled) {
    const bad = live.filter((s) => !s.label || s.label.size !== "9px" || s.label.line !== "12px"
      // The label is ink inside its slot, never past it: the longest two are 59.4px in 72.
      || s.label.box.left < s.box.left || s.label.box.right > s.box.right);
    check(
      `${tag}: every slot draws its label at 9px on a 12px line, inside the slot`,
      live.length > 0 && bad.length === 0,
      bad.length ? bad.map((s) => `${s.name}: ${JSON.stringify(s.label)}`).join("; ") : "all labelled",
    );
  } else {
    const shown = live.filter((s) => s.label);
    check(`${tag}: no label is drawn`, shown.length === 0, shown.length ? `${shown.length} shown` : "none shown");
  }
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    // ---- pointer-1300 ----------------------------------------------------------------------------
    {
      const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
      const page = await context.newPage();
      await signIn(page, EMAIL, PASSWORD);
      const r = await readRail(page);
      check("pointer-1300: (hover: none) does not match", r.drawn && !r.hoverNone, `hoverNone ${r.hoverNone}`);
      check("pointer-1300: the rail is 62px", r.drawn && near(r.railWidth, 62), `${r.railWidth}px, --rail-w ${r.railVar}`);
      if (r.drawn) checkSlots("pointer-1300", r, { width: 38, height: 38, labelled: false });
      check("pointer-1300: the nav does not scroll", r.navOverflow === "visible", `overflow-y ${r.navOverflow}`);
      await context.close();
    }

    // ---- touch-768 --------------------------------------------------------------------------------
    {
      const context = await browser.newContext({ viewport: { width: 768, height: 1024 }, ...TOUCH });
      const page = await context.newPage();
      await signIn(page, EMAIL, PASSWORD);
      const r = await readRail(page);
      check("touch-768: (hover: none) matches", r.drawn && r.hoverNone, `hoverNone ${r.hoverNone}`);
      check("touch-768: the rail is 88px", r.drawn && near(r.railWidth, 88), `${r.railWidth}px, --rail-w ${r.railVar}`);
      if (r.drawn) {
        checkSlots("touch-768", r, { width: 72, height: 52, labelled: true });
        check("touch-768: main is 680px beside it", near(r.main.width, 680), `main ${r.main.width}px`);
        check(
          "touch-768: the account control is whole in the viewport",
          r.account && r.account.bottom <= r.viewport.height && r.account.top >= 0,
          `account ${r.account?.top}–${r.account?.bottom} in ${r.viewport.height}`,
        );
      }
      await context.close();
    }

    // ---- touch-852 (short) -------------------------------------------------------------------------
    for (const who of [{ email: EMAIL, password: PASSWORD, locked: false }, ...(LOCKED_EMAIL ? [{ email: LOCKED_EMAIL, locked: true }] : [])]) {
      const tag = `touch-852${who.locked ? " first run" : ""}`;
      const context = await browser.newContext({ viewport: { width: 852, height: 393 }, ...TOUCH });
      const page = await context.newPage();
      await signIn(page, who.email, who.password);
      const r = await readRail(page, who.locked ? "/" : "/decks");
      check(`${tag}: (hover: none) matches`, r.drawn && r.hoverNone, `hoverNone ${r.hoverNone}`);
      if (!r.drawn) { await context.close(); continue; }
      check(`${tag}: the rail is 88px`, near(r.railWidth, 88), `${r.railWidth}px`);
      checkSlots(tag, r, { width: 72, height: 44, labelled: true });
      check(`${tag}: the nav is the scroll region`, r.navOverflow === "auto", `overflow-y ${r.navOverflow}`);
      check(
        `${tag}: the account control is whole in the viewport, outside the nav`,
        r.account && r.account.bottom <= r.viewport.height && r.account.top >= r.nav.bottom - 0.5,
        `account ${r.account?.top}–${r.account?.bottom}, nav ends ${r.nav?.bottom}, viewport ${r.viewport.height}`,
      );
      if (who.locked) {
        check(`${tag}: the well is 80px`, r.well && near(r.well.width, 80), `well ${r.well?.width}px`);
      } else {
        check(`${tag}: no well drawn`, r.well === null, r.well ? "a well was drawn" : "none");
      }

      // V-E2: the first slot's ring (2px at a 2px offset) clears the region's top edge. Read with
      // the region scrolled to its top, which is where the clip would bite.
      await page.evaluate(() => document.querySelector("[data-rail-nav]").scrollTo(0, 0));
      const top = await page.evaluate(READ_RAIL);
      const first = top.slots[0];
      check(
        `${tag}: the first slot's focus ring clears the scroll region's top`,
        first.box.top - top.nav.top >= 4 - 0.01,
        `${Math.round((first.box.top - top.nav.top) * 100) / 100}px of the 4px the ring needs`,
      );
      check(
        `${tag}: the ring clears the region's sides`,
        first.box.left - top.nav.left >= 4 - 0.01 && top.nav.right - first.box.right >= 4 - 0.01,
        `${first.box.left - top.nav.left}px / ${top.nav.right - first.box.right}px`,
      );

      if (who.locked) {
        // V-E3: an open note follows its slot when the nav scrolls. At 393 the first-run column
        // (392) fits and the nav does not scroll, as V1 computes, so the rule is read on a shorter
        // screen where it must.
        await page.setViewportSize({ width: 852, height: 330 });
        await page.waitForTimeout(300);
        const slot = page.locator("aside [data-locked-slot]").last();
        await slot.focus();
        const noteTop = () => page.evaluate(() => document.querySelector('[data-lock-note="open"]')?.getBoundingClientRect().top ?? null);
        const before = await noteTop();
        const scrolled = await page.evaluate(() => {
          const nav = document.querySelector("[data-rail-nav]");
          const was = nav.scrollTop;
          nav.scrollTo(0, nav.scrollHeight);
          return nav.scrollTop - was;
        });
        await page.waitForTimeout(150);
        const after = await noteTop();
        check(
          `${tag}: an open lock note follows the nav when it scrolls`,
          before !== null && scrolled > 0 && after !== null && near(before - after, scrolled, 1.5),
          scrolled > 0
            ? `nav moved ${scrolled}px, note moved ${before !== null && after !== null ? before - after : "n/a"}px`
            : "the nav did not scroll at this height, so the rule was not reached. NOT a pass",
        );
      }
      await context.close();
    }
    if (!LOCKED_EMAIL) {
      check("touch-852 first run", false, "PROBE_LOCKED_EMAIL unset: the well and the note's scroll rule were not measured. NOT a pass");
    }

    // ---- the filter chassis's 1000 under touch (audit E6) ----------------------------------------
    // CHASSIS_WIDE_MIN_PX was measured beside the 62px rail: from 1000 the control row holds its five
    // controls on one line, search being the only child that shrinks. On touch the row is 26px
    // narrower at the same viewport, so it is read at 1000, 1015 and 1030: still the wide form, the
    // row not overflowing, and every control inside it.
    for (const width of [1000, 1015, 1030]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, ...TOUCH });
      const page = await context.newPage();
      await signIn(page, EMAIL, PASSWORD);
      await page.goto(`${BASE}/commanders`, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-chassis-row='controls']", { timeout: 30_000 });
      await page.waitForTimeout(800);
      const row = await page.evaluate(() => {
        const r = document.querySelector("[data-chassis-row='controls']");
        const box = r.getBoundingClientRect();
        const kids = [...r.children].map((c) => c.getBoundingClientRect()).filter((b) => b.width > 0);
        const search = r.querySelector("input");
        return {
          form: r.closest("[data-chassis-form]")?.getAttribute("data-chassis-form") ?? null,
          overflow: r.scrollWidth - r.clientWidth,
          outside: kids.filter((b) => b.right > box.right + 0.5 || b.left < box.left - 0.5).length,
          // One line: the row centres its children, so their CENTRES agree (their tops differ by
          // height). A wrapped control's centre sits a line below.
          tops: new Set(kids.map((b) => Math.round((b.top + b.height / 2) / 4))).size,
          search: search ? search.getBoundingClientRect().width : null,
        };
      });
      check(
        `chassis touch-${width}: the wide row holds on one line`,
        row.form === "wide" && row.overflow <= 0 && row.outside === 0 && row.tops === 1,
        `form ${row.form}, overflow ${row.overflow}px, ${row.outside} control(s) outside, ${row.tops} line(s), search ${row.search}px`,
      );
      await context.close();
    }

    // ---- phone-390 ---------------------------------------------------------------------------------
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      await signIn(page, EMAIL, PASSWORD);
      const r = await readRail(page);
      check("phone-390: the rail is not drawn", !r.drawn, r.drawn ? `drawn at ${r.railWidth}px` : "hidden");
      const tab = await page.evaluate(() => {
        const bar = [...document.querySelectorAll("nav[aria-label='Primary']")].find((n) => n.getBoundingClientRect().width > 0);
        if (!bar) return null;
        const slots = [...bar.querySelectorAll("a")].map((a) => {
          const span = a.querySelector("span.font-mono");
          return { h: a.getBoundingClientRect().height, size: span ? getComputedStyle(span).fontSize : null };
        });
        return { touchClasses: /touch(-short)?:/.test(bar.outerHTML), slots, height: bar.getBoundingClientRect().height };
      });
      check("phone-390: the tab bar is drawn", tab !== null, tab ? `${tab.slots.length} slots` : "missing");
      if (tab) {
        check("phone-390: the tab bar carries none of the rail's touch classes", !tab.touchClasses, tab.touchClasses ? "touch: class found" : "none");
        check(
          "phone-390: every tab slot is 52px with a 9px label",
          tab.slots.length === 5 && tab.slots.every((s) => near(s.h, 52) && s.size === "9px"),
          tab.slots.map((s) => `${s.h}/${s.size}`).join(" "),
        );
        check("phone-390: the bar is 74px", near(tab.height, 74), `${tab.height}px`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
