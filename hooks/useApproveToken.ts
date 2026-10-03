"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePublicClient, useWalletClient } from "wagmi";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import type { PositionTransactionResult } from "@/lib/adapters/types";
import type { TokenApprovalRequest } from "@/types/transaction";

export function useApproveToken() {
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  return useMutation<PositionTransactionResult, Error, TokenApprovalRequest>({
    mutationFn: (request) => yieldAdapter.approveToken(request, { publicClient, walletClient }),
    onSuccess: (_, request) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allowancePrefix(request.owner, request.chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.balancePrefix(request.owner, request.chainId) });
    },
  });
}
