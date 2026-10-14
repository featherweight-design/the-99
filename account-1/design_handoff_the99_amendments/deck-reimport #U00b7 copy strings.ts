// src/lib/copy/deck-import.ts — amendment 2, update a deck by re-import.
//
// Added as a `deckImportCopy.update` block beside the shipped `entry`,
// `parsing`, `failures`, `commander`, `unresolved` and `arrival` blocks.
// Shape follows the shipped file: flat const object, functions for
// interpolated strings, no JSX, no number formatting (callers pass
// pre-formatted strings; the locale is pinned at the call site, as
// arrival-strip.tsx already does).
//
// Voice: Kitchen Table. Two rules specific to this flow:
//   1. Nothing in here apologises and nothing warns twice. The screen is about
//      a decision, not a hazard.
//   2. Every sentence about deletion says what the player can do about it in
//      the same breath.
//
// Existing strings this block does NOT touch:
//   deckImportCopy.entry.*        the mode chips, the textarea, the dropzone —
//                                 reused verbatim by the update entry
//   deckImportCopy.parsing.*      the in-flight block
//   deckImportCopy.failures.*     all seven banners, reused verbatim
//   deckImportCopy.unresolved.*   the row treatment and the deck-card badge
//   deckImportCopy.arrival.clean / cleanMobile / dismiss
//                                 the FIRST-import strip. The update strip is
//                                 a sibling, not an edit — a first import and
//                                 an update state different facts.
//   deckImportCopy.commander.*    the picker; the update flow never shows it
//
// ONE shipped thing is edited, and it is a comment rather than a string:
//   REPLACES  import-actions.ts's importDeck doc comment, the paragraph
//             beginning 'There is deliberately no dedupe'. It now points at
//             updateDeckFromList and keeps saying that importDeck itself never
//             dedupes. It is load-bearing documentation and it is now wrong.

