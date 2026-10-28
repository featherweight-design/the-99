# Gap report: small items 1 and 2 (Proposed cuts names more than the deck needs; the draft note on a phone)

Property table: `docs/superpowers/design-tables/small-items-cuts.md`, enumerated from the `Cuts-Alternatives` and `Draft-Note-Phone` boards and README §1–2.

## Verify (Agent 2)
- **New rows: all match.** These are the rows this branch adds or changes: the result block moved into `PickList`, its head, lead and headline, its foot, and the phone group note's placement, size and gap.
- **States: S1 to S10 are all reachable.** They are:
  - open, enough, over-cut;
  - fewer rows (between needed and over + 3, and under needed);
  - one over;
  - far over (20 named at most);
  - Undo after enough;
  - the draft on a phone and on desktop;
  - a group with no changes.

## Shipped values the board draws as stand-ins (left as shipped; errata for Design)
1. The CutsFrame is a block, not a flex column. There is no visible effect.
2. The suggestion tag's border is `--accent-dim`; the board has `color-mix(--accent 55%)`.
3. A long card name wraps; the board sets `nowrap`.
4. The group draft note's ink is `--accent-text`, the readable accent. The board draws `--accent`.
5. On desktop the group draft note sits at the right edge, as shipped. The board puts it after the count.
6. The phone group heading's bottom margin is 6px; the board has 4px.

Rows 4 and 5 sit on the group note, which this branch now draws on a phone (d9's ruling: match the 390 frame). Only its phone placement changes, and it follows the board there. Its ink and its desktop position stay as shipped.

## Eng rulings, recorded
- **Named cap 20** (README G2, about 20). Cuts gets its own constants (d9, option b):
  - `CUTS_MAX_TOKENS` 10,500, so that 20 × 440 / 0.85 = 10,353 fits;
  - `CUTS_MODEL_TIMEOUT_MS` 170s;
  - the deck page's `maxDuration` 180.

  Suggested changes keeps its 8,000 tokens and 110s. Sonnet 5.5's output rate on cuts is unmeasured; the 79 tok/s floor comes from Sonnet 5. Real latency is to be recorded from staging.
- **The needed cap also rises to 20.** Needed is min(over, 20) and spares are min(3, 20 − needed). A deck 18 or more over gets fewer than three spares.
- **`CUTS_PROMPT_VERSION` is 5.** Stored results reopen the gate.
- **Item 2.** README §2 says the group note already shows on a phone, but it shipped `hidden md:block`. Per d9's ruling the draft's group note now shows at every width, matching the 390 frame. The toolbar note keeps `hidden md:inline`. The README premise goes to Design as an erratum.

VERDICT: 0 new gaps.
