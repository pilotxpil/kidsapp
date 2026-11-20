/** Web build: no ads. */
export function bannerUnitId(): string | undefined {
  return undefined;
}
export function adsAvailable(): boolean {
  return false;
}
export function loadAds(): null {
  return null;
}
export async function initAds(): Promise<boolean> {
  return false;
}
