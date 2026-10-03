import { twMerge } from "tailwind-merge";

// Shared shell for the page-level empty states (/decks, /collection,
// /commanders). Like the button primitives, these own tokens only — color,
// family, weight, line-height, layout — and leave font-size, spacing and the
// mark to the caller, because every surface's design table sizes them
// differently. Fixing sizes here would only mean overriding them everywhere.
//
// Tokens, never hex: the sites these replaced had drifted to a pasted
// foreground literal in one place and var(--fg) in another for the same
// heading.

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

/**
 * An h1 by default, because most empty states ARE the page. `level={2}` is for a page that
 * already has its own h1 above the empty state, as /collection's place head does.
 */
export function EmptyStateTitle({
  className,
  children,
  level = 1,
}: Props & { level?: 1 | 2 }) {
  const Tag = level === 1 ? "h1" : "h2";
  return <Tag className={twMerge(TITLE, className)}>{children}</Tag>;
}

export function EmptyStateBody({ className, children }: Props) {
  return <p className={twMerge(BODY, className)}>{children}</p>;
}
