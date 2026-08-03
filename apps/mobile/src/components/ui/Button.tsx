import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';

interface Props {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ onPress, label, variant = 'primary', loading, disabled, style, textStyle, size = 'md' }: Props) {
  const s = styles[variant];
  const p = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
  const fs = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[s.container, { paddingVertical: p, opacity: disabled || loading ? 0.5 : 1 }, style]}
      activeOpacity={0.75}>
      {loading
        ? <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : '#2563eb'} size="small" />
        : <Text style={[s.text, { fontSize: fs }, textStyle]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = {
  primary: StyleSheet.create({
    container: { backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center' as const },
    text: { color: '#fff', fontWeight: '600' as const },
  }),
  secondary: StyleSheet.create({
    container: { backgroundColor: '#fff', borderRadius: 10, alignItems: 'center' as const, borderWidth: 1, borderColor: '#e2e8f0' },
    text: { color: '#374151', fontWeight: '500' as const },
  }),
  ghost: StyleSheet.create({
    container: { backgroundColor: 'transparent', borderRadius: 10, alignItems: 'center' as const },
    text: { color: '#2563eb', fontWeight: '500' as const },
  }),
  danger: StyleSheet.create({
    container: { backgroundColor: '#dc2626', borderRadius: 10, alignItems: 'center' as const },
    text: { color: '#fff', fontWeight: '600' as const },
  }),
};
