import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { recommendCommanders } from "../../../lib/recs/recommend";
import { CommanderDetail } from "../../../components/commanders/detail";

export default async function CommanderDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const userId = await requireUserId();
  const { results } = await recommendCommanders(userId);

  const rankIndex = results.findIndex((r) => r.slug === slug);
  if (rankIndex === -1) notFound();

  const commander = results[rankIndex];
  const rank = rankIndex + 1;
  const isBestFit = rank === 1;

  return (
    <CommanderDetail
      commander={commander}
      rank={rank}
      isBestFit={isBestFit}
    />
  );
}
