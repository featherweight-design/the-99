import Link from "next/link";
import { twMerge } from "tailwind-merge";

// Shared CTA primitives per docs/superpowers/design-tables/appshell.md
// §404: Primary CTA and §404: Secondary CTA — the canonical statement of the
// brass and ghost contracts.
//
// These own fill, text colour, border, font-weight, border-radius and hover
// ONLY. Padding and font-size are deliberately left to the caller: the design
// tables specify them differently for nearly every surface, so a primitive
// that fixed them would be overridden everywhere and hide drift rather than
// prevent it.
//
// Everything owned here is a Tailwind class, never an inline style. An inline
// style background outranks a hover: utility and silently kills the hover —
// the bug these primitives exist to make unrepresentable.

const BASE =
  "font-sans font-semibold rounded-lg transition-colors cursor-pointer";

const PRIMARY =
  "bg-[color:var(--brass)] text-[color:var(--bg)] hover:bg-[color:var(--brass-hover)]";

const GHOST =
  "bg-transparent text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] " +
  "hover:[border-color:var(--brass)] hover:[color:var(--brass-hover)]";

type SharedProps = {
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = SharedProps &
  (
    | ({ href: string } & Omit<
        React.ComponentPropsWithoutRef<typeof Link>,
        "href" | "className"
      >)
    | ({ href?: undefined } & Omit<
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        "className"
      >)
  );

function renderButton(variant: string, props: ButtonProps) {
  const { className, children, ...rest } = props;
  // twMerge, not concatenation: Tailwind resolves conflicting utilities by
  // generated-stylesheet order, not class-string order, so a caller's
  // rounded-[7px] would not reliably beat BASE's rounded-lg.
  const classes = twMerge(BASE, variant, className);

  if (rest.href !== undefined) {
    const { href, ...linkProps } = rest;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return renderButton(PRIMARY, props);
}

export function GhostButton(props: ButtonProps) {
  return renderButton(GHOST, props);
}
