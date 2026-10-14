# The 99 — Decks · reviewer notes (incorporated)

Feedback from review, and how it was addressed in this revision:

1. **Support standard card-type categories, not just role categories.**
   > The categories we have in place for "Ramp/Card draw/Removal" are fun/interesting, but we
   > also need to support the standard card type categories as an organization type:
   > "Creature/Instant/Sorcery/Artifact/Land/etc." This is an entrenched way of building decks
   > and we need to support it. This new method can be helpful, but we shouldn't completely
   > re-invent the wheel. Otherwise it's just cute and people won't like it.

   → Added a `Group: By type · By role` toggle over the decklist. **By type** (Creatures /
   Instants / Sorceries / Artifacts / Enchantments / Lands) is the **default**; **By role** is the
   alternate lens.

2. **Role numbers are subjective recommendations, and we must say why.**
   > These categories should be recommendations… If a user doesn't hit 8 removal cards or 37
   > lands, that's okay. We also need to support why we're providing these numbers; if we don't
   > have insights about the recommendations, it just feels made up.

   → Relabeled `rec N`; below-rec is styled **neutral, never alarm-amber**. A "Recommended mix ·
   a guide, not a gate" header names the source (EDHREC averages), every cell has a hover
   rationale, and a worked example is spelled out inline.

3. **Shopping list doesn't need to show price.**
   > Shopping list doesn't necessarily need to show price. We can just provide the copy option.
   > Showing prices can be another feature add later… if you want to leave it in designs, that's
   > okay, but make sure we call this out. Price visibility can get tricky/sticky.

   → Export copies **names only**. The reference figures are de-emphasized (muted `est.`, never
   amber) with an explicit callout that **pricing is a planned add**, not part of the export.

4. **Remove the "Nothing is committed until you add it" copy.**
   > This is obvious, we don't need to beat people over the head with messaging like this.

   → Removed from the builder-empty states.
