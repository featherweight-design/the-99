// /decks/new/choose: Help me choose (sub-project 8, PR 5b). One route, three moments, told apart
// by `v` (see `src/lib/intake/params.ts`):
//  - no `v`: the form, pre-filled from the URL (*Change answers* lands here; bare is *Start over*);
//  - `v=submit`: the retired GET submit. It lands on the form with its answers, never charging:
//    the submit is a Server Action now (`submitChoose`, rework plan PR 3), which starts the read;
//  - `v=results`: the results. The bar is drawn at once, and the search streams in under it;
//  - a results address with `h=1` is a past run opened from History (PR 3): the same page, dated and
//    read-only, its note in the read panel's place;
//  - `v=history`: the phone's History view (Help me choose history, PR 2). From `lg` (1024px) up History is a
//    column beside the form, so there the form draws as ever.
//
// Behind `HELP_ME_CHOOSE_ENABLED` (F3): off, the route is not found, before any read.
import { plainText } from "../../../../lib/decks/notes-body";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { Suspense } from "react";

import { CardDetailProvider } from "../../../../components/cards/card-detail-provider";
import { ChooseResults, HeldResults, ResultsSkeleton } from "../../../../components/intake/choose-results";
import { ChooseHeader, RESULTS_COLUMN } from "../../../../components/intake/choose-header";
import { ChooseHistory } from "../../../../components/intake/choose-history";
import { HistoryLink } from "../../../../components/intake/history-link";
import { IntakeForm } from "../../../../components/intake/intake-form";
import { ReadAsBar } from "../../../../components/intake/read-as-bar";
import { SearchFailed } from "../../../../components/intake/search-failed";
import { requireUserId } from "../../../../lib/auth";
import { helpMeChooseCopy as copy } from "../../../../lib/copy/help-me-choose";
import { helpMeChooseHistoryCopy as historyCopy } from "../../../../lib/copy/help-me-choose-history";
import { loadChooseHistory, loadPastRead } from "../../../../lib/intake/history-read";
import { helpMeChooseEnabled } from "../../../../lib/intake/flag";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { answersOf, parseLiveParams, serializeChooseParams, type ChooseParams } from "../../../../lib/intake/params";
import { answerChips } from "../../../../lib/intake/present";
import { isAnyOf } from "../../../../lib/intake/rank";
import { buysCard } from "../../../../lib/intake/buys-card";
import { loadCardChip, loadResultsPage } from "../../../../lib/intake/rows";
import { loadIntakeThemes } from "../../../../lib/intake/search";
import { loadCommanderPrintings } from "../../../../lib/sets/printed-in-read";
import { BUSY_PARAM, CHOOSE_PATH, formTarget, FORM_PARAM, PAST_PARAM, REPEAT_PARAM } from "../../../../lib/intake/submit";
import { GonePicks, PastRunMeta, PastRunNote, PastWontOpen } from "../../../../components/intake/past-run";
import { loadGonePicks } from "../../../../lib/intake/past-run";
import { toStanding } from "../../../../lib/intake/standing";
import { DimWhileReading, ReadAnnouncer, ReadPanel, ReadScope } from "../../../../components/intake/read-panel";
import { phaseOf } from "../../../../lib/intake/read-phase";
import { loadTheRead, type TheReadState } from "../../../../lib/intake/run-store";
import { loadReadDecks } from "../../../../lib/intake/the-read-load";
import { shortName, type ReadPicks } from "../../../../lib/intake/the-read";
import { readAllowance } from "../../../../lib/model/allowance";

// A row's figures come from a real fill run in a Server Action posted from this page.
export const maxDuration = 120;

