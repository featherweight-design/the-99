"use client";

// The card-scan lab's camera loop (`/lab/scan`). Everything runs on the device: the frame is drawn
// to a canvas, the detector finds the four corners, the card is warped to 320x448, embedded, and
// matched against the card index. Only a ✓/✗ tap sends anything, and a frame only with Keep this
// frame ticked (the default). After a ✗ tap, an optional "What card was it?" step under the controls
// names the card it really was. Unstyled beyond the tokens: it is a measuring page with no design handoff.

import { useCallback, useEffect, useRef, useState } from "react";
import { scanLabCopy as copy } from "../../lib/copy/scan-lab";
import { EMBED_H, EMBED_W } from "../../lib/scan/geometry";
import { agreedRun, agreement, parseIndex, topOracles, type IndexMeta, type ScanIndex } from "../../lib/scan/match";
import { readingCrop, streamHolder, tapBody, type Reading } from "../../lib/scan/reading";
import { ageSteady, nextSteady, startSteady, type Display, type SteadyState } from "../../lib/scan/steady";
import { CADENCE_MS, cadenceDone, logFrame, pressedDuringRun, startCadence, type CadenceRun } from "../../lib/scan-lab/cadence";
import { sessionHolder } from "../../lib/scan/sessions";
import { TrueCardStep } from "./true-card-step";
import { Checkbox } from "../ui/checkbox";
import { ScanControls, tensorToImage, type Tap } from "./scan-controls";
import { AGREE_FRAMES, AGREE_MARGIN } from "../../lib/scan/models";
import { torchOf, type Torch } from "../../lib/scan/camera";
import { framePipeline, loadModels, loadOrt, type OrtSession } from "../../lib/scan/pipeline";
import { serverScanner, type ServerState } from "../../lib/scan/server-scan";

async function loadIndex(base: string): Promise<ScanIndex> {
  const root = base.endsWith("/") ? base : `${base}/`;
  const [meta, bin] = await Promise.all([
    fetch(`${root}scan-index.json`).then((r) => r.json() as Promise<IndexMeta>),
    fetch(`${root}scan-index.bin`).then((r) => r.arrayBuffer()),
  ]);
  return parseIndex(meta, bin);
}

// The camera loop's own clock; read from handlers, never while rendering.
const clock = () => performance.now();

