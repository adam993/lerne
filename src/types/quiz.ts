export type Mode = 'words' | 'phrases' | 'sentences';

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
  /** Cards already shown at least once, in the order they were drawn.
   *  We use this to know which `Entry` to deal next: the next entry not
   *  in `seen` (and not currently waiting in `requeue`). */
  seen: number[];
  /** Map of entry-index → "show me again at deck-position N". When the
   *  caller reaches position N, the requeued card gets dealt instead of
   *  a fresh one. Stored as `[index, dueAtPosition]` pairs (Map isn't
   *  JSON-serialisable). */
  requeue: Array<[number, number]>;
  /** Counters for the in-app stats display. */
  correct: number;
  wrong: number;
}

export interface QuizCard {
  /** Index of the entry in its mode's source array — stable id. */
  index: number;
  /** The German prompt to show. */
  prompt: string;
  /** Five English options (one correct + four random distractors), pre-shuffled. */
  options: string[];
  /** Index into `options` of the correct answer. */
  correctIndex: number;
}
