// React hook orchestrating quiz state. Holds the current entries, the
// persisted progress, and the active card. The component layer asks for
// the next card via `next()` and reports answers via `answer()`.

import * as React from 'react';
import wordsData from '@/data/words.json';
import phrasesData from '@/data/phrases.json';
import sentencesData from '@/data/sentences.json';
import {
  buildCard,
  bumpDifficulty,
  emptyProgress,
  LEVEL_COUNT,
  nextEntryIndex,
  recordAnswer,
} from '@/lib/quiz-engine';
import { loadProgress, resetProgress, saveProgress } from '@/lib/storage';
import type { Entry, Mode, ModeProgress, QuizCard } from '@/types/quiz';

const ENTRIES: Record<Mode, Entry[]> = {
  words: wordsData as Entry[],
  phrases: phrasesData as Entry[],
  sentences: sentencesData as Entry[],
};

export interface UseQuiz {
  loaded: boolean;
  entries: Entry[];
  progress: ModeProgress;
  card: QuizCard | null;
  /** True when every entry in the current difficulty has been seen
   *  and there's nothing in re-queue. */
  exhausted: boolean;
  /** True when difficulty is below the cap, so a "too easy" bump is
   *  available. */
  canBump: boolean;
  answer: (chosenIndex: number) => Promise<{ wasCorrect: boolean }>;
  bump: () => Promise<void>;
  reset: () => Promise<void>;
}

export function useQuiz(mode: Mode): UseQuiz {
  const entries = ENTRIES[mode];
  const [progress, setProgress] = React.useState<ModeProgress>(emptyProgress);
  const [loaded, setLoaded] = React.useState(false);
  const [card, setCard] = React.useState<QuizCard | null>(null);

  // Load persisted progress whenever the mode changes. Drop the current
  // card while loading so we don't briefly render a stale prompt from
  // the previous mode.
  React.useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setCard(null);
    loadProgress(mode)
      .then((p) => {
        if (cancelled) return;
        setProgress(p);
        const idx = nextEntryIndex(p, entries.length);
        setCard(idx === null ? null : buildCard(entries, idx, p.difficulty));
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('loadProgress failed:', err);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, entries]);

  const answer = React.useCallback(
    async (chosenIndex: number): Promise<{ wasCorrect: boolean }> => {
      if (!card) throw new Error('answer called with no active card');
      const wasCorrect = chosenIndex === card.correctIndex;
      const nextProgress = recordAnswer(progress, card.index, wasCorrect);
      setProgress(nextProgress);
      await saveProgress(mode, nextProgress);

      const nextIdx = nextEntryIndex(nextProgress, entries.length);
      setCard(
        nextIdx === null ? null : buildCard(entries, nextIdx, nextProgress.difficulty),
      );
      return { wasCorrect };
    },
    [card, progress, mode, entries],
  );

  const bump = React.useCallback(async () => {
    const nextProgress = bumpDifficulty(progress);
    if (nextProgress === progress) return;
    setProgress(nextProgress);
    await saveProgress(mode, nextProgress);
    const idx = nextEntryIndex(nextProgress, entries.length);
    setCard(idx === null ? null : buildCard(entries, idx, nextProgress.difficulty));
  }, [progress, mode, entries]);

  const reset = React.useCallback(async () => {
    await resetProgress(mode);
    const fresh = emptyProgress();
    setProgress(fresh);
    const idx = nextEntryIndex(fresh, entries.length);
    setCard(idx === null ? null : buildCard(entries, idx, fresh.difficulty));
  }, [mode, entries]);

  const exhausted = loaded && card === null;
  const canBump = progress.difficulty < LEVEL_COUNT;

  return { loaded, entries, progress, card, exhausted, canBump, answer, bump, reset };
}
