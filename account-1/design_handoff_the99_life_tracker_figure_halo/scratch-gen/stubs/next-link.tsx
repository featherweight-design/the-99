import * as React from "react";
export default function Link({ href, prefetch, ...p }: any) { return <a href={typeof href === "string" ? href : "#"} {...p} />; }
export const useLinkStatus = () => ({ pending: false });
