import { useState, useCallback } from 'react';
import { supabase } from '../../../services/supabase';
import { useToastStore } from '../../../store/toastStore';
import { Linking } from 'react-native';
import { getFriendlyErrorMessage } from '../../../services/errorMapping';

export function useAdminVerification(canReview: boolean) {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsReviewing] = useState(false);
  const { showToast } = useToastStore();

  const fetchRequests = useCallback(async () => {
    if (!canReview) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*, profile:user_id(full_name, email)')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      showToast({ title: 'Error', message: getFriendlyErrorMessage(error), variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [canReview]);

  const reviewRequest = async (request: any, decision: 'approved' | 'rejected') => {
    setIsReviewing(true);
    try {
      if (decision === 'approved') {
        await supabase.from('profiles').update({ is_verified: true } as never).eq('id', request.user_id);
      }
      await supabase.from('verification_requests').update({ status: decision } as never).eq('id', request.id);
      setRequests(prev => prev.filter(r => r.id !== request.id));
      showToast({ title: 'Updated', message: `Request ${decision}.`, variant: 'success' });
    } catch (error) {
      showToast({ title: 'Error', message: getFriendlyErrorMessage(error), variant: 'error' });
    } finally {
      setIsReviewing(false);
    }
  };

  const openCertificate = async (request: any) => {
    try {
      const { data, error } = await supabase.storage.from(request.certificate_bucket).createSignedUrl(request.certificate_path, 300);
      if (error || !data?.signedUrl) throw error;
      await Linking.openURL(data.signedUrl);
    } catch (error) {
      showToast({ title: 'Error', message: 'Could not open file.', variant: 'error' });
    }
  };

  return {
    requests,
    isLoading,
    isProcessing,
    fetchRequests,
    reviewRequest,
    openCertificate,
  };
}
