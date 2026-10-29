// The rankers' empty state at zero cards, `/commanders` and `/discover` alike: nothing can be ranked without a
// collection to rank against. One button, to /collection, where every way in is (no-collection entry, Open 7).
// The words are the page's own copy key (`commandersCopy.noCards`, `discoveryCopy.noCards`), its `on` form with
// COLLECTION_EDIT_ENABLED and its `off` form, the shipped words, without it; the link is /collection either way.

import { CardFan } from "../marks";
import { PrimaryButton } from "../ui/button";
import { EmptyState, EmptyStateBody, EmptyStateTitle } from "../ui/empty-state";

export function NoCardsEmpty({ copy }: { copy: { title: string; body: string; button: string } }) {
  return (
    <EmptyState>
      {/* Card-fan mark: same construction as collection empty state */}
      <CardFan variant="mobile" className="mb-[22px] sm:hidden" />
      <CardFan variant="desktop" className="mb-[26px] hidden sm:block" />

      <EmptyStateTitle className="text-[28px]">{copy.title}</EmptyStateTitle>

      <EmptyStateBody className="mt-3 max-w-[420px] text-[16px]">{copy.body}</EmptyStateBody>

      <PrimaryButton href="/collection" className="mt-6 px-[24px] py-[12px] text-[14px]">
        {copy.button}
      </PrimaryButton>
    </EmptyState>
  );
}
