"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SCAN_MODEL } from "../../../lib/card-scan/match";
import { lookupCard } from "../../../lib/scan/lookup";
import type { Source } from "../../../lib/scan/pipeline";
import type { ScanSource } from "../../../lib/collection/add-lines";
import type { ScanGuess, ScanMode } from "./scan-view";
import { addKept, nextFrame, type AddOutcome, type FrameRead } from "./use-card-scan";

/**
 * What one chosen photo became. No printing is named: the index matches the card, not the printing, and the printing
 * added is the sheet's (Auto takes the card's first, Normal asks), shown on the list line itself.
 */
export type PhotoState =
  | { kind: "pending" }
  /** `guesses` holds the closest cards, the sure one first, so a wrong read can be fixed on the list. */
  | { kind: "sure"; guess: ScanGuess; guesses: ScanGuess[] }
  | { kind: "notSure"; guesses: ScanGuess[] }
  | { kind: "added"; guess: ScanGuess }
  /** No card found, a file the browser cannot open (HEIC in Chrome), or a lookup that never answered. */
  | { kind: "failed" };

/** One photo's row: its thumbnail (an object URL, kept for the life of the list) and what it became. */
export type PhotoRow = { id: number; thumb: string; state: PhotoState };

export type PhotoReaderDeps = {
  readFrame: (source: Source) => Promise<FrameRead>;
  fetch?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
  /** Decodes a file with its EXIF rotation applied. */
  decode?: (file: File) => Promise<ImageBitmap>;
  thumb?: { create: (file: File) => string; revoke: (url: string) => void };
};

export type PhotoReader = {
  rows: PhotoRow[];
  /** Reads more photos, after any still waiting. */
  choose: (files: Iterable<File>) => void;
  /** Adds every sure row not yet added, one at a time. */
  addSure: () => Promise<void>;
  /** Adds the guess pressed on a Not sure row. */
  pick: (rowId: number, oracleId: string) => Promise<void>;
  /** An add is in flight: every add press waits for it, so none is taken and dropped. */
  busy: boolean;
};

const decodeFile = (file: File) => createImageBitmap(file, { imageOrientation: "from-image" });
const objectUrls = { create: (f: File) => URL.createObjectURL(f), revoke: (u: string) => URL.revokeObjectURL(u) };

/**
 * Photos chosen in place of the camera (card-scan PR 5, handoff W4, D6, W6): each read ONCE, in the order chosen, one
 * at a time, through the camera's own detector and embedder (`readFrame`), then looked up once (`lookupCard`, with
 * only its own retries). No steadiness and no agreement: a still is the same every read. A row appears pending as
 * soon as its photo is chosen and is decided in place, a turn handed to the browser between photos so the sheet
 * stays live. Nothing is added until the player presses: `addSure` for the sure rows, `pick` for a Not sure one.
 */
