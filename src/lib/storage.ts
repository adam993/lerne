// Local persistence for per-mode quiz progress.
//
// Web: uses localStorage. Native (Android via Capacitor): uses
// @capacitor/preferences, which on Android maps to SharedPreferences.
// Both are key-value; we serialise the ModeProgress object as JSON.
//
// We import @capacitor/preferences statically: Vite resolves it at build
// time so it ends up in the main chunk. Dynamic imports caused white
// screens on Android in the prior incarnation of this scaffold when the
// WebView's first paint raced the sub-chunk fetch.

import { Preferences } from '@capacitor/preferences';
import { isNative } from '@/lib/platform';
import { emptyProgress, LEVEL_COUNT } from '@/lib/quiz-engine';
import type { Difficulty, Mode, ModeProgress } from '@/types/quiz';

const KEY_PREFIX = 'lerne.progress.';
const KEY_LAST_MODE = 'lerne.lastMode.v1';

function keyFor(mode: Mode): string {
  return `${KEY_PREFIX}${mode}.v1`;
}

async function readRaw(key: string): Promise<string | null> {
  if (isNative()) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

async function writeRaw(key: string, value: string): Promise<void> {
  if (isNative()) {
    await Preferences.set({ key, value });
    return;
  }
  localStorage.setItem(key, value);
}

async function removeRaw(key: string): Promise<void> {
  if (isNative()) {
    await Preferences.remove({ key });
    return;
  }
  localStorage.removeItem(key);
}

function clampDifficulty(n: unknown): Difficulty {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 1;
  const clamped = Math.min(LEVEL_COUNT, Math.max(1, Math.round(n)));
  return clamped as Difficulty;
}

/** Loads persisted progress for a mode, or a clean empty state if the
 *  user has never played that mode. Older saves missing the
 *  `difficulty` field are forward-compat'd to level 1. JSON parsing
 *  errors throw — better to fail loudly than silently wipe progress. */
export async function loadProgress(mode: Mode): Promise<ModeProgress> {
  const raw = await readRaw(keyFor(mode));
  if (!raw) return emptyProgress();
  const parsed = JSON.parse(raw) as Partial<ModeProgress>;
  if (
    !Array.isArray(parsed.seen) ||
    !Array.isArray(parsed.requeue) ||
    typeof parsed.correct !== 'number' ||
    typeof parsed.wrong !== 'number'
  ) {
    return emptyProgress();
  }
  return {
    difficulty: clampDifficulty(parsed.difficulty),
    seen: parsed.seen,
    requeue: parsed.requeue,
    correct: parsed.correct,
    wrong: parsed.wrong,
  };
}

export async function saveProgress(mode: Mode, p: ModeProgress): Promise<void> {
  await writeRaw(keyFor(mode), JSON.stringify(p));
}

export async function resetProgress(mode: Mode): Promise<void> {
  await removeRaw(keyFor(mode));
}

export async function getLastMode(): Promise<Mode | null> {
  const raw = await readRaw(KEY_LAST_MODE);
  if (raw === 'words' || raw === 'phrases' || raw === 'sentences') return raw;
  return null;
}

export async function setLastMode(mode: Mode): Promise<void> {
  await writeRaw(KEY_LAST_MODE, mode);
}
