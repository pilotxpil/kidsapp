import { I18nManager, Platform, type FlexStyle, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Hebrew layout that is right-to-left on every device:
 * - web: <html dir="rtl"> makes flex rows flow right→left.
 * - native on a Hebrew-locale phone: I18nManager.isRTL is true and RN mirrors layout.
 * - native on an LTR-locale phone: we mirror by hand (row-reverse, flex-end).
 * We never call forceRTL (it needs an app restart and breaks the first launch).
 */
const isWeb = Platform.OS === 'web';
const flowsRtl = isWeb || I18nManager.isRTL;
/** RN swaps left/right style keys under native RTL (doLeftAndRightSwapInRTL defaults to true). */
const swapsSides = !isWeb && I18nManager.isRTL && (I18nManager as unknown as { doLeftAndRightSwapInRTL?: boolean }).doLeftAndRightSwapInRTL !== false;

/** flexDirection whose first child sits on the physical right. */
export const ROW: FlexStyle['flexDirection'] = flowsRtl ? 'row' : 'row-reverse';
/** alignItems / justifyContent value for the physical right ("start" in Hebrew). */
export const START: 'flex-start' | 'flex-end' = flowsRtl ? 'flex-start' : 'flex-end';
/** …and for the physical left ("end" in Hebrew). */
export const END: 'flex-start' | 'flex-end' = flowsRtl ? 'flex-end' : 'flex-start';

/** textAlign value that lands on the physical right. */
export const TEXT_START: TextStyle['textAlign'] = isWeb ? 'right' : I18nManager.isRTL ? 'left' : 'right';
export const TEXT_END: TextStyle['textAlign'] = isWeb ? 'left' : I18nManager.isRTL ? 'right' : 'left';

/** Absolute offset from the physical right / left edge. */
export function fromRight(n: number): ViewStyle {
  return swapsSides ? { left: n } : { right: n };
}
export function fromLeft(n: number): ViewStyle {
  return swapsSides ? { right: n } : { left: n };
}

/** +1 when "forward" (reading direction) is toward the physical left — always, in Hebrew. */
export const FORWARD_X = -1;

export const rowStyle: ViewStyle = { flexDirection: ROW, alignItems: 'center' };
