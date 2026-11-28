"use client";
// An answer to the reader's own spare request, opened over Home (small items item 3, board `Spare-Answer-Sheet`):
// the press on Home's "Your request" item opens THIS sheet rather than going to /friends. The body is the shipped
// Your requests row for that one request (`RequestPicture`, `RequestText`), with Clear in place of its ✕; the foot goes
// to the whole list. Opening marks that one answer seen (`openAnswerAction`, `markAnswerSeen`). Clear removes the
// request for good, closes the sheet and takes the Home item with it through the row's own dismiss, so focus lands on
// the next item's ✕ as the shipped ✕ sends it; a failed Clear keeps the sheet and shows the shared toast.
//
// What's new owns it (`AnswerSheetProvider`): the item key, the dismiss, and the visit's seen set. Off the provider (or
// when the open is refused) the press goes to /friends, as it shipped.
import { captureClientError } from "../../lib/sentry/capture-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { closeSpareAction, openAnswerAction, openOfferAnswerAction } from "../../app/friends/spare-actions";
import { dialogsUp } from "../../lib/a11y/dialog";
import { announceAnswerSeen } from "../shell/answer-seen";
import { spareCopy } from "../../lib/copy/social";
import type { FeedView } from "../../lib/feed/home";
import type { HistoryEntry } from "../../lib/social/request-history";
import type { YourRequest } from "../../lib/social/your-requests";
import { ModalChrome } from "../decks/receipt-modal";
import { personAttrs } from "../../lib/person-name";
import { PendingReporter } from "../shell/pending-reporter";
import { useSpareToast } from "../social/spare-answer";
import { OfferAnswerSheet } from "./offer-answer-sheet";
import { RequestPicture, RequestText, requestText } from "../social/your-requests";

const m = spareCopy.request.mine;

type Ctx = {
  /**
   * Opens the item's request over Home. `from` is the press: a close hands focus back to it explicitly (Safari never
   * focuses a pressed button, and the open waits on the action, so the dialog's own restore can find only the body),
   * and Clear finds the row's ✕ from it.
   */
  open: (item: FeedView, from: HTMLElement) => void;
  /** The item whose open is out, so its press reads busy. */
  pending: string | null;
};
const AnswerSheetContext = createContext<Ctx | null>(null);
export const useAnswerSheet = (): Ctx | null => useContext(AnswerSheetContext);

type Open = { item: FeedView; from: HTMLElement } & ({ request: YourRequest; entry?: undefined } | { entry: HistoryEntry; request?: undefined });

/**
 * What's new's answer sheet. `onSeen` takes the item's diamond off for the visit; `onCleared` hides the item through
 * the row's own dismiss (`useFeedDismiss`), given the row's ✕ so focus moves as a ✕ press would.
 */