export function ScanLab({ indexBase, serverModel = null }: {
  indexBase: string | null;
  /** The embedder build the server's index was made by, when server matching is on for this reader; null hides it. */
  serverModel?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const running = useRef(false);
  const history = useRef<{ oracleId: string; margin: number }[]>([]);
  const stream = useRef(streamHolder<MediaStream>());
  const sessions = useRef(sessionHolder<OrtSession>());
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  // What the screen says: the steady reading (`steady.ts`), never a one-frame flicker.
  const steady = useRef<SteadyState>(startSteady(0));
  const [display, setDisplay] = useState<Display>(() => startSteady(0));
  // On from the first tap and kept across taps, so a run of photos needs no box ticked. Unticking it, which is
  // also kept, keeps every pixel on the device.
  const [keepFrame, setKeepFrame] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [taps, setTaps] = useState({ n: 0, right: 0 });
  // The ✗ row the "What card was it?" step labels; any new tap replaces or closes it.
  const [missed, setMissed] = useState<string | null>(null);
  const tapSeq = useRef(0);
  const indexVersion = useRef("unknown");
  // The cadence log's run while "Log every frame" is on (`cadence.ts`): the loop adds each frame's reading, and the
  // run is posted when its 30 seconds are up or the box is unticked. Readings only, never an image.
  const cadence = useRef<CadenceRun | null>(null);
  // What the screen holds while a press holds it (`ScanControls`), so the log records what the player saw; and the
  // window of the last run, so a tap pressed inside it keeps no frame even when its save lands after the run ended.
  const heldDisplay = useRef<Display | null>(null);
  const lastRun = useRef<{ start: number; end: number } | null>(null);
  const [logged, setLogged] = useState<number | null>(null);
  // Matching on the server (card-scan plan PR 2): while the box is selected each frame goes through the server
  // scanner, which asks the server once per steady card, in place of the index on this device.
  const server = useRef<ReturnType<typeof serverScanner> | null>(null);
  const [serverOn, setServerOn] = useState(false);
  // Frames in a row the server's answer has stood for the card in view: the server path's "same answer on N frames".
  const serverRun = useRef<{ oracleId: string; n: number } | null>(null);
  const onServerState = useCallback((st: ServerState) => {
    if (st.kind === "looking") setNote(copy.serverLooking);
    else if (st.kind === "retrying") setNote(copy.serverRetrying);
    else if (st.kind === "failed") setNote(copy.serverFailed);
    else if (st.kind === "refused") setNote(copy.serverRefused[st.reason]);
    else setNote(null);
  }, []);
  const [torch, setTorch] = useState<Torch | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const toggleTorch = async (on: boolean) => {
    if (torch && (await torch.set(on))) setTorchOn(on);
  };
  // The frame is too dark to read a card from: set from the loop only when it changes.
  const [dark, setDark] = useState(false);
  const darkNow = useRef(false);
  const finishLog = useCallback(async () => {
    const run = cadence.current;
    if (!run) return;
    cadence.current = null;
    lastRun.current = { start: run.startedAt, end: clock() };
    setLogged(null);
    if (run.frames.length === 0) {
      setNote(copy.logEmpty);
      return;
    }
    const res = await fetch("/api/scan-lab/cadence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // the index that served the run's readings (the server's, while matching there), else the page's own
      body: JSON.stringify({ indexVersion: run.index ?? indexVersion.current, frames: run.frames }),
    }).catch(() => null);
    setNote(res?.ok ? copy.logged(run.frames.length) : copy.logFailed);
  }, []);
  const toggleServer = useCallback((on: boolean) => {
    // a log run reads one matcher: switching ends it, and the next run starts on the new one
    if (cadence.current) void finishLog();
    server.current?.stop();
    server.current = on && serverModel
      ? serverScanner(serverModel, { fetch: (u, i) => fetch(u, i), wait: (ms) => new Promise((r) => setTimeout(r, ms)), now: clock }, onServerState)
      : null;
    setServerOn(server.current !== null);
    setNote(null);
  }, [serverModel, onServerState, finishLog]);
  // No index on this deployment: the lab still runs, matching on the server alone, when the reader may.
  const serverOnly = !indexBase && serverModel !== null;
  const toggleLog = (on: boolean) => {
    if (!on) {
      void finishLog();
      return;
    }
    const run = startCadence(clock());
    cadence.current = run;
    setLogged(0);
    // A camera that stops sending frames still ends the run on time.
    setTimeout(() => { if (cadence.current?.startedAt === run.startedAt) void finishLog(); }, CADENCE_MS + 1000);
  };

  useEffect(() => {
    const held = stream.current;
    const models = sessions.current;
    held.open();
    models.open();
    return () => {
      running.current = false;
      server.current?.stop();
      held.close();
      models.close();
    };
  }, []);

  const start = useCallback(async () => {
    const fail = (e: unknown) => {
      running.current = false;
      stream.current.close();
      sessions.current.close();
      history.current = [];
      steady.current = startSteady(performance.now());
      setDisplay(steady.current);
      setStatus("error");
      setError(`${copy.failed} ${e instanceof Error ? e.message : ""}`);
    };
    if (!indexBase && !serverModel) {
      setStatus("error");
      setError(copy.noIndex);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError(copy.noCamera);
      return;
    }
    setStatus("loading");
    try {
      const [ort, index, media] = await Promise.all([
        loadOrt(),
        indexBase ? loadIndex(indexBase) : Promise.resolve(null),
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        }).then((m) => {
          // held from the moment it exists, so a failure elsewhere, or leaving the page, stops it
          if (!stream.current.accept(m)) throw new Error("left the page");
          return m;
        }),
      ]);
      indexVersion.current = index?.meta.version ?? "server";
      if (!index) toggleServer(true);
      // each held as it loads, so a failed sibling or leaving the page releases it, even late
      const models = await loadModels(ort, (s) => {
        if (!sessions.current.accept(s)) throw new Error("left the page");
        return s;
      });
      const video = videoRef.current;
      if (!video) {
        stream.current.close();
        sessions.current.close();
        return;
      }
      setTorch(torchOf(media.getVideoTracks()[0]));
      video.srcObject = media;
      await video.play();
      if (!stream.current.holds(media)) return; // the page was left while the camera started
      setStatus("running");
      running.current = true;
      steady.current = startSteady(performance.now());
      setDisplay(steady.current);
      // Each frame's reading goes through the dwell; the screen re-renders only when what it shows moved.
      const publish = (r: Reading) => {
        const now = performance.now();
        const next = nextSteady(steady.current, r, now);
        if (next.reading !== steady.current.reading || next.changedAt !== steady.current.changedAt) setDisplay(next);
        steady.current = next;
        const run = cadence.current;
        if (run) {
          const more = logFrame(run, r, heldDisplay.current ?? next, now);
          cadence.current = more;
          if (more !== run) setLogged(more.frames.length);
          if (cadenceDone(more, now)) void finishLog();
        }
      };
      const pipe = framePipeline(ort, models, (fn) => sessions.current.use(fn));
      // No card: nothing a tap records may describe an earlier one, the kept frame included, but
      // the detector did run, so its timing is this frame's.
      const noCard = (t0: number, detMs: number) => {
        history.current = [];
        // the server path's run of agreeing frames breaks on a frame with no card, as the device path's does
        serverRun.current = null;
        server.current?.frame({ kind: "none" }, performance.now());
        publish({ kind: "none", detMs, totalMs: Math.round(performance.now() - t0) });
      };
      const loop = async () => {
        if (!running.current) return;
        const t0 = performance.now();
        const read = await pipe.read(video, () => running.current);
        if (!running.current) return;
        if (read) {
          if (read.dark !== darkNow.current) {
            darkNow.current = read.dark;
            setDark(read.dark);
          }
          if (read.kind === "none") {
            noCard(t0, read.detMs);
          } else {
            const { crop, embedding: q, detMs, embMs } = read;
            const t2 = performance.now();
            const viaServer = server.current;
            if (viaServer) {
              // Asked once per steady card; until the answer lands the screen keeps what it shows.
              const st = viaServer.frame({ kind: "card", embedding: q }, t2, t0);
              if (st.kind === "match") {
                const { guesses, margin, sure, index: served } = st.result;
                const top = guesses[0]?.oracleId ?? "";
                serverRun.current = serverRun.current?.oracleId === top ? { oracleId: top, n: serverRun.current.n + 1 } : { oracleId: top, n: 1 };
                // the reading carries the server's index, so a tap on it records that one, not the device's
                publish({
                  kind: "card", crop, guesses, margin: margin ?? 1, agreed: serverRun.current.n, committed: sure, index: served,
                  // from the frame that asked to the answer, not this later frame's own work
                  detMs, embMs, matchMs: st.ms, totalMs: st.totalMs,
                });
              } else {
                serverRun.current = null;
                // no answer for this frame: the screen may only lose what it shows, on time, and the log still
                // records the frame, as a card waiting on its answer
                const now = performance.now();
                const aged = ageSteady(steady.current, now);
                if (aged.changedAt !== steady.current.changedAt) setDisplay(aged);
                steady.current = aged;
                const run = cadence.current;
                if (run) {
                  const more = logFrame(run, "pending", heldDisplay.current ?? aged, now);
                  cadence.current = more;
                  if (more !== run) setLogged(more.frames.length);
                  if (cadenceDone(more, now)) void finishLog();
                }
              }
            } else if (index) {
              const guesses = topOracles(index, q, 5);
              const t3 = performance.now();
              const margin = guesses.length > 1 ? guesses[0].score - guesses[1].score : 1;
              history.current = [...history.current.slice(-9), { oracleId: guesses[0].oracleId, margin }];
              const agreed = agreedRun(history.current, AGREE_MARGIN);
              const committed = agreement(history.current, AGREE_FRAMES, AGREE_MARGIN) !== null;
              // the crop and the verdict it produced are published together, as one reading
              publish({
                kind: "card", crop, guesses, margin, agreed, committed, index: index.meta.version,
                detMs, embMs, matchMs: Math.round(t3 - t2), totalMs: Math.round(t3 - t0),
              });
            }
          }
        }
        setTimeout(tick, 60);
      };
      // Every iteration's rejection lands here, the timer's included: a frame that fails stops the
      // scan and the camera, and leaves no reading a tap could save.
      const tick = () => { loop().catch(fail); };
      tick();
    } catch (e) {
      fail(e);
    }
  }, [indexBase, serverModel, finishLog, toggleServer]);

  const record = useCallback(async (tap: Tap, correct: boolean) => {
    // one reading, the one the player was looking at (`ScanControls` holds it from the press, and `tapTarget` takes the
    // one before a change the press came too soon to react to): its verdict, its timings and its own crop
    const r = tap.reading;
    const crop = readingCrop(r);
    setMissed(null);
    const mine = ++tapSeq.current;
    let frame: string | null = null;
    // A log run keeps readings only: no frame goes with a tap PRESSED while it ran, whenever its save lands.
    if (keepFrame && crop && !pressedDuringRun(tap.pressedAt, cadence.current, lastRun.current)) {
      const c = document.createElement("canvas");
      c.width = EMBED_W;
      c.height = EMBED_H;
      c.getContext("2d")?.putImageData(tensorToImage(crop, EMBED_W, EMBED_H), 0, 0);
      frame = c.toDataURL("image/jpeg", 0.85).split(",")[1] ?? null;
    }
    const res = await fetch("/api/scan-lab/result", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tapBody(r, correct, indexVersion.current, frame, tap)),
    }).catch(() => null);
    if (res?.ok) {
      setTaps((t) => ({ n: t.n + 1, right: t.right + (correct ? 1 : 0) }));
      setNote(copy.saved);
      if (!correct) {
        const body = (await res.json().catch(() => null)) as { id?: unknown } | null;
        // a later tap already closed this miss's step, so a late answer does not reopen it
        if (typeof body?.id === "string" && mine === tapSeq.current) setMissed(body.id);
      }
    } else {
      setNote(copy.saveFailed);
    }
  }, [keepFrame]);

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[12px] px-[16px] py-[20px] text-[color:var(--fg)]">
      <h1 className="m-0 font-display text-[22px] font-bold">{copy.title}</h1>
      <p className="m-0 text-[14px] text-[color:var(--fg-muted)]">{copy.intro}</p>
      {status === "idle" && (
        <button type="button" onClick={() => void start()} className="self-start rounded-[8px] border px-[14px] py-[8px] text-[14px]">
          {copy.start}
        </button>
      )}
      {status === "loading" && <p className="m-0 text-[14px]">{copy.loading}</p>}
      {status === "error" && <p className="m-0 text-[14px]">{error}</p>}
      <video ref={videoRef} playsInline muted autoPlay className="w-full rounded-[8px]" />
      {status === "running" && (
        <ScanControls display={display} keepFrame={keepFrame} onKeepFrame={setKeepFrame} onVerdict={record} onHold={(h) => { heldDisplay.current = h; }}>
          <span className="text-[12px] text-[color:var(--fg-muted)]">
            {copy.taps(taps.n, taps.right)}
            {note ? ` · ${note}` : ""}
          </span>
          {/* Outside the controls area, so ticking it never holds the reading. */}
          {serverModel && !serverOnly && (
            <label className="flex touch-manipulation items-center gap-[8px] text-[14px]">
              <Checkbox checked={serverOn} onChange={toggleServer} />
              {copy.serverMatch}
            </label>
          )}
          {torch?.available && (
            <label className="flex touch-manipulation items-center gap-[8px] text-[14px]">
              <Checkbox checked={torchOn} onChange={(on) => void toggleTorch(on)} />
              {copy.torch}
            </label>
          )}
          {dark && <span className="text-[12px] text-[color:var(--warning)]">{copy.tooDark}</span>}
          <label className="flex touch-manipulation items-center gap-[8px] text-[14px]">
            <Checkbox checked={logged !== null} onChange={toggleLog} />
            {logged === null ? copy.logFrames : copy.logging(logged)}
          </label>
          {/* Under the controls, so opening it never moves them; keyed so a new miss starts empty. */}
          {missed && (
            <TrueCardStep
              key={missed}
              resultId={missed}
              onDone={(done) => {
                setMissed(null);
                if (done) setNote(done);
              }}
            />
          )}
        </ScanControls>
      )}
    </div>
  );
}
