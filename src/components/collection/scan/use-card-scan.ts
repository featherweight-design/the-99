"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SCAN_MODEL } from "../../../lib/card-scan/match";
import { CAMERA_CONSTRAINTS, torchOf, type Torch } from "../../../lib/scan/camera";
import type { Source } from "../../../lib/scan/pipeline";
import { serverScanner, type ServerState } from "../../../lib/scan/server-scan";
import type { ScanFrame } from "../../../lib/scan/stable-card";
import { photoOf } from "../../../lib/scan/photo";
import type { ScanSource } from "../../../lib/collection/add-lines";
import type { PrintingChoice } from "../../../lib/collection/catalog-read";
import { readScanMode, writeScanMode } from "./mode-memory";
import type { ScanGuess, ScanMode, ScanScreen } from "./scan-view";
import { scanScreen, toScanGuess } from "./screen-state";
import type { ScanTimer } from "../../../lib/scan/timing";

/** One read of the camera: the detector's and embedder's answer for the frame (2c's module, injected), whether it
 * was too dark to read, and the card as the embedder saw it (its normalised crop), for the list's "Your scan". */
export type FrameRead = { frame: ScanFrame; cardInView: boolean; dark: boolean; crop?: Float32Array };

/** What an add carries with it: the card's photo as read, and the closest cards, the added one first (L2). */
export type ScanCapture = ScanSource;

/** Normal mode's pick, made in the camera: the card's printings as loaded, and the one chosen. */
export type ScanPicked = { choices: PrintingChoice[]; printing: PrintingChoice };

/** What the scanner saw when a card was taken: its closest cards and its photo. */
/** `empties` is how many empty frames had been read when the card was taken: an add that lands after the frame
 * emptied is a card already out of view, so the next one in is a new copy (R2), not a duplicate (R1). */
type Snap = { named: ScanGuess[]; crop: Float32Array | null; empties: number };

/** How long the added panel and the tray's flip stay up (READINESS: "about 0.8s"). */
export const ADDED_MS = 800;
/** How long frames must stay dark before the dark line shows. */
export const DARK_HOLD_MS = 1000;
/** Failed reads in a row before the player is told the scanner cannot start. */
export const READ_FAILURES_TOLD = 3;

const NO_LIST: ReadonlyMap<string, number> = new Map();

export type CardScanDeps = {
  /** Reads the video's current frame (or a chosen photo). Resolves when the detector and embedder are done with it. */
  readFrame: (source: Source) => Promise<FrameRead>;
  getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>;
  fetch?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
  now?: () => number;
  storage?: Storage | null;
  /** The crop as a picture; the canvas's own by default. */
  photo?: (crop: Float32Array) => string | null;
  /** A card's printings, for Normal mode's step in the camera; an empty list or a throw is a read that failed. */
  loadChoices?: (oracleId: string) => Promise<PrintingChoice[]>;
  /** The session's timing row (`timing.ts`), when the scanner keeps one. */
  timer?: ScanTimer;
};

export type CardScan = {
  screen: ScanScreen;
  mode: ScanMode;
  torch: { available: boolean; on: boolean };
  count: number;
  flipTo: string | null;
  attachVideo: (el: HTMLVideoElement | null) => void;
  setMode: (m: ScanMode) => void;
  toggleTorch: () => void;
  hold: () => void;
  cancelHold: () => void;
  add: () => void;
  pick: (oracleId: string) => void;
  /** None of these: adds nothing, and reading carries on past this answer. */
  dismiss: () => void;
  /** Normal mode: the printing chosen in the camera, which puts the card on the list. */
  choosePrinting: (printing: PrintingChoice) => void;
  /** Normal mode: not this card after all. Nothing is added, and reading carries on past this answer. */
  notThis: () => void;
};

/**
 * The scanner, composed (card-scan PR 3 on PR 2b's modules): the rear camera, one read of each frame through
 * `readFrame`, the server scanner (one lookup per steady card), and what the player did (hold, add, pick). It owns
 * every piece of state `ScannerView` draws, and hands each added card to `onAdd` with the mode it was added under,
 * since a change of mode mid-batch affects only the cards after it.
 */
