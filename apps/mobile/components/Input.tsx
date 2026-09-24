import React, { useMemo, useState } from 'react';
import {
  TextInput,
  StyleSheet,
  View,
  Text,
  TextInputProps,
  ViewStyle,
  Pressable,
  Platform,
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
  compact?: boolean;
}

function isCompleteEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Android/iOS autofill in RTL often appends the full suggestion onto the typed prefix. */
function collapseAutofillDuplicate(prev: string, next: string) {
  if (!next || next === prev) return next;
  if (prev && next.startsWith(prev) && next.length > prev.length) {
    const inserted = next.slice(prev.length);
    if (isCompleteEmail(inserted) && inserted.toLowerCase().startsWith(prev.toLowerCase())) {
      return inserted;
    }
  }
  if (prev && next.endsWith(prev) && next.length > prev.length) {
    const inserted = next.slice(0, next.length - prev.length);
    if (isCompleteEmail(inserted)) {
      return inserted;
    }
  }
  if (next.length % 2 === 0) {
    const half = next.slice(0, next.length / 2);
    if (half && half === next.slice(next.length / 2) && isCompleteEmail(half)) {
      return half;
    }
  }
  return next;
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
  compact,
  value,
  onChangeText,
  keyboardType,
  autoComplete,
  textContentType,
  ...props
}: InputProps) {
  const { colors, borderRadius, id: themeId } = useTheme();
  const type = useType();
  const ember = themeId === 'ember';
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isSecretField = Boolean(secureTextEntry);
  const hideText = isSecretField && !passwordVisible;
  const isEmailField =
    keyboardType === 'email-address' || autoComplete === 'email' || textContentType === 'emailAddress';
  // Credentials / username-style fields: open keyboard in lowercase by default.
  const resolvedAutoCapitalize =
    autoCapitalize ?? (secureTextEntry || isEmailField || ltr ? 'none' : undefined);
  const resolvedTextContentType =
    textContentType ?? (isEmailField ? 'emailAddress' : isSecretField ? 'password' : undefined);
  const resolvedAutoComplete =
    autoComplete ?? (isEmailField ? 'email' : isSecretField ? 'current-password' : undefined);
  const isCredentialField =
    isSecretField ||
    isEmailField ||
    resolvedAutoComplete === 'username' ||
    resolvedAutoComplete === 'email' ||
    resolvedAutoComplete === 'password' ||
    resolvedAutoComplete === 'current-password' ||
    resolvedAutoComplete === 'new-password' ||
    resolvedTextContentType === 'username' ||
    resolvedTextContentType === 'password' ||
    resolvedTextContentType === 'emailAddress';
  // Password fields must stay a real password (no autocorrect) or Android will not offer to save.
  // The account field must allow suggestions, or the saved-login chip never appears.
  const resolvedAutoCorrect =
    Platform.OS === 'android' && isSecretField
      ? false
      : Platform.OS === 'android' && isCredentialField
        ? true
        : (autoCorrect ?? (secureTextEntry || isEmailField || ltr ? false : undefined));

  const handleChangeText = (text: string) => {
    const prev = typeof value === 'string' ? value : '';
    onChangeText?.(isEmailField ? collapseAutofillDuplicate(prev, text) : text);
  };

  const fieldPadV = compact ? spacing.sm : spacing.md;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { marginBottom: compact ? spacing.sm : spacing.md },
        label: {
          color: colors.text,
          fontSize: compact ? 13 : 14,
          fontWeight: '600',
          marginBottom: compact ? spacing.xs : spacing.sm,
          ...type.ui,
        },
        fieldWrap: {
          position: 'relative',
        },
        input: ember
          ? {
              backgroundColor: 'rgba(12,8,6,0.72)',
              borderRadius: 16,
              paddingTop: fieldPadV,
              paddingBottom: fieldPadV,
              paddingLeft: spacing.md,
              paddingRight: spacing.md,
              fontSize: compact ? 15 : 16,
              color: colors.text,
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.4)',
              ...type.body,
            }
          : {
              backgroundColor: colors.bgCardLight,
              borderRadius: borderRadius.sm,
              paddingTop: fieldPadV,
              paddingBottom: fieldPadV,
              paddingLeft: spacing.md,
              paddingRight: spacing.md,
              fontSize: compact ? 15 : 16,
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
    [themeId, colors, borderRadius, ember, type.ui, type.body, compact, fieldPadV]
  );

  const input = (
    <TextInput
      placeholderTextColor={colors.textMuted}
      {...props}
      value={value}
      onChangeText={handleChangeText}
      onChange={(event) => {
        props.onChange?.(event);
        const text = event.nativeEvent.text;
        if (typeof text === 'string') handleChangeText(text);
      }}
      keyboardType={keyboardType}
      autoComplete={resolvedAutoComplete}
      textContentType={resolvedTextContentType}
      importantForAutofill={isCredentialField ? 'yes' : props.importantForAutofill}
      {...(Platform.OS === 'android' && isCredentialField && !isSecretField
        ? { disableFullscreenUI: true }
        : null)}
      accessibilityLabel={props.accessibilityLabel ?? label}
      collapsable={false}
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

  const wrapped = ltr || isSecretField ? (
    <View style={styles.fieldWrap} collapsable={false}>
      {input}
      {isSecretField ? (
        <Pressable
          onPress={() => setPasswordVisible((v) => !v)}
          style={styles.toggle}
          accessibilityRole="button"
          accessibilityLabel={passwordVisible ? t('hidePassword') : t('showPassword')}
          importantForAutofill="no"
          focusable={false}
          hitSlop={8}
        >
          <EyeIcon crossed={passwordVisible} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  ) : (
    input
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, rtl.text]}>{label}</Text>}
      {wrapped}
    </View>
  );
}
