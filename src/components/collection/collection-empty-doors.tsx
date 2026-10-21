"use client";
// The empty collection's two doors (collection edit B0b): upload a file, or add cards by hand.
// Equal tiles, neither primary. Rows on the phone, 260px tiles from `md`. Drawn only under
// COLLECTION_EDIT_ENABLED; with it off the page keeps its single Upload button.
//
// With NO_COLLECTION_ENTRY_ENABLED (no-collection entry S13) the two doors become one: the Upload tile, 540 wide
// from `md` and the shipped 64px row on the phone, then the ways group step 1 draws, whose third row is this
// state's own `Add cards`. One order on both surfaces.

import Link from "next/link";
import { useRef, useState } from "react";
import { settleCollectionWrite } from "../../app/collection/edit-actions";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { AddCardsSheet } from "./add-cards-sheet";
import { ReplaceIcon } from "./replace-icon";
import { PendingReporter } from "../shell/pending-reporter";
import { WaysGroup } from "./ways-group";

const TILE =
  "flex min-h-[64px] w-full items-center gap-[12px] rounded-[12px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-[14px_16px] text-left md:min-h-0 md:flex-col md:items-start md:gap-[8px] md:p-[18px]";

function DoorText({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <span className="flex flex-1 flex-col gap-[2px] md:contents">
        <span className="text-[15px] font-semibold text-[color:var(--fg)]">{title}</span>
        <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)] md:text-[13px]">{sub}</span>
      </span>
      <span aria-hidden className="text-[color:var(--fg-faint)] md:hidden">
        ›
      </span>
    </>
  );
}

function DoorMark({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] bg-[color:var(--elevated)] text-[17px] text-[color:var(--accent-text)]"
    >
      {children}
    </span>
  );
}

export function CollectionEmptyDoors({
  ways = null,
  scan = false,
}: {
  ways?: { precons: boolean } | null;
  /** `CARD_SCAN_ENABLED` for the reader: the Add cards sheet's Scan press. */
  scan?: boolean;
} = {}) {
  const c = collectionEditCopy.empty;
  const [adding, setAdding] = useState(false);
  const saved = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const openAdd = (el: HTMLElement) => {
    trigger.current = el;
    saved.current = false;
    setAdding(true);
  };

  return (
    <>
      {ways ? (
        <div className="mt-[20px] flex w-full max-w-[420px] flex-col md:mt-[26px] md:max-w-[540px]">
          <Link href="/collection/replace" className={TILE}>
            <DoorMark>
              <ReplaceIcon size={18} className="block" />
            </DoorMark>
            <DoorText title={c.uploadTitle} sub={c.uploadSub} />
            <PendingReporter href="/collection/replace" />
          </Link>
          <WaysGroup surface="empty" precons={ways.precons} onAddCards={openAdd} />
        </div>
      ) : (
      <div className="mt-[26px] grid w-full max-w-[420px] gap-[10px] md:max-w-none md:grid-cols-[repeat(2,260px)] md:justify-center md:gap-[14px]">
        <Link href="/collection/replace" className={TILE}>
          <DoorMark>
            <ReplaceIcon size={18} className="block" />
          </DoorMark>
          <DoorText title={c.uploadTitle} sub={c.uploadSub} />
          <PendingReporter href="/collection/replace" />
        </Link>
        <button type="button" className={TILE} onClick={(e) => openAdd(e.currentTarget)}>
          <DoorMark>+</DoorMark>
          <DoorText title={c.addTitle} sub={c.addSub} />
        </button>
      </div>
      )}
      {adding ? (
        <AddCardsSheet
          mode="add"
          returnFocusRef={trigger}
          totalCards={0}
          scan={scan}
          // The page behind the sheet turns into the browse list once the collection exists, which
          // would unmount the sheet and its saved state with it; the refresh waits for the close.
          onSaved={() => {
            saved.current = true;
          }}
          onClose={() => {
            setAdding(false);
            if (saved.current) void settleCollectionWrite();
          }}
        />
      ) : null}
    </>
  );
}
