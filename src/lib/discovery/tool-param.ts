/**
 * The one-time parameter a Try it writes, read and stripped by the page it lands on. Its own module so the landing
 * (`useToolLanding`, mounted on Home's and `/decks`' neighbours) never pulls the tool registry's copy into a page's
 * client graph (`scripts/lib/client-graph.test.mts`).
 */
export const TOOL_PARAM = "tool";
