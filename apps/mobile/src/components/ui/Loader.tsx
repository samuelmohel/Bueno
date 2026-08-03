import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export function Loader({ full = false }: { full?: boolean }) {
  if (full) return (
    <View style={styles.full}><ActivityIndicator color="#2563eb" size="large" /></View>
  );
  return <ActivityIndicator color="#2563eb" size="small" />;
}

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
});
