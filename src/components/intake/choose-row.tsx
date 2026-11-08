"use client";
// The signed-in result row: `ChooseRowView` (the drawing, shared with the landing demo) with the card-name control wired
// to the card detail. Everything the row says and draws lives in `choose-row-view.tsx`.

import type { ComponentProps } from "react";

import { CardDetailTrigger } from "../cards/card-detail-provider";
import { ChooseRowView, type RowDoorProps } from "./choose-row-view";

export { handOffHref, reasonDrawable, type Trial } from "./choose-row-view";

const cardDoor = ({ oracleId, name, imageUri, preview, testId, className, children }: RowDoorProps) => (
  <CardDetailTrigger oracleId={oracleId} name={name} imageUri={imageUri} preview={preview} testId={testId} className={className}>
    {children}
  </CardDetailTrigger>
);

export function ChooseRow(props: Omit<ComponentProps<typeof ChooseRowView>, "door">) {
  return <ChooseRowView {...props} door={cardDoor} />;
}
