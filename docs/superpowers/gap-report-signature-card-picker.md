# Gap report: signature card picker (PR 2 of `2026-10-27-signature-card.md`)

Table: `docs/superpowers/design-tables/signature-card-picker.md`. Handoff: `design/design_handoff_the99_avatar/Picker.dc.html`, P1–P8 and D1–D2.

## Verify pass

- Visual: 69 of 70 rows match.
- States: all 8 are reachable (P1 to P8), each traced from the read, through the action, to the component branch.

## Gaps

1. **The back ‹ on screen 2 is 36 wide at desktop, not 44.** This is a table error, not a code gap. The ‹ is the shipped `SocialModal` back (`social-modal.tsx`), unchanged and shared with Add a friend's chooser. The enumeration took its size from the phone frame, and the row now reads 44×44 at phone and 36×44 at desktop. No code change.

## Notes

- **P8 is reached only through the printings screen**, which opens from a search hit with more than one printing. A deck tile saves on press. That matches the README: only the picker tells, on that card's printing screen.
- **The usual art tile and preview carry the set code of the printing the usual art comes from** ("Usual art · STA"), when one matches the card's image. When none matches, they read "Usual art" alone.
- **The walk was photographed on a scratch branch whose printings' art crops were backfilled from `image_uri`.** Local-dev's catalog carries 8 crops across 102,902 printings; staging carries 103,953 of 103,956.

VERDICT: 0 gaps remain.
