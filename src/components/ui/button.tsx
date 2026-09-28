import Link from "next/link";
import { twMerge } from "tailwind-merge";

import { PendingTrack } from "../shell/pending-track";

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
// Bone, not accent: accent means "in use / to buy" everywhere else in the app,
// so a filled CTA wearing it claims a status it does not have. --fg-body is the
// hover because it is the only token that is a step off bone in the same family
// across all six themes; --accent-hover would put accent back by the side door.
// Exported because two call sites cannot use PrimaryButton itself: they render a
// Link through SelectableBuildButton, which builds its own href from the
// selection. Sharing the string keeps one definition of the bone fill rather
// than a second one that drifts.
export const PRIMARY =
  "bg-[color:var(--fg)] text-[color:var(--bg)] hover:bg-[color:var(--fg-body)] " +
  "disabled:hover:bg-[color:var(--fg)]";

const GHOST =
  "bg-transparent text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] " +
  "hover:[border-color:var(--accent)] hover:[color:var(--accent-hover)] " +
  "disabled:hover:[border-color:var(--border-strong)] disabled:hover:[color:var(--fg)]";

// The refresh's conformance geometry: "a 32px hairline pill (--border-strong,
// 12.5px label, 14px side padding)". Prefixed at sm: because the figure is a
// desktop figure — below it every control that takes this is at its touch
// height, and 32px would put it under the target floor.
//
// A class string rather than a variant: its callers are not all GhostButton.
// Two are hand-rolled buttons with a menu contract and one is a field
// container, and pulling three unrelated components through one primitive to
// share three utilities would cost more than it saves.
export const HAIRLINE = "sm:h-[32px] sm:px-[14px] sm:text-[12.5px]";

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

// Each variant's hover, restated for a pending link, which is not under the pointer on a phone
// and may have left it on a desktop. Ghost takes the canvas's pending fill rather than its accent
// hover, because accent is status (audit correction 1).
const PENDING: Record<string, string> = {
  [PRIMARY]: "has-[[data-pending]]:bg-[color:var(--fg-body)]",
  // Stated twice so pending also beats the accent hover when the pointer is still on the link:
  // `has-` and `hover:` are equally specific, and stylesheet order would otherwise decide.
  [GHOST]:
    "has-[[data-pending]]:bg-[color:var(--elevated-hover)] has-[[data-pending]]:[border-color:var(--border-strong)] " +
    "has-[[data-pending]]:[color:var(--fg)] hover:has-[[data-pending]]:[border-color:var(--border-strong)] " +
    "hover:has-[[data-pending]]:[color:var(--fg)]",
};

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
    // A pending link holds its hover state under the track (navigation-pending handoff, P2), so
    // the press reads as taken while the next page loads. `relative overflow-hidden` holds the
    // track inside the border box.
    const pendingClasses = twMerge(classes, "relative overflow-hidden", PENDING[variant]);
    return (
      <Link href={href} className={pendingClasses} {...linkProps}>
        {children}
        <PendingTrack href={typeof href === "string" ? href : (href.pathname ?? "?")} />
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
