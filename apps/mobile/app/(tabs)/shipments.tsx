import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { bookingsApi } from '../../src/api/bookings';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { Card } from '../../src/components/ui/Card';
import { Loader } from '../../src/components/ui/Loader';
import { formatCurrency, formatDateShort } from '../../src/utils/format';
import { Booking } from '../../src/types';

const FILTERS = ['All', 'Active', 'Completed', 'Cancelled'];

export default function ShipmentsScreen() {
  const [filter, setFilter] = useState('All');

  const statusMap: Record<string, string> = {
    Active: 'IN_TRANSIT', Completed: 'COMPLETED', Cancelled: 'CANCELLED',
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bookings', filter],
    queryFn: () => bookingsApi.getAll({
      limit: 30,
      ...(filter !== 'All' && { status: statusMap[filter] }),
    }).then(r => r.data),
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>My shipments</Text>
        <Text style={styles.sub}>{data?.total ?? 0} bookings</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? <Loader full /> : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />}>
          {data?.bookings?.map((b: Booking) => (
            <TouchableOpacity key={b.id} onPress={() => router.push(`/booking/${b.id}`)}>
              <Card style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.code} numberOfLines={1}>{b.bookingCode.slice(0, 16)}…</Text>
                    <Text style={styles.route} numberOfLines={1}>
                      {b.route?.originTerminal?.split(',')[0]} → {b.route?.destinationTerminal?.split(',')[0]}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.metaItem}>{b.cargoType?.name}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaItem}>{b.wagonsRequired} wagons</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaItem}>{formatDateShort(b.createdAt)}</Text>
                </View>
                <View style={styles.cardBottom}>
                  <Text style={styles.amount}>{formatCurrency(b.totalAmountNgn)}</Text>
                  <StatusBadge status={b.bookingStatus} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
          {!data?.bookings?.length && (
            <View style={styles.empty}>
              <Ionicons name="train-outline" size={40} color="#e2e8f0" />
              <Text style={styles.emptyTitle}>No shipments yet</Text>
              <Text style={styles.emptySub}>Book your first cargo movement to get started</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/book')} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Book now →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  sub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  filters: { backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', maxHeight: 52, flexShrink: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filterChipActive: { backgroundColor: '#2563eb' },
  filterText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 40, gap: 10 },
  card: { marginBottom: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  code: { fontSize: 11, fontFamily: 'monospace', color: '#2563eb', marginBottom: 3 },
  route: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  metaItem: { fontSize: 11, color: '#64748b' },
  metaDot: { fontSize: 11, color: '#cbd5e1' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 20, backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
