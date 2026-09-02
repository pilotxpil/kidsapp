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
  return {};
}

function nativeRowDirection(): 'row' | 'row-reverse' {
  return I18nManager.isRTL ? 'row' : 'row-reverse';
}

/** Physical LTR: first JSX child on the left (e.g. badge · title). */
function headerSplitDirection(): 'row' | 'row-reverse' {
  if (Platform.OS === 'web') return 'row-reverse';
  return I18nManager.isRTL ? 'row-reverse' : 'row';
}

export const rtl = {
  get root(): ViewStyle {
    return { flex: 1, ...webDirection() };
  },

  /** Streak/badge left · greeting/title right */
  get headerSplit(): ViewStyle {
    return {
      flexDirection: headerSplitDirection(),
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    };
  },

  /** Icon on the right (icon first in JSX) */
  get cardRow(): ViewStyle {
    if (Platform.OS === 'web') {
      return { flexDirection: 'row', alignItems: 'flex-start', width: '100%' };
    }
    return { flexDirection: nativeRowDirection(), alignItems: 'flex-start', width: '100%' };
  },

  get row(): ViewStyle {
    if (Platform.OS === 'web') {
      return { flexDirection: 'row', ...webDirection() };
    }
    return { flexDirection: nativeRowDirection(), width: '100%' };
  },

  /** Icon + label chip — hugs content. Do not use `row` (it stretches to 100%). */
  get rowInline(): ViewStyle {
    if (Platform.OS === 'web') {
      return { flexDirection: 'row', alignItems: 'center' };
    }
    return { flexDirection: nativeRowDirection(), alignItems: 'center' };
  },

  get rowBetween(): ViewStyle {
    if (Platform.OS === 'web') {
      return {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...webDirection(),
      };
    }
    return {
      flexDirection: nativeRowDirection(),
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    };
  },

  get tabs(): ViewStyle {
    if (Platform.OS === 'web') {
      return { flexDirection: 'row', flexWrap: 'wrap', ...webDirection() };
    }
    return { flexDirection: nativeRowDirection(), flexWrap: 'wrap', width: '100%' };
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
