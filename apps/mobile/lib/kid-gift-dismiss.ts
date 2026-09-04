type KidGiftKind = 'star' | 'wheel';

const dismissed: Record<KidGiftKind, boolean> = { star: false, wheel: false };
const listeners = new Set<() => void>();

export function dismissKidGift(kind: KidGiftKind) {
  dismissed[kind] = true;
  listeners.forEach((listener) => listener());
}

export function isKidGiftDismissed(kind: KidGiftKind) {
  return dismissed[kind];
}

/** Clears session dismissals — call when the kid re-enters the app. */
export function resetKidGiftDismissals() {
  dismissed.star = false;
  dismissed.wheel = false;
  listeners.forEach((listener) => listener());
}

export function subscribeKidGiftDismiss(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
