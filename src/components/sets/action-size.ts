// The size every action on the set pages takes: the filter sheet's own primary ("Show N"),
// which is the one action on these pages that was drawn with a size. The button primitives
// own colour, weight and radius family only and leave size to the caller, so an action that
// passed nothing rendered as bare text in a border (Hugh, 2026-10-05). 44px is the phone
// target floor, held at both widths as the sheet's primary holds it.
export const SET_ACTION =
  "inline-flex items-center justify-center min-h-[44px] rounded-[8px] px-[16px] text-[13px]";
