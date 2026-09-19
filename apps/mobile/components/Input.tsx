import React, { useMemo, useState } from 'react';
import {
  TextInput,
  StyleSheet,
  View,
  Text,
  TextInputProps,
  ViewStyle,
  Pressable,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { useType } from '../lib/typography';
import { rtl } from '../lib/rtl';
import { t } from '../lib/i18n';

interface InputProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
  /** LTR value (email, password). The Hebrew label stays RTL. */
  ltr?: boolean;
}

function EyeIcon({ crossed, color }: { crossed: boolean; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        d="M2.2 12S6 5.5 12 5.5 21.8 12 21.8 12 18 18.5 12 18.5 2.2 12 2.2 12z"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={2.6} fill={color} />
      {crossed ? (
        <Path
          d="M4 4l16 16"
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      ) : null}
    </Svg>
  );
}

export function Input({
  label,
  containerStyle,
  style,
  autoCapitalize,
  autoCorrect,
  secureTextEntry,
  ltr,
  ...props
}: InputProps) {
  const { colors, borderRadius, id: themeId } = useTheme();
  const type = useType();
  const ember = themeId === 'ember';
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isSecretField = Boolean(secureTextEntry);
  const hideText = isSecretField && !passwordVisible;
  // Credentials / username-style fields: open keyboard in lowercase by default.
  const resolvedAutoCapitalize =
    autoCapitalize ?? (secureTextEntry ? 'none' : undefined);
  const resolvedAutoCorrect = autoCorrect ?? (secureTextEntry ? false : undefined);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { marginBottom: spacing.md },
        label: {
          color: colors.text,
          fontSize: 14,
          fontWeight: '600',
          marginBottom: spacing.sm,
          ...type.ui,
        },
        fieldWrap: {
          position: 'relative',
          direction: 'ltr',
        },
        input: ember
          ? {
              backgroundColor: 'rgba(12,8,6,0.72)',
              borderRadius: 16,
              paddingTop: spacing.md,
              paddingBottom: spacing.md,
              paddingLeft: spacing.md,
              paddingRight: spacing.md,
              fontSize: 16,
              color: colors.text,
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.4)',
              ...type.body,
            }
          : {
              backgroundColor: colors.bgCardLight,
              borderRadius: borderRadius.sm,
              paddingTop: spacing.md,
              paddingBottom: spacing.md,
              paddingLeft: spacing.md,
              paddingRight: spacing.md,
              fontSize: 16,
              color: colors.text,
              borderTopWidth: 2,
              borderLeftWidth: 2,
              borderBottomWidth: 2,
              borderRightWidth: 2,
              borderTopColor: colors.borderLight,
              borderLeftColor: colors.borderLight,
              borderBottomColor: colors.borderDark,
              borderRightColor: colors.borderDark,
            },
        ltrText: {
          textAlign: 'left',
          writingDirection: 'ltr',
        },
        inputWithToggle: {
          paddingRight: 44,
        },
        toggle: {
          position: 'absolute',
          right: spacing.xs,
          top: 0,
          bottom: 0,
          width: 40,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        },
      }),
    [themeId, colors, borderRadius, ember, type.ui, type.body]
  );

  const input = (
    <TextInput
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[
        styles.input,
        isSecretField && styles.inputWithToggle,
        ltr ? styles.ltrText : rtl.text,
        style,
      ]}
      secureTextEntry={hideText}
      autoCapitalize={resolvedAutoCapitalize}
      autoCorrect={resolvedAutoCorrect}
    />
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, rtl.text]}>{label}</Text>}
      {isSecretField ? (
        <View style={styles.fieldWrap}>
          {input}
          <Pressable
            onPress={() => setPasswordVisible((v) => !v)}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? t('hidePassword') : t('showPassword')}
            hitSlop={8}
          >
            <EyeIcon crossed={passwordVisible} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        input
      )}
    </View>
  );
}
