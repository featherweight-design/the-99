import { collectionSources } from "../../lib/copy/collection-sources";

/** Moxfield's deck-link callout (the mock's ⓘ box): the bold lead, then why and what to do. One component for the landing's guide and the signed-in guides. */
export function MoxfieldNote({ className }: { className: string }) {
  const n = collectionSources.moxfieldNote;
  return (
    <p data-testid="moxfield-note" className={`flex items-start gap-[10px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-inset)] px-[12px] py-[10px] text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] ${className}`}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" className="mt-[2px] flex-none text-[color:var(--accent-text)]">
        <circle cx="8" cy="8" r="6.3" />
        <path d="M8 7.2v4" strokeLinecap="round" />
        <circle cx="8" cy="4.9" r=".55" fill="currentColor" stroke="none" />
      </svg>
      <span>
        <b className="font-semibold text-[color:var(--fg)]">{n.lead}</b> {n.body}
      </span>
    </p>
  );
}
