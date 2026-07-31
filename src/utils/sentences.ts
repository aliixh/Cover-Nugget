// Splits letter text into tappable "sentence" tokens for the editor, keeping
// the whitespace between them as separate (non-selectable) tokens so the
// original layout — line breaks, blank lines, indentation — is preserved when
// rendered as a run of nested <Text> spans.
//
// A sentence ends at ., !, or ? (optionally followed by closing quotes/brackets)
// when the next char is whitespace or end-of-text, OR at a line break. Header
// lines, the greeting, and the sign-off (which have no terminal punctuation)
// each become a single token.

export interface Token {
  text: string;
  start: number;
  end: number;
  /** true = a selectable sentence; false = whitespace between sentences. */
  sentence: boolean;
}

const isSpace = (c: string) => c === " " || c === "\t" || c === "\n" || c === "\r";

export function tokenizeSentences(text: string): Token[] {
  const tokens: Token[] = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    if (isSpace(text[i])) {
      let j = i;
      while (j < n && isSpace(text[j])) j++;
      tokens.push({ text: text.slice(i, j), start: i, end: j, sentence: false });
      i = j;
      continue;
    }
    let j = i;
    while (j < n) {
      const c = text[j];
      if (c === "\n") break; // line breaks always end a sentence token
      if (c === "." || c === "!" || c === "?") {
        let k = j + 1;
        while (k < n && (text[k] === '"' || text[k] === "'" || text[k] === ")" || text[k] === "]")) k++;
        if (k >= n || isSpace(text[k])) {
          j = k;
          break;
        }
      }
      j++;
    }
    tokens.push({ text: text.slice(i, j), start: i, end: j, sentence: true });
    i = j;
  }
  return tokens;
}
