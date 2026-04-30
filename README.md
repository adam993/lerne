# Lerne

A tiny offline German↔English vocab quiz. Three modes — words, phrases,
sentences — each with a curated list of high-frequency entries. The app
shows one German prompt and five English options; pick the right one.
Wrong answers reappear after three new prompts so you actually learn the
ones you miss.

Runs on **web** and **Android**. No account, no server, no
notifications. Progress is stored locally on the device.

## Stack

- **Vite + React 19 + TypeScript** for the app itself
- **Tailwind 4 + shadcn/ui primitives** for styling, theme declared
  inline inside `src/styles.css` (no separate `tailwind.config`)
- **[Capacitor](https://capacitorjs.com/)** for the Android build, with
  `@capacitor/preferences` for per-mode progress storage (transparently
  falls back to `localStorage` in a regular browser)
- **Yarn 4** as the package manager (`nodeLinker: node-modules` —
  Capacitor's native projects expect a real `node_modules` layout)

## Running locally

```bash
yarn install
yarn dev        # opens at http://localhost:5173
```

There are no env vars to fill in.

## Building installers

| Target  | Command              | Output                                  |
| ------- | -------------------- | --------------------------------------- |
| Web     | `yarn build`         | `dist/`                                 |
| Android | `yarn build:android` | `release/lerne-android-latest.apk`      |

### Android (Capacitor)

Requirements: JDK 17+ on `PATH`, Android SDK with platform-tools, and
`ANDROID_SDK_ROOT` (or `ANDROID_HOME`) set.

```bash
yarn build:android
```

The first run scaffolds `./android/`. To install on a connected device:

```bash
adb install -r release/lerne-android-latest.apk
```

For iterating on a phone over wireless ADB, see
`scripts/run-android-adb.sh`.

## How the quiz works

1. **Mode picker** — pick words / phrases / sentences.
2. **Prompt** — the app shows one German entry from the corpus.
3. **Options** — five English options: the correct translation plus four
   random distractors drawn from the same mode.
4. **Feedback** — tap one. If it's right, a checkmark flashes and the
   next card is dealt. If it's wrong, the correct answer is revealed and
   the missed card is re-queued to reappear after three new prompts.
5. **Progress** — a small counter at the top tracks correct vs. wrong
   for the current session. The deck position and re-queue are persisted
   so closing the app picks up where you left off.

## Project layout

```
lerne/
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx                 # screen state (picker | quiz)
│   ├── components/
│   │   ├── ui/                 # shadcn primitives (Button, Dialog, Input, Label)
│   │   ├── mode-picker.tsx
│   │   ├── quiz-screen.tsx
│   │   ├── quiz-card.tsx       # the German prompt
│   │   └── answer-button.tsx
│   ├── hooks/
│   │   └── use-quiz.ts         # deck state + persistence orchestration
│   ├── lib/
│   │   ├── platform.ts         # isNative / isAndroid
│   │   ├── storage.ts          # progress persistence (Preferences/localStorage)
│   │   ├── quiz-engine.ts      # pure: deck + re-queue logic
│   │   └── utils.ts            # cn()
│   ├── data/
│   │   ├── words.json          # 1000 most-common German words
│   │   ├── phrases.json        # 500 most-common phrases
│   │   └── sentences.json      # 100 most-common sentences
│   └── styles.css              # Tailwind 4 + theme tokens
├── public/
├── scripts/
│   ├── version.cjs
│   ├── build-android.sh
│   ├── run-android-adb.sh
│   └── adb-launch.sh
├── capacitor.config.json
└── package.json
```

## Why JSON instead of SQLite?

For 1,600 read-only rows, bundled JSON is smaller (no 1MB+ WASM blob),
faster (no DB init at boot), and behaves identically on web and inside
the Android WebView. Per-user progress lives in
`@capacitor/preferences`, which stores a few small key-value entries on
each platform. If the corpus ever grows past tens of thousands of rows
or the app needs ad-hoc query capability, swapping JSON for sql.js is
straightforward — see `src/data/` and `src/lib/quiz-engine.ts`.
