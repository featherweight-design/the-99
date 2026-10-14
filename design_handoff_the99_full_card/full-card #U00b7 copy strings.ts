// src/lib/copy/commanders.ts — amendment 4, commanders detail "Full card".
//
// Shape follows the shipped file: flat const object, no JSX. This amendment is
// one replacement and four deletions; it adds no new sentence to the product.
// Voice: Kitchen Table — but there is nothing expressive here, because the only
// live string is a control label and a control label's job is its destination.
//
// Existing strings this block does NOT touch:
//   cardDetailCopy.triggerAria(name)  'View details for {name}'  — the trigger
//                                     now falls back to it instead of carrying
//                                     its own label
//   cardDetailCopy.loading            'Loading card details…'    — reaches this
//                                     route for free with the fetch
//   cardDetailCopy.unavailable        'Card details are unavailable.'
//   printingPickerCopy.printing.*     the picker trigger and region
//   availabilityCopy.collection.*     the availability block
//   'Close card details'              the modal's own close button, both widths

export const fullCardCopy = {
  // The affordance on the commander detail art header, phone only.
  //
  // REPLACES: full-card-trigger.tsx  'Full card'
  //
  // The control now opens the shared card-details modal, so it names that
  // surface. Two words, because on a page that is already three breakdown
  // sections and forty named cards, 'Details' does not say whose. And it is the
  // app's own phrase — the close button on the thing it opens reads
  // 'Close card details'.
  //
  // The ⛶ glyph is unchanged: it is the app's 'open this bigger' mark, not a
  // promise about pixels, and it is what makes the chip findable on art.
  triggerLabel: "Card details",
} as const;

// ── DELETED ────────────────────────────────────────────────────────────
//
// All four go with the file or the prop. None is reworded, because none has a
// surface left to describe.
//
//   DELETE  full-card-trigger.tsx   aria-label 'View full card'
//           → falls back to cardDetailCopy.triggerAria(name), so the commander
//             stops being the one trigger on the page with its own accessible
//             name. This is a deletion, not a replacement: the attribute goes.
//
//   DELETE  lightbox.tsx  'Full card'
//           The mono caption centred over the overlay. The dialog's accessible
//           name now comes from the card-name heading, and the surface labels
//           itself with that name at 22px.
//
//   DELETE  lightbox.tsx  aria-label `Full card — ${c.name}`
//           → the modal's shipped aria-labelledby="card-modal-title".
//
//   DELETE  lightbox.tsx  aria-label 'Close full card view'
//           → the modal's shipped 'Close card details'.
//
//   DELETE  lightbox.tsx  'Tap anywhere to close'
//           The gesture survives on the backdrop; the sentence does not. At
//           390px the modal is a full-screen sheet, so there is no visible
//           backdrop for the sentence to be about, and the 32px ✕ at the top
//           right is where a sheet's close control belongs. README decision 4.
//
// ── NOT ADDED, deliberately ────────────────────────────────────────────
//
//   No 'view art larger' string. The art is 82px smaller than it was and
//   nothing replaces the poster gesture (README gap 4). If that turns out to
//   matter, the answer is a zoom on the modal's own art, in cards/, for every
//   card — not a second surface for one.
//
//   No desktop affordance label. The desktop art panel becomes a trigger with
//   the shared accessible name and no visible chip, matching what
//   builder-spine.tsx already does with the commander thumb. A chip over a
//   320px art panel beside a primary 'Build this deck' would be a third
//   competing target.
//
//   No 'Add to deck' label. The modal must not assume a deck on this route —
//   the constraint the recommendations and synergy handoffs both carried.
