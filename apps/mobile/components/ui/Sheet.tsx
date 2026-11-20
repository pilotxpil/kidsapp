import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme-context';
import { INK, WHITE } from '../../constants/themes';
import { Txt } from './Txt';
import { Row } from './Layout';
import { ToyButton } from './ToyButton';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Scroll the body (forms). */
  scroll?: boolean;
}

/** Bottom sheet: slides up as a big sticker; tap the backdrop or ✕ to close. */
export function Sheet({ visible, onClose, title, subtitle, children, footer, scroll = true }: SheetProps) {
  const { world } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(600);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.value = 600;
      y.value = withSpring(0, { damping: 26, stiffness: 340, overshootClamping: true });
      fade.value = withTiming(1, { duration: 180 });
    } else if (mounted) {
      fade.value = withTiming(0, { duration: 160 });
      y.value = withTiming(700, { duration: 200 }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!mounted) return null;

  const Body = scroll ? ScrollView : View;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="סגירה" />
        </Animated.View>
        <View style={styles.anchor} pointerEvents="box-none">
          <Animated.View style={[styles.sheet, { backgroundColor: world.paper, paddingBottom: insets.bottom + 16 }, sheetStyle]}>
            <View style={styles.grabber} />
            {title ? (
              <Row justify="between" align="flex-start" style={{ paddingHorizontal: 18, marginBottom: 8 }} gap={12}>
                <View style={{ flex: 1 }}>
                  <Txt v="h1">{title}</Txt>
                  {subtitle ? <Txt v="body" muted>{subtitle}</Txt> : null}
                </View>
                <ToyButton icon="x" size="sm" variant="secondary" onPress={onClose} accessibilityLabel="סגירה" sound={false} />
              </Row>
            ) : null}
            <Body
              style={scroll ? { maxHeight: 560 } : undefined}
              contentContainerStyle={scroll ? { paddingHorizontal: 18, paddingBottom: 8, gap: 14 } : undefined}
              keyboardShouldPersistTaps="handled"
            >
              {scroll ? children : <View style={{ paddingHorizontal: 18, gap: 14 }}>{children}</View>}
            </Body>
            {footer ? <View style={{ paddingHorizontal: 18, paddingTop: 12, gap: 10 }}>{footer}</View> : null}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface DialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

/** Centered confirm dialog. */
export function Dialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'ביטול',
  destructive,
  loading,
  onConfirm,
  onCancel,
  children,
}: DialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.center} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onCancel} />
        <View style={styles.dialog}>
          <Txt v="h2" align="center">
            {title}
          </Txt>
          {message ? (
            <Txt v="body" muted align="center">
              {message}
            </Txt>
          ) : null}
          {children}
          <View style={{ gap: 10, marginTop: 6 }}>
            <ToyButton
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              full
              size="md"
            />
            <ToyButton title={cancelLabel} variant="ghost" onPress={onCancel} full size="md" sound={false} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(36,21,71,0.55)' },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: INK,
    paddingTop: 10,
    maxHeight: '92%',
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(36,21,71,0.2)',
    marginBottom: 10,
  },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  dialog: {
    backgroundColor: WHITE,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: INK,
    padding: 22,
    gap: 8,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    boxShadow: `0px 6px 0px ${INK}`,
  },
});
