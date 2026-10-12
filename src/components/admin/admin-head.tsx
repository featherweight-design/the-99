"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PendingReporter } from "../shell/pending-reporter";
import type { AdminEnv } from "../../lib/admin/environment";
import { adminCopy } from "../../lib/copy/admin";

/**
 * The page head every admin page shares (design table, Page head): eyebrow and environment chip,
 * the page's title and sub, and the tab strip. The plan orders the tabs Costs, Switches, Groups,
 * Accounts, Models; a tab is listed once its page ships, so no tab leads to a 404. Costs is the
 * only page so far.
 */
export const ADMIN_TABS = [
  { key: "costs", href: "/admin", title: adminCopy.tabs.costs, sub: adminCopy.costs.sub },
] as const;

function tabFor(pathname: string) {
  // The longest href that prefixes the path, so a later `/admin/switches` beats `/admin`.
  return [...ADMIN_TABS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`)) ?? ADMIN_TABS[0];
}

export function AdminHead({ env }: { env: AdminEnv }) {
  const current = tabFor(usePathname() ?? "/admin");
  return (
    <header className="flex flex-none flex-col gap-[9px] border-0 border-solid border-[color:var(--border)] [border-bottom-width:1px] px-[16px] pt-[14px] md:px-[28px] md:pt-[26px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--fg-faint)]">{adminCopy.eyebrow}</span>
        <span className="inline-flex h-[22px] items-center gap-[6px] rounded-full border border-solid border-[color:var(--border-strong)] px-[8px] font-mono text-[10.5px] text-[color:var(--fg)]">
          <span
            aria-hidden
            className={`h-[6px] w-[6px] rounded-full ${env === "staging" ? "bg-[color:var(--warning)]" : "bg-[color:var(--danger)]"}`}
          />
          {env}
        </span>
      </div>
      <h1 className="m-0 font-display text-[23px] font-normal leading-[1.2] text-[color:var(--fg)] md:text-[28px]">{current.title}</h1>
      <p className="m-0 max-w-[720px] text-pretty text-[13px] leading-[1.6] text-[color:var(--fg-body)] md:text-[13.5px]">{current.sub}</p>
      <nav aria-label={adminCopy.tabsLabel} className="mt-[4px] flex gap-[15px] overflow-hidden md:gap-[24px]">
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
