/** Web build: subscriptions are bought in the Android / iOS app. */
export interface PlanOption {
  id: 'monthly' | 'yearly';
  title: string;
  price: string;
  perMonth?: string;
  pkg: unknown;
}
export type PurchaseOutcome = 'purchased' | 'cancelled';
export function purchasesAvailable(): boolean {
  return false;
}
export async function initPurchases(_familyId: string): Promise<boolean> {
  return false;
}
export async function getPlanOptions(): Promise<PlanOption[]> {
  return [];
}
export async function buyPlan(_o: PlanOption): Promise<PurchaseOutcome> {
  throw new Error('רכישה זמינה באפליקציה לאנדרואיד');
}
export async function restorePurchases(): Promise<void> {
  throw new Error('שחזור רכישות זמין באפליקציה לאנדרואיד');
}
