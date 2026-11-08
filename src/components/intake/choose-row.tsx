"use client";
// The signed-in side of a result row: the card-name control wired to the card detail. `ChooseRowView` (the drawing, shared
// with the landing demo) takes it as `door`; everything the row says and draws lives in `choose-row-view.tsx`.

import { CardDetailTrigger } from "../cards/card-detail-provider";
import type { RowDoorProps } from "./choose-row-view";

export { handOffHref, reasonDrawable, type Trial } from "./choose-row-view";

export const cardDoor = ({ oracleId, name, imageUri, preview, testId, className, children }: RowDoorProps) => (
  <CardDetailTrigger oracleId={oracleId} name={name} imageUri={imageUri} preview={preview} testId={testId} className={className}>
    {children}
  </CardDetailTrigger>
);
