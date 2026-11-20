/** Tiny store for the parent tab badge (pending approvals), written by the dashboard. */
let pending = 0;
const listeners = new Set<(n: number) => void>();

export function setPendingApprovals(n: number) {
  if (n === pending) return;
  pending = n;
  listeners.forEach((l) => l(n));
}

export function getPendingApprovals() {
  return pending;
}

export function subscribePendingApprovals(l: (n: number) => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
