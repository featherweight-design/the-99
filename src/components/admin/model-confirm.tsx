"use client";

import { useState } from "react";
import { ConfirmFrame, type ConfirmFact } from "./confirm-frame";
import { usd } from "../../lib/admin/costs-rule";
import type { ConfirmPreview } from "../../lib/admin/switch-writes";
import type { Op, Scope } from "../../lib/admin/switch-writes-rule";
import { adminCopy } from "../../lib/copy/admin";

// The model confirm (admin STATES F3; design table, Confirm): a write that raises how many accounts
// can press a model feature, drawn in the shared `ConfirmFrame`. It renders the server's preview and computes no figure of its own; `Turn on for n` sends n
// back, and a count that moved since is answered with a fresh preview rather than a write.

const copy = adminCopy.confirmModel;

export type ConfirmContext = { switchLabel: string; op: Op; scope: Scope; groupName: string | null };

function lead({ op, scope, groupName }: ConfirmContext, preview: ConfirmPreview, what?: string): string {
  what ??= scope === "group" ? copy.lead.group[op](groupName ?? "") : copy.lead[scope][op];
  const features = preview.costs.map((c) => copy.capability[c.key]);
  const list = features.length < 3 ? features.join(" and ") : `${features.slice(0, -1).join(", ")} and ${features.at(-1)}`;
  return `${what} ${copy.spends(list)}`;
}

export function ModelConfirm({
  preview,
  context,
  pending,
  onConfirm,
  onCancel,
  leadText,
  noted = true,
}: {
  preview: ConfirmPreview;
  context: ConfirmContext;
  /** The lead's first sentence, when the write is not an override (a group save names its own). */
  leadText?: string;
  /** False where the write has no note to record (a group save's events carry none). */
  noted?: boolean;
  pending: boolean;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const credits = preview.credits.join(" or ");
  const facts: ConfirmFact[] = [
    [copy.facts.who, preview.names.join(", ")],
    [
      copy.facts.cost,
      [
        ...preview.costs.map((c) => `${copy.cost(copy.capability[c.key], usd(c.reserveMicroUsd))} ${c.meanMicroUsd === null ? copy.noMean : copy.mean(usd(c.meanMicroUsd))}`),
        ...(credits ? [copy.credits(credits)] : []),
      ].join(" "),
    ],
    [copy.facts.whatsNew, preview.whatsNew > 0 ? copy.whatsNew(preview.whatsNew, context.switchLabel) : copy.noWhatsNew],
    [copy.facts.when, copy.when],
  ];
  return (
    <ConfirmFrame
      title={copy.title(context.switchLabel, preview.count)}
      lead={lead(context, preview, leadText)}
      facts={facts}
      cancelLabel={copy.cancel}
      confirmLabel={copy.confirm(preview.count)}
      pending={pending}
      onConfirm={() => onConfirm(note)}
      onCancel={onCancel}
    >
      {noted && (
        <label className="flex flex-col gap-[6px] text-[12.5px] text-[color:var(--fg-muted)]">
          {copy.note}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            autoComplete="off"
            className="h-[44px] w-full rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] text-[16px] text-[color:var(--fg)] md:h-[38px] [@media(pointer:fine)]:md:text-[14px]"
          />
        </label>
      )}
    </ConfirmFrame>
  );
}
