// /decks/new/choose: Help me choose (sub-project 8, PR 5b). One route, three moments, told apart
// by `v` (see `src/lib/intake/params.ts`):
//  - no `v`: the form, pre-filled from the URL (*Change answers* lands here; bare is *Start over*);
//  - `v=submit`: the form's submit. The words are matched once, here, and the page redirects to
//    the results address carrying the RESOLVED answers, so the results never match again;
//  - `v=results`: the results. The bar is drawn at once, and the search streams in under it.
//
// Behind `HELP_ME_CHOOSE_ENABLED` (F3): off, the route is not found, before any read.
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { Suspense } from "react";

import { CardDetailProvider } from "../../../../components/cards/card-detail-provider";
import { ChooseResults, ResultsSkeleton } from "../../../../components/intake/choose-results";
import { ChooseHeader, RESULTS_COLUMN } from "../../../../components/intake/choose-header";
import { IntakeForm } from "../../../../components/intake/intake-form";
import { ReadAsBar } from "../../../../components/intake/read-as-bar";
import { SearchFailed } from "../../../../components/intake/search-failed";
import { requireUserId } from "../../../../lib/auth";
import { helpMeChooseCopy as copy } from "../../../../lib/copy/help-me-choose";
import { helpMeChooseEnabled } from "../../../../lib/intake/flag";
import { answersOf, parseChooseParams, serializeChooseParams, type ChooseParams } from "../../../../lib/intake/params";
import { answerChips, readForThisAsk, verifiedDeeperMarks } from "../../../../lib/intake/present";
import { isAnyOf } from "../../../../lib/intake/rank";
import { buysCard } from "../../../../lib/intake/buys-card";
import { loadCardChip, loadResultsPage } from "../../../../lib/intake/rows";
import { loadIntakeCatalog, loadIntakeThemes } from "../../../../lib/intake/search";
import { loadCommanderPrintings } from "../../../../lib/sets/printed-in-read";
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
  // The Sets answer's list, and its names on the results: a decoration either way, so a failed
  // read draws codes rather than taking the page down.
  const sets = await loadCommanderPrintings().then((x) => x.sets).catch(() => []);

  if (!p.results) {
    return (
      <div className="flex flex-col pb-[24px] md:px-[40px] md:pb-[48px]">
        <ChooseHeader
          back={{ href: "/decks/new", label: copy.intake.back }}
          title={copy.intake.title}
          sub={copy.intake.sub}
          subPhone={copy.intake.subPhone}
          centered
        />
        <IntakeForm themes={themes} sets={sets} initial={p} />
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
    // `undefined` when the read failed, which says nothing about the card; `null` when it is no card.
    p.card ? loadCardChip(userId, p.card).catch(() => undefined) : null,
    p.words.trim() ? readAllowance(userId, now, "intake").catch(() => null) : null,
    p.readId ? loadOwnRead(p.readId, userId).catch(() => null) : null,
  ]);
  const settled = readForThisAsk(p, loaded, wordsHash);
  const setNames = new Map(sets.map((s) => [s.code, s.name]));
  const labels = {
    theme: (slug: string) => themeLabels[slug] ?? slug,
    card: card?.name ?? null,
    set: (code: string) => setNames.get(code) ?? code.toUpperCase(),
  };
  // A carried `a` the search could not apply (stale, or hand-edited) is no answer: the look sees
  // the answers the search ran on, so a card its read finds is not set aside for it.
  const lookParams = card === null && p.card !== null ? { ...p, card: null } : p;
  // A change of answers is a new ask: it carries neither the read nor its marks.
  const changeHref = `${CHOOSE_PATH}${serializeChooseParams({ ...p, notUsed: [], readId: null, deeper: [], results: false })}`;
  const queryString = serializeChooseParams(p).slice(1);
  const ranking = [...p.themes.map(labels.theme), ...(card ? [card.name] : [])];
  // Said as the order line will say it: any of with no card ranks by the best-fitting theme.
  const by = isAnyOf(p) && !card
    ? copy.results.loadingBy.bestTheme
    : ranking.length === 0 ? copy.results.loadingBy.owned : ranking.length === 1 ? ranking[0] : copy.results.loadingBy.all;

  return (
    <CardDetailProvider>
      <div className="flex flex-col">
        <ChooseHeader
          back={{ href: changeHref, label: copy.results.back }}
          title={copy.results.title}
          sub={copy.results.sub}
          subPhone={copy.results.subPhone}
        />
        <div className={RESULTS_COLUMN}>
          <DeeperLookScope>
          <ReadAsBar
            chips={answerChips(p, labels, verifiedDeeperMarks(p, settled))}
            afterDeeper={settled !== null}
            offer={(allowance || settled) && (
              // Keyed on the read: the look's own results are a new panel, drawn from what the page found.
              // A failed standing read closes only the press: a look already settled at `r` still draws.
              <DeeperLook key={p.readId ?? "first"} params={lookParams} settled={settled?.kind ?? null} standing={allowance && {
                used: allowance.used,
                limit: allowance.limit,
                nextAt: allowance.nextAt?.toISOString() ?? null,
                reopensAt: allowance.reopensAt?.toISOString() ?? null,
                paused: allowance.paused?.until.toISOString() ?? null,
                ownerShare: allowance.ownerShare === true,
                now: now.toISOString(),
              }} />
            )}
            card={card ?? null}
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
              // The chip's own reading, for rows whose figures are still counting (4e on every row).
              cardUnpriced={!!card && buysCard(card) && card.price.kind !== "priced"}
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
  cardUnpriced,
  queryString,
  changeHref,
}: {
  userId: string;
  params: ChooseParams;
  themeLabels: Record<string, string>;
  cardName: string | null;
  cardUnpriced: boolean;
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
      cardUnpriced={cardUnpriced}
      queryString={queryString}
      changeHref={changeHref}
    />
  );
}
