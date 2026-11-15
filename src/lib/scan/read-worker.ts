// The scanner's read worker (card-scan speed lane, PR D): the whole read of a frame, off the page's thread. The page
// hands it each frame as an `ImageBitmap` (`read-worker-client.ts`); here it is drawn, letterboxed and read back on
// `OffscreenCanvas`es, and the detector and embedder run, through the very `framePipeline` the main thread uses, so
// the answer is the same `FrameRead` (`read-worker-serve.ts`). The runtime loads here from the CDN, and the models'
// bytes come from the page, which loads them as it always did so the loading bar reads their progress unchanged.
// Closing the scanner terminates the worker, which lets go of every session and byte with it.
import { loadOrt } from "./pipeline";
import { gpuAdapter } from "./webgpu";
import { offscreenCanvas, serveReads, workerReader, type WorkerScope } from "./read-worker-serve";

serveReads(globalThis as unknown as WorkerScope, {
  loadOrt,
  gpu: async () => (await gpuAdapter()).gpu,
  has2d: () => typeof OffscreenCanvas === "function" && offscreenCanvas() !== null,
  start: workerReader,
});
