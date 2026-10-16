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
  const sessions = useRef(sessionHolder<OrtSession>());
  const pipe = useRef<Promise<Pipe> | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    const held = sessions.current;
    held.open();
    alive.current = true;
    return () => {
      alive.current = false;
      pipe.current = null;
      held.close();
    };
  }, []);

  return useCallback(async (video: HTMLVideoElement): Promise<FrameRead> => {
    if (!pipe.current) {
      const held = sessions.current;
      pipe.current = (async () => {
        const ort = await loadOrt();
        const models = await loadModels(ort, (s) => {
          if (!held.accept(s)) throw new Error("the scanner closed");
          return s;
        });
        return framePipeline(ort, models, (fn) => held.use(fn));
      })();
      // A failed load is tried again on the next frame rather than kept as a rejected promise.
      pipe.current.catch(() => {
        pipe.current = null;
      });
    }
    const r = await (await pipe.current).read(video, () => alive.current);
    if (!r || r.kind === "none") return { frame: { kind: "none" }, cardInView: false, dark: r?.dark ?? false };
    return { frame: { kind: "card", embedding: r.embedding }, cardInView: true, dark: r.dark };
  }, []);
}
