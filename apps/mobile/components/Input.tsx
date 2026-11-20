import React from 'react';
import { View, type TextInputProps, type ViewStyle } from 'react-native';
import { Field, type FieldKind } from './ui/Field';

/**
 * Legacy input API, drawn with the redesign's Field. Picks the field kind (email / password /
 * number…) from the classic TextInput props so autofill keeps working.
 */
interface InputProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
  ltr?: boolean;
  compact?: boolean;
}

function kindFor(p: InputProps): FieldKind {
  if (p.keyboardType === 'email-address' || p.textContentType === 'emailAddress' || p.autoComplete === 'email') return 'email';
  if (p.secureTextEntry) return p.autoComplete === 'new-password' ? 'newPassword' : 'password';
  if (p.keyboardType === 'number-pad' || p.keyboardType === 'numeric') return 'number';
  if (p.ltr) return 'username';
  return 'text';
}

export function Input({ label, containerStyle, ltr: _ltr, compact: _compact, secureTextEntry: _s, ...props }: InputProps) {
  const kind = kindFor({ ...props, secureTextEntry: _s, ltr: _ltr });
  return (
    <View style={[{ marginBottom: 12 }, containerStyle]}>
      <Field label={label} kind={kind} {...props} />
    </View>
  );
}
