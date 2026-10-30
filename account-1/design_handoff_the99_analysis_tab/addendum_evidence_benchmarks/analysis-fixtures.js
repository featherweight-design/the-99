// Fixtures for the Analysis tab frames. Every string is the shipped copy module's
// (src/lib/copy/deck-analysis.ts, declaration.ts, upgrade-path.ts) or Round 4's
// card-note copy for the stale and trigger states; nothing is retyped from memory.
const NAMES = { 1: "Exhibition", 2: "Core", 3: "Upgraded", 4: "Optimized", 5: "cEDH" };
const SLUG = { 1: "1-exhibition", 2: "2-core", 3: "3-upgraded", 4: "4-optimized", 5: "5-cedh" };
const FACT = {
  gc: "fact-game-changer", mld: "fact-mass-land-denial", et: "fact-extra-turns",
  combo: "fact-two-card-infinite", tutor: "fact-tutors",
};
const ink = (b) => `var(--bracket-${b})`;

// The art is the asset files themselves, fetched and inlined (currentColor inked by the
// wrapper) — lifted verbatim, never redrawn.
export async function loadArt() {
  const files = [];
  for (const b of [1, 2, 3, 4, 5]) files.push(`bracket-${SLUG[b]}`, `bracket-${SLUG[b]}-chip`);
  files.push(...Object.values(FACT));
  const out = {};
  await Promise.all(files.map(async (f) => {
    const t = await (await fetch(new URL(`assets/${f}.svg`, document.baseURI))).text();
    out[f] = t.replace(/<metadata>[\s\S]*?<\/metadata>/, "").replace(/#000/g, "currentColor")
      .replace(/<svg /, '<svg style="display:block;width:100%;height:100%" ');
  }));
  return out;
}

export function build(React, state, phone, art = {}) {
  const h = React.createElement;
  const mask = (url) => ({
    WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`,
    WebkitMaskSize: "contain", maskSize: "contain",
    WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
    WebkitMaskPosition: "center", maskPosition: "center",
  });
  // Full form at 26 / 36 / 44, chip at 22 — ASSETS.md's sanctioned sizes only.
  const mark = (b, px, dim, op) => h("span", {
    "aria-hidden": true,
    dangerouslySetInnerHTML: { __html: art[`bracket-${SLUG[b]}${px < 26 ? "-chip" : ""}`] || "" },
    style: { display: "block", flex: "none", width: px, height: px, color: ink(b), opacity: dim ? 0.65 : op },
  });
  const fact = (id, op) => h("span", {
    "aria-hidden": true,
    dangerouslySetInnerHTML: { __html: art[FACT[id]] || "" },
    style: {
      display: "block", flex: "none", width: 16, height: 16, color: "var(--fact)", opacity: op,
      filter: "drop-shadow(0 0 3px color-mix(in oklab, var(--fact) 45%, transparent))",
    },
  });

  // The deck header as spine-desktop.tsx / spine-mobile.tsx draw it: the commander's
  // art_crop washed per art-wash.tsx (left-portrait 560 at 1300, cover 288 at 390).
  const artUrl = (name) => `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image&version=art_crop`;
  const pip = (c) => ({ style: { display: "block", width: 10, height: 10, borderRadius: 2, background: `var(--${c})`, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)" } });
  const deck = (name, commander, label, colors, version, date, extra = {}) => {
    const url = artUrl(commander);
    return {
      name, commander, colorLabel: label, pips: colors.map(pip),
      statusLabel: extra.statusLabel || "Complete",
      pillDesk: { display: "flex", alignItems: "center", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", border: "1px solid var(--border-strong)", whiteSpace: "nowrap", color: `var(${extra.statusToken || "--success"})`, background: `color-mix(in srgb, var(${extra.statusToken || "--success"}) 18%, var(--bg))` },
      pillPhone: { display: "flex", flex: "none", alignItems: "center", borderRadius: 6, height: 22, padding: "0 7px", fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", border: "1px solid var(--border-strong)", whiteSpace: "nowrap", textShadow: "none", color: `var(${extra.statusToken || "--success"})`, background: `color-mix(in srgb, var(${extra.statusToken || "--success"}) 18%, var(--bg))` },
      pillStyle: { color: `var(${extra.statusToken || "--success"})`, background: `color-mix(in srgb, var(${extra.statusToken || "--success"}) 18%, var(--bg))` },
      barStyle: { width: "100%", height: "100%", background: `var(${extra.statusToken || "--success"})` },
      versionLine: `v${version} · committed ${date}`, draft: false, clean: true, nextVersion: version + 1,
      artDesk: {
        position: "absolute", left: 0, top: 0, bottom: 0, width: 560, opacity: 0.92,
        backgroundImage: `url("${url}")`, backgroundSize: "cover", backgroundPosition: "center top", backgroundRepeat: "no-repeat",
        WebkitMaskImage: "linear-gradient(90deg, #000 0 58%, transparent 100%)", maskImage: "linear-gradient(90deg, #000 0 58%, transparent 100%)",
      },
      artPhone: {
        position: "absolute", inset: 0, opacity: 0.8,
        backgroundImage: `url("${url}")`, backgroundSize: "cover", backgroundPosition: "center top", backgroundRepeat: "no-repeat",
      },
      ...extra,
    };
  };
  const decks = {
    yuriko: deck("HD - Yuriko", "Yuriko, the Tiger's Shadow", "Dimir", ["u", "b"], 3, "14 Sep 2026"),
    tovolar: deck("HD - Tovolar", "Tovolar, Dire Overlord", "Gruul", ["r", "g"], 3, "18 Sep 2026"),
    tovolarDraft: deck("HD - Tovolar", "Tovolar, Dire Overlord", "Gruul", ["r", "g"], 3, "18 Sep 2026", {
      draft: true, clean: false, statusLabel: "To buy", statusToken: "--accent",
      // pending-banner.tsx at 7+ changes: counts, "since", the money sentence, Review primary.
      adds: "+4", removes: "−3", since: "7 changes since v3",
      moneyHead: "3 of the 4 are short of spare copies, so this commit will ask for 3 to buy · ", moneyFig: "$62.40", moneyTail: ".",
      reviewCta: "Review 7 changes",
    }),
    kinnan: deck("HD - Kinnan", "Kinnan, Bonder Prodigy", "Simic", ["g", "u"], 2, "20 Sep 2026"),
  };

  // ---------- the generated Overview (sub-project 6), at the length it will ship ----------
  // Card names carry the app's existing hover preview; drawn here as bold only.
  const sum = (...parts) => parts.map((p) => (typeof p === "string" ? { t: p, card: false, plain: true } : { t: p[0], card: true, plain: false }));
  const summaries = {
    yuriko: sum("A Dimir ninjutsu deck that hits early with evasive one-drops and swaps them for ", ["Yuriko, the Tiger's Shadow"], " before blockers exist. Every trigger reveals a card and drains each opponent for its mana value, so the list stacks high-cost spells on top with ", ["Brainstone"], " and ", ["Scroll Rack"], ". ", ["Force of Will"], " and ", ["Cyclonic Rift"], " protect the plan, ", ["Rhystic Study"], " keeps the hand full while ninjas return to it, and the deck closes by chaining reveals off ", ["Enter the Infinite"], "."),
    tovolar: sum("A Gruul werewolf deck that wants the day/night clock turning every turn. ", ["Tovolar, Dire Overlord"], " draws a card whenever a wolf connects and flips the whole team into night, so the list is full of two- and three-drop werewolves that are modest by day and much larger by night. Ramp is front-loaded, with ", ["Ancient Tomb"], " and land-based acceleration, so the pack lands a turn early; ", ["Jeska's Will"], " refuels once it does. Nights are kept long with ", ["Moonmist"], " and anything that denies a second spell per turn, and ", ["Eldritch Evolution"], " finds whichever threat the table has not answered. It wins through wide, repeated combat steps rather than a single alpha strike."),
    kinnan: sum("A Simic artifact-ramp deck that treats ", ["Kinnan, Bonder Prodigy"], " as the engine and every nonland mana rock as a multiplier. Early turns deploy ", ["Mana Vault"], ", ", ["Grim Monolith"], " and cheap dorks to reach Kinnan's activated ability as fast as possible, turning surplus mana into creatures off the top. ", ["Basalt Monolith"], " with Kinnan out is infinite colorless mana, and the rest of the list is tutors and draw that find either half: ", ["Mystical Tutor"], " for the Monolith, ", ["Fauna Shaman"], " for the pieces that sink the mana. Without the combo it plays a value game off ", ["Rhystic Study"], " and big Kinnan hits, but the deck is built to end the game the turn the pair meets."),
  };

  // ---------- findings ----------
  const F = (id, label, count, names, namesPhone, extra = {}) => ({
    id, label, count, empty: count === 0, present: count > 0,
    names, namesPhone, noLimit: !!extra.noLimit,
    control: extra.combo ? (count === 1 ? "see the combo" : "see the combos") : count === 1 ? "see the card" : "see the cards",
    mark: fact(id), markDim: fact(id, 0.35),
  });
  const findings = {
    yuriko: [
      F("gc", "Game changers", 5, "Rhystic Study · Cyclonic Rift · +3", "Rhystic Study · Cyclonic Rift · Force of Will · +2"),
      F("mld", "Mass land denial", 0),
      F("et", "Extra turns", 0),
      F("combo", "Two-card infinites", 0, "", "", { combo: true }),
      F("tutor", "Tutors", 7, "Demonic Tutor · Vampiric Tutor · +5", "Demonic Tutor · Vampiric Tutor · Imperial Seal · +4", { noLimit: true }),
    ],
    tovolar: [
      F("gc", "Game changers", 2, "Ancient Tomb · Jeska's Will", "Ancient Tomb · Jeska's Will"),
      F("mld", "Mass land denial", 0),
      F("et", "Extra turns", 0),
      F("combo", "Two-card infinites", 0, "", "", { combo: true }),
      F("tutor", "Tutors", 2, "Worldly Tutor · Eldritch Evolution", "Worldly Tutor · Eldritch Evolution", { noLimit: true }),
    ],
    kinnan: [
      F("gc", "Game changers", 3, "Mana Vault · Grim Monolith · +1", "Mana Vault · Grim Monolith · Rhystic Study"),
      F("mld", "Mass land denial", 0),
      F("et", "Extra turns", 0),
      F("combo", "Two-card infinites", 1, "Kinnan, Bonder Prodigy + Basalt Monolith", "Kinnan, Bonder Prodigy + Basalt Monolith", { combo: true }),
      F("tutor", "Tutors", 4, "Mystical Tutor · Worldly Tutor · +2", "Mystical Tutor · Worldly Tutor · Fauna Shaman · +1", { noLimit: true }),
    ],
  };

  // ---------- climb ----------
  const neighbourMark = (b) => (phone ? mark(b, 22, false, 0.75) : mark(b, 26, false, 0.75));
  const rung = (role, b, o = {}) => {
    const yours = role === "yours";
    const declares = !!o.declares;
    return {
      role, bracket: b, name: NAMES[b], yours, below: role === "below", above: role === "above", notYours: !yours,
      mark: yours ? mark(b, phone ? 26 : 36) : neighbourMark(b),
      label: role === "below" ? "To downgrade your deck" : yours ? (phone ? "your cards" : "where your cards are") : declares ? "to claim this" : "already allowed",
      pre: o.pre || "", strong: o.strong || "", post: o.post || "", hasBody: !!(o.pre || o.post),
      figures: (o.figures || []).map((f) => ({ ...f, mark: fact(f.id), inkStyle: { color: ink(b) } })),
      hasFigures: !!(o.figures && o.figures.length),
      hasPath: !!o.path,
      boxStyle: yours
        ? { borderRadius: 8, background: `color-mix(in oklab, ${ink(b)} 12%, var(--surface))`, border: `1px solid ${ink(b)}` }
        : declares
          ? { borderRadius: 8, border: `1px dashed color-mix(in oklab, ${ink(b)} 55%, transparent)` }
          : role === "below"
            ? { borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-sunken)" }
            : { borderRadius: 8, border: "1px solid var(--border)" },
      nameStyle: yours ? { color: ink(b), fontWeight: 600, fontSize: phone ? 13 : 13.5 } : { color: "var(--fg-body)", fontWeight: 600, fontSize: 12.5 },
      labelStyle: { color: yours ? ink(b) : "var(--fg-faint)" },
    };
  };
  const aboveAllowed = "Nothing rules it out. It permits more than this deck uses.";
  const climbs = {
    tovolar: [
      rung("below", 2, { pre: "Cut ", strong: "Ancient Tomb and Jeska's Will", post: ": Core allows none.", path: true }),
      rung("yours", 3, { figures: [{ id: "gc", name: "Game changers", have: 2, allow: "3 allowed" }] }),
      rung("above", 4, { pre: aboveAllowed }),
    ],
    yuriko: [
      rung("below", 3, { pre: "Cut ", strong: "two game changers", post: ", only three allowed at Upgraded.", path: true }),
      rung("yours", 4, { figures: [{ id: "gc", name: "Game changers", have: 5, allow: "no cap" }] }),
      rung("above", 5, { declares: true, pre: "Nothing to change. Four and five share their card limits: the difference is how you play it, and the answer is in the block above." }),
    ],
    kinnan: [
      rung("below", 3, { pre: "Cut ", strong: "one two-card infinite", post: ": Upgraded allows none.", path: true }),
      rung("yours", 4, { figures: [{ id: "gc", name: "Game changers", have: 3, allow: "no cap" }, { id: "combo", name: "Two-card infinites", have: 1, allow: "no cap" }] }),
      rung("above", 5, { pre: aboveAllowed }),
    ],
  };

  // ---------- mix (counted from the list, true in every state) ----------
  const cell = (label, have, target) => {
    const met = have >= target;
    const pct = Math.min(100, Math.round((have / target) * 100));
    return {
      label, have, target, rec: `rec ${target}`, met, short: !met,
      figStyle: { color: met ? "var(--fg)" : "var(--warning)" },
      barStyle: { width: `${pct}%`, height: "100%", borderRadius: 999, background: met ? "var(--success)" : "var(--warning)" },
    };
  };
  const mixes = {
    yuriko: [cell("Ramp", 9, 10), cell("Card draw", 14, 12), cell("Removal", 11, 10), cell("Board wipes", 2, 3), cell("Lands", 33, 33)],
    tovolar: [cell("Ramp", 13, 12), cell("Card draw", 8, 10), cell("Removal", 9, 9), cell("Board wipes", 2, 2), cell("Lands", 37, 37)],
    kinnan: [cell("Ramp", 16, 12), cell("Card draw", 10, 11), cell("Removal", 6, 8), cell("Board wipes", 1, 2), cell("Lands", 32, 34)],
  };

  // ---------- the bracket box ----------
  const chip = (low, high) => ({
    chipStyle: { display: "inline-flex", borderRadius: 999, border: `1px solid color-mix(in oklab, ${ink(low)} 55%, transparent)` },
    chipInk: { color: ink(low) },
    chipLow: mark(low, phone ? 26 : 36),
    chipHigh: high ? mark(high, phone ? 26 : 36, true) : null,
    chipSplit: !!high,
    chipLabel: high ? "Split" : NAMES[low],
  });
  const bandChip = (low, high) => h("span", {
    style: {
      display: "inline-flex", alignItems: "center", gap: 5, flex: "none", height: phone ? 22 : 24,
      padding: "0 8px 0 2px", borderRadius: 6, textShadow: "none",
      background: `color-mix(in srgb, ${ink(low)} 12%, var(--bg))`,
      border: `1px solid color-mix(in oklab, ${ink(low)} 55%, transparent)`,
      fontFamily: "'IBM Plex Mono',monospace", fontSize: phone ? 10 : 11, color: ink(low), whiteSpace: "nowrap",
    },
  }, mark(low, 22), high ? mark(high, 22, true) : null, h("span", null, high ? `${NAMES[low]} or ${NAMES[high]}` : NAMES[low]));
  const trig = (kind, label, cost) => ({
    trigFilled: kind === "filled", trigOutlined: kind === "outlined", trigDisabled: kind === "disabled",
    trigLabel: label, trigCost: cost || "", hasCost: !!cost,
  });
  const pop = (present, line) => ({ popPresent: present, popAbsent: !present, ...line });
  const yurikoPop = pop(true, { popDeclared: "9,730", popSubject: "Yuriko", popSaid: "3,884", popName: "Optimized" });
  const tovolarPop = pop(false, { popAbsentLine: "EDHREC has no declared brackets for Tovolar." });
  const kinnanPop = pop(true, { popDeclared: "6,412", popSubject: "Kinnan", popSaid: "3,105", popName: "Optimized" });

  const base = {
    invite: false, loading: false, failed: false, ready: false, stale: false, failedHeld: false,
    tabDot: false, provenance: "", face: "", subline: "", hasSubline: false,
    ask: false, answered: false, versionRow: false, lean: false, changed: false,
    headOpacity: {}, tagged: false, staleBanner: false, band: null, hasBand: false,
  };

  // Pre-analysis empty state: the five marks as a rising ladder, one sanctioned size per step.
  // Pre-analysis empty state: the five marks on a ring, 1 at the top, reading clockwise,
  // each at 44 in its rank's ink. Loading lights them in order around the ring.
  const RING = 150, R = 50, MPX = 44;
  const ladder = (mode) => h("span", {
    "aria-hidden": true,
    style: { position: "relative", display: "block", flex: "none", width: RING, height: RING, margin: phone ? "0 auto" : 0 },
  }, [1, 2, 3, 4, 5].map((b, i) => {
    const t = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return h("span", {
      key: b,
      style: {
        position: "absolute",
        left: Math.round(RING / 2 + R * Math.cos(t) - MPX / 2),
        top: Math.round(RING / 2 + R * Math.sin(t) - MPX / 2),
        opacity: mode === "failed" ? 0.3 : mode === "loading" ? 0.22 : 1,
        animation: mode === "loading" ? `at-wave 1.6s ease-in-out ${i * 0.16}s infinite` : undefined,
      },
    }, mark(b, MPX));
  }));

  const S = {};
  const invite = (extra) => ({
    ...base, deck: decks.tovolar, invite: true, preAnalysis: true,
    ladder: ladder("idle"), ctaAnalyze: true, ctaRetry: false, ctaBusy: false,
    emptyHead: "Five brackets. Your cards pick which.",
    emptyBody: "One pass over your list against the Commander Format Panel's rules, and we'll tell you which brackets your cards permit, and which cards put it there.",
    emptyBody2: "The reading is kept with the deck. Edit the list and it waits for you to ask again.",
    inviteHead: "This deck has not been analyzed",
    inviteLine: "Your cards decide which brackets this deck can sit in. One pass over all 99 and we'll tell you which.",
    mix: mixes.tovolar, ...extra,
  });
  S.idle = invite(trig("filled", "Analyze this deck", "about two seconds"));
  S.loading = invite({
    ...trig("disabled", "Reading your deck…"), loading: true, ladder: ladder("loading"),
    ctaAnalyze: false, ctaBusy: true,
    emptyHead: "Reading your deck…",
    emptyBody: "Checking your list against each bracket's rules.",
    emptyBody2: "",
  });
  S.failed = invite({
    ...trig("filled", "Try again"), invite: false, failed: true, ladder: ladder("failed"),
    ctaAnalyze: false, ctaRetry: true,
    emptyHead: "We could not finish reading this deck.",
    emptyBody: "The mix below is counted from your list and is true now. Nothing about your deck changed.",
    emptyBody2: "",
    failedLine: "We could not finish reading this deck. The mix below is counted from your list and is true now.",
  });

  const ready = (o) => ({ ...base, ready: true, hasBand: true, overviewPresent: true, overviewAbsent: false, overviewRefused: false, writeEnabled: true, ...o });
  S.rangeAsk = ready({
    deck: decks.yuriko, ...trig("outlined", "Analyze again"),
    provenance: "determined against all 99 · 2 minutes ago",
    face: "Optimized or cEDH", ...chip(4, 5), hasSubline: true, band: bandChip(4, 5), summary: summaries.yuriko,
    analyzed: "analyzed 2 minutes ago",
    subline: phone
      ? "Bracket 3 only permits up to three game changers. Which of the two this is, is how you play it."
      : "Bracket 3 only permits up to three game changers. Four and five have no card limits between them, so which one this is, is how you play it.",
    ask: true, askChips: [4, 5].map((b) => ({ name: NAMES[b], mark: mark(b, phone ? 26 : 22), style: { display: "inline-flex", borderRadius: 9, border: `1px solid color-mix(in oklab, ${ink(b)} 45%, var(--border))` } })),
    ...yurikoPop, climb: climbs.yuriko, findings: findings.yuriko, mix: mixes.yuriko,
  });
  S.rangeAnswered = ready({
    ...S.rangeAsk, ask: false, answered: true, hasSubline: false,
    provenance: "determined against all 99 · 21 Sept", analyzed: "analyzed 21 Sept", band: bandChip(4),
    face: "Optimized", ...chip(4),
    subline: "Your cards permit Optimized or cEDH: the two have no card limits between them.",
    declaredPre: "Declared ", declaredName: "Optimized", declaredPost: " for version 3.",
  });
  S.single = ready({
    deck: decks.tovolar, ...trig("outlined", "Analyze again"),
    provenance: "determined for version 3 · all 99 · 18 Sept",
    face: "Upgraded", ...chip(3), hasSubline: true, band: bandChip(3), summary: summaries.tovolar,
    analyzed: "analyzed with version 3 · 18 Sept",
    subline: "Two game changers, and Core allows none at all. Nothing else in the 99 reaches further.",
    versionRow: true, vPrev: mark(4, 24), vPrevLabel: "version 2", vNow: mark(3, 24), vNowLabel: "this version",
    vPre: "This version reads as ", vStrong: "Upgraded", vPost: ". Version 2 read as Optimized or cEDH and was declared Optimized.",
    ...tovolarPop, climb: climbs.tovolar, findings: findings.tovolar, mix: mixes.tovolar,
  });
  S.singleLean = ready({
    deck: decks.kinnan, ...trig("outlined", "Analyze again"),
    provenance: "determined for version 2 · all 99 · 20 Sept",
    face: "Optimized", ...chip(4), hasSubline: true, band: bandChip(4), summary: summaries.kinnan,
    analyzed: "analyzed with version 2 · 20 Sept",
    subline: "This deck can assemble a two-card infinite rather than draw into it, which is past Upgraded. Nothing else in the 99 reaches further.",
    lean: true, leanPre: "Your commander is one half of a ", leanA: "Kinnan, Bonder Prodigy", leanMid: " + ", leanB: "Basalt Monolith",
    leanPost: " two-card infinite combo, and your tutors can find the other, so the pair is part of the plan rather than a draw away. That is what puts this past Upgraded.",
    ...kinnanPop, climb: climbs.kinnan, findings: findings.kinnan, mix: mixes.kinnan,
  });
  S.stale = ready({
    ...S.single, deck: decks.tovolarDraft, ...trig("filled", "Analyze again"), stale: true, tagged: false, staleBanner: true,
    bannerLine: "Your deck has changes since it was analyzed, so this bracket might not be accurate.",
    bannerCta: "Re-analyze", analyzed: "analyzed 18 Sept, before your changes",
    versionRow: false,
    provenance: "determined against 96 of these 99 · 7 cards have changed since",
    face: "Upgraded",
    changed: false, changedRows: [
      { sign: "+", name: "Gaea's Cradle", added: true, removed: false },
      { sign: "+", name: "Mana Vault", added: true, removed: false },
      { sign: "−", name: "Cultivate", added: false, removed: true },
      { sign: "+", name: "Worldly Tutor", added: true, removed: false },
      { sign: "+", name: "Sylvan Library", added: true, removed: false },
      { sign: "−", name: "Kodama's Reach", added: false, removed: true },
      { sign: "−", name: "Farseek", added: false, removed: true },
    ],
    changedFacts: "2 of these carry facts the brackets count.",
  });
  S.yurikoStale = ready({
    ...S.rangeAnswered, ...trig("filled", "Re-analyze"), stale: true, staleBanner: true,
    deck: deck("HD - Yuriko", "Yuriko, the Tiger's Shadow", "Dimir", ["u", "b"], 3, "14 Sep 2026", {
      draft: true, clean: false, statusLabel: "To buy", statusToken: "--accent",
      adds: "+3", removes: "−3", since: "6 changes since v3",
      moneyHead: "2 of the 3 are short of spare copies, so this commit will ask for 2 to buy · ", moneyFig: "$21.80", moneyTail: ".",
      reviewCta: "Review 6 changes",
    }),
    bannerLine: "Your deck has changes since it was analyzed, so this bracket might not be accurate.",
    bannerCta: "Re-analyze", analyzed: "analyzed 18 Sept, before your changes",
  });
  S.failedHeld = ready({
    ...S.stale, ...trig("filled", "Try again"), failedHeld: true,
    bannerLine: "We couldn't re-analyze your changes. The bracket below is from before them.",
    bannerCta: "Try again",
    failedLine: "We could not finish reading this deck. The mix below is counted from your list and is true now.",
  });

  // ---------- credits (the shared string with the tuning panel; 12-hour time, never "today") ----------
  const CR = { n: 4, total: 5, time: "2:20 PM" };
  const left = `${CR.n} of ${CR.total} left \u00b7 next one at ${CR.time}`;
  const spent = `0 of ${CR.total} left \u00b7 next one at ${CR.time}. Synopses and suggestions share these credits.`;
  const note = {
    analyze: `Also writes the overview, using a credit. ${left}.`,
    analyzeSpent: `Reads the bracket only; the overview waits for a credit. ${spent}`,
    reanalyzeSpent: `Reads the bracket only; the overview stays as it was. ${spent}`,
    write: `Uses a credit. ${left}.`,
    writeSpent: spent,
  };
  // 2a / 2c: Analyze and its retry write the overview. 2b: nothing to press.
  S.idle = { ...S.idle, emptyNote: note.analyze };
  S.failed = { ...S.failed, emptyNote: note.analyze };
  S.idleSpent = { ...S.idle, emptyNote: note.analyzeSpent };
  // 2i / 2d: the list changed, so the press writes the overview.
  S.stale = { ...S.stale, bannerNote: note.analyze };
  S.yurikoStale = { ...S.yurikoStale, bannerNote: note.analyze };
  S.failedHeld = { ...S.failedHeld, bannerNote: note.analyze };
  S.staleSpent = { ...S.stale, bannerNote: note.reanalyzeSpent };
  // Unchanged for the overview: it was already written for this list, so Re-analyze returns it.
  S.staleOverviewCurrent = { ...S.stale, bannerNote: "" };
  // The Overview's own controls: Round 0's state 2 and state 4.
  S.overviewAbsent = { ...S.rangeAnswered, overviewPresent: false, overviewAbsent: true, overviewNote: note.write };
  S.overviewAbsentSpent = { ...S.overviewAbsent, writeEnabled: false, overviewNote: note.writeSpent };
  S.overviewRefused = { ...S.rangeAnswered, overviewPresent: false, overviewRefused: true, overviewNote: note.write };

  // Fetching the stored reading on tab open: says nothing about whether one exists.
  const fetchRow = h("span", { "aria-hidden": true, style: { display: "flex", alignItems: "center", gap: 10 } },
    [1, 2, 3, 4, 5].map((b, i) => h("span", { key: b, style: { opacity: 0.22, animation: `at-wave 1.6s ease-in-out ${i * 0.16}s infinite` } }, mark(b, 22))));
  S.fetching = { ...base, deck: decks.yuriko, fetching: true, fetchRow, mix: mixes.yuriko };

  // ---------- addendum 2026-09-25: the overview's own loading ----------
  // The press already drew its credit note, so no busy or failed state carries one: a failed write
  // spent nothing, and Try again finishes the same press.
  const pulse = h("span", { "aria-hidden": true, style: { display: "inline-flex", alignItems: "center", gap: 4, flex: "none" } },
    [0, 1, 2].map((i) => h("span", { key: i, style: { display: "block", width: 5, height: 5, borderRadius: 999, background: "var(--fg-muted)", opacity: 0.22, animation: `at-wave 1.6s ease-in-out ${i * 0.16}s infinite` } })));
  const OV = {
    writing: "Writing the overview\u2026",
    writingNew: "writing a new one for your changes",
    olderThanList: "This overview was written before your latest changes.",
  };
  const ovBase = { overviewBusy: false, overviewFailed: false, heldCaption: "", bannerBusy: false, heldBusy: false, heldLine: "", pulse };
  const firstRead = { ...S.single, versionRow: false, analyzed: "analyzed 1 minute ago", ...ovBase };
  S.ovWriting = { ...firstRead, overviewPresent: false, overviewBusy: true, busyLine: OV.writing };
  S.ovWritten = { ...firstRead };
  S.ovFailed = { ...firstRead, overviewPresent: false, overviewFailed: true, overviewNote: "" };
  S.ovReQueued = { ...S.stale, ...ovBase, bannerBusy: true, bannerNote: "", bannerBusyLabel: "Reading your deck\u2026" };
  const reRead = { ...S.single, deck: decks.tovolarDraft, versionRow: false, analyzed: "analyzed 1 minute ago", ...ovBase };
  S.ovReWriting = { ...reRead, heldBusy: true, heldLine: OV.writingNew };
  S.ovReFailed = { ...reRead, overviewFailed: true, overviewNote: "", heldCaption: OV.olderThanList };


  // ---------- addendum 2026-10-10: the method notice and the free rewrite (plan §7.4) ----------
  // Scoped to the Overview: the free press rewrites the overview only. The bracket, its date and
  // the stats are untouched. The free note never carries the credits standing, so it reads the same
  // at 0 credits or with the allowance paused (the free run bypasses both). Copy owed to /copy-review.
  const M = {
    line: "We\u2019ve changed how we write overviews. This one was written the old way.",
    cta: "Write a new overview",
    note: "Free, no credit used. Only the overview is rewritten; your bracket and stats stay as they are.",
    writing: "writing a new one with the new method",
    failedLine: "We couldn\u2019t write the new overview. Nothing about your deck changed.",
    retry: "Try again",
    oneLeft: "1 free try left. No credit used.",
    spentLine: "We couldn\u2019t write the new overview with the free tries. You can still write one with a credit.",
    paidCta: "Write a new overview",
    staleNote: "Also writes the overview, free this once because we changed how overviews are written.",
    withStale: "Re-analyze above writes it the new way, free.",
  };
  const mBase = { ...ovBase, methodNotice: false, mLine: "", mNote: "", mCta: "", mRole: "status", mIcon: "i" };
  const mDeck = { ...S.rangeAnswered, ...mBase };
  S.mEligible = { ...mDeck, methodNotice: true, mLine: M.line, mCta: M.cta, mNote: M.note };
  S.mWriting = { ...mDeck, heldBusy: true, heldLine: M.writing };
  S.mDone = { ...mDeck };
  S.mFailedOne = { ...mDeck, methodNotice: true, mRole: "alert", mIcon: "!", mLine: M.failedLine, mCta: M.retry, mNote: M.oneLeft };
  S.mFailedSpent = { ...mDeck, methodNotice: true, mRole: "alert", mIcon: "!", mLine: M.spentLine, mCta: M.paidCta, mNote: note.write };
  S.mWithStale = { ...S.stale, ...mBase, bannerNote: M.staleNote, methodNotice: true, mLine: M.line, mNote: M.withStale };


  // ---------- addendum 2026-10-10: evidence benchmarks (priority 4c) ----------
  // The block belongs to the reading: drawn with the verdict, stale under the same banner, absent
  // before a first Analyze. Deck headers, bracket, climb and findings are fixtures for context only.
  const bDecks = {
    gishath: deck("HD - Gishath", "Gishath, Sun's Avatar", "Naya", ["r", "g", "w"], 4, "2 Oct 2026"),
    gishathDraft: deck("HD - Gishath", "Gishath, Sun's Avatar", "Naya", ["r", "g", "w"], 4, "2 Oct 2026", {
      draft: true, clean: false, statusLabel: "To buy", statusToken: "--accent",
      adds: "+3", removes: "\u22123", since: "6 changes since v4",
      moneyHead: "1 of the 3 is short of a spare copy, so this commit will ask for 1 to buy \u00b7 ", moneyFig: "$4.10", moneyTail: ".",
      reviewCta: "Review 6 changes",
    }),
    elves: deck("HD - Elves", "Lathril, Blade of the Elves", "Golgari", ["b", "g"], 2, "28 Sep 2026"),
    sultai: deck("HD Tune - Sultai Arisen", "Teval, the Balanced Scale", "Sultai", ["u", "b", "g"], 1, "6 Oct 2026"),
    soldiers: deck("HD - Soldiers", "Myrel, Shield of Argive", "Mono-white", ["w"], 3, "24 Sep 2026"),
  };
  const bSum = {
    gishath: sum("A Naya dinosaur deck that ramps into ", ["Gishath, Sun's Avatar"], " and lets each hit put more dinosaurs onto the battlefield for free. The early turns are land ramp and mana creatures; the middle is enrage engines like ", ["Polyraptor"], ", which loops with ", ["Marauding Raptor"], " or ", ["Terror of the Peaks"], ". Its answers are mostly sorceries and wipes, so it plays best ahead on board."),
    elves: sum("A Golgari elf deck that floods the board with one-drops and turns them into mana. ", ["Lathril, Blade of the Elves"], " makes a token every time it connects, ", ["Priest of Titania"], " and ", ["Elvish Archdruid"], " turn the tribe into a mana engine, and the deck ends games by tapping ten elves at once."),
    sultai: sum("A Sultai graveyard deck built around ", ["Teval, the Balanced Scale"], ". It mills itself every turn, brings lands and creatures back, and grows a Zombie army from every card that leaves the graveyard. ", ["Muldrotha, the Gravetide"], " and ", ["Life from the Loam"], " keep the loop going."),
    soldiers: sum("A mono-white soldier deck led by ", ["Myrel, Shield of Argive"], ", which keeps opponents from responding in combat and makes more soldiers each attack. Anthems like ", ["Field Marshal"], " and ", ["Captain of the Watch"], " stack up, and ", ["Swords to Plowshares"], " clears the way."),
  };
  const bFind = {
    gishath: [
      F("gc", "Game changers", 1, "Smothering Tithe", "Smothering Tithe"),
      F("mld", "Mass land denial", 0), F("et", "Extra turns", 0),
      F("combo", "Two-card infinites", 2, "Marauding Raptor + Polyraptor · +1", "Marauding Raptor + Polyraptor · +1", { combo: true }),
      F("tutor", "Tutors", 2, "Worldly Tutor · Congregation at Dawn", "Worldly Tutor · Congregation at Dawn", { noLimit: true }),
    ],
    elves: [
      F("gc", "Game changers", 2, "Gaea's Cradle · Survival of the Fittest", "Gaea's Cradle · Survival of the Fittest"),
      F("mld", "Mass land denial", 0), F("et", "Extra turns", 0), F("combo", "Two-card infinites", 0, "", "", { combo: true }),
      F("tutor", "Tutors", 1, "Worldly Tutor", "Worldly Tutor", { noLimit: true }),
    ],
    sultai: [
      F("gc", "Game changers", 0), F("mld", "Mass land denial", 0), F("et", "Extra turns", 0),
      F("combo", "Two-card infinites", 0, "", "", { combo: true }), F("tutor", "Tutors", 0, "", "", { noLimit: true }),
    ],
    soldiers: [
      F("gc", "Game changers", 2, "Smothering Tithe · Enlightened Tutor", "Smothering Tithe · Enlightened Tutor"),
      F("mld", "Mass land denial", 0), F("et", "Extra turns", 0), F("combo", "Two-card infinites", 0, "", "", { combo: true }),
      F("tutor", "Tutors", 2, "Enlightened Tutor · Recruiter of the Guard", "Enlightened Tutor · Recruiter of the Guard", { noLimit: true }),
    ],
  };
  const bClimb = {
    gishath: [
      rung("below", 3, { pre: "Cut ", strong: "two two-card infinites", post: ": Upgraded allows none.", path: true }),
      rung("yours", 4, { figures: [{ id: "gc", name: "Game changers", have: 1, allow: "no cap" }, { id: "combo", name: "Two-card infinites", have: 2, allow: "no cap" }] }),
      rung("above", 5, { pre: aboveAllowed }),
    ],
    elves: [
      rung("below", 2, { pre: "Cut ", strong: "Gaea's Cradle and Survival of the Fittest", post: ": Core allows none.", path: true }),
      rung("yours", 3, { figures: [{ id: "gc", name: "Game changers", have: 2, allow: "3 allowed" }] }),
      rung("above", 4, { pre: aboveAllowed }),
    ],
    sultai: [
      rung("below", 1, { pre: "Nothing to cut: the list is inside Exhibition's limits. Exhibition is about how a deck is meant to play." }),
      rung("yours", 2, { pre: "No game changers, mass land denial, extra turns or two-card infinites." }),
      rung("above", 3, { pre: aboveAllowed }),
    ],
    soldiers: [
      rung("below", 2, { pre: "Cut ", strong: "Smothering Tithe and Enlightened Tutor", post: ": Core allows none.", path: true }),
      rung("yours", 3, { figures: [{ id: "gc", name: "Game changers", have: 2, allow: "3 allowed" }] }),
      rung("above", 4, { pre: aboveAllowed }),
    ],
  };
  const bMix = {
    gishath: [cell("Ramp", 12, 11), cell("Card draw", 8, 10), cell("Removal", 13, 9), cell("Board wipes", 5, 3), cell("Lands", 36, 36)],
    elves: [cell("Ramp", 18, 12), cell("Card draw", 5, 10), cell("Removal", 6, 9), cell("Board wipes", 1, 2), cell("Lands", 29, 35)],
    sultai: [cell("Ramp", 10, 11), cell("Card draw", 9, 10), cell("Removal", 7, 8), cell("Board wipes", 2, 2), cell("Lands", 40, 37)],
    soldiers: [cell("Ramp", 9, 10), cell("Card draw", 4, 9), cell("Removal", 12, 9), cell("Board wipes", 3, 3), cell("Lands", 35, 35)],
  };
  const bRead = (id, b, sub, analyzed, popLine) => ready({
    deck: bDecks[id], ...trig("outlined", "Analyze again"), ...ovBase,
    face: NAMES[b], ...chip(b), hasSubline: true, band: bandChip(b), summary: bSum[id],
    analyzed, subline: sub, ...pop(false, { popAbsentLine: popLine }),
    climb: bClimb[id], findings: bFind[id], mix: bMix[id], benchDeck: id, benchStale: false,
  });
  S.bGishath = bRead("gishath", 4, "Two two-card infinites, and Upgraded allows none. Nothing else in the 99 reaches further.", "analyzed with version 4 \u00b7 2 Oct", "EDHREC has no declared brackets for Gishath.");
  S.bElves = bRead("elves", 3, "Two game changers, and Core allows none at all. Nothing else in the 99 reaches further.", "analyzed with version 2 \u00b7 28 Sept", "EDHREC has no declared brackets for Lathril.");
  S.bSultai = bRead("sultai", 2, "No game changers, mass land denial, extra turns or two-card infinites. Nothing in the 99 reaches past Core.", "analyzed with version 1 \u00b7 6 Oct", "EDHREC has no declared brackets for Teval.");
  S.bSoldiers = bRead("soldiers", 3, "Two game changers, and Core allows none at all. Nothing else in the 99 reaches further.", "analyzed with version 3 \u00b7 24 Sept", "EDHREC has no declared brackets for Myrel.");
  S.bStale = { ...S.bGishath, deck: bDecks.gishathDraft, stale: true, staleBanner: true, benchStale: true,
    bannerLine: "Your deck has changes since it was analyzed, so this bracket might not be accurate.",
    bannerCta: "Re-analyze", bannerNote: note.analyze, analyzed: "analyzed 18 Sept, before your changes" };
  Object.assign(bDecks, {
    counter: deck("HD Tune - Counter Intelligence", "Inspirit, Flagship Vessel", "Jeskai", ["w", "u", "r"], 2, "1 Oct 2026"),
    scrappy: deck("HD Tune - Scrappy Survivors", "Dogmeat, Ever Loyal", "Naya", ["r", "g", "w"], 1, "5 Oct 2026"),
    thorin: deck("HD -Thorin", "Thorin, King of Durin's Folk", "Boros", ["r", "w"], 2, "3 Oct 2026"),
    wizards: deck("HD - Wizards", "Inalla, Archmage Ritualist", "Grixis", ["u", "b", "r"], 5, "30 Sep 2026"),
  });
  Object.assign(bSum, {
    counter: sum("A Jeskai artifact deck that stacks counters with ", ["Inspirit, Flagship Vessel"], " and proliferates them with ", ["Kilo, Apogee Mind"], ". Rocks come down early, payoffs like ", ["Steel Overseer"], " and ", ["Kappa Cannoneer"], " grow off every artifact, and charge-counter engines such as ", ["Darksteel Reactor"], " give it a way to end the game without attacking."),
    scrappy: sum("A Naya enchantment-creature deck led by ", ["Dogmeat, Ever Loyal"], ", which brings back auras and equipment from the graveyard. Auras and enchantment creatures pile onto a few bodies, and the deck wins by attacking with them."),
    thorin: sum("A Boros dwarf deck where ", ["Thorin, King of Durin's Folk"], " makes Treasure each time a dwarf enters and turns the pile into power. Dwarves come down cheap, Treasure pays for more, and ", ["Revel in Riches"], " is a second way out."),
    wizards: sum("A Grixis wizard deck built on counterspells and card draw. ", ["Inalla, Archmage Ritualist"], " copies every wizard that enters, ", ["Rhystic Study"], " and ", ["Mystic Remora"], " keep the hand full, and the deck holds up a counter on almost every turn."),
  });
  const Z = () => [F("mld", "Mass land denial", 0), F("et", "Extra turns", 0)];
  Object.assign(bFind, {
    counter: [F("gc", "Game changers", 1, "Urza, Lord High Artificer", "Urza, Lord High Artificer"), ...Z(), F("combo", "Two-card infinites", 0, "", "", { combo: true }), F("tutor", "Tutors", 0, "", "", { noLimit: true })],
    scrappy: [F("gc", "Game changers", 0), ...Z(), F("combo", "Two-card infinites", 0, "", "", { combo: true }), F("tutor", "Tutors", 0, "", "", { noLimit: true })],
    thorin: [F("gc", "Game changers", 1, "Jeska's Will", "Jeska's Will"), ...Z(), F("combo", "Two-card infinites", 0, "", "", { combo: true }), F("tutor", "Tutors", 1, "Enlightened Tutor", "Enlightened Tutor", { noLimit: true })],
    wizards: [F("gc", "Game changers", 4, "Rhystic Study · Mystic Remora · +2", "Rhystic Study · Mystic Remora · Cyclonic Rift · +1"), ...Z(), F("combo", "Two-card infinites", 0, "", "", { combo: true }), F("tutor", "Tutors", 1, "Mystical Tutor", "Mystical Tutor", { noLimit: true })],
  });
  Object.assign(bClimb, {
    counter: [rung("below", 2, { pre: "Cut ", strong: "Urza, Lord High Artificer", post: ": Core allows none.", path: true }), rung("yours", 3, { figures: [{ id: "gc", name: "Game changers", have: 1, allow: "3 allowed" }] }), rung("above", 4, { pre: aboveAllowed })],
    scrappy: bClimb.sultai,
    thorin: [rung("below", 2, { pre: "Cut ", strong: "Jeska's Will", post: ": Core allows none.", path: true }), rung("yours", 3, { figures: [{ id: "gc", name: "Game changers", have: 1, allow: "3 allowed" }] }), rung("above", 4, { pre: aboveAllowed })],
    wizards: [rung("below", 3, { pre: "Cut ", strong: "one game changer", post: ", only three allowed at Upgraded.", path: true }), rung("yours", 4, { figures: [{ id: "gc", name: "Game changers", have: 4, allow: "no cap" }] }), rung("above", 5, { pre: aboveAllowed })],
  });
  Object.assign(bMix, {
    counter: [cell("Ramp", 12, 11), cell("Card draw", 11, 10), cell("Removal", 9, 8), cell("Board wipes", 3, 2), cell("Lands", 38, 37)],
    scrappy: [cell("Ramp", 9, 10), cell("Card draw", 12, 10), cell("Removal", 5, 8), cell("Board wipes", 1, 2), cell("Lands", 35, 36)],
    thorin: [cell("Ramp", 13, 11), cell("Card draw", 9, 10), cell("Removal", 11, 9), cell("Board wipes", 2, 2), cell("Lands", 35, 36)],
    wizards: [cell("Ramp", 9, 10), cell("Card draw", 19, 12), cell("Removal", 23, 10), cell("Board wipes", 2, 3), cell("Lands", 35, 35)],
  });
  S.bCounter = bRead("counter", 3, "One game changer, and Core allows none at all. Nothing else in the 99 reaches further.", "analyzed with version 2 \u00b7 1 Oct", "EDHREC has no declared brackets for Inspirit.");
  S.bScrappy = bRead("scrappy", 2, "No game changers, mass land denial, extra turns or two-card infinites. Nothing in the 99 reaches past Core.", "analyzed with version 1 \u00b7 5 Oct", "EDHREC has no declared brackets for Dogmeat.");
  S.bThorin = bRead("thorin", 3, "One game changer, and Core allows none at all. Nothing else in the 99 reaches further.", "analyzed with version 2 \u00b7 3 Oct", "EDHREC has no declared brackets for Thorin.");
  S.bWizards = bRead("wizards", 4, "Four game changers, and Upgraded allows three. Nothing else in the 99 reaches further.", "analyzed with version 5 \u00b7 30 Sept", "EDHREC has no declared brackets for Inalla.");
  S.bEmpty = { ...S.idle };

  const v = S[state] || S.idle;
  return {
    ...v, notReady: !v.ready, hasBody2: !!v.emptyBody2, notFetching: !v.fetching,
    hasEmptyNote: !!v.emptyNote, hasBannerNote: !!v.bannerNote, hasOverviewNote: !!v.overviewNote,
    writeDisabled: v.writeEnabled === false,
    hasHeldCaption: !!v.heldCaption, bannerIdle: !v.bannerBusy,
    methodNotice: !!v.methodNotice, hasBench: !!v.benchDeck, benchDeck: v.benchDeck || "", benchStale: !!v.benchStale, mHasCta: !!v.mCta, mRole: v.mRole || "status", mIcon: v.mIcon || "i",
  };
}
