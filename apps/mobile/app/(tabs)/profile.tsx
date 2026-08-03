import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Card } from '../../src/components/ui/Card';

const MenuItem = ({ icon, label, sub, onPress, danger }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
      <Ionicons name={icon} size={18} color={danger ? '#dc2626' : '#2563eb'} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {sub && <Text style={styles.menuSub}>{sub}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user?.fullName?.[0] ?? 'U'}</Text></View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}><Text style={styles.roleText}>{user?.role?.replace(/_/g, ' ')}</Text></View>
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <MenuItem icon="person-outline" label="Full name" sub={user?.fullName} onPress={() => {}} />
        <MenuItem icon="mail-outline" label="Email" sub={user?.email} onPress={() => {}} />
        <MenuItem icon="call-outline" label="Phone" sub={user?.phone || 'Not set'} onPress={() => {}} />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <MenuItem icon="chatbubble-outline" label="Contact ops team" sub="Message your coordinator" onPress={() => router.push('/(tabs)/messages')} />
        <MenuItem icon="help-circle-outline" label="Help & FAQ" sub="How Bueno works" onPress={() => {}} />
      </Card>

      <Card style={[styles.section, { marginBottom: 32 }]}>
        <Text style={styles.sectionTitle}>Account actions</Text>
        <MenuItem icon="log-out-outline" label="Sign out" danger onPress={handleLogout} />
      </Card>

      <Text style={styles.version}>Bueno Logistics v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 6 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 72, height: 72, backgroundColor: '#2563eb', borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  email: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  roleBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  section: { marginHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  menuIcon: { width: 34, height: 34, backgroundColor: '#eff6ff', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuIconDanger: { backgroundColor: '#fef2f2' },
  menuLabel: { fontSize: 13, fontWeight: '500', color: '#0f172a' },
  menuLabelDanger: { color: '#dc2626' },
  menuSub: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  version: { textAlign: 'center', fontSize: 11, color: '#cbd5e1', paddingBottom: 16 },
});
