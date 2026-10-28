// The release banner's mark (arrivals-banner.tsx): a 22px plate holding a 7px accent diamond. One definition, because
// About's Good to know heading carries the same mark (About visual handoff, call 2).

export function Mark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`box-border flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[6px] ${className}`}
      style={{
        background: "color-mix(in srgb, var(--accent) 16%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)",
      }}
    >
      <span className="h-[7px] w-[7px] rotate-45 bg-[color:var(--accent)]" />
    </span>
  );
}
