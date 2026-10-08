"use client";

import { useQuery } from "@tanstack/react-query";
import type { DividendSourceSnapshot } from "@/lib/dividend/dividend-config";

const EMPTY_SNAPSHOT: DividendSourceSnapshot = {
  assets: [],
  events: [],
  assetsVerified: false,
  eventsVerified: false,
};

export function useDividendSourceSnapshot() {
  const query = useQuery({
    queryKey: ["dividend-source-snapshot", 4663],
    queryFn: async (): Promise<DividendSourceSnapshot> => {
      const response = await fetch("/api/dividend/events", {
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error("Dividend source verification unavailable.");
      const payload = await response.json() as DividendSourceSnapshot;
      return {
        assets: Array.isArray(payload.assets) ? payload.assets : [],
        events: Array.isArray(payload.events) ? payload.events : [],
        assetsVerified: payload.assetsVerified === true,
        eventsVerified: payload.eventsVerified === true,
      };
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });

  return {
    snapshot: query.data ?? EMPTY_SNAPSHOT,
    isLoading: query.isLoading,
    unavailable: Boolean(query.error),
  };
}
