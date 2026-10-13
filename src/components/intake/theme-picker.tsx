"use client";
// The Theme field (Help me choose, HANDOFF §2 field 3): the picked themes as chips, then a text
// input that filters the vocabulary. An ARIA combobox over a multiselectable listbox: the input
// keeps focus throughout, the arrows move the active option, and Enter toggles it. Picking does
// not close the list, since picking more than one is the point, but it clears the typed text so the
// next theme can be searched for. Escape, or a press outside the field and its list, clears the
// text and closes the list (`useSearchDismiss`).
//
// The phone's list is not drawn in the handoff; it is the same list, full width under the field.
// No motion anywhere (STATES invariant).

import { useId, useMemo, useState } from "react";

import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";
import type { VocabularyTheme } from "../../lib/intake/vocabulary";
import { AFFIX_FOCUS_INPUT, AFFIX_INPUT } from "../ui/text-field";
import { useSearchDismiss } from "../../lib/ui/search-dismiss";

export function ThemePicker({
  themes,
  value,
  onChange,
  labelId,
}: {
  /** The vocabulary, most commanders first. */
  themes: readonly VocabularyTheme[];
  /** Picked slugs, in the order picked. */
  value: readonly string[];
  onChange: (slugs: string[]) => void;
  /** The field label's id: it names the combobox. */
  labelId: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const bySlug = useMemo(() => new Map(themes.map((t) => [t.slug, t])), [themes]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? themes.filter((t) => t.label.toLowerCase().includes(q)) : themes;
  }, [themes, query]);

  const { ref: rootRef, onEscape } = useSearchDismiss<HTMLDivElement>(open || query !== "", () => {
    setQuery("");
    setOpen(false);
  });

  const toggle = (slug: string) => {
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
    setQuery("");
    setActive(0);
  };

  const activeIndex = Math.min(active, Math.max(0, shown.length - 1));
  const optionId = (i: number) => `${listId}-o${i}`;
  const expanded = open && shown.length > 0;

  return (
    // `relative`: the list is a popover anchored under the field (Hugh, 2026-09-27; ruling Q2). It
    // opens OVER the fields below and pushes nothing, which is what its raised surface and shadow
    // always drew.
    <div ref={rootRef} className="relative flex flex-col gap-[6px]">
      <div
        // The chips' remove buttons ring themselves, so only the input's focus lights the field.
        className={`flex flex-wrap items-center gap-[6px] min-h-[44px] md:min-h-[40px] px-[10px] py-[6px] rounded-[9px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] ${AFFIX_FOCUS_INPUT}`}
      >
        {value.map((slug) => {
          const label = bySlug.get(slug)?.label ?? slug;
          return (
            <span
              key={slug}
              data-testid="theme-chip"
              className="inline-flex items-center gap-[6px] h-[26px] pl-[9px] pr-[7px] rounded-[6px] bg-[color:var(--elevated)] text-[12.5px] text-[color:var(--fg)]"
            >
              {label}
              <button
                type="button"
                aria-label={copy.intake.removeTheme(label)}
                onClick={() => toggle(slug)}
                // 44px hit area on the phone, drawn at the chip's own height.
                className="relative inline-flex items-center justify-center w-[20px] h-[26px] text-[11px] text-[color:var(--fg-faint)] cursor-pointer before:absolute before:content-[''] before:inset-[-9px_-12px] md:before:inset-0"
              >
                ✕
              </button>
            </span>
          );
        })}
        <input
          role="combobox"
          aria-labelledby={labelId}
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded ? optionId(activeIndex) : undefined}
          value={query}
          placeholder={value.length > 0 ? copy.intake.themeAnother : copy.intake.themePlaceholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              if (!open) return setOpen(true);
              const dir = e.key === "ArrowDown" ? 1 : -1;
              setActive((activeIndex + dir + shown.length) % Math.max(1, shown.length));
            } else if (e.key === "Enter") {
              // Enter picks; it never submits the form from inside the list.
              if (expanded) {
                e.preventDefault();
                toggle(shown[activeIndex].slug);
              }
            } else if (onEscape(e)) {
              return;
            } else if (e.key === "Backspace" && query === "" && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          className={`flex-1 min-w-[120px] h-[28px] px-[4px] ${AFFIX_INPUT} text-[16px] md:text-[13.5px] text-[color:var(--fg)] placeholder:text-[color:var(--fg-faint)]`}
        />
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-multiselectable="true"
        aria-labelledby={labelId}
        hidden={!expanded}
        className="absolute left-0 right-0 top-full z-30 mt-[6px] mb-0 mx-0 list-none max-h-[288px] overflow-y-auto p-[5px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] shadow-[0_14px_30px_rgba(0,0,0,.45)]"
      >
        {shown.map((t, i) => {
          const selected = value.includes(t.slug);
          return (
            <li
              key={t.slug}
              id={optionId(i)}
              role="option"
              aria-selected={selected}
              // Keeps focus in the input, so the list stays open under a pointer.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggle(t.slug)}
              onMouseMove={() => i !== activeIndex && setActive(i)}
              className={[
                "flex items-center gap-[10px] h-[36px] px-[10px] rounded-[7px] cursor-pointer",
                i === activeIndex || selected ? "bg-[color:var(--elevated)]" : "",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "block shrink-0 w-[14px] h-[14px] rounded-[4px]",
                  selected
                    ? "bg-[color:var(--accent)]"
                    : "[border:1.5px_solid_var(--border-dashed)]",
                ].join(" ")}
              />
              <span className="flex-1 min-w-0 truncate text-[13px] text-[color:var(--fg)]">{t.label}</span>
              <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                {copy.intake.themeCount(t.commanders)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
