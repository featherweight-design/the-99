// /decks/new/choose: Help me choose's old address. It redirects to /commanders/choose (query kept).
import { redirect } from "next/navigation";
import { pathWithQuery } from "../../../../lib/commanders/place-redirect";

export default async function LegacyChoosePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(pathWithQuery("/commanders/choose", await searchParams));
}
