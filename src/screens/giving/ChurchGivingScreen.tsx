import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { format } from 'date-fns';
import { usePaystack } from 'react-native-paystack-webview';
import HeaderBar from '../../components/common/HeaderBar';
import { BaseColors, CHURCH, Radius, Spacing, Typography } from '../../constants/theme';
import { t, getDeviceLocale, type TranslationKey } from '../../services/locale';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import type { GivingCategory } from '../../types/database';
import { useGiving } from './hooks/useGiving';

const AMOUNTS = [2000, 5000, 10000, 20000];

const GIVING_OPTIONS = [
  { category: 'tithe', label: 'tithe', icon: 'heart-outline' },
  { category: 'offering', label: 'offering', icon: 'gift-outline' },
  { category: 'project', label: 'buildingProject', icon: 'business-outline' },
] as const satisfies {
  category: GivingCategory;
  label: 'tithe' | 'offering' | 'buildingProject';
  icon: keyof typeof Ionicons.glyphMap;
}[];

const CHURCH_GIVING_CATEGORIES = GIVING_OPTIONS.map(({ category }) => category);

const BUILDING_PROJECT_ACCOUNTS = [
  {
    currency: 'EUR',
    details: [
      { label: 'bank', value: 'Citibank N.A.' },
      { label: 'bankAddress', value: 'Canada Square, Canary Wharf, London, E14 5LB' },
      { label: 'sortCode', value: '18-50-08' },
      { label: 'swiftAddress', value: 'CITIGB2L' },
      { label: 'iban', value: 'GB87CITI18500808663076' },
      { label: 'accountNumber', value: '8663076' },
      { label: 'accountName', value: 'WEALTH REALITY PROJECT' },
      { label: 'zenithBankSwift', value: 'ZEIBNGLA' },
    ],
  },
  {
    currency: 'GBP',
    details: [
      { label: 'bank', value: 'Citibank N.A.' },
      { label: 'bankAddress', value: 'Canada Square, Canary Wharf, London, E14 5LB' },
      { label: 'sortCode', value: '18-50-08' },
      { label: 'swiftAddress', value: 'CITIGB2L' },
      { label: 'iban', value: 'GB22CITI18500805527945' },
      { label: 'accountNumber', value: '5527945' },
      { label: 'accountName', value: 'WEALTH REALITY PROJECT' },
      { label: 'zenithBankSwift', value: 'ZEIBNGLA' },
    ],
  },
  {
    currency: 'USD',
    details: [
      { label: 'bank', value: 'Citibank N.A.' },
      { label: 'bankAddress', value: 'Canada Square, Canary Wharf, London, E14 5LB' },
      { label: 'sortCode', value: '18-50-08000' },
      { label: 'swiftAddress', value: 'CITIGB2L' },
      { label: 'iban', value: 'GB80CITI18500810407941' },
      { label: 'accountNumber', value: '10407941' },
      { label: 'accountName', value: 'WEALTH REALITY PROJECT' },
      { label: 'zenithBankSwift', value: 'ZEIBNGLA' },
    ],
  },
] as const;

const createPaymentReference = (userId: string) =>
  `GIVE_${userId.slice(0, 8)}_${Date.now()}`;

