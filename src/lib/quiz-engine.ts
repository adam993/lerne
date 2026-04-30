// Pure functions for the quiz. No persistence, no React, no DOM — just
// data in / data out. Persistence happens in `storage.ts`; React glue in
// `hooks/use-quiz.ts`.

import type { Entry, ModeProgress, QuizCard } from '@/types/quiz';

/** Seeded-ish shuffle. We use Math.random; the quiz UX doesn't need
 *  reproducibility, and bundling a seedable PRNG just for this would be
 *  silly. Returns a shallow copy. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

export function emptyProgress(): ModeProgress {
  return { seen: [], requeue: [], correct: 0, wrong: 0 };
}

/** "How many cards have I been dealt so far?" — useful for both the UI
 *  counter and as the integer position the re-queue logic counts in. */
export function deckPosition(p: ModeProgress): number {
  return p.seen.length;
}

/**
 * Decide which entry index should be the prompt for the next card.
 *
 * Re-queue first: any card whose `dueAtPosition` is ≤ current position
 * jumps the line. If multiple are due, the one that's been waiting
 * longest (smallest dueAtPosition) wins.
 *
 * Otherwise: the first unseen entry (lowest index not yet in `seen`).
 * That gives us a deterministic "go through the list in frequency
 * order" walk for first-time cards.
 *
 * Returns null only if every entry has been seen and no requeue is
 * pending — at which point the caller should reset the deck.
 */
export function nextEntryIndex(p: ModeProgress, totalEntries: number): number | null {
  const pos = deckPosition(p);

  // Check requeue — pick the longest-waiting due card.
  let pickIdx = -1;
  let pickDue = Infinity;
  for (const [idx, due] of p.requeue) {
    if (due <= pos && due < pickDue) {
      pickIdx = idx;
      pickDue = due;
    }
  }
  if (pickIdx !== -1) return pickIdx;

  const seenSet = new Set(p.seen);
  for (let i = 0; i < totalEntries; i++) {
    if (!seenSet.has(i)) return i;
  }
  return null;
}

/**
 * Build a card: pick 4 random distractors whose German word differs from
 * the correct entry's, shuffle correct + distractors, and return the
 * card.
 *
 * Edge case: if the corpus is tiny (< 5 entries) we fall back to fewer
 * options — but the bundled data is large enough that this never
 * triggers in practice.
 */
export function buildCard(entries: Entry[], correctIndex: number): QuizCard {
  const correct = entries[correctIndex];
  if (!correct) throw new Error(`buildCard: index ${correctIndex} out of range`);

  // Candidate pool = every other entry whose English translation differs
  // from the correct one. Filtering by English (not just by index) avoids
  // a card that has two distractors with the same translation as the
  // correct answer, which would feel broken to the user.
  const pool: Entry[] = [];
  for (let i = 0; i < entries.length; i++) {
    if (i === correctIndex) continue;
    const e = entries[i];
    if (!e) continue;
    if (e.en === correct.en) continue;
    pool.push(e);
  }

  const distractorCount = Math.min(4, pool.length);
  const distractors = shuffle(pool).slice(0, distractorCount).map((e) => e.en);
  const optionStrings = shuffle([correct.en, ...distractors]);
  const correctIdx = optionStrings.indexOf(correct.en);

  return {
    index: correctIndex,
    prompt: correct.de,
    options: optionStrings,
    correctIndex: correctIdx,
  };
}

/**
 * Apply the result of answering a card to a progress state. Returns the
 * new state — caller is responsible for persisting it.
 *
 * - `seen` always grows by one (the card was just dealt, regardless of
 *   right/wrong).
 * - On wrong: schedule a re-queue 3 positions out. We dedup so the same
 *   entry can't be in `requeue` twice.
 * - On correct: drop the entry from `requeue` if it was there (i.e. the
 *   user finally got a previously-missed card right).
 * - `correct` / `wrong` counters tick.
 */
const REQUEUE_GAP = 3;

export function recordAnswer(
  p: ModeProgress,
  entryIndex: number,
  isCorrect: boolean,
): ModeProgress {
  const newSeen = [...p.seen, entryIndex];
  const newPos = newSeen.length;

  let newRequeue = p.requeue.filter(([idx]) => idx !== entryIndex);
  if (!isCorrect) {
    newRequeue = [...newRequeue, [entryIndex, newPos + REQUEUE_GAP]];
  }

  return {
    seen: newSeen,
    requeue: newRequeue,
    correct: p.correct + (isCorrect ? 1 : 0),
    wrong: p.wrong + (isCorrect ? 0 : 1),
  };
}
