import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Alert
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';

export default function RegisterScreen() {
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleRegister = async () => {
    if (!form.fullName || !form.email || !form.phone || !form.password)
      return Alert.alert('Error', 'Please fill all fields');
    if (form.password !== form.confirm)
      return Alert.alert('Error', 'Passwords do not match');
    if (form.password.length < 8)
      return Alert.alert('Error', 'Password must be at least 8 characters');
    try {
      await register({ fullName: form.fullName, email: form.email, phone: form.phone, password: form.password });
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Registration failed', e.response?.data?.message || 'Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logo}><Text style={styles.logoText}>B</Text></View>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start shipping your goods by rail</Text>
        </View>
        <View style={styles.form}>
          <Input label="Full name" value={form.fullName} onChangeText={f('fullName')} placeholder="Adebayo Okafor" />
          <Input label="Email" value={form.email} onChangeText={f('email')} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
          <Input label="Phone" value={form.phone} onChangeText={f('phone')} keyboardType="phone-pad" placeholder="+2348012345678" />
          <Input label="Password" value={form.password} onChangeText={f('password')} secureTextEntry placeholder="Min 8 characters" />
          <Input label="Confirm password" value={form.confirm} onChangeText={f('confirm')} secureTextEntry placeholder="Repeat password" />
          <Button label="Create account" onPress={handleRegister} loading={isLoading} size="lg" style={{ marginTop: 4 }} />
          <TouchableOpacity onPress={() => router.back()} style={styles.switchLink}>
            <Text style={styles.switchText}>Already have an account? <Text style={styles.switchBold}>Sign in</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 52, height: 52, backgroundColor: '#2563eb', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#94a3b8' },
  form: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#334155' },
  switchLink: { marginTop: 16, alignItems: 'center' },
  switchText: { fontSize: 13, color: '#94a3b8' },
  switchBold: { color: '#60a5fa', fontWeight: '600' },
});
