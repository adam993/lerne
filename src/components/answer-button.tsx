import * as React from 'react';

type State = 'idle' | 'correct' | 'wrong' | 'dimmed';

interface Props {
  label: string;
  state: State;
  disabled: boolean;
  onClick: () => void;
}

export function AnswerButton({ label, state, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      className="answer-option"
      data-state={state}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
