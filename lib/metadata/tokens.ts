import type { RobinhoodChainId } from "@/types/market";
import type { TokenMetadata } from "@/types/token";

// No live token addresses are verified yet. Keep both networks explicit so a
// future integration cannot accidentally reuse a token from the other chain.
export const verifiedTokenMetadata: Readonly<Record<RobinhoodChainId, readonly TokenMetadata[]>> = {
  4663: [],
  46630: [],
};

export function getVerifiedTokenMetadata(
  chainId: RobinhoodChainId,
  symbol: string,
): TokenMetadata | undefined {
  return verifiedTokenMetadata[chainId].find(
    (token) => token.symbol.toLowerCase() === symbol.trim().toLowerCase(),
  );
}
