// /decks/new — two doors: pre-filled (when ?commander= is valid) or picker.
// §Create — Pre-filled / §Create — Picker
import { requireUserId } from "../../../lib/auth";
import { loadPreFilledCommander } from "../../../lib/decks/pre-filled-commander";
import { listOwnedLegalCommanders } from "../../../lib/decks/read";
import { parseSelectParam } from "../../../lib/decks/selection-param";
import { CreatePreFilled } from "../../../components/decks/create-pre-filled";
import { CreatePicker } from "../../../components/decks/create-picker";
import { helpMeChooseEnabled } from "../../../lib/intake/flag";
import { hasListableRun } from "../../../lib/intake/history-read";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { MAX_THEMES } from "../../../lib/intake/answers";
import { handOffFrom, handOffSets, pastFrom, resultsHref } from "../../../lib/intake/hand-off";
import { hasAnswerRows, loadHandOffAnswers } from "../../../lib/intake/hand-off-load";
import { serializeChooseParams } from "../../../lib/intake/params";
import { loadIntakeCatalog } from "../../../lib/intake/search";
import { choosePath } from "../../../lib/commanders/place-paths";

export default async function NewDeckPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireUserId();
  // The reader's resolved switches, once for the whole render.
  const env = await requestSwitchEnv(userId);
  const raw = await searchParams;
  const commanderParam = typeof raw.commander === "string" ? raw.commander : undefined;
  const select = raw.select;
  const helpMeChoose = helpMeChooseEnabled(env);
  const chooseAt = choosePath(true);

  // Pre-filled door: validate the ?commander= param server-side, and draw the copy the
  // reader owns. Both live in `loadPreFilledCommander` so they can be tested — a route
  // module cannot be, and reverting the resolution here was invisible to the suite.
  if (commanderParam) {
    const commander = await loadPreFilledCommander(userId, commanderParam);
    if (commander) {
      // A Help me choose result's press carries the results' own params beside `commander`. With
      // the feature off there is no results screen to go back to, so the page is today's.
      const asked = helpMeChoose ? handOffFrom(searchParamsOf(raw)) : null;
      const answers = asked ? await loadHandOffAnswers(userId, commander.oracleId, asked, env) : null;
      // The sets the create (and the Bracket row's trial) fill toward: the picked ones plus any
      // the typed words name. A failed catalog read is the picked sets alone.
      const fillSets = asked && answers
        ? handOffSets(
          answers.sets.map((s) => s.code),
          asked.words,
          asked.words.trim() === "" ? null : await loadIntakeCatalog().then((c) => c.index).catch(() => null),
        )
        : [];
      const handOff = asked && answers ? {
        answers,
        create: {
          // The first eight: themes only write the brief, which `createDeck` bounds at that; the
          // block still lists every theme the player asked for.
          themes: answers.themes.slice(0, MAX_THEMES).map((t) => t.label),
          themeJoin: answers.themeJoin,
          // The picked sets and those the words name, at most eight (`handOffSets`): they word the
          // brief and rank the owned cards the fill takes first.
          sets: fillSets,
          pool: answers.pool,
          // A card whose read failed is still the answer: `createDeck` checks it against the catalog.
          cardOracleId: answers.card?.oracleId ?? (answers.cardUnread ? asked.card : null),
          budgetDollars: answers.budgetDollars,
          bracket: answers.bracket,
          // *From my collection* or no choice drawn; the hand-off sets it on *Hit bracket N*.
          bracketBuys: false,
        },
        resultsHref: resultsHref(chooseAt, asked, pastFrom(searchParamsOf(raw))),
        changeHref: `${chooseAt}${serializeChooseParams({ ...asked, notUsed: [], readId: null, results: false })}`,
        drawBlock: hasAnswerRows(answers),
        // The Bracket row reads what the deck reaches (bracket reach PR 3b) from 3 up.
        readReach: answers.bracket !== null && answers.bracket >= 3,
      } : undefined;
      return (
        <CreatePreFilled
          oracleId={commander.oracleId}
          name={commander.name}
          typeLine={commander.typeLine}
          colorIdentity={commander.colorIdentity}
          imageUri={commander.imageUri}
          // Shape-checked in the loader, legality-checked again in `createDeck`: this
          // page has no commander context until that read resolves, and the action has
          // to re-check whatever it is handed anyway.
          selectedOracleIds={parseSelectParam(select)}
          handOff={handOff}
        />
      );
    }
  }

  // Picker door: load all owned legal commanders.
  const [legalCommanders, pastRuns] = await Promise.all([
    listOwnedLegalCommanders(userId),
    // The door's History link: only for a player with a run to list, and never read with the feature off.
    // A failed read draws the door without it.
    helpMeChoose ? hasListableRun(userId).catch(() => false) : false,
  ]);

  return <CreatePicker legalCommanders={legalCommanders} helpDoor={helpMeChoose} pastRuns={pastRuns} preconDoor />;
}

/** The page's params as the URL carried them; a repeated key keeps its first value, as `URLSearchParams.get` does. */
function searchParamsOf(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (first !== undefined) sp.set(k, first);
  }
  return sp;
}
