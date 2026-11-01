"use client";
// The shell's Add cards host (add a card from anywhere, READINESS O5 and PR 2): the shipped Add cards sheet, opened
// from any page inside the signed-in shell. Card search's Add several cards opens it empty; search's + (PR 3) opens
// it with a card on the list, and the deck dock's bridge (PR 4) with a query typed. The sheet's steps, copy, scan and
// save rule are the shipped ones; this only decides when it is up and what happens around it.
//
// The handover follows card search's to card details (plan `2026-10-16-card-search.md`, resolution 3): the opener
// closes its own dialog first, and the sheet mounts only once that dialog's history entry has gone, so the two never
// stand together. The close hands back the same way: the opener hears it only after the sheet's entry has gone.
//
// A save is settled here, once the sheet has closed (`settleCollectionWrite`), as /collection's head does, so every
// reader behind it (a deck row's dot, /collection's grid) is fresh; the head re-reads its own totals on the event.
//
// Back on the sheet: the sheet's own `useBackDismiss` takes its entry, so by the time the close reaches the opener no
// self-pop is pending (`afterDialogsReleased` runs at once) and the search pushes one fresh entry of its own: no dead
// entry is left behind (a dirty list asks first, as shipped).
//
// One sheet at a time, page sheets included: /collection's own Add cards or Edit copies sheet holds the rest of the page
// inert (`useInertPage`), the shell's search with it, so nothing in the shell can ask while one is up. The host still
// refuses to open over any live modal it finds once the opener's dialog has gone (`dialogIsUp`).

