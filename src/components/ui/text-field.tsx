import { useRef } from "react";
import { twMerge } from "tailwind-merge";
import { searchFieldCopy } from "../../lib/copy/search-field";
import { SearchIcon } from "./search-icon";

// Shared text-entry primitives, sibling to button.tsx.
//
// These exist for one bug: every input in the app hand-rolled
// `focus-visible:ring-2` with a pasted accent hex, which has no offset and
// so draws the accent indicator INSIDE the field's own border. globals.css
// already ships `:focus-visible { outline: 2px solid var(--accent);
// outline-offset: 2px }` — outside, where it belongs. The primitives' job is to
// stop re-implementing it.
//
// As with the button primitives, everything owned here is a Tailwind class.
// Padding and font-size stay with the caller: the design tables specify them
// differently per surface.

// The border is three longhand utilities, not a `[border:…]` shorthand: a
// caller passing `border-[color:…]` has to be able to win, and twMerge can only
// drop a class it recognizes as the same property. Against the shorthand the
// caller's color was silently reset — several fields lost their specified
// border that way.
/**
 * An input drawn inside a bordered field (a `$` prefix, a magnifier, a stepper) shows focus on the FIELD,
 * not on itself: the input is only part of what looks focused, and its own ring would sit inside the
 * border. These two halves are the one definition (Hugh, 2026-10-12: Suggested changes' "Most per card"
 * had lost it); `wrapped-input-focus.test.ts` fails any input that suppresses its own outline without them.
 *
 * `AFFIX_FOCUS` goes on a wrapper whose focusable content is the input (and, for `SearchField`, a trailing
 * clear button: a press there is the field still in use). `AFFIX_FOCUS_INPUT` goes on a wrapper that also
 * holds controls with rings of their own (a stepper's buttons), so only the input's focus lights it.
 */
export const AFFIX_FOCUS =
  "focus-within:border-[color:var(--accent)] focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_16%,transparent)]";
export const AFFIX_FOCUS_INPUT =
  "has-[input:focus-visible]:border-[color:var(--accent)] has-[input:focus-visible]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_16%,transparent)]";
/** The inner input's half: no ring, border or shadow of its own. */
export const AFFIX_INPUT = "bg-transparent border-none outline-none shadow-none focus:outline-none focus-visible:outline-none";

const FIELD_CHROME =
  "rounded-lg bg-[color:var(--surface-sunken)] " +
  "border border-solid border-[color:var(--border-strong)] text-[color:var(--fg)] " +
  "placeholder:text-[color:var(--fg-faint)] caret-[color:var(--accent)]";

// Dropped at runtime as well as in the types, exactly as button.tsx does it:
// the type ban is erased at the JS boundary, so an untyped caller could still
// smuggle a background or border through a spread and outrank the chrome.
function dropStyle(rest: object) {
  delete (rest as { style?: unknown }).style;
}

// ComponentPropsWithRef, not InputHTMLAttributes: React 19 passes ref as an
// ordinary prop, and several callers focus the field imperatively.
type TextFieldProps = Omit<React.ComponentPropsWithRef<"input">, "style">;

/**
 * A standalone labelled input. Focus is the global accent outline — do not add
 * a ring utility, and do not pass an inline background/border (it would outrank
 * the chrome classes the same way it does on the buttons).
 */
export function TextField({ className, type = "text", ...rest }: TextFieldProps) {
  dropStyle(rest);
  return <input type={type} className={twMerge(FIELD_CHROME, className)} {...rest} />;
}

type SearchFieldProps = TextFieldProps & {
  /** Rendered after the input inside the box — clear buttons, result counts. */
  trailing?: React.ReactNode;
  containerClassName?: string;
  /**
   * Replaces the leading magnifier outright. The commanders filter bar captions its
   * field `FIND` instead, mirroring the `COLORS` caption beside it — a magnifier
   * there would be a second vocabulary in a row that already has one.
   */
  leading?: React.ReactNode;
  /**
   * The field's ONE clear control. Given, a ✕ sits inside the box, always mounted and merely hidden while
   * the field is empty, so it never reflows the input. One press clears: the press is kept from taking focus
   * off the input (Safari blurs on a button tap, and a blur can move the ✕ out from under the finger before
   * the click lands), then focus goes back to the field. The caller owns the value, so it owns the clear.
   */
  onClear?: () => void;
  /** The ✕'s accessible name, when "Clear search" is not specific enough. */
  clearLabel?: string;
};

/**
 * Icon + input + optional trailing slot sharing one box. The focus indicator
 * belongs to the container via focus-within, because the input is only part of
 * the thing that looks focused; the inner input therefore has to suppress its
 * own outline or two indicators stack.
 *
 * The container is a label so that the icon and the padding are click targets
 * for the input, not dead chrome. A button in `trailing` still works: label
 * activation is suppressed when the click lands on an interactive descendant,
 * and callers pass an explicit aria-label, which outranks the label's text.
 */
export function SearchField({
  className,
  containerClassName,
  leading,
  trailing,
  onClear,
  clearLabel = searchFieldCopy.clear,
  type = "search",
  ref: callerRef,
  ...rest
}: SearchFieldProps) {
  dropStyle(rest);
  const input = useRef<HTMLInputElement | null>(null);
  // Hidden by value, not by the caller: an uncontrolled field has no value to read and gets no ✕.
  // Blank text (spaces only) reads as an empty box, so it earns no ✕ either.
  const filled = typeof rest.value === "string" && rest.value.trim() !== "";
  return (
    <label
      // A styling hook only — lets a page target "this field or its own trailing
      // control" (`:focus-within`) without reaching the input alone, which misses
      // a trailing button taking focus on the way to a click.
      data-search-field
      className={twMerge(
        FIELD_CHROME,
        `flex items-center gap-[10px] px-[12px] ${AFFIX_FOCUS}`,
        containerClassName,
      )}
    >
      {/* `undefined` is the absent prop; `null` is a caller asking for no leading
          element at all, which `??` would have overruled with the magnifier. */}
      {leading === undefined ? (
        <SearchIcon className="shrink-0 text-[color:var(--fg-faint)]" />
      ) : (
        leading
      )}
      <input
        type={type}
        className={twMerge(
          `min-w-0 flex-1 ${AFFIX_INPUT} ` +
            // WebKit draws its own cancel ✕ on type="search", in its own blue,
            // beside whatever the caller passes as `trailing` — two adjacent
            // glyphs doing one job, one of them off-palette.
            "[&::-webkit-search-cancel-button]:appearance-none " +
            "text-[color:var(--fg)] placeholder:text-[color:var(--fg-faint)]",
          className,
        )}
        ref={(el) => {
          input.current = el;
          if (typeof callerRef === "function") callerRef(el);
          else if (callerRef) callerRef.current = el;
        }}
        {...rest}
      />
      {onClear && (
        <button
          type="button"
          aria-label={clearLabel}
          // Out of the tab order and the accessibility tree while there is nothing to clear.
          tabIndex={filled ? 0 : -1}
          aria-hidden={filled ? undefined : true}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onClear();
            input.current?.focus();
          }}
          // `visibility` rather than unmounting, so the box is held and the input never reflows.
          style={{ visibility: filled ? "visible" : "hidden" }}
          className="flex h-[24px] w-[24px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[color:var(--border)] p-0 text-[12px] leading-none text-[color:var(--fg-faint)]"
        >
          ✕
        </button>
      )}
      {trailing}
    </label>
  );
}