export const updateCopy = {
  // ── Entry ─────────────────────────────────────────────────────────────
  // One string, both entry points. 'from a list' rather than 'from a
  // decklist': the surface it opens accepts a paste or a file, and the deck
  // card's menu has no room to say so.
  entryLabel: "Update from a list",
  entryAria: (deckName: string) => `Update ${deckName} from a list`,

  // ── Step 2 · the list ─────────────────────────────────────────────────
  list: {
    heading: (deckName: string) => `Update ${deckName}`,
    sub: "Paste the list as it stands now. We will show you what changes before anything is saved.",
    subMobile: "Paste it. We show you what changes first.",
    // Promises a comparison, not a creation. The shipped 'Create deck' label
    // would be a lie about the button's destination, which is the same mistake
    // amendment 4 is fixing on the commander page.
    submit: "Compare with this deck",
    // Said beside the submit at both widths, and again under it on the phone —
    // where the full-width primary looks final.
    reassure: "Nothing is saved yet.",
    reassureMobile: "Nothing is saved until you say so on the next screen.",
    // The two desktop footnotes, in the shipped slots and the shipped type.
    aboutHeading: "What we do with it",
    about:
      "The list becomes the deck. Cards in it that you do not have here get added; cards here that it does not name get removed — and you can keep any of those on the next screen.",
    aboutKeepsHeading: "What stays put",
    aboutKeeps:
      "The deck's name and its commander. A list naming a different commander is a different deck, and we will say so rather than swap it.",
  },

  // ── Step 3 · the diff ─────────────────────────────────────────────────
  diff: {
    heading: "What this list changes",
    // Provenance. 'lines' not 'cards' — one line can carry many copies, which
    // is the distinction the shipped arrival strip is also careful about.
    provenance: (lines: string, deckName: string, built: string) =>
      `${lines} lines read from your paste, matched against the ${built} cards in ${deckName}. Nothing is saved until you apply it.`,
    provenanceMobile: (lines: string, built: string) =>
      `${lines} lines · matched against ${built} cards`,

    // The count chips. Labels are lowercase because they are units under a
    // figure, the same treatment the facet strip gives its counts.
    chipOut: "out",
    chipIn: "in",
    chipUnnamed: "we cannot name",
    chipUnnamedMobile: "unnamed",
    chipUnchanged: "unchanged",
    chipUnchangedMobile: "same",
    // The one place the whole screen is one number.
    landing: (from: string, to: string) => `${from} → ${to} / 99`,

    // ── Coming out — the group with the decision in it ────────────────
    outHeading: (n: string) => `Coming out · ${n}`,
    // One sentence at both widths: the fact, and the per-row `Keep` beside it is
    // what to do about it. R1 of amendment 6 removed the hand-added variants —
    // see the deletion note at the foot of this file.
    outBody: "Your list does not name these.",
    // Same words as recommendationsCopy.auto.keepAll, and a different subject:
    // there it accepts the fill's picks, here it rescues removals. Two keys.
    keepAll: (n: string) => `Keep all ${n}`,

    // ── Going in — a list, not a decision ─────────────────────────────
    inHeading: (n: string) => `Going in · ${n}`,
    // The shipped ownership vocabulary, verbatim from deck-card.tsx:162 and
    // builder-spine.tsx:202 — nineteen new cards can cost money and this is
    // how the app already says so.
    inMeta: (owned: string, toBuy: string) => `${owned} owned · ${toBuy} to buy`,

    // ── We cannot name these ──────────────────────────────────────────
    unnamedHeading: (n: string) => `We cannot name these · ${n}`,
    // Says the replacement out loud, because it is the one write in this flow
    // a player could not have predicted from the group headings.
    unnamedBody: (existing: string) =>
      existing === "0"
        ? "They come across as lines you can resolve on the deck, exactly as an import's do."
        : existing === "1"
          ? "They come across as lines you can resolve on the deck, exactly as an import's do — and they replace the 1 unresolved line this deck is carrying now."
          : `They come across as lines you can resolve on the deck, exactly as an import's do — and they replace the ${existing} unresolved lines this deck is carrying now.`,

    // ── Unchanged ─────────────────────────────────────────────────────
    unchangedDisclosure: (n: string) => `Show the ${n} that do not change`,
    // Every group's overflow disclosure. 'the other N' rather than 'N more':
    // the group header already printed the total, so this names the remainder.
    showMore: (n: string) => `Show the other ${n}`,
    showFewer: "Show fewer",

    // ── The row ───────────────────────────────────────────────────────
    keep: "Keep",
    kept: "Kept ✓",
    keptMobile: "✓",
    keepAria: (name: string) => `Keep ${name} in the deck`,
    // The row's accessible name carries its marker when it has one. The optional
    // argument stays after the hand-added deletion: `auto` is still a visual pill
    // beside a name, and it is now the only one.
    rowAria: (name: string, marker: string) => (marker ? `${name}. ${marker}.` : name),
    ariaAuto: "Added automatically",
    sourceLine: (n: string) => `line ${n}`,

    // ── Apply ─────────────────────────────────────────────────────────
    // States what it will do, recomputed on every Keep. Never 'Apply' and
    // never 'Confirm': it is the last thing read before the only irreversible
    // click in the flow.
    apply: (inN: string, outN: string) => `Update the deck — ${inN} in, ${outN} out`,
    applyMobile: (inN: string, outN: string) => `Update — ${inN} in, ${outN} out`,
    applyAria: (inN: string, outN: string, deckName: string) =>
      `Update ${deckName}: add ${inN} cards, remove ${outN}`,
    cancel: "Cancel",
    summary: (kept: string, to: string) =>
      kept === "0"
        ? `lands at ${to} / 99`
        : kept === "1"
          ? `1 kept · lands at ${to} / 99`
          : `${kept} kept · lands at ${to} / 99`,
    // Live region. One message per settle, debounced — six fast toggles is one
    // announcement, the same contract the synergy selection uses.
    liveKept: (kept: string, inN: string, outN: string) =>
      `${kept} kept. This update will add ${inN} and remove ${outN}.`,

    // ── Everything out — one line and one extra exit past 75% ─────────
    wholesaleNote: (inN: string, outN: string) =>
      `This replaces the whole deck. ${inN} cards in, ${outN} out. If that is not what you meant, the list you pasted is probably a different deck — import it as its own instead.`,
    importAsNew: "Import as new instead",
  },

  // ── Step 3 · nothing changed ──────────────────────────────────────────
  // Not an error and not a success: a null result with two ways out. Fires
  // also when every difference is an unresolved line the deck already carries.
  noChange: {
    heading: "This list is the deck you already have",
    body: (built: string) =>
      `All ${built} cards match, nothing to add, nothing to take out. We have changed nothing.`,
    back: "Back to the deck",
    retry: "Try a different list",
  },

  // ── Step 3 · a different commander ────────────────────────────────────
  // The shipped failure-banner shape. Never --danger: the player pasted the
  // wrong list, which is not a fault.
  conflict: {
    heading: (listCommander: string) => `That list is a ${listCommander} deck`,
    body: (deckCommander: string) =>
      `This deck is built around ${deckCommander}. Changing the commander re-decides the colours and the legality of all ninety-nine, so we will not swap it out from under you.`,
    // The primary way out is the flow that already works, carrying the text
    // the player already pasted.
    primary: "Import it as a new deck",
    cancel: "Cancel",
  },

  // ── Step 4 · applying, and a refusal ──────────────────────────────────
  applying: {
    heading: "Updating the deck…",
    // The transaction is the promise this sentence is making.
    body: "One transaction. The whole update lands or none of it does.",
    live: "Updating the deck.",
  },
  refused: {
    heading: "That did not go through",
    body: "Your deck is exactly as it was. Your list is still here — try again.",
    action: "Try again",
  },

  // ── Step 5 · arrival ──────────────────────────────────────────────────
  // A SIBLING of arrival.clean, not an edit of it. A first import's only fact
  // is how much arrived; an update's only interesting fact is what moved.
  arrival: {
    updated: (inN: string, outN: string) =>
      `Updated from your list — ${inN} in, ${outN} out.`,
    updatedWithKept: (inN: string, outN: string, kept: string) =>
      kept === "1"
        ? `Updated from your list — ${inN} in, ${outN} out, 1 you kept.`
        : `Updated from your list — ${inN} in, ${outN} out, ${kept} you kept.`,
    updatedMobile: (inN: string, outN: string) => `Updated — ${inN} in, ${outN} out`,
    // The ?updated=N-N param is parsed strictly (/^\d+-\d+$/), the same
    // strictness arrivedFromImport applies to its own value. Anything else
    // falls back here rather than printing NaN.
    updatedNoCounts: "Updated from your list.",
    // Reuses arrival.dismiss — one dismissal word for one strip shape.
  },
} as const;

