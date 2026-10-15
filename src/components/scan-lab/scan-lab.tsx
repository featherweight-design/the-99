"use client";

// The card-scan lab's camera loop (`/lab/scan`). Everything runs on the device: the frame is drawn
// to a canvas, the detector finds the four corners, the card is warped to 320x448, embedded, and
// matched against the card index. Only a ✓/✗ tap sends anything, and a frame only with Keep this
// frame ticked. Unstyled beyond the tokens: it is a measuring page with no design handoff.

import { useCallback, useEffect, useRef, useState } from "react";
import { scanLabCopy as copy } from "../../lib/copy/scan-lab";
import {
  DETECTOR_SIZE, EMBED_H, EMBED_W, cornersFromDetector, letterbox, quadArea, rgbaToTensor, warpToTensor,
} from "../../lib/scan-lab/geometry";
import { agreement, normalise, parseIndex, topOracles, type IndexMeta, type ScanIndex } from "../../lib/scan-lab/match";
import { readingCrop, streamHolder, tapBody, type Reading } from "../../lib/scan-lab/reading";
import {
  AGREE_FRAMES, AGREE_MARGIN, DETECTOR_URL, EMBEDDER_URL, ORT_BASE, SHARPNESS_GATE,
} from "../../lib/scan-lab/models";

/** The slice of onnxruntime-web this page uses; it is loaded from the CDN, so it has no types here. */
type OrtTensor = { data: Float32Array };
type OrtSession = { run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>>; inputNames: string[] };
type Ort = {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => unknown;
  InferenceSession: { create(url: string, opts?: Record<string, unknown>): Promise<OrtSession> };
};

const MAX_FRAME_EDGE = 1280;

