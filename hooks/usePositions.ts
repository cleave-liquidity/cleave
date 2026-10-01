"use client";

import { useState, useEffect, useCallback } from "react";
import { YieldPosition } from "@/types/position";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";

export function usePositions(userAddress?: string) {
  const [positions, setPositions] = useState<YieldPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPositions = useCallback(() => {
    setIsLoading(true);
    yieldAdapter
      .getPositions(userAddress)
      .then((data) => {
        setPositions([...data]);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, [userAddress]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return { positions, isLoading, error, refresh: fetchPositions };
}
