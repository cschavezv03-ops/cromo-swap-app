import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createPurchaseRequest } from '../data/purchase';

export function useCreatePurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => createPurchaseRequest(listingId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['marketplace'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
