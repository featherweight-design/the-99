// The chassis every figure sits in.
//
// Three rules from the handoff's grammar (README "The grammar, in four rules"),
// and each one is load-bearing rather than cosmetic:
//
//  - `--surface-sunken` inside a `--border` hairline at radius 8, so a figure
//    reads as a specimen of the app rather than as a piece of this page.
//  - `aria-hidden` IN FULL. A figure repeats what the caption and the key lines
//    already say; announced, it would read every mark twice and name controls
//    that cannot be pressed.
//  - Inert. A specimen is not a control: nothing here navigates, submits or
//    focuses, and `pointer-events: none` is what makes that true of a real
//    component mounted with fixture props rather than merely intended.

export function Specimen({
  children,
  label,
}: {
  children: React.ReactNode;
  /** Names the figure for the annotation key; never announced. */
  label?: string;
}) {
  return (
    <figure
      aria-hidden
      className="pointer-events-none m-0 mt-[10px] select-none overflow-hidden rounded-[8px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[14px]"
      data-specimen={label}
    >
      {children}
    </figure>
  );
}

/**
 * A labelled cell inside a plate. The word under a mark is the annotation —
 * the grammar forbids leaders, arrows and hover, so the label sits beneath the
 * thing it names and nowhere else.
 */
export function SpecimenCell({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-[6px]">
      <div className="flex min-h-[22px] items-center">{children}</div>
      <span className="font-mono text-[10px] leading-[1.35] text-[color:var(--fg-faint)]">
        {caption}
      </span>
    </div>
  );
}

/** A plate's grid: four across on desktop, two at phone. §Phone halves the grid. */
export function SpecimenGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-[14px] md:grid-cols-4">{children}</div>;
}
