export type Mode = 'words' | 'phrases' | 'sentences';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

/** A single bilingual entry from one of the bundled data files. The
 *  index in the source array doubles as a stable identifier for that
 *  entry in storage (re-queue position, last-seen card, etc). */
export interface Entry {
  de: string;
  en: string;
}

/** Persisted per-mode progress. Keep this serialisable so the whole
 *  thing round-trips cleanly through Preferences/localStorage. */
export interface ModeProgress {
  /** Current difficulty tier the user is studying. The quiz only
   *  draws from entries at this exact level (not 1..N) — bumping is
   *  the explicit user action, so each tap moves them to a strictly
   *  harder pool. */
  difficulty: Difficulty;
  /** Cards already shown at least once at the *current* difficulty,
   *  in the order they were drawn. Reset whenever difficulty changes
   *  (different pool of entries per level). */
  seen: number[];
  /** Map of entry-index → "show me again at deck-position N". When the
   *  caller reaches position N, the requeued card gets dealt instead of
   *  a fresh one. Stored as `[index, dueAtPosition]` pairs (Map isn't
   *  JSON-serialisable). Reset whenever difficulty changes. */
  requeue: Array<[number, number]>;
  /** Counters for the in-app stats display. Persist across difficulty
   *  bumps so the user sees their cumulative session performance. */
  correct: number;
  wrong: number;
}

export interface QuizCard {
  /** Index of the entry in its mode's source array — stable id. */
  index: number;
  /** The German prompt to show. */
  prompt: string;
  /** Four English options (one correct + three random distractors), pre-shuffled. */
  options: string[];
  /** Index into `options` of the correct answer. */
  correctIndex: number;
}
