import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Alert
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';

export default function LoginScreen() {
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('customer@bueno.ng');
  const [password, setPassword] = useState('customer123');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return Alert.alert('Error', 'Please fill all fields');
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Login failed', e.response?.data?.message || 'Check your credentials and try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}><Text style={styles.logoText}>B</Text></View>
          <Text style={styles.title}>Bueno Logistics</Text>
          <Text style={styles.subtitle}>Rail freight across Nigeria</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Sign in</Text>
          <Input
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Your password"
          />
          <Button label="Sign in" onPress={handleLogin} loading={isLoading} style={{ marginTop: 4 }} size="lg" />
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.switchLink}>
            <Text style={styles.switchText}>Don't have an account? <Text style={styles.switchBold}>Create one</Text></Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Demo: customer@bueno.ng / customer123</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 60, height: 60, backgroundColor: '#2563eb', borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#94a3b8' },
  form: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#334155' },
  formTitle: { fontSize: 16, fontWeight: '600', color: '#f1f5f9', marginBottom: 18 },
  switchLink: { marginTop: 16, alignItems: 'center' },
  switchText: { fontSize: 13, color: '#94a3b8' },
  switchBold: { color: '#60a5fa', fontWeight: '600' },
  hint: { textAlign: 'center', marginTop: 20, fontSize: 11, color: '#475569' },
});
