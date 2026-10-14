// deck-folders · copy strings
//
// Per `design/design_handoff_the99_deck_folders/`. Shape follows
// `src/lib/copy/refresh.ts`: flat const object, functions for interpolated
// strings, no JSX, callers pass pre-formatted figures.
//
// VOICE, inherited from `refresh.ts` verbatim: labels and figures; no
// reassurance, no jokes, no second-person encouragement; never explain that a
// state is fine; never narrate an affordance. Two consequences specific to this
// round:
//   • S3 (nothing unfiled) has NO body copy. Nothing is wrong there, and a
//     sentence saying so would be the banned one. A count is the honest form.
//   • The delete confirmation's second sentence is a FACT the foreign key
//     keeps, not a reassurance about a risk.
//
// REUSE, not restatement. These already exist and are referenced rather than
// copied:
//   • `refreshCopy.decks.menu.*` — the three shipped deck-menu rows. `move`
//     below is inserted between `rename` and `delete` and is the only addition.
//   • `refreshCopy.filters.clear`, `.emptyHeading`, `.emptyAction` — the
//     FILTERED empty, which folders do not touch.
//   • `refreshCopy.zero.*` — `DecksZero`, unchanged.
//   • `chassisCopy.chips.*` and `deckChassisCopy.result` — the chassis. Note
//     `result` is UNCHANGED and takes a different `total`: the selected shelf's
//     deck count. That is the round's one chassis amendment and it needs no
//     string.
//
// COUNTS carry their denominator in the same string wherever there is one, per
// `refresh.ts`. The shelf segments are the exception and deliberately so: a
// segment's figure is the whole of that shelf, so there is nothing to divide by
// — the division happens one line down, in the result line, against this same
// figure.

