import * as io from "../io";

export function removeDefaultInitializersFromArgs(args: string): string {
  const regexMatcherCurly = new io.RemovingRegexWithBodyMatcher(
    "\\s*=[\\s\\S]+"
  );
  const regexMatcher = new io.RemovingRegexWithBodyMatcher(
    "\\s*=[\\s\\S]+",
    undefined,
    "(",
    ")"
  );
  const tempFragment = io.TextFragment.createFromString(args);
  regexMatcherCurly.match(tempFragment);
  regexMatcher.match(tempFragment);
  return tempFragment.toString();
}
