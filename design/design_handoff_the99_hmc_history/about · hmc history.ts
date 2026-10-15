// Two ORDINARY EDITS to src/lib/copy/about.ts. No ABOUT_VERSION bump; both re-pin the content hash.

// 1. id: 'help-me-choose' (since: 9, switch HELP_ME_CHOOSE_ENABLED). The caption's third paragraph gains one sentence.
//    Keys unchanged (four already).
export const helpMeChooseCaptionParagraph3 =
  "Pick a commander and your answers carry over to a new deck, ready to fill from your Collection. Every run that reads your words is kept under History, and opening one again is free.";

// 2. id: 'credits'. A caption line after "Determining your deck’s bracket is free.", switched like the bullet that
//    names Help me choose:
export const creditsCaptionLine = "Opening a past “Help me choose” run from History is free.";
export const creditsCaptionLineSwitch = {
  "Opening a past “Help me choose” run from History is free.": "HELP_ME_CHOOSE_ENABLED",
} as const;
