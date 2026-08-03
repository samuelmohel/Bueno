import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Modal, FlatList
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { routesApi } from '../../src/api/routes';
import { cargoApi } from '../../src/api/cargo';
import { bookingsApi } from '../../src/api/bookings';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { formatCurrency } from '../../src/utils/format';
import { Route, CargoType, BookingQuote } from '../../src/types';

const STEPS = ['Route', 'Cargo', 'Details', 'Review'];

export default function BookScreen() {
  const [step, setStep] = useState(0);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedCargo, setSelectedCargo] = useState<CargoType | null>(null);
  const [weight, setWeight] = useState('');
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [form, setForm] = useState({ specialInstructions: '', destinationContact: '', destinationPhone: '', dropOffDate: '' });
  const [routeModal, setRouteModal] = useState(false);
  const [cargoModal, setCargoModal] = useState(false);

  const { data: routes } = useQuery({ queryKey: ['routes'], queryFn: () => routesApi.getAll().then(r => r.data) });
  const { data: cargoTypes } = useQuery({ queryKey: ['cargo-types'], queryFn: () => cargoApi.getAll().then(r => r.data) });

  // live quote whenever weight changes
  useEffect(() => {
    if (!selectedRoute || !selectedCargo || !weight || Number(weight) <= 0) { setQuote(null); return; }
    const t = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const { data } = await bookingsApi.getQuote(selectedRoute.id, selectedCargo.id, Number(weight));
        setQuote(data);
      } catch { setQuote(null); }
      finally { setQuoteLoading(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [selectedRoute, selectedCargo, weight]);

  const createMutation = useMutation({
    mutationFn: () => bookingsApi.create({
      routeId: selectedRoute!.id,
      cargoTypeId: selectedCargo!.id,
      cargoWeightTonnes: Number(weight),
      ...form,
    }),
    onSuccess: async (res) => {
      const bookingId = res.data.id;
      // init payment
      try {
        await bookingsApi.initPayment(bookingId);
        Alert.alert(
          'Booking created!',
          'Proceed to payment. In production, you will be redirected to Paystack checkout.',
          [{ text: 'View booking', onPress: () => router.push(`/booking/${bookingId}`) }]
        );
        setStep(0); setSelectedRoute(null); setSelectedCargo(null); setWeight(''); setQuote(null);
      } catch {
        router.push(`/booking/${bookingId}`);
      }
    },
    onError: (e: any) => Alert.alert('Error', e.response?.data?.message || 'Booking failed'),
  });

  const canNextStep0 = !!selectedRoute;
  const canNextStep1 = !!selectedCargo && !!weight && Number(weight) > 0 && !!quote;
  const canNextStep2 = !!form.destinationContact && !!form.destinationPhone;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Book a shipment</Text>
        <View style={styles.stepBar}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, i <= step ? styles.stepDotActive : styles.stepDotInactive]}>
                {i < step
                  ? <Ionicons name="checkmark" size={12} color="#fff" />
                  : <Text style={[styles.stepDotNum, i === step ? styles.stepDotNumActive : {}]}>{i + 1}</Text>}
              </View>
              {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step ? styles.stepLineActive : {}]} />}
            </View>
          ))}
        </View>
        <Text style={styles.stepLabel}>{STEPS[step]}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* STEP 0 — Route */}
        {step === 0 && (
          <View>
            <Text style={styles.stepTitle}>Select your route</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setRouteModal(true)}>
              <Ionicons name="map-outline" size={18} color="#64748b" />
              <Text style={[styles.pickerText, selectedRoute && styles.pickerTextSelected]}>
                {selectedRoute ? selectedRoute.routeName : 'Choose origin → destination'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#94a3b8" />
            </TouchableOpacity>
            {selectedRoute && (
              <Card style={styles.routeInfo}>
                <View style={styles.routeRow}>
                  <View style={styles.routeTerminal}>
                    <Text style={styles.routeTerminalLabel}>Origin</Text>
                    <Text style={styles.routeTerminalName}>{selectedRoute.originTerminal}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#94a3b8" />
                  <View style={[styles.routeTerminal, { alignItems: 'flex-end' }]}>
                    <Text style={styles.routeTerminalLabel}>Destination</Text>
                    <Text style={styles.routeTerminalName}>{selectedRoute.destinationTerminal}</Text>
                  </View>
                </View>
                <View style={styles.routeMeta}>
                  <Text style={styles.routeMetaText}>{selectedRoute.distanceKm} km</Text>
                  <Text style={styles.routeMetaText}>~{selectedRoute.estimatedDurationHr} hrs</Text>
                  {selectedRoute.pricing?.[0] && (
                    <Text style={styles.routeMetaText}>{formatCurrency(selectedRoute.pricing[0].pricePerWagonNgn)} / wagon</Text>
                  )}
                </View>
              </Card>
            )}
            <Button label="Next: Cargo details" onPress={() => setStep(1)} disabled={!canNextStep0} style={{ marginTop: 20 }} size="lg" />
          </View>
        )}

        {/* STEP 1 — Cargo */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Cargo details</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setCargoModal(true)}>
              <Ionicons name="cube-outline" size={18} color="#64748b" />
              <Text style={[styles.pickerText, selectedCargo && styles.pickerTextSelected]}>
                {selectedCargo ? selectedCargo.name : 'Select cargo type'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#94a3b8" />
            </TouchableOpacity>
            {selectedCargo && (
              <Text style={styles.cargoHint}>
                {selectedCargo.defaultWagonCapacityT} tonnes per wagon
                {selectedCargo.handlingNotes ? ` · ${selectedCargo.handlingNotes}` : ''}
              </Text>
            )}
            <Input
              label="Total weight (tonnes)"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="e.g. 480"
              containerStyle={{ marginTop: 14 }}
            />

            {/* Live quote */}
            {quoteLoading && (
              <Card style={styles.quoteCard}>
                <ActivityIndicator color="#2563eb" size="small" />
                <Text style={styles.quoteLoading}>Calculating…</Text>
              </Card>
            )}
            {quote && !quoteLoading && (
              <Card style={styles.quoteCard}>
                <Text style={styles.quoteTitle}>Live estimate</Text>
                {[
                  ['Wagon capacity', `${selectedCargo?.defaultWagonCapacityT}t / wagon`],
                  ['Wagons required', `${quote.wagonsRequired} wagons`],
                  ['Locomotives', `${quote.locosRequired}`],
                  ['Rate per wagon', formatCurrency(quote.pricing.pricePerWagon)],
                  ['Fuel surcharge', `${quote.pricing.fuelSurchargePct}%`],
                ].map(([k, v]) => (
                  <View key={k} style={styles.quoteRow}>
                    <Text style={styles.quoteKey}>{k}</Text>
                    <Text style={styles.quoteVal}>{v}</Text>
                  </View>
                ))}
                <View style={styles.quoteDivider} />
                <View style={styles.quoteRow}>
                  <Text style={styles.quoteTotalKey}>Total to pay</Text>
                  <Text style={styles.quoteTotalVal}>{formatCurrency(quote.pricing.totalAmountNgn)}</Text>
                </View>
              </Card>
            )}

            <View style={styles.stepButtons}>
              <Button label="Back" onPress={() => setStep(0)} variant="secondary" style={{ flex: 1 }} />
              <Button label="Next: Contact" onPress={() => setStep(2)} disabled={!canNextStep1} style={{ flex: 2 }} />
            </View>
          </View>
        )}

        {/* STEP 2 — Contact details */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Contact & handover details</Text>
            <Input label="Destination contact name *" value={form.destinationContact}
              onChangeText={v => setForm(p => ({ ...p, destinationContact: v }))} placeholder="Person collecting at destination" />
            <Input label="Their phone number *" value={form.destinationPhone}
              onChangeText={v => setForm(p => ({ ...p, destinationPhone: v }))} keyboardType="phone-pad" placeholder="+2348012345678" />
            <Input label="Preferred drop-off date" value={form.dropOffDate}
              onChangeText={v => setForm(p => ({ ...p, dropOffDate: v }))} placeholder="e.g. 2024-09-15" />
            <Input label="Special instructions (optional)" value={form.specialInstructions}
              onChangeText={v => setForm(p => ({ ...p, specialInstructions: v }))}
              placeholder="Fragile, priority, hazmat, etc." multiline numberOfLines={3} />
            <View style={styles.stepButtons}>
              <Button label="Back" onPress={() => setStep(1)} variant="secondary" style={{ flex: 1 }} />
              <Button label="Review booking" onPress={() => setStep(3)} disabled={!canNextStep2} style={{ flex: 2 }} />
            </View>
          </View>
        )}

        {/* STEP 3 — Review */}
        {step === 3 && quote && (
          <View>
            <Text style={styles.stepTitle}>Review & confirm</Text>
            <Card style={{ marginBottom: 16 }}>
              <Text style={styles.reviewSection}>Route</Text>
              <Text style={styles.reviewValue}>{selectedRoute?.routeName}</Text>
              <Text style={styles.reviewSub}>{selectedRoute?.originTerminal} → {selectedRoute?.destinationTerminal}</Text>
            </Card>
            <Card style={{ marginBottom: 16 }}>
              <Text style={styles.reviewSection}>Cargo</Text>
              <Text style={styles.reviewValue}>{selectedCargo?.name}</Text>
              <Text style={styles.reviewSub}>{weight} tonnes · {quote.wagonsRequired} wagons · {quote.locosRequired} locomotive</Text>
            </Card>
            <Card style={{ marginBottom: 16 }}>
              <Text style={styles.reviewSection}>Contact at destination</Text>
              <Text style={styles.reviewValue}>{form.destinationContact}</Text>
              <Text style={styles.reviewSub}>{form.destinationPhone}</Text>
            </Card>
            <Card style={[styles.quoteCard, { marginBottom: 16 }]}>
              <View style={styles.quoteRow}>
                <Text style={styles.quoteTotalKey}>Total payable</Text>
                <Text style={styles.quoteTotalVal}>{formatCurrency(quote.pricing.totalAmountNgn)}</Text>
              </View>
            </Card>
            <Text style={styles.disclaimer}>
              By confirming, you agree to Bueno's terms of service. Payment is required to confirm your booking.
            </Text>
            <View style={styles.stepButtons}>
              <Button label="Back" onPress={() => setStep(2)} variant="secondary" style={{ flex: 1 }} />
              <Button
                label="Confirm & pay"
                onPress={() => createMutation.mutate()}
                loading={createMutation.isPending}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Route picker modal */}
      <Modal visible={routeModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select route</Text>
            <TouchableOpacity onPress={() => setRouteModal(false)}><Ionicons name="close" size={22} color="#374151" /></TouchableOpacity>
          </View>
          <FlatList
            data={routes}
            keyExtractor={(r: any) => r.id}
            renderItem={({ item }: { item: Route }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedRoute(item); setRouteModal(false); }}>
                <Text style={styles.modalItemTitle}>{item.routeName}</Text>
                <Text style={styles.modalItemSub}>{item.distanceKm} km · ~{item.estimatedDurationHr} hrs</Text>
                {item.pricing?.[0] && <Text style={styles.modalItemPrice}>{formatCurrency(item.pricing[0].pricePerWagonNgn)} / wagon</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Cargo picker modal */}
      <Modal visible={cargoModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select cargo type</Text>
            <TouchableOpacity onPress={() => setCargoModal(false)}><Ionicons name="close" size={22} color="#374151" /></TouchableOpacity>
          </View>
          <FlatList
            data={cargoTypes}
            keyExtractor={(c: any) => c.id}
            renderItem={({ item }: { item: CargoType }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedCargo(item); setCargoModal(false); }}>
                <Text style={styles.modalItemTitle}>{item.name}</Text>
                <Text style={styles.modalItemSub}>{item.defaultWagonCapacityT}t per wagon{item.requiresSpecialWagon ? ' · requires special wagon' : ''}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  stepBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: '#2563eb' },
  stepDotInactive: { backgroundColor: '#e2e8f0' },
  stepDotNum: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  stepDotNumActive: { color: '#fff' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e2e8f0', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: '#2563eb' },
  stepLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  content: { padding: 20, paddingBottom: 40 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 13, marginBottom: 12 },
  pickerText: { flex: 1, fontSize: 14, color: '#9ca3af' },
  pickerTextSelected: { color: '#0f172a' },
  routeInfo: { marginBottom: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  routeTerminal: { flex: 1 },
  routeTerminalLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  routeTerminalName: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  routeMeta: { flexDirection: 'row', gap: 12 },
  routeMetaText: { fontSize: 11, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cargoHint: { fontSize: 11, color: '#64748b', marginBottom: 4, marginTop: -6 },
  quoteCard: { marginVertical: 12 },
  quoteLoading: { fontSize: 13, color: '#64748b', marginLeft: 8 },
  quoteTitle: { fontSize: 12, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  quoteRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  quoteKey: { fontSize: 13, color: '#64748b' },
  quoteVal: { fontSize: 13, fontWeight: '500', color: '#0f172a' },
  quoteDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },
  quoteTotalKey: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  quoteTotalVal: { fontSize: 16, fontWeight: '700', color: '#1d4ed8' },
  stepButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  reviewSection: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  reviewValue: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  reviewSub: { fontSize: 12, color: '#64748b' },
  disclaimer: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 16, lineHeight: 16 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingTop: 56 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  modalItemTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 3 },
  modalItemSub: { fontSize: 12, color: '#64748b' },
  modalItemPrice: { fontSize: 13, fontWeight: '700', color: '#1d4ed8', marginTop: 3 },
});
