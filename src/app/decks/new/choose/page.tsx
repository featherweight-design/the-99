// /decks/new/choose: Help me choose (sub-project 8, PR 5b). One route, three moments, told apart
// by `v` (see `src/lib/intake/params.ts`):
//  - no `v`: the form, pre-filled from the URL (*Change answers* lands here; bare is *Start over*);
//  - `v=submit`: the form's submit. The words are matched once, here, and the page redirects to
//    the results address carrying the RESOLVED answers, so the results never match again;
//  - `v=results`: the results. The bar is drawn at once, and the search streams in under it.
//
// Behind `HELP_ME_CHOOSE_ENABLED` (F3): off, the route is not found, before any read.
import Link from "next/link";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { Suspense } from "react";

import { CardDetailProvider } from "../../../../components/cards/card-detail-provider";
import { ChooseResults, ResultsSkeleton } from "../../../../components/intake/choose-results";
import { IntakeForm } from "../../../../components/intake/intake-form";
import { ReadAsBar } from "../../../../components/intake/read-as-bar";
import { SearchFailed } from "../../../../components/intake/search-failed";
import { requireUserId } from "../../../../lib/auth";
import { helpMeChooseCopy as copy } from "../../../../lib/copy/help-me-choose";
import { helpMeChooseEnabled } from "../../../../lib/intake/flag";
import { answersOf, parseChooseParams, serializeChooseParams, type ChooseParams } from "../../../../lib/intake/params";
import { answerChips, readForThisAsk, verifiedDeeperMarks } from "../../../../lib/intake/present";
import { loadCardChip, loadResultsPage } from "../../../../lib/intake/rows";
import { loadIntakeCatalog, loadIntakeThemes } from "../../../../lib/intake/search";
import { CHOOSE_PATH, submitTarget } from "../../../../lib/intake/submit";
import { DeeperLook, DeeperLookScope, DimWhileLooking } from "../../../../components/intake/deeper-look";
import { loadOwnRead, wordsHash } from "../../../../lib/intake/run-store";
import { readAllowance } from "../../../../lib/model/allowance";

// A row's figures come from a real fill run in a Server Action posted from this page (PR 4's
// deeper read runs from it too).
export const maxDuration = 120;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function toSearchParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (first !== undefined) sp.set(k, first);
  }
  return sp;
}

