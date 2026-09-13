// The game note on a real Games tab, at 390x844 and 1300x900 — the form's field
// and the History row's line.
//
// Its properties come from `docs/superpowers/design-tables/deck-tuning.md`
// §Note line and §Note quote rule, and a browser is the only thing that can
// answer four of them: that the line indents to the mark column on desktop and
// sits flush on the phone, that the quote rule stretches to the height of the
// text rather than to a guess, that a row WITHOUT a note is still exactly the
// shipped row with nothing reserved — 64px on the phone, 52px on the desktop,
// #9's own two heights — and that a note at the 140-character cap wraps instead
// of pushing the row off the viewport.
//
// The form writes notes now, but not the one this probe needs: the cap fixture
// is 140 characters with no whitespace, which nobody types. Seed it by hand
// under the account this signs in as — NOT the fixture account, see the
// local-dev note in memory — and point `WALK_DECK` at a deck the probe user
// owns:
//
//   insert into deck_games (deck_id, user_id, result, pod_size, played_at, note)
//   values ('<deck>', '<probe user>', 'loss', 4, now(), repeat('x', 140));
//
// A game with no note has to be on the same deck, which is the ordinary case
// and usually already there.
//
// Run by hand against a local `pnpm dev`: `node scripts/probe-game-note.mjs`
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.WALK_DECK ?? "47eb032a-4a19-43c9-86be-c45203365ed1";
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

const report = {};
await clerkSetup();
const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  await signIn(page);
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll('[role="tab"]')].map((t) => t.getAttribute("aria-label")),
  );
  if (tabs.length === 0) {
    const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
    throw new Error(`No tabs on the deck page. Body:\n${body}`);
  }
  await page.click(`[role="tab"][aria-label="${tabs.find((t) => t?.startsWith("Games"))}"]`);
  await page.waitForSelector("li:has(button[aria-label='Delete this game'])", { timeout: 15_000 });

  // The field, before the row. Opening the form is what draws it, and its two
  // browser-only properties are the tap-target floor (48px phone, 46px desktop,
  // which no unit test can measure) and the counter that is absent until the
  // field is touched.
  const field = await page.evaluate(() => {
    const open = [...document.querySelectorAll("button")].find((b) =>
      /log a game|log another/i.test(b.textContent ?? ""),
    );
    if (!open) return { failed: "No button opens the log form." };
    open.click();
    return null;
  });
  if (!field?.failed) {
    await page.waitForSelector("input[maxlength='140']", { timeout: 10_000 });
  }
  // Read before a single keystroke: the counter is absent until the field has
  // focus or content, and after typing that is unanswerable.
  const counterAtRest = field?.failed
    ? null
    : await page.evaluate(() => {
        const input = document.querySelector("input[maxlength='140']");
        return document.querySelector(`#${CSS.escape(input.id)}-count`) !== null;
      });
  // Typing is a React state change, so the counter cannot be read in the same
  // evaluate that causes it — the DOM it would measure has not been written yet.
  let form = field?.failed ? field : null;
  if (form === null) {
    await page.evaluate(() => {
      const input = document.querySelector("input[maxlength='140']");
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(input, "x".repeat(130));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // The counter itself, not "something after the input" — the description
    // span is always there, so the looser selector matched before React had
    // committed anything and the read below raced it.
    await page.waitForSelector("[id$='-count']", { timeout: 5_000 });
    form = await page.evaluate((COUNTER_AT_REST) => {
      const input = document.querySelector("input[maxlength='140']");
      const section = input.closest("div");
      const counter = document.querySelector(`#${CSS.escape(input.id)}-count`);
      const explainer = section.querySelector("p");
      return {
        element: input.tagName,
        height: Math.round(input.getBoundingClientRect().height),
        rule: getComputedStyle(section).borderTopColor,
        counterBeforeTouch: COUNTER_AT_REST,
        counterInk: counter ? getComputedStyle(counter).color : null,
        describedBy: input.getAttribute("aria-describedby")?.split(" ").length ?? 0,
        explainer: explainer ? getComputedStyle(explainer).display : null,
        overflowsX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    }, counterAtRest);
  }

  report[vp.label] = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("li")].filter((li) =>
      li.querySelector("button[aria-label='Delete this game']"),
    );
    // The cap is the whole reason the line needs no truncation, so the fixture
    // has to hold a note AT it — a short sentence wraps in any width and would
    // let this report cap behaviour it never measured. And the no-note row is
    // half the contract: without one, "nothing reserved" goes unchecked.
    const noted = rows.filter((r) => r.querySelector(".italic"));
    // Exactly 140 and no whitespace in it. A 140-character SENTENCE wraps at
    // any width and would let this report the cap case without exercising it —
    // the whole failure being measured is a single unbroken word that a flex
    // item refuses to shrink below.
    const withNote = noted.find((r) => {
      const inner = r.querySelector(".italic").textContent.replace(/^\u201C|\u201D$/g, "");
      return inner.length === 140 && !/\s/.test(inner);
    });
    const without = rows.find((r) => !r.querySelector(".italic"));
    const read = (el, props) =>
      Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]]));
    if (!withNote || !without) {
      return {
        rows: rows.length,
        failed:
          `This deck needs BOTH a game whose note is 140 characters with no spaces ` +
          `(\`update deck_games set note = repeat('x', 140) where id = '…'\`) and a game with none. ` +
          `Found ${noted.length} noted (${withNote ? "one at the cap" : "none at the cap"}) ` +
          `and ${without ? "an unnoted row" : "no unnoted row"}.`,
      };
    }
    const text = withNote.querySelector(".italic");
    const rule = [...text.parentElement.children].find((c) => c !== text);
    return {
      rows: rows.length,
      rowsWithNote: rows.filter((r) => r.querySelector(".italic")).length,
      note: {
        quoted: /^\u201C[\s\S]*\u201D$/.test(text.textContent),
        // Spoken once, and from the marks cell rather than from the visible
        // line — the line the eye reads sits below the row's controls, so the
        // ear would otherwise meet the delete button between the marks and the
        // note. The visible line is `aria-hidden`; this is the only copy.
        spoken: withNote.querySelector(".sr-only")?.textContent ?? null,
        visibleLineHidden: text.closest("[aria-hidden]") !== null,
        lines: Math.round(text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight)),
        ...read(text, ["fontSize", "fontStyle", "lineHeight", "color"]),
        indent: getComputedStyle(text.parentElement).paddingLeft,
        gap: getComputedStyle(text.parentElement).gap,
        marginTop: getComputedStyle(text.parentElement).marginTop,
        rule: {
          width: Math.round(rule.getBoundingClientRect().width * 100) / 100,
          height: Math.round(rule.getBoundingClientRect().height),
          textHeight: Math.round(text.getBoundingClientRect().height),
          background: getComputedStyle(rule).backgroundColor,
          radius: getComputedStyle(rule).borderRadius,
        },
      },
      rowWithoutNote: without
        ? {
            height: Math.round(without.getBoundingClientRect().height),
            minHeight: getComputedStyle(without).minHeight,
          }
        : null,
      rowWithNoteHeight: Math.round(withNote.getBoundingClientRect().height),
      overflowsX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  report[vp.label].form = form;
  await context.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));

