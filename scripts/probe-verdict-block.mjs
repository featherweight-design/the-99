// The verdict block and its bracket mark, measured in a real browser at 1300x900 and 390x844.
//
// WHY A BROWSER. Every wrong way to draw this mark renders plausible-looking markup and errors
// nowhere, so a component test cannot tell them apart:
//
//   · `<img src="/brackets/…svg">` renders every mark BLACK. The ten files ink every path with
//     `currentColor`, and an external SVG resolves that against its OWN root — the page's
//     `--bracket-N` never reaches it. jsdom computes no styles and would report a happy `<img>`.
//   · A mask fixes the ink and leaves the numeral wrong: the files carry it as
//     `<text font-family="Cinzel,serif">`, and an external SVG cannot load the page's webfont.
//     That is the platform serif at 26 / 36 / 44, where the numeral is the thing being read.
//   · A typo in the slug serves a 404 with byte-identical markup, which is the failure
//     `probe:mana-symbols` exists for and the reason the file is fetched here rather than
//     assumed.
//
// So this reads the RESOLVED font-family of the numeral, the PAINTED ink of the art, and the
// bytes the mask URL actually serves. Ruled 2026-09-22: mask the art, numeral as HTML text.
//
// IT ALSO RE-MEASURES THE CONTRAST GROUND. `contract.test.ts` held a provisional list while
// nothing drew a mark; this block is the first mount, so the ground is read off the painted page
// rather than inherited — the block's own `--surface`, not `--elevated-hover`.
//
// FIVE MUTATIONS WERE RUN AGAINST IT AND ALL FIVE FAIL: the art drawn as an `<img>` (4 checks),
// the numeral's face dropped to `serif` (2), a typo in the slug — which passes every DOM
// assertion while serving a 404, and is the whole reason the file is fetched (2) — the mask's
// second layer removed so the file's own numeral survives under the HTML one (2), and the
// denominator taken out of the population sentence (2).
//
// IT WRITES ONE ROW: the signed-in account's `user_prefs.about_version_seen`, raised with
// `greatest(...)` so it can only ever move forward. That is the convention
// `probe-card-captions.mjs` set and records the reason for — the flag is true once this has
// run, and clearing it would re-break every other probe on this account. It touches no deck,
// no collection and no catalog row. Signs in through Clerk's dev instance — see the local-auth note in memory.
// Needs a server with ANALYSIS_TAB_ENABLED=true. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3010 node scripts/probe-verdict-block.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole, PAGE } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  // Read only to clear the About gate below. This probe makes no other write and no write at
  // all to a deck — point it at `local-dev`, never production.
  "DATABASE_URL",
]);
/** The gate's threshold, read from the file the app pins it in. */
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 }, markPx: 36 },
  { label: 390, viewport: { width: 390, height: 844 }, markPx: 26 },
];

