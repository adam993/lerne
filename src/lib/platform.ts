// Single place for "where am I running?" checks. The Capacitor calls are
// guarded so a missing global never throws — callers can rely on these
// returning a boolean / known string.

import { Capacitor } from '@capacitor/core';

export type PlatformName = 'web' | 'ios' | 'android';

export function getPlatform(): PlatformName {
  try {
    return Capacitor.getPlatform() as PlatformName;
  } catch {
    return 'web';
  }
}

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isAndroid(): boolean {
  return getPlatform() === 'android';
}

export function isIOS(): boolean {
  return getPlatform() === 'ios';
}
