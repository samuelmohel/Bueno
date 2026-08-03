import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { bookingsApi } from '../../src/api/bookings';
import { Card } from '../../src/components/ui/Card';
import { Loader } from '../../src/components/ui/Loader';
import { formatDateShort } from '../../src/utils/format';
import { Booking } from '../../src/types';

export default function MessagesScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bookings-chat'],
    queryFn: () => bookingsApi.getAll({ limit: 50 }).then(r => r.data),
  });

  const bookings: Booking[] = data?.bookings ?? [];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.sub}>Coordination with ops team</Text>
      </View>
      {isLoading ? <Loader full /> : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />}>
          {bookings.map((b) => (
            <TouchableOpacity key={b.id} onPress={() => router.push(`/booking/${b.id}?tab=chat`)}>
              <Card style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.icon}><Ionicons name="chatbubble-outline" size={20} color="#2563eb" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {b.route?.originTerminal?.split(',')[0]} → {b.route?.destinationTerminal?.split(',')[0]}
                    </Text>
                    <Text style={styles.cardCode} numberOfLines={1}>{b.bookingCode.slice(0, 16)}…</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.date}>{formatDateShort(b.createdAt)}</Text>
                    <Ionicons name="chevron-forward" size={14} color="#cbd5e1" style={{ marginTop: 4 }} />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
          {!bookings.length && (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color="#e2e8f0" />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>After you book a shipment, your ops coordinator will reach out here</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  sub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  card: {},
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, backgroundColor: '#eff6ff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  cardCode: { fontSize: 11, fontFamily: 'monospace', color: '#64748b' },
  date: { fontSize: 11, color: '#94a3b8' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
});
