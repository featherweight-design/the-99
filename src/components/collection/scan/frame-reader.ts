"use client";

import { useCallback, useEffect, useRef } from "react";
import { framePipeline, loadModelBytes, loadModels, loadOrt, sourceSize, type OrtSession, type Source } from "../../../lib/scan/pipeline";
import type { OutlineStore } from "../../../lib/scan/outline";
import { sessionHolder } from "../../../lib/scan/sessions";
import { SCANNER_GPU_START, scannerGpuEmbedder } from "../../../lib/scan/gpu-start";
import { pageReadsInWorker, ReaderGone, startWorkerReader, type WorkerReader } from "../../../lib/scan/read-worker-client";
import type { FrameRead } from "./use-card-scan";

type Pipe = Pick<ReturnType<typeof framePipeline>, "read">;

/**
 * `useCardScan`'s `readFrame` on the phone's own detector and embedder (`src/lib/scan/pipeline.ts`, 2c). The runtime
 * and both models start loading as the scanner mounts, beside the camera's own start rather than after it (lane 58,
 * 2026-11-13: the first card waited on both, one after the other), and every session is released when the scanner
 * closes (`sessionHolder`), a load that finishes after it closed included. `onReady` hears once that both models are
 * loaded and warmed. A frame the pipeline cannot read yet (the camera has no size) reads as no card. A chosen photo
 * goes through the same reader, so photos and the camera share one load of the models. A live frame also hands the
 * card's outline to `outline`, for the viewfinder to draw where the card is (a chosen photo has no viewfinder, so it
 * never does).
 *
 * Reads run in a worker where the browser can (`read-worker-client.ts`, card-scan speed lane PR D), so the page's
 * thread only captures each frame; elsewhere, and for the rest of a session whose worker failed, on the main thread as
 * before. A frame that was in a worker when it went reads as no card, quietly.
 */
