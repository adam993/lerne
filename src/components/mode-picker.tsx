import * as React from 'react';
import type { Mode } from '@/types/quiz';
import wordsData from '@/data/words.json';
import phrasesData from '@/data/phrases.json';
import sentencesData from '@/data/sentences.json';

interface Props {
  onPick: (mode: Mode) => void;
}

const MODES: Array<{ id: Mode; title: string; subtitle: string; count: number }> = [
  {
    id: 'words',
    title: 'Words',
    subtitle: 'High-frequency German vocabulary, one word at a time.',
    count: (wordsData as unknown[]).length,
  },
  {
    id: 'phrases',
    title: 'Phrases',
    subtitle: 'Greetings, requests, and everyday chunks.',
    count: (phrasesData as unknown[]).length,
  },
  {
    id: 'sentences',
    title: 'Sentences',
    subtitle: 'Full sentences for context and grammar in motion.',
    count: (sentencesData as unknown[]).length,
  },
];

export function ModePicker({ onPick }: Props) {
  return (
    <div className="card-fade mx-auto flex w-full max-w-[var(--content-width)] flex-col gap-6 px-4 py-10">
      <header className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
          Lerne
        </h1>
        <p className="mt-2 text-muted-foreground">
          German → English. Pick a mode and tap the right translation.
        </p>
      </header>
      <div className="flex flex-col gap-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className="mode-tile"
            onClick={() => onPick(m.id)}
          >
            <div className="flex items-baseline justify-between">
              <span className="mode-tile-title">{m.title}</span>
              <span className="mode-tile-meta">{m.count} entries</span>
            </div>
            <span className="mode-tile-meta">{m.subtitle}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
