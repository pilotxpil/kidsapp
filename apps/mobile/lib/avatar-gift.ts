const listeners = new Set<() => void>();
let pending = false;

export function markAvatarGiftUnlocked() {
  pending = true;
  listeners.forEach((l) => l());
}

export function consumeAvatarGiftUnlocked(): boolean {
  if (!pending) return false;
  pending = false;
  listeners.forEach((l) => l());
  return true;
}

export function isAvatarGiftPending() {
  return pending;
}

export function subscribeAvatarGift(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
