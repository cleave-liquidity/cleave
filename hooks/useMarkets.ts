"use client";

import { useState, useEffect } from "react";
import { YieldMarket } from "@/types/market";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";

export function useMarkets() {
  const [markets, setMarkets] = useState<YieldMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    yieldAdapter
      .getMarkets()
      .then((data) => {
        if (mounted) {
          setMarkets(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { markets, isLoading, error };
}
