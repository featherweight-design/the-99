"use client";
// Scope — discover's leading control, and the mirror of the owned lane's
// availability (locked decision 2). It picks which question the lane is ranked
// on: the support you already own, or the distance from what you have built.
//
// Never greyed and never empty. It always has a value and the lane opens on
// `Best fit`; moving it to `Something new` turns the trigger brass and adds one
// chip. The glosses render in the sheet only — the rack has no second line.
//
// Not to be confused with the top-level `scope-control.tsx`, which is the old
// one-page toggle between the two lanes and goes away with the split.

import { discoverCopy } from "../../../lib/copy/lanes";
import type { Scope } from "../../../lib/commanders/lane-params";
import { RackSelect } from "./select";

const copy = discoverCopy.scope;

const OPTIONS = [
  { key: "bestfit" as const, label: copy.bestFit, gloss: copy.bestFitGloss },
  { key: "new" as const, label: copy.somethingNew, gloss: copy.somethingNewGloss },
];

export function ScopeControl({
  value,
  onChange,
  wide,
  showGlosses,
  pending = false,
}: {
  value: Scope;
  onChange: (s: Scope) => void;
  wide: boolean;
  /** Sheet only. */
  showGlosses: boolean;
  /** Scope is the one control on either lane whose flip can reach the server —
      the rest narrow a list the client already holds. #338's contract applies
      to it and to nothing else in the rack. */
  pending?: boolean;
}) {
  const current = OPTIONS.find((o) => o.key === value) ?? OPTIONS[0];
  return (
    <RackSelect
      legend={copy.legend}
      triggerLabel={current.label}
      // The brass diamond, which the order trigger does not carry: scope leads
      // the rack and is the one control there that is always answering.
      triggerLeading={
        <span
          aria-hidden
          className="block h-[7px] w-[7px] rotate-45 shrink-0 bg-[color:var(--accent)]"
        />
      }
      brass={value !== "bestfit"}
      wide={wide}
      value={value}
      options={OPTIONS}
      onChange={onChange}
      triggerHeight={34}
      // The sheet gives scope 48px rows rather than 44px pills: each carries a
      // gloss under its label.
      rowHeight={48}
      showGlosses={showGlosses}
      pending={pending}
    />
  );
}
