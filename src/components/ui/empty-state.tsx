import { twMerge } from "tailwind-merge";

// Shared shell for the page-level empty states (/decks, /collection,
// /commanders). Like the button primitives, these own tokens only — colour,
// family, weight, line-height, layout — and leave font-size, spacing and the
// mark to the caller, because every surface's design table sizes them
// differently. Fixing sizes here would only mean overriding them everywhere.
//
// Tokens, never hex: the sites these replaced had drifted to a literal
// #EDE6D8 in one place and var(--fg) in another for the same heading.

const CONTAINER = "flex flex-col items-center justify-center text-center p-8";
const TITLE = "font-display font-bold text-[color:var(--fg)] m-0";
const BODY = "text-[color:var(--fg-body)] leading-[1.6]";

type Props = {
  className?: string;
  children: React.ReactNode;
};

export function EmptyState({ className, children }: Props) {
  return <section className={twMerge(CONTAINER, className)}>{children}</section>;
}

export function EmptyStateTitle({ className, children }: Props) {
  return <h1 className={twMerge(TITLE, className)}>{children}</h1>;
}

export function EmptyStateBody({ className, children }: Props) {
  return <p className={twMerge(BODY, className)}>{children}</p>;
}