export function usePhotoReader(
  deps: PhotoReaderDeps,
  onAdd: (guess: ScanGuess, mode: ScanMode, scan: ScanSource) => AddOutcome | Promise<AddOutcome>,
  mode: ScanMode,
  onProblem: (kind: "photoFailed" | "notAdded" | "noStart") => void,
): PhotoReader {
  const depsRef = useRef(deps);
  const onProblemRef = useRef(onProblem);
  useEffect(() => {
    depsRef.current = deps;
    onProblemRef.current = onProblem;
  });
  const [rows, setRows] = useState<PhotoRow[]>([]);
  const queue = useRef<{ id: number; file: File }[]>([]);
  const nextId = useRef(0);
  const running = useRef(false);
  // Closing the scanner (Stop, ✕) stops the reading and drops a lookup in flight.
  const abort = useRef<AbortController | null>(null);
  const thumbs = useRef<string[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    return () => {
      controller.abort();
      queue.current = [];
      const revoke = (depsRef.current.thumb ?? objectUrls).revoke;
      thumbs.current.forEach(revoke);
      thumbs.current = [];
    };
  }, []);

  const settle = (id: number, state: PhotoState) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, state } : r)));

  const readOne = useCallback(async (file: File, signal: AbortSignal): Promise<PhotoState> => {
    const d = depsRef.current;
    let bitmap: ImageBitmap;
    try {
      bitmap = await (d.decode ?? decodeFile)(file);
    } catch {
      return { kind: "failed" };
    }
    let read: FrameRead;
    try {
      // Closed while the photo decoded: the models are already released, and a read now would load them again.
      if (signal.aborted) return { kind: "failed" };
      read = await d.readFrame(bitmap);
    } catch {
      // The models would not load: no photo can be read, and the player is told why.
      onProblemRef.current("noStart");
      return { kind: "failed" };
    } finally {
      bitmap.close();
    }
    if (read.frame.kind === "none") return { kind: "failed" };
    const r = await lookupCard(read.frame.embedding, SCAN_MODEL, {
      fetch: (...a: Parameters<typeof fetch>) => (depsRef.current.fetch ?? fetch)(...a),
      wait: (ms) => (depsRef.current.wait ?? ((x: number) => new Promise<void>((res) => setTimeout(res, x))))(ms),
      signal,
    });
    if (signal.aborted) return { kind: "failed" };
    if (r.kind !== "match") {
      onProblemRef.current("photoFailed");
      return { kind: "failed" };
    }
    const guesses = r.guesses.map((g) => ({ oracleId: g.oracleId, name: g.name, typeLine: g.typeLine, imageUri: g.imageUri }));
    if (guesses.length === 0) return { kind: "failed" };
    if (r.sure) return { kind: "sure", guess: guesses[0], guesses: guesses.slice(0, 3) };
    return { kind: "notSure", guesses: guesses.slice(0, 3) };
  }, []);

  const drain = useCallback(async () => {
    const signal = abort.current?.signal;
    if (running.current || !signal) return;
    running.current = true;
    try {
      while (!signal.aborted && queue.current.length > 0) {
        const job = queue.current.shift()!;
        const state = await readOne(job.file, signal);
        if (signal.aborted) return;
        settle(job.id, state);
        await nextFrame();
      }
    } finally {
      running.current = false;
    }
  }, [readOne]);

  const choose = useCallback(
    (files: Iterable<File>) => {
      const create = (depsRef.current.thumb ?? objectUrls).create;
      const added: PhotoRow[] = [];
      for (const file of files) {
        const id = nextId.current++;
        const thumb = create(file);
        thumbs.current.push(thumb);
        queue.current.push({ id, file });
        added.push({ id, thumb, state: { kind: "pending" } });
      }
      if (added.length === 0) return;
      setRows((rs) => [...rs, ...added]);
      void drain();
    },
    [drain],
  );

  // One add at a time, the bulk press's whole run included: a second press while one waits would add a card twice.
  // `busy` mirrors it for the presses, which are held while it is set.
  const committing = useRef(false);
  const [busy, setBusy] = useState(false);
  const hold = (on: boolean) => {
    committing.current = on;
    setBusy(on);
  };
  const rowsRef = useRef(rows);
  // The mode at each add, not at the press: a change mid-batch applies to the cards after it, as on the camera.
  const modeRef = useRef(mode);
  useEffect(() => {
    rowsRef.current = rows;
    modeRef.current = mode;
  });
  const commit = useCallback(
    async (id: number, guess: ScanGuess, named: ScanGuess[] = [guess]): Promise<boolean> => {
      // A photo's line carries its closest cards for the fix, the added one first. No photo: a thumbnail's object URL
      // is released with the scanner, before the review the fix is read in.
      const guesses = [guess, ...named.filter((g) => g.oracleId !== guess.oracleId)].map(({ oracleId, name, imageUri }) => ({ oracleId, name, imageUri }));
      // A photo's row waits for the add to settle: it has no feed to keep live, and its row says Added only once kept.
      if (!(await addKept(await onAdd(guess, modeRef.current, { photo: null, guesses })))) {
        onProblemRef.current("notAdded");
        return false;
      }
      settle(id, { kind: "added", guess });
      return true;
    },
    [onAdd],
  );

  const addSure = useCallback(async () => {
    if (committing.current) return;
    hold(true);
    try {
      for (const r of rowsRef.current) {
        if (r.state.kind !== "sure") continue;
        if (!(await commit(r.id, r.state.guess, r.state.guesses))) return;
      }
    } finally {
      hold(false);
    }
  }, [commit]);

  const pick = useCallback(
    async (rowId: number, oracleId: string) => {
      const row = rowsRef.current.find((r) => r.id === rowId);
      const guess = row?.state.kind === "notSure" ? row.state.guesses.find((g) => g.oracleId === oracleId) : undefined;
      if (!guess || committing.current) return;
      hold(true);
      try {
        await commit(rowId, guess, row?.state.kind === "notSure" ? row.state.guesses : [guess]);
      } finally {
        hold(false);
      }
    },
    [commit],
  );

  return { rows, choose, addSure, pick, busy };
}
