import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, FlatList,
  RefreshControl, ActivityIndicator, Dimensions
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useBookingDetail } from '../../src/hooks/useBookings';
import { useBookingTracking } from '../../src/hooks/useTracking';
import { useChat } from '../../src/hooks/useChat';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { Card } from '../../src/components/ui/Card';
import { Loader } from '../../src/components/ui/Loader';
import { useAuthStore } from '../../src/store/authStore';
import { formatCurrency, formatDate } from '../../src/utils/format';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLOR } from '../../src/utils/statusLabels';
import { BookingEvent, ChatMessage } from '../../src/types';

const { width } = Dimensions.get('window');
const TABS = ['Overview', 'Tracking', 'Chat', 'Timeline'];

// ── Status step logic (from Loka's DispatchTrackingPage getStepState) ──────────
const STATUS_STEPS = [
  'BOOKING_CONFIRMED', 'COORDINATING', 'WAGON_ALLOCATED',
  'CARGO_AT_TERMINAL', 'LOADING_IN_PROGRESS', 'DEPARTED',
  'IN_TRANSIT', 'ARRIVED_DESTINATION', 'UNLOADING',
  'READY_FOR_COLLECTION', 'COMPLETED',
];

type StepState = 'completed' | 'active' | 'pending';

function getStepState(currentStatus: string, stepStatus: string): StepState {
  const current = STATUS_STEPS.indexOf(currentStatus);
  const step    = STATUS_STEPS.indexOf(stepStatus);
  if (step < current)  return 'completed';
  if (step === current) return 'active';
  return 'pending';
}

function getProgress(status: string): number {
  const idx = STATUS_STEPS.indexOf(status);
  return idx < 0 ? 0 : Math.round(((idx + 1) / STATUS_STEPS.length) * 100);
}

