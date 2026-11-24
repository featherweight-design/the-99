// Home's search panel (tool discovery E1, handoff `design_handoff_the99_tool_discovery/`, R5 `homeSearchCopy`). The
// field's placeholder, name and the starters are the card search's (`askCopy`).
/** The home hero commander's fit chip. */
export const homeHeroCopy = {
  /** The denominator after the score, held off it by a no-break space. */
  denominator: (denominator: string) => `\u00a0${denominator}`,
} as const;

export const homeSearchCopy = {
  title: "What do you want to do?",
} as const;
