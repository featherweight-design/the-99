// Five AboutEntry objects for src/lib/copy/about.ts, chapter 01. Ship with the epic's one bump (11 → 12).
// AboutSwitch gains 'COLLECTION_EDIT_ENABLED'. Specimen strings come from copy/collection-edit.ts at render time.

import type { AboutEntry } from '../../src/lib/copy/about';

// Insert after 'browse'.
export const collectionAdd: AboutEntry = {
  id: 'collection-add',
  switch: 'COLLECTION_EDIT_ENABLED',
  chapter: '01',
  title: 'Adding cards by hand',
  route: '/collection',
  opens: 'opens Add cards',
  width: 'plate',
  caption:
    "Opened a pack and don't feel like exporting? Press “Add cards” and search by name, for any card, not just ones you own. Pick the printing, mark it foil, set how many, and keep going. One Save adds the lot.\n\nNo collection yet? You can start here instead of with a file.",
  keys: [
    'Each line is one printing and finish, so a foil and a nonfoil are two lines.',
    'You choose the printing before a card goes on the list.',
    'A card you already own shows how many you’ll have after.',
    'Nothing is saved until you press Save, and the save shows in History as one change.',
  ],
  since: 12,
};

// Insert after 'import'.
export const uploadChoice: AboutEntry = {
  id: 'upload-choice',
  switch: 'COLLECTION_EDIT_ENABLED',
  chapter: '01',
  title: 'Replacing or adding from a file',
  route: '/collection/replace',
  opens: 'opens the upload',
  width: 'plate',
  caption:
    'Got a new export? When you upload a file, The 99 asks what it’s for. “Replace” makes your Collection exactly the file. “Add” puts its cards on top of what you have, which is right for a booster haul or a trade binder.\n\nBefore anything changes, you see every card that moves. Replace also warns you if it’ll overwrite changes you made in the app, and names any decks that will read short.',
  keys: [
    'Replace: anything not in the file leaves your Collection.',
    'Add: quantities go up, nothing leaves, and your art picks stay.',
    'Adding a full export doubles your copies, and the screen tells you when that’s about to happen.',
    'Your very first upload skips the question, since there’s nothing to replace.',
  ],
  since: 12,
};

// Insert after 'card-detail'.
export const editCopies: AboutEntry = {
  id: 'edit-copies',
  switch: 'COLLECTION_EDIT_ENABLED',
  chapter: '01',
  title: 'Changing how many you own',
  route: '/collection',
  opens: 'opens the card detail',
  width: 'plate',
  caption:
    'Sold a copy, or logged the wrong printing? Open the card and press “Edit copies”. Each printing and finish you own is a line with its own count. If one’s under the wrong printing, tap it and pick the right one.\n\nIt’s separate from picking the art. The printings grid still only chooses which art your Collection shows.',
  keys: [
    'Adding copies saves right away.',
    'Taking copies away checks your decks first, and names any that would come up short.',
    'Changing a line’s printing doesn’t change your total, so it never leaves a deck short.',
    '“Add another printing” asks which printing before it adds anything.',
  ],
  since: 12,
};

// Insert after 'edit-copies'.
export const removeCard: AboutEntry = {
  id: 'remove-card',
  switch: 'COLLECTION_EDIT_ENABLED',
  chapter: '01',
  title: 'Removing a card from your Collection',
  route: '/collection',
  width: 'plate',
  caption:
    'Traded it away? Open the card, press “Edit copies”, then “Remove from collection”. That takes every copy of every printing.\n\nIf a committed deck runs it, you’ll see which decks will come up short before anything changes. The deck is left alone. It just shows the card as short and puts it on its shopping list.',
  keys: [
    'To take away only some copies, lower their line instead.',
    'Right after, “Undo” puts it all back. So does History, later.',
    'Nothing about a deck changes on its own.',
  ],
  since: 12,
};

// Last in chapter 01.
export const collectionHistory: AboutEntry = {
  id: 'collection-history',
  switch: 'COLLECTION_EDIT_ENABLED',
  chapter: '01',
  title: 'Undoing a change to your Collection',
  route: '/collection/history',
  width: 'plate',
  caption:
    'Every upload, add, edit and removal from the last 90 days is in History, newest first. Press “Revert” on any of them to undo it.\n\nA revert works on your Collection as it is today. If you’ve sold two of the three copies an add brought in, reverting it takes away the one that’s left. A revert is a change of its own, so you can revert that too, in case you change your mind about changing your mind.',
  keys: [
    'Open a change to see every card it moved.',
    'Reverting a Replace puts back every card that upload moved.',
    'A reverted change stays in the list, marked and linked to its revert.',
    'Changes older than 90 days age out. Your cards don’t.',
  ],
  since: 12,
};

// The shipped 'import' entry: its last caption line goes false with the switch on (README open 1).
// Requires a negated switch key in visible.ts.
export const importCaptionLineSwitches = {
  // Matched as the caption line appears literally (no paragraph breaks), as the existing keys are.
  "Heads up: an import replaces your whole Collection, it doesn't add to it.": '!COLLECTION_EDIT_ENABLED',
  'Already have a Collection here? The 99 asks whether the file replaces it or adds to it.': 'COLLECTION_EDIT_ENABLED',
} as const;