// ── ETA banner config (from Loka's getEtaBanner) ───────────────────────────────
function getEtaBanner(status: string) {
  const map: Record<string, { bg: string; label: string; sub: string }> = {
    BOOKING_CONFIRMED:   { bg: '#1d4ed8', label: 'Booking confirmed', sub: 'Ops team has been notified' },
    COORDINATING:        { bg: '#d97706', label: '⏳ Coordinating', sub: 'Ops is scheduling your terminal drop-off' },
    WAGON_ALLOCATED:     { bg: '#7c3aed', label: '🚋 Wagons assigned', sub: 'Fleet allocated for your shipment' },
    CARGO_AT_TERMINAL:   { bg: '#ea580c', label: '📦 At terminal', sub: 'Your cargo has been checked in' },
    LOADING_IN_PROGRESS: { bg: '#ea580c', label: '⏫ Loading', sub: 'Cargo being loaded into wagons' },
    DEPARTED:            { bg: '#7c3aed', label: '🚂 Train departed', sub: 'Your goods are on the move' },
    IN_TRANSIT:          { bg: '#6d28d9', label: '📍 In transit', sub: 'Live GPS active — track on map' },
    ARRIVED_DESTINATION: { bg: '#0891b2', label: '🏁 Arrived', sub: 'Train reached destination terminal' },
    UNLOADING:           { bg: '#0891b2', label: '⬇️ Unloading', sub: 'Cargo being offloaded' },
    READY_FOR_COLLECTION:{ bg: '#16a34a', label: '✅ Ready to collect', sub: 'Bring your booking ref + ID' },
    COMPLETED:           { bg: '#16a34a', label: '🎉 Completed', sub: 'Cargo collected — shipment closed' },
    CANCELLED:           { bg: '#dc2626', label: 'Cancelled', sub: '' },
  };
  return map[status] ?? { bg: '#374151', label: status, sub: '' };
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [tab, setTab] = useState(0);
  const chatRef = useRef<FlatList>(null);

  const { data: booking, isLoading, refetch, isRefetching } = useBookingDetail(id);
  const isLive = ['DEPARTED', 'IN_TRANSIT'].includes(booking?.bookingStatus ?? '');
  const { location: liveLocation, connected: wsConnected } = useBookingTracking(id, tab === 1 && isLive);
  const { messages, sendMessage, sending } = useChat(id);
  const [messageText, setMessageText] = useState('');

  const handleSend = async () => {
    if (!messageText.trim()) return;
    await sendMessage(messageText);
    setMessageText('');
  };

  if (isLoading) return <View style={s.root}><Loader full /></View>;
  if (!booking)  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Not found</Text>
      </View>
    </View>
  );

  const eta  = getEtaBanner(booking.bookingStatus);
  const prog = getProgress(booking.bookingStatus);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.headerCode} numberOfLines={1}>{booking.bookingCode.slice(0, 18)}…</Text>
          <StatusBadge status={booking.bookingStatus} />
        </View>
      </View>

      {/* ETA banner (Loka pattern) */}
      <View style={[s.etaBanner, { backgroundColor: eta.bg }]}>
        <Text style={s.etaLabel}>{eta.label}</Text>
        {eta.sub ? <Text style={s.etaSub}>{eta.sub}</Text> : null}
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${prog}%` }]} />
        </View>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} onPress={() => setTab(i)}
            style={[s.tabItem, tab === i && s.tabItemActive]}>
            <Text style={[s.tabText, tab === i && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── OVERVIEW ── */}
      {tab === 0 && (
        <ScrollView contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />}>

          <Card style={s.card}>
            <Text style={s.cardLabel}>Route</Text>
            <View style={s.routeRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.terminal} numberOfLines={2}>{booking.route?.originTerminal}</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#94a3b8" style={{ marginHorizontal: 8 }} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[s.terminal, { textAlign: 'right' }]} numberOfLines={2}>{booking.route?.destinationTerminal}</Text>
              </View>
            </View>
            <View style={s.pills}>
              <Text style={s.pill}>{booking.route?.distanceKm} km</Text>
              <Text style={s.pill}>~{booking.route?.estimatedDurationHr} hrs</Text>
            </View>
          </Card>

          <Card style={s.card}>
            <Text style={s.cardLabel}>Cargo details</Text>
            <View style={s.grid}>
              {[
                ['Type', booking.cargoType?.name],
                ['Weight', `${booking.cargoWeightTonnes}t`],
                ['Wagons', `${booking.wagonsRequired}`],
                ['Locomotives', `${booking.locosRequired}`],
                ['Total paid', formatCurrency(booking.totalAmountNgn)],
                ['Payment', booking.paymentStatus],
              ].map(([k, v]) => (
                <View key={k} style={s.gridItem}>
                  <Text style={s.gridKey}>{k}</Text>
                  <Text style={s.gridVal}>{v}</Text>
                </View>
              ))}
            </View>
          </Card>

          {booking.wagonAllocations?.length > 0 && (
            <Card style={s.card}>
              <Text style={s.cardLabel}>Allocated fleet</Text>
              {booking.wagonAllocations.map((a: any) => (
                <View key={a.id} style={s.fleetRow}>
                  <View style={s.fleetIcon}><Ionicons name="train-outline" size={14} color="#2563eb" /></View>
                  <View>
                    <Text style={s.fleetName}>{a.wagon?.serialNumber} — {a.wagon?.wagonType?.replace(/_/g, ' ')}</Text>
                    <Text style={s.fleetSub}>Loco: {a.loco?.serialNumber} {a.loco?.model}</Text>
                  </View>
                </View>
              ))}
            </Card>
          )}

          {booking.specialInstructions ? (
            <Card style={s.card}>
              <Text style={s.cardLabel}>Special instructions</Text>
              <Text style={s.note}>{booking.specialInstructions}</Text>
            </Card>
          ) : null}

          {booking.destinationContact ? (
            <Card style={s.card}>
              <Text style={s.cardLabel}>Collection contact</Text>
              <Text style={s.gridVal}>{booking.destinationContact}</Text>
              <Text style={s.gridKey}>{booking.destinationPhone}</Text>
            </Card>
          ) : null}
        </ScrollView>
      )}

      {/* ── TRACKING ── */}
      {tab === 1 && (
        <View style={{ flex: 1 }}>
          {isLive && liveLocation ? (
            <MapView provider={PROVIDER_GOOGLE} style={{ flex: 1 }}
              initialRegion={{ latitude: liveLocation.lat, longitude: liveLocation.lng, latitudeDelta: 0.4, longitudeDelta: 0.4 }}>
              <Marker coordinate={{ latitude: liveLocation.lat, longitude: liveLocation.lng }}
                title={liveLocation.speed ? `${liveLocation.speed} km/h` : 'Train'}>
                <View style={s.mapMarker}><Ionicons name="train" size={18} color="#fff" /></View>
              </Marker>
            </MapView>
          ) : (
            <View style={s.mapPlaceholder}>
              <View style={s.mapPlaceholderIcon}><Ionicons name="map-outline" size={32} color="#94a3b8" /></View>
              <Text style={s.mapPlaceholderTitle}>
                {isLive ? 'Waiting for GPS signal…' : 'Tracking not yet active'}
              </Text>
              <Text style={s.mapPlaceholderSub}>
                {isLive
                  ? 'Driver app is broadcasting. Map updates automatically.'
                  : `GPS tracking goes live when the train departs.\nCurrent status: ${BOOKING_STATUS_LABELS[booking.bookingStatus] ?? booking.bookingStatus}`}
              </Text>
            </View>
          )}

          {/* Connection indicator */}
          <View style={s.wsIndicator}>
            <View style={[s.wsDot, { backgroundColor: wsConnected ? '#22c55e' : '#f59e0b' }]} />
            <Text style={s.wsLabel}>{wsConnected ? 'Live' : 'Polling'}</Text>
          </View>

          {liveLocation && (
            <View style={s.locoBar}>
              <View style={s.locoStat}><Text style={s.locoStatVal}>{liveLocation.lat.toFixed(5)}</Text><Text style={s.locoStatKey}>Lat</Text></View>
              <View style={s.locoStat}><Text style={s.locoStatVal}>{liveLocation.lng.toFixed(5)}</Text><Text style={s.locoStatKey}>Lng</Text></View>
              {liveLocation.speed != null && <View style={s.locoStat}><Text style={s.locoStatVal}>{liveLocation.speed} km/h</Text><Text style={s.locoStatKey}>Speed</Text></View>}
              <View style={s.locoStat}><Text style={s.locoStatVal}>{new Date(liveLocation.updatedAt).toLocaleTimeString()}</Text><Text style={s.locoStatKey}>Updated</Text></View>
            </View>
          )}
        </View>
      )}

      {/* ── CHAT ── */}
      {tab === 2 && (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={chatRef}
            data={messages}
            keyExtractor={(m: ChatMessage) => m.id}
            contentContainerStyle={s.chatList}
            onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={s.chatEmpty}>
                <Ionicons name="chatbubbles-outline" size={32} color="#e2e8f0" />
                <Text style={s.chatEmptyTitle}>No messages yet</Text>
                <Text style={s.chatEmptySub}>Your Bueno ops coordinator will reach out here after your booking is confirmed</Text>
              </View>
            }
            renderItem={({ item: msg }: { item: ChatMessage }) => {
              const isMe = msg.sender?.id === user?.id;
              return (
                <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
                  {!isMe && <Text style={s.bubbleSender}>{msg.sender?.fullName}</Text>}
                  <Text style={[s.bubbleText, isMe && s.bubbleTextMe]}>{msg.content}</Text>
                  <Text style={[s.bubbleTime, isMe && s.bubbleTimeMe]}>{formatDate(msg.createdAt)}</Text>
                </View>
              );
            }}
          />
          <View style={s.chatInputRow}>
            <TextInput value={messageText} onChangeText={setMessageText}
              placeholder="Type a message…" placeholderTextColor="#9ca3af"
              style={s.chatInput}
              onSubmitEditing={handleSend} returnKeyType="send" />
            <TouchableOpacity onPress={handleSend}
              disabled={!messageText.trim() || sending}
              style={[s.sendBtn, (!messageText.trim() || sending) && s.sendBtnOff]}>
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── TIMELINE (Loka's timeline visual pattern) ── */}
      {tab === 3 && (
        <ScrollView contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />}>

          {/* Status steps */}
          <Card style={s.card}>
            <Text style={s.cardLabel}>Shipment progress</Text>
            {STATUS_STEPS.map((stepStatus, i) => {
              const state = getStepState(booking.bookingStatus, stepStatus);
              return (
                <View key={stepStatus} style={s.tlItem}>
                  <View style={s.tlLeft}>
                    <View style={[s.tlDot,
                      state === 'completed' && s.tlDotDone,
                      state === 'active'    && s.tlDotActive,
                    ]}>
                      {state === 'completed'
                        ? <Ionicons name="checkmark" size={12} color="#fff" />
                        : state === 'active'
                          ? <View style={s.tlDotActivePulse} />
                          : null}
                    </View>
                    {i < STATUS_STEPS.length - 1 && (
                      <View style={[s.tlLine, state === 'completed' && s.tlLineDone]} />
                    )}
                  </View>
                  <View style={[s.tlContent, { opacity: state === 'pending' ? 0.4 : 1 }]}>
                    <Text style={s.tlTitle}>{BOOKING_STATUS_LABELS[stepStatus] ?? stepStatus}</Text>
                    {state === 'active' && <Text style={s.tlActive}>In progress</Text>}
                    {state === 'completed' && <Text style={s.tlDone}>Completed ✓</Text>}
                  </View>
                </View>
              );
            })}
          </Card>

          {/* Event log */}
          {(booking.events ?? []).length > 0 && (
            <Card style={s.card}>
              <Text style={s.cardLabel}>Event log</Text>
              {(booking.events as BookingEvent[]).map((ev) => (
                <View key={ev.id} style={s.evRow}>
                  <View style={s.evDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.evTitle}>{ev.title}</Text>
                    {ev.description ? <Text style={s.evDesc}>{ev.description}</Text> : null}
                    <Text style={s.evDate}>{formatDate(ev.createdAt)}</Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 54, paddingBottom: 10, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginLeft: 10 },
  headerCode: { fontSize: 12, fontFamily: 'monospace', color: '#2563eb', marginBottom: 4 },
  etaBanner: { paddingHorizontal: 20, paddingVertical: 14 },
  etaLabel: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  etaSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 10 },
  progressBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2 },
  progressFill: { height: 3, backgroundColor: '#fff', borderRadius: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: '#2563eb' },
  tabText: { fontSize: 12, fontWeight: '500', color: '#94a3b8' },
  tabTextActive: { color: '#2563eb', fontWeight: '700' },
  content: { padding: 14, paddingBottom: 40 },
  card: { marginBottom: 12 },
  cardLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  terminal: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 11, color: '#64748b' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '50%', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  gridKey: { fontSize: 10, color: '#94a3b8', marginBottom: 2, fontWeight: '600' },
  gridVal: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  note: { fontSize: 13, color: '#374151', lineHeight: 20 },
  fleetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  fleetIcon: { width: 28, height: 28, backgroundColor: '#eff6ff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fleetName: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  fleetSub: { fontSize: 11, color: '#64748b' },
  // Map
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#f8fafc' },
  mapPlaceholderIcon: { width: 72, height: 72, backgroundColor: '#f1f5f9', borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  mapPlaceholderTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 8, textAlign: 'center' },
  mapPlaceholderSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  mapMarker: { backgroundColor: '#2563eb', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  wsIndicator: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  wsDot: { width: 7, height: 7, borderRadius: 4 },
  wsLabel: { fontSize: 11, color: '#fff', fontWeight: '600' },
  locoBar: { backgroundColor: '#fff', flexDirection: 'row', padding: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 16, flexWrap: 'wrap' },
  locoStat: {},
  locoStatVal: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' },
  locoStatKey: { fontSize: 10, color: '#94a3b8' },
  // Chat
  chatList: { padding: 14, paddingBottom: 8, gap: 10 },
  chatEmpty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  chatEmptyTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 6 },
  chatEmptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  bubble: { maxWidth: '80%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 14 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9', borderBottomLeftRadius: 4 },
  bubbleSender: { fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 3 },
  bubbleText: { fontSize: 13, color: '#0f172a', lineHeight: 19 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.6)' },
  chatInputRow: { flexDirection: 'row', gap: 10, padding: 12, paddingBottom: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center' },
  chatInput: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 22, paddingHorizontal: 15, paddingVertical: 9, fontSize: 13, color: '#0f172a' },
  sendBtn: { width: 38, height: 38, backgroundColor: '#2563eb', borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: '#e2e8f0' },
  // Timeline (Loka style)
  tlItem: { flexDirection: 'row', gap: 12 },
  tlLeft: { alignItems: 'center', width: 22 },
  tlDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  tlDotDone: { backgroundColor: '#2563eb' },
  tlDotActive: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#2563eb' },
  tlDotActivePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  tlLine: { flex: 1, width: 2, backgroundColor: '#e2e8f0', marginVertical: 3, minHeight: 20 },
  tlLineDone: { backgroundColor: '#2563eb' },
  tlContent: { flex: 1, paddingBottom: 14, paddingTop: 2 },
  tlTitle: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  tlActive: { fontSize: 11, color: '#2563eb', fontWeight: '600', marginTop: 2 },
  tlDone: { fontSize: 11, color: '#16a34a', marginTop: 2 },
  // Event log
  evRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  evDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb', marginTop: 4, flexShrink: 0 },
  evTitle: { fontSize: 12, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  evDesc: { fontSize: 11, color: '#64748b', marginBottom: 2 },
  evDate: { fontSize: 10, color: '#94a3b8' },
});
