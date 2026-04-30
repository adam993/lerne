import * as React from 'react';
import type { Mode } from '@/types/quiz';

interface Props {
  prompt: string;
  mode: Mode;
  /** Drives the colored flash on the card itself when the user answers. */
  feedback: 'idle' | 'correct' | 'wrong';
}

export function QuizCard({ prompt, mode, feedback }: Props) {
  return (
    <div className="prompt-card card-fade" data-mode={mode} data-feedback={feedback}>
      {prompt}
    </div>
  );
}
