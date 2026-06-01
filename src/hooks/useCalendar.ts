import { useState, useMemo } from 'react';
import {
  addDays,
  addMonths,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

export const useCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    return Array.from({ length: 42 }).map((_, i) => addDays(start, i));
  }, [currentMonth]);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return {
    currentMonth,
    setCurrentMonth,
    selectedDate,
    setSelectedDate,
    days,
    prevMonth,
    nextMonth,
  };
};