export function AnswerSheetProvider({ now, onSeen, onCleared, children }: {
  now: string;
  onSeen: (key: string) => void;
  onCleared: (key: string, from: HTMLElement, move?: boolean) => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [open, setOpen] = useState<Open | null>(null);
  // The sheet up now, read by a Clear whose reply lands after it closed.
  const current = useRef<Open | null>(null);
  useLayoutEffect(() => {
    current.current = open;
  }, [open]);
  async function openItem(item: FeedView, from: HTMLElement) {
    if (pending) return;
    setPending(item.key);
    // An answer to the reader's OFFER (You have it R2) opens the request-history row; an answer to their ask, their Your
    // requests row. Neither is a sheet the other can open: the server resolves the key to the one kind it names.
    const offered = item.offer === true;
    const out = offered ? await openOfferAnswerAction(item.key).catch((e) => {
          captureClientError("home.offer-answer-open", e);
          return null;
        })
      : await openAnswerAction(item.key).catch((e) => {
          captureClientError("home.answer-open", e);
          return null;
        });
    setPending(null);
    // The server marked an ask's answer seen whatever happens next (an offer's answer has no stamp: its diamond goes for
    // the visit), so the diamond, the count and the Friends badge follow it.
    if (out?.ok) {
      onSeen(item.key);
      if ("counted" in out && out.counted) announceAnswerSeen(new Date(out.request.answeredAt ?? 0).toISOString());
    }
    // The item was dismissed while the open was out (its press is gone), or the reader opened another sheet meanwhile:
    // either way they moved on, so the late reply opens nothing and goes nowhere.
    if (!from.isConnected || dialogsUp().length > 0) return;
    // Refused (cleared since, or the switch off) or failed: where the press went as it shipped (an offer's answer is
    // read on Request history).
    if (!out?.ok) return router.push(offered ? "/friends/requests" : "/friends");
    setOpen("entry" in out ? { item, entry: out.entry, from } : { item, request: out.request, from });
  }
  return (
    <AnswerSheetContext.Provider value={{ open: (item, from) => void openItem(item, from), pending }}>
      {children}
      {open?.entry && (
        <OfferAnswerSheet
          entry={open.entry}
          now={now}
          onClose={() => {
            const back = open.from;
            setOpen(null);
            requestAnimationFrame(() => {
              if (back.isConnected) back.focus();
            });
          }}
        />
      )}
      {open?.request && (
        <AnswerSheet
          request={open.request}
          now={now}
          onClose={() => {
            const back = open.from;
            setOpen(null);
            // After the dialog's own restore, which runs as it unmounts.
            requestAnimationFrame(() => {
              if (back.isConnected) back.focus();
            });
          }}
          onCleared={() => {
            const row = open.from.closest("li")?.querySelector<HTMLElement>("[data-feed-dismiss]") ?? open.from;
            // Closed while the Clear was out: the request is gone, so its item goes too, but the reader is elsewhere
            // now (perhaps in another sheet), so focus stays where they put it.
            const still = current.current === open;
            if (still) setOpen(null);
            onCleared(open.item.key, row, still);
          }}
        />
      )}
    </AnswerSheetContext.Provider>
  );
}

function AnswerSheet({ request, now, onClose, onCleared }: { request: YourRequest; now: string; onClose: () => void; onCleared: () => void }) {
  const toast = useSpareToast();
  const [busy, setBusy] = useState(false);
  const text = requestText(request, new Date(now));
  async function clear() {
    if (busy) return;
    setBusy(true);
    const ok = await closeSpareAction(request.id).then((o) => o.ok, () => false);
    setBusy(false);
    if (!ok) return toast.fail();
    onCleared();
  }
  return (
    <>
      <ModalChrome
        title={m.sheet.title}
        closeLabel={m.sheet.close}
        onClose={onClose}
        width={560}
        fit
        foot={
          // The way to the whole list: left on a phone, right from desktop (the board's pinned foot).
          <div className="flex min-h-[52px] items-center px-[16px] pb-[8px] [border-top:1px_solid_var(--border)] md:min-h-[46px] md:justify-end md:px-[18px] md:pb-0">
            <Link href="/friends#your-requests" className="flex min-h-[44px] items-center font-sans text-[13.5px] font-medium text-[color:var(--accent-text)] no-underline">
              {m.sheet.all}
              <PendingReporter href="/friends#your-requests" />
            </Link>
          </div>
        }
      >
        <div
          data-testid="answer-sheet-row"
          data-state={request.state}
          className="mx-[16px] mb-[16px] mt-[14px] grid grid-cols-[46px_minmax(0,1fr)] items-center gap-x-[12px] rounded-[14px] bg-[color:var(--surface-inset)] px-[14px] pb-[6px] pt-[12px] [border:1px_solid_var(--border)] md:mx-[18px] md:mb-[18px] md:mt-[16px] md:gap-x-[14px] md:px-[16px]"
        >
          {/* The picture spans the words and Clear, centred on both (R1b). */}
          <RequestPicture a={request} className="row-span-2 self-center" />
          <RequestText a={request} text={text} now={new Date(now)} />
          <button
            type="button"
            data-testid="answer-sheet-clear"
            {...personAttrs(
              { "aria-label": m.clearAria(request.holder.displayName, request.card.name) },
              "col-start-2 -ml-[2px] flex min-h-[44px] cursor-pointer items-center justify-self-start border-0 bg-transparent px-[2px] font-sans text-[13px] font-medium text-[color:var(--fg-muted)] disabled:cursor-default md:mt-[4px] md:min-h-[32px]",
            )}
            aria-busy={busy || undefined}
            disabled={busy}
            onClick={() => void clear()}
          >
            {m.sheet.clear}
          </button>
        </div>
      </ModalChrome>
      {toast.node}
    </>
  );
}
