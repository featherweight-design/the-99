/** For tests: a `getByText` matcher for a credit line drawn through `CreditsText`. It finds the
 *  innermost element whose text is the whole line, though the link phrase is its own element. */
export const creditLine = (text: string) => (_: string, el: Element | null) =>
  !!el && el.textContent === text && ![...el.children].some((c) => c.textContent === text);