// The table, as values this run can be compared against. A probe that only
// prints its measurements is a report, not a gate: every one of these could
// come back wrong and the run would still exit 0, which is the failure this
// probe exists to prevent. `--fg-muted` is read from the theme rather than
// written here for the same reason the icon test reads its tokens back.
const EXPECTED = {
  "iPhone 13 · 390x844": { indent: "0px", gap: "10px", marginTop: "8px", lines: 3, fieldHeight: 48 },
  "desktop · 1300x900": { indent: "40px", gap: "11px", marginTop: "7px", lines: 1, fieldHeight: 46 },
};
const FG_MUTED = "rgb(165, 156, 137)";
const ACCENT = "rgb(207, 135, 69)";
const WARNING = "rgb(222, 170, 41)";

const failures = [];
for (const [label, r] of Object.entries(report)) {
  if (r.failed) {
    failures.push(`${label}: ${r.failed}`);
    continue;
  }
  const want = EXPECTED[label];
  const n = r.note;
  const f = r.form;
  const check = (name, got, expected) => {
    if (got !== expected) failures.push(`${label} · ${name}: ${got} (table says ${expected})`);
  };
  check("padding-left", n.indent, want.indent);
  check("gap", n.gap, want.gap);
  check("margin-top", n.marginTop, want.marginTop);
  check("font-size", n.fontSize, "12.5px");
  check("font-style", n.fontStyle, "italic");
  check("line-height", n.lineHeight, "18.75px");
  check("colour", n.color, FG_MUTED);
  check("typographic quotes", n.quoted, true);
  check("spoken note", n.spoken, `note:\u201C${"x".repeat(140)}\u201D`);
  check("visible line hidden from the ear", n.visibleLineHidden, true);
  check("quote rule width", n.rule.width, 2);
  // The rule stretches to the text block rather than to a guessed height.
  check("quote rule height", n.rule.height, n.rule.textHeight);
  check("quote rule fill", n.rule.background, "rgb(58, 50, 41)");
  // The cap's whole point: 140 unbroken characters wrap instead of scrolling
  // the page sideways. Three lines at 390px, one at 1300px.
  check("lines at the cap", n.lines, want.lines);
  check("horizontal overflow", r.overflowsX, false);
  // A row without a note is exactly #9's row — 64px phone, 52px desktop.
  check("row without a note", r.rowWithoutNote.minHeight, label.startsWith("iPhone") ? "64px" : "52px");

  // The form's field.
  if (f.failed) {
    failures.push(`${label} · form: ${f.failed}`);
  } else {
    // An input, never a textarea: one line is the whole promise.
    check("note field element", f.element, "INPUT");
    // The floor no unit test can measure — 48 on the phone, 46 on the desktop.
    check("note field height", f.height, want.fieldHeight);
    check("section rule", f.rule, ACCENT);
    // Absent until focus or content, and the whole reason the field has two
    // facts about it rather than one.
    check("counter before the field is touched", f.counterBeforeTouch, false);
    // At warnAt the counter turns, and it turns before the field stops.
    check("counter ink at 130", f.counterInk, WARNING);
    // The description and the counter both, once there is a counter to name.
    check("aria-describedby ids", f.describedBy, 2);
    check("explanatory line", f.explainer, label.startsWith("iPhone") ? "none" : "block");
    check("form overflows sideways", f.overflowsX, false);
  }
}

if (failures.length > 0) {
  console.error("\nAgainst deck-tuning.md §Note Field / §Note line / §Note quote rule:");
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.error("\nEvery property matches deck-tuning.md §Note Field, §Note line and §Note quote rule.");
