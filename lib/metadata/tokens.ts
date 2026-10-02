import type { RobinhoodChainId } from "@/types/market";
import type { TokenMetadata } from "@/types/token";

export const verifiedTokenMetadata: Readonly<Record<RobinhoodChainId, readonly TokenMetadata[]>> = {
  4663: [
    {
      address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
      symbol: "USDG",
      name: "Global Dollar",
      decimals: 6,
      chainId: 4663,
    },
    {
      address: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
      chainId: 4663,
    },
  ],
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