export default async function ChoosePage({ searchParams }: { searchParams: SearchParams }) {
  if (!helpMeChooseEnabled()) notFound();
  const userId = await requireUserId();
  const sp = toSearchParams(await searchParams);
  const p = parseChooseParams(sp);

  if (sp.get("v") === "submit") {
    // Outside any try: `redirect` throws, and a catch would swallow it.
    const index = p.words.trim() ? (await loadIntakeCatalog()).index : null;
    redirect(submitTarget(p, index));
  }

  // The labels only: the card-name index is built for a submit, never for a page that just draws.
  // The form needs the vocabulary to draw its picker, and fails without it. The results only name
  // themes with it: a failed read there draws each theme by its slug rather than taking the page
  // down above the results' own recovery (*Search failed*, with Retry).
  const themes = p.results ? await loadIntakeThemes().catch(() => []) : await loadIntakeThemes();

  if (!p.results) {
    return (
      <div className="flex flex-col pb-[24px] md:px-[40px] md:pb-[48px]">
        <Header
          back={{ href: "/decks/new", label: copy.intake.back }}
          title={copy.intake.title}
          sub={copy.intake.sub}
          subPhone={copy.intake.subPhone}
          centered
        />
        <IntakeForm themes={themes} initial={p} />
      </div>
    );
  }

  const themeLabels = Object.fromEntries(themes.map((t) => [t.slug, t.label]));
  // A decoration, read outside the results' own recovery: a failure here draws the page without the
  // card's chip rather than taking the whole route down before *Search failed* could offer a retry.
  const now = new Date();
  // Three decorations, none of which may take the page down: the card's chip, the credit standing
  // the deeper look reads (only when there are words to look at), and the read `r` names.
  const [card, allowance, loaded] = await Promise.all([
    p.card ? loadCardChip(userId, p.card).catch(() => null) : null,
    p.words.trim() ? readAllowance(userId, now, "intake").catch(() => null) : null,
    p.readId ? loadOwnRead(p.readId, userId).catch(() => null) : null,
  ]);
  const settled = readForThisAsk(p, loaded, wordsHash);
  const labels = { theme: (slug: string) => themeLabels[slug] ?? slug, card: card?.name ?? null };
  // A change of answers is a new ask: it carries neither the read nor its marks.
  const changeHref = `${CHOOSE_PATH}${serializeChooseParams({ ...p, notUsed: [], readId: null, deeper: [], results: false })}`;
  const queryString = serializeChooseParams(p).slice(1);
  const ranking = [...p.themes.map(labels.theme), ...(card ? [card.name] : [])];
  const by =
    ranking.length === 0 ? copy.results.loadingBy.owned : ranking.length === 1 ? ranking[0] : copy.results.loadingBy.all;

  return (
    <CardDetailProvider>
      <div className="flex flex-col">
        <Header
          back={{ href: changeHref, label: copy.results.back }}
          title={copy.results.title}
          sub={copy.results.sub}
          subPhone={copy.results.subPhone}
        />
        <div className="flex flex-col gap-[14px] md:gap-[18px] w-full max-w-[1160px] p-[16px_18px_24px] md:p-[0_40px_48px]">
          <DeeperLookScope>
          <ReadAsBar
            chips={answerChips(p, labels, verifiedDeeperMarks(p, settled))}
            afterDeeper={settled !== null}
            offer={allowance && (
              // Keyed on the read: the look's own results are a new panel, drawn from what the page found.
              <DeeperLook key={p.readId ?? "first"} params={p} settled={settled?.kind ?? null} standing={{
                used: allowance.used,
                limit: allowance.limit,
                nextAt: allowance.nextAt?.toISOString() ?? null,
                reopensAt: allowance.reopensAt?.toISOString() ?? null,
                paused: allowance.paused?.until.toISOString() ?? null,
                ownerShare: allowance.ownerShare === true,
                now: now.toISOString(),
              }} />
            )}
            card={card}
            notUsed={p.notUsed}
            changeHref={changeHref}
            startOverHref={CHOOSE_PATH}
          />
          <DimWhileLooking>
          <Suspense key={queryString} fallback={<ResultsSkeleton by={by} />}>
            <Results
              userId={userId}
              params={p}
              themeLabels={themeLabels}
              cardName={card?.name ?? null}
              queryString={queryString}
              changeHref={changeHref}
            />
          </Suspense>
          </DimWhileLooking>
          </DeeperLookScope>
        </div>
      </div>
    </CardDetailProvider>
  );
}

/** The search, streamed under the bar. A failure is the search-failed state, never the error page. */
async function Results({
  userId,
  params,
  themeLabels,
  cardName,
  queryString,
  changeHref,
}: {
  userId: string;
  params: ChooseParams;
  themeLabels: Record<string, string>;
  cardName: string | null;
  queryString: string;
  changeHref: string;
}) {
  let page;
  try {
    page = await loadResultsPage(userId, answersOf(params));
  } catch (error) {
    // Next's own control flow (a bailout, a redirect) passes through untouched.
    unstable_rethrow(error);
    console.error("help me choose: search failed", error);
    return <SearchFailed changeHref={changeHref} />;
  }
  return (
    <ChooseResults
      page={page}
      params={params}
      themeLabels={themeLabels}
      cardName={cardName}
      queryString={queryString}
      changeHref={changeHref}
    />
  );
}

function Header({
  back,
  title,
  sub,
  subPhone,
  centered = false,
}: {
  back: { href: string; label: string };
  title: string;
  sub: string;
  subPhone: string;
  centered?: boolean;
}) {
  return (
    <header
      className={[
        "flex flex-col gap-[3px] md:gap-[6px] p-[20px_18px_14px] border-0 border-b border-solid border-[color:var(--border)] md:border-b-0",
        centered ? "md:w-[680px] md:max-w-full md:mx-auto md:p-[34px_0_26px]" : "md:p-[34px_40px_26px]",
      ].join(" ")}
    >
      <Link href={back.href} className="self-start font-mono text-[11px] text-[color:var(--fg-faint)] no-underline">
        {back.label}
      </Link>
      <h1 className="m-0 font-display font-bold text-[20px] md:text-[28px] text-[color:var(--fg)]">{title}</h1>
      <p className="m-0 md:hidden font-mono text-[10px] text-[color:var(--fg-faint)]">{subPhone}</p>
      <p className="m-0 hidden md:block max-w-[640px] text-[14px] text-[color:var(--fg-muted)]">{sub}</p>
    </header>
  );
}
