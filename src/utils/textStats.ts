// Our own (non-AI) word/character counter. The small on-device model is bad at
// counting, so length is ALWAYS measured here — both for the live counts shown
// to the user and for deciding whether to ask the model to shorten a draft.

export function countWords(s: string): number {
  const m = s.trim().match(/\S+/g); // runs of non-whitespace
  return m ? m.length : 0;
}

export function countChars(s: string): number {
  return s.length;
}

export type LimitType = "word" | "char";

export interface LengthLimit {
  type: LimitType;
  value: number;
}

/** Current count of `text` under the given limit's unit. */
export function countFor(text: string, type: LimitType): number {
  return type === "word" ? countWords(text) : countChars(text);
}

/** True if `text` is within the limit (null limit = always within). */
export function withinLimit(text: string, limit: LengthLimit | null): boolean {
  if (!limit || !limit.value) return true;
  return countFor(text, limit.type) <= limit.value;
}
