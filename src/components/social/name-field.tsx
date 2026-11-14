"use client";
// The name field (Social R1 F5; one name, two doors since account settings design call 4): the ONE editor for the name
// friends see, opened by Change on /friends and by Change in Settings' Account. Save or Return commits, Cancel or Escape
// puts the name back. A blur commits too, unless focus went to the field's own Cancel or Save, which would otherwise
// submit twice (the folder rename's trap). Safari never focuses a clicked button, so the blur would arrive with no
// relatedTarget and Cancel would save: both buttons keep focus in the field on mousedown, as `rename-form.tsx` does.
// Empty or unchanged reverts. The cap is counted in code points (`capName`, E14), never `maxLength`.
//
// The caller owns where it sits (`className`) and what happens after: `onClose` hands it the new name to write, or null
// when nothing changes, exactly once.

import { useId, useRef, useState } from "react";
import { socialCopy } from "../../lib/copy/social";
import { capName, DISPLAY_NAME_MAX } from "../../lib/social/client-rules";
import { TextField } from "../ui/text-field";

const f = socialCopy.page.nameField;

export function NameField({ name, onClose, className }: { name: string; onClose: (next: string | null) => void; className: string }) {
  const [draft, setDraft] = useState(name);
  const form = useRef<HTMLFormElement>(null);
  // Set once the field has been answered, so a blur fired as it leaves (Escape, then removal) is not a second answer.
  const settled = useRef(false);
  const id = useId();
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  function done(commit: boolean) {
    if (settled.current) return;
    settled.current = true;
    const next = draft.normalize("NFC").replace(/\s+/gu, " ").trim();
    onClose(commit && next !== "" && next !== name ? next : null);
  }

  return (
    <form
      ref={form}
      className={`flex flex-col gap-[8px] ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        done(true);
      }}
    >
      <label htmlFor={`${id}-name`} className="text-[13px] font-semibold text-[color:var(--fg)]">{f.label}</label>
      <TextField
        id={`${id}-name`}
        autoFocus
        value={draft}
        aria-describedby={`${id}-hint`}
        onChange={(e) => setDraft(capName(e.target.value, DISPLAY_NAME_MAX))}
        onKeyDown={(e) => {
          // Escape mid-composition cancels the IME's candidate, never the draft.
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Escape") {
            e.preventDefault();
            done(false);
          }
        }}
        onBlur={(e) => {
          if (!form.current?.contains(e.relatedTarget as Node | null)) done(true);
        }}
        className="h-[44px] px-[12px] text-[16px] md:h-[40px] [@media(pointer:fine)]:md:text-[14px]"
      />
      <p id={`${id}-hint`} className="m-0 font-mono text-[11px] text-[color:var(--fg-faint)]">{f.hint}</p>
      <div className="flex gap-[8px] max-md:[&>button]:h-[44px] max-md:[&>button]:flex-1 max-md:[&>button]:text-[14px]">
        <button
          type="button"
          onClick={() => done(false)}
          // Safari focuses no clicked button, so the field's blur would save the draft first.
          onMouseDown={keepFocus}
          className="h-[32px] cursor-pointer rounded-[6px] bg-transparent px-[14px] font-sans text-[12.5px] text-[color:var(--fg-body)] [border:1px_solid_var(--border)]"
        >
          {f.cancel}
        </button>
        <button
          type="submit"
          onMouseDown={keepFocus}
          className="h-[32px] cursor-pointer rounded-[6px] border-0 bg-[color:var(--accent)] px-[14px] font-sans text-[12.5px] font-semibold text-[color:var(--bg)]"
        >
          {f.save}
        </button>
      </div>
    </form>
  );
}
