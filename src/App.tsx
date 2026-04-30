import * as React from 'react';
import { ModePicker } from '@/components/mode-picker';
import { QuizScreen } from '@/components/quiz-screen';
import { setLastMode } from '@/lib/storage';
import type { Mode } from '@/types/quiz';

type Screen = { name: 'picker' } | { name: 'quiz'; mode: Mode };

export function App() {
  const [screen, setScreen] = React.useState<Screen>({ name: 'picker' });

  return (
    <div
      data-id="app-shell"
      data-screen={screen.name}
      className="mx-auto flex min-h-screen w-full flex-1 flex-col pt-[var(--safe-top)] pb-[var(--safe-bottom)]"
    >
      {screen.name === 'picker' ? (
        <ModePicker
          onPick={(m) => {
            void setLastMode(m);
            setScreen({ name: 'quiz', mode: m });
          }}
        />
      ) : (
        <QuizScreen mode={screen.mode} onBack={() => setScreen({ name: 'picker' })} />
      )}
    </div>
  );
}
