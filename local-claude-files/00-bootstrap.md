# Lerne — bootstrap notes

This project was forked from `mantabe` (a mantra-reminder app) and
stripped down to a German↔English vocab quiz. These notes capture what
was kept, what was dropped, and where the "obvious next steps" live.

## What was reused from mantabe (intentionally)

- Vite + React 19 + TypeScript wiring (`vite.config.ts`, `tsconfig.json`,
  `index.html`, `src/main.tsx`).
- Tailwind 4 setup with `@theme inline` tokens declared inside
  `src/styles.css` (no separate `tailwind.config.*`).
- shadcn UI primitives — Button, Dialog, Input, Label. The Mantrabe
  copies referenced a `font-serif-zen` utility that came out with the
  zen palette; those references were rewritten to use
  `var(--font-display)` (Inter) instead.
- `lib/utils.ts` (`cn()`), `lib/platform.ts` (Capacitor `isNative` /
  `isAndroid` / `isIOS` guards).
- Capacitor Preferences for persistence (web → localStorage, native →
  SharedPreferences). Same pattern as `mantabe/src/lib/storage.ts` but
  trimmed to the few keys this app actually needs.
- The version-management trio: `version.json`, `scripts/version.cjs`,
  the `release` / `bump` yarn scripts. Kept because they're
  self-contained and useful even for a tiny app.
- Android build pipeline: `scripts/build-android.sh`,
  `scripts/run-android-adb.sh`, `scripts/adb-launch.sh`,
  `.github/workflows/android-release.yml`. All renamed/simplified —
  the Mantrabe-specific `apply-android-customizations.cjs` (which
  patched the AndroidManifest with notification permissions and
  receiver entries) was deleted because Lerne has no native plugins.

## What was dropped

- All mantra/notification code: `scheduler.ts`, `notifications.ts`,
  `sounds.ts`, `bell-chime.ts`, `native-mantra-scheduler.ts`,
  `android-native-src/`, `android-resources/`, the
  `MantraScheduler`/`MantraAlarmReceiver`/`MantraBootReceiver` Java
  sources, `apply-android-customizations.cjs`.
- Bundled bell sound assets (the four `.wav` / `.mp3` files in
  `public/`).
- Supabase + auth: `supabase/`, `lib/supabase.ts`, `lib/auth.tsx`,
  the `account-menu` / `sign-in-form` / `sign-in-dialog` components,
  the OAuth deep-link patch in `apply-android-customizations.cjs`.
  (Lerne is fully offline.)
- Electron desktop wrapper: `electron/`, the `electron`,
  `electron:dev`, `dist:linux` scripts, the `electron` /
  `electron-builder` deps, `scripts/build-linux.sh`.
- iOS pipeline: `scripts/build-ios.sh`, `cap:add:ios`, `cap:open:ios`,
  the `@capacitor/ios` dep. Easy to re-add — same pattern as Android.
- Mantrabe-specific Radix primitives (`alert-dialog`, `dropdown-menu`,
  `select`, `switch`, `textarea`) — none used by the quiz UI.
- Zen-themed components: `enso.tsx`, `grass.tsx`, `footer.tsx`,
  `step-indicator.tsx`, `kind-toggle.tsx`, `permission-banner.tsx`,
  `notifications-intro.tsx`, `sync-error-toast.tsx`.

## Data sourcing

- **Words (909 unique)** — `src/data/words.json`. Built from
  [SMenigat/thousand-most-common-words](https://github.com/SMenigat/thousand-most-common-words)
  (`words/de.json`). The raw list has 1000 entries but contains 76
  duplicate German words for multi-sense words (e.g. `wie` → `as`,
  `how`, `like`). After dedup we have 909. We apply a small override
  map for the worst high-frequency mistranslations (e.g. `wie → how`
  instead of `wie → as`). See `/tmp/lerne-data/build-words.py` —
  re-runnable.
- **Phrases (629 unique)** — `src/data/phrases.json`. Curated by
  topical group (greetings, politeness, time, directions, food,
  shopping, work, family, health, emotions, questions, requests,
  numbers, days/months, colors, household, verb conjugations).
  Source script: `/tmp/lerne-data/build-phrases.py`.
- **Sentences (101 unique)** — `src/data/sentences.json`. 100
  full-sentence everyday utterances + 1 from a category overlap.
  Source script: `/tmp/lerne-data/build-sentences.py`.

The build scripts under `/tmp/lerne-data/` are not committed — they
were one-off generators. If you want to regenerate any list, copy
them into `scripts/` and adjust paths.

## Quiz mechanics

- Three modes: `words`, `phrases`, `sentences`. Each has its own
  bundled JSON corpus and its own persisted progress slot.
- Each card: one German prompt + 5 English options (1 correct, 4
  random distractors from the same mode whose English translation
  differs from the correct one).
- Wrong answer → re-queued at `currentPosition + 3` (matches the
  user's spec: "appear again after 3 new cards"). Verified by a
  small node test (`/tmp/lerne-data/test-engine.mjs`) — the missed
  card consistently reappears at trace position 4 (3 fresh cards
  after the miss).
- Right answer → drops the entry from re-queue if it was waiting
  there, increments the per-mode `correct` counter.
- Persisted shape per mode (in Preferences):
  `{ seen: number[], requeue: [number, number][], correct: number, wrong: number }`.
  Stored under `lerne.progress.<mode>.v1`.
- "Exhausted" state: when every entry has been seen and re-queue is
  empty, the screen offers a Reset button.

## Open items / things to revisit

1. **909 words, not 1000** — the user spec said 1000. Closing the
   gap requires either accepting non-frequency-ranked padding (a few
   common words from another list) or re-sourcing from a list where
   each German word appears once. Easiest fix: append ~90 more
   curated common words to `words.json`.
2. **Translation quality** — for high-frequency function words
   (`wie`, `bei`, `auf`, `zu`, etc.) the canonical English
   translation is debatable. A future pass could let an entry carry
   `alts: string[]` — accept any alt as correct, exclude alts from
   distractor pool — without breaking the existing schema.
3. **Mode picker doesn't show "resume" affordance** even though we
   persist `lerne.lastMode.v1`. Quick win.
4. **Android scaffold** has not been generated in this session. Run
   `yarn build:android` (needs JDK + Android SDK) to bring up
   `./android/`. There are no Lerne-specific native overrides, so
   the default Capacitor scaffold should just work.
5. **Splash / icon** — `public/` is empty. Ship a Lerne icon before
   the first APK build, otherwise Capacitor's default green circle
   ships.

## Verifying it works

```bash
yarn install
yarn typecheck      # passes clean
yarn build          # 297KB JS / 94KB gzipped
yarn dev            # http://localhost:5173
```

The runtime engine test lives at `/tmp/lerne-data/test-engine.mjs`
(not committed). Re-run it with `node /tmp/lerne-data/test-engine.mjs`
after edits to `quiz-engine.ts` to confirm the re-queue invariant
still holds.
