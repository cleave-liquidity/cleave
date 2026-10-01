"use client";

import { useState, useEffect } from "react";
import { YieldMarket } from "@/types/market";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";

export function useMarket(id: string) {
  const [market, setMarket] = useState<YieldMarket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    yieldAdapter
      .getMarket(id)
      .then((data) => {
        if (mounted) {
          setMarket(data);
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
  }, [id]);

  return { market, isLoading, error };
}
