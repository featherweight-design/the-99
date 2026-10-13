"use client";

import { useState } from "react";
import type { Explanation } from "../../lib/admin/switch-page-rule";
import { adminCopy } from "../../lib/copy/admin";
import { mirrorUrl } from "../../lib/url/mirror";
import { ResolvedDot } from "./switches-list";

const copy = adminCopy.switch;

/**
 * Check an account (admin STATES F1; design table, check an account): the switch's value for one
 * account and the rung that decided it. Every account's explanation ships with the page, computed by
 * the request path's own resolver, so a pick never navigates; it mirrors `?account=` so the page can
 * be shared or reloaded on the same account.
 */
export function CheckAccount({ explanations, initial }: { explanations: readonly Explanation[]; initial: string | null }) {
  const [id, setId] = useState(initial ?? "");
  const picked = explanations.find((e) => e.id === id) ?? null;
  return (
    <div
      data-testid="check-account"
      className="flex flex-col items-start gap-[14px] rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)] px-[14px] py-[12px] md:flex-row md:items-center md:px-[16px]"
    >
      <select
        aria-label={copy.check}
        value={id}
        onChange={(e) => {
          setId(e.target.value);
          const url = new URL(window.location.href);
          if (e.target.value) url.searchParams.set("account", e.target.value);
          else url.searchParams.delete("account");
          mirrorUrl(url);
        }}
        className="h-[44px] w-full rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] text-[16px] text-[color:var(--fg)] md:h-[36px] md:w-[200px] md:text-[13.5px]"
      >
        <option value="">{copy.checkPick}</option>
        {explanations.map((e) => (
          <option key={e.id} value={e.id}>
            {e.label}
          </option>
        ))}
      </select>
      {picked && (
        <span data-testid="check-result" className="inline-flex min-w-0 items-center gap-[7px] text-[13.5px] text-[color:var(--fg)]">
          <ResolvedDot state={picked.on ? "on" : "off"} />
          <span>
            {picked.on ? adminCopy.switches.resolved.on : adminCopy.switches.resolved.off}
            {" · "}
            <span className={picked.kill ? "text-[color:var(--danger)]" : "text-[color:var(--fg-muted)]"}>{picked.source}</span>
          </span>
        </span>
      )}
    </div>
  );
}
