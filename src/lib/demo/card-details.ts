// The landing demo's card details (step 5l-c): what a press on a card opens, as `pnpm demo:export` wrote them into
// `card-details/<chunk>.generated.ts`. Apart from the step data (`projected.ts`), and split by step (`CARD_CHUNKS`): they are
// most of the demo's bytes and only a press needs them. The frame (`demo.tsx`, step 5l-g) fetches only the chunks of the step on
// screen (`loadDemoCardDetails(step)`: that step's chunk and `shared`, `cardStepsFor` says which steps a screen needs) on idle
// after entering the step, then the next step's once those have landed, or a step's on the first press there if that comes
// sooner; never on Start. A frame that names no step is not one the demo draws: it gets every chunk (~166 KB gzipped).

import { unpackCardDetails } from "./card-details-pack";
import type { DemoCardChunk, DemoCardData, DemoCardDetail, DemoCardStep, DemoDeckCombos } from "./project-cards";
import { decodeDemo } from "./wire";

/** The chunk's format: 1 since it split from the step data. A file in any other format reads as none. */
export const CARD_DETAILS_FORMAT = 1;

/** The file decoded, prices unpacked: what the modal takes. Null when the export has not written it. */
export function decodeCardDetails(json: unknown): DemoCardData | null {
  if (json === null) return null;
  const file = decodeDemo<{ format: number; cardDetails: Record<string, { prices?: unknown }>; deckCombos: DemoDeckCombos }>(json);
  if (file.format !== CARD_DETAILS_FORMAT) return null;
  return { cardDetails: unpackCardDetails(file.cardDetails), deckCombos: file.deckCombos };
}

/** Each chunk's file, fetched on demand: a static path per chunk, so the bundler splits each into its own file. */
const CHUNK_FILES: Record<DemoCardChunk, () => Promise<{ cardDetailsJson: unknown }>> = {
  binder: () => import("./card-details/binder.generated"),
  played: () => import("./card-details/played.generated"),
  over: () => import("./card-details/over.generated"),
  under: () => import("./card-details/under.generated"),
  shared: () => import("./card-details/shared.generated"),
};

/** The chunks together, as one step's press reads them: a card's details from whichever chunk holds it, and each deck's
 *  combo overrides from its own chunk. Null when any chunk is unwritten. */
export function mergeCardChunks(chunks: readonly (DemoCardData | null)[]): DemoCardData | null {
  if (chunks.some((c) => c === null)) return null;
  const all = chunks as DemoCardData[];
  return {
    cardDetails: Object.assign({}, ...all.map((c) => c.cardDetails)),
    deckCombos: {
      played: Object.assign({}, ...all.map((c) => c.deckCombos.played)),
      over: Object.assign({}, ...all.map((c) => c.deckCombos.over)),
      under: Object.assign({}, ...all.map((c) => c.deckCombos.under)),
    },
  };
}

const chunkLoads = new Map<DemoCardChunk, Promise<DemoCardData | null>>();
const stepLoads = new Map<DemoCardStep | "all", Promise<DemoCardData | null>>();

/** One chunk, fetched and decoded once. A failed fetch or decode is not kept, so the next press tries again. */
function loadChunk(chunk: DemoCardChunk): Promise<DemoCardData | null> {
  let load = chunkLoads.get(chunk);
  if (!load) {
    load = CHUNK_FILES[chunk]()
      .then((m) => decodeCardDetails(m.cardDetailsJson))
      .catch((e: unknown) => {
        chunkLoads.delete(chunk);
        throw e;
      });
    chunkLoads.set(chunk, load);
  }
  return load;
}

/**
 * What a press on `step` can open: that step's chunk and `shared`, fetched and merged once, so every later press on the step
 * takes the same object. With no step, every chunk at once, for a frame that holds one set of details for all its steps. A
 * failed load is not kept, so the next press tries again.
 */
export function loadDemoCardDetails(step?: DemoCardStep): Promise<DemoCardData | null> {
  const key = step ?? "all";
  const chunks: readonly DemoCardChunk[] = step === undefined ? (Object.keys(CHUNK_FILES) as DemoCardChunk[]) : [step, "shared"];
  let load = stepLoads.get(key);
  if (!load) {
    load = Promise.all(chunks.map(loadChunk))
      .then((read) => {
        const data = mergeCardChunks(read);
        // None is not kept either: a chunk that read as none (unwritten, or in another format) is read again on the next press.
        if (data === null) {
          stepLoads.delete(key);
          for (const c of chunks) chunkLoads.delete(c);
        }
        return data;
      })
      .catch((e: unknown) => {
        stepLoads.delete(key);
        throw e;
      });
    stepLoads.set(key, load);
  }
  return load;
}

/**
 * What a press opens: the card's details, with a deck step's own combos laid over them when the press comes from that deck's
 * step (`deckCombos`; the deck page reads combos against its deck). An override of null is a real answer, the deck's read
 * finds no combos, and removes the block; a card with no override opens as it does anywhere. Undefined for a card with none.
 */
export function demoCardDetail(data: DemoCardData, oracleId: string, role?: keyof DemoDeckCombos): DemoCardDetail | undefined {
  const card = Object.hasOwn(data.cardDetails, oracleId) ? data.cardDetails[oracleId] : undefined;
  const byId = role === undefined ? undefined : data.deckCombos[role];
  if (!card || !byId || !Object.hasOwn(byId, oracleId)) return card;
  const { cardCombos: _unscoped, ...rest } = card;
  const scoped = byId[oracleId];
  return scoped === null ? rest : { ...rest, cardCombos: scoped };
}
