"use client";

// The in-app seat notice (Rule 0 revisions, item 6; board `Notice`): "<host> seated you at <pod>'s table." as a toast with the
// table glyph on the Mark plate tint, `Open` and a bare ✕, and NO clock: a seat is an invitation, not a receipt. One toast per
// table, stacked in arrival order (the newest nearest the edge). Mounted once by the shell.
//
// How it learns of a notice, with no polling: it reads the viewer's unseen notices (`unseenSeatNoticesAction`) when it mounts,
// on every navigation, when the window gains focus or becomes visible, and when the service worker hands a seat push to the
// page (`public/sw.js` posts `SEAT_NOTICE_MESSAGE` to the window in front, and shows no system notification then).
//
// Not drawn on Home (the Home card arriving at the top is the notice: Home refreshes instead, here, from the same read) and not
// on that table's own page (the page marks the notice seen). `Open` and the table page both end in `markSeatNoticeSeenAction`
// on the table; ✕ calls it directly.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { markSeatNoticeSeenAction, unseenSeatNoticesAction, type SeatToastNotice } from "../../app/friends/table/actions";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { PersonText } from "../../lib/person-name";
import { TableGlyph } from "./table-glyph";

/** What `public/sw.js` posts to the window in front when a seat push arrives; keep equal to its `SEAT_NOTICE_MESSAGE`. */
export const SEAT_NOTICE_MESSAGE = "the99:seat-notice";

const copy = ruleZeroCopy.notice;

/** Phone: 12px gutters, the floor 12px above the tab bar, 8px between toasts. From md the shared toast's desktop slot: bottom right, 22px in, 380 wide. */
const STACK_CLASS =
  "pointer-events-none fixed bottom-[calc(var(--tabbar-h,0px)+12px)] left-[12px] right-[12px] z-[60] flex flex-col gap-[8px] md:bottom-[22px] md:left-auto md:right-[22px] md:w-[380px]";

const tablePath = (tableId: string) => `/friends/table/${tableId}`;

/** Where a notice is not drawn: Home (its card is the notice) and the notice's own table. */
export function hiddenAt(pathname: string | null, tableId: string): boolean {
  return pathname === "/" || pathname === tablePath(tableId);
}

export function SeatNoticeHost() {
  const pathname = usePathname();
  const router = useRouter();
  const [notices, setNotices] = useState<SeatToastNotice[]>([]);
  // Tables ever seen in a read (a Home refresh is for an arrival, never for what Home drew), and ✕'d ones a late read must not bring back.
  const known = useRef<Set<string> | null>(null);
  const dismissed = useRef<Set<string>>(new Set());
  const latest = useRef(0);
  const onHome = useRef(false);
  useEffect(() => {
    onHome.current = pathname === "/";
  }, [pathname]);

  const read = useCallback(() => {
    const mine = ++latest.current;
    unseenSeatNoticesAction().then(
      (fresh) => {
        if (mine !== latest.current) return;
        const live = fresh.filter((n) => !dismissed.current.has(n.tableId));
        const before = known.current;
        known.current = new Set(live.map((n) => n.tableId));
        // Arrival order: what was drawn keeps its place, a new table joins at the end (the edge).
        setNotices((prev) => {
          const kept = prev.flatMap((p) => live.filter((n) => n.tableId === p.tableId));
          return [...kept, ...live.filter((n) => !prev.some((p) => p.tableId === n.tableId))];
        });
        if (before && onHome.current && live.some((n) => !before.has(n.tableId))) router.refresh();
      },
      () => {
        // not a fallback: a lost read draws nothing new, and the next navigation, focus or push reads again.
      },
    );
  }, [router]);

  useEffect(() => {
    read();
  }, [pathname, read]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") read();
    };
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === SEAT_NOTICE_MESSAGE) read();
    };
    window.addEventListener("focus", read);
    document.addEventListener("visibilitychange", onVisible);
    const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
    sw?.addEventListener?.("message", onMessage);
    return () => {
      window.removeEventListener("focus", read);
      document.removeEventListener("visibilitychange", onVisible);
      sw?.removeEventListener?.("message", onMessage);
    };
  }, [read]);

  const drop = (tableId: string) => setNotices((prev) => prev.filter((n) => n.tableId !== tableId));
  const shown = notices.filter((n) => !hiddenAt(pathname, n.tableId));
  if (shown.length === 0) return null;
  return (
    <div data-seat-notice-stack className={STACK_CLASS}>
      {shown.map((n) => (
        <div
          key={n.tableId}
          role="status"
          data-seat-notice={n.tableId}
          className="pointer-events-auto flex min-h-[56px] items-center gap-[10px] rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] py-[8px] pl-[10px] pr-[4px] text-[13.5px] leading-[1.4] text-[color:var(--fg-body)] shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
        >
          <span aria-hidden className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px] border border-solid border-[color:color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] text-[color:var(--accent)]">
            <TableGlyph size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <PersonText text={copy.toast(n.host, n.podName)} />
          </span>
          <Link
            href={tablePath(n.tableId)}
            onClick={() => drop(n.tableId)}
            className="flex min-h-[40px] flex-none items-center px-[8px] font-semibold text-[color:var(--accent-text)] underline decoration-[color:color-mix(in_oklab,var(--accent)_50%,transparent)] underline-offset-4"
          >
            {copy.open}
          </Link>
          <button
            type="button"
            aria-label={ruleZeroCopy.close.dismiss}
            onClick={() => {
              dismissed.current.add(n.tableId);
              drop(n.tableId);
              markSeatNoticeSeenAction(n.tableId).catch(() => {});
            }}
            className="flex h-[40px] w-[36px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-[13px] text-[color:var(--fg-muted)]"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>
      ))}
    </div>
  );
}
