"use client";

import { useEffect, useRef, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PendingReporter } from "../shell/pending-reporter";
import type { AdminEnv } from "../../lib/admin/environment";
import { adminCopy, switchCopy } from "../../lib/copy/admin";
import { isSwitchName, switchKind, switchParent, type SwitchName } from "../../lib/switches/registry";
import { SwitchTags } from "./switches-list";

/**
 * The page head every admin page shares (design table, Page head): eyebrow and environment chip,
 * the page's title and sub, and the tab strip. The plan orders the tabs Costs, Switches, Groups,
 * Accounts, Models; a tab is listed once its page ships, so no tab leads to a 404.
 */
export const ADMIN_TABS = [
  { key: "costs", href: "/admin", title: adminCopy.tabs.costs, sub: adminCopy.costs.sub },
  { key: "switches", href: "/admin/switches", title: adminCopy.tabs.switches, sub: adminCopy.switches.sub },
  { key: "groups", href: "/admin/groups", title: adminCopy.tabs.groups, sub: adminCopy.groups.sub },
  // No sub here: the Accounts sub counts the accounts Clerk lists, which the head (in the layout, on every
  // admin page) does not read. The list page draws it under the tab strip instead.
  { key: "accounts", href: "/admin/accounts", title: adminCopy.tabs.accounts, sub: null },
  { key: "models", href: "/admin/models", title: adminCopy.tabs.models, sub: adminCopy.models.sub },
] as const;

/** A group's name and description, for the head's detail mode on its page. */
export type GroupHeadName = { id: string; name: string; description: string | null };

