"use client";

import { useState, useEffect } from "react";
import { FixedYieldQuote } from "@/types/quote";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";

export function useFixedYieldQuote(marketId: string, inputAmount: number) {
  const [quote, setQuote] = useState<FixedYieldQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!inputAmount || inputAmount <= 0) {
      setQuote(null);
      return;
    }
    let mounted = true;
    setIsLoading(true);
    yieldAdapter
      .getFixedQuote(marketId, inputAmount)
      .then((res) => {
        if (mounted) {
          setQuote(res);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [marketId, inputAmount]);

  return { quote, isLoading };
}
