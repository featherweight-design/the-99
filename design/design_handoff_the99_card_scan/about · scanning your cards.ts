// about · scanning your cards.ts. R1. Intent only: words go through /copy-review.
// Target: src/lib/copy/about.ts. One new entry (chapter 01, after `collection-add`), and ABOUT_VERSION bumped at
// launch: 15, or 16 if no-collection's entry already took 15 (G8).

export const scanningYourCards = {
  id: 'card-scan',
  switch: 'CARD_SCAN_ENABLED', // needs COLLECTION_EDIT_ENABLED
  chapter: '01',
  after: 'collection-add',
  title: 'Scanning your cards',
  route: '/collection',
  opens: 'opens Add cards',
  width: 'plate',
  // Specimen: the sure panel (card, name, type, "Add to the list") from cardScanCopy.view at render, beside the
  // batch stack. Phone reduction: the stack drops; the panel and all four keys stay.
  caption:
    'Have a stack of cards in front of you? Press “Add cards”, then “Scan”, and hold each card up to your camera. We suggest which card it is, and one press puts it on the list.\n\nWhen we’re not sure, you get the three closest to pick from. Then check the list, fix anything we got wrong, and one Save adds the lot.',
  keys: [
    'Fast gives each card its first printing. Normal has you choose each printing on the list.',
    'The first scan downloads a card index of about 27 MB, once. After that it works offline.',
    'A card that stays in view is never added twice. A second copy takes its own press.',
    'Press a scanned card’s name on the list to swap it for one of the closest matches.',
  ],
  marksPending: true,
  since: 15, // or 16, G8
} as const;