// Counted here rather than at each call site: a check that forgot to count printed ` FAIL ` and
// then `All checks passed.` over the top, with the exit code agreeing with the wrong half.
let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
}

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

  // CLEAR THE ABOUT GATE BEFORE ANY ROUTE IS ASKED FOR. Since #658 `proxy.ts` redirects a reader
  // below the current `ABOUT_VERSION` to `/about?next=…` — so a probe that navigates straight to
  // `/decks` scrapes the About page instead, and its specimen deck links then read as this
  // account's decks. The first run of this file did exactly that: it reported "no Analysis tab"
  // about `/decks/about-resume-edited`, a routing problem wearing a flag problem's clothes.
  //
  // Seeded rather than clicked through: the flag lives in `user_prefs` and this account may have
  // no row at all, so visiting the page does not write one. Left set afterwards on purpose —
  // "this account has seen the About page" is true once this ran.
  //
  // `greatest(...)`, which is what `lib/about/read.ts` itself writes. A bare assignment LOWERS
  // the stored value when this checkout is pinned behind the database's, putting the About page
  // back in front of a real reader on their next navigation.
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  await neon(DATABASE_URL)`
    insert into user_prefs (user_id, about_version_seen)
    values (${await page.evaluate(() => window.Clerk.user.id)}, ${version})
    on conflict (user_id) do update
      set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
}

/** A deck to walk, asked of the page rather than named by an id that rots. */
async function findDeck(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const hrefs = await page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.split("/").length === 3 && !["new", "import"].includes(h.split("/")[2]));
  }, PAGE);
  return hrefs[0] ?? null;
}

/** sRGB relative luminance and the WCAG ratio, on the two colours the browser actually painted. */
function contrast(a, b) {
  const lum = (rgb) => {
    const [r, g, bl] = rgb.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [la, lb] = [lum(a), lum(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const rgb = (css) => (css.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);

async function walk(page, label, markPx, viewportWidth) {
  const block = onPage(page, 'section[aria-label="Your bracket"]').first();
  const blocks = await block.count();
  if (!(await report(`${label}px · the verdict block is drawn`, blocks > 0,
      blocks > 0 ? "one block" : "no block after the profile arrived"))) {
    return;
  }

  // ── The mark ────────────────────────────────────────────────────────────────────────────
  const mark = await page.evaluate((scope) => {
    const root = document.querySelector(scope);
    // THE BOX'S OWN MARK, the first one drawn at this width. The page carries others before it
    // in the DOM, and the first match was the deck header's chip on the hidden desktop copy.
    const el = [...(root?.querySelectorAll('section[aria-label="Your bracket"] [data-testid="verdict-marks"] [data-testid="bracket-mark"]') ?? [])]
      .find((m) => m.getBoundingClientRect().width > 0);
    if (!el) return null;
    const art = el.querySelector('[data-testid="bracket-mark-art"]');
    const numeral = el.querySelector('[data-testid="bracket-mark-numeral"]');
    const box = el.getBoundingClientRect();
    const artStyle = art ? getComputedStyle(art) : null;
    const numeralStyle = numeral ? getComputedStyle(numeral) : null;
    // The block's own painted ground, walked UP from the mark rather than named: the check is
    // about what is behind this numeral, which is a fact about the tree and not about a token.
    let ground = null;
    for (let node = el; node; node = node.parentElement) {
      const bg = getComputedStyle(node).backgroundColor;
      if (bg && bg !== "transparent" && !bg.startsWith("rgba(0, 0, 0, 0)")) { ground = bg; break; }
    }
    return {
      form: el.dataset.form,
      bracket: Number(el.dataset.bracket),
      width: Math.round(box.width),
      height: Math.round(box.height),
      images: el.querySelectorAll("img").length,
      artInk: artStyle?.backgroundColor ?? null,
      maskImage: artStyle ? artStyle.maskImage || artStyle.webkitMaskImage : null,
      maskComposite: artStyle ? artStyle.maskComposite || artStyle.webkitMaskComposite : null,
      numeralText: numeral?.textContent ?? null,
      numeralFamily: numeralStyle?.fontFamily ?? null,
      numeralInk: numeralStyle?.color ?? null,
      ground,
      // Whether the face the numeral ASKS for is one the document actually loaded. A resolved
      // family naming Cinzel over a font that never arrived draws the platform serif, which is
      // the exact failure this probe exists for, one layer down.
      cinzelLoaded: [...document.fonts].some((f) => /cinzel/i.test(f.family) && f.status === "loaded"),
    };
  }, PAGE);

  if (!report(`${label}px · the mark carries an art layer and a numeral`, Boolean(mark),
      mark ? `rank ${mark.bracket}, ${mark.form} form` : "no mark found")) return;

  report(`${label}px · it is the full form at the ship size`,
    mark.form === "full" && mark.width === markPx && mark.height === markPx,
    `${mark.form} at ${mark.width}x${mark.height}, expected full at ${markPx}`);

  // THE `<img>` TRAP. An external SVG resolves `currentColor` against its own root, so this
  // renders black in every theme with correct-looking markup and no error.
  report(`${label}px · the art is masked, never an <img>`, mark.images === 0,
    `${mark.images} <img> inside the mark`);

  const ink = rgb(mark.artInk ?? "");
  const black = ink.length === 3 && ink.every((c) => c === 0);
  report(`${label}px · and the ink is the rank's own token, not black`,
    ink.length === 3 && !black,
    `painted ${mark.artInk}`);

  report(`${label}px · the mask names the rank's own file`,
    /bracket-\d-[a-z]+\.svg/.test(mark.maskImage ?? ""),
    (mark.maskImage ?? "none").slice(0, 120));

  // THE SUBTRACTION. Without the second layer the file's own serif numeral survives in the mask
  // and sits UNDER the Cinzel one in the same ink — a doubled digit, worse than either alone.
  report(`${label}px · and subtracts the file's own numeral`,
    /radial-gradient/.test(mark.maskImage ?? "") && /intersect|source-in/.test(mark.maskComposite ?? ""),
    `composite ${mark.maskComposite}`);

  // THE RULING'S OWN PROOF. Every wrong answer renders a plausible mark; only the resolved face
  // tells them apart.
  report(`${label}px · the numeral is HTML text in Cinzel`,
    /cinzel/i.test(mark.numeralFamily ?? "") && mark.numeralText === String(mark.bracket),
    `"${mark.numeralText}" in ${mark.numeralFamily}`);

  report(`${label}px · and that face is actually loaded`, mark.cinzelLoaded === true,
    mark.cinzelLoaded ? "Cinzel is loaded" : "no loaded Cinzel face — the numeral draws in the fallback");

  // ── The file is SERVED ──────────────────────────────────────────────────────────────────
  const asset = (mark.maskImage ?? "").match(/\/brackets\/[a-z0-9-]+\.svg/)?.[0];
  if (asset) {
    const res = await page.request.get(`${BASE}${asset}`);
    const body = res.ok() ? await res.text() : "";
    report(`${label}px · ${asset} is served`,
      res.ok() && body.includes("<svg"),
      `${res.status()}, ${body.length} bytes`);
  } else {
    report(`${label}px · a mask url to fetch`, false, "no /brackets/ url in the computed mask");
  }

  // ── The contrast ground, measured rather than inherited ─────────────────────────────────
  const numeralInk = rgb(mark.numeralInk ?? "");
  const ground = rgb(mark.ground ?? "");
  if (numeralInk.length === 3 && ground.length === 3) {
    const ratio = contrast(numeralInk, ground);
    // NOT 4.5. `contract.test.ts` holds the measured floor and records that rank 1 is 0.0232
    // short of the handoff's stated bar on kaldheim `--surface`; asserting 4.5 here would fail
    // a build that is exactly as drawn. What this catches is a mark landing on a DARKER ground
    // than the block's own, where the shortfall is much larger — kaldheim `--elevated` reads
    // 3.6857.
    report(`${label}px · the numeral clears its painted ground`, ratio >= 4.4,
      `${ratio.toFixed(4)}:1 — ${mark.numeralInk} on ${mark.ground}`);
  } else {
    report(`${label}px · a painted ground to measure`, false,
      `ink ${mark.numeralInk}, ground ${mark.ground}`);
  }

  // ── The population line ─────────────────────────────────────────────────────────────────
  const foot = await page.evaluate((scope) => {
    const root = document.querySelector(scope);
    const block = root?.querySelector('section[aria-label="Your bracket"]');
    return (block?.textContent ?? "").replace(/\s+/g, " ").trim();
  }, PAGE);

  report(`${label}px · the foot says what other players say`,
    foot.includes("What other players say"), foot.slice(0, 80));

  // THE DENOMINATOR IS INSIDE THE SENTENCE, and this reads the DRAWN text rather than the copy
  // function — a layout that dropped the figure would leave the copy untouched. Either reading
  // is legitimate: the absent one is the honest answer for the 27 commanders with no counts.
  const present = /Of the [\d,]+ .+ decks that declared a bracket, [\d,]+ said /.test(foot);
  const absent = /EDHREC has no declared brackets for /.test(foot);
  report(`${label}px · and draws one of its two readings whole`, present || absent,
    present ? "present, denominator inside the sentence" : absent ? "absent, never a zero" : "neither");

  // ── The climb ───────────────────────────────────────────────────────────────────────────
  //
  // THE MARK AT 390 IS THE WHOLE POINT. `HANDOFF.md` lists "do not drop the bracket mark at 390"
  // among the three things most likely to get broken in build, and the rungs carry it at 22 /
  // 26 — which straddles the chip/full boundary, so a neighbour mounts two and a CSS breakpoint
  // cannot serve both. What proves the right one drew is its RESOLVED width, not its class list.
  const climb = await page.evaluate((scope) => {
    const root = document.querySelector(scope);
    const rungs = [...(root?.querySelectorAll('[data-testid="climb-rung"]') ?? [])];
    return rungs.map((rung) => {
      const marks = [...rung.querySelectorAll('[data-testid="bracket-mark"]')]
        .map((m) => ({ form: m.dataset.form, w: Math.round(m.getBoundingClientRect().width) }))
        // A mark whose box is 0 wide is the width this run is NOT at, hidden by `display:none`.
        .filter((m) => m.w > 0);
      const box = rung.getBoundingClientRect();
      return {
        role: rung.dataset.role,
        bracket: Number(rung.dataset.bracket),
        marks,
        width: Math.round(box.width),
        right: Math.round(box.right),
        figures: [...rung.querySelectorAll('[data-testid="climb-figure"]')].length,
        text: (rung.textContent ?? "").replace(/\s+/g, " ").trim(),
      };
    });
  }, PAGE);

  report(`${label}px · the climb draws its rungs`, climb.length >= 2,
    climb.length ? climb.map((r) => `${r.bracket}:${r.role}`).join(" ") : "no rungs");

  if (climb.length >= 2) {
    // EXACTLY ONE VISIBLE MARK PER RUNG. The neighbour rungs mount two and hide one; a build
    // that hid neither would draw the chip and the full mark side by side, which every DOM
    // assertion passes over because both are in the document either way.
    const visible = climb.map((r) => r.marks.length);
    report(`${label}px · every rung draws exactly one mark`,
      visible.every((n) => n === 1), `marks per rung: ${visible.join(", ")}`);

    const expected = label === 390 ? { yours: 26, other: 22 } : { yours: 36, other: 26 };
    const sizes = climb.map((r) => ({
      role: r.role,
      want: r.role === "yours" ? expected.yours : expected.other,
      got: r.marks[0]?.w ?? 0,
    }));
    report(`${label}px · at the ship size for its role`,
      sizes.every((s) => s.got === s.want),
      sizes.map((s) => `${s.role} ${s.got}/${s.want}`).join(", "));

    // THE FIGURES BELONG TO THE RUNG THAT HOLDS, and only it. The rung below carries a sentence
    // about what to cut and the one above carries what it permits; allowances on either would be
    // the figures of a bracket the deck is not on. An earlier version collected this and never
    // read it, so a build drawing figures on all three passed every climb check here.
    const misplaced = climb.filter((r) => r.role !== "yours" && r.figures > 0);
    report(`${label}px · only the rung that holds carries figures`, misplaced.length === 0,
      climb.map((r) => `${r.role}:${r.figures}`).join(" "));

    // "The climb states, the findings open." Its one control is the lower rung's
    // `what would have to go →`, which opens sheet 3b; nothing else in it is pressable.
    const pressable = await page.evaluate((scope) => {
      const root = document.querySelector(scope);
      const climbRoot = root?.querySelector('[data-testid="climb-rung"]')?.parentElement;
      return [...(climbRoot?.querySelectorAll("button, a, [role=button]") ?? [])].map((b) => ({
        rung: b.closest('[data-testid="climb-rung"]')?.getAttribute("data-role") ?? null,
        popup: b.getAttribute("aria-haspopup"),
      }));
    }, PAGE);
    const others = pressable.filter((p) => !(p.rung === "below" && p.popup === "dialog"));
    report(`${label}px · nothing in the climb opens but the lower rung's sheet`,
      others.length === 0 && pressable.length <= 1,
      `${pressable.length} pressable: ${pressable.map((p) => `${p.rung}/${p.popup}`).join(", ") || "none"}`);

    // A rung that overflows its own box is the failure a phone finds and a desktop hides.
    const overflow = climb.filter((r) => r.right > viewportWidth);
    report(`${label}px · no rung runs past the viewport`, overflow.length === 0,
      overflow.length ? `${overflow.length} rung(s) past ${viewportWidth}` : `widest ${Math.max(...climb.map((r) => r.width))}px`);
  }

  // ── The sub-line ────────────────────────────────────────────────────────────────────────
  const subLine =
    /which of the two this is, is yours to say/i.test(foot)
    || /which one this is, is how you play it/i.test(foot)
    || /Nothing else in the 99 reaches further/.test(foot);
  report(`${label}px · one sentence says why`, subLine,
    subLine ? "a reading is drawn" : "no sub-line matched any of the four readings");
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const first = await browser.newContext({ viewport: WIDTHS[0].viewport });
    const scout = await first.newPage();
    await signIn(scout);
    const href = await findDeck(scout);
    await first.close();
    // A MISSING FIXTURE IS A FAILURE, AND IT HAS TO REACH THE EXIT CODE. An earlier version
    // returned here, which skipped the summary and the `process.exitCode` line below the
    // `finally` — so the run printed one ` FAIL ` and then exited 0, and no CI job or manual
    // run could act on it. The summary now lives outside `run()` and every path reaches it.
    if (!href) {
      report("a deck to walk", false, "this account owns no decks — the fixture is missing");
      return;
    }
    console.log(`       (walking ${href})`);

    for (const { label, viewport, markPx } of WIDTHS) {
      const ctx = await browser.newContext({ viewport });
      const p = await ctx.newPage();
      await signIn(p);
      await p.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      const tablist = await p
        .waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      // NOT SWALLOWED. A page that never rendered yields no tabs, and "no Analysis tab" would
      // then read as a flag being off rather than as the run measuring nothing.
      if (!report(`${label}px · the deck page rendered its tab row`, tablist,
          tablist ? "tablist is up" : "no tablist — the page did not render")) {
        await ctx.close();
        continue;
      }
      await p.waitForTimeout(600);

      const tabs = await p.evaluate((scope) => {
        const root = document.querySelector(scope);
        return [...(root?.querySelectorAll('[role="tab"]') ?? [])].map((t) =>
          ((t.textContent ?? "") + " " + (t.getAttribute("aria-label") ?? "")).trim());
      }, PAGE);
      const analysisAt = tabs.findIndex((t) => /analysis/i.test(t));
      if (!report(`${label}px · the Analysis tab is drawn`, analysisAt !== -1,
          analysisAt === -1
            ? "absent — is ANALYSIS_TAB_ENABLED set on the server this port is serving?"
            : "present")) {
        await ctx.close();
        continue;
      }

      // REACHED BY A PRESS, never by a URL: the tab is client state and produces no address,
      // which is why the card mark shipped broken into a surface a URL sweep photographed.
      await onPage(p, '[role="tab"]').nth(analysisAt).click();
      await p.waitForTimeout(500);
      const invite = onPageRole(p, "button", /Analyze this deck/);
      if ((await invite.count()) > 0) {
        await invite.first().click();
        await onPageRole(p, "button", /Analyze again/)
          .first()
          .waitFor({ state: "visible", timeout: 20_000 })
          .catch(() => {});
      }

      await walk(p, label, markPx, viewport.width);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

await run();
// THE SUMMARY IS OUTSIDE `run()`, so no early return can skip it — and `process.exit` is not
// used at all, because inside a `finally` it swallows a throw and prints "all checks passed"
// over a run that never reached its checks. Three probes here have been written with that bug.
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
