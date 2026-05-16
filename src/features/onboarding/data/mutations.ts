import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { sessionKeys } from '@/features/session/data/queries';

const E164_PATTERN = /^\+\d{8,15}$/;

export function useSetUniversity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, universityId }: { userId: string; universityId: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ university: universityId })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: sessionKeys.profile(vars.userId) });
    },
  });
}

export function useSetWhatsapp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, phone }: { userId: string; phone: string }) => {
      const cleaned = phone.replace(/\s/g, '');
      if (!E164_PATTERN.test(cleaned)) {
        throw new Error('Formato inválido. Usá formato internacional, ej. +593987654321');
      }
      const { error } = await supabase
        .from('profile_contacts')
        .upsert(
          { user_id: userId, whatsapp_phone: cleaned },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: sessionKeys.contact(vars.userId) });
    },
  });
}

export function useSetScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, scope }: { userId: string; scope: string[] }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ scope })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: sessionKeys.profile(vars.userId) });
    },
  });
}

export function useSetDisplayName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, displayName }: { userId: string; displayName: string }) => {
      const trimmed = displayName.trim();
      if (trimmed.length < 2) throw new Error('Mínimo 2 caracteres');
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: sessionKeys.profile(vars.userId) });
    },
  });
}