import { usePathname } from "next/navigation";
import {
  Suspense,
  createContext,
  lazy,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { settleCollectionWrite } from "../../app/collection/edit-actions";
import { afterDialogsReleased } from "../../lib/a11y/dialog";
import { dialogIsUp } from "../../lib/card-search/shortcut";
import { useCollectionEditScope } from "../cards/collection-edit-scope";
import type { InitialAddCard } from "./add-cards-sheet";
import { announceCollectionSaved } from "./edit-toast";

// Loaded on the first open: the shell is on every page, and few of them ever open the sheet.
const AddCardsSheet = lazy(() => import("./add-cards-sheet").then((m) => ({ default: m.AddCardsSheet })));

export type OpenAddCards = {
  /** On the list at open, its printing step open (search's +). */
  initialCard?: InitialAddCard;
  /** Typed into the sheet's search at open (the dock's bridge). */
  initialQuery?: string;
  /** The sheet is drawn: an opener that holds its frame up meanwhile (search's veil) lets it go. */
  onOpened?: () => void;
  /**
   * The sheet closed and its history entry has gone, with whether it saved. Not called when it closed on the way to
   * another route (See it in History, the precon pick): that route replaces whatever the opener would bring back.
   */
  onClosed?: (outcome: { saved: boolean }) => void;
};

/**
 * Asks for the sheet. False when the ask is dropped at once (a sheet is already up or on its way, or this is the
 * public card page); a drop, then or once the opener's dialog has gone (another live modal is up), also calls the
 * ask's `onClosed({ saved: false })`, so an opener that closed itself for the sheet comes back rather than staying shut.
 */
export type AskAddCards = (open: OpenAddCards) => boolean;

const AddCardsContext = createContext<AskAddCards | null>(null);

/** Opens the shell's Add cards sheet, or null where no shell host is mounted (signed out, a test). */
export function useAddCards(): AskAddCards | null {
  return useContext(AddCardsContext);
}

type Shown = OpenAddCards & { n: number };

export function AddCardsHost({ totalCards, children }: { totalCards: number; children: ReactNode }) {
  // Not on the public card page, signed in or not (READINESS E6): the same scope that keeps card details' link off.
  const inScope = useCollectionEditScope();
  // The receipt's `4,492 → 4,493`. The shell's figure is server-rendered, and it moves after a save only because the
  // close's `settleCollectionWrite` revalidates inside the action, which re-renders the current route, root layout and
  // shell included, into the action's reply (`invalidateCollectionReaders` calls `revalidatePath`; Next's
  // `02-guides/server-actions.md`, "re-renders the current route" in the same response). A settle that fails, or a sheet opened again before the reply lands, would read the old figure, so the
  // copies saved since the shell last drew it are carried here, and dropped once the shell's figure moves.
  const [carried, setCarried] = useState({ base: totalCards, added: 0 });
  if (carried.base !== totalCards) setCarried({ base: totalCards, added: 0 });
  // Asked for, waiting on the opener's dialog to leave the history.
  const [asked, setAsked] = useState<Shown | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  // Closed, waiting on the sheet's own entry to leave before the opener hears.
  const [closed, setClosed] = useState<{ open: Shown; saved: boolean; leaving: boolean } | null>(null);
  // The open sheet saved (Add more can follow a save, so a sheet that saved may close on an empty list).
  const [savedWhileOpen, setSavedWhileOpen] = useState(false);
  const count = useRef(0);
  // An ask is on its way or its sheet is up. A ref, so two asks in one press see each other.
  const held = useRef(false);

  const open = useCallback(
    (o: OpenAddCards) => {
      // One sheet at a time: a second ask while one is up or on its way is the same press twice. It is dropped, and its
      // opener hears so (`onClosed`), so it does not stay closed waiting for a sheet that never comes.
      if (held.current || !inScope) {
        o.onClosed?.({ saved: false });
        return false;
      }
      held.current = true;
      setAsked({ ...o, n: ++count.current });
      return true;
    },
    [inScope],
  );

  useEffect(() => {
    if (!asked) return;
    return afterDialogsReleased(() => {
      setAsked(null);
      // Another modal is still up (a page's own sheet): the sheet would stand over it as a second modal. Dropped, and
      // the opener comes back.
      if (dialogIsUp(document, null)) {
        held.current = false;
        asked.onClosed?.({ saved: false });
        return;
      }
      setSavedWhileOpen(false);
      setShown(asked);
    });
  }, [asked]);

  useEffect(() => {
    if (!closed) return;
    const { open: o, saved, leaving } = closed;
    if (saved) {
      // The add invalidates after its response, so the readers behind are re-read here, inside the action.
      void settleCollectionWrite().then(announceCollectionSaved, () => {});
    }
    return afterDialogsReleased(() => {
      setClosed(null);
      if (!leaving) o.onClosed?.({ saved });
    });
  }, [closed]);

  // A navigation takes the sheet with it (the shell outlives every page): the phone's upload row is a plain link. A
  // save it made is still settled, and the opener hears nothing, since the new route replaces what it would bring back.
  const pathname = usePathname();
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    setAsked(null);
    if (shown) {
      setShown(null);
      if (savedWhileOpen) setClosed({ open: shown, saved: true, leaving: true });
    }
  }

  // The navigation's reset above dropped any ask and sheet: the host takes asks again (a ref, so not during render).
  useEffect(() => {
    held.current = false;
  }, [pathname]);

  const close = useCallback(
    (leaving?: boolean) => {
      if (!shown) return;
      held.current = false;
      setShown(null);
      setClosed({ open: shown, saved: savedWhileOpen, leaving: leaving === true });
    },
    [shown, savedWhileOpen],
  );

  return (
    <AddCardsContext.Provider value={open}>
      {children}
      {shown ? (
        <Suspense fallback={null}>
          <AddCardsSheet
            key={shown.n}
            mode="add"
            totalCards={carried.base + carried.added}
            // The shipped sheet as /collection opens it: Scan beside its search, Precons I own in its empty state.
            scan
            preconPick
            initialCard={shown.initialCard}
            initialQuery={shown.initialQuery}
            onSaved={(copies) => {
              setSavedWhileOpen(true);
              setCarried((c) => ({ ...c, added: c.added + copies }));
            }}
            onClose={close}
          />
          <Opened key={`opened-${shown.n}`} onOpened={shown.onOpened} />
        </Suspense>
      ) : null}
    </AddCardsContext.Provider>
  );
}

/** Mounts beside the sheet, inside its Suspense boundary, so it runs only once the sheet's code has landed and drawn. */
function Opened({ onOpened }: { onOpened?: () => void }) {
  useEffect(() => {
    onOpened?.();
    // Once per sheet: the key remounts it for the next.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
