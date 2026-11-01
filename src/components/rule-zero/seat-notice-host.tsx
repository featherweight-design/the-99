"use client";

// The in-app seat notice (Rule 0 revisions, item 6; board `Notice`): "<host> seated you at <pod>'s table." as a toast with the
// table glyph on the Mark plate tint, `Open` and a bare ✕, and NO clock: a seat is an invitation, not a receipt. One toast per
// table, stacked in arrival order (the newest nearest the edge). Mounted once by the shell.
//
// How it learns of a notice, with no polling: it reads the viewer's unseen notices (`unseenSeatNoticesAction`) when it mounts,
// when the window gains focus or becomes visible (one read when both fire together), and when the service worker hands a seat
// push to the page (`public/sw.js` posts `SEAT_NOTICE_MESSAGE` to the window in front, and shows no system notification then).
// Not on every navigation: a notice that arrives while the app is closed shows on the next mount or focus.
//
// Not drawn on Home (the Home card arriving at the top is the notice: Home refreshes instead, here, from the same read) and not
// on that table's own page (the page marks the notice seen). `Open` and the table page both end in `markSeatNoticeSeenAction`
// on the table; ✕ calls it directly.

import { PendingReporter } from "../shell/pending-reporter";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { markSeatNoticeSeenAction, unseenSeatNoticesAction, type SeatToastNotice } from "../../app/friends/table/actions";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { PersonName } from "../../lib/person-name";
import { TableGlyph } from "./table-glyph";

/** What `public/sw.js` posts to the window in front when a seat push arrives; keep equal to its `SEAT_NOTICE_MESSAGE`. */
export const SEAT_NOTICE_MESSAGE = "the99:seat-notice";

const copy = ruleZeroCopy.notice;
const sentence = copy.toast;

/** Phone: 12px gutters, the floor 12px above the tab bar, 8px between toasts. From md the shared toast's desktop slot: bottom right, 22px in, 380 wide. */
const STACK_CLASS =
  "pointer-events-none fixed bottom-[calc(var(--tabbar-h,0px)+12px)] left-[12px] right-[12px] z-[60] flex flex-col gap-[8px] md:bottom-[22px] md:left-auto md:right-[22px] md:w-[380px]";

/** A burst of reads (a tab return fires both `focus` and `visibilitychange`) is one read. */
const READ_DEBOUNCE_MS = 1000;

/** The host and pod are drawn semibold in `--fg`, inside a sentence of `--fg-body` (board `Notice`). */
const NAME_CLASS = "font-semibold text-[color:var(--fg)]";

const TABLE_PREFIX = "/friends/table/";
const tablePath = (tableId: string) => `${TABLE_PREFIX}${tableId}`;

/** Where a notice is not drawn: Home (its card is the notice) and the notice's own table. */
export function hiddenAt(pathname: string | null, tableId: string): boolean {
  return pathname === "/" || pathname === tablePath(tableId);
}

