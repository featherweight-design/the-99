// /decks/new — two doors: pre-filled (when ?commander= is valid) or picker.
// §Create — Pre-filled / §Create — Picker
import { requireUserId } from "../../../lib/auth";
import { loadPreFilledCommander } from "../../../lib/decks/pre-filled-commander";
import { listOwnedLegalCommanders } from "../../../lib/decks/read";
import { parseSelectParam } from "../../../lib/decks/selection-param";
import { CreatePreFilled } from "../../../components/decks/create-pre-filled";
import { CreatePicker } from "../../../components/decks/create-picker";
import { helpMeChooseEnabled } from "../../../lib/intake/flag";
import { handOffFrom, resultsHref } from "../../../lib/intake/hand-off";
import { hasAnswerRows, loadHandOffAnswers } from "../../../lib/intake/hand-off-load";
import { serializeChooseParams } from "../../../lib/intake/params";
import { CHOOSE_PATH } from "../../../lib/intake/submit";

export default async function NewDeckPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireUserId();
  const raw = await searchParams;
  const commanderParam = typeof raw.commander === "string" ? raw.commander : undefined;
  const select = raw.select;
  const helpMeChoose = helpMeChooseEnabled();

  // Pre-filled door: validate the ?commander= param server-side, and draw the copy the
  // reader owns. Both live in `loadPreFilledCommander` so they can be tested — a route
  // module cannot be, and reverting the resolution here was invisible to the suite.
  if (commanderParam) {
    const commander = await loadPreFilledCommander(userId, commanderParam);
    if (commander) {
      // A Help me choose result's press carries the results' own params beside `commander`. With
      // the feature off there is no results screen to go back to, so the page is today's.
      const asked = helpMeChoose ? handOffFrom(searchParamsOf(raw)) : null;
      const answers = asked ? await loadHandOffAnswers(userId, commander.oracleId, asked) : null;
      const handOff = asked && answers ? {
        answers,
        create: {
          themes: answers.themes.map((t) => t.label),
          cardOracleId: answers.card?.oracleId ?? null,
          budgetDollars: answers.budgetDollars,
          bracket: answers.bracket,
        },
        resultsHref: resultsHref(asked),
        changeHref: `${CHOOSE_PATH}${serializeChooseParams({ ...asked, notUsed: [], readId: null, deeper: [], results: false })}`,
        drawBlock: hasAnswerRows(answers),
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
  const legalCommanders = await listOwnedLegalCommanders(userId);

  return <CreatePicker legalCommanders={legalCommanders} helpDoor={helpMeChoose} />;
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
