/**
 * The dim applied to a control waiting on a request — "your press registered,
 * the answer is still coming".
 *
 * The value is the one `FullCardTrigger` already shipped for its chip while the
 * card modal fetches, lifted here so every control that means it reads from one
 * place rather than four literals that drift.
 *
 * It sits in its own module rather than beside the nav hooks that introduced it:
 * `list-nav.ts` imports `next/navigation` and `useTransition`, and a component
 * that needs nothing but the number should not pull a router in to get it.
 *
 * Never paired with `disabled`, for FullCardTrigger's reason: disabling the
 * focused element blurs it, and the reader loses their place mid-flip.
 */
export const PENDING_OPACITY = 0.55;

/**
 * The same dim as a Tailwind utility, for the callers that cannot take a style:
 * the CTA primitives drop `style` on purpose, since an inline background there
 * would silently outrank their hover. Tailwind resolves arbitrary values at
 * build time and cannot read the constant above, so the number appears twice —
 * change both together.
 */
export const PENDING_OPACITY_CLASS = "opacity-[0.55]";
