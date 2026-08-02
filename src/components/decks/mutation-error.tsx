// MutationError — in-place reason a deck mutation was refused.
// Warning amber #E0913C, matching §Degraded Suggestions Banner.

interface MutationErrorProps {
  message: string;
}

export function MutationError({ message }: MutationErrorProps) {
  return (
    <p
      role="alert"
      aria-live="polite"
      className="text-[11px] md:text-[11.5px] leading-[1.45] mt-[6px]"
      style={{ color: "#E0913C" }}
    >
      {message}
    </p>
  );
}