async function loadOrt(): Promise<Ort> {
  const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${ORT_BASE}ort.wasm.min.mjs`)) as Ort;
  ort.env.wasm.wasmPaths = ORT_BASE;
  ort.env.wasm.numThreads = 1;
  return ort;
}

async function loadIndex(base: string): Promise<ScanIndex> {
  const root = base.endsWith("/") ? base : `${base}/`;
  const [meta, bin] = await Promise.all([
    fetch(`${root}scan-index.json`).then((r) => r.json() as Promise<IndexMeta>),
    fetch(`${root}scan-index.bin`).then((r) => r.arrayBuffer()),
  ]);
  return parseIndex(meta, bin);
}

/** The normalised tensor back to pixels, for the preview and a kept frame. */
function tensorToImage(t: Float32Array, w: number, h: number): ImageData {
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  const plane = w * h;
  const img = new ImageData(w, h);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) img.data[i * 4 + c] = Math.round((t[c * plane + i] * std[c] + mean[c]) * 255);
    img.data[i * 4 + 3] = 255;
  }
  return img;
}

export function ScanLab({ indexBase }: { indexBase: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const running = useRef(false);
  const history = useRef<{ oracleId: string; margin: number }[]>([]);
  const stream = useRef(streamHolder<MediaStream>());
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [keepFrame, setKeepFrame] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [taps, setTaps] = useState({ n: 0, right: 0 });
  const indexVersion = useRef("unknown");

  useEffect(() => {
    const held = stream.current;
    held.open();
    return () => {
      running.current = false;
      held.close();
    };
  }, []);

  const start = useCallback(async () => {
    if (!indexBase) {
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
        loadIndex(indexBase),
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        }).then((m) => {
          // held from the moment it exists, so a failure elsewhere, or leaving the page, stops it
          if (!stream.current.accept(m)) throw new Error("left the page");
          return m;
        }),
      ]);
      indexVersion.current = index.meta.version;
      const [detector, embedder] = await Promise.all([
        ort.InferenceSession.create(DETECTOR_URL, { executionProviders: ["wasm"] }),
        ort.InferenceSession.create(EMBEDDER_URL, { executionProviders: ["wasm"] }),
      ]);
      const video = videoRef.current;
      if (!video) {
        stream.current.close();
        return;
      }
      video.srcObject = media;
      await video.play();
      if (!stream.current.holds(media)) return; // the page was left while the camera started
      setStatus("running");
      running.current = true;
      const frame = document.createElement("canvas");
      const square = document.createElement("canvas");
      square.width = square.height = DETECTOR_SIZE;
      const fctx = frame.getContext("2d", { willReadFrequently: true });
      const sctx = square.getContext("2d", { willReadFrequently: true });
      if (!fctx || !sctx) throw new Error("no 2d canvas");
      // No card: nothing a tap records may describe an earlier one, the kept frame included, but
      // the detector did run, so its timing is this frame's.
      const noCard = (t0: number, t1: number) => {
        history.current = [];
        setReading({ kind: "none", detMs: Math.round(t1 - t0), totalMs: Math.round(performance.now() - t0) });
      };
      const loop = async () => {
        if (!running.current) return;
        const t0 = performance.now();
        const vw = video.videoWidth, vh = video.videoHeight;
        if (vw && vh) {
          const s = Math.min(1, MAX_FRAME_EDGE / Math.max(vw, vh));
          frame.width = Math.round(vw * s);
          frame.height = Math.round(vh * s);
          fctx.drawImage(video, 0, 0, frame.width, frame.height);
          const lb = letterbox(frame.width, frame.height);
          sctx.fillStyle = "#000";
          sctx.fillRect(0, 0, DETECTOR_SIZE, DETECTOR_SIZE);
          sctx.drawImage(frame, lb.dx, lb.dy, lb.dw, lb.dh);
          const sq = sctx.getImageData(0, 0, DETECTOR_SIZE, DETECTOR_SIZE).data;
          const detIn = new ort.Tensor("float32", rgbaToTensor(sq, DETECTOR_SIZE, DETECTOR_SIZE), [1, 3, DETECTOR_SIZE, DETECTOR_SIZE]);
          const det = await detector.run({ [detector.inputNames[0]]: detIn });
          const t1 = performance.now();
          const sharpness = det.sharpness.data[0];
          const corners = cornersFromDetector(det.corners.data, frame.width, frame.height);
          const big = quadArea(corners) > 0.05 * frame.width * frame.height;
          if (sharpness >= SHARPNESS_GATE && big) {
            const px = fctx.getImageData(0, 0, frame.width, frame.height).data;
            const crop = warpToTensor(px, frame.width, frame.height, corners);
            if (crop) {
              const out = await embedder.run({ [embedder.inputNames[0]]: new ort.Tensor("float32", crop, [1, 3, EMBED_H, EMBED_W]) });
              const t2 = performance.now();
              const q = normalise(Object.values(out)[0].data);
              const guesses = topOracles(index, q, 5);
              const t3 = performance.now();
              const margin = guesses.length > 1 ? guesses[0].score - guesses[1].score : 1;
              history.current = [...history.current.slice(-9), { oracleId: guesses[0].oracleId, margin }];
              let agreed = 0;
              for (let i = history.current.length - 1; i >= 0 && history.current[i].oracleId === guesses[0].oracleId; i--) agreed++;
              const committed = agreement(history.current, AGREE_FRAMES, AGREE_MARGIN) !== null;
              // the crop and the verdict it produced are published together, as one reading
              setReading({
                kind: "card", crop, guesses, margin, agreed, committed,
                detMs: Math.round(t1 - t0), embMs: Math.round(t2 - t1), matchMs: Math.round(t3 - t2), totalMs: Math.round(t3 - t0),
              });
              const pctx = previewRef.current?.getContext("2d");
              pctx?.putImageData(tensorToImage(crop, EMBED_W, EMBED_H), 0, 0);
            } else {
              noCard(t0, t1);
            }
          } else {
            noCard(t0, t1);
          }
        }
        setTimeout(loop, 60);
      };
      void loop();
    } catch (e) {
      running.current = false;
      stream.current.close();
      setStatus("error");
      setError(`${copy.failed} ${e instanceof Error ? e.message : ""}`);
    }
  }, [indexBase]);

  const record = useCallback(async (correct: boolean) => {
    // one reading, the one on screen: its verdict, its timings and its own crop
    const r = reading;
    const crop = readingCrop(r);
    let frame: string | null = null;
    if (keepFrame && crop) {
      const c = document.createElement("canvas");
      c.width = EMBED_W;
      c.height = EMBED_H;
      c.getContext("2d")?.putImageData(tensorToImage(crop, EMBED_W, EMBED_H), 0, 0);
      frame = c.toDataURL("image/jpeg", 0.85).split(",")[1] ?? null;
    }
    const res = await fetch("/api/scan-lab/result", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tapBody(r, correct, indexVersion.current, frame)),
    }).catch(() => null);
    if (res?.ok) {
      setTaps((t) => ({ n: t.n + 1, right: t.right + (correct ? 1 : 0) }));
      setNote(copy.saved);
      setKeepFrame(false);
    } else {
      setNote(copy.saveFailed);
    }
  }, [reading, keepFrame]);

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col gap-[12px] px-[16px] py-[20px] text-[color:var(--fg)]">
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
        <section className="flex flex-col gap-[8px]" aria-live="polite">
          <div className="flex gap-[12px]">
            <canvas ref={previewRef} width={EMBED_W} height={EMBED_H} className="h-[168px] w-[120px] rounded-[6px]" />
            <div className="flex min-w-0 flex-col gap-[4px] text-[14px]">
              {reading?.kind === "card" ? (
                <>
                  <span className="text-[12px] text-[color:var(--fg-muted)]">{copy.guessing}</span>
                  <strong className="text-[18px]">{reading.guesses[0]?.name}</strong>
                  <span className="text-[12px] text-[color:var(--fg-muted)]">
                    {reading.guesses[0]?.score.toFixed(3)} · +{reading.margin.toFixed(3)}
                    {reading.committed ? ` · ${copy.agreed(reading.agreed)}` : ""}
                  </span>
                  <span className="text-[12px] text-[color:var(--fg-muted)]">{copy.timings(reading.detMs, reading.embMs, reading.matchMs)}</span>
                  <span className="text-[12px] text-[color:var(--fg-muted)]">
                    {copy.runnersUp}: {reading.guesses.slice(1).map((g) => g.name).join(", ")}
                  </span>
                </>
              ) : (
                <span>{copy.noCard}</span>
              )}
            </div>
          </div>
          <label className="flex items-center gap-[8px] text-[14px]">
            <input type="checkbox" checked={keepFrame} onChange={(e) => setKeepFrame(e.target.checked)} />
            {copy.keepFrame}
          </label>
          <div className="flex gap-[8px]">
            <button type="button" onClick={() => void record(true)} className="flex-1 rounded-[8px] border px-[12px] py-[10px] text-[15px]">
              {copy.right}
            </button>
            <button type="button" onClick={() => void record(false)} className="flex-1 rounded-[8px] border px-[12px] py-[10px] text-[15px]">
              {copy.wrong}
            </button>
          </div>
          <span className="text-[12px] text-[color:var(--fg-muted)]">
            {copy.taps(taps.n, taps.right)}
            {note ? ` · ${note}` : ""}
          </span>
        </section>
      )}
    </main>
  );
}