export default function ChurchGivingScreen() {
  const navigation = useNavigation();
  const locale = getDeviceLocale();
  const { theme, colors } = useThemeStore();
  const { user } = useAuthStore();
  const { history, saveDonation, isSaving } = useGiving();
  const { popup } = usePaystack();

  const [amount, setAmount] = useState(10000);
  const [customAmountText, setCustomAmountText] = useState('');
  const [category, setCategory] = useState<GivingCategory>('tithe');

  const churchHistory = useMemo(
    () => history.filter(item => CHURCH_GIVING_CATEGORIES.some(value => value === item.category)),
    [history],
  );
  const churchTotal = useMemo(
    () => churchHistory.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [churchHistory],
  );
  const selectedOption = GIVING_OPTIONS.find(option => option.category === category) ?? GIVING_OPTIONS[0];

  const copyBankDetail = async (value: string) => {
    try {
      await Clipboard.setStringAsync(value);
      Alert.alert(t('copied', locale));
    } catch (error) {
      Alert.alert(
        t('copyFailed', locale),
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const renderBankDetail = (label: TranslationKey, value: string) => (
    <View key={`${label}-${value}`} style={[styles.bankDetail, { borderBottomColor: colors.border }]}>
      <View style={styles.bankDetailCopy}>
        <View style={styles.bankDetailText}>
          <Text style={[styles.bankDetailLabel, { color: colors.textSecondary }]}>{t(label, locale)}</Text>
          <Text selectable style={[styles.bankDetailValue, { color: colors.text }]}>{value}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${t('copy', locale)} ${t(label, locale)}`}
          onPress={() => copyBankDetail(value)}
          style={styles.copyButton}
        >
          <Ionicons name="copy-outline" size={18} color={theme.accent} />
          <Text style={[styles.copyButtonText, { color: theme.accent }]}>{t('copy', locale)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleGive = () => {
    if (!user) {
      Alert.alert(t('signInRequired', locale));
      return;
    }
    if (!user.email) {
      Alert.alert(t('emailRequired', locale), t('emailRequiredForGiving', locale));
      return;
    }
    if (!amount || amount < 100) {
      Alert.alert(t('invalidAmount', locale), t('enterValidAmount', locale));
      return;
    }
    const paystackKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_live_944f67d7bc59d38e9e291723a2229efe20cb0309';
    if (!paystackKey) {
      Alert.alert(t('paymentError', locale), 'Paystack public key is not configured.');
      return;
    }

    const reference = createPaymentReference(user.id);
    const purpose = t(selectedOption.label, locale);

    popup.checkout({
      email: user.email,
      amount,
      reference,
      metadata: {
        custom_fields: [
          { display_name: 'User ID', variable_name: 'user_id', value: user.id },
          { display_name: 'Purpose', variable_name: 'purpose', value: purpose },
        ],
      },
      onSuccess: response => {
        saveDonation({
          amount,
          category,
          reference,
          transaction_id: response.transaction ?? response.trans ?? response.reference,
        });
        Alert.alert(t('thankYou', locale), t('churchGivingReceived', locale));
      },
      onCancel: () => {
        Alert.alert(t('paymentCancelled', locale), t('paymentCancelledSub', locale));
      },
      onError: error => {
        Alert.alert(t('paymentError', locale), error?.message ?? t('paymentErrorSub', locale));
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title={t('churchGiving', locale)}
        subtitle={CHURCH.name}
        onBackPress={() => navigation.goBack()}
        enableBlur
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{t('totalChurchGiving', locale)}</Text>
          <Text style={styles.heroAmount}>₦{churchTotal.toLocaleString()}</Text>
        </View>

        <View style={styles.body}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t('churchGivingDescription', locale)}
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('chooseGivingType', locale)}</Text>
          <View style={styles.options}>
            {GIVING_OPTIONS.map(option => {
              const selected = option.category === category;
              return (
                <TouchableOpacity
                  key={option.category}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setCategory(option.category)}
                  style={[
                    styles.option,
                    { backgroundColor: colors.card, borderColor: selected ? theme.accent : colors.border },
                    selected && { backgroundColor: theme.accent + '18' },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={selected ? theme.accent : colors.textSecondary}
                  />
                  <Text style={[styles.optionLabel, { color: colors.text }]}>{t(option.label, locale)}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={theme.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('chooseAmount', locale)}</Text>
          <View style={styles.amounts}>
            {AMOUNTS.map(value => (
              <TouchableOpacity
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected: amount === value && !customAmountText }}
                style={[
                  styles.amountButton,
                  { borderColor: colors.border },
                  amount === value && !customAmountText && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => {
                  setAmount(value);
                  setCustomAmountText('');
                }}
              >
                <Text style={[styles.amountText, { color: colors.text }, amount === value && !customAmountText && styles.selectedAmountText]}>
                  ₦{value.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.customAmountContainer, { borderColor: customAmountText ? theme.accent : colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>₦</Text>
            <TextInput
              style={[styles.customAmountInput, { color: colors.text }]}
              placeholder={t('customAmount', locale)}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={customAmountText}
              onChangeText={text => {
                const cleaned = text.replace(/[^0-9]/g, '');
                setCustomAmountText(cleaned);
                setAmount(cleaned ? parseInt(cleaned, 10) : 0);
              }}
            />
          </View>

          {(category === 'tithe' || category === 'offering') && (
            <View style={styles.transferSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('nairaBankTransfer', locale)}
              </Text>
              <Text style={[styles.transferNote, { color: colors.textSecondary }]}>
                {t('manualTransferNotTracked', locale)}
              </Text>
              <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.accountTitle, { color: colors.text }]}>{t('nairaAccount', locale)} (NGN)</Text>
                {renderBankDetail('bank', 'UBA')}
                {renderBankDetail('accountNumber', '1027180432')}
                {renderBankDetail('accountName', 'KINGDOM OF HEAVEN THE WEALTH REALITY CHURCH')}
              </View>
            </View>
          )}

          {category === 'project' && (
            <View style={styles.transferSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('buildingProjectBankTransfer', locale)}
              </Text>
              <Text style={[styles.transferNote, { color: colors.textSecondary }]}>
                {t('bankTransferNotTracked', locale)}
              </Text>

              <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.accountTitle, { color: colors.text }]}>{t('nairaAccount', locale)} (NGN)</Text>
                {renderBankDetail('bank', 'Zenith Bank')}
                {renderBankDetail('accountNumber', '1312456017')}
                {renderBankDetail('accountName', 'WEALTH REALITY PROJECT')}
              </View>

              <Text style={[styles.foreignAccountsTitle, { color: colors.text }]}>
                {t('foreignCurrencyAccounts', locale)}
              </Text>
              {BUILDING_PROJECT_ACCOUNTS.map(account => (
                <View
                  key={account.currency}
                  style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[styles.accountTitle, { color: colors.text }]}>{account.currency}</Text>
                  {account.details.map(detail => renderBankDetail(detail.label, detail.value))}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.giveButton, { backgroundColor: theme.accent }]}
            onPress={handleGive}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.giveButtonText}>
                {t('giveViaPaystack', locale).replace('{amount}', amount.toLocaleString())}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('recentChurchGiving', locale)}</Text>
          {churchHistory.map(item => {
            const option = GIVING_OPTIONS.find(value => value.category === item.category);
            return (
              <View
                key={item.id}
                style={[styles.history, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View>
                  <Text style={[styles.historyCategory, { color: colors.text }]}>
                    {option ? t(option.label, locale) : item.category}
                  </Text>
                  <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                    {format(new Date(item.created_at), 'MMM d, yyyy')}
                  </Text>
                </View>
                <Text style={[styles.historyAmount, { color: theme.accentDeep }]}>
                  ₦{Number(item.amount).toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  hero: { padding: 36, backgroundColor: BaseColors.brown900, alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  heroAmount: { color: '#fff', fontSize: 38, fontFamily: Typography.serif, marginTop: 8 },
  body: { padding: Spacing.xl },
  description: { fontSize: 14, lineHeight: 21 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 24, marginBottom: 14 },
  options: { gap: 10 },
  option: {
    minHeight: 58,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  optionLabel: { flex: 1, fontWeight: '600', fontSize: 15 },
  amounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amountButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  amountText: { fontWeight: 'bold' },
  selectedAmountText: { color: '#fff' },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    marginTop: 10,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  currencyPrefix: { fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  customAmountInput: { flex: 1, fontSize: 15, height: '100%' },
  transferSection: { marginTop: 10 },
  transferNote: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  foreignAccountsTitle: { fontSize: 15, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  accountCard: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, marginBottom: 12 },
  accountTitle: { fontWeight: 'bold', fontSize: 15, paddingVertical: 14 },
  bankDetail: { borderBottomWidth: StyleSheet.hairlineWidth },
  bankDetailCopy: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  bankDetailText: { flex: 1 },
  bankDetailLabel: { fontSize: 11, marginBottom: 3 },
  bankDetailValue: { fontSize: 13, lineHeight: 18 },
  copyButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  copyButtonText: { fontSize: 12, fontWeight: '600' },
  giveButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 24,
  },
  giveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  history: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 10,
  },
  historyCategory: { fontWeight: 'bold' },
  historyDate: { fontSize: 10, marginTop: 2 },
  historyAmount: { fontWeight: 'bold' },
});
