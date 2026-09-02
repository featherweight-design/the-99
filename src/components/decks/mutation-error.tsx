// MutationError — in-place reason a deck mutation was refused.
// Warning amber var(--warning), matching §Degraded Suggestions Banner.

interface MutationErrorProps {
  message: string;
}

export function MutationError({ message }: MutationErrorProps) {
  // role="alert" already implies an assertive live region, and the refusal answers
  // a click the user is waiting on, so interrupting is correct. A redundant
  // aria-live="polite" alongside it only fights the implicit value.
  return (
    <p
      role="alert"
      className="text-[11px] md:text-[11.5px] leading-[1.45] mt-[6px]"
      style={{ color: "var(--warning)" }}
    >
      {message}
    </p>
  );
}