export function useCardScan(
  active: boolean,
  deps: CardScanDeps,
  /** Puts the card on the list (at `picked`'s printing when Normal chose one); answers false when it could not. */
  onAdd: (guess: ScanGuess, mode: ScanMode, scan: ScanCapture, picked?: ScanPicked) => Promise<boolean>,
  onProblem: (kind: "failed" | "refused" | "notAdded" | "noStart") => void,
  /** Copies on the sheet's list, by oracle id, live: the tray and "again" read the list, which the desktop sheet can
   * still edit while the scanner is open. */
  listed: ReadonlyMap<string, number> = NO_LIST,
): CardScan {
  // The caller's deps are read through a ref, so a new object each render never restarts the camera or the loop.
  const depsRef = useRef(deps);
  useEffect(() => {
    depsRef.current = deps;
  });
  // Read through a ref by the read loop, which must not restart when the caller passes a new function.
  const onProblemRef = useRef(onProblem);
  useEffect(() => {
    onProblemRef.current = onProblem;
  });

  const now = useCallback(() => (depsRef.current.now ?? (() => performance.now()))(), []);
  const [mode, setModeState] = useState<ScanMode>(() => readScanMode(deps.storage === undefined ? safeLocalStorage() : deps.storage));
  // Read by setMode, which keeps one identity across renders.
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  });
  const [blocked, setBlocked] = useState(false);
  const [server, setServer] = useState<ServerState>({ kind: "idle" });
  const [read, setRead] = useState<{ cardInView: boolean; dark: boolean }>({ cardInView: false, dark: false });
  const [held, setHeld] = useState<ScanGuess | null>(null);
  const [added, setAdded] = useState<{ name: string; imageUri: string | null } | null>(null);
  const [lastAdded, setLastAdded] = useState<{ oracleId: string; emptiedSince: boolean } | null>(null);
  const [dismissed, setDismissed] = useState<object | null>(null);
  // Normal mode's printing step for one card, held until a printing is chosen or the card is turned down: the
  // answer it came from (so Not this card can pass it), what the scanner saw, and the printings once they load.
  const [choosing, setChoosing] = useState<{ guess: ScanGuess; snap: Snap; answer: object | null; choices: PrintingChoice[] | null } | null>(null);
  const chooseSeq = useRef(0);
  // Dark only once a dark frame has held for `DARK_HOLD_MS` (READINESS: "for about 1s"), so one dim frame never
  // flickers the line; a bright frame ends it at once.
  const darkSince = useRef<number | null>(null);
  const [torch, setTorch] = useState<{ handle: Torch | null; on: boolean }>({ handle: null, on: false });
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const torchBusy = useRef(false);
  // The newest frame that held a card: the card an add is pressed for is still in view, so its photo is this one.
  const lastCrop = useRef<Float32Array | null>(null);
  // What the scanner saw as a hold began (V4): the frozen guess's own photo and closest cards.
  const heldSnap = useRef<({ oracleId: string } & Snap) | null>(null);
  // One add at a time: a second tap while the first waits for its printings would add the card again unasked. The
  // read loop also waits while it is set, as it does while Normal's printings load.
  const committing = useRef(false);
  const loadingChoices = useRef(false);
  // Empty frames read so far, counted by the read loop.
  const empties = useRef(0);
  // The answer (and mode) already taken by itself in this view: the take lands a microtask later, and a render
  // before it must not take the same answer twice.
  const taken = useRef<{ answer: object | null; mode: ScanMode } | null>(null);

  // The camera, while the scanner is open and the element exists. A refusal (or no camera) is the blocked screen.
  useEffect(() => {
    if (!active || !videoEl) return;
    let stream: MediaStream | null = null;
    let gone = false;
    const gum = depsRef.current.getUserMedia ?? ((c: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(c));
    // Asked inside the chain, so a browser with no camera API at all (it throws rather than rejects) is blocked too.
    Promise.resolve()
      .then(() => gum(CAMERA_CONSTRAINTS))
      .then(
      (s) => {
        if (gone) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        videoEl.srcObject = s;
        // `play` answers a promise in browsers and nothing in some test DOMs.
        void Promise.resolve(videoEl.play?.()).catch(() => {});
        setTorch({ handle: torchOf(s.getVideoTracks()[0] ?? null), on: false });
      },
      () => !gone && setBlocked(true),
    );
    return () => {
      gone = true;
      stream?.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    };
  }, [active, videoEl]);

  // The held card's frame stays on screen while the press is down (V4), and the feed runs again on release.
  useEffect(() => {
    if (!videoEl?.srcObject) return;
    try {
      if (held) videoEl.pause();
      else void Promise.resolve(videoEl.play?.()).catch(() => {});
    } catch {
      // a test DOM with no media playback
    }
  }, [held, videoEl]);

  // The read loop: one frame at a time, each awaited, so a slow model never queues frames behind it.
  useEffect(() => {
    if (!active || !videoEl || blocked) return;
    let stop = false;
    const scanner = serverScanner(
      SCAN_MODEL,
      {
        fetch: (...a: Parameters<typeof fetch>) => (depsRef.current.fetch ?? fetch)(...a),
        wait: (ms) => (depsRef.current.wait ?? ((x: number) => new Promise<void>((r) => setTimeout(r, x))))(ms),
        now,
      },
      // A match is published only through `frame()`'s answer, which checks it against the card still in view: one
      // that lands after its card left would otherwise be addable until the next read.
      (s) => {
        if (s.kind !== "match") setServer(s);
        // The scanner goes idle through here only when its tracker says the frame emptied: it holds a card across a
        // missed frame or two, and so must the duplicate rule, or a card that flickered would be taken again (R1). An
        // empty view ends the one an answer was taken in, so the card coming back is a new copy (R2).
        if (s.kind === "idle") {
          empties.current++;
          taken.current = null;
          setLastAdded((l) => (l && !l.emptiedSince ? { ...l, emptiedSince: true } : l));
        }
      },
    );
    (async () => {
      let failures = 0;
      while (!stop) {
        const t = now();
        let r: FrameRead;
        try {
          r = await depsRef.current.readFrame(videoEl);
        } catch {
          if (stop) break;
          // The models would not load or a read threw: nothing on screen is being read, so no answer stands, and
          // the player is told once rather than left holding a card up. It keeps trying, further apart.
          failures++;
          if (failures === READ_FAILURES_TOLD) onProblemRef.current("noStart");
          setRead({ cardInView: false, dark: false });
          setServer(scanner.frame({ kind: "none" }, now()));
          await new Promise((res) => setTimeout(res, Math.min(4000, 250 * 2 ** Math.min(failures, 4))));
          continue;
        }
        failures = 0;
        if (stop) break;
        const at = now();
        if (!r.dark) darkSince.current = null;
        else if (darkSince.current === null) darkSince.current = at;
        const dark = darkSince.current !== null && at - darkSince.current >= DARK_HOLD_MS;
        setRead((prev) => (prev.cardInView === r.cardInView && prev.dark === dark ? prev : { cardInView: r.cardInView, dark }));
        if (r.crop) lastCrop.current = r.crop;
        // The scanner's own answer for this frame: a match the frame no longer shows is withdrawn here, not through
        // its callback, so a press never adds the card that was in view before this one.
        depsRef.current.timer?.frame(t, at, r.frame.kind === "card");
        setServer(scanner.frame(r.frame, now(), t));
        // Always hand the browser a turn: a read that answers at once (the camera has no size yet, or no card)
        // would otherwise spin this loop on resolved promises and starve the very events that give the video its size.
        await afterPaint();
        // While the scanner waits on the server (a card's lookup, an add's printings, Normal's printings), no frame
        // is read: a read is one long run of the models, and each step of a response (its headers, its body, the
        // render it sets off) waits for the read in progress to end, so reading on cost a whole read per step, about
        // 1.4s of a phone's 3s frame-to-guess (the speed lane's measure, 2026-10-16). The card in view is read
        // again once the answer is in.
        while (!stop && (scanner.waiting() || committing.current || loadingChoices.current)) await afterPaint();
      }
    })();
    return () => {
      stop = true;
      scanner.stop();
    };
  }, [active, videoEl, blocked, now]);

  // The answer is drawn: the timing row's frame-to-guess ends at this commit, which the next paint shows.
  useLayoutEffect(() => {
    if (server.kind === "match") depsRef.current.timer?.answered(now());
  }, [server, now]);

  // A refusal or failure is said once, as it arrives; the screen goes back to looking.
  const lastProblem = useRef<ServerState["kind"] | null>(null);
  useEffect(() => {
    if ((server.kind === "failed" || server.kind === "refused") && lastProblem.current !== server.kind) onProblem(server.kind);
    lastProblem.current = server.kind;
  }, [server, onProblem]);

  // The added panel and the flip clear themselves.
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(null), ADDED_MS);
    return () => clearTimeout(t);
  }, [added]);

  const inputs = { blocked, server, cardInView: read.cardInView, dark: read.dark, held, added, onList: listed, lastAdded, dismissed };
  // The screen as the camera reads it, before Normal's printing step takes the panel over.
  const reading = scanScreen(inputs);
  const screen = choosing ? scanScreen({ ...inputs, choosing }) : reading;
  const answer = server.kind === "match" ? server.result : null;
  const snapNow = useCallback(
    (): Snap => ({ named: server.kind === "match" ? server.result.guesses.slice(0, 3).map(toScanGuess) : [], crop: lastCrop.current, empties: empties.current }),
    [server],
  );


  // The screen says a card is on the list only once the list has it: a printings read that failed says so instead.
  const commit = useCallback(
    async (g: ScanGuess, given?: Snap, picked?: ScanPicked): Promise<boolean> => {
      // A press during an add in flight still let go of its hold: clear it before the one-at-a-time guard, or the
      // scanner would show Held, with the feed frozen, once the first add's panel goes.
      setHeld(null);
      if (committing.current) {
        // That press is discarded, and its snapshot with it, or a later add of the card would carry its photo.
        heldSnap.current = null;
        return false;
      }
      committing.current = true;
      const startedAt = now();
      try {
        // A held card adds what the scanner saw when the press went down; frames read since are another moment.
        const snap = given ?? (heldSnap.current?.oracleId === g.oracleId ? heldSnap.current : snapNow());
        heldSnap.current = null;
        const capture: ScanCapture = {
          photo: snap.crop ? (depsRef.current.photo ?? photoOf)(snap.crop) : null,
          guesses: [g, ...snap.named.filter((x) => x.oracleId !== g.oracleId)].slice(0, 3).map(({ oracleId, name, imageUri }) => ({ oracleId, name, imageUri })),
        };
        if (!(await onAdd(g, mode, capture, picked))) {
          onProblem("notAdded");
          return false;
        }
        // A press made while this add waited is over with it: the Added panel replaces its button, so no release
        // would ever clear that hold, or its snapshot.
        setHeld(null);
        heldSnap.current = null;
        setChoosing(null);
        depsRef.current.timer?.added(startedAt, now());
        setLastAdded({ oracleId: g.oracleId, emptiedSince: empties.current !== snap.empties });
        setAdded({ name: g.name, imageUri: g.imageUri });
        return true;
      } finally {
        committing.current = false;
      }
    },
    [onAdd, mode, onProblem, snapNow, now],
  );

  // Normal mode's printing step, in the camera (Hugh, 2026-10-16): the card is held on the panel while its printings
  // load and the player picks one. A read that fails, or finds none, says so and turns that answer down, so the step
  // does not open again for the card still in view.
  const choose = useCallback((g: ScanGuess, snap: Snap, from: object | null) => {
    const seq = ++chooseSeq.current;
    setChoosing({ guess: g, snap, answer: from, choices: null });
    const load = depsRef.current.loadChoices;
    loadingChoices.current = true;
    void Promise.resolve()
      .then(() => (load ? load(g.oracleId) : []))
      .catch(() => [] as PrintingChoice[])
      .then((choices) => {
        if (seq === chooseSeq.current) loadingChoices.current = false;
        if (seq !== chooseSeq.current) return;
        if (choices.length > 0) return setChoosing((c) => (c ? { ...c, choices } : c));
        setChoosing(null);
        setDismissed(from);
        onProblemRef.current("notAdded");
      });
  }, []);
  const stopChoosing = useCallback(() => {
    chooseSeq.current++;
    loadingChoices.current = false;
    setChoosing(null);
  }, []);

  // A sure answer goes on by itself (Hugh, 2026-10-16): in Fast straight onto the list at its first printing, in
  // Normal to the printing step. A card the scanner has just added and that never left the frame is not taken again
  // (R1), and Add another copy is a press. Below the gate the panel still asks Not sure, Which is it?.
  const sure = reading.kind === "scanning" && reading.panel.kind === "sure" && !reading.panel.held ? reading.panel : null;
  // A layout effect, so the take has begun (and the read loop waits for it) before the frame that draws the answer
  // is painted: the loop reads the next frame only after that paint.
  useLayoutEffect(() => {
    if (!sure || added || choosing || committing.current) return;
    if (sure.again?.kind === "duplicate") return;
    if (lastAdded?.oracleId === sure.guess.oracleId && !lastAdded.emptiedSince) return;
    if (taken.current && taken.current.answer === answer && taken.current.mode === mode) return;
    taken.current = { answer, mode };
    const g = sure.guess;
    const snap = snapNow();
    const from = answer;
    void Promise.resolve().then(async () => {
      if (mode === "normal") return choose(g, snap, from);
      // A card that could not be added is not tried again while it stays in view: the toast said so once.
      if (!(await commit(g, snap))) setDismissed(from);
    });
  });

  // Through useCallback, so a render never reads the deps ref: only the press does.
  const setMode = useCallback((m: ScanMode) => {
    // The mode already on changes nothing, and leaves an open printing step alone.
    if (m === modeRef.current) return;
    // A printing step open when Fast is chosen is left: the card is read again under the new mode.
    stopChoosing();
    depsRef.current.timer?.modePressed(now());
    setModeState(m);
    writeScanMode(depsRef.current.storage === undefined ? safeLocalStorage() : depsRef.current.storage, m);
  }, [stopChoosing, now]);

  const current = screen.kind === "scanning" && screen.panel.kind === "sure" ? screen.panel.guess : null;
  const notSure = screen.kind === "scanning" && screen.panel.kind === "notSure" ? screen.panel.guesses : [];

  return {
    screen,
    mode,
    torch: { available: torch.handle?.available ?? false, on: torch.on },
    count: [...listed.values()].reduce((a, b) => a + b, 0),
    flipTo: added?.imageUri ?? null,
    attachVideo: setVideoEl,
    setMode,
    toggleTorch: () => {
      const h = torch.handle;
      // One change at a time: a second press before the camera answers would ask for the same state again.
      if (!h?.available || torchBusy.current) return;
      torchBusy.current = true;
      const next = !torch.on;
      void h
        .set(next)
        .then((ok) => ok && setTorch((t) => ({ ...t, on: next })))
        .finally(() => {
          torchBusy.current = false;
        });
    },
    hold: () => {
      if (!current) return;
      heldSnap.current = {
        oracleId: current.oracleId,
        named: server.kind === "match" ? server.result.guesses.slice(0, 3).map(toScanGuess) : [],
        crop: lastCrop.current,
        empties: empties.current,
      };
      setHeld(current);
    },
    cancelHold: () => {
      heldSnap.current = null;
      setHeld(null);
    },
    add: () => {
      const g = held ?? current;
      if (!g) return;
      if (mode === "fast") return void commit(g);
      // Normal's Add another copy opens the printing step with what the scanner saw when the press went down.
      const snap = heldSnap.current?.oracleId === g.oracleId ? heldSnap.current : snapNow();
      heldSnap.current = null;
      setHeld(null);
      choose(g, snap, answer);
    },
    dismiss: () => setDismissed(answer),
    pick: (oracleId) => {
      const g = notSure.find((x) => x.oracleId === oracleId);
      if (!g) return;
      if (mode === "fast") return void commit(g);
      choose(g, { named: notSure, crop: lastCrop.current, empties: empties.current }, answer);
    },
    choosePrinting: (printing) => {
      const c = choosing;
      if (!c?.choices?.some((x) => x.scryfallId === printing.scryfallId)) return;
      void commit(c.guess, c.snap, { choices: c.choices, printing });
    },
    notThis: () => {
      if (!choosing) return;
      setDismissed(choosing.answer);
      stopChoosing();
    },
  };
}

/**
 * After the next frame is painted: a task queued from an animation frame runs after that frame's paint. The read loop
 * waits for it before each read, which is one long run of the models, so what the last read set (an answer, the
 * card's outline) is on screen first rather than a whole read later.
 */
export async function afterPaint(): Promise<void> {
  await nextFrame();
  await new Promise<void>((r) => setTimeout(r, 0));
}

/** The next animation frame, or a short timeout where there is none (a test DOM, a hidden tab's throttle aside). */
export function nextFrame(): Promise<void> {
  return new Promise((r) => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => r()) : setTimeout(r, 16)));
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
