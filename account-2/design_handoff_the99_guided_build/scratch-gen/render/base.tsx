import { renderToString as rts } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { CardDetailProvider } from "../src/components/cards/card-detail-provider";
const router: any = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} };
export const R = (el: any, path = "/decks/new") => rts(<AppRouterContext.Provider value={router}><PathnameContext.Provider value={path}><SearchParamsContext.Provider value={new URLSearchParams() as any}><CardDetailProvider fetchCard={(async () => null) as any}>{el}</CardDetailProvider></SearchParamsContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>);