export function useFrameReader(outline?: OutlineStore, onReady?: () => void): (source: Source) => Promise<FrameRead> {
  // One holder per load attempt: a failed attempt closes its own, so a model that loaded beside one that failed (or
  // finishes loading after) is released rather than kept for a pipeline that will never run.
  const sessions = useRef<ReturnType<typeof sessionHolder<OrtSession>> | null>(null);
  const pipe = useRef<Promise<Pipe> | null>(null);
  const alive = useRef(true);
  // This attempt's WebGPU load: the embedder's bytes, kept from the open until the WebGPU embedder settles (it may read
  // them at open and again after the first answer) or the scanner closes, and the abort its close sends to a runtime
  // download under way. A close drops the bytes, and the next open reads them from Cache Storage again.
  const gpuLoad = useRef<{ bytes: Promise<Uint8Array>; abort: AbortController } | null>(null);
  // This open's read worker, terminated as the scanner closes, and whether its reads went back to the main thread.
  const worker = useRef<WorkerReader | null>(null);
  const mainOnly = useRef(false);
  // The abort for a worker still starting: the close terminates it at once, whatever stage it reached.
  const workerStart = useRef<AbortController | null>(null);
  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  });

  const ensure = useCallback((): Promise<Pipe> => {
    if (pipe.current) return pipe.current;
    // A read that lands after the scanner closed must not load models nothing would ever release.
    if (!alive.current) return Promise.reject(new Error("the scanner closed"));
    const held = sessionHolder<OrtSession>();
    sessions.current = held;
    const attempt = (async () => {
      // The runtime and the model files download side by side; the sessions need both.
      // `report`: the scanner's load feeds its loading panel (`model-progress.ts`).
      const bytes = loadModelBytes(undefined, { report: true });
      if (!mainOnly.current && pageReadsInWorker()) {
        const start = new AbortController();
        workerStart.current = start;
        const reader = await startWorkerReader(bytes, {
          gpuMode: SCANNER_GPU_START,
          signal: start.signal,
          // The worker went mid-session: the next frame loads the main thread's reader, as on a first open.
          onGone: () => {
            mainOnly.current = true;
            if (worker.current === reader) worker.current = null;
            if (pipe.current === attempt) pipe.current = null;
          },
        }).finally(() => {
          if (workerStart.current === start) workerStart.current = null;
        });
        if (reader) {
          if (!alive.current || sessions.current !== held) {
            reader.close();
            throw new Error("the scanner closed");
          }
          worker.current = reader;
          readyRef.current?.();
          return reader;
        }
        // Not this browser, or the worker would not start: the main thread reads, for the rest of this session.
        mainOnly.current = true;
      }
      const hold = (s: OrtSession) => {
        if (!held.accept(s)) throw new Error("the scanner closed");
        return s;
      };
      const infer = <T,>(fn: () => Promise<T>) => held.use(fn);
      const load = { bytes: bytes.embedder, abort: new AbortController() };
      if (sessions.current === held) gpuLoad.current = load;
      // The embedder moves to WebGPU where there is an adapter (`webgpu.ts`). Its runtime starts loading now, beside the
      // camera and the WASM models, when it is already in Cache Storage, else only once the first answer is drawn, so a
      // first-ever open never shares the network with it (`gpu-start.ts`). Until it is in, and for good if any part of
      // it fails, frames embed on WASM. A load the scanner's close cut short is not a failure.
      const open = () => alive.current && sessions.current === held;
      const gpu = scannerGpuEmbedder({
        mode: SCANNER_GPU_START,
        model: () => (open() && gpuLoad.current === load ? load.bytes : null),
        hold,
        infer,
        alive: open,
        signal: load.abort.signal,
      });
      void gpu.then(() => {
        if (gpuLoad.current === load) gpuLoad.current = null;
      });
      const ort = await loadOrt();
      const models = await loadModels(ort, hold, { bytes, infer });
      readyRef.current?.();
      return framePipeline(ort, models, infer, gpu);
    })();
    pipe.current = attempt;
    // A failed load is tried again on the next frame, with a holder of its own.
    attempt.catch(() => {
      held.close();
      if (sessions.current === held) {
        gpuLoad.current?.abort.abort();
        gpuLoad.current = null;
        sessions.current = null;
      }
      if (pipe.current === attempt) pipe.current = null;
    });
    return attempt;
  }, []);

  useEffect(() => {
    alive.current = true;
    // Started as the scanner opens; a failure here is retried by the first frame's read, which reports it.
    ensure().catch(() => {});
    return () => {
      alive.current = false;
      outline?.clear();
      workerStart.current?.abort();
      workerStart.current = null;
      worker.current?.close();
      worker.current = null;
      pipe.current = null;
      sessions.current?.close();
      gpuLoad.current?.abort.abort();
      gpuLoad.current = null;
      sessions.current = null;
    };
  }, [outline, ensure]);

  return useCallback(async (video: Source): Promise<FrameRead> => {
    // No picture yet (the camera is still being asked for, or was refused): nothing to read.
    const { width, height } = sourceSize(video);
    const live = "videoWidth" in video;
    if (!width || !height) {
      if (live) outline?.hide();
      return { frame: { kind: "none" }, cardInView: false, dark: false };
    }
    const loaded = ensure();
    // A read that fails (the models would not load, or a run threw) shows nothing for this frame, as no card does, and
    // the error goes on to `useCardScan` as it always did.
    const r = await (await loaded).read(video, () => alive.current).catch((e: unknown) => {
      if (live) outline?.hide();
      // The worker went with this frame in it: nothing read, and the next frame reads on the main thread.
      if (e instanceof ReaderGone) return null;
      throw e;
    });
    if (!r || r.kind === "none") {
      if (live) outline?.hide();
      return { frame: { kind: "none" }, cardInView: false, dark: r?.dark ?? false };
    }
    if (live) outline?.show(r.outline);
    return { frame: { kind: "card", embedding: r.embedding }, cardInView: true, dark: r.dark, crop: r.crop };
  }, [outline, ensure]);
}
