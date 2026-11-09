// The landing demo's projected fixture data, decoded: what `pnpm demo:export` wrote into `projected.generated.ts`, in the
// shapes the drawing halves take (Dates, Maps and Sets restored, `wire.ts`). Null until the export has run. Reads no table
// and no request: the file is committed, and the demo draws from it.
import type { DemoCollection, DemoCommanders } from "./project";
import { projectedJson } from "./projected.generated";
import { decodeDemo } from "./wire";

export type Projected = {
  format: 1;
  collection: DemoCollection;
  commanders: DemoCommanders;
};

export function projected(): Projected | null {
  return projectedJson === null ? null : decodeDemo<Projected>(projectedJson);
}
