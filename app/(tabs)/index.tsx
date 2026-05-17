import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import StudentAppScreen from '../../StudentAppScreen';
import VendorSetupScreen from '../../VendorSetupScreen';

export default function App() {
  const [role, setRole] = useState(null);

  const resetRole = () => setRole(null);

  if (role === 'vendor') return <VendorSetupScreen onLogout={resetRole} />;
  if (role === 'student') return <StudentAppScreen onLogout={resetRole} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Skip<Text style={{color: '#2f3542'}}>Q</Text></Text>
        <Text style={styles.tagline}>Canteen ordering, simplified.</Text>
      </View>
      
      <View style={styles.cardContainer}>
        <TouchableOpacity style={styles.roleCard} onPress={() => setRole('student')}>
          <View style={[styles.iconCircle, {backgroundColor: '#ff4757'}]}>
            <Text style={styles.emoji}>🍔</Text>
          </View>
          <Text style={styles.roleTitle}>I want to Eat</Text>
          <Text style={styles.roleSub}>Order from your favorite stalls</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.roleCard} onPress={() => setRole('vendor')}>
          <View style={[styles.iconCircle, {backgroundColor: '#2f3542'}]}>
            <Text style={styles.emoji}>👨‍🍳</Text>
          </View>
          <Text style={styles.roleTitle}>I am a Vendor</Text>
          <Text style={styles.roleSub}>Manage orders and your menu</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 60 },
  logo: { fontSize: 50, fontWeight: '900', color: '#ff4757', letterSpacing: -2 },
  tagline: { fontSize: 16, color: '#a4b0be', marginTop: -5 },
  cardContainer: { width: '100%', paddingHorizontal: 30 },
  roleCard: { backgroundColor: '#fff', padding: 25, borderRadius: 24, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#f1f2f6', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  emoji: { fontSize: 30 },
  roleTitle: { fontSize: 22, fontWeight: 'bold', color: '#2f3542' },
  roleSub: { fontSize: 14, color: '#747d8c', marginTop: 5 }
});