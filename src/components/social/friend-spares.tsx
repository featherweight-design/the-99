"use client";
// Friends with a spare of one card (Social R2 PR 8a; handoff R3 `Option B opened` O1 and O2, `Spares` S3): the
// stand-ins modal's section, and the read that feeds it. View only (Q3): a row names the friend, the pods their share
// reaches the reader through and how many they hold spare, and nothing on it is pressable.

import { useEffect, useState } from "react";
import type { FriendSpare } from "../../lib/social/spares";
import { spareCopy } from "../../lib/copy/social";
import { Face } from "./face";

/**
 * One card's spares from the uncached route (`GET /api/friend-spares`). Null on any failure: a spare is absent on
 * failure (G3), never an error the modal has to draw.
 */
export async function fetchCardSpares(oracleId: string): Promise<FriendSpare[] | null> {
  try {
    const res = await fetch(`/api/friend-spares?ids=${encodeURIComponent(oracleId)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { spares?: FriendSpare[] } | null;
    return Array.isArray(body?.spares) ? body.spares.filter((s) => s.oracleId === oracleId) : null;
  } catch {
    return null;
  }
}

/**
 * The card's spares as the modal reads them: `loading` until the route answers, then the rows (empty when nobody
 * has one, or when the read failed). Off (`enabled` false) it reads nothing and is settled at once with none.
 */
export function useCardSpares(oracleId: string, enabled: boolean): FriendSpare[] | "loading" {
  const [read, setRead] = useState<{ oracleId: string; spares: FriendSpare[] } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void fetchCardSpares(oracleId).then((spares) => {
      if (live) setRead({ oracleId, spares: spares ?? [] });
    });
    return () => {
      live = false;
    };
  }, [oracleId, enabled]);
  if (!enabled) return [];
  return read?.oracleId === oracleId ? read.spares : "loading";
}

/** Most spares first, then by name (R1 decision 16's order for people). */
export function orderSpares(spares: readonly FriendSpare[]): FriendSpare[] {
  return [...spares].sort((a, b) =>
    b.spare - a.spare
    || a.friend.displayName.localeCompare(b.friend.displayName, "en-US", { sensitivity: "base" })
    || (a.friend.publicId < b.friend.publicId ? -1 : 1));
}

/** The two-people glyph the spare marker and count chip draw (R3 `.spm`, `.sp2`). */
export function SpareGlyph({ size }: { size: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="16.5" cy="9.5" r="2.6" />
      <path d="M15.5 14.2c2.6-.3 4.6 1.3 5.1 4.3" />
    </svg>
  );
}

/** The section: its head with `view only`, a row per friend, and the foot line saying what a spare is. */
export function FriendSpareSection({ spares }: { spares: readonly FriendSpare[] }) {
  const rows = orderSpares(spares);
  return (
    <section aria-label={spareCopy.modalTitleSpares} data-testid="friend-spares" className="flex flex-col">
      <div className="flex items-center justify-between gap-[12px] pb-[6px]">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--fg-faint)]">{spareCopy.section(rows.length)}</span>
        <span className="font-mono text-[11.5px] text-[color:var(--fg-faint)]">{spareCopy.viewOnly}</span>
      </div>
      <ul role="list" className="m-0 list-none p-0">
        {rows.map((s) => (
          <li key={s.friend.publicId} data-testid="friend-spare" className="flex items-center gap-[12px] py-[9px]">
            <Face name={s.friend.displayName} commander={s.friend.commander} size={30} />
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <b className="truncate text-[15px] font-semibold text-[color:var(--fg)]">{s.friend.displayName}</b>
              {/* The pods wrap rather than truncate: they are why this friend can see you, and an ellipsis hid the second
                  one at 390 (bb's R2 walk). */}
              <span className="font-mono text-[11.5px] leading-[1.45] text-[color:var(--fg-faint)] [overflow-wrap:anywhere] [text-wrap:pretty]">
                {spareCopy.via(s.friend.pods)}
              </span>
            </span>
            <span className="inline-flex h-[22px] flex-none items-center gap-[6px] rounded-[4px] px-[7px] font-mono text-[11.5px] text-[color:var(--fact)] bg-[color-mix(in_oklab,var(--fact)_14%,transparent)]">
              <SpareGlyph size={13} />
              {spareCopy.count(s.spare)}
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 mt-[4px] text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]">{spareCopy.foot}</p>
    </section>
  );
}
