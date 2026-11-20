/**
 * Where to go right after sign-in. Auth screens set it before calling login(); the root
 * navigator consumes it instead of sending the user to their default home.
 */
let next: string | null = null;

export function setNextRoute(path: string) {
  next = path;
}

export function consumeNextRoute(): string | null {
  const n = next;
  next = null;
  return n;
}
