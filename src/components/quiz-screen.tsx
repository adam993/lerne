import * as React from 'react';
import { ChevronLeft, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuizCard } from '@/components/quiz-card';
import { AnswerButton } from '@/components/answer-button';
import { useQuiz } from '@/hooks/use-quiz';
import { LEVEL_COUNT } from '@/lib/quiz-engine';
import type { Mode } from '@/types/quiz';

interface Props {
  mode: Mode;
  onBack: () => void;
}

const MODE_LABEL: Record<Mode, string> = {
  words: 'Words',
  phrases: 'Phrases',
  sentences: 'Sentences',
};

/** Time the right/wrong feedback stays on screen before the next card
 *  is revealed. Long enough for the user to register the correct answer
 *  on a wrong tap, short enough to keep momentum. */
const FEEDBACK_MS_CORRECT = 450;
const FEEDBACK_MS_WRONG = 1400;

export function QuizScreen({ mode, onBack }: Props) {
  const { loaded, card, progress, exhausted, canBump, answer, bump, reset } =
    useQuiz(mode);

  // Local UI state for the in-flight answer reveal — separate from the
  // engine's progress so we can show the colored flash for a moment
  // before the next card is built.
  const [chosen, setChosen] = React.useState<number | null>(null);
  const [revealed, setRevealed] = React.useState<{
    correctIndex: number;
    chosenIndex: number;
    wasCorrect: boolean;
  } | null>(null);

  // When the active card changes (next card dealt, or difficulty bumped),
  // reset the in-flight reveal state.
  const cardKey = card?.index ?? -1;
  React.useEffect(() => {
    setChosen(null);
    setRevealed(null);
  }, [cardKey]);

  const onPick = async (optionIdx: number) => {
    if (!card || revealed) return;
    setChosen(optionIdx);
    const wasCorrect = optionIdx === card.correctIndex;
    setRevealed({
      correctIndex: card.correctIndex,
      chosenIndex: optionIdx,
      wasCorrect,
    });
    const hold = wasCorrect ? FEEDBACK_MS_CORRECT : FEEDBACK_MS_WRONG;
    await new Promise<void>((r) => setTimeout(r, hold));
    await answer(optionIdx);
  };

  const total = progress.correct + progress.wrong;
  const accuracy = total === 0 ? null : Math.round((progress.correct / total) * 100);
  // Disable the "too easy" button while a card is being revealed so a
  // mid-feedback tap can't race the answer's persistence.
  const bumpDisabled = chosen !== null;

  return (
    <div className="card-fade mx-auto flex w-full max-w-[var(--content-width)] flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{MODE_LABEL[mode]}</span>
          {' · '}
          <span title="Difficulty">L{progress.difficulty}/{LEVEL_COUNT}</span>
          {total > 0 && (
            <>
              {' · '}
              <span className="text-[color:var(--success)]">{progress.correct}</span>
              {' / '}
              <span className="text-[color:var(--danger)]">{progress.wrong}</span>
              {accuracy !== null && (
                <>
                  {' · '}
                  {accuracy}%
                </>
              )}
            </>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void reset()}>
          <RefreshCw className="size-4" />
        </Button>
      </header>

      {!loaded ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          Loading…
        </div>
      ) : exhausted || !card ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg font-medium">
            You&apos;ve seen every card at level {progress.difficulty}.
          </p>
          {canBump ? (
            <>
              <p className="text-muted-foreground">
                Move up to level {progress.difficulty + 1} or reset and start over.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => void bump()}>
                  <Sparkles className="size-4" />
                  Level up
                </Button>
                <Button variant="ghost" onClick={() => void reset()}>
                  Reset
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                You&apos;ve cleared the hardest tier. Reset to start over.
              </p>
              <Button onClick={() => void reset()}>Reset deck</Button>
            </>
          )}
        </div>
      ) : (
        <>
          <QuizCard
            prompt={card.prompt}
            mode={mode}
            feedback={revealed ? (revealed.wasCorrect ? 'correct' : 'wrong') : 'idle'}
          />
          <div className="flex flex-col gap-2">
            {card.options.map((opt, i) => {
              let state: 'idle' | 'correct' | 'wrong' | 'dimmed' = 'idle';
              if (revealed) {
                if (i === revealed.correctIndex) state = 'correct';
                else if (i === revealed.chosenIndex) state = 'wrong';
                else state = 'dimmed';
              }
              return (
                <AnswerButton
                  key={`${card.index}-${i}`}
                  label={opt}
                  state={state}
                  disabled={chosen !== null}
                  onClick={() => void onPick(i)}
                />
              );
            })}
          </div>
          {canBump && (
            <button
              type="button"
              className="too-easy-btn"
              onClick={() => void bump()}
              disabled={bumpDisabled}
            >
              <Sparkles className="size-3.5" />
              This is too easy
            </button>
          )}
        </>
      )}
    </div>
  );
}
