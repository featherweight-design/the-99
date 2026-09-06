import Link from "next/link";
import { twMerge } from "tailwind-merge";

// Shared CTA primitives per docs/superpowers/design-tables/appshell.md
// §404: Primary CTA and §404: Secondary CTA — the canonical statement of the
// accent and ghost contracts.
//
// These own nine properties ONLY: fill, text color, border, font-family,
// font-weight, border-radius, hover, the hover transition, and cursor. Padding
// and font-size are deliberately left to the caller: the design tables specify
// them differently for nearly every surface, so a primitive that fixed them
// would be overridden everywhere and hide drift rather than prevent it.
//
// Everything owned here is a Tailwind class, never an inline style. An inline
// style background outranks a hover: utility and silently kills the hover —
// the bug these primitives exist to make unrepresentable.

// The two cursor utilities are a pair. Disabling a button suppresses its click
// but not its cursor, so cursor-pointer alone leaves a dead button still
// showing a hand; disabled:cursor-default takes it back.
const BASE =
  "font-sans font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-default";

// Each hover is paired with a disabled: override for the same reason the cursor
// utilities are paired: :disabled suppresses the click but not :hover, so a
// disabled button would otherwise still light up under the pointer and read as
// interactive.
const PRIMARY =
  "bg-[color:var(--accent)] text-[color:var(--bg)] hover:bg-[color:var(--accent-hover)] " +
  "disabled:hover:bg-[color:var(--accent)]";

const GHOST =
  "bg-transparent text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] " +
  "hover:[border-color:var(--accent)] hover:[color:var(--accent-hover)] " +
  "disabled:hover:[border-color:var(--border-strong)] disabled:hover:[color:var(--fg)]";

// The same ghost contract with the outline already lit. Two empty-state CTAs are
// drawn this way (discovery's floor empty and the filtered empty's secondary
// pairing), and the resting accent outline is open item M-7 against Design. It
// is a variant rather than a call-site override because the border and text
// colour are two of the nine properties these primitives own: overriding them
// outside would leave GHOST's disabled: rules restoring --border-strong on a
// button whose resting border is --accent.
const GHOST_ACCENT =
  "bg-transparent text-[color:var(--accent)] [border:1px_solid_var(--accent)] " +
  "hover:[color:var(--accent-hover)] " +
  "disabled:hover:[border-color:var(--accent)] disabled:hover:[color:var(--accent)]";

type SharedProps = {
  className?: string;
  children: React.ReactNode;
};

// style is omitted deliberately: an inline style outranks the hover: utilities
// these primitives own, and the ESLint selector cannot see it here because it
// matches button/a/Link, not <PrimaryButton>. Omitting it moves that failure
// from a silent dead hover to a type error. Dynamic values belong in a
// Tailwind arbitrary value or a CSS custom property.
type ButtonProps = SharedProps &
  (
    | ({ href: React.ComponentPropsWithoutRef<typeof Link>["href"] } & Omit<
        React.ComponentPropsWithoutRef<typeof Link>,
        "href" | "className" | "style"
      >)
    | ({ href?: undefined } & Omit<
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        "className" | "style"
      >)
  );

function renderButton(variant: string, props: ButtonProps) {
  const { className, children, ...rest } = props;
  // Dropped at runtime as well as in the types: the type ban is erased at the
  // JS boundary, so an untyped caller could still smuggle one through a spread.
  delete (rest as { style?: unknown }).style;
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

  // Default to "button": these are CTAs, and a bare <button> submits the form
  // it sits in. A caller wanting a submit button passes type explicitly.
  return (
    <button type="button" className={classes} {...rest}>
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

export function AccentGhostButton(props: ButtonProps) {
  return renderButton(GHOST_ACCENT, props);
}
