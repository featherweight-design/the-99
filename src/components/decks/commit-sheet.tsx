"use client";

// §Surfaces 3 — the commit sheet, at the foot of the review page rather than over
// it. A modal would cover the list the reader is being asked to confirm, and the
// one thing this sheet is for is the breath before an irreversible click.
//
// It carries TOTALS and never rows. The review page is directly above it and
// already lists every card; a confirmation that re-lists what you have just read
// is a second copy of the page, not a confirmation.
//
// Two figures on it come from outside this component on purpose. `cardCount` is
// the server's count of the list being frozen — nothing in `DraftState` holds
// one, and a tally of the drawn rows would be a different number from the one the
// snapshot writes. And the size announced afterwards is the `cardCount` the write
// itself returns, not this prop: between the page's read and the click, the deck
// can have moved.

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { commitDeckVersion, type CommitResult } from "../../app/decks/actions";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DraftState } from "../../lib/decks/draft-shape";
// Types only: `draft-state.ts` reaches `src/db`, which throws at module init in
// a browser. See `src/lib/client-bundle-safety.test.ts`.
import type { DraftRows } from "../../lib/decks/draft-state";
import { manapoolAddDeckUrl } from "../../lib/manapool/links";
import { GhostButton, PrimaryButton } from "../ui/button";
import { draftAnnouncer } from "./draft-announcer";
import { MutationError } from "./mutation-error";

const copy = deckVersioningCopy.commit;

/** The two blocks' shared geometry. They sit side by side above `md` and have to
 *  be the same height, which is what `items-stretch` on the row and one padding
 *  here buy. Phone gives each its own plate because there is no sheet container
 *  at that width — the blocks stand on the screen itself. */
const BLOCK =
  "flex-1 rounded-[10px] p-[13px_14px] md:p-[14px_16px] " +
  "bg-[color:var(--surface)] md:bg-[color:var(--base)]";

/** Mono, tight-tracked, uppercase — the label every figure in this feature wears. */
const BLOCK_LABEL =
  "font-mono text-[9.5px] md:text-[10px] uppercase tracking-[0.14em] mb-[7px] md:mb-[8px]";

/** Both buttons: full-width and thumb-high on the phone, inline above it. The
 *  fill, the ink and the hover are the shared primitive's — see `ui/button.tsx`
 *  — and this is only the geometry it deliberately leaves to its caller. */
const BAR_BUTTON = "inline-flex items-center justify-center w-full md:w-auto";

/** The sentence's opening clause, which the design sets in the reading ink while
 *  the rest stays faint. Split on its own punctuation rather than authored twice:
 *  `pullNote` is one sentence in the copy module, and the emphasis is a drawing
 *  decision about part of it. */
const [PULL_NOTE_LEAD, ...PULL_NOTE_REST] = copy.pullNote.split(" — ");

export type CommitSheetProps = {
  /** The deck being frozen. Also where a successful commit returns to. */
  deckId: string;
  state: DraftState;
  /** The changed cards, for their NAMES alone: the Mana Pool list needs the name
   *  beside each shortfall, and `DraftState` carries oracle ids. No row is drawn. */
  rows: DraftRows["rows"];
  /** The server's count of the cards in the list being frozen. Never recounted
   *  here — see the header. */
  cardCount: number;
  /** Folds the sheet away. The sheet is unmounted rather than hidden, which is
   *  what leaves the note empty when it is opened again. */
  onCancel: () => void;
};

