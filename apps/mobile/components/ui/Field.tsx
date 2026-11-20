import React, { forwardRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../../lib/theme-context';
import { CORAL, INK, INK_FAINT, LINE, WHITE } from '../../constants/themes';
import { F } from '../../lib/fonts';
import { TEXT_START, ROW } from '../../lib/dir';
import { Txt } from './Txt';
import { Icon, type IconName } from './Icon';

export type FieldKind = 'text' | 'email' | 'password' | 'newPassword' | 'number' | 'code' | 'username' | 'name';

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  kind?: FieldKind;
  error?: string | null;
  hint?: string;
  icon?: IconName;
  multiline?: boolean;
}

const LTR_KINDS: FieldKind[] = ['email', 'password', 'newPassword', 'number', 'code', 'username'];

/** Labelled text field. Credentials and codes type left-to-right; everything else is Hebrew RTL. */
export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, kind = 'text', error, hint, icon, multiline, ...props },
  ref
) {
  const { world } = useTheme();
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const secret = kind === 'password' || kind === 'newPassword';
  const ltr = LTR_KINDS.includes(kind);

  const kindProps: TextInputProps = (() => {
    switch (kind) {
      case 'email':
        return { keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false, autoComplete: 'email', textContentType: 'emailAddress', importantForAutofill: 'yes' };
      case 'password':
        return { secureTextEntry: !reveal, autoCapitalize: 'none', autoCorrect: false, autoComplete: 'current-password', textContentType: 'password', importantForAutofill: 'yes' };
      case 'newPassword':
        return { secureTextEntry: !reveal, autoCapitalize: 'none', autoCorrect: false, autoComplete: 'new-password', textContentType: 'newPassword', importantForAutofill: 'yes' };
      case 'number':
        return { keyboardType: 'number-pad' };
      case 'code':
        return { keyboardType: 'number-pad', autoComplete: 'one-time-code', textContentType: 'oneTimeCode', maxLength: 6 };
      case 'username':
        return { autoCapitalize: 'none', autoCorrect: false, autoComplete: 'username', textContentType: 'username' };
      case 'name':
        return { autoCapitalize: 'words', autoComplete: 'name', textContentType: 'name' };
      default:
        return {};
    }
  })();

  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt v="caption" style={{ fontSize: 14 }}>{label}</Txt> : null}
      <View
        style={[
          styles.box,
          { flexDirection: ROW },
          multiline && { alignItems: 'flex-start', minHeight: 96 },
          focused && { borderColor: world.accent, boxShadow: `0px 0px 0px 3px ${world.accentSoft}` },
          error ? { borderColor: CORAL } : null,
        ]}
      >
        {icon ? <Icon name={icon} size={20} color={INK_FAINT} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={INK_FAINT}
          {...kindProps}
          {...props}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[
            styles.input,
            ltr
              ? { textAlign: 'left', writingDirection: 'ltr' }
              : { textAlign: TEXT_START, writingDirection: 'rtl' },
            multiline && { textAlignVertical: 'top', paddingTop: 12 },
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
          ]}
        />
        {secret ? (
          <Pressable onPress={() => setReveal((r) => !r)} hitSlop={10} accessibilityLabel={reveal ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}>
            <Icon name={reveal ? 'eyeOff' : 'eye'} size={20} color={INK_FAINT} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Txt v="caption" color={CORAL}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt v="caption" color={INK_FAINT}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: LINE,
    backgroundColor: WHITE,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: F.medium,
    fontSize: 17,
    color: INK,
    paddingVertical: 12,
    minHeight: 50,
  },
});
