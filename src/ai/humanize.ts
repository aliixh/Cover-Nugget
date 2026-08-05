// The most obvious "this was written by AI" tells, kept short on purpose.
//  - AVOID_LINE is added to the polish prompt so the model steers clear.
//  - stripDashes is a deterministic cleanup applied to every generated letter
//    (works offline too) — em/en dashes are the single most obvious tell, and
//    the user dislikes them anyway.

export const AVOID_LINE =
  "Write like a real person: use contractions, plain words, and specific facts. " +
  "Do NOT use em dashes or en dashes. Avoid clichés (delve, leverage, robust, " +
  "seamless, synergy, \"passionate about\", \"proven track record\") and stiff " +
  "connectors (Furthermore, Moreover, In conclusion).";

/** Replace em/en dashes (—, –) with commas — the clearest AI tell to remove.
 *  Hyphens (-) in words like "end-to-end" are left alone. */
export function stripDashes(text: string): string {
  return text
    .replace(/ *[—–] */g, ", ") // em/en dash used as a break -> comma
    .replace(/,\s*,/g, ", ") // collapse ", ,"
    .replace(/ +,/g, ",") // no space before comma
    .replace(/,\s*([.!?])/g, "$1") // ", ." -> "."
    .replace(/  +/g, " ");
}
