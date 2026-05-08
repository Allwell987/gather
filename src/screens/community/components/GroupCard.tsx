import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseColors, Spacing, Radius } from '../../../constants/theme';

interface GroupCardProps {
  group: any;
  isMember: boolean;
  isPending: boolean;
  onPress: () => void;
  onJoin: () => void;
  onRequest: () => void;
  isJoining: boolean;
  isRequesting: boolean;
  colors: any;
  theme: any;
}

export const GroupCard = ({
  group, isMember, isPending, onPress, onJoin, onRequest,
  isJoining, isRequesting, colors, theme
}: GroupCardProps) => (
  <TouchableOpacity
    style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
    onPress={isMember ? onPress : undefined}
    activeOpacity={isMember ? 0.75 : 1}
  >
    {group.display_picture_url ? (
      <Image source={{ uri: group.display_picture_url }} style={styles.image} />
    ) : (
      <View style={[styles.icon, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>{group.emoji || '👥'}</Text>
      </View>
    )}

    <View style={styles.info}>
      <View style={styles.titleRow}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
        <Ionicons name={group.is_private ? 'lock-closed' : 'globe'} size={12} color={colors.textSecondary} />
      </View>
      <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
        {group.description || 'No about yet.'}
      </Text>
    </View>

    {isMember ? (
      <View style={[styles.badge, { backgroundColor: theme.accentSubtle }]}><Text style={{ color: theme.accentDeep, fontSize: 10 }}>Joined</Text></View>
    ) : isPending ? (
      <View style={[styles.badge, { backgroundColor: BaseColors.warm100 }]}><Text style={{ color: BaseColors.brown700, fontSize: 10 }}>Pending</Text></View>
    ) : group.is_private ? (
      <TouchableOpacity style={[styles.btn, { borderColor: theme.accent }]} onPress={onRequest}>
        {isRequesting ? <ActivityIndicator size="small" color={theme.accent} /> : <Text style={{ color: theme.accent, fontSize: 12 }}>Request</Text>}
      </TouchableOpacity>
    ) : (
      <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={onJoin}>
        {isJoining ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 12 }}>Join</Text>}
      </TouchableOpacity>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.xl, borderWidth: 1, gap: Spacing.md, marginBottom: 12 },
  image: { width: 50, height: 50, borderRadius: 12 },
  icon: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
  info: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: 'bold' },
  desc: { fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, minWidth: 70, alignItems: 'center' },
});