export function SeatNoticeHost() {
  const pathname = usePathname();
  const router = useRouter();
  const [notices, setNotices] = useState<SeatToastNotice[]>([]);
  // Tables ever seen in a read (a Home refresh is for an arrival, never for what Home drew), and ✕'d/opened ones a late read must
  // not bring back: keyed to the notice's `since` when dismissed, so a re-seat (the server re-arms the notice with a newer
  // `since`) is drawn again.
  const known = useRef<Set<string> | null>(null);
  const dismissed = useRef<Map<string, number>>(new Map());
  const latest = useRef(0);
  const inFlight = useRef(false);
  const lastStart = useRef(0);
  const onHome = useRef(false);
  const refresh = useRef(router.refresh);
  const stack = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    onHome.current = pathname === "/";
    refresh.current = router.refresh;
  });

  const read = useCallback((force = false) => {
    if (!force && (inFlight.current || Date.now() - lastStart.current < READ_DEBOUNCE_MS)) return;
    const mine = ++latest.current;
    inFlight.current = true;
    lastStart.current = Date.now();
    unseenSeatNoticesAction().then(
      (fresh) => {
        if (mine !== latest.current) return;
        inFlight.current = false;
        // The read is ordered by table expiry, not by the seat: oldest seat first, so the newest is nearest the edge (stable for ties).
        const live = fresh
          .filter((n) => {
            const at = dismissed.current.get(n.tableId);
            if (at === undefined) return true;
            if (n.since <= at) return false;
            dismissed.current.delete(n.tableId);
            return true;
          })
          .sort((x, y) => x.since - y.since);
        const before = known.current;
        known.current = new Set(live.map((n) => n.tableId));
        // Arrival order: what was drawn keeps its place (refreshed with the read's names), a new table joins at the end (the edge).
        setNotices((prev) => {
          const kept = prev.flatMap((p) => live.filter((n) => n.tableId === p.tableId));
          const next = [...kept, ...live.filter((n) => !prev.some((p) => p.tableId === n.tableId))];
          const same = next.length === prev.length && next.every((n, i) => n.tableId === prev[i]!.tableId && n.since === prev[i]!.since);
          return same ? prev : next;
        });
        if (before && onHome.current && live.some((n) => !before.has(n.tableId))) refresh.current();
      },
      () => {
        if (mine === latest.current) inFlight.current = false;
        // not a fallback: a lost read draws nothing new, and the next focus or push reads again.
      },
    );
  }, []);

  useEffect(() => {
    read(true);
  }, [read]);

  useEffect(() => {
    const onFocus = () => read();
    const onVisible = () => {
      if (document.visibilityState === "visible") read();
    };
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === SEAT_NOTICE_MESSAGE) read(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
    sw?.addEventListener?.("message", onMessage);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      sw?.removeEventListener?.("message", onMessage);
    };
  }, [read]);

  // After a ✕ unmounts the focused button, keyboard focus goes to the next toast's ✕ (else the stack), not to the page's start.
  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    const next = target === "" ? null : stack.current?.querySelector<HTMLElement>(`[data-seat-close="${target}"]`);
    (next ?? stack.current)?.focus();
  });

  // Arriving on a table's page by any route (Home's card, a link) is the page marking its notice seen server-side: drop that
  // table's toast and keep a late read from bringing it back, without a second mark.
  useEffect(() => {
    const id = pathname?.startsWith(TABLE_PREFIX) ? pathname.slice(TABLE_PREFIX.length) : null;
    if (!id || id.includes("/")) return;
    setNotices((prev) => {
      const hit = prev.find((p) => p.tableId === id);
      if (!hit) return prev;
      dismissed.current.set(id, hit.since);
      return prev.filter((p) => p.tableId !== id);
    });
  }, [pathname]);

  const settle = (n: SeatToastNotice) => {
    dismissed.current.set(n.tableId, n.since);
    setNotices((prev) => prev.filter((p) => p.tableId !== n.tableId));
    markSeatNoticeSeenAction(n.tableId).catch(() => {});
  };
  const shown = notices.filter((n) => !hiddenAt(pathname, n.tableId));
  return (
    <div ref={stack} role="status" aria-live="polite" aria-atomic="false" tabIndex={-1} data-seat-notice-stack className={`${STACK_CLASS} outline-none`}>
      {shown.map((n, i) => (
        <div
          key={n.tableId}
          data-seat-notice={n.tableId}
          className="pointer-events-auto flex min-h-[56px] items-center gap-[10px] rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] py-[8px] pl-[10px] pr-[4px] text-[13.5px] leading-[1.4] text-[color:var(--fg-body)] shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
        >
          <span aria-hidden className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px] border border-solid border-[color:color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] text-[color:var(--accent-text)]">
            <TableGlyph size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={NAME_CLASS}>
              <PersonName n={n.host} />
            </span>
            {sentence.between}
            <span className={NAME_CLASS}>
              <PersonName n={n.podName} />
            </span>
            {sentence.end}
          </span>
          <Link
            href={tablePath(n.tableId)}
            onClick={() => settle(n)}
            className="flex min-h-[40px] flex-none items-center px-[8px] font-semibold text-[color:var(--accent-text)] underline decoration-[color:color-mix(in_oklab,var(--accent)_50%,transparent)] underline-offset-4"
          >
            {copy.open}
            <PendingReporter href={tablePath(n.tableId)} />
          </Link>
          <button
            type="button"
            aria-label={ruleZeroCopy.close.dismiss}
            data-seat-close={n.tableId}
            onClick={() => {
              pendingFocus.current = (shown[i + 1] ?? shown[i - 1])?.tableId ?? "";
              settle(n);
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
