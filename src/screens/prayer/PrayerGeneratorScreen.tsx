// src/screens/prayer/PrayerGeneratorScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Share, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import HeaderBar from '../../components/common/HeaderBar';
import { useThemeStore } from '../../store/themeStore';
import { useToastStore } from '../../store/toastStore';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '',
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

export default function PrayerGeneratorScreen() {
  const navigation = useNavigation();
  const { theme, colors } = useThemeStore();
  const { showToast } = useToastStore();
  const [input, setInput] = useState('');
  const [generatedPrayer, setGeneratedPrayer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generatePrayer = async () => {
    if (!input.trim()) {
      showToast({ title: 'Input required', message: 'Please share what you are feeling.', variant: 'warning' });
      return;
    }

    if (!process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
      showToast({ title: 'Missing API Key', message: 'OpenAI API key is not configured.', variant: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a compassionate Christian prayer assistant. Your goal is to write a warm, biblically-grounded, and personalized prayer based on the user\'s current feelings or situation. Keep it concise, encouraging, and end with "In Jesus\' name, Amen."'
          },
          {
            role: 'user',
            content: `Write a prayer for someone who says: "${input}"`
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || 'Could not generate prayer. Please try again.';
      setGeneratedPrayer(response);
    } catch (error) {
      console.error('Error generating prayer:', error);
      showToast({ title: 'Error', message: 'Failed to generate prayer.', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    Share.share({ message: generatedPrayer });
  };

  const handleCopy = () => {
    // Clipboard handled by expo-clipboard if needed, for now just share
    handleShare();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title="AI Prayer Assistant"
        subtitle="Personalized spiritual support"
        onBackPress={() => navigation.goBack()}
        enableBlur
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={100}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>How are you feeling today?</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={input}
              onChangeText={setInput}
              placeholder="e.g., I'm feeling anxious about my exams..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[styles.generateBtn, { backgroundColor: theme.accent }]}
              onPress={generatePrayer}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={styles.generateBtnText}>Generate Prayer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {generatedPrayer ? (
            <View style={[styles.prayerCard, { backgroundColor: colors.card, borderColor: theme.accentBorder }]}>
              <Text style={[styles.prayerTitle, { color: theme.accent }]}>A Prayer For You</Text>
              <Text style={[styles.prayerText, { color: colors.text }]}>{generatedPrayer}</Text>
              <View style={styles.prayerActions}>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.accent }]} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={18} color={theme.accent} />
                  <Text style={{ color: theme.accent }}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.accent }]} onPress={() => setInput('')}>
                  <Ionicons name="refresh-outline" size={18} color={theme.accent} />
                  <Text style={{ color: theme.accent }}>New</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : !isLoading && (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Share your heart above, and I'll help you find the words to talk to God.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.xl },
  card: { padding: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1 },
  label: { fontSize: 14, fontFamily: Typography.sansSemiBold, marginBottom: 12 },
  input: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    fontSize: 16,
    fontFamily: Typography.sans,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.full,
    marginTop: Spacing.xl,
  },
  generateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  prayerCard: { padding: Spacing.xl, borderRadius: Radius.xl, borderWidth: 2 },
  prayerTitle: { fontSize: 18, fontFamily: Typography.serif, marginBottom: 12 },
  prayerText: { fontSize: 16, lineHeight: 26, fontStyle: 'italic' },
  prayerActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  emptyState: { alignItems: 'center', marginTop: 40, paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', marginTop: 16, fontSize: 14, opacity: 0.7 },
});