// ── NOT ADDED, deliberately ────────────────────────────────────────────
//
//   No undo string. There is no undo of an applied update (README gap 1) and a
//   string is not the fix.
//
//   No merge-mode label. 'Add these and keep everything' is the quick-add bar,
//   one card at a time, and it exists.
//
//   No 'same source as last time' string. Nothing records where a deck's list
//   came from; provenance is a fact about one navigation, per arrival.ts.
//
//   No confirm dialog copy. The diff IS the confirmation.
//
//   No celebration copy. The 99/99 reveal is suppressed for an update on the
//   same rule that suppresses it for a first import and for a fill.

// ── DELETED at amendment 6 R1 — the hand-added marker ──────────────────────
//
//   handAdded / ariaHandAdded / outBodyHandAdded / outBodyMobileHandAdded are
//   removed, reaffirming the ruling this file's own comment already conceded:
//   the only signal available is `auto = false`, which is equally true of a
//   previous import's rows, and no column records who placed a card. The marker
//   therefore claimed a fact the data cannot support, on the one screen where a
//   wrong claim costs the player a card.
//
//   What replaces it: nothing. `outBody` states the removal in one sentence at
//   both widths, the per-row `Keep` and the header's `Keep all {n}` are the
//   answer, and the group is still first on the screen for the same reason —
//   it is the only group with a decision in it. README §2 gap 3, which existed
//   to excuse the proxy, is closed by deletion rather than by wording.
