import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, FlatList
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { bookingsApi } from '../../src/api/bookings';
import { useAuthStore } from '../../src/store/authStore';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { Card } from '../../src/components/ui/Card';
import { Loader } from '../../src/components/ui/Loader';
import { formatCurrency, formatDateShort } from '../../src/utils/format';
import { ACTIVE_STATUSES } from '../../src/utils/statusLabels';
import { Booking } from '../../src/types';

export default function HomeScreen() {
  const { user } = useAuthStore();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bookings-home'],
    queryFn: () => bookingsApi.getAll({ limit: 5 }).then(r => r.data),
  });

  const active = data?.bookings?.filter((b: Booking) => ACTIVE_STATUSES.includes(b.bookingStatus)) ?? [];
  const recent = data?.bookings ?? [];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
          <Text style={styles.name}>{user?.fullName?.split(' ')[0] ?? 'there'} 👋</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.fullName?.[0] ?? 'U'}</Text>
        </TouchableOpacity>
      </View>

      {/* Hero CTA */}
      <TouchableOpacity style={styles.cta} activeOpacity={0.88} onPress={() => router.push('/(tabs)/book')}>
        <View>
          <Text style={styles.ctaTitle}>Ship cargo by rail</Text>
          <Text style={styles.ctaSubtitle}>Get an instant quote → book → track</Text>
        </View>
        <View style={styles.ctaIcon}>
          <Ionicons name="train" size={28} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Active shipments */}
      {active.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active shipments</Text>
          {active.map((b: Booking) => (
            <TouchableOpacity key={b.id} onPress={() => router.push(`/booking/${b.id}`)}>
              <Card style={styles.activeCard}>
                <View style={styles.activeRow}>
                  <View style={styles.activeIcon}>
                    <Ionicons name="train-outline" size={18} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeCode}>{b.bookingCode.slice(0, 14)}…</Text>
                    <Text style={styles.activeRoute} numberOfLines={1}>
                      {b.route?.originTerminal?.split(',')[0]} → {b.route?.destinationTerminal?.split(',')[0]}
                    </Text>
                  </View>
                  <StatusBadge status={b.bookingStatus} />
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${getProgress(b.bookingStatus)}%` }]} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* How it works */}
      {!active.length && !isLoading && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Bueno works</Text>
          {HOW_IT_WORKS.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recent bookings */}
      {recent.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent bookings</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/shipments')}>
              <Text style={styles.sectionLink}>See all →</Text>
            </TouchableOpacity>
          </View>
          {recent.slice(0, 3).map((b: Booking) => (
            <TouchableOpacity key={b.id} onPress={() => router.push(`/booking/${b.id}`)}>
              <Card style={styles.recentCard}>
                <View style={styles.recentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentRoute}>
                      {b.route?.originTerminal?.split(',')[0]} → {b.route?.destinationTerminal?.split(',')[0]}
                    </Text>
                    <Text style={styles.recentMeta}>
                      {b.cargoType?.name} · {b.wagonsRequired} wagons · {formatDateShort(b.createdAt)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.recentAmount}>{formatCurrency(b.totalAmountNgn)}</Text>
                    <StatusBadge status={b.bookingStatus} />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isLoading && <Loader full />}
    </ScrollView>
  );
}

const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

const getProgress = (status: string): number => {
  const steps = ['BOOKING_CONFIRMED','COORDINATING','WAGON_ALLOCATED','CARGO_AT_TERMINAL',
    'LOADING_IN_PROGRESS','DEPARTED','IN_TRANSIT','ARRIVED_DESTINATION','UNLOADING','READY_FOR_COLLECTION','COMPLETED'];
  const i = steps.indexOf(status);
  return Math.round(((i + 1) / steps.length) * 100);
};

const HOW_IT_WORKS = [
  { title: 'Tell us about your cargo', desc: 'Pick your route, cargo type, and weight. We calculate wagon requirements instantly.' },
  { title: 'Pay securely online', desc: 'Pay via card, bank transfer, or USSD. Booking confirmed immediately.' },
  { title: 'Drop off at terminal', desc: 'Bring your goods to the origin station on the agreed date. Our ops team handles loading.' },
  { title: 'Track in real time', desc: 'Watch your cargo move on the live map until it reaches its destination.' },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  greeting: { fontSize: 13, color: '#64748b' },
  name: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  avatar: { width: 40, height: 40, backgroundColor: '#2563eb', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cta: { marginHorizontal: 20, backgroundColor: '#1d4ed8', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  ctaTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 4 },
  ctaSubtitle: { fontSize: 12, color: '#bfdbfe' },
  ctaIcon: { width: 52, height: 52, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  sectionLink: { fontSize: 12, color: '#2563eb', fontWeight: '500' },
  activeCard: { marginBottom: 10 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  activeIcon: { width: 36, height: 36, backgroundColor: '#eff6ff', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activeCode: { fontSize: 11, fontFamily: 'monospace', color: '#2563eb', marginBottom: 2 },
  activeRoute: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  progressBar: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#2563eb', borderRadius: 2 },
  recentCard: { marginBottom: 8 },
  recentRow: { flexDirection: 'row', gap: 10 },
  recentRoute: { fontSize: 13, fontWeight: '600', color: '#0f172a', marginBottom: 3 },
  recentMeta: { fontSize: 11, color: '#64748b' },
  recentAmount: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, backgroundColor: '#eff6ff', borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepNumText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  stepTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  stepDesc: { fontSize: 12, color: '#64748b', lineHeight: 18 },
});
