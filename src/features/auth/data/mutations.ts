import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';

export function useStartEmailSignIn() {
  return useMutation({
    mutationFn: async ({ email, isGuestUpgrade }: { email: string; isGuestUpgrade: boolean }) => {
      const normalized = email.trim().toLowerCase();
      if (isGuestUpgrade) {
        // Preserves anonymous user's id (and inventory). Triggers a confirm-email
        // OTP send to the new address. Manual linking must be ON in dashboard.
        const { error } = await supabase.auth.updateUser({ email: normalized });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: normalized,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
      }
      return { email: normalized, isGuestUpgrade };
    },
  });
}

export function useVerifyEmailOtp() {
  return useMutation({
    mutationFn: async ({
      email,
      token,
      isGuestUpgrade,
    }: {
      email: string;
      token: string;
      isGuestUpgrade: boolean;
    }) => {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: isGuestUpgrade ? 'email_change' : 'email',
      });
      if (error) throw error;
      return data;
    },
  });
}
