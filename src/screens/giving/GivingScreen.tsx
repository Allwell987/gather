// src/screens/giving/GivingScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePaystack } from 'react-native-paystack-webview';
import HeaderBar from '../../components/common/HeaderBar';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { BaseColors, Typography, Spacing, Radius, CHURCH } from '../../constants/theme';
import { useGiving } from './hooks/useGiving';
import { format } from 'date-fns';

const AMOUNTS = [2000, 5000, 10000, 20000];

export default function GivingScreen() {
  const navigation = useNavigation();
  const { theme, colors } = useThemeStore();
  const { user } = useAuthStore();
  const { history, campaigns, totalGiving, saveDonation, isSaving } = useGiving();
  const { popup } = usePaystack();

  const [amount, setAmount] = useState(10000);

  const formatCategory = (category: string) => category === 'app_maintenance' ? 'App Maintenance' : 'App Support';

  const onPaymentSuccess = (response: { reference?: string; transaction?: string; trans?: string }) => {
    const reference = response.reference ?? `APP_${user?.id?.slice(0, 8)}_${Date.now()}`;

    saveDonation({
      amount,
      reference,
      transaction_id: response.transaction ?? response.trans ?? response.reference,
    } as any);

    Alert.alert('Thank you!', 'Your support for app maintenance has been received.');
  };

  const handleGive = () => {
    if (!user) {
      Alert.alert('Sign in required');
      return;
    }

    if (!user.email) {
      Alert.alert('Email required', 'Please add an email to your profile before supporting the app.');
      return;
    }

    const reference = `APP_${user.id.slice(0, 8)}_${Date.now()}`;

    popup.checkout({
      email: user.email,
      amount,
      reference,
      metadata: {
        custom_fields: [
          { display_name: 'User ID', variable_name: 'user_id', value: user.id },
          { display_name: 'Purpose', variable_name: 'purpose', value: 'App Maintenance' },
        ],
      },
      onSuccess: onPaymentSuccess,
      onCancel: () => {
        Alert.alert('Payment cancelled', 'Your app maintenance support was not completed.');
      },
      onError: (error) => {
        Alert.alert('Payment error', error?.message ?? 'Something went wrong during payment.');
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title="Support App Maintenance" subtitle={CHURCH.name} onBackPress={() => navigation.goBack()} enableBlur />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Total App Support</Text>
          <Text style={styles.heroAmount}>₦{totalGiving.toLocaleString()}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Choose amount</Text>
          <View style={styles.grid}>
            {AMOUNTS.map(amt => (
              <TouchableOpacity
                key={amt}
                style={[styles.amtBtn, amount === amt && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                onPress={() => setAmount(amt)}
              >
                <Text style={[styles.amtText, amount === amt && { color: '#fff' }]}>₦{amt.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.giveBtn, { backgroundColor: theme.accent }]} onPress={handleGive} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.giveBtnText}>Support ₦{amount.toLocaleString()}</Text>}
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Recent App Support</Text>
          {history.map(item => (
            <View key={item.id} style={[styles.history, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{formatCategory(item.category)}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{format(new Date(item.created_at), 'MMM d, yyyy')}</Text>
              </View>
              <Text style={{ color: theme.accentDeep, fontWeight: 'bold' }}>₦{Number(item.amount).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { padding: 40, backgroundColor: BaseColors.brown900, alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  heroAmount: { color: '#fff', fontSize: 40, fontFamily: Typography.serif, marginTop: 8 },
  body: { padding: Spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 24, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amtBtn: { flex: 1, minWidth: '45%', paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1.5, borderColor: BaseColors.brown100, alignItems: 'center' },
  amtText: { fontWeight: 'bold' },
  giveBtn: { width: '100%', paddingVertical: 16, borderRadius: Radius.md, alignItems: 'center', marginTop: 24 },
  giveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  history: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: Radius.lg, borderWidth: 1, marginBottom: 10 },
});
