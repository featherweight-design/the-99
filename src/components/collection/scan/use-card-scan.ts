"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SCAN_MODEL } from "../../../lib/card-scan/match";
import { CAMERA_CONSTRAINTS, torchOf, type Torch } from "../../../lib/scan/camera";
import type { Source } from "../../../lib/scan/pipeline";
import { serverScanner, type ServerState } from "../../../lib/scan/server-scan";
import type { ScanFrame } from "../../../lib/scan/stable-card";
import { photoOf } from "../../../lib/scan/photo";
import type { ScanSource } from "../../../lib/collection/add-lines";
import { readScanMode, writeScanMode } from "./mode-memory";
import type { ScanGuess, ScanMode, ScanScreen } from "./scan-view";
import { scanScreen, toScanGuess } from "./screen-state";

/** One read of the camera: the detector's and embedder's answer for the frame (2c's module, injected), whether it
 * was too dark to read, and the card as the embedder saw it (its normalised crop), for the list's "Your scan". */
export type FrameRead = { frame: ScanFrame; cardInView: boolean; dark: boolean; crop?: Float32Array };

/** What an add carries with it: the card's photo as read, and the closest cards, the added one first (L2). */
export type ScanCapture = ScanSource;

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
  /** Puts the card on the list; answers false when it could not (its printings would not load). */
  onAdd: (guess: ScanGuess, mode: ScanMode, scan: ScanCapture) => Promise<boolean>,
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
  const [blocked, setBlocked] = useState(false);
  const [server, setServer] = useState<ServerState>({ kind: "idle" });
  const [read, setRead] = useState<{ cardInView: boolean; dark: boolean }>({ cardInView: false, dark: false });
  const [held, setHeld] = useState<ScanGuess | null>(null);
  const [added, setAdded] = useState<{ name: string; imageUri: string | null } | null>(null);
  const [lastAdded, setLastAdded] = useState<{ oracleId: string; emptiedSince: boolean } | null>(null);
  const [dismissed, setDismissed] = useState<object | null>(null);
  // Dark only once a dark frame has held for `DARK_HOLD_MS` (READINESS: "for about 1s"), so one dim frame never
  // flickers the line; a bright frame ends it at once.
  const darkSince = useRef<number | null>(null);
  const [torch, setTorch] = useState<{ handle: Torch | null; on: boolean }>({ handle: null, on: false });
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const torchBusy = useRef(false);
  // The newest frame that held a card: the card an add is pressed for is still in view, so its photo is this one.
  const lastCrop = useRef<Float32Array | null>(null);

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
        if (r.frame.kind === "none") setLastAdded((l) => (l && !l.emptiedSince ? { ...l, emptiedSince: true } : l));
        // The scanner's own answer for this frame: a match the frame no longer shows is withdrawn here, not through
        // its callback, so a press never adds the card that was in view before this one.
        setServer(scanner.frame(r.frame, now(), t));
        // Always hand the browser a turn: a read that answers at once (the camera has no size yet, or no card)
        // would otherwise spin this loop on resolved promises and starve the very events that give the video its size.
        await nextFrame();
      }
    })();
    return () => {
      stop = true;
      scanner.stop();
    };
  }, [active, videoEl, blocked, now]);

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
  const screen = scanScreen(inputs);

  // One add at a time: a second tap while the first waits for its printings would add the card again unasked.
  const committing = useRef(false);
  // The screen says a card is on the list only once the list has it: a printings read that failed says so instead.
  const commit = useCallback(
    async (g: ScanGuess) => {
      // A press during an add in flight still let go of its hold: clear it before the one-at-a-time guard, or the
      // scanner would show Held, with the feed frozen, once the first add's panel goes.
      setHeld(null);
      if (committing.current) return;
      committing.current = true;
      try {
        const named = server.kind === "match" ? server.result.guesses.slice(0, 3).map(toScanGuess) : [];
        const crop = lastCrop.current;
        const capture: ScanCapture = {
          photo: crop ? (depsRef.current.photo ?? photoOf)(crop) : null,
          guesses: [g, ...named.filter((x) => x.oracleId !== g.oracleId)].slice(0, 3).map(({ oracleId, name, imageUri }) => ({ oracleId, name, imageUri })),
        };
        if (!(await onAdd(g, mode, capture))) {
          onProblem("notAdded");
          return;
        }
        // A press made while this add waited is over with it: the Added panel replaces its button, so no release
        // would ever clear that hold.
        setHeld(null);
        setLastAdded({ oracleId: g.oracleId, emptiedSince: false });
        setAdded({ name: g.name, imageUri: g.imageUri });
      } finally {
        committing.current = false;
      }
    },
    [onAdd, mode, onProblem, server],
  );

  // Through useCallback, so a render never reads the deps ref: only the press does.
  const setMode = useCallback((m: ScanMode) => {
    setModeState(m);
    writeScanMode(depsRef.current.storage === undefined ? safeLocalStorage() : depsRef.current.storage, m);
  }, []);

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
    hold: () => current && setHeld(current),
    cancelHold: () => setHeld(null),
    add: () => {
      const g = held ?? current;
      if (g) void commit(g);
    },
    dismiss: () => setDismissed(server.kind === "match" ? server.result : null),
    pick: (oracleId) => {
      const g = notSure.find((x) => x.oracleId === oracleId);
      if (g) void commit(g);
    },
  };
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
