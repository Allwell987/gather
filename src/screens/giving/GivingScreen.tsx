// src/screens/giving/GivingScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { Paystack, paystackProps } from 'react-native-paystack-webview';
import HeaderBar from '../../components/common/HeaderBar';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { BaseColors, Typography, Spacing, Radius, CHURCH } from '../../constants/theme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { format } from 'date-fns';
import type { HomeStackNavigationProp } from '../../types/navigation';
import type { Campaign, Giving } from '../../types/database';

const FUNDS = ['App Maintenance'];
const AMOUNTS = [2000, 5000, 10000, 20000, 50000];
const FREQUENCIES = ['One-time', 'Weekly', 'Monthly'];
const PAYMENT_METHODS = [
  { id: 'card', label: 'Card', icon: 'card-outline' },
  { id: 'transfer', label: 'Transfer', icon: 'swap-horizontal-outline' },
  { id: 'ussd', label: 'USSD', icon: 'phone-portrait-outline' },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['id'];

type CheckoutConfig = {
  amount: number;
  category: string;
  paymentMethod: PaymentMethod;
  reference: string;
};

const paystackPublicKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY?.trim() ?? '';

function formatNaira(amount: number) {
  return '₦' + amount.toLocaleString('en-NG');
}

function normalizeAmountInput(value: string) {
  const digitsOnly = value.replace(/[^\d]/g, '');
  if (!digitsOnly) return '';
  return Number(digitsOnly).toLocaleString('en-NG');
}

function toPaystackChannels(paymentMethod: PaymentMethod) {
  switch (paymentMethod) {
    case 'transfer': return ['bank_transfer'] as const;
    case 'ussd': return ['ussd'] as const;
    default: return ['card'] as const;
  }
}

export default function GivingScreen() {
  const navigation = useNavigation<HomeStackNavigationProp>();
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const paystackWebViewRef = useRef<paystackProps.PayStackRef | null>(null);

  const [selectedFund, setSelectedFund] = useState('App Maintenance');
  const [selectedAmount, setSelectedAmount] = useState(10000);
  const [customAmount, setCustomAmount] = useState('10,000');
  const [isCustom, setIsCustom] = useState(false);
  const [frequency, setFrequency] = useState('One-time');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig | null>(null);

  // Validation states
  const [amountError, setAmountError] = useState<string | null>(null);

  const { data: givingHistory = [] } = useQuery({
    queryKey: ['giving-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('giving')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .returns<Giving[]>();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .returns<Campaign[]>();
      if (error) throw error;
      return data || [];
    },
  });

  const totalGiving = useMemo(
    () => givingHistory.reduce((sum, record) => sum + Number(record.amount ?? 0), 0),
    [givingHistory]
  );

  const saveDonationMutation = useMutation({
    mutationFn: async (donation: {
      amount: number;
      category: string;
      payment_reference: string;
      transaction_id?: string;
      payment_method: PaymentMethod;
      frequency: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('giving')
        .insert({
          user_id: user.id,
          amount: donation.amount,
          currency: 'NGN',
          category: donation.category.toLowerCase().replace(/\s+/g, '_'),
          payment_reference: donation.payment_reference,
          transaction_id: donation.transaction_id ?? `${donation.payment_method}_${donation.payment_reference}`,
          status: 'success',
        } as never);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate both history and campaigns to show the updated progress instantly
      queryClient.invalidateQueries({ queryKey: ['giving-history', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setCheckoutConfig(null);
      setShowSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.error('Error saving donation:', error);
      setCheckoutConfig(null);
      Alert.alert(
        'Payment successful but receipt not saved',
        'Your payment went through! However, we couldn\'t store the receipt. Please contact the church office with your transaction reference.'
      );
    },
  });

  const displayAmount = isCustom
    ? parseInt(customAmount.replace(/[^\d]/g, '') || '0', 10)
    : selectedAmount;

  const isConfiguredForPayments = Boolean(paystackPublicKey);
  const isPaying = Boolean(checkoutConfig) || saveDonationMutation.isPending;

  useEffect(() => {
    if (checkoutConfig) {
      paystackWebViewRef.current?.startTransaction();
    }
  }, [checkoutConfig]);

  const handleGive = () => {
    setAmountError(null);

    if (!user?.id || !user.email) {
      Alert.alert('Sign in required', 'Please sign in before making a gift.');
      return;
    }

    if (!Number.isFinite(displayAmount) || displayAmount < 500) {
      setAmountError('The minimum gift amount is ₦500');
      return;
    }

    if (!isConfiguredForPayments) {
      Alert.alert(
        'Payments not ready',
        'Paystack configuration is missing. Please contact support.'
      );
      return;
    }

    const reference = `GIVE_${user.id.slice(0, 8)}_${Date.now()}`;

    setCheckoutConfig({
      amount: displayAmount,
      category: selectedFund,
      paymentMethod,
      reference,
    });
  };

  const handlePaymentSuccess = (response: any) => {
    if (!checkoutConfig) return;

    saveDonationMutation.mutate({
      amount: checkoutConfig.amount,
      category: checkoutConfig.category,
      payment_reference: checkoutConfig.reference,
      transaction_id: response.transactionRef ?? response.data?.reference ?? checkoutConfig.reference,
      payment_method: checkoutConfig.paymentMethod,
      frequency,
    });
  };

  const handlePaymentCancel = () => {
    setCheckoutConfig(null);
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Give"
        subtitle={CHURCH.name}
        onBackPress={() => navigation.goBack()}
        backgroundColor={BaseColors.brown900}
        textColor={BaseColors.white}
        subtitleColor={BaseColors.brown300}
        enableBlur={true}
      />

      <View style={{ backgroundColor: BaseColors.brown900 }}>
        <View style={styles.heroStats}>
          <View style={[styles.heroGlow, { backgroundColor: theme.accentSubtle }]} />
          <Text style={styles.heroLabel}>Total Giving (This Year)</Text>
          <Text style={styles.heroAmount}>{formatNaira(totalGiving)}</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{givingHistory.length}</Text>
              <Text style={styles.heroStatLabel}>Gifts</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{campaigns.length}</Text>
              <Text style={styles.heroStatLabel}>Campaigns</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.giveCard, { borderTopColor: theme.accent }]}>
          <Text style={styles.cardTitle}>Support our mission</Text>

          {!isConfiguredForPayments && (
            <View style={styles.warningCard}>
              <Ionicons name="alert-circle" size={18} color={BaseColors.yellow700} />
              <Text style={styles.warningText}>Payments are currently in test mode.</Text>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fundScroll}>
            {FUNDS.map((fund) => (
              <TouchableOpacity
                key={fund}
                style={[styles.fundChip, selectedFund === fund && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                onPress={() => setSelectedFund(fund)}
              >
                <Text style={[styles.fundChipText, selectedFund === fund && { color: BaseColors.white }]}>{fund}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.amtGrid}>
            {AMOUNTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[styles.amtBtn, !isCustom && selectedAmount === amt && { borderColor: theme.accent, backgroundColor: theme.accentLight }]}
                onPress={() => {
                  setSelectedAmount(amt);
                  setIsCustom(false);
                  setCustomAmount(amt.toLocaleString('en-NG'));
                  setAmountError(null);
                }}
              >
                <Text style={[styles.amtBtnText, !isCustom && selectedAmount === amt && { color: theme.accentDeep }]}>
                  {formatNaira(amt)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.amtBtn, isCustom && { borderColor: theme.accent, backgroundColor: theme.accentLight }]}
              onPress={() => setIsCustom(true)}
            >
              <Text style={[styles.amtBtnText, isCustom && { color: theme.accentDeep }]}>Custom</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.customWrap, { borderColor: amountError ? BaseColors.red500 : theme.accent, backgroundColor: theme.accentLight }]}>
            <Text style={[styles.currencySymbol, { color: amountError ? BaseColors.red500 : theme.accent }]}>₦</Text>
            <TextInput
              style={styles.customInput}
              value={customAmount}
              onChangeText={(v) => {
                setCustomAmount(normalizeAmountInput(v));
                setIsCustom(true);
                if (amountError) setAmountError(null);
              }}
              keyboardType="numeric"
              placeholder="0"
              selectionColor={theme.accent}
            />
          </View>
          {amountError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color={BaseColors.red500} />
              <Text style={styles.errorText}>{amountError}</Text>
            </View>
          )}

          <Text style={styles.subLabel}>Frequency</Text>
          <View style={styles.freqRow}>
            {FREQUENCIES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.freqBtn, frequency === item && { borderColor: theme.accent, backgroundColor: theme.accentLight }]}
                onPress={() => setFrequency(item)}
              >
                <Text style={[styles.freqBtnText, frequency === item && { color: theme.accent }]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.subLabel}>Payment method</Text>
          <View style={styles.payRow}>
            {PAYMENT_METHODS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.payBtn, paymentMethod === item.id && { borderColor: theme.accent, backgroundColor: theme.accentLight }]}
                onPress={() => setPaymentMethod(item.id)}
              >
                <Ionicons name={item.icon as any} size={16} color={paymentMethod === item.id ? theme.accent : BaseColors.brown400} />
                <Text style={[styles.payBtnText, paymentMethod === item.id && { color: theme.accent }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.giveBtn, { backgroundColor: theme.accent, opacity: isPaying ? 0.7 : 1 }]}
            onPress={handleGive}
            disabled={isPaying}
            accessibilityRole="button"
            accessibilityLabel={`Give ${formatNaira(displayAmount)}`}
          >
            {isPaying ? (
              <ActivityIndicator color={BaseColors.white} />
            ) : (
              <>
                <Ionicons name="heart" size={18} color={BaseColors.white} />
                <Text style={styles.giveBtnText}>Give {formatNaira(displayAmount)}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.secureRow}>
            <Ionicons name="lock-closed" size={12} color={BaseColors.brown300} />
            <Text style={styles.secureText}>Secured by Paystack</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Campaigns</Text>
        {isLoadingCampaigns ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: Spacing.xl }} />
        ) : (
          campaigns.map((campaign) => {
            const percentage = Math.min((campaign.raised_amount / campaign.goal_amount) * 100, 100);
            return (
              <View key={campaign.id} style={styles.campaignCard}>
                <View style={[styles.campaignBanner, { backgroundColor: campaign.bg_color || '#f0f0f0' }]}>
                  <Text style={styles.campaignEmoji}>{campaign.emoji}</Text>
                </View>
                <View style={styles.campaignBody}>
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: campaign.progress_color || theme.accent }]} />
                  </View>
                  <View style={styles.campaignNums}>
                    <Text style={styles.campaignRaised}>{percentage.toFixed(0)}% complete</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.sectionTitle}>History</Text>
        {givingHistory.slice(0, 5).map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <View style={styles.historyInfo}>
              <Text style={styles.historyFund}>{item.category.replace('_', ' ')}</Text>
              <Text style={styles.historyDate}>{format(new Date(item.created_at), 'MMM d, yyyy')}</Text>
            </View>
            <Text style={[styles.historyAmt, { color: BaseColors.sage }]}>{formatNaira(Number(item.amount))}</Text>
          </View>
        ))}
      </ScrollView>

      {user?.email && isConfiguredForPayments && checkoutConfig && (
        <Paystack
          paystackKey={paystackPublicKey}
          billingEmail={user.email}
          billingName={user.full_name || ''}
          amount={String(checkoutConfig.amount)}
          currency="NGN"
          channels={[...toPaystackChannels(checkoutConfig.paymentMethod)]}
          refNumber={checkoutConfig.reference}
          onCancel={handlePaymentCancel}
          onSuccess={handlePaymentSuccess}
          ref={paystackWebViewRef as any}
        />
      )}

      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <LottieView
              source={require('../../../assets/animations/success-check.json')}
              autoPlay
              loop={false}
              style={{ width: 120, height: 120 }}
            />
            <Text style={styles.successTitle}>Gift received! 🙌</Text>
            <Text style={styles.successVerse}>&ldquo;Each of you should give what you have decided in your heart to give.&rdquo;</Text>
            <Text style={styles.successRef}>— 2 Corinthians 9:7</Text>
            <TouchableOpacity style={[styles.successBtn, { backgroundColor: theme.accent }]} onPress={() => setShowSuccess(false)}>
              <Text style={styles.successBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BaseColors.cream },
  heroNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  heroCenter: { alignItems: 'center' },
  heroTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.white },
  heroSubtitle: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs, color: BaseColors.brown300 },
  heroStats: { padding: Spacing.xl, paddingBottom: Spacing.xl, alignItems: 'center', position: 'relative' },
  heroGlow: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75 },
  heroLabel: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs, letterSpacing: 1.5, textTransform: 'uppercase', color: BaseColors.brown300, marginBottom: 6 },
  heroAmount: { fontFamily: Typography.serif, fontSize: Typography.sizes['4xl'], color: BaseColors.white },
  heroRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.md },
  heroStat: { alignItems: 'center' },
  heroStatNum: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.lg, color: BaseColors.white },
  heroStatLabel: { fontFamily: Typography.sans, fontSize: 10, color: BaseColors.brown300, textTransform: 'uppercase' },
  giveCard: { backgroundColor: BaseColors.white, margin: Spacing.xl, borderRadius: Radius.xl, borderTopWidth: 3, borderWidth: 1, borderColor: BaseColors.brown100, padding: Spacing.xl },
  cardTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, color: BaseColors.brown900, marginBottom: Spacing.md },
  warningCard: { flexDirection: 'row', gap: Spacing.sm, borderRadius: Radius.md, backgroundColor: BaseColors.yellow100, padding: Spacing.md, marginBottom: Spacing.md },
  warningText: { flex: 1, fontFamily: Typography.sansMedium, fontSize: Typography.sizes.sm, color: BaseColors.yellow700 },
  fundScroll: { marginBottom: Spacing.md },
  fundChip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: BaseColors.brown100, backgroundColor: BaseColors.warm50, marginRight: 7 },
  fundChipText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.brown400 },
  amtGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  amtBtn: { paddingVertical: 10, paddingHorizontal: Spacing.sm, borderRadius: Radius.md, borderWidth: 1.5, borderColor: BaseColors.brown100, backgroundColor: BaseColors.warm50, minWidth: '30%', alignItems: 'center' },
  amtBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.brown700 },
  customWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 4, marginBottom: Spacing.sm },
  currencySymbol: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xl },
  customInput: { flex: 1, fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes['2xl'], paddingVertical: 8, color: BaseColors.brown900 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.md },
  errorText: { fontFamily: Typography.sans, fontSize: 12, color: BaseColors.red500 },
  subLabel: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs, letterSpacing: 0.8, textTransform: 'uppercase', color: BaseColors.brown400, marginBottom: Spacing.sm },
  freqRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  freqBtn: { flex: 1, paddingVertical: 9, borderRadius: Radius.md, borderWidth: 1.5, borderColor: BaseColors.brown100, backgroundColor: BaseColors.warm50, alignItems: 'center' },
  freqBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.brown400 },
  payRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5, borderColor: BaseColors.brown100, backgroundColor: BaseColors.warm50 },
  payBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.brown700 },
  giveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, paddingVertical: 14, minHeight: 50 },
  giveBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, color: BaseColors.white },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: Spacing.sm },
  secureText: { fontFamily: Typography.sans, fontSize: 10, color: BaseColors.brown300 },
  sectionTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, color: BaseColors.brown900, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  campaignCard: { backgroundColor: BaseColors.white, marginHorizontal: Spacing.xl, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: BaseColors.brown100, marginBottom: Spacing.md },
  campaignBanner: { height: 70, alignItems: 'center', justifyContent: 'center' },
  campaignEmoji: { fontSize: 32 },
  campaignBody: { padding: Spacing.md },
  campaignName: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base, color: BaseColors.brown900, marginBottom: Spacing.sm },
  progressBar: { height: 5, backgroundColor: BaseColors.brown100, borderRadius: 3, marginBottom: Spacing.sm },
  progressFill: { height: '100%', borderRadius: 3 },
  campaignNums: { flexDirection: 'row', justifyContent: 'space-between' },
  campaignRaised: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.brown900 },
  campaignGoal: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, color: BaseColors.brown300 },
  historyItem: { backgroundColor: BaseColors.white, marginHorizontal: Spacing.xl, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: BaseColors.brown100, marginBottom: Spacing.sm },
  historyInfo: { flex: 1 },
  historyFund: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base, color: BaseColors.brown900, textTransform: 'capitalize' },
  historyDate: { fontFamily: Typography.sans, fontSize: 10, color: BaseColors.brown300, marginTop: 2 },
  historyAmt: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  modalCard: { width: '100%', backgroundColor: BaseColors.white, borderRadius: Radius.xl, padding: Spacing['2xl'], alignItems: 'center' },
  successTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes['2xl'], color: BaseColors.brown900, marginTop: Spacing.md, marginBottom: Spacing.sm },
  successVerse: { fontFamily: Typography.sans, fontSize: Typography.sizes.base, color: BaseColors.brown700, textAlign: 'center', lineHeight: 22 },
  successRef: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.brown400, marginTop: Spacing.sm, marginBottom: Spacing.xl },
  successBtn: { width: '100%', borderRadius: Radius.md, alignItems: 'center', paddingVertical: 14 },
  successBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, color: BaseColors.white },
});
