import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, isSameMonth, startOfDay } from 'date-fns';
import { BaseColors, Typography, Radius, Spacing } from '../../../constants/theme';
import type { ChurchEvent } from '../types';

interface EventCalendarProps {
  currentMonth: Date;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  days: Date[];
  prevMonth: () => void;
  nextMonth: () => void;
  events: ChurchEvent[];
  theme: any;
  colors: any;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const EventCalendar: React.FC<EventCalendarProps> = ({
  currentMonth,
  selectedDate,
  setSelectedDate,
  days,
  prevMonth,
  nextMonth,
  events,
  theme,
  colors,
}) => {
  return (
    <View style={[styles.calendarSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.calHeader}>
        <Text style={[styles.calMonth, { color: colors.text }]}>{format(currentMonth, 'MMMM yyyy')}</Text>
        <View style={styles.calNavBtns}>
          <TouchableOpacity
            style={[styles.calNavBtn, { borderColor: colors.border }]}
            onPress={prevMonth}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.calNavBtn, { borderColor: colors.border }]}
            onPress={nextMonth}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.weekdays}>
        {DAYS_OF_WEEK.map((day) => (
          <Text key={day} style={[styles.weekday, { color: colors.textMuted }]}>{day}</Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          const belongsToMonth = isSameMonth(day, currentMonth);
          const hasEvents = events.some((event) => isSameDay(new Date(event.start_time), day));

          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[
                styles.dayCell,
                !belongsToMonth && styles.dayCellMuted,
                isToday && !isSelected && { backgroundColor: theme.accentLight },
                isSelected && { backgroundColor: theme.accent },
              ]}
              onPress={() => setSelectedDate(startOfDay(day))}
            >
              <Text
                style={[
                  styles.dayNum,
                  !belongsToMonth && [styles.dayNumMuted, { color: colors.textMuted }],
                  isToday && !isSelected && {
                    color: theme.accentDeep,
                    fontFamily: Typography.sansSemiBold,
                  },
                  isSelected && {
                    color: BaseColors.white,
                    fontFamily: Typography.sansSemiBold,
                  },
                  !isSelected && !isToday && { color: colors.text }
                ]}
              >
                {format(day, 'd')}
              </Text>
              {hasEvents ? (
                <View
                  style={[
                    styles.dayDot,
                    { backgroundColor: isSelected ? BaseColors.white : theme.accent },
                  ]}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calendarSection: {
    margin: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  calMonth: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl },
  calNavBtns: { flexDirection: 'row', gap: Spacing.sm },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdays: { flexDirection: 'row', marginBottom: Spacing.sm },
  weekday: { flex: 1, textAlign: 'center', fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.sm },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    minHeight: 46,
  },
  dayCellMuted: { opacity: 0.45 },
  dayNum: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm },
  dayNumMuted: { },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },
});
