// /decks/new/choose: Help me choose's old address. With `COMMANDERS_PLACE_ENABLED` on it redirects to
// /commanders/choose (query kept); off, it answers in place as it shipped.
import { redirect } from "next/navigation";
import { placeRedirect } from "../../../../lib/commanders/place-redirect";
import ChoosePage from "../../../commanders/(list)/choose/page";

// A row's figures come from a real fill run in a Server Action posted from this page.
export const maxDuration = 120;

export default async function LegacyChoosePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const target = await placeRedirect("/commanders/choose", await searchParams);
  if (target) redirect(target);
  return <ChoosePage searchParams={searchParams} />;
}
