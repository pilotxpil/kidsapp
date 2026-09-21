import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';

export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

/** Lifts modal / form chrome above the keyboard on iOS and Android. */
export function KeyboardSheet({
  children,
  style,
  androidInset = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Android activity resize already covers full screens — keep this for Modals. */
  androidInset?: boolean;
}) {
  const keyboardHeight = useKeyboardHeight();
  const androidPad = androidInset && Platform.OS === 'android' ? keyboardHeight : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[{ flex: 1, paddingBottom: androidPad }, style]}>{children}</View>
    </KeyboardAvoidingView>
  );
}

export const KeyboardScroll = React.forwardRef<ScrollView, ScrollViewProps>(function KeyboardScroll(
  { contentContainerStyle, ...props },
  ref
) {
  return (
    <ScrollView
      ref={ref}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets
      {...props}
      contentContainerStyle={contentContainerStyle}
    />
  );
});
