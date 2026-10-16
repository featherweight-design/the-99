"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SCAN_MODEL } from "../../../lib/card-scan/match";
import { CAMERA_CONSTRAINTS, torchOf, type Torch } from "../../../lib/scan/camera";
import { serverScanner, type ServerState } from "../../../lib/scan/server-scan";
import type { ScanFrame } from "../../../lib/scan/stable-card";
import { readScanMode, writeScanMode } from "./mode-memory";
import type { ScanGuess, ScanMode, ScanScreen } from "./scan-view";
import { scanScreen } from "./screen-state";

/** One read of the camera: the detector's and embedder's answer for the frame (2c's module, injected), and whether it
 * was too dark to read. */
export type FrameRead = { frame: ScanFrame; cardInView: boolean; dark: boolean };

/** How long the added panel and the tray's flip stay up (READINESS: "about 0.8s"). */
export const ADDED_MS = 800;
/** How long frames must stay dark before the dark line shows. */
export const DARK_HOLD_MS = 1000;

export type CardScanDeps = {
  /** Reads the video's current frame. Resolves when the detector and embedder are done with it. */
  readFrame: (video: HTMLVideoElement) => Promise<FrameRead>;
  getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>;
  fetch?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
  now?: () => number;
  storage?: Storage | null;
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
  onAdd: (guess: ScanGuess, mode: ScanMode) => void,
  onProblem: (kind: "failed" | "refused") => void,
): CardScan {
  // The caller's deps are read through a ref, so a new object each render never restarts the camera or the loop.
  const depsRef = useRef(deps);
  useEffect(() => {
    depsRef.current = deps;
  });
  const now = useCallback(() => (depsRef.current.now ?? (() => performance.now()))(), []);
  const [mode, setModeState] = useState<ScanMode>(() => readScanMode(deps.storage === undefined ? safeLocalStorage() : deps.storage));
  const [blocked, setBlocked] = useState(false);
  const [server, setServer] = useState<ServerState>({ kind: "idle" });
  const [read, setRead] = useState<{ cardInView: boolean; dark: boolean }>({ cardInView: false, dark: false });
  const [held, setHeld] = useState<ScanGuess | null>(null);
  const [added, setAdded] = useState<{ name: string; imageUri: string | null } | null>(null);
  const [onList, setOnList] = useState<Map<string, number>>(() => new Map());
  const [lastAdded, setLastAdded] = useState<{ oracleId: string; emptiedSince: boolean } | null>(null);
  const [dismissed, setDismissed] = useState<object | null>(null);
  // Dark only once a dark frame has held for `DARK_HOLD_MS` (READINESS: "for about 1s"), so one dim frame never
  // flickers the line; a bright frame ends it at once.
  const darkSince = useRef<number | null>(null);
  const [torch, setTorch] = useState<{ handle: Torch | null; on: boolean }>({ handle: null, on: false });
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  // The camera, while the scanner is open and the element exists. A refusal (or no camera) is the blocked screen.
  useEffect(() => {
    if (!active || !videoEl) return;
    let stream: MediaStream | null = null;
    let gone = false;
    const gum = depsRef.current.getUserMedia ?? ((c: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(c));
    gum(CAMERA_CONSTRAINTS).then(
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
      setServer,
    );
    (async () => {
      while (!stop) {
        const t = now();
        let r: FrameRead;
        try {
          r = await depsRef.current.readFrame(videoEl);
        } catch {
          await new Promise((res) => setTimeout(res, 250));
          continue;
        }
        if (stop) break;
        const at = now();
        if (!r.dark) darkSince.current = null;
        else if (darkSince.current === null) darkSince.current = at;
        const dark = darkSince.current !== null && at - darkSince.current >= DARK_HOLD_MS;
        setRead((prev) => (prev.cardInView === r.cardInView && prev.dark === dark ? prev : { cardInView: r.cardInView, dark }));
        if (r.frame.kind === "none") setLastAdded((l) => (l && !l.emptiedSince ? { ...l, emptiedSince: true } : l));
        scanner.frame(r.frame, now(), t);
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

  const inputs = { blocked, server, cardInView: read.cardInView, dark: read.dark, held, added, onList, lastAdded, dismissed };
  const screen = scanScreen(inputs);

  const commit = useCallback(
    (g: ScanGuess) => {
      onAdd(g, mode);
      setOnList((m) => new Map(m).set(g.oracleId, (m.get(g.oracleId) ?? 0) + 1));
      setLastAdded({ oracleId: g.oracleId, emptiedSince: false });
      setAdded({ name: g.name, imageUri: g.imageUri });
      setHeld(null);
    },
    [onAdd, mode],
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
    count: [...onList.values()].reduce((a, b) => a + b, 0),
    flipTo: added?.imageUri ?? null,
    attachVideo: setVideoEl,
    setMode,
    toggleTorch: () => {
      const h = torch.handle;
      if (!h?.available) return;
      const next = !torch.on;
      void h.set(next).then((ok) => ok && setTorch((t) => ({ ...t, on: next })));
    },
    hold: () => current && setHeld(current),
    cancelHold: () => setHeld(null),
    add: () => {
      const g = held ?? current;
      if (g) commit(g);
    },
    dismiss: () => setDismissed(server.kind === "match" ? server.result : null),
    pick: (oracleId) => {
      const g = notSure.find((x) => x.oracleId === oracleId);
      if (g) commit(g);
    },
  };
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