export const folderCopy = {
  // ── The level ─────────────────────────────────────────────────────────
  shelves: {
    /**
     * The unscoped shelf. Named "All decks" rather than "Decks" because the
     * page is already called Decks and a segment repeating the h1 reads as the
     * title rather than as a choice.
     */
    all: 'All decks',
    /**
     * ONE string for all three places it appears — segment, sheet row, move
     * destination — and in all three it means `folder_id IS NULL`. It is a
     * label, not a folder: it has no id, no rename and no delete.
     */
    unfiled: 'Unfiled',
    /** Sheet title at the compact form. Plural: it lists them. */
    sheetTitle: 'Folders',
    /** Dismiss only. Selection already applied. */
    sheetDismiss: 'Done',
    closeLabel: 'Close folders',
    /** Segment and row accessible name — the count is in words, never implied. */
    aria: (name: string, decks: number) =>
      `${name}, ${decks === 1 ? '1 deck' : `${decks} decks`}`,
    /** The trigger at the compact form. The name leads; the count trails. */
    triggerAria: (name: string, decks: number) =>
      `Folder: ${name}, ${decks === 1 ? '1 deck' : `${decks} decks`}. Change folder.`,
    /** The selected shelf's own actions. Never on Unfiled, never unselected. */
    menuTrigger: (name: string) => `Actions for ${name}`,
  },

  // ── Create ────────────────────────────────────────────────────────────
  create: {
    /** Line's trailing control, and the sheet's last row. */
    action: 'New folder',
    /** Inside the move panel, where it is a destination you are about to make. */
    actionFromMove: 'New folder…',
    heading: 'New folder',
    placeholder: 'Folder name',
    fieldAria: 'Folder name',
    submit: 'Create',
    cancel: 'Cancel',
    /**
     * ENGINEERING ADDITION, 2026-09-13. The round originally answered "was it
     * made?" by walking the reader to the new shelf (STATES CR4). Hugh overruled
     * that — the shelf is empty, so there is nothing to go and see — which
     * leaves the confirmation to say it instead (errata E20).
     */
    created: (name: string) => `Folder “${name}” created.`,
    /**
     * The one refusal that must be stated. It is the unique index's answer, and
     * the name is quoted because the reader may have typed a near-miss.
     */
    duplicate: (name: string) => `A folder named “${name}” already exists.`,
    /**
     * ENGINEERING ADDITION, for a state the handoff rules to be unreachable. Decision
     * 22 names two reachable refusals and the field enforces both, so this is
     * what a caller that is not the field gets — a rejected write with no other
     * sentence to show. Without it the dialog either lies (a duplicate message
     * for a name that is not one) or fails silently.
     */
    refused: 'That name won’t work.',
    /**
     * A write that threw rather than refused — a timeout, an outage. It is a
     * different sentence because it asks for a different thing: the name was
     * fine, and trying again is the answer.
     */
     failed: 'We couldn’t confirm that saved. Reload to see your folders.',
  },

  // ── Rename (query to be added: `renameFolder`) ────────────────────────
  rename: {
    /** Reuses the deck menu's word deliberately — same act, same label. */
    action: 'Rename',
    heading: 'Rename folder',
    fieldAria: 'Folder name',
    submit: 'Save',
    cancel: 'Cancel',
    /** Same sentence as create. One refusal, one wording. */
    duplicate: (name: string) => `A folder named “${name}” already exists.`,
  },

  // ── Delete ────────────────────────────────────────────────────────────
  del: {
    action: 'Delete',
    /** The folder is named, because the reader may have several. */
    heading: (name: string) => `Delete “${name}”?`,
    /**
     * THE SENTENCE. The foreign key is `on delete set null`, so this is a
     * promise the database keeps however the folder is deleted — not a
     * reassurance about a risk. It states what happens and then what does not,
     * in that order, because the second half is what a reader fears.
     */
    body: (decks: number) =>
      `${decks === 1 ? 'Its 1 deck returns' : `Its ${decks} decks return`} to Unfiled. No deck is deleted.`,
    /** Nothing to return, so the sentence has nothing to promise about. */
    bodyEmpty: 'Nothing is filed here.',
    confirm: 'Delete folder',
    /**
     * A delete that THREW rather than answering. `false` means already gone and
     * is treated as done; this is an outage, and the sentence has to name the
     * act that did not happen rather than borrow create's.
     */
    failed: 'We couldn’t confirm that folder was deleted. Reload to see your folders.',
    /** The shared delete pane's KEEP, the same label the deck's and the game's panes carry (2026-09-27). */
    cancel: 'Keep it',
  },

  // ── Move — on the deck, in the menu it already has ────────────────────
  move: {
    /**
     * The deck menu's new row. It NAMES THE CURRENT SHELF, which is how §3.6
     * is answered without putting the folder on the tile: the fact lives where
     * it is changeable. Truncates visibly; the accessible name never does.
     */
    row: (shelf: string) => `Move · ${shelf}`,
    rowAria: (deckName: string, shelf: string) =>
      `Move ${deckName}. Currently filed under ${shelf}.`,
    /** Panel eyebrow in move mode. */
    heading: 'Move to',
    /** Per-destination accessible name. `current` is the state, not the name. */
    optionAria: (shelf: string, current: boolean) =>
      current ? `${shelf}, current` : shelf,
    /**
     * Announced through the deck menu's own region. Two forms, because
     * "Unfiled under Unfiled" is not a sentence.
     */
    announceFiled: (shelf: string) => `Filed under ${shelf}.`,
    announceUnfiled: 'Unfiled.',
    /**
     * A write that THREW rather than refused. `false` is a conflict the reader
     * cannot act on — the deck or the folder is gone — and this is a failure
     * they can: the move did not happen and trying again is the answer.
     */
    failed: 'We couldn’t confirm that move. Reload to see where the deck is.',
    /**
     * A move the server REFUSED, said after the deck has already taken its new
     * shelf on the press (H24): the deck goes back, and a screen reader that
     * heard "Filed under X" has to hear that it did not happen. A refusal means
     * the deck or the folder is gone, so there is nothing to try again.
     */
    refused: 'We couldn’t move that. The deck or the folder is gone.',
  },

  // ── Empty states — S2 and S3 only ─────────────────────────────────────
  // N1 is `refreshCopy.zero` and N4 is `refreshCopy.filters.empty*`, both
  // unchanged. Neither of these two offers `Clear filters`: no filter caused
  // them, and offering the wrong exit is what makes an empty grid read as a
  // broken app.
  empty: {
    /** S2 — a named shelf holding nothing. */
    shelfHeading: 'Nothing filed here',
    /** The shelf and its zero, as a figure. Never "0 decks" alone. */
    shelfFigure: (name: string) => `${name} · 0 decks`,
    /**
     * Names where the act is, which is not the same as narrating a control the
     * reader is looking at — the affordance is on a tile, on another shelf.
     */
    shelfBody: 'A deck is filed from its own … menu.',
    /** The route out: where the decks are. */
    shelfAction: 'All decks',

    /**
     * S3 — Unfiled, with everything filed. NO BODY COPY. The figure is the
     * whole state: both denominators the app counts in, and nothing to fix.
     */
    unfiledHeading: 'Nothing unfiled',
    unfiledFigure: (decks: number, folders: number) =>
      `${decks === 1 ? '1 deck' : `${decks} decks`} across ${folders === 1 ? '1 folder' : `${folders} folders`}`,
    unfiledAction: 'All decks',
  },
} as const;
