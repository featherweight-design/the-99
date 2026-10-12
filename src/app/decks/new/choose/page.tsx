// /decks/new/choose: Help me choose (sub-project 8, PR 5b). One route, three moments, told apart
// by `v` (see `src/lib/intake/params.ts`):
//  - no `v`: the form, pre-filled from the URL (*Change answers* lands here; bare is *Start over*);
//  - `v=submit`: the retired GET submit. It lands on the form with its answers, never charging:
//    the submit is a Server Action now (`submitChoose`, rework plan PR 3), which starts the read;
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
import { answersOf, parseLiveParams, serializeChooseParams, type ChooseParams } from "../../../../lib/intake/params";
import { answerChips } from "../../../../lib/intake/present";
import { isAnyOf } from "../../../../lib/intake/rank";
import { buysCard } from "../../../../lib/intake/buys-card";
import { loadCardChip, loadResultsPage } from "../../../../lib/intake/rows";
import { loadIntakeThemes } from "../../../../lib/intake/search";
import { loadCommanderPrintings } from "../../../../lib/sets/printed-in-read";
import { BUSY_PARAM, CHOOSE_PATH, formTarget, REPEAT_PARAM } from "../../../../lib/intake/submit";
import { toStanding } from "../../../../lib/intake/standing";
import { DimWhileReading, ReadPanel, ReadScope } from "../../../../components/intake/read-panel";
import { phaseOf } from "../../../../lib/intake/read-phase";
import { loadTheRead, type TheReadState } from "../../../../lib/intake/run-store";
import { loadReadDecks } from "../../../../lib/intake/the-read-load";
import { shortName, type ReadPicks } from "../../../../lib/intake/the-read";
import { readAllowance } from "../../../../lib/model/allowance";

// A row's figures come from a real fill run in a Server Action posted from this page.
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
  const p = parseLiveParams(sp);

  // Outside any try: `redirect` throws, and a catch would swallow it.
  if (sp.get("v") === "submit") redirect(formTarget(p));

  // The labels only: nothing on this route builds the card-name index any more.
  // The form needs the vocabulary to draw its picker, and fails without it. The results only name
  // themes with it: a failed read there draws each theme by its slug rather than taking the page
  // down above the results' own recovery (*Search failed*, with Retry).
  const themes = p.results ? await loadIntakeThemes().catch(() => []) : await loadIntakeThemes();
  // The Sets answer's list, and its names on the results: a decoration either way, so a failed
  // read draws codes rather than taking the page down.
  const sets = await loadCommanderPrintings().then((x) => x.sets).catch(() => []);

  if (!p.results) {
    // The press's credit standing (F7). A failed read draws the plain button: the submit re-checks.
    const now = new Date();
    const allowance = await readAllowance(userId, now, "intake").catch(() => null);
    return (
      <div className="flex flex-col pb-[24px] md:px-[40px] md:pb-[48px]">
        <ChooseHeader
          back={{ href: "/decks/new", label: copy.intake.back }}
          title={copy.intake.title}
          sub={copy.intake.sub}
          subPhone={copy.intake.subPhone}
          centered
        />
        <IntakeForm themes={themes} sets={sets} initial={p} standing={allowance && toStanding(allowance, now)} />
      </div>
    );
  }

  const themeLabels = Object.fromEntries(themes.map((t) => [t.slug, t.label]));
  // A decoration, read outside the results' own recovery: a failure here draws the page without the
  // card's chip rather than taking the whole route down before *Search failed* could offer a retry.
  // Three decorations, none of which may take the page down: the card's chip, the read `r` names,
  // and the credit standing its panel's line says.
  const words = p.words.trim();
  const now = new Date();
  const [card, [served, allowance]] = await Promise.all([
    // `undefined` when the read failed, which says nothing about the card; `null` when it is no card.
    p.card ? loadCardChip(userId, p.card).catch(() => undefined) : null,
    // The standing is read AFTER the read's state: reading the state can reap an abandoned read and
    // refund its credit, and a standing read beside it could count the credit the panel says came back.
    (async () => {
      // A failed read of the read's state draws it as running: the panel then asks again itself.
      const state = words && p.readId
        ? await loadTheRead(p.readId, userId, now).catch((): TheReadState => ({ kind: "pending", phase: null }))
        : null;
      return [state, words ? await readAllowance(userId, now, "intake").catch(() => null) : null] as const;
    })(),
  ]);
  // A done read orders the results, and its reasons name the player's decks by their commanders.
  const picks: ReadPicks | null = served?.kind === "done" ? served.result : null;
  const decks = picks ? await loadReadDecks(userId).catch(() => null) : null;
  const deckNames = Object.fromEntries((decks ?? []).map((d) => [d.commanderOracleId, shortName(d.commander)]));
  const setNames = new Map(sets.map((s) => [s.code, s.name]));
  const labels = {
    theme: (slug: string) => themeLabels[slug] ?? slug,
    card: card?.name ?? null,
    set: (code: string) => setNames.get(code) ?? code.toUpperCase(),
  };
  // A change of answers is a new ask: it carries neither the read nor its marks.
  const changeHref = `${CHOOSE_PATH}${serializeChooseParams({ ...p, notUsed: [], readId: null, deeper: [], results: false })}`;
  const panel = words ? (
    <ReadPanel
      readId={p.readId}
      served={served}
      standing={allowance && toStanding(allowance, now)}
      params={p}
      changeHref={changeHref}
      repeat={sp.get(REPEAT_PARAM) === "1"}
      busy={sp.get(BUSY_PARAM) === "1"}
      hasDecks={decks === null ? null : decks.length > 0}
    />
  ) : null;
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
          {/* Keyed on the server's state: a refresh that finds the read settled starts the panel and
              the results afresh, in the read's order. */}
          <ReadScope key={served?.kind ?? "unread"} initial={words ? phaseOf(served) : null}>
          <ReadAsBar
            chips={answerChips(p, labels)}
            words={words}
            offer={panel}
            card={card ?? null}
            changeHref={changeHref}
            startOverHref={CHOOSE_PATH}
          />
          <DimWhileReading>
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
              picks={picks}
              deckNames={deckNames}
            />
          </Suspense>
          </DimWhileReading>
          </ReadScope>
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
  picks,
  deckNames,
}: {
  userId: string;
  params: ChooseParams;
  themeLabels: Record<string, string>;
  cardName: string | null;
  cardUnpriced: boolean;
  queryString: string;
  changeHref: string;
  picks: ReadPicks | null;
  deckNames: Record<string, string>;
}) {
  let page;
  try {
    page = await loadResultsPage(userId, answersOf(params), 0, picks);
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
      deckNames={deckNames}
    />
  );
}