function tabFor(pathname: string) {
  // The longest href that prefixes the path, so a later `/admin/switches` beats `/admin`.
  return [...ADMIN_TABS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`)) ?? ADMIN_TABS[0];
}

/** The switch a `/admin/switches/<VARIABLE>` path names, for the head's detail mode (design table, Page head). */
function switchOf(pathname: string): SwitchName | null {
  const m = /^\/admin\/switches\/([^/]+)\/?$/.exec(pathname);
  return m && isSwitchName(m[1]) ? m[1] : null;
}

/**
 * The group a `/admin/groups/<id>` path names, or the new-group page, for the head's detail mode:
 * the group's name as the title, its description as the sub (none, no sub). An id the map does not
 * hold draws the plain Groups head; the page itself is the 404.
 */
function groupOf(pathname: string, groups: readonly GroupHeadName[]): { title: string; sub: string | null } | null {
  const m = /^\/admin\/groups\/([^/]+)\/?$/.exec(pathname);
  if (!m) return null;
  if (m[1] === "new") return { title: adminCopy.groups.newTitle, sub: null };
  const g = groups.find((x) => x.id === m[1]);
  return g ? { title: g.name, sub: g.description } : null;
}

/**
 * Whether a path is one account's page, `/admin/accounts/<clerkId>`. Its name comes from Clerk, which
 * the head does not read, so on that page the head draws the back link and the tab strip only, and the
 * page draws the account's own head block (name as the title, email, id, role) under the strip.
 */
function isAccountPage(pathname: string): boolean {
  return /^\/admin\/accounts\/[^/]+\/?$/.test(pathname);
}

/**
 * The height of the head's PINNED part, published for a page's own pinned bar to sit beneath
 * (`top-[var(--admin-head-h,0px)]`): the whole head from `md` up, the tab strip alone on a phone
 * (`usePinnedHead`). The head wraps its sub at narrow widths, so it is measured rather than assumed.
 */
export const ADMIN_HEAD_HEIGHT_VAR = "--admin-head-h";

/**
 * Publishes an element's measured height on the root as `name`, so a sticky element below it can sit
 * beneath it. Removed on unmount.
 */
export function usePublishedHeight(ref: RefObject<HTMLElement | null>, name: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty(name, `${el.getBoundingClientRect().height}px`);
    publish();
    // Guarded, as `about-sheet.tsx` guards it: without the API the head re-measures on a window
    // resize instead, since a narrower window can wrap the sub to another line.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(publish);
    observer?.observe(el);
    if (!observer) window.addEventListener("resize", publish);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", publish);
      root.style.removeProperty(name);
    };
  }, [ref, name]);
}

/**
 * Pins the head, and publishes the part of it that stays on screen as `--admin-head-h`. On a phone
 * only the tab strip stays: the eyebrow, title and sub scroll away under a negative `top` (Hugh,
 * 2026-10-13: the whole head took too much of the screen). From `md` up the whole head stays.
 */
function usePinnedHead(headRef: RefObject<HTMLElement | null>, tabsRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const head = headRef.current;
    const tabs = tabsRef.current;
    if (!head || !tabs) return;
    const root = document.documentElement;
    const wide = window.matchMedia("(min-width: 48rem)");
    const publish = () => {
      // What sits above the strip, measured unrounded (`offsetTop` is whole pixels, and the sub's
      // 20.8px lines would leave a sliver of it showing, or clip the strip).
      const box = head.getBoundingClientRect();
      const hidden = wide.matches ? 0 : tabs.getBoundingClientRect().top - box.top;
      head.style.top = `${-hidden}px`;
      root.style.setProperty(ADMIN_HEAD_HEIGHT_VAR, `${box.height - hidden}px`);
    };
    publish();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(publish);
    observer?.observe(head);
    if (!observer) window.addEventListener("resize", publish);
    wide.addEventListener("change", publish);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", publish);
      wide.removeEventListener("change", publish);
      head.style.top = "";
      root.style.removeProperty(ADMIN_HEAD_HEIGHT_VAR);
    };
  }, [headRef, tabsRef]);
}

export function AdminHead({ env, groups = [] }: { env: AdminEnv; groups?: readonly GroupHeadName[] }) {
  const pathname = usePathname() ?? "/admin";
  const current = tabFor(pathname);
  // A switch's page keeps the tab strip, with Switches selected, and titles itself with the switch.
  const detail = switchOf(pathname);
  // A group's page, and the new-group page, title themselves likewise with Groups selected.
  const group = detail ? null : groupOf(pathname, groups);
  const account = !detail && !group && isAccountPage(pathname);
  const back = detail
    ? { href: "/admin/switches", text: adminCopy.switch.back }
    : group
      ? { href: "/admin/groups", text: adminCopy.groups.back }
      : account
        ? { href: "/admin/accounts", text: adminCopy.accounts.back }
        : null;
  const sub = detail ? switchCopy[detail].description : group ? group.sub : account ? null : current.sub;
  const ref = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  usePinnedHead(ref, tabsRef);
  return (
    // Pinned (design table R2 delta `page`): the shell scrolls the document, so the head is sticky
    // over the page's content (on a phone only its tab strip, `usePinnedHead`), and a page's own
    // pinned bar sits beneath it.
    <header ref={ref} className="sticky top-0 z-[2] flex flex-none flex-col bg-[color:var(--bg)] gap-[9px] border-0 border-solid border-[color:var(--border)] [border-bottom-width:1px] px-[16px] pt-[14px] md:px-[28px] md:pt-[26px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--fg-faint)]">{adminCopy.eyebrow}</span>
        <span className="inline-flex h-[22px] items-center gap-[6px] rounded-full border border-solid border-[color:var(--border-strong)] px-[8px] font-mono text-[10.5px] text-[color:var(--fg)]">
          <span
            aria-hidden
            className={`h-[6px] w-[6px] rounded-full ${env === "staging" ? "bg-[color:var(--warning)]" : "bg-[color:var(--danger)]"}`}
          />
          {env}
        </span>
        {back && (
          <Link href={back.href} className="ml-auto text-[13px] text-[color:var(--accent)]">
            {back.text}
            <PendingReporter href={back.href} />
          </Link>
        )}
      </div>
      {detail ? (
        <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-[6px]">
          <h1 className="m-0 font-display text-[23px] font-normal leading-[1.2] text-[color:var(--fg)] md:text-[28px]">{switchCopy[detail].label}</h1>
          <span className="font-mono text-[11.5px] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">{detail}</span>
          <SwitchTags row={{ kind: switchKind(detail), parent: switchParent(detail) }} />
        </div>
      ) : group ? (
        <h1 className="m-0 font-display text-[23px] font-normal leading-[1.2] text-[color:var(--fg)] [overflow-wrap:anywhere] md:text-[28px]">{group.title}</h1>
      ) : account ? null : (
        <h1 className="m-0 font-display text-[23px] font-normal leading-[1.2] text-[color:var(--fg)] md:text-[28px]">{current.title}</h1>
      )}
      {sub && (
        <p className="m-0 max-w-[720px] text-pretty text-[13px] leading-[1.6] text-[color:var(--fg-body)] [overflow-wrap:anywhere] md:text-[13.5px]">
          {sub}
        </p>
      )}
      <nav ref={tabsRef} aria-label={adminCopy.tabsLabel} className="mt-[4px] flex gap-[15px] overflow-hidden md:gap-[24px]">
        {ADMIN_TABS.map((tab) => {
          const selected = tab.key === current.key;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={selected ? "page" : undefined}
              className={`mb-[-1px] inline-flex h-[42px] flex-none items-center border-0 border-solid [border-bottom-width:2px] text-[13.5px] md:h-[40px] md:text-[14px] ${
                selected
                  ? "border-[color:var(--fg)] font-medium text-[color:var(--fg)]"
                  : "border-[color:transparent] text-[color:var(--fg-muted)]"
              }`}
            >
              {tab.title}
              <PendingReporter href={tab.href} />
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
