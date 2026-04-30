// Pure functions for the quiz. No persistence, no React, no DOM — just
// data in / data out. Persistence happens in `storage.ts`; React glue in
// `hooks/use-quiz.ts`.

import type { Difficulty, Entry, ModeProgress, QuizCard } from '@/types/quiz';

/** How many options a quiz card displays. 1 correct + 3 distractors. */
export const OPTION_COUNT = 4;

/** Number of fresh cards that play before a missed entry is re-queued. */
const REQUEUE_GAP = 3;

/** How many discrete levels the corpus is bucketed into. */
export const LEVEL_COUNT = 5;

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
  return { difficulty: 1, seen: [], requeue: [], correct: 0, wrong: 0 };
}

/** "How many cards have I been dealt so far at the current level?" —
 *  drives both the UI counter and the integer position the re-queue
 *  logic counts in. Resets when difficulty bumps. */
export function deckPosition(p: ModeProgress): number {
  return p.seen.length;
}

/**
 * Bucket an entry index into a difficulty level (1..LEVEL_COUNT).
 *
 * The bundled lists are ordered such that earlier entries are
 * generally easier:
 *   - words.json  — by SMenigat frequency rank (most-common first).
 *   - phrases.json — curated topical order, greetings/politeness up
 *     front, complex situations later.
 *   - sentences.json — curated, simple introductions first.
 *
 * Position-based bucketing is therefore a decent free heuristic for
 * "difficulty" without having to hand-tag every entry. We split into
 * `LEVEL_COUNT` equal-sized buckets, with the last bucket absorbing
 * any remainder.
 */
export function levelOfIndex(index: number, totalEntries: number): Difficulty {
  const bucket = Math.ceil(totalEntries / LEVEL_COUNT);
  const lvl = Math.floor(index / bucket) + 1;
  return Math.min(LEVEL_COUNT, Math.max(1, lvl)) as Difficulty;
}

/** Returns the [startInclusive, endExclusive) index range for a level. */
export function rangeForLevel(level: Difficulty, totalEntries: number): [number, number] {
  const bucket = Math.ceil(totalEntries / LEVEL_COUNT);
  const start = (level - 1) * bucket;
  const end = level === LEVEL_COUNT ? totalEntries : Math.min(totalEntries, level * bucket);
  return [start, end];
}

/**
 * Decide which entry index should be the prompt for the next card.
 *
 * Constrained to the current difficulty tier: only entries whose
 * position falls within the level's range are eligible. Within that
 * range:
 *
 * 1. Re-queue first: any card whose `dueAtPosition` is ≤ current
 *    position jumps the line. If multiple are due, the one waiting
 *    longest (smallest dueAtPosition) wins.
 * 2. Otherwise: the first unseen entry in the level's range. That gives
 *    a deterministic walk through the tier in source order.
 *
 * Returns null when every entry in the level's range has been seen and
 * no requeue is pending — caller should offer "bump" or "reset".
 */
export function nextEntryIndex(p: ModeProgress, totalEntries: number): number | null {
  const [start, end] = rangeForLevel(p.difficulty, totalEntries);
  const pos = deckPosition(p);

  let pickIdx = -1;
  let pickDue = Infinity;
  for (const [idx, due] of p.requeue) {
    if (idx < start || idx >= end) continue;
    if (due <= pos && due < pickDue) {
      pickIdx = idx;
      pickDue = due;
    }
  }
  if (pickIdx !== -1) return pickIdx;

  const seenSet = new Set(p.seen);
  for (let i = start; i < end; i++) {
    if (!seenSet.has(i)) return i;
  }
  return null;
}

/**
 * Build a card: pick distractors from the same difficulty tier whose
 * English translation differs from the correct entry's, shuffle correct
 * + distractors, return the card.
 *
 * Restricting distractors to the same tier keeps the card's overall
 * difficulty consistent — at level 5, you don't want trivially-easy
 * distractors that the user can rule out by frequency familiarity.
 */
export function buildCard(
  entries: Entry[],
  correctIndex: number,
  difficulty: Difficulty,
): QuizCard {
  const correct = entries[correctIndex];
  if (!correct) throw new Error(`buildCard: index ${correctIndex} out of range`);

  const [start, end] = rangeForLevel(difficulty, entries.length);

  // Distractors come from the same tier. We filter out the correct
  // entry itself and any entry whose English translation collides with
  // the correct one (a duplicate translation would let the user say
  // "either works" and feel cheated by a "wrong" verdict).
  const pool: Entry[] = [];
  for (let i = start; i < end; i++) {
    if (i === correctIndex) continue;
    const e = entries[i];
    if (!e) continue;
    if (e.en === correct.en) continue;
    pool.push(e);
  }

  const distractorCount = Math.min(OPTION_COUNT - 1, pool.length);
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
 * Apply the result of answering a card. Returns the new state — the
 * caller persists it.
 *
 * - `seen` always grows by one.
 * - On wrong: schedule a re-queue REQUEUE_GAP positions out, dedup'd.
 * - On correct: drop the entry from `requeue` if it was there.
 * - Counters tick.
 */
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
    ...p,
    seen: newSeen,
    requeue: newRequeue,
    correct: p.correct + (isCorrect ? 1 : 0),
    wrong: p.wrong + (isCorrect ? 0 : 1),
  };
}

/**
 * Bump the difficulty by one tier. Resets `seen` + `requeue` because
 * the new tier is a different pool of entries — anything tracked at
 * the old tier doesn't apply. Counters carry over so the session
 * stats keep accumulating.
 *
 * No-op when already at LEVEL_COUNT.
 */
export function bumpDifficulty(p: ModeProgress): ModeProgress {
  if (p.difficulty >= LEVEL_COUNT) return p;
  return {
    ...p,
    difficulty: (p.difficulty + 1) as Difficulty,
    seen: [],
    requeue: [],
  };
}
