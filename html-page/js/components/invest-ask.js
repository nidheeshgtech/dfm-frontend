// Word matching for the ARENA assistant (chat.js): questions are reduced to
// their meaningful words, with everyday words mapped onto the ones the
// answers use, and compared loosely.
const STOP_WORDS = new Set("a an and any are can do does for get have how i in is it me much my of on or the there to what when where who will with you your".split(" "));
// Everyday words mapped onto the ones the answers use.
const SYNONYMS = { fee: "cost", fees: "cost", charge: "cost", price: "cost", minimum: "start", abroad: "outside", international: "outside", refund: "allocated", oversubscribed: "allocated", launch: "first", eligible: "invest" };

export const words = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map((w) => SYNONYMS[w] || w);

// "fee" matches "fees", "invest" matches "investor".
export const near = (a, b) => a === b || (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a)));
