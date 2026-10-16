"use client";

import { useCallback, useEffect, useRef } from "react";
import { framePipeline, loadModels, loadOrt, type OrtSession } from "../../../lib/scan/pipeline";
import { sessionHolder } from "../../../lib/scan/sessions";
import type { FrameRead } from "./use-card-scan";

type Pipe = ReturnType<typeof framePipeline>;

/**
 * `useCardScan`'s `readFrame` on the phone's own detector and embedder (`src/lib/scan/pipeline.ts`, 2c). The runtime
 * and both models load once, on the first frame, and every session is released when the scanner closes
 * (`sessionHolder`), a load that finishes after it closed included. A frame the pipeline cannot read yet (the
 * camera has no size) reads as no card.
 */
export function useFrameReader(): (video: HTMLVideoElement) => Promise<FrameRead> {
  // One holder per load attempt: a failed attempt closes its own, so a model that loaded beside one that failed (or
  // finishes loading after) is released rather than kept for a pipeline that will never run.
  const sessions = useRef<ReturnType<typeof sessionHolder<OrtSession>> | null>(null);
  const pipe = useRef<Promise<Pipe> | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      pipe.current = null;
      sessions.current?.close();
      sessions.current = null;
    };
  }, []);

  return useCallback(async (video: HTMLVideoElement): Promise<FrameRead> => {
    // No picture yet (the camera is still being asked for, or was refused): nothing to read, and no reason to load the
    // runtime and both models for a scanner that may never get one.
    if (!video.videoWidth || !video.videoHeight) return { frame: { kind: "none" }, cardInView: false, dark: false };
    if (!pipe.current) {
      const held = sessionHolder<OrtSession>();
      sessions.current = held;
      const attempt = (async () => {
        const ort = await loadOrt();
        const models = await loadModels(ort, (s) => {
          if (!held.accept(s)) throw new Error("the scanner closed");
          return s;
        });
        return framePipeline(ort, models, (fn) => held.use(fn));
      })();
      pipe.current = attempt;
      // A failed load is tried again on the next frame, with a holder of its own.
      attempt.catch(() => {
        held.close();
        if (sessions.current === held) sessions.current = null;
        if (pipe.current === attempt) pipe.current = null;
      });
    }
    const r = await (await pipe.current).read(video, () => alive.current);
    if (!r || r.kind === "none") return { frame: { kind: "none" }, cardInView: false, dark: r?.dark ?? false };
    return { frame: { kind: "card", embedding: r.embedding }, cardInView: true, dark: r.dark };
  }, []);
}