/** The title's id on a past run, which `PastRunMeta` moves focus to when the run opens. */
const PAST_TITLE_ID = "past-run-title";

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
  // The reader first: the switch is theirs (`requestSwitchEnv`).
  const userId = await requireUserId();
  // Resolved once and handed to every claim read below, so the card chip and the results' search
  // share one `loadCardRow` (its `cache` key holds the env by identity).
  const env = await requestSwitchEnv(userId);
  if (!helpMeChooseEnabled(env)) notFound();
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
    // The runs are a decoration beside the form: a failed read draws History's own retry, never a broken form.
    // History is read FIRST: its read refunds abandoned reads, and an allowance read beside it could
    // count a credit the list has just returned, leaving the form saying nothing is left.
    const history = await loadChooseHistory(userId, { now }).catch(() => null);
    const allowance = await readAllowance(userId, now, "intake").catch(() => null);
    const historyView = sp.get("v") === "history";
    return (
      <div className="flex flex-col pb-[24px] md:px-[40px] md:pb-[48px]">
        <div className="md:mx-auto md:w-full md:max-w-[1100px] lg:flex lg:items-start lg:justify-center lg:gap-[40px]">
          <div className={`min-w-0 md:w-[680px] md:max-w-full md:shrink ${historyView ? "hidden lg:block" : ""}`}>
            <ChooseHeader
              back={{ href: "/decks/new", label: copy.intake.back }}
              title={copy.intake.title}
              sub={copy.intake.sub}
              subPhone={copy.intake.subPhone}
              centered
              trailing={<HistoryLink href={`${CHOOSE_PATH}?v=history`} label={historyCopy.link} />}
            />
            <IntakeForm themes={themes} sets={sets} initial={p} standing={allowance && toStanding(allowance, now)} />
          </div>
          <aside className="hidden lg:sticky lg:top-[24px] lg:block lg:w-[320px] lg:shrink-0 min-[1100px]:w-[380px]">
            <ChooseHistory initial={history} layout="column" />
          </aside>
          {historyView ? (
            <div className="lg:hidden">
              <HistoryLink href={CHOOSE_PATH} label={historyCopy.back} back />
              <ChooseHistory initial={history} layout="view" />
            </div>
          ) : null}
        </div>
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
  const openedFromHistory = !!words && !!p.readId && sp.get(PAST_PARAM) === "1";
  const [card, [served, allowance, pastAt]] = await Promise.all([
    // `undefined` when the read failed, which says nothing about the card; `null` when it is no card.
    p.card ? loadCardChip(userId, p.card, env).catch(() => undefined) : null,
    // The standing is read AFTER the read's state: reading the state can reap an abandoned read and
    // refund its credit, and a standing read beside it could count the credit the panel says came back.
    (async () => {
      // A run opened from History is read with its date; a run that is not the player's reads as none.
      if (openedFromHistory) {
        const past = await loadPastRead(p.readId!, userId, now).catch(() => null);
        return [past?.state ?? ({ kind: "none" } as TheReadState), null, past?.at ?? null] as const;
      }
      // A failed read of the read's state draws it as running: the panel then asks again itself.
      const state = words && p.readId
        ? await loadTheRead(p.readId, userId, now).catch((): TheReadState => ({ kind: "pending", phase: null }))
        : null;
      return [state, words ? await readAllowance(userId, now, "intake").catch(() => null) : null, null] as const;
    })(),
  ]);
  // A past run is one that settled with an answer; a run still in flight opens as the live page, and one
  // that is gone, another player's or failed will not open.
  const isPast = openedFromHistory && pastAt !== null && (served?.kind === "done" || served?.kind === "nothing");
  if (openedFromHistory && !isPast && served?.kind !== "pending") {
    return (
      <div className="flex flex-col">
        <ChooseHeader
          back={{ href: `${CHOOSE_PATH}?v=history`, label: historyCopy.past.back }}
          title={copy.results.title}
          sub={copy.results.sub}
          subPhone={copy.results.subPhone}
        />
        <div className={RESULTS_COLUMN}>
          <PastWontOpen historyHref={`${CHOOSE_PATH}?v=history`} />
        </div>
      </div>
    );
  }
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
  const changeHref = `${CHOOSE_PATH}${serializeChooseParams({ ...p, notUsed: [], readId: null, results: false })}`;
  const panel = words && !isPast ? (
    <ReadPanel
      key={served?.kind ?? "unread"}
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
  // A past run that found nothing keeps today's empty panel, with its stored pool and no credit line.
  const nothingPanel = isPast && served?.kind === "nothing" ? (
    <ReadPanel key="past-nothing" readId={p.readId} served={served} standing={null} params={p} changeHref={changeHref} repeat={false} busy={false} hasDecks={null} />
  ) : null;
  const queryString = serializeChooseParams(p).slice(1);
  // What the Suspense is keyed on: the answers, not the read. A retry's address carries a new `r`
  // but asks for the same commanders, and a new key would swap the list the player is looking at
  // for the loading state. A change of answers changes this, and starts the loading state as ever.
  const resultsKey = serializeChooseParams({ ...p, readId: null }).slice(1);
  // The form's own submit started this read: the free list was never on screen, and an inaccurate
  // list replaced moments later reads as a bug. While the read is pending the results' loading
  // state stands in for it; a settled read (or a stopped or failed one) draws the list as ever.
  const holdList = !!words && !isPast && sp.get(FORM_PARAM) === "1" && served?.kind === "pending";
  const ranking = [...p.themes.map(labels.theme), ...(card ? [card.name] : [])];
  // Said as the order line will say it: any of with no card ranks by the best-fitting theme.
  const by = isAnyOf(p) && !card
    ? copy.results.loadingBy.bestTheme
    : ranking.length === 0 ? copy.results.loadingBy.owned : ranking.length === 1 ? ranking[0] : copy.results.loadingBy.all;

  return (
    <CardDetailProvider>
      <div className="flex flex-col">
        <ChooseHeader
          back={isPast ? { href: `${CHOOSE_PATH}?v=history`, label: historyCopy.past.back } : { href: changeHref, label: copy.results.back }}
          title={copy.results.title}
          sub={copy.results.sub}
          subPhone={copy.results.subPhone}
          titleId={isPast ? PAST_TITLE_ID : undefined}
          meta={isPast && pastAt ? <PastRunMeta at={pastAt} titleId={PAST_TITLE_ID} /> : undefined}
        />
        <div className={RESULTS_COLUMN}>
          {/* Keyed on the read: a new read (Try again) starts silent, while the refresh that draws
              this read settled keeps what it just announced. */}
          {words && !isPast && <ReadAnnouncer key={p.readId ?? "unread"} />}
          {/* NOT keyed on the server's state: a remount here would remount the results' Suspense, and a
              settled read would flash its loading skeleton again. The scope adopts the new state in
              place; the panel (above) and the results list (in `Results`) are keyed on it instead. */}
          <ReadScope initial={words ? phaseOf(served) : null}>
          <ReadAsBar
            chips={answerChips(p, labels)}
            words={plainText(words)}
            offer={isPast && served?.kind === "nothing" ? nothingPanel : panel}
            card={card ?? null}
            changeHref={changeHref}
            startOverHref={CHOOSE_PATH}
          />
          <DimWhileReading hold={holdList}>
          <Suspense
            key={resultsKey}
            fallback={isPast ? <><PastRunNote nothing={served?.kind === "nothing"} aged={null} /><ResultsSkeleton by={by} /></> : <ResultsSkeleton by={by} />}
          >
            <Results
              userId={userId}
              env={env}
              params={p}
              themeLabels={themeLabels}
              cardName={card?.name ?? null}
              // The chip's own reading, for rows whose figures are still counting (4e on every row).
              cardUnpriced={!!card && buysCard(card) && card.price.kind !== "priced"}
              queryString={queryString}
              changeHref={changeHref}
              picks={picks}
              deckNames={deckNames}
              hold={holdList ? by : null}
              past={isPast ? { nothing: served?.kind === "nothing", picks: picks?.picks.length ?? 0 } : null}
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
  env,
  params,
  themeLabels,
  cardName,
  cardUnpriced,
  queryString,
  changeHref,
  picks,
  deckNames,
  hold,
  past,
}: {
  userId: string;
  /** The reader's resolved switches, the page's own, for the search's claim reads. */
  env: NodeJS.ProcessEnv;
  params: ChooseParams;
  themeLabels: Record<string, string>;
  cardName: string | null;
  cardUnpriced: boolean;
  queryString: string;
  changeHref: string;
  picks: ReadPicks | null;
  deckNames: Record<string, string>;
  /** Non-null while the form's read is pending: the order line to name, and no rows to draw. */
  hold: string | null;
  /** A run opened from History: its note, the picks that went, and a line for a deleted deck's reason. */
  past: { nothing: boolean; picks: number } | null;
}) {
  let page;
  try {
    page = await loadResultsPage(userId, answersOf(params), 0, picks, env);
  } catch (error) {
    // Next's own control flow (a bailout, a redirect) passes through untouched.
    unstable_rethrow(error);
    console.error("help me choose: search failed", error);
    return <SearchFailed changeHref={changeHref} />;
  }
  // The search still runs, for the pool the read's first step names; its rows wait for the read.
  if (hold !== null) return <HeldResults total={page.total} by={hold} />;
  // The picks that went since the run: a decoration, so a failed read draws the run without the group.
  const gone = past ? await loadGonePicks(userId, page.gone).catch(() => []) : [];
  const results = (
    <ChooseResults
      // A settled read re-orders the list: a fresh list, mounted inside the Suspense that already
      // shows the old one, so the swap needs no loading skeleton.
      key={picks ? "read" : "free"}
      page={page}
      params={params}
      themeLabels={themeLabels}
      cardName={cardName}
      cardUnpriced={cardUnpriced}
      queryString={queryString}
      changeHref={changeHref}
      deckNames={deckNames}
      pastRun={past !== null}
      gone={gone.length > 0 ? <GonePicks picks={gone} /> : null}
    />
  );
  if (!past) return results;
  return (
    <>
      <PastRunNote nothing={past.nothing} aged={page.gone.length > 0 ? { open: past.picks - page.gone.length, picks: past.picks } : null} />
      {results}
    </>
  );
}
