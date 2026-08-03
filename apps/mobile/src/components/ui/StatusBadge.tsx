import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLOR } from '../../utils/statusLabels';

export function StatusBadge({ status }: { status: string }) {
  const color = BOOKING_STATUS_COLOR[status] || '#6b7280';
  const label = BOOKING_STATUS_LABELS[status] || status;
  return (
    <View style={[styles.badge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '600' },
});
