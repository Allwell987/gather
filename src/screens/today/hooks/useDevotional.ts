import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { format } from 'date-fns';
import { useAuthStore } from '../../../store/authStore';
import type { Devotional } from '../../../types/database';

export function useDevotional() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: devotional, isLoading } = useQuery<Devotional | null>({
    queryKey: ['devotional', today],
    queryFn: async () => {
      const { data, error } = await supabase.from('devotionals').select('*').lte('publish_date', today).order('publish_date', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data as Devotional | null;
    },
  });

  const { data: hasReadToday } = useQuery({
    queryKey: ['devotional-read', user?.id, devotional?.id],
    queryFn: async () => {
      if (!user?.id || !devotional?.id) return false;
      const { count } = await supabase.from('devotional_reads').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('devotional_id', devotional.id);
      return (count ?? 0) > 0;
    },
    enabled: !!user?.id && !!devotional?.id,
  });

  const markAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id || !devotional?.id) return;
      await supabase.from('devotional_reads').upsert({ user_id: user.id, devotional_id: devotional.id } as never);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devotional-read'] }),
  });

  return {
    devotional,
    isLoading,
    hasReadToday,
    markAsRead: markAsRead.mutate,
    isMarking: markAsRead.isPending,
  };
}
