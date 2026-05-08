import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import type { Campaign, Giving } from '../../../types/database';

export function useGiving() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  const { data: history = [] } = useQuery({
    queryKey: ['giving-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from('giving').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data } = await supabase.from('campaigns').select('*').eq('is_active', true);
      return data || [];
    },
  });

  const totalGiving = useMemo(() => history.reduce((sum, r) => sum + Number(r.amount || 0), 0), [history]);

  const saveDonation = useMutation({
    mutationFn: async (donation: any) => {
      if (!user?.id) return;
      await supabase.from('giving').insert({
        user_id: user.id,
        amount: donation.amount,
        currency: 'NGN',
        category: donation.category.toLowerCase().replace(/\s+/g, '_'),
        payment_reference: donation.reference,
        status: 'success',
      } as never);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['giving-history'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  return {
    history,
    campaigns,
    totalGiving,
    saveDonation: saveDonation.mutate,
    isSaving: saveDonation.isPending,
  };
}
