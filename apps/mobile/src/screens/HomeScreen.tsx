
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bueno Logistics</Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Book Shipment</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Track Cargo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#16C172',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#16C172',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#16C172',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  secondaryText: {
    color: '#16C172',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
