"use client";
// The search's one listbox (tool discovery D, README 5): up to two labelled groups of options, `Tools for this` above
// the card results, under one id so the field's `aria-activedescendant` and ↑ ↓ walk them as a single list. The card
// search's dropdown and sheet draw it, and the Home tools panel's popover (E) draws the same one: a surface that wants
// Ask answers imports this and `ask-results.tsx`, never its own copy (`pnpm check:shared`).

import type { ReactNode } from "react";

export type ListboxGroup = {
  key: string;
  /** The group's accessible name; the visible heading, when there is one, is `heading` and hidden from the tree. */
  label: string;
  heading?: ReactNode;
  children: ReactNode;
};

/** `busy`: a tool's page is loading (R12 Q20), so the options are announced as busy and take no press. */
export function SearchListbox({ id, label, groups, busy = false }: { id: string; label: string; groups: ListboxGroup[]; busy?: boolean }) {
  return (
    <div role="listbox" id={id} aria-label={label} aria-busy={busy || undefined} inert={busy || undefined}>
      {groups.map((g) => (
        <div key={g.key} role="group" aria-label={g.label}>
          {g.heading ? <div aria-hidden>{g.heading}</div> : null}
          {g.children}
        </div>
      ))}
    </div>
  );
}
