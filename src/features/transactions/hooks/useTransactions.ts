import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  acceptTransaction,
  cancelTransaction,
  completeTransaction,
  createTradeProposal,
  fetchMyTransactions,
  fetchTransaction,
} from '../data/transactions';

const KEY = {
  list: ['transactions', 'mine'] as const,
  detail: (id: string) => ['transactions', 'detail', id] as const,
};

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: KEY.detail(id ?? 'none'),
    enabled: Boolean(id),
    queryFn: () => fetchTransaction(id as string),
    staleTime: 1000 * 15,
  });
}

export function useMyTransactions() {
  return useQuery({
    queryKey: KEY.list,
    queryFn: fetchMyTransactions,
    staleTime: 1000 * 30,
  });
}

export function useCreateTradeProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTradeProposal,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useAcceptTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acceptTransaction,
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: KEY.detail(id) });
      void qc.invalidateQueries({ queryKey: KEY.list });
    },
  });
}

export function useCompleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: completeTransaction,
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: KEY.detail(id) });
      void qc.invalidateQueries({ queryKey: KEY.list });
      // El servidor decrementa inventario al completar — refrescar álbum.
      void qc.invalidateQueries({ queryKey: ['album'] });
    },
  });
}

export function useCancelTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; reason?: string }) => cancelTransaction(args.id, args.reason),
    onSuccess: (_, args) => {
      void qc.invalidateQueries({ queryKey: KEY.detail(args.id) });
      void qc.invalidateQueries({ queryKey: KEY.list });
    },
  });
}

export const transactionsQueryKeys = KEY;