export function CommitSheet({ deckId, state, rows, cardCount, onCancel }: CommitSheetProps) {
  const router = useRouter();
  const noteId = useId();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // The region has to be in the document before any text reaches it, and this
  // sheet cannot rely on a row having put it there: a first commit, a draft that
  // only cuts, and any page whose adds are all free draw no pull control at all.
  useEffect(() => {
    draftAnnouncer();
  }, []);

  const version = (state.version?.number ?? 0) + 1;
  const released = state.removes.length;

  // Copies, not rows: the two terms have to add up to the figure drawn above
  // them, and that figure is `buyCount`. `shortfall` rather than `needed` is the
  // same distinction the shopping list makes — a player holding one copy of a
  // card they want three of buys two.
  const shortfallIn = (bucket: string) =>
    state.adds
      .filter((a) => a.bucket === bucket)
      .reduce((sum, a) => sum + a.shortfall, 0);

  const names = new Map(rows.in.map((r) => [r.oracleId, r.name]));
  const buyList = state.adds.flatMap((a) => {
    const name = names.get(a.oracleId);
    return a.shortfall > 0 && name ? [{ name, quantity: a.shortfall }] : [];
  });
  const shopHref = manapoolAddDeckUrl(buyList);

  const footer = (
    <span className="font-mono text-[10px] md:text-[11px] text-[color:var(--fg-faint)]">
      {copy.footer(cardCount, state.buyCount, released)}
    </span>
  );

  return (
    // No plate on the phone: at 390px a bordered card inside the page's own
    // padding leaves the blocks in a third inset, so the sheet is the screen and
    // its blocks carry the only borders.
    <section className="md:mt-[26px] md:rounded-[12px] md:p-[20px] md:bg-[color:var(--surface)] md:[border:1px_solid_var(--border-strong)]">
      <div className="px-[14px] pt-[38px] pb-[12px] [border-bottom:1px_solid_var(--border)] md:p-0 md:border-b-0">
        <h3 className="font-display font-bold text-[19px] md:text-[21px] m-0 md:mb-[8px] text-[color:var(--fg)]">
          {copy.heading(version)}
        </h3>
        <p className="mt-[8px] mb-0 text-[12.5px] leading-[1.55] md:mt-0 md:mb-[18px] md:max-w-[600px] md:text-[13.5px] md:leading-[1.6] text-[color:var(--fg-body)]">
          {copy.lede(version, state.unfreeCount, released)}
        </p>
      </div>

      <div className="px-[14px] py-[14px] md:p-0">
        {/* Above the figures, at both widths: the canvas draws the note directly
            under the lede on the phone and on the desktop sheet alike. */}
        <div className="md:mb-[18px]">
          <label
            htmlFor={noteId}
            className="block font-mono text-[9.5px] md:text-[10px] uppercase tracking-[0.14em] mb-[7px] text-[color:var(--fg-faint)]"
          >
            {copy.noteLabel}
          </label>
          {/* No placeholder, never counted and never required: an optional field
              that validates is not optional. The write trims it and stores null
              for an empty one, so nothing is checked here. */}
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="block w-full rounded-[8px] p-[11px_12px] md:p-[11px_13px] min-h-[76px] md:min-h-[70px] mb-[14px] md:mb-0 text-[13.5px] leading-[1.55] bg-[color:var(--surface)] md:bg-[color:var(--base)] text-[color:var(--fg)] [border:1px_solid_var(--border-strong)]"
          />
          {/* Desktop only — at 390px the apply bar is the next thing under the
              field and a second sentence there pushes the commit off screen.
              Drawn whether or not the field has been typed into: a warning that
              vanished on the first keystroke would make a typed note and an empty
              one two different sheets, and the sentence is a fact about the
              version rather than a prompt to write something. */}
          <p className="hidden md:block font-mono text-[10px] m-0 mt-[7px] text-[color:var(--fg-locked)]">
            {copy.noteWarning}
          </p>
        </div>

        {/* Stacked on the phone; two equal blocks side by side above it. Either
            can be absent whole — a draft with nothing to buy is not a draft with
            an empty money block, and a draft that cuts nothing releases nothing. */}
        {(state.buyCount > 0 || released > 0) && (
          <div className="flex flex-col md:flex-row md:items-stretch gap-0 md:gap-[12px] mb-[18px]">
            {state.buyCount > 0 && (
              <div
                className={`${BLOCK} mb-[10px] md:mb-0 [border:1px_solid_var(--accent-shadow)]`}
              >
                <div className={BLOCK_LABEL} style={{ color: "var(--warning)" }}>
                  {copy.buyHeading}
                </div>
                {/* The count and the purchase on one baseline: how many copies,
                    and what those copies cost, is one fact. */}
                <div className="flex items-baseline gap-[8px] md:gap-[9px] mb-[5px]">
                  <span
                    className="font-mono text-[22px] md:text-[24px]"
                    style={{ color: "var(--warning)" }}
                  >
                    {state.buyCount}
                  </span>
                  {state.total !== null && (
                    <span
                      className="font-mono text-[16px] md:text-[17px]"
                      style={{ color: "var(--warning)" }}
                    >
                      {state.total}
                    </span>
                  )}
                </div>
                {/* The breakdown is drawn at both widths; the link under it is
                    not. At 390px the rows it points at are a scroll away rather
                    than a glance, while the two terms are the figure above them
                    explained and belong beside it. */}
                <div className="font-mono text-[10px] md:text-[10.5px] md:leading-[1.55] mb-[11px] md:mb-0 text-[color:var(--fg-faint)]">
                  {copy.buyBreakdown(shortfallIn("unowned"), shortfallIn("claimed"))}
                </div>
                <a
                  href="#review"
                  className="hidden md:block font-mono text-[10.5px] mb-[13px] text-[color:var(--accent)]"
                >
                  {copy.buyBackLink(state.unfreeCount)}
                </a>
                {/* Never a glyph and never a new-tab suffix: the accessible name
                    is the four words the design draws, and this feature's one
                    link-out is deliberately plainer than the app's decorated
                    `ExternalLink`. Absent rather than disabled when there is
                    nothing priced to shop for. */}
                {shopHref && (
                  <a
                    href={shopHref}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center justify-center w-full md:w-auto min-h-[44px] md:min-h-0 md:py-[9px] md:px-[14px] rounded-[8px] md:rounded-[7px] font-sans font-semibold text-[13px] md:text-[12.5px] no-underline text-[color:var(--accent)] [border:1px_solid_var(--border-strong)]"
                  >
                    {copy.linkOut}
                  </a>
                )}
              </div>
            )}

            {released > 0 && (
              <div className={`${BLOCK} [border:1px_solid_var(--border)]`}>
                <div className={BLOCK_LABEL} style={{ color: "var(--success)" }}>
                  {/* The count rides in the label at 390px, where there is no room
                      for a 24px figure beside the money block's, and stands under
                      it above that width. */}
                  <span className="md:hidden">{copy.pullHeading(released)}</span>
                  <span className="hidden md:inline">{copy.pullHeadingPlain}</span>
                </div>
                <div
                  className="hidden md:block font-mono text-[24px] mb-[5px]"
                  style={{ color: "var(--success)" }}
                >
                  {released}
                </div>
                <p className="font-mono text-[10.5px] leading-[1.55] m-0 text-[color:var(--fg-faint)]">
                  <b className="font-normal text-[color:var(--fg-body)]">{PULL_NOTE_LEAD}</b>
                  {PULL_NOTE_REST.length > 0 && ` — ${PULL_NOTE_REST.join(" — ")}`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* The bar. Phone reads the footer figures, then commits, then cancels;
          desktop puts the two controls first and the figures after them, which is
          the only difference between the two — one element, ordered twice. */}
      <div className="flex flex-col md:flex-row md:items-center md:flex-wrap gap-[8px] md:gap-[12px] px-[14px] pt-[11px] pb-[16px] md:p-0 md:pt-[16px] [border-top:1px_solid_var(--border-strong)]">
        <span className="order-first md:order-last">{footer}</span>
        {/* A column holding the CTA and the refusal it belongs to, because the
            design writes the message directly under the button at both widths —
            a `w-full` message inside the bar itself landed after `Cancel` on the
            desktop row, beside the figures. */}
        <div className="flex flex-col gap-[8px]">
          {/* The app's bone CTA, which is the cream-on-ink fill the design draws:
              `--fg` on `--bg` are those two colours. Its hover and its disabled
              appearance come with it rather than being restated here. */}
          <PrimaryButton
            disabled={pending}
            className={`${BAR_BUTTON} min-h-[48px] md:min-h-0 md:py-[11px] md:px-[20px] text-[14px]`}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                let result: CommitResult;
                try {
                  result = await commitDeckVersion(deckId, note);
                } catch {
                  // A refusal and a throw read the same to the player, and both
                  // leave the draft where it was: one sentence covers them.
                  setError(copy.refused);
                  return;
                }
                if (!result.ok) {
                  // The server's own message is dropped on purpose. Every way this
                  // write can fail leaves the changes intact, and that — not which
                  // race lost — is the thing the player needs told.
                  setError(copy.refused);
                  return;
                }
                // The version's real size, read by the write after it wrote, and
                // the purchase it decided under the deck's own row lock rather
                // than the one this page was rendered with — an availability
                // change between the two would have the receipt quote a figure
                // for a version nobody wrote. Copies and not rows, matching
                // `buyCount`: a card wanted three times and held once is two.
                // Spoken into the region that outlives this component, because the
                // next thing that happens is leaving the page it is on.
                draftAnnouncer().textContent = copy.announced(
                  result.number,
                  result.cardCount,
                  result.buy.reduce((n, a) => n + a.shortfall, 0),
                );
                router.push(`/decks/${deckId}`);
              });
            }}
          >
            {pending ? copy.ctaPending : copy.cta(version)}
          </PrimaryButton>
          {/* Never over the page: a refused commit changed nothing, so the sheet
              stays open with the note still in it. */}
          {error && <MutationError message={error} />}
        </div>
        {/* The ghost, in the quieter ink the design gives a way out that changes
            nothing. */}
        <GhostButton
          disabled={pending}
          onClick={onCancel}
          className={`${BAR_BUTTON} min-h-[44px] md:min-h-0 md:py-[11px] md:px-[16px] text-[13.5px] font-medium text-[color:var(--fg-muted)]`}
        >
          {copy.cancel}
        </GhostButton>
      </div>
    </section>
  );
}
