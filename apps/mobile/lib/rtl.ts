import { I18nManager, Platform, TextStyle, ViewStyle } from 'react-native';

/** Allow system Hebrew locale to control RTL; no forceRTL. */
export function initNativeRTL() {
  if (Platform.OS === 'web') return;
  I18nManager.allowRTL(true);
}

function hebrewAlign(): 'left' | 'right' {
  if (Platform.OS === 'web') return 'right';
  return I18nManager.isRTL ? 'left' : 'right';
}

function webDirection(): ViewStyle {
  return Platform.OS === 'web' ? { direction: 'rtl' } : {};
}

function nativeRowDirection(): 'row' | 'row-reverse' {
  return I18nManager.isRTL ? 'row' : 'row-reverse';
}

export const rtl = {
  get root(): ViewStyle {
    return { flex: 1, ...webDirection() };
  },

  /** Streak/badge left · greeting/title right */
  headerSplit: {
    flexDirection: 'row',
    direction: 'ltr',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  } as ViewStyle,

  /** Icon on the right (icon first in JSX) */
  get cardRow(): ViewStyle {
    if (Platform.OS === 'web') {
      return { flexDirection: 'row', direction: 'rtl', alignItems: 'flex-start', width: '100%' };
    }
    return { flexDirection: nativeRowDirection(), alignItems: 'flex-start', width: '100%' };
  },

  get row(): ViewStyle {
    return { flexDirection: 'row', ...webDirection() };
  },

  get rowBetween(): ViewStyle {
    return {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      ...webDirection(),
    };
  },

  get tabs(): ViewStyle {
    return { flexDirection: 'row', flexWrap: 'wrap', ...webDirection() };
  },

  get scrollContent(): ViewStyle {
    return {
      width: '100%',
      alignSelf: 'stretch',
      alignItems: 'stretch',
      ...webDirection(),
    };
  },

  get text(): TextStyle {
    return { textAlign: hebrewAlign(), writingDirection: 'rtl' };
  },

  get textFull(): TextStyle {
    return {
      textAlign: hebrewAlign(),
      writingDirection: 'rtl',
      width: '100%',
      alignSelf: 'stretch',
    };
  },

  textCenter: {
    textAlign: 'center',
  } as TextStyle,
};
