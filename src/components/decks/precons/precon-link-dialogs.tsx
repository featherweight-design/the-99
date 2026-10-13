"use client";

// The built-from link's dialogs (R3 addendum, STATES K3, K5 to K7, K13). Each is the start dialog's
// chrome (`start-precon.tsx`): a modal at 900, a bottom sheet at 390, focus held inside, a press
// outside or Escape dismisses unless a write is in flight. Linking and unlinking return rather than
// redirect: the action revalidates the page under the reader, and the dialog closes.
//
// - K3 `ConfirmLinkDialog`: the suggestion's `Link it`, the one link path that confirms.
// - K6 `LinkPreconRow`: the dashed row at the foot of Versions, and its precon picker.
// - K7 `LinkDeckButton`: the open precon's `Link a deck`, and its deck picker.
// - K13 `UnlinkPrecon`: the open precon's `Unlink`; `UnlinkDialog` is its confirm, which v0's panel
//   opens too (precons PR 6b).

import { startTransition, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { linkPrecon, unlinkPrecon } from "../../../app/decks/precon-link-actions";
import { useDialogA11y } from "../../../lib/a11y/dialog";
import { preconMonth, preconsCopy } from "../../../lib/copy/precons";
import type { PreconMatch } from "../../../lib/precons/link";
import type { PreconDeckChoice } from "../../../lib/precons/open-read";
import { GhostButton, PrimaryButton } from "../../ui/button";
import { CommanderThumb } from "../../ui/commander-thumb";
import { SearchField } from "../../ui/text-field";
import { escapeDismisses } from "../../../lib/ui/search-dismiss";

const copy = preconsCopy.link;

/** One write in flight at a time: a ref, not the state, so two presses in one render send one. */
function useLinkWrite(onDone: () => void) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const run = (write: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setFailed(false);
    startTransition(async () => {
      try {
        await write();
        onDone();
      } catch {
        setFailed(true);
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    });
  };
  return { pending, failed, run };
}

function Shell({ title, pending, onDismiss, initialFocusRef, children }: {
  title: string;
  pending: boolean;
  onDismiss: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // A dismissal mid-flight would hide a write the reader thinks they cancelled.
  const dismiss = () => { if (!pending) onDismiss(); };
  useDialogA11y(dialog, dismiss, { initialFocusRef });
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:px-[16px]">
      <div aria-hidden="true" onClick={dismiss} className="absolute inset-0 bg-[rgba(16,13,10,0.74)]" />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 mx-auto flex max-h-[90dvh] w-full flex-col gap-[16px] overflow-y-auto rounded-[16px_16px_0_0] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-[10px_18px_18px] md:max-w-[500px] md:rounded-[14px] md:p-[24px_24px_20px]"
      >
        <span aria-hidden className="mx-auto h-[4px] w-[36px] flex-none rounded-full bg-[color:var(--border-strong)] md:hidden" />
        <div className="flex items-start justify-between gap-[12px]">
          <h2 id={titleId} className="m-0 font-display text-[20px] font-normal text-[color:var(--fg)]">{title}</h2>
          <button
            type="button"
            onClick={dismiss}
            disabled={pending}
            aria-label={copy.confirm.cancel}
            className="hidden h-[36px] w-[36px] flex-none cursor-pointer items-center justify-center rounded-full border border-solid border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-muted)] md:flex"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-[12px] border-x-0 border-t-0 border-b-[1px] border-solid border-b-[color:var(--border)] py-[9px]">
      <span className="text-[12.5px] text-[color:var(--fg-muted)]">{k}</span>
      <span className="text-right font-mono text-[11px] text-[color:var(--fg-body)]">{v}</span>
    </div>
  );
}

/** The failed line (R2 S1e): mono 11 `--danger`, above the buttons. */
function Failed({ text }: { text: string }) {
  return <p role="alert" className="m-0 font-mono text-[11px]" style={{ color: "var(--danger)" }}>{text}</p>;
}

/** Cancel and the bone primary: never `--danger`, because nothing the player made is lost (lock 5). */
function Actions({ pending, onDismiss, submit, submitLabel, disabled = false }: {
  pending: boolean; onDismiss: () => void; submit: () => void; submitLabel: string; disabled?: boolean;
}) {
  return (
    <div className="flex gap-[8px] md:justify-end">
      <button
        type="button"
        onClick={onDismiss}
        disabled={pending}
        className="h-[46px] flex-1 cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] font-sans text-[13px] text-[color:var(--fg-body)] md:h-[40px] md:flex-none"
      >
        {copy.confirm.cancel}
      </button>
      <PrimaryButton
        type="button"
        onClick={submit}
        disabled={disabled || pending}
        className="h-[46px] min-w-0 flex-1 rounded-[8px] px-[14px] text-[13px] md:h-[40px] md:flex-none"
      >
        {submitLabel}
      </PrimaryButton>
    </div>
  );
}

/** K3: the suggestion's confirm. The precon, three facts (v0 · Shared · v1), `Cancel` · `Link`. */
export function ConfirmLinkDialog({ deckId, deckName, match, onDismiss }: {
  deckId: string; deckName: string; match: PreconMatch; onDismiss: () => void;
}) {
  const c = copy.confirm;
  const { pending, failed, run } = useLinkWrite(onDismiss);
  return (
    <Shell title={c.title(deckName, match.name)} pending={pending} onDismiss={onDismiss}>
      <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{c.lead}</p>
      <div className="flex items-center gap-[11px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[10px_12px]">
        <CommanderThumb imageUri={match.leadImage} colorIdentity={null} size="list" />
        <div className="flex min-w-0 flex-col gap-[2px]">
          <span className="font-display text-[15px] text-[color:var(--fg)]">{match.name}</span>
          <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
            {[match.commanders.join(" + "), match.setCode, preconMonth(match.releaseDate)].join(" · ")}
          </span>
        </div>
      </div>
      <div className="flex flex-col">
        <Fact k={c.factLabels.v0} v={c.facts.v0(match.name, match.cards)} />
        <Fact k={c.factLabels.shared} v={c.facts.shared(match.shared, match.of)} />
        <Fact k={c.factLabels.v1} v={c.facts.v1} />
      </div>
      {failed && <Failed text={c.failed} />}
      <Actions
        pending={pending}
        onDismiss={onDismiss}
        submit={() => run(() => linkPrecon(deckId, match.fileName))}
        submitLabel={pending ? c.pending : c.submit}
      />
    </Shell>
  );
}

/** K8 / K13: `Unlink` beside the open precon's built sentence, and its confirm. */
export function UnlinkPrecon({ deckId, deckName, fileName, preconName }: {
  deckId: string; deckName: string; fileName: string; preconName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <GhostButton type="button" onClick={() => setOpen(true)} className="h-[32px] flex-none rounded-[7px] px-[11px] text-[12.5px]">
        {copy.unlink.entry}
      </GhostButton>
      {open && <UnlinkDialog deckId={deckId} deckName={deckName} fileName={fileName} preconName={preconName} onDismiss={() => setOpen(false)} />}
    </>
  );
}

/** K13: unlink's confirm. What leaves (v0), one fact (History), `Cancel` · `Unlink` in the bone fill. */
export function UnlinkDialog({ deckId, deckName, fileName, preconName, onDismiss }: {
  deckId: string; deckName: string; fileName: string; preconName: string; onDismiss: () => void;
}) {
  const c = copy.unlink;
  const { pending, failed, run } = useLinkWrite(onDismiss);
  return (
    <Shell title={c.title(deckName, preconName)} pending={pending} onDismiss={onDismiss}>
      <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{c.lead}</p>
      <div className="flex flex-col">
        <Fact k={c.factLabels.history} v={c.facts.history} />
      </div>
      {failed && <Failed text={c.failed} />}
      <Actions
        pending={pending}
        onDismiss={onDismiss}
        submit={() => run(() => unlinkPrecon(deckId, fileName))}
        submitLabel={pending ? c.pending : c.submit}
      />
    </Shell>
  );
}

type PickItem = { id: string; name: string; meta: string; note: string | null; fig: string; search: string };

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * K6 and K7: search, a label, radio rows (select / unselect, never tick), and a foot naming the
 * selection and what linking does, or asking for one with the button disabled (K6n). Linking from
 * here is one step: the picker is the confirm.
 */
export function LinkPicker({ title, lead, searchLabel, label, figSub, items, none, noMatch, foot, footNone, submit, onLink, onDismiss }: {
  title: string;
  lead: string;
  searchLabel: string;
  label: string;
  figSub: string;
  items: PickItem[];
  none: string;
  /** A search that matched nothing, told apart from a list that is empty. */
  noMatch: (q: string) => string;
  foot: string;
  footNone: string;
  submit: (name: string) => string;
  onLink: (id: string) => Promise<void>;
  onDismiss: () => void;
}) {
  const c = copy.pickPrecon;
  const search = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { pending, failed, run } = useLinkWrite(onDismiss);
  const needle = fold(q.trim());
  const shown = needle === "" ? items : items.filter((i) => fold(i.search).includes(needle));
  // A radio group's keyboard: one stop in the tab order (the selected row, else the first), and
  // the arrows move the selection and the focus together, wrapping at the ends.
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const tabStop = shown.some((i) => i.id === selected) ? selected : shown[0]?.id ?? null;
  const onRadioKey = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    const to = e.key === "Home" ? 0 : e.key === "End" ? shown.length - 1 : step === 0 ? -1 : (index + step + shown.length) % shown.length;
    if (to < 0) return;
    e.preventDefault();
    const next = shown[to];
    setSelected(next.id);
    rows.current.get(next.id)?.focus();
  };
  const chosen = items.find((i) => i.id === selected) ?? null;

  return (
    <Shell title={title} pending={pending} onDismiss={onDismiss} initialFocusRef={search}>
      <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{lead}</p>
      <SearchField
        ref={search}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        // With a search typed, the first Escape clears it; the next closes the dialog.
        onKeyDown={(e) => escapeDismisses(e, q !== "", () => setQ(""))}
        placeholder={searchLabel}
        aria-label={searchLabel}
        containerClassName="h-[44px] rounded-[8px] md:h-[40px]"
        className="font-sans text-[16px] md:text-[14px]"
      />
      <div className="flex flex-col gap-[8px]">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[color:var(--fg-faint)]">{label}</span>
        {items.length === 0
          ? <p className="m-0 text-[12.5px] text-[color:var(--fg-muted)]">{none}</p>
          : shown.length === 0 && <p className="m-0 text-[12.5px] text-[color:var(--fg-muted)]">{noMatch(q.trim())}</p>}
        <div role="radiogroup" aria-label={label} className="flex max-h-[min(340px,40dvh)] flex-col gap-[6px] overflow-y-auto overscroll-contain">
          {shown.map((item, index) => {
            const on = item.id === selected;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={item.id === tabStop ? 0 : -1}
                ref={(el) => { if (el) rows.current.set(item.id, el); else rows.current.delete(item.id); }}
                onKeyDown={(e) => onRadioKey(e, index)}
                aria-label={on ? c.unselectAria(item.name) : c.selectAria(item.name)}
                disabled={pending}
                onClick={() => setSelected(on ? null : item.id)}
                className={`flex min-h-[56px] w-full cursor-pointer items-start gap-[12px] rounded-[10px] border border-solid p-[10px_12px] text-left md:min-h-[52px] md:p-[10px_13px] ${on
                  ? "border-[color:var(--accent)] bg-[color:var(--surface-rail)]"
                  : "border-[color:var(--border)] bg-[color:var(--surface-sunken)]"}`}
              >
                <span
                  aria-hidden
                  className={`flex h-[22px] w-[22px] flex-none items-center justify-center self-center rounded-full border-[2px] border-solid ${on ? "border-[color:var(--accent)]" : "border-[color:var(--border-dashed)]"}`}
                >
                  {on && <span className="h-[10px] w-[10px] rounded-full bg-[color:var(--accent)]" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="font-display text-[15px] text-[color:var(--fg)]">{item.name}</span>
                  <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-muted)]">{item.meta}</span>
                  {item.note && <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{item.note}</span>}
                </span>
                <span className="flex flex-none flex-col items-end gap-[1px]">
                  <span className="font-mono text-[12px] font-medium text-[color:var(--fg)]">{item.fig}</span>
                  <span className="font-mono text-[9.5px] text-[color:var(--fg-faint)]">{figSub}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="m-0 font-mono text-[11px] leading-[1.5] text-[color:var(--fg-muted)]">{chosen ? foot : footNone}</p>
      {failed && <Failed text={copy.confirm.failed} />}
      <Actions
        pending={pending}
        onDismiss={onDismiss}
        disabled={chosen === null}
        submit={() => { if (chosen) run(() => onLink(chosen.id)); }}
        submitLabel={pending ? copy.confirm.pending : chosen ? submit(chosen.name) : copy.confirm.submit}
      />
    </Shell>
  );
}

/** K5 / K6: the dashed row at the foot of an unlinked deck's Versions, where v0 will land. */
export function LinkPreconRow({ deckId, deckName, picker }: { deckId: string; deckName: string; picker: PreconMatch[] }) {
  const [open, setOpen] = useState(false);
  const v = copy.versionsRow;
  const c = copy.pickPrecon;
  return (
    <>
      <div className="flex flex-col gap-[8px] rounded-[9px] border border-dashed border-[color:var(--border-dashed)] p-[12px_14px] md:flex-row md:items-center md:gap-[14px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="text-[13.5px] font-semibold text-[color:var(--fg)]">{v.head}</span>
          <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{v.body}</span>
        </div>
        <GhostButton type="button" onClick={() => setOpen(true)} className="h-[44px] flex-none rounded-[8px] px-[14px] text-[13px] md:h-[36px]">
          {v.cta}
        </GhostButton>
      </div>
      {open && (
        <LinkPicker
          title={c.title(deckName)}
          lead={c.lead}
          searchLabel={c.search}
          label={c.label}
          figSub={c.figSub}
          items={picker.map((m) => ({
            id: m.fileName,
            name: m.name,
            meta: [m.commanders.join(" + "), m.setCode, preconMonth(m.releaseDate), ...(m.sameCommanders ? [c.sameClause(m.commanders.length === 2)] : [])].join(" · "),
            note: null,
            fig: c.fig(m.shared, m.of),
            search: [m.name, m.setCode, ...m.commanders].join(" "),
          }))}
          none={c.none}
          noMatch={preconsCopy.none.head}
          foot={c.foot}
          footNone={c.footNone}
          submit={c.submit}
          onLink={(fileName) => linkPrecon(deckId, fileName)}
          onDismiss={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** K7: the open precon's `Link a deck`, a ghost beside Start (docked beside it at 390). */
export function LinkDeckButton({ fileName, preconName, of, decks, className }: {
  fileName: string; preconName: string; of: number; decks: PreconDeckChoice[]; className: string;
}) {
  const [open, setOpen] = useState(false);
  const c = copy.pickDeck;
  return (
    <>
      <GhostButton type="button" onClick={() => setOpen(true)} className={className}>{c.entry}</GhostButton>
      {open && (
        <LinkPicker
          title={c.title(preconName)}
          lead={c.lead}
          searchLabel={c.search}
          label={c.label}
          figSub={c.figSub}
          items={decks.map((d) => ({
            id: d.deckId,
            name: d.deckName,
            meta: [d.commanders.join(" + "), ...(d.sameCommanders ? [c.sameClause(d.commanders.length === 2)] : [])].join(" · "),
            note: d.linkedElsewhere ? c.linkedElsewhere(d.linkedElsewhere) : null,
            fig: c.fig(d.shared, of),
            search: [d.deckName, ...d.commanders].join(" "),
          }))}
          none={c.none}
          noMatch={c.noMatch}
          foot={c.foot}
          footNone={c.footNone}
          submit={c.submit}
          onLink={(deckId) => linkPrecon(deckId, fileName)}
          onDismiss={() => setOpen(false)}
        />
      )}
    </>
  );
}
